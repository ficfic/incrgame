// Content pipeline: Open English WordNet -> the game's ground truth.
//
// Emits STRUCTURED DATA ONLY (labels, categories, is-a parents, and definitions
// quoted verbatim from the source dataset). It never writes a sentence of its
// own — player-facing prose is owner-written (CLAUDE.md).
//
// Source: Open English WordNet, CC BY 4.0, derived from Princeton WordNet.
// See docs/ATTRIBUTION.md. Run: npm run ontology
//
// WHAT THIS DATA IS FOR (docs/VISION.md): it is the game's GROUND TRUTH, not
// its content. Machine-generated knowledge in this game can be wrong; drift is
// only legible because a real, correct definition exists to drift away from.
// That job needs a few thousand good concepts, not a whole lexicon.
//
// SELECTION (deliberate, see docs/DECISIONS.md):
//   - nouns only, and only those reachable from `entity` — one true root, so
//     the hierarchy claim we make is actually true, and no alphabetical
//     adjective tail.
//   - offensive senses excluded: WordNet documents the language as it is,
//     including slurs. This game renders concepts as rewards, so they are cut.
//     Filtering is on the lexicographers' own gloss markers, not on the word,
//     so innocuous senses of the same string survive.
//   - one concept per label, first in recovery order wins: a synset is a set of
//     synonyms and many share a first word form. Two identical-looking cards
//     read as a bug, not as polysemy.
//   - capped at CONCEPT_BUDGET, breadth-first, so what ships is the top of the
//     real hierarchy rather than an arbitrary slice.
//
// The output ordering is a FROZEN CONTRACT once shipped: a save stores integer
// node ids, and id N means "the Nth concept in recovery order". Changing the
// edition or the selection renumbers the world. That is a deliberate, logged,
// migration-bearing decision.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_REPO = 'https://github.com/globalwordnet/english-wordnet.git';
const SRC_REF = '2025-edition'; // PINNED. Changing this renumbers the world.
const SRC_COMMIT = 'dc343f2683279ecbb13fab4e2fd778d7b162d287'; // must match SRC_REF
const CACHE = join(ROOT, '.ontology-src');
const OUT = join(ROOT, 'public/ontology');

const CONCEPT_BUDGET = 4096; // ground truth, not a lexicon dump
const CHUNK = 1024;
const SEED_LABEL = 'entity'; // WordNet's unique beginner: root of the noun hierarchy

/** WordNet's lexicographers mark offensive senses in the gloss itself, which
 *  makes a marker-based filter high-precision: `chink` "a short light metallic
 *  sound" survives, the slur sense does not. */
const OFFENSIVE = /\b(ethnic slur|racial slur|slur|disparaging|derogatory|pejorative|offensive term|term of disparagement)\b/i;

/** Backstop, matched on the WORD FORM.
 *
 *  The gloss filter above is nearly inert — it rejected 2 synsets out of ~4,500
 *  traversed — because upstream carries no machine-readable pejorative marker
 *  and a slur's gloss can read perfectly neutrally. `Abo` shipped at recovery
 *  index 996 with the gloss "a dark-skinned member of a race of people living
 *  in Australia when Europeans arrived", as a collectible reward card, on a
 *  public site. The filter that let it through cannot also be the evidence that
 *  filtering works — see the non-circular assertion in test/ontology.test.ts.
 *
 *  Two groups, both deliberate and both reversible by editing this list:
 *   1. slurs whose gloss the source does not mark;
 *   2. the 19th-century racial-taxonomy cluster. These are real WordNet entries
 *      with descriptive glosses and quoting them is not a licence problem — but
 *      this game frames concepts as ground truth being RECOVERED, and handing a
 *      player "master race" as a reward reads as endorsement. */
const DENY_LABELS = new Set([
  'Abo', 'gypsy', 'Gypsy',
  'Amerindian race', 'Black race', 'Mongolian race', 'White race', 'Caucasian race',
  'Negroid race', 'Mongoloid race', 'Australoid race', 'master race',
]);

const log = (...a) => console.log('[ontology]', ...a);

// ---- 1. fetch the pinned source ------------------------------------------

function fetchSource() {
  if (existsSync(join(CACHE, 'src/yaml'))) {
    const head = execFileSync('git', ['-C', CACHE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    // A stale cache would silently renumber the world under a manifest that
    // claims the pinned edition — the exact failure the pin exists to prevent.
    if (head !== SRC_COMMIT) {
      throw new Error(`cached source is at ${head}, expected ${SRC_COMMIT} — delete ${CACHE} and re-run`);
    }
    log('using verified cache at', CACHE);
    return head;
  }
  rmSync(CACHE, { recursive: true, force: true });
  log('cloning', SRC_REPO, 'at', SRC_REF, '(~45 MB of YAML, sparse)');
  execFileSync('git', [
    'clone', '--depth', '1', '--branch', SRC_REF,
    '--filter=blob:none', '--sparse', SRC_REPO, CACHE,
  ], { stdio: 'inherit' });
  execFileSync('git', ['-C', CACHE, 'sparse-checkout', 'set', 'src/yaml'], { stdio: 'inherit' });
  const head = execFileSync('git', ['-C', CACHE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (head !== SRC_COMMIT) throw new Error(`upstream ${SRC_REF} resolved to ${head}, expected ${SRC_COMMIT}`);
  return head;
}

// ---- 2. parse the noun lexicographer files --------------------------------

function loadSynsets() {
  const dir = join(CACHE, 'src/yaml');
  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml') && /^noun\./.test(f)).sort();
  const synsets = new Map();
  for (const f of files) {
    const lex = basename(f, '.yaml');
    const data = parse(readFileSync(join(dir, f), 'utf8'));
    for (const [id, s] of Object.entries(data)) {
      synsets.set(id, {
        lex,
        members: s.members ?? [],
        def: (s.definition ?? [''])[0] ?? '',
        hypernyms: s.hypernym ?? [],
      });
    }
  }
  log(`parsed ${synsets.size} noun synsets across ${files.length} categories`);
  return synsets;
}

// ---- 3. the recovery order ------------------------------------------------

/** Breadth-first from `entity`, so the world comes back general-before-specific
 *  in the hierarchy's own order. Ties break on (label, synset id) so the order
 *  is reproducible from the pinned source.
 *
 *  Rejected concepts are skipped THROUGH, not dropped: a child of a rejected
 *  node re-parents to its grandparent, so what ships stays a connected tree
 *  rooted at `entity` with no dangling parents. */
function recoveryOrder(synsets) {
  const children = new Map();
  for (const [id, s] of synsets) {
    for (const h of s.hypernyms) {
      if (!synsets.has(h)) continue;
      if (!children.has(h)) children.set(h, []);
      children.get(h).push(id);
    }
  }
  const label = (id) => synsets.get(id).members[0] ?? id;
  const byLabel = (a, b) => (label(a) < label(b) ? -1 : label(a) > label(b) ? 1 : a < b ? -1 : 1);
  for (const kids of children.values()) kids.sort(byLabel);

  const seedId = [...synsets].find(
    ([, s]) => s.lex === 'noun.Tops' && s.members[0] === SEED_LABEL && s.hypernyms.length === 0,
  )?.[0];
  if (!seedId) throw new Error(`seed concept "${SEED_LABEL}" not found — source layout changed`);

  const kept = [];          // accepted synset ids, in recovery order
  const parentOf = new Map(); // accepted id -> accepted parent id (null for the seed)
  const takenLabels = new Set();
  const rejected = { offensive: 0, duplicate: 0, unnamed: 0 };

  // `carrier` is the nearest ACCEPTED ancestor — what a child re-parents to
  // when its own parent was rejected.
  const queue = [{ id: seedId, carrier: null }];
  const seen = new Set([seedId]);
  for (let i = 0; i < queue.length && kept.length < CONCEPT_BUDGET; i++) {
    const { id, carrier } = queue[i];
    const s = synsets.get(id);
    const name = s.members[0];
    let accept = true;
    if (!name) { rejected.unnamed++; accept = false; }
    else if (OFFENSIVE.test(s.def) || DENY_LABELS.has(name)) { rejected.offensive++; accept = false; }
    else if (takenLabels.has(name)) { rejected.duplicate++; accept = false; }

    let nextCarrier = carrier;
    if (accept) {
      takenLabels.add(name);
      parentOf.set(id, carrier);
      kept.push(id);
      nextCarrier = id;
    }
    for (const kid of children.get(id) ?? []) {
      if (seen.has(kid)) continue;
      seen.add(kid);
      queue.push({ id: kid, carrier: nextCarrier });
    }
  }

  log(`kept ${kept.length} concepts; rejected ${rejected.offensive} offensive, ` +
      `${rejected.duplicate} duplicate-label, ${rejected.unnamed} unnamed`);
  return { order: kept, parentOf };
}

// ---- 4. emit -------------------------------------------------------------

function main() {
  const sha = fetchSource();
  const synsets = loadSynsets();
  const { order, parentOf } = recoveryOrder(synsets);

  const index = new Map(order.map((id, i) => [id, i]));
  const catNames = [...new Set(order.map((id) => synsets.get(id).lex))].sort();
  const catIndex = new Map(catNames.map((n, i) => [n, i]));

  // Sanity: the shipped set must be a single tree rooted at the seed, with
  // every parent already recovered. The recovery premise depends on it.
  order.forEach((id, i) => {
    const par = parentOf.get(id);
    if (i === 0 && par !== null) throw new Error('seed has a parent');
    if (i > 0 && (par === null || index.get(par) >= i)) {
      throw new Error(`concept ${i} (${synsets.get(id).members[0]}) has no earlier parent`);
    }
  });

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const chunkCount = Math.ceil(order.length / CHUNK);
  for (let c = 0; c < chunkCount; c++) {
    const slice = order.slice(c * CHUNK, (c + 1) * CHUNK);
    writeFileSync(join(OUT, `c${String(c).padStart(3, '0')}.json`), JSON.stringify({
      // `l` label · `d` category index · `p` parent concept index (-1 = root)
      // · `g` definition, verbatim from the source dataset.
      l: slice.map((id) => synsets.get(id).members[0]),
      d: slice.map((id) => catIndex.get(synsets.get(id).lex)),
      p: slice.map((id) => { const par = parentOf.get(id); return par == null ? -1 : index.get(par); }),
      g: slice.map((id) => synsets.get(id).def),
    }));
  }

  // CC BY 4.0 §3(a)(1) travels with the DATA, not just the docs: the deployed
  // site serves public/ and never docs/, so the notice ships here too.
  //
  // The upstream notice is EMBEDDED VERBATIM from a vendored copy rather than
  // retyped. Its own terms require "the same" notice on all copies of the
  // database, and a notice from a different WordNet release is not the same
  // notice — we shipped the 3.0/2006 text once by retyping it from memory.
  const upstreamNotice = readFileSync(join(ROOT, 'third_party/wordnet/WNDB_License.txt'), 'utf8');
  writeFileSync(join(OUT, 'LICENSE.txt'), [
    'Concept data in this directory is derived from Open English WordNet.',
    '',
    `Source:  Open English WordNet, ${SRC_REF} (commit ${sha})`,
    '         https://en-word.net/ · https://github.com/globalwordnet/english-wordnet',
    'Licence: Creative Commons Attribution 4.0 International (CC BY 4.0)',
    '         https://creativecommons.org/licenses/by/4.0/',
    '',
    // Keep "Princeton WordNet" on ONE line: a CI check and a test both grep for
    // it, and a line-wrap once made the notice look compliant while failing.
    'Attribution is owed to BOTH the Open English WordNet team and',
    'Princeton WordNet, from which Open English WordNet is derived.',
    '',
    'CHANGES MADE (CC BY 4.0 s3(a)(1)(B)):',
    '  - Selected a subset: nouns reachable from the concept "entity", capped',
    `    at ${CONCEPT_BUDGET} concepts, one concept per word form.`,
    '  - Excluded senses the source marks as slurs or disparaging.',
    '  - Reordered breadth-first from "entity"; re-parented concepts whose own',
    '    parent was not selected to their nearest selected ancestor.',
    '  - Reserialised as JSON. Definitions are copied VERBATIM and are not',
    '    edited, rewritten, summarised or machine-generated.',
    '',
    '=====================================================================',
    'UPSTREAM NOTICE, REPRODUCED VERBATIM (WNDB_License.txt @ ' + sha.slice(0, 12) + ')',
    '=====================================================================',
    '',
    upstreamNotice.trimEnd(),
    '',
  ].join('\n'));

  writeFileSync(join(OUT, 'index.json'), JSON.stringify({
    source: 'Open English WordNet',
    edition: SRC_REF,
    commit: sha,
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    homepage: 'https://en-word.net/',
    attribution:
      'Open English WordNet 2025 (CC BY 4.0), derived from Princeton WordNet. ' +
      'Subset selected, filtered and reordered; definitions verbatim. See ontology/LICENSE.txt.',
    noticeUrl: 'ontology/LICENSE.txt',
    concepts: order.length,
    chunkSize: CHUNK,
    chunks: chunkCount,
    categories: catNames,
  }, null, 2));

  log(`wrote ${chunkCount} chunks + index.json + LICENSE.txt`);
  log(`concepts: ${order.length}, categories: ${catNames.length}, seed: ${synsets.get(order[0]).members[0]}`);
}

main();
