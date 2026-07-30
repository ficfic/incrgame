# Handover — read after CLAUDE.md, before anything else

> **⚠️ STILL LIVE, but pre-pivot (2026-07-29).** The state-of-the-build file;
> the job survives, the contents describe the replaced game. Rewrite when the
> redesign lands; trust the code over it.

Last verified against the code on **2026-07-28**, at save **v17**, 12 test files
/ 166 tests green. If this file and the code disagree, the code wins and this
file is a bug. It has been that bug before — a stale HANDOVER is on record in
`BACKLOG.md` as the most expensive defect in this repo.

## 0. ⚠️ The build is RED. Know this before you plan anything.

`src/ui/App.svelte` was not rewritten when the economy was. It still imports
`../core/graph`, `../content/generators`, `../content/vignettes` and
`../shell/salvage`, all deleted, and reads `attentionCap`,
`REFLECT_MIN_CONCEPTS`, `chooseOption` and `saveVersion`, none of which exist.

| check | today |
|---|---|
| `npm test` | ✅ 12 files, 166 tests |
| `npx tsc --noEmit` | ✅ clean (core, content, shell, render, test) |
| `npm run check:core` | ✅ pure across 9 files |
| `npm run check:story` | ✅ 446 beats, every beat has an exit |
| `npm run check:vocab` | ❌ 4 violations — all four readouts are referenced by NO file in `src/ui/` |
| `npx svelte-check` | ❌ 90 errors, **all** in `App.svelte` |
| `npx vite build` | ❌ 4 unresolved imports, all in `App.svelte` |
| `npm run play` | ❌ cannot run — there is no build to probe |

That is `docs/NEXT.md` **item 3**. Nothing that needs a screenshot can be
verified until it lands, and no session may claim a play probe it could not run.

## 1. Read `docs/VISION.md` first. Seriously.

It is the most important document in the repo, and it exists because it didn't.
Without it, a session found a free 107,519-concept dataset, shipped all of it,
and nothing in the repo could say that was wrong. VISION says who this is for
(**the owner, one person** — public only because Pages is easy), what it's for,
and what it rules out.

## 2. What the game is now

**An incremental about speed versus truth, in four quantities.** The economy was
rewritten on 2026-07-28 to the spec in `docs/ECONOMY_SRR.md` (marked BUILT),
after the owner called it confusing twice in two days. The diagnosis found the
model was never the problem — the **names** were.

```
WALK a lane to a concept you do not hold  → +1 Word, costs Solid
   → Words raise the ceiling on what your machines may produce
Machines produce, capped by that ceiling
   → WATCHED (0.55×): everything arrives SOLID
   → LOOSE   (1.0×):  everything arrives RAW
RAW rots into ROT, which only a Retrain clears
   → CHECK by hand, or buy Checkers, to turn Raw into Solid first
SOLID is the only thing you spend: on the next step, or on a machine
```

    factsPerSecond = min(1.2 × factMachines, 0.15 × Words)
    stepCost       = 0 if you already hold the concept,
                     else ceil(6 × 1.04^stepsThisRun)

**The join IS the game.** You cannot extract relations about entities you do not
hold, so walking the story is the only income upgrade there is. An idle-only
player flatlines in about ten minutes and the HUD is meant to say why, in words:
*"your 30 Extractors could make 12.0/s — your vocabulary supports 4.5/s"*
(`bottleneck()`). Without the join, the story and the idle loop are two games
sharing a screen.

- **You cannot lose. You plateau.** The wall is the exponential step price
  against a linear vocabulary cap; you can see it coming for an hour.
- **Nothing rots while you are away.** Absence *banks* work at exactly the
  watched/loose split you left set, Checkers included (`src/core/offline.ts`,
  8h cap). You come back to a job, never to damage.
- **HITL is never mandatory.** `check` is a no-cooldown tap worth a fixed 5 Raw;
  a fixed amount per tap loses to exponential production by construction, which
  is "review is the only brake and it is slow" with no clock in it. Checkers buy
  it out, worse per Solid.
- **Retrain** (prestige) keeps your concepts, resets `stepsThisRun` so every
  place you walked is free again, inherits 25% of what your machines minted as
  Raw, and raises `syntheticShare` — so each generation starts richer and rots
  faster. Gate: `RETRAIN_MIN_WORDS = 120`.

### ⚠️ The claim that is NOT true

VISION says the stated goal is **unreachable by construction**. It is not, and
this rewrite did not make it so. REDRIFT was the old mechanism and the spec
deleted it, so **Rot is a sink and a scoreboard, not a multiplier**. A
generation is worse than the last only in that Raw rots faster. Re-deriving the
collapse curve from the new design is a separate, unstarted item — do not repeat
the claim as fact until a measurement says otherwise.

Also open: `requires.rels` on 176 story choices is **unenforced** —
`starmap.laneFor` gates on `requires.concepts` only.

## 2b. There is ONE currency and it is Solid

No capital, no selling, no buyers, no tokens, no Datums, no attention. Every
price — a step of the story, a machine — is in Solid, which is what makes "walk
further or build wider" a real question.

| machine | rate | cost | note |
|---|---|---|---|
| **Extractor** | 0.4 facts/s | 20 × 1.15ⁿ | the volume machine; carries the toggle |
| **Reasoner** | 2.2 facts/s | 320 × 1.18ⁿ | always Solid, and now in code too — what already follows needs no checking, so it has NO watched/loose toggle rather than an inert one |
| **Checker** | **0.2% of the Raw pile/s**, each | 90 × 1.18ⁿ | makes nothing; excluded from the join, or it would raise a ceiling on production it does not perform. A SHARE, not an amount — a flat 0.25/s needed 72 units to keep up with an 18/s loose roster, so watched won everywhere and Rot never moved |

A run opens with **1 Extractor, 18 Solid, watched**. Both exist to close a
softlock: Words start at 0, so production starts at 0.

## 2c. The UI is DOM. The canvas draws the graph's lines.

- **`src/ui/App.svelte`** is the whole interface — and is the pre-rewrite file
  (see §0). What it must become is in `NEXT.md` item 3: Words, one **stacked
  bar** for Solid/Raw/Rot, a card per machine with its toggle, and Walk / Check
  / Buy / Retrain.
- **The HUD is not absent, it is UNLEARNED.** A readout is a word plus a number,
  and a word you cannot read is not a readout — so each appears only once its
  noun has been learned (`src/core/literacy.ts`, `LEARN_AT = 3`, exposure
  derived from the beats at the concepts you hold). The interface assembles
  itself as the player becomes literate. **Do not reintroduce English chrome.**
- **`src/render/paint.ts`** draws lines, the drifting substrate, and the
  Solid/Raw/Rot **stacked ring** — one object, not three.
- **`src/render/sim.ts`** wraps **d3-force**; **`src/render/detail.ts`** decides
  what is visible at a zoom; **`src/render/board.ts`** is pure geometry and holds
  **the camera**. Everything with a place on the board is authored in world units
  and converted there and nowhere else; a `w / 2` in another file is that bug
  returning.
- **Nothing is `position: fixed`.** A fixed element anchors to the layout
  viewport, so a zoomed page becomes a magnified crop with no way out — that is
  what once trapped the owner inside the game.
- **Do not reimplement the browser.** A `layout()` → `SceneItem[]` pipeline, a
  hit-tester, a label-collision solver and hand-painted modals were all deleted,
  −809 lines. Every zoom bug this project had came from that one choice.

## 3. State of the code

**Save v17, twelve fields** (it was thirty-five):

```
version · lastTick · solid · raw · rot · held[] · stepsThisRun
machines{extractor,reasoner,checker} · watched{extractor}
generation · syntheticShare · minted
```

- **Words is DERIVED** from `held` minus the seed (`literacy.bound()`), never
  stored — so the board, the income cap, the story position and the readout
  cannot disagree.
- **All 15 migrations are gone.** `deserialize` returns
  `{ state, reset, notice }`: a save that is not v17 is rebuilt as a fresh run,
  keeping its concepts, and the player is told. `version` stays on every save so
  the code can *tell* which format it holds. Export/import is the same base64
  blob and must keep working — it is how the owner moves a save between devices.
  Storage is **IndexedDB** (`src/shell/storage.ts`); localStorage is
  iOS-evictable.
- **`src/core/` is pure** — no DOM, no `Date.now`, no `Math.random`, no fetch.
  `npm run check:core` greps for it. `src/core/rng.ts` is deleted: nothing in the
  engine draws randomness any more.
- **`src/core/` must never import `src/shell/`.** When the engine needs a fact
  about the dataset, the shell looks it up and passes a plain integer.

Key files:

| file | ~lines | what |
|---|---|---|
| `src/core/engine.ts` | 393 | the whole loop, one reducer, heavily commented |
| `src/core/types.ts` | 219 | the state contract — **the real source of record** |
| `src/core/save.ts` | 160 | serialize / deserialize / reset notice |
| `src/core/readouts.ts` | 89 | every player-facing number, with its noun and a ≤5-word `explain` |
| `src/core/starmap.ts` | 130 | lanes: solid / dotted / locked, derived from the story graph |
| `src/core/literacy.ts` | 87 | which words the player can read yet |
| `src/core/masking.ts` | 142 | rendering a beat with unlearned words masked |
| `src/core/offline.ts` | 69 | away banking, closed-form and exact |
| `src/content/machines.ts` | 57 | the three machines — tune balance HERE, never in the engine |
| `src/shell/game.ts` | 127 | the one store, the 10 Hz loop, autosave, resume |
| `src/shell/ticker.ts` | 132 | the drip; reads `READOUTS`, never state |
| `src/shell/ontology.ts` | 314 | chunk loader, id→concept |

**Four verbs, plus the clock and the toggle:** `walk`, `check`, `buy`,
`retrain`, `tick`, `setWatched`. Everything else — discover, extract, connect,
claimNode, growContext, survey, absorb, refine, sell, manualConnect,
chooseOption, setSupervision, reflect — is gone, not stubbed.

## 3b. The guards, and which one is honest

- `npm run check:core` — purity. Real.
- `npm run check:story` — 446 beats, 591 gated choices, every beat has an exit,
  every gate key teachable. Real.
- `npm run check:vocab` — **was vacuous twice over** and is now the real rule: it
  forbids a surface reading a quantity off state, and requires every declared
  readout to be referenced by `src/ui/`. It fails today, correctly (§0).
- `npm run play` — the play probe. **The only evidence that counts for anything
  player-facing**, and it cannot run right now.

**Rule 4 is not optional here.** Every guard in this repo has been vacuous at
least once. Break the code on purpose, watch the check fail, put it back.

## 4. The dataset

**4,096 concepts**, curated: nouns reachable from `entity` (exactly one root),
one concept per word form, offensive senses excluded. 348 KB. Pinned to Open
English WordNet `2025-edition`, commit `dc343f26`; the generator *verifies* the
cache is at that commit before reading it.

- **`READABLE_CONCEPTS = 4075`** — concepts a player could ever arrive at,
  walking lanes from the seed and respecting every gate. Measured, not assumed;
  it is the denominator under `Words N / M`, the only fraction in the game.
  `test/reachability.test.ts` fails first if the story graph is re-cut.
- **The seed is five concepts** — system, agent, language, information, power —
  **visible, not readable**. They are held from the first frame but do not count
  as Words until the player arrives at one from somewhere else.
- **The story graph** (`public/story/`, built by `scripts/build-story.mjs`) is
  446 beats and 591 gated choices — 415 gated on concepts, **176 on relations,
  which nothing enforces** — of which 50 carry bespoke prose; the rest render
  from carrier sentences in `docs/graph/frames.json`.

Its job is **ground truth so drift is legible** — you can only watch a
definition rot because a correct one exists to rot away from. It is the lab
bench, not the curriculum. Do not grow it because more is available.

⚠️ The recovery order is **save-visible**: node id N means concept index N.
Changing the edition or the selection renumbers the owner's world.

## 5. What is NOT done, in priority order

`docs/NEXT.md` is the queue and outranks this list. In short:

1. **The screen** (NEXT item 3) — see §0. Everything else is blocked on it for
   evidence.
2. **Node memory** (NEXT item 1) — `docs/MEMORY.md`. Trust the memory or walk it
   again; speed versus truth in the story layer.
3. **Cut the junk** (NEXT item 2) — `jimdandy`, `instalike`, `must-see` and
   friends are WordNet slang filed under `noun.artifact`.
4. **`requires.rels` is unenforced** — 176 choices declare relation gates that
   nothing checks.
5. **"Unreachable by construction" has no mechanism** — see §2.
6. **Prose.** `OWNER_LINES` in `src/shell/ticker.ts` is empty and the triggers
   waiting for a line are in `docs/TICKER_LINES.md`. Prose is now
   machine-drafted and **owner-edited** (`CLAUDE.md`, reversed 2026-07-27): draft
   it, but the bar is a line the owner would defend.
7. **Balance is one headless pass**, not a played one. Measured on the greedy
   walker: 65 Words / 2.2 facts/s at 1h, first Retrain around 2h15m; 30 minutes
   loose-and-tapping buys 58% more Words for 9.3 permanently lost facts.

## 6. How to work here

- **WIP = 1.** One item from `NEXT.md` per session. A defect you find goes to
  the bottom of `BACKLOG.md` as one line, not into today.
- **Chips for decisions** (`AskUserQuestion`) — the owner is on a phone, and
  replies are capped at 150 words.
- **Look at the screen.** Several defects survived a full review round and were
  caught only by taking a screenshot and *reading it*.
- **Simulate before believing.** The economy has been rewritten off the back of
  a headless sim that took minutes and disproved what the code "obviously" did.
- **Verify before claiming.** `npm test` piped to `tail` hides the summary —
  grep for `Test Files|Tests |FAIL`.
- **Review agents** (`.claude/agents/`) exist and materially changed this design
  twice — but **one round per item**, and only findings that affect correctness
  or the stated requirement.

## 7. Deploy

Deploy by fast-forwarding **`claude/incremental-game-github-pages-w7pvk6`** onto
the development branch and pushing — the Pages Action is pinned to that branch
and publishes from nowhere else. Other branches get CI and skip the publish.
Live at <https://ficfic.github.io/incrgame/>.

Development has moved between branches more than once; `git branch -a` and
`git log --oneline origin/<branch>` are the handoff, never a note file.
