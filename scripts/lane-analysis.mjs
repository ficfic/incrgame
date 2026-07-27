#!/usr/bin/env node
/* lane-analysis.mjs — measure how DEEP the noun tree goes, and where.
 *
 * WHY THIS EXISTS
 * ---------------
 * `build-ontology.mjs` selects its 4,096 concepts breadth-first from `entity`
 * (see its line ~194). Breadth-first from the root of a taxonomy returns the
 * taxonomy's *classifiers* and never reaches its *instances*. Measured on the
 * pinned 2025 edition:
 *
 *     max depth of the noun tree ........ 16
 *     depth our 4,096 budget reaches .....  5
 *     noun synsets available ........ 71,864
 *
 * The visible symptom, in what we currently ship:
 *
 *     noun.animal (25) — aerobe, anaerobe, amphidiploid, haploid, prokaryote,
 *                        zooid, plankton, myrmecophile, ...  (not one animal)
 *     noun.food    (2) — paring, solid food
 *     noun.body    (4) — protoplasm, karyotype, body part, body substance
 *
 * Those are the nodes that *classify* animals, not animals. Fine for teaching
 * what a hypernym is; useless for setting a scene. Raising CONCEPT_BUDGET does
 * not fix it — a wider breadth-first walk returns more classifiers.
 *
 * A LANE is the alternative: one vertical drill from `entity` to a concrete
 * leaf, every step a real hypernym edge, plus a few siblings at each junction
 * so there is something to choose between. This script measures the tree and
 * emits the candidate lanes as data (docs/graph/lanes.json).
 *
 * Run `npm run ontology` first (or any run that populates .ontology-src).
 * This script only READS that cache; it never writes public/ontology.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, '.ontology-src');       // same cache build-ontology.mjs clones
const YAML_DIR = join(CACHE, 'src/yaml');
const OUT = join(ROOT, 'docs/graph/lanes.json');
const SEED_LABEL = 'entity';
const BFS_BUDGET = 4096;                          // what build-ontology.mjs ships today
const SIBLINGS_PER_JUNCTION = 3;                  // choices offered at each step

if (!existsSync(YAML_DIR)) {
  console.error(`no WordNet cache at ${YAML_DIR}\nrun: npm run ontology`);
  process.exit(1);
}

// ---- parse the noun lexicographer files -----------------------------------

const syn = new Map();
for (const f of readdirSync(YAML_DIR).filter((f) => /^noun\..*\.yaml$/.test(f)).sort()) {
  const lex = basename(f, '.yaml');
  for (const [id, s] of Object.entries(parse(readFileSync(join(YAML_DIR, f), 'utf8')))) {
    syn.set(id, { lex, members: s.members ?? [], hypernyms: s.hypernym ?? [] });
  }
}
const label = (id) => syn.get(id)?.members[0] ?? id;

// ---- the hypernym tree, rooted at `entity` --------------------------------

const kids = new Map();
for (const [id, s] of syn) {
  for (const h of s.hypernyms) {
    if (!syn.has(h)) continue;
    (kids.get(h) ?? kids.set(h, []).get(h)).push(id);
  }
}
// deterministic: ties break on (label, id), same rule build-ontology.mjs uses
const byLabel = (a, b) => (label(a) < label(b) ? -1 : label(a) > label(b) ? 1 : a < b ? -1 : 1);
for (const k of kids.values()) k.sort(byLabel);

const root = [...syn].find(
  ([, s]) => s.lex === 'noun.Tops' && s.members[0] === SEED_LABEL && s.hypernyms.length === 0,
)?.[0];
if (!root) throw new Error(`seed "${SEED_LABEL}" not found — source layout changed`);

// Breadth-first, so `order` is exactly the sequence build-ontology.mjs keeps
// and `order[BFS_BUDGET - 1]` is the last concept that ships today.
const depth = new Map([[root, 0]]);
const parent = new Map([[root, null]]);
const order = [root];
for (let i = 0; i < order.length; i++) {
  for (const k of kids.get(order[i]) ?? []) {
    if (depth.has(k)) continue;
    depth.set(k, depth.get(order[i]) + 1);
    parent.set(k, order[i]);
    order.push(k);
  }
}

const maxDepth = Math.max(...depth.values());
const bfsReach = depth.get(order[BFS_BUDGET - 1]);

console.log(`noun synsets ............ ${syn.size}`);
console.log(`reachable from entity ... ${order.length}`);
console.log(`max depth ............... ${maxDepth}`);
console.log(`depth a ${BFS_BUDGET} budget reaches  ${bfsReach}   <- what ships today\n`);

const hist = new Array(maxDepth + 1).fill(0);
for (const d of depth.values()) hist[d]++;
hist.forEach((n, d) =>
  console.log(`  ${String(d).padStart(2)} ${'#'.repeat(Math.ceil(n / 400)).padEnd(30)}${n}`),
);

// ---- candidate lanes: the deepest drill in each lexical category -----------

const chainOf = (id) => {
  const out = [];
  for (let c = id; c != null; c = parent.get(c)) out.unshift(c);
  return out;
};

const deepestPerCategory = new Map();
for (const [id, d] of depth) {
  const lex = syn.get(id).lex;
  if (!deepestPerCategory.has(lex) || d > deepestPerCategory.get(lex).d) {
    deepestPerCategory.set(lex, { id, d });
  }
}

const lanes = [...deepestPerCategory.entries()]
  .sort((a, b) => b[1].d - a[1].d)
  .map(([lex, { id, d }]) => {
    const chain = chainOf(id);
    return {
      category: lex,
      depth: d,
      // The spine: every step is a real WordNet hypernym edge, so the lane is
      // theory-faithful by construction — no authored links.
      spine: chain.map((c) => ({
        id: c,
        label: label(c),
        // Siblings are the OTHER choices at this junction. They are what makes
        // a lane a decision rather than a corridor.
        //
        // KNOWN WEAKNESS, on record: this takes the alphabetical first three,
        // so the junction under `animal` currently offers "aerobe /
        // amphidiploid / anaerobe" — the same abstract-classifier problem this
        // script exists to diagnose, one level down. Choosing siblings needs a
        // rarity/salience score per concept, which is a separate piece of work.
        // Until it lands, treat `siblings` as a COUNT that sizes the dataset,
        // not as the actual choices a player would be offered.
        siblings: (kids.get(parent.get(c)) ?? [])
          .filter((x) => x !== c)
          .slice(0, SIBLINGS_PER_JUNCTION)
          .map((x) => ({ id: x, label: label(x) })),
      })),
    };
  });

// ---- what the depth-first selection would cost ----------------------------

const cost = (width) => {
  const keep = new Set();
  for (const { id } of deepestPerCategory.values()) {
    for (const c of chainOf(id)) {
      keep.add(c);
      (kids.get(parent.get(c)) ?? []).filter((x) => x !== c).slice(0, width).forEach((s) => keep.add(s));
    }
  }
  return keep.size;
};
const sizing = [0, 1, 2, 3].map((width) => ({ width, concepts: cost(width) }));

console.log(`\n${lanes.length} candidate lanes (deepest drill per category):`);
for (const l of lanes.slice(0, 6)) {
  console.log(`  ${l.category} (${l.depth})  ${l.spine.map((s) => s.label).join(' -> ')}`);
}
console.log('\nconcepts needed, all lanes to full depth:');
for (const s of sizing) console.log(`  ${s.width} sibling(s) per junction -> ${s.concepts}`);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: 'Open English WordNet 2025-edition (CC BY 4.0) — see docs/ATTRIBUTION.md',
      generatedBy: 'scripts/lane-analysis.mjs',
      measured: { nounSynsets: syn.size, maxDepth, bfsBudget: BFS_BUDGET, bfsReachesDepth: bfsReach },
      sizing,
      lanes,
    },
    null,
    1,
  ) + '\n',
);
console.log(`\nwrote ${OUT}`);
