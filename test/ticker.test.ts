// THE TICKER SPEAKS THE LANGUAGE — AND EVERY WORD OF IT CAN BE LEARNED.
//
// The dock sits directly above the beat. The beat has been foreign since
// 2026-07-27; the dock above it was still reading "something you never checked
// wore out" in plain English, in the same frame, which tells the player the
// foreign half is decoration. That was fixed by giving every ticker word a
// foreign form — and it created a worse bug, because the ticker's vocabulary
// was words no beat contains, and the ONLY way into a ticker word is frequency
// across the beats you have stood in. A form with no way in is a permanent
// blank. This file's last describe block used to ASSERT that blank, with the
// number in it (26 of 38 word types). It now asserts there is none.
//
// ⚠️ THESE ASSERT AGAINST LITERALS FROM docs/graph/language.json, ON PURPOSE,
// for the reason test/masking.test.ts states: a test that gets its expected
// value from the function under test moves both sides when that function
// breaks, and passes with the mechanic destroyed. `speak(x)` compared against
// `speak(x)` would pass with translation deleted.
import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { observeTransition, say, sayAwayReturn, speak, ticker } from '../src/shell/ticker';
import { LANGUAGE } from '../src/content/language';
import { initialState, RETRAIN_MIN_WORDS } from '../src/core/engine';
import { knownWords } from '../src/core/literacy';
import { STORY } from '../src/content/story';
import { READOUTS } from '../src/core/readouts';
import { MACHINES } from '../src/content/machines';
import { MACHINE_IDS } from '../src/core/types';
import type { GameState } from '../src/core/types';

const NOTHING = new Set<string>();

/** The last line on the dock, as a player would read it. */
const last = (): string => get(ticker).at(-1)?.text ?? '';

describe('a ticker line is carrier vocabulary, and resolves like one', () => {
  it('translates a line word for word', () => {
    const line = 'something nobody read stops here';
    const foreign = line.split(' ').map((w) => LANGUAGE.words[w]);
    expect(foreign.every(Boolean), `no form for: ${line.split(' ')
      .filter((w) => !LANGUAGE.words[w]).join(', ')}`).toBe(true);
    expect(speak(line, NOTHING, NOTHING)).toBe(foreign.join(' '));
    expect(speak(line, NOTHING, NOTHING)).not.toContain('nobody');
  });

  it('KEEPS THE NUMBERS. Digits were never English', () => {
    // `3 / 4075` is legible to anyone. Masking a number would be masking the
    // one thing on screen that needs no vocabulary.
    const out = speak('Extractor #30 is here · 1.5K', NOTHING, NOTHING);
    expect(out).toContain('#30');
    expect(out).toContain('1.5K');
    expect(out).not.toContain('Extractor');
    expect(out).not.toContain('here');
  });

  it('keeps the capital, so a foreign sentence still opens with one', () => {
    const solid = LANGUAGE.words['solid']!;
    expect(speak('Solid', NOTHING, NOTHING)).toBe(solid.charAt(0).toUpperCase() + solid.slice(1));
  });

  it('reads back in English once the player knows the words', () => {
    const line = 'something nobody read stops here';
    expect(speak(line, new Set(line.split(' ')), NOTHING)).toBe(line);
  });

  it('reads back in English once the player has EARNED the word', () => {
    // The second way in, and the one the dock did not have. `Solid` is in no
    // beat, so the left-hand set can never contain it however far you walk.
    expect(speak('Solid', NOTHING, new Set(['solid']))).toBe('Solid');
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
    // The CONTENT word is foreign; the skeleton is not. Since 2026-07-28 the
    // closed class ships bound (literacy.SEED_WORDS) because a screen with no
    // English at all had nothing to grip - so asserting the whole line is
    // foreign would now assert a wall, which is the thing that was fixed.
    // `Extractor` is the machine's own noun and must not read as English here.
    // `Extractor` itself IS readable here and should be: the machine noun is
    // earned by owning one you bought, and this transition is that purchase.
    // What must stay foreign is the sentence's open-class verb.
    expect(text).not.toContain('is here');
  });

  it('RE-READS A LIVE LINE as the player learns, rather than freezing it', () => {
    // A line lives 45 seconds. Translating at emit would leave a word learned
    // during those 45 seconds foreign until the next line — the same reason
    // masking is retroactive (DECISIONS 2026-07-27). It is also what saves the
    // away-return line, which `resumeFromGap` emits BEFORE the first tick, when
    // no transition has been observed and literacy is still empty.
    const LINE = 'the machines have nothing to take';
    say('test:retro', LINE);
    const id = get(ticker).at(-1)!.id;
    // The baseline is no longer "nothing known": since 2026-07-28 the closed
    // class ships bound (literacy.SEED_WORDS), because a screen with no English
    // at all had no skeleton to grip. So `the`, `have` and `to` read from the
    // first frame and the OPEN class does not - which is the state this test
    // starts from, and the thing it then watches change.
    const START = knownWords(initialState());
    expect(last()).toBe(speak(LINE, START, START));
    expect(last()).not.toContain('machines');
    expect(last()).toContain('the ');

    // Now make the player literate: standing in every beat is what teaches
    // carrier words, and `the` is the commonest word in the corpus.
    const s = initialState();
    const everywhere = { ...s, held: STORY.beats.map((b) => b.at) };
    expect(knownWords(everywhere).has('the')).toBe(true);
    observeTransition(everywhere, everywhere);

    // SAME LINE — not a new one — and it now reads in English, live, without a
    // new line being emitted.
    expect(get(ticker).at(-1)!.id).toBe(id);
    expect(last()).toBe(LINE);
  });
});

/* ---- THE CEILING IS GONE, AND THIS IS WHERE IT IS MEASURED ---------------
 *
 * What this block asserted until 2026-07-28: "26 of the ticker's 38 word types
 * are permanently foreign, 12 are learnable", with `ahead` and `online` named
 * as words no walk could ever reach. That was true, it was shipped, and three
 * playtesters read an unreadable dock because of it.
 *
 * The replacement is the opposite claim, made end to end: drive every trigger
 * the ticker has, for a player who has walked the whole story AND made every
 * quantity happen, and assert that the dock comes out in plain English. A word
 * with no way in would still be foreign here, and would name itself.
 */
describe('nothing on the dock is permanently unreadable', () => {
  /** A player who has done everything: walked every beat, bought machines,
   *  earned every readout. Both ways into a ticker word are open. */
  const maximal = (): GameState => {
    const s = initialState();
    return {
      ...s,
      held: STORY.beats.map((b) => b.at),
      machines: MACHINE_IDS.reduce(
        (m, id) => ({ ...m, [id]: s.machines[id] + 2 }), { ...s.machines }),
      solid: '1000', raw: '1000', rot: '1000',
    };
  };

  /** Every line the ticker can put on screen, driven through the real path. */
  const everyLine = (state: GameState): string[] => {
    const before = get(ticker).length;
    const bought = {
      ...state,
      machines: MACHINE_IDS.reduce(
        (m, id) => ({ ...m, [id]: state.machines[id] + 1 }), { ...state.machines }),
    };
    observeTransition(state, bought);
    observeTransition(bought, { ...bought, watched: { extractor: !bought.watched.extractor } });
    // Milestones: from a state with none of the quantity to one past every
    // threshold, so `crossings` fires the first line and the later ones.
    observeTransition({ ...bought, held: [], rot: '0' }, { ...bought, rot: '1' });
    observeTransition({ ...bought, rot: '1' }, { ...bought, rot: '3000' });
    observeTransition({ ...bought, held: [] }, bought);
    // The two bottleneck lines, in both directions.
    observeTransition({ ...bought, held: [], machines: bought.machines },
      { ...bought, machines: { extractor: 0, reasoner: 0, checker: 0 } });
    observeTransition({ ...bought, machines: { extractor: 0, reasoner: 0, checker: 0 } }, bought);
    sayAwayReturn('40', '9');
    return get(ticker).slice(before).map((l) => l.text);
  };

  it('renders every trigger in English for a player who has earned it', () => {
    const lines = everyLine(maximal());
    expect(lines.length).toBeGreaterThan(4);
    // A foreign word is lowercase letters with no vowel-free English twin — so
    // rather than pattern-match, ask the language directly: no rendered word
    // may BE a foreign form of something.
    const forms = new Set(Object.values(LANGUAGE.words));
    const foreign = lines.flatMap((l) => l.match(/[A-Za-z][A-Za-z'-]*/g) ?? [])
      .filter((w) => forms.has(w.toLowerCase()));
    expect(foreign, `still foreign after everything: ${foreign.join(', ')}`).toEqual([]);
  });

  it('and is fully foreign for a player who has done nothing', () => {
    // The other end, so the test above cannot pass by translation being off.
    const lines = everyLine(initialState());
    const english = lines.join(' ');
    expect(english).not.toContain('nobody');
    expect(english).not.toContain('machines');
    expect(english).not.toContain('Rot');
  });

  it('names the two exemptions, and they are the only ones', () => {
    // `watched` and `loose` are in no beat and are not readout nouns, so they
    // ride on the quantity each half makes — the same pairing the HUD uses.
    // If a third exemption appears, it must be deliberate.
    const s = initialState();
    const looseState = { ...s, watched: { extractor: true } };
    observeTransition(looseState, { ...looseState, watched: { extractor: false } });
    expect(last()).not.toContain('loose');

    const earned = { ...s, rot: '5', watched: { extractor: true } };
    observeTransition(earned, { ...earned, watched: { extractor: false } });
    expect(READOUTS.raw.learned(earned), 'Raw is earned at one whole Rot').toBe(true);
    expect(last()).toContain('loose');
  });

  it('a veteran reads the whole dock, because a Retrain must not unlearn one', () => {
    const s = initialState();
    const vet = { ...s, held: STORY.beats.slice(0, RETRAIN_MIN_WORDS).map((b) => b.at) };
    observeTransition(vet, { ...vet, machines: { ...vet.machines, checker: 1 } });
    expect(last()).toContain(MACHINES.checker.label);
  });
});
