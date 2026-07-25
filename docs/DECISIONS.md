# Decision log

Append-only. Newest at the top. One entry per non-trivial decision so a future
session knows *why* things are the way they are. Format:

`YYYY-MM-DD — <decision> — <one-line why> (alternatives rejected, if notable)`

---

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
