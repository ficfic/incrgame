// PLAY A WHOLE RUN, HEADLESS, AND ASSERT WHAT IT FELT LIKE.
//
// Every other test in this repo checks one call. None of them could catch the
// thing three playtesters caught, which is that a formula can be arithmetically
// correct and never once bind:
//
//     factsPerSecond = min(FACT_RATE × machines, WORDS_PER_FACT × Words)
//
// `FACT_RATE / WORDS_PER_FACT` is how many Words one machine can feed. At the
// shipped 0.4 that was 2.7, so the free opening Extractor was overtaken at
// three Words — about fifteen seconds — and the machine side bound for the rest
// of the game. The join was decoration and the design claim resting on it
// ("you cannot buy your way past your vocabulary") was false in play while
// every unit test passed.
//
// So this file simulates the run and measures the SHAPE of it. It is slow by
// this repo's standards (a few seconds) and that is the price of asserting
// something a player would notice.
//
// ---- PROVEN RED, 2026-07-28 ----------------------------------------------
//
//   SABOTAGE   src/content/machines.ts, extractor rate 1.2 → 0.4
//   OBSERVED   'the vocabulary cap is the live constraint for most of a run'
//              failed: word-bound 0% of a 131-minute run, expected ≥ 50%
//
//   SABOTAGE   src/content/machines.ts, checker `checks: 0.002` → `rate: 0.25`
//              (the flat converter that shipped)
//   OBSERVED   'buying enough Checkers is what makes loose worth doing' failed:
//              four Checkers reached the gate SLOWER than staying watched, and
//              'a Retrain inheritance is banked in proportion to the Checkers
//              you kept' failed: ten Checkers banked 3% of the pile.
import { describe, expect, it } from 'vitest';
import {
  apply, bottleneck, canWalk, factMachines, initialState, machineCost,
  RETRAIN_MIN_WORDS, stepCost, tick, words,
} from '../src/core/engine';
import { lanes } from '../src/core/starmap';
import { D } from '../src/core/numbers';
import type { GameState, MachineId } from '../src/core/types';

const num = (v: string): number => D(v).toNumber();
const HOURS = 60 * 60 * 12;

interface Play {
  /** Buy this many Checkers before anything else, then run every fact machine
   *  loose. Zero means stay watched all run. */
  checkers?: number;
  /** Stop walking after the opening, which is the failure mode the economy is
   *  shaped around. */
  idle?: boolean;
}

interface Result {
  state: GameState;
  /** Seconds to RETRAIN_MIN_WORDS, or the cap if it never got there. */
  seconds: number;
  /** Share of those seconds where the VOCABULARY was the binding side. */
  wordBound: number;
}

/** One run, one second at a time, played by a plausible person: walk whenever a
 *  step is affordable, and buy a machine when the machines are what is holding
 *  you back. No randomness — `src/core` has none and neither does this. */
function play(o: Play = {}): Result {
  let s: GameState = { ...initialState(), lastTick: 1000 };
  let bound = 0;
  let open: number[] | null = null;
  let t = 0;
  for (; t < HOURS; t++) {
    s = tick(s, 1);
    if (bottleneck(s) === 'words') bound++;
    if (o.checkers && s.machines.checker >= o.checkers && s.watched.extractor) {
      s = apply(s, { type: 'setWatched', id: 'extractor', watched: false });
    }
    for (let guard = 0; guard < 64; guard++) {
      if ((o.checkers ?? 0) > s.machines.checker
          && num(s.solid) >= num(machineCost(s, 'checker'))) {
        s = apply(s, { type: 'buy', id: 'checker' });
        continue;
      }
      const id: MachineId = 'extractor';
      if (bottleneck(s) === 'machines' && num(s.solid) >= num(machineCost(s, id))) {
        s = apply(s, { type: 'buy', id });
        continue;
      }
      if (o.idle || num(s.solid) < num(stepCost(s, -1))) break;
      // The board is only recomputed after a walk changes it: `lanes()` is the
      // expensive call in here and a run makes thousands of steps.
      open ??= lanes(s).filter((l) => l.state === 'dotted').map((l) => l.to);
      const to = open.find((x) => canWalk(s, x));
      if (to === undefined) break;
      s = apply(s, { type: 'walk', to });
      open = null;
    }
    if (words(s) >= RETRAIN_MIN_WORDS) { t++; break; }
  }
  return { state: s, seconds: t, wordBound: bound / Math.max(1, t) };
}

describe('the lane join, measured over a whole run', () => {
  const walker = play();

  it('reaches the Retrain gate in an hour or so, walking', () => {
    // Not a balance target so much as a check that the run below is a RUN and
    // not a stall — a 12-hour flatline would satisfy every other assertion here
    // by accident.
    expect(words(walker.state)).toBe(RETRAIN_MIN_WORDS);
    expect(walker.seconds).toBeGreaterThan(20 * 60);
    expect(walker.seconds).toBeLessThan(3 * 3600);
  });

  it('makes the vocabulary cap the live constraint for most of a run', () => {
    // ★ THE ONE THE PLAYTEST INVALIDATED. 67% as measured; the bound is set
    // well below that so ordinary tuning does not trip it and a return to the
    // old rate cannot pass. At FACT_RATE 0.4 this reads 0%.
    expect(walker.wordBound).toBeGreaterThan(0.5);
  });

  it('still leaves the machines binding often enough to be worth buying', () => {
    // The other half, and the reason "walking is the only income upgrade" is
    // retired as overstated: for about a third of the run a machine IS the
    // upgrade. A join that binds 100% of the time is a join with one side.
    expect(walker.wordBound).toBeLessThan(0.95);
    expect(factMachines(walker.state)).toBeGreaterThan(4);
  });

  it('flatlines an idle player against their vocabulary, not their roster', () => {
    // VISION: "an idle-only player flatlines in about ten minutes and can read
    // exactly why". They may buy whatever they like; it changes nothing.
    const idler = play({ idle: true });
    expect(words(idler.state)).toBeLessThan(RETRAIN_MIN_WORDS);
    expect(idler.wordBound).toBe(1);
  });
});

describe('watched versus loose, measured the same way', () => {
  const watched = play();
  const one = play({ checkers: 1 });
  const four = play({ checkers: 4 });

  it('leaves watched with no Rot at all, which is why it was always correct', () => {
    expect(num(watched.state.rot)).toBe(0);
  });

  it('makes one Checker WORSE than watching, so the buyout has to be bought', () => {
    expect(one.seconds).toBeGreaterThan(watched.seconds);
  });

  it('makes buying enough Checkers what makes loose worth doing', () => {
    // ⚠️ THE SHIPPED FLAT 0.25/s COULD NOT DO THIS AT ANY PRICE. Loose output
    // is bounded by the vocabulary cap — 18/s at the gate — so keeping up took
    // 72 Checkers, about 12M Solid against ~950 for the Extractors that made
    // the Raw. Watched therefore won at every point on the curve.
    expect(four.seconds).toBeLessThan(watched.seconds);
  });

  it('charges for it in Rot, so the scoreboard finally moves', () => {
    // Rot is what this game is ABOUT and it sat at zero for every well-played
    // run. It is now the price of the faster line, on screen, permanently.
    expect(num(four.state.rot)).toBeGreaterThan(1000);
  });
});

describe('what a Retrain actually hands you', () => {
  it('banks the inheritance in proportion to the Checkers you kept', () => {
    // ⚠️ >95% OF IT ROTTED, FOR EVERY ROSTER. 25% of what the machines minted
    // arrives as Raw, which is not spendable, and a flat 0.25/s converter
    // cannot eat a pile of thousands before it decays. A share of the pile
    // holds its split at any size.
    const banked = (checker: number): number => {
      const gate: GameState = {
        ...initialState(), lastTick: 1000, minted: '20000',
        held: Array.from({ length: RETRAIN_MIN_WORDS + 5 }, (_, i) => i + 100),
        machines: { extractor: 15, reasoner: 0, checker },
        watched: { extractor: false },
      };
      let s = apply(gate, { type: 'retrain' });
      const pile = num(s.raw);
      // Roster silenced: this asks what happens to the PILE, not what the
      // machines add on top of it.
      s = { ...s, machines: { extractor: 0, reasoner: 0, checker } };
      const opening = num(s.solid);
      return (num(tick(s, 600).solid) - opening) / pile;
    };
    expect(banked(0)).toBe(0);
    expect(banked(1)).toBeGreaterThan(0.2);
    expect(banked(4)).toBeGreaterThan(0.5);
    expect(banked(10)).toBeGreaterThan(0.75);
  });
});
