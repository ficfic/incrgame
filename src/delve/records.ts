// ★★★ THE RECORDS — 2026-08-20, the genre pass.
//
// ⚠️ TWO THINGS EVERY INCREMENTAL GAME HAS AND THIS ONE DID NOT.
//
// A STATISTICS SCREEN. Not vanity: an incremental is a game about a curve, and
// a player cannot feel a curve they cannot see. "Eleven delves, four falls,
// deepest floor 3" is the only place the shape of your own play is legible.
//
// AND MILESTONES THAT PAY. Genre achievements are not badges — they are the
// second progression track, the one that keeps turning while the first is
// saving up. So every one of these grants a permanent CUT of everything the
// dungeon pays from then on.
//
// ★★★ WHICH IS ALSO THE FIRST COMPOUNDING NUMBER IN THE GAME. Everything until
// now was additive and small: spoil 6, kit 24, life 20. An incremental with no
// multiplier is a to-do list, and `break_eternity` has been sitting in this
// project's stack unused since before the pivot because nothing ever grew.
//
// ⚠️ AND EVERY ONE IS A PURE PREDICATE OVER THE STATE. No hooks, no events, no
// "on kill" callbacks to forget to fire — the whole set is re-checked after
// every turn, which is cheap and cannot drift out of sync with the thing it
// is describing.
import type { Delve } from './engine';

/** What the game has counted about you. Every one of these is a number a
 *  player would want to know and could not previously see. */
export interface Tally {
  /** Runs begun — every time you go down from the Mouth. */
  delves: number;
  /** Runs that ended badly. */
  falls: number;
  /** Things killed. */
  kills: number;
  /** Turns taken, over all of it. */
  turns: number;
  /** The deepest floor ever reached. Survives everything. */
  deepest: number;
  /** Everything ever banked, before it was spent. */
  banked: number;
  /** Rooms stood in, over all floors and all runs. */
  walked: number;
  /** Crawlers sent down, and lost. */
  sent: number;
  lost: number;
}

export const NOTHING: Tally = {
  delves: 0, falls: 0, kills: 0, turns: 0, deepest: 1,
  banked: 0, walked: 0, sent: 0, lost: 0,
};

export interface Mark {
  id: string;
  name: string;
  says: string;
  won: (g: Delve) => boolean;
}

/** ★ HOW MUCH EACH MILESTONE IS WORTH, as a share of everything the dungeon
 *  pays. Fifteen percent each: eight of them is a bit over triple, which is a
 *  curve you can feel without making floor one's six gold meaningless. */
export const CUT = 0.15;

export const MARKS: Mark[] = [
  { id: 'first', name: 'First blood', says: 'clear a room',
    won: (g) => g.cleared.length > 1 || g.tally.kills > 0 },
  { id: 'banked', name: 'Something to show', says: 'bank 50',
    won: (g) => g.tally.banked >= 50 },
  { id: 'stair', name: 'Down the stair', says: 'reach floor 2',
    won: (g) => g.tally.deepest >= 2 },
  { id: 'chalk', name: 'A second opinion', says: 'find a relic',
    won: (g) => g.relics.length > 0 },
  { id: 'true', name: 'Cartographer', says: 'make a whole floor true',
    won: (g) => g.rooms.every((r) => g.trod.includes(r.id)) },
  { id: 'deep', name: 'Deep', says: 'reach floor 5',
    won: (g) => g.tally.deepest >= 5 },
  { id: 'walked', name: 'Underfoot', says: 'stand in 60 rooms',
    won: (g) => g.tally.walked >= 60 },
  { id: 'butcher', name: 'Butcher', says: 'put down 50 things',
    won: (g) => g.tally.kills >= 50 },
  { id: 'hoarder', name: 'Hoarder', says: 'bank 1,000',
    won: (g) => g.tally.banked >= 1000 },
  { id: 'lost', name: 'Acceptable losses', says: 'lose 10 crawlers',
    won: (g) => g.tally.lost >= 10 },
];

/** ★★★ THE MULTIPLIER. The first compounding number in the game. */
export const take = (g: Delve): number => 1 + CUT * g.won.length;

/** Everything newly true that was not already claimed. */
export const earned = (g: Delve): string[] =>
  MARKS.filter((m) => !g.won.includes(m.id) && m.won(g)).map((m) => m.id);
