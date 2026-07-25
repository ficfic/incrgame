# Backlog

The running "what's next" list. Keep it current so any session can pick up
without being re-briefed. Move finished items to **Done** with a date.

## Now / next

- [x] Game concept chosen: **knowledge-graph incremental** (see
      `docs/GAME_DESIGN.md`). Core engine locked: inference = compounding.
- [x] Educational angle set: "faithful but playable"; GLOSSARY.md is the
      accuracy source of truth; mechanics teach real theory.
- [ ] Flesh out the design's open questions (balance curves, how self-
      description plays, theme/tone).
- [ ] Design the "Field Notes" codex format (in-game explainer + learn-more
      links to real specs).
- [ ] Choose the graph-render library (sigma.js vs cytoscape.js) — spike both on
      mobile before committing.
- [ ] Scaffold the game (TS + Vite + break_eternity + GH Pages deploy) when
      ready to start building.

## Someday / maybe

- [ ] `add-ontology-content` skill — author domains/entities/edges as declarative
      data; write it once adding content is a repeated motion.
- [ ] `save-migration` skill — scaffold a versioned save + migration step safely.
- [ ] `release`/deploy skill (build → verify → push → Pages) — write it once the
      deploy flow has been done manually twice.
- [ ] Build/verify (SessionStart) hook — once there's a game to build.
- [ ] Optional `decide` skill wrapping the chip-based decision flow + auto-log.

## Done

- [x] 2026-07-25 — Foundation: lean CLAUDE.md, durable memory files
      (DECISIONS.md, BACKLOG.md), and enforced guardrails
      (`.claude/hooks/guardrails.sh`: destructive-git block + secret scan).
- [x] 2026-07-25 — Research: incremental-game frameworks, starter repos, big-num
      libraries, and Claude Code best practices for a solo/mobile/public setup.
