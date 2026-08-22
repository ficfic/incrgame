# NEXT — the queue

**This file decides what the next session works on. Nothing else does.**

---

## THE GAME IS FINISHABLE. 2026-08-19.

The owner: *"finish the game now please"*. It is finished in the sense that
matters — it can be started, played, saved, and **completed**, on a phone,
without a tester's help. What is below is the honest state, not a boast.

### What the game is

A turn-based dungeon crawler on a graph, with incremental elements.

Rooms are nodes, doors are edges, and **the monsters path along the same edges
you walk**, so you can count the doors between you and the thing coming. One
action is one turn; nothing happens on a clock. What every exchange costs is
on screen before you pay it.

**Two graphs.** You can send a CRAWLER down. It walks on its own, files a map,
and is confidently wrong by rule and never by dice: it reports rooms it never
entered as empty and safe, and it invents doors between rooms that are merely
near each other. Verifying its map is the game.

**The hoard buys graph verbs.** Wedges cut an edge for four turns; a wider lamp
changes the fog; bracing extends the crawler's reach. Two honest +1s (a keen
edge, boiled leather) are there because the arithmetic needed them.

**The ending is that the map becomes true** — every room stood in, by you, and
survived. Not cleared: the Hoard cannot be beaten and does not have to be.

### The state, measured not asserted

| | |
|---|---|
| tests | 1044, `npm test` |
| browser | `npm run delve` — drives a thumb through the whole loop |
| types | `tsc` and `svelte-check` clean |
| pacing | ~10 delves of ~20 taps to be dash-ready, then the ending |
| saves | IndexedDB, versioned, with export/import |

---

## THE QUEUE

Ranked. Take the top one.

1. **The dungeon is ten hand-drawn rooms and always the same ten.** This is
   the biggest thing left. Once the map is true there is nothing to make
   untrue again. A second, deeper dungeon — or a generated one — is what turns
   an ending into a reason to go again. *(Generated was deliberately deferred
   at the pivot: you cannot tell whether a layout is fun while the layout keeps
   changing. That reason has now expired — the layout has been judged.)*
2. **A run is very samey.** The pacing sim walks the same route ten times and
   never dies. Something has to vary run to run.
3. **`prof-veritas` and the ontology CI gates still police a deleted game.**
   `check-story.mjs` reports beats and concepts from the pre-pivot ontology;
   `check-vocabulary.mjs` exits 1 by design and says why. Repoint or delete.
4. **The town is still on disk and unreachable** — `Camp.svelte`,
   `play-camp.mjs`, `src/camp/`, `src/game/`. It is dead weight in every
   search and every review. Decide: delete, or mark RETIRED in one banner.
5. **One save-race guard is reasoned, not proven.** The `ready` flag stops the
   first write landing before the load answers. Removing it does not turn the
   probe red, because IndexedDB always wins that race on a fast machine.
6. **`docs/` is ~50,000 words against ~5,000 lines of code**, and most of it
   describes games that no longer exist. `NEXT-pre-pivot-town.md` is the queue
   this file replaced; keep it only if somebody will read it.

## What is deliberately NOT on the queue

- **Beating the Hoard.** It is 48 hit points dealing ~4.5 a turn and it is
  meant to be unwinnable. The ending routes around it on purpose.
- **Migrations.** The owner: *"i'm completely ok with breaking saves at any
  time."* `version` stays so a reset is never silent.
