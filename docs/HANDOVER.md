# Handover — 2026-08-01

**Read `docs/NEXT.md` first. It decides what you work on. This file is only
where things stand.**

---

## What the game is, in four sentences

You stand somewhere in a valley of 37 hand-written places. Paces accrue at one
every three seconds, always, awake or not. You spend them to MAKE a road between
two places — it takes real time and fills visually — and once made, walking it is
free forever. Four tabs, each a graph: **Journey** (the world), **Here** (the
room you are in), **Self** (what you carry and what you are), **Thoughts** (seven
notions that unlock from what you do).

## Where it is

Deployed. `claude/rpg-graph-story-redesign` develops;
`claude/incremental-game-github-pages-w7pvk6` deploys and is fast-forwarded onto
it.

- **569 tests, 0 type errors, `npm run play` exit 0.**
- `npm run guard` = typecheck + engine purity + tests, one command.
- `npm run play` drives a real browser and screenshots. **Rule 2 means running it
  AND looking at the picture.**

## What shipped on 2026-08-01

The tab build order finished, then the owner play-tested twice and most of the
day was their feedback.

| | |
|---|---|
| Self | a character sheet — what you carry, your rate, what a road costs you |
| Thoughts | seven notions, each naming a rule the engine really enforces |
| The board | **d3-force on a canvas** — settled, draggable, zoomable, crisp |
| The header | stops carrying prose; arriving selects the place instead |
| Two "bugs" | one layout bug — two rooms drew the identical picture |
| The map | a meandering river and ground under every region |
| The plumbing | one palette, one look table, one paint function, a frame budget |
| The engine | purity guard, and old saves proven to survive new fields |

## ★ The five things a new session most needs to know

**1. The owner's word is the spec, and it is quoted in `docs/NEXT.md`.** Not
paraphrased. When they say *"self is a stat sheet and inventory, but not game
statistics"*, that sentence is the requirement.

**2. Every test of the first Self tab passed, and the tab was wrong.** Ten green
assertions counting the right numbers on the wrong sheet. No test catches that.
This is why rule 3 says build the smallest thing and then LOOK at it.

**3. Guards go vacuous constantly here — assume yours is until you break it.**
Caught in one day: a drag check that could not tell dragging from panning; a
"selected dot" check comparing against the wrong kind of dot; a fill check
counting the dot you stand on, which is always there; a lit-notion check counting
the wrong ink and only working because two colours were the same hex; a
save-merge test that asserted the pattern instead of calling the function. **None
of them failed. They passed while checking nothing.**

**4. Sabotage the MECHANISM, not the line a reviewer names.** A reviewer warned
that clearing `grabbed` would kill tapping. Clearing it where they said proved
nothing — a tap never moves. Clearing it at pointerdown broke tapping instantly.

**5. Restore from a copy, never `git checkout`, while work is uncommitted.** A
sabotage round wiped an unfinished refactor that had to be redone.

## The shape of the code

```
src/game/     the engine. PURE — no DOM, no clock, no randomness.
              engine.ts   apply(state, action) => state
              places.ts   37 authored places, read down to four fields
              layout.ts   d3-force, ticked to completion once, then frozen
              terrain.ts  the river and the ground, as Shapes
              world.ts    one graph; a tab is a FILTER over it, never a model
              notions.ts  the seven things Thoughts holds
              ink.ts      EVERY colour, once, with the tolerance it may be counted at
              shapes.ts   geometry the board can draw, described without a canvas
              store.ts    the save boundary — the ONE file allowed a clock
src/ui/       Board.svelte  canvas for lines and dots, DOM for words and taps
              Game.svelte   tabs, selection, the clock, the save loop
scripts/      play-tabs.mjs  the browser probe. Reads the palette OFF THE PAGE.
src/slice/    RETIRED. Kept for its authored prose and nine unused keys.
```

**The board takes the graph plus a list of `Shape`s.** A bridge, a ford, a glyph
beside a place, a tint over a region is an entry in that list. `baked` shapes
cache themselves into a bitmap — that is how ~530 scenery marks cost one
`drawImage` a frame.

## Performance, measured

At 4× CPU throttle during a pan (the worst case): **~4 ms of real work a frame**
over a 16.7 ms vsync floor, split evenly between canvas and DOM. Zero long tasks.
There is headroom. The probe now holds a budget so a heavy feature cannot land
quietly.

## What is NOT decided, and must not be invented

- **The economy.** Measured and broken: income is flat forever while price grows
  1.2ⁿ, all 43 roads cost 63.5 hours of waiting, one 12-hour absence buys 33 of
  them, and `costOf` keys off a GLOBAL count so no direction is ever cheaper.
  Four agents converged on the same fix; the owner has not chosen it.
- **The words.** The owner found "paces", "ways" and "settle" impenetrable and
  asked for plain low-fantasy language. Landed so far: **stone** is the resource,
  **roads** are what you build, and **water does the work** — a river carries
  gravel and piles it where you clear a channel. Nobody is paid, because there is
  nobody in the valley to pay.
- **Skills.** Structurally blocked: `costOf` and `forgeSecs` both key off
  `solid.length`, so a skill trained by making roads cancels itself out, and a
  skill is a choice about where to spend time of which there is exactly one.
  **Whoever adds a second activity adds the first skill in the same item.**
- **Items.** Nine hand-authored keys exist in `src/slice/content.ts`, each with a
  door it opens. Nothing drops one. The owner deferred this explicitly.

## Housekeeping

- **The repo is public.** No secrets; the owner's email is not committed; commits
  are authored as `Claude <noreply@anthropic.com>`. `.claude/agents/the-owner.md`
  names the owner by first name and quotes their play-tests — their words about
  their own project, but worth knowing it is there.
- `.claude/agents/the-owner.md` simulates the owner and MUST open every reply by
  saying so. It is not a substitute for asking them.
- `docs/NEXT.md` was renumbered on 2026-08-01 — it had two 2s, two 3s, two 5s and
  two 6s, and listed shipped work as open.
