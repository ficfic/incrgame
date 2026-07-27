// THE RARITY RATING.
//
// The owner asked to rate the dataset "so that we can determine what's cool and
// what's not". A score nobody checks is a random number with a job title, so
// these tests pin the two things that can go wrong: the function ranking
// concepts backwards, and the SHIPPED DATA not actually carrying the rating.
//
// The second half matters more than it looks. The first version of this scored
// every concept against the shipped 4,096-concept slice, which is breadth-first
// and therefore ends in ~1,800 leaves that all sit at depth 5 — `pie chart`,
// `Laffer curve` and `undirected graph` came out identical. The fix was to
// measure against the full 72,000-synset lexicon, and the assertion that would
// have caught it is `separates two leaves that are not alike`, below.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CAPS, scoreRarity, TIERS, tierOf, WEIGHTS } from '../scripts/rarity.mjs';

/** An everyday, central concept: shallow, huge subtree, several word forms. */
const common = {
  depth: 1, descendants: 30_000, synonyms: 4, senseRank: 1, polysemy: 6, words: 1, degree: 6,
};
/** A technical compound out on the rim. */
const obscure = {
  depth: 12, descendants: 0, synonyms: 1, senseRank: 5, polysemy: 1, words: 3, degree: 0,
};

describe('the score points the right way', () => {
  it('rates an everyday concept common and a technical compound obscure', () => {
    expect(scoreRarity(common)).toBeLessThan(scoreRarity(obscure));
  });

  it('is monotone in every single signal, holding the others still', () => {
    // A weight with the wrong SIGN is the defect that would survive the test
    // above — six signals could carry it while one ran backwards.
    const base = { depth: 5, descendants: 100, synonyms: 2, senseRank: 2, polysemy: 3, words: 1, degree: 2 };
    const rarer: Array<[keyof typeof base, number]> = [
      ['depth', 9], ['descendants', 10], ['synonyms', 1],
      ['senseRank', 5], ['polysemy', 1], ['words', 3], ['degree', 0],
    ];
    for (const [k, v] of rarer) {
      expect(scoreRarity({ ...base, [k]: v }), `${k} runs backwards`)
        .toBeGreaterThan(scoreRarity(base));
    }
  });

  it('stays inside 0..100 and returns an integer', () => {
    for (const f of [common, obscure, { ...obscure, depth: 999, descendants: -5, words: 40 }]) {
      const s = scoreRarity(f);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('separates two leaves that are not alike', () => {
    // ⚠️ THE DEFECT THIS PINS. `bird` and `pie chart` are both nouns; one is a
    // hub of the language with 871 descendants, the other has none. Scoring
    // against the shipped slice gave them the same number because the slice
    // stops before either subtree exists.
    const bird = { depth: 7, descendants: 871, synonyms: 1, senseRank: 1, polysemy: 5, words: 1, degree: 18 };
    const pieChart = { depth: 8, descendants: 0, synonyms: 1, senseRank: 1, polysemy: 1, words: 2, degree: 0 };
    expect(scoreRarity(pieChart) - scoreRarity(bird)).toBeGreaterThan(10);
  });

  it('weights sum to 1, so the score really does span its range', () => {
    const total = Object.values(WEIGHTS).reduce((a: number, b: number) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
    for (const cap of Object.values(CAPS)) expect(cap).toBeGreaterThan(1);
  });
});

describe('tiers', () => {
  it('cover 0..100 with no gap and no overlap, in order', () => {
    let prev = -1;
    for (const t of TIERS) {
      expect(t.upTo).toBeGreaterThan(prev);
      prev = t.upTo;
    }
    expect(TIERS[TIERS.length - 1]!.upTo).toBe(100);
    for (let s = 0; s <= 100; s++) expect(TIERS[tierOf(s)]).toBeDefined();
  });

  it('give every band a distinct name', () => {
    const names = TIERS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('THE SHIPPED DATA carries the rating', () => {
  // Testing the pure function alone would pass with `r` never written to a
  // chunk. This reads what actually ships.
  const index = JSON.parse(readFileSync('public/ontology/index.json', 'utf8'));
  const chunks = Array.from({ length: index.chunks }, (_, c) =>
    JSON.parse(readFileSync(`public/ontology/c${String(c).padStart(3, '0')}.json`, 'utf8')));
  const scores: number[] = chunks.flatMap((c) => c.r ?? []);
  const labels: string[] = chunks.flatMap((c) => c.l);

  it('rates every concept, once', () => {
    expect(scores).toHaveLength(index.concepts);
    for (const c of chunks) expect(c.r).toHaveLength(c.l.length);
  });

  it('rates the root the most common thing in the dataset', () => {
    // `entity` is the top of the noun hierarchy. If anything outranks it for
    // commonness the scoring has lost the plot.
    expect(labels[0]).toBe('entity');
    expect(scores[0]).toBeLessThan(40);
  });

  it('actually spreads — a constant would pass every test above', () => {
    const distinct = new Set(scores).size;
    expect(distinct).toBeGreaterThan(20);
    const spread = Math.max(...scores) - Math.min(...scores);
    expect(spread).toBeGreaterThan(40);
  });

  it('fills every tier, so no band is a name for nothing', () => {
    for (const t of TIERS) {
      expect(scores.filter((s) => tierOf(s) === t.id).length, `tier ${t.name} is empty`)
        .toBeGreaterThan(100);
    }
  });
});
