// Display metadata for resources. Labels only — mechanics live in the engine.
import type { ResourceId } from '../core/types';

export const RESOURCE_LABELS: Record<ResourceId, string> = {
  data: 'Data',
  triples: 'Triples',
  entities: 'Entities',
  taxonomies: 'Taxonomies',
  ontologies: 'Ontologies',
  twins: 'Twins',
  capital: '$',
};
