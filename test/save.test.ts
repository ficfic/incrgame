import { describe, expect, it } from 'vitest';
import { apply, initialState, ratePerSecond, CURRENT_SAVE_VERSION } from '../src/core/engine';
import { projectGraph } from '../src/core/graph';
import { deserialize, serialize } from '../src/core/save';
import { applyOfflineProgress, OFFLINE_CAP_MS } from '../src/core/offline';
import { D } from '../src/core/numbers';

const claimed = () => {
  let s = initialState(1337);
  s = apply(s, { type: 'survey' });
  s = apply(s, { type: 'claimNode', id: 1 });
  s = apply(s, { type: 'survey' });
  s = apply(s, { type: 'claimNode', id: 2 });
  return s; // 2 edges → 0.3 Datums/s drip
};

describe('save round-trip', () => {
  it('serialize → deserialize preserves state (forged topology included)', () => {
    let s = claimed();
    s = { ...s, resources: { ...s.resources, data: '1.5e30' } };
    s = apply(s, { type: 'buyGenerator', id: 'harvester' });
    const back = deserialize(serialize(s));
    expect(back).toEqual(s);
    expect(back.forged.links).toEqual(s.forged.links);
  });

  it('blob is clipboard-safe base64', () => {
    expect(serialize(initialState())).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it('rejects garbage and future versions without touching anything', () => {
    expect(() => deserialize('not-a-save!!!')).toThrow();
    expect(() => deserialize('aGVsbG8=')).toThrow();
    const s = { ...initialState(), saveVersion: CURRENT_SAVE_VERSION + 1 };
    expect(() => deserialize(serialize(s))).toThrow(/future/);
  });

  it('migrates v1 → v4: balances survive, the old web is credited', () => {
    const v1 = {
      ...initialState(),
      saveVersion: 1,
      resources: { ...initialState().resources, data: '200', triples: '0' },
      graph: { nodes: 226, edges: 298 },
      generators: { ...initialState().generators, harvester: 3 },
    } as unknown as ReturnType<typeof initialState>;
    delete (v1 as unknown as Record<string, unknown>).forged; // v1 predates forged
    const back = deserialize(serialize(v1));
    expect(back.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(back.resources.data).toBe('200'); // never reset
    const oldWeb = projectGraph('200'); // the v3-era projection of that balance
    expect(back.resources.triples).toBe(String(oldWeb.edges)); // web → drip credit
    expect(D(back.forged.foldedNodes).toNumber()).toBe(oldWeb.nodes - 1);
    expect(back.forged.anchors).toEqual([0]);
    expect(back.graph).toEqual({ nodes: oldWeb.nodes, edges: oldWeb.edges });
    expect(back.generators.harvester).toBe(3);
  });

  it('migrates v3 → v4 directly (the deployed-yesterday shape)', () => {
    const v3 = {
      ...initialState(),
      saveVersion: 3,
      resources: { ...initialState().resources, data: '1000', triples: '0' },
    } as unknown as ReturnType<typeof initialState>;
    delete (v3 as unknown as Record<string, unknown>).forged;
    const back = deserialize(serialize(v3));
    const oldWeb = projectGraph('1000');
    expect(back.resources.data).toBe('1000');
    expect(back.resources.triples).toBe(String(oldWeb.edges));
    expect(back.graph.edges).toBe(oldWeb.edges);
  });

  it('backfills missing fields additively (never a hard reset)', () => {
    const s = initialState() as unknown as Record<string, unknown>;
    delete s.forged;
    const back = deserialize(serialize(s as unknown as ReturnType<typeof initialState>));
    expect(back.forged.anchors).toEqual([0]);
    expect(back.saveVersion).toBe(CURRENT_SAVE_VERSION);
  });
});

describe('offline progress', () => {
  it('the drip accrues offline, exactly (ms → seconds)', () => {
    const s = { ...claimed(), lastTick: 1_000_000 };
    // whatever the drip is worth right now, a minute of it is exactly 60x
    const perSecond = D(ratePerSecond(s, 'data')).toNumber();
    const { state, elapsedMs, gains } = applyOfflineProgress(s, 1_000_000 + 60_000);
    expect(elapsedMs).toBe(60_000);
    expect(D(gains.data ?? '0').toNumber()).toBeCloseTo(perSecond * 60, 9);
    expect(D(state.resources.data).toNumber()).toBeCloseTo(
      D(s.resources.data).toNumber() + perSecond * 60, 9);
    expect(state.graph).toEqual(s.graph); // web itself waits for machines (M3)
  });

  it('caps at 8 hours', () => {
    const s = { ...claimed(), lastTick: 1_000_000 };
    const { elapsedMs } = applyOfflineProgress(s, 1_000_000 + 24 * 3600 * 1000);
    expect(elapsedMs).toBe(OFFLINE_CAP_MS);
  });

  it('never goes backwards on clock skew; fresh states get no windfall', () => {
    const skew = applyOfflineProgress({ ...claimed(), lastTick: 2_000_000 }, 1_500_000);
    expect(skew.elapsedMs).toBe(0);
    const fresh = applyOfflineProgress(claimed(), Date.now()); // lastTick = 0
    expect(fresh.elapsedMs).toBe(0);
  });
});
