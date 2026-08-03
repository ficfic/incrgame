// THE SHAPE OF THE GROUND.
//
// ⚠️ THE HARD PART OF THIS FILE IS NOT TESTING THAT CONTOURS EXIST. A broken
// marching-squares pass still returns hundreds of plausible-looking line
// segments, and a screenshot of a wrong contour map looks exactly like a
// screenshot of a right one — which is the whole reason this is checked against
// a field whose answer is known by hand rather than against the real map.
//
// ---- PROVEN RED, 2026-08-02 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { heightAt, contours, regions, HEIGHT } from '../src/game/relief';
import { STOPS, GOING } from '../src/game/stops';
import { TERRAIN } from '../src/game/terrain';
import { SPOT } from '../src/game/layout';

describe('★ height is the ground, and the ground is the price', () => {
  it('stands high on a crag and low in the water', () => {
    const crag = STOPS.find((p) => p.ground === 'crag')!;
    const water = STOPS.find((p) => p.ground === 'water')!;
    const up = heightAt(SPOT.get(crag.id)!.x, SPOT.get(crag.id)!.y);
    const down = heightAt(SPOT.get(water.id)!.x, SPOT.get(water.id)!.y);
    expect(up, `${crag.name} (crag) is at ${up}`).toBeGreaterThan(down + 20);
  });

  it('★ and every ground the roads are priced by has a height', () => {
    // The claim in the file header: the contours are a picture of the price. If
    // a ground could be priced without having a height, the picture would have
    // a hole in it exactly where the expensive part is.
    for (const g of Object.keys(GOING)) {
      expect(HEIGHT[g as keyof typeof HEIGHT], `no height for "${g}"`).toBeDefined();
    }
  });

  it('is finite everywhere, including exactly on a stop', () => {
    // A stop is distance zero from itself, and an inverse-distance field
    // divides by that. One NaN spreads through the contour pass and the whole
    // relief silently disappears.
    for (const p of STOPS) {
      const at = SPOT.get(p.id)!;
      expect(Number.isFinite(heightAt(at.x, at.y)), `${p.name}`).toBe(true);
    }
    expect(Number.isFinite(heightAt(99999, 99999))).toBe(true);
  });
});

describe('★★ marching squares, against an answer known by hand', () => {
  // A CONE. Height falls off with distance from the middle, so the contour at
  // any level is a CIRCLE of a radius that can be worked out with arithmetic —
  // which is the only way to tell a correct contour map from a wrong one that
  // also has lines in it.
  const R = 300;
  const box = { x: -R, y: -R, w: R * 2, h: R * 2 };
  const cone = (x: number, y: number): number => 100 - Math.hypot(x, y);

  it('draws one closed ring per level, at the right radius', () => {
    // 100 - r = level  →  r = 100 - level. At level 40 that is a circle of 60.
    const rings = contours(box, [40], 6, cone);
    expect(rings.length, `${rings.length} runs — expected one ring`).toBe(1);
    const ring = rings[0]!;
    expect(ring.length).toBeGreaterThan(20);
    for (const p of ring) {
      expect(Math.hypot(p.x, p.y), `a point at ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .toBeCloseTo(60, 0);
    }
    // ⚠️ AND IT IS CLOSED. A ring stitched wrong comes back as an arc that
    // happens to lie on the circle, which passes every check above.
    const a = ring[0]!, z = ring[ring.length - 1]!;
    expect(Math.hypot(a.x - z.x, a.y - z.y), 'the ring does not close').toBeLessThan(2);
  });

  it('★ puts a HIGHER level INSIDE a lower one', () => {
    // The property that catches the level being read the wrong way round — a
    // sign flip draws a perfectly tidy contour map that is inside out.
    const [inner] = contours(box, [70], 6, cone);
    const [outer] = contours(box, [20], 6, cone);
    const far = (pts: { x: number; y: number }[]): number =>
      Math.max(...pts.map((p) => Math.hypot(p.x, p.y)));
    expect(far(inner!)).toBeLessThan(far(outer!));
  });

  it('finds nothing at a level the ground never reaches', () => {
    expect(contours(box, [900], 6, cone)).toEqual([]);
  });
});

describe('★ the real chapter has relief on it', () => {
  it('draws contours, and they stay on the map', () => {
    const box = { x: -100, y: -100, w: 900, h: 1300 };
    const runs = contours(box, [30, 50, 70]);
    expect(runs.length, 'no contour lines at all').toBeGreaterThan(2);
    for (const run of runs) {
      expect(run.length).toBeGreaterThan(2);
      for (const p of run) {
        expect(p.x).toBeGreaterThanOrEqual(box.x - 1);
        expect(p.x).toBeLessThanOrEqual(box.x + box.w + 1);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    }
  });
});

describe('★★ a region is drawn around the stops that are in it', () => {
  const RG = regions();

  it('finds more than one region, and never rings the neutral ground', () => {
    expect(RG.length, 'no regions at all').toBeGreaterThan(1);
    // Stone is the start, the finish and scattered hard standing. A ring round
    // it would be a border round most of the map saying nothing.
    expect(RG.map((r) => r.ground)).not.toContain('stone');
  });

  it('★ and every stop of that ground really is INSIDE its own ring', () => {
    // ⚠️ THE ONE THAT MATTERS, and the reason this is a test rather than a look
    // at a screenshot. "An oval with a forest inside" is a claim about
    // CONTAINMENT. A ring drawn from a centroid and a mean radius looks correct
    // and leaves the outlying trees standing in the grass — at which point the
    // outline is decoration that disagrees with the map under it.
    const inside = (ring: { x: number; y: number }[], p: { x: number; y: number }): boolean => {
      let hit = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i]!, b = ring[j]!;
        if ((a.y > p.y) !== (b.y > p.y)
          && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
      }
      return hit;
    };
    let checked = 0;
    for (const r of RG) {
      // ⚠️ ITS OWN MEMBERS, reported by `regions()`. This used to pick the
      // nearest region of the same ground and check every stop against it,
      // which is a guess — and the guess was wrong: Stop 9 is wood, stands
      // alone, and correctly belongs to no region at all.
      for (const at of r.members) {
        checked++;
        expect(inside(r.ring, at),
          `a ${r.ground} stop at ${at.x.toFixed(0)},${at.y.toFixed(0)} is outside its own region`)
          .toBe(true);
      }
    }
    expect(checked, 'no stop was actually checked — this test proves nothing')
      .toBeGreaterThan(4);
  });

  it('and a ring is a closed loop with room in it', () => {
    for (const r of RG) {
      expect(r.ring.length).toBeGreaterThan(20);
      const wide = Math.max(...r.ring.map((p) => p.x)) - Math.min(...r.ring.map((p) => p.x));
      expect(wide, `a ${r.ground} region is ${wide.toFixed(0)} wide`).toBeGreaterThan(40);
    }
  });
});

describe('★ the river follows the valley', () => {
  it('runs lower than the straight lines between its anchor stops', () => {
    // The owner: "we made hills so that rivers and roads can take them into
    // account." The anchors are fixed (the river must meet its fords); between
    // them the relaxed line must sit in lower ground than the ruler line would.
    const pts = TERRAIN.river;
    expect(pts.length, 'the river is only its anchors — nothing was relaxed')
      .toBeGreaterThan(8);
    const anchors = pts.filter((_, i) => i % 4 === 0 || i === pts.length - 1);
    let bent = 0, straightSum = 0;
    for (const p of pts) bent += heightAt(p.x, p.y);
    // The same count of samples along the straight anchor-to-anchor runs.
    let n = 0;
    for (let i = 0; i + 1 < anchors.length; i++) {
      const a = anchors[i]!, c = anchors[i + 1]!;
      for (let k = 0; k < 4; k++) {
        straightSum += heightAt(a.x + ((c.x - a.x) * k) / 4, a.y + ((c.y - a.y) * k) / 4);
        n++;
      }
    }
    straightSum += heightAt(anchors[anchors.length - 1]!.x, anchors[anchors.length - 1]!.y);
    n++;
    // ⚠️ A STRICT MARGIN, AND A SABOTAGE IS WHY. With `+ 0.05` slack this
    // passed with the relaxation switched OFF ENTIRELY — an unrelaxed river IS
    // the ruler line, equal means equal, and the epsilon waved it through. The
    // real relaxed river runs ~3.0 lower (33.8 against 36.8); requiring 1.5
    // means half the real effect can erode before this fires, and none of it
    // can vanish.
    expect(straightSum / n - bent / pts.length,
      'the river is not meaningfully lower than the ruler line')
      .toBeGreaterThan(1.5);
  });
});
