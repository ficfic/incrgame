// Declarative content — tune balance by editing data, never engine code.
// Numbers from docs/ECONOMY_MODEL.md (borrowed Cookie Clicker curve, 1.15 ratio).
// M1 ships the Harvester only; Extractor/Reasoner/etc unlock the roster at M3+.
import type { Generator, GeneratorId } from '../core/types';

export const GENERATORS: Record<GeneratorId, Generator> = {
  // One-substance era: the pipeline both costs and produces Datums —
  // buying trims the web, the machine regrows it faster. At M3 the chain
  // deepens: Extractors refine Datums into Triples (the refined tier).
  // The only income that does NOT come from statements — so a graph rotted to
  // nothing still has a floor to climb out from. Otherwise it was strictly
  // dominated by hand-claiming at every point in the game.
  // ★ LABEL IS PRE-PIVOT STARTUP SATIRE AND NEEDS OWNER REWRITE (BACKLOG).
  harvester: {
    id: 'harvester',
    label: 'Ingestion Pipeline™',
    baseCost: '15',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '0.35',
    produces: 'data',
  },
  // Information extraction — mints statements fast, and everything it mints
  // arrives UNVERIFIED. This is the speed side of the game's only real dial.
  extractor: {
    id: 'extractor',
    label: 'Extractor',
    baseCost: '60',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '0.4',
    produces: 'triples',
    // volume machine: cheap to start, and the ratio is what stops you owning ten
    agentBase: '40',
    agentRatio: 1.30,
  },
  // Subsumption reasoning — turns trusted statements back into recovered
  // concepts. Its rate is multiplied by FIDELITY, so rot stalls it.
  reasoner: {
    id: 'reasoner',
    label: 'Reasoner',
    baseCost: '250',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '0.05',
    produces: 'entities',
    // The machine that actually wins the run, so it is not priced identically to
    // the one that only makes volume. Steeper too: recovery is the scarce thing,
    // and buying your way out of the fidelity gate should stay expensive.
    agentBase: '90',
    agentRatio: 1.32,
  },
  aiAgent: {
    id: 'aiAgent',
    label: 'AI Agent',
    baseCost: '12000',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '47',
    produces: 'triples',
  },
  // The HITL buyout (CLAUDE.md: review must never be mandatory). Orchestrators
  // check statements automatically. They are deliberately worse per Datum than
  // a human doing it by hand — manual review stays a lever for tryhards, never
  // an attention tax.
  // Rate parity with extraction, and cheaper, DELIBERATELY: at 0.25/s against
  // an Extractor's 0.4/s the buyout had a hard structural ceiling near 62%
  // fidelity that no amount of money could beat. That is not "a worse
  // quality/cost tradeoff" (CLAUDE.md), it is a tax on not paying attention.
  orchestrator: {
    id: 'orchestrator',
    label: 'Orchestrator',
    baseCost: '300',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '0.4',
    produces: 'triples',
  },
};

/** Two agents, because the attention economy retired the other two.
 *
 *  The Harvester made Datums, and Datums no longer exist. The Orchestrator
 *  bought review automatically — and supervision replaced it: pointing a slot
 *  at an agent IS the automated review, so a separate machine for it was the
 *  same idea charged for twice. Both stay in GENERATORS (save shape never
 *  shrinks) and both are simply off the board. */
export const M1_ROSTER: GeneratorId[] = ['extractor', 'reasoner'];
