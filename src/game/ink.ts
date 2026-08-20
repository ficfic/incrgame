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
  shut: '#b3600a',       // one you cannot yet
  you: '#d63b26',        // where you are standing — the red pin every map has
  ring: '#12203a',       // the selection ring, which outranks everything

  // the flows, by state
  /** ★ AN OPEN FLOW — 2026-08-04, the owner: *"i don't like the pipe wording
   *  and brown colors, we are building mana flows."* The brown OS-track ink is
   *  gone: a flow is a channelled current of mana, drawn in a deep arcane
   *  teal no natural feature on this map uses. */
  /** ★ A ROAD IS EARTH, NOT WATER — 2026-08-11. It was #1d7f86, a teal that
   *  the owner read as blue and could not place: *"once the colour of a
   *  dotted line is finalized, the part is still blue. I don't understand
   *  that color choice."* On a board whose one strong blue is the river, a
   *  blue-green road is a stream. Brown is what a track is.
 *
 *  ⚠️ AND NOT NEARLY BLACK EITHER, 2026-08-11: the first brown was #4a3524,
 *  dark enough that the owner read it as black — *"I don't understand why the
 *  paths are black now. I don't think black is a good choice."* This is a
 *  three-way fit, not a colour pick: it has to be earth rather than water,
 *  light enough to read as brown, and far enough from `fill` (the ink for a
 *  road still being dug) to clear the palette gate under colour blindness.
 *  That last constraint is what pushed it dark in the first place. */
  route: '#5c432c',
  /** ★ THE CASING UNDER IT — the near-black outline every real map draws first,
   *  then lays the coloured core over. It is most of why a printed map's lines
   *  read as LINES and ours read as strokes: the casing separates the flow from
   *  whatever ground it crosses, whatever colour that ground is. Teal-black
   *  now, matching the current it cases. */
  casing: '#0c353b',
  /** A route that is only dotted on the plan — a right of way, not a road. */
  unmade: '#8d8a80',
  /** ★ THE BARRIER, 2026-08-09 — the line around the ground you hold, after
   *  Mayor of Noobtown's ward (the owner: *"yeah in noobtown he's had a
   *  barrier"*). ⚠️ DELIBERATELY NOT THE MOCK'S TEAL: `route` is teal and the
   *  probe counts it, so a large teal fill would have silently corrupted the
   *  "is the road filling?" pixel check — the exact trap `docs/NEXT.md` warns
   *  about. Violet is 56 from its nearest counted ink, measured. */
  ward: '#6e2f5e',
  // ⚠️ RETUNED 2026-08-10, and NOT to taste — measured. The owner said only
  // *"the colors are also a little bit strange"*, which is not actionable on
  // its own, so the palette was audited against two things a number can
  // settle: WCAG contrast on the parchment, and whether inks that mean
  // OPPOSITE things survive colour blindness.
  //
  //   `shut` #c8781a → #b3600a. The choke warning sat at 2.90 contrast,
  //   below the 3.0 floor for a graphic — a warning you have to hunt for.
  //   Now 3.89, and still the same amber family.
  //
  //   `ward` #6b4a9e → #6e2f5e. The barrier and a finished road were 21
  //   apart under deuteranopia and protanopia — violet and teal collapse
  //   into each other — so the line around your own country read as another
  //   road. Now 50 apart at the worst of the two, contrast 8.00, and still
  //   clear of `barred` (38) and `foe` (42).
  //
  // Both still clear every counted ink by that ink's own net; `test/ink.test.ts`
  // enforces that and was run against these values.
  //
  // ⚠️ NOT CHANGED, though it measures worst of all: `flowing` reads 1.06
  // against the parchment. It is drawn OVER the road's casing and core, never
  // on bare ground, so contrast-against-paper is the wrong measure for it.
  // Recorded so the next audit does not "fix" a colour that is correct.
  // ⚠️ NOT THE SAME AS `you`, AND IT USED TO BE. Both were #8ff0cf in the dark
  // palette, so the probe's "is the road filling?" check was also counting the
  // dot you are standing on — which is always there. The check would have passed
  // with nothing filling at all. Found by `test/ink.test.ts` the day it was
  // written, and the constraint survives the repaint.
  /** ★★ A WAY BEING MADE — TURNED EARTH, NOT A ROAD. 2026-08-10, the owner:
   *  *"the path color when it is building, it is blue. I don't understand why
   *  it is blue. And when it's finished, it's dark blue."* It was `#3ec6da`, a
   *  bright arcane cyan — the SAME FAMILY as `route` (the finished way) and
   *  `flowing` (what runs through it), so the board drew three unrelated facts
   *  in three shades of one colour and none of them said which was which.
   *
   *  Now it is spoil: the dug bed before anything is laid in it, hatched
   *  rather than solid (`Board.svelte`). Three hues, three facts — earth is
   *  being dug, teal is a made road, pale cyan is what it carries, amber is a
   *  choke — and the choke amber survives because earth is nowhere near it.
   *
   *  ⚠️ MEASURED BEFORE IT WAS CHOSEN, because `fill` IS COUNTED (tol 10) and a
   *  brown palette is a crowded one. Max per-channel distance to its nearest
   *  neighbours: `foe` 43, `barred` 48, `edgebog` 53, `relief` 54 (the contour
   *  brown), `edgecrag` 60, `edgemoor` 60, `shut` 62 (the choke amber), `wood`
   *  66. Nearest of all is 43 against a needed 12 — the old cyan's nearest was
   *  `river` at 39. Every pair is checked by `test/ink.test.ts`. */
  fill: '#8a5a20',
  /** ★ THE CURRENT ITSELF — 2026-08-05, the owner: *"the mana is orange dots
   *  over blue channel. I don't understand why they're orange."* They were
   *  brass-era amber. Mana light now: a pale luminous cyan riding inside the
   *  teal, the same family as the fill it becomes. */
  flowing: '#bfeef5',
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
  bog: '#8aa06a',
  edgebog: '#55703a',
  /** ★ THE SEA, along the map's western edge, and the BEACH line where it meets
   *  the land. Decor with a promise in it: *"the sea somewhere and beaches"* —
   *  the first thing on this map not centred on a stop. */
  sea: '#9cc7de',
  beach: '#d9b45f',
  /** ★ THE FOG OF WAR — uncharted parchment, not blackout (the owner queued it
   *  in exactly those words). Drawn OPAQUE with soft holes cut around every
   *  stop you have stood at and along every pipe, so what you know reads as a
   *  chart and what you do not reads as the paper it will be drawn on. Near
   *  `back` on purpose — it is the same paper, unmapped — but far enough on
   *  the blue channel that a counted pixel is fog and never bare page. */
  fog: '#e7dcc0',
} as const;

/** ★★★ THE CHROME'S PALETTE — 2026-08-15. Everything that is NOT the map.
 *
 *  ⚠️ THIS EXISTS FOR THE SAME REASON `INK` DOES, one layer up. `INK` made the
 *  BOARD one system and left the furniture alone, so `Camp.svelte` grew its
 *  own palette by accretion: **33 distinct hex values**, including four pairs
 *  a person cannot tell apart (`#e6dfcf` and `#e3ddd0` were both "a face you
 *  cannot press"), and a red — `#b3452f` — that belonged to no map ink at
 *  all. A map drawn from a measured palette, framed in chrome drawn from
 *  none, is exactly the incoherence the owner asked to fix.
 *
 *  ⚠️ AND IT IS NOT A REPAINT. Nearly every value here was already on screen
 *  and several were tuned against measured contrast (see the audit note in
 *  `INK`). What changed is that there is now ONE of each, with a name saying
 *  what it is FOR, so the next screen cannot invent a thirty-fourth. The
 *  greens and the parchments are pulled onto `INK`'s own where they were
 *  within a hair of it.
 *
 *  Written onto `:root` at runtime by `Camp.svelte`, so the stylesheet says
 *  `var(--card)` and never a hex. `test/look.test.ts` holds that line. */
export const PAPER = {
  /** The page behind everything. */
  page: '#efe9dc',
  /** The sheet that rises over the board. */
  panel: '#f7f2e7',
  /** A face you can press. */
  card: '#fdfaf2',
  /** A face you cannot — priced out, already done, held by goblins. */
  sunk: '#e6dfcf',
  /** What the phone column casts onto the desk behind it. */
  shadow: 'rgb(0 0 0 / 0.13)',
  /** The desk the phone column sits on, when the window is wider than one. */
  offpage: '#e3dccb',
  /** The band the dock sits in. */
  dock: '#f2ecdd',
  /** A structural edge — the panel's top, the phone's sides. */
  edge: '#d8d0bf',
  /** A hairline INSIDE something: cell to cell, card border. */
  rule: '#e2d9c3',

  /** A number you are meant to read first. */
  ink: '#2c2822',
  /** Running text. */
  text: '#4a4030',
  /** A label, a unit, a standing figure. */
  soft: '#6b5d3f',
  /** A note under a deed — present, not competing. */
  faint: '#8a8172',
  /** A ceiling, a caption. The quietest thing that is still a word. */
  dim: '#9a8f79',
  /** Disabled ink. */
  off: '#c9c1ae',

  /** ★ YES — made, afforded, ours. `INK.open`, the same green the board
   *  draws a road you can lay in, because they mean the same thing. */
  moss: INK.open,
  /** The same green, one step down, for text on parchment. */
  mossInk: '#1f6b3a',
  /** A field of it — the away line, our own square, the win. */
  mossWash: '#eef5ec',

  /** ★ NO — full, starving, hurt, lost. Held one step off `INK.foe` on
   *  purpose: the map's red is the goblins themselves, and a full store is
   *  not a goblin. */
  rust: '#b3452f',
  /** A field of it — a wound, a wind-up. */
  rustWash: '#f7e9e5',

  /** ★ THEM — a goblin square in the strip. Earth, not blood: the strip is
   *  furniture and the map owns the strong red. */
  clay: '#7a4a2f',
  /** A field of it — the square you have aimed at. */
  clayWash: '#f4ead9',
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
  casing: 12,
  edgewood: 12,
  edgecrag: 12,
  edgemoor: 12,
  edgewater: 12,
  moor: 12,
  crag: 12,
  wood: 12,
  river: 12,
  sea: 12,
  beach: 12,
  fog: 10,
  ward: 12,
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
  /** ★ THE WAY's own marks. A waypoint is a small survey dot on the leg; a
   *  halt is the thing still ahead of the crew, in the same amber as a road
   *  you cannot take yet — trouble you can SEE COMING now, not an interrupt. */
  way: { fill: 'dot', label: 'known', r: 2.6 },
  halt: { fill: 'shut', ring: 'casing', label: 'known', r: 5 },
  /** A fight, met: the red every map gives danger. */
  foe: { fill: 'foe', ring: 'casing', label: 'known', r: 6 },
};

/** ★★★ THE LAMP — the delve's palette, 2026-08-17.
 *
 *  The owner, on the look of the dungeon: *"go full on the dungeon crawler,
 *  can we make something interesting in terms of looks?"* — and then picked
 *  LAMPLIGHT AND CHAMBERS off the brainstorm.
 *
 *  ⚠️ `PAPER` WAS A HIKING MAP AND IT SHOWED. Cream ground, moss-green dots,
 *  a little walking figure: the delve inherited the valley's palette wholesale
 *  at the pivot and read like a trail app that had wandered underground. Wrong
 *  mood at the level of the first pixel, and no amount of copy fixes that.
 *
 *  ★ THE SAME KEYS AS `PAPER`, so every panel rule written against `--page`,
 *  `--ink`, `--faint` and the rest keeps working with no CSS churn — this is a
 *  palette swap, not a rewrite. What is new below the fold is the STONE: the
 *  colours the dungeon canvas carves rock and floor and lamplight out of.
 *
 *  ⚠️ AND THE LIGHT FALLS OFF IN DOORS, NOT PIXELS. `lit`/`near`/`far` are
 *  chosen for a room you STAND in, a room one door away, and a room you only
 *  remember — because everything else in this game measures distance in doors
 *  and a lamp that disagreed with the fog would be lying about the rules. */
export const LAMP = {
  page: '#0b0a09',
  panel: '#14120f',
  card: '#1d1a15',
  sunk: '#131110',
  shadow: 'rgb(0 0 0 / 0.55)',
  offpage: '#070606',
  dock: '#12100e',
  edge: '#2e2a22',
  rule: '#241f1a',

  ink: '#ece3cf',
  text: '#cdc3ad',
  soft: '#9d9078',
  faint: '#7d7565',
  dim: '#635c4f',
  off: '#3d382f',

  moss: '#6d8f5a',
  mossInk: '#8fae74',
  mossWash: '#171c13',

  rust: '#c2543c',
  rustWash: '#241310',

  /** ★ THEM. The strongest thing on a dark screen, and nothing else gets it. */
  clay: '#c2543c',
  clayWash: '#231310',
} as const;

/** ★★★ THE STONE. What the dungeon canvas is drawn out of — floor and wall at
 *  each of the three distances the lamp knows, plus the rock between. */
export const STONE = {
  /** Living rock. Everything that is not a room or a passage. */
  rock: '#0b0a09',
  /** The hatch scratched into it, so the dark is a MATERIAL and not an
   *  absence — a black rectangle reads as "not drawn yet". */
  scratch: '#17140f',

  /** The room you are standing in. Warm, because the lamp is here. */
  litFloor: '#3a2e20',
  litWall: '#caa468',
  /** One door away: you can see into it, barely. */
  nearFloor: '#221d16',
  nearWall: '#6d6353',
  /** Remembered. Chalk on slate — you know the shape, not what is in it. */
  farFloor: '#141210',
  farWall: '#443e34',

  /** ★★★ A CLAIM, NOT A PLACE. The one cold colour down here, and it is
   *  reserved for what a crawler REPORTED and nobody verified — dashed
   *  outlines and invented doors. Cold against warm is the whole legend: if
   *  the lamp is what you know, this is what you were told.
   *  Deliberately far from every stone tone so it can never be misread as a
   *  dim floor. */
  claim: '#4d6b78',

  /** ★ IRON. A door you wedged shut, and the only manufactured thing on a
   *  map otherwise made of rock and lamplight. */
  iron: '#8a7a5c',

  /** The lamp itself, and what it throws. */
  flame: '#f0cf87',
  glow: 'rgb(214 160 74 / 0.20)',
} as const;
