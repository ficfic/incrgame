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
>
> **The `SOLID · RAW · ROT` economy shipped in the core on 2026-07-28** and left
> this queue. It is no longer an item; `docs/ECONOMY_SRR.md` is marked BUILT and
> `docs/HANDOVER.md` describes what is actually there.

> ### ⚠️ THE BUILD IS RED, AND IT BOUNDS THIS QUEUE
> `src/ui/App.svelte` was not rewritten with the economy. It still imports four
> deleted modules, so `vite build` fails, `npm run check:vocab` fails, and
> **`npm run play` cannot run at all.** Item 3 is that fix. Until it ships, no
> item can meet a "screenshot it" definition of done — including item 1's.
> Stated here rather than discovered by the next session; the owner picks the
> order, not the document.

## 1. Node memory

**Owner: engine session.** Memory without a loop is decoration, and what makes
"walk it again" a real cost is the lane join, which is now in the engine
(`stepCost` is 0 for a concept you already hold).

Spec: `docs/MEMORY.md`. What carries across a reset is not what you know, it is
what the graph remembers you doing, and it remembers imperfectly. Trust the
memory (free, possibly false) or walk it again (costs, true) — speed versus
truth in the story layer.

**Done when:** a generation-2 run shows a memory that is wrong, and walking it
again corrects it. Screenshot both — **which needs item 3 first.**

## 2. Cut the junk, then write the high-traffic beats

**Owner: content-tooling session.** Parallel with 1 and 3 — different branch,
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

## 3. The screen, against the four quantities

**Owner: engine session.** The other half of the economy rewrite, split off
because WIP = 1 — the core landed, the screen did not.

`src/ui/App.svelte` is still the pre-rewrite file: 90 `svelte-check` errors, and
four imports of modules that no longer exist (`../core/graph`,
`../content/generators`, `../content/vignettes`, `../shell/salvage`). It reads
`attentionCap`, `REFLECT_MIN_CONCEPTS`, `chooseOption` and `saveVersion`, none
of which the engine has.

What replaces them: **Words**, and **Solid/Raw/Rot as ONE STACKED BAR** so the
screen holds two objects and not four; a card per machine with the
watched/loose toggle on it; Walk, Check, Buy, Retrain; and the bottleneck
sentence in words — *"your 30 Extractors could make 12.0/s — your vocabulary
supports 4.5/s"*. Numbers come from `READOUTS`, never from state directly; the
readout for a word the player cannot read yet stays off screen (`literacy.ts`,
`LEARN_AT = 3`). Do not reintroduce English chrome.

**Done when:** `vite build` is clean, `npm run check:vocab` passes for a reason
you can point at (it fails today on all four readouts being unreferenced by
`src/ui/`), and `npm run play` was run with the screenshot pasted into the
reply.
