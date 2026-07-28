#!/usr/bin/env node
/* build-lexicon.mjs — the graph's own language.
 *
 * An undiscovered concept does not render as blocks. It renders as a WORD, in
 * the language the graph uses before it has shared a label with you.
 *
 * WHY THIS IS NOT DECORATION
 * --------------------------
 * An opaque identifier with a label bound to it is what an ontology IS.
 * `wn:00015568-n` means nothing until someone attaches "animal" to it. So the
 * invented word is not a cipher over the real word — it is the thing the engine
 * actually holds, and the English label is the annotation. The player reads the
 * graph the way the machine does, and "discovering" a concept is exactly
 * `rdfs:label` binding. That is theory-faithful by construction, not by
 * apology.
 *
 * Blocks say "you do not know this", which is dead text. A word says "this has
 * a name you have not learned", which is alive — and, being stable, becomes
 * recognisable across beats long before it is readable. That recognition is
 * the whole No Man's Sky feeling and it is what ▓▓▓ can never give you.
 *
 * MORPHOLOGY FOLLOWS THE TAXONOMY
 * -------------------------------
 * A concept's word is its PARENT's word plus one syllable. So every descendant
 * of `abstraction` shares its opening, and the player learns the shape of the
 * tree by ear, before they can read any of it — they know two words are kin
 * without knowing what either means. Rendering a hypernym hierarchy as a
 * morphological one is a labelled simplification, not a claim about language.
 *
 * Depth is capped so deep words do not become unpronounceable; past the cap a
 * concept keeps its grandparent's stem and varies only its final syllable.
 *
 * Output: docs/graph/lexicon.json, node id -> word. Deterministic from the
 * shipped ontology, so it is DATA. No prose, no authoring.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONTOLOGY = join(ROOT, 'public/ontology');
const OUT = join(ROOT, 'docs/graph/lexicon.json');

const MAX_SYLLABLES = 4; // beyond this the words stop being sayable

/* Phonology. Chosen to sound like one language and to stay pronounceable to an
 * English reader: no consonant clusters, no q/x/j/w, strict CV or CVC.
 *
 * `c2` (codas) deliberately excludes anything that forms an English word ending
 * that reads as a real word when combined with common onsets. The set is small
 * on purpose — a language with few sounds feels designed rather than random. */
const C1 = ['k', 't', 's', 'v', 'r', 'l', 'm', 'n', 'th', 'sh'];
const V = ['a', 'e', 'i', 'o', 'u', 'ae', 'ei'];
const C2 = ['', '', '', 'n', 'l', 'r', 's', 'th'];

/** One syllable from an integer. Pure, total, and stable across runs. */
function syllable(n) {
  const a = C1[n % C1.length];
  const b = V[Math.floor(n / C1.length) % V.length];
  const c = C2[Math.floor(n / (C1.length * V.length)) % C2.length];
  return a + b + c;
}

// ---- load the shipped concepts and their parents ---------------------------

const index = JSON.parse(readFileSync(join(ONTOLOGY, 'index.json'), 'utf8'));
const label = [];
const parent = [];
for (let c = 0; c < index.chunks; c++) {
  const chunk = JSON.parse(readFileSync(join(ONTOLOGY, `c${String(c).padStart(3, '0')}.json`), 'utf8'));
  label.push(...chunk.l);
  parent.push(...chunk.p);
}

// ---- build words, parents before children ----------------------------------
// The ontology ships breadth-first with every parent at a lower index than its
// child (build-ontology.mjs asserts this), so a single forward pass is enough.

/* Uniqueness matters more than elegance here: two concepts sharing a word are
 * indistinguishable to the player, which breaks the mechanic outright. The
 * syllable alphabet holds 10 x 7 x 8 = 560 sounds, so with 4,096 concepts the
 * final syllable cycles, and truncating the stem past the cap let 36 pairs
 * collide. Extend with further syllables until distinct — measured below, this
 * costs a handful of concepts one extra sound and nothing else. */
const word = [];
const syllablesOf = [];   // kept separately now that words are not hyphenated
const taken = new Set();
for (let i = 0; i < label.length; i++) {
  const p = parent[i];
  const stem = p < 0 ? [] : (syllablesOf[p] ?? []);
  // Past the cap, drop the oldest syllable rather than growing without bound.
  const kept = stem.length >= MAX_SYLLABLES ? stem.slice(1) : stem;
  // Joined, not hyphenated. `ka-ta-na-to` reads as punctuation and looks like a
  // code; `katanato` reads as a word. The inherited stem still shows — every
  // descendant of `kata` starts with it — so kinship survives, which is the
  // only thing the morphology was ever for.
  let w = [...kept, syllable(i)].join('');
  for (let salt = 1; taken.has(w); salt++) w = [...kept, syllable(i), syllable(i * 31 + salt)].join('');
  taken.add(w);
  word[i] = w;
  syllablesOf[i] = [...kept, syllable(i)];
}

// ---- report ----------------------------------------------------------------

const unique = new Set(word);
const collisions = word.length - unique.size;

console.log(`concepts ....... ${word.length}`);
console.log(`distinct words . ${unique.size}`);
console.log(`collisions ..... ${collisions}${collisions ? '   <- two concepts share a word' : ''}`);
console.log('');
console.log('a family — `abstraction` and its descendants share an opening:');
const shown = [];
for (let i = 0; i < label.length && shown.length < 10; i++) {
  const chain = [];
  for (let c = i; c >= 0; c = parent[c]) chain.push(label[c]);
  if (chain.includes('abstraction')) shown.push(i);
}
for (const i of shown) console.log(`  ${word[i].padEnd(22)} ${label[i]}`);

if (collisions) {
  console.error('\nFAIL: word collisions mean two concepts are indistinguishable to the player.');
  process.exit(1);
}

writeFileSync(
  OUT,
  JSON.stringify({
    generatedBy: 'scripts/build-lexicon.mjs',
    note: 'node id -> the graph\'s word for it. Rendered wherever the player has not bound a label.',
    maxSyllables: MAX_SYLLABLES,
    concepts: word.length,
    words: word,
  }) + '\n',
);
console.log(`\nwrote ${OUT}`);
