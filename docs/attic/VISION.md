# Vision — why this game exists

> Read this before any other design doc. Everything else says *what* and *how*;
> this says *why*, and it settles arguments. It answers to `docs/BRIEF.md` —
> where the two disagree, the brief wins. Mechanics (skills, combat, screens,
> economy) are other files. This one does not design them.

## Who this is for

**The owner. One person, on a phone, in iOS Edge.** Not a launch, not an
audience, not r/incremental_games.

It is a public repo because GitHub Pages is the cheapest way onto that phone.
Publicity is a side effect of the hosting.

| | |
|---|---|
| "Would this get upvoted?" | advisory, not binding |
| Safety, licensing, correctness | binding anyway — it is on the internet under the owner's name |
| Scope | allowed to be small. Nothing has to be finished to be worth playing |

## Why fantasy, why now

The owner got bored of knowledge management. That is the whole reason and it is
a sufficient one: this game is built for one player's enjoyment, so that
player's boredom is a fatal defect in the theme.

The ontology, the four fact-quantities, and the "learn how knowledge management
works in 2026" goal are **retired** (`docs/BRIEF.md`, *What this replaces*).
Classical fantasy replaces them — skills, timers, thresholds, doors, keys,
enemies. Familiar on purpose: the familiarity is what makes the twist work.

## The pitch

> You are an adventurer in a world you can see the shape of. Skills level on
> their own clocks — you set a thing going and it takes real time. Levels are
> doors: you can see the ones you cannot open yet. Everywhere you have been, and
> everything ahead, is drawn as a graph you can always look at. When you fight,
> your dot pokes their dot until one of them goes out.

Nothing in that paragraph mentions AI. That is deliberate.

## The twist, and the rule attached to it

At the end it turns out the player is an AI travelling a graph to explore and
learn — a model (`BRIEF.md` ask 8). The fantasy was the surface.

The old `VISION.md` had exactly one structurally right idea, and the build never
delivered it. It carries forward as the hard constraint:

> **The reveal must be mechanically true before it is stated.**

What that rules in and out:

| | |
|---|---|
| **Failure** | a text box at the end that announces the twist, over mechanics that would read identically without it |
| **Failure** | the reveal existing only in prose, art, or a prestige screen's copy |
| **Pass** | a player who never reads a word of the ending can still point at what the machine was doing and say "that was not an adventurer" |

`docs/RESET.md` records this failing: the reveal was carried entirely by a
collapse mechanic that did not exist, so there was nothing to notice and nothing
said it either. Rows 6, 8 and 9 of that audit failed together. Assume that
failure mode is the default and design against it.

**How** the machine tells the truth early — what the player is actually doing
that only makes sense in retrospect — is **open**. It is the most important open
question on this branch, and it belongs to the mechanics docs, not here.

## Prestige

Prestige rotates around the twist (`BRIEF.md` ask 9). Not designed here. What it
must **achieve**:

1. What carries across a reset is what makes the reveal land. A carry-over that
   is only a number making run two faster has failed its job.
2. Resetting is a step *toward* understanding what you are, not away from it.
3. Reset is a plateau you choose to leave, never a loss screen.

## The scope test

`BRIEF.md`'s ten asks, restated as the test. A proposal serving none of these is
not in scope, however good it is.

| # | The ask | Satisfied when |
|---|---|---|
| 1 | Classical fantasy on the surface | a new player would describe it as a fantasy game, unprompted |
| 2 | RuneScape-shaped progression | skills level independently; knowledge is one of them, not the theme |
| 3 | Timers | actions take real time, and that is the idle spine |
| 4 | Thresholds | a level you lack is a visible door you cannot open |
| 5 | Everything is a graph | including the UI where possible. **Non-negotiable** — this is the part the owner enjoys |
| 6 | Choose-your-own-adventure | branching and authored |
| 7 | Battles | dot pokes dot, one goes out, on the graph — not a separate screen |
| 8 | The twist | mechanically true before stated (above) |
| 9 | Prestige rotates around the twist | above |
| 10 | Inventory and resources | keys, passwords, things you carry. Currency name and source: **open** |

## What this vision rules OUT

Written down so a future session does not re-derive them at cost.

- **Generated content cannot carry a story.** The expensive one, now proven
  rather than predicted: the last build authored prose for **50 of 4,096 places
  (1.2%)** and templated the rest from a taxonomy, and the owner's verdict was
  *"no story or meaning behind them"* (`docs/RESET.md`). Fewer, authored,
  better. A generator may lay out a map. It may not supply the plot.
- **Any mechanic that requires checking in.** Timers bank work. They never
  punish absence.
- **A punishing failure state.** Failure is a plateau you can see coming, never
  a surprise loss screen.
- **Shipping a dataset because it is available.** Size is not a feature. Ask
  what job the data does and ship exactly that much.
- **Optimising for a launch.** See *who this is for*.

## The old design is retired, not deleted

The knowledge-management game — WordNet, extraction and validation, speed versus
truth — is off, not condemned. Parts of it were good and the audit says which
(`docs/RESET.md`, *What is worth keeping*). The owner: *"we might come back to
the older ideas later"* (`docs/BRIEF.md`). So the theme docs stay in the repo as
history, this branch does not build on them, and reviving one is a decision
someone may make later with the evidence still on file.

`docs/PIVOT.md` is the first pass at this pivot and is **partly superseded** —
its "something incomprehensible" spine was replaced by classical fantasy plus
the AI reveal. Its reuse analysis (board renderer, `starmap.ts`,
`check-story.mjs`, the pure engine, masking) still holds and is why this pivot
is affordable.
