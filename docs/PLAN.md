# The plan — the whole game, end to end

> *"i think we need to plan the next steps and high level game end to end better
> since we're finally having something which might work out"* — the owner,
> 2026-08-01, after two play-tests.

**This is a proposal, not a spec.** It answers `docs/BRIEF.md`'s ten asks with
the pieces that already exist, and it names the three things only the owner can
decide. Where it disagrees with `docs/BRIEF.md`, the brief wins.

---

## ★ The headline: most of this game is already written and switched off

Measured against `src/slice/regions/*.ts`, 2026-08-01:

| on disk | count | used today |
|---|---|---|
| places, hand-written prose | 37 | ✅ yes |
| routes between them | 43 | ✅ yes |
| **timed work blocks** (`label`, `secs`, `xp`, a skill) | **12** | 🟡 the 3 wayfaring ones are live |
| **skills they pay into** | **5** — wayfaring, lore, craft, guile, attunement | 🟡 wayfaring exists |
| **skill checks on a route**, each with a win and a lose line | **15** | ❌ ignored |
| **items they drop** | **9**, each naming a door it opens | ❌ never minted |
| **doors that demand a level or an item** | **13** | ❌ ignored |

⚠️ **The work-block count in the first draft of this page said 34 and was
wrong.** It counted every `skill:` in the region files, and 22 of those are
skill CHECKS on a choice, not jobs. There are 12 jobs: 4 craft, 3 lore, 3
wayfaring, 2 attunement. Corrected 2026-08-01 by reading them out of
`content.ts` rather than grepping. The 15/9/13 counts below were re-verified and
are right.

**This matters for step 3.** Twelve jobs across five skills cannot support "one
skill trained all over the map" — so the second verb is thinner than this page
first claimed, and its scarcity has to be a design choice rather than an
accident. See `docs/NEXT.md` item 0.

The rest is still mostly **wiring**, not invention.

---

## The spine

One resource. Two sinks. One competition for your time. Everything else hangs
off that.

| stage | what you are doing | what it adds | asks |
|---|---|---|---|
| **0–5 min** | stand, forge an edge, walk it | *shipped* | 5 |
| **5–30 min** | **settle** a place — it starts producing. **You may only forge from a settled place.** | income is an investment; "where you park" becomes true | 3 |
| **30 min – 2 h** | **work** at a place: the 12 authored blocks. Work pays XP, not paces. | the second verb — the first real choice | 2, 3 |
| **1–5 h** | **thresholds**: the authored doors open on a level you can see from here — ✅ the 4 wayfaring ones | doors you can see and cannot open | 4 |
| **anywhere** | **encounters** on Here: a dot contests the place; you poke; one goes out | combat, graph-native | 7 |
| **anywhere** | **drops**: the 15 checks mint the 9 items; an item opens its named door | inventory, keys | 10 |
| **the end** | the map closes → **the reveal**, then prestige | the twist | 8, 9 |

### The economy, as it actually shipped

⚠️ **This block used to hold the PROPOSAL and was wrong in its first line.** It
said `rate = 0.333 + 0.10 × settled.length`, which is the count model
`docs/DIRECTIONS.md` exists to reject. Replaced with what the code does.

```
rate(g)       = 1/3 + maxflow(settled → where you stand) / 1000   src/game/flow.ts
YIELD         = 0.100 per settled place        a source
EDGE_CAP      = 0.250 per made route           a pipe, and the whole point
settleCost(m) = round(30 × 1.22 ^ m)
costOf(e)     = round(6 × 1.2 ^ routes made)   ⚠️ still a global count — open
forgeSecs(n)  = max(4, round(12 × 1.12 ^ routes made × 0.92 ^ (wayfaring − 1)))
levelOf(xp)   = 1 + floor(√(xp / 12)), capped at 25
```

**A road fills up.** Three settled places behind one route already exceed what it
can carry, so a second road round the bottleneck is worth more than a fourth
settlement — which is what turns the seven loop-closers (72% of the valley's
price for 16% of its edges) from dead weight into the best purchase in the game.

**Still open, and it is the same defect one level down:** `costOf` keys off a
GLOBAL count of routes made, so every frontier still costs the same and which one
you open has no *price* content. Income now reads the graph; price does not. The
per-region tiers proposed by `chad-liquidity` are the queued answer.

### The choice, stated plainly

At any moment you are either **resting** (paces accrue) or **working** (XP
accrues). One clock, two things it can pay into. That is the whole opportunity
cost, and it is the reason skills can exist at all — `docs/TABS.md` is right that
five skills over one activity is five names for the same number.

### The five skills, and what each one actually does

Named by the content already, not invented here. Each must change a number, or
it is a badge:

| skill | trained by | what it does |
|---|---|---|
| **wayfaring** | 3 blocks | forging is faster — ✅ shipped |
| **craft** | 4 blocks | settling is cheaper |
| **lore** | 3 blocks | **you learn a place's name before you reach it** |
| **attunement** | 2 blocks | the offline bank holds more |
| **guile** | 0 blocks | the loot roll goes your way more often — *needs jobs written* |

★ **Lore resolves item 13 rather than papering over it.** Today the panel
withholds a place's name and the button underneath states it. Make the name a
thing lore *buys*, and "somewhere you have not been" becomes true, earned, and
worth something.

### Combat, minimally

`docs/COMBAT.md`, on **Here**, where the owner put it. An enemy dot beside
yours; radius is health; they poke on a timer; one goes out. **A lost fight
relights you one node back and keeps everything earned** — that is the whole of
"failure is a plateau, never a loss screen", and it is the constraint most
likely to get quietly fudged. What an encounter *is* mechanically is open —
see below.

### The reveal, and what prestige does

You spend the game completing a graph. When it closes, the thing you completed
turns out to be the point: **you are a model, and mapping the valley was the
training run.** Ask 8 wants this mechanically true *before* it is stated, and
`Thoughts` already is — it is knowledge as a graph, filling in as you traverse
one, and nothing on that tab says so.

**So prestige carries `Thoughts` and nothing else.** The map resets; what you
understood does not. Each notion you kept is a permanent rule change that
*states the rule it changes* — because a notion in this game is already defined
as naming something the engine really enforces (`src/game/notions.ts`). A run is
a training run; what survives it is what was learned. That is the twist paying
rent instead of being announced.

---

## ★ The three decisions that are the owner's, not mine

1. **What an encounter is.** Random on arrival, or authored per place? Does it
   block the place until won? `docs/TABS.md` says do not invent this.
2. **What the long tail is.** More regions (content volume) or repeatable runs
   (prestige depth)? Seven of the 43 edges are loop-closers costing 72% of the
   current total — the map is an evening's reading either way, so this decides
   whether the answer is more writing or more replay.
3. **What the resource is called.** *"Why am I accumulating steps?"* — paces is
   wrong for a thing you bank, and the game never says why standing still pays.

---

## Build order

Each one ships playable and screenshotted. Nothing starts until the one before
is on the phone.

1. ~~**Settle + work + one skill.**~~ ✅ 2026-08-01. Income is max-flow, not a
   count — see `docs/DIRECTIONS.md` for why that was not optional.
2. ~~**Thresholds.**~~ ✅ 2026-08-01, for the **4 of 13** doors that demand
   wayfaring. The other 9 want craft, lore, attunement or one of the nine items,
   and a door with no key anywhere in the game is worse than no door — so they
   are off rather than shut. **The authored demands set the level curve**, not
   the other way round: they run to 24, so the cap does too.
3. **Drops and keys.** Turn on the 15 checks and the 9 items.
4. **Encounters.** Starts with decision 1, not with code.
5. **The reveal and prestige.** Last, and only once 1–4 are fun.

The queue in `docs/NEXT.md` still holds the small stuff — vocabulary, the sticky
header, export/import, the two weird labels. None of it blocks any of the above.
