// THE CHAPTER: A START, A FINISH, AND SEVERAL WAYS ACROSS.
//
// `docs/KINGS_ROADS.md`, the owner's design:
//
//   *"the goal of a chapter is to make a path end to end from the start to
//    finish, and dotted lines point to at least 5-6 options how you can do it"*
//   *"one path yeah, done is done"*
//   *"before they are built, they are just best case scenario paths and
//    wilderness and whatever"*
//
// ⚠️ THE STOPS HAVE NO PROSE, AND THAT IS DELIBERATE, NOT UNFINISHED.
//
// The 37 hand-written places this replaces were machine-written by earlier
// sessions. The owner corrected the attribution and scrapped them. **What a
// stop is made of is open question 1 in the design and it is the owner's to
// answer** — so this file gives a stop the two things the game cannot run
// without (a position and the ground it sits on) and nothing else. A stop is
// called by its number, the way a survey calls it, until the owner says what a
// stop is.
//
// ⚠️ AND NO RNG. The layout below is computed once from fixed arithmetic, so it
// is the same chapter on every device and in every session. `engine.ts`
// promises no randomness and this file must not smuggle any in.

/** The ground a stop sits on. Drives what a road out of it costs, and later
 *  what the weather does to it. Inks for all five already exist in `ink.ts`. */
export type Ground = 'moor' | 'wood' | 'crag' | 'water' | 'stone' | 'bog';

/** ★ THE GROUND IS THE PRICE. The owner has asked twice for height and contours
 *  on the map; this is the number those contours will be a picture OF. */
export const GOING: Record<Ground, number> = {
  moor: 1,       // open, level, dull — the cheap way round
  stone: 1.3,    // hard going but it takes a road well
  wood: 1.7,     // has to be cleared before it can be cut
  bog: 2.1,      // everything you lay sinks a little before it holds
  crag: 2.4,     // steep
  water: 3.1,    // needs a ford or a bridge
};

/** ★ THE BORE: how much mana a road over this ground can CARRY, per gauge.
 *
 *  ⚠️ THIS IS THE TRADE-OFF, AND IT DELIBERATELY FIGHTS `GOING`. Cheap ground is
 *  NARROW ground: a way laid over open moor costs almost nothing and then leaks
 *  and silts and carries very little forever. Hard standing is dear to cut and
 *  "takes a road well" — which is a line that was already in the flavour text
 *  before there was a number behind it.
 *
 *  Without this the pipes would be theatre: moor would be the cheapest AND the
 *  best, every route would be the same route, and the choice the chapter is
 *  built around would be cosmetic. The owner asked for pipes because they give
 *  "more options"; the options are here or they are nowhere. */
export const BORE: Record<Ground, number> = {
  moor: 0.55,    // cheap to lay, and it never carries much
  bog: 0.70,     // dear AND narrow — the ground that is simply bad
  wood: 0.90,
  water: 0.85,   // dear, and a ford is a ford
  crag: 1.25,    // cut into rock, and it holds
  stone: 1.45,   // hard standing — takes a road well
};

/** What one gauge of road over this pair of grounds can carry, in mana a
 *  second. The narrower end governs: a pipe is as wide as its tightest point. */
export function boreOf(a: number, b: number): number {
  const A = STOP.get(a), B = STOP.get(b);
  if (!A || !B) return 0;
  return Math.min(BORE[A.ground], BORE[B.ground]);
}

export interface Stop {
  id: number;
  /** ⚠️ A NUMBER, NOT A NAME. See the header. */
  name: string;
  ground: Ground;
  x: number;
  y: number;
  /** Every stop a dotted route joins this one to. Symmetric. */
  near: number[];
}

export const START = 0;
export const FINISH = 1;

// ---- laying the chapter out ------------------------------------------------
//
// Five routes fan between the start and the finish, each a chain of stops, and
// neighbouring routes are cross-linked here and there so the whole thing is a
// GRAPH you can move sideways through rather than five separate corridors.
//
// Everything below is arithmetic on the route index and the step index. No
// randomness, no seed, no table to keep in sync.

const ROUTES = 5;

/** ★ THE CHAPTER IS PORTRAIT, BECAUSE THE GAME IS PLAYED ON A PHONE.
 *
 *  ⚠️ IT WAS 900x620 — LANDSCAPE — AND THAT WASTED THE SCREEN TWICE OVER. The
 *  board is fitted by whichever of width or height runs out first, and on a
 *  390px-wide phone a landscape map is always width-bound: making the board
 *  taller (the owner's ask, 2026-08-02) added empty margin above and below the
 *  map without making the map one pixel bigger. The first screenshot after the
 *  board grew to 85% of the screen looked IDENTICAL to the one before it.
 *
 *  So the crossing runs TOP TO BOTTOM and the routes bow left and right. Same
 *  design — a start, a finish, five ways between — turned ninety degrees to
 *  match the shape of the thing it is drawn on. */
const W = 620, H = 980;
const TOP = 70, BOT = H - 70, MID = W / 2;

/** How many stops sit between the two ends, per route. The outer routes are
 *  longer because they bow further out. */
const LENGTH = [4, 5, 6, 5, 4];

/** What each route is mostly made of. The short middle way is the dear one —
 *  so "fewest stops" and "cheapest" are different questions, which is the whole
 *  reason there is a choice. */
const TERRAIN: Ground[][] = [
  ['moor', 'moor', 'stone', 'moor'],
  ['wood', 'bog', 'bog', 'wood', 'stone'],
  ['moor', 'stone', 'moor', 'stone', 'moor', 'moor'],
  ['crag', 'crag', 'stone', 'crag', 'moor'],
  ['water', 'water', 'crag', 'water'],
];

const list: Stop[] = [
  { id: START, name: 'Start', ground: 'stone', x: MID, y: TOP, near: [] },
  { id: FINISH, name: 'Finish', ground: 'stone', x: MID, y: BOT, near: [] },
];

/** id of the nth stop on route r. Ids start at 2, after the two ends. */
const idAt = (r: number, n: number): number =>
  2 + LENGTH.slice(0, r).reduce((a, b) => a + b, 0) + n;

for (let r = 0; r < ROUTES; r++) {
  const len = LENGTH[r]!;
  // How far this route bows away from the straight line, in stops-worth.
  const bow = (r - (ROUTES - 1) / 2) * 118;
  for (let n = 0; n < len; n++) {
    const t = (n + 1) / (len + 1);
    // A cosine bow, so a route leaves and rejoins the ends smoothly instead of
    // turning a corner at each of them.
    const lift = Math.sin(Math.PI * t);
    list.push({
      id: idAt(r, n),
      name: `Stop ${idAt(r, n)}`,
      ground: TERRAIN[r]![n] ?? 'moor',
      // ⚠️ THE AXES ARE SWAPPED FROM WHAT THIS USED TO BE: `t` runs DOWN the
      // board and the bow pushes SIDEWAYS. See the note on W and H.
      x: Math.round(MID + bow * lift + (n % 2 ? 11 : -11)),
      y: Math.round(TOP + (BOT - TOP) * t),
      near: [],
    });
  }
}

const join = (a: number, b: number): void => {
  const A = list.find((s) => s.id === a), B = list.find((s) => s.id === b);
  if (!A || !B || a === b) return;
  if (!A.near.includes(b)) A.near.push(b);
  if (!B.near.includes(a)) B.near.push(a);
};

// Each route: start → its stops in order → finish.
for (let r = 0; r < ROUTES; r++) {
  const len = LENGTH[r]!;
  join(START, idAt(r, 0));
  for (let n = 0; n < len - 1; n++) join(idAt(r, n), idAt(r, n + 1));
  join(idAt(r, len - 1), FINISH);
}

// ★ AND THE RUNGS BETWEEN THEM. Without these the chapter is five corridors and
// the only choice is made once, at the start. With them you can change your
// mind halfway, which is what makes the middle of a chapter interesting.
for (let r = 0; r < ROUTES - 1; r++) {
  const a = LENGTH[r]!, b = LENGTH[r + 1]!;
  for (let n = 1; n < Math.min(a, b) - 1; n += 2) join(idAt(r, n), idAt(r + 1, n));
}

for (const s of list) s.near.sort((a, b) => a - b);

export const STOPS: readonly Stop[] = list;
export const STOP = new Map(STOPS.map((s) => [s.id, s]));

export const nameOf = (id: number): string => STOP.get(id)?.name ?? '—';
export const roadsFrom = (id: number): number[] => STOP.get(id)?.near ?? [];

/** ★ WHAT A ROAD COSTS: how far it runs, times how bad the ground is.
 *
 *  ⚠️ THIS IS THE NUMBER THAT MAKES THE GRAPH LOAD-BEARING. The engine this
 *  replaces priced every road off a GLOBAL count of roads built, so every
 *  frontier cost the same and the map was decoration — you could shuffle which
 *  stop joined which, keep the counts, and no number would change. Here a short
 *  road over moor and a long one across water are different prices because they
 *  are different ground, which is what makes choosing a route a decision. */
export function roadCost(a: number, b: number): number {
  const A = STOP.get(a), B = STOP.get(b);
  if (!A || !B) return 0;
  const len = Math.hypot(A.x - B.x, A.y - B.y) / 100;
  const going = (GOING[A.ground] + GOING[B.ground]) / 2;
  return Math.max(1, Math.round(len * going * 5));
}

/** Kept so a test can assert the chapter is actually crossable and actually
 *  offers a choice, rather than trusting the arithmetic above. */
export const ROUTE_COUNT = ROUTES;
