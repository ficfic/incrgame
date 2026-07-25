// Label placement.
//
// Canvas has no layout engine, so text drawn "above the node" is text drawn
// blindly: two nodes near each other produce two labels on top of each other,
// and a node near the edge produces a label half off the screen. Both were
// happening — `measure` and `group` overwrote each other's cost lines, and
// `otherworld` ran off the right edge.
//
// This is the fix, and it is built to survive a much busier board: every label
// is a REQUEST with a priority. Requests are placed in priority order, each
// trying a few candidate positions around its node, and any label that cannot
// find a clear spot is simply not drawn. Crowding degrades by dropping the
// least important labels rather than by producing a smear.

export interface LabelRequest {
  x: number; y: number;      // the node the label belongs to
  radius: number;            // how far to sit off the node
  text: string;
  sub?: string;
  /** Higher wins a contested spot. The root and a just-landed concept outrank
   *  ordinary anchors, which are the first thing to go when space runs out. */
  priority: number;
  color: string;
  subColor?: string;
  font?: string;
  subFont?: string;
}

export interface PlacedLabel {
  x: number; y: number;      // text anchor (centre-aligned)
  text: string;
  sub?: string;
  subY?: number;
  color: string;
  subColor: string;
  font: string;
  subFont: string;
}

interface Rect { x: number; y: number; w: number; h: number }

const PAD = 3;
const LINE = 13;
const SUB_LINE = 11;

/** Hard ceiling on how many requests are even CONSIDERED, applied after the
 *  priority sort. Placement is quadratic — each candidate box is tested against
 *  every box already down — and the board can hand us 240 anchors at 60 fps,
 *  which is ~230k rectangle tests per frame on a phone. A screen this size fits
 *  nowhere near 32 labels anyway, so everything past the cut would have been
 *  measured, rejected and thrown away. Priority order means what gets dropped is
 *  the same set that crowding would have dropped. */
const MAX_CANDIDATES = 32;

function overlaps(a: Rect, b: Rect): boolean {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function inside(r: Rect, w: number, h: number, top: number, bottom: number): boolean {
  return r.x >= 4 && r.x + r.w <= w - 4 && r.y >= top && r.y + r.h <= bottom;
}

/** Place as many labels as will fit. Returns only the ones that found room. */
export function placeLabels(
  ctx: CanvasRenderingContext2D,
  requests: LabelRequest[],
  w: number, h: number,
  bounds: { top: number; bottom: number },
  occupied: Rect[] = [],
): PlacedLabel[] {
  const taken: Rect[] = [...occupied];
  const out: PlacedLabel[] = [];
  const ordered = [...requests]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, MAX_CANDIDATES);

  for (const req of ordered) {
    const font = req.font ?? '600 11px ui-sans-serif, system-ui, sans-serif';
    const subFont = req.subFont ?? '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.font = font;
    const tw = ctx.measureText(req.text).width;
    let sw = 0;
    if (req.sub) { ctx.font = subFont; sw = ctx.measureText(req.sub).width; }
    const boxW = Math.max(tw, sw) + PAD * 2;
    const boxH = LINE + (req.sub ? SUB_LINE : 0) + PAD;

    // above · below · right · left — first clear one wins
    const gap = req.radius + 6;
    const candidates: Array<{ cx: number; cy: number }> = [
      { cx: req.x, cy: req.y - gap - boxH + LINE },
      { cx: req.x, cy: req.y + gap + LINE },
      { cx: req.x + gap + boxW / 2, cy: req.y + LINE / 2 },
      { cx: req.x - gap - boxW / 2, cy: req.y + LINE / 2 },
    ];

    let placed: PlacedLabel | null = null;
    for (const c of candidates) {
      const rect: Rect = { x: c.cx - boxW / 2, y: c.cy - LINE, w: boxW, h: boxH };
      if (!inside(rect, w, h, bounds.top, bounds.bottom)) continue;
      if (taken.some((t) => overlaps(t, rect))) continue;
      taken.push(rect);
      placed = {
        x: c.cx, y: c.cy, text: req.text, sub: req.sub,
        subY: req.sub ? c.cy + SUB_LINE : undefined,
        color: req.color, subColor: req.subColor ?? req.color,
        font, subFont,
      };
      break;
    }
    if (placed) out.push(placed);
    // no room anywhere → this label is dropped, deliberately and silently
  }
  return out;
}

export function drawLabels(ctx: CanvasRenderingContext2D, labels: PlacedLabel[]): void {
  ctx.textAlign = 'center';
  for (const l of labels) {
    ctx.font = l.font;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, l.x, l.y);
    if (l.sub && l.subY !== undefined) {
      ctx.font = l.subFont;
      ctx.fillStyle = l.subColor;
      ctx.fillText(l.sub, l.x, l.subY);
    }
  }
}
