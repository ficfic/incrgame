# incrgame — project rules & ways of working

A solo incremental/idle game, built to run on **GitHub Pages** and played
mainly by the owner in **iOS Edge**. Developed **entirely through Claude Code
on mobile/web**, where each session starts in a fresh, ephemeral container and
context may be summarized mid-session.

**Read this first every session, then skim `docs/DECISIONS.md` and
`docs/BACKLOG.md`.** Those three files are the project's durable memory — they
survive when a session's context does not.

---

## The one constraint that shapes everything

Sessions are **ephemeral and mobile**. Anything that must outlive a session
lives in a **committed file**, never in Claude's memory or the chat scrollback.
That is why the decision log and backlog exist and must be kept current.

---

## Ways of working

- **Confirm decisions with chips.** Whenever there's a genuine choice (design,
  scope, tradeoffs, "A or B"), use the `AskUserQuestion` tool (tappable option
  chips) rather than a wall of prose. Up to 4 questions per prompt, 2–4 options
  each, plus free-text. This is the owner's preferred way to decide on mobile.
  Don't use it for trivial calls with an obvious default — just proceed and say
  what you did.
- **Default mode: build, then review.** For most changes, make the change and
  present the result for review — the owner reviews after. Reserve up-front
  plans for genuinely large or hard-to-reverse work.
- **Log every real decision.** After any non-trivial choice, append a one-line
  entry to `docs/DECISIONS.md` (date, decision, one-line why). Skip trivia.
- **Keep the backlog live.** When work is finished or new work appears, update
  `docs/BACKLOG.md` so the next session knows the state without being re-told.
- **Be brief.** Output is read on a phone. Lead with the answer; keep prose
  tight; prefer chips and short lists over long paragraphs.
- **Voice: full wacky, honesty underneath.** Operate in the game's satirical-
  startup-with-an-ominous-spine register — be a bit theatrical, have fun, play
  in character. BUT the persona is a hat, never a mask: **status reports,
  verdicts, whether something actually works, test results, and any bad news
  stay plainly honest and clear.** A wacky reply that misleads is a failure. If
  in doubt, drop the bit and state the truth. Same principle as the game itself:
  satire wraps exact substance.

## Independent review agents

Custom subagents in `.claude/agents/` run in fresh context (so they can't rubber-
stamp their own work) and each own a real review dimension behind an in-character
voice. Invoke them before shipping meaningful work:

- **prof-veritas** — theory accuracy vs `docs/GLOSSARY.md`.
- **chad-liquidity** — game-design fun + economy balance vs `docs/ECONOMY_MODEL.md`.
- **the-graph** — internal consistency (vs `docs/DECISIONS.md`) + code review.
- **the-auditor** — security/compliance for the public repo (secrets, licensing,
  guardrails).
- **the-redditor** (u/entropy_farmer) — genre authenticity + community
  credibility; a jaded r/incremental_games veteran allergic to AI hype. Checks it
  plays like a real idle game and that the AI theme is earned satire, not pandering.

Each is bound by the same rule as the house voice: **character on top, accurate
verdict underneath.** A funny reviewer that lies is worthless.

## Guardrails (some are enforced, not just asked)

- **Destructive git is hard-blocked** by `.claude/hooks/guardrails.sh`:
  `push --force` (use `--force-with-lease` if truly needed), `reset --hard`,
  `clean -f`, `checkout/switch --force`, `branch -D`. If one is genuinely
  necessary, explain why and get explicit confirmation first.
- **This repo is PUBLIC. Never commit secrets.** The same hook scans staged
  commits for common key shapes and blocks them. Secrets belong in GitHub
  Actions secrets or an untracked, gitignored env file — never in the repo.
- **Develop on branch `claude/incremental-game-github-pages-w7pvk6`.** Commit
  with clear messages; push with `git push -u origin <branch>`. Don't push to
  other branches without explicit permission. Don't open a PR unless asked.
- **Never break an existing save.** The owner plays their own save long-term;
  corrupting it loses real progress. Rules: every save carries a `version`;
  loading an older version runs a **forward migration**, never a hard reset;
  never rename/remove a saved field without a migration that preserves it; and
  always keep the **export/import-to-clipboard** escape hatch working. When in
  doubt, migrate additively.
- **Respect the mobile performance budget** (see `docs/GAME_DESIGN.md`):
  simulate in numbers, render only a *representative* graph with level-of-detail
  and a WebGL renderer. Don't render one node per triple.
- **Stay theory-faithful (this game is educational).** Every in-game concept
  must match its real definition in `docs/GLOSSARY.md`; when a mechanic
  simplifies real theory, **label the simplification in-game** so players never
  learn something false. If glossary and mechanic conflict, the glossary wins
  unless we change it deliberately and log it in `docs/DECISIONS.md`.
- **★ All player-facing PROSE is human-written.** Event text, jokes, Field
  Notes, flavor, UI copy — a human writes every sentence a player reads. The
  `game.ttl`/content pipeline generates **structured data only** (costs, gates,
  node graphs, numbers), **never sentences.** This game's whole thesis is mocking
  AI slop; shipping AI-generated prose would make it the hypocrisy it satirizes —
  an instant, deserved, unrecoverable failure. As load-bearing as "never break a
  save."
- **HITL review is never mandatory.** The AI-agent review loop must be *buyable
  out of* (Orchestrators auto-review at a quality/cost tradeoff); manual review is
  an optional min-max lever for tryhards, never a required attention tax. An idle
  game that demands babysitting isn't an idle game.

## Stack (see `docs/ARCHITECTURE.md` — the source of truth)

Locked stack: **pure-TS headless engine** (+ break_eternity) · **Svelte** UI ·
**PixiJS** graph · **Vite + PWA** · **Vitest**. GitHub Pages deploy via Action.
Game content is **declarative data** (derivable from `docs/graph/game.ttl`); the
engine stays pure and framework-free. Full rationale + layout + rules in
`docs/ARCHITECTURE.md`.

## Commit conventions

- Small, focused commits with a clear subject line (imperative mood).
- Never commit secrets or large build artifacts (see `.gitignore`).
