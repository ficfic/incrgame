# Game design — the screen and the loop

> Answers `docs/BRIEF.md` asks **5** (everything is a graph), **6** (CYOA) and
> **10** (inventory). Skills are `docs/SKILLS.md`; combat is `docs/COMBAT.md`;
> both are referenced here only as interfaces. **Everything in this file is a
> proposal unless it is quoted from BRIEF.md or carried forward from the shipped
> renderer.** Inline **proposal** marks the load-bearing inventions.

## 1. The one screen

There is one screen. It is the board, full-bleed, edge to edge. There is no dock
of buttons beside it, no page that scrolls, no second view you navigate to.

This is the project's most repeated failure (`docs/RESET.md`): the board was a
picture, and everything you could *do* lived in a footer whose buttons named
places that were not drawn — the salvage review measured **zero overlap** between
the lane buttons and the dots on screen. The fix is not better buttons.
**The controls are the graph.**

| Thumb does | Board does |
|---|---|
| tap a node | act on it — walk, start, take, equip, fight |
| tap an edge | inspect it: what it is, both ends, cost, time, why locked |
| drag | pan |
| pinch | zoom (buys detail — `budgetFor(zoom)`) |
| long-press a node | pin it, so LOD may not roll it up |

Five gestures, no more. **proposal**

Persistent chrome is exactly three things, all small, all on top of the canvas:
one line of English narration at the top, the **lens rosette** (§2) bottom-left,
and a `⋯` for save/export/settings. Everything else is drawn.

## 2. Graph-as-UI: how far it goes

The owner asked for "multiple tabs with graphs". **Proposal: not tabs — lenses.**
Same renderer, same camera, different node set, crossfaded so it reads as one
space. The switcher is *itself a graph*: four dots on a ring, joined, the current
one lit. That is the joke and also the cheapest correct widget.

| Lens | Nodes are | Edges are |
|---|---|---|
| **World** | places | routes; gated ones drawn locked, key shown masked |
| **Self** | skills (`SKILLS.md`) | thresholds that unlock each other |
| **Pack** | what you carry | *what each thing opens* — see §4 |
| **Trail** | choices you made | the way behind you; branches now closed drawn as stubs |

### Where it genuinely works

Map, quest log, inventory, skill tree, dialogue **structure** and combat
adjacency are all natively graphs. A quest log is a subgraph with some edges
solid and some dotted — that is what a quest log *is*, drawn honestly for once.

### Where it breaks — the failure line, stated plainly

1. **Tap targets.** 44 CSS px minimum. On a 390×700 stage that is ~35 slots
   absolute, ~14 in practice once edges and labels need room. **Any lens with
   more than ~14 actionable nodes must roll up.** LOD already does this.
2. **Labels vanish.** `detail.ts` drops a label whose box collides. A dropped
   label on a decorative node is fine; on a *control* it is a button with no
   name. Rule: actionable nodes go in `priority` and are never unlabelled — if
   they cannot all be labelled, there are too many of them.
3. **Text with a reading order.** A graph has no reading order. Two sentences in
   sequence, a list of prices, anything you compare — a graph makes these worse,
   not better. §3 is the whole answer to this.
4. **Exact numbers.** Level 7 of 10, 4m 12s, 340 coin. Drawn as radius, arc and
   fill; the *figure* appears only in an inspector.
5. **Save, export, settings.** Not a graph. A sheet. Do not be clever here.

**The rule: the graph carries structure and state; a panel carries prose and
exact figures; nothing carries both.** Push to that line, stop at it.

### Edge inspection (asked for by name)

Tap any edge → a one-line strip: *kind · from → to · state · cost/time · what is
missing*. Hit-testing a 2px line with a thumb is the riskiest thing in this doc:
**proposal** — nearest segment within a ±22px corridor wins; if two are inside
it, the strip lists both and you pick. Prototype this before anything depends
on it.

## 3. The CYOA moment — where the text lives

You arrive. You read. You choose. `RESET.md` is exact about the two failures: a
wall of prose under the board was disliked, and hiding it deleted the story.

**Proposal: the text is inside the node.** On arrival the camera dives and the
node you occupy *expands in place* into a card holding the middle band of the
screen. The card is the node — same colour, same identity, grown. Its out-edges
are still drawn, leaving the card's rim and running to 2–4 choice dots around
it. You are reading inside the graph, not underneath it.

- **Budget: 40–70 words, two short paragraphs, no scroll, ever.** If it does not
  fit a phone at default type size, it is two beats, not one. This discipline is
  the difference between this and the wall.
- **Choices are the out-edges.** The tap target is the dot at the far end (44px);
  the edge is the drawn thing. A locked choice stays drawn, with its key masked —
  `starmap.ts`'s existing rule, unchanged.
- **Closing collapses the card back into its dot** and the edge you took goes
  solid. The Trail lens is now one node longer. Nothing was a modal; nothing was
  a footer.

Authored, few, good (`PIVOT.md`: 40–80 nodes, not 4,096).

## 4. Inventory and resources (ask 10)

**Pack lens. proposal.** Each thing you carry is a node tethered to you. Its
edges do not point at other items — **they point at the doors it opens.** A key
with no edges is a key whose lock you have not found; a door lights when you
pick up its key. That is the whole inventory UI, and it earns being a graph
because possession only matters relative to what it unlocks.

Currency: one node, radius = amount, exact figure in the inspector. Its name and
source are BRIEF.md's open question, not settled here.

## 5. Onboarding — the first ten seconds

The owner has said three times, on three builds, that they could not tell what
the game was or what the buttons did. So, literally: **proposal**

- **t=0.** Black. Three dots. One lit — you, named. Two dim, each joined to you
  by a visible edge. No HUD, no number, no menu, no rosette.
- One line of English above: *"You are here. Tap a light to walk there."*
  (owner-edited).
- **First tap** = a dim dot. You move. The edge **fills over ~2 seconds** — the
  timer spine (BRIEF ask 3) is taught by doing it, never explained.
- The card opens: ~40 words, two choices. **Second tap** = a choice.
- Nothing else appears until it can be used (`reveal.ts` survives). The rosette
  arrives with the second lens. No number is on screen before a number changes.

## 6. Mobile performance budget (carried forward, still binding)

- **Simulate in numbers; render a representative graph.** A node per entity will
  not draw on a phone. Level-of-detail: aggregate, sample, cap the visible count.
- Canvas 2D for lines and dots; DOM for anything with text or a tap target.
  d3-force for layout. `budgetFor(zoom) = 26 · zoom^1.45` visible nodes.
- The board is the reward surface **and now the control surface** — but never the
  source of truth for balance.
- One device: iOS Edge, one phone, the owner's. Test there or it is untested.

## 7. Open questions

1. Edge hit-testing on a thumb (§2). Prototype first.
2. Does the lens crossfade morph shared nodes, or hard-cut? Morph is prettier and
   may cost the frame budget.
3. Where does combat draw — in World, or a fifth lens? `COMBAT.md` decides.
4. Timers: does a running action pin its node against LOD? Probably yes.
5. What the currency is, and whether the Pack lens needs it at all.
6. Does the Trail lens earn its slot at 40 nodes, or only at 400?
