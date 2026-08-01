// WHAT THE GROUND IS BETWEEN THE PLACES. Scenery, and later the price list.
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
import { PLACES, PLACE } from './places';
import { SPOT, boxOf, type Box } from './layout';

export type Ground = 'wood' | 'moor' | 'crag' | 'under' | 'stone';

/** ⚠️ THE PALETTE IS CONSTRAINED, NOT CHOSEN FREELY. `scripts/play-tabs.mjs`
 *  counts pixels of a known colour to check the board — that is how the dot,
 *  route and fill checks work now that the board is painted. A scenery colour
 *  that lands within tolerance of one of those inks would be counted as dots,
 *  and the check would go quietly vacuous. It has already happened once (the
 *  dim-dot ink sat within 20 of the edge ink). `test/terrain.test.ts` holds the
 *  distance, so this palette cannot drift into the probe's. */
export const GROUND_INK: Record<Ground, string> = {
  wood: '#123f1c',
  moor: '#3d3520',
  crag: '#5a5348',
  under: '#523a60',
  stone: '#6a6259',
};
export const RIVER_INK = '#24607f';

/** Which region a place belongs to, from its id. The content is already
 *  partitioned this way — valley 0–5, works 100–109, under 200–210,
 *  stones 300–309 — so nothing needs authoring twice. */
export const regionOf = (id: number): string =>
  id < 100 ? 'valley' : id < 200 ? 'works' : id < 300 ? 'under' : 'stones';

const GROUND: Record<string, Ground> = {
  valley: 'wood',    // a river valley, and the prose is full of trees and reeds
  works: 'stone',    // the Blockyard, the Haul Road, cut stone everywhere
  under: 'under',    // the galleries. Below, not beside.
  stones: 'moor',    // open ground, cairns, a beacon you can see from far off
};

/** ★ THE RIVER, TAKEN FROM THE PLACES THAT WERE ALREADY WRITTEN.
 *
 *  Not invented: The Cut is "a river that gave up", there is a Weir holding it,
 *  a Headrace feeding a Wheelhouse and a Wheel Pit, a Tailrace carrying it away,
 *  and it drains underground to the Sump Fork and the Ledger Pool. The Far Bank
 *  is named for being on the other side of it. The water was in the content
 *  before it was on the map. */
export const RIVER_PLACES = [0, 1, 100, 101, 102, 103, 201, 206];

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
  const spots = PLACES.map((p) => SPOT.get(p.id)!);
  for (const p of PLACES) {
    const at = SPOT.get(p.id)!;
    const g = GROUND[regionOf(p.id)]!;
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

/** ⚠️ SOLVED ONCE AT MODULE LOAD, like the layout it is drawn over. */
export const TERRAIN: Terrain = (() => {
  const marks = scatter();
  const river = RIVER_PLACES.filter((id) => PLACE.has(id)).map((id) => {
    const s = SPOT.get(id)!;
    return { x: s.x, y: s.y };
  });
  // The box has to cover the scenery too, or the bitmap is cropped and the
  // outermost marks vanish at the edges.
  const pts = [
    ...PLACES.map((p) => ({ id: `p${p.id}`, x: SPOT.get(p.id)!.x, y: SPOT.get(p.id)!.y })),
    ...marks.map((m, i) => ({ id: `m${i}`, x: m.x, y: m.y })),
  ];
  return { box: boxOf(pts, 24), marks, river };
})();
