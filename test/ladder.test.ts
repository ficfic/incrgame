// The bottom two rungs of docs/ECONOMY.md: Salvage → Tokens → Extract →
// Statements, with a source fork that decides composition.
//
// These exist because the previous economy was found to have ONE live resource
// and nobody noticed for weeks — five of seven `ResourceId`s were written once
// in `initialState` and never read again. A rung with no test is a rung that
// can quietly stop working the same way.
import { describe, expect, it } from 'vitest';
import {
  apply, canExtract, extractCost, extractionYield, initialState, salvageRate,
  sourceAgreement, verified, CURRENT_SAVE_VERSION,
} from '../src/core/engine';
import { deserialize, MIGRATIONS, serialize } from '../src/core/save';
import { D } from '../src/core/numbers';

const BATCH = extractCost();

describe('salvage — rung 1', () => {
  it('adds tokens at the rate of the chosen source', () => {
    const s0 = initialState(1);
    const s1 = apply(s0, { type: 'salvage' });
    const gained = D(s1.resources.data).sub(D(s0.resources.data)).toNumber();
    expect(gained).toBe(salvageRate(s0).tokens);
  });

  it('the archives are SLOWER and RARER than the ruins — the fork must be a real trade', () => {
    const common = salvageRate({ ...initialState(1), source: 'common' });
    const archive = salvageRate({ ...initialState(1), source: 'archive' });
    expect(archive.tokens).toBeLessThan(common.tokens);
    expect(archive.tail).toBeGreaterThan(common.tail);
  });

  it('composition is a stock-weighted average, so switching source DILUTES rather than flips', () => {
    // Start on archives and build a rare stock, then haul one common load.
    let s = { ...initialState(1), resources: { ...initialState(1).resources, data: '0' }, tokenTail: 0 };
    s = apply({ ...s, source: 'archive' }, { type: 'salvage' });
    const pureArchive = s.tokenTail;
    expect(pureArchive).toBeCloseTo(salvageRate({ ...s, source: 'archive' }).tail, 6);

    const after = apply({ ...s, source: 'common' }, { type: 'salvage' });
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
    const s = { ...initialState(1), resources: { ...initialState(1).resources, data: '0' } };
    expect(canExtract(s)).toBe(false);
    expect(apply(s, { type: 'extract' })).toEqual(s);
  });

  it('spends exactly one batch and mints at the stated yield', () => {
    const base = initialState(1);
    const s0 = { ...base, resources: { ...base.resources, data: '100' } };
    const s1 = apply(s0, { type: 'extract' });

    expect(D(s0.resources.data).sub(D(s1.resources.data)).toNumber()).toBe(BATCH);
    const minted = D(s1.resources.triples).sub(D(s0.resources.triples)).toNumber();
    expect(minted).toBe(Math.floor(BATCH * extractionYield(s0)));
    // The displayed percentage IS the arithmetic. If these ever diverge the HUD
    // is lying, which is the one thing this project treats as unrecoverable.
    expect(minted).toBeGreaterThan(0);
  });

  it('yield is capped strictly below 100% however large the modifier', () => {
    const base = initialState(1);
    const juiced = { ...base, modifiers: { extraction: 1e6 } };
    expect(extractionYield(juiced)).toBeLessThan(1);
  });

  it('archive-sourced tokens arrive CHECKED; ruins arrive unverified', () => {
    const base = initialState(1);
    const stock = { ...base.resources, data: '100' };

    const fromRuins = apply({ ...base, resources: stock, tokenTail: 0 }, { type: 'extract' });
    const fromArchive = apply({ ...base, resources: stock, tokenTail: 1 }, { type: 'extract' });

    // Same volume either way — the fork is about composition, not throughput.
    expect(fromRuins.resources.triples).toBe(fromArchive.resources.triples);
    // ...and opposite provenance, which is the entire point of the trade.
    expect(D(fromRuins.provenance.unverified).toNumber()).toBeGreaterThan(0);
    expect(D(fromArchive.provenance.unverified).toNumber()).toBe(0);
    expect(D(verified(fromArchive)).toNumber())
      .toBeGreaterThan(D(verified(fromRuins)).toNumber());
  });

  it('checked-on-arrival material feeds the permanent ratchet', () => {
    const base = initialState(1);
    const s = { ...base, resources: { ...base.resources, data: '100' }, tokenTail: 1 };
    const after = apply(s, { type: 'extract' });
    expect(D(after.lifetimeVerified).toNumber())
      .toBeGreaterThan(D(s.lifetimeVerified).toNumber());
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

describe('v13 migration — an existing save must survive', () => {
  // ⚠️ The obvious version of this test — round-trip a v12 blob and assert the
  // fields are set — PASSES WITH THE MIGRATION DELETED. `deserialize` merges
  // against `initialState()`, so every missing top-level key is back-filled and
  // the assertion never reaches the migration step. Verified by removing the
  // step and watching the test stay green.
  //
  // So the step is exercised directly, and the round-trip is asserted for what
  // it actually guarantees: that nothing the player earned is lost.
  it('the v12 → v13 step itself sets the new fields on a bare object', () => {
    const step = MIGRATIONS[CURRENT_SAVE_VERSION - 2]!; // index 0 is v1 → v2
    const out = step({ resources: { data: '412' } });
    expect(out.source).toBe('common');
    expect(typeof out.tokenTail).toBe('number');
    expect(out.tokenTail as number).toBeGreaterThanOrEqual(0);
    expect(out.tokenTail as number).toBeLessThanOrEqual(1);
    // Additive: it must not disturb anything already there.
    expect(out.resources).toEqual({ data: '412' });
  });

  it('a v12 save round-trips without losing a token or a statement', () => {
    const base = initialState(7);
    const old = {
      ...base,
      saveVersion: 12,
      resources: { ...base.resources, data: '412', triples: '99' },
    } as unknown as Record<string, unknown>;
    delete old.source;
    delete old.tokenTail;

    const loaded = deserialize(serialize(old as never));

    expect(loaded.saveVersion).toBe(CURRENT_SAVE_VERSION);
    expect(loaded.resources.data).toBe('412');   // nobody loses a token
    expect(loaded.resources.triples).toBe('99'); // nor a statement
    // Never NaN and never null — the shape of the bug that corrupted a live
    // save once already, when a new key arrived `undefined` through a merge.
    expect(Number.isFinite(loaded.tokenTail)).toBe(true);
    expect(loaded.source).toBe('common');
  });
});
