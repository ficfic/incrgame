// THE DELVE — a dungeon is a graph, and this one does not pretend otherwise.
//
// ★★★ THE PIVOT, 2026-08-16 (evening). The owner, after a day that ended with
// a photograph and *"everything is fucked"*:
//
//   *"i think we might want to go back completely to the graph idea and make
//    it gameplay focused and not the button pressing focused... we've started
//    with graph and discovering language... then we went into discovering a
//    map and a world... but WORLD IS TOO OPEN FOR GRAPHS... maybe we switch
//    to like... DUNGEON CRAWLING?"*
//
// That diagnosis is the sharpest thing anyone has said about this project.
// `docs/BRIEF.md`'s north star — THE GAME IS A GRAPH, which outranks every
// other line in the repo — kept sliding back into panels and buttons because
// a WORLD only ever had a graph drawn over it. A dungeon IS one: rooms are
// nodes, doors are edges, and nobody has to be persuaded. Fog, dead ends,
// one-way drops and being cut off are all native graph facts here, where on
// a map they were decoration.
//
// ⚠️ WHAT THIS FILE IS NOT. It is not a design document — `CLAUDE.md` rule 3
// bans those, and this project has ~50,000 words of them against ~5,000 lines
// of code. It is the smallest thing that can be PLAYED: a dungeon you walk,
// rooms that hold something, and a way back up. Everything else waits until
// the owner has looked at it.
//
// Pure: no DOM, no clock, no RNG. `apply(state, action) => state`, the one
// pattern that has survived every pivot this project has had.

/** A room. Hand-placed on a grid — a dungeon that a force layout shuffles is
 *  a dungeon you cannot learn, and learning the shape IS the game. */
export interface Room {
  id: number;
  name: string;
  /** World coordinates of its CENTRE, and they are deliberately gridded. */
  x: number;
  y: number;
  /** ★★★ HOW BIG THE CHAMBER IS, in world units. A room is a room, not a dot:
   *  the Warren is cramped, the Gallery is long, the Hoard is a hall. This is
   *  the cheapest information a dungeon map can carry and the first thing a
   *  crawler player reads off one, and the delve shipped without it because
   *  it inherited a hiking map's identical circles. */
  w: number;
  h: number;
  /** Rooms this one has a door to. Symmetry is asserted by the tests. */
  doors: number[];
  /** How far under the hill. Drives what lives here and what it drops. */
  deep: number;
  kind: RoomKind;
}

export type RoomKind = 'mouth' | 'hall' | 'lair' | 'hoard' | 'well';

/** ★★★ THE FIRST DESCENT — ten rooms, hand-drawn, one loop and one dead end.
 *
 *  ⚠️ NOT PROCEDURAL, AND NOT YET. A generated dungeon is the obvious second
 *  step and a terrible first one: you cannot tell whether a layout is fun
 *  while the layout keeps changing underneath the question. This one is fixed
 *  so that the OWNER'S SECOND RUN is the same shape as their first and they
 *  can say whether walking it is any good.
 *
 *  The shape on purpose: the mouth opens on a hall, the hall forks, one fork
 *  loops back (so retreating is a choice, not a rewind) and one runs down to
 *  the hoard past two lairs. The well is a dead end with something in it.
 *
 *  ★ AND EVERY CHAMBER IS ITS OWN SIZE AND SHAPE. The Mouth is a gap in the
 *  hillside, the Weeping Stair is a tall shaft, the Gallery runs long and thin,
 *  the Hoard is the only hall down here. Nothing in the rules reads `w`/`h` —
 *  it is pure information for the eye, and it is why the map is worth looking
 *  at rather than merely worth tapping. */
export const ROOMS: readonly Room[] = [
  { id: 0, name: 'The Mouth', x: 200, y: 40, w: 74, h: 46, doors: [1], deep: 0, kind: 'mouth' },
  { id: 1, name: 'Broken Hall', x: 200, y: 130, w: 122, h: 58, doors: [0, 2, 3], deep: 1, kind: 'hall' },
  { id: 2, name: 'Weeping Stair', x: 90, y: 210, w: 54, h: 82, doors: [1, 4], deep: 2, kind: 'hall' },
  { id: 3, name: 'Rat Warren', x: 310, y: 210, w: 82, h: 54, doors: [1, 5], deep: 2, kind: 'lair' },
  { id: 4, name: 'Old Cistern', x: 90, y: 310, w: 88, h: 88, doors: [2, 6], deep: 3, kind: 'lair' },
  { id: 5, name: 'Gallery', x: 310, y: 310, w: 128, h: 48, doors: [3, 6, 7], deep: 3, kind: 'hall' },
  { id: 6, name: 'The Crossing', x: 200, y: 390, w: 70, h: 70, doors: [4, 5, 8], deep: 4, kind: 'hall' },
  { id: 7, name: 'Drowned Well', x: 412, y: 392, w: 58, h: 58, doors: [5], deep: 4, kind: 'well' },
  { id: 8, name: 'Bone Kiln', x: 200, y: 480, w: 86, h: 64, doors: [6, 9], deep: 5, kind: 'lair' },
  { id: 9, name: 'The Hoard', x: 200, y: 572, w: 140, h: 78, doors: [8], deep: 6, kind: 'hoard' },
];

export const ROOM = new Map(ROOMS.map((r) => [r.id, r]));

/** ★ Seconds to walk one door. The idle spine: a delve is mostly WAITING,
 *  punctuated by a decision. Short enough to watch, long enough that going
 *  back the way you came is a real cost. */
export const WALK_SECS = 6;

/** ★ What lives in a room, or null for somewhere already quiet. Strength
 *  climbs with depth; the shape of the line is the fight's whole texture. */
export interface Guard { hp: number; bite: number; name: string }

export const GUARDS: Record<RoomKind, ((deep: number) => Guard[]) | null> = {
  mouth: null,
  hall: null,
  well: null,
  // ⚠️ ONE LINE PER LAIR, and the numbers are deliberately small. A first
  // slice wants fights you can lose in four taps, not in forty.
  lair: (deep) => [
    { hp: 4 + deep * 2, bite: 1 + Math.floor(deep / 2), name: 'a big one' },
    { hp: 2 + deep, bite: 1, name: 'a runt' },
  ],
  hoard: (deep) => [
    { hp: 10 + deep * 3, bite: 2 + Math.floor(deep / 2), name: 'the hoarder' },
    { hp: 4 + deep, bite: 1, name: 'a runt' },
    { hp: 4 + deep, bite: 1, name: 'a runt' },
  ],
};

/** What a cleared room gives up. */
export const SPOIL: Record<RoomKind, number> = {
  mouth: 0, hall: 0, well: 12, lair: 6, hoard: 40,
};
