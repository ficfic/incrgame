// ★★★ THE FIGHT — 2026-08-19, and the owner was right.
//
// *"it's cool and all, but so far there's just one button and no gameplay."*
//
// ⚠️ AND THEY WERE. Everything built so far was AROUND the fight — a map that
// lies to you, wedges that cut edges, a lamp that changes the fog — while the
// fight itself was `strike`, which picked its own target. A room with two
// monsters in it offered exactly one button, tapped four times. The dungeon
// had gameplay; the combat in the middle of it did not.
//
// ⚠️ AND IT WAS A DELIBERATE DECISION, WRITTEN DOWN AS A FEATURE: "a swing
// takes the WEAKEST thing standing — no aiming tax". The reasoning was that
// making the player aim was the button-pressing the pivot existed to remove.
// It removed the one decision every turn-based fight is built on instead.
//
// So a fight now asks three questions, every turn: WHICH of them, or GET IT
// AWAY FROM ME, or GET MY ARM UP.
import { describe, it, expect } from 'vitest';
import { apply, initial, facing, foesIn, actsOn, doorsOf, unshovable, toll,
  braced, swing, REEL, BITE, type Delve, type Foe } from '../src/delve/engine';

const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
/** In the Rat Warren, facing a big slow one and a small fast one. */
const warren = (): Delve => ({ ...go(go(initial(), 1), 3), hp: 300 });
const big = (g: Delve): Foe => facing(g).reduce((x, y) => (y.bite > x.bite ? y : x));
const runt = (g: Delve): Foe => facing(g).reduce((x, y) => (y.bite < x.bite ? y : x));

describe('★★★ YOU SAY WHICH ONE', () => {
  it('★★★ a named swing hits THAT one, not the weakest', () => {
    // ⚠️ THE DECISION THE GAME WAS MISSING. The runt chips you every turn; the
    // big one lands a burst every other. Which you kill first is the whole
    // shape of the fight, and the engine used to answer it for you.
    const g = warren();
    const heavy = big(g);
    expect(heavy.hp).toBeGreaterThan(runt(g).hp);       // not the default pick
    const hit = apply(g, { type: 'strike', at: heavy.id });
    expect(hit.foes.find((f) => f.id === heavy.id)!.hp).toBe(heavy.hp - swing(g));
    expect(hit.foes.find((f) => f.id === runt(g).id)!.hp).toBe(runt(g).hp);
  });

  it('★ and leaving it out still takes the weakest', () => {
    const g = warren();
    const weak = runt(g);
    const hit = apply(g, { type: 'strike' });
    expect(hit.foes.find((f) => f.id === weak.id)!.hp).toBe(weak.hp - swing(g));
  });

  it('★ naming something that is not here falls back rather than wasting the turn', () => {
    const g = warren();
    const hit = apply(g, { type: 'strike', at: 999 });
    expect(hit.turn).toBe(g.turn + 1);
    expect(Math.min(...hit.foes.map((f) => f.hp))).toBeLessThan(Math.min(...g.foes.map((f) => f.hp)));
  });
});

describe('★★★ OR GET IT AWAY FROM YOU', () => {
  it('★★★ a shove puts it through a door of YOUR choosing', () => {
    const g = warren();
    const heavy = big(g);
    const out = apply(g, { type: 'shove', foe: heavy.id, to: 1 });
    expect(out.foes.find((f) => f.id === heavy.id)!.at).toBe(1);
    expect(facing(out).length).toBe(1);                 // only the runt left
    expect(out.turn).toBe(g.turn + 1);
  });

  it('★★★ and it costs no damage but buys you turns — that is the trade', () => {
    const g = warren();
    const heavy = big(g);
    const out = apply(g, { type: 'shove', foe: heavy.id, to: 1 });
    expect(out.foes.find((f) => f.id === heavy.id)!.hp).toBe(heavy.hp);
    // ⚠️ TWO TURNS OFF ITS FEET. One would be worth NOTHING: it would step
    // straight back through the door on the dungeon's very next move and the
    // shove would have cost a turn to gain none.
    const shoved = out.foes.find((f) => f.id === heavy.id)!;
    expect(shoved.reeling).toBe(g.turn + REEL);
    expect(actsOn(shoved, out.turn)).toBe(false);
    expect(actsOn(shoved, out.turn + 1)).toBe(false);
    // It is still coming, though — it has not been deleted.
    let back = out;
    for (let i = 0; i < 4; i++) back = wait(back);
    expect(foesIn(back, 3).some((f) => f.id === heavy.id)).toBe(true);
  });

  it('★★★ so you can take a pack apart one at a time', () => {
    // The play the fight exists for: shove the heavy one out, kill the runt
    // while it is picking itself up, and meet the big one alone.
    let g = warren();
    const heavy = big(g), small = runt(g);
    g = apply(g, { type: 'shove', foe: heavy.id, to: 1 });
    let n = 0;
    while (facing(g).length > 0 && n < 10) { g = apply(g, { type: 'strike', at: small.id }); n++; }
    expect(g.foes.find((f) => f.id === small.id)!.hp).toBe(0);
    expect(g.foes.find((f) => f.id === heavy.id)!.hp).toBe(heavy.hp);
  });

  it('★ you cannot shove through a wall, a wedge, or at something absent', () => {
    const g = warren();
    expect(unshovable(g, big(g).id, 9)).toBe('No door leads there from here.');
    expect(unshovable(g, 999, 1)).toBe('Not here to shove.');
    const cut = apply(g, { type: 'wedge', to: 1 });
    expect(unshovable(cut, big(cut).id, 1)).toBe('That door is wedged shut.');
    expect(apply(cut, { type: 'shove', foe: big(cut).id, to: 1 })).toBe(cut);
  });
});

describe('★★★ OR GET YOUR ARM UP', () => {
  it('★★★ bracing halves what reaches you, and deals nothing', () => {
    // ⚠️ ON A TURN THE HEAVY ONE SWINGS. Rounding up means a brace does nothing
    // at all against a lone 1-bite runt — which is the rule working, and it
    // made the first draft of this test fail for the right reason.
    const g = { ...warren(), hp: 40, turn: 1 };
    expect(braced(g)).toBeLessThan(toll(g));
    const stood = wait(g);
    const held = apply(g, { type: 'brace' });
    expect(g.hp - held.hp).toBeLessThan(g.hp - stood.hp);
    expect(held.foes.map((f) => f.hp)).toEqual(g.foes.map((f) => f.hp));
    expect(held.turn).toBe(g.turn + 1);
  });

  it('★★★ rounded UP against you — a brace never makes a hit free', () => {
    // ⚠️ A FREE TURN IS NOT A DECISION. If bracing turned a 1 into a 0 the
    // answer to "what do I do about the runt" would be "brace forever".
    const g = { ...warren(), hp: 40, turn: 0 };
    const one = g.foes.filter((f) => f.bite === 1);
    expect(one.length).toBeGreaterThan(0);
    const held = apply({ ...g, foes: one }, { type: 'brace' });
    expect(held.hp).toBe(g.hp - 1);
  });

  it('★★★ and the screen can say both numbers before you choose', () => {
    // The whole point of turns: you know what each option costs first.
    const g = warren();
    expect(toll(g)).toBeGreaterThan(0);
    expect(braced(g)).toBeLessThanOrEqual(toll(g));
    expect(apply(g, { type: 'wait' }).hp).toBe(g.hp - toll(g));
    expect(apply(g, { type: 'brace' }).hp).toBe(g.hp - braced(g));
  });
});

describe('★★★ AND THE PACK IS A PUZZLE, NOT A TOTAL', () => {
  it('★★★ shoving beats trading when the heavy one is what is killing you', () => {
    // ⚠️ THE CHECK THAT SAYS THE VERBS ARE WORTH HAVING. If tapping Swing over
    // and over were still the best line, every button added above would be
    // decoration. Same fight, same starting life, two ways of playing it.
    const start: Delve = { ...go(go(initial(), 1), 3), hp: 12 };
    const trade = (): Delve => {
      let g = start;
      for (let i = 0; i < 20 && !g.fallen && facing(g).length > 0; i++) {
        g = apply(g, { type: 'strike' });
      }
      return g;
    };
    const clever = (): Delve => {
      let g = start;
      const heavy = big(g);
      g = apply(g, { type: 'shove', foe: heavy.id, to: 1 });
      for (let i = 0; i < 20 && !g.fallen && facing(g).length > 0; i++) {
        g = apply(g, { type: 'strike' });
      }
      return g;
    };
    expect(clever().hp).toBeGreaterThan(trade().hp);
  });

  it('★★★ and the game is not over in one button — the room asks something', () => {
    // Three verbs, and at least two doors to shove through, in the FIRST
    // fight of the game with nothing bought.
    const g = { ...go(go(initial(), 1), 3) };
    expect(facing(g).length).toBeGreaterThan(1);
    expect(doorsOf(g, g.at).filter((d) => unshovable(g, big(g).id, d) === null).length)
      .toBeGreaterThan(1);
    expect(g.kit.wedges).toBeGreaterThan(0);      // and a wedge, from turn one
    expect(swing(g)).toBe(BITE);
  });
});
