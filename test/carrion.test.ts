// ★★★ WHAT COMES BACK IS NOT WHAT YOU KILLED — 2026-08-23.
//
// The owner, playing the build where guards first respawned between delves:
//
//   *"Guards come back, so every trip to fresh ground walks back through the
//    Rat Warren. Same rats, third the money, again. The spoil doesn't repeat —
//    the TRANSIT does. That's the rerun wearing a coat."*
//
// ⚠️ AND THE RESPAWN COULD NOT SIMPLY BE DELETED. It is the only income a
// stranded delver has (`test/broke.test.ts`): rooms pay their spoil once, so
// without something to kill in an emptied room a bad run of purchases ends the
// game at the Mouth. Both halves of the owner's sentence are answered by one
// trait — what moves in does NOT chase, so your own cleared corridor costs a
// turn to cross and nothing else, and it is still worth a coin if you want one.
import { describe, it, expect } from 'vitest';
import { TRAITS, scavengedOf, lairOf, type Breed } from '../src/delve/bestiary';
import { apply, initial, guardsOf, facing, foesIn, deepness, held, lit,
  roomAt, type Delve } from '../src/delve/engine';

const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
/** Walk into the Rat Warren, kill what is in it, and climb back out. */
const raid = (g: Delve): Delve => {
  let out: Delve = { ...go(go(g, 1), 3), hp: 900, oil: 900 };
  for (let i = 0; i < 40 && facing(out).length > 0; i++) out = apply(out, { type: 'strike' });
  return apply(go(go(out, 1), 0), { type: 'leave' });
};

describe('★★★ THE DARK PUTS SOMETHING BACK, BUT NOT WHAT YOU TOOK OUT', () => {
  it('★★★ an emptied lair refills with carrion, not with its own garrison', () => {
    const g = { ...initial(), hp: 900, oil: 900 };
    const warren = roomAt(g, 3)!;
    const garrison = guardsOf(g, warren).map((q) => q.breed);
    expect(garrison).toEqual(lairOf(deepness(g, warren)).map((q) => q.breed));

    const after = raid(g);
    expect(after.cleared).toContain(3);
    const moved = guardsOf(after, warren);
    expect(moved.length).toBeGreaterThan(0);          // still worth a coin
    expect(moved.every((q) => q.breed === 'carrion')).toBe(true);
    expect(moved.map((q) => q.breed)).not.toEqual(garrison);
    // ★ And weaker than what it replaced, or "different" is just a rename.
    const was = lairOf(deepness(g, warren)).reduce((n, q) => n + q.hp + q.bite * 4, 0);
    const now = moved.reduce((n, q) => n + q.hp + q.bite * 4, 0);
    expect(now).toBeLessThan(was);
  });

  it('★★★ AND IT DOES NOT FOLLOW YOU — the transit stops being a rerun', () => {
    expect(TRAITS.carrion.chases).toBe(false);
    const after = raid({ ...initial(), hp: 900, oil: 900 });
    // Walk back in, then walk straight out again. Nothing comes with you.
    const back = go(go(after, 1), 3);
    expect(foesIn(back, 3).length).toBeGreaterThan(0);
    const past = wait(wait(go(back, 1)));
    expect(past.at).toBe(1);
    expect(foesIn(past, 1).length).toBe(0);
  });

  it('★★★ AND IT DOES NOT SWING AT YOUR BACK — the rule that makes it walkable', () => {
    // ⚠️ MEASURED ON A TURN THE THING ACTUALLY ACTS ON, with the foe placed by
    // hand. The first version of this check walked a real emptied lair and
    // asserted the damage was "less than four" — and a sabotage that gave
    // carrion its parting shot back sailed straight through, because carrion
    // is SLOW and only swings on even turns. Half the time the bug was
    // invisible, which for a test means all of the time.
    //
    // Everything else down here reaches you at BOTH ends of a step. Carrion is
    // the one exception, and it is the whole reason your own cleared corridor
    // is a corridor rather than a toll.
    const inRoom = (breed: Breed, every: number): Delve => ({
      ...initial(), at: 3, hp: 400, oil: 400, turn: every - 1,
      seen: [0, 1, 2, 3, 5], cleared: [0, 3], bred: 2,
      foes: [{ id: 1, at: 3, from: 3, hp: 40, bite: 2, name: TRAITS[breed].name,
        breed, every, reeling: 0 }],
    });
    const leaving = (g: Delve): number => g.hp - go(g, 1).hp;
    // The control: a runt takes its swing as you go, and always has.
    const runt = inRoom('runt', 1);
    expect(TRAITS.runt.parting).toBe(true);
    expect(leaving(runt)).toBeGreaterThan(0);
    // And a carrion, on a turn it is awake for, does not.
    const dead = inRoom('carrion', 2);
    expect((dead.turn + 1) % 2).toBe(0);            // it acts on this turn
    expect(TRAITS.carrion.parting).toBe(false);
    expect(leaving(dead)).toBe(0);
    // ★ It is not asleep — standing there still costs you.
    expect(wait(dead).hp).toBeLessThan(dead.hp);
  });

  it('★★★ and a LANTERN keeps even that out — the second thing a lantern buys', () => {
    const after = raid({ ...initial(), hp: 900, oil: 900 });
    const stocked: Delve = { ...go(go(after, 1), 3), hp: 900, oil: 900,
      kit: { ...after.kit, flask: 2 } };
    // Clear the squatters, hang a light, climb out, come back.
    let quiet = stocked;
    for (let i = 0; i < 20 && facing(quiet).length > 0; i++) quiet = apply(quiet, { type: 'strike' });
    const hung = apply(quiet, { type: 'hang' });
    expect(lit(hung, 3)).toBe(true);
    expect(guardsOf(hung, roomAt(hung, 3)!)).toEqual([]);
    expect(held(hung, 3)).toBe(false);
    const nextDelve = apply(go(go(hung, 1), 0), { type: 'leave' });
    expect(lit(nextDelve, 3)).toBe(true);
    expect(foesIn(go(go(nextDelve, 1), 3), 3).length).toBe(0);
  });

  it('★★★ and there are as many of them as the room had guards', () => {
    // ⚠️ NOT A FLAVOUR DECISION. The toll is paid PER CORPSE, so halving the
    // bodies halves the only income a stranded delver has — the first draft
    // shipped one carrion per room and `test/broke.test.ts` went from a hoard
    // climbing 6 over eight delves to one climbing 2. That is the soft-lock
    // coming back in through a monster's stat block.
    const g = { ...initial(), hp: 900, oil: 900 };
    for (const id of [3, 4, 8]) {
      const room = roomAt(g, id)!;
      const many = guardsOf(g, room).length;
      const emptied: Delve = { ...g, cleared: [...g.cleared, id] };
      expect(guardsOf(emptied, room).length).toBe(many);
    }
    expect(scavengedOf(4, 3).length).toBe(3);
  });

  it('★ carrion thickens with depth, like everything else down here', () => {
    expect(scavengedOf(9)[0]!.hp).toBeGreaterThan(scavengedOf(2)[0]!.hp);
    expect(scavengedOf(9)[0]!.name).toBe(TRAITS.carrion.name);
  });
});
