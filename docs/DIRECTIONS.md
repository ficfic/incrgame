# Five reviews, escalating — where this game could go

> *"can you run 5 each more and more insane redditor style agent that review the
> game and tell where it might go (absolutely unexpected directions) end to
> end"* — the owner, 2026-08-01.

Five agents, each told to be less reasonable than the last: a sober veteran,
one stealing from other genres, one inverting the design's assumptions, one
attacking the boundary between the game and the repo around it, and one asked
for the answer rather than options.

**Nothing here is scheduled.** `docs/NEXT.md` still decides what gets worked on.
Every claim below was re-verified against the code before being written down;
where an agent was wrong, it says so.

---

# ★ THE DEFECT ALL OF THIS FOUND — and it is in `docs/PLAN.md` too

Two agents reached it independently, from opposite directions:

> **Shuffle which of the 37 places connects to which, keep the counts identical,
> and not one number in `engine.ts` changes.** Delete the adjacency lists,
> replace the map with 43 checkboxes, and the economy is bit-identical.

Verified:

| function | keys off |
|---|---|
| `engine.ts:117` `costOf` | `g.solid.length` |
| `engine.ts:125` `forgeSecs` | `g.solid.length` |
| `PLAN.md` `rate(g)` | `settled.length` |
| `PLAN.md` `routeCost` | `routesMadeInThatRegion` |

`docs/NEXT.md` already spotted the symptom — *"`costOf` keys off a GLOBAL count,
so which frontier you open has zero economic content"* — and called it a
**locality** problem, then fixed it with four per-region tiers. **That is one
count replaced by four counts.** The topology is still not read by anything.

So `docs/BRIEF.md`'s north star is currently satisfied by the renderer and
violated by the engine: the graph is a skin over a purchase ladder. It is a
beautiful skin, which is exactly why it would survive to launch unnoticed and
die at hour six as *"pretty, but it's Cookie Clicker with a nice map."*

**The fix is one line of principle: at least one core number must be computed
from adjacency** — flow, distance, degree, reachability under a cut. Not more
content, not better curves.

---

# What two or more agents proposed independently

## A. Income is a FLOW, not a sum ★ the convergence

Settled places are sources; you are the sink; **income = max-flow from the
settled set to where you stand**, over solid edges with capacities. A settled
place three hops behind a thin edge pays almost nothing. A loop-closer doubles
throughput because it routes around a bottleneck.

- **Why it is the pick:** it is the only economy proposed that *cannot be
  computed without the adjacency matrix*. Max-flow on 37 nodes is microseconds
  and stays pure.
- **It retroactively fixes the worst number in the game.** The 7 loop-closers
  cost 72% of the map's total price for 16% of its edges — today, dead weight.
  Under flow they are the best purchase available.
- **It renders itself.** `shapes.ts` already takes a `width`; edge thickness is
  live flow, saturated edges in a different ink. The prettiest readout this
  repo could get for free.
- **Cost:** medium. A `cap` per edge in `engine.ts`, a flow solve, one field in
  the render. Replaces `rate(g)` in `PLAN.md`. Ground type sets capacity, which
  is `docs/NEXT.md` item 20's *"the ground should BE the price"* delivered.

## B. Something spreads, and it uses the roads YOU built

A rot seeded deep in `under` advances one hop along **solid** edges. A rotted
place pays nothing and its work is shut. Settling holds a node.

- **The first mechanic in this game where leaving an edge dotted is correct.**
  Connectivity becomes a liability as well as an asset.
- **The prose is already written.** The regions are about somebody who came
  before, kept count in your handwriting, and started the count over.
- ⚠️ **It must advance per ACTION, not per clock** — one agent was explicit that
  the repo will be tempted by the clock version because it is one line shorter,
  and clock-driven decay punishes absence, which `docs/BRIEF.md` forbids
  outright. Telegraph the next hop before the player acts (Into the Breach, not
  Plague Inc).
- **Cost:** medium. One array, one propagation in `apply`, one ink, one guard.
  It answers `PLAN.md` open decision 1 — what an encounter is — without asking.

## C. Thoughts is writable, and what you draw there is a rule

`notions.ts` already says every notion **names a rule the engine really
enforces** — "The frontier" *is* `COST_GROWTH`, "Free ground" *is* `costOf`
returning 0. Today that is a comment. Make it a binding, and let the player
forge edges *between notions* with the same two-tap gesture as R4.

- **Baba Is You, on the tab that already exists.** 7 nodes, ~9 legal joins.
- **It is the twist as a mechanic.** A player who spent the run editing the
  rules of their own cognition graph does not need to be told they are a model.
- ⚠️ **The cost is real:** `known` stops being a pure predicate over the run and
  becomes save state, forfeiting the "nothing to migrate" property
  `notions.ts` is built on. And 7 notions is a thin puzzle space.

## D. A carried notion changes the rule it names ★ the cheap one

`PLAN.md` already says prestige carries Thoughts and nothing else. Make that
literal: `rule?: (t: Tuning) => Tuning` on a `Notion`, a `Tuning` record read by
`costOf`/`forgeSecs`/`tick`. Carrying *The frontier* flattens `COST_GROWTH`
1.2 → 1.16, **and the notion's own text is the changelog.**

- **~25 lines**, no new files. The last agent's verdict: it should move from
  step 5 of the build order into step 1, because it costs nothing and it means
  every skill, door and drop added afterwards is added to a game that already
  knows what it is about.

---

# Singletons worth keeping

### E. The weir opens and half the map changes — ★ the cheapest thing on this page

One global boolean: `water: 'held' | 'loosed'`. Edges get an optional `when`.

The prose was written for it and nobody noticed. The Weir *"holds it back for no
reason you can see"*; The Dry Drain is *"dry as paper"*; there is a Sump Fork, a
Ledger Pool, a Headrace, a Tailrace, a Wheel Pit. **~60 edges of content out of
43, for one boolean and zero new words.** Trap: a state flip must never strand
you, and that needs a check that goes red.

### F. Notions that are theorems about HOW you played

All seven predicates today are counts — three are `always`, four are
`length >= n`. A proof system used as a counter. `seen` is ordered *"in order of
first arrival"* and `solid` is append-only: together they are a replayable
transcript of the run, read by nothing but `.length`.

So: `solid.length === seen.length - 1` → *"You have not once walked in a
circle."* A dot lights by itself and describes a habit the player had when they
thought nothing was counting. **Knowledge extracted from behaviour is what a
model actually does** — the reveal gets evidence instead of an announcement.
Two entries in an existing array, no save change, no migration.

### G. You stop walking

Prestige does not reset you — it **promotes you out of the walker's seat**. Run 2
you never touch the dot: you build, and an agent follows your roads and comes
back with what it found. The roads are the policy; Thoughts is the weights.

The argument is that this is what the repo has been all along: `solid` is a
network you construct and never use, `fillOf` animates *manufacture*, and `go`
is free and instant and carries no decision — *"you are already playing a
builder and the game keeps insisting you are playing an explorer."*
⚠️ Costs ask 6: you stop reading the prose in first person.

### H. The tab bar is four buttons pretending not to be a graph

`docs/BRIEF.md` ask 5 says *"including the UI itself where that is possible"* and
it is unbuilt. Four `kind: 'tab'` nodes in a 44px strip, same ink, same tap.
Thoughts has no edge to it until a notion is known. ⚠️ Must be a fixed layout,
never `solve()`, or `TABS.md` R2.3 breaks and the menu wanders.

---

# ★ A real bug, found while reviewing

`store.ts:33` validates that every entry of `solid` is a **string** and never
that it names a route the world has. The file's own comment (`store.ts:17-20`)
says saves are *"checked against the CONTENT, not just the types"* — true for
`at` and `seen`, false for `solid`. A key like `"0|300"` loads clean, then
`blocked()` refuses to walk it forever: an inert, permanent line in the save.

Same one-sided-guard shape as item 13. Fix: `PLACE.get(a)?.ways.includes(b)`.
→ filed in `BACKLOG.md`.

---

# Proposed and rejected, with the reason

| idea | why not |
|---|---|
| **Seams shuffle each run** (roguelite topology) | the region files reason about *specific* topology — *"raise it and nine places strand"*. Shuffling makes 200 lines of authored reasoning wrong. Roguelite structure over hand-authored geography is how you get slop. |
| **Edges decay unless held** | losing ground is a loss screen in slow motion, and *"failure is a plateau, never a loss screen"* is the one rule that has survived every rewrite. |
| **Live re-settling layout, price = screen distance** | elegant, and the owner said *"maybe if we can stop them from jingling it would be best."* A physics toy, not a valley. |
| **Link prediction: assert edges that may not exist** | the canonical graph task and thematically perfect, but it needs RNG in an engine that guarantees none, and a wrong guess that costs you is a punish mechanic. Not first. |
| **Browse the repo/commits in-game** | the owner wrote those docs. No discovery, and it torches the fantasy surface. *(The one-node version — a baked commit count at the reveal — survives.)* |
| **Hand-editable save as a mechanic** | the owner is the only player; cheating has no audience. Shipping a console. |

---

# What the last agent said about `docs/PLAN.md`, in full

Asked for the answer rather than options, it argued the game is *"an idle graph
RPG about an agent that forgets"*, gave the smallest shippable version — and
then made the case against its own answer at full weight:

> *"It answers three of the ten asks and skips six. The owner asked for RuneScape
> and I am handing them a poem. You cannot prestige out of an empty room — their
> verdict was 'there is not much to do', and prestige adds no verbs. Resetting a
> map nobody has finished once is not a twist, it is an insult. This is exactly
> the failure mode this repo has already had twice: a beautiful thesis shipped as
> one mechanic."*

**Its own conclusion: `PLAN.md`'s build order is right.** Do settle → work →
skills → thresholds as written. Move D into step 1 because it is 25 lines. Add
one adjacency-computed number (A) so the graph is load-bearing in the engine and
not only on the screen.
