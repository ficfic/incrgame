# Tabs, and one graph underneath — the spec

**Owner, 2026-07-31, after playing.** This supersedes the single-screen layout.
It answers to `docs/BRIEF.md`'s north star (the game is a graph) and does not
change it.

## The diagnosis, in the owner's words

> *"In the initial version, as soon as I opened the game, some text pop-up
> opened on top of the pop-up which happens when you click on a graph node. This
> is why it was very confusing — I had to close the text pop-up and then the
> graph actions would have opened."*
> *"It was not working right not because of the slightly misaligned graph, but
> because of all the rest of the UI."*

**The defect is not the graph. It is that everything shared one surface and
stacked.** Prose over the board, a card over the dots, a sheet over the card.
Every fix moved something on top of something else.

**The fix is separation, not subtraction.** Tabs. Each tab is a graph. Nothing
overlays anything.

---

## R1 — ONE MODEL, MANY VIEWS

> *"In the underlying data model for the game, I want the graph to have
> everything connected so that we have one systemic model which describes
> everything."*

- **R1.1** There is exactly one graph. Places, skills, stats, items, concepts
  and encounters are all **nodes** in it, distinguished by a `kind`.
- **R1.2** Relations are all **edges**, distinguished by a `rel`: a route
  between places, a skill you have, a thing you carry, what a word means.
- **R1.3** **A tab is a FILTER over that one graph, never a separate structure.**
  If a tab needs its own data model, the model is wrong.
- **R1.4** Layout is per-view and solved once, deterministically. Nothing about
  the model knows where anything is drawn.

## R2 — TABS

- **R2.1** Four: **Journey**, **Here**, **Self**, **Thoughts**.
- **R2.2** One tab is visible at a time. **Nothing is ever drawn over anything
  else.** No modal, no sheet, no card floating over a board. This is the whole
  point of the spec and it outranks any layout convenience.
- **R2.3** The tab bar is always reachable and never moves.

| tab | is | owner's words |
|---|---|---|
| **Journey** | the world map — places and the routes between them | *"one graph represents the journey, the physical locations"* |
| **Here** | the place you are standing in: what you can see, what you can do, who is here | *"within the location, as a separate tab… encounters are gonna happen on that tab, to not have everything on one screen"* |
| **Self** | skills, stats, and what you carry or wear | *"another graph represents the character, its properties, skills, stats… no separate inventory tab"* |
| **Thoughts** | what you know and how it connects — a glossary you can walk | *"a tab with your thoughts, what you're doing, what you're up to, how the things in the world are connected, kinda glossary way"* |

## R3 — WHAT A NODE DOES

> *"What can you do with a node? You can click on it, and something might happen.
> Some action might happen, or some information pop-up might open."*

- **R3.1** Tapping a node **selects** it. Selection is a state of the tab, not a
  window over it.
- **R3.2** The selected node's name, what it is, and **its available actions**
  appear in a fixed panel that is **part of the tab's layout** — beside or below
  the graph, never on top of it (R2.2).
- **R3.3** Every action says what it costs and what it needs. An action that
  cannot be taken is shown with its reason, never hidden.
- **R3.4** Tapping the background clears the selection. Nothing to close.

## R4 — FORGING AN EDGE

> *"Connecting edges should be an action performed on the graph canvas. You
> should be able to click on one node and then on a second node and establish a
> connection there. I liked a lot our approach from before — we had a dotted
> edge, and then once we tried to establish a connection it started growing
> slowly into a solid line, which was pretty satisfactory."*

- **R4.1** Select a node, then choose **Connect**, then tap a second node. Two
  taps and a verb, on the canvas.
- **R4.2** A proposed connection draws **dotted** immediately.
- **R4.3** It then **fills from one end to the other over real time** until it is
  solid. This is the signature interaction and it is the one animation the game
  gets. It banks while away like everything else.
- **R4.4** A solid edge is a route you can travel; a dotted one is not yet.
- **R4.5** Not every pair may be joined. The rule for which is **open** — see
  "Not yet decided" below.

## R5 — THE JOURNEY GRAPH

- **R5.1** **It does not move.** Not draggable, no pan, no wiggle, no settling,
  no force simulation at runtime. Layout is solved once and is a constant.
- **R5.2** It fits its box by `viewBox` and is never sized from the window.
- **R5.3** A place you have not reached is drawn but not named.
- **R5.4** *Later:* a world map image may sit **under** the graph. Not now.

## R6 — WHAT SURVIVES FROM THE CURRENT BUILD

- **R6.1** The 37 authored places and their prose.
- **R6.2** `apply(state, action) => state`, pure, time as a `tick`.
- **R6.3** Paces: gathered by standing, spent by moving. One resource.
- **R6.4** The deterministic layout solver and its tests.
- **R6.5** The save layer and offline catch-up.

---

## Build order

Each step ends in something playable and screenshotted. Nothing starts until
the one before it is on the phone.

1. ✅ **The model and the tab shell.** One typed graph; four tabs; nothing
   overlays anything. Journey renders places, Here/Self/Thoughts render what
   little exists. *This alone fixes the reported defect.*
2. ✅ **Selection and actions (R3).** Tap a node, see its actions in a fixed
   panel. Travel becomes an action on a node rather than a list beneath the map.
3. ✅ **Forging (R4).** Two taps, a dotted line, and the fill. The signature move.
4. ✅ **Here.** The place you are standing in, as its own tab. Encounters land
   here later; first it is what you can see and do.
5. ✅ **Self.** ~~Skills and stats~~ — **you, and four true numbers**, as a graph.
   See below: skills are blocked, and the block is structural.
6. **Thoughts.** Concepts and how they connect; tap one to read it.

### What step 4 settled

- **Here is the room, not a zoomed map.** Where you stand, every way out, and
  one node for **what you are doing** — the place's own words for resting where
  the authored content gave it any ("Listen to the water"), the countdown while
  a way is being made. It is a node, not a status bar, and there is nothing to
  press: standing still is already resting.
- **It is still a filter (R1.3).** Every place and route Here draws is the same
  node and the same edge the Journey draws. The only addition is the `doing`
  node and its one edge.
- **Every tab is drawn at one zoom.** The `viewBox` is also the font size, so a
  four-dot tab was scaled three times harder than the thirty-seven-dot one. A
  small view now spreads its dots to fill a box of the Journey's size instead.

### What step 5 settled — ★ WHY THERE ARE NO SKILLS YET

`docs/BRIEF.md` ask 2 wants RuneScape-shaped progression, and it is still
wanted. It **cannot be built on the current loop**, and that is a structural
fact rather than a scheduling one:

- `costOf` and `forgeSecs` **both key off `solid.length`**. A skill trained by
  making ways would rise in exact lockstep with the thing it is meant to
  offset, and cancel itself out.
- A skill is a **choice about where to spend time**. There is one verb —
  standing still — so there is nothing to choose between. Five skills over one
  activity is five names for the same number, which is what the retired build
  had.

**Skills come back when a second thing to do does, and not one session before.**
Whoever adds a second activity should add the first skill in the same item, or
they will not interlock — that is the eleven-systems lesson in one line.

So Self holds what is true today, each as a node hanging off you: paces in hand,
ways made of all in the valley, places found of all, and how far out you have
reached (graph distance from the start — not places seen, not routes made).

### Settled by step 3, on record here

- **R4.5** — the pairs that may be joined are the ones the authored valley
  already joins. Nothing invented.
- **Forging REPLACES travel cost.** Paces buy a route, not a step; a made route
  is free to walk forever. Two costs for one move is friction with nothing to
  show for it, and this way the graph is literally the thing you are building.

## Not yet decided — do not invent these

- What an encounter is, mechanically (`docs/COMBAT.md` has a design; it is not
  built and is not assumed here). It lands on **Here** when it is decided.
- Whether skills and stats come back at all, and in what form. `Self` may be
  nearly empty for a while, and that is honest.
