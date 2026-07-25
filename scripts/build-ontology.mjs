// Content pipeline: Open English WordNet -> the game's recovery order.
//
// Emits STRUCTURED DATA ONLY (labels, domains, parents, definitions quoted
// verbatim from the source dataset). It never writes a sentence of its own —
// player-facing prose is owner-written (CLAUDE.md).
//
// Source: Open English WordNet, CC BY 4.0, derived from Princeton WordNet.
// See docs/ATTRIBUTION.md. Run: npm run ontology
//
// The output ordering is a FROZEN CONTRACT once shipped: a save stores integer
// node ids, and id N means "the Nth concept in recovery order". Re-running this
// script against a newer edition would renumber the world and silently relabel
// every node in an existing save. So the edition is pinned, and bumping it is a
// deliberate, logged, migration-bearing decision (docs/DECISIONS.md).

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_REPO = 'https://github.com/globalwordnet/english-wordnet.git';
const SRC_REF = '2025-edition'; // PINNED. Changing this renumbers the world.
const CACHE = join(ROOT, '.ontology-src');
const OUT = join(ROOT, 'public/ontology');

// Chunk size trades first-load bytes against request count. 2048 concepts ~=
// 55 KB gzip per chunk; a fresh save only ever needs chunk 0.
const CHUNK = 2048;

// The seed concept: WordNet's unique beginner, the root of the noun hierarchy.
const SEED_LABEL = 'entity';

const log = (...a) => console.log('[ontology]', ...a);

// ---- 1. fetch the pinned source ------------------------------------------

function fetchSource() {
  if (existsSync(join(CACHE, 'src/yaml'))) {
    log('using cached source at', CACHE);
    return execFileSync('git', ['-C', CACHE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  }
  rmSync(CACHE, { recursive: true, force: true });
  log('cloning', SRC_REPO, 'at', SRC_REF, '(~45 MB of YAML, sparse)');
  execFileSync('git', [
    'clone', '--depth', '1', '--branch', SRC_REF,
    '--filter=blob:none', '--sparse', SRC_REPO, CACHE,
  ], { stdio: 'inherit' });
  execFileSync('git', ['-C', CACHE, 'sparse-checkout', 'set', 'src/yaml'], { stdio: 'inherit' });
  return execFileSync('git', ['-C', CACHE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

// ---- 2. parse the lexicographer files -------------------------------------

/** Lexicographer files are the 45 semantic domains: noun.animal, verb.weather,
 *  ... The entries-*.yaml files hold lexical entries (word forms), not synsets. */
function loadSynsets() {
  const dir = join(CACHE, 'src/yaml');
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') && /^(noun|verb|adj|adv)\./.test(f))
    .sort();
  const synsets = new Map(); // id -> { def, hypernyms, members, lex }
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
  log(`parsed ${synsets.size} synsets across ${files.length} domains`);
  return synsets;
}

// ---- 3. the recovery order ------------------------------------------------

/** Breadth-first from `entity` down the hyponym (is-a) tree, so the game hands
 *  back the skeleton of the world before its details, in the real hierarchy's
 *  own order. Ties break on (label, synset id) so the order is reproducible.
 *  Concepts unreachable from `entity` — verbs, adjectives, adverbs and stray
 *  noun roots — follow, grouped by their own roots, in the same stable order. */
function recoveryOrder(synsets) {
  const children = new Map(); // id -> child ids
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

  const roots = [...synsets].filter(([id, s]) => s.hypernyms.length === 0 && id !== seedId)
    .map(([id]) => id).sort(byLabel);

  const order = [];
  const parent = new Map();
  const seen = new Set();
  for (const root of [seedId, ...roots]) {
    if (seen.has(root)) continue;
    seen.add(root);
    parent.set(root, null);
    const queue = [root];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      order.push(id);
      for (const kid of children.get(id) ?? []) {
        if (seen.has(kid)) continue;
        seen.add(kid);
        parent.set(kid, id);
        queue.push(kid);
      }
    }
  }
  if (order.length !== synsets.size) {
    throw new Error(`order covers ${order.length} of ${synsets.size} synsets`);
  }
  log(`recovery order built; seed = ${SEED_LABEL} (${seedId}), ${roots.length} later roots`);
  return { order, parent };
}

// ---- 4. emit -------------------------------------------------------------

function main() {
  const sha = fetchSource();
  const synsets = loadSynsets();
  const { order, parent } = recoveryOrder(synsets);

  const index = new Map(order.map((id, i) => [id, i]));
  const lexNames = [...new Set(order.map((id) => synsets.get(id).lex))].sort();
  const lexIndex = new Map(lexNames.map((n, i) => [n, i]));

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const chunkCount = Math.ceil(order.length / CHUNK);
  let bytes = 0;
  for (let c = 0; c < chunkCount; c++) {
    const slice = order.slice(c * CHUNK, (c + 1) * CHUNK);
    const chunk = {
      // `l` label, `d` domain index, `p` parent concept index (-1 = a root),
      // `g` definition, verbatim from the source dataset.
      l: slice.map((id) => synsets.get(id).members[0] ?? id),
      d: slice.map((id) => lexIndex.get(synsets.get(id).lex)),
      p: slice.map((id) => {
        const par = parent.get(id);
        return par == null ? -1 : index.get(par);
      }),
      g: slice.map((id) => synsets.get(id).def),
    };
    const name = `c${String(c).padStart(3, '0')}.json`;
    const body = JSON.stringify(chunk);
    bytes += body.length;
    writeFileSync(join(OUT, name), body);
  }

  const manifest = {
    source: 'Open English WordNet',
    edition: SRC_REF,
    commit: sha,
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    homepage: 'https://en-word.net/',
    attribution: 'Open English WordNet, derived from Princeton WordNet. See docs/ATTRIBUTION.md.',
    concepts: order.length,
    chunkSize: CHUNK,
    chunks: chunkCount,
    domains: lexNames,
  };
  writeFileSync(join(OUT, 'index.json'), JSON.stringify(manifest, null, 2));

  log(`wrote ${chunkCount} chunks + index.json to public/ontology (${(bytes / 1e6).toFixed(1)} MB raw)`);
  log(`concepts: ${order.length}, domains: ${lexNames.length}, seed: ${synsets.get(order[0]).members[0]}`);
}

main();
