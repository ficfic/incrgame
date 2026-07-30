// THE VALLEY — the opening region. Ids 0-99.
//
// Six places, every word written. The first thing a player sees, so it teaches
// the whole grammar of the game and nothing else: a place has prose, a choice
// is a dot, some choices throw dice, some doors say what they want.
//
// Seams out of here:
//   The Weir (1)          -> the works    (100+)
//   The Stack (2)         -> the stones   (300+)
//   Behind the Door (5)   -> under        (200+)
import type { Place, Region } from '../schema';

const PLACES: readonly Place[] = [
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
      // SEAM -> the works (100+). The weir holds the water back FOR something,
      // and the something is downstream of it.
      { to: 100, label: 'Follow the held water' },
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
        skill: 'lore', demand: 3, loot: { good: 'lead-strip', poor: 'reed-cord' },
        win: 'The spacing is a tally, and the tally is a key.',
        lose: 'The marks stay marks. You have looked at them long enough to know that.',
      } },
      // SEAM -> the stones (300+). The marks count steps, and steps go up too.
      { to: 300, label: 'Climb past the stack' },
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
      // ⚠️ THIS GATE IS NOT LOAD-BEARING AND IS NOT PRETENDING TO BE. The Far
      // Bank is reachable from The Weir by crossing, and that crossing is a
      // dice CHECK, which never stops anybody. So this door is a shortcut with
      // a price on it, not the only way to anything — raise it to 30 and every
      // test stays green, which is exactly how this file once held the game's
      // ONLY skill gate while stopping nobody.
      //
      // It stays for two reasons: `test/slice.test.ts` pins its wording as the
      // example of a legible gate ("needs Wayfaring 3 — you are 1"), and level
      // 3 is 88 XP, so its whole job is to teach the grammar in the first
      // minute. The gates that hold the game shut are in the other three region
      // files, at 5, 8, 10, 12, 18 and 24, and each one names what it is the
      // sole route to.
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
      // SEAM -> under (200+). The slot in the far wall is the same slot as the
      // low door's, and the tally beside it is cut a third time. Wired here
      // rather than in the region file because a region owns its own ids and
      // nothing else: the valley decides what the valley offers.
      { to: 200, label: 'Put the strip in the far slot', needs: { item: 'lead-strip' } },
      { to: 3, label: 'Step back out' },
    ],
  },
];


export const VALLEY: Region = {
  places: PLACES,
  items: {
    'lead-strip': { name: 'strip of lead', opens: 'the low door' },
    'reed-cord': { name: 'reed cord', opens: 'nothing yet' },
  },
};
