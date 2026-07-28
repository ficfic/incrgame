// Types for the rarity scorer. The scorer itself is plain `.mjs` because the
// content pipeline runs under bare node with no build step; this file exists so
// the test suite — which IS typechecked — can hold it to a contract.
export interface RarityFeatures {
  /** Hops from `entity` in the full noun hierarchy. */
  depth: number;
  /** Concepts beneath it in the full noun hierarchy. */
  descendants: number;
  /** Word forms in the synset. */
  synonyms: number;
  /** 1-based position among that label's noun senses (WordNet orders these by
   *  corpus frequency, which is the only frequency signal the source carries). */
  senseRank: number;
  /** How many noun senses the label has at all. */
  polysemy: number;
  /** Words in the label. */
  words: number;
  /** Non-is-a relations touching it in the full lexicon. */
  degree: number;
}

export interface Tier {
  id: number;
  name: string;
  /** Inclusive upper bound on the score. */
  upTo: number;
}

export const WEIGHTS: Record<keyof RarityFeatures, number>;
export const CAPS: Record<keyof RarityFeatures, number>;
export const TIERS: readonly Tier[];

/** 0..100, higher = more obscure. Integer. */
export function scoreRarity(f: RarityFeatures): number;
export function tierOf(score: number): number;
