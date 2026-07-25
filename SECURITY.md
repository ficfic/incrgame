# Security

This is a client-only static game (no backend, no accounts, no user data leaves
the device — saves live in the browser). The attack surface is small.

**Reporting:** open a GitHub issue, or use GitHub's private vulnerability
reporting if enabled. No formal SLA — solo project.

## Notes for maintainers

- The commit-time secret scan in `.claude/hooks/guardrails.sh` is **advisory,
  not a boundary**: it only inspects `Bash` git commits, so commits made via the
  GitHub API/MCP tools bypass it, and its pattern list is finite. **Enable
  GitHub push protection / secret scanning** on the repo as the real server-side
  gate, and consider a `gitleaks`/`trufflehog` CI step (defense in depth).
- Never commit secrets — this is a public repo. There are no secrets in the game
  itself; if CI ever needs one, use GitHub Actions secrets, never a committed file.
