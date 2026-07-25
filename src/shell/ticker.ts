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

const NODE_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500];

const lines = writable<TickerLine[]>([]);
export const ticker: Readable<TickerLine[]> = lines;

let nextId = 1;
export function say(triggerId: string, mechanical: string): void {
  const text = OWNER_LINES[triggerId] ?? mechanical;
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
}

export function sayAwayReturn(gained: string | undefined): void {
  if (gained) {
    say('away-return', `while away: +${formatWhole(gained)} ${RESOURCE_LABELS.triples}`);
  }
}
