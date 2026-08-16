// ★★★ CHOOSE YOUR OWN ADVENTURE — `docs/BRIEF.md` item 6, built 2026-08-16.
//
// The brief asked for *branching, authored*. What shipped in August was a
// name, a paragraph and two buttons that paid loot and vanished: an event,
// not a story. Three things make the difference and this file holds all
// three — a SECOND BEAT, a valley that REMEMBERS, and memory changing what
// you are offered later.
import { describe, it, expect } from 'vitest';
import { apply, initial, MEETS, meetFor, meetOpen, type City } from '../src/camp/engine';

const answer = (g: City, way: number): City => apply(g, { type: 'answer', way });
const at = (i: number, over: Partial<City> = {}): City =>
  ({ ...initial(), meet: i, food: 99, ...over });

describe('★★★ THE CONTENT IS WHOLE', () => {
  it('★★★ every branch points at a meeting that exists', () => {
    // ⚠️ INDICES ARE LOAD-BEARING and a `then` is a raw one. This is the
    // check that lets the list be appended to safely.
    for (const m of MEETS) {
      for (const w of m.ways) {
        if (w.then === undefined) continue;
        expect(MEETS[w.then]).toBeDefined();
        // A branch must lead to a BEAT — landing in a scene that also gets
        // dealt on its own would tell the story out of order.
        expect(MEETS[w.then]!.beat).toBe(true);
      }
    }
  });

  it('★★★ every beat is reachable, and no beat is ever dealt cold', () => {
    const reached = new Set(MEETS.flatMap((m) => m.ways
      .map((w) => w.then).filter((n): n is number => n !== undefined)));
    MEETS.forEach((m, i) => {
      if (m.beat) expect(reached).toContain(i);          // no orphan scenes
      expect(meetOpen({ ...initial() }, i)).toBe(!m.beat && m.needs === undefined);
    });
  });

  it('★★ every way says something, and every meeting offers a real choice', () => {
    for (const m of MEETS) {
      expect(m.name.length).toBeGreaterThan(0);
      expect(m.text.length).toBeGreaterThan(20);
      expect(m.ways.length).toBeGreaterThanOrEqual(2);
      for (const w of m.ways) {
        expect(w.take.length).toBeGreaterThan(0);
        expect(w.said.length).toBeGreaterThan(0);
      }
      // ⚠️ THE ANSWERS MUST DIFFER. Two buttons that do the same thing is the
      // form of a choice with none of the substance.
      expect(new Set(m.ways.map((w) => w.take)).size).toBe(m.ways.length);
      expect(new Set(m.ways.map((w) => w.said)).size).toBe(m.ways.length);
    }
  });
});

describe('★★★ THE SECOND BEAT', () => {
  it('★★★ an answer can OPEN a scene instead of closing one', () => {
    const branching = MEETS.findIndex((m) => m.ways.some((w) => w.then !== undefined));
    expect(branching).toBeGreaterThanOrEqual(0);
    const w = MEETS[branching]!.ways.findIndex((x) => x.then !== undefined);
    const on = answer(at(branching), w);
    expect(on.meet).toBe(MEETS[branching]!.ways[w]!.then);
    // ★ And the beat itself ends the scene.
    const done = answer(on, 0);
    expect(done.meet).toBeNull();
  });

  it('★★ an answer with no branch still closes the scene', () => {
    const flat = MEETS.findIndex((m) => !m.beat && m.ways.every((w) => w.then === undefined));
    expect(answer(at(flat), 0).meet).toBeNull();
  });

  it('★★ a third way is answerable, and out-of-range is clamped not crashed', () => {
    const three = MEETS.findIndex((m) => m.ways.length > 2);
    expect(three).toBeGreaterThanOrEqual(0);
    expect(answer(at(three), 2).log.at(-1)).toBe(MEETS[three]!.ways[2]!.said);
    // ⚠️ `way` is a number now, and a stale button could send anything.
    expect(answer(at(three), 99).log.at(-1)).toBe(MEETS[three]!.ways.at(-1)!.said);
  });
});

describe('★★★ THE VALLEY REMEMBERS', () => {
  it('★★★ an answer leaves a mark, and it is not written twice', () => {
    const marked = MEETS.findIndex((m) => m.ways.some((w) => w.mark !== undefined));
    const w = MEETS[marked]!.ways.findIndex((x) => x.mark !== undefined);
    const mark = MEETS[marked]!.ways[w]!.mark!;
    const one = answer(at(marked), w);
    expect(one.marks).toContain(mark);
    const twice = answer({ ...one, meet: marked }, w);
    expect(twice.marks.filter((m) => m === mark)).toHaveLength(1);
  });

  it('★★★ a scene CLOSES once the valley has moved past it', () => {
    // ⚠️ `unless` SHIPPED DEAD: declared, branched, and used by nothing, so
    // `the-process` deleted the branch and all 947 tests stayed green. Both
    // halves of remembering have to bite — one scene opened by a mark, one
    // shut by one.
    const shut = MEETS.findIndex((m) => m.unless !== undefined);
    expect(shut).toBeGreaterThanOrEqual(0);
    const mark = MEETS[shut]!.unless!;
    expect(meetOpen(initial(), shut)).toBe(true);
    expect(meetOpen({ ...initial(), marks: [mark] }, shut)).toBe(false);
    // ★ And the walk skips it rather than going silent.
    const past = { ...initial(), marks: [mark] };
    for (let f = 1; f < 20; f += 2) {
      const i = meetFor(past, f);
      expect(i).not.toBeNull();
      expect(i).not.toBe(shut);
    }
  });

  it('★★★ and a gated meeting is closed until the valley has earned it', () => {
    const gated = MEETS.findIndex((m) => m.needs !== undefined);
    expect(gated).toBeGreaterThanOrEqual(0);
    const need = MEETS[gated]!.needs!;
    expect(meetOpen(initial(), gated)).toBe(false);
    expect(meetOpen({ ...initial(), marks: [need] }, gated)).toBe(true);
  });

  it('★★★ a foray never deals a beat, and never deals a locked scene', () => {
    // ⚠️ AND IT NEVER GOES QUIET EITHER. `meetFor` walks forward past what is
    // closed rather than returning null — a run where you never took the
    // family in would otherwise skip its turn, which reads as the game
    // breaking rather than as a story not being told.
    for (let forays = 1; forays < 40; forays += 2) {
      const i = meetFor(initial(), forays);
      expect(i).not.toBeNull();
      expect(MEETS[i!]!.beat).toBeFalsy();
      expect(MEETS[i!]!.needs).toBeUndefined();
    }
  });

  it('★ and an even foray still turns nothing up', () => {
    for (let f = 0; f < 20; f += 2) expect(meetFor(initial(), f)).toBeNull();
  });
});
