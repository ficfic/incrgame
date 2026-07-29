// THE INTERFACE ARRIVES ONE PIECE AT A TIME, AND THE BOARD OPENS AT TWO LANES.
//
// The owner played the deployed build and could not read it: "i don't
// understand what ANY of the buttons do, i just randomly clicked around until i
// got to a stop… we need to introduce mechanics gradually… we must have like 2
// options… maybe we shouldn't show unavailable options."
//
// Measured before any of this was written: `lanes(initialState())` returns 85,
// and every control in the game was on the first screen.
//
// ---- PROVEN RED, 2026-07-29 ----------------------------------------------
//
// Rule 4: every guard in this repo has been vacuous at least once. Each
// sabotage below was applied to the source, the suite run, the output COPIED
// FROM THE TERMINAL, and the source put back.
//
//   SABOTAGE  reveal.ts, `case 'machines': return true`
//   OBSERVED  Tests  2 failed | 11 passed (13)
//             × minute zero is the lane strip and nothing else
//               expected [ 'lanes', 'machines' ] to deeply equal [ 'lanes' ]
//             × the machine cards wait for the SECOND word
//               expected true to be false
//
//   SABOTAGE  starmap.ts, `LANE_WIDTH_MIN` 2 → 6
//   OBSERVED  Tests  2 failed | 11 passed (13)
//             × the opening offers exactly two lanes    expected 6 to be 2
//             × the strip widens by one lane per six words  expected 6 to be 7
//
//   SABOTAGE  starmap.ts, `offered` returns `ranked(open, here)` — locked lanes
//             filtered out but the no-op `solid` ones left in
//   OBSERVED  Tests  1 failed | 12 passed (13)
//             × every offered lane teaches a word
//               expected 'solid' to be 'dotted'
//
//   SABOTAGE  reveal.ts, `case 'check': return D(state.raw).gte(1)` — the naive
//             gate, the pile's own level and nothing else
//   OBSERVED  Tests  1 failed | 12 passed (13)
//             × Check waits for something to check  expected false to be true
//             (the loose machine about to make Raw is the case it misses)
//
//   SABOTAGE  reveal.ts, `case 'machines': return D(state.solid).gte(20)` — a
//             witness that FALLS, which is the failure mode the whole file is
//             shaped around and the one no single-state assertion can see
//   OBSERVED  Tests  2 failed | 11 passed (13)
//             × mechanics arrive ONE AT A TIME over a played hour
//               `machines` vanished from the interface at second 620:
//               expected [ 'lanes', 'lockedLanes' ] to include 'machines'
//
import { describe, expect, it } from 'vitest';
import {
  apply, canWalk, initialState, machineCost, RETRAIN_MIN_WORDS, stepCost, tick, words,
} from '../src/core/engine';
import {
  closed, lanes, laneWidth, offered, LANE_WIDTH_MAX, LANE_WIDTH_MIN, LANE_WIDTH_PER,
  LOCKED_LANES_AT,
} from '../src/core/starmap';
import { CONTROLS, MACHINES_AT, shows, visible, type Control } from '../src/core/reveal';
import { D } from '../src/core/numbers';
import type { GameState } from '../src/core/types';

/** A save that has walked `n` new concepts, with money so the walk is never the
 *  thing being tested. */
function walked(n: number, over: Partial<GameState> = {}): GameState {
  let s: GameState = { ...initialState(), solid: '1000000000', lastTick: 1000, ...over };
  for (let guard = 0; words(s) < n && guard < n * 4 + 8; guard++) {
    const lane = lanes(s).find((l) => l.state === 'dotted' && canWalk(s, l.to));
    if (!lane) break;
    s = apply(s, { type: 'walk', to: lane.to });
  }
  return s;
}

describe('the opening', () => {
  it('minute zero is the lane strip and nothing else', () => {
    expect(visible(initialState())).toEqual(['lanes']);
  });

  it('the opening offers exactly two lanes', () => {
    // The whole board is 85 lanes wide on the first frame. Two of them is the
    // difference between a decision and a coin flip.
    expect(lanes(initialState()).length).toBeGreaterThan(50);
    expect(offered(initialState()).length).toBe(2);
  });

  it('every offered lane teaches a word', () => {
    // `solid` leads somewhere already held: free, no word, and no movement,
    // because position is the last concept HELD. A button that provably does
    // nothing is the thing the owner could not tell from a broken one.
    for (const lane of offered(walked(10))) expect(lane.state).toBe('dotted');
  });

  it('no locked lane is offered, at any point in a run', () => {
    for (const n of [0, 5, 30, 60]) {
      for (const lane of offered(walked(n))) expect(lane.state).not.toBe('locked');
    }
  });

  it('locked lanes stay off the board until the player can read some of it', () => {
    expect(closed(walked(4))).toEqual([]);
    expect(closed(walked(LOCKED_LANES_AT - 1))).toEqual([]);
    const late = walked(LOCKED_LANES_AT + 2);
    expect(words(late)).toBeGreaterThanOrEqual(LOCKED_LANES_AT);
    // Not asserted non-empty: whether a locked lane is REACHABLE by then is the
    // story graph's business, not this rule's. What is asserted is that nothing
    // but a locked lane is ever in here.
    for (const lane of closed(late)) expect(lane.state).toBe('locked');
  });
});

describe('the strip widens with what you can read', () => {
  it('the strip widens by one lane per six words', () => {
    expect(laneWidth(initialState())).toBe(LANE_WIDTH_MIN);
    expect(laneWidth(walked(LANE_WIDTH_PER))).toBe(LANE_WIDTH_MIN + 1);
    expect(laneWidth(walked(LANE_WIDTH_PER * 2))).toBe(LANE_WIDTH_MIN + 2);
  });

  it('and stops at the level-of-detail cap already shipped', () => {
    const wide = walked(LANE_WIDTH_PER * (LANE_WIDTH_MAX - LANE_WIDTH_MIN) + 4);
    expect(laneWidth(wide)).toBe(LANE_WIDTH_MAX);
    expect(offered(wide).length).toBeLessThanOrEqual(LANE_WIDTH_MAX);
  });

  it('never narrows, because Words never falls', () => {
    let last = 0;
    for (let n = 0; n <= 30; n += 3) {
      const w = laneWidth(walked(n));
      expect(w).toBeGreaterThanOrEqual(last);
      last = w;
    }
  });
});

describe('the ladder', () => {
  it('the machine cards wait for the SECOND word', () => {
    // At zero Words the vocabulary cap is zero, so a bought machine produces
    // nothing: the card would be a price tag on a no-op. At one, the walk
    // itself is the lesson.
    expect(shows(walked(MACHINES_AT - 1), 'machines')).toBe(false);
    expect(shows(walked(MACHINES_AT), 'machines')).toBe(true);
  });

  it('the toggle waits for a machine the player BOUGHT', () => {
    const s = walked(MACHINES_AT + 1);
    expect(shows(s, 'watch')).toBe(false);
    expect(shows(apply(s, { type: 'buy', id: 'extractor' }), 'watch')).toBe(true);
  });

  it('Check waits for something to check', () => {
    const s = walked(4);
    expect(shows(s, 'check')).toBe(false);
    // A loose machine counts: it is about to make Raw, and the button is the
    // reason flipping the toggle was worth doing.
    expect(shows(apply(s, { type: 'setWatched', id: 'extractor', watched: false }), 'check'))
      .toBe(true);
    expect(shows({ ...s, raw: '1' }, 'check')).toBe(true);
    // ...and once anything has worn out it never leaves again, even watched
    // with an empty pile.
    expect(shows({ ...s, raw: '0', rot: '0.4' }, 'check')).toBe(true);
  });

  it('Retrain is never shown before it can be taken', () => {
    expect(shows(walked(20), 'retrain')).toBe(false);
    expect(shows({ ...initialState(), held: Array.from({ length: RETRAIN_MIN_WORDS + 8 },
      (_, i) => 4095 - i) }, 'retrain')).toBe(true);
  });

  it('mechanics arrive ONE AT A TIME over a played hour', () => {
    // A plausible player: walk when it is affordable, buy when the machines
    // bind, go loose once there is a Checker. What is asserted is not the
    // schedule but the SHAPE — no two controls ever land in the same second.
    let s: GameState = { ...initialState(), lastTick: 1000 };
    let before = visible(s);
    const arrivals: { at: number; control: Control }[] = [];
    let open: number[] | null = null;
    for (let t = 1; t <= 3600; t++) {
      s = tick(s, 1);
      if (s.machines.checker > 0 && s.watched.extractor) {
        s = apply(s, { type: 'setWatched', id: 'extractor', watched: false });
      }
      if (D(s.solid).gte(machineCost(s, 'checker')) && s.machines.checker < 2) {
        s = apply(s, { type: 'buy', id: 'checker' });
      } else if (D(s.solid).gte(machineCost(s, 'extractor'))) {
        s = apply(s, { type: 'buy', id: 'extractor' });
      }
      // `lanes()` is the expensive call in the engine and this loop runs an
      // hour of game time, so the board is recomputed only after a walk moves
      // it, and affordability is asked of the price rather than of `canWalk`
      // (which re-derives the whole board per candidate).
      open ??= lanes(s).filter((l) => l.state === 'dotted').map((l) => l.to);
      const to = open[0];
      if (to !== undefined && D(s.solid).gte(stepCost(s, to))) {
        s = apply(s, { type: 'walk', to });
        open = null;
      }

      const now = visible(s);
      for (const c of before) {
        expect(now, `\`${c}\` vanished from the interface at second ${t}`).toContain(c);
      }
      for (const c of now) if (!before.includes(c)) arrivals.push({ at: t, control: c });
      before = now;
    }
    // Every control that arrived did so alone.
    const seconds = arrivals.map((a) => a.at);
    expect(new Set(seconds).size, `arrivals: ${JSON.stringify(arrivals)}`).toBe(seconds.length);
    // And the hour taught more than it opened with.
    expect(before.length).toBeGreaterThan(1);
    expect(before.every((c) => CONTROLS.includes(c))).toBe(true);
  });
});
