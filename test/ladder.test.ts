// Extraction: the one conversion left in the economy.
//
// This file used to test Salvage, a passage stock, and a ruins/archives source
// fork. All three are deleted — a passage was a middleman between two verbs
// ("you gather text so you can convert text"), and the owner asked what one was
// twice. Extraction now reads the concepts IN CONTEXT directly.
import { describe, expect, it } from 'vitest';
import {
  apply, attentionCap, canExtract, contextWindow, extractCapacity, extractionYield,
  inContext, initialState, CURRENT_SAVE_VERSION,
} from '../src/core/engine';
import { deserialize, MIGRATIONS, serialize } from '../src/core/save';
import { D } from '../src/core/numbers';
import type { Edge, GameState } from '../src/core/types';

/** A board with `n` concepts, all of them in context. */
const board = (n: number): GameState => {
  const base = initialState(1);
  const anchors = Array.from({ length: n }, (_, i) => i);
  return { ...base, lastTick: 1000, contextWindow: n, forged: { ...base.forged, anchors } };
};
const cands = (n: number, from = 1): Edge[] =>
  Array.from({ length: n }, (_, i) => ({ a: from + i, b: 0, rel: 0, checked: false, fake: false }));

describe('extract reads what is in context', () => {
  it('needs something to read', () => {
    const empty = initialState(1); // just `entity`
    expect(canExtract(empty)).toBe(false);
    expect(apply(empty, { type: 'extract', candidates: cands(3) })).toBe(empty);
  });

  it('costs no stock — attention is the budget, and it is spent on confirming', () => {
    const s0 = board(40);
    const s1 = apply(s0, { type: 'extract', candidates: cands(50) });
    // It MINTS statements, so `resources` is not untouched — the claim is that
    // nothing is CONSUMED. (First draft of this asserted `resources` unchanged
    // and failed against correct code, which is the test being wrong.)
    expect(s1.pool).toEqual(s0.pool);              // no passage stock spent
    expect(s1.resources.data).toBe(s0.resources.data);
    expect(s1.bookings).toEqual(s0.bookings);      // no attention booked
    expect(s1.forged.edges.length).toBeGreaterThan(0);
  });

  it('proposes MORE when the context window is bigger — the window pays for itself', () => {
    const small = extractCapacity(board(10));
    const big = extractCapacity(board(40));
    expect(big).toBeGreaterThan(small);
  });

  it('capacity is a share of what is held, and never zero', () => {
    const s = board(40);
    expect(extractCapacity(s)).toBe(Math.floor(inContext(s).length * extractionYield(s)));
    expect(extractCapacity(initialState(1))).toBeGreaterThanOrEqual(1);
  });

  it('yield is capped strictly below 100% however large the modifier', () => {
    expect(extractionYield({ ...initialState(1), modifiers: { extraction: 1e6 } })).toBeLessThan(1);
  });

  it('mints exactly as many statements as edges it added', () => {
    const s0 = board(40);
    const s1 = apply(s0, { type: 'extract', candidates: cands(50) });
    const added = s1.forged.edges.length - s0.forged.edges.length;
    expect(D(s1.resources.triples).toNumber()).toBe(added);
    expect(D(s1.provenance.unverified).toNumber()).toBe(added);
  });

  it('must NOT feed the permanent ratchet, and must not inflate attention', () => {
    // `lifetimeVerified` drives the attention cap and survives prestige; its
    // contract is "statements a HUMAN checked". Extraction is bulk conversion.
    // When it credited the ratchet, 150s of tapping took the cap from 4 to 13.
    let s = board(60);
    const cap = attentionCap(s);
    for (let i = 0; i < 8; i++) s = apply(s, { type: 'extract', candidates: cands(50, 1 + i * 7) });
    expect(s.lifetimeVerified).toBe(board(60).lifetimeVerified);
    expect(attentionCap(s)).toBe(cap);
  });
});

describe('migrations — an old save survives every deletion', () => {
  // Deletions here are ADDITIVE: `pool`, `source` and `tokenTail` stay in the
  // save, unread, because a saved field is never removed.
  const stepTo = (v: number) => MIGRATIONS[v - 2]!;

  it('v12 → v13 and v13 → v14 still set what they set', () => {
    expect(stepTo(13)({}).source).toBe('common');
    expect(stepTo(14)({}).pool).toEqual([]);
  });

  it('v14 → v15 seeds the context window from what the save holds', () => {
    const out = stepTo(15)({ forged: { anchors: Array.from({ length: 200 }, (_, i) => i) } });
    expect(out.contextWindow).toBe(200);
  });

  it('an old save round-trips with every statement and concept intact', () => {
    const base = initialState(7);
    const old = {
      ...base, saveVersion: 12,
      resources: { ...base.resources, triples: '99' },
      forged: { ...base.forged, anchors: [0, 1, 2], nextId: 3 },
    } as unknown as Record<string, unknown>;
    for (const k of ['source', 'tokenTail', 'pool', 'contextWindow']) delete old[k];

    const loaded = deserialize(serialize(old as never));
    expect(loaded.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(loaded.resources.triples).toBe('99');
    expect(loaded.forged.anchors).toHaveLength(3);
    expect(contextWindow(loaded)).toBeGreaterThanOrEqual(3);
    expect(Number.isFinite(loaded.tokenTail)).toBe(true); // never NaN through a merge
  });
});
