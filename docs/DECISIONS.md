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
- 2026-07-27 — **The context window holds a CONNECTED slice of the taxonomy, not the newest N anchors.** Anchors append breadth-first, so a parent always has a lower id and a tail of the newest N contains almost no parents; `potentialEdges` then found no held ancestor and fell back to the root. Measured at window 16: **2 real parents in context against 1181 spokes to `entity`** — from roughly the 18th concept onward every relation Extract could propose was `X is a entity`. The window now admits a concept together with the path that reaches it, and the path counts against the window, so the HUD number stays honest. Found by `the-graph`, ranked its #1.
- 2026-07-27 — **The prose rule is amended: mechanical explanation is documentation, not voice.** Owner: "please do prose, i don't understand what's happening anymore and i need to see explanations in game and they must make sense". The help sheet and the new in-game glossary are written here; jokes, flavour, Field Notes, event text and the cold open stay ⟨owner⟩ slots. The test is voice, not word count: if it has a personality it is not mine to write. `the-graph` had ruled the help sheet a violation of the old rule; it was right, so the rule changed deliberately instead of being ignored.
- 2026-07-27 — **The `lines` readout is now called `edges`** (owner, twice: "these are edges"). An edge is the real term for a link in a graph, the game is educational, and a softer synonym taught nothing. Internal key unchanged.
- 2026-07-27 — **In-game glossary shipped** (`?` → Glossary). Real vocabulary — concept/synset, node, edge, statement/triple, is-a/hypernym, category/lexicographer file, context window, provenance, drift — each matched to `docs/GLOSSARY.md`, which cites its sources. The glossary wins if they disagree.
- 2026-07-27 — **`check:align` had been skipping every viewport, silently.** Its locator was `button.act.primary`; the moment Extract also became primary it resolved to two elements and every click threw strict-mode. Now located by text, verified going RED with a 9px node offset. Rule 4 exists because of exactly this, and it still happened.
- 2026-07-27 — **Every concept carries a rarity score, 0..100** (owner: "rate the entities by rarity, so that we can determine what's cool and what's not"). Seven signals — depth, subtree size, synonyms, sense rank, polysemy, label length, relation degree — weighted in `scripts/rarity.mjs`, shipped as `r` in each chunk, reported in `docs/RARITY.md`. It is OBSCURITY, not corpus frequency: WordNet ships no occurrence counts and we do not invent data (SIMPLIFICATIONS S16).
- 2026-07-27 — **Rarity is measured against the FULL noun lexicon, not the shipped 4,096.** The first version measured the slice; because the slice is breadth-first, its last ~1,800 concepts are all leaves at depth 5 and `pie chart`, `Laffer curve` and `undirected graph` scored identically. Against the whole tree `bird` has 871 descendants and depth spans 0..16. The generated report caught it in one read — which is why the report is generated with the data.
- 2026-07-27 — **Tier boundaries (60/66/69/72) are frozen scores read off the shipped distribution's quintiles, not live percentiles.** Live percentiles would relabel every concept whenever the dataset moved; evenly-spaced bands would have put 83% of the dataset in two tiers, because almost everything in a lexicon is specific.
- 2026-07-27 — **`docs/CONCEPTS.tsv` ships the whole dataset greppable** (id, label, rarity, tier, category, depth, definition). A session writing story beats has to name concepts by the integer id a save stores, and RARITY.md shows eighty of 4,096.
- 2026-07-27 — **Cross-session handoff is a committed file, nothing else.** Sessions here cannot see each other. The story session writes `docs/STORY.md`; this branch owns `src/`.
- 2026-07-27 — **Attention grows one slot per DECADE of confirmed work, from a base of 4.** Was 4.5 per decade, which took it 4→13 in 150 seconds and deleted the only bottleneck the economy has. Nothing to a million confirmations is now six slots. Owner: "attention must grow much slower".
- 2026-07-27 — **The one degradation: unconfirmed work shrinks your attention.** Past 8 unverified statements you lose a slot per further decade, so ~80 unchecked costs one and ~800 costs two. Chosen because it mirrors the growth term, reads off numbers already on the HUD (the gap between `checked` and `statements`), and creates the decision "don't extract more than you can confirm". It is a capacity reduction, never a debt — clear the backlog and the slot returns, and the ticker says so in both directions. `docs/MODEL.md` left this trigger open; this closes it with ONE condition, because a game with three ways to lose a slot has none the player can name.
- 2026-07-27 — **Tempo slowed ~2.5×**: discover 18s→40s, connect 7s→20s, extract 5s→12s (owner: "we need to slow the game down significantly… the edge being established should take slower"). Measured: 10 minutes of probe play now reaches 36 statements and attention 5; the old build reached 21 statements and attention 9 in two.
- 2026-07-27 — **Timing assertions in tests read the constants, never literals.** Three tests broke on the slowdown by hardcoding `18_001` and `20_000`; a fourth hardcoded a 400-step loop tuned to an 18-second discovery. They now derive from `DISCOVER_MS`/`CONNECT_MS`, so a tempo change cannot fail a test that is not about tempo.
- 2026-07-27 — **Vignette choices can require concepts and relation types you have discovered** (`VignetteChoice.requires`, additive and optional, no save migration). The rule is one sentence: **a choice you cannot meet is SHOWN and not takeable, never hidden.** The locked door is the only thing in the game that says what discovering more of the graph is FOR; filtering it out would delete the mechanic and leave the player unaware the choice existed. It names what it wants, in ontology labels and `REL_NAMES` — both data, neither authored copy.
- 2026-07-27 — **Known = every concept ON THE BOARD, and every relation type DRAWN.** Not "in context" — falling out of the window is about what the model holds, and gating story on it would make a beat unwinnable for the crime of playing on. Not "confirmed" — that would gate story behind a second, unrelated action.
- 2026-07-27 — **If a beat somehow has no takeable choice, every choice opens.** `check:story` guarantees the data ships an ungated exit; a modal with no exit is an unrecoverable save, and "the data promised" is not a thing to bet a save file on. Failing open costs a bypassed gate in a case that should never occur; failing closed costs the game. The gate is enforced in the REDUCER, not only on the button — a disabled button is a suggestion, and the play probe force-clicks.
- 2026-07-27 — **`check:align`'s settle wait now READS `DISCOVER_MS` from the engine.** It was a hard-coded 21000; slowing discovery to 40s sent the check straight back to skipping every viewport ("only 1 nodes on the board"). Second time in one day that this guard stopped measuring without failing — a wait tuned to a constant has to read the constant.
- 2026-07-27 — **The ★ prose guardrail is REVERSED: prose is machine-drafted and owner-edited.** Owner's call, taken from the worldbuilding branch (`782115e`) which made it first and made it broader. My own narrower amendment earlier the same day — "mechanical explanation is documentation, voice is the owner's" — is superseded and removed, because two branches holding different versions of the most load-bearing rule in the repo is worse than either version. The thesis is unchanged: the bar is that a line must be good enough the owner would defend it.
- 2026-07-27 — **All four gates proven RED, with the sabotage and the observed output written into each script.** `check:core` — a `typeof window` in `attentionPenalty`, reported at engine.ts:267 with the string literal blanked, which also proves the comment/string stripper runs on real code. `check:vocab` — the `recovered` HUD cell pointed back at `$game.graph.nodes`, i.e. the original 25-vs-3 bug, caught at the right line. `check:align` — `.node { margin-left: 9px }`, every element in all three viewports off by (9.0, 0.0). `play` — nodes rendered under a class the probe does not read, so the `nodes` column pinned at 0 while `rec` climbed, which is the blank-board signature no unit test can see. Rule 4 says a check nobody has broken is assumed vacuous; the record now outlives the session, which was the point.
- 2026-07-27 — **The ★ prose guardrail is REVERSED: prose is machine-drafted and owner-edited.** The old rule ("every player-facing sentence is written by the owner, the pipeline never generates sentences") had been called as load-bearing as "never break a save", on the grounds that a game satirising AI slop cannot ship AI slop. Owner's call, after being shown that the writing load had already fallen from 1,676 slots to 5 frames and pushing ahead anyway: "i want you to do the entire story. with lots of agents. and then i'll come up with lots of ideas and we'll iterate lots of times." The thesis is unchanged — the bar is now that a line must be good enough the owner would defend it, and the ⟨owner⟩ slot marks prose not yet passed over rather than prose that does not exist. `CLAUDE.md` and `VISION.md` amended together so the repo does not hold two contradictory rules.
- 2026-07-27 — **The starmap replaces the Discover button.** Lanes out of every concept you hold, in three states: solid (destination already yours, drawn as record and NOT a tap target), dotted (ungated into the dark — the move), locked (gated on a concept you lack: VISIBLE, not takeable, key shown masked). Read from `docs/graph/story.json`, which is already a numeric-id graph. No new save fields: all three states derive from `forged.anchors`.
- 2026-07-27 — **Discovery can TARGET a node** (`{type:'discover', node}`). It was `nextId++`, strictly sequential, so a lane naming its destination could not be built on it. `nextId` becomes a HIGH-WATER MARK rather than a count — targeted discovery makes the anchor list sparse, and anything reading `nextId` as "how many concepts you have" is wrong from here.
- 2026-07-27 — **The lane strip gives each state a seat (3 dotted · 1-2 solid · 2 locked), not priority order.** Filling by priority let dotted take every slot, which turns a map into a to-do list. Solid lanes are also non-tappable: they go where you already are, and a 300-second probe run spent the whole time tapping one and never left the first ring — exactly what a player would have done.
- 2026-07-27 — **The masked key needs no marker format.** The prose masking renderer is blocked on span markers that do not exist; a lane's key is `requires.concepts: number[]`, so the engine already knows the concept by id. No string matching, no lemma ambiguity. Mask length carries the word's SHAPE, clamped to 12 so a compound reads as a word rather than a redaction bar.
- 2026-07-27 — **"Never break a save" is REVERSED: saves are breakable, migrations optional.** Owner, asked whether the depth-first dataset re-aim should renumber node ids now or ship behind a migration: "to be honest i'm completely ok with breaking saves at any time." This unblocks the re-aim, which is worth 215 of 308 story beats and every concrete word in the game (`wolf`, `fish`, `firearm` are all absent today). `version` stays on saves so code can identify the format, and export/import keeps working because that is how a save moves between devices. A reset must be stated in the commit message; silent resets remain defects. Second load-bearing rule reversed today — noted here so a future session sees the pattern rather than re-deriving either rule from first principles.
- 2026-07-27 — **The vocabulary is curated for WEIRD-ABSTRACT, not for concrete depth.** Owner: "i want weird abstract shit in the story, not wolves". Reverses my own reading from earlier the same day, which argued the breadth-first dataset was too shallow and should be re-aimed depth-first to reach `wolf`, `firearm`, `syphilis`. That imported a generic fiction instinct — "concrete nouns make better scenes" — into a game whose subject matter IS the upper ontology; `wolf` would make it a nature documentary with RDF stapled on. Measured after the fact: **1,212 weird-abstract concepts already ship** (`otherworld`, `eidos`, `might-have-been`, `nonevent`, `unconnectedness`, `dealignment`, `reciprocality`, `bilocation`, `irreversible process`). The dataset is not too shallow, it is UNCURATED — the real defect is the junk beside them (`jimdandy`, `instalike`, `must-see`, `freshener`, `stinker`). That is a filter and a score, not a rebuild.
- 2026-07-27 — **The narrator drifts and never admits it.** Owner asked for "weird shit like stanley parable". The fit is that ours controls comprehension rather than merely describing: the masking IS the narrator's doing, so the late turn is that the blocks were never the player's ignorance but redaction. Chosen posture: the narrator stays corporate and composed, never breaks character, never addresses the player. WordNet glosses stay verbatim and true — licensed data, always honest — while the narrator's FRAMING of them diverges from the gloss sitting beside it. The player can hold both on screen and watch the gap widen, which makes model collapse readable and makes the title do literal work. Rejected: reacting to disobedience Stanley-style (multiplies the writing load per beat, joke wears thin over 93 beats) and a full fourth-wall break (reads as edgy unless the build-up earns it).
- 2026-07-27 — **Undiscovered concepts render as WORDS in the graph's own language, not as blocks.** Owner: "maybe instead of like doing XXX we invent a language…. haha". Adopted, because it is not decoration: an opaque identifier with a label bound to it is what an ontology IS — `wn:00015568-n` means nothing until `rdfs:label` attaches "animal" — so the invented word is the thing the engine actually holds and the English label is the annotation. The player reads the graph the way the machine does, and "discovering" a concept is literally label binding. Blocks say "you do not know this", which is dead text; a stable word says "this has a name you have not learned" and becomes recognisable across beats long before it is readable, which is the No Man's Sky feeling that ▓▓▓ can never give. **Morphology follows the taxonomy**: a concept's word is its parent's word plus one syllable, so `abstraction` is `ka-ta` and every descendant opens `ka-ta-` — the player learns the shape of the tree by ear before reading any of it. Labelled simplification: rendering a hypernym hierarchy as a morphological one is a game convention, not a claim about language. Generated by `scripts/build-lexicon.mjs`, 4,096 words, 0 collisions, deterministic from the shipped ontology — data, not prose.
- 2026-07-27 — **Economy clean-sheet reviewed; `SOLID · RAW · ROT` recommended, NOT yet accepted** (`docs/ECONOMY_SRR.md`). 11 agents: 2 diagnoses, 5 proposals, 3 judges, 1 synthesis. The finding that matters is that the MODEL was never the problem — the names are: `checked` refers to four different things, `Extract` (player verb, only real relations) and `Extractor` (machine, only invented ones) mean opposite things about truth, and the HUD never calls `readouts.ts` at all, so "one word, one quantity" reads as enforced and is not. Four resources replace roughly twelve nouns: **Words** (concepts you can read now), **Solid** (checked facts that never rot), **Raw** (machine facts nobody has checked), **Rot** (worn out, permanently). Lane join in both directions: a step costs Solid and is free if you already know the concept, and `factsPerSecond = min(0.4 × machines, 0.15 × Words)` — you cannot extract relations about entities you do not hold, so walking the story is the only income upgrade and an idle-only player flatlines with the reason stated on screen. Two landmines found and verified by hand: `REFLECT_MIN_CONCEPTS = 820` against **106 concepts reachable via lanes**, so prestige becomes unreachable the moment lanes replace the discover button; and the proposal deletes Attention entirely, which kills `NEXT.md` item 1 while it is in flight. Owner rejected adding more resources for story flavour — variety lives in the 4,096-word lexicon, not the HUD.
- 2026-07-27 — **The masking renderer ships: ⟦spans⟧ resolve to English or to the graph's own word.** Everything outside the brackets is never touched. Retroactive by construction — it renders from live state, so discovering a concept resolves it in every beat including ones already read; a cached render would be the bug.
- 2026-07-27 — **A ⟦span⟧ resolves against the concepts ITS OWN BEAT declares, never a global lemma index.** The story data ships no span→id map, so the table is built per beat from `at`, each choice's `to`, and every id in `requires.concepts` — at most a dozen entries. A span that does not resolve is LEFT VISIBLE in English: showing a word we could not identify costs nothing, masking one we misidentified corrupts the sentence.
- 2026-07-27 — **Position is derived from the last anchor, not stored.** Targeted discovery appends the concept you travelled to, so `anchors` already records where you are, in order. Falls back to the newest anchor that HAS a beat, so a concept discovered off the story graph does not strand the player.
- 2026-07-27 — **Two masking tests were caught VACUOUS before shipping.** The truncation test compared `graphWord(228)` against `graphWord(228)` rendered, so shortening the function moved both sides and it passed with the mechanic destroyed; it now asserts against literals from the shipped data. A test for "this value is not shortened" cannot get its expected value from the function that shortens it.
- 2026-07-27 — **`apply()` was not a function of its arguments, and now is.** `tick` aliased `resources` to `state.resources` and gated the copy-on-write on `touched`, which means "something changed" — not "resources were copied". Four branches set it without copying (line decay, agent lines, folded concepts, confirm-existing-edge), so every later write went into the CALLER'S object: input balances rewrote themselves, `next.resources === state.resources`, and calling apply twice with the same arguments returned different answers — a result computed as 4 later read 3. Fixed with one flag, one meaning: `own()` copies exactly once and is the only way to get a writable `resources`. Found by an adversarial workflow (6 blind lenses, 3 refuting skeptics per finding); all three skeptics confirmed by EXECUTION and one reproduced it from a plain action sequence at `initialState`.
- 2026-07-27 — **The suite's only purity assertion was vacuous.** `test/engine.test.ts:232` ticks `initialState()`, where `lastTick` is 0, `edges` is empty, every generator is 0 and there are no bookings — not one of the four offending branches can fire. `test/purity.test.ts` tests the states where the reducer does work, and its identity check is CONDITIONAL on the value changing: structural sharing is correct and an unconditional `not.toBe` fails on an idle tick, so it would have been deleted, taking the real assertion with it.
- 2026-07-27 — **`rel 8` is "named in definition".** Cross-links mined from the glosses themselves: concept A's definition names concept B. Not a WordNet pointer and deliberately not dressed as one — the name states the evidence, because a gloss mentioning a word is not a claim that the two are related. The taxonomy is a tree and cannot produce sideways routes; these are what make the map a labyrinth.
- 2026-07-27 — **A choice with no written label falls back to a ⟦span⟧ naming its destination.** 1,799 of 1,879 shipped choices have no label — beats went to concept granularity and the prose has not caught up — so rendering them verbatim is a screen of blank buttons, the exact failure VOICE.md §4 P5 names. The fallback is DATA through the same masking path, so it shows the English label if you hold the concept and the graph's word if you do not, and it vanishes as real labels are written.
- 2026-07-27 — **`check:story` now GATES the deploy.** The workflow ran typecheck, vitest, core-purity and vocabulary but never read `docs/graph/`, so a dead-end beat or an unobtainable gate key would have shipped. Verified red by gating every exit of beat 0 on concept 4095: "dead end: 1 beat(s) have no ungated exit" plus "unobtainable key", exit 1.
- 2026-07-27 — **`claude/project-review-build-shub7f` is off the deploy trigger.** It published the same site under "latest push wins" and is NOT contained in the dev branch, so any push to it would have overwritten the live site with two-day-old code, silently, with a green tick. One publishing branch only.
- 2026-07-27 — **The UI is scrapped: the opening is the graph and one sentence, both foreign.** Owner: "there must be nothing even in GUI… let player eyeball the graph." Gone from the opening screen: the HUD row, the Extract button, the machine cards, every number and every English label. What is left is five unnamed nodes, a beat in the graph's language, three choices, and `⋯`.
- 2026-07-27 — **The HUD is not absent, it is UNLEARNED.** A readout is a word plus a number, and a word you cannot read is not a readout — so each appears only once its noun has been learned, and the interface assembles itself as the player becomes literate. That is also what keeps this an incremental: the UI is a progression track, not chrome. Same rule for Extract (`record`) and the machine roster (`machines`).
- 2026-07-27 — **The whole sentence is foreign, not just the nouns.** Concept spans resolve through `lexicon.json`; every other word resolves through `language.json`'s 245 types. This VOIDS docs/VOICE.md §4 as written — it required stakes in the verb so a sentence survived masked nouns, which assumed an English carrier. "Take the ka-sa side" was masked English; this is a language.
- 2026-07-27 — **Carrier words are learned by FREQUENCY, and exposure is DERIVED.** A word seen `LEARN_AT = 3` times reads as English. Where the player has been is already in `forged.anchors`, so exposure is counted over the beats at those anchors — no save field, and it cannot desynchronise from the board.
- 2026-07-27 — **The seed does not count toward exposure, and its concepts are held but NOT bound.** Counting the five seed beats gave five beats of prose before the first tap, which pushed `the`/`is`/`you` past the threshold and rendered the opening in plain English — measured: "Under power the tree stops. Whatever you take from here does not divide again". "Visible, not readable" is the opening, so exposure starts at nothing.
- 2026-07-27 — **A node's board label is its WORD, not its English name.** The board printed `system` / `information` / `language` on a screen whose entire point is that you cannot read it. A node reads in English only once its concept is bound, so a name on the board and a name in a sentence are visibly the same thing.
- 2026-07-27 — **Gate keys come from the destination's own definition, not a hash.** Owner, playing a build: "i don't understand why some options are open and some not, like i don't see any logic behind." Correct — keys were `teachable[(b.at * 7 + n * 101) % teachable.length]`, so `chelation` was locked by `solid` because arithmetic said so. A door is now locked by a word from the gloss of what is behind it: you cannot go somewhere until you can read what it IS. Statable in one sentence and verifiable on screen, since the gloss is shown. Gated branches fall 602 → 224 because a branch with no honest key now ships OPEN — an arbitrary lock is worse than no lock, since it teaches the player that the rules are noise.
- 2026-07-27 — **Concept words lose their hyphens.** `ka-ta-na-to` reads as punctuation and looks like an identifier; `katanato` reads as a word. Owner: "i don't like how the hyphenated stuff looks". The inherited stem still shows (`kata` → `katara` → `katasha`), so the taxonomic kinship the morphology exists for survives intact.
- 2026-07-27 — **Node memory is what prestige inherits** (`docs/MEMORY.md`, spec only). Owner asked for inventory and node memories. Words are already a comprehension inventory; memory is new and stored ON the node: which exit you took there, and whether you could read the place at the time. It drifts on prestige — `took` moves to a sibling, `bound` flips false — so each generation begins richer and more wrong, which is VISION.md's stated prestige rule made personal. The mechanic it creates is trust-the-memory (free, possibly false) versus walk-it-again (costly, true): speed versus truth, the game's core tension, finally expressed in the story layer instead of only the machine layer. Generation 1 memories are true by construction or the mechanic never teaches itself.
- 2026-07-27 — **Attention is deleted.** Owner: "i don't like the attention anymore yeah." It was queue item 1 and in flight in the engine session; it is now void, and `docs/ECONOMY_SRR.md` §5 (which deletes `attentionCap`, `attentionFree`, bookings, the supervision dial and `state.attention`) is unblocked. Speed-versus-truth stops being a capacity you allocate and becomes one toggle per machine: *watched* produces slowly and clean, *loose* produces fast and raw. That is the same tension with none of the bookkeeping the owner has now called confusing twice. The attention-curve work already merged on the dev branch (`1fb1a06`) is superseded rather than reverted — the economy rewrite removes the field it tunes.
- 2026-07-28 — **`SOLID · RAW · ROT` is built in the core.** Four quantities (Words · Solid · Raw · Rot) replace ~twelve nouns; the save drops from 35 fields to 12; attention, bookings, the review desk, the six-rung ladder, the context window, REDRIFT, drawn-edge storage and three machines are deleted. Saves reset — an old blob rebuilds as a fresh run, keeps its concepts, and says so.
- 2026-07-28 — **Words is DERIVED from the concepts you hold, never stored.** `held` minus the seed, which is exactly `literacy.bound()`, so the income cap, the board, the story position and the readout cannot disagree. `forged` (anchors, links, edges, frontier, foldedNodes, nextId) is gone with it.
- 2026-07-28 — **The watching penalty applies AFTER the vocabulary cap, not before.** Capped afterwards, a vocabulary-bound player pays nothing for watching — so the game's only decision evaporates exactly where the join binds, which is most of a run. Measured over 30 minutes: watched reaches 33 Words / 0 Rot at 0.22 facts/s, loose-plus-tapping reaches 52 Words / 9.3 Rot at 2.40 facts/s.
- 2026-07-28 — **A run opens owning one Extractor and 18 Solid, watched by default.** Words start at zero so production starts at zero: without both, a save can never earn either and the opening is a softlock rather than a slow start. Watched is the default because Raw buys nothing and "Check" is a word the player cannot read yet.
- 2026-07-28 — **Away time respects the watched/loose split, against `ECONOMY_SRR.md` §3's "away pile → Raw".** Banking a watched player's output as Raw makes closing the app a straight downgrade for the play style the game rewards — a regression a logged decision already fixed once (v9→v10). Checkers run offline too; nothing rots while away.
- 2026-07-28 — **Raw decays for ONE reason: how synthetic the generation is.** No graph-size term, no rot-share feedback. The old model had Raw falling for two reasons and Solid for a third (REDRIFT), so nothing on screen had a cause a player could name. Consequence stated plainly: this item does NOT re-establish "unreachable by construction" — Rot is a sink and a scoreboard, not a multiplier on anything.
- 2026-07-28 — **`REFLECT_MIN_CONCEPTS = 820` becomes `RETRAIN_MIN_WORDS = 120`, and a test measures the world.** 4,080 of 4,096 concepts are reachable from the seed through gated lanes (4,075 of them not already held), so `READABLE_CONCEPTS = 4075` is the denominator under `Words N / M`. 120 is ~3% of the world and ~16,450 Solid on the step curve; 300 would be 2.1 million. Both constants now fail a test if the story graph is re-cut.
- 2026-07-28 — **Retrain keeps the concepts and resets the step counter.** Words never fall (VISION: nothing you chose is deleted), the exponential step price restarts at 6, and you inherit 25% of what your machines minted as Raw. That is the sprint: everywhere you walked last generation is free to walk again.
- 2026-07-28 — **Vignettes, `chooseOption`, `modifiers` and `flags` are deleted, beyond `ECONOMY_SRR.md` §5's list.** The one shipped vignette triggered on `minTriples` (a deleted noun) and two of its four effect levers were attention and the Orchestrator (both deleted). The story is the lane graph now; keeping the modal system would have been the "dead field just in case" the rewrite exists to stop.
- 2026-07-28 — **`check:vocab` was vacuous twice over, and is now the real rule.** Its only clause forbade `state.graph.*`, which this rewrite deleted outright — so it policed something that could no longer exist. Its stripper also blanked `${...}` inside template literals, i.e. it was blind to the exact construction every ticker line uses. Both fixed; proven red at the right line for a quantity read off the save, for Words counted by hand, and for a read inside an interpolation.
- 2026-07-28 — **The docs were cut to match the shipped economy rather than banner-flagged.** `ECONOMY.md`, `ECONOMY_MODEL.md` and `MODEL.md` are deleted; `GLOSSARY.md` keeps the rows the game no longer uses as reference only; `HANDOVER.md` was rewritten against the code, including the parts that are red. A stale document with a warning on it is still a document the next session reads and believes — that is the most expensive defect on record in `BACKLOG.md`.
- 2026-07-28 — **The HUD's literacy gate is "one word bound", not `canRead(noun)`, and the reason is measured.** `canRead` is the gate this surface wants and the one the beat prose, the lane labels and the node labels all use — but against the shipped corpus it is wrong in both directions for the four economy nouns: `words` appears ONCE across 446 beats against `LEARN_AT = 3`, so `canRead` hides Words forever; `solid` / `raw` / `rot` are not in `language.json` at all, so `canRead` returns true by default and shows the whole bar at t=0. So the HUD appears once the player has bound their first word (`READOUTS.words > 0`, i.e. `bound()`), and each readout then waits for its own quantity. Content dependency, not a decision to paper over: when the corpus teaches the four nouns, `hudReady` becomes `canRead` and nothing else changes.
- 2026-07-28 — **A substance state joins the bar at ONE WHOLE FACT, not at "greater than zero".** Stocks display as integers with the remainder accruing underneath, so a `> 0` gate rendered `Raw 0 · Rot 0` for a full 300-second probe run — a readout on screen, not moving, and not actually zero.
- 2026-07-28 — **`Words N / M` is printed plain, bypassing `format`.** It is the only place a number is compared against a fixed knowable other number, and `4.08K` is not a denominator anyone can hold in their head. The suffixing formatter is right everywhere a stock can reach the trillions and wrong here, where the ceiling is four thousand.
- 2026-07-28 — **Lanes get level-of-detail: six shown, the rest counted on a "+N more ways on" button.** Measured: 79 of 446 beats offer more than 12 choices and one offers 371, which rendered as 371 buttons under a phone-sized board. `starmap.ts`'s rule is that an absent edge teaches nothing — a counted, one-tap-expandable remainder is not absent, a silently truncated list would be.
- 2026-07-28 — **No generation number on the Retrain button.** `generation` is a real save field with no readout behind it, so printing it invents a word and `check:vocab` fails the build on it. `ECONOMY_SRR.md` §3 already said it: generation is a badge, not a number.
- 2026-07-28 — **`check-alignment.mjs` had stopped running and was repaired, not deferred.** It read `DISCOVER_MS` out of `engine.ts` to size its settle wait; the booking queue is deleted, so it exited 1 with "could not read DISCOVER_MS" — the right failure, and still an unguarded positioning rule while `src/ui`'s CSS was being rewritten. It now waits on the force simulation (`SETTLE_MS = 6000`, measured settling under 2s). Its mid-flight rim sub-check was removed rather than left filtering an always-empty set and printing "0 rim badges" forever.
- 2026-07-28 — **The three English choice buttons in `play.png` are not a masking leak, and the masker is unchanged.** Reproduced against the real build: "Moloch", "influence" and "juggernaut" ARE the 3 Words the HUD reports — the probe walked into all three children of `power`, each walk binds the concept it lands, and a bound concept renders its English label. It reads as a leak because none of the three has a beat, so `currentBeat` falls back to `power` and the player never appears to move while its exits turn English one at a time. Pinned by a test that asserts the four exits of beat `c176` against shipped lexicon literals in both states, proven red under two sabotages.
- 2026-07-28 — **The ticker speaks the language, and the language's corpus is now every surface rather than only the beats.** A dock reading "something you never checked wore out" above a fully foreign beat tells the player the foreign half is decoration, so every line resolves through `renderMasked` + `literacy.canRead` on the same `LEARN_AT = 3` frequency rule as beat prose — translated at RENDER, not at emit, so a word learned inside a line's 45-second life resolves in the line already on screen and the away-return line (emitted before the first tick, when literacy is still empty) corrects itself instead of shipping foreign. `docs/graph/language.json` grows 338 → 587 types because `scripts/lib/chrome-corpus.mjs` now reads the ticker and the interface themselves — not a hand-kept word list, which drifts the moment another session edits `App.svelte` — and `check:story` validates against the SAME extractor, so generator and gate cannot disagree; proven red four ways (J stale language, K an unregenerated OWNER_LINE, L a changed interface string, M the glued plural). Over-extraction is deliberate and one-directional: a spare entry costs one line of JSON, a missing one is shown in English silently, because an unknown word's default is to be readable.
- 2026-07-28 — **Never glue letters onto a `${…}` in a player-facing template, and `check:story` invariant 7 fails the build on it.** `${MACHINES[id].label}s watched` shipped "Extractors" in plain English between five foreign words (play.png): the hole's contents come from `machines.ts` and the suffix is a bare `s`, so `extractors` is a word that exists only at runtime — the generator never gave it a form and the coverage gate never missed one. Invariants 1-6 were all green while it shipped; it was found by LOOKING AT THE SCREENSHOT. An English plural morpheme on a foreign noun was wrong on its own terms anyway.
- 2026-07-28 — **The interface speaks the language too, and a chrome word is earned by USE rather than by frequency.** `Words · Solid · Raw · Rot`, the machine names, `Check`, the lane counter and the watched/loose toggle now render through the same masker as the beats. But carrier words are learned by frequency over the beats the player has stood in, and NONE of the four nouns appears in a beat — `canRead` would hide the whole HUD forever, and a permanently unreadable interface is a wall, not a game. So a chrome string carries the quantity it is ABOUT and turns English once the player has made that quantity happen: Words at three concepts (`LEARN_AT`), Solid the first time you buy something with it, Raw from the Rot it leaves behind, Rot at three, a machine's name when you own one you BOUGHT rather than the one you woke with. Every witness only ever rises — gating on the stock itself unlearns the noun every time the player spends it, and a word taken back is what VISION forbids. Learning is strictly later than the row appearing, or no label would ever be read foreign; numbers are never masked, and `2 / 4075` over a word you cannot read is the point rather than a rendering failure.
- 2026-07-28 — **The bottleneck sentence stays English and waits for `Words` instead.** It is an explanation — documentation, which the owner asked for in game on 2026-07-27 — so masking it into a paragraph of the graph's tongue teaches nobody anything; the price is that it must not arrive before the noun it explains, because a sentence about your vocabulary shown to a player who cannot read `Words` is noise.
- 2026-07-28 — **The glossary is a RECORD OF YOUR LITERACY, not a decoder.** Resolves a conflict between two owner instructions from 2026-07-27 — "i need to see explanations in game" and "there must be nothing even in GUI" — which the masking work correctly refused to settle on its own. Decided: *nothing in the GUI* wins, but the need behind the glossary is real, so the glossary survives in a form that cannot break the mechanic. It renders in exactly the same masked state as every other surface: a concept you have not bound appears as its graph word, an interface noun you have not earned appears as its carrier word, and the explanations attached to them stay hidden until the noun they explain is readable. It can therefore never teach a word the player has not already earned — it shows what you know, not what things mean. That also makes it a progression display, which is the thing incrementals are good at, rather than a translation key that ends the game in one tap.
- 2026-07-28 — **A corrected memory resets rather than becoming immune** (`docs/MEMORY.md`, open question closed). Walking a node again after a false memory rewrites the memory at the current generation; it does not exempt it from future drift. Immunity would be kinder and would also let a patient player accumulate a permanently true map, which is the exact opposite of the model-collapse result this mechanic exists to make literal. Nothing you hold stays true for free.
- 2026-07-28 — **The player cannot discard a distrusted memory.** Deferred, not rejected: it is cheap to add and it would make paranoia playable, but it is a mechanic to add after watching someone play with the drift, not before. Adding it now would be balancing a feeling nobody has had yet.
- 2026-07-28 — **The join was ALREADY fixed and the docs were the bug; measured rather than argued, and now asserted by a simulation.** Three playtesters reported that `min(0.4 × machines, 0.15 × Words)` never binds — machine-bound from Words 3 onward, walking buys no income, the central design claim dead. True of the build they played and false of the code: `FACT_RATE` went 0.4 → 1.2 in the same commit that fixed the blank frames, and `VISION.md`, `SPEC.md`, `HANDOVER.md`, `GAME_DESIGN.md` and two source comments all still printed 0.4, which is what they read. Measured headless to the first Retrain: **word-bound 67% walking, 74% walking and buying, 0% at rate 0.4.** No constants changed. What changed is that `test/balance.test.ts` now plays a whole run and asserts the shape of it, because no unit test in this repo could have caught a formula that is arithmetically correct and never once binds. Also retired: "walking is the only income upgrade in the game" — for the other third the machines bind and a machine is the upgrade, and a join with one live side is not a join.
- 2026-07-28 — **A leaf's ways on are the concepts its own definition names.** 3,650 of 4,096 concepts have no children, so 89% of walks end at one, and a leaf inherited its parent's choices minus the one just taken — so leaf → leaf → leaf changed one masked noun and nothing else, which is the "you are standing exactly where you were" report. Rejected: authoring 3,650 beats (prose nobody reads twice) and refusing the walk (deletes 3,600 destinations and the Words they carry). `crosslinks.json` already holds "A's gloss contains B" — 3,838 exits from 2,190 leaves, 1,158 landing on a concept that branches — so a leaf leads with `Follow the definition to ⟦…⟧` and keeps the siblings underneath as the floor, because 1,460 leaves have no gloss link and a room with no doors is worse than a repetitive one. `lanes()` had to change with it: it scanned the 446 authored beats, so any lane only a leaf offered was drawn by the screen and refused by the reducer. Costs 48K of bundle, 20% of the story payload.
- 2026-07-28 — **The Checker converts a SHARE of the unchecked pile per second, not a flat amount, and that is what makes watched-versus-loose a decision.** Loose output is bounded by the vocabulary cap — 18/s at the Retrain gate — so a flat 0.25/s needed 72 Checkers, about 12M Solid against ~950 for the Extractors that made the Raw: watched was correct at every point on the curve and Rot, the scoreboard this game is about, stayed at zero. A share holds its split at any pile size. Measured to the gate: watched 51.7m and no Rot; one Checker then loose 61.0m (worse — the buyout has to be bought); four Checkers 46.9m with 3,372 Rot; eight 49.3m; sixteen slower again. An interior optimum, with Rot as the price of the fast line. Rot scales with `syntheticShare`, so each generation needs more Checkers to keep loose worth doing.
- 2026-07-28 — **The same change is the only thing that makes a Retrain's inheritance real.** 25% of what the machines minted arrives as Raw and a flat converter cannot eat a pile of thousands before it decays, so >95% of it rotted for every roster — keeping the machines across a Retrain (already shipped) did not help. Measured on a 5,000-Raw inheritance ten minutes in: 0 Checkers banks 0%, one 28%, four 62%, ten 80%. The comment in `engine.ts` claimed this was a decision; it is one now.
- 2026-07-28 — **The Reasoner is exempt from the watching penalty, and therefore has no toggle at all.** `GLOSSARY.md` and `HANDOVER.md` said "always Solid" from the day the machine existed and `throughput` charged it 45% anyway; the glossary wins (CLAUDE.md). Entailment is monotonic and its closure finite — there is nothing in a derived fact to review. Measured before changing it, because a free upgrade is its own defect: buying only Reasoners reaches the gate in 261 minutes unexempt and 243 exempt, against 47 for Extractors, so the exemption costs the balance nothing and the machine is a trap either way. An inert toggle is worse than none, so `watched` now has one key and the save is **v17** — **saves reset.** Repricing the Reasoner into a machine anyone would buy is a separate item, on the backlog.
- 2026-07-28 — **One tap of Check takes `max(5, 2% of the pile)`.** A flat 5 over-ran the whole pile in the first minute and was 800 taps against a Retrain inheritance: a no-op at one end and the attention tax CLAUDE.md forbids at the other. A share is always worth the tap and never worth sitting there, because one Checker overtakes a tapping thumb within seconds — human-in-the-loop stays optional, with no cooldown and no clock.
- 2026-07-28 — **ONE RULE FOR WHEN A WORD TURNS ENGLISH: three of the thing it names.** Three beats' worth of exposure for a carrier word (`LEARN_AT`), three of the quantity for a readout's noun, on a total that only ever rises so a word is never taken back. That is the whole rule and it is the same number everywhere. It replaces four different rules on one screen — Words at three concepts, Solid at the first machine you buy, Raw at one whole Rot, Rot at three Rot — which a player could not infer from each other and therefore could not infer at all. Witnesses, since the save keeps no high-water mark for the two quantities that fall: Words `words`, Solid `minted`, Raw and Rot `rot`, each with `veteran` so a Retrain never unlearns one. Raw's proxy is late rather than early, which is the correct direction; a noun that arrives before the quantity does is a legend. *(Stated here, not landed: `src/core/readouts.ts` still carries the four old witnesses and is owned by another session this cycle.)*
- 2026-07-28 — **The ticker says everything in words the beats print, and `check:story` invariant 8 fails the build on one that cannot be learned.** The dock's only way into a word is frequency across the beats you have stood in — it is not a place, so standing in it teaches nothing — and every line shipped that morning was written in vocabulary no beat contains: `online`, `wore`, `never`, `out`, `ahead`, `vocabulary`, `slower`, `faster`, `looking`, `away`, `first`, `bound` all occur ZERO times. Invariant 6 was green the whole time, because the words had forms; a form with no way in is a permanent blank, not a slow one. Every mechanical line is now built from words the leaf and descent frames print in the thousands (`take`, `here`, `stops`, `nothing`, `filed`, `hold`), and the two words the beats will never teach — `watched` and `loose` — ride on the quantity each half makes, exactly as the HUD's do. The gate counts the RENDERED corpus, frames filled and leaves included: counting the compiled beats instead reports `stops` at 2 rather than 8,060 and would reject the safest vocabulary in the game.
- 2026-07-28 — **The conlang's English blocklist is the shipped dataset, not a hand-typed list.** Eleven forms in play were English words, including `kith` for `the` — the single most frequent word in the game — and `non` for `definition`, which is the first lane on every leaf. A language whose commonest word is an English noun reads as broken English, which is the thing masking was rebuilt to stop. 4,096 WordNet labels and their glosses give 9,345 blocked types, no new dependency, and it grows with the ontology. The hand list stays unioned and deleting it is a regression: glosses are written prose and contain no `hi`, `ma` or `lo`, all three of which came straight back when it was dropped. Two codas (`m`, `k`) pay for the smaller space — without them 45% of the corpus spills into two syllables and the shape rule that lets a player tell grammar from content stops holding.
- 2026-07-28 — **The closed class ships bound: the player wakes knowing the grammar, not the words.** Owner, playing the live build: "i must have some english words at the start for it to make sense in any way." The opening read `NEN ROR SEM / kasavemo ka lar nen ror rith nuth fuk` — every word foreign, which is not a language but a wall, and not how the thing this borrows from reads: No Man's Sky keeps the sentence structure and swaps the CONTENT. `literacy.SEED_WORDS` now binds articles, pronouns, the copula and bare auxiliaries, the common prepositions and conjunctions, and the four movement verbs the choice frames are built from. Everything carrying MEANING is still earned — open-class words by frequency, concepts by discovery. Chosen by hand rather than by taking the top N of the frequency table, because frequency would have handed over `checked`, `filed` and `machines`, which are the game telling you what it is doing and precisely what the player is meant to work out. `here`, `there` and `now` are deliberately excluded: they look closed-class and are not — they point at something, and pointing is content. Seeding them rendered the whole ticker line "Extractor #2 is here" in English.
- 2026-07-28 — **There is an ENGLISH NARRATOR, and the foreign language is only ever the GRAPH's.** Owner, playing the deployed build: "i think we won't be able to do it without english narrator or something, it's incredibly confusing right now, i don't understand what's happening at all… i don't understand what ANY of the buttons do, i just randomly clicked around until i got to a stop." This reverses "there must be nothing even in GUI" (same owner, 2026-07-27) on the evidence of play, and the split it introduces is the one No Man's Sky actually uses: the interface and your own log speak your language, the ALIEN THING is alien. So: the narrator, the buttons, the readouts and the notifications are English; concept names and the graph's own words stay foreign and stay earned. What the player is learning is the GRAPH, never the UI.
- 2026-07-28 — **The opening shows TWO options, and never shows an option that cannot be taken.** Owner: "we must have like 2 options… and maybe we shouldn't show unavailable options." Six identically-priced lanes told apart only by an unreadable noun is a coin flip, not a decision, and a disabled button teaches nothing except that the game is refusing you. Mechanics arrive one at a time; a control appears when it first does something.
- 2026-07-28 — **The total-words readout comes off the top of the screen.** Owner: "we should not say total words at the top". `N / 4075` is a completionist counter on a game whose point is that completion is not the point, and it was the first and largest thing on screen.
- 2026-07-29 — **The narrator is a TABLE, in English, and it is `src/content/narrator.ts`.** Nineteen event lines and seven standing lines, keyed by situation, with a `later` form for generation ≥ 1 so the voice curdles on the only clock the player has (`docs/VOICE.md` uses depth; the narrator uses GENERATION, since the deep beats and the narrator are on screen together and one clock each is what stops them agreeing by accident). `src/core/narration.ts` picks the key by diffing two saves and nothing else — never the action, because the reducer is the only thing that decides what an action did, and a narrator reading the action would be a second opinion on that. Not in the language corpus and never through `renderMasked`: that is the point of the reversal. Linted by `test/narration.test.ts` for digits, imperatives, the banned lexicon, exclamation marks and the first person — a lint is not a substitute for the owner reading it, but the mechanical failures are free.
- 2026-07-29 — **`src/core/reveal.ts` is the one predicate the screen asks, and a control appears when TAKING IT WOULD FIRST CHANGE SOMETHING.** Six controls, and every witness only ever rises, which is the same discipline `readouts.ts` applies to the words: a control that vanishes when a stock falls removes an option under the player's thumb. Machine cards at Words 2 (at zero Words the vocabulary cap is zero, so a bought machine produces nothing and the card is a price tag on a no-op; at one, the walk is already the lesson). The toggle after a machine you BOUGHT, not the one you were issued. Check when there is Raw, or Rot, or a loose machine about to make some. Locked lanes at Words 30. Retrain exactly when `canRetrain`. Asserted over a played hour: no two controls ever arrive in the same second, and none ever leaves. Proven red five ways, including a witness that falls — the failure mode no single-state assertion can see.
- 2026-07-29 — **An option with a PRICE is not an unavailable option; an option with a GATE is.** The line the display rule draws, and it is drawn deliberately: a price is a wait (the machines are filing, it is affordable in a minute) while a gate is a wall. Hiding unaffordable lanes would empty the strip two steps into a fresh run, which reads as the game ending, and would delete the goal line that is the genre's oldest feedback.
- 2026-07-29 — **The board opens at TWO lanes and widens by one per six Words, to the six already shipped as the LOD cap.** Measured: `lanes(initialState())` returns EIGHTY-FIVE, which is what the owner played. Words is the index because it is the only quantity that never falls, so the strip can never narrow. Full width at Words 24, by which point the machine card, the toggle and Check have each arrived alone. `lanes()` is unchanged and is still the reducer's gate — `offered()` is a DISPLAY rule, so nothing the screen hides is a lane the engine forgets.
- 2026-07-29 — **A `solid` lane is not offered, because it provably does nothing.** Its far end is a concept you already hold: the walk costs nothing, teaches no word, and does not move you either, since position is the last concept HELD and holding it again changes nothing. That is a button that cannot be told from a broken one, which is the owner's report. Kept as the fallback if a board ever offers nothing else — a no-op beats an empty strip. (The underlying oddity, that revisiting cannot move you, is on the backlog; it is not this item.)
- 2026-07-29 — **Locked lanes come back at Words 30, rather than being deleted.** `starmap.ts`'s pillar — an absent edge teaches nothing, a masked key is the reason to come back — is right about a player who has learned that lanes go somewhere and wrong about one who has not. So the pillar survives inside the reveal ladder instead of being reversed: not on the first screen, and never counted among the takeable options.
- 2026-07-29 — **The prestige preview RUNS the prestige.** `retrained()` is split out of the reducer, ungated, and `retrainExchange` (`src/core/retrain.ts`) calls it and reads both sides through `READOUTS` — so the screen quotes the actual after-state in the actual HUD words, and a preview cannot drift from the action it previews. It also quotes `nextStepCost` before and after, which is THE answer to "whats the point of it?" and was the one number nowhere on the screen: Words carry, so the ceiling stays, while the step price restarts at 6. Proven red with a hand-written after-state that looked entirely plausible.
- 2026-07-29 — **The connection came back, and confirming is CHECK WITH A TARGET.** Owner: *"im missing the not dotted line connections and clicking on them to make them solid lines."* Measured: `render/paint.ts` drew ONE kind of line — every connection dashed, first frame to last, no state in it and no way to put any there, which is why the board read as a picture rather than a place. Tapping a dashed connection now converts exactly the slice of Raw the Check button converts (`checkTake`, one function, no second constant, no bonus for aiming — a second answer to "what is one tap of review worth" is the defect that reset this economy) and signs it, so its line goes solid and stays solid. **The price is not a currency: it is that each connection can be signed once, and connections arrive one per place you walk** — so hand-checking is bounded by travel, which is the only thing that stops a manual lever becoming a job (CLAUDE.md: HITL is never mandatory). Strictly less grindable than the unbounded Check button it supersedes, and a Checker still overtakes a tapping thumb in four seconds, so it can never become required.
- 2026-07-29 — **`Edge.checked` does not come back; `state.confirmed` is not a quantity.** The 2026-07-28 deletion was right about the NAME and not about the mechanic — `docs/ECONOMY_SRR.md` said so itself (*"The model is not the problem. The NAMES are"*). Facts stay a mass in three states; `confirmed` is a set of signatures on the graph, declared STRUCTURAL in `check-vocabulary.mjs`, absent from `readouts.ts`, and nothing anywhere reads its length. Its only appearance on a screen is the difference between a dashed line and a solid one. Signatures survive a Retrain, like `held` and for the same reason. **No save reset:** `deserialize` backfills per key, so a v17 save simply loads with nothing signed, which is true.
- 2026-07-29 — **The screen is the narrator's, and the graph's language is the graph's alone.** Owner: *"i think we wont be able to do it without english narrator… i dont understand what ANY of the buttons do."* `src/ui/App.svelte` no longer calls `renderMasked` on a single interface string: the narrator line, the readouts, the prices, Check, Retrain, the watched/loose toggle, the machine names, the toasts and the manual are English. `seg()` survives for the BEAT — the graph's own prose, still learned one carrier word at a time — and `label()` is the new split: a button keeps its English carrier and masks only the ⟦concept⟧ inside it, so `Follow ⟦x⟧ down` reads as an instruction to a destination you cannot read rather than as five words you cannot read. `src/ui/App.svelte` therefore came OUT of `CHROME_SOURCES` (`scripts/lib/chrome-corpus.mjs`), which was demanding foreign forms for `quantity` and `unread` and failing `check:story`; `readouts.ts`, `machines.ts` and `ticker.ts` stay, because the ticker still masks.
- 2026-07-29 — **A LOAD IS NOT A TRANSITION, and it looked exactly like one.** The store holds `initialState()` until `startGame()` has read IndexedDB, so the narrator's subscription saw a diff between a fresh run and a three-hour-old save: measured on a seeded 32-Word save, the screen opened on *"The first fact came in while you stood there"* and the floaters fired the whole back catalogue in one frame. Everything inside `COLD_MS = 1500` now PRIMES — standing line computed, floater baselines set, no event announced — which is also what `narration.ts` says a cold load should do. Offline progress lands inside that window deliberately: the away toast already names what was banked. Proven red by setting `COLD_MS = 0` and watching all three seeded saves open on a stale event line.
- 2026-07-29 — **The narrator is driven by `game.subscribe`, not by `$effect`.** Effects are batched to a frame, so a tap and a tick landing together — which is what a walk IS — collapse into one observation and the walk's event is never seen. The same seam `observeTransition` uses, for the same reason.
- 2026-07-29 — **The ticker is no longer rendered.** It speaks the graph's language and its job — saying what just happened — is now the narrator's, in English, from the same kind of state diff. `src/shell/ticker.ts` still emits and is still gated by `check:story` invariant 8; it is unwired, not deleted, because deleting a module in another session's half of the tree to make a screen tidier is not this item.
- 2026-07-29 — **Floaters are whole units only, spaced 1.3s per readout, and Y walks a fixed ladder.** A fraction floats as `+0` (stocks display as integers), and a delta that waits keeps accumulating, so a fast run says `+7 Solid` once instead of `+1` seven times. Random X and random Y put three simultaneous floaters — a step paid, a word learned, something rotting, which is one walk — on top of each other and on a node label, screenshotted; X stays random so the board grows no column, Y is a five-slot ladder so a batch is always a readable stack.
- 2026-07-29 — **`inspectBound` is `knownSet.has(id)`, the same set the node labels use.** The inspect card read `conceptForNode().label` unconditionally, so tapping a SEED concept — held from the first frame, never bound — printed its English name, its category and its full WordNet gloss, which is the "when i click on nodes it shows stuff in english" the owner reported. Proven red: with the gate removed the dot reads `katalalae` and the card under it reads `language · noun.communication · a systematic means of communicating…`. An unbound node now shows its graph word and one English line that explains nothing about it.
- 2026-07-29 — **The play probe reads the narrator and the floaters verbatim, and stopped reading `.readout.goal` and `.ticker span`.** Both of those selectors left the screen with this item, and a probe asking for a selector that is gone reports an empty dock forever — indistinguishable from a broken one, which is the failure mode this probe exists to prevent. Transients are sampled every loop rather than every fifteen seconds, because a floater lives 2.4 seconds and the narrator's event line nine.
- 2026-07-29 — **The game is rebuilt around ROUTES: the navigator model** (`docs/ROUTES.md`). Owner, after playing: "i'm not understanding where we are going with this… if we are traveling graph, we should be able to select any node and have choices there… how the dotted lines are discovered? maybe we can do similar stuff to how warhammer rogue trader did the travel between stars system with a navigator?" The diagnosis behind every complaint is one thing: the game was built as a STORY WITH A GRAPH DRAWN BESIDE IT, so position was derived rather than held, choices belonged to a beat rather than to a node (and only 446 of 4,096 concepts had one), and the dotted lines were a render state with no discovery rule at all. Four lines replace it: you are AT a node; routes out are solid (charted, travel now) or dotted (rumoured); SURVEYING turns dotted into solid and is what machines do; TRAVELLING moves you and teaches the word at the far end. The four quantities are renamed after what they let you do rather than where they came from — Solid→**Charted** (routes you can travel), Raw→**Rumours** (leads nobody confirmed), Rot→**Lost** (leads gone cold) — which answers "it's completely unclear why resources are called solid and raw". The join survives unchanged and finally states itself in one sentence: your surveyors can only look for routes between places you can name. Deletes the beat/leaf distinction, the lane strip as primary control, and "+N more ways on". Breaks saves: position becomes a real field and edges gain a charted/rumoured state.
- 2026-07-29 — **The board draws the FRONTIER, not just what you hold.** The salvage review measured zero overlap between the lane buttons and the dots on screen, and the throwaway test found why: `weights` was `weigh($game.held, …)`, so the board rendered your inventory while the buttons named your frontier — disjoint by construction, and unreachable by any amount of moving prose around. Adding the offered destinations to `weights` and one edge per offered lane to `edges` took the overlap from 0/2 to 2/2, with both destinations joined to the lit node by a dotted line (evidence: play.png, `npm run play`). Hiding the beat prose and pointing the button text at the destination word were tested first and did nothing on their own. This is the cheap version of what ROUTES.md wanted; whether the 1,300-line cleanup follows is still the owner's call.
- 2026-07-29 — **A high-level reset audit of the original design against the build** (`docs/RESET.md`), at the owner's word: "we need a complete reset where we review the original ideas and design for the game and see what fits and what does not." Of `VISION.md`'s ten asks, four fit (graphs-and-AI incremental, AI does the work, optional HITL, the board itself), two are half-built (teaches 2026 knowledge management — extraction and validation only, no provenance/entity resolution/reasoning; prestige — Retrain works but REDRIFT was deleted so generation 2 is not structurally worse), and four do not exist (fun in genre terms, a real chance of failure, the stated-goal reveal, and CYOA narrative). One root cause covers three of the four: the vision explicitly ruled out "making the ordering of data carry the story", and the build does exactly that — 50 of 4,096 places have authored prose (1.2%), the rest are nine frame sentences wrapped around the WordNet hypernym tree, which is why the owner's playtest found "two choices which lead to more choices, but no story or meaning behind them". The second cause is that Rot feeds back into nothing: `narration.ts`, `readouts.ts` and `reveal.ts` read it, all three only to display or unlock, so the speed-versus-truth trap has no jaws and the reveal has no mechanism to be true of. Keeps unambiguously: the board, the language, the join, the engine's purity, the proven-red gates. Leaves three questions open for the owner and proposes nothing.
- 2026-07-29 — **The vertical slice ships as `src/slice/`, a fresh pure core rather than a retrofit of the old one.** Six hand-written places, three skills, one repeating timer, a 2d10 skill check, a satchel of loot, and two shut doors (one wanting an item, one wanting a level). Reuses `GraphSim` (d3-force) and the camera from `render/board.ts`; does NOT reuse `render/paint.ts`, which takes the old `GameState` and reads `solid`/`raw`/`rot` off it. The dice are a `uint32` seed in the save advanced by `apply`, so the reducer stays a pure function of state and action — "no RNG" was protecting determinism, not the absence of randomness. Loot from banked time arrives as UNOPENED satchels rolled under the player's thumb, which keeps "no mechanic requires checking in" true at the same time as "the throw is a thing you do". Four defects were found by looking at the screenshot and by a probe that reports blocked taps, none of which any type check or unit test could have caught: a hardcoded camera zoom drew all six dots inside 30px so every tap hit the wrong place (Playwright: "The Tally intercepts pointer events"); the prose card sat above the dots and swallowed travel taps entirely; the card was `width: 280px` under content-box so it measured 308px and `overflow: hidden` sliced the last word off every line; and unvisited places rendered as `—`, which reproduced the exact "buttons name places that are not on screen" failure this redesign exists to fix. Rule 4 evidence: MOD_CAP 6→99 turned two dice tests red, and deleting the only exit from Behind the Door turned the dead-end test red. 307 tests pass, 0 type errors. `src/main.ts` now mounts `Slice.svelte`; `App.svelte` and the old engine stay on disk, unreferenced. Saves: the slice has NO persistence yet, so every reload is a new run.
- 2026-07-29 — **The slice persists: IndexedDB autosave, and export/import as base64 the owner can paste.** Reuses `src/shell/storage.ts` unchanged — it is a blob store that knows nothing about the blob, and localStorage is not an option because iOS evicts it after about seven idle days, which is exactly the gap between sittings. `src/slice/save.ts` is pure, so `encode`/`decode` are testable without a browser. Three things worth recording. (1) **The seed is part of the save and that is the whole point** — a run that comes back without it looks perfect and is a different game, because the next check rolls differently from the one you were about to make; the test asserts identical dice from the restored state, and sabotaging `decode` to return a fixed seed turned five tests red. (2) **A save we cannot honour is refused, not repaired** — saves are breakable, so `decode` validates against the CONTENT rather than the types: a position naming a place that no longer exists, an item since renamed, or a job whose work moved would all type-check and then strand the player somewhere the board cannot draw. A missing skill is the one exception and starts at zero, because that is additive and cannot strand anybody. (3) `lastRoll` is deliberately NOT saved — it is the dice sitting on the table from the action you just took, and restoring it would show a throw the player did not make in this sitting. Autosave is debounced at 700ms and flushed on `visibilitychange`/`pagehide`, because a running timer changes state four times a second and an iOS tab going away gets no further frames — the pending write would never land, which is how every sitting actually ends. Evidence: the probe now plays, reloads and compares; "the run survived", and with the autosave removed it reported "⚠️ THE RUN DID NOT SURVIVE". 322 tests pass.
- 2026-07-31 — **★ THE GRAPH IS THE NORTH STAR, and `docs/BRIEF.md` now says so above everything else.** The assistant removed the graph during a reset — rebuilding the screen as a plain column because the canvas, the force layout and the fitted camera had caused nearly every visual defect of the preceding two days — and framed it as the graph "earning its way back". The owner: "where's my graph… how the fuck you've decided to remove it". They are right and the decision was not the assistant's to make: ask 5 of the brief already read *non-negotiable*, and every conversation about this project since the pivot has said the same thing. What actually happened is that the graph was where the bugs lived, so cutting it fixed the assistant's problem and deleted the owner's game. The rule now written into the brief: **if the graph is hard to draw, change how it is drawn — never what the game is.** Anything may be cut to keep the graph working; the graph may not be cut to keep anything else working. The replacement renderer must avoid what actually failed rather than avoiding graphs: no live force simulation, no camera fitted to a measured window, no absolute positioning — a layout solved once and deterministically, drawn as SVG with a `viewBox`, which scales itself and has no alignment to get wrong.
- 2026-07-31 — **The Here tab is the room, and it carries a node for what you are doing** (`docs/TABS.md` build order 4). Three or four dots instead of thirty-seven: where you stand, every way out, and one `doing` node — the place's own words for resting where the authored content gave it any ("Listen to the water", "Count the gates"), the live countdown while a way is being made. Not a new mechanic and nothing to press: standing still was already resting. What is new is that the game SAYS so, and that `waitFor` — "the one number an idle game owes the player", exported since the rewrite and called by nothing — is finally on screen. Still a filter (R1.3): every place and route Here draws is the same node and edge the Journey draws, asserted from eight standing positions. Two defects found by looking at the screenshot, neither catchable by a type check: **the viewBox is also the font size**, so a four-dot tab was scaled three times harder than the thirty-seven-dot one and "The Cut" came out in 22px straddling its neighbour — fixed by spreading the dots to fill a box of the Journey's size rather than by zooming the box; and **a route began drawing fully solid the instant it started filling** (`class:unmade={fill === 0}` where it wanted `fill < 1`), so the far end read as reached with twelve seconds still to run — shipped in step 3 and invisible to every test at the time. Rule 4: eight sabotages proven red, including the two new browser gates. No save change.
- 2026-07-31 — **★ SKILLS CANNOT COME BACK ON A ONE-VERB LOOP, and Self ships without them** (`docs/TABS.md` build order 5). `docs/BRIEF.md` ask 2 wants RuneScape-shaped progression and it is still wanted; the block is structural, not a schedule. Two reasons, both checkable: `costOf` and `forgeSecs` **both key off `solid.length`**, so a skill trained by making ways rises in exact lockstep with the thing it is meant to offset and cancels itself out; and a skill is a **choice about where to spend time**, of which there is exactly one — five skills over one activity is five names for the same number, which is what the retired build had. **Whoever adds a second activity adds the first skill in the same item**, or they will not interlock. So Self holds what is true today, each as a node hanging off you rather than a stat block, because the graph is the UI: paces in hand, ways made of all 43 in the valley, places found of 37, and how far out you have reached — **graph distance from the start**, not places seen and not routes made. That last one is why the test file matters: ranking `seen` by place ID passed every assertion until a case was added where the deeper place has the smaller id (place 5 is three ways out, place 100 is two), which is Rule 4 catching a vacuous check in the act. One defect found by looking at the screenshot: **the selection ring was invisible on every fact and on the doing node** — the per-kind rules are `g[data-kind='…'] .dot`, which outranks a three-class `.on .dot` however late it appears, so nothing on screen said which dot the panel was describing. CSS specificity is untestable in Vitest, so the probe now compares the computed stroke of the selected dot against an unselected one **of the same kind** — the first version of that check took any unselected dot, got the `you` node which has no stroke at all, and reported a difference while the ring was invisible; it stayed green under the very sabotage it was written for, which is the third vacuous guard Rule 4 has caught in this repo. Rule 4: six sabotages proven red, one guard rewritten after failing to go red. No save change.
- 2026-07-31 — **Thoughts holds NOTIONS, not places, and the build order is complete** (`docs/TABS.md` step 6, `src/game/notions.ts`). The tab used to redraw the places you had been and call them concepts — a placeholder standing in for content that did not exist, and places already have two tabs. Seven notions replace it, and the discipline is that **every one names a rule the engine actually enforces**: "Free ground" is `costOf` returning 0 for a made route, "The frontier" is `COST_GROWTH`, "Standing still" is the absence of a work verb. Three tests assert the sentence against the code, because a glossary describing a system the build does not have is a lie the player eventually catches and this project shipped exactly that once. **Knowing is a pure predicate over the run, never a flag in the save** — it cannot drift out of step with what it describes and there is nothing to migrate. Drawn in full from the first frame with no name on what you have not thought yet, which is the promise the Journey already makes about places. **★ This is where `docs/BRIEF.md` ask 8 becomes mechanically true before it is stated**: the reveal is that you are a model travelling a graph to learn, and this is knowledge as a graph filling in as you traverse one — nothing says so, and nothing should yet. One defect found by looking at the screenshot: `known` was `!isPlace || seen.includes(num)`, so **every notion drew at full brightness and full size whether thought or not** — the dim dot is the entire way that tab shows progress and it showed none. Rule 4: seven sabotages proven red, and one badly-chosen sabotage that stayed green because the notion web is symmetric (removing one side of a join does not disconnect anything) — re-run cutting both sides, which is the test being right rather than vacuous. 534 tests, 0 type errors, no save change.
- 2026-08-01 — **The header stops carrying prose; arriving selects where you arrived** (`docs/NEXT.md` item 2 from the owner's play-test). They asked three times in one session: *"the text at the top of the screen is not good… there is a text at the top again when I clicked again on the same button, and I'm not sure how to get rid of that text… the text at the top is a problem for sure."* The cause was `said` on the game state, which on arrival held **the whole place body** — measured at **210px and 61 words above the purse, pushing the board down to y=302 on a 390px phone**, with nothing to dismiss it and no way to ask for it back. It was also redundant: the panel already shows exactly that text when the place is selected. So `said` is **gone from the state entirely** (not just hidden — dead state that no longer exists cannot come back), the header is paces + rate + Start over at 50px and 7 words, and `go()` selects the place you arrive at so the prose lands in the panel the player is already reading. The offline-gain line moved into the panel too, where it is in flow and any tap replaces it. Save shape changed by removal — old saves carry an ignored extra field, nothing breaks, no migration. Rule 4: two sabotages red — arriving selecting nothing ("the prose went nowhere"), and the body put back in the header (210px, 61 words, board at y=302, which is exactly what the owner was looking at). 534 tests, 0 type errors, `npm run play` exit 0.
- 2026-08-01 — **"The Here tab didn't update" was a LAYOUT bug, and so was the second one** (`docs/NEXT.md` item 3, both reports). Reproduced in the browser first: Here *did* update — labels, doing node and engine state were all correct. What had not changed was **the picture**. `settle` seeded its initial ring from index and count alone, and the per-view seed only fed `randomSource`, which was unreachable — so **every view with the same node count and the same star topology landed on identical coordinates to the decimal**. The Cut and The Tally have two ways each: `The Cut vs The Tally: IDENTICAL PICTURE`, which is precisely the walk the owner described. The second report follows from the first — if the board looks unchanged you tap where the old centre was, which is now a neighbour, and *"somewhere you have not been"* is the honest answer to the wrong dot. **Two fixes, and each was proven load-bearing separately**: places now start at their real `SPOT` in the valley, so two rooms differ because the valley differs (truthful and free); and the ring is jittered from the view's seed, which is what saves **Self** — it holds only one place, so the hint path cannot help it, and Self at The Cut was otherwise identical to Self at The Tally. Removing only the hints still passed; removing only the jitter turned the Self test red; removing both turned the Here tests red. The seed is therefore load-bearing now and the earlier "this is insurance, not load-bearing" note is corrected in place. Guard names the pair from the report so a regression fails in the owner's words. Rule 4: six sabotages red. 540 tests, 0 type errors, `npm run play` exit 0. No save change.
- 2026-08-01 — **Self is a character sheet, not a scoreboard** (`docs/NEXT.md` item 4). The owner's correction was one line — *"self is a stat sheet and inventory, but not game statistics"* — and it reverses nothing about the tab's purpose, only its contents: it IS a stat sheet, the first version simply put the WORLD'S numbers on it. Gone: ways made of 43, places found of 37, distance from the start. Kept and reframed as properties of the character: **what you carry** (paces — `kind: 'item'`, `rel: 'carries'`, both of which were already in the R1.2 vocabulary and had never been used by anything) and **what you are** (a pace every 3s; a way takes Ns and M paces, both climbing with every way already laid). `ROUTES_IN_ALL` and `DEPTH` were deleted from `world.ts` rather than left unused, so nothing tempts a later session to put them back. **Every assertion in the old `test/self.test.ts` passed** — the numbers were true, they were on the wrong sheet, and no test suite can catch that; it is the plainest evidence yet for rule 3's "build it, then LOOK at it". **The inventory holds exactly one thing because exactly one thing exists**: `src/slice/content.ts` carries nine hand-authored keys (strip of lead, quiet key, iron gate pin…) each with a door it opens, and `BRIEF.md` ask 10 wants them, but nothing in this engine drops one — drawing empty slots would promise a system that does not exist, which is the eleven-systems mistake in miniature. Drops are now a named open item needing the owner's call. Rule 4: five sabotages red, including putting "0 of 43 ways" back on the sheet, which four tests caught. 543 tests, 0 type errors, no save change.
- 2026-08-01 — **The owner's name never enters this repo; their quotes always do** (their question: *"is there a way like to work in 2 repos, one private and one public to not have my own playtest notes on the repo"*). **Two repos were considered and rejected**, and the reasoning matters more than the answer: a split by *"is this personal?"* needs a judgement call on every file forever and will eventually be got wrong, while a split by *"is this build output?"* needs none. But the exposure was a first name and mild opinions about a hobby game, against the cost of a deploy token, extra steps per session on a phone, and a new way for two trees to drift — so the cost did not fit the risk. **If genuinely private notes ever appear, the migration is private-source + public-`dist`-only, and it is not hard.** What handles the future instead is the convention the repo already had: 39 code comments say "the owner" and none said a name; it slipped only in `.claude/agents/the-owner.md`, which an agent wrote. Name removed from the two files that carried it, every quote kept. ★ **And the convention is now mechanical rather than remembered**: `.claude/hooks/guardrails.sh` blocks a commit that ADDS a listed name, reading the list from `.claude/private-names` — **untracked on purpose, because a hook that hard-coded the name would put the name back in the public repo and the guard would be the leak.** Rule 4, five cases proven: adding the name blocks, saying "the owner" passes, the change that REMOVES a name passes, a missing list is harmless, and secrets still block. That third case was a real defect caught within a minute — the first version scanned the whole staged diff, so a deletion line still contained the text it deleted and the guard refused the very change written to satisfy it. It scans added lines only.
- 2026-08-01 — **The economy must read the adjacency, not a count** (`docs/DIRECTIONS.md`, owner's call). Shuffle the 37 places' connections, keep the counts identical, and no number in `engine.ts` changes — so income becomes max-flow from settled places to where you stand, shipped together with settling, working and one skill as `docs/NEXT.md` item 0.
- 2026-08-01 — **Income is max-flow from your settled places to where you stand** (`docs/NEXT.md` item 0). Two reviews found independently that shuffling the valley's adjacency changed no number in `engine.ts`, so the graph was a skin over a purchase ladder; `flow.ts` makes a road a pipe with a limit, which is why a loop-closer now buys more than a settlement. Working pays XP and no paces, which is the opportunity cost that finally lets a skill exist. Saves reset.
- 2026-08-01 — **The authored doors decide the level curve** (`docs/PLAN.md` step 2). Four of the thirteen `needs` gates demand wayfaring — 3, 5, 8 and 24 — so `LEVEL_CAP` clears 24 and `XP_STEP` is set so the ladder is about seventy minutes of working rather than four hours; a door whose level cannot be reached is worse than no door. The other nine want a skill that does not exist or an item nothing drops, and stay off rather than shut. A barred way gets its own ink so it is a door you can see rather than a sentence you find by tapping.
- 2026-08-01 — **A lock is derived from its key, never listed** (`docs/PLAN.md` step 3, `src/game/places.ts`). A way is locked only if some live crossing can actually drop the item it wants, so turning on a second skill turns on its keys and its doors together and no edit can strand a lock — the unobtainable-key defect `scripts/check-story.mjs` was written for, made structural instead of checked afterwards. Which of the two authored items a crossing pays is decided by the level you cross at, with no RNG, and it is judged EVERY crossing so a key missed by being under-levelled can always be gone back for.
- 2026-08-01 — **An encounter HOLDS a place** (`docs/PLAN.md` step 4, the owner's call). You may walk in; you may not settle it or work its job until the thing standing there is out — settling is already what the player wants most, so the stake needs no tutorial. Three of them, one at the mouth of each region beyond the valley. No RNG: you strike first, both strike every 2s, and `winnable()` is checked against the fight it predicts at five levels, so a telegraphed fight is a decision rather than a gamble. Losing relights you one node back and takes nothing else — asserted field by field, because that is the constraint most likely to get fudged.
- 2026-08-01 — **The resource is STONE, and the words are a build gate** (owner: *"pace is absolutely stupid resource, why are we still using it? i asked to remove it multiple times"*). They had asked three times across two play-tests and it was still there, because nothing but memory was stopping it — so `scripts/check-words.mjs` now fails the build on dot, dots, pace or paces in any player-facing string, and on "way" used as the noun for the thing between two places. "pace" was also a rate word, so the header read `12 paces +0.33 a second`. Node and edge everywhere else, which are the owner's own words.
- 2026-08-02 — **The AI twist is cut** (owner: *"screw AI idea, we can do cool graphs without AI premise"*). `docs/BRIEF.md` asks 8 and 9 are void and marked in place, not deleted, because they explain why `notions.ts` and the Thoughts tab exist. The graph is MORE load-bearing without it: it is now the chief engineer's plan, an object in the fiction. Prestige becomes the survey — a new plan over the same ground, roads reset, terrain knowledge persists.
- 2026-08-02 — **Combat becomes obstacles, and the economy is haulage-first** (owner's calls on `docs/FRONTIER.md`). Something holds the line — a washout, a rockfall, a landowner who says no — and clearing it costs time and loads; the shipped duel is retired because a road crew stabbing things is the old game leaking in. Economy: haulage first (distance subtracts, every supply source has a reach radius), throughput layered after (a road has a capacity), because they compose and nothing is thrown away.
- 2026-08-02 — **The game is King's Roads, and the loop is scrapped** (`docs/KINGS_ROADS.md`, the owner's design transcribed). A chapter is a crossing: start, finish, five or six dotted routes, build one end to end, done is done — a route-choice game rather than a network optimiser. Mana flows out along built road, which is why you cannot build from the middle and why the opening walks you back to where the king's road ends. Its curve is inverted on purpose: scarce until a region is finished, abundant and useless after, so the resource says when to leave. Vocabulary is **stops and roads** — the third turnover in a day, so the gate bans dot, node and edge together. Reviewed item by item, 19 of 20 generated ideas were scrapped, including the 37 machine-written places.
- 2026-08-02 — **`world.ts` exports a runtime `KINDS` and derives the `Kind` type from it.** `test/ink.test.ts` held the kind list by hand, deliberately, so that adding one without styling it would fail there; when the vocabulary turned over it did the opposite, checking that four scrapped kinds had ink while two new ones had none. A hand-held copy cannot catch a rename.
- 2026-08-02 — **The chapter is authored, not solved.** `layout.ts` handed the chapter to d3-force like any other tab, discarding the coordinates `stops.ts` had just written. Two consequences: the Finish drew in the middle so the crossing did not read as a crossing, and — the serious one — `terrain.ts` bakes ground from authored x/y while stops drew at force coordinates, so a stop painted on wood was priced as water. 509 tests missed it because every one asked the solver where things were. The other tabs are still solved; they have no geography of their own.
- 2026-08-02 — **The board takes the screen and one panel is docked over its bottom** (owner: *"the canvas on mobile can take more space vertically while the text could be at the very bottom overlaying it in case needed but like always snipped to bottom of the screen"*). This relaxes the months-old "nothing overlays anything" rule, which existed because a sheet once opened over a sheet with nothing to dismiss. The part worth keeping is narrower and still enforced by the probe: exactly ONE overlay, always in the same place, never in front of anything but the map, nothing to close.
- 2026-08-02 — **The chapter is authored portrait (620x980), not landscape.** A landscape map on a 390px phone is fitted by its width, so growing the board from 655px to 715px produced a pixel-identical map and 60px more margin. The crossing now runs top to bottom and the routes bow sideways. `test/layout.test.ts` asserts the chapter is never wider than it is tall, because nothing measured that and the first attempt shipped a taller board with the same-sized map.
- 2026-08-02 — **`relief.ts`: a height field, marching-squares contours, and an outline around each region** (owner: *"could you implement terrain height isolines… some lines like an oval with a forest inside or maybe some steppe or bog"*). Height is derived from the same grounds `GOING` prices, so the contours are a picture of the cost. Marching squares is written out rather than pulled from d3-contour, because it can then be checked against a cone whose contours are circles of a known radius. A region ring uses a support function, not a mean radius, so every stop in it is provably inside it.
- 2026-08-02 — **A new ink must clear every ink the board DRAWS, not just the ones the probe counts.** The first contour colour cleared all nine counted inks by 36 and sat 9 from `moor`, which is scattered across the whole map — so the probe's "count the contour pixels" check was counting moor marks and stayed green with the contours deleted outright. The rule in `ink.ts` was too narrow and is now written wider.
- 2026-08-02 — **The dark theme is replaced by a hiking-map look** (owner: *"maybe we should move from dark theme design to full blown hiking all trails maps.me look… can you try it"*). Warm paper, brown contours, green woodland, blue water, a red you-are-here pin. The dark palette was never a design decision — it was what the first prototype happened to have; what it genuinely bought was free contrast, which on paper has to be earned. `color-scheme`, the `theme-color` meta and the PWA manifest colours all move with it, or iOS draws a black overscroll gutter under a paper page.
- 2026-08-02 — **`TOL` now lists every ink the probe counts, and a test reads the probe to enforce it.** The contour-ink defect was a DECLARATION gap, not a distance one: the existing "every uncounted ink stays clear of every counted one" rule was correct and could not fire, because neither `relief` nor `moor` was in `TOL` and the pair was therefore never compared — while the probe counted both at its default net of 12.
- 2026-08-02 — **A road is a pipe: gauge, bore, and income as max flow** (owner: *"maybe we are not laying roads, but laying like a mana ways like pipes… this way it's less boring and gives us more options"*, choosing full capacity/pressure over my recommendation to keep roads and add verbs elsewhere). `BORE` runs OPPOSITE to `GOING` — moor is cheap and narrow, stone is dear and wide — or the cheapest route would also be the best one and the choice would be theatre. The word stays "road": the owner picked the mechanics option, not the rename one.
- 2026-08-02 — **The pipe economy is only allowed to exist while the board draws it.** A max-flow economy was built and scrapped on 2026-08-01; what was wrong with it was never the mathematics but that no player could guess it from the board. Gauge is drawn as road width and load as an underlay, and both are checked in the browser probe, not only in a unit test.
- 2026-08-02 — **The thing you lay is a PIPE; roads and paths stay in the fiction** (owner: *"well like we also do roads or paths when needed, but we lay pipes"*). The word gate bans "road" for the laid thing but deliberately passes "the king's road" — the game is called King's Roads and the king's road is a real object in the world. What makes a road *needed* is undefined and is the owner's to answer; two readings are in `docs/NEXT.md` and they are different games.
- 2026-08-03 — **The fill grows from the end you laid it from; a finished lay carries you over; you are a map pin.** `building` gained `from` (SAVE_VERSION 6, saves reset) — the twice-reported wrong-side fill existed because the board had no way to know which end was yours and guessed the lower id. Arrival happens only on a fresh lay and only if you still stand where you started it.
- 2026-08-03 — **Cartography pass, conventions from openstreetmap-carto (CC0): casing under built pipes, labels placed by priority with losers dropped.** The dot always stays; only the NAME is dropped, and selection always wins.
- 2026-08-03 — **Roads bend, and the bend is the terrain's** (owner: *"let them curve and bend around terrain"*). `paths.ts` bows each road toward the LOWER of its two candidate sides, read from the same height field the contours draw. The fill follows the bend cut by LENGTH — a straight fill would leave its own bed. Chapter only: other tabs solve their own layouts, so a path baked in world coordinates would join two points that are not there.
- 2026-08-03 — **Bog is a ground; the sea and its beach are coast decor.** Bog is dear AND narrow (GOING 2.1, BORE 0.70) — the ground that is simply bad — with marsh marks, a low height, and its own region ring. The coast runs down the west edge, based on the CAMERA's box, not the terrain's: the first cut painted the entire sea off-screen and the probe read 0px. Decor the player cannot see is decor that does not exist. Sea and beach are honestly decorative — nothing prices them yet.
- 2026-08-03 — **The sea is a mask, and the geography steers the lines** (owner: *"sea should cut any lines going through it"*, *"nothing follows geography, we made hills so that rivers and roads can take them into account"*). The sea is drawn opaque and LAST in its layer, so contours and rings end at the beach. Roads relax point-by-point downhill-across-their-direction against the same height field the contours draw (mean saving 0.88 height over ruler lines); the river subdivides between its anchor stops and slides into the lows (3.0 lower on average). The shoreline is based on the westmost STOP, not the camera — the first shoreline put Stop 4 in the sea, caught by a test before any screenshot.
- 2026-08-03 — **The board re-frames when the dock's height changes.** On load the fit ran before the panel reported its height, and nothing re-triggered it — with an away line making the dock tall, the Finish drowned behind it on the owner's phone. The fit effect now watches the inset. Not reproducible red at the probe's 390x844 (width-bound fit leaves ~180px of slack); the probe's tall-dock check says so in place and stands as the tripwire.
- 2026-08-03 — **Roads pick the cheapest line by coordinate descent on heights, not by gradient** (owner: *"some roads go over the hill when they should go around, or end up in the sea"*). A gradient feels nothing on a crest, so hills square on the chord were climbed; descent compares actual heights either side, so a crest loses to the ground beside it. The crag crossing 22|23 now detours at 1.42x its chord and avoids 20.4 of the 52.8 the ruler line crests. Water costs steeply with depth AND is hard-clamped — both currently unexercised under descent (the flat sea attracts nothing) and kept as the rule, with the test's fire proven by making water attract.
- 2026-08-03 — **The dice are Ironsworn's, adopted under CC BY 4.0** (owner: *"is there some open license 2D10 system we can take to not invent too much"*, choosing roll + stats + momentum). Action roll d6+stat vs two d10, ties lose, score caps at 10; strong/weak/miss; matched dice are a twist; five stats (names kept — they fit the fiction as written); momentum with burn-and-reset. Attribution in README.md and dice.ts. The economy is ours, not Ironsworn's.
- 2026-08-03 — **Hidden stops block a fresh lay until faced** (the owner's design, verbatim: *"not visible but block progress until resolved"*). Deterministic per road key; dear ground carries two, easy one; widening carries none. Consequences are uniform (strong lifts momentum, weak costs mana, miss knocks the work back) so the owner can rewrite every word of events.ts without touching a number. All prose in events.ts is ⟨draft⟩ for the owner's passes.
- 2026-08-03 — **The word gate skips HTML comments in its string scanner.** An apostrophe in "the owner's design" inside a markup comment flipped quote parity and three phantom strings were reported from developer comments. README.md rewritten for King's Roads — it still described Semantic Drift.
- 2026-08-03 — **The pipeline is visible** (owner: *"can we have a mana pipeline visuals, especially when we start to have to connect to our initial dot from offscreen and do some +1 +1 there"*). The king's road enters from off the top of the map and ends on the Start — the trickle has a source now. Flow dashes CRAWL along carrying pipes, direction from hop depth; the only thing that animates is lineDashOffset, so nothing a thumb aims at ever moves and the rAF only runs while something flows. A +1 floats off the pin when a whole mana lands, capped at four, pointer-events none. The probe checks motion by sampling the same strip twice — a static highlight is what this replaced.
- 2026-08-03 — **The topography is a sampled grid, and the grid is the model** (owner: *"have the topography in the model somewhere so that our routes are planned and we know the steepness… no need to know height of each pixel, just some samples"*). 22×30 samples: anchored to each stop's ground height (an anchor sweep corrects coastal cells the sea clamp bled into — Stop 4 read 24 low before it), seeded ridge noise between stops, sea shelving below zero. Contours, bends, scenery and climb all read it. Every lay deed quotes `climbs N`, and climb slows the build. High ground costs the route-builder double above the moor line, because the complaint was about PEAKS and a linear cost buys one 70-crossing to save two 35s.
- 2026-08-03 — **Each stat is its own node on Self** (owner, verbatim, with a screenshot). Also: the around-the-hill test is now bounded by the best endpoint-pinned BOW within the road's stray — its two earlier bounds (a magic 5, then a parallel corridor that floats its endpoints) were each proven wrong by real failures.
- 2026-08-03 — **The expedition loop: prepare, provisions, failure** (owner: *"making a leg Must be a challenge… you need to prepare first… based on how you are prepared, plus based on your stats, you either succeed or fail. When you fail, you go back… lose resources… we need some other resource other than mana"*). PREPARE opens before any fresh lay: cart/mule/packs, ±1 to every roll on the leg by ground (suits declared in `KIT_SUITS`). Provisions 0–10 (Ironsworn Supply), start 6: a weak hit eats one, a miss eats one and knocks the work back 25%, a miss at 0 fails the leg outright — crew home, mana sunk, momentum −2. Steeper/dearer legs meet 1–3 hidden stops. Finishing fresh ground restocks +1. Widening meets no hidden stops so it skips PREPARE — a kit choice with no roll riding on it would be a question with no answer. Saves reset (v8).
- 2026-08-03 — **Tap-mana: the spring answers the thumb** (owner: *"for mana, we should make it a tapable resource so that you have to tap, tap, tap in order to get it, and this is your idle element"*). Trickle shrunk 0.34→0.12 a second; a `tap` action pays 0.4 through the same remainder as the tick, so a burst pays exactly what it promises. The purse number IS the button ("tap to draw"). Flat yield on purpose: fingers are the rate limit, and a yield that grew with the network would make tapping the endgame instead of the start. No save change. Fog of war queued to BACKLOG (owner asked; chips said tap-mana first).
- 2026-08-04 — **Scavenge: time for provisions** (owner: *"so, like, scavenge for provisions"*; step 4 of the expedition plan). Ironsworn's Resupply worn local: 18s at your stop with the crew idle, stat chosen going in (wits = open ground, shadow = other people's stores), dice at the end. Strong +2 (+3 twist), weak +1 and momentum −1, miss nothing and momentum −2 (−3 twist), cap 10. Exclusive with laying both ways round, and walking off abandons it. No save reset — old v8 saves load with nobody out scavenging. The probe caught its own tier-regex bug on the first green run (compared 'weak' to 'weak hit'); the game had paid correctly.
- 2026-08-04 — **Fog of war** (owner: *"can we do fog of war maybe"* — chips: build now, parchment style). ⚠️ REVERSES the recorded rule "the whole crossing is visible from the first frame". What that rule protected survives: the SKELETON (every dot, every dotted route) draws from frame one, so the five ways across stay a visible choice. The fog takes names and land: `ken()` = stood-at stops plus one route out; names exist only in ken; terrain sits under opaque uncharted-parchment (`fog` ink) with soft holes around SEEN stops and along pipes and the feed; far dots draw faint. The fog lifts for good when every stop is stood at — a finished chapter earns its finished chart. Probe now counts the map-wide terrain on an all-seen save and the fog on a fresh one.
- 2026-08-04 — **Bigger tap button, tighter words** (owner play-test: *"tap button is too small, the meta text is too wordy"*). Spring button 48px tall with a 28px number, hint text gone (the press is the hint). Every dock note trimmed ("+1 every roll — suits the ground"; the closed-game sentence said once, on laying). Found and fixed a stale lie while in there: the weak-hit Carry-on note still said "it costs some mana" from before provisions existed.
- 2026-08-04 — **Terrain-only bends, smooth footpath dashes** (owner play-test: *"the dotted line dots are too weird and don't follow topology i don't think"*). The 5.5%-of-length "personality" bow — a bend with no terrain behind it — is deleted; flat ground now runs straight and every curve is the height grid talking (32 of 35 routes still bend, median 1.32× chord). Routes draw as Catmull-Rom curves instead of 11-point polylines, dash [7,5] at 1.2px — a surveyed footpath, not dot confetti. The per-route "never dead straight" test became an aggregate (>60% bend, median >1.05) — proven red with the relaxer disabled.
- 2026-08-04 — **Play-test bug pass** (owner: four defects in one sitting). Start over now ARMS ("Wipe it? Tap again", 3s disarm) — a stray tap was one press from a wiped run. The camera belongs to the player: once panned or pinched, only a tab change reclaims it — the panel's rest-height and the iOS URL bar were silently re-framing the map. The flow crawl was painted UNDER the road core and buried on every real pipe (only the feed drew it on top — and the probe only ever sampled the feed); reordered, and the probe now samples a pipe. +1 floaters rate-limited to one a second and cleared when the camera moves. The spring says "+0.4 a tap". Probe save-injections now verify-and-retry — the pagehide flush genuinely won the race on one run.
- 2026-08-04 — **The Way, step 1: the leg is a place** (owner: *"instead of just waiting and being interrupted, it is the separate tab kinda where it happens… you're building, like, little graph through the terrain"*; chips: Here becomes The Way). While a crew is out, Here shows the LEG: the real bent path zoomed into its own terrain, 4 waypoints, halts drawn as "Something ahead" markers you can see coming, the crew mark at the head of the works, road solidifying behind them segment by segment. Folds back to the stop view on arrival. Fractal on purpose — the chapter is a graph of stops, a leg is a graph of waypoints, same board and inks. Steps ahead: tap-to-work on this view, foes as a waypoint type, then risk tradeoffs.
