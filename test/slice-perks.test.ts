// LEVEL UNLOCKS — the tests that make the ladder a promise instead of a table.
//
// PROVEN RED (CLAUDE.md rule 4). Three sabotages, applied to `src/slice/perks.ts`,
// run, output copied, then reverted:
//
//   1. `reached()` `>=` → `>` (the off-by-one at a threshold)
//      → 6 failed | 16 passed. First failure:
//        "holds for every rung on every ladder"
//        AssertionError: expected false to be true // Object.is equality
//   2. practice rung 28 `add: 0.5` → `0.25` (the documented rate arithmetic)
//      → 4 failed | 18 passed. "is 1.25 / 1.50 / 2.00 at levels 10 / 20 / 30"
//        AssertionError: expected 1.75 to be 2 // Object.is equality
//   3. `nextUnlock`'s `p.level > have` → `>=` (a rung you already own offered
//      back to you as the next one)
//      → 3 failed | 19 passed. "at a boundary, next is the rung AFTER the one
//        just landed" AssertionError: expected 8 to be 18
//
// All reverted; 22 passed afterwards.
import { describe, it, expect } from 'vitest';
import {
  LADDER, ALL_PERKS, TOP_RUNG, BASE_SATCHEL_TARGET,
  perksFor, take, satchelTarget, powers, nextUnlock, nextUnlocks,
} from '../src/slice/perks';
import type { Perk } from '../src/slice/perks';
import { xpForLevel, levelFor, LEVEL_CAP, SKILLS } from '../src/slice/engine';
import type { SkillId } from '../src/slice/schema';

const SKILL_IDS = Object.keys(SKILLS) as SkillId[];
const ZERO = (): Record<SkillId, number> =>
  ({ wayfaring: 0, lore: 0, craft: 0, guile: 0, attunement: 0 });
/** XP one short of reaching `level`. `xpForLevel` is rounded, so this is the
 *  largest XP that is still the level below — the exact off-by-one seat. */
const justUnder = (level: number): number => xpForLevel(level) - 1;

describe('the ladder itself', () => {
  it('is small enough to be read, and spread up the curve', () => {
    // The trap is sixty coefficients. Twelve authored entries: three shared
    // practice rungs plus nine signatures.
    expect(ALL_PERKS.length).toBe(3 * SKILL_IDS.length + 9);
    for (const s of SKILL_IDS) {
      expect(LADDER[s].length).toBeGreaterThanOrEqual(4);
      expect(LADDER[s].length).toBeLessThanOrEqual(6);
    }
    // Mass sits high: most of the game's XP is above level 8, so most of the
    // ladder must be too. This is the actual defect being fixed.
    const high = ALL_PERKS.filter((p) => p.level >= 10).length;
    expect(high).toBeGreaterThan(ALL_PERKS.length / 2);
    expect(TOP_RUNG).toBe(28);
  });

  it('is inside the level cap, sorted, uniquely identified, and labelled', () => {
    const ids = new Set<string>();
    for (const s of SKILL_IDS) {
      let last = 0;
      for (const p of LADDER[s]) {
        expect(p.skill).toBe(s);
        expect(p.level).toBeGreaterThan(1);
        expect(p.level).toBeLessThanOrEqual(LEVEL_CAP);
        expect(p.level).toBeGreaterThanOrEqual(last); // sorted low to high
        last = p.level;
        expect(ids.has(p.id)).toBe(false);
        ids.add(p.id);
        // A rung without a line worth reading is a coefficient, and the brief
        // says cut it. So: a real sentence, and never a numeral — the HUD owns
        // the numbers, the label owns the voice.
        expect(p.label.length).toBeGreaterThan(20);
        expect(p.label).toMatch(/[.!?]$/);
        expect(p.label).not.toMatch(/[0-9]/);
      }
    }
  });

  it('gives every skill at least one capability, not only a rate', () => {
    for (const s of SKILL_IDS) {
      const capability = LADDER[s].filter((p) => p.effect.kind !== 'take');
      expect(capability.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('stays out of the gates lane and the economy lane', () => {
    // Structural, not stylistic: a perk has no price and no cost, and it names
    // no place, no item and no door. Those two lanes belong to other modules.
    for (const p of ALL_PERKS as (Perk & Record<string, unknown>)[]) {
      expect(Object.keys(p).sort()).toEqual(['effect', 'id', 'label', 'level', 'skill']);
      expect(p).not.toHaveProperty('cost');
      expect(p).not.toHaveProperty('price');
      expect(p).not.toHaveProperty('needs');
      expect(p).not.toHaveProperty('to');
    }
  });
});

describe('a perk arrives at its threshold, and not one XP before', () => {
  it('holds for every rung on every ladder', () => {
    for (const s of SKILL_IDS) {
      for (const p of LADDER[s]) {
        const at = xpForLevel(p.level);
        expect(levelFor(justUnder(p.level))).toBe(p.level - 1); // the seat is real
        const before = perksFor(s, justUnder(p.level)).map((x) => x.id);
        const after = perksFor(s, at).map((x) => x.id);
        expect(before.includes(p.id)).toBe(false);
        expect(after.includes(p.id)).toBe(true);
      }
    }
  });

  it('holds for the resolved powers, one XP either side of guile 20', () => {
    const xp = ZERO();
    xp.guile = justUnder(20);
    expect(powers(xp).lootOnFail).toBe(false);
    xp.guile = xpForLevel(20);
    expect(powers(xp).lootOnFail).toBe(true);
  });
});

describe('the rate — take, the one axis, and its arithmetic', () => {
  it('is 1.00 below level 8', () => {
    expect(take(0)).toBe(1);
    expect(take(justUnder(8))).toBe(1);
  });

  it('is 1.25 / 1.50 / 2.00 at levels 10 / 20 / 30', () => {
    // The documented curve: +0.25 at 8, +0.25 at 18, +0.5 at 28. Additive, so
    // it is exact in binary and cannot compound into an explosion.
    expect(take(xpForLevel(10))).toBe(1.25);
    expect(take(xpForLevel(20))).toBe(1.5);
    expect(take(xpForLevel(30))).toBe(2);
    // and it steps exactly where it says it does
    expect(take(xpForLevel(8))).toBe(1.25);
    expect(take(justUnder(18))).toBe(1.25);
    expect(take(xpForLevel(18))).toBe(1.5);
    expect(take(justUnder(28))).toBe(1.5);
    expect(take(xpForLevel(28))).toBe(2);
  });

  it('doubles at the cap and never more — a rate a player feels, not one that runs away', () => {
    let prev = 0;
    for (let l = 1; l <= LEVEL_CAP; l++) {
      const t = take(xpForLevel(l));
      expect(t).toBeGreaterThanOrEqual(prev); // never a cut
      expect(t).toBeLessThanOrEqual(2);       // never an explosion
      prev = t;
    }
    expect(take(xpForLevel(LEVEL_CAP) * 100)).toBe(2); // no rung beyond the cap
  });

  it('is per skill and cannot cross-feed', () => {
    const xp = ZERO();
    xp.craft = xpForLevel(30);
    const P = powers(xp);
    expect(P.take.craft).toBe(2);
    for (const s of SKILL_IDS) if (s !== 'craft') expect(P.take[s]).toBe(1);
  });
});

describe('capabilities — things you could not do at all before', () => {
  it('craft lowers the satchel target 8 → 6 → 4, and only lowers it', () => {
    expect(satchelTarget(0)).toBe(BASE_SATCHEL_TARGET);
    expect(satchelTarget(justUnder(12))).toBe(8);
    expect(satchelTarget(xpForLevel(12))).toBe(6);
    expect(satchelTarget(justUnder(26))).toBe(6);
    expect(satchelTarget(xpForLevel(26))).toBe(4);
    expect(satchelTarget(xpForLevel(30))).toBe(4);
  });

  it('attunement sight grows 0 → 1 → 2 and never shrinks', () => {
    const xp = ZERO();
    expect(powers(xp).sight).toBe(0);
    xp.attunement = xpForLevel(14);
    expect(powers(xp).sight).toBe(1);
    xp.attunement = xpForLevel(23);
    expect(powers(xp).sight).toBe(2);
    xp.attunement = xpForLevel(30);
    expect(powers(xp).sight).toBe(2);
  });

  it('hands over the flags a maxed player expects, all at once', () => {
    const xp = ZERO();
    for (const s of SKILL_IDS) xp[s] = xpForLevel(LEVEL_CAP);
    expect(powers(xp)).toEqual({
      take: { wayfaring: 2, lore: 2, craft: 2, guile: 2, attunement: 2 },
      satchelTarget: 4,
      lootOnFail: true,
      readsRoads: true,
      recall: true,
      readsSatchels: true,
      reachAnySeen: true,
      sight: 2,
    });
  });

  it('is pure — same XP, same powers, and the caller cannot poison the ladder', () => {
    expect(powers(ZERO())).toEqual(powers(ZERO()));
    const P = powers(ZERO());
    P.take.craft = 99;
    expect(powers(ZERO()).take.craft).toBe(1); // no shared mutable state
    expect(() => { (LADDER as Record<string, unknown>).craft = []; }).toThrow();
  });

  it('tolerates a save that predates a skill', () => {
    // Perks are a pure function of XP and need no migration; a missing field
    // must read as zero rather than NaN.
    const partial = { craft: xpForLevel(12) } as unknown as Record<SkillId, number>;
    const P = powers(partial);
    expect(P.satchelTarget).toBe(6);
    expect(P.take.wayfaring).toBe(1);
  });
});

describe('next unlock — what you get next, and how far off it is', () => {
  it('at a boundary, next is the rung AFTER the one just landed', () => {
    const at8 = nextUnlock('wayfaring', xpForLevel(8));
    expect(at8?.level).toBe(18);
    expect(at8?.toGo).toBe(xpForLevel(18) - xpForLevel(8));
    expect(at8?.progress).toBe(0);
    // one XP earlier, level 8 itself is still the thing you are waiting for
    const before = nextUnlock('wayfaring', justUnder(8));
    expect(before?.level).toBe(8);
    expect(before?.toGo).toBe(1);
  });

  it('mid-way, it names the right rung and a sane bar', () => {
    // Level 15 for wayfaring: 5 and 8 are behind, 18 is next.
    const n = nextUnlock('wayfaring', xpForLevel(15));
    expect(n?.perk.id).toBe('wayfaring-practice-18');
    expect(n?.atXp).toBe(xpForLevel(18));
    expect(n?.toGo).toBe(xpForLevel(18) - xpForLevel(15));
    expect(n!.progress).toBeGreaterThan(0);
    expect(n!.progress).toBeLessThan(1);
    // and the bar starts from the rung you last got, not from zero
    const from = xpForLevel(8);
    const span = xpForLevel(18) - from;
    expect(n!.progress).toBeCloseTo((xpForLevel(15) - from) / span, 10);
  });

  it('is null at the top of the ladder — no invented target', () => {
    for (const s of SKILL_IDS) {
      expect(nextUnlock(s, xpForLevel(LEVEL_CAP))).toBe(null);
      expect(nextUnlock(s, xpForLevel(TOP_RUNG))).toBe(null);
      expect(nextUnlock(s, justUnder(TOP_RUNG))?.level).toBe(TOP_RUNG);
    }
    expect(Object.keys(nextUnlocks({
      wayfaring: xpForLevel(30), lore: xpForLevel(30), craft: xpForLevel(30),
      guile: xpForLevel(30), attunement: xpForLevel(30),
    }))).toEqual([]);
  });

  it('always points forward, at every XP a skill can hold', () => {
    for (const s of SKILL_IDS) {
      for (let xp = 0; xp <= xpForLevel(LEVEL_CAP); xp += 37) {
        const n = nextUnlock(s, xp);
        if (!n) { expect(levelFor(xp)).toBeGreaterThanOrEqual(TOP_RUNG); continue; }
        expect(n.toGo).toBeGreaterThan(0);
        expect(n.level).toBeGreaterThan(levelFor(xp));
        expect(perksFor(s, xp).map((p) => p.id)).not.toContain(n.perk.id);
        expect(n.progress).toBeGreaterThanOrEqual(0);
        expect(n.progress).toBeLessThanOrEqual(1);
      }
    }
  });

  it('answers for a fresh save, which is the first thing the HUD asks', () => {
    const first = nextUnlocks(ZERO());
    expect(first.wayfaring?.level).toBe(5);
    expect(first.lore?.level).toBe(6);
    expect(first.craft?.level).toBe(8);
    expect(first.guile?.level).toBe(8);
    expect(first.attunement?.level).toBe(8);
  });
});

describe('nothing is ever lost', () => {
  it('more XP never removes a perk, at any XP, for any skill', () => {
    for (const s of SKILL_IDS) {
      let held = new Set<string>();
      for (let xp = 0; xp <= xpForLevel(LEVEL_CAP) + 5000; xp += 101) {
        const now = new Set(perksFor(s, xp).map((p) => p.id));
        for (const id of held) expect(now.has(id)).toBe(true);
        held = now;
      }
      expect(held.size).toBe(LADDER[s].length); // and everything does arrive
    }
  });

  it('no resolved power ever moves backwards as XP climbs', () => {
    const xp = ZERO();
    let prev = powers(xp);
    for (let step = 0; step <= xpForLevel(LEVEL_CAP); step += 211) {
      for (const s of SKILL_IDS) xp[s] = step;
      const now = powers(xp);
      for (const s of SKILL_IDS) expect(now.take[s]).toBeGreaterThanOrEqual(prev.take[s]);
      expect(now.satchelTarget).toBeLessThanOrEqual(prev.satchelTarget); // lower is better
      expect(now.sight).toBeGreaterThanOrEqual(prev.sight);
      for (const f of ['lootOnFail', 'readsRoads', 'recall', 'readsSatchels', 'reachAnySeen'] as const) {
        if (prev[f]) expect(now[f]).toBe(true);
      }
      prev = now;
    }
  });
});
