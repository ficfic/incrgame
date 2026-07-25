# incrgame

A solo incremental/idle game, built to run on **GitHub Pages** and played mainly
in mobile browsers. Developed entirely through Claude Code on mobile.

> Status: **foundation only.** Ways-of-working and guardrails are in place; the
> game itself isn't built yet.

## Repo layout

- `CLAUDE.md` — project rules and ways of working (read first).
- `docs/DECISIONS.md` — append-only decision log (the project's memory).
- `docs/BACKLOG.md` — running "what's next" list.
- `.claude/hooks/guardrails.sh` — enforced guardrails: blocks destructive git
  and blocks committing secrets (this repo is public).
- `.claude/settings.json` — wires the guardrail hook.

## Planned stack

Vanilla TypeScript + Vite · [break_eternity.js](https://github.com/Patashu/break_eternity.js)
for big numbers · localStorage saves · GitHub Pages deploy.
