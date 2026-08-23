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

1. **Nobody has played past floor 2.** Every floor from 3 down is generated,
   scaled and untested by a human. The pacing sim and the fight ladder are both
   pinned to floor 1. Play down and find where it stops being fun.
2. **The numbers are still small.** There is a multiplier now, but the biggest
   number in the game is a few hundred. `break_eternity` is in the stack and
   still unused; either the curve gets steep enough to need it or it should go.
3. **The panel is getting long.** A fight can now show Swing, two Shoves,
   Brace, Hold, two Wedges, a Ring and a stair. That is a scroll, on a phone,
   during a fight.
4. **`prof-veritas` and the ontology CI gates still police a deleted game.**
5. **The town is still on disk and unreachable** — `Camp.svelte`,
   `play-camp.mjs`, `src/camp/`, `src/game/`. Delete, or banner it RETIRED.
6. **One save-race guard is reasoned, not proven** — the `ready` flag.

## What is deliberately NOT on the queue

- **Beating the Hoard.** It is 48 hit points dealing ~4.5 a turn and it is
  meant to be unwinnable. The ending routes around it on purpose.
- **Migrations.** The owner: *"i'm completely ok with breaking saves at any
  time."* `version` stays so a reset is never silent.
