// THE SHIPPED TEXT, AND THE PLACES THAT HAVE NONE OF THEIR OWN.
//
// `build-story.mjs` stopped pre-rendering the carrier sentences and shipped
// them in the manifest instead ("the renderer fills them"). Nothing filled
// them: 396 of 446 beats had an empty title and an empty body, and ~4,700
// choices had no label, for a whole day of play. Two independent reviewers
// opened the build and called the blank panel the reason they would close it.
//
// These tests hold the ONE invariant that failure violated: every place the
// player can stand renders words, and every lane out of it says what taking it
// does.
import { describe, expect, it } from 'vitest';
import { STORY, BEAT_AT, placeAt } from '../src/content/story';
import { SEED_NODES } from '../src/content/seed';
import { exposure } from '../src/core/literacy';
import { initialState } from '../src/core/engine';

const SLOT = /\{(here|next|branch)\}/;

describe('every beat renders prose', () => {
  it('gives every beat a title and a body', () => {
    const blank = STORY.beats.filter((b) => !b.title.trim() || !b.body.trim());
    expect(blank.map((b) => b.id).slice(0, 5)).toEqual([]);
    expect(blank.length).toBe(0);
  });

  it('leaves no slot unfilled in any rendered field', () => {
    for (const b of STORY.beats) {
      expect(SLOT.test(b.title), `${b.id} title: ${b.title}`).toBe(false);
      expect(SLOT.test(b.body), `${b.id} body: ${b.body}`).toBe(false);
      for (const c of b.choices) {
        expect(SLOT.test(c.label), `${c.id} label: ${c.label}`).toBe(false);
      }
    }
  });

  it('fills {here} with the concept the beat is told from', () => {
    // The frame is the sentence; the slot is the only thing that varies, and
    // it is also the only thing masking hides. If the slot does not carry the
    // place's own label the sentence is about nowhere.
    const framed = STORY.beats.filter((x) => x.body.includes(`⟦${x.atLabel}⟧`));
    expect(framed.length).toBeGreaterThan(300);
    expect(STORY.beats[0]!.body).toContain('⟦');
  });

  it('gives every choice a label that names a movement, not just a noun', () => {
    // VOICE.md §4: "a label of pure blocks is a dead button". The four frame
    // labels are four different verbs — down, across, back up — and they are
    // the only thing distinguishing four identically-priced lanes.
    const bare = STORY.beats.flatMap((b) => b.choices).filter((c) => !c.label.trim());
    expect(bare.length).toBe(0);
    const sample = STORY.beats[0]!.choices[0]!;
    expect(sample.label).toContain(`⟦${sample.toLabel}⟧`);
  });
});

describe('a concept with no beat of its own is still a PLACE', () => {
  /** A concept some beat offers that has no beat of its own — the dead end that
   *  cost 7 Solid and moved the screen not at all. */
  const arrival = (() => {
    for (const b of STORY.beats) {
      for (const c of b.choices) if (!BEAT_AT.has(c.to)) return { b, c };
    }
    throw new Error('the dataset has no beatless destination to test');
  })();

  it('renders the leaf frame, at the leaf, in the leaf\'s own name', () => {
    const place = placeAt(arrival.c.to)!;
    expect(place).not.toBeNull();
    expect(place.at).toBe(arrival.c.to);
    expect(place.atLabel).toBe(arrival.c.toLabel);
    expect(place.frame).toBe('leaf');
    expect(place.body).toContain(`⟦${arrival.c.toLabel}⟧`);
    expect(place.title.trim().length).toBeGreaterThan(0);
  });

  it('keeps the ways on, so arriving is never a room with no doors', () => {
    const place = placeAt(arrival.c.to)!;
    expect(place.choices.length).toBeGreaterThan(0);
    // ...and never a lane back to itself, which would render as a dead button
    // labelled with where you are already standing.
    expect(place.choices.some((c) => c.to === arrival.c.to)).toBe(false);
  });

  it('is the same object twice, so the screen does not rebuild under a thumb', () => {
    expect(placeAt(arrival.c.to)).toBe(placeAt(arrival.c.to));
  });

  it('returns the authored beat when there is one, and null off the graph', () => {
    const authored = STORY.beats[0]!;
    expect(placeAt(authored.at)).toBe(authored);
    expect(placeAt(-1)).toBeNull();
  });
});

// ---- AND READING ONE TEACHES ITS WORDS -----------------------------------
//
// Carrier literacy is exposure across the places the player has STOOD IN
// (src/core/literacy.ts). A leaf is such a place — it is most of them — so if
// it did not count, the language would stop paying out at exactly the point the
// player starts arriving at leaves, which is inside the first minute.
describe('standing at a leaf counts toward reading', () => {
  const leaf = (() => {
    for (const b of STORY.beats) {
      for (const c of b.choices) if (!BEAT_AT.has(c.to) && !SEED_NODES.includes(c.to)) return c.to;
    }
    throw new Error('no beatless destination outside the seed');
  })();

  it('counts the frame the leaf renders', () => {
    const there = { ...initialState(), held: [...SEED_NODES, leaf] };
    const seen = exposure(there);
    // "Under ⟦here⟧ the tree stops. Whatever you take from here does not
    // divide again..." — the leaf frame, which is what the screen shows.
    expect(seen.get('tree')).toBeGreaterThan(0);
    expect(seen.get('stops')).toBeGreaterThan(0);
  });

  it('still counts nothing for the seed, which is held and not read', () => {
    expect(exposure(initialState()).size).toBe(0);
  });
});
