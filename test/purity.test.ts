// apply(state, action) => state IS A FUNCTION OF ITS ARGUMENTS.
//
// It was not, and the way it failed is worth keeping written down because the
// class of bug survives a rewrite even when the code does not. `tick` aliased
// `resources` to `state.resources` and copy-on-wrote it with
// `resources = touched ? resources : { ...resources }` — but `touched` meant
// "something changed", not "resources were copied". Four branches set it true
// without copying, so once any of them fired the next write went straight into
// the CALLER'S object: input balances rewrote themselves, and calling apply
// twice with the same arguments returned different answers.
//
// WHY 210 TESTS MISSED IT. The suite's only purity assertion ticked
// `initialState()`, where every branch that could mutate was unreachable. A
// textbook vacuous guard. So this file drives every action from a state where
// the reducer actually does work, and asserts on the WHOLE state rather than on
// one field — the new economy has three sibling Decimals and one array, and an
// array is the easiest thing in the file to push into by accident.
import { describe, expect, it } from 'vitest';
import { apply, initialState, RETRAIN_MIN_WORDS } from '../src/core/engine';
import { lanes } from '../src/core/starmap';
import { SEED_NODES } from '../src/content/seed';
import type { Action, GameState } from '../src/core/types';

const snap = (s: GameState): string => JSON.stringify(s);

/** Assert the reducer changed nothing about its input, and shared no object it
 *  then wrote through.
 *
 *  The identity checks are CONDITIONAL, and the condition is the point:
 *  structural sharing is correct and cheap when nothing wrote. What must never
 *  happen is a WRITE through a shared reference. An unconditional `not.toBe`
 *  fails on an idle tick and would have to be deleted, taking the real
 *  assertion with it. */
function mustNotMutate(s: GameState, action: Action): GameState {
  const before = snap(s);
  const next = apply(s, action);
  expect(snap(s), 'apply() mutated its input state').toBe(before);
  if (JSON.stringify(next.held) !== JSON.stringify(s.held)) {
    expect(next.held, '`held` changed value while sharing the input array').not.toBe(s.held);
  }
  if (JSON.stringify(next.machines) !== JSON.stringify(s.machines)) {
    expect(next.machines, '`machines` changed value while sharing the input object')
      .not.toBe(s.machines);
  }
  if (JSON.stringify(next.watched) !== JSON.stringify(s.watched)) {
    expect(next.watched, '`watched` changed value while sharing the input object')
      .not.toBe(s.watched);
  }
  return next;
}

/** A live mid-run state: machines running, Raw on the pile, Words banked. */
const busy = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(),
  lastTick: 1_700_000_000_000,
  held: [...SEED_NODES, ...Array.from({ length: 60 }, (_, i) => 4095 - i)],
  solid: '5000',
  raw: '900',
  rot: '40',
  minted: '12000',
  stepsThisRun: 60,
  machines: { extractor: 12, reasoner: 2, checker: 3 },
  ...over,
});

describe('the reducer never writes through to the state it was given', () => {
  it('on a tick that produces, checks and rots all at once', () => {
    const s = busy();
    const next = mustNotMutate(s, { type: 'tick', dt: 1 });
    expect(next).not.toBe(s);
    // ...and it is deterministic: same input, same answer, twice.
    expect(snap(apply(s, { type: 'tick', dt: 1 }))).toBe(snap(next));
  });

  it('on a tick with a loose machine, so Raw grows and decays together', () => {
    mustNotMutate(busy({ watched: { extractor: false } }), { type: 'tick', dt: 3 });
  });

  it('on a walk, which is the one action that appends to an array', () => {
    const s = busy({ solid: '1e9' });
    // DOTTED, not merely unlocked: a solid lane goes somewhere already held,
    // and `walk` on a concept you hold appends nothing by design.
    const to = lanes(s).filter((l) => l.state === 'dotted')[0]!.to;
    const next = mustNotMutate(s, { type: 'walk', to });
    expect(next.held.length).toBe(s.held.length + 1);
  });

  it('on a revisit, where nothing may move at all', () => {
    const s = busy({ solid: '1e9' });
    const known = s.held[0]!;
    mustNotMutate(s, { type: 'walk', to: known });
  });

  it('on a check', () => { mustNotMutate(busy(), { type: 'check' }); });

  it('on a buy, which writes into a record', () => {
    mustNotMutate(busy(), { type: 'buy', id: 'checker' });
  });

  it('on the toggle, which writes into another record', () => {
    mustNotMutate(busy(), { type: 'setWatched', id: 'extractor', watched: false });
  });

  it('on a retrain, which reuses the input`s concept list', () => {
    const s = busy({
      held: [...SEED_NODES, ...Array.from({ length: RETRAIN_MIN_WORDS }, (_, i) => 4095 - i)],
    });
    const next = mustNotMutate(s, { type: 'retrain' });
    expect(next.held).toEqual(s.held);
    expect(next.held, 'retrain handed back the caller`s array').not.toBe(s.held);
  });

  it('on every rejected action, where the SAME object must come back', () => {
    const broke = busy({ solid: '0', raw: '0' });
    expect(apply(broke, { type: 'check' })).toBe(broke);
    expect(apply(broke, { type: 'buy', id: 'reasoner' })).toBe(broke);
    expect(apply(broke, { type: 'retrain' })).toBe(broke);
    expect(apply(broke, { type: 'tick', dt: 0 })).toBe(broke);
  });
});

describe('core is pure of its environment', () => {
  it('never reads a clock: `now` comes in on the action', () => {
    const s = busy();
    const a = apply(s, { type: 'tick', dt: 1, now: 5_000 });
    const b = apply(s, { type: 'tick', dt: 1, now: 5_000 });
    expect(a.lastTick).toBe(5_000);
    expect(snap(a)).toBe(snap(b));
  });

  it('produces the same run from the same actions, twice', () => {
    const run = (): GameState => {
      let s = busy();
      for (let i = 0; i < 50; i++) {
        s = apply(s, { type: 'tick', dt: 0.1, now: s.lastTick + 100 });
        if (i % 7 === 0) s = apply(s, { type: 'check' });
        if (i === 20) s = apply(s, { type: 'buy', id: 'extractor' });
      }
      return s;
    };
    expect(snap(run())).toBe(snap(run()));
  });
});
