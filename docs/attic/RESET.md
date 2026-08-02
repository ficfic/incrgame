# Reset — the original design, against what is actually built

**Written 2026-07-29**, at the owner's word: *"we need a complete reset where we
review the original ideas and design for the game and see what fits and what
does not, high level."*

This is an audit, not a proposal. It scores `VISION.md`'s ten asks against the
code as it stands, with the evidence in each row. No new mechanics are invented
here. What to do about it is a separate conversation and a separate document.

---

## The scoreboard

| # | The owner asked for | Status | The evidence |
|---|---|---|---|
| 1 | An incremental about graphs and knowledge, with AI themes | **fits** | 4,096 real WordNet concepts, machines that mint facts, a board you travel |
| 2 | Fun to play, in the genre's own terms | **does not** | owner, three times, on three builds: cannot tell what the game is or what the buttons do |
| 3 | Teaches how knowledge management works in 2026 | **half** | extraction and validation are modelled (Raw→Check→Solid). Provenance, entity resolution and reasoning are not in the code at all |
| 4 | AI does the work — agents, automation, scale | **fits** | machines, the watched/loose toggle, offline banking |
| 5 | Human-in-the-loop, never mandatory | **fits** | `Check` has no cooldown and falls behind production by construction |
| 6 | A real chance of failure — collapse, hallucination, rot | **does not** | `state.rot` is read by `narration.ts`, `readouts.ts` and `reveal.ts` and by nothing else. It is a number that goes up. It gates no rate, blocks no action, and costs nothing |
| 7 | You fail the stated goal and try again, via prestige | **half** | Retrain works and `syntheticShare` rises. But `VISION.md` records that REDRIFT was deleted with the old economy, so nothing makes generation 2 structurally worse than generation 1 |
| 8 | The stated goal turns out not to be the real goal | **does not** | this reveal was carried entirely by 7. With no collapse mechanism there is nothing to notice, and no line in the game states it either |
| 9 | Narrative, as branching choose-your-own-adventure vignettes | **does not** | owner, playing the deployed build: *"I do not see any choose your own adventure elements here. It is just two choices which lead to more choices, but there is no story or meaning behind them"* |
| 10 | Lots of graphs, connecting and moving, good to look at | **fits** | the strongest thing in the build, and the only part no playtest has complained about |

Four fit. Two are half-built. Four do not exist.

---

## The single root cause, and it is written in the vision

`VISION.md`, under **What this vision rules OUT**, says:

> **Making the ordering of data carry the story.** It can't. Narrative lives in
> the vignettes; data is the substrate they act on.

That is exactly what the build does.

`public/story/index.json` reports **446 beats, of which 50 have prose.** The
other 396 are assembled at load time from nine frame sentences — `arrival`,
`descent`, `threshold`, `leaf`, `continue`, `branch`, `sideways`, `ascend` — with
the concept's name substituted in. And 446 beats cover 4,096 concepts, so the
remaining 3,650 places render as a `leaf` frame with a noun in it.

**Authored prose covers 50 of 4,096 places: 1.2%.** The other 98.8% of the
"story" is the WordNet hypernym tree with sentence templates wrapped around it.
A taxonomy walked top-down is not a plot. It has no protagonist, no stakes, no
reversal and no consequence, because a hierarchy has none of those things — and
the owner's verdict on playing it is the predicted outcome, not a surprise.

The vision called this in advance and the build did it anyway. **Row 9 fails,
and rows 2 and 8 fail largely because of row 9.**

## The second cause: the tension is missing its second half

The pitch is *speed versus truth*. Speed is fully modelled. Truth is not:

- Loose machines make more, Raw rots, Rot rises. All real.
- **Rot does nothing.** It is not a multiplier, not a blocker, not a decay on
  anything you own. Grep it: three files read it, all of them to display it or
  to decide whether a readout has been unlocked.

So the trap in the design — *"you may run more machines loose than you can ever
check"* — has no jaws. A player who runs everything loose forever is not
punished, not slowed, and not wrong. That is why row 6 fails, and row 8 with it:
the reveal was supposed to be *mechanically true before it is stated*, and there
is currently no mechanism for it to be true of.

## What is worth keeping, unambiguously

Stated plainly so a reset does not throw out the parts that work.

- **The board.** Graph, layout, level of detail, the frontier now drawn on it.
- **The language.** Foreign words earned by discovery and frequency. Nobody has
  complained about it since English function words were seeded; it is the most
  distinctive thing here.
- **The join.** `factsPerSecond = min(1.2 × machines, 0.15 × Words)`, measured
  word-bound 67–74% of a run. It is one sentence and it makes idle and travel
  the same game.
- **The engine's purity.** `apply(state, action) => state`, no DOM, no clock, no
  RNG. It is why the ontology could be swapped with zero engine changes.
- **The gates.** `check-story.mjs` and friends, each proven red at least once.

## What the reset has to decide

Three questions, and they are the owner's, not this document's.

1. **Where does narrative actually live?** The vision says vignettes acting on
   the data. The build derived it from the data instead. Reinstating authored
   vignettes means far fewer, much better places — not 4,096 templated ones.
2. **Does Rot get teeth, or does the pitch change?** Either failure becomes real
   (rows 6, 7, 8 come back together) or "speed versus truth" stops being the
   headline. Half-doing it is the current state and it satisfies nobody.
3. **Is the WordNet hierarchy the map, or just the material?** Travelling a
   taxonomy top-down is what makes every choice feel identical. The graph is
   worth keeping; walking it in hypernym order may not be.

## What this document does not do

It does not propose a new design, pick between the three questions above, or
authorise deleting anything. `ROUTES.md` remains an accepted-but-unbuilt spec
and is untouched by this. The next step is the owner's call on question 1.
