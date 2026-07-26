// The bottom two rungs of docs/ECONOMY.md: Salvage → Tokens → Extract →
// Statements, with a source fork that decides composition.
//
// These exist because the previous economy was found to have ONE live resource
// and nobody noticed for weeks — five of seven `ResourceId`s were written once
// in `initialState` and never read again. A rung with no test is a rung that
// can quietly stop working the same way.
import { describe, expect, it } from 'vitest';
import {
  apply, canExtract, extractCapacity, extractCost, extractionYield, initialState,
  salvageRate, sourceAgreement, verified, attentionCap, CURRENT_SAVE_VERSION,
} from '../src/core/engine';
import type { Edge, GameState } from '../src/core/types';

/** A board with `n` concepts on it, so salvage has something to draw from. */
const board = (n: number): GameState => {
  const base = initialState(1);
  const anchors = [0];
  for (let i = 1; i < n; i++) anchors.push(i);
  return { ...base, forged: { ...base.forged, anchors } };
};

/** `n` real-shaped candidate relations over concepts on that board. */
const cands = (n: number, from = 1): Edge[] => {
  const out: Edge[] = [];
  for (let i = 0; i < n; i++) out.push({ a: from + i, b: 0, rel: 0, checked: false, fake: false });
  return out;
};

/** A state holding `n` passages about concepts 1..n. */
const holding = (n: number): GameState => {
  const s = board(n + 2);
  const pool = [];
  for (let i = 1; i <= n; i++) pool.push(i);
  return { ...s, pool };
};
import { deserialize, MIGRATIONS, serialize } from '../src/core/save';
import { D } from '../src/core/numbers';

const BATCH = extractCost();

describe('salvage — rung 1', () => {
  it('adds passages at the rate of the chosen source', () => {
    const s0 = board(40);
    const picks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const s1 = apply(s0, { type: 'salvage', picks });
    expect(s1.pool.length - s0.pool.length).toBe(salvageRate(s0).passages);
  });

  it('every passage is a REAL concept id, never an increment', () => {
    // The defect this whole rung was rebuilt to fix: rung 1 used to add 12 to a
    // counter with no referent in the dataset, and extraction turned that into
    // "statements" that had no subject, predicate or object.
    const s = apply(board(40), { type: 'salvage', picks: [3, 9, 27] });
    expect(s.pool).toEqual([3, 9, 27]);
  });

  it('refuses a payload with no real picks in it', () => {
    const s0 = board(40);
    expect(apply(s0, { type: 'salvage', picks: [] })).toEqual(s0);
    expect(apply(s0, { type: 'salvage', picks: [-1, 1.5, NaN] })).toEqual(s0);
  });

  it('the archives are SLOWER and RARER than the ruins — the fork must be a real trade', () => {
    const common = salvageRate({ ...initialState(1), source: 'common' });
    const archive = salvageRate({ ...initialState(1), source: 'archive' });
    expect(archive.passages).toBeLessThan(common.passages);
    expect(archive.tail).toBeGreaterThan(common.tail);
  });

  it('composition is a stock-weighted average, so switching source DILUTES rather than flips', () => {
    // Start on archives and build a rare stock, then haul one common load.
    const many = [];
    for (let i = 1; i <= 40; i++) many.push(i);
    let s: GameState = { ...board(60), pool: [], tokenTail: 0 };
    s = apply({ ...s, source: 'archive' }, { type: 'salvage', picks: many });
    const pureArchive = s.tokenTail;
    expect(pureArchive).toBeCloseTo(salvageRate({ ...s, source: 'archive' }).tail, 6);

    const after = apply({ ...s, source: 'common' }, { type: 'salvage', picks: many });
    // Strictly between the two sources: diluted, not replaced, and not unchanged.
    expect(after.tokenTail).toBeLessThan(pureArchive);
    expect(after.tokenTail).toBeGreaterThan(salvageRate({ ...s, source: 'common' }).tail);
  });

  it('setSource ignores anything that is not a real source', () => {
    const s = initialState(1);
    // @ts-expect-error — deliberately feeding the reducer a bad payload
    expect(apply(s, { type: 'setSource', source: 'nonsense' }).source).toBe(s.source);
  });
});

describe('extract — rung 1 → 2', () => {
  it('refuses below one batch and changes nothing', () => {
    const s = holding(BATCH - 1);
    expect(canExtract(s)).toBe(false);
    expect(apply(s, { type: 'extract', candidates: cands(5) })).toEqual(s);
  });

  it('spends exactly one batch of passages and mints at most the stated yield', () => {
    const s0 = holding(100);
    const s1 = apply(s0, { type: 'extract', candidates: cands(50) });

    expect(s0.pool.length - s1.pool.length).toBe(BATCH);
    const minted = D(s1.resources.triples).sub(D(s0.resources.triples)).toNumber();
    expect(minted).toBe(extractCapacity(s0));
    // The displayed percentage IS the arithmetic. If these ever diverge the HUD
    // is lying, which is the one thing this project treats as unrecoverable.
    expect(minted).toBe(Math.floor(BATCH * extractionYield(s0)));
    expect(minted).toBeGreaterThan(0);
  });

  it('EVERY minted statement is a real edge on the board', () => {
    // The heart of the rebuild. Extraction used to add a number to a counter;
    // now each statement it mints is a relation between two real concepts, and
    // the statement count and the edge count move together.
    const s0 = holding(100);
    const s1 = apply(s0, { type: 'extract', candidates: cands(50) });
    const added = s1.forged.edges.length - s0.forged.edges.length;
    expect(added).toBe(extractCapacity(s0));
    expect(D(s1.resources.triples).toNumber()).toBe(added);
    for (const e of s1.forged.edges) {
      expect(s1.forged.anchors).toContain(e.a);
      expect(s1.forged.anchors).toContain(e.b);
    }
  });

  it('an extractor PROPOSES: everything it mints arrives unchecked', () => {
    const s = apply(holding(100), { type: 'extract', candidates: cands(50) });
    for (const e of s.forged.edges) expect(e.checked).toBe(false);
    expect(D(s.provenance.unverified).toNumber()).toBe(s.forged.edges.length);
  });

  it('never proposes a relation about text it does not hold', () => {
    // You cannot extract a fact from a passage you do not have. The engine
    // trusts the shell for WHICH relations, but not for whether the concepts
    // are on the board.
    const s0 = holding(100);
    const offBoard: Edge[] = [{ a: 9999, b: 8888, rel: 0, checked: false, fake: false }];
    const s1 = apply(s0, { type: 'extract', candidates: offBoard });
    expect(s1.forged.edges.length).toBe(s0.forged.edges.length);
    expect(s1.pool.length).toBe(s0.pool.length - BATCH); // the text was still spent
  });

  it('never draws the same relation twice', () => {
    const s0 = holding(100);
    const dupes = [...cands(3), ...cands(3)];
    const s1 = apply(s0, { type: 'extract', candidates: dupes });
    expect(s1.forged.edges.length).toBe(3);
  });

  it('yield is capped strictly below 100% however large the modifier', () => {
    const base = initialState(1);
    const juiced = { ...base, modifiers: { extraction: 1e6 } };
    expect(extractionYield(juiced)).toBeLessThan(1);
  });

  it('must NOT feed the permanent ratchet, however clean the material', () => {
    // `lifetimeVerified` drives the attention cap and the yield multiplier and
    // survives prestige; its contract is "statements a HUMAN checked".
    // Extraction is bulk conversion. When it did credit the ratchet, 150s of
    // tapping moved the attention cap from 4 to 13 — a fourfold inflation of
    // the game's designed bottleneck, from its most spammable verb.
    for (const tail of [0, 0.5, 1]) {
      const s = { ...holding(100), tokenTail: tail };
      const after = apply(s, { type: 'extract', candidates: cands(50) });
      expect(after.lifetimeVerified, `tail=${tail}`).toBe(s.lifetimeVerified);
    }
  });

  it('does not inflate the attention cap, at any volume', () => {
    let s = { ...holding(200), tokenTail: 1 };
    const before = attentionCap(s);
    let ran = 0;
    for (let i = 0; i < 10; i++) {
      if (!canExtract(s)) break;
      s = apply(s, { type: 'extract', candidates: cands(50, 1 + i * 60) });
      ran++;
    }
    expect(ran).toBeGreaterThan(4); // it really ran
    expect(attentionCap(s)).toBe(before);
  });
});

describe('the second number', () => {
  it('is vacuously 1 with nothing drawn, and the UI gates on that', () => {
    expect(sourceAgreement(initialState(1))).toBe(1);
  });

  it('is exactly the share of drawn lines that are not invented', () => {
    const base = initialState(1);
    const s = {
      ...base,
      forged: {
        ...base.forged,
        edges: [
          { a: 0, b: 1, rel: 0, checked: true, fake: false },
          { a: 0, b: 2, rel: 0, checked: true, fake: false },
          { a: 0, b: 3, rel: 0, checked: true, fake: true },
          { a: 0, b: 4, rel: 0, checked: false, fake: true },
        ],
      },
    };
    expect(sourceAgreement(s)).toBeCloseTo(0.5, 9);
  });

  it('moves INDEPENDENTLY of the first number — that divergence is the design', () => {
    // Two fake lines that the player has personally certified. "Checked" reads
    // perfect; agreement does not. If these two ever move together, the game
    // has lost the only thing the second number was added to say.
    const base = initialState(1);
    const s = {
      ...base,
      resources: { ...base.resources, triples: '10' },
      forged: {
        ...base.forged,
        edges: [
          { a: 0, b: 1, rel: 0, checked: true, fake: true },
          { a: 0, b: 2, rel: 0, checked: true, fake: false },
        ],
      },
    };
    expect(sourceAgreement(s)).toBeCloseTo(0.5, 9);
    // fidelity is untouched by fakeness: every statement here is "checked".
    expect(D(verified(s)).toNumber()).toBe(10);
  });
});

describe('migrations — an existing save must survive', () => {
  // ⚠️ The obvious version of this test — round-trip an old blob and assert the
  // new fields are set — PASSES WITH THE MIGRATION DELETED. `deserialize`
  // merges against `initialState()`, so every missing top-level key is
  // back-filled and the assertion never reaches the step it claims to test.
  // Verified by removing the step and watching it stay green. So the steps are
  // exercised directly.
  //
  // Indexed by the version each step PRODUCES, not off CURRENT_SAVE_VERSION —
  // the first draft of this used `CURRENT_SAVE_VERSION - 2` and silently began
  // testing a different step the moment the version was bumped.
  const stepTo = (v: number) => MIGRATIONS[v - 2]!;

  it('v12 → v13 gives an old save a salvage source', () => {
    const out = stepTo(13)({ resources: { data: '412' } });
    expect(out.source).toBe('common');
    expect(typeof out.tokenTail).toBe('number');
    expect(out.resources).toEqual({ data: '412' }); // additive, disturbs nothing
  });

  it('v13 → v14 gives it an empty passage pool', () => {
    // Empty is the honest position: a v13 save recorded a QUANTITY of text and
    // never recorded what any of it was about, so there is nothing to convert.
    const out = stepTo(14)({ resources: { data: '412' }, source: 'archive' });
    expect(out.pool).toEqual([]);
    expect(out.source).toBe('archive');
    expect(out.resources).toEqual({ data: '412' });
  });

  it('an old save round-trips without losing a statement or a concept', () => {
    const base = initialState(7);
    const old = {
      ...base,
      saveVersion: 12,
      resources: { ...base.resources, data: '412', triples: '99' },
    } as unknown as Record<string, unknown>;
    delete old.source;
    delete old.tokenTail;
    delete old.pool;

    const loaded = deserialize(serialize(old as never));

    expect(loaded.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(loaded.resources.triples).toBe('99'); // nobody loses a statement
    expect(loaded.source).toBe('common');
    expect(Array.isArray(loaded.pool)).toBe(true);
    // Never NaN and never null — the shape of the bug that corrupted a live
    // save once already, when a new key arrived `undefined` through a merge.
    expect(Number.isFinite(loaded.tokenTail)).toBe(true);
  });
});

describe('a machine proposal can always be confirmed', () => {
  // THE TRAP THIS EXISTS TO PREVENT, and it was live for about twenty minutes.
  //
  // Extraction proposes relations UNCHECKED, and nothing in the engine ever
  // flipped an edge from unchecked to checked. So every extracted line could
  // only rot — and because the offer list excluded ALL drawn edges, extraction
  // also consumed the player's chance to draw that same relation by hand. A
  // verb that permanently degrades your graph, in the first minute, with no way
  // back. Confirming is now a real move.
  const CONNECT_MS_LOCAL = 7_000;
  const proposed = (): GameState => {
    const s = apply(holding(100), { type: 'extract', candidates: cands(50) });
    return { ...s, lastTick: 1000 };
  };

  it('an unchecked line is still offered — connect books it', () => {
    const s = proposed();
    const e = s.forged.edges.find((x) => !x.checked)!;
    const after = apply(s, { type: 'connect', edge: e });
    expect(after.bookings.length).toBe(1);
  });

  it('a line you already checked is a no-op, not a double charge', () => {
    const s0 = proposed();
    const e = s0.forged.edges[0]!;
    const s1 = { ...s0, forged: { ...s0.forged, edges: [{ ...e, checked: true }, ...s0.forged.edges.slice(1)] } };
    expect(apply(s1, { type: 'connect', edge: { ...e, checked: true } })).toEqual(s1);
  });

  it('confirming FLIPS the line and moves the statement, minting nothing new', () => {
    const s0 = proposed();
    const e = s0.forged.edges.find((x) => !x.checked)!;
    const statementsBefore = D(s0.resources.triples).toNumber();
    const unverifiedBefore = D(s0.provenance.unverified).toNumber();
    const edgesBefore = s0.forged.edges.length;

    let s = apply(s0, { type: 'connect', edge: e });
    s = apply(s, { type: 'tick', dt: 0.1, now: s.lastTick + CONNECT_MS_LOCAL + 1000 });

    const found = s.forged.edges.find((x) => x.a === e.a && x.b === e.b && x.rel === e.rel);
    expect(found?.checked, 'the line must end up checked').toBe(true);
    // No second statement: the statement already existed. Its PROVENANCE moved.
    expect(s.forged.edges.length).toBe(edgesBefore);
    expect(D(s.resources.triples).toNumber()).toBe(statementsBefore);
    expect(D(s.provenance.unverified).toNumber()).toBeLessThan(unverifiedBefore);
    // And it counts as human-checked work, which is what the ratchet is for.
    expect(D(s.lifetimeVerified).toNumber()).toBeGreaterThan(D(s0.lifetimeVerified).toNumber());
  });
});
