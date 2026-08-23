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

1. **Play it and feel the lamp AND the new economy.** 26 turns, a flask at 4,
   `vim` at 34, a toll of a third on a re-clear, 4 a room for new ground — all
   of it tuned by a bot in `test/broke.test.ts`, none of it by a thumb. Is
   running out frightening or annoying? Does grinding an emptied floor feel
   like a lifeline or like the game's actual content?
2. **87% of `src/` is not reachable from the entry point.** `npm run live`:
   13 files are the game, 67 are three deleted ones. Delete, or banner.
3. **The relics and the crawler predate the lamp.** Both were built when turns
   were free. A relic that gave LIGHT, or a crawler that reported where the
   spoil is rather than only the shape, would now be worth much more than the
   chalk. Re-read them against the new pressure.
4. **The numbers are still small.** `break_eternity` is in the stack, unused.
5. **One save-race guard is reasoned, not proven** — the `ready` flag.
6. **The animation loop never stops.** `npm run play` has reported "12 frames
   while idle" for at least two commits. A turn-based game repainting forever
   is a battery bug on the only device this is played on.
7. **Rooms have room.** `w`/`h` are drawn and nothing in the rules reads them.
   The owner: let a narrow room admit one foe at a time, so where you fight is
   a choice.
8. **Oil spends on the graph.** Leave a lantern in a room to keep it lit —
   light competing with light.
9. **Cut the record to one line**, cut `.wire` and the dead `WALK_SECS`, and
   move the save box out from under the shop.

## What is deliberately NOT on the queue

- **Beating the Hoard.** It is 48 hit points dealing ~4.5 a turn and it is
  meant to be unwinnable. The ending routes around it on purpose.
- **Migrations.** The owner: *"i'm completely ok with breaking saves at any
  time."* `version` stays so a reset is never silent.
