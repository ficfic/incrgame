import { describe, expect, it } from 'vitest';
import {
  agentCost, apply, attentionCap, attentionFree, CONNECT_MS, DISCOVER_MS, fidelity, initialState,
  supervisedPerSecond, tick, unsupervised, unsupervisedPerSecond, verified,
} from '../src/core/engine';
import { ANCHOR_CAP, FRONTIER_CAP } from '../src/core/graph';
import { GENERATORS } from '../src/content/generators';
import { CONCEPT_BUDGET } from '../src/content/ontologyMeta';
import { D, format, formatWhole } from '../src/core/numbers';
import { nextRand } from '../src/core/rng';
import type { GameState } from '../src/core/types';
import { SEED_NODES } from '../src/content/seed';

/** Both hand verbs now cost something — Datums to survey, attention to
 *  connect — so a test that wants a claim has to fund both. */
const rich = (s: GameState): GameState => ({ ...s, attention: 12 });

/** Structural helper: tops up both costs first, because these tests are about
 *  the SHAPE of the graph, not about whether you could afford it. */
const surveyAndClaim = (s: GameState): GameState => {
  s = apply(rich(s), { type: 'survey' });
  const id = s.forged.frontier[s.forged.frontier.length - 1]!;
  return apply(s, { type: 'claimNode', id });
};

describe('discovery — booking attention onto work', () => {
  it('ties up a slot, then lands a VERIFIED concept by itself', () => {
    let s = { ...initialState(), lastTick: 1_000 };
    const capBefore = attentionFree(s);
    const nodesBefore = s.graph.nodes;
    s = apply(s, { type: 'discover' });
    expect(s.bookings).toHaveLength(1);
    expect(attentionFree(s)).toBe(capBefore - 1); // the slot is busy, not spent
    expect(s.graph.nodes).toBe(nodesBefore);      // nothing has landed yet

    s = apply(s, { type: 'tick', dt: 20, now: 1_000 + DISCOVER_MS + 1 });
    expect(s.bookings).toHaveLength(0);          // slot handed back
    expect(attentionFree(s)).toBeGreaterThanOrEqual(capBefore);
    expect(s.graph.nodes).toBe(nodesBefore + 1); // the concept arrived
    expect(s.provenance.unverified).toBe('0');   // you placed it: it is verified
    expect(fidelity(s)).toBe(1);
  });

  it('is refused when every slot is already committed', () => {
    let s = { ...initialState(), lastTick: 1_000 };
    for (let i = 0; i < attentionCap(s); i++) s = apply(s, { type: 'discover' });
    expect(attentionFree(s)).toBe(0);
    expect(apply(s, { type: 'discover' })).toBe(s);
  });

  it('grows capacity from knowledge you actually verified, not from a shop', () => {
    const green = initialState();
    const grown = { ...green, lifetimeVerified: '10000' };
    expect(attentionCap(grown)).toBeGreaterThan(attentionCap(green));
  });
});

describe('discovery is bounded by the clock and by the world', () => {
  it('refuses to book before the clock has started', () => {
    // lastTick is 0 in a fresh state. Booking against it produced `until: 18000`,
    // and the first real tick — epoch ms — is a trillion past that, so the
    // discovery completed instantly and for free.
    const fresh = initialState();
    expect(fresh.lastTick).toBe(0);
    expect(apply(fresh, { type: 'discover' })).toBe(fresh);
  });

  it('refuses past the last concept in the dataset', () => {
    const edge: GameState = {
      ...initialState(),
      lastTick: 1_000,
      forged: { ...initialState().forged, nextId: CONCEPT_BUDGET },
    };
    expect(apply(edge, { type: 'discover' })).toBe(edge);
    // and one short of it still works, so the gate is at the edge and not before
    const nearly = { ...edge, forged: { ...edge.forged, nextId: CONCEPT_BUDGET - 1 } };
    expect(apply(nearly, { type: 'discover' }).bookings).toHaveLength(1);
  });

  it('does not wire any edge — a found concept lands dark', () => {
    // Discovery used to mint a free anchor AND a free verified statement. That
    // is what let a player finish the entire dataset by hand in ~2h34m without
    // ever buying a machine, and it is why coverage could only ever go up.
    let s: GameState = { ...initialState(), lastTick: 1_000 };
    const landedId = s.forged.nextId;
    s = apply(s, { type: 'discover' });
    s = apply(s, { type: 'tick', dt: 20, now: 1_000 + DISCOVER_MS + 1 });
    expect(s.forged.anchors).toContain(landedId);
    expect(s.forged.edges).toHaveLength(0);
    expect(s.resources.triples).toBe('0');
  });
});

describe('connecting — filling in a dotted line', () => {
  const withTwo = (): GameState => {
    let s: GameState = { ...initialState(), lastTick: 1_000 };
    s = apply(s, { type: 'discover' });
    return apply(s, { type: 'tick', dt: 20, now: 1_000 + DISCOVER_MS + 1 });
  };
  // The opening board is the SEED, so a line between "the first two concepts"
  // is between two seed ids — 0 and 1 are no longer on the board at all.
  const two = () => { const a = initialState().forged.anchors; return [a[0]!, a[1]!] as const; };
  const line = { a: two()[0], b: two()[1], rel: 0, checked: true, fake: false };

  it('books a slot, and the line only exists once the work finishes', () => {
    let s = withTwo();
    const free = attentionFree(s);
    s = apply(s, { type: 'connect', edge: line });
    expect(attentionFree(s)).toBe(free - 1);
    expect(s.forged.edges).toHaveLength(0);
    s = apply(s, { type: 'tick', dt: 20, now: s.lastTick + CONNECT_MS + 1 });
    expect(s.forged.edges).toHaveLength(1);
    expect(attentionFree(s)).toBeGreaterThanOrEqual(free);
  });

  it('refuses a duplicate, an in-flight repeat, and an end that is not on the board', () => {
    let s = withTwo();
    s = apply(s, { type: 'connect', edge: line });
    // already booked
    expect(apply(s, { type: 'connect', edge: line })).toBe(s);
    s = apply(s, { type: 'tick', dt: 20, now: s.lastTick + CONNECT_MS + 1 });
    // already drawn
    expect(apply(s, { type: 'connect', edge: line })).toBe(s);
    // an end that was never discovered
    expect(apply(s, { type: 'connect', edge: { ...line, b: 999 } })).toBe(s);
  });

  it('costs attention, so it competes with discovering and reviewing', () => {
    let s = withTwo();
    for (let i = 0; i < attentionCap(s) + 2; i++) {
      s = apply(s, { type: 'connect', edge: { a: two()[0], b: two()[1], rel: i, checked: true, fake: false } });
    }
    expect(attentionFree(s)).toBe(0);
    expect(apply(s, { type: 'discover' })).toBe(s); // no slot left for anything else
  });
});

describe('supervision — the trap', () => {
  const withAgents = (n: number): GameState =>
    ({ ...initialState(), generators: { ...initialState().generators, extractor: n }, lifetimeVerified: '10000' });

  it('lets you run more agents than you can watch', () => {
    const s = apply(withAgents(6), { type: 'setSupervision', slots: 2 });
    expect(s.supervised).toBe(2);
    expect(unsupervised(s)).toBe(4); // deliberately allowed
  });

  it('makes supervised output arrive CLEAN and unsupervised output arrive RAW', () => {
    let s = apply(withAgents(4), { type: 'setSupervision', slots: 4 });
    s = tick(s, 10);
    expect(Number(s.provenance.unverified)).toBeLessThan(1e-9); // everything was watched
    expect(Number(verified(s))).toBeGreaterThan(0);

    let loose = apply(withAgents(4), { type: 'setSupervision', slots: 0 });
    loose = tick(loose, 10);
    expect(Number(loose.provenance.unverified)).toBeGreaterThan(0);
    expect(Number(verified(loose))).toBeLessThan(1e-9); // subtraction leaves dust
  });

  it('trades throughput for trust — watching is slower', () => {
    const watched = apply(withAgents(4), { type: 'setSupervision', slots: 4 });
    const loose = apply(withAgents(4), { type: 'setSupervision', slots: 0 });
    expect(Number(supervisedPerSecond(watched)))
      .toBeLessThan(Number(unsupervisedPerSecond(loose)));
  });

  it('cannot reserve slots it does not have', () => {
    const s = apply(withAgents(99), { type: 'setSupervision', slots: 999 });
    expect(s.supervised).toBeLessThanOrEqual(attentionCap(s));
  });
});

describe('agents are distilled from verified knowledge', () => {
  const clean = (n: string): GameState => ({
    ...initialState(),
    resources: { ...initialState().resources, triples: n },
  });

  it('costs VERIFIED statements, and spends them', () => {
    const s = clean('500');
    const cost = Number(agentCost(s, 'extractor'));
    const after = apply(s, { type: 'buyGenerator', id: 'extractor' });
    expect(after.generators.extractor).toBe(1);
    expect(Number(after.resources.triples)).toBe(500 - cost);
  });

  it('a graph you let rot cannot build another agent', () => {
    // same number of statements, but none of them trustworthy
    const rotted: GameState = {
      ...clean('500'),
      provenance: { unverified: '0', drifted: '500' },
    };
    expect(apply(rotted, { type: 'buyGenerator', id: 'extractor' })).toBe(rotted);
  });

  it('never spends Datums, because there are none', () => {
    const s = clean('500');
    const after = apply(s, { type: 'buyGenerator', id: 'extractor' });
    expect(after.resources.data).toBe(s.resources.data);
  });
});

describe('agent prices climb', () => {
  it('climbs geometrically, priced in verified statements', () => {
    // Asserted as a SHAPE, not as two magic strings: the constants are tuning
    // knobs and a test that pins them just breaks every time they move.
    let s = initialState();
    const first = Number(agentCost(s, 'extractor'));
    expect(first).toBeGreaterThan(0);
    s = { ...s, generators: { ...s.generators, extractor: 1 } };
    const second = Number(agentCost(s, 'extractor'));
    expect(second).toBeGreaterThan(first);
    s = { ...s, generators: { ...s.generators, extractor: 5 } };
    expect(Number(agentCost(s, 'extractor')) / second).toBeGreaterThan(second / first);
  });

  it('is priced from the CONTENT TABLE, not from one constant for everything', () => {
    // The engine used a single hardcoded base/ratio pair, so the Extractor and
    // the Reasoner — different rates, different jobs, different roles in the
    // run — cost byte-identical amounts and balance could not be tuned as data.
    const s = initialState();
    expect(agentCost(s, 'extractor')).not.toBe(agentCost(s, 'reasoner'));
    expect(Number(agentCost(s, 'extractor')))
      .toBe(Number(GENERATORS.extractor.agentBase));
    expect(Number(agentCost(s, 'reasoner')))
      .toBe(Number(GENERATORS.reasoner.agentBase));
  });
});

describe('tick hygiene', () => {
  it('rejects nonsense dt and honors action.now', () => {
    const s = initialState();
    expect(apply(s, { type: 'tick', dt: 0 })).toBe(s);
    expect(apply(s, { type: 'tick', dt: NaN })).toBe(s);
    expect(apply(s, { type: 'tick', dt: 0.1, now: 123456 }).lastTick).toBe(123456);
  });

  it('does not mutate the previous state (purity)', () => {
    const s0 = initialState();
    const frozen = JSON.stringify(s0);
    apply(s0, { type: 'survey' });
    apply(s0, { type: 'tick', dt: 0.1 });
    expect(JSON.stringify(s0)).toBe(frozen);
  });
});

describe('rng', () => {
  it('is pure and deterministic (ready for M3)', () => {
    const [v1, s1] = nextRand(42);
    const [v2, s2] = nextRand(42);
    expect(v1).toBe(v2);
    expect(s1).toBe(s2);
    const [v3] = nextRand(s1);
    expect(v3).not.toBe(v1);
  });
});

describe('format', () => {
  it('formats plain, suffixed, huge, and floored numbers', () => {
    expect(format('999')).toBe('999');
    expect(format('1500')).toBe('1.50K');
    expect(format(D(10).pow(40).toString())).toMatch(/e/i);
    expect(formatWhole('3.72')).toBe('3');
    expect(formatWhole('1500.5')).toBe('1.50K');
  });
});
