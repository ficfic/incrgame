// Canvas painter — LINES AND ATMOSPHERE ONLY.
//
// Nodes, labels, counters and buttons are DOM (see App.svelte). This draws the
// things canvas is genuinely better at: hundreds of lines in one path, a field
// of drifting dots, an arc. No text, no hit-testing, no layout — those were all
// reimplementations of things the browser already does correctly, and they were
// what broke under zoom.
import type { Edge, GameState } from '../core/types';
import { type Camera, relHue, toScreen } from './board';
import { CONNECT_MS, displayedFidelity } from '../core/engine';
import { D } from '../core/numbers';

const ROT = '#b0566b';

/** An arrowhead at `pb`, pulled back off the node so it does not sit under the
 *  dot. Lines are DIRECTED — `has part` is not symmetric and neither is `is a` —
 *  and until this existed the renderer drew `car has part wheel` and
 *  `wheel has part car` as pixel-identical segments, which threw away the one
 *  thing the relation work spent a day getting right. GLOSSARY's RDF row calls
 *  it "a directed labeled graph"; this is that word, honoured. */
function arrow(
  ctx: CanvasRenderingContext2D,
  pa: { x: number; y: number }, pb: { x: number; y: number }, size: number,
): void {
  const dx = pb.x - pa.x, dy = pb.y - pa.y;
  const len = Math.hypot(dx, dy);
  if (len < size * 2.5) return; // too short to read; the label carries it
  const ux = dx / len, uy = dy / len;
  const tipX = pb.x - ux * 7, tipY = pb.y - uy * 7; // clear of the node dot
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - ux * size + uy * size * 0.5, tipY - uy * size - ux * size * 0.5);
  ctx.lineTo(tipX - ux * size - uy * size * 0.5, tipY - uy * size + ux * size * 0.5);
  ctx.closePath();
  ctx.fill();
}

export interface Scene {
  state: GameState;
  w: number; h: number;
  timeMs: number;
  hue: number;
  /** Connections available but not drawn, and the node positions — both
   *  computed once by the shell and handed down, never re-derived here. */
  dotted: Array<{ a: number; b: number; rel: number }>;
  pos: Map<number, { x: number; y: number }>;
  /** The player's current view. Handed down, never recomputed here — the
   *  painter recomputing its own camera is how the atmosphere ended up centred
   *  somewhere the graph inside it was not, and it would now silently ignore
   *  zoom and pan as well. */
  cam: Camera;
}

export function paintGraph(canvas: HTMLCanvasElement, s: Scene): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { w, h, cam } = s;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const t = s.timeMs / 1000;
  substrate(ctx, s, cam, t);
  lines(ctx, s, t);
  provenanceRing(ctx, s, cam);
}

/** Concept mass beyond the explicit list, as drifting dots. Never one dot per
 *  statement — that is the whole point of keeping it an aggregate. */
function substrate(ctx: CanvasRenderingContext2D, s: Scene, cam: Camera, t: number): void {
  const { state, hue } = s;
  const folded = Math.max(0, D(state.forged.foldedNodes).toNumber() || 0);
  const dots = Math.min(folded, 90);
  const trust = displayedFidelity(state);
  for (let i = 0; i < dots; i++) {
    let n = (i * 2654435761) >>> 0;
    n = (n ^ (n >>> 13)) >>> 0;
    // world units: the haze occupies the same disc the named concepts do
    const rr = 0.28 + 0.74 * Math.sqrt((n % 1000) / 1000);
    const a = i * 2.39996 * 1.37 + t * 0.012;
    const p = toScreen(cam, { x: Math.cos(a) * rr, y: Math.sin(a) * rr });
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 0.5 + i * 2.1);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
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
  const centre = { x: w / 2, y: h / 2 };
  const at = (id: number): { x: number; y: number } => s.pos.get(id) ?? centre;

  ctx.save();
  ctx.setLineDash([2, 5]);
  ctx.lineDashOffset = -t * 8; // a slow march, so possibility reads as alive
  ctx.lineWidth = 1;
  const byRel = new Map<number, Array<{ a: number; b: number; rel: number }>>();
  for (const p of s.dotted) {
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

  // (An unchecked-edge pass lived here, drawing thin amber lines. Unchecked
  //  edges ARE the dotted lines now — App.svelte builds `dotted` from them —
  //  so this drew every proposal a second time, solid, on top of its own dashes.)

  ctx.lineWidth = 1.6;
  const solid = new Map<number, Edge[]>();
  for (const e of state.forged.edges) {
    if (!e.checked) continue;
    const list = solid.get(e.rel);
    if (list) list.push(e); else solid.set(e.rel, [e]);
  }
  for (const [rel, list] of solid) {
    const c = `hsl(${relHue(rel, hue)} 65% 58% / 0.85)`;
    ctx.strokeStyle = c;
    ctx.beginPath();
    for (const e of list) {
      const pa = at(e.a), pb = at(e.b);
      ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
    }
    ctx.stroke();
    ctx.fillStyle = c;
    for (const e of list) arrow(ctx, at(e.a), at(e.b), 5);
  }
  ctx.lineWidth = 1;
}

/** The provenance split as a ring around the world rather than a bar in a HUD:
 *  checked / unchecked / rotten, drawn as arcs of the thing itself. */
function provenanceRing(ctx: CanvasRenderingContext2D, s: Scene, cam: Camera): void {
  const { state, hue } = s;
  const total = D(state.resources.triples).toNumber();
  if (!(total > 0)) return;
  const u = D(state.provenance.unverified).toNumber();
  const d = D(state.provenance.drifted).toNumber();
  // world radius 1.06 — just outside the outermost concept, inside the frontier
  const cx = cam.tx, cy = cam.ty, r = 1.06 * cam.scale;
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
