// The engine's type contract.
//
// ---- FOUR QUANTITIES, AND NOTHING ELSE ----------------------------------
//
// This file used to declare about twelve player-facing nouns: a six-rung
// resource ladder, a provenance split, an attention pool, a booking queue, a
// review desk, a context window and a forged-graph overlay. The owner called
// the economy confusing twice in two days, and an 11-agent review found the
// model was never the problem — the NAMES were (`docs/ECONOMY_SRR.md`).
//
// What a save holds now:
//
//   Words   concepts you can read now      derived from `held`; never falls
//   Solid   checked facts that never rot   `solid`
//   Raw     machine facts nobody checked   `raw`
//   Rot     facts worn out, permanently    `rot`
//
// Solid, Raw and Rot are ONE SUBSTANCE IN THREE STATES, which is why they are
// three sibling Decimals and not three unrelated systems: everything that
// leaves one arrives in another.
export type Dec = string; // break_eternity Decimal serialized as string (NOT JSON-native)

/** The machines. Three, each a card with a count on it.
 *
 *  `harvester`, `aiAgent` and `orchestrator` are gone (ECONOMY_SRR §5): the
 *  first made a currency that no longer exists, the second was a bigger copy of
 *  the Extractor, and the third bought review — which is now the Checker under
 *  a name that says what it does. */
export type MachineId = 'extractor' | 'reasoner' | 'checker';

/** The machines that MAKE facts, and therefore carry the watched/loose toggle.
 *
 *  The Checker converts facts rather than making them, so it has no toggle —
 *  and it must not count toward the vocabulary join either, or buying one would
 *  raise the ceiling on production it does not perform. */
export type FactMachineId = 'extractor' | 'reasoner';

export const FACT_MACHINES: FactMachineId[] = ['extractor', 'reasoner'];
export const MACHINE_IDS: MachineId[] = ['extractor', 'reasoner', 'checker'];

/** A line between two concepts, for DRAWING ONLY.
 *
 *  ⚠️ NO SAVE HOLDS ONE OF THESE ANY MORE. Facts are a mass in three states, not
 *  a list of objects — `Edge.checked` was one of the four things the word
 *  "checked" meant, and `Edge.fake` was the other half of the trap. What is
 *  left is the shape the renderer needs to draw a relation the DATASET offers
 *  between two concepts the player holds. It is derived from the ontology every
 *  frame and stored nowhere. */
export interface Edge {
  a: number;    // subject node id
  b: number;    // object node id
  rel: number;  // index into REL_NAMES; 0 is `is-a`
}

/** Relation vocabulary. Index 0 is load-bearing: it is the taxonomy backbone
 *  and the default for any choice that does not name a relation.
 *
 *  Names are the ones prof-veritas confirmed against the source, NOT the ones I
 *  guessed: WordNet's `mero_part` runs whole→part, so it is HAS-PART, not
 *  part-of, and `mero_member` is HAS-MEMBER. (`exemplifies` is deliberately
 *  absent — it is a usage register, "this word is used figuratively", not a
 *  relation between concepts, and shipping it as an edge would teach a
 *  falsehood.) */
export const REL_NAMES = [
  // 0 — WordNet hypernym → skos:broader. `a` is the NARROWER concept, so the
  // tuple reads left-to-right as a sentence: `dog is a canine`.
  'is a',
  'has part',      // 1 — mero_part   (whole → part)
  'has member',    // 2 — mero_member (group → member)
  'made of',       // 3 — mero_substance
  // 4 — WordNet's domain_topic (Princeton's ";c" pointer). NOT "studied in":
  // the pointer tags a SUBJECT FIELD; it does not assert that anyone studies
  // anything. Not "subject" either — in a game about RDF that word is the first
  // slot of a triple. Not "domain": GLOSSARY reserves that for rdfs:domain.
  'topic',
  'used for',      // 5 — ConceptNet, pending the compliance conditions
  'found at',      // 6 — ConceptNet
  'causes',        // 7 — ConceptNet
  // 8 — CROSS-LINKS, mined from the definitions themselves: concept A's gloss
  // names concept B. The name states the EVIDENCE, not a claim about meaning.
  'named in definition',
] as const;

/** ---- THE SAVE ----------------------------------------------------------
 *
 *  Twelve fields. It was thirty-five, and the twenty-three that went were
 *  either a quantity nobody could name or a cache of one that could. */
export interface GameState {
  /** The ONE version authority. Kept even though saves are now breakable
   *  (DECISIONS 2026-07-27), because the code must be able to TELL which format
   *  it is holding before it decides to reset. */
  version: number;
  /** Epoch ms of the last processed tick. */
  lastTick: number;

  // ---- the one substance, in three states ----
  /** Checked facts. They never rot, and they are the only thing you spend. */
  solid: Dec;
  /** Machine facts nobody has checked. They rot, or they get checked. */
  raw: Dec;
  /** Facts worn out. The only way down is a Retrain. */
  rot: Dec;

  /** CONCEPTS YOU HOLD, in the order you arrived at them.
   *
   *  This is the board, the story position, the vocabulary and the income cap,
   *  all from one array — which is why it survived the rewrite when the anchor
   *  ring, the frontier, the folded mass and the drawn-edge list did not.
   *  Words is derived from it (`held` minus the seed, which is held but not yet
   *  readable), so the readout can never disagree with the board. */
  held: number[];
  /** New concepts walked THIS RUN. Prices the next step, and only the next
   *  step: revisiting somewhere you already know is free and does not move it,
   *  which is what makes a Retrain a sprint back to where you were. */
  stepsThisRun: number;

  /** Owned counts. */
  machines: Record<MachineId, number>;
  /** One toggle per fact machine. WATCHED: slower, and everything it makes
   *  arrives Solid. LOOSE: full speed, and everything it makes arrives Raw.
   *  That is speed-versus-truth with no bookkeeping attached — it replaced an
   *  attention pool, a supervision dial and a booking queue. */
  watched: Record<FactMachineId, boolean>;

  /** Retrains so far. A badge, not a number you optimise. */
  generation: number;
  /** 0..1 — how much of this generation descends from machine output rather
   *  than from real data. Rises every Retrain, never falls. It is the one
   *  thing that makes each generation worse than the last: Raw rots faster. */
  syntheticShare: number;
  /** Facts your machines have minted THIS RUN. A Retrain inherits a share of
   *  it, as Raw, because it never was checked. */
  minted: Dec;
}

/** The four verbs, plus the clock and the toggle.
 *
 *  Gone with the economy: discover, extract, connect, claimNode, growContext,
 *  survey, salvage, reviewBatch, setSupervision, absorb, refine, sell,
 *  manualConnect, chooseOption. */
export type Action =
  /** `dt` in SECONDS; `now` (epoch ms) advances lastTick. */
  | { type: 'tick'; dt: number; now?: number }
  /** WALK a lane to `to`. Costs Solid — nothing if you already hold it. */
  | { type: 'walk'; to: number }
  /** CHECK by hand: a fixed slice of Raw becomes Solid. No cooldown, no timer;
   *  the brake is that a fixed amount per tap loses to exponential production
   *  by construction, which is "review is the only brake and it is slow" with
   *  no clock in it. */
  | { type: 'check' }
  /** BUY a machine, in Solid. */
  | { type: 'buy'; id: MachineId }
  /** The toggle. */
  | { type: 'setWatched'; id: FactMachineId; watched: boolean }
  /** RETRAIN: prestige. You keep the concepts, inherit your machines' Raw, and
   *  your ancestry gets more synthetic. */
  | { type: 'retrain' };

// ---- content data types --------------------------------------------------

/** One machine's declarative balance. Content is data; the engine reads it. */
export interface Machine {
  id: MachineId;
  label: string;
  /** Facts per second per unit, at full speed. For the Checker this is Raw
   *  CONVERTED per second instead — it makes nothing. */
  rate: number;
  /** cost(n) = ceil(baseCost × costRatio^n), in Solid. */
  baseCost: Dec;
  costRatio: number;
}

/** ---- THE STORY GRAPH ----------------------------------------------------
 *
 *  Shape of public/story/*.json, written by scripts/build-story.mjs.
 *  Every id here is a NUMERIC node id — the integers a save stores. */
export interface StoryChoice {
  id: string;
  frame: string;
  label: string;
  /** Destination node id. */
  to: number;
  toLabel: string;
  rel: number;
  requires?: { concepts: number[]; rels: number[] };
  effects?: Record<string, number>;
}

export interface StoryBeat {
  id: string;
  depth: number;
  /** The node this beat is told FROM. */
  at: number;
  atLabel: string;
  frame: string;
  title: string;
  body: string;
  choices: StoryChoice[];
}

export interface StoryGraph {
  /** Generated tallies. Loosely typed on purpose: the pipeline has re-cut these
   *  three times in a day and a strict shape here fails the typecheck for a
   *  field nothing reads. */
  counts: Record<string, number>;
  /** Carrier sentences by frame id, with {here}/{next}/{branch} slots. */
  frames: Record<string, { title?: string; body?: string; label?: string }>;
  beats: StoryBeat[];
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
