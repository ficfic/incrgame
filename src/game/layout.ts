// WHERE EVERY NODE SITS. The chapter is AUTHORED; every other tab is solved by
// d3-force, run to completion, then FROZEN.
//
// ⚠️ THIS REPLACES A HAND-ROLLED RELAXATION, AT THE OWNER'S REQUEST, 2026-08-01.
// After playing: *"the graph, as far as I understand, it is now just statically
// rendered, and I don't like that… the connections seem slightly misaligned…
// I feel like we still need to use some existing library in order to render
// that. I like nodes that jingle like in Obsidian, but maybe if we can stop them
// from jingling it would be best."*
//
// `d3-force` had been a dependency of this project the whole time and was never
// once imported. `CLAUDE.md`'s own stack names it. So the layout is d3's now,
// and the two things the previous renderer got RIGHT are kept, because both
// were bought with real bugs:
//
//   IT SETTLES AND STOPS. The simulation is ticked to completion here, in one
//   go, and the positions are then a constant. A board that re-solves every
//   frame has dots that a thumb cannot hit and Playwright cannot click — that
//   shipped once. The owner asked for the jingling to stop, and it stops.
//   Dragging a node is the ONE thing that moves anything, and that is the shell.
//
//   IT IS DETERMINISTIC. d3-force reaches for `Math.random` to shake apart
//   coincident nodes; `randomSource` below replaces it with a seeded generator,
//   so the same graph lands in the same place on every device and every load —
//   which is what makes a screenshot of a bug reproducible.
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY,
  type SimulationNodeDatum } from 'd3-force';
import { STOPS, STOP as BY_ID, START } from './stops';
import { stopId, type View } from './world';

export interface Spot { id: number; x: number; y: number }
export interface Placed { id: string; x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Solved { spots: Placed[]; box: Box }

/** A seeded generator. It does two jobs, and it is LOAD-BEARING for both.
 *
 *  It is handed to d3 via `randomSource` so d3's own `Math.random` is never
 *  reached — that part is insurance, since d3 only randomises to jiggle
 *  coincident nodes apart. And it jitters the starting ring in `settle`, which
 *  is what stops two views of the same size drawing the same picture.
 *
 *  ⚠️ THE SEED IS THE VIEW. Same tab, same picture every time you open it;
 *  different tab, different picture. The constants are the standard 32-bit
 *  LCG. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** How many ticks d3 itself considers "run to completion": the number at which
 *  alpha decays from 1 to alphaMin at the default rate. Written out rather than
 *  hard-coded to 300 so it stays right if the decay is ever tuned. */
const TICKS = Math.ceil(Math.log(0.001) / Math.log(1 - 0.0228));

interface Node extends SimulationNodeDatum { id: string }

/** Run a graph to rest. Same input, same answer, always.
 *
 *  ⚠️ `hint` IS WHY TWO ROOMS NO LONGER LOOK THE SAME. Read the note on
 *  `solve` — a plain ring seeded from index and count gave every view with the
 *  same node count a pixel-identical picture. */
function settle(ids: string[], links: Array<{ source: string; target: string }>,
  seed: number, hint?: Map<string, { x: number; y: number }>): Map<string, { x: number; y: number }> {
  const rnd = seeded(seed);
  // A start that already resembles the answer means fewer ticks spent
  // untangling, and an untangled start is most of why the picture comes out
  // readable. Where the valley has a real opinion about where a place lies,
  // use it; otherwise a ring, JITTERED FROM THE SEED so that two views of the
  // same size do not begin — and therefore end — in the same arrangement.
  const nodes: Node[] = ids.map((id, i) => {
    const known = hint?.get(id);
    if (known) return { id, x: known.x, y: known.y };
    const a = (i / ids.length) * Math.PI * 2 + (rnd() - 0.5) * (Math.PI * 2 / ids.length);
    const r = (30 + ids.length * 2.2) * (0.8 + rnd() * 0.45);
    return { id, x: Math.cos(a) * r, y: Math.sin(a) * r };
  });

  const sim = forceSimulation(nodes)
    .randomSource(rnd)
    .force('link', forceLink<Node, { source: string; target: string }>(links)
      .id((d) => d.id).distance(78).strength(0.7))
    .force('charge', forceManyBody().strength(-320).distanceMax(420))
    // A dot is ~7 units and its label sits under it, so nothing may come within
    // a label's height of anything else. This is what stopped the old board
    // printing two names on top of each other.
    .force('collide', forceCollide(30).strength(0.9))
    // Gravity towards the origin instead of `forceCenter`, which yanks the
    // whole cloud each tick and makes the last few ticks wobble rather than
    // settle. Weak enough not to crush the frontier into the middle.
    .force('x', forceX(0).strength(0.045))
    .force('y', forceY(0).strength(0.045))
    .stop();

  sim.tick(TICKS);
  return new Map(nodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}

/** The box a set of positions occupies, with room for a label under the lowest
 *  dot. The shell fits this to the canvas; nothing here measures a screen. */
export function boxOf(spots: Placed[], pad = 40): Box {
  if (!spots.length) return { x: -pad, y: -pad, w: pad * 2, h: pad * 2 };
  const xs = spots.map((s) => s.x), ys = spots.map((s) => s.y);
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad * 1.3;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ---- THE CHAPTER ---------------------------------------------------------
//
// ★★ THE CHAPTER IS NOT SOLVED. IT IS AUTHORED, AND THE BOARD DRAWS IT WHERE IT
// IS WRITTEN.
//
// ⚠️ WHAT THIS REPLACED, AND WHY IT WAS A REAL BUG RATHER THAN AN UGLY PICTURE.
// This used to hand the chapter to `settle()` like any other tab, throwing away
// the coordinates `stops.ts` had just authored and re-solving from a seed. Two
// things followed, and the second is the serious one:
//
//   THE CROSSING STOPPED READING AS A CROSSING. `stops.ts` bows five routes
//   between a start on the left and a finish on the right. Force-solved, the
//   Finish landed in the MIDDLE of the board and the five ways did not read as
//   five ways — so the one decision a chapter offers was invisible in the one
//   picture that exists to show it.
//
//   ★ AND THE GROUND UNDER A STOP WAS NOT ITS GROUND. `terrain.ts` bakes
//   scenery from each stop's authored `x`/`y`. The stops were drawn at force
//   coordinates. So a stop painted on wood was priced by `GOING` as water, and
//   the map was decoration wearing the costume of information — which is the
//   exact failure this whole redesign exists to end.
//
// No test caught it for a session, because every test asked the SOLVER where
// things were and the solver was self-consistent. `test/layout.test.ts` now
// asks `stops.ts` instead.
//
// The other tabs are still solved: they are filters with no geography of their
// own, and `solve()` seeds them from these positions so a room still looks like
// where it is.
export const SPOTS: readonly Spot[] = STOPS.map((p) => ({ id: p.id, x: p.x, y: p.y }));
export const SPOT = new Map(SPOTS.map((s) => [s.id, s]));
export const VIEW: Box = (() => {
  const v = boxOf(SPOTS.map((s) => ({ id: stopId(s.id), x: s.x, y: s.y })));
  // ★ THE WEST MARGIN IS THE SEA. The coast hugs the westmost stops
  // (`relief.shoreX`), so without extra frame there the water would be a
  // sliver. Thirty-six units costs ~5% of map scale and buys a visible coast.
  return { x: v.x - 36, y: v.y, w: v.w + 36, h: v.h };
})();

export const JOURNEY: Solved = {
  spots: SPOTS.map((s) => ({ id: stopId(s.id), x: s.x, y: s.y })),
  box: VIEW,
};

/** Roads-from-the-start, in hops. Kept because the seed uses it. */
export const DEPTH = (() => {
  const d = new Map<number, number>([[START, 0]]);
  const q = [START];
  while (q.length) {
    const at = q.shift()!;
    for (const to of BY_ID.get(at)!.near) {
      if (d.has(to)) continue;
      d.set(to, d.get(at)! + 1);
      q.push(to);
    }
  }
  return d;
})();

// ---- EVERY OTHER TAB -----------------------------------------------------
// `docs/TABS.md` R1.4: layout is per-view and solved once. The other tabs are
// filters whose shape follows the run, so they are solved on demand and
// MEMOISED by their exact shape — same nodes and edges, same picture.

const cache = new Map<string, Solved>();

export function solve(view: View): Solved {
  const key = view.nodes.map((n) => n.id).join(',') + '|'
    + view.edges.map((e) => `${e.a}-${e.b}`).join(',');
  const had = cache.get(key);
  if (had) return had;

  const ids = view.nodes.map((n) => n.id);
  const have = new Set(ids);
  const links = view.edges.filter((e) => have.has(e.a) && have.has(e.b))
    .map((e) => ({ source: e.a, target: e.b }));

  // ⚠️ THE SEED IS THE SHAPE, NOT A COUNTER. Keyed off the view so a tab is the
  // same picture every time you open it, and so two tabs that happen to have
  // the same number of nodes do not come out as the same drawing.
  let seed = 0x9e37;
  for (let i = 0; i < key.length; i++) seed = (Math.imul(seed, 31) + key.charCodeAt(i)) >>> 0;

  // ★ PLACES START WHERE THEY ACTUALLY ARE IN THE VALLEY. Two rooms with the
  // same number of ways now differ because the valley differs, which is both
  // truthful and free: `SPOT` is already solved.
  const hint = new Map<string, { x: number; y: number }>();
  for (const id of ids) {
    if (!id.startsWith('stop:')) continue;
    const at = SPOT.get(Number(id.slice('stop:'.length)));
    if (at) hint.set(id, { x: at.x, y: at.y });
  }
  const pos = settle(ids, links, seed, hint.size >= 2 ? hint : undefined);
  const spots = ids.map((id) => ({ id, ...pos.get(id)! }));
  const out = { spots, box: boxOf(spots) };
  cache.set(key, out);
  return out;
}
