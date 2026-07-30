// THE SHAPE OF A PLACE. Types only, so a region file can import it without
// importing the region index and closing a circle.
//
// Regions live in `src/slice/regions/` and are concatenated by `content.ts`.
// One file per region, one disjoint block of ids per file — that is the whole
// collision rule, and it is why several people can write places at once.
export type SkillId = 'wayfaring' | 'lore' | 'craft' | 'guile' | 'attunement';

/** ⚠️ A STRING, not a union of literals. Items arrive with regions, and a
 *  union would mean every region file editing one shared type. Validity is
 *  checked at RUNTIME instead — `save.ts` refuses a save carrying an item that
 *  is not in `ITEMS`, and a test asserts every `needs`/drop names a real one. */
export type ItemId = string;

export interface Choice {
  /** Where it goes. */
  to: number;
  /** What the button says. A verb, always. */
  label: string;
  /** A skill check on the way. Failing does not block the move — it changes
   *  what you find, which is the only kind of failure this game has. */
  test?: {
    skill: SkillId; demand: number; win: string; lose: string;
    /** ⚠️ LOOT NAMES ITS OWN DROPS. This was `loot: true` and the engine held a
     *  hardcoded table of two VALLEY items, so a check in any other region
     *  minted a strip of lead — which meant every key the other regions gate
     *  their doors on could never enter the pack, and all of that content was
     *  unreachable. Found by the author of `works.ts`, who could not fix it
     *  because the engine was not theirs to edit.
     *
     *  `good` on a satchel roll of 8+ (79%), `poor` below it. */
    loot?: { good: ItemId; poor?: ItemId };
  };
  /** What you must already carry, or already be. Shown, never hidden. */
  needs?: { skill: SkillId; level: number } | { item: ItemId };
}

export interface Place {
  id: number;
  /** The name on the dot. Kept short — it hangs under the dot and a long one
   *  walks off the edge of a phone. */
  name: string;
  /** 40–70 words, and it never scrolls (`docs/GAME_DESIGN.md`). */
  body: string;
  choices: Choice[];
  /** A timed action offered here. One slot, repeatable. */
  work?: { id: string; label: string; skill: SkillId; secs: number; xp: number };
}

export interface Item { name: string; opens: string }

/** A region: some places, and the items they introduce. */
export interface Region {
  places: readonly Place[];
  items: Record<ItemId, Item>;
}
