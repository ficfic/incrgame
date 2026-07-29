// THE CONNECTION CAME BACK: A DASHED LINE YOU TAP TO MAKE SOLID.
//
// The owner played the deployed build: "im missing the not dotted line
// connections and clicking on them to make them solid lines".
//
// Measured before any of this was written: `render/paint.ts` drew exactly ONE
// kind of line. Every connection on the board was dashed, from the first frame
// to the last, with no state in it and no way to put any there.
//
// What is asserted here is the whole design, and the two halves that make it a
// design rather than a button: confirming is CHECK WITH A TARGET — the same
// slice of Raw, no second constant — and a connection can be signed ONCE, so
// the supply of aimed taps is bounded by how far the player has walked.
//
// ---- PROVEN RED, 2026-07-29 ----------------------------------------------
//
// Rule 4: a check nobody has broken on purpose is assumed vacuous. Every
// sabotage below was applied to the source, `npx vitest run test/edges.test.ts`
// run, the output COPIED FROM THE TERMINAL, and the source put back.
//
//   SABOTAGE  engine.ts, `case 'confirm'` returns `state` before converting
//   OBSERVED  Tests  3 failed | 14 passed (17)
//             × confirming is Check with a target: the same slice, no bonus
//               expected '999980' to be '999988' // Object.is equality
//             × a connection is signed once, and that bound is the price
//               expected [] to deeply equal [ '0:1:0' ]
//             × signatures survive a Retrain, like the board they are on
//               expected [] to deeply equal [ '0:1:0' ]
//
//   SABOTAGE  engine.ts, `canConfirm` drops the `state.confirmed.includes`
//             clause — the connection can be re-signed forever, which is the
//             tap-and-hold grind the bound exists to stop
//   OBSERVED  Tests  1 failed | 16 passed (17)
//             × a connection is signed once, and that bound is the price
//               expected [ '0:1:0', '0:1:0', '0:1:0', '0:1:0' ] to deeply
//               equal [ '0:1:0' ]
//
//   SABOTAGE  engine.ts, `canConfirm` drops the two `state.held.includes`
//             clauses — the only invariant a pure reducer can enforce here
//   OBSERVED  Tests  1 failed | 16 passed (17)
//             × a signature must run between two concepts you hold
//               expected true to be false // Object.is equality
//
//   SABOTAGE  engine.ts, `retrained()` drops `confirmed: [...state.confirmed]`
//             — the failure mode that hands the entire supply of aimed taps
//             back every generation and deletes the only record of hand-work
//   OBSERVED  Tests  1 failed | 16 passed (17)
//             × signatures survive a Retrain, like the board they are on
//               expected [] to deeply equal [ '0:1:0' ]
//
//   SABOTAGE  edges.ts, `edgeKey` returns `${a}:${b}:${rel}` uncanonicalised —
//             two keys for one line, so the board can draw a connection dashed
//             that the save already holds signed
//   OBSERVED  Tests  5 failed | 12 passed (17)
//             × a connection has ONE key, whichever way round it is written
//               expected '9:4:0' to be '4:9:0' // Object.is equality
//             × confirming is Check with a target: the same slice, no bonus
//               expected '999980' to be '999988' // Object.is equality
//             × a connection is signed once, and that bound is the price
//               expected [] to deeply equal [ '1:0:0' ]
//             × a signature must run between two concepts you hold
//               expected false to be true // Object.is equality
//             × signatures survive a Retrain, like the board they are on
//               expected [] to deeply equal [ '1:0:0' ]
//
//   SABOTAGE  paint.ts, the signed pass strokes with `setLineDash([2, 5])` too
//   OBSERVED  Tests  1 failed | 16 passed (17)
//             × the painter draws a signed connection solid and the rest dashed
//               expected [] to deeply equal [ '90,10->90,90' ]
//
//   SABOTAGE  paint.ts, `ctx.lineDashOffset = -t * 8` unconditionally — the
//             board claiming a tap would work when there is nothing to check
//   OBSERVED  Tests  1 failed | 16 passed (17)
//             × the dashes stop marching when there is nothing to sign
//               expected -80 to be +0 // Object.is equality
//
//   SABOTAGE  board.ts, `toSegment` measures to the INFINITE line rather than
//             the segment, so a tap past the end of a connection claims it
//   OBSERVED  Tests  1 failed | 16 passed (17)
//             × a tap past the end of a connection is not on it
//               expected { a: 1, b: 2, rel: +0, …(2) } to be null
//
//   SABOTAGE  board.ts, `pickEdge` ignores `skip`, so a finger that lands on a
//             finished connection gets a tap that provably does nothing
//   OBSERVED  Tests  1 failed | 16 passed (17)
//             × a signed connection is finished, so the finger goes through it
//               expected { a: 1, b: 2, rel: +0, …(2) } to be null
//
import { describe, expect, it } from 'vitest';
import {
  apply, canCheck, canConfirm, canRetrain, canWalk, checkTake, initialState, retrained, words,
} from '../src/core/engine';
import { confirmedEdges, edgeKey, edgeState, parseEdgeKey } from '../src/core/edges';
import { lanes } from '../src/core/starmap';
import { deserialize, serialize } from '../src/core/save';
import { EDGE_TAP_PX, pickEdge } from '../src/render/board';
import { paintGraph, type Scene } from '../src/render/paint';
import { cameraFor } from '../src/render/board';
import type { GameState } from '../src/core/types';

/** A save standing somewhere real, with a pile of Raw to check and enough Solid
 *  that walking is never the thing under test. */
function walked(n: number, over: Partial<GameState> = {}): GameState {
  let s: GameState = { ...initialState(), solid: '1000000', raw: '400', lastTick: 1000, ...over };
  for (let guard = 0; words(s) < n && guard < n * 4 + 8; guard++) {
    const lane = lanes(s).find((l) => l.state === 'dotted' && canWalk(s, l.to));
    if (!lane) break;
    s = apply(s, { type: 'walk', to: lane.to });
  }
  return s;
}

/** A connection between the two most recently held concepts — always a pair the
 *  board could legitimately be drawing, since both ends are held. */
function anEdge(s: GameState, rel = 0): string {
  const [a, b] = s.held.slice(-2);
  return edgeKey(a!, b!, rel);
}

describe('the key', () => {
  it('a connection has ONE key, whichever way round it is written', () => {
    expect(edgeKey(9, 4, 0)).toBe(edgeKey(4, 9, 0));
    expect(edgeKey(4, 9, 0)).toBe('4:9:0');
  });

  it('refuses anything that is not a canonical connection', () => {
    expect(parseEdgeKey('4:9:0')).toEqual({ a: 4, b: 9, rel: 0 });
    expect(parseEdgeKey('9:4:0')).toBeNull();   // written backwards: a second key for one line
    expect(parseEdgeKey('7:7:0')).toBeNull();   // a concept related to itself
    expect(parseEdgeKey('4:9:99')).toBeNull();  // no such relation
    expect(parseEdgeKey('4:9')).toBeNull();
    expect(parseEdgeKey('')).toBeNull();
    expect(parseEdgeKey('-1:9:0')).toBeNull();
  });
});

describe('confirming is Check, aimed', () => {
  it('confirming is Check with a target: the same slice, no bonus', () => {
    const s = walked(3);
    const key = anEdge(s);
    const take = checkTake(s);

    const byButton = apply(s, { type: 'check' });
    const byLine = apply(s, { type: 'confirm', edge: key });

    // The SAME conversion. A bonus for aiming would be a second answer to "what
    // is one tap of review worth", which is the defect that reset this economy.
    expect(byLine.solid).toBe(byButton.solid);
    expect(byLine.raw).toBe(byButton.raw);
    expect(Number(byLine.solid) - Number(s.solid)).toBeCloseTo(Number(take), 9);
    // ...and the part that lasts.
    expect(byLine.confirmed).toEqual([key]);
    expect(byButton.confirmed).toEqual([]);
    expect(edgeState(byLine, ...([...key.split(':').map(Number)] as [number, number, number])))
      .toBe('confirmed');
  });

  it('a connection is signed once, and that bound is the price', () => {
    let s = walked(3);
    const key = anEdge(s);
    const before = s.raw;
    for (let i = 0; i < 4; i++) s = apply(s, { type: 'confirm', edge: key });

    expect(s.confirmed).toEqual([key]);
    expect(s.confirmed.length).toBe(1);
    expect(canConfirm(s, key)).toBe(false);
    // Exactly one conversion happened, not four: the second tap is a no-op, so
    // holding a finger on one line cannot out-earn the Check button.
    expect(Number(before) - Number(s.raw)).toBeCloseTo(Number(checkTake(walked(3))), 9);
  });

  it('a signature must run between two concepts you hold', () => {
    const s = walked(3);
    const held = s.held[0]!;
    const notHeld = 4094; // in the dataset, nowhere near this board
    expect(s.held.includes(notHeld)).toBe(false);

    expect(canConfirm(s, edgeKey(held, notHeld, 0))).toBe(false);
    expect(apply(s, { type: 'confirm', edge: edgeKey(held, notHeld, 0) })).toBe(s);
    expect(canConfirm(s, anEdge(s))).toBe(true);
  });

  it('a connection with nothing unchecked behind it is a line, not a control', () => {
    const dry = walked(3, { raw: '0' });
    expect(canCheck(dry)).toBe(false);
    expect(canConfirm(dry, anEdge(dry))).toBe(false);
    expect(apply(dry, { type: 'confirm', edge: anEdge(dry) })).toBe(dry);
  });

  it('refuses a forged key without touching the substance', () => {
    const s = walked(3);
    for (const junk of ['', 'x', '1:1:0', '9:4:0', '0:1:99', '../../etc']) {
      expect(apply(s, { type: 'confirm', edge: junk })).toBe(s);
    }
  });

  it('signatures survive a Retrain, like the board they are on', () => {
    let s = walked(3);
    const key = anEdge(s);
    s = apply(s, { type: 'confirm', edge: key });
    expect(s.confirmed).toEqual([key]);

    // `retrained` is the function the reducer itself calls, gate not applied.
    const after = retrained(s);
    expect(after.confirmed).toEqual([key]);
    expect(after.solid).toBe(initialState().solid); // everything else did reset
    expect(canRetrain(s)).toBe(false);              // ...and the gate is untouched
  });

  it('an existing save loads with no signatures and does not reset', () => {
    const old = walked(3);
    // A v17 save written before connections could be confirmed: the key is
    // simply absent from the JSON.
    const stripped = { ...old } as Partial<GameState>;
    delete stripped.confirmed;
    const blob = serialize(stripped as GameState);
    const loaded = deserialize(blob);

    expect(loaded.reset).toBe(false);
    expect(loaded.state.confirmed).toEqual([]);
    expect(loaded.state.held).toEqual(old.held);

    // ...and a save that HAS them keeps them, which is what makes them durable.
    const signed = apply(old, { type: 'confirm', edge: anEdge(old) });
    expect(deserialize(serialize(signed)).state.confirmed).toEqual(signed.confirmed);
  });
});

// ---- THE FINGER -----------------------------------------------------------

const POS = new Map([
  [1, { x: 0, y: 0 }],
  [2, { x: 100, y: 0 }],
  [3, { x: 0, y: 60 }],
]);
const EDGES = [{ a: 1, b: 2, rel: 0 }, { a: 1, b: 3, rel: 4 }];

describe('tapping a connection', () => {
  it('picks the line under the finger, and the NEAREST one', () => {
    expect(pickEdge(EDGES, POS, { x: 50, y: 2 })).toMatchObject({ a: 1, b: 2, key: '1:2:0' });
    expect(pickEdge(EDGES, POS, { x: 3, y: 30 })).toMatchObject({ a: 1, b: 3, key: '1:3:4' });
  });

  it('a tap in open space is not on anything', () => {
    expect(pickEdge(EDGES, POS, { x: 80, y: 80 })).toBeNull();
    expect(pickEdge(EDGES, POS, { x: 50, y: EDGE_TAP_PX + 2 })).toBeNull();
  });

  it('a tap past the end of a connection is not on it', () => {
    // Beyond node 2, still exactly on the infinite line through 1 and 2. A
    // segment stops where the concept does.
    expect(pickEdge(EDGES, POS, { x: 140, y: 0 })).toBeNull();
    expect(pickEdge(EDGES, POS, { x: 99, y: 0 })).not.toBeNull();
  });

  it('a signed connection is finished, so the finger goes through it', () => {
    // Built exactly the way the screen will build it, off the save.
    const skip = confirmedEdges({ ...initialState(), confirmed: ['1:2:0'] });
    expect(pickEdge(EDGES, POS, { x: 50, y: 2 }, EDGE_TAP_PX, skip)).toBeNull();
    expect(pickEdge(EDGES, POS, { x: 3, y: 30 }, EDGE_TAP_PX, skip)).not.toBeNull();
  });

  it('a connection whose end is folded away has no tap target', () => {
    const partial = new Map([[1, { x: 0, y: 0 }]]);
    expect(pickEdge(EDGES, partial, { x: 50, y: 2 })).toBeNull();
  });
});

// ---- THE PICTURE ----------------------------------------------------------
//
// A recording 2D context, because the thing under test is WHAT WAS STROKED and
// with which dash pattern — the one property of this feature the owner can
// actually see, and the one no engine test can reach.

interface Stroked { dash: number[]; segments: string[]; offset: number }

function record(): { canvas: HTMLCanvasElement; strokes: Stroked[] } {
  const strokes: Stroked[] = [];
  let dash: number[] = [];
  let offset = 0;
  let segments: string[] = [];
  let from = { x: 0, y: 0 };
  const stack: Array<[number[], number]> = [];
  const ctx = {
    canvas: null as unknown,
    globalAlpha: 1, lineWidth: 1, strokeStyle: '', fillStyle: '',
    get lineDashOffset(): number { return offset; },
    set lineDashOffset(v: number) { offset = v; },
    setTransform: () => {}, clearRect: () => {},
    save: () => { stack.push([dash, offset]); },
    restore: () => { const p = stack.pop(); if (p) { dash = p[0]; offset = p[1]; } },
    setLineDash: (d: number[]) => { dash = d; },
    beginPath: () => { segments = []; },
    moveTo: (x: number, y: number) => { from = { x, y }; },
    lineTo: (x: number, y: number) => { segments.push(`${from.x},${from.y}->${x},${y}`); },
    arc: () => {}, fill: () => {},
    stroke: () => { if (segments.length) strokes.push({ dash: [...dash], segments, offset }); },
  };
  const canvas = {
    width: 0, height: 0,
    getContext: () => ctx as unknown as CanvasRenderingContext2D,
  } as unknown as HTMLCanvasElement;
  return { canvas, strokes };
}

function scene(state: GameState, over: Partial<Scene> = {}): Scene {
  return {
    state, w: 390, h: 500, timeMs: 10_000, hue: 200,
    dotted: [{ a: 2, b: 5, rel: 0 }, { a: 5, b: 9, rel: 0 }],
    pos: new Map([[2, { x: 10, y: 10 }], [5, { x: 90, y: 10 }], [9, { x: 90, y: 90 }]]),
    cam: cameraFor(390, 500),
    ...over,
  };
}

describe('the board draws the difference', () => {
  const base: GameState = { ...initialState(), held: [2, 5, 9], raw: '50' };
  // Not jsdom: paint.ts reads devicePixelRatio off `window` and nothing else.
  const g = globalThis as unknown as { window?: unknown };
  g.window ??= { devicePixelRatio: 1 };

  it('the painter draws a signed connection solid and the rest dashed', () => {
    const { canvas, strokes } = record();
    paintGraph(canvas, scene({ ...base, confirmed: [edgeKey(5, 9, 0)] }));

    const solid = strokes.filter((s) => s.dash.length === 0);
    const dashed = strokes.filter((s) => s.dash.length > 0);
    expect(solid.flatMap((s) => s.segments)).toEqual(['90,10->90,90']);
    expect(dashed.flatMap((s) => s.segments)).toEqual(['10,10->90,10']);
    expect(solid[0]!.dash).toEqual([]);
  });

  it('with nothing signed, every connection is dashed', () => {
    const { canvas, strokes } = record();
    paintGraph(canvas, scene(base));
    const drawn = strokes.filter((s) => s.segments.some((seg) => seg.startsWith('10,10')
      || seg.startsWith('90,10')));
    expect(drawn.every((s) => s.dash.length > 0)).toBe(true);
    expect(drawn.flatMap((s) => s.segments).sort())
      .toEqual(['10,10->90,10', '90,10->90,90']);
  });

  it('the dashes stop marching when there is nothing to sign', () => {
    const dashOf = (state: GameState): number => {
      const { canvas, strokes } = record();
      paintGraph(canvas, scene(state));
      return strokes.find((s) => s.dash.length > 0)!.offset;
    };
    expect(dashOf(base)).not.toBe(0);            // Raw on the pile: alive
    expect(dashOf({ ...base, raw: '0' })).toBe(0); // nothing to check: still
  });
});
