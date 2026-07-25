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
- [x] **VERTICAL SLICE of the real design shipped** (2026-07-25): speed-vs-truth
      loop end to end. Provenance (verified/unverified/drifted), drift scaled by
      graph size and synthetic ancestry, fidelity² gating on recovery, HITL
      review desk with acceptance sampling, Orchestrator buyout, offline
      banking + absorb, prestige that inherits your own machine output, one
      branching vignette with empty owner prose slots. Save **v5**, additive
      migration (every v4 statement becomes verified — you placed them by hand).
      63 tests. See `docs/VISION.md`, DECISIONS.
- [x] **`docs/VISION.md` written** — the missing "why". Read first, every session.
- [x] **Dataset curated 107,519 → 4,096** — nouns from `entity`, one root, one
      concept per label, offensive senses excluded. 8.6 MB → 348 KB.
- [x] **Fixed from the agent round**: CI red (node types in tsconfig), the
      failed-chunk retry storm (~600 req/s from the render loop), `entity`
      being folded away at claim 240, the false README claims, the misleading
      "+0.25 Triples/s" on Orchestrator, and `buyGenerator` silently dropped
      during the engine rewrite (caught by a test, not by me).

## ▶ Next — in order

- [ ] **★ BALANCE PASS — the headline design claim is still not true.** Measured
      over 12h sims after the agent round: gen-1 attentive completes 4096/4096 in
      ~4h; gen-1 idle reaches 97.5% in 8h (a healthy 1.1x gap — that part is
      fixed). Fidelity ceilings DO fall by generation (100% / 96% / 91%), so the
      recession is real in trust but not in coverage. VISION's "unreachable by
      construction" is therefore intent, not behaviour. Chad has the numbers and
      the suggested curves.
- [ ] **Vignette #1 fires at ~3 min when `buy-review` (auto-review x1.6) is
      literally x1.6 of zero** — no Orchestrators are affordable yet. Either
      bundle a free Orchestrator into that choice or move the trigger later.
- [ ] Review desk shows a concept + gloss under the word "statement" — but a
      statement is a triple, not a dictionary entry (prof-veritas Part 6). The
      real parent is already shipped and loaded; rendering `dog is-a canine`
      would fix the mis-teaching AND make the graph the real taxonomy.
- [ ] `aiAgent` declares `produces: 'triples'` but nothing reads it; if it ever
      enters the roster it costs 12,000 Datums and produces nothing. The
      `produces` field is decorative and actively misleading.
- [ ] DECISIONS.md says "newest at the top" and the last two sessions appended
      at the bottom. Fix the file or the convention.
- [ ] Pin the SELECTION rules in a test (checksum of the label sequence): the
      frozen-order contract names only `SRC_REF`, but the curation proved the
      selection rules renumber the world just as thoroughly.

- [ ] **★ OWNER PROSE — the game has almost no words, on purpose.** Owner-written
      per the guardrail: (1) the **first vignette** in `src/content/vignettes.ts`
      (title, body, three choice labels — the mechanical effects already render);
      (2) the **cold open**; (3) **ticker lines** (`docs/TICKER_LINES.md`);
      (4) **rename `Ingestion Pipeline™`** — it is pre-pivot startup satire
      sitting under a card about knowledge rotting, and it is the single most
      "lazy reskin" artifact in the build; (5) does the title still fit?
- [ ] **BALANCE PASS — the slice is a first tuning, not a balanced economy.**
      Simulated: an attentive player reaches ~4,095/4,096 concepts in ~4h and
      95% fidelity; an idle player who never hand-reviews floors at ~43-49%
      fidelity and is roughly 2× behind at every checkpoint. Open questions:
      is 2× too strong a pull toward manual play given HITL must stay optional?
      Should the asymptote bite harder so the plateau arrives before completion?
      Chad should price this properly.
- [ ] **Prose-free vignette #2 and #3** — one vignette does not prove a branching
      narrative. Needs at least a fork that *matters* two beats later.
- [ ] **Use the real is-a parent when drawing edges.** The dataset ships each
      concept's true parent and the loader exposes it; the engine still wires new
      nodes to a hash-picked anchor (`mixId`). Wiring to the real parent makes
      the on-screen graph the actual taxonomy. Engine change + save migration.
- [ ] **Show rot ON the graph**, not just in the bar — drifted nodes should
      visibly corrupt on the canvas. The corruption function already exists
      (`corrupt()` in `src/shell/ontology.ts`); the renderer doesn't use it yet.
- [ ] **Replace the Princeton notice with the correct upstream text** — the one
      in ATTRIBUTION is WordNet 3.0/2006; this data carries the 3.1/2011 variant
      plus the OEWN team's own copyright line. Fetch `WNDB_License.txt` verbatim.
- [ ] Mark the "Wikidata / Open English Namenet — CC0" row in ATTRIBUTION as
      UNVERIFIED — no LICENSE file was found at that repo root.
- [ ] **Theory debts from prof-veritas** (still owed, mostly one-line fixes):
      SIMPLIFICATIONS rows for WordNet-as-"ontology", DAG-flattened-to-tree, and
      synset-shown-as-one-word; glossary rows for synset, hypernymy, troponymy,
      lexicographer file, model collapse; and "late collapse" → "early collapse"
      in GAME_DESIGN (Shumailov's tail-loss phase is EARLY collapse).

- [ ] **(superseded, kept for history)** ★ OWNER PROSE — the pivot's copy is unwritten and it shows.** The
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
