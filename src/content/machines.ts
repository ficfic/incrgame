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
  // ⚠️ THE CODE DOES NOT GIVE IT THAT EXEMPTION, and this comment used to say
  // it did — "a fact machine that pays no watching penalty, 2.2/s of Solid
  // where a watched Extractor gives 0.22", which was also the argument for its
  // price. `reasoner` is in FACT_MACHINES and `throughput` applies WATCHED_RATE
  // to every id in there, so it delivers 1.21/s watched, like everything else.
  // Corrected rather than repriced: exempting it would leave the watched/loose
  // toggle on its card doing nothing, and that card is the screen session's
  // file. One line on the backlog, not a change made in passing.
  reasoner: {
    id: 'reasoner',
    label: 'Reasoner',
    rate: 2.2,
    baseCost: '320',
    costRatio: 1.18,
  },
  // THE REVIEW BUYOUT (CLAUDE.md: manual review is never mandatory). It makes
  // nothing; `rate` is Raw CONVERTED into Solid per second. Deliberately slower
  // per unit cost than watching a machine in the first place, so checking after
  // the fact stays the expensive way to arrive at a checked fact — but it does
  // scale, and it runs while you are away, so an idle player is never required
  // to sit and tap.
  checker: {
    id: 'checker',
    label: 'Checker',
    rate: 0.25,
    baseCost: '45',
    costRatio: 1.16,
  },
};
