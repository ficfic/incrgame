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

/** ★ THE ROAD PICKS THE CHEAPEST LINE THE GROUND OFFERS. The owner, twice:
 *  first *"nothing follows geography"*, then — after a gradient-following
 *  version — *"some roads go over the hill when they should go around, or end
 *  up in the sea."* Both complaints were the same two defects:
 *
 *  ⚠️ A GRADIENT FEELS NOTHING ON A CREST. The first relaxation slid points
 *  down the LATERAL slope — and dead on a hilltop the lateral slope is zero,
 *  so a hill sitting square on the chord was climbed straight over. This one
 *  does coordinate descent on the HEIGHTS themselves: each point repeatedly
 *  tries stepping left and right of where it is and keeps whichever line costs
 *  least, so a crest loses to the ground beside it no matter what the local
 *  gradient says.
 *
 *  ⚠️ AND THE SEA IS A WALL, NOT A PLAIN. West of the shore the height field
 *  relaxes to open-moor height, so "downhill" pointed INTO the water and the
 *  coastal roads piled onto the beach clamp. The cost below makes water
 *  climb steeply with depth; a road may touch the foreshore only if every
 *  alternative is a worse hill.
 */
const STEPS = 10;
const STRAY = 0.3;

function cost(x: number, y: number): number {
  const wet = shoreX(y) + 22 - x;
  return heightAt(x, y) + (wet > 0 ? wet * wet * 0.08 : 0);
}

function bend(aId: number, bId: number): Pt[] {
  const A = SPOT.get(aId)!, B = SPOT.get(bId)!;
  const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
  const nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
  const most = len * STRAY;
  const at = (i: number, o: number): Pt => ({
    x: A.x + ((B.x - A.x) * i) / STEPS + nx * o,
    y: A.y + ((B.y - A.y) * i) / STEPS + ny * o,
  });

  const off: number[] = Array.from({ length: STEPS + 1 }, () => 0);
  // Stiffness is in the cost, not a smoothing pass: a point pays for leaving
  // the line its neighbours make. That is what keeps the result a road.
  const price = (i: number, o: number): number => {
    const p = at(i, o);
    return cost(p.x, p.y) + Math.abs(o - (off[i - 1]! + off[i + 1]!) / 2) * 0.35;
  };
  for (let step = 9; step >= 1.5; step *= 0.7) {
    for (let round = 0; round < 4; round++) {
      for (let i = 1; i < STEPS; i++) {
        const here = price(i, off[i]!);
        const left = off[i]! - step >= -most ? price(i, off[i]! - step) : Infinity;
        const right = off[i]! + step <= most ? price(i, off[i]! + step) : Infinity;
        if (left < here && left <= right) off[i] = off[i]! - step;
        else if (right < here) off[i] = off[i]! + step;
      }
    }
  }

  // ★ A MINIMUM OF PERSONALITY on ground with no opinion — the ask was to stop
  // making roads straight, and "flat here" earns a lazy curve, not a ruler.
  const maxAbs = Math.max(...off.map(Math.abs));
  if (maxAbs < len * 0.055) {
    // ⚠️ ALONG THE EXISTING BOW, NOT BY THE HASH. A hash direction opposing the
    // descent's own small bow CANCELS it — road 1|5 came out at 1.0016x its
    // chord that way, deader than either part alone.
    const mid = off[Math.floor(STEPS / 2)]!;
    const dir = mid !== 0 ? Math.sign(mid) : hash(keyOf(aId, bId)) < 0.5 ? -1 : 1;
    for (let i = 1; i < STEPS; i++) {
      off[i] = off[i]! + dir * (len * 0.055 - maxAbs) * Math.sin(Math.PI * (i / STEPS));
    }
  }

  const out: Pt[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const p = at(i, off[i]!);
    // The hard floor stays even with the wall in the cost — a cost is an
    // argument and a clamp is a rule.
    out.push({ x: Math.max(p.x, shoreX(p.y) + 12), y: p.y });
  }
  out[0] = { x: A.x, y: A.y };
  out[STEPS] = { x: B.x, y: B.y };
  return out;
}

/** A deterministic wobble from the key, so the same road bends the same way on
 *  every device — a screenshot of a bug must be reproducible. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return (h >>> 0) / 4294967296;
}

/** The same key the engine uses, so the two never disagree about a road. */
const keyOf = (a: number, b: number): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

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
