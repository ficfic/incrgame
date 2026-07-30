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
> **Item 1 SHIPPED 2026-07-29** — the vertical slice. `src/slice/` (dice,
> content, engine), `src/ui/Slice.svelte`, `test/slice.test.ts` (22 tests),
> `scripts/play-slice.mjs`. `src/main.ts` now mounts `Slice.svelte`; the old
> `App.svelte` still compiles and is unreferenced. The RED-build note that used
> to be here was stale — `vite build` and `npm run check` are clean.
>
> **No generated prose.** `RESET.md` measured the last attempt at 1.2%
> authored, and the owner found no story in the rest. **Saves reset** — say so
> in the commit.

## 1. Owner's pass over the slice

**Not a build item.** Six places are drafted prose (`src/slice/content.ts`) and
CLAUDE.md says player-facing prose is machine-drafted and **owner-edited**. The
slice cannot be judged as a game until the words are ones the owner would
defend, because "is this fun" and "is this well written" are not separable here.

Also open for the owner, from `docs/DICE.md` and `docs/SKILLS.md`: is 2d10 read
as summed 2–20 (built) or percentile d100, and is the currency called the Obol.

**Done when:** the owner has passed over the six bodies and answered those two.

## 2. The key behind the detour

Mostly landed with the slice — the strip of lead opens the low door, and both
states of that edge are in `play.png`. What is NOT built: a **saved game**. The
slice has no persistence at all, so a reload is a new run, and `docs/SPEC.md`'s
export/import is how the owner moves a save between devices.

**Done when:** a run survives a reload, export and import round-trip, and the
seed comes back with it — a save whose dice re-roll differently is a different
game.

## 3. Two dots, one fight

An enemy dot adjacent to yours. They poke each other on a timer; one goes out.
**On the graph**, not on a combat screen. Your side reads from item 1's skill,
so levelling is why you win. Losing pushes you back a node — never a loss
screen.

**Done when:** `npm run play` screenshots a fight and its outcome, and a lost
fight leaves the player playing on without a reload.
