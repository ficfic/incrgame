// ⚠️ CHARACTERIZATION TESTS — these assert the game is BROKEN, on purpose.
//
// Every test in this file pins down a defect that the 2026-07-25 agent round
// found and that a simulation then confirmed. They are here so that:
//   1. nobody has to re-derive them (sessions are ephemeral; this file is not),
//   2. the defect cannot silently get worse, and
//   3. THE MOMENT SOMEONE FIXES ONE, THE TEST GOES RED AND SAYS SO.
//
// A red test in this file is GOOD NEWS. Read the failure, confirm the fix is
// the one intended, then move the assertion into the real suite inverted.
//
// Do not "fix" these by loosening the assertion. Delete a case only when the
// defect it describes is actually gone.
import { describe, expect, it } from 'vitest';
import {
  apply, fidelity, initialState, recovered, recoveryPerSecond, tick,
} from '../src/core/engine';
import { CONCEPT_BUDGET } from '../src/content/ontologyMeta';
import { GENERATORS, M1_ROSTER } from '../src/content/generators';
import { VIGNETTES } from '../src/content/vignettes';
import type { GameState } from '../src/core/types';

describe('KNOWN DEFECT — the speed-versus-truth loop is switched off in gen 1', () => {
  it('supervising everything multiplies drift by a literal zero', () => {
    // unsupervisedPerSecond → 0, so raw → 0, so nothing is ever unverified, so
    // rot → 0. redrift is gated on syntheticShare, which is exactly 0 in gen 1.
    // mintReview needs a non-empty pool, so no desk is ever drawn and the
    // player cannot even mis-certify. Fidelity is therefore pinned at 1.
    let s: GameState = {
      ...initialState(), lastTick: 1000,
      generators: { ...initialState().generators, extractor: 12 },
      supervised: 12,
      resources: { ...initialState().resources, triples: '500' },
    };
    for (let i = 0; i < 6000; i++) s = tick(s, 1); // 100 minutes

    expect(fidelity(s)).toBeCloseTo(1, 12);
    expect(Number(s.provenance.unverified)).toBe(0);
    expect(Number(s.provenance.drifted)).toBe(0);
    expect(s.review).toHaveLength(0);
    // ^ when this goes red because drift finally bites, delete the whole case.
  });
});

// (The hand-completion defect was FIXED on 2026-07-25 — discovery now lands a
//  concept dark and a line must be filled before it counts. The assertion moved
//  to test/collapse.test.ts, inverted. This is what a resolved entry looks like.)

describe('KNOWN DEFECT — prestige after a completed run is a dead end', () => {
  it('retraining a finished world zeroes recovery permanently', () => {
    // `reflect` carries foldedNodes over, so recovered() is still at the budget
    // and recoveryPerSecond short-circuits to 0 — in this generation and every
    // one after it. For an owner playing one save long-term this destroys the
    // run with no warning.
    const finished: GameState = {
      ...initialState(), lastTick: 1000,
      forged: { ...initialState().forged, foldedNodes: String(CONCEPT_BUDGET) },
      graph: { nodes: CONCEPT_BUDGET, edges: 5000 },
      resources: { ...initialState().resources, triples: '5000' },
      lifetimeGenerated: '5000', lifetimeVerified: '5000',
      generators: { ...initialState().generators, reasoner: 20 },
    };
    const after = apply(finished, { type: 'reflect' });
    expect(recovered(after)).toBeGreaterThanOrEqual(CONCEPT_BUDGET);
    // even handed back a full stack of Reasoners, recovery stays zero
    const stacked = { ...after, generators: { ...after.generators, reasoner: 20 } };
    expect(recoveryPerSecond(stacked)).toBe(0);
  });
});

describe('KNOWN DEFECT — content that can never fire', () => {
  it('the HITL buyout is unpurchasable, so automated review is always zero', () => {
    // CLAUDE.md: review must never be mandatory. autoReviewPerSecond is a pure
    // function of generators.orchestrator, and the Orchestrator is off-roster,
    // so nothing on the board converts anything but attention into review.
    expect(M1_ROSTER).not.toContain('orchestrator');
    expect(GENERATORS.orchestrator).toBeDefined(); // still in the save shape
  });

  // FIXED 2026-07-26: was `review: 1.6` on `buy-review`, scaling
  // autoReviewPerSecond — a pure function of the off-roster Orchestrator, so
  // 1.6 x 0 forever, offered beside a real 10% extraction cost. Repointed at
  // `capacity`, which multiplies the attention cap. This test now guards the
  // rule rather than pinning the defect.
  it('NO vignette choice may scale a lever that is structurally zero', () => {
    const dead = VIGNETTES.flatMap((v) => v.choices)
      .filter((c) => c.effects.review !== undefined);
    expect(dead).toEqual([]);
  });
});
