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

4. **ONE COORDINATE SYSTEM, ONE ANCHORING RULE.** The engine and the shell
   agree on a model coordinate for every visible thing. Anything placed at one —
   DOM element or canvas stroke — is **centred on it**, via
   `transform: translate(Xpx, Ypx) translate(-50%, -50%)`, and **its box size
   never depends on its text**: labels hang off the box with `position:
   absolute` so they cannot move the thing they label.
   This rule is written down because breaking it produced days of "everything is
   misaligned" that no unit test could see. `.node` was a flex column sized by
   its LABEL, so its dot rendered at `x + labelWidth/2` — 8px off for "thing",
   32px off for "physical entity". The canvas drew its lines to the true
   coordinate, so lines missed dots, the root sat off the ring centre, and the
   error grew with the word. The engine was never wrong, which is exactly why
   92 green tests said nothing.
   **Geometry that only exists after CSS has run can only be checked by running
   CSS.** `scripts/check-alignment.mjs` (`npm run check:align`) drives a real
   browser, reads each element's transform back out, and asserts its rendered
   centre equals it. It is verified to go RED when the rule is broken — a check
   that cannot fail is worse than no check.

5. **ONE WORLD, ONE CAMERA.** Rule 4 makes the DOM agree with the model. It says
   nothing about whether the model is *right*, and for a while it was not: every
   piece of the board computed its own pixels from `w` and `h` — the spiral had
   one formula, the provenance ring another, the frontier slots a third — so the
   graph sat 30px left of the ring it was supposedly inside, filled 49% of the
   width, and no test could object because each formula rendered faithfully.
   Agreement is not correctness.
   So: **everything with a place is authored in WORLD units and put on screen by
   the single camera in `src/render/board.ts`.** Nothing else converts to pixels.
   The world is a fixed disc — root at 0, concepts out to radius 1, provenance
   ring at 1.06, frontier at `WORLD_RIM` — and `cameraFor(w, h)` fits that disc
   into the stage box.
   The camera is **a pure function of the box, deliberately not of the graph.** A
   fit-to-current-bounds camera re-fits on every discovery, so landing one
   concept nudges all two hundred others — that is the "everything pops and the
   graph restructures" complaint, and a camera that ignores node count cannot
   produce it. Because the spiral always puts its outermost node at radius
   exactly 1, a fixed camera still fills the box at 4 concepts and at 240.
   Only POSITIONS are scaled. Dot radii, label text and line widths stay in
   screen px — a legible tap target is a screen-space fact.
   `check-alignment.mjs` asserts the three things the camera promises, each true
   at any node count: the world origin is the stage centre, the rim is on screen
   and the board spans ≥50% of the short side, and nothing (including a label,
   including an in-flight badge on the rim) hangs off the stage. All three are
   verified to go red. It does **not** assert that the node cloud's bounding box
   is centred — five points of a golden-angle spiral have not reached their own
   extremes, so their box is lopsided by ~30px while every point is exactly
   where the camera put it. That check would fail a correct board and send the
   next session tuning offsets into a system that has none.

6. **POSITION MEANS SOMETHING, AND ZOOM MEANS SOMETHING.** Nodes used to sit at
   `radius = √(i/n)`, `angle = i × goldenAngle` — position by DISCOVERY ORDER,
   which is to say position meant nothing: neighbours were unrelated and zooming
   magnified a random scatter. At 21 concepts the labels already collided; the
   dataset holds 4,096.
   `src/render/layout.ts` now places concepts by the taxonomy the dataset
   already ships (`p` = parent index, a tree rooted at `entity`):
   **radius is depth**, **angle is inherited** — a concept owns a sector of its
   parent's sector, so a subtree is a wedge you can zoom into and find only
   related things — and **weight is the width of that sector**, i.e. measured
   taxonomic generality, which drives both dot size and whether a node is drawn.
   Siblings split their parent's wedge EQUALLY. Proportional-to-subtree-size was
   written first and a test caught the cost: one new leaf changes its parent's
   size, its grandparent's share, and re-divides the whole circle — every
   discovery moving all 240 nodes, the exact complaint the spiral was replaced
   to fix. Equal shares confine movement to the branch that actually changed.
   `levelOfDetail` culls by the rim a concept owns at the current scale, rolls
   the rest up into their nearest VISIBLE ancestor with a count (a superclass
   standing in for its members is what a superclass means), and decides labels
   against each label's OWN width — one shared constant made "set" and
   "psychological feature" ask for identical room, so the long ones overlapped.
   Measured on the shipped dataset at the 240-anchor cap: 32 dots and 18 labels
   at rest, 187 dots at 5×, everything by 18×.
   Layout and LOD are pure functions over an injected `parentOf`, so this is the
   first time placement has been unit-testable at all — including against the
   real 4,096-concept tree, which no browser test can reach at 18s per
   discovery.

7. **THE PLAYER CAN ALWAYS GET BACK.** Pinch-zoom inside this page has trapped
   its player twice, so the rules are written down, not felt out: the stage is
   never `position: fixed`; gestures are captured on the stage ELEMENT only, so
   the header and dock stay ordinary page; if the BROWSER is already zoomed
   (`visualViewport.scale > 1.05`) we set `touch-action: auto` and handle
   nothing, because someone fighting out of an accidental page zoom must not
   also be fighting us; and a Reset control is on screen whenever the view has
   been moved.

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
