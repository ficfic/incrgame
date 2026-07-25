// Display metadata for resources. Labels only — mechanics live in the engine.
import type { ResourceId } from '../core/types';

// "Datums" — owner-chosen (2026-07-25): the pedantic-ontologist joke.
// Internal ResourceId stays 'data' (ids are save-stable; labels are display-only).
export const RESOURCE_LABELS: Record<ResourceId, string> = {
  data: 'Datums',
  triples: 'Triples',
  entities: 'Entities',
  taxonomies: 'Taxonomies',
  ontologies: 'Ontologies',
  twins: 'Twins',
  capital: '$',
};
