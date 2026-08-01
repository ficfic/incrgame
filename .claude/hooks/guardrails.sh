#!/usr/bin/env bash
# Guardrail hook for Claude Code (PreToolUse on Bash).
# Two jobs:
#   1. Hard-block destructive git commands.
#   2. Block commits that contain obvious secrets (this repo is PUBLIC).
#
# Blocks by exiting with code 2, which stops the tool call and shows the
# message on stderr back to Claude. To intentionally override, run the
# command in a way that doesn't match (documented in CLAUDE.md) — the block
# is deliberate friction, not a lock you can never open.

set -euo pipefail

# Claude Code sends the tool call as JSON on stdin: {"tool_input":{"command":"..."}}
payload="$(cat)"
cmd="$(printf '%s' "$payload" | jq -r '.tool_input.command // empty')"

# Nothing to inspect (not a Bash command with a string) -> allow.
[ -z "$cmd" ] && exit 0

block() {
  echo "GUARDRAIL BLOCKED this command: $1" >&2
  echo "" >&2
  echo "Command was: $cmd" >&2
  echo "" >&2
  echo "This is a hard block (see .claude/hooks/guardrails.sh). If you truly" >&2
  echo "intend this, tell the user what you're about to do and why, and get" >&2
  echo "explicit confirmation before finding another path." >&2
  exit 2
}

# ---------------------------------------------------------------------------
# 1. Destructive git commands
# ---------------------------------------------------------------------------
# Normalize whitespace for matching.
norm="$(printf '%s' "$cmd" | tr -s '[:space:]' ' ')"

# force push — but allow the safer --force-with-lease
if printf '%s' "$norm" | grep -Eq 'git +push' ; then
  if printf '%s' "$norm" | grep -Eq -- '--force-with-lease' ; then
    : # allowed: --force-with-lease is the safe variant
  elif printf '%s' "$norm" | grep -Eq -- '(--force|[[:space:]]-f([[:space:]]|$))' ; then
    block "force push (use --force-with-lease if a force is genuinely needed)"
  fi
fi

# reset --hard
printf '%s' "$norm" | grep -Eq 'git +reset +--hard' \
  && block "git reset --hard (discards uncommitted work)"

# clean -f / -fd / -fdx etc.
printf '%s' "$norm" | grep -Eq 'git +clean +(-[a-zA-Z]*f|--force)' \
  && block "git clean -f (permanently deletes untracked files)"

# checkout/switch --force (discards local changes)
printf '%s' "$norm" | grep -Eq 'git +(checkout|switch) +(--force|-[a-zA-Z]*f)' \
  && block "git checkout/switch --force (discards local changes)"

# branch -D (force-delete unmerged branch)
printf '%s' "$norm" | grep -Eq 'git +branch +(-D|--delete --force|-[a-zA-Z]*D)' \
  && block "git branch -D (force-deletes a possibly-unmerged branch)"

# ---------------------------------------------------------------------------
# 2. Secret scan on commit (public repo)
# ---------------------------------------------------------------------------
if printf '%s' "$norm" | grep -Eq 'git +commit' ; then
  # Look at what is actually staged.
  staged="$(git diff --cached 2>/dev/null || true)"
  if [ -n "$staged" ]; then
    # Known high-signal secret shapes. Prefixes chosen to avoid false positives.
    patterns=(
      '-----BEGIN [A-Z ]*PRIVATE KEY-----'  # RSA/EC/OpenSSH/PGP private keys
      'AKIA[0-9A-Z]{16}'                    # AWS access key id
      'ghp_[A-Za-z0-9]{30,}'                # GitHub personal token
      'github_pat_[A-Za-z0-9_]{30,}'        # GitHub fine-grained token
      'sk-ant-[A-Za-z0-9-]{20,}'            # Anthropic API key
      'sk-[A-Za-z0-9]{32,}'                 # OpenAI-style key
      'xox[baprs]-[A-Za-z0-9-]{10,}'        # Slack token
      'AIza[0-9A-Za-z_-]{35}'               # Google API key
    )
    for p in "${patterns[@]}"; do
      # -e guards patterns that start with '-' (e.g. -----BEGIN PRIVATE KEY-----)
      if printf '%s' "$staged" | grep -Eq -e "$p"; then
        block "a possible SECRET matching /$p/ is staged. Never commit secrets to a public repo. Unstage it and move it to a GitHub Actions secret or an untracked, gitignored env file."
      fi
    done

    # ★ NAMES THE OWNER DOES NOT WANT IN A PUBLIC REPO.
    #
    # The owner asked whether their play-test notes should live in a private
    # repo. The answer was no — two repos cost more than the risk is worth —
    # but only if the convention holds: THEIR QUOTES STAY, THEIR NAME NEVER
    # APPEARS. Their words about their own game are the spec and belong in the
    # open; who they are does not.
    #
    # ⚠️ THE LIST IS UNTRACKED, AND THAT IS THE WHOLE TRICK. A hook that
    # hard-coded the name would put the name back in the public repo — the
    # guard would be the leak. So the names live in `.claude/private-names`,
    # which is gitignored, one per line. No file, no check, no harm; the
    # convention is written down in `.claude/agents/the-owner.md` either way.
    #
    # ⚠️ ADDED LINES ONLY, AND THE FIRST VERSION WAS NOT. Scanning the whole
    # staged diff blocked the very change that REMOVES a name, because a
    # deletion line still contains the text it deletes. Caught within a minute:
    # the change stripping the name from two files was refused by the guard
    # written to strip it. What matters is what ENTERS the repo.
    added="$(printf '%s' "$staged" | grep -E '^\+' || true)"
    names="$CLAUDE_PROJECT_DIR/.claude/private-names"
    [ -f "$names" ] || names=".claude/private-names"
    if [ -f "$names" ]; then
      while IFS= read -r n; do
        # Skip blanks and comments.
        case "$n" in ''|'#'*) continue ;; esac
        if printf '%s' "$added" | grep -Fqi -- "$n"; then
          block "a name from .claude/private-names is staged, and THIS REPO IS PUBLIC. The owner's quotes belong in the repo; their name does not. Write \"the owner\" instead."
        fi
      done < "$names"
    fi
  fi
fi

exit 0
