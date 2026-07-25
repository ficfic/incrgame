// The graph is a PROJECTION of the Triples balance — never independent state.
// One substance (owner decision, 2026-07-25): every triple is an edge; entities
// (nodes) emerge from triples, frequently at first, rarer as the world densifies
// — early assertions name new things, later ones connect known things. This is
// the real shape of knowledge-graph growth, and it keeps 1-tap-=-1-node magic
// alive exactly when the player is watching node-by-node.
//
// Exact, closed-form, deterministic, O(1): no RNG, no stored counters to drift,
// and offline growth costs nothing to compute. Counters are bounded JS numbers
// (the picture, not the balance sheet — balances stay break_eternity Decimals).
import type { Dec, GraphStats } from './types';
import { D } from './numbers';

// number-safety ceiling for the projected counters (display/renderer only)
const COUNTER_CAP = 9_000_000_000_000_000; // < Number.MAX_SAFE_INTEGER

// emergence bands: (edges span, new node every k edges)
const BANDS: Array<{ upTo: number; k: number }> = [
  { upTo: 8, k: 1 },    // the magical opening: every triple names a new entity
  { upTo: 30, k: 2 },
  { upTo: 100, k: 3 },
  { upTo: Infinity, k: 4 },
];

export function projectGraph(triples: Dec): GraphStats {
  const d = D(triples).floor();
  const edges = d.gte(COUNTER_CAP) ? COUNTER_CAP : Math.max(0, d.toNumber());
  let nodes = 1; // the lonely starting node
  let prev = 0;
  for (const band of BANDS) {
    const span = Math.min(edges, band.upTo) - prev;
    if (span <= 0) break;
    nodes += Math.floor(span / band.k);
    prev = band.upTo;
  }
  return { nodes: Math.min(nodes, COUNTER_CAP), edges };
}
