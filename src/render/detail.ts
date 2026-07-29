// Weight and level-of-detail. Pure functions, no DOM, no physics.
//
// `sim.ts` decides WHERE a concept is. This decides WHETHER you can see it and
// whether it gets to say its name. The two are deliberately separate: the
// layout is free-floating now, so nothing about a node's position tells you how
// important it is — that has to come from the data.
//
// WEIGHT is taxonomic generality, straight from the dataset's parent tree.
// `entity` is the heaviest thing in the world; a leaf is the lightest. Zooming
// out shows you the top of the taxonomy, zooming in fills in specifics, and
// what you are looking at is a real property of WordNet rather than an artefact
// of when you happened to discover something.
//
// LABELS are placed by greedy screen-space decluttering — heaviest first, and a
// label is drawn only if its box misses every label already placed. This is how
// map renderers do it, and it is here because three previous attempts to decide
// labels by a formula (one constant for every word; then each word's own width;
// then arc length at the node's ring) all shipped overlapping text. A rule that
// compares boxes cannot overlap boxes.
const MAX_HOPS = 8;

export interface Weighed {
  id: number;
  /** 0..1, higher is more general. `entity` is 1. */
  weight: number;
  /** Rings from the root of the real taxonomy. */
  depth: number;
  /** Nearest ancestor also on the board; -1 for the root. */
  parent: number;
}

/** Generality falls off geometrically with depth. The dataset is only six
 *  levels deep, so a linear falloff (1, ½, ⅓…) would squash the bottom four
 *  rings into almost the same number and make LOD arbitrary down there. */
const FALLOFF = 0.62;

/**
 * Weigh every anchor by where it sits in the real taxonomy.
 *
 * `parentOf` reads lazily-loaded chunk data and returns -1 for "the root" and
 * for "not loaded yet", so this must tolerate not knowing and settle for
 * attaching to the root until the data lands.
 */
export function weigh(
  anchors: readonly number[],
  parentOf: (id: number) => number,
): Map<number, Weighed> {
  const out = new Map<number, Weighed>();
  if (anchors.length === 0) return out;
  const onBoard = new Set(anchors);
  const root = anchors.includes(0) ? 0 : Math.min(...anchors);

  for (const id of anchors) {
    if (id === root) { out.set(id, { id, weight: 1, depth: 0, parent: -1 }); continue; }
    let depth = 0;
    let anchorAncestor = root;
    let found = false;
    let cursor = id;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const p = parentOf(cursor);
      if (p < 0) break;
      depth++;
      if (!found && onBoard.has(p)) { anchorAncestor = p; found = true; }
      if (p === root) break;
      cursor = p;
    }
    depth = Math.max(1, depth);
    out.set(id, { id, weight: FALLOFF ** depth, depth, parent: anchorAncestor });
  }
  return out;
}

export interface Lod {
  /** Ids to draw, heaviest first. */
  shown: number[];
  /** Ids whose label fits without touching another label. */
  labelled: Set<number>;
  /** For each shown id, how many concepts are folded into it. */
  rolled: Map<number, number>;
}

export interface DetailOpts {
  /** The player's zoom. More zoom buys more concepts on screen. */
  zoom: number;
  /** Screen position per id — from the simulation, via the camera. */
  screen: Map<number, { x: number; y: number }>;
  /** Stage size, for dropping anything off-screen. */
  w: number; h: number;
  /** Rendered width of a concept's label, including its rolled-up count. */
  labelWidth: (id: number, folded: number) => number;
  /** THROWAWAY TEST 2026-07-29. Ids that must get a label slot before anything
   *  else competes for it — the places the lane buttons name. Decluttering
   *  places labels heaviest-first, which is why the two destinations you can
   *  actually travel to were the two UNLABELLED dots on screen. */
  priority?: Iterable<number>;
}

/** How many concepts to draw at a given zoom. Deliberately a budget rather than
 *  a threshold: it holds the board to a readable size whether you own twenty
 *  concepts or the full two hundred and forty, and it degrades predictably
 *  instead of dumping everything on screen at once past some cliff. */
const budgetFor = (zoom: number): number => Math.round(26 * Math.max(1, zoom) ** 1.45);

const LABEL_H = 13;
/** Gap between a dot's edge and the top of its label, matching the CSS. */
const LABEL_GAP = 3;

export function detail(weights: Map<number, Weighed>, o: DetailOpts): Lod {
  // Heaviest first, ties by id so the picture is stable frame to frame.
  // Because a parent is always strictly shallower than its child, it is always
  // strictly heavier — so taking the top N can never include a concept while
  // excluding its ancestor, and the roll-up below always finds a host.
  const order = [...weights.values()].sort((a, b) => b.weight - a.weight || a.id - b.id);
  const budget = Math.min(order.length, budgetFor(o.zoom));

  const shown: number[] = [];
  const visible = new Set<number>();
  for (const n of order) {
    if (shown.length >= budget) break;
    shown.push(n.id);
    visible.add(n.id);
  }

  const rolled = new Map<number, number>();
  for (const id of shown) rolled.set(id, 0);
  for (const n of order) {
    if (visible.has(n.id)) continue;
    let host = n.parent;
    for (let hop = 0; hop < MAX_HOPS && host >= 0 && !visible.has(host); hop++) {
      host = weights.get(host)?.parent ?? -1;
    }
    if (host < 0 || !visible.has(host)) host = shown[0] ?? -1;
    if (host >= 0) rolled.set(host, (rolled.get(host) ?? 0) + 1);
  }

  // ── greedy label decluttering ────────────────────────────────────────────
  const labelled = new Set<number>();
  const placed: Array<[number, number, number, number]> = []; // l, t, r, b
  const first = new Set(o.priority ?? []);
  const order2 = [...shown.filter((id) => first.has(id)), ...shown.filter((id) => !first.has(id))];
  for (const id of order2) {
    const p = o.screen.get(id);
    if (!p) continue;
    const width = o.labelWidth(id, rolled.get(id) ?? 0);
    const l = p.x - width / 2, r = p.x + width / 2;
    // The label hangs below the dot's EDGE, not its centre — `top: 100%` in the
    // CSS. Measuring from the centre understated every box by the dot's radius,
    // which is up to 6.5px, and that was enough for two labels to touch while
    // this check believed they had cleared each other.
    const top = p.y + dotRadius(weights.get(id)?.weight ?? 0.2, id === (shown[0] ?? -1)) + LABEL_GAP;
    const t = top, b = top + LABEL_H;
    // off-stage labels are not worth a collision slot; something on screen
    // should be allowed to use that space instead
    if (r < 0 || l > o.w || b < 0 || t > o.h) continue;
    let clear = true;
    for (const [pl, pt, pr, pb] of placed) {
      if (l < pr && r > pl && t < pb && b > pt) { clear = false; break; }
    }
    if (!clear) continue;
    placed.push([l, t, r, b]);
    labelled.add(id);
  }
  return { shown, labelled, rolled };
}

/** Dot radius in SCREEN px. Sizes stay in screen space — a legible dot is a
 *  screen-space fact — but a heavier concept draws bigger, so generality reads
 *  at a glance without needing a label. */
export function dotRadius(weight: number, root: boolean): number {
  if (root) return 6.5;
  return 2.4 + Math.max(0, Math.min(1, weight)) * 4.2;
}
