// Graph geometry. That is ALL this file does now.
//
// It used to be a bespoke UI framework drawn on canvas: it laid out every
// counter and button as a "scene item", hit-tested taps against them, placed
// labels with a collision solver, and scaled a set of hand-tuned pixel
// constants to fit the viewport. All of that is work the browser already does,
// and does correctly — CSS handles layout, the DOM handles hit-testing and
// text, and neither of them breaks when the page is zoomed.
//
// So the UI is DOM now and the canvas draws only the graph. The canvas fills
// whatever box CSS gives it, which means there are no magic constants left to
// get wrong on a short screen, and no viewport plumbing: a zoomed page is just
// a zoomed page, the way it is on every other website.
import { edgeKey } from '../core/edges';

/** Deterministic ±0.5 from an integer. Same id, same nudge, every session —
 *  positions must be reproducible or the board would reshuffle on reload. */
function jitter(i: number, salt: number): number {
  let t = (i * 374761393 + salt * 668265263) | 0;
  t = (t ^ (t >>> 13)) * 1274126177;
  return (((t ^ (t >>> 16)) >>> 0) / 4294967296) - 0.5;
}

/** ── THE CAMERA ────────────────────────────────────────────────────────────
 *
 *  There is ONE world and ONE transform into the stage box. Everything that has
 *  a place — nodes, dotted lines, the frontier slots, the substrate haze, the
 *  provenance ring — is authored in WORLD units and put on screen by this
 *  camera. Nothing computes its own pixels from `w` and `h` any more.
 *
 *  The world is a disc of radius `WORLD_RIM` centred on the origin:
 *
 *      0.0        the root concept, `entity`
 *      0…1.0      the taxonomy, one ring per level of depth — see
 *                 `render/layout.ts`, which owns where a concept goes
 *      1.06       the provenance ring
 *      WORLD_RIM  spare margin, so the outermost ring is not flush to the edge
 *
 *  The camera fits that FIXED disc, not the current node bounds. That is the
 *  important part and it is why this replaced three separate pixel formulas:
 *
 *   · Centred by construction. `band()` centred a ring on the stage but the
 *     spiral was laid out independently, so the cluster sat 30px left of the
 *     ring it was supposedly inside. One transform cannot disagree with itself.
 *   · Full by construction. The outermost node is at radius 1.0 at every node
 *     count, so the graph fills the same fraction of the box with 4 concepts
 *     and with 240. The old fixed-radius spiral used 49% of the width and 38%
 *     of the height and had no term that could ever change that.
 *   · STILL by construction. A fit-to-current-bounds camera re-fits on every
 *     discovery, so landing one concept nudges all 200 others — the "everything
 *     pops and the graph restructures" complaint, promoted from a bug to an
 *     invariant. A camera that ignores node count cannot do it.
 *
 *  Only POSITIONS are scaled. Dot radii, label text and line widths stay in
 *  screen px, because a legible tap target is a screen-space fact.
 */
export interface Camera { scale: number; tx: number; ty: number }

/** Outer edge of the world disc, in world units. Everything drawn lives inside
 *  this and the camera guarantees this radius is on screen.
 *
 *  It is a RESERVE, and it is charged to the graph: the concepts get 1/RIM of
 *  the box and the gap between the outermost concept and the frontier gets the
 *  rest. At 1.3 that reserve was 23% of the width — a fifth of the board spent
 *  on empty ring. 1.18 still leaves ~26px between a settled concept and a
 *  discovery hovering outside it, which is what the gap is for. */
export const WORLD_RIM = 1.18;

/** Screen px kept clear around the world disc — for the half of a LABEL that
 *  overhangs its dot ("physical entity" is ~75px wide) and, below, for its one
 *  line of text. Not a magic constant: it is the size of the text, which is the
 *  one thing on the board that is honestly measured in pixels. */
const PAD_X = 46;
const PAD_Y = 24;

/** Scale at which the whole world disc exactly fills the box — zoom 1. */
export function baseScale(w: number, h: number): number {
  const usableW = Math.max(40, w - PAD_X * 2);
  const usableH = Math.max(40, h - PAD_Y * 2);
  // uniform scale: the world is a disc, so squashing it to the box's aspect
  // would turn every ring into an ellipse and every relation into a lie
  return Math.min(usableW, usableH) / (2 * WORLD_RIM);
}

/** How far the player may zoom. The ceiling is high because the deepest ring
 *  holds thousands of concepts and reading one means magnifying a lot; the
 *  floor is below 1 so you can always pull back and see the whole world. */
export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 60;

export const clampZoom = (z: number): number => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

/** The camera for a stage of `w × h` at a given zoom and pan.
 *
 *  Still a pure function of the box and the player's view — never of the graph.
 *  A camera that fits itself to the current node bounds re-fits on every
 *  discovery and nudges all two hundred other nodes, which is the "everything
 *  pops and the graph restructures" complaint promoted to an invariant. */
export function cameraFor(w: number, h: number, zoom = 1, panX = 0, panY = 0): Camera {
  return { scale: baseScale(w, h) * clampZoom(zoom), tx: w / 2 + panX, ty: h / 2 + panY };
}

/** Inverse of `toScreen` — needed so a pinch can keep the point under the
 *  player's fingers pinned while the scale changes, which is the difference
 *  between zooming and lurching. */
export const toWorld = (
  c: Camera, p: { x: number; y: number },
): { x: number; y: number } => ({ x: (p.x - c.tx) / c.scale, y: (p.y - c.ty) / c.scale });

export const toScreen = (
  c: Camera, p: { x: number; y: number },
): { x: number; y: number } => ({ x: p.x * c.scale + c.tx, y: p.y * c.scale + c.ty });

export const FRONTIER_SLOTS = 8;

/** Evenly spaced around the stage rim by SLOT, not by hash, so N discoveries in
 *  flight are always N apart and never land on top of each other.
 *
 *  SCREEN space, deliberately not world space: a discovery in flight is a
 *  progress indicator, not a place in the taxonomy — it has no coordinates yet,
 *  that is the whole point of it being in flight. Pinning it to the world would
 *  send it sailing off the edge the moment the player zoomed in. */
export function frontierPos(slot: number, w: number, h: number): { x: number; y: number } {
  const a = -Math.PI / 2 + (slot / FRONTIER_SLOTS) * Math.PI * 2;
  const rx = Math.max(20, w / 2 - 34);
  const ry = Math.max(20, h / 2 - 26);
  return { x: w / 2 + Math.cos(a) * rx, y: h / 2 + Math.sin(a) * ry };
}

// ---- ★ TAPPING A CONNECTION ----------------------------------------------
//
// The one thing the board could not do. `sim.pick` finds the nearest NODE to a
// finger, which is how dragging works; this finds the nearest LINE, which is
// how confirming works (`src/core/edges.ts`). Screen space and pure geometry —
// it takes the positions the frame already computed and returns which
// connection the finger was on, or nothing.
//
// ⚠️ NODES WIN TIES, AND THAT IS THE CALLER'S JOB. Every line ENDS at a node,
// so a tap on a dot is also a tap on up to a dozen lines. Ask `sim.pick` first
// and only fall through to this when it returns nothing, or dragging the graph
// becomes impossible the moment a concept has one connection.

/** How close a finger has to be to a line, in SCREEN px. Screen space because a
 *  fingertip is a screen-space fact — the same rule dot radii follow — so the
 *  target does not shrink when the player zooms out to see the whole graph.
 *
 *  Smaller than a 44px tap target on purpose: connections converge at the
 *  nodes, and a generous radius there would hand every tap to whichever line
 *  happened to be listed first. The recovery is cheap and immediate (nothing
 *  happens, tap again slightly along the line); the failure it prevents —
 *  signing a connection you did not mean to, which is permanent — is not. */
export const EDGE_TAP_PX = 14;

export interface EdgeHit {
  a: number; b: number; rel: number;
  /** Canonical key, ready for `{ type: 'confirm', edge }`. */
  key: string;
  /** Screen px from the finger to the line. */
  distance: number;
}

/** Distance from a point to a SEGMENT, not to the infinite line through it —
 *  the difference matters at the ends, where an infinite line would claim taps
 *  from beyond the concept the connection stops at. */
function toSegment(
  p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number },
): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** ★ WHICH CONNECTION IS UNDER THE FINGER, if any.
 *
 *  `skip` is the set of keys the tap must ignore — the caller passes the
 *  signatures already on the save, because a confirmed connection is finished
 *  and a tap that lands on one and does nothing is indistinguishable from a
 *  broken control, which is the exact report this whole branch is answering.
 *  Skipping them also means a dense signed cluster never shadows the one dashed
 *  line running through it. */
export function pickEdge(
  edges: ReadonlyArray<{ a: number; b: number; rel: number }>,
  pos: ReadonlyMap<number, { x: number; y: number }>,
  point: { x: number; y: number },
  within: number = EDGE_TAP_PX,
  skip?: ReadonlySet<string>,
): EdgeHit | null {
  let best: EdgeHit | null = null;
  for (const e of edges) {
    const key = edgeKey(e.a, e.b, e.rel);
    if (skip?.has(key)) continue;
    const pa = pos.get(e.a), pb = pos.get(e.b);
    // A connection with an endpoint the level-of-detail pass folded away has no
    // line on screen, so it has no tap target either.
    if (!pa || !pb) continue;
    const d = toSegment(point, pa, pb);
    if (d > within) continue;
    if (!best || d < best.distance) best = { a: e.a, b: e.b, rel: e.rel, key, distance: d };
  }
  return best;
}

/** Representative rot: provenance is an aggregate, so a stable share of nodes
 *  is drawn rotted rather than one record per statement (mobile perf budget). */
export function isRotted(id: number, fidelity: number): boolean {
  if (id === 0 || fidelity >= 1) return false;
  return Math.abs(jitter(id, 23)) * 2 > fidelity;
}

/** Palette drifts with progress, so the world's colour changes as it grows. */
export function stageHue(nodes: number): number {
  return (168 + Math.max(0, Math.log10(Math.max(nodes, 1)) - 1) * 36) % 360;
}

/** Each relation gets its own hue offset, so `has part` never looks like
 *  `is a`. Offsets rather than absolutes, so the palette still drifts. */
export function relHue(rel: number, hue: number): number {
  return (hue + [0, 58, 96, 140, 200][rel % 5]!) % 360;
}
