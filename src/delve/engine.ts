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
import { GUARDS, SPOIL, type Room } from './dungeon';
import { floorPlan } from './floors';

export const DELVE_VERSION = 8;

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
  /** ★★★ SHOVED, AND STILL PICKING ITSELF UP. It takes no action on any turn
   *  up to and including this one. 0 means it is on its feet. */
  reeling: number;
}

export interface Delve {
  version: number;
  at: number;
  /** ★ Turns taken. Drives whose turn it is and nothing else. */
  turn: number;
  /** ★★★ HOW DEEP. 1 is the hand-drawn first descent; everything below it is
   *  generated from this number and nothing else. */
  floor: number;
  /** ★★★ THE FLOOR YOU ARE ON, as data. ⚠️ NOT A MODULE CONSTANT ANY MORE —
   *  `ROOMS` was imported by nine functions, which meant there could only ever
   *  be one dungeon. It lives in the state so a save records the actual map and
   *  so nothing can disagree about which floor it is talking about. */
  rooms: Room[];
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
  /** ★★★ DOORS YOU HAVE WEDGED SHUT, and the turn each gives out on. An edge
   *  the graph does not have any more — for you AND for everything chasing
   *  you. See THE KIT at the foot of this file. */
  bars: Bar[];
  /** What the hoard has bought. Survives dying; that is the whole ratchet. */
  kit: Kit;
  /** ★★★ EVERY ROOM YOU HAVE PERSONALLY STOOD IN. Not `seen` — seen is what
   *  the lamp showed you from the doorway, and not `crawl.walked`, which is a
   *  machine's word. This is the one list in the game that is entirely, boringly
   *  true, and finishing the game means completing it. Survives dying. */
  trod: number[];
  fallen: boolean;
  log: string[];
}

export const START_HP = 12;
/** ★ WHAT IS IN THE PACK BEFORE YOU HAVE EARNED ANYTHING. ⚠️ IT WAS NOTHING,
 *  and that meant every tactical option in the game sat behind gold: the first
 *  twenty taps were walk, swing, swing, walk home. You are handed enough to
 *  find out what a wedge does. */
export const START_WEDGES = 2;
/** ★ HOW MUCH LIFE THE BOILED LEATHER IS WORTH. Tuned by playing the deep end
 *  out in `test/ladder.test.ts`, not by feel: on 12 the bottom of the dungeon
 *  is not reachable by ANY route, which made the game unfinishable. */
export const VIM = 8;
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
  floor: 1,
  rooms: floorPlan(1),
  seen: [0, ...(floorPlan(1)[0]?.doors ?? [])],
  cleared: [0],
  hp: START_HP,
  purse: 0,
  hoard: 0,
  foes: [],
  bred: 1,
  crawl: null,
  bars: [],
  // ★ TWO WEDGES IN THE PACK FROM THE START. ⚠️ EVERY TACTICAL OPTION USED TO
  // BE BEHIND GOLD, so the first twenty taps of the game had none of them —
  // walk, swing, walk home. You are handed enough to find out what a wedge
  // does; the shop sells the rest.
  kit: { wedges: START_WEDGES, lamp: 1, brace: 0, edge: 0, vim: 0 },
  trod: [0],
  fallen: false,
  log: [],
});

/** The room, on the floor you are standing on. */
export const roomAt = (g: Delve, id: number): Room | undefined =>
  g.rooms.find((r) => r.id === id);
export const doorsOf = (g: Delve, id: number): number[] => roomAt(g, id)?.doors ?? [];

/** ★★★ IS THIS DOOR WEDGED? The single place that knows an edge is missing,
 *  so the player, the monsters and the crawler cannot possibly disagree about
 *  the shape of the graph — which they would within a week if this were three
 *  `bars.some(...)` calls in three files. */
export const shut = (g: Delve, a: number, b: number): boolean =>
  g.bars.some((x) => x.until > g.turn
    && ((x.a === a && x.b === b) || (x.a === b && x.b === a)));

/** The doors out of a room that are actually open right now. */
export const waysOut = (g: Delve, id: number): number[] =>
  doorsOf(g, id).filter((d) => !shut(g, id, d));

/** Is this room's guard still to be met? */
export const held = (g: Delve, id: number): boolean =>
  !g.cleared.includes(id) && GUARDS[roomAt(g, id)?.kind ?? 'hall'] !== null;

export const foesIn = (g: Delve, id: number): Foe[] =>
  g.foes.filter((f) => f.at === id && f.hp > 0);

/** ★ THE ONE COMBAT RULE: you can only hit, and only be hit by, something in
 *  the room you are standing in. Everything else is footwork. */
export const facing = (g: Delve): Foe[] => foesIn(g, g.at);

/** Does this foe act on the turn about to be taken?
 *  ⚠️ SPEED AND FOOTING, in that order. A shoved thing is out of the fight for
 *  a beat however fast it is — that is what a shove BUYS. */
export const actsOn = (f: Foe, turn: number): boolean =>
  turn > f.reeling && turn % f.every === 0;

/** ★★★ THE FIRST DOOR ON THE SHORTEST WAY, or null. Breadth-first over the
 *  same graph the player walks — so you can SEE what it has to do to reach
 *  you, and count the doors. */
export function stepToward(g: Delve, from: number, to: number,
    blocked: (a: number, b: number) => boolean = () => false): number | null {
  if (from === to || !roomAt(g, from) || !roomAt(g, to)) return null;
  const back = new Map<number, number>([[from, from]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const here = queue[i]!;
    for (const d of doorsOf(g, here)) {
      // ★★★ AND A WEDGED DOOR IS NOT A DOOR. The chase re-routes around it or
      // gives up — which is what makes a wedge a move rather than a delay.
      if (blocked(here, d)) continue;
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
  if (!roomAt(g, to)) return 'There is no such room.';
  if (!doorsOf(g, g.at).includes(to)) return 'No door leads there from here.';
  // ⚠️ AND IT SHUTS FOR YOU TOO. A wedge you could step through yourself is a
  // free win, not a decision — the cost of cutting an edge is that it is cut.
  if (shut(g, g.at, to)) return 'You wedged that door shut.';
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
  /** ★★★ Swing at something standing here. One turn. Name it, or leave it out
   *  and the weakest takes it. */
  | { type: 'strike'; at?: number }
  /** ★★★ Put your shoulder into it and send it through a door. No damage;
   *  it loses its footing for two turns and has to walk back. One turn. */
  | { type: 'shove'; foe: number; to: number }
  /** ★★★ Get behind your arm. Everything that reaches you this turn does half.
   *  One turn, and you deal nothing. */
  | { type: 'brace' }
  /** Stand still and let the dungeon move. One turn. */
  | { type: 'wait' }
  /** ★ Send a crawler down from the Mouth. One turn, and then it is walking
   *  on its own every turn you take. */
  | { type: 'send' }
  /** ★★★ Cut the edge between here and there. One turn. */
  | { type: 'wedge'; to: number }
  /** ★★★ Take the stair down from the Hoard. A whole new floor. */
  | { type: 'descend' }
  /** Spend the hoard at the Mouth. Not a turn. */
  | { type: 'buy'; what: Good }
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
function theirTurn(g: Delve, said: string[], from: number, guard = false): Delve {
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
    const step = target === null ? null
        : stepToward(g, crawl.at, target, (x, y) => shut(g, x, y));
    if (step === null) {
      crawl = { ...crawl, done: true };
      said.push('The crawler has nowhere left to go. It stops.');
    } else {
      const walked = crawl.walked.includes(step) ? crawl.walked : [...crawl.walked, step];
      crawl = { ...crawl, at: step, walked, turns: crawl.turns + 1 };
      // ★★★ AND IT WAKES THINGS. This is the price of sending one down, and
      // it is the good kind of price: not a fee, but a dungeon that is more
      // awake than it was, in rooms you have not reached yet.
      const r = roomAt(g, step)!;
      const asleep = !g.cleared.includes(step) && GUARDS[r.kind] !== null
        && !woken.some((f) => f.from === step);
      if (asleep) {
        const born = (GUARDS[r.kind]?.(deepness(g, r)) ?? []).map((q, i) => ({
          id: bred + i, at: step, from: step, hp: q.hp, bite: q.bite, name: q.name,
          every: q.bite >= 2 ? 2 : 1, reeling: 0,
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
      // ★★★ AN ARM IN THE WAY IS WORTH HALF OF EVERYTHING. Rounded UP against
      // you, so bracing never makes a 1 into a 0 — a free turn is not a
      // decision, and this has to stay a trade.
      const took = guard ? Math.ceil(f.bite / 2) : f.bite;
      hp -= took;
      said.push(f.at === at
        ? `${f.name} bites you for ${took}${guard ? ', turned' : ''}.`
        : `${f.name} strikes you for ${took} as you go.`);
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
    const step = stepToward(g, f.at, at, (x, y) => shut(g, x, y));
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
    said.push(`The crawler stops transmitting in ${roomAt(g, crawl.at)?.name}.`);
    crawl = { ...crawl, hp: 0, done: true };
  } else if (crawl) crawl = { ...crawl, hp: Math.max(0, chp) };

  // ★ A WEDGE GIVES OUT. Dropping spent bars here rather than filtering at
  // every read keeps `bars` honest for the save and for the screen.
  const bars = g.bars.filter((x) => x.until > turn);

  // A room emptied of its own dead pays out, once.
  let cleared = g.cleared;
  let purse = g.purse;
  for (const r of g.rooms) {
    if (cleared.includes(r.id) || GUARDS[r.kind] === null) continue;
    const mine = foes.filter((f) => f.from === r.id);
    if (mine.length > 0 && mine.every((f) => f.hp <= 0)) {
      cleared = [...cleared, r.id];
      purse += worth(g, r);
      said.push(`${r.name} is quiet. You take ${worth(g, r)}.`);
    }
  }

  if (hp <= 0) {
    return { ...g, turn, foes, cleared, crawl, bred, bars, hp: 0, purse: 0, fallen: true, at,
      log: LOG_LINES(said.reduce(LOG_LINES, g.log),
        'You go down in the dark. What you carried stays there.') };
  }
  // ★★★ AND YOU HAVE STOOD HERE — recorded only on a turn you SURVIVED.
  //
  // ⚠️ NOT WHEN YOU ARRIVE. Dying on the doorstep used to count, and that quietly
  // deleted the difficulty ladder: a bare delver could walk to the bottom of the
  // dungeon, be killed by the thing in it, and still have finished the game.
  // A map is only true if the surveyor came back to draw it.
  const trod = g.trod.includes(at) ? g.trod : [...g.trod, at];
  return { ...g, turn, foes, cleared, purse, crawl, bred, bars, hp, at, trod,
    log: said.reduce(LOG_LINES, g.log) };
}

export function apply(g: Delve, a: Action): Delve {
  if (g.fallen && a.type !== 'leave') return g;
  switch (a.type) {
    case 'walk': {
      if (unwalkable(g, a.to) !== null) return g;
      const said: string[] = [];
      const at = a.to;
      // ★ HOW FAR THE LAMP REACHES, in doors. One by default; a wider lamp is
      // bought with the hoard and it is a change to the FOG, not to a number
      // — you see the fork past the fork, so you can plan two moves deep.
      const seen = [...new Set([...g.seen, ...within(g, at, g.kit.lamp)])];
      const r = roomAt(g, at)!;
      let foes = g.foes;
      let bred = g.bred;
      // ★ A ROOM'S GUARD WAKES WHEN YOU FIRST WALK IN, once. After that it is
      // loose in the dungeon and its room is just a room.
      const asleep = !g.cleared.includes(at) && GUARDS[r.kind] !== null
        && !g.foes.some((f) => f.from === at);
      if (asleep) {
        const born = (GUARDS[r.kind]?.(deepness(g, r)) ?? []).map((q, i) => ({
          id: bred + i, at, from: at, hp: q.hp, bite: q.bite, name: q.name,
          // ★ Heavier things are slower, and slow is what you can walk away
          // from. `every: 2` for anything that hits hard.
          every: q.bite >= 2 ? 2 : 1, reeling: 0,
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
        purse += worth(g, r);
        said.push(`Nothing down here but what was left. You take ${worth(g, r)}.`);
      }
      return theirTurn({ ...g, at, seen, foes, bred, cleared, purse }, said, g.at);
    }

    case 'strike': {
      if (unswingable(g) !== null) return g;
      // ★★★ YOU SAY WHICH. ⚠️ THIS USED TO PICK THE WEAKEST FOR YOU, on the
      // argument that making the player aim was the button-pressing the pivot
      // existed to remove. That was wrong and the owner said so plainly: *"so
      // far there's just one button and no gameplay"*. WHO YOU KILL FIRST IS
      // THE DECISION in every turn-based fight ever written — the fast runt
      // chips you every turn, the slow big one lands a burst every other — and
      // automating it left a room with two monsters in it and one button.
      // Leaving `at` out still takes the weakest, which is what the walk-in
      // and the tests rely on.
      const here = facing(g);
      const mark = (a.at !== undefined && here.find((f) => f.id === a.at))
        || here.reduce((x, y) => (y.hp < x.hp ? y : x));
      const foes = g.foes.map((f) =>
        f.id === mark.id ? { ...f, hp: Math.max(0, f.hp - swing(g)) } : f);
      const said: string[] = [];
      if (foes.find((f) => f.id === mark.id)!.hp <= 0) {
        said.push(`${mark.name} goes down.`);
      }
      return theirTurn({ ...g, foes }, said, g.at);
    }

    case 'shove': {
      if (unshovable(g, a.foe, a.to) !== null) return g;
      const mark = g.foes.find((f) => f.id === a.foe)!;
      // ★★★ TWO TURNS OFF ITS FEET, and a door to walk back through. One is
      // not enough — it would step straight back in and the shove would have
      // bought exactly nothing for the turn it cost.
      const foes = g.foes.map((f) =>
        f.id === a.foe ? { ...f, at: a.to, reeling: g.turn + REEL } : f);
      return theirTurn({ ...g, foes },
        [`You put ${mark.name} through the door to ${roomAt(g, a.to)?.name}.`], g.at);
    }

    case 'descend': {
      if (!canDescend(g)) return g;
      // ★★★ THE CONTENT TIER, and the prestige layer, in one move. What you
      // carry is banked on the way past; what you KNEW about the floor above
      // is gone, because it is not that floor any more.
      const floor = g.floor + 1;
      return { ...descend({ ...g, hoard: g.hoard + g.purse }), floor,
        rooms: floorPlan(floor),
        seen: [0, ...(floorPlan(floor)[0]?.doors ?? [])],
        trod: [0],
        // ⚠️ THE CRAWLER'S MAP DOES NOT COME DOWN THE STAIR. It is a map of a
        // floor you are no longer on, and carrying it would draw a dead
        // dungeon's claims over a live one.
        crawl: null,
        log: LOG_LINES(g.log,
          `You take the stair down. Floor ${floor}: ${floorPlan(floor).length} rooms, and none of them yours.`) };
    }

    case 'brace': {
      if (g.fallen) return g;
      return theirTurn(g, ['You get behind your arm.'], g.at, true);
    }

    case 'send': {
      if (!canSend(g)) return g;
      // ★ THE NEXT ONE PICKS UP THE MAP. You are not buying a machine, you are
      // buying another attempt at the frontier — everything the last crawler
      // walked is still walked.
      const crawl: Crawl = {
        at: 0, hp: CRAWL_HP + g.kit.brace * BRACE_HP, walked: g.crawl?.walked ?? [0],
        turns: 0, done: false,
      };
      return theirTurn({ ...g, crawl }, ['You send a crawler down.'], g.at);
    }

    case 'wedge': {
      if (unwedgeable(g, a.to) !== null) return g;
      const lo = Math.min(g.at, a.to), hi = Math.max(g.at, a.to);
      const bars = [...g.bars, { a: lo, b: hi, until: g.turn + 1 + BAR_TURNS }];
      const kit = { ...g.kit, wedges: g.kit.wedges - 1 };
      return theirTurn({ ...g, bars, kit }, [
        `You wedge the door to ${roomAt(g, a.to)?.name}. ${BAR_TURNS} turns.`,
      ], g.at);
    }

    case 'buy': {
      const price = COST[a.what];
      if (g.at !== 0 || g.fallen || g.hoard < price) return g;
      if (has(g.kit, a.what)) return g;                          // bought once
      // ⚠️ BUYING IS NOT A TURN. You are at the Mouth with the lamp out; the
      // dungeon does not get a swing at you for looking in your own pack.
      const kit = a.what === 'wedges'
        ? { ...g.kit, wedges: g.kit.wedges + WEDGES_PER }
        : a.what === 'lamp' ? { ...g.kit, lamp: 2 }
        : { ...g.kit, [a.what]: 1 };
      return { ...g, hoard: g.hoard - price, kit,
        log: LOG_LINES(g.log, `${GOODS[a.what]}. ${price} spent.`) };
    }

    case 'wait': {
      if (g.fallen) return g;
      // ★ A REAL MOVE. Letting a slow thing close the gap so you can meet it
      // in a doorway of your choosing is a decision, not a pass.
      return theirTurn(g, [], g.at);
    }

    case 'leave': {
      if (g.fallen) {   // ⚠️ THE PURSE IS ALREADY GONE — `theirTurn` took it.
        // ★★★ THE KIT AND THE MAP COME BACK UP. ⚠️ THEY DID NOT, AND THAT WAS
        // THE RATCHET GONE: a fresh `initial()` here threw away everything the
        // hoard had bought and everything the crawler had filed, so a delve
        // you lost undid the delves you won. What you carried stays down
        // there; what you LEARNED and what you OWN do not.
        return { ...descend(g), hoard: g.hoard,
          log: LOG_LINES(g.log, 'Someone else takes up the lamp.') };
      }
      if (!canLeave(g)) return g;
      return { ...descend(g), hoard: g.hoard + g.purse,
        log: LOG_LINES(g.log, g.purse > 0
          ? `You climb out with ${g.purse}. The dark closes behind you.`
          : 'You climb out with nothing.') };
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
  g.crawl ? [...new Set(g.crawl.walked.flatMap((r) => [r, ...doorsOf(g, r)]))] : [];

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
      if (doorsOf(g, a).includes(b)) continue;
      if (g.crawl.walked.includes(a) && g.crawl.walked.includes(b)) continue;
      const ra = roomAt(g, a)!, rb = roomAt(g, b)!;
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
    for (const d of waysOut(g, here)) if (!seen.has(d)) { seen.add(d); queue.push(d); }
  }
  return null;
}

export const canSend = (g: Delve): boolean =>
  !g.fallen && g.at === 0 && (g.crawl === null || g.crawl.done);

// ═══════════════════════════════════════════════════════════════════════════
// ★★★ THE KIT — what the hoard is FOR, 2026-08-19.
//
// The owner: *"we need shit to do"*. The hoard was a number that only went up,
// which is the hole a genre veteran spots in ninety seconds.
//
// ⚠️ AND EVERY ONE OF THESE IS A GRAPH VERB, not a bigger number. That is the
// rule this shop is built on, because a shop full of +1s is how an incremental
// game stops being about the thing it is about:
//
//   WEDGES cut an edge — for four turns the graph genuinely does not have that
//     door, and the pack chasing you has to route round it or give up.
//   THE LAMP changes the FOG — two doors of reveal instead of one, so you can
//     plan two moves deep instead of stepping into the dark every time.
//   BRACING extends the crawler's REACH — more hp is more of the graph mapped
//     before it dies, which is more claims to verify.
//   THE WHETSTONE is the one honest +1, and it is here because a shop of four
//     exotic verbs and nothing familiar reads as a puzzle rather than a game.
//
// ★ AND THE KIT SURVIVES DYING. That is the whole ratchet: a delve you lose
// still moved you forward, so the loop has a direction.
// ═══════════════════════════════════════════════════════════════════════════

/** A door held shut, and the turn it gives out on. */
export interface Bar { a: number; b: number; until: number }

export interface Kit {
  /** Consumable. The only thing you can hold more than one of. */
  wedges: number;
  /** How many doors of fog a step lifts. 1, or 2 once bought. */
  lamp: number;
  /** 1 once the crawler is braced. */
  brace: number;
  /** 1 once the edge is keen. */
  edge: number;
  /** ★ 1 once you are carrying more life. The second honest +1, and the one
   *  that gates the deep end — see THE LADDER in `test/ladder.test.ts`. */
  vim: number;
}

export type Good = 'wedges' | 'lamp' | 'brace' | 'edge' | 'vim';

/** ★ How long a wedge holds. Four turns is two exchanges with a fast thing and
 *  four doors of running — long enough to be worth spending, short enough that
 *  it never becomes a wall you live behind. */
export const BAR_TURNS = 4;
export const WEDGES_PER = 3;
export const BRACE_HP = 5;
export const KEEN = 1;

/** ⚠️ PRICED AGAINST WHAT A RUN ACTUALLY PAYS, and the first draft was not.
 *  A whole dungeon is 70 if you clear every room; ONE LAIR — which is what a
 *  first delve realistically gets you — is 6. The cheapest thing on sale cost
 *  12, so a player who went down, won a fight, and climbed out came back to a
 *  shop that could sell them nothing. The browser probe said it plainly:
 *  "one full raid affords nothing — the shop is out of reach".
 *
 *  ★ SO THE FIRST BUY IS EXACTLY ONE LAIR. Clear a room, climb out, spend it:
 *  that is the loop taught in one delve instead of three. The lot comes to
 *  135, a bit under two total clears, which is a ratchet you can feel. */
export const COST: Record<Good, number> = {
  wedges: SPOIL.lair, edge: 24, lamp: 45, brace: 60, vim: 90,
};

export const GOODS: Record<Good, string> = {
  wedges: `${WEDGES_PER} iron wedges`,
  edge: 'A keen edge',
  lamp: 'A wider lamp',
  brace: 'A braced crawler',
  vim: 'Boiled leather',
};

export const SAYS: Record<Good, string> = {
  wedges: `bar a door for ${BAR_TURNS} turns — it has to go round`,
  edge: `every swing takes ${BITE + KEEN} instead of ${BITE}`,
  lamp: 'see two doors out, not one — plan past the fork',
  brace: `the crawler takes ${CRAWL_HP + BRACE_HP} — it maps far more`,
  vim: `start each delve on ${START_HP + VIM} life, not ${START_HP}`,
};

/** Life at the top of a delve, with what you are wearing. */
export const maxHp = (g: Delve): number => START_HP + g.kit.vim * VIM;

/** ★★★ HAVE YOU FINISHED? Every room in the dungeon, stood in, by YOU.
 *
 *  ⚠️ NOT "every room cleared". You do not have to beat the Hoard — you have
 *  to have BEEN there. The whole game is a machine's map against a walked one,
 *  so the ending is the moment the walked one is complete: nothing left on your
 *  map that you took somebody else's word for. It also means the deep end is a
 *  dash rather than a wall — get in, take the hit, get out — which is a fight
 *  the kit can actually gate rather than a fight nothing can win. */
export const done = (g: Delve): boolean =>
  g.rooms.every((r) => g.trod.includes(r.id));

/** What one swing takes off, with what you are carrying. */
export const swing = (g: Delve): number => BITE + g.kit.edge * KEEN;

/** Every room within `n` doors, wedges respected. The fog, and nothing else. */
export function within(g: Delve, from: number, n: number): number[] {
  const out = new Set([from]);
  let edge = [from];
  for (let i = 0; i < n; i++) {
    const next: number[] = [];
    for (const r of edge) for (const d of doorsOf(g, r)) if (!out.has(d)) { out.add(d); next.push(d); }
    edge = next;
  }
  return [...out];
}

export function unwedgeable(g: Delve, to: number): string | null {
  if (g.fallen) return 'You are done.';
  if (g.kit.wedges <= 0) return 'No wedges.';
  if (!doorsOf(g, g.at).includes(to)) return 'No door leads there from here.';
  if (shut(g, g.at, to)) return 'Already wedged.';
  return null;
}

/** ★ DO YOU ALREADY HAVE IT?
 *  ⚠️ NOT `kit[w] >= 1`. The lamp's UNBOUGHT value is 1 — one door of fog —
 *  and a bought one is 2, so the obvious test read "already owned" for a lamp
 *  nobody had bought and silently made it unpurchasable. Three tests failed on
 *  that one line. A field whose zero is not 0 needs asking about by name. */
export const has = (k: Kit, w: Good): boolean =>
  w === 'wedges' ? false : w === 'lamp' ? k.lamp > 1 : k[w] >= 1;

export const affordable = (g: Delve, w: Good): boolean =>
  g.at === 0 && !g.fallen && g.hoard >= COST[w] && !has(g.kit, w);

/** ★★★ A FRESH RUN AT THE SAME DUNGEON — the shape of the whole game.
 *
 *  ⚠️ WITHOUT THIS THE SHOP IS A LIE. A cleared room pays once and stays
 *  cleared, so the dungeon's TOTAL income was 70 gold, ever, against a shop
 *  that costs 172: the ratchet could not physically be turned to the end. That
 *  is not a balance problem, it is an arithmetic one, and it only showed up
 *  when the prices were written down next to the spoils.
 *
 *  So the dark closes behind you. Guards are back in their lairs, the spoil is
 *  back in the rooms, and the wedges you drove have been pushed out — a run is
 *  a run. What crosses the threshold with you is what you OWN and what you
 *  KNOW: the hoard, the kit, the map you have walked, and everything the
 *  crawler ever filed. Dying costs you the purse and the run; it has never
 *  cost you a delve you already won, and now it cannot.
 */
export const descend = (g: Delve): Delve => ({
  ...initial(),
  hoard: g.hoard,
  kit: g.kit,
  crawl: g.crawl,
  floor: g.floor,
  rooms: g.rooms,
  hp: START_HP + g.kit.vim * VIM,
  trod: g.trod,
  // ★ THE MAP IS KNOWLEDGE, and knowledge does not fall down a hole with you.
  seen: g.seen,
  log: g.log,
});

/** ★★★ HOW LONG A SHOVE KEEPS IT DOWN. Two, because one is worth nothing: it
 *  would step straight back through the door and the shove would have cost you
 *  a turn for no turns gained. At two it loses a beat AND a door. */
export const REEL = 2;

export function unshovable(g: Delve, foe: number, to: number): string | null {
  if (g.fallen) return 'You are done.';
  const mark = g.foes.find((f) => f.id === foe);
  if (!mark || mark.hp <= 0 || mark.at !== g.at) return 'Not here to shove.';
  if (!doorsOf(g, g.at).includes(to)) return 'No door leads there from here.';
  // ⚠️ AND NOT THROUGH A DOOR YOU WEDGED. The whole point of a wedge is that
  // the edge is gone; putting something through it would be using a cut door.
  if (shut(g, g.at, to)) return 'That door is wedged shut.';
  return null;
}

/** ★ What this turn will cost you if you take it standing here — and what it
 *  costs if you get your arm up instead. The two numbers a fight turns on. */
export const toll = (g: Delve): number =>
  facing(g).filter((f) => actsOn(f, g.turn + 1)).reduce((n, f) => n + f.bite, 0);
export const braced = (g: Delve): number =>
  facing(g).filter((f) => actsOn(f, g.turn + 1))
    .reduce((n, f) => n + Math.ceil(f.bite / 2), 0);

// ═══════════════════════════════════════════════════════════════════════════
// ★★★ DEPTH — the content tier and the prestige layer, 2026-08-20.
//
// The owner: *"go analyze what other games in the genre have and go implement
// all of that"*. The two things this game was missing from BOTH its genres
// turned out to be the same thing.
//
// A roguelike with one hand-drawn level is a puzzle you solve once. An
// incremental with no content tier is a shop with a last item — and this one
// had a last item, and an ending that arrived at it. DEPTH is new ground to
// map AND the next rung, so it is the first thing built.
//
// ⚠️ AND THE STAIR IS IN THE HOARD, which is the room the whole map points at
// and the one fight you are not expected to win. So going deeper is a DASH you
// have to earn, not a button on the shop screen.
// ═══════════════════════════════════════════════════════════════════════════

/** ★ Have you earned the stair? You have to be standing in the Hoard, alive.
 *  ⚠️ NOT "cleared the Hoard" — that fight is unwinnable by design and gating
 *  the whole rest of the game behind it would end the game at floor one. */
export const canDescend = (g: Delve): boolean =>
  !g.fallen && roomAt(g, g.at)?.kind === 'hoard';

/** ★★★ HOW MUCH HARDER IT GETS. Guards read `deep`, which is the rank inside a
 *  floor, so a floor's own depth is added on top: floor 3's first lair is as
 *  bad as floor 1's third. Linear on purpose — the kit is linear too, and an
 *  exponential wall on floor 4 is how an incremental stops being playable
 *  before its own numbers get interesting. */
export const HARDER = 2;
export const deepness = (g: Delve, r: Room): number => r.deep + (g.floor - 1) * HARDER;

/** ★ And what a floor pays. Deeper rooms are worth more, or there is no reason
 *  to be down there rather than farming the floor you have already learned. */
export const worth = (g: Delve, r: Room): number =>
  Math.round(SPOIL[r.kind] * (1 + (g.floor - 1) * 0.6));
