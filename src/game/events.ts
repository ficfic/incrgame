// WHAT STANDS IN THE WAY OF A ROAD. The owner's design, verbatim:
//
//   *"the graph edges might have 2 to 3 stops while building it for the cyoa
//    events. they should not be visible but block progress until resolved"*
//
// So a pipe being laid halts partway, one of these surfaces in the dock, and
// the work does not move again until it is faced — with an Ironsworn action
// roll (see `dice.ts`). Which event, and where along the road it waits, is
// derived from the road's own key: deterministic, so the same road meets the
// same trouble on every device.
//
// ⚠️ EVERY LINE OF PROSE IN HERE IS ⟨draft⟩. Machine-drafted and owner-edited
// is the standing rule — the bar is a line the owner would defend, and these
// are starting points for their passes, not a finished surface. The MECHANICS
// are uniform on purpose (strong lifts momentum, weak costs mana, miss knocks
// the work back and momentum down) so the owner can rewrite any word of this
// file without touching a number.
import type { Stat } from './dice';
import type { Ground } from './stops';

export interface Choice {
  /** What you do — the button. */
  label: string;
  /** Which stat carries it. Shown beside the label with the dice. */
  stat: Stat;
  /** What happens, by tier. One line each, said AFTER the dice land. */
  strong: string;
  weak: string;
  miss: string;
}

export interface Happening {
  id: string;
  name: string;
  /** What is in the way, before you choose. */
  body: string;
  /** The grounds this trouble belongs to. */
  on: readonly Ground[];
  choices: readonly Choice[];
}

export const HAPPENINGS: readonly Happening[] = [
  {
    id: 'washout', name: 'A washout',
    on: ['moor', 'water'],
    body: 'The night\'s rain took the bank and a length of your trench with it. '
      + 'Brown water is still finding new ways through.',
    choices: [
      { label: 'Dig a soakaway first', stat: 'wits',
        strong: 'The water goes where you tell it. The trench drains by noon.',
        weak: 'It drains, mostly. You pay for the hours in mana.',
        miss: 'The soakaway becomes a second washout. The work slides back.' },
      { label: 'Drive the line through wet', stat: 'iron',
        strong: 'Mud to the knee and no time lost. The crew sings something filthy.',
        weak: 'Through — but the pumps drink mana all night.',
        miss: 'The trench swallows a barrow and nearly a man. You start that length over.' },
    ],
  },
  {
    id: 'oldstones', name: 'Old stones',
    on: ['moor', 'stone', 'crag'],
    body: 'The picks ring on worked stone a foot under the turf. Squared blocks, '
      + 'laid by nobody the kingdom remembers, running exactly where your pipe wants to go.',
    choices: [
      { label: 'Read them before you break them', stat: 'wits',
        strong: 'An older line, dead level, laid by better men. You run yours along its back and gain by it.',
        weak: 'You learn nothing, but breaking them costs care and mana.',
        miss: 'Under the third block there is a hollow. The survey was wrong here; the work slips back.' },
      { label: 'Break them and be quick', stat: 'iron',
        strong: 'Old work splits clean. The crew pockets a few squared corners for the camp wall.',
        weak: 'It breaks, slowly, and dulls half your steel — mana for the grinder.',
        miss: 'A block turns under the bar. The trench wall comes in with it.' },
      { label: 'Quiet word with the mason\'s ghost', stat: 'shadow',
        strong: 'You leave a cup of something on the stones at dusk. By morning they have settled aside. Nobody discusses it.',
        weak: 'Whatever listened wants paying. The mana goes somewhere.',
        miss: 'The crew hears you talking to a wall. Work stops while they redraw who sleeps where.' },
    ],
  },
  {
    id: 'toll', name: 'Somebody\'s cousin',
    on: ['moor', 'wood'],
    body: 'Three of them, one dog, and a chain across your line. The tall one '
      + 'says this ground has been their family\'s since before the king\'s road had an end.',
    choices: [
      { label: 'Talk it through by the fire', stat: 'heart',
        strong: 'By dark they are helping carry pipe, on the promise the line names their ford.',
        weak: 'They take a toll in mana and leave grinning. Cheaper than a feud.',
        miss: 'The talk sours. The chain stays and the day is gone with it.' },
      { label: 'Walk the chain down', stat: 'iron',
        strong: 'You lift the chain, fold it, and hand it back politely. The dog changes sides.',
        weak: 'They move — after a shoving match that costs you a barrow of fittings.',
        miss: 'The dog is faster than it looks. The crew scatters and the work slides back.' },
    ],
  },
  {
    id: 'sinking', name: 'The bog is drinking it',
    on: ['bog'],
    body: 'Yesterday\'s laid length has gone down a hand\'s width overnight, '
      + 'evenly, like something under there is swallowing with care.',
    choices: [
      { label: 'Raft the line on cut brush', stat: 'wits',
        strong: 'The old trick holds. The pipe rides the bog like a boat.',
        weak: 'It holds, but the brush-cutting eats mana and daylight.',
        miss: 'The raft ties into the roots of something that objects. Back a length.' },
      { label: 'Wade in and shore it by hand', stat: 'iron',
        strong: 'Cold, foul, effective. The line comes back up level.',
        weak: 'Shored — and the leeches take their toll, and the stove takes your mana.',
        miss: 'What is under there swallows faster than you shore. The bog keeps a length.' },
      { label: 'Watch the bog at night', stat: 'shadow',
        strong: 'You see what surfaces at moonset, and where. The line moves six feet and is left alone.',
        weak: 'You see enough to be careful. Care is slow and costs.',
        miss: 'It sees you first. Nobody works within a chain of the spot for a day.' },
    ],
  },
  {
    id: 'clearing', name: 'A clearing that was not surveyed',
    on: ['wood'],
    body: 'The trees stop in a circle no chart shows. Grass short as a kept lawn. '
      + 'The birds go around it, and now the crew wants to as well.',
    choices: [
      { label: 'Stake it and cross by day', stat: 'edge',
        strong: 'Quick feet, laid line, nobody looks back. The clearing keeps its opinion.',
        weak: 'Crossed — but tools left inside overnight are found politely stacked outside. Replacements cost.',
        miss: 'Halfway over, every stake is suddenly leaning the wrong way. The crew is out and not going back in today.' },
      { label: 'Go around it entirely', stat: 'wits',
        strong: 'The detour finds better ground than the survey did. You lose nothing.',
        weak: 'The long way round, paid in mana.',
        miss: 'The detour meets a gully the chart also missed. Back it goes.' },
    ],
  },
  {
    id: 'nightwatch', name: 'Lights on the crag',
    on: ['crag', 'stone'],
    body: 'Two nights running, a lantern where no path is, standing still for '
      + 'an hour and then not being there. The crew has started sleeping in shifts without being asked.',
    choices: [
      { label: 'Climb up and hail it', stat: 'heart',
        strong: 'A shepherd, half-mad with quiet, glad of tea. Knows every soft place on this hill and shares them.',
        weak: 'Nobody there — but the climb settles the crew, and costs a day\'s mana in nerves and rope.',
        miss: 'Nobody there. Your own lantern goes out twice on the way down. The crew works slower now.' },
      { label: 'Post a watch and work on', stat: 'shadow',
        strong: 'Whatever it is loses interest in being watched. The work does not slow.',
        weak: 'The watch costs wages — mana — and sleep, but the line moves.',
        miss: 'At moonset the watch is asleep and the toolshed is open. Nothing taken. Everything turned to face the wall.' },
    ],
  },
];

/** ⚠️ EVERY GROUND MUST HAVE TROUBLE. A ground with no happenings would make
 *  its roads silently event-free — checked in `test/happenings.test.ts`. */
export const happeningsOn = (g: Ground): Happening[] =>
  HAPPENINGS.filter((h) => h.on.includes(g));

// ---- FOES ---------------------------------------------------------------------
//
// ★★ SOME TROUBLE FIGHTS BACK, 2026-08-04 — the owner: *"an enemy encounter
// might happen on that same view."* A foe is trouble with STRENGTH: one roll
// does not settle it, rounds do. Strong hits mark two of its strength (three
// on matched dice), weak hits mark one and cost you, misses mark nothing and
// hurt — Ironsworn's progress-track fight, worn local. Killing it clears the
// halt and lifts momentum.
//
// ⚠️ EVERY LINE OF PROSE IN HERE IS ⟨draft⟩, same as above.

export interface Foe extends Happening {
  /** How much harm ends it. The whole difference between a foe and a
   *  happening: this is a track, not a coin flip. */
  strength: number;
}

export const FOES: readonly Foe[] = [
  {
    id: 'wights', name: 'Bog wights', strength: 3,
    on: ['bog', 'water'],
    body: 'Grey shapes stand up out of the pools, wearing the faces of drowned '
      + 'surveyors. They do not want the pipe here.',
    choices: [
      { label: 'Break them with iron', stat: 'iron',
        strong: 'The bar goes through one like wet peat. The others watch, and learn.',
        weak: 'They fall back a step. Something of yours goes under the water.',
        miss: 'Cold hands in the trench. The crew scrambles out and back.' },
      { label: 'Read what holds them here', stat: 'wits',
        strong: 'Old survey stakes, driven wrong. You pull one and a wight folds like fog.',
        weak: 'You learn a little. The night takes a little back.',
        miss: 'The reading is wrong, and the water is not where the map says.' },
    ],
  },
  {
    id: 'brigands', name: 'Toll brigands', strength: 3,
    on: ['moor', 'wood'],
    body: 'A rope across the way and four grinning reasons to respect it. They '
      + 'call it a toll. They have not said what happens if you refuse.',
    choices: [
      { label: 'Refuse, loudly', stat: 'iron',
        strong: 'The rope comes down and one of them with it. The rest reconsider the trade.',
        weak: 'They scatter — with a sack of yours as severance.',
        miss: 'More of them than you counted. The crew gives ground.' },
      { label: 'Slip round by night', stat: 'shadow',
        strong: 'By morning the rope guards an empty stretch of nothing.',
        weak: 'Round them — minus what fell from the packs at a dead run.',
        miss: 'A dog. Of course they had a dog.' },
    ],
  },
  {
    id: 'watcher', name: 'The stone watcher', strength: 4,
    on: ['stone', 'crag'],
    body: 'It was a standing stone until the crew\'s picks got close. Now it '
      + 'stands somewhere new each time you look, always nearer the trench.',
    choices: [
      { label: 'Topple it while it is stone', stat: 'iron',
        strong: 'It cracks along an old seam. Whatever wore it moves out and away.',
        weak: 'It rocks, and settles, and the ground you stood on does not.',
        miss: 'It is not stone when the pick lands. The crew runs a full length back.' },
      { label: 'Wait for it to walk, and watch', stat: 'wits',
        strong: 'You see how it moves, and where it cannot. The line bends past it, safe.',
        weak: 'You learn its gait. It learns your camp.',
        miss: 'You blink. It is between you and the trench, and the night is long.' },
    ],
  },
];

/** The foes a ground can produce. */
export const foesOn = (g: Ground): Foe[] => FOES.filter((f) => f.on.includes(g));

/** One lookup for anything that stands in the way, happening or foe. */
export const troubleById = (id: string): Happening | Foe | undefined =>
  HAPPENINGS.find((h) => h.id === id) ?? FOES.find((f) => f.id === id);

export const isFoe = (t: Happening | Foe | undefined): t is Foe =>
  !!t && 'strength' in t;
