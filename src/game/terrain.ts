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
import { SPOT, boxOf, VIEW, type Box } from './layout';
import { INK, type InkName } from './ink';
import type { Shape, Pt } from './shapes';
import { contours, regions, HEIGHT, shoreX, gradAt } from './relief';

export type Ground = 'wood' | 'moor' | 'crag' | 'under' | 'stone' | 'bog';

/** ⚠️ THE COLOURS LIVE IN `ink.ts` NOW, with every other colour in the game.
 *  Re-exported because the constraint on them is still specific to scenery: the
 *  probe counts pixels of known inks, so a ground colour within tolerance of a
 *  dot or edge ink would be counted as dots and the check would go quietly
 *  vacuous. `test/ink.test.ts` holds the distances for all of them now. */
export const GROUND_INK: Record<Ground, string> = {
  wood: INK.wood, moor: INK.moor, crag: INK.crag, under: INK.under, stone: INK.stone,
  bog: INK.bog,
};
export const RIVER_INK = INK.river;

/** ★ THE SCENERY IS THE STOP'S OWN GROUND, and that is new. It used to be
 *  guessed from a place's id, because the ground was decoration. It is not any
 *  more: `stops.ts` gives every stop a ground, the ground prices the road out
 *  of it, and this draws the same fact. **What you see and what you pay are one
 *  number now**, which is the whole reason the map is worth looking at. */
const GROUND: Record<string, Ground> = {
  wood: 'wood', moor: 'moor', crag: 'crag', stone: 'stone', bog: 'bog',
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
      // ⚠️ AND NOT IN THE SEA. The scatter is a separate bake drawn OVER the
      // coast, so the sea's mask cannot save it — a pine standing offshore
      // would survive every other rule here.
      if (x < shoreX(y) + 6) continue;
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
/** ★ EXPORTED for the city builder's scenery — the parts shelf in action:
 *  same trees, same crags, same rushes, drawn around different ground. */
export function markShapes(m: Mark): Shape[] {
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
  if (m.g === 'bog') {
    // Two short rushes over a water-line — the standard marsh mark.
    return [
      { s: 'path', ink: m.g, w, pts: [
        { x: m.x - m.r, y: m.y }, { x: m.x + m.r, y: m.y }] },
      { s: 'path', ink: m.g, w, pts: [
        { x: m.x - m.r * 0.4, y: m.y - m.r * 0.9 }, { x: m.x - m.r * 0.4, y: m.y }] },
      { s: 'path', ink: m.g, w, pts: [
        { x: m.x + m.r * 0.4, y: m.y - m.r * 0.9 }, { x: m.x + m.r * 0.4, y: m.y }] },
    ];
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
  // ★ AND THE RIVER FOLLOWS THE VALLEY, not just its own anchors. The owner:
  // *"we made hills so that rivers and roads can take them into account."* The
  // anchor stops fix where it must pass; between them the line is subdivided
  // and each point slides downhill a few steps, so the water pools into the same
  // lows the contours draw. Anchors stay put — the river must still meet its
  // fords.
  const anchors = wet.sort(down).map((s) => ({ x: s.x, y: s.y }));
  const river: Pt[] = [];
  for (let i = 0; i + 1 < anchors.length; i++) {
    const a = anchors[i]!, c = anchors[i + 1]!;
    for (let k = 0; k < 4; k++) {
      river.push({ x: a.x + ((c.x - a.x) * k) / 4, y: a.y + ((c.y - a.y) * k) / 4 });
    }
  }
  river.push(anchors[anchors.length - 1]!);
  for (let round = 0; round < 10; round++) {
    for (let i = 0; i < river.length; i++) {
      if (i % 4 === 0 || i === river.length - 1) continue;   // anchors hold
      const p = river[i]!;
      const g = gradAt(p.x, p.y);
      const mag = Math.hypot(g.gx, g.gy) || 1;
      river[i] = {
        x: 0.7 * (p.x - (g.gx / mag) * 2.2) + 0.15 * river[i - 1]!.x + 0.15 * river[i + 1]!.x,
        y: 0.7 * (p.y - (g.gy / mag) * 2.2) + 0.15 * river[i - 1]!.y + 0.15 * river[i + 1]!.y,
      };
    }
  }
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
/** Solved once, like everything else on this map. */
export const REGIONS = regions();

/** ★ THE CONTOUR LEVELS. Five, evenly through the range the field actually
 *  reaches — computed rather than guessed, because the range depends on how the
 *  grounds happen to be spread and hard-coded levels would put three lines off
 *  the map the first time a chapter changed. */
const LEVELS = (() => {
  const at = STOPS.map((p) => HEIGHT[p.ground]);
  const lo = Math.min(...at), hi = Math.max(...at);
  // Inside the range, never ON an endpoint: a contour exactly at the lowest
  // height traces the edge of every basin as a jitter of specks.
  return [1, 2, 3, 4, 5].map((i) => lo + ((hi - lo) * i) / 6);
})();

const RING_INK: Record<string, InkName> = {
  wood: 'edgewood', crag: 'edgecrag', moor: 'edgemoor', water: 'edgewater',
  stone: 'edgecrag', bog: 'edgebog',
};

/** ★ THE COAST. The sea runs down the map's western edge with a beach line
 *  where it meets the land — a wavering line, because a ruled coast reads as a
 *  border. Pure decor for now and honestly so: nothing prices it, nothing stops
 *  at it. It is the first mark on this map that is not centred on a stop. */
const COAST: Shape[] = (() => {
  // ⚠️ BASED ON `VIEW` — THE CAMERA'S BOX — NOT ON THE TERRAIN'S. The first cut
  // used `TERRAIN.box`, which starts a scatter-width further west than the
  // frame the board fits to, and the whole sea painted off the left edge of the
  // screen: the probe read 0px and the screenshot showed one yellow sliver.
  // Decor the player cannot see is decor that does not exist.
  const b = TERRAIN.box;
  const shore: Pt[] = [];
  for (let y = b.y; y <= b.y + b.h; y += 18) {
    shore.push({ x: shoreX(y), y });
  }
  const water: Pt[] = [
    { x: b.x - 40, y: b.y }, ...shore, { x: b.x - 40, y: b.y + b.h },
  ];
  return [
    // ⚠️ OPAQUE, AND DRAWN AFTER THE LAND — the owner: *"sea should cut any
    // lines going through it."* The sea is a MASK: contours, region rings and
    // anything else that wandered west of the shore is painted out, exactly as
    // a printed map does it. A translucent tint would show the lines through
    // the water and the map would contradict itself.
    { s: 'path', pts: water, ink: 'sea', fill: true, close: true },
    { s: 'path', pts: shore, ink: 'beach', w: 2.6, alpha: 0.9 },
    { s: 'path', pts: shore.map((p) => ({ x: p.x + 5, y: p.y })), ink: 'beach',
      w: 1, dash: [2, 5], alpha: 0.8 },
  ];
})();

export const TERRAIN_SHAPES: Shape[] = [
  // ★ THE RELIEF GOES DOWN FIRST, UNDER EVERYTHING. It is the ground; the
  // scatter sits on it and the roads run over both.
  {
    s: 'baked', key: 'relief', box: TERRAIN.box, alpha: 0.9,
    shapes: [
      ...contours(TERRAIN.box, LEVELS).map((pts): Shape =>
        ({ s: 'path', pts, ink: 'relief', w: 1, curve: true })),
      // The region outlines, dashed, in the ground's own colour — so the line
      // round the wood is the same green as the trees inside it and needs no
      // key to read.
      ...REGIONS.map((r): Shape => ({
        s: 'path', pts: [...r.ring, r.ring[0]!], ink: RING_INK[r.ground] ?? 'moor',
        w: 2, curve: true, dash: [11, 9], alpha: 0.9,
      })),
      // ⚠️ LAST, SO IT CUTS. See the note on COAST.
      ...COAST,
    ],
  },
  {
    s: 'baked', key: 'ground', box: TERRAIN.box, alpha: 0.85,
    shapes: TERRAIN.marks.flatMap(markShapes),
  },
  // A wide soft bed under a brighter thread — most of what makes water read as
  // water rather than as one more road.
  { s: 'path', pts: [...TERRAIN.river], ink: 'river', w: 7, curve: true, alpha: 0.5 },
  { s: 'path', pts: [...TERRAIN.river], ink: 'river', w: 2.5, curve: true },
];
