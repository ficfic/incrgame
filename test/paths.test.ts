// WHERE A ROAD RUNS. The bend is geometry with claims in it, so the claims are
// checked as numbers — a screenshot cannot tell a road that avoids the hill
// from one that wobbles at random, and "looks bendy" is not a property.
//
// ---- PROVEN RED, 2026-08-03 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { ROAD_PATHS, pathOf, cutAt, lengthOf, chordOf } from '../src/game/paths';
import { STOPS } from '../src/game/stops';
import { SPOT } from '../src/game/layout';
import { heightAt } from '../src/game/relief';

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

  it('★ takes the LOWER side where the ground clearly leans', () => {
    // The claim in the header: roads bend round the hill, not onto it. For each
    // road whose two candidate bends differ meaningfully in height, the built
    // path's midpoint must sit on the lower side. Roads over near-flat ground
    // are excused — there the bend is a coin toss on purpose.
    let judged = 0;
    for (const s of STOPS) {
      for (const to of s.near) {
        if (to < s.id) continue;
        const A = SPOT.get(s.id)!, B = SPOT.get(to)!;
        const p = pathOf(s.id, to)!;
        const mid = p[Math.floor(p.length / 2)]!;
        const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        const len = Math.hypot(B.x - A.x, B.y - A.y);
        const nx = -(B.y - A.y) / len, ny = (B.x - A.x) / len;
        const off = (mid.x - mx) * nx + (mid.y - my) * ny;
        const here = heightAt(mx + nx * Math.abs(off), my + ny * Math.abs(off));
        const there = heightAt(mx - nx * Math.abs(off), my - ny * Math.abs(off));
        if (Math.abs(here - there) < 2) continue;   // flat enough to be a coin toss
        judged++;
        const took = off > 0 ? here : there;
        const spurned = off > 0 ? there : here;
        expect(took, `road ${s.id}|${to} climbed the hill it could have gone round`)
          .toBeLessThanOrEqual(spurned);
      }
    }
    expect(judged, 'no road had a hill to avoid — this test judged nothing')
      .toBeGreaterThan(3);
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
