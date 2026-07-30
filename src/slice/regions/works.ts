// THE WORKS — ids 100-119. Hangs off The Weir (1).
//
// The weir holds water back for no reason you can see from the valley. This is
// the reason. Somebody cut a millrace, sank a wheel, and built a machine to
// lift a stone and let it down again, forever, keeping count — and then left,
// and the count is still being kept, and it has been started over before.
//
// Shape: a fork at The Wheelhouse that is not two doors to one room. The wet
// way holds the key; the dry way holds the lock. You do both or you do neither.
//
//   100 Headrace ─┬─ 101 Wheelhouse ─┬─(craft)─ 102 Pit ═CRAFT 10═ 104 Counting Room
//                 │                  │                     └ 106 Gate ─[key]─ 107 Drum
//                 │                  └─(wayfaring)─ 103 Tailrace ─(attunement)─ 105 Store
//                 └═WAY 5═ 108 Haul Road ─(lore)─ 109 Blockyard ─ 103
//
// `─(skill)─` is a dice CHECK: it never stops you, it changes what you find.
// `═SKILL n═` is a LEVEL GATE: it stops you until you have grown into it.
// Both gates below are the only way in to what is behind them — see the
// comments on each. Levels 5 and 10 are this region's share of a spread that
// runs 5 · 8 · 10 · 12 · 18 · 24 across the four regions.
//
// ⚠️ `works-gate-iron` is authored as found on the shelf at The Drowned Store
// (105), but `engine.ts`'s satchel table only mints valley items today, so
// nothing can actually put it in the pack yet. The door at 106 is correct and
// the key is reachable without it; granting it is the engine's problem, not
// this file's, and this file may not touch the engine.
import type { Place, Region } from '../schema';

const PLACES: readonly Place[] = [
  // SEAM: entered from The Weir (1)
  {
    id: 100,
    name: 'The Headrace',
    body:
      "The weir's water goes into a channel of cut stone and stops arguing. "
      + 'The blocks are dressed square and set without mortar, and the joints '
      + 'are tight enough that nothing grows in them. It runs level for two '
      + 'hundred paces, which the valley does not, so somebody made the valley '
      + 'agree to it. Downhill it goes into a building.',
    choices: [
      { to: 101, label: 'Follow the race down' },
      // ★ GATE — Wayfaring 5. THE ONLY ROUTE to The Haul Road (108) and, through
      // it, The Blockyard (109). 108's only other edge is 109 coming back up,
      // and 109's only other edge drops to the tailrace one-way, so nothing
      // reaches either of them except this climb. Raise it and both strand.
      //
      // The arithmetic: level 5 is 215 XP. `Sound the depth` at The Weir — one
      // step back up the race, open from the first minute of the game — pays
      // Wayfaring 45 XP per 30 s, so 90 XP/min, so five actions and about two
      // and a half minutes. The first gate a player meets should teach that a
      // shut door is a short wait, not a wall.
      { to: 108, label: 'Climb the haul road', needs: { skill: 'wayfaring', level: 5 } },
      { to: 1, label: 'Back to the weir' },
    ],
  },
  {
    id: 101,
    name: 'The Wheelhouse',
    body:
      'A wheel the height of four men, turning. Its axle goes into the wall, '
      + 'and the wall is thick, and whatever the axle turns in there makes no '
      + 'sound at all. Nothing is attached to this side. The wheel is greased. '
      + 'Grease dries in a season, and this grease is wet, and there is nobody '
      + 'here.',
    work: { id: 'bar-wheel', label: 'Bar the wheel over', skill: 'craft', secs: 35, xp: 40 },
    choices: [
      { to: 102, label: 'Go down into the wheel pit', test: {
        skill: 'craft', demand: 4,
        win: 'You shore the trough with a plank and go under it dry.',
        lose: 'You go under by the water side, wet, and the swept floor keeps your prints.',
      } },
      { to: 103, label: 'Take the tailrace out', test: {
        skill: 'wayfaring', demand: 5, loot: { good: 'works-gate-iron', poor: 'works-lead-sheet' },
        win: 'You time the fast water and walk the coping the whole way.',
        lose: 'The coping gives. The current puts you out further down than you meant to go.',
      } },
      { to: 100, label: 'Back up the race' },
    ],
  },
  {
    id: 102,
    name: 'The Wheel Pit',
    body:
      'Under the wheel, and dry. The water goes over your head in a wooden '
      + 'trough and comes down somewhere else. The floor is swept. Not clean — '
      + 'swept, in long strokes, from the arch inward, by something with a '
      + 'wider reach than an arm. The broom is not here. Beyond the arch, new '
      + 'props, badly set and bearing.',
    choices: [
      // ★ GATE — Craft 10. THE ONLY ROUTE to The Counting Room (104), and
      // through it the only route to The Gate (106) and The Drum (107): 104 has
      // no other edge in, 106 has no other edge in, and 107 hangs off 106
      // behind the gate iron. Raise it and three places strand, including the
      // machine the whole region is about.
      //
      // Fiction first: somebody propped this arch in a hurry and the props are
      // taking load they were not cut for. You do not duck through that. You
      // re-set it, or you leave.
      //
      // The arithmetic: level 10 is 832 XP. `Cut reeds` at The Far Bank pays
      // Craft 35 XP per 25 s (84 XP/min) and needs no key to stand on; `Bar the
      // wheel over` is in the room above at 40 per 35 s (69 XP/min). Ten to
      // twelve minutes, or one short absence.
      { to: 104, label: 'Re-prop the low arch', needs: { skill: 'craft', level: 10 } },
      { to: 101, label: 'Climb out of the pit' },
    ],
  },
  {
    id: 103,
    name: 'The Tailrace',
    body:
      'The water comes out the far side having done whatever was asked of it, '
      + 'and goes on down a channel that is still cut stone, still level. It '
      + 'should be tired. It is moving faster than it went in. Ahead the roof '
      + 'drops to meet the water, and there is a gap, and beside the gap '
      + 'somebody cut a handhold.',
    choices: [
      { to: 105, label: 'Go under the gap', test: {
        skill: 'attunement', demand: 3,
        win: 'You hold still until the cold stops mattering, and find the far side by feel.',
        lose: 'You take it in a hurry and come up blind. Something on a shelf is now on the floor.',
      } },
      { to: 101, label: 'Back up to the wheelhouse' },
    ],
  },
  {
    id: 104,
    name: 'The Counting Room',
    body:
      'A dry room off the pit, and a machine in it the size of a chair. A cam '
      + 'lifts a stylus; the stylus cuts one mark into a lead sheet; the sheet '
      + 'advances by a hair. It is counting the wheel. Stacked below it, forty '
      + 'sheets, filled edge to edge — and the top one has been started over.',
    work: { id: 'read-sheets', label: 'Read back the sheets', skill: 'lore', secs: 50, xp: 55 },
    choices: [
      { to: 106, label: 'Follow the rope down' },
      { to: 102, label: 'Back into the pit' },
    ],
  },
  {
    id: 105,
    name: 'The Drowned Store',
    body:
      'Chest deep, and cold enough to make your hands stupid. Shelves on both '
      + 'walls, under the water, each tool in its own notch and every notch '
      + 'filled. Nothing has ever been taken. On the end shelf, above the '
      + 'waterline, one iron key on a peg — and beside it a second peg, cut to '
      + 'the same shape, empty.',
    choices: [
      { to: 103, label: 'Wade back out' },
    ],
  },
  {
    id: 106,
    name: 'The Gate',
    body:
      'The passage ends in an iron gate, and past it stairs go down beside a '
      + 'rope. The rope is moving. Down, slowly, the whole time you stand here, '
      + 'and it never runs out. The lock is a plain one and it is mounted on '
      + 'this side, so whoever turned it was shutting somebody in, not out.',
    choices: [
      { to: 107, label: 'Unlock the gate', needs: { item: 'works-gate-iron' } },
      { to: 104, label: 'Back up to the counting room' },
    ],
  },
  {
    id: 107,
    name: 'The Drum',
    body:
      'A stone drum in a shaft, rope wound round it, and a block of dressed '
      + 'granite hanging under it that never reaches the bottom. The wheel '
      + 'winds it up. The gate lets it down. It has done this a great many '
      + 'times and made nothing at all. Cut into the drum, at the height of a '
      + 'hand: a slot.',
    choices: [
      { to: 106, label: 'Climb back to the gate' },
    ],
  },
  {
    id: 108,
    name: 'The Haul Road',
    body:
      'A road cut for sledges, wide as three carts, running up the spoil bank '
      + 'and stopping. Not at a quarry — at nothing, at grass, at the same '
      + 'slope it started from. The ruts in the stone are a hand deep. '
      + 'Something was dragged up here often enough to wear the road out, and '
      + 'it was not the stone.',
    work: { id: 'pace-ruts', label: 'Pace out the ruts', skill: 'wayfaring', secs: 40, xp: 45 },
    choices: [
      { to: 109, label: 'Follow the ruts to the yard', test: {
        skill: 'lore', demand: 3,
        win: 'You read the numbering off the first row and it takes you straight up the yard.',
        lose: 'You walk the rows twice before the order gives — and by then you have counted the gaps.',
      } },
      { to: 100, label: 'Back down to the race' },
    ],
  },
  {
    id: 109,
    name: 'The Blockyard',
    body:
      'Finished blocks, dressed and stacked in rows, waiting for a building '
      + 'nobody put up. Each carries a number cut into the face. They run into '
      + 'the hundreds, in order, and the order has gaps — blocks taken from the '
      + 'middle, which is the last place a person takes one from. Below the '
      + 'yard the tailrace comes out of the hill.',
    choices: [
      { to: 103, label: 'Go down to the tailrace' },
      { to: 108, label: 'Back down the haul road' },
    ],
  },
];

export const WORKS: Region = {
  places: PLACES,
  items: {
    'works-gate-iron': { name: 'gate iron', opens: 'the gate under the works' },
    'works-lead-sheet': { name: 'counted sheet', opens: 'nothing yet' },
  },
};
