// SIX PLACES SOMEBODY WROTE.
//
// ⚠️ THIS IS THE WHOLE CORRECTION. The last build generated 4,096 places from a
// taxonomy and authored prose for 50 of them — 1.2% — and the owner's verdict on
// playing it was "just two choices which lead to more choices, but there is no
// story or meaning behind them" (`docs/RESET.md`). A hierarchy has no
// protagonist and no reversal, so no amount of it becomes a plot.
//
// So: six places, every word of them written, and a generator is not allowed
// near this file. `docs/VISION.md` rules it out by name.
//
// Prose here is a DRAFT for the owner to iterate on (CLAUDE.md — player-facing
// prose is machine-drafted and owner-edited). The bar is a line the owner would
// defend, and these have not had their pass yet.
import type { SkillId } from './engine';

export type ItemId = 'lead-strip' | 'reed-cord';

export interface Choice {
  /** Where it goes. */
  to: number;
  /** What the button says. A verb, always. */
  label: string;
  /** A skill check on the way. Failing does not block the move — it changes
   *  what you find, which is the only kind of failure this game has. */
  test?: { skill: SkillId; demand: number; win: string; lose: string; loot?: boolean };
  /** What you must already carry. Shown, never hidden. */
  needs?: { skill: SkillId; level: number } | { item: ItemId };
}

export interface Place {
  id: number;
  /** The name on the dot. */
  name: string;
  /** 40–70 words, and it never scrolls (`docs/GAME_DESIGN.md`). */
  body: string;
  choices: Choice[];
  /** A timed action offered here. One slot, repeatable. */
  work?: { id: string; label: string; skill: SkillId; secs: number; xp: number };
}

export const START = 0;

export const PLACES: readonly Place[] = [
  {
    id: 0,
    name: 'The Cut',
    body:
      'A road that was a river, or a river that gave up. Water still runs '
      + 'somewhere under the stones — you can hear it arguing with itself. '
      + 'Downhill the cut widens. Uphill it does not. Someone has stacked three '
      + 'flat rocks at the fork, recently, and stacking rocks is not something '
      + 'the weather does.',
    work: { id: 'listen', label: 'Listen to the water', skill: 'lore', secs: 20, xp: 30 },
    choices: [
      { to: 1, label: 'Follow the cut down' },
      { to: 2, label: 'Climb toward the stacked rocks' },
    ],
  },
  {
    id: 1,
    name: 'The Weir',
    body:
      'The water reappears here and is immediately put to work. A wooden weir, '
      + 'far better built than anything else in the valley, holds it back for no '
      + 'reason you can see — there is no mill, no field, no house. Just a very '
      + 'good gate, keeping water from going where water was going anyway.',
    work: { id: 'sound', label: 'Sound the depth', skill: 'wayfaring', secs: 30, xp: 45 },
    choices: [
      { to: 3, label: 'Cross on the weir' , test: {
        skill: 'wayfaring', demand: 4,
        win: 'You read the current and cross dry.',
        lose: 'You cross wet, and slower, and something in the water takes an interest.',
      } },
      { to: 0, label: 'Back up the cut' },
    ],
  },
  {
    id: 2,
    name: 'The Stack',
    body:
      'Three flat rocks, and under the top one a strip of lead with marks '
      + 'scratched into it. Not writing — or not writing you know. The marks are '
      + 'evenly spaced, and there are exactly as many of them as there are steps '
      + 'from here back to the fork. Somebody counted. Somebody expected to '
      + 'forget.',
    choices: [
      { to: 4, label: 'Read the marks', test: {
        skill: 'lore', demand: 3, loot: true,
        win: 'The spacing is a tally, and the tally is a key.',
        lose: 'The marks stay marks. You have looked at them long enough to know that.',
      } },
      { to: 0, label: 'Back down to the fork' },
    ],
  },
  {
    id: 3,
    name: 'The Far Bank',
    body:
      'Reeds, and a path through them that someone keeps clear. It runs two '
      + 'ways: toward a low door set into the hillside, and back to the weir you '
      + 'just crossed. The door has no handle. It has a slot, at the height of a '
      + 'hand, the width of a strip of lead.',
    work: { id: 'reeds', label: 'Cut reeds', skill: 'craft', secs: 25, xp: 35 },
    choices: [
      { to: 5, label: 'Open the low door', needs: { item: 'lead-strip' } },
      { to: 1, label: 'Back across the weir' },
    ],
  },
  {
    id: 4,
    name: 'The Tally',
    body:
      'You sit with the lead strip until the marks stop being marks. It is a '
      + 'count of paces and turns, and it ends at a door. Whoever cut it did not '
      + 'trust themselves to remember the way — and then left the instructions '
      + 'under a rock, where anyone could find them, which is not what a careful '
      + 'person does.',
    choices: [
      { to: 2, label: 'Back to the stack' },
      { to: 3, label: 'Take the tally to the far bank', needs: { skill: 'wayfaring', level: 3 } },
    ],
  },
  {
    id: 5,
    name: 'Behind the Door',
    body:
      'A room the size of a room. Dry, swept, and lit by nothing you can '
      + 'locate. On the far wall, at the height of a hand, another slot — and '
      + 'beside it the same tally cut again, deeper, by someone with more time. '
      + 'The count is longer this run. You are certain, and you cannot say how.',
    choices: [
      { to: 3, label: 'Step back out' },
    ],
  },
];

export const PLACE = new Map(PLACES.map((p) => [p.id, p]));

/** Every edge the board draws, both directions collapsed to one line. */
export const EDGES: ReadonlyArray<{ a: number; b: number }> = (() => {
  const seen = new Set<string>();
  const out: Array<{ a: number; b: number }> = [];
  for (const p of PLACES) {
    for (const c of p.choices) {
      const k = p.id < c.to ? `${p.id}:${c.to}` : `${c.to}:${p.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ a: p.id, b: c.to });
    }
  }
  return out;
})();

/** What a drop can be. Keys and passwords, per `BRIEF.md` ask 10 — a drop is
 *  worth wanting because it opens something you have already seen shut. */
export const ITEMS: Record<ItemId, { name: string; opens: string }> = {
  'lead-strip': { name: 'strip of lead', opens: 'the low door' },
  'reed-cord': { name: 'reed cord', opens: 'nothing yet' },
};
