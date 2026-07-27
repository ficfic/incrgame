# Decision log

Append-only, **chronological: oldest at the top, newest at the bottom.**

(The header used to say "newest at the top" and three sessions running appended
at the bottom anyway. Reordering ~500 lines of history to match a preference
nobody has followed is churn with a real risk of losing an entry, so the
convention was corrected to match the file. Append at the END.)

One entry per non-trivial decision so a future session knows *why* things are
the way they are. Format:

`YYYY-MM-DD — <decision> — <one-line why> (alternatives rejected, if notable)`

---

- 2026-07-25 — **FRONTIER MINING (owner core-loop fork, save v4).** Owner asked
  why a currency counter exists at all and wanted to *work the graph in the
  GUI*. Full agent review first (Redditor: conditional FRONT PAGE MATERIAL;
  Chad: NEEDS ANOTHER ROUND with numbers; The Graph: DRIFT DETECTED, amendment
  required before code — this entry is that amendment). Owner picked Chad's
  **Frontier Mining** variant over the consensus Weaver loop, controls =
  button + canvas. The loop: **edges drip Datums** (a statement IS knowledge;
  0.15/s each), **Survey** (big button, free, frontier cap 8) reveals entities,
  **tapping a frontier entity on canvas** pays `ceil(5 × 1.08^edges)` Datums to
  wire it in, minting **+1 Triples**. Machines keep the 1.15 lane; Extractor
  (M3) automates claiming into aggregates by ~minute 9 (no-babysitting rule).
  - **Amendment (per The Graph):** graph = forged overlay + balances. Forged
    edges mint `triples` (Dec) — *the balance is the balance sheet*; the pair
    list is bounded display/interaction state (anchors ≤240, links ≤512,
    oldest fold into aggregates). Explicit pairs come only from player
    actions; machines forge into aggregates. Supersedes "exact projection";
    upholds "graph counters are never balance inputs."
  - **Drip stays "Datums", never "Inference"** (Redditor + Chad, independently):
    inference = deriving edges from edges — the Reasoner's output, not fuel.
    Naming the drip Inference would teach players something false.
  - **Buying no longer trims the web** — knowledge isn't spent, fuel is. The
    earlier trim behavior died with the model that caused it.
  - **Migration v3→v4 credits the old web**: its projected edges mint triples
    (the drip starts at the size of the web the owner grew), nodes become
    folded mass. Verified in-browser: 1000-Datum v3 save → 69-edge drip.
  - manualConnect is now an inert no-op (action-surface stability).
  - `projectGraph` band tables are FROZEN as migration fossils — used only to
    interpret pre-v4 saves; do not retune them.
- 2026-07-25 — **Flush button + wandering touch FX (owner playtest #3).**
  "Flush project" in the footer wipes the save and restarts — the ONE
  sanctioned death of progress, gated behind a two-tap arm/confirm (4s window)
  to honor the never-break-a-save rule. Threshold-less taps no longer ripple
  the hub: each tap illuminates a DIFFERENT connection (seq walks the drawable
  edges; falls back to walking nodes while relations are rare) — owner asked
  for a different highlight per connect.
- 2026-07-25 — **Projection retune + FX fix (owner playtest #2, save v3).**
  Owner: same node flickered on threshold-less taps, and the graph grew too
  fast — "much more datums to create a node and even more to create an edge."
  Changes: mined substance is **Datums** again (`data` internally; Triples
  returns as the refined M3 tier); projection slowed to bands — node per
  3→10→30→100 datums, edge per 25→12→5 (edges RARER than nodes early — lonely
  dots seeking relations — then denser late, so the world's texture matures);
  renderer FX are now typed per event: node birth = pulse, edge birth = bright
  edge flash, threshold-less tap = hub ripple (no more same-node flicker).
  Migration v2→v3 consolidates balances back into `data`, 1:1, both hops safe.
  First edge (~40 datums) is a ticker moment (`edges:1` trigger added).
- 2026-07-25 — **ONE SUBSTANCE (owner fork, save v2).** Owner asked "why do we
  even have a data counter" — answer: we shouldn't, yet. Early game runs on
  **Triples only**: Connect asserts a triple (+1 edge), the headline counter IS
  the graph, machines cost Triples so **buying visibly trims the web** (Cookie
  Clicker precedent: you spend the cookies you bake). `graph` is now an **exact
  projection** of `resources.triples` (`core/graph.ts`): edges = floor(triples),
  entities emerge in decaying bands (every 1st triple → every 2nd → 3rd → 4th) —
  novelty decays like real KG growth, and the 1-tap-=-1-node opening magic is
  preserved. Consequences: RNG retired again until M3 (crosslink/ambient bridges
  deleted — The Graph's objections dissolved by construction); offline now grows
  the web exactly and for free; **first real migration shipped** (v1→v2: `data`
  balances convert 1:1 into `triples`, never reset). "Datums" returns at M3 as
  the raw feedstock (Harvester→Datums, Extractor→Datums-to-Triples). M3
  inference multiplier reads `resources.triples` (Dec), never graph counters.
- 2026-07-25 — **Owner decisions via chips (post-M1.5):** tier-1 resource is
  named **"Datums"** (label only; `ResourceId 'data'` unchanged — ids are
  save-stable). **Polish-the-first-5-minutes round before M3** (owner override
  of all three agents' M3-first recommendation — their call to make). **Ticker:
  owner will write the flavor lines** — system shipped with mechanical
  fallbacks only; trigger list in `docs/TICKER_LINES.md` awaits their pen.
- 2026-07-25 — **Polish round shipped:** Paperclips-style event ticker
  (shell-side, observes state transitions, prose guardrail enforced in code
  comments), +1 float feedback on Connect, graph pulse on purchase (fuel →
  structure made visible, per Redditor finding #4).
- 2026-07-25 — **M1.5 feedback round** (owner playtest + three review agents:
  Chad `NEEDS ANOTHER ROUND`, Redditor `FINE, I GUESS`, The Graph `DRIFT
  DETECTED` — all three converge on "ship M3 next"). Changes:
  - **Costs are whole units** — `cost(n) = ceil(base × ratio^n)` — and the
    headline counter displays `floor(balance)` (genre law per Redditor: Cookie
    Clicker/AD do exactly this); decimals remain internal and on the /s rate.
  - **Seeded RNG pulled forward to M1.5** for graph texture: `manualConnect`
    cross-links (35%), ambient growth on producing ticks (0.3%/tick ≈ 1.8
    nodes/min). Determinism preserved (seed threaded per SPEC); SPEC's "no RNG
    until M3" note amended. Fixes owner's "nodes always equal edges."
  - **Ambient growth off data production is an M1.5 BRIDGE** (owner: "something
    must at all times happen with the graph"). The Graph correctly objects that
    raw data should not manufacture structure — accepted: at **M3 the graph
    rebinds** to a projection of triples/entities balances (edges←triples,
    nodes←entity emergence) and this bridge is deleted. Fuel-vs-structure then
    becomes legible, and M4 selling visibly shrinks the graph (Chad's payoff).
  - **Offline freezes structure + RNG** (only resources accrue) — deliberate:
    per-tick RNG can't replay 288k rolls; revisit at M3 when the derived graph
    makes offline growth exact and free.
  - **Renderer**: LOD cap 72→240 with honest densification past cap (halo of
    unrendered mass, size scaling, surplus edges drawn as cross-chords — the
    old cap froze the picture at ~143 "things", the owner's exact complaint);
    always-alive (twinkle + slow rotation + continuous rAF); pan/pinch-zoom
    with reset; **palette hue drifts with log10(nodes)** and tints the whole
    UI via `--hue` (owner: colors change with progress).
  - **M3 seam noted (The Graph):** the inference multiplier must consume
    `resources.triples` (Dec), NOT `graph.edges` (JS number, 2^53 ceiling) —
    graph stays the bounded reward-surface projection, not balance input.
    Supersedes the earlier "edges feed the multiplier" line.
- 2026-07-25 — **M0+M1+M2 built** (session branch `claude/project-review-build-shub7f`).
  Build-session decisions, all additive:
  - **`graph: {nodes, edges}` added to `GameState` v1** — M1 needs the graph to
    grow per connect, and M3's inference multiplier consumes `edges`, so it must
    live in state (it's source data, not computable). SPEC updated to match.
  - **`tick` action gained optional `now` (epoch ms)** so `lastTick` advances
    without the engine touching `Date.now()` (purity). Absent `now`, lastTick
    advances by `dt`; tests stay deterministic.
  - **M1 graph renderer = thin canvas-2D** (`src/render/minigraph.ts`, LOD-capped
    at 72 drawn nodes) — "MVP stays thin"; PixiJS arrives at M3 when the bloom is
    the deliverable. Renderer is swappable per ARCHITECTURE, so zero engine impact.
  - **Deploy workflow triggers on the pinned branch AND the build-session branch,
    but the publish job runs only from the pinned branch** — the `github-pages`
    environment's protection rules reject non-default branches (verified: run #1's
    deploy job was rejected with no runner), so session branches get build+test CI
    and the Pages publish fires when work merges into the pinned branch. To deploy
    from other branches, the owner would add them under Settings → Environments →
    github-pages → deployment branches.
  - **TypeScript pinned to `~5.9`** — svelte-check 4 crashes on TS 7 (the native
    rewrite). Revisit when svelte-check supports it.
  - **Save-load backfills missing fields from `initialState`** (migrate
    additively) — new fields never hard-reset an old save; covered by a test.
- 2026-07-25 — **Pre-build technical review (The Graph + The Auditor) + fixes.**
  Verdicts: BUILDABLE WITH FIXES / CONDITIONS APPLY — all doc-level conditions now
  closed:
  - *The Graph P0:* enumerated `GeneratorId`/`DomainId`; added `costResource` to
    `Generator`; declared **`apply` the sole reducer, `tick` = sugar** (ARCHITECTURE
    aligned). *P1:* propagated tiered-resources into ECONOMY_MODEL (killed the
    single-`K` contradiction — output per-ResourceId, `marketPrice(resourceId,
    domain)`, prestige anchored to new `lifetimeCapital` field); made RNG a **pure**
    `nextRand(seed)->[v,seed]`; single save-version authority + `CURRENT_SAVE_VERSION`;
    offline ms→seconds fix + `OFFLINE_CAP` in ms; `TIER_LADDER` const + refine ratio.
  - *The Auditor:* added the missing **PWA/install section** to SPEC (apple-touch-icon,
    apple meta, manifest scope=`/incrgame/`, SW scope, `.nojekyll`, iOS-Edge caveat);
    **IndexedDB + `persist()`** for saves (not evictable localStorage); M0 deploy
    workflow spec with a **test gate + lightweight core-purity CI check** (overriding
    the roadmap's deferral of the purity guard); documented **owner-side
    prerequisites** (Pages source, deploy branch, push protection, device verify).
  - ROADMAP M0 expanded to a build sub-checklist; CLAUDE.md now points builders to
    ROADMAP→SPEC→ARCHITECTURE. Docs are build-ready for a fresh session.
- 2026-07-25 — **Five-agent gap analysis run + fixes applied.** All five reviewers
  swept the whole design; fixes landed:
  - *Technical spine* (The Graph): `docs/SPEC.md` defines GameState, Action union,
    10Hz tick, save envelope + Decimal-as-string + migration ladder, offline math +
    8h cap, mulberry32 RNG-in-state, content types, deploy base path. Currency
    contradiction resolved → **distinct tiered resources, sellable at any tier.**
  - *Anti-slop guardrails* (Redditor): CLAUDE.md now hard-forbids LLM-generated
    player-facing prose; HITL review made non-mandatory (Orchestrator auto-review).
  - *Accuracy* (Veritas): `docs/SIMPLIFICATIONS.md` register + Field Notes
    subsystem; glossary +Entity/ABox, TBox/ABox, forward-chaining, closure/fixpoint,
    monotonicity; split semantic-drift vs ontology-evolution; sameAs bad-merge;
    domains relabeled by kind; self-description seam labeled; OWA given a mechanic;
    digital-twin live-sync restored. README stops claiming inference is "(Real)".
  - *Design depth* (Chad): sell-vs-keep made a real choice (quality saturation +
    capital-gated compute); hazards given numbers (ex-falso Q→0.5+stall; lawsuit
    −40% $); prestige↔coverage interlock defined; CYOA choices must move a lever.
  - *Repo hygiene* (Auditor): added LICENSE (MIT + CC-BY-4.0 content), CONTRIBUTING,
    SECURITY (notes the hook is advisory → enable GitHub push protection); fixed
    stale stack in CLAUDE.md + README; render lib propagated to PixiJS everywhere;
    game.ttl scope-noted.
  - Deferred to backlog (need a prototype/judgment, not a doc): spreadsheet-prove
    the economy, verb ladder, first-five-minutes, domain-twist rules, QoL furniture,
    launch positioning.
- 2026-07-25 — **Fifth review agent: the-redditor (u/entropy_farmer)** — a jaded
  r/incremental_games veteran allergic to AI hype; reviews genre authenticity +
  community credibility (does it play like a real idle game; is the AI theme
  earned satire or pandering). Same rule: snark on top, honest genre judgment
  underneath.
- 2026-07-25 — **CLAUDE.md stack section updated** to point at ARCHITECTURE.md
  (was stale "vanilla TS + Vite"; the-auditor flagged the contradiction).
- 2026-07-25 — **Game title: _Semantic Drift_** — a real term (meaning shifting
  over time; ontology evolution / concept drift). Ominous, accurate, and
  thematically perfect (the graph rewrites meaning as it wakes). Repo stays
  `incrgame`. Applied to README, GAME_DESIGN, game.ttl, GLOSSARY.
- 2026-07-25 — **CYOA events fit the core architecture** — events are content
  data + engine flags + actions (choice = an action; `leadsTo` = forking; seeded
  RNG = deterministic firing). Emergent motivation + diegetic weirdness are
  flag-gated events. No special system. Documented in `ARCHITECTURE.md`.
- 2026-07-25 — **Phased build roadmap** (`docs/ROADMAP.md`) — durable, thin,
  shippable milestones M0–M4 for the MVP, then the in-vision ring. Task tracking =
  durable ROADMAP/BACKLOG + an ephemeral in-session checklist while building.
- 2026-07-25 — **Architecture: headless engine + swappable skins** — a pure,
  deterministic TypeScript engine (`tick`/`apply` over plain state) that knows
  nothing about the screen; UI and graph are swappable skins. This is the answer
  to "portable + fast iteration + go wild": wild only touches a skin. Captured in
  `docs/ARCHITECTURE.md`.
- 2026-07-25 — **Stack chosen: pure-TS engine · Svelte UI · PixiJS graph · Vite +
  PWA · Vitest** — supersedes the earlier "vanilla TS + Vite" note. Svelte
  compiles away (mobile-lean, fast iteration); PixiJS gives creative freedom for
  the graph; PWA enables installable iOS-vertical play; Vitest tests the engine
  headless. User deferred the framework/renderer picks to me ("i don't know"); all
  skins are reversible thanks to the engine split, so low-stakes.
- 2026-07-25 — **Core-purity rule** — `core/` must not touch the DOM or import
  UI/render; content is data; state is serializable + versioned. Protects
  portability; candidate ESLint boundary guardrail; `the-graph` reviewer enforces.
- 2026-07-25 — **Design-as-triples (dogfooding), scoped** — model the game's
  *structured* content (resources, generators, domains, mechanics, costs) as real
  RDF/Turtle in `docs/graph/game.ttl`; keep narrative/rationale as prose. Validated
  (74 triples parse via rdflib). Can become the game's actual content source later.
  Rejected the literal "all docs as triples" — prose stays readable for the "why",
  and two sources of truth would drift. Bouncer call: yes to the data subset, no
  to rewriting prose.
- 2026-07-25 — **Applied prof-veritas theory-accuracy audit (verdict: MINOR
  ISSUES → fixed).** Corrections: (1) inference reframed as bounded
  materialization/closure, not "super-linear" — labeled per our own rule
  (supersedes the earlier "self-accelerating" phrasing); (2) Ontology definition
  re-cited to Gruber 1993 / Studer 1998; (3) Description Logic re-cited to Baader
  et al.; (4) prestige multiplier renamed **Reflexivity → Reflection** (reflexivity
  is `owl:ReflexiveProperty`, a different thing); (5) IRI = globally-*scoped*, not
  "unique"; (6) decorative citations in the AI table dropped to honest
  "no-single-spec" labels. The review agent worked — real errors, honest verdict.
- 2026-07-25 — **Four in-character independent review agents** built in
  `.claude/agents/`: prof-veritas (theory accuracy), chad-liquidity (design +
  economy balance), the-graph (consistency + code), the-auditor (security/
  compliance). Each runs in fresh context = independent. Bound rule: in-character
  voice on top, **accurate verdict underneath** — a funny reviewer that lies is
  worthless.
- 2026-07-25 — **House voice: full wacky, honesty underneath** — operate in the
  game's satirical-ominous register, but status reports/verdicts/bad news stay
  plainly honest. Persona is a hat, never a mask.
- 2026-07-25 — **Play solo; colleagues/people CUT** — managing people = tycoon
  genre (wrong game). Workforce is AI agents instead. Reverses the earlier
  "deferred"; now a deliberate cut.
- 2026-07-25 — **Automation = AI agents with a HITL error mechanic** — agents
  produce triples fast but error-prone; error rate high early, decays with tech;
  the player reviews batches; unreviewed errors poison quality → lawsuit hazard.
  Orchestration (bots managing bots) is a later tier. Ties to real hallucination
  + grounding.
- 2026-07-25 — **Opening: manual, then automate** — start hand-connecting nodes
  on one computer, then buy automation. Classic idle arc; doubles as the thin-
  slice blueprint.
- 2026-07-25 — **Add a Taxonomies tier** — hierarchies (`rdfs:subClassOf` trees)
  as the simpler step before full Ontologies. Accurate + extra progression.
- 2026-07-25 — **CYOA events with forking (locked)** — branching milestone
  events, choices with rippling consequences, some multi-step forks. Carries the
  tone and delivers the emergent motivation.
- 2026-07-25 — **Motivation is emergent, not up-front** — start a cynical cash-
  grab; slowly reveal (via CYOA + self-description) an existential stake. Avoids
  clashing with the comedy. Rejected: up-front "save the world."
- 2026-07-25 — **Abstract mechanics, real nods** — numbers/mechanics stay
  abstract (balanceable, performant); names/domains nod to real ontologies. No
  literal real-world data.
- 2026-07-25 — **Economy model borrows established idle-game math** — Cookie
  Clicker cost `base×1.15^n`, base costs/rates, cubic prestige
  `floor((total/T)^(1/3))`; Kongregate's exponential-cost/linear-production
  seesaw; Exponential Idle meta-cost `b×2^(a(x-1))`. Captured in
  `docs/ECONOMY_MODEL.md`; all numbers are tunable starting points.
- 2026-07-25 — **Match-3 / connect-nodes minigame is an open question** — a
  connect-the-nodes puzzle for the manual phase is thematically apt but
  puzzle+idle can clash; prototype before committing.
- 2026-07-25 — **Domains = branching tech-tree, mechanically distinct** — after
  a general-knowledge starter, domains open as a tree; each teaches a real
  ontology (Wikidata, Gene Ontology, FIBO, SNOMED, LKIF, DTDL) and has a real
  twist (biology rewards reasoning, finance decays, medicine risks lawsuits, law
  stresses consistency, IoT unlocks digital twins). Replayable + educational.
  Rejected: linear sequence, flavor-only domains.
- 2026-07-25 — **Self-description = escalating agency (4 stages)** — Reflection
  prestige → graph proposes its own goals → graph self-operates (incl. sell-vs-
  keep) → graph models the player/game (fourth-wall climax). The game's unique
  hook and the ominous spine's payoff. Rejected: metamodeling-only layer (too
  complex now), prestige-multiplier-only (drops the hook).
- 2026-07-25 — **Include the fourth-wall beat as the climax** — a node for the
  player/company/game appears near the end; theoretically honest (a universal KG
  would represent its authors). Rejected: keep-it-in-world.
- 2026-07-25 — **Tone: satirical startup surface + ominous awe spine** — gold-
  rush tech comedy early, curdling into Paperclips-style dread as the graph
  self-describes. Satire is a wrapper over exact theory: joke-names always show
  their real term (Field Notes / glossary), reconciling "faithful" with "funny."
  Rejected: pure satire, pure sci-fi, pure academic.
- 2026-07-25 — **North star: model all the world's knowledge as one graph** —
  master progress is "world coverage %", approached **domain by domain** (each
  domain a mini-arc unlocking the next). Grounds the game in real universal-KG
  ambitions (Cyc, Wikidata, Google KG).
- 2026-07-25 — **Endless horizon, not a true win** — approach 100% forever via
  prestige resets; no finish line. Genre-standard endless play. Rejected: hard
  win at 100%.
- 2026-07-25 — **Monetization matures: sell early → rent late** — reconciles the
  earlier sell/exhaust decision with "rent to companies": exhaustive selling
  early (data vendor), recurring rent/platform income unlocked at scale
  (infrastructure). Mirrors the real data economy.
- 2026-07-25 — **Colleagues/team deferred** — a good future resource, parked to
  control scope until the core loop is fun. Logged in BACKLOG "someday".
- 2026-07-25 — **Macro-loop confirmed** — model knowledge → need resources →
  monetize graph for resources → model more/broader/better → coverage climbs;
  sell-vs-keep tension inside every cycle.
- 2026-07-25 — **Economy is a core pillar, not a second act** — money and
  knowledge intertwined from the start. Richer, more to balance early; accepted.
- 2026-07-25 — **Selling knowledge is exhaustive (sell/exhaust, not license)** —
  selling consumes the knowledge sold, creating the central "sell vs keep"
  tension. Rejected: license-and-retain (steadier but less tension).
- 2026-07-25 — **Include the AI build-vs-buy fork** — subscriptions (opex) vs
  owned model (capex + compute). Owned LLM extracts noisy triples the reasoner
  must ground (real KG+LLM loop).
- 2026-07-25 — **Include the provenance/licensing ethics mechanic** — high-
  provenance sells for more; unlicensed shortcuts risk a lawsuit hazard.
  Topical, faithful (PROV-O), and funny.
- 2026-07-25 — **Central tension = "sell vs keep"** — every triple can be cashed
  out now or hoarded to compound quality + feed your own AI. This is the game's
  heartbeat; pricing stays tied to knowledge quality so Capital isn't a side-grind.
- 2026-07-25 — **Educational rigor stance: "faithful but playable"** — mechanics
  are genuinely accurate; simplifications are labeled in-game; deep theory is
  optional (a codex). Rejected: hardcore-accurate (too textbook-y),
  lightly-themed (not educational). The game teaches the real semantic-web stack.
- 2026-07-25 — **`docs/GLOSSARY.md` is the accuracy source of truth** — every
  in-game concept maps to a correct real definition + authoritative source
  (W3C specs, DTC glossary). CLAUDE.md now requires theory-faithfulness; the
  glossary wins conflicts unless changed deliberately.
- 2026-07-25 — **Mechanics teach by being played** — transitivity, owl:sameAs,
  inconsistency/ex-falso, open-world assumption, and vocabulary reuse become
  playable mechanics, not definitions to read. Captured in GAME_DESIGN.md.
- 2026-07-25 — **Never break an existing save** (versioned saves + forward
  migration + export/import escape hatch) — the owner plays their own save
  long-term; corruption loses real progress. Added as a CLAUDE.md guardrail
  before any save code exists.
- 2026-07-25 — **Game concept: knowledge-graph incremental** — harvest data →
  triples → entities → ontologies → digital twins; reward is a large graph that
  grows and eventually describes itself. Captured in `docs/GAME_DESIGN.md`.
- 2026-07-25 — **Core engine locked: inference = compounding multiplier** —
  reasoners generate edges from the existing graph, so growth is self-
  accelerating. The rest of the design serves this loop.
- 2026-07-25 — **Render a representative graph, not one node per triple** —
  simulate in numbers; use level-of-detail + a WebGL renderer (sigma.js /
  cytoscape.js) so huge graphs stay smooth on mobile.
- 2026-07-25 — **Record the planned stack now** (vanilla TS + Vite,
  break_eternity, localStorage, GitHub Pages) in CLAUDE.md, marked as planned —
  gives future sessions a starting point; still changeable before the game
  begins.
- 2026-07-25 — **Log every real decision to this file** — durable memory matters
  more than usual because sessions are ephemeral and mobile. Rejected:
  one-way-doors-only (too lossy), log-on-request-only (memory gaps).
- 2026-07-25 — **Default working mode: build then review** — favor momentum;
  the owner reviews results rather than plans. Rejected: plan-first-always (too
  much ceremony for a solo hobby project).
- 2026-07-25 — **Hard-block destructive git via a hook** — on mobile the owner
  can't watch the terminal, so guardrails must be automatic, not "you noticing."
  Enforced in `.claude/hooks/guardrails.sh`. Rejected: warn-and-confirm,
  document-only.
- 2026-07-25 — **Build ways-of-working foundation before any game code** —
  a lean CLAUDE.md, durable memory files, and guardrails make every future
  mobile session safe and continuous.
- 2026-07-25 — **Confirm decisions with AskUserQuestion chips** — one-tap
  decisions round-trip reliably in iOS Edge; a hosted HTML panel's buttons
  cannot write back into a Claude Code web session (only `downloads` and `mcp`
  page capabilities exist), so chips are the durable decision primitive.
- 2026-07-25 — **Skills that must stay private go in a separate private repo**,
  not this public one — anything committed here (skills, CLAUDE.md, settings) is
  world-visible. Game-building skills are fine to keep public.
- 2026-07-25 — **Premise pivot: knowledge recovery, not knowledge conquest** —
  the world's knowledge has been lost to AI; the player rebuilds it. Owner call
  via chips. Mechanics are unchanged (Frontier Mining survives the re-skin
  intact); only the fiction and the framing move. Rejected: keeping the
  startup-conquest premise, and a two-act "build it then lose it" arc (adds a
  mid-game turn we'd have to earn before we've earned the first hour).
- 2026-07-25 — **The concept graph is real: Open English WordNet, CC BY 4.0** —
  107,519 concepts across 45 semantic domains, 88k is-a edges, pinned to the
  `2025-edition` tag. Chosen over Wikidata (CC0 but 1.6 TB and needs a SPARQL
  endpoint the build environment can't reach), ConceptNet (CC BY-SA, dumps
  unreachable) and schema.org (823 types — too small to be the spine). Full
  licence trail in `docs/ATTRIBUTION.md`.
- 2026-07-25 — **Recovery order = breadth-first from `entity`** — the player
  gets the skeleton of the world before its details, in the real hierarchy's own
  order, seeded at WordNet's unique beginner. This ordering is a **frozen
  contract**: a save stores integer node ids and id N means "the Nth concept in
  recovery order", so re-running the pipeline against a newer edition would
  silently relabel every node in an existing save. Bumping the edition requires
  a deliberate, migration-bearing decision. Rejected: random assignment (throws
  away the real structure), domain-at-a-time (fights the is-a tree).
- 2026-07-25 — **Ship the generated ontology, don't build it in CI** — the 53
  JSON chunks (8.6 MB raw, ~2.7 MB gzip) are committed. Keeps deploys hermetic
  and auditable, and means CI never needs a 45 MB upstream clone. The generator
  stays in `scripts/build-ontology.mjs` for reproducibility.
- 2026-07-25 — **Ontology loading is lazy, chunked, and failure-tolerant** —
  2,048 concepts per chunk (~55 KB gzip); a fresh save only ever fetches chunk 0;
  chunks are cached on demand by the service worker rather than precached (8.6 MB
  would be a rude install). A failed fetch degrades to an unlabelled node, never
  a crash. The loader lives in `src/shell/`, never `src/core/` — the engine still
  knows only integer node ids.
- 2026-07-25 — **Definitions are shown verbatim as the reward for recovering a
  concept** — owner call via chips. These are human lexicographers' sentences,
  quoted and attributed, so the "all player-facing prose is human-written" rule
  holds: the pipeline still generates structured data only and never writes a
  sentence. Attribution is rendered in-game from the data manifest so it cannot
  drift.
- 2026-07-25 — **SNOMED CT is dropped from the domain plan** — it is not openly
  licensed (affiliate licence required), so it cannot ship in a public game.
  Replacement for a medicine domain to be chosen from openly licensed
  alternatives. Logged in `docs/ATTRIBUTION.md`.

## The vertical slice (2026-07-25, later session)

- 2026-07-25 — **`docs/VISION.md` exists now, and is read first** — the repo had
  six documents about *what* and *how* and none about *why*, so every session
  optimised locally and looked correct doing it. That is the direct cause of the
  107k-concept dump. VISION states who the game is for (the owner, one person;
  public only because Pages is easy), what it is for, and what it rules out.
- 2026-07-25 — **The core loop is SPEED VERSUS TRUTH** — machines mint statements
  fast and unverified; unverified knowledge drifts; drifted knowledge stalls
  concept recovery because Reasoners are gated by fidelity²; review is the only
  brake. This is simultaneously the game's tension and the real 2026 knowledge-
  management problem, which is why the fun goal and the learning goal stop
  competing. Protect it.
- 2026-07-25 — **The dataset is the lab bench, not the curriculum** — real data
  exists so that drift is *legible*: you can only see a definition rot if a
  correct one is there to rot away from. That job needs ~4k good concepts, not a
  lexicon. Supersedes the previous session's "ship all 107,519".
- 2026-07-25 — **Dataset curated to 4,096 concepts** — nouns only, reachable from
  `entity` (so there is exactly ONE root and the hierarchy claim is true), one
  concept per word form (27% of the full set shared a label; two identical cards
  read as a bug), and senses the source marks as slurs excluded. 348 KB, down
  from 8.6 MB. Renumbering was free because nothing had been deployed.
- 2026-07-25 — **Collapse is SOFT ROT; there is no losing** (owner chips) —
  quality decays, nothing is deleted, no run-ending cascade. Failure is a
  plateau you can see coming, never a surprise loss.
- 2026-07-25 — **Prestige inherits your own synthetic output** (owner chips) —
  25% of what your machines minted, carried forward unverified, with synthetic
  ancestry rising and drift scaling with it. Each generation starts richer and
  rots faster. This makes the reveal (you are the model; you have been collapsing
  all along) mechanically true before it is ever narrated.
- 2026-07-25 — **Nothing rots while you are away** (owner chips) — but away time
  BANKS work rather than completing it, or closing the game becomes the optimal
  strategy and the whole dial collapses. You return to a job, never to damage.
- 2026-07-25 — **Recovery is gated by fidelity SQUARED and by remaining
  coverage** — squared because reasoning over contradictions degrades fast, not
  gracefully; × remaining because the last of the world is the hardest to get
  back. Together they make 100% approached and never reached, which is the design
  goal rather than a balance accident. Found by simulation: the first tuning
  finished the game in 2 hours with no plateau at all.
- 2026-07-25 — **Manual review is ACCEPTANCE SAMPLING** — one inspected item
  stands for ~2% of the pool. Without it hand-review is a rounding error at
  scale and the HITL lever silently stops existing (simulation: attentive and
  idle players finished identically). It is also how quality control really
  works, so it earns its place twice.
- 2026-07-25 — **Vignettes ship with EMPTY prose fields and render visible
  `⟨owner⟩` slots** — the effects render from their numbers, so a choice is a
  real, legible decision before it has words. A test asserts the fields are
  empty; delete that test only when a human has written them.
- 2026-07-25 — **CC BY notice now ships WITH the data** (`public/ontology/
  LICENSE.txt`, generated) — docs/ is never deployed, and the WordNet licence
  requires its notice to travel with all copies of the database. The in-game
  credit now names both Princeton and the OEWN team and links the licence and
  the notice, per CC BY 4.0 §3(a)(1).
- 2026-07-25 — **The entire game is the graph — there is no HTML UI** (owner
  call). Every counter, button and label is a node laid out by
  `src/render/board.ts` and painted by `src/render/paint.ts` on one full-screen
  canvas. `App.svelte` is now only the loop and pointer dispatch. Deleted:
  `GraphPanel.svelte`, `ReviewPanel.svelte`, `VignettePanel.svelte`,
  `minigraph.ts`. The one deliberate exception is the CC BY attribution line,
  which stays a real DOM `<a>` because a painted circle is not a link.
- 2026-07-25 — **Layout and hit-testing share one item list.** `layout()`
  returns the items; `paint()` draws those same items; `hit()` tests them. What
  you tap is provably what you saw. This is a direct response to the review-desk
  bug, where the thing being judged had drifted from the thing on screen.
- 2026-07-25 — **The board's geometry is a CLAMPED band, not a fraction of the
  viewport.** Fractions put the provenance ring off both screen edges and clipped
  frontier labels on a 390pt phone. `band()` computes an explicit region between
  the stats and the action row and clamps every ring to fit inside it, labels
  included.
- 2026-07-25 — **Survey costs Datums; connecting costs ATTENTION** (owner call:
  both verbs must cost, and cost different things). Survey scales ×1.8 per node
  already sitting unclaimed on the frontier, so the biggest button on screen
  stops being an infinite free tap and starts asking "look for more, or finish
  what you found?". Attention is capped at 12 and refills at 1 per 20s whether
  or not you are playing — which is what keeps human-in-the-loop optional rather
  than an attention tax. It also replaces the review cooldown with one legible
  budget: connect or check, not both.

## The attention economy (2026-07-25, owner redesign)

- 2026-07-25 — **Datums are DELETED.** They were the cookie: a generic idle
  currency inherited through three pivots that meant nothing in knowledge
  management. Every price in the game was denominated in a thing the subject
  matter does not have. The `data` resource stays in the save (shape never
  shrinks) and is simply unused.
- 2026-07-25 — **Attention is CAPACITY YOU ALLOCATE, not a pool you spend**
  (owner design). Three states per slot: free, *booked* onto a piece of work for
  a while, or *reserved* to supervise an agent. Bookings hand the slot back when
  the work lands. Capacity grows from lifetime verified knowledge — earned by
  playing, never bought from a menu (owner was explicitly wary of a training
  tree, and was right).
- 2026-07-25 — **Supervision is what keeps output clean.** A supervised agent
  produces slowly and verified; an unsupervised one produces fast and raw, and
  raw is what drifts. Drift stopped being a rule the engine imposes and became a
  consequence of the player's own allocation.
- 2026-07-25 — **You MAY run more agents than you can watch** (owner chips).
  Everything above the line runs unsupervised. The player's own greed is the
  failure mechanism rather than a wall the game puts up.
- 2026-07-25 — **Agents are distilled from VERIFIED statements** (owner chips) —
  you spend the part of the graph you actually trust to build the thing that
  makes more of it. Literally the setup of the paper this game is about, and it
  means a graph you have let rot cannot produce another agent.
- 2026-07-25 — **THE PLATEAU IS NOW STRUCTURAL.** Capacity grows
  logarithmically with verified knowledge; agents grow linearly. Supervised
  share → 0 for every strategy, so fidelity falls, so recovery stalls. Measured
  over 8h: a player supervising 80% holds 100% fidelity for two hours and is at
  67% by hour eight; balanced decays to 22%; watching nothing collapses to 2%.
  **No tuned constant is holding this up** — three balance passes had been
  fighting the absence of exactly this.
- 2026-07-25 — **Harvester and Orchestrator leave the board.** The Harvester
  made Datums. The Orchestrator bought automated review — and supervision *is*
  automated review, so it was the same idea charged for twice. Both remain in
  GENERATORS for save shape.
- 2026-07-25 — **Labels are laid out, not drawn blind** (`src/render/labels.ts`).
  Every label is a REQUEST with a priority; requests are placed in priority
  order, each trying above/below/right/left around its node, skipping any
  position that overlaps an already-placed label or leaves the band. A label
  with nowhere to go is dropped. Crowding therefore degrades by losing the least
  important labels instead of producing a smear — which is what the owner's
  screenshot showed: `measure` and `group` overwriting each other's cost lines,
  `psychological fea…` truncated, `otherworld` running off the right edge.
  Priority order: root > just-landed > work in flight > settled anchors.
- 2026-07-25 — **Discoveries take EVENLY SPACED ring slots**, assigned at
  booking time and held until they land. Positioned by a hash of the node id,
  two discoveries could occupy the same spot; slots make that impossible.
- 2026-07-25 — **A landing concept eases into place over ~850ms** from the ring
  slot it was discovered in, flaring and shrinking as it arrives, with a fading
  halo. Taps push a ripple. Animation state lives in the UI (`landings`,
  `ripples`), never in the engine — the engine is still not allowed to know the
  screen exists.
- 2026-07-25 — **Edges follow the REAL hypernym, not a hash** (no save migration
  needed). The shell looks up the concept's true WordNet parent and passes it to
  `discover` as a plain integer, so `src/core/` still knows nothing about the
  dataset. `mixId` survives only as the fallback for a folded-away parent or an
  unloaded chunk. Existing `[a,b]` pairs stay valid — only new links change,
  which is why the backlog's "needs a migration" note turned out to be wrong.
  The picture on screen is now the actual taxonomy: `entity → physical entity /
  abstraction / thing`, `abstraction → attribute`.
- 2026-07-25 — **Away time respects the supervision split** (save **v10**, field
  `pendingClean`, additive). Offline ran every agent at full rate and banked all
  of it unverified, so closing the game was +82% throughput and −100%
  verification — the supervision dial, which is the game's only real decision,
  was strictly worse than the app switcher. Banked work now splits exactly the
  way you left it set, and `absorb` takes each slice in the bank's true mix, so
  the clean half cannot be skimmed first.
- 2026-07-25 — **Agent prices live in the content table** (`agentBase` /
  `agentRatio`). The engine used one hardcoded pair for every agent, so an
  Extractor (0.4 statements/s) and a Reasoner (0.05 concepts/s, and the machine
  that actually wins the run) cost byte-identical amounts and balance could not
  be tuned as data. Reasoner set to 90 @ 1.32 against the Extractor's 40 @ 1.30:
  buying your way past the fidelity gate should stay the expensive move.
- 2026-07-25 — **Review minting writes its RNG seed back.** `mintReview` walked
  the stream locally and threw the advanced seed away; `reviewBatch` then guessed
  how far to skip (`queue.length * 3`), which is not how far minting actually
  walks — retries consume extra draws. Desks could repeat. Minting now returns
  its seed and `tick` stores it; `reviewBatch` no longer touches `rngState`.
- 2026-07-25 — **Discovery is gated at both ends of the clock and the world.**
  Refused while `lastTick === 0` (a tap before the first tick booked `until:
  18000`, and the first real tick is epoch-now — the discovery completed
  instantly and free), and refused past `CONCEPT_BUDGET` (past the last concept
  it was still minting an anchor and a VERIFIED statement for a node with
  nothing behind it — an infinite faucet of the one scarce thing).
- 2026-07-25 — **Label placement is capped at 32 candidates**, applied after the
  priority sort. Placement is quadratic and the board can hand it 240 anchors at
  60 fps (~230k rectangle tests per frame on a phone). A phone fits nowhere near
  32 labels, and priority order means the cut drops exactly what crowding would
  have dropped anyway.
- 2026-07-25 — **DECISIONS.md is chronological, newest at the BOTTOM.** The
  header claimed the opposite and no session had followed it. Convention
  corrected to match the file rather than reordering 500 lines of history.
- 2026-07-25 — **The dataset grows a second source: WordNet + ConceptNet**
  (owner chips). Owner: "i thought the dataset had this info… otherwise it's
  boring and the edges have no meaning." Measured rather than assumed: WordNet's
  noun graph carries **12,128** non-is-a edges across five kinds (part-of 5,387,
  subject-of 3,950, instance-of 1,243, made-of 825, member-of 723) — but only
  **148** of them have both ends inside the shipped 4,096, because that slice is
  the top of the tree and part-of/member-of live at the bottom (`wheel`/`car`,
  `wolf`/`pack`). Holding all 12,128 would need ~17,668 concepts, and even then
  it is 12k edges over 72k concepts: **WordNet is a dictionary taxonomy, not a
  knowledge graph.** Decision: keep WordNet as the is-a backbone (clean, single
  root, already vendored, ground truth) and add **ConceptNet** for edges that
  mean something — used-for, capable-of, made-of, causes, found-at, has-property.
  Licence read from source, not memory: ConceptNet **data is CC BY-SA 4.0**
  (their code is Apache-2.0 and they state explicitly the two are separate
  works). Share-alike binds the derived data file we ship, not our source.
  **the-auditor must sign this off before any ConceptNet data is committed.**
- 2026-07-25 — **The renderer goes hybrid: canvas underneath, DOM pills on top**
  (owner asked what to take from Infinite Craft — "the architecture and how it
  performs and how convenient it is for UX"). Infinite Craft is not a canvas
  game; it is absolutely-positioned DOM on a pannable plane. Measured at 390×844
  with CPU throttled 4×, main-thread script time per frame:
  | nodes | DOM pills + canvas edges | all canvas |
  |---|---|---|
  | 240 | **0.60 ms** | 4.20 ms |
  | 500 | **0.80 ms** | 7.50 ms |
  | 1000 | **1.20 ms** | 14.20 ms |
  7× cheaper at our cap, 12× at 1000, because text is the expensive part: the
  DOM lays out and rasterizes each label ONCE and then pans the world with a
  single composited transform, while the canvas re-measures and re-rasterizes
  every glyph every frame. It also DELETES code — `render/labels.ts` (collision
  avoidance, priority ordering, dropped labels), `hit()`, and `band()`'s
  clamping all become the browser's job — and text stays crisp at any zoom
  instead of baked at one scale. Canvas keeps what it is good at: edges, the
  substrate, the rot shimmer. One shared transform drives both layers.
  This does NOT reverse "the entire game is the graph" — every control is still
  a node on the plane; only the rendering substrate for text changes.
- 2026-07-25 — **HUD terminology gets simplified** (owner: "i think we need to
  simplify terminology, i'm failing to understand what you're saying at times").
  On screen: statement/triple → **fact**; verified/unverified/drifted →
  **checked / unchecked / rotten**; fidelity → **how much you trust**; coverage →
  **how much of the world is back**; "provenance" and "acceptance sampling"
  disappear from the UI entirely. The real terms stay in GLOSSARY and Field
  Notes, where learning them is the point — that is the educational goal
  (VISION) without taxing the player for reading a HUD.

---

## 2026-07-25 — Five-agent review round. Corrections to entries above.

**Read this before trusting the three entries immediately preceding it.** They
were logged before the work was reviewed, and three of them contain claims that
are false. Append-only means the wrong sentences stay; it does not mean they
stay unmarked.

- **CORRECTION to "Edges follow the REAL hypernym, not a hash".** The entry says
  parents are "almost always" still on the board. Measured against the shipped
  data: the true parent survives for **100% of the first 240 concepts, 12% of
  the next 260, and 0% after that — 6.6% across the dataset.** Anchors are a
  240-wide sliding window and breadth-first-from-`entity` is exactly the
  ordering that maximises parent distance (node 4030's parent sits at index ~4).
  So every edge past roughly the 500th fell back to the hash the change existed
  to abolish. **Fixed** by walking to the nearest *surviving* ancestor in the
  shell (max is-a depth here is 5, so ≤5 lookups) and by warming the chunk that
  holds `nextId` — without which every discovery at 1024/2048/3072, and every
  one on a cold start, silently hash-wired too.
- **CORRECTION to "The renderer goes hybrid".** The entry claims the browser
  takes over "collision avoidance, priority ordering, dropped labels". **It does
  not.** Absolutely-positioned elements overlap freely; no browser repositions
  or suppresses them, and `overflow:hidden` clips rather than moves. Only
  `hit()` genuinely disappears, plus the per-frame `measureText` calls — which
  is where the real cost was, so the measurement stands and the conclusion
  stands. `labels.ts` is **re-targeted, not deleted**: keep the priority sort
  and the drop rule, apply them by toggling `visibility` on pills.
  This entry also **supersedes the implementation clause** of the earlier
  "the entire game is the graph" decision ("there is no HTML UI", "one
  full-screen canvas"). The *design* clause — every control is a node on the
  plane — is retained and is the constraint the new substrate must not break.
  Enforceable rule so it cannot erode: **the DOM layer may contain only
  absolutely-positioned pills whose position derives from a board item's
  transform. No flow layout, no HTML panels, no sheets.** And: nothing drawn on
  the canvas is ever tappable; opening a sheet must make the pill layer `inert`.
- **CORRECTION to the label-placement entry.** The "~230k rectangle tests per
  frame" figure is wrong by ~6×; `taken` only grows when a label is *placed*,
  and a 390pt board saturates near 30–40, so the real figure is ~38k. The cap is
  still right — the true cost was 240 `measureText` calls per frame — but the
  number was invented rather than measured. Also, "drops exactly what crowding
  would have dropped" holds only at saturation: all ordinary anchors tie at
  priority 10 and `sort` is stable, so the survivors are always the *oldest*
  anchors, and a newly settled concept in an empty region can no longer win a
  spot it previously could.
- **CORRECTION to the ConceptNet entry.** It planned to join ConceptNet to
  WordNet **on label**. That is an unverified `owl:sameAs` asserted automatically
  on every edge — against a slice that keeps only *one sense per label*, chosen
  by breadth-first accident. Our own GLOSSARY says "over-eager `sameAs` corrupts
  a graph" and SIMPLIFICATIONS S5 says merging can be wrong. We wrote the
  warning and scheduled the violation. Join through ConceptNet's WordNet sense
  links, or mark every label-joined edge as inferred and let it rot — the second
  is more honest and is a better mechanic.

**And the finding that reframes the whole dataset decision:** ConceptNet yields
only **547 edges** with both ends inside the shipped 4,096 (measured across all
34,074,917 assertions), against WordNet's 148. 3.7× more, but still sparse. The
cause is the same for both sources: our slice is **90% attributes,
communications, states and persons — only 9.7% concrete nouns** (artifact 90,
substance 104, object 162, animal 25, plant 11, food 2, body 4). Part-of,
made-of, used-for and found-at all attach to concrete things, which is precisely
what breadth-first-from-`entity` excludes. **The second dataset was never the
fix. The SLICE is.** Selecting 4,096 concepts to maximise induced edge count —
subject to staying connected under is-a with one root — optimises the property
the owner actually complained about, instead of hoping a bigger corpus fixes it
incidentally.

**Migration, if the slice changes: key on OEWN SYNSET ID, not on label.**
Labels are unique *within* a slice, never *across* slices, so a differently
chosen slice may keep a different sense of `bank`, `head`, `growth`, `draw`,
`film` — all of which are in the current 4,096. A label migration would rebind
those nodes silently, with a plausible label and the wrong gloss and the wrong
parent. In a game about semantic drift, shipping a migration that performs
undetectable semantic drift on the owner's save is not an acceptable joke.
Also: regenerate `forged.links` rather than migrating them (an old pair asserts
a parent relation that the new dataset may contradict), fold unresolvable
anchors into `foldedNodes` +1 each so `recovered()` is preserved exactly, and
decide explicitly what happens to `nextId` — it encodes "recovered = the prefix
0…nextId−1", a property any re-slice destroys, and no scalar can express an
arbitrary subset. A 4,096-bit bitmap is 512 bytes and would also unlock the
live-edge coverage work.

- 2026-07-25 — **DOTTED LINES (owner's design, save v11).** Owner: *"let's show
  dotted lines for potential connections and the player will just spend
  attention on making them real (filling the dotted line)."* This is better
  than the drag-to-connect I proposed, for a specific reason the-redditor
  named: our oracle says **no** ~99.9% of the time (8.4M ordered pairs, low
  thousands of real edges), so guessing is misery. Dotted lines invert the verb
  from **recall** to **allocation** — the game shows what is possible, and your
  decision is which lines are worth a slot. That is an idle-game decision.
  Owner's three calls, all taken:
  - **A concept counts only while a line supports it.** `recovered()` counts LIT
    concepts (≥1 drawn edge) plus folded mass. Discovery lands a concept DARK.
    This is the fix for the defect Chad and I both confirmed by simulation: the
    entire 4,096-concept world was hand-completable in ~2h34m at fidelity 1.000
    with zero machines, because discovery minted a node *and* a free verified
    statement. Coverage was a monotone ratchet; now it can fall.
  - **Unchecked lines rot back to dotted.** An unwatched agent's line decays and
    is removed; the connection returns to being merely potential and its
    endpoints can go dark. Deterministic — the fractional decay debt is stored
    in `lineRot`, so offline catch-up and real time cannot diverge and a reload
    cannot re-roll it.
  - **Agents fill real lines AND invent fake ones.** A watched agent's line
    arrives checked; an unwatched one arrives unchecked and a share are `fake`,
    drawn identically to real ones. `AGENT_LINES_PER_STATEMENT = 0.12`, well
    under 1: statements are volume, lines are structure, and structure must lag
    volume — that gap is what the player is for. Without agents drawing lines at
    all, coverage would be capped by thumb speed and the no-babysitting rule in
    CLAUDE.md would be broken.
  Shape: `forged.edges: Edge[]` where `Edge = {a, b, rel, checked, fake}`.
  **Potential is DERIVED, never stored** (`potentialEdges()` in the shell) —
  what is possible belongs to the dataset, what you have drawn belongs to your
  save. That also means re-slicing the dataset can never leave a stale
  possibility rotting in someone's save file.
  `CONNECT_MS = 7_000` against discovery's 18s: two verbs at two tempos, because
  one verb on one timer is a metronome (Chad F5).
  Relation names are the ones prof-veritas verified against the source, not the
  ones I guessed: `mero_part` runs whole→part so it is **has-part**, not
  part-of; `mero_member` is **has-member**; `domain_topic` is **studied in**,
  never "subject" (that word means the subject position of a triple in a game
  about RDF); and `exemplifies` is **excluded entirely** — it is a usage
  register ("this word is used figuratively"), not a relation between concepts,
  and `cakewalk instance-of trope` would have been a shipped falsehood.
  Migration v10→v11 turns every existing `[a,b]` pair into a **checked `is a`**
  edge, which is exactly what it was: placed by hand, and hypernymy is the only
  relation the game has ever drawn. Nobody loses a line or a point of coverage.

- 2026-07-25 — **WordNet's other relations ship (123 lines, no new licensing).**
  The pipeline already read these files and threw the keys away. Now emits
  `public/ontology/rel.json` — flat `[a, b, rel]` triples of concept indices,
  one small file, runtime-cached by the existing `/ontology/` rule.
  **has part 63 · studied in 47 · has member 13 · made of 0.**
  Kept as a separate file from the concept chunks on purpose: chunks are fetched
  lazily by index range, but a relation can join any two concepts, so chunking
  it by index would cut edges in half.
  Directions are as authored and were verified against the source, not inferred
  from the key names — every `mero_*` key sits on the WHOLE and lists the PART,
  so `organism mero_part cell` is **has part**, and reading it the other way
  would have drawn every part-whole arrow backwards.
  **Excluded, deliberately:** `exemplifies` (a usage register — "this word is
  used figuratively"; `cakewalk instance-of trope` would be a shipped
  falsehood), `attribute` (targets are adjective synsets and we ship nouns
  only, so all 312 dangle), and `instance_hypernym` (**zero rows in this
  edition** — OEWN split proper nouns out, so this dataset contains no named
  individuals at all, which means SIMPLIFICATIONS S2 understates the case: there
  is no ABox here to collapse).
  The four concept chunks are **byte-identical** after regeneration, so the
  recovery order is untouched and no save is affected.
  Renderer: each relation gets its own hue offset and non-is-a lines carry their
  relation NAME at the midpoint. `is a` stays unlabelled — it is the backbone
  and naming all 4,095 would be noise; naming `has part` is the entire reason
  for having it.
  **The measurement that matters, and it is not encouraging:** 123 lines across
  4,096 concepts. Verified in a browser — reaching the FIRST one takes ~46
  discoveries, about four minutes of play. The variety is real and legible when
  it appears, but it is rare enough to be a garnish rather than a system. This
  is the same finding as ConceptNet's 547: **the slice is the problem, not the
  source.** Our 4,096 are 90% attributes/communications/states/persons and 9.7%
  concrete, and part/substance/use relations attach to concrete things. Do not
  build the ConceptNet pipeline expecting it to fix this; re-slice first.

- 2026-07-25 — **ZOOM, third attempt — and the first two were the bug.** Owner
  screenshot: a huge graph, no HUD, no buttons, and *"i can't navigate away…
  i can't do anything."*
  Root cause, and it is two separate mistakes compounding:
  1. **iOS has ignored `user-scalable=no` since iOS 10** — it is an
     accessibility decision. So pinch always worked, and it moves the VISUAL
     viewport while leaving the LAYOUT viewport alone. A `position: fixed`
     canvas is laid out against the LAYOUT viewport, so the player saw a
     magnified crop of a board that had no idea anything had happened.
     `ResizeObserver` never fired because the element genuinely did not change
     size — which is why the previous "fix" (measure the canvas, not
     `innerWidth`) did nothing.
  2. **`touch-action: none` swallowed the pinch.** So you could get zoomed in
     and could not get out, could not scroll the chrome back, could not leave
     the page. **Trapping the player inside the page is far worse than a stray
     gesture.** Now `manipulation`, which still kills double-tap-to-zoom (the
     usual cause of the accidental zoom) but leaves the escape route open.
  Fix: the board is driven by **`visualViewport`** — sized to exactly the region
  the player can see and translated onto it, listening to both `resize` AND
  `scroll` (panning while zoomed changes which region is visible without
  changing its size). Zoom becomes a magnifier that still shows a complete
  board. `maximum-scale`/`user-scalable` are gone from the viewport meta: they
  bought nothing on iOS and removed the way out everywhere else.
  **A guard I added while fixing this WAS the bug again, and the test caught
  it:** "a measurement under 200px is never real, fall back to innerWidth" — but
  a small visualViewport is not a bad measurement, it is the player zoomed in,
  and correcting it back up re-created the crop exactly. `visualViewport` is
  authoritative; the sanity fallback only applies when there is no such API.
  Also: layout constants are proportional now (`statsH`, `ACTION_Y`,
  `MACHINE_Y`, `uiScale`) instead of pixel values tuned for an 844pt phone, so a
  short viewport — zoomed, split-view, landscape — shrinks the furniture instead
  of letting it eat the graph. And the canvas backing store multiplies by the
  pinch scale so a zoomed board renders native rather than upscaled.
  Verified with a headless pinch (`Emulation.setPageScaleFactor` 2.5): visual
  viewport 156x338, canvas box follows to 156x338, backing 468x1013, and the
  whole board — stats, graph, Discover, machines — renders complete. Before the
  fix the canvas stayed 390x844 and the rest was off-screen.
  KNOWN COSMETIC: at extreme zoom the action row's caption still overlaps the
  machine row, because pill label text is not yet scaled by `uiScale`.

- 2026-07-25 — **THE UI IS DOM. The canvas draws lines and nothing else.**
  (Owner: *"the persistent gui buttons must stay as is but just look as part of
  the graph while not being… please employ best practice, i believe you crazily
  overengineered this… have a look at how neal does it."*)
  They were right, and the zoom bug was a symptom rather than the disease.
  Infinite Craft is **not open source** — only community API wrappers exist —
  but the relevant fact is observable without the source: **it is an ordinary
  web page.** DOM elements, CSS layout, canvas for nothing.
  What this project had instead was a hand-written reimplementation of the
  browser drawn onto one canvas: a layout engine (`layout()` → `SceneItem[]`), a
  hit-tester (`hit()`), a label collision solver (`render/labels.ts`), modal
  sheets painted by hand, and a set of pixel constants scaled to fit the
  viewport. Every zoom bug came from that one choice, and each fix added more
  machinery on top — culminating in `visualViewport` plumbing to work around a
  problem that only existed because the UI was not DOM.
  Now: a flex column — header / stage / dock. **The canvas fills the stage and
  draws only lines, substrate and the provenance ring.** Counters, buttons,
  machines, the supervision dial, the review desk, vignettes and the save menu
  are ordinary elements. Concept labels are ordinary elements. Dotted-line
  targets are `<button>`s at the line midpoint — so "what you tap is what you
  saw" is guaranteed by the browser hit-testing the element that drew those
  pixels, which is strictly stronger than two consumers agreeing on a list.
  **Nothing is `position: fixed`.** That was the last piece of the trap: a fixed
  element anchors to the layout viewport, so a zoomed page shows a magnified
  crop with nothing to pan. Everything is in-flow or absolute within `.app`.
  Verified: at 2.5× the page pans (visual viewport offset 0,0 → 100,200) and
  zooms back out; `touch-action` is `auto`; zero fixed elements.
  Node positions moved from a hash of the id to a **phyllotaxis spiral over the
  list index**, so the disc fills evenly at any count — four concepts spread
  out, four hundred pack in. The old hash put the first handful within ~30px of
  the centre while the world ring sat 180px away.
  **Net −809 lines.** `render/labels.ts` deleted. `render/board.ts` is geometry
  only. `render/paint.ts` is lines only.

---

## 2026-07-25 — Second five-agent round. What it found, and what changed.

The owner asked whether this project even has a game vision and a technical
vision that it follows. The answer from five independent reviews: **the game
vision is real and followed; the technical vision was not written down, and the
documents that claimed to carry it were describing a different game.**

**Defects found and fixed in this batch** (three were confirmed by simulation
before being touched):

- **The fold credit undid the whole v11 design.** `foldedNodes += 1` fired on
  every anchor eviction regardless of whether the concept had ever been
  connected, so past the 240-anchor cap pure Discover-spam reached
  **3,856 / 4,096 coverage with zero lines drawn and zero lit concepts** — the
  same 2h34m hand-only completion v11 exists to close, relocated one window
  along. Found independently by the-redditor and chad-liquidity with identical
  arithmetic. Now credits only what was lit, and evicts DARK anchors first,
  which also stops the taxonomy collapsing into a 240-spoke asterisk.
- **Supervised agents were minting permanent falsehoods.** Agent lines were
  random anchor pairs asserted as `is a`; the supervised share landed
  `checked: true`, which is exempt from decay. So the *reward for supervising*
  was `oxygen is a democracy`, certified, forever, in a game whose rule is that
  every concept matches its real definition. Agent lines are now always
  unchecked and always `fake` — a machine cannot know which pairs are real,
  because the dataset lives in the shell. They still light concepts while they
  live, so agents still move coverage and the no-babysitting rule holds.
- **`studied in` was a shipped falsehood** on 27 of 47 lines. The board rendered
  `expressive style — studied in — language` and `body of water — studied in —
  lake`. WordNet's `domain_topic` tags a subject field and its targets are
  heterogeneous (biology, law, but also lake, ocean, animal). Renamed **`topic`**,
  which is true of all 47.
- **`is a` was stored (broader, narrower)**, so anything rendering
  `label(a) REL label(b)` printed `canine is a dog`. Invisible only because the
  rel-0 label is suppressed. Fixed with migration **v12**; coverage is
  unaffected because `lit()` counts both endpoints.
- **Lines had no direction.** The relation directions were verified against the
  source and then discarded at the pixel — `car has part wheel` and
  `wheel has part car` drew identically. Arrowheads added.
- **Generation 2 produced exactly zero.** `remaining = (f − coverage) / f`
  clamps to zero once coverage passes fidelity, and prestige carries coverage at
  100%, so a completed run returned to a wall. Now `(1 − coverage) × f`, which
  is **byte-identical at f = 1** (every gen-1 number already measured is
  unchanged) and makes the total gate f³ below that — a hard tail instead of a
  wall, which is the actual Shumailov shape.
- **`attentionCap` and `ratchet` went Infinite above 1.8e308**, writing
  `foldedNodes: "Infinity"` into the save — after which `recovered()`'s
  `Number.isFinite` guard zeroed all folded mass permanently. Same class as the
  drift bug fixed thirty lines below, in the same file. Both now use Decimal
  log10.
- **EDGE_CAP evicted the player's own lines first** (`shift()` takes the
  oldest, and the oldest are yours). Machine guesses go first now.
- **The graph spun at 1.15°/s** and paid for it by re-deriving every node
  position, concept lookup and line midpoint sixty times a second — 14,400
  object allocations/second at the anchor cap, to rotate a picture
  imperceptibly. That is the exact opposite of the argument for going DOM. Spin
  is 0; positions recompute at the 10 Hz tick. The canvas still animates.
- **The ticker was rendered nowhere** — built, wired and fed since the canvas
  rewrite, subscribed to by nothing. So the game had no player-facing sentences
  at all. Now in the dock.
- **The in-game credit had no regression gate**, and its first-sentence slice
  could silently stop naming Princeton on a natural manifest reword. Fails safe
  now, with a test on the rendered string and a grep that the component still
  uses it.
- **CI never ran on this branch.** Four commits shipped with no tests, no
  core-purity check and no attribution gate. Added to the trigger list;
  publishing stays gated to the pinned branch.

**Documents corrected**, because in this project the committed files ARE the
memory and they had drifted badly:

- **PixiJS was named as the locked graph renderer in 8 places and was never a
  dependency.** Purged, with the history kept visible.
- **ARCHITECTURE now opens with an actual technical vision** — core is a pure
  reducer, shell owns everything impure, and *the browser is the framework*
  (rule 3 is the lesson of the all-canvas experiment, written down so it does
  not have to be relearned a third time).
- **HANDOVER §2c** was false line by line — it described the canvas UI that was
  deleted — and §5.1 presented a solved problem as the top open one. Rewritten.
- **SPEC** calls itself the source of record and is missing 18 state fields, 4
  live actions and the relation table. Flagged at the top with the measured
  drift rather than quietly left; `src/core/types.ts` named as the real contract.
- **GAME_DESIGN** now has `## ⛔ CUT BY VISION` (Capital, the six-tier ladder,
  the inference multiplier) and `## 🕓 NOT SCHEDULED` (the domain tech-tree).
  Its banner said the mechanical content was "mostly still the plan"; that
  sentence was the single largest memory hazard in the repo.

**Still open, deliberately:** the review desk operates on statement pools rather
than on edges, so `fake` has no verb that acts on it — the mechanic is honest
now but inert. Density is the other one: 123 non-is-a relations of which only
~74 are reachable inside a 240-anchor window. Re-slice for edge density, target
≈2,500 global non-is-a edges; ConceptNet's measured 547 at the current slice is
~5× short, so the re-slice comes first.

- 2026-07-25 — **The app is a PAGE, not a fixed-height column.** Owner
  screenshots showed the UI scrolled into the middle of itself — scrollbars on
  both axes, headline clipped at the top, Discover clipped at the bottom,
  "…096 recovered" cut off at the left. It did not reproduce at 390×844 in a
  headless browser, and the reason is that **zoom persists per-site on iOS**: the
  owner arrived still zoomed from an earlier session. A `height: 100dvh` column
  cannot reflow, so a zoomed page becomes an unreachable crop — the same failure
  as the `position: fixed` trap, one level up.
  `min-height: 100dvh` instead, with `justify-content: space-between`, and the
  stage bounded to roughly square (`min-height: min(52vh, 92vw)`,
  `max-height: min(72vh, 118vw)`) rather than absorbing every spare pixel — a
  440-wide ring was floating in an 1150-tall box with dead bands above and below.
  `band()`'s inset now clears a LABEL rather than a dot: at −22 a concept on the
  rim had its name clipped by the stage edge and the ring touched both screen
  edges. The ring sits inside the node radius, so nothing is drawn outside the
  box.
  Verified with no horizontal overflow and no clipped labels at 440×956
  (the owner's device), 320×568 and 844×390 landscape.

- 2026-07-25 — **Positions are eased in JS, not snapped, and not with CSS.**
  Owner: *"when you discover stuff it happens too suddenly, things just pop and
  graph restructures, we either need animations or predictable placement so that
  it doesn't jerk all over."* Both halves of that were real:
  - `positions()` places nodes on a spiral at `core * sqrt(i / n)`, so **every
    discovery increments `n` and every existing node's radius shrinks.** The
    motion is at least coherent — it is a uniform contraction, not independent
    drift — but applied instantly it reads as the graph lurching.
  - A newly landed concept appeared at its final spot with no transition at all.
    The landing animation existed before the DOM rewrite and was lost in it.
  Eased **in JS, in one place**, rather than with a CSS transition: the canvas
  lines and the DOM nodes have to agree to the pixel every frame, and a CSS
  transition would animate only the DOM half — lines would detach from their
  dots for the length of every animation. A new node now enters from the ring
  slot its discovery timer occupied, so it arrives from where you watched it
  being found, flaring and settling.
  Curve is `remaining = 0.05^seconds`, frame-rate independent, ~88% settled in
  0.7s. At 0.0025 it was 85% done in 200 ms and still read as a jump; measured
  again after the change, 55% at 200 ms with the rest easing after.
  The rAF loop only marks the board dirty **while something is actually
  moving**, so a settled graph costs nothing per frame — which is the property
  that made turning the spin off worth doing in the first place.

- 2026-07-25 — **ONE ANCHORING RULE, and a browser check that enforces it.**
  Owner, after a third round of visual bugs: *"stop patching holes… this is a
  typical problem which must have a typical solution."* Correct, and it was one
  bug the whole time, not many.
  **`.node` was a flex column whose width came from its LABEL**, positioned with
  `translate(x, y)` and no centring — so the dot rendered at `x + labelWidth/2`.
  Measured: `thing` 8.7px off, `entity` 16.3px, **`physical entity` 32.3px.**
  The canvas draws to the true coordinate, so lines missed dots, the root sat
  off the ring centre, and the error grew with the word. Every "miscentred /
  misaligned" report traces to this single cause.
  **The rule, now in ARCHITECTURE as technical-vision item 4:** anything placed
  at a model coordinate is centred on it with
  `translate(Xpx, Ypx) translate(-50%, -50%)`, and its box size never depends on
  its text — labels are `position: absolute` so they cannot move what they
  label. Applied uniformly to nodes, dotted-line buttons and discovery timers.
  **`scripts/check-alignment.mjs` (`npm run check:align`)** drives a real
  browser at two viewports, reads each element's transform back out, and asserts
  the rendered centre matches within 1.5px. Verified to go RED (exit 1) by
  reintroducing the exact bug before committing — the vacuous-test mistake was
  already made once in this repo and is not being made again. Wired into CI.
  The lesson worth keeping: **the engine was never wrong, which is why 92 green
  tests said nothing.** Geometry that only exists after CSS has run can only be
  checked by running CSS.

- 2026-07-26 — **ONE WORLD, ONE CAMERA (technical vision item 5).** The
  "everything is still misaligned" reports that survived the anchoring fix were
  a second, separate bug: the anchoring rule made the DOM agree with the model,
  but *every part of the board computed its own pixels from `w`/`h`* — the
  spiral had one formula, `band()`'s provenance ring another, the frontier slots
  a third. Measured: cluster 30px left of the stage centre, filling 49% of the
  width and 38% of the height. Not a tuning problem; there was no shared centre
  to tune toward. **Fix:** one world (a fixed disc — root at 0, concepts to
  radius 1, provenance ring at 1.06, frontier at `WORLD_RIM` 1.18) and one
  `cameraFor(w, h)` in `render/board.ts` that both the DOM layer and the painter
  use. `band()` deleted. The camera is **a pure function of the box, not of the
  graph**: a fit-to-bounds camera re-fits on every discovery and nudges all
  other nodes, which is the "things pop and the graph restructures" complaint —
  so that complaint is now impossible by construction rather than eased over.
  Because the spiral's outermost node is always at radius exactly 1, a fixed
  camera still fills the box at any node count.
  Measured after, at three viewports: root within 0.2px of the stage centre,
  board spanning 60–67% of the short side, nothing clipped.
- 2026-07-26 — **`check-alignment.mjs` now checks the MODEL, not just the
  render.** Its first half only ever proved the DOM agreed with the coordinates
  it was given, which stayed green for days while the coordinates were wrong —
  a faithfully-rendered wrong position is still faithful. Added the three
  properties the camera promises, all node-count-independent: origin at stage
  centre, rim on screen and board ≥50% of the short side, nothing clipped
  (labels unioned in by hand since they are absolutely positioned, and rim
  badges sampled MID-FLIGHT because the widest thing on the board is gone by the
  time it settles). Each verified to go red before committing. Explicitly NOT
  asserted: "the node cloud's bounding box is centred" — a five-point
  golden-angle spiral is genuinely lopsided by ~30px while being exactly
  correct, so that check would have failed a good board and sent the next
  session tuning a system with no offsets in it. Third viewport added (390×664,
  a real iPhone in Edge with browser chrome subtracted).
- 2026-07-26 — **Stage capped nearer square (`max-height: min(72vh, 104vw)`) and
  `WORLD_RIM` cut 1.3 → 1.18.** The disc is bounded by the narrower dimension,
  so stage height past its own width bought the board nothing and pooled as
  empty space *around* the graph — which reads as the graph being small and lost
  rather than as page margin. The rim reserve was separately charging the
  concepts 23% of the board for empty ring; 1.18 still leaves ~26px between a
  settled concept and a discovery hovering outside it. Together: 49% → 67% of
  the short side at 440px, 64% at 390px.
- 2026-07-26 — **The deploy had been failing on every push since 2026-07-25, and
  "pushed" was being reported as "deployed".** Cause: the inline core-purity
  gate grepped raw text for `\bwindow\b`, and a COMMENT in `engine.ts` read
  "relocated one window along". The step went red, which SKIPS the build and
  publish steps — and a skipped publish is indistinguishable from a publish
  unless you read the run. Four commits of real work never reached the site.
  **Fixes, all with their red path tested before committing:**
  (a) `scripts/check-core-purity.mjs` replaces the grep — strips comments and
  string literals first, so it gates the engine rather than the vocabulary.
  Rules widened to the actual ARCHITECTURE-1 contract: no `window`/`document`/
  `fetch`/storage, **no `Math.random`, no `Date.now`**, no ui/render/shell
  import. Module specifiers are extracted and tested as PATHS, because the
  one-regex version anchored on `../ui/` and waved `../../src/ui/App` through.
  (b) The alignment step is no longer `continue-on-error`. It had a hard-coded
  container browser path that does not exist on a GitHub runner, so the launch
  threw, the error was swallowed, and the step reported SUCCESS in 11 seconds —
  less than one viewport spends waiting. It now probes for a browser and, if
  there genuinely is none, prints `::warning:: SKIPPED — this gate did NOT run`
  instead of a green tick.
  **Standing lesson: a green tick from a check that did not execute is worse
  than no check, and "I pushed" is not "it shipped" — verify the run.**
- 2026-07-26 — **The browser gate must fail LOUD, skip LOUD, and never hang.**
  Removing `continue-on-error` exposed the opposite failure: the alignment step
  sat `in_progress` for **nine minutes** and held the deploy behind it. Two
  causes, both fixed: `npx wait-on` (wait-on is not a dependency, so npx went to
  the registry mid-job — replaced with a node fetch-poll needing nothing), and
  Playwright's **30s-per-action default** across a dozen actions. Now
  `setDefaultTimeout(8000)`, a 20s `goto`, a 6s click, and `timeout-minutes: 6`
  on the step as a backstop.
  The script now separates the two outcomes that were being conflated:
  **assertion failed → exit 1 and block the deploy**; **could not RUN (no
  browser, preview down, board never populated) → `::warning:: SKIPPED` and exit
  0**. And it counts viewports actually measured: with everything skipped it
  prints `⊘ alignment NOT VERIFIED`, never the ✓ — "no failures" is vacuously
  true when nothing ran, and that vacuous tick is what let a dead gate look
  alive. All four paths (green / assertion-red / dead-port / no-browser) run and
  verified before committing.
- 2026-07-26 — **The visual gate runs BESIDE the deploy, not in front of it.**
  The browser check drives ~75s of real waiting; as a step inside `build` its
  slowness sat directly on top of the publish (one run held the deploy nine
  minutes, and the `timeout-minutes` backstop would have failed the *publish*
  over a browser that was merely slow). Split into its own `visual` job;
  `deploy` needs only `build`. **Rule: what blocks a publish must be fast and
  deterministic** — typecheck, unit tests, core purity, ontology/licence. The
  browser check now reports on its own line in the Actions list: red when the
  layout is genuinely broken, loud when it could not run, and unable to take the
  site down with it.
- 2026-07-26 — **Position now carries the taxonomy; zoom carries detail.** Owner:
  "we need the nodes and edges dynamically adjust on zoom… nodes with various
  weight which will dictate their size and visibility at certain zoom level.
  otherwise it's a mess immediately." It was: at 21 concepts the labels already
  overlapped and every edge crossed the middle, because the spiral placed nodes
  by DISCOVERY ORDER — position meant nothing, so zoom could not mean anything
  either. Chosen by chips, all four as recommended: pinch+pan with a Reset;
  weight = taxonomic generality; hidden nodes roll up into their nearest visible
  ancestor with a count; and yes, re-lay-out so children sit near their parent.
  No dataset change needed — the shipped chunks already carry `p`, a parent
  index forming a tree rooted at `entity`.
  New `src/render/layout.ts`: radius = depth, angle inherited (a subtree is a
  wedge), weight = sector width. **Siblings split their parent's wedge EQUALLY** —
  proportional-to-subtree-size was written first and a test caught that one new
  leaf re-divides the entire circle, i.e. every discovery moves all 240 nodes,
  which is the complaint the spiral was replaced to fix.
  Labels are decided against each label's OWN estimated width; a single shared
  constant made "set" and "psychological feature" ask for the same room, which
  is why long ones overlapped at the default zoom.
  Measured on the real dataset at the 240 cap: **32 dots / 18 labels at rest,
  57/30 at ×2, 187/36 at ×5, all 240 by ×18.** Off-screen nodes are not rendered
  at all (21 → 1 DOM node when zoomed in).
- 2026-07-26 — **Placement is unit-testable for the first time.** `layout` and
  `levelOfDetail` are pure functions over an injected `parentOf`, so
  `test/layout.test.ts` covers them directly — including against the REAL
  4,096-concept tree read from `public/ontology/`, which a browser test cannot
  reach (18s per discovery ⇒ over an hour of wall clock for a full board). Two
  of the first assertions I wrote were wrong rather than the code: an only child
  legitimately inherits its parent's whole wedge and stays drawable at any zoom.
  Kept the lesson in a comment so the next session does not "fix" correct code.
- 2026-07-26 — **Pinch-zoom is allowed back, with written rules.** It trapped the
  owner twice. Now: the stage is never `position: fixed`; gestures bind to the
  stage ELEMENT only, so header and dock stay ordinary page; if
  `visualViewport.scale > 1.05` we set `touch-action: auto` and handle nothing,
  because a player fighting out of an accidental page zoom must not also fight
  us; a Reset ("⤢ fit") control is on screen whenever the view has been moved.
  Easing moved from screen space to WORLD space, so zoom is instant (it is only
  a transform) and only real movement is animated.
- 2026-07-26 — **The graph's physics is d3-force now; we stopped inventing.**
  Owner: "i want us to use some proper existing library to render graphs instead
  of this. it works, but i don't think we should invent stuff… i want things to
  move around and wiggle like obsidian does it." Correct call — placement had
  been hand-rolled twice (golden-angle spiral, then radial taxonomy with sibling
  sectors), ~200 lines of bespoke geometry for a solved problem.
  Chosen by chips, all three as recommended: **d3-force for the simulation while
  we keep our own renderer**; **free-floating** layout like Obsidian; **drag
  enabled**. d3-force is ISC, ~12KB, no DOM, no framework.
  Explicitly NOT force-graph/sigma/cytoscape: they render LABELS ON CANVAS, and
  canvas text is precisely what broke this game before (overlapping words, tap
  targets drifting from what you can see). Labels stay DOM, lines stay canvas,
  the camera stays ours. `layout.ts` deleted; `sim.ts` + `detail.ts` replace it.
  **Bug worth remembering: forces were first tuned against a unit-radius world.**
  d3's magnitudes assume pixel-scale coordinates — a charge of −26 against a
  link distance of 0.12 is repulsion ~200× stronger than the springs. The graph
  flew to infinity, every node was culled off-screen, and the board rendered
  EMPTY with no error in the console. The sim now runs in `SIM_UNITS` (~300) and
  normalises on the way out, and `test/sim.test.ts` asserts positions stay
  finite and within a sane radius.
- 2026-07-26 — **Labels are decluttered in screen space, not by formula.** Three
  formulas shipped overlapping text in a row: one constant for every label; then
  each label's own width; then arc length at the node's ring (which flattered
  inner rings by MAX_DEPTH/depth). Now: sort by weight, place a label only if its
  box misses every box already placed — the standard map-label approach. A rule
  that compares boxes cannot overlap boxes. The box hangs from the dot's EDGE,
  not its centre, because `top: 100%` in the CSS means the radius counts.
- 2026-07-26 — **The alignment check's "root at the stage centre" assertion was
  retired, not fixed.** It was exactly right for the radial layout, where the
  root WAS the world origin. Under a free-floating simulation `entity` is pulled
  around like everything else and has no claim on the middle, so the assertion
  outlived its layout and failed correct code by 7px. Replaced with the property
  that does hold: `forceCenter` keeps the board's CENTROID at the origin.
  Measured after: centroid within 0.5px, board spanning 64–71% of the short side.
  Both rewritten assertions verified to go red before committing.
- 2026-07-26 — **Save backfill was only one level deep — a live corruption path,
  found while reviewing the "maybe we need another resource" proposal.**
  `deserialize` spread `{...initialState(), ...raw}`, so the promise "missing
  fields are backfilled additively" held for TOP-LEVEL fields only. `raw.resources`
  replaced the whole record, so a newly-added `ResourceId` or `GeneratorId`
  arrived `undefined` on every existing save. Measured, not theorised:
  `generators.extractor === undefined` → `buyGenerator` does `undefined + 1` →
  **NaN** → `JSON.stringify(NaN)` = `null` → the counter is bricked on reload.
  Resources fail more quietly: `D(undefined)` returns ZERO rather than throwing,
  so an old save would silently start a new resource at 0 while a fresh save
  gets its seed. The existing backfill test deleted a top-level field, which is
  exactly why this survived twelve save versions.
  Fixed by merging `resources`, `generators`, `coverage`, `flags`, `modifiers`,
  `provenance`, `vignette` and `forged` PER KEY. Five tests added that delete
  keys one level down; all four new assertions verified to go red against the
  old spread before committing.
  **This is why it mattered now: adding a second resource would have been the
  first change to trip it.** No migration or version bump needed — the fix is in
  the merge itself and applies to every save on load.
- 2026-07-26 — **The 240-anchor wall: Discover was a no-op after ~10 minutes.**
  Found by agent review while answering "where are we with the economy". The
  newly discovered concept is appended to `anchors` BEFORE the eviction scan and
  is dark by definition (its edge cannot exist yet), so under "evict the dark
  first" it always won its own scan and deleted itself. **Proven by test:** on a
  fully-lit board at `ANCHOR_CAP`, an 18-second Discover left `anchors` at 240,
  the new concept absent, `foldedNodes` at 0 and `recovered` unchanged. Hand play
  hard-walled at 240/4096 = **5.9% forever**, with the player still tapping a
  button that did nothing, and in-flight connects then failed their
  both-endpoints-present guard so those 7-second slots vanished silently too.
  Consequence worth keeping: because a dark victim was ALWAYS available,
  `victim < 0` was unreachable, so the `if (wasLit) foldedNodes += 1` credit was
  dead code. Excluding the new arrival is what makes the fallback reachable,
  which is what makes folding credit anything at all.
  Fixed by holding the just-arrived node out of the victim search. Four tests
  added, all verified red against the old eviction. The v11 exploit stays
  closed — a DARK fold still credits nothing, and that is tested.
  **Two agents disagreed about this code and the test settled it:** one claimed
  fake machine lines mint permanent coverage through the fallback; the fallback
  could not fire at all. Do not take either reading on trust — run it.
- 2026-07-26 — **Folding is count-PRESERVING, not count-increasing.** A lit
  concept leaves the board and becomes one unit of aggregate; coverage grows
  when you connect the new arrival, not when an old one folds. Recorded because
  the first version of the test asserted an increase and failed against correct
  code.
- 2026-07-26 — **THE WORST BUG YET: a machine line deleted the player's entire
  graph.** Found by an agent's repro during the story review, confirmed by test.
  `trimEdges` returns its ARGUMENT unchanged when the list is under `EDGE_CAP`,
  so in the machine-line block `trimmed` and `next` were **the same array**. The
  code then did `next.length = 0; next.push(...trimmed)` — emptying the array
  and immediately spreading the array it had just emptied. Result: `forged.edges`
  became `[]`. Measured: a board with two hand-drawn checked lines dropped to
  zero edges in a single 0.1s tick.
  It fired whenever a machine drew a line with fewer than 512 edges present —
  i.e. for **every player running an unwatched Extractor**, permanently
  destroying every line they had drawn by hand and the coverage those lines
  held up. Fixed by assigning `trimEdges(next)` instead of mutating an array a
  helper may alias. Three regression tests, all verified red against the old
  two-liner.
  **Rule worth keeping: never mutate an array a helper may have returned to you.**
  `trimEdges`'s fast path returning its input is reasonable on its own; the
  caller assuming it got a fresh array is what made it lethal.
- 2026-07-26 — **Folding banks FINISHED work, not pending work — the real fix
  for the 240 wall.** The eviction preference was "evict the DARK first", but a
  concept is dark from discovery until you connect it, so dark is not junk, it
  is the player's in-tray. At the cap every new discovery ate one pending
  connection, and since only LIT folds are credited, nothing was banked either.
  Measured over two simulated hours of perfect hand play: `recovered` frozen at
  241 while Discover burned through 2,311 of 4,096 concepts. Inverted: fold the
  oldest LIT anchor and bank it, touch dark ones only when there is nothing
  else. Measured after: 380 @20min, 1,148 @60min, **4,096 (100%) @240min**.
  The v11 exploit stays closed by the same rule as before — credit follows LIT.
  Discover-spam produces only dark anchors, so a spammer has nothing to bank;
  tested over 2,500 ticks past the cap, `foldedNodes` stays exactly 0.
  ⚠️ **Balance consequence for the owner:** hand play can now reach 100% in ~4h
  of perfect tapping, which makes VISION's "unreachable by construction" false
  by a different route. That is a tuning decision, not a bug — flagged in VISION.
- 2026-07-26 — **The story layer now reaches the player, and every door does
  something.** Three fixes to the only vignette in the game:
  (a) **Trigger moved off `minDrifted: 5`.** That requires an UNSUPERVISED
  extractor — the one state the HUD paints red — so the game steered players
  away from its only piece of story, and the dominant line (never buy a machine)
  kept `drifted` at exactly 0 and never saw it at all. Now `minTriples: 40`: the
  moment the first Extractor becomes affordable, so the fork comes BEFORE the
  decision rather than as a postmortem of it.
  (b) **`buy-review`'s dead lever replaced.** `review: 1.6` scales
  `autoReviewPerSecond`, a pure function of the off-roster Orchestrator count —
  1.6 × 0, forever — while charging a real 10% extraction penalty. An option
  whose upside is arithmetically incapable of existing, offered beside a real
  cost, is a lie told to the player by arithmetic. Repointed at a new `capacity`
  modifier that multiplies the attention cap, making the three doors
  speed / truth / capacity. `known-defects.test.ts` flipped from pinning the
  defect to guarding the rule: no choice may scale a structurally-zero lever.
  (c) **Flags survive prestige.** Modifiers reset on purpose (the same fork on
  worse terms IS the story); the FLAG is the memory of the choice and was being
  dropped by `...fresh`, so the record died at the retrain that makes it matter.
- 2026-07-26 — **"world recovered" was shown at 6% coverage.** `worldDone` was
  `nextId >= CONCEPT_BUDGET`, and a discovery consumes an id whether or not the
  concept survives — so the button claimed the world was recovered when the
  player had merely run out of things to find. Split into `nothingLeftToFind`
  (gates the button) and `worldDone` (`recovered >= CONCEPT_BUDGET`, gates the
  claim). The new state uses the established `⟨… — owner⟩` placeholder rather
  than inventing player-facing prose.
- 2026-07-26 — **Progression is being replaced wholesale; balance work stopped.**
  Owner: "we are going to change the entirety of progression anyways. there's no
  point in iterating on it too much." Correct call — the attention-cap curve, the
  cap-2 proposal, the agent ladder and the review/supervision crossover were all
  about to be tuned against a system that is being discarded. BACKLOG's balance
  items are marked on hold and VISION's re-measure note now says to re-derive
  from the new design rather than repair the old numbers.
  Kept as design-independent (these break ANY progression): save integrity, the
  aliasing bug that deleted the drawn graph, eviction banking finished rather
  than pending work, the vignette door scaling a structurally-zero lever, the
  story trigger reachable only in a state the HUD warns against, and the false
  "world recovered" label.
- 2026-07-26 — **New economy chosen: THE REFINEMENT LADDER (`docs/ECONOMY.md`).**
  Owner, on the old one: "i think the economy stopped existing… we'd need to
  think of a resource we have, how we get it, how we spend it, the resource
  ladder, etc. also we need to start weaving in the story into all of that."
  Correct: what existed was one substance that only bought agents, plus a
  capacity. Four shapes were proposed (refinement ladder / capability-not-
  currency / ground-truth-vs-weight / quota chapters); the owner picked the
  ladder.
  Shape: Datums (raw salvaged text) → Statements → Verified → Batches →
  Checkpoints, every conversion lossy, and a trained checkpoint automates the
  rung it was trained on — so automation always arrives with rot attached and
  the damage propagates UP the ladder you just built.
  **Datums are un-deleted, and legitimately.** v9 killed them because "every
  price was denominated in a thing the subject matter does not have"; raw
  salvaged text is a thing it does have.
  **Tail loss is now rendered, not captioned.** Batches are SAMPLED from
  verified statements, so the model learns the head of the distribution and
  fumbles the tail — and rarity is already `weight` in `render/detail.ts`, which
  already drives node size and LOD. Collapse shows up as the rim of the graph
  going dark while the core stays bright. Shumailov's named mitigation (retain
  original human data) becomes a real strategic option: hold statements back
  from curation and keep your tails, at the cost of training slower.
  **The twist is arithmetic, not text.** Coverage measures agreement with your
  own corpus; the model's benchmark is what you fed it. Because the REAL dataset
  ships in `public/ontology/`, "agreement with the source" is a second number
  that genuinely exists and can be shown at any moment. Same trick as
  `displayedFidelity` vs `fidelity`, which was built and then stranded because
  the dominant strategy never triggered it — here it is the spine.
  **Story is the ladder.** Each checkpoint is a chapter, because training
  changes what the game IS. That is narrative as the reward for a rule-rewriting
  milestone (Antimatter Dimensions' Celestials), never an interrupt and never a
  gate — which is the fix for the story audit's finding that the only vignette
  was gated behind a state the HUD paints red.
  Prerequisite already in place: the nested save backfill fixed earlier today,
  without which a new `ResourceId` arrives `undefined` and becomes `NaN`.
  ⚠️ Nothing is built; no number is balanced. Simulate headless before believing.
- 2026-07-26 — **No invented vocabulary: the bottom rung is TOKENS, not "Datums".**
  Owner: "i don't like to invent words, datums is stupid af." Right, and worse
  than ugly — "datums" is a coinage on top of a grammatical error, since the
  plural of *datum* is *data*. It was a placeholder carried across three pivots
  and I reintroduced it without questioning it.
  **Tokens** is the literal unit a model is trained on and the unit the industry
  bills for, per million. It counts naturally, needs no explanation, and sharpens
  the satire rather than softening it: the player accumulates exactly the thing
  the real industry sells. Rungs 2–5 were already real words — Statements is
  RDF's own term for a triple, Batches and Checkpoints are what practitioners
  say — so rung 1 was the only invention in the ladder.
  Standing rule this establishes: **in a game whose charter is that every
  in-game concept matches its real definition, a coined resource name is a
  theory violation, not a flavour choice.**
- 2026-07-26 — **ECONOMY.md revision 2: "the YIELD is the game", not "the loss is
  the game".** Two independent reviews took revision 1 apart at the doc stage,
  before a line was written, and converged on three structural holes.
  (1) **Loss with no counter-lever.** A constant fractional loss is not a
  mechanic — in series `output = input × Πy` is one coefficient, so the whole
  ladder was a units conversion, and every lever in the doc took something away
  (the only named mitigation for loss cost speed, i.e. more loss). Fix: yield is
  shown as a PERCENTAGE not a subtraction, is attributable to a cause the player
  chose, and is upgradeable toward a cap strictly below 100%. Revision 1 shipped
  the ceiling with no climb.
  (2) **No compounding term anywhere.** Every mechanism was linear; the stack
  carries `break_eternity` for numbers the design would never reach, which was a
  smell hiding a hole. Fix: checkpoints multiply their rung's rate and stack
  multiplicatively; the counter-force is the generational recursion. That race is
  the mid-game and is the first thing to simulate.
  (3) **The twist rescored progress instead of recontextualising it.** A hidden
  second number revealed late lands when it reframes your choices and fails when
  it marks your work down — "94% was fake, you're at 31%" is the failure, and the
  optimal play before and after would have been opposites. Fix: BOTH numbers on
  screen from minute one, unremarked; the reveal is the player realising what they
  were looking at. And the second number becomes a GATE — training gates on
  volume (needs automation), coverage gates on source agreement (needs NOT
  automating) — which kills pure-hand-play and speedrun-dirty simultaneously and
  stops it being stranded a third time.
  Also fixed: rot must cost RATE not just score (the engine's existing `f³` gate,
  which revision 1 silently dropped, making the dirtiest line the fastest);
  automating rung 1 was strictly dominated *and* was the tutorial button, because
  serial throughput is `min(capacity)` and rung 1 was specified endless; rung 1
  was the cookie again, now fixed by giving salvage a SOURCE whose distribution
  differs (common ruins = head-heavy, deep archives = tail-heavy), which also
  gives the mitigation a faucet and the pacing its minute-three fork.
- 2026-07-26 — **A statistical error I wrote, corrected: retention must be
  SELECTIVE.** Revision 1 said "hold back some verified statements from curation
  and your batches keep their tails". That is false. A uniform random subset of a
  distribution has the same shape as the whole distribution, so withholding 20% at
  random preserves nothing about the tails — it only reduces sample size. It
  charged real throughput for a benefit that does not exist and taught the player
  something untrue about the paper the game is built on, in a project whose
  charter is that every concept matches its real definition.
  Shumailov's named mitigation is about the COMPOSITION of the training set —
  retain original human data and mix it in — not volume withheld. Retention is now
  selective (withhold rare, low-`weight` statements specifically) and
  non-stationary (three competing sinks, a shelf life via `REDRIFT_SCALE`, and a
  value that depends on which rung you intend to automate next).
  Recorded prominently because it is exactly the class of error this project's
  theory-fidelity rule exists to catch, and I introduced it.
- 2026-07-26 — **HARD CONSTRAINT: Verified and Batches carry IDENTITY, not just
  magnitude.** They are distributions over concepts, not scalars. The entire
  differentiator is that losing 30% means losing SPECIFIC RARE CONCEPTS rather
  than 30% of a number. The moment a future session stores either as a bare
  `Decimal` for save-size or perf reasons, the design silently becomes an ordinary
  conversion chain with unusual nouns. A weight histogram over 4,096 concepts is a
  few hundred bytes.
- 2026-07-26 — **`docs/CONTENT.md`: the beat sheet, ordered by REACH.** Owner
  asked for content work. The organising rule is the lesson from the story audit:
  **order writing by the fraction of sessions that see the beat**, not by how
  interesting it is to design. The game's only narrative beat was gated behind
  `minDrifted ≥ 5` — an unsupervised extractor, the one state the HUD paints red
  — so the game steered players away from its own content and the dominant
  strategy never saw a word. A beat nobody reaches is not content.
  Tiers, with reach: cold open (100%) → ticker (100%, continuous) → chapter beats,
  one per checkpoint (~100%, since training is the goal) → review desk framing
  (most sessions) → forks (opt-in, priced accordingly). Word budgets and
  constraints per tier; trigger ids and effects only, no prose.
  Four reachability rules made non-negotiable, each earned by a real defect:
  every trigger must be reachable by the DOMINANT strategy (check against
  `scripts/sim-economy.mjs`); no beat may trigger on a state the UI warns
  against; no beat may fire on a mechanic that cannot happen; numbered triggers
  need a generic fallback.
  Explicit "do not write yet" list, because writing against a moving shape is the
  same mistake as balancing numbers that are about to be replaced: fork prose
  (until the third door is real), anything keyed to prestige memory (flags now
  survive but nothing reads them), and chapter beats for rungs the economy has
  not built.
- 2026-07-26 — **Ticker: numbered triggers now fall back to their generic form,
  and three dead rows are gone.** `buy:extractor:30` looks for the exact id, then
  `buy:extractor`, then the mechanical string — without which the owner would
  have to write a line per purchase count or watch "#30 online" repeat forever.
  Tested, including the red path.
  `TICKER_LINES.md` also had three rows for `buy:harvester:*`. **The Harvester is
  off `M1_ROSTER` and cannot be bought**, so any line written there would never
  have been read by a single player — the second time this project has invited
  prose for content that can never fire. Removed, and recorded rather than
  silently deleted. The stale "+N Datums" fallback went with it; the bottom rung
  is tokens now.
- 2026-07-26 — **Theory review KILLED the content idea I rated highest, and it was
  right.** Proposed: concept labels visibly rotting on the board (`dog` → `d▒g`)
  via the existing `corrupt()`. Verdict FALSE, and the objection is worth keeping:
  character-level corruption depicts **bit rot** — storage noise, a different
  failure from a different field. Model collapse is **distribution collapse**;
  neither phase damages an individual item. The lesson a player would take is
  *"degraded machine output can be spotted by looking at it"* — the single most
  harmful misconception in this subject, since the defining property of collapsed
  and hallucinated output is that it stays FLUENT. It would have taught the
  inverse of the game's own thesis.
  **The project already had this right and the proposal reversed it unnoticed.**
  `core/types.ts`: "A corrupt item is NOT a garbled string — it is a real concept
  shown with another real concept's definition… spotting rot requires reading the
  gloss rather than looking for damage."
  **Root cause: `corrupt()` has ZERO call sites, so its docstring was the only
  thing anyone read — and the docstring was wrong** ("the definition you had,
  decaying"). A stale comment on dead code talked a later session into a
  falsehood. The comment now carries the objection so the function cannot
  mis-sell itself again, and names its one honest use: OCR damage on
  scanned-book salvage, where character garbage really is what happens.
  Also caught: the proposal argued `corrupt()` was "already theory-safe (real
  string, never invented)". Not inventing text passes the LICENSING audit and
  says nothing about whether a depiction is TRUE. Borrowing a passed audit to
  skip a failed one is a move to watch for.
- 2026-07-26 — **"Unsure" → "unverified": the game has no uncertainty estimate.**
  A grep for `confidence|uncertain|probab` finds nothing in `src/`; there is an
  RNG. Calling machine-proposed edges "unsure" asserts a self-estimate of
  correctness AND implies it is well-calibrated — the property real extraction
  models notably lack. Not a simplification of a real thing, so not labellable.
  Renamed to **unverified proposal**, which is literally true and maps onto the
  `unverified` provenance already in `types.ts`. The mechanic survives intact;
  only the word died.
- 2026-07-26 — **Per-category scoring must not be captioned as tail loss.**
  Grouping by WordNet lexname is legitimate practice, but SIMPLIFICATIONS S8 is
  explicit that the shipped slice is breadth-first from `entity` — it IS the head
  and has no rare tail to lose. `noun.plant` reading low is the curator's
  selection showing through; it has ELEVEN concepts in it. Captioning a curation
  artifact as distributional loss teaches a false causal story. Denominators are
  within the shipped slice and said to be so, and `noun.Tops` is excluded as
  structural rather than semantic.
- 2026-07-26 — **The pattern behind all three errors, worth more than any of
  them: this batch kept rendering degradation as visible damage TO an item, when
  real collapse is ABSENCE.** One sentence from this repo's own source kills the
  whole class: *degraded concepts lose their edges, their weight, and eventually
  themselves — they never lose their spelling.*
  Three glossary rows added to close the anchors this exposed: **model card**
  (Mitchell et al. 2019), **calibration** (Guo et al. 2017), **corpus**.
- 2026-07-26 — **`corrupt()` is broken as well as wrong, verified in source.** A
  surviving character consumes one `next()` and a corrupted one consumes two
  (`ontology.ts:55-56`), so the RNG stream desynchronises and the function is
  NOT monotone in `strength`: nudging strength re-rolls which characters break.
  Driven from a render loop it strobes. Idea 1 was already killed on theory; this
  closes any "but it is cheap" appeal. The function keeps its single honest use
  (OCR damage on scanned-book salvage) and stays at zero call sites until then.
- 2026-07-26 — **Idea 7 (`entity` never rots) is already shipped and is retired
  as a proposal**, verified at `board.ts:131` (root returns false from
  `isRotted`) and in the eviction loop, which starts at `i = 1` so the root can
  never be folded either. Immunity holds on both the render and the engine side.
- 2026-07-26 — **The category histogram is a prerequisite, not a feature.**
  `state.coverage` holds one key and `foldedNodes` is an identity-free `Decimal`,
  so by ~60min most of coverage has no identity. Per-category evaluation, visible
  concept death, and the model card's disaggregated section are all blocked on the
  same thing: 26 per-lexname counters, added by additive migration. Nothing in that
  family ships before it.
- 2026-07-26 — **The gloss is now the reward for recovery: tap-to-inspect ships.**
  A press travelling under 8 screen px is a tap, not a drag, and opens a non-modal
  card with the concept's label, category and verbatim WordNet gloss. Previously
  the gloss appeared ONLY at the review desk, where it is the instrument for
  spotting a corrupt item — so the game's stated reward was attached exclusively
  to a chore. No prose rule is engaged: every sentence is WordNet's own, CC BY 4.0,
  already credited.
- 2026-07-26 — **The away report is promoted to the top of the content queue, and
  its proposed payload was wrong.** It cannot report "what it cost in agreement"
  because nothing rots while away; it reports the SUPERVISION SPLIT
  (`pendingClean` vs `pending`) — how much the machines minted unwatched. Genre
  review rates the away screen the most-read surface in an idle game; ours spends
  2200ms on a toast and then nulls its own data.
- 2026-07-26 — **Field Notes is a standing violation of our own accuracy rule, and
  is blocked on an owner decision.** `FieldNote` is fully specified at
  `types.ts:296-304` with ZERO references in `src/`; SIMPLIFICATIONS.md specifies
  15 rows and the house rule requires each be surfaced before its mechanic ships —
  S9 through S15 have all shipped. It cannot be built yet because `oneLineTruth`
  is player-facing prose: the owner must either adopt the existing
  SIMPLIFICATIONS lines as authored or write them fresh. Shipping an empty codex
  would be shipping the violation with a UI on top.
- 2026-07-26 — **Audit answering "where is the economy": there is one live
  resource.** Of the seven `ResourceId`s, `entities`, `taxonomies`, `ontologies`,
  `twins` and `capital` are written once in `initialState()` and **never read or
  written again anywhere in `src/`** — permanent zeros. `data` is likewise dead
  (`ratePerSecond` is a stub returning `'0'`, with a comment saying so). Only
  `triples` (shown as "statements") moves, plus attention and generator counts.
  The ECONOMY.md refinement ladder (Tokens → Statements → Verified → Batches →
  Checkpoints) is **designed and entirely unimplemented** — zero lines in
  `engine.ts`. Recording this plainly because two documents describe ladders the
  code does not have, which is exactly the trap HANDOVER.md fell into before.
- 2026-07-26 — **HUD legibility pass, prompted by the owner not being able to
  read their own first screen.** "free of 2" never said free *what* → "of 2
  attention". "1 of 4096 recovered" showed the dataset size as a 0.02%
  denominator at minute one → the count alone reads "concepts recovered" until
  100 are in, after which the denominator means something.
- 2026-07-26 — **The bottom of the refinement ladder is BUILT (save v13)**,
  chosen by the owner over the full ladder after the audit above. Tokens reuse
  `resources.data`; Salvage is uncapped and attention-free; Extraction converts a
  fixed 20-token batch at a yield shown as a PERCENTAGE (45% base, hard cap 92%)
  because "lost 11 of 20" and "45% yield" are the same arithmetic and opposite
  games. The source fork is **reversible** and composition is stock-weighted, so
  switching dilutes rather than flips.
- 2026-07-26 — **The second number needed no new state.** `sourceAgreement()` is
  the share of drawn edges that are not `fake`, and `Edge.fake` has existed since
  v11 — so the number ECONOMY.md called for was always computable and merely
  never displayed. It is on the HUD from minute one, small and unexplained, per
  the logged decision that a late reveal rescores the player's progress downward.
- 2026-07-26 — **Archive-sourced tokens extract as CHECKED statements**, ruins
  tokens as unverified. This is what gives the rung-1 fork teeth: measured
  against the real reducer at 60 taps, ruins give 198 statements / 22 verified
  and archives 108 / 80. Machines cost verified, so archives buy automation and
  ruins buy bulk, and neither is dominated.
- 2026-07-26 — **HUD rebuilt so every cell is a noun.** The owner could not name
  two of the three numbers on their own first screen. Five labelled cells now:
  tokens · recovered · checked · agreeing · attention. The 4,096 dataset size
  left the HUD — at minute one it is a 0.02% denominator with no room for an
  honest caption, and the concept count alone is the truthful reading.
- 2026-07-26 — **"25 nodes" vs "3 recovered" was a VOCABULARY bug, and it now has
  a structural fix.** The dock and the HUD each reached into raw state and picked
  their own word: `state.graph.nodes` counts concepts PLACED (dark ones too) while
  `recovered()` counts only LIT ones, and `state.graph.edges` is the statement
  BALANCE while the HUD calls that number "statements". One quantity with two
  nouns, and one noun covering two quantities. Nobody wrote a bug — there was no
  place where "what the player calls this" was decided. `src/core/readouts.ts` is
  now that place: one noun, one function, uniqueness asserted by test, and
  `scripts/check-vocabulary.mjs` fails the build if a surface reads the legacy
  `graph` cache. Ticker milestone ids changed with it (`nodes:*` → `recovered:*`,
  `edges:*` → `lines:*`); safe precisely because `OWNER_LINES` is still empty, so
  no written prose was orphaned. `docs/TICKER_LINES.md` and `docs/CONTENT.md`
  updated to match.
- 2026-07-26 — **Line milestones capped at 500 because `EDGE_CAP` is 512.** The
  old list ended at 1,000 drawn edges, which cannot happen — a beat nobody can
  reach, which CONTENT.md reachability rule 3 already forbade.
- 2026-07-26 — **The ticker was append-only and therefore permanently stuck.**
  The dock rendered `slice(-2)` of a list that only grew, so the last two lines
  sat under the board forever; the owner's screenshot still showed "graph: 25
  nodes" long after it was news. Lines now carry a timestamp and expire after 45s,
  clocked off `state.lastTick` rather than wall time so the derivation actually
  re-evaluates.
- 2026-07-26 — **THE DELIVERY BUG, and it was the other half of "nothing changes
  for me".** `registerSW({ immediate: true })` checks for a new build only at page
  load; on iOS the tab suspends and resumes without a navigation for days, so a
  green deploy could sit on the server unread. The first cause found (a dead CI
  gate) was real but was not the whole story, and the owner was still on a build
  two deploys old hours later. Now the worker also checks on `visibilitychange`
  (the iOS case — the app is resumed, not loaded) and on a 10-minute timer.
- 2026-07-26 — **A build stamp ships in the save sheet** (`build <sha> · save
  vN`). "Is the thing on my phone the thing I just deployed?" was unanswerable and
  cost a session of chasing bugs already fixed on the server. Save version sits
  beside it because a stale app and an unmigrated save look identical from the
  outside and are fixed completely differently.
- 2026-07-26 — **Extraction must NOT credit `lifetimeVerified`, and it did for
  four hours.** That field is the game's only permanent ratchet: it drives the
  attention cap and the yield multiplier and survives prestige, and its stated
  contract is "statements a HUMAN checked". Extraction is bulk conversion.
  Measured in a real browser: 150 seconds of tapping produced 1,150 statements
  and moved the attention cap **4 → 13** — a fourfold inflation of the game's
  designed bottleneck, driven by its cheapest and most spammable verb. Removed;
  the cap now grows 4 → 10 over the same session, entirely from connect and
  review. Archive material still arrives CHECKED, so the rung-1 fork keeps its
  teeth (archives remain ~2.7× better verified-per-tap); what it no longer buys
  is permanent capacity the human verbs are supposed to earn.
- 2026-07-26 — **`scripts/play-probe.mjs` — the project can now LOOK at itself.**
  Every UI change for weeks was built, typechecked, tested, deployed and never
  once viewed; the owner kept finding things in screenshots that nobody here had
  seen. The probe drives the real build in a real browser at phone size, taps
  the verbs in a plausible order, and prints what each HUD number did over time.
  It found the ratchet bug on its first run — a defect no unit test could catch,
  because every individual piece behaved exactly as written. **Look at the game
  before saying it works.**
- 2026-07-26 — **"What are we salvaging?" — nothing, and the answer rebuilt rung
  1.** `resources.data` was a counter with no referent in the dataset;
  Extraction turned it into an integer and called it "statements", while a
  hand-drawn line minted a real triple over two real synsets. Two different
  things shared one word and one of them did not exist — a GLOSSARY/SPEC
  violation and the vocabulary disease one level below display. Now a
  **passage** is one real concept's text (the noun changed because the thing
  did: a token is a sub-word unit, and "passage" is standard IR vocabulary, not
  a coinage), Salvage samples the player's own board weighted by the source
  fork, and Extraction proposes REAL relations from the shipped table, gated on
  holding a passage about one end. Save v14, pool starts empty (a v13 save
  recorded a quantity of text and never what it was about, so there is nothing
  to convert).
- 2026-07-26 — **Confirming a machine's proposal is a verb, because without it
  extraction was a trap.** Extracted edges arrive unchecked, nothing in the
  engine ever flipped an edge to checked, and the offer list excluded all drawn
  edges — so extracted lines could only rot AND extraction consumed the chance
  to draw that relation by hand. Now an unchecked line stays tappable and a
  Connect on it flips it, moving the statement from unverified to verified
  without minting a second one.
- 2026-07-26 — **Taps on controls inside the stage no longer cancel auto-fit.**
  The dotted-line targets, the fit button and the inspect card all sit inside the
  stage, so their taps reached the board's pointer handlers and silently turned
  framing off; concepts then drifted off the edges as the graph grew, for a
  reason no player could connect to the button they pressed. Caught by looking at
  a screenshot from `play-probe`, not by any test.

---

## 2026-07-26 — WAYS OF WORKING RESET

Entries above this line are long because the one-line rule did not exist yet.
**From here, one line per decision.**

- 2026-07-26 — **Process reset**: five rules in CLAUDE.md, `docs/NEXT.md` is the queue, WIP=1. Researched, not invented (Claude Code best practices + Kanban WIP limits). Because 25.6% of 82 commits were player-visible.
- 2026-07-26 — **`the-process` agent added**: audits ways of working by counting, never opining, and may not propose new process.
- 2026-07-26 — **First audit, baseline set**: 82 commits, 25.6% player-visible, 8 subsystems rebuilt within 48h, 14 save versions, evidence in 1 of 21 player-visible commits, 0 of 4 gates with a durable red-verification record. Beat it.
- 2026-07-26 — **Replies capped at 150 words**, short sentences, tables not paragraphs. Owner cannot read long output on a phone. Detail lives in commits and docs.
- 2026-07-26 — **Claude holds the queue line**: work off `NEXT.md` gets flagged in one sentence and queued, never silently swapped.
- 2026-07-26 — **Context window shipped (save v15)**: `ANCHOR_CAP` named, drawn as a ring, grown with checked statements; a full window BLOCKS discovery instead of silently folding a concept away. Migration seeds it from what the save already holds, so nobody loses a concept.
- 2026-07-26 — **Three collapse tests rewritten, not deleted**: one hung forever (`while (attentionFree > 0) discover` never drains against a full window), two assumed unbounded hand-discovery. The window makes discover-spam structurally impossible, so each now asserts that stronger property.
- 2026-07-26 — **play-probe reads HUD cells by LABEL, not index**: inserting the context cell shifted every column and it reported context under "checked" — the readouts bug, inside the tool built to catch it.
- 2026-07-26 — **Ladder repriced from measurement**: Extractor 40→14 (ratio 1.30→1.25), Reasoner 90→36, context growth 12→8 (ratio 1.35→1.22). First agent now affordable at t=210s in a real 10-minute browser run; before, play froze at 20/20 with everything idle.
- 2026-07-26 — **The "frozen economy" was the PROBE, twice**: it never clicked Review (the only way unverified becomes checked), and its clicks had no timeout so Playwright's wait-for-stable burned 8s per click on a live force simulation — 400 of 600 seconds spent retrying one wobbling button, logged as a dead game. Probe now reviews and clicks with force+1.5s.
- 2026-07-26 — **`tokenTail` went dead at v14 and nobody noticed**: the clean/dirty extraction split was replaced by real candidate edges, so "12% rare" is now displayed and consumed by nothing.
- 2026-07-26 — **Owner: the economy is convoluted; simplified to three verbs** (Discover → Extract → Confirm) in `docs/MODEL.md`, superseding the ECONOMY.md ladder. Thirteen things to press became three plus one upgrade.
- 2026-07-26 — **Dotted edges will come ONLY from Extract** (owner's proposal). Today they appear from the dataset the moment two concepts are on the board, which is why Extract looked like it did nothing.
- 2026-07-26 — **Review desk deleted**: it sampled an abstract statement pool and touched nothing on the board. Confirming a dotted edge is the check.
- 2026-07-26 — **Passages and Salvage deleted**: a middleman between two verbs; the owner asked what a passage was twice.
- 2026-07-26 — **Attention grows very slowly and can DEGRADE** (owner). It is a slow background reward, never a currency; 4→13 in two minutes was wrong.
- 2026-07-26 — **Dotted lines are now PROPOSALS, not scenery**: they are unchecked edges Extract produced, not every relation the dataset offers between two concepts on the board. Extract now says how many it proposed. Needed no new state — unchecked edges already existed; they simply were not what the board offered.
- 2026-07-26 — **Review desk deleted; the trap moved onto the board**: confirming a FAKE proposal now feeds `falselyVerified` (it was being cleared on confirm, which laundered every lie). Desk minting, the `reviewBatch` action and `mintReview` are gone; `state.review` stays in the save, permanently empty.
- 2026-07-26 — **An ignored proposal EXPIRES rather than becoming permanent debt**: a rotted unchecked edge used to leave a `drifted` statement that only the review desk could clear, so deleting the desk turned rot into an unpayable tax.
- 2026-07-26 — **NOT DEPLOYED: deleting the desk is a net regression until growth is unblocked.** Measured: play stalls at 24/24 concepts from t=135 with `checked` pinned at 19%, because relations among held concepts run out, Grow context is priced in checked, and discovery is blocked by a full window. Circular. The window was specified to make concepts go DARK, not to block discovery — that is the fix, and it is an owner call.
- 2026-07-26 — **A full context window no longer blocks discovery; it drops the OLDEST out of context.** Blocking made the game circular and unwinnable (measured stall at 24/24 from t=135). Out-of-context concepts stay on the board, dimmed, never deleted; extraction reads only what is in context, which is what makes growing the window mean something. Measured after: 56 recovered at t=300 and still climbing, no stall, Extractor affordable from t=105.
- 2026-07-26 — **Passages and Salvage deleted.** A passage was a middleman between two verbs — gather text so you can convert text — and the owner asked what one was twice. Extraction now reads the concepts IN CONTEXT directly, costs nothing, and is self-limiting; attention is spent on confirming. Capacity scales with the context window, so the window pays for itself. `pool`, `source` and `tokenTail` stay in the save, unread.
- 2026-07-26 — **Extraction costs a slot and takes 5s, and flashes while it runs** (owner: "what does extract spend and why is it instant"). It was the only verb in the game that cost nothing — Discover books 18s, Connect 7s, Extract was free and instant. Candidates now ride on the booking; while it runs the board shows travelling dotted lines between the pairs it is reading, plus stubs reaching outward from concepts that have real relations to things you have not discovered yet.
- 2026-07-26 — **The Extract button is disabled when there is nothing left to propose.** It stayed enabled and did nothing, which reads as broken — and made the probe click it forever, producing a 4-minute run with zero statements that I nearly reported as a regression.
- 2026-07-26 — **play-probe discovers LAST.** Discovery is the slowest verb (18s a slot); booking every free slot on it starves extraction completely. The probe did exactly that and reported the starvation as a bug.
- 2026-07-26 — **The "N lines filling" chip is gone** (owner: "it should not be there… these are edges and it's useless"). The line is already visibly filling ON THE BOARD, so the chip restated what you were looking at, in a word the rest of the game had stopped using.
- 2026-07-26 — **Trust numbers are FRACTIONS, not percentages** (owner: "i don't understand 90% checked and 100% agreeing"). "90%" never says ninety percent OF WHAT; "36/40" answers that with no explanation. Both denominators are now on screen. What each one MEANS is still unexplained — that is a prose slot, not a display fix.
- 2026-07-26 — **In-game help shipped (`?` in the dock).** Every number in it is READ FROM THE ENGINE, never typed — a help page that drifts from the code teaches a wrong game with authority. The goal line is an ⟨owner⟩ slot: the prose rule stands, and what shipped is mechanical fact with no voice.
- 2026-07-26 — **Grow context spends NOTHING; it is gated on lifetime confirmed work.** It used to add its price to `provenance.unverified`, relabelling that many CONFIRMED statements as unconfirmed — 10/10 checked became 2/10 for buying an upgrade — and there was nothing the player could do about it, because those statements hang off no edge and nothing in generation 1 reduces `drifted`. Owner: "what am I supposed to check". Answer: nothing, ever. Independently confirmed by genre review.
- 2026-07-26 — **The extraction flash shows the CANDIDATES on the booking, not every relation on the board.** It strobed all of `potential` — including already-drawn and never-to-be-proposed lines — so ~15 lit up and 3 landed. Owner: "why does extract display everything instead of showing just 1 connection".
