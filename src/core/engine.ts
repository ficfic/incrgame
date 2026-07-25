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
import type { Action, GameState, GeneratorId, ResourceId, ReviewItem } from './types';
import { TIER_LADDER } from './types';
import { add, sub, gte, mul, scaleCost, D } from './numbers';
import Decimal from 'break_eternity.js';
import { ANCHOR_CAP, FRONTIER_CAP, LINK_CAP, deriveGraph, emptyForged } from './graph';
import { GENERATORS } from '../content/generators';
import { CONCEPT_BUDGET } from '../content/ontologyMeta';
import { VIGNETTES } from '../content/vignettes';
import { nextRand } from './rng';

export const CURRENT_SAVE_VERSION = 9;

// Frontier Mining knobs (Chad's term sheet; tune by playing)
const START_DATA = '15';        // enough to wire the first ~2 entities
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
const ATTENTION_BASE = 4;
const ATTENTION_PER_DECADE = 4.5;
export const DISCOVER_MS = 18_000;
export const REVIEW_BOOK_MS = 25_000;

/** Building an agent COSTS VERIFIED STATEMENTS — you distil the next one out of
 *  the graph you already trust. Which is, exactly, the setup of the paper this
 *  game is about. A graph you have let rot cannot produce new agents. */
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
export const REVIEW_COOLDOWN_MS = 45_000;

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

/** Total slots. Grows with lifetime verified knowledge: the more of the world
 *  you have actually checked, the more of it you can hold in your head. */
export function attentionCap(state: GameState): number {
  const v = D(state.lifetimeVerified).toNumber();
  return ATTENTION_BASE + Math.floor(ATTENTION_PER_DECADE * Math.log10(1 + Math.max(0, v)));
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

/** Cost of the next agent, in VERIFIED statements. */
export function agentCost(state: GameState, id: GeneratorId): string {
  return D(AGENT_BASE_COST)
    .mul(Decimal.pow(AGENT_COST_RATIO, state.generators[id]))
    .ceil().toString();
}

/** The one number that only ever goes up. Bounded, log-scaled, and fed solely
 *  by statements a human checked — so retraining is a decision rather than a
 *  strictly dominated button, and what carries you forward is exactly the
 *  material that model collapse cannot degrade. */
export function ratchet(state: GameState): number {
  const v = D(state.lifetimeVerified).toNumber();
  return 1 + RATCHET_SCALE * Math.log10(1 + Math.max(0, v));
}

/** Deterministic integer mix for anchor selection (game logic, but no state:
 *  pure function of the claimed id — replay-stable without consuming RNG). */
function mixId(id: number): number {
  let t = (id * 374761393) | 0;
  t = (t ^ (t >>> 13)) * 1274126177;
  return (t ^ (t >>> 16)) >>> 0;
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
    coverage: { general: 0 },
    reflection: 0,
    graph: deriveGraph(forged, '0'), // one lonely anchor, zero statements
    forged,
    provenance: { unverified: '0', drifted: '0' },
    syntheticShare: 0,
    lifetimeGenerated: '0',
    pending: '0',
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

/** What the ENGINE uses: the share that is verified AND actually true. Gates
 *  recovery. The player is never shown this and is never told it exists. */
export function fidelity(state: GameState): number {
  const total = D(state.resources.triples);
  if (total.lte(0)) return 1;
  const trueVerified = D(verified(state)).sub(D(state.falselyVerified));
  const f = trueVerified.lt(0) ? 0 : trueVerified.div(total).toNumber();
  return Math.max(0, Math.min(1, f));
}

/** Concepts recovered so far, clamped to the size of the dataset — the world is
 *  finite and the readout says so rather than looping past 100%. */
export function recovered(state: GameState): number {
  return Math.min(state.graph.nodes, CONCEPT_BUDGET);
}

export function coverage(state: GameState): number {
  return recovered(state) / CONCEPT_BUDGET;
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
  let rate = D(0);
  if (res === 'data') {
    for (const g of Object.values(GENERATORS)) {
      const count = state.generators[g.id];
      if (count > 0 && g.produces === 'data') rate = rate.add(D(g.baseRate).mul(count));
    }
    rate = rate
      .add(D(YIELD_VERIFIED).mul(D(verified(state)).floor()))
      .add(D(YIELD_UNVERIFIED).mul(D(state.provenance.unverified).floor()))
      .add(D(YIELD_DRIFTED).mul(D(state.provenance.drifted).floor()));
  }
  return rate.toString();
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
  // ...and coverage asymptotes to FIDELITY, not to 1. You can recover as much of
  // the world as you can be trusted about — which is this game's whole argument
  // in one expression. `1 - coverage` alone was merely exponential: it reached
  // 4095/4096 in about seven hours, so "unreachable by construction"
  // (docs/VISION.md) was simply false. This makes the ceiling the thing the
  // game is actually about, and a buyout-only player caps around half the world.
  const remaining = f > 0 ? Math.max(0, (f - coverage(state)) / f) : 0;
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

/** Draw a fresh batch. Called once, by `tick`, when the desk is empty and off
 *  cooldown; the result is frozen into state. Never call this per render. */
function mintReview(state: GameState): ReviewItem[] {
  if (!reviewReady(state)) return [];
  const unver = D(state.provenance.unverified).toNumber();
  const drift = D(state.provenance.drifted).toNumber();
  const pool = unver + drift;
  if (pool < REVIEW_MIN_POOL) return [];
  const corruptShare = pool > 0 ? drift / pool : 0;
  const items: ReviewItem[] = [];
  const used = new Set<number>();
  let seed = state.rngState;
  const span = Math.max(1, recovered(state));
  const want = Math.min(REVIEW_BATCH, Math.floor(pool), span);
  // Bounded retries: the same concept twice on one desk reads as a bug, but a
  // tiny graph genuinely may not have three distinct concepts to show.
  for (let attempt = 0; attempt < want * 12 && items.length < want; attempt++) {
    let r: number;
    [r, seed] = nextRand(seed);
    const corrupt = r < corruptShare;
    let pick: number;
    [pick, seed] = nextRand(seed);
    const conceptIndex = Math.floor(pick * span);
    if (used.has(conceptIndex)) continue;

    // A corrupt item wears SOMEONE ELSE'S definition. Reading the gloss is the
    // only way to catch it — which is the lesson, delivered as the mechanic.
    let glossIndex = conceptIndex;
    if (corrupt && span > 1) {
      let g: number;
      [g, seed] = nextRand(seed);
      glossIndex = Math.floor(g * (span - 1));
      if (glossIndex >= conceptIndex) glossIndex += 1; // never itself
    }
    used.add(conceptIndex);
    items.push({ conceptIndex, glossIndex, corrupt });
  }
  return items;
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
      if (clean.gt(0)) lifetimeVerified = lifetimeVerified.add(clean);
      const rot = unverified.mul(driftPerSecond(state) * dt);
      if (rot.gt(0)) {
        unverified = unverified.sub(rot);
        drifted = drifted.add(rot);
      }
      // Verified knowledge decays back to unchecked — but ONLY once your
      // ancestry is synthetic. Generation 1 is exactly zero here.
      const redrift = state.syntheticShare > 0
        ? D(verified(state)).mul(driftPerSecond(state) * REDRIFT_SCALE * state.syntheticShare * dt)
        : D(0);
      if (redrift.gt(0)) unverified = unverified.add(redrift);
      const auto = D(autoReviewPerSecond(state)).mul(dt);
      if (auto.gt(0)) unverified = unverified.sub(Decimal.min(auto, unverified));
      if (unverified.lt(0)) unverified = D(0);

      // Reasoners recover concepts, gated by fidelity — the plateau lives here
      let forged = state.forged;
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
      let foldedNodes = forged.foldedNodes;
      const done = bookings.filter((b) => b.until <= lastTick);
      if (done.length > 0) {
        bookings = bookings.filter((b) => b.until > lastTick);
        for (const b of done) {
          if (b.kind !== 'discover' || b.node === undefined) continue;
          const anchor = anchors[mixId(b.node) % anchors.length] ?? 0;
          anchors = [...anchors, b.node];
          links = [...links, [anchor, b.node] as [number, number]];
          while (anchors.length > ANCHOR_CAP) {
            const folded = anchors.splice(1, 1)[0]!;
            links = links.filter(([x, y]) => x !== folded && y !== folded);
            // credit the fold, or every concept past the cap is destroyed and
            // coverage stops dead at ANCHOR_CAP
            foldedNodes = add(foldedNodes, 1);
          }
          while (links.length > LINK_CAP) links.shift();
          resources = touched ? resources : { ...resources };
          resources.triples = add(resources.triples, 1);
          lifetimeVerified = lifetimeVerified.add(1);
        }
        forged = {
          ...forged, anchors, links, foldedNodes,
          frontier: bookings.map((b) => b.node ?? -1).filter((n) => n >= 0),
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
        bookings,
        graph: deriveGraph(forged, resources.triples),
        lastTick,
      };
      // Mint the next batch only when the desk is empty — the array identity
      // must stay stable while the player is looking at it.
      return next.review.length === 0 ? { ...next, review: mintReview(next) } : next;
    }

    case 'survey':
      return state; // v8 verb, retired by the attention economy

    case 'discover': {
      // Book a slot onto a discovery. It ties that slot up for a while and then
      // lands a concept you placed yourself — the only statements in the game
      // that were never machine-generated.
      if (attentionFree(state) < 1) return state;
      if (state.bookings.length >= FRONTIER_CAP) return state;
      const node = state.forged.nextId;
      const bookings = [...state.bookings, { kind: 'discover' as const, until: state.lastTick + DISCOVER_MS, node }];
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

    case 'reviewBatch': {
      // HITL. Four outcomes, and two of them are mistakes:
      //   keep a true statement    → it becomes verified (good)
      //   keep a corrupt one       → the rot stays, and now you believe it
      //   reject a corrupt one     → it is removed from the graph (good)
      //   reject a true one        → you threw away real knowledge
      const queue = state.review; // the batch the player actually saw
      if (queue.length === 0) return state;
      if (attentionFree(state) < 1) return state;
      const weight = D(reviewWeight(state)); // one inspected item stands for this many
      let unverified = D(state.provenance.unverified);
      let drifted = D(state.provenance.drifted);
      let triples = D(state.resources.triples);
      let newlyVerified = D(0);
      let falselyVerified = D(0);
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]!;
        const keep = action.keep[i] ?? true;
        if (item.corrupt) {
          const n = Decimal.min(weight, drifted);
          if (n.lt(1)) continue;
          if (!keep) {
            drifted = drifted.sub(n); triples = triples.sub(n); // caught it
          } else {
            // You certified a lie. It now counts as VERIFIED — the displayed
            // fidelity goes UP — but it is still wrong, so it keeps dragging
            // recovery. The number improves and the graph doesn't, and the game
            // never tells you why. That is the stated goal quietly not being
            // the real goal (docs/VISION.md), delivered as arithmetic.
            drifted = drifted.sub(n);
            falselyVerified = falselyVerified.add(n);
          }
        } else {
          const n = Decimal.min(weight, unverified);
          if (n.lt(1)) continue;
          unverified = unverified.sub(n);
          if (keep) newlyVerified = newlyVerified.add(n);
          else triples = triples.sub(n);
        }
      }
      const resources = { ...state.resources, triples: triples.toString() };
      return {
        ...state,
        resources,
        provenance: { unverified: unverified.toString(), drifted: drifted.toString() },
        // only HAND-checked statements feed the ratchet — that is the point
        lifetimeVerified: add(state.lifetimeVerified, newlyVerified.toString()),
        falselyVerified: add(state.falselyVerified, falselyVerified.toString()),
        rngState: advanceRng(state.rngState, queue.length * 3),
        reviewReadyAt: state.lastTick,
        bookings: [...state.bookings, { kind: 'review' as const, until: state.lastTick + REVIEW_BOOK_MS }],
        review: [], // consumed; tick mints the next one after the cooldown
        graph: deriveGraph(state.forged, resources.triples),
      };
    }

    case 'absorb': {
      // Away-work banked while the player was gone. Nothing rotted in their
      // absence; it rots from here, in front of them, where they can act.
      //
      // Absorbed in SLICES, not in one dump. Fidelity is a ratio, so tipping an
      // eight-hour bank into a small graph in one tap multiplied the denominator
      // ~100x and cost four orders of magnitude of recovery — "you never come
      // back to damage" held only in the letter. A slice at a time keeps the
      // reward a reward and leaves room to review between bites.
      const pending = D(state.pending);
      if (pending.lte(0)) return state;
      const held = D(state.resources.triples);
      const slice = Decimal.min(pending, Decimal.max(held.mul(ABSORB_SLICE), D(ABSORB_MIN)));
      const resources = { ...state.resources, triples: add(state.resources.triples, slice.toString()) };
      return {
        ...state,
        resources,
        pending: pending.sub(slice).toString(),
        provenance: {
          unverified: add(state.provenance.unverified, slice.toString()),
          drifted: state.provenance.drifted,
        },
        lifetimeGenerated: add(state.lifetimeGenerated, slice.toString()),
        graph: deriveGraph(state.forged, resources.triples),
      };
    }

    case 'chooseOption': {
      const v = VIGNETTES.find((x) => x.id === action.eventId);
      const choice = v?.choices.find((c) => c.id === action.choiceId);
      if (!v || !choice) return state;
      if (state.vignette.seen.includes(v.id)) return state;
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

    case 'reflect': {
      // Prestige = retraining on your own output. You inherit a share of what
      // your MACHINES minted — unverified, because it never was verified — and
      // your ancestry gets that much more synthetic, which rots faster.
      if (recovered(state) < REFLECT_MIN_CONCEPTS) return state;
      // Banked work counts toward what you carry forward. Dropping it silently
      // punished the player for having been away before they retrained.
      const generated = D(state.lifetimeGenerated).add(D(state.pending));
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
