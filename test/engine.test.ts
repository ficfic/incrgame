import { describe, expect, it } from 'vitest';
import { apply, claimCost, generatorCost, initialState, ratePerSecond, tick } from '../src/core/engine';
import { ANCHOR_CAP, FRONTIER_CAP } from '../src/core/graph';
import { D, format, formatWhole } from '../src/core/numbers';
import { nextRand } from '../src/core/rng';
import type { GameState } from '../src/core/types';

const surveyAndClaim = (s: GameState): GameState => {
  s = apply(s, { type: 'survey' });
  const id = s.forged.frontier[s.forged.frontier.length - 1]!;
  return apply(s, { type: 'claimNode', id });
};

describe('survey', () => {
  it('reveals frontier entities up to the cap, then idles', () => {
    let s = initialState();
    for (let i = 0; i < FRONTIER_CAP + 3; i++) s = apply(s, { type: 'survey' });
    expect(s.forged.frontier.length).toBe(FRONTIER_CAP);
    expect(s.forged.nextId).toBe(1 + FRONTIER_CAP); // ids minted only for real reveals
  });

  it('is free and touches nothing else', () => {
    const s = initialState();
    const after = apply(s, { type: 'survey' });
    expect(after.resources).toEqual(s.resources);
    expect(after.graph).toEqual(s.graph);
  });
});

describe('claimNode', () => {
  it('wires a frontier entity in: pays Datums, mints a Triple, links it', () => {
    let s = initialState(); // starts with 15 Datums
    s = surveyAndClaim(s);
    expect(s.resources.data).toBe('10'); // 15 - 5
    expect(s.resources.triples).toBe('1');
    expect(s.forged.anchors).toEqual([0, 1]);
    expect(s.forged.links).toEqual([[0, 1]]);
    expect(s.forged.frontier).toEqual([]);
    expect(s.graph).toEqual({ nodes: 2, edges: 1 });
  });

  it('rejects ids not on the frontier and unaffordable claims', () => {
    let s = initialState();
    expect(apply(s, { type: 'claimNode', id: 99 })).toBe(s);
    s = surveyAndClaim(s); // data 10
    s = surveyAndClaim(s); // cost 6 → data 4
    const stuck = apply(apply(s, { type: 'survey' }), { type: 'claimNode', id: s.forged.nextId });
    expect(stuck.resources.triples).toBe('2'); // third claim (cost 6 > 4) rejected
  });

  it('cost climbs the gentle 1.08 lane: ceil(5 × 1.08^handClaimed)', () => {
    let s = initialState();
    expect(claimCost(s)).toBe('5');
    s = surveyAndClaim(s);
    expect(claimCost(s)).toBe('6'); // ceil(5.4)
    s = { ...s, handClaimed: 10 };
    expect(claimCost(s)).toBe('11'); // ceil(10.79)
  });

  it('is priced by HAND claims only — machines cannot inflate the manual lane', () => {
    // Keyed to the global statement count, two minutes of Extractor output
    // priced the next hand claim in the millions, and one prestige put it past
    // 10^400. The one action that mints trust from nothing was being deleted
    // by the machines it exists to balance.
    const s = initialState();
    const withMachineOutput = { ...s, resources: { ...s.resources, triples: '500000' } };
    expect(claimCost(withMachineOutput)).toBe(claimCost(s));
  });

  it('is deterministic (no RNG consumed)', () => {
    const s = apply(initialState(42), { type: 'survey' });
    const a = apply(s, { type: 'claimNode', id: 1 });
    const b = apply(s, { type: 'claimNode', id: 1 });
    expect(a).toEqual(b);
    expect(a.rngState).toBe(s.rngState);
  });

  it('folds the oldest anchors into aggregate mass beyond the cap', () => {
    let s = { ...initialState(), resources: { ...initialState().resources, data: '1e12' } };
    for (let i = 0; i < ANCHOR_CAP + 10; i++) s = surveyAndClaim(s);
    expect(s.forged.anchors.length).toBe(ANCHOR_CAP);
    expect(D(s.forged.foldedNodes).toNumber()).toBe(11); // 1 + 250 owned, 240 addressable
    expect(s.graph.nodes).toBe(ANCHOR_CAP + 11); // nothing lost, only folded
    expect(s.graph.edges).toBe(ANCHOR_CAP + 10); // = triples balance
  });
});

describe('the drip (edges ARE the income)', () => {
  it('each statement yields 0.15 Datums/s', () => {
    let s = initialState();
    expect(ratePerSecond(s, 'data')).toBe('0'); // no edges, no drip
    s = surveyAndClaim(s);
    s = surveyAndClaim(s);
    expect(D(ratePerSecond(s, 'data')).toNumber()).toBeCloseTo(0.3, 12);
    s = { ...s, generators: { ...s.generators, harvester: 3 } };
    // 0.3 drip + 3 Harvesters at 0.35 each
    expect(D(ratePerSecond(s, 'data')).toNumber()).toBeCloseTo(0.3 + 1.05, 12);
  });

  it('tick accrues the drip; graph counters stay balance-derived', () => {
    let s = surveyAndClaim(initialState()); // 1 edge → 0.15/s
    for (let i = 0; i < 100; i++) s = tick(s, 0.1); // 10s
    expect(D(s.resources.data).toNumber()).toBeCloseTo(10 + 1.5, 9);
    expect(s.graph).toEqual({ nodes: 2, edges: 1 });
  });

  it('is deterministic: 100 × 0.1s == one 10s step', () => {
    const base = surveyAndClaim(initialState());
    let fixed = base;
    for (let i = 0; i < 100; i++) fixed = tick(fixed, 0.1);
    const big = tick(base, 10);
    expect(D(fixed.resources.data).toNumber()).toBeCloseTo(D(big.resources.data).toNumber(), 9);
  });
});

describe('buyGenerator', () => {
  it('spends Datums without touching the web (knowledge is not fuel)', () => {
    let s = surveyAndClaim(initialState());
    s = { ...s, resources: { ...s.resources, data: '20' } };
    const graphBefore = s.graph;
    s = apply(s, { type: 'buyGenerator', id: 'harvester' });
    expect(s.generators.harvester).toBe(1);
    expect(s.resources.data).toBe('5');
    expect(s.graph).toEqual(graphBefore);
  });

  it('rejects when unaffordable and follows ceil(15 × 1.15^n)', () => {
    let s = { ...initialState(), resources: { ...initialState().resources, data: '0' } };
    expect(apply(s, { type: 'buyGenerator', id: 'harvester' })).toBe(s);
    expect(generatorCost(s, 'harvester')).toBe('15');
    s = { ...s, generators: { ...s.generators, harvester: 1 } };
    expect(generatorCost(s, 'harvester')).toBe('18'); // ceil(17.25)
  });
});

describe('tick hygiene', () => {
  it('rejects nonsense dt and honors action.now', () => {
    const s = initialState();
    expect(apply(s, { type: 'tick', dt: 0 })).toBe(s);
    expect(apply(s, { type: 'tick', dt: NaN })).toBe(s);
    expect(apply(s, { type: 'tick', dt: 0.1, now: 123456 }).lastTick).toBe(123456);
  });

  it('does not mutate the previous state (purity)', () => {
    const s0 = initialState();
    const frozen = JSON.stringify(s0);
    apply(s0, { type: 'survey' });
    apply(s0, { type: 'tick', dt: 0.1 });
    expect(JSON.stringify(s0)).toBe(frozen);
  });
});

describe('rng', () => {
  it('is pure and deterministic (ready for M3)', () => {
    const [v1, s1] = nextRand(42);
    const [v2, s2] = nextRand(42);
    expect(v1).toBe(v2);
    expect(s1).toBe(s2);
    const [v3] = nextRand(s1);
    expect(v3).not.toBe(v1);
  });
});

describe('format', () => {
  it('formats plain, suffixed, huge, and floored numbers', () => {
    expect(format('999')).toBe('999');
    expect(format('1500')).toBe('1.50K');
    expect(format(D(10).pow(40).toString())).toMatch(/e/i);
    expect(formatWhole('3.72')).toBe('3');
    expect(formatWhole('1500.5')).toBe('1.50K');
  });
});
