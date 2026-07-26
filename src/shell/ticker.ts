// The event ticker (Paperclips-style drip). SHELL-side: it observes state
// transitions and emits lines; the engine knows nothing about it.
//
// ★ PROSE GUARDRAIL: every line here is either (a) MECHANICAL — assembled from
// content labels + numbers, no authored flavor — or (b) OWNER-WRITTEN, keyed by
// trigger id in OWNER_LINES. Claude does not write flavor prose. The list of
// trigger moments awaiting the owner's pen lives in docs/TICKER_LINES.md.
import { writable, type Readable } from 'svelte/store';
import type { GameState } from '../core/types';
import { GENERATORS } from '../content/generators';
import { formatWhole } from '../core/numbers';
import { RESOURCE_LABELS } from '../content/resources';

export interface TickerLine {
  id: number;
  text: string;
}

// Owner-written lines slot in here, keyed by trigger id (see docs/TICKER_LINES.md).
// Empty until the owner writes them — mechanical fallbacks carry the ticker.
const OWNER_LINES: Record<string, string> = {};

/** Test seam. The fallback chain is the thing that makes numbered triggers
 *  writable at all, so it needs a test, and a test needs a way to plant a line
 *  without shipping one. Exported as the same object, never written in play. */
export const OWNER_LINES_FOR_TEST = OWNER_LINES;

const NODE_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500];
const EDGE_MILESTONES = [1, 10, 50, 250, 1000];

const lines = writable<TickerLine[]>([]);
export const ticker: Readable<TickerLine[]> = lines;

let nextId = 1;

/** Emit a line for a trigger.
 *
 *  Numbered triggers fall back to their UNNUMBERED form: `buy:extractor:30`
 *  looks for `buy:extractor:30` first, then `buy:extractor`. Without that, the
 *  owner would have to write a line per purchase count or watch the same
 *  mechanical string repeat forever — by Extractor #30 the ticker was reading
 *  "#30 online" and would have gone on doing so indefinitely. A generic line is
 *  the difference between the buy trigger being writable and being noise. */
export function say(triggerId: string, mechanical: string): void {
  const generic = triggerId.replace(/:\d+$/, '');
  const text = OWNER_LINES[triggerId] ?? OWNER_LINES[generic] ?? mechanical;
  lines.update((l) => [...l.slice(-30), { id: nextId++, text }]);
}

/** Diff two states and emit ticker lines for what just happened. */
export function observeTransition(prev: GameState, next: GameState): void {
  for (const g of Object.values(GENERATORS)) {
    const before = prev.generators[g.id];
    const after = next.generators[g.id];
    if (after > before) {
      say(`buy:${g.id}:${after}`, `${g.label} #${after} online`);
    }
  }
  for (const m of NODE_MILESTONES) {
    if (prev.graph.nodes < m && next.graph.nodes >= m) {
      say(`nodes:${m}`, `graph: ${m} nodes`);
    }
  }
  for (const m of EDGE_MILESTONES) {
    if (prev.graph.edges < m && next.graph.edges >= m) {
      say(`edges:${m}`, m === 1 ? 'graph: first edge' : `graph: ${m} edges`);
    }
  }
}

/** What actually accumulates while you are gone is BANKED STATEMENTS. This line
 *  used to report `gains.data` in Datums — a currency that no longer exists and
 *  a rate that is now permanently zero, so the ticker never said anything about
 *  an absence at all. */
export function sayAwayReturn(banked: string | undefined): void {
  if (banked && Number(banked) > 0) {
    say('away-return', `while away: ${formatWhole(banked)} statements banked`);
  }
}
