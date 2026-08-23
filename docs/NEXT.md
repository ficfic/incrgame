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

1. **Play it and feel the lamp.** 26 turns is tuned against floor one by a
   test, not by a thumb. Is running out frightening or annoying? Is a flask at
   10 the right price? Nobody has felt it.
2. **87% of `src/` is not reachable from the entry point.** `npm run live`:
   13 files are the game, 67 are three deleted ones. Delete, or banner.
3. **The relics and the crawler predate the lamp.** Both were built when turns
   were free. A relic that gave LIGHT, or a crawler that reported where the
   spoil is rather than only the shape, would now be worth much more than the
   chalk. Re-read them against the new pressure.
4. **The numbers are still small.** `break_eternity` is in the stack, unused.
5. **One save-race guard is reasoned, not proven** — the `ready` flag.

## What is deliberately NOT on the queue

- **Beating the Hoard.** It is 48 hit points dealing ~4.5 a turn and it is
  meant to be unwinnable. The ending routes around it on purpose.
- **Migrations.** The owner: *"i'm completely ok with breaking saves at any
  time."* `version` stays so a reset is never silent.
