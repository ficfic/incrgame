// ★★★ THE CUT — what is wrong with THIS floor, 2026-08-23.
//
// The owner, playing the build where floors first went endless: *"Put
// something behind the stair that isn't floor one at +60%."*
//
// ⚠️ AND THE NUMBERS WERE THE TELL. A new floor had more rooms, harder guards
// and richer spoil, and every one of those is the same floor with a multiplier
// on it. This game already had five rules a player has to hold in their head —
// light burns a turn, things follow you, a lair fields a pair, spoil pays once,
// lanterns are free ground — so a floor breaks exactly ONE of them.
import { describe, it, expect } from 'vitest';
import { cutOf, CUTS, CUT_SAYS, roomsOn, floorPlan, type Cut } from '../src/delve/floors';
import { TRAITS, lairOf } from '../src/delve/bestiary';
import { apply, initial, guardsOf, worth, foesIn, cut, deepness, DREGS,
  type Delve } from '../src/delve/engine';

/** A delver standing on floor `d`, healthy, with the map in hand. */
const on = (d: number, over: Partial<Delve> = {}): Delve => {
  const rooms = floorPlan(d);
  return { ...initial(), floor: d, rooms, hp: 900, oil: 400,
    seen: rooms.map((r) => r.id), ...over };
};
/** The shallowest floor carrying a given cut — the cuts are dealt by depth,
 *  so a test that hard-codes a floor number is a test pinned to a hash. */
const floorWith = (c: Cut): number => {
  for (let d = 2; d < 60; d++) if (cutOf(d) === c) return d;
  throw new Error(`no floor is ${c} — the deal is broken`);
};
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });

describe('★★★ EVERY FLOOR HAS ONE THING WRONG WITH IT', () => {
  it('★★★ floor one has none, and every floor below has exactly one', () => {
    // ★ The first descent is the tutorial and stays the tutorial.
    expect(cutOf(1)).toBe('plain');
    for (let d = 2; d < 40; d++) expect(CUTS).toContain(cutOf(d));
  });

  it('★★★ and never the same two floors running', () => {
    // ⚠️ A CONDITION YOU HAVE ALREADY LEARNED AND ARE STILL STANDING IN is not
    // a condition, it is the weather. The first version compared the raw draws
    // rather than the dealt cuts and put "It was sealed for a reason" on floors
    // 5 and 6 with a comment three lines up promising it could not.
    for (let d = 3; d < 200; d++) expect(cutOf(d)).not.toBe(cutOf(d - 1));
  });

  it('★★★ and all five turn up, roughly evenly, in the first fifty floors', () => {
    // ⚠️ DETERMINISTIC IS THE REQUIREMENT; PATTERNED IS A DIFFERENT THING. Two
    // drafts of this dealt dark/hush/flood over and over, because an LCG
    // seeded from `depth` does not mix adjacent seeds however hard you step it.
    const seen = new Map<Cut, number>();
    for (let d = 2; d <= 200; d++) seen.set(cutOf(d), (seen.get(cutOf(d)) ?? 0) + 1);
    expect([...seen.keys()].sort()).toEqual([...CUTS].sort());
    for (const c of CUTS) {
      expect(seen.get(c)!, `${c} is dealt ${seen.get(c)} times in 200`)
        .toBeGreaterThan(199 / CUTS.length / 2);
    }
    // ★ And it is never a rota: three floors running must not repeat a period.
    let rota = 0;
    for (let d = 2; d < 60; d++) if (cutOf(d) === cutOf(d + 2)) rota++;
    expect(rota, 'the cuts alternate on a two-floor cycle').toBeLessThan(30);
  });

  it('★ each one says what it does, in the words the screen uses', () => {
    for (const c of [...CUTS, 'plain' as Cut]) {
      expect(CUT_SAYS[c].name.length).toBeGreaterThan(3);
      expect(CUT_SAYS[c].says.length).toBeGreaterThan(10);
    }
  });
});

describe('★★★ AND EACH ONE BREAKS A RULE YOU ALREADY KNEW', () => {
  it('★★★ THE WATER IS IN IT — a turn burns two light, not one', () => {
    const flood = on(floorWith('flood'), { oil: 20 });
    const plain = on(floorWith('swarm'), { oil: 20 });
    expect(cut(flood)).toBe('flood');
    expect(plain.oil - wait(plain).oil).toBe(1);
    expect(flood.oil - wait(flood).oil).toBe(2);
    // ⚠️ AND A LANTERN STILL BEATS IT — otherwise the cut deletes the verb
    // rather than pricing it, which is worth twice as much on this floor.
    const under: Delve = { ...flood, lamps: [flood.at] };
    expect(under.oil - wait(under).oil).toBe(0);
  });

  it('★★★ SOMETHING BRED DOWN HERE — every lair fields one more', () => {
    const swarm = on(floorWith('swarm'));
    const calm = on(floorWith('hush'));
    const lairOn = (g: Delve): number => {
      const r = g.rooms.find((x) => x.kind === 'lair')!;
      return guardsOf(g, r).length;
    };
    expect(lairOn(swarm)).toBe(lairOn(calm) + 1);
  });

  it('★★★ THE HUSH — nothing follows you out of its room', () => {
    // The one cut that makes the floor EASIER to survive and harder to profit
    // from: every fight on it is one you walked into on purpose.
    const chase = (d: number): boolean => {
      // ⚠️ WALKED INTO, NOT TELEPORTED INTO. A guard wakes when you come
      // through its door; setting `at` by hand leaves the lair empty and the
      // control case then "proved" that nothing follows you anywhere.
      const start = on(d);
      const lair = start.rooms.find((r) => r.kind === 'lair'
        && r.doors.length > 0
        // ★ And something in it that chases — a lurker never does, by trait.
        && guardsOf(start, r).some((q) => TRAITS[q.breed].chases))!;
      const door = lair.doors[0]!;
      let g: Delve = apply({ ...start, at: door }, { type: 'walk', to: lair.id });
      expect(foesIn(g, lair.id).length).toBeGreaterThan(0);
      g = apply(g, { type: 'walk', to: door });
      g = wait(wait(g));
      return foesIn(g, g.at).length > 0;
    };
    expect(chase(floorWith('hush'))).toBe(false);
    expect(chase(floorWith('swarm'))).toBe(true);
  });

  it('★★★ IT WAS SEALED FOR A REASON — twice the spoil, half again the fight', () => {
    // ⚠️ THE FIRST VERSION OF THIS TEST COMPARED A VALUE WITH ITSELF. It built
    // a "cut lifted" state by negating the floor and then put the floor back
    // before measuring, so it asserted `worth(vault) === worth(vault)` and
    // would have passed with the whole cut deleted. Both halves are measured
    // against something now.
    const deep = floorWith('vault');
    const plain = floorWith('swarm');
    // ★ SPOIL, with the depth ladder divided back out — otherwise this
    // measures how far down the floor is rather than what is wrong with it.
    const paid = (d: number): number => {
      const g = on(d);
      const lair = g.rooms.find((r) => r.kind === 'lair')!;
      return worth(g, lair) / (1 + (d - 1) * 0.6);
    };
    expect(paid(deep) / paid(plain)).toBeCloseTo(2, 1);
    // ★ AND THE FIGHT, against the bestiary itself — `lairOf` is the line-up
    // before any floor has had an opinion about it.
    const g = on(deep);
    const lair = g.rooms.find((r) => r.kind === 'lair')!;
    const raw = lairOf(deepness(g, lair));
    const sealed = guardsOf(g, lair);
    expect(sealed.length).toBe(raw.length);
    expect(sealed.reduce((n, q) => n + q.hp, 0))
      .toBe(raw.reduce((n, q) => n + Math.round(q.hp * 1.5), 0));
    // ⚠️ AND IT DOES NOT HIT HARDER, only last longer. Two knobs at once is a
    // floor nobody can attribute a death to.
    expect(sealed.map((q) => q.bite)).toEqual(raw.map((q) => q.bite));
  });

  it('★★★ THE LONG DARK — you come off the stair on the dregs, and it is small', () => {
    const d = floorWith('dark');
    expect(roomsOn(d)).toBeLessThan(roomsOn(d - 1));
    // Arrive from the floor above with a full lamp, and lose it on the stair.
    const above = on(d - 1, { oil: 400 });
    const hoard = above.rooms.find((r) => r.kind === 'hoard')!;
    const down = apply({ ...above, at: hoard.id }, { type: 'descend' });
    expect(down.floor).toBe(d);
    expect(down.oil).toBe(DREGS);
    expect(down.log.join(' ')).toMatch(/long dark/i);
    // ★ And a floor without the cut does not take your lamp.
    const plainD = [...Array(40).keys()].map((i) => i + 3)
      .find((x) => cutOf(x) !== 'dark' && cutOf(x - 1) !== 'dark')!;
    const before = on(plainD - 1, { oil: 400 });
    const stair = before.rooms.find((r) => r.kind === 'hoard')!;
    expect(apply({ ...before, at: stair.id }, { type: 'descend' }).oil)
      .toBeGreaterThan(DREGS);
  });
});
