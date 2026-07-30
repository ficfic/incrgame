// THE SLICE'S ENGINE. Pure: `apply(state, action) => state`.
//
// No DOM, no clock, no `Math.random()`. Time arrives as a `tick` action carrying
// how many seconds passed, which is what lets the same reducer serve the live
// screen, the offline catch-up and the tests without a branch in it.
import { PLACE, START, ITEMS } from './content';
import type { Choice, ItemId } from './schema';
import { check, odds as oddsOf, type Check } from './dice';

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

export interface Slice {
  version: number;
  /** The dice, carried in the save. See `dice.ts` for why this is still pure. */
  seed: number;
  at: number;
  seen: number[];
  xp: Record<SkillId, number>;
  pack: ItemId[];
  /** Unopened. ⚠️ Loot from banked time is NOT rolled while away — see `tick`. */
  satchels: number;
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
    version: 1,
    seed,
    at: START,
    seen: [START],
    xp: { wayfaring: 0, lore: 0, craft: 0, guile: 0, attunement: 0 },
    pack: [],
    satchels: 0,
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

export function apply(state: Slice, action: Action): Slice {
  switch (action.type) {
    case 'travel': {
      const here = PLACE.get(state.at);
      const c = here?.choices.find((x) => x.to === action.to);
      if (!c) return state;
      if (blocked(state, c)) return state;

      const dest = PLACE.get(action.to);
      if (!dest) return state;

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
          xp: award(next, c.test.skill, r.passed ? 20 : 8),
          said: r.crit === 'triumph' ? `A perfect throw. ${c.test.win}`
            : r.crit === 'disaster' ? `Both dice come up one. ${c.test.lose}`
            : r.passed ? c.test.win : c.test.lose,
          // ★ LOOT IS A SATCHEL, NOT AN ITEM. It arrives unopened so the roll
          // that decides what is in it happens under the player's thumb. That
          // is the whole of "dice throws feel good": the throw has to be a
          // thing you DO, not a thing you are told about afterwards.
          satchels: next.satchels + (c.test.loot && r.passed ? 1 : 0),
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
      if (state.satchels <= 0) return state;
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
      const got: ItemId = r.total >= 8 ? 'lead-strip' : 'reed-cord';
      const already = state.pack.includes(got);
      const item = ITEMS[got] ?? { name: got, opens: 'nothing' };
      return {
        ...state,
        seed: r.seed,
        satchels: state.satchels - 1,
        lastRoll: r,
        pack: already ? state.pack : [...state.pack, got],
        said: already
          ? `Another ${item.name}. You already have one.`
          : `A ${item.name} — it opens ${item.opens}.`,
      };
    }
  }
}
