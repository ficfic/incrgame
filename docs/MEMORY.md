# Node memory — the graph remembers you, and remembers you wrong

**Status: spec, not built.** Owner asked for inventory and node memories,
2026-07-27. This is a save-format decision, which is one of the few things
`CLAUDE.md` rule 3 says earns a document before code.

## The one-line version

**What carries across a reset is not what you know. It is what the graph
remembers you doing — and it remembers imperfectly.**

## Why this and not a normal inventory

An inventory of items is the obvious answer and it is the wrong one here.
Nothing in this game is an object; the whole fiction is that knowledge is the
material. There are already two things a player accumulates:

| | what it is |
|---|---|
| **Words** | concepts you can read. Comprehension as inventory. Exists today. |
| **Memory** | what you did at a place, stored **on the place**. Does not exist. |

Memory earns its place because it does three jobs at once that are currently
done by nothing:

1. **Revisiting means something.** Today a place you have stood in is identical
   to one you have not. With memory, the graph is the log of your run.
2. **It gives prestige something to inherit that is not a multiplier.**
3. **It makes the central theme literal.** See below.

## The mechanic: trust it, or walk it again

`VISION.md` states the prestige rule: *"What carries into the next run is not
the real data. It's what your machines generated: unverified, and it rots
faster. Each generation starts richer and more wrong."*

Node memory is that sentence made personal and checkable. Each generation you
begin holding memories of places you have been. They let you move without
re-deriving anything — and some of them are wrong.

So every remembered node is a decision:

- **Trust the memory.** Free. Instant. Possibly false.
- **Walk it again.** Costs what a first visit costs. True.

That is **speed versus truth**, the game's stated core tension, finally
expressed in the story layer instead of only in the machine layer. It is the
same choice the player makes about their Extractors, made about their own past.

## Shape

Per node, not per run:

```
memory[nodeId] = {
  gen:    number     // the generation that wrote it
  took:   number     // node id of the exit chosen there
  bound:  boolean    // whether the label was readable when written
}
```

Absent key = never been there. That keeps the common case free.

## How it drifts

Drift is applied **on prestige**, once, to the inherited set — never during a
run, because `VISION.md` is explicit that nothing rots while the player is
away or watching.

Two corruptions, both of which a player can eventually detect:

- **`took` moves to a sibling.** The memory says you went one way; you went
  another. Detectable by walking it again.
- **`bound` flips to false.** You remembered being here but not what it was
  called. The memory renders in the graph's language even though you have the
  word now.

Corruption probability rises with generation, matching the fidelity curve the
economy already uses. Generation 1 memories are true by construction — the
first run must be trustworthy or the mechanic never teaches itself.

## What this does NOT do

- **It never blocks.** A false memory costs a wasted step, never a softlock.
  `check-story.mjs`'s no-dead-end invariant is unaffected: memory changes what
  you believe about an exit, never whether the exit exists.
- **It is not a score.** Nothing counts memories on screen. Per the owner's
  2026-07-27 call, the interface shows no numbers until their words are read.
- **It does not resurrect the old `⟨owner⟩` prose slots.** A memory renders as
  the choice it records, in whatever language the player can read it in.

## Open, and deliberately not decided here

- Whether a **corrected** memory (walked again after being wrong) is immune to
  further drift, or merely reset. The first is kinder; the second is truer to
  the model-collapse result and probably better.
- Whether the player can **discard** a memory they distrust. Cheap to add,
  and it would make paranoia playable — but it is a mechanic to add after
  watching someone play with the drift, not before.
