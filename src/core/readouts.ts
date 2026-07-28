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
//
// ---- AND ONE WORD, ONE WAY TO EARN IT -----------------------------------
//
// Every noun below now has a foreign form in `docs/graph/language.json`, so the
// HUD can speak the graph's tongue like the beats do. But carrier words are
// learned by FREQUENCY over the beats the player has stood in (`literacy.ts`),
// and NONE of these four nouns appears in a beat — `canRead` would hide all
// four forever. A permanently unreadable HUD is not a game, it is a wall.
//
// ★ SO A READOUT'S NOUN IS EARNED BY USE: you can read the word for a quantity
//   once you have made that quantity happen. The interface assembles itself as
//   you act, which is the same rule as the rest of the language (do the thing,
//   get the word) applied where frequency cannot reach.
//
// ⚠️ EVERY WITNESS BELOW ONLY EVER RISES, and that is not a detail. Solid and
// Raw are stocks: they go DOWN, constantly, because spending them is the game.
// Gate a word on its own stock and the HUD unlearns a word every time the
// player buys something — a word taken back is the one thing VISION forbids
// ("nothing the player chose is ever deleted out from under them"). So the
// witness is never the stock itself unless the stock cannot fall:
//
//   Words   words()          never falls, not even across a Retrain
//   Solid   machines owned   you learn what you spend BY SPENDING IT
//   Raw     Rot ≥ 1          Raw falls; what it decays into does not
//   Rot     rot ≥ 3          only a Retrain clears it — see `veteran` below
//
// STRICTLY LATER THAN THE ROW APPEARING, also deliberate. A substance joins the
// bar at one whole fact (DECISIONS 2026-07-28); if the word arrived with the
// row, no label would ever be read foreign and this would be decoration. The
// number is legible from the first frame and the noun is not: `3 / 4075` over a
// word you cannot read is the intended experience, not a rendering failure.
import Decimal from 'break_eternity.js';
import type { GameState } from './types';
import { MACHINE_IDS } from './types';
import { D } from './numbers';
import { RETRAIN_MIN_WORDS, initialState, words } from './engine';
import { LEARN_AT } from './literacy';
import { READABLE_CONCEPTS } from '../content/ontologyMeta';

/** Machines a run opens with. A machine you were GIVEN is not one you bought,
 *  and Solid's word is earned by spending it — so the opening Extractor must
 *  not teach it. Read from the engine rather than typed here, so changing the
 *  opening roster cannot silently hand the player a word. */
const OPENING_MACHINES = MACHINE_IDS.reduce((n, id) => n + initialState().machines[id], 0);

const owned = (s: GameState): number => MACHINE_IDS.reduce((n, id) => n + s.machines[id], 0);

/** A player who has reached the Retrain gate has, by construction, done all
 *  four of these things — and Words never falls, so this is the one witness
 *  that survives a Retrain resetting the machines and zeroing Rot underneath
 *  the others. Without it, prestige would unlearn three words. */
const veteran = (s: GameState): boolean => words(s) >= RETRAIN_MIN_WORDS;

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
  /** Can the player READ `noun` yet, or does it show as the graph's word for
   *  it? See the header: earned by making the quantity happen, witnessed by
   *  something that only ever rises. Never false after it has been true. */
  learned: (s: GameState) => boolean;
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
    // Three concepts read, which is LEARN_AT — the same threshold that teaches
    // every other word in the game. Once is noise, three is a pattern.
    learned: (s) => words(s) >= LEARN_AT,
  },

  /** Checked facts. The only thing you spend, and the only thing that does not
   *  decay. Watched machines, the Check verb and the Reasoner make it. */
  solid: {
    noun: 'Solid',
    explain: 'checked facts that never rot',
    count: (s) => D(s.solid),
    // You learn what you spend by spending it. Walking spends Solid too, but a
    // walk is what Words counts — gating on it would teach both nouns in the
    // same frame, and buying is the one spend that leaves a mark that stays.
    learned: (s) => owned(s) > OPENING_MACHINES || veteran(s),
  },

  /** Machine output nobody has looked at. Loose machines and the away pile make
   *  it; it rots, or it gets checked. */
  raw: {
    noun: 'Raw',
    explain: 'machine facts nobody has checked',
    count: (s) => D(s.raw),
    // ⚠️ NOT ITS OWN STOCK, AND THIS WAS MEASURED RATHER THAN ARGUED. Raw is
    // the one quantity the player empties on purpose: `|| D(s.raw).gte(LEARN_AT)`
    // was here, and a loose Extractor taught the word at raw 3.02 / rot 0.023
    // after 7.5 seconds — then fifty taps of Check took it straight back. So
    // the witness is what Raw leaves BEHIND, which cannot fall: you learn the
    // word for unchecked knowledge from the first whole fact it costs you.
    learned: (s) => D(s.rot).gte(1) || veteran(s),
  },

  /** What speed cost you, kept on screen. Only a Retrain clears it. */
  rot: {
    noun: 'Rot',
    explain: 'facts worn out, permanently',
    count: (s) => D(s.rot),
    // Rot only ever arrives, so its own stock is an honest witness. Three of
    // them, for the same reason Words takes three: the row appears at one.
    learned: (s) => D(s.rot).gte(LEARN_AT) || veteran(s),
  },

} satisfies Record<string, Readout>;

export type ReadoutId = keyof typeof READOUTS;

/** Every noun in play, for the uniqueness test and for anyone adding a word. */
export const NOUNS: string[] = Object.values(READOUTS).map((r) => r.noun);

/** The longest an `explain` may be. Five, from the resource table in
 *  docs/ECONOMY_SRR.md §3 — "facts worn out, permanently" is four and that is
 *  fine; the bound exists to stop an essay, not to pad a phrase to length. */
export const EXPLAIN_MAX_WORDS = 5;
