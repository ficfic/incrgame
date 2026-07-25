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
