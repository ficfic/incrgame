// THE PLACES, TAKEN FROM THE AUTHORED CONTENT AND NOTHING ELSE.
//
// ⚠️ THE PROSE IS THE ONE THING WORTH KEEPING from the version this replaces.
// Thirty-seven places, every word of them written by hand, and the owner's own
// verdict on the generated version that preceded them was "no story or meaning
// behind them". So the regions stay exactly as they are and this file reads
// them down to the four fields the new loop actually uses.
//
// Everything else those files carry — skill demands, dice tests, item gates,
// XP payouts — is deliberately IGNORED here. Eleven systems that each passed
// their own tests and did not add up to a game is what we are undoing.
import { PLACES as AUTHORED, PLACE as BY_ID } from '../slice/content';

export interface Place {
  id: number;
  name: string;
  /** 40–70 words. What you get for arriving. */
  body: string;
  /** Where you can go from here. Both directions, always symmetric. */
  ways: number[];
  /** The one thing you can do here, if there is one — hand-authored, with its
   *  own duration and payout. See `SKILL` below for why most places have none. */
  work?: { label: string; secs: number; xp: number };
}

/** ★ THE ONE SKILL THAT EXISTS, and therefore the only work on offer.
 *
 *  The regions carry 34 work blocks across five named skills — 11 wayfaring,
 *  7 craft, 7 attunement, 6 lore, 3 guile. Turning on all 34 would mint XP into
 *  four skills that change nothing, which is a promise the engine does not
 *  keep; `docs/TABS.md` has the long version and it is the eleven-systems
 *  lesson. So one skill's blocks are live and the rest wait for the levers
 *  they turn.
 *
 *  ⚠️ AND IT IS NOT AN ACCIDENT THAT THIS THINS THE MAP OUT. Eleven places in
 *  thirty-seven offer work, so where you stand decides whether you have a
 *  choice to make at all. */
export const SKILL = 'wayfaring';

export const START = 0;

/** ⚠️ WAYS ARE SYMMETRIC, and the authored content is not. A choice in the
 *  regions is one-directional — `The Cut -> The Weir` does not imply the way
 *  back — because the old model priced each crossing separately. In a game
 *  where movement costs a shared resource, a one-way edge you cannot afford to
 *  leave is a trap, and "failure is a plateau, never a loss screen" is the one
 *  rule that has survived every rewrite. So every edge goes both ways. */
const ways = new Map<number, Set<number>>();
for (const p of AUTHORED) {
  if (!ways.has(p.id)) ways.set(p.id, new Set());
  for (const c of p.choices) {
    if (!ways.has(c.to)) ways.set(c.to, new Set());
    ways.get(p.id)!.add(c.to);
    ways.get(c.to)!.add(p.id);
  }
}

export const PLACES: readonly Place[] = AUTHORED.map((p) => ({
  id: p.id,
  name: p.name,
  body: p.body,
  ways: [...(ways.get(p.id) ?? [])].sort((a, b) => a - b),
  work: p.work && p.work.skill === SKILL
    ? { label: p.work.label, secs: p.work.secs, xp: p.work.xp }
    : undefined,
}));

/** Kept so a test can assert the filter is doing something rather than nothing
 *  — a `SKILL` naming a skill no block uses would silently turn work off. */
export const WORKED = PLACES.filter((p) => p.work).map((p) => p.id);

export const PLACE = new Map(PLACES.map((p) => [p.id, p]));

export const nameOf = (id: number): string => PLACE.get(id)?.name ?? '—';

/** Kept so a test can assert the two files have not drifted apart. */
export const AUTHORED_COUNT = BY_ID.size;
