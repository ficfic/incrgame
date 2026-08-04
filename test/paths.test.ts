// WHERE A ROAD RUNS. The bend is geometry with claims in it, so the claims are
// checked as numbers — a screenshot cannot tell a road that avoids the hill
// from one that wobbles at random, and "looks bendy" is not a property.
//
// ---- PROVEN RED, 2026-08-03 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { ROAD_PATHS, pathOf, cutAt, lengthOf, chordOf } from '../src/game/paths';
import { STOPS } from '../src/game/stops';
import { SPOT } from '../src/game/layout';
import { heightAt, shoreX } from '../src/game/relief';

describe('★ every road has a path, and the path meets its stops', () => {
  it('covers every road on the chapter, exactly once', () => {
    const roads = STOPS.reduce((n, s) => n + s.near.length, 0) / 2;
    expect(ROAD_PATHS.size).toBe(roads);
  });

  it('★ starts and ends EXACTLY on its stops', () => {
    // A path that misses its stop by a unit draws a junction with a gap in it
    // at any zoom worth having.
    for (const s of STOPS) {
      for (const to of s.near) {
        if (to < s.id) continue;
        const p = pathOf(s.id, to)!;
        const A = SPOT.get(s.id)!, B = SPOT.get(to)!;
        expect(p[0]).toEqual({ x: A.x, y: A.y });
        expect(p[p.length - 1]).toEqual({ x: B.x, y: B.y });
      }
    }
  });

  it('★ bends where the ground says, runs straight where it does not', () => {
    // ⚠️ THE PER-ROUTE "never dead straight" FLOOR IS GONE, with the fake bow
    // that satisfied it — the owner, 2026-08-04: *"the dotted line dots are
    // too weird and don't follow topology i don't think."* A route on flat
    // ground is now ALLOWED to be a ruler. What must still hold: the map as a
    // whole visibly answers the terrain (most routes bend, and bend hard),
    // and no single route is spaghetti.
    const ratios: number[] = [];
    for (const s of STOPS) {
      for (const to of s.near) {
        if (to < s.id) continue;
        const p = pathOf(s.id, to)!;
        const ratio = lengthOf(p) / chordOf(s.id, to);
        ratios.push(ratio);
        // ⚠️ 1.55, RAISED FROM 1.35 WITH A REASON: road 17|18 detours at 1.42x
        // to get AROUND the crag cluster instead of over it — which is the
        // owner's ask, verbatim. The cap now only catches genuine spaghetti.
        expect(ratio, `${s.id}|${to} wanders (${ratio.toFixed(2)}x its chord)`).toBeLessThan(1.55);
      }
    }
    // Measured 2026-08-04, terrain-only: 32 of 35 bend past 1.01, median
    // 1.32. Bounds set well inside that, so this is red if the relaxer stops
    // reading the grid — not if the map gains one more flat route.
    const bent = ratios.filter((r) => r > 1.01).length;
    expect(bent, `only ${bent} of ${ratios.length} routes bend at all`).toBeGreaterThan(ratios.length * 0.6);
    const median = [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length / 2)]!;
    expect(median, `median bend ${median.toFixed(3)} — the grid is not being read`).toBeGreaterThan(1.05);
  });

  it('is the same on every load — no clock, no Math.random', () => {
    const a = pathOf(STOPS[2]!.id, STOPS[2]!.near[0]!)!;
    const b = pathOf(STOPS[2]!.id, STOPS[2]!.near[0]!)!;
    expect(a).toEqual(b);
  });

  it('★ runs LOWER than the straight line would, where the ground leans', () => {
    // The claim in the header, as an integral rather than a point: a road that
    // follows geography spends less of its length uphill than the ruler line
    // between the same two stops. Point-at-the-midpoint was the old test and it
    // asserted the old mechanism (one quadratic bow); a relaxed path can sit a
    // touch high at any single point while being lower over its run.
    const mean = (pts: readonly { x: number; y: number }[]): number =>
      pts.reduce((s, p) => s + heightAt(p.x, p.y), 0) / pts.length;
    let judged = 0, uphill = 0, sum = 0;
    for (const s of STOPS) {
      for (const to of s.near) {
        if (to < s.id) continue;
        const A = SPOT.get(s.id)!, B = SPOT.get(to)!;
        const p = pathOf(s.id, to)!;
        const straight = p.map((_, i) => ({
          x: A.x + ((B.x - A.x) * i) / (p.length - 1),
          y: A.y + ((B.y - A.y) * i) / (p.length - 1),
        }));
        // Only judge roads with real relief across them — on a flat the bend is
        // a coin toss on purpose and either side is equally honest.
        const spread = Math.max(...straight.map((q) => heightAt(q.x, q.y)))
          - Math.min(...straight.map((q) => heightAt(q.x, q.y)));
        if (spread < 6) continue;
        judged++;
        const d = mean(straight) - mean(p);
        sum += d;
        if (d < -0.3) uphill++;
      }
    }
    expect(judged, 'no road crosses real relief — this test judged nothing')
      .toBeGreaterThan(5);
    // ⚠️ AGGREGATE MARGINS, AND A SABOTAGE IS WHY. The first version accepted
    // any road within +0.75 of its ruler line as "lower" — and with the terrain
    // entirely ignored (hash-direction bows, no relaxation) small uphill bows
    // slid under that epsilon and 100% still "passed". Measured on the real
    // relaxation: mean saving 0.88, one road in 34 marginally uphill. With the
    // sabotage the mean collapses toward zero and half the bows run uphill —
    // both lines below fire.
    expect(sum / judged, 'the roads barely save any climb over the ruler lines')
      .toBeGreaterThan(0.35);
    expect(uphill / judged, `${uphill} of ${judged} roads run distinctly UPHILL of their ruler line`)
      .toBeLessThan(0.15);
  });

  it('★ goes AROUND a real hill, not over it', () => {
    // The owner, on the gradient version: *"some roads go over the hill when
    // they should go around."* Where the ruler line crests something standing
    // well above both ends — the crag crossing at 22|23 stands +52.8 — the
    // built path's PEAK must be meaningfully lower. Small broad bumps (+6 to
    // +9 exist on this map) are excused: detouring those is not worth a road.
    const peak = (pts: readonly { x: number; y: number }[]): number =>
      Math.max(...pts.map((p) => heightAt(p.x, p.y)));
    let judged = 0;
    for (const s of STOPS) {
      for (const to of s.near) {
        if (to < s.id) continue;
        const A = SPOT.get(s.id)!, B = SPOT.get(to)!;
        const p = pathOf(s.id, to)!;
        const straight = p.map((_, i) => ({
          x: A.x + ((B.x - A.x) * i) / (p.length - 1),
          y: A.y + ((B.y - A.y) * i) / (p.length - 1),
        }));
        const ends = Math.max(heightAt(A.x, A.y), heightAt(B.x, B.y));
        if (peak(straight) - ends < 20) continue;
        // ⚠️ JUDGED AGAINST WHAT A ROAD COULD ACTUALLY TAKE, and both earlier
        // bounds were wrong in turn. "Avoid more than 5" was a magic number;
        // then a PARALLEL-corridor bound floated its endpoints off the stops —
        // no end-pinned road can follow it, and it demanded 5.0 where the best
        // reachable line offered less. The honest family is the BOW: sine-
        // shaped, ends pinned, within the road's own stray cap — exactly the
        // move the builder itself owns. The built road must capture at least
        // three quarters of the best bow's avoidance.
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        const nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
        let best = peak(straight);
        for (let o = -0.32; o <= 0.32; o += 0.04) {
          let pk = -Infinity;
          for (let tt = 0; tt <= 1; tt += 0.05) {
            const bow = o * len * Math.sin(Math.PI * tt);
            pk = Math.max(pk, heightAt(A.x + (B.x - A.x) * tt + nx * bow,
              A.y + (B.y - A.y) * tt + ny * bow));
          }
          best = Math.min(best, pk);
        }
        const offered = peak(straight) - best;
        if (offered < 4) continue;              // nothing to go around — a wall
        judged++;
        expect(peak(straight) - peak(p),
          `${s.id}|${to} crests +${(peak(straight) - ends).toFixed(0)}, the best bow offers `
          + `${offered.toFixed(1)} of avoidance, the road takes `
          + `${(peak(straight) - peak(p)).toFixed(1)}`).toBeGreaterThan(offered * 0.75);
      }
    }
    expect(judged, 'no ruler line crests a real hill — this test judged nothing')
      .toBeGreaterThan(0);
  });

  it('★ and never wades into the sea', () => {
    // ⚠️ THE DEFENCES THIS GUARDS ARE CURRENTLY UNEXERCISED, and honestly so:
    // with height-COMPARISON descent the flat sea plain attracts nothing, so
    // removing both the water-cost and the clamp changed no road at all. They
    // were load-bearing under the gradient version (the owner watched roads
    // pile onto the beach) and they are kept as the rule for maps where the
    // coast is not conveniently repulsive. The test itself fires — proven by
    // making water ATTRACT (roads dived straight in).
    for (const [, pts] of ROAD_PATHS) {
      for (const p of pts) {
        expect(p.x, `a road point at ${p.x.toFixed(0)},${p.y.toFixed(0)} is offshore`)
          .toBeGreaterThan(shoreX(p.y) + 7.5);
      }
    }
  });
});

describe('★ the fill follows the bend', () => {
  const path = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] as const;

  it('cuts at a fraction of LENGTH, not of the chord', () => {
    // The path above is 20 long but its chord is ~14.1. Half the LENGTH is the
    // corner — a chord-based cut would put it somewhere else entirely.
    const half = cutAt(path, 0.5, true);
    expect(half[half.length - 1]).toEqual({ x: 10, y: 0 });
  });

  it('★ starts from the end the work started from', () => {
    // The twice-reported bug, as a property: fill from the far end grows the
    // road backwards.
    const fromA = cutAt(path, 0.25, true);
    const fromB = cutAt(path, 0.25, false);
    expect(fromA[0]).toEqual({ x: 0, y: 0 });
    expect(fromB[0]).toEqual({ x: 10, y: 10 });
    expect(fromA[fromA.length - 1]).toEqual({ x: 5, y: 0 });
    expect(fromB[fromB.length - 1]).toEqual({ x: 10, y: 5 });
  });

  it('is the whole run at 1 and nothing at 0', () => {
    expect(cutAt(path, 1, true)).toEqual([...path]);
    expect(cutAt(path, 0, true)).toEqual([]);
  });
});
