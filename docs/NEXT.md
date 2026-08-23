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

1. **Play it yourself, past floor 4.** A bot clears four floors with money in
   the bank; nobody has *felt* whether floors 3–6 are fun, or whether the 1.75
   price curve outruns what a floor pays.
2. **87% of `src/` is not reachable from the entry point.** `npm run live`
   prints it: 13 files and 3,556 lines are the game; 67 files and 23,262 lines
   are three deleted ones — the ontology game, the valley, the town. Every
   search crosses them, every review agent reads them, and several of their
   comments cite scripts that no longer exist either. Decide: delete, or one
   RETIRED banner per directory. This is the biggest single thing left.
3. **The numbers are still small.** `break_eternity` is in the stack, unused.
   The biggest number in the game is a few thousand.
4. **One save-race guard is reasoned, not proven** — the `ready` flag that
   stops the first write landing before the load answers.
5. **`src/delve/words.ts` covers ten quantities.** Room, monster and relic
   names are not in it — a second "Drowned Well" was caught by a browser probe
   rather than by the vocabulary check. And the check cannot see WHICH element
   renders a word, so a header saying "rounds" beside a panel saying "turn"
   still passes; that case is read by eye.

## What is deliberately NOT on the queue

- **Beating the Hoard.** It is 48 hit points dealing ~4.5 a turn and it is
  meant to be unwinnable. The ending routes around it on purpose.
- **Migrations.** The owner: *"i'm completely ok with breaking saves at any
  time."* `version` stays so a reset is never silent.
