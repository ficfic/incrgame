// The speed-versus-truth loop: provenance, drift, review, the plateau, and the
// generational ratchet. These are the claims the whole design rests on, so
// they get asserted rather than asserted-about-in-a-README.
import { describe, expect, it } from 'vitest';
import {
  apply, coverage, driftPerSecond, fidelity, initialState, recovered,
  recoveryPerSecond, REFLECT_MIN_CONCEPTS, reviewQueue, reviewWeight, tick, verified,
} from '../src/core/engine';
import { applyOfflineProgress } from '../src/core/offline';
import { CONCEPT_BUDGET } from '../src/content/ontologyMeta';
import { VIGNETTES } from '../src/content/vignettes';
import type { GameState } from '../src/core/types';

const withExtractors = (n: number, s = initialState()): GameState =>
  ({ ...s, generators: { ...s.generators, extractor: n } });

describe('provenance', () => {
  it('starts perfectly trustworthy and empty', () => {
    const s = initialState();
    expect(verified(s)).toBe('0');
    expect(fidelity(s)).toBe(1);
  });

  it('counts a hand-claimed concept as VERIFIED — you placed it yourself', () => {
    let s = initialState();
    s = apply(s, { type: 'survey' });
    s = apply(s, { type: 'claimNode', id: 1 });
    expect(s.resources.triples).toBe('1');
    expect(s.provenance.unverified).toBe('0');
    expect(fidelity(s)).toBe(1);
  });

  it('machine output arrives UNVERIFIED, never verified', () => {
    const s = tick(withExtractors(10), 10);
    expect(Number(s.resources.triples)).toBeGreaterThan(0);
    // some of it has already begun to rot, which is the point — but none of it
    // is verified, because no machine in this game can verify its own output
    expect(Number(s.provenance.unverified)).toBeGreaterThan(0);
    expect(Number(s.provenance.unverified) + Number(s.provenance.drifted))
      .toBeCloseTo(Number(s.resources.triples), 5);
    expect(verified(s)).toBe('0');
  });

  it('never lets the three parts disagree with the total', () => {
    let s = withExtractors(20);
    for (let i = 0; i < 200; i++) s = tick(s, 1);
    const total = Number(s.resources.triples);
    const parts = Number(s.provenance.unverified) + Number(s.provenance.drifted) + Number(verified(s));
    expect(parts).toBeCloseTo(total, 5);
  });
});

describe('drift', () => {
  it('rots the unverified pool over time', () => {
    let s = tick(withExtractors(50), 5);
    const before = Number(s.provenance.drifted);
    for (let i = 0; i < 60; i++) s = tick(s, 1);
    expect(Number(s.provenance.drifted)).toBeGreaterThan(before);
  });

  it('cannot rot what was verified by hand', () => {
    let s = initialState();
    s = apply(s, { type: 'survey' });
    s = apply(s, { type: 'claimNode', id: 1 });
    for (let i = 0; i < 500; i++) s = tick(s, 1);
    expect(s.provenance.drifted).toBe('0');
    expect(fidelity(s)).toBe(1);
  });

  it('drives fidelity DOWN as machines outpace review', () => {
    let s = withExtractors(30);
    for (let i = 0; i < 30; i++) s = tick(s, 1);
    const early = fidelity(s);
    for (let i = 0; i < 300; i++) s = tick(s, 1);
    expect(fidelity(s)).toBeLessThanOrEqual(early);
  });
});

describe('the plateau — the reason the goal is unreachable', () => {
  it('gates concept recovery on fidelity SQUARED — half-trust is far worse than half', () => {
    const clean: GameState = { ...initialState(), generators: { ...initialState().generators, reasoner: 10 } };
    const fast = recoveryPerSecond(clean);
    const dirty: GameState = {
      ...clean,
      resources: { ...clean.resources, triples: '100' },
      provenance: { unverified: '0', drifted: '90' },
    };
    expect(fidelity(dirty)).toBeCloseTo(0.1, 5);
    // 10% fidelity buys 1% of the rate, not 10%
    expect(recoveryPerSecond(dirty)).toBeCloseTo(fast * 0.01, 5);
  });

  it('slows asymptotically as coverage rises — 100% is never reached', () => {
    const base: GameState = { ...initialState(), generators: { ...initialState().generators, reasoner: 10 } };
    const rateAt = (nodes: number): number =>
      recoveryPerSecond({ ...base, graph: { nodes, edges: 0 } });
    expect(rateAt(CONCEPT_BUDGET * 0.5)).toBeLessThan(rateAt(0));
    expect(rateAt(CONCEPT_BUDGET * 0.99)).toBeLessThan(rateAt(CONCEPT_BUDGET * 0.5));
    expect(rateAt(CONCEPT_BUDGET * 0.99)).toBeGreaterThan(0); // approached, not blocked
    expect(rateAt(CONCEPT_BUDGET)).toBe(0);
  });

  it('stops recovery dead at zero fidelity', () => {
    const dead: GameState = {
      ...initialState(),
      generators: { ...initialState().generators, reasoner: 99 },
      resources: { ...initialState().resources, triples: '100' },
      provenance: { unverified: '0', drifted: '100' },
    };
    expect(recoveryPerSecond(dead)).toBe(0);
  });

  it('never recovers past the edge of the dataset', () => {
    const done: GameState = {
      ...initialState(),
      generators: { ...initialState().generators, reasoner: 99 },
      graph: { nodes: CONCEPT_BUDGET + 5000, edges: 0 },
    };
    expect(recovered(done)).toBe(CONCEPT_BUDGET);
    expect(coverage(done)).toBe(1);
    expect(recoveryPerSecond(done)).toBe(0);
  });
});

describe('review (human in the loop)', () => {
  const dirty = (): GameState => ({
    ...initialState(),
    resources: { ...initialState().resources, triples: '100' },
    provenance: { unverified: '60', drifted: '40' },
    graph: { nodes: 30, edges: 100 },
  });

  it('offers a queue only when there is something to check', () => {
    expect(reviewQueue(initialState())).toEqual([]);
    expect(reviewQueue(dirty()).length).toBeGreaterThan(0);
  });

  it('is a pure function of the save — it cannot be re-rolled by reloading', () => {
    const s = dirty();
    expect(reviewQueue(s)).toEqual(reviewQueue(s));
  });

  it('rejecting a corrupt statement REMOVES it from the graph', () => {
    const s = dirty();
    const queue = reviewQueue(s);
    const corruptIdx = queue.findIndex((q) => q.corrupt);
    if (corruptIdx < 0) return; // this seed drew none; other tests cover it
    const keep = queue.map((_, i) => i !== corruptIdx);
    const after = apply(s, { type: 'reviewBatch', keep });
    expect(Number(after.provenance.drifted)).toBeLessThan(Number(s.provenance.drifted));
    expect(Number(after.resources.triples)).toBeLessThan(Number(s.resources.triples));
  });

  it('accepting a true statement VERIFIES it and raises fidelity', () => {
    const s = dirty();
    const queue = reviewQueue(s);
    const trueCount = queue.filter((q) => !q.corrupt).length;
    if (trueCount === 0) return;
    const after = apply(s, { type: 'reviewBatch', keep: queue.map(() => true) });
    expect(Number(after.provenance.unverified))
      .toBe(Number(s.provenance.unverified) - trueCount * reviewWeight(s));
    expect(fidelity(after)).toBeGreaterThan(fidelity(s));
  });

  it('is ACCEPTANCE SAMPLING: one inspected item speaks for a batch', () => {
    // Without this, hand-review is a rounding error in a graph of millions and
    // the human-in-the-loop lever quietly stops existing.
    const small = dirty();
    const big: GameState = {
      ...small,
      resources: { ...small.resources, triples: '100000' },
      provenance: { unverified: '60000', drifted: '40000' },
    };
    expect(reviewWeight(big)).toBeGreaterThan(reviewWeight(small));
    expect(reviewWeight(initialState())).toBe(1); // never zero
  });

  it('advances the queue so the next batch differs', () => {
    const s = dirty();
    const after = apply(s, { type: 'reviewBatch', keep: [true, true, true] });
    expect(after.rngState).not.toBe(s.rngState);
  });

  it('is never mandatory: Orchestrators verify without any tap', () => {
    let s = { ...withExtractors(10), generators: { ...initialState().generators, extractor: 10, orchestrator: 20 } };
    for (let i = 0; i < 50; i++) s = tick(s, 1);
    expect(Number(verified(s))).toBeGreaterThan(0);
  });
});

describe('offline — you never come back to damage', () => {
  it('banks machine output instead of putting it in the graph', () => {
    const s = { ...withExtractors(10), lastTick: 1_000 };
    const r = applyOfflineProgress(s, 1_000 + 3600_000);
    expect(Number(r.banked)).toBeGreaterThan(0);
    expect(Number(r.state.pending)).toBeCloseTo(Number(r.banked), 5);
    expect(r.state.resources.triples).toBe(s.resources.triples); // untouched
  });

  it('cannot rot anything while away', () => {
    const s: GameState = {
      ...withExtractors(10),
      lastTick: 1_000,
      resources: { ...initialState().resources, triples: '500' },
      provenance: { unverified: '500', drifted: '0' },
    };
    const r = applyOfflineProgress(s, 1_000 + 8 * 3600_000);
    expect(r.state.provenance.drifted).toBe('0');
    expect(fidelity(r.state)).toBe(fidelity(s));
  });

  it('absorbing banked work adds it as unverified, in front of you', () => {
    const s: GameState = { ...initialState(), pending: '120' };
    const after = apply(s, { type: 'absorb' });
    expect(after.pending).toBe('0');
    expect(after.resources.triples).toBe('120');
    expect(after.provenance.unverified).toBe('120');
  });
});

describe('prestige — retraining on yourself', () => {
  const ready = (): GameState => ({
    ...initialState(),
    graph: { nodes: REFLECT_MIN_CONCEPTS, edges: 400 },
    lifetimeGenerated: '400',
    resources: { ...initialState().resources, triples: '400', data: '999' },
    provenance: { unverified: '400', drifted: '0' },
  });

  it('refuses until enough of the world is back', () => {
    const s = initialState();
    expect(apply(s, { type: 'reflect' })).toBe(s);
  });

  it('inherits MACHINE output, and inherits it unverified', () => {
    const after = apply(ready(), { type: 'reflect' });
    expect(after.resources.triples).toBe('100'); // 25% of 400
    expect(after.provenance.unverified).toBe('100');
    expect(verified(after)).toBe('0'); // nothing carried over was ever checked
  });

  it('raises synthetic ancestry every generation, and never lowers it', () => {
    let s = ready();
    const shares: number[] = [];
    for (let g = 0; g < 4; g++) {
      s = apply(s, { type: 'reflect' });
      shares.push(s.syntheticShare);
      s = { ...s, graph: { nodes: REFLECT_MIN_CONCEPTS, edges: 400 }, lifetimeGenerated: '400' };
    }
    expect(shares).toEqual([...shares].sort((a, b) => a - b));
    expect(shares[0]).toBeCloseTo(0.5, 5);
    expect(shares[3]).toBeGreaterThan(0.9);
  });

  it('makes each generation rot FASTER — the ceiling closes', () => {
    const gen1 = ready();
    const gen2 = apply(gen1, { type: 'reflect' });
    expect(driftPerSecond(gen2)).toBeGreaterThan(driftPerSecond(gen1));
  });
});

describe('vignettes', () => {
  it('fires when its trigger holds, and only once', () => {
    const s: GameState = {
      ...initialState(),
      resources: { ...initialState().resources, triples: '50' },
      provenance: { unverified: '40', drifted: '10' },
    };
    const after = apply(s, { type: 'chooseOption', eventId: 'first-drift', choiceId: 'ship-it' });
    expect(after.vignette.seen).toContain('first-drift');
    expect(after.modifiers.extraction).toBeGreaterThan(1);
    // a second attempt changes nothing
    expect(apply(after, { type: 'chooseOption', eventId: 'first-drift', choiceId: 'slow-down' }))
      .toBe(after);
  });

  it('ships with every prose field empty — an agent must never fill these', () => {
    // The guardrail that matters most in this repo, enforced instead of asked.
    // Delete this test ONLY when a human has written the words.
    for (const v of VIGNETTES) {
      expect(v.title, `${v.id}.title`).toBe('');
      expect(v.body, `${v.id}.body`).toBe('');
      for (const c of v.choices) expect(c.label, `${v.id}.${c.id}.label`).toBe('');
      // ...but the CHOICE must still be legible from its numbers alone
      for (const c of v.choices) expect(Object.keys(c.effects).length).toBeGreaterThan(0);
    }
  });
});
