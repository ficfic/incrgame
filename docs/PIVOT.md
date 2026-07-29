# The pivot — from knowledge-management incremental to graph RPG

**Owner, 2026-07-29, spoken:**

> *"I kinda got bored of the knowledge management stuff, so I don't want to have
> any ontologies there anymore or any advanced components. I feel like the graph
> we should retain there for sure — this is fun, graphs are fun. I want this
> story to be a story with incremental elements now… about exploration and about
> learning and about something incomprehensible, something that cannot be known.
> Maybe even the English language dataset should go. I wanna make a branching
> story represented by a graph, always visible to the player, with lots of
> choose-your-own-adventure fantasy elements, an inventory and resources — a key,
> a password. More of a single-player RPG with incremental elements… a graph of
> choices that you make, things you know, things you have, things you are aware
> of, choices you made in the past, the way behind you and ahead of you. Maybe
> multiple tabs with graphs, and you should be able to click on any edge and
> understand what it is and what kind of connections it has. The theoretical
> semantic science should go away. Reusing as much as possible."*

Branch: `claude/rpg-graph-story-redesign`, cut from `b4df0c6`. The previous
branch is untouched and still deploys.

---

## What actually changed, in one line

**The genre inverts.** It was *an incremental with a story attached*; it becomes
*a story with incremental elements*. Everything below follows from that one
sentence, including which parts of the build survive.

## The pitch, rewritten

> You are somewhere that does not want to be mapped. Every place you reach adds
> a node to a map you can always see — where you have been, what you carry, what
> you know, and the choices that are now closed to you. Some doors need a key.
> Some need a word you have not learned. And some of what you find cannot be
> understood at all, no matter how long you look at it — the map draws it anyway,
> and the shape of the gap is the story.

Three of the owner's asks are load-bearing in that: **exploration**, **learning**,
and **the incomprehensible**. The third is the new spine. It replaces
"unchecked knowledge rots" as the thing that makes the game *about* something,
and it is a better fit for a hand-authored story than a decay rate ever was.

## What survives — and it is most of the machine

This is the reason a pivot this large is cheap. Nothing below is theme-coupled.

| What | Lines | Why it survives untouched |
|---|---|---|
| **The board** — `render/sim.ts`, `paint.ts`, `detail.ts`, `board.ts` | ~700 | d3-force layout, canvas, level-of-detail, pan/zoom/camera. It takes nodes and edges and knows nothing about what they mean |
| **`core/starmap.ts`** | 239 | already a CYOA traversal engine: routes in three states, gated on `requires.concepts`, keys shown but not readable. Rename `concepts` to `keys` and it is the inventory-gate model the owner just described |
| **`check-story.mjs`** | 512 | its invariants are *exactly* what a hand-authored branching story needs: no dead end, no unobtainable key, no orphan, no dangling reference. Nine sabotages on record. This becomes more valuable, not less — hand-authored content breaks in these ways constantly |
| **The engine's shape** — `apply(state, action) => state`, pure, no DOM/clock/RNG | ~1,200 | save, export/import, offline banking, `break_eternity` numbers. RPG resources are the same integers as factory resources |
| **`reveal.ts`** | — | progressive disclosure of UI. An RPG needs this more than an incremental does |
| **The masking/literacy system** — `masking.ts`, `literacy.ts` | ~300 | **this is the sleeper.** Built to hide WordNet labels; it is a far better fit for *the incomprehensible*. A thing you cannot read because you have not learned the word is the mechanic already in the box |
| PWA, deploy, gates, `readouts.ts` one-word-one-quantity | — | infrastructure, theme-free |

## What goes

| What | Why |
|---|---|
| `public/ontology/` — 4,096 WordNet concepts | the dataset the owner is bored of. Its attribution obligations go with it, and must be removed **deliberately**, not left dangling |
| `scripts/build-story.mjs` — 446 beats from the hypernym tree | the taxonomy-as-plot generator. `RESET.md` already found this is why there is no story |
| `scripts/build-lexicon.mjs` — one word per WordNet concept | a conlang sized to a dataset that is leaving |
| `docs/GLOSSARY.md`, `SIMPLIFICATIONS.md`, `ECONOMY_SRR.md`, `ROUTES.md` | semantic-web theory, and a spec for a game being replaced |
| **CLAUDE.md's "stay theory-faithful — this game is educational"** | this is a *hard guardrail* and the pivot voids it. Must be logged, not quietly dropped |
| `prof-veritas` (RDF/OWL/SPARQL reviewer) | no longer has a subject |
| Solid · Raw · Rot | named after checked and unchecked facts. There are no facts now |

## The one thing that is genuinely new work

**Authored content.** The old game generated 4,096 places from a tree; this one
needs places somebody wrote. That is the whole point and it is also the whole
cost.

A first slice is roughly **40–80 authored nodes** — enough for two or three real
branches, a locked door, a key found on the far side of a detour, and one thing
that cannot be understood. Not four thousand. `VISION.md` said narrative lives in
vignettes and the build ignored it; this is that correction, made structural.

## The question the pivot has not answered

*"A story with incremental elements"* names the story. It does not yet name the
**elements** — and an incremental needs one number that goes up while you are not
looking, or it is a gamebook with a map.

The old answer was machines minting facts. That is gone with the theme. The new
answer has to come from the fiction, and it is the owner's call. It is the only
open question that blocks building.

## What is NOT decided here

Multiple graph tabs, edge inspection ("click any edge and understand what it is
and what connections it has"), and the inventory's shape are all in scope and
all deferred — they are screens, and screens come after there is something to
put on them. Nothing is deleted until the owner confirms the list above.
