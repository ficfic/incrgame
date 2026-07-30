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
      { to: 301, label: 'Climb to the march stone' },
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
      { to: 303, label: 'Walk to the ninth cairn' },
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
