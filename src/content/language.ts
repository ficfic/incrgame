// THE REST OF THE LANGUAGE — everything that is not a concept.
//
// 245 word types: the verbs, prepositions and function words used across every
// beat. Concepts have their own words in lexicon.json, SHAPED DIFFERENTLY on
// purpose — concepts are multi-syllable and hyphenated with an inherited stem
// (`ka-ta-ra`), function words are short and unhyphenated (`kith`, `ve`). So a
// player can tell grammar from content by shape long before reading either,
// which is what makes an unreadable sentence still look like a sentence.
import data from '../../docs/graph/language.json';

export interface Language {
  /** Concepts the player wakes holding. NOT `entity`. */
  seed: string[];
  /** english → the graph's word. */
  words: Record<string, string>;
}

export const LANGUAGE: Language = data as Language;

/** The graph's word for an ordinary English word, or null if the corpus has
 *  none — an unknown word stays English rather than being invented on the spot. */
export function foreignWord(english: string): string | null {
  return LANGUAGE.words[english.toLowerCase()] ?? null;
}
