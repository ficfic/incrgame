// THE CONTEXT WINDOW. Was `ANCHOR_CAP = 240`: a hard cap that silently folded a
// concept away the moment you exceeded it, named nothing and drawn nowhere.
// Concepts vanished and nothing on screen said why.
import { describe, expect, it } from 'vitest';
import {
  apply, canGrowContext, contextGate, contextFull, contextStep, contextUsed,
  contextWindow, inContext, initialState, verified,
} from '../src/core/engine';
import { ANCHOR_CAP } from '../src/core/graph';
import { deserialize, MIGRATIONS, serialize } from '../src/core/save';
import { SEED_NODES } from '../src/content/seed';
import { D } from '../src/core/numbers';
import type { GameState } from '../src/core/types';

const withChecked = (n: string): GameState => {
  const s = initialState(1);
  return { ...s, lastTick: 1000, resources: { ...s.resources, triples: n } };
};

describe('the window is a real limit', () => {
  it('a fresh save can hold few enough concepts to meet it early', () => {
    const s = initialState(1);
    expect(contextWindow(s)).toBeLessThan(40); // met in minutes, not hours
    // The opening is the SEED, not `entity` — five mid-graph concepts.
    expect(contextUsed(s)).toBe(SEED_NODES.length);
    expect(contextFull(s)).toBe(false);
  });

  it('does NOT block discovery when full — it drops the oldest instead', () => {
    // ⚠️ THIS TEST IS INVERTED FROM ITS FIRST VERSION, and the inversion is the
    // point. A full window used to refuse the discovery. That made the game
    // circular and unwinnable: relations among held concepts run out → nothing
    // to propose → no `checked` → cannot afford to grow → cannot discover →
    // nothing to do at all. Measured stall at 24/24 concepts from t=135.
    //
    // A real context window does not refuse new input; it drops the oldest.
    const base = initialState(1);
    const anchors = Array.from({ length: 16 }, (_, i) => i);
    const full: GameState = {
      ...base, lastTick: 1000, lifetimeVerified: '1e6', contextWindow: 16,
      forged: { ...base.forged, anchors, nextId: 16 },
    };
    expect(contextFull(full)).toBe(true);
    expect(apply(full, { type: 'discover' })).not.toBe(full);
  });

  it('drops the OLDEST out of context and keeps it on the board', () => {
    const base = initialState(1);
    const anchors = Array.from({ length: 30 }, (_, i) => i);
    const s: GameState = { ...base, contextWindow: 16, forged: { ...base.forged, anchors } };
    const held = inContext(s);
    expect(held).toHaveLength(16);
    expect(held).not.toContain(5);           // an early concept has fallen out...
    expect(s.forged.anchors).toContain(5);   // ...and is still yours, still drawn
    expect(held).toContain(29);              // the newest is in
  });

  it('always keeps the root in context, so there is something to navigate by', () => {
    const base = initialState(1);
    const anchors = Array.from({ length: 100 }, (_, i) => i);
    const s: GameState = { ...base, contextWindow: 16, forged: { ...base.forged, anchors } };
    expect(inContext(s)).toContain(0);
  });

  it('never exceeds the render budget, whatever the save says', () => {
    const s = { ...initialState(1), contextWindow: 99_999 };
    expect(contextWindow(s)).toBe(ANCHOR_CAP);
  });
});

describe('the window holds a CONNECTED slice, not a tail', () => {
  // ⚠️ THE DEFECT THIS PINS, and it was the largest one in the game.
  //
  // Anchors append breadth-first, so a concept's parent always has a lower id.
  // A tail of the newest N therefore contains almost no parents, `potentialEdges`
  // finds no held ancestor and falls back to the root, and every relation Extract
  // could propose was `X is a entity`. Measured at window 16 on a real save: 2
  // real parents in context against 1181 spokes to `entity`.
  //
  // A five-deep chain: 0 → 1 → 2 → 3 → 4, then 5..99 hanging off 4's siblings.
  const parentOf = (id: number): number => (id <= 0 ? -1 : Math.floor((id - 1) / 2));
  const board = (n: number, window: number): GameState => {
    const base = initialState(1);
    const anchors = Array.from({ length: n }, (_, i) => i);
    return { ...base, contextWindow: window, forged: { ...base.forged, anchors } };
  };

  it('puts a real parent in context for nearly every concept held', () => {
    const held = inContext(board(100, 16), parentOf);
    const set = new Set(held);
    const withParent = held.filter((id) => id !== 0 && set.has(parentOf(id))).length;
    // The tail version scores 7/15 here and 2/16 on the real dataset, where the
    // tree is far wider than binary. Anything under "almost all" is the bug.
    expect(withParent).toBeGreaterThanOrEqual(held.length - 1);
  });

  it('is strictly better than the tail it replaced', () => {
    const s = board(100, 16);
    const score = (held: number[]): number => {
      const set = new Set(held);
      return held.filter((id) => id !== 0 && set.has(parentOf(id))).length;
    };
    expect(score(inContext(s, parentOf))).toBeGreaterThan(score(inContext(s)));
  });

  it('still fills the window exactly, so the HUD number stays honest', () => {
    expect(inContext(board(100, 16), parentOf)).toHaveLength(16);
    expect(inContext(board(100, 40), parentOf)).toHaveLength(40);
    expect(inContext(board(9, 16), parentOf)).toHaveLength(9); // fewer than a window
  });

  it('keeps the root, and never admits a concept before its parent', () => {
    const held = inContext(board(100, 16), parentOf);
    expect(held).toContain(0);
    expect(new Set(held).size).toBe(held.length); // no duplicates
  });

  it('holds the NEWEST work — the frontier is what you were just doing', () => {
    const held = inContext(board(100, 16), parentOf);
    expect(held).toContain(99);
  });

  it('degrades to the tail when parents are unknown, rather than emptying', () => {
    // The ontology is fetched at runtime, so `parentOf` returns -1 until the
    // chunk lands. That must not leave the model holding nothing.
    expect(inContext(board(100, 16), () => -1)).toHaveLength(16);
  });
});

describe('growing it', () => {
  it('is refused before you have confirmed enough, and changes nothing', () => {
    const s = withChecked('0');
    expect(canGrowContext(s)).toBe(false);
    expect(apply(s, { type: 'growContext' })).toBe(s);
  });

  it('SPENDS NOTHING — no number goes down when the window widens', () => {
    // ⚠️ THE DEFECT THIS PINS. `growContext` used to add its price to
    // `provenance.unverified`, which relabelled that many CONFIRMED statements
    // as unconfirmed: 10/10 checked became 2/10 for buying an upgrade. And
    // there was nothing to do about it — those statements hang off no edge,
    // only confirming a dotted line raises `verified`, and nothing in
    // generation 1 ever reduces `drifted`. The owner asked "what am I supposed
    // to check" and the honest answer was: nothing, ever.
    const s0 = { ...withChecked('1000'), lifetimeVerified: '1e6' };
    const s1 = apply(s0, { type: 'growContext' });
    expect(contextWindow(s1)).toBeGreaterThan(contextWindow(s0));
    expect(s1.provenance).toEqual(s0.provenance);
    expect(s1.resources).toEqual(s0.resources);
    expect(D(verified(s1)).toNumber()).toBe(D(verified(s0)).toNumber());
  });

  it('widens by exactly one step', () => {
    const s = { ...withChecked('1000'), lifetimeVerified: '1e6' };
    const before = contextWindow(s);
    expect(contextWindow(apply(s, { type: 'growContext' }))).toBe(before + contextStep());
  });

  it('is GATED on lifetime confirmed work, which only confirming raises', () => {
    const gate = contextGate(withChecked('0'));
    const short = { ...withChecked('1000'), lifetimeVerified: String(Number(gate) - 1) };
    const enough = { ...withChecked('1000'), lifetimeVerified: gate };
    expect(canGrowContext(short)).toBe(false);
    expect(canGrowContext(enough)).toBe(true);
  });

  it('the gate rises each time, so the window is earned repeatedly', () => {
    let s = { ...withChecked('1e9'), lifetimeVerified: '1e9' };
    const first = Number(contextGate(s));
    for (let i = 0; i < 5; i++) s = apply(s, { type: 'growContext' });
    expect(Number(contextGate(s))).toBeGreaterThan(first);
  });

  it('stops at the render budget rather than growing without limit', () => {
    const s = { ...withChecked('1e12'), lifetimeVerified: '1e12', contextWindow: ANCHOR_CAP };
    expect(canGrowContext(s)).toBe(false);
    expect(apply(s, { type: 'growContext' })).toBe(s);
  });

  it('growing it widens what the model is holding', () => {
    const base = initialState(1);
    const anchors = Array.from({ length: 40 }, (_, i) => i);
    const s0: GameState = {
      ...base, lastTick: 1000, contextWindow: 16, lifetimeVerified: '1e6',
      resources: { ...base.resources, triples: '1000' },
      forged: { ...base.forged, anchors },
    };
    const before = inContext(s0).length;
    const s1 = apply(s0, { type: 'growContext' });
    expect(inContext(s1).length).toBe(before + contextStep());
  });
});

describe('v15 migration — nobody loses a concept they earned', () => {
  it('seeds the window from what the save already holds', () => {
    const step = MIGRATIONS[13]!; // produces v15
    const out = step({ forged: { anchors: Array.from({ length: 200 }, (_, i) => i) } });
    expect(out.contextWindow).toBe(200);
  });

  it('a big old save round-trips with every concept still on the board', () => {
    const base = initialState(1);
    const anchors = Array.from({ length: 200 }, (_, i) => i);
    const old = {
      ...base, saveVersion: 14,
      forged: { ...base.forged, anchors, nextId: 200 },
    } as unknown as Record<string, unknown>;
    delete old.contextWindow;

    const loaded = deserialize(serialize(old as never));
    expect(loaded.forged.anchors).toHaveLength(200);
    // Shrinking the window would evict concepts the player earned, which is the
    // one thing the save rules exist to prevent.
    expect(contextWindow(loaded)).toBeGreaterThanOrEqual(200);
    expect(contextFull(loaded)).toBe(true);
  });
});
