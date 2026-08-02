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
    id: 'stone',
    name: 'What you bank',
    body: 'You earn it by standing still. You spend it building edges and '
      + 'settling places. That is the whole economy.',
    near: ['rest', 'making'],
    known: always,
  },
  {
    id: 'rest',
    name: 'Standing still',
    // ⚠️ REWRITTEN WHEN WORKING ARRIVED. This used to end "which is either a
    // mercy or the first thing about this valley that should have worried you",
    // and the note beside it read "Standing still is the ABSENCE of a work
    // verb". There is a work verb now, so both were a sentence describing an
    // engine that no longer exists — the one thing this file forbids.
    body: 'Nothing to start and nothing to restart — waiting is the work. The '
      + 'cost only shows up the first time you have something better to do '
      + 'with the same clock.',
    near: ['stone', 'settling'],
    known: always,
  },
  {
    id: 'settling',
    name: 'Settling',
    // Names `settleCost`, `YIELD` and the max-flow solve in `flow.ts` — that a
    // settled place makes paces, and that only what can reach you arrives.
    body: 'A settled place earns whether you are standing in it or not. '
      + 'What it makes still has to reach you along the edges you built, and '
      + 'an edge only carries so much. A settlement you cannot reach pays you '
      + 'nothing at all.',
    near: ['free', 'stone'],
    known: (g) => g.settled.length >= 2,
  },
  {
    id: 'edge',
    name: 'An edge',
    body: 'Every edge in the valley is visible from the first morning, and '
      + 'none of them can be walked until you build it. Seeing is not having.',
    near: ['making', 'valley'],
    known: always,
  },
  {
    id: 'making',
    name: 'Making',
    body: 'Laid along a line until the line will take weight. It costs '
      + 'more each time, wherever you build, and it is yours for good.',
    near: ['edge', 'free', 'frontier'],
    known: (g) => g.solid.length > 0 || g.forging !== null,
  },
  {
    id: 'free',
    name: 'Free ground',
    // ⚠️ THE LAST CLAUSE USED TO READ "the only question the valley has ever
    // put to you is which edge to open next". There are two questions now —
    // which edge, and whether to buy the ground that pays for it — so the old
    // sentence was a lie the moment settling shipped.
    body: 'An edge you have built asks nothing of you again. Turning back is '
      + 'never a loss, so the question is never where to go — it is what to '
      + 'spend on next.',
    near: ['making', 'settling'],
    known: (g) => g.solid.length >= 2,
  },
  {
    id: 'frontier',
    name: 'The frontier',
    body: 'Each edge costs more than the one before it, wherever you build it. '
      + 'Nothing is defending itself against you — you are running out of '
      + 'cheap questions.',
    near: ['making'],
    known: (g) => g.solid.length >= 3,
  },
  {
    id: 'valley',
    name: 'The valley',
    body: 'Thirty-seven places and the edges between them, laid out long '
      + 'before you arrived. Only your part of it changes shape.',
    near: ['edge'],
    known: (g) => g.seen.length >= 3,
  },
];

export const NOTION = new Map(NOTIONS.map((n) => [n.id, n]));

/** ⚠️ Kept as a check rather than a comment: a notion pointing at an id that
 *  does not exist would draw an edge to nothing, and the view would silently
 *  drop it rather than say so. */
export const DANGLING = NOTIONS.flatMap((n) =>
  n.near.filter((id) => !NOTION.has(id)).map((id) => `${n.id} -> ${id}`));
