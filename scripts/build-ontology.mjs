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
import { scoreRarity, tierOf, TIERS, WEIGHTS } from './rarity.mjs';

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

/** WordNet relation key → our REL index (see src/core/types.ts REL_NAMES).
 *
 *  DIRECTIONS VERIFIED AGAINST THE SOURCE, not guessed. Every `mero_*` key sits
 *  on the WHOLE and lists the PART, which is the opposite of what the name
 *  suggests: `organism mero_part cell` means "organism HAS PART cell". Reading
 *  these as part-of would have drawn every part-whole arrow backwards and
 *  taught it as fact, in a game whose whole premise is not teaching falsehoods.
 *
 *  DELIBERATELY ABSENT:
 *   - `exemplifies` — a USAGE REGISTER ("this word is used figuratively / in
 *     the plural"), not a relation between concepts. `cakewalk exemplifies
 *     trope` is not "cakewalk is an instance of trope"; shipping it as an edge
 *     would be a flat falsehood. It belongs on a card as a tag, not on a line.
 *   - `attribute` — its targets are ADJECTIVE synsets (ids ending `-a`) and we
 *     ship nouns only, so all 312 of them dangle into concepts that do not
 *     exist here.
 *   - `instance_hypernym` — occurs ZERO times in this edition. OEWN split
 *     proper nouns into a separate resource, so this dataset contains no named
 *     individuals at all. (Consequence worth knowing: there is no real ABox
 *     here, and SIMPLIFICATIONS S2 understates that.)
 */
const REL_KEYS = {
  mero_part: 1,       // whole → part      : "has part"
  mero_member: 2,     // group → member    : "has member"
  mero_substance: 3,  // whole → substance : "made of"
  domain_topic: 4,    // term  → field     : "studied in"
};

// ---- 2. parse the noun lexicographer files --------------------------------

function loadSynsets() {
  const dir = join(CACHE, 'src/yaml');
  const files = readdirSync(dir).filter((f) => f.endsWith('.yaml') && /^noun\./.test(f)).sort();
  const synsets = new Map();
  for (const f of files) {
    const lex = basename(f, '.yaml');
    const data = parse(readFileSync(join(dir, f), 'utf8'));
    for (const [id, s] of Object.entries(data)) {
      const rels = {};
      for (const [key, rel] of Object.entries(REL_KEYS)) {
        if (s[key]) rels[rel] = s[key];
      }
      synsets.set(id, {
        lex,
        members: s.members ?? [],
        def: (s.definition ?? [''])[0] ?? '',
        hypernyms: s.hypernym ?? [],
        rels,
      });
    }
  }
  log(`parsed ${synsets.size} noun synsets across ${files.length} categories`);
  return synsets;
}

// ---- 2b. the lemma index (the only frequency signal in the source) --------

/** label → { senses: [synsetId, ...] } for nouns, in WordNet's own order.
 *
 *  WordNet orders a word's senses by frequency in the tagged corpus, so a
 *  synset's POSITION in this list is real evidence about how commonly the word
 *  means that. It is the only such evidence the source carries — there are no
 *  occurrence counts anywhere in the YAML — and scripts/rarity.mjs says so. */
function loadLemmas() {
  const dir = join(CACHE, 'src/yaml');
  const files = readdirSync(dir).filter((f) => /^entries-.*\.yaml$/.test(f)).sort();
  const lemmas = new Map();
  for (const f of files) {
    const data = parse(readFileSync(join(dir, f), 'utf8'));
    for (const [word, byPos] of Object.entries(data)) {
      const noun = byPos?.n;
      if (!noun?.sense) continue;
      lemmas.set(word, noun.sense.map((s) => s.synset));
    }
  }
  log(`indexed ${lemmas.size} noun lemmas across ${files.length} entry files`);
  return lemmas;
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

// ---- 3b. rate every concept -----------------------------------------------

/** Gather the seven signals for every shipped concept and score them.
 *
 *  ⚠️ MEASURED AGAINST THE FULL NOUN LEXICON, NOT THE SHIPPED SLICE — and the
 *  first version did the opposite, on the reasoning that a score should
 *  describe the dataset the game actually has. The generated report killed that
 *  argument in one read: the shipped slice is breadth-first, so its last ~2,000
 *  concepts are ALL leaves at depth 5, and `pie chart`, `Laffer curve` and
 *  `undirected graph` scored identically. Against the whole lexicon `bird` has
 *  871 descendants and `pie chart` has none, and depth spans 0..16 instead of
 *  0..5. Rarity is a property of a concept's place in the LANGUAGE; the 4,096
 *  cut is our arbitrary horizon, and measuring against it measured the cut. */
function rateRarity(order, synsets, parentOf, index, rels, lemmas) {
  // Full-lexicon structure, computed once over all ~72,000 noun synsets.
  const kids = new Map();
  for (const [id, s] of synsets) {
    for (const h of s.hypernyms) {
      if (!synsets.has(h)) continue;
      if (!kids.has(h)) kids.set(h, []);
      kids.get(h).push(id);
    }
  }
  const rootId = order[0];

  // Depth by BFS from `entity`. A synset may have several hypernyms, so this is
  // the SHORTEST path to the root — the most generous reading of how general a
  // concept is, which is the conservative choice for a rarity score.
  const depthOf = new Map([[rootId, 0]]);
  for (let frontier = [rootId]; frontier.length > 0; ) {
    const next = [];
    for (const id of frontier) {
      for (const kid of kids.get(id) ?? []) {
        if (depthOf.has(kid)) continue;
        depthOf.set(kid, depthOf.get(id) + 1);
        next.push(kid);
      }
    }
    frontier = next;
  }

  // Subtree size, iteratively. The hierarchy is 16 deep and 72,000 wide;
  // recursion here would be fine today and is a stack overflow waiting for a
  // future edition, so it is a post-order walk with an explicit stack.
  const sizeOf = new Map();
  for (const start of synsets.keys()) {
    if (sizeOf.has(start)) continue;
    const stack = [[start, false]];
    while (stack.length > 0) {
      const frame = stack.pop();
      const [id, expanded] = frame;
      if (sizeOf.has(id) && !expanded) continue;
      if (!expanded) {
        sizeOf.set(id, 0); // cycle guard: a re-entry sees 0 rather than looping
        stack.push([id, true]);
        for (const kid of kids.get(id) ?? []) if (!sizeOf.has(kid)) stack.push([kid, false]);
      } else {
        let total = 0;
        for (const kid of kids.get(id) ?? []) total += 1 + (sizeOf.get(kid) ?? 0);
        sizeOf.set(id, total);
      }
    }
  }

  // Relation degree across the WHOLE lexicon. The shipped `rel.json` holds 123
  // relations over 4,096 concepts — a signal that is zero for 97% of the data
  // is a constant, not a signal. Upstream, the same relations are dense.
  const degreeOf = new Map();
  const bump = (id) => degreeOf.set(id, (degreeOf.get(id) ?? 0) + 1);
  for (const [id, s] of synsets) {
    for (const targets of Object.values(s.rels)) {
      for (const t of targets) { bump(id); if (synsets.has(t)) bump(t); }
    }
  }

  const features = order.map((id) => {
    const s = synsets.get(id);
    const label = s.members[0];
    const senses = lemmas.get(label) ?? [];
    const at = senses.indexOf(id);
    return {
      depth: depthOf.get(id) ?? 0,
      descendants: sizeOf.get(id) ?? 0,
      synonyms: s.members.length,
      // Not found means the label never resolved through the entries index —
      // treat as the dominant sense rather than inventing obscurity.
      senseRank: at >= 0 ? at + 1 : 1,
      polysemy: senses.length || 1,
      words: label.split(/[ _-]/).filter(Boolean).length,
      degree: degreeOf.get(id) ?? 0,
    };
  });

  const score = features.map(scoreRarity);
  const tier = score.map(tierOf);
  const hist = TIERS.map((t) => tier.filter((x) => x === t.id).length);
  log('rarity:', TIERS.map((t, i) => `${t.name} ${hist[i]}`).join(' · '));
  log(`rarity range ${Math.min(...score)}..${Math.max(...score)}, ` +
      `root "${synsets.get(order[0]).members[0]}" scores ${score[0]}`);
  return { score, tier, features, hist };
}

/** The evidence that the ranking is sane, in a form the owner can read on a
 *  phone: the distribution, and both ends of the list. Regenerated with the
 *  data, so it can never describe a scoring function we no longer run. */
function writeRarityReport(order, synsets, index, rarity) {
  const rows = order.map((id, i) => ({
    i, label: synsets.get(id).members[0], score: rarity.score[i],
    tier: TIERS[rarity.tier[i]].name, f: rarity.features[i],
  }));
  const sorted = [...rows].sort((a, b) => a.score - b.score || a.i - b.i);
  const line = (r) =>
    `| ${r.i} | ${r.label} | ${r.score} | ${r.tier} | ${r.f.depth} | ${r.f.descendants} | ` +
    `${r.f.synonyms} | ${r.f.senseRank}/${r.f.polysemy} | ${r.f.degree} |`;
  const table = (rs) => [
    '| id | concept | score | tier | depth | desc | syn | sense | deg |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rs.map(line),
  ].join('\n');

  writeFileSync(join(ROOT, 'docs/RARITY.md'), [
    '# Rarity — generated, do not edit',
    '',
    'Regenerated by `npm run ontology`. Scoring lives in `scripts/rarity.mjs`,',
    'which states what this number is and — more importantly — what it is not:',
    '**it is obscurity inside the lexicon, not corpus frequency.** WordNet ships',
    'no occurrence counts and this project does not invent data.',
    '',
    `Weights: ${Object.entries(WEIGHTS).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
    '',
    '## Distribution',
    '',
    '| tier | concepts | share |',
    '|---|---|---|',
    ...TIERS.map((t, i) =>
      `| ${t.name} (≤${t.upTo}) | ${rarity.hist[i]} | ` +
      `${((rarity.hist[i] / order.length) * 100).toFixed(1)}% |`),
    '',
    '## The 40 most common',
    '',
    table(sorted.slice(0, 40)),
    '',
    '## The 40 most obscure',
    '',
    table(sorted.slice(-40).reverse()),
    '',
    '`sense` is *this synset\'s rank among that word\'s noun senses / how many',
    'senses the word has*. `desc` is descendants inside the shipped slice.',
    '',
  ].join('\n'));
  log('wrote docs/RARITY.md');

  // THE WHOLE DATASET, GREPPABLE. A session writing story beats has to name
  // concepts by the integer id a save stores, and there is no other way to see
  // what 4,096 concepts are available — RARITY.md shows eighty of them. TSV so
  // it opens anywhere and diffs line-by-line when the edition moves.
  writeFileSync(join(ROOT, 'docs/CONCEPTS.tsv'), [
    'id\tlabel\trarity\ttier\tcategory\tdepth\tdefinition',
    ...rows.map((r) => [
      r.i, r.label, r.score, r.tier,
      synsets.get(order[r.i]).lex, r.f.depth,
      synsets.get(order[r.i]).def.replace(/\s+/g, ' '),
    ].join('\t')),
    '',
  ].join('\n'));
  log(`wrote docs/CONCEPTS.tsv: ${rows.length} concepts`);
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

  // Sidecar: synset id -> shipped numeric node id. NOT shipped to the player —
  // it lives in docs/ so the runtime payload and the mobile budget are
  // unchanged. Build-time tooling (scripts/build-story.mjs) uses it to bake
  // NUMERIC ids into its output, so the engine never has to know that WordNet
  // synset ids exist at all. That is the seam: content tooling owns the
  // translation, the engine consumes numbers.
  const IDMAP = join(ROOT, 'docs/graph/idmap.json');
  mkdirSync(dirname(IDMAP), { recursive: true });
  writeFileSync(IDMAP, JSON.stringify({
    generatedBy: 'scripts/build-ontology.mjs',
    note: 'synset id -> node id, valid only for this exact concept selection',
    edition: SRC_REF,
    commit: sha,
    concepts: order.length,
    map: Object.fromEntries(order.map((id, i) => [id, i])),
  }) + '\n');
  log(`wrote ${IDMAP}`);

  // The RELATION TABLE: every non-is-a connection whose BOTH ends survived the
  // selection. Emitted as flat triples [a, b, rel] of concept indices, one small
  // file — this is the dotted-line supply, and the game derives what is
  // available from it rather than storing possibility in anyone's save.
  //
  // It is deliberately separate from the concept chunks: chunks are fetched
  // lazily by range, but a relation can join any two concepts, so it cannot be
  // chunked by index without splitting edges across files.
  //
  // Computed BEFORE the chunks are written, because rarity needs each concept's
  // relation degree and rarity ships inside the chunks.
  const rels = [];
  const relCounts = {};
  for (const id of order) {
    const from = index.get(id);
    for (const [rel, targets] of Object.entries(synsets.get(id).rels)) {
      for (const t of targets) {
        const to = index.get(t);
        if (to === undefined) continue;   // the other end did not survive selection
        if (to === from) continue;
        rels.push([from, to, Number(rel)]);
        relCounts[rel] = (relCounts[rel] ?? 0) + 1;
      }
    }
  }

  const rarity = rateRarity(order, synsets, parentOf, index, rels, loadLemmas());

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const chunkCount = Math.ceil(order.length / CHUNK);
  for (let c = 0; c < chunkCount; c++) {
    const slice = order.slice(c * CHUNK, (c + 1) * CHUNK);
    writeFileSync(join(OUT, `c${String(c).padStart(3, '0')}.json`), JSON.stringify({
      // `l` label · `d` category index · `p` parent concept index (-1 = root)
      // · `g` definition, verbatim from the source dataset · `r` rarity 0..100
      // (scripts/rarity.mjs — obscurity in the lexicon, NOT corpus frequency).
      l: slice.map((id) => synsets.get(id).members[0]),
      d: slice.map((id) => catIndex.get(synsets.get(id).lex)),
      p: slice.map((id) => { const par = parentOf.get(id); return par == null ? -1 : index.get(par); }),
      g: slice.map((id) => synsets.get(id).def),
      r: slice.map((id) => rarity.score[index.get(id)]),
    }));
  }

  writeFileSync(join(OUT, 'rel.json'), JSON.stringify({ e: rels }));
  log(`wrote rel.json: ${rels.length} non-is-a relations`, JSON.stringify(relCounts));
  writeRarityReport(order, synsets, index, rarity);

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
    '  - Extracted the part/member/substance and topic relations between',
    '    selected concepts into rel.json. Kept as authored, including',
    '    direction; no relation was inverted, inferred or invented.',
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
    relations: rels.length,
    relationsUrl: 'rel.json',
    categories: catNames,
  }, null, 2));

  log(`wrote ${chunkCount} chunks + index.json + LICENSE.txt`);
  log(`concepts: ${order.length}, categories: ${catNames.length}, seed: ${synsets.get(order[0]).members[0]}`);
}

main();
