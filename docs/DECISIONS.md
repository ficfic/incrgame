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
