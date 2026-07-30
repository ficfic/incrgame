// SIX PLACES SOMEBODY WROTE.
//
// ⚠️ THIS IS THE WHOLE CORRECTION. The last build generated 4,096 places from a
// taxonomy and authored prose for 50 of them — 1.2% — and the owner's verdict on
// playing it was "just two choices which lead to more choices, but there is no
// story or meaning behind them" (`docs/RESET.md`). A hierarchy has no
// protagonist and no reversal, so no amount of it becomes a plot.
//
// So: six places, every word of them written, and a generator is not allowed
// near this file. `docs/VISION.md` rules it out by name.
//
// Prose here is a DRAFT for the owner to iterate on (CLAUDE.md — player-facing
// prose is machine-drafted and owner-edited). The bar is a line the owner would
// defend, and these have not had their pass yet.
import type { Place, Item, ItemId, Region } from './schema';
import { VALLEY } from './regions/valley';
import { WORKS } from './regions/works';
import { UNDER } from './regions/under';
import { STONES } from './regions/stones';

export type { Place, Choice, Item, ItemId, SkillId } from './schema';

/** ⚠️ ONE REGION PER FILE, ONE DISJOINT BLOCK OF IDS PER REGION. That is the
 *  entire rule that lets several people author places at the same time without
 *  standing on each other, and the tests enforce what it protects: no duplicate
 *  id, no dangling reference, no dead end, and everything reachable from the
 *  start once its gates are honoured.
 *
 *    valley     0-99     the opening
 *    works    100-199    off The Weir
 *    under    200-299    below Behind the Door
 *    stones   300-399    above The Stack
 */
const REGIONS: readonly Region[] = [VALLEY, WORKS, UNDER, STONES];

export const START = 0;

export const PLACES: readonly Place[] = REGIONS.flatMap((r) => r.places);

export const PLACE = new Map(PLACES.map((p) => [p.id, p]));

/** Every edge the board draws, both directions collapsed to one line. */
export const EDGES: ReadonlyArray<{ a: number; b: number }> = (() => {
  const seen = new Set<string>();
  const out: Array<{ a: number; b: number }> = [];
  for (const p of PLACES) {
    for (const c of p.choices) {
      const k = p.id < c.to ? `${p.id}:${c.to}` : `${c.to}:${p.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ a: p.id, b: c.to });
    }
  }
  return out;
})();

/** What a drop can be. Keys and passwords, per `BRIEF.md` ask 10 — a drop is
 *  worth wanting because it opens something you have already seen shut. */
export const ITEMS: Record<ItemId, Item> =
  Object.assign({}, ...REGIONS.map((r) => r.items)) as Record<ItemId, Item>;
