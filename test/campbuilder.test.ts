// THE CITY ON THE GRAPH — slice 2, 2026-08-08. docs/CITY.md is the design;
// these tests are its five rules made law: counts with a compounding curve,
// people as the multiplier, paths as throughput with WASTE, pop unlocks.
//
// ---- PROVEN RED, 2026-08-08 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, flow, shown, popCap, pathKey, costOf, pathCostOf, heroMax,
  unlayable, unraisable, unassailable, component, heroHit, armsCost, hunger,
  TAP_STONE, RATE, BASE, HUT_ROOM, GROW_SECS, CARRY, SITES, GOBLINS, CREW, GOBLIN_REGEN,
  PATH_COST, PATH_SECS, lineOf, windup, WINDUP_EVERY, regenOf, catchUp, STEP_SECS, SITE,
  richOf, MAX_GAUGE, roomOf, storeCost, STORE_BASE, STORE_ROOM,
  carriesOf, cartCost, cartHaul, CART_GAIN,
  RATION_FOOD, RATION_HP, RATION_PACK,
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

  it('★ the deep country is winnable at the ladder: arms 6, read the line', () => {
    // Dark Pines (32 strong, bites 5) with the first valley won (hp 19)
    // and Arms ×6 (hit 8): thin both runts, then two blows on the wall —
    // home at 10. Chad's +2-per-fight cadence, on the strip.
    const start = { ...initial().goblins };
    delete start[4]; delete start[5]; delete start[6];
    let g: City = { ...initial(), goblins: start,
      hero: { hp: 19, arms: 6, part: 0 } };
    g = apply(g, { type: 'assail', id: 7 });
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'aim', at: 2 }, { type: 'strike' },
      { type: 'strike' }, { type: 'strike' }] as const) g = apply(g, a);
    expect(g.goblins[7]).toBeUndefined();
    expect(g.hero.hp).toBe(10);
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

  it('★ a mid-fight save round-trips; an old-shape fight drops, the town stays', () => {
    const mid = apply({ ...initial(), hero: { hp: 10, arms: 1, part: 0 } },
      { type: 'assail', id: 4 });
    expect(honour({ game: mid, savedAt: 1 })!.game.fight).toEqual(mid.fight);
    // The pre-strip shape ({site} alone) is not a fight any more — the
    // save survives, the sortie is simply over.
    const old = honour({
      game: { ...initial(), fight: { site: 4 } as never }, savedAt: 1 });
    expect(old).not.toBeNull();
    expect(old!.game.fight).toBeNull();
    expect(old!.game.pop).toBe(initial().pop);
  });

  // ★★ THE DOOR, 2026-08-08 (review findings). A save arrives from the
  // owner's OTHER DEVICE through a paste box — the import is the one place
  // a hand-made object reaches the engine, and it was letting four kinds of
  // nonsense through. Each of these crashed, cheated, or ate the town.
  it('★★ a fight at ground that does not exist is refused, not rendered', () => {
    const mid = apply({ ...initial(), hero: { hp: 10, arms: 1, part: 0 } },
      { type: 'assail', id: 4 });
    // `site: 99` used to pass (an integer is an integer) and the panel's
    // `SITE.get(99)!.name` then threw on first paint — a dead screen.
    const bad = honour({ game: { ...mid,
      fight: { ...mid.fight!, site: 99 } }, savedAt: 1 });
    expect(bad!.game.fight).toBeNull();
    // Site 1 is real ground but was never held: still not a fight.
    expect(honour({ game: { ...mid, fight: { ...mid.fight!, site: 1 } },
      savedAt: 1 })!.game.fight).toBeNull();
  });

  it('★★ a packless fight is refused — no unlimited rations', () => {
    const mid = apply({ ...initial(), food: 99, hero: { hp: 10, arms: 1, part: 0 } },
      { type: 'assail', id: 4 });
    const { packs: _, ...packless } = mid.fight!;
    // `undefined <= 0` is false, so ration() spent it to NaN, and `NaN <= 0`
    // is false forever: the pack ruling was void on every imported save.
    expect(honour({ game: { ...mid, fight: packless as never },
      savedAt: 1 })!.game.fight).toBeNull();
    expect(honour({ game: { ...mid, fight: { ...mid.fight!, packs: 1e9 } },
      savedAt: 1 })!.game.fight).toBeNull();
  });

  it('★★ junk in stacks or paths is refused at the door, not eaten', () => {
    // These used to load, NaN-poison every rate through flow(), and then the
    // NEXT save — carrying NaN stone — was refused: the town died a session
    // later, with nothing on screen to say why.
    expect(honour({ game: { ...initial(), stacks: { 1: 'x' } as never },
      savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), stacks: { 99: 1 } }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), stacks: { 1: 1.5 } }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), paths: { '0|1': 'x' } as never },
      savedAt: 1 })).toBeNull();
    // A path between sites that do not touch is ink no walk can ever reach.
    expect(honour({ game: { ...initial(), paths: { '1|3': 1 } }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), paths: { '1|0': 1 } }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), paths: { '0|1': 9 } }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), goblins: { 1: 5 } }, savedAt: 1 })).toBeNull();
  });

  it('★ hands are WHOLE at the door too — the staffing ruling', () => {
    expect(honour({ game: { ...initial(), crew: { 1: 2.5 } }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), crew: { 1: 2 } }, savedAt: 1 })).not.toBeNull();
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

describe('★★ THE BATTLE STRIP — one square left, three right, the pokes', () => {
  const strike = (g: City): City => apply(g, { type: 'strike' });
  const aim = (g: City, at: number): City => apply(g, { type: 'aim', at });
  const armed = (arms: number, extra: Partial<City> = {}): City =>
    apply({ ...initial(), hero: { hp: 10, arms, part: 0 }, ...extra },
      { type: 'assail', id: 4 });

  it('★ assail fields THE LINE: a wall up front, two biters behind', () => {
    const g = armed(1);
    expect(g.fight).toEqual({ site: 4, target: 0, round: 0, packs: RATION_PACK,
      sq: [{ hp: 6, poke: 1, kind: 'brute' },
        { hp: 3, poke: 2, kind: 'runt' }, { hp: 3, poke: 2, kind: 'runt' }] });
    // The squares carry the whole strength; bled ground fields less wall.
    expect(lineOf(12, 2, 3).reduce((n, q) => n + q.hp, 0)).toBe(12);
    expect(lineOf(5, 2, 3)).toEqual([
      { hp: 1, poke: 1, kind: 'brute' },
      { hp: 2, poke: 2, kind: 'runt' }, { hp: 2, poke: 2, kind: 'runt' }]);
    expect(lineOf(1, 2, 3)[1]!.poke).toBe(0);   // no runts, no bite
  });

  it('★ aim is free — pick a square, no answer comes', () => {
    const g = aim(armed(1), 1);
    expect(g.fight!.target).toBe(1);
    expect(g.fight!.round).toBe(0);
    expect(g.hero.hp).toBe(10);
    expect(aim(g, 1)).toBe(g);              // same square: no-op
    expect(aim(g, 9)).toBe(g);              // no such square
    const thinned = strike(aim(armed(1), 1));
    expect(aim(thinned, 1)).toBe(thinned);  // dead square: refused
  });

  it('★★ a strike lands on the TARGET and every living square answers', () => {
    let g = aim(armed(1), 1);
    g = strike(g);                    // hit 3 kills the 3-hp runt whole
    expect(g.fight!.sq[1]!.hp).toBe(0);
    expect(g.hero.hp).toBe(10 - (1 + 2));   // wall pokes 1, live runt 2
    g = strike(aim(g, 2));                  // second runt down
    expect(g.hero.hp).toBe(7 - 1);          // only the wall still pokes
  });

  it('★ a dead target passes the blow to the first square standing', () => {
    let g = strike(aim(armed(1), 1));
    g = strike(g);                    // target 1 is dead: the wall takes it
    expect(g.fight!.sq[0]!.hp).toBe(3);
    expect(g.fight!.target).toBe(0);
  });

  it('★★ every third answer is a WIND-UP: double bite, said a round ahead', () => {
    expect(windup(0)).toBe(false);
    expect(windup(WINDUP_EVERY - 1)).toBe(true);
    let g = strike(aim(armed(1), 1));         // answer 1: 3
    g = strike(aim(g, 2));                    // answer 2: 1
    expect(windup(g.fight!.round)).toBe(true);
    g = strike(g);                            // answer 3: wall 1, DOUBLED
    expect(g.hero.hp).toBe(10 - 3 - 1 - 2);
  });

  it('★ guard blocks the answer whole and spends the round', () => {
    let g = strike(aim(armed(1), 1));
    g = strike(aim(g, 2));
    const before = g.hero.hp;
    g = apply(g, { type: 'guard' });          // the wind-up hits a shield
    expect(g.hero.hp).toBe(before);
    expect(g.fight!.round).toBe(3);
    expect(g.fight!.sq[0]!.hp).toBe(6);       // and dealt nothing
  });

  it('★ rations: 3 food for 4 health, from a pack — capped, answered, finite', () => {
    const mid: City = { ...initial(), food: 99,
      hero: { hp: 8, arms: 1, part: 0 },
      fight: { site: 4, sq: lineOf(12, 2, 3), target: 0, round: 0, packs: 1 } };
    const g = apply(mid, { type: 'ration' });
    expect(g.food).toBe(99 - RATION_FOOD);
    // 8+4 caps at the max of 10 — then the full answer of 5 lands.
    expect(g.hero.hp).toBe(10 - 5);
    expect(g.fight!.packs).toBe(0);
    expect(apply(g, { type: 'ration' })).toBe(g);          // pack empty
    const broke: City = { ...mid, food: 1 };
    expect(apply(broke, { type: 'ration' })).toBe(broke);  // larder empty
    expect(armed(1).fight!.packs).toBe(RATION_PACK);       // stocked at the gate
  });

  it('★★ FIGHT ONE, played readably at Arms ×1: thin the runts, win at 4', () => {
    let g = armed(1);
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'aim', at: 2 }, { type: 'strike' },
      { type: 'strike' }, { type: 'strike' }] as const) g = apply(g, a);
    // ★ LIBERATED: goblins gone, captives home, the ground takes works.
    expect(g.goblins[4]).toBeUndefined();
    expect(g.fight).toBeNull();
    expect(g.pop).toBe(initial().pop + CAPTIVES);
    expect(g.hero.hp).toBe(4);
    expect(unraisable({ ...g, stone: 99 }, 4)).toBe('no path reaches here');
    expect(unraisable({ ...g, stone: 99, paths: { [pathKey(0, 4)]: 1 } }, 4)).toBeNull();
  });

  it('★★ MASH-ATTACK loses the same fight: wail on the wall, the runts eat you', () => {
    let g = armed(1);
    for (let i = 0; i < 9 && g.fight; i++) g = strike(g);
    // Wall first (2 strikes, full pokes), then one runt — and the third
    // answer is the wind-up: 4 through a hero on 1. Beaten home.
    expect(g.fight).toBeNull();
    expect(g.hero.hp).toBe(0);
    expect(g.goblins[4]).toBe(3);             // the ground keeps its wounds
  });

  it('★ bare hands lose even played well — Arms ×1 is fight one\'s gate', () => {
    let g = armed(0);
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'strike' }, { type: 'guard' },
      { type: 'aim', at: 2 }, { type: 'strike' }] as const) g = apply(g, a);
    expect(g.fight).toBeNull();               // the fourth answer ends it
    expect(g.hero.hp).toBe(0);
    expect(g.goblins[4]).toBe(6 + 1);         // wall whole, runt bled
  });

  it('★ FIGHT TWO holds the +2 cadence: Arms ×2 wins the slope read right', () => {
    const { 4: _, ...rest } = initial().goblins;
    let g: City = { ...initial(), goblins: rest,
      hero: { hp: 13, arms: 2, part: 0 } };
    g = apply(g, { type: 'assail', id: 5 });
    expect(g.fight!.sq).toEqual([{ hp: 10, poke: 1, kind: 'brute' },
      { hp: 4, poke: 3, kind: 'runt' }, { hp: 4, poke: 3, kind: 'runt' }]);
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'aim', at: 2 }, { type: 'strike' }, { type: 'strike' },
      { type: 'strike' }, { type: 'strike' }] as const) g = apply(g, a);
    expect(g.goblins[5]).toBeUndefined();
    expect(g.hero.hp).toBe(5);
  });

  it('★ beaten home and fall back both leave the squares\' wounds on the ground', () => {
    let g = strike(aim(armed(1), 1));         // runt 1 dead, hp 7
    g = strike(g);                            // wall 6 → 3, hp 7-3=4
    const fled = apply(g, { type: 'flee' });
    expect(fled.fight).toBeNull();
    expect(fled.goblins[4]).toBe(3 + 0 + 3);  // wall 3, runts 0 and 3
    expect(fled.hero.hp).toBe(4);             // wounds walk home too
  });

  it('★ goblins regroup while unengaged — never mid-fight, never past spawn', () => {
    const bled: City = { ...initial(), goblins: { ...initial().goblins, 4: 2 } };
    expect(tick(bled, 100).goblins[4]).toBeCloseTo(2 + regenOf(4) * 100, 6);
    expect(tick(bled, 9999).goblins[4]).toBe(12);          // capped at spawn
    const fighting = apply({ ...bled, goblins: { ...bled.goblins, 4: 2 } },
      { type: 'assail', id: 4 });
    expect(tick(fighting, 100).goblins[4]).toBe(2);        // pinned by the fight
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
    const hurt: City = { ...initial(), hero: { hp: 3, arms: 0, part: 0 } };
    expect(unassailable(hurt, 4)).toMatch(/^the hero heals — 3 of 10/);
  });

  it('no healing mid-fight — the wound is the fight\'s clock', () => {
    let g = strike(armed(1));
    expect(g.hero.hp).toBe(5);        // full line answers a wall-strike
    g = tick(g, 300);
    expect(g.hero.hp).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE LADDER SOLVER — the check `engine.ts` cites. It was written to tune
// the strip, run as a scratch file, and NOT COMMITTED, while the constant it
// justified kept pointing at it. The review caught the phantom citation
// (CLAUDE.md rule 4 is about exactly this), so it lives here now and runs on
// every push. It plays each rung EXHAUSTIVELY — every aim, every guard, every
// ration, memoised — and asks what PERFECT play achieves.
// ---------------------------------------------------------------------------
describe('★★★ THE LADDER HOLDS — solved, not felt', () => {
  /** Best hp the hero can walk away with, or -1 if the fight cannot be won
   *  by ANY line of play. Memoised on the whole fight position. */
  function solve(start: City): number {
    const memo = new Map<string, number>();
    const site = start.fight!.site;
    const best = (g: City): number => {
      if (!g.fight) return g.goblins[site] === undefined ? g.hero.hp : -1;
      const f = g.fight;
      const key = `${f.sq.map((q) => q.hp)}|${g.hero.hp}|${f.round % WINDUP_EVERY}`
        + `|${f.packs}|${Math.floor(g.food)}`;
      const got = memo.get(key);
      if (got !== undefined) return got;
      memo.set(key, -1);          // a revisited position is never an improvement
      let top = -1;
      for (let i = 0; i < 3; i++) {
        if ((f.sq[i]?.hp ?? 0) <= 0) continue;
        const aimed = f.target === i ? g : apply(g, { type: 'aim', at: i });
        top = Math.max(top, best(apply(aimed, { type: 'strike' })));
      }
      if (f.packs > 0 && g.food >= RATION_FOOD) {
        top = Math.max(top, best(apply(g, { type: 'ration' })));
      }
      top = Math.max(top, best(apply(g, { type: 'guard' })));
      memo.set(key, top);
      return top;
    };
    return best(start);
  }

  /** The rung: every earlier ground freed, the hero full, the larder deep. */
  const rung = (site: number, arms: number): City => {
    const order = [4, 5, 6, 7, 8, 9];
    const goblins: Record<number, number> = {};
    for (const s of order.slice(order.indexOf(site))) goblins[s] = GOBLINS[s]!.strength;
    const base: City = { ...initial(), goblins, food: 99 };
    return apply({ ...base, hero: { hp: heroMax(base), arms, part: 0 } },
      { type: 'assail', id: site });
  };

  /** Mash-attack: never aim, never guard, never eat. */
  const mash = (g: City): City => {
    let s = g;
    for (let i = 0; i < 200 && s.fight; i++) s = apply(s, { type: 'strike' });
    return s;
  };

  // ★ THE ARMS GATE, the whole design in one table: the ladder's own arms
  // win it, one tier under LOSES however well you play, and mashing loses
  // even fully armed. Change a goblin number and this is what shouts.
  const LADDER: Array<[site: number, arms: number]> =
    [[4, 1], [5, 2], [6, 4], [7, 6], [8, 8], [9, 10]];

  for (const [site, arms] of LADDER) {
    it(`★ ${SITE.get(site)!.name}: Arms ×${arms} wins it read right`, () => {
      expect(solve(rung(site, arms))).toBeGreaterThan(0);
    });

    it(`★★ ${SITE.get(site)!.name}: Arms ×${arms - 1} cannot win it AT ALL`, () => {
      expect(solve(rung(site, arms - 1))).toBe(-1);
    });

    it(`★★ ${SITE.get(site)!.name}: mash-attack loses at Arms ×${arms}`, () => {
      expect(mash(rung(site, arms)).goblins[site]).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// ★★ THE GRIND, PRICED — the review's finding: a flat regen made
// chip-flee-heal-repeat PAY at the deep rungs, because a sortie's damage
// grows with arms and the wound's price did not. Regen is a fraction of
// SPAWN now, so no holding can be ground down one rung under its gate.
// ---------------------------------------------------------------------------
describe('★★ THE FLEE-REGROUP GRIND PAYS NOTHING, at every rung', () => {
  /** One cycle at `arms`: fight until beaten home or won, then heal all the
   *  way back while the ground regroups. Net strength removed, per cycle. */
  const cycle = (site: number, arms: number): number => {
    const order = [4, 5, 6, 7, 8, 9];
    const goblins: Record<number, number> = {};
    for (const s of order.slice(order.indexOf(site))) goblins[s] = GOBLINS[s]!.strength;
    const base: City = { ...initial(), goblins, food: 0 };
    const max = heroMax(base);
    let g = apply({ ...base, hero: { hp: max, arms, part: 0 } },
      { type: 'assail', id: site });
    const before = g.fight!.sq.reduce((n, q) => n + q.hp, 0);
    // The grinder's best sortie: always hit the softest live square, and
    // break off the moment the next answer would beat them home.
    for (let i = 0; i < 200 && g.fight; i++) {
      const f = g.fight;
      const live = f.sq.map((q, at) => ({ ...q, at })).filter((q) => q.hp > 0);
      const answer = live.reduce((n, q) => n + q.poke, 0) * (windup(f.round) ? 2 : 1);
      if (answer >= g.hero.hp) { g = apply(g, { type: 'flee' }); break; }
      const soft = live.reduce((a, b) => (a.hp <= b.hp ? a : b));
      g = apply(apply(g, { type: 'aim', at: soft.at }), { type: 'strike' });
    }
    const bled = g.goblins[site] ?? 0;
    if (bled === 0) return before;                 // took it outright
    // Heal to full at home; the ground regroups the whole time.
    const heal = (max - g.hero.hp) * HEAL_SECS;
    return before - Math.min(GOBLINS[site]!.strength, bled + regenOf(site) * heal);
  };

  it('★★ one rung under the gate, every holding out-heals the grinder', () => {
    for (const [site, arms] of [[4, 1], [5, 2], [6, 4], [7, 6], [8, 8], [9, 10]] as const) {
      // ⚠️ THE OLD FLAT 0.05 PAID +0.75, +2.50 and +4.25 a cycle at 7, 8, 9.
      expect(cycle(site, arms - 1),
        `site ${site} at Arms ×${arms - 1} grinds ${cycle(site, arms - 1)} a cycle`)
        .toBeLessThanOrEqual(0);
    }
  });

  it('★ regen is a share of the holding\'s own spawn, not a flat rate', () => {
    expect(regenOf(4)).toBeCloseTo(GOBLINS[4]!.strength * GOBLIN_REGEN, 9);
    expect(regenOf(9)).toBeGreaterThan(regenOf(4));
    // Fight one is barely touched: the tutorial's pace is the old pace.
    expect(regenOf(4)).toBeCloseTo(0.048, 6);
  });
});

// ---------------------------------------------------------------------------
// ★★ THE POCKET TIME OBEYS THE SAME RULES AS THE LIVE ONE (review finding).
// A single twelve-hour Euler step read the town once and billed the night at
// that reading. The away run is chunked now.
// ---------------------------------------------------------------------------
describe('★★ THE AWAY RUN — simulated, not estimated', () => {
  it('★★ a town with huts and NO BREAD does not grow overnight', () => {
    // Huts for 22, two people, an empty larder and no farm. Live play stalls
    // at the wild's table; the old one-step away tick grew the whole town
    // because `pop < WILD_FED` and `hunger()` were read once, at second zero.
    const cold: City = { ...initial(), stacks: { 0: 5 }, pop: 2, food: 0 };
    expect(popCap(cold)).toBeGreaterThan(WILD_FED);
    expect(catchUp(cold, 12 * 3600).pop).toBe(WILD_FED);
    // ★ AND AT ANY STEP SIZE — the ceiling is a rule of the tick, not of the
    // chunking, so one enormous step obeys it too. (Before the fix this
    // returned 22: the town filled its huts on an empty larder overnight.)
    expect(tick(cold, 12 * 3600).pop).toBe(WILD_FED);
    // Bread, and the same night fills the huts.
    expect(catchUp({ ...cold, food: 9e5 }, 12 * 3600).pop).toBe(popCap(cold));
  });

  it('★ a path two seconds from done carries for the rest of the night', () => {
    const laying: City = { ...initial(), stacks: { 1: 1 }, pop: 4, food: 99,
      laying: { [pathKey(0, 1)]: { left: 2, secs: PATH_SECS } } };
    const away = catchUp(laying, 3600);
    expect(away.paths[pathKey(0, 1)]).toBe(1);
    // An hour of quarrying landed — up to the storehouse ceiling, which is
    // what an hour of that quarry now means.
    expect(away.stone).toBe(roomOf(laying));
    // The single step lays the path at the END and carries nothing at all.
    expect(tick(laying, 3600).stone).toBe(0);
  });

  it('the chunking is invisible where nothing changes across the span', () => {
    // No huts, no growth, one quarry: chunked and whole agree to the penny.
    const flat: City = { ...initial(), stacks: { 1: 1 }, pop: 4, food: 0,
      paths: { [pathKey(0, 1)]: 1 } };
    expect(catchUp(flat, STEP_SECS * 4).stone)
      .toBeCloseTo(tick(flat, STEP_SECS * 4).stone, 6);
  });
});

// ---------------------------------------------------------------------------
// ★★ WHICH WAY THE CARRIERS WALK (review finding). The view used to guess
// direction from site-id order, so on the mesh's own showpiece — logs going
// OUT to a mill that sits at a higher id — the porters walked away from the
// goods. The owner's rule: "the dots going through the paths should
// correspond to the resources flowing there."
// ---------------------------------------------------------------------------
describe('★★ THE CARRIERS FOLLOW THE FLOW, not the id order', () => {
  it('★★ logs walk OUT to the mill; planks walk back to the camp', () => {
    // Pines(2) wired straight to the river mill(3), mill wired to camp(0).
    const g: City = { ...initial(), pop: 99, food: 999,
      stacks: { 2: 1, 3: 1 },
      paths: { [pathKey(2, 3)]: 3, [pathKey(0, 3)]: 3 } };
    const f = flow(g);
    // pathKey(2,3) is "2|3": +1 means 2 → 3, which is pines → mill. The old
    // id-order guess said -1 here, and the carriers walked mill → pines.
    expect(f.dirs.get(pathKey(2, 3))).toBe(1);
    // pathKey(0,3) is "0|3": planks run mill → camp, so 3 → 0, which is -1.
    expect(f.dirs.get(pathKey(0, 3))).toBe(-1);
  });

  it('★ stone walks to the camp whichever end the quarry is', () => {
    const f = flow(quarried(1, 1));
    expect(f.dirs.get(pathKey(0, 1))).toBe(-1);      // 1 → 0
  });

  it('a path carrying nothing has no direction at all', () => {
    const idle: City = { ...initial(), pop: 99, food: 999,
      stacks: {}, paths: { [pathKey(0, 1)]: 1 } };
    expect(flow(idle).dirs.has(pathKey(0, 1))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ★★★ MAKING GROUND WORTH TAKING, 2026-08-08. The owner: *"no reason to have
// a site protected by goblins where you can build a quarry because you have
// unlimited defenceless quarries you can build near start."* Two answers, and
// these tests are both of them: held ground is RICHER, and the two gates each
// carry their own road home — a thing no amount of building at Rock Face buys.
// ---------------------------------------------------------------------------
describe('★★★ WHY TAKE THE GROUND — richness, and the second road home', () => {
  it('★ the ground itself multiplies every hand posted on it', () => {
    expect(richOf(1)).toBe(1);            // Rock Face, safe and plain
    expect(richOf(6)).toBe(2);            // Goblin Knoll
    expect(richOf(8)).toBe(3);            // High Quarry, rung five
    expect(richOf(9)).toBe(3.5);          // Green Vale, the last holding
    // Same hands, same works, better ground: three times the stone.
    const plain: City = { ...initial(), pop: 99, food: 999, goblins: {},
      stacks: { 1: 1 }, paths: { [pathKey(0, 1)]: 3 } };
    const deep: City = { ...initial(), pop: 99, food: 999, goblins: {},
      stacks: { 8: 1 }, paths: { [pathKey(0, 5)]: 3, [pathKey(5, 8)]: 3 } };
    expect(flow(plain).made.get(1)).toBeCloseTo(CREW * RATE.quarry, 9);
    expect(flow(deep).made.get(8)).toBeCloseTo(CREW * RATE.quarry * 3, 9);
  });

  it('★★ a ×M site is worth a PERMANENT head start of ln(M)/ln(1.35) copies', () => {
    // The whole economic claim, checked rather than asserted: the High
    // Quarry's FIRST pit out-produces Rock Face's fourth, and it cost less.
    // ONE pit on ×3 ground makes exactly what THREE plain pits make...
    const rich1 = CREW * RATE.quarry * richOf(8);
    expect(rich1).toBeCloseTo(3 * CREW * RATE.quarry, 9);
    // ...but it is bought at the price of copy #1, not copies #1-3, and the
    // curve is what makes that a permanent lead rather than a one-off.
    const oneRich = costOf('quarry', 0).stone!;
    const threePlain = costOf('quarry', 0).stone! + costOf('quarry', 1).stone!
      + costOf('quarry', 2).stone!;
    expect(oneRich).toBeLessThan(threePlain / 2);
    // The lead in COPIES is the log ratio — ~3.7 for x3, forever, because
    // both sites go on climbing the same 1.35.
    const head = Math.log(richOf(8)) / Math.log(1.35);
    expect(head).toBeGreaterThan(3.6);
    expect(head).toBeLessThan(3.7);
  });

  it('★★★ THE TWO GATES CARRY THEIR OWN ROAD HOME', () => {
    // Every mouthful of food in the game used to cross `0|4`, and every
    // eastern good crossed `0|3` beside the mill's planks. The Knoll and the
    // Scree each touch the camp directly — that is what the fight buys.
    expect(SITE.get(6)!.near).toContain(0);
    expect(SITE.get(5)!.near).toContain(0);
    // Symmetric, so the camp knows about them too.
    expect(SITE.get(0)!.near).toEqual(expect.arrayContaining([5, 6]));
    // But the road cannot be laid while the goblins stand on it.
    expect(unlayable({ ...initial(), stone: 99 }, 0, 6))
      .toMatch(/^dangerous — goblins/);
  });

  it('★★★ THE FOOD ARTERY DOUBLES when the knoll falls — the 66-pop wall', () => {
    // The wall, measured: all food over one 3.0/s edge feeds 6 + 3.0/EAT.
    const oneEdge = MAX_GAUGE * CARRY;
    expect(WILD_FED + oneEdge / EAT).toBe(66);
    // Both farms, deep country freed, EVERY path at full gauge — but no
    // road from the knoll to the camp: the south still files through `0|4`.
    const viaMeadow: City = { ...initial(), pop: 99, food: 999, goblins: {},
      // Enough field at BOTH ends to saturate whatever road it is given.
      stacks: { 4: 5, 9: 3 },
      paths: { [pathKey(0, 4)]: 3, [pathKey(4, 6)]: 3, [pathKey(6, 7)]: 3,
        [pathKey(7, 9)]: 3 } };
    expect(flow(viaMeadow).food).toBeCloseTo(oneEdge, 6);      // capped at 3.0
    expect(flow(viaMeadow).choked.has(pathKey(0, 4))).toBe(true);
    // Now lay the knoll's own road. The deep country reroutes down it and
    // the two arteries carry together.
    const viaBoth: City = { ...viaMeadow,
      paths: { ...viaMeadow.paths, [pathKey(0, 6)]: 3 } };
    expect(flow(viaBoth).food).toBeGreaterThan(oneEdge + 1e-6);
    expect(flow(viaBoth).food).toBeCloseTo(2 * oneEdge, 6);
    // ★ Which is the wall moving from 66 people to 126.
    expect(WILD_FED + 2 * oneEdge / EAT).toBe(126);
  });

  it('★★ the scree carries the east so the mill keeps its planks', () => {
    // Site 8's stone used to file down `0|3` behind the sawmill's output.
    const g: City = { ...initial(), pop: 99, food: 999, goblins: {},
      stacks: { 2: 1, 3: 3, 8: 2 },
      paths: { [pathKey(0, 2)]: 3, [pathKey(0, 3)]: 3, [pathKey(3, 5)]: 3,
        [pathKey(5, 8)]: 3 } };
    expect(flow(g).choked.has(pathKey(0, 3))).toBe(true);
    // The scree's own road takes the stone off the mill's back.
    const open = flow({ ...g, paths: { ...g.paths, [pathKey(0, 5)]: 3 } });
    expect(open.choked.has(pathKey(0, 3))).toBe(false);
    expect(open.stone).toBeGreaterThan(flow(g).stone);
    expect(open.planks).toBeGreaterThan(flow(g).planks);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE STOREHOUSE, 2026-08-08 — the owner: *"we'd need to do some storage
// capacity."* Every good is capped and the overflow is WASTE, which is the
// law the paths already obey. It is also the answer to the review's "stone
// is infinite by round two and buys nothing".
// ---------------------------------------------------------------------------
describe('★★★ THE STOREHOUSE — a ceiling on every good', () => {
  const rich = (over: Partial<City> = {}): City => ({
    ...initial(), pop: 99, food: 999, goblins: {},
    stacks: { 1: 4 }, paths: { [pathKey(0, 1)]: 3 }, ...over });

  it('★ a bare camp holds STORE_BASE of each; each house adds a flat room', () => {
    expect(roomOf(initial())).toBe(STORE_BASE);
    expect(roomOf({ ...initial(), store: 1 })).toBe(STORE_BASE + STORE_ROOM);
    expect(roomOf({ ...initial(), store: 4 })).toBe(STORE_BASE + 4 * STORE_ROOM);
  });

  it('★★ a full store WASTES what arrives — the paths\' own law', () => {
    // Four crewed quarries make 2.4/s into a 3.0/s path: nothing choked,
    // and yet the stock stops dead at the ceiling.
    const g = tick(rich({ stone: STORE_BASE - 1 }), 60);
    expect(g.stone).toBe(STORE_BASE);
    // A second minute adds nothing at all.
    expect(tick(g, 60).stone).toBe(STORE_BASE);
    // Raise a storehouse and the same town climbs again.
    const roomier = tick({ ...g, store: 1 }, 60);
    expect(roomier.stone).toBeGreaterThan(STORE_BASE);
  });

  it('★ every good has its own ceiling, not a shared purse', () => {
    const full: City = { ...initial(), pop: 99, food: 999, goblins: {},
      stone: STORE_BASE, logs: STORE_BASE, planks: STORE_BASE,
      stacks: { 1: 2, 2: 2, 3: 2 },
      paths: { [pathKey(0, 1)]: 3, [pathKey(0, 2)]: 3, [pathKey(0, 3)]: 3 } };
    const on = tick(full, 60);
    expect(on.stone).toBe(STORE_BASE);
    expect(on.planks).toBe(STORE_BASE);
    expect(on.logs).toBeLessThanOrEqual(STORE_BASE);
  });

  it('★ a stock ALREADY over the ceiling is held, never confiscated', () => {
    // Tearing a storehouse down is not a thing, but an imported save or a
    // retune could land here. The rule: it cannot GROW, it does not vanish.
    const over = tick(rich({ stone: STORE_BASE * 3 }), 60);
    expect(over.stone).toBe(STORE_BASE * 3);
  });

  it('★★ storehouses cost stone AND planks, so they race the huts', () => {
    expect(storeCost(0)).toEqual({ stone: 25, planks: 15 });
    expect(storeCost(3).stone).toBe(Math.ceil(25 * 1.3 ** 3));
    const g = apply({ ...initial(), stone: 40, planks: 20 }, { type: 'stow' });
    expect(g.store).toBe(1);
    expect(g.stone).toBe(15);
    expect(g.planks).toBe(5);
    expect(roomOf(g)).toBe(STORE_BASE + STORE_ROOM);
    const broke = initial();
    expect(apply(broke, { type: 'stow' })).toBe(broke);
  });

  it('★★★ THE CAP GATES WHAT YOU CAN SAVE FOR — the point of the building', () => {
    // Arms ×9 (66 stone) and Hut #15 (71 planks) both cost more than a
    // bare camp can HOLD, so the storehouse is not a nicety: it stands
    // between the town and the top of either ladder.
    expect(armsCost(8).stone).toBeGreaterThan(STORE_BASE);
    expect(costOf('hut', 14).planks!).toBeGreaterThan(STORE_BASE);
    // The rungs BELOW them fit in a bare camp, so nothing is walled early
    // — the first eight swords and a dozen huts never see the ceiling.
    expect(armsCost(7).stone).toBeLessThanOrEqual(STORE_BASE);
    expect(costOf('hut', 12).planks!).toBeLessThan(STORE_BASE);
    // And one house clears both, with the last sword (85) inside it.
    expect(armsCost(9).stone).toBeLessThan(STORE_BASE + STORE_ROOM);
    expect(costOf('hut', 14).planks!).toBeLessThan(STORE_BASE + STORE_ROOM);
  });

  it('★★ the pocket time fills the store and spills the rest', () => {
    // The review: "6468 stone by round two, and it buys nothing." Twelve
    // hours now bank a storehouse's worth, not a mountain.
    const away = catchUp(rich(), 12 * 3600);
    expect(away.stone).toBe(STORE_BASE);
    expect(catchUp(rich({ store: 2 }), 12 * 3600).stone)
      .toBe(STORE_BASE + 2 * STORE_ROOM);
  });

  it('a storehouse count is whole at the save door', () => {
    expect(honour({ game: { ...initial(), store: 2 }, savedAt: 1 })).not.toBeNull();
    expect(honour({ game: { ...initial(), store: 1.5 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), store: -1 }, savedAt: 1 })).toBeNull();
    // An old save with no storehouses at all loads at zero.
    const { store: _, ...old } = initial();
    expect(honour({ game: old as never, savedAt: 1 })!.game.store).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE CARTWRIGHT, 2026-08-08 — the coherence review's top finding: every
// exponential in this engine runs AGAINST the player. This is the one that
// runs for them, and it runs on the GRAPH, because the graph is where a
// finished town's work was being thrown away.
// ---------------------------------------------------------------------------
describe('★★★ THE CARTWRIGHT — the one exponential that runs for the player', () => {
  /** A finished town: every site stacked, every path at MAX_GAUGE, full pop. */
  const maxed = (carts: number): City => {
    const g: City = { ...initial(), goblins: {}, food: 9e5, stone: 9e5,
      planks: 9e5, logs: 9e5, carts, stacks: {}, paths: {} };
    for (const s of SITES) g.stacks[s.id] = s.id === 0 ? 40 : 8;
    for (const s of SITES) for (const n of s.near) g.paths[pathKey(s.id, n)] = MAX_GAUGE;
    return { ...g, pop: popCap(g) };
  };
  const totals = (g: City): { made: number; carried: number } => {
    const f = flow(g);
    let made = 0, carried = 0;
    for (const s of SITES) {
      if (s.id === 0) continue;
      made += f.made.get(s.id) ?? 0;
      carried += f.carried.get(s.id) ?? 0;
    }
    return { made, carried };
  };

  it('★★★ THE MEASUREMENT THAT CHOSE THE DESIGN — a maxed town wastes most of its work', () => {
    // This is why the backlog's "multiply RATE.quarry" would have been a
    // no-op: at MAX_GAUGE on every path, a finished town already throws
    // away three quarters of what it makes. Multiplying production
    // multiplies the waste. If this ever stops being true, the cartwright
    // is aimed at the wrong wall and this test is the alarm.
    const { made, carried } = totals(maxed(0));
    expect(made).toBeGreaterThan(50);
    expect(carried).toBeLessThan(made * 0.3);
  });

  it('★★ a cart rung raises what EVERY path carries', () => {
    const g = maxed(0);
    const key = pathKey(0, 4);
    expect(carriesOf(g, key)).toBeCloseTo(MAX_GAUGE * CARRY, 9);
    expect(carriesOf({ ...g, carts: 1 }, key))
      .toBeCloseTo(MAX_GAUGE * CARRY * CART_GAIN, 9);
    expect(carriesOf({ ...g, carts: 3 }, key))
      .toBeCloseTo(MAX_GAUGE * CARRY * CART_GAIN ** 3, 9);
    // A path that is not laid carries nothing, carts or no carts. (1 and 9
    // are not neighbours, so this key is not in `paths` at all.)
    expect(carriesOf({ ...g, carts: 9 }, pathKey(1, 9))).toBe(0);
  });

  it('★★★ EVERY RUNG BUYS REAL INCOME, and the ladder compounds', () => {
    // Measured, not asserted in the abstract: 13.9/s at no carts climbing
    // past 48/s at eight, every single rung strictly better than the last.
    let last = 0;
    for (let c = 0; c <= 8; c++) {
      const now = totals(maxed(c)).carried;
      expect(now).toBeGreaterThan(last);
      last = now;
    }
    expect(totals(maxed(0)).carried).toBeGreaterThan(13);
    expect(totals(maxed(8)).carried).toBeGreaterThan(totals(maxed(0)).carried * 3);
  });

  it('★★ it can never carry MORE than the town makes — it opens a wall, it does not mint', () => {
    // The one way a throughput multiplier could become a cheat.
    for (const c of [0, 4, 12, 40]) {
      const { made, carried } = totals(maxed(c));
      expect(carried).toBeLessThanOrEqual(made + 1e-6);
    }
    // And at absurd carts the town delivers everything it makes, no more.
    expect(totals(maxed(40)).carried).toBeCloseTo(totals(maxed(40)).made, 4);
  });

  it('★ carts run out on a given town — they leapfrog with the works', () => {
    // A finite, findable number of rungs un-chokes a maxed town; past that
    // a cart buys nothing until more works are built. That is the pair of
    // ladders, working — and it is why the cartwright's deed is offered
    // only while something is actually being wasted.
    let enough = -1;
    for (let c = 0; c <= 40 && enough < 0; c++) {
      if (flow(maxed(c)).choked.size === 0) enough = c;
    }
    expect(enough).toBeGreaterThan(0);
    expect(enough).toBeLessThan(20);
    // At that rung the town delivers everything it makes...
    const { made, carried } = totals(maxed(enough));
    expect(carried).toBeCloseTo(made, 4);
    // ...and three times the works chokes the same carts all over again.
    const bigger: City = { ...maxed(enough), stacks: { ...maxed(enough).stacks } };
    for (const s of SITES) if (s.id !== 0) bigger.stacks[s.id] = 24;
    expect(flow({ ...bigger, pop: popCap(bigger) }).choked.size).toBeGreaterThan(0);
  });

  it('★★ cost is steeper than the gain, so a rung is earned', () => {
    expect(cartCost(0)).toEqual({ stone: 30, planks: 20 });
    expect(cartCost(4).stone).toBe(Math.ceil(30 * 1.55 ** 4));
    // 1.55 against a 1.3 haul: the ladder slows, it never stops.
    expect(1.55).toBeGreaterThan(CART_GAIN);
    const g = apply({ ...initial(), stone: 50, planks: 30 }, { type: 'cart' });
    expect(g.carts).toBe(1);
    expect(g.stone).toBe(20);
    expect(g.planks).toBe(10);
    const broke = initial();
    expect(apply(broke, { type: 'cart' })).toBe(broke);
  });

  it('a cart count is whole at the save door, and old saves load at none', () => {
    expect(honour({ game: { ...initial(), carts: 3 }, savedAt: 1 })).not.toBeNull();
    expect(honour({ game: { ...initial(), carts: 2.5 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), carts: -1 }, savedAt: 1 })).toBeNull();
    const { carts: _, ...old } = initial();
    expect(honour({ game: old as never, savedAt: 1 })!.game.carts).toBe(0);
  });
});
