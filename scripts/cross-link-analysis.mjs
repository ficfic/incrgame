#!/usr/bin/env node
/* cross-link-analysis.mjs — can this taxonomy be made into a labyrinth?
 *
 * THE PROBLEM
 * -----------
 * You cannot get lost in a tree. Hypernymy is acyclic and strictly oriented:
 * there is exactly one path from `entity` to anything, and you always know
 * where you are relative to the root. The owner asked for labyrinths, and a
 * pure `is a` graph cannot produce one at any size.
 *
 * The maze lives in the OTHER relations — `has part`, `has member`, `made of`,
 * `topic`. Those cross the hierarchy sideways: a part belongs to a whole that
 * sits nowhere near it in the tree, so they create loops, alternate routes, and
 * the experience of arriving somewhere from an unexpected direction.
 *
 * Measured 2026-07-27 on what we ship: 123 cross-links against 10,885 in the
 * source. We keep 1.1% of the thing that makes the maze.
 *
 * WHY SO FEW
 * ----------
 * A cross-link survives only if BOTH endpoints are in the shipped selection,
 * and the selection is breadth-first from `entity`. Parts and substances belong
 * to concrete things further down the tree, so a slice of the top keeps almost
 * none of them. This is not a budget problem — it is a selection problem, and
 * a bigger breadth-first budget would barely help.
 *
 * WHAT THIS SCRIPT ANSWERS
 * ------------------------
 * For the same concept budget, how many cross-links does a CONNECTIVITY-AWARE
 * selection preserve, and how many concepts end up on a cycle — i.e. genuinely
 * in a maze rather than on a branch?
 *
 * It writes nothing. It is a measurement to decide whether the re-selection is
 * worth the save reset it costs.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const YAML_DIR = join(ROOT, '.ontology-src/src/yaml');
const BUDGET = 4096;          // same budget build-ontology.mjs ships
const CROSS = { mero_part: 'has part', mero_member: 'has member', mero_substance: 'made of', domain_topic: 'topic' };

const syn = new Map();
for (const f of readdirSync(YAML_DIR).filter((f) => /^noun\..*\.yaml$/.test(f)).sort()) {
  const lex = basename(f, '.yaml');
  for (const [id, s] of Object.entries(parse(readFileSync(join(YAML_DIR, f), 'utf8')))) {
    const cross = [];
    for (const [k, name] of Object.entries(CROSS)) for (const t of s[k] ?? []) cross.push([t, name]);
    syn.set(id, { lex, members: s.members ?? [], hypernyms: s.hypernym ?? [], cross });
  }
}
const label = (id) => syn.get(id)?.members[0] ?? id;

const kids = new Map();
for (const [id, s] of syn) for (const h of s.hypernyms) if (syn.has(h)) (kids.get(h) ?? kids.set(h, []).get(h)).push(id);
for (const k of kids.values()) k.sort((a, b) => (label(a) < label(b) ? -1 : 1));

const root = [...syn].find(([, s]) => s.lex === 'noun.Tops' && s.members[0] === 'entity' && !s.hypernyms.length)[0];

/** Breadth-first from the root — exactly what build-ontology.mjs ships today. */
function breadthFirst(budget) {
  const out = [root];
  const seen = new Set([root]);
  for (let i = 0; i < out.length && out.length < budget; i++) {
    for (const k of kids.get(out[i]) ?? []) {
      if (seen.has(k) || out.length >= budget) continue;
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

/** Connectivity-aware: keep the tree connected, but prefer concepts that carry
 *  cross-links to something already kept. A concept whose parent is in and
 *  which closes a cross-link is worth more than an arbitrary sibling.
 *
 *  Greedy and single-pass on purpose — this is a feasibility measurement, not
 *  the production selector. If the numbers justify it, the real one goes in
 *  build-ontology.mjs where the offensive/duplicate filters already live. */
function connectivityFirst(budget) {
  const kept = [root];
  const inSet = new Set([root]);
  // frontier = anything whose parent is already kept
  let frontier = [...(kids.get(root) ?? [])];
  while (kept.length < budget && frontier.length) {
    // score = cross-links this concept would CLOSE against the current set,
    // plus a small bonus for cross-links it opens toward the frontier
    let bestI = 0;
    let bestScore = -1;
    for (let i = 0; i < frontier.length; i++) {
      const s = syn.get(frontier[i]);
      let score = 0;
      for (const [t] of s.cross) if (inSet.has(t)) score += 2;
      for (const [t] of s.cross) if (syn.has(t)) score += 1;
      if (score > bestScore) { bestScore = score; bestI = i; }
      if (bestScore > 0 && i > 400) break; // cap the scan; greedy enough
    }
    const pick = frontier.splice(bestI, 1)[0];
    if (inSet.has(pick)) continue;
    inSet.add(pick);
    kept.push(pick);
    for (const k of kids.get(pick) ?? []) if (!inSet.has(k)) frontier.push(k);
  }
  return kept;
}

function report(name, order) {
  const set = new Set(order);
  let links = 0;
  const deg = new Map();
  for (const id of order) {
    for (const [t] of syn.get(id).cross) {
      if (!set.has(t)) continue;
      links++;
      deg.set(id, (deg.get(id) ?? 0) + 1);
      deg.set(t, (deg.get(t) ?? 0) + 1);
    }
  }
  const touched = deg.size;
  console.log(
    `${name.padEnd(22)} concepts ${String(order.length).padStart(5)}   ` +
      `cross-links ${String(links).padStart(5)}   ` +
      `concepts on a cross-link ${String(touched).padStart(5)} (${((100 * touched) / order.length).toFixed(1)}%)`,
  );
  return { links, touched };
}

console.log(`source: ${syn.size} noun synsets\n`);
const bf = report('breadth-first (today)', breadthFirst(BUDGET));
const cf = report('connectivity-aware', connectivityFirst(BUDGET));

console.log(`\ncross-links preserved: ${bf.links} -> ${cf.links}  (${(cf.links / Math.max(bf.links, 1)).toFixed(1)}x)`);
console.log(`concepts in the maze:  ${bf.touched} -> ${cf.touched}`);

const sample = connectivityFirst(BUDGET).slice(0, 4096);
const set = new Set(sample);
console.log('\nsample cross-links a connectivity-aware slice would keep:');
let shown = 0;
for (const id of sample) {
  for (const [t, rel] of syn.get(id).cross) {
    if (!set.has(t) || shown >= 12) continue;
    console.log(`  ${label(id)} --${rel}-> ${label(t)}`);
    shown++;
  }
  if (shown >= 12) break;
}
