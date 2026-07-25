// The engine. ONE reducer: apply(state, action) => state — the sole place state
// changes (SPEC "Engine surface"). Pure: no DOM, no Date.now, no Math.random.
import type { Action, GameState, GeneratorId, ResourceId } from './types';
import { TIER_LADDER } from './types';
import { add, sub, gte, mul, scaleCost, D } from './numbers';
import { projectGraph } from './graph';
import { GENERATORS } from '../content/generators';

export const CURRENT_SAVE_VERSION = 2;

export function initialState(seed = 1): GameState {
  return {
    saveVersion: CURRENT_SAVE_VERSION,
    lastTick: 0,
    rngState: seed,
    resources: {
      data: '0', triples: '0', entities: '0',
      taxonomies: '0', ontologies: '0', twins: '0', capital: '0',
    },
    lifetimeCapital: '0',
    generators: { harvester: 0, extractor: 0, reasoner: 0, aiAgent: 0, orchestrator: 0 },
    flags: {},
    coverage: { general: 0 },
    reflection: 0,
    graph: projectGraph('0'), // a single lonely node; always = projection of triples
  };
}

/** Current price of the next unit of a generator: baseCost × ratio^owned. */
export function generatorCost(state: GameState, id: GeneratorId): string {
  const g = GENERATORS[id];
  return scaleCost(g.baseCost, g.costRatio, state.generators[id]);
}

/** Production per second of one resource, from generator counts × base rates.
 *  Multipliers (inference, reflection) arrive at M3+ — computed, never stored. */
export function ratePerSecond(state: GameState, res: ResourceId): string {
  let rate = D(0);
  for (const g of Object.values(GENERATORS)) {
    const count = state.generators[g.id];
    if (count > 0 && g.produces === res) rate = rate.add(D(g.baseRate).mul(count));
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
      // graph = exact projection of triples — production IS graph growth
      const graph = touched ? projectGraph(resources.triples) : state.graph;
      return { ...state, resources, lastTick, graph };
    }

    case 'manualConnect': {
      // You assert a triple: +1 edge, always — and in the early world nearly
      // every assertion names a new entity (see graph.ts bands), so the
      // first-30-seconds magic (1 tap = 1 new node) is preserved exactly
      // where the player is watching node-by-node.
      const triples = add(state.resources.triples, 1);
      return {
        ...state,
        resources: { ...state.resources, triples },
        graph: projectGraph(triples),
      };
    }

    case 'buyGenerator': {
      const g = GENERATORS[action.id];
      if (!g) return state;
      const cost = generatorCost(state, action.id);
      const balance = state.resources[g.costResource];
      if (!gte(balance, cost)) return state; // can't afford — reject, no partial buy
      const resources = { ...state.resources, [g.costResource]: sub(balance, cost) };
      return {
        ...state,
        resources,
        // spending triples visibly trims the web — fuel and structure are ONE
        graph: projectGraph(resources.triples),
        generators: { ...state.generators, [action.id]: state.generators[action.id] + 1 },
      };
    }

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
