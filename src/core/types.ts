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
  nodes: number; // derived display counter (bounded; renderer applies LOD)
  edges: number; // derived display counter — NEVER a balance input (2^53 ceiling)
}

/** The hand-built layer of the web (Frontier Mining, save v4).
 *  Explicit lists are bounded interaction/display state; the balance sheet is
 *  `resources.triples` (every claimed connection mints one) plus foldedNodes.
 *  Rule (logged): explicit pairs come only from player actions; machines
 *  forge into aggregates. */
export interface ForgedGraph {
  nextId: number;                  // monotonic node id; never reused
  anchors: number[];               // owned, wired-in entity ids (≤ ANCHOR_CAP)
  links: Array<[number, number]>;  // player-forged pairs (≤ LINK_CAP; oldest fold out)
  frontier: number[];              // surveyed, unclaimed entity ids (≤ FRONTIER_CAP)
  foldedNodes: Dec;                // entity mass beyond the explicit lists
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
  graph: GraphStats;                        // derived cache of forged + balances
  forged: ForgedGraph;                      // the hand-built layer (Frontier Mining)
}

export type Action =
  | { type: 'tick'; dt: number; now?: number }     // dt in SECONDS; `now` (epoch ms) advances lastTick
  | { type: 'survey' }                             // reveal an entity at the frontier (free; capped)
  | { type: 'claimNode'; id: number }              // pay Datums, wire a frontier entity in: +1 triples
  | { type: 'manualConnect' }                      // DEPRECATED (pre-v4 verb); inert no-op
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
