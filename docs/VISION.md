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

> ## ⚠️ MEASURED FALSE — re-measure before trusting the numbers below
>
> Flagged 2026-07-26 after two agent audits and a headless simulation of the
> shipped engine. Three claims in this document were false about the build:
>
> - **"the plateau FLOORS around 36–50% fidelity"** — with zero Extractors,
>   `unverified` is identically 0, so `drift × 0 = 0` and fidelity is exactly
>   1.000 forever. There was no floor because there was no fall.
> - **"the RECESSION is real and structural: 100% → 67% / 22% / 2%"** — those
>   curves cannot be reproduced. Every strategy that included a machine was
>   hitting an array-aliasing bug in `trimEdges` that deleted the player's
>   entire graph, so the fast branch did not exist to decay.
> - **"100% is unreachable by construction"** — unreachability came only from
>   the asymptotic `(1 − coverage) × f` term, not from collapse. Hand play now
>   reaches 100% in ~4 hours of perfect tapping (measured, post-fix).
>
> The `trimEdges` and anchor-eviction bugs are fixed and the economy has NOT
> been re-measured against them. **These numbers are stale.** The documents were
> not lying; they described a game a bug had removed.
>
> **Do not re-measure the old economy to repair them** — the owner has said
> progression is being replaced wholesale (2026-07-26). These claims should be
> re-derived from the NEW design, not patched back onto the old one.

## The economy: one resource, allocated

**There is no currency.** Two things exist:

- **Statements** accumulate, split by provenance — verified, unchecked, drifted.
- **Attention** is capacity you *allocate*: free, booked onto work, or reserved
  to supervise an agent. It is never spent, and it always comes back.

Supervised agents produce slowly and clean. Unsupervised agents produce fast and
raw — and raw is what rots. You may run more agents than you can watch, and that
is the trap: **the failure is something you do to yourself.**

Agents are distilled from verified statements, so a graph you let rot cannot
build another agent.

Capacity grows logarithmically with verified knowledge. Agents are priced
geometrically, so their **count grows logarithmically too** — just faster:
capacity gains 4.5 slots per decade of verified knowledge, agents gain 8.78.

So supervised share decays toward **~51%**, not to zero, and steady-state
fidelity is closed-form: `f∞ = 0.55·s / (1 − 0.45·s)`. At s = 0.8 that is
**68.75%**, which is exactly the 67% the 8-hour simulation produced.

**The plateau is real and it is structural — but it FLOORS around 36–50%
fidelity rather than collapsing.** An earlier version of this document claimed
supervised share → 0; that was an interpretation error, not a measurement one.
The simulation was right and the sentence about it was wrong.

A floor you can feel is arguably the better game. What it is *not* is a
mechanism that makes the stated goal unreachable — see below.

## The three decisions that shape everything

Owner calls. Changing one of these changes the game.

**Collapse is soft rot.** Contaminated knowledge loses its meaning and its yield.
Nothing the player CHOSE is ever deleted out from under them (rotted lines are removed — that is the mechanic — but a concept only ever goes dark, never off the board, and relighting is one action), and there is no losing screen.
You don't die — you **plateau**, and then you choose to move on.

**Prestige inherits your own synthetic output.** What carries into the next run
is not the real data. It's what your machines generated: unverified, and it rots
faster. Each generation starts richer and more wrong. Coverage climbs while
fidelity falls.

> ### ⚠️ THE GOAL IS STILL REACHABLE, AND NOW WE KNOW WHY
> **Coverage is a ratchet.** `recovered()` only ever goes up, and the
> `(f − coverage)/f` term stops the *rate* without ever taking a concept back.
> So the dominant strategy is: supervise everything while agents are few, race
> coverage to 4,096, then stop caring — the plateau becomes a cosmetic bar over
> a race you already won. That is why three balance passes failed; they were
> tuning the speed of a race rather than making it losable.
>
> The fix requires **edges that carry data**: a concept counts as recovered only
> while at least one non-drifted statement supports it. Rot the statement and
> the node goes dark — still there, still re-verifiable, nothing deleted. That
> makes coverage able to fall, which is the only honest route to "unreachable by
> construction". It is impossible today because edges are `[a, b]` number pairs.
>
> ### ⚠️ STATUS (updated 2026-07-25, after the attention rework)
> The RECESSION is now real and structural: measured over 8h, an 80%-supervising
> player decays 100% → 67% fidelity, balanced → 22%, unsupervised → 2%. Coverage
> itself is still completable in a careful first run (~2-4h); the collapse story
> lives in fidelity and across generations, not in the coverage bar. Earlier
> note, kept for the record:
>
> ### ⚠️ STATUS: NOT YET TRUE IN CODE (2026-07-25)
> Measured over a simulated 12-hour run: an attentive generation-1 player
> reaches **100% coverage in about four hours**, and an idle one reaches 97.5%
> in eight. The recession across generations *is* real — fidelity now caps at
> ~96% in generation 2 and ~91% in generation 3 as synthetic ancestry rises —
> but coverage itself completes. **"Unreachable by construction" is the design
> intent, not the shipped behaviour.** Balance pass is the top item in BACKLOG.
> Do not repeat this claim as fact until a simulation says otherwise.

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
- **Human-in-the-loop is never mandatory.** Orchestrators buy review out at a
  worse quality-per-cost. Manual review is a min-max lever for when the owner
  feels like it. An idle game that demands attention isn't an idle game.
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
