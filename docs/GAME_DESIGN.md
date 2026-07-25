# Game design — working concept

> Durable design memory. Sessions are ephemeral; this file is where the concept
> lives so any future session inherits it. It's a *working* design — update it
> as decisions land, and log notable changes in `docs/DECISIONS.md`.

## Pitch

An incremental/idle game about **knowledge management** — you grow a **knowledge
graph**: harvest data, extract triples, form entities, build ontologies, and
model **digital twins** of domains. The reward is a large, beautiful graph that
grows and reorganizes itself — and, eventually, **describes itself**.
"Universal Paperclips for ontologists."

## North star & macro-loop

**The goal: model all the world's knowledge as one graph.** Not fiction — it's
the real ambition behind Cyc, Wikidata, and Google's Knowledge Graph.

**Master progress: "world coverage %."** Approached **domain by domain**
(medicine → law → biology → …); each domain is a mini-arc that unlocks the next.
This mirrors how real ontologies are actually built — one domain at a time,
never "finished."

**Endless horizon.** You approach 100% forever via prestige resets; there is no
true finish line. Standard for the genre, endless play.

**The macro-loop:**

> Model knowledge → to go faster you need resources (capital, AIs, compute) →
> get resources by monetizing the graph → resources let you model more, broader,
> better → coverage climbs toward "all knowledge" — with the **sell-vs-keep**
> tension inside every cycle.

## Tone & voice

**Dominant tone: satirical tech-startup on the surface, an ominous awe-spine
underneath.** Funny gold-rush comedy early; a slow-creeping "this is bigger than
me" dread as the graph grows and begins to describe itself.

**Tonal arc (rides the progression):**

- **Early — startup comedy.** Scrappy founder energy: funding rounds, hype,
  pivots, "we're an AI company now."
- **Mid — growth/hype.** Scaling, platform ambitions, dodging lawsuits.
- **Late — the joke curdles.** The graph is bigger than you; the self-
  description prestige ("Reflect") is where the ominous spine takes over — the
  model starts writing its own ontology, and maybe its own goals. Universal
  Paperclips energy.

**Voice rules:**

- Wry, punchy, self-aware. Satire on top — **never** at the expense of accuracy.
- The satire is a *wrapper*: every joke-name shows its real term (in Field Notes
  / glossary). You laugh, then you learn. This is how "faithful but playable"
  and "satirical" coexist.
- Simplifications of real theory are still labeled (see the accuracy guardrail).

**First-pass naming (real term → in-game satirical name — all placeholder):**

| Real term | In-game (satirical) |
|---|---|
| Data harvesting | "Ingestion Pipeline™" |
| RDF triple | "Insight" (marketing) — labeled *(a triple)* |
| Reasoner / inference | "Inference Engine (Series A)" |
| Curator / dedup | "Data Janitor" / MLOps |
| Ontology | "the Schema (v2, breaking changes)" |
| Sell/exhaust | "Exit to a hyperscaler" |
| Rent/platform | "Platform tier / the API" |
| AI subscription (opex) | "Vendor API — billed per token" |
| Own model (capex) | "In-house model (Series B compute)" |
| Lawsuit hazard | "Cease & Desist" / discovery |
| Self-description prestige | "Reflection" — the model models itself |

## The engine (locked)

**Inference is the compounding multiplier.** *Reasoners* generate new edges from
edges you already have, so the richer the graph, the faster it grows —
self-accelerating, super-linear. This is the core dopamine loop; the rest of the
design serves it.

## Resource ladder

Each rung feeds the next:

1. **Data** — raw; tapped or auto-harvested (the "cookie").
2. **Triples** — subject→predicate→object *edges*; the atomic unit.
3. **Entities** — *nodes*; emerge when enough triples reference the same thing.
4. **Ontologies** — schemas organizing entities into typed clusters; unlocking
   one opens a new **domain** to model.
5. **Digital Twins** — a fully-modeled domain; a high-prestige mega-node.

## Generators / upgrades

- **Harvesters** — auto-produce Data.
- **Extractors** — Data → Triples.
- **★ Reasoners** — infer new Triples *from the existing graph* (the compounding
  star mechanic).
- **Curators** — merge duplicate entities → quality multiplier.
- **Schema engineers** — Triples → Ontologies.

## Theory grounding (faithful but playable)

This game teaches the **real semantic-web stack**. Rigor stance: mechanics are
genuinely accurate; simplifications are labeled in-game; deeper theory lives in
an optional "Field Notes" codex with links. See `docs/GLOSSARY.md` for the
authoritative term↔definition↔source mapping.

The tier ladder *is* the real stack:

| Game tier | Real concept |
|---|---|
| Statements | RDF triples (subject–predicate–object), IRIs |
| Vocabularies | reuse FOAF / Dublin Core / schema.org; namespaces |
| Schema | RDFS (`rdf:type`, `rdfs:subClassOf`, domain/range) |
| Axioms | OWL (`sameAs`, `inverseOf`, `TransitiveProperty`, `disjointWith`, cardinality) |
| Reasoning | entailment / description-logic reasoners — **the compounding engine** |
| Querying | SPARQL basic graph patterns |
| Digital Twins | DTDL (JSON-LD) / W3C WoT Thing Description |
| Meta / prestige | metamodeling (RDFS is written in RDF), PROV-O provenance |

### Mechanics that teach (learn by profiting, not by reading)

- **Transitivity** — buy the `TransitiveProperty` axiom; `partOf∘partOf` edges
  auto-spawn. The player profits from a real inference rule. (This is the
  compounding engine, mechanically honest.)
- **owl:sameAs / entity resolution** — Curators merge duplicate entities;
  teaches Linked Data identity.
- **Inconsistency explosion** — assert an individual into two `disjointWith`
  classes → the reasoner derives everything (ex falso) → a hazard. Teaches why
  consistency matters.
- **Open-world assumption** — absence isn't falsehood; you can't win by leaving
  things out. A real, mind-bending concept as a puzzle constraint.
- **Vocabulary reuse reward** — mirrors the 5-star Linked Open Data model:
  interoperability pays.

## Prestige — "Reflect" (self-description)

The graph builds an ontology *of itself* (a meta-graph). Reset the lower layers,
keep a **Reflexivity** multiplier. Endgame escalation: the graph proposes its
own concepts and goals — it writes its own ontology (Paperclips-style narrative).

## Economy layer (core pillar)

Money and knowledge are intertwined from the start — not a second act.

**Second currency: Capital.** Earned by **selling** knowledge to AI buyers.
Selling is **exhaustive** — it consumes the knowledge you sell. That creates the
game's central tension:

> **Sell vs keep.** Cash out knowledge for capital now, or hoard it to raise
> quality, unlock ontologies, and feed your own AI (which makes future knowledge
> cheaper). The whole game is this tug-of-war.

### Monetization arc: sell early → rent late

The business *matures* over the game, mirroring the real data economy:

- **Early — sell/exhaust.** You're a scrappy data vendor; sell raw knowledge for
  cash, and it's gone. Commoditized.
- **Late — rent/platform.** Once your graph + AI are big enough, you unlock
  **recurring rent**: companies pay for *access* (non-exhaustive). You've become
  infrastructure. Renting is the reward for scale, not an early option.

### Buyers pay for quality (the economy rewards the theory)

Price is gated by the mechanics you already have — money loops *back into* the
knowledge system, it isn't a parallel grind:

- **Consistent** graphs (no ex-falso blowups) → premium.
- **Provenance-tracked** data (PROV-O) → premium; buyers care where data came from.
- **Well-typed & deduplicated** (Curators / `owl:sameAs`) → higher grade.

### Spend Capital on

Compute (GPUs), better Harvesters/Extractors, bootstrap datasets, and **AIs**.

### AI: build vs buy (a real strategic fork)

- **Subscriptions (buy)** — pay per use; instant; a constant drain (opex).
- **Own model (build)** — big upfront cost + compute/GPUs; compounding, cheaper
  long-run (capex).

**Authentic feedback loop:** an LLM you rent/own auto-extracts *cheap but noisy*
triples — but it **hallucinates**, so your Reasoner/Curators must **ground** and
validate them against the graph before they count. This is how real KG+LLM
systems work, as a mechanic.

### Provenance / licensing (ethics — topical & faithful)

High-provenance data sells for more. Cheap shortcuts (unlicensed bulk datasets,
ungrounded LLM output) earn fast capital but risk a **lawsuit hazard** — a
penalty event. Provenance is tracked via PROV-O (already in the glossary). It's
satirical, it's the actual current AI-data debate, and it's accurate.

### Balance caution

Keep pricing tied to knowledge quality so Capital never becomes a disconnected
side-grind. The sell-vs-keep decision must stay meaningful at every stage.

## Visual reward

- Each prestige unlocks a bigger, prettier graph "bloom."
- Ontologies render as colored clusters; digital twins as special nodes.
- Progress you can *see*, not just numbers climbing.

## Hard constraints (do not violate)

- **Simulate in numbers; render a representative graph.** A literal node per
  triple will not render on mobile. Use level-of-detail (aggregate/sample nodes,
  cap visible count) and a **WebGL** renderer — candidates: **sigma.js** or
  **cytoscape.js**, not raw SVG/d3 for the big blooms.
- The graph is the **reward surface**, not the source of truth for balance.

## Deferred (not in the core design yet)

- **Colleagues / team** as a managed resource (ontologists, data engineers,
  curators, ML engineers, each buffing a mechanic). Parked to control scope;
  revisit once the core loop is fun.

## Open questions

- Exact numeric balance / cost curves.
- Pacing of the sell→rent transition (what scale unlocks renting).
- How domains are sized and sequenced toward world coverage.
- How self-description manifests mechanically (just a multiplier, or does the
  meta-graph unlock new play?).
- Theme/tone: dry-academic, sci-fi-AI, or playful.
