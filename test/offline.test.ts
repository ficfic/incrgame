// AWAY TIME: absence banks work, and nothing rots while you are gone.
//
// This is a hard rule from VISION, not a balance knob — "you come back to a
// job, never to damage" — and it has been broken twice: once by running every
// machine at full speed and banking all of it unchecked (so closing the game
// was a straight throughput win), and once by tipping an eight-hour bank into a
// small graph and multiplying a denominator by 100.
import { describe, expect, it } from 'vitest';
import { applyOfflineProgress, OFFLINE_CAP_MS } from '../src/core/offline';
import { initialState, rawPerSecond, solidPerSecond, tick } from '../src/core/engine';
import { SEED_NODES } from '../src/content/seed';
import { D } from '../src/core/numbers';
import type { GameState } from '../src/core/types';

const num = (v: string): number => D(v).toNumber();

const away = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(),
  lastTick: 1_000_000,
  held: [...SEED_NODES, ...Array.from({ length: 100 }, (_, i) => 4095 - i)],
  machines: { extractor: 10, reasoner: 0, checker: 0 },
  ...over,
});

describe('nothing rots while you are away', () => {
  it('leaves a banked Raw pile exactly where it was', () => {
    const s = away({ raw: '5000', machines: { extractor: 0, reasoner: 0, checker: 0 } });
    const { state } = applyOfflineProgress(s, s.lastTick + 8 * 3600 * 1000);
    expect(num(state.raw)).toBe(5000);
    expect(num(state.rot)).toBe(0);
  });

  it('rots the same pile the moment you are looking at it', () => {
    const s = away({ raw: '5000', machines: { extractor: 0, reasoner: 0, checker: 0 } });
    expect(num(tick(s, 60).rot)).toBeGreaterThan(0);
  });
});

describe('absence banks work at the split you left set', () => {
  it('banks a watched roster as Solid, not as Raw', () => {
    // Banking it as Raw makes closing the app a straight downgrade for the one
    // play style the game rewards. That regression has been shipped once.
    const s = away();
    const { state, solid, raw } = applyOfflineProgress(s, s.lastTick + 3600 * 1000);
    expect(num(raw)).toBe(0);
    expect(num(solid)).toBeCloseTo(solidPerSecond(s) * 3600, 6);
    expect(num(state.solid)).toBeCloseTo(num(s.solid) + solidPerSecond(s) * 3600, 6);
  });

  it('banks a loose roster as Raw', () => {
    const s = away({ watched: { extractor: false, reasoner: false } });
    const { state, raw } = applyOfflineProgress(s, s.lastTick + 3600 * 1000);
    expect(num(raw)).toBeCloseTo(rawPerSecond(s) * 3600, 6);
    expect(num(state.raw)).toBeCloseTo(rawPerSecond(s) * 3600, 6);
  });

  it('respects the lane join while you are gone, exactly as it does online', () => {
    // Away time is not a way around the vocabulary cap.
    const s = away({ held: [...SEED_NODES], machines: { extractor: 50, reasoner: 0, checker: 0 } });
    const { state } = applyOfflineProgress(s, s.lastTick + 8 * 3600 * 1000);
    expect(num(state.solid)).toBe(num(s.solid));
    expect(num(state.raw)).toBe(0);
  });

  it('runs the Checkers too, so automation does not need you present', () => {
    const s = away({
      raw: '10000',
      machines: { extractor: 0, reasoner: 0, checker: 4 },
    });
    const { state } = applyOfflineProgress(s, s.lastTick + 600 * 1000);
    expect(num(state.raw)).toBeCloseTo(10000 - 600, 6); // 4 x 0.25/s for 600s
    expect(num(state.solid)).toBeCloseTo(num(s.solid) + 600, 6);
  });

  it('never lets Checkers convert more Raw than exists', () => {
    const s = away({ raw: '5', machines: { extractor: 0, reasoner: 0, checker: 100 } });
    const { state } = applyOfflineProgress(s, s.lastTick + 8 * 3600 * 1000);
    expect(num(state.raw)).toBe(0);
    expect(num(state.solid)).toBe(num(s.solid) + 5);
  });
});

describe('the gap itself', () => {
  it('caps at OFFLINE_CAP_MS', () => {
    const s = away();
    const long = applyOfflineProgress(s, s.lastTick + 30 * 24 * 3600 * 1000);
    expect(long.elapsedMs).toBe(OFFLINE_CAP_MS);
    expect(num(long.solid)).toBeCloseTo(solidPerSecond(s) * OFFLINE_CAP_MS / 1000, 6);
  });

  it('does nothing on a fresh save, where lastTick is 0', () => {
    const s = { ...away(), lastTick: 0 };
    const { state, elapsedMs } = applyOfflineProgress(s, 5_000_000);
    expect(elapsedMs).toBe(0);
    expect(state.solid).toBe(s.solid);
    expect(state.lastTick).toBe(5_000_000);
  });

  it('does nothing when the clock went backwards', () => {
    const s = away();
    const { elapsedMs } = applyOfflineProgress(s, s.lastTick - 60_000);
    expect(elapsedMs).toBe(0);
  });

  it('counts away production toward what a Retrain inherits', () => {
    const s = away({ minted: '0' });
    const { state } = applyOfflineProgress(s, s.lastTick + 3600 * 1000);
    expect(num(state.minted)).toBeCloseTo(solidPerSecond(s) * 3600, 6);
  });
});
