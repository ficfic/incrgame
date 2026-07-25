# Semantic Drift

*(working repo: `incrgame`)*

### An incremental game about the tension between building knowledge fast and building it *true*.

Your machines generate knowledge quickly. None of it is checked. Unchecked
knowledge **drifts** — definitions rot into nonsense — and reasoning over a
graph you half-trust doesn't degrade gracefully, it degrades fast.

Review is the only brake, and review is slow.

> **Status: vertical slice playable.** The full loop runs end to end —
> extraction, drift, human review, the plateau, prestige, and one branching
> vignette. **The prose is deliberately unwritten** (see below). Design intent
> lives in [`docs/VISION.md`](docs/VISION.md) — read that first.
> Live: <https://ficfic.github.io/incrgame/>

## The loop

```
 Extractors mint statements fast  →  everything they mint is UNVERIFIED
         ↑                                        ↓
    you want scale                     unverified knowledge DRIFTS
         ↑                                        ↓
    review less                    drifted knowledge stalls recovery
         ↓                          (Reasoners run at fidelity²)
    review more, grow slower  ←───────────────────┘
```

You cannot lose. You **plateau** — push generation up and fidelity falls until
recovery stops. Then you retrain, which is this game's prestige.

**And what you inherit is your own machine output**, unverified, rotting faster
than last time. Each generation starts richer and more wrong. Coverage climbs
while fidelity falls. 100% is unreachable by construction and gets further away
every run — which is the design, not a balance accident.

## The concepts are real

The graph is **[Open English WordNet](https://en-word.net/)** — a published
lexical database, CC BY 4.0, pinned to its 2025 edition:

- **4,096 concepts**, each with its real most-common word form and its real,
  human-written definition
- **26 WordNet categories** — `noun.animal`, `noun.cognition`, `noun.substance`, …
- a single hierarchy, **one root**, breadth-first from `entity`

They're real for one specific reason: **you can only see a definition rot if a
correct one was there to rot away from.** The dataset is the lab bench, not the
curriculum — so it's four thousand good concepts, not a whole lexicon.

Curated deliberately: nouns reachable from `entity` only (one true root), one
concept per word form (a synset is a set of synonyms; two identical cards read
as a bug), and senses the source marks as slurs are excluded. Changes are
recorded in [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md) and ship with the data
in `public/ontology/LICENSE.txt`.

## It's secretly a course in 2026 knowledge management

Not by explaining it — by making you do it. **Information extraction** floods
your graph. **Validation** is the only thing that keeps it usable. Manual review
is **acceptance sampling**: you inspect three items and the verdict applies to
the batch they were drawn from, which is how quality control actually works at
scale. **Subsumption reasoning** turns trusted statements back into recovered
concepts. And **model collapse** — training on recursively generated data,
[Shumailov et al., *Nature*, 2024](https://www.nature.com/articles/s41586-024-07566-y) —
is the prestige mechanic.

Where a mechanic simplifies real theory, the simplification is labelled
([`docs/SIMPLIFICATIONS.md`](docs/SIMPLIFICATIONS.md)); real definitions live in
[`docs/GLOSSARY.md`](docs/GLOSSARY.md).

## No AI-written prose. At all.

Every sentence a player reads is **written by the owner** or **quoted verbatim
from a licensed dataset with attribution**. The content pipeline emits structured
data only — numbers, ids, gates, graph shape. Never sentences.

Right now that means the vignettes render visible `⟨title — owner⟩` slots, and
their choices are legible from their generated numbers alone. **Unfinished on
purpose beats quietly fake.** A test asserts those fields are still empty.

## Built for

GitHub Pages · mobile browsers · developed entirely through Claude Code on a
phone. Pure-**TypeScript** headless engine ·
[**break_eternity.js**](https://github.com/Patashu/break_eternity.js) · **Svelte**
UI · canvas graph (PixiJS pending) · **Vite + PWA** · **Vitest**.

```
npm install
npm run ontology   # regenerate the concept data (clones the pinned upstream)
npm run dev
npm test
```

## Repo

- [`docs/VISION.md`](docs/VISION.md) — **why this exists. Read first.**
- [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md) — the design.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/SPEC.md`](docs/SPEC.md) — the technical contract.
- [`docs/ECONOMY_MODEL.md`](docs/ECONOMY_MODEL.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md) — numbers and build plan.
- [`docs/GLOSSARY.md`](docs/GLOSSARY.md) · [`docs/SIMPLIFICATIONS.md`](docs/SIMPLIFICATIONS.md) — real theory ↔ game terms.
- [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md) — every third-party dataset and its licence.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — why things are the way they are.
- `CLAUDE.md` — how this project is built (rules & guardrails).

## Licence

- **Code**: MIT — see [`LICENSE`](LICENSE).
- **Original docs & content**: CC BY 4.0.
- **Concept data**: Open English WordNet, CC BY 4.0, derived from Princeton
  WordNet. Notices in [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md) and
  `public/ontology/LICENSE.txt`.
