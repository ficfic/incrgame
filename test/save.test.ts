import { describe, expect, it } from 'vitest';
import { apply, initialState, CURRENT_SAVE_VERSION } from '../src/core/engine';
import { projectGraph } from '../src/core/graph';
import { deserialize, serialize } from '../src/core/save';
import { applyOfflineProgress, OFFLINE_CAP_MS } from '../src/core/offline';
import { D } from '../src/core/numbers';

describe('save round-trip', () => {
  it('serialize → deserialize preserves state exactly', () => {
    let s = initialState(1337);
    for (let i = 0; i < 20; i++) s = apply(s, { type: 'manualConnect' });
    s = apply(s, { type: 'buyGenerator', id: 'harvester' });
    s = { ...s, resources: { ...s.resources, data: '1.5e30' } };
    const back = deserialize(serialize(s));
    expect(back).toEqual(s);
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

  it('migrates v1 → v3: data → triples → back to data, 1:1, never reset', () => {
    const v1 = {
      ...initialState(),
      saveVersion: 1,
      resources: { ...initialState().resources, data: '200', triples: '0' },
      graph: { nodes: 226, edges: 298 },
      generators: { ...initialState().generators, harvester: 3 },
    };
    const back = deserialize(serialize(v1));
    expect(back.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(back.resources.data).toBe('200'); // survived both hops intact
    expect(back.resources.triples).toBe('0');
    expect(back.graph).toEqual(projectGraph('200'));
    expect(back.generators.harvester).toBe(3);
  });

  it('migrates v2 → v3: triples-era balances consolidate into data', () => {
    const v2 = {
      ...initialState(),
      saveVersion: 2,
      resources: { ...initialState().resources, data: '0', triples: '218' },
    };
    const back = deserialize(serialize(v2));
    expect(back.resources.data).toBe('218');
    expect(back.resources.triples).toBe('0');
    expect(back.graph).toEqual(projectGraph('218'));
  });

  it('backfills missing fields additively (never a hard reset)', () => {
    const s = initialState() as unknown as Record<string, unknown>;
    delete s.graph;
    const blob = serialize(s as unknown as ReturnType<typeof initialState>);
    const back = deserialize(blob);
    expect(back.graph).toEqual(projectGraph(back.resources.data));
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
    const s = withHarvesters(5, 1_000_000); // 0.5 datums/s
    const { state, elapsedMs, gains } = applyOfflineProgress(s, 1_000_000 + 60_000);
    expect(elapsedMs).toBe(60_000);
    expect(D(state.resources.data).toNumber()).toBeCloseTo(30, 9);
    expect(D(gains.data ?? '0').toNumber()).toBeCloseTo(30, 9);
    expect(state.lastTick).toBe(1_060_000);
  });

  it('caps at 8 hours', () => {
    const s = withHarvesters(1, 1_000_000); // 0.1 datums/s
    const dayLater = 1_000_000 + 24 * 3600 * 1000;
    const { state, elapsedMs } = applyOfflineProgress(s, dayLater);
    expect(elapsedMs).toBe(OFFLINE_CAP_MS);
    expect(D(state.resources.data).toNumber()).toBeCloseTo(0.1 * 8 * 3600, 6);
  });

  it('the web grows while you are away (projection = exact, no big-dt tick)', () => {
    const s = withHarvesters(5, 1_000_000);
    const { state } = applyOfflineProgress(s, 1_000_000 + 60_000); // +30 datums
    expect(state.graph).toEqual(projectGraph(state.resources.data));
    expect(state.graph.nodes).toBeGreaterThan(s.graph.nodes);
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
