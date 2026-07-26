import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detail, dotRadius, weigh } from '../src/render/detail';

const PARENT: Record<number, number> = {
  0: -1, 1: 0, 2: 0, 3: 0, 4: 1, 5: 1, 6: 2, 7: 3, 8: 4, 9: 4, 10: 6, 11: 8, 12: 11,
};
const parentOf = (id: number): number => PARENT[id] ?? -1;
const ALL = Object.keys(PARENT).map(Number);

/** A screen map that spreads ids far apart, so decluttering is not the thing
 *  under test unless a test means it to be. */
const spread = (ids: number[]): Map<number, { x: number; y: number }> =>
  new Map(ids.map((id, i) => [id, { x: 40 + (i % 4) * 300, y: 40 + Math.floor(i / 4) * 300 }]));

const opts = (over: Partial<Parameters<typeof detail>[1]> = {}) => ({
  zoom: 99, screen: spread(ALL), w: 4000, h: 4000,
  labelWidth: () => 50,
  ...over,
});

describe('weight from the taxonomy', () => {
  it('makes the root the heaviest thing in the world', () => {
    const m = weigh(ALL, parentOf);
    expect(m.get(0)!.weight).toBe(1);
    expect(m.get(0)!.depth).toBe(0);
  });

  it('falls off with depth, so general beats specific', () => {
    const m = weigh(ALL, parentOf);
    expect(m.get(1)!.weight).toBeGreaterThan(m.get(4)!.weight);
    expect(m.get(4)!.weight).toBeGreaterThan(m.get(12)!.weight);
    expect(dotRadius(m.get(1)!.weight, false)).toBeGreaterThan(dotRadius(m.get(12)!.weight, false));
  });

  it('re-attaches a concept whose parent is not on the board', () => {
    const m = weigh([0, 9, 12], parentOf);
    expect(m.get(9)!.parent).toBe(0); // nearest ancestor present
    expect(m.get(9)!.depth).toBe(3);  // but its real depth is unchanged
  });

  it('survives a cycle in the parent data instead of hanging', () => {
    const cyclic = (id: number): number => (id === 0 ? -1 : id === 1 ? 2 : 1);
    expect(weigh([0, 1, 2], cyclic).size).toBe(3);
  });
});

describe('level of detail', () => {
  const weights = weigh(ALL, parentOf);

  it('shows more the further you zoom in, and never fewer', () => {
    let last = 0;
    for (const zoom of [1, 2, 4, 8, 20]) {
      const n = detail(weights, opts({ zoom })).shown.length;
      expect(n).toBeGreaterThanOrEqual(last);
      last = n;
    }
    expect(last).toBe(weights.size);
  });

  it('never shows a concept while hiding its ancestor', () => {
    for (const zoom of [1, 1.5, 2, 3]) {
      const { shown } = detail(weights, opts({ zoom }));
      const visible = new Set(shown);
      for (const id of shown) {
        const p = weights.get(id)!.parent;
        if (p >= 0) expect(visible.has(p)).toBe(true);
      }
    }
  });

  it('accounts for every concept — shown plus rolled up is the whole board', () => {
    for (const zoom of [1, 1.5, 3, 10]) {
      const { shown, rolled } = detail(weights, opts({ zoom }));
      const folded = [...rolled.values()].reduce((a, b) => a + b, 0);
      expect(shown.length + folded).toBe(weights.size);
    }
  });

  it('charges hidden concepts to a VISIBLE host', () => {
    const { shown, rolled } = detail(weights, opts({ zoom: 1 }));
    const visible = new Set(shown);
    for (const [host, n] of rolled) if (n > 0) expect(visible.has(host)).toBe(true);
  });

  it('NEVER lets two labels overlap — the bug three formulas failed to stop', () => {
    // Every node on the exact same point: one label can be placed, no more.
    // (An earlier version of this test spaced them 2px apart per id, which
    // spans 24px — wider than the 13px label box — so two genuinely fitted and
    // the test failed against correct code. Overlap tests have to actually
    // overlap.)
    const stacked = new Map(ALL.map((id) => [id, { x: 200, y: 200 }]));
    const { labelled } = detail(weights, opts({ zoom: 99, screen: stacked, labelWidth: () => 120 }));
    expect(labelled.size).toBe(1);
  });

  it('fits more labels as the same nodes spread out', () => {
    const tight = new Map(ALL.map((id) => [id, { x: 200, y: 200 + id * 6 }]));
    const loose = new Map(ALL.map((id) => [id, { x: 200, y: 200 + id * 60 }]));
    const n = (s: Map<number, { x: number; y: number }>): number =>
      detail(weights, opts({ zoom: 99, screen: s, labelWidth: () => 90 })).labelled.size;
    expect(n(tight)).toBeLessThan(n(loose));
  });

  it('places labels when there is room, heaviest first', () => {
    const { labelled } = detail(weights, opts());
    expect(labelled.size).toBeGreaterThan(1);
    expect(labelled.has(0)).toBe(true); // the root wins any contest it enters
  });

  it('never labels something it is not drawing', () => {
    for (const zoom of [1, 2, 6]) {
      const { shown, labelled } = detail(weights, opts({ zoom }));
      const visible = new Set(shown);
      for (const id of labelled) expect(visible.has(id)).toBe(true);
    }
  });

  it('does not spend a label slot on something off-stage', () => {
    const off = new Map(ALL.map((id) => [id, { x: id === 0 ? 100 : -5000, y: 100 }]));
    const { labelled } = detail(weights, opts({ screen: off, w: 400, h: 400 }));
    expect([...labelled]).toEqual([0]);
  });
});

// ── against the REAL dataset ──────────────────────────────────────────────
describe('the real taxonomy at a full board', () => {
  const parents: number[] = [];
  const labels: string[] = [];
  for (let i = 0; i < 4; i++) {
    const c = JSON.parse(readFileSync(`public/ontology/c${String(i).padStart(3, '0')}.json`, 'utf8'));
    parents.push(...(c.p as number[]));
    labels.push(...(c.l as string[]));
  }
  const realParent = (id: number): number => parents[id] ?? -1;
  const CAP = 240;
  const weights = weigh(Array.from({ length: CAP }, (_, i) => i), realParent);
  const labelWidth = (id: number, folded: number): number =>
    ((labels[id]?.length ?? 8) + (folded > 0 ? String(folded).length + 2 : 0)) * 5.4 + 6;
  // a plausible settled layout: spread over a phone-sized stage
  const screen = new Map(Array.from({ length: CAP }, (_, i) => {
    const a = i * 2.399963, r = 20 + Math.sqrt(i / CAP) * 150;
    return [i, { x: 195 + Math.cos(a) * r, y: 200 + Math.sin(a) * r }] as const;
  }));

  it('reads the shipped tree', () => {
    expect(parents.length).toBe(4096);
    expect(weights.size).toBe(CAP);
    expect(weights.get(0)!.weight).toBe(1);
  });

  it('thins a full board to something readable, losing nothing', () => {
    const { shown, labelled, rolled } = detail(weights, { zoom: 1, screen, w: 390, h: 405, labelWidth });
    expect(shown.length).toBeLessThan(CAP);
    expect(shown.length).toBeGreaterThan(8);
    expect(labelled.size).toBeLessThan(shown.length);
    const folded = [...rolled.values()].reduce((a, b) => a + b, 0);
    expect(shown.length + folded).toBe(CAP);
  });
});
