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
  it('has prose in every beat, with spans in it', () => {
    expect(STORY.beats.length).toBeGreaterThan(0);
    for (const b of STORY.beats) {
      expect(b.body.trim().length, `beat ${b.id} has no body`).toBeGreaterThan(0);
    }
    expect(STORY.beats.filter((b) => b.body.includes('⟦')).length).toBeGreaterThan(0);
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
