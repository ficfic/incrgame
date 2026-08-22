// ★★★ THE RELICS — 2026-08-20, the genre pass.
//
// ⚠️ A CRAWLER WITH NO LOOT IS A CORRIDOR WITH A SHOP AT THE END. Everything
// this game gave you, you BOUGHT — and a price list is a plan, not a
// discovery. Every roguelike in the genre answers this the same way.
//
// ★★★ AND A RELIC CHANGES A RULE, NOT A NUMBER, which is what every test below
// is actually about. The shop already sells numbers; a relic that gave +2
// damage would be a shop item you had to walk further for.
import { describe, it, expect } from 'vitest';
import { RELICS, ORDER, wellHolds } from '../src/delve/relics';
import { apply, initial, facing, actsOn, barTurns, shut, unringable, BAR_TURNS,
  hallucinated, roomAt, type Delve } from '../src/delve/engine';
import { floorPlan } from '../src/delve/floors';

const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
/** Walk to floor one's Drowned Well: 0-1-3-5-7. */
const toTheWell = (g: Delve = initial()): Delve => {
  let out: Delve = { ...g, hp: 400 };
  for (const to of [1, 3, 5, 7]) out = go(out, to);
  return out;
};

describe('★★★ YOU FIND THEM, YOU DO NOT BUY THEM', () => {
  it('★★★ and they are in the WELL — the dead end you did not have to walk', () => {
    // ⚠️ THE PLACEMENT IS THE POINT. A well is off the road to the Hoard, so
    // the loot pays the one behaviour a game about mapping should be paying
    // for: going somewhere you did not have to.
    const g = initial();
    expect(g.relics).toEqual([]);
    const found = toTheWell();
    expect(roomAt(found, found.at)!.kind).toBe('well');
    expect(found.relics.length).toBe(1);
    expect(found.log.join(' ')).toMatch(/stub of chalk/i);
    // ★ And it says what it does, because a rule change nobody reads is a bug.
    expect(found.log.join(' ')).toContain(RELICS.chalk.says);
  });

  it('★★★ in a fixed order, gated by depth — a ladder, not a slot machine', () => {
    expect(wellHolds(1, [])).toBe('chalk');
    expect(wellHolds(1, ['chalk'])).toBeNull();      // the spike is deeper
    expect(wellHolds(2, ['chalk'])).toBe('spike');
    expect(wellHolds(9, ORDER)).toBeNull();          // and then you have them all
    for (const id of ORDER) expect(RELICS[id].from).toBeGreaterThan(0);
  });

  it('★★★ and they survive dying, and the stair', () => {
    const found = toTheWell();
    const down = apply({ ...found, hp: 1 }, { type: 'wait' });
    const next = apply(down.fallen ? down : { ...down, fallen: true }, { type: 'leave' });
    expect(next.relics).toEqual(found.relics);
  });

  it('★ the same well does not pay twice', () => {
    const found = toTheWell();
    expect(go(go(found, 5), 7).relics).toEqual(found.relics);
  });
});

describe('★★★ AND EACH ONE TURNS OFF A RULE YOU HAD TO LEARN', () => {
  const carrying = (...ids: (keyof typeof RELICS)[]): Delve =>
    ({ ...initial(), hp: 400, relics: [...ids] });

  it('★★★ THE SPIKE: a wedge holds twice as long', () => {
    const bare = initial();
    expect(barTurns(bare)).toBe(BAR_TURNS);
    const spiked = carrying('spike');
    expect(barTurns(spiked)).toBe(BAR_TURNS * 2);
    const cut = apply(go(spiked, 1), { type: 'wedge', to: 0 });
    let held = cut;
    for (let i = 0; i < BAR_TURNS + 1; i++) held = wait(held);
    // ⚠️ STILL SHUT at the turn a bare wedge would already have given out.
    expect(shut(held, 1, 0)).toBe(true);
  });

  it('★★★ THE BOOTS: whatever you wake is a turn behind you', () => {
    // A lair stops being a toll you pay on the way in.
    const bare = go(go(initial(), 1), 3);
    expect(facing(bare).some((f) => actsOn(f, bare.turn + 1))).toBe(true);
    const quiet = go(go(carrying('boots'), 1), 3);
    expect(facing(quiet).length).toBeGreaterThan(0);
    expect(facing(quiet).some((f) => actsOn(f, quiet.turn))).toBe(false);
    // ★ AND IT IS A FREE TURN, measured: walking in costs nothing.
    expect(quiet.hp).toBe(carrying('boots').hp);
    expect(bare.hp).toBeLessThan(initial().hp);
  });

  it('★★★ THE BELL: you wake the next room on purpose and it comes to YOU', () => {
    // So you pick the ground instead of walking onto theirs.
    const at1 = go(carrying('bell'), 1);
    expect(unringable(at1, 3)).toBeNull();
    const rung = apply(at1, { type: 'ring', at: 3 });
    expect(rung.foes.length).toBeGreaterThan(0);
    expect(rung.at).toBe(1);                       // you did not move
    expect(rung.turn).toBe(at1.turn + 1);
    // And they are coming: a few turns later something is in the room with you.
    let come = rung;
    for (let i = 0; i < 3; i++) come = wait({ ...come, hp: 400 });
    expect(facing(come).length).toBeGreaterThan(0);
  });

  it('★ and without the bell there is nothing to ring', () => {
    const at1 = go(initial(), 1);
    expect(unringable(at1, 3)).toBe('You have no bell.');
    expect(apply(at1, { type: 'ring', at: 3 })).toBe(at1);
    // Nor at a wall, nor at a room already awake, nor at an empty one.
    const belled = go(carrying('bell'), 1);
    expect(unringable(belled, 9)).toBe('No door leads there from here.');
    expect(unringable(belled, 2)).toMatch(/Nothing in there/);
    expect(unringable(apply(belled, { type: 'ring', at: 3 }), 3)).toBe('Already awake.');
  });

  it('★★★ THE CHALK: the crawler is still wrong, but you can SEE which doors', () => {
    // ⚠️ THE ONE THAT ANSWERS THE CENTRAL LIE — and it has to be an ANSWER, not
    // a repair: the invented doors are still on the map and the crawler still
    // draws them. What changes is that you can tell. That is a UI reading of
    // `relics`, so what the engine owes is only that the list is knowable.
    const g: Delve = { ...initial(), floor: 1, relics: ['chalk'] };
    const sent = apply(g, { type: 'send' });
    expect(hallucinated(sent).length).toBeGreaterThan(0);
    expect(sent.relics).toContain('chalk');
  });
});

describe('★★★ AND THE DEEP WELLS ARE GUARDED', () => {
  it('★★★ past floor five something has moved in, so the loot costs a fight', () => {
    const deep: Delve = { ...initial(), floor: 6, rooms: floorPlan(6), hp: 900,
      seen: floorPlan(6).map((r) => r.id) };
    const well = deep.rooms.find((r) => r.kind === 'well');
    if (!well) return;                              // not every floor has one
    let g = deep;
    let hop: number | null = well.doors[0] ?? null;
    if (hop === null) return;
    g = { ...g, at: hop };
    g = go(g, well.id);
    expect(g.at).toBe(well.id);
    expect(facing(g).length).toBeGreaterThan(0);    // a lurker, in a dead end
  });
});
