// Ontology loader — browser-facing, lazy, cache-on-demand.
//
// The concept data is real: Open English WordNet (CC BY 4.0), 107,519 concepts
// in a frozen recovery order built by scripts/build-ontology.mjs. See
// docs/ATTRIBUTION.md.
//
// Boundary: `src/core/` must never import this — the engine stays pure and
// knows only integer node ids. The mapping id → concept lives here, in the
// shell, and a missing/failed chunk degrades to "no label", never to a crash.
import { writable, get, type Readable } from 'svelte/store';

export interface Concept {
  index: number;   // position in recovery order
  label: string;   // the concept's first word form
  domain: string;  // lexicographer file, e.g. "noun.animal"
  gloss: string;   // definition, verbatim from the source dataset
  parent: number;  // index of the concept it was recovered through (-1 = a root)
}

interface Manifest {
  concepts: number;
  chunkSize: number;
  chunks: number;
  domains: string[];
  source: string;
  edition: string;
  license: string;
  attribution: string;
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

export function ontologyCredit(): string {
  return manifest ? `${manifest.source} ${manifest.edition} · ${manifest.license}` : '';
}

/** Node id → concept index. Ids are minted monotonically by the engine, so this
 *  is identity until a run outgrows the dataset, then it wraps: the world is
 *  finite and the game says so rather than inventing concepts. */
export function conceptIndexFor(nodeId: number): number {
  const total = totalConcepts();
  return total > 0 ? nodeId % total : nodeId;
}

function chunkOf(index: number): number {
  return Math.floor(index / (manifest?.chunkSize ?? 2048));
}

function ensureChunk(n: number): void {
  if (!manifest || n < 0 || n >= manifest.chunks) return;
  if (chunks.has(n) || inflight.has(n)) return;
  const name = `c${String(n).padStart(3, '0')}.json`;
  const p = fetchJson<Chunk>(name).then((c) => {
    if (c) {
      chunks.set(n, c);
      revision.update((r) => r + 1);
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
    void loadManifest().then(() => ensureChunk(chunkOf(index)));
    return null;
  }
  const n = chunkOf(index);
  const chunk = chunks.get(n);
  if (!chunk) {
    ensureChunk(n);
    return null;
  }
  const i = index - n * manifest.chunkSize;
  const label = chunk.l[i];
  if (label === undefined) return null;
  return {
    index,
    label,
    domain: manifest.domains[chunk.d[i]!] ?? '',
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
export function warm(nodeIds: Iterable<number>): void {
  if (!manifest) {
    void loadManifest().then(() => warm(nodeIds));
    return;
  }
  for (const id of nodeIds) ensureChunk(chunkOf(conceptIndexFor(id)));
}

/** Share of the dataset recovered so far, 0..1 — a real denominator. */
export function coverageOf(recovered: number): number {
  const total = totalConcepts();
  return total > 0 ? Math.min(1, recovered / total) : 0;
}

/** Test seam: current revision without a store subscription. */
export const currentRevision = (): number => get(revision);
