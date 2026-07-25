# Architecture — headless engine, swappable skins

## The technical vision (added 2026-07-25, because there wasn't one)

Everything below this section is a record of choices. THIS is the part that has
survived six pivots and is the thing to check new code against:

1. **`src/core/` is a pure, deterministic reducer.** `apply(state, action) →
   state` over a plain, serializable, versioned object that knows only numbers
   and integer node ids. It never touches the DOM, the network, the clock,
   `Math.random`, or the dataset. `now` is a parameter; the RNG seed is threaded.
2. **`src/shell/` owns everything impure** — the 10 Hz clock, IndexedDB,
   `fetch`, and the id→concept mapping — and hands the engine plain integers.
   When the engine needs a fact about the world, the shell looks it up and
   passes it in.
3. **Everything above is a replaceable skin, and THE BROWSER IS THE FRAMEWORK.**
   DOM and CSS for anything with text or a tap target; canvas 2D only for what
   canvas is genuinely better at (many lines, many dots). No layer above the
   engine holds game state. Do not reimplement layout, hit-testing, text
   measurement or scrolling — that was tried, it cost 809 lines, and it broke
   the game under pinch-zoom.

Rules 1 and 2 have never slipped, and they are why the UI could be rewritten
twice at zero cost to the engine. Rule 3 is new only as *writing*: it is the
lesson of the all-canvas experiment, stated so it does not have to be relearned.

⚠️ **Historical note.** This document named **PixiJS** as the locked graph
renderer for months, in five places, and PixiJS was never a dependency. Treat
any "chosen"/"locked" claim here as needing verification against
`package.json` before you build on it.

The one principle everything else follows: **the game's brain knows nothing about
the screen.** A pure, deterministic engine operates on plain state; the UI and the
graph are swappable skins on top. This is what makes the game *portable*, *fast to
iterate on*, and *safe to go wild on* — wild only ever touches a skin.

```
  CONTENT   declarative data (resources, generators, costs, domains)   ← tune by editing data
  ─────────────────────────────────────────────────────────────────
  ENGINE    pure TypeScript, zero UI                                    ← the portable heart
            apply(state, action) → state  (sole reducer)                  deterministic · headless · tested
            tick = (s,dt) => apply(s,{type:'tick',dt})  (sugar)
  ─────────────────────────────┬───────────────────────────────────
  UI SKIN  (vertical HUD)       │   GRAPH RENDERER  (WebGL blooms)      ← swappable; "go wild" lives here
```

## The stack (chosen — all reversible except the engine)

| Layer | Choice | Why |
|---|---|---|
| **Engine** | pure **TypeScript** + `break_eternity.js` | portable, deterministic, framework-free, unit-testable |
| **Content** | declarative data (TS/JSON, derivable from `docs/graph/game.ttl`) | iterate balance by editing data, not code |
| **UI skin** | **Svelte** | compiles away to tiny vanilla JS (mobile perf); least boilerplate = fastest iteration |
| **Graph** | **canvas 2D** | a few hundred lines and dots; no WebGL needed. Anything with text or a tap target is DOM — see the technical vision below. |
| **Shell** | **Vite + PWA** | PWA = installable, full-screen **iOS vertical** play, offline; Vite = instant HMR |
| **Tests** | **Vitest** | test the engine headless in milliseconds |

Rationale is durable, not dogma: the engine/skin split means any skin can be
replaced without touching game logic, so these picks are low-stakes. Only the
**engine is a marriage**; the rest are outfits.

## Proposed layout

```
src/
  core/          # pure engine — MUST NOT import UI/render or touch window/document
    engine.ts    #   apply(state, action) sole reducer; tick(s,dt) is sugar over it
    types.ts     #   GameState, Action, content types
    numbers.ts   #   break_eternity wrapper (format, add, mul, cmp)
    save.ts      #   serialize/deserialize + versioned migrations
  content/       # declarative game data (may be generated from game.ttl)
    resources.ts  generators.ts  domains.ts
  ui/            # Svelte skin — vertical-first HUD
  render/        # canvas painter: lines, substrate, ring. Geometry in board.ts.
  worker/        # optional: run the engine off the main thread for smooth 60fps
  main.ts
test/            # Vitest engine tests (headless, no DOM)
```

## The rules (these protect portability — enforce them)

1. **`core/` is pure.** No DOM, no `window`/`document`, no imports from `ui/` or
   `render/`. If it can't run in a Web Worker or a test, it doesn't belong in core.
   *(Candidate future guardrail: an ESLint boundary rule; `the-graph` reviewer checks it.)*
2. **Content is data, not logic.** New resource/generator/domain = a data edit.
3. **State is a plain, serializable object** — and **versioned with migrations**
   (the save-safety guardrail). Never break an existing save.
4. **The graph renderer is isolated and swappable.** "Go wild" is contained here.
5. **One engine, two form factors.** iOS vertical and browser are the same engine
   under a responsive skin — mobile-first, scales up.

## Events / CYOA fit the same model (no special system)

Choose-your-own-adventure events are just **content + engine state + actions**:

- **Event = data:** `{ id, trigger, situation, choices[] }`; a choice is
  `{ text, requires?, effects[], leadsTo? }`.
- **The engine** checks triggers each tick; when an event fires *randomly*, it
  draws from the **seeded RNG** (deterministic → testable, no save-scumming).
- **A choice is an action:** `apply(state, {type:'chooseOption', eventId,
  choiceId})` applies the effects and, if `leadsTo` is set, queues the next
  node — that's **forking / multi-step** events.
- **Narrative flags** in `GameState` record what's happened. These gate the
  **emergent world-ending reveal** and the **diegetic weirdness** — both are just
  flag-conditioned events.
- The **UI skin** only renders the queued event + buttons; the **engine** decides
  all consequences. Purity holds.

## MVP stays thin (bouncer's standing order)

We adopt the *capable* stack but the first build uses a *thin slice* of it: a
list-based UI, one resource, one generator, a handful of nodes (~5–10). The wild parts (WebGL
blooms, worker, domains) are earned, not front-loaded. The architecture exists so
we *can* scale — not so we must.

## Content pipeline — real ontology data (added 2026-07-25)

The CONTENT layer now has two kinds of data, and the distinction matters:

| | Hand-authored content | Generated ontology data |
|---|---|---|
| **What** | resources, generators, costs, gates | 4,096 concepts (curated from OEWN's 107,519): names, domains, is-a parents, definitions |
| **Where** | `src/content/*.ts` | `public/ontology/*.json` (committed build output) |
| **From** | design decisions | `scripts/build-ontology.mjs` ← Open English WordNet, pinned |
| **Edited by** | humans | **nobody** — regenerate, never hand-patch |

Both are still *declarative data*, and the engine is still ignorant of both
beyond what it is handed. The rule that keeps this clean:

> **`src/core/` knows only integer node ids.** Concept identity — id → name,
> domain, definition — is resolved in `src/shell/ontology.ts`, at the skin
> boundary. The engine cannot tell whether node 41 is `dry ice` or nothing at
> all, and it must stay that way: the ontology is a skin over the simulation,
> swappable like every other skin.

That boundary is why the pivot to real data cost no engine changes and no save
migration. It is also why a failed chunk fetch is a cosmetic degradation and not
a broken game.

Full contract — file shapes, chunking, the frozen ordering rule, caching — is in
`docs/SPEC.md` ("Concept data"). Licensing is in `docs/ATTRIBUTION.md`.
