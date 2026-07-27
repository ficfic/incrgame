#!/usr/bin/env node
/* build-story.mjs — generate the CYOA beat skeletons from the lane spines.
 *
 * THIS SCRIPT GENERATES STRUCTURE ONLY — ids, junctions, gates, destinations.
 * It writes no sentences, but not for the reason it used to: the ★ prose
 * guardrail was reversed by the owner on 2026-07-27 (see docs/DECISIONS.md), so
 * prose is now machine-drafted and owner-edited. It stays out of here because
 * structure and text move independently — 93 beats collapsed to 27 when the
 * keying changed, and authored text must survive that. Prose lives in
 * docs/graph/prose.json and is merged in below.
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
const byConcept = new Map();   // node id -> the single beat standing there
let merged = 0;
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

    /* ONE BEAT PER CONCEPT, not per (lane, depth).
     *
     * This keyed by `${lane}-${depth}` until the continuity review measured
     * what that produced: "26 beats stand at `entity` and 17 at `abstraction`
     * — 46% of the corpus at two nodes... this is one sentence rewritten 43
     * times." Three writers independently opened with the literal 5-gram
     * "entity covers everything, which is why".
     *
     * That was not a writing failure. Every lane starts at `entity`, so the
     * generator was ASKING for 26 beats about the same concept and there was
     * no non-identical way to answer. Lanes share their upper reaches — near
     * the root they are the same few nodes — so a beat belongs to a PLACE, and
     * the lanes leaving it are its choices.
     *
     * It is also the starmap: standing at `entity` you see every lane that
     * leaves it, which is what the owner asked for in the first place. */
    const key = node(here.id);
    const existing = byConcept.get(key);
    if (existing) {
      existing.choices.push(...choices);
      existing.pendingSiblings.push(...next.siblings);
      existing.lanes.push(lane.category);
      merged++;
      continue;
    }
    const beat = {
      id: `c${key}`,
      lanes: [lane.category],
      laneIndex: li,
      depth: d,
      at: key,
      atLabel: here.label,
      frame: frameFor(d, lane.spine.length),
      title: '', // ← owner, OPTIONAL override of the frame
      body: '',  // ← owner, OPTIONAL override of the frame
      choices,
      pendingSiblings: [...next.siblings],
    };
    byConcept.set(key, beat);
    beats.push(beat);
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
      id: `${b.id}-alt${si}`,
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

/* DEDUPE CHOICES WITHIN A MERGED BEAT.
 *
 * 26 lanes run through `entity`, and every one of them offers the same three
 * children, so the merge produced 78 choices at that beat: 26 copies each of
 * `physical entity`, `abstraction` and `thing`. Near the root the lanes are not
 * distinct routes at all — they are the same few nodes — and they only diverge
 * further down.
 *
 * Keep one choice per destination, preferring an UNGATED copy: if any lane
 * reaches a destination without a key, the destination is not gated. Dropping
 * that preference would invent locks that no lane actually imposes. */
for (const b of beats) {
  const best = new Map();
  for (const c of b.choices) {
    const prev = best.get(c.to);
    const ungated = (c.requires?.concepts ?? []).length === 0;
    if (!prev || (ungated && (prev.requires?.concepts ?? []).length > 0)) best.set(c.to, c);
  }
  b.choices = [...best.values()];
}

/* MERGE THE AUTHORED PROSE.
 *
 * docs/graph/prose.json is written by hand. Merging it here rather than
 * authoring inside this script means regenerating the STRUCTURE never destroys
 * the TEXT — the two have already moved independently once (93 beats collapsed
 * to 27 after the structure changed) and will again.
 *
 * `⟦word⟧` marks a maskable concept. Everything outside the brackets is always
 * visible, so the sentence still parses when every concept in it is unread.
 * See docs/VOICE.md section 4. */
const PROSE = join(ROOT, 'docs/graph/prose.json');
const prose = JSON.parse(readFileSync(PROSE, 'utf8'));
let written = 0;
for (const b of beats) {
  // Keyed by LABEL, not by beat id: beat ids embed node ids, and node ids
  // renumber whenever the concept selection changes — which it is about to,
  // for connectivity. Labels are unique in the shipped set (build-ontology.mjs
  // rejects duplicate labels), so they survive a re-selection intact.
  const p = prose[b.atLabel];
  if (!p) continue;
  written++;
  b.title = p.title ?? '';
  b.body = p.body ?? '';
  for (const c of b.choices) if (p.choices?.[c.toLabel]) c.label = p.choices[c.toLabel];
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
console.log(`beats with prose ..... ${written} of ${beats.length}`);
// Never silent: a bounded artifact that does not say what it bounded reads as
// complete coverage when it is not.
console.log(
  `\nDROPPED (not in the shipped dataset): ${dropped.beats} beats, ${dropped.choices} branches.\n` +
    `  The dataset is a breadth-first slice bottoming out at depth 5; these beats\n` +
    `  sit deeper. Re-aim it depth-first and they appear with no change here.`,
);
console.log(`\nwrote ${OUT}`);
