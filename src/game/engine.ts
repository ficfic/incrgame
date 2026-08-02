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
import { STOP, START, FINISH, nameOf, roadCost, roadsFrom, boreOf } from './stops';
import { maxFlow, loads, type Pipe } from './flow';
export { roadCost, START, FINISH } from './stops';

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
  /** The one road being worked, and the gauge it will reach. One at a time. */
  building: { key: string; left: number; secs: number; to: number } | null;
}

/** A road's name, low stop first, so `a-b` and `b-a` are the same road. */
export const roadKey = (a: number, b: number): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

export type Action =
  | { type: 'tick'; secs: number }
  | { type: 'go'; to: number }
  /** Lay the road between where you stand and `to`, or widen it if it is
   *  already there. One verb on the board, two things underneath. */
  | { type: 'build'; to: number };

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
 *  exists. A trickle: enough to lay the first road, not enough to enjoy. */
export const MANA_BASE = 0.34;

/** ★ WHAT THE KINGDOM CAN ACTUALLY PUSH DOWN THE LINE. A ceiling, and a
 *  deliberate one: widen past it and you are widening for nothing, which is
 *  exactly the "abundant but you don't need it any more" end of the curve. */
export const SPRING = 2.4;

/** The widest a road goes. Three is enough to make widening a real decision and
 *  few enough that the board can draw the difference. */
export const MAX_GAUGE = 3;

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

/** How long the work will take.
 *  ⚠️ SHORT TIMERS, on the owner's instruction: *"mainly short timers for now"*. */
export function buildSecs(g: Game, to: number): number {
  return Math.max(4, Math.round(priceOf(g, to) * 0.6));
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
  if (!((g.gauge[roadKey(g.at, to)] ?? 0) > 0)) return 'there is no pipe here yet';
  return null;
}

/** ★ THE CHAPTER IS DONE WHEN ONE PATH RUNS END TO END. *"one path yeah, done
 *  is done."* Not a percentage of the map — a crossing. */
export function crossed(g: Game): boolean {
  return reached(g).has(FINISH);
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
    version: 5,
    at: START,
    seen: [START],
    gauge: {},
    mana: 0,
    part: 0,
    building: null,
  };
}

export function apply(g: Game, a: Action): Game {
  switch (a.type) {
    case 'tick': {
      if (a.secs <= 0) return g;
      // ⚠️ THE REMAINDER CARRIES, so a hundred small ticks pay what one big one
      // does. An hour watched and an hour away disagreeing by an accumulating
      // remainder is a bug this project has shipped before.
      const total = g.part + a.secs * manaRate(g);
      const got = Math.floor(total);
      let next: Game = { ...g, mana: g.mana + got, part: total - got };

      if (next.building) {
        const left = next.building.left - a.secs;
        next = left <= 0
          ? {
            ...next,
            gauge: { ...next.gauge, [next.building.key]: next.building.to },
            building: null,
          }
          : { ...next, building: { ...next.building, left } };
      }
      return next;
    }

    case 'build': {
      if (unbuildable(g, a.to)) return g;
      const secs = buildSecs(g, a.to);
      const key = roadKey(g.at, a.to);
      return {
        ...g,
        mana: g.mana - priceOf(g, a.to),
        building: { key, left: secs, secs, to: (g.gauge[key] ?? 0) + 1 },
      };
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
        // making it.
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
