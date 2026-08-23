// ★★★ THE LANTERN — light spent on the graph, 2026-08-23.
//
// The owner, asked what was missing after the lamp shipped: *"Oil spends on
// the graph — leave a lantern to keep a room lit; that's the one thing I could
// DO that I can't now."*
//
// ⚠️ AND IT IS THE FIRST THING IN THE GAME THAT MAKES THE SECOND TRIP CHEAPER
// THAN THE FIRST. The owner's other complaint about the same build was that
// the spoil stopped repeating but the TRANSIT did not — every walk to fresh
// ground goes back through the same three rooms. A flask poured buys you
// turns and they are gone; a flask hung buys a room, and the room is still
// there next delve. Light competes with light, which is the decision.
import { describe, it, expect } from 'vitest';
import { apply, initial, lit, dark, unhangable, maxOil, LANTERN, FLASK, LIGHT,
  DARK_BITE, type Delve } from '../src/delve/engine';

const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const hang = (g: Delve): Delve => apply(g, { type: 'hang' });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
const stocked = (n = 4): Delve => {
  const g = initial();
  return { ...g, hp: 400, kit: { ...g.kit, flask: n } };
};

describe('★★★ A FLASK ON THE WALL INSTEAD OF IN THE LAMP', () => {
  it('★★★ hanging one costs a flask and a turn, and lights the room', () => {
    const g = stocked();
    expect(lit(g, 0)).toBe(false);
    const hung = hang(g);
    expect(lit(hung, 0)).toBe(true);
    expect(hung.kit.flask).toBe(g.kit.flask - LANTERN);
    expect(hung.turn).toBe(g.turn + 1);
    expect(hung.log.join(' ')).toMatch(/hang a lantern in The Mouth/);
    // ★ And not twice in the same room, and not with an empty pack.
    expect(unhangable(hung)).toBe('There is a lantern here already.');
    expect(unhangable({ ...g, kit: { ...g.kit, flask: 0 } })).toBe('No oil to spare.');
    const empty: Delve = { ...g, kit: { ...g.kit, flask: 0 } };
    expect(hang(empty)).toBe(empty);
  });

  it('★★★ AND A LIT ROOM COSTS NO LIGHT TO STAND IN — the whole point', () => {
    const g = hang(stocked());
    expect(g.oil).toBe(LIGHT - 1);        // hanging it was a turn like any other
    // ⚠️ AND THE HANGING BURNED, BUT NOTHING AFTER IT DOES. A lantern hung on
    // your last turn of light must not leave you dark anyway; a button that
    // punishes you for pressing it is a trap, not a decision.
    expect(wait(g).oil).toBe(g.oil);
    expect(wait(wait(wait(g))).oil).toBe(g.oil);
    // ★ Step out of it and the lamp starts burning again.
    expect(go(g, 1).oil).toBe(g.oil - 1);
  });

  it('★★★ and a lantern is light, so the dark does not bite you under one', () => {
    // ⚠️ THE TWO STATES DIFFER BY THE LANTERN AND NOTHING ELSE. Hanging one is
    // a turn, and a turn moves the dungeon — so building the lit case by
    // actually hanging it would have compared two different fights. That
    // `hang` is what puts a room in `lamps` is the first test in this file.
    const base: Delve = { ...go(go(stocked(), 1), 3), hp: 400, oil: 0 };
    const under: Delve = { ...base, lamps: [3] };
    expect(dark(base)).toBe(true);
    expect(lit(under, 3)).toBe(true);
    const bite = (g: Delve): number => g.hp - wait(g).hp;
    expect(bite(base)).toBeGreaterThan(bite(under));
    // ★ And the difference is exactly the dark, once per thing that swung.
    const swung = (bite(base) - bite(under)) / DARK_BITE;
    expect(Number.isInteger(swung)).toBe(true);
    expect(swung).toBeGreaterThan(0);
  });

  it('★★★ AND IT IS STILL BURNING NEXT DELVE — that is what you bought', () => {
    const g = hang(stocked());
    const out = apply({ ...g, at: 0 }, { type: 'leave' });
    expect(lit(out, 0)).toBe(true);
    // ⚠️ BUT NOT DOWN THE STAIR. They are hanging on a floor you will never
    // stand on again, and every stair is therefore a light bill.
    const below = apply({ ...g, at: 9, hp: 400 }, { type: 'descend' });
    expect(below.floor).toBe(2);
    expect(below.lamps).toEqual([]);
  });

  it('★★★ and pouring and hanging are the SAME flask — light competes with light', () => {
    // The decision, in one comparison. One flask is 14 turns anywhere, or one
    // room forever. Neither is correct; that is why there are two buttons.
    // ⚠️ NOT ON A FULL LAMP. `pour` refuses when there is nowhere to put it,
    // so the comparison has to be made by somebody who could use the oil.
    const g: Delve = { ...stocked(1), oil: 8 };
    const poured = apply(g, { type: 'pour' });
    const hung = hang(g);
    expect(poured.kit.flask).toBe(0);
    expect(hung.kit.flask).toBe(0);
    expect(poured.oil).toBeGreaterThan(hung.oil);
    expect(lit(hung, 0)).toBe(true);
    expect(lit(poured, 0)).toBe(false);
    expect(FLASK).toBeGreaterThan(0);
    expect(maxOil(g)).toBeGreaterThan(FLASK);
  });
});
