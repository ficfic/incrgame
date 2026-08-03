// THE DICE. Ironsworn's action roll, adopted whole rather than invented.
//
// ★ THE OWNER ASKED FOR EXACTLY THIS, twice over: *"we have some stats that
// helps us with various 2D10 rolls we are doing"* — and then, asked for a
// system: *"is there some open license 2D10 system we can take to not invent
// too much."* Ironsworn's challenge dice ARE two d10s, its outcome grammar is
// the CYOA grammar (yes / yes-but / no-and), and it is a solo game about
// journeys through dangerous country. We could not have invented closer.
//
// This work is based on Ironsworn (found at www.ironswornrpg.com), created by
// Shawn Tomkin, and licensed for our use under the Creative Commons
// Attribution 4.0 International License
// (https://creativecommons.org/licenses/by/4.0/).
// The same attribution lives in README.md, which is the visible copy.
//
// What is taken, and what is not: the ACTION ROLL (1d6 + stat vs two d10,
// beat each strictly, ties lose), the outcome TIERS (strong hit / weak hit /
// miss), MATCHES on the challenge dice as a twist, five STATS, and MOMENTUM
// with its burn-and-reset. The economy — mana, pipes, gauge — is ours and is
// not Ironsworn's.
//
// ⚠️ PURE. The dice are ROLLED IN THE SHELL and judged here — `apply()` takes
// no randomness, which is the engine's oldest rule. A roll arrives as three
// numbers; this file only ever says what they mean.

/** The five stats, Ironsworn's own. They fit the road crew as written —
 *  renaming was licensed and turned out to be unnecessary. The owner owns the
 *  words and can rename any of them later; the gate will follow. */
export const STATS = ['edge', 'heart', 'iron', 'shadow', 'wits'] as const;
export type Stat = typeof STATS[number];

/** ⟨draft⟩ The crew's starting array — Ironsworn's 3/2/2/1/1 spread, dealt to
 *  fit the fiction: a road crew is strong-backed and sharp-eyed before it is
 *  quick or charming. The owner rebalances, not an agent. */
export const START_STATS: Record<Stat, number> = {
  iron: 3, wits: 2, shadow: 2, heart: 1, edge: 1,
};

/** Momentum, Ironsworn's numbers: start +2, cap +10, floor -6, reset +2. */
export const MOMENTUM_START = 2;
export const MOMENTUM_MAX = 10;
export const MOMENTUM_MIN = -6;
export const MOMENTUM_RESET = 2;

export interface Roll {
  /** The action die, 1..6. */
  a: number;
  /** The two challenge dice, 1..10 each. */
  c1: number;
  c2: number;
}

export type Tier = 'strong' | 'weak' | 'miss';

export interface Judged {
  tier: Tier;
  /** ★ THE TWIST: matched challenge dice. On a strong hit it is a windfall, on
   *  a miss it is worse than it looked — either way something EXTRA happens,
   *  which is where the creepy shit gets in the door. */
  twist: boolean;
  /** The action score, for showing the arithmetic honestly. */
  score: number;
}

/** A roll is legal or it is refused — the engine never guesses at dice. */
export const legal = (r: Roll): boolean =>
  Number.isInteger(r.a) && r.a >= 1 && r.a <= 6
  && Number.isInteger(r.c1) && r.c1 >= 1 && r.c1 <= 10
  && Number.isInteger(r.c2) && r.c2 >= 1 && r.c2 <= 10;

/** ★ THE ACTION ROLL. Score = action die + stat; beat each challenge die
 *  STRICTLY — ties go to the world, which is Ironsworn's rule and the correct
 *  amount of mean. */
export function judge(r: Roll, stat: number): Judged {
  const score = Math.min(10, r.a + stat);   // Ironsworn caps the score at 10
  const beat = (c: number): boolean => score > c;
  const n = (beat(r.c1) ? 1 : 0) + (beat(r.c2) ? 1 : 0);
  return {
    tier: n === 2 ? 'strong' : n === 1 ? 'weak' : 'miss',
    twist: r.c1 === r.c2,
    score,
  };
}

/** ★ BURNING MOMENTUM, after seeing the roll: your banked momentum REPLACES
 *  the action score if it is higher, and then resets. Judged against the same
 *  challenge dice — the world does not reroll because you gritted your teeth. */
export function judgeBurned(r: Roll, momentum: number): Judged {
  const beat = (c: number): boolean => momentum > c;
  const n = (beat(r.c1) ? 1 : 0) + (beat(r.c2) ? 1 : 0);
  return {
    tier: n === 2 ? 'strong' : n === 1 ? 'weak' : 'miss',
    twist: r.c1 === r.c2,
    score: momentum,
  };
}

/** Whether burning would actually improve this roll — the UI only offers the
 *  match when it means something, because a button that does nothing is the
 *  oldest complaint this game has. */
export function burnHelps(r: Roll, stat: number, momentum: number): boolean {
  if (momentum <= 0) return false;
  const now = judge(r, stat);
  const then = judgeBurned(r, momentum);
  const rank: Record<Tier, number> = { miss: 0, weak: 1, strong: 2 };
  return rank[then.tier] > rank[now.tier];
}

export const clampMomentum = (n: number): number =>
  Math.max(MOMENTUM_MIN, Math.min(MOMENTUM_MAX, n));
