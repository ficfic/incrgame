// ATTENTION: the game's one bottleneck, and now the one thing that can shrink.
//
// It went 4 → 13 in 150 seconds of tapping. `play-probe` caught that; no unit
// test did, because every individual piece behaved exactly as written. So these
// tests assert the RATE, not the arithmetic — a rate is the thing that was
// wrong, and a rate is what a constant tweak can quietly undo.
import { describe, expect, it } from 'vitest';
import {
  apply, attentionCap, attentionFree, ATTENTION_BASE, ATTENTION_PENALTY_FLOOR,
  attentionPenalty, CONNECT_MS, DISCOVER_MS, EXTRACT_MS, initialState,
} from '../src/core/engine';
import { observeTransition, ticker } from '../src/shell/ticker';
import { get } from 'svelte/store';
import type { GameState } from '../src/core/types';

const withWork = (checked: string, unchecked = '0'): GameState => {
  const s = initialState(1);
  return {
    ...s, lastTick: 1000, lifetimeVerified: checked,
    provenance: { ...s.provenance, unverified: unchecked },
  };
};

describe('it grows VERY slowly', () => {
  it('starts at the base and stays there for the first several confirmations', () => {
    expect(attentionCap(withWork('0'))).toBe(ATTENTION_BASE);
    expect(attentionCap(withWork('5'))).toBe(ATTENTION_BASE);
  });

  it('costs an ORDER OF MAGNITUDE more confirmed work per extra slot', () => {
    // ⚠️ THE DEFECT THIS PINS, and it is a rate rather than a value: the growth
    // term was 4.5 per decade, so 150 seconds of tapping bought nine slots and
    // the bottleneck the whole economy rests on stopped existing.
    const at = (n: string) => attentionCap(withWork(n));
    expect(at('10') - at('0')).toBeLessThanOrEqual(1);
    expect(at('100') - at('10')).toBeLessThanOrEqual(1);
    expect(at('1000') - at('100')).toBeLessThanOrEqual(1);
    // And the whole span from nothing to a MILLION confirmations is six slots.
    // Under the old rate a million bought twenty-seven.
    expect(at('1e6') - at('0')).toBeLessThanOrEqual(6);
  });

  it('does grow — a cap that never moved would pass everything above', () => {
    expect(attentionCap(withWork('1e6'))).toBeGreaterThan(attentionCap(withWork('0')));
  });

  it('cannot be bought faster by minting statements nobody checked', () => {
    // `lifetimeVerified` is the ratchet and only confirming raises it. Piling
    // up unverified statements must not move the cap upward at all.
    const clean = withWork('100', '0');
    const hoarding = withWork('100', '5000');
    expect(attentionCap(hoarding)).toBeLessThanOrEqual(attentionCap(clean));
  });
});

describe('it degrades, once, for a named reason', () => {
  it('is free while the backlog is small', () => {
    expect(attentionPenalty(withWork('100', '0'))).toBe(0);
    expect(attentionPenalty(withWork('100', String(ATTENTION_PENALTY_FLOOR)))).toBe(0);
  });

  it('costs a whole slot once unconfirmed work is an order of magnitude past the floor', () => {
    const big = String(ATTENTION_PENALTY_FLOOR * 10);
    expect(attentionPenalty(withWork('100', big))).toBeGreaterThanOrEqual(1);
    expect(attentionCap(withWork('100', big)))
      .toBeLessThan(attentionCap(withWork('100', '0')));
  });

  it('deepens with the backlog, and never takes the cap below one slot', () => {
    const a = attentionPenalty(withWork('100', String(ATTENTION_PENALTY_FLOOR * 10)));
    const b = attentionPenalty(withWork('100', String(ATTENTION_PENALTY_FLOOR * 1000)));
    expect(b).toBeGreaterThan(a);
    expect(attentionCap(withWork('0', '1e30'))).toBeGreaterThanOrEqual(1);
  });

  it('GIVES THE SLOT BACK when the backlog clears — it is capacity, not a debt', () => {
    const hoarding = withWork('100', String(ATTENTION_PENALTY_FLOOR * 100));
    const cleared = { ...hoarding, provenance: { ...hoarding.provenance, unverified: '0' } };
    expect(attentionCap(cleared)).toBe(attentionCap(withWork('100', '0')));
  });

  it('says so on the ticker, in both directions', () => {
    // A slot vanishing silently is indistinguishable from a bug.
    const clean = withWork('100', '0');
    const hoarding = withWork('100', String(ATTENTION_PENALTY_FLOOR * 100));
    observeTransition(clean, hoarding);
    expect(get(ticker).at(-1)?.text).toMatch(/backlog/i);
    observeTransition(hoarding, clean);
    expect(get(ticker).at(-1)?.text).toMatch(/attention/i);
  });
});

describe('the tempo', () => {
  it('gives every verb a wait long enough to notice', () => {
    // Owner: "we need to slow the game down significantly". These were 18s /
    // 5s / 7s against a cap that climbed to 13, which is a tap a second.
    for (const ms of [DISCOVER_MS, EXTRACT_MS, CONNECT_MS]) {
      expect(ms).toBeGreaterThanOrEqual(10_000);
    }
    expect(DISCOVER_MS).toBeGreaterThan(CONNECT_MS); // finding > deciding
    expect(CONNECT_MS).toBeGreaterThan(EXTRACT_MS);  // deciding > machine-reading
  });

  it('still lets a fresh save do something immediately', () => {
    // Slow must not mean locked out. A new player has to be able to act on the
    // first tap, or the slowdown reads as a broken button.
    // `lastTick: 1_000` because a fresh state has a clock at 0 and discovery
    // refuses to book against it — see the guard in `case 'discover'`, which
    // exists because tapping before the first tick used to complete instantly.
    const s = { ...initialState(1), lastTick: 1_000 };
    expect(attentionFree(s)).toBeGreaterThanOrEqual(1);
    expect(apply(s, { type: 'discover' })).not.toBe(s);
  });
});
