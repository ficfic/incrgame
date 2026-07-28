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
import type { Action, FactMachineId, GameState, MachineId } from './types';
import { FACT_MACHINES } from './types';
import { add, sub, gte, D } from './numbers';
import Decimal from 'break_eternity.js';
import { MACHINES } from '../content/machines';
import { SEED_NODES } from '../content/seed';
import { bound } from './literacy';
import { lanes } from './starmap';

export const CURRENT_SAVE_VERSION = 16;

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
 *  is decoration. At 0.15 the cap binds whenever machines > 0.375 × Words,
 *  which is nearly always. */
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

/** Raw turned into Solid by ONE tap of Check.
 *
 *  Fixed, and fixed on purpose. Manual checking converts a constant amount per
 *  tap against production that grows with every machine and every Word, so it
 *  falls behind by construction — which is VISION's "review is the only brake
 *  and review is slow", with no cooldown, no booking and no clock. It is a
 *  min-max lever for a player who feels like tapping, never an attention tax. */
export const CHECK_PER_TAP = 5;

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
    watched: { extractor: true, reasoner: true },
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
    if (state.watched[id]) solid += gross * WATCHED_RATE;
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

/** Raw converted to Solid per second, automatically. The HITL buyout. */
export function checkPerSecond(state: GameState): number {
  return MACHINES.checker.rate * state.machines.checker;
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

      // 2. Checkers work the pile. They run before decay, so a Checker that
      //    can keep up genuinely keeps up rather than racing a rounding order.
      const converted = Decimal.min(raw, D(checkPerSecond(state) * dt));
      if (converted.gt(0)) {
        raw = raw.sub(converted);
        solid = solid.add(converted);
      }

      // 3. what nobody checked wears out. EXPONENTIAL, not linear: the same
      //    save must decay identically whether it is stepped at 10 Hz or in one
      //    catch-up block, and `raw × rate × dt` diverges from that for large
      //    dt (and goes negative past dt = 1/rate).
      const lost = raw.mul(1 - Math.exp(-rotPerSecond(state) * dt));
      if (lost.gt(0)) {
        raw = raw.sub(lost);
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
      const take = Decimal.min(D(state.raw), D(CHECK_PER_TAP));
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
      const id: FactMachineId = action.id;
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
        // claim it are a Checker and a tap. Handing back a fresh roster set
        // `checkPerSecond` to zero at the exact moment the pile was biggest:
        // at generation 1 Raw rots with a 139-second half life, so more than
        // 95% of the reward became Rot inside ten minutes and Check at 5 a tap
        // is 800 taps against a 4,000 pile. That is not a plateau you see
        // coming, it is a reward that lies. Keeping the machines makes it a
        // decision instead: retrain with Checkers and you bank it, retrain
        // without and you watch it go. You keep the machines; you do not keep
        // the Solid that bought them.
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
