// EVERY COLOUR IN THE GAME, IN ONE PLACE.
//
// ⚠️ THIS EXISTS BECAUSE A COLOUR USED TO LIVE IN FOUR FILES. `#4d6b80` was in
// `Board.svelte`, in `scripts/play-tabs.mjs` and in `test/terrain.test.ts`;
// `#8ff0cf` added `Game.svelte`. Changing one meant four edits, and — the part
// that actually mattered — **the probe could drift from the app and still
// pass**, because it would go on counting pixels of a colour the app had
// stopped drawing and find none of them missing.
//
// So: the app reads this, the probe reads it OFF THE RUNNING PAGE (`window.__INK`
// in `Game.svelte`), and `test/ink.test.ts` holds the distances between them.
// One definition, one check, no drift.

/** The board's palette. Names are what the thing IS, not what it looks like.
 *
 * ★★ A HIKING MAP ON PAPER, 2026-08-02. The owner: *"maybe we should move from
 * dark theme design to full blown hiking all trails maps.me look… can you try
 * it."* So: warm paper, brown contours, green woodland, blue water, and a trail
 * network you could read in sunlight.
 *
 * ⚠️ WHAT THE OLD DARK PALETTE WAS FOR, so a future session knows what was given
 * up. It was built to make a glowing graph legible on a phone at night, and
 * every ink was a light on black. Nothing about the GAME wanted that — it was
 * the look the first prototype happened to have. What the dark theme genuinely
 * bought was contrast for free: on black, anything bright reads. On paper it has
 * to be earned, which is why several of these are darker and more saturated than
 * they look like they should be.
 */
export const INK = {
  // the paper
  back: '#f2ece0',

  // dots, by state — the state a stop is in outranks the kind it is
  dot: '#a1907a',        // drawn, but not reached
  known: '#3f3a33',      // reached, or named
  open: '#1f7a3f',       // a road you can lay from here
  shut: '#c8781a',       // one you cannot yet
  you: '#d63b26',        // where you are standing — the red pin every map has
  ring: '#12203a',       // the selection ring, which outranks everything

  // roads, by state
  /** A built road: the solid brown of a made-up track on an OS sheet. */
  route: '#7a4a22',
  /** A route that is only dotted on the plan — a right of way, not a road. */
  unmade: '#8d8a80',
  // ⚠️ NOT THE SAME AS `you`, AND IT USED TO BE. Both were #8ff0cf in the dark
  // palette, so the probe's "is the road filling?" check was also counting the
  // dot you are standing on — which is always there. The check would have passed
  // with nothing filling at all. Found by `test/ink.test.ts` the day it was
  // written, and the constraint survives the repaint.
  fill: '#e2622e',       // the road being made, filling
  flowing: '#e8a13c',
  barred: '#b03050',
  foe: '#8f2f22',

  // what joins things on the tabs that are not the map
  stands: '#5b7f96',
  means: '#6d7f8e',
  doing: '#2e7d63',
  has: '#6d7f8e',
  carries: '#6d7f8e',

  // the ground
  /** ★ THE CONTOUR LINES, in the brown every topographic map prints them in. */
  relief: '#c08a52',
  wood: '#5f9c52',
  moor: '#cbbf88',
  crag: '#8c8272',
  under: '#8a6fa8',
  stone: '#b6ad9b',
  river: '#4f9fc4',
  /** ★ THE LINE AROUND A REGION — *"an oval with a forest inside"*. A stronger
   *  relative of each ground, so the outline reads as a boundary rather than as
   *  one more contour. */
  edgewood: '#2f7a34',
  edgecrag: '#7a6f5c',
  edgemoor: '#a8964a',
  edgewater: '#1f7fae',
} as const;

export type InkName = keyof typeof INK;

/** ⚠️ THE INKS THE PROBE COUNTS PIXELS OF, and HOW PRECISELY it may count each.
 *
 *  The tolerance belongs next to the colour, not in the probe. A blanket
 *  distance would be the wrong rule — anti-aliasing means a thin line needs a
 *  loose match to be found at all, while two similar colours need a tight one to
 *  be told apart. So each ink says how wide a net may be cast for it, and
 *  `test/ink.test.ts` holds every counted pair further apart than the wider of
 *  their two nets. That is the property that makes counting pixels mean
 *  anything, and it is checkable.
 *
 *  ⚠️ Writing this down caught two ambiguities that had been shipping: `known`
 *  was the SAME HEX as `route`, so counting made roads also counted reached
 *  places; and `fill` sits 23 from `open`, which is fine at a tolerance of 10
 *  and was not fine at the 20 the probe had been using. */
export const TOL: Partial<Record<InkName, number>> = {
  route: 14,
  unmade: 6,
  fill: 10,
  ring: 18,
  dot: 6,
  open: 10,
  flowing: 12,
  barred: 12,
  foe: 10,
  // ⚠️ THE SCENERY IS COUNTED TOO, AND IT WAS NOT LISTED HERE. The probe counts
  // contour, region outline and ground pixels with a DEFAULT net of 12 — so
  // those inks were subject to the same confusion as the listed ones and had
  // none of the protection. That is exactly how the first contour colour came
  // to sit 9 from `moor` and make its own check vacuous. Listed, so the test
  // holds them apart.
  relief: 12,
  edgewood: 12,
  edgecrag: 12,
  edgemoor: 12,
  edgewater: 12,
  moor: 12,
  crag: 12,
  wood: 12,
  river: 12,
};
export const COUNTED = Object.keys(TOL) as InkName[];

/** The widest net cast for anything, and therefore how far a NEW colour must
 *  stay from every counted one. */
export const APART = Math.max(...Object.values(TOL) as number[]);

// ---- how a node looks ----------------------------------------------------
//
// ⚠️ THIS WAS AN IF-CHAIN IN TWO LANGUAGES: five `d.kind === …` branches in
// `Board.svelte`'s `dotStyle()` and a matching pile of `.node[data-kind='…']`
// rules in its CSS. Every new kind of node meant an edit in both, in different
// syntaxes, with nothing checking they agreed. A table is read by both.

export interface Look {
  /** The dot's fill when the player has NOT reached or learned it. */
  fill: InkName;
  /** ⚠️ THE FILL ONCE IT IS KNOWN, for kinds where that distinction exists —
   *  places you have reached, notions you have thought. Leaving it off makes a
   *  kind stateless, which is right for a fact or the dot you are standing on
   *  and WRONG for anything the player discovers.
   *
   *  Written explicitly because collapsing it lost the distinction once: the
   *  first version of this table gave `concept` a single fill, so every notion
   *  on Thoughts drew the same whether you had thought it or not — the whole
   *  way that tab shows progress. The probe read `0px thought` and caught it. */
  lit?: InkName;
  /** An outline, for things that are not places. */
  ring?: InkName;
  /** The label's colour. */
  label: InkName;
  /** Radius, when the node carries no state that overrides it. */
  r: number;
}

/** Keyed by `Kind` from `world.ts`. Kept as a plain record rather than typed
 *  against `Kind` to avoid a cycle — `test/ink.test.ts` imports the runtime
 *  `KINDS` and checks every one is present, which is the same guarantee with
 *  none of the import knot. */
export const LOOK: Record<string, Look> = {
  stop: { fill: 'dot', lit: 'known', label: 'known', r: 3.5 },
  you: { fill: 'you', label: 'ring', r: 5.5 },
  doing: { fill: 'back', ring: 'open', label: 'doing', r: 5.5 },
  fact: { fill: 'back', ring: 'known', label: 'known', r: 5.5 },
  carry: { fill: 'back', ring: 'open', label: 'open', r: 5.5 },
};
