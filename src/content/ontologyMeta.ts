// Facts about the shipped concept dataset that the ENGINE needs to know.
//
// The engine must stay pure and must not fetch anything, but it does need two
// numbers: how big the world is, and how much of it a player could ever read.
//
// Kept in sync with public/ontology/index.json and public/story/*.json by
// tests, so neither can silently disagree with the data. Regenerating either
// dataset means updating the constants here and watching the test fail first.
export const CONCEPT_BUDGET = 4096;

/** THE DENOMINATOR UNDER `Words N / M`.
 *
 *  Concepts a player could ever arrive at, walking lanes from the seed and
 *  respecting every gate — measured against the shipped story graph, not
 *  assumed. It is 21 short of CONCEPT_BUDGET: 16 concepts no lane reaches, plus
 *  the 5 seed concepts, which are held from the first frame and become readable
 *  only by arriving at them from somewhere else.
 *
 *  This exists because the review found the HUD's only fraction had no real
 *  denominator. A percentage against a number nobody can reach is a score
 *  against a moving target. */
export const READABLE_CONCEPTS = 4075;

/** Where that number comes from — rendered as the in-game credit. */
export const ONTOLOGY_SOURCE = 'Open English WordNet';
