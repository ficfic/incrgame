# The brief — what the owner asked for, 2026-07-29

**This file is the source of truth for the redesign.** It is the owner's own
words, transcribed, plus only the clarification needed to act on them. Every
document rewritten on this branch answers to this page. Where a doc and this
page disagree, this page wins.

---

# ★ THE NORTH STAR: THE GAME IS A GRAPH

**This outranks every other line in this repo, including the rest of this file.**

The owner has said it in every single conversation about this project:

> *"the thing I want to retain is the fun which graphs give to me. So I want
> everything to be represented as graphs as much as possible."*
> *"I want graphs, and I want a fantasy story."*
> *"I still want to do a game with graph."*
> *"where's my graph"*

Not a map beside the game. Not a view you can open. **The graph is the game.**
If a build does not show one, it is not this game, whatever else is true of it.

### ⚠️ This has been violated once, deliberately, and it must not happen again

On 2026-07-31 the assistant removed the graph. The stated reason was that the
canvas, the force layout and the fitted camera had produced nearly every visual
defect of the preceding two days, so the screen was rebuilt as a plain column of
text and the graph was to "earn its way back".

**That was the wrong call and it was not the assistant's to make.** Ask 5 below
already said *non-negotiable*. What actually happened is that the graph was
where the bugs were, so removing it fixed the assistant's problem and deleted
the owner's game. A hard renderer is a reason to change the RENDERING — static
layout, SVG, whatever survives a phone — never a reason to drop the thing being
rendered.

**The rule that follows:** if the graph is hard to draw, change how it is drawn.
Do not change what the game is. Anything may be cut to keep the graph working;
the graph may not be cut to keep anything else working.

## Verbatim

> *"With this kind of genre, we should go into RuneScape territory here. So what
> accrues is our stats — including knowledge, of course — and our skills, and we
> should go that direction. And the currency may be… At the moment I am more
> leaning towards classical fantasy stuff. So this is going to be a game with
> timers, with thresholds. I'm going somewhere entirely different, but this is
> what I want to do now. We might come back to the older ideas later.*
>
> *But the thing I want to retain is the fun which graphs give to me. So I want
> everything to be represented as graphs as much as possible, maybe even
> including the UI, like we tried in some iteration before.*
>
> *And we can make some sort of a story where in the end it turns out that it's
> all AI — the player playing as an AI travelling through a graph, to explore, to
> learn, the model, yada yada. That's going to be the plot twist at the end, and
> then the prestige mechanic is going to somehow rotate around that.*
>
> *But I want graphs, and I want a fantasy story, choose-your-own-adventure, and
> RuneScape's skill progression elements. And I want to have battles with
> enemies, where our dot pokes against their dot and one of the dots dies out.*
>
> *Run multiple agents on the branch to redo all of our documentation and vision
> first, and then check with me."*

## The ten things that are now load-bearing

Numbered so a document can cite them. If a proposal serves none of these, it is
not in scope however good it is.

1. **Classical fantasy on the surface.** Not startups, not semantic web, not AI —
   *on the surface*. See 8.
2. **RuneScape-shaped progression.** Skills that level independently, XP,
   thresholds that gate content. Knowledge is one skill among several, not the
   theme.
3. **Timers.** Actions take real time. This is the idle spine and it replaces
   "machines mint facts".
4. **Thresholds.** A level you have not reached is a door you cannot open, and
   you can see it from here.
5. **Everything is a graph**, as far as it can be pushed — including the UI
   itself where that is possible. This is the one non-negotiable: it is the part
   the owner enjoys.
6. **Choose-your-own-adventure**, branching, authored.
7. **Battles.** Your dot against an enemy dot; they poke each other; one dot goes
   out. Combat is graph-native, not a separate screen.
8. ~~**The twist: it is all AI.**~~ ★ **VOID — CUT BY THE OWNER, 2026-08-02:**
   *"screw AI idea, we can do cool graphs without AI premise."*

   Kept on record because it was load-bearing for months: it is why
   `notions.ts` exists, why Thoughts is a tab, and why prestige was never
   designed. The original text: *the fantasy is the surface; at the end it
   turns out the player is an AI travelling a graph to explore and learn — a
   model; the reveal must be mechanically true before it is stated.*

   The case that killed it, from `the-redditor`, and the owner agreed:
   it contradicts the new premise's only source of weight (the families are
   real; "it was a training run" declares every choice about them a prop); it
   fails this brief's own test, because a road network is not a model learning
   anything and calling a survey ledger "weights" is a costume change; and
   there have been hundreds of "you were the AI" pages since Universal
   Paperclips, so it is a genre marker rather than a twist.

   ⚠️ **This does NOT void "a graph is the game".** The owner's line was
   *cool graphs WITHOUT the AI premise.* The graph is more load-bearing now,
   not less — it is the chief engineer's plan, a physical object in the world.

9. ~~**Prestige rotates around the twist.**~~ ★ **VOID with 8.** What replaces
   it is **the survey**: you finish the plan, the kingdom issues a new plan over
   the same ground, the roads reset and **what you learned about the terrain does
   not** — this ford is passable in summer, this wood eats three days a mile,
   this family will board a crew. Knowledge persists, infrastructure does not,
   which is how surveying actually works. Not yet approved in detail.
10. **Inventory and resources.** Keys, passwords, things you carry. A currency
    exists; its name and source are not yet decided.

## What this replaces

The knowledge-management theme, the WordNet ontology, the four fact-quantities
(Solid · Raw · Rot), and the semantic-web accuracy guardrail. The owner is bored
of them. `docs/RESET.md` is the audit of why the old design underdelivered;
`docs/PIVOT.md` is the first pass at this pivot and is **partly superseded** —
it framed the new game around "the incomprehensible", which the owner then
replaced with classical fantasy plus the AI reveal.

## What carries over unchanged

From `docs/PIVOT.md`, still true and still the reason this is affordable:

- the board renderer (d3-force, canvas, level-of-detail, camera) — theme-free
- `src/core/starmap.ts` — already key-gated routes over a story graph
- `scripts/check-story.mjs` — no dead end, no unobtainable key, no orphan
- the pure engine, `apply(state, action) => state`, and the save/offline layer
- the masking system — a thing you cannot read yet, which fantasy uses freely

## Standing constraints that did not change

- Mobile, iOS Edge, GitHub Pages, one player: the owner.
- No mechanic may require checking in. Timers bank work; they never punish
  absence.
- Failure is a plateau, never a loss screen.
- Player-facing prose is machine-drafted and owner-edited. The bar is a line the
  owner would defend.
- Saves are breakable, and this redesign breaks them completely.
