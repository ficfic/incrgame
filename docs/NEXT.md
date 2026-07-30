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

> **Queue replaced 2026-07-29.** Node memory, the WordNet junk cut and the
> Solid/Raw/Rot screen went with the theme. `docs/BRIEF.md` is the source of
> truth; `docs/RESET.md` is why.
>
> **The build is RED**: `src/ui/App.svelte` imports four deleted modules, so
> `npm run play` cannot run. Item 1 replaces that screen rather than repairing
> it.
>
> **No generated prose.** `RESET.md` measured the last attempt at 1.2%
> authored, and the owner found no story in the rest. **Saves reset** — say so
> in the commit.

## 1. One room, one timer, one shut door

The smallest playable thing that shows the new direction. The owner has said
three times they could not tell what a build was; the test is whether a stranger
can tell in ten seconds.

One screen: a graph of **four or five hand-written places**, your dot on one.
Tap a place, read a hand-written paragraph, pick a choice. A choice starts an
**action that takes real time** — a bar that finishes whether or not you watch
— paying **XP in one named skill**. One edge is drawn but shut, and says what
it wants: *needs Foraging 3*.

**Done when:** `npm run play` screenshot pasted, showing the graph, the
authored text, a running timer and the shut door with its requirement — and the
skill levels on a second run of the action.

## 2. The key behind the detour

Item 1's door, opened the long way. A **fork** where one side carries an object
and the other does not, an **inventory** showing what you carry, and that shut
edge opening because you carry the thing. Choices you passed stay drawn, closed.

**Done when:** `npm run play` screenshots both states of one edge — shut
without the key, open with it — and `check-story.mjs` passes on the authored
graph: no dead end, no unobtainable key, no orphan.

## 3. Two dots, one fight

An enemy dot adjacent to yours. They poke each other on a timer; one goes out.
**On the graph**, not on a combat screen. Your side reads from item 1's skill,
so levelling is why you win. Losing pushes you back a node — never a loss
screen.

**Done when:** `npm run play` screenshots a fight and its outcome, and a lost
fight leaves the player playing on without a reload.
