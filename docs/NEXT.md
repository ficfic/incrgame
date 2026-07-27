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

## 1. Attention grows very slowly, and can degrade

**Owner: engine session.** In flight.

It went 4→13 in two minutes. It is a slow background reward, never a currency.
Degradation trigger is an open question in `MODEL.md` — pick ONE, make it
legible.

This now also sets the pace for the story: the owner wants a beat every **2–10
minutes of play**, so the beat scheduler keys off whatever this lands on.

**Done when:** `play-probe` shows attention roughly flat over 10 minutes, and
one named condition visibly costs a slot.

## 2. The masking renderer

**Owner: engine session.** Next, after item 1.

A word in beat text naming a concept the player has not discovered renders as
blocks. Discovering it resolves that word **everywhere, retroactively**,
including beats already read. This is the core mechanic — a choice you cannot
read, you cannot take.

Needs no new save state: "discovered" is already the recovered nodes on the
board. Runs against `docs/graph/story.json` as it stands.

- **Do not string-match lemmas.** `set`, `thing` and `state` are both concepts
  and ordinary English. Content tooling emits explicit span markers; wait for
  them rather than inventing a format.
- **Never mask function words or sentence structure**, only concept nouns. The
  prose is written so a fully-masked sentence still parses as English. A
  renderer that breaks that breaks the design.

**Done when:** `npm run play` shows a beat with masked words, and a screenshot
of the same beat after discovering one of them shows that word resolved.

## 3. Re-aim the dataset depth-first

**Owner: content-tooling session.** Can run in parallel with 1 and 2 — different
branch, different directory.

`build-ontology.mjs` selects breadth-first from `entity`, so the shipped 4,096
concepts bottom out at **depth 5 of 16**. We ship the taxonomy's classifiers and
none of its instances: `noun.animal` holds 25 concepts and not one is an animal;
`noun.food` holds `paring` and `solid food`. Measured by
`scripts/lane-analysis.mjs`.

Consequence today: `build-story.mjs` drops **215 of 308 beats** because the
concepts they sit on do not exist in the game.

Select depth-first along lanes instead. 26 lanes to full depth with three
siblings per junction costs **773 concepts** — a fifth of what ships now.

**This renumbers every node id and resets saves. That is authorised**
(`DECISIONS.md`, 2026-07-27) — say so in the commit message.

**Done when:** `npm run check:story` passes with the dropped-beat count at or
near zero, and the reply pastes the new category distribution showing real
animals.
