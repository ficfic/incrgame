// THE TICKER SPEAKS THE LANGUAGE.
//
// The dock sits directly above the beat. The beat has been foreign since
// 2026-07-27; the dock above it was still reading "something you never checked
// wore out" in plain English, in the same frame, which tells the player the
// foreign half is decoration.
//
// ⚠️ THESE ASSERT AGAINST LITERALS FROM docs/graph/language.json, ON PURPOSE,
// for the reason test/masking.test.ts states: a test that gets its expected
// value from the function under test moves both sides when that function
// breaks, and passes with the mechanic destroyed. `speak(x)` compared against
// `speak(x)` would pass with translation deleted.
import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { observeTransition, say, speak, ticker } from '../src/shell/ticker';
import { LANGUAGE } from '../src/content/language';
import { initialState } from '../src/core/engine';
import { knownWords } from '../src/core/literacy';
import { STORY } from '../src/content/story';
import { READOUTS } from '../src/core/readouts';
import { MACHINES } from '../src/content/machines';

const NOTHING = new Set<string>();

/** The last line on the dock, as a player would read it. */
const last = (): string => get(ticker).at(-1)?.text ?? '';

describe('a ticker line is carrier vocabulary, and resolves like one', () => {
  it('translates the line play.png showed in English', () => {
    // The exact string from the screenshot, word for word.
    const line = 'something you never checked wore out';
    const foreign = line.split(' ').map((w) => LANGUAGE.words[w]);
    // Every word of it has a form. Before this item, four of the six did not
    // exist in the corpus at all, because the corpus was the beats only.
    expect(foreign.every(Boolean), `no form for: ${line.split(' ')
      .filter((w) => !LANGUAGE.words[w]).join(', ')}`).toBe(true);
    expect(speak(line, NOTHING)).toBe(foreign.join(' '));
    expect(speak(line, NOTHING)).not.toContain('checked');
  });

  it('KEEPS THE NUMBERS. Digits were never English', () => {
    // `3 / 4075` is legible to anyone. Masking a number would be masking the
    // one thing on screen that needs no vocabulary.
    const out = speak('Extractor #30 online · 1.5K', NOTHING);
    expect(out).toContain('#30');
    expect(out).toContain('1.5K');
    expect(out).not.toContain('Extractor');
    expect(out).not.toContain('online');
  });

  it('keeps the capital, so a foreign sentence still opens with one', () => {
    const solid = LANGUAGE.words['solid']!;
    expect(speak('Solid', NOTHING)).toBe(solid.charAt(0).toUpperCase() + solid.slice(1));
  });

  it('reads back in English once the player knows the words', () => {
    const line = 'something you never checked wore out';
    expect(speak(line, new Set(line.split(' ')))).toBe(line);
  });
});

describe('every word the ticker can emit has a form', () => {
  // The coverage rule, asserted from the ENGINE side as well as from
  // check:story. A noun or a machine label that reaches the dock without a
  // translation is shown in English by default (literacy.ts, "nothing to hide
  // it behind") — silently, which is what makes it worth a test.
  it('covers the four readout nouns', () => {
    for (const r of Object.values(READOUTS)) {
      expect(LANGUAGE.words[r.noun.toLowerCase()], `no form for ${r.noun}`).toBeTruthy();
    }
  });

  it('covers every machine label', () => {
    for (const m of Object.values(MACHINES)) {
      expect(LANGUAGE.words[m.label.toLowerCase()], `no form for ${m.label}`).toBeTruthy();
    }
  });
});

describe('the dock, end to end', () => {
  it('emits a real transition in the graph tongue, not in English', () => {
    // A bought machine. `observeTransition` is the only way a line reaches the
    // dock in play, so this goes through it rather than calling `say`.
    const prev = initialState();
    const next = { ...prev, machines: { ...prev.machines, extractor: prev.machines.extractor + 1 } };
    observeTransition(prev, next);
    const text = last();
    expect(text).toContain(`#${next.machines.extractor}`);
    expect(text).not.toContain(MACHINES.extractor.label);
    expect(text).not.toContain('online');
  });

  it('RE-READS A LIVE LINE as the player learns, rather than freezing it', () => {
    // A line lives 45 seconds. Translating at emit would leave a word learned
    // during those 45 seconds foreign until the next line — the same reason
    // masking is retroactive (DECISIONS 2026-07-27). It is also what saves the
    // away-return line, which `resumeFromGap` emits BEFORE the first tick, when
    // no transition has been observed and literacy is still empty.
    const LINE = 'the machines are ahead';
    say('test:retro', LINE);
    const id = get(ticker).at(-1)!.id;
    expect(last()).toBe(speak(LINE, NOTHING));
    expect(last()).not.toContain('the ');

    // Now make the player literate: standing in every beat is what teaches
    // carrier words, and `the` is the commonest word in the corpus.
    const s = initialState();
    const everywhere = { ...s, held: STORY.beats.map((b) => b.at) };
    expect(knownWords(everywhere).has('the')).toBe(true);
    observeTransition(everywhere, everywhere);

    // SAME LINE — not a new one — and three of its four words now read in
    // English, live, without a new line being emitted.
    expect(get(ticker).at(-1)!.id).toBe(id);
    expect(last()).toBe(`the machines are ${LANGUAGE.words['ahead']}`);
  });

  it('MEASURES THE CEILING: a word in no beat is never learnable', () => {
    // ⚠️ THIS ASSERTS A LIMITATION, NOT A FEATURE, and it is here so the next
    // session meets the number instead of rediscovering it.
    //
    // Carrier literacy is exposure across the beats the player has stood in
    // (literacy.ts). The ticker's own vocabulary is largely NOT beat
    // vocabulary: `online`, `wore`, `loose`, `ahead`, `vocabulary` and 21 more
    // appear in zero beats, so they cannot reach LEARN_AT however far a player
    // walks. Measured against the shipped corpus: 26 of the ticker's 38 word
    // types are permanently foreign, 12 are learnable.
    //
    // That is the same open question as the HUD's four labels — a word that
    // names a thing you DO cannot be taught by reading — and it is on the
    // backlog as its own item rather than settled here on the way past.
    const everywhere = { ...initialState(), held: STORY.beats.map((b) => b.at) };
    const known = knownWords(everywhere);
    expect(known.has('machines')).toBe(true);   // beat vocabulary: learnable
    expect(known.has('ahead')).toBe(false);     // ticker-only: never learnable
    expect(known.has('online')).toBe(false);
    expect(LANGUAGE.words['ahead'], 'it still HAS a word — that half is fixed').toBeTruthy();
  });
});
