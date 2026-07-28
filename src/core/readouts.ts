// THE PLAYER-FACING VOCABULARY. One quantity, one noun, one function.
//
// ---- Why this file exists ----------------------------------------------
//
// The board reported "graph: 25 nodes" while the HUD reported "3 recovered",
// at the same moment, on the same screen. Both were correct. They were
// different quantities:
//
//   state.graph.nodes  = anchors + folded  — every concept PLACED, dark ones too
//   recovered(state)   = lit + folded      — only concepts a line supports
//
// And in the other direction, `state.graph.edges` is the STATEMENT BALANCE
// (graph.ts says so in its own comment) — so the ticker called it "edges" while
// the HUD called the identical number "statements".
//
// One quantity with two nouns, and one noun covering two quantities. Nobody
// wrote a bug: two surfaces each reached into raw state and picked a word.
//
// So the rule is structural rather than a promise to be careful:
//
//   1. Every number a player can see is declared HERE, with the noun.
//   2. Surfaces (HUD, ticker, milestones) read this module. They do not reach
//      into `state.graph`, and `scripts/check-vocabulary.mjs` fails the build
//      if they do.
//   3. Nouns are unique. Two readouts sharing a word is the bug this exists to
//      prevent, and a test asserts it.
//
// This module is DERIVED-ONLY: it reads state and returns numbers. It never
// writes, so it cannot become a second source of truth.
import Decimal from 'break_eternity.js';
import type { GameState } from './types';
import { D } from './numbers';
import { recovered, verified } from './engine';

export interface Readout {
  /** The word the player sees. Must be unique across READOUTS. */
  noun: string;
  /** The number behind that word. The ONLY definition of it. */
  count: (s: GameState) => Decimal;
}

export const READOUTS = {
  /** Concepts with at least one line supporting them, plus folded mass. A
   *  concept you have found but never connected is DARK: on the board, and not
   *  recovered. That distinction is the hinge of the whole design, so the word
   *  "recovered" may never quietly widen to mean "placed". */
  recovered: {
    noun: 'recovered',
    count: (s) => D(recovered(s)),
  },

  /** Edges actually drawn on the board. NOT the statement balance — the balance
   *  counts every statement ever minted and is astronomically larger.
   *
   *  The noun was "lines" and the owner said, twice, "these are edges". They
   *  are right: an edge is the real term for a link in a graph, the game is
   *  educational, and inventing a softer synonym taught nothing. The KEY stays
   *  `lines` because it is internal; only the word the player reads changed. */
  lines: {
    noun: 'edges',
    count: (s) => D(s.forged.edges.length),
  },

  /** Every statement minted, checked or not. */
  statements: {
    noun: 'statements',
    count: (s) => D(s.resources.triples),
  },

  /** Statements nobody has cast doubt on: total minus unverified minus drifted. */
  checked: {
    noun: 'checked',
    count: (s) => D(verified(s)),
  },

} satisfies Record<string, Readout>;

export type ReadoutId = keyof typeof READOUTS;

/** Every noun in play, for the uniqueness test and for anyone adding a word. */
export const NOUNS: string[] = Object.values(READOUTS).map((r) => r.noun);
