import { describe, expect, it } from 'vitest';
import { apply, generatorCost, initialState, ratePerSecond, tick } from '../src/core/engine';
import { D, format, formatWhole } from '../src/core/numbers';
import { nextRand } from '../src/core/rng';

describe('manualConnect', () => {
  it('adds 1 data and grows the graph', () => {
    let s = initialState();
    s = apply(s, { type: 'manualConnect' });
    expect(s.resources.data).toBe('1');
    expect(s.graph.nodes).toBe(2);
    expect(s.graph.edges).toBe(1); // too small for cross-links yet
    s = apply(s, { type: 'manualConnect' });
    expect(s.resources.data).toBe('2');
    expect(s.graph.nodes).toBe(3);
    expect(s.graph.edges).toBe(2);
  });

  it('threads the RNG seed and is deterministic', () => {
    const s = initialState(42);
    const a = apply(s, { type: 'manualConnect' });
    const b = apply(s, { type: 'manualConnect' });
    expect(a).toEqual(b); // same seed → same outcome
    expect(a.rngState).not.toBe(s.rngState); // the sequence moved
  });

  it('cross-links tangle the graph: edges outgrow the spanning tree', () => {
    let s = initialState(7);
    for (let i = 0; i < 120; i++) s = apply(s, { type: 'manualConnect' });
    expect(s.graph.nodes).toBe(121);
    expect(s.graph.edges).toBeGreaterThan(s.graph.nodes - 1); // not a plain chain
  });

  it('does not mutate the previous state (purity)', () => {
    const s0 = initialState();
    const frozen = JSON.stringify(s0);
    apply(s0, { type: 'manualConnect' });
    apply(s0, { type: 'tick', dt: 0.1 });
    expect(JSON.stringify(s0)).toBe(frozen);
  });
});

describe('buyGenerator', () => {
  it('rejects when unaffordable', () => {
    const s = initialState();
    expect(apply(s, { type: 'buyGenerator', id: 'harvester' })).toBe(s);
  });

  it('deducts cost and increments count', () => {
    let s = initialState();
    s = { ...s, resources: { ...s.resources, data: '15' } };
    s = apply(s, { type: 'buyGenerator', id: 'harvester' });
    expect(s.generators.harvester).toBe(1);
    expect(s.resources.data).toBe('0');
  });

  it('follows ceil(15 × 1.15^n) — whole-unit prices', () => {
    let s = initialState();
    expect(generatorCost(s, 'harvester')).toBe('15');
    s = { ...s, generators: { ...s.generators, harvester: 1 } };
    expect(generatorCost(s, 'harvester')).toBe('18'); // ceil(17.25)
    s = { ...s, generators: { ...s.generators, harvester: 10 } };
    expect(generatorCost(s, 'harvester')).toBe('61'); // ceil(60.68…)
  });
});

describe('tick', () => {
  it('accrues rate × dt (units agree: rate/sec, dt in seconds)', () => {
    let s = initialState();
    s = { ...s, generators: { ...s.generators, harvester: 3 } }; // 0.3 data/s
    s = tick(s, 0.1);
    expect(D(s.resources.data).toNumber()).toBeCloseTo(0.03, 12);
  });

  it('is deterministic: 100 × 0.1s == one 10s step for linear production', () => {
    const base = {
      ...initialState(),
      generators: { ...initialState().generators, harvester: 2 },
    };
    let fixed = base;
    for (let i = 0; i < 100; i++) fixed = tick(fixed, 0.1);
    const big = tick(base, 10);
    expect(D(fixed.resources.data).toNumber()).toBeCloseTo(D(big.resources.data).toNumber(), 9);
  });

  it('advances lastTick from action.now when provided', () => {
    const s = apply(initialState(), { type: 'tick', dt: 0.1, now: 123456 });
    expect(s.lastTick).toBe(123456);
  });

  it('rejects nonsense dt', () => {
    const s = initialState();
    expect(apply(s, { type: 'tick', dt: 0 })).toBe(s);
    expect(apply(s, { type: 'tick', dt: -5 })).toBe(s);
    expect(apply(s, { type: 'tick', dt: NaN })).toBe(s);
  });

  it('grows the graph ambiently while producing (deterministic)', () => {
    let s = initialState(99);
    s = { ...s, generators: { ...s.generators, harvester: 1 } };
    for (let i = 0; i < 2000; i++) s = tick(s, 0.1);
    expect(s.graph.nodes).toBeGreaterThan(1); // structure forms on its own
    // 0.3% per tick ⇒ ~6 expected over 2000 ticks; assert a sane band, not luck
    expect(s.graph.nodes).toBeLessThan(40);
  });

  it('does not touch graph or RNG when nothing produces', () => {
    const s = initialState(5);
    const after = apply(s, { type: 'tick', dt: 0.1, now: 1000 });
    expect(after.graph).toEqual(s.graph);
    expect(after.rngState).toBe(s.rngState);
  });
});

describe('rates', () => {
  it('sums per-resource, not a single K', () => {
    let s = initialState();
    s = { ...s, generators: { ...s.generators, harvester: 10, extractor: 2 } };
    expect(D(ratePerSecond(s, 'data')).toNumber()).toBeCloseTo(1.0, 12);
    expect(D(ratePerSecond(s, 'triples')).toNumber()).toBeCloseTo(2.0, 12);
    expect(ratePerSecond(s, 'capital')).toBe('0');
  });
});

describe('rng', () => {
  it('is pure and deterministic', () => {
    const [v1, s1] = nextRand(42);
    const [v2, s2] = nextRand(42);
    expect(v1).toBe(v2);
    expect(s1).toBe(s2);
    expect(v1).toBeGreaterThanOrEqual(0);
    expect(v1).toBeLessThan(1);
    const [v3] = nextRand(s1);
    expect(v3).not.toBe(v1); // the sequence moves
  });
});

describe('format', () => {
  it('formats plain, suffixed, and huge numbers', () => {
    expect(format('0')).toBe('0');
    expect(format('999')).toBe('999');
    expect(format('1500')).toBe('1.50K');
    expect(format('2340000')).toBe('2.34M');
    expect(format(D(10).pow(40).toString())).toMatch(/e/i);
  });

  it('formatWhole floors the headline counter (genre law: integer stocks)', () => {
    expect(formatWhole('3.72')).toBe('3');
    expect(formatWhole('0.99')).toBe('0');
    expect(formatWhole('1500.5')).toBe('1.50K');
  });
});
