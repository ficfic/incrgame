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

/** Provenance of the knowledge in the graph — the heart of the game (v5).
 *
 *  `resources.triples` is the TOTAL number of statements. This splits that
 *  total by how much it can be trusted:
 *    verified   = triples − unverified − drifted  (checked; full yield)
 *    unverified = machine output nobody has checked yet; it DRIFTS
 *    drifted    = statements that rotted; near-worthless, and they lie
 *
 *  Verified is derived, never stored, so the three can never disagree. */
export interface Provenance {
  unverified: Dec;
  drifted: Dec;
}

/** One item awaiting human review. `corrupt` is the truth of it; the player
 *  only ever sees the concept and its (possibly drifted) definition. */
export interface ReviewItem {
  conceptIndex: number; // resolved to a real concept by the shell, never by core
  corrupt: boolean;
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
  reflection: number;                       // prestige count = retraining generation
  graph: GraphStats;                        // derived cache of forged + balances
  forged: ForgedGraph;                      // the hand-built layer (Frontier Mining)
  // ---- v5: provenance, collapse, and the generational loop ----
  provenance: Provenance;                   // how much of the graph can be trusted
  /** 0..1 — how much of this run's inheritance descends from machine output
   *  rather than from real data. Rises every prestige and never falls. This is
   *  the number that makes the stated goal unreachable. */
  syntheticShare: number;
  lifetimeGenerated: Dec;                   // machine-minted statements THIS run
  pending: Dec;                             // work banked while away, not yet absorbed
  modifiers: Record<string, number>;         // multiplicative, set by vignette choices
  vignette: { active: string | null; seen: string[] };
}

export type Action =
  | { type: 'tick'; dt: number; now?: number }     // dt in SECONDS; `now` (epoch ms) advances lastTick
  | { type: 'survey' }                             // reveal an entity at the frontier (free; capped)
  | { type: 'claimNode'; id: number }              // pay Datums, wire a frontier entity in: +1 triples
  | { type: 'manualConnect' }                      // DEPRECATED (pre-v4 verb); inert no-op
  | { type: 'buyGenerator'; id: GeneratorId }      // deducts generator.costResource
  | { type: 'refine'; from: ResourceId }           // M4: from ∈ TIER_LADDER; one tier up
  | { type: 'sell'; id: ResourceId; amount: Dec }  // M4: consumes `id`, yields `capital`
  | { type: 'reviewBatch'; keep: boolean[] }       // HITL — accept/reject the queue
  | { type: 'absorb' }                             // take banked away-work into the graph
  | { type: 'chooseOption'; eventId: string; choiceId: string }
  | { type: 'reflect' };                           // prestige = retrain on yourself

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

/** A choose-your-own-adventure beat. PROSE FIELDS ARE OWNER-WRITTEN and ship
 *  empty until the owner fills them — the engine only ever reads the numbers
 *  (CLAUDE.md: no generated sentences, ever). */
export interface Vignette {
  id: string;
  /** Fires the first time every stated condition holds. */
  trigger: { minTriples?: number; minDrifted?: number; minGeneration?: number };
  title: string;   // ← owner
  body: string;    // ← owner
  choices: VignetteChoice[];
}

export interface VignetteChoice {
  id: string;
  label: string;   // ← owner
  /** Multiplicative modifiers applied on choice; 1 = no change. Shown to the
   *  player as generated NUMBERS, which is data, not prose. */
  effects: { drift?: number; extraction?: number; review?: number };
  flag?: string;
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
