// ★★★ THE DELVE — the dungeon pivot, and then the TURN, 2026-08-16.
//
// The owner: *"world is too open for graphs... maybe DUNGEON CRAWLING"*, then
// *"so like legend of grimrock type of shit"*, then — after the first slice
// shipped with a clock in it — ***"why is it real time fights / let's do turn
// based"***. They were right twice over: the clock was the TOWN's idle spine
// imported out of habit, and it made every exchange a thing you had to FEEL
// rather than COUNT. A crawler wants arithmetic you can do before you commit.
//
// So there are no seconds anywhere below. One action, one turn, then the
// dungeon takes its turn — and most of these tests are still about footwork,
// because on a graph COMBAT IS MOVEMENT and that has not changed.
import { describe, it, expect } from 'vitest';
import { apply, initial, doorsOf, held, facing, foesIn, stepToward, actsOn,
  unwalkable, unswingable, canLeave, START_HP, BITE,
  type Delve, type Foe } from '../src/delve/engine';
import { ROOMS, ROOM, SPOIL } from '../src/delve/dungeon';

const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
const hit = (g: Delve): Delve => apply(g, { type: 'strike' });
/** In the Rat Warren (3) with its guard roused, having walked 0 → 1 → 3. */
const warren = (): Delve => go(go(initial(), 1), 3);
/** One hand-made thing in room 3, so a rule can be read off a single number. */
const alone = (over: Partial<Foe>): Delve => ({
  ...initial(), at: 3, seen: [0, 1, 2, 3, 5], cleared: [0], bred: 2,
  foes: [{ id: 1, at: 3, from: 3, hp: 30, bite: 2, name: 'it', every: 2, reeling: 0, ...over }],
});

describe('★★★ THE DUNGEON IS A GRAPH', () => {
  it('★★★ every door goes both ways', () => {
    // ⚠️ THE ONE STRUCTURAL FACT A HAND-DRAWN MAP GETS WRONG, and the monsters
    // path along these edges too — a one-way door would strand one.
    for (const r of ROOMS) {
      for (const d of r.doors) {
        expect(ROOM.get(d), `room ${d} exists`).toBeDefined();
        expect(ROOM.get(d)!.doors, `${d} answers ${r.id}`).toContain(r.id);
      }
    }
  });

  it('★★★ and every room is reachable from the mouth', () => {
    const g = initial();
    const seen = new Set([0]);
    const queue = [0];
    for (let i = 0; i < queue.length; i++) {
      for (const d of doorsOf(g, queue[i]!)) if (!seen.has(d)) { seen.add(d); queue.push(d); }
    }
    expect(seen.size).toBe(ROOMS.length);
  });
});

describe('★★★ THE MONSTERS USE THE SAME GRAPH YOU DO', () => {
  it('★★★ a step toward you is one door along the shortest way', () => {
    const g = initial();
    // The Hoard (9) back to the Mouth (0) runs 9-8-6-4-2-1-0.
    expect(stepToward(g, 9, 0)).toBe(8);
    expect(stepToward(g, 0, 9)).toBe(1);
    expect(stepToward(g, 3, 3)).toBeNull();
  });

  it('★★★ and it is a real path, not a guess — walking it arrives', () => {
    // ⚠️ THE PROPERTY THAT MAKES THE DANCE LEGIBLE. The player can count the
    // doors between them and the thing chasing them; if the chase used any
    // other route that count would be a lie.
    const g = initial();
    let from = 9;
    let steps = 0;
    while (from !== 0 && steps < 20) { from = stepToward(g, from, 0)!; steps++; }
    expect(from).toBe(0);
    expect(steps).toBeLessThanOrEqual(6);
  });
});

describe('★★★ ONE ACTION IS ONE TURN', () => {
  it('★★★ walking, swinging and waiting each cost exactly one', () => {
    const g = initial();
    expect(g.turn).toBe(0);
    expect(go(g, 1).turn).toBe(1);
    expect(wait(g).turn).toBe(1);
    expect(hit(alone({})).turn).toBe(1);
    // ⚠️ AND A REFUSED ACTION IS NOT A TURN. A move the game will not let you
    // make must not hand the dungeon a free swing.
    expect(go(g, 9)).toBe(g);
    expect(hit(g)).toBe(g);
  });

  it('★★★ a foe acts on every `every`-th turn — the one number to read', () => {
    const fast: Foe = { id: 1, at: 0, from: 0, hp: 1, bite: 1, name: 'x', every: 1, reeling: 0 };
    const slow: Foe = { ...fast, every: 2 };
    expect([1, 2, 3, 4].map((t) => actsOn(fast, t))).toEqual([true, true, true, true]);
    expect([1, 2, 3, 4].map((t) => actsOn(slow, t))).toEqual([false, true, false, true]);
  });
});

describe('★★★ WALKING AND THE DARK', () => {
  it('★★★ arriving reveals only the next doors, and nothing beyond', () => {
    const g = initial();
    expect(g.seen).not.toContain(2);
    const there = go(g, 1);
    expect(there.at).toBe(1);
    expect(there.seen).toContain(2);
    expect(there.seen).toContain(3);
    expect(there.seen).not.toContain(4);   // and no further
  });

  it('★ you may only walk a door you have', () => {
    const g = initial();
    expect(unwalkable(g, 9)).toBe('No door leads there from here.');
    expect(apply(g, { type: 'walk', to: 9 })).toBe(g);   // refused, unchanged
  });
});

describe('★★★ COMBAT IS MOVEMENT', () => {
  it('★★★ a room\'s guard wakes ONCE, into the dungeon, and stands there', () => {
    const g = warren();
    expect(g.foes.length).toBeGreaterThan(1);
    expect(foesIn(g, 3).length).toBe(g.foes.length);
    expect(facing(g).length).toBe(g.foes.length);
    // ⚠️ AND ONLY ONCE. Walking out and back must not breed a second pack.
    const back = go(go(g, 1), 3);
    expect(back.foes.length).toBe(g.foes.length);
  });

  it('★★★ the thing that hits hardest is the thing you can walk away from', () => {
    // ⚠️ A PACK THAT MOVES AS ONE IS ONE MONSTER WITH A BIGGER NUMBER. The
    // whole reason to give a foe a speed is that the heavy one is slow enough
    // to leave behind and the light one is not — so a lair poses a QUESTION
    // (take the cheap hits and kill the big one, or shed it and deal with the
    // runt) rather than a total.
    const g = warren();
    const heavy = g.foes.reduce((x, y) => (y.bite > x.bite ? y : x));
    const light = g.foes.reduce((x, y) => (y.bite < x.bite ? y : x));
    expect(heavy.bite).toBeGreaterThan(light.bite);
    expect(heavy.every).toBeGreaterThan(light.every);
  });

  it('★★★ it bites you while you stand in its room', () => {
    const g = warren();
    expect(wait(g).hp).toBeLessThan(g.hp);
  });

  it('★★★ A SLOW THING CAN BE STEPPED AWAY FROM — but only on its off-turn', () => {
    // ★★★ THIS IS THE WHOLE DANCE, and it is arithmetic, not reflex. The thing
    // acts on even turns; step on an odd one and the door is free.
    const off = alone({ every: 2, hp: 30 });                 // turn 0 → 1: idle
    const stepped = go(off, 1);
    expect(stepped.at).toBe(1);
    expect(stepped.hp).toBe(off.hp);                          // clean away

    const on = { ...off, turn: 1 };                           // turn 1 → 2: acts
    expect(go(on, 1).hp).toBe(on.hp - 2);
  });

  it('★★★ A FAST THING CANNOT — leaving its room costs the same as staying', () => {
    // ⚠️ THE BUG THIS EXISTS TO KILL. When a foe was judged only by the room
    // you ARRIVED in, walking back and forth was a perfect defence: nothing was
    // ever in your new room when it swung, so a delver could stroll to the
    // Hoard untouched and retreat from every losing fight for free. A foe
    // reaches you at EITHER end of your step.
    const g = alone({ every: 1, bite: 2, hp: 30 });
    expect(wait(g).hp).toBe(g.hp - 2);
    expect(go(g, 1).hp).toBe(g.hp - 2);
    // And walking back is not free either — no perpetual motion.
    expect(go(go(g, 1), 3).hp).toBe(g.hp - 4);
  });

  it('★★★ but it FOLLOWS — a door buys distance, it does not end the fight', () => {
    const away = wait(go(warren(), 1));
    expect(away.at).toBe(1);
    expect(away.foes.some((f) => f.at === 1)).toBe(true);
  });

  it('★★★ a swing takes the WEAKEST thing standing — no aiming tax', () => {
    const g = warren();
    const weakest = Math.min(...g.foes.map((f) => f.hp));
    expect(Math.min(...hit(g).foes.map((f) => f.hp))).toBe(Math.max(0, weakest - BITE));
  });

  it('★ you cannot swing at an empty room', () => {
    expect(unswingable(initial())).toBe('Nothing here to hit.');
    expect(unswingable(warren())).toBeNull();
  });
});

describe('★★★ WHAT A ROOM IS WORTH', () => {
  /** Swing at what is here; if nothing is, stand and let it come. */
  const hunt = (g: Delve): Delve => {
    let out = g;
    for (let i = 0; i < 200 && !out.fallen && out.foes.some((f) => f.hp > 0); i++) {
      out = facing(out).length > 0 ? hit(out) : wait(out);
    }
    return out;
  };

  it('★★★ killing its guard empties the room and pays the purse', () => {
    const won = hunt({ ...warren(), hp: 200 });
    expect(facing(won).length).toBe(0);
    expect(won.cleared).toContain(3);
    expect(won.purse).toBe(SPOIL.lair);
    expect(held(won, 3)).toBe(false);
  });

  it('★★★ a guard that CHASED you and died elsewhere still empties its room', () => {
    // ⚠️ THE ROOM IS JUDGED BY ITS OWN DEAD, which is why every foe carries
    // the room it was roused from. Without that, luring a pack into the hall
    // and killing it there would leave its lair permanently "held" — a room
    // you cleared that the map insists you did not.
    const lured = hunt(go({ ...warren(), hp: 200 }, 1));
    expect(lured.at).toBe(1);
    expect(lured.foes.every((f) => f.hp <= 0)).toBe(true);
    expect(lured.cleared).toContain(3);
    expect(lured.purse).toBe(SPOIL.lair);
  });

  it('★★★ a dead end with nothing to kill still pays on arrival', () => {
    // ⚠️ The Drowned Well is worth 12 and has no guard. Until spoil could come
    // from somewhere other than a corpse, it could never hand that over — a
    // dead end with no reason to walk it.
    const well = go(go(go(go(initial(), 1), 3), 5), 7);
    expect(well.at).toBe(7);
    expect(well.purse).toBeGreaterThanOrEqual(SPOIL.well);
    expect(well.cleared).toContain(7);
    // And it does not pay twice for the same walk back in.
    const again = go(go(well, 5), 7);
    expect(again.purse).toBe(well.purse);
  });

  it('★★★ falling costs the purse and keeps the hoard', () => {
    const down = wait({ ...warren(), hp: 1, purse: 30, hoard: 55 });
    expect(down.fallen).toBe(true);
    expect(down.purse).toBe(0);
    expect(down.hoard).toBe(55);
    const next = apply(down, { type: 'leave' });
    expect(next.fallen).toBe(false);
    expect(next.hp).toBe(START_HP);
    expect(next.hoard).toBe(55);
  });
});

describe('★★★ CLIMBING OUT IS THE DECISION', () => {
  it('★★★ the purse only banks at the mouth', () => {
    const carrying: Delve = { ...go(initial(), 1), purse: 12 };
    expect(canLeave(carrying)).toBe(false);
    expect(apply(carrying, { type: 'leave' })).toBe(carrying);
    const home = go(carrying, 0);
    expect(canLeave(home)).toBe(true);
    const banked = apply(home, { type: 'leave' });
    expect(banked.hoard).toBe(12);
    expect(banked.purse).toBe(0);
    expect(banked.hp).toBe(START_HP);
  });

  it('★★★ but the Mouth is a way out even empty-handed', () => {
    // ⚠️ REVERSED WITH THE CRAWLER, 2026-08-18. This used to assert the
    // opposite, on the tidiness argument that leaving with nothing is not a
    // move. Then the crawler started WAKING THINGS on its own and walking them
    // up the shaft after you, and a delver standing at the Mouth with an empty
    // purse and a pack arriving had no move at all. A tidy button is worth
    // less than a way out. See `test/crawler.test.ts`.
    expect(canLeave(initial())).toBe(true);
    expect(canLeave(go(initial(), 1))).toBe(false);
  });
});
