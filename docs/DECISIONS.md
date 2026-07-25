# Decision log

Append-only. Newest at the top. One entry per non-trivial decision so a future
session knows *why* things are the way they are. Format:

`YYYY-MM-DD — <decision> — <one-line why> (alternatives rejected, if notable)`

---

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
