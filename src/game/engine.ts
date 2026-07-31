// THE WHOLE GAME. One resource, two verbs, and nothing else until this is fun.
//
// ⚠️ WHY THIS FILE IS SO SMALL, and why that is the point.
//
// What it replaces had ELEVEN systems — skills, an XP curve, four stats on a
// fixed budget, 2d10 checks, satchels, fifteen gathering nodes, thirty-three
// materials, a currency, two sinks, an unlock ladder, offline banking. Each was
// built by its own agent, each passed its own tests, and none of them were
// designed against each other because I told every agent it could not see the
// others. Content parallelises. INTERLOCKING MECHANICS DO NOT — the interlocking
// IS the design. The result had no answer to "what am I doing in the next
// thirty seconds, and why".
//
// So: ONE loop.
//
//     You earn by standing still. You spend by moving.
//
// That is a complete idle loop and it makes the GRAPH the whole decision space,
// which is the part the owner has wanted from the beginning. Where you park
// decides what you can reach; what you can reach decides where to park next.
// Nothing is added until this is fun on its own.
//
// Pure: `apply(state, action) => state`. No DOM, no clock, no RNG. Time arrives
// as a `tick` carrying seconds, which is the one thing the old engine got right
// and is why offline catch-up is four lines rather than a subsystem.
import { PLACE, START, nameOf } from './places';

export interface Game {
  version: number;
  /** Where you are. */
  at: number;
  /** Everywhere you have been, in order of first arrival. */
  seen: number[];
  /** The only resource. Whole numbers — a fractional pace is not a thing you
   *  can take, and showing 4.7 of something you spend in ones is a readout
   *  arguing with itself. */
  paces: number;
  /** Fractional progress toward the next pace, never shown. */
  part: number;
  /** Whether the work here is running. One slot, because you have one pair of
   *  hands and two would need a screen to explain them. */
  working: boolean;
  /** The last thing that happened, in one line. */
  said: string;
}

export type Action =
  | { type: 'work' }
  | { type: 'stop' }
  | { type: 'tick'; secs: number }
  | { type: 'go'; to: number };

/** Seconds of work per pace. */
export const SECS_PER_PACE = 3;

/** ⚠️ THE WHOLE ECONOMY IS THIS LINE. Somewhere new costs more the more you
 *  have seen; somewhere you have been is free.
 *
 *  Free revisits are not generosity, they are what stops the graph becoming a
 *  corridor: if walking back cost anything the cheapest move would always be
 *  forward, and there would be no reason to hold a position. Free movement
 *  through known ground makes the decision always "which frontier do I open
 *  next", which is the decision the graph exists to pose.
 *
 *  ⚠️ GEOMETRIC, NOT LINEAR, AND THAT IS THE INCREMENTAL. This was
 *  `6 + 3 × seen`, which totals 2,106 paces for the whole valley — one and
 *  three quarter hours of resting, and a single two-hour absence finished the
 *  game outright. Measured on the first build: two hours away paid 2,401 paces
 *  against a map costing 2,106.
 *
 *  At 1.2 the k-th new place costs `6 × 1.2^(k−1)`:
 *
 *      1st     6 paces      18 seconds
 *      10th   31 paces      1½ minutes
 *      20th  192 paces      about 10 minutes
 *      30th  1,187 paces    about an hour
 *      36th  3,544 paces    about three hours
 *      all   21,231 paces   about 17.7 hours of resting
 *
 *  So an absence is a real gift and never the whole game, and the far end of
 *  the valley is somewhere you get to over days rather than in one sitting. */
export const COST_BASE = 6;
export const COST_GROWTH = 1.2;

export function costOf(g: Game, to: number): number {
  if (g.seen.includes(to)) return 0;
  return Math.round(COST_BASE * COST_GROWTH ** (g.seen.length - 1));
}

/** Why you cannot go there, in English, or null if you can.
 *
 *  ⚠️ NEVER HIDDEN AND ALWAYS A REASON. Every version of this game that showed
 *  a control without saying why it was dead got the same report back: "I just
 *  randomly clicked around until I got to a stop." */
export function blocked(g: Game, to: number): string | null {
  const here = PLACE.get(g.at);
  if (!here?.ways.includes(to)) return 'no way from here';
  const cost = costOf(g, to);
  if (cost > g.paces) return `${cost} paces — you have ${g.paces}`;
  return null;
}

export function initial(): Game {
  return {
    version: 1,
    at: START,
    seen: [START],
    paces: 0,
    part: 0,
    working: false,
    said: 'You are here. Rest to gather paces; spend them to go somewhere new.',
  };
}

export function apply(g: Game, a: Action): Game {
  switch (a.type) {
    case 'work': {
      const w = PLACE.get(g.at)?.work;
      if (!w || g.working) return g;
      return { ...g, working: true, said: `${w.label}…` };
    }

    case 'stop':
      return g.working ? { ...g, working: false, said: 'Stopped.' } : g;

    case 'tick': {
      if (!g.working || a.secs <= 0) return g;
      const w = PLACE.get(g.at)?.work;
      if (!w) return { ...g, working: false };
      // ⚠️ THE REMAINDER CARRIES, AND IT CARRIES IN SECONDS. Dropping it would
      // make a hundred small ticks pay less than one big one, and then an hour
      // watched and an hour away would disagree — the bug that ate a run in the
      // last version. Carrying SECONDS rather than fractions-of-a-pace defers
      // the division to one place, so sixty seconds delivered in six hundred
      // pieces and sixty delivered at once differ by float noise rather than by
      // an accumulating error.
      const total = g.part + a.secs;
      const got = Math.floor(total / SECS_PER_PACE);
      if (got <= 0) return { ...g, part: total };
      return {
        ...g,
        paces: g.paces + got,
        part: total - got * SECS_PER_PACE,
        said: `+${got} ${got === 1 ? 'pace' : 'paces'}.`,
      };
    }

    case 'go': {
      if (blocked(g, a.to)) return g;
      const dest = PLACE.get(a.to);
      if (!dest) return g;
      const cost = costOf(g, a.to);
      const first = !g.seen.includes(a.to);
      return {
        ...g,
        at: a.to,
        seen: first ? [...g.seen, a.to] : g.seen,
        paces: g.paces - cost,
        // Moving puts the work down. A timer running somewhere you are not is
        // a second place you exist and there is no screen for that.
        working: false,
        said: first ? dest.name : `Back to ${dest.name}.`,
      };
    }
  }
}

/** Everything the screen needs about where you can go, already decided. */
export interface Way { to: number; name: string; cost: number; why: string | null; seen: boolean }

export function waysFrom(g: Game): Way[] {
  const here = PLACE.get(g.at);
  if (!here) return [];
  return here.ways.map((to) => ({
    to,
    name: nameOf(to),
    cost: costOf(g, to),
    why: blocked(g, to),
    seen: g.seen.includes(to),
  }));
}

/** Seconds until you could afford the cheapest thing you cannot afford yet.
 *  Null if there is nothing to wait for. This is the one number an idle game
 *  owes the player: how long until the next thing. */
export function waitFor(g: Game): { name: string; secs: number } | null {
  const short = waysFrom(g)
    .filter((wy) => wy.cost > g.paces)
    .sort((a, b) => a.cost - b.cost)[0];
  if (!short || !PLACE.get(g.at)?.work) return null;
  return { name: short.name, secs: Math.ceil((short.cost - g.paces) * SECS_PER_PACE) };
}
