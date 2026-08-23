// ★★★ THE FLOORS — 2026-08-20, the genre pass.
//
// The owner: *"go analyze what other games in the genre have and go implement
// all of that"*. Both genres this game sits in were missing the same thing.
// A roguelike with one hand-drawn level is a puzzle you solve once; an
// incremental with no CONTENT TIER is a shop with a last item — and this one
// had a last item, and an ending that arrived at it.
//
// ⚠️ THE STRUCTURAL FACTS A GENERATOR GETS WRONG ARE THE ONES THIS GAME IS
// BUILT ON. Every rule here — the chase, the fog, the crawler's frontier, the
// way home — assumes a connected graph with two-way doors. A generator that
// produces one bad floor in fifty produces a dungeon a monster can never leave
// and a room a player can never reach, on a device with no console. So these
// run over MANY floors, not one.
import { describe, it, expect } from 'vitest';
import { floorPlan, roomsOn } from '../src/delve/floors';
import { apply, initial, doorsOf, canDescend, deepness, worth, roomAt,
  stepToward, done, BOUNTY, type Delve } from '../src/delve/engine';
import { take } from '../src/delve/records';
import { ROOMS } from '../src/delve/dungeon';

const DEEP = Array.from({ length: 40 }, (_, i) => i + 1);

describe('★★★ EVERY FLOOR IS A DUNGEON', () => {
  it('★★★ every door goes both ways, on all of them', () => {
    for (const d of DEEP) {
      const rooms = floorPlan(d);
      const by = new Map(rooms.map((r) => [r.id, r]));
      for (const r of rooms) {
        for (const door of r.doors) {
          expect(by.get(door), `floor ${d}: room ${door} exists`).toBeDefined();
          expect(by.get(door)!.doors, `floor ${d}: ${door} answers ${r.id}`).toContain(r.id);
        }
      }
    }
  });

  it('★★★ and every room is reachable from the way in', () => {
    // ⚠️ THE ONE THAT MATTERS MOST. An unreachable room is spoil that cannot be
    // taken and an ending that cannot be finished — `done()` wants every room
    // stood in, so ONE orphan on floor 12 would make the game unwinnable there
    // and nothing else in the code would notice.
    for (const d of DEEP) {
      const rooms = floorPlan(d);
      const by = new Map(rooms.map((r) => [r.id, r]));
      const seen = new Set([0]);
      const queue = [0];
      for (let i = 0; i < queue.length; i++) {
        for (const door of by.get(queue[i]!)!.doors) {
          if (!seen.has(door)) { seen.add(door); queue.push(door); }
        }
      }
      expect(seen.size, `floor ${d} is connected`).toBe(rooms.length);
    }
  });

  it('★★★ there is exactly one way in and one hoard, and the hoard is deepest', () => {
    for (const d of DEEP) {
      const rooms = floorPlan(d);
      expect(rooms.filter((r) => r.kind === 'mouth').length, `floor ${d}`).toBe(1);
      expect(rooms.filter((r) => r.kind === 'hoard').length, `floor ${d}`).toBe(1);
      expect(rooms[0]!.kind).toBe('mouth');
      const hoard = rooms.find((r) => r.kind === 'hoard')!;
      expect(Math.max(...rooms.map((r) => r.deep))).toBe(hoard.deep);
    }
  });

  it('★★★ and it is the SAME floor every time — no dice, ever', () => {
    // ⚠️ THE PROPERTY THE SAVE RESTS ON. A save records the NUMBER 4, not a
    // map; if floor 4 were not the same floor 4 forever, loading a save would
    // put you in a different dungeon than the one you closed the tab on.
    for (const d of [2, 5, 9, 17]) {
      expect(floorPlan(d)).toEqual(floorPlan(d));
      expect(JSON.stringify(floorPlan(d))).not.toBe(JSON.stringify(floorPlan(d + 1)));
    }
  });

  it('★★★ floor one is still the hand-drawn one', () => {
    // A generated tutorial is how a first ten minutes becomes a coin toss, and
    // roughly forty tests, the fight ladder and the pacing sim are pinned to
    // this exact shape.
    expect(floorPlan(1)).toEqual([...ROOMS]);
    expect(initial().floor).toBe(1);
    expect(initial().rooms).toEqual([...ROOMS]);
  });

  it('★★★ and no two rooms on a floor share a name', () => {
    // ⚠️ NOT COSMETIC. The panel names the room you are standing in, the log
    // says what woke where, and the crawler files claims by name — floor 2
    // shipped with two adjacent "Drowned Well"s and only the browser probe
    // saw it, because no unit test read a name.
    for (const d of DEEP) {
      const names = floorPlan(d).map((r) => r.name);
      expect(new Set(names).size, `floor ${d}: ${names.join(' · ')}`).toBe(names.length);
    }
  });

  it('★ one well a floor at most — a dead end that pays', () => {
    for (const d of DEEP) {
      expect(floorPlan(d).filter((r) => r.kind === 'well').length,
        `floor ${d}`).toBeLessThanOrEqual(1);
    }
  });

  it('★ they get bigger, and then they stop', () => {
    expect(roomsOn(2)).toBeGreaterThan(roomsOn(1));
    expect(roomsOn(40)).toBeLessThanOrEqual(18);   // a phone screen has a size
    for (const d of DEEP) expect(floorPlan(d).length).toBe(d <= 1 ? 10 : roomsOn(d));
  });
});

describe('★★★ AND YOU CAN GO DOWN', () => {
  /** Standing in the Hoard on floor 1, alive, by walking there. */
  const atTheHoard = (): Delve => {
    let g: Delve = { ...initial(), hp: 900 };
    for (const to of [1, 3, 5, 6, 8, 9]) g = apply(g, { type: 'walk', to });
    return g;
  };

  it('★★★ the stair is in the Hoard and nowhere else', () => {
    expect(canDescend(initial())).toBe(false);
    const deep = atTheHoard();
    expect(roomAt(deep, deep.at)!.kind).toBe('hoard');
    expect(canDescend(deep)).toBe(true);
    // ⚠️ AND NOT BY CLEARING IT. That fight is unwinnable by design; gating the
    // rest of the game behind it would end the game on floor one.
    expect(deep.cleared).not.toContain(9);
  });

  it('★★★ taking it puts you on a new floor, at the top, with nothing here yours', () => {
    const down = apply(atTheHoard(), { type: 'descend' });
    expect(down.floor).toBe(2);
    expect(down.at).toBe(0);
    expect(down.rooms).toEqual(floorPlan(2));
    expect(down.rooms.length).toBeGreaterThan(10);
    expect(down.trod).toEqual([0]);
    expect(down.foes).toEqual([]);
    expect(done(down)).toBe(false);          // a whole new map to make true
    // ★ What you own comes down the stair. What you knew does not.
    expect(down.kit).toEqual(atTheHoard().kit);
    expect(down.crawl).toBeNull();
  });

  it('★★★ and the purse is banked on the way past', () => {
    const rich: Delve = { ...atTheHoard(), purse: 40, hoard: 5 };
    const down = apply(rich, { type: 'descend' });
    expect(down.purse).toBe(0);
    // ⚠️ AND THE STAIR PAYS NOTHING ON TOP. It briefly paid a lump sum for the
    // whole floor you had mapped, which sounded right and was a promise the
    // game could not keep: the stair is behind the hardest room on the floor,
    // so the fee that was meant to fund the gear could only be collected by
    // somebody who no longer needed it. The ground is paid for as it is walked
    // — see `BOUNTY` — and by the time you are standing on the stair it is all
    // already in the purse this line is banking.
    expect(down.hoard).toBe(45);
    expect(down.tally.banked).toBe(rich.tally.banked + 40);
    // ★ And walking a floor is what earned it: six rooms, six fees.
    expect(rich.purse).toBeGreaterThan(0);
    expect(rich.trod.length).toBe(7);
    expect(rich.purse).toBeGreaterThanOrEqual(BOUNTY * 6);
  });

  it('★★★ deeper is harder AND richer, or there is no reason to be down there', () => {
    const one = initial();
    const four: Delve = { ...initial(), floor: 4, rooms: floorPlan(4) };
    const lair = four.rooms.find((r) => r.kind === 'lair')!;
    const shallow = one.rooms.find((r) => r.kind === 'lair')!;
    expect(deepness(four, lair)).toBeGreaterThan(deepness(one, shallow));
    expect(worth(four, lair)).toBeGreaterThan(worth(one, shallow));
  });

  it('★★★ a floor you walk down to actually fights harder', () => {
    // ⚠️ MEASURED BY WAKING ONE, not by reading the formula back.
    const rouse = (floor: number): number => {
      const g: Delve = { ...initial(), floor, rooms: floorPlan(floor), hp: 900 };
      const lair = g.rooms.find((r) => r.kind === 'lair' && doorsOf(g, 0).includes(r.id))
        ?? g.rooms.find((r) => r.kind === 'lair')!;
      let w = g;
      let hop = stepToward(g, 0, lair.id);
      let n = 0;
      while (hop !== null && n < 10) {
        w = apply(w, { type: 'walk', to: hop });
        if (w.at === lair.id) break;
        hop = stepToward(w, w.at, lair.id); n++;
      }
      return w.foes.reduce((s, f) => s + f.hp + f.bite * 4, 0);
    };
    expect(rouse(6)).toBeGreaterThan(rouse(1));
  });
});
