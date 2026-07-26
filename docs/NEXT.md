# NEXT — the queue

**This file is the only thing that decides what gets worked on.**

Three items, in order. Work the top one. When it ships, delete it and promote the
next. Everything else lives in `BACKLOG.md` and is not in play.

**WIP = 1.** One item per session. A defect found mid-item goes to the bottom of
the backlog with one line, *not* into the current session — unless it blocks the
item being built. This rule exists because the alternative was measured: on
2026-07-26 a single session touched content review, HUD copy, the economy,
a vocabulary module, the service worker, a play probe and a rebuild of the
economy, and shipped five player-visible things out of twenty-nine commits.

**Definition of done is written BEFORE the work starts** and is the same three
things every time:

1. The check passes (`npm test`, `npm run check:*`, `npx svelte-check`).
2. **`npm run play` was run and the screenshot was looked at.** Evidence pasted
   into the reply — not "it works".
3. Deployed, and the Actions run confirmed green. *"I pushed" is not "it
   shipped."*

---

## 1. Reprice the ladder

Statement volume fell ~50× when extraction started minting real edges
(2026-07-26). The roster still costs 40 and 90 *checked*, priced against the old
flow, so first automation is a long way out.

**Measured 2026-07-26 after the context window shipped:** play stalls at 20/20
concepts around t=105s. Growing the window costs checked statements, checked
income is ~19 statements per 150s, and the second step costs 17 — so the loop
runs once and then waits. Context growth is now a third claim on the same
currency as the agent roster, and all three want repricing together.

**Done when:** `play-probe` shows the first agent affordable inside 10 minutes of
ordinary play, and the source fork still favours archives for verified material.

## 2. Prove the four gates go red, in writing

`the-process` audit, 2026-07-26: **0 of 4** gates (`check:align`, `check:core`,
`check:vocab`, `play`) has a durable record of being confirmed red. Two of the
four have already been caught vacuous in production — the purity gate matched a
word inside a comment, the alignment gate printed a tick without running.

Rule 4 says a check nobody has broken on purpose is assumed vacuous. Verifying it
in chat does not count: the record has to outlive the session.

**Done when:** each gate's script carries a comment stating the exact sabotage
that makes it fail and the observed output, and `DECISIONS.md` has one line
recording it.

## 3. `OWNER_LINES` — the eight ticker milestones

Wired, reachable, 100% reach, still empty. Owner writes them; nothing else here
is blocked on anything.

**Done when:** eight lines exist in `src/shell/ticker.ts` and the probe shows one
firing.
