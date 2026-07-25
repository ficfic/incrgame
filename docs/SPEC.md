# Technical spec — the M0/M1 spine

The concrete contracts M0/M1 need before any engine code. Everything here is
**additive-by-construction** (the save-safety rule). Numbers are tunable; shapes
are the contract. This doc is the single source of record for the engine surface —
if it disagrees with another doc, fix the other doc.

## Types

```ts
type Dec = string;   // break_eternity Decimal, serialized as string (NOT JSON-native)

type ResourceId =
  | 'data' | 'triples' | 'entities' | 'taxonomies' | 'ontologies' | 'twins'  // the ladder
  | 'capital';                                                                 // hard currency

type GeneratorId = 'harvester' | 'extractor' | 'reasoner' | 'aiAgent' | 'orchestrator';

type DomainId = 'general';  // seed value; the domain tech-tree is in-vision but the type must exist

// The ordered refinement ladder (data → … → twins). capital is NOT on it.
const TIER_LADDER: ResourceId[] = ['data','triples','entities','taxonomies','ontologies','twins'];
```

## GameState (the root; the save is this, versioned)

```ts
interface GameState {
  saveVersion: number;                     // the ONE version authority (see Save); starts at 1
  lastTick: number;                        // epoch ms of last processed tick
  rngState: number;                        // mulberry32 seed/state (see RNG)
  resources: Record<ResourceId, Dec>;      // current balances
  lifetimeCapital: Dec;                    // total $ ever earned — the prestige anchor
  generators: Record<GeneratorId, number>; // owned counts (integers)
  flags: Record<string, boolean>;          // narrative/unlock/event flags
  coverage: Record<DomainId, number>;      // 0..1 per domain (persists across prestige)
  reflection: number;                      // prestige multiplier level (persists)
}
```

Only **source of truth** is stored. Production/sec, current costs, and multipliers
are **computed** from state + content — never stored (no drift, tiny saves).

## Engine surface — ONE reducer

`apply(state, action) => state` is the **sole** pure entry point. `tick` is sugar:

```ts
const tick = (s: GameState, dt: number) => apply(s, { type: 'tick', dt });
```

(There is no separate `tick` function to maintain and no "entry point #1/#2" — one
reducer, one place state changes. ARCHITECTURE.md is aligned to this.)

## Resources — DISTINCT tiered resources

The ladder tiers are **distinct, non-fungible resources** with one-directional
refinement, each **sellable at its own tier's price**. This is what gives sell-vs-
keep real depth (sell cheap Triples now, or refine into a Twin worth orders of
magnitude more, slower). `capital` (`$`) is the hard currency you earn by selling
and spend on generators/compute.

## Action union

```ts
type Action =
  | { type: 'tick';  dt: number }                 // dt in SECONDS
  | { type: 'manualConnect' }                      // M1: +1 `data` per action
  | { type: 'buyGenerator'; id: GeneratorId }      // deducts generator.costResource
  | { type: 'refine'; from: ResourceId }           // from ∈ TIER_LADDER (not 'capital'); one tier up
  | { type: 'sell'; id: ResourceId; amount: Dec }  // consumes `id`, yields `capital`
  | { type: 'reviewBatch'; keep: boolean[] }       // HITL (in-vision)
  | { type: 'chooseOption'; eventId: string; choiceId: string }
  | { type: 'reflect' };                           // prestige
```

`apply` is pure. Actions that draw randomness MUST thread the new seed back into
returned state (see RNG). M0/M1 actions (`tick`/`manualConnect`/`buyGenerator`)
are fully deterministic — no RNG needed until M3.

## Tick model

- **Fixed logical step: 10 Hz** (`dt = 0.1s`), independent of render FPS.
- Production accrues as `rate × dt` (rate is per-second, dt in seconds — units agree).
- Fixed step ⇒ deterministic ⇒ reproducible in tests.
- **Offline does NOT reuse the tick action with a giant dt** — it uses the direct
  offline calc below, so the fixed-step invariant is never violated.

## RNG — mulberry32, PURE, state in the save

```ts
// pure: returns [value in [0,1), next seed]. Store the next seed in GameState.
function nextRand(seed: number): [number, number] {
  let a = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}
```

Every randomness-consuming action returns `{ ...state, rngState: newSeed }`. This
is what makes CYOA firing / agent errors deterministic across save/load (no
save-scumming). Do NOT use `Math.random` anywhere in `core/`.

## Save format & migrations

- **One version authority:** `state.saveVersion`. A named const
  `CURRENT_SAVE_VERSION` is the migration `target`.
- Envelope: `{ version: state.saveVersion, state }` → `JSON.stringify` → **base64**
  = the save blob. (The envelope `version` mirrors `state.saveVersion`; state is
  authoritative.)
- **Decimals serialize as strings** (`toString`), rehydrated in `numbers.ts`
  (`fromValue`). This is the #1 save footgun.
- Migrations: an ordered array of pure steps `(s)=>s`, each `vN → vN+1`; on load,
  apply every step where `s.saveVersion < CURRENT_SAVE_VERSION`. Never mutate a
  field's meaning without a migration that preserves old saves.
- **Storage medium: IndexedDB, not localStorage** — localStorage is iOS-evictable
  (~7 idle days) and would break the "never break a save" guardrail. Call
  `navigator.storage.persist()` to request durable storage.
- **Export/Import = the same base64 blob to/from clipboard** (the escape hatch —
  keep it non-optional; it's the only recovery if the OS evicts storage anyway).

## Offline progress

- On load: `elapsedMs = clamp(now - lastTick, 0, OFFLINE_CAP)`;
  `OFFLINE_CAP = 8 * 3600 * 1000` (ms; 8h, tunable).
- Gain per resource = `rate × (elapsedMs / 1000)` — **convert ms→seconds** or you
  overshoot 1000×.
- **Freeze compounding multipliers at logout:** with multipliers frozen, offline
  production is linear, so this single big-step calc is *exact* (don't integrate
  the inference feedback loop over the gap).
- Show a "while you were away…" summary on return (doubles as a retention pull).

## Content data types (the M1 source of record)

```ts
interface Generator {
  id: GeneratorId; label: string;
  baseCost: Dec; costRatio: number; costResource: ResourceId;  // cost(n)=baseCost×costRatio^n of costResource
  baseRate: Dec; produces: ResourceId;                          // output/sec of `produces`
}
interface Refinement { from: ResourceId; to: ResourceId; ratio: number } // `ratio` of `from` → 1 `to`
interface FieldNote {
  id: string; gameTerm: string; realTerm: string; glossaryRef: string;
  oneLineTruth: string; simplificationLabel?: string; learnMore?: string;
}
```

M1 Harvester = `{ id:'harvester', label:'Ingestion Pipeline™', baseCost:'15',
costRatio:1.15, costResource:'data', baseRate:'0.1', produces:'data' }`. Content
lives in `src/content/` as typed TS (the source of record for M1).
`docs/graph/game.ttl` is a **design artifact**, not yet the runtime pipeline (it
lacks `baseRate`/`costRatio`/`costResource`).

## Economy interface (reconciled with tiered resources — see ECONOMY_MODEL.md)

- Output is **per-`ResourceId`** (each generator `produces` one resource) — NOT a
  summed single "K".
- Selling: `$gained = amount × marketPrice(resourceId, domain) × Q`;
  `sell` consumes `resourceId`, yields `capital`. `marketPrice` is keyed by
  **(ResourceId, DomainId)**.
- Prestige anchor is **`lifetimeCapital`**:
  `reflectionLevel = floor((lifetimeCapital / T) ^ (1/3))`.

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
- **Vite `base: '/incrgame/'`** (project Pages subpath) — wrong base = blank page.
  Owner `ficfic`, URL `https://ficfic.github.io/incrgame/`.

### ⚠️ Owner-side prerequisites (a container CANNOT do these — do them by hand)

1. **GitHub → Settings → Pages → Source = "GitHub Actions".**
2. Decide the **deploy branch** and point the workflow `on: push: branches:` at it
   (there is currently no `main`; work is on `claude/incremental-game-github-pages-w7pvk6`).
3. **Enable push protection / secret scanning** (the real server-side secret gate;
   our commit hook is advisory and MCP-bypassable).
4. **Verify install + standalone on the physical iOS device** (Safari fallback if
   Edge won't install).
