# NEXT — the queue

## ★★★ EVERYTHING BELOW THIS LINE IS SUPERSEDED, 2026-08-02

The game is **King's Roads**. `docs/KINGS_ROADS.md` is the design and it is the
owner's, transcribed. `docs/FRONTIER.md`, `docs/PLAN.md` and `docs/DIRECTIONS.md`
are in `docs/attic/`.

**The game loop was reviewed item by item and scrapped**: settling, working, the
skill, the doors, the keys, the fights, the max-flow income, the nameless
resource, and the 37 machine-written places. What stands is the board, the
terrain bake, the four tabs, the layout solver, the palette, the save layer, the
probe, and the word gate.

## ✅ DONE 2026-08-02 — the scrapped loop is deleted and the crossing plays

`flow.ts`, `foes.ts`, `places.ts` and `notions.ts` are gone, with the six test
files that covered them. `stops.ts` and a rewritten `engine.ts` replace them:
mana, roads, a crossing. The word gate is green because the strings went with
the code. `npm run play` builds a road end to end in a browser and the refusal
"no mana reaches here" reaches the screen with 9999 mana in hand.

## ✅ DONE 2026-08-02 — the chapter is drawn where it is written

`layout.ts` no longer force-solves the chapter. The authored positions cleared
every existing guard untouched (closest pair 41.1 units against a limit of 24),
so `stops.ts` needed no adjustment. Two new guards, both proven red by putting
the solver back: the drawn position must EQUAL the authored one, and the finish
must be the rightmost stop. The screenshot now reads start-left, finish-right,
five ways between, with the river running along the water route `GOING` charges
3.1 for.

## ★★★ THE MAP, 2026-08-02 — the owner's direction, in their words

> *"i feel like i want to spend a lot of attention on how our map looks, its
> been great so far"*

Four asks arrived together. They are **three items plus a mechanic**, listed here
so none is lost, in the order the owner gave them. **A, C and D are how the map
LOOKS. B is a game mechanic** and does not belong in a map session.

### A — the screen is mostly not map

> *"the canvas on mobile can take more space vertically while the text could be
> at the very bottom overlaying it in case needed but like always snipped to
> bottom of the screen"*

The board gets ~655px of an 844px viewport and the panel takes the rest, mostly
as empty space — see any screenshot in the repo: below the deed button there is
a third of a phone doing nothing. The board should take the height; the panel
should be **pinned to the bottom of the screen and overlay the board**, appearing
when there is something to say.

⚠️ **This reverses an old decision on purpose.** The panel is in flow, not
absolute, because the owner objected to sheets appearing over things — and
`scripts/play-tabs.mjs` MEASURES that with a `position: fixed|absolute` check
scoped outside `.map`. That check must be rewritten to the new rule, not deleted:
the panel may overlay the board, pinned to the bottom, and nothing may overlay
the panel.

### B — hidden stops on a road, which block it ⟨a mechanic, not a look⟩

> *"the graph edges might have 2 to 3 stops while building it for the cyoa
> events. they should not be visible but block progress until resolved"*

A road under construction has 2–3 stops along it that are **not drawn**. Building
reaches one, stops, and puts a choose-your-own-adventure event in the way; the
road does not finish until it is resolved. This is where the 2d10 rolls live —
`docs/KINGS_ROADS.md`: *"rolls are for choose your own adventure stuff"*.

★ It is also the answer to *"what is a stop made of"* arriving from the side: a
stop on a ROAD is made of an event. Whether that settles open question 1 for
stops on the MAP too is the owner's call.

### ✅ C — DONE 2026-08-02 — terrain: isolines, and regions with a shape

> *"could you implement terrain height isolines… also please do some lines like
> an oval with a forest inside or maybe some steppe or bog, add some geometry to
> highlight the game world"*

A height field, marching-squares contours at fixed intervals, and **closed
outlines around regions** — this oval is forest, that one is bog, that one steppe.
Baked once into the offscreen bitmap in world coordinates, blitted with one
`drawImage`, so it costs nothing per frame. `terrain.ts` already works this way.

⚠️ Every new ink must clear `test/ink.test.ts`'s distance from the counted ones,
and the probe counts pixels — a new colour near a counted one silently corrupts
three existing checks. No `shadowBlur`.

★ And height is not decoration: `GOING` prices a road by the ground it crosses,
so **the contours are a picture of the price**.

### ★ D — NEXT — roads that bend

> *"it's just lots of straight roads for now… let's stop making our roads
> straight, let them curve and bend around terrain and objects… maybe i want it
> to look a bit like a labyrinth"*

`Board.svelte` already has `trace()`, which draws Catmull-Rom through points and
is used for the river — *"rivers are not straight"*. Roads take the same path,
with control points derived from the terrain between the two stops.

⚠️ **The fill animation runs along the road.** It currently interpolates
`a + (b−a)×fill`, which is a straight line by construction; a bent road needs the
fill to follow the curve or the growing road will visibly leave its own bed.

## ✅ DONE 2026-08-02 — a road is a pipe

The owner chose "full pipes: capacity and pressure" over my recommendation. A
road has a gauge; income is max flow from the start to where you stand; `BORE`
runs opposite to `GOING` so cheap ground is narrow ground. Widening is the
second verb. The board draws gauge as width and load as an underlay — without
that this is the max-flow economy that was scrapped, wearing a better name.

**Saves reset**: SAVE_VERSION 5, `built: string[]` became `gauge: Record<string, number>`.

## ★★★ PIPES AND ROADS ARE TWO THINGS — 2026-08-02

> *"well like we also do roads or paths when needed, but we lay pipes"*

**Done:** the thing you lay is a PIPE, in every string the player reads, and
`scripts/check-words.mjs` now fails the build on "road" standing in for it —
while still passing "the king's road", which is real, and the game's own title.

**⚠️ OPEN, AND THE OWNER'S TO ANSWER: what makes a road NEEDED?** The sentence
says roads and paths get built "when needed" and nothing in the game currently
needs one. Two readings, and they are different games:

  1. **A road is what lets you WALK.** Pipe carries mana; road carries you. Bad
     ground makes walking slow or impossible until a path is cut, so some stops
     are reachable by mana long before you can stand at them. This adds a second
     network and a real reason to spend on something that earns nothing.

  2. **A road is what some ground DEMANDS before a pipe can cross it.** A
     causeway over bog, a bridge over water — an extra cost on hard terrain
     rather than a network of its own.

Reading 2 is nearly free and reading 1 is a second economy. Do not guess.

### ★ THE CARTOGRAPHY PASS — asked for, not yet started

> *"where are we with reusing maps code for us to render stuff like best
> practices, then slap some fantasy and our own stuff on top"*

**Where we are: nowhere, and it was a choice.** This was offered as an option on
2026-08-02 and the owner picked full pipes instead, so it has never been started.

⚠️ **LICENSING, ESTABLISHED — do not re-derive it.** Organic Maps (the living
fork of maps.me) is Apache-2.0 but requires derivative works to carry a visible,
clickable link to organicmaps.app; its renderer is C++/OpenGL and nothing in it
lifts into a canvas. **`openstreetmap-carto` is CC0, cartographic design
included, with no attribution owed** — that is the one to take from.

What is worth taking is CONVENTION, not code:

- **Casing** — a road is a dark outline with a lighter core drawn over it. It is
  the single biggest reason real map lines read as lines and ours read as
  strokes, and it is about six lines in `Board.svelte`.
- **Draw order as named layers** — landuse, water, contours, paths, roads,
  labels. Ours is an accident of array order.
- **Label collision** — the filed overlap bug (`Stop 15`/`Stop 16`) is this. Real
  renderers place labels last and drop any that would collide.
- **Dash vocabulary** — a footpath, a track and a road are told apart by dash
  pattern, not colour.

## ✅ DONE 2026-08-03 — map round two, all four

E: the fill grows from the end you laid it from (`building.from`, SAVE_VERSION 6).
F: a finished lay carries you over; you are a red map pin.
Cartography: built pipes are cased; labels drop losers by priority; roads BEND,
and the bend takes the lower ground, with the fill following by length.
G: bog is a ground (dear AND narrow); the sea runs down the west edge with a
beach line. Sea/beach are decor and honestly so — nothing prices them yet.

## ★★★ THE EXPEDITION PLAN — 2026-08-03, the owner's design, agreed in chips

The owner: *"making a leg from one stop to another Must be a challenge. And it
should be slow… you need to prepare first… multiple events while building…
based on how you are prepared, plus based on your stats, you either succeed or
fail. When you fail, you go back completely or a little, lose resources… we
need some other resource other than mana… maybe mana should be tapable — tap,
tap, tap — this is your idle element… pipes are magical, no brass — but you
need provisions… wagon or cart or on foot depending on terrain… slow the game
down way more."*

Chosen: **full package, in this order, one session each.**

1. **✦ THE HEIGHT GRID** *(shipped 2026-08-03)* — topography becomes the MODEL,
   not a by-product of stop grounds. A coarse sampled grid; contours, road
   bends, scenery and LEG STEEPNESS all read it; every deed says what its leg
   climbs.
2. **✦ THE EXPEDITION LOOP** *(shipped 2026-08-03)* — PREPARE first: a kit for
   the terrain (cart / mule / packs, ±1 to every roll on the leg) and
   PROVISIONS (Ironsworn Supply, 0–10, start 6). Steeper and dearer legs meet
   more hidden stops (1–3, by cost and climb). A weak hit eats a provision; a
   miss eats one AND knocks the work back a quarter; a miss at Provisions 0
   FAILS the leg — crew home, mana sunk, momentum −2. Finishing fresh ground
   restocks +1. Events stopped being flavour: they are how a leg is won or
   lost. Widening meets no hidden stops, so it skips PREPARE.
3. **✦ TAP-MANA** *(shipped 2026-08-03)* — trickle 0.34→0.12 a second; the
   purse is a button, each press draws 0.4 through the same remainder as the
   tick. The early game is played with the thumb.
4. **✦ SCAVENGE** *(shipped 2026-08-04)* — 18s at your stop, wits or shadow
   chosen going in, dice at the end: strong +2 (+3 twist), weak +1 and
   momentum falls, miss nothing and the crew comes home rattled. Exclusive
   with laying pipe both ways; walking off abandons it.

**THE EXPEDITION PLAN IS COMPLETE.** All four steps shipped. The queue below
this line is the owner's to refill — fog of war is first in `BACKLOG.md`.

⚠️ This is the THIRD economy. The difference, recorded so the pattern is
visible: the first two were invented and reviewed on paper; this one is the
owner's own sketch, and its skeleton (Supply, progress tracks, ranks) is
borrowed whole from a system people already play for fun, under a licence we
already carry.

## ★★★ superseded — THE MAP, ROUND TWO — 2026-08-02

Five more, in the owner's words. **E and F are corrections to shipped behaviour**
— one is a bug they have now reported twice. **G and H are the look.**

### E — the road fills from the wrong end ⟨a bug, reported twice⟩

> *"fix a bug where the line being made solid starts from the wrong side"*

Already in `BACKLOG.md` from 2026-08-01, cause known: `Board.svelte` draws the
fill as `[a, a + (b−a)×fill]`, and `a` is whichever endpoint the VIEW emitted
first — on the chapter that is always the lower stop id (`world.ts` filters
`to > s.id`), never the end you are standing on. The engine already knows:
`g.at` is one end of `g.building.key`.

### F — you arrive where you built, and you have a marker

> *"i also want an icon for our character when they move.. and like obviously
> when we build a road somewhere we arrive there too"*

Two things. **Arriving is engine work**: `build` currently leaves you where you
stood and the road has to be walked afterwards as a separate tap. **The marker is
the board**: `you` is a slightly bigger dot with a halo, which is not an icon and
does not read as a person.

### G — the natural features

> *"like i want typical natural features like valleys and hills and bogs and the
> sea somewhere and beaches and so on and rivers"*

`relief.ts` has the height field already and the contours come off it. Valleys
and hills are that field named. **Sea, beach and bog are new grounds**, and
`GOING`/`HEIGHT` both need them — a beach is a shoreline BAND rather than a stop,
which is the first feature here that is not centred on a stop.

### H — ★ THE HIKING-MAP LOOK, and the owner asked to see it tried

> *"maybe we should move from dark theme design to full blown hiking all trails
> maps.me look… can you try it"*

Light paper, brown contours, green wooded areas, blue water, a legible trail
network. Everything in `ink.ts` moves.

⚠️ **THIS TOUCHES EVERY CHECK THAT COUNTS PIXELS.** `test/ink.test.ts` holds the
distances between counted inks; `scripts/play-tabs.mjs` counts nine of them and
now also counts contour and region outline. A palette flip that does not move
those together leaves the probe measuring nothing — and the contour-ink mistake
of 2026-08-02 proved that failure is silent, not loud. The wider rule stands: a
new ink must clear every ink the board DRAWS.

---

### THEN — answer open question 1

**What is a stop made of?** It is the first of the five open questions in
`docs/KINGS_ROADS.md` and it is the owner's to answer, not an agent's. Every
stop currently says `Stop 14` and reports its ground, because the 37
machine-written places were scrapped for exactly the reason that an assistant
answered this question once already.

Nothing else in the game can be authored until it is settled: what a stop offers,
what threatens it, what a caravan is doing there, and what the 2d10 rolls are
rolled against all hang off it.

**Everything below is engine work that does NOT need the answer**, if the owner
would rather it waited:

- **Labels overlap on the Chapter tab** — `Stop 15`/`Stop 16` and `Stop 21`
  overprint at 390px. The dots clear the 24-unit rule; their NAMES do not, and
  nothing measures that. See `docs/BACKLOG.md`.
- **The build deed offers to start what it is already building** — reads
  "Lay the road to Stop 2 / already building one".
- **A chapter that is crossed does nothing.** `crossed(g)` is true, the header
  says `crossed`, and there is no second chapter to go to. "Region through
  region" is the owner's word for the shape of the game and there is currently
  one region.

### The five open questions, which are NOT for an agent to answer

They are listed at the foot of `docs/KINGS_ROADS.md`. Ask the owner.

---

**This file is the only thing that decides what gets worked on.**

Three items, in order. Work the top one; when it ships, delete it and promote
the next. Everything else is in `BACKLOG.md` and is not in play.

**WIP = 1, PER SESSION.** One session, one item, one branch. A defect found
mid-item goes to the bottom of the backlog as one line, *not* into this session
— unless it blocks the item. **Only the session that ships an item edits this
file.**

**Definition of done is written BEFORE the work starts.**

- **Player-facing items:** the check passes, **`npm run play` was run and the
  screenshot looked at**, evidence pasted into the reply — not "it works" — and
  the Actions run confirmed green. *"I pushed" is not "it shipped."*
- **Tooling/data items:** the check passes and the **numbers it produced are
  pasted into the reply**, including what was dropped or bounded.

---

> **Queue replaced 2026-07-31.** The slice and its eleven systems are retired
> (`src/slice/` stays on disk for its authored prose only). The queue is now
> **the build order in `docs/TABS.md`**, which answers to `docs/BRIEF.md`'s
> north star: the game is a graph.
>
> **THE BUILD ORDER IS COMPLETE, 2026-07-31.** All six steps: the tab shell and
> the one graph model (`src/game/world.ts`), selection and actions in a fixed
> panel, forging (two taps, a dotted line, the fill), Here as the room you stand
> in with a node for what you are doing, Self as you plus four true numbers, and
> Thoughts as seven notions that fill in from what you do
> (`src/game/notions.ts`). `scripts/play-tabs.mjs` is the probe.
>
> **What exists now is a complete small game**: rest, make a way, walk it, and
> watch four graphs describe it. The next items ADD to that rather than finish
> it — so the first question for the owner is whether it is fun before anything
> else goes in.
>
> **★ SKILLS ARE BLOCKED, STRUCTURALLY.** `costOf` and `forgeSecs` both key off
> `solid.length`, so a skill trained by making ways cancels itself out; and a
> skill is a choice about where to spend time, of which there is one. See
> `docs/TABS.md`. **Whoever adds a second activity adds the first skill in the
> same item** — otherwise they do not interlock, which is exactly how eleven
> systems each passed their own tests and added up to nothing.
>
> **Saves are breakable.** Say so in the commit when a change resets them.

> **★ THE OWNER PLAYED IT TWICE ON 2026-08-01.** Everything below comes from
> those two sessions, in their order. Quotes are theirs. The second play-test
> came after the canvas board, the header fix and the layout fix shipped.
>
> **The verdict on the board, unprompted:** *"I like the way it looks. I like it
> much more… I can see the connection building. It is very nice. I like it a lot
> a lot more than before. And when zooming in, there are no artifacts, no
> nothing. It looks absolutely great."* and *"overall, this is absolutely
> fantastic. I can see a game here."*
>
> **And the honest other half:** *"there is not much to do."*

## ~~1. The graph: bring back the canvas and make it move~~ ✅ 2026-08-01

> *"The graph, as far as I understand, it is now just statically rendered, and I
> don't like that, to be honest. The connections seem slightly misaligned — like
> it is aligned in principle, but a few pixels here and there are wrong. I feel
> like we still need to use some existing library in order to render that. I
> like nodes that jingle like in Obsidian, but maybe if we can stop them from
> jingling it would be best. It looks bad. It is static. I can zoom in, but it
> looks ugly."* — and again at the end: *"I wanna see a canvas there."*

`d3-force` is **already a dependency and completely unused** — `layout.ts` is a
hand-rolled relaxation. `CLAUDE.md`'s own stack says canvas 2D for the graph's
lines, DOM + CSS for anything with text or a tap target, d3-force for layout.
The current build follows none of that.

**Done when:** the graph is drawn on a canvas, laid out by d3-force, settles
instead of jiggling, can be dragged and zoomed without going blurry, and
`npm run play` screenshots it.

## ~~2. The text at the top~~ ✅ 2026-08-01

> *"The text at the top of the screen is not good… there is a text at the top
> again when I clicked again on the same button, and I'm not sure how to get rid
> of that text. The text at the top is a problem for sure."*

The `said` line in the header. It appears, it is not dismissable, and it is not
clear what it belongs to. Said three separate times.

## ~~3. Two bugs from the same session~~ ✅ 2026-08-01

Both were **one layout bug**. `settle` seeded its ring from index and count
alone, so every view with the same node count and the same star topology landed
on identical coordinates — **The Cut and The Tally, the exact pair walked**,
drew the same picture. "Here didn't update" was Here updating invisibly, and the
dot tapped afterwards was a neighbour, so *"somewhere you have not been"* was
telling the truth about the wrong dot. Places now start at their real position
in the valley, and rings are jittered from the view's seed.

## ~~4. Self should not be a stat sheet~~ ✅ 2026-08-01

Owner's correction: *"self is a stat sheet and inventory, but not game
statistics."* So it IS a character sheet — the first version just put the
world's numbers on it. Now: what you carry (paces, `kind: item`, `rel: carries`)
and what you are (your gathering rate, what a way costs you in time and paces).
Ways-made, places-found and distance-from-start are deleted.

**Items are the open end.** `src/slice/content.ts` holds NINE hand-authored keys
— "strip of lead", "quiet key", "iron gate pin" — each with a door it opens, and
`docs/BRIEF.md` ask 10 wants them. Nothing drops one, so nothing is drawn for
them. **Drops and the doors they open are a real item, unqueued** — it needs the
owner's call on how a key is found.

---

# ★ THE OPEN QUEUE

⚠️ **Numbered once, in one place.** This file had two 2s, two 3s, two 5s and two
6s, and listed two shipped items as open — in the file whose whole job is to
decide what gets worked on. Renumbered 2026-08-01.

## ~~★★ 0. SETTLE, WORK, ONE SKILL — AND INCOME IS FLOW~~ ✅ 2026-08-01

**Shipped.** `npm run guard` green (574 tests, 0 type errors, purity holds),
`npm run play` exit 0, screenshot looked at. Saves reset — `part` changed
meaning from banked seconds to banked fractional paces, and a v2 save carries no
`settled`.

**What the probe printed, on the real build:**

```
THE CHOICE
  standing: The Weir
  offers  : Sound the depth 30s a turn · +45 wayfaring · no paces while you do
          | Settle The Weir 37 paces · makes 0.10 a second, as much of it as
            the ways can carry to you
  header  : "working — no paces"
  paces   : 57 → 57 across 52s of working
  before  : Wayfaring 1 · A way takes 13s
  after   : Wayfaring 2 · A way takes 12s
FLOW ON THE BOARD
  drawn   : 281px of flow ink on made routes
```

### ★ What actually divides the flow model from a count model, and it is not what I assumed

Connectivity never binds. You can only settle where you stand and only walk made
routes, so **every settled place is always in your own connected component** —
`reachedFrom` can never exclude one in real play. The whole difference is
**capacity**: `EDGE_CAP` 0.250 against `YIELD` 0.100 means a road fills up once
three settled places are behind it, and then a second road round the bottleneck
is worth more than a fourth settlement. That is the guard in
`test/game.test.ts` — five settled in a line delivers 0.350 where a count model
says 0.500, and one loop-closer recovers the whole 0.150.

**This is why the seven redundant loop-closers stop being dead weight.**

### ★ And the second verb is thinner than `docs/PLAN.md` claimed

There are **12** authored work blocks, not 34 — the earlier number counted skill
CHECKS on choices as jobs. Three of them are wayfaring, so **three places in
thirty-seven offer work**. Kept honest rather than papered over: XP goes to the
skill the content names, and the other four skills' jobs stay off until the
levers they turn exist. Where you stand decides whether you have a choice at
all. **If that reads as too thin in play, the fix is writing jobs, not code.**

### Two things caught by sabotaging, both worth recording

- **My first sabotage of the paces-while-working check was itself vacuous.**
  It added `Math.floor(a.secs × rate)` per tick — 0.2s × 0.43 floors to zero, so
  it paid nothing and the check stayed green for the wrong reason. Rule 4 caught
  a bad sabotage, which is the failure mode below the one it is aimed at.
- **The check then failed on the clean build**, reporting 56 → 57 while working.
  That was the probe, not the game: it read the purse three tab-clicks before
  the job started and counted a pace earned while still resting. Now read after
  the job begins, which is both correct and tighter.

**Proven red:** rate as a count model (2 tests), the settle gate removed (1),
wayfaring not cutting forge time (2), `load()` refusing a MISSING new field (3),
`load()` accepting a present-and-wrong one (1), the flow underlay not drawn
(probe), the doing node quoting the old constant (probe, 2 misses), and paces
paid while working (probe).

<details><summary>The item as it was written before the work started</summary>

**The top item. Chosen by the owner, 2026-08-01.** It is `docs/PLAN.md` build
order step 1 with one change forced by `docs/DIRECTIONS.md`: the income number
is computed from the **adjacency**, not from a count.

### Why the flow part is not optional

Verified, and it is the finding two independent reviews reached:

> Shuffle which of the 37 places connects to which, keep the counts identical,
> and **not one number in `engine.ts` changes.**

`costOf` and `forgeSecs` key off `g.solid.length`. `PLAN.md`'s first draft of
`rate()` keyed off `settled.length`, and its `routeCost` off a per-region count
— one count replaced by four counts. Nothing in the economy reads the graph. So
the north star is satisfied by the renderer and violated by the engine, and no
amount of content fixes that.

### The four pieces, and they interlock or none of them work

1. **Settle a place.** `settled: number[]`, one action, a cost that climbs.
2. **Income is max-flow** from the settled set to `g.at`, over `solid` edges
   with a capacity each. Not a sum. A settled place behind a thin edge pays
   almost nothing; a loop-closer pays because it routes around a bottleneck.
3. **Work.** Turn on the 34 authored `work` blocks that `places.ts:48` strips.
   Working pays XP; standing still pays paces. **One clock, two things it can
   pay into** — that opportunity cost is the whole reason a skill can exist.
4. **One skill**, from the five the content already names. Start with
   **wayfaring** (11 blocks, the most authored) and let it cut forge seconds.

⚠️ **Do not ship 1, 3 and 4 without 2.** That is the version that passes its own
tests and leaves the graph decorative — the eleven-systems failure with a nicer
map. And do not ship 2 alone: an income model with one verb has nothing to
choose between.

### Done when

- `npm run play` **screenshots a choice between resting and working**, and the
  screenshot is looked at, not asserted.
- The skill levels from working, and the level visibly changes a number.
- **A settled place's contribution changes when the topology changes** — the
  probe proves it by making a route and reading the rate move by more than the
  count model predicts. If a count model would give the same answer, the check
  is vacuous and the item is not done.
- Edge width shows flow on the board, so the bottleneck is visible rather than
  spreadsheet pain.
- **Rule 4: break each of the above on purpose and watch it go red.**
- Saves reset. Say so in the commit.

### Deliberately NOT in this item

Thresholds, drops, keys, encounters, prestige, the other four skills. They are
`docs/PLAN.md` steps 2–5 and each is cheap once this exists.

</details>

**Next in `docs/PLAN.md`'s order: step 2, thresholds** — turn on the 13 authored
doors now that a level exists to open them with. The small items below (5, 7,
12, 13, 16, 19) do not block it.

## ★ FROM THE SECOND PLAY-TEST, 2026-08-01

### ~~5. Vocabulary: node and edge, not dot and connection~~ ✅ 2026-08-01

> *"It says tap a dot. Prefer them to be called a node."*
> *"'Tap a neighbouring dot to make a way to it' — I would prefer it to be
> called an edge, to make a way to it."*

Every player-facing string. `scripts/check-vocabulary.mjs` exists for exactly
this class of rule.

### 6. Why is there a Connect button at all?

> *"What is the point of being able to click Connect here if I can just connect
> the other node on the map?"*

The arming step may be redundant. Tapping a neighbour could simply make the way.

### 7. ★ The header must be sticky

> *"I feel like the menu should be sticky. So I scroll back and the number of
> paces goes to the top of the page, I cannot see it anymore. Need to fix that."*

⚠️ **Not a conflict with R2.2** — that rule is about two surfaces competing for
attention, and R2.3 (the tab bar is always reachable) actively wants pinning.

★ **BUT THE PROBE GOES VACUOUS BY DEFAULT.** `scripts/play-tabs.mjs:56-61` tests
only `position === 'fixed' || 'absolute'`. **`sticky` is in neither list, so the
check passes without being touched** — the exact failure mode this repo keeps
producing. The real defect a sticky header can cause is that the board scrolls
under it and **dots beneath it become untappable**. So the check must become:
(i) at scroll 0 the column is still strictly stacked; (ii) after scrolling to
the bottom, no `.map .node` centre lies above `header.bottom`; (iii) the header
stays opaque and ≤110px.

### 8. ★ The Journey should be DISCOVERED, not shown

> *"Maybe I would like not to see all the nodes already kind of grey. So it is
> the entire map. I would like to discover that, and I wanna see it from the
> beginning."*

**This REVERSES a standing decision.** `world.ts` says: *"Every place is drawn
from the first frame, because a map with holes in it is not a map."* That is now
void — the owner wants the map to grow.

★ **THE BINDING CONSTRAINT, from `the-graph`:** `here()` draws every unreached
neighbour. If the Journey draws only `seen`, Here is drawing nodes that are not
in the world and R1.3 (a tab is a FILTER over one graph) breaks — the two tabs
become two models. **So discovery must be `seen ∪ neighbours(seen)`**, not
`seen`.

And three things that will break quietly:
- `Board.svelte:87-96` re-`fit()`s whenever the node set changes, so **every
  discovery would reset the player's pan and zoom and wipe dragged nodes** —
  silently, at exactly the wrong moment.
- `JOURNEY.box` is the box of all 37 (`layout.ts:126-131`), so an early map
  frames the whole empty valley: two dots in a corner.
- **Keep the full 37-node solve and filter the VIEW.** Re-solving per discovered
  subset voids `test/layout.test.ts:18-30` and makes dots jump on arrival.

**Only the "drawn but grey" half of R5.3 is void.** "Reached but unnamed" still
stands — see item 13.

### 9. ★ Journey and Here overlap too much — split their jobs

> *"I don't understand why we have both Journey and Here tabs now. They repeat
> each other's functionality too much. So I want Journey to be a global map,
> Here is a local map. On the Here tab we're gonna have enemy encounters and so
> on, and resources to be mined and activities to do. I don't want to be able to
> go back to the other location from that menu."*

- **Journey** = the global map. Travel lives here.
- **Here** = the room. Encounters, resources, activities. **No travel.**

⚠️ **Here empties out until there is content.** Remove `go` and Here is your
place, the `doing` node, and neighbour dots that do nothing. **Keep `forge` on
Here** — making a way is an activity, not travel. `deedsFor` (`world.ts:265`) is
tab-blind and `Game.svelte:65` calls it on every tab; the cheapest correct split
is to pass the tab in and drop `kind: 'go'` on Here.

### ~~10. Repositioning must be OFF on the Journey~~ ✅ 2026-08-01

> *"I noticed that I am able to reposition the graph nodes on the Journey tab. I
> don't think it makes sense because this is kind of a map, right? So the
> repositioning must be off on the Journey map. On Self and Thoughts it's like
> whatever."*

Here: undecided, they said "I'm not sure".

⚠️ Do **not** null out `grabbed` (`Board.svelte:234`) — `onUp` uses it to detect
a tap, so that would kill tapping on the Journey. Guard only the move branch.
And the probe must assert **both** relative motion < 5px and absolute motion >
20px, or a frozen board would pass — the mirror of the vacuity already caught
once in that file.

`docs/TABS.md` R5.1 is **already stale**: it forbids pan and zoom, both of which
shipped deliberately. Rewrite to *"the layout is a constant; the camera is not;
nodes do not move."*

### 11. Edge labels

> *"On this Self menu it would make sense to have labels for edges or something
> like that. Let's experiment with that."*
> *(Thoughts)* *"Edges would be nice here because I don't understand the
> connections between those."*

The model already carries a `rel` on every edge and nothing draws it. Three
traps, from `the-graph`: labels must be DOM with `pointer-events: none` or
`nodeUnder`'s hit-testing breaks; `rel` ids (`carries`, `has`, `means`) are
internal and need a rel→player-word map or item 5 is broken the day this lands;
and **label ink must sit outside tolerance 6 of the dot colours** or `inked()`
starts counting text as dots. Journey has 43 edges on a 390px phone — **Self and
Thoughts only**, which is all that was asked for.

### 12. Two labels that read wrong

> *"'You're already making one' is a weird label."*
> *"'Making a way. It carries on while this is shut.' This is also a weird
> label."*

### 13. "Somewhere you have not been" is still confusing

> *"So now 'somewhere you have not been' again, when I click on the node that I
> have already discovered — or, like, I discover first and then I go there? Is
> it something like this? It is not very intuitive."*

⚠️ **NOT the layout bug this time** — that is fixed. ★ **THE CAUSE IS NOW KNOWN
AND IT IS A REAL DEFECT**, found by `the-graph` and verified:

```
   panel h2   →  "Somewhere you have not been"      ← name withheld
   deed below →  "Make the way to The Weir"         ← name given away
```

`nameOf` (`places.ts:53`) returns the real name unconditionally; `waysFrom`
(`engine.ts:229-241`) puts it in `Way.name`; `deedsFor` (`world.ts:276,283`)
renders it. So the panel withholds the name in its title and states it in the
button directly underneath. The player cannot tell what "discovered" means
because the screen is telling them two different things at once.

`test/here.test.ts:70-78` guards the VIEW and never the DEED — a one-sided
guard, which is why this survived. **Discovery (8) does not license naming a
place before you reach it; this is a bug today, not a feature to build on.**

### 14. ★ There is not much to do — AND THE ARITHMETIC AGREES

> *"Now we need to build some economy and some content, some stats for the
> character, some inventory slots, some items, something else."*
> *"I don't understand the currency or the economy that we have at the moment."*

⚠️ **MEASURED, 2026-08-01, not guessed:**

| | |
|---|---|
| income | **flat forever** — 1 pace / 3s, `SECS_PER_PACE` never changes |
| price | `6 × 1.2^n` in edges made **anywhere** |
| all 43 edges | **76,160 paces = 63.5 hours** of pure waiting |
| the last edge alone | 12,699 paces = **10.6 hours** (offline cap is 12h) |
| the last edge's build | 1,401 seconds ≈ 23 minutes |

Flat income against exponential price is not an incremental curve, it is a
queue, and time-to-next-purchase only ever gets worse.

**And there is no decision in it.** `costOf` keys off `g.solid.length`, a
GLOBAL count — so every unmade edge in the valley costs the same paces and the
same seconds. "Which frontier do I open" is what `engine.ts` calls the whole
game, and economically it is a coin flip; the order changes only which prose you
read.

> *"Now we need to build some economy and some content, some stats for the
> character, some inventory slots, some items, something else."*
> *"I don't understand the currency or the economy that we have at the moment."*

The biggest item and the least specified. **Not to be started without a plan the
owner has seen.** Items/keys explicitly deferred: *"I don't wanna go as far as
the key at the moment."*

### ~~15. Paces: the word and the reason~~ 🟡 HALF DONE 2026-08-01

> *"I don't understand why I'm generating the paces while I'm standing still…
> it is a bit strange that pace is the resource. I accumulate paces like a step.
> Why am I accumulating steps?"*

Two complaints, not one: the NAME is wrong for a thing you bank, and the game
never says why standing still pays.

**The name is fixed: it is STONE.** *"pace is absolutely stupid resource, why are
we still using it? i asked to remove it multiple times"* — and they were right,
it had been asked for and skipped through five straight items. `pace` was also
literally a rate word, so the header read `12 paces +0.33 a second`, which is
speed per second.

⚠️ **The second half is not fixed and is now bigger than a word.** The owner,
same session: *"i think we need to re-do entire economy again…"* That is an open
item, unspecified, and it is the top of the queue.

★ **AND IT IS ENFORCED NOW, NOT REMEMBERED.** `scripts/check-words.mjs` fails
the build if any player-facing string says dot, dots, pace or paces, or uses
"way" as the noun for the thing between two places. It is in `npm run guard`.
The reason it exists is that asking three times did not work.

### 16. Start over says nothing

> *"I'm pressing start over button. Nothing really happens. Doesn't give a
> feedback."*

It wipes and resets, with no confirmation and no acknowledgement.

### 17. A second thing to do — and the first skill with it

The unblocker for `docs/BRIEF.md` ask 2. One verb means no choice, so no skill
has anywhere to bite. Add a second activity — something you can do INSTEAD of
banking paces, at a place, on a timer — and add the one skill it trains in the
same item, gating something you can see from here (ask 4, thresholds).

**Not two items.** They interlock or neither works.

**Done when:** `npm run play` screenshots a choice between two activities, the
skill levels from one of them, and a threshold visibly shuts a door the level
opens.

### 18. Two dots, one fight

`docs/COMBAT.md`, on the **Here** tab — that is where the owner said encounters
land. An enemy dot beside yours; they poke each other on a timer; one goes out.
Radius is health, so losing is shrinking and out is out. **What an encounter is
mechanically is still undecided** (`docs/TABS.md`), so this item starts with the
owner, not with code.

Losing relights you one node back and keeps what was earned — that is the whole
answer to "failure is a plateau, never a loss screen", and it is the constraint
most likely to get fudged.

**Done when:** `npm run play` screenshots a fight and its outcome, a lost fight
leaves the game playable without a reload, and the shrinking dot is visible in
the screenshot rather than asserted.

### 19. ⚠️ EXPORT/IMPORT IS GONE, AND THAT IS A GUARDRAIL BREACH

`CLAUDE.md` says plainly: saves are breakable, but **"export/import keeps working
because that is how the owner moves a save between devices."**

`exportSave` and `importSave` still exist in `src/shell/game.ts` — wired to the
**retired** slice. The current game (`src/game/store.ts`, `src/ui/Game.svelte`)
has neither, and the header offers only Start over. So the one save guarantee
that was explicitly kept when the others were dropped is not honoured by the
build that ships.

Found by `the-redditor` on 2026-08-01, verified against the files. Cheap to fix.

---

# ★ THE FOUR-AGENT REVIEW, 2026-08-01 — AND WHAT IT CONVERGED ON

Run at the owner's request: `the-owner` (simulated), `chad-liquidity`
(economy), `the-redditor` (genre), `the-graph` (consistency). **Every number
below was re-verified against the code before being written down.**

## They independently proposed the same thing

| agent | proposal |
|---|---|
| the-redditor | *"make places produce. Each place has a yield; standing there sets your rate."* |
| chad-liquidity | *"settle a place. One field `settled: number[]`, one action, one derived `rate(g)`."* |
| the-owner (sim) | *"two doing-nodes side by side on Here… the second pays a second number."* |

Three angles, one answer: **the second activity is settling a place, and it
produces.** That is also the precondition a skill needs, so it unblocks item 17
without building it.

⚠️ **Where they disagree, and the call:** the owner-sim wanted the second
activity to pay a *different* currency. `chad-liquidity` is right that it must be
the SAME one — opportunity cost needs one currency with two sinks. Two currencies
with one sink each is two lists, not a choice.

## The measured case for it

| finding | verified |
|---|---|
| income is flat forever | `SECS_PER_PACE = 3`, never changes |
| cost is exponential | `6 × 1.2^n`, so time-per-purchase ×1.2 every purchase, forever |
| all 43 edges | 76,160 paces = **63.5 h** of waiting |
| **one 12h absence buys** | **33 of 43 routes — 34 of the 37 places** |
| **the 7 redundant loop-closers** | **54,929 paces = 72% of the total price for 16% of the edges** |
| price is non-local | `costOf` keys off GLOBAL `solid.length` — every frontier costs the same, so which one you open has zero economic content |

`engine.ts` claims *"where you park decides what you can reach"* and *"an absence
is a real gift and never the whole game."* **Both are false as shipped.** The
comments describe a better game than the code.

## The shape to build (NOT yet approved by the owner)

```
rate(g)      = 0.333 + 0.10 × settled.length     paces/s, hard ceiling 4.03 (37 places)
hearthCost(m)= round(30 × 1.22 ^ m)              payback = cost / 0.10 seconds — printable on the node
routeCost(e) = round(10 × TIER[region] × 1.18 ^ routesMadeInThatRegion)
TIER         = { valley: 1, works: 3.5, under: 8, stones: 14 }
forgeSecs(n) = min(90, 12 + 3n)                  kill the second exponent; it never changes a decision
offlineBank  = min(hours × rate, 4 × cheapest unbought frontier)
```

**One extra rule makes it a game rather than two lists: you may only forge from a
settled place.** Progress is then gated on income investment, "where you park"
becomes true, and pushing into a far region means settling a chain of bases.

Per-REGION pricing, not per-distance: the content is already partitioned that way
(valley 0–5, works 100–109, under 200–210, stones 300–309), a cheap direction
always exists, and the in-region exponent tops out at ~6× instead of ~400×.

**Content already on disk and unused:** `src/slice/regions/*.ts` carries 13
hand-authored `work` blocks with labels and durations. `places.ts:48` strips
them.

## The one they all flagged and nobody solved

37 places × ~50 words is the entire reward surface, consumable in an evening.
The current build "paces" it by charging 10.6 hours for the last edge, which is
not pacing. **Target the map opening over ~5 hours, and let the hearth ladder and
prestige carry the long tail.** Content volume, not curves.

---

## ~~20. A living map~~ ✅ 2026-08-01

Owner: *"can you come up with some typical fantasy objects, like lakes, towns,
villages, quarries, mines, forests, etc. and try to make our map alive
(cheaply)"* — then, when I answered the wrong question: *"i meant cheap
computationally."*

Shipped: a **river** meandering through the places whose own prose is about
water (The Cut, The Weir, the Headrace, the Wheelhouse, the Wheel Pit, the
Tailrace, and down to the Sump Fork and the Ledger Pool — the water was in the
content before it was on the map), and **ground** under every region: trees in
the valley, cut stone in the works, hatching under, tufts on the moor.

**The cheapness is the design, not an afterthought:**

| layer | drawn | cost per frame |
|---|---|---|
| the scatter (~530 marks) | once, into an offscreen bitmap in world coordinates | one `drawImage` |
| the river (8 control points) | live, so it stays crisp at any zoom | ~8 bezier segments |

No `shadowBlur` anywhere — the one genuinely expensive canvas call.

⚠️ **The palette is now a constrained resource.** The probe checks the board by
counting pixels of a known colour, so a scenery ink within tolerance of a dot or
edge ink would be silently counted as dots. `test/terrain.test.ts` holds every
ground ink >26 away from every ink the probe counts — and it caught a real
collision on its first run (`wood` was 25 from `unmade`).

**Still to come, and this is the point of it:** the ground should BE the price —
a road through woods costs more than one over open moor, a river needs a ford or
a bridge. That is item 14's economy, delivered by something you can see.

---

# ★ ARCHITECTURE REVIEW, 2026-08-01 — measured, at the owner's request

> *"review the app architecture in terms of scalability and performance, so that
> we'll be able to snap a bunch of features on top quickly and cheaply."*

## Performance: fine. Not the problem.

Chromium at **4× CPU throttle** (roughly a slow phone), 390×844, during a
sustained pan — the worst case, because it redraws every frame:

| | mean | worst |
|---|---|---|
| as shipped | 20.4 ms | 37.1 ms |
| canvas only (DOM nodes hidden) | 17.7 ms | 29.2 ms |
| DOM only (canvas hidden) | 16.5 ms | 22.3 ms |

The vsync floor is 16.7 ms, so **the real work is ~4 ms a frame at 4× throttle
— about 1 ms on this machine**, split roughly evenly between canvas and DOM.
Zero long tasks. Idle (the game ticking 5×/s, no input) sits at the floor.

There is headroom, the terrain bake is doing its job, and **nothing here needs
optimising.** What follows is about the COST OF THE NEXT FEATURE, not the frame.

## What will make features expensive

**1. The board draws from two fixed lists.** `Board.svelte` takes `dots` and
`lines` and `draw()` walks exactly those. Anything else on the map — a bridge, a
ford, a glyph beside a place, a region tint, an encounter pip — means editing
`draw()`. → Take a **list of shapes** instead: `{kind, points, ink, width}`.
Then a new drawable is an entry, not surgery.

**2. A node's appearance is an if-chain in two languages.** Five `d.kind === …`
branches in `dotStyle()` plus per-kind rules in CSS. Every new kind is an edit
in both. → **One data table keyed by kind**, read by both.

**3. A colour lives in three or four files.** `#4d6b80` is in `Board.svelte`,
`play-tabs.mjs` and `terrain.test.ts`; `#8ff0cf` adds `Game.svelte`. Changing
one is four edits, and **the probe can drift from the app without either
noticing** — the probe would keep counting a colour the app no longer draws, and
pass. → One palette module; the probe reads it off the running page; the test
keeps holding the distances.

**4. `Game.svelte` is doing five jobs** in 296 lines: the clock, saving,
selection, the arming gesture, and mapping the view to dots and lines. Every
feature lands here. → Lift the clock and the save loop into a runtime module and
leave the component with markup and selection.

**5. Every tab rebuilds from nothing five times a second.** `view` is `$derived`
on the whole `game`, so a tick that only changed `paces` rebuilds all 37 nodes
and 43 edges — **80 objects per tick** — and nine derived values downstream.
Invisible at this size and it is not what costs the 4 ms. But it is O(world) per
tick, and discovery plus encounters plus markers is exactly the direction that
makes it matter. → Key the world views off what actually changed
(`seen.length`, `solid.length`) rather than off `game`.

**6. Nothing would catch a performance regression.** The harness above exists
now; it should live in the probe with a budget, or the next heavy feature lands
silently.

## Recommendation

**1, 2 and 3 are one small session and they compound** — they are the three
things that turn "add a bridge" from an afternoon into ten minutes. 4 and 5 are
worth doing before encounters, not before the next visual. 6 is fifteen minutes.

None of this is urgent and none of it is a defect. It is the difference between
snapping the next six features on and hand-fitting each one.


## ~~21. Make features cheap to add~~ ✅ 2026-08-01

Items 1–3 and 6 of the review above, plus what doing them uncovered.

**One palette** (`src/game/ink.ts`). Every colour, once. The probe reads it off
the running page (`window.__INK`); `test/ink.test.ts` holds the distances.
Tolerances live beside the colours, because a blanket distance is the wrong rule
— a thin line needs a loose match to be found at all, two similar colours need a
tight one to be told apart.

**One look table.** `LOOK[kind]` replaces five `d.kind === …` branches and five
CSS rules — the same decision written twice, in two languages, with nothing
checking they agreed.

**One paint function** (`src/game/shapes.ts`). The board draws the graph plus a
list of `Shape`s. A bridge, a ford, a glyph, a region tint is now an entry, not
surgery on the draw loop. `baked` shapes cache themselves into a bitmap.

**A frame budget in the probe**, so a heavy feature cannot land quietly.

### ★ Four guards were silently broken, and writing the palette down found them

| what | was |
|---|---|
| `known` and `route` | **the same hex** — counting made roads also counted reached places |
| `you` and `fill` | **the same hex** — the "is the road filling?" check was counting the dot you stand on, which is always there. It would have passed with nothing filling |
| Thoughts' "lit" check | counted `route` ink, and only worked because of the first collision. Separating them dropped it to **2 pixels** |
| the fill check | measured the instant filling began, when the line has no length — **25px, one slow frame from zero** |

And one regression introduced and caught in the same hour: collapsing the look
table lost the lit/unlit distinction, so every notion on Thoughts drew the same
whether thought or not. The probe read **0px thought**.


## ~~22. Make the engine safe to add state to~~ ✅ 2026-08-01

> *"how can we make our code good enough for easily adding shit"*

Two properties, not opinions:

**A save from before a feature existed still loads.** `load()` merges over
`initial()`, so a field added tomorrow arrives at its default instead of
`undefined` — and `undefined` in the first sum that touches it turns a run to
NaN in silence. Now exercised through `load()` in `test/store.test.ts`.

**The engine cannot reach for the browser.** `scripts/check-core-purity.mjs` had
been guarding `src/core` — the RETIRED slice — while `src/game`, the engine the
game actually runs on, had nothing stopping it importing the UI or touching the
DOM. Everything that makes it testable in a terminal rested on a property
nothing checked. Now covered, with one narrow written-down exemption
(`store.ts` may stamp a save and talk to storage; it still may not touch
`document`).

`npm run guard` runs typecheck, purity and 569 tests in one command.

### What is still expensive, and the honest headline

A place is four fixed fields. Every feature worth adding — a pit, an encounter,
a drop, a resource — wants to hang off a place and there is nowhere to put it.
**That abstraction should be built WITH the first such feature, not before it**;
building it now with zero users is how this project got eleven systems.

And the headline: **the code is no longer the bottleneck. The decisions are.**
Every remaining item needs an answer from the owner about what the game IS, not
a refactor.

## ★★★ THE WAY — 2026-08-04, the owner's redesign, agreed in chips

> *"nothing we do is choose your own adventure… gamify the point A to point B
> journey… a separate view… you need to tap something… enemy encounters might
> happen on that same view… reuse one of the tabs."*

1. **✦ THE WAY VIEW** *(shipped 2026-08-04)* — while a crew is out, Here IS
   the leg: real path, own terrain frame, visible waypoints, halts as
   "Something ahead" markers, crew mark, road solidifying behind them.
2. **✦ TAP-TO-WORK** *(shipped 2026-08-04)* — the crew dawdle at 0.4× on
   their own; tapping the crew mark pushes 1.2s of work. Halts still stop
   everything. Setting off auto-switches to The Way.
3. **✦ FOES** *(shipped 2026-08-04)* — ~45% of halts fight back where the
   ground has a foe. Progress-track rounds: strong marks 2, weak 1 + cost,
   miss nothing + hurt; the kill clears the halt, +1 momentum. Met foes show
   red and named on the way.
4. **✦ RISK TRADEOFFS** *(shipped 2026-08-04)* — the suited kit costs 1
   provision to stock (refused on empty packs); scavenge split into wits-safe
   vs shadow-greedy. Event-choice risk profiles remain OPEN — the foes carry
   per-choice flavour but uniform costs, deliberately, so the owner can
   rewrite prose without touching numbers. Revisit if choices still feel flat.

**THE WAY IS COMPLETE — all four steps of the owner's redesign shipped in one
day.** What remains open for the owner: event prose passes (all ⟨draft⟩),
what crossing the chapter means, stat renames, and whether choice-level risk
profiles are wanted on happenings too.

## ★★★★ THE CITY ON THE GRAPH — docs/CITY.md is the design. Slice 2 IN.

> Owner, 2026-08-08: *"like incremental city builders and stuff"* — designed
> first at their ask, then built: counts on the 1.15^n curve, people as the
> multiplier and the ladder, paths as throughput with drawn chokes.

**Shipped since:** the hero slice — goblin-held ground (12/18/30), turn-based
liberation fights, Arms ×n from the town's own stores, territory = fights won.

**Shipped since:** slice 3 — the meadow farms, the wild feeds six, hunger is
priced on the header, STARVING halts all but the farms, and every
liberation frees two hungry captives.

**Shipped since:** THE LOOK (valley painted, carriers hauling, +1 pops)
and MESH ROUTING — logs travel to the nearest mill, planks travel home
over what is left, and a star ships 0 where a mesh ships full rate
(proven by test, same buildings both times).

**Shipped since:** POSTED HANDS — pin people to a works (− hands +), pins
win the pool, auto stays the default.

**Shipped since:** THE SECOND REGION — three grounds behind the knoll and
the scree, revealed by liberation; the hero toughens +3 health per ground
freed, and the deep bites are priced against that ladder.

**Shipped since:** THE PACING PASS — chad's thirteen constants whole:
CREW=4 multi-hand works, per-worker rates, 1.35 works curve, huts 10
planks housing 4, EAT halved (the food-artery wall), ladder smoothed to
+2 arms per fight, goblins REGROUP while unengaged. Plus the away line.

**THE DESIGN PHASE CLOSED 2026-08-08** — the arc is in CITY.md part 2:
runs end at the goblins' seat, finishing founds the next valley, the
veteran hero is the only keepsake. All four standing rulings APPROVED.

**The build queue, one per session, in order:**
1. ~~WHOLE-PEOPLE STAFFING~~ ✔ shipped: integer hands, held works,
   named pulls, auto-back.
2. ~~PATHS TAKE TIME~~ ✔ shipped: 6s a gauge, the line fills, carries
   nothing till done.
3. ~~AUTO-RESOLVE LONE STRIKES~~ VOIDED by the owner mid-queue ("jrpg
   style or something"), replaced by → ~~THE BATTLE STRIP~~ ✔ shipped:
   one hero square vs wall + two runts, Attack/Guard/Rations/Fall back,
   free aim, wind-up every third answer, solver-verified ladder
   (win at arms tier, lose at −1, mash loses).
4. ~~VISUAL SESSION~~ ✔ shipped: building icons over their dots,
   edge labels slide inward, fight verbs 2×2.
5. ~~REGION 3's food artery~~ ✔ shipped as WHY TAKE THE GROUND: the two
   gates carry their own road home (pop wall 66 → 126) and held ground
   is rich (×1.5 to ×3.5). The iron rung is still open.
5b. THE COHERENCE REVIEW's list — `docs/BACKLOG.md`. Top three: no
   player-side exponential anywhere (one multiplier rung), the `tap`
   leak (obeys no gate the rest of the game obeys), and `starving`
   reading production instead of delivery.
6. THE CROSSING — finish a valley at the goblins' seat, found the next
   with the veteran hero. The legacy loop itself.
7. Naming/prose pass — the owner's.

Watch item (chad): farms-first can over-farm at low pop with CREW 4.

## ★★★★ (superseded same night) THE CAMP BUILDER — slice 1 of the pivot

> *"maybe we do a base building game here instead… it will all somehow be a
> graph? connections between these would be very prominent. and we will drop
> all prose entirely until we have a good idea of a gameplay. so it'd be
> incremental wilderness camp builder!"*

**Shipped:** src/camp/ engine + one-screen UI. Quarry/lumberworks/sawmill on
fixed sites, paths as the game (nothing counts unconnected), logs→planks→camp
levels, level 2 grows the map. Zero prose. Old game retired in place.

**Next — each gated on the owner's playtest verdict, one per session:**
1. More to level 2/3: farm+food chain? second currency? path UPGRADES
   (wider paths = the old gauge idea, it is already drawn).
2. Scarcity: sites deplete? seasons? something that forces rebuild/reroute —
   right now the only pressure is cost.
3. Away report (one line of numbers), site unlock choices (pick 1 of 2).
4. Naming pass — owner's, when the loop proves out.

## ★★★ THE BASECAMP, 2026-08-07 — superseded the same day by the camp builder

> The owner, at a loss: *"I do not see a game here. I think we lost identity…
> what can we salvage?"* Thirteen agents answered: the game moved to the camps.
> Identity to hold: **a map where every camp is a decision about which road
> you've earned — prepare, choose, watch the line fill.**

**Slice 1 shipped:** camps with 7 depleting days; Hunt (played scene) and
Gather (flat); three profiled roads out of Start with ENUMERATED exclusivity
(test/camp.test.ts); prepared roads are clean roads; gear menu.

**Next, in order — each needs the owner's playtest verdict first:**
1. Camp 2: arriving somewhere makes its camp DIFFERENT (ground changes what
   pays — the wood gathers well, the moor hunts well) — mods exist, data thin.
2. Profiles on every road + retire the free roads, or keep the mix.
3. Chips ON the map (layout work), outcome grades, the mana job at camp.
4. What dies for real once the loop proves out: dice encounters, kits,
   tap-mana (the reviews' list — NOT yet deleted).

## ★★★ SCENES — 2026-08-05, the owner's design, the vertical slice is in

> *"every event should be an extended branching CYOA with hidden HP states…
> make each event a little incremental game of its own, so these are going to
> be our incremental layers… incremental game components combined differently
> in various events… various journey types: forest, valley, hill, rock,
> desert, bog… objectives like going from point A to B (tapping to increase
> speed), keeping resources intact, provisions, unexpected obstacles with
> gauges."*

**Shipped in the slice** (`src/game/scenes.ts` + engine scene machine):
gauges/verbs/rules/mods as composable data; The washout and Toll brigands;
hidden meters; stage branching; terrain as drift modifier; setback/cleared
endings wired into the expedition loop.

**The component roadmap, in rough order:**
1. **✦ CONVERTED, 2026-08-06** — wights (a siege where the ward ROTS), the
   watcher (watch-and-wait; watching costs closeness), oldstones (a deadline
   that only falls, with a hidden hollow), nightwatch (a vigil where the win
   verb feeds the loss gauge). The dice encounters were KEPT as the 40%
   fallback — same trouble, two faces; dice as a COMPONENT (a gamble verb)
   inside scenes stays open.
2. **✦ THE A-TO-B RACE SHIPPED, 2026-08-06; REBUILT TURN-BASED 2026-08-07**
   — "The last of the light": ground is gained ONLY by pressing (the owner:
   *"no idle progress towards the goal"*), the dark answers every turn,
   breath gates mashing. ⚠️ ALL scenes are turn-based now — the clock never
   moves a gauge; the world takes one `perTurn` step after each verb. Still
   to build from this list: convoy integrity ("keeping resources intact" —
   a cargo gauge foes and terrain chip at), multi-objective scenes.
   ✦ 2026-08-07, the spam review: WORK_PACE deleted (pushes are the only
   travel; open ground on the way is a push button), dice misses ESCALATE
   (1, 2, 3 provisions… within one encounter), scenes retuned until a
   single-free-verb bot stalls or dies — guarded forever by the spam-bot
   test. STILL OPEN, owner's call: prose that carries information
   (telegraphed stat leans, per-choice risk) so READING buys a die step.
3. **Outcome grades** — clear WITH margin pays extra (provisions, momentum,
   maybe loot); scraping through pays less. Makes play skill matter.
4. **Graphs on top** — the owner: *"we'd need to somehow slap graphs on top,
   not sure how yet."* Candidate: a scene's stages ARE a small graph drawn on
   the board while it runs (the fractal again). OWNER'S CALL before building.
