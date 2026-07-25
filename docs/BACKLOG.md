# Backlog

The running "what's next" list. Keep it current so any session can pick up
without being re-briefed. Move finished items to **Done** with a date.

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
- [ ] **▶ NEXT: M3, re-scoped per agents** — (1) graph rebind: edges←triples,
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
