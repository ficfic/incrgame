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
knowledge rots. Rotted knowledge stalls everything, because reasoning over
contradictions doesn't degrade gracefully. Review is the only brake, and review
is slow.

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

## The three decisions that shape everything

Owner calls. Changing one of these changes the game.

**Collapse is soft rot.** Contaminated knowledge loses its meaning and its yield.
Nothing is ever deleted out from under the player, and there is no losing screen.
You don't die — you **plateau**, and then you choose to move on.

**Prestige inherits your own synthetic output.** What carries into the next run
is not the real data. It's what your machines generated: unverified, and it rots
faster. Each generation starts richer and more wrong. Coverage climbs while
fidelity falls.

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

- **★ Every player-facing sentence is written by the owner** — or quoted verbatim
  from a licensed dataset with attribution. The pipeline generates structured
  data only: numbers, ids, gates, graph shape. **Never sentences.** A game that
  satirises AI slop cannot ship AI slop. Unwritten prose renders as a visible
  `⟨owner⟩` slot so an unfinished vignette looks unfinished, never quietly fake.
- **Human-in-the-loop is never mandatory.** Orchestrators buy review out at a
  worse quality-per-cost. Manual review is a min-max lever for when the owner
  feels like it. An idle game that demands attention isn't an idle game.
- **Never break a save.** Additive forward migrations only. The owner plays their
  real save; corrupting it loses real progress.
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
