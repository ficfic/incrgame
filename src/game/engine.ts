// KING'S ROADS. The whole engine.
//
// `docs/KINGS_ROADS.md` is the design and it is the owner's. This file is the
// smallest thing that is true to it:
//
//     A chapter is a crossing. A start, a finish, and several dotted routes
//     between them. You build ONE, end to end, and done is done.
//
//     Mana flows out along built road. That is why you cannot build from the
//     middle — construction is contiguous, extending from where the mana
//     already reaches.
//
// ★★ AND A ROAD IS NOW A PIPE, 2026-08-02, on the owner's call: *"maybe we are
// not laying roads, but laying like a mana ways like pipes… this way it's less
// boring and gives us more options."*
//
// What that changes, and it is the whole shape of the economy:
//
//   A road has a GAUGE. Laying it gives gauge 1; widening costs more and raises
//   it. That is the second verb — before this there was exactly one thing to do
//   with a road and one decision to make about it (which neighbour), which is
//   what "boring" was pointing at.
//
//   ★ INCOME IS THE FLOW THAT REACHES YOU, not a count of what you have built.
//   `flow.ts` solves max flow from the start to where you are standing, so a
//   long chain of narrow road delivers only what its tightest link allows, and
//   two routes to the same place ADD. Widening a bottleneck is worth more than
//   laying road where nothing is short — which is a decision, and there was not
//   one before.
//
//   ⚠️ AND THE GROUND FIGHTS ITSELF ON PURPOSE. `GOING` prices a road and `BORE`
//   says what it can carry, and they run OPPOSITE: moor is cheap and narrow,
//   stone is dear and wide. Without that the cheapest route would also be the
//   best one and the choice would be theatre.
//
// ⚠️ I ARGUED AGAINST THIS CHANGE AND THE OWNER MADE IT ANYWAY. The argument was
// that a max-flow economy was built and scrapped a day earlier. The half of it
// that still stands is at the top of `flow.ts`: the model earns its place only
// while the BOARD SHOWS the gauge and the load. A pipe economy you cannot see is
// the spreadsheet that got scrapped, wearing a better name.
//
// Pure: `apply(state, action) => state`. No DOM, no clock, no RNG. Time arrives
// as a `tick` carrying seconds.
import { STOP, START, FINISH, nameOf, roadCost, roadsFrom, boreOf, GOING } from './stops';
import { maxFlow, loads, type Pipe } from './flow';
import { judge, judgeBurned, burnHelps, legal, clampMomentum, START_STATS,
  MOMENTUM_START, MOMENTUM_RESET, type Roll, type Stat } from './dice';
import { HAPPENINGS, happeningsOn, foesOn, troubleById, isFoe,
  type Happening, type Foe } from './events';
import { sceneById, scenesOn, type Scene } from './scenes';
import { pathOf } from './paths';
import { climbOf } from './height';
export { roadCost, START, FINISH } from './stops';
export { STATS, type Stat, type Roll } from './dice';

/** ★ THE KIT. Chosen when you set off — the PREPARE half of the owner's loop:
 *  *"in order to start building a leg, you need to prepare first."* Each suits
 *  two grounds; set off suited and every roll on the leg carries +1, set off
 *  wrong and it carries -1. The cart does not care how brave you are in a bog. */
export const KITS = ['cart', 'mule', 'packs'] as const;
export type Kit = typeof KITS[number];
export const KIT_SUITS: Record<Kit, readonly string[]> = {
  cart: ['moor', 'stone'],
  mule: ['wood', 'crag'],
  packs: ['bog', 'water'],
};

/** The ground a leg answers to: the dearer end's, because that is the end
 *  that decides how the trip actually goes. */
export function legGround(key: string): string {
  const [a, b] = key.split('|').map(Number);
  const A = STOP.get(a!), B = STOP.get(b!);
  if (!A || !B) return 'moor';
  return (GOING[A.ground] ?? 1) >= (GOING[B.ground] ?? 1) ? A.ground : B.ground;
}

/** The +1 / -1 a kit brings to every roll on a leg. */
export function kitAdd(kit: Kit, key: string): number {
  const g = legGround(key);
  if (KIT_SUITS[kit].includes(g)) return 1;
  // The middle: a mule on the moor is merely slow, not wrong.
  const suitsAny = KITS.some((k) => k !== kit && KIT_SUITS[k].includes(g));
  return suitsAny && !KIT_SUITS[kit].includes(g) ? -1 : 0;
}

export interface Game {
  version: number;
  /** The stop you are standing at. */
  at: number;
  /** Every stop you have stood at, in order of first arrival. */
  seen: number[];
  /** ★ EVERY ROAD YOU HAVE LAID, AND HOW WIDE IT IS: `"a|b"` → gauge, 1 upward.
   *  This IS the graph the game is about — not a number, a network with widths
   *  in it. A road that is present can be walked, and it carries mana in
   *  proportion to its gauge and the ground it crosses. */
  gauge: Record<string, number>;
  /** ★ THE RESOURCE. Whole numbers: a fraction of a mana is not a thing you can
   *  spend, and showing 4.7 of something you spend in ones is a readout arguing
   *  with itself. */
  mana: number;
  /** Fractional progress toward the next mana. Never shown. */
  part: number;
  /** The one road being worked, and the gauge it will reach. One at a time.
   *  `from` is THE END YOU STARTED FROM — it is what the board fills away from,
   *  and where a finished lay carries you over from. The owner reported the
   *  fill growing from the wrong side twice before this field existed: the
   *  board had no way to know which end was yours, so it guessed the lower id.
   *  `halts` are THE HIDDEN STOPS still ahead of the work, as fractions of the
   *  build — the owner: *"they should not be visible but block progress until
   *  resolved."* Nothing draws them; the work simply stops there. */
  building: { key: string; from: number; left: number; secs: number; to: number;
    halts: number[]; kit: Kit } | null;
  /** ★ THE CREW'S STATS, Ironsworn's five. What a 2d10 roll leans on. */
  stats: Record<Stat, number>;
  /** ★ MOMENTUM — the banked kind. Burn it to overrule a bad roll. */
  momentum: number;
  /** ★ PROVISIONS — what the crew eats while trouble is faced. Ironsworn's
   *  Supply, 0..10. Weak hits and misses eat it; a MISS WITH NONE LEFT fails
   *  the whole leg. The other resource the owner asked for, and the one that
   *  makes an event mean something. */
  provisions: number;
  /** ★ SCAVENGING — Ironsworn's Resupply, worn local. The owner: *"so, like,
   *  scavenge for provisions."* Time spent at a stop with the crew idle, ended
   *  by a roll on the stat you chose going in. Trades the one thing the game
   *  is made of — time you could be laying pipe — for the resource legs run
   *  on. Null when nobody is out. */
  foraging: { secs: number; left: number; stat: 'wits' | 'shadow' } | null;
  /** ★ WHAT STANDS IN THE WAY RIGHT NOW, or null. While this is set, the
   *  building does not move: block, face, resolve, resume. */
  facing: {
    key: string;
    event: string;
    /** The roll, once thrown. Two-phase on purpose: Ironsworn burns momentum
     *  AFTER seeing the dice, so the result stands open until carried. */
    rolled: { choice: number; roll: Roll } | null;
    /** ★ SET WHEN THE TROUBLE FIGHTS BACK: how much strength it has left.
     *  A foe takes ROUNDS — Ironsworn's progress-track fight. Absent for a
     *  happening, and absent on saves from before foes existed. */
    foe?: { left: number };
    /** ★★ A SCENE — the encounter as its own little incremental game (the
     *  owner's design, 2026-08-05). Gauges drift with the tick, verbs are
     *  your taps, rules branch the stage or end it. When this is set the
     *  dice stay in the drawer: a scene is played, not rolled. */
    scene?: { stage: string; gauges: Record<string, number>; shown: string[] };
  } | null;
}

/** A road's name, low stop first, so `a-b` and `b-a` are the same road. */
export const roadKey = (a: number, b: number): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

export type Action =
  | { type: 'tick'; secs: number }
  /** ★ DRAW FROM THE SPRING BY HAND — the active layer. Worth `TAP` mana,
   *  carried through the same remainder as the trickle so a hundred taps pay
   *  exactly what they promise. */
  | { type: 'tap' }
  | { type: 'go'; to: number }
  /** Lay the road between where you stand and `to`, or widen it if it is
   *  already there. One verb on the board, two things underneath. */
  | { type: 'build'; to: number; kit: Kit }
  /** ★ FACE what stands in the way: pick a choice, and hand the engine the
   *  dice THE SHELL rolled — `apply` takes no randomness, ever. */
  | { type: 'face'; choice: number; roll: Roll }
  /** Accept the roll as it landed. */
  | { type: 'carry' }
  /** Burn momentum to overrule it. Only legal when it would actually help. */
  | { type: 'burn' }
  /** ★ PUSH THE CREW — one tap of work on the way. Respects halts exactly
   *  like the clock does: you cannot tap through trouble. */
  | { type: 'push' }
  /** ★★ TAP A VERB IN A SCENE. The whole encounter loop: deterministic
   *  effects, costs, reveals — the dice stay out of it. */
  | { type: 'scene'; verb: string }
  /** ★ SEND THE CREW SCAVENGING, on wits (the open ground) or shadow (other
   *  people's stores). The stat is chosen going IN — the dice come at the end. */
  | { type: 'forage'; stat: 'wits' | 'shadow' }
  /** See what the scavenging found. Legal only once the time is served. */
  | { type: 'gather'; roll: Roll };

// ---- mana -----------------------------------------------------------------
//
// ★ THE CURVE IS INVERTED ON PURPOSE, and it is the owner's design:
//
//   *"it's scarce until you've finished the location and once you're finished
//    it's abundant but like you don't need it anymore"*
//
// The pipes deliver that on their own rather than by a rule that says so. Early
// on the network is one narrow road and you are always short. By the end it is
// widened and doubled and delivers more than the spring can push — at which
// point there is nothing left worth spending it on. **The resource tells you
// when to leave**, and no progress bar has to.

/** What you have in hand at the head of the king's road, before a single pipe
 *  exists. ★ SHRUNK from 0.34 on 2026-08-03, the owner's design: *"for mana, we
 *  should make it a tapable resource so that you have to tap, tap, tap in order
 *  to get it, and this is your idle element."* The trickle alone is now too
 *  thin to live on — drawing from the spring by hand (the `tap` action) is
 *  where early mana comes from. */
export const MANA_BASE = 0.12;

/** ★ WHAT ONE DRAW OF THE HAND CHANNELS. Deliberately under a whole mana so
 *  the purse visibly fills across a burst of tapping rather than jumping per
 *  touch, and deliberately flat: fingers are the rate limit, and a yield that
 *  grew with the network would make tapping the endgame instead of the start. */
export const TAP = 0.4;

/** ★ THE CREW DAWDLE WITHOUT YOU. Work advances at this fraction of real
 *  time on its own — the owner: *"we're still moving without me doing much."*
 *  Waiting still finishes a leg, slowly; pushing is what makes it move. */
export const WORK_PACE = 0.4;

/** ★ ONE PUSH OF THE CREW — the `push` action, worth this much work. The
 *  journey's own tap-tap-tap: roughly three pushes buy a second of wall
 *  clock back, and a halt still stops everything until it is faced. */
export const PUSH_SECS = 1.2;

/** ★ WHAT THE KINGDOM CAN ACTUALLY PUSH DOWN THE LINE. A ceiling, and a
 *  deliberate one: widen past it and you are widening for nothing, which is
 *  exactly the "abundant but you don't need it any more" end of the curve. */
export const SPRING = 2.4;

/** The widest a road goes. Three is enough to make widening a real decision and
 *  few enough that the board can draw the difference. */
export const MAX_GAUGE = 3;

/** How long a scavenge takes. Longer than a tap-burst, shorter than a lay:
 *  it has to COST time to be a trade, and it has to fit inside one sitting. */
export const FORAGE_SECS = 18;

/** Why the crew cannot go scavenging right now, in plain words, or null. */
export function unforageable(g: Game): string | null {
  if (g.building) return 'the crew is out opening a flow';
  if (g.foraging) return 'already out scavenging';
  if (g.provisions >= 10) return 'your packs are full';
  return null;
}

/** Every road you have, as a pipe with what it can carry. */
export function pipes(g: Game): Pipe[] {
  const out: Pipe[] = [];
  for (const [k, n] of Object.entries(g.gauge)) {
    const [a, b] = k.split('|').map(Number);
    if (a === undefined || b === undefined || !(n > 0)) continue;
    out.push({ a, b, cap: n * boreOf(a, b) });
  }
  return out;
}

/** ★ MANA A SECOND: what this network delivers to where you are standing.
 *
 *  ⚠️ AT THE START IT IS THE TRICKLE, not the spring. Flow to the place the flow
 *  comes FROM is not a meaningful number, and the honest reading is that mana is
 *  pushed to the HEAD OF THE WORKS — so standing back at the start gets you what
 *  you can carry and nothing more. It is also why the game pushes you forward
 *  instead of letting you sit at the spring. */
export function manaRate(g: Game): number {
  if (g.at === START) return MANA_BASE;
  const got = maxFlow(pipes(g), START, g.at);
  return Math.min(SPRING, Math.max(MANA_BASE, got));
}

/** How hard each road is working, 0 to 1 — for drawing. A road at 1 is a road
 *  that wants widening, and it is meant to be visible without tapping it. */
export function loadOf(g: Game): Map<string, number> {
  if (g.at === START) return new Map();
  return loads(pipes(g), START, g.at);
}

/** What it costs to take this road to its next gauge. Laying is gauge 1 at the
 *  plain price; each widening after that costs that price again over. */
export function priceOf(g: Game, to: number): number {
  const next = (g.gauge[roadKey(g.at, to)] ?? 0) + 1;
  return roadCost(g.at, to) * next;
}

/** A deterministic wobble from a road's key — same trouble on every device,
 *  because a screenshot of an ambush must be reproducible. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0) / 4294967296;
}

/** ★ THE HIDDEN STOPS ON A FRESH LAY. The owner: *"2 to 3 stops while building
 *  it… not visible but block progress until resolved."* Dear ground carries
 *  two; easy ground carries one. Widening carries none — the trouble was faced
 *  when the line first went in. */
export function haltsFor(key: string, cost: number, climb = 0): number[] {
  // ★ THE LEG'S RANK, in trouble: length prices one extra stop, real climb
  // prices another. One to three — the owner asked for 2 to 3 on a real leg,
  // and an easy lowland hop earning only one is what makes the hard ones read.
  const n = 1 + (cost >= 14 ? 1 : 0) + (climb >= 40 ? 1 : 0);
  const out = [0.3 + hash(key) * 0.18];
  if (n >= 2) out.push(0.52 + hash(`${key}~`) * 0.16);
  if (n >= 3) out.push(0.74 + hash(`${key}#`) * 0.14);
  return out;
}

/** Which trouble waits at this road's next hidden stop. Drawn from the pool of
 *  both ends' grounds, by the road's own key. */
export function eventFor(key: string, halt: number): Happening {
  const [a, b] = key.split('|').map(Number);
  const pool = [
    ...happeningsOn(STOP.get(a!)?.ground ?? 'moor'),
    ...happeningsOn(STOP.get(b!)?.ground ?? 'moor'),
  ];
  const all = pool.length ? pool : [...HAPPENINGS];
  return all[Math.floor(hash(`${key}@${halt}`) * all.length)]!;
}

/** How often a halt turns out to be something that fights back. */
export const FOE_ODDS = 0.45;

/** How often a halt is a SCENE where the ground offers one — the little
 *  incremental games take the front row. */
export const SCENE_ODDS = 0.6;

/** ★ THE SCENE AT A HALT, or null when this one rolls dice instead. */
export function sceneFor(key: string, halt: number): Scene | null {
  const [a, b] = key.split('|').map(Number);
  const pool = [
    ...scenesOn(STOP.get(a!)?.ground ?? 'moor'),
    ...scenesOn(STOP.get(b!)?.ground ?? 'moor'),
  ];
  if (!pool.length || hash(`${key}@${halt}#scene`) >= SCENE_ODDS) return null;
  return pool[Math.floor(hash(`${key}@${halt}#which-scene`) * pool.length)]!;
}

/** A fresh scene state, gauges at their starting marks, nothing revealed. */
export function sceneStart(sc: Scene): { stage: string; gauges: Record<string, number>; shown: string[] } {
  const gauges: Record<string, number> = {};
  for (const g of sc.gauges) gauges[g.id] = g.start;
  return { stage: sc.stages[0]!.id, gauges, shown: [] };
}

/** ★ THE RULES, checked in order — first match wins. Returns the game after
 *  any branch or ending. `cleared` opens the way (+1 momentum); `setback`
 *  costs a provision, knocks the work back a quarter and RESETS the scene —
 *  the trouble is still there — and with no provisions left it is the end of
 *  the leg, exactly like every other disaster in this game. */
function judgeScene(g: Game): Game {
  if (!g.facing?.scene || !g.building) return g;
  const sc = sceneById(g.facing.event);
  if (!sc) return g;
  const st = g.facing.scene;
  for (const r of sc.rules) {
    if (r.stages && !r.stages.includes(st.stage)) continue;
    const v = st.gauges[r.gauge] ?? 0;
    const hit = r.op === '>=' ? v >= r.value : v <= r.value;
    if (!hit) continue;
    if (r.goto && r.goto !== st.stage) {
      return { ...g, facing: { ...g.facing, scene: { ...st, stage: r.goto } } };
    }
    if (r.end === 'cleared') {
      return {
        ...g,
        momentum: clampMomentum(g.momentum + 1),
        facing: null,
        building: { ...g.building, halts: g.building.halts.slice(1) },
      };
    }
    if (r.end === 'setback') {
      if (g.provisions <= 0) {
        return { ...g, momentum: clampMomentum(g.momentum - 2), building: null, facing: null };
      }
      return {
        ...g,
        provisions: Math.max(0, g.provisions - 1),
        momentum: clampMomentum(g.momentum - 1),
        building: {
          ...g.building,
          left: Math.min(g.building.secs, g.building.left + g.building.secs * 0.25),
        },
        facing: { ...g.facing, scene: sceneStart(sc) },
      };
    }
  }
  return g;
}

/** Clamp a gauge into its own rails. */
const railed = (sc: Scene, id: string, v: number): number => {
  const spec = sc.gauges.find((x) => x.id === id);
  return spec ? Math.max(spec.min, Math.min(spec.max, v)) : v;
};

/** ★ WHAT ACTUALLY WAITS AT A HALT — a happening, or a FOE. Deterministic
 *  from the road and the spot, like everything the map promises: the same
 *  leg meets the same trouble on every device. */
export function troubleFor(key: string, halt: number): Happening | Foe {
  const [a, b] = key.split('|').map(Number);
  const foes = [
    ...foesOn(STOP.get(a!)?.ground ?? 'moor'),
    ...foesOn(STOP.get(b!)?.ground ?? 'moor'),
  ];
  if (foes.length && hash(`${key}@${halt}#foe`) < FOE_ODDS) {
    return foes[Math.floor(hash(`${key}@${halt}#which`) * foes.length)]!;
  }
  return eventFor(key, halt);
}

/** ★ WHAT THE LEG CLIMBS, ascent and descent together, along the road's real
 *  bent course. The number that makes a route PLANNED: two legs of equal price
 *  can differ three-fold here, and from the expedition loop on this is what
 *  ranks a leg's difficulty. */
export function climbTo(g: Game, to: number): number {
  const p = pathOf(g.at, to);
  return Math.round(p ? climbOf(p) : 0);
}

/** How long the work will take. Climb slows it: a leg over the ridge takes
 *  visibly longer than its twin round the side, at the same price — the first
 *  mechanical tooth of *"we need to slow the game down way more."*
 *  ⚠️ Still short timers overall, on the owner's standing instruction. */
export function buildSecs(g: Game, to: number): number {
  return Math.max(4, Math.round(priceOf(g, to) * 0.6 + climbTo(g, to) * 0.2));
}

// ---- where the mana reaches ------------------------------------------------

/** ★ EVERY STOP THE MANA CAN GET TO: the start, plus everywhere joined to it by
 *  road you have laid. This is the rule the whole opening exists to set up — you
 *  cannot build from the middle, because out in the middle there is no mana. */
export function reached(g: Game): Set<number> {
  const near = new Map<number, number[]>();
  for (const [k, n] of Object.entries(g.gauge)) {
    if (!(n > 0)) continue;
    const [a, b] = k.split('|').map(Number);
    if (a === undefined || b === undefined) continue;
    (near.get(a) ?? near.set(a, []).get(a)!).push(b);
    (near.get(b) ?? near.set(b, []).get(b)!).push(a);
  }
  const out = new Set([START]);
  const queue = [START];
  for (let h = 0; h < queue.length; h++) {
    for (const n of near.get(queue[h]!) ?? []) {
      if (!out.has(n)) { out.add(n); queue.push(n); }
    }
  }
  return out;
}

/** Why you cannot work on the road to `to` from where you stand, in plain
 *  words, or null. R3.3: a thing you cannot do shows its reason, never hides. */
export function unbuildable(g: Game, to: number): string | null {
  const here = STOP.get(g.at);
  if (!here?.near.includes(to)) return 'nothing joins these';
  if (g.building) return 'already building one';
  if (g.foraging) return 'the crew is out scavenging';
  if ((g.gauge[roadKey(g.at, to)] ?? 0) >= MAX_GAUGE) return 'as wide as it goes';
  // ★ THE RULE THE OPENING IS FOR. Reported before the price, because you can
  // wait out a price and you cannot wait out being in the wrong place.
  if (!reached(g).has(g.at)) return 'no mana reaches here';
  const cost = priceOf(g, to);
  if (cost > g.mana) return `${cost} mana — you have ${g.mana}`;
  return null;
}

/** Why you cannot walk to `to`, or null. Walking a laid road is always free. */
export function blocked(g: Game, to: number): string | null {
  const here = STOP.get(g.at);
  if (!here?.near.includes(to)) return 'nothing joins these';
  if (!((g.gauge[roadKey(g.at, to)] ?? 0) > 0)) return 'no flow is open here yet';
  return null;
}

/** How many pipes deep each reached stop is from the start — the direction the
 *  mana travels, for drawing the flow. Not gameplay: the board animates along
 *  falling-hop order and nothing else reads this. */
export function hopsFrom(g: Game): Map<number, number> {
  const near = new Map<number, number[]>();
  for (const [k, n] of Object.entries(g.gauge)) {
    if (!(n > 0)) continue;
    const [a, b] = k.split('|').map(Number);
    if (a === undefined || b === undefined) continue;
    (near.get(a) ?? near.set(a, []).get(a)!).push(b);
    (near.get(b) ?? near.set(b, []).get(b)!).push(a);
  }
  const out = new Map<number, number>([[START, 0]]);
  const queue = [START];
  for (let h = 0; h < queue.length; h++) {
    for (const n of near.get(queue[h]!) ?? []) {
      if (!out.has(n)) { out.set(n, out.get(queue[h]!)! + 1); queue.push(n); }
    }
  }
  return out;
}

/** ★ THE CHAPTER IS DONE WHEN ONE PATH RUNS END TO END. *"one path yeah, done
 *  is done."* Not a percentage of the map — a crossing. */
export function crossed(g: Game): boolean {
  return reached(g).has(FINISH);
}

/** ★ YOUR KEN: every stop you have stood at, and every stop one route away
 *  from one of those. The fog of war's rule — inside it stops have names and
 *  the land is charted; beyond it the chart is parchment and the dots are
 *  bare. One route out, because the routes are surveyed: you always know
 *  where you COULD go, never what it is like there. */
export function ken(g: Game): Set<number> {
  const out = new Set<number>(g.seen);
  for (const id of g.seen) {
    for (const n of STOP.get(id)?.near ?? []) out.add(n);
  }
  return out;
}

/** The chart is complete when you have stood everywhere — the fog lifts for
 *  good and the map becomes the finished document it was pretending to be. */
export function charted(g: Game): boolean {
  return g.seen.length >= STOP.size;
}

/** How far along each road is, for drawing. 1 is laid, 0 is a dotted route you
 *  have not taken, and anything between is the one going in right now. */
export function fillOf(g: Game, a: number, b: number): number {
  const key = roadKey(a, b);
  if (g.gauge[key]) return 1;
  if (g.building?.key === key) return 1 - g.building.left / g.building.secs;
  return 0;
}

export function initial(): Game {
  return {
    version: 8,
    at: START,
    seen: [START],
    gauge: {},
    mana: 0,
    part: 0,
    building: null,
    stats: { ...START_STATS },
    momentum: MOMENTUM_START,
    provisions: 6,
    foraging: null,
    facing: null,
  };
}

/** ★ THE WORK ADVANCES — by the clock at WORK_PACE, or by a push. One
 *  function, so a halt, a completion and an arrival mean the same thing
 *  whichever way the work got there. */
function advance(g: Game, work: number): Game {
  if (!g.building || g.facing || work <= 0) return g;
  let next = g;
  const left = next.building!.left - work;
  // ★ THE HIDDEN STOP. The work reaches it and stops dead — the fill sits
  // exactly there until the trouble is faced. Blocks PROGRESS, not you:
  // you can still walk, and the mana still comes.
  const halt = next.building!.halts[0];
  if (halt !== undefined) {
    const leftAtHalt = next.building!.secs * (1 - halt);
    if (left <= leftAtHalt) {
      // ★★ A SCENE FIRST, where the ground offers one — the encounter as its
      // own incremental game. Otherwise the dice encounter, tracked as ever.
      const sc = sceneFor(next.building!.key, halt);
      if (sc) {
        return {
          ...next,
          building: { ...next.building!, left: leftAtHalt },
          facing: { key: next.building!.key, event: sc.id, rolled: null,
            scene: sceneStart(sc) },
        };
      }
      const t = troubleFor(next.building!.key, halt);
      return {
        ...next,
        building: { ...next.building!, left: leftAtHalt },
        facing: {
          key: next.building!.key,
          event: t.id,
          rolled: null,
          foe: { left: t.strength },
        },
      };
    }
  }
  if (left > 0) return { ...next, building: { ...next.building!, left } };
  const done = next.building!;
  next = { ...next, gauge: { ...next.gauge, [done.key]: done.to }, building: null };
  // The crew forages as it settles the new stop in — the trickle that
  // keeps provisions alive until scavenging is a verb of its own.
  if (done.to === 1) {
    next = { ...next, provisions: Math.min(10, next.provisions + 1) };
  }
  // ★ A FINISHED LAY CARRIES YOU OVER. The owner: *"obviously when we
  // build a road somewhere we arrive there too."* Only a fresh lay — a
  // widening is work on a line you already walk — and only if you are
  // still standing where you started it, because you are free to wander
  // while the crew works and being teleported back would be worse.
  const [x, y] = done.key.split('|').map(Number);
  const far = x === done.from ? y! : x!;
  if (done.to === 1 && next.at === done.from && STOP.has(far)) {
    next = {
      ...next,
      at: far,
      seen: next.seen.includes(far) ? next.seen : [...next.seen, far],
    };
  }
  return next;
}

export function apply(g: Game, a: Action): Game {
  switch (a.type) {
    case 'tap': {
      // Same remainder as the tick: 0.4 five times is 2 mana, never 0.
      const total = g.part + TAP;
      const got = Math.floor(total);
      return { ...g, mana: g.mana + got, part: total - got };
    }

    case 'tick': {
      if (a.secs <= 0) return g;
      // ⚠️ THE REMAINDER CARRIES, so a hundred small ticks pay what one big one
      // does. An hour watched and an hour away disagreeing by an accumulating
      // remainder is a bug this project has shipped before.
      const total = g.part + a.secs * manaRate(g);
      const got = Math.floor(total);
      let next: Game = { ...g, mana: g.mana + got, part: total - got };

      // The scavenge serves its time. It stops at zero and WAITS — the dice
      // belong to the shell, so the tick cannot roll the result itself.
      if (next.foraging && next.foraging.left > 0) {
        next = {
          ...next,
          foraging: { ...next.foraging, left: Math.max(0, next.foraging.left - a.secs) },
        };
      }

      // ★★ A RUNNING SCENE DRIFTS — the incremental heartbeat of the
      // encounter. Ground multiplies the drift: the journey type is a
      // modifier, exactly the owner's sketch.
      if (next.facing?.scene && next.building) {
        const sc = sceneById(next.facing.event);
        if (sc) {
          const ground = legGround(next.building.key) as keyof NonNullable<Scene['mods']>;
          const mods = sc.mods?.[ground] ?? {};
          const st = next.facing.scene;
          const gauges = { ...st.gauges };
          for (const spec of sc.gauges) {
            if (!spec.drift) continue;
            gauges[spec.id] = railed(sc, spec.id,
              (gauges[spec.id] ?? spec.start) + spec.drift * (mods[spec.id] ?? 1) * a.secs);
          }
          next = { ...next, facing: { ...next.facing, scene: { ...st, gauges } } };
          next = judgeScene(next);
        }
      }

      // ⚠️ WORK MOVES SLOWER THAN THE CLOCK — WORK_PACE of it. The rest is
      // the player's to push. Same advance the push action uses, so the two
      // can never disagree about halts or arrival.
      return advance(next, a.secs * WORK_PACE);
    }

    case 'push': {
      return advance(g, PUSH_SECS);
    }

    case 'scene': {
      if (!g.facing?.scene || !g.building) return g;
      const sc = sceneById(g.facing.event);
      if (!sc) return g;
      const st = g.facing.scene;
      const verb = sc.verbs.find((v) => v.id === a.verb);
      if (!verb) return g;
      if (verb.stages && !verb.stages.includes(st.stage)) return g;
      if ((verb.mana ?? 0) > g.mana) return g;
      if ((verb.provisions ?? 0) > g.provisions) return g;
      const statVal = verb.stat ? (g.stats[verb.stat] ?? 1) : 0;
      const gauges = { ...st.gauges };
      for (const [id, base] of Object.entries(verb.effect)) {
        const per = verb.perStat?.[id] ?? 0;
        gauges[id] = railed(sc, id, (gauges[id] ?? 0) + base + per * statVal);
      }
      const shown = verb.reveals
        ? [...new Set([...st.shown, ...verb.reveals])] : st.shown;
      const next: Game = {
        ...g,
        mana: g.mana - (verb.mana ?? 0),
        provisions: g.provisions - (verb.provisions ?? 0),
        facing: { ...g.facing, scene: { stage: st.stage, gauges, shown } },
      };
      return judgeScene(next);
    }

    case 'build': {
      if (unbuildable(g, a.to)) return g;
      const secs = buildSecs(g, a.to);
      const key = roadKey(g.at, a.to);
      const fresh = (g.gauge[key] ?? 0) === 0;
      // ★ THE SUITED KIT IS STOCKED FROM THE PACKS — one provision to outfit
      // it. That is the choice the owner found missing: +1 on every roll now
      // COSTS something the rolls are protecting. No stock, no suited kit.
      const outfit = fresh && kitAdd(a.kit, key) === 1 ? 1 : 0;
      if (outfit > g.provisions) return g;
      return {
        ...g,
        mana: g.mana - priceOf(g, a.to),
        provisions: g.provisions - outfit,
        building: {
          key, from: g.at, left: secs, secs, to: (g.gauge[key] ?? 0) + 1,
          halts: fresh ? haltsFor(key, priceOf(g, a.to), climbTo(g, a.to)) : [],
          kit: a.kit,
        },
      };
    }

    case 'face': {
      if (!g.facing || g.facing.rolled || !legal(a.roll)) return g;
      const ev = troubleById(g.facing.event);
      if (!ev || !ev.choices[a.choice]) return g;
      return { ...g, facing: { ...g.facing, rolled: { choice: a.choice, roll: a.roll } } };
    }

    case 'carry':
    case 'burn': {
      if (!g.facing?.rolled || !g.building) return g;
      const ev = troubleById(g.facing.event)!;
      const choice = ev.choices[g.facing.rolled.choice]!;
      const stat = (g.stats[choice.stat] ?? 1) + kitAdd(g.building.kit, g.building.key);
      if (a.type === 'burn' && !burnHelps(g.facing.rolled.roll, stat, g.momentum)) return g;
      const out = a.type === 'burn'
        ? judgeBurned(g.facing.rolled.roll, g.momentum)
        : judge(g.facing.rolled.roll, stat);
      let next: Game = a.type === 'burn'
        ? { ...g, momentum: MOMENTUM_RESET }
        : g;

      // ★ CONSEQUENCES STILL UNIFORM (the owner rewrites events.ts without
      // touching a number) — but they land on PROVISIONS now, which is what
      // gives an event teeth: the crew eats through trouble, and a leg without
      // food left cannot survive a miss.
      const swing = out.twist ? 2 : 1;
      const fight = g.facing.foe;
      if (out.tier === 'strong') {
        // In a FIGHT a strong hit is harm dealt, not banked momentum — the
        // kill pays the momentum at the end.
        if (!fight) next = { ...next, momentum: clampMomentum(next.momentum + swing) };
      } else if (out.tier === 'weak') {
        next = { ...next, provisions: Math.max(0, next.provisions - swing) };
      } else {
        // ★★ THE LEG CAN FAIL. A miss with the provisions gone is the end of
        // the expedition: the work is abandoned, the mana is sunk, momentum
        // takes the full hit, and you are still standing where you started.
        // The owner: *"when you fail, you go back either completely or a
        // little bit, lose resources and so on."*
        if (next.provisions <= 0) {
          return {
            ...next,
            momentum: clampMomentum(next.momentum - 2),
            building: null,
            facing: null,
          };
        }
        next = {
          ...next,
          provisions: Math.max(0, next.provisions - 1),
          momentum: clampMomentum(next.momentum - swing),
          building: {
            ...next.building!,
            left: Math.min(next.building!.secs,
              next.building!.left + next.building!.secs * 0.25 * swing),
          },
        };
      }

      // ★★ A FOE TAKES ROUNDS. Strong marks two of its strength (three on
      // matched dice), weak marks one, a miss marks nothing — and until it
      // is dead the halt is not behind you: the fight simply asks again.
      if (fight) {
        const harm = out.tier === 'strong' ? 1 + swing : out.tier === 'weak' ? 1 : 0;
        const leftNow = fight.left - harm;
        if (leftNow > 0) {
          return {
            ...next,
            facing: { ...next.facing!, rolled: null, foe: { left: leftNow } },
          };
        }
        // The kill: momentum rises, and the way is clear.
        next = { ...next, momentum: clampMomentum(next.momentum + 1) };
      }
      // Faced is faced, whatever the dice said: the hidden stop is behind you.
      return {
        ...next,
        facing: null,
        building: { ...next.building!, halts: next.building!.halts.slice(1) },
      };
    }

    case 'forage': {
      if (unforageable(g)) return g;
      if (a.stat !== 'wits' && a.stat !== 'shadow') return g;
      return { ...g, foraging: { secs: FORAGE_SECS, left: FORAGE_SECS, stat: a.stat } };
    }

    case 'gather': {
      // Legal only once the time is served — see-what-you-found is the END of
      // the trade, not a way around it.
      if (!g.foraging || g.foraging.left > 0 || !legal(a.roll)) return g;
      const out = judge(a.roll, g.stats[g.foraging.stat] ?? 1);
      const swing = out.twist ? 2 : 1;
      // ★ TWO WAYS OUT, TWO RISK SHAPES — the owner found wits and shadow
      // identical and asked what the point was. Now: WITS is the safe walk
      // (smaller finds, gentle misses); SHADOW is the greedy one (bigger
      // finds, and a miss means you were CAUGHT — it eats food and nerve).
      const greedy = g.foraging.stat === 'shadow';
      if (out.tier === 'strong') {
        return { ...g, foraging: null,
          provisions: Math.min(10, g.provisions + 1 + swing + (greedy ? 1 : 0)) };
      }
      if (out.tier === 'weak') {
        return { ...g, foraging: null,
          provisions: Math.min(10, g.provisions + 1),
          momentum: greedy ? clampMomentum(g.momentum - swing) : g.momentum };
      }
      return greedy
        ? { ...g, foraging: null,
          provisions: Math.max(0, g.provisions - 1),
          momentum: clampMomentum(g.momentum - 1 - swing) }
        : { ...g, foraging: null, momentum: clampMomentum(g.momentum - 1) };
    }

    case 'go': {
      if (blocked(g, a.to)) return g;
      if (!STOP.has(a.to)) return g;
      const first = !g.seen.includes(a.to);
      return {
        ...g,
        at: a.to,
        seen: first ? [...g.seen, a.to] : g.seen,
        // Walking a laid road is free, now and always. The mana went into
        // making it. ⚠️ Walking off ABANDONS a scavenge — the time is lost,
        // said in the deed's note rather than silently.
        foraging: null,
      };
    }
  }
}

/** Every road out of here, with what it costs and why it is or is not open.
 *  One place, so every tab says the same thing about the same road. */
export interface Road {
  to: number;
  name: string;
  cost: number;
  /** 0 if it is not laid, else how wide it is. */
  gauge: number;
  /** What one gauge of this road can carry, in mana a second. The number that
   *  makes widening a decision rather than a guess. */
  bore: number;
  built: boolean;
  seen: boolean;
  /** Why you cannot WALK it, or null. */
  why: string | null;
  /** Why you cannot BUILD or WIDEN it, or null. */
  cannot: string | null;
}

export function roadsOut(g: Game): Road[] {
  return roadsFrom(g.at).map((to) => ({
    to,
    name: nameOf(to),
    cost: priceOf(g, to),
    gauge: g.gauge[roadKey(g.at, to)] ?? 0,
    bore: boreOf(g.at, to),
    built: (g.gauge[roadKey(g.at, to)] ?? 0) > 0,
    seen: g.seen.includes(to),
    why: blocked(g, to),
    cannot: unbuildable(g, to),
  }));
}

/** The one number an idle game owes the player: how long until the cheapest
 *  work you cannot yet afford. Null when there is nothing to wait for. */
export function waitFor(g: Game): { name: string; secs: number } | null {
  const short = roadsOut(g)
    .filter((r) => r.cannot !== null && r.cost > g.mana)
    .sort((x, y) => x.cost - y.cost)[0];
  if (!short) return null;
  return { name: short.name, secs: Math.ceil((short.cost - g.mana) / manaRate(g)) };
}
