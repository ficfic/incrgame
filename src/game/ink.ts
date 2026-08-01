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

/** The board's palette. Names are what the thing IS, not what it looks like. */
export const INK = {
  // the page
  back: '#080d13',

  // dots, by state — the state a place is in outranks the kind it is
  dot: '#2b3a49',        // drawn, but not reached
  known: '#6d8ba0',      // reached, or named
  open: '#78e8c0',       // a way you can afford from here
  shut: '#f0b45f',       // a way you cannot
  you: '#8ff0cf',        // where you are standing
  ring: '#eafff7',       // the selection ring, which outranks everything

  // edges, by relation
  route: '#4d6b80',
  unmade: '#22333f',
  // ⚠️ NOT THE SAME AS `you`, AND IT USED TO BE. Both were #8ff0cf, so the
  // probe's "is the road filling?" check was also counting the dot you are
  // standing on — which is always there. The check would have passed with
  // nothing filling at all. Found by `test/ink.test.ts` the day it was written.
  fill: '#b9ffe8',       // the way being made, filling
  // ★ WHAT THE ROUTE IS CARRYING. Income is max-flow from your settled places
  // to where you stand (`flow.ts`), and the width of this underlay is that
  // flow — so a road running at its limit is a road you can SEE needs a second
  // one beside it. The one readout in this game that could not exist without
  // the adjacency, drawn in the one place the player is already looking.
  flowing: '#e8a13c',
  stands: '#2f5568',
  means: '#2b4356',
  doing: '#3f7d6b',
  has: '#2b4356',
  carries: '#2b4356',

  // the ground
  wood: '#123f1c',
  moor: '#3d3520',
  crag: '#5a5348',
  under: '#523a60',
  stone: '#6a6259',
  river: '#24607f',
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
 *  against `Kind` to avoid a cycle — `test/ink.test.ts` checks every kind is
 *  present, which is the same guarantee with none of the import knot. */
export const LOOK: Record<string, Look> = {
  place: { fill: 'dot', lit: 'known', label: 'known', r: 3.5 },
  you: { fill: 'you', label: 'ring', r: 5.5 },
  doing: { fill: 'back', ring: 'open', label: 'doing', r: 5.5 },
  fact: { fill: 'back', ring: 'known', label: 'known', r: 5.5 },
  item: { fill: 'back', ring: 'open', label: 'open', r: 5.5 },
  concept: { fill: 'dot', lit: 'known', label: 'known', r: 5.5 },
};
