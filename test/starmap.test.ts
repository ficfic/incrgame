// THE STARMAP: lanes out of what you hold, in three states.
//
// The design is the LOCKED state. Hiding a lane you cannot take is less code
// and deletes the feature — an absent edge tells the player nothing, and the
// door you cannot open yet is the reason to come back. Half these tests exist
// to stop a future session "tidying up" by filtering.
import { describe, expect, it } from 'vitest';
import { apply, initialState } from '../src/core/engine';
import { lanes, laneOpen, mask, MASK_CHAR } from '../src/core/starmap';
import { STORY } from '../src/content/story';
import { CONCEPT_BUDGET } from '../src/content/ontologyMeta';
import type { GameState } from '../src/core/types';

const holding = (...ids: number[]): GameState =>
  ({ ...initialState(), lastTick: 1000, held: ids, solid: '1e9' });

describe('the story graph is usable as a map', () => {
  it('ships beats with numeric node ids at both ends', () => {
    expect(STORY.beats.length).toBeGreaterThan(0);
    for (const b of STORY.beats) {
      expect(Number.isInteger(b.at), `beat ${b.id} has a non-numeric \`at\``).toBe(true);
      for (const c of b.choices) {
        expect(Number.isInteger(c.to), `choice ${c.id} has a non-numeric \`to\``).toBe(true);
        for (const id of c.requires?.concepts ?? []) expect(Number.isInteger(id)).toBe(true);
      }
    }
  });

  it('never points at a concept outside the shipped dataset', () => {
    for (const b of STORY.beats) {
      expect(b.at).toBeLessThan(CONCEPT_BUDGET);
      for (const c of b.choices) {
        expect(c.to).toBeLessThan(CONCEPT_BUDGET);
        for (const id of c.requires?.concepts ?? []) expect(id).toBeLessThan(CONCEPT_BUDGET);
      }
    }
  });
});

describe('lanes leave only from concepts you hold', () => {
  it('offers nothing from a board you do not have', () => {
    // Holding a node no beat is told from must produce no lanes at all —
    // otherwise the map is showing routes from somewhere the player is not.
    const orphan = holding(4095);
    for (const l of lanes(orphan)) expect(l.from).toBe(4095);
  });

  it('offers lanes from the root on a fresh board', () => {
    const l = lanes(holding(0));
    expect(l.length).toBeGreaterThan(0);
    for (const lane of l) expect(lane.from).toBe(0);
  });

  it('deduplicates a route offered by many beats', () => {
    const l = lanes(holding(0));
    expect(new Set(l.map((x) => x.id)).size).toBe(l.length);
  });
});

describe('THE THREE STATES', () => {
  const fresh = lanes(holding(0));
  /** A board that HAS a locked lane. The root beat used to carry one; at
   *  concept granularity it no longer does, and hardcoding node 0 made these
   *  tests assert a property of one beat rather than of the renderer. */
  const withLock = (() => {
    for (const b of STORY.beats) {
      const gated = b.choices.find((c) => (c.requires?.concepts ?? []).length > 0);
      if (!gated) continue;
      const missing = (gated.requires?.concepts ?? [])[0]!;
      const board = holding(0, b.at);
      if (lanes(board).some((l) => l.state === 'locked')) return { board, key: missing, at: b.at };
    }
    return null;
  })();

  it('calls a lane DOTTED when it is ungated and leads somewhere unknown', () => {
    const dotted = fresh.filter((l) => l.state === 'dotted');
    expect(dotted.length).toBeGreaterThan(0);
    for (const l of dotted) {
      expect(l.missing).toEqual([]);
      expect(laneOpen(l)).toBe(true);
    }
  });

  it('calls a lane LOCKED when it is gated on a concept you lack, and keeps the key', () => {
    expect(withLock, 'no gated choice anywhere in the story graph').not.toBeNull();
    const locked = lanes(withLock!.board).filter((l) => l.state === 'locked');
    expect(locked.length).toBeGreaterThan(0);
    for (const l of locked) {
      expect(l.missing.length).toBeGreaterThan(0);
      expect(laneOpen(l)).toBe(false);
    }
  });

  it('LOCKED LANES ARE RETURNED, NOT FILTERED OUT', () => {
    // ⚠️ THE DEFECT THIS PINS. Filtering is the obvious implementation and it
    // is the whole feature deleted: a door you can see and not open is
    // motivating, an absent edge is nothing.
    expect(lanes(withLock!.board).some((l) => l.state === 'locked')).toBe(true);
  });

  it('turns a locked lane SOLID or DOTTED once its key is discovered', () => {
    const locked = lanes(withLock!.board).find((l) => l.state === 'locked')!;
    const key = locked.missing[0]!;
    const after = lanes(holding(0, withLock!.at, key));
    const same = after.find((l) => l.id === locked.id)!;
    expect(same.state).not.toBe('locked');
    expect(same.missing).toEqual([]);
  });

  it('calls a lane SOLID once its destination is on the board', () => {
    const dotted = fresh.find((l) => l.state === 'dotted')!;
    const after = lanes(holding(0, dotted.to));
    expect(after.find((l) => l.id === dotted.id)!.state).toBe('solid');
  });
});

describe('the key is shown MASKED, not named', () => {
  it('is blocks, never the word', () => {
    expect(mask('abstraction')).toBe(MASK_CHAR.repeat(11));
    expect(mask('abstraction')).not.toContain('a');
  });

  it('carries the SHAPE of the word — length is the information', () => {
    expect(mask('set').length).toBeLessThan(mask('abstraction').length);
  });

  it('clamps a long compound so it reads as a word, not a redaction bar', () => {
    expect(mask('hydrogen ion concentration').length).toBeLessThanOrEqual(12);
  });

  it('never returns an empty mask, whatever it is handed', () => {
    for (const bad of ['', undefined as unknown as string]) {
      expect(mask(bad).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('travelling a lane lands THAT concept', () => {
  // Discovery used to be `nextId++` — strictly sequential. A lane that names
  // its destination cannot be built on that: tapping "-> object" would have
  // handed you concept 4, not object.
  const openLane = (s: GameState) => lanes(s).filter(laneOpen)[0]!;

  it('lands the lane`s destination, and only that', () => {
    const s = holding(...initialState().held);
    const lane = openLane(s);
    const after = apply(s, { type: 'walk', to: lane.to });
    expect(after.held).toContain(lane.to);
    expect(after.held.length).toBe(s.held.length + 1);
  });

  it('refuses a destination no lane on the board offers', () => {
    const s = holding(...initialState().held);
    const offered = new Set(lanes(s).map((l) => l.to));
    const unreachable = [...Array(CONCEPT_BUDGET).keys()]
      .find((id) => !offered.has(id) && !s.held.includes(id))!;
    expect(apply(s, { type: 'walk', to: unreachable })).toBe(s);
  });

  it('refuses a LOCKED lane, in the reducer and not only on the button', () => {
    const s = holding(...initialState().held);
    const locked = lanes(s).find((l) => l.state === 'locked');
    if (locked) expect(apply(s, { type: 'walk', to: locked.to })).toBe(s);
  });

  it('refuses a target outside the dataset', () => {
    const s = holding(...initialState().held);
    for (const bad of [-1, CONCEPT_BUDGET, CONCEPT_BUDGET + 1, 1.5, NaN]) {
      expect(apply(s, { type: 'walk', to: bad })).toBe(s);
    }
  });

  it('costs nothing to walk back somewhere you already hold', () => {
    const s = holding(...initialState().held);
    const lane = openLane(s);
    const once = apply(s, { type: 'walk', to: lane.to });
    const back = apply(once, { type: 'walk', to: lane.to });
    expect(back.solid).toBe(once.solid);
    expect(back.held.length).toBe(once.held.length);
  });
});
