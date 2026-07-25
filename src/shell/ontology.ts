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

/** Deterministic character-level corruption of a REAL string — a visual glitch
 *  effect on licensed text, not generated text. Used to show what a drifted
 *  statement looks like: the definition you had, decaying. */
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
    return m;
  });
  return manifestPromise;
}

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
  return {
    text: manifest.attribution,
    short: stop > 0 ? manifest.attribution.slice(0, stop + 1) : manifest.attribution,
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
 *  Today this is WordNet hypernymy only (`rel: 0`, "is a"), which is enough for
 *  the mechanic because every concept has a parent — so every concept you find
 *  arrives with at least one line you could fill. The other relations slot into
 *  the same shape once `public/relations/` ships (see docs/ATTRIBUTION.md for
 *  the compliance conditions that gate it).
 */
export function potentialEdges(anchors: readonly number[]): Array<{ a: number; b: number; rel: number }> {
  const live = new Set(anchors);
  const out: Array<{ a: number; b: number; rel: number }> = [];
  for (const id of anchors) {
    if (id === 0) continue;
    // walk up to the nearest ancestor that is also on the board, so a concept
    // whose direct parent has folded away still has something to attach to
    let cursor = conceptAt(id)?.parent;
    for (let hops = 0; hops < 8 && cursor !== undefined && cursor >= 0; hops++) {
      if (live.has(cursor)) { out.push({ a: cursor, b: id, rel: 0 }); break; }
      cursor = conceptAt(cursor)?.parent;
    }
  }
  return out;
}
