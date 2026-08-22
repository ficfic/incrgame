// ★★★ THE BESTIARY — 2026-08-20, the genre pass.
//
// ⚠️ THERE WERE TWO MONSTERS AND THEY WERE THE SAME MONSTER. "a big one" and
// "a runt" differed by three numbers — hit points, bite, and how often it
// swings — which makes a lair an arithmetic problem with two terms instead of
// one. Every crawler worth the name has a BESTIARY, and the reason is not
// flavour: a monster is interesting when it does something the others do not,
// and on a graph the interesting verbs are about the graph.
//
// ★★★ SO EVERY TRAIT BELOW IS A GRAPH FACT.
//
//   IT CHASES, or it does not. A lurker never leaves its room, so its room can
//     simply be walked around — which turns "what is in there" into a routing
//     question rather than a fight you have to take.
//   IT IS TOO HEAVY TO SHOVE. A brute cannot be put through a door, so the
//     answer that works on everything else does not work on it, and shove
//     stops being a universal solvent.
//   IT HOWLS, and wakes the room next door. Noise is the one thing that
//     propagates along edges by itself: leave a howler alive and the floor
//     lights up around you, one door at a time.
//
// ⚠️ AND NONE OF IT IS RANDOM. A room's guard is a function of its kind and
// its depth, like everything else in this engine.

/** What a thing does, beyond its numbers. */
export interface Trait {
  breed: Breed;
  name: string;
  /** Follows you through the dungeon. A lurker does not. */
  chases: boolean;
  /** ★ Cannot be shoved through a door — the one answer that fails on it. */
  heavy: boolean;
  /** ★ Wakes the guard of a room next door when it acts beside you. */
  howls: boolean;
  /** One line the screen can show, so a player can read a thing they have not
   *  met before instead of finding out by dying to it. */
  says: string;
}

export type Breed = 'runt' | 'hulk' | 'brute' | 'lurker' | 'howler' | 'stalker';

export const TRAITS: Record<Breed, Trait> = {
  runt: { breed: 'runt', name: 'a runt', chases: true, heavy: false, howls: false,
    says: 'quick, and it follows' },
  /** ★ THE BIG ONE THE GAME HAS ALWAYS HAD. Slow, hits hard, and SHOVEABLE —
   *  the whole first-lair tactic is putting it through a door and killing the
   *  runt while it picks itself up, so it must stay that way. */
  hulk: { breed: 'hulk', name: 'a big one', chases: true, heavy: false, howls: false,
    says: 'slow · hits hard' },
  /** ⚠️ AND THE ONE THAT ANSWERS IT, DEEPER DOWN. Making the FIRST big one too
   *  heavy would have deleted the tactic the fight was built around in the same
   *  commit that shipped it — six tests said so. A brute belongs where the
   *  player already knows the answer and has to find another. */
  brute: { breed: 'brute', name: 'a brute', chases: true, heavy: true, howls: false,
    says: 'slow · TOO HEAVY TO SHOVE' },
  lurker: { breed: 'lurker', name: 'a lurker', chases: false, heavy: false, howls: false,
    says: 'it never leaves this room' },
  howler: { breed: 'howler', name: 'a howler', chases: true, heavy: false, howls: true,
    says: 'it wakes the room next door' },
  stalker: { breed: 'stalker', name: 'a stalker', chases: true, heavy: false, howls: false,
    says: 'fast, and it does not stop' },
};

/** A guard, before it is put in a room. */
export interface Guard { hp: number; bite: number; name: string; breed: Breed }

const of = (breed: Breed, hp: number, bite: number): Guard =>
  ({ hp, bite, name: TRAITS[breed].name, breed });

/** ★★★ WHAT LIVES IN A LAIR, and it changes as you go down. Shallow lairs are
 *  the pair the game has always had; deeper ones start fielding things that
 *  need a different answer. */
export const lairOf = (deep: number): Guard[] => {
  // ★ THE HEAVY ONE. Shoveable until it is deep enough to be a brute, which is
  // where the player's usual answer stops working.
  const heavy = deep >= 7 ? 'brute' : 'hulk';
  const line: Guard[] = [of(heavy, 4 + deep * 2, 1 + Math.floor(deep / 2))];
  // ⚠️ THE SECOND ONE IS WHAT MAKES THE ROOM A QUESTION. One monster is a
  // slog; one plus something that needs a different answer is a decision.
  if (deep >= 8) line.push(of('howler', 3 + deep, 1));
  else if (deep >= 4) line.push(of('stalker', 2 + deep, 2));
  else line.push(of('runt', 2 + deep, 1));
  if (deep >= 10) line.push(of('lurker', 6 + deep * 2, 2));
  return line;
};

export const hoardOf = (deep: number): Guard[] => [
  of(deep >= 7 ? 'brute' : 'hulk', 10 + deep * 3, 2 + Math.floor(deep / 2)),
  of('stalker', 4 + deep, 1),
  of('runt', 4 + deep, 1),
];

/** ★ A WELL IS A DEAD END THAT PAYS — and past a certain depth something has
 *  moved into it. A lurker, because a lurker in a dead end is exactly the
 *  choice the trait exists for: it cannot follow you out, so the only question
 *  is whether the spoil is worth the walk in. */
export const wellOf = (deep: number): Guard[] | null =>
  deep >= 5 ? [of('lurker', 8 + deep * 2, 2 + Math.floor(deep / 3))] : null;
