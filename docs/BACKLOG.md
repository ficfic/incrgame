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

**The replacement now has a shape: `docs/ECONOMY.md` — the refinement ladder.**
Tokens are the bottom rung (raw salvaged text), five lossy rungs
up to a trained checkpoint, and the AI automates the rung it was trained on so
automation always arrives with rot attached. Tail loss is rendered rather than
described: batches are sampled, so the low-weight periphery of the graph goes
wrong while the core stays crisp. The twist is requirement (d) at last — the
model's benchmark is your own corpus, and the real dataset is shipped, so
"agreement with the source" is a number that genuinely exists.
**Nothing is built and no number is balanced. Simulate before believing.**


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

- [x] **Content batch reviewed twice and folded in (2026-07-26).** Eight ideas
      through theory review and genre review; verdicts and kills live in
      `docs/CONTENT_IDEAS.md` so they are not re-proposed. Two claims were
      checked in source rather than taken on the reviewer's word: `corrupt()` is
      non-monotone in `strength` (✔ confirmed, it would strobe) and idea 7 is
      already shipped (✔ confirmed at `board.ts:131` + the eviction loop).
- [x] **Tap a concept → read its WordNet gloss (2026-07-26).** Non-modal card,
      100% reach, no new state, no prose. The gloss had only ever been shown at
      the review desk, i.e. attached to a chore, while DECISIONS says
      definitions are the *reward* for recovery.

- [ ] **★ THE CATEGORY HISTOGRAM — blocks three content items at once.**
      26 per-lexname counters of recovered concepts, additive save migration.
      `state.coverage` holds one key (`general`) and `foldedNodes` is an
      identity-free `Decimal`, so the game currently knows how much it has
      recovered and nothing about what. Per-category evaluation, visible concept
      death, and the model card's disaggregated section are all waiting on it.
      Ship `noun.Tops` excluded and denominators captioned as *within the shipped
      slice* (see DECISIONS — a low `noun.plant` is curation, not tail loss).

- [ ] **The away report → shift handover.** Currently a 2200ms toast that nulls
      its own data; genre review rates this the most-read surface in the genre.
      Report the **supervision split** (`pendingClean` vs `pending`), NOT "cost
      in agreement" — nothing rots while away. Blocked on one owner sentence.

- [ ] **⚠️ OWNER DECISION — Field Notes is a standing rule violation.**
      `FieldNote` is fully specified at `types.ts:296-304` with zero references
      in `src/`. SIMPLIFICATIONS.md specifies 15 rows; the house rule says each
      is surfaced before its mechanic ships; S9–S15 have all shipped. Blocked on
      prose: does the owner adopt the existing SIMPLIFICATIONS truth-lines as
      authored, or write them fresh? An empty codex is the violation with a UI.

- [ ] **`OWNER_LINES = {}`** — the eight `recovered:*` milestones, written as one
      curdling voice. Wired, reachable, 100% reach, still empty. Per
      `docs/CONTENT.md` this is the single highest-value writing hour available.

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

- [ ] Toast overlaps the source toggle when both are visible (seen 2026-07-26 in ctx2 probe shot).

- [ ] Rename the "N lines filling" status label — owner: "these are not lines" (2026-07-26).

- [x] ~~Giant coloured arcs in the stage corners~~ — **NOT A BUG (2026-07-26).** They are the discovery countdown rings (`.finding`), sitting on the frontier circle and clipped by the stage edge. My guess about `dotRadius` was wrong; looking at a wider screenshot showed six of them reading "6s"/"7s".
- [ ] **The board is a hairball past ~50 concepts** — everything spokes off `entity` and labels overlap. LOD declutters labels but not the layout.

- [ ] `agreeing` reads 31/31 and stays there until unsupervised machines exist, so it teaches nothing yet. It is correct and inert. Decide whether it earns HUD space before the machines that move it are buildable.

- [ ] Transitive `is a` spokes are minted `fake: false` (`potentialEdges` walk-up). True by transitivity, but not the direct parent — makes `agreeing` weaker than it reads. Much rarer now that ancestors are held.
- [ ] `contextGate` reads `lifetimeVerified`, which survives `reflect` and is also fed by machines — generation 2 regrows the window free, and the label "at N confirmed" overstates what a human checked.
- [ ] A dark concept that falls out of context can never be proposed again — nothing re-admits it.
- [ ] `contextUsed` saturates the moment the board exceeds the window, so the ring sits permanently amber and says nothing.
- [ ] `rel === 0` (`is a`) renders with no edge label; owner asked for labels on edges at high zoom.
- [ ] Tapping a node cancels auto-framing and reheats the sim (`sim.grab`); the inspect card lists no connections.
- [ ] `drifted` has no sink in generation 1 — it only ever goes up.
- [ ] **Owner decision needed:** `the-graph` rules the in-game help sheet AI-written player-facing UI copy, which CLAUDE.md bans by name. Either the mechanical-fact carve-out is written into the rule, or the sheet becomes ⟨owner⟩ slots.

- [ ] `dream`, `exercise`, `service` and `button` score as obscure. Honest — the shipped synset really is sense 6-of-6 and a leaf — but the LABEL reads common, so a tier shown next to a word will look wrong. Decide whether the score is per-concept (correct) or wants a per-label override (friendly).
- [ ] Rarity's `degree` signal contributes almost nothing on the shipped slice (123 relations over 4,096 concepts). It is measured against the full lexicon so it is not dead, but it is the weakest of the seven and carries weight 0.03.

- [ ] The discovery countdown rings now sit at the stage rim for 40s instead of 18s, so the clipped coloured arcs bleeding off all four edges are on screen most of the time. Previously judged cosmetic; the slowdown made them the loudest thing in the frame.
- [ ] Attention reads 0/4 for the first five minutes under probe play — every slot always busy. Correct, and it may read as "nothing to do" to a human who is not hammering every button. Watch it.
- [ ] Worldbuilding branch (`claude/worldbuilding-stories-starmap-5wkhrk`) has `docs/graph/story.json` — 308 CYOA beats with vocabulary gates. Needs `VignetteChoice.requires?: { concepts: string[]; rels: number[] }` in `src/core/types.ts`. Engine rule: a gated choice is SHOWN but not takeable, and a beat must never render with zero takeable choices — `check:story` guarantees the data always has an ungated exit, so the engine must not filter it away. Not started; ids will arrive numeric.
- [ ] **Sibling choice needs a rarity/salience score.** `scripts/lane-analysis.mjs` picks the alphabetical first three siblings at each junction, so `animal` offers "aerobe / amphidiploid / anaerobe". Sizing is right; the choices are not. Needs a per-concept score before lanes become playable branches.

- [ ] `check:align`'s "start the game" locator has broken three times in one day (`button.act.primary` → `hasText: Discover` → `.lane.dotted`). It skips loudly rather than passing green, which is correct, but it measures nothing until someone notices. It should assert on an AFFORDANCE, not a selector.
- [ ] The story graph covers 106 of 4,096 concepts. Past that the starmap has no lanes and the board falls back to nothing — measured by walking every dotted lane to exhaustion.
- [ ] Masked lane labels render as a block texture at dock size; legible as "hidden" but reads more like a swatch than a word. Consider a lighter glyph or per-character spacing.
- [ ] `docs/graph/story.json` is imported into the bundle (96 KB today, mostly empty strings). When the beat text lands it needs the ontology's lazy-chunk treatment.
## Overtaken by the 2026-07-27 scope change (were NEXT.md items 2 and 3)

- [ ] **Prove the four gates go red, in writing.** `the-process` audit 2026-07-26: 0 of 4 (`check:align`, `check:core`, `check:vocab`, `play`) has a durable record of being confirmed red, and two have already been caught vacuous. Now five gates — `check:story` was proven red on 2026-07-27 (two sabotages recorded in its header, and it caught a real bug), the other four still have no record. Rule 4 says a check nobody has broken on purpose is assumed vacuous.
- [ ] **`OWNER_LINES` — the eight ticker milestones.** Wired, reachable, 100% reach, still empty. No longer blocked on the owner: the prose guardrail was reversed 2026-07-27, so agents can draft these and the owner iterates. `docs/TICKER_LINES.md` holds the table and the instruction that matters — "do not write eight independent jokes, write one voice that curdles."

## Engine bug hunt, 2026-07-27 — 22 findings from 6 blind lenses + 3 skeptics each

The aliasing bug (`engine.ts:1008`, apply() mutating its caller) is FIXED —
see `test/purity.test.ts`. Everything below was raised by the same audit and
is NOT yet triaged; each carries the lens's own severity, not mine.

- [ ] **[medium]** `src/core/engine.ts:1191` — The idle-tick identity guard is dead code: `state.review.length > 0` is never true, so apply() allocates a new state every tick. `if (!touched && lastTick === state.lastTick && state.review.length > 0) return state;` requires a non-empty review queue. The review desk was deleted; `state.review` is written exactly once, as `[]` in `initialState` (line 500), and nothing in the reducer ever appends to it (the comment at 1207-121
- [ ] **[medium]** `test/engine.test.ts:232` — The only purity assertion in the suite is vacuous — it runs the reducer over a state with no bookings, no edges and no generators. `does not mutate the previous state (purity)` builds `initialState()` and ticks it once. On that state the tier loop is a no-op (ratePerSecond returns '0'), `minted` is 0, `unchecked()` is 0 so `decayed` is 0, `drawn` is 0, `recoveryPerSecond` is 0 and `bookings` is empty — so no branch that sets `t
- [ ] **[high]** `src/core/offline.ts:54` — Offline banks Extractor output only — 8h of Reasoner work is silently deleted, and the toast says "nothing changed". applyOfflineProgress banks supervisedPerSecond + unsupervisedPerSecond (Extractors) and nothing else. recoveryPerSecond (Reasoners → forged.foldedNodes) is never banked and never applied, so the machine the content table calls "the machine that actually wins the run" produces exactly zero while you 
- [ ] **[medium]** `src/shell/game.ts:90` — A backward clock stalls the whole sim: the 10 Hz loop takes neither branch, so no tick, no bookings, no autosave. gap = now - s.lastTick. On a backward jump (NTP correction, user setting the clock back after time-travelling forward for the 8h bank) gap is negative: it fails `gap > MAX_CATCHUP_MS`, so applyOfflineProgress — which has the explicit repair at offline.ts:30-33 — is never called, and `steps = Math.fl
- [ ] **[high]** `src/shell/game.ts:80` — A save that fails to load is overwritten by the autosave within 10 seconds. `startGame` catches a `deserialize` failure, replaces the store with `initialState()`, and leaves the autosave interval running. `persist()` (line 42) writes `serialize(get(store))` to the same IndexedDB key `'main'` that `loadBlob` reads, so ~10 s later (line 99) — or immediately on the next `visib
- [ ] **[high]** `src/core/save.ts:230` — A save with no `saveVersion` is silently shredded by re-running the whole migration chain. `let version = typeof raw.saveVersion === 'number' ? raw.saveVersion : 0;` defaults the one input that means "I don't know what this is" to 0, which makes the loop run *every* migration over a current-format save. v3→v4 then replaces `forged` wholesale (`anchors:[0], edges:[], links:[]`, `foldedNode
- [ ] **[medium]** `src/core/save.ts:224` — `deserialize` validates the envelope but nothing inside it, so a blank object imports as a "valid save". The only structural check is `'state' in parsed` plus `typeof raw === 'object' && raw !== null`. An array passes (`typeof [] === 'object'`), and an object with no game fields passes because the per-key merge against `initialState()` fills everything in. The result is indistinguishable from a legitim
- [ ] **[low]** `src/core/save.ts:261` — Numeric fields are not validated on load, and an `Infinity` in `lineRot` hangs the tick loop. `JSON.parse` turns the literal `1e999` into `Infinity`, and the merge copies it straight through — there is no finiteness check on any number in the blob. `engine.ts:904` reads it (`let lineRot = state.lineRot + ...`, with no `Number.isFinite` guard, unlike the sibling `lineDebt` at line 929) and `e
- [ ] **[high]** `src/core/engine.ts:1009` — Agent-drawn lines delete statements they never minted (~11% of all production). Lines the tick draws for agents (line 956) are pushed into `forged.edges` without incrementing `resources.triples` or `provenance.unverified`. When one of them later rots, the expiry refund at 1004–1011 subtracts `min(expired, unverified)` from BOTH `unverified` and `resources.triples` — destroying 
- [ ] **[medium]** `src/core/engine.ts:1070` — Confirming a machine-invented line credits lifetimeVerified against a statement that does not exist. The confirm branch's own comment states the invariant it relies on: "No new statement is minted: the statement already exists." That is false for agent-drawn lines, which never minted one. So `unverified -= 1` debits some *other* statement's provenance, `lifetimeVerified += 1` credits a statement th
- [ ] **[low]** `src/core/numbers.ts:38` — format() emits 1000.0K / 1000.0M / 1000.0B instead of rolling to the next suffix. `exp = Math.floor(d.log10())` and `tier = Math.floor(exp/3)` are computed before the value is scaled, so a value just under a suffix boundary picks the lower tier and then `toFixed(1)` rounds the mantissa up to 1000. The suffix table exists precisely to keep the mantissa in [1,1000).
- [ ] **[high]** `scripts/check-core-purity.mjs:87` — Purity gate never looks in subdirectories and skips every non-.ts file. `readdirSync(DIR)` is not recursive and the `.endsWith('.ts')` filter drops directory entries silently, so the gate only ever sees the nine files that happen to sit flat in src/core today. Any file added under src/core/<subdir>/ — or any .mjs/.js/.cjs helper — is unscanned, and the success line stil
- [ ] **[high]** `scripts/check-core-purity.mjs:69` — CODE_RULES catch only two of the clock/RNG entry points; new Date(), performance, globalThis and crypto all pass. The rule list is six literal identifiers. `Date.now` and `Math.random` are matched by name only, so every sibling API for the same capability is invisible: `new Date()`, `Date.parse`, `performance.now()`, `crypto.getRandomValues`, and — because CODE_RULES run with string literals blanked — any acces
- [ ] **[medium]** `scripts/check-core-purity.mjs:59` — A quote inside a regex literal blanks the rest of the file, making the identifier rules vacuous from that line down. stripNonCode is not regex-literal aware. It special-cases `/` only when followed by `/` or `*`, so a regex literal such as `/[a-z]'s/` leaves a bare apostrophe in the stream; the scanner treats it as a string opener and blanks every character until the next matching quote — which may be hundreds of 
- [ ] **[medium]** `scripts/check-core-purity.mjs:83` — Import rule requires a trailing slash and ignores the modules core actually imports, so impurity reached through a neighbour is invisible. Two holes in the one rule that governs what core may depend on. (a) FORBIDDEN_LAYER requires `(ui|render|shell)/` with a trailing slash, so a bare layer specifier is not a violation — despite the comment at line 80 claiming the layer is forbidden "whatever the number of dots in front of it". (b) The
- [ ] **[high]** `src/core/engine.ts:1070` — Confirming a proposal is a silent no-op once provenance.unverified has drained to 0. The confirm branch assumes a bijection between unchecked edges on the board and units of `provenance.unverified`, and enforces it only with a clamp (`if (unverified.lt(0)) unverified = D('0')`). The two counters drain at different rates: the expiry refund at lines 1004-1012 subtracts `expired` from 
- [ ] **[medium]** `src/core/engine.ts:412` — Grow context stays purchasable to ANCHOR_CAP (240) although only 106 concepts are reachable, so 34 steps are inert. `canGrowContext` ceilings on ANCHOR_CAP, a render budget, not on anything related to how many concepts can exist. `inContext` returns all anchors whenever `anchors.length <= n`, and discovery is only ever dispatched with `node: lane.to` (src/ui/App.svelte:671), so the transitive closure of docs/grap
- [ ] **[low]** `src/core/engine.ts:267` — attentionPenalty reads `unverified` alone, but the HUD gap it claims to read is unverified + drifted. The doc comment justifies the game's only capacity degradation with "it reads off `provenance.unverified`, which is already on the HUD as the gap between `checked` and `statements`". That is false: `verified()` = triples − unverified − drifted, so the on-screen gap is unverified PLUS drifted, and ne
- [ ] **Content:** 1,799 of 1,879 story choices have no label, and 419 of 446 beats have no body. The renderer falls back to a destination span so no button is dead, but most of the game currently reads in the graph's words with no sentence around them. Owner/worldbuilding, not this branch.
- [ ] 24 beats that DO have written prose still carry blank-label choices (c1, c2, c4, c6, c7 …) — those are the ones a player reaches first, so they are the ones worth writing next.

- [ ] **Owner decision: how does a SEED word ever become readable?** The five seed concepts are held but unbound by design. Binding is currently "arrived at by travelling", and you cannot travel to a concept you already hold — so `system`, `agent`, `language`, `information` and `power` stay foreign forever. The cross-link labyrinth loops back to them, so allowing a re-arrival is the obvious answer, but it is a mechanic and not mine to invent.
- [ ] **Content: five of seven readout nouns have no word.** `checked` and `agreeing` are in language.json; `recovered`, `context`, `attention`, `statements` and `edges` are not, so they can never be learned and never appear. The HUD can only ever assemble two cells until the corpus covers them.
- [ ] The in-flight countdown (`12s`) is the one number left on the opening screen. Kept deliberately — it is the only signal that travel takes time — but it is a number, and the instruction was "all numbers".

## Measured 2026-07-27 — most of the story is unreachable, and `check:story` does not notice

Walking every choice from the seed, breadth-first over `story.json`:

| from | beat nodes reachable |
|---|---|
| the five seed concepts | **62** of 446 |
| `entity` (the old opening) | 231 of 446 |
| each seed alone | 13 · 7 · 13 · 25 · 4 — five small, separate components |

**293 of 446 beat nodes have no incoming choice at all**, so two thirds of the
written prose cannot be reached from anywhere. `check:story` passes because it
checks that every beat has an exit and that every gate key is teachable — never
that a beat is reachable from where the player starts.

- [ ] **Owner:** the seed change cut the reachable world from 231 nodes to 62. Was that intended, or do the seed concepts need lanes that reconnect them?
- [ ] **Owner:** `REFLECT_MIN_CONCEPTS = 820` is unreachable by a factor of ~13 even from `entity`, and ~24 from the seed. Prestige cannot currently be reached at all. Pick a number against the 62.
- [ ] Add reachability-from-seed to `check:story`. NOT done unilaterally: it would fail today and block every deploy until the content reconnects, which is the owner's call, not a gate I get to impose retroactively.

- [ ] `public/story/` is imported into the bundle rather than fetched, which is why it was moved there. Async loading needs a load state through `starmap.ts`, `masking.ts`, `literacy.ts` and the render path.
