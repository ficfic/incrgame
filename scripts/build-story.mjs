#!/usr/bin/env node
/* build-story.mjs — the beat graph: every place the player can stand.
 *
 * WHAT A BEAT IS
 * --------------
 * One beat per CONCEPT that has somewhere to go. Standing at a concept you see
 * the lanes leaving it — that is the starmap, and it is the same object as the
 * story. A beat belongs to a place, never to a route through it.
 *
 * This was keyed by (lane, depth) until the continuity review measured what
 * that produced: "26 beats stand at `entity` and 17 at `abstraction` — 46% of
 * the corpus at two nodes... this is one sentence rewritten 43 times." Every
 * lane starts at `entity`, so the generator was ASKING 26 writers for 26
 * different beats about the same concept. That was not a writing failure.
 *
 * It then generated only lane SPINES — 27 beats — and two independent reviews
 * put the same number on that: you exhaust every decision in about 90 minutes,
 * and the remaining lane steps carry no choices at all. Concept granularity is
 * the fix. 446 concepts in the shipped slice have children, so there are 446
 * places, not 27.
 *
 * THREE KINDS OF EXIT
 * -------------------
 *   DOWN, ungated   — a child. Always walkable, and taking it teaches you that
 *                     word. This is the guaranteed exit that makes a softlock
 *                     impossible, and the only way vocabulary enters the game.
 *   DOWN, gated     — a further child, locked behind a concept taught
 *                     elsewhere. The come-back-later loop.
 *   SIDEWAYS, gated — a gloss reference (docs/graph/crosslinks.json), locked
 *                     behind the RELATION rather than behind a concept. Until
 *                     you discover this kind of edge exists you cannot use any
 *                     of them; when you do, the whole labyrinth opens at once.
 *
 * That last one is the second vocabulary axis finally switched on. `rel: 8` is
 * `named in definition` and needs adding to REL_NAMES in src/core/types.ts —
 * additive, no migration. It is a GAME CONSTRUCT, not a WordNet relation; see
 * docs/SIMPLIFICATIONS.md for exactly what it does and does not claim.
 *
 * PROSE lives in docs/graph/prose.json, keyed by concept LABEL, and is merged
 * in here rather than authored here. Structure and text move independently —
 * 93 beats became 27 became 446 — and authored text has to survive that.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONTOLOGY = join(ROOT, 'public/ontology');
const OUT = join(ROOT, 'docs/graph/story.json');

const UNGATED_CHILDREN = 3;   // always-walkable exits per beat
const GATED_CHILDREN = 3;     // further children, locked behind a concept
const CROSS_PER_BEAT = 3;     // sideways routes, locked behind the relation
const REL_ISA = 0;
const REL_NAMED = 8;          // `named in definition` — add to REL_NAMES

// ---- the shipped concepts --------------------------------------------------

const index = JSON.parse(readFileSync(join(ONTOLOGY, 'index.json'), 'utf8'));
const label = [];
const parent = [];
for (let c = 0; c < index.chunks; c++) {
  const chunk = JSON.parse(readFileSync(join(ONTOLOGY, `c${String(c).padStart(3, '0')}.json`), 'utf8'));
  label.push(...chunk.l);
  parent.push(...chunk.p);
}

const children = new Map();
parent.forEach((p, i) => { if (p >= 0) (children.get(p) ?? children.set(p, []).get(p)).push(i); });

// Parents always ship at a lower index than their children — build-ontology.mjs
// asserts it — so one forward pass gives every depth.
const depth = [];
for (let i = 0; i < label.length; i++) depth[i] = parent[i] < 0 ? 0 : depth[parent[i]] + 1;
const maxDepth = Math.max(...depth);

const cross = new Map();
for (const [a, b] of JSON.parse(readFileSync(join(ROOT, 'docs/graph/crosslinks.json'), 'utf8')).e) {
  (cross.get(a) ?? cross.set(a, []).get(a)).push(b);
}

/* FRAMES. A beat names a frame rather than carrying its own prose, so the
 * writing load is a handful of carrier sentences plus whatever bespoke beats
 * earn their place. The first version of this script emitted an empty title,
 * body and label per beat — 1,676 slots — which is a novel, and it also missed
 * why the masking works at all: the carrier is a small fixed set and the
 * variation comes from which words in it you can read. */
const frameFor = (d) => {
  if (d === 0) return 'arrival';
  if (d >= maxDepth - 1) return 'leaf';
  if (d >= Math.floor(maxDepth * 0.66)) return 'threshold';
  return 'descent';
};

// ---- one beat per concept that has somewhere to go -------------------------

const beats = [];
for (const c of [...children.keys()].sort((a, b) => a - b)) {
  const kids = [...children.get(c)].sort((x, y) => (label[x] < label[y] ? -1 : 1));
  const choices = kids.slice(0, UNGATED_CHILDREN).map((k, n) => ({
    id: `c${c}-on${n}`,
    frame: 'continue',
    label: '',
    to: k,
    toLabel: label[k],
    rel: REL_ISA,
    requires: { concepts: [], rels: [] },   // the guaranteed exits
    effects: {},
  }));
  if (!choices.length) continue;
  beats.push({
    id: `c${c}`,
    at: c,
    atLabel: label[c],
    depth: depth[c],
    frame: frameFor(depth[c]),
    title: '',
    body: '',
    choices,
    pendingGated: kids.slice(UNGATED_CHILDREN, UNGATED_CHILDREN + GATED_CHILDREN),
    pendingCross: (cross.get(c) ?? []).filter((t) => children.has(t)).slice(0, CROSS_PER_BEAT),
  });
}

/* PASS 2 — gate the branches.
 *
 * Keys must come from what a surviving beat actually TEACHES, not from any
 * concept that happens to exist. An earlier version drew them from the lane
 * spines and check-story.mjs caught it red: 3 keys sat on beats that had been
 * dropped for being too deep, so no ungated path ever taught them — doors with
 * no key anywhere in the world. Hence two passes. */
const teachable = [];
for (const b of beats) for (const c of b.choices) teachable.push(c.to);

let gatedCount = 0;
let crossCount = 0;
for (const b of beats) {
  b.pendingGated.forEach((k, n) => {
    // Deliberately not a concept from this beat's own children: the key has to
    // be earned somewhere else, which is what makes you come back.
    const key = teachable[(b.at * 7 + n * 101) % teachable.length];
    if (key === undefined || key === k) return;
    gatedCount++;
    b.choices.push({
      id: `c${b.at}-alt${n}`,
      frame: 'branch',
      label: '',
      to: k,
      toLabel: label[k],
      rel: REL_ISA,
      requires: { concepts: [key], rels: [] },
      effects: {},
    });
  });
  b.pendingCross.forEach((t, n) => {
    crossCount++;
    b.choices.push({
      id: `c${b.at}-x${n}`,
      frame: 'sideways',
      label: '',
      to: t,
      toLabel: label[t],
      rel: REL_NAMED,
      requires: { concepts: [], rels: [REL_NAMED] },
      effects: {},
    });
  });
  delete b.pendingGated;
  delete b.pendingCross;
}

// ---- merge the authored prose ----------------------------------------------

const prose = JSON.parse(readFileSync(join(ROOT, 'docs/graph/prose.json'), 'utf8'));
let written = 0;
for (const b of beats) {
  // Keyed by LABEL, not beat id: beat ids embed node ids and node ids renumber
  // whenever the concept selection changes. Labels are unique in the shipped
  // set because build-ontology.mjs rejects duplicate labels.
  const p = prose[b.atLabel];
  if (!p) continue;
  written++;
  b.title = p.title ?? '';
  b.body = p.body ?? '';
  for (const c of b.choices) if (p.choices?.[c.toLabel]) c.label = p.choices[c.toLabel];
}

const frames = [...new Set([...beats.map((b) => b.frame), ...beats.flatMap((b) => b.choices.map((c) => c.frame))])].sort();

writeFileSync(
  OUT,
  JSON.stringify({
    generatedBy: 'scripts/build-story.mjs',
    relNamed: REL_NAMED,
    counts: { beats: beats.length, gated: gatedCount, sideways: crossCount, withProse: written },
    frames,
    beats,
  }) + '\n',
);

console.log(`beats ............... ${beats.length}   (one per concept with children)`);
console.log(`gated branches ...... ${gatedCount}`);
console.log(`sideways routes ..... ${crossCount}   (rel ${REL_NAMED}, the labyrinth)`);
console.log(`with authored prose . ${written}   rest render from ${frames.length} frames: ${frames.join(', ')}`);
console.log(`\nwrote ${OUT}`);
