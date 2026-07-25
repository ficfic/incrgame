// Frontier Mining renderer — canvas 2D, still the thin pre-Pixi skin.
// Three layers, one picture:
//   SUBSTRATE — folded machine-era mass, drawn representatively (LOD; never
//               one sprite per triple).
//   OVERLAY   — the hand-forged web: owned anchors + the exact links you chose.
//   FRONTIER  — surveyed, unclaimed entities on a stationary outer ring
//               (tap targets must not drift under a finger).
import type { ForgedGraph, GraphStats } from '../core/types';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BG = '#0b0e14';
const SUBSTRATE_DOT_BUDGET = 110;
const SUBSTRATE_CHORD_BUDGET = 70;
export const FRONTIER_HIT_RADIUS = 24; // css px at zoom 1 — fat-finger friendly

export interface GraphView {
  x: number;
  y: number;
  zoom: number;
}

export interface GraphScene {
  graph: GraphStats;   // derived counters (totals)
  forged: ForgedGraph; // the hand-built layer
}

export type FxKind = 'node' | 'edge' | 'touch';

export interface Fx {
  kind: FxKind;
  startMs: number;
  seq?: number;
}

export const FX_DURATION_MS = 550;

/** Accent hue drifts with the web's true size — the world ages as you grow. */
export function stageHue(nodes: number): number {
  const drift = Math.max(0, Math.log10(Math.max(nodes, 1)) - 1) * 36;
  return (168 + drift) % 360;
}

/** Deterministic pseudo-hash (render-only; NOT game RNG). */
function jitter(i: number, salt: number): number {
  let t = (i * 374761393 + salt * 668265263) | 0;
  t = (t ^ (t >>> 13)) * 1274126177;
  return (((t ^ (t >>> 16)) >>> 0) / 4294967296) - 0.5;
}

interface P { x: number; y: number }

/** Stable spiral position for an owned anchor id (ids never move once placed). */
function anchorPos(id: number, w: number, h: number, spin: number): P {
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(w, h) * 0.40;
  const r = id === 0 ? 0 : maxR * Math.sqrt(((id * 7) % 240) / 240 + 0.04);
  const a = id * GOLDEN_ANGLE + spin;
  return {
    x: cx + Math.cos(a) * r + jitter(id, 1) * 6,
    y: cy + Math.sin(a) * r + jitter(id, 2) * 6,
  };
}

/** Stationary ring position for a frontier entity (hit-testing depends on it). */
export function frontierPos(id: number, w: number, h: number): P {
  const R = Math.min(w, h) * 0.47;
  const a = (jitter(id, 9) + 0.5) * Math.PI * 2;
  return { x: w / 2 + Math.cos(a) * R, y: h / 2 + Math.sin(a) * R };
}

/** Screen → world coords under the pan/zoom transform (for hit-testing). */
export function toWorld(px: number, py: number, view: GraphView, w: number, h: number): P {
  return {
    x: (px - w / 2 - view.x) / view.zoom + w / 2,
    y: (py - h / 2 - view.y) / view.zoom + h / 2,
  };
}

export interface DrawOptions {
  view: GraphView;
  timeMs: number;
  fx: Fx | null;
}

export function drawGraph(canvas: HTMLCanvasElement, scene: GraphScene, opts: DrawOptions): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const { view, timeMs, fx } = opts;
  const { graph, forged } = scene;
  const t = timeMs / 1000;
  const spin = t * 0.02;
  const hue = stageHue(graph.nodes);
  const bright = `hsl(${hue} 70% 60%)`;
  const dim = `hsl(${hue} 45% 38%)`;
  const core = `hsl(${hue} 100% 92%)`;

  const fxK = fx && timeMs - fx.startMs < FX_DURATION_MS
    ? 1 - (timeMs - fx.startMs) / FX_DURATION_MS
    : 0;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2 + view.x, h / 2 + view.y);
  ctx.scale(view.zoom, view.zoom);
  ctx.translate(-w / 2, -h / 2);

  // ---- SUBSTRATE: folded mass as ambient dust + faint chords + halo ----
  const foldedNodes = Math.max(0, graph.nodes - forged.anchors.length);
  const foldedEdges = Math.max(0, graph.edges - forged.links.length);
  const dots = Math.min(foldedNodes, SUBSTRATE_DOT_BUDGET);
  const maxR = Math.min(w, h) * 0.40;
  const dustPos = (i: number): P => {
    const r = maxR * (0.25 + 0.75 * Math.abs(jitter(i, 11)) ** 0.5);
    const a = i * GOLDEN_ANGLE * 1.37 + spin * 0.6;
    return { x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r };
  };
  if (foldedEdges > 0 && dots > 3) {
    const chords = Math.min(foldedEdges, SUBSTRATE_CHORD_BUDGET);
    ctx.strokeStyle = `hsl(${hue} 40% 40% / 0.10)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c < chords; c++) {
      const a = dustPos(Math.abs(Math.floor(jitter(c, 12) * 2 * dots)) % dots);
      const b = dustPos(Math.abs(Math.floor(jitter(c, 13) * 2 * dots)) % dots);
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < dots; i++) {
    const p = dustPos(i);
    const tw = 0.35 + 0.2 * Math.sin(t * 0.5 + i * 2.1);
    ctx.globalAlpha = tw;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = dim;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const overflow = foldedNodes / SUBSTRATE_DOT_BUDGET;
  if (overflow > 1) {
    ctx.strokeStyle = `hsl(${hue} 70% 55% / ${Math.min(0.4, 0.14 * Math.log10(overflow * 10))})`;
    ctx.lineWidth = 3 + 2.5 * Math.log10(overflow * 10);
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.435, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // ---- OVERLAY: the exact web you wove ----
  const links = forged.links;
  ctx.strokeStyle = `hsl(${hue} 55% 50% / 0.5)`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (const [a, b] of links) {
    const pa = anchorPos(a, w, h, spin);
    const pb = anchorPos(b, w, h, spin);
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();
  ctx.lineWidth = 1;

  // edge FX: newest link flashes when a claim wires in
  if (fx?.kind === 'edge' && fxK > 0 && links.length > 0) {
    const [a, b] = links[links.length - 1]!;
    flashLine(ctx, anchorPos(a, w, h, spin), anchorPos(b, w, h, spin), hue, fxK, 0.95);
  }
  // touch FX: each threshold-less tap walks a different link (or anchor)
  const touchSeq = fx?.kind === 'touch' && fxK > 0 ? fx.seq ?? 0 : null;
  if (touchSeq !== null && links.length > 0) {
    const [a, b] = links[touchSeq % links.length]!;
    flashLine(ctx, anchorPos(a, w, h, spin), anchorPos(b, w, h, spin), hue, fxK, 0.65);
  }
  const touchedAnchor = touchSeq !== null && links.length === 0 && forged.anchors.length > 0
    ? forged.anchors[touchSeq % forged.anchors.length]
    : undefined;

  const newestAnchor = forged.anchors[forged.anchors.length - 1];
  for (const id of forged.anchors) {
    const p = anchorPos(id, w, h, spin);
    const isHub = id === 0;
    const isNewest = id === newestAnchor && !isHub;
    const pulse = fx?.kind === 'node' && fxK > 0 && isNewest ? Math.sin(fxK * Math.PI) : 0;
    const tw = 0.8 + 0.2 * Math.sin(t * (0.6 + Math.abs(jitter(id, 7))) + id * 1.7);
    const r = isHub ? 7 : 3.4;
    ctx.globalAlpha = isHub ? 1 : tw;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + pulse * 3.5 + (id === touchedAnchor ? fxK * 2.5 : 0), 0, Math.PI * 2);
    ctx.fillStyle = isHub || isNewest || id === touchedAnchor ? bright : dim;
    ctx.fill();
    if (isHub) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // ---- FRONTIER: hollow, breathing, stationary — asking to be claimed ----
  for (const id of forged.frontier) {
    const p = frontierPos(id, w, h);
    const breathe = 1 + 0.18 * Math.sin(t * 1.6 + id * 2.4);
    ctx.strokeStyle = `hsl(${hue} 85% 68% / 0.85)`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5.5 * breathe, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue} 85% 68% / 0.6)`;
    ctx.fill();
  }
  ctx.lineWidth = 1;
}

function flashLine(ctx: CanvasRenderingContext2D, a: P, b: P, hue: number, k: number, strength: number): void {
  ctx.strokeStyle = `hsl(${hue} 90% 70% / ${strength * k})`;
  ctx.lineWidth = 1 + 2.5 * k;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.lineWidth = 1;
  for (const p of [a, b]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5 + 2 * k, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue} 85% 68% / ${0.55 * strength * k})`;
    ctx.fill();
  }
}
