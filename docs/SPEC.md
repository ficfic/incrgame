# Technical spec — the M0/M1 spine

The concrete contracts M0/M1 need before any engine code. Everything here is
**additive-by-construction** (the save-safety rule). Numbers are tunable; shapes
are the contract.

## GameState (the root; the save is this, versioned)

```ts
type Dec = string;                    // break_eternity Decimal serialized as string

interface GameState {
  saveVersion: number;                // starts at 1; only ever increases
  lastTick: number;                   // epoch ms of last processed tick (for offline calc)
  rngState: number;                   // mulberry32 state (see RNG); persists → determinism survives save
  resources: Record<ResourceId, Dec>; // balances, as Decimal strings
  generators: Record<GeneratorId, number>; // owned counts (integers)
  flags: Record<string, boolean>;     // narrative/unlock/event flags
  coverage: Record<DomainId, number>; // 0..1 per domain (persists across prestige)
  reflection: number;                 // prestige multiplier level (persists across prestige)
}
```

Only **source of truth** is stored. Production/sec, current costs, multipliers are
**computed** from state + content — never stored (no drift, tiny saves).

## Resources — the ladder is DISTINCT tiered resources (contradiction resolved)

Resolves the "one K vs five resources" ambiguity: they are **distinct resources**
with one-directional refinement, **sellable at any tier at that tier's price**.
This is also what gives sell-vs-keep real depth (sell cheap Triples now, or refine
into a Twin worth orders of magnitude more but slower).

`ResourceId = 'data' | 'triples' | 'entities' | 'taxonomies' | 'ontologies' | 'twins' | 'capital'`

(Note: this makes the game's own model TBox/ABox-imperfect on purpose — labeled in
`SIMPLIFICATIONS.md`.)

## Action union (engine entry point #2)

```ts
type Action =
  | { type: 'tick';  dt: number }              // dt in SECONDS
  | { type: 'manualConnect' }                   // M1: produces `data` (see note)
  | { type: 'buyGenerator'; id: GeneratorId }
  | { type: 'refine'; from: ResourceId }        // refine one tier up
  | { type: 'sell'; id: ResourceId; amount: Dec }
  | { type: 'reviewBatch'; keep: boolean[] }    // HITL (in-vision)
  | { type: 'chooseOption'; eventId: string; choiceId: string }
  | { type: 'reflect' };                        // prestige
```

`apply(state, action) => state` is pure. `manualConnect` outputs **`data`** in M1
(clean single-resource start); the "connecting nodes = edges/triples" theme
reconciles at M3 when Triples arrive — noted so it isn't silent.

## Tick model

- **Fixed logical step: 10 Hz** (`dt = 0.1s`), independent of render FPS.
- Production accrues as `rate × dt`. Render (Svelte/Pixi) reads state at any FPS.
- Fixed step ⇒ deterministic ⇒ reproducible in tests.

## RNG — mulberry32, state in the save

```ts
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
```

`rngState` lives in `GameState` so randomness (CYOA firing, agent errors) is
deterministic across save/load — no save-scumming. Chosen for size + speed.

## Save format & migrations

- Envelope: `{ version, state }` → `JSON.stringify` → **base64** = the save blob.
- **Decimals serialize as strings** (`toString`), rehydrated in `numbers.ts`
  (`fromValue`). They are NOT JSON-native — this is the #1 save footgun.
- Migrations: an ordered array of pure steps `(s)=>s`, each `vN → vN+1`; on load,
  apply every step where `s.saveVersion < target`. Never mutate a field's meaning
  without a migration that preserves old saves.
- **Export/Import** = the same base64 blob to/from clipboard (the escape hatch).

## Offline progress

- On load: `elapsed = clamp(now - lastTick, 0, OFFLINE_CAP)`; `OFFLINE_CAP = 8h`
  (tunable knob).
- **Freeze compounding multipliers at logout** — compute offline gain against the
  *saved* graph state, do NOT integrate the inference feedback loop over the gap
  (that's the one genuinely non-trivial bit; freezing keeps it correct + cheap).
- Show an "while you were away…" summary on return (doubles as a retention pull).

## Content data types (the M1 source of record)

```ts
interface Generator { id: GeneratorId; label: string; baseCost: Dec; costRatio: number; baseRate: Dec; produces: ResourceId }
interface FieldNote { id: string; gameTerm: string; realTerm: string; glossaryRef: string; oneLineTruth: string; simplificationLabel?: string; learnMore?: string }
```

Content lives in `src/content/` as typed TS (the source of record for M1).
`docs/graph/game.ttl` is a **design artifact**, not yet the runtime pipeline
(it lacks `baseRate`/`costRatio`) — promoted to source later. Documented so the
two don't silently drift.

## Deploy target (for M0)

- GitHub Pages via Actions (`actions/deploy-pages`, `permissions: pages:write,
  id-token:write`); Pages source = GitHub Actions.
- **Vite `base: '/incrgame/'`** (project Pages subpath) — wrong base ships a blank
  page; this is the classic failure. Repo owner `ficfic`, URL
  `https://ficfic.github.io/incrgame/`.
- Pages *settings* are repo-config, not code — they don't travel in a clone.
