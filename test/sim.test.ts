import { describe, expect, it } from 'vitest';
import { GraphSim } from '../src/render/sim';

const board = (n: number) => ({
  nodes: Array.from({ length: n }, (_, i) => ({ id: i, weight: 0.62 ** Math.min(5, i) })),
  links: Array.from({ length: n - 1 }, (_, i) => ({ a: i + 1, b: 0 })),
});
const snap = (s: GraphSim) => [...s.positions()].map(([id, p]) => `${id}:${p.x.toFixed(4)},${p.y.toFixed(4)}`).join('|');

describe('the force simulation', () => {
  it('actually moves nodes when stepped', () => {
    const s = new GraphSim();
    s.sync(board(12));
    const before = snap(s);
    for (let i = 0; i < 20; i++) expect(s.step()).toBe(true);
    expect(snap(s)).not.toBe(before);
  });

  it('settles, and then stops asking to be redrawn', () => {
    const s = new GraphSim();
    s.sync(board(12));
    let ticks = 0;
    while (s.step() && ticks < 5000) ticks++;
    expect(ticks).toBeGreaterThan(50);   // it ran a real simulation
    expect(ticks).toBeLessThan(2000);    // and it converged
    expect(s.step()).toBe(false);        // a settled board costs nothing
  });

  it('keeps every position finite and on a sane scale', () => {
    const s = new GraphSim();
    s.sync(board(60));
    while (s.step());
    for (const [, p] of s.positions()) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      // the whole point of SIM_UNITS: a unit-ish world the camera can frame.
      // The first version configured d3's forces against a unit-radius world
      // and the graph flew to infinity, so every node was culled off-screen
      // and the board rendered EMPTY.
      expect(Math.hypot(p.x, p.y)).toBeLessThan(4);
    }
  });

  it('REHEATS when a concept is discovered, instead of staying frozen', () => {
    const s = new GraphSim();
    s.sync(board(10));
    while (s.step());                    // settle completely
    expect(s.step()).toBe(false);
    s.sync(board(11));                   // one new concept arrives
    expect(s.step()).toBe(true);         // the graph must react
    const before = snap(s);
    for (let i = 0; i < 30; i++) s.step();
    expect(snap(s)).not.toBe(before);
  });

  it('keeps existing nodes where they were when one arrives', () => {
    const s = new GraphSim();
    s.sync(board(10));
    while (s.step());
    const was = s.positions().get(3)!;
    s.sync(board(11));
    const now = s.positions().get(3)!;
    // same position at the moment of sync — it drifts afterwards, but it does
    // not teleport, which is what made the old layout "restructure" on every
    // discovery
    expect(now.x).toBeCloseTo(was.x, 9);
    expect(now.y).toBeCloseTo(was.y, 9);
  });

  it('drags a node and holds the simulation awake while held', () => {
    const s = new GraphSim();
    s.sync(board(10));
    while (s.step());
    expect(s.step()).toBe(false);
    const target = s.positions().get(5)!;
    expect(s.pick(target.x, target.y, 0.05)).toBe(5);
    expect(s.grab(5)).toBe(true);
    s.dragTo(0.9, 0.9);
    s.step();
    const moved = s.positions().get(5)!;
    expect(moved.x).toBeCloseTo(0.9, 3);
    expect(s.step()).toBe(true); // stays awake while held
    s.release();
  });

  it('picks nothing when you tap empty space', () => {
    const s = new GraphSim();
    s.sync(board(10));
    while (s.step());
    expect(s.pick(50, 50, 0.05)).toBeNull();
  });
});
