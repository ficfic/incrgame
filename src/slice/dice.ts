// 2d10, AND WHY THAT DOES NOT BREAK A PURE ENGINE.
//
// The owner: "my wife enjoys in games the most, loot and dice throws. So can we
// please introduce a 2d10 system for dice and likelihood and loot?"
//
// ⚠️ "NO RNG" PROTECTS DETERMINISM, NOT THE ABSENCE OF RANDOMNESS. The rule in
// CLAUDE.md exists so that a save replays identically, offline catch-up cannot
// disagree with what you watched happen, and a save exported from the phone
// behaves the same on a desktop. A seed carried IN THE SAVE and advanced by
// `apply` satisfies every one of those. `apply(state, action) => state` stays a
// pure function: same state, same action, same dice, forever.
//
// What would break it: `Math.random()`, which is not a function of state.
//
// See `docs/DICE.md`.

/** mulberry32. Chosen for three reasons and no others: it is one line of
 *  integer arithmetic, its state is a single uint32 that fits in the save as a
 *  number, and `Math.imul` is exact on every JS engine — so the phone and a
 *  desktop produce bit-identical sequences. A float-based generator would drift
 *  between platforms and the drift would be invisible until a save moved. */
export function next(seed: number): { seed: number; value: number } {
  let s = (seed + 0x6d2b79f5) | 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  t = (t ^ (t >>> 14)) >>> 0;
  return { seed: s >>> 0, value: t };
}

export interface Roll {
  seed: number;
  /** The two faces, for showing the dice. Order is stable. */
  dice: [number, number];
  /** 2..20. */
  total: number;
}

/** ONE ADVANCE PER ROLL, both dice drawn from the same word.
 *
 *  Deliberate: it makes "rolls consumed" equal "rolls resolved", so a sequence
 *  can be reconstructed by replaying actions and no bookkeeping is needed to
 *  say how far the generator has travelled. Two advances per roll would work
 *  and would make that audit twice as easy to get wrong. */
export function roll2d10(seed: number): Roll {
  const r = next(seed);
  const a = (r.value % 10) + 1;
  const b = (Math.floor(r.value / 10) % 10) + 1;
  return { seed: r.seed, dice: [a, b], total: a + b };
}

/** The target every check is against. 2d10 ≥ 11 is 55% bare — a real throw. */
export const TARGET = 11;

/** How far a level moves the odds. Clamped so no check is ever certain in
 *  either direction: ±6 spans 10% to 94%, and the middle is 55%.
 *
 *  ⚠️ THE LEVEL NEVER TOUCHES THE ROLL. Adding a 0–30 level to a 2–20 roll
 *  makes the dice decorative, which would defeat the entire reason this system
 *  was asked for. It shifts the TARGET, by a third of the gap between what you
 *  have and what the check demands, and stops shifting at ±6. */
export const MOD_CAP = 6;

export function modifier(level: number, demand: number): number {
  const m = Math.trunc((level - demand) / 3);
  return Math.max(-MOD_CAP, Math.min(MOD_CAP, m));
}

export interface Check {
  seed: number;
  dice: [number, number];
  total: number;
  mod: number;
  /** total + mod, which is what is compared to TARGET. */
  against: number;
  passed: boolean;
  /** Both 1% events on 2d10, and the only two outcomes that ignore the mod. */
  crit: 'triumph' | 'disaster' | null;
}

/** A skill check. Two 10s always pass, two 1s always fail — the 1% events are
 *  the memorable ones and a modifier must not be able to erase them. */
export function check(seed: number, level: number, demand: number): Check {
  const r = roll2d10(seed);
  const mod = modifier(level, demand);
  const against = r.total + mod;
  const crit = r.dice[0] === 10 && r.dice[1] === 10 ? 'triumph'
    : r.dice[0] === 1 && r.dice[1] === 1 ? 'disaster'
    : null;
  return {
    seed: r.seed,
    dice: r.dice,
    total: r.total,
    mod,
    against,
    passed: crit === 'triumph' ? true : crit === 'disaster' ? false : against >= TARGET,
    crit,
  };
}

/** The odds, exactly, for showing them BEFORE the tap.
 *
 *  Computed over all 100 outcomes rather than from a formula, because the
 *  formula is where an off-by-one hides and this number is shown to the player
 *  as a promise. `docs/COMBAT.md`'s "we show the outcome before you commit"
 *  becomes this: we show the ODDS.
 *
 *  The crits are already inside the count — a triumph is 11+ anyway, and a
 *  disaster (total 2) can only reach the target at mod +9, which the cap
 *  forbids. So no special case is needed and none is written. */
export function odds(level: number, demand: number): number {
  const mod = modifier(level, demand);
  let pass = 0;
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      if (a === 10 && b === 10) { pass++; continue; }
      if (a === 1 && b === 1) continue;
      if (a + b + mod >= TARGET) pass++;
    }
  }
  return pass / 100;
}
