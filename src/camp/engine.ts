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
export type Kind = 'hut' | 'quarry' | 'lumber' | 'sawmill' | 'farm';

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
  /** ★ THE MAP GROWS OUTWARD: this ground shows only once the named site
   *  is liberated. The far country is the knoll fight's real prize. */
  behind?: number;
}

/** ★ THE WILDERNESS. Hand-placed; the board draws exactly these. Beyond
 *  the starter ring the ground is GOBLIN-HELD — the hero's ladder. */
export const SITES: readonly Site[] = [
  { id: 0, name: 'The Camp', x: 200, y: 205, allows: 'hut', near: [1, 2, 3] },
  { id: 1, name: 'Rock Face', x: 118, y: 122, allows: 'quarry', near: [0, 2] },
  { id: 2, name: 'Tall Pines', x: 296, y: 118, allows: 'lumber', near: [0, 1, 3] },
  { id: 3, name: 'River Bend', x: 292, y: 296, allows: 'sawmill', near: [0, 2, 5] },
  { id: 4, name: 'High Meadow', x: 104, y: 292, allows: 'farm', near: [0, 1, 6] },
  { id: 5, name: 'Scree Slope', x: 388, y: 232, allows: 'quarry', near: [3] },
  { id: 6, name: 'Goblin Knoll', x: 46, y: 380, allows: 'quarry', near: [4] },
  // ★★ THE SECOND REGION, 2026-08-08 — behind the knoll and the scree,
  // stronger holdings, longer hauls, and the farmland the growing town
  // will need. Hidden until the ground in front of it falls.
  { id: 7, name: 'Dark Pines', x: -34, y: 452, allows: 'lumber', near: [6], behind: 6 },
  { id: 8, name: 'High Quarry', x: 474, y: 306, allows: 'quarry', near: [5], behind: 5 },
  { id: 9, name: 'Green Vale', x: 78, y: 512, allows: 'farm', near: [7], behind: 6 },
];

/** ★★ THE GOBLINS, stolen from Mayor of Noobtown on the owner's order:
 *  held ground shows its strength, takes no works and no paths, and the
 *  town's ONE hero clears it a fight at a time. Farther is stronger, and
 *  stronger BITES harder. */
export const GOBLINS: Record<number, { strength: number; bite: number }> = {
  // ⚠️ RETUNED 2026-08-08 (chad-liquidity): the knoll was a 4-tier arms
  // cliff wearing +67% strength; 24 and 32 make the ladder a clean +2 of
  // arms per fight — 1/2/4/6/8/10, each one-sortie at tier, dead at
  // tier-minus-one, verified strike by strike.
  4: { strength: 12, bite: 2 },
  5: { strength: 18, bite: 3 },
  6: { strength: 24, bite: 4 },
  7: { strength: 32, bite: 5 },
  8: { strength: 48, bite: 5 },
  9: { strength: 60, bite: 6 },
};

/** ★ GOBLINS REGROUP: a bled, unengaged holding regains this much
 *  strength a second, back up to its spawn. Kills the never-arm exploit —
 *  chip, flee, heal free, repeat — everywhere except fight one, which
 *  stays the two-sortie bare-hands tutorial on purpose. */
export const GOBLIN_REGEN = 0.05;
export const SITE = new Map(SITES.map((s) => [s.id, s]));

// ★ NEIGHBOURING IS SYMMETRIC, enforced here so a hand-typed list can
// never make a one-way path — the exact bug the old map fixed the same
// way. (Site 4 listed the camp; the camp did not list site 4 back, and
// the component walk from the camp never saw the meadow.)
for (const s of SITES) {
  for (const n of s.near) {
    const t = SITE.get(n);
    if (t && !t.near.includes(s.id)) t.near.push(s.id);
  }
}

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
  /** ★ FOOD — the wild feeds the first few; every settler past that eats
   *  from the stock, and an empty larder HALTS every works but the farms. */
  food: number;
  /** People. Grown, not bought — toward the huts' cap, slowly. */
  pop: number;
  /** Fractional growth toward the next person. Never shown. */
  popPart: number;
  /** ★ SET BY HAND — siteId → EXACTLY this many hands (0 allowed: a held
   *  works). Absent = auto. The owner's whole-people ruling: people are
   *  integers, a works can be emptied, and auto never touches a site you
   *  set yourself. */
  crew: Record<number, number>;
  /** ★ Held ground: siteId → goblin strength LEFT. Absent = liberated. */
  goblins: Record<number, number>;
  /** ★ THE HERO — one, the town's own. Arms come from the stores. */
  hero: { hp: number; arms: number; part: number };
  /** ★ A FIGHT IN PROGRESS, or null. Turn-based: every strike is yours. */
  fight: { site: number } | null;
}

export const CITY_VERSION = 5;

export const initial = (): City => ({
  version: CITY_VERSION,
  stacks: {},
  paths: {},
  stone: 0,
  logs: 0,
  planks: 0,
  food: 0,
  crew: {},
  // ★ Two people came with you. Zero people would be zero rates forever.
  pop: 2,
  popPart: 0,
  goblins: Object.fromEntries(
    Object.entries(GOBLINS).map(([k, v]) => [k, v.strength])),
  hero: { hp: 10, arms: 0, part: 0 },
  fight: null,
});

/** The hero's base health, and the pace of getting it back. */
export const HERO_HP = 10;
export const HEAL_SECS = 15;
/** ★ EVERY LIBERATION TOUGHENS THE HERO: +3 health per ground freed.
 *  The deep country's bites (5s and 6s) are priced against this — arms
 *  buy the strike, the fights already won buy the surviving. */
export const heroMax = (g: City): number =>
  HERO_HP + 3 * (Object.keys(GOBLINS).length - Object.keys(g.goblins).length);
/** What one strike lands: bare hands plus the armoury. */
export const heroHit = (g: City): number => 2 + g.hero.arms;
/** Arms price in BOTH currencies, on a steeper curve — the late fights
 *  are meant to want the whole town's economy behind them. */
export const armsCost = (have: number): { stone: number; planks: number } => ({
  // 1.30, not 1.25: at the old curve the last sword cost less than the
  // heal it saved. Arms compete with hut planks now — real, not a week.
  stone: Math.ceil(8 * Math.pow(1.3, have)),
  planks: Math.ceil(4 * Math.pow(1.3, have)),
});

/** One tap chips this much stone by hand — the bootstrap and the thumb. */
export const TAP_STONE = 0.25;

/** ★★ MULTI-HAND WORKS, 2026-08-08 (the pacing pass): every copy holds
 *  CREW hands, and output is PER WORKER — people carry growth, buildings
 *  are capacity. Two hands on quarry #1 is exactly the old copy, so
 *  minute zero is untouched; a full crew is twice it. */
export const CREW = 4;

/** Output per WORKER per second. */
export const RATE = { quarry: 0.15, lumber: 0.2, sawmill: 0.25, farm: 0.2 } as const;

/** ★ The wild feeds this many for free — a town of six needs no fields.
 *  The seventh settler eats, and so does every rescued captive. */
export const WILD_FED = 6;
/** What one person past the wild's table eats, per second. ⚠️ 0.05, not
 *  0.1: all southern food crosses one artery, and at 0.1 the map walled
 *  silently at ~36 people (chad's find). Future regions must bring their
 *  own arteries — that is a roadmap note, not a number. */
export const EAT = 0.05;
/** What the town is eating right now, per second. */
export const hunger = (g: City): number => Math.max(0, g.pop - WILD_FED) * EAT;
/** ★ Freed ground frees PEOPLE — Noobtown's actual spine: two captives
 *  walk home from every liberation, hungry and ready to work. */
export const CAPTIVES = 2;

/** What one path-gauge carries, per second, of everything put together. */
export const CARRY = 1.0;
export const MAX_GAUGE = 3;

/** Each hut houses this many people — one hut per crew, ~50 lifetime.
 *  (At 2, hut #99 cost five million planks. Nobody was living there.) */
export const HUT_ROOM = 4;
/** Seconds to grow one person when there is room. */
export const GROW_SECS = 12;

/** ★ First copy's price, IN THE MATERIAL THAT MAKES SENSE — the owner:
 *  *"it's weird that i need stone to build lumberjack camp."* Huts are
 *  planks, a lumber camp is logs (chop the first by hand — the tap
 *  follows the tapped site), the mill is both, fields are stone walls. */
export type Price = { stone?: number; logs?: number; planks?: number };
export const BASE: Record<Kind, Price> = {
  hut: { planks: 10 },
  quarry: { stone: 5 },
  lumber: { logs: 8 },
  sawmill: { stone: 8, logs: 12 },
  farm: { stone: 12 },
};
export const PATH_COST = 3;

/** ★ THE CURVES: a works copy is a four-hand unit bought a handful of
 *  times per site — 1.35^n bites by the third copy. Huts are the one
 *  repeated purchase and the plank sink, so they stay on gentle 1.15. */
export const CURVE: Record<Kind, number> = {
  hut: 1.15, quarry: 1.35, lumber: 1.35, sawmill: 1.35, farm: 1.35,
};
export const costOf = (kind: Kind, have: number): Price => {
  const out: Price = {};
  for (const [k, v] of Object.entries(BASE[kind]) as [keyof Price, number][]) {
    out[k] = Math.ceil(v * Math.pow(CURVE[kind], have));
  }
  return out;
};

/** A price as one honest string: "8 stone · 12 logs". */
export const priceLine = (p: Price): string =>
  (Object.entries(p) as [string, number][]).map(([k, v]) => `${v} ${k}`).join(' · ');

/** What the price finds short, or null when it is covered. */
export const shortOf = (g: City, p: Price): string | null => {
  for (const [k, v] of Object.entries(p) as [keyof Price, number][]) {
    if ((g[k] ?? 0) < v!) return `${v} ${k} — you have ${Math.floor(g[k])}`;
  }
  return null;
};

/** Widening: the next gauge costs the path price over again, times gauge. */
export const pathCostOf = (gauge: number): number => PATH_COST * (gauge + 1);

/** What the map shows: the first valley whole (held ground drawn red IS
 *  the carrot), and the far country only once the ground in front of it
 *  falls — the map grows outward, fight by fight. */
export const shown = (g: City): Site[] =>
  SITES.filter((s) => s.behind === undefined || !(s.behind in g.goblins));

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

/** The BFS tree toward the given ROOTS: siteId → the neighbour it ships
 *  through. Deterministic (near-lists and root order are ordered), so the
 *  same wilderness routes the same way on every device. Multi-root, so
 *  "the nearest mill" is one walk, not a distance table. */
export function routes(g: City, roots: number[] = [0]): Map<number, number> {
  const parent = new Map<number, number>();
  const queue = [...roots];
  const seen = new Set<number>(roots);
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
  food: number;
  /** ★ An empty larder with unmet hunger: every works but the farms
   *  stands down until there is bread again. */
  starving: boolean;
  /** Logs actually ARRIVING at the mills, per second — what they can saw. */
  logsIn: number;
  /** The mills' sawing capacity, staffed. The panel explains a starved
   *  mill with these two numbers side by side. */
  millCap: number;
  /** What the mills are SAWING per second (pile included) — before the
   *  planks meet their own path home. Shipping past it is stage 2's job;
   *  the tick drains the pile by this. */
  sawing: number;
  /** Per site: the hands actually working it (pinned plus auto). */
  hands: Map<number, number>;
  /** Per site: what its works make, and what its paths actually carry. */
  made: Map<number, number>;
  carried: Map<number, number>;
  /** Edges over their cap right now — the chokes the board draws. */
  choked: Set<string>;
  /** ★ What each path is ACTUALLY carrying, per second — the owner: *"the
   *  dots going through the paths should correspond to the resources
   *  flowing there."* The board draws carriers from this, so an idle path
   *  in a busy component shows nobody. */
  loads: Map<string, number>;
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

  // ★★ STAFFING IN WHOLE PEOPLE — the owner's ruling. Hand-set sites take
  // EXACTLY their number first (0 is a held works); everyone left is
  // placed one person at a time: the farms fill first, then the rest
  // round-robin in site order. Integers everywhere, deterministic
  // everywhere, and auto never touches a site you set yourself.
  const worked = [...comp].filter((id) => id !== 0 && (g.stacks[id] ?? 0) > 0)
    .sort((a, b) => a - b);
  const capOf = (id: number): number => (g.stacks[id] ?? 0) * CREW;
  const hands = new Map<number, number>();
  let pool = Math.floor(g.pop);
  const autos: number[] = [];
  for (const id of worked) {
    if (g.crew[id] !== undefined) {
      const w = Math.min(g.crew[id]!, capOf(id), pool);
      hands.set(id, w);
      pool -= w;
    } else {
      hands.set(id, 0);
      autos.push(id);
    }
  }
  for (const id of autos) {                          // the fields eat first
    if (SITE.get(id)!.allows !== 'farm') continue;
    const take = Math.min(capOf(id) - hands.get(id)!, pool);
    hands.set(id, hands.get(id)! + take);
    pool -= take;
  }
  const rest = autos.filter((id) => SITE.get(id)!.allows !== 'farm');
  let placed = true;
  while (pool > 0 && placed) {                       // one person at a time
    placed = false;
    for (const id of rest) {
      if (pool <= 0) break;
      if (hands.get(id)! < capOf(id)) {
        hands.set(id, hands.get(id)! + 1);
        pool -= 1;
        placed = true;
      }
    }
  }
  let otherSlots = 0;
  let otherHands = 0;
  for (const id of rest) {
    otherSlots += capOf(id);
    otherHands += hands.get(id)!;
  }
  const staff = otherSlots > 0 ? otherHands / otherSlots : 1;

  const made = new Map<number, number>();
  let farmRaw = 0;
  for (const id of worked) {
    const st = SITE.get(id)!;
    const base = st.allows === 'quarry' ? RATE.quarry
      : st.allows === 'lumber' ? RATE.lumber
      : st.allows === 'farm' ? RATE.farm : RATE.sawmill;
    made.set(id, hands.get(id)! * base);
    if (st.allows === 'farm') farmRaw += hands.get(id)! * base;
  }
  const starving = g.food <= 0.001 && hunger(g) > farmRaw + 1e-9;
  if (starving) {
    for (const [id, m] of made) {
      if (SITE.get(id)!.allows !== 'farm') made.set(id, 0);
    }
    void 0;
  }

  // ★★ MESH ROUTING, 2026-08-08 — the owner: *"there should be a reason to
  // connect stuff to each other as opposed to just center."* There is now:
  // LOGS travel to the NEAREST MILL, planks travel mill → camp, everything
  // else travels → camp — each along its own shortest chain, all sharing
  // every path\'s capacity. Pines wired straight to the river ship without
  // touching the camp\'s own edges; a star pays for the detour in chokes.
  const mills = [...comp].filter((id) =>
    SITE.get(id)!.allows === 'sawmill' && (g.stacks[id] ?? 0) > 0).sort((a, b) => a - b);
  const toCamp = routes(g);
  const toMill = mills.length ? routes(g, mills) : toCamp;
  const walk = (from: number, parent: Map<number, number>, roots: Set<number>): string[] => {
    const out: string[] = [];
    for (let at = from; !roots.has(at);) {
      const next = parent.get(at);
      if (next === undefined) return out;
      out.push(pathKey(at, next));
      at = next;
    }
    return out;
  };
  const campRoot = new Set([0]);
  const millRoot = new Set(mills.length ? mills : [0]);

  // STAGE 1 — the raw goods: stone and food to the camp, logs to the mills
  // (or to the camp pile while no mill stands). Shared edges load together;
  // an over-cap edge scales every flow across it and the rest is WASTE.
  const flows: Array<{ id: number; rate: number; legs: string[]; kind: Kind }> = [];
  for (const [id, m] of made) {
    const k = SITE.get(id)!.allows;
    if (k === 'sawmill' || m <= 0) continue;
    flows.push({
      id, rate: m, kind: k,
      legs: k === 'lumber' && mills.length
        ? walk(id, toMill, millRoot)
        : walk(id, toCamp, campRoot),
    });
  }
  const load1 = new Map<string, number>();
  for (const f of flows) {
    for (const e of f.legs) load1.set(e, (load1.get(e) ?? 0) + f.rate);
  }
  const choked = new Set<string>();
  const carried = new Map<number, number>();
  const loads = new Map<string, number>();
  let stone = 0;
  let food = 0;
  let logsIn = 0;
  for (const f of flows) {
    let scale = 1;
    for (const e of f.legs) {
      const cap = (g.paths[e] ?? 0) * CARRY;
      const l = load1.get(e) ?? 0;
      if (l > cap + 1e-9) {
        choked.add(e);
        scale = Math.min(scale, cap / l);
      }
    }
    const got = f.rate * scale;
    for (const e of f.legs) loads.set(e, (loads.get(e) ?? 0) + got);
    carried.set(f.id, got);
    if (f.kind === 'quarry') stone += got;
    else if (f.kind === 'farm') food += got;
    else logsIn += got;
  }

  // STAGE 2 — the planks, mill → camp, over whatever the raw goods left of
  // each path. Sawing is not limited by shipping; planks that cannot ship
  // are waste, the same rule as everything else, and the choke is drawn.
  let millCap = 0;
  for (const id of mills) millCap += made.get(id) ?? 0;
  const sawing = mills.length
    ? Math.min(millCap, logsIn + (g.logs > 0.001 ? millCap : 0))
    : 0;
  let planks = 0;
  if (sawing > 0) {
    const load2 = new Map<string, number>();
    const legsOf = new Map<number, string[]>();
    for (const id of mills) {
      const share = sawing * ((made.get(id) ?? 0) / millCap);
      const legs = walk(id, toCamp, campRoot);
      legsOf.set(id, legs);
      for (const e of legs) load2.set(e, (load2.get(e) ?? 0) + share);
    }
    for (const id of mills) {
      const share = sawing * ((made.get(id) ?? 0) / millCap);
      let scale = 1;
      for (const e of legsOf.get(id)!) {
        const cap = (g.paths[e] ?? 0) * CARRY;
        const room = Math.max(0, cap - (load1.get(e) ?? 0));
        const want = load2.get(e) ?? 0;
        if (want > room + 1e-9) {
          choked.add(e);
          scale = Math.min(scale, room / want);
        }
      }
      const got = share * scale;
      for (const e of legsOf.get(id)!) loads.set(e, (loads.get(e) ?? 0) + got);
      carried.set(id, got);
      planks += got;
    }
  }

  return { stone, logs: logsIn, planks, food, starving, logsIn, millCap,
    sawing, hands, made, carried, choked, loads, staff, comp };
}

/** Why the next copy cannot be raised here, in plain words, or null. */
export function unraisable(g: City, id: number): string | null {
  const s = SITE.get(id);
  if (!s) return 'no such ground';
  if (g.goblins[id]) return `dangerous — goblins, ${Math.ceil(g.goblins[id])} strong`;
  // ★ THE PATH COMES FIRST — the owner: *"it's weird that i can build
  // something before there's a path to that spot."* No works on ground
  // the town cannot reach.
  if (id !== 0 && !component(g).has(id)) return 'no path reaches here';
  return shortOf(g, costOf(s.allows, g.stacks[id] ?? 0));
}

/** Why this path cannot be laid or widened, in plain words, or null. */
export function unlayable(g: City, a: number, b: number): string | null {
  const A = SITE.get(a);
  const B = SITE.get(b);
  if (!A || !B || !A.near.includes(b)) return 'nothing joins these';
  if (g.goblins[a] || g.goblins[b]) {
    return `dangerous — goblins, ${Math.ceil(g.goblins[a] ?? g.goblins[b]!)} strong`;
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
  if (g.hero.hp < heroMax(g)) return `the hero heals — ${g.hero.hp} of ${heroMax(g)}`;
  return null;
}

export type Action =
  | { type: 'tick'; secs: number }
  /** Work by hand where you stand looking — stone off the rocks, logs off
   *  the pines. The thumb follows the tapped site; the shell says which. */
  | { type: 'tap'; kind?: 'stone' | 'logs' }
  /** Lay the path between neighbours, or widen it a gauge. */
  | { type: 'lay'; a: number; b: number }
  /** Raise the NEXT copy of this site's works (a hut, at the camp). */
  | { type: 'raise'; id: number }
  /** Set a works' hands by ±1 — the first touch takes over from auto. */
  | { type: 'pin'; id: number; d: 1 | -1 }
  /** Give a hand-set works back to the auto staffing. */
  | { type: 'free'; id: number }
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
      // What ships home is the SAWN amount at stage 2's ratio; the rest of
      // a choked mill's output is waste, same rule as everything else.
      const cut = g.logs + f.logsIn * s;
      const sawn = Math.min((f.millCap || 0) * s, cut);
      const shipped = f.sawing > 1e-9 ? sawn * (f.planks / f.sawing) : 0;
      // People grow toward the huts' room, one at a time — and only where
      // there is bread: past the wild's table, settlers want a stocked
      // larder before they move in. Captives are the exception (fights).
      let pop = g.pop;
      let popPart = g.popPart;
      const fed = pop < WILD_FED || g.food > 1;
      if (pop < popCap(g) && fed) {
        popPart += s / GROW_SECS;
        const grown = Math.floor(popPart);
        pop = Math.min(popCap(g), pop + grown);
        popPart -= grown;
      } else {
        popPart = 0;
      }
      // The hero heals at home — never mid-fight — toward the max the
      // fights already won have earned.
      let hero = g.hero;
      const hpMax = heroMax(g);
      if (!g.fight && hero.hp < hpMax) {
        const part = hero.part + s / HEAL_SECS;
        const up = Math.floor(part);
        hero = { ...hero, hp: Math.min(hpMax, hero.hp + up), part: part - up };
      } else if (hero.part !== 0 && hero.hp >= hpMax) {
        hero = { ...hero, part: 0 };
      }
      // ★ Goblins regroup while nobody is on their ground — a bled holding
      // climbs back toward its spawn. Chip-flee-heal-repeat is dead.
      let goblins = g.goblins;
      for (const [idStr, left] of Object.entries(g.goblins)) {
        const id = Number(idStr);
        const spawn = GOBLINS[id]?.strength ?? left;
        if (g.fight?.site === id || left >= spawn) continue;
        if (goblins === g.goblins) goblins = { ...g.goblins };
        goblins[id] = Math.min(spawn, left + GOBLIN_REGEN * s);
      }
      return {
        ...g,
        stone: g.stone + f.stone * s,
        logs: cut - sawn,
        planks: g.planks + shipped,
        food: Math.max(0, g.food + (f.food - hunger(g)) * s),
        pop,
        popPart,
        hero,
        goblins,
      };
    }

    case 'tap':
      return a.kind === 'logs'
        ? { ...g, logs: g.logs + TAP_STONE }
        : { ...g, stone: g.stone + TAP_STONE };

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

    case 'pin': {
      // From auto, the first touch takes over at TODAY'S hands and steps
      // from there; a held works can go all the way to zero.
      const cap = (g.stacks[a.id] ?? 0) * CREW;
      const now = g.crew[a.id] ?? Math.round(flow(g).hands.get(a.id) ?? 0);
      const next = Math.max(0, Math.min(cap, now + a.d));
      if (g.crew[a.id] !== undefined && next === now) return g;
      return { ...g, crew: { ...g.crew, [a.id]: next } };
    }

    case 'free': {
      if (g.crew[a.id] === undefined) return g;
      const crew = { ...g.crew };
      delete crew[a.id];
      return { ...g, crew };
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
        // ★ LIBERATED: the ground joins the town, hurt and all — and two
        // captives walk home with the hero, hungry and ready to work.
        const goblins = { ...g.goblins };
        delete goblins[site];
        return { ...g, goblins, fight: null, pop: g.pop + CAPTIVES };
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
        stone: g.stone - (price.stone ?? 0),
        logs: g.logs - (price.logs ?? 0),
        planks: g.planks - (price.planks ?? 0),
        stacks: { ...g.stacks, [a.id]: have + 1 },
      };
    }
  }
}
