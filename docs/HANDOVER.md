# Handover — read after CLAUDE.md, before anything else

## 1. Read `docs/VISION.md` first. Seriously.

It is the newest and most important document in the repo, and it exists because
it didn't. Without it, a session found a free 107,519-concept dataset, shipped
all of it, and nothing in the repo could say that was wrong. VISION says who
this is for (**the owner, one person** — public only because Pages is easy),
what it's for, and what it rules out.

## 2. What the game is now

**An incremental about speed versus truth.**

```
Extractors mint statements fast → all UNVERIFIED → they DRIFT into nonsense
   → drifted knowledge stalls recovery (Reasoners run at fidelity²)
   → review is the only brake (by hand, or bought out with Orchestrators)
```

- **You cannot lose. You plateau.** Soft rot; nothing is ever deleted.
- **Prestige inherits your own machine output**, unverified, and each generation
  rots faster (`syntheticShare`). So **100% is unreachable by construction** —
  the stated goal is not the real goal, and that is true mechanically before it
  is ever narrated.
- **Nothing rots while you're away.** Absence *banks* work (`pending` → `absorb`);
  you come back to a job, never to damage.
- **HITL is never mandatory.** Manual review is acceptance sampling (one item
  stands for ~2% of the pool); Orchestrators do it for you, worse, forever.

## 2b. The UI is a canvas. All of it.

There is no HTML interface. `src/render/board.ts` lays the whole game out as
tappable nodes; `src/render/paint.ts` draws them; `App.svelte` is a render loop
and a pointer handler and nothing else. Stats, machines, Survey, Review,
Retrain, the save menu — all nodes.

- `layout()` / `paint()` / `hit()` consume the SAME item list, deliberately.
- `band(w, h)` is the geometry: an explicit clamped region, never a fraction of
  the viewport. Change it there, not in the painter.
- Sheets (review, vignette, save) are drawn ON the board and take the whole
  screen, so a stray tap can't reach the graph behind an open decision.
- Only the CC BY attribution stays in the DOM — it has to be a real link.

**Both hand verbs cost.** Survey spends Datums and gets steeply more expensive
per unclaimed frontier node; connecting spends **attention** (cap 12, +1/20s,
regenerates while you're away). Attention is the one budget shared by connecting
and reviewing.

## 3. State of the code

- **Save v5.** Migration chain v1→v5 tested. v4→v5 marks every existing
  statement **verified** — the owner placed them all by hand, so that's true.
- **63 tests green**, `svelte-check` clean, `vite build` clean.
- `src/core/` is still pure and knows only integers. CI greps for it, now
  including `shell/` and `fetch`.
- Key files: `src/core/engine.ts` (the whole loop, heavily commented),
  `src/content/vignettes.ts` (CYOA data, **prose empty on purpose**),
  `src/ui/ReviewPanel.svelte` (the HITL desk), `src/shell/ontology.ts` (loader +
  the `corrupt()` glitch function), `scripts/build-ontology.mjs` (the pipeline).

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

1. **★ Prose. The game has almost no words, deliberately.** Vignette title/body/
   choices are empty strings rendering `⟨owner⟩` slots. **An agent must never
   fill these in** — a test asserts they're empty. Also: `Ingestion Pipeline™`
   is pre-pivot startup satire sitting under a card about knowledge rotting.
2. **Balance is a first pass, not balanced.** Simulated: attentive player ≈4,095
   concepts and 95% fidelity in ~4h; idle player floors ~43-49% fidelity and is
   ~2× behind. Is 2× too strong a pull toward manual play? Chad should price it.
3. One vignette is not a branching narrative. Needs forks that matter later.
4. Real is-a parents are shipped and loaded but the engine still wires edges to
   a hash-picked anchor (`mixId`). Using the real parent makes the picture the
   actual taxonomy — engine change + migration.
5. Rot isn't visible on the canvas yet (`corrupt()` exists, renderer ignores it).
6. Licence bookkeeping: the Princeton notice in ATTRIBUTION is the 3.0/2006 text;
   this data carries 3.1/2011. Fetch `WNDB_License.txt` verbatim.
7. Theory debts from prof-veritas — SIMPLIFICATIONS rows and glossary entries;
   "late collapse" should read "early collapse" in GAME_DESIGN.

## 6. How to work here

- **Chips for decisions** (`AskUserQuestion`) — the owner is on a phone.
- **Run the review agents before shipping** — they materially changed this
  design twice. `chad-liquidity` (fun/economy), `the-graph` (consistency/code),
  `prof-veritas` (theory), `the-auditor` (licences/safety), `the-redditor`
  (genre). Note: the-redditor grades for a public launch, which per VISION this
  is **not** — weight accordingly, but its safety/credibility points still land.
- **Simulate before believing.** The economy was rewritten twice off the back of
  a headless sim that took minutes and disproved what the code "obviously" did.
- **Verify before claiming.** Two rounds of confident, false statements got into
  this repo because nobody checked them against the shipped data.
