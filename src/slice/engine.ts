// THE SLICE'S ENGINE. Pure: `apply(state, action) => state`.
//
// No DOM, no clock, no `Math.random()`. Time arrives as a `tick` action carrying
// how many seconds passed, which is what lets the same reducer serve the live
// screen, the offline catch-up and the tests without a branch in it.
import { PLACE, START, ITEMS } from './content';
import type { Choice, ItemId } from './schema';
import { check, modifier, odds as oddsOf, type Check } from './dice';

export type { SkillId } from './schema';
import type { SkillId } from './schema';

export const SKILLS: Record<SkillId, { name: string }> = {
  wayfaring: { name: 'Wayfaring' },
  lore: { name: 'Lore' },
  craft: { name: 'Craft' },
  guile: { name: 'Guile' },
  attunement: { name: 'Attunement' },
};

export interface Job { work: string; at: number; left: number }

/** What a satchel can contain. Carried on the satchel rather than looked up
 *  from the place, so a satchel banked at one place and opened at another still
 *  knows what it is. */
export interface Drop { good: ItemId; poor?: ItemId }

export interface Slice {
  version: number;
  /** The dice, carried in the save. See `dice.ts` for why this is still pure. */
  seed: number;
  at: number;
  seen: number[];
  xp: Record<SkillId, number>;
  pack: ItemId[];
  /** Unopened satchels, each remembering what it can yield. ⚠️ Loot from banked
   *  time is NOT rolled while away — see `tick`. */
  satchels: Drop[];
  job: Job | null;
  /** The last thing that happened, for the one line above the board. */
  said: string;
  /** The last check, so the dice can be shown. Cleared by the next action. */
  lastRoll: Check | null;
}

export type Action =
  | { type: 'travel'; to: number }
  | { type: 'work'; id: string }
  | { type: 'tick'; secs: number }
  | { type: 'open' };

/** XP to REACH a level. `step(L) = 40 × 1.2^(L−1)` from `docs/SKILLS.md`, summed:
 *  `200 × (1.2^(L−1) − 1)`. Level 1 is free, level 2 costs 40, level 3 costs 88. */
export function xpForLevel(level: number): number {
  return Math.round(200 * (1.2 ** (level - 1) - 1));
}

export const LEVEL_CAP = 30;

export function levelFor(xp: number): number {
  let l = 1;
  while (l < LEVEL_CAP && xp >= xpForLevel(l + 1)) l++;
  return l;
}

export const level = (s: Slice, id: SkillId): number => levelFor(s.xp[id]);

export function initial(seed = 0x5eed): Slice {
  return {
    version: 2,
    seed,
    at: START,
    seen: [START],
    xp: { wayfaring: 0, lore: 0, craft: 0, guile: 0, attunement: 0 },
    pack: [],
    satchels: [],
    job: null,
    said: 'You are here. Two ways on, and one of them is uphill.',
    lastRoll: null,
  };
}

/** Why a choice is not takeable, in English, or null if it is.
 *
 *  ⚠️ NEVER HIDDEN. A shut door that says what it wants is the reason to come
 *  back; a shut door that is simply absent teaches nothing. The owner played a
 *  build with 85 unexplained options and said they "randomly clicked around" —
 *  so there are two or three here, and each one says why. */
export function blocked(s: Slice, c: Choice): string | null {
  if (!c.needs) return null;
  if ('item' in c.needs) {
    const want = c.needs.item;
    // `ItemId` is a string so regions can add items without editing a shared
    // union, so the lookup can miss. A test asserts every `needs` names a real
    // item; this fallback keeps a typo from blanking the label if one lands.
    return s.pack.includes(want) ? null : `needs the ${ITEMS[want]?.name ?? want}`;
  }
  const have = level(s, c.needs.skill);
  return have >= c.needs.level
    ? null
    : `needs ${SKILLS[c.needs.skill].name} ${c.needs.level} — you are ${have}`;
}

/** The odds shown ON the button, before the tap. */
export function chanceOf(s: Slice, c: Choice): number | null {
  return c.test ? oddsOf(level(s, c.test.skill), c.test.demand) : null;
}

const award = (s: Slice, id: SkillId, xp: number): Record<SkillId, number> =>
  ({ ...s.xp, [id]: s.xp[id] + xp });

// ★ THE FARM, AND WHY A CROSSING WEARS OUT.
//
// Measured on the shipped build, one hour of each, at 2,400 taps an hour
// (1.5 s a tap — 1,200 round trips, which reproduces both figures exactly):
//
//     timer, unattended               :  5,400 XP  ·     0 satchels
//     pacing The Stack <-> The Tally  : 22,572 XP  · 1,081 satchels  (4.2x)
//
// Two taps, forever: 2 -> 4 throws a Lore check that paid a flat 20/8 and
// dropped a satchel on every pass, and 4 -> 2 is free and untested. So the
// optimal opening move was to NEVER START A JOB, which strictly dominates the
// idle half of an idle game, and a satchel every two taps turns loot from an
// event into a stream of duplicates the pack already refuses ("Another X. You
// already have one").
//
// Three rules, and NO NEW FIELD ON `Slice` (see the note at the bottom):
//
//   1. FIRST TIME THROUGH IS UNTOUCHED. A crossing that takes you somewhere you
//      have never stood pays the full 20/8 whatever your level. Nobody's first
//      walk through this game is worth less than it was yesterday — that is the
//      whole of "the fix is invisible to a player who is just playing".
//   2. AFTER THAT IT PAYS WHAT IT STILL TEACHES. Divided by
//      `1 + max(0, modifier(level, demand))` — the dice's own measure of how far
//      past a check you are, three levels to a step, capped at 6. A worn-out
//      crossing bottoms out at 20/7 -> 3 and 8/7 -> 1 and NEVER at 0, because
//      failure is a plateau: it still moves you, and it still pays.
//   3. A SATCHEL IS ONLY PACKED WHEN THE EDGE STILL OWES YOU ONE — when it can
//      drop something you are not already carrying, counting satchels you have
//      not opened yet, or "never open them" would just be the new farm.
//
// After, same hour, same pace — `test/slice.test.ts` measures it rather than
// asserting it from memory:
//
//     timer, unattended               :  5,400 XP  ·     0 satchels
//     pacing The Stack <-> The Tally  :  5,030 XP  ·     2 satchels  (0.93x)
//     ...hoarding the satchels unopened: 5,031 XP  ·     1 satchel
//
// Pacing is now worth about what leaving the tab open is worth, so the reason to
// walk an edge again is the key behind it, not the number beside it. The best
// farm left is rotating five skills across the five loot edges, which resets the
// divisor per skill: ~7,900 XP an hour BEFORE the transit taps between regions,
// so ~1.2x rather than 4.2x — and it is a player walking the whole map with
// their thumb down for an hour, which is a game being played, not a loop.
//
// Rejected on the numbers: dividing by `1 + (level − demand)` instead of by the
// modifier's three-level step. It measures 2,641 XP an hour paced (0.49x) and
// 4,320 rotating (0.80x) — active play strictly WORSE than leaving the tab shut,
// which is the same defect with the sign flipped.
//
// ---- What this deliberately does NOT do ----
// It does not block movement on a failed check. That would turn a 45% roll into
// a wall, and `docs/DICE.md` §8 and `COMBAT.md` §4 both rule it out by name. A
// check you failed is still walkable, still moves you, still pays, and still
// owes you its drop — which is exactly how a player collects a key they missed,
// and exactly what `test/slice-completable.test.ts` does 600 times a seed.
//
// ---- Why no new field on `Slice` ----
// A per-edge visit counter would be exact. It would also be a map of every edge
// ever walked living in every save, a branch in `decode`, and a migration — for
// a number `seen` and `xp` already imply between them: where you have been, and
// how far past this check you are. The one approximation it costs: reaching a
// place by a free edge before the tested one spends that place's "first time"
// (109 -> 103 before 101 -> 103). At that point your level is at or under the
// demand anyway, so the divisor is 1 and nothing is actually lost.

/** XP for a crossing that still tests you. */
export const PASS_XP = 20;
export const FAIL_XP = 8;

/** What a tested edge pays. Exported because a farm you cannot measure is a
 *  farm you cannot claim to have fixed — see the guard in `test/slice.test.ts`. */
export function crossingXp(
  s: Slice,
  t: { skill: SkillId; demand: number },
  passed: boolean,
  first: boolean,
): number {
  const base = passed ? PASS_XP : FAIL_XP;
  if (first) return base;
  const past = Math.max(0, modifier(level(s, t.skill), t.demand));
  return Math.max(1, Math.round(base / (1 + past)));
}

/** Has this edge still got something in it for you?
 *
 *  ⚠️ COUNTS UNOPENED SATCHELS, and a pending one counts for BOTH of its
 *  outcomes. Without that, the farm just moves: hoard the satchels, never tap
 *  one, and the edge never notices you are carrying what it drops. Opening it
 *  resolves to one item and leaves the other still owed, so nothing is stranded. */
export function owes(s: Slice, loot: Drop): boolean {
  const held = (id: ItemId): boolean =>
    s.pack.includes(id) || s.satchels.some((d) => d.good === id || d.poor === id);
  return !held(loot.good) || (loot.poor !== undefined && !held(loot.poor));
}

export function apply(state: Slice, action: Action): Slice {
  switch (action.type) {
    case 'travel': {
      const here = PLACE.get(state.at);
      const c = here?.choices.find((x) => x.to === action.to);
      if (!c) return state;
      if (blocked(state, c)) return state;

      const dest = PLACE.get(action.to);
      if (!dest) return state;

      // Read BEFORE `seen` grows below, or every crossing is a first one.
      const first = !state.seen.includes(action.to);

      let next: Slice = {
        ...state,
        at: action.to,
        seen: state.seen.includes(action.to) ? state.seen : [...state.seen, action.to],
        // ⚠️ TRAVEL CANCELS THE JOB. A timer that keeps running somewhere you
        // are not is a second place the player exists, and there is no screen
        // for that. Leaving is abandoning the work, and the XP already banked
        // is kept.
        job: null,
        lastRoll: null,
        said: `${dest.name}.`,
      };

      if (c.test) {
        const r = check(state.seed, level(state, c.test.skill), c.test.demand);
        next = {
          ...next,
          seed: r.seed,
          lastRoll: r,
          xp: award(next, c.test.skill, crossingXp(state, c.test, r.passed, first)),
          said: r.crit === 'triumph' ? `A perfect throw. ${c.test.win}`
            : r.crit === 'disaster' ? `Both dice come up one. ${c.test.lose}`
            : r.passed ? c.test.win : c.test.lose,
          // ★ LOOT IS A SATCHEL, NOT AN ITEM. It arrives unopened so the roll
          // that decides what is in it happens under the player's thumb. That
          // is the whole of "dice throws feel good": the throw has to be a
          // thing you DO, not a thing you are told about afterwards.
          // ...and only while the edge still `owes` you one, or it is a stream.
          satchels: c.test.loot && r.passed && owes(state, c.test.loot)
            ? [...next.satchels, c.test.loot]
            : next.satchels,
        };
      }
      return next;
    }

    case 'work': {
      const here = PLACE.get(state.at);
      if (!here?.work || here.work.id !== action.id) return state;
      if (state.job) return state;
      return {
        ...state,
        lastRoll: null,
        job: { work: action.id, at: state.at, left: here.work.secs },
        said: `${here.work.label}…`,
      };
    }

    case 'tick': {
      if (!state.job || action.secs <= 0) return state;
      const here = PLACE.get(state.job.at);
      const w = here?.work;
      if (!w) return { ...state, job: null };

      // ⚠️ BANKED TIME COMPLETES WHOLE ACTIONS AND ROLLS NOTHING. Absence pays
      // XP, which is not random, and hands over satchels, which are. The dice
      // wait for the player. That is what keeps "no mechanic requires checking
      // in" true at the same time as "the throw is something you do".
      let left = state.job.left - action.secs;
      let done = 0;
      while (left <= 0) { done++; left += w.secs; }
      if (done === 0) return { ...state, job: { ...state.job, left } };

      return {
        ...state,
        xp: award(state, w.skill, w.xp * done),
        job: { ...state.job, left },
        said: done === 1
          ? `+${w.xp} ${SKILLS[w.skill].name}.`
          : `+${w.xp * done} ${SKILLS[w.skill].name}, ${done} times over.`,
      };
    }

    case 'open': {
      const drop = state.satchels[0];
      if (!drop) return state;
      // The drop table. 2d10, so the middle is common and the ends are the
      // good stuff — the curve is the reason for 2d10 over a flat d20.
      // ⚠️ A SATCHEL IS AN UNMODIFIED ROLL. No skill helps here on purpose —
      // loot is the one place the dice are not a test of you, which is what
      // makes opening one feel different from crossing the weir.
      //
      // `2d10 ≥ 8` is 79%, so the key is the usual outcome and the cord is the
      // 21% disappointment. Progression is not luck-gated: the check that pays
      // the satchel can be walked again, so a bad roll costs a trip, never a run.
      const r = check(state.seed, 0, 0);
      const got = r.total >= 8 ? drop.good : drop.poor;
      const rest = state.satchels.slice(1);
      if (!got) {
        return {
          ...state,
          seed: r.seed,
          satchels: rest,
          lastRoll: r,
          said: 'Empty. Something was in it once, and the check can be walked again.',
        };
      }
      const already = state.pack.includes(got);
      const item = ITEMS[got] ?? { name: got, opens: 'nothing' };
      return {
        ...state,
        seed: r.seed,
        satchels: rest,
        lastRoll: r,
        pack: already ? state.pack : [...state.pack, got],
        said: already
          ? `Another ${item.name}. You already have one.`
          : `A ${item.name} — it opens ${item.opens}.`,
      };
    }
  }
}
