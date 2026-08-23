# NEXT — the queue

**This file decides what the next session works on. Nothing else does.**

---

## THE GENRE PASS, 2026-08-20

The owner: *"go analyze what other games in the genre have and go implement all
of that"*. This game sits in two genres. What each one has, and what this had:

| Incremental canon | before | now |
|---|---|---|
| a resource that grows | ✅ | ✅ |
| upgrades that change play | ✅ | ✅ |
| **content tiers** | ❌ one level | floors, generated, endless |
| **a compounding multiplier** | ❌ everything additive | milestones, ×1.15 each |
| **a statistics screen** | ❌ | delves, falls, kills, deepest, banked |
| **achievements** | ❌ | 10, and each one pays |
| **offline progress** | ❌ frozen on blur | the crawler walks while you are gone |
| automation | the crawler | the crawler, now idle too |

| Crawler canon | before | now |
|---|---|---|
| turn-based, fog, runs | ✅ | ✅ |
| **procedural generation** | ❌ ten hand-drawn rooms | every floor past the first |
| **a bestiary** | ❌ two stat-blocks | 6 breeds, traits on the GRAPH |
| **loot** | ❌ everything bought | 4 relics, in the wells |
| **depth** | ❌ | a stair in the Hoard |
| status effects | ❌ | reeling, from a shove |

★ AND THE RULE THE WHOLE PASS WAS BUILT ON: a genre feature is only worth
having if it lands on THIS game's subject. So the loot changes rules rather
than numbers, the monster traits are all facts about the graph, the content
tier is new ground to MAP, and the idle mechanic is the thing the game was
already about — an autonomous crawler walking a graph and lying about it.

### The state, measured not asserted

| | |
|---|---|
| tests | 1107, `npm test` |
| browser | `npm run delve` — one thumb, the whole loop, 14 sections |
| types | `tsc` and `svelte-check` clean |
| saves | IndexedDB, versioned, stamped, export/import |

---

## THE QUEUE

Ranked. Take the top one.

1. **The vocabulary rule has no check.** One word, one quantity — enforced by
   hand since the pivot, and its old script was deleted rather than repointed
   because it read the pre-pivot game. Write a real one against `src/delve` +
   `src/ui/Delve.svelte`, and sabotage it before trusting it.
2. **Play it yourself, past floor 4.** A bot clears four floors with money in
   the bank; nobody has felt whether floors 3–6 are *fun*, or whether the
   1.75 price curve outruns what a floor pays.
3. **The town is still on disk and unreachable** — `Camp.svelte`, `src/camp/`,
   `src/game/`, `src/core/`, `src/slice/`, `src/shell/ticker.ts`, and ~40k
   words of docs describing games that no longer exist. Every search crosses
   it; several of its comments cite scripts that were just deleted. Decide:
   delete, or one RETIRED banner per directory.
4. **The numbers are still small.** `break_eternity` is in the stack, unused.
5. **One save-race guard is reasoned, not proven** — the `ready` flag.

## What is deliberately NOT on the queue

- **Beating the Hoard.** It is 48 hit points dealing ~4.5 a turn and it is
  meant to be unwinnable. The ending routes around it on purpose.
- **Migrations.** The owner: *"i'm completely ok with breaking saves at any
  time."* `version` stays so a reset is never silent.
