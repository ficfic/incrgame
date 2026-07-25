# Backlog

The running "what's next" list. Keep it current so any session can pick up
without being re-briefed. Move finished items to **Done** with a date.

## Now / next

- [ ] Decide the game flavor (classic clicker / number-go-up / themed / scaffold
      first). Owner is thinking about it — leaning toward nailing ways-of-working
      before committing.
- [ ] Optional: a `decide` skill wrapping the chip-based decision flow +
      auto-log to DECISIONS.md. Deferred — not built yet.
- [ ] Optional: a build/verify (SessionStart) hook once there's a game to build.
      Deferred until the game exists.

## Someday / maybe

- [ ] `release`/deploy skill (build → verify → push → Pages) — write it once the
      deploy flow has been done manually twice.
- [ ] `add-game-content` skill — write it once adding content is a repeated
      motion.

## Done

- [x] 2026-07-25 — Foundation: lean CLAUDE.md, durable memory files
      (DECISIONS.md, BACKLOG.md), and enforced guardrails
      (`.claude/hooks/guardrails.sh`: destructive-git block + secret scan).
- [x] 2026-07-25 — Research: incremental-game frameworks, starter repos, big-num
      libraries, and Claude Code best practices for a solo/mobile/public setup.
