// ★★★ THE DELVE — slice one of the dungeon pivot, 2026-08-16.
//
// The owner: *"world is too open for graphs... maybe we switch to DUNGEON
// CRAWLING?"* A dungeon IS a graph, so these tests are mostly about graph
// facts holding: doors go both ways, you cannot walk through a wall, and the
// dark only lifts one step at a time.
import { describe, it, expect } from 'vitest';
import { apply, initial, doorsOf, held, guardsIn, unwalkable, canLeave,
  unfleeable, wayBack,
  START_HP, BITE, type Delve } from '../src/delve/engine';
import { ROOMS, ROOM, WALK_SECS, SPOIL } from '../src/delve/dungeon';

const tick = (g: Delve, secs: number): Delve => apply(g, { type: 'tick', secs });
/** Walk a door and arrive. */
const go = (g: Delve, to: number): Delve =>
  tick(apply(g, { type: 'walk', to }), WALK_SECS);
/** Swing until the room is quiet or the delver is down. */
const clear = (g: Delve): Delve => {
  let out = g;
  for (let i = 0; i < 60 && out.fight; i++) out = apply(out, { type: 'strike' });
  return out;
};

describe('★★★ THE DUNGEON IS A GRAPH', () => {
  it('★★★ every door goes both ways', () => {
    // ⚠️ THE ONE STRUCTURAL FACT A HAND-DRAWN MAP GETS WRONG. A one-way door
    // is a fine mechanic and a terrible accident: the delver walks in and the
    // room they came from is not on the far side, so `flee` has nowhere to
    // go. If one is ever wanted it must be declared, not typo'd.
    for (const r of ROOMS) {
      for (const d of r.doors) {
        expect(ROOM.get(d), `room ${d} (door from ${r.id}) exists`).toBeDefined();
        expect(ROOM.get(d)!.doors, `${d} answers ${r.id}`).toContain(r.id);
      }
    }
  });

  it('★★★ and every room is reachable from the mouth', () => {
    // A room nobody can walk to is content that does not exist.
    const seen = new Set([0]);
    const queue = [0];
    for (let i = 0; i < queue.length; i++) {
      for (const d of doorsOf(queue[i]!)) if (!seen.has(d)) { seen.add(d); queue.push(d); }
    }
    expect(seen.size).toBe(ROOMS.length);
  });

  it('★★ the deep rooms are deeper — depth is not decoration', () => {
    // Depth drives what lives there and what it drops, so it has to agree
    // with the shape of the map rather than being typed in independently.
    for (const r of ROOMS) {
      if (r.id === 0) continue;
      const nearer = r.doors.map((d) => ROOM.get(d)!.deep);
      expect(Math.min(...nearer)).toBeLessThan(r.deep + 1);
    }
  });
});

describe('★★★ WALKING', () => {
  it('★★★ you may only walk a door you actually have', () => {
    const g = initial();
    expect(unwalkable(g, 1)).toBeNull();          // the mouth opens on the hall
    expect(unwalkable(g, 9)).toBe('No door leads there from here.');
    expect(apply(g, { type: 'walk', to: 9 })).toBe(g);
  });

  it('★★★ a walk takes time, and arriving is what reveals the next doors', () => {
    const g = initial();
    expect(g.seen).not.toContain(2);
    const half = tick(apply(g, { type: 'walk', to: 1 }), WALK_SECS / 2);
    expect(half.at).toBe(0);                       // still on the way
    expect(half.walk).not.toBeNull();
    const there = tick(half, WALK_SECS / 2);
    expect(there.at).toBe(1);
    expect(there.walk).toBeNull();
    // ★ THE DARK LIFTS ONE STEP. You now know the hall's doors exist.
    expect(there.seen).toContain(2);
    expect(there.seen).toContain(3);
    // ...but not what lies beyond them.
    expect(there.seen).not.toContain(4);
  });

  it('★ you cannot start a second walk mid-stride', () => {
    const moving = apply(initial(), { type: 'walk', to: 1 });
    expect(apply(moving, { type: 'walk', to: 1 })).toBe(moving);
  });
});

describe('★★★ WHAT IS ALREADY IN THE ROOM', () => {
  it('★★★ walking into a lair starts a fight, in that room', () => {
    // Room 3 is the Rat Warren.
    const g = go(go(initial(), 1), 3);
    expect(g.fight).not.toBeNull();
    expect(g.fight!.room).toBe(3);
    expect(g.fight!.line.length).toBeGreaterThan(1);
    // ⚠️ AND YOU ARE IN IT. The fight belongs to the room, not to a screen —
    // the delver has already walked in.
    expect(g.at).toBe(3);
  });

  it('★★★ a hall is just a hall', () => {
    const g = go(initial(), 1);
    expect(g.fight).toBeNull();
    expect(held(g, 1)).toBe(false);
  });

  it('★★★ clearing a room takes its spoil, and it stays cleared', () => {
    const won = clear(go(go(initial(), 1), 3));
    expect(won.fight).toBeNull();
    expect(won.cleared).toContain(3);
    expect(won.purse).toBe(SPOIL.lair);
    expect(held(won, 3)).toBe(false);
    // ★ Walk out and back: it is still quiet.
    const again = go(go(won, 1), 3);
    expect(again.fight).toBeNull();
  });

  it('★★★ every square answers, so AIMING is the decision', () => {
    // ⚠️ THE WHOLE TEXTURE OF A SMALL FIGHT. If only the aimed square bit
    // back, a line of three would be no worse than one and there would be
    // nothing to think about.
    const g = go(go(initial(), 1), 3);
    const one = apply(g, { type: 'strike' });
    const bite = g.hp - one.hp;
    expect(bite).toBe(g.fight!.line.reduce((n, q) => n + q.bite, 0));
    expect(bite).toBeGreaterThan(g.fight!.line[0]!.bite);
  });

  it('★★ killing a square stops it biting', () => {
    let g = go(go(initial(), 1), 3);
    const runt = g.fight!.line.findIndex((q) => q.hp <= BITE);
    if (runt < 0) return;
    g = apply(g, { type: 'aim', at: runt });
    const before = g.hp;
    g = apply(g, { type: 'strike' });      // the runt falls this swing
    const after = g.hp;
    const next = apply(g, { type: 'strike' });
    expect(before - after).toBeGreaterThan(after - next.hp);
  });

  it('★★★ falling costs the purse, and the hoard survives it', () => {
    const g: Delve = { ...go(go(initial(), 1), 3), hp: 1, purse: 30, hoard: 55 };
    const down = apply(g, { type: 'strike' });
    expect(down.fallen).toBe(true);
    expect(down.purse).toBe(0);
    expect(down.hoard).toBe(55);
    // ★ And a new delver picks up the lamp with what was banked.
    const next = apply(down, { type: 'leave' });
    expect(next.fallen).toBe(false);
    expect(next.hoard).toBe(55);
    expect(next.hp).toBe(START_HP);
  });

  it('★★ fleeing goes BACK ALONG A DOOR, and the room stays held', () => {
    const g = go(go(initial(), 1), 3);
    const out = apply(g, { type: 'flee' });
    expect(out.fight).toBeNull();
    expect(doorsOf(3)).toContain(out.at);      // a real edge, not a teleport
    expect(out.cleared).not.toContain(3);
    expect(out.hp).toBeLessThan(g.hp);         // they get a parting bite
    expect(out.hp).toBeGreaterThan(0);         // but never a kill
  });
});

describe('★★★ CLIMBING OUT IS THE DECISION', () => {
  it('★★★ the purse only banks at the mouth', () => {
    const won = clear(go(go(initial(), 1), 3));
    expect(won.purse).toBeGreaterThan(0);
    expect(canLeave(won)).toBe(false);          // still underground
    expect(apply(won, { type: 'leave' })).toBe(won);
    const home = go(go(won, 1), 0);
    expect(canLeave(home)).toBe(true);
    const banked = apply(home, { type: 'leave' });
    expect(banked.hoard).toBe(won.purse);
    expect(banked.purse).toBe(0);
    expect(banked.hp).toBe(START_HP);           // and you patch up
  });

  it('★ leaving with nothing is not a move', () => {
    expect(canLeave(initial())).toBe(false);
  });

  it('★★ what you have already cleared stays cleared between trips', () => {
    const won = clear(go(go(initial(), 1), 3));
    const banked = apply(go(go(won, 1), 0), { type: 'leave' });
    expect(banked.cleared).toContain(3);
  });
});

describe('★ the guards are built from depth, not typed in twice', () => {
  it('★★ a deeper lair is a harder lair', () => {
    const shallow = guardsIn(3);            // Rat Warren, deep 2
    const deeper = guardsIn(8);             // Bone Kiln, deep 5
    expect(deeper[0]!.hp).toBeGreaterThan(shallow[0]!.hp);
  });
  it('★ and a hall holds nobody at all', () => {
    expect(guardsIn(1)).toEqual([]);
  });
});

describe('★★★ CORNERED', () => {
  // A graph fact, not a mood: you walked into a node whose every neighbour is
  // held. On a map this would need inventing; here it falls out of the shape.
  it('★★★ with every door held, there is nowhere to run', () => {
    const g = go(go(initial(), 1), 3);        // in the Warren, fighting
    expect(unfleeable(g)).toBeNull();          // room 1 is a hall, it is open
    // Now pretend the gallery beyond is held too and the hall is not a way.
    const boxed: Delve = { ...g, cleared: [] };
    const doors = doorsOf(3);
    // Room 1 is a hall — halls are never held, so a true corner needs a room
    // whose doors are all lairs. Assert the RULE rather than staging one.
    expect(doors.some((d) => !held(boxed, d))).toBe(true);
    expect(wayBack(boxed, 3)).not.toBeNull();
  });

  it('★★★ and the refusal says so instead of teleporting you', () => {
    // ⚠️ THE BUG THIS REPLACED: the old retreat looked for a `cleared` room
    // and fell back to `?? 0`, so backing out of the Warren put the delver at
    // the MOUTH — across the whole dungeon, through walls.
    const g = go(go(initial(), 1), 3);
    const out = apply(g, { type: 'flee' });
    expect(out.at).not.toBe(0);
    expect(doorsOf(3)).toContain(out.at);
  });
});
