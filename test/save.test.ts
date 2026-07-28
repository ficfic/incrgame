// THE SAVE: one version field, no migrations, and a reset that says so.
//
// Migrations were deleted with the economy (the owner reversed "never break a
// save" on 2026-07-27). What replaces them is not "crash on an old save" — it
// is a deliberate, announced rebuild that keeps the one thing worth keeping.
// These tests hold that line, because "we reset it" is the easiest behaviour in
// the file to turn into "we lost it silently".
import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../src/core/save';
import { CURRENT_SAVE_VERSION, apply, initialState, words } from '../src/core/engine';
import { SEED_NODES } from '../src/content/seed';
import { CONCEPT_BUDGET } from '../src/content/ontologyMeta';
import type { GameState } from '../src/core/types';

const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64');
const unb64 = (s: string): string => Buffer.from(s, 'base64').toString('utf8');

const played = (): GameState => ({
  ...initialState(),
  lastTick: 1_700_000_000_000,
  held: [...SEED_NODES, 300, 301, 302, 1024],
  solid: '1234.5',
  raw: '99',
  rot: '7',
  minted: '5e12',
  stepsThisRun: 4,
  machines: { extractor: 9, reasoner: 1, checker: 2 },
  watched: { extractor: false, reasoner: true },
  generation: 2,
  syntheticShare: 0.75,
});

/** A pre-rewrite save, in the shape v15 actually wrote. */
const legacyBlob = (version: number, anchors: number[]): string => {
  const state = {
    saveVersion: version,
    lastTick: 1_700_000_000_000,
    resources: { data: '15', triples: '900', entities: '0' },
    provenance: { unverified: '400', drifted: '20' },
    generators: { harvester: 0, extractor: 6, reasoner: 1 },
    forged: { nextId: 500, anchors, links: [], edges: [], frontier: [], foldedNodes: '30' },
    attention: 12, supervised: 3, bookings: [], review: [], contextWindow: 24,
  };
  return b64(JSON.stringify({ version, state }));
};

describe('export and import round-trip on the new shape', () => {
  it('returns exactly what went in', () => {
    const s = played();
    const { state, reset, notice } = deserialize(serialize(s));
    expect(reset).toBe(false);
    expect(notice).toBe('');
    expect(state).toEqual(s);
  });

  it('survives magnitudes a JS number cannot hold', () => {
    const s = { ...played(), solid: '1e400', minted: '1e900' };
    expect(deserialize(serialize(s)).state.solid).toBe('1e400');
  });

  it('keeps the version field on the blob and on the state', () => {
    const s = played();
    expect(s.version).toBe(CURRENT_SAVE_VERSION);
    const envelope = JSON.parse(unb64(serialize(s)));
    expect(envelope.version).toBe(CURRENT_SAVE_VERSION);
    expect(envelope.state.version).toBe(CURRENT_SAVE_VERSION);
  });

  it('backfills a key missing INSIDE a record, not just at the top level', () => {
    // The old backfill spread one level deep, so a newly-added MachineId
    // arrived `undefined`, `buy` computed `undefined + 1 === NaN`, and
    // `JSON.stringify(NaN)` is `null` — a bricked save with no error anywhere.
    const s = played();
    const raw = JSON.parse(unb64(serialize(s)));
    delete raw.state.machines.checker;
    delete raw.state.watched.reasoner;
    const blob = b64(JSON.stringify(raw));
    const { state } = deserialize(blob);
    expect(state.machines.checker).toBe(0);
    expect(state.watched.reasoner).toBe(true);
    expect(apply(state, { type: 'buy', id: 'checker' }).machines.checker).toBe(1);
  });
});

describe('a save from the old economy resets, loudly, keeping the concepts', () => {
  it('rebuilds rather than crashing, and says so', () => {
    const { state, reset, notice } = deserialize(legacyBlob(15, [...SEED_NODES, 12, 44, 900]));
    expect(reset).toBe(true);
    expect(notice).toMatch(/v15/);
    expect(notice).toMatch(/rebuilt/i);
    expect(state.version).toBe(CURRENT_SAVE_VERSION);
    expect(state.solid).toBe(initialState().solid);
    expect(state.raw).toBe('0');
    expect(state.generation).toBe(0);
  });

  it('carries the concepts across — the one kindness', () => {
    const { state, notice } = deserialize(legacyBlob(15, [...SEED_NODES, 12, 44, 900]));
    expect(state.held).toEqual(expect.arrayContaining([12, 44, 900, ...SEED_NODES]));
    expect(words(state)).toBe(3);
    expect(notice).toMatch(/3 concepts/);
  });

  it('reads the concepts out of `forged.anchors`, which is where they were', () => {
    // Getting this from the wrong field would silently break the one promise
    // the reset makes, and every test above would still pass.
    const { state } = deserialize(legacyBlob(11, [7]));
    expect(state.held).toContain(7);
  });

  it('drops ids the shipped dataset no longer has', () => {
    const { state } = deserialize(legacyBlob(15, [5, CONCEPT_BUDGET, 99999, -3, 1.5]));
    expect(state.held).toContain(5);
    expect(state.held).not.toContain(CONCEPT_BUDGET);
    expect(state.held).not.toContain(99999);
    expect(state.held.every((id) => Number.isInteger(id) && id >= 0)).toBe(true);
  });

  it('never loses the seed, so the opening board is never empty', () => {
    const { state } = deserialize(legacyBlob(15, []));
    expect(state.held).toEqual(expect.arrayContaining([...SEED_NODES]));
    expect(words(state)).toBe(0);
  });

  it('treats a save from the FUTURE the same way — rebuild, do not crash', () => {
    const s = { ...played(), version: CURRENT_SAVE_VERSION + 1 };
    const { reset } = deserialize(serialize(s));
    expect(reset).toBe(true);
  });
});

describe('garbage still throws, so a bad paste cannot destroy a good save', () => {
  it('rejects non-base64, non-JSON, and an envelope with no state', () => {
    expect(() => deserialize('!!!!')).toThrow();
    expect(() => deserialize(b64('not json at all'))).toThrow();
    expect(() => deserialize(b64(JSON.stringify({ version: 16 })))).toThrow();
    expect(() => deserialize(b64(JSON.stringify({ state: 4 })))).toThrow();
  });
});
