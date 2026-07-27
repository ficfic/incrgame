// DOTTED LINES ARE PROPOSALS, AND PROPOSALS COME FROM EXTRACT.
//
// They used to be derived from the DATASET: every relation between two concepts
// on the board appeared as a dotted line, free, the instant both ends existed.
// So the board filled with connections nobody asked for, and Extract looked
// inert because its output was indistinguishable from scenery. The owner asked
// what Extract was for twice.
import { describe, expect, it } from 'vitest';
import { apply, EXTRACT_MS, initialState } from '../src/core/engine';
import { proposeCandidates } from '../src/shell/salvage';
import type { Edge, GameState } from '../src/core/types';


/** Extraction books a slot and lands after EXTRACT_MS — it is work, not an
 *  instant tap. Tests that want its result have to run the clock. */
const runExtract = (s: GameState, candidates: Edge[]): GameState => {
  const booked = apply(s, { type: 'extract', candidates });
  return apply(booked, { type: 'tick', dt: 0.1, now: booked.lastTick + EXTRACT_MS + 500 });
};

const boardOf = (n: number): GameState => {
  const base = initialState(1);
  const anchors = Array.from({ length: n }, (_, i) => i);
  return { ...base, lastTick: 1000, contextWindow: n, forged: { ...base.forged, anchors } };
};

/** What the board offers to be tapped. Mirrors App.svelte's `dotted`. */
const offered = (s: GameState): Edge[] => s.forged.edges.filter((e) => !e.checked);

describe('a fresh board offers nothing', () => {
  it('has no unchecked edges at all until something proposes one', () => {
    expect(offered(initialState(1))).toHaveLength(0);
  });

  it('stays empty however many concepts land, if nothing extracts', () => {
    // The old behaviour: 20 related concepts on the board meant a screenful of
    // free dotted lines. Concepts alone must now offer nothing.
    expect(offered(boardOf(20))).toHaveLength(0);
  });
});

describe('extract is the only source', () => {
  const pool = Array.from({ length: 40 }, (_, i) => i + 1);
  const candidates = (n: number): Edge[] =>
    Array.from({ length: n }, (_, i) => ({ a: i + 1, b: 0, rel: 0, checked: false, fake: false }));

  it('proposals show up as tappable dotted lines', () => {
    const s0 = { ...boardOf(40), pool };
    const s1 = runExtract(s0, candidates(30));
    expect(offered(s1).length).toBeGreaterThan(0);
    // ...and every one of them is a real relation over concepts on the board.
    for (const e of offered(s1)) {
      expect(s1.forged.anchors).toContain(e.a);
      expect(s1.forged.anchors).toContain(e.b);
    }
  });

  it('confirming one removes it from the offer and mints no new statement', () => {
    const s0 = { ...boardOf(40), pool };
    const s1 = runExtract(s0, candidates(30));
    const before = offered(s1).length;
    const target = offered(s1)[0]!;

    let s2 = apply(s1, { type: 'connect', edge: target });
    s2 = apply(s2, { type: 'tick', dt: 0.1, now: s2.lastTick + 20_000 });

    expect(offered(s2).length).toBe(before - 1);
    expect(s2.resources.triples).toBe(s1.resources.triples); // provenance moved, nothing minted
  });
});

describe('the shell only ever proposes relations the dataset contains', () => {
  it('gates every candidate on holding text about one end', () => {
    const potential = [
      { a: 1, b: 0, rel: 0 },
      { a: 2, b: 0, rel: 0 },
      { a: 99, b: 98, rel: 0 },   // nothing held about either end
    ];
    const out = proposeCandidates([1, 2], potential, [], 10);
    expect(out).toHaveLength(2);
    expect(out.every((e) => e.a === 1 || e.a === 2)).toBe(true);
    // A proposal is never pre-confirmed: an extractor proposes, it does not check.
    expect(out.every((e) => !e.checked)).toBe(true);
  });

  it('never re-proposes something already on the board', () => {
    const potential = [{ a: 1, b: 0, rel: 0 }];
    const existing: Edge[] = [{ a: 1, b: 0, rel: 0, checked: true, fake: false }];
    expect(proposeCandidates([1], potential, existing, 10)).toHaveLength(0);
  });
});
