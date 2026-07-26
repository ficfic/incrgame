# The economy — the refinement ladder

> **Status: PROPOSED, revision 2, 2026-07-26.** Chosen by the owner from four
> options after the previous economy was found not to meaningfully exist.
> Supersedes `ECONOMY_MODEL.md`.
>
> **Revision 2 exists because two independent reviews took revision 1 apart and
> agreed on three structural holes**: loss with no counter-lever, no compounding
> term anywhere, and a twist that retroactively rescores the player's progress.
> Revision 1 also contained a **statistical error about the paper it cites** —
> see "Retention", below. All three fixes are in.
>
> **Nothing here is built. No number here is a number — it is a shape wearing a
> digit.** Simulate headless before believing any of it.

---

## The one-sentence version

You salvage raw text from a collapsed internet, refine it up a ladder into
training data, train a model on it, and the model automates the rung it was
trained on — at a **yield you can see, fight, and never quite fix.**

## Why this shape

The owner's framing: *"the entire thing we are doing is actually training AI."*
That is requirement (d) — "the end goal turns out not to be the real goal" —
which an audit found existed nowhere in the code. It is not a text reveal, it is
the structure.

**Every rung is a real word.** Tokens is the literal unit a model trains on and
the unit the industry bills for; Statements is RDF's own term for a triple;
Batches and Checkpoints are what practitioners say. Nothing is coined. In a game
whose charter is that every concept matches its real definition, **a coined
resource name is a theory violation, not a flavour choice** — which is why
"Datums" failed three separate times.

---

## THE YIELD IS THE GAME

Revision 1 said "the loss is the game". That was the central error and everything
else followed from it.

A constant fractional loss is **not a mechanic**. If 100 tokens yield 10
statements, that is arithmetically identical to a lossless conversion at 10:1 —
a units change, and in series `output = input × Πyᵢ` is one coefficient.
Doubling the bottom of the ladder doubles the top. Forever. The player stops
noticing by minute 15.

Worse, it *feels* like a tax. Every lever in revision 1 was a choice between two
things being taken away, and the only named mitigation cost speed — the mitigation
for loss was more loss. The predicted review: *"neat theme, but every button in
this game makes my numbers smaller."*

So the rule for everything below:

- **Yield is shown as a percentage, never as a subtraction.** `extraction 62%` is
  a stat you optimise; `lost 4,300` is a punishment. Same number, opposite game.
- **Yield is attributable.** The player can always see *why*: "62% because you
  automated this rung", not "because physics".
- **Yield is upgradeable, and capped strictly below 100%.** The climb is the fun;
  the ceiling is the tension. Revision 1 shipped the ceiling with no climb.

## The ladder

| # | Resource | Faucet | Sink |
|---|---|---|---|
| 1 | **Tokens** — raw salvaged text | Salvage, from a chosen **source** (see below) | Extraction |
| 2 | **Statements** — a subject–predicate–object triple | Extraction | Verification |
| 3 | **Verified** — a statement checked against the graph | Connect / Review / supervised agents | Curation · agent costs · retention |
| 4 | **Batches** — a curated training set with a *composition* | Curation | Training runs |
| 5 | **Checkpoints** — a trained model | Training runs | Automating a rung · unlocking verbs |

**Three stocks are live on the HUD** — Tokens, Verified, Checkpoints. Statements
is a *provenance split of one number* (the engine already does exactly this with
`state.provenance`), and Batches exist only at the moment of training. Eight
simultaneous numbers does not survive a phone; four independent ones is about the
limit.

**But the whole ladder is visible from minute one, greyed out, with real costs.**
Locked-content teasers are among the strongest retention devices in the genre and
this project already learned that once.

### ⚠️ A HARD CONSTRAINT, so a later session cannot optimise the game away

**Verified and Batches carry IDENTITY, not just magnitude.** They are
distributions over concepts, not scalars. The entire differentiator of this design
is that losing 30% means losing *specific rare concepts*, not 30% of a number.

The moment someone stores rung 3 or 4 as a bare `Decimal` for save-size or
performance reasons, the differentiator silently evaporates and this becomes a
conversion chain with unusual nouns. A weight histogram over 4,096 concepts is a
few hundred bytes. **Cheaper than the alternatives, and not negotiable.**

## Where the loss actually bites

Constant yields are the **gearbox** — they set pacing. They are not the engine.
Exactly two things make loss bite, and the design needs one of each:

**1. Absolute capacity, not proportional share.** One rung must convert at a rate
capped in absolute units. Then out-producing it does not out-produce the loss — it
just lowers your verified *share*. Verification is the candidate, and **Attention
is already the right allocator.**

Note the collision this creates, because it is real: `REVIEW_SAMPLE_SHARE` and
`AUTO_REVIEW_SHARE` are deliberately *proportional* to honour no-babysitting. You
cannot have both proportional review and a ladder where loss matters. The honest
compromise: **absolute human capacity, plus a proportional-but-worse machine
buyout** — which preserves the HITL guardrail rather than quietly repealing it.

**2. Recursive loss — the actual paper.** `q(n+1) = f(q(n))`, where the batch that
trains checkpoint *n+1* was produced by checkpoint *n*. Revision 1 described tail
loss as a property of *curation* rather than as a *recursion over generations*,
which is Shumailov with the mechanism removed. Make `f` a contraction and you get
geometric decay to a fixed point — a floor, a plateau, which VISION already says
it wants. Without the recursion there is no compounding and no collapse, only a
fixed discount.

**Rot must cost RATE, not just score.** The current engine already gets this: the
total gate on recovery is `f³`, so a rotted graph grinds a very hard tail rather
than merely scoring lower. Revision 1 dropped it, which made the fastest route to
every chapter the dirtiest one. Carry it forward.

## Where growth comes from

Revision 1 had **no compounding term at all** — every mechanism in it was linear.
An incremental without an exponential goes flat in the mid-game and dies, and the
stack carries `break_eternity` for numbers this design would never reach. That was
a smell and it was hiding a hole.

**Checkpoints multiply their rung's rate, and stack multiplicatively across
rungs.** That is the exponential. The counter-force is the recursion above: each
generation of checkpoint trains on material the previous generation produced, so
throughput compounds while quality contracts. **The race between those two curves
is the mid-game**, and it is the first thing to simulate.

## Retention: the corrected mitigation

> **Revision 1 was statistically wrong here and it must not be repeated.** It said
> "hold back some verified statements from curation and your batches keep their
> tails". A uniform random subset of a distribution has *the same shape* as the
> whole distribution — withholding 20% at random preserves nothing about the
> tails, it just reduces sample size. As written it charged real throughput for a
> benefit that does not exist, and it taught the player something false about the
> paper the game is built on.

Shumailov's named mitigation is about the **composition** of the training set —
retain original human-produced data and mix it in — not about volume withheld. So:

- **Retention is selective.** You withhold *rare* (low-`weight`) statements
  specifically. `weight` already exists as real taxonomic generality in
  `src/render/detail.ts` and already drives node size and LOD. Withholding the rim
  is a targeting decision, and it is the correct reading of the paper.
- **Retention is non-stationary**, so it cannot be solved once with a slider:
  - Verified has **three competing sinks** (curation, agents, retention). Holding
    tails back means not building the agent, and the exchange rate moves as your
    corpus goes synthetic.
  - **Held-back statements have a shelf life** — `REDRIFT_SCALE` already decays
    verified back to unchecked as ancestry becomes synthetic. Hoarding tails is a
    race, not a savings account.
  - **What you intend to automate next changes what tails are worth.** A checkpoint
    for Salvage does not need rare data. A checkpoint for Verification desperately
    does.

"Always retain 18%" is a chore. "Do I spend my rare statements on the agent now, or
save them for the verification checkpoint in twenty minutes" is a game.

## Salvage has a source, and the source has a shape

Rung 1 in revision 1 was admitted filler — "cheap, endless, boring" — which is the
cookie again wearing a new name. A rung that is boring by design, automated
immediately, and has one sink is a multiplication by a constant.

**Fix: where you salvage determines the distribution of what you get.**

- **Common ruins** → head-heavy tokens. Fast, cheap, plentiful.
- **Deep archives** → tail-heavy tokens. Slow, expensive, and the only real source
  of the rare material retention is trying to preserve.

This earns its keep four ways: the bottom rung becomes the *faucet for the tails*,
so Shumailov's mitigation has a **source** rather than only a hoarding option; rung
1 stops being filler; the ladder gains a genuine second fork; and the distribution
mechanic starts at rung 1 rather than appearing at rung 4 — which is what stops a
future session from implementing rungs 1–3 as scalars and gutting the design.

It is also the **minute-three decision** the pacing needs. Speed versus breadth,
same substance, both on-theme.

## Automation: a tradeoff you configure, never a tax

The genre's law here is not negotiable: **automation that is a configurable
tradeoff is beloved; automation that is an unavoidable tax is the single most
complained-about mechanic in every idle game that has one.** Factorio's pollution
is loved because it is a rate you invest against. Paperclips' probe drift works
because the drift/speed slider is *a control you set*.

Revision 1 said both things in adjacent sentences — "automates the rung, badly"
(tax) and "decide which rung to hand over and when" (tradeoff) — and did not notice
they were different games.

Three things must hold:

1. **Every rung must be viable to automate in different orders**, with different
   consequences. If a dominant order exists it is a tutorial, not a decision.
   Revision 1 failed this outright: in a serial chain throughput is
   `min(capacity)`, so the optimal order is always "automate the current
   bottleneck" — which is 1,2,3,4 for any monotone cost curve, and rung 1 was
   specified as *endless* and therefore never the bottleneck, making the game's
   tutorial button a strictly dominated move whose rot propagates through four
   conversions.
   **So: make the throughput gain AND the damage both largest at the bottom.** The
   gradients then oppose, and "how far up do I hand over, and how early" becomes a
   real problem with an interior optimum that moves with the corpus.
2. **A path to full automation at *acceptable* quality must exist** — expensive,
   late, hard-won. Not perfect. Acceptable.
3. **Automating must be always-eventually-correct.** If manual ever stays better,
   this is a game that punishes idling, in the idle genre.

Each checkpoint therefore carries a **speed/fidelity slider, adjustable after
training**, modelled on the Paperclips probe designer. Deployment-time
quality/latency tradeoffs are precisely what the satire is about.

**Rot is a rate you fight with investment, never a ratchet.** If rot is monotone,
every save's endgame is "everything automated, everything dark" — a terminal state
strictly worse than the opening, which players find in six hours and post about.

**Darkness must be recoverable in one visible move** (re-verify from retained
data), not a re-grind. VISION locks "nothing the player CHOSE is ever deleted out
from under them", and a rim concept going dark because a checkpoint *you trained*
sampled badly is structurally the game taking something you earned. Best visual in
the design, one decision away from being the ragequit trigger.

## The two numbers — a GATE, not a reveal

**Stated goal:** train a checkpoint that restores the whole 4,096-concept world.

Coverage measures agreement with **your own corpus**. The model's benchmark is the
material you fed it, so it can only ever score its own homework. Because the real
dataset ships in `public/ontology/`, **agreement with the source is a second number
that genuinely exists and is computable at any moment.**

Revision 1 planned to reveal it late. Both reviews independently rejected that, and
they are right: a late-revealed second number **lands when it recontextualises the
player's choices and fails when it rescores their progress downward.** "94% was
fake, you're actually at 31%" is the second thing, and the thread writes itself —
*"so the game lied to me for twelve hours."* They would be correct, because the
optimal play before and after the reveal are opposites, which means the game
punished them for playing it well.

**So both numbers are on screen from minute one.** Unexplained, unremarked, small.
Nobody can claim they were lied to — the number was right there, and they can
screenshot their own first session to prove it. It is *more* thematically exact:
nobody hid the eval, the eval was contaminated in public and you did not read it.
The reveal becomes the player realising what they have been looking at all along,
which is a far better feeling than being told.

**And then the second number does mechanical work, which is what stops it being
stranded a third time** (`displayedFidelity` vs `fidelity` was built and never
triggered, because nothing forced the player through it):

- **Training a checkpoint gates on VOLUME** → needs throughput → needs automation.
- **Coverage gates on SOURCE AGREEMENT** → needs human-sourced, tail-rich material
  → needs *not* automating.

Neither is skippable, and that single constraint kills both dominant strategies at
once: pure hand-play cannot generate the volume for a checkpoint, and pure
automation cannot move source agreement. **The interior of that tradeoff is the
game**, and the player is forced through it on every chapter.

## Where the story lives

Each **checkpoint is a chapter**, because training changes what the game *is* — a
rung automates, a verb leaves your hands. The narrative beat and the mechanical
shift are the same event: narrative as the reward for a rule-rewriting milestone,
never an interruption and never a gate.

This is the fix for what the story audit found: the only vignette in the game was
gated behind a state the HUD paints red, so the dominant player never saw it. Story
that hangs off the economy as a garnish gets skipped; story that *is* the economy
cannot be.

**Prose is owner-written.** This document specifies beats and triggers — data — and
not one player-facing sentence.

---

## Pacing targets, stated as requirements

- **Minute 3** — first real fork (common ruins vs deep archives).
- **Minute 20, hard ceiling 45** — first Checkpoint. Rung 5 *is* the thesis; if
  chapter 1 is three hours out, nobody ever sees the game's actual idea and every
  review says "conversion chain, seen it."
- **Minute 10** — the full ladder is visible, greyed, with real costs.
- **Hour 1** — one rung automated, first rim-darkening, both numbers diverging.

## Open questions for the owner

1. **Is checkpoint count bounded at one per rung, or unbounded (v2, v3 of the same
   rung)?** Bounded → automation is exhausted in one session and prestige carries
   the back half. Unbounded → geometric throughput, and the quality recursion must
   be a genuine contraction or it runs away. **The largest missing number.**
2. **Can a checkpoint automate Training itself?** A literal self-training loop —
   either the endgame beat of the project or an unbounded runaway. Both are good
   answers; not choosing is not.
3. **What carries forward positively through prestige?** Every prestige in the
   genre makes you stronger. This one currently makes you richer *and more wrong*
   along two axes at once, with no stated permanent gain — a hole with a save
   migration on the far side of it.
4. **Is there a downward verb?** Roll back a checkpoint, restore a rung to hand
   operation, refund nothing. Without one every conversion is irreversible and
   there is risk-free rate rather than risk — and a decision with no downside is
   not a decision.

## Before anything is built

Simulate headless. The harness exists and proved the old economy's wall in minutes
today. Two questions kill this design and both are answerable before a component is
written:

- **Does automating ever become correct?**
- **Is the endgame board dark?**

Plus: **simulate the yield curve and the terminal state at hour 12.**

**Free call, worth taking:** reuse the existing `data` `ResourceId` for tokens. It
is `'15'` at start, read nowhere in play, and a new id is fresh backfill surface on
a save-integrity rule that cost a day to fix. The id is internal; only the label is
player-facing.
