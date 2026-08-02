// WHAT THE GROUND IS BETWEEN THE STOPS. Scenery, and later the price list.
//
// ⚠️ THE OWNER ASKED FOR A MAP THAT IS ALIVE, AND FOR IT TO BE CHEAP TO DRAW.
// Those two pull against each other, so the split is deliberate and it is the
// whole design of this file:
//
//   THE SCATTER IS STATIC AND EXPENSIVE, so it is computed ONCE here, in world
//   coordinates, and the shell bakes it into a bitmap it blits. Five hundred
//   little marks redrawn at 60fps while a thumb pans would be ~30,000 path ops
//   a second and would stutter on a phone. Blitted, it is one `drawImage`.
//
//   THE RIVER IS CHEAP AND IMPORTANT, so it is NOT baked. Eight control points
//   is nothing to stroke live, and drawing it live keeps it crisp at any zoom —
//   which is the thing the owner singled out as looking good.
//
// Nothing here knows about the canvas, the camera or the game. It is geometry.
import { STOPS } from './stops';
import { SPOT, boxOf, type Box } from './layout';
import { INK } from './ink';
import type { Shape, Pt } from './shapes';

export type Ground = 'wood' | 'moor' | 'crag' | 'under' | 'stone';

/** ⚠️ THE COLOURS LIVE IN `ink.ts` NOW, with every other colour in the game.
 *  Re-exported because the constraint on them is still specific to scenery: the
 *  probe counts pixels of known inks, so a ground colour within tolerance of a
 *  dot or edge ink would be counted as dots and the check would go quietly
 *  vacuous. `test/ink.test.ts` holds the distances for all of them now. */
export const GROUND_INK: Record<Ground, string> = {
  wood: INK.wood, moor: INK.moor, crag: INK.crag, under: INK.under, stone: INK.stone,
};
export const RIVER_INK = INK.river;

/** ★ THE SCENERY IS THE STOP'S OWN GROUND, and that is new. It used to be
 *  guessed from a place's id, because the ground was decoration. It is not any
 *  more: `stops.ts` gives every stop a ground, the ground prices the road out
 *  of it, and this draws the same fact. **What you see and what you pay are one
 *  number now**, which is the whole reason the map is worth looking at. */
const GROUND: Record<string, Ground> = {
  wood: 'wood', moor: 'moor', crag: 'crag', stone: 'stone',
  // Water is drawn as the river below rather than as scatter.
  water: 'moor',
};

/** ★ THE RIVER, TAKEN FROM THE STOPS THAT WERE ALREADY WRITTEN.
 *
 *  Not invented: The Cut is "a river that gave up", there is a Weir holding it,
 *  a Headrace feeding a Wheelhouse and a Wheel Pit, a Tailrace carrying it away,
 *  and it drains underground to the Sump Fork and the Ledger Pool. The Far Bank
 *  is named for being on the other side of it. The water was in the content
 *  before it was on the map. */
export const RIVER_STOPS = [0, 1, 100, 101, 102, 103, 201, 206];

export interface Mark { x: number; y: number; g: Ground; r: number; a: number }

/** The same seeded generator the layout uses, for the same reason: a screenshot
 *  of a bug has to be a screenshot anyone can reproduce. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** How close a mark may come to any place. Dots are ~7 units and their labels
 *  sit under them, so scenery inside this radius would be drawn through a name. */
export const CLEAR = 30;

function scatter(): Mark[] {
  const rnd = seeded(0x7e44a1);
  const out: Mark[] = [];
  const spots = STOPS.map((p) => SPOT.get(p.id)!);
  for (const p of STOPS) {
    const at = SPOT.get(p.id)!;
    const g = GROUND[p.ground]!;
    // Sixteen tries per place, most of which land. Marks cluster around the
    // places rather than filling the whole box, which is what makes the empty
    // parts of the map read as empty rather than as unfinished.
    for (let i = 0; i < 16; i++) {
      const ang = rnd() * Math.PI * 2;
      const rad = CLEAR + rnd() * 42;
      const x = at.x + Math.cos(ang) * rad;
      const y = at.y + Math.sin(ang) * rad;
      // ⚠️ CLEARED AGAINST EVERY PLACE, not just this one. A mark thrown clear
      // of its own dot lands on the neighbour's label often enough to notice.
      if (spots.some((s) => Math.hypot(s.x - x, s.y - y) < CLEAR)) continue;
      out.push({ x, y, g, r: 1.6 + rnd() * 2.2, a: rnd() * Math.PI });
    }
  }
  return out;
}

export interface Terrain {
  box: Box;
  marks: readonly Mark[];
  /** The river's control points, in world coordinates, in order downstream. */
  river: ReadonlyArray<{ x: number; y: number }>;
}

/** One scenery mark as the shapes that draw it. Four grounds, four gestures —
 *  and every one is an ordinary `Shape`, so the board needs no special case and
 *  this file needs no canvas. */
function markShapes(m: Mark): Shape[] {
  const w = 1.1;
  if (m.g === 'wood') {
    return [{ s: 'path', ink: m.g, fill: true, close: true, pts: [
      { x: m.x, y: m.y - m.r * 1.6 },
      { x: m.x + m.r, y: m.y + m.r * 0.8 },
      { x: m.x - m.r, y: m.y + m.r * 0.8 },
    ] }];
  }
  if (m.g === 'moor') {
    return [{ s: 'path', ink: m.g, w, curve: true, pts: [
      { x: m.x - m.r, y: m.y },
      { x: m.x, y: m.y - m.r * 1.3 },
      { x: m.x + m.r, y: m.y },
    ] }];
  }
  if (m.g === 'crag' || m.g === 'stone') {
    const c = Math.cos(m.a), sn = Math.sin(m.a);
    const at = (dx: number, dy: number): Pt =>
      ({ x: m.x + dx * c - dy * sn, y: m.y + dx * sn + dy * c });
    return [{ s: 'path', ink: m.g, w, pts: [
      at(-m.r, m.r * 0.6), at(0, -m.r * 0.9), at(m.r, m.r * 0.6),
    ] }];
  }
  return [{ s: 'path', ink: m.g, w, pts: [
    { x: m.x - m.r, y: m.y - m.r }, { x: m.x + m.r, y: m.y + m.r },
  ] }];
}

/** ⚠️ SOLVED ONCE AT MODULE LOAD, like the layout it is drawn over. */
export const TERRAIN: Terrain = (() => {
  const marks = scatter();
  // ★ THE RIVER RUNS THROUGH THE WATER STOPS, which is the same swap: it used
  // to be a hand-listed route through places whose prose mentioned water, and
  // it is now simply where the water ground is.
  //
  // ⚠️ DOWNSTREAM IS THE LONG AXIS, NOT ALWAYS `x`. This sorted by `x` outright,
  // which was correct only while the chapter was landscape. Turning the chapter
  // portrait left the water stops running down the board and the sort skipping
  // between them left and right, so the river drew as a hairpin doubling back on
  // itself — a visible regression from a change nowhere near this file.
  const wet = STOPS.filter((p) => p.ground === 'water').map((p) => SPOT.get(p.id)!);
  const span = (f: (s: { x: number; y: number }) => number): number =>
    Math.max(...wet.map(f)) - Math.min(...wet.map(f));
  const down = span((s) => s.y) > span((s) => s.x)
    ? (a: { y: number }, b: { y: number }) => a.y - b.y
    : (a: { x: number }, b: { x: number }) => a.x - b.x;
  const river = wet.sort(down).map((s) => ({ x: s.x, y: s.y }));
  // The box has to cover the scenery too, or the bitmap is cropped and the
  // outermost marks vanish at the edges.
  const pts = [
    ...STOPS.map((p) => ({ id: `p${p.id}`, x: SPOT.get(p.id)!.x, y: SPOT.get(p.id)!.y })),
    ...marks.map((m, i) => ({ id: `m${i}`, x: m.x, y: m.y })),
  ];
  return { box: boxOf(pts, 24), marks, river };
})();

/** ★ THE WHOLE MAP'S SCENERY, AS SHAPES THE BOARD JUST DRAWS.
 *
 *  The scatter is `baked` — one bitmap, one blit per frame, however many marks
 *  it holds. The river is not, because eight control points cost nothing to
 *  stroke live and drawing it live is what keeps it crisp when you zoom, which
 *  the owner singled out as the thing that looks right.
 *
 *  A bridge, a ford, a glyph beside a place or a tint over a region all come
 *  back here as more entries. That is the point of it. */
export const TERRAIN_SHAPES: Shape[] = [
  {
    s: 'baked', key: 'ground', box: TERRAIN.box, alpha: 0.85,
    shapes: TERRAIN.marks.flatMap(markShapes),
  },
  // A wide soft bed under a brighter thread — most of what makes water read as
  // water rather than as one more road.
  { s: 'path', pts: [...TERRAIN.river], ink: 'river', w: 7, curve: true, alpha: 0.5 },
  { s: 'path', pts: [...TERRAIN.river], ink: 'river', w: 2.5, curve: true },
];
