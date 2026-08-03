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
import { heightAt, gradAt, shoreX } from './relief';
import type { Pt } from './shapes';

/** Points per road. Enough for the relaxation to find a shape, few enough that
 *  35 roads are still nothing to stroke. */
const STEPS = 10;

/** How far a road may stray from its chord, as a share of its length. The cap
 *  is what keeps a road a road — without it the relaxation would happily send
 *  every route down the same valley. */
const STRAY = 0.22;

/** The same key the engine uses, so the two never disagree about a road. */
const keyOf = (a: number, b: number): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** A deterministic wobble from the key, so the same road bends the same way on
 *  every device — a screenshot of a bug must be reproducible. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0) / 4294967296;
}

/** ★ THE ROAD RELAXES ONTO THE GROUND. The owner: *"nothing follows geography,
 *  we made hills so that rivers and roads can take them into account."* The
 *  first cut was one quadratic bow toward the lower of two sampled points — a
 *  nod at the terrain, not a route through it.
 *
 *  This walks the straight line, then repeatedly nudges every interior point
 *  DOWNHILL ACROSS ITS OWN DIRECTION of travel — the lateral part of the
 *  gradient only, because a road avoids climbs sideways but still has to get
 *  where it is going. A smoothing pass after each nudge keeps it a road rather
 *  than a zigzag, and the stray cap keeps it out of the next valley over.
 *  Deterministic: the only randomness is a hash-seeded nudge that breaks ties
 *  on flat ground. */
function bend(aId: number, bId: number): Pt[] {
  const A = SPOT.get(aId)!, B = SPOT.get(bId)!;
  const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
  const cx = (B.x - A.x) / len, cy = (B.y - A.y) / len;
  const nx = -cy, ny = cx;                          // unit normal to the chord
  const most = len * STRAY;
  const tie = (hash(keyOf(aId, bId)) - 0.5) * 6;

  // Offsets from the chord, per interior point — SEEDED with a lazy bow, so
  // ground with no opinion still gives a country road rather than a ruler. The
  // relaxation then reshapes it wherever the ground does have one.
  // Downhill if the ground leans at the midpoint; the hash only breaks flats.
  const g0 = gradAt((A.x + B.x) / 2, (A.y + B.y) / 2);
  const lean = g0.gx * nx + g0.gy * ny;
  const dir = Math.abs(lean) > 0.02 ? -Math.sign(lean)
    : hash(keyOf(aId, bId)) < 0.5 ? -1 : 1;
  const off: number[] = Array.from({ length: STEPS + 1 },
    (_, i) => dir * Math.sin(Math.PI * (i / STEPS)) * len * 0.06);
  off[0] = 0; off[STEPS] = 0;
  for (let round = 0; round < 14; round++) {
    for (let i = 1; i < STEPS; i++) {
      const t = i / STEPS;
      const x = A.x + (B.x - A.x) * t + nx * off[i]!;
      const y = A.y + (B.y - A.y) * t + ny * off[i]!;
      const g = gradAt(x, y);
      // The lateral component of the slope: positive means uphill toward +n.
      const lateral = g.gx * nx + g.gy * ny;
      off[i] = off[i]! - Math.max(-2.4, Math.min(2.4, lateral * 1.6)) + tie / 14;
      // Smoothing: a road is stiff. Half its position, half its neighbours'.
      off[i] = 0.6 * off[i]! + 0.2 * off[i - 1]! + 0.2 * off[i + 1]!;
      off[i] = Math.max(-most, Math.min(most, off[i]!));
    }
  }

  // ★ A MINIMUM OF PERSONALITY. Where the ground had no opinion and the
  // relaxation flattened the seed back out, re-bow gently — the owner's ask was
  // to stop making roads straight, and "the ground is flat here" is a reason
  // for a lazy curve, not a ruler.
  const maxAbs = Math.max(...off.map(Math.abs));
  if (maxAbs < len * 0.035) {
    for (let i = 1; i < STEPS; i++) {
      off[i] = off[i]! + dir * (len * 0.05 - maxAbs) * Math.sin(Math.PI * (i / STEPS));
    }
  }

  const out: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    let x = A.x + (B.x - A.x) * t + nx * off[i]!;
    const y = A.y + (B.y - A.y) * t + ny * off[i]!;
    // ⚠️ AND NEVER INTO THE SEA. The coast cuts every line that is not the
    // sea's own — a road wading offshore would be the map contradicting itself.
    x = Math.max(x, shoreX(y) + 9);
    out.push({ x, y });
  }
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
