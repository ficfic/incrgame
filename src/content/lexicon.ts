// THE GRAPH'S OWN WORDS.
//
// 4,096 generated words, one per node id, morphology following the taxonomy:
// `ka` is entity, its children are `ka-ta` / `ka-sa` / `ka-va`, and their
// children extend the prefix again — `ka-sa-le`, then `ka-sa-le-then`.
//
// ⚠️ NEVER TRUNCATE OR ELLIPSIZE THESE. The shared prefix IS the mechanic: two
// unknown words starting `ka-sa-` are visibly kin, and a player can read the
// shape of the tree before they can read a single word in it. Cutting the tail
// off `ka-sa-le-then` deletes exactly the information the system exists to
// carry.
import data from '../../docs/graph/lexicon.json';

export interface Lexicon {
  concepts: number;
  /** Indexed by node id. */
  words: string[];
}

export const LEXICON: Lexicon = data as Lexicon;

/** The graph's word for a concept. Falls back to a prefix-free placeholder
 *  rather than an empty string: a blank in the middle of a sentence reads as a
 *  rendering bug, and this system's whole claim is that the sentence still
 *  parses when you cannot read the nouns. */
export function graphWord(nodeId: number): string {
  return LEXICON.words[nodeId] ?? 'ka';
}
