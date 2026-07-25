# Glossary — real theory ↔ game terms

The **accuracy source of truth**. Every in-game concept maps to a correct,
real-world definition here, with an authoritative source. Rigor stance:
**faithful but playable** — mechanics are genuinely accurate; where the game
simplifies real theory, the simplification is **labeled** in-game so a player
never leaves believing something false.

If a mechanic and this glossary ever disagree, the glossary wins (or we fix the
glossary deliberately and log it in `DECISIONS.md`).

| Real term | Correct definition | In-game as | Source |
|---|---|---|---|
| **RDF** (Resource Description Framework) | W3C data model representing information as *triples*, forming a directed labeled graph. | The whole board is an RDF graph. | [W3C RDF 1.1 Primer](https://www.w3.org/TR/rdf11-primer/) |
| **Triple** | Atomic statement: *subject – predicate – object*. | The core unit you produce ("Triples"). | [RDF 1.1 Primer](https://www.w3.org/TR/rdf11-primer/) |
| **IRI** (Internationalized Resource Identifier) | A globally-*scoped* name for a resource; distinct IRIs may denote the same thing (that's why `owl:sameAs` exists). | How every entity is named. | [RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/) |
| **Literal** | A data value (string/number/date); only in object position. | Leaf values on entities. | [RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/) |
| **Synset** | A *set* of synonymous word forms expressing one lexicalized concept — WordNet's unit. Not a word, and not a class. | Every "concept" the player recovers is one synset; the game shows only its most familiar member (**labeled simplification** S10). | [Miller, *WordNet*, CACM 38(11), 1995](https://dl.acm.org/doi/10.1145/219717.219748) |
| **Lexical database** | A structured inventory of a language's word senses and the relations between them. Distinct from an **ontology**: no formal axioms, no logical semantics, no class/instance separation. | Open English WordNet — the game's ground truth (**labeled simplification** S8: we sometimes call it an ontology). | [Gangemi et al., *Sweetening WordNet with DOLCE*, AI Magazine 24(3), 2003](https://ojs.aaai.org/index.php/aimagazine/article/view/1715) |
| **Hypernymy / hyponymy** | The lexical is-a relation between synsets (*dog* → *canine*). Informally a taxonomy; **not** a formal `rdfs:subClassOf` axiom, and its transitive closure is famously leaky. | The is-a edges of the concept hierarchy. Called "is-a" in game, deliberately never `rdfs:subClassOf`. | [Miller 1995](https://dl.acm.org/doi/10.1145/219717.219748) |
| **Troponymy** | The verb analogue of hyponymy: *manner-of*, not subsumption (*to whisper* is a manner of *speaking*). | Not shipped — the dataset is nouns only. Recorded so a future verb tier doesn't mislabel it. | [Fellbaum, *WordNet: An Electronic Lexical Database*, MIT Press 1998](https://mitpress.mit.edu/9780262561167/) |
| **Lexicographer file / supersense** | WordNet's 45 broad editorial categories (`noun.animal`, `noun.cognition`, …). An *editorial* partition, not domains in any ontological sense — and some (`adj.pert`, `noun.Tops`) are morphological or structural, not semantic. | Shown as a concept's **category**. Deliberately NOT called a "domain": that word is reserved for `rdfs:domain` and for domain ontologies. | [Ciaramita & Johnson, *Supersense Tagging*, EMNLP 2003](https://aclanthology.org/W03-1013/) |
| **Model collapse** | Degenerative process when a generative model trains on recursively generated data. **Early** collapse loses the *tails* of the distribution; **late** collapse converges to a low-variance distribution unlike the original. Concerns training without fresh real data. | The prestige mechanic: each generation inherits its own machine output, and drift accelerates. | [Shumailov et al., *Nature* 631:755–759, 2024](https://www.nature.com/articles/s41586-024-07566-y) |
| **Taxonomy** | A *hierarchical* classification (is-a / subclass tree); simpler than an ontology. | The "Taxonomies" tier (before Ontologies). | [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/) |
| **RDFS** (RDF Schema) | Vocabulary for classes/properties: `rdf:type`, `rdfs:subClassOf`, `rdfs:domain`, `rdfs:range`. | The "Schema" tier. | [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/) |
| **OWL** (Web Ontology Language) | Ontology language built on RDF, based on description logic; richer axioms. | The "Axioms" tier. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Ontology** | Formal, explicit specification of a shared conceptualization of a domain (Gruber 1993; Studer et al. 1998). | What you assemble to unlock domains. | [Gruber, *Ontology*](https://tomgruber.org/writing/ontology-definition-2007) |
| **Entity / Individual (ABox)** | A specific instance/thing in the data — as opposed to a class or type. | Resource tier "Entities" (nodes). | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **TBox vs ABox** | Schema (classes, axioms) vs instances (individuals) — two *layers*, not one production chain. | Why the linear resource ladder is a **labeled simplification** (see SIMPLIFICATIONS.md). | [Description Logic](https://en.wikipedia.org/wiki/Description_logic) |
| **Description Logic** | Family of (mostly decidable) logics underpinning OWL DL (subsumption, classification, consistency). *Note: OWL Full is undecidable and not a DL.* | The math behind reasoning. | [Baader et al., *DL Handbook*](https://en.wikipedia.org/wiki/Description_logic) |
| **Entailment / inference** | Deriving triples that logically follow from asserted ones (RDFS/OWL). Monotonic; the deductive **closure** is finite and terminates at a fixpoint. | The "compounding engine" — a **labeled game metaphor**: closure yields more triples than asserted (a production multiplier), but real inference does *not* accelerate or run away. | [SPARQL 1.1 Entailment Regimes](https://www.w3.org/TR/sparql11-entailment/) |
| **Forward chaining / materialization** | Eagerly computing and storing all entailed triples up front. | How a Reasoner "produces" edges. | [SPARQL 1.1 Entailment Regimes](https://www.w3.org/TR/sparql11-entailment/) |
| **Deductive closure / fixpoint** | The complete, **finite** set of entailed triples; materialization stops when no new triple appears (the fixpoint). | Why the "compounding" engine is bounded, not infinite. | [RDF 1.1 Semantics](https://www.w3.org/TR/rdf11-mt/) |
| **Monotonicity** | Adding facts never retracts a prior conclusion (RDFS/OWL entailment is monotonic). | Why inference can't "rewrite" meaning — contrast the title's *drift*. | [RDF 1.1 Semantics](https://www.w3.org/TR/rdf11-mt/) |
| **Reasoner** | Software computing entailments / checking consistency (HermiT, ELK, RDFox). | The "Reasoner" generators. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Transitive property** | If P is transitive and `a P b`, `b P c`, then `a P c` is entailed. | An axiom upgrade that auto-spawns edges. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **owl:sameAs** | Asserts two IRIs denote the same entity (entity linking). **Over-eager `sameAs` corrupts a graph** — merging is not free. | Curators merging duplicates → a *bad-merge* hazard, not pure upside. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Open-World Assumption** | What isn't stated is *unknown*, not false (unlike databases). | A puzzle constraint; you can't win by omission. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Inconsistency (ex falso)** | An inconsistent ontology entails *everything*; reasoning becomes meaningless. | A hazard (e.g. an individual in two disjoint classes). | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **SPARQL** | W3C query language for RDF; matches basic graph patterns. | A "query" action to harvest matching patterns. | [SPARQL 1.1 Query](https://www.w3.org/TR/sparql11-query/) |
| **Linked Data / 5-star** | Principles for publishing interlinked data with IRIs + standard vocabularies. | Reuse-vocabulary rewards. | [5-star Open Data](https://5stardata.info/) |
| **Vocabulary / namespace** | Reusable term set (FOAF, Dublin Core, schema.org) under a namespace IRI. | Unlockable vocabularies. | [schema.org](https://schema.org/) |
| **Knowledge Graph** | A graph accumulating real-world knowledge: nodes = entities, edges = relations. | The thing you're building. | [Hogan et al., *Knowledge Graphs*](https://arxiv.org/abs/2003.02320) |
| **Digital Twin** | A virtual model kept synchronized with a real-world system. | The "Digital Twins" tier. | [Digital Twin Consortium glossary](https://www.digitaltwinconsortium.org/glossary/glossary/) |
| **DTDL** | JSON-LD schema language (Microsoft, open-sourced) defining twin interfaces. | How a modeled domain is specified. | [Azure DT ontologies](https://learn.microsoft.com/en-us/azure/digital-twins/concepts-ontologies) |
| **W3C WoT Thing Description** | Standard describing a Thing's metadata/interfaces; converging with DTDL. | Alternate twin spec. | [W3C WoT](https://www.w3.org/WoT/) |
| **PROV-O** | W3C Provenance Ontology: entities, activities, agents; how data was produced. | Tracks where facts came from. | [PROV-O](https://www.w3.org/TR/prov-o/) |
| **Metamodeling / self-description** | RDFS/OWL vocabularies are themselves RDF; graphs can describe their own structure. | The "Reflect" prestige. | [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/) |
| **Semantic drift** (linguistics) | A word's meaning gradually shifts over time. | **The game's title.** | [Semantic change](https://en.wikipedia.org/wiki/Semantic_change) |
| **Ontology evolution** | Re-versioning a schema as its domain changes. *Distinct from ML "concept drift"* (shifting data distributions — not about meaning). | The graph rewrites meaning as it wakes (title concept). | [Ontology (info science)](https://en.wikipedia.org/wiki/Ontology_(information_science)) |
| **Upper ontology** | Domain-independent foundational ontology (BFO, DOLCE, SUMO). | Endgame meta-structure. | [BFO](https://basic-formal-ontology.org/) |

## AI economy terms

These ground the money/AI layer in the real AI industry.

| Real term | Correct definition | In-game as | Source |
|---|---|---|---|
| **RAG** (Retrieval-Augmented Generation) | Technique where an LLM retrieves external knowledge (often a graph/DB) to ground its output. | Why buyers want your graph. | [AWS: What is RAG](https://aws.amazon.com/what-is/retrieval-augmented-generation/) |
| **Grounding** | Constraining/verifying LLM output against a trusted knowledge source to reduce error. | Reasoner validating LLM-extracted triples. | [Hogan et al., *Knowledge Graphs*](https://arxiv.org/abs/2003.02320) |
| **Hallucination** | An LLM producing fluent but false/unsupported statements. | Why owned-AI triples are noisy and need grounding. | [Ji et al., *Survey of Hallucination*](https://arxiv.org/abs/2202.03629) |
| **Training-data market** | The real economy of buying/licensing datasets to train/ground AI models. | The buyers you sell to. | [Hogan et al., *Knowledge Graphs*](https://arxiv.org/abs/2003.02320) |
| **Provenance / PROV-O** | Formal record of where data came from and how it was produced. | Premium-price + lawsuit-avoidance mechanic. | [PROV-O](https://www.w3.org/TR/prov-o/) |
| **Fine-tuning** | Further-training a model on specific data to specialize it. | An upgrade for an owned model. | [OpenAI: fine-tuning](https://platform.openai.com/docs/guides/fine-tuning) |
| **Inference cost / tokens** | The per-use compute cost of running a model (often billed per token). | Subscription (opex) drain. | *(industry term — no single spec)* |
| **Build vs buy (capex/opex)** | Self-host a model (upfront capex + compute) vs pay an API per use (ongoing opex). | The AI strategic fork. | *(general infra economics)* |
| **Human-in-the-loop (HITL)** | Keeping a human reviewing/correcting AI output to catch errors before they propagate. | The agent-review mechanic. | *(industry term — no single spec)* |
| **AI agents / orchestration** | Autonomous LLM-driven programs that act toward a goal; orchestration coordinates many agents. | Your automated "workforce"; the Orchestrator tier. | *(emerging term — no single spec)* |
| **Universal knowledge graph** | The long-standing ambition to encode all of human knowledge in one machine-readable graph. | The north-star goal (world coverage %). | [Wikidata](https://www.wikidata.org/) · [Cyc](https://en.wikipedia.org/wiki/Cyc) |

## Domain standards & ontologies (real, one per game domain)

Each domain nods to a real-world standard — *not all are ontologies* (a knowledge
base, a taxonomy, and an exchange format are different things; the game labels the
kind, per accuracy rules).

| Domain | Real standard (kind) | Source |
|---|---|---|
| Biology | **Gene Ontology (GO)** — gene function vocabulary; **OBO Foundry** — shared bio-ontology library. | [Gene Ontology](https://geneontology.org/) · [OBO Foundry](https://obofoundry.org/) |
| Finance | **FIBO** (Financial Industry Business Ontology); **XBRL** for reporting. | [FIBO](https://spec.edmcouncil.org/fibo/) |
| Medicine | **SNOMED CT** — clinical terminology; **FHIR** — health-data exchange. ⚠️ *SNOMED CT is named here as the real standard, which it is, but it is **not** openly licensed and its content will never ship in this game — see `docs/ATTRIBUTION.md`. An openly licensed source (MONDO, HPO, the open NCI Thesaurus subset) will stand in if a medicine domain is built.* | [SNOMED CT](https://www.snomed.org/) · [HL7 FHIR](https://www.hl7.org/fhir/) |
| Law | **LKIF** — Legal Knowledge Interchange Format. | [LKIF](https://github.com/RinkeHoekstra/lkif-core) |
| Engineering/IoT | **DTDL**, **W3C WoT Thing Description** (see digital-twin rows above). | [W3C WoT](https://www.w3.org/WoT/) |

## For players who want to go deeper

- **W3C RDF 1.1 Primer** — the gentle official intro.
- **"Semantic Web for the Working Ontologist"** (Allemang & Hendler) — the canonical accessible book.
- **schema.org** — the most-used real vocabulary on the web.
- **Digital Twin Consortium glossary** — authoritative DT terminology.
