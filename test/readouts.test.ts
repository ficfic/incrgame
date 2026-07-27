// The vocabulary invariant.
//
// The dock reported "graph: 25 nodes" while the HUD reported "3 recovered", at
// the same moment, on the same screen. Both were right; they were different
// quantities wearing one word. These tests exist so that specific failure —
// two surfaces disagreeing about what a word means — cannot come back quietly.
import { describe, expect, it } from 'vitest';
import { apply, EXTRACT_MS, initialState, recovered } from '../src/core/engine';
import { NOUNS, READOUTS } from '../src/core/readouts';
import { observeTransition, ticker, TICKER_TTL_MS } from '../src/shell/ticker';
import { get } from 'svelte/store';
import type { GameState } from '../src/core/types';

describe('the vocabulary', () => {
  it('gives every quantity a unique noun', () => {
    expect(new Set(NOUNS).size).toBe(NOUNS.length);
  });

  it('never returns a non-finite number for a fresh save', () => {
    const s = initialState(1);
    for (const [id, r] of Object.entries(READOUTS)) {
      const v = r.count(s);
      expect(v.isFinite(), `${id} produced ${v.toString()}`).toBe(true);
    }
  });
});

describe('"recovered" means recovered, not placed', () => {
  // The actual bug, pinned. `graph.nodes` counts every concept PLACED —
  // including dark ones with no line supporting them. `recovered` counts only
  // lit concepts. A save with many dark concepts is exactly where the two
  // diverge, and it is where the 25-vs-3 screenshot came from.
  const withDarkConcepts = (): GameState => {
    const base = initialState(1);
    return {
      ...base,
      forged: {
        ...base.forged,
        anchors: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        edges: [{ a: 0, b: 1, rel: 0, checked: true, fake: false }],
      },
      graph: { nodes: 11, edges: 0 },
    };
  };

  it('counts only concepts a line supports', () => {
    const s = withDarkConcepts();
    // Two lit (0 and 1), nine dark.
    expect(READOUTS.recovered.count(s).toNumber()).toBe(2);
  });

  it('DISAGREES with the legacy graph cache, which is why the cache is banned', () => {
    const s = withDarkConcepts();
    expect(READOUTS.recovered.count(s).toNumber()).not.toBe(s.graph.nodes);
  });

  it('is the same function the HUD calls', () => {
    const s = withDarkConcepts();
    expect(READOUTS.recovered.count(s).toNumber()).toBe(recovered(s));
  });
});

describe('"lines" is not "statements"', () => {
  it('counts drawn lines, not the statement balance', () => {
    const base = initialState(1);
    const s: GameState = {
      ...base,
      resources: { ...base.resources, triples: '5000' },
      forged: {
        ...base.forged,
        edges: [
          { a: 0, b: 1, rel: 0, checked: true, fake: false },
          { a: 0, b: 2, rel: 0, checked: true, fake: false },
        ],
      },
    };
    expect(READOUTS.lines.count(s).toNumber()).toBe(2);
    expect(READOUTS.statements.count(s).toNumber()).toBe(5000);
  });
});

describe('ticker milestones fire on the readout, not on raw state', () => {
  const litTo = (n: number): GameState => {
    const base = initialState(1);
    const edges = [];
    for (let i = 1; i <= n; i++) edges.push({ a: 0, b: i, rel: 0, checked: true, fake: false });
    return {
      ...base,
      forged: { ...base.forged, anchors: [0, ...edges.map((e) => e.b)], edges },
      // Deliberately WRONG on purpose: if a milestone still reads this cache,
      // it will announce a number nobody can see, and the assertions below fail.
      graph: { nodes: 9999, edges: 9999 },
    };
  };

  it('announces the number the player can actually read', () => {
    // 10 lit concepts (0 plus 1..9 ⇒ crossing the `10` threshold).
    const before = litTo(3);
    const after = litTo(9);
    observeTransition(before, after);

    const lines = get(ticker);
    const milestone = lines.find((l) => l.text.includes('concepts'));
    expect(milestone, 'no concept milestone fired').toBeDefined();
    expect(milestone!.text).toContain('10');
    // The bug's signature: the announced number must not be the cache's.
    expect(milestone!.text).not.toContain('9999');
    expect(READOUTS.recovered.count(after).toNumber()).toBe(10);
  });
});

describe('ticker lines expire', () => {
  it('carries a timestamp so the dock can drop stale news', () => {
    const before = initialState(1);
    const after: GameState = {
      ...before,
      forged: {
        ...before.forged,
        anchors: [0, 1],
        edges: [{ a: 0, b: 1, rel: 0, checked: true, fake: false }],
      },
    };
    observeTransition(before, after);
    const lines = get(ticker);
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      expect(typeof l.at).toBe('number');
      expect(Number.isFinite(l.at)).toBe(true);
    }
    // A TTL of zero would clear the dock instantly and one of a day would be
    // the append-only bug again with extra steps.
    expect(TICKER_TTL_MS).toBeGreaterThan(5_000);
    expect(TICKER_TTL_MS).toBeLessThan(10 * 60 * 1000);
  });
});

describe('no milestone fires on something that cannot happen', () => {
  // docs/CONTENT.md reachability rule 3. Three ticker rows once pointed at a
  // machine that was off-roster and unbuyable, so nobody would ever have read
  // them. Line milestones are capped by EDGE_CAP.
  it('every line milestone is reachable under EDGE_CAP', async () => {
    const { EDGE_CAP } = await import('../src/core/graph');
    const base = initialState(1);
    let s = base;
    // Drive the readout to the cap and confirm the largest milestone is below.
    const edges = [];
    for (let i = 1; i <= EDGE_CAP; i++) edges.push({ a: 0, b: i, rel: 0, checked: true, fake: false });
    s = { ...base, forged: { ...base.forged, edges } };
    expect(READOUTS.lines.count(s).toNumber()).toBe(EDGE_CAP);
    // 500 is the largest shipped line milestone; it must be reachable.
    expect(EDGE_CAP).toBeGreaterThanOrEqual(500);
  });
});

describe('apply() still works with the readouts in place', () => {
  it('extracting moves the statements readout', () => {
    const base = initialState(1);
    const s0: GameState = {
      ...base, lastTick: 1000, contextWindow: 8,
      forged: { ...base.forged, anchors: [0, 1, 2, 3] },
    };
    const booked = apply(s0, { type: 'extract', candidates: [{ a: 1, b: 0, rel: 0, checked: false, fake: false }] });
    const s1 = apply(booked, { type: 'tick', dt: 0.1, now: booked.lastTick + EXTRACT_MS + 500 });
    expect(READOUTS.statements.count(s1).gt(READOUTS.statements.count(s0))).toBe(true);
  });
});
