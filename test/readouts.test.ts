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
import { RETRAIN_MIN_WORDS, apply, canRetrain, canWalk, initialState, words } from '../src/core/engine';
import { lanes } from '../src/core/starmap';
import { LEARN_AT } from '../src/core/literacy';
import { LANGUAGE } from '../src/content/language';
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

// ---- THE HUD IS UNLEARNED, NOT ABSENT -------------------------------------
//
// Every noun above has a foreign form in `docs/graph/language.json`, so the HUD
// speaks the graph's tongue like the beats do. Carrier words are normally
// learned by FREQUENCY over the beats the player has stood in — but no beat
// ever says "Solid", so `canRead` would hide all four forever, and a
// permanently unreadable HUD is a wall rather than a game. `learned` is the
// other way in: you can read the word for a quantity once you have made that
// quantity happen.
//
// ⚠️ THE PROPERTY THIS FILE EXISTS TO DEFEND IS MONOTONICITY. Solid and Raw are
// stocks that go DOWN — spending them is the game — so gating a word on its own
// stock unlearns it every time the player buys something, and a word taken back
// is the one thing VISION forbids. Two of the tests below are written against
// exactly that mistake, because it is the obvious implementation.

/** A concept id that is not part of the seed, so it counts toward Words. */
const NEW_CONCEPTS = Array.from({ length: 400 }, (_, i) => 3000 + i);
const holding = (n: number): number[] => [...SEED_NODES, ...NEW_CONCEPTS.slice(0, n)];

const IDS = ['words', 'solid', 'raw', 'rot'] as const;
const reads = (s: GameState): Record<string, boolean> =>
  Object.fromEntries(IDS.map((id) => [id, READOUTS[id].learned(s)]));

describe('the four nouns can actually be hidden', () => {
  it('has a foreign form for every one of them', () => {
    // WITHOUT THIS THE WHOLE MECHANIC IS A NO-OP AND SILENTLY SO. `canRead`
    // returns TRUE for a word the corpus has nothing to hide behind
    // (literacy.ts), so a missing form does not throw — it just renders the
    // HUD in English on a screen built to be unreadable. This is the check
    // that notices, and `scripts/lib/chrome-corpus.mjs` is what keeps it true.
    for (const noun of NOUNS) {
      expect(LANGUAGE.words[noun.toLowerCase()], `no foreign form for "${noun}"`).toBeTruthy();
    }
  });
});

describe('a word is earned by making the quantity happen', () => {
  it('reads NOTHING on the opening screen', () => {
    // A run opens holding 18 Solid and one Extractor. Both are a GRANT, not
    // something the player did, so neither may teach a word.
    expect(reads(initialState())).toEqual({ words: false, solid: false, raw: false, rot: false });
  });

  it('teaches Words at three concepts, and not at two', () => {
    expect(READOUTS.words.learned(played({ held: holding(LEARN_AT - 1) }))).toBe(false);
    expect(READOUTS.words.learned(played({ held: holding(LEARN_AT) }))).toBe(true);
  });

  it('teaches Solid by BUYING with it, never by holding it', () => {
    // The distinction is the whole rule. A huge pile you were given teaches
    // nothing; one purchase teaches the word.
    const rich = played({ held: holding(1), solid: '1e9', raw: '0', rot: '0' });
    expect(READOUTS.solid.learned(rich)).toBe(false);
    expect(READOUTS.solid.learned(apply(rich, { type: 'buy', id: 'extractor' }))).toBe(true);
  });

  it('teaches Raw and Rot later than the row that shows them', () => {
    // DECISIONS 2026-07-28: a substance joins the bar at ONE WHOLE FACT. If the
    // word arrived with the row, no label would ever be read foreign and this
    // would be decoration. So there must be a state where the number is on
    // screen and its name is not.
    const showing = played({ held: holding(1), solid: '0', raw: '1', rot: '1' });
    expect(READOUTS.raw.count(showing).gte(1)).toBe(true);
    expect(READOUTS.rot.count(showing).gte(1)).toBe(true);
    expect(READOUTS.rot.learned(showing)).toBe(false);
    expect(READOUTS.rot.learned(played({ held: holding(1), raw: '0', rot: '3' }))).toBe(true);
  });

  it('teaches Raw from what it decays into, never from the pile itself', () => {
    // A pile you have not lost anything from teaches nothing, however big.
    const piled = played({ held: holding(1), solid: '0', raw: '900', rot: '0' });
    expect(READOUTS.raw.count(piled).gte(1)).toBe(true);
    expect(READOUTS.raw.learned(piled)).toBe(false);
    // One whole fact worn out, and the word arrives — and stays after a Check
    // empties the pile, because Rot cannot go back down.
    const worn = played({ held: holding(1), raw: '900', rot: '1' });
    expect(READOUTS.raw.learned(worn)).toBe(true);
    expect(READOUTS.raw.learned({ ...worn, raw: '0' })).toBe(true);
  });

  it('cannot be taken back by tapping Check, which is how the first rule failed',
    () => {
      // ★ MEASURED, NOT ARGUED. `learned: (s) => D(s.raw).gte(LEARN_AT)` shipped
      // in the first draft of this rule and passed every other test here. A
      // loose Extractor taught the word at raw 3.02 / rot 0.023 after 7.5
      // seconds of ticks, and fifty taps of Check took it straight back — the
      // HUD unlearning a noun while the player was playing correctly. This runs
      // that exact sequence against the real engine.
      let s = played({
        held: holding(5), solid: '1000', raw: '0', rot: '0',
        watched: { extractor: false, reasoner: true },
      });
      for (let i = 0; i < 600 && !READOUTS.raw.learned(s); i++) {
        s = apply(s, { type: 'tick', dt: 0.1 });
      }
      expect(READOUTS.raw.learned(s), 'a loose machine never taught Raw at all').toBe(true);
      expect(READOUTS.raw.count(s).gt(0)).toBe(true);
      for (let i = 0; i < 50; i++) s = apply(s, { type: 'check' });
      expect(READOUTS.raw.count(s).toNumber()).toBe(0);
      expect(READOUTS.raw.learned(s)).toBe(true);
    });
});

describe('a word once read is never taken back', () => {
  it('survives spending every last Solid', () => {
    // ★ THE SABOTAGE THIS TEST IS FOR: `learned: (s) => D(s.solid).gte(LEARN_AT)`.
    // It passes every other test in this file and unlearns the noun the moment
    // the player empties their purse, which is most of an incremental game.
    const bought = apply(played({ held: holding(1), solid: '1000' }), { type: 'buy', id: 'extractor' });
    expect(READOUTS.solid.learned(bought)).toBe(true);
    expect(READOUTS.solid.learned({ ...bought, solid: '0' })).toBe(true);
  });

  it('survives a Retrain, which zeroes the Rot and the purse underneath', () => {
    const veteran = played({
      held: holding(RETRAIN_MIN_WORDS),
      solid: '5000', raw: '50', rot: '50', minted: '400',
      machines: { extractor: 9, reasoner: 1, checker: 1 },
    });
    expect(reads(veteran)).toEqual({ words: true, solid: true, raw: true, rot: true });
    expect(canRetrain(veteran)).toBe(true);

    const next = apply(veteran, { type: 'retrain' });
    // The evidence underneath two of the four is gone: the purse is back to its
    // opening grant and Rot is zero. (The machines are NOT — a Retrain keeps
    // them, so the Raw it hands you is something a Checker can still claim.)
    expect(next.solid).toBe(initialState().solid);
    expect(next.rot).toBe('0');
    // The words are not.
    expect(reads(next)).toEqual({ words: true, solid: true, raw: true, rot: true });
  });

  it('is monotone across a whole run, tick by tick', () => {
    // The general property, checked rather than argued: replay a run that
    // buys, walks, checks and idles, and assert no readout ever goes from
    // readable back to unreadable.
    let s = played({ held: [...SEED_NODES], solid: '400', raw: '0', rot: '0' });
    const seen: Record<string, boolean> = { words: false, solid: false, raw: false, rot: false };
    const step = (next: GameState): void => {
      s = next;
      for (const id of IDS) {
        const now = READOUTS[id].learned(s);
        expect(!(seen[id] && !now), `${id} was readable and stopped being`).toBe(true);
        seen[id] ||= now;
      }
    };
    step(apply(s, { type: 'buy', id: 'extractor' }));
    // Real lanes out of the real story graph — `canWalk` refuses anything else,
    // and a walk that silently did nothing would make this test vacuous.
    for (let i = 0; i < LEARN_AT; i++) {
      const open = lanes(s).find((l) => l.state === 'dotted' && canWalk(s, l.to));
      expect(open, `no open lane at step ${i}`).toBeTruthy();
      step(apply(s, { type: 'walk', to: open!.to }));
    }
    step(apply(s, { type: 'setWatched', id: 'extractor', watched: false }));
    for (let i = 0; i < 60; i++) step(apply(s, { type: 'tick', dt: 5 }));
    for (let i = 0; i < 40; i++) step(apply(s, { type: 'check' }));
    for (let i = 0; i < 30; i++) step(apply(s, { type: 'tick', dt: 30 }));
    // ...and the run really did teach all four, or this proves nothing.
    expect(seen).toEqual({ words: true, solid: true, raw: true, rot: true });
  });
});
