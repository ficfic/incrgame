// THE STARMAP. Lanes out of what you hold, in three states.
//
// This replaces the Discover button, which was the owner's original ask: a
// button that hands you the next concept in a fixed order is a vending machine,
// and it tells you nothing about where you are or where you could go. A lane is
// a route to a NAMED destination, and the three states are the whole design:
//
//   solid    the far end is already discovered      takeable, a route you know
//   dotted   ungated, far end unknown               takeable, and it TEACHES you
//   locked   gated on a concept you do not have     VISIBLE, not takeable
//
// ⚠️ LOCKED IS NEVER HIDDEN, and its key is shown MASKED: "held by ▓▓▓▓▓▓▓".
// An absent edge tells the player nothing. A door with a lock on it, whose key
// is a word you can see the shape of but not read, is the reason to come back.
// Hiding locked lanes would be less code and would delete the feature.
//
// ---- WHY THE MASK IS SAFE TO BUILD HERE ---------------------------------
//
// The prose masking renderer is blocked: it needs span markers inside beat text
// that do not exist yet, and inventing that format is not this branch's call.
// A lane key needs none of it. The gate is `requires.concepts: number[]` — the
// engine already KNOWS which concept it is, by id. There is no string matching,
// no lemma ambiguity, nothing to parse. The mask is drawn from the label's
// length and nothing else.
//
// This module is PURE and data-driven: it reads the story graph and the board,
// and returns a description. It books nothing and mutates nothing.
import type { GameState, StoryBeat, StoryChoice } from './types';
import { STORY, placeAt } from '../content/story';

export type LaneState = 'solid' | 'dotted' | 'locked';

/** WHERE THE PLAYER IS, derived and never stored.
 *
 *  Taking a choice discovers its `to` and moves there, and targeted discovery
 *  appends that concept to `held` — so the last one IS the current
 *  position. No new save field, which is the constraint this whole feature was
 *  given: a save already records everywhere you have been, in order.
 *
 *  ⚠️ A CHILDLESS CONCEPT IS A PLACE TOO — `placeAt` renders it as the leaf it
 *  is. This used to skip anything without an authored beat, so walking to one
 *  of the ~3,600 childless destinations spent the step and left the screen
 *  showing the beat you had not left: paid for, and indistinguishable from a
 *  broken button.
 *
 *  Falls back to the newest anchor that IS a place, then to the root, so a
 *  concept off the story graph entirely (a seed you have not arrived at) does
 *  not strand the player on a node with nothing to read. */
export function currentBeat(state: GameState): StoryBeat | null {
  const held = state.held;
  for (let i = held.length - 1; i >= 0; i--) {
    const beat = placeAt(held[i]!);
    if (beat) return beat;
  }
  return placeAt(0);
}

export interface Lane {
  /** Node the lane leaves from — always a concept you already hold. */
  from: number;
  /** Node it arrives at. */
  to: number;
  /** The destination's label from the story data. Shown only when the lane is
   *  not locked; a locked lane shows its KEY masked instead. */
  toLabel: string;
  rel: number;
  state: LaneState;
  /** Concepts still missing, for a locked lane. Empty otherwise. */
  missing: number[];
  /** Stable identity for keying a list and for a tap target. */
  id: string;
}

/** The mask glyph. One block per character of the hidden word, so the shape of
 *  the word is information — a three-block key and an eleven-block key are
 *  visibly different targets — while the word itself is not readable. */
export const MASK_CHAR = '▓';

/** A word you have not discovered, rendered as its own silhouette.
 *
 *  Length is clamped: a 30-character WordNet compound would wrap a phone line
 *  and read as a redaction bar rather than a word. */
export function mask(label: string, max = 12): string {
  const n = Math.max(3, Math.min(max, [...(label ?? '')].length || 3));
  return MASK_CHAR.repeat(n);
}

/** Beats whose vantage point is a concept you hold. */
function beatsAt(held: Set<number>): StoryBeat[] {
  return STORY.beats.filter((b) => held.has(b.at));
}

/** Every lane the board currently offers.
 *
 *  Deduplicated on (from, to, rel): the story graph is 26 lanes deep and they
 *  share their upper reaches, so `entity → physical entity` is offered by many
 *  beats and must be ONE lane on screen. The strongest state wins a tie — a
 *  route that is open somewhere is open. */
export function lanes(state: GameState): Lane[] {
  const held = new Set(state.held);
  const rank: Record<LaneState, number> = { solid: 0, dotted: 1, locked: 2 };
  const best = new Map<string, Lane>();

  for (const beat of beatsAt(held)) {
    for (const choice of beat.choices) {
      const lane = laneFor(state, held, beat.at, choice);
      const prev = best.get(lane.id);
      if (!prev || rank[lane.state] < rank[prev.state]) best.set(lane.id, lane);
    }
  }
  // Ordered so the map reads the same way twice: by state, then by destination.
  return [...best.values()].sort(
    (a, b) => rank[a.state] - rank[b.state] || a.from - b.from || a.to - b.to,
  );
}

function laneFor(
  state: GameState, held: Set<number>, from: number, choice: StoryChoice,
): Lane {
  const missing = (choice.requires?.concepts ?? []).filter((id) => !held.has(id));
  const laneState: LaneState = missing.length > 0
    ? 'locked'
    : held.has(choice.to) ? 'solid' : 'dotted';
  return {
    from, to: choice.to, toLabel: choice.toLabel ?? '', rel: choice.rel ?? 0,
    state: laneState, missing,
    id: `${from}:${choice.to}:${choice.rel ?? 0}`,
  };
}

/** Can this lane be travelled right now? State only — attention and slots are
 *  the engine's business, checked where the action is applied. */
export function laneOpen(lane: Lane): boolean {
  return lane.state !== 'locked';
}
