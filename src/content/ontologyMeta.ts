// Facts about the shipped concept dataset that the ENGINE needs to know.
//
// The engine must stay pure and must not fetch anything, but it does need one
// number: how big the world is, so coverage has a real denominator and
// recovery can stop at the edge of it instead of looping.
//
// Kept in sync with public/ontology/index.json by a test, so the two can never
// silently disagree. Regenerating the dataset means updating this constant.
export const CONCEPT_BUDGET = 4096;

/** Where that number comes from — rendered as the in-game credit. */
export const ONTOLOGY_SOURCE = 'Open English WordNet';
