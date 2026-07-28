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

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONTOLOGY = join(ROOT, 'public/ontology');
const OUT = join(ROOT, 'public/story');

/* NO CAP ON CHILDREN.
 *
 * These were 3 and 3. Measured from the seed: 397 of 446 places were
 * ORPHANED - unreachable by any route, with or without keys - because a beat
 * exposed at most six of its children and every subtree under the rest
 * vanished. `object` has 72 children and offered six.
 *
 * A generator must not decide what the player can never see. Every child is
 * emitted; how many are DRAWN at once is the renderer's call, and it should
 * key off what the player can read - the graph revealing itself as vocabulary
 * grows is the progression, not a pruning constant in a build script. */
const UNGATED_CHILDREN = Infinity;
const GATED_CHILDREN = 0;     // gating is applied below, per child, from the gloss
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
  /* THE WAY BACK UP.
   *
   * Every exit used to go DOWN to a child, which was invisible while the
   * player started at `entity` and could only descend. The owner moved the
   * start mid-graph ("not necessarily entity"), and measuring it showed 35 of
   * 4,096 concepts reachable from the seed: from depth 3 in a 4-deep tree,
   * descending hits leaves almost immediately and there was no other move.
   *
   * A parent exit is ungated and always present. It is the same hypernym edge
   * read the other way — generalisation rather than specialisation — so it
   * costs no new relation, and with no UI to fall back on it is the only thing
   * that makes a dead end recoverable. */
  if (parent[c] >= 0) {
    choices.push({
      id: `c${c}-up`,
      frame: 'ascend',
      label: '',
      to: parent[c],
      toLabel: label[parent[c]],
      rel: REL_ISA,
      requires: { concepts: [], rels: [] },
      effects: {},
    });
  }
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
    pendingGated: [],
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
/* What a key may be drawn from: destinations that are UNGATED BY CONSTRUCTION,
 * not merely ungated right now.
 *
 * This was every choice destination, computed before gating ran — so keys
 * pointed at children that gating then locked, and check-story.mjs went red
 * with 376 unobtainable keys. The dependency is circular: what is teachable
 * depends on what is gated, which depends on what is teachable.
 *
 * Broken by fixing the free set in advance. Every beat keeps its first child
 * open and every beat below the root has an ungated parent exit, so those two
 * are guaranteed reachable without any key at all. */
const canTeach = new Set();
for (const b of beats) {
  const kids = b.choices.filter((c) => c.frame === 'continue');
  if (kids.length) canTeach.add(kids[0].to);
  for (const c of b.choices) if (c.frame === 'ascend') canTeach.add(c.to);
}

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
  /* GATE EACH CHILD FROM THE DESTINATION'S OWN DEFINITION.
   *
   * Applied per child rather than by slicing the list, because slicing is what
   * orphaned 397 of 446 places. A child is locked by a word from the gloss of
   * what it IS — the rule the owner can state and verify, since the gloss is on
   * screen. A child with no honest key stays open: an arbitrary lock is worse
   * than no lock.
   *
   * At least one child is always left open, and every beat below the root also
   * carries an ungated parent exit, so the no-dead-end invariant holds twice
   * over. */
  const kidChoices = b.choices.filter((c) => c.frame === 'continue');
  kidChoices.forEach((c, i) => {
    if (i === 0) return;                    // always one free way down
    const key = (glossOf.get(c.to) ?? []).find((g) => canTeach.has(g) && g !== c.to);
    if (key === undefined) return;
    gatedCount++;
    c.frame = 'branch';
    c.requires = { concepts: [key], rels: [] };
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
/* FRAMES ARE SHIPPED, NOT PRE-RENDERED.
 *
 * These were filled in here so the engine would render one field and never
 * need to know a frame system exists. That cost 857K for 446 beats: 4,716
 * choices each carrying its own copy of "Follow X down", which is one template
 * and one word.
 *
 * The frames go in the manifest instead and the renderer fills them. A beat or
 * choice carries text ONLY where it is authored; everything else carries a
 * frame id and the label to drop in. */
/* COMPACT THE EMITTED SHAPE.
 *
 * 4,716 choices were each carrying an empty label, an empty effects object, a
 * requires with two empty arrays, rel 0, and a `toLabel` the engine can read
 * out of the ontology it already has. Defaults are omitted and the label is
 * looked up, which is the difference between a 626K payload and a phone.
 *
 * Read as: absent `q` means ungated, absent `r` means rel 0, absent `t` means
 * use the frame. */
let framed = 0;
for (const b of beats) {
  if (!b.body) framed++;
  b.choices = b.choices.map((c) => {
    // toLabel stays. Dropping it saved ~60K and cost a whole class of bug: a
    // choice with no written label had nothing to render, so `c1-on5` came out
    // a blank button. The renderer needs a word here even when the frame
    // supplies the sentence around it.
    const out = { i: c.id, f: c.frame, to: c.to, l: c.toLabel };
    if (c.rel) out.r = c.rel;
    if (c.label) out.t = c.label;
    const q = {};
    if (c.requires.concepts.length) q.c = c.requires.concepts;
    if (c.requires.rels.length) q.r = c.requires.rels;
    if (q.c || q.r) out.q = q;
    return out;
  });
  if (!b.title) delete b.title;
  if (!b.body) delete b.body;
}

const missingFrames = [...new Set([...beats.map((b) => b.frame), ...beats.flatMap((b) => b.choices.map((c) => c.f ?? c.frame))])]
  .filter((f) => !FRAMES[f]);
if (missingFrames.length) {
  console.error(`FAIL  no frame written for: ${missingFrames.join(', ')} — those beats would render blank`);
  process.exit(1);
}
const frames = Object.keys(FRAMES).filter((k) => k !== '_');

/* CHUNKED, AND ALIGNED TO THE ONTOLOGY CHUNKS.
 *
 * One file was 880K. That is a phone downloading the entire story graph to
 * render one beat, on a project whose stated budget is a mobile browser.
 *
 * Chunk N holds the beats for node ids in the same range as ontology chunk N,
 * so a beat and the concepts it names arrive in the same fetch and the engine
 * needs no second index to know which file to ask for.
 *
 * It also moves from docs/ to public/. docs/ is NOT SERVED — nothing could
 * fetch story.json at runtime, so any surface using it was either bundling
 * 880K into the JS or not reading it at all. */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* Only non-empty chunks are written. Aligning to the ontology's 1024-id chunks
 * put all 446 beats in chunk 0 and produced three empty files, because a beat
 * exists only for a concept WITH CHILDREN and those cluster at the top of the
 * breadth-first order. Three empty files pretending to be a chunking scheme is
 * worse than one honest file. If the shipped selection ever spreads places
 * across the id range this starts distributing on its own. */
const CHUNK = index.chunkSize;
const sizes = [];
const manifest = [];
for (let n = 0; n * CHUNK < label.length; n++) {
  const slice = beats.filter((b) => Math.floor(b.at / CHUNK) === n);
  if (!slice.length) continue;
  const name = `s${String(n).padStart(3, '0')}.json`;
  const body = JSON.stringify({ from: n * CHUNK, to: (n + 1) * CHUNK - 1, beats: slice }) + '\n';
  writeFileSync(join(OUT, name), body);
  manifest.push(name);
  sizes.push([name, slice.length, body.length]);
}

writeFileSync(
  join(OUT, 'index.json'),
  JSON.stringify({
    generatedBy: 'scripts/build-story.mjs',
    relNamed: REL_NAMED,
    chunkSize: CHUNK,
    chunks: manifest,
    counts: { beats: beats.length, gated: gatedCount, sideways: crossCount, withProse: written },
    // The renderer fills {here} / {next} / {branch} from the beat's atLabel and
    // the choice's toLabel. Authored text, where present, wins over the frame.
    frames: FRAMES,
  }) + '\n',
);

console.log(`beats ............... ${beats.length}   (one per concept with children)`);
console.log(`gated branches ...... ${gatedCount}`);
console.log(`sideways routes ..... ${crossCount}   (rel ${REL_NAMED}, the labyrinth)`);
console.log(`authored prose ...... ${written}`);
console.log(`filled from frames .. ${framed}   (${frames.join(', ')})`);
console.log(`beats with no text .. ${beats.filter((b) => !b.body).length}`);
sizes.forEach(([name, n, bytes]) => console.log(`  ${name}  ${String(n).padStart(4)} beats  ${(bytes / 1024).toFixed(0)}K`));
console.log(`\nwrote ${OUT}/ (${manifest.length} chunk + index.json)`);
