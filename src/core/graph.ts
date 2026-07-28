// The graph is a PROJECTION of the Datums balance — never independent state.
// One substance (owner decisions 2026-07-25, retuned same day): you mine
// Datums; enough of them crystallize into an entity (node); relations (edges)
// are rarer still early on — the owner's call: "much more datums to create a
// node and even more to create an edge." Late game the relation bands
// accelerate, so a field of lonely dots slowly becomes a dense web — the
// world's texture changes as you scale, not just its size.
//
// Exact, closed-form, deterministic, O(1): no RNG, no stored counters to
// drift, offline growth costs nothing. Counters are bounded JS numbers (the
// picture, not the balance sheet — balances stay break_eternity Decimals).
import type { Dec, ForgedGraph, GraphStats } from './types';
import { SEED_NODES } from '../content/seed';
import { D } from './numbers';

// number-safety ceiling for the projected counters (display/renderer only)
const COUNTER_CAP = 9_000_000_000_000_000; // < Number.MAX_SAFE_INTEGER

// Frontier Mining caps (bounded interaction state — never one entry per triple)
export const FRONTIER_CAP = 8;
export const ANCHOR_CAP = 240; // = render LOD budget
export const LINK_CAP = 512;

const capped = (d: ReturnType<typeof D>): number =>
  d.gte(COUNTER_CAP) ? COUNTER_CAP : Math.max(0, d.toNumber());

/** Display counters for the v4 model: edges ARE the triples balance (every
 *  claim/machine-forge mints one); nodes = wired anchors + folded mass. */
export function deriveGraph(forged: ForgedGraph, triples: Dec): GraphStats {
  return {
    nodes: Math.min(forged.anchors.length + capped(D(forged.foldedNodes).floor()), COUNTER_CAP),
    edges: capped(D(triples).floor()),
  };
}

/** Drawn lines, capped. Distinct from `deriveGraph().edges`, which is the
 *  statement BALANCE and is a different quantity — the balance counts every
 *  statement the machines have ever minted; this counts lines actually on the
 *  board. Keeping them separate is why the balance can be astronomical while
 *  the picture stays inside the mobile render budget. */
export const EDGE_CAP = 512;

/** ⚠️ THE OPENING BOARD IS NO LONGER `entity`.
 *
 *  It was `anchors: [0]` — the root of the noun hierarchy, the most general
 *  word in the language, with nothing above it and nothing strange about it.
 *  The player now wakes holding five mid-graph concepts (system, agent,
 *  language, information, power): real WordNet entries that happen to be this
 *  game's own subject, so the opening states the satire without a word of
 *  authored prose.
 *
 *  `nextId` is the high-water mark past the highest seed id, so the sequential
 *  allocator never hands out an id the player already holds. */
export function emptyForged(): ForgedGraph {
  const anchors = [...SEED_NODES];
  return {
    nextId: Math.max(...anchors) + 1,
    anchors, links: [], edges: [], frontier: [], foldedNodes: '0',
  };
}

// (datums span, datums per new node/edge). Tuning knobs — feel, then adjust.
const NODE_BANDS: Array<{ upTo: number; per: number }> = [
  { upTo: 15, per: 3 },      // the opening: a node every few taps
  { upTo: 150, per: 10 },
  { upTo: 1500, per: 30 },
  { upTo: Infinity, per: 100 },
];
const EDGE_BANDS: Array<{ upTo: number; per: number }> = [
  { upTo: 15, per: Infinity }, // relations don't exist yet — dots first
  { upTo: 300, per: 25 },      // first edge lands ~40 datums: an event
  { upTo: 3000, per: 12 },
  { upTo: Infinity, per: 5 },  // mature world: relations outpace entities
];

function fromBands(amount: number, bands: Array<{ upTo: number; per: number }>): number {
  let out = 0;
  let prev = 0;
  for (const band of bands) {
    const span = Math.min(amount, band.upTo) - prev;
    if (span <= 0) break;
    if (band.per !== Infinity) out += Math.floor(span / band.per);
    prev = band.upTo;
  }
  return out;
}

export function projectGraph(datums: Dec): GraphStats {
  const d = D(datums).floor();
  const c = d.gte(COUNTER_CAP) ? COUNTER_CAP : Math.max(0, d.toNumber());
  return {
    nodes: Math.min(1 + fromBands(c, NODE_BANDS), COUNTER_CAP),
    edges: Math.min(fromBands(c, EDGE_BANDS), COUNTER_CAP),
  };
}
