// THE CITY ON THE GRAPH — slice 2, 2026-08-08. docs/CITY.md is the design;
// these tests are its five rules made law: counts with a compounding curve,
// people as the multiplier, paths as throughput with WASTE, pop unlocks.
//
// ---- PROVEN RED, 2026-08-08 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, flow, shown, popCap, pathKey, costOf, pathCostOf, heroMax,
  unlayable, unraisable, unassailable, component, heroHit, armsCost, hunger,
  TAP_STONE, RATE, BASE, HUT_ROOM, GROW_SECS, CARRY, SITES, GOBLINS, CREW, GOBLIN_REGEN,
  PATH_COST, PATH_SECS,
  HERO_HP, HEAL_SECS, WILD_FED, EAT, CAPTIVES, type City } from '../src/camp/engine';
import { honour } from '../src/camp/store';

const tick = (g: City, secs: number): City => apply(g, { type: 'tick', secs });

/** A quarry chain: n copies at the rock face, pathed at the given gauge. */
// Fixtures carry a stocked larder: 99 people un-fed would be a famine,
// and these blocks are about rules 1-3, not rule starving.
const quarried = (n: number, gauge = 1, pop = 99): City => ({
  ...initial(), pop, food: 999,
  stacks: { 1: n },
  paths: { [pathKey(0, 1)]: gauge },
});

/** The full working chain, staffed rich. */
const chain = (pop = 99): City => ({
  ...initial(), pop, food: 999,
  stacks: { 1: 1, 2: 1, 3: 1 },
  paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 },
});

describe('★★ RULE 1 — buildings come in counts, on the compounding curve', () => {
  it('works climb 1.35^n; huts stay gentle at 1.15 — the plank sink', () => {
    expect(costOf('quarry', 0).stone).toBe(BASE.quarry.stone);
    expect(costOf('quarry', 1).stone).toBe(Math.ceil(BASE.quarry.stone! * 1.35));
    expect(costOf('quarry', 5).stone).toBe(Math.ceil(BASE.quarry.stone! * 1.35 ** 5));
    expect(costOf('hut', 5).planks).toBe(Math.ceil(BASE.hut.planks! * 1.15 ** 5));
    // The owner: "it's weird that i need stone to build lumberjack camp."
    expect(BASE.lumber.stone).toBeUndefined();
    expect(BASE.lumber.logs).toBeGreaterThan(0);
    expect(BASE.hut.planks).toBeGreaterThan(0);
  });

  it('raising stacks the count and pays every part of the curve', () => {
    let g: City = { ...initial(), stone: 99, paths: { [pathKey(0, 1)]: 1 } };
    g = apply(g, { type: 'raise', id: 1 });
    g = apply(g, { type: 'raise', id: 1 });
    expect(g.stacks[1]).toBe(2);
    expect(g.stone).toBeCloseTo(99 - costOf('quarry', 0).stone! - costOf('quarry', 1).stone!, 9);
  });

  it('★ hand-taps follow the ground: logs off the pines', () => {
    expect(apply(initial(), { type: 'tap', kind: 'logs' }).logs).toBeCloseTo(TAP_STONE, 9);
    expect(apply(initial(), { type: 'tap' }).stone).toBeCloseTo(TAP_STONE, 9);
  });

  it('★ a copy holds a CREW, and output is per worker', () => {
    // Three copies, fully crewed: 12 hands at the per-worker rate.
    expect(flow(quarried(3, 3)).stone).toBeCloseTo(3 * CREW * RATE.quarry, 9);
    // Two hands on one copy is exactly the pre-rebase copy: 0.3/s.
    expect(flow(quarried(1, 1, 2)).stone).toBeCloseTo(0.3, 9);
  });
});

describe('★★ RULE 2 — people are the multiplier, and the ladder', () => {
  it('huts raise the cap; people grow toward it on the clock', () => {
    const g: City = { ...initial(), stacks: { 0: 2 } };
    expect(popCap(g)).toBe(2 + 2 * HUT_ROOM);
    expect(HUT_ROOM).toBe(CREW);   // one hut houses one crew
    const grown = tick(g, GROW_SECS * 2 + 0.5);
    expect(grown.pop).toBe(4);
  });

  it('people never grow past the huts', () => {
    expect(tick(initial(), 3600).pop).toBe(2);
  });

  it('★ understaffed works run at pop/slots — evenly, never babysat', () => {
    // 16 slots, 2 people: an eighth of a crew everywhere, all rates honest.
    const g = quarried(4, 3, 2);
    expect(flow(g).staff).toBeCloseTo(2 / 16, 9);
    expect(flow(g).stone).toBeCloseTo(2 * RATE.quarry, 9);
  });

  it('★★ THE FIELDS EAT FIRST: hands fill the farms before anything else', () => {
    // 3 people, one farm (4 slots) + quarries: every hand goes to the
    // fields first; the quarries get whoever is left — today, nobody.
    const g: City = { ...initial(), pop: 3, food: 999, goblins: {},
      stacks: { 1: 4, 4: 1 },
      paths: { [pathKey(0, 1)]: 3, [pathKey(0, 4)]: 3 } };
    const f = flow(g);
    expect(f.food).toBeCloseTo(3 * RATE.farm, 9);
    expect(f.stone).toBeCloseTo(0, 9);
  });

  it('★ huts cost PLANKS — the mill chain is the sink', () => {
    expect(unraisable({ ...initial(), stone: 99 }, 0)).toMatch(/planks/);
    const g = apply({ ...initial(), planks: 12 }, { type: 'raise', id: 0 });
    expect(g.stacks[0]).toBe(1);
    expect(g.planks).toBeCloseTo(12 - BASE.hut.planks!, 9);
  });

  it('★ no works before a path reaches the ground', () => {
    // The owner: "it's weird that i can build something before there's a
    // path to that spot." The camp itself is the one exception.
    expect(unraisable({ ...initial(), stone: 99 }, 1)).toBe('no path reaches here');
    expect(unraisable({ ...initial(), planks: 99 }, 0)).toBeNull();
  });

  it('★ the first valley shows whole; the far country waits behind its holdings', () => {
    expect(shown(initial()).length).toBe(7);
    expect(initial().goblins).toEqual({ 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 });
  });

  it('★★ liberating the knoll GROWS THE MAP — the fight\'s real prize', () => {
    const { 6: _, ...rest } = initial().goblins;
    const g: City = { ...initial(), goblins: rest };
    const ids = shown(g).map((s) => s.id);
    expect(ids).toContain(7);   // Dark Pines steps out of the mist
    expect(ids).toContain(9);   // and the Green Vale behind them
    expect(ids).not.toContain(8);   // the scree still hides the High Quarry
  });

  it('★ every liberation toughens the hero: +3 health per ground freed', () => {
    expect(heroMax(initial())).toBe(HERO_HP);
    const { 4: _a, 5: _b, ...rest } = initial().goblins;
    const g: City = { ...initial(), goblins: rest };
    expect(heroMax(g)).toBe(HERO_HP + 6);
    // And the heal fills to the GROWN max.
    const hurt: City = { ...g, hero: { hp: 0, arms: 0, part: 0 } };
    expect(tick(hurt, HEAL_SECS * 40).hero.hp).toBe(HERO_HP + 6);
  });

  it('★ the deep country is winnable at the ladder: arms 6, home at 4', () => {
    // Dark Pines (32 strong, bites 5) with the first valley won (hp 19)
    // and Arms ×6 (strikes 8): four rounds, three bites, home at 4 — and
    // Arms ×5 dies. Chad's +2-per-fight cadence, verified.
    const start = { ...initial().goblins };
    delete start[4]; delete start[5]; delete start[6];
    let g: City = { ...initial(), goblins: start,
      hero: { hp: 19, arms: 6, part: 0 } };
    g = apply(g, { type: 'assail', id: 7 });
    for (let i = 0; i < 4 && g.fight; i++) g = apply(g, { type: 'strike' });
    expect(g.goblins[7]).toBeUndefined();
    expect(g.hero.hp).toBe(4);
  });
});

describe('★★ RULE 3 — the path is the throughput, and past it is WASTE', () => {
  it('a gauge-1 path carries one per second, whole', () => {
    // One crewed copy makes 0.6/s < 1.0 cap: nothing wasted, no choke.
    const f = flow(quarried(1, 1));
    expect(f.stone).toBeCloseTo(CREW * RATE.quarry, 9);
    expect(f.choked.size).toBe(0);
  });

  it('★★ production past the path CHOKES: capped, named, drawn', () => {
    // Two crewed copies make 1.2/s into a 1.0 path: 1.0 arrives, 0.2 wasted.
    const f = flow(quarried(2, 1));
    expect(f.made.get(1)).toBeCloseTo(1.2, 9);
    expect(f.carried.get(1)).toBeCloseTo(CARRY, 9);
    expect(f.stone).toBeCloseTo(CARRY, 9);
    expect(f.choked.has(pathKey(0, 1))).toBe(true);
  });

  it('★ widening the path is the fix', () => {
    const f = flow(quarried(2, 2));
    expect(f.stone).toBeCloseTo(1.2, 9);
    expect(f.choked.size).toBe(0);
  });

  it('★ a path takes TIME: paid up front, filling on the tick, carrying nothing yet', () => {
    let g: City = { ...initial(), stone: 99, pop: 9, food: 999,
      stacks: { 1: 2 } };
    g = apply(g, { type: 'lay', a: 0, b: 1 });
    expect(g.stone).toBeCloseTo(99 - PATH_COST, 9);
    expect(g.paths[pathKey(0, 1)]).toBeUndefined();
    expect(g.laying[pathKey(0, 1)]).toEqual({ left: PATH_SECS, secs: PATH_SECS });
    expect(flow(g).stone).toBe(0);                       // not carrying yet
    expect(unlayable(g, 0, 1)).toBe('already laying');   // no double spades
    g = tick(g, PATH_SECS / 2);
    expect(g.laying[pathKey(0, 1)]!.left).toBeCloseTo(PATH_SECS / 2, 6);
    g = tick(g, PATH_SECS);
    expect(g.paths[pathKey(0, 1)]).toBe(1);              // done mid-tick
    expect(g.laying[pathKey(0, 1)]).toBeUndefined();
    expect(flow(g).stone).toBeGreaterThan(0);
  });

  it('widening pays the gauge curve, takes longer, and stops at the widest', () => {
    let g: City = { ...initial(), stone: 99, paths: { [pathKey(0, 1)]: 1 } };
    g = apply(g, { type: 'lay', a: 0, b: 1 });
    expect(g.stone).toBeCloseTo(99 - pathCostOf(1), 9);
    expect(g.laying[pathKey(0, 1)]!.secs).toBe(PATH_SECS * 2);
    g = tick(g, PATH_SECS * 2 + 1);
    expect(g.paths[pathKey(0, 1)]).toBe(2);
    g = apply(g, { type: 'lay', a: 0, b: 1 });
    g = tick(g, PATH_SECS * 3 + 1);
    expect(unlayable(g, 0, 1)).toBe('as wide as it goes');
  });

  it('a shared edge chokes EVERYONE routed over it', () => {
    // The rock face's stone routes 1—2—0 alongside the pines' logs, both
    // over one gauge-1 edge — and together they bury it, so both feel it.
    const g: City = { ...initial(), pop: 99, food: 999,
      stacks: { 1: 3, 2: 1 },
      paths: { [pathKey(1, 2)]: 3, [pathKey(0, 2)]: 1 } };
    const f = flow(g);
    expect(f.choked.has(pathKey(0, 2))).toBe(true);
    expect((f.carried.get(1) ?? 0) + (f.carried.get(2) ?? 0)).toBeCloseTo(CARRY, 6);
  });

  it('nothing counts unconnected, exactly as before', () => {
    const g: City = { ...initial(), pop: 99, stacks: { 1: 3 } };
    expect(flow(g).stone).toBe(0);
    expect(flow(g).hands.get(1)).toBeUndefined();
    expect(component(g).has(1)).toBe(false);
  });
});

describe('★★ POSTED HANDS — assign people, auto never babysits', () => {
  it('★ a pin moves the hands: posted site staffed whole, the rest split', () => {
    // 2 people, quarry ×2 and lumber ×2: auto splits them half-and-half.
    // Post both at the quarry and the pines stand empty — the player's call.
    const g: City = { ...initial(), pop: 2, food: 999,
      stacks: { 1: 1, 2: 1 },
      paths: { [pathKey(0, 1)]: 3, [pathKey(0, 2)]: 3 } };
    const auto = flow(g);
    expect(auto.stone).toBeCloseTo(1 * RATE.quarry, 9);   // one hand each
    const pinnedG: City = { ...g, crew: { 1: 2 } };
    const f = flow(pinnedG);
    expect(f.hands.get(1)).toBeCloseTo(2, 9);
    expect(f.hands.get(2)).toBeCloseTo(0, 9);
    expect(f.stone).toBeCloseTo(2 * RATE.quarry, 9);
  });

  it('★ pins even beat farms-first — an explicit call wins the pool', () => {
    const g: City = { ...initial(), pop: 2, food: 999, goblins: {},
      stacks: { 1: 1, 4: 1 },
      paths: { [pathKey(0, 1)]: 3, [pathKey(0, 4)]: 3 }, crew: { 1: 2 } };
    const f = flow(g);
    expect(f.food).toBe(0);
    expect(f.stone).toBeCloseTo(2 * RATE.quarry, 9);
  });

  it('★ the first touch takes over from auto at TODAY\'S hands', () => {
    // Auto gives the lone quarry both people; one '−' takes over at 2 and
    // steps to 1 — no surprise jumps from zero.
    let g: City = { ...initial(), pop: 2, stacks: { 1: 1 },
      paths: { [pathKey(0, 1)]: 1 } };
    expect(flow(g).hands.get(1)).toBe(2);
    g = apply(g, { type: 'pin', id: 1, d: -1 });
    expect(g.crew[1]).toBe(1);
    expect(flow(g).hands.get(1)).toBe(1);
    // Down to a HELD works: zero hands, zero output, and it stays there.
    g = apply(g, { type: 'pin', id: 1, d: -1 });
    expect(g.crew[1]).toBe(0);
    expect(flow(g).stone).toBe(0);
    expect(apply(g, { type: 'pin', id: 1, d: -1 })).toBe(g);   // floor
    // The ceiling is the works' own slots.
    for (let i = 0; i < 9; i++) g = apply(g, { type: 'pin', id: 1, d: 1 });
    expect(g.crew[1]).toBe(CREW);
    // And 'free' hands it back to auto whole.
    g = apply(g, { type: 'free', id: 1 });
    expect(g.crew[1]).toBeUndefined();
    expect(flow(g).hands.get(1)).toBe(2);
  });

  it('★ every hand is a whole person, placed round-robin after the farms', () => {
    // Five people over two quarry sites: 3 and 2, site order, no halves.
    const g: City = { ...initial(), pop: 5, food: 999, goblins: {},
      stacks: { 1: 1, 5: 1 },
      paths: { [pathKey(0, 1)]: 3, [pathKey(0, 3)]: 3, [pathKey(3, 5)]: 3 } };
    const f = flow(g);
    expect(f.hands.get(1)).toBe(3);
    expect(f.hands.get(5)).toBe(2);
    for (const w of f.hands.values()) expect(Number.isInteger(w)).toBe(true);
  });

  it('the starving law is not overridable by a pin', () => {
    // 25 mouths eat 0.95/s; one farm's whole crew brings 0.8/s: STARVING,
    // and the posted quarry hands stand down with everyone else.
    const g: City = { ...initial(), pop: 25, food: 0, goblins: {},
      stacks: { 1: 2, 4: 1 }, crew: { 1: 2 },
      paths: { [pathKey(0, 1)]: 1, [pathKey(0, 4)]: 1 } };
    const f = flow(g);
    expect(f.starving).toBe(true);
    expect(f.stone).toBe(0);   // posted or not, the quarry stands down
  });

  it('pins survive the save and garbage is refused', () => {
    const g: City = { ...initial(), crew: { 1: 2 } };
    expect(honour({ game: g, savedAt: 1 })!.game.crew).toEqual({ 1: 2 });
    expect(honour({ game: { ...initial(), crew: { 1: -1 } }, savedAt: 1 })).toBeNull();
  });
});

describe('★★ MESH ROUTING — logs travel to the mill, and topology pays', () => {
  // Same buildings both times: lumber ×3 at the pines, one mill at the
  // river, every path gauge 1. Only the WIRING differs.
  const town = (paths: Record<string, number>): City => ({
    ...initial(), pop: 99, food: 999,
    stacks: { 2: 1, 3: 1 },
    paths,
  });

  it('★★ THE PAYOFF: a meshed town outships a star with the same buildings', () => {
    // STAR: logs must cross the camp and then share the mill's own road —
    // which they saturate, so the planks have no room home.
    const star = flow(town({ [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 }));
    // MESH: pines wired straight to the river; the mill's road home is
    // carrying planks and nothing else.
    const mesh = flow(town({ [pathKey(2, 3)]: 1, [pathKey(0, 3)]: 1 }));
    expect(mesh.planks).toBeGreaterThan(star.planks);
    // 0.8/s of logs into a 1.0 mill: 0.8 of planks home on an empty road.
    expect(mesh.planks).toBeCloseTo(CREW * RATE.lumber, 6);
    // The star's logs leave 0.2 of room for 0.8 of planks.
    expect(star.planks).toBeCloseTo(0.2, 6);
  });

  it('★ logs take the direct lane when both are wired', () => {
    const heavy: City = { ...town({}), stacks: { 2: 2, 3: 1 },
      paths: { [pathKey(0, 2)]: 1, [pathKey(2, 3)]: 1, [pathKey(0, 3)]: 1 } };
    const f = flow(heavy);
    // 1.6/s of logs into a gauge-1 direct lane: that lane chokes, the
    // camp's own edge does not — the logs never crossed it.
    expect(f.choked.has(pathKey(2, 3))).toBe(true);
    expect(f.choked.has(pathKey(0, 2))).toBe(false);
    expect(f.choked.has(pathKey(0, 3))).toBe(false);
  });

  it('with no mill standing, logs still pile home at the camp', () => {
    const f = flow({ ...initial(), pop: 99, food: 999,
      stacks: { 2: 1 }, paths: { [pathKey(0, 2)]: 1 } });
    expect(f.logsIn).toBeCloseTo(CREW * RATE.lumber, 9);
    expect(f.planks).toBe(0);
  });

  it('★ a choked plank road wastes sawn planks — never mints them', () => {
    // Mill fed from a pile, its road home already full of stone: the mill
    // saws at capacity but almost nothing ships, and the tick banks only
    // what shipped.
    const g: City = { ...initial(), pop: 99, food: 999, logs: 50,
      stacks: { 3: 1, 5: 2 },
      paths: { [pathKey(0, 3)]: 1, [pathKey(3, 5)]: 3 } };
    const f = flow(g);
    // Scree's 1.2/s of stone crosses 3→0 and fills the gauge-1 road.
    expect(f.choked.has(pathKey(0, 3))).toBe(true);
    expect(f.planks).toBeLessThan(f.sawing - 1e-9);
    const after = apply(g, { type: 'tick', secs: 10 });
    expect(after.planks).toBeCloseTo(f.planks * 10, 4);
    expect(after.logs).toBeCloseTo(50 - f.sawing * 10 + f.logsIn * 10, 4);
  });
});

describe('★★ RULE 4 — the cascade: logs to planks to huts to people', () => {
  it('the mill saws what arrives, the pile never goes phantom', () => {
    // One log banked, no cutters: an hour saws exactly one log.
    const g: City = { ...initial(), pop: 99, food: 9999, logs: 1,
      stacks: { 3: 1 }, paths: { [pathKey(0, 3)]: 1 } };
    const out = tick(g, 3600);
    expect(out.logs).toBe(0);
    expect(out.planks).toBeCloseTo(1, 6);
  });

  it('★ the full chain banks planks on the clock', () => {
    // Six settlers over twelve slots: half-crews everywhere — the same
    // honest 0.4 of logs and 0.3 of stone the old chain made.
    const g = tick(chain(6), 10);
    expect(g.planks).toBeCloseTo(4, 6);
    expect(g.stone).toBeCloseTo(3, 6);
  });
});

describe('★ honest refusals and the save', () => {
  it('a tap chips stone by hand', () => {
    expect(apply(initial(), { type: 'tap' }).stone).toBeCloseTo(TAP_STONE, 9);
  });

  it('refusals say why: price, danger, reach', () => {
    expect(unraisable({ ...initial(), paths: { [pathKey(0, 1)]: 1 } }, 1))
      .toMatch(/^5 stone — you have 0/);
    expect(unraisable(initial(), 4)).toMatch(/^dangerous — goblins, 12 strong/);
    expect(unlayable(initial(), 1, 3)).toBe('nothing joins these');
    expect(unlayable({ ...initial(), stone: 99 }, 1, 2)).toBe('no path reaches either end');
    expect(unlayable({ ...initial(), stone: 99 }, 3, 5)).toMatch(/^dangerous — goblins, 18 strong/);
  });

  it('round-trips a real city and refuses the rest', () => {
    const g = tick(chain(), 30);
    const back = honour({ game: g, savedAt: Date.now() });
    expect(back).not.toBeNull();
    expect(back!.game).toEqual(g);
    expect(honour(null)).toBeNull();
    expect(honour({ game: { version: 4 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), pop: -1 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), hero: { hp: -1, arms: 0, part: 0 } },
      savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), goblins: { 4: Infinity } },
      savedAt: 1 })).toBeNull();
  });
});

describe('★★ SLICE 3 — food: the wild feeds six, the fields feed the town', () => {
  /** A freed meadow, farmed and pathed. */
  const farmed = (copies: number, pop: number, food = 999): City => ({
    ...initial(), pop, food,
    goblins: { 5: 18, 6: 30 },
    stacks: { 4: copies },
    paths: { [pathKey(0, 4)]: 1 },
  });

  it('a farm makes food, carried like everything else', () => {
    expect(flow(farmed(1, 99)).food).toBeCloseTo(CREW * RATE.farm, 9);
  });

  it('★ hunger starts past the wild\'s table', () => {
    expect(hunger({ ...initial(), pop: WILD_FED })).toBe(0);
    expect(hunger({ ...initial(), pop: WILD_FED + 3 })).toBeCloseTo(3 * EAT, 9);
  });

  it('★ the larder banks the surplus and pays the hunger', () => {
    // A crewed farm brings 0.8/s; eight people eat 0.1/s: +0.7/s net.
    const g = tick(farmed(1, 8, 0), 10);
    expect(g.food).toBeCloseTo(7, 6);
  });

  it('★★ STARVING halts every works but the farms — and so it recovers', () => {
    // 25 mouths eat 0.95/s, one crewed farm brings 0.8/s, larder empty.
    const g: City = { ...farmed(1, 25, 0), stacks: { 1: 2, 4: 1 },
      paths: { [pathKey(0, 1)]: 1, [pathKey(0, 4)]: 1 } };
    const f = flow(g);
    expect(f.starving).toBe(true);
    expect(f.stone).toBe(0);                          // the quarry stands down
    expect(f.food).toBeCloseTo(CREW * RATE.farm, 9);  // the farm does not
    // Bread in the larder ends it.
    const fed = flow({ ...g, food: 5 });
    expect(fed.starving).toBe(false);
    expect(fed.stone).toBeGreaterThan(0);
  });

  it('★ settlers refuse a bare larder past the wild\'s table', () => {
    const full: City = { ...initial(), stacks: { 0: 9 }, pop: WILD_FED, food: 0 };
    expect(tick(full, 3600).pop).toBe(WILD_FED);       // no bread, no growth
    expect(tick({ ...full, food: 50 }, GROW_SECS * 2 + 1).pop).toBe(WILD_FED + 2);
  });
});

describe('★★ THE HERO AND THE GOBLINS — Mayor of Noobtown, by the numbers', () => {
  const strike = (g: City): City => apply(g, { type: 'strike' });

  it('★ bare hands lose to Old Growth: five strikes, beaten home, ground bled', () => {
    let g = apply(initial(), { type: 'assail', id: 4 });
    expect(g.fight).toEqual({ site: 4 });
    for (let i = 0; i < 5; i++) g = strike(g);
    // hit 2 five times: 12 → 2 left; four bites of 2 land, the fifth
    // drops the hero to zero and the fight breaks off.
    expect(g.fight).toBeNull();
    expect(g.hero.hp).toBe(0);
    expect(g.goblins[4]).toBe(2);
  });

  it('★ the two-sortie tutorial survives the regroup: heal, return, finish', () => {
    // Beaten off the meadow at 2-strong, the hero heals for 150s — and the
    // goblins REGROUP to 9.5 in that time. Five bare strikes still land 10:
    // fight one stays winnable with no arms at all, by design.
    let g: City = { ...initial(), goblins: { ...initial().goblins, 4: 2 },
      hero: { hp: 0, arms: 0, part: 0 } };
    expect(unassailable(g, 4)).toMatch(/^the hero heals — 0 of 10/);
    g = tick(g, HEAL_SECS * HERO_HP + 1);
    expect(g.hero.hp).toBe(HERO_HP);
    expect(g.goblins[4]).toBeCloseTo(2 + GOBLIN_REGEN * (HEAL_SECS * HERO_HP + 1), 6);
    const popBefore = g.pop;
    g = apply(g, { type: 'assail', id: 4 });
    for (let i = 0; i < 5 && g.fight; i++) g = strike(g);
    // ★ LIBERATED: the goblins are gone, the ground takes works again, and
    // two captives walked home with the hero.
    expect(g.goblins[4]).toBeUndefined();
    expect(g.fight).toBeNull();
    expect(g.pop).toBe(popBefore + CAPTIVES);
    expect(g.hero.hp).toBe(2);
    expect(unraisable({ ...g, stone: 99 }, 4)).toBe('no path reaches here');
    expect(unraisable({ ...g, stone: 99, paths: { [pathKey(0, 4)]: 1 } }, 4)).toBeNull();
  });

  it('★ goblins regroup while unengaged — never mid-fight, never past spawn', () => {
    const bled: City = { ...initial(), goblins: { ...initial().goblins, 4: 2 } };
    expect(tick(bled, 100).goblins[4]).toBeCloseTo(7, 6);
    expect(tick(bled, 9999).goblins[4]).toBe(12);          // capped at spawn
    const fighting: City = { ...bled, fight: { site: 4 } };
    expect(tick(fighting, 100).goblins[4]).toBe(2);        // pinned by the fight
  });

  it('★★ arms turn the same fight: ×1 beats the meadow whole', () => {
    let g: City = { ...initial(), hero: { hp: 10, arms: 1, part: 0 } };
    g = apply(g, { type: 'assail', id: 4 });
    for (let i = 0; i < 4 && g.fight; i++) g = strike(g);
    // hit 3: 12 → 0 in four strikes; three bites land, hp 4 stands.
    expect(g.goblins[4]).toBeUndefined();
    expect(g.hero.hp).toBe(4);
  });

  it('arms cost both currencies on a steeper curve, and arm() pays it', () => {
    expect(armsCost(0)).toEqual({ stone: 8, planks: 4 });
    expect(armsCost(3).stone).toBe(Math.ceil(8 * 1.3 ** 3));
    const g = apply({ ...initial(), stone: 20, planks: 10 }, { type: 'arm' });
    expect(g.hero.arms).toBe(1);
    expect(g.stone).toBe(12);
    expect(g.planks).toBe(6);
    expect(heroHit(g)).toBe(3);
    const broke = initial();
    expect(apply(broke, { type: 'arm' })).toBe(broke);
  });

  it('the hero is refused where sense refuses: free ground, mid-fight, hurt', () => {
    expect(unassailable(initial(), 1)).toBe('nothing to fight here');
    const mid = apply(initial(), { type: 'assail', id: 4 });
    expect(unassailable(mid, 5)).toBe('the hero is already fighting');
    expect(apply(mid, { type: 'assail', id: 5 })).toBe(mid);
    expect(apply(mid, { type: 'flee' }).fight).toBeNull();
  });

  it('no healing mid-fight — the wound is the fight\'s clock', () => {
    let g = apply(initial(), { type: 'assail', id: 4 });
    g = strike(g);
    expect(g.hero.hp).toBe(8);
    g = tick(g, 300);
    expect(g.hero.hp).toBe(8);
  });
});
