// THE GROUND BETWEEN THE PLACES.
//
// The owner asked for a map that is alive, and then — when I answered the wrong
// question — clarified they meant **computationally** cheap. So the two things
// worth checking are that the scenery is honest about the world it decorates,
// and that it cannot quietly break anything else.
//
// ---- PROVEN RED, 2026-08-01 ----------------------------------------------
// (sabotage log in the commit message)
import { describe, it, expect, vi } from 'vitest';
import { TERRAIN, GROUND_INK, RIVER_INK, RIVER_PLACES, CLEAR, regionOf,
  type Ground } from '../src/game/terrain';
import { SPOT } from '../src/game/layout';
import { PLACE, PLACES } from '../src/game/places';

const rgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const apart = (a: string, b: string): number => {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
};

describe('the river is the one that was already written', () => {
  it('runs through places that exist, in order, and enough of them to bend', () => {
    for (const id of RIVER_PLACES) {
      expect(PLACE.has(id), `river runs through place ${id}, which does not exist`).toBe(true);
    }
    expect(TERRAIN.river.length).toBe(RIVER_PLACES.length);
    expect(TERRAIN.river.length).toBeGreaterThanOrEqual(4);
  });

  it('★ passes through the places whose own prose is about water', () => {
    // Not invented for the map: The Cut is "a river that gave up", there is a
    // Weir holding it, a Headrace feeding a Wheelhouse, a Tailrace carrying it
    // off. If this ever fails, the river has been re-routed away from the
    // content that justifies it.
    const named = RIVER_PLACES.map((id) => PLACE.get(id)!.name);
    expect(named).toContain('The Cut');
    expect(named).toContain('The Weir');
    expect(named).toContain('The Wheelhouse');
    // "Wheel" counts: a wheelhouse between a headrace and a tailrace is a water
    // mill by definition, and its own prose says the floor is wet.
    const wet = /water|river|weir|race|drown|pool|flood|sluice|wheel|wet/i;
    const dry = RIVER_PLACES.filter((id) => !wet.test(PLACE.get(id)!.body)
      && !wet.test(PLACE.get(id)!.name));
    expect(dry.map((id) => PLACE.get(id)!.name),
      'the river runs through places with no water in them').toEqual([]);
  });

  it('follows the layout, so it cannot drift off the map', () => {
    TERRAIN.river.forEach((p, i) => {
      const at = SPOT.get(RIVER_PLACES[i]!)!;
      expect(p.x).toBe(at.x);
      expect(p.y).toBe(at.y);
    });
  });
});

describe('★ the scatter keeps out of the way', () => {
  it('never puts a mark on a place or its label', () => {
    // A mark inside this radius is drawn through a dot or the name under it.
    // ⚠️ CHECKED AGAINST EVERY PLACE, not the one it was scattered around — a
    // mark thrown clear of its own dot lands on a neighbour's often enough.
    let worst = Infinity; let where = '';
    for (const m of TERRAIN.marks) {
      for (const p of PLACES) {
        const s = SPOT.get(p.id)!;
        const d = Math.hypot(s.x - m.x, s.y - m.y);
        if (d < worst) { worst = d; where = p.name; }
      }
    }
    expect(worst, `a mark sits ${worst.toFixed(1)} units from ${where}`)
      .toBeGreaterThanOrEqual(CLEAR);
  });

  it('covers every region, with the ground each region is made of', () => {
    const seen = new Map<string, Set<Ground>>();
    for (const p of PLACES) {
      const r = regionOf(p.id);
      if (!seen.has(r)) seen.set(r, new Set());
    }
    for (const m of TERRAIN.marks) {
      // find the nearest place and credit the mark to its region
      let best = PLACES[0]!, bd = Infinity;
      for (const p of PLACES) {
        const s = SPOT.get(p.id)!;
        const d = Math.hypot(s.x - m.x, s.y - m.y);
        if (d < bd) { bd = d; best = p; }
      }
      seen.get(regionOf(best.id))!.add(m.g);
    }
    for (const [r, kinds] of seen) {
      expect(kinds.size, `${r} has no scenery at all`).toBeGreaterThan(0);
    }
    expect([...seen.keys()].sort()).toEqual(['stones', 'under', 'valley', 'works']);
  });

  it('is enough to read as ground, and not so much it is a texture', () => {
    expect(TERRAIN.marks.length).toBeGreaterThan(150);
    expect(TERRAIN.marks.length).toBeLessThan(900);
  });

  it('boxes the scenery as well as the places', () => {
    // Otherwise the bitmap is cropped and the outermost marks vanish.
    for (const m of TERRAIN.marks) {
      expect(m.x).toBeGreaterThanOrEqual(TERRAIN.box.x);
      expect(m.x).toBeLessThanOrEqual(TERRAIN.box.x + TERRAIN.box.w);
      expect(m.y).toBeGreaterThanOrEqual(TERRAIN.box.y);
      expect(m.y).toBeLessThanOrEqual(TERRAIN.box.y + TERRAIN.box.h);
    }
  });

  it('★ is the same on a second load', () => {
    vi.resetModules();
    return import('../src/game/terrain').then((again) => {
      const one = TERRAIN.marks.map((m) => `${m.x.toFixed(6)},${m.y.toFixed(6)},${m.g}`);
      const two = again.TERRAIN.marks.map((m) => `${m.x.toFixed(6)},${m.y.toFixed(6)},${m.g}`);
      expect(two).toEqual(one);
    });
  });
});

// ⚠️ THE PALETTE CHECKS THAT LIVED HERE HAVE MOVED TO `test/ink.test.ts`, along
// with the palette itself. They were written for scenery and they turned out to
// be a property of every colour in the game — and keeping a copy of the probe's
// hexes in this file was the very duplication the move was meant to end.
