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

> **★ THE OWNER PLAYED IT, 2026-08-01.** Everything below comes from that, in
> their order. Quotes are theirs.

## 1. The graph: bring back the canvas and make it move

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

## 2. The text at the top

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

## 4. Self should not be a stat sheet

> *"On the Self tab… zero of the three ways, one of thirty-seven places. I don't
> wanna see these stats on the Self."*

Shipped 2026-07-31 and rejected on sight. **What Self should hold instead is
undecided and must not be invented** — ask.

## 5. Paces: the word and the reason

> *"I don't understand why I'm generating the paces while I'm standing still…
> it is a bit strange that pace is the resource. I accumulate paces like a step.
> Why am I accumulating steps?"*

Two complaints, not one: the NAME is wrong for a thing you bank, and the game
never says why standing still pays.

## 6. Start over says nothing

> *"I'm pressing start over button. Nothing really happens. Doesn't give a
> feedback."*

It wipes and resets, with no confirmation and no acknowledgement.

## 2. A second thing to do — and the first skill with it

The unblocker for `docs/BRIEF.md` ask 2. One verb means no choice, so no skill
has anywhere to bite. Add a second activity — something you can do INSTEAD of
banking paces, at a place, on a timer — and add the one skill it trains in the
same item, gating something you can see from here (ask 4, thresholds).

**Not two items.** They interlock or neither works.

**Done when:** `npm run play` screenshots a choice between two activities, the
skill levels from one of them, and a threshold visibly shuts a door the level
opens.

## 3. Two dots, one fight

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
