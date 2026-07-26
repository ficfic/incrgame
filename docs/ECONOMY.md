# The economy — the refinement ladder

> **Status: PROPOSED, 2026-07-26.** Chosen by the owner from four options after
> the previous economy was found not to exist in any meaningful sense: one
> substance (statements) whose only purpose was buying agents, plus attention as
> a capacity. No ladder, no conversion, no reason to hold anything.
>
> This supersedes `ECONOMY_MODEL.md`, which was already self-flagged stale and
> describes a third, older game.
>
> **Nothing here is built.** No numbers below are balanced; they are shapes with
> placeholder magnitudes, to be simulated before anyone believes them.

---

## The one-sentence version

You salvage raw text from a collapsed internet, refine it up a ladder into
training data, train a model on it, and the model automates the rung it was
trained on — **badly**, in a way that propagates back up the ladder you just
built.

## Why this shape

The owner's framing: *"the entire thing we are doing is actually training AI."*
That is the missing requirement (d) — "the end goal turns out not to be the real
goal" — which an audit found existed nowhere in the code. It is not a text
reveal. It is the structure.

**Every rung is a real word.** Statements is RDF's own term for a triple;
batches and checkpoints are what practitioners actually say; and rung 1 is
**tokens** — the literal unit a model is trained on, and the unit the industry
bills for, per million. Nothing here is coined.

That last point killed the previous attempt at this rung. It was called
"Datums", which is an invented word on top of a grammatical error (the plural of
*datum* is *data*), and it was a placeholder carried across three pivots. The v9
deletion note gave the real reason it never worked: "every price in the game was
denominated in a thing the subject matter does not have." Tokens are a thing
this subject matter unambiguously has, and naming them honestly also sharpens
the satire — the player accumulates precisely the unit the real industry sells.

---

## The ladder

Five rungs. Every conversion is **lossy**, and the loss is the game.

| # | Resource | Faucet (how you get it) | Sink (what it buys) |
|---|---|---|---|
| 1 | **Tokens** — raw salvaged text, unstructured, worthless alone | Salvage. The idle faucet; the first thing you automate | Extraction |
| 2 | **Statements** — a subject–predicate–object triple extracted from tokens | Extraction, by hand or by machine | Verification |
| 3 | **Verified** — a statement checked against the graph | Connect / Review / supervised agents | Curation, and agent costs |
| 4 | **Batches** — a curated training set | Curation: consumes verified statements, **drops the tails** | Training runs |
| 5 | **Checkpoints** — a trained model | Training runs consume batches | Automating a rung; unlocking verbs |

**Attention is unchanged** and stays the allocator across all five rungs:
capacity you allocate, never a wallet you drain. That decision is locked
(DECISIONS, v9) and nothing here touches it.

## The loop, stated plainly

1. Salvage tokens (cheap, endless, boring — so you automate it first).
2. Extract statements from tokens. Extraction **misreads** a share of them.
3. Verify statements against the graph. Verification is **sampling**, so a share
   of the bad ones survive.
4. Curate a batch. Curation **drops the tails** — see below.
5. Train. A checkpoint automates the rung it was trained on.
6. That rung now produces subtly worse material, which propagates **up**.

The player's job is not to stop this. It is to decide **which rung to hand over
and when**, knowing that every rung you automate degrades everything above it.

## Tail loss: the mechanic that makes the theory load-bearing

This is the part worth getting exactly right, because it is the paper.

Shumailov et al. (Nature, 2024): a model retrained on its own output loses the
**tails of the distribution first** — rare events disappear before common ones,
and the result is over-confident and over-average.

In this game, a training batch is **sampled** from your verified statements. So
the model learns whatever is common in your graph and fumbles whatever is rare.
Rarity is already a first-class property of the board: `weight` in
`src/render/detail.ts` is taxonomic generality, and it already drives node size
and level-of-detail.

**So collapse is visible.** As a checkpoint takes over a rung, the low-weight
periphery of the graph starts going wrong while the high-weight core stays
crisp. The rim goes dark; the middle stays bright. We would be *rendering* the
result rather than illustrating it with a caption.

The mitigation the paper actually names — retain original human data — is then a
real strategic option rather than a slogan: hold back some verified statements
from curation and your batches keep their tails, at the cost of training slower.

## The goal, and the real goal

**Stated goal:** train a checkpoint capable of restoring the whole 4,096-concept
world.

**The twist, made of arithmetic and not of text:** coverage measures agreement
with *your own corpus*. The model's benchmark is the material you fed it, so it
can only ever score its own homework.

This is checkable in code because **we ship the real dataset**. Open English
WordNet is the ground truth, sitting right there in `public/ontology/`. So a
second number genuinely exists and can be computed at any moment: agreement with
the *source*, as opposed to agreement with your corpus.

The reveal is that those two numbers were never the same, and the game can show
it without a single authored sentence:

```
    fidelity (what you were shown)     94%
    agreement with the source          31%
```

There is precedent in the codebase for exactly this trick and it already works:
`displayedFidelity` vs `fidelity` differ by `falselyVerified`, and the player is
never told the second one exists. That mechanism was built and then stranded
because the dominant strategy never triggered it. Here it is the spine.

## Where the story lives

Each **checkpoint is a chapter.** Training changes what the game *is* — a rung
automates, a verb leaves your hands — so the narrative beat and the mechanical
shift are the same event. That is the Antimatter Dimensions / Celestials
pattern: narrative as the reward for a milestone that rewrites the rules, never
as an interruption and never as a gate.

This directly fixes what the story audit found: the only vignette in the game
was gated behind a state the HUD paints red, so the dominant player never saw
it. Story that hangs off the economy as a garnish gets skipped. Story that *is*
the economy cannot be.

**Prose is owner-written, as always.** This document specifies beats and
triggers — data — and not one player-facing sentence.

---

## What this keeps, and what it breaks

**Keeps:** attention as allocated capacity; the graph as the board; agents
bought with verified statements; supervision as the quality/speed dial;
never-break-a-save; the real dataset and its licence chain.

**Breaks / needs work:**

- **New stored fields** for each rung. The save's nested backfill was fixed on
  2026-07-26 precisely because a new `ResourceId` would otherwise arrive
  `undefined` and turn into `NaN` on first increment. That fix is a
  prerequisite for this design and it is already in.
- `resources` already contains `data` (inert since v9) and four other dead tier
  fields. Decide whether tokens reuse the `data` id — the field exists, is `'15'`
  at start, and is read nowhere — or land as a new one. Reuse is cheaper and the
  save shape never shrinks either way. Note the id is internal; only the LABEL
  is player-facing, so reuse costs nothing in vocabulary.
- The `TIER_LADDER` loop and `ratePerSecond` (hard-returns `'0'`) are dead code
  that this design would actually give a job.
- The current `recovered()` / coverage definition needs revisiting: under this
  design, coverage against your own corpus and coverage against the source are
  two different numbers and the game shows one while scoring the other.

## Open questions for the owner

1. **How many rungs are visible at once?** Five stocks on a phone HUD is a lot.
   Likely answer: rungs reveal as you reach them, so the first ten minutes shows
   two numbers, not five.
2. **Is Salvage a tap or a trickle?** It is the bottom of the ladder and the
   first thing automated; it may not deserve a verb at all.
3. **Can you ever go back down the ladder?** Un-training, discarding a
   checkpoint, restoring from held-back data — is regression a player action or
   only something that happens to you?
4. **Does the reveal land once, or continuously?** A single dramatic reveal, or
   a second number that has been quietly visible all along for anyone who looked.

## Before anything is built

Simulate it headless. The measurement harness exists and was used today to prove
the old economy's wall in minutes rather than hours of play. **No number in this
document should be believed until it has been run.**
