// THE ECONOMY: Words · Solid · Raw · Rot.
//
// These tests replace ~1,200 lines that measured a model this rewrite deleted —
// fidelity, drift, the six-rung ladder, attention, bookings and the review
// desk. What is left is four quantities and one inequality, so what is tested
// here is the inequality, in both directions, and the three states one
// substance moves between.
//
// Expected values are LITERALS wherever the formula is the thing under test. A
// test that computes its expectation with the function it is testing passes
// with the mechanic destroyed; that has already happened twice in this repo.
import { describe, expect, it } from 'vitest';
import {
  apply, bottleneck, CHECK_PER_TAP, canRetrain, canWalk, checkPerSecond,
  factMachines, factsPerSecond, FACT_RATE, initialState, machineCost,
  potentialPerSecond, rawPerSecond, RETRAIN_MIN_WORDS, rotPerSecond, solidPerSecond,
  STEP_BASE, stepCost, tick, vocabularySupport, WATCHED_RATE, words, WORDS_PER_FACT,
} from '../src/core/engine';
import { MACHINES } from '../src/content/machines';
import { SEED_NODES } from '../src/content/seed';
import { lanes } from '../src/core/starmap';
import { D } from '../src/core/numbers';
import type { GameState } from '../src/core/types';

const num = (v: string): number => D(v).toNumber();

/** A state holding the seed plus `n` invented concepts, so `words()` is exactly
 *  `n`. Ids come off the top of the dataset so they cannot collide with the
 *  seed or with anything a lane test walks to. */
const withWords = (n: number, over: Partial<GameState> = {}): GameState => ({
  ...initialState(),
  lastTick: 1000,
  held: [...SEED_NODES, ...Array.from({ length: n }, (_, i) => 4095 - i)],
  ...over,
});

/** The first lane the opening board actually offers. */
const firstOpenLane = (s: GameState): number =>
  lanes(s).filter((l) => l.state !== 'locked')[0]!.to;

describe('the opening cannot strand you', () => {
  it('starts with Solid, one Extractor, and zero Words', () => {
    const s = initialState();
    expect(words(s)).toBe(0);
    expect(s.machines.extractor).toBe(1);
    expect(num(s.solid)).toBeGreaterThan(0);
  });

  it('affords at least the first step of the story', () => {
    // Words start at zero, so production starts at zero: without an opening
    // grant AND a free machine, a new save can never earn either.
    const s = initialState();
    const open = lanes(s).filter((l) => l.state !== 'locked');
    expect(open.length, 'the seed offers no walkable lane').toBeGreaterThan(0);
    expect(num(s.solid)).toBeGreaterThanOrEqual(num(stepCost(s, open[0]!.to)));
  });

  it('defaults every fact machine to WATCHED, because loose makes only Raw', () => {
    // Raw buys nothing. A new player has not met the toggle — or the word
    // "Check" — so the default must be the one that cannot leave them holding a
    // currency they have no way to spend.
    const s = initialState();
    expect(s.watched.extractor).toBe(true);
    expect(s.watched.reasoner).toBe(true);
  });
});

describe('THE LANE JOIN, in both directions', () => {
  it('produces nothing at zero Words, however many machines you own', () => {
    // The idle-only player, as arithmetic: you cannot extract relations about
    // entities you do not hold.
    const s = { ...initialState(), machines: { extractor: 200, reasoner: 50, checker: 0 } };
    expect(words(s)).toBe(0);
    expect(vocabularySupport(s)).toBe(0);
    expect(factsPerSecond(s)).toBe(0);
    expect(bottleneck(s)).toBe('words');
  });

  it('is capped by machines when the vocabulary is ahead', () => {
    const s = withWords(100); // support = 15/s against one Extractor's 1.2/s
    expect(vocabularySupport(s)).toBeCloseTo(15, 10);
    expect(potentialPerSecond(s)).toBeCloseTo(1.2, 10);
    expect(bottleneck(s)).toBe('machines');
    expect(factsPerSecond(s)).toBeCloseTo(1.2 * 0.55, 10);
  });

  it('is capped by Words when the machines are ahead', () => {
    // The sentence the HUD is meant to say, in numbers:
    // "your 30 Extractors could make 36.0/s — your vocabulary supports 1.5/s".
    const s = withWords(10, { machines: { extractor: 30, reasoner: 0, checker: 0 } });
    expect(potentialPerSecond(s)).toBeCloseTo(36.0, 10);
    expect(vocabularySupport(s)).toBeCloseTo(1.5, 10);
    expect(bottleneck(s)).toBe('words');
    expect(factsPerSecond(s)).toBeCloseTo(1.5 * 0.55, 10);
  });

  it('makes walking the ONLY thing that raises the ceiling', () => {
    // Ten times the machines: identical output. One extra Word: more output.
    // Without this the story and the idle loop are two games on one screen.
    const some = withWords(4, { machines: { extractor: 40, reasoner: 0, checker: 0 } });
    const lots = { ...some, machines: { extractor: 400, reasoner: 100, checker: 0 } };
    expect(factsPerSecond(lots)).toBeCloseTo(factsPerSecond(some), 10);
    const walked = withWords(8, { machines: some.machines });
    expect(factsPerSecond(walked)).toBeCloseTo(factsPerSecond(some) * 2, 10);
  });

  it('applies the watching penalty AFTER the cap, so watching always costs', () => {
    // Capped afterwards, a vocabulary-bound player pays nothing for watching —
    // and the game's only decision evaporates exactly where the join binds,
    // which is most of a run.
    const machines = { extractor: 30, reasoner: 0, checker: 0 };
    const watched = withWords(10, { machines });
    const loose = { ...watched, watched: { extractor: false, reasoner: true } };
    expect(factsPerSecond(loose)).toBeGreaterThan(factsPerSecond(watched));
    expect(factsPerSecond(watched)).toBeCloseTo(factsPerSecond(loose) * WATCHED_RATE, 10);
  });

  it('sends watched output to Solid and loose output to Raw', () => {
    const s = withWords(100, { machines: { extractor: 10, reasoner: 0, checker: 0 } });
    expect(rawPerSecond(s)).toBe(0);
    expect(solidPerSecond(s)).toBeGreaterThan(0);
    const l = { ...s, watched: { extractor: false, reasoner: true } };
    expect(solidPerSecond(l)).toBe(0);
    expect(rawPerSecond(l)).toBeGreaterThan(0);
  });

  it('splits the cap between machines on different toggles', () => {
    const s = withWords(1000, {
      machines: { extractor: 1, reasoner: 1, checker: 0 },
      watched: { extractor: true, reasoner: false },
    });
    expect(bottleneck(s)).toBe('machines'); // support 150/s, potential 3.4/s
    expect(solidPerSecond(s)).toBeCloseTo(1.2 * 0.55, 10);
    expect(rawPerSecond(s)).toBeCloseTo(2.2, 10);
  });

  it('excludes the Checker from a ceiling it does not produce against', () => {
    const s = withWords(100, { machines: { extractor: 1, reasoner: 0, checker: 50 } });
    expect(factMachines(s)).toBe(1);
    expect(potentialPerSecond(s)).toBeCloseTo(FACT_RATE, 10);
  });

  it('reports idle rather than a bottleneck when nothing is running', () => {
    const s = withWords(100, { machines: { extractor: 0, reasoner: 0, checker: 0 } });
    expect(bottleneck(s)).toBe('idle');
    expect(factsPerSecond(s)).toBe(0);
  });

  it('MAKES WALKING RAISE INCOME, on the machine you woke with', () => {
    // ⚠️ THE THESIS, AS A MEASUREMENT, and it was false for a whole day.
    //
    // A run opens with ONE Extractor. At 0.4/s that machine's ceiling was
    // overtaken at Words 3 — reached inside fifteen seconds — so from the first
    // minute onward every step cost exponentially more Solid and bought exactly
    // zero income. A reviewer measured the result in the real build: steps at
    // 46s, 83s and 120s, "gaps of 37s and 37s, cost 8 Solid each, constant".
    // The only thing that raised income was buying machines, which is the
    // opposite of the game's stated pitch.
    const one = (n: number) =>
      withWords(n, { machines: { extractor: 1, reasoner: 0, checker: 0 } });
    expect(bottleneck(one(3))).toBe('words');
    const rates = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => factsPerSecond(one(n)));
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]!, `Words ${i + 1} produced no more than Words ${i}`)
        .toBeGreaterThan(rates[i - 1]!);
    }
  });

  it('keeps the join BINDING: a machine must out-run eight Words', () => {
    // The join binds while `FACT_RATE x machines > WORDS_PER_FACT x Words`, so
    // the ratio between them IS how many Words one machine can feed. Below it
    // the player is machine-bound and buying machines is the upgrade; above it
    // they are word-bound and walking is.
    //
    // MEASURED, not argued (headless sim to the first Retrain, buying a machine
    // only when the machines bind):
    //     ratio  2.7 (rate 0.4)   word-bound  0% of the run, 26 machines
    //     ratio  8.0 (rate 1.2)   word-bound 74% of the run, 15 machines
    expect(FACT_RATE / WORDS_PER_FACT).toBeGreaterThanOrEqual(8);
  });

  it('holds WORDS_PER_FACT at the probed value', () => {
    // 0.8 was the first proposal and stops binding by Words ~= 20; the join has
    // to be the live constraint for most of a run or it is decoration.
    expect(WORDS_PER_FACT).toBe(0.15);
  });
});

describe('the step: Solid down, Words up', () => {
  it('prices a new concept at ceil(6 x 1.04^steps-this-run)', () => {
    const expected: Array<[number, string]> = [
      [0, '6'], [1, '7'], [5, '8'], [40, '29'], [120, '664'],
    ];
    for (const [steps, cost] of expected) {
      expect(stepCost(withWords(0, { stepsThisRun: steps }), 4000)).toBe(cost);
    }
  });

  it('charges nothing for somewhere you already hold', () => {
    const s = withWords(3, { stepsThisRun: 40 });
    expect(stepCost(s, s.held[0]!)).toBe('0');
  });

  it('walks a real lane: pays, lands the concept, and gains a Word', () => {
    const s = { ...initialState(), lastTick: 1000 };
    const to = firstOpenLane(s);
    const cost = num(stepCost(s, to));
    const after = apply(s, { type: 'walk', to });
    expect(after.held).toContain(to);
    expect(num(after.solid)).toBeCloseTo(num(s.solid) - cost, 9);
    expect(words(after)).toBe(words(s) + 1);
    expect(after.stepsThisRun).toBe(1);
  });

  it('refuses a lane the board does not offer, even when you can pay', () => {
    // The gate is the REDUCER, not the button. The play probe force-clicks.
    const s = { ...initialState(), solid: '1e9', lastTick: 1000 };
    const offered = new Set(lanes(s).map((l) => l.to));
    const unreachable = [...Array(4096).keys()].find(
      (id) => !offered.has(id) && !s.held.includes(id))!;
    expect(canWalk(s, unreachable)).toBe(false);
    expect(apply(s, { type: 'walk', to: unreachable })).toBe(s);
  });

  it('refuses a step you cannot afford', () => {
    const s = { ...initialState(), solid: '0', lastTick: 1000 };
    expect(apply(s, { type: 'walk', to: firstOpenLane(s) })).toBe(s);
  });

  it('does not move the price when you revisit', () => {
    const s = { ...initialState(), lastTick: 1000 };
    const to = firstOpenLane(s);
    const once = apply(s, { type: 'walk', to });
    const twice = apply(once, { type: 'walk', to });
    expect(twice.stepsThisRun).toBe(once.stepsThisRun);
    expect(twice.solid).toBe(once.solid);
  });
});

describe('one substance, three states', () => {
  it('turns Raw into Rot and never the other way', () => {
    const s = withWords(0, { raw: '1000', solid: '10' });
    const after = tick(s, 10);
    expect(num(after.raw)).toBeLessThan(1000);
    expect(num(after.rot)).toBeGreaterThan(0);
    expect(num(after.raw) + num(after.rot)).toBeCloseTo(1000, 6);
    expect(after.solid).toBe(s.solid); // Solid NEVER rots. That is its name.
  });

  it('decays identically whether stepped at 10 Hz or in one block', () => {
    // Not a style point: a save must not diverge because the tab was
    // backgrounded, and `raw x rate x dt` goes NEGATIVE past dt = 1/rate.
    const s = withWords(0, { raw: '1000' });
    let stepped = s;
    for (let i = 0; i < 600; i++) stepped = tick(stepped, 0.1);
    expect(num(stepped.raw)).toBeCloseTo(num(tick(s, 60).raw), 6);
  });

  it('rots faster the more synthetic the generation is', () => {
    const gen1 = withWords(0, { raw: '1000', syntheticShare: 0 });
    const gen3 = { ...gen1, syntheticShare: 0.75 };
    expect(rotPerSecond(gen3)).toBeGreaterThan(rotPerSecond(gen1));
    expect(num(tick(gen3, 10).rot)).toBeGreaterThan(num(tick(gen1, 10).rot));
  });

  it('checks a fixed slice per tap, and nothing when there is no Raw', () => {
    const s = withWords(0, { raw: '100', solid: '0' });
    const after = apply(s, { type: 'check' });
    expect(num(after.raw)).toBe(100 - CHECK_PER_TAP);
    expect(num(after.solid)).toBe(CHECK_PER_TAP);
    const empty = withWords(0, { raw: '0' });
    expect(apply(empty, { type: 'check' })).toBe(empty);
  });

  it('never lets a tap take more Raw than there is', () => {
    const after = apply(withWords(0, { raw: '2', solid: '0' }), { type: 'check' });
    expect(num(after.raw)).toBe(0);
    expect(num(after.solid)).toBe(2);
  });

  it('lets Checkers do it automatically, bounded by the pile', () => {
    const machines = { extractor: 0, reasoner: 0, checker: 4 };
    const s = withWords(0, { raw: '100', solid: '0', machines });
    expect(checkPerSecond(s)).toBeCloseTo(1.0, 10);
    expect(num(tick(s, 1).solid)).toBeCloseTo(1.0, 6);
    const drained = tick(withWords(0, { raw: '1', solid: '0', machines }), 100);
    expect(num(drained.raw)).toBe(0);
    expect(num(drained.solid)).toBeLessThanOrEqual(1);
  });

  it('only ever lets Rot fall on a Retrain', () => {
    const s = withWords(RETRAIN_MIN_WORDS, { rot: '500', raw: '10' });
    expect(num(tick(s, 600).rot)).toBeGreaterThanOrEqual(500);
    expect(apply(s, { type: 'retrain' }).rot).toBe('0');
  });
});

describe('buying a machine', () => {
  it('prices in Solid, at the roster the content table declares', () => {
    const none = withWords(0, { solid: '1e6', machines: { extractor: 0, reasoner: 0, checker: 0 } });
    expect(machineCost(none, 'extractor')).toBe('20');
    expect(machineCost(none, 'reasoner')).toBe('320');
    expect(machineCost(none, 'checker')).toBe('45');
    // A run opens owning one Extractor, so the FIRST one you buy is the second:
    // 20 x 1.15 = 23.
    expect(machineCost(withWords(0), 'extractor')).toBe('23');
    // 20 x 1.15^3 = 30.4175 -> 31
    const owned = { ...none, machines: { extractor: 3, reasoner: 0, checker: 0 } };
    expect(machineCost(owned, 'extractor')).toBe('31');
  });

  it('spends the Solid and adds the machine', () => {
    const s = withWords(0, { solid: '1000' });
    const after = apply(s, { type: 'buy', id: 'checker' });
    expect(after.machines.checker).toBe(1);
    expect(num(after.solid)).toBeCloseTo(1000 - num(MACHINES.checker.baseCost), 9);
  });

  it('refuses when you cannot pay', () => {
    const s = withWords(0, { solid: '0' });
    expect(apply(s, { type: 'buy', id: 'extractor' })).toBe(s);
  });
});

describe('the toggle', () => {
  it('flips a fact machine, and is a no-op when it is already there', () => {
    const s = initialState();
    const loose = apply(s, { type: 'setWatched', id: 'extractor', watched: false });
    expect(loose.watched.extractor).toBe(false);
    expect(apply(loose, { type: 'setWatched', id: 'extractor', watched: false })).toBe(loose);
  });
});

describe('Retrain', () => {
  it('is gated on Words', () => {
    expect(canRetrain(withWords(RETRAIN_MIN_WORDS - 1))).toBe(false);
    expect(canRetrain(withWords(RETRAIN_MIN_WORDS))).toBe(true);
    const s = withWords(RETRAIN_MIN_WORDS - 1);
    expect(apply(s, { type: 'retrain' })).toBe(s);
  });

  it('keeps the concepts, resets the step counter, inherits Raw', () => {
    const s = withWords(RETRAIN_MIN_WORDS, {
      stepsThisRun: 200, minted: '4000', solid: '9999', rot: '77',
      machines: { extractor: 40, reasoner: 3, checker: 9 },
    });
    const after = apply(s, { type: 'retrain' });
    expect(after.held).toEqual(s.held);       // nothing you chose is ever deleted
    expect(words(after)).toBe(words(s));      // Words never fall
    expect(after.stepsThisRun).toBe(0);       // the cost curve restarts: the sprint
    expect(num(after.raw)).toBe(1000);        // 25% of what the machines minted
    expect(after.rot).toBe('0');
    expect(after.generation).toBe(1);
    expect(after.machines).toEqual(s.machines);   // the apparatus survives
    expect(after.solid).toBe(initialState().solid);
    expect(after.lastTick).toBe(s.lastTick);  // never 0: that reads as 8h away
  });

  it('KEEPS THE MACHINES, so the Raw you inherit is something you can claim', () => {
    // ⚠️ THE PAYOUT USED TO EVAPORATE, AND NOTHING COULD STOP IT. 25% of what
    // the machines minted arrives as RAW — the thesis: it was never checked —
    // and Raw is not spendable. Only a Checker or a tap turns it into Solid.
    // Resetting the machines set `checkPerSecond` to 0 at the exact moment the
    // pile was biggest, against generation-1 rot of 0.005/s (a 139-second half
    // life): >95% of the reward became Rot inside ten minutes, and the only
    // counter-play, Check at 5 a tap, is 800 taps for a 4,000 pile.
    //
    // Keeping the machines does not soften the trap, it makes it a DECISION you
    // can see coming: retrain with Checkers and you bank the inheritance,
    // retrain without and you watch it rot. That is VISION's plateau you see
    // coming rather than a reward that lies.
    const s = withWords(RETRAIN_MIN_WORDS, {
      minted: '4000', machines: { extractor: 0, reasoner: 0, checker: 9 },
      watched: { extractor: false, reasoner: true },
    });
    const after = apply(s, { type: 'retrain' });
    expect(after.machines).toEqual(s.machines);
    expect(after.watched).toEqual(s.watched);
    // 9 Checkers x 0.25/s, and nothing is producing: the inherited pile is the
    // only thing moving, and it moves INTO Solid.
    expect(checkPerSecond(after)).toBeCloseTo(2.25, 10);
    const minute = tick(after, 60);
    expect(num(minute.solid) - num(after.solid)).toBeCloseTo(135, 0);
    expect(num(minute.raw)).toBeLessThan(num(after.raw));
  });

  it('still starts the next run poor, and more synthetic', () => {
    // What prestige resets and what it does not. Machines survive; the Solid
    // they were bought with does not, and neither does the step curve.
    const s = withWords(RETRAIN_MIN_WORDS, { minted: '4000', solid: '9e9', stepsThisRun: 300 });
    const after = apply(s, { type: 'retrain' });
    expect(after.solid).toBe(initialState().solid);
    expect(after.stepsThisRun).toBe(0);
    expect(after.minted).toBe('0');
    expect(rotPerSecond(after)).toBeGreaterThan(rotPerSecond(s));
  });

  it('makes each generation more synthetic, and never less', () => {
    let s = withWords(RETRAIN_MIN_WORDS, { minted: '100' });
    const shares: number[] = [];
    for (let i = 0; i < 4; i++) {
      s = { ...apply(s, { type: 'retrain' }), minted: '100' };
      shares.push(s.syntheticShare);
    }
    expect(shares).toEqual([0.5, 0.75, 0.875, 0.9375]);
  });

  it('makes the next run a sprint: everywhere already walked is free', () => {
    const s = apply(withWords(RETRAIN_MIN_WORDS, { minted: '0' }), { type: 'retrain' });
    for (const id of s.held) expect(stepCost(s, id)).toBe('0');
    expect(stepCost(s, 1234)).toBe(String(STEP_BASE));
  });
});

describe('the clock', () => {
  it('ignores a non-positive dt', () => {
    const s = withWords(5, { raw: '10' });
    expect(tick(s, 0)).toBe(s);
    expect(tick(s, -1)).toBe(s);
  });

  it('advances lastTick even when nothing moved', () => {
    const s = { ...initialState(), lastTick: 1000, machines: { extractor: 0, reasoner: 0, checker: 0 } };
    expect(tick(s, 1).lastTick).toBe(2000);
  });

  it('counts everything the machines make toward what a Retrain inherits', () => {
    const s = withWords(100, { minted: '0' });
    expect(num(tick(s, 10).minted)).toBeCloseTo(factsPerSecond(s) * 10, 6);
  });
});
