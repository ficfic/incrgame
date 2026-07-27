# NEXT — the queue

**This file is the only thing that decides what gets worked on.**

Items in order. Work the top one. When it ships, delete it and promote the
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

## 1. Prove the four gates go red, in writing

`the-process` audit, 2026-07-26: **0 of 4** gates (`check:align`, `check:core`,
`check:vocab`, `play`) has a durable record of being confirmed red. Two of the
four have already been caught vacuous in production — the purity gate matched a
word inside a comment, the alignment gate printed a tick without running.

Rule 4 says a check nobody has broken on purpose is assumed vacuous. Verifying it
in chat does not count: the record has to outlive the session.

**Done when:** each gate's script carries a comment stating the exact sabotage
that makes it fail and the observed output, and `DECISIONS.md` has one line
recording it.

## 2. `OWNER_LINES` — the eight ticker milestones

Wired, reachable, 100% reach, still empty. Owner writes them; nothing else here
is blocked on anything.

**Done when:** eight lines exist in `src/shell/ticker.ts` and the probe shows one
firing.

## 3. The starmap: delete Discover, tap a lane instead

Owner, 2026-07-27: "remove the discover button and instead go kinda like starmap
exploration, we have some lanes from entity in the beginning, some we can see
where they lead, some are dotted lines leading somewhere, and some will open only
under some circumstances".

Rarity ships, so a lane can already be named or masked by how obscure its far end
is. The worldbuilding branch measured that our 4,096-concept slice is
breadth-first and holds only classifiers — `noun.animal` contains no animals —
so this item probably rides on a depth-first re-slice.

**Done when:** there is no Discover button, `play-probe` still reaches 30+
concepts in ten minutes, and the screenshot shows named and masked lanes.
