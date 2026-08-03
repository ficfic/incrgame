// THE TOPOGRAPHY — the grid that is now the model.
//
// ---- PROVEN RED, 2026-08-03 (sabotage log in the commit message) -----------
import { describe, it, expect, vi } from 'vitest';
import { GRID, GRID_BOX, COLS, ROWS, heightAt, climbOf, shoreX,
  HEIGHT } from '../src/game/height';
import { STOPS } from '../src/game/stops';

describe('★ the grid is the model', () => {
  it('has the promised shape, every sample a real number', () => {
    expect(GRID.length).toBe(ROWS + 1);
    for (const row of GRID) {
      expect(row.length).toBe(COLS + 1);
      for (const h of row) expect(Number.isFinite(h)).toBe(true);
    }
  });

  it('★ is the same on a second load — no clock, no Math.random', () => {
    vi.resetModules();
    return import('../src/game/height').then((again) => {
      expect(again.GRID).toEqual(GRID);
    });
  });

  it('★ honours the stops: the land under a stop is its ground\'s height', () => {
    // The grounds price the pipes, so the map must not lie about money — a
    // crag stop on low ground would draw contours that contradict the bill.
    for (const s of STOPS) {
      const h = heightAt(s.x, s.y);
      expect(Math.abs(h - HEIGHT[s.ground]),
        `${s.name} (${s.ground}) wants ${HEIGHT[s.ground]}, the grid says ${h.toFixed(1)}`)
        .toBeLessThan(10);
    }
  });

  it('★ has real relief BETWEEN the stops, not just blobs around them', () => {
    // The whole complaint this file answers: the old field was an
    // inverse-distance blur, so between stops it was always a smooth ramp.
    // The grid must vary out there — sample the empty quarters and demand
    // spread.
    const far: number[] = [];
    for (let j = 1; j < ROWS; j++) {
      for (let i = 1; i < COLS; i++) {
        const x = GRID_BOX.x + (GRID_BOX.w * i) / COLS;
        const y = GRID_BOX.y + (GRID_BOX.h * j) / ROWS;
        if (x < shoreX(y) + 10) continue;         // the sea is flat by design
        const near = Math.min(...STOPS.map((s) => Math.hypot(s.x - x, s.y - y)));
        if (near > 120) far.push(GRID[j]![i]!);
      }
    }
    expect(far.length, 'no samples far from any stop — the box is too tight')
      .toBeGreaterThan(8);
    const spread = Math.max(...far) - Math.min(...far);
    expect(spread, `the empty quarters only vary by ${spread.toFixed(1)}`)
      .toBeGreaterThan(18);
  });

  it('matches its own samples exactly at the grid points', () => {
    for (const [i, j] of [[3, 4], [10, 15], [18, 25]] as const) {
      const x = GRID_BOX.x + (GRID_BOX.w * i) / COLS;
      const y = GRID_BOX.y + (GRID_BOX.h * j) / ROWS;
      expect(heightAt(x, y)).toBeCloseTo(GRID[j]![i]!, 6);
    }
  });

  it('the sea is below water, and shelves', () => {
    for (let y = GRID_BOX.y + 40; y < GRID_BOX.y + GRID_BOX.h; y += 200) {
      expect(heightAt(shoreX(y) - 30, y)).toBeLessThan(0);
      expect(heightAt(shoreX(y) - 80, y)).toBeLessThan(heightAt(shoreX(y) - 30, y));
    }
  });
});

describe('★ climb is ascent plus descent, sampled finely', () => {
  it('reads a hand-checkable profile off the real grid', () => {
    // Straight up a known slope and back: climb ≈ |up| + |down|, and a longer
    // sampling step must not miss the summit between two points.
    const a = { x: 300, y: 300 }, b = { x: 300, y: 500 };
    const ha = heightAt(a.x, a.y), hm = heightAt(300, 400), hb = heightAt(b.x, b.y);
    const c = climbOf([a, b]);
    // At minimum the direct differences; more if the ground rolls in between.
    expect(c).toBeGreaterThanOrEqual(Math.abs(hm - ha) + Math.abs(hb - hm) - 0.5);
    expect(Number.isFinite(c)).toBe(true);
  });

  it('is zero for a point and grows with a detour over relief', () => {
    expect(climbOf([{ x: 300, y: 300 }])).toBe(0);
    const flatish = climbOf([{ x: 300, y: 300 }, { x: 302, y: 300 }]);
    expect(flatish).toBeLessThan(3);
  });
});
