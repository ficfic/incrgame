import { describe, expect, it } from 'vitest';
import { apply, generatorCost, initialState, ratePerSecond, tick } from '../src/core/engine';
import { projectGraph } from '../src/core/graph';
import { D, format, formatWhole } from '../src/core/numbers';
import { nextRand } from '../src/core/rng';

describe('graph projection (one substance: edges = triples, entities emerge)', () => {
  it('opening band: every triple names a new entity (the magic)', () => {
    expect(projectGraph('0')).toEqual({ nodes: 1, edges: 0 });
    expect(projectGraph('1')).toEqual({ nodes: 2, edges: 1 });
    expect(projectGraph('8')).toEqual({ nodes: 9, edges: 8 });
  });

  it('emergence decays: edges pull ahead as the world densifies', () => {
    expect(projectGraph('30')).toEqual({ nodes: 20, edges: 30 });   // 9 + 22/2
    expect(projectGraph('100')).toEqual({ nodes: 43, edges: 100 }); // 20 + 70/3
    expect(projectGraph('104')).toEqual({ nodes: 44, edges: 104 }); // then every 4th
    const big = projectGraph('1e30');
    expect(big.edges).toBeLessThanOrEqual(9e15); // counters stay number-safe
    expect(big.nodes).toBeLessThan(big.edges);
  });

  it('is monotone and exact — spending shrinks it deterministically', () => {
    const before = projectGraph('20');
    const after = projectGraph('5'); // bought a 15-triple machine
    expect(after.nodes).toBeLessThan(before.nodes);
    expect(after.edges).toBe(5);
  });
});

describe('manualConnect', () => {
  it('asserts a triple and the graph follows the projection', () => {
    let s = initialState();
    s = apply(s, { type: 'manualConnect' });
    expect(s.resources.triples).toBe('1');
    expect(s.graph).toEqual({ nodes: 2, edges: 1 });
    s = apply(s, { type: 'manualConnect' });
    expect(s.resources.triples).toBe('2');
    expect(s.graph).toEqual({ nodes: 3, edges: 2 });
  });

  it('does not mutate the previous state (purity)', () => {
    const s0 = initialState();
    const frozen = JSON.stringify(s0);
    apply(s0, { type: 'manualConnect' });
    apply(s0, { type: 'tick', dt: 0.1 });
    expect(JSON.stringify(s0)).toBe(frozen);
  });

  it('draws no RNG (deterministic without a seed until M3)', () => {
    const s = initialState(42);
    expect(apply(s, { type: 'manualConnect' }).rngState).toBe(s.rngState);
  });
});

describe('buyGenerator', () => {
  it('rejects when unaffordable', () => {
    const s = initialState();
    expect(apply(s, { type: 'buyGenerator', id: 'harvester' })).toBe(s);
  });

  it('deducts triples and the web visibly trims', () => {
    let s = initialState();
    for (let i = 0; i < 20; i++) s = apply(s, { type: 'manualConnect' });
    const nodesBefore = s.graph.nodes;
    s = apply(s, { type: 'buyGenerator', id: 'harvester' });
    expect(s.generators.harvester).toBe(1);
    expect(s.resources.triples).toBe('5'); // 20 - 15
    expect(s.graph).toEqual(projectGraph('5'));
    expect(s.graph.nodes).toBeLessThan(nodesBefore); // fuel and structure are one
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
  it('accrues rate × dt and the graph tracks production', () => {
    let s = initialState();
    s = { ...s, generators: { ...s.generators, harvester: 3 } }; // 0.3 triples/s
    s = tick(s, 0.1);
    expect(D(s.resources.triples).toNumber()).toBeCloseTo(0.03, 12);
    for (let i = 0; i < 99; i++) s = tick(s, 0.1);
    expect(D(s.resources.triples).toNumber()).toBeCloseTo(3, 9);
    expect(s.graph).toEqual(projectGraph(s.resources.triples));
  });

  it('is deterministic: 100 × 0.1s == one 10s step, graph included', () => {
    const base = {
      ...initialState(),
      generators: { ...initialState().generators, harvester: 2 },
    };
    let fixed = base;
    for (let i = 0; i < 100; i++) fixed = tick(fixed, 0.1);
    const big = tick(base, 10);
    expect(D(fixed.resources.triples).toNumber()).toBeCloseTo(D(big.resources.triples).toNumber(), 9);
    expect(fixed.graph).toEqual(big.graph);
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
    expect(D(ratePerSecond(s, 'triples')).toNumber()).toBeCloseTo(1.0 + 2.0, 12);
    expect(ratePerSecond(s, 'capital')).toBe('0');
  });
});

describe('rng', () => {
  it('is pure and deterministic (ready for M3)', () => {
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
