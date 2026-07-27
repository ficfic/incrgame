#!/usr/bin/env node
/* build-story.mjs — generate the CYOA beat skeletons from the lane spines.
 *
 * ★ THIS SCRIPT WRITES NO SENTENCES. ★
 * Every `title`, `body` and choice `label` it emits is the empty string, exactly
 * like `src/content/vignettes.ts` ships them. The UI renders a visible ⟨owner⟩
 * marker in their place so an unwritten beat looks unfinished, never quietly
 * fake (CLAUDE.md ★ prose guardrail; VISION.md "Hard rules"). What this script
 * generates is STRUCTURE: ids, junctions, gates, destinations.
 *
 * THE SHAPE IT BUILDS
 * -------------------
 * One beat per junction on each lane spine (see scripts/lane-analysis.mjs).
 * Each beat offers:
 *
 *   - exactly one UNGATED choice, continuing down this lane's spine. This is
 *     both the guaranteed exit and the way vocabulary is taught: taking it is
 *     how you learn the next concept.
 *   - the sibling branches, each GATED on a concept that lives on a DIFFERENT
 *     lane's spine. You can see the branch; you cannot read it until you have
 *     met that word somewhere else.
 *
 * That cross-lane gating is the whole "come back later" loop: you walk the
 * animal lane, learn a word, and a branch you already walked past on the
 * artifact lane becomes readable. Metroidvania, with words for keys.
 *
 * WHY IT CANNOT SOFTLOCK
 * ----------------------
 * Every gate key is drawn from some lane's spine, and every spine is reachable
 * using ungated choices alone. So a player who only ever takes the ungated exit
 * still eventually learns every key in the game. `scripts/check-story.mjs`
 * proves this on the committed output rather than trusting this comment.
 *
 * KNOWN LIMITATION, on record: every edge here is rel 0 (`is a`), because a
 * hypernym spine has no other relation on it. The design's second gating axis —
 * not being able to read the EDGE TYPE — needs cross-lane relations (has part,
 * topic, ...) which lane-analysis.mjs does not yet extract. `requires.rels` is
 * therefore always empty today. It is in the schema so the gate does not need a
 * migration when those edges arrive.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANES = join(ROOT, 'docs/graph/lanes.json');
const OUT = join(ROOT, 'docs/graph/story.json');

const { lanes } = JSON.parse(readFileSync(LANES, 'utf8'));

/** Concepts a player learns by walking a lane's spine with ungated moves only. */
const spineConcepts = lanes.map((l) => l.spine.map((s) => s.id));

/* FRAMES — why beats do not each carry their own prose.
 *
 * The first version of this script emitted an empty title+body per beat and an
 * empty label per choice: 1,676 owner slots across 308 beats. That is a novel,
 * and it contradicts the whole reason the No Man's Sky masking works — there,
 * the CARRIER SENTENCE is a small fixed set and the variation comes from which
 * words in it you can read.
 *
 * So a beat names a `frame` instead. The owner writes one line per frame — a
 * handful, not 1,676 — and the beat supplies the words that drop into it. Beats
 * that deserve bespoke text can still override `title`/`body`; those overrides
 * ship empty and are opt-in, so the writing load is a floor of ~8 lines rather
 * than a ceiling of 1,676.
 *
 * Frame ids are STRUCTURE (which carrier applies where), not sentences. */
const frameFor = (depth, total) => {
  if (depth === 1) return 'arrival';
  if (depth >= total - 1) return 'leaf';
  if (depth >= Math.floor(total * 0.66)) return 'threshold';
  return 'descent';
};

const beats = [];
for (let li = 0; li < lanes.length; li++) {
  const lane = lanes[li];
  // Start at 1: index 0 is `entity` itself, which the player already has.
  for (let d = 1; d < lane.spine.length; d++) {
    const here = lane.spine[d - 1];
    const next = lane.spine[d];

    const choices = [
      {
        id: `${lane.category}-${d}-on`,
        frame: 'continue',
        label: '', // ← owner, OPTIONAL override of the frame
        to: next.id,
        toLabel: next.label,
        rel: 0, // `is a` — REL_NAMES[0]
        requires: { concepts: [], rels: [] }, // the guaranteed readable exit
        effects: {},
      },
    ];

    for (let si = 0; si < next.siblings.length; si++) {
      const sib = next.siblings[si];
      // Key from a DIFFERENT lane, so the branch is opened by knowledge earned
      // elsewhere. Deterministic: next lane round-robin, same depth, clamped.
      const keyLane = spineConcepts[(li + 1 + si) % spineConcepts.length];
      const key = keyLane[Math.min(d, keyLane.length - 1)];
      choices.push({
        id: `${lane.category}-${d}-alt${si}`,
        frame: 'branch',
        label: '', // ← owner, OPTIONAL override of the frame
        to: sib.id,
        toLabel: sib.label,
        rel: 0,
        requires: { concepts: [key], rels: [] },
        effects: {},
      });
    }

    beats.push({
      id: `${lane.category}-${d}`,
      lane: lane.category,
      depth: d,
      at: here.id,
      atLabel: here.label,
      frame: frameFor(d, lane.spine.length),
      title: '', // ← owner, OPTIONAL override of the frame
      body: '',  // ← owner, OPTIONAL override of the frame
      choices,
    });
  }
}

// The real writing load: one line per distinct frame, not one per beat.
const frames = [...new Set([...beats.map((b) => b.frame), ...beats.flatMap((b) => b.choices.map((c) => c.frame))])].sort();

writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedBy: 'scripts/build-story.mjs',
      note: 'All title/body/label fields are owner-written and ship empty by design.',
      counts: { beats: beats.length, lanes: lanes.length, frames: frames.length },
      frames,
      beats,
    },
    null,
    1,
  ) + '\n',
);

console.log(`beats ................ ${beats.length}`);
console.log(`lanes ................ ${lanes.length}`);
console.log(`frames to write ...... ${frames.length}  (${frames.join(', ')})`);
console.log(`per-beat overrides ... optional, all empty`);
console.log(`wrote ${OUT}`);
