// WHAT HOLDS A PLACE, AND WHAT IT TAKES TO PUT IT OUT.
//
// `docs/BRIEF.md` ask 7, in the owner's words: *"I want to have battles with
// enemies, where our dot pokes against their dot and one of the dots dies out."*
// `docs/TABS.md` put encounters on **Here** and then said, in as many words, do
// not invent what one IS. The owner decided that on 2026-08-01:
//
//     ★ IT HOLDS A PLACE. You can walk in. You cannot SETTLE it and you cannot
//       work its job until the thing standing in it is out.
//
// That is the whole design, and the reason it is that and not a third kind of
// locked door: settling is already the thing the player wants most, so a held
// place is a stake the economy explains without a word of tutorial.
//
// ⚠️ THREE OF THEM, ON THE SEAMS. One at the mouth of each region beyond the
// valley — so the valley is yours for the learning, and every region after it
// is answered for once. Not one per place: thirty-seven fights is a chore, and
// a fight you have to win before you may invest is only interesting while it is
// still rare.
//
// ⚠️ AND NO RNG, like everything else in this engine. A fight is decided by
// arithmetic you can do in your head before you start it — which is the point.
// You strike first, both sides strike every `POKE` seconds, and the only
// question is whether your size outlasts theirs. `docs/COMBAT.md` wanted dice;
// this engine promises none, and a telegraphed fight is a decision where a
// gambled one is a slot machine.

export interface Foe {
  /** The place it is standing in. */
  at: number;
  name: string;
  /** Radius is health, so this is both. */
  size: number;
  /** 25–45 words, in the valley's voice. */
  body: string;
}

/** ★ SIZES ARE A LADDER, AND THE RUNGS ARE MEANT TO BE FELT.
 *
 *  Against a level-1 wayfarer (bite 1, size 10, striking first) the works is a
 *  fight you win with one point to spare; the under is a fight you lose. Read
 *  off `bite()` and `might()` in `engine.ts`:
 *
 *      level 1   bite 1  size 10   → works (10) only, and barely
 *      level 3   bite 2  size 14   → the under (20)
 *      level 7   bite 3  size 34   → the stones (34)
 *
 *  Which puts them between the authored doors at wayfaring 3, 5, 8 and 24
 *  rather than on top of them. */
export const FOES: readonly Foe[] = [
  {
    at: 100,
    name: 'The Wheelwright',
    size: 10,
    body: 'It has been keeping the water where the water is wanted for longer '
      + 'than the works have needed water. Nothing about it is angry. It simply '
      + 'stands at the head of the race the way a bolt stands in a hole.',
  },
  {
    at: 200,
    name: 'The Counter',
    size: 20,
    body: 'It is partway through something and does not stop for you. The '
      + 'tally on the wall behind it is in your handwriting, and the last '
      + 'stroke is not dry. It would rather you waited. It can wait longer.',
  },
  {
    at: 300,
    name: 'The Marker',
    size: 34,
    body: 'A shape the size of a stood stone, on ground where every stood '
      + 'stone was put there by somebody. It does not move as you climb. It '
      + 'moves once you stop climbing, and only enough to face you.',
  },
];

export const FOE = new Map(FOES.map((f) => [f.at, f]));

/** How long between exchanges, in seconds. Long enough to watch a dot shrink,
 *  short enough that the whole fight is over inside a minute. */
export const POKE = 2;
