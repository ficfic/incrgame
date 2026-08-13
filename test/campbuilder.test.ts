// THE CITY ON THE GRAPH — slice 2, 2026-08-08. docs/CITY.md is the design;
// these tests are its five rules made law: counts with a compounding curve,
// people as the multiplier, paths as throughput with WASTE, pop unlocks.
//
// ---- PROVEN RED, 2026-08-08 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { held } from '../src/camp/barrier';
import { apply, initial, flow, shown, popCap, pathKey, costOf, pathCostOf, heroMax,
  unlayable, unraisable, unassailable, component, heroHit, spearCost, hunger,
  RATE, BASE, HUT_ROOM, GROW_SECS, CARRY, SITES, GOBLINS, CREW, GOBLIN_REGEN,
  roomToGrow, jobsOf,
  START_STONE, START_LOGS, BUILD_SECS, raisingLeft, buildSecs, housed,
  PATH_COST, PATH_SECS, lineOf, windup, WINDUP_EVERY, regenOf, catchUp, STEP_SECS, SITE,
  richOf, MAX_GAUGE, roomOf, storeCost, STORE_BASE, STORE_ROOM,
  carriesOf, cartCost, cartHaul, CART_GAIN,
  raiders, raidTarget, RAID_SECS, CAMP_ROOM,
  FORAGE_SECS, FORAYS, nextForay, unforageable, faminePinch, START_FOOD, FAMINE_DEEP, onWatch,
  WALK_SECS, marchSecs, legsBetween, unmarchable, AMBUSH_TELL, MUSTER_SHOWS,
  walkSecs, ROUGH, SWEEP_SHARE, GUARD_STOP, guardsAt, STOW_SECS, hireCost, unhireable,
  LEAVE_SECS, GROW_STORE, LOG_KEEP, logged, swellOf, spawnOf, SWELL_SECS, SWELL_MAX,
  MEETS, meetFor, LEVY_HP, MEND_SECS, levied, levyCap,
  RATION_FOOD, RATION_HP, RATION_PACK,
  BLOW_SECS, blowLeft, SPEAR_NAME, SPEAR_MADE, spearLabel,
  HERO_HP, HEAL_SECS, WILD_FED, EAT, CAPTIVES,
  type City, type Action } from '../src/camp/engine';
import { honour } from '../src/camp/store';

const tick = (g: City, secs: number): City => apply(g, { type: 'tick', secs });

/** ★★★ A BLOW TAKES SECONDS NOW, 2026-08-10 — `strike`/`guard`/`ration` are
 *  ORDERED and land BLOW_SECS later on the tick (engine: BLOW_SECS). So every
 *  fight in this file orders the act and then runs the clock out.
 *
 *  ⚠️ THE CLOCK CANNOT CHANGE THE ANSWER, which is why the fights below still
 *  prove what they always proved: every fight fixture is a town of 2 with no
 *  huts (pop = cap, so nobody grows), no works (nothing is made), pop below
 *  WILD_FED (nothing is eaten), `taken` 0 (nobody raids), and the engaged
 *  holding cannot regroup while the hero stands on it. The seconds pass and
 *  the valley is exactly as it was — the only thing that moves is the swing. */
const settle = (g: City): City =>
  g.fight?.blow ? tick(g, g.fight.blow.left) : g;
/** Order an act and let it land — one whole beat of a fight. */
const beat = (g: City, a: Action): City => settle(apply(g, a));

/** ★★ ROOF ENOUGH FOR `pop`, 2026-08-10 — huts at the camp for a fixture that
 *  wants hands. ONLY THE HOUSED WORK now (the playtest's item E), so a town
 *  of 99 with no huts is a town of TWO workers and 97 people standing in the
 *  rain. Every fixture below that wants a full crew has to pay for bunks;
 *  where a fixture is about something else entirely, it is left alone and
 *  its people are simply the two that fit. */
const huts = (pop: number): number => Math.max(0, Math.ceil((pop - 2) / HUT_ROOM));

/** A quarry chain: n copies at the rock face, pathed at the given gauge. */
// Fixtures carry a stocked larder: 99 people un-fed would be a famine,
// and these blocks are about rules 1-3, not rule starving.
const quarried = (n: number, gauge = 1, pop = 99): City => ({
  ...initial(), pop, food: 999,
  stacks: { 0: huts(pop), 1: n },
  paths: { [pathKey(0, 1)]: gauge },
});

/** The full working chain, staffed rich. */
// ⚠️ `stone: 0, logs: 0` ARE EXPLICIT (2026-08-10): `initial()` now arrives
// with the opening in its pockets, and (a) a mill with anything in the log
// pile saws at its FULL capacity rather than at what walks in, (b) the stock
// this fixture's tests measure is PRODUCTION, not the wagon. Empty purse,
// empty pile — the way this fixture always read.
const chain = (pop = 99): City => ({
  ...initial(), pop, food: 999, stone: 0, logs: 0,
  stacks: { 0: huts(pop), 1: 1, 2: 1, 3: 1 },
  paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 },
});

/** ★ A FIGHT IS A PLACE NOW (2026-08-10). `assail` refuses unless the hero is
 *  standing on the ground, so every fight fixture puts them there first. In
 *  play you get there by marching, which takes `WALK_SECS` per laid edge;
 *  these tests are about the FIGHT, so they skip the walk deliberately. */
const atSite = (g: City, id: number): City =>
  ({ ...g, hero: { ...g.hero, at: id, trip: null } });

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

  it('★★★ ONE WORKS PER PLACE (2026-08-11) — the second is refused', () => {
    // ⚠️ REWRITTEN 2026-08-11. It used to prove that two copies stand and
    // both rungs of the 1.35 curve get paid. Stacking works is gone — the
    // owner, having put four quarries on one rock: *"there is no point in
    // having new locations… we should limit the number to one per location."*
    // More output means more GROUND now.
    let g: City = { ...initial(), stone: 99, crew: { 1: 0 },
      paths: { [pathKey(0, 1)]: 1 } };
    g = apply(g, { type: 'raise', id: 1 });
    expect(apply(g, { type: 'raise', id: 1 })).toBe(g);   // one hammer per site
    g = tick(g, BUILD_SECS.quarry);
    expect(g.stacks[1]).toBe(1);
    expect(g.stone).toBeCloseTo(99 - costOf('quarry', 0).stone!, 9);
    // ★ AND THE SECOND WORKS IS REFUSED, in words, with the alternative named.
    expect(unraisable(g, 1)).toBe('one works per place — post hands instead');
    expect(apply(g, { type: 'raise', id: 1 })).toBe(g);
    // ⚠️ THE CAMP IS EXEMPT: its works are HUTS, and huts are housing.
    expect(unraisable({ ...initial(), planks: 9e5 }, 0)).toBeNull();
  });

  it('★ a copy holds a CREW, and output is per worker', () => {
    // Three copies, fully crewed: 12 hands at the per-worker rate.
    expect(flow(quarried(3, 3)).stone).toBeCloseTo(3 * CREW * RATE.quarry, 9);
    // Two hands on one copy is exactly the pre-rebase copy: 0.3/s.
    expect(flow(quarried(1, 1, 2)).stone).toBeCloseTo(0.3, 9);
  });
});

describe('★★ RULE 2 — people are the multiplier, and the ladder', () => {
  it('★★★ BUNKS AND JOBS BOTH, and the smaller one wins', () => {
    // ⚠️ REWRITTEN 2026-08-11 (chad-liquidity). Huts alone used to raise the
    // ceiling, so past the last working slot a hut bought a MOUTH AND NO
    // HANDS — twelve huts is 290 planks for sixteen people eating 0.8 food a
    // second and producing nothing. A strictly negative purchase, and a
    // famine the player paid for. Growth stops at the work available now.
    const bunks: City = { ...initial(), stacks: { 0: 2 } };
    expect(popCap(bunks)).toBe(CAMP_ROOM + 2 * HUT_ROOM);
    expect(HUT_ROOM).toBe(CREW);   // one hut houses one crew
    // Bunks without a workface: the camp's own room, and no further.
    expect(roomToGrow(bunks)).toBe(CAMP_ROOM);
    expect(tick(bunks, GROW_SECS * 4).pop).toBe(CAMP_ROOM);
    // Open a pit and the same huts fill, because now there is work.
    const worked: City = { ...bunks, stacks: { 0: 2, 1: 1 },
      paths: { [pathKey(0, 1)]: 1 } };
    expect(jobsOf(worked)).toBe(CREW);
    expect(tick(worked, GROW_SECS * 2 + 0.5).pop).toBe(CAMP_ROOM + 2);
  });

  it('people never grow past the huts', () => {
    expect(tick(initial(), 3600).pop).toBe(CAMP_ROOM);
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
      stacks: { 0: huts(3), 1: 4, 4: 1 },
      paths: { [pathKey(0, 1)]: 3, [pathKey(0, 4)]: 3 } };
    const f = flow(g);
    expect(f.food).toBeCloseTo(3 * RATE.farm, 9);
    expect(f.stone).toBeCloseTo(0, 9);
  });

  it('★ huts cost PLANKS — the mill chain is the sink', () => {
    // ★ MARKS, NOT PROSE (2026-08-09): `🟫0/10` — have over need, the same
    // shape the HUD uses one row above. It must still name the right GOOD.
    expect(unraisable({ ...initial(), stone: 99 }, 0)).toMatch(/^🟫0\/10$/);
    // ⚠️ UPDATED 2026-08-10 (build timers): the planks are paid at the ORDER
    // and the hut stands BUILD_SECS.hut later. Both halves of the fact this
    // test protects survive — huts cost planks, and the hut goes up.
    let g = apply({ ...initial(), planks: 12 }, { type: 'raise', id: 0 });
    expect(g.planks).toBeCloseTo(12 - BASE.hut.planks!, 9);
    expect(g.stacks[0]).toBeUndefined();
    g = tick(g, BUILD_SECS.hut);
    expect(g.stacks[0]).toBe(1);
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
    // ⚠️ COUNTED, NOT DERIVED (2026-08-09): this used to read `originals −
    // current holdings`, which went BACKWARDS the moment a raid ADDED a
    // holding. `taken` is what this run has liberated.
    const { 4: _a, 5: _b, ...rest } = initial().goblins;
    const g: City = { ...initial(), goblins: rest, taken: 2 };
    expect(heroMax(g)).toBe(HERO_HP + 6);
    // And the heal fills to the GROWN max.
    const hurt: City = { ...g, hero: { hp: 0, spears: 0, part: 0, at: 0, trip: null } };
    expect(tick(hurt, HEAL_SECS * 40).hero.hp).toBe(HERO_HP + 6);
  });

  it('★ the deep country is winnable at the ladder: spears 6, read the line', () => {
    // Dark Pines (32 strong, bites 5) with the first valley won (hp 19)
    // and Spears ×6 (hit 8): thin both runts, then two blows on the wall —
    // home at 10. Chad's +2-per-fight cadence, on the strip.
    const start = { ...initial().goblins };
    delete start[4]; delete start[5]; delete start[6];
    let g: City = { ...initial(), goblins: start,
      hero: { hp: 19, spears: 6, part: 0, at: 0, trip: null } };
    g = apply(atSite(g, 7), { type: 'assail', id: 7 });
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'aim', at: 2 }, { type: 'strike' },
      { type: 'strike' }, { type: 'strike' }] as const) g = beat(g, a);
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
      // ⚠️ Unchanged by the deletion of widening (2026-08-11) ON PURPOSE —
      // `CARRY` was deliberately left alone so the choke lands exactly where
      // it always did. Only the relief moved.
      const f = flow(quarried(2, 1));
      expect(f.made.get(1)).toBeCloseTo(1.2, 9);
      expect(f.carried.get(1)).toBeCloseTo(CARRY, 9);
    expect(f.stone).toBeCloseTo(CARRY, 9);
    expect(f.choked.has(pathKey(0, 1))).toBe(true);
  });

  it('★ CARTS are the fix now — widening is gone (2026-08-11)', () => {
    // ⚠️ This test used to widen the road. Widening was deleted at the
    // owner's word; the same relief comes from carts, which multiply every
    // path at once instead of asking for the same deed on each of them.
    const buried = quarried(2, 1);
    expect(flow(buried).choked.size).toBe(1);
    // One cart lifts every road at once, which is what widening did one road
    // at a time — the same relief, bought once instead of per path.
    const carted: City = { ...buried, carts: 1 };
    expect(flow(carted).choked.size).toBe(0);
    expect(flow(carted).stone).toBeCloseTo(1.2, 9);
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

  it('★★★ WIDENING IS GONE (2026-08-11) — a laid road is finished', () => {
    // The owner: *"we need to cut the functionality of widening the roads
    // hundred percent. It's stupid that it is there."* A road is laid or it
    // is not. ⚠️ `CARRY` was deliberately NOT raised to compensate, so the
    // choke and the reason to mesh a town both survive exactly as tuned; the
    // relief moved to CARTS, which lift every road at once.
    const laid: City = { ...initial(), stone: 99, stacks: { 1: 1 },
      paths: { [pathKey(0, 1)]: 1 } };
    expect(MAX_GAUGE).toBe(1);
    expect(unlayable(laid, 0, 1)).toBe('the road is laid');
    expect(apply(laid, { type: 'lay', a: 0, b: 1 })).toBe(laid);
    expect(laid.stone).toBe(99);
  });

  it('a shared edge chokes EVERYONE routed over it', () => {
    // The rock face's stone routes 1—2—0 alongside the pines' logs, both
    // over one gauge-1 edge — and together they bury it, so both feel it.
    const g: City = { ...initial(), pop: 99, food: 999,
      stacks: { 0: huts(99), 1: 3, 2: 1 },
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
      stacks: { 0: huts(5), 1: 1, 5: 1 },
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
      stacks: { 0: huts(25), 1: 2, 4: 1 }, crew: { 1: 2 },
      paths: { [pathKey(0, 1)]: 1, [pathKey(0, 4)]: 1 } };
    const f = flow(g);
    expect(f.starving).toBe(true);
    // ⚠️ SLOWED, NOT STOPPED (2026-08-10): famine is a squeeze now — the
    // first empty second costs 30% and it deepens to 95%. Posted or not, the
    // quarry takes the pinch, and the pin cannot buy its way out of it.
    expect(f.stone).toBeCloseTo(flow({ ...g, food: 9e5 }).stone * faminePinch(g), 6);
    expect(f.stone).toBeLessThan(flow({ ...g, food: 9e5 }).stone);
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
  // ⚠️ `logs: 0`: the wagon's seed pile would let the mill saw at full
  // capacity regardless of what the pines ship, which is the exact thing
  // these tests measure. See `chain` above.
  const town = (paths: Record<string, number>): City => ({
    ...initial(), pop: 99, food: 999, logs: 0,
    stacks: { 0: huts(99), 2: 1, 3: 1 },
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
    const heavy: City = { ...town({}), stacks: { 0: huts(99), 2: 2, 3: 1 },
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
      stacks: { 0: huts(99), 2: 1 }, paths: { [pathKey(0, 2)]: 1 } });
    expect(f.logsIn).toBeCloseTo(CREW * RATE.lumber, 9);
    expect(f.planks).toBe(0);
  });

  it('★ a choked plank road wastes sawn planks — never mints them', () => {
    // Mill fed from a pile, its road home already full of stone: the mill
    // saws at capacity but almost nothing ships, and the tick banks only
    // what shipped.
    const g: City = { ...initial(), pop: 99, food: 999, logs: 50,
      stacks: { 0: huts(99), 3: 1, 5: 2 },
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
      stacks: { 0: huts(99), 3: 1 }, paths: { [pathKey(0, 3)]: 1 } };
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
  it('refusals say why: price, danger, reach', () => {
    // ⚠️ `stone: 0` IS NOW EXPLICIT (2026-08-10): `initial()` carries the
    // opening in its pockets, so a bare `initial()` can AFFORD the first
    // pit. The fact under test is the wording of a refusal, not the stock.
    expect(unraisable({ ...initial(), stone: 0, paths: { [pathKey(0, 1)]: 1 } }, 1))
      .toMatch(/^🪨0\/5$/);
    expect(unraisable(initial(), 4)).toMatch(/^goblins hold it · ☠12$/);
    expect(unlayable(initial(), 1, 3)).toBe('nothing joins these');
    expect(unlayable({ ...initial(), stone: 99 }, 1, 2)).toBe('no path reaches either end');
    expect(unlayable({ ...initial(), stone: 99 }, 3, 5)).toMatch(/^goblins hold it · ☠18$/);
  });

  it('round-trips a real city and refuses the rest', () => {
    const g = tick(chain(), 30);
    const back = honour({ game: g, savedAt: Date.now() });
    expect(back).not.toBeNull();
    expect(back!.game).toEqual(g);
    expect(honour(null)).toBeNull();
    expect(honour({ game: { version: 4 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), pop: -1 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), hero: { hp: -1, spears: 0, part: 0, at: 0, trip: null } },
      savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), goblins: { 4: Infinity } },
      savedAt: 1 })).toBeNull();
  });

  it('★ a mid-fight save round-trips; an old-shape fight drops, the town stays', () => {
    const mid = apply({ ...initial(), hero: { hp: 10, spears: 1, part: 0, at: 0, trip: null } },
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
    const mid = apply({ ...initial(), hero: { hp: 10, spears: 1, part: 0, at: 0, trip: null } },
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
    const mid = apply({ ...initial(), food: 99,
      hero: { hp: 10, spears: 1, part: 0, at: 4, trip: null } },
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
    // ⚠️ REVERSED 2026-08-11 for gauges ABOVE the maximum. Widening was
    // deleted, so `MAX_GAUGE` is 1 and every save written before that day has
    // 2s and 3s in it — including the owner's. Those are CLAMPED, not
    // refused: a run is not worth throwing away over a number that is now
    // cosmetic. Nonsense outside any gauge that ever existed is still junk.
    expect(honour({ game: { ...initial(), paths: { '0|1': 3 } }, savedAt: 1 })!
      .game.paths['0|1']).toBe(MAX_GAUGE);
    expect(honour({ game: { ...initial(), paths: { '0|1': 99 } }, savedAt: 1 })).toBeNull();
    // ⚠️ REVERSED 2026-08-09: goblins on Rock Face used to be a forgery,
    // because only the six original holdings could hold any. A raid can now
    // TAKE ground, so that is an ordinary mid-run state and refusing it
    // wiped the save the moment the goblins won a site. What is still a
    // forgery is a site that does not exist.
    expect(honour({ game: { ...initial(), goblins: { 1: 5 } }, savedAt: 1 })).not.toBeNull();
    expect(honour({ game: { ...initial(), goblins: { 99: 5 } }, savedAt: 1 })).toBeNull();
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
    stacks: { 0: huts(pop), 4: copies },
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
    // A crewed farm brings 0.8/s; eight people past the wild's table of two
    // eat 0.3/s: +0.5/s net. (The wild fed SIX until 2026-08-10, which made
    // the larder inert for the whole opening.)
    const g = tick(farmed(1, 8, 0), 10);
    expect(g.food).toBeCloseTo((0.8 - (8 - WILD_FED) * EAT) * 10, 6);
  });

  it('★★ STARVING halts every works but the farms — and so it recovers', () => {
    // 25 mouths eat 0.95/s, one crewed farm brings 0.8/s, larder empty.
    const g: City = { ...farmed(1, 25, 0), stacks: { 0: huts(25), 1: 2, 4: 1 },
      paths: { [pathKey(0, 1)]: 1, [pathKey(0, 4)]: 1 } };
    const f = flow(g);
    expect(f.starving).toBe(true);
    expect(f.stone).toBeLessThan(flow({ ...g, food: 9e5 }).stone);  // pinched
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
  const strike = (g: City): City => beat(g, { type: 'strike' });
  const aim = (g: City, at: number): City => beat(g, { type: 'aim', at });
  const armed = (spears: number, extra: Partial<City> = {}): City =>
    apply({ ...initial(), hero: { hp: 10, spears, part: 0, at: 4, trip: null }, ...extra },
      { type: 'assail', id: 4 });

  it('★ assail fields THE LINE: a wall up front, two biters behind', () => {
    const g = armed(1);
    expect(g.fight).toEqual({ site: 4, target: 0, round: 0, packs: RATION_PACK,
      blow: null,                              // nothing ordered yet
      // ★ OUR OWN LINE, 2026-08-11 — empty here because this fixture levies
      // nobody. A levy square is a townsperson standing in front of the hero.
      us: [],
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
    g = beat(g, { type: 'guard' });           // the wind-up hits a shield
    expect(g.hero.hp).toBe(before);
    expect(g.fight!.round).toBe(3);
    expect(g.fight!.sq[0]!.hp).toBe(6);       // and dealt nothing
  });

  it('★ rations: 3 food for 4 health, from a pack — capped, answered, finite', () => {
    const mid: City = { ...initial(), food: 99,
      hero: { hp: 8, spears: 1, part: 0, at: 0, trip: null },
      fight: { site: 4, sq: lineOf(12, 2, 3), target: 0, round: 0, packs: 1,
        blow: null, us: [] } };
    const g = beat(mid, { type: 'ration' });
    expect(g.food).toBe(99 - RATION_FOOD);
    // 8+4 caps at the max of 10 — then the full answer of 5 lands.
    expect(g.hero.hp).toBe(10 - 5);
    expect(g.fight!.packs).toBe(0);
    expect(apply(g, { type: 'ration' })).toBe(g);          // pack empty
    const broke: City = { ...mid, food: 1 };
    expect(apply(broke, { type: 'ration' })).toBe(broke);  // larder empty
    expect(armed(1).fight!.packs).toBe(RATION_PACK);       // stocked at the gate
  });

  it('★★ FIGHT ONE, played readably at Spears ×1: thin the runts, win at 4', () => {
    let g = armed(1);
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'aim', at: 2 }, { type: 'strike' },
      { type: 'strike' }, { type: 'strike' }] as const) g = beat(g, a);
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

  it('★ bare hands lose even played well — Spears ×1 is fight one\'s gate', () => {
    let g = armed(0);
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'strike' }, { type: 'guard' },
      { type: 'aim', at: 2 }, { type: 'strike' }] as const) g = beat(g, a);
    expect(g.fight).toBeNull();               // the fourth answer ends it
    expect(g.hero.hp).toBe(0);
    expect(g.goblins[4]).toBe(6 + 1);         // wall whole, runt bled
  });

  it('★ FIGHT TWO holds the +2 cadence: Spears ×2 wins the slope read right', () => {
    const { 4: _, ...rest } = initial().goblins;
    let g: City = { ...initial(), goblins: rest,
      hero: { hp: 13, spears: 2, part: 0, at: 0, trip: null } };
    g = apply(atSite(g, 5), { type: 'assail', id: 5 });
    expect(g.fight!.sq).toEqual([{ hp: 10, poke: 1, kind: 'brute' },
      { hp: 4, poke: 3, kind: 'runt' }, { hp: 4, poke: 3, kind: 'runt' }]);
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'aim', at: 2 }, { type: 'strike' }, { type: 'strike' },
      { type: 'strike' }, { type: 'strike' }] as const) g = beat(g, a);
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
    const fighting = apply(atSite({ ...bled, goblins: { ...bled.goblins, 4: 2 } }, 4),
      { type: 'assail', id: 4 });
    expect(tick(fighting, 100).goblins[4]).toBe(2);        // pinned by the fight
  });

  it('a spear costs both currencies on a steeper curve, and arm() pays it', () => {
    expect(spearCost(0)).toEqual({ stone: 8, planks: 4 });
    expect(spearCost(3).stone).toBe(Math.ceil(8 * 1.3 ** 3));
    const g = apply({ ...initial(), stone: 20, planks: 10 }, { type: 'arm' });
    expect(g.hero.spears).toBe(1);
    expect(g.stone).toBe(12);
    expect(g.planks).toBe(6);
    expect(heroHit(g)).toBe(3);
    const broke = initial();
    expect(apply(broke, { type: 'arm' })).toBe(broke);
  });

  it('the hero is refused where sense refuses: free ground, mid-fight, hurt', () => {
    expect(unassailable(initial(), 1)).toBe('nothing to fight here');
    const mid = apply(atSite(initial(), 4), { type: 'assail', id: 4 });
    expect(unassailable(mid, 5)).toBe('the hero is already fighting');
    const stood = atSite(mid, 5);
    expect(apply(stood, { type: 'assail', id: 5 })).toBe(stood);
    // ⚠️ Standing on it: "the hero is not there" now outranks the heal
    // refusal, and this test is about the HEAL.
    const hurt: City = { ...initial(),
      hero: { hp: 3, spears: 0, part: 0, at: 4, trip: null } };
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
// ★★★ A BLOW TAKES TIME, 2026-08-10 — the PC playtest, item B2. The owner:
// *"it is a little bit weird that these attacks are instant again."* An act is
// ORDERED and lands BLOW_SECS later on the tick, wearing the same `{left,
// secs}` job shape paths (`laying`) and works (`raising`) already wear.
// ---------------------------------------------------------------------------
describe('★★★ A BLOW TAKES TIME — ordered, clocked, landed', () => {
  const engaged = (over: Partial<City> = {}): City => ({
    ...initial(), hero: { hp: 10, spears: 1, part: 0, at: 0, trip: null }, ...over,
    fight: { site: 4, sq: lineOf(12, 2, 3), target: 0, round: 0,
      packs: RATION_PACK, blow: null, us: [] } });

  it('★★★ ORDERED, NOT INSTANT: nothing moves until the tick lands it', () => {
    const swung = apply(engaged(), { type: 'strike' });
    // The order is a job of seconds, exactly like a path or a works.
    expect(blowLeft(swung)).toBe(BLOW_SECS);
    expect(swung.fight!.blow!.act).toBe('strike');
    // And NOTHING else has happened: no damage, no answer, no round.
    expect(swung.fight!.sq[0]!.hp).toBe(6);
    expect(swung.hero.hp).toBe(10);
    expect(swung.fight!.round).toBe(0);
    // Halfway through, still nothing.
    const half = tick(swung, BLOW_SECS - 1);
    expect(blowLeft(half)).toBe(1);
    expect(half.fight!.sq[0]!.hp).toBe(6);
    expect(half.hero.hp).toBe(10);
    // And on the beat it lands whole: hit 3 into the wall, full line answers.
    const landed = tick(half, 1);
    expect(landed.fight!.sq[0]!.hp).toBe(3);
    expect(landed.hero.hp).toBe(10 - (1 + 2 + 2));
    expect(landed.fight!.round).toBe(1);
    expect(blowLeft(landed)).toBeNull();       // and the hero waits on you
  });

  it('★★ ONE ORDER IN FLIGHT — and a swing cannot be re-aimed', () => {
    const swung = apply(engaged(), { type: 'strike' });
    // Every other order is refused while this one is in the air…
    expect(apply(swung, { type: 'strike' })).toBe(swung);
    expect(apply(swung, { type: 'guard' })).toBe(swung);
    expect(apply({ ...swung, food: 99 }, { type: 'ration' }).fight!.blow!.act)
      .toBe('strike');
    // …and so is aiming: the seconds buy a DECISION, never a take-back.
    expect(apply(swung, { type: 'aim', at: 1 })).toBe(swung);
    expect(settle(swung).fight!.sq[0]!.hp).toBe(3);   // it lands on the wall
    // Aim first and the same order lands on the runt instead.
    const read = beat(apply(engaged(), { type: 'aim', at: 1 }), { type: 'strike' });
    expect(read.fight!.sq[1]!.hp).toBe(0);
  });

  it('★★★ THE SWING BANKS WHILE YOU ARE AWAY, and lands when you watch', () => {
    // ⚠️ docs/BRIEF.md: "timers bank work; they never punish absence" — the
    // raid's own rule. A hero on 1 health with a full line in front of him is
    // beaten home the moment this blow lands; a pocket must not be where it
    // happens, because the player cannot answer a 60-second catchUp chunk.
    const swung = apply(engaged({ hero: { hp: 1, spears: 1, part: 0, at: 0, trip: null } }),
      { type: 'strike' });
    const night = catchUp(swung, 12 * 3600);
    expect(night.fight).not.toBeNull();          // still standing there
    expect(night.hero.hp).toBe(1);               // untouched by the night
    expect(blowLeft(night)).toBe(0);             // the seconds BANKED, full
    // And on the first tick the player is actually watching, it falls.
    const watched = tick(night, 0.2);
    expect(watched.fight).toBeNull();
    expect(watched.hero.hp).toBe(0);
    expect(watched.goblins[4]).toBe(12 - 3);     // the ground keeps its wounds
  });

  it('★ the ration is paid when it is CALLED and heals when it LANDS', () => {
    // The same law `raise` obeys: the stone is in the foundations. Otherwise
    // hunger could eat a ration mid-swing and the act would fizzle.
    const called = apply(engaged({ food: 99, hero: { hp: 4, spears: 1, part: 0, at: 0, trip: null } }),
      { type: 'ration' });
    expect(called.food).toBe(99 - RATION_FOOD);
    expect(called.fight!.packs).toBe(RATION_PACK - 1);
    expect(called.hero.hp).toBe(4);                    // not yet
    const landed = settle(called);
    expect(landed.hero.hp).toBe(4 + RATION_HP - 5);    // fed, then answered
  });

  it('★ flee is instant, even mid-swing — the safety valve is not a wait', () => {
    const swung = apply(engaged(), { type: 'strike' });
    const home = apply(swung, { type: 'flee' });
    expect(home.fight).toBeNull();
    expect(home.goblins[4]).toBe(12);        // the ordered blow never landed
    expect(home.hero.hp).toBe(10);
  });

  it('★ a swing in flight survives the save; a nonsense act does not', () => {
    const swung = apply(engaged(), { type: 'strike' });
    const back = honour({ game: swung, savedAt: 1 })!.game;
    expect(back.fight!.blow).toEqual({ left: BLOW_SECS, secs: BLOW_SECS, act: 'strike' });
    expect(settle(back).fight!.sq[0]!.hp).toBe(3);
    // An act nobody can land drops the FIGHT, never the town.
    const forged = { ...swung,
      fight: { ...swung.fight!, blow: { left: 1, secs: 2, act: 'nuke' } } };
    const kept = honour({ game: forged, savedAt: 1 })!.game;
    expect(kept.fight).toBeNull();
    expect(kept.stone).toBe(swung.stone);
    // An older save, taken before blows had a clock, simply has none.
    const { blow: _b, ...noBlow } = swung.fight!;
    const old = honour({ game: { ...swung, fight: noBlow }, savedAt: 1 })!.game;
    expect(old.fight!.blow).toBeNull();
    expect(apply(old, { type: 'strike' }).fight!.blow!.act).toBe('strike');
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE ARMOURY MAKES SPEARS, 2026-08-10 — the PC playtest, item G. The
// owner: *"what does it even mean, making arms? … But why does it take planks
// and stones then?"* A category has no bill of materials; a spear does.
// ---------------------------------------------------------------------------
describe('★★★ WHAT THE TOWN MAKES IS A SPEAR', () => {
  it('★★★ THE PRICE IS THE THING: every good it charges is part of a spear', () => {
    // A knapped STONE head on a planed PLANK shaft — so the two goods the
    // price asks for are the two the object is made of, and the deed can say
    // so. This is the whole fix: the numbers never changed, the noun did.
    expect(Object.keys(spearCost(0)).sort()).toEqual(['planks', 'stone']);
    for (const good of Object.keys(spearCost(0))) {
      expect(SPEAR_MADE, `${good} is charged for but never named`)
        .toMatch(new RegExp(good.replace(/s$/, '')));
    }
    expect(spearCost(0)).toEqual({ stone: 8, planks: 4 });   // unchanged
    expect(SPEAR_NAME).toBe('Spear');
    expect(spearLabel(4)).toBe('Spears ×4');
    expect(spearLabel(1)).toBe('Spear ×1');
  });

  it('★★ a spear on the rack is a point of hit, and arm() makes one', () => {
    const g = apply({ ...initial(), stone: 20, planks: 10 }, { type: 'arm' });
    expect(g.hero.spears).toBe(1);
    expect(heroHit(g)).toBe(2 + 1);
    expect(heroHit({ ...g, hero: { ...g.hero, spears: 6 } })).toBe(8);
  });

  it('★★ an older save\'s `arms` ARE the spears — the veteran too', () => {
    // Saves are breakable, but this migration is two lines, so nobody loses
    // an armoury to a rename. The value is checked AFTER the move.
    const old = { ...initial(), hero: { hp: 10, arms: 5, part: 0 },
      legacy: { runs: 2, arms: 3 } };
    const back = honour({ game: old, savedAt: 1 })!.game;
    expect(back.hero.spears).toBe(5);
    expect(heroHit(back)).toBe(7);
    expect(back.legacy).toEqual({ runs: 2, spears: 3 });
    // And junk is still junk, whichever word it arrives under.
    expect(honour({ game: { ...old, hero: { hp: 10, arms: -1, part: 0 } },
      savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...old, legacy: { runs: 2, arms: 1.5 } },
      savedAt: 1 })).toBeNull();
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
      // ⚠️ EVERY BRANCH RUNS THE CLOCK OUT (2026-08-10): an order is a
      // `{left, secs}` job now, so `apply` alone would hand the solver a
      // position with a swing frozen in the air and it would explore
      // nothing. `beat` orders and lands, which is one whole move — the
      // same tree this solver always walked.
      for (let i = 0; i < 3; i++) {
        if ((f.sq[i]?.hp ?? 0) <= 0) continue;
        const aimed = f.target === i ? g : apply(g, { type: 'aim', at: i });
        top = Math.max(top, best(beat(aimed, { type: 'strike' })));
      }
      if (f.packs > 0 && g.food >= RATION_FOOD) {
        top = Math.max(top, best(beat(g, { type: 'ration' })));
      }
      top = Math.max(top, best(beat(g, { type: 'guard' })));
      memo.set(key, top);
      return top;
    };
    return best(start);
  }

  /** The rung: every earlier ground freed, the hero full, the larder deep. */
  const rung = (site: number, spears: number): City => {
    const order = [4, 5, 6, 7, 8, 9];
    const goblins: Record<number, number> = {};
    for (const s of order.slice(order.indexOf(site))) goblins[s] = GOBLINS[s]!.strength;
    const base: City = { ...initial(), goblins, food: 99 };
    return apply({ ...base, hero: { hp: heroMax(base), spears, part: 0, at: site, trip: null } },
      { type: 'assail', id: site });
  };

  /** Mash-attack: never aim, never guard, never eat. */
  const mash = (g: City): City => {
    let s = g;
    for (let i = 0; i < 200 && s.fight; i++) s = beat(s, { type: 'strike' });
    return s;
  };

  // ★ THE SPEAR GATE, the whole design in one table: the ladder's own spears
  // win it, one tier under LOSES however well you play, and mashing loses
  // even fully armed. Change a goblin number and this is what shouts.
  const LADDER: Array<[site: number, spears: number]> =
    [[4, 1], [5, 2], [6, 4], [7, 6], [8, 8], [9, 10]];

  for (const [site, spears] of LADDER) {
    it(`★ ${SITE.get(site)!.name}: Spears ×${spears} wins it read right`, () => {
      expect(solve(rung(site, spears))).toBeGreaterThan(0);
    });

    it(`★★ ${SITE.get(site)!.name}: Spears ×${spears - 1} cannot win it AT ALL`, () => {
      expect(solve(rung(site, spears - 1))).toBe(-1);
    });

    it(`★★ ${SITE.get(site)!.name}: mash-attack loses at Spears ×${spears}`, () => {
      expect(mash(rung(site, spears)).goblins[site]).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// ★★ THE GRIND, PRICED — the review's finding: a flat regen made
// chip-flee-heal-repeat PAY at the deep rungs, because a sortie's damage
// grows with spears and the wound's price did not. Regen is a fraction of
// SPAWN now, so no holding can be ground down one rung under its gate.
// ---------------------------------------------------------------------------
describe('★★ THE FLEE-REGROUP GRIND PAYS NOTHING, at every rung', () => {
  /** One cycle at `spears`: fight until beaten home or won, then heal all the
   *  way back while the ground regroups. Net strength removed, per cycle. */
  const cycle = (site: number, spears: number): number => {
    const order = [4, 5, 6, 7, 8, 9];
    const goblins: Record<number, number> = {};
    for (const s of order.slice(order.indexOf(site))) goblins[s] = GOBLINS[s]!.strength;
    const base: City = { ...initial(), goblins, food: 0 };
    const max = heroMax(base);
    let g = apply({ ...base, hero: { hp: max, spears, part: 0, at: site, trip: null } },
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
      g = beat(apply(g, { type: 'aim', at: soft.at }), { type: 'strike' });
    }
    const bled = g.goblins[site] ?? 0;
    if (bled === 0) return before;                 // took it outright
    // Heal to full at home; the ground regroups the whole time.
    const heal = (max - g.hero.hp) * HEAL_SECS;
    return before - Math.min(GOBLINS[site]!.strength, bled + regenOf(site) * heal);
  };

  it('★★ one rung under the gate, every holding out-heals the grinder', () => {
    for (const [site, spears] of [[4, 1], [5, 2], [6, 4], [7, 6], [8, 8], [9, 10]] as const) {
      // ⚠️ THE OLD FLAT 0.05 PAID +0.75, +2.50 and +4.25 a cycle at 7, 8, 9.
      expect(cycle(site, spears - 1),
        `site ${site} at Spears ×${spears - 1} grinds ${cycle(site, spears - 1)} a cycle`)
        .toBeLessThanOrEqual(0);
    }
  });

  it('★ regen is a share of the holding\'s own spawn, not a flat rate', () => {
    expect(regenOf(4)).toBeCloseTo(GOBLINS[4]!.strength * GOBLIN_REGEN, 9);
    expect(regenOf(9)).toBeGreaterThan(regenOf(4));
    // Fight one is barely touched: the tutorial's pace is the old pace.
    expect(regenOf(4)).toBeCloseTo(12 * GOBLIN_REGEN, 6);
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
      // ⚠️ `roomToGrow`, NOT `popCap` (2026-08-11): a town grows to the WORK
      // it has, not the bunks — huts past the last job buy mouths and no
      // hands. This fixture's ceiling is whichever of the two is smaller.
      expect(catchUp({ ...cold, food: 9e5 }, 12 * 3600).pop).toBe(roomToGrow(cold));
  });

  it('★ a path two seconds from done carries for the rest of the night', () => {
    const laying: City = { ...initial(), stacks: { 0: huts(4), 1: 1 },
      pop: 4, food: 99,
      laying: { [pathKey(0, 1)]: { left: 2, secs: PATH_SECS } } };
    const away = catchUp(laying, 3600);
    expect(away.paths[pathKey(0, 1)]).toBe(1);
    // An hour of quarrying landed — up to the storehouse ceiling, which is
    // what an hour of that quarry now means.
    expect(away.stone).toBe(roomOf(laying));
    // The single step lays the path at the END and carries nothing at all
    // — the stock is exactly the wagon it started with, not a penny more.
    expect(tick(laying, 3600).stone).toBe(START_STONE);
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
      stacks: { 0: huts(99), 2: 1, 3: 1 },
      // ⚠️ STAFF BOTH ENDS BY HAND. Left to auto-staffing the mill can end up
      // with no hands, and then no planks are sawn and nothing comes home —
      // which looks exactly like the bug this test is about.
      crew: { 2: CREW, 3: CREW },
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
      stacks: { 0: huts(99), 1: 1 }, paths: { [pathKey(0, 1)]: 3 } };
    const deep: City = { ...initial(), pop: 99, food: 999, goblins: {},
      stacks: { 0: huts(99), 8: 1 },
      paths: { [pathKey(0, 5)]: 3, [pathKey(5, 8)]: 3 } };
    expect(flow(plain).made.get(1)).toBeCloseTo(CREW * RATE.quarry, 9);
      // ⚠️ SITE 8 IS A SAWMILL SINCE 2026-08-11 (chad-liquidity): one mill
      // in the valley capped planks at 1.0/s however many people you had.
      // The ground still multiplies — that is what this test is for — but
      // the good it multiplies is planks now, and a mill needs LOGS.
      const fed: City = { ...deep, logs: 9e5,
        stacks: { ...deep.stacks, 2: 1 },
        paths: { ...deep.paths, [pathKey(0, 2)]: 1 } };
      expect(flow(fed).made.get(8)).toBeCloseTo(CREW * RATE.sawmill * 3, 9);
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
      .toMatch(/^goblins hold it · ☠/);
  });

  it('★★★ THE FOOD ARTERY DOUBLES when the knoll falls — the 66-pop wall', () => {
    // The wall, measured: all food over one 3.0/s edge feeds 6 + 3.0/EAT.
    const oneEdge = MAX_GAUGE * CARRY;
      expect(WILD_FED + oneEdge / EAT).toBe(WILD_FED + 20);
    // Both farms, deep country freed, EVERY path at full gauge — but no
    // road from the knoll to the camp: the south still files through `0|4`.
    const viaMeadow: City = { ...initial(), pop: 99, food: 999, goblins: {},
      // Enough field at BOTH ends to saturate whatever road it is given.
      stacks: { 0: huts(99), 4: 5, 9: 3 },
        paths: { [pathKey(0, 4)]: 1, [pathKey(4, 6)]: 1, [pathKey(6, 7)]: 1,
          [pathKey(7, 9)]: 1 } };
      expect(flow(viaMeadow).food).toBeCloseTo(oneEdge, 6);      // capped at 1.0
    expect(flow(viaMeadow).choked.has(pathKey(0, 4))).toBe(true);
    // Now lay the knoll's own road. The deep country reroutes down it and
    // the two arteries carry together.
    const viaBoth: City = { ...viaMeadow,
        paths: { ...viaMeadow.paths, [pathKey(0, 6)]: 1 } };
    expect(flow(viaBoth).food).toBeGreaterThan(oneEdge + 1e-6);
    expect(flow(viaBoth).food).toBeCloseTo(2 * oneEdge, 6);
    // ★ Which is the wall moving from 66 people to 126.
      expect(WILD_FED + 2 * oneEdge / EAT).toBe(WILD_FED + 40);
  });

  it('★★★ A SECOND SAWMILL LIFTS THE PLANK CEILING — 2026-08-11', () => {
    // ⚠️ REPLACES "the scree carries the east so the mill keeps its planks",
    // which was about site 8's STONE crowding the mill's road. Site 8 is the
    // second mill now, so that traffic does not exist.
    //
    // chad-liquidity's finding, and the reason for the change: ONE site in
    // the valley allowed a sawmill, so planks capped at CREW × RATE.sawmill
    // = 1.0/s however many people the town had — and planks are what three
    // of the four exponential sinks are priced in. Only 4 of 36 worker slots
    // touched the good the economy actually runs on.
    const near: City = { ...initial(), pop: 99, food: 9e5, goblins: {},
      stacks: { 0: huts(99), 2: 1, 7: 1, 3: 1 },
      crew: { 2: CREW, 7: CREW, 3: CREW },
      paths: { [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1, [pathKey(0, 5)]: 1,
        [pathKey(5, 7)]: 1 } };
    // ⚠️ NOT AN EXACT CEILING — one road out of the camp carries the logs
    // going out AND the planks coming home, so what lands is road-bound, not
    // mill-bound. The claim that matters is the COMPARISON below.
    const one = flow(near);
    expect(one.planks).toBeGreaterThan(0);
    // The deep mill is rich ×3, so taking it is worth three ordinary ones —
    // which is what makes the far country a WAR AIM rather than scenery.
    const both = flow({ ...near,
      stacks: { ...near.stacks, 8: 1 }, crew: { ...near.crew, 8: CREW },
      paths: { ...near.paths, [pathKey(5, 8)]: 1 } });
    expect(both.planks).toBeGreaterThan(one.planks);
    expect(SITE.get(8)!.allows).toBe('sawmill');
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
    stacks: { 0: huts(99), 1: 4 }, paths: { [pathKey(0, 1)]: 3 }, ...over });

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
      stacks: { 0: huts(99), 1: 2, 2: 2, 3: 2 },
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
    // ★ ORDERED, NOT CONJURED (2026-08-11). The owner: *"Storehouse builds
    // immediately for some reason without a cooldown."* Paid up front like
    // every other hammer, standing STOW_SECS later.
    const ordered = apply({ ...initial(), stone: 40, planks: 20 }, { type: 'stow' });
    expect(ordered.store).toBe(0);
    expect(ordered.stowing).toEqual({ left: STOW_SECS, secs: STOW_SECS });
    expect(ordered.stone).toBe(15);
    expect(ordered.planks).toBe(5);
    expect(roomOf(ordered)).toBe(STORE_BASE);            // no room yet
    // ⚠️ AND ONE HAMMER AT A TIME, or a second order buys the same shed twice.
    expect(apply(ordered, { type: 'stow' })).toBe(ordered);
    const g = tick(ordered, STOW_SECS + 1);
    expect(g.store).toBe(1);
    expect(g.stowing).toBeNull();
    expect(roomOf(g)).toBe(STORE_BASE + STORE_ROOM);
    const broke = initial();
    expect(apply(broke, { type: 'stow' })).toBe(broke);
  });

  it('★★★ THE CAP GATES WHAT YOU CAN SAVE FOR — the point of the building', () => {
    // Spears ×9 (66 stone) and Hut #15 (71 planks) both cost more than a
    // bare camp can HOLD, so the storehouse is not a nicety: it stands
    // between the town and the top of either ladder.
    expect(spearCost(8).stone).toBeGreaterThan(STORE_BASE);
    expect(costOf('hut', 14).planks!).toBeGreaterThan(STORE_BASE);
    // The rungs BELOW them fit in a bare camp, so nothing is walled early
    // — the first eight spears and a dozen huts never see the ceiling.
    expect(spearCost(7).stone).toBeLessThanOrEqual(STORE_BASE);
    expect(costOf('hut', 12).planks!).toBeLessThan(STORE_BASE);
    // And one house clears both, with the last spear (85) inside it.
    expect(spearCost(9).stone).toBeLessThan(STORE_BASE + STORE_ROOM);
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
      // ⚠️ 4 rather than 13 since widening died (2026-08-11): every edge is
      // stuck at gauge 1, so a maxed valley moves a third of what it did on
      // roads alone. The LADDER is the point — carts still multiply it, and
      // eight of them still treble the whole town.
      expect(totals(maxed(0)).carried).toBeGreaterThan(4);
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
      // ⚠️ THREE GOODS SINCE 2026-08-11 (chad-liquidity). At 30 stone / 20
      // planks a rung took twenty seconds of the town's planks and under
      // seven of its stone, and logs — whose whole lifetime demand was
      // about ten seconds of production — were never wanted again after
      // the first minute. Every rung binds on all three now.
      expect(cartCost(0)).toEqual({ stone: 90, logs: 35, planks: 20 });
      expect(cartCost(4).logs).toBe(Math.ceil(35 * 1.55 ** 4));
      expect(cartCost(4).stone).toBe(Math.ceil(90 * 1.55 ** 4));
    // 1.55 against a 1.3 haul: the ladder slows, it never stops.
    expect(1.55).toBeGreaterThan(CART_GAIN);
      const g = apply({ ...initial(), stone: 150, logs: 60, planks: 30 },
        { type: 'cart' });
    expect(g.carts).toBe(1);
      expect(g.stone).toBe(60);
      expect(g.planks).toBe(10);
      expect(g.logs).toBe(25);
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

// ---------------------------------------------------------------------------
// ★★★ THE HAND IS GONE, 2026-08-10 — the PC playtest's top finding, and the
// only one that voided the whole economy. The owner: *"there is no need for me
// to build a quarry because I am able to much faster click on the thing… I
// don't need a quarry ever"* / *"I can go and chop logs by hand faster than any
// lumberworks can do it."* A 0.25 tap at thumb speed is ~1.0/s from nothing;
// a quarry is 0.15/s PER HAND, housed, fed and hauled home under a 1.0/s cap.
//
// This block replaces "THE HAND OBEYS THE CEILING" (2026-08-08), which spent
// four tests tuning the gates a tap should obey. The answer turned out to be
// that it should not exist. What survives from it is the QUESTION it existed
// to answer — how does a town with no paths, no works and no stock start? —
// and the answer is now the wagon the settlers arrive with.
// ---------------------------------------------------------------------------
describe('★★★ THE HAND IS GONE — the wagon is the bootstrap', () => {
  it('★★★ there is no tap action at all — stone cannot be minted by pressing', () => {
    // The real guard is the type: `{ type: 'tap' }` is not an `Action` any
    // more, so `npx tsc` is where a re-added tap shouts first. This pins the
    // RUNTIME half — `apply` has no case to fall into, so it answers nothing
    // rather than quietly handing back a richer town. Put the case back and
    // this test goes red.
    const fresh = initial();
    expect(apply(fresh, { type: 'tap' } as never)).toBeUndefined();
    expect(apply(fresh, { type: 'tap', kind: 'logs' } as never)).toBeUndefined();
  });

  it('★★★ THE WAGON BUYS THE OPENING — the arithmetic, checked not asserted', () => {
    const fresh = initial();
    expect(Object.keys(fresh.paths)).toHaveLength(0);
    expect(Object.keys(fresh.stacks)).toHaveLength(0);
    // The first pit and its road: 3 + 5 = 8, comfortably inside the wagon.
    expect(pathCostOf(0)).toBe(PATH_COST);
    expect(fresh.stone).toBeGreaterThanOrEqual(pathCostOf(0) + BASE.quarry.stone!);
    // The pines' road too, which is the whole first chain: 3 + 5 + 3 = 11.
    expect(fresh.stone).toBeGreaterThanOrEqual(2 * pathCostOf(0) + BASE.quarry.stone!);
    // ★ LOGS ARE A CLOSED LOOP WITHOUT THE HAND: a lumber camp costs logs,
    // and only a lumber camp makes logs. The wagon carries the seed.
    expect(BASE.lumber.logs).toBeGreaterThan(0);
    expect(fresh.logs).toBeGreaterThanOrEqual(BASE.lumber.logs!);
    // Nothing else is given: the mill, the huts and the larder are earned.
    expect(fresh.planks).toBe(0);
    // ⚠️ THE WAGON CARRIES BREAD NOW. The wild feeds only two, so the four
    // who came with you eat from the first second; without runway the opening
    // would be a famine you could not answer.
    expect(fresh.food).toBe(START_FOOD);
    // And the wagon fits in a bare camp's store, so none of it is wasted.
    expect(fresh.stone).toBeLessThanOrEqual(roomOf(fresh));
    expect(fresh.logs).toBeLessThanOrEqual(roomOf(fresh));
  });

  it('★★★ NO OPENING ORDER CAN STRAND THE TOWN — the anti-softlock number', () => {
    // With no hand there is no way back from an empty purse, so START_STONE
    // is sized against the WORST spend available at second zero: lay all
    // three roads that leave the camp (the other three are goblin-held) and
    // a quarry must still be affordable. 3 × 3 + 5 = 14 ≤ 15.
    let g = initial();
    for (const b of [1, 2, 3]) {
      expect(unlayable(g, 0, b)).toBeNull();
      g = apply(g, { type: 'lay', a: 0, b });
    }
    expect(g.stone).toBeGreaterThanOrEqual(BASE.quarry.stone!);
    g = tick(g, PATH_SECS);
    expect(unraisable(g, 1)).toBeNull();
  });

  it('★★★ THE WHOLE OPENING, PLAYED: road, pit, pines, mill — no clicking', () => {
    // The item's own acceptance check, run as a test rather than a scratch
    // file (CLAUDE.md rule 4 on phantom citations). From `initial()` and
    // nothing else, with only the actions a player has, the town reaches a
    // working quarry + path + lumberworks chain and then a sawmill.
    let g = initial();
    let secs = 0;
    const wait = (n: number): void => { g = tick(g, n); secs += n; };

    g = apply(g, { type: 'lay', a: 0, b: 1 });        // 3 stone → 12
    wait(PATH_SECS);
    g = apply(g, { type: 'raise', id: 1 });           // 5 stone → 7
    wait(BUILD_SECS.quarry);
    expect(g.stacks[1]).toBe(1);

    g = apply(g, { type: 'lay', a: 0, b: 2 });        // 3 stone → 4
    wait(PATH_SECS);
    g = apply(g, { type: 'raise', id: 2 });           // 8 LOGS → 2
    wait(BUILD_SECS.lumber);
    expect(g.stacks[2]).toBe(1);

    // The chain is live: two settlers, one on each works, both carried home.
    const mid = flow(g);
    expect(mid.stone).toBeCloseTo(RATE.quarry * 2, 9);
    expect(mid.logsIn).toBeCloseTo(RATE.lumber * 2, 9);
    expect(mid.choked.size).toBe(0);

    // The mill is EARNED, not given: 8 stone and 12 logs off that chain.
    g = apply(g, { type: 'lay', a: 0, b: 3 });
    wait(PATH_SECS);
    for (let i = 0; i < 300 && unraisable(g, 3); i++) wait(1);
    expect(unraisable(g, 3)).toBeNull();
    g = apply(g, { type: 'raise', id: 3 });
    wait(BUILD_SECS.sawmill);
    expect(g.stacks[3]).toBe(1);
    // ⚠️ THIS FACT INVERTED ON 2026-08-10 AND THE TEST KEPT ITS JOB. It read
    // "two settlers cannot run three works, and that is the game rather than
    // a defect" — the mill got no hands and sawed nothing. Playing the
    // opening showed it was a defect after all: planks are the only route to
    // a hut, so an unpinned player was simply dead. The camp shelters FOUR
    // now, and what this test protects is the thing that actually matters —
    // that the auto-staffer leaves no works empty.
    expect(flow(g).planks).toBeGreaterThan(0);
    for (const id of [1, 2, 3]) {
      expect(flow(g).hands.get(id) ?? 0, `site ${id} unstaffed`).toBeGreaterThan(0);
    }
    // A pin still moves a hand — it just starts from a staffed mill now
    // rather than an empty one.
    const millBefore = flow(g).hands.get(3) ?? 0;
    g = apply(g, { type: 'pin', id: 3, d: 1 });
    expect(flow(g).hands.get(3)).toBe(millBefore + 1);
    expect(flow(g).planks).toBeGreaterThan(0);
    expect(tick(g, 10).planks).toBeGreaterThan(0);
    // ★ The whole bootstrap, measured: about a hundred seconds of idling,
    // no taps, and nobody ever had to be told to press anything.
    expect(secs).toBeLessThan(150);
  });
});

// ---------------------------------------------------------------------------
// ★★★ STARVING IS ABOUT WHAT ARRIVES, 2026-08-08 — the coherence review's
// third finding. The test read `farmRaw`, the food standing in the FIELDS, so
// a farm whose path home was choked counted as feeding the town. The failure
// was silent: empty larder, no warning, no halt, every works running flat out
// on rations that never arrived.
// ---------------------------------------------------------------------------
describe('★★★ STARVING READS DELIVERY, NOT HARVEST', () => {
  /** A farm and a quarry sharing one narrow path home. The quarry's goods
   *  crowd the food off the road — the whole point of the finding. */
  const shared = (gauge: number, over: Partial<City> = {}): City => ({
    ...initial(), goblins: {}, food: 0, pop: 40,
    stacks: { 0: huts(40), 4: 6, 6: 6 },
    paths: { [pathKey(0, 4)]: gauge, [pathKey(4, 6)]: MAX_GAUGE },
    ...over });

  it('★★★ THE BUG: fields full of food, an empty larder, and no warning', () => {
    const g = shared(1);
    const f = flow(g);
    // The fields are growing far more than the town eats...
    const grown = [...f.made].filter(([id]) => SITE.get(id)!.allows === 'farm')
      .reduce((a, [, m]) => a + m, 0);
    expect(grown).toBeGreaterThan(hunger(g));
    // ...but almost none of it gets home, because the quarry has the road.
    expect(f.food).toBeLessThan(hunger(g));
    expect(f.choked.has(pathKey(0, 4))).toBe(true);
    // THE FIX: the town is starving, and says so.
    expect(f.starving).toBe(true);
  });

  it('★★ the halt frees the very path the food was stuck behind', () => {
    // Starving halts every works but the farms — which is not just a
    // penalty, it is the mechanism: the quarry stops crowding the road.
    const g = shared(1);
    const open = flow({ ...g, food: 99 });   // fed: everything runs
    const shut = flow(g);                    // starving: only farms run
    expect(shut.food).toBeGreaterThan(open.food);
    // And the halted quarry is reported as halted, not as still working.
    expect(shut.made.get(6)!).toBeLessThan(open.made.get(6)!);   // pinched
    expect(open.made.get(6)!).toBeGreaterThan(0);
  });

  it('★★★ a town CAN dig itself out — the halt delivers enough to recover', () => {
    // Same town, a wider road: choked while the quarry runs, fed once the
    // works halt. This is the loop closing rather than a death spiral.
    const g = shared(MAX_GAUGE);
    expect(flow({ ...g, food: 99 }).food).toBeLessThan(hunger(g));
    const f = flow(g);
    expect(f.starving).toBe(true);
    // ⚠️ THE DIG-OUT IS SLOWER NOW, and that is the point of a gradual famine:
    // at the first empty second the quarries are only pinched 30%, so they
    // still crowd the road. As it deepens they get out of the way and the
    // bread gets home. Measured at both ends.
    expect(f.food).toBeLessThan(hunger(g));
      // ⚠️ CARTS ADDED (2026-08-11): with widening gone a bare road carries
      // 1.0/s, which is too small for this fixture's bread to get home at
      // any depth of famine. Two carts restore the capacity a gauge-3 road
      // used to have, so the test measures the FAMINE again and not the road.
      const deep = flow({ ...g, famine: FAMINE_DEEP, carts: 3 });
    expect(deep.food).toBeGreaterThan(hunger(g));
    // ⚠️ NOT ON THE FIRST TICK ANY MORE, and that is the change. Under the
    // old binary halt the quarries stopped dead and the bread got through
    // immediately. A squeeze has to bite before it frees the road, so the
    // town digs out over half a minute rather than in one frame — which is
    // the whole point of making it gradual. Measured, not assumed.
      let out: City = { ...g, carts: 3 };
    let secs = 0;
    while (secs < 200 && out.food <= 0) { out = tick(out, 1); secs++; }
    expect(out.food, 'the town never dug itself out').toBeGreaterThan(0);
    expect(secs).toBeGreaterThan(1);
      // ⚠️ 150, not 90, since widening died (2026-08-11): the artery is a
      // third of the road it was, so a starving town genuinely takes longer
      // to dig out. What this guards is the SHAPE — it digs out at all, and
      // not in a single frame.
      expect(secs).toBeLessThan(150);
  });

  it('★ a town whose food gets home is not starving, however narrow the road', () => {
    // The other direction: delivery is what counts, so a small town on a
    // thin path is fine as long as enough arrives.
    const small: City = { ...initial(), goblins: {}, food: 0, pop: 12,
      stacks: { 0: huts(12), 4: 2 }, paths: { [pathKey(0, 4)]: 1 } };
    const f = flow(small);
    expect(f.food).toBeGreaterThanOrEqual(hunger(small));
    expect(f.starving).toBe(false);
  });

  it('★ an unconnected farm feeds nobody, and the town knows', () => {
    // No path at all: the harvest is real and entirely unreachable.
    const cut: City = { ...initial(), goblins: {}, food: 0, pop: 40,
      stacks: { 0: huts(40), 4: 8 }, paths: {} };
    expect(flow(cut).food).toBe(0);
    expect(flow(cut).starving).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE GOBLINS COME AT YOU, 2026-08-09 — the owner, asked what the goal is:
// *"i feel like we need to add attacking goblins and then make hero lose and
// restart stronger."* This is the first half. Held ground used to sit there and
// heal, so the map was a to-do list of six fights at your leisure.
// ---------------------------------------------------------------------------
describe('★★★ THE RAID — held ground takes something back', () => {
  /** The camp with huts, one holding next door with something to hit. */
  // ⚠️ `taken: 1` IS LOAD-BEARING: the goblins ignore a camp that has never
  // touched them (see FIRST BLOOD below), so a besieged fixture has to have
  // drawn blood already.
  // ⚠️ THE HERO IS OUT, AND THAT IS LOAD-BEARING (2026-08-10). A hero at home
  // turns one raid away, and `hp: 0` is not enough on its own because a
  // 300-second cycle is long enough for them to HEAL — which is a real and
  // wanted property (one healed hero can just about hold one gate), but it
  // means a fixture about a raid LANDING has to keep them genuinely away.
  const pressed = (over: Partial<City> = {}): City => ({
    ...initial(), pop: 12, food: 900, taken: 1,
    hero: { hp: 0, spears: 0, part: 0, at: 0, trip: null }, forage: { left: 9e8, secs: 9e8 },
    stacks: { 0: 4, 1: 2 }, paths: { [pathKey(0, 1)]: 2 },
    goblins: { 4: 12 }, ...over });

  it('★ only holdings that can REACH something of yours fill up', () => {
    // Site 4 touches the camp, which has huts. Nothing else is adjacent to
    // anything of yours, so the early camp is not besieged from minute one.
    expect(raiders(pressed())).toEqual([4]);
    // ⚠️ REVISED 2026-08-09: a holding no longer needs a BUILDING in reach,
    // because a bare site is ground it can take and hold. It needs ground of
    // yours next to it — so one whose every neighbour is already goblin-held
    // is the one that stands down.
    expect(raiders(pressed({ stacks: {} }))).toEqual([4]);
    expect(raiders(pressed({ goblins: { 8: 48, 5: 18 } }))).toEqual([5]);
    // ⚠️ `{8: 48}` ALONE NO LONGER STANDS DOWN: site 8's neighbour is the
    // Scree, and with no goblins on the Scree that is ground you hold.
  });

  it('★ it comes for the fullest thing it can reach', () => {
    const g = pressed({ stacks: { 0: 1, 4: 0 } });
    expect(raidTarget(g, 4)).toBe(0);
    // With two reachable sites it picks the one with the most standing.
    const both: City = { ...initial(), goblins: { 6: 24 },
      stacks: { 0: 2, 4: 7 }, paths: {} };
    expect(raidTarget(both, 6)).toBe(4);
  });

  it('★★★ A RAID TAKES A BUILDING — the clock has teeth', () => {
    const g = pressed();
    // Menace fills over RAID_SECS...
    const half = tick(g, RAID_SECS / 2);
    expect(half.menace[4]).toBeCloseTo(0.5, 2);
    expect(half.stacks[0]).toBe(4);
    // ...and when it comes due a BUILDING goes and the holding resets.
    // ⚠️ Not the camp's hut: since 2026-08-10 the camp is last for stacked
    // ground too, so the pit at Rock Face is what they come for.
    const hit = tick(g, RAID_SECS + 1);
    expect(hit.stacks[1]).toBe(1);
    expect(hit.stacks[0]).toBe(4);
    expect(hit.menace[4]).toBe(0);
  });

  it('★★★ IT NEVER PUNISHES ABSENCE — the brief\'s standing constraint', () => {
    // "Timers bank work; they never punish absence." Twelve hours away is
    // 144 raids' worth of time. Not one of them lands.
    const away = catchUp(pressed(), 12 * 3600);
    expect(away.stacks[0]).toBe(4);
    expect(away.stacks[1]).toBe(2);
    // It waits at the gate, full, and breaks on the first watched tick —
    // taking the works, with the camp's roof still last in the queue.
    expect(away.menace[4]).toBe(1);
    expect(tick(away, 1).stacks[1]).toBe(1);
  });

  it('★ a raid never digs a stack below nothing, and never touches the goods', () => {
    const bare = pressed({ stacks: { 0: 1 } });
    const once = tick(bare, RAID_SECS + 1);
    expect(once.stacks[0]).toBe(0);
    expect(once.stacks[0]).toBeGreaterThanOrEqual(0);
    // The stores are not what they came for.
    expect(once.stone).toBe(bare.stone);
    expect(once.planks).toBe(bare.planks);
    expect(once.food).toBeLessThanOrEqual(bare.food);
  });

  it('★★ taking the ground stops the clock for good', () => {
    const g = tick(pressed(), RAID_SECS / 2);
    expect(g.menace[4]).toBeGreaterThan(0);
    const freed: City = { ...g, goblins: {} };
    // No holding, no raiders, and the leftover menace stands down.
    expect(raiders(freed)).toEqual([]);
    expect(tick(freed, 5).menace[4]).toBe(0);
    expect(tick(freed, RAID_SECS * 2).stacks[0]).toBe(4);
  });

  it('menace is a fraction at the save door, never a count', () => {
    expect(honour({ game: { ...initial(), menace: { 4: 0.5 } }, savedAt: 1 })).not.toBeNull();
    expect(honour({ game: { ...initial(), menace: { 4: 2 } }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), menace: { 4: -1 } }, savedAt: 1 })).toBeNull();
    const { menace: _, ...old } = initial();
    expect(honour({ game: old as never, savedAt: 1 })!.game.menace).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE RUN ENDS, AND THE NEXT ONE STARTS STRONGER, 2026-08-09 — the second
// half of the owner's answer: *"make hero lose and restart stronger."*
// ---------------------------------------------------------------------------
describe('★★★ LOSE THE VALLEY, KEEP THE VETERAN', () => {
  // ⚠️ Out on a foray — see `pressed` above.
  const war = (over: Partial<City> = {}): City => ({
    ...initial(), pop: 12, food: 900, taken: 1,
    hero: { hp: 0, spears: 0, part: 0, at: 0, trip: null }, forage: { left: 9e8, secs: 9e8 },
    stacks: { 0: 1 }, goblins: { 4: 12 }, ...over });

  it('★★★ FIRST BLOOD STARTS THE WAR — an untouched camp is never raided', () => {
    // Before this the goblins came for a camp that had never touched them,
    // which made the opening five minutes a siege you had no hero for.
    const peace = war({ taken: 0 });
    expect(raiders(peace)).toEqual([]);
    expect(tick(peace, RAID_SECS * 4).stacks[0]).toBe(1);
    // Take one holding and they do not stop.
    expect(raiders(war())).toEqual([4]);
  });

  it('★★★ NOTHING LEFT TO BURN MEANS THEY TAKE THE GROUND', () => {
    // A camp whose every other neighbour is already lost: the next raid
    // finds nothing to burn and takes the camp itself.
    const cornered = war({ stacks: {}, goblins: { 4: 12, 1: 12, 2: 12, 3: 12 } });
    const fallen = tick(cornered, RAID_SECS + 1);
    expect(fallen.goblins[0]).toBeGreaterThan(0);
    expect(fallen.lost).toBe(true);
  });

  it('★★ they eat the ground INWARD — outposts first, the camp last', () => {
    // Site 4 touches the camp (0) and Rock Face (1). It always goes for the
    // fullest thing standing, then for bare GROUND, and the camp is the
    // last bare site it will take. That ordering is the run's length.
    const g = war({ stacks: { 0: 1 } });
    const a = tick(g, RAID_SECS + 1);          // the hut burns
    expect(a.stacks[0]).toBe(0);
    expect(a.lost).toBe(false);
    const b = tick(a, RAID_SECS + 1);          // bare Rock Face is TAKEN
    expect(b.goblins[1]).toBeGreaterThan(0);
    expect(b.lost).toBe(false);
    // And the barrier no longer encloses it.
    expect(held(b).some((p) => p.x === SITE.get(1)!.x)).toBe(false);
    // ...and it keeps eating outward-in. The camp is the LAST thing it
    // takes, whenever that falls — that ordering is the run's length.
    let g2 = b;
    for (let i = 0; i < 8 && !g2.lost; i++) g2 = tick(g2, RAID_SECS + 1);
    expect(g2.lost).toBe(true);
    // Every other neighbour of the raiding holding fell before the camp.
    for (const n of SITE.get(4)!.near) {
      if (n === 0) continue;
      expect(g2.goblins[n], `site ${n} should have fallen first`).toBeGreaterThan(0);
    }
  });

  it('★★ a lost valley stops dead — no ticking on a corpse', () => {
    const dead: City = { ...war(), lost: true, stone: 5 };
    expect(tick(dead, 600)).toBe(dead);
  });

  it('★★★ THE VETERAN WALKS OUT, and the next run is never weaker', () => {
    const dead: City = { ...war(), lost: true,
      hero: { hp: 3, spears: 7, part: 0, at: 0, trip: null }, legacy: { runs: 0, spears: 0 } };
    const next = apply(dead, { type: 'found' });
    expect(next.lost).toBe(false);
    expect(next.legacy).toEqual({ runs: 1, spears: 4 });
    expect(next.hero.spears).toBe(4);
    // Everything else is gone — that is what losing the valley means.
    expect(next.stacks).toEqual({});
    expect(next.taken).toBe(0);
    expect(Object.keys(next.goblins)).toHaveLength(Object.keys(GOBLINS).length);
    // ★ AND IT NEVER GOES BACKWARDS: a short run cannot undo a long one.
    const short: City = { ...next, lost: true, hero: { hp: 1, spears: 0, part: 0, at: 0, trip: null } };
    expect(apply(short, { type: 'found' }).hero.spears).toBe(4);
    expect(apply(short, { type: 'found' }).legacy.runs).toBe(2);
  });

  it('★ you cannot found a camp while the valley still stands', () => {
    const alive = war();
    expect(apply(alive, { type: 'found' })).toBe(alive);
  });

  it('★ the hero grows with what THIS run took, and a raid cannot undo it', () => {
    // heroMax used to be `originals − current holdings`, which went
    // BACKWARDS the moment a raid added a holding. It counts liberations.
    expect(heroMax({ ...initial(), taken: 0 })).toBe(heroMax(initial()));
    expect(heroMax({ ...initial(), taken: 2 })).toBeGreaterThan(heroMax(initial()));
    const raided: City = { ...war({ taken: 2 }), goblins: { 4: 12, 1: 12, 2: 12 } };
    expect(heroMax(raided)).toBe(heroMax({ ...initial(), taken: 2 }));
  });

  it('the run fields hold at the save door', () => {
    expect(honour({ game: { ...initial(), taken: 3 }, savedAt: 1 })).not.toBeNull();
    expect(honour({ game: { ...initial(), taken: -1 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), legacy: { runs: 1, spears: 2 } }, savedAt: 1 })).not.toBeNull();
    expect(honour({ game: { ...initial(), legacy: { runs: 1, spears: 1.5 } }, savedAt: 1 })).toBeNull();
    const { legacy: _, taken: __, lost: ___, ...old } = initial();
    const back = honour({ game: old as never, savedAt: 1 })!.game;
    expect(back.legacy).toEqual({ runs: 0, spears: 0 });
    expect(back.taken).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ★ A RUN THE GOBLINS ARE WINNING MUST SURVIVE A RELOAD, 2026-08-09.
// ---------------------------------------------------------------------------
describe('★ taken ground reloads', () => {
  it('★★ goblins standing on a site they TOOK is a save, not a forgery', () => {
    // The door checked every goblin key against GOBLINS, the six original
    // holdings. A raid can now put goblins on Rock Face or the camp, so that
    // check refused a legitimately-played save and wiped the run the moment
    // the goblins took their first site.
    const raided: City = { ...initial(), taken: 1,
      goblins: { ...initial().goblins, 1: 12 } };
    expect(honour({ game: raided, savedAt: 1 })).not.toBeNull();
    const overrun: City = { ...raided, goblins: { ...raided.goblins, 0: 12 }, lost: true };
    expect(honour({ game: overrun, savedAt: 1 })).not.toBeNull();
    // A site that does not exist is still a forgery.
    expect(honour({ game: { ...initial(), goblins: { 99: 12 } }, savedAt: 1 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ★★★ BUILDINGS GO UP OVER TIME, 2026-08-10 — the PC playtest. The owner:
// *"some mill got built as far as I understand instantly, although this is a
// little bit strange. Actually, it should take time to build it."*
// `docs/BRIEF.md` item 3 makes TIMERS the idle spine, and until this the only
// timer in the game was on paths.
// ---------------------------------------------------------------------------
describe('★★★ A WORKS TAKES TIME TO RAISE', () => {
  /** A pathed rock face with money in the purse and nobody to quarry with,
   *  so the ticks below move hammers and nothing else. */
  const site = (over: Partial<City> = {}): City => ({
    ...initial(), stone: 99, logs: 99, planks: 99, crew: { 1: 0 },
    paths: { [pathKey(0, 1)]: 1 }, ...over });

  it('★★★ paid up front, standing BUILD_SECS later, producing NOTHING meanwhile', () => {
    let g = site();
    g = apply(g, { type: 'raise', id: 1 });
    // Paid at the order — the stone is in the foundations.
    expect(g.stone).toBe(99 - BASE.quarry.stone!);
    // ...and the pit does not exist yet: not in `stacks`, not staffed, not
    // making anything. This is the whole item.
    expect(g.stacks[1]).toBeUndefined();
    expect(g.raising[1]).toEqual({ left: BUILD_SECS.quarry, secs: BUILD_SECS.quarry });
    expect(raisingLeft(g, 1)).toBe(BUILD_SECS.quarry);
    expect(flow({ ...g, crew: {} }).stone).toBe(0);
    expect(flow({ ...g, crew: {} }).hands.get(1)).toBeUndefined();
    // Half way is half way.
    g = tick(g, BUILD_SECS.quarry / 2);
    expect(raisingLeft(g, 1)).toBeCloseTo(BUILD_SECS.quarry / 2, 6);
    expect(g.stacks[1]).toBeUndefined();
    // And then it stands, mid-tick, exactly as a finished path joins `paths`.
    g = tick(g, BUILD_SECS.quarry);
    expect(g.stacks[1]).toBe(1);
    expect(g.raising[1]).toBeUndefined();
    expect(raisingLeft(g, 1)).toBeNull();
    expect(flow({ ...g, crew: {} }).stone).toBeGreaterThan(0);
  });

  it('★ one hammer per site — a second order is refused, not queued', () => {
    const g = apply(site(), { type: 'raise', id: 1 });
    expect(unraisable(g, 1)).toBe('already building');
    expect(apply(g, { type: 'raise', id: 1 })).toBe(g);
    // ...and the price is not paid twice for a copy that does not stand yet.
    expect(g.stone).toBe(99 - BASE.quarry.stone!);
  });

  it('★ every kind has its own clock, and a hut is quicker than a mill', () => {
    expect(buildSecs(initial(), 0)).toBe(BUILD_SECS.hut);
    expect(buildSecs(initial(), 3)).toBe(BUILD_SECS.sawmill);
    expect(BUILD_SECS.hut).toBeLessThan(BUILD_SECS.sawmill);
    // Heavier than a road, which is the pacing claim the numbers make.
    for (const k of Object.values(BUILD_SECS)) expect(k).toBeGreaterThan(PATH_SECS);
    // ⚠️ FLAT, NOT ON THE CURVE: copy #9 takes exactly as long as copy #1.
    // The COST already climbs 1.35^n; taxing the clock too would wall the
    // ladder. If that is ever reversed, this is the line that says so.
    // ⚠️ MEASURED AT THE CAMP SINCE 2026-08-11: only huts stack now, so the
    // camp is the only place a second order can be placed at all.
    let g = site({ stacks: { 0: 8 }, planks: 9e5 });
    g = apply(g, { type: 'raise', id: 0 });
    expect(g.raising[0]!.secs).toBe(BUILD_SECS.hut);
  });

  it('★★ a refused raise starts no job at all — the gates come first', () => {
    // Too poor, no road, goblins on it: all three refuse before any hammer.
    expect(apply({ ...site(), stone: 0 }, { type: 'raise', id: 1 }).raising).toEqual({});
    expect(apply({ ...site(), paths: {} }, { type: 'raise', id: 1 }).raising).toEqual({});
    expect(apply(site(), { type: 'raise', id: 4 }).raising).toEqual({});
  });

  it('★★★ THE POCKET TIME BUILDS TOO — catchUp lands the job, and only once', () => {
    // "Timers bank work" (docs/BRIEF.md). A mill ordered and then put in a
    // pocket is standing when you come back — and it is ONE mill, not a
    // night's worth. Chunked away-ticks must treat hammers like spades.
    const ordered = apply(site({ crew: {}, stone: BASE.quarry.stone! }),
      { type: 'raise', id: 1 });
    const away = catchUp(ordered, 12 * 3600);
    expect(away.stacks[1]).toBe(1);
    expect(away.raising).toEqual({});
    // A single enormous step obeys the same rule.
    expect(tick(ordered, 12 * 3600).stacks[1]).toBe(1);
    // And a job two seconds from done finishes and QUARRIES for the rest of
    // the night, rather than sitting out the span.
    expect(away.stone).toBe(roomOf(away));
  });

  it('★ jobs survive the save, and junk is refused at the door', () => {
    const g = apply(site(), { type: 'raise', id: 1 });
    expect(honour({ game: g, savedAt: 1 })!.game.raising)
      .toEqual({ 1: { left: BUILD_SECS.quarry, secs: BUILD_SECS.quarry } });
    // Ground that does not exist would throw on the panel's first paint.
    expect(honour({ game: { ...initial(), raising: { 99: { left: 1, secs: 2 } } },
      savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), raising: { 1: { left: -1, secs: 2 } } },
      savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), raising: { 1: 'x' } as never },
      savedAt: 1 })).toBeNull();
    // An old save with no jobs at all loads with none.
    const { raising: _, ...old } = initial();
    expect(honour({ game: old as never, savedAt: 1 })!.game.raising).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// ★★★ ONLY THE HOUSED WORK, 2026-08-10 — the PC playtest. The owner, twice:
// *"I have four out of two people… and I do not have any penalties for it"*
// and *"six out of two people right now, by the way, and I do not have any
// penalties."* Captives walk home into a camp with no room and it was free.
// ---------------------------------------------------------------------------
describe('★★★ PEOPLE OVER THE HUT CAP DO NOT WORK — but they still eat', () => {
  /** Four quarry slots at the rock face, and a camp with `hutCount` huts. */
  const camp = (pop: number, hutCount: number): City => ({
    ...initial(), pop, food: 999, goblins: {},
    stacks: { 0: hutCount, 1: 1 }, paths: { [pathKey(0, 1)]: 3 } });

  it('★★★ THE PENALTY: unhoused people do not staff a works', () => {
    // Six people, no huts: the camp sleeps two, so two hands turn up and the
    // other four stand in the rain. Before this, all six worked for free.
    const crowded = camp(6, 0);
    expect(popCap(crowded)).toBe(CAMP_ROOM);
    expect(housed(crowded)).toBe(CAMP_ROOM);
    expect(flow(crowded).hands.get(1)).toBe(CAMP_ROOM);
    expect(flow(crowded).stone).toBeCloseTo(CAMP_ROOM * RATE.quarry, 9);
    // One hut and the same six people fill the pit — the answer is a hut.
    const roofed = camp(6, 1);
    expect(popCap(roofed)).toBe(CAMP_ROOM + HUT_ROOM);
    expect(flow(roofed).hands.get(1)).toBe(4);   // the works' own crew caps it
    expect(flow(roofed).stone).toBeCloseTo(CREW * RATE.quarry, 9);
  });

  it('★★★ AND THEY STILL EAT — a mouth with no hands is the cost', () => {
    // The bite has to be felt somewhere, or "over the cap" is still free.
    const crowded = camp(12, 0);
    expect(hunger(crowded)).toBeCloseTo((12 - WILD_FED) * EAT, 9);
    expect(hunger(crowded)).toBe(hunger({ ...crowded, stacks: { 0: 9, 1: 1 } }));
    // Which the tick actually charges to the larder.
    expect(tick({ ...crowded, food: 10 }, 10).food)
      .toBeCloseTo(10 - hunger(crowded) * 10, 6);
  });

  it('★★ A PLATEAU, NEVER A LOSS — nobody dies, nobody leaves, nothing is taken', () => {
    // docs/BRIEF.md, standing constraint. The over-cap people wait.
    const crowded = tick(camp(6, 0), 600);
    expect(crowded.pop).toBe(6);
    expect(crowded.stone).toBeGreaterThan(camp(6, 0).stone);
    // ...and go to work the second a roof exists.
    expect(flow({ ...crowded, stacks: { 0: 1, 1: 1 } }).hands.get(1)).toBe(4);
  });

  it('★★ IT IS THE CAPTIVES THIS IS FOR — a liberation can overfill the camp', () => {
    // The owner's actual screen: 4 of 2, then 6 of 2. Captives are the only
    // way past the cap (growth already stops at it), and they arrive able
    // to eat and unable to work until the mill has paid for a hut.
    let g: City = { ...initial(), hero: { hp: 10, spears: 1, part: 0, at: 0, trip: null } };
    g = apply(atSite(g, 4), { type: 'assail', id: 4 });
    for (const a of [{ type: 'aim', at: 1 }, { type: 'strike' },
      { type: 'aim', at: 2 }, { type: 'strike' },
      { type: 'strike' }, { type: 'strike' }] as const) g = beat(g, a);
    expect(g.pop).toBe(CAMP_ROOM + CAPTIVES);
    expect(popCap(g)).toBe(CAMP_ROOM);
    expect(housed(g)).toBe(CAMP_ROOM);   // 6 of 4 — and now it means something
  });

  it('★ a pin cannot smuggle an unhoused hand onto a works either', () => {
    // The pool is the housed count, so posting hands by name hits the same
    // wall as auto — otherwise the penalty would be one '+' away from void.
    const posted: City = { ...camp(9, 0), crew: { 1: 4 } };
    expect(flow(posted).hands.get(1)).toBe(4);
  });

  it('★ housed() never exceeds either the people or the roofs', () => {
    expect(housed({ ...initial(), pop: 99, stacks: { 0: 1 } })).toBe(CAMP_ROOM + HUT_ROOM);
    expect(housed({ ...initial(), pop: 3, stacks: { 0: 9 } })).toBe(3);
    expect(housed({ ...initial(), pop: 2.9, stacks: { 0: 9 } })).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE TWO BLOCKERS THE TAP LEFT BEHIND, 2026-08-10. Both were found by a
// balance audit and then VERIFIED BY RUNNING THEM before either was touched.
// ---------------------------------------------------------------------------
describe('★★★ THE WAGON CANNOT BE SPENT INTO A DEAD SAVE', () => {
  it('★★★ THE SOFTLOCK: three roads and a widen used to end the run forever', () => {
    // Lay all three camp roads, wait for them, widen one: 9 + 6 = the whole
    // wagon. No works, no stone source, and `raiders()` needs `taken > 0` so
    // you cannot even lose your way out. Verified dead an hour later.
    let g: City = initial();
    for (const b of [1, 2, 3]) g = apply(g, { type: 'lay', a: 0, b });
    g = tick(g, 30);
    expect(g.stone).toBeCloseTo(START_STONE - 9, 6);
      // THE FIX: laying again is refused, because the road is already there.
      expect(unlayable(g, 0, 1)).toBe('the road is laid');
      const after = apply(g, { type: 'lay', a: 0, b: 1 });
    expect(after).toBe(g);
    // And the stone that would have gone into it still buys the opening.
    expect(unraisable(g, 1)).toBeNull();
  });

  it('★★ the traffic gate does not wall a SECOND road out of a working pit', () => {
    // ⚠️ WAS "a road that does carry can still be widened". Widening is gone
    // (2026-08-11), so what the gate must not wall is laying another road
    // from a site that is already shipping.
    let g: City = initial();
    g = apply(g, { type: 'lay', a: 0, b: 1 });
    g = tick(g, 20);
    g = apply(g, { type: 'raise', id: 1 });
    g = tick(g, 40);
    expect(flow(g).loads.get(pathKey(0, 1)) ?? 0).toBeGreaterThan(0);
    expect(unlayable({ ...g, stone: 99 }, 1, 2)).toBeNull();
  });

  it('★★★ THE MILL IS STAFFED ON A DEFAULT SAVE — planks are not zero', () => {
    // The auto-staffer round-robins one hand at a time in site-id order, so
    // a town of TWO running three works gave the mill nothing at all, and
    // planks are the only route to a hut.
    let g: City = initial();
    for (const b of [1, 2, 3]) g = apply(g, { type: 'lay', a: 0, b });
    g = tick(g, 30);
    g = apply(g, { type: 'raise', id: 1 });
    g = apply(g, { type: 'raise', id: 2 });
    g = tick(g, 200);
    // The mill's own price is earned in the opening test above; this one is
    // about STAFFING, so hand it the stock rather than re-proving the clock.
    g = apply({ ...g, stone: 99, logs: 99 }, { type: 'raise', id: 3 });
    g = tick(g, BUILD_SECS.sawmill + 5);
    expect(g.stacks[3]).toBe(1);
    // Every works has at least one pair of hands...
    for (const id of [1, 2, 3]) {
      expect(flow(g).hands.get(id) ?? 0, `site ${id} unstaffed`).toBeGreaterThan(0);
    }
    // ...and the mill actually saws.
    expect(flow(g).planks).toBeGreaterThan(0);
  });

  it('★ the camp shelters four, so the opening works are covered', () => {
    expect(popCap(initial())).toBe(CAMP_ROOM);
    expect(initial().pop).toBe(CAMP_ROOM);
    expect(housed(initial())).toBe(CAMP_ROOM);
    // A hut still adds its room on top.
    expect(popCap({ ...initial(), stacks: { 0: 1 } })).toBe(CAMP_ROOM + HUT_ROOM);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE FORAY — the floor under the economy, 2026-08-10. The owner: *"i think
// it's possible to soft lock, so we need to do repeatable encounters with logs
// and stone and other stuff as loot."*
// ---------------------------------------------------------------------------
describe('★★★ THE FORAY — you can always dig yourself out', () => {
  /** Stripped bare: no works, no goods, no roads — the state a raid leaves.
   *  ⚠️ `goblins: {}` ISOLATES THE FLOOR from the war. With holdings left and
   *  `taken > 0` the raiders keep taking bare GROUND while these tests run,
   *  which is the game working correctly but makes the fixture drift. */
  const ruined = (): City => ({ ...initial(), stone: 0, logs: 0, planks: 0,
    food: 0, stacks: {}, paths: {}, taken: 1, goblins: {} });

  it('★★★ THE SOFTLOCK IS GONE: a town with nothing can still earn', () => {
    // A raid takes a building every 150s once the war is on, so every works
    // can be stripped while the stores sit at zero — and before this, nothing
    // in the game produced anything ever again.
    let g = ruined();
    expect(unforageable(g)).toBeNull();
    g = apply(g, { type: 'forage' });
    g = tick(g, FORAGE_SECS + 1);
    expect(g.stone + g.logs + g.food).toBeGreaterThan(0);
    // ...and it repeats, forever, so the floor never runs out.
    for (let i = 0; i < 6; i++) {
      g = apply(g, { type: 'forage' });
      g = tick(g, FORAGE_SECS + 1);
    }
    // ★ THE WHOLE WAY BACK, walked: a road home (3) and then a pit (5).
    expect(g.stone).toBeGreaterThanOrEqual(PATH_COST + BASE.quarry.stone!);
    g = apply(g, { type: 'lay', a: 0, b: 1 });
    g = tick(g, PATH_SECS + 1);
    expect(g.paths[pathKey(0, 1)]).toBe(1);
    expect(unraisable(g, 1)).toBeNull();
    g = apply(g, { type: 'raise', id: 1 });
    g = tick(g, BUILD_SECS.quarry + 30);
    // And the town is producing again, off its own works.
    expect(flow(g).stone).toBeGreaterThan(0);
  });

  it('★★★ IT IS SLOWER THAN ONE HAND IN A PIT — a floor, not a strategy', () => {
    // This is the whole reason the tap died: 0.25 a click out-earned every
    // ladder in the game. If a foray ever beats a single working quarry, it
    // has become the same mistake wearing a costume.
    for (const f of FORAYS) {
      const total = Object.values(f.loot).reduce((a, b) => a + b, 0);
      expect(total / FORAGE_SECS,
        `"${f.name}" pays ${total} in ${FORAGE_SECS}s`).toBeLessThan(RATE.quarry);
    }
  });

  it('★ one hero, one job: no foraging mid-fight, and no double orders', () => {
    // ⚠️ hp must be FULL or `unassailable` refuses — the hero heals first,
    // and `heroMax` is 13 once a holding has been taken.
    let g: City = { ...ruined(), goblins: { 4: 12 },
      hero: { hp: heroMax({ ...ruined(), goblins: { 4: 12 } }), spears: 9,
        part: 0, at: 4, trip: null } };
    g = apply(atSite(g, 4), { type: 'assail', id: 4 });
    expect(unforageable(g)).toBe('the hero is fighting');
    expect(apply(g, { type: 'forage' }).forage).toBeNull();
    const out = apply(ruined(), { type: 'forage' });
    expect(out.forage).not.toBeNull();
    // A second order while out changes nothing — it does not restart the clock.
    const again = apply(tick(out, 10), { type: 'forage' });
    expect(again.forage!.left).toBeCloseTo(FORAGE_SECS - 10, 6);
  });

  it('★★ the encounters vary, and they do it WITHOUT a die', () => {
    // The engine is pure — no RNG anywhere — so they cycle by count.
    let g = ruined();
    const seen: string[] = [];
    for (let i = 0; i < FORAYS.length; i++) {
      seen.push(nextForay(g).name);
      g = tick(apply(g, { type: 'forage' }), FORAGE_SECS + 1);
    }
    expect(new Set(seen).size).toBe(FORAYS.length);
    // And it wraps, so it is repeatable forever.
    expect(nextForay(g).name).toBe(seen[0]);
    // Same state, same encounter — twice.
    expect(nextForay(ruined()).name).toBe(nextForay(ruined()).name);
  });

  it('★★ a foray BANKS while you are away — it is work owed, not a threat', () => {
    // A raid and a blow are held until you are watching, because they can
    // cost you something. This pays you, so it lands.
    const out = apply(ruined(), { type: 'forage' });
    const home = catchUp(out, 3600);
    expect(home.forage).toBeNull();
    expect(home.stone + home.logs + home.food).toBeGreaterThan(0);
    // One per absence: it does not re-order itself into an idle mine.
    expect(home.forays).toBe(1);
  });

  it('★ loot obeys the storehouse ceiling like everything else', () => {
    const full: City = { ...ruined(), stone: roomOf(ruined()), forays: 0 };
    const g = tick(apply(full, { type: 'forage' }), FORAGE_SECS + 1);
    expect(g.stone).toBe(roomOf(full));
  });

  it('the foray holds at the save door', () => {
    expect(honour({ game: { ...initial(), forays: 3 }, savedAt: 1 })).not.toBeNull();
    expect(honour({ game: { ...initial(), forays: -1 }, savedAt: 1 })).toBeNull();
    expect(honour({ game: { ...initial(), forage: { left: 9, secs: 45 } }, savedAt: 1 })).not.toBeNull();
    expect(honour({ game: { ...initial(), forage: { left: 9, secs: 0 } }, savedAt: 1 })).toBeNull();
    const { forage: _, forays: __, ...old } = initial();
    const back = honour({ game: old as never, savedAt: 1 })!.game;
    expect(back.forage).toBeNull();
    expect(back.forays).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE LARDER IS LIVE FROM THE FIRST SECOND, 2026-08-10. The owner: *"food
// has no meaning in the beginning because it doesn't start to work until you
// get the first farm"* and *"famine does not have any effect, does it — let's
// make it gradual from -30 to -95 production."*
// ---------------------------------------------------------------------------
describe('★★★ FOOD MATTERS FROM THE START, AND FAMINE IS A SQUEEZE', () => {
  it('★★★ the four who came with you are already eating', () => {
    // The wild fed SIX and the camp sleeps four, so hunger was flatly zero
    // until you had built a hut AND filled it — the larder was scenery for
    // the whole opening.
    expect(WILD_FED).toBeLessThan(CAMP_ROOM);
    expect(hunger(initial())).toBeGreaterThan(0);
    // And the wagon carries the runway to answer it.
    expect(initial().food).toBe(START_FOOD);
    const hours = START_FOOD / hunger(initial()) / 60;
    expect(hours).toBeGreaterThan(4);    // minutes, not seconds
    expect(hours).toBeLessThan(20);      // and not a lifetime
  });

  it('★★★ THE PINCH RUNS −30% TO −95%, exactly as asked', () => {
    expect(faminePinch({ ...initial(), famine: 0 })).toBeCloseTo(0.70, 9);
    expect(faminePinch({ ...initial(), famine: FAMINE_DEEP })).toBeCloseTo(0.05, 9);
    expect(faminePinch({ ...initial(), famine: FAMINE_DEEP / 2 })).toBeCloseTo(0.375, 9);
    // It never reaches zero: a stripped town still earns, which is what keeps
    // the starvation dead end shut alongside the foray.
    expect(faminePinch({ ...initial(), famine: 1e6 })).toBeGreaterThan(0);
  });

  it('★★ a hungry works is SLOWED, and it deepens as the larder stays empty', () => {
    const g: City = { ...initial(), pop: 12, food: 0, goblins: {},
      stacks: { 0: 3, 1: 3 }, paths: { [pathKey(0, 1)]: 3 } };
    const fed = flow({ ...g, food: 9e5 }).stone;
    expect(flow({ ...g, famine: 0 }).stone).toBeCloseTo(fed * 0.70, 6);
    expect(flow({ ...g, famine: FAMINE_DEEP }).stone).toBeCloseTo(fed * 0.05, 6);
    // Strictly worse the longer it lasts, and never zero.
    let last = Infinity;
    for (const fam of [0, 30, 60, 90, 120]) {
      const now = flow({ ...g, famine: fam }).stone;
      expect(now).toBeLessThan(last);
      expect(now).toBeGreaterThan(0);
      last = now;
    }
  });

  it('★★ the farms are exempt — they are the way out', () => {
    const g: City = { ...initial(), pop: 20, food: 0, goblins: {},
      // One small farm against twenty mouths — enough to be hungry, not
      // enough to be hopeless.
      stacks: { 0: 5, 4: 1 }, paths: { [pathKey(0, 4)]: MAX_GAUGE } };
    expect(flow(g).starving).toBe(true);
    expect(flow({ ...g, famine: FAMINE_DEEP }).made.get(4))
      .toBeCloseTo(flow({ ...g, food: 9e5 }).made.get(4)!, 6);
  });

  it('★★★ IT DOES NOT DEEPEN WHILE YOU ARE AWAY', () => {
    // Two reasons that agree: the brief forbids punishing absence, and the
    // ramp reads `famine` at the start of a tick — so a deepening one would
    // make production depend on how the away-time happened to be chunked.
    const g: City = { ...initial(), pop: 12, food: 0, stacks: { 0: 3, 1: 3 },
      goblins: {}, paths: { [pathKey(0, 1)]: 3 } };
    expect(catchUp(g, 3600).famine).toBe(0);
    // ...and the whole-span tick and the chunked catch-up still agree.
    expect(catchUp(g, STEP_SECS * 4).stone)
      .toBeCloseTo(apply(g, { type: 'tick', secs: STEP_SECS * 4, away: true }).stone, 6);
  });

  it('★ it heals twice as fast as it bites, once bread is moving', () => {
    const hungry: City = { ...initial(), famine: 60, food: 500, pop: 4 };
    expect(tick(hungry, 10).famine).toBeCloseTo(40, 6);
    expect(tick(hungry, 600).famine).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE RAID, MADE FAIR AND MADE PLAIN — 2026-08-10. The owner: *"my save got
// super bugged, huts were disappearing… also the goblin raids mechanics is
// unclear how it happens, why and what can you do about it."*
// ---------------------------------------------------------------------------
describe('★★★ RAIDS EAT THE WORKS, NOT THE ROOF', () => {
  const town = (over: Partial<City> = {}): City => ({ ...initial(), taken: 1,
    pop: 20, food: 9e5, stacks: { 0: 5, 1: 3, 2: 3, 3: 2 },
    paths: { [pathKey(0, 1)]: 2, [pathKey(0, 2)]: 2, [pathKey(0, 3)]: 2 },
    hero: { hp: 0, spears: 1, part: 0, at: 0, trip: null }, ...over });

  it('★★★ THE HUT BUG: the camp was the fullest pile, so every raid ate it', () => {
    // This is what "my huts kept disappearing" was. The rule said "come for
    // the fullest thing you can reach" and the fullest pile in ANY town is
    // the camp's huts — so every raider on the map queued on the housing,
    // which is the one stack that gates people, which gate everything.
    const g = town();
    // Raiders that have a works within reach come for the WORKS.
    expect(raidTarget(g, 4)).not.toBe(0);
    expect(raidTarget(g, 5)).not.toBe(0);
    expect(SITE.get(raidTarget(g, 4)!)!.allows).not.toBe('hut');
  });

  it('★★ housing survives while there is anything else to take', () => {
    // Measured over three cycles: before the fix, huts went 5 → 2 → 0 and
    // the population cap collapsed 24 → 4 with twenty people left idle.
    let g = town();
    const capBefore = popCap(g);
    for (let i = 0; i < 2; i++) g = tick(g, RAID_SECS + 1);
    expect(g.stacks[0]!).toBeGreaterThan(0);
    expect(popCap(g)).toBeGreaterThan(capBefore / 2);
  });

  it('★★★ THE ANSWER: a hero at home turns a raid away', () => {
    // "What can you do about it" had no answer but "conquer faster", which
    // a town under three raiders often cannot.
    const away: City = { ...town(), hero: { hp: 0, spears: 1, part: 0, at: 0, trip: null } };
    expect(onWatch(away)).toBe(false);
    // ⚠️ THE WATCH IS POSITIONAL (the owner's call, 2026-08-10): the hero must
    // stand on the ground the raid is coming FOR, not merely be at home.
    const gate = raidTarget(town(), 4)!;
    const home: City = { ...town(),
      hero: { hp: heroMax(town()), spears: 1, part: 0, at: gate, trip: null } };
    expect(onWatch(home)).toBe(true);
    const hit = tick(away, RAID_SECS + 1);
    const held = tick(home, RAID_SECS + 1);
    const lost = (x: City): number => [0, 1, 2, 3]
      .reduce((n, id) => n + ((town().stacks[id] ?? 0) - (x.stacks[id] ?? 0)), 0);
    expect(lost(held)).toBeLessThan(lost(hit));
    // And turning one away BLEEDS that holding — defending is slow progress.
    expect(held.goblins[4]!).toBeLessThan(home.goblins[4]!);
  });

  it('★★★ ONE HERO, ONE GATE — standing watch is not a wall', () => {
    // A single idle hero used to repel every holding on the map in the same
    // instant, which is the mechanic deleting itself.
    // ⚠️ THE WATCH IS POSITIONAL (the owner's call, 2026-08-10): the hero must
    // stand on the ground the raid is coming FOR, not merely be at home.
    const gate = raidTarget(town(), 4)!;
    const home: City = { ...town(),
      hero: { hp: heroMax(town()), spears: 1, part: 0, at: gate, trip: null } };
    expect(raiders(home).length).toBeGreaterThan(1);
    const after = tick(home, RAID_SECS + 1);
    const lost = [0, 1, 2, 3]
      .reduce((n, id) => n + ((home.stacks[id] ?? 0) - (after.stacks[id] ?? 0)), 0);
    expect(lost).toBeGreaterThan(0);            // some got through
    expect(lost).toBeLessThan(raiders(home).length);   // but not all
  });

  it('★★ the watch costs the foray and the march — you cannot do both', () => {
    // ⚠️ THE WATCH IS POSITIONAL (the owner's call, 2026-08-10): the hero must
    // stand on the ground the raid is coming FOR, not merely be at home.
    const gate = raidTarget(town(), 4)!;
    const home: City = { ...town(),
      hero: { hp: heroMax(town()), spears: 1, part: 0, at: gate, trip: null } };
    expect(onWatch(apply(home, { type: 'forage' }))).toBe(false);
    expect(onWatch({ ...home, fight: { site: 4, sq: [], round: 0, packs: 0,
      target: 0, blow: null } as never })).toBe(false);
    // And a hero beaten home cannot hold the walls either.
    expect(onWatch({ ...home, hero: { hp: 0, spears: 1, part: 0, at: 0, trip: null } })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE HERO HAS A PLACE, 2026-08-10 — step 1 and 2 of docs/RAIDS.md. The
// owner: *"it's not even visible anywhere… the hero must have travel times
// between his attacks and home… and all must be visible on map."* The war was
// invisible because it had no geography: `hero` was `{hp, spears, part}`, so
// "on watch" was a boolean over the whole valley and a raid had no path.
// ---------------------------------------------------------------------------
describe('★★★ THE HERO WALKS, AND HOLDS ONE GATE', () => {
  const roaded = (over: Partial<City> = {}): City => ({ ...initial(),
    paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(1, 2)]: 1 },
    ...over });

  it('★★★ THEY START AT THE CAMP, AND GETTING ANYWHERE TAKES TIME', () => {
    const g = roaded();
    expect(g.hero.at).toBe(0);
    expect(g.hero.trip).toBeNull();
    expect(marchSecs(g, 1)).toBe(WALK_SECS);
    const out = apply(g, { type: 'march', to: 1 });
    expect(out.hero.trip).toEqual({ to: 1, left: WALK_SECS, secs: WALK_SECS });
    // Still on the road half way...
    expect(tick(out, WALK_SECS / 2).hero.at).toBe(0);
    // ...and arrived at the end of it.
    const there = tick(out, WALK_SECS + 1);
    expect(there.hero.at).toBe(1);
    expect(there.hero.trip).toBeNull();
  });

  it('★★★ ROADS ARE SPEED, NOT PERMISSION (2026-08-11)', () => {
    // The owner walked onto a holding with no road, won it, and could not
    // walk home: *"I can go there without a road, but I cannot return without
    // a road, which is very strange."* The old rule made a road PERMISSION,
    // with one exception for the last step onto held ground — and winning the
    // fight deleted the exception. Now open country is simply slower.
    const g = roaded();
    expect(walkSecs(g, 0, 1)).toBe(WALK_SECS);              // laid: one leg
    expect(walkSecs(initial(), 0, 1)).toBe(WALK_SECS * ROUGH);   // rough: slower
    expect(ROUGH).toBeGreaterThan(1);
    // ★ THE TRAP ITSELF: onto held ground with no road, and home again.
    expect(walkSecs(initial(), 0, 4)).toBe(WALK_SECS * ROUGH);
    const taken: City = { ...initial(), goblins: {},
      hero: { hp: 10, spears: 0, part: 0, at: 4, trip: null } };
    expect(walkSecs(taken, 4, 0)).toBe(WALK_SECS * ROUGH);
    expect(unmarchable(taken, 0)).toBeNull();     // ★ they can come home
    // ★ A road beats open country, which is the whole reason to lay one.
    expect(walkSecs(g, 0, 1)!).toBeLessThan(walkSecs(initial(), 0, 1)!);
    // ⚠️ A HOLDING IS STILL A WALL. Every deep site starts held, so the
    // knoll at the far end has no route that does not cross one — and the
    // walk is refused outright rather than quietly cutting through.
    expect(walkSecs(initial(), 0, 9)).toBeNull();
    expect(unmarchable(initial(), 9)).toBe('no way through — a holding blocks it');
  });

  it('★★★ ARRIVING ON HELD GROUND DRAWS THE SWORD', () => {
    const g: City = { ...roaded(), goblins: { 1: 12 },
      hero: { hp: 10, spears: 3, part: 0, at: 0, trip: null } };
    const out = apply(g, { type: 'march', to: 1 });
    expect(out.fight).toBeNull();
    const there = tick(out, WALK_SECS + 1);
    expect(there.hero.at).toBe(1);
    expect(there.fight).not.toBeNull();
    expect(there.fight!.site).toBe(1);
    // ★ And the line is read from the holding's strength AT ARRIVAL, so a
    // bled holding fields a smaller line than a whole one. (Reading it when
    // they set out would let a long walk fight a garrison that is no longer
    // there — in either direction.)
    const bled: City = { ...g, goblins: { 1: 4 } };
    const small = tick(apply(bled, { type: 'march', to: 1 }), WALK_SECS + 1);
    expect(small.fight!.sq.reduce((n, q) => n + q.hp, 0))
      .toBeLessThan(there.fight!.sq.reduce((n, q) => n + q.hp, 0));
  });

  it('★★ a fight is a PLACE — you cannot swing at ground you are not on', () => {
    const g: City = { ...roaded(), goblins: { 1: 12 } };
    expect(unassailable(g, 1)).toBe('the hero is not there');
    expect(apply(g, { type: 'assail', id: 1 })).toBe(g);
    const walking = apply(g, { type: 'march', to: 1 });
    expect(unassailable(walking, 1)).toMatch(/^⏱/);
  });

  it('★★★ THE WATCH IS WHERE THEY STAND — one gate, chosen', () => {
    const war: City = { ...roaded(), taken: 1, pop: 12, food: 9e5,
      stacks: { 0: 2, 1: 2, 2: 2 }, goblins: { 4: 12 } };
    const gate = raidTarget(war, 4)!;
    // Standing on the gate turns it away and bleeds the holding...
    const held = tick({ ...war, hero: { ...war.hero, at: gate } }, RAID_SECS + 1);
    expect(held.goblins[4]!).toBeLessThan(war.goblins[4]!);
    expect(held.stacks[gate]).toBe(war.stacks[gate]);
    // ...standing somewhere ELSE does not, however healthy they are.
    const elsewhere = [0, 1, 2].find((n) => n !== gate)!;
    const missed = tick({ ...war, hero: { ...war.hero, at: elsewhere } }, RAID_SECS + 1);
    expect(missed.stacks[gate]!).toBeLessThan(war.stacks[gate]!);
  });

  it('★ walking banks while you are away, like every other timer', () => {
    const out = apply(roaded(), { type: 'march', to: 1 });
    const home = catchUp(out, 3600);
    expect(home.hero.at).toBe(1);
    expect(home.hero.trip).toBeNull();
  });

  it('★ a hero on the road cannot forage, fight or march again', () => {
    const out = apply(roaded(), { type: 'march', to: 1 });
    expect(onWatch(out)).toBe(false);
    expect(unforageable(out)).not.toBeNull();
    expect(unmarchable(out, 2)).toMatch(/^⏱/);
    // ⚠️ A second march is refused outright — the state comes back unchanged,
    // so the ORIGINAL trip is still the one running.
    expect(apply(out, { type: 'march', to: 2 })).toBe(out);
    expect(out.hero.trip!.to).toBe(1);
  });

  it('the hero place holds at the save door, and old saves start at the camp', () => {
    const ok: City = { ...initial(),
      hero: { hp: 5, spears: 1, part: 0, at: 3, trip: { to: 1, left: 4, secs: 12 } } };
    expect(honour({ game: ok, savedAt: 1 })).not.toBeNull();
    const nowhere = { ...initial(),
      hero: { hp: 5, spears: 1, part: 0, at: 99, trip: null } } as never;
    expect(honour({ game: nowhere, savedAt: 1 })).toBeNull();
    const old = { ...initial(), hero: { hp: 5, spears: 1, part: 0 } } as never;
    const back = honour({ game: old, savedAt: 1 })!.game;
    // ⚠️ NO `?? 0` HERE. That is exactly how this slipped through: an
    // undefined `at` satisfied `?? 0` while making every road unreachable.
    expect(back.hero.at).toBe(0);
    expect(back.hero.trip).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE AMBUSH ON THE ROAD — step 4 of `docs/RAIDS.md`, 2026-08-10. Built
// last on purpose: it is the one that can feel unfair, and it wanted travel,
// the positional watch and the drawn lines on screen first to be legible.
// ---------------------------------------------------------------------------
describe('★★★ CAUGHT IN THE OPEN', () => {
  // ⚠️ Its own fixture: `town()` lives inside the raid describe above and a
  // shared one would couple two suites that are tuned for different things.
  const war = (over: Partial<City> = {}): City => ({ ...initial(), taken: 1,
    pop: 20, food: 9e5, stacks: { 0: 5, 1: 3, 2: 3, 3: 2 },
    paths: { [pathKey(0, 1)]: 2, [pathKey(0, 2)]: 2, [pathKey(0, 3)]: 2 },
    goblins: { 4: 12 },
    hero: { hp: 13, spears: 1, part: 0, at: 0, trip: null }, ...over });

  it('★★★ a raid on the road you are walking CATCHES YOU — no guard, no aim', () => {
    const g = war();
    const gate = raidTarget(g, 4)!;
    const walking: City = { ...g, menace: { 4: 0.99 },
      hero: { ...g.hero, hp: heroMax(g), at: gate,
        trip: { to: 5, left: 9999, secs: 9999 } } };
    const out = tick(walking, RAID_SECS + 1);
    // Bitten harder than a fight they chose...
    expect(out.hero.hp).toBeLessThan(heroMax(g) - (GOBLINS[4]?.bite ?? 2));
    // ...the holding is NOT bled, because there was no aim...
    expect(out.goblins[4]).toBe(g.goblins[4]);
    // ...and the raid lands anyway.
    expect(out.stacks[gate]!).toBeLessThan(g.stacks[gate]!);
    expect(out.ambush).not.toBeNull();
    expect(out.ambush!.at).toBe(gate);
  });

  it('★★ it cannot kill on its own — a walk is not a defeat you can learn from', () => {
    const g = war();
    const gate = raidTarget(g, 4)!;
    // ⚠️ A TINY TICK ON A FULL MUSTER. Across a long one the hero HEALS more
    // than the ambush takes, so hp never approaches the floor and the test
    // passes with the floor deleted — which is exactly what the sabotage
    // pass caught. At 0.1s the healing is nothing and the floor is the only
    // thing holding them up.
    const nearly: City = { ...g, menace: { 4: 1 },
      hero: { ...g.hero, hp: 1, at: gate, trip: { to: 5, left: 9999, secs: 9999 } } };
    const out = tick(nearly, 0.1);
    expect(out.ambush).not.toBeNull();      // it landed...
    expect(out.hero.hp).toBeGreaterThanOrEqual(1);   // ...and did not finish them
    expect(out.lost).toBe(false);
  });

  it('★★ standing still is never an ambush — that is the watch, and it repels', () => {
    const g = war();
    const gate = raidTarget(g, 4)!;
    const stood: City = { ...g, menace: { 4: 0.99 },
      hero: { ...g.hero, hp: heroMax(g), at: gate, trip: null } };
    const out = tick(stood, RAID_SECS + 1);
    expect(out.ambush).toBeNull();
    expect(out.goblins[4]!).toBeLessThan(g.goblins[4]!);   // bled: they aimed
    expect(out.stacks[gate]).toBe(g.stacks[gate]);         // and it was turned away
  });

  it('★ walking somewhere the raid is not going is safe', () => {
    const g = war();
    const gate = raidTarget(g, 4)!;
    const elsewhere = [0, 1, 2, 3].find((n) => n !== gate)!;
    const away: City = { ...g, menace: { 4: 0.99 },
      hero: { ...g.hero, hp: heroMax(g), at: elsewhere,
        trip: { to: 5, left: 9999, secs: 9999 } } };
    const out = tick(away, RAID_SECS + 1);
    expect(out.ambush).toBeNull();
    expect(out.hero.hp).toBe(heroMax(g));
  });

  it('★ the mark ages out, and survives the save door', () => {
    const marked: City = { ...war(), ambush: { at: 1, left: AMBUSH_TELL } };
    expect(tick(marked, AMBUSH_TELL - 1).ambush).not.toBeNull();
    expect(tick(marked, AMBUSH_TELL + 1).ambush).toBeNull();
    expect(honour({ game: marked, savedAt: 1 })).not.toBeNull();
    const bad = { ...war(), ambush: { at: 99, left: 3 } } as never;
    expect(honour({ game: bad, savedAt: 1 })).toBeNull();
    // ⚠️ DEFAULTED for saves written before it existed — the `hero.at` trap.
    const { ambush: _drop, ...older } = war();
    const back = honour({ game: older as City, savedAt: 1 })!.game;
    expect(back.ambush).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE SWEEP — 2026-08-11, queue item 5. The owner, having played every
// fight in the valley: *"the hero doesn't have any skills, so the battles are
// boring, and there is no point… the variety is also not there."*
// ---------------------------------------------------------------------------
describe('★★★ A SECOND WAY TO SWING', () => {
  const fought = (spears: number): City => {
    const g: City = { ...initial(), food: 9e5,
      hero: { hp: 30, spears, part: 0, at: 4, trip: null } };
    return apply(g, { type: 'assail', id: 4 });
  };
  const land = (g: City, act: 'strike' | 'sweep'): City =>
    tick(apply(g, { type: act }), BLOW_SECS + 0.01);

  it('★★★ a sweep hits EVERY square standing, a strike hits one', () => {
    const g = fought(6);
    const swept = land(g, 'sweep');
    const struck = land(g, 'strike');
    const hurtBy = (x: City): number =>
      x.fight!.sq.filter((q, i) => q.hp < g.fight!.sq[i]!.hp).length;
    expect(hurtBy(swept)).toBe(g.fight!.sq.length);
    expect(hurtBy(struck)).toBe(1);
  });

  it('★★★ IT IS A TRADE, NOT A BETTER BUTTON: worse on one, better on many', () => {
    const g = fought(6);
    const gone = (x: City): number => x.fight!.sq.reduce((n, q) => n + q.hp, 0);
    // Across the whole line a sweep takes more off...
    expect(gone(land(g, 'sweep'))).toBeLessThan(gone(land(g, 'strike')));
    // ...but on any ONE square it takes strictly less, which is what makes a
    // wall the wrong thing to sweep.
    const one = (x: City): number => x.fight!.sq[0]!.hp;
    expect(one(land(g, 'sweep'))).toBeGreaterThan(one(land(g, 'strike')));
  });

  it('★ a sweep can finish a fight, and the ground is liberated by it', () => {
    // ⚠️ This is why `liberate` was lifted out of the strike: a sweep that
    // killed the last square used to fall through to `answered` and leave a
    // fight standing with nothing alive in it.
    const g = fought(99);
    let x = g;
    for (let i = 0; i < 12 && x.fight; i++) x = land(x, 'sweep');
    expect(x.fight).toBeNull();
    expect(x.goblins[4]).toBeUndefined();
    expect(x.taken).toBe(1);
  });

  it('★ the beat is shorter than it was — a fight is not a wait', () => {
    expect(BLOW_SECS).toBeLessThanOrEqual(1);
    const g = fought(4);
    expect(blowLeft(apply(g, { type: 'sweep' }))).toBe(BLOW_SECS);
    // And a second order mid-swing is still refused.
    const mid = apply(g, { type: 'sweep' });
    expect(apply(mid, { type: 'strike' })).toBe(mid);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE POSTED WATCH — 2026-08-11, queue item 6. The owner: *"we need to
// allow to have defensive job assignments for the units because the hero
// running around everywhere cannot save everyone."* Which is the direct
// consequence of making the watch positional: one hero, three gates.
// ---------------------------------------------------------------------------
describe('★★★ HANDS ON THE GATE', () => {
  const town = (over: Partial<City> = {}): City => ({ ...initial(), taken: 1,
    pop: 30, food: 9e5, stacks: { 0: 9, 1: 1, 2: 1, 3: 1 },
    paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 },
    goblins: { 4: 12 },
    hero: { hp: 0, spears: 1, part: 0, at: 9, trip: null }, ...over });

  it('★★★ THREE POSTED HANDS TURN A RAID AWAY, and it costs one of them', () => {
    const g = town();
    const gate = raidTarget(g, 4)!;
    const posted: City = { ...g, menace: { 4: 0.99 },
      guard: { [gate]: GUARD_STOP } };
    const out = tick(posted, RAID_SECS + 1);
    expect(out.stacks[gate]).toBe(g.stacks[gate]);        // nothing taken
    expect(guardsAt(out, gate)).toBe(GUARD_STOP - 1);     // one did not return
    // ⚠️ AND THE HOLDING IS NOT BLED. They hold a gate; they do not take
    // ground. That is the hero's job and the reason to still have one.
    expect(out.goblins[4]).toBe(g.goblins[4]);
  });

  it('★★ two hands are not enough — the raid lands', () => {
    const g = town();
    const gate = raidTarget(g, 4)!;
    const thin: City = { ...g, menace: { 4: 0.99 },
      guard: { [gate]: GUARD_STOP - 1 } };
    const out = tick(thin, RAID_SECS + 1);
    expect(out.stacks[gate]!).toBeLessThan(g.stacks[gate]!);
  });

  it('★★★ IT IS A TRADE: the posted do not work', () => {
    // ⚠️ THE POOL HAS TO BIND for this to measure anything. With 30 people
    // and 12 slots the sites are the constraint, so posting six changes
    // nothing and the test passes with the whole rule deleted. Twelve people
    // into twelve slots makes every posted hand a hand not quarrying.
    const g = town({ pop: 12, stacks: { 0: 3, 1: 1, 2: 1, 3: 1 } });
    const free = flow(g);
    const busy = flow({ ...g, guard: { 1: 6 } });
    const hands = (f: ReturnType<typeof flow>): number =>
      [...f.hands.values()].reduce((n, h) => n + h, 0);
    expect(hands(busy)).toBeLessThan(hands(free));
    expect(hands(free) - hands(busy)).toBe(6);
  });

  it('★ you cannot post more people than you have, nor onto held ground', () => {
    const g = town({ pop: 4, stacks: { 0: 1 } });
    const many = apply(g, { type: 'post', id: 1, by: 999 });
    expect(guardsAt(many, 1)).toBeLessThanOrEqual(housed(g));
    expect(apply(g, { type: 'post', id: 4, by: 1 })).toBe(g);   // goblins hold it
    // And they come home again.
    const one = apply(g, { type: 'post', id: 1, by: 1 });
    expect(guardsAt(one, 1)).toBe(1);
    expect(guardsAt(apply(one, { type: 'post', id: 1, by: -1 }), 1)).toBe(0);
  });

  it('★ the watch survives the save door, and older saves post nobody', () => {
    expect(honour({ game: { ...town(), guard: { 1: 3 } }, savedAt: 1 })!
      .game.guard[1]).toBe(3);
    expect(honour({ game: { ...town(), guard: { 99: 1 } } as never,
      savedAt: 1 })).toBeNull();
    const { guard: _drop, ...older } = town();
    expect(honour({ game: older as City, savedAt: 1 })!.game.guard).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// ★★★ HIRING — 2026-08-11, the half of queue 3 that did not ship with the
// one-works cap. The owner asked for both in one breath: *"we should limit
// the number to one per location. And then we should allow to add more
// people there."*
// ---------------------------------------------------------------------------
describe('★★★ MORE HANDS ON ONE WORKS', () => {
  const pit = (over: Partial<City> = {}): City => ({ ...initial(),
    pop: 40, food: 9e5, stacks: { 0: 12, 1: 1 },
    paths: { [pathKey(0, 1)]: 1 }, ...over });

  it('★★★ a hire widens the crew that can work a site', () => {
    const g = pit();
    const before = flow(g).hands.get(1) ?? 0;
    expect(before).toBe(CREW);
    const hired = apply(g, { type: 'hire', id: 1 });
    expect(hired.hire[1]).toBe(1);
    expect(flow(hired).hands.get(1)).toBe(CREW * 2);
    // And the output follows the hands, because output is per worker.
    expect(flow(hired).made.get(1)!).toBeGreaterThan(flow(g).made.get(1)!);
  });

  it('★★★ DEEPENING STAYS WORSE THAN EXPANDING — the whole point of the cap', () => {
    // The complaint that started this: *"there is no point in having new
    // locations… because I'm able to build multiple lumber works at the
    // initial sites."* Hires climb 1.6^n; a first works on new ground does
    // not climb at all. By the third hire, walking out is plainly cheaper.
    expect(hireCost(1)).toBeGreaterThan(hireCost(0));
    expect(hireCost(3) / hireCost(0)).toBeGreaterThan(4);
  });

  it('★ it is paid in food, refused when short, and never on held ground', () => {
    const broke = pit({ food: 1 });
    expect(unhireable(broke, 1)).not.toBeNull();
    expect(apply(broke, { type: 'hire', id: 1 })).toBe(broke);
    const g = pit();
    expect(apply(g, { type: 'hire', id: 1 }).food)
      .toBeCloseTo(g.food - hireCost(0), 6);
    expect(unhireable(pit({ goblins: { 1: 9 } }), 1)).toMatch(/^goblins hold it/);
    // Nothing to work yet is its own refusal, not a silent no.
    expect(unhireable(pit({ stacks: { 0: 12 } }), 1)).toBe('nothing to work here yet');
  });

  it('★ hires survive the save door, and older saves have hired nobody', () => {
    expect(honour({ game: { ...pit(), hire: { 1: 2 } }, savedAt: 1 })!
      .game.hire[1]).toBe(2);
    expect(honour({ game: { ...pit(), hire: { 99: 1 } } as never, savedAt: 1 })).toBeNull();
    const { hire: _drop, ...older } = pit();
    expect(honour({ game: older as City, savedAt: 1 })!.game.hire).toEqual({});
    // ⚠️ AND AN OLD SAVE'S STACKED WORKS KEEP THEIR CREW. `capOf` counts
    // `stacks + hire`, so a town that stacked four quarries before the cap
    // does not lose three quarters of its workforce on load.
    const stacked = honour({ game: { ...pit(), stacks: { 0: 12, 1: 4 } },
      savedAt: 1 })!.game;
    expect(flow(stacked).hands.get(1)).toBe(CREW * 4);
  });
});

// ---------------------------------------------------------------------------
// ★★★ F0 — THE STARVATION DEAD END, 2026-08-11. The owner played a fresh
// valley into a town that could not be fed and could not be shrunk: *"People
// are starving… I don't understand where can I build another farm then… I
// think at this point, I'm not able to stop starving. There is no way."*
// They were right, and it was a regression: capping works at one per site
// capped FARMS at one per site, and nothing reduced the number of mouths.
// ---------------------------------------------------------------------------
describe('★★★ A TOWN CAN ALWAYS GET OUT OF A FAMINE', () => {
  // ⚠️ WITH SOMEWHERE TO WORK (2026-08-11). Growth stops at the number of
  // JOBS now, so a fixture of bare huts cannot grow at all and this suite
  // would have been measuring the wrong ceiling.
  const fieldless = (over: Partial<City> = {}): City => ({ ...initial(),
    stacks: { 0: 12, 1: 1, 2: 1 }, crew: { 1: 0, 2: 0 },
    paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1 },
    pop: 20, food: 400, ...over });

  it('★★★ A DEEP FAMINE COSTS PEOPLE, which is the way out', () => {
    const starved: City = { ...fieldless({ food: 0 }), famine: FAMINE_DEEP };
    const later = tick(starved, LEAVE_SECS * 3 + 1);
    expect(later.pop).toBeLessThan(starved.pop);
    // ...and it stops at the table the wild itself feeds, so a valley can
    // never empty out entirely and freeze the save.
    const long = tick(starved, LEAVE_SECS * 500);
    expect(long.pop).toBe(WILD_FED);
  });

  it('★★ a SHALLOW famine is still a squeeze to manage, not a rout', () => {
    const pinched: City = { ...fieldless({ food: 0 }), famine: 1 };
    expect(tick(pinched, LEAVE_SECS * 2).pop).toBe(pinched.pop);
  });

  it('★★★ AND IT CANNOT GROW ITSELF BACK INTO ONE: settlers want a surplus', () => {
    // A fieldless town on a running-down larder used to keep taking settlers
    // until the larder hit zero — the overshoot that built the dead end.
    //
    // ⚠️ THE LARDER MUST LAST THE TICK. At `food: 2` this passed with the old
    // rule restored, because the food ran out inside the tick and the OLD
    // rule's own clamp then held the population down — so the test was
    // measuring the empty larder, not the new gate. Caught by sabotage. The
    // larder below survives the whole tick and still sits under
    // `GROW_STORE`, which only the new rule refuses to grow on.
    const thin = fieldless({ food: roomOf(fieldless()) * GROW_STORE * 0.8, pop: 6 });
    expect(thin.food).toBeGreaterThan(hunger(thin) * GROW_SECS * 1.5 + 1);
    expect(tick(thin, GROW_SECS * 1.5).pop).toBe(6);
    // A stocked larder still carries the OPENING, or a fresh valley would
    // stall at the wild's table with no hands to quarry the first spear.
    const stocked = fieldless({ food: roomOf(fieldless()) * 0.9, pop: 6 });
    expect(tick(stocked, GROW_SECS * 4).pop).toBeGreaterThan(6);
  });

  it('★ a town with real fields grows on the surplus alone', () => {
    // Green Vale is rich; a staffed field out-earns what the town eats.
    const farmed: City = { ...initial(), goblins: {}, pop: 6, food: 3,
      stacks: { 0: 12, 9: 1 }, crew: { 9: CREW },
      paths: { [pathKey(0, 4)]: 1, [pathKey(4, 6)]: 1, [pathKey(6, 7)]: 1,
        [pathKey(7, 9)]: 1 } };
    expect(flow(farmed).food).toBeGreaterThan(hunger(farmed));
    expect(tick(farmed, GROW_SECS * 3).pop).toBeGreaterThan(6);
  });
});

// ---------------------------------------------------------------------------
// ★★★ N2 — THE EVENT LOG, 2026-08-11. The owner: *"maybe we should have an
// advanced log too. Event log."* And of the messages that flash over the
// board: *"'Scree Slope just taken' — they should go into the advanced log."*
// ---------------------------------------------------------------------------
describe('★★★ WHAT HAPPENED, WRITTEN DOWN', () => {
  const war = (over: Partial<City> = {}): City => ({ ...initial(), taken: 1,
    pop: 20, food: 9e5, stacks: { 0: 5, 1: 3, 2: 3, 3: 2 },
    paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 },
    goblins: { 4: 12 },
    hero: { hp: 0, spears: 1, part: 0, at: 9, trip: null }, ...over });

  it('★★★ a raid that lands is written down', () => {
    const g = war({ menace: { 4: 0.99 } });
    const out = tick(g, RAID_SECS + 1);
    expect(out.log.length).toBeGreaterThan(0);
    expect(out.log.join(' ')).toMatch(/raided|took/);
  });

  it('★★ so is a gate held, and by whom', () => {
    const g = war();
    const gate = raidTarget(g, 4)!;
    const held = tick({ ...g, menace: { 4: 0.99 },
      guard: { [gate]: GUARD_STOP } }, RAID_SECS + 1);
    expect(held.log.join(' ')).toMatch(/watch at .* turned a raid back/);
  });

  it('★★ and taking ground — the message that used to flash over the board', () => {
    const g: City = { ...initial(), food: 9e5,
      hero: { hp: 30, spears: 99, part: 0, at: 4, trip: null } };
    let x = apply(g, { type: 'assail', id: 4 });
    for (let i = 0; i < 12 && x.fight; i++) {
      x = tick(apply(x, { type: 'strike' }), BLOW_SECS + 0.01);
    }
    expect(x.goblins[4]).toBeUndefined();
    expect(x.log.join(' ')).toMatch(/High Meadow is taken/);
  });

  it('★ it keeps the newest and forgets the rest, and holds at the save door', () => {
    const many = Array.from({ length: LOG_KEEP + 20 }, (_, i) => `line ${i}`);
    const g: City = { ...war(), log: many.slice(0, LOG_KEEP) };
    expect(logged(many, 'newest').length).toBe(LOG_KEEP);
    expect(logged(many, 'newest').at(-1)).toBe('newest');
    expect(honour({ game: g, savedAt: 1 })!.game.log.length).toBe(LOG_KEEP);
    // ⚠️ An over-long log is TRIMMED, not refused: a save is not worth
    // throwing away over history.
    expect(honour({ game: { ...war(), log: many }, savedAt: 1 })!
      .game.log.length).toBe(LOG_KEEP);
    expect(honour({ game: { ...war(), log: [1] } as never, savedAt: 1 })).toBeNull();
    const { log: _drop, ...older } = war();
    expect(honour({ game: older as City, savedAt: 1 })!.game.log).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ★★★ N3 — A REASON TO GO, 2026-08-11. The owner, twice across two
// playthroughs: *"what is my motivation then here? I will just sit here, and
// I will not take any."* and *"I go on High Meadow. But what is there?
// There's no point for me at all. It doesn't attack me."* They were reading
// the rules correctly, which was the problem: goblins ignore a camp until you
// take something, so the optimal play was to never start.
// ---------------------------------------------------------------------------
describe('★★★ THE CAMPS SWELL WHILE YOU WAIT', () => {
  it('★★★ A HOLDING LEFT ALONE GROWS PAST ITS SPAWN', () => {
    const g = initial();
    expect(swellOf(g)).toBe(0);
    expect(spawnOf(g, 4)).toBe(GOBLINS[4]!.strength);
    const later = tick(g, SWELL_SECS / 2);
    expect(swellOf(later)).toBeCloseTo(SWELL_MAX / 2, 6);
    expect(spawnOf(later, 4)).toBeGreaterThan(GOBLINS[4]!.strength);
    // ...and it really does heal up to the higher ceiling. ⚠️ Through
    // `catchUp`, not one giant tick: a tick reads the clock ONCE at its start
    // (one Euler step, `STEP_SECS`), so a single two-hour step would swell by
    // nothing at all and cap the holding at its old spawn. That is the same
    // rule every other timer in this file obeys, and the reason `catchUp`
    // exists.
    const long = catchUp({ ...g, goblins: { 4: 1 } }, SWELL_SECS * 2);
    expect(long.goblins[4]!).toBeGreaterThan(GOBLINS[4]!.strength);
  });

  it('★★★ IT STARTS AT ZERO, so the tuned ladder is untouched at minute one', () => {
    // ⚠️ This is why the pressure is on the clock and not on the opening: the
    // solver tuned every rung against these numbers, and a swell that began
    // above zero would silently invalidate all of it.
    for (const id of [4, 5, 6, 7, 8, 9]) {
      expect(spawnOf(initial(), id)).toBe(GOBLINS[id]!.strength);
    }
  });

  it('★★ it stops climbing — a valley you neglect is harder, not impossible', () => {
    const forever = tick(initial(), SWELL_SECS * 50);
    expect(swellOf(forever)).toBe(SWELL_MAX);
    // ⚠️ AND THE CAP ITSELF MUST STAY BEATABLE. Asserting only that the clamp
    // fires passed with SWELL_MAX at 9 — a valley nobody could ever take, and
    // the pressure turned into a wall. The deepest holding at full swell has
    // to remain something a fully-armed hero can still face.
    expect(SWELL_MAX).toBeLessThanOrEqual(1.5);
    expect(spawnOf(forever, 9)).toBeCloseTo(GOBLINS[9]!.strength * (1 + SWELL_MAX), 6);
  });

  it('★ the clock runs while you are away, but takes nothing', () => {
    // `docs/BRIEF.md`: timers bank work, they never punish absence. A swollen
    // valley is a harder valley, never a poorer one — the stores are exactly
    // what an idle live run would have made.
    const g: City = { ...initial(), stacks: { 0: 2, 1: 1 },
      paths: { [pathKey(0, 1)]: 1 }, pop: 6 };
    const away = catchUp(g, 3600);
    const live = tick(g, 3600);
    expect(away.since).toBeCloseTo(3600, 3);
    expect(away.stone).toBeGreaterThan(g.stone);
    expect(live.since).toBeCloseTo(away.since, 3);
  });

  it('★ the clock holds at the save door, and older saves start unswollen', () => {
    expect(honour({ game: { ...initial(), since: 500 }, savedAt: 1 })!
      .game.since).toBe(500);
    expect(honour({ game: { ...initial(), since: -1 }, savedAt: 1 })).toBeNull();
    const { since: _drop, ...older } = initial();
    expect(honour({ game: older as City, savedAt: 1 })!.game.since).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ★★★ F7 — BOTH WAYS DOWN ONE ROAD, 2026-08-11. The owner: *"I could see
// something was going from the camp to River Bend and not the other way
// around. In actuality lumber was going one way and planks the other. It was
// only showing one way."*
// ---------------------------------------------------------------------------
describe('★★★ A ROAD THAT CARRIES BOTH WAYS SAYS SO', () => {
  it('★★★ opposite traffic no longer cancels to a still road', () => {
    // Pines ship logs to the mill; the mill ships planks home. With the camp
    // wired to both, one edge carries in each direction.
    const g: City = { ...initial(), pop: 99, food: 9e5, goblins: {},
      stacks: { 0: huts(99), 2: 1, 3: 1 },
      // ⚠️ STAFF BOTH ENDS BY HAND. Left to auto-staffing the mill can end up
      // with no hands, and then no planks are sawn and nothing comes home —
      // which looks exactly like the bug this test is about.
      crew: { 2: CREW, 3: CREW },
      // ⚠️ A STAR, NOT A MESH. With 2|3 laid the logs go straight to the mill
      // and no single edge ever carries in both directions — the first
      // version of this test proved nothing for that reason. Through the
      // camp, edge 0|3 carries LOGS out and PLANKS home.
      paths: { [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 } };
    const f = flow(g);
    const two = [...f.both.entries()].filter(([, w]) => w.ab > 0 && w.ba > 0);
    expect(two.length).toBeGreaterThan(0);
    // ⚠️ AND THE NET IS THE LIE. On at least one of those edges the signed
    // net is far smaller than the traffic — that cancellation is exactly what
    // drew a busy road as a still one.
    const [key, way] = two[0]!;
    expect(way.ab + way.ba).toBeGreaterThan(Math.abs(f.dirs.get(key) ?? 0) * 1e-9);
    expect(f.loads.get(key)).toBeCloseTo(way.ab + way.ba, 6);
  });

  it('★ a one-way road still reports one way', () => {
    const g: City = { ...initial(), pop: 20, food: 9e5,
      stacks: { 0: huts(20), 1: 1 }, paths: { [pathKey(0, 1)]: 1 } };
    const way = flow(g).both.get(pathKey(0, 1));
    expect(way).toBeDefined();
    expect(Math.min(way!.ab, way!.ba)).toBe(0);
    expect(Math.max(way!.ab, way!.ba)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ★★★ N5 — WHAT THE HERO MEETS, 2026-08-11. The owner: *"I feel like we would
// benefit from choose your own adventure events."*
// ---------------------------------------------------------------------------
describe('★★★ A CHOICE ON THE ROAD', () => {
  const out = (g: City): City => tick(apply(g, { type: 'forage' }), FORAGE_SECS + 1);

  it('★★★ a foray turns something up, and it offers two real ways', () => {
    let g: City = { ...initial(), food: 99 };
    g = out(g);                       // foray 1 → a meeting
    expect(g.meet).not.toBeNull();
    const m = MEETS[g.meet!]!;
    expect(m.ways).toHaveLength(2);
    // ⚠️ BOTH WAYS ARE WORTH HAVING. A choice where one arm is strictly worse
    // is not a choice, it is a trap with two buttons.
    for (const w of m.ways) {
      const gain = Object.values(w.loot ?? {}).reduce((n, v) => n + v, 0)
        + (w.pop ?? 0) * 4;
      expect(gain).toBeGreaterThan(0);
    }
  });

  it('★★★ IT NEVER NAGS: the foray pays anyway, and the meeting waits', () => {
    // `CLAUDE.md`: HITL review is never mandatory — an idle game that demands
    // babysitting isn't one. The loot lands whether or not you ever answer.
    const g = out({ ...initial(), food: 99 });
    expect(g.stone).toBeGreaterThan(initial().stone);
    // ...and it is still there an hour later, blocking nothing.
    const later = catchUp(g, 3600);
    expect(later.meet).toBe(g.meet);
    expect(unforageable(later)).toBeNull();
  });

  it('★★ answering pays what it says and writes it down', () => {
    const g = out({ ...initial(), food: 99 });
    const m = MEETS[g.meet!]!;
    const took = apply(g, { type: 'answer', way: 0 });
    expect(took.meet).toBeNull();
    expect(took.log.at(-1)).toBe(m.ways[0].said);
    const want = m.ways[0].loot ?? {};
    for (const [k, v] of Object.entries(want)) {
      if (v > 0) {
        const good = k as 'stone' | 'logs' | 'planks' | 'food';
        expect(took[good]).toBeGreaterThan(g[good]);
      }
    }
    expect(took.pop).toBe(g.pop + (m.ways[0].pop ?? 0));
  });

  it('★ answering nothing is refused, and the save door keeps the meeting', () => {
    const quiet = initial();
    expect(apply(quiet, { type: 'answer', way: 0 })).toBe(quiet);
    expect(honour({ game: { ...initial(), meet: 2 }, savedAt: 1 })!.game.meet).toBe(2);
    expect(honour({ game: { ...initial(), meet: 999 }, savedAt: 1 })).toBeNull();
    const { meet: _drop, ...older } = initial();
    expect(honour({ game: older as City, savedAt: 1 })!.game.meet).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ★★★ N6 — THE PORTER WEARS ITS LOAD, 2026-08-11. The owner: *"the icons for
// the dots that go from the production side to the storage could be
// representing what's being actually transferred… at the moment it looks like
// conveyor belts, while it's not."*
// ---------------------------------------------------------------------------
describe('★★★ WHAT THE PORTERS ARE CARRYING', () => {
  it('★★★ each direction reports the good it mostly carries', () => {
    const g: City = { ...initial(), pop: 99, food: 9e5, goblins: {},
      stacks: { 0: huts(99), 1: 1, 2: 1, 3: 1 },
      crew: { 1: CREW, 2: CREW, 3: CREW },
      paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 } };
    const f = flow(g);
    // The quarry road carries stone home...
    const quarry = f.goods.get(pathKey(0, 1));
    expect(quarry?.ab ?? quarry?.ba).toBeTruthy();
    expect([quarry?.ab, quarry?.ba]).toContain('stone');
    // ...and the mill road carries logs out and planks back, which is the
    // exact road the complaint was about.
    const mill = f.goods.get(pathKey(0, 3));
    expect([mill?.ab, mill?.ba].filter(Boolean).sort())
      .toEqual(['logs', 'planks']);
  });

  it('★ a road nobody uses names no cargo', () => {
    const idle: City = { ...initial(), pop: 2, paths: { [pathKey(0, 1)]: 1 } };
    const way = flow(idle).goods.get(pathKey(0, 1));
    expect(way?.ab ?? null).toBeNull();
    expect(way?.ba ?? null).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ⚠️ THE PIN/FLOW DISAGREEMENT — found by chad-liquidity, 2026-08-11. `flow`
// caps a site's hands at `CREW × (stacks + hire)`; `pin` capped at
// `CREW × stacks`. So setting a hired site's crew by hand threw away every
// hire that had been paid for, on the one lever that lets a town grow past
// its slot count.
// ---------------------------------------------------------------------------
describe('★★ A HAND-SET CREW KEEPS ITS HIRES', () => {
  it('★★★ pin and flow agree about how many can work here', () => {
    const g: City = { ...initial(), pop: 60, food: 9e5,
      stacks: { 0: 20, 1: 1 }, hire: { 1: 2 },
      paths: { [pathKey(0, 1)]: 1 } };
    // flow says three crews can work it...
    expect(flow(g).hands.get(1)).toBe(CREW * 3);
    // ...so setting it by hand must be able to reach the same number.
    let x = g;
    for (let i = 0; i < 40; i++) x = apply(x, { type: 'pin', id: 1, d: 1 });
    expect(x.crew[1]).toBe(CREW * 3);
    expect(flow(x).hands.get(1)).toBe(CREW * 3);
  });
});

// ---------------------------------------------------------------------------
// ★★★ THE LEVY — 2026-08-11. The owner left the fork open: *"maybe we get rid
// of hero entirely and have just citizen militia squads… alternatively we
// keep the hero, maybe we'd be able to do some party based stuff too."*
// Hero AND party, drawn from the town — the only shape where POPULATION is a
// military input at the point of use.
// ---------------------------------------------------------------------------
describe('★★★ TOWNSFOLK MARCH WITH THE HERO', () => {
  const town = (over: Partial<City> = {}): City => ({ ...initial(),
    pop: 24, food: 9e5, stacks: { 0: 6, 1: 1 },
    paths: { [pathKey(0, 1)]: 1 },
    hero: { hp: 30, spears: 2, part: 0, at: 4, trip: null }, ...over });

  it('★★★ THE LEVY STANDS IN FRONT — the answer falls on them first', () => {
    const alone = apply(town(), { type: 'assail', id: 4 });
    const withUs = apply(town({ levy: 3 }), { type: 'assail', id: 4 });
    expect(alone.fight!.us).toHaveLength(0);
    expect(withUs.fight!.us).toHaveLength(3);
    // One full round each. The hero behind three bodies takes nothing.
    const beat = (g: City): City => tick(apply(g, { type: 'strike' }), BLOW_SECS + 0.01);
    expect(beat(alone).hero.hp).toBeLessThan(alone.hero.hp);
    expect(beat(withUs).hero.hp).toBe(withUs.hero.hp);
    expect(beat(withUs).fight!.us[0]!.hp).toBeLessThan(LEVY_HP);
  });

  it('★★★ AND IT COSTS THE TOWN ITS HANDS, which is the whole point', () => {
    // ⚠️ THE POOL MUST BIND. With more people than working slots the levy
    // comes out of the idle and nothing changes — the same trap the posted
    // watch's own test fell into. Six people, eight slots.
    const tight = (over: Partial<City> = {}): City => town({
      pop: 6, stacks: { 0: 2, 1: 1, 2: 1 },
      paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1 }, ...over });
    const home = tight();
    const out = apply(tight({ levy: 4 }), { type: 'assail', id: 4 });
    const hands = (g: City): number =>
      [...flow(g).hands.values()].reduce((n, h) => n + h, 0);
    expect(hands(out)).toBeLessThan(hands(home));
  });

  it('★★★ THEY DO NOT DIE — they come home HURT, and mend', () => {
    // ⚠️ No roster, no names, no graveyard: the cost of a war is measured in
    // hands, which is the currency the town already feels.
    let g = apply(town({ levy: 2 }), { type: 'assail', id: 4 });
    for (let i = 0; i < 20 && g.fight && g.hurt === 0; i++) {
      g = tick(apply(g, { type: 'strike' }), BLOW_SECS + 0.01);
    }
    expect(g.hurt).toBeGreaterThan(0);
    const wounded = g.hurt;
    // They are off the workfaces while they mend...
    expect(flow(g).hands.get(1) ?? 0).toBeLessThanOrEqual(CREW);
    // ...and back afterwards. The war costs TIME, not lives.
    expect(tick(g, MEND_SECS * 3).hurt).toBe(0);
    expect(tick(g, MEND_SECS * wounded * 0.4).hurt).toBeLessThan(wounded);
  });

  it('★★ you cannot levy people you do not have', () => {
    const small = town({ pop: 4, stacks: { 0: 1 }, levy: 99 });
    expect(levied(small).length).toBeLessThanOrEqual(levyCap(small));
    expect(levied(small).length).toBeLessThanOrEqual(Math.floor(housed(small)));
    // The posted watch and the already-hurt are not available either.
    const busy = town({ levy: 99, guard: { 1: 3 }, hurt: 2 });
    expect(levyCap(busy)).toBe(Math.max(0,
      Math.floor(housed(busy)) - 3 - 2));
  });

  it('★ the levy holds at the save door, and an older fight has none', () => {
    expect(honour({ game: { ...town(), levy: 3, hurt: 2 }, savedAt: 1 })!
      .game.levy).toBe(3);
    expect(honour({ game: { ...town(), levy: -1 }, savedAt: 1 })).toBeNull();
    // ⚠️ A save written MID-FIGHT before the levy existed has no line of its
    // own; it loads as an empty one and the hero takes the answer as always.
    const mid = apply(town(), { type: 'assail', id: 4 });
    const older = { ...mid, fight: { ...mid.fight!, us: undefined } } as never;
    expect(honour({ game: older, savedAt: 1 })!.game.fight!.us).toEqual([]);
  });
});
