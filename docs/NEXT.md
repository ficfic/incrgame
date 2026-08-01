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

⚠️ Note the tension with R2.2 (nothing drawn over anything). A sticky header is
a fixed element the board scrolls under. **R2.2 was about prose stacked over the
board, not about a pinned readout** — but say so in the commit, and keep the
probe's overlap check honest by scoping it.

### 8. ★ The Journey should be DISCOVERED, not shown

> *"Maybe I would like not to see all the nodes already kind of grey. So it is
> the entire map. I would like to discover that, and I wanna see it from the
> beginning."*

**This REVERSES a standing decision.** `world.ts` says: *"Every place is drawn
from the first frame, because a map with holes in it is not a map."* That is now
void — the owner wants the map to grow. On record because it was load-bearing
and shaped both the Journey and the "unnamed dot" promise.

### 9. ★ Journey and Here overlap too much — split their jobs

> *"I don't understand why we have both Journey and Here tabs now. They repeat
> each other's functionality too much. So I want Journey to be a global map,
> Here is a local map. On the Here tab we're gonna have enemy encounters and so
> on, and resources to be mined and activities to do. I don't want to be able to
> go back to the other location from that menu."*

- **Journey** = the global map. Travel lives here.
- **Here** = the room. Encounters, resources, activities. **No travel.**

### 10. Repositioning must be OFF on the Journey

> *"I noticed that I am able to reposition the graph nodes on the Journey tab. I
> don't think it makes sense because this is kind of a map, right? So the
> repositioning must be off on the Journey map. On Self and Thoughts it's like
> whatever."*

Here: undecided, they said "I'm not sure".

### 11. Edge labels

> *"On this Self menu it would make sense to have labels for edges or something
> like that. Let's experiment with that."*
> *(Thoughts)* *"Edges would be nice here because I don't understand the
> connections between those."*

The model already carries a `rel` on every edge and nothing draws it.

### 12. Two labels that read wrong

> *"'You're already making one' is a weird label."*
> *"'Making a way. It carries on while this is shut.' This is also a weird
> label."*

### 13. "Somewhere you have not been" is still confusing

> *"So now 'somewhere you have not been' again, when I click on the node that I
> have already discovered — or, like, I discover first and then I go there? Is
> it something like this? It is not very intuitive."*

⚠️ **NOT the layout bug this time** — that is fixed. This is the WORDING and the
model behind it: the player cannot tell what "discovered" means or in what order
things happen. Likely dissolves into item 8 (discovery) if that is built first.

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
