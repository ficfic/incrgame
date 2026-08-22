// ★★★ THE RELICS — 2026-08-20, the genre pass.
//
// ⚠️ A CRAWLER WITH NO LOOT IS A CORRIDOR WITH A SHOP AT THE END. Everything
// this game gave you, you BOUGHT: the kit is a price list, and a price list is
// a plan, not a discovery. Every roguelike in the genre answers this the same
// way — you find things, and finding them changes how you play.
//
// ★★★ AND A RELIC CHANGES A RULE, NOT A NUMBER. The shop already sells
// numbers; if a relic were "+2 damage" it would be a shop item you had to walk
// further for. Each of these turns off, reverses or adds a rule the player has
// spent the whole game learning:
//
//   THE CHALK marks the crawler's invented doors AS invented. The central lie
//     of the game, answerable — but only if you go and find the answer.
//   THE SPIKE makes a wedge hold twice as long.
//   THE BOOTS give you the first turn in any room you wake. A lair stops being
//     a toll and starts being a choice.
//   THE BELL lets you wake a room on purpose, from next door, and let it come
//     to you — so you pick the ground instead of walking onto theirs.
//
// ⚠️ AND THEY ARE IN THE WELLS. The well is the dead end that pays: a fork you
// take blind, off the road to the Hoard. Putting the loot there means the game
// rewards WALKING SOMEWHERE YOU DID NOT HAVE TO, which is the one behaviour a
// game about mapping should be paying for.

export type RelicId = 'chalk' | 'spike' | 'boots' | 'bell';

export interface Relic {
  id: RelicId;
  name: string;
  /** What it does, in the words the screen uses. */
  says: string;
  /** The shallowest floor it can be found on. */
  from: number;
}

export const RELICS: Record<RelicId, Relic> = {
  chalk: { id: 'chalk', name: 'A stub of chalk', from: 1,
    says: "the crawler's invented doors are marked as invented" },
  spike: { id: 'spike', name: 'An iron spike', from: 2,
    says: 'a wedge holds twice as long' },
  boots: { id: 'boots', name: 'Felt boots', from: 3,
    says: 'whatever you wake is a turn behind you' },
  bell: { id: 'bell', name: 'A cracked bell', from: 4,
    says: 'ring it to wake the next room and let it come to you' },
};

export const ORDER: RelicId[] = ['chalk', 'spike', 'boots', 'bell'];

/** ★ WHAT IS IN THIS FLOOR'S WELL, or null once you have them all.
 *  ⚠️ IN ORDER, NOT AT RANDOM. Four relics found in a fixed sequence is a
 *  ladder the player can see the top of; four found by dice is a slot machine,
 *  and this engine has no dice in it anywhere. */
export const wellHolds = (floor: number, had: RelicId[]): RelicId | null =>
  ORDER.find((r) => !had.includes(r) && RELICS[r].from <= floor) ?? null;
