# Routes — the navigator model

**Status: spec, accepted 2026-07-29, not built.** Owner, after playing the
deployed build:

> *"i think the decisions should establish the solid lines and choices should be
> dotted lines… it's completely unclear why resources are called solid and raw…
> it's unclear where we are in a graph if we are traveling it… if we are
> traveling graph, we should be able to select any node and have choices there…
> how the dotted lines are discovered? maybe we can do similar stuff to how
> warhammer rogue trader did the travel between stars system with a navigator?
> you could discover routes? i'm not understanding where we are going with
> this…"*

That last sentence is the finding. The game has been built as a **story with a
graph drawn beside it**; every confusion above comes from that. This spec makes
the graph the game.

## The whole thing in four lines

- You are **at a node**. It is lit and unmistakable.
- Routes out are **solid** (charted — travel now) or **dotted** (rumoured — you
  know something is there, not how to reach it).
- **Surveying** turns a dotted route solid. That is what machines do all day.
- **Travelling** a solid route moves you and teaches you the word at the far end.

Everything else — the four quantities, the story text, prestige — hangs off
those four lines instead of sitting next to them.

## What this fixes, point by point

| The complaint | Why it happened | What the model does |
|---|---|---|
| "unclear why resources are called solid and raw" | they were named after their provenance, which is invisible | they are named after **routes**: charted, rumoured, lost |
| "unclear where we are in the graph" | position was derived from the newest held concept with a beat | you are at a node, and it is the lit one |
| "should be able to select any node and have choices" | choices belonged to a *beat*, and only 446 of 4,096 concepts had one | choices belong to a **node**; every node you have reached has them |
| "how are the dotted lines discovered?" | they were not — they were a render state with no rule | a rumour appears when a machine finds one. That is the machine's whole job |
| "decisions should establish solid lines, choices dotted" | exactly right, and backwards today | this is the model |
| "why is there text at the top and what does it mean" | the narrator arrived before the thing it narrates | it narrates travel and survey, which are now the only two verbs |

## The four quantities, renamed to what they are

Renaming is not cosmetic here. The old names described where a number came
from; these describe **what it lets you do**, which is the thing the player can
actually check on screen.

| was | is | five words |
|---|---|---|
| Words | **Words** | concepts you can read now |
| Solid | **Charted** | routes you can travel now |
| Raw | **Rumours** | leads nobody has confirmed |
| Rot | **Lost** | leads that went cold, permanently |

`Charted` is spent to travel and to buy. `Rumours` decay into `Lost` if left
unsurveyed — which is the same rot mechanic, now with a reason a player can
state: *a lead nobody followed goes cold*.

## The two verbs

**SURVEY** a dotted route → it becomes solid. Costs Rumours. This is what
`Check` was, and it now has a place on the board instead of a button in a dock:
you tap the dotted line itself.

**TRAVEL** a solid route → you move, and you learn the word at the far end.
Costs Charted, priced as today (`0` for somewhere you already hold, else
`ceil(6 × 1.04^steps)`).

Machines produce **Rumours** — dotted routes appearing on the board, which is
the visible thing an idle player comes back to. Watched machines produce fewer
but survey them as they go (so they arrive **Charted**); loose machines produce
more and leave them dotted. That is the same speed-versus-truth trade, expressed
as *"routes you can use"* versus *"leads you have not followed"*.

## What the join becomes

`factsPerSecond = min(1.2 × machines, 0.15 × Words)` survives unchanged, and
finally means something you can say in one sentence:

> **Your surveyors can only look for routes between places you can name.**

Walking raises the ceiling because it teaches you names. That is why travelling
is the only real upgrade, and now the sentence explains itself.

## What is deleted

- **The beat/leaf distinction.** A node is a node. `placeAt`, `ARRIVALS`, the
  leaf frame's special casing — gone. Story text becomes *what the narrator says
  when you arrive somewhere*, not a separate object that only 10% of the board
  has.
- **The lane strip as the primary control.** The board is the control. A list
  may remain as an accessible alternative, but it is not where the game happens.
- **`+N more ways on`.** A node has the routes it has.

## What must not break

- **The language.** Concept names stay foreign and earned; the interface and the
  narrator stay English (`DECISIONS.md`, 2026-07-29).
- **Idle.** No mechanic may require checking in. Rumours accumulate while away
  and do not rot while away.
- **No dead ends.** Every node you can reach has at least one route out, solid
  or surveyable. `check-story.mjs`'s invariant carries over to routes.
- **Failure is a plateau**, never a loss screen. Lost is a running cost, not a
  fail state.
- **Saves break.** Authorised, and this one genuinely does: position becomes a
  real field and edges get a charted/rumoured state.

## The one risk worth naming

The old model had a story with a graph beside it; the danger of this one is a
graph with no story left in it. The mitigation is that **the narrator now
narrates travel** — arriving somewhere is when the prose fires, which is the
same 50 authored beats and 5 frames, attached to a place rather than to a
special kind of place. If arrival stops carrying text, this becomes a very
pretty spreadsheet.
