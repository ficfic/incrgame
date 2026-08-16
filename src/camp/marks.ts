// THE MARKS — one icon per thing, named once.
//
// ★★ THE OWNER, 2026-08-09, on the deed dock: *"too much prose there, please
// icons and indicators."* The cards read like sentences — "55 stone · 33
// planks → holds 300 of each · 3 standing", "dangerous — goblins, 18 strong"
// — which is a lot of words to parse for what is really four numbers.
//
// ⚠️ THIS FILE EXISTS SO THE HUD AND THE DOCK CANNOT DRIFT. The HUD already
// spelled its own goods with emoji inline; a second hand-typed set in the
// deeds is how the board came to say "25 nodes" beside a HUD saying "3
// recovered". One table, read by both.
//
// Pure data. Nothing here imports the game.

/** What a good looks like, wherever it is named.
 *
 *  ⚠️ THESE STAY PICTORIAL, AND A MONOCHROME SET WAS TRIED AND REJECTED ON
 *  2026-08-15. During the look pass they were swapped for map-key glyphs —
 *  `◆` stone, `≡` planks, `▣` room — which sat on the parchment beautifully
 *  and could not be told apart at 11px: `◆25 ≡15 → ▣120` is a cipher. The
 *  owner's own ruling is why the emoji are here at all (*"too much prose
 *  there, please icons and indicators"*, 2026-08-09) and the complaint
 *  underneath it, over and over, is not being able to tell what something
 *  means. Tone loses to legibility.
 *  What the look pass DID fix is where they appear: a mark is decoration
 *  wherever the word is already on screen (the HUD captions its cells, so
 *  the rate under FOOD carries no `🌾`), and it is calmed by `.marked` in
 *  `Camp.svelte` so it sits on the paper instead of shouting off it. */
export const MARK = {
  stone: '🪨',
  logs: '🪵',
  planks: '🟫',
  food: '🌾',
  people: '👤',
  huts: '🏠',
  hero: '⚔️',
  carts: '🛞',
  /** How much a store can hold. */
  room: '📦',
  /** Seconds of work before a thing is done. */
  time: '⏱',
  /** Held ground, and how strong it is. */
  danger: '☠',
  /** Damage taken, as opposed to damage dealt (`hero`). */
  bite: '🩸',
  /** Work being thrown away — the choke, and the full store. */
  waste: '⚠',
} as const;

/** ★★★ SIX GOODS SINCE 2026-08-11. The owner: *"i'm not sure why you're so
 *  focused on existing resource pool, can't we extend it."*
 *
 *  It had been held at four on a research reviewer's argument — that the
 *  bottleneck was road-shaped rather than variety-shaped, since a maxed town
 *  threw away 76% of its output at the paths. That measurement was taken
 *  BEFORE this pass raised the plank ceiling, made carts eat three goods and
 *  put people on the war, so it no longer describes the game. */
export type Good = 'stone' | 'logs' | 'planks' | 'food';

/** `🪨11` — a cost, or any bare amount of a good. */
export const amount = (good: Good, n: number): string =>
  `${MARK[good]}${Math.round(n * 10) / 10}`;

/** ★ `🪨3/11` — WHAT YOU HAVE OVER WHAT IT WANTS. The old form was
 *  "11 stone — you have 3", eight words for two numbers, and it did not
 *  match `👤4/6` in the HUD one row above it. Same shape now. */
export const outOf = (good: Good, have: number, need: number): string =>
  `${MARK[good]}${Math.floor(have)}/${Math.round(need)}`;

/** A price, as marks: `🪨55 🟫33`. */
export const price = (p: Partial<Record<Good, number>>): string =>
  (Object.entries(p) as [Good, number][])
    .filter(([, v]) => v > 0)
    .map(([k, v]) => amount(k, v))
    .join(' ');

/** `×4` — how many of a thing already stand. */
export const times = (n: number): string => `×${n}`;
