// ★★★ THE FLOORS — a dungeon per depth, generated, 2026-08-20.
//
// The owner: *"go analyze what other games in the genre have and go implement
// all of that"*. Two genres meet here and both were missing their spine:
// a roguelike without procedural generation is a puzzle you solve once, and an
// incremental without CONTENT TIERS is a shop with a last item.
//
// Depth is both at the same time. A new floor is new ground to map AND the
// next tier of the ladder, which is why it is the first thing built.
//
// ⚠️ FLOOR ONE IS STILL HAND-DRAWN. `dungeon.ts` stays exactly as it was and is
// still the first descent. A generated tutorial is how a player's first ten
// minutes become a coin toss, and this one is TUNED — the fight ladder, the
// pacing sim and roughly forty tests are all pinned to its shape. Everything
// below the first floor is made up.
//
// ⚠️ AND IT IS PURE. No `Math.random()`: a floor is a function of its depth, so
// floor 4 is the same floor 4 forever, on every device, and a save can record
// the number 4 rather than a map. That is also the only reason any of it is
// testable.
import type { Room, RoomKind } from './dungeon';
import { ROOMS } from './dungeon';

/** A tiny LCG. Deterministic, seeded from the depth and nothing else. */
function rolling(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** ★ HOW BIG A FLOOR IS. Grows with depth, and stops growing: past about
 *  eighteen rooms a phone screen cannot hold the map at a readable size, and
 *  "bigger" stops meaning "deeper" and starts meaning "further to walk". */
export const roomsOn = (depth: number): number =>
  Math.min(18, 8 + depth * 2);

/** ★★★ A FLOOR, LAID OUT IN RANKS. Rank 0 is the way in, the last rank is the
 *  hoard, and every room connects upward to the rank above it — so the map
 *  reads top-to-bottom like the hand-drawn one and there is always a way home.
 *
 *  ⚠️ RANKS RATHER THAN A FREE GRAPH. A layout that is merely "connected" comes
 *  out as a tangle no thumb can read on a 390px screen, and the whole pitch of
 *  this game is that you can SEE what the thing chasing you has to do. */
export function floorPlan(depth: number): Room[] {
  if (depth <= 1) return [...ROOMS];
  const rnd = rolling(depth);
  const n = roomsOn(depth);

  // Deal the rooms into ranks: one at the top, one at the bottom, 2–3 between.
  const ranks: number[][] = [[0]];
  let made = 1;
  while (made < n - 1) {
    const wide = Math.min(n - 1 - made, rnd() < 0.45 ? 2 : 3);
    ranks.push(Array.from({ length: wide }, (_, i) => made + i));
    made += wide;
  }
  ranks.push([n - 1]);

  const deepest = ranks.length - 1;
  const rooms: Room[] = [];
  // ⚠️ ONE WELL A FLOOR, AND THE COMMENT USED TO SAY SO WITHOUT IT BEING TRUE.
  // The roll fired per room, so floor 2 came out with two rooms both called
  // "Drowned Well" sitting next to each other — which the browser probe
  // printed and no unit test could see, because none of them read the names.
  let wells = 0;
  for (const [rank, row] of ranks.entries()) {
    for (const [i, id] of row.entries()) {
      // ★ Spread across the width, with a little jitter so a floor does not
      // read as a spreadsheet. Deterministic jitter, like everything else.
      const span = 300;
      const x = 200 + (row.length === 1 ? 0
        : (i / (row.length - 1) - 0.5) * span) + (rnd() - 0.5) * 26;
      const y = 40 + rank * 96;
      const kind: RoomKind = rank === 0 ? 'mouth'
        : rank === deepest ? 'hoard'
        // ★ Lairs thicken as you go down, and a floor gets ONE well — a dead
        // end that pays, so a fork is sometimes worth taking blind.
        : (wells === 0 && rnd() < 0.2) ? 'well'
        : rnd() < 0.28 + rank * 0.06 ? 'lair' : 'hall';
      if (kind === 'well') wells++;
      rooms.push({
        id, name: '', x: Math.round(x), y,
        doors: [], deep: rank, kind,
        w: kind === 'hoard' ? 140 : kind === 'well' ? 58 : 72 + Math.round(rnd() * 54),
        h: kind === 'hoard' ? 78 : kind === 'well' ? 58 : 48 + Math.round(rnd() * 34),
      });
    }
  }

  // ★★★ EVERY ROOM HANGS OFF THE RANK ABOVE IT, so the floor is connected by
  // construction rather than by hoping — and then a few extra doors are added
  // for loops, because a pure tree means retreating is always a rewind.
  const join = (a: number, b: number): void => {
    if (a === b) return;
    const ra = rooms[a]!, rb = rooms[b]!;
    if (ra.doors.includes(b)) return;
    ra.doors.push(b); rb.doors.push(a);
  };
  for (let rank = 1; rank < ranks.length; rank++) {
    const up = ranks[rank - 1]!, row = ranks[rank]!;
    for (const [i, id] of row.entries()) {
      join(id, up[Math.min(up.length - 1, Math.floor(i * up.length / row.length))]!);
    }
    // Make sure nothing in the rank above is left with no way down.
    for (const [i, id] of up.entries()) {
      if (rooms[id]!.doors.every((d) => rooms[d]!.deep <= rooms[id]!.deep)) {
        join(id, row[Math.min(row.length - 1, Math.floor(i * row.length / up.length))]!);
      }
    }
    if (rnd() < 0.5 && row.length > 1) join(row[0]!, row[row.length - 1]!);
    if (rnd() < 0.35) join(row[0]!, up[up.length - 1]!);
  }
  name(rooms, depth);
  return rooms;
}

const HALLS = ['Gallery', 'The Crossing', 'Broken Span', 'Long Vault', 'Cold Landing',
  'The Undercroft', 'Stair of Wet Stone', 'Antechamber', 'The Narrows'];
const LAIRS = ['Rat Warren', 'Bone Kiln', 'Old Cistern', 'The Shambles',
  'Spider Fall', 'The Rookery', 'Grub Pit', 'Beetle Court'];

/** ⚠️ NAMED FROM A LIST AND NOT FROM A GRAMMAR. A generated name is the first
 *  thing that makes a generated dungeon feel machine-made, which on THIS game
 *  would be a joke played on the wrong target.
 *
 *  ⚠️ AND EVERY NAME ON A FLOOR IS DIFFERENT. Two rooms called the same thing
 *  is not a cosmetic problem here: the panel names the room you are in, the log
 *  says what woke where, and the crawler files its claims by name. Floor 2
 *  shipped with two adjacent "Drowned Well"s and the browser probe is the only
 *  thing that saw it. */
function name(rooms: Room[], depth: number): void {
  const used = new Set<string>();
  for (const r of rooms) {
    if (r.kind === 'mouth') { r.name = 'The Stair Up'; used.add(r.name); continue; }
    if (r.kind === 'hoard') { r.name = 'The Hoard'; used.add(r.name); continue; }
    if (r.kind === 'well') { r.name = 'Drowned Well'; used.add(r.name); continue; }
    const list = r.kind === 'lair' ? LAIRS : HALLS;
    const from = (r.id * 7 + depth * 3) % list.length;
    let picked = '';
    for (let i = 0; i < list.length && !picked; i++) {
      const t = list[(from + i) % list.length]!;
      if (!used.has(t)) picked = t;
    }
    // Both lists exhausted on a big floor: number it rather than repeat it.
    r.name = picked || `${list[from]!} ${Math.floor(r.id / list.length) + 2}`;
    used.add(r.name);
  }
}
