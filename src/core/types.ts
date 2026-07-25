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

/** One item awaiting human review.
 *
 *  A corrupt item is NOT a garbled string — it is a real concept shown with
 *  *another real concept's definition*. That is what a hallucinated statement
 *  actually looks like, and it means spotting rot requires reading the gloss
 *  rather than looking for damage. Both strings stay verbatim licensed text;
 *  only the PAIRING is generated, which is structure, not prose.
 *
 *  `corrupt` is the truth of it. The player is never shown that flag. */
export interface ReviewItem {
  conceptIndex: number;      // resolved to a real concept by the shell, never by core
  /** Whose definition is displayed. Equals `conceptIndex` when the statement is
   *  sound; a different concept's index when it is not. */
  glossIndex: number;
  corrupt: boolean;
}

/** One slot, tied up on a piece of work until it finishes. */
export interface Booking {
  kind: 'discover' | 'review';
  until: number;   // epoch ms; compared against lastTick
  node?: number;   // for 'discover': the id the concept will land on
  /** Which position on the frontier ring this discovery occupies, 0..cap-1.
   *  Assigned at booking time and held until it lands, so discoveries are
   *  EVENLY SPACED and never overlap. Positioned by a hash instead, two of them
   *  landed on top of each other and their labels became unreadable. */
  slot?: number;
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
  // ---- the ratchet: the only things that survive a retrain ----
  /** Statements a HUMAN checked, across all generations. Never resets. Drives
   *  the one permanent multiplier in the game — which is thematically exact:
   *  what survives model collapse is precisely the material someone verified. */
  lifetimeVerified: Dec;
  /** Statements placed by hand this run. Prices the manual lane, so machine
   *  output can never inflate the cost of a hand claim. */
  handClaimed: number;
  /** Earliest `lastTick` at which the review desk will offer a new batch.
   *  Acceptance sampling has a sample RATE; without one, review is unbounded
   *  and the automated buyout becomes decorative. */
  reviewReadyAt: number;
  /** Statements you certified that were actually wrong. Counted as verified for
   *  the DISPLAYED fidelity, but subtracted from the fidelity that actually
   *  gates recovery. The number goes up; the graph doesn't. */
  falselyVerified: Dec;
  /** DEAD FIELD, kept because saves are never broken by removal. Attention is
   *  no longer a pool you spend — it is capacity you ALLOCATE. See `supervised`
   *  and `bookings`. */
  attention: number;
  /** Surveys performed this run. Retained for save compatibility. */
  surveyed: number;
  /** Slots standing-reserved to supervise extractors. A supervised extractor's
   *  output arrives VERIFIED; an unsupervised one's arrives unverified and
   *  rots. You may reserve fewer slots than you have extractors — that is the
   *  trap, and it is yours to walk into. */
  supervised: number;
  /** Temporary bookings. Each ties up one slot until `until` (epoch ms, on the
   *  same clock as `lastTick`), then completes and gives the slot back. This is
   *  what "booking your attention onto a discovery" means mechanically. */
  bookings: Booking[];
  /** The batch currently ON the desk, FROZEN INTO STATE when it is minted.
   *
   *  It must not be re-derived per render. Derived, it re-computed at 10 Hz:
   *  `corrupt` flipped under the player's eyes, `conceptIndex` walked as the
   *  graph grew, the panel wiped their verdicts every 100 ms, and the reducer
   *  then judged a fourth draw nobody had seen. The desk looked finished and
   *  was not connected to anything. A batch is a decision the game makes ONCE. */
  review: ReviewItem[];
}

export type Action =
  | { type: 'tick'; dt: number; now?: number }     // dt in SECONDS; `now` (epoch ms) advances lastTick
  | { type: 'survey' }                             // DEPRECATED (v8 verb); inert no-op
  | { type: 'discover' }                           // book a slot onto a new discovery
  | { type: 'setSupervision'; slots: number }      // reserve/release supervision slots
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
