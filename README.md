# Semantic Drift

*(working repo: `incrgame`)*

### An incremental game about rebuilding the world's knowledge after AI ate it.

You start with one concept. Not a metaphor for one concept — literally one:

> **entity** — *"that which is perceived or known or inferred to have its own
> distinct existence (living or nonliving)."*

Everything else is gone. There are **107,518** others, and you get them back one
at a time.

> **Status: live and playable** — <https://ficfic.github.io/incrgame/> (PWA,
> iOS-first). Core loop shipped (save v4); the concept graph is now real data.
> Next milestones in [`docs/ROADMAP.md`](docs/ROADMAP.md), current state in
> [`docs/HANDOVER.md`](docs/HANDOVER.md).

## The graph is real

The concepts you recover are not procedurally generated filler. They are
**[Open English WordNet](https://en-word.net/)** — a published lexical ontology,
CC BY 4.0, pinned to its 2025 edition:

- **107,519 concepts**, each with its real name and its real definition
- **45 semantic domains** — `noun.animal`, `noun.cognition`, `verb.weather`, …
- **88,090 is-a edges**, plus meronymy, entailment, causation
- **17 levels deep**, all converging on one root

Recovery order is breadth-first from `entity`, so the world comes back in the
shape it actually has: the categories first, then the things. `abstraction` and
`physical entity` before `dry ice` and `paralanguage`.

The coverage percentage in the HUD has a **real denominator**. When it says
0.0028%, that is three concepts out of 107,519.

## The premise is real too

Training generative models on recursively generated data causes **model
collapse** — and the first thing to disappear is the tail of the distribution
([Shumailov et al., *Nature*, 2024](https://www.nature.com/articles/s41586-024-07566-y)).
Rare things go first.

WordNet's tail is `benthos`, `kickshaw`, `biont`. In this game they are the last
things you get back. The joke and the citation are the same object.

## The loop

**Survey the ruins → recover a concept → recovered concepts generate Datums →
Datums pay to recover more.** Machines automate the recovery; automation buys
out every manual verb, because an idle game that demands babysitting isn't an
idle game.

## It's secretly educational

Every mechanic maps to a correct, real concept, sourced in
[`docs/GLOSSARY.md`](docs/GLOSSARY.md). Where the game simplifies theory, it
labels the simplification. Beat the game and you've genuinely learned how
knowledge graphs work — using one.

## No AI-written prose. At all.

The game satirises AI slop, so shipping AI-generated prose would make it the
thing it mocks. Every sentence a player reads is either **written by the owner**
or **quoted verbatim from a licensed dataset with attribution** — the pipeline
generates structured data only, never sentences. This is enforced as a project
rule (`CLAUDE.md`) and it is as load-bearing as "never break a save."

## Built for

GitHub Pages · mobile browsers · developed entirely through Claude Code on a
phone. Stack: a pure-**TypeScript** headless engine ·
[**break_eternity.js**](https://github.com/Patashu/break_eternity.js) · **Svelte**
UI · **PixiJS** graph · **Vite + PWA** · **Vitest** (see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

```
npm install
npm run ontology   # regenerate the concept data (clones the pinned upstream)
npm run dev
npm test
```

## Repo

- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — the full design.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/SPEC.md`](docs/SPEC.md) — the technical contract.
- [`docs/ECONOMY_MODEL.md`](docs/ECONOMY_MODEL.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md) — the numbers and the build plan.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) · [`docs/SIMPLIFICATIONS.md`](docs/SIMPLIFICATIONS.md) — real theory ↔ game terms, with the labels we owe.
- [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md) — **every third-party dataset and its licence.**
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why things are the way they are.
- `CLAUDE.md` — how this project is built (rules & guardrails).
- `.claude/agents/` — the five in-character review agents.

## Licence

- **Code**: MIT — see [`LICENSE`](LICENSE).
- **Original docs & content**: CC BY 4.0.
- **Concept data**: Open English WordNet, CC BY 4.0, derived from Princeton
  WordNet. Full notice in [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md).
