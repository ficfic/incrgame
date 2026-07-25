# Decision log

Append-only. Newest at the top. One entry per non-trivial decision so a future
session knows *why* things are the way they are. Format:

`YYYY-MM-DD — <decision> — <one-line why> (alternatives rejected, if notable)`

---

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
