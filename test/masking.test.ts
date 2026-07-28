// THE MASKING RENDERER.
//
// Beat text carries ⟦spans⟧. A span whose concept you have discovered shows the
// English label; one you have not shows the graph's own word. Everything
// OUTSIDE the brackets is never touched.
//
// Two rules carry the whole design and each has a test whose only job is to
// stop a future session breaking it:
//   · unbracketed text is never masked, however much it looks like a concept
//   · the graph's words are never truncated — kin share a prefix, and the
//     shared prefix is the mechanic
import { describe, expect, it } from 'vitest';
import { beatConcepts, maskedText, renderMasked } from '../src/core/masking';
import { graphWord, LEXICON } from '../src/content/lexicon';
import { STORY } from '../src/content/story';
import { currentBeat } from '../src/core/starmap';
import { apply, initialState } from '../src/core/engine';
import type { GameState, StoryBeat } from '../src/core/types';

const labelOf = (id: number) => (id === 1 ? 'abstraction' : null);
const render = (text: string, beat: StoryBeat, known: number[]) =>
  renderMasked(text, beatConcepts(beat, labelOf), new Set(known), graphWord);
const flat = (text: string, beat: StoryBeat, known: number[]) =>
  maskedText(render(text, beat, known));

const beat0 = STORY.beats[0]!;

const holding = (...ids: number[]): GameState => {
  const base = initialState(1);
  return { ...base, lastTick: 1000, forged: { ...base.forged, anchors: ids, nextId: Math.max(...ids) + 1 } };
};

describe('the shipped data is renderable', () => {
  it('has prose where prose is written, and a safe render where it is not', () => {
    // ⚠️ THIS ASSERTION WAS "every beat has a body", and it was right for 27
    // beats and wrong for 446. Beats are at CONCEPT granularity now: most of
    // them are places the player can stand with nothing written for them yet,
    // and `check:story` treats that as legitimate. So the invariant is not
    // "always written" — it is "written where written, and never a broken
    // surface where not".
    expect(STORY.beats.length).toBeGreaterThan(0);
    const written = STORY.beats.filter((b) => b.body.trim().length > 0);
    expect(written.length).toBeGreaterThan(0);
    expect(written.some((b) => b.body.includes('⟦'))).toBe(true);
    // The opening beat must always be written — it is the first thing a new
    // save shows, and an empty one is the game failing to start.
    const root = STORY.beats.find((b) => b.at === 0)!;
    expect(root.body.trim().length, 'the opening beat has no prose').toBeGreaterThan(0);
  });

  it('EVERY CHOICE RENDERS A LIVE BUTTON, written label or not', () => {
    // ⚠️ THE DEFECT THIS PINS, and it is in the shipped data: 1,799 of 1,879
    // choices have no label, because beats went to concept granularity and the
    // prose has not caught up. Rendered verbatim that is a screen of blank
    // buttons — docs/VOICE.md §4 P5, "a label of pure blocks is a dead button".
    //
    // The renderer falls back to a span naming the destination, which is data
    // and goes through the same masking path. This asserts the fallback, not
    // the data: it must keep passing as the owner writes real labels.
    const label = (c: { label: string; toLabel: string }) =>
      (c.label.trim() ? c.label : `⟦${c.toLabel}⟧`);
    let fellBack = 0;
    for (const b of STORY.beats) {
      const table = beatConcepts(b, () => null);
      for (const c of b.choices) {
        if (!c.label.trim()) fellBack++;
        const out = maskedText(renderMasked(label(c), table, new Set(), graphWord));
        expect(out.trim().length, `${b.id}/${c.id} renders a blank button`).toBeGreaterThan(0);
        expect(out).not.toMatch(/[⟦⟧]/);
      }
    }
    // Non-vacuity: if the data were complete this test would prove nothing, so
    // say out loud that the fallback is actually carrying the screen today.
    expect(fellBack).toBeGreaterThan(0);
  });

  it('gives every concept in the dataset a word', () => {
    expect(LEXICON.words).toHaveLength(LEXICON.concepts);
    for (const w of LEXICON.words) expect(w.length).toBeGreaterThan(0);
  });

  it('every span in every beat resolves against that beat OR stays visible', () => {
    // Failing open is the contract: an unresolved span shows English. This
    // asserts the renderer never emits an empty or bracket-bearing result.
    for (const b of STORY.beats) {
      const table = beatConcepts(b, () => null);
      for (const field of [b.title, b.body, ...b.choices.map((c) => c.label)]) {
        const out = maskedText(renderMasked(field, table, new Set(), graphWord));
        expect(out, `${b.id}: brackets survived`).not.toMatch(/[⟦⟧]/);
        if (field.trim()) expect(out.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('only bracketed spans are substituted', () => {
  it('NEVER touches text outside the brackets', () => {
    // ⚠️ THE DEFECT THIS PINS, and it is why lemma matching is banned: "set",
    // "thing" and "state" are concepts AND ordinary English. A renderer that
    // scans prose for concept words masks the verb and breaks the sentence.
    const beat: StoryBeat = {
      ...beat0, at: 3, atLabel: 'thing',
      body: 'Set the thing down and state your case. ⟦thing⟧ is filed.',
      choices: [],
    };
    const out = flat(beat.body, beat, []);
    expect(out).toContain('Set the thing down and state your case.');
    expect(out).toContain(graphWord(3));
  });

  it('leaves an unresolvable span as its English word rather than guessing', () => {
    const beat: StoryBeat = { ...beat0, atLabel: 'entity', at: 0, body: '⟦nowhere⟧ stands.', choices: [] };
    expect(flat(beat.body, beat, [])).toBe('nowhere stands.');
  });

  it('preserves the surrounding punctuation and spacing exactly', () => {
    const beat: StoryBeat = { ...beat0, at: 0, atLabel: 'entity', body: 'a ⟦entity⟧, b.', choices: [] };
    expect(flat(beat.body, beat, [0])).toBe('a entity, b.');
    expect(flat(beat.body, beat, [])).toBe(`a ${graphWord(0)}, b.`);
  });
});

describe('discovery binds a word, everywhere', () => {
  it('shows the graph word before, the English label after', () => {
    const before = render(beat0.body, beat0, []);
    const after = render(beat0.body, beat0, [beat0.at]);
    const span = (segs: typeof before) => segs.find((s) => s.concept === beat0.at)!;
    expect(span(before).masked).toBe(true);
    expect(span(before).text).toBe(graphWord(beat0.at));
    expect(span(after).masked).toBeUndefined();
    expect(span(after).text).toBe(beat0.atLabel);
  });

  it('is RETROACTIVE — it is derived at render time, so nothing is stored', () => {
    // Every beat that names a concept resolves the moment you discover it,
    // including beats already read. This is free precisely because the render
    // reads live state; a cached render would be the bug.
    const naming = STORY.beats.filter((b) => b.body.includes(`⟦${beat0.atLabel}⟧`));
    expect(naming.length).toBeGreaterThan(0);
    for (const b of naming) {
      expect(flat(b.body, b, [])).not.toContain(beat0.atLabel);
      expect(flat(b.body, b, [beat0.at])).toContain(beat0.atLabel);
    }
  });
});

describe('the graph words are never truncated', () => {
  // ⚠️ THESE ASSERT AGAINST LITERALS FROM THE SHIPPED DATA, ON PURPOSE.
  //
  // The first version compared `graphWord(228)` to `graphWord(228)` rendered —
  // so truncating graphWord moved BOTH sides and the test passed with the
  // mechanic destroyed. It was watched passing under exactly that sabotage.
  // A test for "the word is not shortened" cannot get the expected word from
  // the function that shortens it.
  const KA_ENTITY = 'ka';
  const KA_PHYSICAL = 'ka-sa';        // node 2, child of entity
  const KA_OBJECT = 'ka-sa-le';       // node 15, child of physical entity
  const KA_DEEP = 'ka-sa-le-then';    // node 228, child of object

  it('renders the whole word, prefix and all', () => {
    expect(graphWord(228)).toBe(KA_DEEP);
    const beat: StoryBeat = {
      ...beat0, at: 228, atLabel: 'x', body: '⟦x⟧ holds.', choices: [],
    };
    expect(flat(beat.body, beat, [])).toBe(`${KA_DEEP} holds.`);
  });

  it('keeps kinship visible: a child extends its parent word', () => {
    expect(graphWord(0)).toBe(KA_ENTITY);
    expect(graphWord(2)).toBe(KA_PHYSICAL);
    expect(graphWord(15)).toBe(KA_OBJECT);
    expect(KA_OBJECT.startsWith(KA_PHYSICAL)).toBe(true);
    expect(KA_DEEP.startsWith(KA_OBJECT)).toBe(true);
  });
});

describe('where the player is, derived and not stored', () => {
  it('starts at the root beat', () => {
    expect(currentBeat(holding(0))!.at).toBe(0);
  });

  it('moves to the beat of the concept just discovered', () => {
    const target = beat0.choices.find((c) => (c.requires?.concepts ?? []).length === 0)!.to;
    if (!STORY.beats.some((b) => b.at === target)) return;
    expect(currentBeat(holding(0, target))!.at).toBe(target);
  });

  it('falls back to the newest anchor that HAS a beat', () => {
    // Extract and the machines discover concepts off the story graph. Landing
    // on one of those must not strand the player with nothing to read.
    expect(currentBeat(holding(0, 4095))!.at).toBe(0);
  });

  it('travelling a choice discovers exactly that concept', () => {
    const s = holding(0);
    const c = beat0.choices.find((x) => (x.requires?.concepts ?? []).length === 0)!;
    const after = apply(s, { type: 'discover', node: c.to, parent: beat0.at });
    expect(after.bookings[0]!.node).toBe(c.to);
  });
});
