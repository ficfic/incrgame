// The engine's type contract. Source of record: docs/SPEC.md — if this file
// and SPEC disagree, SPEC wins (or SPEC gets a deliberate, logged change).

export type Dec = string; // break_eternity Decimal serialized as string (NOT JSON-native)

export type ResourceId =
  | 'data' | 'triples' | 'entities' | 'taxonomies' | 'ontologies' | 'twins' // the ladder
  | 'capital'; // hard currency

export type GeneratorId = 'harvester' | 'extractor' | 'reasoner' | 'aiAgent' | 'orchestrator';

export type DomainId = 'general'; // seed value; domain tech-tree is in-vision but the type must exist

// The ordered refinement ladder (data → … → twins). capital is NOT on it.
export const TIER_LADDER: ResourceId[] = [
  'data', 'triples', 'entities', 'taxonomies', 'ontologies', 'twins',
];

export interface GraphStats {
  nodes: number; // knowledge-graph nodes (true count; renderer applies LOD)
  edges: number; // edges — the M3 inference multiplier's input, so it lives in state
}

export interface GameState {
  saveVersion: number;                      // the ONE version authority; starts at 1
  lastTick: number;                         // epoch ms of last processed tick
  rngState: number;                         // mulberry32 seed/state
  resources: Record<ResourceId, Dec>;       // current balances
  lifetimeCapital: Dec;                     // total $ ever earned — the prestige anchor
  generators: Record<GeneratorId, number>;  // owned counts (integers)
  flags: Record<string, boolean>;           // narrative/unlock/event flags
  coverage: Record<DomainId, number>;       // 0..1 per domain (persists across prestige)
  reflection: number;                       // prestige multiplier level (persists)
  graph: GraphStats;                        // grows via connect (M1) and extraction (M3)
}

export type Action =
  | { type: 'tick'; dt: number; now?: number }     // dt in SECONDS; `now` (epoch ms) advances lastTick
  | { type: 'manualConnect' }                      // M1: +1 `data` per action (+ graph growth)
  | { type: 'buyGenerator'; id: GeneratorId }      // deducts generator.costResource
  | { type: 'refine'; from: ResourceId }           // M4: from ∈ TIER_LADDER; one tier up
  | { type: 'sell'; id: ResourceId; amount: Dec }  // M4: consumes `id`, yields `capital`
  | { type: 'reviewBatch'; keep: boolean[] }       // HITL (in-vision)
  | { type: 'chooseOption'; eventId: string; choiceId: string }
  | { type: 'reflect' };                           // prestige

// ---- content data types (SPEC "Content data types") ----

export interface Generator {
  id: GeneratorId;
  label: string;
  baseCost: Dec;
  costRatio: number;
  costResource: ResourceId; // cost(n) = baseCost × costRatio^n of costResource
  baseRate: Dec;
  produces: ResourceId;     // output/sec of `produces`
}

export interface Refinement {
  from: ResourceId;
  to: ResourceId;
  ratio: number; // `ratio` of `from` → 1 `to`
}

export interface FieldNote {
  id: string;
  gameTerm: string;
  realTerm: string;
  glossaryRef: string;
  oneLineTruth: string;
  simplificationLabel?: string;
  learnMore?: string;
}
