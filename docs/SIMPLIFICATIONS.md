# Simplifications register

The accuracy rule (CLAUDE.md) promises: **when a mechanic simplifies real theory,
label the simplification in-game.** This is the checklist of debts owed — every
row must be surfaced by a **Field Note** (see below) before that mechanic ships.
If a mechanic bends theory and isn't listed here, that's a bug.

| # | Game mechanic | Real theory | The simplification | Label owed (Field Note) |
|---|---|---|---|---|
| S1 | "Inference compounds / the engine" | Entailment is monotonic; deductive closure is finite; a reasoner terminates at a fixpoint. | The game treats inference as unbounded compounding growth. | "Real reasoners *finish* — they compute a finite closure and stop. The runaway 'compounding' is a game exaggeration." |
| S2 | Linear resource ladder Data→Triples→Entities→Taxonomies→Ontologies→Twins | Schema (TBox: classes/axioms) and data (ABox: individuals) are two *layers*, not one production chain. | The ladder collapses schema-vs-data into one linear refinement. | "In reality the ontology (schema) and the entities (data) are two layers, not two rungs — the ladder is a game simplification." |
| S3 | Self-description endgame (stages 2–4: proposes goals → self-operates → models you) | Only stage 1 (a graph describing its own schema) is real metamodeling. | Agency/goals/self-operation are satire presented alongside real metamodeling. | "Self-*description* is real metamodeling. Self-*operation and goals* are the satire — graphs don't wake up." |
| S4 | Digital Twin = "fully-modeled domain" (a resource tier) | A digital twin's defining property is **live synchronization** with a real system. | The prominent framing drops the sync/liveness essence. | "A real digital twin is *kept in sync* with a live system — not just a big finished model." |
| S5 | `owl:sameAs` / Curators = pure quality upside | Over-eager `sameAs` merges corrupt a graph; merging is not free. | Modeled as unconditional benefit. | "Merging entities can be *wrong* — a bad `sameAs` links two different things. Real linkage is risky." |
| S6 | Title "Semantic Drift" vs the engine | Entailment is monotonic (never retracts); meaning-change / ontology evolution is a *different, non-monotonic* process at the schema layer. | The title implies inference rewrites meaning. | "Inference never changes meaning (it's monotonic). Meaning-*drift* is a separate, schema-level process — different layer." |
| S7 | Domains labeled "ontologies" | Wikidata is a knowledge base, schema.org a vocabulary, XBRL a taxonomy, FHIR an exchange format, SNOMED CT a terminology. | Loose use of "ontology". | Labeled inline in the domain table (kind shown per row). |
| S8 | Prestige = model collapse | Shumailov et al. name two phases: **early** collapse loses the distribution's *tails* (rare events vanish first); **late** collapse converges on a narrow, low-variance distribution. Synthetic data there is *unrepresentative*, not false. | The game models the generational ratchet and uniform degradation, **not** tail loss — the shipped subset is breadth-first from `entity`, so it *is* the head of the distribution and has no rare tail to lose. Its synthetic statements are false rather than unrepresentative. | "Model collapse kills the *rare* things first, and makes a model narrow rather than wrong. This graph is the common core, so what you're watching is the generational ratchet — the real result's shape, not its mechanism." |
| S9 | One concept card = one word | A WordNet **synset** is a *set* of synonyms (`{car, auto, automobile, motorcar}`). The synset is the concept; the words are its names. | Only `members[0]` is shown, and an entire synset is dropped when its first word form collides with one already shown — so genuinely distinct senses are discarded, not disambiguated. | "This is a **synset** — a set of synonyms. You're seeing one of its names. Concepts whose first name was already taken were left out entirely: our curation, not a fact about English." |
| S10 | Parent edges called "is-a"; the dataset called an ontology | WordNet **hypernymy** is a lexical-semantic relation between synsets, with no formal semantics. It is not `rdfs:subClassOf` and a reasoner cannot consume it as one without a mapping. WordNet is a **lexical database**, not an ontology. | The game renders hypernym links as a subclass taxonomy, and prose has called the dataset an "ontology". | "These is-a links come from WordNet, a *lexical database*. Hypernymy relates word senses, not formal classes — mapping it onto `rdfs:subClassOf` is a choice, and a contested one (Gangemi et al., *Sweetening WordNet with DOLCE*, 2003)." |
| S11 | Manual review called "acceptance sampling" | Real acceptance sampling (ISO 2859-1 / ANSI-ASQ Z1.4) draws *n* from a lot of *N* and returns **one verdict for the whole lot** against an acceptance number set by an AQL, with an OC curve stating producer's and consumer's risk. A rejected lot is screened or reworked, never discarded. Sample size grows *sub-linearly* with lot size, so the inspected fraction falls as lots grow. | The game gives one **independent** verdict per inspected item, each applied to a fixed 2% of the pool; there is no AQL, no acceptance number, no OC curve; rejection *deletes* the slice unexamined; and the fixed 2% makes each inspection's reach grow with pool size — the reverse of real practice. | "Real acceptance sampling accepts or rejects the **whole lot** on one rule, and a rejected lot gets screened, not binned. The 2%-per-item weighting is a game device. What's true is the principle: at scale you inspect a sample and act on the many." |
| S12 | "Drift" = unverified statements rotting over time | **Semantic drift** is a word's meaning shifting across a speech community over decades. **Concept drift** (ML) is a data distribution changing under a trained model. **Ontology evolution** is schema re-versioning. In all three the *world* moves and the data becomes a bad description of it. None means "unchecked facts become wrong." | What the mechanic models is **extraction error** — statements wrong at the moment they are minted — drawn as **data decay** over time so the player can watch it happen. This is the game's title, its headline number, and its most-repeated word. | "Real *semantic drift* is meaning changing as people use a word differently — nothing rots. What's happening to your graph is extraction error you haven't looked at yet, drawn as decay so you can see it. The title is a pun on a real term; this is the real term." |
| S13 | Reasoners run at **fidelity²** | Under classical OWL/DL semantics there is **no graceful degradation**: one contradiction makes the KB inconsistent and *everything* is entailed (ex falso). Smooth degradation exists only under inconsistency-tolerant / repair semantics (AR, IAR) or probabilistic soft reasoning. | Squaring models a *probabilistic* argument — a derivation needs **all** its premises sound, so with two premises drawn from a corpus with trusted share *f* it is sound with probability *f²*. Real, but not description logic, and **gentler** than classical DL, not harsher. | "In real OWL a single contradiction doesn't degrade your graph, it detonates it: an inconsistent ontology entails everything. The smooth curve here models a two-premise inference needing both premises clean (f²) — how probabilistic and inconsistency-tolerant reasoners behave." |
| S14 | The recovered graph is a **tree** | WordNet's noun hypernym structure is a **DAG**: a synset may have several hypernyms (`person` is both an `organism` and a `causal agent`). A taxonomy need not be a tree. | Breadth-first selection keeps one parent per concept — first discovery wins — flattening the DAG. Additionally, concepts whose own parent was rejected re-parent to their nearest *selected* ancestor, so some shipped edges **do not exist in the source**. | "WordNet's hierarchy is a **DAG** — a thing can be more than one kind of thing at once. This graph shows one parent each so the picture stays legible, and where a parent was filtered out we drew the edge to its grandparent. The multiple inheritance is real; the single parent is ours." |
| S15 | "Fidelity" as a quality measure | No data-quality standard defines "fidelity" (ISO/IEC 25012 gives accuracy, completeness, consistency, credibility…). Verified ÷ total is **verification coverage**, and it is **not accuracy**: an unverified statement may well be true. | The game's headline trust number is a *lower bound* on accuracy, not accuracy. (verified + unverified) ÷ total is the upper bound; reviewing narrows the interval and never reveals the true value. | "Fidelity here means *how much you've checked*, not *how much is right*. Unchecked doesn't mean wrong — so this is the floor of your accuracy, never the number itself." |
| S16 | "Rarity" per concept | There is **no rarity or frequency data in Open English WordNet.** Princeton's tagged-corpus counts are not part of this release, and corpus frequency is a property of usage, not of a lexicon. | `scripts/rarity.mjs` scores **obscurity inside the lexicon**: depth, subtree size, synonym count, sense rank, polysemy, label length, relation degree — all measured against the full noun hierarchy. Sense rank is the one genuine frequency signal, because WordNet orders a word's senses by tagged-corpus frequency. | "Nothing here measured how often anyone says this word — WordNet doesn't record that. What it measures is how far out on the taxonomy the concept sits and how thinly the language lexicalised it. That tracks rarity closely and is not a measurement of it." |

**Game-balance items (NOT theory claims, no label owed):** borrowed Cookie Clicker
cost numbers, cubic prestige, coverage %, offline cap — these are pacing knobs,
not statements about the semantic web.

## Field Notes — the delivery subsystem

Field Notes are how every label above actually reaches the player. **Designed
subsystem, not a vague promise:**

- **Data:** each is a `FieldNote` (schema in `docs/SPEC.md`): `{ id, gameTerm,
  realTerm, glossaryRef, oneLineTruth, simplificationLabel?, learnMore? }`.
- **Home:** content data in `src/content/`, keyed to `GLOSSARY.md` rows so it
  **can't drift** from the source of truth (generated from the glossary later).
- **Trigger:** a Field Note unlocks when its mechanic/term first appears in play;
  a "Field Notes" codex screen collects them, with a *learn-more* link to the real
  spec. Optional to read — the label is always shown at first appearance.
- **Authorship:** the `oneLineTruth` / `simplificationLabel` prose is
  **human-written** (CLAUDE.md rule); the pipeline only wires up which note maps
  to which term.

## S? — "named in definition" is a game construct, not a WordNet relation

**The simplification.** The starmap carries edges labelled *named in
definition*: concept A's gloss contains concept B's label as a whole word.
These are generated by `scripts/build-crosslinks.mjs`, not read from WordNet.

**Why it exists.** Hypernymy is acyclic and strictly oriented — one path from
`entity` to anything — so a pure `is a` graph cannot produce a labyrinth at any
size. WordNet's own cross-relations do not help here: measured, they touch 4.5%
of the shipped concepts, and re-selecting for connectivity buys only 9.1% while
costing a save reset (`scripts/cross-link-analysis.mjs`). Gloss references
reach 67.4% on the concepts already shipped, and introduce 728 cycles into a
graph that had none.

**What it does and does not claim.** The claim is narrow and literally
checkable by the player: *the definition of A contains the word B*. The gloss is
shown verbatim, so the edge can be verified by reading. It asserts **nothing**
about hyponymy, meronymy, entailment, or any RDF/OWL relation, and it must
never be rendered with a label that implies one.

**Where the real theory is.** `docs/GLOSSARY.md` for the genuine WordNet
relations, which ship separately as `rel.json` and keep their own names.
