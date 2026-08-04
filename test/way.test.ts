// THE WAY — the leg as a place. The owner, 2026-08-04: *"instead of just
// waiting and being interrupted, it is the separate tab kinda where it
// happens… you're building, like, little graph through the terrain."*
//
// ---- PROVEN RED, 2026-08-04 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, roadKey, type Game } from '../src/game/engine';
import { theWay, DOING, stopId } from '../src/game/world';
import { pathOf, lengthOf } from '../src/game/paths';
import { STOP, START } from '../src/game/stops';

const to = STOP.get(START)!.near[0]!;
const laying = (): Game =>
  apply({ ...initial(), mana: 999 }, { type: 'build', to, kit: 'cart' });

describe('★★ while a crew is out, the leg is a place', () => {
  it('is nothing when nobody is out', () => {
    expect(theWay(initial())).toBeNull();
  });

  it('runs from your end to the far stop, waypoints between', () => {
    const w = theWay(laying())!;
    const ids = w.spots.map((s) => s.id);
    expect(ids[0]).toBe(stopId(START));
    expect(ids).toContain(stopId(to));
    expect(ids.filter((i) => i.startsWith('way:')).length).toBeGreaterThanOrEqual(3);
    // Every mark sits ON the leg's own bent path, not on a straight line.
    const path = pathOf(START, to)!;
    for (const s of w.spots) {
      const near = Math.min(...path.map((p) => Math.hypot(p.x - s.x, p.y - s.y)));
      expect(near, `${s.id} sits ${near.toFixed(1)} off the path`).toBeLessThan(25);
    }
  });

  it('★ what is still in the way is VISIBLE ahead of the crew', () => {
    const g = laying();
    const w = theWay(g)!;
    const halts = w.view.nodes.filter((n) => n.kind === 'halt');
    expect(halts.length).toBe(g.building!.halts.length);
    expect(halts.length).toBeGreaterThan(0);
    expect(halts[0]!.name).toBe('Something ahead');
  });

  it('★ a resolved halt is gone from the way', () => {
    let g = laying();
    // Run the work to its first halt, face it, carry on.
    g = apply(g, { type: 'tick', secs: g.building!.secs });
    expect(g.facing).not.toBeNull();
    g = apply(g, { type: 'face', choice: 0, roll: { a: 6, c1: 3, c2: 4 } });
    g = apply(g, { type: 'carry' });
    const w = theWay(g)!;
    expect(w.view.nodes.filter((n) => n.kind === 'halt').length)
      .toBe(g.building!.halts.length);
  });

  it('★ the crew marker moves with the work, and the fill solidifies behind it', () => {
    let g = laying();
    const w0 = theWay(g)!;
    const crew0 = w0.spots.find((s) => s.id === DOING)!;
    g = apply(g, { type: 'tick', secs: g.building!.secs * 0.4 });
    const w1 = theWay(g)!;
    const crew1 = w1.spots.find((s) => s.id === DOING)!;
    const path = pathOf(START, to)!;
    const start = w0.spots[0]!;
    const d0 = Math.hypot(crew0.x - start.x, crew0.y - start.y);
    const d1 = Math.hypot(crew1.x - start.x, crew1.y - start.y);
    expect(d1, 'the crew never moved').toBeGreaterThan(d0);
    expect(lengthOf(path)).toBeGreaterThan(0);
    // Behind the crew the chain is filling; the last segment is still empty.
    const fills = w1.lines.map((l) => l.fill);
    expect(fills[0]).toBeGreaterThan(0);
    expect(fills[fills.length - 1]).toBe(0);
    // Monotone: nothing ahead of the crew is more built than behind them.
    for (let i = 1; i < fills.length; i++) {
      expect(fills[i]).toBeLessThanOrEqual(fills[i - 1]! + 1e-9);
    }
  });

  it('frames its own box around the leg, padded', () => {
    const w = theWay(laying())!;
    for (const s of w.spots) {
      expect(s.x).toBeGreaterThan(w.box.x);
      expect(s.x).toBeLessThan(w.box.x + w.box.w);
      expect(s.y).toBeGreaterThan(w.box.y);
      expect(s.y).toBeLessThan(w.box.y + w.box.h);
    }
  });
});
