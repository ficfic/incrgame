# Backlog

The running "what's next" list. Keep it current so any session can pick up
without being re-briefed. Move finished items to **Done** with a date.

**⚡ Fresh session? `docs/HANDOVER.md` is the fast path** — current loop, live
URL, invariants, and the next moves in one page (written 2026-07-25).

## Now / next

- [x] Game concept chosen: **knowledge-graph incremental** (see
      `docs/GAME_DESIGN.md`). Core engine locked: inference = compounding.
- [x] Educational angle set: "faithful but playable"; GLOSSARY.md is the
      accuracy source of truth; mechanics teach real theory.
- [x] Economy layer designed: core pillar, sell/exhaust, AI build-vs-buy fork,
      provenance/licensing ethics. Central tension = "sell vs keep".
- [x] North star + macro-loop locked: model all world knowledge (domain by
      domain), endless horizon + prestige, sell-early/rent-late arc.
- [x] Tone locked: satirical startup surface + ominous awe spine; satire wraps
      exact theory.
- [x] Self-description designed: 4-stage escalating agency + fourth-wall climax.
- [x] Domains designed: branching tech-tree, mechanically distinct, each mapped
      to a real ontology.
- [x] Solo play + AI-agent automation + HITL error mechanic locked; colleagues cut.
- [x] Taxonomies tier, CYOA forking events, emergent motivation, abstraction
      stance locked.
- [x] Economy math model drafted (`docs/ECONOMY_MODEL.md`) with borrowed numbers.
- [x] Four in-character review agents built (prof-veritas, chad-liquidity,
      the-graph, the-auditor); house voice set to full-wacky-honesty-underneath.
- [ ] Shake down the review agents on real work once code exists (they've been
      hired but not yet battle-tested). Prof. Veritas already audited the docs
      (MINOR ISSUES → fixed) — the loop works.
- [ ] Grow `docs/graph/game.ttl` (the game modeled as a knowledge graph) toward
      being the actual game-content data source; optionally express GLOSSARY as
      triples too. Keep it to structured content — prose stays prose.
- [ ] Design the CYOA event format/schema (situation, choices, gates, flags, forks).
- [ ] Prototype the manual-phase connect-nodes minigame (decide keep/cut).
- [ ] Flesh out remaining open questions (sell-vs-keep pacing, sell→rent unlock,
      domain sizing/gating, Field Notes format, HITL attention budget).
- [ ] Design the "Field Notes" codex format (in-game explainer + learn-more
      links to real specs).
- [x] Graph renderer chosen: **PixiJS** (WebGL, swappable) — see ARCHITECTURE.md.
- [ ] **Spreadsheet-prove the economy before M3** (Chad/Redditor): sim edges/K/$
      over ~10h; confirm sell-vs-keep genuinely flips and the inference loop
      doesn't explode or stall.
- [ ] **Design the "verb ladder"** (Chad #2): what the player actively *does* at
      min 5 / hr 2 / day 3 — a recurring decision every ~30–60s per stage.
- [ ] **Storyboard the first five minutes** (Chad #3): first screen, first tap,
      first graph node, first joke.
- [ ] **Spec domain twists as real rules with numbers** (Chad #9), incl. what
      Biology's "pays prestige" currency actually means.
- [ ] **Retention/session targets** (Chad #8): check-ins/day, session length,
      offline cap value — write the numbers to tune toward.
- [x] Architecture + stack locked (see `docs/ARCHITECTURE.md`): headless pure-TS
      engine + Svelte UI + PixiJS graph + Vite/PWA + Vitest.
- [x] Technical spine hardened + pre-build review passed (The Graph + Auditor);
      SPEC.md is build-ready (types, reducer, save, offline, RNG, PWA, deploy).
- [x] **M0 + M1 + M2 built** (2026-07-25, branch `claude/project-review-build-shub7f`):
      engine + tests (21 green), Svelte HUD, canvas mini-graph, PWA, deploy
      workflow, versioned save in IndexedDB, export/import, offline progress.
- [x] **Deployed to production** (2026-07-25): merged into the pinned branch,
      Pages run green — **live at <https://ficfic.github.io/incrgame/>**.
- [x] **M1.5 feedback round shipped** (2026-07-25): owner playtest → 3 review
      agents → integer costs/display, node/edge decoupling (crosslinks), ambient
      graph life, LOD densification past cap, pan/zoom, progress-driven palette,
      locked next-generator teaser. See DECISIONS.
- [x] **Polish round** (2026-07-25, owner-picked over M3-first): Datums rename,
      event ticker (mechanical lines; owner writes flavor — `docs/TICKER_LINES.md`),
      +1 float on Connect, graph pulse on buy.
- [x] **M1.6 one-substance rework** (2026-07-25, owner fork): headline = Triples,
      graph = exact projection, buying trims the web, save v2 migration
      (data→triples). RNG retired until M3.
- [x] **M2.0 Frontier Mining** (2026-07-25, owner core-loop fork after 3-agent
      review): edges drip Datums, Survey + tap-to-claim on canvas, forged
      overlay state, save v4 with old-web credit. See DECISIONS.
- [x] **PREMISE PIVOT + real ontology shipped** (2026-07-25, owner chips): the
      world's knowledge is lost to AI and the player recovers it, starting from
      one node — `entity`. Concepts are now **Open English WordNet** (CC BY 4.0,
      pinned `2025-edition`): 107,519 concepts, 45 domains, 88k is-a edges, in a
      frozen breadth-first recovery order. New: `scripts/build-ontology.mjs`,
      `public/ontology/` (53 chunks), `src/shell/ontology.ts`, canvas concept
      labels, a Recovered card showing the real definition, a coverage readout
      with a real denominator, in-game CC BY attribution, SW runtime caching.
      **Zero engine changes, zero save migration** — the core/skin boundary held.
      See `docs/ATTRIBUTION.md`, SPEC "Concept data", DECISIONS.
- [ ] **★ OWNER PROSE — the pivot's copy is unwritten and it shows.** The
      mechanics moved; the words didn't. Owner-written, per the prose guardrail:
      (1) the **cold open** — what a new player is told when they arrive holding
      one concept; (2) **ticker lines** for the recovery framing
      (`docs/TICKER_LINES.md` — the old batch is still unwritten too); (3) the
      **Recovered card's** framing words (currently the bare label "Recovered");
      (4) whether the title stays *Semantic Drift* post-pivot. Until this lands,
      the game reads as a mechanics demo wearing a premise.
- [ ] **Design: what the 45 real domains DO** (see GAME_DESIGN "Domains" note).
      Every concept already knows its domain and the UI already shows it — right
      now that's flavor, not mechanics. Candidates: per-domain coverage goals,
      domain-gated recovery, a domain-completion bonus. Chad should price it.
- [ ] **Use the real hierarchy in the loop.** The dataset ships each concept's
      is-a parent, and recovery order is a real tree walk — but the game still
      wires new nodes to a *hash-picked* anchor (`mixId` in `engine.ts`). Wiring
      to the actual parent would make the on-screen graph the real taxonomy.
      This one DOES touch the engine and DOES need a save migration — scope it
      properly, don't sneak it in.
- [ ] **Exploit the rare tail.** Model collapse eats low-frequency concepts
      first; the endgame should make recovering `benthos`/`kickshaw` feel like
      the last lights coming back on. Needs a mechanic, not just ordering.
- [ ] **Owner: write the first ticker-line batch** (`docs/TICKER_LINES.md`).
- [ ] **▶ NEXT after owner's polish verdict: M3, re-scoped per agents** — (1) graph rebind: edges←triples,
      nodes←entity emergence; data = fuel only (deletes the ambient bridge);
      (2) Extractor + Reasoner, multiplier consumes `resources.triples` and is
      SHOWN on screen ("Inference ×1.34"); (3) PixiJS bloom w/ production-driven
      motion (no production = still graph), pan/zoom carried over; (4) event
      ticker (Paperclips-style) — NEEDS OWNER-WRITTEN LINES (prose guardrail).
      Then M4 fast (sell = graph visibly shrinks — the payoff).
- [ ] Owner: on-device iOS install check (Safari if Edge won't) — still open.
- [ ] Shake down the review agents on the new code (the-graph on `src/core/`,
      chad-liquidity on the M1 feel, the-redditor on genre feel).
- [ ] (Later) ESLint boundary rule enforcing core-purity (no DOM in `core/`).

## Someday / maybe

- [ ] **Genre QoL furniture** (Redditor P6): stats page, achievements, number-
      notation toggle, settings panel, in-game changelog. Nearly free over a
      serializable GameState — put in the 🟡 ring.
- [ ] **Launch positioning** (Redditor P4): lead the r/incremental_games post with
      the semantic-web / anti-hype credibility, NOT the AI hook ("RDF, OWL
      reasoners, zero LLMs harmed in the content"). Wear the allergy on the sleeve.
- [ ] **Earn the Paperclips comparison or drop it** (Redditor P7): the self-
      description climax must be a real mechanical/narrative turn, not spooky
      flavor text — or stop name-dropping it.
- [ ] **Colleagues / team** resource (specialized: ontologist / data engineer /
      curator / ML engineer). Deferred to control scope; revisit post-core-loop.
- [ ] `add-ontology-content` skill — author domains/entities/edges as declarative
      data; write it once adding content is a repeated motion.
- [ ] `save-migration` skill — scaffold a versioned save + migration step safely.
- [ ] `release`/deploy skill (build → verify → push → Pages) — write it once the
      deploy flow has been done manually twice.
- [ ] Build/verify (SessionStart) hook — once there's a game to build.
- [ ] Optional `decide` skill wrapping the chip-based decision flow + auto-log.

## Done

- [x] 2026-07-25 — Foundation: lean CLAUDE.md, durable memory files
      (DECISIONS.md, BACKLOG.md), and enforced guardrails
      (`.claude/hooks/guardrails.sh`: destructive-git block + secret scan).
- [x] 2026-07-25 — Research: incremental-game frameworks, starter repos, big-num
      libraries, and Claude Code best practices for a solo/mobile/public setup.
