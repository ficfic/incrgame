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

export const CURRENT_SAVE_VERSION = 5;

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

export const REVIEW_BATCH = 3;
/** Manual review is ACCEPTANCE SAMPLING: you inspect a few items and the
 *  verdict applies to the batch they were drawn from. That is how quality
 *  control actually works at scale, and it is why hand-review stays a real
 *  lever in a graph of millions instead of a rounding error. */
const REVIEW_SAMPLE_SHARE = 0.02;
const REVIEW_MIN_POOL = 1;      // nothing to review below this
export const REFLECT_MIN_CONCEPTS = 60; // prestige is earned, not handed over
const INHERIT_FRACTION = 0.25;  // of what your machines minted this run
const SYNTHETIC_STEP = 0.5;     // each prestige closes half the gap to fully synthetic

/** Price of wiring in the NEXT frontier entity: ceil(5 × 1.08^edges). */
export function claimCost(state: GameState): string {
  const edges = D(state.resources.triples).floor();
  return D(EDGE_BASE_COST).mul(Decimal.pow(EDGE_COST_RATIO, edges)).ceil().toString();
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

/** 0..1 — the share of the graph you can actually trust. Gates recovery. */
export function fidelity(state: GameState): number {
  const total = D(state.resources.triples);
  if (total.lte(0)) return 1;
  const f = D(verified(state)).div(total).toNumber();
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
  const size = Math.max(0, Math.log10(1 + D(state.resources.triples).toNumber()));
  return DRIFT_BASE
    * (1 + state.syntheticShare * DRIFT_SYNTHETIC_SCALE)
    * (1 + size * DRIFT_SCALE_SCALE)
    * mod(state, 'drift');
}

/** How many statements one reviewed item stands for (acceptance sampling). */
export function reviewWeight(state: GameState): number {
  const pool = D(state.provenance.unverified).add(D(state.provenance.drifted)).toNumber();
  return Math.max(1, Math.floor(pool * REVIEW_SAMPLE_SHARE));
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

/** Statements per second checked automatically — the HITL buyout. Orchestrators
 *  review at a worse rate-per-cost than a human, which is the whole point:
 *  manual review is a lever for tryhards, never an attention tax. */
export function autoReviewPerSecond(state: GameState): string {
  const g = GENERATORS.orchestrator;
  return D(g.baseRate).mul(state.generators.orchestrator).mul(mod(state, 'review')).toString();
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
  // ...and the last of the world is the hardest to get back. Recovery slows as
  // coverage rises, so 100% is approached and NEVER reached. The stated goal is
  // unreachable by construction — that is the design, not a balance accident
  // (docs/VISION.md). You stop because you plateaued, and then you retrain.
  const remaining = 1 - coverage(state);
  return base * f * f * remaining;
}

// ---- review queue --------------------------------------------------------

/** The items currently on the review desk. A pure function of the save, so the
 *  same queue survives a reload and cannot be re-rolled by save-scumming.
 *  Corruption is drawn against the drifted share: the more rot in the graph,
 *  the more of what you are shown is nonsense. */
export function reviewQueue(state: GameState): ReviewItem[] {
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
  for (let attempt = 0; attempt < want * 8 && items.length < want; attempt++) {
    let r: number;
    [r, seed] = nextRand(seed);
    const corrupt = r < corruptShare;
    let pick: number;
    [pick, seed] = nextRand(seed);
    const conceptIndex = Math.floor(pick * span);
    if (used.has(conceptIndex)) continue;
    used.add(conceptIndex);
    items.push({ conceptIndex, corrupt });
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
      const minted = D(extractionPerSecond(state)).mul(dt);
      if (minted.gt(0)) {
        resources = touched ? resources : { ...resources };
        resources.triples = add(resources.triples, minted.toString());
        unverified = unverified.add(minted);
        lifetimeGenerated = lifetimeGenerated.add(minted);
        touched = true;
      }
      const rot = unverified.mul(driftPerSecond(state) * dt);
      if (rot.gt(0)) {
        unverified = unverified.sub(rot);
        drifted = drifted.add(rot);
      }
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
      if (!touched && lastTick === state.lastTick) return state;
      return {
        ...state,
        resources,
        forged,
        provenance: { unverified: unverified.toString(), drifted: drifted.toString() },
        lifetimeGenerated: lifetimeGenerated.toString(),
        graph: deriveGraph(forged, resources.triples),
        lastTick,
      };
    }

    case 'survey': {
      if (state.forged.frontier.length >= FRONTIER_CAP) return state;
      const forged = {
        ...state.forged,
        nextId: state.forged.nextId + 1,
        frontier: [...state.forged.frontier, state.forged.nextId],
      };
      return { ...state, forged };
    }

    case 'claimNode': {
      // Wiring a concept in BY HAND mints a verified statement — the one kind
      // of knowledge in this game that was never machine-generated.
      if (!state.forged.frontier.includes(action.id)) return state;
      const cost = claimCost(state);
      if (!gte(state.resources.data, cost)) return state;
      const anchorPool = state.forged.anchors;
      const anchor = anchorPool[mixId(action.id) % anchorPool.length] ?? 0;

      let anchors = [...anchorPool, action.id];
      let links: Array<[number, number]> = [...state.forged.links, [anchor, action.id]];
      let foldedNodes = state.forged.foldedNodes;
      // Beyond the caps the oldest hand-work folds into aggregate mass. Node 0
      // is `entity`, the root the whole premise rests on — it NEVER folds.
      while (anchors.length > ANCHOR_CAP) {
        const folded = anchors.splice(1, 1)[0]!;
        links = links.filter(([a, b]) => a !== folded && b !== folded);
        foldedNodes = add(foldedNodes, 1);
      }
      while (links.length > LINK_CAP) links.shift();

      const resources = {
        ...state.resources,
        data: sub(state.resources.data, cost),
        triples: add(state.resources.triples, 1),
      };
      const forged = {
        ...state.forged,
        anchors,
        links,
        foldedNodes,
        frontier: state.forged.frontier.filter((f) => f !== action.id),
      };
      return { ...state, resources, forged, graph: deriveGraph(forged, resources.triples) };
    }

    case 'reviewBatch': {
      // HITL. Four outcomes, and two of them are mistakes:
      //   keep a true statement    → it becomes verified (good)
      //   keep a corrupt one       → the rot stays, and now you believe it
      //   reject a corrupt one     → it is removed from the graph (good)
      //   reject a true one        → you threw away real knowledge
      const queue = reviewQueue(state);
      if (queue.length === 0) return state;
      const weight = reviewWeight(state); // one inspected item stands for this many
      let unverified = D(state.provenance.unverified);
      let drifted = D(state.provenance.drifted);
      let triples = D(state.resources.triples);
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i]!;
        const keep = action.keep[i] ?? true;
        if (item.corrupt) {
          const n = Decimal.min(weight, drifted);
          if (n.lt(1)) continue;
          if (!keep) { drifted = drifted.sub(n); triples = triples.sub(n); }
        } else {
          const n = Decimal.min(weight, unverified);
          if (n.lt(1)) continue;
          unverified = unverified.sub(n);
          if (!keep) triples = triples.sub(n);
        }
      }
      const resources = { ...state.resources, triples: triples.toString() };
      return {
        ...state,
        resources,
        provenance: { unverified: unverified.toString(), drifted: drifted.toString() },
        rngState: advanceRng(state.rngState, queue.length * 2),
        graph: deriveGraph(state.forged, resources.triples),
      };
    }

    case 'absorb': {
      // Away-work banked while the player was gone. Nothing rotted in their
      // absence; it rots from here, in front of them, where they can act.
      const pending = D(state.pending);
      if (pending.lte(0)) return state;
      const resources = { ...state.resources, triples: add(state.resources.triples, state.pending) };
      return {
        ...state,
        resources,
        pending: '0',
        provenance: {
          unverified: add(state.provenance.unverified, state.pending),
          drifted: state.provenance.drifted,
        },
        lifetimeGenerated: add(state.lifetimeGenerated, state.pending),
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
      const inherited = D(state.lifetimeGenerated).mul(INHERIT_FRACTION).floor();
      const fresh = initialState(advanceRng(state.rngState, 1));
      const forged = emptyForged();
      const resources = { ...fresh.resources, triples: inherited.toString() };
      return {
        ...fresh,
        resources,
        forged,
        provenance: { unverified: inherited.toString(), drifted: '0' },
        reflection: state.reflection + 1,
        syntheticShare: state.syntheticShare + (1 - state.syntheticShare) * SYNTHETIC_STEP,
        lifetimeCapital: state.lifetimeCapital,
        vignette: { active: null, seen: state.vignette.seen },
        graph: deriveGraph(forged, resources.triples),
      };
    }

    case 'buyGenerator': {
      const g = GENERATORS[action.id];
      if (!g) return state;
      const cost = generatorCost(state, action.id);
      const balance = state.resources[g.costResource];
      if (!gte(balance, cost)) return state; // can't afford — reject, no partial buy
      // spending Datums never touches the web: knowledge isn't spent, fuel is
      return {
        ...state,
        resources: { ...state.resources, [g.costResource]: sub(balance, cost) },
        generators: { ...state.generators, [action.id]: state.generators[action.id] + 1 },
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
