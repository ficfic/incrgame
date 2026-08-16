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
  /** ★★★ AND IT GROWS BETWEEN RUNS TOO — 2026-08-11. This ground does not
   *  exist at all until you have finished this many valleys. The genre
   *  reviewer's verdict on why anyone plays a second run: not a stat carry, a
   *  SCOPE carry — *"run 2 is a bigger valley"*. Raising the ladder made the
   *  same ten sites harder, which is the cheap half; this is the other half. */
  fromRun?: number;
  /** ★ RICHER GROUND: every hand posted here makes this many times what
   *  the same hand makes on safe ground. Absent = 1, plain. */
  rich?: number;
}

/** ★ THE WILDERNESS. Hand-placed; the board draws exactly these. Beyond
 *  the starter ring the ground is GOBLIN-HELD — the hero's ladder. */
export const SITES: readonly Site[] = [
  // ★★★ 'The Camp' UNTIL 2026-08-16. The owner, twice — playtest 4's C6 and
  // then again out loud: *"what does the town tab mean, what and where is the
  // town?"* The answer was that the dock said TOWN, the sheet it opened was
  // titled "The town", and the map called that same single dot "The Camp".
  // Three surfaces, one place, two words, and nothing pointing between them.
  // ⚠️ AND `camp` WAS ALREADY TAKEN. The goal line counts "3 goblin camps
  // left", so the one word named the player's home AND the enemy's holdings —
  // which is why renaming the DOT is the fix and renaming the TAB would not
  // have been: the player's place is now the Town on every surface, and camp
  // belongs to the goblins alone.
  { id: 0, name: 'The Town', x: 200, y: 205, allows: 'hut', near: [1, 2, 3] },
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
  // ★★★ A SECOND SAWMILL, 2026-08-11 (chad-liquidity). One site in the whole
  // valley allowed a sawmill, so PLANKS were capped at 1.0/s no matter how
  // many people you had — and planks are what three of the four exponential
  // sinks are priced in. Only 4 of 36 worker slots touched the good the
  // economy actually runs on, which is the arithmetic behind the owner's
  // *"there's no point in having more people."*
  //
  // It was `High Quarry` (rich ×3), and stone was already the good with 67%
  // of its output unspendable. Turning the deep country's richest site into
  // the second mill fixes both ends at once: it drains the stone glut and it
  // makes Dark Pines (logs ×2.5, behind a strength-32 fight) worth taking.
  // The plank ceiling stops being a building and starts being a WAR AIM.
  { id: 8, name: 'High Mill', x: 474, y: 306, allows: 'sawmill', near: [5], behind: 5, rich: 3 },
  { id: 9, name: 'Green Vale', x: 78, y: 512, allows: 'farm', near: [7], behind: 6, rich: 3.5 },
  // ★★★ THE COUNTRY BEYOND THE RIDGE, 2026-08-11 — ground that is not on the
  // map at all until you have taken a valley and walked on. Run two is a
  // BIGGER valley, not merely a harder one: four more sites, richer than
  // anything in the first, and a second mill deep enough that the plank
  // ceiling moves again. This is the scope carry the genre review asked for,
  // and it is why finishing is worth doing twice.
  { id: 10, name: 'The Long Scree', x: 470, y: 470, allows: 'quarry',
    near: [5, 8], behind: 8, rich: 4, fromRun: 1 },
  { id: 11, name: 'Winterwood', x: -80, y: 300, allows: 'lumber',
    near: [7], behind: 7, rich: 4, fromRun: 1 },
  { id: 12, name: 'The Ridgemill', x: 250, y: 560, allows: 'sawmill',
    near: [9, 10], behind: 9, rich: 4, fromRun: 2 },
  { id: 13, name: 'Broadfield', x: -60, y: 600, allows: 'farm',
    near: [9, 11], behind: 9, rich: 5, fromRun: 2 },
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
  { strength: number; bite: number; runt: number; screen?: number }> = {
  // ⚠️ RETUNED 2026-08-08 (chad-liquidity): 24 and 32 make the ladder a
  // clean +2 of spears per fight — 1/2/4/6/8/10.
  // ⚠️ RETUNED AGAIN 2026-08-08 (the battle strip): `runt` is each rear
  // square's health, pegged to the ladder's hit (2+spears) — ONE aimed
  // strike drops a runt at tier, TWO at tier-minus-one, and those two
  // extra full-line answers are the whole gate. Re-simmed to optimal
  // play square by square (test: "THE LADDER HOLDS — solved, not felt",
  // which runs the solver itself on every push).
  // ★★★ `screen` — HOW MANY REAR SQUARES. The lever for fight variety, and
  // MEASURED TO BE A RETUNE RATHER THAN A SETTING, 2026-08-11.
  //
  // The owner, having fought every rung: *"the variety is also not there at
  // the moment."* They are right — every line in the valley is brute + runt
  // + runt, so only the numbers move and every fight asks the same question.
  // `lineOf` takes a screen width now and keeps each holding's TOTAL health
  // identical (the brute takes whatever the screen does not), so the ladder's
  // arithmetic is untouched.
  //
  // ⚠️ AND IT STILL BREAKS THE LADDER. Changing the shape changes which
  // squares must die first, which changes how many full-line answers you eat,
  // which is the entire gate. Measured one holding at a time against the
  // solver test: a screen of 3 on site 5 breaks 2 rungs, on site 7 breaks 2,
  // on site 8 breaks 1, on site 9 breaks 1. Not one of them is free.
  //
  // So every holding is left at the tuned default and the variety is a
  // BALANCE JOB — the ladder wants re-solving alongside it, with
  // `chad-liquidity` and the solver test, not a value poked in at the end of
  // a session. `docs/NEXT.md` carries it as the next item.
  4: { strength: 12, bite: 2, runt: 3 },
  5: { strength: 18, bite: 3, runt: 4 },
  6: { strength: 24, bite: 4, runt: 6 },
  7: { strength: 32, bite: 5, runt: 8 },
  8: { strength: 48, bite: 5, runt: 10 },
  9: { strength: 60, bite: 6, runt: 12 },
  // ★★★ THE COUNTRY BEYOND THE RIDGE (2026-08-11) — only reachable on a
  // second run or later, and priced above everything in the first valley.
  // ⚠️ These rungs are NOT solver-tuned like 4–9 are: nobody can reach them
  // on run one, and by run two the hero carries blueprints and a levy the
  // solver knows nothing about. They are set by extending the +2-spears
  // cadence and they want confirming in play.
  10: { strength: 76, bite: 7, runt: 14 },
  11: { strength: 92, bite: 7, runt: 16 },
  12: { strength: 112, bite: 8, runt: 18 },
  13: { strength: 132, bite: 9, runt: 20 },
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
/** ★ WHEN A MUSTER STARTS DRAWING ITS LINE (step 3, 2026-08-10). Below this
 *  a gathering is a ring only; from here the board says what it is coming
 *  FOR. Half, so the warning arrives with time to march but not so early
 *  that the map is permanently strung with red. */
export const MUSTER_SHOWS = 0.5;
/** ★ WHAT AN AMBUSH COSTS, as a multiple of the raider's bite. Caught in the
 *  open there is no guard and no aim, so it hurts more than meeting them on
 *  ground you chose. */
export const AMBUSH_BITE = 1.5;
/** How long the board keeps saying they were caught. Long enough to look up
 *  from whatever you were tapping and see it. */
export const AMBUSH_TELL = 12;
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
      // ★★★ THE CAMP IS LAST FOR STACKED GROUND TOO, 2026-08-10.
      //
      // ⚠️ THIS IS THE "MY HUTS KEPT DISAPPEARING" BUG, and it was not a save
      // corruption — it was this line. The rule was "come for the fullest
      // thing you can reach", and the fullest pile in any town is the CAMP's
      // huts. So every raider on the map queued up on the camp and ate
      // housing, which is the one stack that gates everything else.
      //
      // Simulated before the fix, three raiders on a going concern:
      //   start   huts 5   cap 24
      //   raid 1  huts 2   cap 12
      //   raid 2  huts 0   cap  4   ← twenty people now unhoused and idle
      // and the run was over inside two cycles, opaquely.
      //
      // The comment beside `bare` below already claimed the camp goes last.
      // It just was not true of the ground that had anything on it.
      const better = best === null
        || (best === 0 && n !== 0)
        || (n !== 0 && (g.stacks[n] ?? 0) > (g.stacks[best] ?? 0));
      if (better && !(n === 0 && best !== null && best !== 0)) best = n;
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
/** ⚠️ 0.004 → 0.0075, 2026-08-11, AND IT IS TIED TO `HEAL_SECS`. The gate
 *  that stops you grinding a holding down below its rung is a race: you
 *  retreat, you heal, you come back — and the holding must close its wounds
 *  faster than that cycle pays. Halving the hero's heal time (the owner, for
 *  the second playthrough running: *"your hero health regeneration is still
 *  too slow"*) halves the cycle, so the ladder's gate needs the other half of
 *  the race to keep up or the grind quietly becomes the optimal play at every
 *  rung. The solver test is what caught it, and what set this number. */
export const GOBLIN_REGEN = 0.0075;
/** ★★★ THE CAMPS SWELL — N3, 2026-08-11. The owner, twice over two
 *  playthroughs: *"what is my motivation then here? I will just sit here, and
 *  I will not take any."* and *"I go on High Meadow. But what is there?
 *  There's no point for me at all. It doesn't attack me."*
 *
 *  They were reading the rules correctly, which was the problem. Goblins
 *  ignore a camp until you take something of theirs — so the optimal play was
 *  to never start, and the game's own mechanics argued for not playing it.
 *
 *  Now a holding you leave alone GROWS. Every camp's strength climbs toward
 *  `SWELL_MAX` times its spawn over `SWELL_SECS`, whether or not the war has
 *  started. Waiting is no longer free, taking ground early is worth more than
 *  taking it late, and none of it is a raid on a camp that has no hero yet —
 *  the opening stays as gentle as it was.
 *
 *  ⚠️ IT STARTS AT ZERO, so every ladder number the solver tuned is exactly
 *  what it was at the first minute. The pressure is on the CLOCK, not on the
 *  opening. */
export const SWELL_SECS = 900;
export const SWELL_MAX = 1.0;
/** How far the camps have swollen, 0 at the start and `SWELL_MAX` at most. */
/** Holdings the goblins still have. Zero is a won valley. */
export const holdingsLeft = (g: City): number => Object.keys(g.goblins).length;
export const swellOf = (g: City): number =>
  Math.min(SWELL_MAX, Math.max(0, g.since) / SWELL_SECS * SWELL_MAX);
/** A holding's spawn strength today — its tuned strength, plus the swell. */
/** ★★★ HOW MUCH STRONGER THE NEXT VALLEY IS — 2026-08-11. Each run you have
 *  finished, the country beyond the ridge is a fifth harder. This is what
 *  stops the carried blueprints from turning run three into a walkover: you
 *  come back knowing more, to ground that needs it. The map does not have to
 *  grow for the RUN to grow. */
export const RUN_STEP = 0.2;
export const runHard = (g: City): number => 1 + g.legacy.runs * RUN_STEP;
export const spawnOf = (g: City, id: number): number =>
  (GOBLINS[id]?.strength ?? 12) * (1 + swellOf(g)) * runHard(g);
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
  hero: {
    hp: number; spears: number; part: number;
    /** ★ WHERE THEY STAND — a site id. The war had no geography without it. */
    at: number;
    /** ★ ON THE ROAD: where to, and how long is left. */
    trip: { to: number; left: number; secs: number } | null;
  };
  /** ★ STOREHOUSES at the camp — how many stand. They are the CAP on every
   *  good; a full store wastes what arrives, the same law the paths obey. */
  store: number;
  /** ★★★ SKILL EXPERIENCE — 2026-08-16, `docs/BRIEF.md` item 2, and the last
   *  of the ten load-bearing things that had never been built. The owner:
   *  *"RuneScape's skill progression elements… what accrues is our stats."*
   *
   *  Keyed by `Skill`, counted in raw xp. ⚠️ XP IS EARNED BY DOING THE WORK,
   *  never bought and never chosen — that is the whole difference between
   *  this and the seven ±25% blueprints cut the day before it. A card asked
   *  you to pick which number went up; a level is a wage for work already
   *  done, and it arrives while you are looking at something else.
   *
   *  ⚠️ FRACTIONAL, and deliberately not rounded on the way in. A quarry
   *  making 0.15/s would earn nothing at all on an integer counter. */
  xp: Record<string, number>;
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
  /** ★ CAUGHT IN THE OPEN, and for how much longer the board says so. An
   *  ambush that only moved a number would be exactly the invisibility this
   *  whole item exists to end. */
  ambush: { at: number; left: number } | null;
  /** ★ THE STOREHOUSE UNDER THE HAMMER — 2026-08-11. It was the one thing in
   *  the valley that appeared the instant it was paid for. */
  stowing: { left: number; secs: number } | null;
  /** ★★★ THE EVENT LOG — N2, 2026-08-11. The owner: *"maybe we should have
   *  an advanced log too. Event log."* And, of the messages that flash over
   *  the board: *"'Scree Slope just taken' — they should go into the advanced
   *  log."* Newest last, capped at `LOG_KEEP`. Strings, because they are
   *  written where the event happens and read nowhere else. */
  log: string[];
  /** ★★★ WOOD CAMPS SWITCHED TO SAWING — 2026-08-11, the Kiln blueprint.
   *  Site ids that make planks instead of logs. */
  kilned: number[];
  /** ★★★ THE BLUEPRINTS TAKEN — 2026-08-11. The owner: *"we also need a
   *  research tree or something to unlock shit."* Three are offered every
   *  time you take a holding; you keep one. */
  boons: string[];
  /** ★★★ HOW MANY TOWNSFOLK MARCH WITH THE HERO — 2026-08-11. Chosen before
   *  you go, taken out of the working pool while they are away. */
  levy: number;
  /** ★★★ PEOPLE RECOVERING FROM A FIGHT. They are alive, they are counted in
   *  `pop`, and they cannot work until they mend. */
  hurt: number;
  /** ★★★ WHAT THE HERO IS STANDING IN FRONT OF — N5. An index into `MEETS`,
   *  or null. It waits indefinitely and blocks nothing. */
  meet: number | null;
  /** ★★★ SECONDS THE VALLEY HAS STOOD — N3, 2026-08-11. The camps swell on
   *  this clock, which is what makes waiting cost something. */
  since: number;
  /** ★★★ EXTRA HANDS HIRED ONTO A SITE'S WORKS — 2026-08-11. Site id → how
   *  many times its crew has been widened. */
  /** ★ WHAT OUTLIVES A RUN. The infrastructure does not; the veteran does —
   *  and what he carries out is the spears on his back. */
  /** ★★★ AND WHAT ELSE OUTLIVES IT, 2026-08-11. `boons` are the blueprints
   *  a WON run carries into the next valley — horizontal meta, never a
   *  percentage: you begin the next one knowing things, not multiplying
   *  things. And every run the country beyond the ridge is harder, so the
   *  knowledge is spent rather than banked. */
  legacy: { runs: number; spears: number; boons: string[] };
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
    /** ★★★ THE LEVY — 2026-08-11. Townsfolk who marched out with the hero,
     *  each one a square of OUR line standing in front of them. They are the
     *  same people the works are staffed from, so a levy is production spent
     *  as war. Health, not names: a levy square that falls is a person who
     *  comes home HURT, not a person who dies. */
    us: Array<{ hp: number }>;
    /** ★★★ THE ORDER IN FLIGHT — the act you called and the seconds before
     *  it lands, or null when the hero is waiting on you. EXACTLY the
     *  `{ left, secs }` shape `laying` and `raising` wear, because this
     *  engine now has ONE way of saying "this takes time". */
    blow: { left: number; secs: number; act: Blow } | null;
  } | null;
}

/** What can be ordered in a fight. `aim` is free and `flee` is instant —
 *  neither is a blow. */
/** ★★★ SWEEP, 2026-08-11 — the owner: *"the hero doesn't have any skills, so
 *  the battles are boring, and there is no point… the variety is also not
 *  there."*
 *
 *  A strike puts everything into ONE square, which is right against a wall
 *  and wrong against a line of runts — and every fight in the valley opens
 *  with runts behind a wall. A sweep spends the same swing across EVERY
 *  living square at `SWEEP_SHARE` of the damage each, so it is worse than a
 *  strike against one big thing and better against three small ones. That is
 *  a decision rather than a button: read the line, then choose. */
export type Blow = 'strike' | 'guard' | 'ration' | 'sweep' | 'volley';
/** What each square takes from a sweep, against a strike's whole blow. */
export const SWEEP_SHARE = 0.5;

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
  // ⚠️ ONLY THE HOLDINGS THAT EXIST IN THIS VALLEY. The country beyond the
  // ridge is not on run one's map at all, and seeding its camps anyway would
  // have made a first run impossible to WIN — `holdingsLeft` would never
  // reach zero and the victory that opens the next valley would never fire.
  goblins: valleyGoblins(0),
  hero: { hp: 10, spears: 0, part: 0, at: 0, trip: null },
  store: 0,
  xp: {},
  carts: 0,
  famine: 0,
  forage: null,
  forays: 0,
  menace: {},
  taken: 0,
  lost: false,
  ambush: null,
  stowing: null,
  log: [],
  since: 0,
  meet: null,
  boons: [],
  kilned: [],
  levy: 0,
  hurt: 0,
  legacy: { runs: 0, spears: 0, boons: [] },
  fight: null,
});

/** The hero's base health, and the pace of getting it back.
 *  ★ HEAL_SECS 15 → 8, 2026-08-11: *"your hero health regeneration is still
 *  too slow."* Said twice across two playthroughs. At 15s a hero coming out
 *  of a deep-country fight at 2 of 16 stood in the camp for three and a half
 *  minutes doing nothing, which in a game about marching somewhere is three
 *  and a half minutes of not playing. Eating (see `MEAL_FOOD`) is the fast
 *  way; this is the free one. */
export const HERO_HP = 10;
export const HEAL_SECS = 8;
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
/** ★ ONE, SINCE 2026-08-11. The owner watched a fight through: *"the cool
 *  down between actions… should be shorter because it's boring to watch."*
 *  Two seconds × six to ten orders is twenty seconds of waiting for a
 *  decision you already made. */
export const BLOW_SECS = 1;
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
export function lineOf(strength: number, bite: number, runt: number,
  screen = 2): Array<{ hp: number; poke: number; kind: 'brute' | 'runt' }> {
  const s = Math.max(1, Math.ceil(strength));
  const k = Math.max(0, Math.min(4, Math.round(screen)));
  // The screen cannot eat the wall: the brute keeps at least one health per
  // rear square, which is what stops a wide screen from being a free win.
  const r = k === 0 ? 0
    : Math.max(0, Math.min(runt, Math.floor((s - 1) / Math.max(1, k))));
  return [
    { hp: s - k * r, poke: 1, kind: 'brute' as const },
    ...Array.from({ length: k }, () => (
      { hp: r, poke: r > 0 ? bite : 0, kind: 'runt' as const })),
  ];
}

/** Whether the NEXT answer is the wind-up — said a round ahead, so the
 *  strip can warn and Defend can mean something. `round` counts answers
 *  already taken. */
export const windup = (round: number): boolean =>
  (round + 1) % WINDUP_EVERY === 0;

/** ★★★ A MEAL AT THE CAMP — F8, 2026-08-11. The owner: *"your hero health
 *  regeneration is still too slow, and I don't understand why I can't eat
 *  food."* Rations existed only INSIDE a fight, so the obvious thing to try
 *  outside one — spend food, get health — was simply missing. Same food, same
 *  health, no pack limit: packs ration a FIGHT, and this is not one. */
export const MEAL_FOOD = 6;
export const MEAL_HP = 4;
/** Why the hero cannot eat, in plain words, or null. */
export function uneatable(g: City): string | null {
  if (g.lost) return 'The valley is lost.';
  if (g.fight) return 'Not out here. Use rations during a fight.';
  if (g.hero.hp >= heroMax(g)) return 'The hero is already at full health.';
  if (g.food < MEAL_FOOD) return outOf('food', g.food, MEAL_FOOD);
  return null;
}

/** ★ EVERY LIBERATION TOUGHENS THE HERO: +3 health per ground freed.
 *  The deep country's bites (5s and 6s) are priced against this — spears
 *  buy the strike, the fights already won buy the surviving. */
export const heroMax = (g: City): number => HERO_HP + 3 * g.taken;
/** ★★★ WHAT A BLOW LANDS — 2026-08-11, and spears stopped being the only
 *  answer. The owner: *"first of all spears is a stupid resource… there's no
 *  point in having more people because it's sufficient to have planks and
 *  stones to build spears and only spam spears."*
 *
 *  Both halves of that were the same bug. Spears were the ONLY way to hit
 *  harder, so the whole economy was a pipeline into one number, and people
 *  were worth nothing to the war. The levy already stands in front and takes
 *  the answer; now it also SWINGS. Every townsperson still standing adds to
 *  the blow, so bodies are damage as well as armour — and a spear is a
 *  multiplier on a line rather than the line itself.
 *
 *  ⚠️ THE SOLVER'S LADDER IS UNTOUCHED at a levy of zero, which is what every
 *  rung was tuned against. Bringing people is a choice that makes fights
 *  easier and the town poorer, never a tax on the fights already balanced. */
/** ★★★ AND WAR IS THE FIFTH SKILL — 2026-08-16. One more damage every third
 *  level, which is deliberately coarse: the fight solver is the ladder's only
 *  guard and it reasons about WHOLE hit points, so a fractional bonus would
 *  make its answers meaningless. Coarse also means it is felt as an event —
 *  "the hero hits harder now" — instead of a decimal creeping upward. */
export const WAR_PER_HIT = 3;
export const heroHit = (g: City): number =>
  2 + g.hero.spears + standing(g)
  + Math.floor((skillOf(g, 'war') - 1) / WAR_PER_HIT);
/** Townsfolk still on their feet in the fight, if there is one. */
export const standing = (g: City): number =>
  (g.fight?.us ?? []).filter((u) => u.hp > 0).length;

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
/** ★★★ ONE WORKS PER SITE, 2026-08-11. The owner, having built four quarries
 *  on one rock: *"there is no point in having new locations… because I'm able
 *  to build multiple lumber works at the initial sites. So we should limit
 *  the number to one per location. And then we should allow to add more
 *  people there."*
 *
 *  That is the change that gives the MAP a reason to exist: with a site
 *  capped at one works, more output has to mean more GROUND — which means
 *  roads, fights and holdings — rather than another building on the rock you
 *  already own.
 *
 *  ⚠️ `CREW` STAYS AT 4, AND THAT IS A DECISION TO REVISIT IN PLAY. Raising
 *  it to 12 "so one works absorbs the hands the buildings used to" was tried
 *  and reverted: it rescales every tuned number in the economy at once, on a
 *  guess, and the whole valley is only ten sites — forty working slots, which
 *  is a lot of hands. If a grown town ends up with people standing idle, the
 *  fix is to raise the per-site cap THEN, with the town in front of us.
 *  ⚠️ The camp is exempt: its "works" are HUTS, and huts are housing. */
export const WORKS_MAX = 1;

/** ★★★ AND THE TRADE IS WHAT RAISES IT — 2026-08-16, `docs/BRIEF.md` item 4:
 *  *"a level you have not reached is a door you cannot open, and you can see
 *  it from here."*
 *
 *  The comment above says the fix for idle hands is to raise the per-site cap
 *  THEN, with the town in front of us. This is that, with the raise EARNED
 *  rather than granted: every `WORKS_PER_LEVEL` levels of a trade lets its
 *  works stand one deeper on a site. So the skills built the day before stop
 *  being a quiet +4% and become the unlock ladder the brief asked for — and
 *  the answer to "there is no point in more people" is now a door with a
 *  number on it, visible from the moment you can read the trade.
 *
 *  ⚠️ THE COST CURVE IS WHAT KEEPS THIS HONEST. The n-th copy still costs
 *  1.15^n, so a second quarry is a real price and never a free doubling.
 *  ⚠️ THE CAMP IS STILL EXEMPT — huts are housing, not a trade. */
export const WORKS_PER_LEVEL = 6;
/** ★★★ AND IT STOPS AT THREE — 2026-08-16, measured, not guessed.
 *
 *  ⚠️ WITHOUT A CEILING THIS QUIETLY DELETES THE RULE ABOVE IT. An hour-long
 *  simulation of a fully-roaded valley put quarrying at level 29 and the
 *  per-site cap at EIGHT — which is the four-quarries-on-one-rock the owner
 *  asked us to stop (*"there is no point in having new locations"*), arrived
 *  at by a slower road. The trade is meant to open a door, not to dissolve
 *  the wall: three deep is a felt reward and still leaves the map the only
 *  way to grow properly. Levels 7 and 13 are the two doors. */
export const WORKS_CAP = 3;
export const worksMax = (g: City, k: Kind): number => {
  const t = TRAINS[k];
  return t === null ? WORKS_MAX
    : Math.min(WORKS_CAP,
      WORKS_MAX + Math.floor((skillOf(g, t) - 1) / WORKS_PER_LEVEL));
};

/** Output per WORKER per second. */
export const RATE = { quarry: 0.15, lumber: 0.2, sawmill: 0.25, farm: 0.2 } as const;
/** ★ What a wood camp's own kiln manages against a proper mill. Deliberately
 *  under both `RATE.lumber` and `RATE.sawmill`: sawing where you felled saves
 *  a road, and a saved road has to cost something or the choice is not one. */
export const KILN_SHARE = 0.6;
/** What each kind of workface actually sends down the road (N6). */
export const GOOD_OF: Record<Kind, Good> = {
  hut: 'food', quarry: 'stone', lumber: 'logs', sawmill: 'planks', farm: 'food',
};

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

/** ★★★ THE HERO WALKS, 2026-08-10. The owner: *"the hero must have travel
 *  times between his attacks and home… and all must be visible on map."*
 *
 *  The complaint underneath was that the war is invisible, and the reason was
 *  structural rather than cosmetic: the hero had NO POSITION, so "on watch"
 *  was a boolean about the whole valley, a raid was an event with no path,
 *  and there was nothing to draw. Giving them a place is the spine — travel,
 *  interception and every drawn line fall out of it.
 *
 *  ⚠️ THEY WALK THE LAID ROADS. An unroaded site cannot be reached at all,
 *  which makes the path network defensive as well as economic, and gives the
 *  spade a second reason to exist. */
/** ★ SIX, DOWN FROM TWELVE — 2026-08-11. The owner, twice in one run: *"it's
 *  a bit strange as it takes thirty seconds to march there. It's a bit long.
 *  I don't have that patience."*
 *
 *  Thirty seconds was a laid road's twelve times `ROUGH` 2.5, and a march to
 *  a fight is ALWAYS the rough kind — a path can never be laid to goblin
 *  ground. So the number the player actually met was the worst one in the
 *  table, on the journey they make most often.
 *
 *  ⚠️ NOT A WALKING MINI-GAME. The obvious alternative — give them something
 *  to do while they walk — is a different game and they did not ask for it.
 *  Six on a road, eleven across country. */
export const WALK_SECS = 6;
/** ★ WHAT ROUGH COUNTRY COSTS, against a laid road. 1.8 keeps a laid road
 *  clearly worth having (6s against 11s) while putting the common journey
 *  inside the owner's patience. */
export const ROUGH = 1.8;
/** ★★★ SECONDS TO WALK FROM `a` TO `b` — 2026-08-11, and the rule changed
 *  here. It used to be that a road was PERMISSION: no road, no journey, with
 *  one exception carved out for the last step onto a holding (or no fight
 *  would ever have been reachable). That exception evaporated the moment you
 *  won the fight, and the owner walked straight into it: *"I can go there
 *  without a road, but I cannot return without a road, which is very
 *  strange."* Patching the exception to cover both directions only moved the
 *  problem — with any adjacent site one free step away, roads stop mattering
 *  for movement at all on a map this small.
 *
 *  So a road is SPEED, not permission. Anywhere can be walked to; a laid road
 *  is `WALK_SECS` a leg and open country is `ROUGH` times that. Roads are
 *  still worth laying, being still the only way to move GOODS, and now also
 *  the difference between reaching a gate in time and watching it fall.
 *
 *  ⚠️ A HOLDING IS STILL A WALL. You may march ONTO held ground — that is
 *  what starting a fight is — but never THROUGH it. */
export function walkSecs(g: City, a: number, b: number): number | null {
  if (a === b) return 0;
  const best = new Map<number, number>([[a, 0]]);
  const seen = new Set<number>();
  for (;;) {
    let at = -1, cost = Infinity;
    for (const [id, c] of best) if (!seen.has(id) && c < cost) { at = id; cost = c; }
    if (at === -1) return null;
    if (at === b) return cost;
    seen.add(at);
    // Held ground is a destination, never a corridor.
    if (g.goblins[at] && at !== a) continue;
    for (const n of SITE.get(at)?.near ?? []) {
      if (seen.has(n)) continue;
      const step = WALK_SECS * ((g.paths[pathKey(at, n)] ?? 0) ? 1 : ROUGH);
      if (cost + step < (best.get(n) ?? Infinity)) best.set(n, cost + step);
    }
  }
}
/** Legs walked, for anything that wants a count rather than a clock. */
export function legsBetween(g: City, a: number, b: number): number | null {
  const secs = walkSecs(g, a, b);
  return secs === null ? null : Math.max(1, Math.round(secs / WALK_SECS));
}
/** Seconds to march there from where the hero stands, or null if unreachable. */
export const marchSecs = (g: City, to: number): number | null => {
  const secs = walkSecs(g, g.hero.at, to);
  // ★ SCOUTS: the hero marches half again as fast.
  return secs === null ? null
    : Math.round(has(g, 'scouts') ? secs / 1.5 : secs);
};
/** Why the hero cannot set out for this site, or null. */
export function unmarchable(g: City, to: number): string | null {
  if (g.lost) return 'The valley is lost.';
  if (g.fight) return 'The hero is in a fight.';
  if (g.forage) return `${MARK.time}${Math.ceil(g.forage.left)}s`;
  if (g.hero.trip) return `${MARK.time}${Math.ceil(g.hero.trip.left)}s`;
  if (g.hero.at === to) return 'The hero is already here.';
  if (marchSecs(g, to) === null) return 'No way through. A goblin camp is in the way.';
  return null;
}

export const FORAGE_SECS = 45;
export interface Foray { name: string; loot: Partial<Record<Good, number>> }
export const FORAYS: readonly Foray[] = [
  { name: 'A scree slip', loot: { stone: 4 } },
  { name: 'Deadfall in the pines', loot: { logs: 4 } },
  { name: 'A berry hollow', loot: { food: 4 } },
  { name: 'An old cairn', loot: { stone: 3, logs: 2 } },
  { name: 'A goblin cache', loot: { stone: 2, food: 3 } },
];
/** ★★★ N5 — WHAT THE HERO MEETS OUT THERE, 2026-08-11. The owner: *"I feel
 *  like we would benefit from choose your own adventure events."*
 *
 *  ⚠️ NEVER AN ATTENTION TAX, which is the rule these had to be built around
 *  (`CLAUDE.md`: *"HITL review is never mandatory… an idle game that demands
 *  babysitting isn't one"*). The foray still pays its own loot the moment it
 *  lands, exactly as before. A meeting is EXTRA, it waits as long as you
 *  like, and ignoring it costs nothing but the thing you did not take. Both
 *  ways are worth having; neither is a trap.
 *
 *  ★ Player-facing prose: machine-drafted, owner-edited (`CLAUDE.md`). These
 *  are drafts and are meant to be rewritten. */
export interface Way { take: string; loot?: Partial<Record<Good, number>>;
  hp?: number; pop?: number; said: string }
export interface Meet { name: string; text: string; ways: readonly [Way, Way] }
export const MEETS: readonly Meet[] = [
  { name: 'A cold camp',
    text: 'Someone slept here a week ago and left in a hurry. There is a '
      + 'good axe under the bracken, and a track heading up the scree.',
    ways: [
      { take: 'Take the axe', loot: { logs: 8 },
        said: 'The hero came home with a stranger\u2019s axe and a full load of wood.' },
      { take: 'Follow the track', loot: { stone: 5 }, hp: -1,
        said: 'The track ran out at a rockfall. The hero came back scraped, and carrying.' },
    ] },
  { name: 'Two goblins arguing',
    text: 'They have not seen the hero. One of them is sitting on a sack of '
      + 'grain, and losing the argument.',
    ways: [
      { take: 'Wait them out', loot: { food: 10 },
        said: 'The losing goblin stormed off. The winner followed. The sack did not.' },
      { take: 'Rush them', loot: { food: 6, stone: 4 }, hp: -3,
        said: 'Two on one. The hero took the worst of it, but not the grain.' },
    ] },
  { name: 'A family on the road',
    text: 'Three of them, walking out of the valley with what they can carry. '
      + 'They ask whether the camp is real.',
    ways: [
      { take: 'Say yes', pop: 2,
        said: 'Two of them turned back with the hero. The third kept walking.' },
      { take: 'Give them food', loot: { food: -6 }, pop: 3,
        said: 'They ate, and then all three followed the hero home.' },
    ] },
  { name: 'The old mill race',
    text: 'A stone channel, silted up, older than anything the goblins built. '
      + 'It would take a day to clear \u2014 or an hour to strip for stone.',
    ways: [
      { take: 'Clear it', loot: { food: 4, logs: 4 },
        said: 'Water runs in the old channel again. The hero came back wet and pleased.' },
      { take: 'Strip it', loot: { stone: 12 },
        said: 'The old channel is a heap of good cut stone now. It will not run again.' },
    ] },
];
/** Which meeting a foray turns up, or null — every other one. */
export const meetFor = (forays: number): number | null =>
  forays % 2 === 1 ? Math.floor(forays / 2) % MEETS.length : null;

/** Which encounter the next foray meets. */
export const nextForay = (g: City): Foray => FORAYS[g.forays % FORAYS.length]!;
/** ★★★ IS THE HERO STANDING WATCH? Home, whole enough to fight, and not
 *  away on a foray. The owner, after a run: *"the goblin raids mechanics is
 *  unclear how it happens, why and what can you do about it."* The last
 *  third had no answer — the only lever was to conquer the holding faster,
 *  which a town under three raiders often cannot do. A hero kept at home
 *  turns raids away, so the player's real choice is now what to spend the
 *  hero's time ON: loot, ground, or the walls. */
/** ★★★ THE WATCH IS WHERE THEY STAND, 2026-08-10 (the owner's call). It was a
 *  boolean over the whole valley — one hero turning away a raid anywhere,
 *  which is the last non-spatial thing in the war. Now three holdings can be
 *  filling and the hero can be at ONE of them, and the roads decide which
 *  ones you can reach in time. */

export const onWatchAt = (g: City, site: number): boolean =>
  !g.lost && !g.fight && !g.forage && !g.hero.trip
  && g.hero.hp > 0 && g.hero.at === site;
/** Standing watch anywhere at all — for the HUD, not for resolving a raid. */
export const onWatch = (g: City): boolean =>
  !g.lost && !g.fight && !g.forage && !g.hero.trip && g.hero.hp > 0;

/** Seconds left on the hero's foray, or null when they are home. */
export const forageLeft = (g: City): number | null => g.forage?.left ?? null;
/** Why the hero cannot go out, or null. */
export function unforageable(g: City): string | null {
  if (g.lost) return 'The valley is lost.';
  if (g.fight) return 'The hero is in a fight.';
  if (g.forage) return `${MARK.time}${Math.ceil(g.forage.left)}s`;
  // ★ NOR FROM THE ROAD (2026-08-10). One hero, one job — walking is a job.
  if (g.hero.trip) return `${MARK.time}${Math.ceil(g.hero.trip.left)}s`;
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

/** What a laid path carries, per second, of everything put together.
 *  ⚠️ STAYS AT 1.0 THROUGH THE DELETION OF WIDENING (2026-08-11). Tripling it
 *  to "replace" the three gauges was tried and reverted within the hour: it
 *  made a single road big enough for anything, which silently deleted BOTH
 *  the choke and the reason to mesh a town instead of starring it — the most
 *  interesting thing the map does, and drawn on it. The owner asked for one
 *  tedious deed to go, not for the economy behind it. CARTS are the relief
 *  now, and they lift every road at once. */
export const CARRY = 1.0;
/** ★★★ ONE, SINCE 2026-08-11. Widening is GONE — *"we need to cut the
 *  functionality of widening the roads hundred percent. It's stupid that it
 *  is there."* A path is laid or it is not.
 *
 *  ⚠️ THE CHOKE AND THE MESH SURVIVE UNTOUCHED, which is the whole trick.
 *  Capacity is `gauge × CARRY × carts`; leaving CARRY alone means a laid road
 *  carries exactly what a laid road always carried, so chokes appear where
 *  they always did and meshing a town still beats starring it. What changes
 *  is only the RELIEF: carts, one global upgrade lifting every road at once,
 *  instead of the same deed repeated on every path in the valley. */
export const MAX_GAUGE = 1;

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
export const cartCostOf = (g: City, have: number): { stone: number;
  logs: number; planks: number } => {
  const c = cartCost(have);
  // ★ DROVER: carts come cheaper.
  const off = has(g, 'drover') ? 0.75 : 1;
  return { stone: Math.ceil(c.stone * off), logs: Math.ceil(c.logs * off),
    planks: Math.ceil(c.planks * off) };
};
export const cartCost = (have: number): { stone: number; logs: number;
  planks: number } => ({
  // ★★★ ALL THREE GOODS, 2026-08-11 (chad-liquidity). At 30 stone / 20 planks
  // a cart rung took 20 seconds of the town's planks and under 7 of its
  // stone, so stone idled at two thirds wasted and LOGS — whose entire
  // lifetime demand was 28, about ten seconds of production — were spent
  // within a minute of the first lumberworks and never wanted again.
  //
  // Priced so every rung binds on all three goods at roughly the same
  // second. The one unbounded sink in the game now pulls on the whole
  // economy instead of on one corner of it.
  stone: Math.ceil(90 * Math.pow(1.55, have)),
  logs: Math.ceil(35 * Math.pow(1.55, have)),
  planks: Math.ceil(20 * Math.pow(1.55, have)),
});

/** Each hut houses this many people — one hut per crew, ~50 lifetime.
 *  (At 2, hut #99 cost five million planks. Nobody was living there.) */
export const HUT_ROOM = 4;
/** Seconds to grow one person when there is room. */
/** How many lines the log keeps. Enough to scroll back through a raid and
 *  the famine that followed it; not so many that a save doubles in size. */
export const LOG_KEEP = 60;
/** Append lines to the log, keeping the newest `LOG_KEEP`. */
/** The good with the largest share of a direction's traffic, or null. */
const topGood = (at: Partial<Record<Good, number>>): Good | null => {
  let best: Good | null = null;
  let most = 0;
  for (const [k, v] of Object.entries(at)) {
    if ((v ?? 0) > most) { most = v ?? 0; best = k as Good; }
  }
  return best;
};

export const logged = (was: string[], ...lines: string[]): string[] =>
  lines.length === 0 ? was : [...was, ...lines].slice(-LOG_KEEP);

export const GROW_SECS = 12;
/** ★ How full the larder must be for settlers to keep coming without a
 *  surplus. A quarter: enough to carry the opening, not enough to let a
 *  fieldless town grow itself into a famine it cannot leave. */
export const GROW_STORE = 0.25;
/** ★★★ AND THE WAY OUT — 2026-08-11. Seconds of deep famine before someone
 *  gives up and walks out of the valley.
 *
 *  The owner played into a town that could not be fed and could not be
 *  shrunk: *"I think at this point, I'm not able to stop starving. There is
 *  no way."* They were right — every farmable site already held its one farm,
 *  the only deed on offer cost food, and nothing reduced the number of
 *  mouths. A famine now COSTS PEOPLE, which is grim and self-correcting: the
 *  town falls until the fields it has can feed it, and then it recovers. */
export const LEAVE_SECS = 20;
/** ★★★ THE LEVY, 2026-08-11 — the fork the owner left open: *"maybe we get
 *  rid of hero entirely and have just citizen militia squads… alternatively
 *  we keep the hero, maybe we'd be able to do some party based stuff too."*
 *
 *  Hero AND party, drawn from the town. It is the only shape where POPULATION
 *  is a military input at the point of use: a fight becomes "how many bodies
 *  did I bring, and can the town afford them being away from the workfaces?"
 *  Militia-only would have thrown away the map's whole spine — `hero.at`, the
 *  march, the watch, the run-to-run legacy — and rebuilt it as an
 *  abstraction. Hero-only is what we had, with people economically inert.
 *
 *  ⚠️ THEY DO NOT DIE. A levy square that falls is a person who comes home
 *  HURT: out of the workforce for `MEND_SECS`, then back. Permanent death
 *  wants names, a roster and a graveyard screen; wounded-and-returns is the
 *  same decision with none of that, and it keeps the cost in the currency
 *  the town already feels — hands. */
/** ★★★ THE BLUEPRINT DECK — 2026-08-11. The owner asked for *"a research
 *  tree or something to unlock shit"*, and the research came back with a
 *  shape rather than a tree: **Against the Storm's draft.** A tech tree earns
 *  its keep when the tree IS the content and a run is hundreds of hours;
 *  across six fights in forty minutes it degenerates into a checklist you
 *  tick in a fixed order. Three cards offered, one kept, from a deck you
 *  cannot exhaust — so a run has an identity, and the next one is different
 *  without the map having to be.
 *
 *  ⚠️ EVERY CARD CHANGES WHAT YOU CAN DO, or how a rule works. None of them
 *  is a bare percentage on a number you were already watching — that is the
 *  checklist failure mode wearing a different hat.
 *  ⚠️ AND THE DRAFT IS DETERMINISTIC. This engine has no RNG by design (the
 *  solver test is the ladder's only guard and it cannot enumerate dice), so
 *  which three you are offered is a function of how many holdings you have
 *  taken and what you already hold. */
export interface Boon { id: string; name: string; what: string }
export const BOONS: readonly Boon[] = [
  // ★★★ NAMED IN PLAIN ENGLISH, 2026-08-11. They read like a strategy game's
  // tech tree — Stonecut, Roadwright, Volley, Quartermaster, Bindings — and
  // the owner met them at the one moment they had earned a reward: *"the
  // ground totters three ways… Four is Stonecut Roadwright. What the fuck? I
  // don't understand. What does it say in English? It's not plain English."*
  //
  // A name says what the thing DOES, and the sentence says what changes on
  // your screen. If a card cannot be explained in one plain line, the card
  // is wrong — not the wording.
  //
  // ★★★ AND SEVEN OF THE TEN WENT IN THE BIN, 2026-08-15. Better quarries,
  // Better sawmills, Better farms, Cheaper carts, Bigger packs, Levy armour
  // and Better foraging were each ±25% on one number. Three of those on a
  // table is not a choice between three things, it is the same choice
  // rendered three ways, and the arithmetic is invisible the moment it is
  // taken. WHAT SURVIVES CHANGES A RULE: a new attack, a routing decision on
  // the graph, and roads that finish in half the time. ⚠️ A NEW CARD MUST
  // PASS THAT BAR — if the honest sentence is "n% more of a thing you
  // already have", it is a tuning constant, not a blueprint.
  // ⚠️ THE ORDER IS THE UNLOCK ORDER. First holding, second, third.
  { id: 'volley', name: 'Arrows',
    what: 'New attack: hits every goblin standing behind the front one' },
  { id: 'roadwright', name: 'Faster roads',
    what: 'Roads finish building in half the time' },
  { id: 'kiln', name: 'Sawpits',
    what: 'Lumber camps can saw their own planks instead of hauling logs out' },
];
/** Does the town hold this blueprint? */
export const has = (g: City, id: string): boolean => g.boons.includes(id);
/** Is this wood camp sawing its own planks where they fell? */
export const sawsHere = (g: City, id: number): boolean =>
  has(g, 'kiln') && g.kilned.includes(id);
/** ★★★ THE NEXT BLUEPRINT, or null when the town holds them all.
 *
 *  ⚠️ THIS WAS A DRAFT OF THREE until 2026-08-15, and it stopped being one
 *  when the deck went from ten cards to three: offering three of three is
 *  not a choice, it is a list, and picking the order you receive things in
 *  is not a decision either. So the ceremony is gone. Taking a holding hands
 *  over the next blueprint in a FIXED order — the fight one, the road one,
 *  the graph one — which is a reward you can read in one line instead of a
 *  modal that asks you to rank three multipliers you cannot feel. */
export const nextBoon = (g: City): string | null =>
  BOONS.find((b) => !g.boons.includes(b.id))?.id ?? null;

/** ★★★ THE MUSTER ROLL — 2026-08-11. The owner: *"what other stuff can we
 *  steal from fallout shelter, i love it so much."*
 *
 *  What Fallout Shelter actually does — and it was never the SPECIAL stats —
 *  is make you feel a loss. "3 came home hurt" is a decrement. *"Mira is
 *  mending"* is a debt. The magic is the name, and the name is free.
 *
 *  ⚠️ ONLY THE LEVY IS NAMED, and that is a deliberate refusal. Naming the
 *  forty at the works would make `flow`'s staffing loop decide WHO stands
 *  WHERE — an assignment problem the owner would either ignore as noise or
 *  optimise as an attention tax, on a screen they have just called "super
 *  messy". People are named at the moment they stop being fungible: when they
 *  march. Everyone else is still `pop`, and should stay that way.
 *
 *  ⚠️ AND THE NAME IS COSMETIC. Levy squares must stay mathematically
 *  interchangeable: the fight solver's memo key is the multiset of square
 *  health, and giving the levy individual stats would make the key wrong AND
 *  blow the state space from a multiset to an ordered tuple. A name may never
 *  become a number. */

export const NAMES: readonly string[] = [
  'Mira', 'Bran', 'Ossa', 'Ketil', 'Wren', 'Dag', 'Isolde', 'Tam',
  'Halla', 'Rurik', 'Sunn', 'Eddi', 'Vig', 'Nessa', 'Orm', 'Perrin',
  'Yara', 'Cuth', 'Lind', 'Bex', 'Aud', 'Grim', 'Nell', 'Fen',
];
/** Who the nth levy square is, this fight. Pure, deterministic, unsaved —
 *  the same muster always reads the same way, and nothing has to migrate. */
export const folkName = (site: number, i: number, taken: number): string =>
  NAMES[(site * 7 + i * 13 + taken * 3) % NAMES.length]!;

export const LEVY_HP = 5;
/** What one levied townsperson can take before they are carried home. */
export const MEND_SECS = 45;
/** Seconds a hurt person spends out of the workforce. */
/** The squares the town's levy fields — one per townsperson who marched. */
export const levied = (g: City): Array<{ hp: number }> =>
  Array.from({ length: Math.max(0, Math.min(g.levy, levyCap(g))) },
    // ★ BINDINGS: the levy stands longer.
    () => ({ hp: LEVY_HP + (has(g, 'bindings') ? 3 : 0) }));
export const levyCap = (g: City): number =>
  Math.max(0, Math.floor(housed(g) - g.hurt));

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

/** ★ What a storehouse takes to raise. Between a hut and a sawmill: it is
 *  the biggest thing at the camp, and the only one that helps everything. */
export const STOW_SECS = 14;
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

/** ★ Laying costs the path price. (It took a gauge when widening existed;
 *  the shape is kept so callers and saves need no surgery, and gauge is
 *  always 0 now.) */
export const pathCostOf = (gauge: number): number => PATH_COST * (gauge + 1);

/** What the map shows: the first valley whole (held ground drawn red IS
 *  the carrot), and the far country only once the ground in front of it
 *  falls — the map grows outward, fight by fight. */
/** The holdings a valley has at this many finished runs. */
export const valleyGoblins = (runs: number): Record<number, number> =>
  Object.fromEntries(Object.entries(GOBLINS)
    .filter(([k]) => {
      const site = SITE.get(Number(k));
      return site !== undefined
        && (site.fromRun === undefined || runs >= site.fromRun);
    })
    .map(([k, v]) => [Number(k), v.strength]));

export const shown = (g: City): Site[] =>
  SITES.filter((s) =>
    // ★ NOT IN THIS VALLEY AT ALL until you have finished enough of them.
    (s.fromRun === undefined || g.legacy.runs >= s.fromRun)
    && (s.behind === undefined || !(s.behind in g.goblins)));
/** Ground that exists in THIS run at all — the valley's own extent. */
export const inValley = (g: City): Site[] =>
  SITES.filter((s) => s.fromRun === undefined || g.legacy.runs >= s.fromRun);

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

/** ★★★ EVERY JOB IN THE VALLEY — 2026-08-11 (chad-liquidity). Working slots
 *  across every site the town can actually reach, plus the gates it is
 *  holding. */
export const jobsOf = (g: City): number => {
  const comp = component(g);
  let n = 0;
  for (const id of comp) {
    if (id === 0) continue;
    n += CREW * (g.stacks[id] ?? 0);
  }
  return n;
};
/** ★★★ WHERE GROWTH ACTUALLY STOPS. The huts' room, or the number of JOBS,
 *  whichever is smaller.
 *
 *  Bunks alone was a trap the player could buy: past the last working slot a
 *  hut bought a mouth and no hands at all — 12 huts is 290 planks for 16
 *  people eating 0.8 food a second and producing nothing, which is a
 *  *strictly negative* purchase and a famine you paid for. The town now
 *  grows to the work it has, and the way to want more people is to open more
 *  ground — which is the same answer as everything else in this pass. */
export const roomToGrow = (g: City): number =>
  Math.min(popCap(g), Math.max(WILD_FED, jobsOf(g) + CAMP_ROOM));

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

/** ★★★ THE SKILLS — 2026-08-16. One per thing you can spend a life doing in
 *  this valley, and no more: a skill nobody can name the source of is a
 *  number pretending to be progression. */
export const SKILLS = ['quarrying', 'forestry', 'milling', 'farming', 'war'] as const;
export type Skill = typeof SKILLS[number];

/** What each works trains. The war is trained by fighting, not by a works. */
export const TRAINS: Record<Kind, Skill | null> = {
  quarry: 'quarrying', lumber: 'forestry', sawmill: 'milling',
  farm: 'farming', hut: null,
};

/** ★ XP PER UNIT OF GOOD PRODUCED. One, exactly — so the number a player sees
 *  climbing IS the stone they dug, and the ladder can be reasoned about with
 *  no conversion in the way. */
export const XP_PER_GOOD = 1;
/** ★ XP FOR TAKING A HOLDING. A fight is rare and dear; it pays like it. */
export const XP_PER_FIGHT = 120;

/** ★★★ THE LADDER, and it is deliberately steep at the start and generous
 *  after. `xp` for level n is `LEVEL_BASE * n^LEVEL_POW`, which puts level 2
 *  inside the first minute of a single quarry (so the mechanic ANNOUNCES
 *  itself while you are still learning the board) and level 10 a long way
 *  out. ⚠️ NOT RuneScape's own curve: that one is tuned for thousands of
 *  hours and this valley ends at ~200 people. */
/** ⚠️ 40 UNTIL IT WAS MEASURED. One quarry, staffed and roaded, earns 36 xp
 *  in its first minute — so 40 put the second level just past the minute the
 *  design claims it inside, which would have shipped as a mechanic nobody
 *  noticed announcing itself. 30 lands it at ~50s. The number came off the
 *  engine, not off a guess; `test/skills.test.ts` re-measures it. */
export const LEVEL_BASE = 30;
export const LEVEL_POW = 1.7;

/** What level this much experience is worth. Level 1 from the first moment —
 *  a town that cannot dig at all is not a town. */
export const levelOf = (xp: number): number =>
  Math.max(1, Math.floor((Math.max(0, xp) / LEVEL_BASE) ** (1 / LEVEL_POW)) + 1);

/** The xp the NEXT level wants, so a bar can be drawn honestly. */
export const nextAt = (level: number): number =>
  Math.ceil(LEVEL_BASE * level ** LEVEL_POW);

/** This town's level in a skill. */
export const skillOf = (g: City, s: Skill): number => levelOf(g.xp[s] ?? 0);

/** ★★★ WHAT A LEVEL IS WORTH AT THE WORKFACE — 4% a level, compounding
 *  against nothing (it is linear). Ten levels of quarrying is a quarry and a
 *  third, which is felt over a session and cannot run away over a valley.
 *  ⚠️ THE ONE NUMBER TO BE CAREFUL WITH. This multiplies EVERY works of its
 *  kind, so it is the closest thing in this game to a compounding curve;
 *  `chad-liquidity` should see any change to it. */
export const SKILL_GAIN = 0.04;
export const skillBonus = (g: City, k: Kind): number => {
  const s = TRAINS[k];
  return s === null ? 1 : 1 + (skillOf(g, s) - 1) * SKILL_GAIN;
};

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
  /** ★ F7: per-edge traffic split by direction, so a road carrying logs one
   *  way and planks the other is drawn as two streams rather than as one
   *  cancelled-out still road. */
  both: Map<string, { ab: number; ba: number }>;
  /** ★ N6: what each direction is mostly carrying, or null. */
  goods: Map<string, { ab: Good | null; ba: Good | null }>;
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
  // ★★★ ONE WORKS, BUT NOT ONE CREW (2026-08-11). The owner asked for both
  // halves and only the first shipped at first: *"we should limit the number
  // to one per location. And then we should allow to add more people there."*
  // A works holds CREW hands.
  // ⚠️ `stacks`, NOT a bare 1. In play a site holds one works, so
  // the two read the same — but every save written before today has two,
  // three and four works standing, and reading only the first would have
  // quietly halved a grown town's workforce on load. It also keeps every
  // fixture that predates the cap meaning what it meant.
  const capOf = (id: number): number =>
    CREW * (g.stacks[id] ?? 0);
  const hands = new Map<number, number>();
  // ★ ONLY THE HOUSED WORK — see `housed()`. Everyone past the huts' cap is
  // a mouth without a bunk, and a hand that has nowhere to sleep does not
  // turn up. They still eat: `hunger()` reads the whole population.
  // the valley that guards itself makes less, which is the entire trade.
  // ★★★ AND NOR ARE THE LEVIED OR THE HURT (2026-08-11). Standing watch was
  // already a job; marching out is another, and mending is a third. This is
  // the line that makes a fight cost the ECONOMY rather than just the hero:
  // the bodies you took to the war are bodies not at a workface, and the
  // ones carried home stay off it until they mend.
  let pool = Math.max(0, housed(g)
    - (g.fight ? (g.fight.us ?? []).length : 0) - Math.floor(g.hurt));
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
    // ★ A WOOD CAMP WITH SAWPITS saws where it felled — see `case 'burn'`.
    // At `KILN_SHARE` of the felling rate, because sawing in the open makes
    // less than a mill does, and because a free conversion is not a choice.
    const kilning = st.allows === 'lumber' && sawsHere(g, id);
    const base = (st.allows === 'quarry' ? RATE.quarry
      : kilning ? RATE.lumber * KILN_SHARE
      : st.allows === 'lumber' ? RATE.lumber
      : st.allows === 'farm' ? RATE.farm : RATE.sawmill)
      // ★ THE GROUND ITSELF, not just how many hands stand on it.
      * richOf(id)
      // ★★★ AND WHAT THE TOWN HAS LEARNED BY DOING IT (2026-08-16). The
      // blueprint multipliers that used to sit here were cut the day before
      // — they were a choice between three numbers. This one is not chosen.
      * skillBonus(g, st.allows);
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
    // ★ A KILNED WOOD CAMP SHIPS PLANKS, NOT LOGS (2026-08-11) — so it walks
    // to the CAMP like every other finished good, not to a mill. That is the
    // routing decision the kiln buys: planks at the source need no road to a
    // mill, and a wood camp sawing is a wood camp not feeding the mill you
    // already built.
    const raw = SITE.get(id)!.allows;
    // ★ A SAWING CAMP'S PLANKS walk to the CAMP like any finished good,
    // never to a mill — they are already sawn.
    const burning = raw === 'lumber' && sawsHere(g, id);
    const k: Kind = raw;
    if (raw === 'sawmill' || m <= 0) continue;
    flows.push({
      id, rate: m, kind: k,
      legs: k === 'lumber' && !burning && mills.length
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
  /** Per-edge traffic, kept apart by direction — see F7 below. */
  const both = new Map<string, { ab: number; ba: number }>();
  /** ★★★ N6, 2026-08-11 — WHAT each direction is mostly carrying. The owner:
   *  *"the icons for the dots that go from the production side to the storage
   *  could be representing what's being actually transferred… at the moment
   *  it looks like conveyor belts, while it's not."* A porter carrying a
   *  colourless dot is a conveyor belt; a porter carrying STONE is a person
   *  with a load. Dominant good per direction, so a mixed road shows what
   *  most of it is. */
  const goods = new Map<string, { ab: Partial<Record<Good, number>>;
    ba: Partial<Record<Good, number>> }>();
  const carrying = (e: string, d: number, good: Good, n: number): void => {
    const at = goods.get(e) ?? { ab: {}, ba: {} };
    const side = d >= 0 ? at.ab : at.ba;
    side[good] = (side[good] ?? 0) + n;
    goods.set(e, at);
  };
  /** Signed load per edge — the net decides which way the carriers walk. */
  const net = new Map<string, number>();
  let stone = 0;
  let food = 0;
  let logsIn = 0;
  /** Planks arriving already sawn, from wood camps with sawpits. */
  let sawnHere = 0;
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
      // ★★★ F7, 2026-08-11 — BOTH WAYS, KEPT APART. The owner: *"I could see
      // something was going from the camp to River Bend and not the other
      // way around. In actuality lumber was going one way and planks the
      // other. It was only showing one way."* `net` cancels: a road carrying
      // one east and one west nets to ZERO and drew as a still road. This
      // keeps the two directions separate so the board can draw both.
      const way = both.get(e) ?? { ab: 0, ba: 0 };
      if (d >= 0) way.ab += got; else way.ba += got;
      both.set(e, way);
      carrying(e, d, GOOD_OF[f.kind], got);
    }
    carried.set(f.id, got);
    if (f.kind === 'quarry') stone += got;
    else if (f.kind === 'farm') food += got;
    // ★ A SAWING CAMP SENDS PLANKS, which never enter the mill's log pool.
    else if (sawsHere(g, f.id)) sawnHere += got;
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
        // ★★★ F7 (2026-08-11) — AND THE PLANKS COMING HOME. This second
        // delivery pass, the mill's own, was recording `loads` and `net` and
        // NOT `both`, so a road carrying logs out and planks back reported
        // traffic in one direction only — which is precisely what the owner
        // saw: *"lumber was going one way and planks the other. It was only
        // showing one way."* Missing it here made the fix look like it did
        // not work at all, on the exact road they were looking at.
        const way = both.get(e) ?? { ab: 0, ba: 0 };
        if (d >= 0) way.ab += got; else way.ba += got;
        both.set(e, way);
        carrying(e, d, 'planks', got);
      }
      carried.set(id, got);
      planks += got;
    }
  }

  return { stone, food, sawnHere, logsIn, planks, millCap, sawing,
    made, carried, choked, loads, net, both,
    goods: new Map([...goods].map(([e, at]) => [e, {
      ab: topGood(at.ab), ba: topGood(at.ba),
    }])) };
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
    loads, net, both, goods } = run;

  // The net decides the walk: a path where logs out and planks back
  // cancel exactly shows nobody, which is honest.
  const dirs = new Map<string, number>();
  for (const [e, n] of net) if (Math.abs(n) > 1e-9) dirs.set(e, n > 0 ? 1 : -1);


  return { stone, logs: logsIn, planks, food,
    starving, logsIn, millCap,
    sawing, hands, made: run.made, carried, choked, loads, dirs, both, goods,
    staff, comp };
}

/** Why the next copy cannot be raised here, in plain words, or null. */
export function unraisable(g: City, id: number): string | null {
  const s = SITE.get(id);
  if (!s) return 'Nothing can be built here.';
  // ★★★ A REFUSAL, IN WORDS — 2026-08-11. It used to read `☠12`, formatted
  // exactly like a price, and the owner read it as one: *"Some actions cost
  // skulls. I don't quite understand that."* Nothing in this game has ever
  // cost a skull. It is goblins standing on the ground, and how many.
  if (g.goblins[id]) return `Goblins hold it, ${MARK.danger}${Math.ceil(g.goblins[id])} strong.`;
  // ★ THE PATH COMES FIRST — the owner: *"it's weird that i can build
  // something before there's a path to that spot."* No works on ground
  // the town cannot reach.
  if (id !== 0 && !component(g).has(id)) return 'No road reaches here. Lay one from a place you hold.';
  // ★ ONE HAMMER PER SITE, the same ruling `unlayable` makes about spades.
  // It is also what keeps the price honest: with a job in flight `stacks`
  // has not moved yet, so a second order would buy copy #n twice.
  // ★ F5, 2026-08-11 — the owner: *"why does it say already raising when the
  // building is already being built? It is being built, not being raised."*
  // `raising` is this file's word for the job; it was never the player's.
  if (g.raising[id]) return 'Already building here.';
  // ★ ONE WORKS PER SITE (2026-08-11), UNTIL THE TRADE EARNS ANOTHER
  // (2026-08-16) — see `worksMax`. More output means more ground, or a
  // better-practised trade; never just more money.
  if (id !== 0 && (g.stacks[id] ?? 0) >= worksMax(g, s.allows)) {
    const t = TRAINS[s.allows];
    if (t === null) return 'One building per place. Add people to it instead.';
    // ★ AT THE CEILING THERE IS NO DOOR LEFT, and saying "quarrying 19" when
    // no level will ever open it would be a lie with a number on it.
    if (worksMax(g, s.allows) >= WORKS_CAP) {
      return `Three is as deep as ${t} goes. Take more ground.`;
    }
    const need = (worksMax(g, s.allows) - WORKS_MAX + 1) * WORKS_PER_LEVEL + 1;
    return `${t} ${need} builds another here. You are ${skillOf(g, t)}.`;
  }
  return shortOf(g, costOf(s.allows, g.stacks[id] ?? 0));
}

/** Why this path cannot be laid or widened, in plain words, or null. */
export function unlayable(g: City, a: number, b: number): string | null {
  const A = SITE.get(a);
  const B = SITE.get(b);
  if (!A || !B || !A.near.includes(b)) return 'These two places do not connect.';
  if (g.goblins[a] || g.goblins[b]) {
    // ★ Same again: a refusal, not a price. See `unraisable`.
    return `Goblins hold it, ${MARK.danger}${Math.ceil(g.goblins[a] ?? g.goblins[b]!)} strong.`;
  }
  if (g.laying[pathKey(a, b)]) return 'Already laying this road.';
  const gauge = g.paths[pathKey(a, b)] ?? 0;
  if (gauge >= MAX_GAUGE) return 'This road is already built.';
  if (gauge === 0) {
    const comp = component(g);
    if (!comp.has(a) && !comp.has(b)) return 'Neither end joins your roads. Start from the camp.';
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
    return 'Nothing travels this road.';
  }
  const price = pathCostOf(gauge);
  if (g.stone < price) return outOf('stone', g.stone, price);
  return null;
}

/** Why the hero cannot be sent at this ground, in plain words, or null. */
export function unassailable(g: City, id: number): string | null {
  if (!g.goblins[id]) return 'No goblins here.';
  if (g.fight) return 'The hero is already in a fight.';
  // ★ YOU HAVE TO BE THERE. A fight is a place now, not a screen.
  if (g.hero.trip) return `${MARK.time}${Math.ceil(g.hero.trip.left)}s`;
  if (g.hero.at !== id) return 'The hero is not here. March here first.';
  if (g.hero.hp < heroMax(g)) return `The hero is hurt: ${g.hero.hp} of ${heroMax(g)}. Wait, or feed them.`;
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
  /** ★ Answer what the hero met on a foray — N5, 2026-08-11. */
  | { type: 'answer'; way: 0 | 1 }
  /** ★ Spend food on the hero's health, outside a fight (2026-08-11). */
  | { type: 'eat' }
  /** ★ Switch a wood camp between hauling logs out and sawing its own
   *  planks — the Sawpits blueprint (2026-08-11, repurposed 2026-08-15). */
  | { type: 'burn'; id: number }
  /** ★ Set how many townsfolk march with the hero (2026-08-11). */
  | { type: 'levy'; by: number }
  /** ★ Post or unpost a defender at a site (2026-08-11). */
  /** Set the hero walking to a site. Held ground starts a fight on arrival. */
  | { type: 'march'; to: number }
  /** Send the hero at held ground — the battle strip opens. */
  | { type: 'assail'; id: number }
  // ★★ THE THREE ORDERS take BLOW_SECS to land — they are CALLED here and
  // the tick resolves them. One in flight at a time.
  /** ★ Sweep every standing square for a share each — 2026-08-11. */
  | { type: 'sweep' }
  /** ★ Volley over the wall into the squares behind it (blueprint). */
  | { type: 'volley' }
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
/** ★★★ WHAT THE LINE WILL BITE FOR, if you let the answer land — 2026-08-11.
 *  The owner, watching a swing resolve: *"If it takes time, then something
 *  happens. Something fun should happen during that time, which it takes."*
 *  The wait was a number counting down and nothing else. Now the strip spends
 *  it telling you what is coming back, so the second you are waiting is a
 *  second you are reading the line rather than watching a clock. */
export function answerBite(g: City): number {
  const f = g.fight;
  if (!f) return 0;
  return f.sq.reduce((n, q) => n + (q.hp > 0 ? q.poke : 0), 0)
    * (windup(f.round) ? 2 : 1);
}

function answered(g: City, f: NonNullable<City['fight']>,
  blocked: boolean): City {
  let bite = blocked ? 0
    : f.sq.reduce((n, q) => n + (q.hp > 0 ? q.poke : 0), 0)
      * (windup(f.round) ? 2 : 1);

  // ★★★ THE LEVY STANDS IN FRONT — 2026-08-11, and this is the whole of the
  // rank mechanic. The answer falls on the townsfolk first, in order, and
  // only reaches the hero once every one of them is down. That is what makes
  // bringing bodies a real decision rather than a damage bonus: they are not
  // extra swings, they are the reason the hero is still standing on round
  // nine. (Darkest Dungeon's ranks, reduced to the one rule a phone can
  // draw.)
  //
  // ⚠️ THEY DO NOT DIE. A square that falls is somebody carried home hurt —
  // out of the workforce for `MEND_SECS`, then back at a workface. The cost
  // of a war is measured in hands, which is the currency the town already
  // feels, and it needs no roster, no names and no graveyard.
  // ⚠️ `?? []` — a save written mid-fight before the levy existed has no
  // line of its own, and so does every fixture that builds a fight by hand.
  // An undefined levy is an empty one: the hero takes the answer, exactly as
  // they always did.
  const us = (f.us ?? []).map((u) => ({ ...u }));
  let felled = 0;
  /** Who went down this round, by name — see `folkName`. */
  const fell: string[] = [];
  for (const u of us) {
    if (bite <= 0) break;
    if (u.hp <= 0) continue;
    const took = Math.min(u.hp, bite);
    u.hp -= took;
    bite -= took;
    if (u.hp <= 0) {
      felled += 1;
      // ★ WHO went down — see `folkName`. Cosmetic, never a number.
      fell.push(folkName(f.site, us.indexOf(u), g.taken));
    }
  }
  const hurt = g.hurt + felled;

  const hp = g.hero.hp - bite;
  if (hp <= 0) {
    const left = f.sq.reduce((n, q) => n + Math.max(0, q.hp), 0);
    // ⚠️ THE LEVY COMES HOME TOO when the hero goes down — hurt, not lost.
    const home = us.filter((u) => u.hp > 0).length;
    return { ...g, goblins: { ...g.goblins, [f.site]: left },
      hero: { ...g.hero, hp: 0 }, fight: null, hurt,
      log: logged(g.log, felled > 0
        ? `The hero fell at ${SITE.get(f.site)?.name ?? 'the fight'}. ${felled} came home hurt, ${home} unhurt.`
        : `The hero fell at ${SITE.get(f.site)?.name ?? 'the fight'}.`) };
  }
  return { ...g, hero: { ...g.hero, hp }, hurt,
    log: fell.length === 0 ? g.log
      : logged(g.log, fell.length === 1
        ? `${fell[0]} went down at ${SITE.get(f.site)?.name ?? 'the fight'} and was carried home.`
        : `${fell.slice(0, -1).join(', ')} and ${fell.at(-1)} were carried home from ${SITE.get(f.site)?.name ?? 'the fight'}.`),
    fight: { ...f, us, round: f.round + 1 } };
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
  // ★★ VOLLEY (blueprint) — over the wall and into the squares BEHIND it, at
  // full weight. The wall is the thing you cannot get past; this is the card
  // that says otherwise, and it is why the runt-heavy holdings stop being the
  // same fight as the wall-heavy ones.
  if (f.blow.act === 'volley') {
    const rear = now.sq.map((q, i) =>
      i > 0 && q.hp > 0 ? { ...q, hp: Math.max(0, q.hp - heroHit(g)) } : q);
    if (rear.every((q) => q.hp <= 0)) return liberate(g, now);
    return answered(g, { ...now, sq: rear }, false);
  }
  // ★★ A SWEEP FALLS ON EVERYTHING STANDING, for a share each.
  if (f.blow.act === 'sweep') {
    const hit = Math.max(1, Math.floor(heroHit(g) * SWEEP_SHARE));
    const swept = now.sq.map((q) =>
      q.hp > 0 ? { ...q, hp: Math.max(0, q.hp - hit) } : q);
    if (swept.every((q) => q.hp <= 0)) return liberate(g, now);
    return answered(g, { ...now, sq: swept }, false);
  }
  // ★★ Your blow falls on the TARGET (or the first square standing, if the
  // target fell while the swing was in the air). Deterministic — no dice;
  // whether you can win was decided by the town that armed you.
  const at = (now.sq[now.target]?.hp ?? 0) > 0
    ? now.target : now.sq.findIndex((q) => q.hp > 0);
  if (at < 0) return { ...g, fight: now };
  const sq = now.sq.map((q, i) =>
    i === at ? { ...q, hp: Math.max(0, q.hp - heroHit(g)) } : q);
  if (sq.every((q) => q.hp <= 0)) return liberate(g, now);
  return answered(g, { ...now, sq, target: at }, false);
}

/** ★ LIBERATED: the ground joins the town, hurt and all — and two captives
 *  walk home with the hero, hungry and ready to work. (Lifted out of the
 *  strike on 2026-08-11 so a sweep can finish a fight too.) */
function liberate(g: City, now: NonNullable<City['fight']>): City {
  const goblins = { ...g.goblins };
  delete goblins[now.site];
  const menace = { ...g.menace };
  delete menace[now.site];
  const grown = { ...g, taken: g.taken + 1 };
  // ★ THE REWARD FOR THE GROUND, decided before the record is written so the
  // log line can name it in the same breath as the taking.
  const won = nextBoon(grown);
  const b = won === null ? null : BOONS.find((x) => x.id === won) ?? null;
  return { ...g, goblins, menace, fight: null, pop: g.pop + CAPTIVES,
    taken: g.taken + 1,
    // ★★★ AND THE WAR IS A SKILL TOO (brief item 2). Trained the only way it
    // can be — by winning ground. It is the one skill with no works, so it
    // is paid in a lump rather than by the second.
    xp: { ...g.xp, war: (g.xp.war ?? 0) + XP_PER_FIGHT },
    // ★★★ AND THE BLUEPRINT IS SIMPLY HANDED OVER (2026-08-15). It used to
    // deal three and wait; see `nextBoon` for why a deck of three cannot.
    boons: won === null ? grown.boons : [...grown.boons, won],
    log: logged(g.log,
      `${SITE.get(now.site)?.name ?? 'Ground'} is taken. Two captives walk home with the hero.`
      + (b === null ? '' : ` ${b.name}: ${b.what}.`)) };
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
      /** ★ WHAT HAPPENED THIS TICK, for the log (N2, 2026-08-11). Declared
       *  at the very top of the step because everything in it can speak —
       *  the growth block runs long before the raids do. */
      const said: string[] = [];
      if (!(a.secs > 0) || g.lost) return g;
      const s = a.secs;
      // ★ THE VALLEY'S OWN CLOCK (N3). Away ticks count too — the camps do not
      // wait politely for you to look, and this is the one pressure in the
      // game that is allowed to build while you are gone. It never TAKES
      // anything (that is still the raids' job, and they still bank), so
      // `docs/BRIEF.md` holds: you come back to a harder valley, never a
      // poorer one.
      const since = g.since + s;
      let meet = g.meet;
      // ★ THE HURT MEND. A whole person back at work every `MEND_SECS`, so a
      // hard fight is a dent in production that fills itself in — the war's
      // cost is time, not lives.
      let hurt = g.hurt;
      if (hurt > 0) {
        hurt = Math.max(0, hurt - s / MEND_SECS);
        if (hurt < 1e-9) hurt = 0;
      }
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
      // ★★★ SETTLERS COME FOR A SURPLUS, NOT A LARDER — 2026-08-11, and this
      // is the fix for the dead end the owner played into: *"People are
      // starving… I think at this point, I'm not able to stop starving. There
      // is no way."*
      //
      // Growth used to ask only whether there was food IN THE STORE. So a
      // town with a full larder and no fields kept taking settlers until the
      // larder ran out, at which point it was too big to feed and there was
      // no lever left — every farmable site already held its one farm, and
      // the only deed on offer (hiring) cost food. The overshoot was built in.
      //
      // Growth now asks whether the town makes MORE bread than it eats. A
      // town living off its stores stops growing, which means it can never
      // grow itself into a famine it cannot leave.
      // ⚠️ NOT A PURE SURPLUS GATE. Requiring a surplus outright deadlocks
      // the opening: a fresh valley has no fields at all, so the town would
      // stall at the wild's table with no hands to quarry the stone that buys
      // the spears that take the first field. It grows on a HEALTHY STORE or
      // a surplus — and stops once the larder is running down, which is the
      // overshoot that built the dead end.
      const surplus = f.food - hunger(g);
      const stocked = g.food > roomOf(g) * GROW_STORE;
      const fed = pop < WILD_FED || surplus > 0 || stocked;
      if (pop < roomToGrow(g) && fed) {
        popPart += s / GROW_SECS;
        const grown = Math.floor(popPart);
        // ⚠️ THE WILD'S TABLE IS A CEILING WITHIN THE STEP TOO (review
        // finding). A long tick used to bank several settlers at once off a
        // single `fed` reading taken at second zero — so a breadless town
        // sailed straight past the six the wild feeds, and the food artery
        // the whole mid-game is built on simply did not bite when the game
        // was in a pocket. Growth stops AT the table until there is bread.
        const room = surplus > 0 || stocked
          ? roomToGrow(g) : Math.max(pop, WILD_FED);
        pop = Math.min(room, pop + grown);
        popPart -= grown;
      } else {
        popPart = 0;
      }
      // ★★★ AND THEY LEAVE A TOWN THAT CANNOT FEED THEM. Only once the famine
      // is DEEP — a short pinch is a squeeze to manage, not a rout — and never
      // below the wild's table, because the valley itself feeds that many.
      if (g.famine >= FAMINE_DEEP && pop > WILD_FED) {
        popPart -= s / LEAVE_SECS;
        while (popPart < 0 && pop > WILD_FED) {
          pop -= 1;
          popPart += 1;
          said.push('Someone gave up on the valley and walked out.');
        }
        if (pop <= WILD_FED) popPart = Math.max(0, popPart);
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
        // ★★★ THE CEILING RISES WITH THE CLOCK (N3) — see `spawnOf`. A camp
        // you leave alone does not merely heal back to where it was, it gets
        // bigger, which is what makes waiting cost something.
        const spawn = GOBLINS[id] ? spawnOf(g, id) : left;
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
      // ★★ THE MARCH. It banks like every other timer and lands on an away
      // tick — walking is work you are owed, not a threat held over you.
      // Arriving on held ground starts the fight, which is why a march is
      // the only way a fight ever begins.
      let arrived: number | null = null;
      /** Where the hero was caught on the road this tick, for the board. */
      let ambushed: number | null = null;
      // ★ The storehouse lands like every other hammer — on an away tick too.
      let store = g.store;
      let stowing = g.stowing;
      if (stowing) {
        const left = stowing.left - s;
        if (left > 0) stowing = { ...stowing, left };
        else { stowing = null; store = store + 1; said.push('A storehouse stands.'); }
      }
      // The previous mark ages out; a fresh ambush below replaces it.
      let ambush = g.ambush === null ? null
        : g.ambush.left - s > 0 ? { ...g.ambush, left: g.ambush.left - s } : null;
      if (hero.trip) {
        const left = hero.trip.left - s;
        if (left > 0) hero = { ...hero, trip: { ...hero.trip, left } };
        else {
          arrived = hero.trip.to;
          hero = { ...hero, at: arrived, trip: null };
          said.push(`The hero reached ${SITE.get(arrived)?.name ?? 'the ground'}.`);
        }
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
        else {
          loot = has(g, 'forager')
            ? Object.fromEntries(Object.entries(nextForay(g).loot)
              .map(([k, v]) => [k, (v ?? 0) * 2]))
            : nextForay(g).loot;
          forays = g.forays + 1;
          forage = null;
          said.push(`The hero came back from ${nextForay(g).name.toLowerCase()}.`);
          // ★ N5: every other foray turns something up. It waits.
          const m = meetFor(forays);
          if (m !== null && g.meet === null) meet = m;
        }
      }
      let lost: boolean = g.lost;
      // ⚠️ ONE HERO, ONE GATE. Read once before any raid resolves, and SPENT
      // by the first one turned away — otherwise a single idle hero repelled
      // every holding on the map at once and the war became free, which is
      // the mechanic deleting itself. Three raiders means one is stopped and
      // two get through; the defence is real, and it is not a wall.
      let watch = onWatch(g);
      if (!a.away) {
        for (const id of able) {
          if ((menace[id] ?? 0) < 1) continue;
          const t = raidTarget({ ...g, stacks, goblins }, id);
          if (t === null) continue;
          if (menace === g.menace) menace = { ...g.menace };
          menace[id] = 0;
          // ★★★ THE HERO TURNS IT AWAY. Standing watch costs the foray and
          // the march, which is the price: you cannot loot, take ground and
          // hold the walls with one person. A repelled raid BLEEDS the
          // holding, so defending is also slow progress toward taking it.
          // ★★★ ONLY WHERE THEY STAND. The watch used to be a boolean over
          // the whole valley; the owner chose positional, so a raid is turned
          // away only if the hero is on the ground it is coming for.
          // ★★★ AMBUSH ON THE ROAD — step 4 of `docs/RAIDS.md`, built last
          // because it is the one that can feel unfair and wanted the other
          // three on screen first. A raid whose target sits at either end of
          // the road the hero is walking CATCHES THEM IN THE OPEN: they take
          // the bite with no guard and no aim, the holding is not bled, and
          // the raid lands anyway. This is the cost of marching through a
          // war, and it is what makes keeping the hero home a real sacrifice
          // rather than the obvious default.
          // ⚠️ It cannot kill on its own — a walk that ends the run with no
          // fight shown and no decision made is not a defeat a player can
          // learn from. It floors at 1 and the next raid finishes the job.
          if (hero.trip && (hero.trip.to === t || hero.at === t)) {
            hero = { ...hero,
              hp: Math.max(1, hero.hp - Math.ceil((GOBLINS[id]?.bite ?? 2) * AMBUSH_BITE)) };
            ambushed = t;
            said.push(`The hero was caught in the open near ${SITE.get(t)?.name ?? 'the road'}.`);
            if ((stacks[t] ?? 0) > 0) {
              if (stacks === g.stacks) stacks = { ...g.stacks };
              stacks[t] = stacks[t]! - 1;
              continue;
            }
            if (goblins === g.goblins) goblins = { ...goblins };
            goblins[t] = goblins[id] ?? GOBLINS[id]?.strength ?? 12;
            if (menace === g.menace) menace = { ...g.menace };
            menace[t] = 0;
            if (t === 0) lost = true;
            continue;
          }
          if (watch && onWatchAt(g, t)) {
            watch = false;
            said.push(`The hero met the raid at ${SITE.get(t)?.name ?? 'the gate'} and turned it back.`);
            if (goblins === g.goblins) goblins = { ...goblins };
            goblins[id] = Math.max(1, (goblins[id] ?? 1) - heroHit(g));
            hero = { ...hero, hp: Math.max(0, hero.hp - (GOBLINS[id]?.bite ?? 2)) };
            continue;
          }
          if ((stacks[t] ?? 0) > 0) {
            if (stacks === g.stacks) stacks = { ...g.stacks };
            stacks[t] = stacks[t]! - 1;
            said.push(`Goblins raided ${SITE.get(t)?.name ?? 'the camp'} and pulled a building down.`);
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
          said.push(t === 0
            ? 'The camp is overrun. The valley is lost.'
            : `Goblins took ${SITE.get(t)?.name ?? 'ground'} and hold it now.`);
          if (t === 0) lost = true;
        }
      }

      // ★ THE STORE IS A CEILING, and going over it is WASTE — the same
      // law the paths obey. A stock already over the cap (the store was
      // just the only thing holding it) is left alone rather than
      // confiscated; it simply cannot grow.
      const hold = (was: number, now: number): number => stow(g, was, now);
      // ★★★ THE WAGE FOR WORK DONE — 2026-08-16, brief item 2.
      // ⚠️ FROM `f.made`, WHICH IS WHAT THE WORKS PRODUCED, not from what
      // arrived at the camp. A quarry whose road is choked is still being
      // quarried in, and the crew standing there learn the same trade they
      // would have learned if the carts had kept up. Paying on ARRIVALS
      // would have made a blocked road silently stop your progression too,
      // which is a punishment nobody could see the cause of.
      let xp = g.xp;
      for (const [id, rate] of f.made) {
        const trains = TRAINS[SITE.get(id)?.allows ?? 'hut'];
        if (trains === null || rate <= 0) continue;
        if (xp === g.xp) xp = { ...g.xp };
        xp[trains] = (xp[trains] ?? 0) + rate * s * XP_PER_GOOD;
      }
      const out: City = {
        ...g,
        xp,
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
        ambush: ambushed === null ? ambush : { at: ambushed, left: AMBUSH_TELL },
        store,
        stowing,
        log: logged(g.log, ...said),
        since,
        meet,
        hurt,
        // ★ ARRIVING ON HELD GROUND DRAWS THE SWORD. Done here rather than in
        // `march` because the arrival is a tick event, and the holding's
        // strength must be read at the moment they get there — not when they
        // set out, which may have been a long walk ago.
        ...(arrived !== null && goblins[arrived]
          ? { fight: {
              site: arrived,
              sq: lineOf(goblins[arrived]!, GOBLINS[arrived]?.bite ?? 2,
                GOBLINS[arrived]?.runt ?? 0, GOBLINS[arrived]?.screen),
              target: 0, round: 0,
              packs: RATION_PACK + (has(g, 'quartermaster') ? 2 : 0),
              blow: null, us: levied(g),
            } }
          : {}),
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
      // ★ ROADWRIGHT: roads are laid in half the time.
      const secs = PATH_SECS * (gauge + 1) / (has(g, 'roadwright') ? 2 : 1);
      return {
        ...g,
        stone: g.stone - pathCostOf(gauge),
        laying: { ...g.laying, [key]: { left: secs, secs } },
      };
    }

    case 'pin': {
      // From auto, the first touch takes over at TODAY'S hands and steps
      // from there; a held works can go all the way to zero.
      // ⚠️ HIRES COUNT HERE TOO, 2026-08-11 (chad-liquidity). `flow`'s own
      // ⚠️ This must agree with `capOf`, which reads `stacks`; when the two
      // disagreed, setting a site's crew BY HAND silently lost capacity
      // silently discarded — on the one lever that let a town grow past its
      // slot count. The two must agree, and now they do.
      const cap = CREW * (g.stacks[a.id] ?? 0);
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
      // ★★ IT TAKES TIME NOW (2026-08-11). The owner: *"Storehouse builds
      // immediately for some reason without a cooldown."* Everything else in
      // the valley is ordered and waited for; a building that appears the
      // instant it is paid for reads as a different game's UI.
      if (g.stowing) return g;
      return {
        ...g,
        stone: g.stone - price.stone,
        planks: g.planks - price.planks,
        stowing: { left: STOW_SECS, secs: STOW_SECS },
      };
    }

    case 'cart': {
      // ★ LOGS TOO SINCE 2026-08-11 (chad-liquidity) — a cart now binds on
      // all three goods, so it must CHECK and SPEND all three. Pricing it in
      // logs while taking only stone and planks would have handed the player
      // free carts and left logs as dead as they were.
      const price = cartCostOf(g, g.carts);
      if (g.stone < price.stone || g.logs < price.logs
        || g.planks < price.planks) return g;
      return {
        ...g,
        stone: g.stone - price.stone,
        logs: g.logs - price.logs,
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
      // ★★★ WINNING NOW HAS AN EXIT — 2026-08-11, and two research agents
      // named this the single biggest defect in the game, independently.
      //
      // This refused unless `g.lost`. So the only way to start another valley
      // was to be beaten out of this one: a player who WON sat on a finished
      // map with nothing left to do and no button to press. *"There must be a
      // reason to play this"* — there was not one, because the game had no
      // way to be played again except by failing.
      //
      // A run ends two ways now. Lost, as before. Or WON — every holding
      // taken — and then you may found the next valley whenever you like.
      const won = holdingsLeft(g) === 0;
      if (!g.lost && !won) return g;
      const legacy = {
        runs: g.legacy.runs + 1,
        // ⚠️ WINNING CARRIES MORE THAN LOSING. Half your spears if you were
        // driven out; all of them if you took the valley. The reward for
        // finishing is that the next one starts further along, which is the
        // whole of why anyone plays a second run.
        spears: Math.max(g.legacy.spears,
          won ? g.hero.spears + 1 : Math.floor(g.hero.spears / 2) + 1),
        // ★★★ AND A WON RUN CARRIES WHAT IT LEARNED. Horizontal, never a
        // multiplier: you start the next valley KNOWING things — a palisade,
        // a volley, a road crew — which changes how it plays rather than how
        // fast the same numbers climb. A lost run keeps what it had already
        // banked and nothing new, so finishing is what buys knowledge.
        boons: won
          ? [...new Set([...g.legacy.boons, ...g.boons])]
          : [...g.legacy.boons],
      };
      const next = initial();
      return { ...next, legacy,
        // ★ A BIGGER VALLEY, not just a harder one — the far country appears
        // on the map for the first time on run two, and again on run three.
        goblins: valleyGoblins(legacy.runs),
        boons: [...legacy.boons],
        hero: { ...next.hero, spears: legacy.spears },
        log: [won
          ? `The valley is yours. You march out to found another, ${legacy.spears} spears in hand.`
          : 'You were driven out. What was left of the camp walks to new ground.'] };
    }

    case 'forage': {
      if (unforageable(g) !== null) return g;
      return { ...g, forage: { left: FORAGE_SECS, secs: FORAGE_SECS } };
    }

    // ★★ MARCHING IS THE ONLY WAY ANYWHERE NOW. `assail` still exists and
    // still starts a fight, but only from the ground itself — the UI sends a
    // march, and arriving on held ground is what draws the sword.
    case 'burn': {
      // ★★★ SAWPITS, 2026-08-11 as the Kiln, cut back to this on 2026-08-15.
      // It shipped as charcoal → tools and the charcoal was a fifth noun on a
      // bottleneck that is not variety-shaped; what was always worth keeping
      // is Against the Storm's real trick, ONE GOOD, TWO RECIPES: a wood camp
      // with sawpits saws its own planks instead of shipping logs.
      //
      // The decision is routing, not bookkeeping: planks at the source need
      // no road to a mill, but a wood camp sawing is a wood camp not feeding
      // the mill you already built. No fifth noun anywhere.
      if (!has(g, 'kiln')) return g;
      const st = SITE.get(a.id);
      if (!st || st.allows !== 'lumber' || g.goblins[a.id]) return g;
      const on = g.kilned.includes(a.id);
      return { ...g,
        kilned: on ? g.kilned.filter((x) => x !== a.id) : [...g.kilned, a.id] };
    }

    case 'levy': {
      // ★ How many townsfolk march next time. Chosen at home, spent on the
      // road: `assail` reads it when the fight opens.
      if (g.lost) return g;
      const next = Math.max(0, Math.min(levyCap(g), g.levy + a.by));
      return next === g.levy ? g : { ...g, levy: next };
    }

    case 'answer': {
      const m = g.meet === null ? null : MEETS[g.meet];
      const way = m?.ways[a.way === 1 ? 1 : 0];
      if (!m || !way) return g;
      let out: City = { ...g, meet: null,
        log: logged(g.log, way.said),
        pop: g.pop + (way.pop ?? 0),
        hero: { ...g.hero,
          hp: Math.max(1, Math.min(heroMax(g), g.hero.hp + (way.hp ?? 0))) } };
      for (const [k, v] of Object.entries(way.loot ?? {})) {
        const good = k as Good;
        out = { ...out, [good]: Math.max(0, Math.min(roomOf(out), out[good] + v)) };
      }
      return out;
    }

    case 'eat': {
      if (uneatable(g) !== null) return g;
      return { ...g, food: g.food - MEAL_FOOD,
        hero: { ...g.hero, hp: Math.min(heroMax(g), g.hero.hp + MEAL_HP) } };
    }

    case 'march': {
      if (unmarchable(g, a.to) !== null) return g;
      const secs = marchSecs(g, a.to)!;
      return { ...g, hero: { ...g.hero, trip: { to: a.to, left: secs, secs } } };
    }

    case 'assail': {
      if (unassailable(g, a.id)) return g;
      const spec = GOBLINS[a.id];
      return { ...g, fight: {
        site: a.id,
        sq: lineOf(g.goblins[a.id] ?? 0, spec?.bite ?? 2, spec?.runt ?? 0, spec?.screen),
        target: 0,
        round: 0,
        // ★ QUARTERMASTER: two more rations a sortie.
        packs: RATION_PACK + (has(g, 'quartermaster') ? 2 : 0),
        us: levied(g),
        blow: null,
      } };
    }

    // ★★★ THE THREE ORDERS. Each one is CALLED here and LANDS on the tick
    // BLOW_SECS later — see `order`, `lands`, and BLOW_SECS for why.
    case 'strike':
    case 'guard':
    case 'ration':
    case 'sweep':
    case 'volley':
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
