#!/usr/bin/env node
/* build-crosslinks.mjs — the edges that make a labyrinth.
 *
 * WHY
 * ---
 * You cannot get lost in a tree. Hypernymy is acyclic and strictly oriented:
 * one path from `entity` to anything, and you always know where you stand
 * relative to the root. The owner asked for labyrinths; `is a` alone cannot
 * make one at any size.
 *
 * The obvious answer was WordNet's own cross-relations — `has part`,
 * `has member`, `made of`, `topic`. Measured, they do not work here:
 *
 *     shipped today ...................  136 cross-links, 4.5% of concepts
 *     connectivity-aware re-selection ..  314 cross-links, 9.1%   (2.3x)
 *
 * Meronymy lives DEEP — parts belong to concrete things far down the tree —
 * and the game deliberately sits in the abstract upper reaches (owner,
 * 2026-07-27: "i want weird abstract shit in the story, not wolves"). Those two
 * wants genuinely conflict, and re-selecting for connectivity costs a save
 * reset to buy 9% coverage. Not worth it. See scripts/cross-link-analysis.mjs.
 *
 * WHAT THIS USES INSTEAD
 * ----------------------
 * A GLOSS REFERENCE: concept A's definition contains concept B's label, as a
 * whole word. Measured on exactly the concepts we already ship:
 *
 *     8,162 edges, 94.7% of concepts touched, 2.0 per concept
 *
 * 26x the meronymy count, on the same slice, with NO re-selection — so no
 * renumbering and no save reset.
 *
 * ★ HONESTY, because this game is educational and the glossary wins.
 * This is NOT a WordNet relation and must never be presented as one. It is a
 * derived, game-specific edge, and its claim is narrow and literally checkable:
 * *the definition of A contains the word B*. The player can verify it by
 * reading the gloss, which is shown verbatim. It asserts nothing about
 * hyponymy, meronymy or entailment. Belongs in docs/SIMPLIFICATIONS.md as a
 * labelled game construct before it reaches a player-facing surface.
 *
 * A note on measurement discipline: a first pass using plain substring matching
 * reported 13,052 edges. It was wrong — `abstraction -> acting` was matching
 * inside "extr(acting)" and `entity -> living` inside "nonliving". Word
 * boundaries cut it to 8,162. The inflated figure was nearly reported.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONTOLOGY = join(ROOT, 'public/ontology');
const OUT = join(ROOT, 'docs/graph/crosslinks.json');

const MIN_LABEL = 4;   // shorter labels are almost all function words
const HUB_CAP = 60;    // a concept named in more glosses than this is not informative

const index = JSON.parse(readFileSync(join(ONTOLOGY, 'index.json'), 'utf8'));
const label = [];
const gloss = [];
const parent = [];
for (let c = 0; c < index.chunks; c++) {
  const chunk = JSON.parse(readFileSync(join(ONTOLOGY, `c${String(c).padStart(3, '0')}.json`), 'utf8'));
  label.push(...chunk.l);
  gloss.push(...chunk.g);
  parent.push(...chunk.p);
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const candidates = label
  .map((l, i) => [l, i])
  .filter(([l]) => l.length >= MIN_LABEL)
  .map(([l, i]) => [i, new RegExp(`\\b${esc(l.toLowerCase())}\\b`)]);

// An ancestor is not a cross-link — the tree already says it. Excluding them is
// what keeps these edges SIDEWAYS, which is the entire point.
const ancestors = (i) => {
  const out = new Set();
  for (let c = parent[i]; c >= 0; c = parent[c]) out.add(c);
  return out;
};

const raw = [];
for (let i = 0; i < label.length; i++) {
  const g = (gloss[i] ?? '').toLowerCase();
  if (!g) continue;
  const up = ancestors(i);
  for (const [j, re] of candidates) {
    if (j === i || up.has(j)) continue;
    if (re.test(g)) raw.push([i, j]);
  }
}

// Drop hubs: a concept named in hundreds of glosses ("number", "there",
// "people") connects everything to everything, which is the opposite of a maze.
const inbound = new Map();
for (const [, j] of raw) inbound.set(j, (inbound.get(j) ?? 0) + 1);
const edges = raw.filter(([, j]) => (inbound.get(j) ?? 0) <= HUB_CAP);

const dropped = raw.length - edges.length;
const touched = new Set(edges.flat());
const hubs = [...inbound.entries()].filter(([, n]) => n > HUB_CAP).sort((a, b) => b[1] - a[1]);

console.log(`raw gloss references .. ${raw.length}`);
console.log(`dropped as hubs ....... ${dropped}  (named in more than ${HUB_CAP} glosses)`);
console.log(`kept .................. ${edges.length}`);
console.log(`concepts touched ...... ${touched.size} (${((100 * touched.size) / label.length).toFixed(1)}%)`);
console.log(`density ............... ${(edges.length / label.length).toFixed(2)} per concept`);
console.log(`\nhubs excluded: ${hubs.slice(0, 12).map(([j, n]) => `${label[j]}(${n})`).join(' ')}`);
console.log('\nsample edges kept:');
for (const [i, j] of edges.slice(0, 10)) console.log(`  ${label[i].padEnd(26)} names  ${label[j]}`);

writeFileSync(
  OUT,
  JSON.stringify({
    generatedBy: 'scripts/build-crosslinks.mjs',
    relation: 'named in definition',
    claim: 'The definition of A contains the word B. Verifiable by reading the gloss, which is shown verbatim. NOT a WordNet relation; asserts nothing about hyponymy, meronymy or entailment.',
    minLabel: MIN_LABEL,
    hubCap: HUB_CAP,
    counts: { raw: raw.length, kept: edges.length, touched: touched.size },
    e: edges,
  }) + '\n',
);
console.log(`\nwrote ${OUT}`);
