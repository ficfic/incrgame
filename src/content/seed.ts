// WHAT THE PLAYER WAKES HOLDING.
//
// ⚠️ NOT `entity`. The opening was the root of the noun hierarchy — the most
// general word there is, with nothing above it and nothing strange about it.
// The seed is now five mid-graph concepts: system, agent, language, information
// and power. They are real WordNet concepts that happen to be this game's own
// subject, so the opening states the satire without a word of authored prose.
//
// VISIBLE, NOT READABLE. The nodes are on screen from the first frame; their
// words are not bound, so the board opens as five foreign names with lines
// between them. That is the whole opening: no HUD, no buttons, no English.
//
// The names come from docs/graph/language.json (`seed`) and are resolved to
// node ids here, once, against the shipped ontology — a hardcoded id list would
// silently point at the wrong concepts the next time the dataset is re-cut.
import { LANGUAGE } from './language';
import seedIds from '../../docs/graph/seed-ids.json';

export const SEED_NAMES: string[] = LANGUAGE.seed;

/** Node ids of the seed concepts, in the order the language file lists them. */
export const SEED_NODES: number[] = seedIds as number[];
