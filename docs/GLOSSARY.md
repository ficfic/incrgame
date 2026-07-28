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
| **Triple** | Atomic statement: *subject – predicate – object*. | Reference only. The game no longer has a "Triples" resource: facts are a mass in three states (Solid / Raw / Rot), because naming a countable unit the player could not point at was half of what made the old economy unreadable. | [RDF 1.1 Primer](https://www.w3.org/TR/rdf11-primer/) |
| **IRI** (Internationalized Resource Identifier) | A globally-*scoped* name for a resource; distinct IRIs may denote the same thing (that's why `owl:sameAs` exists). | How every entity is named. | [RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/) |
| **Literal** | A data value (string/number/date); only in object position. | Leaf values on entities. | [RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/) |
| **Synset** | A *set* of synonymous word forms expressing one lexicalized concept — WordNet's unit. Not a word, and not a class. | Every concept you hold is one synset; the game shows only its most familiar member (**labeled simplification** S10). | [Miller, *WordNet*, CACM 38(11), 1995](https://dl.acm.org/doi/10.1145/219717.219748) |
| **Lexical database** | A structured inventory of a language's word senses and the relations between them. Distinct from an **ontology**: no formal axioms, no logical semantics, no class/instance separation. | Open English WordNet — the game's ground truth (**labeled simplification** S8: we sometimes call it an ontology). | [Gangemi et al., *Sweetening WordNet with DOLCE*, AI Magazine 24(3), 2003](https://ojs.aaai.org/index.php/aimagazine/article/view/1715) |
| **Hypernymy / hyponymy** | The lexical is-a relation between synsets (*dog* → *canine*). Informally a taxonomy; **not** a formal `rdfs:subClassOf` axiom, and its transitive closure is famously leaky. | The is-a edges of the concept hierarchy. Called "is-a" in game, deliberately never `rdfs:subClassOf`. | [Miller 1995](https://dl.acm.org/doi/10.1145/219717.219748) |
| **Troponymy** | The verb analogue of hyponymy: *manner-of*, not subsumption (*to whisper* is a manner of *speaking*). | Not shipped — the dataset is nouns only. Recorded so a future verb tier doesn't mislabel it. | [Fellbaum, *WordNet: An Electronic Lexical Database*, MIT Press 1998](https://mitpress.mit.edu/9780262561167/) |
| **Lexicographer file / supersense** | WordNet's 45 broad editorial categories (`noun.animal`, `noun.cognition`, …). An *editorial* partition, not domains in any ontological sense — and some (`adj.pert`, `noun.Tops`) are morphological or structural, not semantic. | Shown as a concept's **category**. Deliberately NOT called a "domain": that word is reserved for `rdfs:domain` and for domain ontologies. | [Ciaramita & Johnson, *Supersense Tagging*, EMNLP 2003](https://aclanthology.org/W03-1013/) |
| **Model collapse** | Degenerative process when a generative model trains on recursively generated data. **Early** collapse loses the *tails* of the distribution; **late** collapse converges to a low-variance distribution unlike the original. Concerns training without fresh real data. | **Retrain**: each generation inherits a quarter of what its own machines minted, as Raw, and `syntheticShare` rises — so Raw rots faster every generation and never slower. | [Shumailov et al., *Nature* 631:755–759, 2024](https://www.nature.com/articles/s41586-024-07566-y) |
| **Taxonomy** | A *hierarchical* classification (is-a / subclass tree); simpler than an ontology. | Reference only. The six-rung resource ladder is deleted (`docs/ECONOMY_SRR.md` §5); the taxonomy is the shape of the map you walk, not a tier you refine into. | [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/) |
| **RDFS** (RDF Schema) | Vocabulary for classes/properties: `rdf:type`, `rdfs:subClassOf`, `rdfs:domain`, `rdfs:range`. | Reference only. There is no "Schema" tier — the tier ladder is deleted. | [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/) |
| **OWL** (Web Ontology Language) | Ontology language built on RDF, based on description logic; richer axioms. | Reference only. There is no "Axioms" tier. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Ontology** | Formal, explicit specification of a shared conceptualization of a domain (Gruber 1993; Studer et al. 1998). | Reference only — nothing in the game is assembled into one, and there is no domain unlock. | [Gruber, *Ontology*](https://tomgruber.org/writing/ontology-definition-2007) |
| **Entity / Individual (ABox)** | A specific instance/thing in the data — as opposed to a class or type. | Reference only — there is no "Entities" resource. A node on the board is one of these, and holding it is what `Words` counts. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **TBox vs ABox** | Schema (classes, axioms) vs instances (individuals) — two *layers*, not one production chain. | Why the linear resource ladder is a **labeled simplification** (see SIMPLIFICATIONS.md). | [Description Logic](https://en.wikipedia.org/wiki/Description_logic) |
| **Description Logic** | Family of (mostly decidable) logics underpinning OWL DL (subsumption, classification, consistency). *Note: OWL Full is undecidable and not a DL.* | The math behind reasoning. | [Baader et al., *DL Handbook*](https://en.wikipedia.org/wiki/Description_logic) |
| **Entailment / inference** | Deriving triples that logically follow from asserted ones (RDFS/OWL). Monotonic; the deductive **closure** is finite and terminates at a fixpoint. | Why the Reasoner's output arrives **Solid**: what already follows from facts you hold needs no checking. There is no "compounding engine" — the Reasoner is a flat 2.2 facts/s per unit and is capped by the same vocabulary join as everything else. | [SPARQL 1.1 Entailment Regimes](https://www.w3.org/TR/sparql11-entailment/) |
| **Forward chaining / materialization** | Eagerly computing and storing all entailed triples up front. | What the Reasoner machine is doing. | [SPARQL 1.1 Entailment Regimes](https://www.w3.org/TR/sparql11-entailment/) |
| **Deductive closure / fixpoint** | The complete, **finite** set of entailed triples; materialization stops when no new triple appears (the fixpoint). | Why a Reasoner cannot be an infinite faucet — and, in game, why it is capped by how many concepts you hold. | [RDF 1.1 Semantics](https://www.w3.org/TR/rdf11-mt/) |
| **Monotonicity** | Adding facts never retracts a prior conclusion (RDFS/OWL entailment is monotonic). | Why inference can't "rewrite" meaning — contrast the title's *drift*. | [RDF 1.1 Semantics](https://www.w3.org/TR/rdf11-mt/) |
| **Reasoner** | Software computing entailments / checking consistency (HermiT, ELK, RDFox). | The **Reasoner** machine: 2.2 facts/s, always Solid, priced at sixteen Extractors. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Transitive property** | If P is transitive and `a P b`, `b P c`, then `a P c` is entailed. | Reference only — there are no axiom upgrades. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **owl:sameAs** | Asserts two IRIs denote the same entity (entity linking). **Over-eager `sameAs` corrupts a graph** — merging is not free. | Reference only — there are no Curators and nothing merges. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Open-World Assumption** | What isn't stated is *unknown*, not false (unlike databases). | Reference only — no mechanic turns on it yet. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Inconsistency (ex falso)** | An inconsistent ontology entails *everything*; reasoning becomes meaningless. | Reference only — the game has no consistency hazard; Raw simply rots. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **SPARQL** | W3C query language for RDF; matches basic graph patterns. | Reference only — there is no query action. | [SPARQL 1.1 Query](https://www.w3.org/TR/sparql11-query/) |
| **Linked Data / 5-star** | Principles for publishing interlinked data with IRIs + standard vocabularies. | Reference only. | [5-star Open Data](https://5stardata.info/) |
| **Vocabulary / namespace** | Reusable term set (FOAF, Dublin Core, schema.org) under a namespace IRI. | Reference only — nothing is unlockable. | [schema.org](https://schema.org/) |
| **Knowledge Graph** | A graph accumulating real-world knowledge: nodes = entities, edges = relations. | The thing you're building. | [Hogan et al., *Knowledge Graphs*](https://arxiv.org/abs/2003.02320) |
| **Digital Twin** | A virtual model kept synchronized with a real-world system. | Reference only. Not shipped, and no longer a tier — recorded so a future session does not re-derive the ladder from this table. | [Digital Twin Consortium glossary](https://www.digitaltwinconsortium.org/glossary/glossary/) |
| **DTDL** | JSON-LD schema language (Microsoft, open-sourced) defining twin interfaces. | Reference only — not shipped. | [Azure DT ontologies](https://learn.microsoft.com/en-us/azure/digital-twins/concepts-ontologies) |
| **W3C WoT Thing Description** | Standard describing a Thing's metadata/interfaces; converging with DTDL. | Reference only — not shipped. | [W3C WoT](https://www.w3.org/WoT/) |
| **PROV-O** | W3C Provenance Ontology: entities, activities, agents; how data was produced. | The **Solid / Raw** split IS provenance, coarsened to two states: checked, and machine-made and unlooked-at. | [PROV-O](https://www.w3.org/TR/prov-o/) |
| **Metamodeling / self-description** | RDFS/OWL vocabularies are themselves RDF; graphs can describe their own structure. | The **Retrain** prestige. *(Called "Reflect" until 2026-07-28; one word now, in the action, the field, the button and here.)* | [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/) |
| **Semantic drift** (linguistics) | A word's meaning gradually shifts over time. | **The game's title.** | [Semantic change](https://en.wikipedia.org/wiki/Semantic_change) |
| **Ontology evolution** | Re-versioning a schema as its domain changes. *Distinct from ML "concept drift"* (shifting data distributions — not about meaning). | The graph rewrites meaning as it wakes (title concept). | [Ontology (info science)](https://en.wikipedia.org/wiki/Ontology_(information_science)) |
| **Upper ontology** | Domain-independent foundational ontology (BFO, DOLCE, SUMO). | Reference only — not shipped. | [BFO](https://basic-formal-ontology.org/) |

## AI economy terms

These ground the money/AI layer in the real AI industry.

> ⚠️ **There is no money layer in the shipped game.** Capital, selling, buyers,
> subscriptions and the Orchestrator were deleted with the resource ladder
> (`docs/ECONOMY_SRR.md` §5). Every price is in Solid and there is no second
> currency. The rows below stay because they are correct definitions and the
> owner is here to learn — but "in-game as" means *not in this game* unless it
> says otherwise.

| Real term | Correct definition | In-game as | Source |
|---|---|---|---|
| **RAG** (Retrieval-Augmented Generation) | Technique where an LLM retrieves external knowledge (often a graph/DB) to ground its output. | Reference only — nobody buys your graph. | [AWS: What is RAG](https://aws.amazon.com/what-is/retrieval-augmented-generation/) |
| **Grounding** | Constraining/verifying LLM output against a trusted knowledge source to reduce error. | **Check**, and the Checker machine: Raw becomes Solid only by being looked at. | [Hogan et al., *Knowledge Graphs*](https://arxiv.org/abs/2003.02320) |
| **Hallucination** | An LLM producing fluent but false/unsupported statements. | Why machine output arrives **Raw** and rots if nobody checks it. | [Ji et al., *Survey of Hallucination*](https://arxiv.org/abs/2202.03629) |
| **Training-data market** | The real economy of buying/licensing datasets to train/ground AI models. | Reference only — there is nothing to sell and no capital to sell it for. | [Hogan et al., *Knowledge Graphs*](https://arxiv.org/abs/2003.02320) |
| **Provenance / PROV-O** | Formal record of where data came from and how it was produced. | The Solid/Raw split, and nothing more — no premium, no lawsuit. | [PROV-O](https://www.w3.org/TR/prov-o/) |
| **Fine-tuning** | Further-training a model on specific data to specialize it. | Reference only — you own no model to upgrade. | [OpenAI: fine-tuning](https://platform.openai.com/docs/guides/fine-tuning) |
| **Model card** | A structured report published with a trained model: intended use, factors, metrics, evaluation and training data, ethical considerations, caveats. Its central proposal is DISAGGREGATED evaluation — results broken out by subgroup so weak numbers cannot hide behind an average. | Each checkpoint ships one. The satire is bad practice filling it in badly, NOT the artifact — do not imply evasion is a property of the standard. | [Mitchell et al., *Model Cards for Model Reporting*](https://arxiv.org/abs/1810.03993) |
| **Calibration** | Whether a model's stated confidence matches its actual accuracy — a 70%-confident well-calibrated model is right ~70% of the time. Real extraction models are frequently MIScalibrated, which is why confident output is not trustworthy output. | The game has no confidence estimate and, since the rewrite, no RNG in the core at all. Machine output is therefore **Raw** — "nobody has checked it" — never "uncertain": claiming uncertainty would assert a calibrated self-estimate that is not simulated. | [Guo et al., *On Calibration of Modern Neural Networks*](https://arxiv.org/abs/1706.04599) |
| **Corpus** | A body of text assembled for training or analysis. Different corpora have genuinely different distributions — a web crawl, a forum dump and scanned books differ in what is common and what is rare. | Reference only — Salvage is deleted. Kept because the dataset's head/tail shape still explains the pacing curve. | [Fellbaum, *WordNet*](https://mitpress.mit.edu/9780262561167/wordnet/) |
| **Inference cost / tokens** | The per-use compute cost of running a model (often billed per token). | Reference only — no opex, no tokens, no subscription. | *(industry term — no single spec)* |
| **Build vs buy (capex/opex)** | Self-host a model (upfront capex + compute) vs pay an API per use (ongoing opex). | Reference only — machines are bought outright, in Solid. | *(general infra economics)* |
| **Human-in-the-loop (HITL)** | Keeping a human reviewing/correcting AI output to catch errors before they propagate. | The **watched** toggle and the **Check** verb. The Checker machine buys them out, worse per Solid — so review is never mandatory (`CLAUDE.md`). | *(industry term — no single spec)* |
| **AI agents / orchestration** | Autonomous LLM-driven programs that act toward a goal; orchestration coordinates many agents. | The Extractor and the Reasoner. There is no Orchestrator any more — it bought review, which the Checker now does under a name that says so. | *(emerging term — no single spec)* |
| **Universal knowledge graph** | The long-standing ambition to encode all of human knowledge in one machine-readable graph. | The north star, and the only fraction on screen: `Words N / 4075`. | [Wikidata](https://www.wikidata.org/) · [Cyc](https://en.wikipedia.org/wiki/Cyc) |

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
