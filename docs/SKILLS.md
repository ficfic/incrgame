# Skills — the progression

Answers `docs/BRIEF.md` asks **2** (RuneScape-shaped progression), **3**
(timers), **4** (thresholds) and **10** (currency). Combat is `docs/COMBAT.md`;
screens are `docs/GAME_DESIGN.md`. Everything here marked **proposal** is mine,
not the owner's.

---

## 1 · The skills — six (**proposal**)

Each earns its place by what it *unlocks* in a graph-and-CYOA game. One noun
each, because a skill name is a HUD label and `src/core/readouts.ts` needs
unique nouns.

| Skill | Unlocks | Why it exists |
|---|---|---|
| **Wayfaring** | long edges, faster travel timers | movement is the verb; the graph is a map |
| **Lore** | reading masked words, word-gated routes | the existing `masking.ts`/`literacy.ts` machine, renamed. Knowledge is **one skill**, per ask 2 |
| **Craft** | makes keys, tools, gear from carried materials | turns inventory (ask 10) into a lever instead of a list |
| **Guile** | bypasses a gate without its key — an alternate branch | gives CYOA a second solution, so a wall is a choice |
| **Might** | the dot-vs-dot fight (spec: `COMBAT.md`) | ask 7 needs a number that grows |
| **Attunement** | reveals unexplored nodes/edges one hop further out | sight over the graph — and the twist skill (ask 8): a model widening what it can see |

**Considered and cut.** Gathering trees (Mining/Fishing/Woodcutting): they feed
an economy this game does not have — one player, no market. Melee/Ranged/Magic
split: three skills for one poke, and `COMBAT.md` owns that call. Prayer,
Herblore, Agility, Cooking: RuneScape *texture*, not unlocks. Speech separate
from Guile: same door, two names. Trading: no NPCs to trade with yet.

---

## 2 · XP and levels

**Cap: 30.** (**proposal**.) RuneScape's 99 is paid for by an economy and
thousands of hours. At 30, every level is 3–17% of its skill's total, five
six-level tiers fit exactly, and six skills give 180 discrete level-ups.

**One curve.** XP to cross level *L* → *L+1*:

    step(L) = 40 × 1.2^(L−1)
    total(L) = 200 × (1.2^(L−1) − 1)      // XP to reach level L

**One rate.** An action takes **60 s** and grants **10 × 1.9^(tier−1)** XP.
`tier = 1 + floor(level / 6)`, so XP/hour = `600 × 1.9^(tier−1)`: 600, 1140,
2166, 4115, 7819.

| Level | XP for that level | Cumulative XP | Action-hours to here |
|---|---|---|---|
| 5 | 69 | 215 | 0.4 |
| 10 | 172 | 832 | 1.0 |
| 15 | 428 | 2,368 | 1.9 |
| 20 | 1,064 | 6,190 | 3.2 |
| 25 | 2,649 | 15,699 | 5.2 |
| 30 | 6,591 | 39,362 | 8.2 |

Arithmetic: hours are band XP ÷ band rate, summed — e.g. levels 25→30 cost
3,179+3,814+4,577+5,493+6,591 = 23,654 XP at 7,819/h = 3.0 h, on top of 5.2.

**≈ 8 h per skill, ≈ 49 h for all six.** With one action slot and 8 h banked per
absence, that is a few weeks of a phone game played in taps. Fits `break_eternity`
trivially — these are small integers; the Decimal layer is spare capacity.

---

## 3 · Timers — the idle spine (ask 3)

One **action slot** (**proposal**). Tap a node or edge, an action starts:
`{ skill, startedAt, duration, xp, yield }`. It **repeats** until stopped or
until its bound is hit (materials gone, node exhausted).

**Banking.** On resume, `src/core/offline.ts` already does exactly the right
thing and needs no new idea: closed form, never a giant `dt`.

    repeats = floor(min(now − lastTick, OFFLINE_CAP) / duration)
    remainder carries forward, so no partial action is shredded

- **Absence is never punished.** Nothing decays, no health drains, no timer
  expires into a penalty. `offline.ts`'s standing rule ("you come back to a job,
  never to damage") survives the pivot verbatim.
- **Absence is never a free lunch.** Away rate = present rate, exactly. The cap
  bounds it (8 h today; **proposal**: 12 h). And **anything requiring a decision
  does not auto-resolve** — a CYOA choice, a fight, a spend. The bank fills;
  the choices queue. That is the whole difference.

---

## 4 · Thresholds (ask 4) — on top of `starmap.ts`, not beside it

`src/core/starmap.ts` already ships the model: `requires.concepts` → `missing`
→ state `locked` → drawn, never hidden, key shown via `mask()`.

**Proposal**, one type widening, no parallel system:

    requires?: { keys?: number[]; skills?: Partial<Record<SkillId, number>> }

`laneFor` computes `missing` from both; `laneOpen`, `offered`, `closed`,
`LOCKED_LANES_AT` and `check-story.mjs`'s reachability proof are unchanged in
shape.

**One deliberate divergence** (**proposal**): a *key* gate stays masked
(`▓▓▓▓▓▓▓`), a *skill* gate is shown in the clear — **"Wayfaring 14"**. A word
you cannot read is intriguing; a number you have not reached is motivating, and
motivating requires being legible. Same door, two kinds of lock.

---

## 5 · The currency — **Obol** (**proposal**, awaiting the owner)

Classical fantasy, one syllable-ish, and it quietly carries the twist: an obol
is fare for passage.

- **Source:** every completed action drops Obols alongside XP, scaled by tier;
  plus a one-off bounty the first time you stand on a node.
- **Spent on:** tolls on edges that charge rather than lock (starmap already
  distinguishes *a price is a wait* from *a gate is a wall*); gear and
  consumables `COMBAT.md` specifies; a second action slot.
- **Not** spent on XP. Buying levels dissolves the whole structure.

---

## 6 · What a skill has to do with the graph (ask 5) — and the tension

Three ways it is genuinely graph-native:

1. **The skill graph.** A skill is not a bar; it is a small DAG of *action*
   nodes. Levelling reveals adjacent actions — same renderer, same gate model,
   second tab.
2. **Actions are bound to places.** XP is earned *at* a world node, so the two
   graphs are joined by "where can I do this".
3. **Gates are edge predicates**, which is already true in code.

**The honest part.** *Level 14 Guile* is a scalar on a HUD, and drawing a box
around it does not make it a graph. If the skill tab is only a decorated menu,
we have shipped a stat sheet with edges. The test: does the player ever **route**
through the skill graph — pick an unlock path with a real trade-off? If the
first playable slice does not show that, cut the tab and keep the bars. Do not
ship the decoration and call it ask 5.

---

## 7 · Open questions

1. **Currency name and source** — owner's call; Obol is a proposal.
2. **Cap 30?** Or 25, or 40. Chosen from playtime arithmetic, not from feel.
3. **One action slot or two?** Two doubles throughput and halves the tension.
4. **Offline cap 8 h or 12 h?** 8 h punishes a night's sleep by an hour.
5. **Do skills survive prestige?** Ask 9 says prestige rotates around the twist.
   Skills are the obvious carry, and that is not mine to decide.
6. **Is `Might` XP earned by fighting only?** `COMBAT.md` owns it.
7. **Skill gates legible, key gates masked** — is that one rule too many?
8. Six skills × 30 levels = 180 unlocks to author. Is that a content budget we
   can pay against PIVOT's 40–80 authored nodes?
