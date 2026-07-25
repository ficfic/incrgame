import { describe, expect, it } from 'vitest';
import { apply, initialState, CURRENT_SAVE_VERSION } from '../src/core/engine';
import { deserialize, serialize } from '../src/core/save';
import { applyOfflineProgress, OFFLINE_CAP_MS } from '../src/core/offline';
import { D } from '../src/core/numbers';

describe('save round-trip', () => {
  it('serialize → deserialize preserves state exactly', () => {
    let s = initialState(1337);
    s = apply(s, { type: 'manualConnect' });
    s = apply(s, { type: 'manualConnect' });
    s = { ...s, resources: { ...s.resources, data: '1.5e30' } };
    s = apply(s, { type: 'buyGenerator', id: 'harvester' });
    const back = deserialize(serialize(s));
    expect(back).toEqual(s);
    // Decimal survives as string and rehydrates to the same value
    expect(D(back.resources.data).eq(D(s.resources.data))).toBe(true);
  });

  it('blob is clipboard-safe base64', () => {
    expect(serialize(initialState())).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('rejects garbage without touching anything', () => {
    expect(() => deserialize('not-a-save!!!')).toThrow();
    expect(() => deserialize('aGVsbG8=')).toThrow(); // valid b64, not an envelope
  });

  it('rejects saves from a future version', () => {
    const s = { ...initialState(), saveVersion: CURRENT_SAVE_VERSION + 1 };
    expect(() => deserialize(serialize(s))).toThrow(/future/);
  });

  it('backfills missing fields additively (never a hard reset)', () => {
    // simulate an older save that predates the `graph` field
    const s = initialState() as unknown as Record<string, unknown>;
    delete s.graph;
    const blob = serialize(s as unknown as ReturnType<typeof initialState>);
    const back = deserialize(blob);
    expect(back.graph).toEqual({ nodes: 1, edges: 0 });
    expect(back.saveVersion).toBe(CURRENT_SAVE_VERSION);
  });
});

describe('offline progress', () => {
  const withHarvesters = (n: number, lastTick: number) => ({
    ...initialState(),
    lastTick,
    generators: { ...initialState().generators, harvester: n },
  });

  it('grants rate × elapsed seconds (ms converted, not 1000× overshoot)', () => {
    const s = withHarvesters(5, 1_000_000); // 0.5 data/s
    const { state, elapsedMs, gains } = applyOfflineProgress(s, 1_000_000 + 60_000);
    expect(elapsedMs).toBe(60_000);
    expect(D(state.resources.data).toNumber()).toBeCloseTo(30, 9);
    expect(D(gains.data ?? '0').toNumber()).toBeCloseTo(30, 9);
    expect(state.lastTick).toBe(1_060_000);
  });

  it('caps at 8 hours', () => {
    const s = withHarvesters(1, 1_000_000); // 0.1 data/s
    const dayLater = 1_000_000 + 24 * 3600 * 1000;
    const { state, elapsedMs } = applyOfflineProgress(s, dayLater);
    expect(elapsedMs).toBe(OFFLINE_CAP_MS);
    expect(D(state.resources.data).toNumber()).toBeCloseTo(0.1 * 8 * 3600, 6);
  });

  it('never goes backwards on clock skew', () => {
    const s = withHarvesters(1, 2_000_000);
    const { state, elapsedMs } = applyOfflineProgress(s, 1_500_000); // clock went back
    expect(elapsedMs).toBe(0);
    expect(state.resources.data).toBe('0');
  });

  it('fresh state (lastTick=0) gets no windfall', () => {
    const s = withHarvesters(1, 0);
    const { elapsedMs } = applyOfflineProgress(s, Date.now());
    expect(elapsedMs).toBe(0);
  });
});
