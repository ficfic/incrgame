// ★★★ THE DELVE — the dungeon pivot, and the Grimrock turn, 2026-08-16.
//
// The owner: *"world is too open for graphs... maybe DUNGEON CRAWLING"*, then
// *"so like legend of grimrock type of shit"*. Grimrock's real trick is that
// COMBAT IS MOVEMENT — you step, it swings where you were, you step back and
// hit. So most of these tests are about footwork on a graph: who is in which
// room, what it costs to leave, and what it costs the thing to follow.
import { describe, it, expect } from 'vitest';
import { apply, initial, doorsOf, held, facing, foesIn, stepToward,
  unwalkable, unswingable, canLeave, START_HP, BITE, SWING_SECS,
  type Delve } from '../src/delve/engine';
import { ROOMS, ROOM, WALK_SECS, SPOIL } from '../src/delve/dungeon';

const tick = (g: Delve, secs: number): Delve => apply(g, { type: 'tick', secs });
/** Let time run in small steps, the way the screen does. */
const run = (g: Delve, secs: number, step = 0.2): Delve => {
  let out = g;
  for (let t = 0; t < secs; t += step) out = tick(out, step);
  return out;
};
/** Walk a door and arrive. */
const go = (g: Delve, to: number): Delve =>
  run(apply(g, { type: 'walk', to }), WALK_SECS + 0.4);

describe('★★★ THE DUNGEON IS A GRAPH', () => {
  it('★★★ every door goes both ways', () => {
    // ⚠️ THE ONE STRUCTURAL FACT A HAND-DRAWN MAP GETS WRONG, and now the
    // monsters path along these edges too — a one-way door would strand one.
    for (const r of ROOMS) {
      for (const d of r.doors) {
        expect(ROOM.get(d), `room ${d} exists`).toBeDefined();
        expect(ROOM.get(d)!.doors, `${d} answers ${r.id}`).toContain(r.id);
      }
    }
  });

  it('★★★ and every room is reachable from the mouth', () => {
    const seen = new Set([0]);
    const queue = [0];
    for (let i = 0; i < queue.length; i++) {
      for (const d of doorsOf(queue[i]!)) if (!seen.has(d)) { seen.add(d); queue.push(d); }
    }
    expect(seen.size).toBe(ROOMS.length);
  });
});

describe('★★★ THE MONSTERS USE THE SAME GRAPH YOU DO', () => {
  it('★★★ a step toward you is one door along the shortest way', () => {
    // The Hoard (9) back to the Mouth (0) runs 9-8-6-4-2-1-0.
    expect(stepToward(9, 0)).toBe(8);
    expect(stepToward(0, 9)).toBe(1);
    expect(stepToward(3, 3)).toBeNull();
  });

  it('★★★ and it is a real path, not a guess — walking it arrives', () => {
    // ⚠️ THE PROPERTY THAT MAKES THE DANCE LEGIBLE. The player can count the
    // doors between them and the thing chasing them; if the chase used any
    // other route that count would be a lie.
    let from = 9;
    let steps = 0;
    while (from !== 0 && steps < 20) { from = stepToward(from, 0)!; steps++; }
    expect(from).toBe(0);
    expect(steps).toBeLessThanOrEqual(6);
  });
});

describe('★★★ WALKING AND THE DARK', () => {
  it('★★★ a walk takes time, and arriving reveals only the next doors', () => {
    const g = initial();
    expect(g.seen).not.toContain(2);
    const half = run(apply(g, { type: 'walk', to: 1 }), WALK_SECS / 2);
    expect(half.at).toBe(0);
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
  /** In the Rat Warren with its guard roused. */
  const warren = (): Delve => go(go(initial(), 1), 3);

  it('★★★ a room\'s guard wakes ONCE, into the dungeon, and stands there', () => {
    const g = warren();
    expect(g.foes.length).toBeGreaterThan(1);
    expect(foesIn(g, 3).length).toBe(g.foes.length);
    expect(facing(g).length).toBe(g.foes.length);
    // ⚠️ AND ONLY ONCE. Walking out and back must not breed a second pack.
    const back = go(go(g, 1), 3);
    expect(back.foes.length).toBe(g.foes.length);
  });

  it('★★★ it bites you while you stand in its room', () => {
    const g = warren();
    const after = run(g, 4);
    expect(after.hp).toBeLessThan(g.hp);
  });

  it('★★★ AND STEPPING THROUGH A DOOR STOPS IT — this is the whole game', () => {
    // Grimrock's footwork, on a graph. Stand and bleed; step and do not.
    const g = warren();
    const stood = run(g, 5);
    const stepped = run(apply(g, { type: 'walk', to: 1 }), 5);
    expect(stepped.hp).toBeGreaterThan(stood.hp);
  });

  it('★★★ nothing can touch you mid-door', () => {
    // ⚠️ A HIT YOU COULD NOT AVOID AND COULD NOT SEE COMING is the one thing
    // a deterministic fight must never do. The corridor is safe.
    const g = warren();
    const mid = run(apply(g, { type: 'walk', to: 1 }), WALK_SECS - 1);
    expect(mid.walk).not.toBeNull();
    expect(mid.hp).toBe(g.hp);
  });

  it('★★★ but it FOLLOWS — a door buys time, it does not end the fight', () => {
    const g = warren();
    const away = run(apply(g, { type: 'walk', to: 1 }), WALK_SECS + 6);
    expect(away.at).toBe(1);
    // The pack is coming through the door after you.
    expect(away.foes.some((f) => f.at === 1)).toBe(true);
  });

  it('★★★ a swing has a cooldown, and that is what position is bought with', () => {
    const g = warren();
    const hit = apply(g, { type: 'strike' });
    expect(hit.swing).toBe(SWING_SECS);
    expect(unswingable(hit)).toBe(`${SWING_SECS.toFixed(1)}s`);
    expect(apply(hit, { type: 'strike' })).toBe(hit);      // refused, not free
    const ready = run(hit, SWING_SECS + 0.3);
    expect(unswingable(ready)).toBeNull();
  });

  it('★★★ a swing takes the WEAKEST thing standing — no aiming tax', () => {
    const g = warren();
    const weakest = Math.min(...g.foes.map((f) => f.hp));
    const hit = apply(g, { type: 'strike' });
    expect(Math.min(...hit.foes.map((f) => f.hp))).toBe(Math.max(0, weakest - BITE));
  });

  it('★ you cannot swing at an empty room, or from a corridor', () => {
    expect(unswingable(initial())).toBe('Nothing here to hit.');
    const moving = apply(warren(), { type: 'walk', to: 1 });
    expect(unswingable(moving)).toBe('You are between rooms.');
  });
});

describe('★★★ WHAT A ROOM IS WORTH', () => {
  const warren = (): Delve => go(go(initial(), 1), 3);
  /** Swing whenever the cooldown allows until the room is quiet. */
  const fightOut = (g: Delve): Delve => {
    let out = g;
    for (let i = 0; i < 300 && !out.fallen && facing(out).length > 0; i++) {
      out = unswingable(out) === null ? apply(out, { type: 'strike' }) : tick(out, 0.2);
    }
    return out;
  };

  it('★★★ killing its guard empties the room and pays the purse', () => {
    const won = tick(fightOut({ ...warren(), hp: 200 }), 0.2);
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
    let g: Delve = { ...warren(), hp: 200 };
    g = run(apply(g, { type: 'walk', to: 1 }), WALK_SECS + 8);   // lure them out
    expect(g.at).toBe(1);
    expect(g.foes.some((f) => f.at === 1)).toBe(true);
    g = tick(fightOut(g), 0.2);
    expect(g.cleared).toContain(3);
    expect(g.purse).toBe(SPOIL.lair);
  });

  it('★★★ falling costs the purse and keeps the hoard', () => {
    const g: Delve = { ...warren(), hp: 1, purse: 30, hoard: 55 };
    const down = run(g, 6);
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

  it('★ leaving with nothing is not a move', () => {
    expect(canLeave(initial())).toBe(false);
  });
});
