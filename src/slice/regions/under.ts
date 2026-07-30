// UNDER — the deep region. Ids 200-219.
//
// Hangs off Behind the Door (5). Eleven places, every word written.
//
// The spine: somebody has been down here before, kept count, and kept it in
// your handwriting. The stair numbers count DOWN from a number nobody started
// at. The gallery converges one-way, so the two branches stay separate: the
// quiet key is only ever found dry, the tallow stub only ever wet.
//
// The deepest room (209) puts you back at Behind the Door (5) — the slot on its
// far wall takes the key you used to get in. That edge is the whole point and
// it is a real edge, not a line of prose.
import type { Place, Region } from '../schema';

const PLACES: readonly Place[] = [
  // SEAM: entered from Behind the Door (5)
  {
    id: 200,
    name: 'The Counting Stair',
    body:
      'The stair goes down further than the hill is tall. Each step has a '
      + 'number cut into its edge, and the numbers do not start at one — they '
      + 'start at four hundred and something, and they count down. Someone '
      + 'began this stair in the middle. The dust on step three hundred and '
      + 'ninety holds a footprint. It is your size.',
    choices: [
      { to: 201, label: 'Go down to the water' },
      { to: 5, label: 'Climb back to the door' },
    ],
  },
  {
    id: 201,
    name: 'The Sump Fork',
    body:
      'The stair ends at standing water, ankle deep, perfectly still. Two ways '
      + 'out: a drain on the left, dry as paper, and steps on the right going '
      + 'down into the water and coming up again somewhere you cannot see. Both '
      + 'have been used. The drain more, and lately, and by someone in no hurry.',
    work: { id: 'under-sump', label: 'Watch the water', skill: 'attunement', secs: 35, xp: 45 },
    choices: [
      { to: 202, label: 'Take the dry drain', test: {
        skill: 'guile', demand: 4,
        win: 'You go in feet first and quiet, and nothing in the drain notices you arrive.',
        lose: 'You go in head first. Halfway along you meet scrape marks coming the other way, and they fit you.',
      } },
      { to: 205, label: 'Follow the steps under', test: {
        skill: 'wayfaring', demand: 5,
        win: 'You take the steps at the pace the water sets, and the surface barely closes behind you.',
        lose: 'You go down harder than you meant to. The water is warm, which is worse than cold would have been.',
      } },
      { to: 200, label: 'Back up the stair' },
    ],
  },
  {
    id: 202,
    name: 'The Dry Drain',
    body:
      'A pipe you can crawl in, and someone has, often enough to wear the '
      + 'bottom smooth. Every twenty paces there is a scratch on the left wall, '
      + 'at shoulder height for crawling. You count fourteen of them before the '
      + 'pipe opens out. You did not decide to count. You were already counting '
      + 'when you noticed.',
    choices: [
      { to: 203, label: 'Follow the scratches' },
      { to: 201, label: 'Back to the water' },
    ],
  },
  {
    id: 203,
    name: 'The Chalk Room',
    body:
      'A store room, shelves empty, every wall chalked over with tallies in '
      + 'five-bar gates. They run floor to ceiling and the room is not small. '
      + 'Near the door, low down, the strokes lean the way yours lean, and one '
      + 'gate is unfinished — four strokes, no crossbar. Somebody was '
      + 'interrupted at exactly this height.',
    work: { id: 'under-chalk', label: 'Count the gates', skill: 'lore', secs: 45, xp: 55 },
    choices: [
      { to: 204, label: 'Draw the fifth stroke', test: {
        skill: 'attunement', demand: 6, loot: { good: 'under-quiet-key', poor: 'under-wax-crumb' },
        win: 'The chalk is still soft. You close the gate, and the wall behind it gives.',
        lose: 'You close the gate and stop. Your hand knew the width of it before you looked.',
      } },
      { to: 202, label: 'Back into the pipe' },
    ],
  },
  {
    id: 204,
    name: "The Keeper's Cell",
    body:
      'A cell with a cot, a stool and a hook. On the hook a key, worn thin at '
      + 'the bit, hung where a right hand would find it without looking. The cot '
      + 'has been slept in and made again, badly, the way you make a bed. Under '
      + 'the stool: forty-one nail marks in the stone, and a nail.',
    choices: [
      { to: 208, label: 'Take the low passage on' },
      { to: 203, label: 'Back to the chalk' },
    ],
  },
  {
    id: 205,
    name: 'The Weeping Steps',
    body:
      'The steps go under and come up. Six of them are below the water and each '
      + 'one has been swept — no silt on them, none, though silt lies thick to '
      + 'either side. At the head of the far flight the water has been mopped up '
      + 'and wrung into a jar. The jar is full. The jar has been emptied before.',
    choices: [
      { to: 206, label: 'On, dripping' },
      { to: 201, label: 'Back to the fork' },
    ],
  },
  {
    id: 206,
    name: 'The Ledger Pool',
    body:
      'A round pool in a round room, and around it a shelf of books swollen '
      + 'shut with damp. One lies open, weighted flat with a stone. The left '
      + 'page is a list of dates. The right page is the same list, in the same '
      + 'hand, with one more line on it. Every book on the shelf is heavier at '
      + 'the back.',
    work: { id: 'under-ledger', label: 'Dry a page', skill: 'craft', secs: 50, xp: 60 },
    choices: [
      { to: 207, label: 'Read the wet page', test: {
        skill: 'attunement', demand: 7, loot: { good: 'under-tallow-stub', poor: 'under-wax-crumb' },
        win: 'The page gives up one word. The word is a date, and the date is today.',
        lose: 'It tears along a fold that was already there, folded once, by a thumb your width.',
      } },
      { to: 205, label: 'Back up the steps' },
    ],
  },
  {
    id: 207,
    name: 'The Bell Below',
    body:
      'No bell. A frame for one, and a rope, and the rope is warm. Somebody '
      + 'rang something here recently enough that the fibres have not cooled. On '
      + 'the frame, a stub of candle stuck down in its own tallow and lit and '
      + 'blown out so many times the drips have built a second candle under the '
      + 'first, and a fatter one.',
    choices: [
      { to: 208, label: 'Take the dry passage on' },
      { to: 206, label: 'Back to the pool' },
    ],
  },
  {
    id: 208,
    name: 'The Long Gallery',
    body:
      'A corridor with doors down one side and nothing down the other. All the '
      + 'doors stand open and all the rooms behind them are the same room: '
      + 'swept, empty, cold. At the end, two that are shut — one with a slot, '
      + 'one with a socket for a light. Both have been shut a long time. Both '
      + 'have been oiled since.',
    choices: [
      { to: 209, label: 'Turn the key in the slot', needs: { item: 'under-quiet-key' } },
      { to: 210, label: 'Set the light in the socket', needs: { item: 'under-tallow-stub' } },
      { to: 201, label: 'Climb back to the standing water' },
    ],
  },
  {
    id: 209,
    name: 'The Same Room',
    body:
      'Dry, swept, and lit by nothing you can locate. On the far wall, at the '
      + 'height of a hand, a slot — and beside it the tally cut a third time, '
      + 'deeper, by someone with more time than either of the others had. It is '
      + 'one stroke longer than the count at the door above. The last stroke is '
      + 'not dry yet.',
    choices: [
      { to: 5, label: 'Fit the key to this slot' },
      { to: 208, label: 'Back along the gallery' },
    ],
  },
  {
    id: 210,
    name: 'The Tallow Room',
    body:
      'A room kept for one job. A table, a rack of moulds, and a bowl of tallow '
      + 'going grey at the edge. Somebody makes candles here, and burns them '
      + 'here, and makes more. The rack holds forty-one moulds. Thirty-nine have '
      + 'been used. You know which two are next, and you do not know how you '
      + 'know that.',
    choices: [
      { to: 208, label: 'Back to the gallery' },
    ],
  },
];

export const UNDER: Region = {
  places: PLACES,
  items: {
    'under-quiet-key': { name: 'quiet key', opens: 'the slotted door at the end of the gallery' },
    'under-tallow-stub': { name: 'tallow stub', opens: 'the socket beside it' },
    // The consolation drop. Every satchel has to be able to disappoint, or the
    // 2d10 roll that opens it is decoration.
    'under-wax-crumb': { name: 'crumb of wax', opens: 'nothing' },
  },
};
