# ECONOMY — SOLID · RAW · ROT

**Status: recommended, not accepted.** Produced 2026-07-27 by an 11-agent
review (2 diagnoses, 5 clean-sheet proposals, 3 judges, 1 synthesis) after the
owner said: *"i'm so confused with the names of things and progression… i think
we need to reset the entire economy."* Second time — they called it convoluted
on 2026-07-26 and `MODEL.md` was written to fix it and did not.

**Supersedes on acceptance:** `ECONOMY.md`, `ECONOMY_MODEL.md`, `MODEL.md`.

## What the diagnosis actually found

The model is not the problem. The **names** are. Cited findings:

- `checked` names four things: a HUD ratio, a currency on machine buttons, a
  boolean on `Edge`, and the result of tapping a dotted line — two of which move
  the displayed fraction in opposite directions.
- **`Extract` and `Extractor` mean opposite things about truth.** The player
  verb proposes only real relations (`salvage.ts:103`, `fake: false`); the
  machine draws only invented ones (`engine.ts:834`, `fake: true`).
- `recovered` adds a countable inventory to an anonymous fractional integral
  (`lit(state) + foldedNodes`), so the player cannot tell which part moved.
- **The HUD never calls `readouts.ts`.** The single-source rule is
  architecturally present and functionally bypassed — the only `READOUTS.` use
  in `src/ui` picks a CSS hue. `check-vocabulary.mjs` polices one retired field
  and nothing about names, which is why "one word, one quantity" reads as
  enforced and is not.
- The Reasoner produces concepts in code, edges in `GLOSSARY.md`, and
  `entities` in its content declaration. Three sources, three answers.

## ⚠️ The landmine, verified by hand

    REFLECT_MIN_CONCEPTS = 820          prestige gate, engine.ts:178
    concepts reachable via lanes = 106  measured from story.json

820 is reachable today via the discover button. **The moment lanes replace that
button, prestige becomes mathematically unreachable.** (The synthesis says 411;
the measured figure is 106. Both are far below 820.)

## ⚠️ This deletes Attention entirely

Which kills `NEXT.md` item 1, in flight in the engine session. Owner's call
before a line is written.

---

*Everything below is the synthesis verbatim.*

---

## 1. THE PICK

**SOLID · RAW · ROT**, with four grafts and three amputations.

**Why:** it is the only proposal whose join actually forces the two halves together — *machine output is capped by how many words you know, and walking a lane is the only way to learn one* — and it is the only one that is one session's work rather than an engine rewrite, which is this repo's recorded failure mode.

Honest caveat: it is the *least* clean-sheet of the five. It deletes the ladder and the verbs, but keeps the differential equations under the hood (drift, inheritance, ratchet). If you want the sim rebuilt too, reject this now, not in three days.

**First, the thing all five proposals got wrong.** I read the files:

| claimed | actual |
|---|---|
| 93 beats, 327 choices | **27 beats, 105 choices, 64 gated** |
| depth to 16 | **depth caps at 5** — `build-story.mjs:60` says only 125 of 334 spine concepts have ids |
| lane world | **~411 reachable concepts**, not 4096 |
| `REFLECT_MIN_CONCEPTS = 820` | **unreachable.** This is the progression bug you are feeling and cannot name. |

Every depth-indexed cost curve in the packet is dead on arrival. This design indexes on **concepts learned**, which is intact.

## 2. THE GRAFTS

| graft | from | why it earns its place |
|---|---|---|
| Cost indexed on concepts-this-run, never depth | chad's audit | depth caps at 5; the exponent evaporates otherwise |
| Check has **no cooldown**, banked queue | SOLID GROUND | a 25s booking on the optimal lever *is* an attention tax. Manual checking converts a fixed amount per tap against exponential production — it falls behind by construction. That is "review is the only brake and it is slow", with no clock |
| Five-word `explain` field, **linted**; no `$game.` in `src/ui` | SOLID GROUND / LEXICON | makes your test a build failure instead of a good intention. Prove red by inlining one count |
| Goal line with a real denominator + next milestone | LEXICON | `Words 187 / 411 · next step 46 solid · Retrain at 120` |

**Rejected on purpose:** tap-to-highlight (needs board objects; Solid/Raw/Rot are masses — it would be a lie). Hypernym-vagueness renderer (best idea in the packet, but it is a *second* failure visual on top of the conlang words — queue it, do not ship it with this).

**Amputations from SRR itself:** Attention (deleted entirely — see §5), Watch-slot dragging (replaced by a toggle on each machine card), and REDRIFT (deleted: it made Solid fall for two unrelated reasons, and verified data does not spontaneously un-verify — an unlabelled simplification live at `engine.ts:787`).

## 3. THE RESOURCE TABLE

Four rows. Three of them are one substance in three states, drawn as **one stacked bar**, so the screen holds two objects.

| on screen | five words | up | down |
|---|---|---|---|
| **Words** | concepts you can read now | arriving at a lane stop | never |
| **Solid** | checked facts that never rot | watched machines, Check, Reasoner | spent on a step or a machine |
| **Raw** | machine facts nobody has checked | loose machines, away pile | rots, or gets checked |
| **Rot** | facts worn out, permanently | Raw decaying | only Retrain |

Rows past four: **none.** Generation is a badge, not a number. Machine counts are inventory on a card. No fractions anywhere except `Words 187 / 411`, which has a real denominator.

## 4. THE LANE JOIN

Both directions, and neither half works alone.

**Down:** `stepCost = 0` if you already know the concept (free revisits — this is what makes Retrain a sprint). Otherwise `ceil(6 × 1.04^(new concepts this run))`. Solid has exactly one other sink, so essentially all idle output is spent on story.

**Up:** `factsPerSecond = min(0.4 × machines, 0.15 × Words)`. You cannot extract relations about entities you do not hold. The HUD states the bottleneck in words: *"your 30 Extractors could make 12.0/s — your vocabulary supports 4.5/s."* An idle-only player flatlines in ten minutes and can read exactly why. Walking is the only income upgrade in the game.

(Judge 2 is right that 0.8 stops binding by Words≈20. 0.15, then probe.)

**Two clocks:** economy banks while away and never rots; the lane halts at a beat. **Idle guard:** if a beat is pending and you have been away >4h, the ungated continue auto-resolves, so the cap is never a handbrake on the bank.

## 5. WHAT GETS DELETED

- **The ladder, all six rungs:** `data`, `entities`, `taxonomies`, `ontologies`, `twins`, `capital`, `TIER_LADDER`, `ratePerSecond` (returns `'0'` unconditionally), `RESOURCE_LABELS`, `produces`/`costResource`.
- **Attention, entirely:** `attentionCap`, `attentionFree`, bookings, the supervision dial, `state.attention`. **This kills NEXT item 1 — your call, before a line is written.** Speed-vs-truth becomes one toggle per machine card: *watched* (0.55×, makes Solid) or *loose* (1.0×, makes Raw).
- **Verbs:** discover, extract, connect, claimNode, growContext, survey, salvage, reviewBatch. Four remain: **Walk, Check, Buy, Retrain.**
- **The context window:** anchors/dark, `ANCHOR_CAP`, the ring, `foldedNodes`.
- **Nouns:** statements, checked, agreeing, recovered, lines, context, banked, drifted, yield, coverage, fidelity, confirmed, passages, tokens, Datums.
- **REDRIFT** (`engine.ts:787`).
- **Machines:** harvester, aiAgent, orchestrator. Keep Extractor + Reasoner, add Checker.
- **`reflect` / `reflection` / "Reflect"** → one word, **Retrain**, in the action, the field, the button, the glossary.
- **Docs deleted, not banner-flagged:** `ECONOMY.md`, `ECONOMY_MODEL.md`, `MODEL.md`. `GLOSSARY.md` loses its "in-game as" claims for Triple/Entities/Taxonomies/Twins (they stay as reference rows) + one DECISIONS line.
- `REFLECT_MIN_CONCEPTS = 820` → a stated, reachable number.

## 6. THE MIGRATION

**Yes, this resets saves.** Authorised by DECISIONS 2026-07-27, and it must be stated in the commit message — a silent reset is still a defect.

One kindness, cheap: seed `Words` from the concepts already on your board. Everything else starts at zero. `version` → 16; a v≤15 save loads as a fresh state with a one-line notice. Export/import must work on the new shape *before* anything ships.

## 7. THE ONE BIGGEST RISK

**Not the economy. The content ceiling.**

27 beats, all at depth 1–5, and the upper tree is shared across all 26 lanes — walking your second lane shows you maybe two beats you have not seen. You exhaust every decision in the game in roughly **8–12 partial lane walks, call it 90 minutes.** The remaining ~380 lane steps carry zero choices. A perfect economy still leaves hours 2–15 as a corridor with a buy button.

**What proves it early, before any engine code:** a 30-line script that walks all 26 lanes and counts *unique beats reachable*. If it returns 27, the very next item after this one is **beats generated at concept granularity** (5 frames × 411 concepts), not more balance.

Fixing the names without fixing that gets you a legible ninety minutes.