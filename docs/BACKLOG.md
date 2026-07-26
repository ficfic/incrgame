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
- [x] ~~Graph renderer chosen: **PixiJS**~~ — **REVERSED 2026-07-25, never built.**
      PixiJS was named as the locked renderer in five documents for months and
      was never a dependency. The graph is canvas 2D for lines and atmosphere;
      anything with text or a tap target is DOM. A WebGL renderer is not needed
      to draw a few hundred lines.
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
- [x] **The board became legible** (2026-07-26) — four rounds, all deployed:
      (1) ONE WORLD, ONE CAMERA — every part of the board had been computing its
      own pixels from `w`/`h`, so the graph sat 30px off centre and used 49% of
      the width; (2) semantic zoom — position carried the taxonomy, level of
      detail by weight; (3) **d3-force replaced hand-rolled placement** (owner:
      "we should not invent stuff") — free-floating, wiggly, draggable, with
      `sim.ts` + `detail.ts` replacing `layout.ts`; (4) labels decluttered in
      screen space, which finally makes overlap impossible rather than unlikely.
      See DECISIONS 2026-07-26 and ARCHITECTURE items 5–7.
- [x] **The deploy was silently broken for a day and a half** (2026-07-26): the
      core-purity gate grepped raw text for `\bwindow\b` and matched the word in
      a COMMENT, so build+publish were skipped while every push reported success.
      Fixed, plus: the browser check was reporting green WITHOUT RUNNING (11s for
      a 90s job), and then hung 9 minutes and blocked the deploy. Now a separate
      `visual` job that cannot take the site down. **"I pushed" is not "it
      shipped" — read the run.**
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

- [x] ~~**All-canvas board**~~ — **REVERSED the same day.** The hand-written
      canvas layout engine, hit-tester and label solver were deleted (−809
      lines) after they made the game unusable under pinch-zoom. The UI is
      ordinary DOM; the canvas draws lines and atmosphere. The *design* clause
      (every control sits in the graph) is retained.
- [x] **The attention economy replaced Datums** (2026-07-25, save v9): Datums
      deleted; attention is CAPACITY you allocate (free / booked / reserved),
      never a wallet. Discover books a slot for 18s; review books one for 25s;
      supervision reserves one per watched agent and its output arrives already
      verified at a 0.55× rate penalty. Agents are bought with VERIFIED
      statements — a graph you let rot cannot build another agent.
- [x] **Discovery takes time, and lands** (2026-07-25): radial cooldowns, the
      concept unnamed until it arrives, an eased landing from its ring slot, and
      a priority-ordered label pass that drops the least important label rather
      than smearing two on top of each other (`src/render/labels.ts`).
- [x] **iOS Edge zoom collapse fixed** (2026-07-25): the board is measured with a
      `ResizeObserver` on the canvas, not `window.innerWidth`, and pinch belongs
      to the game rather than the browser (viewport meta).
- [x] **Use the real is-a parent when drawing edges** (2026-07-25, no migration
      needed): the shell looks up the concept's true WordNet hypernym and passes
      it to `discover` as a plain integer, so the engine stays pure and the
      picture on screen is the actual taxonomy. `mixId` survives only as the
      fallback for a folded-away parent or an unloaded chunk. Existing `[a,b]`
      pairs stay valid — only new links change.
- [x] **the-graph's defect list cleared** (2026-07-25, save v10): offline now
      respects the supervision split (closing the game was +82% throughput and
      −100% verification, making the game's one real decision strictly worse
      than the app switcher); the headline stat renders large again (`stat-datums`
      → `stat-statements`); landings animate after a prestige (the seen-set never
      reset, so nothing ever eased in again for the rest of a save); discovery
      is refused before the clock starts and past the last concept (both were
      free-statement faucets); the review RNG seed is written back instead of
      guessed at; agent prices come from the content table, so an Extractor and a
      Reasoner no longer cost byte-identical amounts; the away ticker reports
      banked statements instead of a currency that no longer exists; label
      placement is capped at 32 candidates (it was ~230k rectangle tests/frame).

## ⛔ PROGRESSION IS BEING REPLACED (owner, 2026-07-26)

**Do not spend a session tuning the current economy.** The owner has said the
whole of progression is going to change, so every balance item below is on hold
until the new shape exists: the attention-cap curve, the cap-2 proposal, the
agent ladder, the review/supervision crossover, the 4h hand-play completion
time, and the "re-measure the economy" call-to-action added to VISION today.
They describe a system that is about to be discarded.

**What is NOT on hold**, because it is design-independent — these break any
progression, not just this one:
- save integrity (per-key backfill; a new resource must not brick a save)
- the array-aliasing bug that deleted the player's drawn graph
- eviction banking finished work instead of pending work
- a vignette door that scales a structurally-zero lever
- a story trigger only reachable in a state the HUD warns against
- "world recovered" shown at 6% coverage

When the new progression lands, re-read VISION's ⚠️ box: three of its claims
were measured false against the OLD engine, and the new design should not
inherit them by assumption.

## ▶ Next — in order

- [x] **★ EDGES THAT MEAN SOMETHING — BUILT 2026-07-25 (save v11).** Dotted
      lines for every connection the dataset offers; spend a slot to fill one
      in. A concept counts only while a line supports it, unchecked lines rot
      back to dotted, agents fill real ones and invent fake ones. Verified in a
      browser end to end: 4 concepts found dark, 3 lines filled → 3 statements,
      4 lit, attention grew 4→6. **This closes the hand-completion defect** —
      the world can no longer be finished by tapping Discover.
- [x] **WordNet's other relations shipped** (2026-07-25): `rel.json`, 123 lines
      — has part 63, studied in 47, has member 13. Colour-coded and labelled at
      the line midpoint. No new licensing, concept chunks byte-identical, no
      save impact. `exemplifies`, `attribute` and `instance_hypernym` excluded
      for cause (see DECISIONS).
      **⚠️ And it answered the question it was run to answer: 123 lines over
      4,096 concepts is a garnish, not a system — the first one is ~46
      discoveries in. Combined with ConceptNet's measured 547, the conclusion is
      that the SLICE is the problem, not the source.**

- [ ] **★ RE-SLICE THE DATASET — now the highest-value work on the list.**
      Select 4,096 concepts to maximise induced edge count (subject to staying
      connected under is-a with one root) instead of breadth-first from
      `entity`. Current slice: 90% attributes/communications/states/persons,
      9.7% concrete — and every interesting relation attaches to concrete
      things. Two independent measurements now agree (WordNet 123, ConceptNet
      547). ⚠️ Renumbers the world: needs the SYNSET-ID-keyed migration, link
      regeneration, unresolvable anchors folded to `foldedNodes` +1 each, and an
      explicit decision about `nextId` (it encodes "recovered = prefix
      0…nextId−1", which any re-slice destroys; a 4,096-bit bitmap is 512 bytes).
      See the 2026-07-25 correction block in DECISIONS.

- [ ] **ConceptNet pipeline — cleared by the-auditor, NOT yet built.** Worth
      ~547 lines at the CURRENT slice; likely far more after a re-slice, which
      is the argument for doing the re-slice first.
      Owner chose **WordNet + ConceptNet**. Steps, in order:
      1. **the-auditor signs off the ConceptNet licence** (data is CC BY-SA 4.0;
         share-alike binds the shipped data file, not our source). Nothing gets
         committed before this.
      2. Extend `scripts/build-ontology.mjs` to emit an **edge table**: WordNet
         is-a for the backbone, plus ConceptNet relations joined on label. Pin
         ConceptNet by release + checksum the same way WordNet is pinned.
      3. Re-pick the concept slice. The current top-4,096 holds only 148
         non-is-a edges because it is the abstract top of the tree; the slice
         should be chosen for EDGE DENSITY, not breadth-first depth. ⚠️ This
         renumbers the world — needs a save migration that preserves what the
         owner has already recovered, or a decision to accept a reset.
      4. Then, and only then, edges carrying a real predicate + trust + source.

- [ ] **★ HYBRID RENDERER — decided 2026-07-25 (measured), not yet built.**
      Canvas underneath for edges/substrate/rot; DOM pills on top for concepts;
      one shared transform. 7× cheaper at 240 nodes, 12× at 1000. Deletes
      `render/labels.ts`, `hit()`, and `band()`'s clamping. Pills are readable
      and finger-sized by construction, text stays crisp at any zoom, and the
      plane becomes infinite and pannable instead of a clamped band.

- [ ] **★ SIMPLIFY THE HUD WORDS — decided 2026-07-25.** fact / checked /
      unchecked / rotten / "how much you trust" / "how much of the world is
      back". "Provenance" and "acceptance sampling" come off the screen. Real
      terms stay in GLOSSARY and Field Notes.

- [ ] **(background) the old framing of the same problem, kept for the reasoning.**
      A link is a bare `[a, b]` pair. Nothing distinguishes one edge from
      another, nothing is stored *in* an edge, and coverage counts a concept as
      recovered forever once its node exists. That is why the stated goal is
      still reachable by sprinting clean early: coverage is a monotone ratchet.
      The fix under discussion (owner's own proposal) is edges-as-statements —
      a concept counts as recovered only while a live statement supports it, and
      building structure out of edges is what yields the resource that unlocks
      automation, as a THRESHOLD rather than a price. Needs owner decisions and
      numbers before any code: it touches the save and the win condition.
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
- [x] DECISIONS.md ordering settled 2026-07-25 — the convention was corrected to
      match the file (chronological, append at the END) rather than reordering
      500 lines of history.
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
- [x] **Use the real is-a parent when drawing edges** — done 2026-07-25. Needed
      no save migration in the end: existing pairs stay valid, only new links
      change.
- [ ] **Show rot ON the graph**, not just in the bar — drifted nodes should
      visibly corrupt on the canvas. The corruption function already exists
      (`corrupt()` in `src/shell/ontology.ts`); the renderer doesn't use it yet.
- [x] **Replace the Princeton notice with the correct upstream text** — done
      2026-07-25: `third_party/wordnet/WNDB_License.txt` is vendored byte-identical
      from upstream and embedded into the shipped `public/ontology/LICENSE.txt`.
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
- [x] **Use the real hierarchy in the loop** — done 2026-07-25 (duplicate of the
      entry above; both are now closed).
- [ ] **Exploit the rare tail.** Model collapse eats low-frequency concepts
      first; the endgame should make recovering `benthos`/`kickshaw` feel like
      the last lights coming back on. Needs a mechanic, not just ordering.
- [ ] **Owner: write the first ticker-line batch** (`docs/TICKER_LINES.md`).
- [ ] **Owner: judge the FEEL of the force layout.** Repulsion strength, spring
      length and damping in `src/render/sim.ts` are a first guess at
      "Obsidian-ish". Too springy / too stiff / settles too fast are all
      one-constant fixes; it is a taste call, not a correctness one.
- [ ] **Owner: drag-test on a real fingertip.** Verified only with a synthetic
      mouse drag. Grab radius is 22px; on a crowded board a thumb covers several
      nodes, so it may grab the wrong concept or steal a pan you meant.
- [ ] **▶ NEXT after owner's polish verdict: M3, re-scoped per agents** — (1) graph rebind: edges←triples,
      nodes←entity emergence; data = fuel only (deletes the ambient bridge);
      (2) Extractor + Reasoner, multiplier consumes `resources.triples` and is
      SHOWN on screen ("Inference ×1.34"); (3) production-driven motion (no
      production = still graph) — note PixiJS is NOT a dependency and pan/zoom
      already shipped 2026-07-26, so this reduces to atmosphere; (4) event
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

## Housekeeping closed 2026-07-25

- [x] **`docs/HANDOVER.md` rewritten.** It documented save v5, 63 tests, a
      `ReviewPanel.svelte` that no longer exists and a Datums economy that was
      deleted — the-graph called it the most expensive defect in the repo,
      because a fresh session reads it first and is misled by all of it. Now
      verified against the code at v10 / 73 tests, and it states the
      unreachable-goal claim is NOT yet true and why.
- [x] **Stale dataset numbers fixed**: `GAME_DESIGN.md` and `ARCHITECTURE.md`
      claimed 107,519 concepts (we ship 4,096) and 45 domains (we ship 26 — the
      curated build takes nouns only, and WordNet's 45 count includes verbs and
      adjectives a player can never encounter here).
