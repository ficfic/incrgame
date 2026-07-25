// Declarative content — tune balance by editing data, never engine code.
// Numbers from docs/ECONOMY_MODEL.md (borrowed Cookie Clicker curve, 1.15 ratio).
// M1 ships the Harvester only; Extractor/Reasoner/etc unlock the roster at M3+.
import type { Generator, GeneratorId } from '../core/types';

export const GENERATORS: Record<GeneratorId, Generator> = {
  // One-substance era: the pipeline both costs and produces Datums —
  // buying trims the web, the machine regrows it faster. At M3 the chain
  // deepens: Extractors refine Datums into Triples (the refined tier).
  harvester: {
    id: 'harvester',
    label: 'Ingestion Pipeline™',
    baseCost: '15',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '0.1',
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
  orchestrator: {
    id: 'orchestrator',
    label: 'Orchestrator',
    baseCost: '600',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '0.25',
    produces: 'triples',
  },
};

/** Which generators the UI offers in the vertical slice. Each one is a distinct
 *  position on the speed-versus-truth dial, which is why all four ship: fuel,
 *  speed, trust, and the thing that converts trust back into the world. */
export const M1_ROSTER: GeneratorId[] = ['harvester', 'extractor', 'orchestrator', 'reasoner'];
