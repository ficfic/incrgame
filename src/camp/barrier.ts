// THE BARRIER — the line around the ground you hold.
//
// ★★ THE OWNER, 2026-08-09, on a design mock: *"yeah in noobtown he's had a
// barrier."* Mayor of Noobtown draws a ward around the town and pushes it
// outward as you take ground; this is that, on a graph.
//
// It is a PICTURE OF A FACT THE GAME ALREADY HAS rather than a new quantity.
// Taking ground moves the line, which is the point: expanding used to change
// some numbers and nothing you could see from across the room.
//
// Pure geometry. No DOM, no canvas, no colour — `Camp.svelte` turns the points
// into a `Shape`, the same way scenery does.
import { SITES, SITE, pathKey, type City } from './engine';
import type { Pt } from '../game/shapes';

/** How far outside the held stops the line runs, in world units. Wide enough
 *  to read as ground rather than an outline traced round the dots. */
export const WARD_PAD = 52;
/** Points sampled around each held stop before the hull is taken. Ten is
 *  plenty at this padding — the drawn line is Catmull-Rom through the hull,
 *  so the curve does the smoothing, not the sample count. */
const RING = 10;

/** ★★★ WHAT "HELD" MEANS — rewritten 2026-08-10, and the rewrite IS the fix.
 *
 *  ⚠️ THE OLD DEFINITION WAS THE BUG. It read *"every stop with no goblins
 *  standing on it"*, which on a fresh save is the entire starter ring — so the
 *  line was born enclosing four sites the player had never walked to. The
 *  owner, playtesting: *"it is hard to understand that this is a barrier. Why
 *  does it cover Rock Face and Tall Pines? Because I have not yet went to Tall
 *  Pines."* Quite right. Empty ground nobody has claimed is not a frontier you
 *  pushed outward; it is just ground.
 *
 *  So held ground is now ground you have ACTUALLY TAKEN:
 *
 *    1. THE CAMP — you stand on it, and losing it ends the run.
 *    2. Anything with something STANDING on it (`stacks > 0`). You built
 *       there; it is yours whether or not the road home survives.
 *    3. Anything CONNECTED to the camp by finished paths, walking only over
 *       ground that is already yours. A laid road is the act of claiming.
 *
 *  and then two subtractions that outrank all three:
 *
 *    4. GOBLIN GROUND IS NEVER INSIDE — including ground they take BACK. A
 *       raid that strips a site bare and holds it drops it out of the line,
 *       so the barrier visibly shrinks when the war goes badly. (The paths to
 *       it survive the raid, which is exactly why the goblin test has to beat
 *       the path walk rather than sit beside it.)
 *    5. Ground the board does not DRAW is not inside a line the board draws.
 *       A site `behind` an unliberated holding is hidden by `shown()`; a lobe
 *       of barrier bulging toward an invisible dot would read as a glitch.
 *
 *  ⚠️ NOT `component()` FROM THE ENGINE, deliberately: that walk crosses
 *  goblin ground, because for hauling purposes a path is a path. Here it must
 *  not — if a raid takes the middle of an arm, the country beyond it is cut
 *  off, and the line should fall back to what is still contiguously yours.
 *
 *  ⚠️ A path UNDER THE SPADE (`laying`) does not count. The road fills on the
 *  board as it is dug; the barrier moves when it lands. One event, one tell. */
export function heldIds(g: City): number[] {
  /** Ground that is eligible at all — rules 4 and 5, which outrank the rest. */
  const mine = (id: number): boolean => {
    const s = SITE.get(id);
    if (!s) return false;
    if (g.goblins[id]) return false;
    if (s.behind !== undefined && g.goblins[s.behind]) return false;
    return true;
  };
  const out = new Set<number>();
  // Rules 1 and 3: walk out from the camp along finished paths, refusing to
  // step onto ground that is not yours.
  if (mine(0)) {
    out.add(0);
    const queue = [0];
    for (let i = 0; i < queue.length; i++) {
      for (const n of SITE.get(queue[i]!)?.near ?? []) {
        if (out.has(n) || !g.paths[pathKey(queue[i]!, n)] || !mine(n)) continue;
        out.add(n);
        queue.push(n);
      }
    }
  }
  // Rule 2: anything you have built on, road or no road.
  for (const s of SITES) if ((g.stacks[s.id] ?? 0) > 0 && mine(s.id)) out.add(s.id);
  return [...out].sort((a, b) => a - b);
}

/** The held ground as points, for the geometry below. */
export const held = (g: City): Pt[] =>
  heldIds(g).map((id) => ({ x: SITE.get(id)!.x, y: SITE.get(id)!.y }));

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
 *  Empty when nothing is held. That is reachable now — a lost run has goblins
 *  on the camp itself — so it must not throw. */
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
 *  redraw when the held ground actually changes, not every frame. `heldIds` is
 *  sorted and fully determines the shape, so this is exactly the shape's
 *  identity: no less (it must change on a raid) and no more (it must NOT
 *  change when a stack grows from 3 to 4). */
export const wardKey = (g: City): string => heldIds(g).join(',');
