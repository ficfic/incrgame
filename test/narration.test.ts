// THE NARRATOR SAYS WHAT HAPPENED, AND IT SAYS IT IN THE VOICE.
//
// Two halves, and both have failed in this repo before:
//
//   1. THE CHOICE. `events` / `stance` in src/core/narration.ts. Nothing else
//      in the game tells the player what just happened, so a situation that
//      never fires is a screen that says nothing on the frame it matters most.
//   2. THE PROSE. 89% of this game's text once shipped BLANK and six documents
//      said otherwise; before that, the whole ticker shipped in words no beat
//      could ever teach. Both were found by looking at a screenshot. A lint on
//      the table is not a substitute for reading it — the owner edits this
//      prose — but it catches the mechanical failures for free.
//
// ---- PROVEN RED, 2026-07-29 ----------------------------------------------
//
// Each sabotage applied to the source, the suite run, the output copied from
// the terminal, the source put back.
//
//   SABOTAGE  narration.ts, `stance` loses its opening short-circuit — i.e.
//             the naive priority order, where `bottleneck` is already 'words'
//             at t=0 because production is zero
//   OBSERVED  Tests  2 failed | 20 passed (22)
//             × describes a board of two lanes, and the board has two lanes
//             × does not explain a ceiling the player has not met
//
//   SABOTAGE  narration.ts, the `checked` event loses its `tapped` clock guard
//   OBSERVED  Tests  1 failed | 21 passed (22)
//             × a hand check is told apart from a Checker doing the same thing
//
//   SABOTAGE  narration.ts, the ARRIVAL loop moved below the roster and the
//             stocks, so a new control is announced after a purchase
//   OBSERVED  Tests  1 failed | 21 passed (22)
//             × a control arriving outranks anything ongoing
//
//   SABOTAGE  narrator.ts, one line rewritten as
//             'Read and signed off. Tap the button 5 more times!'
//   OBSERVED  Tests  4 failed | 18 passed (22)
//             × quotes no number — readouts.ts owns every one of those
//             × never tells the player to press anything
//             × has no exclamation marks and asks no questions
//             × is a whole sentence, every time
import { describe, expect, it } from 'vitest';
import { apply, initialState, RETRAIN_MIN_WORDS, canWalk, words } from '../src/core/engine';
import { lanes, offered } from '../src/core/starmap';
import { events, narrate, narrateStance, narration, stance } from '../src/core/narration';
import { NARRATOR, STANDING, type NarratorLine } from '../src/content/narrator';
import type { GameState } from '../src/core/types';

const rich = (over: Partial<GameState> = {}): GameState =>
  ({ ...initialState(), solid: '1000000000', lastTick: 1000, ...over });

function walked(n: number, over: Partial<GameState> = {}): GameState {
  let s = rich(over);
  for (let guard = 0; words(s) < n && guard < n * 4 + 8; guard++) {
    const lane = lanes(s).find((l) => l.state === 'dotted' && canWalk(s, l.to));
    if (!lane) break;
    s = apply(s, { type: 'walk', to: lane.to });
  }
  return s;
}

/** Walk one new concept, and hand back both sides of the transition. */
function step(s: GameState): [GameState, GameState] {
  const lane = lanes(s).find((l) => l.state === 'dotted' && canWalk(s, l.to))!;
  return [s, apply(s, { type: 'walk', to: lane.to })];
}

const ALL: NarratorLine[] = [...Object.values(NARRATOR), ...Object.values(STANDING)];

describe('the line on the first frame', () => {
  it('describes a board of two lanes, and the board has two lanes', () => {
    // The opening line counts, which VOICE §4 P3 allows. It is only honest
    // while `offered` returns two — so the prose and the board are asserted
    // against each other rather than the sentence being trusted.
    const opening = narration(initialState());
    expect(opening).toContain('Two lanes');
    expect(offered(initialState()).length).toBe(2);
  });

  it('does not explain a ceiling the player has not met', () => {
    // `bottleneck` is already 'words' at t=0 — production is zero because
    // vocabulary is zero — so the naive priority order would open the game by
    // explaining the vocabulary cap to somebody who has walked nowhere.
    expect(stance(initialState())).toBe('open');
  });
});

describe('what just happened', () => {
  it('the first walk teaches the join', () => {
    const [before, after] = step(rich());
    expect(events(before, after)[0]).toBe('firstWord');
    expect(narrate('firstWord', after)).toContain('things you hold');
  });

  it('a later walk is a walk', () => {
    const [before, after] = step(walked(4));
    expect(events(before, after)).toContain('walked');
  });

  it('a control arriving outranks anything ongoing', () => {
    // Buying the second machine both buys a machine and opens the toggle. The
    // toggle is the line that changes what the player can do next.
    const s = walked(4);
    const after = apply(s, { type: 'buy', id: 'extractor' });
    expect(events(s, after)).toEqual(['watchOpen', 'bought']);
  });

  it('a hand check is told apart from a Checker doing the same thing', () => {
    const s = rich({ raw: '200', machines: { extractor: 1, reasoner: 0, checker: 4 } });
    // The tap: the clock does not move.
    expect(events(s, apply(s, { type: 'check' }))).toContain('checked');
    // The Checkers, converting the same pile on a tick: not news.
    expect(events(s, apply(s, { type: 'tick', dt: 1, now: 2000 }))).not.toContain('checked');
  });

  it('the toggle says which way it went', () => {
    const loose = apply(rich(), { type: 'setWatched', id: 'extractor', watched: false });
    expect(events(rich(), loose)).toContain('loose');
    expect(events(loose, apply(loose, { type: 'setWatched', id: 'extractor', watched: true })))
      .toContain('watched');
  });

  it('the first whole fact and the first whole loss are announced, and only once', () => {
    // Words, so the machines actually mint; a big unread pile, so it rots.
    const s = walked(4, { minted: '0.4', rot: '0.4', raw: '900', syntheticShare: 0.9 });
    const next = apply(s, { type: 'tick', dt: 60, now: 61000 });
    expect(events(s, next)).toEqual(expect.arrayContaining(['rot', 'minted']));
    expect(events(next, apply(next, { type: 'tick', dt: 60, now: 121000 })))
      .not.toContain('rot');
  });

  it('the ceiling is announced in both directions', () => {
    // Thirty words against one machine: the ROSTER is the limit.
    const roomy = walked(30);
    const crowded = { ...roomy, machines: { extractor: 40, reasoner: 0, checker: 0 } };
    // Buying past the vocabulary is what makes the rate stop climbing, and a
    // rate that stops climbing with nothing said about it reads as a bug.
    expect(events(roomy, crowded)).toContain('capped');
    // Walking back out from under it is the reward, and it is said too.
    expect(events(crowded, roomy)).toContain('uncapped');
  });

  it('prestige outranks everything, and arrives with its own explanation', () => {
    const ready = rich({
      held: Array.from({ length: RETRAIN_MIN_WORDS + 8 }, (_, i) => 4095 - i),
      minted: '4000',
    });
    const before = walked(4);
    // The Retrain button and the line that says what it costs land together.
    expect(events(before, ready)).toContain('retrainOpen');
    expect(events(ready, apply(ready, { type: 'retrain' }))[0]).toBe('retrained');
  });
});

describe('what is possible from here', () => {
  it('the plateau is a stance, not a loss screen', () => {
    // Capped by vocabulary AND unable to afford the next step: the failure
    // state VISION allows, and the only one.
    const stuck = { ...walked(4), solid: '0' };
    expect(stance(stuck)).toBe('plateau');
    expect(narrateStance('plateau', stuck)).not.toMatch(/[!?]/);
  });

  it('a run that can retrain says so before anything else', () => {
    const ready = rich({ held: Array.from({ length: RETRAIN_MIN_WORDS + 8 }, (_, i) => 4095 - i) });
    expect(stance(ready)).toBe('retrain');
  });

  it('every stance has a line and every line is a sentence', () => {
    for (const id of Object.keys(STANDING) as (keyof typeof STANDING)[]) {
      expect(narrateStance(id, initialState()).length).toBeGreaterThan(10);
    }
  });
});

describe('the voice curdles with the generation', () => {
  it('a second generation is told in the later register', () => {
    const gen1 = { ...initialState(), generation: 1 };
    expect(narrate('retrained', initialState())).toBe(NARRATOR.retrained.text);
    expect(narrate('retrained', gen1)).toBe(NARRATOR.retrained.later);
    expect(NARRATOR.retrained.later).not.toBe(NARRATOR.retrained.text);
  });

  it('a line with no later form reads the same either way', () => {
    expect(narrate('checked', { ...initialState(), generation: 3 }))
      .toBe(NARRATOR.checked.text);
  });
});

describe('the voice, linted (docs/VOICE.md)', () => {
  const texts = ALL.flatMap((l) => [l.text, ...(l.later ? [l.later] : [])]);

  it('quotes no number — readouts.ts owns every one of those', () => {
    // Counting in words is allowed (§4 P3, "Two ways down"). A DIGIT is a
    // quantity, and a quantity in prose is a second source of truth for it.
    for (const t of texts) expect(t, t).not.toMatch(/\d/);
  });

  it('never tells the player to press anything', () => {
    // The narrator says what happened and what is possible. "Click the blue
    // button" is the register this game does not have.
    for (const t of texts) expect(t.toLowerCase(), t).not.toMatch(/\b(click|tap|press|button)\b/);
  });

  it('uses none of the banned lexicon', () => {
    const BANNED = [
      'delve', 'tapestry', 'weave', 'echo', 'whisper', 'realm', 'ancient',
      'arcane', 'forgotten', 'journey', 'somehow', 'seems', 'perhaps',
      'uncertain', 'low-confidence', 'probably', 'you feel', 'you realise',
      'little did you know', 'unlock the secrets',
    ];
    for (const t of texts) {
      for (const w of BANNED) expect(t.toLowerCase(), `${w} in: ${t}`).not.toContain(w);
    }
  });

  it('has no exclamation marks and asks no questions', () => {
    for (const t of texts) expect(t, t).not.toMatch(/[!?]/);
  });

  it('never speaks in the first person — the graph does not talk', () => {
    for (const t of texts) expect(t, t).not.toMatch(/\b(I|I'm|my|mine)\b/);
  });

  it('is a whole sentence, every time', () => {
    for (const t of texts) {
      expect(t, t).toMatch(/^[A-Z]/);
      expect(t, t).toMatch(/\.$/);
    }
  });

  it('and the later register is shorter than the one it replaces', () => {
    // Stage 3: sentences shorten and go declarative. Not a style opinion — it
    // is the one mechanical trace of the curdle a test can hold on to.
    for (const l of ALL) {
      if (!l.later) continue;
      expect(l.later.length, `${l.later} vs ${l.text}`).toBeLessThanOrEqual(l.text.length);
    }
  });
});
