// THE CAMP BUILDER — the pivot's first slice, 2026-08-07 (night).
// Owner's decree: a base-building game on a graph, connections prominent,
// no prose. These tests are the engine's law; the probe is the screen's.
//
// ---- PROVEN RED, 2026-08-07 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, rates, level, shown, pathKey, component,
  unlayable, unraisable, TAP_STONE, RATE, COST, LEVEL_AT, SITES,
  type Camp } from '../src/camp/engine';
import { honour } from '../src/camp/store';

const tick = (g: Camp, secs: number): Camp => apply(g, { type: 'tick', secs });

/** The full working chain: quarry, lumber, mill, all pathed to the camp. */
const chain = (): Camp => ({
  ...initial(),
  built: { 0: 'village', 1: 'quarry', 2: 'lumber', 3: 'sawmill' },
  paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 },
});

describe('★★ nothing counts until a path reaches the camp', () => {
  it('a quarry with no path makes NOTHING', () => {
    const g: Camp = { ...initial(), built: { 0: 'village', 1: 'quarry' } };
    expect(rates(g).stone).toBe(0);
    expect(tick(g, 100).stone).toBe(0);
  });

  it('★ the same quarry, pathed, makes stone on the clock', () => {
    const g: Camp = { ...initial(), built: { 0: 'village', 1: 'quarry' },
      paths: { [pathKey(0, 1)]: 1 } };
    expect(rates(g).stone).toBeCloseTo(RATE.quarry, 9);
    expect(tick(g, 10).stone).toBeCloseTo(RATE.quarry * 10, 9);
  });

  it('a chain through a middle site carries — connections compose', () => {
    // quarry at 1, pathed 1—2—0: reaches the camp through Tall Pines.
    const g: Camp = { ...initial(), built: { 0: 'village', 1: 'quarry' },
      paths: { [pathKey(1, 2)]: 1, [pathKey(0, 2)]: 1 } };
    expect(component(g).has(1)).toBe(true);
    expect(rates(g).stone).toBeCloseTo(RATE.quarry, 9);
  });
});

describe('★★ the mill: logs in, planks out, the camp eats and levels', () => {
  it('a mill with no logs saws NOTHING', () => {
    const g: Camp = { ...initial(), built: { 0: 'village', 3: 'sawmill' },
      paths: { [pathKey(0, 3)]: 1 } };
    expect(rates(g).planks).toBe(0);
    expect(tick(g, 60).progress).toBe(0);
  });

  it('★ the full chain flows: planks arrive, the camp eats them into progress', () => {
    const g = tick(chain(), 10);
    // lumber 0.4/s in, mill caps 0.5 → planks 0.4/s; camp eats 0.4/s of them.
    expect(g.progress).toBeCloseTo(4, 6);
    expect(g.stone).toBeCloseTo(3, 6);
  });

  it('★ a log pile is sawn dry, never past dry — the away-tick cannot mint', () => {
    // One log banked, no cutters: an hour of mill time saws exactly one log.
    const g: Camp = { ...initial(), logs: 1,
      built: { 0: 'village', 3: 'sawmill' }, paths: { [pathKey(0, 3)]: 1 } };
    const out = tick(g, 3600);
    expect(out.logs).toBe(0);
    expect(out.progress).toBeCloseTo(1, 6);
  });

  it('★★ fifteen planks eaten is camp level 2, and the ground grows', () => {
    expect(shown(initial()).length).toBe(4);
    const g = tick(chain(), LEVEL_AT[0]! / RATE.village + 1);
    expect(level(g)).toBe(2);
    expect(shown(g).length).toBe(SITES.length);
  });
});

describe('★ building and connecting: costs and honest refusals', () => {
  it('a tap chips stone by hand', () => {
    expect(apply(initial(), { type: 'tap' }).stone).toBeCloseTo(TAP_STONE, 9);
  });

  it('raising pays stone and stands the works', () => {
    const g = apply({ ...initial(), stone: 9 }, { type: 'raise', id: 1 });
    expect(g.built[1]).toBe('quarry');
    expect(g.stone).toBeCloseTo(9 - COST.quarry, 9);
  });

  it('refusals say why: cost, standing, locked ground, the camp itself', () => {
    expect(unraisable(initial(), 1)).toMatch(/^5 stone — you have 0/);
    expect(unraisable({ ...initial(), stone: 9, built: { 0: 'village', 1: 'quarry' } }, 1))
      .toBe('already standing');
    expect(unraisable({ ...initial(), stone: 99 }, 4)).toBe('camp level 2');
    expect(unraisable(initial(), 0)).toBe('the camp stands here');
  });

  it('a path needs a neighbour, a reached end, and the stone', () => {
    expect(unlayable(initial(), 1, 3)).toBe('nothing joins these');
    expect(unlayable({ ...initial(), stone: 9 }, 1, 2)).toBe('no path reaches either end');
    expect(unlayable(initial(), 0, 1)).toMatch(/^3 stone — you have 0/);
    const g = apply({ ...initial(), stone: 9 }, { type: 'lay', a: 0, b: 1 });
    expect(g.paths[pathKey(0, 1)]).toBe(1);
    expect(g.stone).toBeCloseTo(9 - COST.path, 9);
    expect(unlayable(g, 0, 1)).toBe('already laid');
  });

  it('a locked site cannot be pathed to before its level', () => {
    const g: Camp = { ...initial(), stone: 99,
      built: { 0: 'village' }, paths: { [pathKey(0, 3)]: 1 } };
    expect(unlayable(g, 3, 5)).toBe('camp level 2');
  });
});

describe('★ the save honours its shape and refuses the rest', () => {
  it('round-trips a real game', () => {
    const g = tick(chain(), 30);
    const back = honour({ game: g, savedAt: Date.now() });
    expect(back).not.toBeNull();
    expect(back!.game).toEqual(g);
  });

  it('refuses garbage, wrong versions, and poisoned numbers', () => {
    expect(honour(null)).toBeNull();
    expect(honour({ game: { version: 99 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), stone: -5 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), planks: Infinity }, savedAt: 1 })).toBeNull();
  });
});
