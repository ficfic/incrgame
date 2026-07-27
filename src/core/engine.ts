// The engine. ONE reducer: apply(state, action) => state — the sole place state
// changes (SPEC "Engine surface"). Pure: no DOM, no Date.now, no Math.random.
//
// THE LOOP (docs/VISION.md, docs/GAME_DESIGN.md): speed versus truth.
//   Extractors mint statements fast, and everything a machine mints arrives
//   UNVERIFIED. Unverified knowledge DRIFTS into nonsense at a steady rate.
//   Drifted knowledge yields almost nothing and stalls concept recovery,
//   because Reasoners recover concepts at a rate gated by FIDELITY.
//   Review — by hand, or bought out with Orchestrators — is the only brake.
//
// So there is no losing. There is a PLATEAU: push generation up and fidelity
// falls until recovery stops. You prestige because you stalled, and what you
// inherit is your own machine output, which drifts faster. The stated goal is
// unreachable by construction, and gets further away every generation.
import type { Action, Edge, GameState, GeneratorId, ResourceId, ReviewItem, SalvageSource, Vignette, VignetteChoice } from './types';
import { TIER_LADDER } from './types';
import { add, sub, gte, mul, scaleCost, D } from './numbers';
import Decimal from 'break_eternity.js';
import { ANCHOR_CAP, EDGE_CAP, FRONTIER_CAP, LINK_CAP, deriveGraph, emptyForged } from './graph';
import { GENERATORS } from '../content/generators';
import { CONCEPT_BUDGET } from '../content/ontologyMeta';
import { VIGNETTES } from '../content/vignettes';
import { nextRand } from './rng';

export const CURRENT_SAVE_VERSION = 15;

// Frontier Mining knobs (Chad's term sheet; tune by playing)
const START_DATA = '15';        // enough to wire the first ~2 entities

/** ---- v13: rung 1 → rung 2, the bottom of docs/ECONOMY.md ----------------
 *
 *  The economy had ONE live resource. Five of the seven `ResourceId`s were
 *  written once in `initialState` and never read again, `ratePerSecond` was a
 *  stub returning '0', and the ladder in ECONOMY.md had zero lines of
 *  implementation. This is the bottom two rungs of it, built for real.
 *
 *  `data` is reused as Tokens on ECONOMY.md's own advice: it already exists in
 *  every save, is read nowhere in play, and inventing a new id would be fresh
 *  backfill surface on a save-integrity rule that has already cost a day. The
 *  id is internal; only the label is player-facing.
 *
 *  THE RULE THIS OBEYS: yield is a PERCENTAGE YOU RAISE, never a subtraction.
 *  `extraction 45%` is a stat to optimise; `lost 4,300` is a punishment. Same
 *  arithmetic, opposite game. */
const SALVAGE: Record<SalvageSource, { passages: number; tail: number }> = {
  // Head-heavy: plentiful, common, and it is the same common things over again.
  common: { passages: 12, tail: 0.12 },
  // Tail-heavy: less of it, and it is the rare material nothing else supplies.
  archive: { passages: 5, tail: 0.78 },
};

/** Passages consumed by one Extraction. A fixed batch, so the yield percentage
 *  is legible: 20 in, ~9 out, and you can watch the 45% become 52%. */
const EXTRACT_BATCH = 20;

/** ---- THE CONTEXT WINDOW ------------------------------------------------
 *
 *  Starts small enough that you meet it in the first few minutes. `ANCHOR_CAP`
 *  (240) stays as the RENDER budget — the window may never exceed it, because
 *  the board still has to draw on a phone. */
const CONTEXT_START = 16;
const CONTEXT_STEP = 4;          // concepts bought per purchase
// Repriced 2026-07-26 with the agent roster: context growth and machines draw
// on the SAME checked statements, and at 12 x1.35 the window ate everything —
// measured, the second step cost 17 against ~7 checked in the bank, so play
// froze at 20/20 for three minutes with all attention idle.
const CONTEXT_BASE_COST = 8;
const CONTEXT_COST_RATIO = 1.22;

/** How many salvaged passages you may hold. A save is not an accumulator, and
 *  an unbounded array in state is a save-size bug waiting for a long session. */
const POOL_CAP = 240;

/** Base share of a token batch that survives extraction as a statement.
 *
 *  Capped strictly below 1 by `EXTRACT_YIELD_CAP`: the climb is the fun and the
 *  ceiling is the tension. A yield that reaches 100% ends the mechanic. */
const EXTRACT_YIELD_BASE = 0.45;
const EXTRACT_YIELD_CAP = 0.92;
const EDGE_BASE_COST = 5;
const EDGE_COST_RATIO = 1.08;   // gentle lane; machines keep the 1.15 wall

// Yield per statement per second, by how much you can trust it. Verified
// knowledge is worth 7.5× drifted knowledge — that gap IS the incentive.
const YIELD_VERIFIED = '0.15';
const YIELD_UNVERIFIED = '0.10';
const YIELD_DRIFTED = '0.02';

/** Share of the unverified pool that rots per second. Scaled two ways:
 *  by how much of this generation descends from machine output (later
 *  generations rot faster), and by the SIZE of the graph — a big knowledge
 *  base is superlinearly harder to keep true, which is both real and the
 *  thing that makes the stated goal unreachable rather than merely slow. */
const DRIFT_BASE = 0.0035;
const DRIFT_SYNTHETIC_SCALE = 3;
const DRIFT_SCALE_SCALE = 0.55;

/** Attention: the human bottleneck, as a resource.
 *
 *  Both hand verbs cost it, and it refills by itself. That makes each one a
 *  real decision instead of a free tap, and it replaces the review cooldown
 *  with one legible budget: you can spend your attention on connecting or on
 *  checking, never on both at once. It refills whether you play or not, so
 *  ignoring it entirely is a valid way to play the game. */
// Capacity, not a wallet. It is never spent — it is ALLOCATED, and it comes
// back. Base capacity is small; it grows from knowledge you have actually
// verified, so it is earned by playing rather than bought from a menu.
//
// ⚠️ ATTENTION GREW 4 → 13 IN 150 SECONDS OF TAPPING. That is the whole reason
// this constant is 1 and not 4.5. A slot every ×10 of confirmed work is a rate
// the player crosses four or five times in a whole game instead of four times
// in a coffee break, and an integer step means each one is an EVENT you can
// see rather than a fraction ticking behind a floor().
export const ATTENTION_BASE = 4;
const ATTENTION_PER_DECADE = 1;
/** Unchecked work you are carrying, in decades, that costs you a slot each.
 *
 *  THE DEGRADATION, and there is exactly one — docs/MODEL.md left the trigger
 *  open and a game with three ways to lose a slot has none the player can name.
 *  It is the mirror of the growth term: confirming statements widens your
 *  attention, letting unconfirmed ones pile up narrows it again. Both read off
 *  numbers already on the HUD, so "why did I lose a slot" is answerable by
 *  looking at the screen.
 *
 *  It is a REDUCTION IN CAPACITY, never a debt: nothing is spent, nothing goes
 *  negative, and confirming the backlog gives the slot straight back. */
const ATTENTION_PENALTY_PER_DECADE = 1;
/** Below this, unchecked work is just work in progress. Above it you are
 *  hoarding. Set at about one extraction batch, so an ordinary pile-up between
 *  two confirmations costs nothing and the first slot goes at ~80 unchecked.
 *  The owner's live save sat at 161 unconfirmed against 17 confirmed, which is
 *  precisely the state this is here to make expensive. */
export const ATTENTION_PENALTY_FLOOR = 8;
// ---- THE TEMPO ------------------------------------------------------------
//
// Owner: "we need to slow the game down significantly". These were 18s / 5s /
// 7s, which at 9 slots meant a tap roughly every second and a board that
// resolved faster than it could be read. Everything here is worked in
// PARALLEL across attention slots, so the felt pace is the time divided by the
// slots you have — which is exactly why the slot count had to stop climbing.
export const DISCOVER_MS = 40_000;
export const REVIEW_BOOK_MS = 25_000;
/** Extraction is the FAST verb. Discovery is you going out and finding a thing
 *  (18s); connecting is you deciding a thing is true (7s); extraction is the
 *  machine reading what you already hold, so it is quick — but it is not free
 *  and it is not instant. It was both, briefly, and it was the only verb in the
 *  game that cost nothing, which is exactly what the owner noticed. */
export const EXTRACT_MS = 12_000;
/** Filling in a dotted line is the FAST verb. Discovery finds a thing and is
 *  slow and human-only; connecting realises a line the world already offers.
 *  Two verbs at two tempos, because one verb on one timer is a metronome. */
export const CONNECT_MS = 20_000;

/** Building an agent COSTS VERIFIED STATEMENTS — you distil the next one out of
 *  the graph you already trust. Which is, exactly, the setup of the paper this
 *  game is about. A graph you have let rot cannot produce new agents.
 *
 *  These are the FALLBACK numbers only. Each agent's real price lives in the
 *  content table (`agentBase`/`agentRatio` in content/generators.ts), because
 *  balance is data — the engine reading one hardcoded pair meant an Extractor
 *  and a Reasoner cost exactly the same despite doing entirely different jobs
 *  at entirely different rates. */
const AGENT_BASE_COST = 40;
const AGENT_COST_RATIO = 1.30;

/** Surveying is no longer free. It costs Datums, and it costs MORE while the
 *  frontier is already full of things you haven't dealt with — so the biggest
 *  button on screen stops being an infinite free tap and starts being a
 *  question: do I look for more, or finish what I already found? */
const SURVEY_BASE = 3;
const SURVEY_FRONTIER_RATIO = 1.8;
const SURVEY_PROGRESS_RATIO = 1.04;

export const REVIEW_BATCH = 3;
/** Manual review is ACCEPTANCE SAMPLING: you inspect a few items and the
 *  verdict applies to the batch they were drawn from. That is how quality
 *  control actually works at scale, and it is why hand-review stays a real
 *  lever in a graph of millions instead of a rounding error.
 *
 *  Real sampling plans also have a sample RATE. Without the cooldown below,
 *  review is unbounded — tap-spam clears the pool, the Orchestrator buyout
 *  becomes decorative, and "optional" stops being true. */
const REVIEW_SAMPLE_SHARE = 0.02;
// (There was a REVIEW_COOLDOWN_MS here asserting a 45s rate limit. It was
//  referenced nowhere. The real brake is the 25s attention BOOKING that
//  committing a review costs — which is the intended design. Removed rather
//  than left claiming something the code does not do.)

/** Automated review scales with the pool too. If it didn't, a flat rate would
 *  fall infinitely behind a proportional human and the no-babysitting guarantee
 *  would be a lie at scale. Tuned so a fully-automated player lands within
 *  ~1.5-2x of an attentive one — a tradeoff, not a requirement. */
const AUTO_REVIEW_SHARE = 0.0022;

/** Permanent multiplier from lifetime hand-verified statements. Log-scaled and
 *  bounded, the same shape as the inference multiplier in ECONOMY_MODEL. */
const RATCHET_SCALE = 0.35;

/** Share of VERIFIED statements that fall back to unverified each second,
 *  scaled by synthetic ancestry. Zero in generation 1, by construction.
 *
 *  Without this, `verified` is a stock that only ever grows, so fidelity → 1
 *  for any player and the coverage ceiling never bites: the run completes and
 *  "unreachable by construction" is false. With it, a checked fact stops being
 *  a checked fact as the corpus it was checked against becomes more synthetic —
 *  which is the one thing in this game that genuinely *is* semantic drift. */
const REDRIFT_SCALE = 0.018;
const REVIEW_MIN_POOL = 1;      // nothing to review below this
export const REFLECT_MIN_CONCEPTS = 820; // ~20% coverage: a plateau signal, not a 1.5% tease
/** One tap absorbs this share of the graph you already hold (or ABSORB_MIN,
 *  whichever is larger), so a big bank arrives over several taps. */
const ABSORB_SLICE = 0.25;
const ABSORB_MIN = 50;
const INHERIT_FRACTION = 0.25;  // of what your machines minted this run
const SYNTHETIC_STEP = 0.5;     // each prestige closes half the gap to fully synthetic
/** Lines drawn per statement minted. Well under 1: statements are the volume
 *  the machines produce, lines are the structure, and structure should always
 *  lag volume — that gap is what the player is for. */
const AGENT_LINES_PER_STATEMENT = 0.12;

/** Price of wiring in the NEXT frontier entity: ceil(5 × 1.08^handClaimed).
 *
 *  Keyed to HAND CLAIMS, never to the global statement count. Keyed to the
 *  latter, an Extractor running for two minutes priced the next hand claim at
 *  millions, and a single prestige put it past 10^400 — the one action that
 *  mints trust from nothing was being annihilated by the machines it exists to
 *  balance. */
export function claimCost(state: GameState): string {
  return D(EDGE_BASE_COST).mul(Decimal.pow(EDGE_COST_RATIO, state.handClaimed)).ceil().toString();
}

/** Datums to reveal one more candidate. Scales with the frontier you are
 *  already sitting on, and gently with how far the run has come. */
export function surveyCost(state: GameState): string {
  return D(SURVEY_BASE)
    .mul(Decimal.pow(SURVEY_FRONTIER_RATIO, state.forged.frontier.length))
    .mul(Decimal.pow(SURVEY_PROGRESS_RATIO, state.handClaimed))
    .ceil().toString();
}

/** log10 of a Decimal, WITHOUT going through a JS number.
 *
 *  `D(x).toNumber()` is `Infinity` above ~1.8e308, and this project has already
 *  seen 1e400 magnitudes. An Infinite `ratchet` makes `recoveryPerSecond`
 *  Infinite, which writes `foldedNodes: "Infinity"` into the save — and
 *  `recovered()` guards with `Number.isFinite`, so ALL accumulated folded mass
 *  becomes zero and stays zero for the rest of that save. Permanent corruption,
 *  the same class as the drift bug fixed thirty lines below, in the same file.
 *  `driftPerSecond` and `reviewWeight` already do it this way; these two did
 *  not, and inconsistent use of a Decimal library is worse than not having one. */
function decades(v: string): number {
  const d = D(v);
  return d.lte(0) ? 0 : Math.max(0, d.add(1).log10().toNumber());
}

/** Slots you have LOST to unconfirmed work, whole numbers only.
 *
 *  Named, singular and legible: the one condition in the game that takes a slot
 *  away. It reads off `provenance.unverified`, which is already on the HUD as
 *  the gap between `checked` and `statements`, so the cause of the loss is
 *  visible at the moment it happens without a new number to explain.
 *
 *  Note the floor: the first {@link ATTENTION_PENALTY_FLOOR} unchecked
 *  statements are free. A penalty that started at 1 would fire on the first
 *  extraction of a new save and read as a bug. */
export function attentionPenalty(state: GameState): number {
  const backlog = D(state.provenance.unverified);
  if (backlog.lte(ATTENTION_PENALTY_FLOOR)) return 0;
  return Math.floor(
    ATTENTION_PENALTY_PER_DECADE * decades(backlog.div(ATTENTION_PENALTY_FLOOR).toString()),
  );
}

/** Total slots. Grows with lifetime verified knowledge: the more of the world
 *  you have actually checked, the more of it you can hold in your head — and
 *  shrinks by {@link attentionPenalty} while unconfirmed work piles up. */
export function attentionCap(state: GameState): number {
  const earned = ATTENTION_BASE
    + ATTENTION_PER_DECADE * decades(state.lifetimeVerified)
    - attentionPenalty(state);
  // `capacity` is a vignette lever: a choice may trade throughput for headroom.
  // It exists because the third door of the only fork in the game used to scale
  // `review`, which multiplies the Orchestrator count, which is permanently
  // zero — so that option advertised a benefit arithmetically incapable of
  // existing while charging a real 10% extraction penalty. A choice needs a
  // lever that moves something, and capacity is the one thing this economy is
  // actually made of.
  return Math.max(1, Math.floor(earned * mod(state, 'capacity')));
}

/** How many concepts fit on the board. Never above the render budget: the
 *  window is a game rule, ANCHOR_CAP is a phone's drawing limit, and the phone
 *  wins. */
export function contextWindow(state: GameState): number {
  return Math.max(1, Math.min(ANCHOR_CAP, Math.floor(state.contextWindow)));
}

/** Concepts currently occupying the window — held ones plus work in flight, so
 *  booking four discoveries into three free slots is impossible rather than
 *  merely disappointing. */
export function contextUsed(state: GameState): number {
  return Math.min(contextWindow(state), state.forged.anchors.length);
}

/** At capacity — informational, NOT a gate. */
export function contextFull(state: GameState): boolean {
  return state.forged.anchors.length >= contextWindow(state);
}

/** THE CONCEPTS THE MODEL IS ACTUALLY HOLDING: the most recent `contextWindow`
 *  of them, plus the root, which stays as the thing you navigate by.
 *
 *  A full window used to BLOCK discovery, and that made the game circular and
 *  unwinnable: relations among held concepts run out → no proposals → no
 *  `checked` → cannot afford to grow → cannot discover → nothing to do. Measured
 *  stall at 24/24 concepts from t=135.
 *
 *  A real context window does not refuse new input. It drops the oldest. So
 *  discovery always works, older concepts fall OUT of context — still on the
 *  board, dimmed, never deleted — and growing the window means holding more of
 *  your own graph in mind at once.
 *
 *  ⚠️ WHY THE WINDOW IS A CONNECTED SLICE, NOT A TAIL.
 *
 *  It was a plain tail — the last N anchors — and that quietly broke the whole
 *  game. Anchors are appended breadth-first, so a concept's parent ALWAYS has a
 *  lower index than the concept, which means a tail of the newest N contains
 *  almost no parents. `potentialEdges` walks up from each held concept looking
 *  for an ancestor that is also held, finds nothing until it reaches the root,
 *  and proposes `X is a entity`. Measured at window 16: 2 real parents in
 *  context against 1181 spokes to `entity`. From roughly the 18th concept
 *  onward, EVERY line Extract could offer was `X is a entity` — which is both
 *  the hairball on screen and the reason nothing the player drew meant anything.
 *
 *  So the window now admits a concept together with the path that reaches it,
 *  and that path counts against the window. Same size, same honest number in
 *  the HUD, but what is held is always a connected piece of the taxonomy.
 *
 *  `parentOf` is injected because the ontology is fetched at runtime and core is
 *  pure. Without it — tests, headless — this degrades to the old tail, which is
 *  correct, merely uninteresting. */
const ANCESTOR_HOPS = 8;

export function inContext(state: GameState, parentOf?: (id: number) => number): number[] {
  const a = state.forged.anchors;
  const n = contextWindow(state);
  if (a.length <= n) return a;
  if (parentOf) return connectedSlice(a, n, parentOf);
  const tail = a.slice(a.length - n);
  return tail.includes(0) ? tail : [0, ...tail.slice(1)];
}

/** The newest concepts whose full path to the root also fits, root-ward first.
 *
 *  A chain is admitted whole or not at all: admitting the bottom half of one
 *  would put a concept in context with no held parent, which is exactly the
 *  state this function exists to prevent. */
function connectedSlice(
  anchors: readonly number[], n: number, parentOf: (id: number) => number,
): number[] {
  const onBoard = new Set(anchors);
  const resident = new Set<number>();
  const out: number[] = [];
  const admit = (id: number): void => { resident.add(id); out.push(id); };
  if (onBoard.has(0)) admit(0);

  for (let i = anchors.length - 1; i >= 0 && out.length < n; i--) {
    const id = anchors[i]!;
    if (resident.has(id)) continue;
    const chain: number[] = [];
    let cursor = id;
    for (let hops = 0; hops <= ANCESTOR_HOPS && cursor >= 0; hops++) {
      if (resident.has(cursor)) break;
      if (onBoard.has(cursor)) chain.push(cursor);
      cursor = parentOf(cursor);
    }
    if (chain.length === 0 || out.length + chain.length > n) continue;
    for (let k = chain.length - 1; k >= 0; k--) admit(chain[k]!);
  }
  // Chains rarely pack a window exactly. Rather than hand back a short window —
  // the player paid for `n` slots and the HUD says `n` — top the remainder up
  // with the newest concepts, which is the old behaviour for the leftovers only.
  for (let i = anchors.length - 1; i >= 0 && out.length < n; i--) {
    const id = anchors[i]!;
    if (!resident.has(id)) admit(id);
  }
  return out;
}

/** What the next +CONTEXT_STEP REQUIRES. A gate, not a price.
 *
 *  ⚠️ THIS USED TO BE A COST, AND THE COST WAS PAID IN A QUALITY SCORE.
 *  `growContext` added the price to `provenance.unverified`, which relabelled
 *  that many of your CONFIRMED statements as unconfirmed — so buying the one
 *  upgrade in the game dropped `checked` from 10/10 to 2/10. The owner asked
 *  "what am I supposed to check" and the honest answer was NOTHING, EVER: those
 *  unverified statements hang off no edge, confirming a dotted line is the only
 *  thing that raises `verified`, and nothing in generation 1 ever reduces
 *  `drifted`. The single upgrade permanently ratcheted the headline number down
 *  and changed nothing on the board.
 *
 *  Now it is a THRESHOLD on lifetime confirmed work, and it spends nothing.
 *  Confirm enough lines and the window widens. No number goes down, ever. */
export function contextGate(state: GameState): string {
  const grown = Math.max(0, Math.round((state.contextWindow - CONTEXT_START) / CONTEXT_STEP));
  return scaleCost(String(CONTEXT_BASE_COST), CONTEXT_COST_RATIO, grown);
}

export const contextStep = (): number => CONTEXT_STEP;

export function canGrowContext(state: GameState): boolean {
  return contextWindow(state) < ANCHOR_CAP
    && gte(state.lifetimeVerified, contextGate(state));
}

/** Slots not reserved for supervision and not currently booked on work. */
export function attentionFree(state: GameState): number {
  return Math.max(0, attentionCap(state) - state.supervised - state.bookings.length);
}

/** Agents you are running that nobody is watching. Their output is the entire
 *  source of rot in the game — you chose to have them. */
export function unsupervised(state: GameState): number {
  return Math.max(0, state.generators.extractor - state.supervised);
}

/** Cost of the next agent, in VERIFIED statements. Priced from the content
 *  table so an Extractor and a Reasoner can differ, which they must. */
export function agentCost(state: GameState, id: GeneratorId): string {
  const g = GENERATORS[id];
  return D(g.agentBase ?? AGENT_BASE_COST)
    .mul(Decimal.pow(g.agentRatio ?? AGENT_COST_RATIO, state.generators[id]))
    .ceil().toString();
}

/** The one number that only ever goes up. Bounded, log-scaled, and fed solely
 *  by statements a human checked — so retraining is a decision rather than a
 *  strictly dominated button, and what carries you forward is exactly the
 *  material that model collapse cannot degrade. */
export function ratchet(state: GameState): number {
  return 1 + RATCHET_SCALE * decades(state.lifetimeVerified);
}

/** Keep the drawn-line list inside its cap, sacrificing MACHINE guesses before
 *  anything a human drew. A plain `shift()` took the oldest, and the oldest are
 *  the player's opening lines — so once agents filled the buffer, every machine
 *  line silently deleted one of the player's, un-lighting a concept and dropping
 *  coverage for no reason the player could see. */
function trimEdges(edges: Edge[]): Edge[] {
  if (edges.length <= EDGE_CAP) return edges;
  const out = [...edges];
  while (out.length > EDGE_CAP) {
    const i = out.findIndex((e) => !e.checked);
    out.splice(i >= 0 ? i : 0, 1);
  }
  return out;
}

export function initialState(seed = 1): GameState {
  const forged = emptyForged();
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    lastTick: 0,
    rngState: seed,
    resources: {
      data: START_DATA, triples: '0', entities: '0',
      taxonomies: '0', ontologies: '0', twins: '0', capital: '0',
    },
    lifetimeCapital: '0',
    generators: { harvester: 0, extractor: 0, reasoner: 0, aiAgent: 0, orchestrator: 0 },
    flags: {},
    // Rung 1 starts at the common ruins: the fast, plentiful, head-heavy
    // default. Choosing the archives is the first real decision in the game,
    // and a decision you have already been made for is not one.
    source: 'common',
    tokenTail: SALVAGE.common.tail,
    pool: [],
    contextWindow: CONTEXT_START,
    coverage: { general: 0 },
    reflection: 0,
    graph: deriveGraph(forged, '0'), // one lonely anchor, zero statements
    forged,
    provenance: { unverified: '0', drifted: '0' },
    syntheticShare: 0,
    lifetimeGenerated: '0',
    pending: '0',
    pendingClean: '0',
    lineRot: 0,
    lineDebt: 0,
    modifiers: {},
    vignette: { active: null, seen: [] },
    lifetimeVerified: '0',
    handClaimed: 0,
    reviewReadyAt: 0,
    falselyVerified: '0',
    attention: 0,
    surveyed: 0,
    supervised: 0,
    bookings: [],
    review: [],
  };
}

// ---- derived truths (never stored, so they can never disagree) ------------

/** Statements that have been checked. verified = total − unverified − drifted. */
export function verified(state: GameState): string {
  const v = D(state.resources.triples)
    .sub(D(state.provenance.unverified))
    .sub(D(state.provenance.drifted));
  return v.lt(0) ? '0' : v.toString();
}

/** What the HUD shows: verified ÷ total.
 *
 *  Named "Fidelity" in game; the honest name is VERIFICATION COVERAGE. It is
 *  not accuracy — an unverified statement may well be true — so it is a lower
 *  bound on accuracy, never accuracy itself (docs/GLOSSARY.md, SIMPLIFICATIONS
 *  S15). And it counts statements you certified WRONGLY, which is why it can
 *  drift away from the number that actually matters. */
export function displayedFidelity(state: GameState): number {
  const total = D(state.resources.triples);
  if (total.lte(0)) return 1;
  return Math.max(0, Math.min(1, D(verified(state)).div(total).toNumber()));
}

/** Is there anything to be trusting ABOUT? A new save has zero statements and
 *  `displayedFidelity` returns 1, which the HUD showed as "100% checked" over an
 *  empty graph — vacuously true, presented as a score. */
export function hasTrust(state: GameState): boolean {
  return D(state.resources.triples).gt(0);
}

/** What the ENGINE uses: the share that is verified AND actually true. Gates
 *  recovery. The player is never shown this and is never told it exists. */
export function fidelity(state: GameState): number {
  const total = D(state.resources.triples);
  if (total.lte(0)) return 1;
  const trueVerified = D(verified(state)).sub(D(state.falselyVerified));
  const f = trueVerified.lt(0) ? 0 : trueVerified.div(total).toNumber();
  return Math.max(0, Math.min(1, f));
}

/** Nodes with at least one line actually drawn to them. A concept you have
 *  found but never connected is DARK: on the board, and not yet recovered.
 *
 *  This is the hinge of the whole design. Coverage used to count nodes, and a
 *  node only ever appeared — so coverage was a monotone ratchet and the world
 *  could be finished by tapping Discover for two and a half hours without ever
 *  buying a machine. Counting LIT concepts instead lets a rotting line drop a
 *  concept back into the dark, so the number can fall, so the stated goal is
 *  unreachable by construction rather than by hopeful tuning. */
export function lit(state: GameState): number {
  const seen = new Set<number>();
  for (const e of state.forged.edges) { seen.add(e.a); seen.add(e.b); }
  return seen.size;
}

/** Concepts recovered so far, clamped to the size of the dataset — the world is
 *  finite and the readout says so rather than looping past 100%.
 *
 *  `foldedNodes` is the aggregate mass Reasoners recover; it has no per-concept
 *  identity and never had, so it is counted as-is and only the explicit layer
 *  is gated on being lit. */
export function recovered(state: GameState): number {
  const folded = D(state.forged.foldedNodes).floor().toNumber();
  return Math.min(lit(state) + (Number.isFinite(folded) ? folded : 0), CONCEPT_BUDGET);
}

/** Lines you have drawn but nobody has checked. These are what rot. */
export function unchecked(state: GameState): number {
  let n = 0;
  for (const e of state.forged.edges) if (!e.checked) n++;
  return n;
}

export function coverage(state: GameState): number {
  return recovered(state) / CONCEPT_BUDGET;
}

/** ---- THE SECOND NUMBER --------------------------------------------------
 *
 *  Coverage measures your graph against YOUR OWN corpus: it counts what you
 *  claim to have recovered. This counts how much of that claim matches the
 *  source — the share of your lines that describe a relation the real dataset
 *  actually contains.
 *
 *  It needs no new state. `Edge.fake` has been on every edge since v11: agents
 *  running unsupervised invent links, and an invented link is precisely a
 *  disagreement with the source. So the number was always computable and was
 *  simply never shown.
 *
 *  ECONOMY.md is emphatic that this must be on screen FROM MINUTE ONE, small
 *  and unremarked, rather than revealed late. A late reveal rescores the
 *  player's progress downward — "94% was fake, you're actually at 31%" — and
 *  they would be right to call that a lie, because the optimal play before and
 *  after such a reveal are opposites. Shown from the start, nobody was lied to:
 *  the number was always there, and the reveal becomes the player working out
 *  what they have been looking at the whole time.
 *
 *  Vacuously 1 on an empty graph, so `hasTrust` gates the display exactly as it
 *  does for the first number. */
export function sourceAgreement(state: GameState): number {
  const edges = state.forged.edges;
  if (edges.length === 0) return 1;
  let real = 0;
  for (const e of edges) if (!e.fake) real++;
  return real / edges.length;
}

/** Share of a token batch that survives Extraction, as a fraction of 1.
 *  Attributable by construction: it is the base, times whatever the player has
 *  bought or chosen, held strictly under the cap. */
export function extractionYield(state: GameState): number {
  const y = EXTRACT_YIELD_BASE * mod(state, 'extraction');
  return Math.max(0, Math.min(EXTRACT_YIELD_CAP, y));
}

/** ---- EXTRACT READS WHAT YOU HOLD -------------------------------------
 *
 *  There is no passage stock and no Salvage verb. A "passage" was a middleman
 *  between two verbs — you gathered text so that you could convert text — and
 *  the owner asked what one was twice, which is the answer.
 *
 *  Extraction now reads the concepts IN CONTEXT directly. It costs nothing:
 *  it is self-limiting, because it can only propose relations that exist in the
 *  dataset and are not already drawn, and it says so when it finds none. The
 *  budget the player actually spends is ATTENTION, on confirming. */
export function canExtract(state: GameState): boolean {
  return inContext(state).length > 1;
}

/** How many relations one Extraction may propose: a share of what the model is
 *  holding. A bigger context window proposes more per tap, which is the window
 *  paying for itself in the most direct way available.
 *
 *  The shell needs this to know how many candidates to hand over and the button
 *  needs it to show the yield; both must read the SAME function or the number on
 *  screen is a lie. */
export function extractCapacity(state: GameState): number {
  return Math.max(1, Math.floor(inContext(state).length * extractionYield(state)));
}

const mod = (state: GameState, key: string): number => state.modifiers[key] ?? 1;

/** Share of the unverified pool that rots each second. */
export function driftPerSecond(state: GameState): number {
  // Decimal log10, NOT .toNumber(): past ~1.8e308 a JS number is Infinity, and
  // an Infinite drift rate rotted the whole graph in one tick, saved that state,
  // and bricked the run permanently. break_eternity exists for exactly this.
  const t = D(state.resources.triples);
  const size = t.lte(1) ? 0 : Math.max(0, t.log10().toNumber());
  return DRIFT_BASE
    * (1 + state.syntheticShare * DRIFT_SYNTHETIC_SCALE)
    * (1 + size * DRIFT_SCALE_SCALE)
    * mod(state, 'drift');
}

/** How many statements one reviewed item stands for (acceptance sampling). */
export function reviewWeight(state: GameState): string {
  const pool = D(state.provenance.unverified).add(D(state.provenance.drifted));
  const w = pool.mul(REVIEW_SAMPLE_SHARE).floor();
  return w.lt(1) ? '1' : w.toString(); // Decimal throughout: no 1e308 cliff
}

/** Current price of the next unit of a generator: baseCost × ratio^owned. */
export function generatorCost(state: GameState, id: GeneratorId): string {
  const g = GENERATORS[id];
  return scaleCost(g.baseCost, g.costRatio, state.generators[id]);
}

/** Datums per second: every statement pays, but trust decides how much. */
export function ratePerSecond(state: GameState, res: ResourceId): string {
  // Datums were deleted. Nothing reads `data`, yet this was still the largest
  // per-tick Decimal computation in the loop, run ten times a second forever.
  void res;
  void YIELD_VERIFIED; void YIELD_UNVERIFIED; void YIELD_DRIFTED;
  return '0';
}

/** Statements per second minted by machines — all of it unverified. */
export function extractionPerSecond(state: GameState): string {
  const g = GENERATORS.extractor;
  return D(g.baseRate).mul(state.generators.extractor).mul(mod(state, 'extraction')).toString();
}

/** Statements per second arriving ALREADY CHECKED, because a human slot is
 *  pointed at the agent making them. Supervised agents run slower — watching
 *  costs throughput, which is the whole trade. */
const SUPERVISED_RATE_PENALTY = 0.55;
export function supervisedPerSecond(state: GameState): string {
  const watched = Math.min(state.supervised, state.generators.extractor);
  return D(GENERATORS.extractor.baseRate)
    .mul(watched).mul(SUPERVISED_RATE_PENALTY).mul(mod(state, 'extraction')).toString();
}

/** Statements per second arriving unchecked, from agents nobody is watching. */
export function unsupervisedPerSecond(state: GameState): string {
  return D(GENERATORS.extractor.baseRate)
    .mul(unsupervised(state)).mul(mod(state, 'extraction')).toString();
}

/** Statements per second checked automatically — the HITL buyout. Orchestrators
 *  review at a worse rate-per-cost than a human, which is the whole point:
 *  manual review is a lever for tryhards, never an attention tax. */
export function autoReviewPerSecond(state: GameState): string {
  const pool = D(state.provenance.unverified);
  const share = AUTO_REVIEW_SHARE * state.generators.orchestrator * mod(state, 'review');
  // proportional, like the human sampler — plus a small floor so the very first
  // Orchestrator does something visible on a tiny graph
  const flat = D(GENERATORS.orchestrator.baseRate).mul(state.generators.orchestrator);
  return pool.mul(share).add(flat).toString();
}

/** Concepts per second recovered by Reasoners — GATED BY FIDELITY. This is the
 *  plateau: as trust falls, recovery stops, however many machines you own. */
export function recoveryPerSecond(state: GameState): number {
  if (recovered(state) >= CONCEPT_BUDGET) return 0;
  const base = D(GENERATORS.reasoner.baseRate).mul(state.generators.reasoner).toNumber();
  // SQUARED, deliberately: a graph you half-trust is worth much less than half
  // a graph you trust. Reasoning over contradictions doesn't degrade
  // gracefully, it degrades fast — which is what makes trust the real currency.
  const f = fidelity(state);
  // ...and the tail gets HARDER as trust falls, rather than hitting a wall.
  //
  // This was `(f - coverage) / f`, which is a hard ceiling: once coverage
  // exceeds fidelity the term clamps to zero and Reasoners output exactly
  // nothing, however many you own. That bricked generation 2 — prestige carries
  // coverage at 100%, so a completed run returns at coverage ~0.94 against an
  // achievable f of ~0.6, and `remaining` is 0 forever. The prestige loop was a
  // dead end that cost you your machines.
  //
  // `(1 - coverage) * f` is BYTE-IDENTICAL AT f = 1, so generation 1 keeps
  // every number already measured. Below that the total gate becomes f³: a
  // rotted graph grinds a very hard tail instead of stopping, which is the
  // actual shape of the Shumailov result — the tail goes first and gets
  // harder, it does not vanish.
  const remaining = Math.max(0, 1 - coverage(state)) * f;
  return base * f * f * remaining * ratchet(state);
}

// ---- review queue --------------------------------------------------------

/** The items currently on the review desk. A pure function of the save, so the
 *  same queue survives a reload and cannot be re-rolled by save-scumming.
 *  Corruption is drawn against the drifted share: the more rot in the graph,
 *  the more of what you are shown is nonsense. */
export function reviewReady(state: GameState): boolean {
  return state.lastTick >= state.reviewReadyAt;
}

/** What is on the desk right now. A stored array — the SAME reference across
 *  ticks — so the panel's verdicts survive longer than 100 ms. */
export function reviewQueue(state: GameState): ReviewItem[] {
  return state.review;
}


function advanceRng(seed: number, steps: number): number {
  let s = seed;
  for (let i = 0; i < steps; i++) [, s] = nextRand(s);
  return s;
}

// ---- vignettes -----------------------------------------------------------

/** The first unseen vignette whose trigger holds, or null. Pure. */
export function pendingVignette(state: GameState): string | null {
  if (state.vignette.active) return state.vignette.active;
  for (const v of VIGNETTES) {
    if (state.vignette.seen.includes(v.id)) continue;
    const t = v.trigger;
    if (t.minTriples !== undefined && !gte(state.resources.triples, String(t.minTriples))) continue;
    if (t.minDrifted !== undefined && !gte(state.provenance.drifted, String(t.minDrifted))) continue;
    if (t.minGeneration !== undefined && state.reflection < t.minGeneration) continue;
    return v.id;
  }
  return null;
}

// ---- VOCABULARY GATES ----------------------------------------------------
//
// A choice can require concepts and relation types you must already have
// discovered. The rule is one sentence and it is the whole mechanic:
//
//   A CHOICE YOU CANNOT MEET IS SHOWN AND NOT TAKEABLE. It is never hidden.
//
// Hiding it would be easier and would destroy the thing it exists for. The
// locked door is what tells the player that discovering more of the graph buys
// something other than a bigger picture — and a door that is not drawn teaches
// nothing at all. So the engine's job here is to answer "can I take this" and
// "what am I missing", and nothing else filters.

/** Concepts you have discovered — everything on the board, in or out of
 *  context. A concept that has fallen out of the context window is still a word
 *  you know; the window is about what the model is holding, not about what you
 *  have seen. */
export function knownConcepts(state: GameState): Set<number> {
  return new Set(state.forged.anchors);
}

/** Relation types you have actually drawn at least one of. Drawn, not
 *  confirmed: you have met the relation the moment it appears on your board.
 *  Requiring confirmation would gate story on a second, unrelated action. */
export function knownRels(state: GameState): Set<number> {
  return new Set(state.forged.edges.map((e) => e.rel));
}

/** What a choice still needs, or nothing. Returned rather than a bare boolean
 *  so the UI can NAME the missing words — "locked" with no reason is a dead end
 *  wearing a lock icon. */
export function missingFor(
  state: GameState, choice: VignetteChoice,
): { concepts: number[]; rels: number[] } {
  const req = choice.requires;
  if (!req) return { concepts: [], rels: [] };
  const haveConcepts = knownConcepts(state);
  const haveRels = knownRels(state);
  return {
    concepts: (req.concepts ?? []).filter((id) => !haveConcepts.has(id)),
    rels: (req.rels ?? []).filter((r) => !haveRels.has(r)),
  };
}

export function canTakeChoice(state: GameState, choice: VignetteChoice): boolean {
  const missing = missingFor(state, choice);
  return missing.concepts.length === 0 && missing.rels.length === 0;
}

/** Every choice on a vignette, each marked takeable or not.
 *
 *  ⚠️ THE SOFTLOCK GUARD, and it is why this returns the whole list rather than
 *  a filtered one. The content check guarantees every beat ships an ungated
 *  exit, but a modal with no way out is an unrecoverable save, and "the data
 *  promised" is not a thing to bet a save file on. If nothing is takeable, this
 *  opens EVERY choice rather than leaving the player staring at a wall. Failing
 *  open costs a gate being bypassed in a case that should never occur; failing
 *  closed costs the game. */
export function choicesFor(
  state: GameState, vignette: Vignette,
): Array<{ choice: VignetteChoice; takeable: boolean; missing: { concepts: number[]; rels: number[] } }> {
  const marked = vignette.choices.map((choice) => ({
    choice,
    takeable: canTakeChoice(state, choice),
    missing: missingFor(state, choice),
  }));
  if (marked.some((m) => m.takeable)) return marked;
  return marked.map((m) => ({ ...m, takeable: true }));
}

// ---- the reducer ---------------------------------------------------------

export function apply(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'tick': {
      const { dt } = action;
      if (!(dt > 0)) return state;
      let resources = state.resources;
      let touched = false;
      for (const res of TIER_LADDER) {
        const rate = ratePerSecond(state, res);
        if (rate !== '0') {
          resources = touched ? resources : { ...resources };
          resources[res] = add(resources[res], mul(rate, dt));
          touched = true;
        }
      }

      // machine output arrives unverified, drifts, and is checked back down
      let unverified = D(state.provenance.unverified);
      let drifted = D(state.provenance.drifted);
      let lifetimeGenerated = D(state.lifetimeGenerated);
      // Supervised output lands already checked; unsupervised output lands raw.
      // The split is not a tuning knob — it is exactly where the player pointed
      // their attention.
      const clean = D(supervisedPerSecond(state)).mul(dt);
      const raw = D(unsupervisedPerSecond(state)).mul(dt);
      const minted = clean.add(raw);
      if (minted.gt(0)) {
        resources = touched ? resources : { ...resources };
        resources.triples = add(resources.triples, minted.toString());
        unverified = unverified.add(raw);
        lifetimeGenerated = lifetimeGenerated.add(minted);
        touched = true;
      }
      let lifetimeVerified = D(state.lifetimeVerified);
      // Fed only by confirming a FAKE proposal now that the review desk is gone.
      let falselyVerified = D(state.falselyVerified);
      if (clean.gt(0)) lifetimeVerified = lifetimeVerified.add(clean);
      const rot = unverified.mul(driftPerSecond(state) * dt);
      if (rot.gt(0)) {
        unverified = unverified.sub(rot);
        drifted = drifted.add(rot);
      }
      // ...and the same decay UN-FILLS drawn lines. An unchecked line is one an
      // unwatched agent drew; when it rots it is simply removed, and the
      // connection goes back to being merely dotted. This is what lets coverage
      // FALL — the single change that makes the stated goal unreachable by
      // construction instead of by hopeful tuning.
      //
      // Deterministic, never random: `lineRot` accumulates the fractional debt
      // in state, so the same save always decays the same lines at the same
      // time and offline catch-up cannot diverge from real time.
      let lineRot = state.lineRot + driftPerSecond(state) * dt * unchecked(state);
      let decayed = 0;
      while (lineRot >= 1) { lineRot -= 1; decayed++; }
      // Verified knowledge decays back to unchecked — but ONLY once your
      // ancestry is synthetic. Generation 1 is exactly zero here.
      const redrift = state.syntheticShare > 0
        ? D(verified(state)).mul(driftPerSecond(state) * REDRIFT_SCALE * state.syntheticShare * dt)
        : D(0);
      if (redrift.gt(0)) unverified = unverified.add(redrift);
      const auto = D(autoReviewPerSecond(state)).mul(dt);
      if (auto.gt(0)) unverified = unverified.sub(Decimal.min(auto, unverified));
      if (unverified.lt(0)) unverified = D(0);

      // Agents draw lines as well as statements. Without this the only thing
      // that ever fills a dotted line is a human thumb, coverage is capped by
      // tap-time forever, and the no-babysitting rule in CLAUDE.md is broken.
      //
      // A watched agent's line arrives CHECKED and true. An unwatched one
      // arrives unchecked — so it rots — and a share of them are INVENTED:
      // connections the dataset does not contain, drawn identically to real
      // ones. That share is the corruption rate the review desk already uses.
      let rng = state.rngState;
      let forged = state.forged;
      const drawn = D(supervisedPerSecond(state)).add(D(unsupervisedPerSecond(state)))
        .mul(dt).mul(AGENT_LINES_PER_STATEMENT).toNumber();
      let lineDebt = state.lineDebt + (Number.isFinite(drawn) ? drawn : 0);
      if (lineDebt >= 1 && forged.anchors.length > 1) {
        const made: Edge[] = [];
        let budget = Math.min(Math.floor(lineDebt), 24); // never stall a tick
        lineDebt -= Math.floor(lineDebt);
        while (budget-- > 0) {
          let ra: number, rb: number;
          [ra, rng] = nextRand(rng);
          [rb, rng] = nextRand(rng);
          const a = forged.anchors[Math.floor(ra * forged.anchors.length)] ?? 0;
          const b = forged.anchors[Math.floor(rb * forged.anchors.length)] ?? 0;
          if (a === b) continue;
          // ALWAYS unchecked, ALWAYS an invention.
          //
          // A machine cannot know which pairs are real — the dataset lives in
          // the shell and core is pure — so every line it draws is a guess
          // between two concepts it happens to hold. Marking the supervised
          // share `checked: true` made those guesses PERMANENT and unrottable:
          // false `is a` claims between random concepts, on the board forever,
          // as the *reward for supervising*. In a game whose whole point is not
          // teaching falsehoods, that was the worst bug in the build.
          //
          // Unchecked machine lines still light a concept while they live, so
          // agents still move coverage and the no-babysitting rule holds — but
          // their contribution decays unless a human confirms it, which is the
          // thesis stated as arithmetic. Supervision governs STATEMENT
          // provenance, which is what it always did.
          made.push({ a, b, rel: 0, checked: false, fake: true });
        }
        if (made.length > 0) {
          const next = [...forged.edges];
          for (const e of made) {
            if (next.some((x) => x.a === e.a && x.b === e.b && x.rel === e.rel)) continue;
            next.push(e);
          }
          // ALIASING. `trimEdges` returns its ARGUMENT unchanged when the list
          // is under `EDGE_CAP`, so `trimmed` and `next` were the same array.
          // The old two-liner — `next.length = 0; next.push(...trimmed)` —
          // therefore emptied the array and then spread the array it had just
          // emptied, destroying EVERY edge on the board. It fired the first
          // time a machine drew a line with fewer than 512 edges present, which
          // is essentially every player with an unwatched Extractor: the whole
          // hand-drawn graph vanished in one tick, coverage with it.
          // Just assign the result. Never mutate an array a helper may alias.
          forged = { ...forged, edges: trimEdges(next) };
          touched = true;
        }
      }
      if (decayed > 0) {
        // oldest unchecked lines go first, so a line survives exactly as long as
        // it goes unexamined and no longer
        const survivors = [...forged.edges];
        let expired = 0;
        for (let n = 0; n < decayed; n++) {
          const i = survivors.findIndex((e) => !e.checked);
          if (i < 0) { lineRot = 0; break; }
          survivors.splice(i, 1);
          expired++;
        }
        if (survivors.length !== forged.edges.length) {
          forged = { ...forged, edges: survivors };
          touched = true;
        }
        // AN IGNORED PROPOSAL EXPIRES. IT DOES NOT BECOME PERMANENT DEBT.
        //
        // The statement goes with the line. Before this, a rotted proposal left
        // a `drifted` statement behind forever, and the review desk was the only
        // thing that could ever clear one — so deleting the desk turned rot into
        // an unpayable tax. Measured: play stalled at 24 concepts with `checked`
        // pinned at 18% and nothing left to propose, because 82% of the pool was
        // drifted residue nobody could touch.
        //
        // Expiring the statement also puts the relation back in the pool, so
        // Extract can propose it again. A proposal you ignored is a proposal you
        // missed, not a wound.
        if (expired > 0) {
          const back = Decimal.min(D(String(expired)), unverified);
          if (back.gt(0)) {
            unverified = unverified.sub(back);
            resources = touched ? resources : { ...resources };
            resources.triples = sub(resources.triples, back.toString());
            touched = true;
          }
        }
      }
      const gainedConcepts = recoveryPerSecond(state) * dt;
      if (gainedConcepts > 0) {
        forged = { ...forged, foldedNodes: add(forged.foldedNodes, String(gainedConcepts)) };
        touched = true;
      }

      const lastTick = action.now ?? state.lastTick + dt * 1000;

      // Bookings finish and hand their slot back. A discovery lands a concept
      // you placed yourself, so it lands VERIFIED.
      let bookings = state.bookings;
      let anchors = forged.anchors;
      let links = forged.links;
      let edges = forged.edges;
      let foldedNodes = forged.foldedNodes;
      const done = bookings.filter((b) => b.until <= lastTick);
      if (done.length > 0) {
        bookings = bookings.filter((b) => b.until > lastTick);
        for (const b of done) {
          // A finished CONNECT puts the line on the board. This is the only way
          // a line the player drew comes into existence — you watch it fill.
          if (b.kind === 'connect' && b.edge) {
            const same = (e: Edge): boolean =>
              e.a === b.edge!.a && e.b === b.edge!.b && e.rel === b.edge!.rel;
            const existing = edges.findIndex(same);
            if (!anchors.includes(b.edge.a) || !anchors.includes(b.edge.b)) continue;

            if (existing >= 0) {
              // CONFIRMING A MACHINE'S PROPOSAL.
              //
              // Extraction proposes relations UNCHECKED. Before this branch
              // existed there was no way to ever check one — nothing in the
              // engine flipped an edge from unchecked to checked — so every
              // extracted line could only rot, and extraction quietly ATE the
              // player's chance to draw that same relation by hand. A verb that
              // permanently degrades your graph, in the first minute, with no
              // way back.
              //
              // No new statement is minted: the statement already exists. What
              // changes is its provenance, from unverified to verified, which
              // is exactly what looking at something does.
              if (edges[existing]!.checked) continue; // already yours; nothing to do
              const wasFake = edges[existing]!.fake;
              const next = [...edges];
              // ⚠️ `fake` SURVIVES CONFIRMATION, and this line used to clear it.
              //
              // An unwatched machine invents connections the dataset does not
              // contain, drawn identically to real ones. Certifying one is the
              // whole satire: `checked` goes UP, the graph does not, and the
              // game never tells you. Clearing the flag laundered every lie the
              // moment you believed it.
              //
              // With the review desk deleted this is the ONLY thing feeding
              // `falselyVerified`, so the trap lives or dies on this line.
              next[existing] = { ...next[existing]!, checked: true };
              edges = next;
              unverified = unverified.sub(1);
              if (unverified.lt(0)) unverified = D('0');
              lifetimeVerified = lifetimeVerified.add(1);
              if (wasFake) falselyVerified = falselyVerified.add(1);
            } else {
              edges = [...edges, b.edge];
              edges = trimEdges(edges);
              resources = touched ? resources : { ...resources };
              resources.triples = add(resources.triples, 1);
              lifetimeVerified = lifetimeVerified.add(1);
            }
            touched = true;
            continue;
          }
          // A finished EXTRACT lands the proposals it was holding. They arrive
          // unchecked: the machine proposed, nobody has looked yet.
          if (b.kind === 'extract') {
            const landing = (b.edges ?? []).filter((c) =>
              anchors.includes(c.a) && anchors.includes(c.b)
              && !edges.some((e) => e.a === c.a && e.b === c.b && e.rel === c.rel));
            if (landing.length > 0) {
              edges = trimEdges([...edges, ...landing]);
              resources = touched ? resources : { ...resources };
              resources.triples = add(resources.triples, String(landing.length));
              unverified = unverified.add(landing.length);
              touched = true;
            }
            continue;
          }
          if (b.kind !== 'discover' || b.node === undefined) continue;
          // A discovery lands the concept DARK. It sits on the board with every
          // connection the dataset offers drawn as a dotted line, and it does
          // not count toward coverage until one of them is filled in. Wiring an
          // edge here for free is what made the world hand-completable in 2h34m
          // without ever buying a machine.
          anchors = [...anchors, b.node];
          while (anchors.length > ANCHOR_CAP) {
            // EVICT THE DARK FIRST, and never the root.
            //
            // Folding by age alone did two bad things. It threw away the
            // taxonomy: breadth-first order puts every parent at a far lower
            // index than its children, so the ancestors folded out first and
            // within ~240 discoveries the only connection any new concept could
            // offer was a spoke straight to `entity` — a 240-spoke asterisk
            // instead of a hierarchy. And it fed the coverage lie below.
            // Keeping lit concepts preserves the spine, because a lit concept
            // is one something is hanging off.
            // NEVER EVICT THE CONCEPT THAT JUST ARRIVED.
            //
            // It is dark by definition — it was appended one line above and its
            // edge cannot exist yet — so under "evict the dark first" it always
            // won its own scan and deleted itself. Measured: on a fully-lit
            // board at the cap, an 18-second Discover appended the concept,
            // evicted it in the same tick, credited nothing, and left
            // `recovered` unchanged. Hand play therefore hard-walled at
            // 240/4096 = 5.9% forever, at roughly ten minutes in, with the
            // player still tapping a button that did nothing. In-flight
            // connects then failed their both-endpoints-present guard too, so
            // the 7-second slots vanished silently as well.
            //
            // A consequence worth stating: because a dark victim was always
            // available, `victim < 0` was unreachable and the credit below was
            // dead code. Excluding the new arrival is what makes the fallback
            // reachable, which is what makes folding credit anything at all.
            // FOLD FINISHED WORK, NOT PENDING WORK.
            //
            // This preference used to be the other way round — evict the DARK
            // first — and that quietly capped the game. A concept is dark from
            // the moment you discover it until you connect it, so "dark" is not
            // junk, it is the player's in-tray. At the cap, every new discovery
            // ate one pending connection, and because only LIT folds are
            // credited, nothing was banked either. Measured over two simulated
            // hours of perfect hand play: `recovered` frozen at 241 while
            // Discover burned through 2,311 of the 4,096 concepts. The board
            // churned; the score did not move.
            //
            // A LIT concept is finished: its line is drawn, it has been counted,
            // and folding it into the aggregate loses nothing — that is exactly
            // what `foldedNodes` is for. So fold the oldest lit anchor and bank
            // it; touch the dark ones only when there is nothing else to give.
            //
            // The v11 exploit stays closed, and by the same rule as before:
            // credit follows LIT, never dark. Discover-spam produces only dark
            // anchors, so a spammer has nothing to bank and simply fills their
            // own board with unfinished work.
            //
            // (The old comment argued dark-first "preserves the spine" for the
            // taxonomy layout. That layout is gone — the board is a force
            // simulation now and position no longer encodes hypernymy, so the
            // spine argument retired with it.)
            let victim = -1;
            for (let i = 1; i < anchors.length; i++) {
              const id = anchors[i]!;
              if (id === b.node) continue;
              if (edges.some((e) => e.a === id || e.b === id)) { victim = i; break; }
            }
            // nothing finished to bank: fall back to the oldest that is not the
            // arrival, which folds uncredited exactly as a dark concept should
            if (victim < 0) victim = anchors.findIndex((id, i) => i >= 1 && id !== b.node);
            if (victim < 0) break; // nothing left that may be folded
            const folded = anchors.splice(victim, 1)[0]!;
            const wasLit = edges.some((e) => e.a === folded || e.b === folded);
            links = links.filter(([x, y]) => x !== folded && y !== folded);
            edges = edges.filter((e) => e.a !== folded && e.b !== folded);
            // CREDIT ONLY WHAT WAS LIT. Crediting every fold meant a concept
            // that arrived dark, sat dark and fell off the board still became
            // permanent coverage — so past anchor 240 pure Discover-spam
            // reached 3,856 / 4,096 with ZERO lines drawn. That is the exact
            // exploit v11 exists to close, relocated one window along.
            if (wasLit) foldedNodes = add(foldedNodes, 1);
          }
          while (links.length > LINK_CAP) links.shift();
        }
        forged = {
          ...forged, anchors, links, edges, foldedNodes,
          frontier: bookings
            .filter((b) => b.kind === 'discover')
            .map((b) => b.node ?? -1).filter((n) => n >= 0),
        };
        touched = true;
      }
      if (!touched && lastTick === state.lastTick && state.review.length > 0) return state;
      const next: GameState = {
        ...state,
        resources,
        forged,
        provenance: { unverified: unverified.toString(), drifted: drifted.toString() },
        lifetimeGenerated: lifetimeGenerated.toString(),
        lifetimeVerified: lifetimeVerified.toString(),
        falselyVerified: falselyVerified.toString(),
        bookings,
        lineRot,
        lineDebt,
        rngState: rng,
        graph: deriveGraph(forged, resources.triples),
        lastTick,
      };
      // THE REVIEW DESK IS GONE, so nothing mints a batch any more.
      //
      // It sampled an abstract statement pool and touched nothing the player
      // could see on the board — the owner's words were "review does not make
      // any sense, i got so confused". Confirming a dotted line IS the check
      // now: the same decision, on the thing you are already looking at.
      //
      // `state.review` stays in the save, permanently empty, because a saved
      // field is never removed.
      return next;
    }

    case 'survey':
      return state; // v8 verb, retired by the attention economy

    case 'discover': {
      // Book a slot onto a discovery. It ties that slot up for a while and then
      // lands a concept you placed yourself — the only statements in the game
      // that were never machine-generated.
      if (attentionFree(state) < 1) return state;
      if (state.bookings.length >= FRONTIER_CAP) return state;
      // The clock has to have started. `lastTick` is 0 in a fresh state, so a tap
      // in the frames before the first tick booked `until: 18000` — and the first
      // real tick sets lastTick to epoch-now, ~1.7e12, which is past it. The
      // discovery completed instantly, free. Tap-spam the opening and you had a
      // graph before the loop was running.
      if (state.lastTick === 0) return state;
      // The world is finite. Past the last concept, discovery was still minting
      // +1 anchor and +1 VERIFIED statement for nodes with nothing behind them —
      // an infinite faucet of the one thing the game says is scarce.
      if (state.forged.nextId >= CONCEPT_BUDGET) return state;
      const node = state.forged.nextId;
      // take the lowest free ring slot so discoveries never share a position
      const taken = new Set(state.bookings.map((b) => b.slot));
      let slot = 0;
      while (taken.has(slot) && slot < FRONTIER_CAP) slot++;
      const bookings = [
        ...state.bookings,
        {
          kind: 'discover' as const, until: state.lastTick + DISCOVER_MS, node, slot,
          parent: action.parent,
        },
      ];
      return {
        ...state,
        bookings,
        forged: {
          ...state.forged,
          nextId: node + 1,
          frontier: [...state.forged.frontier, node],
        },
      };
    }

    case 'connect': {
      // Fill in a dotted line. The shell decides WHICH potential connection was
      // tapped and hands over the finished shape — core cannot tell a real
      // relation from an invented one, and that is correct: neither can the
      // player until they check it.
      if (attentionFree(state) < 1) return state;
      if (state.lastTick === 0) return state;
      const { a, b, rel } = action.edge;
      // both ends must be on the board, and the line must not already exist or
      // already be in flight — otherwise a double-tap books the same work twice
      if (!state.forged.anchors.includes(a) || !state.forged.anchors.includes(b)) return state;
      // An UNCHECKED line may be re-drawn: that is how you confirm a relation
      // an extractor proposed. Only a line you have already checked is a no-op.
      const already = state.forged.edges.find((e) => e.a === a && e.b === b && e.rel === rel);
      if (already?.checked) return state;
      if (state.bookings.some((x) => x.edge && x.edge.a === a && x.edge.b === b && x.edge.rel === rel)) {
        return state;
      }
      return {
        ...state,
        bookings: [
          ...state.bookings,
          {
            kind: 'connect' as const,
            until: state.lastTick + CONNECT_MS,
            // A line you draw yourself is checked, by definition — you looked
            // at it. `fake` is carried through from the shell untouched.
            edge: { ...action.edge, checked: true },
          },
        ],
      };
    }

    case 'setSupervision': {
      // You may reserve fewer slots than you have agents. Everything unwatched
      // runs fast and dirty. That is the trap, and it is deliberate.
      const max = Math.min(attentionCap(state) - state.bookings.length, state.generators.extractor);
      const slots = Math.max(0, Math.min(Math.floor(action.slots), Math.max(0, max)));
      if (slots === state.supervised) return state;
      return { ...state, supervised: slots };
    }

    case 'claimNode':
      // Retired. A concept is no longer bought with a currency — it is
      // DISCOVERED by booking a slot of attention onto it (see 'discover').
      // Kept inert so the action surface and old saves never shift shape.
      return state;

    case 'absorb': {
      // Away-work banked while the player was gone. Nothing rotted in their
      // absence; it rots from here, in front of them, where they can act.
      //
      // Absorbed in SLICES, not in one dump. Fidelity is a ratio, so tipping an
      // eight-hour bank into a small graph in one tap multiplied the denominator
      // ~100x and cost four orders of magnitude of recovery — "you never come
      // back to damage" held only in the letter. A slice at a time keeps the
      // reward a reward and leaves room to review between bites.
      const dirty = D(state.pending);
      const cleanBank = D(state.pendingClean);
      const bank = dirty.add(cleanBank);
      if (bank.lte(0)) return state;
      const held = D(state.resources.triples);
      const slice = Decimal.min(bank, Decimal.max(held.mul(ABSORB_SLICE), D(ABSORB_MIN)));
      // Each slice takes the same MIX the bank holds, so absorbing in bites can
      // never reorder which half you get — you cannot take the clean statements
      // first and leave the rot for later.
      const share = slice.div(bank);
      const cleanPart = cleanBank.mul(share);
      const dirtyPart = slice.sub(cleanPart);
      const resources = { ...state.resources, triples: add(state.resources.triples, slice.toString()) };
      return {
        ...state,
        resources,
        pending: dirty.sub(dirtyPart).toString(),
        pendingClean: cleanBank.sub(cleanPart).toString(),
        provenance: {
          // only the unwatched half arrives unchecked; the supervised half was
          // checked as it was made, exactly as it would have been online
          unverified: add(state.provenance.unverified, dirtyPart.toString()),
          drifted: state.provenance.drifted,
        },
        lifetimeVerified: add(state.lifetimeVerified, cleanPart.toString()),
        lifetimeGenerated: add(state.lifetimeGenerated, slice.toString()),
        graph: deriveGraph(state.forged, resources.triples),
      };
    }

    case 'chooseOption': {
      const v = VIGNETTES.find((x) => x.id === action.eventId);
      const choice = v?.choices.find((c) => c.id === action.choiceId);
      if (!v || !choice) return state;
      if (state.vignette.seen.includes(v.id)) return state;
      // The gate, enforced HERE and not only in the UI. A disabled button is a
      // suggestion; the reducer is the rule. `choicesFor` rather than
      // `canTakeChoice` so the softlock guard applies — if the beat somehow
      // shipped with every exit gated, the reducer opens them too, and the two
      // never disagree about what is takeable.
      if (!choicesFor(state, v).find((m) => m.choice.id === choice.id)?.takeable) return state;
      const modifiers = { ...state.modifiers };
      for (const [key, value] of Object.entries(choice.effects)) {
        if (value !== undefined) modifiers[key] = (modifiers[key] ?? 1) * value;
      }
      return {
        ...state,
        modifiers,
        flags: choice.flag ? { ...state.flags, [choice.flag]: true } : state.flags,
        vignette: { active: null, seen: [...state.vignette.seen, v.id] },
      };
    }

    case 'growContext': {
      // Spends NOTHING. It is earned by confirming, not bought with trust —
      // see `contextGate` for what the old accounting did to the player.
      if (!canGrowContext(state)) return state;
      return {
        ...state,
        contextWindow: Math.min(ANCHOR_CAP, state.contextWindow + CONTEXT_STEP),
      };
    }

    case 'extract': {
      // EXTRACTION IS WORK. It books a slot and takes time like every other
      // verb, and the candidates ride on the booking so the board can show what
      // it is considering while it runs.
      //
      // It was instant and free for about an hour, which made it the only verb
      // in the game that cost nothing — a tap with no decision attached.
      if (!canExtract(state)) return state;
      if (attentionFree(state) < 1) return state;
      if (state.lastTick === 0) return state;
      if (state.bookings.some((b) => b.kind === 'extract')) return state; // one at a time
      const room = extractCapacity(state);
      if (room <= 0) return state;

      const anchors = state.forged.anchors;
      const fresh: Edge[] = [];
      for (const c of action.candidates) {
        if (fresh.length >= room) break;
        if (!anchors.includes(c.a) || !anchors.includes(c.b)) continue;
        const dup = (e: Edge): boolean => e.a === c.a && e.b === c.b && e.rel === c.rel;
        if (state.forged.edges.some(dup) || fresh.some(dup)) continue;
        // An extractor PROPOSES. Checking is a separate verb with a separate
        // cost, and collapsing the two is how a graph gets trusted for free.
        fresh.push({ ...c, checked: false });
      }
      if (fresh.length === 0) return state;

      return {
        ...state,
        bookings: [
          ...state.bookings,
          { kind: 'extract' as const, until: state.lastTick + EXTRACT_MS, edges: fresh },
        ],
      };
    }

    case 'reflect': {
      // Prestige = retraining on your own output. You inherit a share of what
      // your MACHINES minted — unverified, because it never was verified — and
      // your ancestry gets that much more synthetic, which rots faster.
      if (recovered(state) < REFLECT_MIN_CONCEPTS) return state;
      // Banked work counts toward what you carry forward. Dropping it silently
      // punished the player for having been away before they retrained.
      const generated = D(state.lifetimeGenerated).add(D(state.pending)).add(D(state.pendingClean));
      const inherited = generated.mul(INHERIT_FRACTION).floor();
      const fresh = initialState(advanceRng(state.rngState, 1));
      // COVERAGE PERSISTS. It is the north star (GAME_DESIGN, VISION) — resetting
      // it made retraining strictly dominated and left the game with no number
      // that only goes up. The hand-built overlay resets; the world you got back
      // stays got back, and `1 − coverage` makes each generation grind a harder
      // tail, which is the Shumailov result rather than a difficulty knob.
      const forged = { ...emptyForged(), foldedNodes: state.forged.foldedNodes };
      const resources = { ...fresh.resources, triples: inherited.toString() };
      return {
        ...fresh,
        resources,
        forged,
        provenance: { unverified: inherited.toString(), drifted: '0' },
        reflection: state.reflection + 1,
        syntheticShare: state.syntheticShare + (1 - state.syntheticShare) * SYNTHETIC_STEP,
        lifetimeCapital: state.lifetimeCapital,
        lifetimeVerified: state.lifetimeVerified, // the ratchet: never resets
        falselyVerified: '0',
        lastTick: state.lastTick, // never 0: a phantom 8h gap is a real hazard
        // Vignettes re-arm each generation: the same fork, offered again on worse
        // terms, IS the story. Modifiers reset with them so the choice is real.
        vignette: { active: null, seen: [] },
        // FLAGS SURVIVE. Modifiers are this generation's bargain and reset with
        // it; flags are the memory of what you chose, and a fork that cannot be
        // referenced two beats later is not a fork. They were being dropped by
        // `...fresh`, so the record of every choice died at the retrain that
        // makes the choice matter.
        flags: state.flags,
        graph: deriveGraph(forged, resources.triples),
      };
    }

    case 'buyGenerator': {
      const g = GENERATORS[action.id];
      if (!g) return state;
      // An agent is DISTILLED FROM VERIFIED KNOWLEDGE — you spend the part of
      // the graph you actually trust to build the thing that makes more of it.
      // A graph you have let rot cannot produce another agent.
      const cost = agentCost(state, action.id);
      if (!gte(verified(state), cost)) return state;
      const resources = { ...state.resources, triples: sub(state.resources.triples, cost) };
      return {
        ...state,
        resources,
        generators: { ...state.generators, [action.id]: state.generators[action.id] + 1 },
        graph: deriveGraph(state.forged, resources.triples),
      };
    }

    case 'manualConnect':
      return state; // pre-v4 verb, kept for action-surface stability

    // M4 — deliberately inert until their milestone. No `default` clause: the
    // switch must stay exhaustive so a new action can never be silently
    // swallowed (it was, once, and only a test noticed).
    case 'refine':
    case 'sell':
      return state;
  }
}

/** SPEC sugar — there is no second entry point. */
export const tick = (s: GameState, dt: number): GameState => apply(s, { type: 'tick', dt });
