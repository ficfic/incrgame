// THE TOPOGRAPHY. A sampled height grid, and it is THE MODEL — not a
// by-product of anything else.
//
// ★ THE OWNER, 2026-08-03: *"can you please have the topography in the model
// somewhere so that our routes are planned and we know the steepness and so
// on… no need to know height of each pixel, just some samples… and based on
// that, we'd be able to generate isolines properly and we'd be able to inform
// the terrain by height."*
//
// So: ONE grid of samples, built deterministically at load, and everything
// that pretends to be geography reads it — the contours, the road bends, the
// scenery, and (from the expedition loop on) what a leg COSTS in climb. Before
// this file the "height field" was an inverse-distance blur of the stops'
// grounds: smooth blobs, no ridges, no saddles — which is why roads climbed
// hills for no reason. Blobs have no reason to offer.
//
// The grid honours the stops: near a stop the land sits at its ground's height
// (a crag stop IS high ground, a water stop IS the valley), because the grounds
// price the pipes and the map must not lie about money. Between stops, seeded
// noise gives the land ridges and hollows of its own.
//
// Pure. Deterministic. No DOM, no clock, no Math.random.
import { STOPS, type Ground } from './stops';

/** ⚠️ AUTHORED COORDINATES, straight from the stops — NOT layout's SPOT map.
 *  They are the same numbers (the chapter is drawn where it is written), but
 *  importing layout from here closes a module cycle four files wide
 *  (engine→paths→height→layout→world→engine) and the first test to import
 *  paths found SPOT still undefined mid-initialisation. Geometry reads the
 *  source data; only drawing reads the layout. */
const AT = new Map(STOPS.map((s) => [s.id, { x: s.x, y: s.y }]));
import type { Pt } from './shapes';

/** The heights the grounds stand at — moved here from relief.ts, because the
 *  grid is the model now and relief only draws it. Cost is "hard to build
 *  across"; height is "far up" — water is expensive AND low. */
export const HEIGHT: Record<Ground, number> = {
  water: 0,
  bog: 14,
  moor: 34,
  wood: 52,
  stone: 66,
  crag: 100,
};

/** ★ WHERE THE LAND ENDS, west edge. Lives with the heights because the sea is
 *  geography before it is a drawing: the grid slopes below water west of it. */
const WEST = Math.min(...STOPS.map((s) => AT.get(s.id)!.x));
export function shoreX(y: number): number {
  return WEST - 16 + 7 * Math.sin(y / 84) + 3 * Math.sin(y / 31);
}

// ---- the grid ---------------------------------------------------------------

/** The sampled box. Wider than the stops by a margin, so contours and bends
 *  never read off the edge of the data. */
export const GRID_BOX = (() => {
  const xs = STOPS.map((s) => s.x);
  const ys = STOPS.map((s) => s.y);
  const pad = 120;
  return {
    x: Math.min(...xs) - pad, y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };
})();

/** "Just some samples" — the owner's words. Forty-odd units apart: coarse
 *  enough to author by hand one day, fine enough for honest isolines. */
export const COLS = 22;
export const ROWS = 30;

const seeded = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
};

/** ★ THE GRID, built once: the stops' opinion where they have one, ridges and
 *  hollows of seeded noise where they do not, the sea below zero. */
export const GRID: readonly number[][] = (() => {
  const rnd = seeded(0x7e11a9d);
  // Raw noise lattice, then one smoothing pass so hills are hills rather than
  // static. Two octaves: broad landforms plus small roughness.
  const raw: number[][] = [];
  for (let j = 0; j <= ROWS; j++) {
    raw.push(Array.from({ length: COLS + 1 }, () => (rnd() - 0.5) * 2));
  }
  const smooth = (g: number[][]): number[][] =>
    g.map((row, j) => row.map((_, i) => {
      let s = 0, n = 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const v = g[j + dj]?.[i + di];
          if (v !== undefined) { s += v; n++; }
        }
      }
      return s / n;
    }));
  const broad = smooth(smooth(raw));

  const out: number[][] = [];
  for (let j = 0; j <= ROWS; j++) {
    const row: number[] = [];
    const y = GRID_BOX.y + (GRID_BOX.h * j) / ROWS;
    for (let i = 0; i <= COLS; i++) {
      const x = GRID_BOX.x + (GRID_BOX.w * i) / COLS;
      // The stops' opinion: inverse-distance toward each ground's height.
      let num = 0, den = 0, nearest = Infinity;
      for (const p of STOPS) {
        const at = AT.get(p.id)!;
        const d2 = (at.x - x) ** 2 + (at.y - y) ** 2;
        nearest = Math.min(nearest, Math.sqrt(d2));
        const w = 1 / (d2 + 400);
        num += HEIGHT[p.ground] * w;
        den += w;
      }
      const anchored = num / den;
      // Noise earns its say the further the land is from anywhere priced:
      // silent at a stop, ±26 in the empty quarters. This is what puts real
      // ridges between stops without the map lying about money.
      const say = Math.min(1, Math.max(0, (nearest - 34) / 150));
      let h = anchored + broad[j]![i]! * 26 * say;
      // The sea: below water west of the shore, shelving.
      const wet = shoreX(y) - x;
      if (wet > 0) h = Math.min(h, -4 - wet * 0.15);
      row.push(h);
    }
    out.push(row);
  }

  // ★ THE ANCHOR SWEEP. Bilinear reading at each stop must equal its ground's
  // height EXACTLY-ish — near the coast the sea clamp bled into Stop 4's cell
  // and read it 24 low, which is the map lying about money. Each sweep pushes
  // the stop's cell corners (land corners only; the sea stays the sea) toward
  // making the interpolated value true; three sweeps settle the mutual
  // disturbances between neighbouring stops.
  const read = (x: number, y: number): number => {
    const fx = ((x - GRID_BOX.x) / GRID_BOX.w) * COLS;
    const fy = ((y - GRID_BOX.y) / GRID_BOX.h) * ROWS;
    const i = Math.max(0, Math.min(COLS - 1, Math.floor(fx)));
    const j = Math.max(0, Math.min(ROWS - 1, Math.floor(fy)));
    const u = fx - i, v = fy - j;
    return (out[j]![i]! * (1 - u) + out[j]![i + 1]! * u) * (1 - v)
      + (out[j + 1]![i]! * (1 - u) + out[j + 1]![i + 1]! * u) * v;
  };
  for (let sweep = 0; sweep < 3; sweep++) {
    for (const p of STOPS) {
      const at = AT.get(p.id)!;
      const fx = ((at.x - GRID_BOX.x) / GRID_BOX.w) * COLS;
      const fy = ((at.y - GRID_BOX.y) / GRID_BOX.h) * ROWS;
      const i = Math.max(0, Math.min(COLS - 1, Math.floor(fx)));
      const j = Math.max(0, Math.min(ROWS - 1, Math.floor(fy)));
      const u = fx - i, v = fy - j;
      const want = HEIGHT[p.ground];
      const delta = want - read(at.x, at.y);
      const corners: Array<[number, number, number]> = [
        [j, i, (1 - u) * (1 - v)], [j, i + 1, u * (1 - v)],
        [j + 1, i, (1 - u) * v], [j + 1, i + 1, u * v],
      ];
      const land = corners.filter(([cj, ci]) => {
        const cx = GRID_BOX.x + (GRID_BOX.w * ci) / COLS;
        const cy = GRID_BOX.y + (GRID_BOX.h * cj) / ROWS;
        return cx >= shoreX(cy);
      });
      const wsum = land.reduce((s, [, , w]) => s + w, 0);
      if (wsum < 0.05) continue;
      for (const [cj, ci, w] of land) out[cj]![ci]! += (delta * w) / wsum / (wsum < 0.6 ? wsum : 1);
    }
  }
  return out;
})();

/** ★ HEIGHT ANYWHERE — bilinear over the grid. THE one height function; the
 *  contours, the bends and the climb all call this and nothing else. */
export function heightAt(x: number, y: number): number {
  const fx = ((x - GRID_BOX.x) / GRID_BOX.w) * COLS;
  const fy = ((y - GRID_BOX.y) / GRID_BOX.h) * ROWS;
  const i = Math.max(0, Math.min(COLS - 1, Math.floor(fx)));
  const j = Math.max(0, Math.min(ROWS - 1, Math.floor(fy)));
  const u = Math.max(0, Math.min(1, fx - i));
  const v = Math.max(0, Math.min(1, fy - j));
  const g = GRID;
  return (g[j]![i]! * (1 - u) + g[j]![i + 1]! * u) * (1 - v)
    + (g[j + 1]![i]! * (1 - u) + g[j + 1]![i + 1]! * u) * v;
}

/** The slope, for anything that follows the ground rather than just standing
 *  on it. Finite differences over the same grid — one source of truth. */
export function gradAt(x: number, y: number): { gx: number; gy: number } {
  const e = 7;
  return {
    gx: (heightAt(x + e, y) - heightAt(x - e, y)) / (2 * e),
    gy: (heightAt(x, y + e) - heightAt(x, y - e)) / (2 * e),
  };
}

/** ★ WHAT A ROUTE CLIMBS: total ascent plus descent along a polyline, sampled
 *  finely enough that a ridge in the middle of a leg cannot hide between two
 *  points. This is the number the expedition loop will rank legs by, and the
 *  number every build deed shows so a route is PLANNED rather than guessed. */
export function climbOf(pts: readonly Pt[]): number {
  if (pts.length < 2) return 0;
  let total = 0;
  let prev = heightAt(pts[0]!.x, pts[0]!.y);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const legLen = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(legLen / 12));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const h = heightAt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      total += Math.abs(h - prev);
      prev = h;
    }
  }
  return total;
}
