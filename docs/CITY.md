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
