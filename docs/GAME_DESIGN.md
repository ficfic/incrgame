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

## Prestige — "Reflect" (self-description)

The graph builds an ontology *of itself* (a meta-graph). Reset the lower layers,
keep a **Reflexivity** multiplier. Endgame escalation: the graph proposes its
own concepts and goals — it writes its own ontology (Paperclips-style narrative).

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

## Open questions

- Exact numeric balance / cost curves.
- How self-description manifests mechanically (just a multiplier, or does the
  meta-graph unlock new play?).
- Theme/tone: dry-academic, sci-fi-AI, or playful.
