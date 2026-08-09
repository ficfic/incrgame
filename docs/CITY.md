# THE CITY ON THE GRAPH — the design

**2026-08-08, owner's brief:** *"i want this to pivot more to civ building
game… not civilization game literally… like incremental city builders and
stuff."* So: the **incremental city-builder genre** — Kittens Game / Evolve
lineage — with this project's one twist kept sacred: **it all happens on a
graph, and the connections are prominent.**

The camp-builder slice is the seed, not a casualty: sites, paths, the
component rule, the board and the probe all carry forward.

---

## The loop (minute to minute)

**See a shortfall → buy a building or a path → watch the rates change on the
map → afford the next unlock.** Production idles (that is the genre and the
pocket-time answer); *decisions* never idle — nothing buys itself, nothing
assigns itself invisibly.

## The five design rules

1. **Buildings come in COUNTS.** A site holds a stack — `Quarry ×3`, not "a
   quarry". Cost of the n-th copy ≈ base × **1.15^n**. This is the
   compounding curve the whole genre runs on, and the number the label
   carries.

2. **People are the multiplier.** Huts at the camp raise the population cap;
   food feeds people; people staff the works. A site's rate =
   `count × staffed × base`. Staffing is **automatic** (idle-game law: no
   babysitting); *choosing what exists* is the player's job. Population is
   also the unlock ladder — **pop thresholds replace camp levels.**

3. **The graph is the logistics layer.** Every path has a THROUGHPUT cap
   (gauge 1 ≈ 1.0/s of anything). A site producing past its path chokes —
   the surplus is **wasted, and the choke is drawn** (amber pulse on the
   path, the number on the label goes split: `makes 1.2 · carries 0.8`).
   Widening a path (gauge 2, 3…) is the infrastructure spend. This is the
   old max-flow economy reborn where it can finally be felt.

4. **The unlock cascade.** Each resource appears only when its precursor
   flows: stone → logs → planks → huts → people → food → (next tier). A
   locked site materialises at a pop threshold. The first hour is a chain of
   "oh, NOW I can…" — the genre's actual drug.

5. **No prose, still.** Nouns and numbers until the loop proves out. The
   satire thesis waits for a game worth writing on.

## The scale — a town, never a civilisation

**2026-08-08, owner:** *"very few people kind of game… maybe low hundreds
max."* People are countable and each one is felt: every person is a worker
(staffing is per-head already), growth is one settler at a time, and the
whole game ends somewhere around **~200 people** — a town you know, not a
statistic. Curves are tuned to that ceiling; nothing ever shows "1.2M".

## The hero and the goblins *(stolen from Mayor of Noobtown, on the owner's order)*

The wilderness is not empty — most sites and whole regions start
**goblin-held**. Held ground shows its strength (`Goblins · 14`) and takes
no buildings and no paths. The town has ONE hero:

- **Liberation gates territory.** The hero clears a held site; cleared
  ground joins the buildable map. Expansion = the hero's reach, not a
  pop threshold alone — the map ladder becomes *fights won*.
- **The economy arms the hero.** Gear is bought with the town's own
  outputs (stone → weapons? planks → shields? the smithy is a building),
  so the build loop and the fight loop feed each other.
- **The fight itself is player-driven** — no idle progress toward a goal,
  by the standing decree. Exact battle form: owner's call (chips pending).
- Farther ground is stronger; a beaten hero retreats to heal (time), never
  dies. Goblins may someday raid a pathed edge — pressure, later slice.

## V1 content (two sessions of build, roughly)

| Thing | Where | Makes / does | Notes |
|---|---|---|---|
| Hut ×n | camp | pop cap +2 | costs planks — planks finally SINK |
| Quarry ×n | rock sites | stone | staffed |
| Lumberworks ×n | pine sites | logs | staffed |
| Sawmill ×n | river sites | logs → planks | staffed, ratio 1:1 |
| Farm ×n | meadow sites | food | slice 3; people eat, starving halts staffing |
| Path g1–3 | edges | carries 1/2/3 per s | choke drawn when exceeded |

## What changes from the shipped slice

- `built: Record<site, Kind>` → `stacks: Record<site, number>` (kind stays
  per-site); costs escalate 1.15^n.
- `LEVEL_AT` planks-eaten ladder → **pop thresholds**; the camp stops
  "eating" planks — planks become the building currency instead (a real
  sink, not a furnace).
- `rates()` gains per-path throughput and a `waste` figure per site.
- Header: stone · logs · planks · food · **people 4/6**.

## Slice 2 (next session, smallest playable)

Counts with rising costs + huts/pop as the multiplier + path throughput with
visible waste. Success = the screenshot shows `Quarry ×3` choking a gauge-1
path and a wider path fixing it. Food and farms are slice 3; prestige is a
season away and stays unwritten.


---

# PART 2 — THE ARC *(proposed 2026-08-08, owner's redline pending — nothing here is built)*

> The owner: *"overall it seems like a game… we need to design more before
> building."* So: where does it GO? Everything below is a proposal chip.

## The shape of a whole run

**Valley → frontier → the far country → THE LAST HOLDING.** Three or four
regions, each gated by fights, each with its own personality — and the run
ENDS. This is a small-town game (~200 people); it earns a finish, not an
asymptote. The final holding is the goblins' seat: a multi-sortie siege the
whole town economy has to be marshalled for.

## What makes each region ITS OWN (pick per region, not all at once)

- **Its own food artery** (chad's wall): a granary route, or a fishing
  river, so growth doesn't drag one road forever.
- **A new resource + one new works**: iron in region 3 (better arms need
  it), stone gives way to ore chains. ONE new rung per region, Kittens-law.
- **A new pressure**: winters (stores drain seasonally)? goblin raids on
  paths (a reason for walls/watchtowers)? Pick ONE, late, or none.

## The ending of a run — ★ DECIDED 2026-08-08: LEGACY

The owner: *"i want to do it kind of like there would be a reason to move
on and build again."* Finishing a valley FOUNDS THE NEXT ONE. The next
valley is a new map (new site layout, new holdings), harder, and the
keepsake is ★ DECIDED: **THE VETERAN HERO.** Arms and toughness cross the
valleys; the town starts cold every time. All prestige flows THROUGH the
hero — a stronger hero opens ground and frees captives sooner, which is
the felt acceleration, with no % multipliers to rot. Valley 2's ladder is
tuned against the hero valley 1 hands over (hp ~28, arms ~10), and the
climb continues from there. A finite run inside an infinite game: the
town stays small, the LINE of towns is what grows.

## Standing rulings needed (from the playtests, queued in BACKLOG)

1. Paths build instantly — keep (snappy) or give them a short build time?
2. One-option fights: auto-resolve, or does turn-based stay sacred?
3. Whole-people staffing (integer hands, pins that zero a works) — yes?
4. Building icons on the map — worth a visual session?

## Not designed here, on purpose

Prose, names, the title — the owner's, when the ban lifts. The satire
thesis — waits until there are words at all.


## The fight, JRPG-lite — ★ DESIGNED 2026-08-08, the owner's own screen

> *"a square on the left and for goblins to have three squares on the
> right. And we fight. We have attack, defense and stuff, and they poke
> at us."*

**THE BATTLE STRIP** (in the dock): the hero's square LEFT, the holding
split into THREE goblin squares RIGHT, each with its own strength. Tap a
square to TARGET it. Deterministic, no dice, numbers on everything.

- **Attack** — 2+arms into the targeted square. A dead square stops
  poking: kill order is the first real decision.
- **Defend** — deal nothing, block this answer whole.
- **THE POKES**: every living square bites each answer — thinning the
  line is how a fight gets survivable. Every third answer the squares
  WIND UP (said a round ahead) and bite double: Defend's moment.
- **Rations** — 3 food → +4 health, any round. The larder marches.
- **Fall back** — unchanged; every square keeps its wounds.

Mash-attack ignores targeting and telegraphs and eats every double poke;
the ladder is re-simmed square-by-square before numbers ship.

**★ BUILT 2026-08-08, retuned in the sim.** The as-designed line (big
brute biting hard up front) made brute-first the RIGHT play — mash won
four fights of six under an exhaustive-play solver. Shipped shape: the
front square is a WALL (most of the strength, pokes 1), the two runts
behind carry the site's full bite, and each runt's health is pegged to
the ladder's hit (`runt` in GOBLINS) — one aimed strike drops it at
tier, two at tier-minus-one, and those two extra full-line answers are
the whole gate. Rations became a pack of TWO a sortie (a stocked larder
was out-sitting under-armed fights). Solver verdict, every rung: WIN at
ladder arms, LOSE at −1 and −2, mash LOSES. Fight one now gates at
Arms ×1 — the bare-hands two-sortie tutorial is void (regen outruns it),
and the first lesson is arming, aiming past the wall, and the wind-up.


## ★★★ WHY TAKE THE GROUND — built 2026-08-08, the owner's own complaint

> *"no reason to have a site protected by goblins where you can build a
> quarry because you have unlimited defenceless quarries you can build
> near start."*

Correct, and four independent reviews said the same thing louder: the
territory ladder paid **2 captives, 3 hero hp and a fog lift**, and the
ground itself paid nothing. Worse — conquest was throughput-NEGATIVE:
every eastern good filed down `0|3` behind the mill's planks, and *every
mouthful of food in the game* crossed `0|4`, one 3.0/s edge, which is
where the town silently stopped growing at 66 people against a design
that says 200.

Two answers, both small, both shipped:

**1. THE TWO GATES CARRY THEIR OWN ROAD HOME.** Scree Slope and Goblin
Knoll now touch the camp directly (`near: [0, …]`). The edge is drawn
from minute one as a dotted line to held ground — *you can see the road
you cannot have yet* — and it cannot be laid while the goblins stand on
it. Taking the Knoll doubles the food artery to 6.0/s and moves the pop
wall from **66 to 126**; taking the Scree lifts the whole east off the
mill's edge. This is a prize no amount of building at Rock Face can buy,
which is exactly what was missing.

**2. HELD GROUND IS RICHER.** `rich` per site, multiplied into every
hand's output: Scree ×1.5, Knoll ×2, Dark Pines ×2.5, High Quarry ×3,
Green Vale ×3.5 — scaled to the garrison, so the story and the
spreadsheet say the same thing. One ×3 pit makes exactly what three
plain pits make, but it is bought at the price of copy #1 instead of
copies #1-3, and the lead is permanent: `ln(M)/ln(1.35)` copies, ~3.7
for ×3, because both sites go on climbing the same curve. Bounded on
purpose — nothing runs away.

The panel says both prizes **before the fight is paid for**: *"dangerous
— goblins, 24 strong · quarry ×2 · own path to camp"*.

⚠️ STILL OPEN after this (see `docs/BACKLOG.md`, the coherence review):
no player-side exponential anywhere (RATE never changes), `tap` obeys no
gate, `starving` reads production instead of delivery, farms over-staff,
and auto-staffing is blind to chokes.


## ★★ THE STOREHOUSE — built 2026-08-08

> *"i also think we'd need to do some storage capacity"*

Every good is now **capped**, and what arrives at a full store is **WASTE** —
the same law the paths already obey, in a second currency. A camp holds
`STORE_BASE` 60 of each; every storehouse adds a flat `STORE_ROOM` 60,
priced in stone AND planks on a 1.3 curve so it races the huts for the
mill's output rather than being bought out of spare change.

Flat room, not compounding, on purpose: the answer to *"I need a bigger
number"* should always be **one more building**.

Two things fall out of it, both wanted:

- **Stone stops being infinite.** The review's finding was *"6468 stone by
  round two, and it buys nothing"*. Twelve hours away now banks a
  storehouse's worth and spills the rest — visibly, on the chip.
- **The cap gates what you can SAVE FOR.** Arms ×9 costs 66 stone and Hut
  #15 costs 71 planks; a bare camp holds 60. Everything below those rungs
  fits, so nothing is walled early — but the top of both ladders is behind
  a storehouse. It is not a nicety.

A stock already OVER the ceiling is held, never confiscated: it simply
cannot grow. The header says `full of 60` on the chip and the camp panel
says `stores hold 60`, because waste nobody can see is the choke bug
wearing a different hat.


## ★★★ THE CARTWRIGHT — built 2026-08-08

The coherence review's top finding: **every exponential in this engine ran
against the player.** `CURVE` 1.35, `armsCost` 1.3, `storeCost` 1.3 all
compound upward, while output is strictly LINEAR in a hard-capped
population. There was no player-side exponential anywhere.

**The backlog asked for a production multiplier, and it would have been a
no-op.** Measured before building — a finished town, every site stacked
eight deep, every path at `MAX_GAUGE`, 162 people:

| | |
|---|---|
| makes | 57.9/s |
| carries | 13.9/s |
| **wasted at the paths** | **76%** |

`MAX_GAUGE` is a hard ceiling, so multiplying `RATE` would have multiplied
the waste and delivered nothing. **The exponential goes where the wall is.**
A cart rung multiplies what every gauge CARRIES (`CART_GAIN` 1.3, cost
1.55), turning that dead 76% into the reward — and design rule 3 says the
graph is the logistics layer, so a multiplier on haulage is the one that
belongs on this game's board.

Measured payoff on that same maxed town: 13.9/s at no carts → 48.7/s at
eight, every rung strictly better than the last, and it can never carry
more than the town makes. It **runs out on purpose** — a findable number of
rungs fully un-chokes a given town, after which carts buy nothing until
more works are built. Carts and works leapfrog; the works ladder is
unbounded, so the pair is too.

⚠️ **The deed is offered only while something is actually being wasted.**
A cart buys exactly nothing for a town whose paths already carry everything
it makes, and 30 stone for nothing is a trap laid squarely in the first
hour, when no path is near its cap.


## ★★ THE HAND OBEYS THE CEILING — fixed 2026-08-08

The coherence review's second finding: **the tap obeyed no gate the rest of
the game obeys**, and the storehouse made that strictly worse — a full store
could be tapped past its own cap forever, which makes the whole storehouse
ladder skippable by spamming a button. The hand now goes through `stow`,
the same single helper the tick uses, so the hand and the carts can never
disagree about what full means.

**It deliberately still ignores the other two gates, and both exemptions
are load-bearing:**

| gate | why the hand is exempt |
|---|---|
| the paths | `initial()` has no paths and no works. The hand is the only source of the first 5 stone; route it and the game cannot be started. |
| starving | An empty larder halts every works but the farms. A town with no farm needs 12 stone to build one — if the hand halted too, there would be no way to earn it. **The hand is the floor under a starve.** |

Both are pinned by tests that fail if a future session "fixes" them.


## ★★★ STARVING READS DELIVERY — fixed 2026-08-08

The coherence review's third finding. The test was `hunger(g) > farmRaw`,
and `farmRaw` is the food standing **in the fields**. A farm whose path
home was choked therefore counted as feeding the town, and **the failure
was silent**: empty larder, no warning, no halt, every works running flat
out on rations that never arrived. Measured on the sabotage, the header
read `0 food −1.7/s +0.5/s` — eating more than arrives, at zero, with
nothing on screen saying so.

Delivery is only known *after* routing, and routing is what the halt
changes, so `flow` now runs the haulage twice:

1. `deliver(made)` — the town running normally. Did enough food get home?
2. If not, the works halt and `deliver(halted)` runs again with only the
   farms working.

**The second run is not a penalty, it is the mechanism.** Halting the
quarries frees the very paths the food was stuck behind, which is how a
starving town digs itself out — measured, a town that delivers 1.2/s
against a 1.7/s appetite delivers 3.0/s once the works stop competing for
the road.


## ★★ THE BARRIER — built 2026-08-09

> *"yeah in noobtown he's had a barrier"*

Mayor of Noobtown draws a ward around the town and pushes it outward as you
take ground. `src/camp/barrier.ts` is that, on a graph: a dashed line
enclosing every stop with no goblins on it, plus the padding.

It is **a picture of a fact the game already has**, not a new quantity —
liberating a holding moves the line. That is the whole reason to draw it:
taking ground used to change some numbers and nothing you could see from
across the room. Measured, the enclosed area grows >10% on the first
liberation, and the deep country revealed behind it stays outside.

Every held stop contributes a ring of sample points and the hull is taken
over all of them, so one stop yields a circle, two a capsule, and nine a
rounded shell — no special cases, and no polygon-insetting mitre maths.

⚠️ **Two traps, both hit and both recorded:**

- **The mock's teal was not usable.** `route` is teal and the probe counts
  it; a large teal region would have silently corrupted the "is the road
  filling?" check. The ward is violet, measured at 56 from its nearest
  counted ink.
- **The fill had to go.** A 7%-alpha wash over the held country tints every
  pixel beneath it — including the carrier dots the probe measures — and it
  fired `the carriers do not walk` on a build where they walked fine. Only
  running the probe found it. A barrier is a line, which is what a barrier
  is.


## ★★ THE HUD — rebuilt 2026-08-09 to the owner's mock

It was one wrapped run-on line — `60 stone 12 logs 45 planks 54 food 11
people · huts full hero 10/10 · arms 1` — with every quantity at the same
weight and no alignment, so nothing could be found at a glance.

Now **four goods across the top, four standings under them**:

| | | | |
|---|---|---|---|
| STONE | LOGS | PLANKS | FOOD |
| 👤 people | 🏠 huts | ⚔️ hero | 🛞 carts |

The stone column is the tap — a whole column of thumb instead of a chip.

**Three states had to survive the restyle**, all earned this week, and a
HUD that looks better while hiding them would be worse: a **full** store
(the stock has stopped climbing), a **STARVING** town (every works but the
farms has halted), and the tap rate on stone.

⚠️ **Every cell carries `data-q`, and that is what the probe reads.** The
old checks regexed the whole header for `2/2 people` and `6 people · huts
full`, so each was coupled to the order and punctuation of a run-on line —
and one of them could not see the population cap at all (it turned out the
captives walk home into a camp with room for **two**, not six).

### Two defects the screenshots caught, in order

1. The gear button was pinned to the top corner and **sat on the FOOD
   column**, clipping its label to `FOO`. It lives in the standings row now,
   as a trailing `auto` column that cannot overlap anything.
2. The standings were four equal columns, which **clipped the hero's arms
   count** — `⚔️ 8/10 · arms` with nothing after it. They are uneven by
   nature (`🛞 3` against `⚔️ 8/10 · arms 1`), so the short ones take what
   they need and the hero takes the slack.

### ⚠️ And a check this work destabilised, now fixed

`the carriers do not walk` measured the **centroid** of carrier ink and
wanted 0.4px of drift in 700ms. Carriers are spread along every path, so
dots entering and leaving cancel out and the centre moves ~0.3px — it
**failed on good builds and passed on others**. Changing the header's
height perturbed it enough to fire twice. It now measures the raw sum of
positions, where the same walk reads 30–65% against a 0.05% threshold, and
0.000% when the animation is frozen. Three consecutive green runs.
