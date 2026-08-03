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

  it('★ bends — every road is longer than its chord, and none is spaghetti', () => {
    for (const s of STOPS) {
      for (const to of s.near) {
        if (to < s.id) continue;
        const p = pathOf(s.id, to)!;
        const ratio = lengthOf(p) / chordOf(s.id, to);
        expect(ratio, `${s.id}|${to} is dead straight`).toBeGreaterThan(1.003);
        expect(ratio, `${s.id}|${to} wanders (${ratio.toFixed(2)}x its chord)`).toBeLessThan(1.35);
      }
    }
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

  it('★ and never wades into the sea', () => {
    for (const [, pts] of ROAD_PATHS) {
      for (const p of pts) {
        expect(p.x, `a road point at ${p.x.toFixed(0)},${p.y.toFixed(0)} is offshore`)
          .toBeGreaterThan(shoreX(p.y) - 0.5);
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
