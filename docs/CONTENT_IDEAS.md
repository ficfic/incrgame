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

**Proposal:** it also emits **unverified proposals** — candidate edges drawn in a
distinct state, neither dotted nor solid. Accept, reject, or ignore. Ignoring is
fine and they expire.

*(Originally worded "edges it is unsure about". Killed by theory review: there is
no uncertainty estimate in this codebase, only an RNG, and "unsure" asserts a
calibrated self-estimate that is not simulated. "Unverified" is literally true.)*

- **Why:** this is human-in-the-loop as a visible, optional surface rather than a
  stat, and it is where the "certify a lie and watch your score rise" mechanic
  can actually be *seen*.
- **Risk:** directly threatens the HITL guardrail. Must be genuinely ignorable
  with no penalty beyond the default outcome, or it is an attention tax.

## 6. Concepts die visibly

A concept whose last support rots currently just stops counting.

**Proposal:** it greys, keeps its label a while, then it goes — **spelling
intact the entire time.** The board keeps a record of what was lost.

*(The "label corrupts" clause was struck: see the kill on idea 1. Absence is the
mechanism, not damage.)*

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

## Verdicts — theory review, 2026-07-26

**Batch verdict: THEORETICALLY UNSOUND, cheaply fixable.** Six of eight are safe
or need only a label. Two teach something false, and one of those is the idea
this file rated highest.

### ❌ 1. Labels rot on screen — **KILLED**

**The objection, stated so it survives:** character-level corruption depicts
**bit rot** — storage and transmission noise, a different failure from a
different field. Model collapse is **distribution collapse**: rare things stop
being there. Neither phase of it damages an individual item.

The lesson a player takes from `dog` → `d▒g` is *"degraded machine output can be
spotted by looking at it."* That is the single most harmful misconception
available in this subject, because the defining property of collapsed and
hallucinated output is that it stays **fluent**. Shipping it would teach the
inverse of this game's own thesis.

Worse, the project already had this right and this proposal reversed it without
noticing. `src/core/types.ts`: *"A corrupt item is NOT a garbled string — it is a
real concept shown with another real concept's definition… spotting rot requires
reading the gloss rather than looking for damage."*

**Why it was proposed anyway:** `corrupt()` has **zero call sites**, so its
docstring was the only thing anyone read, and the docstring was wrong — it said
"the definition you had, decaying". Fixed at the source; the comment now carries
this objection so the function cannot mis-sell itself again.

**Also rejected: the sleight in its own rationale.** It claimed `corrupt()` was
"already theory-safe (real string, never invented)". Not inventing text passes the
LICENSING audit. It says nothing about whether the depiction is TRUE. Two
different audits; the proposal borrowed the passed one to skip the failed one.

**Salvaged:** `corrupt()` has one honest home — **OCR damage on scanned-book
salvage** (idea 4). Character garbage is exactly what scanning really produces.

### ⚠️ 2. Model card — **SHIP, with corrections**

Real artifact (Mitchell et al., FAT\* 2019), correctly attributed. But the
rationale here was **false**: the paper's central proposal is *disaggregated
evaluation* — reporting broken out by subgroup precisely so unflattering numbers
cannot hide. Evasion is bad industry *practice*, not a property of the artifact.
Satirise the practice; do not misdescribe the standard.

Ship three-of-nine sections as a labelled simplification, and **add Intended Use
and Caveats & Limitations** — both structural fields, no prose, and the two whose
*emptiness* is the truest satire available. **Blocked on** a GLOSSARY row for
"model card".

### ⚠️ 3. Per-category evaluation — **SHIP, recaptioned**

Grouping by lexname is legitimate (per-supersense scoring is real practice). Two
fixes:

- **Exclude `noun.Tops`.** It is structural, not semantic — the set of unique
  beginners — and would read ~100% forever beside real categories.
- **Do not caption it as tail loss.** SIMPLIFICATIONS S8 says the shipped slice
  is breadth-first from `entity`, so it **is** the head and has no rare tail to
  lose. `noun.plant` reading low is the curator's selection showing through — it
  has **11 concepts in it**. Captioning a curation artifact as distributional loss
  teaches a false causal story. Denominators are within the shipped slice, and
  said to be.

### ✅ 4. Real corpora — **SAFE.** Generic type, never the brand — right for theory
and licensing both. Wants a glossary row for corpus/training distribution.

### ❌→⚠️ 5. "Edges it is unsure about" — **FALSE as worded, fixed by one word**

There is no uncertainty estimate in this codebase — a grep for
`confidence|uncertain|probab` finds nothing in `src/`. There is `mulberry32`.
Calling RNG output "unsure" asserts a self-estimate of correctness, and implies
it is **well-calibrated** — the property real extraction models notably lack.
This is not a simplification of a real thing, so it is not labellable.

**Fix: call it an *unverified proposal*.** Literally true, maps onto the
`unverified` provenance already in `types.ts`, needs no new machinery, and the
entire mechanic survives. Only the word dies.

### ⚠️ 6. Concepts die visibly — **SHIP, minus one clause**

Strip "the label corrupts" and it inherits none of idea 1's fault. What remains is
a **correct** depiction of early collapse, because real collapse is things not
being there. Say that loudly: **absence is the mechanism.**
Separate flag: DECISIONS logs "collapse is SOFT ROT… nothing is deleted". "Then
it goes" is deletion and needs its own entry before it ships.

### ✅ 7. `entity` never rots — **SAFE.** Also pedantically correct: `entity.n.01`
is WordNet's unique beginner.

### ✅ 8. Away report — **SAFE.** One caution: it must say *source agreement*, never
"accuracy" — S15 is explicit that fidelity is verification coverage and a lower
bound on accuracy, not accuracy.

---

## Verdicts — genre review, 2026-07-26

Second reviewer, different axis: does it play like a real idle game, and is the
AI theme earned. It **agreed with none of the theory review's rankings** and
disagreed with this file's own. Where the two conflicted, source was checked;
findings below are marked ✔ verified or ✘ overstated.

### The ranking was upside down

- **Idea 8 (away report)** — **best of the eight**; this file ranked it last.
  The away moment is the most-read screen in the genre and here it is a 2200ms
  toast that then nulls its own data. It also cannot report "what it cost in
  agreement" as proposed, because **nothing rots while away**. What it *can*
  report, and what is actually interesting, is the **supervision split** —
  `pendingClean` vs `pending`: what the machines did unwatched.
- **Idea 1 (labels rot)** — already killed on theory; killed twice over on
  craft. ✔ **Verified in source:** `corrupt()` is **not monotone in
  `strength`** — a surviving character consumes one `next()`, a corrupted one
  consumes two (`ontology.ts:55-56`), so the RNG stream desynchronises and
  raising `strength` slightly re-rolls *which* characters break. Driven from a
  render loop it would **strobe**. The proposed call was also
  `corrupt(label, id, 1 - fidelity)` — a **global** scalar, i.e. `isRotted()`
  with extra glyphs, carrying no per-concept information at all.
- **Idea 7 (`entity` never rots)** — ✔ **verified already shipped, twice**:
  `board.ts:131` (`id === 0` returns false) and the eviction loop starting at
  `i = 1`, so the root can never be folded either. Not an idea. **KILLED as
  redundant.**
- **Idea 4 (real corpora)** — **KILL**, seconded. It adds three strings and is
  empty against the shipped slice, which S8 says *is* the head.
- **Idea 3 (per-category)** — ship, and its "cost: a grouping over data already
  loaded" line is **false**. `foldedNodes` is an identity-free `Decimal`; by
  ~60min ≥79% of coverage has no identity to group *by*. This idea is the
  forcing function for the HARD CONSTRAINT already logged in ECONOMY.md.
- **Idea 5 (proposals)** — ship, with two non-negotiables: an ignored proposal
  must **auto-resolve at the slider default** (otherwise it is an attention tax
  and breaks the HITL guardrail), and it must not become a **second desk**.
- **Idea 6 (concepts die)** — ship, minus "then it goes" (VISION: concepts go
  dark, never off the board). Additional catch: **eviction/folding already
  removes concepts from the board and means the OPPOSITE — success.** Death and
  banking must not look alike.
- **Idea 2 (model card)** — ship, but it must **not** be where the second number
  debuts; that re-opens the late-reveal hole ECONOMY.md closed. Blocked anyway:
  checkpoints do not exist yet.

### The finding that mattered

Ideas 1, 3 and 6 are blocked on **the same missing thing**: per-concept identity
in the recovered set. Everything expressive is waiting on one small data
structure — see batch 2, item 1.

And the surfaces with the highest reach are **already specified and still
empty**:

- ✔ **`FieldNote` is worse than "missing".** It is a fully-specified interface
  at `types.ts:296-304` with **zero references anywhere in `src/`** — declared,
  never populated, never rendered. SIMPLIFICATIONS.md specifies 15 rows and the
  house rule says each must be surfaced before its mechanic ships; S9–S15 have
  all shipped. **The game is in standing violation of its own accuracy rule.**
- ✘ **"The gloss is never shown" — overstated.** It *is* rendered, at
  `App.svelte:690`. But only at the review desk, where it is the instrument you
  read to catch a corrupt item — a chore. It was never the reward for recovery,
  and there was no tap-to-inspect. **Fixed in this batch** (batch 2, item 2).
- `OWNER_LINES = {}`. Still eight sentences from solving the tone problem.

Stated bluntly, and worth keeping because it is fair: proposing a ninth
mechanism is easier than writing the eight sentences, and this batch did the
easy thing.

---

## Batch 2 — informed by both reviews

Three items. Two are unblocks, not inventions, because that is what the reviews
said the project needs. Ranked by what they release downstream.

### 1. The category histogram — **the unblock**

`state.coverage` is `Record<DomainId, number>` holding exactly one key,
`{ general: 0 }`. `foldedNodes` is a bare `Decimal`. Between them the game
knows *how much* it has recovered and **nothing about what**.

**Proposal:** count recovered concepts **per WordNet lexname** — 26 integers,
incremented where concepts are already banked and folded. Additive save
migration, no new content, no prose.

This single structure is what ideas 3, 6 and the model card's disaggregated
section are all waiting on. It is also the only honest way to render the
second number, because "which part of the world you lost" is not derivable from
a scalar. **Do this before any of the three ship.**

- **Caveat that must ship with it:** denominators are *within the shipped
  slice*, and must be said to be. Per the theory review, a low `noun.plant` is
  **the curator's selection showing through** (11 concepts exist), not
  distributional loss. Exclude `noun.Tops` — structural, would read ~100%
  forever.

### 2. Tap a concept, read its definition — **shipped in this batch**

The one item here that needed no new state, no prose, and no owner decision, so
it was built rather than proposed.

A press that travels less than 8 screen px is a tap rather than a drag; it opens
a non-modal card over the board with the concept's label, category and its
**WordNet gloss, verbatim**. Tapping the void dismisses it. Dragging is
untouched — a tap is just a drag that went nowhere.

- **Reach:** 100%, zero gating.
- **Why it is not a prose violation:** every sentence is WordNet's, verbatim,
  CC BY 4.0, already credited in the dock. It is data.
- **Why it matters:** DECISIONS records that definitions are the reward for
  recovery. The reward existed in the codebase and was only ever shown at the
  desk, attached to a chore. Now the thing you recovered says what it means.

### 3. The away report is the shift handover — **promoted to top of queue**

Adopted from idea 8 with the reviewer's correction. Not "what it cost in
agreement" (nothing rots while away) but **the supervision split**: how much the
machines minted, and how much of it nobody watched (`pendingClean` vs
`pending`). That is a real number the game already tracks, it is exactly the
feeling the away screen should produce, and it is the most-read surface in the
genre currently spending 2200ms on a toast before nulling itself.

- **Blocked on prose** (one owner sentence), not on mechanism.

### Deliberately NOT proposed

No fourth mechanism. The two highest-reach surfaces in the project — the Field
Notes codex and the eight `nodes:*` ticker lines — are specified, wired, and
empty. Adding a ninth idea in front of them would repeat exactly the mistake
both reviews named.

**Field Notes is the one that is not merely unwritten but a rule violation**, and
it needs an owner call before it can be built: its `oneLineTruth` column is
player-facing prose, and the 15 candidate lines currently live in
SIMPLIFICATIONS.md as documentation. Either the owner adopts those lines as
authored, or writes them fresh. **The surface cannot ship until that is
decided** — building an empty codex would be shipping the violation with a UI on
top.

---

## The pattern worth keeping

**This batch systematically rendered degradation as visible damage TO an item,
when real collapse is ABSENCE.** Ideas 1, 6 and 3's caption all pushed the same
false picture. One sentence, already in this repo's own source, kills the whole
class:

> Degraded concepts lose their edges, their weight, and eventually themselves.
> **They never lose their spelling.**
