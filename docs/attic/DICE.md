# Dice, checks and loot — 2d10

> *"My wife enjoys in games the most, loot and dice throws. So can we please
> introduce a 2d10 system for dice and likelihood and loot?"* — the whole spec.
> `BRIEF.md` asks **4, 5, 7, 10**. **All of it is a proposal**, aimed at making
> rolls and drops *feel* good. "2d10" can also mean percentile d100 — I read it as
> **two d10 summed, 2–20**; correct me and only §3–§5 change.

## 1 · The purity conflict, resolved

"No RNG" protects **determinism**, not randomness. A seeded generator in the
save keeps `apply(state, action) => state` exactly: its state goes in, and out.

| | |
|---|---|
| **Algorithm** | **mulberry32** — five lines, one `uint32` |
| Why | integer-only (`Math.imul`, `>>>`, `^`): **bit-identical** phone to desktop, no float drift. PCG needs 64-bit multiply; xorshift32's low bits are weak |
| Period | 2³² = 4.29 × 10⁹ draws ≈ 8,000 years at a roll a minute |
| Save | `rng: number`, `lastRoll: [a, b]` — JSON ints; export unchanged, next roll identical on both devices |
| Seed | fresh save only, from `action.now`, the impurity `tick` already accepts |
| Shell | never generates; animates `lastRoll`, so reload mid-roll is safe |

**One advance per roll**, both dice from one word: `a = w % 10 + 1`,
`b = (w / 10 | 0) % 10 + 1`, so **rolls consumed = rolls resolved**. Modulo bias
is 96 in 4.29 × 10⁹ ≈ **2 × 10⁻⁸**, taken deliberately: rejection sampling draws a
*variable* number of times, destroying that accounting.

**Costs.** `(seed₀, action log)` replays exactly. **An offline catch-up consumes
zero rolls** — `applyOfflineProgress` never touches `rng`, because banked repeats
bank *unopened satchels* (§6), rolled when tapped, in tap order.

## 2 · What `COMBAT.md` must change (I am not editing it)

| Line there | Becomes |
|---|---|
| §2 "the engine has no RNG" | seeded PRNG in state; still pure |
| §2 "computable the moment you engage" | the **distribution** is; the outcome is rolled |
| §2 "the result is shown before you commit" | **odds, not outcomes** — "win 78%", drawn as §7's band and notch |
| §2 "a check, not a gamble" | both now: the level picks the band, the roll picks inside it |
| §5 "encounters need RNG we lack" | still rejected, for **one** reason (absence), not two |
| §3 `enemy = { tests, rating, bite }` | `+ loot?: LootTableId`, answering its own §7 |
| §4 no-loss-screen | **unchanged, now load-bearing** — a fight you expected to win can be lost, so "keep the XP, lose nothing else" is the safety net. The scarred edge shows the roll you needed |

## 3 · The curve, over a flat d20

`P(2d10 ≥ N)`. Mean 11, mode 11 at 10%, each extreme 1%.

| Need | 5 | 8 | **11** | 14 | 17 | 20 |
|---|---|---|---|---|---|---|
| 2d10 | 94% | 79% | **55%** | 28% | 10% | 1% |
| d20 | 80% | 65% | 50% | 35% | 20% | 5% |

A point is worth 9 mid-curve (55→64) and 3 at the edge (3→6), against a flat 5
everywhere on d20: an upgrade feels big where you stand, buys nothing against the
impossible, and 1% extremes get remembered.

## 4 · Skill checks — 0–30 against 2–20

`roll + level` makes dice decorative by level 12. **So the level never touches the
roll.** A check declares a `demand` on the skill's own 0–30 scale (`SKILLS.md`
§1); only the gap is spent.

    margin = level − demand
    m      = clamp( idiv3(margin), −6, +6 )    // idiv3(x) = (x + sign x) / 3 | 0
    pass  ⟺ 2d10 + m ≥ 11

Integer-only, exact in doubles. `m` spans ±6, so 30 levels are worth 10% → 94%:
**84 points, never 0, never 100**, where a d20 at +30 saturates. Three levels buy
~9 points; past ±18 demand they buy nothing.

| Demand | 3 Trivial | 14 Even | 20 Hard | 26 Severe | 30 Legend |
|---|---|---|---|---|---|
| **Level 5** | 64% | 28% | 15% | 10% | 10% |
| **Level 15** | 85% | 55% | 36% | 21% | 15% |
| **Level 30** | 94% | 90% | 79% | 64% | **55%** |

Level 30 against Legend is a coin flip; level 5 is never shut out. Both are the
point.

## 5 · Crits

The face crits *are* the sum extremes: 20 ⟺ (10,10), 2 ⟺ (1,1). 1% each, so at a
roll a minute, about one crit an hour.

- **Boon (10,10)** passes **regardless of `m`**, overriding the clamp — the 1% is
  the only thing a level can neither buy nor forbid. Loot rolls one table up. In a
  fight, one doubled poke, **not** an auto-win.
- **Fumble (1,1)**: a 2 fails every demand ≥ 3 anyway, so it **cannot turn a pass
  into a fail**, and it adds no penalty (failure is a plateau). It **opens an
  authored fumble branch**: a botch is a door, not a fine.

## 6 · Loot

**Level picks the table, dice pick the row.** The loot roll takes no modifier;
pure luck is the fun.

| 2d10 | % | Row |
|---|---|---|
| 2 | 1 | **Reliquary** — named, authored, unique |
| 3–4 | 5 | a **key** to a door you have not found |
| 5–7 | 15 | **material** (Craft input) |
| 8–14 | **58** | **Obols**, one purse |
| 15–17 | 15 | a **charm**: +1 `m`, or a reroll, once |
| 18–19 | 5 | a **password**: one word, unmasked |
| 20 | 1 | **Boon** — one of three dots drawn for you |

1+5+15+58+15+5+1 = 100. **42% of drops are not currency**; a named item every
~100 wins.

**Why a key thrills.** Pack items edge to the doors they open (`GAME_DESIGN.md`
§4), so **a drop is measured in edges, not stats**: a key lighting three doors is
visibly great, a key with none is a lock you have not found. A password is the
*wide* drop, unmasking one word everywhere (`masking.ts`). The charm feels best —
agency over a bad roll without deleting the dice, never required.

**Sources.** A won fight rolls **once**, on the enemy's table. Banked repeats roll
**zero** times, leaving a satchel each. **Story rewards are authored, never
rolled**, or 40–80 written nodes become a farm.

## 7 · Drawing a roll and a drop (ask 5)

No dice tray, no modal, no figure on the canvas.

- **The roll runs the edge.** Two dots travel the contested edge — they *are* the
  dice — and merge into a marker. The edge carries a **notch** at the demand and a
  **band** over 6–16, where 80% of rolls land: odds are band against notch, the
  figure in the inspector. `paint.ts`'s `flash` dashes draw it today.
- **Pass or fail is a position on a line**, past the notch or short of it.
- **A crit adds a node**: Boon draws three dots, Fumble its branch. A reward that
  grows the graph is the most graph-native reward there is.
- **A drop is born as a node**, tethering into Pack (d3-force reheat is free), and
  every door it opens pulses once.
- **Satchels** cluster on your dot, capped at **12** actionable (the ~14
  tap-target ceiling), the rest rolled into one cache opened in sequence.

## 8 · What must not break

- **Nothing requires checking in**: a roll happens only on a tap.
- **Away never punishes**: `rng` untouched offline, satchels wait.
- **Failure is a plateau**: 10% floor, 94% ceiling, fumble adds a branch, and
  `COMBAT.md` §4 is intact.
- **One word, one quantity**: three new `readouts.ts` nouns — **satchel**,
  **charm**, **demand**.

**Open:** summed 2d10 or percentile d100 (owner's call); is 1-in-17 failure at
level 30 satisfying or annoying (only play answers); one roll per fight, or one
per poke?
