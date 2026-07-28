# NEXT — the queue

**This file is the only thing that decides what gets worked on.**

Three items, in order. Work the top one for your session. When it ships, delete
it and promote the next. Everything else lives in `BACKLOG.md` and is not in
play.

**WIP = 1, PER SESSION.** Two sessions now run in parallel on different
branches. Each takes ONE item. A defect found mid-item goes to the bottom of the
backlog with one line, *not* into the current session — unless it blocks the
item being built.

**Ownership is part of the item.** The rule that keeps two sessions from
colliding: **one session, one branch, one directory.** The seam is the id
boundary — content tooling owns everything up to "emit numeric-id data", the
engine owns consuming it. Handoff between sessions is
`git log --oneline origin/<other-branch>`, never a shared note file
(`HANDOVER.md` went stale and misled a session; see `BACKLOG.md`).
**Only the session that ships an item edits this file.**

**Definition of done is written BEFORE the work starts.** It is not the same
three things for every item any more, because it could not be met by a
data-only item and pretending otherwise produced false evidence:

- **Player-facing items:** the check passes, **`npm run play` was run and the
  screenshot looked at**, evidence pasted into the reply — not "it works" — and
  the Actions run confirmed green. *"I pushed" is not "it shipped."*
- **Tooling/data items:** the check passes, and the **numbers it produced are
  pasted into the reply**, including what was dropped or bounded. A data
  artifact that does not say what it excluded reads as complete coverage when it
  is not. Do not claim a play probe you could not run.

---

> **Scope changed on 2026-07-27.** The owner replaced the discover button with
> **starmap lanes**, made the story a vocabulary-gated CYOA, and reversed two
> hard rules (prose is now machine-drafted and owner-edited; saves are
> breakable). See `docs/DECISIONS.md`. The previous queue — four gates proven
> red, `OWNER_LINES` — is in `BACKLOG.md`; neither was wrong, both were
> overtaken.

## 1. The economy: `SOLID · RAW · ROT`

**Owner: engine session.** Unblocked 2026-07-27 — the attention question is
answered (deleted). Spec is `docs/ECONOMY_SRR.md`; read it before any code, it
carries the diagnosis with citations.

Four quantities replace about twelve nouns. The diagnosis found the model was
never the problem: `checked` refers to four different things, `Extract` and
`Extractor` mean opposite things about truth, and the HUD never calls
`readouts.ts` at all — so "one word, one quantity" reads as enforced and is not.

**The lane join is the item, not a detail.** `factsPerSecond = min(0.4 ×
machines, 0.15 × Words)`. You cannot extract relations about entities you do
not hold, so walking the story is the only income upgrade and an idle-only
player flatlines with the reason stated on screen. Without it the story and the
idle loop remain two games sharing a screen.

Resets saves — authorised (`DECISIONS.md`), say so in the commit.

**Done when:** `npm run play` shows four quantities and no fraction except
`Words N/M`, the screenshot is in the reply, and the vocabulary gate's red
output is pasted (it is currently vacuous — it polices one retired field).

## 2. Node memory

**Owner: engine session.** After item 1, not before — memory without a loop is
decoration, and what makes "walk it again" a real cost is item 1's lane join.

Spec: `docs/MEMORY.md`. What carries across a reset is not what you know, it is
what the graph remembers you doing, and it remembers imperfectly. Trust the
memory (free, possibly false) or walk it again (costs, true) — speed versus
truth in the story layer.

**Done when:** a generation-2 run shows a memory that is wrong, and walking it
again corrects it. Screenshot both.

## 3. Cut the junk, then write the high-traffic beats

**Owner: content-tooling session.** Parallel with 1 and 2 — different branch,
different directory.

The dataset ships `jimdandy`, `instalike`, `must-see`, `freshener`, `stinker`,
`whacker`, `go-to` — WordNet slang filed under `noun.artifact`, sitting beside
the 1,212 weird-abstract concepts the game actually wants. Cutting them
renumbers node ids and resets saves; that is authorised.

Then: 419 of 446 places render from four carrier sentences. That is a fine
floor and thin if a player passes the same ones repeatedly. Bespoke prose for
the shallow, high-traffic places first — they are read most.

**Done when:** the junk list is gone from the shipped dataset and
`npm run check:story` still passes.
