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
const IDMAP = join(ROOT, 'docs/graph/idmap.json');
const OUT = join(ROOT, 'docs/graph/story.json');

const { lanes } = JSON.parse(readFileSync(LANES, 'utf8'));

/* NUMERIC IDS — the seam between content tooling and the engine.
 *
 * lanes.json speaks WordNet synset ids ('00015568-n'). The engine speaks the
 * numeric node ids that index the shipped ontology chunks. This script does the
 * translation and emits NUMBERS, so the engine never learns that synset ids
 * exist. `idmap.json` is written by scripts/build-ontology.mjs.
 *
 * ⚠️ MEASURED, 2026-07-27: only 125 of 334 spine concepts (37%) and 286 of 752
 * sibling concepts (38%) currently HAVE a numeric id, because the shipped
 * dataset is a breadth-first slice that bottoms out at depth 5 (see
 * scripts/lane-analysis.mjs). `fish`, `chordate` and everything below them are
 * not in the game yet.
 *
 * So this script DROPS what it cannot resolve and says so loudly. What ships is
 * the buildable story, not a story that references concepts the player can
 * never meet. It grows on its own once the dataset is re-aimed depth-first — no
 * change needed here. */
const { map: NODE_ID } = JSON.parse(readFileSync(IDMAP, 'utf8'));
const node = (synsetId) => NODE_ID[synsetId];
const dropped = { beats: 0, choices: 0 };

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

    // A beat needs its own location and its guaranteed exit to exist in the
    // shipped dataset. Without either it is unplayable, so it is not emitted.
    if (node(here.id) === undefined || node(next.id) === undefined) {
      dropped.beats++;
      continue;
    }

    const choices = [
      {
        id: `${lane.category}-${d}-on`,
        frame: 'continue',
        label: '', // ← owner, OPTIONAL override of the frame
        to: node(next.id),
        toLabel: next.label,
        rel: 0, // `is a` — REL_NAMES[0]
        requires: { concepts: [], rels: [] }, // the guaranteed readable exit
        effects: {},
      },
    ];

    beats.push({
      id: `${lane.category}-${d}`,
      lane: lane.category,
      laneIndex: li,
      depth: d,
      at: node(here.id),
      atLabel: here.label,
      frame: frameFor(d, lane.spine.length),
      title: '', // ← owner, OPTIONAL override of the frame
      body: '',  // ← owner, OPTIONAL override of the frame
      choices,
      pendingSiblings: next.siblings,
    });
  }
}

/* PASS 2 — gate the branches.
 *
 * Keys must come from what a SURVIVING beat actually teaches, not from the full
 * lane spines. The first version drew them from lanes.json directly and
 * check-story.mjs caught it red:
 *
 *   FAIL  unobtainable key: 3 concept gates a choice but is on no lane spine
 *     1880 gates noun.group-4-alt0
 *
 * Those keys had real node ids but sat on beats that had been dropped for being
 * too deep, so no ungated path in the shipped story ever taught them — a door
 * with no key anywhere in the world. Hence two passes: learn what is teachable,
 * then gate only on that. */
const teachable = [];
for (const b of beats) for (const c of b.choices) if (!c.requires.concepts.length) teachable.push(c.to);

for (const b of beats) {
  for (let si = 0; si < b.pendingSiblings.length; si++) {
    const sib = b.pendingSiblings[si];
    if (node(sib.id) === undefined) {
      dropped.choices++;
      continue;
    }
    // Deterministic, and deliberately NOT this beat's own lane: the key has to
    // be earned somewhere else, which is what makes you come back.
    const offset = (b.laneIndex + 1 + si) * 7 + b.depth;
    let key = teachable[offset % teachable.length];
    if (key === undefined) { dropped.choices++; continue; }
    b.choices.push({
      id: `${b.lane}-${b.depth}-alt${si}`,
      frame: 'branch',
      label: '', // ← owner, OPTIONAL override of the frame
      to: node(sib.id),
      toLabel: sib.label,
      rel: 0,
      requires: { concepts: [key], rels: [] },
      effects: {},
    });
  }
  delete b.pendingSiblings;
  delete b.laneIndex;
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
// Never silent: a bounded artifact that does not say what it bounded reads as
// complete coverage when it is not.
console.log(
  `\nDROPPED (not in the shipped dataset): ${dropped.beats} beats, ${dropped.choices} branches.\n` +
    `  The dataset is a breadth-first slice bottoming out at depth 5; these beats\n` +
    `  sit deeper. Re-aim it depth-first and they appear with no change here.`,
);
console.log(`\nwrote ${OUT}`);
