// Canvas painter — LINES AND ATMOSPHERE ONLY.
//
// Nodes, labels, counters and buttons are DOM (see App.svelte). This draws the
// things canvas is genuinely better at: hundreds of lines in one path, a field
// of drifting dots, an arc. No text, no hit-testing, no layout — those were all
// reimplementations of things the browser already does correctly, and they were
// what broke under zoom.
import type { Edge, GameState } from '../core/types';
import { band, positions, relHue } from './board';
import { CONNECT_MS, displayedFidelity } from '../core/engine';
import { D } from '../core/numbers';

const ROT = '#b0566b';

export interface Scene {
  state: GameState;
  w: number; h: number;
  timeMs: number;
  hue: number;
  potential: Array<{ a: number; b: number; rel: number }>;
}

export function paintGraph(canvas: HTMLCanvasElement, s: Scene): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { w, h } = s;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const t = s.timeMs / 1000;
  substrate(ctx, s, t);
  lines(ctx, s, t);
  provenanceRing(ctx, s);
}

/** Concept mass beyond the explicit list, as drifting dots. Never one dot per
 *  statement — that is the whole point of keeping it an aggregate. */
function substrate(ctx: CanvasRenderingContext2D, s: Scene, t: number): void {
  const { state, w, h, hue } = s;
  const folded = Math.max(0, state.graph.nodes - state.forged.anchors.length);
  const dots = Math.min(folded, 90);
  const trust = displayedFidelity(state);
  const { cx, cy, core: maxR } = band(w, h);
  for (let i = 0; i < dots; i++) {
    let n = (i * 2654435761) >>> 0;
    n = (n ^ (n >>> 13)) >>> 0;
    const rr = maxR * (0.3 + 0.9 * Math.sqrt((n % 1000) / 1000));
    const a = i * 2.39996 * 1.37 + t * 0.012;
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 0.5 + i * 2.1);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = (n % 100) / 100 > trust ? ROT : `hsl(${hue} 45% 42%)`;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Lines in three states, because the state of a line IS the game.
 *    dotted  — the dataset offers it and you have not drawn it
 *    filling — a slot is booked on it; the solid part grows from a toward b
 *    solid   — drawn. Coloured by relation when checked; one warning colour
 *              when not, because what matters about an unchecked line is that
 *              it is on its way back to dotted. */
function lines(ctx: CanvasRenderingContext2D, s: Scene, t: number): void {
  const { state, w, h, hue } = s;
  const spin = t * 0.02;
  const pos = positions(state.forged.anchors, w, h, spin);
  const centre = { x: w / 2, y: h / 2 };
  const at = (id: number): { x: number; y: number } => pos.get(id) ?? centre;
  const key = (e: { a: number; b: number; rel: number }): string => `${e.a}:${e.b}:${e.rel}`;
  const drawn = new Set(state.forged.edges.map(key));

  ctx.save();
  ctx.setLineDash([2, 5]);
  ctx.lineDashOffset = -t * 8; // a slow march, so possibility reads as alive
  ctx.lineWidth = 1;
  const byRel = new Map<number, Array<{ a: number; b: number; rel: number }>>();
  for (const p of s.potential) {
    if (drawn.has(key(p))) continue;
    const list = byRel.get(p.rel);
    if (list) list.push(p); else byRel.set(p.rel, [p]);
  }
  for (const [rel, list] of byRel) {
    // non-taxonomic possibilities are brighter: rarer, and more interesting to
    // spend a slot on, so they should read that way
    ctx.strokeStyle = `hsl(${relHue(rel, hue)} ${rel === 0 ? 40 : 65}% 55% / ${rel === 0 ? 0.3 : 0.5})`;
    ctx.beginPath();
    for (const p of list) {
      const pa = at(p.a), pb = at(p.b);
      ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.lineWidth = 2;
  ctx.strokeStyle = `hsl(${hue} 80% 68%)`;
  for (const b of state.bookings) {
    if (!b.edge) continue;
    const k = Math.max(0, Math.min(1, (state.lastTick - (b.until - CONNECT_MS)) / CONNECT_MS));
    const pa = at(b.edge.a), pb = at(b.edge.b);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pa.x + (pb.x - pa.x) * k, pa.y + (pb.y - pa.y) * k);
    ctx.stroke();
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'hsl(42 70% 55% / 0.45)';
  ctx.beginPath();
  for (const e of state.forged.edges) {
    if (e.checked) continue;
    const pa = at(e.a), pb = at(e.b);
    ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();

  ctx.lineWidth = 1.6;
  const solid = new Map<number, Edge[]>();
  for (const e of state.forged.edges) {
    if (!e.checked) continue;
    const list = solid.get(e.rel);
    if (list) list.push(e); else solid.set(e.rel, [e]);
  }
  for (const [rel, list] of solid) {
    ctx.strokeStyle = `hsl(${relHue(rel, hue)} 65% 58% / 0.85)`;
    ctx.beginPath();
    for (const e of list) {
      const pa = at(e.a), pb = at(e.b);
      ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
    }
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}

/** The provenance split as a ring around the world rather than a bar in a HUD:
 *  checked / unchecked / rotten, drawn as arcs of the thing itself. */
function provenanceRing(ctx: CanvasRenderingContext2D, s: Scene): void {
  const { state, w, h, hue } = s;
  const total = D(state.resources.triples).toNumber();
  if (!(total > 0)) return;
  const u = D(state.provenance.unverified).toNumber();
  const d = D(state.provenance.drifted).toNumber();
  const { cx, cy, ring: r } = band(w, h);
  const segs: Array<[number, string]> = [
    [Math.max(0, total - u - d) / total, `hsl(${hue} 70% 55%)`],
    [u / total, 'hsl(42 70% 52%)'],
    [d / total, ROT],
  ];
  let a0 = -Math.PI / 2;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.75;
  for (const [share, color] of segs) {
    if (share <= 0) continue;
    const a1 = a0 + share * Math.PI * 2;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    a0 = a1;
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}
