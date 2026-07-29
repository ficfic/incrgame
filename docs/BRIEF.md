# The brief — what the owner asked for, 2026-07-29

**This file is the source of truth for the redesign.** It is the owner's own
words, transcribed, plus only the clarification needed to act on them. Every
document rewritten on this branch answers to this page. Where a doc and this
page disagree, this page wins.

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
8. **The twist: it is all AI.** The fantasy is the surface. At the end it turns
   out the player is an AI travelling a graph to explore and learn — a model.
   This is the reveal, and it must be **mechanically true before it is stated**,
   which is the one lesson `VISION.md` got right and the build never delivered.
9. **Prestige rotates around the twist.** Whatever carries across a reset is the
   thing that makes the reveal land.
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
