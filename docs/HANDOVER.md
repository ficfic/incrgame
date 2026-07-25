# Handover — read after CLAUDE.md, before anything else

Last verified against the code on **2026-07-25**, at save **v10**, 73 tests.
If this file and the code disagree, the code wins and this file is a bug.

## 1. Read `docs/VISION.md` first. Seriously.

It is the most important document in the repo, and it exists because it didn't.
Without it, a session found a free 107,519-concept dataset, shipped all of it,
and nothing in the repo could say that was wrong. VISION says who this is for
(**the owner, one person** — public only because Pages is easy), what it's for,
and what it rules out.

## 2. What the game is now

**An incremental about speed versus truth, played on one canvas.**

```
You DISCOVER concepts by hand → each books a slot of ATTENTION for 18s
   → the concept lands wired to its REAL WordNet parent, VERIFIED
Extractors mint statements fast → unwatched output arrives UNVERIFIED
   → unverified statements DRIFT into nonsense
   → drift stalls recovery (Reasoners run at fidelity²)
   → SUPERVISION is the brake: a slot pointed at an agent makes its output
     arrive already checked, at a 0.55× rate penalty
```

- **You cannot lose. You plateau.** Soft rot; nothing is ever deleted.
- **Prestige inherits your own machine output**, unverified, and each generation
  rots faster (`syntheticShare`).
- **Nothing rots while you're away.** Absence *banks* work (`pending` +
  `pendingClean` → `absorb`); you come back to a job, never to damage. Banking
  respects the supervision split you left set.
- **HITL is never mandatory.** Manual review is acceptance sampling (one item
  stands for ~2% of the pool); supervision automates it, worse, forever.

### ⚠️ The one claim that is NOT true yet

VISION says the stated goal is **unreachable by construction**. It is not.
Coverage is a monotone **ratchet**: a concept counts as recovered forever once
its node exists, so the dominant strategy is to sprint clean while agents are
few and win the race. See §5.1 — this is the top open design problem and the
owner has already named its cause.

## 2b. The economy is ATTENTION. There is no currency.

Datums were deleted at v9. Attention is **capacity you allocate**, never a
wallet you drain:

| | |
|---|---|
| **Capacity** | `4 + floor(4.5 × log10(1 + lifetimeVerified))` — earned by verifying, not bought |
| **Booked** | Discover ties up 1 slot for 18s; committing a review ties up 1 for 25s |
| **Reserved** | 1 slot per supervised agent, held as long as you watch it |
| **Free** | cap − reserved − booked |

Agents are bought with **verified statements** — you distil the next one out of
the graph you already trust, so a graph you let rot cannot build another agent.
Prices come from the content table (`agentBase` / `agentRatio`), not the engine.

## 2c. The UI is a canvas. All of it.

There is no HTML interface. `src/render/board.ts` lays the whole game out as
tappable nodes; `src/render/paint.ts` draws them; `App.svelte` is a render loop
and a pointer handler and nothing else. Stats, machines, Discover, Review,
Retrain, the save menu — all nodes.

- `layout()` / `paint()` / `hit()` consume the SAME item list, deliberately.
  A tap target that disagrees with the picture is the bug class that made the
  review desk unusable for a day.
- `band(w, h)` is the geometry: an explicit clamped region, never a fraction of
  the viewport. Change it there, not in the painter.
- `src/render/labels.ts` places labels by **priority** with collision avoidance
  and drops what doesn't fit. Capped at 32 candidates — placement is quadratic.
- Sheets (review, vignette, save) are drawn ON the board and take the whole
  screen, so a stray tap can't reach the graph behind an open decision.
- The canvas is measured with a `ResizeObserver` **on the element**, never
  `window.innerWidth` — that's what collapsed the board under iOS pinch-zoom.
- Only the CC BY attribution stays in the DOM — it has to be a real link.

## 3. State of the code

- **Save v10.** Migration chain v1→v10 tested. Additive only, always.
  v9→v10 added `pendingClean` (supervised work banked while away).
- **73 tests green**, `svelte-check` clean, `vite build` clean.
- `src/core/` is pure and knows only integers. CI greps for it.
- Key files:
  - `src/core/engine.ts` — the whole loop, one reducer, heavily commented
  - `src/core/types.ts` — the state contract
  - `src/core/save.ts` — the migration chain
  - `src/render/board.ts` / `paint.ts` / `labels.ts` — the entire skin
  - `src/shell/ontology.ts` — chunk loader, id→concept, `corrupt()`
  - `src/content/vignettes.ts` — CYOA data, **prose empty on purpose**
  - `scripts/build-ontology.mjs` — the dataset pipeline

**Boundary rule:** `src/core/` must never import `src/shell/`. When the engine
needs a fact about the dataset — e.g. a concept's real parent — the **shell
looks it up and passes it in as a plain integer** (see the `discover` action).

## 4. The dataset

**4,096 concepts**, curated: nouns reachable from `entity` (exactly one root),
one concept per word form, offensive senses excluded. 348 KB. Pinned to Open
English WordNet `2025-edition`, commit `dc343f26`; the generator *verifies* the
cache is at that commit before reading it.

Its job is **ground truth so drift is legible** — you can only watch a definition
rot because a correct one exists to rot away from. It is the lab bench, not the
curriculum. Do not grow it because more is available.

⚠️ The recovery order is **save-visible**: node id N means concept index N.
Changing the edition or the selection renumbers the owner's world.

## 5. What is NOT done, in priority order

### 5.1 ★ Edges carry no data, and that is why the goal is still reachable

The owner asked this directly, and they were right. Right now:

- a link is a bare `[a, b]` pair — no predicate, no provenance, no strength;
- `resources.triples` (the statement count the whole economy runs on) is a
  **separate scalar with no relationship to `links` at all**;
- provenance is global, so a "drifted" statement is not any particular edge —
  the renderer draws a stable pseudo-random share of nodes as rotted;
- so a concept, once recovered, is recovered forever.

The fix under discussion is the owner's own proposal: **edges become
statements**, a concept counts as recovered only while a live statement
supports it, and *structures* built out of edges (chains, forks, lattices) are
**thresholds** that unlock agent tiers rather than a price you pay. This touches
the save and the win condition — needs owner decisions and numbers first.

### 5.2 Everything else

1. **★ Prose. The game has almost no words, deliberately.** Vignette title/body/
   choices are empty strings rendering `⟨owner⟩` slots. **An agent must never
   fill these in** — a test asserts they're empty. Also: `Ingestion Pipeline™`
   is pre-pivot startup satire sitting on a machine in a game about knowledge
   rotting, and the ticker lines in `docs/TICKER_LINES.md` are still unwritten.
2. **Balance is a first pass.** The measured gap between an attentive and an
   idle player is real but the ceiling isn't where VISION says it is (see 5.1).
   Chad should price it once the edge redesign is decided — tuning before then
   is fitting numbers to a model that's about to change.
3. One vignette is not a branching narrative. Needs forks that matter later.
   Vignette #1 also fires at ~3 min when its `auto-review ×1.6` reward is ×1.6
   of zero.
4. Rot isn't visible on the canvas yet (`corrupt()` exists, renderer ignores it).
5. The review desk shows a concept + gloss under the word "statement" — but a
   statement is a triple, not a dictionary entry (prof-veritas). Now that the
   real parent is wired, rendering `dog is-a canine` would fix the mis-teaching.
6. Theory debts from prof-veritas — SIMPLIFICATIONS rows and glossary entries
   (SKOS, `skos:Collection`, assertion, ontology learning, human-on-the-loop);
   "late collapse" should read "early collapse" in GAME_DESIGN.
7. `aiAgent` declares `produces: 'triples'` but nothing reads it; the `produces`
   field is decorative and actively misleading.

## 6. How to work here

- **Chips for decisions** (`AskUserQuestion`) — the owner is on a phone.
- **Run the review agents before shipping** — they materially changed this
  design twice. `chad-liquidity` (fun/economy), `the-graph` (consistency/code),
  `prof-veritas` (theory), `the-auditor` (licences/safety), `the-redditor`
  (genre). Note: the-redditor grades for a public launch, which per VISION this
  is **not** — weight accordingly, but its safety/credibility points still land.
- **Simulate before believing.** The economy was rewritten twice off the back of
  a headless sim that took minutes and disproved what the code "obviously" did.
- **Look at the screen.** Several defects survived a full review round and were
  only caught by taking a screenshot in a headless browser and *reading it*.
- **Verify before claiming.** Rounds of confident, false statements got into
  this repo because nobody checked them against the shipped data. `npm test`
  piped to `tail` hides the pass/fail summary — grep for `Test Files|Tests |FAIL`.

## 7. Deploy

Develop on `claude/knowledge-recovery-ontology-game-g0f9q0`. Deploy by
fast-forwarding `claude/incremental-game-github-pages-w7pvk6` onto it and
pushing — the Pages Action watches that branch.
Live at <https://ficfic.github.io/incrgame/>.
