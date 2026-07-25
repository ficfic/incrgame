// The speed-versus-truth loop: provenance, drift, review, the plateau, and the
// generational ratchet. These are the claims the whole design rests on, so
// they get asserted rather than asserted-about-in-a-README.
import { describe, expect, it } from 'vitest';
import {
  apply, coverage, driftPerSecond, fidelity, initialState, recovered,
  displayedFidelity, recoveryPerSecond, REFLECT_MIN_CONCEPTS, reviewQueue, reviewWeight,
  tick, verified,
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

  it('counts a DISCOVERED concept as VERIFIED — you placed it yourself', () => {
    let s: GameState = { ...initialState(), lastTick: 1_000 };
    s = apply(s, { type: 'discover' });
    s = apply(s, { type: 'tick', dt: 20, now: 1_000 + 18_001 });
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
    let s: GameState = { ...initialState(), lastTick: 1_000 };
    s = apply(s, { type: 'discover' });
    s = apply(s, { type: 'tick', dt: 20, now: 1_000 + 18_001 });
    for (let i = 0; i < 500; i++) s = tick(s, 1);
    expect(s.provenance.drifted).toBe('0');
    expect(fidelity(s)).toBe(1);
  });

  it('drives fidelity DOWN as machines outpace review', () => {
    let s = withExtractors(30);
    for (let i = 0; i < 30; i++) s = tick(s, 1);
    const early = fidelity(s);
    for (let i = 0; i < 300; i++) s = tick(s, 1);
    expect(fidelity(s)).toBeLessThanOrEqual(early + 1e-12);
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
    // 10% fidelity buys ~1% of the rate, not 10% (f², times the remaining term)
    expect(recoveryPerSecond(dirty)).toBeLessThan(fast * 0.02);
    expect(recoveryPerSecond(dirty)).toBeGreaterThan(0);
  });

  it('caps coverage at FIDELITY — you recover as much as you can be trusted about', () => {
    // The design claim in VISION is that the stated goal is unreachable BY
    // CONSTRUCTION. `1 - coverage` alone was merely exponential and completed
    // the dataset in about seven hours, so the claim was false. The ceiling is
    // now fidelity itself, which is also the game's whole argument.
    const gens = { ...initialState().generators, reasoner: 10 };
    const at = (nodes: number, unver: string, drift: string): number => recoveryPerSecond({
      ...initialState(), generators: gens, graph: { nodes, edges: 0 },
      resources: { ...initialState().resources, triples: '100' },
      provenance: { unverified: unver, drifted: drift },
    });
    // at 60% fidelity, recovery dies as coverage approaches 60% — not 100%
    expect(at(CONCEPT_BUDGET * 0.3, '0', '40')).toBeGreaterThan(0);
    expect(at(CONCEPT_BUDGET * 0.61, '0', '40')).toBe(0);
    // raise fidelity and the ceiling rises with it
    expect(at(CONCEPT_BUDGET * 0.61, '0', '10')).toBeGreaterThan(0);
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
  /** A rotting graph with a batch actually ON the desk. The batch is minted by
   *  `tick` and frozen into state — never re-derived per render — so a test
   *  must tick to get one, exactly like the game does. */
  const dirty = (): GameState => tick({
    ...initialState(),
    resources: { ...initialState().resources, triples: '100' },
    provenance: { unverified: '60', drifted: '40' },
    graph: { nodes: 30, edges: 100 },
  }, 0.1);

  it('offers a queue only when there is something to check', () => {
    expect(reviewQueue(tick(initialState(), 0.1))).toEqual([]);
    expect(reviewQueue(dirty()).length).toBeGreaterThan(0);
  });

  it('HOLDS STILL while the player reads it', () => {
    // The batch must be a decision the game made ONCE. Re-derived per render it
    // recomputed at 10 Hz: `corrupt` flipped mid-read, concepts walked as the
    // graph grew, and the panel wiped the player's verdicts every 100 ms. The
    // desk looked finished and was not connected to anything.
    let s = dirty();
    const first = reviewQueue(s);
    expect(first.length).toBeGreaterThan(0);
    for (let i = 0; i < 200; i++) s = tick(s, 1); // two hundred ticks of churn
    expect(reviewQueue(s)).toBe(first); // same ARRAY, not merely equal
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
      .toBe(Number(s.provenance.unverified) - trueCount * Number(reviewWeight(s)));
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
    expect(Number(reviewWeight(big))).toBeGreaterThan(Number(reviewWeight(small)));
    expect(reviewWeight(initialState())).toBe('1'); // never zero
  });

  it('clears the desk on commit and rate-limits the next batch', () => {
    // Unbounded, hand review beat the automated buyout by orders of magnitude
    // and "optional" stopped being true — 30 seconds of tapping reset fidelity
    // from any state.
    const s = dirty();
    const after = apply(s, { type: 'reviewBatch', keep: [true, true, true] });
    expect(after.review).toEqual([]);
    // committing BOOKS a slot rather than starting a timer — the cost of
    // reviewing is that your attention is busy for a while
    expect(after.bookings.some((b) => b.kind === 'review')).toBe(true);
  });

  it('does not replay the same desk: minting advances the stream it consumed', () => {
    // `mintReview` walked the RNG locally and threw the advanced seed away;
    // `reviewBatch` then guessed how far to skip (`queue.length * 3`), which is
    // not how far minting actually walks — retries consume extra draws. So the
    // stream desynced and desks could repeat.
    // A world with enough recovered concepts that a desk CAN differ. `dirty()`
    // sets `graph` directly, but `graph` is derived from `forged` on every tick,
    // so that fixture is a one-concept world where every desk is [0:0].
    const s = tick({
      ...initialState(),
      forged: { ...initialState().forged, foldedNodes: '400' },
      resources: { ...initialState().resources, triples: '100' },
      provenance: { unverified: '60', drifted: '40' },
    }, 0.1);
    expect(s.rngState).not.toBe(initialState().rngState); // minting wrote back
    const first = reviewQueue(s).map((i) => `${i.conceptIndex}:${i.glossIndex}`);
    expect(first.length).toBeGreaterThan(1);
    let t = apply(s, { type: 'reviewBatch', keep: first.map(() => true) });
    expect(t.review).toEqual([]);
    for (let i = 0; i < 400 && t.review.length === 0; i++) t = tick(t, 0.1);
    const second = reviewQueue(t).map((i) => `${i.conceptIndex}:${i.glossIndex}`);
    expect(second.length).toBeGreaterThan(0);
    expect(second).not.toEqual(first);
  });

  it('makes certifying a lie cost something the player cannot see', () => {
    const s = dirty();
    const q = reviewQueue(s);
    const corruptIdx = q.findIndex((x) => x.corrupt);
    if (corruptIdx < 0) return;
    const after = apply(s, { type: 'reviewBatch', keep: q.map(() => true) });
    expect(Number(after.falselyVerified)).toBeGreaterThan(0);
    // the number on screen goes UP while the number that matters does not
    expect(displayedFidelity(after)).toBeGreaterThan(fidelity(after));
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

  it('absorbs banked work in SLICES, so returning is never a fidelity cliff', () => {
    // Fidelity is a ratio. Tipping an 8h bank into a small graph in one tap
    // multiplied the denominator ~100x and cost four orders of magnitude of
    // recovery — "you never come back to damage" held only in the letter.
    const s: GameState = { ...initialState(), pending: '10000' };
    const after = apply(s, { type: 'absorb' });
    expect(Number(after.pending)).toBeGreaterThan(0);           // some still banked
    expect(Number(after.pending)).toBeLessThan(10000);          // some absorbed
    expect(after.resources.triples).toBe(after.provenance.unverified); // arrives unchecked
    // and it does drain fully with repeated taps
    let t = after;
    for (let i = 0; i < 200 && Number(t.pending) > 0; i++) t = apply(t, { type: 'absorb' });
    expect(t.pending).toBe('0');
  });

  it('respects the supervision split you left set', () => {
    // Away time used to run every agent at FULL rate and bank all of it
    // unchecked. Closing the game was therefore +82% throughput and −100%
    // verification: the supervision dial, the game's one real decision, was
    // strictly worse than the app switcher.
    const watched: GameState = { ...withExtractors(10), supervised: 10, lastTick: 1_000 };
    const loose: GameState = { ...withExtractors(10), supervised: 0, lastTick: 1_000 };
    const hour = 3600_000;

    const w = applyOfflineProgress(watched, 1_000 + hour).state;
    const l = applyOfflineProgress(loose, 1_000 + hour).state;

    expect(Number(w.pendingClean)).toBeGreaterThan(0);
    expect(Number(w.pending)).toBe(0);        // nothing unwatched, nothing dirty
    expect(Number(l.pendingClean)).toBe(0);
    expect(Number(l.pending)).toBeGreaterThan(0);
    // and watching still COSTS throughput offline, exactly as it does online
    expect(Number(w.pendingClean)).toBeLessThan(Number(l.pending));
  });

  it('absorbs the bank in its true mix and credits the clean half', () => {
    const s: GameState = { ...initialState(), pending: '6000', pendingClean: '2000' };
    const after = apply(s, { type: 'absorb' });
    const took = Number(after.resources.triples);
    expect(took).toBeGreaterThan(0);
    // a quarter of the bank was supervised, so a quarter of every slice is
    // verified — you cannot skim the clean statements first
    expect(Number(after.provenance.unverified) / took).toBeCloseTo(0.75, 6);
    expect(Number(after.lifetimeVerified)).toBeCloseTo(took * 0.25, 6);
    expect(Number(verified(after))).toBeCloseTo(took * 0.25, 6);

    let t = after;
    for (let i = 0; i < 400 && Number(t.pending) + Number(t.pendingClean) > 0; i++) {
      t = apply(t, { type: 'absorb' });
    }
    expect(Number(t.pending)).toBeCloseTo(0, 6);
    expect(Number(t.pendingClean)).toBeCloseTo(0, 6);
    expect(Number(t.resources.triples)).toBeCloseTo(8000, 3);
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
