# Game design — working concept

> Durable design memory. Sessions are ephemeral; this file is where the concept
> lives so any future session inherits it. It's a *working* design — update it
> as decisions land, and log notable changes in `docs/DECISIONS.md`.

## Pitch

**Title: _Semantic Drift_** (a real term — meaning shifting over time; in
ontology engineering, concept drift / ontology evolution. The graph slowly
rewrites what everything means as it wakes up.)

> ### ⚠️ READ `docs/VISION.md` FIRST. It outranks this file.
>
> ### THE CORE LOOP — as shipped 2026-07-28 (`docs/ECONOMY_SRR.md`, BUILT)
>
> **Speed versus truth, in four quantities: Words, Solid, Raw, Rot.** Machines
> make facts; a **watched** machine runs at 0.55× and its output arrives
> **Solid**, a **loose** one runs at full speed and its output arrives **Raw**.
> Raw rots into **Rot**, permanently. Review is the only brake: tap **Check**,
> or buy **Checkers** to buy it out at a worse rate.
>
>     factsPerSecond = min(0.4 × machines, 0.15 × Words)
>     stepCost       = 0 if held, else ceil(6 × 1.04^stepsThisRun)
>
> **Walking the story is the only income upgrade in the game** — you cannot
> extract relations about entities you do not hold.
>
> - **You cannot lose. You plateau** — the exponential step price against a
>   linear vocabulary cap. Words never fall.
> - **Prestige is `Retrain`**: keep your concepts, inherit 25% of what your
>   machines minted as Raw, and rot faster ever after. *"Unreachable by
>   construction" is NOT established in this build* — see VISION's status note.
> - **Nothing rots while you are away.** Absence banks work at the split you
>   left set; you return to a job, never to damage.
> - **HITL is never mandatory.** Checkers buy it out, worse per Solid.
>
> **⚠️ MOST SECTIONS BELOW ARE A DESIGN WE ARE NOT BUILDING.** The resource
> ladder, capital, selling, domains, Harvesters, Curators, Orchestrators and the
> four-stage Reflection endgame are **deleted from the code**, not merely
> unbuilt. They are kept here for their reasoning and their citations only. Read
> the "⛔ CUT" section before treating anything below as a plan.
>
> Player-facing prose is now **machine-drafted and owner-edited** (`CLAUDE.md`,
> reversed 2026-07-27) — but re-voicing this file is still not an agent's call.
>
> **Known stale, flagged rather than silently certified:** "Real vs abstract"
> (below) says *"No literal real-world data"* — that decision is **superseded**;
> the game now ships a real, licensed dataset as ground truth. See DECISIONS.

An incremental/idle game about **knowledge management** — you rebuild a
**knowledge graph**: recover concepts, restore triples, re-form entities,
reconstruct ontologies, and model **digital twins** of domains. The reward is a
large, beautiful graph that grows and reorganizes itself — and, eventually,
**describes itself**. "Universal Paperclips for ontologists."

### Why the premise is theory-faithful, not just a vibe

Model collapse is real and peer-reviewed: training generative models on
recursively generated data drives **early model collapse**, in which the *tails*
of the distribution — low-probability events — are lost first. (Shumailov et al.
define two phases and this is the first: *late* collapse is convergence to a
distribution with little resemblance to the original and much reduced variance.
Getting these the wrong way round, as this document did, is exactly the error
the theory-faithfulness rule exists to catch.) Note also that the result
concerns recursive training *without* fresh real data; the paper discusses
retaining original human-produced data as a mitigation, so "permanent" is a
stronger word than the paper supports ([Shumailov et al., *Nature*, 2024](https://www.nature.com/articles/s41586-024-07566-y)).
The rare tail goes first. WordNet's rare tail — `benthos`, `kickshaw`, `biont` —
is therefore what the player recovers **last**. The pacing curve and the
citation are the same object. Keep it that way; if a mechanic contradicts the
paper, the paper wins (`CLAUDE.md`, theory-faithfulness rule).

## North star & macro-loop

**The goal: restore all the world's knowledge as one graph.** The target is not
fictional either — it's the real ambition behind Cyc, Wikidata, and Google's
Knowledge Graph, and in this game it has a **real denominator**: the **4,096
concepts** the game actually ships (curated from Open English WordNet's 107,519
— see `docs/VISION.md` on why the lab bench is small on purpose). Coverage % is
an honest fraction, not a progress bar.

**Master progress: "world coverage %."** Approached **domain by domain**
(General → Biology → … ; full order TBD, see domain table); each domain is a
mini-arc that unlocks the next.
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

## The engine (locked) — ⛔ CUT, see below

**Inference is the compounding multiplier** *(labeled game simplification — see
note).* *Reasoners* derive new edges from edges you already have: forward-chaining
**materializes the deductive closure**, which is larger than what you asserted →
a production multiplier. This is the core dopamine loop; the rest of the design
serves it.

> **Label (per our accuracy rule):** in real logic, entailment is *monotonic* and
> the closure is *finite* — a reasoner terminates at a fixpoint; it does **not**
> "accelerate" or run away. The game treats it as unbounded "compounding" for
> fun and used to bound it mathematically in `ECONOMY_MODEL.md`, now deleted.
> As shipped there is no compounding at all: the Reasoner is a flat rate. The
> Field Notes must still state the real behaviour so players learn nothing false.

## Resource ladder — ⛔ CUT, see below

Each rung feeds the next:

1. **Data** — raw; tapped or auto-harvested (the "cookie").
2. **Triples** — subject→predicate→object *edges*; the atomic unit.
3. **Entities** — *nodes*; emerge when enough triples reference the same thing.
4. **Taxonomies** — *hierarchies* (is-a / subclass trees); the simpler ordering
   step before full ontologies. (Real: a taxonomy is `rdfs:subClassOf` structure.)
5. **Ontologies** — schemas organizing entities into typed clusters with rich
   axioms; unlocking one opens a new **domain** to model.
6. **Digital Twins** — a domain model **kept live-synced** to a (simulated) real
   system; a high-prestige mega-node. (Real: sync/liveness is the *defining*
   property — not just "a big finished model.")

## Generators / upgrades — ⛔ CUT, see below

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
- **Open-world assumption** — a query/CYOA where assuming "not stated = false"
  triggers a costly wrong call (you treat a missing fact as false and get burned).
  Teaches, by stinging you, that *absence ≠ falsehood*. (A real mechanic, not just
  flavor — Veritas gap #7.)
- **Vocabulary reuse reward** — mirrors the 5-star Linked Open Data model:
  interoperability pays.

## Prestige & endgame — "Reflect" — ⛔ CUT as described; prestige is `Retrain`

Self-description is the game's crown jewel and the payoff of the ominous spine.
It escalates in **four stages** that ride the dread curve — the joke slowly
curdles into awe. RDFS/OWL are themselves RDF, so a graph describing itself is
real metamodeling, and a *universal* knowledge graph genuinely would contain a
representation of its own authors.

> **Truth/fiction seam (labeled, per accuracy rule — S3 in SIMPLIFICATIONS.md):**
> stage 1 (self-*description*) is real metamodeling. Stages 2–4 (proposes goals →
> self-operates → agency) are **satire, not a consequence of metamodeling** —
> graphs don't wake up. A Field Note at the Reflection beat draws this line.

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

**Prestige ↔ coverage (how the two axes interlock — Chad gap #10):** **world
coverage persists** across prestige (it's the north star); Reflect resets only the
generator/K economy, which you then re-grind *faster* each loop via the Reflection
multiplier. The four self-description stages **unlock at coverage milestones**, so
the two axes interlock instead of competing (and coverage never brutally resets).

## Economy layer (core pillar) — ⛔ CUT, see below

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
**error rate that's high early and decays** as tech matures *(never built; the
shipped model is simply that loose machines make Raw and Raw rots)*. Unreviewed
errors poison quality and can trigger
inconsistency → the lawsuit hazard. **HITL review is OPTIONAL, never a chore:**
**Orchestrators** (bots managing bots) let you buy *out* of manual review —
dirty-cheap auto or clean-expensive auto — with manual batch review as an optional
min-max lever for tryhards. The tension is cheap-noisy vs expensive-clean, *not* an
attention tax. This is thematically exact — real hallucination + grounding, as a
mechanic — without demanding babysitting.

## Events — choose-your-own-adventure (locked)

Branching **CYOA events** fire at milestones: a situation + 2–4 choices, some
gated by game state, with consequences that ripple (resources, quality, lawsuits,
narrative flags). Some events **fork into multi-step** mini-arcs. They carry the
satirical-startup voice and the ominous spine, and are the delivery vehicle for
the emergent motivation below.

**Every choice must move at least one economic lever** (a resource, `Q`, a hazard
flag, an unlock) — if it doesn't change a number, it's a cutscene, not a decision
(Chad gap #11). **All event prose is human-written** (CLAUDE.md rule); the pipeline
wires up structure and consequences only, never the sentences.

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
  cap visible count) and a canvas renderer (2D — WebGL was specified as PixiJS and never built; swappable —
  see `ARCHITECTURE.md`), not raw SVG/d3 for the big blooms.
- The graph is the **reward surface**, not the source of truth for balance.


## ⛔ CUT — deleted from the code, not merely unbuilt

`docs/VISION.md` outranks this file, and on 2026-07-28 the code caught up with
it. These are kept for their reasoning; a session that implements them is
working against the vision, not toward it.

- **Capital, and the sell-vs-keep tug-of-war.** There is one currency and it is
  **Solid**. `sell`, `refine` and `capital` no longer exist in any form. **CUT.**
- **The six-tier resource ladder** (data → triples → … → twins), `TIER_LADDER`,
  `RESOURCE_LABELS` and `ratePerSecond`. **CUT.**
- **The inference multiplier as "the core dopamine loop".** The Reasoner is a
  flat 2.2 facts/s per unit, always Solid, capped by the same vocabulary join as
  everything else. Nothing compounds. **CUT as described.**
- **Attention** — the pool, the bookings, the supervision dial. Replaced by one
  watched/loose toggle per machine (owner, 2026-07-27). **CUT.**
- **Harvesters, AI Agents, Orchestrators, Curators.** Three machines ship:
  Extractor, Reasoner, Checker. **CUT.**
- **Domains and the domain tech-tree.** The data carries 26 WordNet categories;
  no mechanic reads them. Real, unbuilt, and not "the plan".
- **Vignettes as modal CYOA events.** The story is the lane graph now
  (`src/core/starmap.ts`); `chooseOption`, `modifiers` and `flags` are gone.
  The branching-narrative requirement in VISION is met by lanes, not modals.

## 🕓 NOT SCHEDULED — data exists, mechanic does not

- **The domain tech-tree.** Every concept knows its WordNet category and the
  data ships 26 of them, but `DomainId = 'general'` and nothing gates on it.
  Real, unbuilt, and worth building — but not "the plan" until it is designed.

## Domains (branching tech-tree, mechanically distinct)

> **Post-pivot note (2026-07-25, corrected).** The shipped dataset carries **26
> real semantic domains** — WordNet's *noun* lexicographer files (`noun.animal`,
> `noun.cognition`, …). WordNet defines 45 in total, but the curated build takes
> nouns only, so 26 is what a player can actually encounter. Every concept knows
> which one it belongs to, and the recovery card shows it. That is a domain
> system we get for free and should exploit *before* building the tech-tree
> below. Open question for design: do the 26 WordNet domains become the
> early-game map, with the ontologies in the table below as later,
> separately-licensed expansions? Licences for those are already checked in
> `docs/ATTRIBUTION.md`.

You restore knowledge **domain by domain** toward world coverage. After a starter
domain, domains open as a **branching tech-tree** (choose your path — replayable,
strategic). Each domain teaches a **real ontology**, gets a **distinct mechanical
twist** from that field's real nature, and a satirical "we're pivoting to ___"
beat. As coverage spreads, the graph knows more of the world — feeding both the
north star and the ominous "it's modeling everything" climax.

| Domain | Real standard *(kind)* | Mechanical twist | Satire beat |
|---|---|---|---|
| **General knowledge** *(starter)* | Wikidata, schema.org | Broad but shallow: high volume, low value/triple; gentle onboarding to triples. | "A search engine, but worse" |
| **Biology** | Gene Ontology, OBO | Deeply hierarchical → subclass/transitivity reasoning is overpowered here; rewards the compounding engine. Buyers pay prestige, not cash. | "We're going to cure aging" |
| **Finance** | FIBO, XBRL | Data decays fast → hoarding loses value; pushes toward the **sell** side of sell-vs-keep. Teaches freshness. | "Disrupting fintech" |
| **Medicine** | ⚠️ **SNOMED CT dropped — not openly licensed.** Replace with an openly licensed source (MONDO / HPO / the open NCI Thesaurus subset) before building this domain. FHIR stays as the exchange format. | Regulated → premium prices, but the provenance/licensing lawsuit hazard bites hardest (patient privacy). | "Move fast, break patients" |
| **Law** | LKIF | Rule-heavy → OWL axioms & consistency dominate; ex-falso hazard nastiest. Law-about-law foreshadows self-description. | "AI replaces lawyers (this is fine)" |
| **Engineering / IoT** | DTDL, W3C WoT | Live-syncing → unlocks the **Digital Twin** tier; real-time data streams. | "Smart everything" |

*(Not all of these are ontologies: Wikidata is a knowledge base, schema.org a
vocabulary, XBRL a taxonomy, FHIR an exchange format, SNOMED CT a terminology.
The game labels each kind honestly — accuracy rule.) Lineup is a first pass;
domain sizing, unlock gating, and tree shape are open.*

## Cut (deliberately not in the game)

- **Colleagues / people management** — would make this a tycoon game (wrong
  genre). Replaced by AI agents. You play solo.

## Open questions

- **Manual-phase minigame:** a connect-the-nodes puzzle (match-3-adjacent) for
  the early hand-made triples — thematically apt, but puzzle+idle can clash.
  Prototype it; keep it to the early phase only if it stays.
- Exact numeric balance / cost curves (`src/content/machines.ts` and the
  constants at the top of `src/core/engine.ts` — tune by playing).
- Pacing of the sell→rent transition (what scale unlocks renting).
- How domains are sized and sequenced toward world coverage.
- How much the AI-agent HITL review loop asks of the player (attention budget).
- How self-description manifests mechanically (just a multiplier, or does the
  meta-graph unlock new play?).
- Theme/tone: dry-academic, sci-fi-AI, or playful.
