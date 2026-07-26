// The graph's physics. d3-force does the work; this owns the wiring.
//
// WHY A LIBRARY
//
// Placement used to be ~200 lines of hand-rolled geometry in this directory:
// a golden-angle spiral, then a radial taxonomy with sectors divided among
// siblings. Both worked, and both were bespoke solutions to a problem that has
// a standard one. d3-force is the simulation Obsidian's graph view is modelled
// on — many-body repulsion, links as springs, collision, centring — it is ~12KB
// of ISC-licensed code with no DOM and no framework, and it is far better
// tested than anything written here would be.
//
// WHAT IT DOES NOT DO
//
// It does not render. That is deliberate and it is the whole reason this file
// wraps the library rather than adopting one of the batteries-included graph
// packages: those draw LABELS ON CANVAS, and canvas text is exactly what broke
// this game before — overlapping words, tap targets that drifted away from what
// you could see, nothing legible under zoom. Labels stay DOM, lines stay canvas,
// the camera stays ours. d3-force is asked for one thing: where the nodes are.
//
// The layout is FREE-FLOATING. Position means "what is connected to what" and
// nothing else — clusters emerge from the links themselves, the way they do in
// Obsidian. It is not a taxonomy diagram any more: `weight` still comes from
// taxonomic generality (see `detail.ts`) and drives size and visibility, but a
// node's distance from the middle is now an outcome of the physics, not a
// statement about depth.
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation,
  type Simulation, type SimulationLinkDatum, type SimulationNodeDatum,
} from 'd3-force';

export interface SimNode extends SimulationNodeDatum {
  id: number;
  /** Taxonomic generality, 0..1 — heavier concepts are bigger and are pinned
   *  a little harder, so the shape of the graph does not swim about. */
  weight: number;
}

type SimLink = SimulationLinkDatum<SimNode>;

/** The simulation runs in its OWN units — roughly a 300-unit radius — and
 *  `positions()` divides by this on the way out so the rest of the app still
 *  sees a unit-ish world for the camera to scale.
 *
 *  This is not cosmetic. d3-force's force magnitudes are calibrated for
 *  pixel-scale coordinates: the default charge is -30 and typical link
 *  distances are tens of units. Configured against a unit-radius world, a
 *  charge of -22 against a link distance of 0.12 is a repulsion roughly two
 *  hundred times stronger than the springs holding it in — the graph flings
 *  itself to infinity, every node lands outside the viewport, and the board
 *  renders EMPTY. That is exactly what happened; the fix is to let d3 work in
 *  the regime it was tuned for and normalise afterwards. */
export const SIM_UNITS = 300;

export interface GraphInput {
  nodes: Array<{ id: number; weight: number }>;
  /** Undirected for physics purposes — a spring pulls both ways. */
  links: Array<{ a: number; b: number }>;
}

export class GraphSim {
  private sim: Simulation<SimNode, SimLink>;
  private byId = new Map<number, SimNode>();
  private signature = '';

  constructor() {
    this.sim = forceSimulation<SimNode, SimLink>([])
      // `stop()` immediately: d3 runs its own timer by default, and we already
      // have a render loop. Two clocks driving one simulation is how you get a
      // graph that races on a fast phone and crawls on a slow one.
      .stop()
      // Tuned in SIM UNITS (see SIM_UNITS): a ~300-radius world, which is the
      // regime d3's defaults assume. `distanceMax` keeps the many-body force
      // from making every pair interact across the whole graph — at 240 nodes
      // that is the difference between a smooth phone and a hot one.
      .force('charge', forceManyBody<SimNode>()
        .strength((n) => -26 - n.weight * 70)
        .distanceMax(260))
      .force('centre', forceCenter(0, 0).strength(0.05))
      .force('collide', forceCollide<SimNode>().radius((n) => 7 + n.weight * 12))
      .force('link', forceLink<SimNode, SimLink>([])
        .id((n) => n.id)
        .distance((l) => 30 + 26 * (1 - ((l.target as SimNode).weight ?? 0)))
        .strength(0.5))
      .alphaDecay(0.018)
      .velocityDecay(0.34);
  }

  /** Feed the current board in. Nodes that are already simulating keep their
   *  position and momentum, so a discovery nudges the graph rather than
   *  restarting it — which is the difference between a living graph and one
   *  that explodes every eighteen seconds. */
  sync(input: GraphInput): void {
    const sig = `${input.nodes.map((n) => n.id).join(',')}|${input.links.map((l) => `${l.a}:${l.b}`).join(',')}`;
    if (sig === this.signature) return;
    const isFirst = this.signature === '';
    this.signature = sig;

    const next: SimNode[] = [];
    let fresh = 0;
    for (const n of input.nodes) {
      const existing = this.byId.get(n.id);
      if (existing) { existing.weight = n.weight; next.push(existing); continue; }
      fresh++;
      // Enter near the middle but not ON it — coincident nodes give the
      // repulsion force a zero-length vector and the graph flings itself apart.
      const a = (n.id * 2.399963) % (Math.PI * 2);
      const r = 12 + ((n.id * 37) % 100) * 0.9;
      next.push({ id: n.id, weight: n.weight, x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    this.byId = new Map(next.map((n) => [n.id, n]));

    const links: SimLink[] = [];
    for (const l of input.links) {
      if (this.byId.has(l.a) && this.byId.has(l.b)) links.push({ source: l.a, target: l.b });
    }

    this.sim.nodes(next);
    (this.sim.force('link') as ReturnType<typeof forceLink<SimNode, SimLink>>).links(links);
    // Reheat proportionally: a whole board arriving deserves a full settle, one
    // new concept deserves a nudge. Without this the graph either never reacts
    // or re-shuffles completely every time something lands.
    this.sim.alpha(Math.min(1, isFirst ? 1 : 0.18 + fresh * 0.06)).alphaTarget(0);
  }

  /** Advance the simulation. Returns true while it is still moving, so the
   *  render loop can stop repainting a settled board — a phone should not burn
   *  battery holding a picture still. */
  step(): boolean {
    if (this.sim.alpha() <= this.sim.alphaMin() && !this.dragging) return false;
    this.sim.tick();
    return true;
  }

  /** Normalised to a unit-ish world for the camera. Non-finite coordinates are
   *  clamped rather than passed on: one NaN reaching a CSS transform silently
   *  removes a node from the board, and a whole board of them looks exactly
   *  like a renderer that stopped working. */
  positions(): Map<number, { x: number; y: number }> {
    const out = new Map<number, { x: number; y: number }>();
    for (const n of this.byId.values()) {
      const x = Number.isFinite(n.x) ? (n.x as number) / SIM_UNITS : 0;
      const y = Number.isFinite(n.y) ? (n.y as number) / SIM_UNITS : 0;
      out.set(n.id, { x, y });
    }
    return out;
  }

  /** World (normalised) → simulation units, for dragging. */
  static toSim(v: number): number { return v * SIM_UNITS; }

  // ---- dragging ----------------------------------------------------------
  private dragging: SimNode | null = null;

  /** Nearest node to a world point, if it is close enough to have been aimed
   *  at. `within` is in world units and comes from the caller, because "close
   *  enough" is a SCREEN distance (a fingertip) and only the caller knows the
   *  current scale. */
  pick(worldX: number, worldY: number, within: number): number | null {
    const x = worldX * SIM_UNITS, y = worldY * SIM_UNITS;
    let best: number | null = null;
    let bestD = (within * SIM_UNITS) ** 2;
    for (const n of this.byId.values()) {
      const dx = (n.x ?? 0) - x, dy = (n.y ?? 0) - y;
      const d = dx * dx + dy * dy;
      if (d <= bestD) { bestD = d; best = n.id; }
    }
    return best;
  }

  grab(id: number): boolean {
    const n = this.byId.get(id);
    if (!n) return false;
    this.dragging = n;
    n.fx = n.x; n.fy = n.y;
    // hold the simulation warm while a finger is down, so neighbours keep
    // reacting for as long as you are pulling
    this.sim.alphaTarget(0.32).restart();
    return true;
  }

  /** Takes WORLD (normalised) coordinates, like `pick`. */
  dragTo(worldX: number, worldY: number): void {
    if (!this.dragging) return;
    this.dragging.fx = worldX * SIM_UNITS;
    this.dragging.fy = worldY * SIM_UNITS;
  }

  release(): void {
    if (!this.dragging) return;
    // Let it go rather than pinning it: the point of releasing is that the
    // springs take over and the neighbourhood settles somewhere new.
    this.dragging.fx = null;
    this.dragging.fy = null;
    this.dragging = null;
    this.sim.alphaTarget(0);
  }

  get isDragging(): boolean { return this.dragging !== null; }
}
