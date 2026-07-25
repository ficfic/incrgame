// The board IS the game.
//
// There is no HTML UI. Every number, every button and every label is a node in
// the graph, laid out here and drawn on one full-screen canvas. This module is
// the whole skin: `layout()` turns game state into a list of tappable items,
// `draw()` paints them. The engine still knows nothing about any of it.
//
// Two rules that shape the code:
//   1. LAYOUT AND DRAW ARE SEPARATE. The same item list is used for hit-testing
//      and for painting, so what you tap is provably what you saw. A tap target
//      that disagrees with the picture is the class of bug that made the review
//      desk unusable, and it is not going to happen twice.
//   2. TAP TARGETS ARE FINGERS, NOT PIXELS. Every item carries a hit radius of
//      at least MIN_TOUCH; the drawn shape may be smaller than the target.
import type { GameState, ReviewItem, Vignette } from '../core/types';
import {
  agentCost, attentionCap, attentionFree, coverage, displayedFidelity, recovered,
  supervisedPerSecond, unsupervised, unsupervisedPerSecond, verified,
} from '../core/engine';
import { D, format, formatWhole, gte } from '../core/numbers';
import { GENERATORS, M1_ROSTER } from '../content/generators';
import { CONCEPT_BUDGET } from '../content/ontologyMeta';
import { describeEffects } from '../content/vignettes';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BG = '#080b11';
const ROT = '#b0566b';
const MIN_TOUCH = 26; // css px radius — ~52px across
const SUBSTRATE_DOTS = 90;

export type ItemKind =
  | 'frontier' | 'anchor' | 'machine' | 'stat' | 'survey' | 'review'
  | 'vignette' | 'retrain' | 'absorb' | 'reviewVerdict' | 'commit'
  | 'choice' | 'sheetClose' | 'save' | 'setSupervision';

export interface SceneItem {
  id: string;
  kind: ItemKind;
  x: number; y: number;
  r: number;            // hit radius
  draw: number;         // drawn radius (may differ from hit radius)
  label: string;
  sub?: string;
  value?: string;
  enabled: boolean;
  tone: 'core' | 'good' | 'warn' | 'bad' | 'idle' | 'muted';
  payload?: unknown;
}

/** Which sheet, if any, is open. Sheets are drawn ON the board, not in the DOM. */
export type Sheet = null | 'review' | 'vignette' | 'save';

export interface BoardInput {
  state: GameState;
  w: number; h: number;
  sheet: Sheet;
  verdicts: boolean[];               // review accept/reject, index-aligned to state.review
  vignette: Vignette | null;
  conceptFor: (index: number) => { label: string; gloss: string; category: string } | null;
  labelForNode: (nodeId: number) => string | undefined;
  timeMs: number;
  /** Concepts that have just landed: node id → when it landed and which ring
   *  slot it came from, so the painter can ease it into place instead of
   *  snapping it there. Animation is a skin concern; the engine never sees it. */
  landings: Map<number, { at: number; slot: number }>;
  /** Tap feedback, in board coordinates. */
  ripples: Array<{ x: number; y: number; at: number }>;
}

// ---------------------------------------------------------------- geometry --

function jitter(i: number, salt: number): number {
  let t = (i * 374761393 + salt * 668265263) | 0;
  t = (t ^ (t >>> 13)) * 1274126177;
  return (((t ^ (t >>> 16)) >>> 0) / 4294967296) - 0.5;
}

/** The graph occupies an explicit band between the stats and the action row,
 *  and every ring is CLAMPED to fit inside it — including the labels that hang
 *  off each node. Derived from a fixed fraction of the viewport instead, the
 *  frontier ran off the right edge and the provenance ring left the screen
 *  entirely on a 390pt phone. */
export const STATS_H = 118;
export const ACTION_Y = (h: number): number => h - 168;
export const MACHINE_Y = (h: number): number => h - 76;

export interface Band { cx: number; cy: number; core: number; outer: number; ring: number }

export function band(w: number, h: number): Band {
  const top = STATS_H;
  const bottom = ACTION_Y(h) - 52;
  const cy = (top + bottom) / 2;
  const halfH = Math.max(60, (bottom - top) / 2);
  // leave room for a label above a frontier node and its cost below
  const outer = Math.max(50, Math.min(w / 2 - 40, halfH - 26));
  return { cx: w / 2, cy, outer, core: outer * 0.60, ring: Math.min(outer + 16, w / 2 - 12) };
}

export function anchorPos(id: number, w: number, h: number, spin: number): { x: number; y: number } {
  const { cx, cy, core } = band(w, h);
  const r = id === 0 ? 0 : core * Math.sqrt(((id * 7) % 240) / 240 + 0.05);
  const a = id * GOLDEN_ANGLE + spin;
  return { x: cx + Math.cos(a) * r + jitter(id, 1) * 5, y: cy + Math.sin(a) * r + jitter(id, 2) * 5 };
}

/** Evenly spaced around the ring by SLOT, not by hash. Slot 0 sits at the top
 *  and they fan clockwise, so N discoveries are always N apart and their labels
 *  have room. */
export function frontierPos(slot: number, w: number, h: number): { x: number; y: number } {
  const { cx, cy, outer } = band(w, h);
  const a = -Math.PI / 2 + (slot / FRONTIER_SLOTS) * Math.PI * 2;
  return { x: cx + Math.cos(a) * outer, y: cy + Math.sin(a) * outer };
}
export const FRONTIER_SLOTS = 8;

/** Representative rot: provenance is aggregate, so a stable share of nodes is
 *  drawn rotted rather than one record per statement (mobile perf budget). */
function isRotted(id: number, fidelity: number): boolean {
  if (id === 0 || fidelity >= 1) return false;
  return Math.abs(jitter(id, 23)) * 2 > fidelity;
}

export function stageHue(nodes: number): number {
  return (168 + Math.max(0, Math.log10(Math.max(nodes, 1)) - 1) * 36) % 360;
}

// ------------------------------------------------------------------ layout --

export function layout(input: BoardInput): SceneItem[] {
  const { state, w, h, sheet } = input;
  const items: SceneItem[] = [];
  const push = (i: SceneItem): void => { items.push(i); };

  // A sheet takes the whole board: only its own controls are tappable, so a
  // stray tap can never hit the graph behind an open decision.
  if (sheet === 'review') return layoutReviewSheet(input);
  if (sheet === 'vignette') return layoutVignetteSheet(input);
  if (sheet === 'save') return layoutSaveSheet(input);

  const spin = input.timeMs / 1000 * 0.02;
  const trust = displayedFidelity(state);

  // ---- stats, across the top. These are nodes too; tapping does nothing yet
  const statY = 42;
  const clean = D(supervisedPerSecond(state)).toNumber();
  const dirty = D(unsupervisedPerSecond(state)).toNumber();
  const flow = clean + dirty > 0
    ? `statements  +${(clean + dirty).toFixed(1)}/s · ${Math.round((clean / (clean + dirty)) * 100)}% checked`
    : 'statements';
  push({
    id: 'stat-statements', kind: 'stat', x: w / 2, y: statY, r: 0, draw: 0,
    label: formatWhole(state.resources.triples),
    sub: flow,
    enabled: false, tone: 'core',
  });

  const cov = coverage(state);
  push({
    id: 'stat-coverage', kind: 'stat', x: w * 0.20, y: statY + 44, r: 0, draw: 0,
    label: `${recovered(state)}`,
    sub: `of ${CONCEPT_BUDGET}`,
    value: `${(cov * 100).toFixed(cov < 0.01 ? 2 : 1)}%`,
    enabled: false, tone: 'good',
  });
  push({
    id: 'stat-fidelity', kind: 'stat', x: w * 0.5, y: statY + 44, r: 0, draw: 0,
    label: `${(trust * 100).toFixed(0)}%`,
    sub: 'fidelity',
    value: formatWhole(verified(state)),
    enabled: false, tone: trust > 0.66 ? 'good' : trust > 0.33 ? 'warn' : 'bad',
  });
  const free = attentionFree(state);
  push({
    id: 'stat-attention', kind: 'stat', x: w * 0.80, y: statY + 44, r: 0, draw: 0,
    label: `${free}`,
    sub: `free of ${attentionCap(state)}`,
    enabled: false, tone: free > 0 ? 'good' : 'warn',
  });

  // ---- the knowledge graph itself: anchors are nodes, frontier are targets
  for (const id of state.forged.anchors) {
    const p = anchorPos(id, w, h, spin);
    push({
      id: `a${id}`, kind: 'anchor', x: p.x, y: p.y, r: 0,
      draw: id === 0 ? 7 : 3.4,
      label: input.labelForNode(id) ?? '',
      enabled: false,
      tone: isRotted(id, trust) ? 'bad' : id === 0 ? 'core' : 'idle',
    });
  }

  // Discoveries in flight: a slot of your attention is booked onto each one,
  // and it lands by itself. Not tappable — it is already working.
  for (const b of state.bookings) {
    if (b.kind !== 'discover' || b.node === undefined) continue;
    const p = frontierPos(b.slot ?? 0, w, h);
    const left = Math.max(0, (b.until - state.lastTick) / 1000);
    push({
      id: `f${b.node}`, kind: 'frontier', x: p.x, y: p.y, r: 0, draw: 7,
      label: input.labelForNode(b.node) ?? '…',
      sub: `${left.toFixed(0)}s`,
      enabled: true, tone: 'good', payload: b.node,
    });
  }

  // ---- action nodes, ringing the core where the thumb lands
  const actionY = ACTION_Y(h);
  const actions: SceneItem[] = [];
  const canDiscover = attentionFree(state) >= 1 && state.bookings.length < 8;
  actions.push({
    id: 'discover', kind: 'survey', x: 0, y: actionY, r: 34, draw: 27,
    label: 'Discover', sub: canDiscover ? '1 slot · 18s' : 'no free slot',
    enabled: canDiscover, tone: canDiscover ? 'good' : 'muted',
  });
  if (state.review.length > 0) {
    const ok = attentionFree(state) >= 1;
    actions.push({
      id: 'review', kind: 'review', x: 0, y: actionY, r: 34, draw: 27,
      label: 'Review', sub: ok ? '1 slot · 25s' : 'no free slot',
      enabled: ok, tone: ok ? 'warn' : 'muted',
    });
  }
  if (D(state.pending).gt(0)) {
    actions.push({
      id: 'absorb', kind: 'absorb', x: 0, y: actionY, r: 34, draw: 27,
      label: 'Absorb', sub: formatWhole(state.pending),
      enabled: true, tone: 'warn',
    });
  }
  if (input.vignette) {
    actions.push({
      id: 'vignette', kind: 'vignette', x: 0, y: actionY, r: 34, draw: 27,
      label: 'Decide', sub: 'pending', enabled: true, tone: 'core',
    });
  }
  if (recovered(state) >= 820) {
    actions.push({
      id: 'retrain', kind: 'retrain', x: 0, y: actionY, r: 34, draw: 27,
      label: 'Retrain', sub: `gen ${state.reflection + 2}`, enabled: true, tone: 'bad',
    });
  }
  spread(actions, w, actionY);
  actions.forEach(push);

  // ---- machines along the bottom, one node each
  const machY = MACHINE_Y(h);
  const machines: SceneItem[] = M1_ROSTER.map((id) => {
    const g = GENERATORS[id];
    const cost = agentCost(state, id);
    const ok = gte(verified(state), cost);
    return {
      id: `m-${id}`, kind: 'machine' as const, x: 0, y: machY, r: 32, draw: 24,
      label: g.label, sub: `${format(cost)} verified`, value: `×${state.generators[id]}`,
      enabled: ok, tone: ok ? 'good' : 'muted', payload: id,
    };
  });
  spread(machines, w, machY);
  machines.forEach(push);

  // The supervision dial: how many of your agents anybody is actually watching.
  // Everything above the line runs unwatched, fast and dirty.
  if (state.generators.extractor > 0) {
    const loose = unsupervised(state);
    const dialY = machY - 62;
    push({
      id: 'sup-down', kind: 'setSupervision', x: w / 2 - 78, y: dialY, r: 28, draw: 20,
      label: '−', enabled: state.supervised > 0, tone: state.supervised > 0 ? 'idle' : 'muted',
      payload: state.supervised - 1,
    });
    push({
      id: 'sup-up', kind: 'setSupervision', x: w / 2 + 78, y: dialY, r: 28, draw: 20,
      label: '+', enabled: attentionFree(state) >= 1 && loose > 0,
      tone: attentionFree(state) >= 1 && loose > 0 ? 'good' : 'muted',
      payload: state.supervised + 1,
    });
    push({
      id: 'sup-read', kind: 'stat', x: w / 2, y: dialY - 4, r: 0, draw: 0,
      label: `${state.supervised} / ${state.generators.extractor}`,
      sub: loose > 0 ? `${loose} unwatched` : 'all watched',
      enabled: false, tone: loose > 0 ? 'bad' : 'good',
    });
  }

  // ---- save controls, bottom edge
  push({
    id: 'save', kind: 'save', x: w - 30, y: h - 22, r: 24, draw: 13,
    label: '⋯', enabled: true, tone: 'muted',
  });

  return items;
}

/** Evenly space a row of items across the width, inset from the edges. */
function spread(row: SceneItem[], w: number, y: number): void {
  const n = row.length;
  if (n === 0) return;
  const inset = Math.min(56, w / (n + 1));
  const span = w - inset * 2;
  row.forEach((it, i) => {
    it.x = n === 1 ? w / 2 : inset + (span * i) / (n - 1);
    it.y = y;
  });
}

// ------------------------------------------------------------ sheet layouts --

function layoutReviewSheet(input: BoardInput): SceneItem[] {
  const { state, w, h, verdicts } = input;
  const items: SceneItem[] = [];
  const top = h * 0.16;
  const rowH = Math.min(132, (h * 0.56) / Math.max(1, state.review.length));
  state.review.forEach((item: ReviewItem, i: number) => {
    const c = input.conceptFor(item.conceptIndex);
    const g = input.conceptFor(item.glossIndex);
    const y = top + i * rowH;
    const keep = verdicts[i] ?? true;
    items.push({
      id: `rv-keep-${i}`, kind: 'reviewVerdict', x: w - 108, y: y + rowH / 2, r: 30, draw: 22,
      label: 'keep', enabled: true, tone: keep ? 'good' : 'muted', payload: { i, keep: true },
    });
    items.push({
      id: `rv-drop-${i}`, kind: 'reviewVerdict', x: w - 44, y: y + rowH / 2, r: 30, draw: 22,
      label: 'cut', enabled: true, tone: !keep ? 'bad' : 'muted', payload: { i, keep: false },
    });
    items.push({
      id: `rv-row-${i}`, kind: 'stat', x: 18, y, r: 0, draw: rowH,
      label: c?.label ?? '…', sub: g?.gloss ?? '', value: c?.category ?? '',
      enabled: false, tone: keep ? 'idle' : 'muted', payload: i,
    });
  });
  const ok = attentionFree(state) >= 1;
  items.push({
    id: 'commit', kind: 'commit', x: w / 2, y: h - 96, r: 40, draw: 34,
    label: 'Commit', sub: '1 slot · 25s', enabled: ok,
    tone: ok ? 'good' : 'muted',
  });
  items.push({
    id: 'close', kind: 'sheetClose', x: w / 2, y: h - 34, r: 30, draw: 18,
    label: 'back', enabled: true, tone: 'muted',
  });
  return items;
}

function layoutVignetteSheet(input: BoardInput): SceneItem[] {
  const { w, h, vignette } = input;
  const items: SceneItem[] = [];
  if (!vignette) return items;
  const top = h * 0.42;
  vignette.choices.forEach((c, i) => {
    items.push({
      id: `ch-${c.id}`, kind: 'choice', x: w / 2, y: top + i * 78, r: 36, draw: 30,
      label: c.label || '⟨choice — owner⟩',
      sub: describeEffects(c.effects),
      enabled: true, tone: 'core', payload: c.id,
    });
  });
  return items;
}

function layoutSaveSheet(input: BoardInput): SceneItem[] {
  const { w, h } = input;
  const labels: Array<[string, string]> = [
    ['export', 'Export save'], ['import', 'Import save'], ['flush', 'Flush project'],
  ];
  const items: SceneItem[] = labels.map(([id, label], i) => ({
    id: `sv-${id}`, kind: 'save', x: w / 2, y: h * 0.4 + i * 78, r: 36, draw: 30,
    label, enabled: true, tone: id === 'flush' ? 'bad' : 'idle', payload: id,
  }));
  items.push({
    id: 'close', kind: 'sheetClose', x: w / 2, y: h - 60, r: 30, draw: 20,
    label: 'back', enabled: true, tone: 'muted',
  });
  return items;
}

/** Topmost item under a point, or null. Reverse order so later-drawn wins. */
export function hit(items: SceneItem[], x: number, y: number): SceneItem | null {
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]!;
    if (it.r <= 0) continue;
    if (Math.hypot(it.x - x, it.y - y) <= it.r) return it;
  }
  return null;
}
