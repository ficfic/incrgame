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
  extractor: {
    id: 'extractor',
    label: 'Extractor',
    rate: 0.4,
    baseCost: '20',
    costRatio: 1.15,
  },
  // Subsumption reasoning: it derives facts that follow from what you already
  // hold, so its output is sound by construction and needs no checking. In
  // exchange it is expensive. Mechanically it is a fact machine that pays no
  // watching penalty — 2.2/s of Solid where a watched Extractor gives 0.22 —
  // which is why it is priced at sixteen Extractors rather than five.
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
