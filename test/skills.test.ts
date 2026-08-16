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
  worksMax, WORKS_PER_LEVEL, WORKS_MAX, WORKS_CAP, unraisable, blowLeft, LEGACY_SHARE,
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

  it('★★★ war is trained by ACTUALLY WINNING GROUND', () => {
    // ⚠️ THIS TEST WAS A LIE UNTIL 2026-08-16. It was named "war is trained
    // by winning ground" and then built `{ xp: { war: … } }` BY HAND — so
    // deleting the award site in the engine left it green. `the-process`
    // found it by sabotage, in the same commit where I had caught and fixed
    // the identical shape in the choked-road test. Finding one instance of a
    // mistake is not the same as looking for the others.
    const g: City = { ...initial(),
      hero: { hp: 99, spears: 99, part: 0, at: 4, trip: null } };
    // ⚠️ A BLOW TAKES TIME. `apply({strike})` only ORDERS the swing; it
    // lands on a later tick, so a loop of bare strikes never finishes a
    // fight — settle each one, exactly as `campbuilder.test.ts` does.
    const settle = (x: City): City => {
      let out = x;
      for (let n = 0; n < 40 && blowLeft(out) !== null; n++) {
        out = apply(out, { type: 'tick', secs: 0.25 });
      }
      return out;
    };
    let f = settle(apply(g, { type: 'assail', id: 4 }));
    for (let i = 0; i < 60 && f.fight; i++) {
      const live = f.fight.sq.findIndex((q) => q.hp > 0);
      if (live < 0) break;
      f = settle(apply(settle(apply(f, { type: 'aim', at: live })), { type: 'strike' }));
    }
    expect(f.fight).toBeNull();
    expect(f.xp.war ?? 0).toBeGreaterThanOrEqual(XP_PER_FIGHT);
  });

  it('★★ and enough of it sharpens the hero', () => {
    const before = heroHit(initial());
    const veteran = { ...initial(), xp: { war: XP_PER_FIGHT * 40 } };
    expect(skillOf(veteran, 'war')).toBeGreaterThan(3);
    expect(heroHit(veteran)).toBeGreaterThan(before);
  });

  it('★★★ the works ceiling is THREE, and the refusal says the same number', () => {
    // ⚠️ `ec3e096` shipped WORKS_CAP=3 with NOTHING guarding it — set it to
    // 99 and the whole suite stayed green. The cap is the one thing keeping
    // "more output means more GROUND" true, and the refusal string hardcodes
    // the word "Three" while the cap is a constant, so they can disagree in
    // silence. They cannot now.
    expect(WORKS_CAP).toBe(3);
    const maxed = { ...initial(), xp: { quarrying: 9e6 } };
    expect(worksMax(maxed, 'quarry')).toBe(WORKS_CAP);
    const g: City = { ...maxed, stone: 999,
      stacks: { 1: WORKS_CAP }, paths: { [pathKey(0, 1)]: 1 } };
    expect(unraisable(g, 1)).toContain('Three');
  });
});

describe('★★★ THE DOOR YOU CAN SEE FROM HERE', () => {
  // `docs/BRIEF.md` item 4. A trade does not only make the works faster — it
  // is what lets a second one stand on the same ground. This is the answer to
  // "there is no point in more people" that the one-works-per-site rule left
  // open, with the raise EARNED rather than granted.
  it('★★★ a green town gets one works per place', () => {
    expect(worksMax(initial(), 'quarry')).toBe(WORKS_MAX);
  });

  it('★★★ and a practised trade builds deeper', () => {
    const skilled = { ...initial(), xp: { quarrying: nextAt(WORKS_PER_LEVEL) } };
    expect(skillOf(skilled, 'quarrying')).toBeGreaterThan(WORKS_PER_LEVEL);
    expect(worksMax(skilled, 'quarry')).toBe(WORKS_MAX + 1);
    // ⚠️ AND ONLY ITS OWN KIND — quarrying must not deepen the farms.
    expect(worksMax(skilled, 'farm')).toBe(WORKS_MAX);
  });

  it('★★★ the refusal NAMES the trade and the level, never just "no"', () => {
    const g: City = { ...initial(), stone: 999, stacks: { 1: 1 },
      paths: { [pathKey(0, 1)]: 1 } };
    const why = unraisable(g, 1);
    expect(why).toContain('quarrying');
    expect(why).toMatch(/\d/);          // the door has a number on it
  });

  it('★ huts are housing, not a trade, and stay exempt', () => {
    expect(worksMax({ ...initial(), xp: { quarrying: 9e6 } }, 'hut')).toBe(WORKS_MAX);
  });
});

describe('★★★ WHAT THE HANDS REMEMBER ACROSS A VALLEY', () => {
  // `docs/BRIEF.md` item 9, the replacement for the voided AI prestige:
  // *"what you learned about the terrain does not [reset]… Knowledge
  // persists, infrastructure does not."* The one system in this game
  // captioned "Trades" was the one thing that did NOT persist, into a valley
  // RUN_STEP makes harder every time. Found by `the-redditor`, 2026-08-16.
  const wonValley = (over: Partial<City> = {}): City => ({
    ...initial(), goblins: {}, xp: { quarrying: 4000, war: 600 }, ...over });

  it('★★★ a WON valley carries its trades into the next one', () => {
    const next = apply(wonValley(), { type: 'found' });
    expect(next.xp.quarrying ?? 0).toBeGreaterThan(0);
    expect(skillOf(next, 'quarrying')).toBeGreaterThan(1);
  });

  it('★★★ at half, so the doors are still worth walking through twice', () => {
    const next = apply(wonValley(), { type: 'found' });
    expect(next.xp.quarrying).toBeCloseTo(4000 * LEGACY_SHARE, 6);
    expect(LEGACY_SHARE).toBeLessThan(1);
  });

  it('★★ the town itself still starts cold — knowledge, not infrastructure', () => {
    const next = apply(wonValley({ stacks: { 0: 6, 1: 3 }, pop: 90 }), { type: 'found' });
    expect(next.stacks).toEqual(initial().stacks);
    expect(next.pop).toBe(initial().pop);
  });

  it('★ and it never goes backwards across runs', () => {
    const rich = wonValley({ legacy: { runs: 1, spears: 0, boons: [], xp: { quarrying: 9000 } } });
    expect(apply(rich, { type: 'found' }).xp.quarrying).toBe(9000);
  });
});
