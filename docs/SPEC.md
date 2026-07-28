# Technical spec — the M0/M1 spine

> ## ⚠️ `src/core/types.ts` IS THE CONTRACT. This file is the surroundings.
>
> Rewritten 2026-07-28 against the shipped code, at save **v16**. This document
> used to carry a `GameState` sketch and an action union and call itself the
> source of record; both went stale, twice, and a session believed them. The
> engine surface below is now a **summary with a pointer**, deliberately, so
> there is only one place it can be wrong.
>
> What is still authoritative here and was re-verified today: the save envelope,
> IndexedDB, the tick model, the offline model, the PWA/iOS contract, the deploy
> pipeline, and the concept-data contract.
>
> Note that **"additive-by-construction" is void.** The owner reversed the
> save-safety rule on 2026-07-27 ("i'm completely ok with breaking saves at any
> time"); migrations are now optional and v16 has none.


The concrete contracts the game needs outside the engine's own type file.
Numbers are tunable; shapes are the contract. If this file disagrees with
`src/core/types.ts`, the type file wins and this file is a bug.

## Types — see `src/core/types.ts`

```ts
type Dec = string;   // break_eternity Decimal, serialized as string (NOT JSON-native)

type MachineId     = 'extractor' | 'reasoner' | 'checker';
type FactMachineId = 'extractor' | 'reasoner';   // the ones that carry the watched toggle
```

There is no `ResourceId`, no `TIER_LADDER`, no `GeneratorId`, no `DomainId` and
no hard currency. Every price in the game is in **Solid**.

## GameState (the root; the save is this, versioned)

**Twelve fields.** Do not re-copy them here — read the annotated source. The
shape, for orientation only:

```
version · lastTick                       bookkeeping
solid · raw · rot                        one substance, three states
held[] · stepsThisRun                    the board, and what the next step costs
machines{…} · watched{…}                 inventory, and speed-vs-truth
generation · syntheticShare · minted     what a Retrain carries
```

**Words is DERIVED**, never stored: `held` minus the seed (`literacy.bound()`).
That is the rule that stops the board, the income cap, the story position and
the readout from disagreeing — the defect this whole rewrite existed to kill.

Only **source of truth** is stored. Production/sec, current costs, and multipliers
are **computed** from state + content — never stored (no drift, tiny saves).

## Engine surface — ONE reducer

`apply(state, action) => state` is the **sole** pure entry point. `tick` is sugar:

```ts
const tick = (s: GameState, dt: number) => apply(s, { type: 'tick', dt });
```

(There is no separate `tick` function to maintain and no "entry point #1/#2" — one
reducer, one place state changes. ARCHITECTURE.md is aligned to this.)

## Resources — one substance, three states

Solid, Raw and Rot are the same facts at different stages of being trusted, and
are drawn as **one stacked bar** so the screen holds two objects and not four.
Solid is the only thing you spend; Rot only ever accumulates. Words are not a
resource at all — they are the concepts you hold, and they cap production.

## Action union

```ts
type Action =
  | { type: 'tick'; dt: number; now?: number }   // dt in SECONDS; optional `now` (epoch ms)
                                                 //   advances lastTick purely (no Date.now in core)
  | { type: 'walk'; to: number }                 // a lane step. Costs Solid; 0 if already held
  | { type: 'check' }                            // 5 Raw → Solid, by hand, no cooldown
  | { type: 'buy'; id: MachineId }               // costs Solid
  | { type: 'setWatched'; id: FactMachineId; watched: boolean }
  | { type: 'retrain' };                         // prestige
```

Four verbs, plus the clock and the toggle. `apply` is pure, and **every gate is
enforced in the reducer, not on the button** — the play probe force-clicks, and
a gate that lives in the UI is a gate that does not exist.

## Tick model

- **Fixed logical step: 10 Hz** (`dt = 0.1s`), independent of render FPS.
- Production accrues as `rate × dt` (rate is per-second, dt in seconds — units agree).
- Fixed step ⇒ deterministic ⇒ reproducible in tests.
- **Offline does NOT reuse the tick action with a giant dt** — it uses the direct
  offline calc below, so the fixed-step invariant is never violated.

## RNG — there is none

`src/core/rng.ts` and `rngState` were **deleted** on 2026-07-28 with the rest of
the old economy. Nothing in the engine draws randomness: production, decay,
prices and the story graph are all exact functions of state, so the sim is
deterministic without a seed to carry. `npm run check:core` still forbids
`Math.random` in `src/core/`. If a future mechanic genuinely needs chance, put
a pure seeded generator back and thread the new seed through the returned state
— never `Math.random`.

## Save format & migrations

- **One version authority:** `state.version` (renamed from `saveVersion` at v16).
  `CURRENT_SAVE_VERSION` lives in `engine.ts` and is **16**.
- Envelope: `{ version: state.version, state }` → `JSON.stringify` → **base64**
  = the save blob. The envelope `version` mirrors state; state is authoritative.
  Base64 is hand-rolled over UTF-8 in `save.ts` — no `btoa`/`atob`, because core
  stays environment-free.
- **Decimals serialize as strings** (`toString`), rehydrated in `numbers.ts`.
  This is the #1 save footgun.
- **Migrations are OPTIONAL** (owner, 2026-07-27). There are none at v16: the
  fifteen-step chain was deleted with the twenty-three fields it existed to
  carry. `deserialize` returns `{ state, reset, notice }` — a blob that is not
  v16 is rebuilt as a fresh run, its **concepts are kept**, and `notice` says so
  in words. A reset the player is not told about is still a defect.
  `version` stays on every save for exactly this: so the code can *tell* which
  format it holds and reset deliberately instead of crashing.
- Same-version loads **backfill per record, not just top-level**. A one-level
  spread once let a newly-added `MachineId` arrive `undefined`, `buy` compute
  `NaN`, and `JSON.stringify(NaN)` write `null` — a bricked save with no error.
- **Storage medium: IndexedDB, not localStorage** — localStorage is iOS-evictable
  (~7 idle days). Call `navigator.storage.persist()` to request durable storage.
- **Export/Import = the same base64 blob to/from clipboard.** Non-optional: it is
  how the owner moves a save between devices, and the only recovery if the OS
  evicts storage anyway. A bad paste throws and leaves the running save
  untouched.

## Offline progress

- On load: `elapsedMs = clamp(now - lastTick, 0, OFFLINE_CAP)`;
  `OFFLINE_CAP = 8 * 3600 * 1000` (ms; 8h, tunable).
- Gain per resource = `rate × (elapsedMs / 1000)` — **convert ms→seconds** or you
  overshoot 1000×.
- **Freeze compounding multipliers at logout:** with multipliers frozen, offline
  production is linear, so this single big-step calc is *exact* (don't integrate
  the inference feedback loop over the gap).
- Show a "while you were away…" summary on return (doubles as a retention pull).
- **Nothing rots while you are away**, and away time respects the watched/loose
  split you left set — Checkers run too, bounded by the Raw actually available
  over the gap. Absence banks work; you never come back to damage.

## Content data types

```ts
interface Machine {
  id: MachineId; label: string;
  rate: number;                 // facts/s per unit at FULL SPEED
                                //   (for the Checker: Raw CONVERTED per second)
  baseCost: Dec; costRatio: number;   // cost(n) = ceil(baseCost × costRatio^n), in Solid
}
interface FieldNote {
  id: string; gameTerm: string; realTerm: string; glossaryRef: string;
  oneLineTruth: string; simplificationLabel?: string; learnMore?: string;
}
```

Three machines, in `src/content/machines.ts` — **tune balance there, never in
the engine**: Extractor `0.4/s @ 20×1.15`, Reasoner `2.2/s @ 320×1.18`, Checker
`0.25 Raw→Solid/s @ 45×1.16`. The story graph's shape is in `types.ts`
(`StoryBeat` / `StoryChoice` / `StoryGraph`) and is emitted by
`scripts/build-story.mjs` with numeric node ids throughout.
`docs/graph/game.ttl` is a **design artifact**, not the runtime pipeline.

## Economy interface

```
factsPerSecond = min(0.4 × factMachines, 0.15 × Words)     the lane join
stepCost       = 0 if held, else ceil(6 × 1.04^stepsThisRun)
watched        = 0.55× rate, output arrives Solid;  loose = 1.0×, arrives Raw
rotPerSecond   = 0.002 × (1 + 3 × syntheticShare)          of the Raw pile
Retrain        at Words ≥ 120: keep concepts, reset stepsThisRun,
                 inherit 25% of `minted` as Raw, raise syntheticShare
```

The cap is applied **before** the watching penalty, and the order is
load-bearing: applied after, a vocabulary-bound player pays nothing for
watching, and the game's only decision evaporates exactly where the join binds.
Checkers are excluded from `factMachines` — they convert rather than produce, so
counting them would raise a ceiling on production they do not perform.

## PWA / install (iOS-first — this is the M0 "installable" contract)

The primary target is **iOS**, played vertically. iOS fails these *silently*, so
spec them explicitly and **verify on a physical device at M0** (a container can't):

- **`index.html` head must include:**
  - `<link rel="apple-touch-icon" href="/incrgame/icon-180.png">` — iOS ignores
    the manifest `icons` for the home-screen icon; omit this and you get a blurry
    page screenshot.
  - `<meta name="apple-mobile-web-app-capable" content="yes">` and
    `<meta name="mobile-web-app-capable" content="yes">` — for full-screen
    standalone (the "vertical play").
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
    and `<meta name="apple-mobile-web-app-title" content="Semantic Drift">`.
  - `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- **Web app manifest:** `name`, `short_name:"Semantic Drift"`, `display:"standalone"`,
  `start_url:"/incrgame/"`, `scope:"/incrgame/"`, `background_color`, `theme_color`,
  and `icons` (192 + 512 png, plus a maskable). `start_url`/`scope` **must equal the
  Vite `base`** or the installed app boots to a 404.
- **Service worker:** use `vite-plugin-pwa` (Workbox), SW **scope `/incrgame/`**,
  precache the app shell for offline launch. A scope mismatch = SW never controls
  the page = blank on offline launch.
- **`.nojekyll`** at the Pages root (GH Pages/Jekyll strips `_`-prefixed files).
- **⚠️ iOS Edge caveat:** reliable "Add to Home Screen" standalone install has
  historically been **Safari-only** on iOS; third-party browsers may produce a
  bookmark, not a standalone app. If Edge fails at M0, document "install via
  Safari" as the supported path.
- **No `beforeinstallprompt` on iOS** — install is a manual Share → Add to Home
  Screen. Optionally show a one-time hint.

## Deploy (for M0)

- **The pipeline must be committed** (`.github/workflows/deploy.yml`): build job =
  `npm ci` → typecheck → `vitest run` (**tests gate the deploy**) → **core-purity
  check** (grep `src/core/**` for `window`/`document`/imports from `ui`/`render` →
  fail if found; the full ESLint boundary rule stays deferred but this cheap guard
  protects the one irreversible decision) → `vite build` →
  `actions/upload-pages-artifact` (dir `dist`) → `actions/deploy-pages`.
- `permissions: { contents: read, pages: write, id-token: write }` (least
  privilege — do not inherit broad defaults). Add a `concurrency` group.
- **Trigger branch (PINNED):** `on: push: branches: [ claude/incremental-game-github-pages-w7pvk6 ]`
  — there is **no `main`**; deploy directly from the working branch. Do NOT
  default the workflow to `main` or it will never fire.
- **Vite `base: '/incrgame/'`** (project Pages subpath) — wrong base = blank page.
  Owner `ficfic`, URL `https://ficfic.github.io/incrgame/`.

### ⚠️ Owner-side prerequisites (a container CANNOT do these — do them by hand)

1. **GitHub → Settings → Pages → Source = "GitHub Actions".** ✅ *(done by owner)*
2. **Deploy branch = the working branch** `claude/incremental-game-github-pages-w7pvk6`
   (no `main`) — already pinned in the workflow `on:` above. Nothing to decide.
3. **Enable push protection / secret scanning** (do anytime — the real
   server-side secret gate; our commit hook is advisory and MCP-bypassable).
4. **Verify install + standalone on the physical iOS device** *after* the first
   successful deploy (Safari fallback if Edge won't install).

---

## Concept data — the ontology contract (added 2026-07-25)

The game's concepts are **real data**, not generated content: Open English
WordNet, CC BY 4.0, pinned to `2025-edition`, CURATED to a 4,096-concept subset.
Licence trail: `docs/ATTRIBUTION.md`.

### Generation

`scripts/build-ontology.mjs` (`npm run ontology`) shallow-clones the pinned
upstream into `.ontology-src/` (gitignored), parses the 45 lexicographer files,
and writes `public/ontology/`. The generated output **is committed** — deploys
are hermetic and CI never touches the network for content.

### On-disk shape

```
public/ontology/index.json      manifest: source, edition, commit, licence,
                                licenceUrl, attribution, noticeUrl,
                                concepts, chunkSize, chunks, categories[26]
public/ontology/LICENSE.txt     the notice, shipped WITH the data (CC BY §3(a)(1))
public/ontology/cNNN.json       chunk of `chunkSize` concepts, arrays aligned:
                                l[] label · d[] domain index · p[] parent index
                                (-1 = a root) · g[] definition, verbatim
```

Chunk size is **1024**. The whole dataset is ~348 KB; a fresh save needs only
`c000.json`. `LICENSE.txt` ships alongside because the WordNet licence requires
its notice to travel with every copy of the database, and `docs/` is never
deployed.

### Selection ⚠️

Nouns **reachable from `entity`** only — so the shipped set has exactly ONE root
and the hierarchy claim is true. Senses the source marks as slurs are excluded.
One concept per word form. Capped at `CONCEPT_BUDGET`. A concept whose own parent
was rejected re-parents to its nearest accepted ancestor, so the result is always
a connected tree with no dangling parents (asserted by the generator and by
`test/ontology.test.ts`).

`src/content/ontologyMeta.ts` carries `CONCEPT_BUDGET` (4,096) and
`READABLE_CONCEPTS` (4,075 — what a player can actually reach through gated
lanes) for the engine, which needs the denominator but must not fetch. Tests
keep both in sync with the shipped data: `test/ontology.test.ts` and
`test/reachability.test.ts` fail first if either dataset is re-cut.

### The frozen ordering contract ⚠️

Concepts are ordered **breadth-first from `entity`**, WordNet's unique beginner
for nouns. Ties break on `(label, synset id)`, so the order is reproducible from
the pinned source. The generator VERIFIES the cached checkout is at the pinned
commit before reading it — a stale cache would otherwise renumber the world under
a manifest still claiming the pinned edition.

**A save stores integer node ids, and node id N means "concept index N mod
total".** Therefore the ordering is a save-visible contract with the same status
as a migration fossil:

- **Do not** bump `SRC_REF` casually — a newer edition renumbers the world and
  silently relabels every node in the owner's save.
- Bumping it is a deliberate decision requiring a logged entry in
  `docs/DECISIONS.md` and a plan for existing saves.
- The recovery order must stay a pure function of the pinned source. No RNG.

### Runtime rules

- The loader is `src/shell/ontology.ts`. **`src/core/` must never import it** —
  the engine knows only integer node ids and stays pure (CI greps for this).
- Loading is lazy and failure-tolerant: a missing or failed chunk degrades to an
  unlabelled node, never a crash or a stall. The game is playable offline before
  any chunk has ever loaded.
- Chunks are **runtime-cached** by the service worker (CacheFirst,
  `ontology-v1`), never precached — 8.6 MB would be a rude install.
- Definitions are rendered **verbatim**. Nothing in this pipeline may synthesise
  a sentence (see `CLAUDE.md`).
- Attribution renders in-game from `index.json`, so it cannot drift out of sync
  with the data it credits. **Do not remove it** — CC BY requires it.
