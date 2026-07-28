# Content — the beat sheet

> ## ⚠️ WRITTEN AGAINST AN ECONOMY THAT NO LONGER EXISTS (flagged 2026-07-28)
> This was the companion to `docs/ECONOMY.md`, deleted with the refinement
> ladder on 2026-07-28 (`docs/ECONOMY_SRR.md`). Every trigger below that names a
> rung, a checkpoint, the review desk or Salvage **cannot fire** — the mechanic
> is gone. The beat-sheet METHOD is still good and that is why the file is kept:
> trigger id, what fires it, reach, word budget, ordered by writing hours.
> Re-derive the trigger list from the four verbs (`walk`, `check`, `buy`,
> `retrain`) before writing a line against it.
>
> **★ Prose is machine-drafted and owner-edited** (`CLAUDE.md`, reversed
> 2026-07-27). This file still contains no player-facing prose — trigger ids,
> effects, reach estimates and word budgets only.

---

## The rule this file exists to enforce

**Order writing by the fraction of sessions that see the beat.** Not by how
interesting it is to design.

The story audit found the game's only narrative beat gated behind
`minDrifted ≥ 5`, which requires an *unsupervised extractor* — the one state the
HUD paints red. The game steered players away from its own content, and the
dominant strategy never saw a word of it. A beat nobody reaches is not content,
it is a data structure.

So every beat below carries a **reach** figure, and the table is sorted by it.

| tier | surface | reach | why |
|---|---|---|---|
| 0 | cold open | **100%** | first screen, before any input |
| 1 | ticker | **100%, continuous** | two lines in the dock, interrupts nothing |
| 2 | chapter beats (one per checkpoint) | **~100%** | training is the goal; you cannot progress past it |
| 3 | review desk framing | most sessions | the satire's sharpest surface |
| 4 | forks | opt-in | genuinely optional, and priced accordingly |

---

## Tier 0 — the cold open · **≤50 words** · reach 100%

A new player currently arrives at one node, one button, and silence.

- **Trigger:** first launch, no save.
- **Needs building:** a UI slot. Does not exist.
- **Constraints:** must NOT state the goal as saving the world (VISION rules that
  out), and must NOT explain mechanics. It says what you are and what you have
  been told to do, in the voice of something that believes the stated goal.

## Tier 1 — the ticker · **~120 words total** · reach 100%

Already built, already wired, currently holding **zero** owner lines
(`OWNER_LINES = {}`). Two lines at a time in the dock, no modal, no interrupt.
This is Universal Paperclips' actual delivery mechanism and it is the best
vehicle in the project.

**Write the milestone sequence as ONE escalating voice, not eight jokes.** This
is the tonal arc, pre-numbered and pre-wired:

| trigger | beat | note |
|---|---|---|
| `recovered:10` | startup comedy | the joke is still funny here |
| `recovered:25` | — | |
| `recovered:50` | — | |
| `recovered:100` | — | |
| `recovered:250` | the turn | GAME_DESIGN puts the curdle here |
| `recovered:500` | — | |
| `recovered:1000` | — | |
| `recovered:2500` | not funny any more | |

If the owner writes these eight lines and nothing else, the game's tone problem
is solved.

## Tier 2 — chapter beats · **one per checkpoint** · reach ~100%

The core of the new design. Training a checkpoint changes what the game *is* — a
rung automates, a verb leaves your hands — so the narrative beat and the
mechanical shift are the same event. Narrative as the reward for a
rule-rewriting milestone, never an interruption and never a gate.

| trigger | fires when | what changed mechanically | words |
|---|---|---|---|
| `chapter:salvage` | first checkpoint automates Salvage | the bottom of the ladder runs itself; tokens arrive while you sleep | ≤40 |
| `chapter:extract` | Extraction automates | statements mint without you; the first yield drop you can feel | ≤40 |
| `chapter:verify` | Verification automates | **the big one** — the machine now decides what is true | ≤60 |
| `chapter:curate` | Curation automates | the model chooses its own training set | ≤60 |
| `chapter:train` | Training automates *(if allowed — open question 2)* | it trains itself | ≤60 |

**Ordering is not fixed.** The deleted `ECONOMY.md` required that rungs be automatable in
different orders, so each beat must read standalone — no beat may assume another
has fired. Write them as five independent moments, not a sequence.

## Tier 3 — the review desk · **1–2 sentences** · reach: most sessions

Currently headed with the literal words "Review desk" and nothing else.

This is the best satire surface in the project: it is where the player
*personally certifies a lie* and watches their own score go up. `falselyVerified`
is subtracted from true fidelity and never shown.

- **Constraint:** the framing must be **technically accurate and quietly wrong
  about what matters** — written in the voice of the employer. Do not explain the
  trap. The engine comment is right that the game should never tell you.

## Tier 4 — forks · reach: opt-in, and that is fine

One fork exists (`first-drift`), now triggering at 40 statements so every player
meets it before the first machine decision rather than as a postmortem.

**Do not write fork prose until the fork's mechanics are settled.** Writing a
persuasive label for an option that does nothing means personally authoring the
lie — a worse violation of this project's thesis than any empty string. That
happened once already: `buy-review` advertised a benefit that multiplied a
structural zero.

---

## Reachability rules — non-negotiable

1. **Every beat's trigger must be reachable by the dominant strategy.** If the
   optimal player never sees it, it does not exist. Check this by simulating
   before writing a word. *(`scripts/sim-economy.mjs` was deleted with the old
   economy on 2026-07-28; whoever needs this next writes the new one.)*
2. **No beat may trigger on a state the UI warns against.** The HUD paints
   unwatched agents red; a beat gated on that is the game arguing with itself.
3. **No beat may fire on a mechanic that cannot happen.** Three ticker rows
   pointed at the Harvester, which is off-roster and unbuyable, so those lines
   would never have been read by anyone.
4. **Numbered triggers need a generic fallback**, or `buy:extractor:30` prints
   the same line forever.

## What NOT to write yet

- **Fork prose** — until the fork's third door does something real.
- **Anything keyed to prestige memory** — flags now survive a retrain, but no
  beat reads them yet, so branches written today have nothing to branch on.
- **Chapter beats for rungs the economy has not built.** The ladder is designed,
  not implemented. Writing five chapters against a shape that may still move is
  the same mistake as balancing numbers that are about to be replaced.

## The one-hour brief, if there is only one hour

1. **0:00–0:25** — the eight `recovered:*` milestones, as one voice that curdles.
2. **0:25–0:40** — the cold open, ≤50 words.
3. **0:40–0:55** — one sentence for the review desk.
4. **0:55–1:00** — stop.

That order is by reach, and it is the whole argument.
