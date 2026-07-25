// Painter for the board. Takes the SAME item list that hit-testing uses, so
// what you tap is provably what you saw (see board.ts).
import type { GameState } from '../core/types';
import type { BoardInput, SceneItem } from './board';
import { anchorPos, band, stageHue } from './board';
import { displayedFidelity } from '../core/engine';
import { D } from '../core/numbers';

const BG = '#080b11';
const ROT = '#b0566b';
const INK = '#eaf6f2';
const DIM = '#5d7385';
const MUTED = '#2f3d4e';

const FONT = 'ui-sans-serif, system-ui, -apple-system, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

function tone(t: SceneItem['tone'], hue: number): string {
  switch (t) {
    case 'core': return `hsl(${hue} 90% 78%)`;
    case 'good': return `hsl(${hue} 70% 58%)`;
    case 'warn': return 'hsl(42 75% 60%)';
    case 'bad': return ROT;
    case 'idle': return `hsl(${hue} 40% 46%)`;
    default: return MUTED;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wrap text to a width, returning the lines. Canvas has no layout engine, so
 *  this is how a definition gets to be readable on a phone. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width <= maxW) { line = attempt; continue; }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.length) {
    const last = lines[maxLines - 1]!;
    if (ctx.measureText(`${last}…`).width > maxW) {
      lines[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 2))}…`;
    }
  }
  return lines;
}

export function paint(canvas: HTMLCanvasElement, input: BoardInput, items: SceneItem[]): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { w, h, state, timeMs } = input;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const hue = stageHue(state.graph.nodes);
  const t = timeMs / 1000;

  if (input.sheet) {
    paintSheet(ctx, input, items, hue);
    return;
  }

  paintSubstrate(ctx, state, w, h, hue, t);
  paintLinks(ctx, state, w, h, hue, t);
  paintProvenanceRing(ctx, state, w, h, hue);

  for (const it of items) {
    switch (it.kind) {
      case 'anchor': paintAnchor(ctx, it, hue, t); break;
      case 'frontier': paintFrontier(ctx, it, hue, t); break;
      case 'stat': paintStat(ctx, it, hue); break;
      case 'machine': paintPill(ctx, it, hue, 'machine'); break;
      case 'save': paintGlyph(ctx, it, hue); break;
      default: paintPill(ctx, it, hue, 'action'); break;
    }
  }
}

// ------------------------------------------------------------- graph layers --

function paintSubstrate(
  ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, hue: number, t: number,
): void {
  const folded = Math.max(0, state.graph.nodes - state.forged.anchors.length);
  const dots = Math.min(folded, 90);
  const trust = displayedFidelity(state);
  const { cx, cy, core: maxR } = band(w, h);
  for (let i = 0; i < dots; i++) {
    let s = (i * 2654435761) >>> 0;
    s = (s ^ (s >>> 13)) >>> 0;
    const rr = maxR * (0.3 + 0.9 * Math.sqrt((s % 1000) / 1000));
    const a = i * 2.39996 * 1.37 + t * 0.012;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    const rotted = (s % 100) / 100 > trust;
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 0.5 + i * 2.1);
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = rotted ? ROT : `hsl(${hue} 45% 42%)`;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintLinks(
  ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, hue: number, t: number,
): void {
  const spin = t * 0.02;
  ctx.strokeStyle = `hsl(${hue} 55% 50% / 0.42)`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [a, b] of state.forged.links) {
    const pa = anchorPos(a, w, h, spin), pb = anchorPos(b, w, h, spin);
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
  }
  ctx.stroke();
}

/** The provenance split, drawn as a ring around the graph rather than a bar in
 *  a HUD: verified / unchecked / drifted, as arcs of the world itself. */
function paintProvenanceRing(
  ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, hue: number,
): void {
  const total = D(state.resources.triples).toNumber();
  if (!(total > 0)) return;
  const u = D(state.provenance.unverified).toNumber();
  const d = D(state.provenance.drifted).toNumber();
  const v = Math.max(0, total - u - d);
  const { cx, cy, ring: r } = band(w, h);
  const segs: Array<[number, string]> = [
    [v / total, `hsl(${hue} 70% 55%)`],
    [u / total, 'hsl(42 70% 52%)'],
    [d / total, ROT],
  ];
  let a0 = -Math.PI / 2;
  ctx.lineWidth = 3;
  for (const [share, color] of segs) {
    if (share <= 0) continue;
    const a1 = a0 + share * Math.PI * 2;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
    a0 = a1;
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
}

// -------------------------------------------------------------- item paints --

function paintAnchor(ctx: CanvasRenderingContext2D, it: SceneItem, hue: number, t: number): void {
  const rotted = it.tone === 'bad';
  const isHub = it.id === 'a0';
  const tw = rotted
    ? 0.45 + 0.35 * Math.abs(Math.sin(t * 5.1))
    : 0.8 + 0.2 * Math.sin(t * 0.7 + it.x * 0.05);
  ctx.globalAlpha = isHub ? 1 : tw;
  ctx.beginPath();
  ctx.arc(it.x, it.y, it.draw, 0, Math.PI * 2);
  ctx.fillStyle = tone(it.tone, hue);
  ctx.fill();
  if (isHub) {
    ctx.beginPath();
    ctx.arc(it.x, it.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = INK;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (isHub && it.label) {
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = `hsl(${hue} 80% 80% / 0.9)`;
    ctx.fillText(it.label, it.x, it.y - 14);
  }
}

function paintFrontier(ctx: CanvasRenderingContext2D, it: SceneItem, hue: number, t: number): void {
  const breathe = 1 + 0.16 * Math.sin(t * 1.6 + it.x * 0.07);
  const c = tone(it.enabled ? 'good' : 'muted', hue);
  ctx.strokeStyle = c;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(it.x, it.y, it.draw * breathe, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(it.x, it.y, 2, 0, Math.PI * 2);
  ctx.fillStyle = c;
  ctx.fill();
  ctx.font = `600 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = it.enabled ? `hsl(${hue} 80% 78%)` : DIM;
  ctx.fillText(clip(it.label, 18), it.x, it.y - it.draw - 8);
  if (it.sub) {
    ctx.font = `9px ${MONO}`;
    ctx.fillStyle = DIM;
    ctx.fillText(it.sub, it.x, it.y + it.draw + 13);
  }
  ctx.lineWidth = 1;
}

function paintStat(ctx: CanvasRenderingContext2D, it: SceneItem, hue: number): void {
  ctx.textAlign = 'center';
  const big = it.id === 'stat-datums';
  ctx.font = big ? `700 34px ${FONT}` : `700 17px ${FONT}`;
  ctx.fillStyle = big ? INK : tone(it.tone, hue);
  ctx.fillText(it.label, it.x, it.y);
  if (it.sub) {
    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = DIM;
    ctx.fillText(it.sub, it.x, it.y + (big ? 18 : 15));
  }
}

function paintPill(
  ctx: CanvasRenderingContext2D, it: SceneItem, hue: number, style: 'machine' | 'action',
): void {
  const c = tone(it.tone, hue);
  const r = it.draw;
  ctx.beginPath();
  ctx.arc(it.x, it.y, r, 0, Math.PI * 2);
  ctx.fillStyle = it.enabled ? `hsl(${hue} 40% 12%)` : '#10151d';
  ctx.fill();
  ctx.strokeStyle = c;
  ctx.lineWidth = it.enabled ? 1.8 : 1;
  ctx.stroke();
  ctx.lineWidth = 1;

  ctx.textAlign = 'center';
  if (it.value) {
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = it.enabled ? INK : DIM;
    ctx.fillText(it.value, it.x, it.y + 4);
  } else {
    ctx.font = `600 ${style === 'action' ? 12 : 11}px ${FONT}`;
    ctx.fillStyle = it.enabled ? c : DIM;
    const words = clip(it.label, 9);
    ctx.fillText(words, it.x, it.y + 4);
  }
  // label under the node, cost under that
  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = it.enabled ? '#93a8b8' : MUTED;
  if (it.value) ctx.fillText(clip(it.label, 17), it.x, it.y + r + 13);
  if (it.sub) {
    ctx.font = `9px ${MONO}`;
    ctx.fillStyle = it.enabled ? c : MUTED;
    ctx.fillText(it.sub, it.x, it.y + r + (it.value ? 25 : 13));
  }
}

function paintGlyph(ctx: CanvasRenderingContext2D, it: SceneItem, hue: number): void {
  ctx.textAlign = 'center';
  ctx.font = `700 18px ${FONT}`;
  ctx.fillStyle = DIM;
  ctx.fillText(it.label, it.x, it.y + 6);
}

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// ------------------------------------------------------------------ sheets --

function paintSheet(
  ctx: CanvasRenderingContext2D, input: BoardInput, items: SceneItem[], hue: number,
): void {
  const { w, h, sheet } = input;
  ctx.fillStyle = '#070a0f';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'left';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = `hsl(${hue} 60% 60%)`;
  const title = sheet === 'review' ? 'REVIEW  ·  DOES EACH DEFINITION MATCH ITS CONCEPT?'
    : sheet === 'vignette' ? 'DECISION' : 'SAVE';
  ctx.fillText(title, 18, 40);

  if (sheet === 'vignette' && input.vignette) {
    const v = input.vignette;
    ctx.font = `700 20px ${FONT}`;
    ctx.fillStyle = v.title ? INK : '#3d5166';
    ctx.fillText(v.title || '⟨title — owner⟩', 18, h * 0.2);
    ctx.font = `italic 13px ${FONT}`;
    ctx.fillStyle = v.body ? '#8fa5b3' : '#3d5166';
    const lines = wrap(ctx, v.body || '⟨body — owner⟩', w - 36, 5);
    lines.forEach((l, i) => ctx.fillText(l, 18, h * 0.2 + 26 + i * 19));
  }

  for (const it of items) {
    if (it.kind === 'stat') { paintReviewRow(ctx, it, w, hue); continue; }
    paintSheetButton(ctx, it, hue);
  }
}

function paintReviewRow(ctx: CanvasRenderingContext2D, it: SceneItem, w: number, hue: number): void {
  const dropped = it.tone === 'muted';
  ctx.textAlign = 'left';
  ctx.globalAlpha = dropped ? 0.4 : 1;
  ctx.font = `700 16px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText(clip(it.label, 26), it.x, it.y + 20);
  if (it.value) {
    ctx.font = `9px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(it.value, it.x, it.y + 34);
  }
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = '#8fa5b3';
  wrap(ctx, it.sub ?? '', w - 160, 4).forEach((l, i) => ctx.fillText(l, it.x, it.y + 52 + i * 16));
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#141c28';
  ctx.beginPath();
  ctx.moveTo(it.x, it.y - 4);
  ctx.lineTo(w - 18, it.y - 4);
  ctx.stroke();
}

function paintSheetButton(ctx: CanvasRenderingContext2D, it: SceneItem, hue: number): void {
  const c = tone(it.tone, hue);
  const isWide = it.kind === 'choice' || it.kind === 'commit' || it.kind === 'save';
  if (isWide) {
    const bw = Math.min(340, it.r * 9);
    roundRect(ctx, it.x - bw / 2, it.y - 26, bw, 52, 12);
    ctx.fillStyle = it.enabled ? `hsl(${hue} 35% 11%)` : '#10151d';
    ctx.fill();
    ctx.strokeStyle = it.enabled ? c : MUTED;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = it.enabled ? (it.label.startsWith('⟨') ? '#3d5166' : INK) : DIM;
    ctx.fillText(it.label, it.x, it.y + (it.sub ? -2 : 5));
    if (it.sub) {
      ctx.font = `9px ${MONO}`;
      ctx.fillStyle = c;
      ctx.fillText(it.sub, it.x, it.y + 14);
    }
    return;
  }
  ctx.beginPath();
  ctx.arc(it.x, it.y, it.draw, 0, Math.PI * 2);
  ctx.fillStyle = it.tone === 'muted' ? '#10151d' : `hsl(${hue} 35% 12%)`;
  ctx.fill();
  ctx.strokeStyle = c;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = it.tone === 'muted' ? DIM : c;
  ctx.fillText(it.label, it.x, it.y + 4);
}
