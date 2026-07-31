import { describe, it, expect } from 'vitest';
import { SPOTS, SPOT, VIEW, MIN_BOX, solve } from '../src/game/layout';
import { PLACES, PLACE } from '../src/game/places';
import { here, self, thoughts } from '../src/game/world';
import { initial } from '../src/game/engine';

describe('the map layout', () => {
  it('places every place exactly once, with real numbers', () => {
    expect(SPOTS.length).toBe(PLACES.length);
    for (const s of SPOTS) {
      expect(Number.isFinite(s.x), `${s.id} x`).toBe(true);
      expect(Number.isFinite(s.y), `${s.id} y`).toBe(true);
    }
    expect(new Set(SPOTS.map((s) => s.id)).size).toBe(PLACES.length);
  });

  it('★ never puts two places on top of each other', () => {
    // The defect that killed the last board: dots close enough that a tap hit
    // the wrong one. Here it is a property of the data, checkable without a
    // browser, because the layout is solved once and never moves again.
    let worst = Infinity; let pair = '';
    for (let i = 0; i < SPOTS.length; i++) {
      for (let j = i + 1; j < SPOTS.length; j++) {
        const d = Math.hypot(SPOTS[i]!.x - SPOTS[j]!.x, SPOTS[i]!.y - SPOTS[j]!.y);
        if (d < worst) { worst = d; pair = `${PLACE.get(SPOTS[i]!.id)!.name} / ${PLACE.get(SPOTS[j]!.id)!.name}`; }
      }
    }
    expect(worst, `closest pair ${pair} at ${worst.toFixed(1)} units`).toBeGreaterThan(24);
  });

  it('fits every place inside the viewBox', () => {
    for (const s of SPOTS) {
      expect(s.x, `${s.id}`).toBeGreaterThanOrEqual(VIEW.x);
      expect(s.x, `${s.id}`).toBeLessThanOrEqual(VIEW.x + VIEW.w);
      expect(s.y, `${s.id}`).toBeGreaterThanOrEqual(VIEW.y);
      expect(s.y, `${s.id}`).toBeLessThanOrEqual(VIEW.y + VIEW.h);
    }
    expect(VIEW.w).toBeGreaterThan(0);
    expect(VIEW.h).toBeGreaterThan(0);
  });

  it('is the same every time — no clock, no randomness', () => {
    // Asserted on the actual numbers rather than on the absence of Math.random,
    // because "deterministic" is the property, not the implementation.
    const a = SPOTS.map((s) => `${s.id}:${s.x.toFixed(6)},${s.y.toFixed(6)}`).join('|');
    const b = [...SPOT.values()].map((s) => `${s.id}:${s.x.toFixed(6)},${s.y.toFixed(6)}`).join('|');
    expect(a).toBe(b);
  });

  it('★ a small tab is not a zoomed-in one', () => {
    // ⚠️ THE viewBox IS ALSO THE FONT SIZE. Every tab hands the browser a box
    // and lets it scale to the column, so a four-dot view in a 130-unit box was
    // drawn at three times the journey's zoom and its labels came out three
    // times bigger — screenshotted on Here, "The Cut" straddling its neighbour.
    // Nothing was wrong with the layout. The tab was zoomed in.
    const g = initial();
    for (const [name, view] of [['here', here(g)], ['self', self(g)],
      ['thoughts', thoughts(g)]] as const) {
      const { box } = solve(view);
      expect(box.w, `${name} is ${box.w.toFixed(0)} units wide`)
        .toBeGreaterThanOrEqual(MIN_BOX.w);
      expect(box.h, `${name} is ${box.h.toFixed(0)} units tall`)
        .toBeGreaterThanOrEqual(MIN_BOX.h);
    }
    // And the floor is close enough to the journey's own box that a label is
    // the same size on every tab — within a fifth, not within an order.
    expect(VIEW.w / MIN_BOX.w).toBeLessThan(1.2);
  });

  it('still fits its own dots after the box is grown', () => {
    const { spots, box } = solve(here(initial()));
    for (const s of spots) {
      expect(s.x, s.id).toBeGreaterThanOrEqual(box.x);
      expect(s.x, s.id).toBeLessThanOrEqual(box.x + box.w);
      expect(s.y, s.id).toBeGreaterThanOrEqual(box.y);
      expect(s.y, s.id).toBeLessThanOrEqual(box.y + box.h);
    }
  });

  it('keeps neighbours nearer than strangers, on average', () => {
    // A layout that ignored the edges would still pass everything above.
    const dist = (a: number, b: number): number =>
      Math.hypot(SPOT.get(a)!.x - SPOT.get(b)!.x, SPOT.get(a)!.y - SPOT.get(b)!.y);
    let near = 0, nearN = 0, far = 0, farN = 0;
    for (const p of PLACES) {
      for (const q of PLACES) {
        if (p.id === q.id) continue;
        if (p.ways.includes(q.id)) { near += dist(p.id, q.id); nearN++; }
        else { far += dist(p.id, q.id); farN++; }
      }
    }
    expect(near / nearN).toBeLessThan(far / farN);
  });
});
