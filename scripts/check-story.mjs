#!/usr/bin/env node
/* check-story.mjs — the gate that keeps the vocabulary-gated story playable.
 *
 * Three invariants. Each one, if broken, is a bug a player would experience as
 * "the game stopped" rather than as an error.
 *
 *   1. NO DEAD END. Every beat offers at least one choice with an empty
 *      `requires`. A beat whose every exit is gated can strand a player who
 *      lacks all the keys, and an idle game that strands you is one you close.
 *
 *   2. NO UNOBTAINABLE KEY. Every concept named in a `requires.concepts` must
 *      be the destination of some beat's ungated exit, so a player who only
 *      ever takes the guaranteed exit still learns it eventually. Keys are
 *      deliberately drawn from OTHER lanes — that is the come-back-later loop —
 *      so this is checked ACROSS runs, not within one. Within a run you are
 *      meant to be locked out; being locked out forever is the bug.
 *
 *   3. NO DANGLING REFERENCE. Every `at`, `to` and key is a numeric node id
 *      inside the shipped concept range.
 *
 * ── RULE 4 EVIDENCE: this check has been confirmed RED ───────────────────────
 * It has also caught a real bug, not just planted ones: build-story.mjs first
 * drew gate keys from the full lane spines, and 3 of them sat on beats that had
 * been dropped for being too deep — doors with no key anywhere in the world.
 * That is why the generator now runs in two passes.
 *
 * Sabotage A — delete the guaranteed exit. In build-story.mjs change
 *   `requires: { concepts: [], rels: [] }, // the guaranteed readable exit`
 * to `requires: { concepts: [0], rels: [] },`, regenerate, run. Observed:
 *   FAIL  dead end: 93 beat(s) have no ungated exit
 *     e.g. noun.animal-1 (all 1 choices gated)
 *   FAIL  unobtainable key: 1 concept(s) gate a choice that no ungated exit ever teaches
 *     0 gates noun.Tops-4-on
 *   exit 1
 *
 * Sabotage B — gate on a node id outside the dataset. Change
 *   `let key = teachable[offset % teachable.length];` to `let key = 99999;`,
 * regenerate, run. Observed:
 *   FAIL  unobtainable key: 1 concept(s) gate a choice that no ungated exit ever teaches
 *     99999 gates noun.Tops-4-alt1
 *   FAIL  dangling reference: 234
 *     choice noun.animal-1-alt0 is gated on unknown node 99999
 *   exit 1
 *
 * Sabotage C - a span naming something that is not a concept. In prose.json
 * change one bracketed word to a nonsense string, regenerate, run. Observed:
 *   FAIL  span: 1
 *     c0: <nonesuchword> is not a concept
 *   exit 1
 *
 * Sabotage D - a body that is mostly maskable words. Replace one body with
 * nothing but bracketed concepts, regenerate, run. Observed:
 *   FAIL  span: 1
 *     c0: 7/8 words are maskable - will not survive masking
 *   exit 1
 *
 * All four sabotages applied, observed, and reverted on 2026-07-27.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { concepts } = JSON.parse(readFileSync(join(ROOT, 'docs/graph/idmap.json'), 'utf8'));
const { beats } = JSON.parse(readFileSync(join(ROOT, 'docs/graph/story.json'), 'utf8'));

// story.json speaks NUMERIC node ids, the same ones the engine uses. This check
// therefore validates the artifact standalone — it does not re-derive anything
// from lanes.json, so it would catch build-story.mjs translating wrongly.
const known = (id) => Number.isInteger(id) && id >= 0 && id < concepts;

// What an ungated-only player learns: the destination of every guaranteed exit.
// Across runs, not within one — keys are drawn from other lanes on purpose, so
// being locked out this run is the design. Being locked out forever is the bug.
const teachable = new Set();
for (const b of beats) {
  for (const c of b.choices) {
    if ((c.requires?.concepts ?? []).length === 0) teachable.add(c.to);
  }
}

const fail = [];

// 1. no dead end
const stranded = beats.filter((b) => !b.choices.some((c) => (c.requires?.concepts ?? []).length === 0));
if (stranded.length) {
  fail.push(
    `dead end: ${stranded.length} beat(s) have no ungated exit\n` +
      `  e.g. ${stranded[0].id} (all ${stranded[0].choices.length} choices gated)`,
  );
}

// 2. no unobtainable key
const orphanKeys = new Map();
for (const b of beats) {
  for (const c of b.choices) {
    for (const k of c.requires?.concepts ?? []) {
      if (!teachable.has(k)) orphanKeys.set(k, c.id);
    }
  }
}
if (orphanKeys.size) {
  const [k, cid] = [...orphanKeys][0];
  fail.push(
    `unobtainable key: ${orphanKeys.size} concept(s) gate a choice that no ungated exit ever teaches\n` +
      `  ${k} gates ${cid}`,
  );
}

// 3. no dangling reference
const dangling = [];
for (const b of beats) {
  if (!known(b.at)) dangling.push(`beat ${b.id} sits at unknown node ${b.at}`);
  for (const c of b.choices) {
    if (!known(c.to)) dangling.push(`choice ${c.id} leads to unknown node ${c.to}`);
    for (const k of c.requires?.concepts ?? []) {
      if (!known(k)) dangling.push(`choice ${c.id} is gated on unknown node ${k}`);
    }
  }
}
if (dangling.length) {
  fail.push(`dangling reference: ${dangling.length}\n  ${dangling[0]}`);
}

/* 4. SPANS RESOLVE, AND NO BEAT IS ALL BLOCKS.
 *
 * `⟦word⟧` marks a maskable concept. Two ways this goes wrong and both are
 * invisible until a player hits them:
 *
 *   - a span naming something that is not a concept never masks, so the word
 *     stays legible forever and the beat quietly loses its gate;
 *   - a sentence whose every word is a span renders as a wall of unknown words
 *     with no English holding it up. docs/VOICE.md section 4 exists to prevent
 *     this: stakes live in the verb and the preposition, never in the noun.
 *
 * The second is checked as a ratio rather than by parsing English: if more than
 * half a body's words sit inside brackets, it will not survive masking. */
const LABELS = new Set();
{
  const idx = JSON.parse(readFileSync(join(ROOT, 'public/ontology/index.json'), 'utf8'));
  for (let c = 0; c < idx.chunks; c++) {
    for (const l of JSON.parse(readFileSync(join(ROOT, `public/ontology/c${String(c).padStart(3, '0')}.json`), 'utf8')).l) {
      LABELS.add(l);
    }
  }
}
const spanProblems = [];
for (const b of beats) {
  if (!b.body) continue;
  for (const text of [b.title, b.body, ...b.choices.map((c) => c.label)]) {
    for (const m of (text ?? '').matchAll(/⟦([^⟧]+)⟧/g)) {
      if (!LABELS.has(m[1])) spanProblems.push(`${b.id}: ⟦${m[1]}⟧ is not a concept`);
    }
  }
  const inSpans = [...b.body.matchAll(/⟦([^⟧]+)⟧/g)].reduce((n, m) => n + m[1].split(/\s+/).length, 0);
  const total = b.body.replace(/[⟦⟧]/g, '').split(/\s+/).length;
  if (inSpans / total > 0.5) {
    spanProblems.push(`${b.id}: ${inSpans}/${total} words are maskable — will not survive masking`);
  }
}
if (spanProblems.length) {
  fail.push(`span: ${spanProblems.length}\n  ${spanProblems[0]}`);
}

if (fail.length) {
  for (const f of fail) console.error('FAIL  ' + f);
  process.exit(1);
}

const gated = beats.reduce((n, b) => n + b.choices.filter((c) => (c.requires?.concepts ?? []).length).length, 0);
console.log(`ok  ${beats.length} beats, ${gated} gated choices, every beat has an exit`);
console.log(`ok  every gate key is taught by some ungated exit (${teachable.size} teachable concepts)`);
console.log(`ok  no dangling concept references`);
