// THE TWO NUMBERS THAT WERE LANDMINES, ASSERTED AGAINST THE SHIPPED DATA.
//
// `REFLECT_MIN_CONCEPTS = 820` sat in the engine as the prestige gate while the
// review measured 106 concepts reachable through lanes. Nothing failed. The
// game simply had a prestige nobody could ever reach, and it took an 11-agent
// review to notice — because no test ever asked the DATA what was reachable.
//
// So both constants that describe the world are checked against the world here:
//
//   READABLE_CONCEPTS   the denominator under `Words N / M`
//   RETRAIN_MIN_WORDS   the prestige gate
//
// Re-cut the story graph and this file fails first, which is the only reason it
// exists.
import { describe, expect, it } from 'vitest';
import { STORY } from '../src/content/story';
import { SEED_NODES } from '../src/content/seed';
import { CONCEPT_BUDGET, READABLE_CONCEPTS } from '../src/content/ontologyMeta';
import { RETRAIN_MIN_WORDS, STEP_BASE, STEP_RATIO } from '../src/core/engine';

/** Every concept a player could ever arrive at, walking lanes from the seed and
 *  respecting every gate. A fixpoint, because a concept you reach can unlock a
 *  lane that was locked when you started. */
function reachable(): Set<number> {
  const byAt = new Map(STORY.beats.map((b) => [b.at, b] as const));
  const held = new Set<number>(SEED_NODES);
  for (let grew = true; grew;) {
    grew = false;
    for (const id of [...held]) {
      const beat = byAt.get(id);
      if (!beat) continue;
      for (const c of beat.choices) {
        const need = c.requires?.concepts ?? [];
        if (held.has(c.to) || !need.every((r) => held.has(r))) continue;
        held.add(c.to);
        grew = true;
      }
    }
  }
  return held;
}

describe('the world is as big as the constants say', () => {
  it('reaches exactly READABLE_CONCEPTS non-seed concepts through gated lanes', () => {
    const seed = new Set(SEED_NODES);
    const readable = [...reachable()].filter((id) => !seed.has(id));
    expect(readable.length).toBe(READABLE_CONCEPTS);
    expect(READABLE_CONCEPTS).toBeLessThanOrEqual(CONCEPT_BUDGET);
  });

  it('offers the opening board somewhere to go', () => {
    // The seed has to sit on beats or the first tap has no target — measured
    // false once already, when 397 places were orphaned.
    const byAt = new Map(STORY.beats.map((b) => [b.at, b] as const));
    const exits = SEED_NODES.filter((id) => (byAt.get(id)?.choices.length ?? 0) > 0);
    expect(exits.length, 'no seed concept has a beat with an exit').toBeGreaterThan(0);
  });
});

describe('the Retrain gate is reachable, unlike the one it replaced', () => {
  it('sits far below the number of concepts a player can walk to', () => {
    expect(RETRAIN_MIN_WORDS).toBeLessThan(READABLE_CONCEPTS);
  });

  it('is priced at a total a run can plausibly earn', () => {
    // Total Solid to walk N new concepts is a geometric sum. At 120 that is
    // ~16,450; at 300 it is ~2.1 million, which is why the gate is not 300 and
    // could never have been 820.
    const total = (n: number): number =>
      STEP_BASE * (Math.pow(STEP_RATIO, n) - 1) / (STEP_RATIO - 1);
    expect(total(RETRAIN_MIN_WORDS)).toBeLessThan(50_000);
    expect(total(RETRAIN_MIN_WORDS)).toBeGreaterThan(1_000);
    // ...and the curve really is the wall the plateau is made of.
    expect(total(300)).toBeGreaterThan(1e6);
  });
});
