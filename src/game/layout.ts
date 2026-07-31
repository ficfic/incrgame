// WHERE EVERY PLACE SITS ON THE MAP. Solved ONCE, deterministically, at load.
//
// ⚠️ THIS IS THE THIRD RENDERER AND IT AVOIDS WHAT ACTUALLY FAILED, not graphs.
// `docs/BRIEF.md` opens with the rule: if the graph is hard to draw, change how
// it is drawn — never what the game is. So what is gone is the three things
// that broke, and nothing else:
//
//   NO LIVE FORCE SIMULATION. The old board re-solved every frame, which meant
//   controls were moving targets, Playwright could not click them, and a thumb
//   had the same problem. This runs a fixed number of passes once, at module
//   load, and the answer never changes again.
//
//   NO CAMERA FITTED TO A MEASURED WINDOW. The old one sized itself from
//   `window.innerHeight` while the box was `100dvh`, which are different
//   numbers on iOS whenever the URL bar shows. There is no camera here: the
//   SVG carries a `viewBox` and the browser does the scaling.
//
//   NO RANDOMNESS. Same positions on every device and every load, so a
//   screenshot of a bug is a screenshot anyone can reproduce.
import { PLACES, PLACE, START } from './places';

export interface Spot { id: number; x: number; y: number }

/** Rings by distance from the start, which is what a valley looks like when you
 *  are walking out of it: where you began in the middle, the frontier at the
 *  edge. It also guarantees a sane starting shape, so the relaxation below only
 *  has to tidy rather than discover. */
function seed(): Map<number, { x: number; y: number }> {
  const depth = new Map<number, number>([[START, 0]]);
  const q = [START];
  while (q.length) {
    const at = q.shift()!;
    for (const to of PLACE.get(at)!.ways) {
      if (depth.has(to)) continue;
      depth.set(to, depth.get(at)! + 1);
      q.push(to);
    }
  }
  const byRing = new Map<number, number[]>();
  for (const p of PLACES) {
    const d = depth.get(p.id) ?? 0;
    if (!byRing.has(d)) byRing.set(d, []);
    byRing.get(d)!.push(p.id);
  }
  const pos = new Map<number, { x: number; y: number }>();
  for (const [ring, ids] of byRing) {
    ids.sort((a, b) => a - b);
    const r = ring * 34;
    ids.forEach((id, i) => {
      // A half-turn offset per ring stops successive rings lining up into
      // spokes, which is what makes a radial layout look like a wheel.
      const a = (i / ids.length) * Math.PI * 2 + ring * 0.7;
      pos.set(id, { x: Math.cos(a) * r, y: Math.sin(a) * r });
    });
  }
  return pos;
}

/** A few fixed passes of "push everything apart, pull neighbours together".
 *  Deterministic and bounded: 240 passes over 37 nodes is nothing, it happens
 *  once, and the result is a constant for the rest of the session. */
function relax(pos: Map<number, { x: number; y: number }>): void {
  const ids = PLACES.map((p) => p.id);
  for (let pass = 0; pass < 240; pass++) {
    for (const a of ids) {
      const pa = pos.get(a)!;
      for (const b of ids) {
        if (a === b) continue;
        const pb = pos.get(b)!;
        let dx = pa.x - pb.x, dy = pa.y - pb.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) { dx = (a - b) * 1e-3; dy = 1e-3; d2 = dx * dx + dy * dy; }
        const d = Math.sqrt(d2);
        if (d < 46) {
          const push = (46 - d) / d * 0.14;
          pa.x += dx * push; pa.y += dy * push;
        }
      }
    }
    for (const p of PLACES) {
      const pa = pos.get(p.id)!;
      for (const to of p.ways) {
        const pb = pos.get(to)!;
        const dx = pb.x - pa.x, dy = pb.y - pa.y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = (d - 62) / d * 0.06;
        pa.x += dx * pull; pa.y += dy * pull;
        pb.x -= dx * pull; pb.y -= dy * pull;
      }
    }
  }
}

const solved = (() => {
  const pos = seed();
  relax(pos);
  return PLACES.map((p) => ({ id: p.id, ...pos.get(p.id)! }));
})();

export const SPOTS: readonly Spot[] = solved;
export const SPOT = new Map(SPOTS.map((s) => [s.id, s]));

/** The box the whole map fits in, with room for a label under every dot. This
 *  becomes the SVG's `viewBox`, which is the entire reason there is no camera:
 *  the browser scales the box to the element and nothing here measures a
 *  window, a screen or a piece of browser chrome. */
export const VIEW = (() => {
  const pad = 34;
  const xs = SPOTS.map((s) => s.x), ys = SPOTS.map((s) => s.y);
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad * 1.4;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
})();
