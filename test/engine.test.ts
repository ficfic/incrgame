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
  apply, bottleneck, CHECK_PER_TAP, CHECK_TAP_SHARE, canRetrain, canWalk,
  checkPerSecond, checkSharePerSecond, checkTake, looseYield,
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
    // And there is exactly one toggle: the Reasoner's output is sound by
    // construction, so it has none rather than an inert one.
    expect(Object.keys(s.watched)).toEqual(['extractor']);
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
    // Same MIX, ten times the machines. The mix matters now that the Reasoner
    // is exempt from the watching penalty — the cap is split by each machine's
    // share of the gross rate, so a different roster is a different quality of
    // output, not just more of it.
    const some = withWords(4, { machines: { extractor: 40, reasoner: 0, checker: 0 } });
    const lots = { ...some, machines: { extractor: 400, reasoner: 0, checker: 0 } };
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
    const loose = { ...watched, watched: { extractor: false } };
    expect(factsPerSecond(loose)).toBeGreaterThan(factsPerSecond(watched));
    expect(factsPerSecond(watched)).toBeCloseTo(factsPerSecond(loose) * WATCHED_RATE, 10);
  });

  it('sends watched output to Solid and loose output to Raw', () => {
    const s = withWords(100, { machines: { extractor: 10, reasoner: 0, checker: 0 } });
    expect(rawPerSecond(s)).toBe(0);
    expect(solidPerSecond(s)).toBeGreaterThan(0);
    const l = { ...s, watched: { extractor: false } };
    expect(solidPerSecond(l)).toBe(0);
    expect(rawPerSecond(l)).toBeGreaterThan(0);
  });

  it('exempts the Reasoner from the watching penalty, and only the Reasoner', () => {
    // ⚠️ THE GLOSSARY SAID "ALWAYS SOLID" AND THE CODE CHARGED IT 45% ANYWAY,
    // for eight days, because `reasoner` was in FACT_MACHINES and `throughput`
    // penalised every id in there. Entailment is monotonic and its closure is
    // finite: there is nothing in a derived fact to review, so there is nothing
    // to pay for reviewing. It has no toggle at all rather than an inert one.
    const s = withWords(1000, {
      machines: { extractor: 1, reasoner: 1, checker: 0 },
      watched: { extractor: true },
    });
    expect(bottleneck(s)).toBe('machines'); // support 150/s, potential 3.4/s
    // The Extractor pays 45%; the Reasoner pays nothing and still lands Solid.
    expect(solidPerSecond(s)).toBeCloseTo(1.2 * WATCHED_RATE + 2.2, 10);
    expect(rawPerSecond(s)).toBe(0);
    // ...and letting the Extractor loose moves ONLY the Extractor's share.
    const l = { ...s, watched: { extractor: false } };
    expect(solidPerSecond(l)).toBeCloseTo(2.2, 10);
    expect(rawPerSecond(l)).toBeCloseTo(1.2, 10);
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

  it('takes a SHARE per tap once the pile is bigger than the floor', () => {
    // ⚠️ A FLAT 5 WAS A NO-OP AT ONE END AND AN ATTENTION TAX AT THE OTHER: it
    // over-ran the whole pile in the first minute and was 800 taps against a
    // Retrain inheritance. A tap is now worth something at every pile size and
    // never worth sitting there, because one Checker overtakes a thumb in
    // seconds.
    const small = withWords(0, { raw: '100', solid: '0' });
    expect(num(checkTake(small))).toBe(CHECK_PER_TAP);       // floor still bites
    const big = withWords(0, { raw: '4000', solid: '0' });
    expect(num(checkTake(big))).toBe(4000 * CHECK_TAP_SHARE); // 80, not 5
    const after = apply(big, { type: 'check' });
    expect(num(after.raw)).toBe(4000 - 80);
    expect(num(after.solid)).toBe(80);
    const empty = withWords(0, { raw: '0' });
    expect(apply(empty, { type: 'check' })).toBe(empty);
  });

  it('never lets a tap take more Raw than there is', () => {
    const after = apply(withWords(0, { raw: '2', solid: '0' }), { type: 'check' });
    expect(num(after.raw)).toBe(0);
    expect(num(after.solid)).toBe(2);
  });

  it('lets Checkers do it automatically, as a share of the pile', () => {
    const machines = { extractor: 0, reasoner: 0, checker: 4 };
    const s = withWords(0, { raw: '100', solid: '0', machines });
    expect(checkSharePerSecond(s)).toBeCloseTo(0.008, 10);
    expect(checkPerSecond(s)).toBeCloseTo(0.8, 10); // 0.8% of a pile of 100
    const drained = tick(withWords(0, { raw: '1', solid: '0', machines }), 1e5);
    expect(num(drained.raw)).toBeLessThan(1e-6);
  });

  it('makes watched-versus-loose a decision the Checkers settle', () => {
    // ⚠️ WATCHED USED TO BE CORRECT AT EVERY POINT ON THE CURVE, so Rot — the
    // scoreboard this whole game is about — never moved. The Checker converted
    // a FLAT 0.25/s, and loose output is bounded by the vocabulary cap, which
    // is 18/s at the Retrain gate: keeping up took 72 Checkers, about 12M
    // Solid, against ~950 for the Extractors that made the Raw.
    //
    // A SHARE of the pile holds its split at any size, so the toggle becomes a
    // judgement about capacity. `looseYield` is the share of a loose machine's
    // output that reaches Solid instead of Rot.
    const at = (checker: number, syntheticShare = 0) =>
      withWords(0, { machines: { extractor: 0, reasoner: 0, checker }, syntheticShare });
    expect(looseYield(at(0))).toBe(0);                        // loose alone is a trap
    expect(looseYield(at(1))).toBeLessThan(WATCHED_RATE);     // ONE is worse than watching
    expect(looseYield(at(2))).toBeGreaterThan(WATCHED_RATE);  // two buys the trade
    expect(looseYield(at(8))).toBeGreaterThan(looseYield(at(4)));
    expect(looseYield(at(999))).toBeLessThan(1);              // and never all of it
    // And it gets harder to hold: a more synthetic generation needs more.
    expect(looseYield(at(2, 0.5))).toBeLessThan(WATCHED_RATE);
  });

  it('splits what leaves the pile between Solid and Rot, at any dt', () => {
    // The two drains run at once and are solved as one equation. Sequenced,
    // the answer depended on which ran first, so a 10 Hz run and one catch-up
    // block disagreed and "the Checker keeps up" was really "the Checker is
    // served first".
    const s = withWords(0, {
      raw: '1000', solid: '0', rot: '0', machines: { extractor: 0, reasoner: 0, checker: 4 },
    });
    const oneBlock = tick(s, 60);
    let stepped = s;
    for (let i = 0; i < 600; i++) stepped = tick(stepped, 0.1);
    expect(num(stepped.solid)).toBeCloseTo(num(oneBlock.solid), 6);
    expect(num(stepped.rot)).toBeCloseTo(num(oneBlock.rot), 6);
    // Conservation: nothing leaves the substance, it only changes state.
    const left = 1000 - num(oneBlock.raw);
    expect(num(oneBlock.solid) + num(oneBlock.rot)).toBeCloseTo(left, 6);
    expect(num(oneBlock.solid) / left).toBeCloseTo(looseYield(s), 6);
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
    expect(machineCost(none, 'checker')).toBe('90');
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
    // ⚠️ THE PAYOUT EVAPORATED AND KEEPING THE MACHINES DID NOT SAVE IT. 25% of
    // what the machines minted arrives as RAW — the thesis: it was never
    // checked — and Raw is not spendable. A Checker converting a FLAT 0.25/s
    // cannot eat a pile of thousands before it rots, so >95% of the reward
    // became Rot inside ten minutes FOR EVERY ROSTER, and the only counter-play
    // was 800 taps at 5 apiece.
    //
    // MEASURED on a 5,000-Raw inheritance, ten minutes in, with the share-based
    // Checker: 0 kept banks 0%, one banks 28%, four banks 62%, ten banks 80%.
    // That is the decision the comment in `engine.ts` always claimed — retrain
    // with Checkers and you bank it, retrain without and you watch it go.
    const withCheckers = (checker: number) => withWords(RETRAIN_MIN_WORDS, {
      minted: '4000', machines: { extractor: 0, reasoner: 0, checker },
      watched: { extractor: false },
    });
    const s = withCheckers(9);
    const after = apply(s, { type: 'retrain' });
    expect(after.machines).toEqual(s.machines);
    expect(after.watched).toEqual(s.watched);
    // Nothing is producing: the inherited pile is the only thing moving.
    const pile = num(after.raw);
    expect(pile).toBe(1000);
    const banked = (st: typeof after) => num(tick(st, 600).solid) - num(st.solid);
    expect(banked(after) / pile).toBeGreaterThan(0.7);
    // ...and a run that kept none banks none of it.
    const none = apply(withCheckers(0), { type: 'retrain' });
    expect(banked(none)).toBe(0);
    expect(num(tick(none, 600).rot)).toBeGreaterThan(pile * 0.6);
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
