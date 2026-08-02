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
// ⚠️ WHAT THIS FILE REPLACED, and why so little of it survived. The previous
// engine had settling, working, a skill, doors, keys, fights and a max-flow
// income model. The owner reviewed it item by item and scrapped all of it. None
// of it is here and none of it should come back without being asked for.
//
// Pure: `apply(state, action) => state`. No DOM, no clock, no RNG. Time arrives
// as a `tick` carrying seconds.
import { STOP, START, FINISH, nameOf, roadCost, roadsFrom } from './stops';
export { roadCost, START, FINISH } from './stops';

export interface Game {
  version: number;
  /** The stop you are standing at. */
  at: number;
  /** Every stop you have stood at, in order of first arrival. */
  seen: number[];
  /** ★ ROADS YOU HAVE BUILT, as `"a|b"` keys. This IS the graph the game is
   *  about — not a number, a picture. A road that is built can be walked, and
   *  it carries mana. */
  built: string[];
  /** ★ THE RESOURCE. Whole numbers: a fraction of a mana is not a thing you can
   *  spend, and showing 4.7 of something you spend in ones is a readout arguing
   *  with itself. */
  mana: number;
  /** Fractional progress toward the next mana. Never shown. */
  part: number;
  /** The one road being built, and how much of it is left. One at a time. */
  building: { key: string; left: number; secs: number } | null;
}

/** A road's name, low stop first, so `a-b` and `b-a` are the same road. */
export const roadKey = (a: number, b: number): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

export type Action =
  | { type: 'tick'; secs: number }
  | { type: 'go'; to: number }
  /** Start building the road between where you stand and `to`. */
  | { type: 'build'; to: number };

// ---- mana -----------------------------------------------------------------
//
// ★ THE CURVE IS INVERTED ON PURPOSE, and it is the owner's design:
//
//   *"it's scarce until you've finished the location and once you're finished
//    it's abundant but like you don't need it anymore"*
//
// So mana arrives faster for every road already carrying it. Early in a chapter
// you are always short; by the end you are swimming in it and there is nothing
// left to spend it on. **The resource itself tells you when to leave**, and no
// progress bar has to say so.

/** What the king's road pushes out here before you have built anything. */
export const MANA_BASE = 0.34;
/** What each built road adds to the flow. */
export const MANA_PER_ROAD = 0.16;

export function manaRate(g: Game): number {
  return MANA_BASE + MANA_PER_ROAD * g.built.length;
}

/** How long the road you are about to build will take.
 *  ⚠️ SHORT TIMERS, on the owner's instruction: *"mainly short timers for now"*. */
export function buildSecs(g: Game, to: number): number {
  return Math.max(4, Math.round(roadCost(g.at, to) * 0.9));
}

// ---- where the mana reaches ------------------------------------------------

/** ★ EVERY STOP THE MANA CAN GET TO: the start, plus everywhere joined to it by
 *  built road. This is the rule the whole opening exists to set up — you cannot
 *  build from the middle, because out in the middle there is no mana. */
export function reached(g: Game): Set<number> {
  const near = new Map<number, number[]>();
  for (const k of g.built) {
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

/** Why you cannot build on to `to` from where you stand, in plain words, or
 *  null if you can. R3.3: a thing you cannot do shows its reason, never hides. */
export function unbuildable(g: Game, to: number): string | null {
  const here = STOP.get(g.at);
  if (!here?.near.includes(to)) return 'no road joins these';
  if (g.built.includes(roadKey(g.at, to))) return 'already built';
  if (g.building) return 'already building one';
  // ★ THE RULE THE OPENING IS FOR. Reported before the price, because you can
  // wait out a price and you cannot wait out being in the wrong place.
  if (!reached(g).has(g.at)) return 'no mana reaches here';
  const cost = roadCost(g.at, to);
  if (cost > g.mana) return `${cost} mana — you have ${g.mana}`;
  return null;
}

/** Why you cannot walk to `to`, or null. Walking a built road is always free. */
export function blocked(g: Game, to: number): string | null {
  const here = STOP.get(g.at);
  if (!here?.near.includes(to)) return 'no road joins these';
  if (!g.built.includes(roadKey(g.at, to))) return 'that road is not built yet';
  return null;
}

/** ★ THE CHAPTER IS DONE WHEN ONE PATH RUNS END TO END. *"one path yeah, done
 *  is done."* Not a percentage of the map — a crossing. */
export function crossed(g: Game): boolean {
  return reached(g).has(FINISH);
}

/** How far along each road is, for drawing. 1 is built, 0 is a dotted route you
 *  have not taken, and anything between is the one going in right now. */
export function fillOf(g: Game, a: number, b: number): number {
  const key = roadKey(a, b);
  if (g.built.includes(key)) return 1;
  if (g.building?.key === key) return 1 - g.building.left / g.building.secs;
  return 0;
}

export function initial(): Game {
  return {
    version: 3,
    at: START,
    seen: [START],
    built: [],
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
          ? { ...next, built: [...next.built, next.building.key], building: null }
          : { ...next, building: { ...next.building, left } };
      }
      return next;
    }

    case 'build': {
      if (unbuildable(g, a.to)) return g;
      const secs = buildSecs(g, a.to);
      return {
        ...g,
        mana: g.mana - roadCost(g.at, a.to),
        building: { key: roadKey(g.at, a.to), left: secs, secs },
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
        // Walking a built road is free, now and always. The mana went into
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
  built: boolean;
  seen: boolean;
  /** Why you cannot WALK it, or null. */
  why: string | null;
  /** Why you cannot BUILD it, or null. */
  cannot: string | null;
}

export function roadsOut(g: Game): Road[] {
  return roadsFrom(g.at).map((to) => ({
    to,
    name: nameOf(to),
    cost: roadCost(g.at, to),
    built: g.built.includes(roadKey(g.at, to)),
    seen: g.seen.includes(to),
    why: blocked(g, to),
    cannot: unbuildable(g, to),
  }));
}

/** The one number an idle game owes the player: how long until the cheapest
 *  road you cannot yet afford. Null when there is nothing to wait for. */
export function waitFor(g: Game): { name: string; secs: number } | null {
  const short = roadsOut(g)
    .filter((r) => !r.built && r.cost > g.mana)
    .sort((x, y) => x.cost - y.cost)[0];
  if (!short) return null;
  return { name: short.name, secs: Math.ceil((short.cost - g.mana) / manaRate(g)) };
}
