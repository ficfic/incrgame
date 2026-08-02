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
import { PLACE, START, nameOf, THING } from './places';
import { solveFlow, EDGE_CAP } from './flow';

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
  /** Fractional progress toward the next pace, never shown.
   *
   *  ⚠️ THIS USED TO BE SECONDS and is now FRACTIONAL PACES. It could be
   *  seconds while the rate was the constant `SECS_PER_PACE`; it cannot be now
   *  that the rate is solved from the graph and changes the moment you settle
   *  or lay a route. Banking seconds against a rate that moves pays out at
   *  whatever the rate happened to be when the remainder was spent. */
  part: number;
  /** ★ PLACES THAT PRODUCE. A settled place is a source; where you stand is the
   *  sink; a made route is a pipe with a limit. See `flow.ts` — this array is
   *  half of the reason the economy reads the graph at all. */
  settled: number[];
  /** XP in the one skill that exists. ⚠️ ONE, deliberately: the content names
   *  five and `docs/TABS.md` is right that five skills over one activity is
   *  five names for the same number. The other four arrive with the work that
   *  trains them. */
  wayfaring: number;
  /** Seconds banked toward the current place's job. */
  workPart: number;
  /** ★ WHAT YOU CARRY. Keys, and things that are not keys yet. A SET in spirit:
   *  an item is a thing you have or have not got, never a stack, so crossing
   *  the same ground twice does not mint a second one. */
  pack: string[];
  /** ★ THE CHOICE, AND THE WHOLE REASON A SKILL CAN EXIST HERE. One clock, two
   *  things it can pay into: standing still pays paces, working pays XP, and
   *  you cannot have both. Without this there is one verb, nothing to choose
   *  between, and a skill is a badge. */
  busy: 'rest' | 'work';
  /** ⚠️ ROUTES YOU HAVE PROVED. `docs/TABS.md` R4.4: a solid edge is a route you
   *  can travel, a dotted one is not yet. Every way in the authored valley
   *  starts dotted — the shape of the world is visible from the first frame,
   *  but none of it is walkable until you have made it so. */
  solid: string[];
  /** The one route being forged, and how much of it is left. One at a time:
   *  two would need a screen to explain them. */
  forging: { key: string; left: number; secs: number } | null;
}

/** An edge's name, low id first so `a-b` and `b-a` are the same route. */
export const edgeKey = (a: number, b: number): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

/** ⚠️ ONE VERB. There was a `work` action and a `stop` action and a `working`
 *  flag, and a button to press to begin gathering.
 *
 *  The owner, after playing: "it was not working right not because of the
 *  slightly misaligned graph, but because of all the rest of the UI." They are
 *  right, and the rest of the UI existed to drive verbs the game did not need.
 *  STANDING STILL IS RESTING. Paces accrue because time passed, so there is
 *  nothing to start, nothing to remember to restart, and nothing to explain —
 *  and an idle game where you can forget to switch the idle on was never an
 *  idle game anyway.
 *
 *  What is left is: tap a place to go there. That is the whole input surface,
 *  and it is a graph. */
export type Action =
  | { type: 'tick'; secs: number }
  | { type: 'go'; to: number }
  /** Start filling the route between where you are and `to`. */
  | { type: 'forge'; to: number }
  /** Make where you stand produce. */
  | { type: 'settle' }
  /** Spend the clock on the place's job instead of on paces. */
  | { type: 'work' }
  | { type: 'rest' };

/** Seconds per pace with nothing settled reaching you — the floor, and the
 *  rate this game shipped with before income was solved from the graph. */
export const SECS_PER_PACE = 3;

/** ★ WHAT YOU ACTUALLY EARN, IN PACES A SECOND. The floor, plus everything the
 *  graph can deliver from your settled places to where you are standing.
 *
 *  ⚠️ NOT `base + per × settled.length`. That was the first draft and it is the
 *  defect this whole item exists to fix: a count cannot tell a valley from a
 *  shuffled valley. See `flow.ts`. */
export function rate(g: Game): number {
  return 1 / SECS_PER_PACE + solveFlow(g.at, g.settled, g.solid).total / 1000;
}

/** How much of its limit each made route is carrying, 0 to 1 — for drawing.
 *  A road you can SEE is full is a road you can see needs a second one. */
export function loadOf(g: Game, a: number, b: number): number {
  const on = solveFlow(g.at, g.settled, g.solid).on.get(edgeKey(a, b));
  return on === undefined ? 0 : Math.min(1, on / EDGE_CAP);
}

/** ⚠️ SETTLING IS THE SECOND SINK, and it competes with routes for the same
 *  paces — one currency, two things to want, which is what makes either of them
 *  a decision. Two currencies with one sink each is two lists. */
export const SETTLE_BASE = 30;
export const SETTLE_GROWTH = 1.22;
export function settleCost(g: Game): number {
  return Math.round(SETTLE_BASE * SETTLE_GROWTH ** g.settled.length);
}

/** Why you cannot settle where you stand, in English, or null if you can. */
export function unsettleable(g: Game): string | null {
  if (g.settled.includes(g.at)) return 'already settled';
  const cost = settleCost(g);
  if (cost > g.paces) return `${cost} paces — you have ${g.paces}`;
  return null;
}

// ---- the one skill --------------------------------------------------------
//
// ⚠️ WHY A SKILL IS POSSIBLE NOW AND WAS NOT BEFORE. `docs/TABS.md` recorded the
// block as structural, not scheduling: `costOf` and `forgeSecs` both keyed off
// `solid.length`, so a skill trained by MAKING WAYS rose in lockstep with the
// thing it was meant to offset and cancelled itself out. Wayfaring is trained by
// WORKING, which is time NOT spent gathering paces — so it is bought with the
// one thing the game is actually short of, and nothing about it cancels.

/** XP for level 2. Level n needs `XP_STEP × (n−1)²`, so the ladder stretches.
 *
 *  ⚠️ THE CAP AND THE STEP ARE SET BY THE CONTENT, NOT BY TASTE. The authored
 *  doors demand wayfaring 3, 5, 8 and 24. A cap of 10 would have left the
 *  deepest one in the stones permanently shut, which is a door with no key —
 *  worse than no door. So the cap clears the highest demand, and the step is
 *  chosen so the ladder to it is about seventy minutes of working rather than
 *  four hours: the code serves the content here, because the levels were
 *  written before this curve was. */
export const XP_STEP = 12;
export const LEVEL_CAP = 25;
export function levelOf(xp: number): number {
  return Math.min(LEVEL_CAP, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / XP_STEP)));
}
/** XP at which a level starts. `levelOf(xpFor(n)) === n` for n ≤ the cap. */
export function xpFor(level: number): number {
  return XP_STEP * (level - 1) ** 2;
}

/** A repeatable timed job at a place, from the authored content. */
export interface Job { label: string; secs: number; xp: number }

/** The job here, whether or not you are doing it. Null at a place with none —
 *  and most places have none, so WHERE YOU STAND decides whether the choice
 *  between resting and working is even on offer. */
export function jobAt(g: Game): Job | null {
  return PLACE.get(g.at)?.work ?? null;
}
/** The job you are actually doing, or null because you are standing still. */
export function working(g: Game): Job | null {
  return g.busy === 'work' ? jobAt(g) : null;
}

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

/** ⚠️ PACES BUY A ROUTE, NOT A STEP — and this is a PROPOSAL, flagged in
 *  `docs/TABS.md` as "whether forging replaces travel cost or sits beside it"
 *  being undecided. Resolved this way because two costs for one move is
 *  friction with nothing to show for it: you spend to FORGE a way, and once it
 *  is solid you may walk it as often as you like for nothing. The graph is then
 *  literally the thing you are building, which is the point of the game.
 *
 *  Priced off routes proved rather than places seen, for the same reason: the
 *  route is the thing you bought. */
export function costOf(g: Game, to: number): number {
  const key = edgeKey(g.at, to);
  if (g.solid.includes(key)) return 0;
  return Math.round(COST_BASE * COST_GROWTH ** g.solid.length);
}

/** How long a route takes to fill, in seconds. Grows with the price so a later
 *  route is a longer thing to watch, and stays short enough at the start that
 *  the first one is over before anybody wonders whether it is broken. */
export const FORGE_BASE = 12;
/** ★ AND THIS IS WHERE THE SKILL BITES. Wayfaring shortens the making, 8% a
 *  level, so a level 10 wayfarer lays a road in a little under half the time.
 *  One skill, one number, and the number is on the button before you press it. */
export const WAY_CUT = 0.92;
export function forgeSecs(g: Game): number {
  const cut = WAY_CUT ** (levelOf(g.wayfaring) - 1);
  return Math.max(4, Math.round(FORGE_BASE * 1.12 ** g.solid.length * cut));
}

/** Why you cannot go there, in English, or null if you can.
 *
 *  ⚠️ NEVER HIDDEN AND ALWAYS A REASON. Every version of this game that showed
 *  a control without saying why it was dead got the same report back: "I just
 *  randomly clicked around until I got to a stop." */
/** Why you cannot WALK there. R4.4: a dotted route is not one yet. */
export function blocked(g: Game, to: number): string | null {
  const here = PLACE.get(g.at);
  if (!here?.ways.includes(to)) return 'no way from here';
  if (!g.solid.includes(edgeKey(g.at, to))) return 'the way is not made yet';
  return null;
}

/** Why you cannot FORGE it. */
/** The wayfaring level it takes to open the way on from here, or 0 if none.
 *  `docs/BRIEF.md` ask 4: a level you have not reached is a door you cannot
 *  open, and you can see it from here. */
export function demandOn(g: Game, to: number): number {
  return PLACE.get(g.at)?.gate?.[to] ?? 0;
}

/** The item it takes to open the way on from here, or null — and null also
 *  when you are already carrying it, because a lock you have the key to is not
 *  a lock any more. */
export function lockOn(g: Game, to: number): string | null {
  const want = PLACE.get(g.at)?.key?.[to];
  return want && !g.pack.includes(want) ? want : null;
}

/** What crossing to `to` from here pays out, or null. `docs/BRIEF.md` forbids
 *  RNG in this engine and there is none: the level you have when you cross
 *  decides which of the two authored items you come away with.
 *
 *  ⚠️ EVALUATED ON EVERY CROSSING, WHICH IS WHAT KEEPS FAILURE A PLATEAU.
 *  Crossing under-levelled gives you the poor one — and walking a made way is
 *  free forever, so coming back at the level you needed gives you the good one.
 *  Judged once and never again, an early crossing would lock the door its key
 *  opens for the rest of the run, which is a loss screen with extra steps. */
export function payout(g: Game, to: number): string | null {
  const d = PLACE.get(g.at)?.drop?.[to];
  if (!d) return null;
  const got = levelOf(g.wayfaring) >= d.demand ? d.good : d.poor;
  return got && !g.pack.includes(got) ? got : null;
}

export function unforgeable(g: Game, to: number): string | null {
  const here = PLACE.get(g.at);
  if (!here?.ways.includes(to)) return 'nothing joins these';
  if (g.solid.includes(edgeKey(g.at, to))) return 'already made';
  // ★ THE DOOR, AND IT IS CHECKED BEFORE THE PRICE. Told it needs 24 paces you
  // do not have, you wait; told it needs a level you do not have, you go and
  // work. Reporting the cheaper obstacle first would send the player to do the
  // wrong thing, and this game's oldest complaint is "I just randomly clicked
  // around until I got to a stop".
  const want = demandOn(g, to);
  if (want > levelOf(g.wayfaring)) {
    return `wayfaring ${want} — you are ${levelOf(g.wayfaring)}`;
  }
  // ★ AND A LOCK, WHICH IS THE SAME RULE WITH A DIFFERENT KEY. A way that is
  // live BECAUSE its key is droppable (`places.ts`), so this can never be a
  // door with nothing behind it.
  const lock = lockOn(g, to);
  if (lock) return `you need the ${THING.get(lock)?.name ?? lock}`;
  // ★ YOU MAY ONLY BUILD OUT OF A PLACE THAT PRODUCES. This is the rule that
  // turns two lists into a game: pushing into the far valley means settling a
  // chain of bases behind you, so income is not a side dish to progress, it is
  // the gate on it. `engine.ts` has claimed "where you park decides what you
  // can reach" since the first commit; until this line it was a comment.
  if (!g.settled.includes(g.at)) return 'settle here first';
  if (g.forging) return 'you are already making one';
  const cost = costOf(g, to);
  if (cost > g.paces) return `${cost} paces — you have ${g.paces}`;
  return null;
}

export function initial(): Game {
  return {
    version: 2,
    at: START,
    seen: [START],
    paces: 0,
    part: 0,
    solid: [],
    forging: null,
    // ⚠️ WHERE YOU START IS ALREADY YOURS. Otherwise the first ninety seconds
    // of the game are spent gathering thirty paces to unlock the ability to do
    // anything at all, which teaches the loop by withholding it.
    settled: [START],
    pack: [],
    wayfaring: 0,
    workPart: 0,
    busy: 'rest',
  };
}

export function apply(g: Game, a: Action): Game {
  switch (a.type) {
    case 'tick': {
      if (a.secs <= 0) return g;
      // ⚠️ THE REMAINDER CARRIES, so a hundred small ticks pay what one big one
      // does. An hour watched and an hour away disagreeing by an accumulating
      // remainder is the bug that ate a run in the version before last.
      //
      // ★ AND THE CLOCK GOES TO EXACTLY ONE OF TWO PLACES. Working banks XP and
      // pays no paces; standing still pays paces and banks no XP. That is the
      // opportunity cost, and it is the whole reason there is a decision here.
      const job = working(g);
      let next: Game;
      if (job) {
        // The job repeats on its own. `docs/BRIEF.md`: timers bank work, they
        // never punish absence — so an absence spent working comes back with
        // levels instead of paces, which is a choice about what your absence is
        // FOR rather than a reason to check in.
        const t = g.workPart + a.secs;
        const done = Math.floor(t / job.secs);
        next = { ...g, workPart: t - done * job.secs, wayfaring: g.wayfaring + done * job.xp };
      } else {
        const total = g.part + a.secs * rate(g);
        const got = Math.floor(total);
        next = got > 0
          ? { ...g, paces: g.paces + got, part: total - got }
          : { ...g, part: total };
      }

      // ⚠️ THE FILL IS BANKED LIKE EVERYTHING ELSE. An absence finishes the
      // route it was left making — the one animation in the game is not a
      // reason to sit and watch it.
      if (next.forging) {
        const left = next.forging.left - a.secs;
        if (left > 0) {
          next = { ...next, forging: { ...next.forging, left } };
        } else {
          next = {
            ...next,
            solid: [...next.solid, next.forging.key],
            forging: null,
          };
        }
      }
      return next;
    }

    case 'forge': {
      if (unforgeable(g, a.to)) return g;
      // One call, used twice: `left` starts full, `secs` remembers the whole,
      // and the fill is the ratio between them.
      const secs = forgeSecs(g);
      return {
        ...g,
        paces: g.paces - costOf(g, a.to),
        forging: { key: edgeKey(g.at, a.to), left: secs, secs },
      };
    }

    case 'settle': {
      if (unsettleable(g)) return g;
      return { ...g, paces: g.paces - settleCost(g), settled: [...g.settled, g.at] };
    }

    case 'work': {
      // Nothing to work at is not an error, it is most of the valley.
      if (!jobAt(g)) return g;
      return { ...g, busy: 'work' };
    }

    case 'rest':
      return g.busy === 'rest' ? g : { ...g, busy: 'rest' };

    case 'go': {
      if (blocked(g, a.to)) return g;
      const dest = PLACE.get(a.to);
      if (!dest) return g;
      const first = !g.seen.includes(a.to);
      const got = payout(g, a.to);
      return {
        ...g,
        at: a.to,
        seen: first ? [...g.seen, a.to] : g.seen,
        pack: got ? [...g.pack, got] : g.pack,
        // ⚠️ THE JOB DOES NOT TRAVEL WITH YOU. Jobs have different lengths, so
        // carrying a half-finished one to a different place would pay it out
        // against the wrong clock — and silently leaving `busy` set would have
        // you arrive somewhere with no work and quietly earn nothing at all.
        busy: 'rest',
        workPart: 0,
        // ★ WALKING A MADE ROUTE IS FREE. The paces went into making it.
      };
    }
  }
}

/** Everything the screen needs about where you can go, already decided. */
export interface Way { to: number; name: string; cost: number; why: string | null;
  seen: boolean; made: boolean;
  /** ★ THE LEVEL THIS DOOR WANTS, 0 if it is not one. Carried out to the board
   *  so a door is a thing you can SEE from here rather than a sentence you find
   *  by tapping — `docs/BRIEF.md` ask 4 asks for exactly that, and a dot that
   *  looks identical to every other unmade way is not it. */
  bar: number;
  /** The item this way wants and you have not got, or null. */
  need: string | null }

export function waysFrom(g: Game): Way[] {
  const here = PLACE.get(g.at);
  if (!here) return [];
  return here.ways.map((to) => {
    const made = g.solid.includes(edgeKey(g.at, to));
    const want = demandOn(g, to);
    return {
      to,
      name: nameOf(to),
      cost: costOf(g, to),
      why: blocked(g, to),
      seen: g.seen.includes(to),
      made,
      // A door you have already opened is just a road. Only an unmade way that
      // outranks you is drawn barred.
      bar: !made && want > levelOf(g.wayfaring) ? want : 0,
      need: made ? null : lockOn(g, to),
    };
  });
}

/** Seconds until you could afford the cheapest thing you cannot afford yet.
 *  Null if there is nothing to wait for. This is the one number an idle game
 *  owes the player: how long until the next thing. */
export function waitFor(g: Game): { name: string; secs: number } | null {
  const short = waysFrom(g)
    .filter((wy) => !wy.made && wy.cost > g.paces)
    .sort((a, b) => a.cost - b.cost)[0];
  if (!short) return null;
  // ⚠️ AGAINST THE RATE YOU ACTUALLY HAVE. Dividing by the constant here would
  // quote a wait that settling has already shortened, which is the one number
  // an idle game owes the player being wrong in the direction that hurts most.
  return { name: short.name, secs: Math.ceil((short.cost - g.paces) / rate(g)) };
}
