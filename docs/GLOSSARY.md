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
| **IRI** | Globally unique identifier naming a resource. | How every entity is named. | [RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/) |
| **Literal** | A data value (string/number/date); only in object position. | Leaf values on entities. | [RDF 1.1 Concepts](https://www.w3.org/TR/rdf11-concepts/) |
| **RDFS** (RDF Schema) | Vocabulary for classes/properties: `rdf:type`, `rdfs:subClassOf`, `rdfs:domain`, `rdfs:range`. | The "Schema" tier. | [RDF Schema 1.1](https://www.w3.org/TR/rdf-schema/) |
| **OWL** (Web Ontology Language) | Ontology language built on RDF, based on description logic; richer axioms. | The "Axioms" tier. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Ontology** | Formal, explicit specification of a shared conceptualization of a domain. | What you assemble to unlock domains. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Description Logic** | Family of decidable logics underpinning OWL (subsumption, classification, consistency). | The math behind reasoning. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Entailment / inference** | Deriving triples that logically follow from asserted ones under a regime (RDFS/OWL). | **The compounding engine.** | [SPARQL 1.1 Entailment Regimes](https://www.w3.org/TR/sparql11-entailment/) |
| **Reasoner** | Software computing entailments / checking consistency (HermiT, ELK, RDFox). | The "Reasoner" generators. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **Transitive property** | If P is transitive and `a P b`, `b P c`, then `a P c` is entailed. | An axiom upgrade that auto-spawns edges. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
| **owl:sameAs** | Asserts two IRIs denote the same entity (entity linking). | Curators merging duplicates. | [OWL 2 Primer](https://www.w3.org/TR/owl2-primer/) |
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
| **Upper ontology** | Domain-independent foundational ontology (BFO, DOLCE, SUMO). | Endgame meta-structure. | [BFO](https://basic-formal-ontology.org/) |

## For players who want to go deeper

- **W3C RDF 1.1 Primer** — the gentle official intro.
- **"Semantic Web for the Working Ontologist"** (Allemang & Hendler) — the canonical accessible book.
- **schema.org** — the most-used real vocabulary on the web.
- **Digital Twin Consortium glossary** — authoritative DT terminology.
