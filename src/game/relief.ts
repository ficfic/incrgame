// THE SHAPE OF THE GROUND: height, contour lines, and an outline around each
// region.
//
// ★ HEIGHT IS NOT DECORATION HERE, AND THAT IS THE WHOLE REASON THIS FILE IS
// ALLOWED TO EXIST. `GOING` in `stops.ts` prices a road by the ground it
// crosses — moor 1, crag 2.4, water 3.1. The height field below is BUILT FROM
// THOSE SAME GROUNDS, so the contours are a picture of what a road costs. Tight
// rings mean the ground is changing fast under you, which means the price is.
//
// The owner, 2026-08-02: *"could you implement terrain height isolines… also do
// some lines like an oval with a forest inside or maybe some steppe or bog, add
// some geometry to highlight the game world."*
//
// ⚠️ EVERYTHING HERE IS SOLVED ONCE AT MODULE LOAD AND BAKED. It is a few
// thousand height samples and a marching-squares pass — nothing to do per frame,
// and `terrain.ts` hands it to the board inside a `baked` shape so the whole lot
// costs one `drawImage`. No `shadowBlur`, per `docs/GAME_DESIGN.md`.
//
// Nothing here knows about a canvas, a camera or the game. It is geometry.
import { STOPS, type Ground } from './stops';
import { SPOT, VIEW } from './layout';
import type { Shape, Pt } from './shapes';

// ---- how high the ground stands --------------------------------------------

/** ★ THE SAME FIVE GROUNDS `GOING` PRICES, AS HEIGHTS. Water sits in the
 *  bottom of the valley and crag stands over everything, which is both what a
 *  map looks like and why one costs 3.1 and the other 2.4: you are bridging a
 *  river or you are climbing.
 *
 *  ⚠️ NOT THE SAME NUMBERS AS `GOING`, deliberately. Cost is "how hard is this
 *  to build across" and height is "how far up is it" — water is expensive AND
 *  low. Deriving one from the other would make the river a ridge. */
export const HEIGHT: Record<Ground, number> = {
  water: 0,
  bog: 14,       // the wet low ground the water almost claims
  moor: 34,
  wood: 52,
  stone: 66,
  crag: 100,
};

/** How far a stop's ground reaches before it stops mattering. Wide enough that
 *  the field is smooth between stops, narrow enough that a lone crag is a hill
 *  rather than a tilt across the whole map. */
const REACH = 210;

/** ★ HEIGHT ANYWHERE, blended from the stops around it — inverse distance
 *  squared, which is the standard way to turn scattered samples into a field.
 *  Pure, so `test/relief.test.ts` can ask it about a point rather than about a
 *  picture of a point. */
export function heightAt(x: number, y: number): number {
  let num = 0, den = 0;
  for (const p of STOPS) {
    const at = SPOT.get(p.id)!;
    const d2 = (at.x - x) ** 2 + (at.y - y) ** 2;
    // +1 so standing exactly on a stop is its own height rather than a divide
    // by zero, which would put a NaN into the contour pass and lose the map.
    const w = 1 / (d2 + 1) - 1 / (REACH * REACH);
    if (w <= 0) continue;
    num += HEIGHT[p.ground] * w;
    den += w;
  }
  return den > 0 ? num / den : HEIGHT.moor;
}

// ---- marching squares ------------------------------------------------------
//
// ⚠️ WRITTEN OUT RATHER THAN PULLED IN. `d3-contour` would do this, but it wants
// a rectangular array in ITS layout and returns GeoJSON multipolygons that then
// have to be walked back into world coordinates — more adapter than algorithm.
// This is forty lines and `test/relief.test.ts` checks it against a field whose
// contours are known by hand (a cone: every level must come out a circle).

/** Where between two samples a level crosses, linearly. */
const cut = (a: number, b: number, level: number): number =>
  Math.abs(b - a) < 1e-9 ? 0.5 : (level - a) / (b - a);

/** Every segment of one contour level, as unordered pairs of points. */
function segmentsAt(g: number[][], x0: number, y0: number, step: number,
  level: number): Array<[Pt, Pt]> {
  const out: Array<[Pt, Pt]> = [];
  for (let j = 0; j + 1 < g.length; j++) {
    for (let i = 0; i + 1 < g[j]!.length; i++) {
      // Corners, clockwise from top-left.
      const tl = g[j]![i]!, tr = g[j]![i + 1]!, br = g[j + 1]![i + 1]!, bl = g[j + 1]![i]!;
      // The four-bit case number every marching-squares table is indexed by.
      const c = (tl > level ? 8 : 0) | (tr > level ? 4 : 0)
        | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (c === 0 || c === 15) continue;
      const X = x0 + i * step, Y = y0 + j * step;
      // The crossing point on each of the four edges, when it has one.
      const top = { x: X + cut(tl, tr, level) * step, y: Y };
      const right = { x: X + step, y: Y + cut(tr, br, level) * step };
      const bottom = { x: X + cut(bl, br, level) * step, y: Y + step };
      const left = { x: X, y: Y + cut(tl, bl, level) * step };
      // ⚠️ THE SADDLES (5 and 10) ARE RESOLVED BY THE CELL'S MIDDLE, not picked
      // arbitrarily. Choosing wrong there joins two hills that should be
      // separate, which reads as a wall across the map that is not there.
      const mid = (tl + tr + br + bl) / 4 > level;
      switch (c) {
        case 1: case 14: out.push([left, bottom]); break;
        case 2: case 13: out.push([bottom, right]); break;
        case 3: case 12: out.push([left, right]); break;
        case 4: case 11: out.push([top, right]); break;
        case 6: case 9: out.push([top, bottom]); break;
        case 7: case 8: out.push([left, top]); break;
        case 5: mid ? out.push([left, top], [bottom, right])
          : out.push([left, bottom], [top, right]); break;
        case 10: mid ? out.push([top, right], [left, bottom])
          : out.push([left, top], [bottom, right]); break;
      }
    }
  }
  return out;
}

/** Stitch loose segments into runs, so a contour is one stroked path rather
 *  than four hundred two-point ones. Endpoints are matched on a rounded key —
 *  they come from the same interpolation on a shared edge, so they agree. */
function stitch(segs: Array<[Pt, Pt]>): Pt[][] {
  const key = (p: Pt): string => `${Math.round(p.x * 8)},${Math.round(p.y * 8)}`;
  const ends = new Map<string, Array<[Pt, Pt]>>();
  for (const s of segs) {
    for (const p of s) {
      const k = key(p);
      (ends.get(k) ?? ends.set(k, []).get(k)!).push(s);
    }
  }
  const used = new Set<Array<Pt>>();
  const runs: Pt[][] = [];
  for (const seg of segs) {
    if (used.has(seg)) continue;
    used.add(seg);
    const run = [seg[0], seg[1]];
    // Walk forward off the tail, then backward off the head.
    for (const dir of [1, 0]) {
      for (;;) {
        const tip = dir ? run[run.length - 1]! : run[0]!;
        const next = (ends.get(key(tip)) ?? [])
          .find((s) => !used.has(s));
        if (!next) break;
        used.add(next);
        const far = key(next[0]) === key(tip) ? next[1] : next[0];
        if (dir) run.push(far); else run.unshift(far);
        // A closed ring: stop rather than lapping it forever.
        if (key(far) === key(dir ? run[0]! : run[run.length - 1]!)) break;
      }
    }
    if (run.length > 2) runs.push(run);
  }
  return runs;
}

/** ★ THE CONTOURS, in world coordinates. `box` is the ground to cover.
 *
 *  ⚠️ `field` IS A PARAMETER SO THIS CAN BE CHECKED AGAINST AN ANSWER SOMEBODY
 *  KNOWS. A broken marching-squares pass still returns hundreds of plausible
 *  segments and a screenshot of a wrong contour map looks exactly like one of a
 *  right map. `test/relief.test.ts` hands it a CONE, whose contour at any level
 *  is a circle of a radius you can work out with arithmetic. */
export function contours(box: { x: number; y: number; w: number; h: number },
  levels: number[], step = 15,
  field: (x: number, y: number) => number = heightAt): Pt[][] {
  const cols = Math.ceil(box.w / step) + 1;
  const rows = Math.ceil(box.h / step) + 1;
  // Sampled ONCE and shared by every level — the field does not change between
  // them and re-sampling per level was the whole cost of this pass.
  const g: number[][] = [];
  for (let j = 0; j < rows; j++) {
    const row: number[] = [];
    for (let i = 0; i < cols; i++) row.push(field(box.x + i * step, box.y + j * step));
    g.push(row);
  }
  return levels.flatMap((l) => stitch(segmentsAt(g, box.x, box.y, step, l)));
}

// ---- the coast --------------------------------------------------------------

/** ★ WHERE THE LAND ENDS. One function, so the sea's fill, the beach line, the
 *  scatter, and the road bends all agree about where the water starts — four
 *  copies of this wave would drift apart the first time one was tuned. */
/** ⚠️ BASED ON THE WESTMOST STOP, NOT ON THE CAMERA. The first shoreline sat at
 *  `VIEW.x + 42` — which put the coast EAST of Stop 4, a stop standing in the
 *  sea, caught by the new never-wades test before any screenshot. The land ends
 *  where the stops end; the camera is widened westward to show the water. */
const WEST = Math.min(...STOPS.map((s) => SPOT.get(s.id)!.x));
export function shoreX(y: number): number {
  return WEST - 16 + 7 * Math.sin(y / 84) + 3 * Math.sin(y / 31);
}

/** ★ THE SLOPE, for anything that wants to follow the ground rather than just
 *  know how high it is. Finite differences over the same field the contours
 *  draw — one source of truth for the shape of the land. */
export function gradAt(x: number, y: number): { gx: number; gy: number } {
  const e = 7;
  return {
    gx: (heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e),
    gy: (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e),
  };
}

// ---- a shape around each region --------------------------------------------
//
// ★ *"lines like an oval with a forest inside."* A region is every stop of one
// ground that stands together, and its outline is drawn round the OUTSIDE of
// them — so the map says "this is the wood" as a place rather than as a scatter
// of little trees that happen to be near each other.

/** Two stops of the same ground within this belong to the same region. */
const TOGETHER = 330;
/** How far outside the stops the line runs. */
const MARGIN = 62;

export interface Region {
  ground: Ground;
  ring: Pt[];
  at: Pt;
  /** ★ THE STOPS THIS RING WAS DRAWN AROUND. Reported rather than inferred: a
   *  ground can have more than one region, and a stop can belong to NONE (see
   *  the two-stop minimum below). `test/relief.test.ts` first tried to work out
   *  which ring owned a stop by picking the nearest centroid, and reported a
   *  defect that was not there — Stop 9 was wood, stood alone, and correctly had
   *  no ring at all. A test that has to guess the answer is testing its guess. */
  members: Pt[];
}

const seeded = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
};

export function regions(): Region[] {
  const out: Region[] = [];
  const rnd = seeded(0x0f0e57);
  // ⚠️ STONE IS DELIBERATELY NOT A REGION. It is the neutral ground the start
  // and the finish sit on and it turns up all over; ringing it would draw a
  // border round most of the map and say nothing.
  for (const ground of ['wood', 'crag', 'water', 'moor', 'bog'] as Ground[]) {
    const mine = STOPS.filter((p) => p.ground === ground).map((p) => SPOT.get(p.id)!);
    // Single-link clustering: near anything in the group joins the group.
    const left = [...mine];
    while (left.length) {
      const group = [left.pop()!];
      for (let grew = true; grew;) {
        grew = false;
        for (let i = left.length - 1; i >= 0; i--) {
          if (group.some((m) => Math.hypot(m.x - left[i]!.x, m.y - left[i]!.y) < TOGETHER)) {
            group.push(...left.splice(i, 1));
            grew = true;
          }
        }
      }
      // ⚠️ A REGION IS AT LEAST TWO STOPS. A ring round one lone stop is a
      // circle with a dot in it, which reads as a marker for something rather
      // than as terrain.
      if (group.length < 2) continue;
      const at = {
        x: group.reduce((s, m) => s + m.x, 0) / group.length,
        y: group.reduce((s, m) => s + m.y, 0) / group.length,
      };
      // ★ A SUPPORT FUNCTION, not a circle: in each direction the ring sits
      // just beyond the furthest stop THAT WAY. Two stops far apart give a long
      // oval; a tight clump gives a round one. The wobble keeps it from looking
      // like a diagram.
      const STEPS = 44;
      const ring: Pt[] = [];
      for (let i = 0; i < STEPS; i++) {
        const a = (i / STEPS) * Math.PI * 2;
        const cx = Math.cos(a), cy = Math.sin(a);
        let reach = 0;
        for (const m of group) {
          reach = Math.max(reach, (m.x - at.x) * cx + (m.y - at.y) * cy);
        }
        const r = reach + MARGIN * (0.82 + rnd() * 0.36);
        ring.push({ x: at.x + cx * r, y: at.y + cy * r });
      }
      out.push({ ground, ring, at, members: group.map((m) => ({ x: m.x, y: m.y })) });
    }
  }
  return out;
}
