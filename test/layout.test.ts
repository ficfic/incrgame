import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dotRadius, layout, levelOfDetail, MAX_DEPTH, type Placed } from '../src/render/layout';

/** A small stand-in taxonomy shaped like the real one: a root, three broad
 *  branches, then progressively narrower children. */
const PARENT: Record<number, number> = {
  0: -1,
  1: 0, 2: 0, 3: 0,          // depth 1
  4: 1, 5: 1, 6: 2, 7: 3,    // depth 2
  8: 4, 9: 4, 10: 6,         // depth 3
  11: 8,                     // depth 4
  12: 11,                    // depth 5
};
const parentOf = (id: number): number => PARENT[id] ?? -1;

const ALL = Object.keys(PARENT).map(Number);
const radius = (p: Placed): number => Math.hypot(p.x, p.y);

describe('radial taxonomy layout', () => {
  it('puts the root at the origin and everything else on its depth ring', () => {
    const m = layout(ALL, parentOf);
    expect(radius(m.get(0)!)).toBe(0);
    expect(m.get(1)!.depth).toBe(1);
    expect(radius(m.get(1)!)).toBeCloseTo(1 / MAX_DEPTH, 6);
    expect(m.get(12)!.depth).toBe(5);
    expect(radius(m.get(12)!)).toBeCloseTo(1, 6);
  });

  it('never places anything outside the unit disc', () => {
    for (const p of layout(ALL, parentOf).values()) expect(radius(p)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('places every concept, including ones whose parent is not on the board', () => {
    // 9's parent (4) and grandparent (1) are absent — it must still be drawn,
    // because a board that drops a concept under-reports real progress.
    const m = layout([0, 9, 12], parentOf);
    expect([...m.keys()].sort((a, b) => a - b)).toEqual([0, 9, 12]);
    expect(m.get(9)!.parent).toBe(0); // re-attached to the nearest ancestor on the board
    expect(m.get(9)!.depth).toBe(3);  // but its RING is still its true depth
  });

  it('keeps a subtree inside its parent wedge, so zooming into a region is meaningful', () => {
    const m = layout(ALL, parentOf);
    const angle = (id: number): number => Math.atan2(m.get(id)!.y, m.get(id)!.x);
    // 8, 11 and 12 all descend from 4; their angles must cluster, and must not
    // wander into a sibling branch's half of the circle
    const spread = (ids: number[]): number => {
      const as = ids.map(angle);
      return Math.max(...as) - Math.min(...as);
    };
    expect(spread([4, 8, 11, 12])).toBeLessThan(spread([1, 2, 3]));
  });

  it('is deterministic — the same board always draws the same picture', () => {
    const a = layout(ALL, parentOf);
    const b = layout([...ALL].reverse(), parentOf);
    for (const id of ALL) {
      expect(b.get(id)!.x).toBeCloseTo(a.get(id)!.x, 12);
      expect(b.get(id)!.y).toBeCloseTo(a.get(id)!.y, 12);
    }
  });

  it('weighs a general concept above a specific one', () => {
    const m = layout(ALL, parentOf);
    expect(m.get(0)!.weight).toBeCloseTo(1, 6);
    expect(m.get(1)!.weight).toBeGreaterThan(m.get(4)!.weight);
    expect(m.get(4)!.weight).toBeGreaterThan(m.get(12)!.weight);
    expect(dotRadius(m.get(1)!)).toBeGreaterThan(dotRadius(m.get(12)!));
  });

  it('only moves a node when its own branch changes', () => {
    // Adding a child under 3 must not disturb anything under branch 1.
    const before = layout([0, 1, 2, 3, 4, 8], parentOf);
    const after = layout([0, 1, 2, 3, 4, 8, 7], parentOf);
    for (const id of [1, 4, 8]) {
      expect(after.get(id)!.x).toBeCloseTo(before.get(id)!.x, 12);
      expect(after.get(id)!.y).toBeCloseTo(before.get(id)!.y, 12);
    }
  });

  it('survives a cycle in the parent data instead of hanging', () => {
    const cyclic = (id: number): number => (id === 0 ? -1 : id === 1 ? 2 : 1);
    const m = layout([0, 1, 2], cyclic);
    expect(m.size).toBe(3);
  });
});

describe('level of detail', () => {
  const placed = layout(ALL, parentOf);

  it('culls crowded siblings when zoomed out, and keeps the root', () => {
    // NOT "hides everything deep": an only child inherits its parent's whole
    // wedge, so a long thin chain stays perfectly drawable at any zoom — the
    // first version of this test asserted depth < MAX_DEPTH and failed against
    // correct code. What LOD actually culls is CROWDING, so crowd it: 40
    // siblings under one parent, each owning a fortieth of that wedge.
    const crowd: Record<number, number> = { 0: -1, 1: 0 };
    for (let i = 2; i < 42; i++) crowd[i] = 1;
    const m = layout(Object.keys(crowd).map(Number), (id) => crowd[id] ?? -1);

    const wide = levelOfDetail(m, 2000);
    expect(wide.shown.length).toBe(m.size);

    const tight = levelOfDetail(m, 50);
    expect(tight.shown.some((n) => n.id === 0)).toBe(true);
    expect(tight.shown.length).toBeLessThan(m.size);
    expect(tight.labelled.size).toBeLessThanOrEqual(tight.shown.length);
    // and the crowd is accounted for on its parent, not quietly dropped
    expect(tight.rolled.get(1)).toBeGreaterThan(0);
  });

  it('reveals more the further you zoom in, and never fewer', () => {
    let last = 0;
    for (const scale of [40, 120, 400, 1200, 4000]) {
      const n = levelOfDetail(placed, scale).shown.length;
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
    expect(last).toBe(placed.size); // everything eventually
  });

  it('accounts for every concept — shown plus rolled up equals the whole board', () => {
    for (const scale of [30, 90, 300, 900]) {
      const { shown, rolled } = levelOfDetail(placed, scale);
      const foldedIn = [...rolled.values()].reduce((a, b) => a + b, 0);
      expect(shown.length + foldedIn).toBe(placed.size);
    }
  });

  it('charges a hidden node to a VISIBLE ancestor, never to a hidden one', () => {
    const { shown, rolled } = levelOfDetail(placed, 70);
    const visible = new Set(shown.map((n) => n.id));
    for (const [host, count] of rolled) {
      if (count > 0) expect(visible.has(host)).toBe(true);
    }
  });

  it('never labels a node it is not drawing', () => {
    for (const scale of [30, 200, 2000]) {
      const { shown, labelled } = levelOfDetail(placed, scale);
      const visible = new Set(shown.map((n) => n.id));
      for (const id of labelled) expect(visible.has(id)).toBe(true);
    }
  });

  it('never shows a node whose parent it is hiding', () => {
    for (const scale of [50, 150, 600]) {
      const { shown } = levelOfDetail(placed, scale);
      const visible = new Set(shown.map((n) => n.id));
      for (const n of shown) {
        if (n.depth > 0) expect(visible.has(n.parent)).toBe(true);
      }
    }
  });
});

// ── against the REAL dataset ───────────────────────────────────────────────
//
// The toy tree above proves the algebra. It cannot prove the thing the player
// actually complained about — that a real board is "a mess immediately" — so
// this drives the shipped Open English WordNet slice at the size the anchor cap
// allows. A browser test cannot reach here: discovery takes 18s a concept, so
// a full board is over an hour of wall clock.
describe('the real taxonomy at a full board', () => {
  const parents: number[] = [];
  for (let i = 0; i < 4; i++) {
    const chunk = JSON.parse(readFileSync(`public/ontology/c${String(i).padStart(3, '0')}.json`, 'utf8'));
    parents.push(...(chunk.p as number[]));
  }
  const realParent = (id: number): number => parents[id] ?? -1;
  // concepts are stored in recovery order, so the first N are what a player
  // who has been discovering steadily actually owns
  const ANCHOR_CAP = 240;
  const board = Array.from({ length: ANCHOR_CAP }, (_, i) => i);
  const placed = layout(board, realParent);
  // a name is ~11 characters at ~5.4px, matching the UI's estimator
  const labelPx = (): number => 60;

  it('reads the shipped tree and places the whole board inside the disc', () => {
    expect(parents.length).toBe(4096);
    expect(placed.size).toBe(ANCHOR_CAP);
    for (const p of placed.values()) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('thins a 240-concept board down to something readable at fit zoom', () => {
    // ~280 is the scale a 390pt phone gives at the default framing
    const { shown, labelled, rolled } = levelOfDetail(placed, 280, labelPx);
    expect(shown.length).toBeLessThan(ANCHOR_CAP);       // it culls
    expect(shown.length).toBeGreaterThan(8);             // but leaves a board
    expect(labelled.size).toBeLessThan(shown.length);    // dots before labels
    expect(labelled.size).toBeLessThanOrEqual(40);       // and not a wall of text
    const folded = [...rolled.values()].reduce((a, b) => a + b, 0);
    expect(shown.length + folded).toBe(ANCHOR_CAP);      // nothing lost
  });

  it('gives up everything if you zoom far enough in', () => {
    const { shown, labelled } = levelOfDetail(placed, 40000, labelPx);
    expect(shown.length).toBe(ANCHOR_CAP);
    expect(labelled.size).toBe(ANCHOR_CAP);
  });

  it('puts the general concepts nearest the middle', () => {
    // `entity` at 0; the three top branches on the first ring
    expect(Math.hypot(placed.get(0)!.x, placed.get(0)!.y)).toBe(0);
    const ring1 = [...placed.values()].filter((p) => p.depth === 1);
    expect(ring1.length).toBe(3);
    for (const p of ring1) expect(p.weight).toBeGreaterThan(0.3);
  });
});
