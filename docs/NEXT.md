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

## 1. The owner plays it, and says

**Not a build item, and it outranks the two below.** Six steps shipped without
the owner touching any of them. `CLAUDE.md` rule 3 — build the smallest playable
version, then LOOK at it, then decide — and the looking has been a screenshot in
a headless browser every time.

Two things are wanted: is the loop fun for more than five minutes, and is the
prose (37 places, 7 notions) prose the owner would defend. Prose is
machine-drafted and **owner-edited**; none of it has been edited yet.

**Done when:** the owner has played it on the phone and said what is wrong.

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
