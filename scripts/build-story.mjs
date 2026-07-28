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
/* Frame choice is STRUCTURAL, not a depth threshold.
 *
 * It was `d >= maxDepth - 1 ? 'leaf' : ...`, written when lanes ran 16 deep.
 * The shipped slice is 4 deep, so that put 268 of 446 beats on `leaf` and 144
 * on `threshold` — 'leaf' is supposed to mean the end of the line, and it was
 * describing the middle of the game.
 *
 * `leaf` now means what it says: every way out of here is terminal, so this is
 * the last place with a decision in it. That is true of a concept whose
 * children have no children, at any depth. */
const isLeafish = (c) => (children.get(c) ?? []).every((k) => !children.has(k));
const frameFor = (c, d) => {
  if (d === 0) return 'arrival';
  if (isLeafish(c)) return 'leaf';
  return d <= 2 ? 'descent' : 'threshold';
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
    frame: frameFor(c, depth[c]),
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
const canTeach = new Set();
for (const b of beats) for (const c of b.choices) canTeach.add(c.to);

/* Which concepts are named in a given concept's definition. crosslinks.json
 * holds [a, b] = "a's gloss contains b's label", which is exactly the relation
 * a key needs: the words you must know to read what something is. */
const glossOf = new Map();
for (const [a, b] of JSON.parse(readFileSync(join(ROOT, 'docs/graph/crosslinks.json'), 'utf8')).e) {
  (glossOf.get(a) ?? glossOf.set(a, []).get(a)).push(b);
}

let gatedCount = 0;
let crossCount = 0;
for (const b of beats) {
  b.pendingGated.forEach((k, n) => {
    /* THE KEY COMES FROM THE DESTINATION'S OWN DEFINITION.
     *
     * This was `teachable[(b.at * 7 + n * 101) % teachable.length]` — a hash.
     * The owner played it and said: "i don't understand why some options are
     * open and some not, like i don't see any logic behind." There was none.
     * `chelation` was locked by `solid` because arithmetic said so.
     *
     * A door is now locked by a word from the definition of what is behind it:
     * you cannot go somewhere until you can read what it IS. That rule is
     * stateable in one sentence, and the player can verify it — the gloss is on
     * screen, so the key is visible in the text that describes the lock.
     *
     * Falls back to the beat's own gloss words, then to leaving the branch
     * ungated. An arbitrary lock is worse than no lock. */
    const key = (glossOf.get(k) ?? []).find((g) => canTeach.has(g) && g !== k)
      ?? (glossOf.get(b.at) ?? []).find((g) => canTeach.has(g) && g !== k);
    if (key === undefined || key === k) {
      // No honest key exists — ship it open rather than invent a reason.
      b.choices.push({
        id: `c${b.at}-alt${n}`, frame: 'continue', label: '', to: k, toLabel: label[k],
        rel: REL_ISA, requires: { concepts: [], rels: [] }, effects: {},
      });
      return;
    }
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

/* Resolve frames into the emitted text, so the engine renders one field and
 * never has to know a frame system exists. Authored prose already set above
 * wins; a frame only ever fills a gap. */
const FRAMES = JSON.parse(readFileSync(join(ROOT, 'docs/graph/frames.json'), 'utf8'));
const fill = (t, slots) => t.replace(/\{(\w+)\}/g, (m, k) => slots[k] ?? m);
let framed = 0;
for (const b of beats) {
  const f = FRAMES[b.frame];
  if (f && !b.body) {
    framed++;
    b.title = b.title || f.title;
    b.body = fill(f.body, { here: b.atLabel });
  }
  for (const c of b.choices) {
    const cf = FRAMES[c.frame];
    if (cf && !c.label) c.label = fill(cf.label, { next: c.toLabel, branch: c.toLabel });
  }
}

const missingFrames = [...new Set([...beats.map((b) => b.frame), ...beats.flatMap((b) => b.choices.map((c) => c.frame))])]
  .filter((f) => !FRAMES[f]);
if (missingFrames.length) {
  console.error(`FAIL  no frame written for: ${missingFrames.join(', ')} — those beats would render blank`);
  process.exit(1);
}
const frames = Object.keys(FRAMES).filter((k) => k !== '_');

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
console.log(`authored prose ...... ${written}`);
console.log(`filled from frames .. ${framed}   (${frames.join(', ')})`);
console.log(`beats with no text .. ${beats.filter((b) => !b.body).length}`);
console.log(`\nwrote ${OUT}`);
