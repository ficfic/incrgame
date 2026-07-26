# Content experiments — a batch to shoot at

> Proposals only. Each is data or mechanism, never prose. Reviewed by agents
> below the line; **anything marked KILLED stays in this file** so the next
> session does not re-propose it and re-learn the same objection.
>
> Ranked by (reach × how hard it would be to fake).

---

## 1. The labels rot on screen

`corrupt()` already exists in `src/shell/ontology.ts` — deterministic
character-level corruption of a real string, built precisely so licensed text
can be shown decaying rather than replaced with invented text.

**It is not used on the board.** Concepts whose support has rotted are drawn in a
different colour and that is all.

**Proposal:** a concept's *label itself* degrades as its provenance rots.
`dog` → `d▒g` → `▒▒▒`. The word you recovered comes apart in front of you.

- **Reach:** 100%, continuous, no prose.
- **Why it is the best idea here:** it is model collapse rendered on the exact
  artifact the game is about — a word — using a function already written for this
  purpose and already theory-safe (real string, visibly damaged, never invented).
- **Cost:** near zero. `corrupt(label, id, 1 - fidelity)` at the render layer.
- **Risk:** unreadable at high rot. Needs a floor so a label degrades to
  *illegible-but-present*, not to nothing, or the board loses its landmarks.

## 2. The model card

Checkpoints are versioned artifacts. Real ML ships **model cards** — a documented
artifact type, and famously the place where the unflattering numbers are not.

**Proposal:** each checkpoint has a card: version, what it was trained on, its
scores. The card shows **coverage** prominently and **source agreement** in
smaller type, because that is exactly what real cards do.

- **Reach:** every player who trains, i.e. everyone.
- **Why:** it is a real artifact, so it is theory-faithful; it is a natural home
  for owner prose with real structure; and the satire needs no joke — the layout
  *is* the joke.
- **Cost:** one sheet, mostly generated numbers.
- **Risk:** a sheet is a modal. Must be openable, never pushed.

## 3. Per-category evaluation

The dataset carries WordNet lexnames — `noun.animal`, `noun.artifact`,
`noun.plant`, 26 of them. They are already in the manifest and unused for
anything but a label.

**Proposal:** score coverage and source agreement **per category**. The overall
number can read 94% while `noun.plant` reads 11%.

- **Why:** this is what tail loss actually looks like in a benchmark, it is real
  data we already ship, and it makes the second number legible instead of
  abstract — you can see *which part of the world* you lost.
- **Cost:** a grouping over data already loaded.
- **Risk:** 26 rows is a lot of screen. Show the worst three.

## 4. Salvage sources are real corpora

Rung 1 needs sources with different distributions (`ECONOMY.md`).

**Proposal:** name them after the real thing — a web crawl, a forum dump, scanned
books — with genuinely different head/tail profiles, because those corpora really
do differ that way.

- **Why:** no invented vocabulary (the standing rule), and the distribution
  differences are true rather than flavour.
- **Risk:** naming a specific real product invites a licensing conversation the
  project does not need. Use the generic type, not the brand.

## 5. The model proposes, you dispose

When a checkpoint automates a rung it currently just runs it.

**Proposal:** it also *proposes* edges it is unsure about — drawn in a distinct
state, neither dotted nor solid. Accept, reject, or ignore. Ignoring is fine and
they expire.

- **Why:** this is human-in-the-loop as a visible, optional surface rather than a
  stat, and it is where the "certify a lie and watch your score rise" mechanic
  can actually be *seen*.
- **Risk:** directly threatens the HITL guardrail. Must be genuinely ignorable
  with no penalty beyond the default outcome, or it is an attention tax.

## 6. Concepts die visibly

A concept whose last support rots currently just stops counting.

**Proposal:** it greys, keeps its label a while, the label corrupts (see 1), then
it goes. And the board keeps a record of what was lost.

- **Why:** loss you watch is loss you understand. Also the counterweight to
  VISION's "nothing you chose is deleted" — you see it going and can intervene.
- **Risk:** if it is not recoverable in one action, this is the ragequit moment.

## 7. `entity` never rots

**Proposal:** the root is immune. Everything else can go.

- **Why:** a fixed point to navigate by when the rim is dark, and it is the one
  concept whose loss would make the board meaningless. Free.
- **Risk:** none obvious. May be too small to be worth a line in a doc.

## 8. The away report is a shift handover

Returning after time away currently produces a toast.

**Proposal:** frame it as what the machines did while you were out — how much they
minted, and what it cost in agreement.

- **Why:** the away moment is the most-read surface in any idle game and it is
  currently a single mechanical sentence. It is also the natural place to feel
  that the model kept working without you.
- **Risk:** none mechanical; it is a prose slot, so it waits on the owner.

---

## Verdicts

*(filled in from agent review — see `DECISIONS.md` for the log)*
