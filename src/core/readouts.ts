// THE PLAYER-FACING VOCABULARY. One quantity, one noun, one function.
//
// ---- Why this file exists ----------------------------------------------
//
// The board reported "graph: 25 nodes" while the HUD reported "3 recovered",
// at the same moment, on the same screen, both correct and both a different
// quantity. Nobody wrote a bug: two surfaces each reached into raw state and
// picked a word. Worse, the review that produced `docs/ECONOMY_SRR.md` found
// that the HUD never called this module AT ALL — the single-source rule was
// architecturally present and functionally bypassed, so "one word, one
// quantity" READ as enforced and was not.
//
// The rule is structural rather than a promise to be careful:
//
//   1. Every number a player can see is declared HERE, with the noun and with
//      the sentence that explains it.
//   2. Surfaces (HUD, ticker, milestones) read this module. They do not reach
//      into state and name a number themselves.
//   3. Nouns are unique, and every `explain` is at most five words. Both are
//      asserted by test/readouts.test.ts.
//
// This module is DERIVED-ONLY: it reads state and returns numbers. It never
// writes, so it cannot become a second source of truth.
import Decimal from 'break_eternity.js';
import type { GameState } from './types';
import { D } from './numbers';
import { words } from './engine';
import { READABLE_CONCEPTS } from '../content/ontologyMeta';

export interface Readout {
  /** The word the player sees. Must be unique across READOUTS. */
  noun: string;
  /** What it is, in five words or fewer. Not flavour — the definition. It is
   *  short because it has to fit under the number on a phone, and because a
   *  quantity that needs a paragraph is a quantity that needs deleting. */
  explain: string;
  /** The number behind that word. The ONLY definition of it. */
  count: (s: GameState) => Decimal;
  /** A real denominator, or absent. `Words 187 / 4075` is the only fraction in
   *  the game; every other percentage this economy used to show was a ratio
   *  between two quantities the player could not separately see. */
  of?: (s: GameState) => Decimal;
}

export const READOUTS = {
  /** Concepts you can read. Up when you arrive somewhere new, never down —
   *  including across a Retrain, because what you learned is what a retrain
   *  keeps. The denominator is measured from the shipped story graph. */
  words: {
    noun: 'Words',
    explain: 'concepts you can read now',
    count: (s) => D(words(s)),
    of: () => D(READABLE_CONCEPTS),
  },

  /** Checked facts. The only thing you spend, and the only thing that does not
   *  decay. Watched machines, the Check verb and the Reasoner make it. */
  solid: {
    noun: 'Solid',
    explain: 'checked facts that never rot',
    count: (s) => D(s.solid),
  },

  /** Machine output nobody has looked at. Loose machines and the away pile make
   *  it; it rots, or it gets checked. */
  raw: {
    noun: 'Raw',
    explain: 'machine facts nobody has checked',
    count: (s) => D(s.raw),
  },

  /** What speed cost you, kept on screen. Only a Retrain clears it. */
  rot: {
    noun: 'Rot',
    explain: 'facts worn out, permanently',
    count: (s) => D(s.rot),
  },

} satisfies Record<string, Readout>;

export type ReadoutId = keyof typeof READOUTS;

/** Every noun in play, for the uniqueness test and for anyone adding a word. */
export const NOUNS: string[] = Object.values(READOUTS).map((r) => r.noun);

/** The longest an `explain` may be. Five, from the resource table in
 *  docs/ECONOMY_SRR.md §3 — "facts worn out, permanently" is four and that is
 *  fine; the bound exists to stop an essay, not to pad a phrase to length. */
export const EXPLAIN_MAX_WORDS = 5;
