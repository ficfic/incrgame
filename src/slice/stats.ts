// STATS — the second thing that accrues, and why it is not a second XP bar.
//
// `docs/BRIEF.md` ask 2, in the owner's words: *"what accrues is our stats —
// including knowledge, of course — and our skills."* Only skills got built.
// He asked again: *"skills and stats and shit?"*
//
// ═══════════════════════════════════════════════════════════════════════════
// WHAT IS A STAT, IF A SKILL ALREADY EXISTS?  — the position, in five lines
// ═══════════════════════════════════════════════════════════════════════════
//
//  1. A SKILL IS A RATE. It goes up whenever you spend time, it is narrow (one
//     activity), it is many (five), and it buys odds on its own activity only.
//     Skills answer *how much have you done*.
//  2. A STAT IS A SHAPE. Four numbers that share ONE FIXED BUDGET. A stat
//     never grows — it is REDISTRIBUTED, by events, and raising one costs
//     another. Stats answer *what did you become while doing it*.
//  3. THAT IS THE WHOLE DIFFERENCE, AND IT IS STRUCTURAL, NOT COSMETIC. Because
//     the total is constant, a stat CANNOT be ground. Walking the same check a
//     hundred times to farm Might also drains Grace, so the hundredth walk is
//     worth nothing — it is a choice about what you are, not a bar. Two systems
//     that accrue the same way are one system with extra bookkeeping
//     (`docs/RESET.md`); this one accrues differently on purpose.
//  4. A STAT CROSS-CUTS SKILLS. Might applies to every check above your level,
//     in ANY skill; Grace to every check at or under it. A skill touches one
//     activity, a stat touches one KIND of moment.
//  5. AND IT MAKES THE TWIST MECHANICALLY TRUE BEFORE IT IS STATED (ask 8).
//     A fixed capacity, reallocated by what you were trained on, at the cost of
//     what you were trained on before, is not a fantasy hero. It is a model
//     being fine-tuned. Prestige (ask 9) rotates on that budget.
//
// ⚠️ WHAT THIS FILE IS NOT ALLOWED TO BE: a number that goes up when you do
// things. `docs/RESET.md` row 6 — `state.rot` was read by three narration
// modules and by nothing else, gated no rate, blocked no action, cost nothing.
// Every stat here is spent somewhere the player can feel, or it does not ship.
//
// ═══════════════════════════════════════════════════════════════════════════
// PURITY
// ═══════════════════════════════════════════════════════════════════════════
// No DOM, no `Date.now()`, no `Math.random()`. Everything here is a total
// function of its arguments. `Stats` is never mutated; every function returns a
// fresh object.

import { MOD_CAP, modifier, odds as oddsOf } from './dice';
import type { SkillId } from './schema';

// ───────────────────────────────────────────────────────────────────────────
// 1 · THE FOUR
// ───────────────────────────────────────────────────────────────────────────

export type StatId = 'might' | 'grace' | 'nerve' | 'fortune';

export const STAT_IDS: readonly StatId[] = ['might', 'grace', 'nerve', 'fortune'];

export type Stats = Record<StatId, number>;

/** Each stat's label, its one-line description in the game's voice, and — the
 *  entry fee for existing — the one thing it does that a skill cannot.
 *
 *  Voice per `regions/valley.ts`: dry, concrete, slightly wrong. No adjective
 *  piles. */
export const STATS: Record<StatId, { name: string; blurb: string; notASkill: string }> = {
  might: {
    name: 'Might',
    blurb: 'For the throws that are over your head. No help at all with anything you already know.',
    notASkill:
      'A skill helps its own activity. Might helps every check you are not good enough for, '
      + 'whichever skill it is — and it is the number a fight reads (docs/COMBAT.md).',
  },
  grace: {
    name: 'Grace',
    blurb: 'For the throws that are not. Most runs end on one of those.',
    notASkill:
      'A skill raises the ceiling. Grace holds the floor: it only ever moves checks you were '
      + 'already good enough for, in any skill, and those are the ones that lose runs.',
  },
  nerve: {
    name: 'Nerve',
    blurb: 'What a bad throw is worth to you afterwards. It goes up when the dice are cruel.',
    notASkill:
      'No skill can be earned by losing. Nerve is what losing pays — the only stat a failure '
      + 'raises, and the seam for keeping the XP for damage dealt (COMBAT.md §4).',
  },
  fortune: {
    name: 'Fortune',
    blurb: 'The world’s opinion of you. It shows up in satchels, never in a throw.',
    notASkill:
      'A skill cannot touch loot — the satchel roll takes no modifier by design (docs/DICE.md '
      + '§6). Fortune moves the LINE the satchel is read against, not the dice.',
  },
};

// ───────────────────────────────────────────────────────────────────────────
// 2 · THE BUDGET
// ───────────────────────────────────────────────────────────────────────────

/** The fixed sum of all four. Never changes, ever, for any reason. If this
 *  number can rise, stats are an XP bar and this file has failed. */
export const STAT_TOTAL = 20;

/** A stat can be starved but never erased — 1 is "there is almost nothing left
 *  of this", and it still costs the player something real (−2 modifier). */
export const STAT_MIN = 1;

/** With four stats, MIN 1 and TOTAL 20, the arithmetic ceiling is 17. It is
 *  capped at 10 instead so the ±2 conversion in §4 saturates, and so a run
 *  cannot dump everything into one number and call it a build. */
export const STAT_MAX = 10;

/** Where a stat sits when it is neither pushed nor starved. `5 × 4 = 20`. */
export const STAT_BASE = 5;

/** ★ A FRESH CHARACTER IS EXACTLY NEUTRAL, AND THAT IS LOAD-BEARING.
 *  Every step is 0 at 5, so `oddsWith(fresh(), l, d) === odds(l, d)` for every
 *  level and demand in the game. Shipping stats changes no existing balance
 *  until a stat actually moves. A test asserts it over all 31 × 31 pairs. */
export function fresh(): Stats {
  return { might: STAT_BASE, grace: STAT_BASE, nerve: STAT_BASE, fortune: STAT_BASE };
}

/** True if a value is a whole number inside the bounds. */
const inBounds = (v: number): boolean =>
  Number.isInteger(v) && v >= STAT_MIN && v <= STAT_MAX;

/** Cheap structural check, for `save.ts` to call on a loaded save if it wants
 *  one. Four integers, all in bounds, summing to exactly the budget. */
export function valid(s: Stats): boolean {
  return STAT_IDS.every((id) => inBounds(s[id]))
    && STAT_IDS.reduce((n, id) => n + s[id], 0) === STAT_TOTAL;
}

// ───────────────────────────────────────────────────────────────────────────
// 3 · HOW THEY MOVE — a transfer, never an award
// ───────────────────────────────────────────────────────────────────────────
//
// ⚠️ THERE IS NO FUNCTION IN THIS FILE THAT ADDS TO A STAT. There is only
// `transfer`, which moves one point from one stat to another. That is the
// invariant enforced by construction rather than by a test that could rot: the
// total cannot drift because nothing in the module can change it.
//
// The events below are chosen for one reason: THE CONTENT THAT EXISTS TODAY
// ALREADY PRODUCES THEM. Every one is derivable from a `Check` that `engine.ts`
// already rolls, or from a door `valley.ts` already locks. Nothing here needs a
// new field on `Choice`, which is somebody else's file this week.

/** Moves one point from `lose` to `gain`. Refused — returns the SAME object —
 *  if the gainer is already at the ceiling or the loser at the floor. Refusing
 *  is deliberate: a silently-clamped transfer would break the budget. */
export function transfer(s: Stats, gain: StatId, lose: StatId): Stats {
  if (gain === lose) return s;
  if (s[gain] >= STAT_MAX || s[lose] <= STAT_MIN) return s;
  return { ...s, [gain]: s[gain] + 1, [lose]: s[lose] - 1 };
}

/** The moments that change what you are. */
export type StatEvent =
  /** Passed a check the board said you would probably fail (`STRETCH_AT` or
   *  worse). Produced by any `test` whose demand is well over your level —
   *  `valley.ts` 1→3 at Wayfaring 0 is already 28%. */
  | { kind: 'stretch' }
  /** Failed a check the board said you would probably pass (`ROUTINE_AT` or
   *  better). Produced by every easy test in the game, ~1 time in 5. */
  | { kind: 'slip' }
  /** Two tens. 1%. `engine.ts` already labels it `crit: 'triumph'`. */
  | { kind: 'triumph' }
  /** Two ones. 1%. `engine.ts` already labels it `crit: 'disaster'`. */
  | { kind: 'disaster' }
  /** First time you open a door with the thing it asked for — `needs.item`,
   *  which `valley.ts` uses twice (3→5 and 5→200). You went away, found it,
   *  and came back. */
  | { kind: 'gate' }
  /** A choice that names its own stat move, for authored content later. The
   *  seam exists so a region file can say "this costs you something" without
   *  anyone editing this module. */
  | { kind: 'authored'; gain: StatId; lose: StatId };

/** ★ "Probably fail" and "probably pass", as numbers, in one place.
 *
 *  35% is below the bare 2d10 (55%) by two full modifier steps: a check you are
 *  taking on anyway. 79% is `2d10 ≥ 8` exactly — the satchel line, and the
 *  highest odds the board shows for anything that is not a formality. */
export const STRETCH_AT = 0.35;
export const ROUTINE_AT = 0.79;

/** What each event does to the shape. Read this table as the design.
 *
 *  | Event    | Gains   | Loses   | Because                                  |
 *  |----------|---------|---------|------------------------------------------|
 *  | stretch  | Might   | Grace   | you got through by pushing, not by care  |
 *  | slip     | Grace   | Might   | the easy one beat you; you get careful   |
 *  | triumph  | Fortune | Nerve   | the dice liked you, and you softened     |
 *  | disaster | Nerve   | Fortune | a botch is a door (docs/DICE.md §5)      |
 *  | gate     | Nerve   | Might   | coming back with the key is stubbornness |
 */
export function moveFor(e: StatEvent): { gain: StatId; lose: StatId } {
  switch (e.kind) {
    case 'stretch': return { gain: 'might', lose: 'grace' };
    case 'slip': return { gain: 'grace', lose: 'might' };
    case 'triumph': return { gain: 'fortune', lose: 'nerve' };
    case 'disaster': return { gain: 'nerve', lose: 'fortune' };
    case 'gate': return { gain: 'nerve', lose: 'might' };
    case 'authored': return { gain: e.gain, lose: e.lose };
  }
}

/** Apply one event. Pure, total, and a no-op when the transfer is refused. */
export function applyEvent(s: Stats, e: StatEvent): Stats {
  const m = moveFor(e);
  return transfer(s, m.gain, m.lose);
}

/** The line for the one row above the board, or null if nothing moved.
 *
 *  Drafted, for the owner to iterate on (CLAUDE.md: prose is machine-drafted
 *  and owner-edited). The bar is a line the owner would defend. */
export function say(before: Stats, e: StatEvent): string | null {
  const { gain, lose } = moveFor(e);
  const after = applyEvent(before, e);
  if (after === before) return null;
  return `${STATS[gain].name} ${after[gain]}, ${STATS[lose].name} ${after[lose]}. `
    + 'You do not get to keep both.';
}

/** ⚠️ THE ONE PLACE THAT DECIDES WHETHER A ROLL MOVED YOU.
 *
 *  Takes what `engine.ts` already has in hand at the end of a check — the
 *  odds it showed on the button before the tap, and the resolved roll — and
 *  returns at most one event. Crits win over bands, because a crit is the
 *  thing the player will remember and two events for one throw is bookkeeping.
 *
 *  ⚠️ A CRIT IS NOT A BAND. `passed` is already forced by the crit in
 *  `dice.ts`, so checking `crit` first is not merely a priority — it stops a
 *  triumph at 10% odds ALSO counting as a stretch. */
export function eventForRoll(
  shownOdds: number,
  r: { passed: boolean; crit: 'triumph' | 'disaster' | null },
): StatEvent | null {
  if (r.crit === 'triumph') return { kind: 'triumph' };
  if (r.crit === 'disaster') return { kind: 'disaster' };
  if (r.passed && shownOdds <= STRETCH_AT) return { kind: 'stretch' };
  if (!r.passed && shownOdds >= ROUTINE_AT) return { kind: 'slip' };
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// 4 · WHAT THEY DO TO THE DICE — and why that does not blow the clamp open
// ───────────────────────────────────────────────────────────────────────────
//
// `dice.ts` is deliberate and this module does not get to undo it: the level
// never touches the roll, it shifts the TARGET, and the shift stops at ±6 so no
// check is ever 0% or 100%. A stat that added outside the clamp would make
// `docs/DICE.md` §8 ("failure is a plateau: 10% floor, 94% ceiling") false.
//
// SO THE STAT IS ADDED *INSIDE* THE CLAMP, NOT AFTER IT.
//
//   step(v)   = trunc((v − 5) / 2)                v ∈ [1,10]  ⟹  step ∈ [−2,+2]
//   skillMod  = clamp(trunc((level − demand)/3), ±6)          — dice.ts, untouched
//   total     = clamp(skillMod + step, ±6)                    — THE SAME ±6
//
// THE ARITHMETIC, stated so it can be checked:
//
//   best  total = +6 ⟹ 2d10 ≥ 11 − 6 = 5  ⟹ 94/100 = 94%   (unchanged)
//   worst total = −6 ⟹ 2d10 ≥ 11 + 6 = 17 ⟹ 10/100 = 10%   (unchanged)
//
// The floor and the ceiling are EXACTLY where they were with no stats at all.
// A stat cannot widen the band; it can only move you inside it — which is the
// entire point of a fixed budget. What it changes is the middle, where all the
// content lives (`P(2d10 ≥ 11 − m)`, from `docs/DICE.md` §3):
//
//   an even check (skillMod 0, 55%):  Might 9+ → +2 → 72%   Might 1 → −2 → 36%
//   a stretch (skillMod −3, 28%):     Might 9+ → −1 → 45%   Might 1 → −5 → 15%
//
// So a stat at its ceiling is worth six levels of the skill, and at its floor
// costs you six. Four points of swing on a twelve-point scale, from a budget
// that never grows.
//
// ⚠️ THE REACHABLE CEILING IS 9, NOT 10, and that is fine. `stretch` is the
// only built-in event that feeds Might and it can only take from Grace, which
// floors at 1 after four transfers — so Might tops out at 9 in practice. Since
// `step(9) === step(10) === +2`, the full ±2 swing is reachable anyway; 10 is
// headroom for authored events, not a target. A test states this outright so
// nobody later "fixes" it.
//
// HOW IT REACHES `dice.ts` WITHOUT EDITING IT: `check()` derives its own
// modifier from `(level, demand)`, and `modifier(demand + 3m, demand) === m`
// for every m in [−6,+6] — exact integer arithmetic, no float. So the combined
// modifier is handed over as a SYNTHETIC LEVEL. It is never stored, never
// shown, and never passed anywhere but `dice.ts`.

/** A stat's contribution to a modifier: −2 at 1, 0 at 5, +2 at 10. */
export function step(v: number): number {
  return Math.trunc((v - STAT_BASE) / 2);
}

/** Which stat a check answers to. The cross-cut: not the skill, the SITUATION.
 *  Above your level is Might; at or under it is Grace. Exactly one of the two
 *  applies to any check ever rolled, in any skill. */
export function governs(skillLevel: number, demand: number): StatId {
  return demand > skillLevel ? 'might' : 'grace';
}

/** The combined, clamped modifier. This is the number the odds come from.
 *
 *  ⚠️ THE CLAMP IS THE PRODUCT. Break it and every guarantee in `docs/DICE.md`
 *  §8 goes with it. A test asserts 10% ≤ odds ≤ 94% across every level, every
 *  demand and every legal allocation of the budget.
 *
 *  ⚠️ IT IS CLAMPED TWICE, AND ONLY THE FIRST ONE IS OURS. `dice.ts` clamps the
 *  synthetic level again on the way in, so deleting the clamp below does NOT
 *  move the odds — it was verified by deleting it, and the odds tests stayed
 *  green. What it does move is the number a surface SHOWS and the number
 *  `radius`/`poke` read. That is why the test that catches it is the bound on
 *  this function, not the bound on the odds. */
export function statModifier(s: Stats, skillLevel: number, demand: number): number {
  const raw = modifier(skillLevel, demand) + step(s[governs(skillLevel, demand)]);
  return Math.max(-MOD_CAP, Math.min(MOD_CAP, raw));
}

/** The `(level, demand)` pair to hand `dice.ts`'s `check()` so it produces the
 *  combined modifier. The level is SYNTHETIC — see the block comment above. */
export function checkArgs(
  s: Stats,
  skillLevel: number,
  demand: number,
): { level: number; demand: number } {
  return { level: demand + 3 * statModifier(s, skillLevel, demand), demand };
}

/** The odds ON the button, with stats. Delegates to `dice.ts`'s exact
 *  100-outcome count rather than repeating the probability arithmetic — the
 *  one number the player is shown as a promise stays computed in one place. */
export function oddsWith(s: Stats, skillLevel: number, demand: number): number {
  const a = checkArgs(s, skillLevel, demand);
  return oddsOf(a.level, a.demand);
}

// ───────────────────────────────────────────────────────────────────────────
// 5 · FORTUNE — the satchel line, not the satchel roll
// ───────────────────────────────────────────────────────────────────────────
//
// `engine.ts` opens a satchel with `check(seed, 0, 0)` and reads `good` on
// `total ≥ 8` (79%). `docs/DICE.md` §6 is firm that the loot roll takes no
// modifier — pure luck is the fun — so Fortune does not touch the roll. It
// moves the LINE, which is the same move `dice.ts` makes for levels and for
// the same reason.
//
//   Fortune 10 → line 6  → 90%      Fortune 5 → line 8 → 79%  (today)
//   Fortune  1 → line 10 → 64%
//
// Never 100%, never 0%. The 21% disappointment shrinks to 10% at best and grows
// to 36% at worst, and no run is loot-gated either way.

/** The satchel's good/poor line, given Fortune. 6..10. */
export const SATCHEL_LINE = 8;
export function satchelLine(s: Stats): number {
  return SATCHEL_LINE - step(s.fortune);
}

// ───────────────────────────────────────────────────────────────────────────
// 6 · NERVE — what a loss pays
// ───────────────────────────────────────────────────────────────────────────
//
// `engine.ts` pays 20 XP for a passed check and 8 for a failed one. Nerve
// scales the failure only: `1 + (nerve − 5)/10`, so ×0.6 at 1, ×1 at 5, ×1.5
// at 10. Failure is a plateau (BRIEF), and Nerve decides how flat. The range is
// lopsided because the stat's own range is — 1..10 around a base of 5.
//
//   Nerve 1 → 5 XP     Nerve 5 → 8 XP (today)     Nerve 10 → 12 XP
//
// It never scales a WIN, because a stat that made everything better would be
// the second XP bar this file exists to refuse.

/** Multiplier on the XP a FAILED check pays. 0.6 … 1.5. */
export function nerveMultiplier(s: Stats): number {
  return 1 + (s.nerve - STAT_BASE) / 10;
}

/** The XP a failed check pays, rounded to an integer. */
export function failXp(s: Stats, base: number): number {
  return Math.max(1, Math.round(base * nerveMultiplier(s)));
}

// ───────────────────────────────────────────────────────────────────────────
// 7 · THE COMBAT SEAM — declared, not built
// ───────────────────────────────────────────────────────────────────────────
//
// `docs/COMBAT.md` is designed and unbuilt. It says radius is health, poke is
// damage, and an enemy declares ONE skill it is scored against:
//
//     enemy = { tests: SkillId, rating: number, bite: number }
//
// and it reads exactly one integer from the skill system, `level(enemy.tests)`,
// for both radius and poke. SKILLS.md §1 proposed a sixth skill, **Might**, to
// be that integer, and then the build shipped five skills without it. This
// module answers that dangling proposal: MIGHT IS A STAT, NOT A SKILL. A fight
// is the clearest case of a moment that cross-cuts every activity — the troll
// does not care which skill you practised.
//
// ⚠️ NO COMBAT IS BUILT HERE. These two functions are the whole seam. When
// somebody writes `combat.ts`, it reads them and nothing else from this file.

/** Your dot's starting radius in a fight, in COMBAT.md's units: the skill the
 *  enemy tests, plus what you are. Might 1 costs you 2, Might 10 buys you 2. */
export function radius(s: Stats, skillLevel: number): number {
  return Math.max(1, skillLevel + step(s.might));
}

/** How much your poke takes off the other dot, same shape. */
export function poke(s: Stats, skillLevel: number): number {
  return Math.max(1, skillLevel + step(s.might));
}

/** Which skill a fight reads. Re-exported so `combat.ts` can be written
 *  against this module without importing the enemy shape from anywhere yet. */
export type FightAgainst = SkillId;

// ───────────────────────────────────────────────────────────────────────────
// 8 · WHAT THE ORCHESTRATOR MUST WIRE
// ───────────────────────────────────────────────────────────────────────────
//
//  1. `Slice.stats: Stats` in `engine.ts`, initialised with `fresh()`, and
//     `version` bumped in `save.ts`. Saves are breakable (CLAUDE.md); a reset
//     is fine, and a migration is one line: `stats: fresh()`.
//  2. `chanceOf` → `oddsWith(s.stats, level(s, skill), demand)`.
//  3. In `travel`, the check becomes
//     `const a = checkArgs(state.stats, level(...), c.test.demand);`
//     `const r = check(state.seed, a.level, a.demand);`
//     and afterwards
//     `const e = eventForRoll(shownOdds, r);` → `applyEvent` + `say`.
//     `shownOdds` is the number the button was showing — compute it BEFORE the
//     roll, from the stats before the roll, or the board lied.
//  4. In `open`, the line `r.total >= 8` becomes `r.total >= satchelLine(...)`.
//  5. In `travel`, failure XP `8` becomes `failXp(state.stats, 8)`.
//  6. A `gate` event when a `needs.item` choice is taken for the first time.
//  7. `src/core/readouts.ts` must declare four nouns — Might, Grace, Nerve,
//     Fortune — or `scripts/check-vocabulary.mjs` is right to complain the
//     moment the HUD shows them.
//  8. `tick` wires NOTHING. Time does not change what you are. A test asserts
//     it, because that is the line between this file and the XP curve.
