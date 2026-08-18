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

export const DELVE_VERSION = 4;

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
  /** ★★★ THE THING YOU SENT DOWN, and its model of the dungeon. `null` until
   *  you send one. See THE CRAWLER at the foot of this file. */
  crawl: Crawl | null;
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
  crawl: null,
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

/** ★ THE MOUTH IS ALWAYS A WAY OUT, empty-handed or not.
 *  ⚠️ CHANGED WITH THE CRAWLER, 2026-08-18. It used to need a purse, on the
 *  tidiness argument that leaving with nothing is not a move. Then the crawler
 *  started WAKING THINGS on its own and walking them back up the shaft toward
 *  you — and a delver stood at the Mouth with an empty purse and a pack coming
 *  had no move at all. A tidy button is worth less than a way out. */
export const canLeave = (g: Delve): boolean => !g.fallen && g.at === 0;

export type Action =
  /** Step through a door. One turn. */
  | { type: 'walk'; to: number }
  /** Swing at the weakest thing standing here. One turn. */
  | { type: 'strike' }
  /** Stand still and let the dungeon move. One turn. */
  | { type: 'wait' }
  /** ★ Send a crawler down from the Mouth. One turn, and then it is walking
   *  on its own every turn you take. */
  | { type: 'send' }
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
  const at = g.at;

  // ── 1. THE CRAWLER WALKS. It goes first because it is a thing in the
  // dungeon taking its turn, not a readout that updates afterwards — and
  // because what it wakes up must be awake when the dungeon moves.
  let crawl = g.crawl;
  let woken = g.foes;
  let bred = g.bred;
  if (crawl && !crawl.done) {
    const target = frontier({ ...g, crawl });
    const step = target === null ? null : stepToward(crawl.at, target);
    if (step === null) {
      crawl = { ...crawl, done: true };
      said.push('The crawler has nowhere left to go. It stops.');
    } else {
      const walked = crawl.walked.includes(step) ? crawl.walked : [...crawl.walked, step];
      crawl = { ...crawl, at: step, walked, turns: crawl.turns + 1 };
      // ★★★ AND IT WAKES THINGS. This is the price of sending one down, and
      // it is the good kind of price: not a fee, but a dungeon that is more
      // awake than it was, in rooms you have not reached yet.
      const r = ROOM.get(step)!;
      const asleep = !g.cleared.includes(step) && GUARDS[r.kind] !== null
        && !woken.some((f) => f.from === step);
      if (asleep) {
        const born = (GUARDS[r.kind]?.(r.deep) ?? []).map((q, i) => ({
          id: bred + i, at: step, from: step, hp: q.hp, bite: q.bite, name: q.name,
          every: q.bite >= 2 ? 2 : 1,
        }));
        bred += born.length;
        woken = [...woken, ...born];
        said.push(`The crawler wakes something in ${r.name}.`);
      }
    }
  }
  const crawlAt = crawl && !crawl.done ? crawl.at : -1;
  let chp = crawl ? crawl.hp : 0;

  // ── 2. THE DUNGEON MOVES.
  let hp = g.hp;
  const foes = woken.map((f) => {
    if (f.hp <= 0 || !actsOn(f, turn)) return f;
    if (f.at === at || f.at === from) {
      hp -= f.bite;
      said.push(f.at === at
        ? `${f.name} bites you for ${f.bite}.`
        : `${f.name} strikes you for ${f.bite} as you go.`);
      return f;
    }
    // ★★★ THE CRAWLER IS BAIT, and nobody had to design that: a foe deals with
    // what is in its room before it goes looking for you. Parking a crawler on
    // a pack to buy yourself two clean turns is a real play, and it fell out
    // of the rule rather than being bolted on as one.
    if (f.at === crawlAt) {
      chp -= f.bite;
      said.push(`${f.name} tears at the crawler.`);
      return f;
    }
    const step = stepToward(f.at, at);
    if (step === null) return f;
    // ⚠️ IT IS ANNOUNCED. A thing arriving in your room is the single most
    // important event in this game and it must never be silent.
    if (step === at) said.push(`${f.name} comes through the door.`);
    return { ...f, at: step };
  });

  if (crawl && !crawl.done && chp <= 0) {
    // ⚠️ ITS REPORT STANDS. What it walked stays on your map after it dies —
    // that is the whole point of having sent it, and the next one you send
    // picks up where this one stopped.
    said.push(`The crawler stops transmitting in ${ROOM.get(crawl.at)?.name}.`);
    crawl = { ...crawl, hp: 0, done: true };
  } else if (crawl) crawl = { ...crawl, hp: Math.max(0, chp) };

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
    return { ...g, turn, foes, cleared, crawl, bred, hp: 0, purse: 0, fallen: true, at,
      log: LOG_LINES(said.reduce(LOG_LINES, g.log),
        'You go down in the dark. What you carried stays there.') };
  }
  return { ...g, turn, foes, cleared, purse, crawl, bred, hp, at,
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

      // ★★★ THE MOMENT THE REPORT MEETS THE ROOM. The crawler calls every room
      // it did not enter empty and safe; this is where you find out, and it is
      // the single line this whole mechanic exists to print.
      if (asleep && guessedSafe(g, at)) {
        said.push(`The crawler filed ${r.name} as empty. It is not.`);
      }

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

    case 'send': {
      if (!canSend(g)) return g;
      // ★ THE NEXT ONE PICKS UP THE MAP. You are not buying a machine, you are
      // buying another attempt at the frontier — everything the last crawler
      // walked is still walked.
      const crawl: Crawl = {
        at: 0, hp: CRAWL_HP, walked: g.crawl?.walked ?? [0],
        turns: 0, done: false,
      };
      return theirTurn({ ...g, crawl }, ['You send a crawler down.'], g.at);
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

// ═══════════════════════════════════════════════════════════════════════════
// ★★★ THE CRAWLER — 2026-08-18, and the answer to *"how are we going full on
// graph? maybe let's come back to ai exploring stuff idea"*.
//
// THE ANSWER IS TWO GRAPHS. There is the dungeon, and there is the crawler's
// MODEL of the dungeon, and the gap between them is the game. You send a thing
// down; it walks on its own and files a map; you plan against that map; and the
// map is confidently, systematically wrong in ways you only discover by
// standing in the room yourself.
//
// ⚠️ AND THE LIE IS A RULE, NOT A DIE ROLL. There is no RNG in this engine and
// there is none here. The crawler is wrong because of HOW IT THINKS:
//
//   · it reports rooms it STOOD IN truthfully — that part is real work;
//   · it reports rooms it merely saw a door to as EMPTY AND SAFE, every time,
//     because it is completing a pattern rather than looking;
//   · and it asserts a DOOR between any two rooms in its report that are close
//     enough on the map, whether or not one exists — a hallucinated edge, on a
//     game whose whole subject is a graph.
//
// Every one of those is a pure function of the state. Same dungeon, same
// report, forever — which is also the only reason any of it is testable.
// ═══════════════════════════════════════════════════════════════════════════

/** How much a crawler can take before it stops transmitting. Low on purpose:
 *  it is an instrument, not a second delver, and losing it is the ordinary
 *  outcome rather than the failure case. */
export const CRAWL_HP = 4;

/** ★ HOW NEAR IS NEAR ENOUGH TO INVENT A DOOR, in world units. Tuned so the
 *  Mouth "connects" straight to the Warren and the Crossing "connects" to the
 *  Hoard: plausible shortcuts, exactly the ones you would want to be true. */
export const GUESS = 205;

export interface Crawl {
  /** Where it stands. */
  at: number;
  hp: number;
  /** ★ ROOMS IT HAS ACTUALLY STOOD IN. Its only real knowledge, and the only
   *  part of its report that can be trusted. Carried over from the last
   *  crawler you lost — the map is the organisation's, not the machine's. */
  walked: number[];
  /** Steps taken. */
  turns: number;
  /** It stopped: killed, or nothing left it can reach. */
  done: boolean;
}

/** Every room the crawler will talk about: the ones it walked, plus every room
 *  it saw a door to from one of them. */
export const claimed = (g: Delve): number[] =>
  g.crawl ? [...new Set(g.crawl.walked.flatMap((r) => [r, ...doorsOf(r)]))] : [];

/** ★★★ THE ROOMS IT IS GUESSING ABOUT. It never entered these, and it will
 *  tell you they are empty. */
export const inferred = (g: Delve): number[] =>
  g.crawl ? claimed(g).filter((r) => !g.crawl!.walked.includes(r)) : [];

/** Did the crawler call this room safe without going in? */
export const guessedSafe = (g: Delve, id: number): boolean =>
  inferred(g).includes(id);

/** ★★★ DOORS THAT DO NOT EXIST. Two rooms in the report, near each other, at
 *  least one of them never entered — so the crawler joins them up. Walking the
 *  frontier deletes them one at a time, which is what makes verifying feel
 *  like progress rather than paperwork. */
export function hallucinated(g: Delve): [number, number][] {
  if (!g.crawl) return [];
  const said = claimed(g);
  const out: [number, number][] = [];
  for (const a of said) {
    for (const b of said) {
      if (b <= a) continue;
      if (doorsOf(a).includes(b)) continue;
      if (g.crawl.walked.includes(a) && g.crawl.walked.includes(b)) continue;
      const ra = ROOM.get(a)!, rb = ROOM.get(b)!;
      if (Math.hypot(ra.x - rb.x, ra.y - rb.y) <= GUESS) out.push([a, b]);
    }
  }
  return out;
}

/** The nearest room it has not walked, breadth-first from where it stands. */
export function frontier(g: Delve): number | null {
  if (!g.crawl) return null;
  const seen = new Set([g.crawl.at]);
  const queue = [g.crawl.at];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i]!;
    if (!g.crawl.walked.includes(here)) return here;
    for (const d of doorsOf(here)) if (!seen.has(d)) { seen.add(d); queue.push(d); }
  }
  return null;
}

export const canSend = (g: Delve): boolean =>
  !g.fallen && g.at === 0 && (g.crawl === null || g.crawl.done);
