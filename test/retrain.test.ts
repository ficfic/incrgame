// WHAT A RETRAIN COSTS AND WHAT IT BUYS, STATED IN NUMBERS THAT ARE TRUE.
//
// The owner, playing the deployed build: "i cannot find prestige button… and
// what is lost on prestige anyways? whats the point of it?" The second half is
// a question about the design, and the game answered it nowhere.
//
// The risk with a prestige PREVIEW is that it becomes a second description of
// what prestige does, and then drifts from it — which is the exact shape of
// every defect in DECISIONS.md. So `retrainExchange` runs `retrained()`, the
// function the reducer itself calls, and reads both sides through READOUTS.
// This file asserts that equality rather than the arithmetic.
//
// ---- PROVEN RED, 2026-07-29 ----------------------------------------------
//
//   SABOTAGE  retrain.ts, `const after = { ...state, solid: '18', rot: '0' }`
//             — a hand-written after-state, i.e. exactly the drift this is
//             built to prevent, and one that looks entirely plausible
//   OBSERVED  Tests  4 failed | 5 passed (9)
//             × the preview IS the retrain, row for row
//               Raw: expected '900' to be '3000'
//             × Words carry, and they are the only thing that does
//             × Raw is not saved, it ARRIVES      expected 900 to be 3000
//             × the point of it is the price of the next step
//               expected 664 to be 6
//
//   SABOTAGE  engine.ts, `stepsThisRun: 0` → `stepsThisRun: state.stepsThisRun`
//             inside `retrained` — prestige stops resetting the cost curve,
//             which is the only reason to take it
//   OBSERVED  Tests  2 failed | 7 passed (9)
//             × Words carry, and they are the only thing that does
//             × the point of it is the price of the next step
//               expected 664 to be 6
import { describe, expect, it } from 'vitest';
import { apply, initialState, nextStepCost, RETRAIN_MIN_WORDS, retrained } from '../src/core/engine';
import { retrainExchange } from '../src/core/retrain';
import { READOUTS, type ReadoutId } from '../src/core/readouts';
import { D } from '../src/core/numbers';
import type { GameState } from '../src/core/types';

/** A run at the gate: words walked, machines bought, a big minted total and a
 *  scoreboard of Rot behind it. */
const atTheGate = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(),
  lastTick: 1_700_000_000_000,
  held: Array.from({ length: RETRAIN_MIN_WORDS + 8 }, (_, i) => 4095 - i),
  solid: '9000',
  raw: '900',
  rot: '640',
  minted: '12000',
  stepsThisRun: RETRAIN_MIN_WORDS,
  machines: { extractor: 14, reasoner: 0, checker: 3 },
  ...over,
});

describe('the exchange', () => {
  it('the preview IS the retrain, row for row', () => {
    const s = atTheGate();
    const after = apply(s, { type: 'retrain' });
    const x = retrainExchange(s);
    expect(after.generation).toBe(1);
    for (const row of x.rows) {
      expect(row.after.toString(), row.noun).toBe(READOUTS[row.id].count(after).toString());
      expect(row.before.toString(), row.noun).toBe(READOUTS[row.id].count(s).toString());
    }
    expect(x.stepAfter.toString()).toBe(nextStepCost(after));
  });

  it('quotes every quantity in the word the HUD already uses for it', () => {
    const x = retrainExchange(atTheGate());
    expect(x.rows.map((r) => r.id)).toEqual(Object.keys(READOUTS) as ReadoutId[]);
    for (const row of x.rows) {
      expect(row.noun).toBe(READOUTS[row.id].noun);
      expect(row.explain).toBe(READOUTS[row.id].explain);
    }
  });

  it('Words carry, and they are the only thing that does', () => {
    const x = retrainExchange(atTheGate());
    const by = Object.fromEntries(x.rows.map((r) => [r.id, r]));
    expect(by.words!.carries).toBe(true);
    expect(by.words!.after.toString()).toBe(by.words!.before.toString());
    // Checked work does not survive being retrained on.
    expect(by.solid!.after.lt(by.solid!.before)).toBe(true);
    // The scoreboard clears — the only time it ever does.
    expect(by.rot!.after.toNumber()).toBe(0);
    // And the price of new ground restarts, which is the whole point.
    expect(x.stepAfter.lt(x.stepBefore)).toBe(true);
  });

  it('Raw is not saved, it ARRIVES', () => {
    // 25% of what the machines minted comes back — as Raw, because it never
    // was checked. It is bigger than the pile you were holding, which is what
    // makes keeping a Checker across the gate a decision.
    const x = retrainExchange(atTheGate());
    const raw = x.rows.find((r) => r.id === 'raw')!;
    expect(raw.after.toNumber()).toBe(3000);
    expect(raw.carries).toBe(true);
    expect(raw.after.gt(raw.before)).toBe(true);
  });

  it('the point of it is the price of the next step', () => {
    const x = retrainExchange(atTheGate());
    expect(x.stepBefore.toNumber()).toBeGreaterThan(600);
    expect(x.stepAfter.toNumber()).toBe(6);
  });

  it('says how far off it is, before it is ready', () => {
    const early = retrainExchange(initialState());
    expect(early.ready).toBe(false);
    expect(early.shortBy).toBe(RETRAIN_MIN_WORDS);
    expect(retrainExchange(atTheGate()).ready).toBe(true);
    expect(retrainExchange(atTheGate()).shortBy).toBe(0);
  });

  it('never teaches a noun the player has not earned', () => {
    // The retrain screen renders in the same masked state as every other
    // surface: a readout whose word is not earned yet shows the graph's.
    const fresh = retrainExchange(initialState());
    expect(fresh.rows.every((r) => r.learned === READOUTS[r.id].learned(initialState())))
      .toBe(true);
    expect(fresh.rows.some((r) => !r.learned)).toBe(true);
  });
});

describe('the reducer and the preview are one function', () => {
  it('`retrained` is what `apply` does, with the gate taken off', () => {
    const s = atTheGate();
    expect(JSON.stringify(apply(s, { type: 'retrain' }))).toBe(JSON.stringify(retrained(s)));
  });

  it('and the gate is still the reducer\'s, not the screen\'s', () => {
    // A preview for a run that cannot retrain is fine and useful. ACTING on it
    // is not, and the refusal lives where the play probe's force-clicks land.
    const early = initialState();
    expect(retrainExchange(early).rows.length).toBe(4);
    expect(apply(early, { type: 'retrain' })).toBe(early);
    expect(D(retrained(early).generation).toNumber()).toBe(1);
  });
});
