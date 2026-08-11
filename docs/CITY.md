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


## ★★ THE DOCK — halved 2026-08-09

> *"can you work on the horizontal buttons at the bottom now, they take too
> much space"* — the owner, playing on the phone.

They did. Each deed was a full-width card, name over price over 10px of
padding, **54px each**, so the list ran to 234px of an 844px screen with
only four deeds showing and 400px+ at the camp.

Two columns now, which is **the answer the battle strip already reached for
the same reason** (`.verbs`, *"four stacked full-width deeds pushed the strip
off small screens"*) — the dock uses the precedent rather than inventing a
second one.

Measured on the owner's own screen, at the busiest site:

| | one column | two columns |
|---|---|---|
| 4 deeds (the mill) | 234px | **118px** |
| 10 deeds (the camp) | 556px | **340px** |
| map gets | 374px | **490px** |

⚠️ **Every row is still 44px minimum.** The list is shorter; the tap target
is not. Shaving that is how a compact list becomes a list you cannot hit.

### Two things the screenshots caught that no check would have

1. **The right column ran off the screen edge**, cutting `Widen · The Camp
   (1 of 3)` to `(1 of`. The base `.deed` rule sets `width: 100%` and **this
   app has no `box-sizing: border-box` reset anywhere** — so inside a grid
   cell every row came out 22px wider than its column. `.deed.row` sets
   `border-box` and `width: auto`; a global reset was not worth the blast
   radius.
2. The measured-height check for the 44px floor was **vacuous**: every deed
   carries two lines of text and comes out 49–63px unaided, so the
   `min-height` could be dropped to 28px with nothing noticing. Proven
   exactly that way. The probe reads the computed `min-height` now, which is
   the rule that actually protects a thumb.


## ★★ MARKS, NOT PROSE — 2026-08-09

> *"too much prose there, please icons and indicators"*

`src/camp/marks.ts` names each thing once, and **the HUD and the dock both
read it** — a second hand-typed set of icons in the deeds is exactly how the
board came to say "25 nodes" beside a HUD saying "3 recovered".

| was | is |
|---|---|
| `55 stone · 33 planks → holds 300 of each · 3 standing` | `🪨55 🟫33 → 📦300 · ×3` |
| `11 stone — you have 3` | `🪨3/11` |
| `dangerous — goblins, 18 strong` | `☠18` |
| `18 stone · 9 planks → hits 6 · 3 carried` | `🪨18 🟫9 → ⚔️6 · ×3` |
| `6 stone · 12s · carries 3.4/s` | `1/3 · 🪨6 ⏱12s → 3.4/s` |
| `20 people · huts full · eats 0.7/s · fields bring 0.0/s · stores hold 120 · works 63% staffed` | `🌾+0.0/s −0.7/s · 📦120 · 👤63%` |

Two things worth keeping straight:

- **`🪨3/11` is have-over-need**, the same shape as `👤4/6` in the HUD one row
  above. The old form was eight words for two numbers *and* a different
  shape from the row above it.
- **The status line lost what the HUD already says**, rather than being
  restyled. Population and its cap are `👤20/18` one row up; what is left
  here is the food balance, the room in the stores, and how well the works
  are manned — the three things the HUD does not carry.
- `Widen · Rock Face (1 of 3)` did not fit a half-width card and ellipsised
  to `(…`, cutting the one number the label carried. The name is what you
  scan for, so the gauge moved into the note with the other numbers.

⚠️ **The probe now fails on prose returning to a deed note** — it scans every
`.deed em` for the English that used to live there (`you have`, `holds`,
`standing`, `dangerous`, `carries`, `hits`…). Proven by putting the
storehouse's old sentence back.


## ★★★ THE GOBLINS COME AT YOU — built 2026-08-09

> *"i feel like we need to add attacking goblins and then make hero lose and
> restart stronger or something"* — the owner, asked what the goal is.

**This is the first half.** Until now held ground sat there and healed, so the
map was a to-do list: six fights, in any order, at your leisure. A holding
that can take something back is a **clock**, and it is what makes the hero
matter on the days between fights rather than six times a run.

- A holding whose neighbour is yours **and has something on it** fills toward
  a raid over `RAID_SECS` (300s). One with nothing in reach never fills, so
  the early camp is not besieged from minute one.
- It comes for the fullest thing it can reach, and takes **one building**.
- Taking the ground stops that clock for good.

### ⚠️ It must not punish absence, and it does not

`docs/BRIEF.md`, standing constraint: *"Timers bank work; they never punish
absence."* So menace **builds** while you are away and **cannot land** — a
raid that comes due offline waits at the gate, full, and breaks on the first
tick you are actually watching. Twelve hours away is 144 raids' worth of
time; **not one of them lands**. You come back to a raid about to break,
never to a ruin. Pinned by a test, and proven by making raids land offline.

### The clock is visible, because one you cannot see is theft

The holding's own panel reads `☠12 · own path to camp · ⚠99% → The Camp` —
strength, what it is worth taking, how full it is, and what it is coming for.
The dot swells as it fills, riding the same `r` channel the board already
uses for health.

⚠️ The first cut of that line **returned early with only the menace and
silently dropped the prize**, which broke the check that the two gates
advertise their own artery. Added to the line, not put in front of it.

### What is still missing

The second half — **the hero loses and you restart stronger**. Right now a
raid can strip a site to nothing and the run simply continues. That is the
goal state, and it is the next item.


## ★★★ LOSE THE VALLEY, KEEP THE VETERAN — built 2026-08-09

The second half of the owner's answer: *"make hero lose and restart
stronger."* **The game has a goal state now.**

- **First blood starts the war.** The goblins ignore a camp that has never
  touched them — before this they came for you in the opening five minutes,
  a siege you had no hero for. Take one holding and they do not stop.
- **A raid takes a building; when there is nothing left to burn it takes the
  GROUND.** A stripped site becomes theirs, the barrier shrinks, and you must
  march to get it back.
- **They eat inward.** Always the fullest thing standing, then bare ground,
  and **the camp last of all**. That ordering is the length of a run.
- **The camp falls → the valley is lost.** The board stops ticking and the
  end covers the screen: *THE VALLEY IS LOST*. The owner's complaint on a
  previous win was *"I think I won, but it wasn't clear"* — a run that ends
  quietly is a bug in the only moment the game has.
- **The veteran walks out.** Everything built is gone; the hero carries
  `floor(arms/2) + 1`, taken as a **maximum** against what you already had —
  so a run that ends early can never make you weaker than the run before it.
  *Failure is a plateau, never a loss:* `docs/BRIEF.md`.

### Three bugs this shook out, all found by a check rather than by luck

1. **`heroMax` ran backwards.** It was `originals − current holdings`, and a
   raid can now *add* a holding. It counts `taken` — liberations this run —
   explicitly.
2. **The save door refused a run the goblins were winning.** Every goblin key
   was checked against the six original holdings, so the moment a raid took
   Rock Face the save was rejected on reload and **the run was silently
   wiped**. Any real site is legal now; a site that does not exist is still a
   forgery.
3. **`raidTarget` preferred the camp** among bare sites — the exact opposite
   of "the camp last of all", which the comment above it already claimed.
   Caught by a test that expected an outpost to fall first.


## ★★ THE PLAYTEST, 2026-08-10 — what the first end-to-end play changed

`docs/BACKLOG.md` holds all nineteen items in the owner's own words. What
landed first, and why each was a real defect rather than a preference:

### The barrier encloses what you HOLD

> *"why does it cover Rock Face and Tall Pines and so on? Because I have not
> yet went to Tall Pines"*

`held()` meant *"every site with no goblins standing on it"*, which on a
fresh save is most of the map. A line that starts around ground you have
never visited cannot read as a frontier you push outward — the complaint was
about the **definition**, not the drawing.

Held now = **the camp, always** · **anything you built on** · **anything
joined to the camp by finished paths**, walking only over ground already
yours. Minus goblin ground, minus ground hidden behind an unliberated
holding.

| enclosed area | |
|---|---|
| fresh save, old definition | 54,629 |
| fresh save, new | **7,947** — 6.9× smaller |
| after a raid takes Rock Face back | 38,807 — **the line shrinks** |

Two choices worth not re-deriving: it does **not** use the engine's
`component()`, because that walk crosses goblin ground (for hauling, a path
is a path) and would keep a cut-off arm inside the line; and `laying` does
not count, so the road fills as it is dug and the barrier moves when it
lands — one event, one tell.

### The one screen

- **Selection is sticky.** `picked === n ? null : n` cleared it on a second
  tap. *"the state when there is no node selected is a little bit weird
  state."* There is no reason to ever want the empty panel.
- **Every good shows its ceiling always** — `41/60`, not a bare amount with
  `full of 60` appearing only once full, which is the one moment the number
  stops being useful.
- **The goal and the war are permanently on screen.** *"I do not see any
  goal"* and *"I'm not sure when the attack on the camp is gonna happen"* —
  the raid clock existed but only on the holding's own panel, which you had
  to go and tap. A war you cannot see coming is not a clock.
- **The rich multiplier says what it multiplies.** `quarry ×1.5` → `0.50/s a
  hand vs 0.20`. *"Query one point five. What does it even mean?"*

### ⚠️ Still open, and the big one

**The tap out-earns every building**, which voids the economy and is why the
owner reports no reason to build a quarry and no reason to take ground for
one. Being fixed alongside build timers and an over-cap consequence.


### The board tells the truth about its own rates

> *"if it is point zero four per second, then I anticipate to see a dot
> moving from lumberworks to the camp at a rate of one per two seconds. At
> the moment, I see much more."*

The porters were `2 + round(2*min(1,load))` dots sliding at a fixed fraction
of the line per tick — and **`load` is fraction of capacity**, so it reads 1
on a full trickle and 1 on a full torrent. The picture was identical at
0.04/s and 40/s. Decoration wearing the costume of a readout.

Porters now stand `gap` apart walking at `v`, so one crosses the far end
every `gap/v` seconds. Set that to `1/rate`:

```
gap = v / rate     ⇒     arrivals per second = v / gap = rate
```

`v` never touches what the dots *claim*, only how spread out they are — so
the anti-crowding clamp is free: `gap = max(MIN_GAP, WALK/rate)`,
`v = gap*rate`. **A busy road makes the porters walk faster, not closer**,
and exactly `rate` still leave per second. Measured over 600s on a real leg:
0.04 → 0.0400, 0.15 → 0.1500, 1 → 0.9933, 40 → 39.9883.

`phase` is in **seconds** now. It was an arbitrary 0.012-per-ms count
wrapping at 1000, and you cannot write "units per second" against that.

⚠️ `Camp.svelte` must pass `rate` per line. Omit it and **no carriers draw at
all** — deliberately a loud regression rather than a silent lie.

### Path colour

Two of the owner's sentences were one defect: *"when it is building, it is
blue… and when it's finished, it is dark blue."* Both states were blue, one
family apart. A way being dug is now hatched, uncased, **turned earth** — it
carries nothing and is drawn to say so. The finished road keeps its teal
(the owner's own request for mana channels) and the amber choke survives,
because earth is the only hue on the board that is neither.

⚠️ **The ink trap was measured, not assumed.** Nearest counted ink to the new
earth is `foe` at 43 against a needed 12; the old cyan's nearest was `river`
at 39. The trench dash lays ~2.7px of ink per unit against the old solid
3px, so the probe's fill-growth check keeps its meaning.


## ★★★ THE HAND IS GONE — 2026-08-10, and it was the whole economy

> *"there is no need for me to build a quarry because I am able to much
> faster click on the thing… I don't need a quarry ever"*

`TAP_STONE` was 0.25 a click, gated by **nothing** — not paths, not hands,
not food, not storage. A thumb at 4Hz is ~1.0/s from nothing, forever,
against a quarry's 0.15/s **shared across its hands**. Every ladder in this
game was priced against an income the player beats by hand, which is also
why taking rich ground bought nothing worth having.

**The game opens with a wagon instead: 15 stone, 10 logs.**

- The opening chain costs 11 — a road (3), a quarry (5), a road (3).
- **15 rather than 11 is the anti-softlock number**: only three roads leave
  the camp ungoblined (9 stone), and 9 + 5 for a pit is 14, so no opening
  *order* can strand a town that no longer has a hand to dig out with.
- Logs are a closed loop without the chop — a lumber camp costs logs and
  only a lumber camp makes them — so 10 seeds it with 2 spare.

⚠️ **That reasoning had a hole and the hole is real** — see the balance audit
in `BACKLOG.md`. It counted *laying* and forgot *widening*: three roads then
one widen is 15 spent exactly, and the save is then dead forever. Verified by
execution. **The escape hatch was the tap, and removing it removed the
escape.** Unfixed at time of writing.

## ★★ EVERYTHING TAKES TIME — 2026-08-10

> *"some mill got built as far as I understand instantly, although this is a
> little bit strange. Actually, it should take time to build it."*

`docs/BRIEF.md` item 3 makes timers the idle spine, and paths were the only
one in the game. Buildings now use the same shape: hut 8s, quarry and
lumberworks 10s, farm 12s, sawmill 15s — **flat per kind, deliberately not on
the 1.35 curve**, since the cost already climbs and taxing the clock as well
would wall the ladder. Costs are paid at the order, the works stands when the
tick lands it, a site under the hammer staffs nobody, and away-ticks bank
builds exactly as they bank spades.

## ★★ THE +1 NAMES WHAT LANDED — 2026-08-10

> *"I also don't see plus one pop up with the appropriate icon once the
> resource is mined"*

Two defects in one line: the float watched **stone alone**, so a town whose
planks were climbing showed nothing at all; and it said a bare `+1` for every
good alike. Every good is watched now and the float carries that good's mark
from `marks.ts` — the same table the HUD and the dock read, so the three
cannot drift. The board keeps its one-a-second throttle, because at pipe
rates a `+1` per landing is confetti and the owner has said so once already.

⚠️ Proven by a seed with **no quarry anywhere**, so the only pile that can
grow is planks: a float there cannot be the old stone-watching code.


## ★★ THE PALETTE, MEASURED — 2026-08-10

> *"the colors are also a little bit strange"*

Not actionable as stated, so it was split into the objective half and the
taste half. The objective half is now fixed **and guarded**
(`test/palette.test.ts`), against two things a number can settle:

| | was | now |
|---|---|---|
| `shut` — the choke warning — WCAG contrast on parchment | **2.90** (below the 3.0 floor for a graphic) | **3.89** |
| `ward` vs `route` — the barrier against a road — under deuteranopia/protanopia | **21** apart, they collapse together | **50** |

The board leans on green for *yours* and red for *theirs*, which is exactly
the pairing about one man in twelve cannot make, so the colour-blind check
covers every pair a player must separate to play at all: worked vs held,
layable vs not, danger vs choke, road vs trench, barrier vs road, theirs vs
where you stand.

⚠️ **`flowing` measures 1.06 and is correct.** It is drawn over the road's
casing and core, never on bare ground, so contrast-against-paper is the
wrong measure for it. Written down so the next audit does not "fix" it.

⚠️ **The taste half is still open**, and taste is not testable. If a specific
colour still reads wrong, it needs pointing at.


## ★★★ THE FORAY — the floor under the economy, 2026-08-10

> *"i think it's possible to soft lock, so we need to do repeatable encounters
> with logs and stone and other stuff as loot"*

**The owner is right, and it was worse than the one case already plugged.**
Refusing a bad widen fixes one route into a dead save; it cannot fix the
general one. After first blood a raid takes a **building every 150s**, so a
town can be stripped of every works while its stores sit at zero — and then
nothing in the game produces anything, ever again. Only a source of goods
that needs no buildings can fix that.

The hero goes out for `FORAGE_SECS` (45s) and comes back with loot.

⚠️ **It is deliberately slower than ONE hand in a pit.** 4 stone over 45s is
0.089/s against a single quarry hand's 0.15/s, so the moment you have one
working pit, foraging is the worse move. **This is the whole reason the hand
died this morning** — 0.25 a click out-earned every ladder and made building
pointless — and a test now fails if any encounter's loot ever crosses
`RATE.quarry`. A floor, not a strategy.

⚠️ **And it is pure.** There is no RNG anywhere in this engine, so the
encounters **cycle by count** rather than rolling: varied, deterministic,
and testable. Five of them today — a scree slip, deadfall in the pines, a
berry hollow, an old cairn, a goblin cache — and adding one is a line of
data.

**It banks while you are away and it lands.** A raid and a blow are held
until you are watching, because those can *cost* you something; work you are
owed is the opposite, and `docs/BRIEF.md` promises it. One per absence — it
does not re-order itself into an idle mine.

The whole way back is walked in a test: from a town with nothing, seven
forays buy a road home (3) and a pit (5), and the town produces off its own
works again.


## ★★★ THE LARDER IS LIVE, AND FAMINE IS A SQUEEZE — 2026-08-10

**Food was inert for the whole opening, and the cause was arithmetic, not
design.** `WILD_FED` was 6 while the camp sleeps 4, so `hunger()` returned a
flat **zero** until you had built a hut and filled it. The wild feeds **two**
now: the four who came with you are eating from the first second, the wagon
carries 40 of runway, and the answer to the pinch is High Meadow — the first
fight. That gives the tutorial fight a reason, which was a separate
complaint.

**Famine was a switch and is now a squeeze**, exactly as asked: −30% at the
first empty second, deepening to −95% over `FAMINE_DEEP` (120s). Farms are
exempt because they are the way out, and it never reaches zero, which is what
keeps the starvation dead-end shut alongside the foray.

⚠️ **It does not deepen while you are away**, for two reasons that agree.
`docs/BRIEF.md` forbids punishing absence — a famine that bites harder for
having gone out is exactly that. And the ramp reads `famine` at the start of
a tick, so a deepening one would make production depend on how the away-time
happened to be chunked; sabotaging this breaks the catch-up-equals-tick
guard, which is how it was caught.

⚠️ **The dig-out is slower now, and that is the point.** Under the binary
halt the quarries stopped dead and the bread got through on the very next
frame. A squeeze has to bite before it frees the road, so a measured town
digs itself out in tens of seconds rather than instantly.


## ★★★ THE HUT BUG, AND WHAT YOU CAN DO ABOUT A RAID — 2026-08-10

> *"my save got super bugged, huts were disappearing… also the goblin raids
> mechanics is unclear how it happens, why and what can you do about it"*

**It was not a corrupt save. It was one line.** The rule was *"come for the
fullest thing you can reach"*, and the fullest pile in any town is the camp's
**huts** — so every raider on the map queued on the housing, which is the one
stack that gates people, and people gate everything. Simulated before the fix,
three raiders on a going concern:

| | huts | pop cap |
|---|---|---|
| start | 5 | 24 |
| after raid 1 | 2 | 12 |
| after raid 2 | **0** | **4** |

Twenty people unhoused and idle, then the camp fell. The comment beside the
bare-ground branch **already claimed the camp goes last** — it just was not
true of ground with anything on it. It is now.

### What you can do about it: three answers, all on screen

The last third of the complaint had no answer at all. The only lever was to
conquer the holding faster, which a town under three raiders often cannot.

1. **Keep the hero home.** A hero at the camp — not fighting, not foraging,
   not beaten — **turns one raid away** and bleeds that holding doing it, so
   defending is slow progress toward taking it.
2. **Take the holding.** That stops its clock for good.
3. **Build more than they can eat.** Each building is 150 seconds of somebody
   else's work.

⚠️ **One hero, one gate.** The first cut let a single idle hero repel every
holding on the map in the same instant, which is the mechanic deleting
itself. The watch is spent by the first raid it turns away: three raiders
means one is stopped and two get through.

**And it made the hero's time a real choice** — loot, ground, or the walls,
never all three. That is the trade the foray was missing.

### Said on screen, always

The war line carries all three questions: `⚠70% → Rock Face · ⚔️ on watch ·
☠6 left` — how full, what it comes for, whether anything can stop it, and how
much of the valley is still theirs. Before first blood it reads *"they come
once you take one"*, which is the **why**.

⚠️ **An emergent property worth knowing:** a 300-second raid cycle is almost
exactly what one healed hero can hold off, so a town that keeps its hero home
holds one gate indefinitely and loses the others. That fell out of the
numbers rather than being designed, and it is why several test fixtures now
have to send the hero away explicitly to make a raid land at all.


## ★★★ THE HERO HAS A PLACE — 2026-08-10, steps 1–2 of `docs/RAIDS.md`

> *"it's not even visible anywhere… the hero must have travel times between his
> attacks and home… and all must be visible on map"*

**The war was invisible for a structural reason.** `hero` was
`{ hp, spears, part }` — no position at all. So "on watch" was a boolean over
the whole valley, a raid was an event with no path, and a fight was a screen
that appeared. Nothing about the war was on the map because nothing about the
war *had* a place.

- **`hero.at` and `hero.trip`.** Marching walks the **laid roads** at
  `WALK_SECS` 12 a leg, banks like every other timer, and lands on an away
  tick — walking is work you are owed, not a threat held over you.
- **Arriving on held ground draws the sword.** A march is the whole act;
  `assail` now refuses unless the hero is standing on the ground, and the
  line is read from the holding's strength **at arrival**.
- **The watch is where they stand** (the owner's call). Three holdings can be
  filling and the hero can be at one of them — the roads decide which you can
  reach in time.
- **The hero is drawn on the map**, sliding along the road while walking.

### Two bugs this shook out, one of which would have broken the game

⚠️ **A path can never be LAID to goblin ground** (`unlayable` refuses it), so
requiring a road for the last step made **every fight on the map unreachable**
the moment marching became the only way to one. The final step onto adjacent
held ground needs no road — walking to a battle is cross-country; walking
*through* a holding is still impossible. **Caught by the browser probe and by
no unit test**, so a test now covers it.

⚠️ **`honour()` validated `hero.at` but never defaulted it**, so every save
written before this change loaded with `at: undefined` — and an undefined
place means no road reaches anywhere, i.e. every march refused. The test that
should have caught it read `back.hero.at ?? 0`, which passes on `undefined`.
Both fixed, and the `??` is gone.

⚠️ **The marker is canvas-side only** — `docs/MAP_RECIPE.md` §9: a thing that
drifts is a thing a thumb cannot hit. It also had to be **offset from the
site's centre**, because drawn on the dot the graph painted straight over it:
0px of hero ink on the board, which the probe caught.

### Still to come, from the design

Red dotted threat lines and muster rings (step 3), and the ambush on the road
(step 4). **The fight ladder is still tuned to an always-available hero** —
travel time is a real nerf to every rung and `chad-liquidity` should re-run it.


## ★★★ THE WAR, DRAWN — 2026-08-10, steps 3–4 of `docs/RAIDS.md`

**Step 3 — the muster and the threat.** A gathering holding wears a **ring
that fills 0→1**, so *how close* is a shape rather than a number in a line of
text you have to go and read. From `MUSTER_SHOWS` (0.5) a **dotted line** runs
from the holding to what it is coming *for*, brightening as it fills — this
was the actually-missing part, because menace said *how much* and never *at
what*. When the hero holds the target the line **stops at their marker**:
"they were stopped, and by what", drawn.

⚠️ **THE INK IS `foe`, NOT A FOURTH RED.** `docs/RAIDS.md` warned that a new
red must be measured against every counted ink *and* against `foe` under
colour blindness first. `foe` already means "held against you" and is already
measured in `test/palette.test.ts`; the line is told apart by being **dotted**
and by moving, not by hue. A fourth red buys nothing and costs a palette check.

**Step 4 — the ambush.** A raid whose target sits at either end of the road
the hero is walking **catches them in the open**: they take `AMBUSH_BITE` ×1.5
of the bite with no guard and no aim, the holding is *not* bled, and the raid
lands anyway. This is what makes keeping the hero home a real sacrifice rather
than the obvious default. It **cannot kill on its own** (floors at 1) — a walk
that ends the run with no fight shown and no decision made is not a defeat
anyone can learn from. `ambush` marks the board for `AMBUSH_TELL` 12s, because
an ambush that only moved a number would be the very invisibility this item
exists to end.

### ⚠️ TWO CHECKS THAT PASSED WITH THE FEATURE DELETED

Both were caught by sabotage, not by writing them:

1. **`inked('foe')` could not see the threat line at all.** Menace *reveals*
   the holding, so counting red across the whole board measured **the fog
   lifting** (~110px of it), and the force layout moves every dot between runs
   (±50px). The check passed with `musterShapes()` deleted entirely. It now
   samples the **straight run between the two dots**, ends skipped so the dots
   cannot count: **45/51 at 90%, 0/51 at 2%**, and deleting the drawing gives
   0/51.
2. **"An ambush cannot kill" passed with the floor removed** — across a long
   tick the hero *heals* more than the ambush takes, so `hp` never approached
   the floor. It now uses a 0.1s tick on a full muster, where healing is
   nothing and the floor is the only thing holding them up.

### Still open

**The fight ladder is still tuned to an always-available hero.** Travel time
plus ambush risk is a real nerf to every rung, and `chad-liquidity` should
re-run the ladder rather than anyone trusting it.


## ⚠️ THE HERO MARKER, WRONG THREE TIMES — 2026-08-10/11

Worth recording because each fix produced the next bug, and the third one
undid all the invention.

1. **Drawn at the site's own centre** → the graph painted over it. 0px of hero
   ink, caught by the probe.
2. **Drawn as a disc beside it** → `you` (#d63b26) and `foe` (#8f2f22) are
   both red, and it was *larger* than a site dot, so it read as a goblin
   holding camped inside your own country. Reported from live play: *"there's
   a big red circle near the camp… that's a bug."*
3. **Drawn as a diamond, still as decor** → decor paints at the zoom factor
   `k`. Zoom in and it inflated into a red lozenge bigger than the camp, adrift
   from the dot it belonged to. Reported again: *"now there's a red diamond…"*

**The board already had the answer.** `Dot.you` renders a screen-space
you-are-here teardrop — added when the owner asked for *"an icon for our
character"* — and this screen had it hard-coded to `false`. Setting it on the
hero's site gets the right mark for free, at the right size, unable to drift
because it *is* the dot. Mid-march the same teardrop is handed to the board as
a loose `mark` at the interpolated point.

**The lesson is `k`.** Decor scales with the map because scenery and the
barrier belong to the country. A marker points *at* the country and must not.
Anything screen-fixed goes in the dot/mark pass, painted at scale 1 — `disc`
already worked this way, which is why the dots never had this bug.
