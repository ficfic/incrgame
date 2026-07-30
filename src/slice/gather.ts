// GATHERING — the RuneScape half. You stand somewhere, you do a thing over and
// over, materials pile up, the level climbs, better ground opens.
//
// > *"do lots of agents on incremental part then, skills, fishing and such
// > bullshit"* — the owner, 2026-07-30
//
// Pure data plus pure functions. No DOM, no clock, no `Math.random()` — every
// roll comes from `dice.ts` and the caller threads the seed. This module does
// not touch `Slice`, does not reduce, and does not know the UI exists; the
// orchestrator wires it in (see WIRING at the foot of the file).
//
// ---------------------------------------------------------------------------
// THE THREE RULES THIS MODULE IS BUILT ON
//
// **1 · The clock pays the XP. The dice pay the haul.**
//   XP per attempt is `node.xp × odds(level, demand) × fade`. It is a function
//   of your level and the node, NOT of the roll — so a failed attempt still
//   pays its share (failure is never a loss, `BRIEF.md`), and eight hours of
//   absence can be settled with arithmetic and zero rolls (`DICE.md` §1: "an
//   offline catch-up consumes zero rolls"). Being paid at the ODDS rather than
//   at the OUTCOME is what lets both of those be true at once.
//
// **2 · One roll, read twice.**
//   `check(seed, level, demand)` decides IF you caught anything — the level
//   moves the target, per `DICE.md` §4. The SAME roll's *unmodified* total
//   decides WHAT — 20 is prime, 16–19 is fine, the rest is common. That is
//   `DICE.md` §6's "level picks the table, dice pick the row", and it costs one
//   generator advance, so rolls-consumed still equals rolls-resolved.
//
//   The texture falls out of it for free, and it is the good kind:
//     · badly outmatched (mod −6): 90% miss, 0% common, 9% fine, 1% prime.
//       You almost never catch anything, and when you do it is never junk.
//     · comfortably past it (mod +6, picked over): 6% miss, 79% common,
//       15% fine, 0% prime. You always catch something and it is always junk.
//   "Mostly fail and occasionally astonish" → "mostly succeed and rarely
//   astonish", from one clamp and no second dice system.
//
// **3 · A node you have outgrown is PICKED OVER, and it says so.**
//   See §FADE. This is the reason to move on, and it is a number the UI can
//   print rather than a feeling.
// ---------------------------------------------------------------------------
import { check, modifier, odds, TARGET, type Check } from './dice';
import type { SkillId } from './schema';

// ===========================================================================
// §1 · MATERIALS
// ===========================================================================

/** ⚠️ A STRING, not a union — same reasoning as `ItemId` in `schema.ts`: new
 *  lines of materials must not mean editing a shared type. */
export type MaterialId = string;

/** Which ladder a material belongs to. Three, because a gathering skill is a
 *  ladder and one ladder is a bar. */
export type GatherLine = 'water' | 'stone' | 'hush';

/** ⚠️ NO PRICES HERE, DELIBERATELY. A sibling agent owns the economy and cannot
 *  see this file. What is fixed is the `tier` — 1 is the shallows and 6 is the
 *  apex — and that is the only handle a currency or a crafting sink needs to
 *  price these without renegotiating with me. */
export interface Material {
  id: MaterialId;
  name: string;
  tier: number;
  line: GatherLine;
  /** One clause, for the inspector. Prose here is a draft for the owner. */
  note: string;
}

const M = (
  id: MaterialId, name: string, tier: number, line: GatherLine, note: string,
): Material => ({ id, name, tier, line, note });

/** ★ THE LADDER OVERLAPS ON PURPOSE. A tier-N node's PRIME row is the tier-N+1
 *  node's COMMON row: the thing that astonishes you at the weir is what you
 *  pull out of the tailrace all day. That is the RuneScape pull — you have
 *  already held the next tier in your hand before you can farm it. */
const LIST: readonly Material[] = [
  // — water: things taken out of water ————————————————————————————————
  M('silt-minnow', 'silt minnow', 1, 'water', 'thin, and there are thousands'),
  M('weir-eel', 'weir eel', 1, 'water', 'thick as a wrist, and patient'),
  M('glass-elver', 'glass elver', 2, 'water', 'you can read a page through it'),
  M('race-trout', 'race trout', 2, 'water', 'swims against the tailrace for fun'),
  M('blind-carp', 'blind carp', 3, 'water', 'no eyes; has not needed them in a while'),
  M('sump-lamprey', 'sump lamprey', 3, 'water', 'a mouth with a fish behind it'),
  M('ledger-pike', 'ledger pike', 4, 'water', 'found where the accounts went in'),
  M('paper-roach', 'paper roach', 4, 'water', 'scales that come off in sheets'),
  M('store-conger', 'store conger', 5, 'water', 'was in the store before the water was'),
  M('drowned-shad', 'drowned shad', 5, 'water', 'silver, and still cold hours later'),
  M('nine-eyed-eel', 'nine-eyed eel', 6, 'water', 'the ninth is on the underside'),

  // — stone: things broken out of ground ————————————————————————————
  M('cut-shingle', 'cut shingle', 1, 'stone', 'river-rounded, good for nothing much'),
  M('river-flint', 'river flint', 1, 'stone', 'takes an edge if you are lucky'),
  M('yard-blank', 'yard blank', 2, 'stone', 'squared once, by somebody in a hurry'),
  M('blue-grit', 'blue grit', 2, 'stone', 'sharpens anything, ruins everything'),
  M('dressed-course', 'dressed course', 3, 'stone', 'cut to fit a wall that is gone'),
  M('step-quoin', 'step quoin', 3, 'stone', 'a corner, waiting for two walls'),
  M('room-chalk', 'room chalk', 4, 'stone', 'soft enough to write the count on'),
  M('gate-nodule', 'gate nodule', 4, 'stone', 'flint in a chalk shell, like a held breath'),
  M('dead-marl', 'dead marl', 5, 'stone', 'nothing grows in it and nothing rots'),
  M('black-corestone', 'black corestone', 5, 'stone', 'the middle of something much larger'),
  M('keeper-ashlar', "keeper's ashlar", 6, 'stone', 'dressed on all six faces, including down'),

  // — hush: things that are barely there —————————————————————————————
  // ⚠️ The line that carries `BRIEF.md` ask 8. Gathering *time*, *repetition*
  // and *instructions* as if they were ore is the twist being mechanically true
  // long before anybody says it out loud.
  M('door-quiet', 'pinch of quiet', 1, 'hush', 'the room had spare'),
  M('held-breath', 'held breath', 1, 'hush', 'not yours'),
  M('drum-beat', 'kept beat', 2, 'hush', 'the drum has counted this long unattended'),
  M('slow-echo', 'slow echo', 2, 'hush', 'arrives about a second late, always'),
  M('hide-patience', 'hour of patience', 3, 'hush', 'somebody else already spent it'),
  M('unseen-hour', 'unseen hour', 3, 'hush', 'nobody watched it happen'),
  M('tallow-grain', 'grain of tallow', 4, 'hush', 'keeps a light for four minutes'),
  M('cold-wick', 'cold wick', 4, 'hush', 'has been lit and does not admit it'),
  M('same-minute', 'the same minute', 5, 'hush', 'you have had this one before'),
  M('repeated-step', 'repeated step', 5, 'hush', 'the second one, identical'),
  M('first-instruction', 'first instruction', 6, 'hush', 'shorter than you expected'),
];

export const MATERIALS: Record<MaterialId, Material> =
  Object.fromEntries(LIST.map((m) => [m.id, m]));

// ===========================================================================
// §2 · NODES
// ===========================================================================

/** A thing at a place you can work at, repeatedly, forever. */
export interface GatherNode {
  id: string;
  /** `Place.id` it sits at. Typed as a number rather than imported from
   *  `content.ts` so this module never pulls in the region files — the region
   *  authors and I are editing at the same time. A test asserts every one of
   *  these is a real place. */
  place: number;
  /** The noun on the dot. */
  name: string;
  /** The verb on the button. Always a verb. */
  verb: string;
  line: GatherLine;
  skill: SkillId;
  /** 1–5, and the tier of the COMMON row it drops. */
  tier: number;
  /** The 0–30 demand handed to `check`/`odds`. Never touches the roll. */
  demand: number;
  /** ⚠️ A HARD LEVEL GATE, AND IT IS STRUCTURALLY NECESSARY — see §OVERREACH.
   *  Always `demand − 2`, so **every node opens at exactly 55%**. */
  needs: number;
  /** One attempt, in seconds. */
  secs: number;
  /** XP at 100% odds. Actual pay is this × odds × fade — see `xpPer`. */
  xp: number;
  common: MaterialId;
  fine: MaterialId;
  /** The astonishing one, and the next tier's bread and butter. Closed while
   *  the node is picked over. */
  prime: MaterialId;
}

// §RATES — the five rungs. Everything about the curve lives in this table.
//
//   tier  demand  needs  secs   xp   attempts/h   XP/h at grade 0 (55%)
//     1      2      1     10     3      360              594
//     2      8      6     12     7      300            1,155
//     3     14     12     16    18      225            2,228
//     4     20     18     20    42      180            4,158
//     5     26     24     24    95      150            7,838
//
// `SKILLS.md` §2 sets the house rate at `600 × 1.9^(tier−1)` = 600 · 1,140 ·
// 2,166 · 4,115 · 7,819. The column above is within **3% of every one of
// them**, and it got there by choosing `xp` as `target / (attempts/h × 0.55)`
// and rounding. This module does not invent a second economy; it hits the one
// the docs already published, and durations shorten toward the shallows so an
// early tap is snappy and a late one has weight.
const RUNG = [
  { tier: 1, demand: 2, secs: 10, xp: 3 },
  { tier: 2, demand: 8, secs: 12, xp: 7 },
  { tier: 3, demand: 14, secs: 16, xp: 18 },
  { tier: 4, demand: 20, secs: 20, xp: 42 },
  { tier: 5, demand: 26, secs: 24, xp: 95 },
] as const;

/** The `needs` gate is always this far under the demand, which is what fixes it
 *  at 55%-on-entry: `modifier(d − 2, d) = trunc(−2/3) = 0`. */
export const ENTRY_GAP = 2;

const rung = (tier: number) => {
  const r = RUNG[tier - 1];
  if (!r) throw new Error(`gather: no rung for tier ${tier}`);
  return r;
};

function node(
  id: string, place: number, name: string, verb: string,
  line: GatherLine, skill: SkillId, tier: number,
  common: MaterialId, fine: MaterialId, prime: MaterialId,
): GatherNode {
  const r = rung(tier);
  return {
    id, place, name, verb, line, skill, tier,
    demand: r.demand,
    needs: Math.max(1, r.demand - ENTRY_GAP),
    secs: r.secs, xp: r.xp,
    common, fine, prime,
  };
}

/** Fifteen nodes: three lines × five rungs, sited so the tiers climb roughly
 *  as the map goes deeper — the valley is tier 1, the works and the stones are
 *  the middle, and the flooded/underground rooms are the top. Prose is a draft
 *  for the owner. */
export const NODES: readonly GatherNode[] = [
  // — water · Wayfaring. Reading water is what `wayfaring` already does at the
  //   weir ("Sound the depth"), so the line inherits a verb the game has.
  node('weir-pool', 1, 'The held water', 'Fish the held water',
    'water', 'wayfaring', 1, 'silt-minnow', 'weir-eel', 'glass-elver'),
  node('tailrace-net', 103, 'The tailrace run', 'Net the tailrace',
    'water', 'wayfaring', 2, 'glass-elver', 'race-trout', 'blind-carp'),
  node('sump-lines', 201, 'The sump', 'Set lines in the sump',
    'water', 'wayfaring', 3, 'blind-carp', 'sump-lamprey', 'ledger-pike'),
  node('ledger-pool', 206, 'The ledger pool', 'Fish the ledger pool',
    'water', 'wayfaring', 4, 'ledger-pike', 'paper-roach', 'store-conger'),
  node('drowned-dive', 105, 'The drowned store', 'Dive the drowned store',
    'water', 'wayfaring', 5, 'store-conger', 'drowned-shad', 'nine-eyed-eel'),

  // — stone · Craft. `craft` is already the cutting-and-shaping skill.
  node('cut-shingle-bed', 0, 'The shingle bed', 'Turn the stones in the cut',
    'stone', 'craft', 1, 'cut-shingle', 'river-flint', 'yard-blank'),
  node('blockyard-seam', 109, 'The blockyard seam', 'Split blanks in the yard',
    'stone', 'craft', 2, 'yard-blank', 'blue-grit', 'dressed-course'),
  node('step-quarry', 300, 'The step quarry', 'Dress stone at the steps',
    'stone', 'craft', 3, 'dressed-course', 'step-quoin', 'room-chalk'),
  node('chalk-face', 203, 'The chalk face', 'Cut chalk from the room',
    'stone', 'craft', 4, 'room-chalk', 'gate-nodule', 'dead-marl'),
  node('dead-ground-break', 309, 'The dead ground', 'Break the dead ground',
    'stone', 'craft', 5, 'dead-marl', 'black-corestone', 'keeper-ashlar'),

  // — hush · Attunement. Gathering things that are barely there. The line is
  //   the twist, mechanically, before anybody states it.
  node('door-listen', 5, 'The far wall', 'Listen at the far wall',
    'hush', 'attunement', 1, 'door-quiet', 'held-breath', 'drum-beat'),
  node('drum-wait', 107, 'The drum', 'Wait on the drum',
    'hush', 'attunement', 2, 'drum-beat', 'slow-echo', 'hide-patience'),
  node('hide-keep', 308, 'The hide', 'Keep the hide',
    'hush', 'attunement', 3, 'hide-patience', 'unseen-hour', 'tallow-grain'),
  node('tallow-draw', 210, 'The tallow room', 'Draw off the tallow',
    'hush', 'attunement', 4, 'tallow-grain', 'cold-wick', 'same-minute'),
  node('same-room-stand', 209, 'The same room', 'Stand in the same room',
    'hush', 'attunement', 5, 'same-minute', 'repeated-step', 'first-instruction'),
];

export const NODE: ReadonlyMap<string, GatherNode> =
  new Map(NODES.map((n) => [n.id, n]));

export const nodesAt = (place: number): GatherNode[] =>
  NODES.filter((n) => n.place === place);

// ===========================================================================
// §3 · FADE — the reason to move on, as a number
// ===========================================================================

/** How far past a node you are, on the dice's own scale: `modifier(level,
 *  demand)`, −6..+6. Reused rather than reinvented so there is exactly one
 *  notion of "ahead of this check" in the codebase. */
export const grade = (level: number, n: GatherNode): number =>
  modifier(level, n.demand);

/** The grade at which a node stops being worth your time. +3 means `level ≥
 *  demand + 9` — a tier and a half above it. */
export const FADE_AT = 3;

/** ★ §FADE — WHY A NODE YOU HAVE OUTGROWN PAYS WORSE, AND HOW THE PLAYER SEES IT.
 *
 *  Without this, `odds` alone would still climb (55% → 94%) as you outlevel a
 *  node, so the shallows would get quietly BETTER forever and the RuneScape
 *  loop would never start. So a node past +3 is **picked over**:
 *
 *      fade = 1 − 0.1 × (grade − 2)      →  0.9 · 0.8 · 0.7 · 0.6
 *
 *  and the **prime row closes** (§4). Both are printed by `report()`, so the UI
 *  shows "picked over, ×0.6, no prime" on the button rather than leaving the
 *  player to infer a decay from a bar that got slower.
 *
 *  What it is worth, at level 30:
 *      tier 1 node:   360/h × 3 × 0.94 × 0.6  =    609 XP/h,  0 prime/h
 *      tier 5 node:   150/h × 95 × 0.64       =  9,120 XP/h, ~1.5 prime/h
 *  **15× to move on**, and the fade is only the last 40% of it — the tier's own
 *  `xp` does most of the work. The fade is there so the shallows visibly
 *  *decline*, which is the part a player feels. */
export const fade = (level: number, n: GatherNode): number => {
  const g = grade(level, n);
  return g < FADE_AT ? 1 : 1 - 0.1 * (g - 2);
};

export const pickedOver = (level: number, n: GatherNode): boolean =>
  grade(level, n) >= FADE_AT;

/** Why you cannot work this node, in English, or null.
 *
 *  ⚠️ NEVER HIDDEN — same standing rule as `engine.blocked`. A node you cannot
 *  work yet is the reason to come back; a node that is simply absent teaches
 *  nothing. The caller may still ask `report()` for a locked node and print its
 *  odds honestly. */
export const locked = (level: number, n: GatherNode): string | null =>
  level >= n.needs ? null : `needs ${n.needs} — you are ${level}`;

// ===========================================================================
// §4 · THE ROLL
// ===========================================================================

export type Row = 'miss' | 'common' | 'fine' | 'prime';

/** The unmodified total at or above which a catch is `fine`. 16–19 is 14 of the
 *  100 outcomes; 20 alone is `prime`. Both read off the RAW total, never the
 *  modified one — `DICE.md` §6, "the loot roll takes no modifier". */
export const FINE_AT = 16;

export interface Attempt {
  seed: number;
  roll: Check;
  row: Row;
  /** null on a miss, and only on a miss. Failure costs time, never inventory. */
  got: MaterialId | null;
}

/** Which row a resolved check lands on. Split out so `chances` and `attempt`
 *  cannot drift — the exact odds shown on the button are computed by running
 *  this over all 100 outcomes, not by a formula that could be off by one. */
function rowFor(r: Check, picked: boolean): Row {
  if (!r.passed) return 'miss';
  if (r.total === 20) return picked ? 'fine' : 'prime';
  return r.total >= FINE_AT ? 'fine' : 'common';
}

/** One attempt. ONE generator advance, so rolls-consumed = rolls-resolved. */
export function attempt(seed: number, level: number, n: GatherNode): Attempt {
  const r = check(seed, level, n.demand);
  const row = rowFor(r, pickedOver(level, n));
  return {
    seed: r.seed,
    roll: r,
    row,
    got: row === 'miss' ? null : row === 'prime' ? n.prime
      : row === 'fine' ? n.fine : n.common,
  };
}

export interface Haul {
  seed: number;
  /** materialId → count. */
  got: Record<MaterialId, number>;
  rows: Row[];
}

/** Resolve `count` banked attempts in one tap. XP is NOT here — it was already
 *  paid by the clock (`bank`), and paying it twice is the classic offline
 *  double-credit bug. */
export function gather(
  seed: number, level: number, n: GatherNode, count: number,
): Haul {
  const got: Record<MaterialId, number> = {};
  const rows: Row[] = [];
  let s = seed;
  for (let i = 0; i < Math.max(0, Math.trunc(count)); i++) {
    const a = attempt(s, level, n);
    s = a.seed;
    rows.push(a.row);
    if (a.got) got[a.got] = (got[a.got] ?? 0) + 1;
  }
  return { seed: s, got, rows };
}

/** The exact chances, for showing BEFORE the tap. Enumerated over all 100
 *  outcomes for the same reason `dice.odds` is: this number is a promise to the
 *  player and a closed form is where an off-by-one hides. Sums to 1. */
export function chances(level: number, n: GatherNode): Record<Row, number> {
  const mod = modifier(level, n.demand);
  const picked = pickedOver(level, n);
  const out: Record<Row, number> = { miss: 0, common: 0, fine: 0, prime: 0 };
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      const total = a + b;
      const crit = a === 10 && b === 10 ? 'triumph'
        : a === 1 && b === 1 ? 'disaster' : null;
      const passed = crit === 'triumph' ? true
        : crit === 'disaster' ? false : total + mod >= TARGET;
      const row: Row = !passed ? 'miss'
        : total === 20 ? (picked ? 'fine' : 'prime')
        : total >= FINE_AT ? 'fine' : 'common';
      out[row] += 0.01;
    }
  }
  return out;
}

// ===========================================================================
// §5 · THE CLOCK
// ===========================================================================

/** XP for one completed attempt. ⚠️ A FUNCTION OF LEVEL AND NODE ONLY — no
 *  seed, no roll. That is what makes offline banking exact and what makes a
 *  failed attempt cost nothing but time. Fractional on purpose; round for
 *  display, never in the ledger, or the shallows lose 20% to rounding. */
export const xpPer = (level: number, n: GatherNode): number =>
  n.xp * odds(level, n.demand) * fade(level, n);

export const xpPerHour = (level: number, n: GatherNode): number =>
  (3600 / n.secs) * xpPer(level, n);

/** The best XP/hour node open to you, optionally within one line. This is what
 *  the UI needs to say "there is better ground now" without the player doing
 *  arithmetic. Ties break toward the lower tier. */
export function bestFor(level: number, line?: GatherLine): GatherNode | null {
  let best: GatherNode | null = null;
  for (const n of NODES) {
    if (line && n.line !== line) continue;
    if (locked(level, n)) continue;
    if (!best || xpPerHour(level, n) > xpPerHour(level, best)) best = n;
  }
  return best;
}

/** Job state. ⚠️ DELIBERATELY JUST A DURATION AND A COUNT — no event log, no
 *  timestamps of individual catches — so the offline catch-up a sibling agent
 *  is building can settle any absence in closed form. */
export interface GatherJob {
  node: string;
  /** Seconds remaining on the attempt in progress. */
  left: number;
  /** Completed attempts not yet rolled. Rolled on a tap, never while away. */
  owed: number;
}

/** Advance the clock. Pays XP (arithmetic) and banks hauls (unrolled).
 *
 *  Mirrors `engine.tick`'s loop in closed form: same answer, no iteration, so
 *  an eight-hour absence is one division rather than 2,880 laps. */
export function bank(
  level: number, n: GatherNode, left: number, elapsed: number,
): { done: number; left: number; xp: number } {
  if (elapsed <= 0) return { done: 0, left, xp: 0 };
  const rem = left - elapsed;
  if (rem > 0) return { done: 0, left: rem, xp: 0 };
  const done = 1 + Math.floor(-rem / n.secs);
  return { done, left: rem + done * n.secs, xp: xpPer(level, n) * done };
}

// ===========================================================================
// §6 · REPORT — everything the UI needs, as data
// ===========================================================================

/** ⚠️ NUMBERS, NOT SENTENCES. `scripts/check-vocabulary.mjs` enforces that every
 *  player-facing quantity is declared once in `src/core/readouts.ts`, and that
 *  file is not mine to edit. So this module hands the shell figures and lets it
 *  author the words. */
export interface Report {
  node: GatherNode;
  /** English, or null. Never hidden. */
  locked: string | null;
  grade: number;
  pickedOver: boolean;
  fade: number;
  odds: number;
  chances: Record<Row, number>;
  secs: number;
  xpPerAttempt: number;
  xpPerHour: number;
  /** True when a better-paying node is open to you. The nudge, computed once. */
  outgrown: boolean;
}

export function report(level: number, n: GatherNode): Report {
  const best = bestFor(level);
  return {
    node: n,
    locked: locked(level, n),
    grade: grade(level, n),
    pickedOver: pickedOver(level, n),
    fade: fade(level, n),
    odds: odds(level, n.demand),
    chances: chances(level, n),
    secs: n.secs,
    xpPerAttempt: xpPer(level, n),
    xpPerHour: xpPerHour(level, n),
    outgrown: !!best && best.id !== n.id && xpPerHour(level, best) > xpPerHour(level, n),
  };
}

// ===========================================================================
// §OVERREACH — a finding, recorded because it is not obvious
// ===========================================================================
//
// The hard `needs` gate is NOT flavour. `MOD_CAP` floors every check at 10%, so
// a node's reward can climb without bound while its difficulty cannot. Ignoring
// the gate, a **level-1** player's XP/hour by tier would be:
//
//      tier 1   594      (55%, on level)
//      tier 2   756      (36%)
//      tier 3   851      (21%)
//      tier 4   756      (10%, clamped)
//      tier 5 1,425      (10%, clamped — 2.4× the honest rate)
//
// The 10% floor that makes the dice fair is the same 10% floor that makes
// suicide-farming the deepest node the optimal opening move. No multiplier
// fixes this: past the clamp, difficulty is constant and reward is not. The
// only fix is a wall, which is what RuneScape uses and why you cannot fish
// sharks at level 1. Hence `needs = demand − 2`, every node opening at exactly
// 55%, and no profitable overreach anywhere on the table.
//
// ===========================================================================
// §HONESTY — what these rates actually cost, in hours
// ===========================================================================
//
// Playing the best node open at each level (`bestFor`), from level 1 to the
// cap, against `engine.xpForLevel(30) = 39,363`:
//
//      level  best tier   odds        XP/hour
//        1        1        55%            594
//        5        1        64%            691
//       10        2        55%          1,155
//       15        3        55%          2,228
//       20        4        55%          4,158
//       25        5        55%          7,838
//       30        5        64%          9,120
//
//      **7.9 hours of one button to take one skill from 1 to 30.**
//
// Said plainly, because `SKILLS.md` §2 budgeted ≈8 h per skill and this lands on
// it: gathering a skill to the cap is an eight-hour commitment, most of it
// banked while the phone is in a pocket. Three lines is ~24 h. That is the deal.
//
// ⚠️ **AND THE ONE THING THIS MODULE DOES NOT FIX.** A reviewer measured
// tap-spamming a travel check at **22,572 XP/hour** against the timer's 5,400.
// Gathering tops out at 9,120. **It still loses.** The exploit is not in the
// rates — it is `engine.travel` paying a flat 20/8 XP with no cooldown and no
// per-edge limit, and that is a file I do not own. Until travel XP is capped or
// rate-limited, the optimal play is still to never start a job, and no number in
// this table changes that. Flagged, not hidden.
//
// ===========================================================================
// §WIRING — what the orchestrator has to do
// ===========================================================================
//
//  1. `Slice.job` becomes (or gains) a `GatherJob { node, left, owed }`. On the
//     `work` action for a gathering node: reject if `locked(level, n)`, else
//     start it with `left = n.secs, owed = 0`.
//  2. In `tick`: `const b = bank(level, n, job.left, secs)` → add `b.xp` to
//     `xp[n.skill]`, `job.left = b.left`, `job.owed += b.done`. No `check` call.
//     The same line serves the live screen and the offline catch-up.
//  3. A new `haul` action (the player's tap): `gather(state.seed, level, n,
//     job.owed)` → merge `got` into a new `Slice.materials: Record<MaterialId,
//     number>`, store the returned `seed`, set `owed = 0`. This is the only
//     place the generator advances, which keeps `DICE.md` §1's "an offline
//     catch-up consumes zero rolls" true.
//  4. Materials are NOT `ITEMS` — a separate registry with a separate counter,
//     because a pack item is a unique key and a material is a stack. Do not
//     merge them into `Slice.pack`.
//  5. `report(level, n)` is everything the button needs. Nothing else in this
//     module is meant to be called from a component.
