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

> **Building `docs/MODEL.md`.** Owner called the economy convoluted on
> 2026-07-26 and made three decisions; the model is one page and supersedes the
> ladder in ECONOMY.md. These items are that model, in order, smallest first.

## 1. Attention grows very slowly, and can degrade

It went 4→13 in two minutes. It is a slow background reward, never a currency.
Degradation trigger is an open question in MODEL.md — pick ONE, make it legible.

**Done when:** `play-probe` shows attention roughly flat over 10 minutes, and one
named condition visibly costs a slot.

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
