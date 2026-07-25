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
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export interface Band { cx: number; cy: number; core: number; outer: number; ring: number }

/** The graph fills its box. `w`/`h` are the STAGE element's size — the region
 *  flexbox handed us between the header and the dock — so this can never
 *  disagree with the layout the way a hardcoded `h - 168` did. */
export function band(w: number, h: number): Band {
  const outer = Math.max(40, Math.min(w, h) / 2 - 22);
  return { cx: w / 2, cy: h / 2, outer, core: outer * 0.86, ring: outer + 10 };
}

function jitter(i: number, salt: number): number {
  let t = (i * 374761393 + salt * 668265263) | 0;
  t = (t ^ (t >>> 13)) * 1274126177;
  return (((t ^ (t >>> 16)) >>> 0) / 4294967296) - 0.5;
}

/** Positions for every anchor, as a phyllotaxis spiral over the LIST INDEX.
 *
 *  Radius used to come from a hash of the node id, which meant the first
 *  handful of concepts all landed within ~30px of the centre while the world
 *  ring sat 180px away — a tight knot in a large empty circle. Placing by index
 *  fills the disc evenly at any count: four nodes spread out, four hundred pack
 *  in, and the picture is legible at both ends without a special case.
 *
 *  Returned as a map because both the painter and the DOM node layer need the
 *  same answer in the same frame, and computing it twice is how they drift. */
export function positions(
  anchors: readonly number[], w: number, h: number, spin: number,
): Map<number, { x: number; y: number }> {
  const { cx, cy, core } = band(w, h);
  const out = new Map<number, { x: number; y: number }>();
  const n = Math.max(1, anchors.length - 1);
  anchors.forEach((id, i) => {
    if (i === 0) { out.set(id, { x: cx, y: cy }); return; }
    const r = core * Math.sqrt(i / n) * 0.94;
    const a = i * GOLDEN_ANGLE + spin;
    out.set(id, {
      x: cx + Math.cos(a) * r + jitter(id, 1) * 4,
      y: cy + Math.sin(a) * r + jitter(id, 2) * 4,
    });
  });
  return out;
}

export const FRONTIER_SLOTS = 8;

/** Evenly spaced around the ring by SLOT, not by hash, so N discoveries in
 *  flight are always N apart and never land on top of each other. */
export function frontierPos(slot: number, w: number, h: number): { x: number; y: number } {
  const { cx, cy, outer } = band(w, h);
  const a = -Math.PI / 2 + (slot / FRONTIER_SLOTS) * Math.PI * 2;
  return { x: cx + Math.cos(a) * outer, y: cy + Math.sin(a) * outer };
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
