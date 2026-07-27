// The event ticker (Paperclips-style drip). SHELL-side: it observes state
// transitions and emits lines; the engine knows nothing about it.
//
// ★ PROSE: machine-drafted, owner-edited (CLAUDE.md, reversed 2026-07-27 — the
// old "Claude does not write flavor prose" rule is void). Lines here are either
// (a) MECHANICAL — assembled from content labels + numbers — or (b) drafted
// flavour keyed by trigger id in OWNER_LINES, which the owner then iterates on.
// The trigger moments still awaiting a line live in docs/TICKER_LINES.md.
import { writable, type Readable } from 'svelte/store';
import type { GameState } from '../core/types';
import { attentionPenalty } from '../core/engine';
import { GENERATORS } from '../content/generators';
import { formatWhole } from '../core/numbers';
import { READOUTS, type ReadoutId } from '../core/readouts';
import { RESOURCE_LABELS } from '../content/resources';

export interface TickerLine {
  id: number;
  text: string;
  /** Epoch ms, on the same clock as `state.lastTick`. Lines EXPIRE.
   *
   *  Without this the dock rendered `slice(-2)` of an append-only list, so the
   *  last two lines sat under the board forever — "graph: 25 nodes" was still
   *  on screen long after it stopped being news, which reads as a frozen UI
   *  rather than as a drip. A ticker that never clears is not a ticker. */
  at: number;
}

/** How long a line stays on screen. Long enough to read on a phone without
 *  looking at it immediately; short enough that a quiet dock means nothing has
 *  happened, rather than that something happened once. */
export const TICKER_TTL_MS = 45_000;

// Owner-written lines slot in here, keyed by trigger id (see docs/TICKER_LINES.md).
// Empty until the owner writes them — mechanical fallbacks carry the ticker.
const OWNER_LINES: Record<string, string> = {};

/** Test seam. The fallback chain is the thing that makes numbered triggers
 *  writable at all, so it needs a test, and a test needs a way to plant a line
 *  without shipping one. Exported as the same object, never written in play. */
export const OWNER_LINES_FOR_TEST = OWNER_LINES;

/** Concepts RECOVERED — the same quantity the HUD shows under the same word.
 *  These used to fire on `state.graph.nodes`, which counts every concept
 *  placed including dark ones, so the dock announced "25 nodes" beside a HUD
 *  reading "3 recovered". Both numbers were right; only one of them was the
 *  thing the player is playing for. */
const RECOVERED_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500];

/** Lines DRAWN. These used to fire on `state.graph.edges`, which is the
 *  statement balance — a different quantity that the HUD already calls
 *  "statements" — so "graph: first edge" announced the first STATEMENT, while
 *  lines had been on the board for a while.
 *
 *  Capped below EDGE_CAP (512): a milestone on a mechanic that cannot happen is
 *  a beat nobody will ever read (docs/CONTENT.md, reachability rule 3). */
const LINE_MILESTONES = [1, 10, 50, 250, 500];

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
  lines.update((l) => [...l.slice(-30), { id: nextId++, text, at: Date.now() }]);
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
  // Milestones read READOUTS, so the number in the line is by construction the
  // number under the same word in the HUD. That equality is asserted by a test.
  crossings(prev, next, 'recovered', RECOVERED_MILESTONES, (m) =>
    `${m} concepts ${READOUTS.recovered.noun}`);
  crossings(prev, next, 'lines', LINE_MILESTONES, (m) =>
    m === 1 ? `first edge drawn` : `${m} ${READOUTS.lines.noun} drawn`);

  // THE ONE DEGRADATION, announced. A slot vanishing with nothing said about
  // it is indistinguishable from a bug, and the owner has twice reported a
  // number moving for reasons the game never gave. Both directions fire: the
  // slot coming BACK is the whole reward for clearing the backlog, and a
  // penalty you can only ever hear about once teaches half a rule.
  const was = attentionPenalty(prev);
  const now = attentionPenalty(next);
  if (now > was) say(`attention:lost:${now}`, `unchecked backlog costs ${now} attention`);
  else if (now < was) {
    say(`attention:back:${now}`,
      now === 0 ? 'backlog cleared · attention restored' : `backlog down · ${was - now} attention back`);
  }
}

/** Fire once per threshold the given readout has just crossed upward. */
function crossings(
  prev: GameState,
  next: GameState,
  id: ReadoutId,
  thresholds: number[],
  mechanical: (m: number) => string,
): void {
  const before = READOUTS[id].count(prev);
  const after = READOUTS[id].count(next);
  for (const m of thresholds) {
    if (before.lt(m) && after.gte(m)) say(`${id}:${m}`, mechanical(m));
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
