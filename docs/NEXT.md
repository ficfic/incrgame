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
> **Steps 1–4 SHIPPED 2026-07-31** — the tab shell and the one graph model
> (`src/game/world.ts`), selection and actions in a fixed panel, forging
> (two taps, a dotted line, the fill), and Here as the room you stand in with
> a node for what you are doing. `scripts/play-tabs.mjs` is the probe.
>
> **Saves are breakable.** Say so in the commit when a change resets them.

## 1. Self — you, as a graph

`docs/TABS.md` build order 5. Today the tab holds two dots and is honest about
it. Whether skills and stats come back **at all**, and in what form, is still
the owner's call and is listed under "do not invent" — so this item is a
question before it is a build.

**Done when:** the owner has answered whether skills return, and Self shows
whatever the answer makes true. Not before.

## 2. Thoughts — what you know, and how it connects

`docs/TABS.md` build order 6. Today it draws the places you have proved. The
owner asked for "a glossary way" — concepts and their relations, tap one to
read it. Needs something to put in it that is not a place.

**Done when:** `npm run play` screenshots the tab with at least one concept
that is not a place, and tapping it reads.

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
