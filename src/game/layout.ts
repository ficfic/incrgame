// WHERE EVERY NODE SITS. Solved by d3-force, run to completion, then FROZEN.
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
import { PLACES, PLACE, START } from './places';
import { placeId, type View } from './world';

export interface Spot { id: number; x: number; y: number }
export interface Placed { id: string; x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface Solved { spots: Placed[]; box: Box }

/** A seeded generator, handed to d3 via `randomSource`, so that d3's own
 *  `Math.random` is never reached.
 *
 *  ⚠️ HONESTLY: THIS IS INSURANCE, NOT LOAD-BEARING, and that was established by
 *  removing it and watching the determinism test STAY GREEN. d3 only reaches for
 *  randomness to jiggle *coincident* nodes apart, and the seeded ring below
 *  never places two nodes on the same point — so today the path is unreachable.
 *  It stays because it costs four lines and the day some view does produce a
 *  coincidence is the day the layout differs on one device in ten. The check
 *  that has teeth is the second-load test, proven red by seeding the ring from
 *  `Math.random` instead. The constants are the standard 32-bit LCG. */
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

/** Run a graph to rest. Same input, same answer, always. */
function settle(ids: string[], links: Array<{ source: string; target: string }>,
  seed: number): Map<string, { x: number; y: number }> {
  // Seeded initial ring rather than d3's phyllotaxis: a shape that already
  // roughly resembles the answer means fewer ticks spent untangling, and an
  // untangled start is most of why the picture comes out readable.
  const nodes: Node[] = ids.map((id, i) => ({
    id,
    x: Math.cos((i / ids.length) * Math.PI * 2) * (30 + ids.length * 2.2),
    y: Math.sin((i / ids.length) * Math.PI * 2) * (30 + ids.length * 2.2),
  }));

  const sim = forceSimulation(nodes)
    .randomSource(seeded(seed))
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

// ---- THE JOURNEY ---------------------------------------------------------
// Its shape never changes, so it is solved once at module load and is a
// constant for the rest of the session.

const journeyPos = settle(
  PLACES.map((p) => placeId(p.id)),
  PLACES.flatMap((p) => p.ways.filter((to) => to > p.id)
    .map((to) => ({ source: placeId(p.id), target: placeId(to) }))),
  0x5eed,
);

export const SPOTS: readonly Spot[] = PLACES.map((p) => ({
  id: p.id, ...journeyPos.get(placeId(p.id))!,
}));
export const SPOT = new Map(SPOTS.map((s) => [s.id, s]));
export const VIEW: Box = boxOf(SPOTS.map((s) => ({ id: placeId(s.id), x: s.x, y: s.y })));

export const JOURNEY: Solved = {
  spots: SPOTS.map((s) => ({ id: placeId(s.id), x: s.x, y: s.y })),
  box: VIEW,
};

/** Distance from the start, kept here because the seed used to need it and the
 *  Self tab still does. */
export const DEPTH = (() => {
  const d = new Map<number, number>([[START, 0]]);
  const q = [START];
  while (q.length) {
    const at = q.shift()!;
    for (const to of PLACE.get(at)!.ways) {
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

  const pos = settle(ids, links, seed);
  const spots = ids.map((id) => ({ id, ...pos.get(id)! }));
  const out = { spots, box: boxOf(spots) };
  cache.set(key, out);
  return out;
}
