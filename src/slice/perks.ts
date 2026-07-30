// WHAT A LEVEL HANDS YOU, FREE, THE MOMENT YOU REACH IT.
//
// The gap this closes: levels 8–30 are 39,000 of the game's 39,362 XP and they
// unlocked nothing at all. A bar that only fills is a progress bar, not
// progression.
//
// ---- THE LANE, AND THE TWO IT IS NOT ---------------------------------------
//
// Three different things are often called "an unlock". This file owns exactly
// one of them, and two sibling modules own the others:
//
//   1. A GATE — "this level lets me GO somewhere". A door in the content that
//      names a level. That is `needs: { skill, level }` on a `Choice`, it lives
//      in `regions/*.ts`, and NOTHING in this file emits, reads or reasons
//      about a gate. Grep it: no `needs`, no `blocked`, no `Choice`.
//   2. A PURCHASE — "this money lets me get better". A currency and upgrades
//      you buy. Every perk here costs nothing, is never chosen, cannot be
//      declined, and has no price field. If you find yourself adding one, it
//      belongs in the economy module, not this one.
//   3. THIS FILE — "this level lets me DO something new, or do it better". It
//      arrives on its own, the moment the level ticks over. RuneScape: 15 lets
//      you catch a new fish, 30 lets you swing a better axe, nobody paid.
//
// ---- TWO PROPERTIES THAT MAKE THIS CHEAP TO WIRE ---------------------------
//
// **Every perk is a pure function of XP.** No perk needs a new save field, a
// charge, a cooldown, a "once per place", or a flag someone has to remember to
// set. `powers(save.xp)` is the whole integration; nothing has to be migrated,
// and a save that has never heard of this file gets its perks the instant it
// loads. That is deliberate: six people are editing this repo today.
//
// **Nothing is ever lost.** A level cannot go down, so `active` is monotone in
// XP by construction — there is no expiry, no decay, no lapse and no path in
// this file that removes a perk. Failure is a plateau. `test/slice-perks.test.ts`
// asserts the monotonicity rather than trusting the prose.
//
// ---- THE LADDER: TWELVE ENTRIES, NOT SIXTY --------------------------------
//
// The trap is twelve coefficients per skill: sixty numbers that look like
// content and are read by nobody. So: three shared *practice* rungs (the rate),
// written once and given to every skill, plus one or two SIGNATURE unlocks per
// skill that only that skill can give you. Twelve authored entries in total;
// each skill's ladder is four to five rungs spread from 5 to 28. If a rung
// could not carry a line worth reading, it was cut for being a coefficient.
//
// Across all five skills something arrives at levels 5, 6, 8, 9, 12, 14, 18,
// 20, 21, 23, 24, 26 and 28 — the mass sits high, where the XP is.
//
// ---- THE RATE ARITHMETIC (stated, because an incremental lives on it) ------
//
// One rate axis only: `take`, the XP a completed action pays, per skill, from
// that skill's own level. Additive so it is exact in binary and cannot compound
// into an explosion:
//
//     take(L) = 1 + Σ practice rungs reached
//     L <  8 → 1.00      L 10 → 1.25      L 20 → 1.50      L 30 → 2.00
//
// Doubling over ~8 action-hours, in three steps a player can feel, and the last
// step lands at 28 where the levels are dear enough to need one. It cannot run
// away: a skill's take is driven by its OWN level, so no cross-feed, and the ×2
// only ever applies to the last two levels of a skill.
//
// ⚠️ ONE WIRING NOTE FOR `tick`. When banked time completes a batch of actions
// that crosses a practice threshold, pay the whole batch at the take you had
// when the batch STARTED. It underpays by a rung for at most one batch and can
// never overpay, which is the right side to be wrong on.
//
// ---- PROVEN RED (CLAUDE.md rule 4) ----------------------------------------
//
// Sabotage 1: `reached()` `>=` → `>`, the off-by-one at a threshold.
//   → 6 failed | 16 passed. "holds for every rung on every ladder":
//     AssertionError: expected false to be true.
// Sabotage 2: practice rung 28 `add: 0.5` → `0.25`.
//   → 4 failed | 18 passed. "is 1.25 / 1.50 / 2.00 at levels 10 / 20 / 30":
//     AssertionError: expected 1.75 to be 2.
// Sabotage 3: `nextUnlock`'s `p.level > have` → `>=` (a rung you already hold
//   offered back as the next one).
//   → 3 failed | 19 passed. "at a boundary, next is the rung AFTER the one just
//     landed": AssertionError: expected 8 to be 18.
// All three reverted; 22 passed afterwards.
import { levelFor, xpForLevel, LEVEL_CAP } from './engine';
import type { SkillId } from './schema';

/** What a perk does. A tagged union rather than a bag of booleans, so the
 *  engine and the UI switch on it instead of guessing, and so adding a kind is
 *  a compile error everywhere it matters. */
export type Effect =
  /** More XP from every completed action in this skill. The one rate axis. */
  | { kind: 'take'; add: number }
  /** The satchel roll's target moves DOWN, so more opens land on the good item. */
  | { kind: 'satchel-target'; to: number }
  /** A failed test still leaves the satchel behind. */
  | { kind: 'loot-on-fail' }
  /** A road names its far end before you walk it. */
  | { kind: 'reads-roads' }
  /** Any place you have stood can be re-read without walking back to it. */
  | { kind: 'recall' }
  /** An unopened satchel says which two things it could be. */
  | { kind: 'reads-satchels' }
  /** Travel straight to any place you have already stood. */
  | { kind: 'reach-any-seen' }
  /** The board draws this many roads BEYOND the places you have seen. */
  | { kind: 'sight'; hops: number };

export interface Perk {
  /** Stable, and stable is the point — the UI keys "new!" markers off it and a
   *  save never stores it. `<skill>-<name>`. */
  id: string;
  skill: SkillId;
  /** The level it arrives at. Never above `LEVEL_CAP`. */
  level: number;
  /** One line, player-facing, in the valley's voice: dry, concrete, no adjective
   *  piles, and it never prints a numeral — the HUD owns the numbers. */
  label: string;
  effect: Effect;
}

/** THE PRACTICE RUNGS — the rate, shared by all five skills.
 *
 *  Written once. Five copies of the same three lines with different flavour
 *  would be fifteen entries saying one thing; a skill's identity is in its
 *  signature perks below, not in how fast it pays. */
const PRACTICE: ReadonlyArray<{ level: number; add: number; label: string }> = [
  {
    level: 8,
    add: 0.25,
    label: 'The first hour taught you the trick. Every hour after it collects on the lesson.',
  },
  {
    level: 18,
    add: 0.25,
    label: 'You have done this often enough that your hands get on with it without asking.',
  },
  {
    level: 28,
    add: 0.5,
    label: 'There is nothing left in this to learn, so all of it is yield.',
  },
];

/** THE SIGNATURE UNLOCKS — what only this skill can hand you.
 *
 *  Two rules held these to nine entries: it must be a thing you could not do at
 *  all before (or a thing whose limit visibly moves), and it must be a pure
 *  function of XP, so wiring it costs the orchestrator no save field. */
const SIGNATURE: Record<SkillId, ReadonlyArray<Omit<Perk, 'skill'>>> = {
  wayfaring: [
    {
      id: 'wayfaring-reads-roads',
      level: 5,
      label: 'You can tell where a road goes before you walk it. The board names the far end.',
      effect: { kind: 'reads-roads' },
    },
    {
      // The memorable one, and the one that quietly serves the twist: you stop
      // walking and start arriving.
      id: 'wayfaring-reach-any-seen',
      level: 24,
      label: 'Any place you have stood is one step away. You do not walk it again; you simply arrive.',
      effect: { kind: 'reach-any-seen' },
    },
  ],
  lore: [
    {
      id: 'lore-recall',
      level: 6,
      label: 'You keep notes now, and they are legible. Anywhere you have stood can be read from here.',
      effect: { kind: 'recall' },
    },
    {
      id: 'lore-reads-satchels',
      level: 21,
      label: 'A satchel tells you what it holds. It does not tell you which of the two you get.',
      effect: { kind: 'reads-satchels' },
    },
  ],
  craft: [
    // Craft owns WHAT COMES OUT of a satchel; guile owns WHETHER YOU GET ONE.
    // Two thresholds, because a limit you watch move twice is worth more than a
    // limit that moves once and is never mentioned again.
    {
      id: 'craft-satchel-6',
      level: 12,
      label: 'You cut the cord instead of picking at it, and less is spoiled getting in.',
      effect: { kind: 'satchel-target', to: 6 },
    },
    {
      id: 'craft-satchel-4',
      level: 26,
      label: 'Almost nothing you open comes up empty now. You would have to be unlucky on purpose.',
      effect: { kind: 'satchel-target', to: 4 },
    },
  ],
  guile: [
    {
      // One signature, deliberately. Guile's gift is large enough that a second
      // would only dilute it — and "failure is a plateau, never a loss" is the
      // house rule it is built out of.
      id: 'guile-loot-on-fail',
      level: 20,
      label: 'A test you fail still leaves you the satchel. It does not leave you your dignity.',
      effect: { kind: 'loot-on-fail' },
    },
  ],
  attunement: [
    {
      // Distinct from wayfaring-reads-roads on purpose: that one names the far
      // end of a road you are STANDING ON. This draws places you have no road
      // to yet.
      id: 'attunement-sight-1',
      level: 14,
      label: 'The board draws one road further than you have been, and names what is at the end of it.',
      effect: { kind: 'sight', hops: 1 },
    },
    {
      id: 'attunement-sight-2',
      level: 23,
      label: 'Two roads further. You are seeing places nobody has told you about.',
      effect: { kind: 'sight', hops: 2 },
    },
  ],
};

const SKILL_IDS = Object.keys(SIGNATURE) as SkillId[];

/** Every skill's ladder, low to high. Frozen: a perk is a fact, not a setting. */
export const LADDER: Record<SkillId, readonly Perk[]> = Object.freeze(
  Object.fromEntries(
    SKILL_IDS.map((skill) => [
      skill,
      Object.freeze(
        [
          ...PRACTICE.map((p) => ({
            id: `${skill}-practice-${p.level}`,
            skill,
            level: p.level,
            label: p.label,
            effect: { kind: 'take', add: p.add } as Effect,
          })),
          ...SIGNATURE[skill].map((p) => ({ ...p, skill })),
        ].sort((a, b) => a.level - b.level),
      ),
    ]),
  ) as Record<SkillId, readonly Perk[]>,
);

/** Flat, every skill, low to high. For "what does this game even give me". */
export const ALL_PERKS: readonly Perk[] = Object.freeze(
  SKILL_IDS.flatMap((s) => LADDER[s]).sort((a, b) => a.level - b.level),
);

/** The engine's own satchel target today (`total >= 8` in `apply`'s `open`).
 *  Mirrored here so `satchelTarget()` can be dropped in where that literal is,
 *  and so there is one number to change if the drop table is ever retuned. */
export const BASE_SATCHEL_TARGET = 8;

/** Reached, i.e. `>=`. The whole file's off-by-one lives here, once, on purpose:
 *  a perk arrives AT its level and not one XP before. */
const reached = (xp: number, level: number): boolean => levelFor(xp) >= level;

/** What this skill has handed you at this XP, low to high. Cheap — four or five
 *  entries, no allocation beyond the filter. */
export function perksFor(skill: SkillId, xp: number): readonly Perk[] {
  return LADDER[skill].filter((p) => reached(xp, p.level));
}

/** THE RATE. XP a completed action in this skill pays, as a multiplier.
 *  1.00 → 1.25 (8) → 1.50 (18) → 2.00 (28). The hot path in `tick`, so it adds
 *  rather than reduces over objects. */
export function take(skillXp: number): number {
  let m = 1;
  for (const p of PRACTICE) if (reached(skillXp, p.level)) m += p.add;
  return m;
}

/** The 2d10 a satchel must beat to give its good item. Craft only lowers it. */
export function satchelTarget(craftXp: number): number {
  let t = BASE_SATCHEL_TARGET;
  for (const p of LADDER.craft) {
    if (p.effect.kind === 'satchel-target' && reached(craftXp, p.level)) {
      t = Math.min(t, p.effect.to);
    }
  }
  return t;
}

/** Everything the engine and the HUD need, resolved in one call.
 *
 *  Built for wiring: `const P = powers(state.xp)` at the top of a render or a
 *  reducer case and every question is a field lookup after that. */
export interface Powers {
  /** Per skill, the XP multiplier on a completed action. */
  take: Record<SkillId, number>;
  /** 2d10 target for a satchel's good item. Lower is better. */
  satchelTarget: number;
  /** A failed test still leaves its satchel. */
  lootOnFail: boolean;
  /** Choices name their destination. */
  readsRoads: boolean;
  /** Any seen place can be read from anywhere. */
  recall: boolean;
  /** An unopened satchel names its two possible items. */
  readsSatchels: boolean;
  /** Travel is allowed to any seen place, not only an adjacent one. */
  reachAnySeen: boolean;
  /** Roads drawn beyond the seen frontier. 0 = only what you have visited. */
  sight: number;
}

export function powers(xp: Record<SkillId, number>): Powers {
  const out: Powers = {
    take: { wayfaring: 1, lore: 1, craft: 1, guile: 1, attunement: 1 },
    satchelTarget: BASE_SATCHEL_TARGET,
    lootOnFail: false,
    readsRoads: false,
    recall: false,
    readsSatchels: false,
    reachAnySeen: false,
    sight: 0,
  };
  for (const skill of SKILL_IDS) {
    const got = xp[skill] ?? 0;
    for (const p of LADDER[skill]) {
      if (!reached(got, p.level)) continue;
      switch (p.effect.kind) {
        case 'take': out.take[skill] += p.effect.add; break;
        case 'satchel-target': out.satchelTarget = Math.min(out.satchelTarget, p.effect.to); break;
        case 'loot-on-fail': out.lootOnFail = true; break;
        case 'reads-roads': out.readsRoads = true; break;
        case 'recall': out.recall = true; break;
        case 'reads-satchels': out.readsSatchels = true; break;
        case 'reach-any-seen': out.reachAnySeen = true; break;
        case 'sight': out.sight = Math.max(out.sight, p.effect.hops); break;
      }
    }
  }
  return out;
}

/** THE MOST MOTIVATING LINE AN INCREMENTAL HAS: what you get next, and how far.
 *
 *  `null` when the ladder is spent — which is the honest answer at the top of a
 *  skill, and the UI should say "nothing more from this one" rather than invent
 *  a target. */
export interface Next {
  perk: Perk;
  /** The level it needs. */
  level: number;
  /** Total XP at which it arrives. */
  atXp: number;
  /** XP still to earn. Always > 0. */
  toGo: number;
  /** 0…1 from the previous rung to this one, for a bar. 0 at the moment the
   *  previous rung landed, approaching 1 as this one does. */
  progress: number;
}

export function nextUnlock(skill: SkillId, xp: number): Next | null {
  const have = levelFor(xp);
  const ladder = LADDER[skill];
  const perk = ladder.find((p) => p.level > have);
  if (!perk) return null;
  const atXp = xpForLevel(perk.level);
  // The bar starts where the last thing you got started it, not at zero, so a
  // rung at 28 does not read as "0%" for twenty levels.
  const prev = ladder.filter((p) => p.level <= have).pop();
  const from = prev ? xpForLevel(prev.level) : 0;
  const span = atXp - from;
  return {
    perk,
    level: perk.level,
    atXp,
    toGo: atXp - xp,
    progress: span > 0 ? Math.max(0, Math.min(1, (xp - from) / span)) : 1,
  };
}

/** Every skill's next rung at once, for a "what's coming" panel. Skills whose
 *  ladder is spent are absent, not null — an empty map means the ladder is
 *  finished everywhere. */
export function nextUnlocks(xp: Record<SkillId, number>): Partial<Record<SkillId, Next>> {
  const out: Partial<Record<SkillId, Next>> = {};
  for (const s of SKILL_IDS) {
    const n = nextUnlock(s, xp[s] ?? 0);
    if (n) out[s] = n;
  }
  return out;
}

/** The top of the ladder, for a test and for a doc that wants to be right. */
export const TOP_RUNG = Math.max(...ALL_PERKS.map((p) => p.level));
export { LEVEL_CAP };
