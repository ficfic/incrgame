// THE DELVE ENGINE — pure, and the only pattern that survived every pivot.
//
// `apply(state, action) => state`. No DOM, no clock, no RNG, and no module
// state: the clock is a `tick` action and there is no randomness anywhere,
// because a deterministic fight can be SOLVED and a solved fight is the only
// reason this project has ever been able to say a difficulty curve holds.
//
// ★★★ THE GRIMROCK TURN, 2026-08-16 — one slice after the first. The owner:
// *"so like legend of grimrock type of shit i wanna do"*.
//
// Grimrock's actual trick is not the first-person view, it is that COMBAT IS
// MOVEMENT. You never stand and swap hits; you step, it swings where you
// were, you step back and hit it. Everything interesting in that game is
// footwork — and on a graph that translates exactly, which is the strongest
// argument yet that the dungeon pivot was right:
//
//   · monsters LIVE ON NODES and walk EDGES, using the same graph you do;
//   · you can only hit, and only be hit by, something in YOUR room;
//   · so a step through a door is a real defence, bought at a real price —
//     the door costs you `WALK_SECS`, and costs the thing chasing you its
//     own pace to follow.
//
// ⚠️ THE STRIP IS GONE, one slice after it shipped. It was stand-and-trade
// and this is not that game. Kept from it: refusals that say WHY, and no dice.
import { ROOM, ROOMS, WALK_SECS, GUARDS, SPOIL } from './dungeon';

export const DELVE_VERSION = 2;

/** A thing in the dungeon with you. It has a room, and it is coming. */
export interface Foe {
  id: number;
  /** The room it stands in RIGHT NOW. It moves. */
  at: number;
  /** ★ The room it was roused from. A room is judged empty by its own dead,
   *  so a guard that chased you two rooms and died there still empties the
   *  room it came from — which is what the player watched happen.
   *  ⚠️ ON THE FOE, not in a module-level map. This engine has no mutable
   *  state outside the value it is handed; that is the rule that lets a save
   *  be trusted and a fight be solved. */
  from: number;
  hp: number;
  bite: number;
  name: string;
  /** Seconds until it may act again — its whole tempo. */
  cool: number;
  /** Seconds between its acts. Bigger is slower, and slower is dodgeable. */
  pace: number;
}

export interface Delve {
  version: number;
  at: number;
  seen: number[];
  /** Rooms whose guard is dead. A cleared room stays cleared. */
  cleared: number[];
  walk: { to: number; left: number; secs: number } | null;
  hp: number;
  /** ★ Seconds until the delver may swing again. Position is bought with it. */
  swing: number;
  purse: number;
  hoard: number;
  foes: Foe[];
  /** Next foe id — carried in the state, because purity. */
  bred: number;
  fallen: boolean;
  log: string[];
}

export const START_HP = 12;
export const LOG_KEEP = 40;
/** What a swing takes off. */
export const BITE = 3;
/** ★★★ HOW LONG BETWEEN THE DELVER'S SWINGS, and the number the whole dance
 *  is measured against: a foe whose `pace` is slower than this can be
 *  out-stepped, and one faster cannot be fought without using a door. */
export const SWING_SECS = 1.6;
export const LOG_LINES = (log: string[], line: string): string[] =>
  [...log, line].slice(-LOG_KEEP);

export const initial = (): Delve => ({
  version: DELVE_VERSION,
  at: 0,
  // ⚠️ THE MOUTH AND WHAT IT OPENS ON. A graph you cannot see one step of is
  // not a choice, it is a corridor.
  seen: [0, ...(ROOM.get(0)?.doors ?? [])],
  cleared: [0],
  walk: null,
  hp: START_HP,
  swing: 0,
  purse: 0,
  hoard: 0,
  foes: [],
  bred: 1,
  fallen: false,
  log: [],
});

export const doorsOf = (id: number): number[] => ROOM.get(id)?.doors ?? [];

/** Is this room's guard still to be met? */
export const held = (g: Delve, id: number): boolean =>
  !g.cleared.includes(id) && GUARDS[ROOM.get(id)?.kind ?? 'hall'] !== null;

/** Everything alive and standing in a given room. */
export const foesIn = (g: Delve, id: number): Foe[] =>
  g.foes.filter((f) => f.at === id && f.hp > 0);

/** ★ THE ONE COMBAT RULE: you can only hit, and only be hit by, something in
 *  the room you are standing in. Everything else is footwork. */
export const facing = (g: Delve): Foe[] => foesIn(g, g.at);

/** ★★★ THE FIRST DOOR ON THE SHORTEST WAY from one room to another, or null.
 *  A breadth-first walk — the monsters use the same graph the player does,
 *  which is what makes the dance legible: you can SEE what it has to do to
 *  reach you, and count the doors. */
export function stepToward(from: number, to: number): number | null {
  if (from === to || !ROOM.has(from) || !ROOM.has(to)) return null;
  const back = new Map<number, number>([[from, from]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i]!;
    for (const d of doorsOf(here)) {
      if (back.has(d)) continue;
      back.set(d, here);
      if (d === to) {
        let step = d;
        while (back.get(step) !== from) step = back.get(step)!;
        return step;
      }
      queue.push(d);
    }
  }
  return null;
}

/** Why the delver cannot walk there, in plain words, or null. */
export function unwalkable(g: Delve, to: number): string | null {
  if (g.fallen) return 'You are done.';
  if (g.walk) return 'Already on the move.';
  if (to === g.at) return 'You are here.';
  if (!ROOM.has(to)) return 'There is no such room.';
  if (!doorsOf(g.at).includes(to)) return 'No door leads there from here.';
  return null;
}

/** Why the delver cannot swing, in plain words, or null. */
export function unswingable(g: Delve): string | null {
  if (g.fallen) return 'You are done.';
  if (g.walk) return 'You are between rooms.';
  if (facing(g).length === 0) return 'Nothing here to hit.';
  if (g.swing > 0) return `${g.swing.toFixed(1)}s`;
  return null;
}

export const canLeave = (g: Delve): boolean =>
  !g.fallen && !g.walk && g.at === 0 && g.purse > 0;

export type Action =
  | { type: 'tick'; secs: number }
  | { type: 'walk'; to: number }
  /** Swing at the weakest thing standing in this room. */
  | { type: 'strike' }
  | { type: 'leave' };

export function apply(g: Delve, a: Action): Delve {
  if (g.fallen && a.type !== 'leave') return g;
  switch (a.type) {
    case 'tick': {
      if (!(a.secs > 0)) return g;
      const s = a.secs;
      let at = g.at;
      let walk = g.walk;
      let seen = g.seen;
      let cleared = g.cleared;
      let foes = g.foes;
      let bred = g.bred;
      let hp = g.hp;
      let purse = g.purse;
      const said: string[] = [];

      // ---- the delver's own step -------------------------------------------
      if (walk) {
        const left = walk.left - s;
        if (left > 0) walk = { ...walk, left };
        else {
          at = walk.to;
          walk = null;
          seen = [...new Set([...seen, at, ...doorsOf(at)])];
          const r = ROOM.get(at)!;
          // ★ A ROOM'S GUARD WAKES WHEN YOU FIRST WALK IN, once. After that
          // it is loose in the dungeon and its room is just a room.
          const woken = !cleared.includes(at)
            && GUARDS[r.kind] !== null
            && !foes.some((f) => f.from === at);
          if (woken) {
            const born = (GUARDS[r.kind]?.(r.deep) ?? []).map((q, i) => ({
              id: bred + i, at, from: at, hp: q.hp, bite: q.bite, name: q.name,
              // ⚠️ STAGGERED, so a pair does not act in lockstep and read as
              // one thing with a double-sized bite.
              cool: 0.4 + i * 0.5,
              // ★ A heavier thing is slower, and that is the player's whole
              // handle on it: `pace` above `SWING_SECS` can be danced.
              pace: 1.4 + q.bite * 0.5,
            }));
            bred += born.length;
            foes = [...foes, ...born];
            said.push(`${r.name}. Something is already here.`);
          } else said.push(`${r.name}.`);
        }
      }

      // ---- and everything else's -------------------------------------------
      // ★★★ THIS IS THE GAME. Each foe acts on its own clock: if the delver
      // is in its room it bites, otherwise it takes ONE DOOR toward them. So
      // a step through a door buys exactly the time it costs the thing to
      // follow, and two doors buys two. Standing still is what kills you.
      //
      // ⚠️ NOTHING ACTS WHILE THE DELVER IS MID-DOOR. Being bitten in a
      // corridor is a hit you could not have avoided and could not see
      // coming, which is the one thing a deterministic fight must never do.
      if (!walk) {
        foes = foes.map((f) => {
          if (f.hp <= 0) return f;
          let cool = f.cool - s;
          let fat = f.at;
          let acts = 0;
          while (cool <= 0 && acts < 8) {
            if (fat === at) {
              hp -= f.bite;
              said.push(`${f.name} bites you for ${f.bite}.`);
            } else {
              const step = stepToward(fat, at);
              if (step === null) break;
              fat = step;
            }
            cool += f.pace;
            acts += 1;
          }
          return { ...f, cool, at: fat };
        });
      }

      // ---- a room emptied of its own dead -----------------------------------
      for (const r of ROOMS) {
        if (cleared.includes(r.id) || GUARDS[r.kind] === null) continue;
        const mine = foes.filter((f) => f.from === r.id);
        if (mine.length > 0 && mine.every((f) => f.hp <= 0)) {
          cleared = [...cleared, r.id];
          purse += SPOIL[r.kind];
          said.push(`${r.name} is quiet. You take ${SPOIL[r.kind]}.`);
        }
      }

      if (hp <= 0) {
        return { ...g, at, walk: null, seen, cleared, foes, bred, hp: 0,
          purse: 0, fallen: true, swing: 0,
          log: LOG_LINES(said.reduce(LOG_LINES, g.log),
            'You go down in the dark. What you carried stays there.') };
      }
      return { ...g, at, walk, seen, cleared, foes, bred, hp, purse,
        swing: Math.max(0, g.swing - s),
        log: said.reduce(LOG_LINES, g.log) };
    }

    case 'walk': {
      if (unwalkable(g, a.to) !== null) return g;
      return { ...g, walk: { to: a.to, left: WALK_SECS, secs: WALK_SECS } };
    }

    case 'strike': {
      if (unswingable(g) !== null) return g;
      // ★ THE WEAKEST THING STANDING. Finishing what is nearly dead is almost
      // always right, and making the player say so every swing is the button
      // pressing this pivot exists to remove.
      const mark = facing(g).reduce((a2, b) => (b.hp < a2.hp ? b : a2));
      const foes = g.foes.map((f) =>
        f.id === mark.id ? { ...f, hp: Math.max(0, f.hp - BITE) } : f);
      const down = foes.find((f) => f.id === mark.id)!.hp <= 0;
      return { ...g, foes, swing: SWING_SECS,
        log: down ? LOG_LINES(g.log, `${mark.name} goes down.`) : g.log };
    }

    case 'leave': {
      if (g.fallen) {
        return { ...initial(), hoard: g.hoard,
          log: LOG_LINES(g.log, 'Someone else takes up the lamp.') };
      }
      if (!canLeave(g)) return g;
      return { ...g, hoard: g.hoard + g.purse, purse: 0, hp: START_HP,
        log: LOG_LINES(g.log, `You climb out with ${g.purse}.`) };
    }
  }
}
