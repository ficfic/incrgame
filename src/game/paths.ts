// WHERE A ROAD ACTUALLY RUNS. Not a straight line — a bend, picked once.
//
// ★ THE OWNER, 2026-08-02: *"let's stop making our roads straight, let them
// curve and bend around terrain and objects… maybe i want it to look a bit like
// a labyrinth."*
//
// Each road is a quadratic bend sampled into a short polyline, solved once at
// module load like everything else on this map. The bend is not random-looking
// decoration: of the two candidate bends (left of the line, right of the line),
// **the road takes the one over LOWER ground**, read from the same height field
// the contours are drawn from. So a road between two stops swings away from the
// hill between them, which is what real roads do and why the picture reads as
// terrain rather than as wobble.
//
// ⚠️ THE FILL MUST FOLLOW THIS. `Board.svelte` used to draw the build animation
// as `a + (b−a)×fill`, a straight line by construction — with bent roads that
// would grow a road visibly outside its own bed. The polyline is exported so
// the fill can be cut at a fraction of its LENGTH, not of its chord.
//
// Pure geometry. No DOM, no RNG beyond a seeded hash, no game state.
import { STOPS, STOP } from './stops';
import { SPOT } from './layout';
import { heightAt } from './relief';
import type { Pt } from './shapes';

/** How far the midpoint swings, as a share of the road's length. Enough to
 *  read as a bend at phone size, small enough that roads never wander into a
 *  neighbouring stop's label. */
const SWING = 0.16;

/** Points per road. Nine is smooth at any zoom the board allows and is nothing
 *  to stroke — 35 roads × 8 segments is one order less work than the scatter. */
const STEPS = 9;

/** The same key the engine uses, so the two never disagree about a road. */
const keyOf = (a: number, b: number): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** A deterministic wobble from the key, so the same road bends the same way on
 *  every device — a screenshot of a bug must be reproducible. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0) / 4294967296;
}

function bend(aId: number, bId: number): Pt[] {
  const A = SPOT.get(aId)!, B = SPOT.get(bId)!;
  const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
  // Unit normal to the chord.
  const nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  const swing = len * SWING * (0.7 + 0.6 * hash(keyOf(aId, bId)));
  // ★ THE ROAD GOES ROUND THE HILL: of the two candidate bends, take the one
  // over lower ground. Ties bend by the hash, so parallel roads on flat moor
  // do not all bow the same way.
  const left = { x: mx + nx * swing, y: my + ny * swing };
  const right = { x: mx - nx * swing, y: my - ny * swing };
  const dh = heightAt(left.x, left.y) - heightAt(right.x, right.y);
  const c = Math.abs(dh) < 0.75 ? (hash(`${keyOf(aId, bId)}~`) < 0.5 ? left : right)
    : dh < 0 ? left : right;
  // Quadratic bezier through A, c, B, sampled evenly in t.
  const out: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS, u = 1 - t;
    out.push({
      x: u * u * A.x + 2 * u * t * c.x + t * t * B.x,
      y: u * u * A.y + 2 * u * t * c.y + t * t * B.y,
    });
  }
  // Exact endpoints, whatever floating point thinks: the road must meet its
  // stops or every junction grows a visible gap at high zoom.
  out[0] = { x: A.x, y: A.y };
  out[STEPS] = { x: B.x, y: B.y };
  return out;
}

/** ⚠️ SOLVED ONCE AT MODULE LOAD, keyed like the engine keys roads. Only valid
 *  where stops sit at their AUTHORED coordinates — which is the chapter. The
 *  other tabs solve their own layouts, so a path baked in world coordinates
 *  would connect two points that are not there; they keep straight lines. */
export const ROAD_PATHS: ReadonlyMap<string, readonly Pt[]> = (() => {
  const out = new Map<string, Pt[]>();
  for (const s of STOPS) {
    for (const to of s.near) {
      if (to < s.id) continue;
      out.set(keyOf(s.id, to), bend(s.id, to));
    }
  }
  return out;
})();

/** The path for one road, or null off the chapter. */
export const pathOf = (a: number, b: number): readonly Pt[] | null =>
  ROAD_PATHS.get(keyOf(a, b)) ?? null;

/** Cut a polyline at a fraction of its LENGTH — the fill animation, following
 *  the bend instead of leaving its bed. `from` says which end the work started
 *  at; the returned run always begins there. */
export function cutAt(pts: readonly Pt[], fill: number, fromStart: boolean): Pt[] {
  const run = fromStart ? [...pts] : [...pts].reverse();
  if (fill >= 1) return run;
  if (fill <= 0 || run.length < 2) return [];
  const legs: number[] = [];
  let total = 0;
  for (let i = 0; i + 1 < run.length; i++) {
    const d = Math.hypot(run[i + 1]!.x - run[i]!.x, run[i + 1]!.y - run[i]!.y);
    legs.push(d);
    total += d;
  }
  let want = total * fill;
  const out: Pt[] = [run[0]!];
  for (let i = 0; i < legs.length; i++) {
    if (want <= legs[i]!) {
      const t = legs[i]! > 0 ? want / legs[i]! : 0;
      out.push({
        x: run[i]!.x + (run[i + 1]!.x - run[i]!.x) * t,
        y: run[i]!.y + (run[i + 1]!.y - run[i]!.y) * t,
      });
      return out;
    }
    want -= legs[i]!;
    out.push(run[i + 1]!);
  }
  return out;
}

/** Total length of a run, for the tests: a bend must cost SOME length or it is
 *  not a bend, and not too much or the map is spaghetti. */
export const lengthOf = (pts: readonly Pt[]): number => {
  let n = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    n += Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y);
  }
  return n;
};

/** Straight-line length between two stops, same source of truth as `bend`. */
export const chordOf = (a: number, b: number): number => {
  const A = SPOT.get(a)!, B = SPOT.get(b)!;
  return Math.hypot(B.x - A.x, B.y - A.y);
};

export { keyOf as pathKey, STOP };
