// THE CONTEXT WINDOW. Was `ANCHOR_CAP = 240`: a hard cap that silently folded a
// concept away the moment you exceeded it, named nothing and drawn nowhere.
// Concepts vanished and nothing on screen said why.
import { describe, expect, it } from 'vitest';
import {
  apply, canGrowContext, contextCost, contextFull, contextStep, contextUsed,
  contextWindow, inContext, initialState, verified,
} from '../src/core/engine';
import { ANCHOR_CAP } from '../src/core/graph';
import { deserialize, MIGRATIONS, serialize } from '../src/core/save';
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
    expect(contextUsed(s)).toBe(1);            // just `entity`
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

describe('growing it', () => {
  it('is refused without enough checked statements, and changes nothing', () => {
    const s = withChecked('0');
    expect(canGrowContext(s)).toBe(false);
    expect(apply(s, { type: 'growContext' })).toBe(s);
  });

  it('buys exactly one step and charges the stated price', () => {
    const s = withChecked('1000');
    const cost = contextCost(s);
    const before = contextWindow(s);
    const checkedBefore = D(verified(s)).toNumber();

    const after = apply(s, { type: 'growContext' });

    expect(contextWindow(after)).toBe(before + contextStep());
    // Priced in CHECKED statements — the one currency you cannot mint by
    // tapping. The statements stay on the board; their trust is what is spent.
    expect(D(verified(after)).toNumber()).toBe(checkedBefore - Number(cost));
    expect(after.resources.triples).toBe(s.resources.triples);
  });

  it('gets more expensive each time, so it cannot be the only sink forever', () => {
    let s = withChecked('1e9');
    const first = Number(contextCost(s));
    for (let i = 0; i < 5; i++) s = apply(s, { type: 'growContext' });
    expect(Number(contextCost(s))).toBeGreaterThan(first);
  });

  it('stops at the render budget rather than growing without limit', () => {
    const s = { ...withChecked('1e12'), contextWindow: ANCHOR_CAP };
    expect(canGrowContext(s)).toBe(false);
    expect(apply(s, { type: 'growContext' })).toBe(s);
  });

  it('growing it widens what the model is holding', () => {
    const base = initialState(1);
    const anchors = Array.from({ length: 40 }, (_, i) => i);
    const s0: GameState = {
      ...base, lastTick: 1000, contextWindow: 16,
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
