// THE STONES — the high region. Ids 300-319.
//
// Hangs off The Stack (2). Ten places, every word written.
//
// The spine: everything up here was put where it could be seen from somewhere
// else. Cairns sighted one to the next, a beacon laid ready for a signal, a
// turf wall with a slot in it aimed at the fork. Somebody marked the whole
// country for a person who would come later and not know the way — and then
// built one hollow that cannot be seen from any of it.
//
// The branch is at the march stone (301) and it has a cost. The ridge climbs
// to the beacon and stops at a shelter stone nobody can shift. The pin that
// shifts it is drawn from the gate of an empty sheepfold, at the bottom of the
// fold path, on the other side. The top of the hill opens with a thing found
// at the bottom of it.
//
// TWO LEVEL GATES, at the two ends of the curve, and both are the only way in
// to what is behind them:
//
//   2 Stack ─ 300 Cut Steps ═WAY 8═ 301 March Stone ─┬─(way)─ 302 Cairn Line
//                                                    │            ║ WAY 24
//                                                    │        303 Ninth Cairn
//                                                    │         ─ 304 Beacon ─[pin]─ 305 Long Sight
//                                                    └─(guile)─ 306 Fold ─ 307/308/309
//
// Wayfaring 8 is the price of the whole region; Wayfaring 24 is the price of
// its last three rooms, and 305 is the view the game has been pointing at since
// the first screen. A door near the cap has to be worth the walk.
import type { Place, Region } from '../schema';

const PLACES: readonly Place[] = [
  // SEAM: entered from The Stack (2)
  {
    id: 300,
    name: 'The Cut Steps',
    body:
      'Steps cut into the slope, and cut well. Sixty-one of them. The treads '
      + 'are worn deep in the middle, but only along the down-going edge — '
      + 'whoever used these came down far more often than they went up. Above, '
      + 'the valley stops mattering and the sky starts. Below, the stack, '
      + 'getting smaller.',
    choices: [
      // ★ GATE — Wayfaring 8. THE ONLY ROUTE into the stones. Everything from
      // 301 to 309 hangs off the march stone: 301's other two edges come back
      // up from 302 and 306, both of which are only reachable through 301, and
      // The Long Sight's one-way descent lands back here at 300. Raise it and
      // nine places strand — a third of the game.
      //
      // Fiction: the cut steps end. Above them nothing is cut, nothing is
      // marked, and the grazing looks identical on both sides of a boundary you
      // cannot yet see. Finding the stone is the skill.
      //
      // The arithmetic: level 8 is 517 XP, and `Sound the depth` at The Weir
      // pays Wayfaring 90 XP/min — under six minutes, and the player has almost
      // certainly banked some of it already crossing the weir and pacing ruts.
      { to: 301, label: 'Climb to the march stone', needs: { skill: 'wayfaring', level: 8 } },
      { to: 2, label: 'Back down to the stack' },
    ],
  },
  {
    id: 301,
    name: 'The March Stone',
    body:
      'A stone set upright, taller than you, with a groove down one face to '
      + 'shed the rain. It marks a boundary. On this side the ground is grazed. '
      + 'On the other side it is grazed. From up here you can see the weir, the '
      + 'fork, and a third thing you have no name for yet. The ridge goes left. '
      + 'The fold drops right.',
    choices: [
      { to: 302, label: 'Take the ridge', test: {
        skill: 'wayfaring', demand: 4,
        win: 'You hold the crest the whole way and the cairns come up one behind another, in the order they were built to arrive in.',
        lose: 'The mist takes the crest and you come at the cairns from below, from the side nobody built them to be seen from. From here they are heaps.',
      } },
      { to: 306, label: 'Drop to the fold', test: {
        skill: 'guile', demand: 3,
        win: 'You go down by the sheep-track, off the skyline, and nothing on this hill watches you do it.',
        lose: 'You go down the open way, on the skyline, in full view of four other hills. Whatever stands on them has the shape of you now.',
      } },
      { to: 300, label: 'Back to the steps' },
    ],
  },
  {
    id: 302,
    name: 'The Cairn Line',
    body:
      'Nine cairns along the crest, spaced so that standing at one you can see '
      + 'the next and no further. The eighth has fallen. These were stacked to '
      + 'be walked in fog by a person who did not know the way — which is to '
      + 'say, not by the person who stacked them. The ninth is smaller than the '
      + 'rest.',
    work: { id: 'stones-sight', label: 'Sight along the cairns', skill: 'wayfaring', secs: 40, xp: 45 },
    choices: [
      // ★ GATE — Wayfaring 24. NEAR THE CAP, and the only route to The Ninth
      // Cairn (303), The Beacon (304) and The Long Sight (305). 303 has one
      // edge in and it is this one; 304 hangs off 303; 305 hangs off 304 behind
      // the gate pin and leaves one-way down to 300. Raise it and the region's
      // whole crest strands.
      //
      // Fiction is already in the body above: THE EIGHTH HAS FALLEN. Nine
      // cairns were stacked so that from one you can see the next and no
      // further, which means the line is a chain of sightings and the chain is
      // broken. Holding a bearing across the gap, with nothing to aim at, is
      // the hardest wayfinding in the game — so it is priced like it.
      //
      // The arithmetic: level 24 is 13,049 XP. Best Wayfaring rate reachable is
      // `Sound the depth` at 90 XP/min (`Sight along the cairns`, right here,
      // is 67.5), so ~145 minutes — under one 8 h banked absence and well over
      // one sitting. That is the intent: the last door is one you come back to.
      // It is affordable because absence pays it, and it is the only gate in
      // the game that is.
      { to: 303, label: 'Hold the bearing to the ninth cairn',
        needs: { skill: 'wayfaring', level: 24 } },
      { to: 301, label: 'Back to the march stone' },
    ],
  },
  {
    id: 303,
    name: 'The Ninth Cairn',
    body:
      'It is not a cairn. It is a chimney, filled in. The stones are dressed on '
      + 'the inside faces, where nobody would ever see them, and the hollow at '
      + 'the base is lined with lead. Cold air comes out of it, steadily, on a '
      + 'still day. Something below is breathing out and has been for a while.',
    choices: [
      { to: 304, label: 'Follow the crest to the beacon', test: {
        skill: 'attunement', demand: 5,
        win: 'The cold breath keeps to the path exactly, the whole way, and stops where the beacon post stands.',
        lose: 'You lose the cold air within twenty paces and find the beacon the way anyone would, by looking. It is easier to reach than it ought to be.',
      } },
      { to: 302, label: 'Back along the line' },
    ],
  },
  {
    id: 304,
    name: 'The Beacon',
    body:
      'An iron basket on a post, and in it a fire laid but not lit: heather, '
      + 'then split pine, then peat, dry as paper under a lid of slate. Nobody '
      + 'has come up here in years and the kindling is this year\'s. From the '
      + 'basket you can see four more posts, on four more hills, and every one '
      + 'of them is loaded.',
    choices: [
      { to: 305, label: 'Lever the shelter stone aside', needs: { item: 'stones-gate-pin' } },
      { to: 303, label: 'Back to the ninth cairn' },
    ],
  },
  {
    id: 305,
    name: 'The Long Sight',
    body:
      'A seat cut into the rock, facing out, with a lip above it to throw the '
      + 'rain clear. From here the whole country is one shape, and you have seen '
      + 'that shape before: it is the spacing of the marks on the strip of lead, '
      + 'laid flat on the ground and walked. Somebody sat here and drew the '
      + 'valley as a row of ticks.',
    choices: [
      { to: 300, label: 'Take the whole descent at once' },
      { to: 304, label: 'Back to the beacon' },
    ],
  },
  {
    id: 306,
    name: 'The Fold',
    body:
      'A drystone ring the height of your chest, with a gate of hazel hurdles '
      + 'hung on one iron pin. No sheep. No droppings, no wool caught on the '
      + 'wall, nothing cropped — the grass inside stands as high as the grass '
      + 'outside. Somebody built a fold up here, never put anything in it, and '
      + 'has kept the pin oiled since.',
    work: { id: 'stones-coping', label: 'Re-set the coping stones', skill: 'craft', secs: 30, xp: 35 },
    choices: [
      { to: 307, label: 'Draw the gate pin', test: {
        skill: 'craft', demand: 4, loot: { good: 'stones-gate-pin', poor: 'stones-fleece-scrap' },
        win: 'The pin lifts out cold and clean and the gate sags open on nothing. You keep it. It is a lever as much as a hinge.',
        lose: 'The pin will not turn. You go over the wall instead, and see from the top that the gate was hung to open inward, against the hill, where no gate can swing.',
      } },
      { to: 309, label: 'Crawl into the hollow', test: {
        skill: 'guile', demand: 6,
        win: 'You come in low from the blind side, and the hollow keeps its habit of showing nothing, including you.',
        lose: 'You come in over the rim, upright, and stand a moment with five posts leaning in at you. Nothing happens. You are aware that nothing had to.',
      } },
      { to: 301, label: 'Back up to the march stone' },
    ],
  },
  {
    id: 307,
    name: 'The Bothy',
    body:
      'A shelter dug into the bank, turf roof, one window facing downhill. '
      + 'Inside: a hearth swept clean, a bed of cut heather, and on the shelf a '
      + 'bowl, a spoon and a knife, laid out for one. All three are set down '
      + 'facing the door. Nobody is here. The heather was cut this week.',
    work: { id: 'stones-hearth', label: 'Sit by the cold hearth', skill: 'attunement', secs: 25, xp: 30 },
    choices: [
      { to: 308, label: 'Take the sheep-track east' },
      { to: 306, label: 'Back to the fold' },
    ],
  },
  {
    id: 308,
    name: 'The Hide',
    body:
      'A wall of turf the height of a kneeling man, with a slot cut through it '
      + 'at eye level. Behind it the ground is worn to bare earth in the shape '
      + 'of somebody lying down. The slot frames one thing exactly, and it is '
      + 'not the fold, and it is not the road. It frames the three flat rocks at '
      + 'the fork.',
    choices: [
      { to: 309, label: 'Cut across to the hollow' },
      { to: 307, label: 'Back to the bothy' },
    ],
  },
  {
    id: 309,
    name: 'The Dead Ground',
    body:
      'A hollow behind the fold, three paces across, and the only ground up '
      + 'here that cannot be seen from anywhere else — not from the beacon, not '
      + 'from the march stone, not from the slot in the turf wall. Somebody '
      + 'tested that. Five short posts are driven around the rim. They all lean '
      + 'inward, and nothing is tied to them.',
    choices: [
      { to: 308, label: 'Crawl out east to the turf wall' },
      { to: 306, label: 'Back to the fold' },
    ],
  },
];

export const STONES: Region = {
  places: PLACES,
  items: {
    'stones-gate-pin': { name: 'iron gate pin', opens: 'the shelter stone below the beacon' },
    // The consolation drop, so the satchel roll can go badly.
    'stones-fleece-scrap': { name: 'scrap of fleece', opens: 'nothing' },
  },
};
