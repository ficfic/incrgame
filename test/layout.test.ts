import { describe, it, expect, vi } from 'vitest';
import { SPOTS, SPOT, VIEW, solve } from '../src/game/layout';
import { PLACES, PLACE } from '../src/game/places';
import { here, self } from '../src/game/world';
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

  it('★ is the same on a SECOND LOAD, not just a second read', () => {
    // ⚠️ THE ONE THAT ACTUALLY CATCHES `Math.random`. Comparing SPOTS to itself
    // passes no matter what the solver does; this re-imports the module from
    // scratch and compares the two runs. d3-force reaches for Math.random to
    // shake coincident nodes apart, so without `randomSource` this goes red.
    vi.resetModules();
    return import('../src/game/layout').then((again) => {
      const one = SPOTS.map((s) => `${s.id}:${s.x.toFixed(9)},${s.y.toFixed(9)}`);
      const two = again.SPOTS.map((s) => `${s.id}:${s.x.toFixed(9)},${s.y.toFixed(9)}`);
      expect(two).toEqual(one);
    });
  });

  // ⚠️ THE "A SMALL TAB IS NOT A ZOOMED-IN ONE" TEST IS GONE, and its bug with
  // it. That defect existed because the box WAS the font size — every tab handed
  // the browser a viewBox and let it scale, so a four-dot view came out at three
  // times the zoom with three times the label size, and `MIN_BOX` was the
  // workaround. The board now draws to a canvas and every label is DOM text at a
  // CSS font size, so a tab's node count cannot affect how big its words are.
  // Structurally impossible beats guarded against.

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

// ★ TWO ROOMS MUST NOT LOOK LIKE THE SAME ROOM.
//
// The owner, playing 2026-08-01: *"I'm at the Tally. And now the Here tab
// didn't update."* It had updated — the labels were right and the engine was
// right. THE PICTURE WAS IDENTICAL. `settle` seeded its ring from index and
// count alone, so every view with the same node count and the same star
// topology landed on the same coordinates to the decimal, and walking from The
// Cut to The Tally (two ways each) redrew a board that had not visibly moved.
//
// Reported as "the tab didn't update", which is what a layout bug looks like
// from the outside, and why this is a LAYOUT test and not a view test.
describe('★ a room looks like itself', () => {
  const shot = (id: number): string =>
    solve(here({ ...initial(), at: id, seen: [id] }))
      .spots.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(' ');

  it('draws two places with the same number of ways differently', () => {
    const byWays = new Map<number, number[]>();
    for (const p of PLACES) {
      if (!byWays.has(p.ways.length)) byWays.set(p.ways.length, []);
      byWays.get(p.ways.length)!.push(p.id);
    }
    let pairs = 0;
    for (const ids of byWays.values()) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          pairs++;
          expect(shot(ids[i]!), `${PLACE.get(ids[i]!)!.name} vs ${PLACE.get(ids[j]!)!.name}`)
            .not.toBe(shot(ids[j]!));
        }
      }
    }
    expect(pairs, 'no two places share a way-count — the test proves nothing')
      .toBeGreaterThan(20);
  });

  it('★ names the pair the owner actually walked', () => {
    // The Cut → The Tally. Both have two ways. Keep it by name so a future
    // change that reintroduces the bug fails with the words from the report.
    const cut = PLACES.find((p) => p.name === 'The Cut')!;
    const tally = PLACES.find((p) => p.name === 'The Tally')!;
    expect(cut.ways.length).toBe(tally.ways.length);
    expect(shot(cut.id)).not.toBe(shot(tally.id));
  });

  it('★ and the same is true of Self, which has only ONE place in it', () => {
    // Self is `you` + where you stand + four facts, so the place-hints path
    // cannot help it — one hint is not a shape. The seeded JITTER is what keeps
    // Self at The Cut from being the same drawing as Self at The Tally, and
    // this is the test that makes that jitter load-bearing rather than decorative.
    const shotSelf = (id: number): string =>
      solve(self({ ...initial(), at: id, seen: [id] }))
        .spots.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join(' ');
    const cut = PLACES.find((p) => p.name === 'The Cut')!;
    const tally = PLACES.find((p) => p.name === 'The Tally')!;
    expect(shotSelf(cut.id)).not.toBe(shotSelf(tally.id));
    expect(shotSelf(cut.id)).toBe(shotSelf(cut.id));
  });

  it('but the same room twice is the same picture', () => {
    // The other half: a view must not shuffle itself between visits.
    const cut = PLACES.find((p) => p.name === 'The Cut')!;
    expect(shot(cut.id)).toBe(shot(cut.id));
  });
});
