// Ontology loader — browser-facing, lazy, cache-on-demand.
//
// The concept data is real: Open English WordNet (CC BY 4.0). We ship a curated
// 4,096 of its 107,519 concepts, in a frozen recovery order built by
// scripts/build-ontology.mjs. See docs/ATTRIBUTION.md.
//
// Boundary: `src/core/` must never import this — the engine stays pure and
// knows only integer node ids. The mapping id → concept lives here, in the
// shell, and a missing/failed chunk degrades to "no label", never to a crash.
import { writable, get, type Readable } from 'svelte/store';

export interface Concept {
  index: number;    // position in recovery order
  label: string;    // the concept's most common word form
  category: string; // WordNet lexicographer file, e.g. "noun.animal"
  gloss: string;    // definition, verbatim from the source dataset
  parent: number;   // index of the concept it was recovered through (-1 = the root)
}

/** Deterministic character-level damage to a REAL string — a glitch effect on
 *  licensed text, never generated text.
 *
 *  ⚠️ THIS IS NOT WHAT COLLAPSE LOOKS LIKE, AND THIS COMMENT USED TO SAY IT WAS.
 *
 *  It previously read "used to show what a drifted statement looks like: the
 *  definition you had, decaying". That is false, and because this function has
 *  ZERO call sites the comment was the only thing anyone read — it went on to
 *  talk a later session into proposing that concept labels visibly rot on the
 *  board. `dog` → `d▒g` looks superb and teaches the single most harmful
 *  misconception in this subject: that degraded machine output can be spotted
 *  by looking at it. The defining property of collapsed and hallucinated output
 *  is that it stays FLUENT.
 *
 *  The project already had this right, in `core/types.ts`: "A corrupt item is
 *  NOT a garbled string — it is a real concept shown with *another real
 *  concept's definition*… spotting rot requires reading the gloss rather than
 *  looking for damage." Character damage depicts BIT ROT — storage noise, a
 *  different failure from a different field.
 *
 *  Real collapse is ABSENCE: rare things stop being there. That is rendered
 *  correctly already — the rim of the graph goes dark while the core stays
 *  bright (`render/detail.ts` weight + LOD).
 *
 *  The one honest use for this function is OCR damage on scanned-book salvage,
 *  where character-level garbage is exactly what really happens. */
export function corrupt(text: string, seed: number, strength: number): string {
  const GLYPHS = '▒▓░#§¤∎⌁≠∅';
  let s = seed >>> 0;
  const next = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  return [...text].map((ch) => {
    if (ch === ' ') return ch;
    if (next() >= strength) return ch;
    return GLYPHS[Math.floor(next() * GLYPHS.length)]!;
  }).join('');
}

interface Manifest {
  concepts: number;
  relations?: number;
  relationsUrl?: string;
  chunkSize: number;
  chunks: number;
  categories: string[];
  source: string;
  edition: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  noticeUrl: string;
}

interface Chunk { l: string[]; d: number[]; p: number[]; g: string[] }

const BASE = `${import.meta.env.BASE_URL}ontology/`;

let manifest: Manifest | null = null;
let manifestPromise: Promise<Manifest | null> | null = null;
const chunks = new Map<number, Chunk>();
const inflight = new Map<number, Promise<void>>();

/** Bumped whenever new data lands, so Svelte re-reads the sync lookups. */
const revision = writable(0);
export const ontologyRevision: Readable<number> = revision;

async function fetchJson<T>(name: string): Promise<T | null> {
  try {
    const res = await fetch(BASE + name);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // offline and uncached: the game plays on, unlabelled
  }
}

export function loadManifest(): Promise<Manifest | null> {
  manifestPromise ??= fetchJson<Manifest>('index.json').then((m) => {
    manifest = m;
    revision.update((r) => r + 1);
    if (m?.relationsUrl) void loadRelations(m.relationsUrl);
    return m;
  });
  return manifestPromise;
}

/** Non-is-a relations, indexed by concept so a lookup is O(1) per node rather
 *  than a scan of the whole table every frame. One small file, fetched once:
 *  a relation can join any two concepts, so unlike the concept chunks it cannot
 *  be split by index range without cutting edges in half. */
const byNode = new Map<number, Array<{ a: number; b: number; rel: number }>>();
let relationsLoaded = false;

async function loadRelations(url: string): Promise<void> {
  const data = await fetchJson<{ e: Array<[number, number, number]> }>(url);
  if (!data) return; // offline and uncached: is-a lines still work, nothing breaks
  for (const [a, b, rel] of data.e) {
    const edge = { a, b, rel };
    for (const end of [a, b]) {
      const list = byNode.get(end);
      if (list) list.push(edge); else byNode.set(end, [edge]);
    }
  }
  relationsLoaded = true;
  revision.update((r) => r + 1);
}

/** Test seam: how many relations are loaded. */
export const relationCount = (): number => (relationsLoaded ? byNode.size : 0);

export function totalConcepts(): number {
  return manifest?.concepts ?? 0;
}

/** CC BY 4.0 §3(a)(1) needs the parties, the licence and a link. Built from the
 *  manifest so it can never drift out of sync with the data it credits. */
export function ontologyCredit():
  { text: string; short: string; licenseUrl: string; noticeUrl: string } | null {
  if (!manifest) return null;
  // The first sentence carries both creators ("Open English WordNet …, derived
  // from Princeton WordNet"); the rest is the statement of changes, which the
  // linked notice supplies. Sliced at a sentence boundary, never mid-clause.
  const stop = manifest.attribution.indexOf('. ');
  const sliced = stop > 0 ? manifest.attribution.slice(0, stop + 1) : manifest.attribution;
  // FAIL SAFE. The slice works today only because "(CC BY 4.0)," has no space
  // after its period. Reword the manifest to "…(CC BY 4.0). Derived from
  // Princeton WordNet…" — a natural edit — and the rendered credit silently
  // stops naming Princeton, which is the §3(a)(1)(A)(i) surface. If the slice
  // loses either party, show the whole thing and let it wrap.
  const short = /Princeton WordNet/.test(sliced) && /Open English WordNet/.test(sliced)
    ? sliced
    : manifest.attribution;
  return {
    text: manifest.attribution,
    short,
    licenseUrl: manifest.licenseUrl,
    noticeUrl: `${import.meta.env.BASE_URL}${manifest.noticeUrl}`,
  };
}

/** Node id → concept index, clamped at the edge of the dataset. The world is
 *  finite; past the last concept a node simply has no name, which is honest.
 *  It does not wrap — replaying `entity` as a fresh discovery would be a lie. */
export function conceptIndexFor(nodeId: number): number {
  return nodeId;
}

function chunkOf(index: number): number {
  return Math.floor(index / (manifest?.chunkSize ?? 2048));
}

/** Chunk → epoch ms of the last failed attempt. Without this a failed fetch is
 *  retried from inside the render loop — up to ~10 calls per frame at 60 fps,
 *  which on a phone is a request flood and a battery fire, not a degradation. */
const failed = new Map<number, number>();
const RETRY_AFTER_MS = 30_000;

function ensureChunk(n: number, nowMs: number): void {
  if (!manifest || n < 0 || n >= manifest.chunks) return;
  if (chunks.has(n) || inflight.has(n)) return;
  const lastFail = failed.get(n);
  if (lastFail !== undefined && nowMs - lastFail < RETRY_AFTER_MS) return;
  const name = `c${String(n).padStart(3, '0')}.json`;
  const p = fetchJson<Chunk>(name).then((c) => {
    if (c) {
      chunks.set(n, c);
      failed.delete(n);
      revision.update((r) => r + 1);
    } else {
      failed.set(n, Date.now());
    }
    inflight.delete(n);
  });
  inflight.set(n, p);
}

/** Synchronous lookup. Returns null while the chunk is still in flight and
 *  schedules the fetch — read it inside a `$ontologyRevision`-dependent
 *  expression and it will fill in when the data arrives. */
export function conceptAt(index: number): Concept | null {
  if (!manifest) {
    void loadManifest().then(() => ensureChunk(chunkOf(index), Date.now()));
    return null;
  }
  if (index < 0 || index >= manifest.concepts) return null; // past the edge of the world
  const n = chunkOf(index);
  const chunk = chunks.get(n);
  if (!chunk) {
    ensureChunk(n, Date.now());
    return null;
  }
  const i = index - n * manifest.chunkSize;
  const label = chunk.l[i];
  if (label === undefined) return null;
  return {
    index,
    label,
    category: manifest.categories[chunk.d[i]!] ?? '',
    gloss: chunk.g[i] ?? '',
    parent: chunk.p[i] ?? -1,
  };
}

/** The concept behind a node id, or null until its chunk lands. */
export function conceptForNode(nodeId: number): Concept | null {
  return conceptAt(conceptIndexFor(nodeId));
}

/** Prefetch the chunk a node id needs, so a label is ready before it is asked
 *  for (the frontier is surveyed before it is claimed). */
export function warm(nodeIds: readonly number[]): void {
  if (!manifest) {
    void loadManifest().then(() => warm(nodeIds));
    return;
  }
  const now = Date.now();
  for (const id of nodeIds) ensureChunk(chunkOf(conceptIndexFor(id)), now);
}

/** Share of the dataset recovered so far, 0..1 — a real denominator. */
export function coverageOf(recovered: number): number {
  const total = totalConcepts();
  return total > 0 ? Math.min(1, recovered / total) : 0;
}

/** Test seam: current revision without a store subscription. */
export const currentRevision = (): number => get(revision);

/** Every connection the DATASET says is available between concepts currently on
 *  the board — the dotted lines.
 *
 *  Derived, never stored: potential is a property of the world, not of your
 *  save. That also keeps the save small and means re-slicing the dataset can
 *  never leave a stale possibility behind in someone's save file.
 *
 *  Sources: WordNet hypernymy (`rel: 0`) for every concept, plus the typed
 *  relations in `rel.json` — has part / has member / topic — whenever both ends
 *  are on the board. ConceptNet slots into the same shape once
 *  `public/relations/` ships (docs/ATTRIBUTION.md gates it).
 */
/** Relations from a concept you hold to one you have NOT discovered.
 *
 *  These can never be drawn — the other end is not on the board — so they are
 *  useless as candidates and perfect as a teaser: while extraction runs, the
 *  board shows it reaching for things beyond what it holds. Every one is a real
 *  relation from the shipped dataset, so nothing here is invented for effect. */
export function reachingOut(held: readonly number[], onBoard: readonly number[]): number[] {
  const live = new Set(onBoard);
  const out: number[] = [];
  for (const id of held) {
    for (const e of byNode.get(id) ?? []) {
      const other = e.a === id ? e.b : e.a;
      if (!live.has(other)) { out.push(id); break; }
    }
  }
  return out;
}

export function potentialEdges(anchors: readonly number[]): Array<{ a: number; b: number; rel: number }> {
  const live = new Set(anchors);
  const out: Array<{ a: number; b: number; rel: number }> = [];
  const seen = new Set<string>();
  for (const id of anchors) {
    if (id === 0) continue;
    // walk up to the nearest ancestor that is also on the board, so a concept
    // whose direct parent has folded away still has something to attach to
    let cursor = conceptAt(id)?.parent;
    for (let hops = 0; hops < 8 && cursor !== undefined && cursor >= 0; hops++) {
      if (live.has(cursor)) { out.push({ a: id, b: cursor, rel: 0 }); break; }
      cursor = conceptAt(cursor)?.parent;
    }
    // ...plus every OTHER relation the dataset records, whenever both ends are
    // on the board. These are the lines that are not `is a` — the ones that
    // make the graph read as a knowledge graph rather than a tree.
    for (const e of byNode.get(id) ?? []) {
      if (!live.has(e.a) || !live.has(e.b)) continue;
      const key = `${e.a}:${e.b}:${e.rel}`;
      if (seen.has(key)) continue; // the table indexes each edge under both ends
      seen.add(key);
      out.push(e);
    }
  }
  return out;
}
