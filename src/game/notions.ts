// WHAT THE GAME EXPECTS YOU TO UNDERSTAND, AS DATA.
//
// `docs/TABS.md` build order 6 wants "concepts and how they connect; tap one to
// read it", and said the tab needs something in it that is not a place. This is
// that something — and it is deliberately NOT lore.
//
// ⚠️ EVERY NOTION HERE NAMES A RULE THE ENGINE ACTUALLY ENFORCES. "Free ground"
// is `costOf` returning 0 for a made route. "The frontier" is `COST_GROWTH`.
// "Standing still" is the absence of a work verb. That is the whole discipline:
// a notion whose sentence is not true of the code is a lie the player will
// eventually catch, and this game has already shipped one screen that described
// a system it did not have.
//
// ★ AND IT IS WHY THIS TAB IS THE SEED OF THE TWIST. `docs/BRIEF.md` ask 8: the
// reveal is that you are a model travelling a graph to learn, and it must be
// MECHANICALLY TRUE BEFORE IT IS STATED. A tab where knowledge is a graph that
// fills in as you traverse the world is that mechanic, built before anybody
// says a word about it. Nothing here states it. It just happens to be what is
// going on.
import type { Game } from './engine';

export interface Notion {
  id: string;
  /** What it is called once you have had the thought. */
  name: string;
  /** 30–60 words. The rule, said in the valley's voice. */
  body: string;
  /** Notions it joins to. Written one way; the view makes them symmetric. */
  near: string[];
  /** ⚠️ A PURE PREDICATE OVER THE RUN, never a flag in the save. A notion is
   *  known because the state says so, so it cannot drift out of step with the
   *  thing it describes and there is nothing to migrate. */
  known: (g: Game) => boolean;
}

const always = (): boolean => true;

export const NOTIONS: readonly Notion[] = [
  {
    id: 'pace',
    name: 'A pace',
    body: 'Not a step — the measure of one, held in the hand before it is '
      + 'spent. They arrive whether you attend to them or not, and they leave '
      + 'all at once.',
    near: ['rest', 'making'],
    known: always,
  },
  {
    id: 'rest',
    name: 'Standing still',
    body: 'There is nothing here to start and nothing to remember to restart. '
      + 'Whoever waits is already working, which is either a mercy or the first '
      + 'thing about this valley that should have worried you.',
    near: ['pace'],
    known: always,
  },
  {
    id: 'way',
    name: 'A way',
    body: 'Two places and the ground between them. Every way in the valley can '
      + 'be seen from the first morning and not one of them can be walked. '
      + 'Seeing has never been the same as having.',
    near: ['making', 'valley'],
    known: always,
  },
  {
    id: 'making',
    name: 'Making',
    body: 'Paces laid along a line until the line will take weight. The valley '
      + 'gains nothing by it. You gain a road. Everything else you do here '
      + 'undoes itself by morning; this does not.',
    near: ['way', 'free', 'frontier'],
    known: (g) => g.solid.length > 0 || g.forging !== null,
  },
  {
    id: 'free',
    name: 'Free ground',
    body: 'A way you have made asks nothing of you again, ever. Which is why '
      + 'turning back is not a loss, and why the only question the valley has '
      + 'ever put to you is which edge to open next.',
    near: ['making'],
    known: (g) => g.solid.length >= 2,
  },
  {
    id: 'frontier',
    name: 'The frontier',
    body: 'Each way costs more than the one before it, wherever you choose to '
      + 'make it. Nothing is defending itself against you. You are simply '
      + 'running out of cheap questions.',
    near: ['making'],
    known: (g) => g.solid.length >= 3,
  },
  {
    id: 'valley',
    name: 'The valley',
    body: 'Thirty-seven places and the ways between them, settled long before '
      + 'you arrived and unmoved by anything you have done since. Only your '
      + 'part of it changes shape.',
    near: ['way'],
    known: (g) => g.seen.length >= 3,
  },
];

export const NOTION = new Map(NOTIONS.map((n) => [n.id, n]));

/** ⚠️ Kept as a check rather than a comment: a notion pointing at an id that
 *  does not exist would draw an edge to nothing, and the view would silently
 *  drop it rather than say so. */
export const DANGLING = NOTIONS.flatMap((n) =>
  n.near.filter((id) => !NOTION.has(id)).map((id) => `${n.id} -> ${id}`));
