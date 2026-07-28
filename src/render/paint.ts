// Canvas painter — LINES AND ATMOSPHERE ONLY.
//
// Nodes, labels, counters and buttons are DOM (see App.svelte). This draws the
// things canvas is genuinely better at: hundreds of lines in one path, a field
// of drifting dots, an arc. No text, no hit-testing, no layout — those were all
// reimplementations of things the browser already does correctly, and they were
// what broke under zoom.
import type { GameState } from '../core/types';
import { type Camera, relHue, toScreen } from './board';
import { D } from '../core/numbers';

const ROT = '#b0566b';

export interface Scene {
  state: GameState;
  w: number; h: number;
  timeMs: number;
  hue: number;
  /** Connections available but not drawn, and the node positions — both
   *  computed once by the shell and handed down, never re-derived here. */
  dotted: Array<{ a: number; b: number; rel: number }>;
  /** WHILE EXTRACTION RUNS. Pairs it is reading, and concepts reaching toward
   *  relations whose other end you have not discovered. Purely a picture of
   *  work: nothing here is in the save, and it vanishes when the run lands. */
  flash?: { pairs: Array<{ a: number; b: number; rel: number }>; stubs: number[] };
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
  substanceRing(ctx, s, cam);
}

/** The atmosphere: facts as a haze, never one dot per fact — Solid, Raw and Rot
 *  are a MASS, and drawing them as objects would be a lie about what they are.
 *  Density follows how much of the world you hold; colour follows how much of
 *  what you hold has worn out. */
function substrate(ctx: CanvasRenderingContext2D, s: Scene, cam: Camera, t: number): void {
  const { state, hue } = s;
  const dots = Math.min(state.held.length, 90);
  const trust = 1 - rotShare(state);
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

  // ---- THE EXTRACTION FLASH ---------------------------------------------
  if (s.flash && (s.flash.pairs.length > 0 || s.flash.stubs.length > 0)) {
    ctx.save();
    // FLOORED. This was `0.35 + 0.35 * sin(t * 9)`, which reaches ZERO twice a
    // second — the flash disappeared completely between beats and a screenshot
    // caught it mid-trough looking like it had never been implemented.
    const pulse = 0.45 + 0.25 * Math.sin(t * 6);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([2, 4]);
    ctx.lineDashOffset = -t * 26; // travelling, so it reads as scanning
    ctx.strokeStyle = `hsl(${hue} 85% 72% / ${pulse})`;
    ctx.beginPath();
    for (const p of s.flash.pairs) {
      const pa = at(p.a), pb = at(p.b);
      ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
    }
    // Reaching for something that is not there yet: a stub heading away from
    // the middle, stopping in empty space, because the other end has not been
    // discovered and drawing it anywhere would be a lie about where it is.
    for (const id of s.flash.stubs) {
      const pa = at(id);
      const dx = pa.x - centre.x, dy = pa.y - centre.y;
      const len = Math.hypot(dx, dy) || 1;
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pa.x + (dx / len) * 46, pa.y + (dy / len) * 46);
    }
    ctx.stroke();
    ctx.restore();
  }

}

/** How much of the one substance has worn out. Not a readout — nothing shows
 *  this number — only the colour of the haze and the length of one arc. */
function rotShare(state: GameState): number {
  const total = D(state.solid).add(D(state.raw)).add(D(state.rot)).toNumber();
  return total > 0 ? D(state.rot).toNumber() / total : 0;
}

/** ONE STACKED BAR, drawn as a ring around the world instead of a strip in a
 *  HUD: Solid, Raw and Rot are one substance in three states, so they get one
 *  object on screen and not three (docs/ECONOMY_SRR.md §3). */
function substanceRing(ctx: CanvasRenderingContext2D, s: Scene, cam: Camera): void {
  const { state, hue } = s;
  const solid = D(state.solid).toNumber();
  const u = D(state.raw).toNumber();
  const d = D(state.rot).toNumber();
  const total = solid + u + d;
  if (!(total > 0)) return;
  // world radius 1.06 — just outside the outermost concept, inside the frontier
  const cx = cam.tx, cy = cam.ty, r = 1.06 * cam.scale;
  const segs: Array<[number, string]> = [
    [Math.max(0, solid) / total, `hsl(${hue} 70% 55%)`],
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
