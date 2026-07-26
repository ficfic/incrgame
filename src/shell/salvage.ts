// Rung 1, shell side: turning "Salvage" into something that is ABOUT something.
//
// Core cannot read the ontology — it is fetched at runtime and core is pure —
// so, exactly as `connect` already does, the shell picks real data and hands
// the engine a finished payload.
//
// ---- WHY SALVAGE DRAWS FROM THE BOARD ----------------------------------
//
// The obvious version samples anywhere in the 4,096-concept dataset. It does
// not work: extraction proposes relations between concepts that are ON the
// board, so passages about concepts you have never discovered would propose
// nothing, and the yield would read 45% while delivering zero forever.
//
// Drawing from your own board is also the truer story. You are not scraping the
// open internet; you are going back over the wreckage of what you have already
// found, looking for the relations you missed.
//
// And it makes the fork bite by itself, with no extra rule:
//
//   common ruins  → text about the COMMON core, which is already well
//                   connected, so it proposes fewer NEW relations
//   deep archives → text about the rim, which is where the unfilled lines
//                   actually are
//
// That is the head/tail distinction doing real mechanical work rather than
// being a number in a tooltip.
import type { Edge, SalvageSource } from '../core/types';

/** Weighted sample without replacement.
 *
 *  `weightOf` is taxonomic generality (`render/detail.ts`): high for `entity`
 *  and its immediate children, low out at the rim. The ruins want the head, so
 *  they sample on `w`; the archives want the tail, so they sample on `1 - w`.
 *
 *  `rand` is injected rather than called directly so this is testable and so
 *  nothing here reaches for a global source of randomness. */
export function samplePassages(
  anchors: readonly number[],
  weightOf: (id: number) => number,
  source: SalvageSource,
  count: number,
  rand: () => number,
): number[] {
  const pool = anchors.filter((id) => Number.isInteger(id) && id >= 0);
  if (pool.length === 0 || count <= 0) return [];

  // A floor, so no concept is ever unsalvageable — a zero-probability item in
  // a weighted draw is an item that does not exist, and the rim would vanish
  // from the ruins entirely rather than merely being rare.
  const FLOOR = 0.05;
  const bias = (id: number): number => {
    const w = Math.max(0, Math.min(1, weightOf(id)));
    return FLOOR + (source === 'archive' ? 1 - w : w);
  };

  const remaining = [...pool];
  const out: number[] = [];
  // Sampling WITH replacement across draws would be simpler, but salvaging the
  // same passage twice in one haul is not a thing, and it would let one heavy
  // concept eat an entire batch.
  for (let n = 0; n < count && remaining.length > 0; n++) {
    let total = 0;
    for (const id of remaining) total += bias(id);
    let r = rand() * total;
    let idx = remaining.length - 1; // fallback covers float drift at the top end
    for (let i = 0; i < remaining.length; i++) {
      r -= bias(remaining[i]!);
      if (r <= 0) { idx = i; break; }
    }
    out.push(remaining[idx]!);
    remaining.splice(idx, 1);
  }
  return out;
}

/** The relations an extractor can propose from the passages you hold.
 *
 *  Every candidate is a REAL relation from the shipped dataset — the same
 *  `potentialEdges` the dotted lines are drawn from. An extractor that invented
 *  relations would be a different mechanic (agents do that, and it is what the
 *  `fake` flag is for); this one reads text and proposes what the text
 *  supports.
 *
 *  The gate is the whole point: a relation is only proposable if you hold a
 *  passage about at least one of its ends. You cannot extract a fact from text
 *  you do not have. */
export function proposeCandidates(
  pool: readonly number[],
  potential: ReadonlyArray<{ a: number; b: number; rel: number }>,
  existing: readonly Edge[],
  room: number,
): Edge[] {
  if (room <= 0) return [];
  const have = new Set(pool);
  const drawn = new Set(existing.map((e) => `${e.a}:${e.b}:${e.rel}`));
  const out: Edge[] = [];
  for (const p of potential) {
    if (out.length >= room) break;
    if (!have.has(p.a) && !have.has(p.b)) continue;
    const key = `${p.a}:${p.b}:${p.rel}`;
    if (drawn.has(key)) continue;
    drawn.add(key);
    out.push({ ...p, checked: false, fake: false });
  }
  return out;
}
