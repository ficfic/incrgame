// M1.5 mini graph renderer — canvas 2D, deliberately thin (ARCHITECTURE: "MVP
// stays thin"; PixiJS bloom replaces this at M3 without touching core/).
// Renders a REPRESENTATIVE constellation with LOD — never one node per triple.
// Always alive: slow rotation + twinkle; pan/zoom lives in the UI layer and
// arrives here as a view transform.
import type { GraphStats } from '../core/types';

export const MAX_RENDER_NODES = 240; // LOD cap; past this the constellation densifies visually

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BG = '#0b0e14';

export interface GraphView {
  x: number;    // pan offset, css px
  y: number;
  zoom: number; // 1 = fit
}

/** Accent hue for a given graph size — the world's palette drifts as you grow.
 *  teal (~10 nodes) → azure (~100) → violet (~1k) → magenta (~10k) → ember (~100k). */
export function stageHue(nodes: number): number {
  const drift = Math.max(0, Math.log10(Math.max(nodes, 1)) - 1) * 36;
  return (168 + drift) % 360;
}

/** Deterministic pseudo-hash for per-node jitter (render-only; NOT game RNG). */
function jitter(i: number, salt: number): number {
  let t = (i * 374761393 + salt * 668265263) | 0;
  t = (t ^ (t >>> 13)) * 1274126177;
  return (((t ^ (t >>> 16)) >>> 0) / 4294967296) - 0.5;
}

interface P { x: number; y: number }

function layout(count: number, w: number, h: number, spin: number): P[] {
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(w, h) * 0.44;
  const denom = Math.max(count, 40);
  const pts: P[] = [];
  for (let i = 0; i < count; i++) {
    // golden-angle spiral: stable positions — existing nodes never move when
    // one is added; the whole constellation rotates slowly as one body
    const r = i === 0 ? 0 : maxR * Math.sqrt(i / denom);
    const a = i * GOLDEN_ANGLE + spin;
    pts.push({
      x: cx + Math.cos(a) * r + jitter(i, 1) * 7,
      y: cy + Math.sin(a) * r + jitter(i, 2) * 7,
    });
  }
  return pts;
}

/** What just happened — each kind gets its OWN celebration, so a tap that
 *  doesn't birth a node never flickers the same node again.
 *  'touch' = a threshold-less tap; `seq` walks the web so every tap
 *  illuminates a DIFFERENT connection (owner request). */
export type FxKind = 'node' | 'edge' | 'touch';

export interface Fx {
  kind: FxKind;
  startMs: number;
  seq?: number; // for 'touch': which connection to light up
}

export const FX_DURATION_MS = 550;

export interface DrawOptions {
  view: GraphView;
  timeMs: number;  // animation clock (ambient twinkle + rotation)
  fx: Fx | null;   // current celebration, if any
}

export function drawGraph(canvas: HTMLCanvasElement, graph: GraphStats, opts: DrawOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const { view, timeMs, fx } = opts;
  const t = timeMs / 1000;
  // 0..1 progress of the current celebration (1 = just fired, fades to 0)
  const fxK = fx && timeMs - fx.startMs < FX_DURATION_MS
    ? 1 - (timeMs - fx.startMs) / FX_DURATION_MS
    : 0;
  const pulse = fx?.kind === 'node' && fxK > 0 ? Math.sin(fxK * Math.PI) : 0;
  const hue = stageHue(graph.nodes);
  const node = `hsl(${hue} 70% 60%)`;
  const nodeDim = `hsl(${hue} 45% 38%)`;
  const core = `hsl(${hue} 100% 92%)`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // view transform: zoom about the panel center, then pan
  ctx.translate(w / 2 + view.x, h / 2 + view.y);
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(-w / 2, -h / 2);

  const shown = Math.max(1, Math.min(graph.nodes, MAX_RENDER_NODES));
  const spin = t * 0.02; // one slow revolution every ~5 minutes — always moving
  const pts = layout(shown, w, h, spin);
  const sizeScale = Math.max(0.42, Math.sqrt(48 / Math.max(shown, 48)));

  // edges: a spanning tree first, then surplus edges become faint cross-chords
  ctx.lineWidth = 1;
  const treeEdges = Math.min(graph.edges, shown - 1);
  ctx.strokeStyle = `hsl(${hue} 45% 40% / 0.25)`;
  ctx.beginPath();
  for (let i = 1; i <= treeEdges; i++) {
    const parent = i === 1 ? 0 : Math.abs(Math.floor(jitter(i, 3) * 2 * i)) % i;
    const a = pts[parent] ?? pts[0]!;
    const b = pts[i]!;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();

  const chords = Math.min(Math.max(graph.edges - (shown - 1), 0), shown);
  if (chords > 0 && shown > 3) {
    ctx.strokeStyle = `hsl(${hue} 55% 50% / 0.12)`;
    ctx.beginPath();
    for (let c = 0; c < chords; c++) {
      const i = Math.abs(Math.floor(jitter(c, 5) * 2 * shown)) % shown;
      const j = Math.abs(Math.floor(jitter(c, 6) * 2 * shown)) % shown;
      if (i === j) continue;
      ctx.moveTo(pts[i]!.x, pts[i]!.y);
      ctx.lineTo(pts[j]!.x, pts[j]!.y);
    }
    ctx.stroke();
  }

  // beyond the LOD cap the world keeps visibly thickening: an outer halo of
  // "unrendered mass" grows with the true count
  const overflow = graph.nodes / MAX_RENDER_NODES;
  if (overflow > 1) {
    const halo = Math.min(0.45, 0.16 * Math.log10(overflow * 10));
    const maxR = Math.min(w, h) * 0.47;
    ctx.strokeStyle = `hsl(${hue} 70% 55% / ${halo})`;
    ctx.lineWidth = 4 + 3 * Math.log10(overflow * 10);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, maxR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // drawable edge k ∈ [0, treeEdges + chords): tree links first, then chords
  const edgeEndpoints = (k: number): [P, P] | null => {
    if (k < treeEdges) {
      const i = k + 1;
      const parent = i === 1 ? 0 : Math.abs(Math.floor(jitter(i, 3) * 2 * i)) % i;
      const a = pts[parent] ?? pts[0]!;
      const b = pts[i];
      return b && a !== b ? [a, b] : null;
    }
    const c = k - treeEdges;
    if (c >= chords) return null;
    const a = pts[Math.abs(Math.floor(jitter(c, 5) * 2 * shown)) % shown];
    const b = pts[Math.abs(Math.floor(jitter(c, 6) * 2 * shown)) % shown];
    return a && b && a !== b ? [a, b] : null;
  };

  const flashEdge = (k: number, strength: number) => {
    const ends = edgeEndpoints(k);
    if (!ends) return;
    ctx.strokeStyle = `hsl(${hue} 90% 70% / ${strength * fxK})`;
    ctx.lineWidth = 1 + 2.5 * fxK;
    ctx.beginPath();
    ctx.moveTo(ends[0].x, ends[0].y);
    ctx.lineTo(ends[1].x, ends[1].y);
    ctx.stroke();
    ctx.lineWidth = 1;
    // glow the endpoints so the touched relation reads at a glance
    for (const p of ends) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5 + 2 * fxK, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${hue} 85% 68% / ${0.55 * strength * fxK})`;
      ctx.fill();
    }
  };

  const drawableEdges = treeEdges + chords;

  // edge birth: the youngest edge flashes bright when a relation forms
  if (fx?.kind === 'edge' && fxK > 0 && shown > 1 && drawableEdges > 0) {
    flashEdge(drawableEdges - 1, 0.95);
  }

  // touch: every threshold-less tap illuminates a DIFFERENT connection,
  // walking the web tap by tap (falls through to nodes while edges are rare)
  const touchSeq = fx?.kind === 'touch' && fxK > 0 ? fx.seq ?? 0 : null;
  if (touchSeq !== null && drawableEdges > 0) {
    flashEdge(touchSeq % drawableEdges, 0.7);
  }

  // while relations are still rare, a touch lights a different NODE per tap
  const touchedNode = touchSeq !== null && drawableEdges === 0 && shown > 1
    ? 1 + (touchSeq % (shown - 1))
    : -1;

  for (let i = 0; i < shown; i++) {
    const p = pts[i]!;
    const isHub = i === 0;
    const isNewest = i === shown - 1 && shown > 1;
    const isTouched = i === touchedNode;
    // ambient twinkle: each node breathes on its own phase — never a still frame
    const tw = 0.78 + 0.22 * Math.sin(t * (0.6 + Math.abs(jitter(i, 7))) + i * 1.7);
    const r = isHub
      ? 7 + 2 * Math.max(0, Math.log10(Math.max(overflow, 1)))
      : (2.6 + 1.6 * Math.abs(jitter(i, 4))) * sizeScale;
    const lift = isNewest && pulse > 0 ? pulse * 3.5 : isTouched ? fxK * 2.5 : 0;
    ctx.globalAlpha = isHub ? 1 : tw;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + lift, 0, Math.PI * 2);
    ctx.fillStyle = isHub || (isNewest && pulse > 0) || isTouched ? node : nodeDim;
    ctx.fill();
    if (isHub) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
