// Guards the ontology contract (docs/SPEC.md "Concept data"). These assertions
// exist because the recovery order is SAVE-VISIBLE: node id N means concept
// index N. If a regeneration silently renumbers the world, the owner's save
// starts lying about what it contains — this test fails first instead.
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '../public/ontology');
const read = <T>(name: string): T => JSON.parse(readFileSync(join(DIR, name), 'utf8')) as T;
const chunkName = (i: number): string => `c${String(i).padStart(3, '0')}.json`;

interface Manifest {
  source: string; edition: string; license: string; attribution: string;
  concepts: number; chunkSize: number; chunks: number; domains: string[];
}
interface Chunk { l: string[]; d: number[]; p: number[]; g: string[] }

const manifest = read<Manifest>('index.json');

describe('ontology manifest', () => {
  it('is the pinned Open English WordNet edition', () => {
    expect(manifest.source).toBe('Open English WordNet');
    expect(manifest.edition).toBe('2025-edition');
  });

  it('carries the licence and attribution the in-game credit renders from', () => {
    expect(manifest.license).toBe('CC BY 4.0');
    expect(manifest.attribution).toMatch(/Princeton WordNet/);
  });

  it('has the frozen concept count and 45 semantic domains', () => {
    // Changing either number means the world was renumbered — see SPEC.
    expect(manifest.concepts).toBe(107519);
    expect(manifest.domains).toHaveLength(45);
  });

  it('declares enough chunks to hold every concept', () => {
    expect(manifest.chunks).toBe(Math.ceil(manifest.concepts / manifest.chunkSize));
  });
});

describe('ontology chunks', () => {
  it('all exist', () => {
    for (let i = 0; i < manifest.chunks; i++) {
      expect(existsSync(join(DIR, chunkName(i))), chunkName(i)).toBe(true);
    }
  });

  it('starts the recovery order at `entity`, the root of the noun hierarchy', () => {
    const c = read<Chunk>(chunkName(0));
    expect(c.l[0]).toBe('entity');
    expect(c.p[0]).toBe(-1); // a root: recovered through nothing
    expect(c.g[0]).toMatch(/^that which is perceived or known or inferred/);
    expect(manifest.domains[c.d[0]!]).toBe('noun.Tops');
  });

  it('keeps arrays aligned and every concept labelled', () => {
    for (let i = 0; i < manifest.chunks; i++) {
      const c = read<Chunk>(chunkName(i));
      const n = c.l.length;
      expect(c.d).toHaveLength(n);
      expect(c.p).toHaveLength(n);
      expect(c.g).toHaveLength(n);
      expect(c.l.every((label) => typeof label === 'string' && label.length > 0)).toBe(true);
      expect(c.d.every((d) => d >= 0 && d < manifest.domains.length)).toBe(true);
    }
  });

  it('holds exactly `concepts` entries in total', () => {
    let total = 0;
    for (let i = 0; i < manifest.chunks; i++) total += read<Chunk>(chunkName(i)).l.length;
    expect(total).toBe(manifest.concepts);
  });

  it('only ever points backwards — a concept is recovered through one already recovered', () => {
    // The breadth-first order guarantees parent index < own index. This is what
    // makes "you rebuild outward from what you have" true rather than decorative.
    for (let i = 0; i < manifest.chunks; i++) {
      const c = read<Chunk>(chunkName(i));
      const base = i * manifest.chunkSize;
      c.p.forEach((parent, j) => {
        if (parent === -1) return;
        expect(parent, `chunk ${i} entry ${j}`).toBeLessThan(base + j);
        expect(parent).toBeGreaterThanOrEqual(0);
      });
    }
  });
});
