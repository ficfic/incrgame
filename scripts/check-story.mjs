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
 *      sit on some lane's ungated spine, so a player who only ever takes the
 *      guaranteed exit still learns it eventually. Keys are deliberately drawn
 *      from OTHER lanes — that is the come-back-later loop — so this is checked
 *      ACROSS runs, not within one. Within a run you are meant to be locked out;
 *      what must never happen is being locked out forever.
 *
 *   3. NO DANGLING REFERENCE. Every `to` and every key resolves to a concept
 *      that lanes.json actually contains.
 *
 * ── RULE 4 EVIDENCE: this check has been confirmed RED ───────────────────────
 * Sabotage A — delete the ungated exit from one beat. In build-story.mjs, change
 *   `requires: { concepts: [], rels: [] }, // the guaranteed readable exit`
 * to `requires: { concepts: ['00001740-n'], rels: [] },` then regenerate and run.
 * Observed output:
 *   FAIL  dead end: 308 beat(s) have no ungated exit
 *     e.g. noun.animal-1 (all 3 choices gated)
 *   exit 1
 *
 * Sabotage B — point a gate at a concept no lane teaches. In build-story.mjs
 * change the `key` assignment to `const key = 'nonesuch-n';`, regenerate, run.
 * Observed output:
 *   FAIL  unobtainable key: 1 concept gates a choice but is on no lane spine
 *     nonesuch-n gates noun.Tops-5-alt2
 *   exit 1
 *
 * Both sabotages were applied, observed, and reverted on 2026-07-27.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { lanes } = JSON.parse(readFileSync(join(ROOT, 'docs/graph/lanes.json'), 'utf8'));
const { beats } = JSON.parse(readFileSync(join(ROOT, 'docs/graph/story.json'), 'utf8'));

// Every concept the dataset knows about, and every concept an ungated-only
// player can reach by walking spines across runs.
const known = new Set();
const teachable = new Set();
for (const l of lanes) {
  for (const s of l.spine) {
    known.add(s.id);
    teachable.add(s.id);            // spine concepts are reached by ungated exits
    for (const sib of s.siblings) known.add(sib.id);
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
    `unobtainable key: ${orphanKeys.size} concept gates a choice but is on no lane spine\n` +
      `  ${k} gates ${cid}`,
  );
}

// 3. no dangling reference
const dangling = [];
for (const b of beats) {
  if (!known.has(b.at)) dangling.push(`beat ${b.id} sits at unknown concept ${b.at}`);
  for (const c of b.choices) {
    if (!known.has(c.to)) dangling.push(`choice ${c.id} leads to unknown concept ${c.to}`);
  }
}
if (dangling.length) {
  fail.push(`dangling reference: ${dangling.length}\n  ${dangling[0]}`);
}

if (fail.length) {
  for (const f of fail) console.error('FAIL  ' + f);
  process.exit(1);
}

const gated = beats.reduce((n, b) => n + b.choices.filter((c) => (c.requires?.concepts ?? []).length).length, 0);
console.log(`ok  ${beats.length} beats, ${gated} gated choices, every beat has an exit`);
console.log(`ok  every gate key is on a lane spine (${teachable.size} teachable concepts)`);
console.log(`ok  no dangling concept references`);
