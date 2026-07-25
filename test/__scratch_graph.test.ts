import { describe, expect, it } from 'vitest';
import { apply, initialState, reviewQueue, tick, fidelity, recoveryPerSecond, verified, driftPerSecond, reviewWeight } from '../src/core/engine';
import { serialize, deserialize } from '../src/core/save';
import { applyOfflineProgress } from '../src/core/offline';
import type { GameState } from '../src/core/types';

describe('scratch', () => {
  it('queue churn per 100ms tick', () => {
    let s: GameState = { ...initialState(), generators: { ...initialState().generators, extractor: 12, reasoner: 4 } };
    for (let i = 0; i < 600; i++) s = tick(s, 0.1); // 60s
    const q0 = reviewQueue(s);
    const snaps: string[] = [];
    for (let i = 0; i < 10; i++) { s = tick(s, 0.1); snaps.push(JSON.stringify(reviewQueue(s))); }
    console.log('q0     =', JSON.stringify(q0));
    snaps.forEach((x, i) => console.log(`t+${i + 1} =`, x));
  });

  it('v1 -> v5 chain', () => {
    const v1: any = {
      saveVersion: 1, lastTick: 123, rngState: 7,
      resources: { data: '1000', triples: '0', entities: '0', taxonomies: '0', ontologies: '0', twins: '0', capital: '0' },
      lifetimeCapital: '0',
      generators: { harvester: 3, extractor: 0, reasoner: 0, aiAgent: 0, orchestrator: 0 },
      flags: {}, coverage: { general: 0 }, reflection: 0, graph: { nodes: 12, edges: 5 },
    };
    const blob = serialize(v1 as GameState);
    const out = deserialize(blob);
    console.log('v1->v5', JSON.stringify(out));
    expect(out.saveVersion).toBe(5);
  });

  it('v5 save with partial nested provenance', () => {
    const s: any = { ...initialState(), provenance: { unverified: '10' } };
    const out = deserialize(serialize(s));
    console.log('partial provenance ->', JSON.stringify(out.provenance), 'fidelity', fidelity(out), 'drift', driftPerSecond(out), 'verified', verified(out));
  });

  it('absorb fidelity cliff', () => {
    let s: GameState = { ...initialState(), generators: { ...initialState().generators, extractor: 20, reasoner: 10 }, lastTick: 1000 };
    for (let i = 0; i < 3000; i++) s = tick(s, 0.1); // 5 min online
    // review everything so fidelity is high
    s = { ...s, provenance: { unverified: '0', drifted: '0' } };
    console.log('before away: triples', s.resources.triples, 'fid', fidelity(s), 'recov/s', recoveryPerSecond(s));
    const r = applyOfflineProgress(s, s.lastTick + 8 * 3600_000);
    console.log('banked', r.banked, 'fid while banked', fidelity(r.state), 'recov/s', recoveryPerSecond(r.state));
    const after = apply(r.state, { type: 'absorb' });
    console.log('after absorb: triples', after.resources.triples, 'fid', fidelity(after), 'recov/s', recoveryPerSecond(after));
  });

  it('reflect drops pending + modifiers', () => {
    const s: GameState = {
      ...initialState(),
      graph: { nodes: 100, edges: 400 },
      lifetimeGenerated: '400', pending: '5000',
      modifiers: { drift: 0.6, extraction: 0.8 },
      flags: { 'chose-truth': true },
      resources: { ...initialState().resources, triples: '400' },
      provenance: { unverified: '400', drifted: '0' },
      vignette: { active: null, seen: ['first-drift'] },
    };
    const after = apply(s, { type: 'reflect' });
    console.log('after reflect: pending', after.pending, 'modifiers', JSON.stringify(after.modifiers), 'seen', JSON.stringify(after.vignette.seen), 'flags', JSON.stringify(after.flags), 'lastTick', after.lastTick, 'coverage', JSON.stringify(after.coverage));
  });

  it('review weight at huge scale', () => {
    for (const t of ['1e20', '1e100', '1e308', '1e309', '1e400']) {
      const s: GameState = { ...initialState(), resources: { ...initialState().resources, triples: t }, provenance: { unverified: t, drifted: '0' } };
      console.log(t, 'drift/s', driftPerSecond(s), 'weight', reviewWeight(s), 'fid', fidelity(s));
      const n = tick(s, 0.1);
      console.log('   after tick: unver', n.provenance.unverified, 'drift', n.provenance.drifted, 'verified', verified(n), 'Number()', Number(n.resources.triples));
    }
  });

  it('rngState advance vs queue consumption', () => {
    const s: GameState = { ...initialState(), resources: { ...initialState().resources, triples: '100' }, provenance: { unverified: '60', drifted: '40' }, graph: { nodes: 2, edges: 100 } };
    const q = reviewQueue(s);
    console.log('tiny span queue:', JSON.stringify(q));
    const after = apply(s, { type: 'reviewBatch', keep: [true, true, true] });
    console.log('after: rng', after.rngState, 'queue', JSON.stringify(reviewQueue(after)));
  });
});
