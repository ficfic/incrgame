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

/** Authored coordinates, for the same cycle-breaking reason as `height.ts`:
 *  engine imports paths now, and paths importing layout would loop back
 *  through world to engine. The numbers are identical to layout's. */
const SPOT = new Map(STOPS.map((s) => [s.id, { x: s.x, y: s.y }]));
// ⚠️ FROM `height` DIRECTLY, NOT via relief's re-export. relief's own imports
// evaluate layout→world→engine→paths BEFORE relief reaches its height
// re-export, so importing through relief handed this file an unevaluated
// binding — "shoreX is not a function", found by the suite the moment the
// engine started importing paths.
import { heightAt, gradAt, shoreX } from './height';
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
const STRAY = 0.32;

function cost(x: number, y: number): number {
  const wet = shoreX(y) + 22 - x;
  const h = heightAt(x, y);
  // ★ HIGH GROUND COSTS MORE THAN LINEARLY. The complaint is about PEAKS —
  // *"why would it climb up and down a hill"* — and a linear cost happily buys
  // one 70 crossing to save two 35s. Above the moor line every extra unit
  // counts double, so a bow that shaves the crest pays for its own bend.
  return h + Math.max(0, h - 36) * 2 + (wet > 0 ? wet * wet * 0.08 : 0);
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
    return cost(p.x, p.y) + Math.abs(o - (off[i - 1]! + off[i + 1]!) / 2) * 0.33;
  };
  // ⚠️ EIGHT ROUNDS PER STEP, UP FROM FOUR. On the gridded field the crag
  // shoulder at 22|23 spans the whole corridor; four rounds left the bow
  // capturing 3.4 of an available ~10 — the schedule ran out before the line
  // finished sliding off the ridge. Meausured, not guessed: parallel-corridor
  // sampling puts the best line at 40.4 against a straight-line crest of 50.5.
  // ⚠️ TWO KINDS OF MOVE, AND THE SECOND EXISTS BECAUSE THE FIRST GETS STUCK.
  // Point-by-point descent converges into a stiffness trap: sliding one point
  // off a ridge costs more in bend than it gains in height, even when sliding
  // the WHOLE line would pay handsomely — 22|23 sat capturing 3.4 of an
  // available 9.1 at any number of rounds. So each pass also tries a
  // coordinated BOW of the entire line, which is the move that carries a road
  // off a ridge in one piece.
  const total = (): number => {
    let s = 0;
    for (let i = 1; i < STEPS; i++) s += price(i, off[i]!);
    return s;
  };
  for (let step = 9; step >= 1.2; step *= 0.7) {
    for (const dir of [-1, 1]) {
      // Keep bowing while each increment pays; revert the one that does not.
      for (let tries = 0; tries < 8; tries++) {
        const was = total();
        const saved = [...off];
        for (let i = 1; i < STEPS; i++) {
          const bowed = off[i]! + dir * step * Math.sin(Math.PI * (i / STEPS));
          off[i] = Math.max(-most, Math.min(most, bowed));
        }
        if (total() >= was) {
          for (let i = 0; i <= STEPS; i++) off[i] = saved[i]!;
          break;
        }
      }
    }
    for (let round = 0; round < 8; round++) {
      for (let i = 1; i < STEPS; i++) {
        const here = price(i, off[i]!);
        const left = off[i]! - step >= -most ? price(i, off[i]! - step) : Infinity;
        const right = off[i]! + step <= most ? price(i, off[i]! + step) : Infinity;
        if (left < here && left <= right) off[i] = off[i]! - step;
        else if (right < here) off[i] = off[i]! + step;
      }
    }
  }

  // ⚠️ THE "MINIMUM OF PERSONALITY" FLOOR THAT USED TO LIVE HERE IS GONE, on
  // the owner's play-test, 2026-08-04: *"the dotted line dots are too weird
  // and don't follow topology i don't think."* It forced EVERY route to bow at
  // least 5.5% of its length, terrain or no terrain — which is precisely a
  // bend that does not follow topology. Flat ground now earns a straight
  // road, and every curve on the map is the height grid talking.
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
