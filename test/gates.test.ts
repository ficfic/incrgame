// VOCABULARY-GATED CHOICES.
//
// A choice can require concepts and relation types you must already have
// discovered. The rule is one sentence, and every test here defends one half of
// it: A CHOICE YOU CANNOT MEET IS SHOWN AND NOT TAKEABLE, NEVER HIDDEN.
//
// The easy implementation filters the list, and it destroys the mechanic — the
// locked door is the only thing in the game that says what discovering more of
// the graph is FOR. The other half is the softlock: a modal you cannot leave is
// an unrecoverable save, so if nothing is takeable everything opens.
import { describe, expect, it } from 'vitest';
import {
  apply, canTakeChoice, choicesFor, initialState, knownConcepts, knownRels, missingFor,
} from '../src/core/engine';
import type { GameState, Vignette, VignetteChoice } from '../src/core/types';

const choice = (id: string, requires?: VignetteChoice['requires']): VignetteChoice => ({
  id, label: id, effects: {}, ...(requires ? { requires } : {}),
});

/** A board holding concepts 0..n and one drawn edge of each listed rel. */
const board = (concepts: number[], rels: number[] = []): GameState => {
  const base = initialState(1);
  return {
    ...base, lastTick: 1000,
    forged: {
      ...base.forged,
      anchors: concepts,
      edges: rels.map((rel, i) => ({ a: 0, b: i + 1, rel, checked: true, fake: false })),
    },
  };
};

describe('what counts as known', () => {
  it('counts every concept on the board, in context or not', () => {
    // Falling out of the context window is about what the model is HOLDING.
    // It is still a word you have seen, and gating story on the window would
    // make a beat unwinnable for the crime of playing on.
    const s = { ...board([0, 1, 2, 3]), contextWindow: 2 };
    expect(knownConcepts(s)).toEqual(new Set([0, 1, 2, 3]));
  });

  it('counts a relation type the moment one is DRAWN, confirmed or not', () => {
    const s = board([0, 1, 2], [0, 2]);
    expect(knownRels(s)).toEqual(new Set([0, 2]));
    expect(knownRels(board([0]))).toEqual(new Set());
  });
});

describe('a gate opens only when everything it asks for is known', () => {
  it('is open when there is no gate at all', () => {
    expect(canTakeChoice(board([0]), choice('free'))).toBe(true);
  });

  it('is shut while a required concept is missing, and names it', () => {
    const c = choice('c', { concepts: [7, 9], rels: [] });
    const s = board([0, 1, 7]);
    expect(canTakeChoice(s, c)).toBe(false);
    expect(missingFor(s, c)).toEqual({ concepts: [9], rels: [] });
  });

  it('is shut while a required relation is missing, and names it', () => {
    const c = choice('c', { concepts: [], rels: [1, 3] });
    const s = board([0, 1], [1]);
    expect(canTakeChoice(s, c)).toBe(false);
    expect(missingFor(s, c)).toEqual({ concepts: [], rels: [3] });
  });

  it('opens once the last missing word arrives', () => {
    const c = choice('c', { concepts: [5], rels: [2] });
    expect(canTakeChoice(board([0, 5], [2]), c)).toBe(true);
    expect(missingFor(board([0, 5], [2]), c)).toEqual({ concepts: [], rels: [] });
  });
});

describe('THE LOCKED DOOR IS DRAWN', () => {
  const beat: Vignette = {
    id: 'v', trigger: {}, title: 't', body: 'b',
    choices: [choice('open'), choice('shut', { concepts: [999], rels: [] })],
  };

  it('returns EVERY choice, locked ones included', () => {
    // ⚠️ THE DEFECT THIS PINS. Filtering is the obvious implementation and it
    // deletes the mechanic: a door that is not drawn tells the player nothing,
    // and they never learn that discovering more would have opened it.
    const got = choicesFor(board([0, 1]), beat);
    expect(got).toHaveLength(2);
    expect(got.map((m) => m.choice.id)).toEqual(['open', 'shut']);
  });

  it('marks which is which, and carries what the shut one wants', () => {
    const got = choicesFor(board([0, 1]), beat);
    expect(got[0]!.takeable).toBe(true);
    expect(got[1]!.takeable).toBe(false);
    expect(got[1]!.missing.concepts).toEqual([999]);
  });

  it('opens the door once the concept is discovered', () => {
    const got = choicesFor(board([0, 999]), beat);
    expect(got.every((m) => m.takeable)).toBe(true);
  });
});

describe('NEVER A BEAT WITH NO WAY OUT', () => {
  // `check:story` guarantees the DATA always ships an ungated exit. A modal with
  // no exit is an unrecoverable save, though, and "the data promised" is not a
  // thing to bet a save file on. Fail OPEN: a gate bypassed in a case that
  // should never happen costs a gate; failing closed costs the game.
  const sealed: Vignette = {
    id: 'sealed', trigger: {}, title: 't', body: 'b',
    choices: [
      choice('a', { concepts: [4000], rels: [] }),
      choice('b', { concepts: [], rels: [9] }),
    ],
  };

  it('opens every choice when the data left none takeable', () => {
    const got = choicesFor(board([0, 1]), sealed);
    expect(got).toHaveLength(2);
    expect(got.every((m) => m.takeable)).toBe(true);
  });

  it('still reports honestly WHAT was missing, so this is visible not silent', () => {
    const got = choicesFor(board([0, 1]), sealed);
    expect(got[0]!.missing.concepts).toEqual([4000]);
    expect(got[1]!.missing.rels).toEqual([9]);
  });

  it('does not fail open when even one choice is genuinely takeable', () => {
    const got = choicesFor(board([0, 1]), {
      ...sealed, choices: [...sealed.choices, choice('exit')],
    });
    expect(got.filter((m) => m.takeable).map((m) => m.choice.id)).toEqual(['exit']);
  });
});

describe('the reducer enforces it, not just the button', () => {
  // A disabled button is a suggestion. Every gate in this repo that lived only
  // in the UI has been walked around at least once — by the play probe, which
  // force-clicks everything it can find.
  //
  // `apply` looks vignettes up in the shipped roster by id, so there is no seam
  // to inject through: the test gates a REAL choice, asserts, and puts it back.
  it('refuses a locked choice on a real shipped vignette', async () => {
    const { VIGNETTES } = await import('../src/content/vignettes');
    const v = VIGNETTES[0]!;
    // Non-vacuity: this test means nothing without a second, ungated choice —
    // gate the only exit and the softlock guard correctly opens it again.
    expect(v.choices.length).toBeGreaterThan(1);

    const original = v.choices[0]!;
    v.choices[0] = { ...original, requires: { concepts: [4095], rels: [] } };
    try {
      const s = { ...board([0, 1]), vignette: { active: v.id, seen: [] } };
      const after = apply(s, { type: 'chooseOption', eventId: v.id, choiceId: original.id });
      expect(after).toBe(s);                       // refused, state untouched
      // ...and the ungated sibling still works, so this is a gate and not a
      // reducer that stopped accepting choices altogether.
      const ok = apply(s, { type: 'chooseOption', eventId: v.id, choiceId: v.choices[1]!.id });
      expect(ok).not.toBe(s);
      expect(ok.vignette.seen).toContain(v.id);
    } finally {
      v.choices[0] = original;
    }
  });
});
