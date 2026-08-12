// WHAT THE VALLEY LOOKS LIKE. Scenery for the city builder's one map —
// the owner, on the first playtest of the pivot: *"i think our beautiful
// map background must come back."*
//
// The parts shelf in action: the glyphs (trees, crags, moor grass, rushes)
// are the OLD map's own, imported from terrain.ts — only the ground they
// scatter on is new. Everything is baked once and blitted, same as before,
// because five hundred marks a frame stutter on a phone.
//
// Nothing here knows the canvas or the game. It is geometry, seeded, so a
// screenshot of a bug is a screenshot anyone can reproduce.
import { markShapes, type Mark } from '../game/terrain';
import type { Shape, Pt } from '../game/shapes';
import type { Box } from '../game/layout';
import { SITES } from './engine';

/** The same seeded generator every static scatter in this repo uses. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = 60;
const xs = SITES.map((s) => s.x);
const ys = SITES.map((s) => s.y);
export const VALLEY: Box = {
  x: Math.min(...xs) - pad,
  y: Math.min(...ys) - pad,
  w: Math.max(...xs) - Math.min(...xs) + pad * 2,
  h: Math.max(...ys) - Math.min(...ys) + pad * 2,
};

/** Each site's ground, for the scatter around it — what you see at the
 *  pines is trees, exactly as the works you can raise there says. */
const CLUSTERS: Array<{ at: number; g: Mark['g']; n: number; r: number }> = [
  { at: 1, g: 'crag', n: 13, r: 30 },   // Rock Face
  { at: 2, g: 'wood', n: 20, r: 36 },   // Tall Pines
  { at: 3, g: 'bog', n: 8, r: 26 },     // River Bend's reeds
  { at: 4, g: 'moor', n: 15, r: 32 },   // High Meadow
  { at: 5, g: 'crag', n: 11, r: 28 },   // Scree Slope
  { at: 6, g: 'wood', n: 8, r: 30 },    // Goblin Knoll's dark trees…
  { at: 6, g: 'crag', n: 7, r: 26 },    // …over broken ground
  { at: 7, g: 'wood', n: 16, r: 34 },   // Dark Pines, thick
  { at: 8, g: 'crag', n: 12, r: 30 },   // High Quarry
  { at: 9, g: 'moor', n: 14, r: 34 },   // Green Vale
];

/** ★ THE RIVER, through River Bend — the site was named for it before it
 *  was drawn. A wide soft bed under a brighter thread, as ever. */
const RIVER: Pt[] = [
  { x: 236, y: VALLEY.y + VALLEY.h + 6 },
  { x: 262, y: 372 },
  { x: 292, y: 296 },
  { x: 334, y: 228 },
  { x: 402, y: 164 },
  { x: VALLEY.x + VALLEY.w + 6, y: 118 },
];

/** Is this point in the low ground the river runs through? */
function nearRiver(x: number, y: number): boolean {
  return RIVER.some((p) => Math.hypot(p.x - x, p.y - y) < 46);
}

function marks(): Mark[] {
  const rand = seeded(0xc17b);
  const out: Mark[] = [];
  const site = (id: number): Pt => {
    const s = SITES.find((x) => x.id === id)!;
    return { x: s.x, y: s.y };
  };
  const clearOf = (x: number, y: number): boolean =>
    SITES.every((s) => Math.hypot(s.x - x, s.y - y) > 16);
  for (const c of CLUSTERS) {
    const p = site(c.at);
    for (let i = 0; i < c.n; i++) {
      const ang = rand() * Math.PI * 2;
      const d = 14 + rand() * c.r;
      const x = p.x + Math.cos(ang) * d;
      const y = p.y + Math.sin(ang) * d * 0.85;
      if (!clearOf(x, y)) continue;
      out.push({ x, y, g: c.g, r: 2.6 + rand() * 2.2, a: rand() * Math.PI });
    }
  }
  // ★★★ THE LAND BETWEEN, 2026-08-11 — queue item 4. The owner, having played
  // the valley through: *"the map is bland because we have icons only near
  // the locations. And I feel like we should have distinct icons near the
  // locations while having normal icons to display the land around."*
  //
  // Two tiers, and the distinction is the point. The CLUSTERS above are a
  // place's own character — pines at Tall Pines, crags at the Rock Face —
  // and they stay tight around their site so they read as belonging to it.
  // This is the rest of the country: four kinds of ordinary ground scattered
  // wide, so the valley looks like somewhere rather than like a diagram with
  // six decorated dots on it.
  //
  // ⚠️ IT IS BAKED (`CAMP_SHAPES` blits it), so the count is close to free at
  // render time — the cost is one bitmap, not 190 shapes a frame. And it
  // still yields to the graph: `clearOf` keeps 16 units around every site so
  // no label ever fights a tuft for its pixels, and the camp's clearing stays
  // clear because that is where the deed list points.
  const GROUND = [
    { g: 'moor' as const, n: 96, r: 1.8, jitter: 1.6 },
    { g: 'crag' as const, n: 34, r: 1.6, jitter: 1.2 },
    { g: 'wood' as const, n: 30, r: 2.2, jitter: 1.5 },
    { g: 'bog' as const, n: 22, r: 2.0, jitter: 1.2 },
  ];
  for (const kind of GROUND) {
    for (let i = 0; i < kind.n; i++) {
      const x = VALLEY.x + 10 + rand() * (VALLEY.w - 20);
      const y = VALLEY.y + 10 + rand() * (VALLEY.h - 20);
      if (!clearOf(x, y)) continue;
      if (Math.hypot(x - 200, y - 205) < 44) continue;   // the clearing
      // Bog belongs to the low ground by the river; anywhere else it reads
      // as a mistake rather than as marsh.
      if (kind.g === 'bog' && !nearRiver(x, y)) continue;
      out.push({ x, y, g: kind.g,
        r: kind.r + rand() * kind.jitter, a: rand() * Math.PI });
    }
  }
  return out;
}

/** Two soft height rings — the knoll is a knoll and the rock face stands
 *  above the camp. Hand-laid; a whole relief grid would be theatre. */
const RINGS: Shape[] = [
  { s: 'path', ink: 'relief', w: 1, curve: true, close: true, alpha: 0.9, pts: [
    { x: 8, y: 356 }, { x: 66, y: 330 }, { x: 106, y: 372 },
    { x: 70, y: 420 }, { x: 14, y: 404 } ] },
  { s: 'path', ink: 'relief', w: 1, curve: true, close: true, alpha: 0.9, pts: [
    { x: 76, y: 92 }, { x: 148, y: 76 }, { x: 172, y: 128 },
    { x: 118, y: 168 }, { x: 66, y: 140 } ] },
];

export const CAMP_SHAPES: Shape[] = [
  { s: 'baked', key: 'valley', box: VALLEY, alpha: 0.85, shapes: [
    ...RINGS,
    ...marks().flatMap(markShapes),
  ] },
  // The river is cheap and important, so it stays live and crisp.
  { s: 'path', pts: RIVER, ink: 'river', w: 7, curve: true, alpha: 0.5 },
  { s: 'path', pts: RIVER, ink: 'river', w: 2.5, curve: true },
];
