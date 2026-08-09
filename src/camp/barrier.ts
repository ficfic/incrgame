// THE BARRIER — the line around the ground you hold.
//
// ★★ THE OWNER, 2026-08-09, on a design mock: *"yeah in noobtown he's had a
// barrier."* Mayor of Noobtown draws a ward around the town and pushes it
// outward as you take ground; this is that, on a graph.
//
// It is a PICTURE OF A FACT THE GAME ALREADY HAS — the ground with no goblins
// standing on it — rather than a new quantity. Liberating a holding moves the
// line, which is the point: taking ground currently changes some numbers and
// nothing you can see from across the room.
//
// Pure geometry. No DOM, no canvas, no colour — `Camp.svelte` turns the points
// into a `Shape`, the same way scenery does.
import { SITES, type City } from './engine';
import type { Pt } from '../game/shapes';

/** How far outside the held stops the line runs, in world units. Wide enough
 *  to read as ground rather than an outline traced round the dots. */
export const WARD_PAD = 52;
/** Points sampled around each held stop before the hull is taken. Ten is
 *  plenty at this padding — the drawn line is Catmull-Rom through the hull,
 *  so the curve does the smoothing, not the sample count. */
const RING = 10;

/** The ground you hold: every stop on the map with no goblins standing on it.
 *  Hidden ground (`behind` an unliberated holding) is not yours either. */
export function held(g: City): Pt[] {
  const out: Pt[] = [];
  for (const s of SITES) {
    if (g.goblins[s.id]) continue;
    if (s.behind !== undefined && g.goblins[s.behind]) continue;
    out.push({ x: s.x, y: s.y });
  }
  return out;
}

/** Andrew's monotone chain. Counter-clockwise, no repeated last point. */
function hull(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt): number =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const half = (src: Pt[]): Pt[] => {
    const h: Pt[] = [];
    for (const q of src) {
      while (h.length >= 2 && cross(h[h.length - 2]!, h[h.length - 1]!, q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  return [...half(p), ...half(p.slice().reverse())];
}

/** ★ THE LINE ITSELF, in world coordinates, closed.
 *
 *  Every held stop contributes a ring of points and the hull is taken over all
 *  of them. That is what makes one stop, two stops and nine stops all work
 *  without a special case: a lone camp yields a circle, two yield a capsule,
 *  and a spread-out country yields a rounded shell. Insetting a polygon by
 *  hand needs mitre handling and degenerates on thin shapes — this does not.
 *
 *  Empty when nothing is held, which cannot happen in play (the camp is never
 *  goblin-held) but must not throw if it ever does. */
export function ward(g: City): Pt[] {
  const spots = held(g);
  if (spots.length === 0) return [];
  const ring: Pt[] = [];
  for (const s of spots) {
    for (let i = 0; i < RING; i++) {
      const a = (i / RING) * Math.PI * 2;
      ring.push({ x: s.x + Math.cos(a) * WARD_PAD, y: s.y + Math.sin(a) * WARD_PAD });
    }
  }
  return hull(ring);
}

/** A stable key for the shape of the line — so the board can bake it and only
 *  redraw when the held ground actually changes, not every frame. */
export const wardKey = (g: City): string =>
  SITES.filter((s) => !g.goblins[s.id]).map((s) => s.id).join(',');
