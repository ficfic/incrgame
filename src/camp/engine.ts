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
  /** ★ RICHER GROUND: every hand posted here makes this many times what
   *  the same hand makes on safe ground. Absent = 1, plain. */
  rich?: number;
}

/** ★ THE WILDERNESS. Hand-placed; the board draws exactly these. Beyond
 *  the starter ring the ground is GOBLIN-HELD — the hero's ladder. */
export const SITES: readonly Site[] = [
  { id: 0, name: 'The Camp', x: 200, y: 205, allows: 'hut', near: [1, 2, 3] },
  { id: 1, name: 'Rock Face', x: 118, y: 122, allows: 'quarry', near: [0, 2] },
  { id: 2, name: 'Tall Pines', x: 296, y: 118, allows: 'lumber', near: [0, 1, 3] },
  { id: 3, name: 'River Bend', x: 292, y: 296, allows: 'sawmill', near: [0, 2, 5] },
  { id: 4, name: 'High Meadow', x: 104, y: 292, allows: 'farm', near: [0, 1, 6] },
  // ★★ THE TWO GATES, and they are the map's real prizes — see `near: [0]`.
  // Each one is a SECOND ROAD HOME for its whole arm of the country: until
  // the Scree falls, every eastern good crosses `0|3` alongside the mill's
  // planks; until the Knoll falls, EVERY MOUTHFUL OF FOOD IN THE GAME
  // crosses `0|4`, and that single 3.0/s edge is where the town stops
  // growing at 66 people. Taking them opens an artery, which is a thing
  // no amount of building at Rock Face can buy.
  { id: 5, name: 'Scree Slope', x: 388, y: 232, allows: 'quarry', near: [0, 3], rich: 1.5 },
  { id: 6, name: 'Goblin Knoll', x: 46, y: 380, allows: 'quarry', near: [0, 4], rich: 2 },
  // ★★ THE SECOND REGION, 2026-08-08 — behind the knoll and the scree,
  // stronger holdings, longer hauls, and the farmland the growing town
  // will need. Hidden until the ground in front of it falls. RICH: the
  // deep country's ground is simply better, which is the other half of
  // why anybody would walk down there.
  { id: 7, name: 'Dark Pines', x: -34, y: 452, allows: 'lumber', near: [6], behind: 6, rich: 2.5 },
  { id: 8, name: 'High Quarry', x: 474, y: 306, allows: 'quarry', near: [5], behind: 5, rich: 3 },
  { id: 9, name: 'Green Vale', x: 78, y: 512, allows: 'farm', near: [7], behind: 6, rich: 3.5 },
];

/** ★ HOW GOOD THE GROUND IS — every hand here makes this much more. The
 *  answer to the owner: *"no reason to have a site protected by goblins
 *  where you can build a quarry, because you have unlimited defenceless
 *  quarries near start."* A ×M site is worth a PERMANENT head start of
 *  ln(M)/ln(1.35) copies over a safe one — ×3 is 3.7 copies, forever —
 *  so the High Quarry's first pit beats Rock Face's fourth and stays
 *  ahead. Bounded, because both sites still climb the same 1.35 curve. */
export const richOf = (id: number): number => SITE.get(id)?.rich ?? 1;

/** ★★ THE GOBLINS, stolen from Mayor of Noobtown on the owner's order:
 *  held ground shows its strength, takes no works and no paths, and the
 *  town's ONE hero clears it a fight at a time. Farther is stronger, and
 *  stronger BITES harder. */
export const GOBLINS: Record<number,
  { strength: number; bite: number; runt: number }> = {
  // ⚠️ RETUNED 2026-08-08 (chad-liquidity): 24 and 32 make the ladder a
  // clean +2 of spears per fight — 1/2/4/6/8/10.
  // ⚠️ RETUNED AGAIN 2026-08-08 (the battle strip): `runt` is each rear
  // square's health, pegged to the ladder's hit (2+spears) — ONE aimed
  // strike drops a runt at tier, TWO at tier-minus-one, and those two
  // extra full-line answers are the whole gate. Re-simmed to optimal
  // play square by square (test: "THE LADDER HOLDS — solved, not felt",
  // which runs the solver itself on every push).
  4: { strength: 12, bite: 2, runt: 3 },
  5: { strength: 18, bite: 3, runt: 4 },
  6: { strength: 24, bite: 4, runt: 6 },
  7: { strength: 32, bite: 5, runt: 8 },
  8: { strength: 48, bite: 5, runt: 10 },
  9: { strength: 60, bite: 6, runt: 12 },
};

/** ★★★ THE GOBLINS COME AT YOU, 2026-08-09. The owner, asked what the goal
 *  is: *"i feel like we need to add attacking goblins and then make hero lose
 *  and restart stronger or something."* This is the first half.
 *
 *  Until now held ground did nothing but sit there and heal, so the map was a
 *  to-do list: six fights, in any order, at your leisure. A holding that can
 *  take something back is a CLOCK, and it is what makes the hero matter on
 *  every one of the days between fights rather than six times a run.
 *
 *  ⚠️ IT MUST NOT PUNISH ABSENCE. `docs/BRIEF.md`, standing constraint:
 *  *"Timers bank work; they never punish absence."* So menace BUILDS while
 *  you are away and CANNOT LAND — a raid that comes due offline waits at the
 *  gate, full, and resolves on the first tick you are actually watching.
 *  Come back to a raid about to break, never to a ruin. */
export const RAID_SECS = 300;
/** Which holdings are in a position to raid: those touching ground you hold
 *  that has something on it worth taking. A holding with nothing in reach
 *  never fills, so the early camp is not besieged from minute one. */
export function raiders(g: City): number[] {
  // ★★ FIRST BLOOD STARTS THE WAR, 2026-08-09. Before this the goblins came
  // for a camp that had never touched them, which made the opening five
  // minutes a siege you had no hero for. They ignore you until you take
  // something of theirs — and then they do not stop.
  if (g.taken <= 0 || g.lost) return [];
  const out: number[] = [];
  for (const id of Object.keys(g.goblins).map(Number)) {
    const s = SITE.get(id);
    if (!s) continue;
    if (s.near.some((n) => !g.goblins[n])) out.push(id);
  }
  return out;
}
/** What this holding would hit: the neighbour of yours with the most on it,
 *  so a raid always costs something and never picks an empty field. */
export function raidTarget(g: City, id: number): number | null {
  const s = SITE.get(id);
  if (!s) return null;
  let best: number | null = null;
  let bare: number | null = null;
  for (const n of s.near) {
    if (g.goblins[n]) continue;
    if ((g.stacks[n] ?? 0) > 0) {
      if (best === null || (g.stacks[n] ?? 0) > (g.stacks[best] ?? 0)) best = n;
    } else if (bare === null || (bare === 0 && n !== 0)) {
      // ★ NOTHING LEFT TO BURN MEANS THEY TAKE THE GROUND. A site they
      // strip bare is a site they can hold — and THE CAMP LAST OF ALL,
      // which is how a run ends.
      // ⚠️ The first cut wrote `bare === null || n === 0`, which preferred
      // the camp over every outpost — the exact opposite of the sentence
      // above it. Caught by a test that expected an outpost to fall.
      bare = n;
    }
  }
  return best ?? bare;
}

/** ★ GOBLINS REGROUP: a bled, unengaged holding climbs back toward its
 *  spawn. Kills the never-arm exploit — chip, flee, heal free, repeat.
 *  (The old bare-hands two-sortie tutorial is void: the strip gates
 *  fight one at Spears ×1, which teaches arming.)
 *
 *  ⚠️ RETUNED 2026-08-08 (review finding): the rate was FLAT 0.05/s, so a
 *  cycle's cost was 0.75 strength per hp healed no matter which holding
 *  it was — while the damage a sortie deals grows with spears. The deep
 *  rungs therefore ground out ONE RUNG UNDER the gate (+0.75, +2.50,
 *  +4.25 net per cycle at sites 7/8/9). Regen is now a FRACTION OF
 *  SPAWN a second, so a bigger holding closes its wounds faster and the
 *  grind pays nothing anywhere. Fight one (12 strong) is barely touched:
 *  0.048/s against the old 0.05. */
export const GOBLIN_REGEN = 0.004;
/** What a holding regains a second — its own spawn strength times the
 *  rate, so the ladder's own numbers set the pace. */
export const regenOf = (id: number): number =>
  (GOBLINS[id]?.strength ?? 12) * GOBLIN_REGEN;
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

import { MARK, outOf, type Good } from './marks';

export const pathKey = (a: number, b: number): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`;

export interface City {
  version: number;
  /** ★ COUNTS, not booleans: siteId → how many stand there. */
  stacks: Record<number, number>;
  /** ★ THE CONNECTIONS — `"a|b"` → gauge 1..MAX_GAUGE. Throughput each. */
  paths: Record<string, number>;
  /** ★ PATHS UNDER THE SPADE — key → seconds left and the whole job.
   *  A path is LAID now, not conjured (owner's ruling): it fills on the
   *  board over a few seconds and carries nothing until it is done. */
  laying: Record<string, { left: number; secs: number }>;
  /** ★★ WORKS UNDER CONSTRUCTION, 2026-08-10 — siteId → seconds left and
   *  the whole job, exactly the shape `laying` uses. The owner, on the
   *  first PC playtest: *"some mill got built as far as I understand
   *  instantly, although this is a little bit strange. Actually, it should
   *  take time to build it."* A site under the hammer is NOT in `stacks`
   *  yet, so it staffs nobody and makes nothing until the job lands. */
  raising: Record<number, { left: number; secs: number }>;
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
  /** ★ THE HERO — one, the town's own. SPEARS come from the stores; see
   *  THE ARMOURY MAKES SPEARS below for why the word changed. */
  hero: { hp: number; spears: number; part: number };
  /** ★ STOREHOUSES at the camp — how many stand. They are the CAP on every
   *  good; a full store wastes what arrives, the same law the paths obey. */
  store: number;
  /** ★ CARTS — how many times the cartwright has re-shod the haulage.
   *  The one exponential in this engine that runs FOR the player. */
  carts: number;
  /** ★ HOW LONG THE LARDER HAS BEEN EMPTY, in seconds. Drives how deep the
   *  famine bites — it is a squeeze, not a switch. */
  famine: number;
  /** ★ THE HERO IS OUT FORAGING — the job, or null. */
  forage: { left: number; secs: number } | null;
  /** How many forays have come home. Picks which encounter comes next. */
  forays: number;
  /** ★ MENACE — how ready each goblin holding is to come at you, 0 to 1.
   *  Keyed by the holding's site id. */
  menace: Record<number, number>;
  /** ★ HOW MANY HOLDINGS THIS RUN HAS TAKEN. Drives the hero's constitution
   *  and starts the war — ⚠️ counted explicitly rather than derived from
   *  `goblins`, because a raid can now ADD a holding and the old
   *  `originals − current` arithmetic went backwards the moment it did. */
  taken: number;
  /** ★ THE VALLEY IS LOST — the camp itself has been overrun. */
  lost: boolean;
  /** ★ WHAT OUTLIVES A RUN. The infrastructure does not; the veteran does —
   *  and what he carries out is the spears on his back. */
  legacy: { runs: number; spears: number };
  /** ★ A FIGHT IN PROGRESS, or null — the owner's own screen: our square
   *  left, three goblin squares right. Turn-based: every round is yours.
   *  `sq` is the line — a BRUTE up front (the mash trap) and two RUNTS
   *  behind; `target` is which square the next attack lands on; `round`
   *  counts their answers, and every third one is a WIND-UP. */
  fight: {
    site: number;
    sq: Array<{ hp: number; poke: number; kind: 'brute' | 'runt' }>;
    target: number;
    round: number;
    /** Rations left in the pack this sortie. */
    packs: number;
    /** ★★★ THE ORDER IN FLIGHT — the act you called and the seconds before
     *  it lands, or null when the hero is waiting on you. EXACTLY the
     *  `{ left, secs }` shape `laying` and `raising` wear, because this
     *  engine now has ONE way of saying "this takes time". */
    blow: { left: number; secs: number; act: Blow } | null;
  } | null;
}

/** What can be ordered in a fight. `aim` is free and `flee` is instant —
 *  neither is a blow. */
export type Blow = 'strike' | 'guard' | 'ration';

export const CITY_VERSION = 5;

/** ★★★ THE WAGON YOU ARRIVED WITH, 2026-08-10 — and the reason there is no
 *  tap any more. See THE HAND IS GONE below for the why; this is the how.
 *
 *  The old opening was: click a rock 20 times, buy a quarry. With the hand
 *  removed something has to pay for the first works, so the settlers bring
 *  it with them. The numbers are the opening priced out, not a vibe:
 *
 *    STONE — the whole first chain, in order:
 *      pathCostOf(0) = PATH_COST × 1 =  3   camp → Rock Face
 *      BASE.quarry                   =  5   the first pit
 *      pathCostOf(0)                 =  3   camp → Tall Pines
 *      ------------------------------- 11   and 4 over, which is the road
 *      to the river (3) with 1 to spare. The mill's own 8 stone is EARNED —
 *      one hand on the pit is 0.15/s, so it is about a minute of idling,
 *      which is the point of an idle game.
 *
 *    ⚠️ 15 IS ALSO THE ANTI-SOFTLOCK NUMBER, and that is why it is not 11.
 *      Three roads leave the camp that are not goblin-held (0|1, 0|2, 0|3),
 *      3 stone each = 9. A player who lays all three before building
 *      anything still has 6, and a quarry is 5. There is no opening order
 *      that can strand a town with no hand to dig its way out.
 *
 *    LOGS — a lumber camp costs BASE.lumber = 8 LOGS, and logs come only
 *      from a lumber camp: without the old chop-by-hand that is a closed
 *      loop, so the wagon carries the seed. 10 buys the camp with 2 over.
 *      The sawmill's 12 logs are earned at 0.2/s a hand.
 *
 *  Nothing else is given. No food (the wild feeds the first six), no
 *  planks (that is the mill's whole job), no huts. */
export const START_STONE = 15;
export const START_LOGS = 10;

export const initial = (): City => ({
  version: CITY_VERSION,
  stacks: {},
  paths: {},
  laying: {},
  raising: {},
  stone: START_STONE,
  logs: START_LOGS,
  planks: 0,
  food: START_FOOD,
  crew: {},
  // ★ FOUR came with you — see CAMP_ROOM. It was two, and two people cannot
  // staff the three works the opening asks for, so the mill made nothing.
  pop: 4,
  popPart: 0,
  goblins: Object.fromEntries(
    Object.entries(GOBLINS).map(([k, v]) => [k, v.strength])),
  hero: { hp: 10, spears: 0, part: 0 },
  store: 0,
  carts: 0,
  famine: 0,
  forage: null,
  forays: 0,
  menace: {},
  taken: 0,
  lost: false,
  legacy: { runs: 0, spears: 0 },
  fight: null,
});

/** The hero's base health, and the pace of getting it back. */
export const HERO_HP = 10;
export const HEAL_SECS = 15;
/** Every third answer, the whole line winds up and bites double. */
export const WINDUP_EVERY = 3;
/** Rations, mid-fight: the hero carries a PACK of them — two a sortie,
 *  3 food each, +4 health. Limited so a stocked larder cannot out-sit a
 *  fight the spears have not earned. */
export const RATION_FOOD = 3;
export const RATION_HP = 4;
export const RATION_PACK = 2;

/** ★★★ A BLOW TAKES TIME, 2026-08-10 (the PC playtest). The owner: *"it is a
 *  little bit weird that these attacks are instant again."* Every strike was
 *  a button press that resolved in the same frame, so a fight was a MASH —
 *  the fastest thumb was the whole tactic and the wind-up warning arrived and
 *  departed inside one tap.
 *
 *  ⚠️ ONE WAY OF SAYING "THIS TAKES TIME", not three. Paths (`laying`) and
 *  works (`raising`) are both a job with `left` seconds that the tick counts
 *  down; a blow is the third and wears the same `{ left, secs }`. You ORDER
 *  an act, the strip shows it coming, and it lands on the clock — one order
 *  in flight at a time, and no re-aiming a swing that has left the shoulder.
 *
 *  The number is read against PATH_SECS = 6 and BUILD_SECS (8–15): a swing is
 *  the QUICKEST thing in the valley, because a fight is six to ten of them
 *  and it has to stay a fight rather than an errand. Fight one is ~6 orders =
 *  12 seconds; the deep rungs run 20–30.
 *
 *  ⚠️ AND IT NEVER PUNISHES ABSENCE (`docs/BRIEF.md`): see the tick. */
export const BLOW_SECS = 2;
/** Seconds left on the ordered blow, or null when the hero is waiting on
 *  you — what the strip draws its beat from, the same way `raisingLeft`
 *  feeds the site panel. */
export const blowLeft = (g: City): number | null =>
  g.fight?.blow?.left ?? null;

/** ★ THE LINE a holding fields: a BRUTE up front — a wall of muscle,
 *  most of the strength, but it only pokes 1 — and two RUNTS behind with
 *  the site's real bite each. The brute is the default target and the
 *  mash trap: wail on the wall and the runts eat you. A reader aims past
 *  it, thins the runts, and guards the wind-ups. Rebuilt from CURRENT
 *  strength, so bled ground fields less — the runts fill first. */
export function lineOf(strength: number, bite: number, runt: number):
  Array<{ hp: number; poke: number; kind: 'brute' | 'runt' }> {
  const s = Math.max(1, Math.ceil(strength));
  const r = Math.max(0, Math.min(runt, Math.floor((s - 1) / 2)));
  return [
    { hp: s - 2 * r, poke: 1, kind: 'brute' },
    { hp: r, poke: r > 0 ? bite : 0, kind: 'runt' },
    { hp: r, poke: r > 0 ? bite : 0, kind: 'runt' },
  ];
}

/** Whether the NEXT answer is the wind-up — said a round ahead, so the
 *  strip can warn and Defend can mean something. `round` counts answers
 *  already taken. */
export const windup = (round: number): boolean =>
  (round + 1) % WINDUP_EVERY === 0;

/** ★ EVERY LIBERATION TOUGHENS THE HERO: +3 health per ground freed.
 *  The deep country's bites (5s and 6s) are priced against this — spears
 *  buy the strike, the fights already won buy the surviving. */
export const heroMax = (g: City): number => HERO_HP + 3 * g.taken;
/** What one strike lands: bare hands plus a spear for every one on his back. */
export const heroHit = (g: City): number => 2 + g.hero.spears;

/** ★★★ THE ARMOURY MAKES SPEARS, 2026-08-10 (the PC playtest). The owner:
 *  *"I don't understand why arms has swords ×4… the whole concept with making
 *  arms is a little bit strange. What does it even mean, making arms? … But
 *  why does it take planks and stones then?"*
 *
 *  Both halves of that are one fault: **"arms" is not a thing, it is a
 *  category**, and no category has a bill of materials — so the price could
 *  never make sense however it was written. A SPEAR is a thing, and a spear
 *  is precisely these two goods: a knapped STONE head on a planed PLANK
 *  shaft. The price is therefore unchanged (8 stone · 4 planks, ×1.3 a rung)
 *  — it was the right price all along for a noun nobody had said yet.
 *
 *  ⚠️ WHAT THIS DELIBERATELY IS NOT. The owner also said *"maybe we are
 *  building leather armor… we need hunters in the woods or something like
 *  this to get leather and process leather."* That is a NEW GOOD and a new
 *  chain (hunters → hides → workshop → gear) — a design decision that is the
 *  owner's to make, not a rename's to smuggle in. Nothing here invents a
 *  resource; the spear is made of what the valley already produces.
 *
 *  ⚠️ THE VERB SURVIVED THE NOUN: the action is still `{ type: 'arm' }` —
 *  you ARM the hero, and what you hand him is a spear. */
export const SPEAR_NAME = 'Spear';
/** What it is made of, in the player's own words — the line that answers
 *  "why planks and stones?" on the deed itself. */
export const SPEAR_MADE = 'stone head · plank shaft';
/** `Spears ×4` — how the rack is named wherever it is counted. */
export const spearLabel = (n: number): string =>
  `${SPEAR_NAME}${n === 1 ? '' : 's'} ×${n}`;

/** A spear costs BOTH goods, on a steeper curve — the late fights are meant
 *  to want the whole town's economy behind them. */
export const spearCost = (have: number): { stone: number; planks: number } => ({
  // 1.30, not 1.25: at the old curve the last spear cost less than the
  // heal it saved. Spears compete with hut planks now — real, not a week.
  stone: Math.ceil(8 * Math.pow(1.3, have)),
  planks: Math.ceil(4 * Math.pow(1.3, have)),
});

/** ★★★ THE HAND IS GONE, 2026-08-10 — the PC playtest's top finding, and the
 *  only one that voided the whole economy. The owner: *"there is no need for
 *  me to build a quarry because I am able to much faster click on the thing…
 *  I don't need a quarry ever"*, and again for the pines: *"I can go and chop
 *  logs by hand faster than any lumberworks can do it."*
 *
 *  THE ARITHMETIC THAT KILLED IT: `TAP_STONE` was 0.25 a click, ungated by
 *  paths, hands, food or storage. A thumb at ~4Hz is 1.0/s FROM NOTHING,
 *  forever. A quarry is RATE.quarry = 0.15/s **per hand**, shared across a
 *  population that has to be housed and fed and hauled home over a path with
 *  a 1.0/s cap. One thumb therefore out-earned six fully-crewed pits — so
 *  every ladder in this file (works, huts, carts, storehouses, the whole
 *  logistics layer) was priced against an income the player beat by hand,
 *  and none of them were worth buying.
 *
 *  The owner's own ruling: *"maybe clicking on the stone or clicking on the
 *  logs doesn't make any sense. Maybe we should just give some initial
 *  resources."* So the `tap` action is deleted outright and `initial()`
 *  carries the opening — see START_STONE above.
 *
 *  ⚠️ TWO OLD EXEMPTIONS DIED WITH IT, on the record so nobody re-derives
 *  them from the tests that used to pin them:
 *
 *    THE BOOTSTRAP — the hand was the only source of the first 5 stone in a
 *    town with no paths and no works. That job now belongs to START_STONE,
 *    which is sized so no opening order can strand the town.
 *
 *    THE FLOOR UNDER A STARVE — an empty larder halts every works but the
 *    farms, and the hand was how a farmless starving town earned the 12
 *    stone for a field. It cannot any more. That is survivable rather than
 *    fatal ONLY because starving needs pop > WILD_FED, which without bread
 *    needs captives, which needs `taken > 0`, which starts the raids — so a
 *    starved town loses its valley and `found`s the next one. A slow end,
 *    not a frozen save. If growth ever stops requiring bread, this becomes
 *    a real softlock and wants a farm-of-last-resort. */

/** ★★ THE STOREHOUSE, 2026-08-08 (owner: *"we'd need to do some storage
 *  capacity"*). Every good is capped; a full store WASTES what arrives,
 *  which is the law the paths already obey — production past the pipe is
 *  gone. Two things fall out of it, both wanted:
 *
 *    · Stone stops being infinite. The away line used to read +6462 of a
 *      thing that buys nothing; now the pocket time fills the store and
 *      the rest is spillage you can SEE and spend a building to stop.
 *    · The cap gates what you can SAVE FOR. Hut #13 costs 81 planks and
 *      Spears ×10 costs 85 stone — both over a bare 60 — so the store is
 *      not a nicety, it is the thing standing between the town and the
 *      end of either ladder.
 *
 *  Room is FLAT per house, not compounding: the whole point is that the
 *  answer to "I need a bigger number" is always one more building. */
export const STORE_BASE = 60;
export const STORE_ROOM = 60;
/** How much of each good the town can hold. */
export const roomOf = (g: City): number =>
  STORE_BASE + STORE_ROOM * g.store;
/** ★ PUT GOODS IN THE STORE. The ONE place a stock grows, so the hand and
 *  the carts can never disagree about what a full store means. A stock
 *  already over the ceiling is held rather than confiscated: it cannot
 *  grow, it does not vanish. */
export const stow = (g: City, was: number, now: number): number => {
  const room = roomOf(g);
  return now <= room ? now : Math.max(was, room);
};

/** The next storehouse's price — stone AND planks, so it competes with
 *  huts for the mill's output rather than being bought out of spare. */
export const storeCost = (have: number): { stone: number; planks: number } => ({
  stone: Math.ceil(25 * Math.pow(1.3, have)),
  planks: Math.ceil(15 * Math.pow(1.3, have)),
});

/** ★★ MULTI-HAND WORKS, 2026-08-08 (the pacing pass): every copy holds
 *  CREW hands, and output is PER WORKER — people carry growth, buildings
 *  are capacity. Two hands on quarry #1 is exactly the old copy, so
 *  minute zero is untouched; a full crew is twice it. */
export const CREW = 4;

/** Output per WORKER per second. */
export const RATE = { quarry: 0.15, lumber: 0.2, sawmill: 0.25, farm: 0.2 } as const;

/** ★★★ THE FORAY — the floor under the whole economy, 2026-08-10.
 *
 *  The owner: *"i think it's possible to soft lock, so we need to do
 *  repeatable encounters with logs and stone and other stuff as loot."*
 *  They are right, and it is worse than the one case already plugged: after
 *  first blood a raid takes a BUILDING every 150s, so a town can be stripped
 *  of every works while its stores sit at zero. Nothing then produces
 *  anything, ever. Refusing one bad purchase cannot fix that; only a source
 *  of goods that needs no buildings can.
 *
 *  ⚠️ IT MUST BE SLOWER THAN A WORKING PIT, or it is the tap again. That is
 *  the whole reason the hand died this morning: 0.25 a click out-earned every
 *  ladder in the game and made building pointless. A foray pays 4 stone over
 *  45s = 0.089/s, against ONE hand in a quarry at 0.15/s — so the moment you
 *  have a single working pit, foraging is the worse move. It is a floor, not
 *  a strategy.
 *
 *  ⚠️ AND IT IS PURE. No RNG anywhere in this engine, so the encounters cycle
 *  by `forays` rather than rolling: varied, deterministic, and testable. */
/** ★★★ FAMINE IS A SQUEEZE, NOT A SWITCH, 2026-08-10. The owner: *"famine
 *  does not have any effect, does it — let's make it gradual from -30 to -95
 *  production."*
 *
 *  It halted every non-farm works OUTRIGHT, which is both harsher and less
 *  legible than it sounds: a town either worked or it did not, so there was
 *  no moment where you could FEEL it coming and act. Now the first empty
 *  second costs 30% and it deepens to 95% over `FAMINE_DEEP`, which gives
 *  the player two minutes to get bread moving before it really bites.
 *
 *  ⚠️ IT NEVER REACHES ZERO. At −95% a stripped town still earns, which is
 *  what keeps the starvation dead-end shut alongside the foray. */
export const FAMINE_SHALLOW = 0.30;
export const FAMINE_DEEP_CUT = 0.95;
export const FAMINE_DEEP = 120;
/** What a hungry town still makes, as a fraction — 0.70 down to 0.05. */
export const faminePinch = (g: City): number => {
  const deep = Math.min(1, Math.max(0, g.famine) / FAMINE_DEEP);
  return 1 - (FAMINE_SHALLOW + (FAMINE_DEEP_CUT - FAMINE_SHALLOW) * deep);
};

export const FORAGE_SECS = 45;
export interface Foray { name: string; loot: Partial<Record<Good, number>> }
export const FORAYS: readonly Foray[] = [
  { name: 'A scree slip', loot: { stone: 4 } },
  { name: 'Deadfall in the pines', loot: { logs: 4 } },
  { name: 'A berry hollow', loot: { food: 4 } },
  { name: 'An old cairn', loot: { stone: 3, logs: 2 } },
  { name: 'A goblin cache', loot: { stone: 2, food: 3 } },
];
/** Which encounter the next foray meets. */
export const nextForay = (g: City): Foray => FORAYS[g.forays % FORAYS.length]!;
/** Seconds left on the hero's foray, or null when they are home. */
export const forageLeft = (g: City): number | null => g.forage?.left ?? null;
/** Why the hero cannot go out, or null. */
export function unforageable(g: City): string | null {
  if (g.lost) return 'the valley is lost';
  if (g.fight) return 'the hero is fighting';
  if (g.forage) return `${MARK.time}${Math.ceil(g.forage.left)}s`;
  return null;
}

/** ★ The wild feeds this many for free — a town of six needs no fields.
 *  The seventh settler eats, and so does every rescued captive. */
/** ★★ THE WILD FEEDS A COUPLE, 2026-08-10 — it fed SIX, and the camp sleeps
 *  four, so food was inert until you had built a hut AND filled it. The
 *  owner: *"food has no meaning in the beginning because it doesn't start to
 *  work until you get the first farm."* Two means the four who came with you
 *  are already eating, so the larder is live from the first second — and the
 *  answer to it is High Meadow, which is the first fight. That gives the
 *  tutorial fight a REASON, which was the other half of the complaint. */
export const WILD_FED = 2;
/** ★ What the wagon carries in bread — enough runway to lay the roads, raise
 *  a pit and take the meadow before the pinch bites. At pop 4 the town eats
 *  0.10/s, so 40 is about six and a half minutes. */
export const START_FOOD = 40;
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

/** ★★★ THE CARTWRIGHT, 2026-08-08 — THE ONE EXPONENTIAL THAT RUNS FOR THE
 *  PLAYER. The coherence review's finding was that there is no player-side
 *  exponential anywhere: `CURVE` and `spearCost` compound against you, while
 *  output is strictly LINEAR in a hard-capped population.
 *
 *  ⚠️ THE BACKLOG ASKED FOR A PRODUCTION MULTIPLIER AND IT WOULD HAVE BEEN
 *  A NO-OP. Measured before building: a finished town — every site stacked
 *  eight deep, every path at MAX_GAUGE, 162 people — makes 57.9/s and
 *  carries 13.9/s. **76% of a maxed town's work is already thrown away at
 *  the paths**, and MAX_GAUGE is a hard ceiling, so multiplying production
 *  would have multiplied the waste and nothing else.
 *
 *  So the exponential goes where the wall is. A cart rung multiplies what
 *  every gauge CARRIES, which turns that dead 76% into the reward — and
 *  design rule 3 says the graph is the logistics layer, so a multiplier on
 *  haulage is the one that belongs on this game's board.
 *
 *  It runs out on purpose: ~5 rungs fully un-choke a given town, after
 *  which carts do nothing until you build more works. Carts and works
 *  leapfrog, and the works ladder is unbounded, so the pair is too. */
export const CART_GAIN = 1.3;
/** How much more every path carries, all carts together. */
export const cartHaul = (g: City): number => Math.pow(CART_GAIN, g.carts);
/** What one path can carry a second — gauge, times the carts. */
export const carriesOf = (g: City, key: string): number =>
  (g.paths[key] ?? 0) * CARRY * cartHaul(g);
/** The next cart rung. 1.55 against a 1.3 gain: each rung takes ~1.19×
 *  as long as the last, which is a curve rather than a wall. */
export const cartCost = (have: number): { stone: number; planks: number } => ({
  stone: Math.ceil(30 * Math.pow(1.55, have)),
  planks: Math.ceil(20 * Math.pow(1.55, have)),
});

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
/** Seconds to lay toward each gauge: 6, then 12, then 18. Short — the
 *  point is a path GOING IN, not a wait. */
export const PATH_SECS = 6;

/** ★★★ WORKS TAKE TIME TO RAISE, 2026-08-10 (the PC playtest). The owner:
 *  *"some mill got built as far as I understand instantly, although this is
 *  a little bit strange. Actually, it should take time to build it."*
 *  `docs/BRIEF.md` item 3 makes TIMERS the idle spine, and until now the
 *  only timer in this game was on paths — everything else was a purchase
 *  that landed the instant you could afford it, which is a shop, not an
 *  idle game.
 *
 *  ⚠️ FLAT PER KIND, NOT ON THE CURVE, and that is deliberate. The COST
 *  already climbs 1.35^n (CURVE), so putting the copy number into the clock
 *  too would tax the same ladder twice and turn a deep site into a wall you
 *  watch. Paths scale with gauge because there are only three gauges and
 *  their price curve is a gentle ×(gauge+1); works have no such ceiling.
 *  The clock's job here is "a building goes UP", not "a building is a wait".
 *
 *  The numbers are read against PATH_SECS = 6: a works is heavier than a
 *  road, a mill is the heaviest thing in the valley, and a hut is the one
 *  you buy over and over so it is the quickest. The opening chain is
 *  therefore 6s of road + 10s of pit before the first stone moves. */
export const BUILD_SECS: Record<Kind, number> = {
  hut: 8, quarry: 10, lumber: 10, sawmill: 15, farm: 12,
};
/** Seconds left on this site's job, or null when nothing is going up —
 *  what the board and the panel draw the progress from. */
export const raisingLeft = (g: City, id: number): number | null =>
  g.raising[id]?.left ?? null;
/** How long this site's NEXT copy will take, for the deed's own label. */
export const buildSecs = (g: City, id: number): number =>
  BUILD_SECS[SITE.get(id)?.allows ?? 'quarry'];

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
    // ★ `🪨3/11` — have over need, 2026-08-09. It was "11 stone — you have
    // 3": eight words for two numbers, and it did not match `👤4/6` in the
    // HUD one row above it. Same shape now.
    if ((g[k] ?? 0) < v!) return outOf(k as Good, g[k] ?? 0, v!);
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

/** ★★★ THE CAMP ITSELF SHELTERS FOUR, 2026-08-10 — it was two, and two is
 *  not enough to run the opening. Verified by playing it: the auto-staffer
 *  round-robins one hand at a time over the worked sites in id order, so a
 *  town of TWO with a pit, a lumber camp and a mill gives `Rock Face=1,
 *  Tall Pines=1, River Bend=0` — **planks/s 0.000**. Planks are the only
 *  route to a hut, a hut is the only route to people, and people multiply
 *  everything, so an unpinned player had a dead game eighty seconds in,
 *  staring at a mill they had just earned that produced nothing and no
 *  words on screen to say why. Four hands cover the opening three works.
 *  Costs nothing at a hundred people; it is the first minute this buys. */
export const CAMP_ROOM = 4;
export const popCap = (g: City): number =>
  CAMP_ROOM + (g.stacks[0] ?? 0) * HUT_ROOM;

/** ★★★ ONLY THE HOUSED WORK, 2026-08-10 (the PC playtest). The owner, twice:
 *  *"I have four out of two people… and I do not have any penalties for it"*
 *  and *"six out of two people right now, by the way, and I do not have any
 *  penalties."* Captives walk home from every liberation into a camp with no
 *  room, and it was free — the hut ladder, which is the plank sink and the
 *  whole reason to run the mill, could simply be skipped.
 *
 *  THE RULE, and it is the smallest one that bites: a person past the huts'
 *  cap is NOT HOUSED, so they do not staff a works. They still eat — see
 *  `hunger`, which reads `g.pop` whole — so an over-full camp is a mouth
 *  with no hands, and the answer is a hut.
 *
 *  ⚠️ A PLATEAU, NEVER A LOSS (`docs/BRIEF.md`, standing constraint). Nobody
 *  starves to death, nobody leaves, no stock is taken. The extra people wait
 *  at the gate and go to work the second a roof exists. */
export const housed = (g: City): number =>
  Math.min(Math.floor(g.pop), popCap(g));

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
  /** ★ WHICH WAY EACH PATH RUNS: +1 if the goods travel low-id → high-id
   *  along `pathKey`, -1 the other way, absent for a path carrying
   *  nothing. The NET of everything routed over it — logs heading out to
   *  a mill and planks coming back share one edge, and the carriers walk
   *  whichever way wins. The view used to guess this from id order and
   *  got the pines→mill legs backwards. */
  dirs: Map<string, number>;
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
  // ★ ONLY THE HOUSED WORK — see `housed()`. Everyone past the huts' cap is
  // a mouth without a bunk, and a hand that has nowhere to sleep does not
  // turn up. They still eat: `hunger()` reads the whole population.
  let pool = housed(g);
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
    const base = (st.allows === 'quarry' ? RATE.quarry
      : st.allows === 'lumber' ? RATE.lumber
      : st.allows === 'farm' ? RATE.farm : RATE.sawmill)
      // ★ THE GROUND ITSELF, not just how many hands stand on it.
      * richOf(id);
    made.set(id, hands.get(id)! * base);
    if (st.allows === 'farm') farmRaw += hands.get(id)! * base;
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
  /** The chain of edges from a site to its root — each with WHICH WAY the
   *  goods travel along it, since `pathKey` is sorted and the walk is not. */
  const walk = (from: number, parent: Map<number, number>, roots: Set<number>):
    Array<{ e: string; d: number }> => {
    const out: Array<{ e: string; d: number }> = [];
    for (let at = from; !roots.has(at);) {
      const next = parent.get(at);
      if (next === undefined) return out;
      out.push({ e: pathKey(at, next), d: at < next ? 1 : -1 });
      at = next;
    }
    return out;
  };
  const campRoot = new Set([0]);
  const millRoot = new Set(mills.length ? mills : [0]);

  // STAGE 1 — the raw goods: stone and food to the camp, logs to the mills
  // (or to the camp pile while no mill stands). Shared edges load together;
  // an over-cap edge scales every flow across it and the rest is WASTE.
  /** ★★★ ONE RUN OF THE WHOLE HAULAGE, for a given day's production.
   *  Pulled out of line 2026-08-08 so it can be run TWICE — see the
   *  starvation decision below, which needs to know what actually got
   *  home before it can know whether the town is starving. */
  const deliver = (made: Map<number, number>) => {
  const flows: Array<{ id: number; rate: number;
    legs: Array<{ e: string; d: number }>; kind: Kind }> = [];
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
    for (const { e } of f.legs) load1.set(e, (load1.get(e) ?? 0) + f.rate);
  }
  const choked = new Set<string>();
  const carried = new Map<number, number>();
  const loads = new Map<string, number>();
  /** Signed load per edge — the net decides which way the carriers walk. */
  const net = new Map<string, number>();
  let stone = 0;
  let food = 0;
  let logsIn = 0;
  for (const f of flows) {
    let scale = 1;
    for (const { e } of f.legs) {
      const cap = carriesOf(g, e);
      const l = load1.get(e) ?? 0;
      if (l > cap + 1e-9) {
        choked.add(e);
        scale = Math.min(scale, cap / l);
      }
    }
    const got = f.rate * scale;
    for (const { e, d } of f.legs) {
      loads.set(e, (loads.get(e) ?? 0) + got);
      net.set(e, (net.get(e) ?? 0) + got * d);
    }
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
    const legsOf = new Map<number, Array<{ e: string; d: number }>>();
    for (const id of mills) {
      const share = sawing * ((made.get(id) ?? 0) / millCap);
      const legs = walk(id, toCamp, campRoot);
      legsOf.set(id, legs);
      for (const { e } of legs) load2.set(e, (load2.get(e) ?? 0) + share);
    }
    for (const id of mills) {
      const share = sawing * ((made.get(id) ?? 0) / millCap);
      let scale = 1;
      for (const { e } of legsOf.get(id)!) {
        const cap = carriesOf(g, e);
        const room = Math.max(0, cap - (load1.get(e) ?? 0));
        const want = load2.get(e) ?? 0;
        if (want > room + 1e-9) {
          choked.add(e);
          scale = Math.min(scale, room / want);
        }
      }
      const got = share * scale;
      for (const { e, d } of legsOf.get(id)!) {
        loads.set(e, (loads.get(e) ?? 0) + got);
        net.set(e, (net.get(e) ?? 0) + got * d);
      }
      carried.set(id, got);
      planks += got;
    }
  }

  return { stone, food, logsIn, planks, millCap, sawing,
    made, carried, choked, loads, net };
  };

  // ★★★ STARVING IS ABOUT WHAT ARRIVES, NOT WHAT IS GROWN, 2026-08-08.
  // The coherence review's third finding: this test used to read `farmRaw`,
  // the food standing in the fields. A farm whose path home is choked was
  // therefore counted as feeding the town, and the failure was SILENT — an
  // empty larder, no warning, no halt, and every works running flat out on
  // rations that never arrived.
  //
  // So the town is run once as it would run normally, and the answer to
  // "did enough food get home" decides. If it did not, the works halt and
  // the town is run AGAIN with only the farms working — which frees the
  // very paths the food was stuck behind, and is how a starving town digs
  // itself out.
  void farmRaw;
  const open = deliver(made);
  const starving = g.food <= 0.001 && hunger(g) > open.food + 1e-9;
  const halted = new Map(made);
  if (starving) {
    // ★ A SQUEEZE, NOT A SWITCH — see `faminePinch`. The first empty second
    // costs 30% and it deepens to 95% over two minutes, so the player can
    // FEEL it coming instead of the town simply stopping. Farms are exempt:
    // they are the way out, and halting them would be the dead end.
    const pinch = faminePinch(g);
    for (const [id, m] of halted) {
      if (SITE.get(id)!.allows !== 'farm') halted.set(id, m * pinch);
    }
  }
  const run = starving ? deliver(halted) : open;
  const { stone, food, logsIn, planks, millCap, sawing, carried, choked,
    loads, net } = run;

  // The net decides the walk: a path where logs out and planks back
  // cancel exactly shows nobody, which is honest.
  const dirs = new Map<string, number>();
  for (const [e, n] of net) if (Math.abs(n) > 1e-9) dirs.set(e, n > 0 ? 1 : -1);

  return { stone, logs: logsIn, planks, food, starving, logsIn, millCap,
    sawing, hands, made: run.made, carried, choked, loads, dirs, staff, comp };
}

/** Why the next copy cannot be raised here, in plain words, or null. */
export function unraisable(g: City, id: number): string | null {
  const s = SITE.get(id);
  if (!s) return 'no such ground';
  if (g.goblins[id]) return `${MARK.danger}${Math.ceil(g.goblins[id])}`;
  // ★ THE PATH COMES FIRST — the owner: *"it's weird that i can build
  // something before there's a path to that spot."* No works on ground
  // the town cannot reach.
  if (id !== 0 && !component(g).has(id)) return 'no path reaches here';
  // ★ ONE HAMMER PER SITE, the same ruling `unlayable` makes about spades.
  // It is also what keeps the price honest: with a job in flight `stacks`
  // has not moved yet, so a second order would buy copy #n twice.
  if (g.raising[id]) return 'already raising';
  return shortOf(g, costOf(s.allows, g.stacks[id] ?? 0));
}

/** Why this path cannot be laid or widened, in plain words, or null. */
export function unlayable(g: City, a: number, b: number): string | null {
  const A = SITE.get(a);
  const B = SITE.get(b);
  if (!A || !B || !A.near.includes(b)) return 'nothing joins these';
  if (g.goblins[a] || g.goblins[b]) {
    return `${MARK.danger}${Math.ceil(g.goblins[a] ?? g.goblins[b]!)}`;
  }
  if (g.laying[pathKey(a, b)]) return 'already laying';
  const gauge = g.paths[pathKey(a, b)] ?? 0;
  if (gauge >= MAX_GAUGE) return 'as wide as it goes';
  if (gauge === 0) {
    const comp = component(g);
    if (!comp.has(a) && !comp.has(b)) return 'no path reaches either end';
  }
  // ★★★ A WIDEN ON A ROAD THAT CARRIES NOTHING IS REFUSED, 2026-08-10.
  //
  // ⚠️ THIS PLUGS A PERMANENT SOFTLOCK, verified by running it: lay all three
  // camp roads (−9 of the wagon's 15, leaving 6), wait for them to finish,
  // widen one (`pathCostOf(1)` is 6) and you are at ZERO STONE with no works
  // standing. An hour of ticks later, still 0.00 — a quarry costs 5 and a
  // sawmill 8, and there is no other stone on the map. You cannot even lose
  // your way out, because `raiders()` needs `taken > 0`, so `lost` never
  // fires and `found` is refused. The save is dead forever.
  //
  // The hand used to be the escape hatch and removing it removed the escape,
  // so the fix belongs where the trap is. And it is a trap in EVERY case,
  // not just the fatal one: widening a road nothing travels buys exactly
  // nothing, at any point in the game. A widen relieves a choke; if there is
  // no traffic there is no choke.
  if (gauge >= 1 && (flow(g).loads.get(pathKey(a, b)) ?? 0) <= 1e-9) {
    return 'nothing travels this road';
  }
  const price = pathCostOf(gauge);
  if (g.stone < price) return outOf('stone', g.stone, price);
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
  /** `away` marks a tick that is being caught up from the clock rather than
   *  played. Menace still builds; raids do not land. */
  | { type: 'tick'; secs: number; away?: boolean }
  /** Lay the path between neighbours, or widen it a gauge. */
  | { type: 'lay'; a: number; b: number }
  /** Put the NEXT copy of this site's works under construction (a hut, at
   *  the camp). Paid now, standing in BUILD_SECS seconds. */
  | { type: 'raise'; id: number }
  /** Set a works' hands by ±1 — the first touch takes over from auto. */
  | { type: 'pin'; id: number; d: 1 | -1 }
  /** Give a hand-set works back to the auto staffing. */
  | { type: 'free'; id: number }
  /** Make the hero another SPEAR, from the stores. */
  | { type: 'arm' }
  /** Raise the next storehouse at the camp — room for every good. */
  | { type: 'stow' }
  /** Set the cartwright to work — every path carries more. */
  | { type: 'cart' }
  /** The valley is lost: walk out and found the next one. */
  | { type: 'found' }
  /** Send the hero out for whatever the country will give up. */
  | { type: 'forage' }
  /** Send the hero at held ground — the battle strip opens. */
  | { type: 'assail'; id: number }
  // ★★ THE THREE ORDERS take BLOW_SECS to land — they are CALLED here and
  // the tick resolves them. One in flight at a time.
  /** Call a blow at the targeted square. Lands, then the line answers. */
  | { type: 'strike' }
  /** Deal nothing, block the answer whole — the wind-up's counter. */
  | { type: 'guard' }
  /** 3 food and a pack now, +4 health when it lands, and the line answers. */
  | { type: 'ration' }
  /** Pick which square the next blow lands on. Free — no round, no clock —
   *  but refused while an order is already in flight. */
  | { type: 'aim'; at: number }
  /** Break off the fight and walk home to heal. Instant, even mid-swing. */
  | { type: 'flee' };

/** ★ THE LINE ANSWERS: every living square pokes (double on the wind-up),
 *  unless the hero blocked. A hero poked to nothing is beaten home and the
 *  ground keeps its wounds — a second try starts where this one bled off. */
function answered(g: City, f: NonNullable<City['fight']>,
  blocked: boolean): City {
  const bite = blocked ? 0
    : f.sq.reduce((n, q) => n + (q.hp > 0 ? q.poke : 0), 0)
      * (windup(f.round) ? 2 : 1);
  const hp = g.hero.hp - bite;
  if (hp <= 0) {
    const left = f.sq.reduce((n, q) => n + Math.max(0, q.hp), 0);
    return { ...g, goblins: { ...g.goblins, [f.site]: left },
      hero: { ...g.hero, hp: 0 }, fight: null };
  }
  return { ...g, hero: { ...g.hero, hp },
    fight: { ...f, round: f.round + 1 } };
}

/** ★★ ORDER A BLOW — the act is called now and lands BLOW_SECS later on the
 *  tick. Nothing about the fight moves here: no damage, no answer, no round.
 *
 *  ⚠️ THE RATION IS PAID UP FRONT, exactly the way `raise` pays for a works
 *  when the job starts and not when it lands ("the stone is in the
 *  foundations"). The food leaves the larder and the pack when you call for
 *  it; what arrives seconds later is the health. Otherwise a ration ordered
 *  on a full larder could be spent by hunger before it landed, and the act
 *  would silently fizzle mid-swing. */
function order(g: City, act: Blow): City {
  const f = g.fight;
  if (!f || f.blow) return g;                    // one order in flight
  if (act === 'ration') {
    if (f.packs <= 0 || g.food < RATION_FOOD) return g;
    return { ...g, food: g.food - RATION_FOOD,
      fight: { ...f, packs: f.packs - 1,
        blow: { left: BLOW_SECS, secs: BLOW_SECS, act } } };
  }
  return { ...g, fight: { ...f, blow: { left: BLOW_SECS, secs: BLOW_SECS, act } } };
}

/** ★★ THE BLOW LANDS — the whole of what `strike`/`guard`/`ration` used to do
 *  the instant they were pressed, moved to the far side of the clock. Called
 *  from the tick and nowhere else. */
function lands(g: City): City {
  const f = g.fight;
  if (!f?.blow) return g;
  const now = { ...f, blow: null };
  if (f.blow.act === 'guard') {
    // Deal nothing, take nothing — the wind-up's counter, at the price of a
    // round the line spends closing back up.
    return answered(g, now, true);
  }
  if (f.blow.act === 'ration') {
    // The food went when it was ordered; the health arrives now, and the
    // line still gets its answer.
    const fed = { ...g, hero: { ...g.hero,
      hp: Math.min(heroMax(g), g.hero.hp + RATION_HP) } };
    return answered(fed, now, false);
  }
  // ★★ Your blow falls on the TARGET (or the first square standing, if the
  // target fell while the swing was in the air). Deterministic — no dice;
  // whether you can win was decided by the town that armed you.
  const at = (now.sq[now.target]?.hp ?? 0) > 0
    ? now.target : now.sq.findIndex((q) => q.hp > 0);
  if (at < 0) return { ...g, fight: now };
  const sq = now.sq.map((q, i) =>
    i === at ? { ...q, hp: Math.max(0, q.hp - heroHit(g)) } : q);
  if (sq.every((q) => q.hp <= 0)) {
    // ★ LIBERATED: the ground joins the town, hurt and all — and two
    // captives walk home with the hero, hungry and ready to work.
    const goblins = { ...g.goblins };
    delete goblins[now.site];
    const menace = { ...g.menace };
    delete menace[now.site];
    return { ...g, goblins, menace, fight: null, pop: g.pop + CAPTIVES,
      taken: g.taken + 1 };
  }
  return answered(g, { ...now, sq, target: at }, false);
}

/** ★ THE LONGEST A SINGLE TICK MAY STAND FOR. One `tick` is one Euler
 *  step: it reads the town at the START of the step and bills the whole
 *  span at that reading. Live, at a fifth of a second, nothing can drift.
 *  Away, at twelve HOURS, everything did. */
export const STEP_SECS = 60;

/** ★ THE POCKET TIME, SIMULATED RATHER THAN ESTIMATED (review finding,
 *  2026-08-08). A single 12-hour tick grew a town of 2 to a town of 22 on
 *  an empty larder — `pop < WILD_FED` and `hunger()` were both read once,
 *  at the start, and stayed true for the whole night. Live play stalls at
 *  six for want of bread, which is the rule the food artery is built on.
 *  A path two seconds from done also carried nothing for twelve hours.
 *  Chunked, the away run obeys every rule the live run obeys. Pure. */
export function catchUp(g: City, secs: number): City {
  let out = g;
  for (let left = secs; left > 1e-9; left -= STEP_SECS) {
    out = apply(out, { type: 'tick', secs: Math.min(STEP_SECS, left), away: true });
  }
  return out;
}

export function apply(g: City, a: Action): City {
  switch (a.type) {
    case 'tick': {
      if (!(a.secs > 0) || g.lost) return g;
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
        // ⚠️ THE WILD'S TABLE IS A CEILING WITHIN THE STEP TOO (review
        // finding). A long tick used to bank several settlers at once off a
        // single `fed` reading taken at second zero — so a breadless town
        // sailed straight past the six the wild feeds, and the food artery
        // the whole mid-game is built on simply did not bite when the game
        // was in a pocket. Growth stops AT the table until there is bread.
        const room = g.food > 1 ? popCap(g) : Math.max(pop, WILD_FED);
        pop = Math.min(room, pop + grown);
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
      // ★ The spades work: every path being laid comes on by so much, and
      // a finished one joins the network mid-tick.
      let paths = g.paths;
      let laying = g.laying;
      for (const [key, job] of Object.entries(g.laying)) {
        const left = job.left - s;
        if (laying === g.laying) { laying = { ...g.laying }; paths = { ...g.paths }; }
        if (left <= 0) {
          paths[key] = (paths[key] ?? 0) + 1;
          delete laying[key];
        } else {
          laying[key] = { left, secs: job.secs };
        }
      }

      // ★★ AND THE HAMMERS: every works under construction comes on by the
      // same span, and a finished one JOINS `stacks` mid-tick — exactly the
      // way a finished path joins `paths` one block up. `catchUp` chunks the
      // away run at STEP_SECS, so a night in a pocket lands every build job
      // it should and none of them early.
      let stacks = g.stacks;
      let raising = g.raising;
      for (const [idStr, job] of Object.entries(g.raising)) {
        const id = Number(idStr);
        const left = job.left - s;
        if (raising === g.raising) { raising = { ...g.raising }; stacks = { ...g.stacks }; }
        if (left <= 0) {
          stacks[id] = (stacks[id] ?? 0) + 1;
          delete raising[id];
        } else {
          raising[id] = { left, secs: job.secs };
        }
      }

      // ★ Goblins regroup while nobody is on their ground — a bled holding
      // climbs back toward its spawn. Chip-flee-heal-repeat is dead.
      let goblins = g.goblins;
      for (const [idStr, left] of Object.entries(g.goblins)) {
        const id = Number(idStr);
        const spawn = GOBLINS[id]?.strength ?? left;
        if (g.fight?.site === id || left >= spawn) continue;
        if (goblins === g.goblins) goblins = { ...g.goblins };
        goblins[id] = Math.min(spawn, left + regenOf(id) * s);
      }
      // ★★★ MENACE BUILDS, AND RAIDS LAND ONLY WHILE YOU ARE WATCHING.
      // A holding with something of yours in reach fills toward a raid over
      // RAID_SECS. If it comes due on an away-tick it STAYS full and waits:
      // `docs/BRIEF.md` — "timers bank work; they never punish absence" — so
      // you come back to a raid about to break, never to a ruin.
      let menace = g.menace;
      const able = raiders(g);
      const canRaid = new Set(able);
      for (const id of Object.keys(g.menace).map(Number)) {
        // A holding that can no longer reach anything stands down.
        if (!canRaid.has(id) && (g.menace[id] ?? 0) !== 0) {
          if (menace === g.menace) menace = { ...g.menace };
          menace[id] = 0;
        }
      }
      for (const id of able) {
        const next = Math.min(1, (g.menace[id] ?? 0) + s / RAID_SECS);
        if (menace === g.menace) menace = { ...g.menace };
        menace[id] = next;
      }
      // ★ THE FORAY COMES HOME, and it lands on an away tick too. A raid and
      // a blow are held until you are watching because they can COST you
      // something; banking work you are owed is the opposite, and is what
      // `docs/BRIEF.md` promises. One foray per absence — it does not
      // re-order itself.
      // ★ THE LARDER'S CLOCK: it deepens while empty and recovers once bread
      // is moving again, so a town that digs itself out is not punished for
      // the hole it was in.
      // ⚠️ IT DOES NOT DEEPEN WHILE YOU ARE AWAY, for two reasons that agree.
      // `docs/BRIEF.md`: timers bank work, they never punish absence — and a
      // famine that bites harder for having gone out is exactly that. It also
      // keeps `catchUp` and a single long `tick` identical to the penny,
      // which they must be: the ramp reads `famine` at the start of a tick,
      // so a deepening one would make the answer depend on chunk size.
      const famine = a.away ? g.famine
        : f.starving ? g.famine + s
        : Math.max(0, g.famine - s * 2);
      let forage = g.forage;
      let forays = g.forays;
      let loot: Partial<Record<Good, number>> | null = null;
      if (forage) {
        const left = forage.left - s;
        if (left > 0) forage = { ...forage, left };
        else { loot = nextForay(g).loot; forays = g.forays + 1; forage = null; }
      }
      let lost: boolean = g.lost;
      if (!a.away) {
        for (const id of able) {
          if ((menace[id] ?? 0) < 1) continue;
          const t = raidTarget({ ...g, stacks, goblins }, id);
          if (t === null) continue;
          if (menace === g.menace) menace = { ...g.menace };
          menace[id] = 0;
          if ((stacks[t] ?? 0) > 0) {
            if (stacks === g.stacks) stacks = { ...g.stacks };
            stacks[t] = stacks[t]! - 1;
            continue;
          }
          // ★★★ THE GROUND ITSELF. A site with nothing left on it is a site
          // they take and hold — the barrier shrinks, and you have to march
          // to get it back. The camp is the last one, and losing it ends
          // the run.
          if (goblins === g.goblins) goblins = { ...goblins };
          goblins[t] = goblins[id] ?? GOBLINS[id]?.strength ?? 12;
          if (menace === g.menace) menace = { ...g.menace };
          menace[t] = 0;
          if (t === 0) lost = true;
        }
      }

      // ★ THE STORE IS A CEILING, and going over it is WASTE — the same
      // law the paths obey. A stock already over the cap (the store was
      // just the only thing holding it) is left alone rather than
      // confiscated; it simply cannot grow.
      const hold = (was: number, now: number): number => stow(g, was, now);
      const out: City = {
        ...g,
        stone: hold(g.stone, g.stone + f.stone * s + (loot?.stone ?? 0)),
        logs: hold(g.logs, cut - sawn + (loot?.logs ?? 0)),
        planks: hold(g.planks, g.planks + shipped + (loot?.planks ?? 0)),
        food: hold(g.food,
          Math.max(0, g.food + (f.food - hunger(g)) * s) + (loot?.food ?? 0)),
        pop,
        popPart,
        hero,
        goblins,
        paths,
        laying,
        raising,
        menace,
        stacks,
        lost,
        forage,
        forays,
        famine,
      };

      // ★★★ AND THE SWING COMES DOWN — last, on the town the rest of this
      // tick already built, so a ration lands into the larder this second
      // filled and a liberation counts against this second's population.
      //
      // ⚠️ THE AWAY RULE, and it is the RAID'S RULE word for word
      // (`docs/BRIEF.md`: *"timers bank work; they never punish absence"*).
      // The seconds BANK while you are away — `left` runs down to 0 and
      // stops there — but the blow does not LAND until a tick you are
      // actually watching. Landing it in a pocket would answer with the
      // whole line's bite and could beat the hero home from a fight the
      // player never saw, on a 60-second `catchUp` chunk they could not
      // react to: absence, punished. So you come back to a swing about to
      // fall, never to a hero already carried home.
      //
      // (A fight left standing overnight is frozen either way: the hero does
      // not heal mid-fight and the engaged holding does not regroup.)
      if (!out.fight?.blow) return out;
      const left = Math.max(0, out.fight.blow.left - s);
      if (left > 0 || a.away) {
        return { ...out,
          fight: { ...out.fight, blow: { ...out.fight.blow, left } } };
      }
      return lands(out);
    }

    case 'lay': {
      if (unlayable(g, a.a, a.b)) return g;
      const key = pathKey(a.a, a.b);
      const gauge = g.paths[key] ?? 0;
      const secs = PATH_SECS * (gauge + 1);
      return {
        ...g,
        stone: g.stone - pathCostOf(gauge),
        laying: { ...g.laying, [key]: { left: secs, secs } },
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
      const price = spearCost(g.hero.spears);
      if (g.stone < price.stone || g.planks < price.planks) return g;
      return {
        ...g,
        stone: g.stone - price.stone,
        planks: g.planks - price.planks,
        hero: { ...g.hero, spears: g.hero.spears + 1 },
      };
    }

    case 'stow': {
      const price = storeCost(g.store);
      if (g.stone < price.stone || g.planks < price.planks) return g;
      return {
        ...g,
        stone: g.stone - price.stone,
        planks: g.planks - price.planks,
        store: g.store + 1,
      };
    }

    case 'cart': {
      const price = cartCost(g.carts);
      if (g.stone < price.stone || g.planks < price.planks) return g;
      return {
        ...g,
        stone: g.stone - price.stone,
        planks: g.planks - price.planks,
        carts: g.carts + 1,
      };
    }

    // ★★★ FOUND THE NEXT CAMP. The owner: *"make hero lose and restart
    // stronger."* Everything you built is gone — that is what losing the
    // valley means — and the ONE thing that walks out is the veteran.
    //
    // The carry is `floor(spears/2) + 1`, taken as a MAXIMUM against what you
    // already had, so a run that ends early can never make you weaker than
    // the run before it. Failure is a plateau, never a loss: `docs/BRIEF.md`.
    case 'found': {
      if (!g.lost) return g;
      const legacy = {
        runs: g.legacy.runs + 1,
        spears: Math.max(g.legacy.spears, Math.floor(g.hero.spears / 2) + 1),
      };
      const next = initial();
      return { ...next, legacy,
        hero: { ...next.hero, spears: legacy.spears } };
    }

    case 'forage': {
      if (unforageable(g) !== null) return g;
      return { ...g, forage: { left: FORAGE_SECS, secs: FORAGE_SECS } };
    }

    case 'assail': {
      if (unassailable(g, a.id)) return g;
      const spec = GOBLINS[a.id];
      return { ...g, fight: {
        site: a.id,
        sq: lineOf(g.goblins[a.id] ?? 0, spec?.bite ?? 2, spec?.runt ?? 0),
        target: 0,
        round: 0,
        packs: RATION_PACK,
        blow: null,
      } };
    }

    // ★★★ THE THREE ORDERS. Each one is CALLED here and LANDS on the tick
    // BLOW_SECS later — see `order`, `lands`, and BLOW_SECS for why.
    case 'strike':
    case 'guard':
    case 'ration':
      return order(g, a.type);

    case 'aim': {
      // Free — picking a square costs no round; reading is rewarded.
      if (!g.fight) return g;
      // ★ BUT NOT MID-SWING: an order in flight cannot be re-aimed, or the
      // seconds would buy a take-back instead of a decision and the beat
      // would be pure delay. Aim, then call it.
      if (g.fight.blow) return g;
      const q = g.fight.sq[a.at];
      if (!q || q.hp <= 0 || g.fight.target === a.at) return g;
      return { ...g, fight: { ...g.fight, target: a.at } };
    }

    case 'flee': {
      // ★ INSTANT, EVEN MID-SWING — breaking off is the safety valve, and a
      // valve you have to wait two seconds for is not one. Any ordered blow
      // is dropped with the fight.
      if (!g.fight) return g;
      // Every square keeps its wounds — the ground regroups from here.
      const left = g.fight.sq.reduce((n, q) => n + Math.max(0, q.hp), 0);
      return { ...g, goblins: { ...g.goblins, [g.fight.site]: left },
        fight: null };
    }

    // ★★★ RAISING TAKES TIME — see BUILD_SECS. THE COSTS ARE PAID WHEN THE
    // JOB STARTS, not when it lands: the stone is in the foundations, and a
    // price you could dodge by having the goods only at the end would make
    // the timer a formality. `stacks` does not move until the tick finishes
    // the job, so a works under construction staffs nobody and makes
    // nothing — which is the whole point of the item.
    case 'raise': {
      if (unraisable(g, a.id)) return g;
      const s = SITE.get(a.id)!;
      const have = g.stacks[a.id] ?? 0;
      const price = costOf(s.allows, have);
      const secs = BUILD_SECS[s.allows];
      return {
        ...g,
        stone: g.stone - (price.stone ?? 0),
        logs: g.logs - (price.logs ?? 0),
        planks: g.planks - (price.planks ?? 0),
        raising: { ...g.raising, [a.id]: { left: secs, secs } },
      };
    }
  }
}
