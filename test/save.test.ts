import { describe, expect, it } from 'vitest';
import {
  apply, initialState, supervisedPerSecond, unsupervisedPerSecond, CURRENT_SAVE_VERSION,
} from '../src/core/engine';
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

  it('migrates v9 → v10 without losing a banked statement', () => {
    const v9 = {
      ...initialState(),
      saveVersion: 9,
      pending: '4321',
      resources: { ...initialState().resources, triples: '900' },
    } as unknown as ReturnType<typeof initialState>;
    delete (v9 as unknown as Record<string, unknown>).pendingClean;
    const back = deserialize(serialize(v9));
    expect(back.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(back.pending).toBe('4321');   // still banked
    expect(back.pendingClean).toBe('0'); // and honestly unverified, as it was
    expect(back.resources.triples).toBe('900');
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
  it('offline converts ms → seconds exactly (the 1000x bug SPEC calls out)', () => {
    // This test used to measure `ratePerSecond`, which returns '0' now that
    // Datums are gone — so it asserted 0 ≈ 0 × 60 and covered nothing, while
    // still being counted in the green total. A vacuously-passing test is worse
    // than a deleted one. Re-pointed at where the ms→s conversion actually
    // lives now: the banked machine output in offline.ts.
    const s = {
      ...claimed(),
      lastTick: 1_000_000,
      generators: { ...initialState().generators, extractor: 10 },
      supervised: 4,
    };
    const clean = D(supervisedPerSecond(s)).toNumber();
    const dirty = D(unsupervisedPerSecond(s)).toNumber();
    expect(clean).toBeGreaterThan(0);
    expect(dirty).toBeGreaterThan(0);

    const { state, elapsedMs } = applyOfflineProgress(s, 1_000_000 + 60_000);
    expect(elapsedMs).toBe(60_000);
    // sixty SECONDS of output, not sixty thousand
    expect(D(state.pendingClean).toNumber()).toBeCloseTo(clean * 60, 9);
    expect(D(state.pending).toNumber()).toBeCloseTo(dirty * 60, 9);
    expect(state.graph).toEqual(s.graph); // banked, not in the graph
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

// ── nested backfill ────────────────────────────────────────────────────────
//
// The backfill test above deletes a TOP-LEVEL field, and that is the only
// reason `deserialize`'s one-level spread looked correct for twelve save
// versions. A key missing INSIDE `resources` or `generators` was left
// `undefined`, which turns into NaN the first time it is incremented and into
// `null` the first time it is saved. These delete keys one level down.
describe('backfilling keys inside records (a new resource must not brick a save)', () => {
  const roundTrip = (mutate: (blob: any) => void): any => {
    const blob = JSON.parse(Buffer.from(serialize(initialState(1)), 'base64').toString('utf8'));
    mutate(blob);
    return deserialize(Buffer.from(JSON.stringify(blob), 'utf8').toString('base64'));
  };

  it('restores a missing generator key rather than leaving it undefined', () => {
    const s = roundTrip((b) => delete b.state.generators.extractor);
    expect(s.generators.extractor).toBe(0);
  });

  it('never lets a missing generator key become NaN when bought', () => {
    const s = roundTrip((b) => {
      delete b.state.generators.extractor;
      b.state.resources.triples = '1e9';
      b.state.lifetimeVerified = '1e9';
    });
    const after = apply(s, { type: 'buyGenerator', id: 'extractor' });
    expect(Number.isNaN(after.generators.extractor)).toBe(false);
    expect(after.generators.extractor).toBeGreaterThan(0);
    // and it must survive a save/load, which is where NaN turns into null
    expect(deserialize(serialize(after)).generators.extractor).toBe(after.generators.extractor);
  });

  it('restores a missing resource key', () => {
    const s = roundTrip((b) => delete b.state.resources.triples);
    expect(s.resources.triples).toBe(initialState(1).resources.triples);
  });

  it('restores missing provenance, coverage and forged sub-fields', () => {
    const s = roundTrip((b) => {
      delete b.state.provenance.drifted;
      delete b.state.coverage.general;
      delete b.state.forged.anchors;
    });
    expect(s.provenance.drifted).toBe(initialState(1).provenance.drifted);
    expect(s.coverage.general).toBe(initialState(1).coverage.general);
    expect(Array.isArray(s.forged.anchors)).toBe(true);
  });

  it('keeps real values — backfill must not overwrite what the save DID carry', () => {
    const s = roundTrip((b) => { b.state.generators.reasoner = 7; });
    expect(s.generators.reasoner).toBe(7);
  });
});
