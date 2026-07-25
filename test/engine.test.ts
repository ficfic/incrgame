import { describe, expect, it } from 'vitest';
import { apply, generatorCost, initialState, ratePerSecond, tick } from '../src/core/engine';
import { D, format } from '../src/core/numbers';
import { nextRand } from '../src/core/rng';

describe('manualConnect', () => {
  it('adds 1 data and grows the graph', () => {
    let s = initialState();
    s = apply(s, { type: 'manualConnect' });
    expect(s.resources.data).toBe('1');
    expect(s.graph.nodes).toBe(2);
    expect(s.graph.edges).toBe(1);
    s = apply(s, { type: 'manualConnect' });
    expect(s.resources.data).toBe('2');
    expect(s.graph.nodes).toBe(3);
    expect(s.graph.edges).toBe(2);
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

  it('follows the 15 × 1.15^n cost curve', () => {
    let s = initialState();
    expect(generatorCost(s, 'harvester')).toBe('15');
    s = { ...s, generators: { ...s.generators, harvester: 1 } };
    expect(D(generatorCost(s, 'harvester')).toNumber()).toBeCloseTo(15 * 1.15, 10);
    s = { ...s, generators: { ...s.generators, harvester: 10 } };
    expect(D(generatorCost(s, 'harvester')).toNumber()).toBeCloseTo(15 * 1.15 ** 10, 8);
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
});
