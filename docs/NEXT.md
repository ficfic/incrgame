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

## 3. Score the vocabulary for WEIRD, and cut the junk

**Owner: content-tooling session.** Can run in parallel with 1 and 2 — different
branch, different directory.

> This item replaced "re-aim the dataset depth-first", which was solving the
> wrong problem. Owner, 2026-07-27: *"i want weird abstract shit in the story,
> not wolves."* The upper ontology **is** this game's subject matter; chasing
> `wolf` and `firearm` would have made it a nature documentary with RDF stapled
> on. See `DECISIONS.md`.

The dataset is not too shallow. It is **uncurated**. Measured: **1,212
weird-abstract concepts already ship** —

    otherworld · eidos · ethos · might-have-been · nonevent
    unconnectedness · dealignment · reciprocality · bilocation
    irreversible process · cause of death · uncheerfulness

— sitting beside the actual defect, which is junk: `jimdandy`, `instalike`,
`must-see`, `freshener`, `stinker`, `whacker`, `go-to`. WordNet slang filed
under `noun.artifact`.

And the junction problem is unsolved: `scripts/build-story.mjs` still picks
siblings **alphabetically**, so the choice under `animal` is
`aerobe / amphidiploid / anaerobe`. Correct arithmetic, dead choices.

**Two halves, and the first is free.** Scoring changes no ids — it only reorders
which siblings a junction offers, so it needs no save reset. Cutting junk
removes concepts and therefore renumbers, which resets saves; that is authorised
(`DECISIONS.md`, 2026-07-27) but do it second and say so in the commit.

Score for **strangeness**, not rarity and not concreteness. `nonevent` beats
`anaerobe` and both are rare.

**Done when:** the reply pastes a junction's before/after choice list — the
`aerobe / amphidiploid / anaerobe` one is the benchmark — and `npm run
check:story` still passes.
