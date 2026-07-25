import { describe, expect, it } from 'vitest';
import { apply, claimCost, generatorCost, initialState, ratePerSecond, surveyCost, CLAIM_ATTENTION, tick } from '../src/core/engine';
import { ANCHOR_CAP, FRONTIER_CAP } from '../src/core/graph';
import { D, format, formatWhole } from '../src/core/numbers';
import { nextRand } from '../src/core/rng';
import type { GameState } from '../src/core/types';

/** Both hand verbs now cost something — Datums to survey, attention to
 *  connect — so a test that wants a claim has to fund both. */
const rich = (s: GameState): GameState => ({ ...s, attention: 12 });

/** Structural helper: tops up both costs first, because these tests are about
 *  the SHAPE of the graph, not about whether you could afford it. */
const surveyAndClaim = (s: GameState): GameState => {
  s = apply(rich(s), { type: 'survey' });
  const id = s.forged.frontier[s.forged.frontier.length - 1]!;
  return apply(s, { type: 'claimNode', id });
};

describe('survey', () => {
  it('reveals frontier entities up to the cap, then idles', () => {
    let s = { ...initialState(), resources: { ...initialState().resources, data: '1e9' } };
    for (let i = 0; i < FRONTIER_CAP + 3; i++) s = apply(s, { type: 'survey' });
    expect(s.forged.frontier.length).toBe(FRONTIER_CAP);
    expect(s.forged.nextId).toBe(1 + FRONTIER_CAP); // ids minted only for real reveals
  });

  it('costs ATTENTION as well as Datums, and refuses without it', () => {
    const tired = { ...initialState(), attention: 0 };
    const surveyed = apply(tired, { type: 'survey' });
    const id = surveyed.forged.frontier[0]!;
    expect(apply(surveyed, { type: 'claimNode', id })).toBe(surveyed);
  });

  it('COSTS Datums, and costs more with a frontier you have not cleared', () => {
    // Free and unlimited, Survey was the biggest button on screen and
    // economically inert. Now it asks a question: look for more, or finish
    // what you already found?
    const s = { ...initialState(), resources: { ...initialState().resources, data: '1e9' } };
    const first = surveyCost(s);
    const after = apply(s, { type: 'survey' });
    expect(Number(after.resources.data)).toBe(Number(s.resources.data) - Number(first));
    expect(Number(surveyCost(after))).toBeGreaterThan(Number(first));
    expect(after.surveyed).toBe(1);
    expect(after.graph).toEqual(s.graph);
  });

  it('is refused outright when the Datums are not there', () => {
    const broke = { ...initialState(), resources: { ...initialState().resources, data: '0' } };
    expect(apply(broke, { type: 'survey' })).toBe(broke);
  });
});

describe('claimNode', () => {
  it('wires a frontier entity in: pays Datums, mints a Triple, links it', () => {
    // done by hand, unfunded, so the arithmetic is the real arithmetic
    let s = initialState(); // 15 Datums, 4 attention
    const survey = Number(surveyCost(s));
    s = apply(s, { type: 'survey' });
    const id = s.forged.frontier[0]!;
    s = apply(s, { type: 'claimNode', id });
    expect(Number(s.resources.data)).toBe(15 - survey - 5); // survey, then the claim
    expect(s.attention).toBe(4 - CLAIM_ATTENTION);
    expect(s.resources.triples).toBe('1');
    expect(s.forged.anchors).toEqual([0, 1]);
    expect(s.forged.links).toEqual([[0, 1]]);
    expect(s.forged.frontier).toEqual([]);
    expect(s.graph).toEqual({ nodes: 2, edges: 1 });
  });

  it('rejects ids not on the frontier and unaffordable claims', () => {
    let s = initialState();
    expect(apply(s, { type: 'claimNode', id: 99 })).toBe(s);
    // fund exactly two claims, then leave it short for a third
    s = { ...s, resources: { ...s.resources, data: '60' }, attention: 12 };
    s = surveyAndClaim(s);
    s = surveyAndClaim(s);
    const broke = { ...s, resources: { ...s.resources, data: '0' } };
    const stuck = apply(apply(broke, { type: 'survey' }), { type: 'claimNode', id: broke.forged.nextId });
    expect(stuck.resources.triples).toBe('2'); // can afford neither survey nor claim
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
    let s = { ...initialState(), resources: { ...initialState().resources, data: '1e30' } };
    for (let i = 0; i < ANCHOR_CAP + 10; i++) {
      s = { ...s, resources: { ...s.resources, data: '1e30' } }; // survey price climbs; not the point here
      s = surveyAndClaim(s);
    }
    expect(s.forged.anchors.length).toBe(ANCHOR_CAP);
    expect(D(s.forged.foldedNodes).toNumber()).toBe(11); // 1 + 250 owned, 240 addressable
    expect(s.graph.nodes).toBe(ANCHOR_CAP + 11); // nothing lost, only folded
    expect(s.graph.edges).toBe(ANCHOR_CAP + 10); // = triples balance
  });
});

describe('the drip (edges ARE the income)', () => {
  it('each statement yields 0.15 Datums/s', () => {
    let s = { ...initialState(), resources: { ...initialState().resources, data: '400' } };
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
    const before = D(s.resources.data).toNumber();
    for (let i = 0; i < 100; i++) s = tick(s, 0.1); // 10s
    expect(D(s.resources.data).toNumber() - before).toBeCloseTo(1.5, 9);
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
