// Guards the ontology contract (docs/SPEC.md "Concept data"). These assertions
// exist because the recovery order is SAVE-VISIBLE: node id N means concept
// index N. If a regeneration silently renumbers the world, the owner's save
// starts lying about what it contains — this test fails first instead.
import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONCEPT_BUDGET } from '../src/content/ontologyMeta';

const DIR = join(import.meta.dirname, '../public/ontology');
const read = <T>(name: string): T => JSON.parse(readFileSync(join(DIR, name), 'utf8')) as T;
const chunkName = (i: number): string => `c${String(i).padStart(3, '0')}.json`;

interface Manifest {
  source: string; edition: string; commit: string; license: string; licenseUrl: string;
  attribution: string; noticeUrl: string;
  concepts: number; chunkSize: number; chunks: number; categories: string[];
  relations?: number; relationsUrl?: string;
}
interface Chunk { l: string[]; d: number[]; p: number[]; g: string[] }

const manifest = read<Manifest>('index.json');
const allChunks = (): Chunk[] =>
  Array.from({ length: manifest.chunks }, (_, i) => read<Chunk>(chunkName(i)));

describe('ontology manifest', () => {
  it('is the pinned Open English WordNet edition, at the pinned commit', () => {
    expect(manifest.source).toBe('Open English WordNet');
    expect(manifest.edition).toBe('2025-edition');
    // The only assertion that actually freezes the world: an edition tag can be
    // moved, a commit cannot.
    expect(manifest.commit).toBe('dc343f2683279ecbb13fab4e2fd778d7b162d287');
  });

  it('carries everything CC BY 4.0 §3(a)(1) needs the credit to show', () => {
    expect(manifest.license).toBe('CC BY 4.0');
    expect(manifest.licenseUrl).toMatch(/creativecommons\.org\/licenses\/by\/4\.0/);
    expect(manifest.attribution).toMatch(/Princeton WordNet/); // both parties, not one
    expect(manifest.attribution).toMatch(/Open English WordNet/);
    expect(manifest.noticeUrl).toBe('ontology/LICENSE.txt');
  });

  it('ships the licence notice WITH the data, not only in docs/', () => {
    // docs/ is never deployed; dist/ontology/ is. The WordNet licence requires
    // the notice to travel with all copies of the database.
    expect(existsSync(join(DIR, 'LICENSE.txt'))).toBe(true);
    const notice = readFileSync(join(DIR, 'LICENSE.txt'), 'utf8');
    expect(notice).toMatch(/Princeton WordNet/);
    expect(notice).toMatch(/CHANGES MADE/); // §3(a)(1)(B): modifications indicated
  });

  it('agrees with the constant the engine uses as its denominator', () => {
    expect(manifest.concepts).toBe(CONCEPT_BUDGET);
    expect(manifest.chunks).toBe(Math.ceil(manifest.concepts / manifest.chunkSize));
  });
});

describe('ontology data', () => {
  it('all chunks exist', () => {
    for (let i = 0; i < manifest.chunks; i++) {
      expect(existsSync(join(DIR, chunkName(i))), chunkName(i)).toBe(true);
    }
  });

  it('starts at `entity`, the single root of the noun hierarchy', () => {
    const c = read<Chunk>(chunkName(0));
    expect(c.l[0]).toBe('entity');
    expect(c.p[0]).toBe(-1);
    expect(c.g[0]).toMatch(/^that which is perceived or known or inferred/);
    expect(manifest.categories[c.d[0]!]).toBe('noun.Tops');
  });

  it('has EXACTLY one root — the premise depends on it', () => {
    const roots = allChunks().flatMap((c) => c.p).filter((p) => p === -1);
    expect(roots).toHaveLength(1);
  });

  it('never shows the same word twice', () => {
    // A synset is a set of synonyms and many share a first word form. Two
    // identical cards read as a bug, so the pipeline keeps one per label.
    const labels = allChunks().flatMap((c) => c.l);
    expect(labels).toHaveLength(manifest.concepts);
    expect(new Set(labels).size).toBe(manifest.concepts);
  });

  it('ships no sense the source marks as a slur or disparaging', () => {
    const bad = allChunks()
      .flatMap((c) => c.g)
      .filter((g) => /\b(ethnic slur|racial slur|slur|disparaging|derogatory|pejorative)\b/i.test(g));
    expect(bad).toEqual([]);
  });

  it('ships no slur the source failed to mark', () => {
    // DELIBERATELY NOT the pipeline's own regex. The predicate a filter uses
    // cannot be the evidence that the filter worked — the gloss filter above
    // passed vacuously while `Abo` sat at recovery index 996 with a gloss that
    // reads perfectly neutrally, on a public site, as a reward card.
    const labels = new Set(allChunks().flatMap((c) => c.l));
    const mustNotShip = [
      'Abo', 'gypsy', 'Gypsy',
      'master race', 'Black race', 'White race', 'Mongolian race', 'Amerindian race',
      'Negroid race', 'Mongoloid race', 'Australoid race', 'Caucasian race',
    ];
    expect(mustNotShip.filter((w) => labels.has(w))).toEqual([]);
  });

  it('keeps arrays aligned, labelled and defined', () => {
    for (const c of allChunks()) {
      const n = c.l.length;
      expect(c.d).toHaveLength(n);
      expect(c.p).toHaveLength(n);
      expect(c.g).toHaveLength(n);
      expect(c.l.every((l) => typeof l === 'string' && l.length > 0)).toBe(true);
      expect(c.g.every((g) => typeof g === 'string' && g.length > 0)).toBe(true);
      expect(c.d.every((d) => d >= 0 && d < manifest.categories.length)).toBe(true);
    }
  });

  it('only ever points backwards — you rebuild outward from what you hold', () => {
    const chunks = allChunks();
    chunks.forEach((c, i) => {
      const base = i * manifest.chunkSize;
      c.p.forEach((parent, j) => {
        if (parent === -1) return;
        expect(parent, `chunk ${i} entry ${j}`).toBeLessThan(base + j);
        expect(parent).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

describe('the relation table (non-is-a lines)', () => {
  const rel = read<{ e: Array<[number, number, number]> }>('rel.json');
  const manifest = read<Manifest>('index.json');
  const labels: string[] = [];
  for (let c = 0; c < manifest.chunks; c++) labels.push(...read<Chunk>(chunkName(c)).l);

  it('ships relations, indexed inside the concept set', () => {
    expect(rel.e.length).toBeGreaterThan(50);
    expect(manifest.relations).toBe(rel.e.length);
    for (const [a, b, r] of rel.e) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(manifest.concepts);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(manifest.concepts);
      expect(a).not.toBe(b);
      expect(r).toBeGreaterThan(0); // 0 is `is a`, which comes from `p`, not here
    }
  });

  it('points WHOLE → PART, and is asserted by MEANING rather than by rerunning the filter', () => {
    // The trap prof-veritas caught: WordNet's key is called `mero_part` and sits
    // on the HOLONYM, so `organism mero_part cell` means "organism HAS PART
    // cell". Reading the key name as the source's role draws every part-whole
    // arrow backwards. A test that just re-applied the pipeline's own mapping
    // would pass while shipping the error — the same circularity that let the
    // slur `Abo` ship past a test asserting the filter's own regex.
    //
    // So this checks real-world meaning on named pairs instead.
    const label = (i: number): string => labels[i] ?? '';
    const find = (from: string, to: string): [number, number, number] | undefined =>
      rel.e.find(([a, b]) => label(a) === from && label(b) === to);

    // a person is a member OF people, never the other way round
    expect(find('people', 'person')).toBeDefined();
    expect(find('person', 'people')).toBeUndefined();
    // a body part is part OF an organism
    expect(find('organism', 'body part')).toBeDefined();
    expect(find('body part', 'organism')).toBeUndefined();
    // a section is part OF a whole
    expect(find('whole', 'section')).toBeDefined();
    expect(find('section', 'whole')).toBeUndefined();
  });

  it('excludes `exemplifies` — it is a usage register, not a relation', () => {
    // `cakewalk exemplifies trope` means "cakewalk is used figuratively", and
    // `international relations exemplifies plural` means "used in the plural".
    // Shipping either as a graph edge would teach a falsehood about rdf:type.
    const label = (i: number): string => labels[i] ?? '';
    const suspects = ['trope', 'plural', 'colloquialism', 'idiom'];
    for (const [a, b] of rel.e) {
      expect(suspects).not.toContain(label(b));
      expect(suspects).not.toContain(label(a));
    }
  });
});
