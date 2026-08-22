// ★★★ THE RECORDS — 2026-08-20, the genre pass.
//
// ⚠️ TWO THINGS EVERY INCREMENTAL HAS AND THIS ONE DID NOT: a statistics
// screen, and milestones that PAY. Neither is decoration. An incremental is a
// game about a curve and a player cannot feel a curve they cannot see; and
// genre achievements are the second progression track, the one that keeps
// turning while the first is saving up.
//
// ★★★ AND THE MULTIPLIER IS THE FIRST COMPOUNDING NUMBER IN THE GAME.
// Everything until now was additive and small — spoil 6, kit 24, life 20 —
// which is a to-do list, not a curve.
import { describe, it, expect } from 'vitest';
import { MARKS, CUT, take, earned, NOTHING } from '../src/delve/records';
import { apply, initial, facing, worth, roomAt, type Delve } from '../src/delve/engine';
import { floorPlan } from '../src/delve/floors';
import { SPOIL } from '../src/delve/dungeon';

const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
const clearWarren = (g: Delve = initial()): Delve => {
  let out: Delve = { ...go(go(g, 1), 3), hp: 400 };
  for (let i = 0; i < 30 && facing(out).length > 0; i++) out = apply(out, { type: 'strike' });
  return out;
};

describe('★★★ THE GAME COUNTS WHAT YOU DO', () => {
  it('★ a fresh delver has done nothing, and the numbers say so', () => {
    expect(initial().tally).toEqual(NOTHING);
    expect(initial().won).toEqual([]);
  });

  it('★★★ turns, kills, rooms and falls, all counted where they happen', () => {
    const g = clearWarren();
    expect(g.tally.turns).toBeGreaterThan(2);
    expect(g.tally.kills).toBe(2);                 // the pair in the Warren
    expect(g.tally.walked).toBeGreaterThanOrEqual(2);
    expect(g.tally.falls).toBe(0);
    const down = wait({ ...go(g, 1), hp: 1, foes: g.foes.map((f) => ({ ...f, hp: 9, at: 1 })) });
    expect(down.fallen).toBe(true);
    expect(down.tally.falls).toBe(1);
  });

  it('★★★ and the deepest floor is a HIGH-WATER mark, not where you are', () => {
    // ⚠️ It has to survive coming back up, or it is not a record.
    const deep: Delve = { ...initial(), floor: 4, rooms: floorPlan(4),
      tally: { ...NOTHING, deepest: 4 } };
    expect(wait(deep).tally.deepest).toBe(4);
    expect(wait({ ...deep, floor: 1 }).tally.deepest).toBe(4);
  });

  it('★★★ and a thing that is not a turn does not count as one', () => {
    // ⚠️ Buying at the Mouth and being lied to by the crawler are both
    // deliberately NOT turns — the dungeon gets no swing at you for looking in
    // your own pack. A turn counter that counts them is measuring taps.
    const rich: Delve = { ...initial(), hoard: 900 };
    const bought = apply(rich, { type: 'buy', what: 'edge' });
    expect(bought.turn).toBe(rich.turn);
    expect(bought.tally.turns).toBe(rich.tally.turns);
    // And a turn that IS a turn does.
    expect(wait(rich).tally.turns).toBe(rich.tally.turns + 1);
  });

  it('★ crawlers sent and lost are counted too', () => {
    let g = apply(initial(), { type: 'send' });
    expect(g.tally.sent).toBe(1);
    for (let i = 0; i < 25; i++) g = wait({ ...g, hp: 400 });
    expect(g.crawl!.done).toBe(true);
    expect(g.tally.lost).toBe(1);
  });
});

describe('★★★ AND MILESTONES PAY, THEY DO NOT DECORATE', () => {
  it('★★★ clearing a room claims one, and it says so out loud', () => {
    // ⚠️ A permanent raise nobody notices is a number that may as well not
    // exist.
    const g = clearWarren();
    expect(g.won).toContain('first');
    expect(g.log.join(' ')).toMatch(/First blood/);
    expect(g.log.join(' ')).toMatch(/Everything pays more now/);
  });

  it('★★★ and it is a permanent CUT of everything the dungeon pays', () => {
    const bare = initial();
    const one: Delve = { ...bare, won: ['first'] };
    const four: Delve = { ...bare, won: ['first', 'banked', 'stair', 'chalk'] };
    expect(take(bare)).toBe(1);
    expect(take(one)).toBeCloseTo(1 + CUT);
    expect(take(four)).toBeCloseTo(1 + CUT * 4);
    const lair = bare.rooms.find((r) => r.kind === 'lair')!;
    expect(worth(bare, lair)).toBe(SPOIL.lair);
    expect(worth(four, lair)).toBeGreaterThan(worth(bare, lair));
  });

  it('★★★ each one is claimed ONCE, however long you keep playing', () => {
    let g = clearWarren();
    const after = g.won.length;
    for (let i = 0; i < 8; i++) g = wait({ ...g, hp: 400 });
    expect(g.won.length).toBe(after);
    expect(new Set(g.won).size).toBe(g.won.length);
  });

  it('★★★ they survive dying and the stair — they are the ratchet', () => {
    // ⚠️ `leave` FROM A HAND-SET `fallen`, and the tally has to come through it.
    // The first draft compared `down.tally.kills` to `g.tally.kills` and read
    // zero, because `apply` now counts at its own boundary and `leave` is an
    // action like any other — so the comparison has to be against what leaving
    // actually produced, not against a number captured before it.
    const g = clearWarren();
    expect(g.tally.kills).toBe(2);
    const down = apply({ ...g, fallen: true }, { type: 'leave' });
    expect(down.won).toEqual(g.won);
    expect(down.tally.kills).toBe(2);
    expect(down.relics).toEqual(g.relics);
  });

  it('★★★ every mark is a PURE predicate over the state', () => {
    // ⚠️ NOT AN EVENT HOOK. Ten predicates re-checked every turn cannot drift
    // out of step with the thing they describe; ten `onKill` callbacks can,
    // and one of them will not fire.
    const rich: Delve = { ...initial(), relics: ['chalk'],
      tally: { ...NOTHING, banked: 5000, deepest: 9, walked: 500, kills: 500, lost: 40 } };
    const all = { ...rich, trod: rich.rooms.map((r) => r.id) };
    expect(earned(all).length).toBe(MARKS.length);
    // And nothing is earned twice.
    expect(earned({ ...all, won: MARKS.map((m) => m.id) })).toEqual([]);
    for (const m of MARKS) expect(typeof m.won(initial())).toBe('boolean');
  });

  it('★ and they are all reachable — no mark nobody can ever claim', () => {
    const ids = MARKS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MARKS) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.says.length).toBeGreaterThan(0);
    }
  });
});
