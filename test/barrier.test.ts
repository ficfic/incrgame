import { describe, it, expect } from 'vitest';
import { ward, held, heldIds, wardKey, WARD_PAD } from '../src/camp/barrier';
import { initial, SITES, SITE, pathKey, type City } from '../src/camp/engine';

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
/** A city with these paths laid (gauge 1), on top of anything else given. */
const roads = (g: City, ...pairs: Array<[number, number]>): City => ({
  ...g,
  paths: { ...g.paths, ...Object.fromEntries(pairs.map(([a, b]) => [pathKey(a, b), 1])) },
});
/** The starter ring, roaded and worked — what five honest minutes look like. */
const developed = (): City =>
  roads({ ...initial(), stacks: { 0: 1, 1: 2, 2: 1 } }, [0, 1], [0, 2], [0, 3]);

describe('★★★ THE BARRIER — the line around the ground you hold', () => {
  it('★★★ a FRESH SAVE encloses the camp and nothing else', () => {
    // ⚠️ THE OWNER'S COMPLAINT, 2026-08-10: *"why does it cover Rock Face and
    // Tall Pines? Because I have not yet went to Tall Pines."* Under the old
    // "any site with no goblins on it" rule those four sites were inside from
    // the first second. A frontier you were born behind is not a frontier.
    const g = initial();
    expect(heldIds(g)).toEqual([0]);
    const w = ward(g);
    expect(w.length).toBeGreaterThan(3);
    expect(inside(w, SITE.get(0)!)).toBe(true);
    for (const id of [1, 2, 3]) {
      expect(inside(w, SITE.get(id)!), `${SITE.get(id)!.name} must be OUTSIDE`).toBe(false);
    }
  });

  it('★ every holding the goblins have is outside the line', () => {
    // ⚠️ THE THIRD FIXTURE IS THE ONE THAT BITES. On a fresh or a peacefully
    // developed save no goblin site has a road or a works on it, so the first
    // two pass even with the goblin test deleted — proved by sabotage. The
    // raided save has a goblin sitting on ground that is still roaded and
    // still built on, which is the only shape that can actually go wrong.
    const dev = developed();
    const raided: City = { ...dev, goblins: { ...dev.goblins, 1: 12, 2: 12 } };
    for (const g of [initial(), dev, raided]) {
      const w = ward(g);
      for (const id of Object.keys(g.goblins).map(Number)) {
        const s = SITE.get(id)!;
        expect(inside(w, s), `${s.name} should be outside`).toBe(false);
      }
    }
  });

  it('★★★ A FRESH SAVE ENCLOSES FAR LESS GROUND THAN A DEVELOPED ONE', () => {
    // The measured claim, because "it looks smaller" is not a check. A camp
    // alone is a disc of WARD_PAD; the roaded starter ring is a shell over
    // four sites eighty-odd units apart.
    const fresh = area(ward(initial()));
    const grown = area(ward(developed()));
    expect(fresh).toBeGreaterThan(0);
    expect(fresh).toBeLessThan(9000);        // a disc of r=52 is ~8500
    expect(grown).toBeGreaterThan(fresh * 5);
  });

  it('★★★ LAYING A ROAD BRINGS THE GROUND INSIDE — the whole point of drawing it', () => {
    const before = ward(initial());
    const after = ward(roads(initial(), [0, 2]));
    const pines = SITE.get(2)!;
    expect(inside(before, pines)).toBe(false);
    expect(inside(after, pines)).toBe(true);
    expect(area(after)).toBeGreaterThan(area(before) * 1.5);
  });

  it('★★ BUILDING ON GROUND BRINGS IT INSIDE TOO, road or no road', () => {
    // A works standing on a site is a claim in its own right — the barrier
    // must not un-hold a quarry the moment a raid cuts the road home.
    const g: City = { ...initial(), stacks: { 1: 1 } };
    expect(heldIds(g)).toEqual([0, 1]);
    expect(inside(ward(g), SITE.get(1)!)).toBe(true);
  });

  it('★★★ GROUND THE GOBLINS TAKE BACK LEAVES THE BARRIER, and the line shrinks', () => {
    // A raid on a bare site sets `goblins[t]` and leaves the road standing.
    // So the goblin test has to beat the road walk, or the line would never
    // give an inch.
    const before = developed();
    const after: City = { ...before, goblins: { ...before.goblins, 1: 12 }, stacks: { 0: 1, 2: 1 } };
    expect(after.paths[pathKey(0, 1)]).toBe(1);          // the road survived
    expect(heldIds(before)).toContain(1);
    expect(heldIds(after)).not.toContain(1);
    expect(inside(ward(after), SITE.get(1)!)).toBe(false);
    expect(area(ward(after))).toBeLessThan(area(ward(before)) * 0.9);
  });

  it('★★ ground cut off behind ground they took is not yours either', () => {
    // Scree (5) hangs off River Bend (3). Take 3 back and the far end of that
    // arm is no longer contiguous with the camp — which is why this walks the
    // roads itself instead of borrowing the engine's `component()`, whose job
    // is hauling and which happily crosses goblin ground.
    const arm = roads({ ...initial(), goblins: {} }, [0, 3], [3, 5]);
    expect(heldIds(arm)).toEqual([0, 3, 5]);
    const cut: City = { ...arm, goblins: { 3: 12 } };
    expect(heldIds(cut)).toEqual([0]);
    expect(inside(ward(cut), SITE.get(5)!)).toBe(false);
  });

  it('★ ground hidden behind an unliberated holding is not yours either', () => {
    // Dark Pines (7) sits `behind` the knoll (6). While the knoll is goblin-
    // held the board does not draw 7 at all, so the line must not bulge at it
    // even if a works somehow stands there.
    const g: City = { ...initial(), goblins: { 6: 24 }, stacks: { 7: 1 } };
    expect(heldIds(g)).not.toContain(7);
    const freed: City = { ...g, goblins: {} };
    expect(heldIds(freed)).toContain(7);
  });

  it('★ one stop yields a ring, two a capsule, nine a shell — no special cases', () => {
    // ONE: the fresh save. Roughly a circle of WARD_PAD about the camp.
    const camp = SITE.get(0)!;
    const one = ward(initial());
    expect(one.length).toBeGreaterThan(6);
    expect(inside(one, camp)).toBe(true);
    for (const p of one) {
      const d = Math.hypot(p.x - camp.x, p.y - camp.y);
      expect(d).toBeGreaterThan(WARD_PAD * 0.85);
      expect(d).toBeLessThan(WARD_PAD * 1.05);
    }
    // TWO: a capsule — both ends inside, and longer than the lone ring.
    const two = ward(roads(initial(), [0, 1]));
    expect(inside(two, camp)).toBe(true);
    expect(inside(two, SITE.get(1)!)).toBe(true);
    expect(area(two)).toBeGreaterThan(area(one));
    // NINE: everything liberated and every road laid.
    const all = roads({ ...initial(), goblins: {} },
      ...SITES.flatMap((s) => s.near.map((n) => [s.id, n] as [number, number])));
    expect(heldIds(all)).toEqual(SITES.map((s) => s.id).sort((a, b) => a - b));
    const nine = ward(all);
    for (const s of SITES) expect(inside(nine, s), `${s.name} inside`).toBe(true);
    expect(area(nine)).toBeGreaterThan(area(two));
  });

  it('★ the line clears the stops it encloses, so dots never sit on it', () => {
    const g = developed();
    const w = ward(g);
    for (const s of held(g)) {
      let near = Infinity;
      for (const p of w) near = Math.min(near, Math.hypot(p.x - s.x, p.y - s.y));
      expect(near).toBeGreaterThan(WARD_PAD * 0.8);
    }
  });

  it('the key changes exactly when the held ground does', () => {
    expect(wardKey(initial())).toBe(wardKey(initial()));
    // Taking ground changes it...
    expect(wardKey(roads(initial(), [0, 2]))).not.toBe(wardKey(initial()));
    // ...losing ground changes it...
    const g = developed();
    expect(wardKey({ ...g, goblins: { ...g.goblins, 1: 12 } })).not.toBe(wardKey(g));
    // ...and stacking a fifth hut on ground already held does NOT, because
    // the shape has not moved and the board would repaint for nothing.
    expect(wardKey({ ...g, stacks: { ...g.stacks, 0: 5 } })).toBe(wardKey(g));
  });

  it('never throws when nothing is held — a lost run has goblins on the camp', () => {
    const none: City = { ...developed(), lost: true,
      goblins: Object.fromEntries(SITES.map((s) => [s.id, 9])) };
    expect(heldIds(none)).toEqual([]);
    expect(held(none)).toEqual([]);
    expect(ward(none)).toEqual([]);
    expect(wardKey(none)).toBe('');
  });
});
