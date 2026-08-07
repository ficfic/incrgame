// THE CITY ON THE GRAPH. The whole engine.
//
// ★★ THE DESIGN IS docs/CITY.md, 2026-08-08, from the owner's brief: *"not
// civilization game literally… like incremental city builders and stuff."*
// Five rules, all of them here:
//
//   1. BUILDINGS COME IN COUNTS — `Quarry ×3`, the n-th copy costs 1.15^n.
//   2. PEOPLE ARE THE MULTIPLIER — huts raise the cap, the population
//      staffs every works evenly (never babysat), and POP THRESHOLDS are
//      the unlock ladder.
//   3. THE GRAPH IS THE LOGISTICS LAYER — every path has a throughput cap
//      (gauge × 1.0/s of anything). Production past the path is WASTED,
//      and the choke is drawn. Widening is the infrastructure spend.
//   4. THE UNLOCK CASCADE — stone → logs → planks → huts → people → more.
//   5. NO PROSE — nouns and numbers until the loop earns better.
//
// Pure: `apply(state, action) => state`. No DOM, no clock, no RNG. The old
// road game survives untouched in src/game/; nothing here imports it.

/** What can stand on a site, in numbers. Huts live only at the camp. */
export type Kind = 'hut' | 'quarry' | 'lumber' | 'sawmill';

export interface Site {
  id: number;
  /** A noun. Never a sentence. */
  name: string;
  x: number;
  y: number;
  /** What this ground takes. The camp takes huts. */
  allows: Kind;
  /** Which sites a path can join this one to. */
  near: number[];
}

/** ★ THE WILDERNESS. Hand-placed; the board draws exactly these. Beyond
 *  the starter ring the ground is GOBLIN-HELD — the hero's ladder. */
export const SITES: readonly Site[] = [
  { id: 0, name: 'The Camp', x: 200, y: 205, allows: 'hut', near: [1, 2, 3] },
  { id: 1, name: 'Rock Face', x: 118, y: 122, allows: 'quarry', near: [0, 2] },
  { id: 2, name: 'Tall Pines', x: 296, y: 118, allows: 'lumber', near: [0, 1, 3] },
  { id: 3, name: 'River Bend', x: 292, y: 296, allows: 'sawmill', near: [0, 2, 5] },
  { id: 4, name: 'Old Growth', x: 104, y: 292, allows: 'lumber', near: [0, 1, 6] },
  { id: 5, name: 'Scree Slope', x: 388, y: 232, allows: 'quarry', near: [3] },
  { id: 6, name: 'Goblin Knoll', x: 46, y: 380, allows: 'quarry', near: [4] },
];

/** ★★ THE GOBLINS, stolen from Mayor of Noobtown on the owner's order:
 *  held ground shows its strength, takes no works and no paths, and the
 *  town's ONE hero clears it a fight at a time. Farther is stronger, and
 *  stronger BITES harder. */
export const GOBLINS: Record<number, { strength: number; bite: number }> = {
  4: { strength: 12, bite: 2 },
  5: { strength: 18, bite: 3 },
  6: { strength: 30, bite: 4 },
};
export const SITE = new Map(SITES.map((s) => [s.id, s]));

export const pathKey = (a: number, b: number): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

export interface City {
  version: number;
  /** ★ COUNTS, not booleans: siteId → how many stand there. */
  stacks: Record<number, number>;
  /** ★ THE CONNECTIONS — `"a|b"` → gauge 1..MAX_GAUGE. Throughput each. */
  paths: Record<string, number>;
  stone: number;
  logs: number;
  planks: number;
  /** People. Grown, not bought — toward the huts' cap, slowly. */
  pop: number;
  /** Fractional growth toward the next person. Never shown. */
  popPart: number;
  /** ★ Held ground: siteId → goblin strength LEFT. Absent = liberated. */
  goblins: Record<number, number>;
  /** ★ THE HERO — one, the town's own. Arms come from the stores. */
  hero: { hp: number; arms: number; part: number };
  /** ★ A FIGHT IN PROGRESS, or null. Turn-based: every strike is yours. */
  fight: { site: number } | null;
}

export const CITY_VERSION = 3;

export const initial = (): City => ({
  version: CITY_VERSION,
  stacks: {},
  paths: {},
  stone: 0,
  logs: 0,
  planks: 0,
  // ★ Two people came with you. Zero people would be zero rates forever.
  pop: 2,
  popPart: 0,
  goblins: Object.fromEntries(
    Object.entries(GOBLINS).map(([k, v]) => [k, v.strength])),
  hero: { hp: 10, arms: 0, part: 0 },
  fight: null,
});

/** The hero's full health, and the pace of getting it back. */
export const HERO_HP = 10;
export const HEAL_SECS = 15;
/** What one strike lands: bare hands plus the armoury. */
export const heroHit = (g: City): number => 2 + g.hero.arms;
/** Arms price in BOTH currencies, on a steeper curve — the late fights
 *  are meant to want the whole town's economy behind them. */
export const armsCost = (have: number): { stone: number; planks: number } => ({
  stone: Math.ceil(8 * Math.pow(1.25, have)),
  planks: Math.ceil(4 * Math.pow(1.25, have)),
});

/** One tap chips this much stone by hand — the bootstrap and the thumb. */
export const TAP_STONE = 0.25;

/** Base output per copy per second, fully staffed. */
export const RATE = { quarry: 0.3, lumber: 0.4, sawmill: 0.5 } as const;

/** What one path-gauge carries, per second, of everything put together. */
export const CARRY = 1.0;
export const MAX_GAUGE = 3;

/** Each hut houses this many people. */
export const HUT_ROOM = 2;
/** Seconds to grow one person when there is room. */
export const GROW_SECS = 12;

/** First copy's price. Huts price in PLANKS — the sink the mill feeds. */
export const BASE: Record<Kind, number> = { hut: 6, quarry: 5, lumber: 10, sawmill: 18 };
export const PATH_COST = 3;

/** ★ THE CURVE: the n-th copy (0-based count today) costs base × 1.15^n,
 *  rounded up. The genre's compounding, one line long. */
export const costOf = (kind: Kind, have: number): number =>
  Math.ceil(BASE[kind] * Math.pow(1.15, have));

/** Widening: the next gauge costs the path price over again, times gauge. */
export const pathCostOf = (gauge: number): number => PATH_COST * (gauge + 1);

/** The whole wilderness shows from the first frame — held ground drawn
 *  red IS the carrot. Liberation, not population, grows the town's reach. */
export const shown = (_g: City): Site[] => [...SITES];

export const popCap = (g: City): number => 2 + (g.stacks[0] ?? 0) * HUT_ROOM;

/** ★ THE COMPONENT: every site a path chain joins to the camp. */
export function component(g: City): Set<number> {
  const out = new Set<number>([0]);
  const queue = [0];
  for (let i = 0; i < queue.length; i++) {
    for (const n of SITE.get(queue[i]!)?.near ?? []) {
      if (!out.has(n) && g.paths[pathKey(queue[i]!, n)]) {
        out.add(n);
        queue.push(n);
      }
    }
  }
  return out;
}

/** The BFS tree toward the camp: siteId → the neighbour it ships through.
 *  Deterministic (near-lists are ordered), so the same wilderness routes
 *  the same way on every device. */
export function routes(g: City): Map<number, number> {
  const parent = new Map<number, number>();
  const queue = [0];
  const seen = new Set<number>([0]);
  for (let i = 0; i < queue.length; i++) {
    for (const n of SITE.get(queue[i]!)?.near ?? []) {
      if (!seen.has(n) && g.paths[pathKey(queue[i]!, n)]) {
        seen.add(n);
        parent.set(n, queue[i]!);
        queue.push(n);
      }
    }
  }
  return parent;
}

export interface Flow {
  /** Fully-staffed-and-carried rates INTO the stores, per second. */
  stone: number;
  logs: number;
  planks: number;
  /** Per site: what its works make, and what its paths actually carry. */
  made: Map<number, number>;
  carried: Map<number, number>;
  /** Edges over their cap right now — the chokes the board draws. */
  choked: Set<string>;
  /** 0..1 — how staffed every works is. Under 1, people are the shortage. */
  staff: number;
  comp: Set<number>;
}

/** ★ THE WHOLE ECONOMY, SOLVED IN ONE PLACE — header, board, panel and tick
 *  all read this, so no two surfaces can disagree.
 *
 *  ⚠️ SLICE SIMPLIFICATION, on the record: everything ships to the camp
 *  depot along its BFS route; the mills saw from the depot's log pool and
 *  ship planks back along their own route. An edge's load is the sum of
 *  every producer routed over it; past its cap, every producer on it is
 *  scaled down together and the difference is WASTE. Per-commodity routing
 *  is a later slice, priced only when this one proves fun. */
export function flow(g: City): Flow {
  const comp = component(g);
  const parent = routes(g);
  const made = new Map<number, number>();
  let jobs = 0;
  for (const id of comp) {
    const s = SITE.get(id)!;
    const n = g.stacks[id] ?? 0;
    if (id === 0 || n <= 0) continue;
    jobs += n;
    const base = s.allows === 'quarry' ? RATE.quarry
      : s.allows === 'lumber' ? RATE.lumber : RATE.sawmill;
    made.set(id, n * base);
  }
  const staff = jobs > 0 ? Math.min(1, g.pop / jobs) : 1;
  for (const [id, m] of made) made.set(id, m * staff);

  // Load every edge with the producers routed over it, then scale each
  // producer by its worst edge. One pass — a choke wastes, it does not
  // reroute; rerouting is the PLAYER's move, with a wider or a second path.
  const load = new Map<string, number>();
  const walk = (id: number): string[] => {
    const out: string[] = [];
    for (let at = id; at !== 0; at = parent.get(at)!) {
      if (!parent.has(at)) return out;
      out.push(pathKey(at, parent.get(at)!));
    }
    return out;
  };
  for (const [id, m] of made) {
    for (const e of walk(id)) load.set(e, (load.get(e) ?? 0) + m);
  }
  const choked = new Set<string>();
  const carried = new Map<number, number>();
  for (const [id, m] of made) {
    let scale = 1;
    for (const e of walk(id)) {
      const cap = (g.paths[e] ?? 0) * CARRY;
      const l = load.get(e) ?? 0;
      if (l > cap + 1e-9) {
        choked.add(e);
        scale = Math.min(scale, cap / l);
      }
    }
    carried.set(id, m * scale);
  }

  let stone = 0;
  let logsIn = 0;
  let mill = 0;
  for (const [id, c] of carried) {
    const k = SITE.get(id)!.allows;
    if (k === 'quarry') stone += c;
    else if (k === 'lumber') logsIn += c;
    else if (k === 'sawmill') mill += c;
  }
  return { stone, logs: logsIn, planks: mill, made, carried, choked, staff, comp };
}

/** Why the next copy cannot be raised here, in plain words, or null. */
export function unraisable(g: City, id: number): string | null {
  const s = SITE.get(id);
  if (!s) return 'no such ground';
  if (g.goblins[id]) return `goblins hold this ground — ${g.goblins[id]} strong`;
  const have = g.stacks[id] ?? 0;
  const price = costOf(s.allows, have);
  if (s.allows === 'hut') {
    if (g.planks < price) return `${price} planks — you have ${Math.floor(g.planks)}`;
    return null;
  }
  if (g.stone < price) return `${price} stone — you have ${Math.floor(g.stone)}`;
  return null;
}

/** Why this path cannot be laid or widened, in plain words, or null. */
export function unlayable(g: City, a: number, b: number): string | null {
  const A = SITE.get(a);
  const B = SITE.get(b);
  if (!A || !B || !A.near.includes(b)) return 'nothing joins these';
  if (g.goblins[a] || g.goblins[b]) {
    return `goblins hold this ground — ${g.goblins[a] ?? g.goblins[b]} strong`;
  }
  const gauge = g.paths[pathKey(a, b)] ?? 0;
  if (gauge >= MAX_GAUGE) return 'as wide as it goes';
  if (gauge === 0) {
    const comp = component(g);
    if (!comp.has(a) && !comp.has(b)) return 'no path reaches either end';
  }
  const price = pathCostOf(gauge);
  if (g.stone < price) return `${price} stone — you have ${Math.floor(g.stone)}`;
  return null;
}

/** Why the hero cannot be sent at this ground, in plain words, or null. */
export function unassailable(g: City, id: number): string | null {
  if (!g.goblins[id]) return 'nothing to fight here';
  if (g.fight) return 'the hero is already fighting';
  if (g.hero.hp < HERO_HP) return `the hero heals — ${g.hero.hp} of ${HERO_HP}`;
  return null;
}

export type Action =
  | { type: 'tick'; secs: number }
  /** Chip stone by hand — the thumb's own quarry, and the bootstrap. */
  | { type: 'tap' }
  /** Lay the path between neighbours, or widen it a gauge. */
  | { type: 'lay'; a: number; b: number }
  /** Raise the NEXT copy of this site's works (a hut, at the camp). */
  | { type: 'raise'; id: number }
  /** Buy the next tier of the hero's arms, from the stores. */
  | { type: 'arm' }
  /** Send the hero at held ground — the fight opens. */
  | { type: 'assail'; id: number }
  /** One strike. The goblins answer. Turn-based to the bone. */
  | { type: 'strike' }
  /** Break off the fight and walk home to heal. */
  | { type: 'flee' };

export function apply(g: City, a: Action): City {
  switch (a.type) {
    case 'tick': {
      if (!(a.secs > 0)) return g;
      const s = a.secs;
      const f = flow(g);
      // The mills saw what arrives plus what is piled — integrated over the
      // tick, so an away-tick cannot saw planks from a pile that ran dry.
      const cut = g.logs + f.logs * s;
      const sawn = Math.min(f.planks * s, cut);
      // People grow toward the huts' room, one at a time.
      let pop = g.pop;
      let popPart = g.popPart;
      if (pop < popCap(g)) {
        popPart += s / GROW_SECS;
        const grown = Math.floor(popPart);
        pop = Math.min(popCap(g), pop + grown);
        popPart -= grown;
      } else {
        popPart = 0;
      }
      // The hero heals at home — never mid-fight.
      let hero = g.hero;
      if (!g.fight && hero.hp < HERO_HP) {
        const part = hero.part + s / HEAL_SECS;
        const up = Math.floor(part);
        hero = { ...hero, hp: Math.min(HERO_HP, hero.hp + up), part: part - up };
      } else if (hero.part !== 0 && hero.hp >= HERO_HP) {
        hero = { ...hero, part: 0 };
      }
      return {
        ...g,
        stone: g.stone + f.stone * s,
        logs: cut - sawn,
        planks: g.planks + sawn,
        pop,
        popPart,
        hero,
      };
    }

    case 'tap':
      return { ...g, stone: g.stone + TAP_STONE };

    case 'lay': {
      if (unlayable(g, a.a, a.b)) return g;
      const key = pathKey(a.a, a.b);
      const gauge = g.paths[key] ?? 0;
      return {
        ...g,
        stone: g.stone - pathCostOf(gauge),
        paths: { ...g.paths, [key]: gauge + 1 },
      };
    }

    case 'arm': {
      const price = armsCost(g.hero.arms);
      if (g.stone < price.stone || g.planks < price.planks) return g;
      return {
        ...g,
        stone: g.stone - price.stone,
        planks: g.planks - price.planks,
        hero: { ...g.hero, arms: g.hero.arms + 1 },
      };
    }

    case 'assail': {
      if (unassailable(g, a.id)) return g;
      return { ...g, fight: { site: a.id } };
    }

    case 'strike': {
      // ★★ THE WHOLE BATTLE, deterministic: your strike lands, and if any
      // goblins stand they bite back. No dice — whether you can WIN was
      // decided by the town that armed you, which is the design's point.
      if (!g.fight) return g;
      const site = g.fight.site;
      const left = (g.goblins[site] ?? 0) - heroHit(g);
      if (left <= 0) {
        // ★ LIBERATED: the ground joins the town's map, hurt and all.
        const goblins = { ...g.goblins };
        delete goblins[site];
        return { ...g, goblins, fight: null };
      }
      const hp = g.hero.hp - (GOBLINS[site]?.bite ?? 2);
      if (hp <= 0) {
        // Beaten home. The ground keeps what strength it has left —
        // a second try starts where this one bled off.
        return { ...g, goblins: { ...g.goblins, [site]: left },
          hero: { ...g.hero, hp: 0 }, fight: null };
      }
      return { ...g, goblins: { ...g.goblins, [site]: left },
        hero: { ...g.hero, hp } };
    }

    case 'flee':
      return g.fight ? { ...g, fight: null } : g;

    case 'raise': {
      if (unraisable(g, a.id)) return g;
      const s = SITE.get(a.id)!;
      const have = g.stacks[a.id] ?? 0;
      const price = costOf(s.allows, have);
      return {
        ...g,
        stone: s.allows === 'hut' ? g.stone : g.stone - price,
        planks: s.allows === 'hut' ? g.planks - price : g.planks,
        stacks: { ...g.stacks, [a.id]: have + 1 },
      };
    }
  }
}
