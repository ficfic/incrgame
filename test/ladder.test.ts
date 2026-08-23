// ★★★ THE LADDER — is the game finishable, and is the kit what finishes it?
//
// ⚠️ THE BOTTOM OF THE DUNGEON WAS UNREACHABLE, and nothing noticed for four
// slices. The Hoard's guard is 48 hit points that deal ~4.5 a turn; on twelve
// life, with every upgrade bought, standing and trading kills you in THREE
// swings of the twelve you need. There was no route, no purchase and no play
// that got a delver to the last room — the deepest chamber in the game, the
// one the whole map points at, could not be entered and survived.
//
// ★ SO THE ENDING IS "STOOD IN EVERY ROOM", NOT "KILLED EVERYTHING". The game
// is a machine's map against a walked one; finishing it is completing the
// walked one. That makes the deep end a DASH — get in, take the hit, get out —
// which is a thing the kit can gate, rather than a wall nothing can pass.
//
// Everything below plays real actions through `apply`. No hand-built states
// where the claim is about whether a route works.
import { describe, it, expect } from 'vitest';
import { price, apply, initial, done, maxHp, facing, unwalkable, COST, VIM, START_HP,
  type Delve, type Good } from '../src/delve/engine';
import { ROOMS } from '../src/delve/dungeon';

const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const wedge = (g: Delve, to: number): Delve => apply(g, { type: 'wedge', to });

/** Kitted out, standing at the Mouth, at the top of a delve. */
const kitted = (...bought: Good[]): Delve => {
  let g: Delve = { ...initial(), hoard: 9999 };
  for (const w of bought) g = apply(g, { type: 'buy', what: w });
  return { ...g, hp: maxHp(g) };
};

/** ★ THE ROUTE TO THE BOTTOM: 0-1-3-5-6-8-9, wedging the door shut behind you
 *  at each lair so the pack you just woke cannot follow you down. This is the
 *  intended use of a wedge and the reason it is the first thing on sale. */
const dash = (g0: Delve, useWedges: boolean): Delve => {
  let g = g0;
  const legs: [number, number][] = [[0, 1], [1, 3], [3, 5], [5, 6], [6, 8], [8, 9]];
  for (const [from, to] of legs) {
    if (g.fallen) return g;
    if (unwalkable(g, to) !== null) return g;
    g = go(g, to);
    // Cut the way you came, so what you woke has to go the long way round.
    if (useWedges && g.kit.wedges > 0 && !g.fallen) g = wedge(g, from);
  }
  return g;
};

describe('★★★ THE BOTTOM OF THE DUNGEON CAN BE REACHED', () => {
  it('★★★ but NOT bare-handed — you reach the door and it kills you there', () => {
    const bare = dash(initial(), false);
    expect(bare.fallen).toBe(true);
    // ⚠️ AND IT DOES NOT COUNT. Dying on the doorstep used to record the room,
    // which quietly deleted this whole ladder: a bare delver could walk to the
    // bottom, be killed by the thing in it, and have finished the game. A map
    // is only true if the surveyor came back to draw it.
    expect(bare.trod).not.toContain(9);
    expect(done(bare)).toBe(false);
  });

  it('★★★ and not by standing and trading, however much you have bought', () => {
    // ⚠️ THE ARITHMETIC THAT FORCED THE ENDING TO BE ABOUT WALKING. 48 hit
    // points of guard against a delver who loses ~4.5 a turn: there is no
    // amount of `edge` that closes that, and pretending otherwise would have
    // shipped a last room nobody could ever open.
    let g = dash(kitted('wedges', 'edge', 'vim'), true);
    if (g.at !== 9) return;                       // covered by the test below
    let n = 0;
    while (!g.fallen && facing(g).length > 0 && n < 40) { g = apply(g, { type: 'strike' }); n++; }
    expect(g.fallen).toBe(true);
  });

  it('★★★ WITH THE KIT, THE DASH GETS THERE — and that is the whole ladder', () => {
    const g = dash(kitted('wedges', 'edge', 'vim'), true);
    expect(g.fallen).toBe(false);
    expect(g.at).toBe(9);
    expect(g.trod).toContain(9);
  });

  it('★★★ the leather is what makes the difference, not the route', () => {
    // ⚠️ THE CHECK THAT STOPS THIS BEING A STORY. Same route, same wedges, same
    // edge — one purchase removed. If it still worked, the ladder would be
    // decoration and the shop would not be gating anything.
    const without = dash(kitted('wedges', 'edge'), true);
    expect(maxHp(kitted('vim'))).toBe(START_HP + VIM);
    expect(without.fallen || without.at !== 9).toBe(true);
  });
});

describe('★★★ AND THE GAME CAN BE FINISHED', () => {
  it('★ a fresh delver has not finished it', () => {
    expect(done(initial())).toBe(false);
    expect(initial().trod).toEqual([0]);
  });

  it('★★★ finishing is having STOOD in every room — walked, not cleared', () => {
    // The one list in the game that is entirely, boringly true.
    const walked: Delve = { ...initial(), trod: ROOMS.map((r) => r.id) };
    expect(done(walked)).toBe(true);
    // ⚠️ AND NOT "cleared". You never have to beat the Hoard; you have to have
    // been there. Clearing everything while never entering the last room is
    // explicitly NOT finishing.
    const slaughter: Delve = { ...initial(), cleared: ROOMS.map((r) => r.id),
      trod: ROOMS.filter((r) => r.id !== 9).map((r) => r.id) };
    expect(done(slaughter)).toBe(false);
  });

  it('★★★ and what you walked survives dying, or it could never be finished', () => {
    // Every route to the bottom costs more life than a delver has; the ending
    // is reachable ONLY because progress accumulates across runs.
    const deep = dash(kitted('wedges', 'edge', 'vim'), true);
    const down = apply({ ...deep, hp: 1 }, { type: 'wait' });
    expect(down.fallen).toBe(true);
    const next = apply(down, { type: 'leave' });
    expect(next.trod).toContain(9);
    expect(next.hp).toBe(maxHp(next));
  });

  it('★ and a run always starts on full life, with whatever you are wearing', () => {
    const tough = kitted('vim');
    expect(apply({ ...tough, at: 0, hp: 3 }, { type: 'leave' }).hp).toBe(START_HP + VIM);
    // ⚠️ AND IT IS NO LONGER THE DEAREST THING ON THE SHELF. `vim` cost 90
    // when a floor's income was unbounded; rooms pay once now, floor one is
    // worth about seventy, and a life upgrade you cannot reach in a floor is
    // a life upgrade that does not exist. It is 34 and it gets dearer.
    expect(COST.vim).toBeLessThan(COST.wick);       // still not the cheap one
    expect(price({ ...kitted('vim') }, 'vim')).toBeGreaterThan(COST.vim);
  });
});
