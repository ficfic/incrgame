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

## 1. The context window

Owner's idea, 2026-07-26. `ANCHOR_CAP = 240` already caps how many concepts you
can hold and silently folds one away when you exceed it. It is named nothing,
drawn nowhere, and cannot be grown — the single most confusing thing in the game.

Name it the **context window**, draw it as the circle, make growing it the
progression.

**Done when:** the cap is visible on the board, exceeding it reads as a concept
going dark rather than vanishing, there is one way to grow it, and a
`play-probe` screenshot shows all three.

**Not in scope:** repricing the agent roster, checkpoints, prestige changes.

## 2. Reprice the ladder

Statement volume fell ~50× when extraction started minting real edges
(2026-07-26). The roster still costs 40 and 90 *checked*, priced against the old
flow, so first automation is a long way out.

**Done when:** `play-probe` shows the first agent affordable inside 10 minutes of
ordinary play, and the source fork still favours archives for verified material.

## 3. Prove the four gates go red, in writing

`the-process` audit, 2026-07-26: **0 of 4** gates (`check:align`, `check:core`,
`check:vocab`, `play`) has a durable record of being confirmed red. Two of the
four have already been caught vacuous in production — the purity gate matched a
word inside a comment, the alignment gate printed a tick without running.

Rule 4 says a check nobody has broken on purpose is assumed vacuous. Verifying it
in chat does not count: the record has to outlive the session.

**Done when:** each gate's script carries a comment stating the exact sabotage
that makes it fail and the observed output, and `DECISIONS.md` has one line
recording it.

## 4. `OWNER_LINES` — the eight ticker milestones

Wired, reachable, 100% reach, still empty. Owner writes them; nothing else here
is blocked on anything.

**Done when:** eight lines exist in `src/shell/ticker.ts` and the probe shows one
firing.
