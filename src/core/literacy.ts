// HOW A WORD BECOMES READABLE.
//
// Two vocabularies, two ways in:
//
//   CONCEPTS   bound by discovery. You hold the node, you can read its word.
//   EVERYTHING ELSE   bound by FREQUENCY. `the` and `is` are in almost every
//              beat, so they resolve by repetition and context — which is how
//              language learning actually feels, and why no mechanic teaches
//              them.
//
// ⚠️ EXPOSURE IS DERIVED, NOT STORED. Where you have been is already in
// `state.held`, and a beat is a place — so the set of beats you have read
// is exactly the beats at the concepts you hold, and counting words across them
// needs no save field and cannot desynchronise from the board. A stored counter
// would be a second source of truth for a fact the save already holds.
import type { GameState } from './types';
import { STORY } from '../content/story';
import { LANGUAGE } from '../content/language';
import { SEED_NODES } from '../content/seed';

/** Times a word must have appeared in front of the player before it reads as
 *  English. Three: once is noise, twice is coincidence, three times in
 *  different sentences is a pattern — and the commonest words cross it almost
 *  immediately, which is the point. */
export const LEARN_AT = 3;

const WORD = /[A-Za-z][A-Za-z'-]*/g;

/** Every English word inside a beat's prose, spans excluded.
 *
 *  Spans are concepts and are bound by discovery, not by exposure; counting
 *  them here would let reading about a concept teach you its name. */
function carrierWords(text: string): string[] {
  return (text.replace(/⟦[^⟧]*⟧/g, ' ').match(WORD) ?? []).map((w) => w.toLowerCase());
}

/** How often each carrier word has appeared in the beats the player has stood
 *  in. Computed over the concepts held, so it grows exactly as they travel. */
export function exposure(state: GameState): Map<string, number> {
  // ⚠️ THE SEED DOES NOT COUNT. The player wakes holding five concepts, and
  // "VISIBLE, NOT READABLE" is the whole opening — the nodes are on screen, the
  // words are not. Counting their beats gave five beats of prose at t=0, which
  // pushed `the`, `is` and `you` past the threshold before the first tap and
  // rendered the opening in plain English. Measured: the first screen read
  // "Under power the tree stops. Whatever you take from here does not divide
  // again" — the exact thing this was built to stop.
  //
  // Exposure is what you have READ BY TRAVELLING, so it starts at nothing.
  const held = new Set(bound(state));
  const seen = new Map<string, number>();
  for (const beat of STORY.beats) {
    if (!held.has(beat.at)) continue;
    const fields = [beat.title, beat.body, ...beat.choices.map((c) => c.label)];
    for (const f of fields) {
      for (const w of carrierWords(f)) seen.set(w, (seen.get(w) ?? 0) + 1);
    }
  }
  return seen;
}

/** Concepts whose word the player can READ, as opposed to hold.
 *
 *  The seed is held and not bound. A seed word becomes readable by arriving at
 *  its concept from somewhere else — the cross-link labyrinth loops back — which
 *  is why this is `held` MINUS the seed rather than a stored flag. */
export function bound(state: GameState): number[] {
  const seed = new Set(SEED_NODES);
  return state.held.filter((id) => !seed.has(id));
}

/** The carrier words the player can now read. */
export function knownWords(state: GameState): Set<string> {
  const out = new Set<string>();
  for (const [w, n] of exposure(state)) {
    if (n >= LEARN_AT && LANGUAGE.words[w]) out.add(w);
  }
  return out;
}

/** Can the player read this English word?
 *
 *  A word the corpus has no foreign form for is readable by default: there is
 *  nothing to hide it behind, and blanking it would be inventing a word. */
export function canRead(known: Set<string>, english: string): boolean {
  const w = english.toLowerCase();
  return !LANGUAGE.words[w] || known.has(w);
}
