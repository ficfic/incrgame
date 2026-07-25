// The engine. ONE reducer: apply(state, action) => state — the sole place state
// changes (SPEC "Engine surface"). Pure: no DOM, no Date.now, no Math.random.
import type { Action, GameState, GeneratorId, ResourceId } from './types';
import { TIER_LADDER } from './types';
import { add, sub, gte, mul, scaleCost, D } from './numbers';
import Decimal from 'break_eternity.js';
import { ANCHOR_CAP, FRONTIER_CAP, LINK_CAP, deriveGraph, emptyForged } from './graph';
import { GENERATORS } from '../content/generators';

export const CURRENT_SAVE_VERSION = 4;

// Frontier Mining knobs (Chad's term sheet; tune by playing)
const START_DATA = '15';        // enough to wire the first ~2 entities
const DRIP_PER_EDGE = '0.15';   // Datums/s per edge — a statement IS knowledge
const EDGE_BASE_COST = 5;
const EDGE_COST_RATIO = 1.08;   // gentle lane; machines keep the 1.15 wall

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
  };
}

/** Current price of the next unit of a generator: baseCost × ratio^owned. */
export function generatorCost(state: GameState, id: GeneratorId): string {
  const g = GENERATORS[id];
  return scaleCost(g.baseCost, g.costRatio, state.generators[id]);
}

/** Production per second of one resource, from generator counts × base rates —
 *  plus the edge drip for `data`: every statement in the web yields Datums
 *  (Frontier Mining). The inference multiplier arrives with Reasoners (M3),
 *  reading `resources.triples` — computed, never stored. */
export function ratePerSecond(state: GameState, res: ResourceId): string {
  let rate = D(0);
  for (const g of Object.values(GENERATORS)) {
    const count = state.generators[g.id];
    if (count > 0 && g.produces === res) rate = rate.add(D(g.baseRate).mul(count));
  }
  if (res === 'data') {
    rate = rate.add(D(DRIP_PER_EDGE).mul(D(state.resources.triples).floor()));
  }
  return rate.toString();
}

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
      const lastTick = action.now ?? state.lastTick + dt * 1000;
      if (!touched && lastTick === state.lastTick) return state;
      return { ...state, resources, lastTick };
    }

    case 'survey': {
      // Reveal an entity at the frontier — free, but the frontier is finite:
      // unclaimed discoveries pile up to a cap, then surveying idles.
      if (state.forged.frontier.length >= FRONTIER_CAP) return state;
      const forged = {
        ...state.forged,
        nextId: state.forged.nextId + 1,
        frontier: [...state.forged.frontier, state.forged.nextId],
      };
      return { ...state, forged };
    }

    case 'claimNode': {
      // Wire a frontier entity into the web: pay Datums, mint a statement.
      if (!state.forged.frontier.includes(action.id)) return state;
      const cost = claimCost(state);
      if (!gte(state.resources.data, cost)) return state;
      const anchorPool = state.forged.anchors;
      const anchor = anchorPool[mixId(action.id) % anchorPool.length] ?? 0;

      let anchors = [...anchorPool, action.id];
      let links: Array<[number, number]> = [...state.forged.links, [anchor, action.id]];
      let foldedNodes = state.forged.foldedNodes;
      // beyond the caps, the oldest hand-work folds into aggregate mass —
      // the web never shrinks, only its addressable frontier moves
      while (anchors.length > ANCHOR_CAP) {
        const folded = anchors.shift()!;
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

    case 'buyGenerator': {
      const g = GENERATORS[action.id];
      if (!g) return state;
      const cost = generatorCost(state, action.id);
      const balance = state.resources[g.costResource];
      if (!gte(balance, cost)) return state; // can't afford — reject, no partial buy
      // spending Datums no longer touches the web: knowledge isn't spent, fuel is
      return {
        ...state,
        resources: { ...state.resources, [g.costResource]: sub(balance, cost) },
        generators: { ...state.generators, [action.id]: state.generators[action.id] + 1 },
      };
    }

    case 'manualConnect':
      return state; // pre-v4 verb, kept for action-surface stability

    // M3/M4/in-vision actions — deliberately inert until their milestone.
    // They exist in the union now so saves and the action surface never shift shape.
    case 'refine':
    case 'sell':
    case 'reviewBatch':
    case 'chooseOption':
    case 'reflect':
      return state;
  }
}

/** SPEC sugar — there is no second entry point. */
export const tick = (s: GameState, dt: number): GameState => apply(s, { type: 'tick', dt });
