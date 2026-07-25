// M1 mini graph renderer — canvas 2D, deliberately thin (ARCHITECTURE: "MVP
// stays thin"). Swappable: the PixiJS bloom replaces this at M3 without
// touching core/. Renders a REPRESENTATIVE constellation with LOD — never one
// node per triple (mobile perf guardrail).
import type { GraphStats } from '../core/types';

const MAX_RENDER_NODES = 72; // LOD cap; beyond this the constellation densifies visually, not literally
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const BG = '#0b0e14';
const EDGE = 'rgba(83, 224, 196, 0.22)';
const NODE = '#53e0c4';
const NODE_DIM = '#2f8f83';
const CORE = '#d9fff5';

/** Deterministic pseudo-hash for per-node jitter (render-only; NOT game RNG). */
function jitter(i: number, salt: number): number {
  let t = (i * 374761393 + salt * 668265263) | 0;
  t = (t ^ (t >>> 13)) * 1274126177;
  return (((t ^ (t >>> 16)) >>> 0) / 4294967296) - 0.5;
}

interface P { x: number; y: number }

function layout(count: number, w: number, h: number): P[] {
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(w, h) * 0.44;
  const pts: P[] = [];
  for (let i = 0; i < count; i++) {
    // golden-angle spiral: stable positions — existing nodes never move when one is added
    const r = i === 0 ? 0 : maxR * Math.sqrt(i / Math.max(count, MAX_RENDER_NODES * 0.6));
    const a = i * GOLDEN_ANGLE;
    pts.push({
      x: cx + Math.cos(a) * r + jitter(i, 1) * 8,
      y: cy + Math.sin(a) * r + jitter(i, 2) * 8,
    });
  }
  return pts;
}

export function drawGraph(canvas: HTMLCanvasElement, graph: GraphStats, pulse = 0): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const shown = Math.max(1, Math.min(graph.nodes, MAX_RENDER_NODES));
  const pts = layout(shown, w, h);

  // representative edges: each node links back to a deterministic ancestor
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 1;
  const shownEdges = Math.min(graph.edges, shown - 1);
  for (let i = 1; i <= shownEdges; i++) {
    const parent = i === 1 ? 0 : Math.abs(Math.floor(jitter(i, 3) * 2 * i)) % i;
    const a = pts[parent] ?? pts[0]!;
    const b = pts[i]!;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  for (let i = 0; i < shown; i++) {
    const p = pts[i]!;
    const isHub = i === 0;
    const isNewest = i === shown - 1 && shown > 1;
    const r = isHub ? 7 : 2.6 + 1.6 * Math.abs(jitter(i, 4));
    ctx.beginPath();
    ctx.arc(p.x, p.y, isNewest ? r + pulse * 3 : r, 0, Math.PI * 2);
    ctx.fillStyle = isHub ? NODE : isNewest ? NODE : NODE_DIM;
    ctx.fill();
    if (isHub) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = CORE;
      ctx.fill();
    }
  }
}
