// THE CAMP BUILDER. The whole engine.
//
// ★★ THE PIVOT, 2026-08-07 (night), the owner's words: *"i feel like we were
// closer when we were doing like the pure graph shit… maybe we do a base
// building game here instead? like we'd have like a place for a quarry and a
// place for a sawmill and a place where lumberjacks would do stuff, and a
// little village and so on, but it will all somehow be a graph? connections
// between these would be very prominent… and we will drop all prose entirely
// until we have a good idea of a gameplay. so it'd be incremental wilderness
// camp builder!"*
//
// So: a fixed wilderness of SITES. Each site takes one kind of works. Nothing
// a site makes counts until a PATH chain reaches the camp — the connections
// ARE the game, exactly as asked. Resources flow on the clock (the idle
// element); building and connecting are the decisions. NO PROSE: every label
// is a noun and a number.
//
// Pure: `apply(state, action) => state`. No DOM, no clock, no RNG. Time
// arrives as a `tick` carrying seconds. The old game's engine survives on
// disk untouched (src/game/) with its 679 tests; nothing here imports it.

/** What can stand on a site. The village is the sink and the heart. */
export type Kind = 'village' | 'quarry' | 'lumber' | 'sawmill';

export interface Site {
  id: number;
  /** A noun. Never a sentence — prose is dropped by decree. */
  name: string;
  x: number;
  y: number;
  /** What can be raised here, or null for the village's own ground. */
  allows: Exclude<Kind, 'village'> | null;
  /** Which sites a path can join this one to. */
  near: number[];
  /** The camp level at which this site appears at all. */
  level: number;
}

/** ★ THE WILDERNESS. Hand-placed, like the old map's stops — the board draws
 *  exactly these coordinates, no solver. Level-2 sites are the first carrot. */
export const SITES: readonly Site[] = [
  { id: 0, name: 'The Camp', x: 200, y: 205, allows: null, near: [1, 2, 3], level: 1 },
  { id: 1, name: 'Rock Face', x: 118, y: 122, allows: 'quarry', near: [0, 2], level: 1 },
  { id: 2, name: 'Tall Pines', x: 296, y: 118, allows: 'lumber', near: [0, 1, 3], level: 1 },
  { id: 3, name: 'River Bend', x: 292, y: 296, allows: 'sawmill', near: [0, 2, 5], level: 1 },
  { id: 4, name: 'Old Growth', x: 104, y: 292, allows: 'lumber', near: [0, 1], level: 2 },
  { id: 5, name: 'Scree Slope', x: 388, y: 232, allows: 'quarry', near: [3], level: 2 },
];
export const SITE = new Map(SITES.map((s) => [s.id, s]));

export const pathKey = (a: number, b: number): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

export interface Camp {
  version: number;
  /** siteId → what stands there. The camp itself is pre-built at site 0. */
  built: Record<number, Kind>;
  /** ★ THE CONNECTIONS — `"a|b"` → 1. Prominent by decree: nothing counts
   *  until a chain of these reaches the camp. */
  paths: Record<string, number>;
  stone: number;
  logs: number;
  planks: number;
  /** Planks the camp has consumed, lifetime — the level curve reads this. */
  progress: number;
}

export const CAMP_VERSION = 1;

export const initial = (): Camp => ({
  version: CAMP_VERSION,
  built: { 0: 'village' },
  paths: {},
  stone: 0,
  logs: 0,
  planks: 0,
  progress: 0,
});

/** One tap chips this much stone by hand — the bootstrap and the thumb. */
export const TAP_STONE = 0.25;

/** What things make or move, per second. */
export const RATE = {
  quarry: 0.3,    // stone out
  lumber: 0.4,    // logs out
  sawmill: 0.5,   // logs in → planks out, at most this
  village: 0.4,   // planks eaten into progress, at most this
} as const;

/** What things cost, in stone. One currency for the slice. */
export const COST: Record<'path' | Exclude<Kind, 'village'>, number> = {
  path: 3,
  quarry: 5,
  lumber: 10,
  sawmill: 18,
};

/** Planks consumed → camp level. Level 1 is free; each entry is a gate. */
export const LEVEL_AT: readonly number[] = [15, 45];

export const levelOf = (progress: number): number =>
  1 + LEVEL_AT.filter((t) => progress >= t).length;

export const level = (g: Camp): number => levelOf(g.progress);

/** Every site the current camp level lets you see. */
export const shown = (g: Camp): Site[] =>
  SITES.filter((s) => s.level <= level(g));

/** ★ THE COMPONENT: every site a path chain joins to the camp. Production
 *  outside it runs dead — the rule that makes connections the game. */
export function component(g: Camp): Set<number> {
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

/** What flows, right now: stone and planks INTO the camp, logs piling at the
 *  mills. Solved whole so the header, the board and the tick can never
 *  disagree. `eat` is what the camp is consuming toward its next level. */
export function rates(g: Camp): {
  stone: number; logs: number; planks: number; eat: number; comp: Set<number>;
} {
  const comp = component(g);
  let stone = 0;
  let logsMade = 0;
  let mill = 0;
  for (const id of comp) {
    const k = g.built[id];
    if (k === 'quarry') stone += RATE.quarry;
    else if (k === 'lumber') logsMade += RATE.lumber;
    else if (k === 'sawmill') mill += RATE.sawmill;
  }
  // The mills saw what the cutters bring plus what is already piled.
  const planks = Math.min(mill, logsMade + (g.logs > 0 ? mill : 0));
  const eat = g.planks > 0 || planks > 0 ? RATE.village : 0;
  return { stone, logs: logsMade - planks, planks, eat, comp };
}

/** Why a path a—b cannot be laid, in plain words, or null. */
export function unlayable(g: Camp, a: number, b: number): string | null {
  const A = SITE.get(a);
  const B = SITE.get(b);
  if (!A || !B || !A.near.includes(b)) return 'nothing joins these';
  if (A.level > level(g) || B.level > level(g)) return `camp level ${Math.max(A.level, B.level)}`;
  if (g.paths[pathKey(a, b)]) return 'already laid';
  const comp = component(g);
  if (!comp.has(a) && !comp.has(b)) return 'no path reaches either end';
  if (g.stone < COST.path) return `${COST.path} stone — you have ${Math.floor(g.stone)}`;
  return null;
}

/** Why works cannot be raised on this site, in plain words, or null. */
export function unraisable(g: Camp, id: number): string | null {
  const s = SITE.get(id);
  if (!s) return 'no such ground';
  if (s.level > level(g)) return `camp level ${s.level}`;
  if (!s.allows) return 'the camp stands here';
  if (g.built[id]) return 'already standing';
  if (g.stone < COST[s.allows]) {
    return `${COST[s.allows]} stone — you have ${Math.floor(g.stone)}`;
  }
  return null;
}

export type Action =
  | { type: 'tick'; secs: number }
  /** Chip stone by hand — the thumb's own quarry, and the bootstrap. */
  | { type: 'tap' }
  /** Lay the path between two neighbouring sites. */
  | { type: 'lay'; a: number; b: number }
  /** Raise this site's works — the site itself says what goes there. */
  | { type: 'raise'; id: number };

export function apply(g: Camp, a: Action): Camp {
  switch (a.type) {
    case 'tick': {
      if (!(a.secs > 0)) return g;
      // Integrated over the whole tick, so a 12-hour away-tick cannot saw
      // planks out of a log pile that ran dry in its first minute.
      const s = a.secs;
      const comp = component(g);
      let stoneRate = 0;
      let logsRate = 0;
      let mill = 0;
      for (const id of comp) {
        const k = g.built[id];
        if (k === 'quarry') stoneRate += RATE.quarry;
        else if (k === 'lumber') logsRate += RATE.lumber;
        else if (k === 'sawmill') mill += RATE.sawmill;
      }
      const cut = g.logs + logsRate * s;              // logs on hand this tick
      const sawn = Math.min(mill * s, cut);           // what the mills manage
      const planks = g.planks + sawn;
      const eaten = Math.min(planks, RATE.village * s);
      return {
        ...g,
        stone: g.stone + stoneRate * s,
        logs: cut - sawn,
        planks: planks - eaten,
        progress: g.progress + eaten,
      };
    }

    case 'tap':
      return { ...g, stone: g.stone + TAP_STONE };

    case 'lay': {
      if (unlayable(g, a.a, a.b)) return g;
      return {
        ...g,
        stone: g.stone - COST.path,
        paths: { ...g.paths, [pathKey(a.a, a.b)]: 1 },
      };
    }

    case 'raise': {
      if (unraisable(g, a.id)) return g;
      const kind = SITE.get(a.id)!.allows!;
      return {
        ...g,
        stone: g.stone - COST[kind],
        built: { ...g.built, [a.id]: kind },
      };
    }
  }
}
