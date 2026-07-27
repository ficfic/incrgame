// apply(state, action) => state IS A FUNCTION OF ITS ARGUMENTS.
//
// It was not. Found by an adversarial audit (6 blind lenses, 3 independent
// skeptics per finding, 2026-07-27); all three skeptics confirmed it by
// EXECUTION rather than by reading, and one reproduced it from a plain action
// sequence starting at `initialState`.
//
// THE BUG. `tick` aliased `resources` to `state.resources` and copy-on-wrote it
// with `resources = touched ? resources : { ...resources }`. But `touched` meant
// "something changed", not "resources were copied", and four branches set it
// true without copying anything — line decay, agent-drawn lines, folded
// concepts, and confirming an existing edge. Once any of those fired first, the
// guard saw `touched === true`, skipped the copy, and the next
// `resources.triples = ...` wrote straight into the CALLER'S object.
//
// Consequences, all measured before the fix:
//   · the input state's balances silently rewrote themselves
//   · `next.resources === state.resources`
//   · calling apply twice with the same arguments returned different answers
//
// WHY 210 TESTS MISSED IT. `test/engine.test.ts` has one purity assertion, and
// it ticks `initialState()` — where `lastTick` is 0, `edges` is empty, every
// generator is 0 and there are no bookings, so not one of the four branches can
// fire. A textbook vacuous guard, and the reason this file tests the states
// where the reducer actually does work.
import { describe, expect, it } from 'vitest';
import { apply, EXTRACT_MS, initialState } from '../src/core/engine';
import type { GameState } from '../src/core/types';

/** A deep snapshot to compare against. `apply` must leave its input identical. */
const snap = (s: GameState) => JSON.stringify(s);

/** Assert the reducer changed nothing about its input.
 *
 *  The identity check is CONDITIONAL, and the condition is the whole point:
 *  sharing `resources` between two states is correct and cheap when nothing
 *  wrote to it — structural sharing is why this engine is fast. What must never
 *  happen is a WRITE through a shared reference. So the rule is exactly:
 *  if the values differ, the objects must differ too. An unconditional
 *  `not.toBe` fails on an idle tick and would have to be deleted, taking the
 *  real assertion with it. */
const mustNotMutate = (s: GameState, action: Parameters<typeof apply>[1]) => {
  const before = snap(s);
  const next = apply(s, action);
  expect(snap(s), 'apply() mutated its input state').toBe(before);
  const changed = JSON.stringify(next.resources) !== JSON.stringify(s.resources);
  if (changed) {
    expect(next.resources, 'resources changed value while sharing the input object')
      .not.toBe(s.resources);
  }
  return next;
};

describe('tick does not write through to the state it was given', () => {
  it('when a rotted line expires — the decay path', () => {
    // The exact state from the audit: no machines, one unchecked edge, and a
    // rot rate that retires it on the first tick.
    const base = initialState(1);
    const s: GameState = {
      ...base, lastTick: 1000, lineRot: 0.9999,
      resources: { ...base.resources, triples: '5' },
      provenance: { ...base.provenance, unverified: '5' },
      forged: {
        ...base.forged, anchors: [0, 1], nextId: 2,
        edges: [{ a: 0, b: 1, rel: 0, checked: false, fake: false }],
      },
    };
    mustNotMutate(s, { type: 'tick', dt: 0.1, now: 1100 });
  });

  it('when a booking lands in the same tick as another change', () => {
    // The second measured path: a landing extract plus a machine that credits
    // folded concepts. Neither copies `resources` before the booking does.
    const base = initialState(1);
    const s: GameState = {
      ...base, lastTick: 1000,
      generators: { ...base.generators, reasoner: 1 },
      resources: { ...base.resources, triples: '10' },
      forged: { ...base.forged, anchors: [0, 1, 2], nextId: 3 },
      bookings: [{
        kind: 'extract', until: 1050,
        edges: [{ a: 1, b: 0, rel: 0, checked: false, fake: false }],
      }],
    };
    mustNotMutate(s, { type: 'tick', dt: 0.1, now: 1000 + EXTRACT_MS + 500 });
  });

  it('when an unwatched machine draws lines of its own', () => {
    const base = initialState(1);
    const s: GameState = {
      ...base, lastTick: 1000, supervised: 0,
      generators: { ...base.generators, extractor: 3 },
      resources: { ...base.resources, triples: '100' },
      provenance: { ...base.provenance, unverified: '40' },
      forged: { ...base.forged, anchors: [0, 1, 2, 3], nextId: 4 },
    };
    mustNotMutate(s, { type: 'tick', dt: 1, now: 2000 });
  });
});

describe('apply() is a FUNCTION — same input, same answer, every time', () => {
  it('returns the identical result when called twice on one state', () => {
    // ⚠️ THE SHARPEST SYMPTOM. With the aliasing bug, the second call decremented
    // the object the FIRST call had already returned, so a result computed as
    // '4' later read '3' without anyone touching it.
    const base = initialState(1);
    const s: GameState = {
      ...base, lastTick: 1000, lineRot: 0.9999,
      resources: { ...base.resources, triples: '5' },
      provenance: { ...base.provenance, unverified: '5' },
      forged: {
        ...base.forged, anchors: [0, 1], nextId: 2,
        edges: [{ a: 0, b: 1, rel: 0, checked: false, fake: false }],
      },
    };
    const first = apply(s, { type: 'tick', dt: 0.1, now: 1100 });
    const firstTriples = first.resources.triples;
    const second = apply(s, { type: 'tick', dt: 0.1, now: 1100 });
    expect(second.resources.triples).toBe(firstTriples);
    // ...and the first answer must not have moved while the second ran.
    expect(first.resources.triples).toBe(firstTriples);
    expect(first.resources).not.toBe(second.resources);
  });
});

describe('reachable from ordinary play, not only from a hand-built state', () => {
  it('survives a long run of real actions with its inputs intact', () => {
    // One skeptic reproduced the mutation from `initialState` via
    // discover → extract → ticks. This replays that shape and asserts on every
    // step, so the guard covers the path a player actually takes.
    let s = { ...initialState(7), lastTick: 1000 };
    s = mustNotMutate(s, { type: 'tick', dt: 0.1, now: 1100 });
    s = mustNotMutate(s, { type: 'discover' });
    s = mustNotMutate(s, { type: 'tick', dt: 0.1, now: s.lastTick + 60_000 });
    s = mustNotMutate(s, {
      type: 'extract',
      candidates: [{ a: 1, b: 0, rel: 0, checked: false, fake: false }],
    });
    for (let i = 0; i < 400; i++) {
      s = mustNotMutate(s, { type: 'tick', dt: 0.1, now: s.lastTick + 100 });
    }
  });
});
