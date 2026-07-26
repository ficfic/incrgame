// Radial taxonomy layout + level-of-detail. Pure functions, no DOM, no state —
// so the thing that decides where 4,096 concepts go is unit-testable, which the
// old index-spiral never was.
//
// WHY THIS REPLACED THE SPIRAL
//
// Nodes used to sit at `radius = √(i/n)`, `angle = i × goldenAngle` — position
// by DISCOVERY ORDER, which is to say position meant nothing. Two concepts
// side by side were unrelated; zooming in magnified a random scatter. At 21
// concepts the labels already collided ("psychological feature" over "change");
// at the 240 cap it is unreadable, and the dataset holds 4,096.
//
// Now position carries the taxonomy, which the dataset already ships as a tree
// (`p` = parent index, rooted at `entity`, every parent at a lower index):
//
//   · RADIUS is depth. `entity` at the centre, its children on ring 1, out to
//     ring 5 (the deepest WordNet goes in this slice). A node's ring tells you
//     how specific it is, and a node NEVER changes ring.
//   · ANGLE is inherited. Every concept owns a SECTOR of its parent's sector,
//     so a subtree is a wedge — a region you can zoom into and find only
//     related things.
//   · WEIGHT is the width of that sector: the share of the world a concept
//     covers. `entity` owns the full circle; a leaf owns a sliver. That is
//     taxonomic generality, measured, and it drives both dot size and — via
//     `levelOfDetail` below — whether a node is drawn at all.
//
// Sectors are divided among DISCOVERED children, so a new sibling re-divides
// its parent's wedge and nothing outside that wedge moves. That is a real
// improvement on the spiral, where every discovery moved all 240 nodes.
const TAU = Math.PI * 2;

/** Deepest ring. WordNet's noun hierarchy in this 4,096-concept slice bottoms
 *  out at 5 (measured: 1/3/44/400/2256/1392 concepts at depths 0–5). Fixed, not
 *  derived from what is currently on the board, so a node's radius is decided
 *  once and never shifts under it when a deeper concept is found. */
export const MAX_DEPTH = 5;

export interface Placed {
  id: number;
  /** World coordinates. The disc has radius 1 at `MAX_DEPTH`. */
  x: number; y: number;
  /** Rings from the root. Radius is `depth / MAX_DEPTH`. */
  depth: number;
  /** Share of the full circle this concept's subtree owns, 0..1. The root is 1.
   *  This IS the node's weight: bigger = more general. */
  weight: number;
  /** Nearest ancestor that is also on the board; -1 for the root. */
  parent: number;
}

/** How many hops to look upward for an ancestor that is on the board. The
 *  taxonomy is only 5 deep, so 8 is already generous; the bound exists because
 *  `parentOf` reads lazily-loaded data and a cycle in bad data must not hang
 *  the render loop. */
const MAX_HOPS = 8;

/**
 * Place every anchor on the board.
 *
 * `parentOf` returns a concept's parent index, or -1 for the root and -1 when
 * the answer is not loaded yet — the caller passes a lookup over lazily-fetched
 * chunks, so this must tolerate "don't know" and simply attach to the root
 * until the data lands.
 */
export function layout(
  anchors: readonly number[],
  parentOf: (id: number) => number,
): Map<number, Placed> {
  const out = new Map<number, Placed>();
  if (anchors.length === 0) return out;

  const onBoard = new Set(anchors);
  const root = anchors.includes(0) ? 0 : Math.min(...anchors);

  // ── 1. true taxonomic depth, and the nearest ancestor ALSO on the board ────
  // Depth is the real distance to the root of the dataset, not the distance
  // within the discovered subset: a concept's ring should say how specific it
  // is, not how much of its ancestry you happen to own.
  const depth = new Map<number, number>();
  const boardParent = new Map<number, number>();
  for (const id of anchors) {
    if (id === root) { depth.set(id, 0); boardParent.set(id, -1); continue; }
    let d = 0;
    let anchorAncestor = root;
    let seenAncestor = false;
    let cursor = id;
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const p = parentOf(cursor);
      if (p < 0) break; // the root, or not loaded — either way stop climbing
      d++;
      if (!seenAncestor && onBoard.has(p)) { anchorAncestor = p; seenAncestor = true; }
      if (p === root) break;
      cursor = p;
    }
    depth.set(id, Math.max(1, Math.min(MAX_DEPTH, d)));
    boardParent.set(id, anchorAncestor);
  }

  // ── 2. children, in a stable order ────────────────────────────────────────
  // Sorted by id, which is recovery order, so the same board always produces
  // the same picture — a layout that reshuffled on reload would be its own bug.
  const kids = new Map<number, number[]>();
  for (const id of anchors) {
    const p = boardParent.get(id);
    if (p === undefined || p < 0 || p === id) continue;
    const list = kids.get(p);
    if (list) list.push(id); else kids.set(p, [id]);
  }
  for (const list of kids.values()) list.sort((a, b) => a - b);

  // ── 3. hand out sectors, walking down from the root ───────────────────────
  //
  // Siblings split their parent's wedge EQUALLY. The obvious alternative —
  // proportional to subtree size, so bushy branches get more room — was written
  // first and a test caught what it costs: adding one leaf anywhere changes its
  // parent's size, which changes its grandparent's share, which re-divides the
  // entire circle. Every discovery would move all 240 nodes, which is precisely
  // the complaint the spiral was replaced to fix.
  //
  // With equal shares, discovering a child of P re-divides P's wedge and
  // touches nothing outside it. Movement stays local to the branch that
  // actually changed, which is the strongest stability a growing tree allows.
  const place = (id: number, a0: number, a1: number, guard: number): void => {
    const d = depth.get(id) ?? 0;
    const mid = (a0 + a1) / 2;
    const r = d / MAX_DEPTH;
    out.set(id, {
      id,
      x: d === 0 ? 0 : Math.cos(mid) * r,
      y: d === 0 ? 0 : Math.sin(mid) * r,
      depth: d,
      weight: (a1 - a0) / TAU,
      parent: boardParent.get(id) ?? -1,
    });
    if (guard <= 0) return;
    const list = kids.get(id) ?? [];
    if (list.length === 0) return;
    const share = (a1 - a0) / list.length;
    list.forEach((k, i) => place(k, a0 + i * share, a0 + (i + 1) * share, guard - 1));
  };
  // The root owns the whole circle. Starting at −π/2 puts the first branch at
  // twelve o'clock, which is where a reader looks first.
  place(root, -Math.PI / 2, -Math.PI / 2 + TAU, anchors.length + 1);

  // Anything the walk never reached (data not loaded, or a parent cycle) still
  // has to be drawn — silently dropping a concept the player owns would be the
  // board lying about their progress. Park it on its ring at a stable angle.
  let orphan = 0;
  for (const id of anchors) {
    if (out.has(id)) continue;
    const d = depth.get(id) ?? MAX_DEPTH;
    const a = -Math.PI / 2 + (orphan++ / Math.max(1, anchors.length)) * TAU;
    const r = d / MAX_DEPTH;
    out.set(id, {
      id, x: Math.cos(a) * r, y: Math.sin(a) * r, depth: d,
      weight: 1 / Math.max(1, anchors.length), parent: -1,
    });
  }
  return out;
}

export interface Lod {
  /** Nodes to draw, in the order given. */
  shown: Placed[];
  /** For each shown node, how many of its descendants are folded into it. */
  rolled: Map<number, number>;
  /** Nodes whose label is legible at this scale — a strict subset of `shown`. */
  labelled: Set<number>;
}

/** Rim pixels a node's sector owns at `scale`. This is the honest measure of
 *  "is there room to draw this": a concept with a 2°-wide wedge has nowhere to
 *  put a dot, let alone the word "psychological feature". */
const footprint = (n: Placed, scale: number): number => n.weight * TAU * scale;

/** A dot needs this much rim to itself before it is worth drawing. */
const DOT_ARC = 15;

/** Fallback label width when the caller cannot measure one. */
const LABEL_ARC = 76;

/**
 * Decide what survives at the current zoom.
 *
 * Everything too light to draw is rolled up into its nearest visible ancestor
 * and counted there, because a superclass standing in for its members is what a
 * superclass IS — and because a board that silently dropped concepts would
 * under-report the player's own progress.
 *
 * `labelPx` is asked how wide a concept's name would be. That is the point: the
 * first version compared every label against ONE constant, so "set" and
 * "psychological feature" needed identical room — and since the constant had to
 * suit the average, the long ones overlapped their neighbours at the default
 * zoom. A label is drawn when its OWN width fits the rim its concept owns.
 */
export function levelOfDetail(
  placed: Map<number, Placed>, scale: number, labelPx?: (id: number) => number,
): Lod {
  const shown: Placed[] = [];
  const visible = new Set<number>();
  const rolled = new Map<number, number>();
  const labelled = new Set<number>();

  // Shallowest first, so a node's ancestors are already decided when we reach
  // it — that is what makes "nearest VISIBLE ancestor" answerable in one pass.
  const byDepth = [...placed.values()].sort((a, b) => a.depth - b.depth || a.id - b.id);
  for (const n of placed.values()) rolled.set(n.id, 0);

  for (const n of byDepth) {
    const room = footprint(n, scale);
    // The root is always drawn: it is the one fixed point of the whole board,
    // and a view with nothing in it is not a view.
    if (n.depth === 0 || (room >= DOT_ARC && visible.has(n.parent))) {
      visible.add(n.id);
      shown.push(n);
      // +10px so neighbouring labels have a gap between them rather than a seam
      const needs = (labelPx?.(n.id) ?? LABEL_ARC) + 10;
      if (n.depth === 0 || room >= needs) labelled.add(n.id);
      continue;
    }
    // rolled up: charge it to the nearest ancestor that IS visible
    let host = n.parent;
    for (let hop = 0; hop < MAX_HOPS && host >= 0 && !visible.has(host); hop++) {
      host = placed.get(host)?.parent ?? -1;
    }
    if (host < 0 || !visible.has(host)) host = byDepth[0]?.id ?? -1;
    if (host >= 0) rolled.set(host, (rolled.get(host) ?? 0) + 1);
  }
  return { shown, rolled, labelled };
}

/** Dot radius in SCREEN px for a node's weight. Sizes stay in screen space —
 *  a legible dot is a screen-space fact — but a heavier concept draws bigger,
 *  so generality reads at a glance. */
export function dotRadius(n: Placed): number {
  if (n.depth === 0) return 7;
  // weight spans ~1 (a top-level branch) down to ~1/4096. A log scale keeps the
  // difference readable across that whole range instead of collapsing it.
  const t = Math.max(0, Math.min(1, (Math.log10(n.weight) + 3.2) / 3.2));
  return 2.2 + t * 3.6;
}
