// ★★★ THE VOCABULARY — one word, one quantity. 2026-08-23.
//
// ⚠️ THE OLDEST UNENFORCED RULE IN THIS PROJECT. `CLAUDE.md`: *"The board once
// said '25 nodes' beside a HUD saying '3 recovered', both correct."* Two
// quantities wearing one word, and a player who cannot tell which number the
// game means cannot plan against it — which on a game whose whole pitch is
// that you can SEE the exchange before you commit is not a copy problem.
//
// ⚠️ AND ITS CHECK HAS BEEN VACUOUS OR ABSENT SINCE THE PIVOT. The old
// `check-vocabulary.mjs` read `src/core/readouts.ts` — the pre-pivot game —
// and `the-process` proved it by printing two nouns for one quantity into the
// live HUD for exit 0. It was deleted rather than repointed. This is the
// replacement, and the reason it can be checked at all is that THE WORDS LIVE
// IN ONE PLACE now instead of being typed into the markup twice.
//
// ★ THE SCREEN READS FROM HERE. `scripts/check-vocab.mjs` asserts the map is a
// bijection, that every word in it is actually on the screen, and that none of
// the SYNONYMS below appear anywhere in the delve's UI.

/** Every number the delve shows a player, and the one word it wears. */
export const WORDS = {
  hp: 'life',
  purse: 'carried',
  hoard: 'banked',
  floor: 'floor',
  turn: 'turn',
  wedges: 'wedges',
  salve: 'salves',
  /** What the crawler has stood in, versus what it merely says is there. */
  walked: 'walked',
  claimed: 'claimed',
  /** Rooms YOU have stood in. */
  trod: 'stood in',
} as const;

export type Quantity = keyof typeof WORDS;

/** ⚠️ WORDS THIS GAME HAS DECIDED NOT TO USE, each because something else
 *  already carries that meaning. A synonym is how one quantity quietly becomes
 *  two: the moment the shop says "gold" and the header says "banked", a player
 *  has to work out whether they are the same pile.
 *
 *  Every entry names the word it collides with, so removing one is a decision
 *  somebody has to argue for rather than a line they can delete.
 *
 *  ⚠️ AND EVERY ENTRY MUST ONLY EVER MEAN THE QUANTITY. "round", "step" and
 *  "damage" were on this list and came straight back off it: the shop says a
 *  wedged pack "has to go round", which is a preposition, not a round of
 *  combat. Banning ordinary English words makes a guard that is wrong more
 *  often than the code is, and a guard that is usually wrong gets switched
 *  off. A synonym earns its place here by having no other job. */
export const INSTEAD: Record<string, Quantity> = {
  gold: 'hoard',
  coins: 'hoard',
  money: 'hoard',
  treasure: 'hoard',
  score: 'hoard',
  health: 'hp',
  hp: 'hp',
  level: 'floor',
  depth: 'floor',
  storey: 'floor',
  tick: 'turn',
  explored: 'trod',
  visited: 'trod',
  discovered: 'trod',
  mapped: 'trod',
};
