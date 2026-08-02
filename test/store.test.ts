// THE SAVE, AND THE ONE PROPERTY THAT MAKES ADDING FEATURES SAFE.
//
// The owner asked how to make the code good enough to add things to easily.
// Half of that answer is a property rather than an opinion: **every future
// feature adds state, and a save written before that state existed must still
// load.** `load()` merges the stored game over `initial()`, so a field added
// tomorrow arrives at its default rather than as `undefined` — and `undefined`
// in the first sum that touches it turns the whole run to NaN, silently.
//
// ⚠️ THIS FILE CALLS `load()`. The first version of these tests asserted
// `{ ...initial(), ...old }` inline, which restates the implementation instead
// of exercising it — deleting the merge from `store.ts` left all 562 tests
// green. Proven by sabotage before this file was written.
//
// ---- PROVEN RED, 2026-08-01 ----------------------------------------------
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initial, apply, SECS_PER_PACE, type Game } from '../src/game/engine';
import { START } from '../src/game/places';

let stored: string | null = null;
vi.mock('../src/shell/storage', () => ({
  loadBlob: () => Promise.resolve(stored),
  saveBlob: (s: string) => { stored = s; return Promise.resolve(); },
  deleteBlob: () => { stored = null; return Promise.resolve(); },
  requestPersistence: () => Promise.resolve(true),
}));

const { load, save, SAVE_VERSION } = await import('../src/game/store');

/** Everything an older build knew about — and nothing added since. */
const OLD = { at: START, paces: 12, seen: [START], solid: [], forging: null, part: 0 };

const put = (game: unknown): void => {
  stored = JSON.stringify({ v: SAVE_VERSION, savedAt: Date.now(), game });
};

beforeEach(() => { stored = null; });

describe('★ a save from before a feature existed still loads', () => {
  it('fills every field the old save never had', async () => {
    put(OLD);
    const back = await load();
    expect(back, 'the save was refused outright').not.toBeNull();
    for (const [k, v] of Object.entries(initial())) {
      const got = back!.game[k as keyof Game];
      expect(got, `"${k}" came back undefined — a new field would be NaN`).toBeDefined();
      if (!(k in OLD)) expect(got, `"${k}" did not take its default`).toEqual(v);
    }
  });

  it('keeps what the old save DID hold', async () => {
    put(OLD);
    const back = await load();
    expect(back!.game.paces).toBe(12);
    expect(back!.game.at).toBe(START);
  });

  it('and the run still moves afterwards', async () => {
    put(OLD);
    const back = await load();
    const on = apply(back!.game, { type: 'tick', secs: SECS_PER_PACE });
    // ⚠️ NOT 13. The old save carries no `settled`, so it takes the default —
    // the start settled — and three seconds at 0.4333 pays 1 rather than 1.
    // What matters is that it pays SOMETHING and is not NaN, which is the whole
    // failure mode a missing field causes.
    expect(on.paces).toBeGreaterThan(back!.game.paces);
    expect(Number.isFinite(on.paces)).toBe(true);
  });

  it('★ refuses a NEW field that is present and wrong', async () => {
    // The other half of the rule above: absent takes the default, present and
    // nonsense is refused. Without this the leniency would be a hole.
    put({ ...OLD, settled: [9999] });
    expect(await load()).toBeNull();
    put({ ...OLD, busy: 'dancing' });
    expect(await load()).toBeNull();
    put({ ...OLD, wayfaring: -5 });
    expect(await load()).toBeNull();
    put({ ...OLD, pack: ['a-thing-that-was-never-authored'] });
    expect(await load()).toBeNull();
    put({ ...OLD, cleared: [9999] });
    expect(await load()).toBeNull();
  });

  it('★ a fight does not survive being put down', async () => {
    // Two numbers that only mean anything in front of the holder they belong
    // to. Reviving one would need the place to still be held and still be where
    // you are standing; dropping it costs a fight you can start again.
    put({ ...OLD, fight: { foe: 5, you: 5, part: 0 } });
    const back = await load();
    expect(back!.game.fight).toBeNull();
  });

  it('round-trips a live game unchanged', async () => {
    const g = apply(initial(), { type: 'tick', secs: SECS_PER_PACE * 4 });
    await save(g);
    const back = await load();
    expect(back!.game).toEqual(g);
  });
});

describe('a save that is wrong is refused rather than repaired', () => {
  // ⚠️ HONESTLY: THESE RULES OVERLAP, so no single-line sabotage turns one red.
  // Deleting `!PLACE.has(g.at)` still refuses a bad position, because
  // `seen.every(PLACE.has)` and `seen.includes(at)` between them make an
  // unreachable `at` impossible to express. That is defence in depth rather
  // than a vacuous guard — what is asserted is the OUTCOME (a broken save is
  // refused, never half-repaired), which is the thing that matters, and it is
  // recorded here so nobody later mistakes the overlap for coverage.
  it('refuses a position that is not a place', async () => {
    put({ ...OLD, at: 9999, seen: [9999] });
    expect(await load()).toBeNull();
  });

  it('refuses negative paces', async () => {
    put({ ...OLD, paces: -1 });
    expect(await load()).toBeNull();
  });

  it('refuses a half-made route pointing at nothing', async () => {
    put({ ...OLD, forging: { key: 'nonsense', left: NaN, secs: 0 } });
    expect(await load()).toBeNull();
  });

  it('refuses a save from another version', async () => {
    stored = JSON.stringify({ v: SAVE_VERSION + 1, savedAt: Date.now(), game: OLD });
    expect(await load()).toBeNull();
  });

  it('survives rubbish in storage', async () => {
    stored = 'not json at all';
    expect(await load()).toBeNull();
  });
});
