// Declarative content — tune balance by editing data, never engine code.
// Numbers from docs/ECONOMY_MODEL.md (borrowed Cookie Clicker curve, 1.15 ratio).
// M1 ships the Harvester only; Extractor/Reasoner/etc unlock the roster at M3+.
import type { Generator, GeneratorId } from '../core/types';

export const GENERATORS: Record<GeneratorId, Generator> = {
  // One-substance era (M1.6): the pipeline both costs and produces Triples —
  // buying trims the web, the machine regrows it faster. At M3 the chain
  // deepens: harvesters gather raw Datums, Extractors refine them to Triples.
  harvester: {
    id: 'harvester',
    label: 'Ingestion Pipeline™',
    baseCost: '15',
    costRatio: 1.15,
    costResource: 'triples',
    baseRate: '0.1',
    produces: 'triples',
  },
  extractor: {
    id: 'extractor',
    label: 'Extractor',
    baseCost: '100',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '1',
    produces: 'triples',
  },
  reasoner: {
    id: 'reasoner',
    label: 'Reasoner',
    baseCost: '1100',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '8',
    produces: 'triples',
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
  orchestrator: {
    id: 'orchestrator',
    label: 'Orchestrator',
    baseCost: '130000',
    costRatio: 1.15,
    costResource: 'data',
    baseRate: '260',
    produces: 'triples',
  },
};

/** Which generators the M1 UI actually offers (thin slice — bouncer's orders). */
export const M1_ROSTER: GeneratorId[] = ['harvester'];
