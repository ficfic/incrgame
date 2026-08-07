// THE CITY ON THE GRAPH — slice 2, 2026-08-08. docs/CITY.md is the design;
// these tests are its five rules made law: counts with a compounding curve,
// people as the multiplier, paths as throughput with WASTE, pop unlocks.
//
// ---- PROVEN RED, 2026-08-08 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, flow, shown, popCap, pathKey, costOf, pathCostOf,
  unlayable, unraisable, component, TAP_STONE, RATE, BASE, HUT_ROOM,
  GROW_SECS, CARRY, SITES, type City } from '../src/camp/engine';
import { honour } from '../src/camp/store';

const tick = (g: City, secs: number): City => apply(g, { type: 'tick', secs });

/** A quarry chain: n copies at the rock face, pathed at the given gauge. */
const quarried = (n: number, gauge = 1, pop = 99): City => ({
  ...initial(), pop,
  stacks: { 1: n },
  paths: { [pathKey(0, 1)]: gauge },
});

/** The full working chain, staffed rich. */
const chain = (pop = 99): City => ({
  ...initial(), pop,
  stacks: { 1: 1, 2: 1, 3: 1 },
  paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 },
});

describe('★★ RULE 1 — buildings come in counts, on the compounding curve', () => {
  it('the n-th copy costs base × 1.15^n, rounded up', () => {
    expect(costOf('quarry', 0)).toBe(BASE.quarry);
    expect(costOf('quarry', 1)).toBe(Math.ceil(BASE.quarry * 1.15));
    expect(costOf('quarry', 5)).toBe(Math.ceil(BASE.quarry * 1.15 ** 5));
  });

  it('raising stacks the count and pays the curve', () => {
    let g: City = { ...initial(), stone: 99 };
    g = apply(g, { type: 'raise', id: 1 });
    g = apply(g, { type: 'raise', id: 1 });
    expect(g.stacks[1]).toBe(2);
    expect(g.stone).toBeCloseTo(99 - costOf('quarry', 0) - costOf('quarry', 1), 9);
  });

  it('three copies make three times the stone', () => {
    expect(flow(quarried(3, 3)).stone).toBeCloseTo(3 * RATE.quarry, 9);
  });
});

describe('★★ RULE 2 — people are the multiplier, and the ladder', () => {
  it('huts raise the cap; people grow toward it on the clock', () => {
    const g: City = { ...initial(), stacks: { 0: 2 } };
    expect(popCap(g)).toBe(2 + 2 * HUT_ROOM);
    const grown = tick(g, GROW_SECS * 2 + 0.5);
    expect(grown.pop).toBe(4);
  });

  it('people never grow past the huts', () => {
    expect(tick(initial(), 3600).pop).toBe(2);
  });

  it('★ understaffed works run at pop/jobs — evenly, never babysat', () => {
    // 4 quarry jobs, 2 people: half rate.
    const g = quarried(4, 3, 2);
    expect(flow(g).staff).toBeCloseTo(0.5, 9);
    expect(flow(g).stone).toBeCloseTo(4 * RATE.quarry * 0.5, 9);
  });

  it('★ huts cost PLANKS — the mill chain is the sink', () => {
    expect(unraisable({ ...initial(), stone: 99 }, 0)).toMatch(/planks/);
    const g = apply({ ...initial(), planks: 9 }, { type: 'raise', id: 0 });
    expect(g.stacks[0]).toBe(1);
    expect(g.planks).toBeCloseTo(9 - BASE.hut, 9);
  });

  it('★ pop thresholds grow the ground — the level is people now', () => {
    expect(shown(initial()).length).toBe(4);
    expect(shown({ ...initial(), pop: 6 }).length).toBe(5);
    expect(shown({ ...initial(), pop: 10 }).length).toBe(SITES.length);
  });
});

describe('★★ RULE 3 — the path is the throughput, and past it is WASTE', () => {
  it('a gauge-1 path carries one per second, whole', () => {
    // 3 quarries make 0.9/s < 1.0 cap: nothing wasted, no choke.
    const f = flow(quarried(3, 1));
    expect(f.stone).toBeCloseTo(0.9, 9);
    expect(f.choked.size).toBe(0);
  });

  it('★★ production past the path CHOKES: capped, named, drawn', () => {
    // 4 quarries make 1.2/s into a 1.0 path: 1.0 arrives, 0.2 wasted.
    const f = flow(quarried(4, 1));
    expect(f.made.get(1)).toBeCloseTo(1.2, 9);
    expect(f.carried.get(1)).toBeCloseTo(CARRY, 9);
    expect(f.stone).toBeCloseTo(CARRY, 9);
    expect(f.choked.has(pathKey(0, 1))).toBe(true);
  });

  it('★ widening the path is the fix', () => {
    const f = flow(quarried(4, 2));
    expect(f.stone).toBeCloseTo(1.2, 9);
    expect(f.choked.size).toBe(0);
  });

  it('widening pays the gauge curve and stops at the widest', () => {
    let g: City = { ...initial(), stone: 99, paths: { [pathKey(0, 1)]: 1 } };
    g = apply(g, { type: 'lay', a: 0, b: 1 });
    expect(g.paths[pathKey(0, 1)]).toBe(2);
    expect(g.stone).toBeCloseTo(99 - pathCostOf(1), 9);
    g = apply(g, { type: 'lay', a: 0, b: 1 });
    expect(unlayable(g, 0, 1)).toBe('as wide as it goes');
  });

  it('a shared edge chokes EVERYONE routed over it', () => {
    // Quarry at the rock face routes 1—2—0 with the pines' lumber: both
    // over one gauge-1 edge 0|2, together 0.7/s — fine. Nine quarries are
    // not fine, and both producers feel it.
    const g: City = { ...initial(), pop: 99,
      stacks: { 1: 9, 2: 1 },
      paths: { [pathKey(1, 2)]: 3, [pathKey(0, 2)]: 1 } };
    const f = flow(g);
    expect(f.choked.has(pathKey(0, 2))).toBe(true);
    expect((f.carried.get(1) ?? 0) + (f.carried.get(2) ?? 0)).toBeCloseTo(CARRY, 6);
  });

  it('nothing counts unconnected, exactly as before', () => {
    const g: City = { ...initial(), pop: 99, stacks: { 1: 3 } };
    expect(flow(g).stone).toBe(0);
    expect(component(g).has(1)).toBe(false);
  });
});

describe('★★ RULE 4 — the cascade: logs to planks to huts to people', () => {
  it('the mill saws what arrives, the pile never goes phantom', () => {
    // One log banked, no cutters: an hour saws exactly one log.
    const g: City = { ...initial(), pop: 99, logs: 1,
      stacks: { 3: 1 }, paths: { [pathKey(0, 3)]: 1 } };
    const out = tick(g, 3600);
    expect(out.logs).toBe(0);
    expect(out.planks).toBeCloseTo(1, 6);
  });

  it('★ the full chain banks planks on the clock', () => {
    const g = tick(chain(), 10);
    // lumber 0.4 in, mill cap 0.5 → 4 planks in 10s; stone 3.
    expect(g.planks).toBeCloseTo(4, 6);
    expect(g.stone).toBeCloseTo(3, 6);
  });
});

describe('★ honest refusals and the save', () => {
  it('a tap chips stone by hand', () => {
    expect(apply(initial(), { type: 'tap' }).stone).toBeCloseTo(TAP_STONE, 9);
  });

  it('refusals say why: price, people, reach', () => {
    expect(unraisable(initial(), 1)).toMatch(/^5 stone — you have 0/);
    expect(unraisable(initial(), 4)).toBe('6 people first');
    expect(unlayable(initial(), 1, 3)).toBe('nothing joins these');
    expect(unlayable({ ...initial(), stone: 99 }, 1, 2)).toBe('no path reaches either end');
    expect(unlayable({ ...initial(), stone: 99, pop: 2 }, 3, 5)).toBe('10 people first');
  });

  it('round-trips a real city and refuses the rest', () => {
    const g = tick(chain(), 30);
    const back = honour({ game: g, savedAt: Date.now() });
    expect(back).not.toBeNull();
    expect(back!.game).toEqual(g);
    expect(honour(null)).toBeNull();
    expect(honour({ game: { version: 1 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), pop: -1 }, savedAt: 1 })).toBeNull();
  });
});
