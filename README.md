# incrgame

### An incremental game about turning *all the world's knowledge* into one graph — and what happens when it starts describing itself.

You start as a scrappy startup scraping data. You end as the infrastructure the
entire AI industry rents from. Somewhere in between, the graph you built to model
everything gets big enough to model *you*.

It's a satire of the AI gold rush. It's also, underneath, an accurate course in
the semantic web — RDF, OWL, reasoning, RAG, digital twins. You laugh at
"Ingestion Pipeline™," then you learn it's an RDF harvester.

> **Status: design complete, not yet built.** The full concept lives in
> [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md). Code is next.

## The loop

**Model knowledge → to go faster you need capital, compute, and AIs → you get
them by monetizing the graph → that lets you model more → coverage climbs toward
"all knowledge."**

- **Harvest → Triples → Entities → Ontologies → Digital Twins.** A real
  semantic-web ladder.
- **Inference compounds.** Reasoners generate new edges from edges you already
  have — the richer the graph, the faster it grows. (Real. This is the engine.)
- **Sell vs keep.** Every triple is a fork: cash out now, or hoard it to raise
  quality and feed your own AI. This tension is the whole game.
- **Data vendor → platform.** Sell raw knowledge early; rent access as
  infrastructure once you're big enough.
- **Conquer domains** — general → biology → finance → medicine → law → IoT —
  each a real ontology (Wikidata, Gene Ontology, FIBO, SNOMED, LKIF, DTDL) with
  its own twist.

## The ending

Self-description escalates: the graph earns a prestige, then proposes its own
goals, then runs itself, then models the player and the game. The joke curdles
into awe. A universal knowledge graph really would contain a node for its authors
— so it does.

## It's secretly educational

Every mechanic maps to a correct, real concept, sourced in
[`docs/GLOSSARY.md`](docs/GLOSSARY.md). Where the game simplifies theory, it
labels the simplification. Beat the game and you've genuinely learned how
knowledge graphs work.

## Built for

GitHub Pages · mobile browsers · developed entirely through Claude Code on a
phone. Planned stack: vanilla **TypeScript + Vite** ·
[**break_eternity.js**](https://github.com/Patashu/break_eternity.js) for big
numbers · **localStorage** saves · a **WebGL** graph renderer.

## Repo

- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — the full design.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — real theory ↔ game terms, with sources.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why things are the way they are.
- [`docs/BACKLOG.md`](docs/BACKLOG.md) — what's next.
- `CLAUDE.md` — how this project is built (rules & guardrails).
- `.claude/hooks/guardrails.sh` — enforced guardrails (destructive-git + secret
  blocks; it's a public repo).
