# incrgame — project rules & ways of working

A solo graph RPG with incremental elements on **GitHub Pages**, played by the
owner in **iOS Edge**, built entirely through Claude Code on mobile. Sessions
are ephemeral: anything that must outlive one lives in a committed file.

**Read `docs/NEXT.md` first. It decides what you work on. Nothing else does.**

---

## How we work — the five rules

These replaced a way of working that measurably did not function. On 2026-07-26
one session produced 29 commits, of which **5 added something a player can do**;
the rest were fixes to that session's own breakage, infrastructure, and
documents. Three features were shipped and rebuilt the same day.

**1. WIP = 1.** One item from `docs/NEXT.md` per session. A defect you find
mid-item goes to the bottom of `BACKLOG.md` as one line — not into this session —
unless it blocks the item. New ideas go to the backlog, never into today.
*(Kanban WIP limits exist specifically to reduce rework.)*

**2. Nothing ships without a check you ran and evidence you pasted.** The check
for anything player-facing is `npm run play` **plus looking at the screenshot**.
*(⚠️ `npm run play` ran `play-camp.mjs` — the DELETED TOWN — for a week after
the pivot, so the one check this rule names was pointed at a game nobody could
reach. It runs the delve now; the town is `npm run play:town`.)*
"Typechecks and tests pass" is not evidence that a game works. If you cannot
verify it, do not ship it. Report the output, not the conclusion.

**3. Build the smallest playable version, then look at it, then decide.** Do not
write a design DOCUMENT first. This project has ~50,000 words of docs against
~5,000 lines of code, and the docs did not catch the mistakes: two revisions,
three agent reviews and a headless simulation all missed that Extraction minted
integers and called them statements. One question from the owner caught it, and
150 seconds of play caught the attention-cap inflation.
Write a spec only when the decision is genuinely irreversible — save format,
licensing, data pipeline.
*This bans speculative documents, NOT thinking.* Explore and plan before touching
a multi-file change or unfamiliar code — that is standard practice and it is
cheap. If you could describe the diff in one sentence, skip straight to the diff.

**3b. One item, one session.** When the item ships, stop and start the next one
fresh. Context degrades as it fills, and a session that has already done three
things makes more mistakes on the fourth — which is how today happened. Send
wide investigations to a **subagent** so exploring the codebase does not eat the
context you need for building it.

**4. Verify a check goes RED before trusting it.** Every guard in this repo has
been vacuous at least once: a browser gate that "passed" in 11 seconds without
running, a migration test that passed with the migration deleted, a purity grep
that matched a word inside a comment. Break the code on purpose, watch the check
fail, put it back.

**5. Stop at done.** Ship the item, report it, stop. Do not start the next thing,
do not refactor something you noticed, do not build a guard for a bug you just
fixed unless the item called for it. Meta-work breeds meta-work.

### Review agents (`.claude/agents/`)

`chad-liquidity` (balance), `the-graph` (consistency), `the-auditor`
(security/licensing), `the-redditor` (genre credibility), `the-process` (are we
actually following these rules — it counts, it does not opine). Fresh context,
so they cannot rubber-stamp their own work. **`prof-veritas` reviewed
RDF/OWL/SPARQL fidelity and the pivot left it no subject** — do not invoke it;
the file stays on disk.

**One review round per item, and only findings that affect correctness or the
stated requirement.** A reviewer asked to find gaps will always find some; acting
on all of them is how eight content ideas became a module, a check script, and
tests for the check script.

### Talking to the owner

- **★ SHORT. The owner has said so explicitly.** Hard limit: **150 words per
  reply**, short sentences, no preamble. Lead with the verdict. Use a table or a
  list, never paragraphs. Detail goes in the commit message and the docs — that
  is what they are for. If it truly needs more, ask first.
- **Chips, not prose.** Use `AskUserQuestion` for any real choice. One question,
  not four.
- **Hold the line for both of us.** If the owner asks for something that is not
  the top item in `docs/NEXT.md`, say so in one sentence and ask: now, or queue
  it? Do not silently switch. That is the rule they are relying on you to keep.
- **Build, then review.** Reserve up-front plans for large or irreversible work.
- **Log decisions as ONE LINE** in `docs/DECISIONS.md` — date, decision, why.
  That file is 17,500 words because this rule was ignored.
- **Voice: full wacky, honesty underneath.** Satirical-startup-with-an-ominous-
  spine. But status, verdicts, test results and bad news stay plainly honest. A
  wacky reply that misleads is a failure.

---

## Guardrails (enforced, not requested)

- **Destructive git is hard-blocked** by `.claude/hooks/guardrails.sh`:
  `push --force`, `reset --hard`, `clean -f`, `checkout --force`, `branch -D`.
- **This repo is PUBLIC. Never commit secrets.** The hook scans staged commits.
- **Develop on `claude/rpg-graph-story-redesign`**; deploy by fast-forwarding
  `claude/incremental-game-github-pages-w7pvk6` onto it. Push with
  `-u origin <branch>`. No PRs unless asked. *(The pre-pivot branch
  `claude/knowledge-recovery-ontology-game-g0f9q0` still deploys. Leave it.)*
- **★ Player-facing PROSE is machine-drafted and owner-edited.** *(Reversed by
  the owner on 2026-07-27. The previous rule — "all prose is human-written,
  never sentences" — is void. Kept on record here because it was load-bearing
  for months and a future session will otherwise re-derive it.)*
  Agents draft event text, Field Notes, flavour and vignette prose; the owner
  then iterates on it, repeatedly. The thesis is unchanged — this game still
  mocks AI slop — so the bar is that a line must be **good enough that the
  owner would defend it**, not merely present. Drafts are a starting point for
  the owner's passes, never a finished surface.
- **Saves are breakable.** *(Reversed by the owner on 2026-07-27: "i'm
  completely ok with breaking saves at any time." The previous rule — "never
  break an existing save, additive forward migrations only" — is void. On
  record because it shaped the save format and a future session will otherwise
  assume it still holds.)*
  Migrations are now **optional**, not mandatory: write one when it is cheap,
  reset when it is not. Two things still stand, for different reasons —
  `version` stays on every save so the code can *tell* which format it has, and
  export/import keeps working because that is how the owner moves a save
  between devices. Say plainly in the commit message when a change resets saves;
  a silent reset is still a defect.
- **★ There is no accuracy guardrail any more.** *(Voided by the pivot,
  2026-07-29. The previous rule — "stay theory-faithful, this game is
  educational: every concept matches its definition in `GLOSSARY.md`, every
  simplification labelled in-game" — is void. On record because it was
  load-bearing for months: it named mechanics, killed others, and is why
  `GLOSSARY.md` and `SIMPLIFICATIONS.md` exist.)* The ontology it policed is
  gone. Invented fantasy answers to the brief, not to a citation.
- **One word, one quantity.** The board once said "25 nodes" beside a HUD
  saying "3 recovered", both correct. **THE RULE HAS A REAL CHECK AGAIN**:
  `scripts/check-vocab.mjs`, in `npm run guard` and in CI. The delve's
  vocabulary lives in one place — `src/delve/words.ts` — and the check asserts
  it is a bijection, that every word in it actually reaches a screen, and that
  fifteen named synonyms reach none. Four sabotages recorded.
  *(⚠️ It reads STRING LITERALS AND MARKUP TEXT ONLY. Searching raw source
  flagged `g.hp`, `stepToward` and `class="tick"` — eight false positives of
  code the player never sees — and a guard that cries about field names is a
  guard everybody turns off. For the same reason "round", "step" and "damage"
  came straight back OFF the banned list: the shop says a pack "has to go
  round", which is a preposition.)*  *(Its old check, `check-vocabulary.mjs`, was deleted on 2026-08-23 with
  `check-story`, `check-words`, `check-prose` and `check-alignment` — five
  scripts measuring a game that no longer exists, two of them still wired as
  deploy gates.)*
- **HITL review is never mandatory.** Manual review is an optional min-max lever,
  never an attention tax. An idle game that demands babysitting isn't one.
- **Respect the mobile performance budget** (`docs/GAME_DESIGN.md`): simulate in
  numbers, render a representative graph with level-of-detail.

## Stack

Pure-TS headless engine (`apply(state, action) => state`, no DOM/clock/RNG) +
break_eternity · **Svelte 5 runes** · **DOM + CSS** for anything with text or a
tap target · **canvas 2D** for the graph's lines · **d3-force** for layout ·
Vite + PWA · Vitest. Content is declarative data.

**`docs/BRIEF.md` wins over any other doc.** Read the rest only when the item
needs them: `VISION.md`, `GAME_DESIGN.md`, `SKILLS.md`, `COMBAT.md`,
`ARCHITECTURE.md` (the stack), `SPEC.md` (types, save, deploy), `HANDOVER.md`
(current state). A doc banner-marked **RETIRED** is history, never a
requirement.
