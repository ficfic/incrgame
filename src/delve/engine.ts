// THE DELVE ENGINE — pure, and the only pattern that survived every pivot.
//
// `apply(state, action) => state`. No DOM, no clock, no RNG, no module state.
//
// ★★★ TURN-BASED, 2026-08-16 — and the seconds are GONE. The owner: *"why is
// it real time fights / let's do turn based"*, and they were right twice over.
// The clock was the TOWN's idle spine imported into a dungeon crawler out of
// habit, and it made every exchange a thing you had to feel rather than
// count. A crawler wants arithmetic you can do in your head before you
// commit: *it acts every other turn, I have four hits before it reaches me.*
//
// THE WHOLE LOOP: you take ONE action — step through a door, swing, or wait —
// and then the dungeon takes its turn. Nothing happens on a clock; nothing
// happens while you are not looking. `tick` is gone.
//
// ⚠️ AND SPEED IS THE STAT THAT MATTERS. A foe with `every: 2` acts on every
// second turn, so standing and trading gives you two swings per bite AND you
// can outrun it — a step is free ground. A foe with `every: 1` trades evenly
// and cannot be escaped in the open: you fight it, or you use the shape of
// the graph against it. That is the Grimrock dance, made countable.
import { ROOM, ROOMS, GUARDS, SPOIL } from './dungeon';

export const DELVE_VERSION = 3;

/** A thing in the dungeon with you. It has a room, and it is coming. */
export interface Foe {
  id: number;
  /** The room it stands in RIGHT NOW. It moves. */
  at: number;
  /** ★ The room it was roused from. A room is judged empty by its OWN dead,
   *  so a guard that chased you and died elsewhere still empties its lair —
   *  which is what the player watched happen.
   *  ⚠️ ON THE FOE, not in a module-level map. This engine has no mutable
   *  state outside the value it is handed. */
  from: number;
  hp: number;
  bite: number;
  name: string;
  /** ★★★ IT ACTS ON EVERY `every`-th TURN. 1 is as fast as you; 2 is slow
   *  enough to walk away from. The one number a player has to read. */
  every: number;
}

export interface Delve {
  version: number;
  at: number;
  /** ★ Turns taken. Drives whose turn it is and nothing else. */
  turn: number;
  seen: number[];
  cleared: number[];
  hp: number;
  purse: number;
  hoard: number;
  foes: Foe[];
  /** Next foe id — in the state, because purity. */
  bred: number;
  fallen: boolean;
  log: string[];
}

export const START_HP = 12;
export const LOG_KEEP = 40;
/** What one swing takes off. */
export const BITE = 3;
export const LOG_LINES = (log: string[], line: string): string[] =>
  [...log, line].slice(-LOG_KEEP);

export const initial = (): Delve => ({
  version: DELVE_VERSION,
  at: 0,
  turn: 0,
  // ⚠️ THE MOUTH AND WHAT IT OPENS ON. A graph you cannot see one step of is
  // not a choice, it is a corridor.
  seen: [0, ...(ROOM.get(0)?.doors ?? [])],
  cleared: [0],
  hp: START_HP,
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

export const foesIn = (g: Delve, id: number): Foe[] =>
  g.foes.filter((f) => f.at === id && f.hp > 0);

/** ★ THE ONE COMBAT RULE: you can only hit, and only be hit by, something in
 *  the room you are standing in. Everything else is footwork. */
export const facing = (g: Delve): Foe[] => foesIn(g, g.at);

/** Does this foe act on the turn about to be taken? */
export const actsOn = (f: Foe, turn: number): boolean => turn % f.every === 0;

/** ★★★ THE FIRST DOOR ON THE SHORTEST WAY, or null. Breadth-first over the
 *  same graph the player walks — so you can SEE what it has to do to reach
 *  you, and count the doors. */
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

export function unwalkable(g: Delve, to: number): string | null {
  if (g.fallen) return 'You are done.';
  if (to === g.at) return 'You are here.';
  if (!ROOM.has(to)) return 'There is no such room.';
  if (!doorsOf(g.at).includes(to)) return 'No door leads there from here.';
  return null;
}

export function unswingable(g: Delve): string | null {
  if (g.fallen) return 'You are done.';
  if (facing(g).length === 0) return 'Nothing here to hit.';
  return null;
}

export const canLeave = (g: Delve): boolean =>
  !g.fallen && g.at === 0 && g.purse > 0;

export type Action =
  /** Step through a door. One turn. */
  | { type: 'walk'; to: number }
  /** Swing at the weakest thing standing here. One turn. */
  | { type: 'strike' }
  /** Stand still and let the dungeon move. One turn. */
  | { type: 'wait' }
  /** Climb out with what you carry. Not a turn — you are leaving. */
  | { type: 'leave' };

/** ★★★ THE DUNGEON'S TURN, taken after every one of yours.
 *
 *  ONE RULE, and the player can be told it in a sentence: **a foe due to act
 *  hits you if it shares a room with you at EITHER END of your step —
 *  otherwise it takes one door toward you.**
 *
 *  ⚠️ `from` IS WHY THIS IS A GAME. The first draft judged only where you had
 *  ARRIVED, and that made walking back and forth between two rooms a perfect
 *  defence: nothing could ever be in your new room at the moment it swung, so
 *  a delver could stroll to the Hoard and back untouched and retreat from
 *  every losing fight for free. Counting the room you LEFT means a parting
 *  blow, so disengaging from something fast costs exactly what standing there
 *  costs — and disengaging from something SLOW is free if you time your step
 *  to its off-turn. That timing is the whole dance, and it is countable.
 */
function theirTurn(g: Delve, said: string[], from: number): Delve {
  const turn = g.turn + 1;
  let hp = g.hp;
  const at = g.at;
  const foes = g.foes.map((f) => {
    if (f.hp <= 0 || !actsOn(f, turn)) return f;
    if (f.at === at || f.at === from) {
      hp -= f.bite;
      said.push(f.at === at
        ? `${f.name} bites you for ${f.bite}.`
        : `${f.name} strikes you for ${f.bite} as you go.`);
      return f;
    }
    const step = stepToward(f.at, at);
    if (step === null) return f;
    // ⚠️ IT IS ANNOUNCED. A thing arriving in your room is the single most
    // important event in this game and it must never be silent.
    if (step === at) said.push(`${f.name} comes through the door.`);
    return { ...f, at: step };
  });

  // A room emptied of its own dead pays out, once.
  let cleared = g.cleared;
  let purse = g.purse;
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
    return { ...g, turn, foes, cleared, hp: 0, purse: 0, fallen: true, at,
      log: LOG_LINES(said.reduce(LOG_LINES, g.log),
        'You go down in the dark. What you carried stays there.') };
  }
  return { ...g, turn, foes, cleared, purse, hp, at,
    log: said.reduce(LOG_LINES, g.log) };
}

export function apply(g: Delve, a: Action): Delve {
  if (g.fallen && a.type !== 'leave') return g;
  switch (a.type) {
    case 'walk': {
      if (unwalkable(g, a.to) !== null) return g;
      const said: string[] = [];
      const at = a.to;
      const seen = [...new Set([...g.seen, at, ...doorsOf(at)])];
      const r = ROOM.get(at)!;
      let foes = g.foes;
      let bred = g.bred;
      // ★ A ROOM'S GUARD WAKES WHEN YOU FIRST WALK IN, once. After that it is
      // loose in the dungeon and its room is just a room.
      const asleep = !g.cleared.includes(at) && GUARDS[r.kind] !== null
        && !g.foes.some((f) => f.from === at);
      if (asleep) {
        const born = (GUARDS[r.kind]?.(r.deep) ?? []).map((q, i) => ({
          id: bred + i, at, from: at, hp: q.hp, bite: q.bite, name: q.name,
          // ★ Heavier things are slower, and slow is what you can walk away
          // from. `every: 2` for anything that hits hard.
          every: q.bite >= 2 ? 2 : 1,
        }));
        bred += born.length;
        foes = [...foes, ...born];
        said.push(`${r.name}. Something is already here.`);
      } else said.push(`${r.name}.`);

      // ★ A ROOM WITH NOTHING TO KILL BUT SOMETHING TO TAKE pays on arrival.
      // ⚠️ Without this the Drowned Well is worth 12 and can never hand it
      // over: spoil only ever came from a dead guard, and the well has none.
      // A dead end that pays is the reason to walk a dead end.
      let cleared = g.cleared;
      let purse = g.purse;
      if (!cleared.includes(at) && GUARDS[r.kind] === null && SPOIL[r.kind] > 0) {
        cleared = [...cleared, at];
        purse += SPOIL[r.kind];
        said.push(`Nothing down here but what was left. You take ${SPOIL[r.kind]}.`);
      }
      return theirTurn({ ...g, at, seen, foes, bred, cleared, purse }, said, g.at);
    }

    case 'strike': {
      if (unswingable(g) !== null) return g;
      // ★ THE WEAKEST THING STANDING. Finishing what is nearly dead is almost
      // always right, and making the player say so every swing is the button
      // pressing this pivot exists to remove.
      const mark = facing(g).reduce((x, y) => (y.hp < x.hp ? y : x));
      const foes = g.foes.map((f) =>
        f.id === mark.id ? { ...f, hp: Math.max(0, f.hp - BITE) } : f);
      const said: string[] = [];
      if (foes.find((f) => f.id === mark.id)!.hp <= 0) {
        said.push(`${mark.name} goes down.`);
      }
      return theirTurn({ ...g, foes }, said, g.at);
    }

    case 'wait': {
      if (g.fallen) return g;
      // ★ A REAL MOVE. Letting a slow thing close the gap so you can meet it
      // in a doorway of your choosing is a decision, not a pass.
      return theirTurn(g, [], g.at);
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
