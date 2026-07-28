# Vision — why this game exists

> **Read this first, before `SPEC.md`, before `GAME_DESIGN.md`, before writing a
> line of code.** Every other document in this repo says *what* and *how*. This
> one says *why*, and it is the one that settles arguments.
>
> It exists because it didn't, once, and a session shipped 107,519 concepts
> nobody wanted because nothing in the repo could say that was the wrong thing
> to build. Local optimisation looks correct from inside. This is the check.

## Who this is for

**The owner. One person.** Not a launch, not an audience, not r/incremental_games.

It lives in a public repo because GitHub Pages is the easiest way to get it onto
a phone — publicity is a side effect of the hosting, not a goal.

What follows from that:
- Feedback framed as "would this get upvoted" is **advisory, not binding**.
- Feedback about **safety, licensing and correctness is binding anyway**, because
  it is genuinely on the internet under the owner's name.
- Scope is allowed to be small. Nothing has to be finished to be worth playing.

## What it's for

1. **The owner wants to enjoy playing it.** They love incrementals. If a
   mechanic isn't fun to sit with, being clever doesn't save it.
2. **The owner wants to learn how knowledge management works in 2026.**

That second one has a trap in it, so it's worth being exact:

> **The dataset is not the curriculum. It's the lab bench.**

You don't learn 2026 knowledge management by reading WordNet — WordNet is
lexical semantics from the 1990s. You learn it by doing *2026 things to a real
graph*: extraction, validation, provenance, entity resolution, reasoning, and
what happens when a language model generates your knowledge for you.

The data has to be **real** so those operations aren't fake. It does not have to
be **complete**. Roughly four thousand genuine concepts with genuine definitions
and a genuine hierarchy is a lab bench. A whole lexicon is a landfill.

## What the game is

**An incremental game about the tension between speed and truth.**

Machines generate knowledge quickly and none of it is checked. Unchecked
knowledge rots, and what has rotted is gone for good — you watch the cost of
your own speed accumulate on screen. Review is the only brake, and review is
slow.

*(As shipped: Rot is a permanent loss and a scoreboard. It does not yet stall
anything — the old "reasoning over contradictions degrades" mechanism was
deleted with the rest of the old economy. See the status note below.)*

That tension is not a metaphor for the real problem. It **is** the real problem,
which is why the "learn something" goal and the "have fun" goal stop competing
and become the same mechanic. **Protect that.** It is the best property this
design has.

## The eight things the owner asked for

Everything below is load-bearing. If a proposal serves none of these, it isn't
scope, however good it is.

1. An incremental game about graphs and knowledge, with modern AI themes.
2. Fun to play, in the genre's own terms.
3. Teaches how knowledge management actually works in 2026.
4. **AI does the work** — agents, automation, scale.
5. **Human-in-the-loop** — but see the guardrail below.
6. **A real chance of failure** — collapse, hallucination, rot.
7. **You fail the stated goal and try again** via prestige.
8. **The stated goal turns out not to be the real goal.**
9. **Narrative, as branching choose-your-own-adventure vignettes.**
10. **Lots of graphs, connecting and moving** — because it's good to look at.

> ## ⚠️ The old economy's numbers are gone, not repaired
>
> This section used to carry fidelity curves, a supervised-share limit and a
> "100% → 67% / 22% / 2%" recession. Two agent audits and a headless simulation
> found all three false about the build in 2026-07-26 — the fast branch had
> been deleted by an array-aliasing bug, so there was nothing to decay — and
> the owner then replaced progression wholesale. **The economy below is the one
> that shipped on 2026-07-28** (`docs/ECONOMY_SRR.md`, marked BUILT). Nothing
> from the old model was patched back on; it was deleted.

## The economy: four quantities, one substance

**There is no currency but Solid.** Four numbers, and three of them are one
substance in three states:

| | |
|---|---|
| **Words** | concepts you can read now. Up when you arrive somewhere new; never down. |
| **Solid** | checked facts that never rot. The only thing you spend. |
| **Raw** | machine facts nobody has checked. It rots, or it gets checked. |
| **Rot** | facts worn out, permanently. Only a Retrain clears it. |

**The join is the whole design:**

    factsPerSecond = min(0.4 × machines, 0.15 × Words)

You cannot extract relations about entities you do not hold. So machines are
capped by vocabulary, vocabulary only grows by **walking the story**, and
walking the story is therefore the only income upgrade in the game. An
idle-only player flatlines in about ten minutes and can read exactly why.
Without this the story and the idle loop are two games sharing a screen.

**Speed versus truth is one toggle per machine.** Watched: 0.55× rate, and
everything it makes arrives Solid. Loose: full rate, and everything it makes
arrives Raw. You may run more machines loose than you can ever check, and that
is the trap: **the failure is something you do to yourself.**

Machines are bought with Solid — with checked knowledge — so a graph you let rot
cannot build another machine. Steps into the story are bought with Solid too,
and priced exponentially in the concepts you have walked this run. That
exponential against a linear vocabulary cap is the plateau, and you can see it
coming for an hour before it arrives.

*(Attention — capacity you allocated, booked and reserved — was deleted on
2026-07-27 at the owner's word: "i dont like the attention anymore yeah." It
was the same tension with bookkeeping attached.)*

## The three decisions that shape everything

Owner calls. Changing one of these changes the game.

**Collapse is soft rot.** Unchecked knowledge wears out: Raw decays into Rot,
permanently, and Rot is the running total of what speed cost you. Nothing the
player CHOSE is ever deleted out from under them — Words never fall, not even
across a Retrain — and there is no losing screen. You don't die, you
**plateau**, and then you choose to move on.

**Prestige inherits your own synthetic output.** What carries into the next run
is not the real data. It is 25% of what your machines minted, arriving as
**Raw** because it never was checked — and `syntheticShare` rises, so Raw rots
faster every generation. Each generation starts richer and more wrong.

> ### ⚠️ STATUS 2026-07-28: STILL NOT TRUE IN CODE, AND NOW THERE IS NO MECHANISM
> The `SOLID · RAW · ROT` rewrite deleted REDRIFT, which was the only thing
> making a later generation structurally worse than an earlier one. What is left
> is that `syntheticShare` rises every Retrain and Raw rots faster for it —
> **Rot is a sink and a scoreboard, not a multiplier.** Words never fall, so
> `Words N / 4075` is still a ratchet.
>
> What DOES bound a run is the price curve: `ceil(6 × 1.04^stepsThisRun)` Solid
> per new concept, against income capped at `0.15 × Words`. Walking 120 concepts
> costs ~16,450 Solid; walking 300 costs 2.1 million. That is an honest plateau
> and it is visible an hour out — but it is not the same claim as "unreachable by
> construction", and nobody may state that claim as fact until a measurement
> supports it. Re-deriving it from this design is an unstarted item.

That is the structure of the model-collapse result
([Shumailov et al., *Nature*, 2024](https://www.nature.com/articles/s41586-024-07566-y)),
made literal. It also means **the reveal is mechanically true from the first run,
before it is ever stated**: the stated goal is to complete the graph; the real
situation is that you are the model, and you have been collapsing all along.
100% is unreachable *by construction*, and gets further away every generation.

**Nothing rots while you are away.** Not slowly, not a little. But away time
can't be a free lunch either, or closing the game becomes optimal. So absence
**banks** work instead of completing it: you come back to a job, never to damage.

## Hard rules

These outrank cleverness, including mine.

- **★ Player-facing sentences are machine-drafted and owner-edited.**
  *(Reversed 2026-07-27; see `docs/DECISIONS.md`. The prior rule was "every
  sentence is written by the owner, never generated".)* Agents draft; the owner
  iterates over the drafts, repeatedly, and that iteration is the point. A game
  that satirises AI slop still cannot **ship** AI slop — so the test is whether
  the owner would defend the line, not whether it exists. Quoted dataset text
  stays verbatim and attributed. The `⟨owner⟩` slot machinery now marks prose
  the owner has not yet passed over, rather than prose that does not exist.
- **Human-in-the-loop is never mandatory.** **Checkers** buy review out at a
  worse Solid-per-fact, and they run while you are away. Tapping **Check** is a
  min-max lever for when the owner feels like it — no cooldown, no queue, and it
  falls behind exponential production by construction. An idle game that demands
  babysitting isn't an idle game.
- **Saves are breakable.** *(Reversed 2026-07-27; see `docs/DECISIONS.md`. The
  prior rule was "never break a save, additive forward migrations only".)* The
  owner has said they are fine losing a save at any time, so a migration is a
  convenience to be written when cheap, not a precondition for shipping. State
  it in the commit when a change resets saves — silently is still wrong.
- **Theory-appropriate terminology, always.** The owner is here to learn. Where a
  mechanic simplifies real theory, the simplification is labelled
  (`docs/SIMPLIFICATIONS.md`). The glossary wins unless a decision says otherwise.
- **The engine knows nothing about the screen.** `src/core/` is pure and knows
  only integers. This is why the ontology could be swapped in with zero engine
  changes and zero save migration, and it is worth keeping for that reason alone.

## What this vision rules OUT

Written down so a future session doesn't re-derive them at cost:

- **Shipping a dataset because it is available.** Size is not a feature. Ask what
  job the data does; ship exactly that much.
- **Making the ordering of data carry the story.** It can't. Narrative lives in
  the vignettes; data is the substrate they act on.
- **Optimising for a launch.** See "who this is for".
- **Any mechanic that requires checking in.** See the HITL guardrail.
- **A punishing failure state.** Failure here is a plateau you can see coming for
  a long time, never a surprise loss.
