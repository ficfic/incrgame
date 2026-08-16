// ★★★ SKILLS — `docs/BRIEF.md` item 2, built 2026-08-16.
//
// The pillar the brief listed and nothing ever implemented: *"RuneScape's
// skill progression elements… what accrues is our stats."* A skill levels
// because the town DID the work — which is the whole difference between this
// and the seven ±25% blueprints cut the day before. A card asked you to pick
// which number went up. A level is a wage for work already done.
import { describe, it, expect } from 'vitest';
import { apply, initial, flow, levelOf, nextAt, skillOf, skillBonus,
  SKILLS, TRAINS, LEVEL_BASE, XP_PER_FIGHT, SKILL_GAIN, heroHit,
  pathKey, type City } from '../src/camp/engine';

const tick = (g: City, secs: number): City => apply(g, { type: 'tick', secs });
/** A town actually digging: a quarry at Rock Face, roaded home, staffed. */
const digging = (over: Partial<City> = {}): City => ({
  ...initial(), stacks: { 0: 2, 1: 1 }, pop: 8,
  paths: { [pathKey(0, 1)]: 1 }, food: 900, ...over });

describe('★★★ THE LADDER', () => {
  it('★★ level 1 from nothing, and it never goes backwards', () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(-5)).toBe(1);           // a corrupt save cannot demote you
    let last = 0;
    for (let xp = 0; xp < 20000; xp += 137) {
      const lv = levelOf(xp);
      expect(lv).toBeGreaterThanOrEqual(last);
      last = lv;
    }
  });

  it('★★★ the ladder is STEEP EARLY and generous later', () => {
    // ⚠️ THE SHAPE IS THE DESIGN. Level 2 has to land inside the first minute
    // of one quarry, so the mechanic announces itself while the player is
    // still learning the board; if it takes ten minutes it is invisible.
    expect(nextAt(1)).toBe(LEVEL_BASE);
    // And each rung costs more than the one before it, forever.
    for (let lv = 1; lv < 30; lv++) {
      expect(nextAt(lv + 1) - nextAt(lv)).toBeGreaterThan(nextAt(lv) - nextAt(lv - 1));
    }
  });

  it('★ nextAt and levelOf agree — the bar cannot lie about the door', () => {
    for (let lv = 1; lv < 25; lv++) {
      expect(levelOf(nextAt(lv))).toBeGreaterThanOrEqual(lv + 1);
      expect(levelOf(nextAt(lv) - 1)).toBeLessThanOrEqual(lv);
    }
  });
});

describe('★★★ THE WAGE FOR WORK DONE', () => {
  it('★★★ a quarry that runs trains quarrying, and nothing else', () => {
    const g = tick(digging(), 60);
    expect(g.xp.quarrying ?? 0).toBeGreaterThan(0);
    expect(g.xp.forestry ?? 0).toBe(0);
    expect(g.xp.farming ?? 0).toBe(0);
  });

  it('★★★ and it levels inside the first minute of one quarry', () => {
    // The claim the whole design rests on, measured against the real engine
    // rather than asserted in a comment.
    expect(skillOf(tick(digging(), 60), 'quarrying')).toBeGreaterThanOrEqual(2);
  });

  it('★★★ a CHOKED road still trains the crew standing at the rock', () => {
    // ⚠️ THE TRAP THIS AVOIDS. Paying xp on what ARRIVES at the camp would
    // mean a blocked road silently froze your progression as well — a
    // punishment with no visible cause, for a mistake made somewhere else.
    // The crew dug the same stone either way, so they learn the same trade.
    //
    // ⚠️ AND THE FIRST VERSION OF THIS TEST WAS VACUOUS: it choked the STORE
    // (`store: 0`) rather than the ROAD, and a full warehouse does not
    // reduce `carried` at all — so it passed with the xp wired to arrivals.
    // Caught by sabotage, which is the only reason it is now a real check.
    // A gauge-1 road carries 1.0/s; four quarries dig 2.4/s.
    const choked = digging({ stacks: { 0: 4, 1: 4 }, pop: 40 });
    const f = flow(choked);
    expect(f.carried.get(1)!).toBeLessThan(f.made.get(1)! * 0.5);   // a real choke
    const one = digging({ stacks: { 0: 4, 1: 1 }, pop: 40 });
    // Four quarries earn four quarries' worth of trade, not one road's worth.
    const four = tick(choked, 60).xp.quarrying ?? 0;
    const solo = tick(one, 60).xp.quarrying ?? 0;
    expect(four).toBeCloseTo(solo * 4, 1);
  });

  it('★ an idle town learns nothing at all', () => {
    const g = tick({ ...initial(), pop: 0 }, 300);
    for (const k of SKILLS) expect(g.xp[k] ?? 0).toBe(0);
  });

  it('★★ every works kind trains something, and huts train nobody', () => {
    expect(TRAINS.hut).toBeNull();
    for (const k of ['quarry', 'lumber', 'sawmill', 'farm'] as const) {
      expect(SKILLS).toContain(TRAINS[k]);
    }
  });
});

describe('★★★ WHAT A LEVEL IS WORTH', () => {
  it('★★★ a level makes the works faster, and level 1 changes nothing', () => {
    const raw = { ...initial(), xp: {} };
    expect(skillBonus(raw, 'quarry')).toBe(1);
    const learned = { ...initial(), xp: { quarrying: nextAt(1) } };
    expect(skillBonus(learned, 'quarry')).toBeCloseTo(1 + SKILL_GAIN, 6);
    // ⚠️ AND ONLY ITS OWN KIND. Quarrying must not speed up the farms.
    expect(skillBonus(learned, 'farm')).toBe(1);
  });

  it('★★★ and the board actually produces more for it', () => {
    // The bonus is worthless if it stops at the helper. Same town, same
    // hands, more stone — measured through `flow`.
    const green = flow(digging()).stone;
    const skilled = flow(digging({ xp: { quarrying: nextAt(6) } })).stone;
    expect(skilled).toBeGreaterThan(green * 1.15);
  });

  it('★★ war is trained by winning ground, and it sharpens the hero', () => {
    const before = heroHit(initial());
    const veteran = { ...initial(), xp: { war: XP_PER_FIGHT * 40 } };
    expect(skillOf(veteran, 'war')).toBeGreaterThan(3);
    expect(heroHit(veteran)).toBeGreaterThan(before);
  });
});
