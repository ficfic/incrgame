# NEXT — the queue

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

## ★ FROM THE SECOND PLAY-TEST, 2026-08-01

### 5. Vocabulary: node and edge, not dot and connection

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

### 10. Repositioning must be OFF on the Journey

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

### 15. Paces: the word and the reason

> *"I don't understand why I'm generating the paces while I'm standing still…
> it is a bit strange that pace is the resource. I accumulate paces like a step.
> Why am I accumulating steps?"*

Two complaints, not one: the NAME is wrong for a thing you bank, and the game
never says why standing still pays.

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

Run at the owner's request: `the-owner` (Roman, simulated), `chad-liquidity`
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
