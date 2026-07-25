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

**Inference is the compounding multiplier** *(labeled game simplification — see
note).* *Reasoners* derive new edges from edges you already have: forward-chaining
**materializes the deductive closure**, which is larger than what you asserted →
a production multiplier. This is the core dopamine loop; the rest of the design
serves it.

> **Label (per our accuracy rule):** in real logic, entailment is *monotonic* and
> the closure is *finite* — a reasoner terminates at a fixpoint; it does **not**
> "accelerate" or run away. The game treats it as unbounded "compounding" for
> fun and **bounds it mathematically** in `ECONOMY_MODEL.md`. The Field Notes
> must state this so players don't learn something false.

## Resource ladder

Each rung feeds the next:

1. **Data** — raw; tapped or auto-harvested (the "cookie").
2. **Triples** — subject→predicate→object *edges*; the atomic unit.
3. **Entities** — *nodes*; emerge when enough triples reference the same thing.
4. **Taxonomies** — *hierarchies* (is-a / subclass trees); the simpler ordering
   step before full ontologies. (Real: a taxonomy is `rdfs:subClassOf` structure.)
5. **Ontologies** — schemas organizing entities into typed clusters with rich
   axioms; unlocking one opens a new **domain** to model.
6. **Digital Twins** — a fully-modeled domain; a high-prestige mega-node.

## Generators / upgrades

- **Harvesters** — auto-produce Data.
- **Extractors** — Data → Triples.
- **★ Reasoners** — infer new Triples *from the existing graph* (the compounding
  star mechanic).
- **Curators** — merge duplicate entities → quality multiplier.
- **Schema builders** — Triples → Taxonomies → Ontologies.
- **★ AI Agents** — produce triples *fast but error-prone* (see automation below).
- **Orchestrators** — agents managing agents (late automation tier).

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

## Prestige & endgame — "Reflect" (self-description as escalating agency)

Self-description is the game's crown jewel and the payoff of the ominous spine.
It escalates in **four stages** that ride the dread curve — the joke slowly
curdles into awe. Theoretically honest throughout: RDFS/OWL are themselves RDF,
so a graph describing itself is real metamodeling, and a *universal* knowledge
graph genuinely would contain a representation of its own authors.

1. **Reflection (prestige).** The graph builds an ontology *of itself* (a
   meta-graph). Reset lower layers, keep a permanent **Reflection** multiplier.
   *(Named "Reflection" — metamodeling/self-reference — deliberately NOT
   "Reflexivity", which is the distinct `owl:ReflexiveProperty`, x-relates-to-
   itself.) The joke is still funny here.*
2. **It proposes its own goals.** Post-Reflection, the graph starts *suggesting*
   which domains/axioms to model next — it begins setting your objectives
   instead of you setting them. *First chill.*
3. **It self-operates.** The graph runs its own Harvesters/Reasoners and
   eventually makes its own **sell-vs-keep** calls. You drift from operator to
   overseer. *The joke has curdled.*
4. **It models you (fourth-wall climax).** "All the world's knowledge" includes
   *you* — the company, the player, the game itself. A node for the player
   appears; the thing you built to model everything models its modeler. The
   screenshot ending; satire and awe land in the same beat.

Because the horizon is endless (no true win), these stages deepen across
prestige loops rather than ending the game.

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

## Solo play, automation & AI agents (locked)

**You play alone — no people management.** Managing colleagues would make this a
tycoon game; that's a different genre. Instead your workforce is **AI agents**: a
lone operator commanding a swarm of bots. (More on-theme anyway.)

**The opening: manual, then automate.** You start with one computer, connecting
nodes *by hand* to feel the atoms of the graph — then buy automation and graduate
out of manual work. Classic idle arc.

**AI agents + human-in-the-loop.** Agents produce triples fast but with an
**error rate that's high early and decays** as tech matures (see
`docs/ECONOMY_MODEL.md`). **You review batches (HITL)**; unreviewed errors poison
quality and can trigger inconsistency → the lawsuit hazard. The tension: run bots
dirty-and-fast, or review and stay clean. **Agent orchestration** (bots managing
bots) is a later automation tier. This is thematically exact — it's real
hallucination + grounding, as a mechanic.

## Events — choose-your-own-adventure (locked)

Branching **CYOA events** fire at milestones: a situation + 2–4 choices, some
gated by game state, with consequences that ripple (resources, quality, lawsuits,
narrative flags). Some events **fork into multi-step** mini-arcs. They carry the
satirical-startup voice and the ominous spine, and are the delivery vehicle for
the emergent motivation below.

## Motivation (emergent, not up-front)

Start as a **pure cash-grab startup** — cynical, funny. Then **slowly reveal**
(through CYOA + the self-description arc) that the graph is needed to solve
something existential. The ominous spine *becomes* the stakes. Do **not** state a
"save the world" goal up front — it would clash with the comedy; let it emerge.

## Real vs abstract

**Abstract mechanics, real nods.** Numbers and mechanics stay abstract (so the
game is balanceable and fun); names and domains nod to real ontologies. Literal
real-world data would wreck balance and mobile performance.

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

## Domains (branching tech-tree, mechanically distinct)

You conquer knowledge **domain by domain** toward world coverage. After a starter
domain, domains open as a **branching tech-tree** (choose your path — replayable,
strategic). Each domain teaches a **real ontology**, gets a **distinct mechanical
twist** from that field's real nature, and a satirical "we're pivoting to ___"
beat. As coverage spreads, the graph knows more of the world — feeding both the
north star and the ominous "it's modeling everything" climax.

| Domain | Real ontology | Mechanical twist | Satire beat |
|---|---|---|---|
| **General knowledge** *(starter)* | Wikidata, schema.org | Broad but shallow: high volume, low value/triple; gentle onboarding to triples. | "A search engine, but worse" |
| **Biology** | Gene Ontology, OBO | Deeply hierarchical → subclass/transitivity reasoning is overpowered here; rewards the compounding engine. Buyers pay prestige, not cash. | "We're going to cure aging" |
| **Finance** | FIBO, XBRL | Data decays fast → hoarding loses value; pushes toward the **sell** side of sell-vs-keep. Teaches freshness. | "Disrupting fintech" |
| **Medicine** | SNOMED CT, FHIR | Regulated → premium prices, but the provenance/licensing lawsuit hazard bites hardest (patient privacy). | "Move fast, break patients" |
| **Law** | LKIF | Rule-heavy → OWL axioms & consistency dominate; ex-falso hazard nastiest. Law-about-law foreshadows self-description. | "AI replaces lawyers (this is fine)" |
| **Engineering / IoT** | DTDL, W3C WoT | Live-syncing → unlocks the **Digital Twin** tier; real-time data streams. | "Smart everything" |

(Lineup is a first pass; domain sizing, unlock gating, and tree shape are open.)

## Cut (deliberately not in the game)

- **Colleagues / people management** — would make this a tycoon game (wrong
  genre). Replaced by AI agents. You play solo.

## Open questions

- **Manual-phase minigame:** a connect-the-nodes puzzle (match-3-adjacent) for
  the early hand-made triples — thematically apt, but puzzle+idle can clash.
  Prototype it; keep it to the early phase only if it stays.
- Exact numeric balance / cost curves (see `docs/ECONOMY_MODEL.md` — tune by
  playing).
- Pacing of the sell→rent transition (what scale unlocks renting).
- How domains are sized and sequenced toward world coverage.
- How much the AI-agent HITL review loop asks of the player (attention budget).
- How self-description manifests mechanically (just a multiplier, or does the
  meta-graph unlock new play?).
- Theme/tone: dry-academic, sci-fi-AI, or playful.
