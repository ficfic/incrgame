// THE OBOL — the currency, the sinks, and the only rate in this game that grows.
//
// ---- The defect this module exists to fix ---------------------------------
//
// A reviewer, correctly: *"Nothing to spend anything on, and the rate never
// grows. No currency exists — grep for 'obol' in `src/` hits zero. Costs are
// `200 × 1.2^(L−1)`; the payout is a flat constant per work node, and later
// regions pay LESS per hour. That is a geometric slowdown with a negative rate
// curve. That is not an incremental, it is a treadmill running backwards."*
//
// Both halves are real and they are different bugs:
//
//   1. NO SINK. `engine.ts` pays XP and satchels. XP buys levels, levels open
//      doors, and that is the whole loop — there is no number you choose what
//      to do with, so there is no decision in the idle half of the game.
//   2. NO RATE CURVE. `xpForLevel` is `200 × (1.2^(L−1) − 1)`: the cost of the
//      next level is 1.2× the last, forever. `apply`'s `tick` awards `w.xp *
//      done` — a constant. A constant income against a geometric cost means the
//      thirtieth level takes 1.2^29 ≈ 200× as long as the second. That is not
//      pacing, it is the game slowly stopping.
//
// So: a currency that work pays out, two shapes of sink to spend it on, and an
// income curve stated in the same units as the cost curve so the two can be
// compared instead of hoped about.
//
// ---- Why "Obol" ------------------------------------------------------------
//
// `docs/SKILLS.md` §5 proposes it and the owner has not ruled (`docs/NEXT.md`
// item 1 lists it as an open question). Implementing it rather than inventing a
// third option, because the proposal already carries the twist: an obol is fare
// for passage — the coin you put under the tongue to be ferried across. A game
// whose reveal is "you were always a model being moved through a graph" wants
// its currency to be the price of being moved. The name is one string constant
// (`NOUN`); if the owner says "drachma", it is a one-line change.
//
// ---- Purity ----------------------------------------------------------------
//
// No DOM, no clock, no `Math.random()`, no imports. Every price is a function
// of state and of nothing else, so the shop looks the same at 3 a.m. as at
// noon — that is the same promise `dice.ts` makes about the seed, and it is
// what makes "no mechanic requires checking in" enforceable rather than
// promised. There are no timed offers here and there is no decay: an obol you
// earned is an obol you still have.

/** The word on the HUD. One place, so renaming the currency is one line.
 *
 *  ⚠️ The orchestrator must ALSO declare this in `src/core/readouts.ts` before
 *  any surface prints it — "one word, one quantity" (CLAUDE.md) is enforced by
 *  `scripts/check-vocabulary.mjs`, and this module is not a surface. */
export const NOUN = { one: 'obol', many: 'obols' } as const;

// ---------------------------------------------------------------------------
// 1 · WHERE OBOLS COME FROM
// ---------------------------------------------------------------------------

/** An obol every two seconds of work, at the first tier, before any upgrade.
 *  1,800/hour — chosen so the numbers on a phone screen are three or four
 *  digits for the first few hours, and so integer rounding of one action's
 *  payout (a 20 s action pays 10) never swallows a 15% raise. At 0.1/s the
 *  same raise would round away entirely, and an upgrade you cannot see is an
 *  upgrade that did not happen. */
export const BASE_OBOLS_PER_SEC = 0.5;

/** What one tier of depth is worth. Lifted from `docs/SKILLS.md` §2's XP tier
 *  step so the two ladders climb at the same pitch and one can be reasoned
 *  about in terms of the other.
 *
 *  ★ THIS IS THE HALF OF THE FIX THE REVIEWER NAMED "later regions pay LESS
 *  per hour". A later region now pays 1.9× MORE per hour, and the toll on its
 *  door (§3) is what you were saving for. */
export const TIER_YIELD = 1.9;

/** Five tiers, matching `docs/SKILLS.md` §2's five bands.
 *
 *  ⚠️ A TIER IS A DEPTH IN THE WORLD, NOT A LEVEL. `SKILLS.md` derives tier
 *  from the skill level (`1 + floor(level/6)`); this module derives it from
 *  WHERE THE WORK IS, and the two must not both be live or the 1.9 gets
 *  counted twice. Depth won because it is the one that makes a passage worth
 *  paying for: a level you would have got anyway cannot be a sink. The sibling
 *  module's materials carry the same `tier`, meaning the same thing.
 *
 *  Four regions exist, so tier 4 is today's ceiling; the constant is 5 so that
 *  a fifth region needs a toll and a price, not an edit here. */
export const TIER_CAP = 5;

// ---------------------------------------------------------------------------
// 2 · THE STATE
// ---------------------------------------------------------------------------

/** A material, as this module needs to see it.
 *
 *  ⚠️ STRUCTURAL, NOT IMPORTED. A sibling module owns gathering nodes and the
 *  materials they yield; that file may not exist yet and is not mine to
 *  import. Every sink below is priced against `{ id, tier }` and nothing else,
 *  so the two compose the moment the orchestrator hands this module a list.
 *  A material with extra fields satisfies this interface for free.
 *
 *  THE ASSUMPTION, stated so it can be checked rather than discovered: a
 *  material is RENEWABLE — the node that drops it can be worked again. Every
 *  material-priced sink here is a one-off purchase, so if that assumption
 *  fails the worst case is a passage that costs a trip, never a run that
 *  cannot continue. */
export interface Material { id: string; tier: number }

export interface Economy {
  /** Never negative. Only `credit` raises it and only a buy lowers it. */
  obols: number;
  /** Levels of the Ferryman's Tally bought, 0..`TALLY_CAP`. */
  tally: number;
  /** Ids of passages bought. Unique, and never removed — see `buyPassage`. */
  passages: string[];
}

export function emptyEconomy(): Economy {
  return { obols: 0, tally: 0, passages: [] };
}

/** Add earnings. Separate from the sinks so income and spending cannot be
 *  confused in a diff, and so the reducer has one obvious place to call. */
export function credit(e: Economy, obols: number): Economy {
  if (!Number.isFinite(obols) || obols <= 0) return e;
  return { ...e, obols: e.obols + Math.floor(obols) };
}

// ---------------------------------------------------------------------------
// 3 · SINK ONE — THE FERRYMAN'S TALLY (a rate, bought over and over)
// ---------------------------------------------------------------------------
//
// The incremental spine. Every level multiplies what work pays. This is the
// answer to "why is the next hour better than this one", and it must be the
// FIRST thing a player can buy, because a shop whose cheapest item is an hour
// away is a locked shop.
//
// ---- The cost curve --------------------------------------------------------
//
//     tallyCost(n) = round(200 × 1.35^(n−1))        // n = the n-th level
//
//     n:      1     2     3     4     5    10     15      19      20
//     cost: 200   270   365   492   664  2979  13357   44365   59892
//     cum:  200   470   835  1327  1991 10918  50948  170551  230443
//
// ---- The income curve ------------------------------------------------------
//
//     obols/hour = 1800 × 1.9^(tier−1) × 1.15^tally
//
// ---- The ratio, which is the whole design ---------------------------------
//
// Cost grows 1.35 per purchase; income grows 1.15 per purchase. 1.35 > 1.15,
// so each level takes LONGER to afford than the last by a factor of
// 1.35/1.15 = 1.174 — at a fixed tier:
//
//     purchase:   1st      5th      10th     15th     20th
//     time:     6.7 min  12.7 min  28 min   63 min   140 min
//     payback:  44 min   85 min    3.1 h    7.0 h    15.6 h
//
// ★ WHY IT DOES NOT EXPLODE. If income grew FASTER than cost (m > r), every
// upgrade would buy the next one sooner than the last and the twentieth would
// be free — the shop would empty itself in an afternoon and the game would be
// over. Cost outrunning income by 17% per step is what keeps a purchase a
// decision. And the cap at 20 is what stops the ramp before "longer than the
// last" becomes "longer than a weekend": the 21st level would cost 80,854 and
// take four hours, so there isn't one.
//
// ★ WHY IT IS NOT A TREADMILL EITHER. The 1.174 ramp is at a FIXED tier, and
// the tier is not fixed — each toll in §4 multiplies the rate by 1.9, and
// there are three of them. Over a whole run the price of the 20th level is
// 299× the 1st while income has risen 16.37 × 1.9^3 = 112×, so the last
// purchase costs 2.7× the wall-clock of the first — **1.053 per purchase**,
// not 1.174. Ten minutes becomes half an hour across twenty upgrades. That is
// a ramp. A flat income against this same price list would have made it 299×,
// which is the game quietly stopping.
//
// The obol ramp (1.053/purchase) and the XP ramp (1.060/level, see
// `TALLY_XP_STEP`) landing within a hundredth of each other is not a
// coincidence — both are a geometric cost divided by a geometric income, and
// both were tuned to the same target: the next thing costs a little more than
// the last thing, forever, and never a lot more.
//
// A player who stops buying keeps their rate; it simply stops rising. Plateau,
// never a loss.

export const TALLY_CAP = 20;
export const TALLY_BASE = 200;
export const TALLY_GROWTH = 1.35;

/** What one level of work pays for, in obols, per level of the Tally. */
export const TALLY_STEP = 1.15;

/** ...and in XP. A SMALLER number than the obol step, and this is the piece of
 *  arithmetic the whole item turns on. It is stated against the real curve in
 *  `engine.ts` rather than against a feeling:
 *
 *    THE COST.   step(L) = 40 × 1.2^(L−1). The last level of a skill costs
 *                1.2^28 = 165× what the second one did.
 *    THE INCOME. A full Tally is 1.08^20 = 4.66×. All three tolls are
 *                1.9^3 = 6.86×. Together 32×.
 *    THE SHAPE.  165 / 32 = 5.2 over 28 levels = **1.060 per level**.
 *
 *  So a level takes about 6% longer than the one before it, and the thirtieth
 *  takes five times the thirtieth-first — sorry, five times the second. Not
 *  165 times. That is the fix, stated as a number: the slowdown does not go
 *  away (levels SHOULD get longer; that is what a level is worth) but it stops
 *  being the geometric wall that made the last third of the game unreachable.
 *
 *  ⚠️ WHY NOT MATCH 1.2 EXACTLY AND MAKE EVERY LEVEL EQUAL TIME? Because the
 *  first level costs 40 XP — about half a minute of work. A perfectly matched
 *  curve makes every level as fast as the first one, and thirty half-minute
 *  levels is not progression, it is a loading bar. Income has to grow, but
 *  strictly slower than cost.
 *
 *  ⚠️ IT MULTIPLIES THE XP RATE, IT DOES NOT BUY LEVELS. `docs/SKILLS.md` §5
 *  is explicit that obols must not buy XP directly, and it is right —
 *  purchasable levels dissolve every threshold in the game. A better pickaxe
 *  is not a bought level: you still do the work, the work just pays better.
 *
 *  ⚠️ A BALANCE NOTE THE ORCHESTRATOR OWNS, NOT THIS FILE. `SKILLS.md` sized
 *  the ~8 h-per-skill run at 600 XP/hour at tier 1. The authored work nodes
 *  currently pay 30–60 XP per 20–50 s, i.e. ~4,300/h flat — seven times that
 *  budget before this module multiplies anything. So the run is short for
 *  reasons that predate the economy; scaling the content down is a content
 *  change and belongs to whoever owns `regions/`. */
export const TALLY_XP_STEP = 1.08;

/** Price of the n-th level (1-indexed). A function of n alone, so it is the
 *  same price on every device at every hour — determinism, per the header. */
export function tallyCost(n: number): number {
  if (n < 1 || n > TALLY_CAP) return Infinity;
  return Math.round(TALLY_BASE * TALLY_GROWTH ** (n - 1));
}

/** What the NEXT level costs, or Infinity at the cap. */
export const nextTallyCost = (e: Economy): number => tallyCost(e.tally + 1);

/** Why the Tally cannot be bought, in English, or null if it can.
 *
 *  ⚠️ A REASON, NEVER A HIDDEN BUTTON — the same rule `engine.ts`'s `blocked()`
 *  follows, for the same reason: the owner played a build with 85 unexplained
 *  options and "randomly clicked around". A price you cannot afford is the
 *  reason to come back; a price that is absent teaches nothing. */
export function tallyBlocked(e: Economy): string | null {
  if (e.tally >= TALLY_CAP) return 'the tally is full — every notch is cut';
  const cost = nextTallyCost(e);
  return e.obols >= cost ? null : `needs ${cost} ${NOUN.many} — you have ${e.obols}`;
}

/** Buy one level. Returns the SAME object when it cannot, so the reducer's
 *  `return state` idiom and a `!==` check both work. */
export function buyTally(e: Economy): Economy {
  if (tallyBlocked(e)) return e;
  return { ...e, obols: e.obols - nextTallyCost(e), tally: e.tally + 1 };
}

// ---------------------------------------------------------------------------
// 4 · SINK TWO — PASSAGES (content, bought once)
// ---------------------------------------------------------------------------
//
// The second shape, because one sink is a shop and two is a decision. A
// passage is a toll: pay it once and a region opens for good. `starmap.ts`
// already draws the distinction this leans on — *a price is a wait, a gate is
// a wall* — and a toll is the first kind. Nothing here is a wall: a passage
// never demands a level, only coin and (deeper in) material, both of which are
// earned by working nodes you can already reach.
//
// ★ THE DECISION. The first toll costs 900 and the first three Tally levels
// cost 835. Those two purchases are worth almost exactly the same: the tolls
// pay 1.9× and three notches pay 1.52×. So the first real spend is a genuine
// fork — go deeper for a bigger multiplier that also raises the ceiling of
// every later multiplier, or compound at home where it is safe. Priced that
// way on purpose. Two sinks at wildly different prices would be a sequence,
// not a choice.
//
//     passage        obols   materials      opens tier   ~time to afford
//     works            900   —                    2      30 min at 1,800/h
//     under          6,000   2 × tier ≥ 2         3      1.0 h at ~6,000/h
//     stones        30,000   3 × tier ≥ 3         4      1.5 h at ~20,000/h
//
// The material requirement starts at the SECOND passage deliberately: the
// first toll must be payable by a player who has never met the sibling
// module's gathering nodes, or this module's opening purchase depends on
// somebody else's file existing.

export interface Passage {
  id: string;
  /** The button, and it is a verb. */
  name: string;
  obols: number;
  /** Abstract material price: `count` materials of tier `tier` or better.
   *  Never a specific id — a named material is a wall dressed as a toll, and
   *  it would couple this file to content it does not own. */
  needs?: { tier: number; count: number };
  /** The region tag this opens. The orchestrator maps a tag to place ids; this
   *  module deliberately knows no place id, so a region can be renumbered
   *  without touching the economy. */
  opens: string;
  /** The tier of work behind the door. This is where income growth actually
   *  comes from, so it is data on the toll rather than a lookup elsewhere. */
  tier: number;
  /** One line for the shop. Drafted, for the owner's pass (CLAUDE.md). */
  blurb: string;
}

export const PASSAGES: readonly Passage[] = [
  {
    id: 'toll-works',
    name: 'Pay the wheelwright',
    obols: 900,
    opens: 'works',
    tier: 2,
    blurb: 'He will not stop the wheel for nothing, and he counts before he looks up.',
  },
  {
    id: 'toll-under',
    name: 'Pay the tithe at the sump',
    obols: 6000,
    needs: { tier: 2, count: 2 },
    opens: 'under',
    tier: 3,
    blurb: 'Coin for the gate, and something dry to burn on the far side of it.',
  },
  {
    id: 'toll-stones',
    name: 'Pay the fee at the ninth cairn',
    obols: 30000,
    needs: { tier: 3, count: 3 },
    opens: 'stones',
    tier: 4,
    blurb: 'Nobody takes it from you. You leave it on the stone and walk on.',
  },
];

export const PASSAGE = new Map(PASSAGES.map((p) => [p.id, p]));

export const hasPassage = (e: Economy, id: string): boolean => e.passages.includes(id);

/** Which materials would pay a requirement, and in what order.
 *
 *  ★ CHEAPEST QUALIFYING FIRST, then by id. Two reasons, and the second is the
 *  important one. It is deterministic — the same satchel pays the same toll on
 *  every device, which is the promise the header makes. And it never takes the
 *  best thing you own to pay a toll a worse thing would have paid: a shop that
 *  quietly spends your rarest material is a shop that punishes you for opening
 *  it. Returns null when the list cannot cover the price, so "can I" and "with
 *  what" are one question asked once. */
export function payWith(held: readonly Material[], needs: { tier: number; count: number }): Material[] | null {
  const usable = held
    .filter((m) => m.tier >= needs.tier)
    .sort((a, b) => (a.tier - b.tier) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return usable.length >= needs.count ? usable.slice(0, needs.count) : null;
}

/** Why a passage cannot be bought, in English, or null if it can. */
export function passageBlocked(e: Economy, p: Passage, held: readonly Material[] = []): string | null {
  if (hasPassage(e, p.id)) return 'already paid — the way stays open';
  if (e.obols < p.obols) return `needs ${p.obols} ${NOUN.many} — you have ${e.obols}`;
  if (p.needs && !payWith(held, p.needs)) {
    const have = held.filter((m) => m.tier >= p.needs!.tier).length;
    return `needs ${p.needs.count} of tier ${p.needs.tier} or better — you have ${have}`;
  }
  return null;
}

/** Pay a toll.
 *
 *  ⚠️ ATOMIC, AND IT RETURNS WHAT IT SPENT RATHER THAN SPENDING IT. The
 *  inventory belongs to another module. So this reports `consumed`, the
 *  orchestrator removes exactly those from the pack, and there is no path
 *  where materials leave the pack without the passage opening. On refusal it
 *  returns the same economy and an empty list — nothing is taken for a
 *  purchase that did not happen.
 *
 *  Buying twice is a no-op, not a second charge: `passages` is a set. */
export function buyPassage(
  e: Economy,
  p: Passage,
  held: readonly Material[] = [],
): { economy: Economy; consumed: Material[] } {
  if (passageBlocked(e, p, held)) return { economy: e, consumed: [] };
  const consumed = p.needs ? payWith(held, p.needs) ?? [] : [];
  return {
    economy: {
      ...e,
      obols: e.obols - p.obols,
      passages: [...e.passages, p.id].sort(),
    },
    consumed,
  };
}

// ---------------------------------------------------------------------------
// 5 · THE RATE — what all of the above is for
// ---------------------------------------------------------------------------

/** Deepest tier the player has bought their way into. Never falls: passages
 *  are never removed, so this is monotonic by construction and no purchase can
 *  lower anybody's income. */
export function reachedTier(e: Economy): number {
  let t = 1;
  for (const id of e.passages) {
    const p = PASSAGE.get(id);
    if (p && p.tier > t) t = p.tier;
  }
  return Math.min(TIER_CAP, t);
}

/** The obol multiplier. `1.15^tally`, 1.00 → 16.37 across the Tally. */
export const yieldMultiplier = (e: Economy): number => TALLY_STEP ** e.tally;

/** The XP multiplier. `1.08^tally`, 1.00 → 4.66. See `TALLY_XP_STEP` for why
 *  these are two numbers and not one. */
export const xpMultiplier = (e: Economy): number => TALLY_XP_STEP ** e.tally;

/** What one completed action pays.
 *
 *  Floored to a whole obol with a floor of 1, so the shortest action at the
 *  worst multiplier still pays something — a work node that pays zero is a
 *  work node nobody will ever tap twice. */
export function obolsForAction(e: Economy, work: { secs: number; tier?: number }): number {
  const tier = Math.max(1, Math.min(TIER_CAP, work.tier ?? 1));
  const raw = work.secs * BASE_OBOLS_PER_SEC * TIER_YIELD ** (tier - 1) * yieldMultiplier(e);
  return Math.max(1, Math.floor(raw));
}

/** What one completed action pays in XP: the content's number, scaled.
 *  `engine.ts` currently awards `w.xp * done` flat; the orchestrator replaces
 *  that constant with this call and the level curve stops outrunning it. */
export function xpForAction(e: Economy, work: { xp: number }): number {
  return Math.max(1, Math.round(work.xp * xpMultiplier(e)));
}

/** The headline rate, for the HUD and for every balance assertion in the
 *  tests. Unrounded on purpose: this is the curve, `obolsForAction` is the
 *  curve with a floor bolted on, and comparing rounded integers is how a
 *  growth check goes vacuous. */
export function obolsPerHour(e: Economy, tier = reachedTier(e)): number {
  return 3600 * BASE_OBOLS_PER_SEC * TIER_YIELD ** (Math.max(1, tier) - 1) * yieldMultiplier(e);
}

/** Hours of work to afford the next Tally level at the current rate. Infinite
 *  at the cap. Exists so "how long is this ramp" is a number the tests can
 *  assert rather than a claim in a comment. */
export function hoursToNextTally(e: Economy): number {
  const cost = nextTallyCost(e);
  if (!Number.isFinite(cost)) return Infinity;
  return Math.max(0, cost - e.obols) / obolsPerHour(e);
}

/** Hours until a purchase has paid for itself out of the income it added.
 *  The honest measure of whether an upgrade is worth buying, and the number
 *  that proves the curve does not explode: it RISES with each level. */
export function tallyPayback(e: Economy): number {
  const cost = nextTallyCost(e);
  if (!Number.isFinite(cost)) return Infinity;
  const added = obolsPerHour({ ...e, tally: e.tally + 1 }) - obolsPerHour(e);
  return cost / added;
}

// ---------------------------------------------------------------------------
// 6 · THE INVARIANTS, WRITTEN DOWN SO A TEST CAN HOLD THEM
// ---------------------------------------------------------------------------
//
// FAILURE IS A PLATEAU (CLAUDE.md, BRIEF.md). Four properties, each asserted
// in `test/slice-economy.test.ts`, and together they are the proof that no
// spend can strand anybody:
//
//   1. NOTHING BOUGHT EVER LOWERS INCOME. `yieldMultiplier` and `reachedTier`
//      are both monotonic in purchases, so `obolsPerHour` only ever rises.
//   2. NOTHING IS CONSUMED THAT CANNOT BE EARNED AGAIN. Obols come from work,
//      which repeats. Materials come from gathering nodes, which repeat (the
//      assumption on `Material`). Nothing else is ever taken.
//   3. NO PRICE MOVES BECAUSE OF ANOTHER PURCHASE. `tallyCost(n)` depends on n
//      alone; a passage's price is a constant. So spending everything on the
//      Tally cannot put a passage further away than it was — only the clock
//      moves, and it moves in the player's favour (1).
//   4. THEREFORE EVERY UNBOUGHT THING IS FINITELY FAR AWAY, from every state.
//      `obolsPerHour > 0` always, prices are finite, so time-to-afford is
//      finite. There is no state of this economy from which something is
//      permanently out of reach — which is what "never unwinnable" means when
//      it is written as arithmetic instead of as a promise.
//
// ---- PROVEN RED, 2026-07-30 (CLAUDE.md rule 4) ----------------------------
//
// Five sabotages, applied one at a time to THIS file, run, the failing test
// names copied from the terminal, then reverted and the suite re-run green
// (35 passed). A guard nobody has watched fail is not a guard.
//
//   1. `TALLY_STEP: 1.15 → 1.0`  — the rate stops growing, i.e. the exact
//      defect this module was written to remove.
//        × is 16.4× at a full Tally, and that is the ceiling
//        × grows 112× end to end against a 299× price — 1.053 per purchase
//        × pays back slower and slower, so no upgrade is ever free
//        × pays an action more obols the more Tally you own
//        × states its own constants where the balance depends on them
//        (5 failed | 30 passed)
//
//      ★ AND ONE THAT STAYED GREEN AND SHOULD NOT HAVE: "rises by exactly
//      TALLY_STEP with every Tally level" compared the module against its own
//      constant, so zeroing the constant satisfied it. The headline growth
//      check was VACUOUS against the headline defect. Fixed by asserting the
//      ratio against a literal 1.1 as well; re-sabotaged, 6 failed | 29
//      passed. This is why rule 4 is a rule.
//
//   2. `tallyCost`: `TALLY_GROWTH ** (n - 1)` → `** n`  — every price one
//      step too high.
//        × is exactly round(200 × 1.35^(n−1)), term by term
//        × pays back slower and slower, so no upgrade is ever free
//        × refuses the Tally and says the price
//        (3 failed | 32 passed)
//
//   3. `TALLY_XP_STEP: 1.08 → 1.00`  — XP income flat against a 1.2 curve.
//        × turns a 165× wall into a 1.06-per-level ramp
//        × scales XP without ever handing out a level
//        × states its own constants where the balance depends on them
//        (3 failed | 32 passed)
//
//   4. `passageBlocked`: the `hasPassage` line deleted  — a toll you can pay
//      twice, which is a player charged twice for one door.
//        × charges a toll once, however many times it is tapped
//        (1 failed | 34 passed)
//
//   5. `payWith`: `(a.tier - b.tier)` → `(b.tier - a.tier)`  — the shop eats
//      your best material when a worse one would have paid.
//        × spends the cheapest qualifying material, never the best one
//        × consumes exactly what the toll asked for, and reports it
//        (2 failed | 33 passed)
