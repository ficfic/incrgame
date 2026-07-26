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
  /** DEPRECATED at v11, kept so old saves round-trip. Superseded by `edges`. */
  links: Array<[number, number]>;
  /** The real graph (v11). A line you have actually drawn. Everything else the
   *  board shows is DOTTED — a connection the dataset says is available, derived
   *  by the shell and never stored, because potential is a property of the world
   *  and not of your save. */
  edges: Edge[];
  frontier: number[];              // surveyed, unclaimed entity ids (≤ FRONTIER_CAP)
  foldedNodes: Dec;                // entity mass beyond the explicit lists
}

/** A drawn line. Subject, object, and WHICH relation — an edge finally carries
 *  data, which is the thing the owner correctly said it lacked.
 *
 *  `checked` is the whole economy in one boolean:
 *    true  — you drew it yourself, or a supervised agent did. Stable.
 *    false — an unwatched agent drew it. It ROTS: on decay the line is removed
 *            and the connection goes back to being merely dotted, which is why
 *            coverage can now fall instead of ratcheting.
 *
 *  `fake` is never shown. An unwatched agent invents connections the dataset
 *  does not contain, and they are drawn identically to real ones. Certifying one
 *  at the review desk is how `falselyVerified` gets fed: the number on screen
 *  goes up and the graph does not. */
export interface Edge {
  a: number;        // subject node id
  b: number;        // object node id
  rel: number;      // index into REL_NAMES; 0 is `is-a`
  checked: boolean;
  fake: boolean;
}

/** Relation vocabulary. Index 0 is load-bearing: it is what every pre-v11 link
 *  migrates to, and what the taxonomy backbone uses.
 *
 *  Names are the ones prof-veritas confirmed against the source, NOT the ones I
 *  guessed: WordNet's `mero_part` runs whole→part, so it is HAS-PART, not
 *  part-of, and `mero_member` is HAS-MEMBER. (`exemplifies` is deliberately
 *  absent — it is a usage register, "this word is used figuratively", not a
 *  relation between concepts, and shipping it as an edge would teach a
 *  falsehood.) */
export const REL_NAMES = [
  // 0 — WordNet hypernym → skos:broader. `a` is the NARROWER concept, so the
  // tuple reads left-to-right as a sentence: `dog is a canine`. It was stored
  // the other way round, which was invisible only because the label is
  // suppressed for rel 0 — anything rendering `label(a) REL label(b)` would
  // have printed `canine is a dog`.
  'is a',
  'has part',      // 1 — mero_part   (whole → part)
  'has member',    // 2 — mero_member (group → member)
  'made of',       // 3 — mero_substance
  // 4 — WordNet's domain_topic (Princeton's ";c" pointer, "Domain of synset —
  // TOPIC"). NOT "studied in": it shipped as that and put
  // `expressive style — studied in — language` and
  // `body of water — studied in — lake` on the board. The targets are
  // heterogeneous — sometimes a discipline (biology, law), sometimes a thing
  // (lake, ocean, animal) — because the pointer tags a SUBJECT FIELD; it does
  // not assert that anyone studies anything. "topic" is true of all 47 rows.
  // Not "subject" either: in a game about RDF that word is the first slot of a
  // triple. Not "domain": GLOSSARY reserves that for rdfs:domain.
  'topic',
  'used for',      // 5 — ConceptNet, pending the compliance conditions
  'found at',      // 6 — ConceptNet
  'causes',        // 7 — ConceptNet
] as const;

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
  kind: 'discover' | 'review' | 'connect';
  until: number;   // epoch ms; compared against lastTick
  node?: number;   // for 'discover': the id the concept will land on
  /** For 'connect': the line being drawn. Held on the booking so the edge only
   *  exists once the work finishes — you watch it fill, you do not get it on
   *  the tap. */
  edge?: Edge;
  /** The node this discovery will attach to when it lands: the concept's REAL
   *  parent. Without it the edge was wired to a hash-picked anchor, which meant
   *  the picture was a random spanning forest while SIMPLIFICATIONS S10/S14 told
   *  the player it was WordNet hypernymy. */
  parent?: number;
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
  pending: Dec;                             // UNSUPERVISED work banked while away
  /** SUPERVISED work banked while away (v10). Offline used to run every agent at
   *  full speed and bank all of it unchecked — so closing the game was a straight
   *  +82% throughput and −100% verification, and the supervision dial, which is
   *  the game's only real decision, was strictly worse than the app switcher.
   *  Away time now respects exactly the split you left set. */
  pendingClean: Dec;
  /** Fractional decay debt for DRAWN LINES (v11). Lines are whole objects but
   *  rot is a rate, so the remainder is carried here rather than rounded away.
   *  Stored, not derived, so offline catch-up and real time agree exactly and a
   *  save cannot be scummed by reloading. */
  lineRot: number;
  /** Fractional debt for lines AGENTS draw, same reason as `lineRot`. */
  lineDebt: number;
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
  // ---- v13: the bottom of the refinement ladder (docs/ECONOMY.md) ----
  /** Where Salvage draws from. Common ruins are fast and head-heavy; deep
   *  archives are slow and tail-heavy. Switchable at any time — this is an
   *  ongoing speed-versus-breadth decision, not a one-time fork you can regret
   *  permanently. */
  source: SalvageSource;
  /** Concepts you hold SALVAGED TEXT about — the passages Extraction reads.
   *
   *  ⚠️ This replaced a bare counter, and the reason is the whole point of the
   *  game. Rung 1 used to increment `resources.data` by 12, and Extraction used
   *  to mint a number of "statements" that were not statements: no subject, no
   *  predicate, no object, no referent in the dataset at all. Meanwhile a line
   *  drawn by hand minted a REAL triple over two real synsets. Two different
   *  things shared the word "statements", and one of them did not exist.
   *
   *  Now a passage is a real concept's text, and you can only extract a
   *  relation you actually hold text about — which is what relation extraction
   *  IS. Bounded, because a save is not a place to accumulate forever. */
  pool: number[];
  /** 0..1 — the share of the CURRENT token stock that came from deep archives.
   *
   *  ⚠️ This is a COMPOSITION SUMMARY, not identity. `docs/ECONOMY.md` states as
   *  a hard constraint that rungs 3 and 4 (Verified, Batches) must carry a real
   *  per-concept distribution, because "you lost 30%" and "you lost these
   *  specific rare concepts" are different games. This scalar is honest for
   *  rung 1, where tokens genuinely are an undifferentiated mass of text — and
   *  it must NOT be the pattern copied upward when Verified is built. */
  tokenTail: number;
}

/** Rung 1's fork. Real corpus types, generically named: naming a specific real
 *  product would invite a licensing conversation this project does not need. */
export type SalvageSource = 'common' | 'archive';

export type Action =
  | { type: 'tick'; dt: number; now?: number }     // dt in SECONDS; `now` (epoch ms) advances lastTick
  | { type: 'survey' }                             // DEPRECATED (v8 verb); inert no-op
  /** Book a slot onto a new discovery. `parent` is the TRUE hypernym parent of
   *  the concept about to be found, looked up by the shell and passed in as a
   *  plain integer — the engine stays pure and still knows nothing about the
   *  dataset. Omitted only if the chunk has not loaded. */
  | { type: 'discover'; parent?: number }
  /** Book a slot onto FILLING IN a dotted line. The shell picks which potential
   *  connection you tapped and hands over the finished shape; core stays pure
   *  and cannot tell a real relation from an invented one, which is exactly
   *  right — neither can the player, until they check. */
  | { type: 'connect'; edge: Edge }
  | { type: 'setSupervision'; slots: number }      // reserve/release supervision slots
  | { type: 'claimNode'; id: number }              // pay Datums, wire a frontier entity in: +1 triples
  | { type: 'manualConnect' }                      // DEPRECATED (pre-v4 verb); inert no-op
  | { type: 'buyGenerator'; id: GeneratorId }      // deducts generator.costResource
  | { type: 'refine'; from: ResourceId }           // M4: from ∈ TIER_LADDER; one tier up
  | { type: 'sell'; id: ResourceId; amount: Dec }  // M4: consumes `id`, yields `capital`
  | { type: 'reviewBatch'; keep: boolean[] }       // HITL — accept/reject the queue
  | { type: 'absorb' }                             // take banked away-work into the graph
  | { type: 'chooseOption'; eventId: string; choiceId: string }
  | { type: 'reflect' }                            // prestige = retrain on yourself
  // ---- v13: the bottom of the ladder ----
  /** Rung 1. `picks` are CONCEPT IDS the shell sampled from the real dataset —
   *  core cannot read the ontology (it is fetched, and core is pure), so the
   *  shell hands over finished data exactly as it does for `connect`. */
  | { type: 'salvage'; picks: number[] }
  /** Rung 1 → 2. `candidates` are real relations over concepts you hold
   *  passages about, already yield-limited by the shell. They arrive UNCHECKED:
   *  an extractor proposes, it does not verify. */
  | { type: 'extract'; candidates: Edge[] }
  | { type: 'setSource'; source: SalvageSource };  // where Salvage draws from

// ---- content data types (SPEC "Content data types") ----

export interface Generator {
  id: GeneratorId;
  label: string;
  baseCost: Dec;
  costRatio: number;
  costResource: ResourceId; // cost(n) = baseCost × costRatio^n of costResource
  baseRate: Dec;
  produces: ResourceId;     // output/sec of `produces`
  /** Price of the next unit in VERIFIED STATEMENTS: agentBase × agentRatio^owned.
   *  This is the live pricing since the attention economy; `baseCost`/`costRatio`
   *  above are the retired Datums-era pair, kept so the content shape is stable.
   *  Omit and the engine falls back to its own default pair. */
  agentBase?: Dec;
  agentRatio?: number;
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
  effects: { drift?: number; extraction?: number; capacity?: number; review?: number };
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
