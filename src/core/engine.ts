// The engine. ONE reducer: apply(state, action) => state — the sole place state
// changes. Pure: no DOM, no Date.now, no Math.random, no fetch.
//
// ---- THE LOOP, IN FOUR WORDS AND ONE INEQUALITY -------------------------
//
//   Words   concepts you can read now      up: arriving somewhere   down: never
//   Solid   checked facts that never rot   up: watched machines, Check, Reasoner
//                                          down: spent on a step or a machine
//   Raw     machine facts nobody checked   up: loose machines       down: rots,
//                                          or gets checked
//   Rot     facts worn out, permanently    up: Raw decaying   down: only Retrain
//
//   factsPerSecond = min(FACT_RATE × machines, WORDS_PER_FACT × Words)
//   stepCost       = 0 if you already hold the concept,
//                    else ceil(STEP_BASE × STEP_RATIO^(new concepts this run))
//
// THE JOIN IS THE POINT. You cannot extract relations about entities you do not
// hold, so machines are capped by vocabulary, and vocabulary only grows by
// WALKING THE STORY. An idle-only player flatlines in about ten minutes and the
// HUD can say exactly why. Without it the story and the idle loop are two games
// sharing a screen.
//
// Speed versus truth is one toggle per machine: watched (slower, makes Solid)
// or loose (full speed, makes Raw). There is no attention pool, no supervision
// dial, no booking queue and no review desk. See docs/ECONOMY_SRR.md.
import type { Action, GameState, MachineId, WatchedMachineId } from './types';
import { FACT_MACHINES } from './types';
import { add, sub, gte, D } from './numbers';
import Decimal from 'break_eternity.js';
import { MACHINES } from '../content/machines';
import { SEED_NODES } from '../content/seed';
import { bound } from './literacy';
import { lanes } from './starmap';

export const CURRENT_SAVE_VERSION = 17;

// ---- THE LANE JOIN -------------------------------------------------------

/** Facts per second, per fact machine, at full speed. Per-machine rates live in
 *  `content/machines.ts`; this is only the Extractor's, kept here because the
 *  HUD sentence quotes it ("your 30 Extractors could make 12.0/s"). */
export const FACT_RATE = MACHINES.extractor.rate;

/** A WATCHED machine runs at this share of its rate, and everything it makes
 *  arrives Solid. A loose one runs at 1.0 and everything it makes arrives Raw.
 *  The 45% you give up is the entire price of truth. */
export const WATCHED_RATE = 0.55;

/** Facts per second one Word supports.
 *
 *  0.8 was the first proposal and Judge 2 was right that it stops binding by
 *  Words ≈ 20 — the join has to be the live constraint for most of a run or it
 *  is decoration.
 *
 *  With FACT_RATE at 1.2 the cap binds whenever `machines > 0.125 × Words`.
 *  MEASURED headless, walking to the first Retrain (test/balance.test.ts):
 *  67% of the run word-bound, 74% for a player who also buys freely. The two
 *  sides alternate and that is the design working — for the other third the
 *  machines bind and a machine is the upgrade. What never inverts is that you
 *  cannot buy past your vocabulary. */
export const WORDS_PER_FACT = 0.15;

// ---- THE STEP ------------------------------------------------------------

/** Solid for the first new concept of a run, and the ratio each one after.
 *
 *  Indexed on CONCEPTS THIS RUN, never on depth: the shipped story caps at
 *  depth 5 (`build-story.mjs`), so every depth-indexed cost curve proposed for
 *  this economy was dead on arrival. Concepts-this-run is intact and is the
 *  thing the player is actually accumulating. */
export const STEP_BASE = 6;
export const STEP_RATIO = 1.04;

/** The FLOOR on one tap of Check, and the share of the pile a tap takes when
 *  the pile is bigger than that.
 *
 *  ⚠️ A FLAT 5 WAS EITHER A FULL-TIME JOB OR NOTHING. Early, Raw sits at about
 *  three and a tap over-runs the whole pile; at the Retrain gate the pile is in
 *  the thousands and five is a rounding error — 800 taps to clear an
 *  inheritance. Neither end is a min-max lever; one is a no-op and the other is
 *  the attention tax CLAUDE.md forbids.
 *
 *  A share is always worth the tap and never worth sitting there: 2% means
 *  thirty-five taps to halve a pile, while ONE Checker running at 0.5% a second
 *  overtakes a tapping thumb inside four seconds. So the machine is still the
 *  answer and the tap is still a garnish — which is exactly what
 *  "human-in-the-loop is never mandatory" asks for, with no cooldown, no
 *  booking and no clock. */
export const CHECK_PER_TAP = 5;
export const CHECK_TAP_SHARE = 0.02;

/** What one tap of Check would take right now. Declared here because the button
 *  has to be able to say it — a button quoting a constant the reducer does not
 *  use is how a HUD starts lying. */
export function checkTake(state: GameState): string {
  const raw = D(state.raw);
  return Decimal.min(raw, Decimal.max(D(CHECK_PER_TAP), raw.mul(CHECK_TAP_SHARE))).toString();
}

// ---- ROT -----------------------------------------------------------------

/** Share of Raw that rots per second.
 *
 *  ONE reason, and one only. The old model had Raw falling for graph size AND
 *  ancestry, and Solid falling for a third (REDRIFT), so nothing on screen had
 *  a cause the player could name. Raw now decays for exactly one reason and it
 *  is the reason VISION requires: how much of this generation descends from
 *  machine output rather than from real data. */
export const ROT_BASE = 0.002;
export const ROT_SYNTHETIC_SCALE = 3;

// ---- RETRAIN -------------------------------------------------------------

/** Words needed to Retrain.
 *
 *  ⚠️ THIS REPLACES `REFLECT_MIN_CONCEPTS = 820`, WHICH WAS UNREACHABLE. That
 *  number meant "20% of 4,096 concepts recovered" under an economy where a
 *  button minted concepts on a timer. Measured against the shipped story graph
 *  today: 4,080 of the 4,096 concepts are reachable from the seed through
 *  gated lanes (4,075 of them not already held), so the WORLD is reachable —
 *  but a single run is not, because the step cost is exponential and the
 *  vocabulary cap is linear. Walking 120 new concepts costs
 *  6 × (1.04^120 − 1) / 0.04 ≈ 16,450 Solid; walking 300 costs 2.1 million.
 *
 *  So 120 is "about 3% of the world, and roughly where a first run stops being
 *  able to afford the next step" — a plateau you can see coming, which is what
 *  VISION asks a failure state to be. It is asserted reachable by a test. */
export const RETRAIN_MIN_WORDS = 120;

/** Share of what your machines minted this run that you inherit as RAW. It was
 *  never checked, so it does not arrive checked — that is the whole prestige
 *  story: each generation starts richer and more wrong. */
const INHERIT_FRACTION = 0.25;
/** Each Retrain closes half the gap to fully synthetic ancestry. */
const SYNTHETIC_STEP = 0.5;

/** Solid a run opens with, and the one Extractor it opens with.
 *
 *  Both exist to close a softlock rather than to be generous: Words start at
 *  zero, so `factsPerSecond` starts at zero, so a player with no Solid and no
 *  machine can never earn either. START_SOLID buys the first two steps; the
 *  free Extractor means income exists from the first Word onward and can never
 *  be sold, spent or lost. */
const START_SOLID = '18';

export function initialState(): GameState {
  return {
    version: CURRENT_SAVE_VERSION,
    lastTick: 0,
    solid: START_SOLID,
    raw: '0',
    rot: '0',
    held: [...SEED_NODES],
    stepsThisRun: 0,
    machines: { extractor: 1, reasoner: 0, checker: 0 },
    // Watched is the DEFAULT, not loose. A new player has not met the toggle
    // yet — the interface is unlearned — and the default has to be the one that
    // cannot strand them: loose machines make only Raw, Raw buys nothing, and
    // the Check verb is a word they cannot read yet.
    watched: { extractor: true },
    generation: 0,
    syntheticShare: 0,
    minted: '0',
  };
}

// ---- derived truths (never stored, so they can never disagree) ------------

/** WORDS: concepts you can read now.
 *
 *  Derived from the board, so it cannot desynchronise from it. The seed is HELD
 *  and NOT readable — "visible, not readable" is the opening — so it does not
 *  count until the player arrives at one of those concepts from somewhere else.
 *  `bound()` in literacy.ts is the single definition of that rule. */
export function words(state: GameState): number {
  return bound(state).length;
}

/** Fact machines owned, by kind. The Checker is excluded deliberately: it
 *  converts facts rather than making them, and letting it raise the ceiling on
 *  production it does not perform would be a lie in the HUD's own sentence. */
export function factMachines(state: GameState): number {
  let n = 0;
  for (const id of FACT_MACHINES) n += state.machines[id];
  return n;
}

/** What your machines COULD make, at full speed, if vocabulary allowed.
 *  This is the left-hand side of the HUD's sentence. */
export function potentialPerSecond(state: GameState): number {
  let r = 0;
  for (const id of FACT_MACHINES) r += MACHINES[id].rate * state.machines[id];
  return r;
}

/** What your vocabulary supports. The right-hand side of the same sentence. */
export function vocabularySupport(state: GameState): number {
  return WORDS_PER_FACT * words(state);
}

/** Which side is binding — for the sentence, and for nothing else. */
export function bottleneck(state: GameState): 'words' | 'machines' | 'idle' {
  const p = potentialPerSecond(state);
  if (p <= 0) return 'idle';
  return vocabularySupport(state) < p ? 'words' : 'machines';
}

/** Facts per second actually produced, watched and loose together.
 *
 *  ⚠️ THE CAP IS APPLIED BEFORE THE WATCHING PENALTY, and the order matters.
 *  Capped afterwards, a vocabulary-bound player pays nothing for watching —
 *  the trade evaporates at exactly the moment the join starts binding, which is
 *  most of the game. Applied first, watching always costs 45% of the throughput
 *  the vocabulary allows, so speed-versus-truth stays a real decision at every
 *  point on the curve. */
function throughput(state: GameState): { solid: number; raw: number } {
  const potential = potentialPerSecond(state);
  if (potential <= 0) return { solid: 0, raw: 0 };
  const capped = Math.min(potential, vocabularySupport(state));
  if (capped <= 0) return { solid: 0, raw: 0 };
  const share = capped / potential; // each machine keeps its slice of the cap
  let solid = 0;
  let raw = 0;
  for (const id of FACT_MACHINES) {
    const gross = MACHINES[id].rate * state.machines[id] * share;
    // ⚠️ A MACHINE WITH NO TOGGLE IS SOUND BY CONSTRUCTION, NOT WATCHED BY
    // DEFAULT. The Reasoner derives what already follows from facts you hold,
    // so there is nothing in its output to review and it pays no penalty for
    // that — `docs/GLOSSARY.md` has said "always Solid" since it existed.
    if (!(id in state.watched)) { solid += gross; continue; }
    if (state.watched[id as WatchedMachineId]) solid += gross * WATCHED_RATE;
    else raw += gross;
  }
  return { solid, raw };
}

/** Solid per second from watched machines. */
export const solidPerSecond = (s: GameState): number => throughput(s).solid;
/** Raw per second from loose machines. */
export const rawPerSecond = (s: GameState): number => throughput(s).raw;
/** Everything the machines put on the board per second. */
export function factsPerSecond(state: GameState): number {
  const t = throughput(state);
  return t.solid + t.raw;
}

/** Share of the Raw pile the Checkers work through per second. The HITL buyout.
 *
 *  A SHARE, not an amount — see `content/machines.ts` for the measurement that
 *  forced it. It races `rotPerSecond` for the same pile, and the ratio between
 *  the two IS how much of a loose machine's output you keep. */
export function checkSharePerSecond(state: GameState): number {
  return (MACHINES.checker.checks ?? 0) * state.machines.checker;
}

/** Raw converted to Solid per second, right now, at the pile's current size.
 *  The absolute number, for anything that wants to show one. */
export function checkPerSecond(state: GameState): number {
  return checkSharePerSecond(state) * Number(state.raw);
}

/** Of everything a loose machine makes, the share that reaches Solid rather
 *  than Rot, once the pile settles. `checked / (checked + rots)`, and the whole
 *  of the watched-versus-loose decision in one number: it is 0 with no
 *  Checkers, passes WATCHED_RATE at the first one, and never reaches 1. */
export function looseYield(state: GameState): number {
  const c = checkSharePerSecond(state);
  const r = rotPerSecond(state);
  return c + r > 0 ? c / (c + r) : 0;
}

/** Share of Raw that rots per second, this generation. */
export function rotPerSecond(state: GameState): number {
  return ROT_BASE * (1 + state.syntheticShare * ROT_SYNTHETIC_SCALE);
}

/** What the next step costs, in Solid.
 *
 *  Zero for somewhere you already hold. That is not a discount — it is what
 *  makes a Retrain a sprint: everything you walked last generation is free to
 *  walk again, so the run resumes at its frontier instead of at its opening. */
export function stepCost(state: GameState, to: number): string {
  if (state.held.includes(to)) return '0';
  return D(STEP_BASE).mul(Decimal.pow(STEP_RATIO, state.stepsThisRun)).ceil().toString();
}

/** Price of the next unit of a machine, in Solid. */
export function machineCost(state: GameState, id: MachineId): string {
  const m = MACHINES[id];
  return D(m.baseCost).mul(Decimal.pow(m.costRatio, state.machines[id])).ceil().toString();
}

/** Can this lane be walked right now — is it on the board, open, and paid for?
 *
 *  Enforced in the REDUCER and not only on the button. A disabled button is a
 *  suggestion; the play probe force-clicks, and a gate that lives in the UI is
 *  a gate that does not exist. */
export function canWalk(state: GameState, to: number): boolean {
  if (!Number.isInteger(to) || to < 0) return false;
  if (!lanes(state).some((l) => l.to === to && l.state !== 'locked')) return false;
  return gte(state.solid, stepCost(state, to));
}

export function canCheck(state: GameState): boolean {
  return D(state.raw).gt(0);
}

export function canBuy(state: GameState, id: MachineId): boolean {
  return gte(state.solid, machineCost(state, id));
}

export function canRetrain(state: GameState): boolean {
  return words(state) >= RETRAIN_MIN_WORDS;
}

// ---- the reducer ---------------------------------------------------------

export function apply(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'tick': {
      const { dt } = action;
      if (!(dt > 0)) return state;
      const lastTick = action.now ?? state.lastTick + dt * 1000;

      let solid = D(state.solid);
      let raw = D(state.raw);
      let rot = D(state.rot);
      let minted = D(state.minted);

      // 1. machines produce, capped by vocabulary, split by the toggle
      const t = throughput(state);
      if (t.solid > 0) solid = solid.add(t.solid * dt);
      if (t.raw > 0) raw = raw.add(t.raw * dt);
      const made = (t.solid + t.raw) * dt;
      if (made > 0) minted = minted.add(made);

      // 2. THE PILE LEAVES TWO WAYS AT ONCE, and it is solved as one equation
      //    rather than sequenced. Checkers take a share per second and decay
      //    takes a share per second, so `raw' = −(c + r)·raw` and the two split
      //    what leaves in the ratio they run at. Doing it in two steps made the
      //    answer depend on which was applied first — a 10 Hz run and one
      //    catch-up block disagreed, and the Checker "keeping up" was really
      //    the Checker being served first.
      const c = checkSharePerSecond(state);
      const r = rotPerSecond(state);
      let converted = D(0);
      let lost = D(0);
      if (c + r > 0 && raw.gt(0)) {
        // EXPONENTIAL, not linear: the same save must settle identically at any
        // dt, and `raw × rate × dt` diverges from that for large dt (and goes
        // negative past dt = 1/rate).
        const leaving = raw.mul(1 - Math.exp(-(c + r) * dt));
        converted = leaving.mul(c / (c + r));
        lost = leaving.sub(converted);
        raw = raw.sub(leaving);
        solid = solid.add(converted);
        rot = rot.add(lost);
      }

      const moved = made > 0 || converted.gt(0) || lost.gt(0);
      if (!moved && lastTick === state.lastTick) return state;
      return {
        ...state,
        solid: solid.toString(),
        raw: raw.toString(),
        rot: rot.toString(),
        minted: minted.toString(),
        lastTick,
      };
    }

    case 'walk': {
      // THE ONLY INCOME UPGRADE IN THE GAME. Every other purchase raises a
      // ceiling you are already under.
      const { to } = action;
      if (!canWalk(state, to)) return state;
      const cost = stepCost(state, to);
      const known = state.held.includes(to);
      return {
        ...state,
        solid: sub(state.solid, cost),
        held: known ? state.held : [...state.held, to],
        // A revisit does not move the price of the next new concept. Charging
        // for ground you already covered would make Retrain a punishment.
        stepsThisRun: known ? state.stepsThisRun : state.stepsThisRun + 1,
      };
    }

    case 'check': {
      // No cooldown, no booking, no queue to mint. There is always Raw to look
      // at or there is not, and looking at it is instant.
      const take = D(checkTake(state));
      if (take.lte(0)) return state;
      return {
        ...state,
        raw: sub(state.raw, take.toString()),
        solid: add(state.solid, take.toString()),
      };
    }

    case 'buy': {
      const cost = machineCost(state, action.id);
      if (!gte(state.solid, cost)) return state;
      return {
        ...state,
        solid: sub(state.solid, cost),
        machines: { ...state.machines, [action.id]: state.machines[action.id] + 1 },
      };
    }

    case 'setWatched': {
      const id: WatchedMachineId = action.id;
      if (state.watched[id] === action.watched) return state;
      return { ...state, watched: { ...state.watched, [id]: action.watched } };
    }

    case 'retrain': {
      // Prestige = retraining on your own output. You inherit a share of what
      // your MACHINES minted — as Raw, because it never was checked — and your
      // ancestry gets that much more synthetic, which rots faster.
      if (!canRetrain(state)) return state;
      const inherited = D(state.minted).mul(INHERIT_FRACTION).floor();
      const fresh = initialState();
      return {
        ...fresh,
        // THE CONCEPTS SURVIVE. Nothing the player chose is ever deleted
        // (VISION), and free revisits are what make the next run a sprint back
        // to the frontier rather than a repeat of the opening.
        held: [...state.held],
        // ...but the step counter does not, which is the whole prestige: the
        // cost curve restarts at 6 while the vocabulary cap stays where you
        // left it.
        stepsThisRun: 0,
        // THE APPARATUS SURVIVES, AND IT HAS TO. The inheritance arrives as
        // RAW — never checked, never spendable — so the only things that can
        // claim it are a Checker and a tap, and handing back a fresh roster
        // would zero both at the exact moment the pile is biggest.
        //
        // ⚠️ KEEPING THE MACHINES WAS NOT ENOUGH ON ITS OWN. Measured on a
        // 5,000-Raw inheritance, ten minutes after the Retrain:
        //
        //     Checkers kept    0     1     4    10
        //     banked as Solid  0%   28%   62%   80%
        //
        // The first row is what shipped, for every roster, because a Checker
        // converting a FLAT 0.25/s cannot eat a pile of thousands before it
        // rots — the reward was real, arrived intact, and evaporated. The
        // Checker now takes a SHARE of the pile per second, so the split
        // between Solid and Rot is the ratio of the two rates and holds at any
        // size. That is what makes this a decision rather than a lie: retrain
        // with Checkers and you bank it, retrain without and you watch it go.
        // You keep the machines; you do not keep the Solid that bought them.
        machines: { ...state.machines },
        watched: { ...state.watched },
        raw: inherited.toString(),
        rot: '0', // the ONLY way Rot ever goes down
        generation: state.generation + 1,
        syntheticShare: state.syntheticShare + (1 - state.syntheticShare) * SYNTHETIC_STEP,
        // Never 0: a fresh clock reads as an eight-hour absence on the next
        // resume, and that is a real hazard rather than a tidiness question.
        lastTick: state.lastTick,
      };
    }
  }
}

/** SPEC sugar — there is no second entry point. */
export const tick = (s: GameState, dt: number): GameState => apply(s, { type: 'tick', dt });
