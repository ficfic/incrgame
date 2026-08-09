import { describe, it, expect } from 'vitest';
import { ward, held, wardKey, WARD_PAD } from '../src/camp/barrier';
import { initial, SITES, SITE, type City } from '../src/camp/engine';

/** Is p inside the closed polygon? Ray casting. */
const inside = (poly: { x: number; y: number }[], p: { x: number; y: number }): boolean => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!, b = poly[j]!;
    if ((a.y > p.y) !== (b.y > p.y)
      && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
};
const area = (poly: { x: number; y: number }[]): number => {
  let s = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    s += (poly[j]!.x + poly[i]!.x) * (poly[j]!.y - poly[i]!.y);
  }
  return Math.abs(s / 2);
};

describe('★★★ THE BARRIER — the line around the ground you hold', () => {
  it('★ at the start it holds the starter ring and shuts the goblins out', () => {
    const g = initial();
    const w = ward(g);
    expect(w.length).toBeGreaterThan(3);
    // Every safe stop is inside...
    for (const s of SITES) {
      if (g.goblins[s.id]) continue;
      expect(inside(w, { x: s.x, y: s.y }), `${s.name} should be inside`).toBe(true);
    }
    // ...and every holding the goblins have is outside.
    for (const id of Object.keys(g.goblins).map(Number)) {
      const s = SITE.get(id)!;
      expect(inside(w, { x: s.x, y: s.y }), `${s.name} should be outside`).toBe(false);
    }
  });

  it('★★★ TAKING GROUND PUSHES THE LINE OUT — the whole point of drawing it', () => {
    const before = ward(initial());
    const after = ward({ ...initial(), goblins: { 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 } });
    expect(area(after)).toBeGreaterThan(area(before) * 1.1);
    // And the ground just taken is now inside a line it was outside of.
    const knoll = SITE.get(4)!;
    expect(inside(before, knoll)).toBe(false);
    expect(inside(after, knoll)).toBe(true);
  });

  it('★ ground hidden behind held ground is not yours either', () => {
    // Site 7 sits behind the knoll (6). While the knoll is held, the deep
    // country is not inside the barrier even though it has no goblins itself.
    const g: City = { ...initial(), goblins: { 6: 24 } };
    expect(held(g).some((p) => p.x === SITE.get(7)!.x)).toBe(false);
    const freed: City = { ...initial(), goblins: {} };
    expect(held(freed).some((p) => p.x === SITE.get(7)!.x)).toBe(true);
  });

  it('★ one stop yields a ring, two a capsule — no special cases', () => {
    const lone: City = { ...initial(),
      goblins: Object.fromEntries(SITES.filter((s) => s.id !== 0).map((s) => [s.id, 9])) };
    const w = ward(lone);
    expect(w.length).toBeGreaterThan(6);
    const camp = SITE.get(0)!;
    expect(inside(w, camp)).toBe(true);
    // Roughly a circle of WARD_PAD about the camp.
    for (const p of w) {
      const d = Math.hypot(p.x - camp.x, p.y - camp.y);
      expect(d).toBeGreaterThan(WARD_PAD * 0.85);
      expect(d).toBeLessThan(WARD_PAD * 1.05);
    }
  });

  it('★ the line clears the stops it encloses, so dots never sit on it', () => {
    const g = initial();
    const w = ward(g);
    for (const s of held(g)) {
      let near = Infinity;
      for (const p of w) near = Math.min(near, Math.hypot(p.x - s.x, p.y - s.y));
      expect(near).toBeGreaterThan(WARD_PAD * 0.8);
    }
  });

  it('the key changes exactly when the held ground does', () => {
    expect(wardKey(initial())).toBe(wardKey(initial()));
    expect(wardKey({ ...initial(), goblins: {} })).not.toBe(wardKey(initial()));
  });

  it('never throws when nothing is held', () => {
    const none: City = { ...initial(),
      goblins: Object.fromEntries(SITES.map((s) => [s.id, 9])) };
    expect(ward(none)).toEqual([]);
  });
});
