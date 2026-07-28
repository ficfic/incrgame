// ONE WORD, ONE QUANTITY — enforced here, not promised in a comment.
//
// The board once reported "graph: 25 nodes" while the HUD reported
// "3 recovered", at the same moment, both correct, because two surfaces each
// reached into raw state and picked a word. `readouts.ts` is where that is
// decided now. The 11-agent review then found something worse: the HUD never
// called it at all, so the rule READ as enforced and was not.
//
// This file cannot fix a surface that ignores the module. What it can do is
// pin the module itself: four nouns, unique, each with a short definition and a
// number that comes from the save rather than from a second calculation.
import { describe, expect, it } from 'vitest';
import { EXPLAIN_MAX_WORDS, NOUNS, READOUTS, type Readout } from '../src/core/readouts';
import { apply, initialState, words } from '../src/core/engine';
import { READABLE_CONCEPTS } from '../src/content/ontologyMeta';
import { SEED_NODES } from '../src/content/seed';
import type { GameState } from '../src/core/types';

const played = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(),
  held: [...SEED_NODES, 300, 301, 302],
  solid: '1234',
  raw: '56',
  rot: '7',
  ...over,
});

describe('the vocabulary is four words and no more', () => {
  it('declares exactly Words, Solid, Raw and Rot', () => {
    // Four rows. Not five, not twelve. Adding a fifth is a design decision and
    // has to break a test before it becomes a HUD cell.
    expect(NOUNS).toEqual(['Words', 'Solid', 'Raw', 'Rot']);
  });

  it('never lets two readouts share a word', () => {
    expect(new Set(NOUNS).size).toBe(NOUNS.length);
  });

  it('explains each in five words or fewer', () => {
    for (const [id, r] of Object.entries(READOUTS) as Array<[string, Readout]>) {
      const n = r.explain.trim().split(/\s+/).length;
      expect(n, `${id}: "${r.explain}" is ${n} words`).toBeGreaterThan(0);
      expect(n, `${id}: "${r.explain}" is ${n} words`).toBeLessThanOrEqual(EXPLAIN_MAX_WORDS);
    }
  });

  it('gives every explanation in lower case, so it reads as a definition', () => {
    for (const r of Object.values(READOUTS) as Readout[]) expect(r.explain[0]).toBe(r.explain[0]!.toLowerCase());
  });
});

describe('every number comes from the save, not from a second calculation', () => {
  it('reads Solid, Raw and Rot straight off the state', () => {
    const s = played();
    expect(READOUTS.solid.count(s).toString()).toBe('1234');
    expect(READOUTS.raw.count(s).toString()).toBe('56');
    expect(READOUTS.rot.count(s).toString()).toBe('7');
  });

  it('derives Words from the concepts held, so it cannot disagree with the board', () => {
    const s = played();
    expect(READOUTS.words.count(s).toNumber()).toBe(3);
    expect(READOUTS.words.count(s).toNumber()).toBe(words(s));
  });

  it('gives Words the only fraction in the game, with a real denominator', () => {
    expect(READOUTS.words.of().toNumber()).toBe(READABLE_CONCEPTS);
    // ...and nothing else has one. Every other percentage this economy showed
    // was a ratio between two quantities the player could not separately see.
    for (const [id, r] of Object.entries(READOUTS) as Array<[string, Readout]>) {
      if (id !== 'words') expect(r.of, `${id} has a denominator`).toBeUndefined();
    }
  });

  it('holds the numbers a full tick produces', () => {
    const s = played({ raw: '1000', machines: { extractor: 0, reasoner: 0, checker: 2 } });
    const after = apply(s, { type: 'tick', dt: 10 });
    expect(READOUTS.solid.count(after).toNumber()).toBeGreaterThan(1234);
    expect(READOUTS.raw.count(after).toNumber()).toBeLessThan(1000);
    expect(READOUTS.rot.count(after).toNumber()).toBeGreaterThan(7);
  });
});
