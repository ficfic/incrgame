// THE MACHINE ROSTER. Declarative content — tune balance here, never in the
// engine.
//
// Three machines. It was five: `harvester` produced Datums, a currency deleted
// two economies ago; `aiAgent` was an Extractor with a bigger number on it; and
// `orchestrator` bought review automatically, which is what the Checker does
// under a name that says so (docs/ECONOMY_SRR.md §5).
//
// ---- HOW THESE NUMBERS RELATE TO EACH OTHER -----------------------------
//
// `rate` is facts per second per unit at FULL SPEED. A watched machine runs at
// WATCHED_RATE (0.55×) of it and everything it makes arrives Solid; a loose one
// runs at full and everything it makes arrives Raw. So Solid always costs more
// per fact than Raw — that gap IS the game's only real decision, and it is one
// toggle rather than an allocation puzzle.
//
// Every price is in SOLID. There is no second currency and no cost ladder: you
// spend the same substance on a step of the story and on a machine, which is
// what makes "walk further or build wider" a question worth asking.
import type { Machine, MachineId } from '../core/types';

export const MACHINES: Record<MachineId, Machine> = {
  // Information extraction. The cheap volume machine, and the one that carries
  // the toggle the whole game is about.
  //
  // ⚠️ THIS RATE IS WHICH SIDE OF THE JOIN BINDS. `rate / WORDS_PER_FACT` is
  // how many Words one machine can feed: at 0.4 that was 2.7, so the single
  // Extractor a run opens with was overtaken at Words 3 — about fifteen
  // seconds — and from there walking bought no income at all while machines
  // did. Measured headless to the first Retrain, buying a machine only when
  // the machines bind:
  //
  //     rate 0.4   word-bound  0% of the run · 26 machines · W120 at 131m
  //     rate 0.8   word-bound 45% of the run · 23 machines · W120 at  64m
  //     rate 1.2   word-bound 74% of the run · 15 machines · W120 at  50m
  //
  // At 1.2 one machine covers eight Words, so the cheap way to raise the
  // ceiling is a machine and the ONLY way to raise the floor under it is to
  // walk — which is the sentence the whole design rests on. It also shortens
  // the first run: the Solid that used to go into 26 machines goes into steps
  // instead. If the owner wants the longer arc back, the lever is
  // RETRAIN_MIN_WORDS or STEP_RATIO, never this ratio.
  extractor: {
    id: 'extractor',
    label: 'Extractor',
    rate: 1.2,
    baseCost: '20',
    costRatio: 1.15,
  },
  // Subsumption reasoning: it derives facts that follow from what you already
  // hold, so in theory its output is sound by construction and needs no
  // checking. In exchange it is expensive.
  //
  // ⚠️ IT NOW HAS THAT EXEMPTION IN CODE, and for eight days it did not: it was
  // in FACT_MACHINES, `throughput` charged WATCHED_RATE to every id in there,
  // and it delivered 1.21/s watched like everything else while GLOSSARY.md,
  // HANDOVER.md and this comment all said "always Solid". The glossary wins
  // (CLAUDE.md) — entailment is monotonic and the closure is finite, so there
  // is nothing in a derived fact to review.
  //
  // MEASURED BEFORE CHANGING IT, because a free upgrade is its own defect. To
  // the Retrain gate, buying only this machine: 261 minutes unexempt, 243
  // exempt, against 47 for Extractors. Sixteen Extractors' price for 1.8× the
  // rate is a trap either way and the vocabulary cap binds regardless, so the
  // exemption costs the balance nothing. What it does cost is the toggle on
  // this card, which is now absent rather than inert (`WATCHED_MACHINES`).
  // REPRICING IT INTO A REAL CHOICE IS A SEPARATE ITEM — it is on the backlog,
  // it is not this one.
  reasoner: {
    id: 'reasoner',
    label: 'Reasoner',
    rate: 2.2,
    baseCost: '320',
    costRatio: 1.18,
  },
  // THE REVIEW BUYOUT (CLAUDE.md: manual review is never mandatory). It makes
  // nothing, so `rate` is 0; `checks` is the SHARE of the Raw pile one unit
  // looks at per second, and it runs while you are away.
  //
  // ⚠️ IT USED TO CONVERT 0.25 FACTS PER SECOND, FLAT, AND THAT IS WHY LOOSE
  // WAS NEVER THE RIGHT ANSWER. Loose output is bounded by the vocabulary cap,
  // which is 18/s at the Retrain gate, so keeping up took 72 Checkers — about
  // 12 MILLION Solid on a 1.16 ladder, against ~950 for the Extractors that
  // made the Raw. Watched therefore won at every point on the curve, Rot stayed
  // near zero, and the scoreboard the game is about never moved. The same flat
  // rate is why a Retrain's inheritance evaporated: 25% of what you minted
  // arrives as one big pile of Raw, and 0.25/s cannot eat a pile.
  //
  // A SHARE fixes both, because a share of a big pile is a big number. At the
  // Retrain gate, where the vocabulary cap is 18/s and every machine is loose:
  //
  //     Checkers   spent    steady pile   of what it makes:  Solid/s   Rot/s
  //     0             0         9,000                            0.0    18.0
  //     1            90         4,500                            9.0     9.0
  //     2           196         3,000                           12.0     6.0
  //     4           469         1,800                           14.4     3.6
  //     8         1,380         1,000                           16.0     2.0
  //
  // against 9.9 Solid/s and no Rot at all for the same machines watched. So
  // WATCHED IS STILL RIGHT UNTIL THE SECOND CHECKER — one is worse than
  // watching, which is the point: the buyout has to be bought. After that loose
  // is worth more Solid and always costs Rot, so the two sides point in
  // different directions at every point on the curve, which is what "the only
  // real decision" was supposed to mean.
  //
  // And it gets harder to hold. Rot runs at ROT_BASE × (1 + 3 × syntheticShare),
  // so generation 1 needs four Checkers to beat watching and generation 2 needs
  // seven — the ratchet VISION asks for, paid in the machine that exists to
  // undo it. The trap is intact and sharper: the cap grows every time you walk,
  // your Checkers do not, and the pile on screen is how far behind they are.
  checker: {
    id: 'checker',
    label: 'Checker',
    rate: 0,
    checks: 0.002,
    baseCost: '90',
    costRatio: 1.18,
  },
};
