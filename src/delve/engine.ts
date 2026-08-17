// THE DELVE ENGINE — pure, and the only pattern that survived every pivot.
//
// `apply(state, action) => state`. No DOM, no clock, no RNG: the clock is a
// `tick` action and there is no randomness anywhere, because a deterministic
// fight can be SOLVED and a solved fight is the only reason this project has
// ever been able to say a difficulty curve holds.
//
// ★ Slice one, 2026-08-16. A dungeon you walk, rooms that hold something, a
// turn-based fight when you meet it, and a way back up with what you carry.
// That is all. See `dungeon.ts` for why it is a fixed map and not a generated
// one, and `CLAUDE.md` rule 3 for why there is no design document.
import { ROOM, ROOMS, WALK_SECS, GUARDS, SPOIL, type Guard } from './dungeon';

export const DELVE_VERSION = 1;

/** A square in the line, once the fight has started. */
export interface Foe { hp: number; bite: number; name: string }

export interface Fight {
  /** Where it is happening — a fight belongs to a ROOM, never to a screen. */
  room: number;
  line: Foe[];
  /** Which square the delver is swinging at. */
  at: number;
  round: number;
}

export interface Delve {
  version: number;
  /** The room the delver stands in. */
  at: number;
  /** Rooms whose EXISTENCE is known — you have stood in them or next to one. */
  seen: number[];
  /** Rooms whose guards are dead. A cleared room stays cleared. */
  cleared: number[];
  /** Walking a door takes time; this is the walk in progress. */
  walk: { to: number; left: number; secs: number } | null;
  hp: number;
  /** ★ Carried this trip. Lost if you fall, banked if you climb out. */
  purse: number;
  /** ★ Banked at the mouth, across trips. The incremental spine. */
  hoard: number;
  fight: Fight | null;
  /** ★ Where the delver's body is, if they fell. Null while alive. */
  fallen: boolean;
  log: string[];
}

export const START_HP = 12;
export const LOG_KEEP = 40;
/** What the delver's swing is worth. Grows with the hoard spent on it later;
 *  flat for slice one, because a curve nobody has played is a guess. */
export const BITE = 3;
export const LOG_LINES = (log: string[], line: string): string[] =>
  [...log, line].slice(-LOG_KEEP);

export const initial = (): Delve => ({
  version: DELVE_VERSION,
  at: 0,
  // ⚠️ THE MOUTH AND WHAT IT OPENS ON. You always know the room you are in
  // and the doors out of it — a graph you cannot see one step of is not a
  // choice, it is a corridor.
  seen: [0, ...(ROOM.get(0)?.doors ?? [])],
  cleared: [0],
  walk: null,
  hp: START_HP,
  purse: 0,
  hoard: 0,
  fight: null,
  fallen: false,
  log: [],
});

/** Every room you can see from here — where you stand, and its doors. */
export const doorsOf = (id: number): number[] => ROOM.get(id)?.doors ?? [];

/** Is this room's guard still standing? */
export const held = (g: Delve, id: number): boolean =>
  !g.cleared.includes(id) && (GUARDS[ROOM.get(id)?.kind ?? 'hall'] !== null);

/** What waits in a room, built fresh from its depth. */
export const guardsIn = (id: number): Guard[] => {
  const r = ROOM.get(id);
  if (!r) return [];
  return GUARDS[r.kind]?.(r.deep) ?? [];
};

/** ★ Why the delver cannot walk there, in plain words, or null.
 *  ⚠️ PLAIN WORDS, NOT A BOOLEAN. Every refusal in this project has to be
 *  able to say WHY on the button; that rule survived the pivot because it is
 *  the one the owner complained about most. */
export function unwalkable(g: Delve, to: number): string | null {
  if (g.fallen) return 'You are done.';
  if (g.fight) return 'Something is in the way.';
  if (g.walk) return 'Already on the move.';
  if (to === g.at) return 'You are here.';
  if (!ROOM.has(to)) return 'There is no such room.';
  if (!doorsOf(g.at).includes(to)) return 'No door leads there from here.';
  return null;
}

/** ★★★ WHERE A RETREAT GOES, or null when there is nowhere. A door you can
 *  back through is one with nothing standing in it.
 *
 *  ⚠️ IT USED TO LOOK FOR A `cleared` ROOM AND FALL BACK TO THE MOUTH, which
 *  meant fleeing the Rat Warren TELEPORTED YOU TO THE ENTRANCE — halls are
 *  never added to `cleared` (they hold nobody, so nothing clears them), so
 *  the search found nothing and the `?? 0` swallowed it. Caught by the test
 *  that says a retreat is a real move along a real edge. */
export const wayBack = (g: Delve, from: number): number | null =>
  doorsOf(from).find((d) => !held(g, d)) ?? null;

/** ★ Why the delver cannot back out, in plain words, or null. */
export function unfleeable(g: Delve): string | null {
  if (!g.fight) return 'Nothing to run from.';
  // ★★★ CORNERED. Every door out of this room has something standing in it,
  // which on a graph is a fact rather than a mood: you walked into a node
  // whose neighbours are all held. Fight or fall.
  if (wayBack(g, g.fight.room) === null) return 'Nowhere to run.';
  return null;
}

/** Whether the delver stands at the mouth and may climb out. */
export const canLeave = (g: Delve): boolean =>
  !g.fallen && !g.fight && !g.walk && g.at === 0 && g.purse > 0;

export type Action =
  | { type: 'tick'; secs: number }
  /** Walk a door. Takes `WALK_SECS`; arriving is what starts a fight. */
  | { type: 'walk'; to: number }
  /** Swing at the square you are aimed at. */
  | { type: 'strike' }
  /** Change which square you are swinging at. Free. */
  | { type: 'aim'; at: number }
  /** Back out of a fight, to the room you came from. Costs blood. */
  | { type: 'flee' }
  /** Climb out with what you carry. */
  | { type: 'leave' };

/** ★ THE FIGHT ANSWERS. Every living square bites back, which is what makes
 *  a line of small things worse than one big thing — and therefore what makes
 *  aiming a decision. */
const answer = (line: Foe[]): number =>
  line.reduce((n, q) => n + (q.hp > 0 ? q.bite : 0), 0);

export function apply(g: Delve, a: Action): Delve {
  if (g.fallen && a.type !== 'leave') return g;
  switch (a.type) {
    case 'tick': {
      if (!(a.secs > 0)) return g;
      if (!g.walk) return g;
      const left = g.walk.left - a.secs;
      if (left > 0) return { ...g, walk: { ...g.walk, left } };
      // ★★★ ARRIVING IS THE EVENT. Walking is the idle part; what happens
      // when you get there is the game.
      const to = g.walk.to;
      const seen = [...new Set([...g.seen, to, ...doorsOf(to)])];
      const r = ROOM.get(to)!;
      if (held(g, to)) {
        const line = guardsIn(to);
        return { ...g, at: to, walk: null, seen,
          fight: { room: to, line, at: 0, round: 0 },
          log: LOG_LINES(g.log, `${r.name}. Something is already here.`) };
      }
      return { ...g, at: to, walk: null, seen,
        log: LOG_LINES(g.log, `${r.name}.`) };
    }

    case 'walk': {
      if (unwalkable(g, a.to) !== null) return g;
      return { ...g, walk: { to: a.to, left: WALK_SECS, secs: WALK_SECS } };
    }

    case 'aim': {
      if (!g.fight) return g;
      const q = g.fight.line[a.at];
      if (!q || q.hp <= 0) return g;
      return { ...g, fight: { ...g.fight, at: a.at } };
    }

    case 'strike': {
      const f = g.fight;
      if (!f) return g;
      const line = f.line.map((q, i) =>
        i === f.at && q.hp > 0 ? { ...q, hp: Math.max(0, q.hp - BITE) } : q);
      const standing = line.filter((q) => q.hp > 0);
      if (standing.length === 0) {
        // ★ THE ROOM IS QUIET. Its spoil goes in the purse, not the hoard —
        // carrying it out is a separate decision and the whole tension.
        const r = ROOM.get(f.room)!;
        const spoil = SPOIL[r.kind];
        return { ...g, fight: null,
          cleared: [...new Set([...g.cleared, f.room])],
          purse: g.purse + spoil,
          log: LOG_LINES(g.log,
            `${r.name} is quiet.${spoil > 0 ? ` You take ${spoil}.` : ''}`) };
      }
      // ⚠️ AND THEN THEY ALL ANSWER. Aiming at the biter rather than the wall
      // is the only decision in a fight this small, so it has to matter.
      const bite = answer(line);
      const hp = g.hp - bite;
      // Keep the aim on something alive, so the next tap is never wasted.
      const at = line[f.at]!.hp > 0 ? f.at : line.findIndex((q) => q.hp > 0);
      if (hp <= 0) {
        return { ...g, hp: 0, fight: null, fallen: true, purse: 0,
          log: LOG_LINES(g.log, 'You go down in the dark. What you carried stays there.') };
      }
      return { ...g, hp, fight: { ...f, line, at, round: f.round + 1 } };
    }

    case 'flee': {
      const f = g.fight;
      if (!f || unfleeable(g) !== null) return g;
      // ★ RETREAT IS A REAL MOVE ALONG A REAL EDGE — through a door with
      // nothing standing in it, and they get one parting bite. The room
      // stays held: you did not win it, you left it.
      const back = wayBack(g, f.room)!;
      const hp = Math.max(1, g.hp - Math.ceil(answer(f.line) / 2));
      return { ...g, fight: null, at: back, hp,
        log: LOG_LINES(g.log, `You back out of ${ROOM.get(f.room)?.name ?? 'it'}.`) };
    }

    case 'leave': {
      if (g.fallen) {
        // ★ A NEW DELVER, and the hoard is what the last one banked.
        return { ...initial(), hoard: g.hoard,
          log: LOG_LINES(g.log, 'Someone else takes up the lamp.') };
      }
      if (!canLeave(g)) return g;
      return { ...g, hoard: g.hoard + g.purse, purse: 0, hp: START_HP,
        seen: g.seen, cleared: g.cleared,
        log: LOG_LINES(g.log, `You climb out with ${g.purse}.`) };
    }
  }
}
