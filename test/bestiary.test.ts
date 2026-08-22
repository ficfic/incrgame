// ★★★ THE BESTIARY — 2026-08-20, the genre pass.
//
// ⚠️ THERE WERE TWO MONSTERS AND THEY WERE THE SAME MONSTER. "a big one" and
// "a runt" differed by three numbers, which makes a lair an arithmetic problem
// with two terms rather than a question. Every crawler worth the name has a
// bestiary, and not for flavour: a monster is interesting when it does
// something the others do not.
//
// ★★★ SO EVERY TRAIT IS A FACT ABOUT THE GRAPH, and every test below is about
// the graph rather than about a stat block.
import { describe, it, expect } from 'vitest';
import { TRAITS, lairOf, hoardOf, wellOf, type Breed } from '../src/delve/bestiary';
import { apply, initial, facing, foesIn, unshovable, guardsOf, roomAt,
  doorsOf, deepness, type Delve, type Foe } from '../src/delve/engine';
import { floorPlan } from '../src/delve/floors';

const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
/** One hand-made thing of a given breed, in room 3, with you. */
const one = (breed: Breed, over: Partial<Foe> = {}): Delve => ({
  ...initial(), at: 3, hp: 400, seen: [0, 1, 2, 3, 5], cleared: [0], bred: 2,
  foes: [{ id: 1, at: 3, from: 3, hp: 40, bite: 2, name: TRAITS[breed].name,
    breed, every: 1, reeling: 0, ...over }],
});

describe('★★★ A LURKER NEVER LEAVES ITS ROOM', () => {
  it('★★★ so its room can be walked around, and that is the point', () => {
    // ⚠️ THE TRAIT THAT TURNS A FIGHT INTO A ROUTING QUESTION. Everything else
    // down here follows you, so "what is in that room" has only ever had one
    // answer. This one you can decline.
    const g = one('lurker');
    expect(TRAITS.lurker.chases).toBe(false);
    const away = wait(wait(go(g, 1)));
    expect(away.at).toBe(1);
    expect(foesIn(away, 1).length).toBe(0);       // it did not follow
    expect(foesIn(away, 3).length).toBe(1);       // it is still in there
    expect(away.hp).toBe(go(g, 1).hp);            // and it stopped costing you
  });

  it('★ but it still bites what walks in', () => {
    expect(wait(one('lurker')).hp).toBeLessThan(one('lurker').hp);
  });
});

describe('★★★ A BRUTE CANNOT BE SHOVED', () => {
  it('★★★ the answer that works on everything else fails on it', () => {
    const g = one('brute');
    expect(unshovable(g, 1, 1)).toMatch(/too heavy/i);
    expect(apply(g, { type: 'shove', foe: 1, to: 1 })).toBe(g);
    // ★ And the one that IS shoveable still is, or the verb would be dead.
    const soft = one('hulk');
    expect(unshovable(soft, 1, 1)).toBeNull();
  });

  it('★★★ and the FIRST big one is not a brute — that tactic has to survive', () => {
    // ⚠️ THE MISTAKE THIS EXISTS TO PREVENT. Making the shallow heavy one too
    // heavy deleted the whole first-lair tactic — shove it out, kill the runt
    // — in the same commit that shipped the bestiary. Six tests said so.
    const shallow = lairOf(2);
    expect(shallow.some((q) => TRAITS[q.breed].heavy)).toBe(false);
    expect(lairOf(9).some((q) => TRAITS[q.breed].heavy)).toBe(true);
  });
});

describe('★★★ A HOWLER WAKES THE ROOM NEXT DOOR', () => {
  /** A howler beside you, in a room with a sleeping lair through a door. */
  const shouting = (): Delve => {
    const g: Delve = { ...initial(), floor: 6, rooms: floorPlan(6), hp: 900 };
    const lair = g.rooms.find((r) => r.kind === 'lair'
      && r.doors.some((d) => g.rooms.find((x) => x.id === d)?.kind === 'lair'));
    const at = lair?.id ?? 1;
    return { ...g, at, seen: g.rooms.map((r) => r.id), cleared: [0], bred: 2,
      foes: [{ id: 1, at, from: at, hp: 60, bite: 1, name: 'a howler',
        breed: 'howler', every: 1, reeling: 0 }] };
  };

  it('★★★ noise travels along an edge — the one thing that does', () => {
    const g = shouting();
    const before = g.foes.length;
    const after = wait(g);
    expect(after.foes.length).toBeGreaterThan(before);
    expect(after.log.join(' ')).toMatch(/howls\. Something answers in/);
    // ⚠️ AND IT WOKE SOMETHING NEXT DOOR, not something in here.
    const fresh = after.foes.filter((f) => f.id > 1);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((f) => doorsOf(g, g.at).includes(f.from))).toBe(true);
  });

  it('★★★ and it keeps doing it, so leaving one alive lights up the floor', () => {
    let g = shouting();
    const grew: number[] = [];
    for (let i = 0; i < 5; i++) { g = wait(g); grew.push(g.foes.length); }
    expect(grew[grew.length - 1]!).toBeGreaterThan(grew[0]!);
  });

  it('★★★ deterministically — the same room, every time', () => {
    // A random neighbour would make the same fight unlearnable twice, and this
    // engine has no dice in it anywhere else either.
    expect(wait(shouting()).foes).toEqual(wait(shouting()).foes);
  });
});

describe('★★★ AND WHAT LIVES WHERE CHANGES AS YOU GO DOWN', () => {
  it('★★★ a shallow lair is the pair the game has always had', () => {
    expect(lairOf(2).map((q) => q.breed)).toEqual(['hulk', 'runt']);
  });

  it('★★★ and a deep one needs answers you have not used yet', () => {
    const deep = lairOf(10).map((q) => q.breed);
    expect(deep).toContain('brute');
    expect(deep).toContain('howler');
    expect(deep).toContain('lurker');
    expect(new Set(deep).size).toBe(deep.length);
  });

  it('★★★ a shallow well is EMPTY and pays; a deep one has moved-in tenants', () => {
    // ⚠️ THE BUG THIS CAUGHT. The engine used to ask "can this KIND ever hold
    // something" to decide both whether to announce a guard and whether the
    // room pays on arrival. The moment a well held a lurker past depth five,
    // every SHALLOW well announced "something is already here" over an empty
    // room and stopped paying out.
    expect(wellOf(2)).toBeNull();
    expect(wellOf(9)!.length).toBe(1);
    const g = initial();
    const well = g.rooms.find((r) => r.kind === 'well')!;
    expect(guardsOf(g, well).length).toBe(0);
    const deep: Delve = { ...g, floor: 5, rooms: floorPlan(5) };
    const dwell = deep.rooms.find((r) => r.kind === 'well');
    if (dwell) expect(guardsOf(deep, dwell).length).toBeGreaterThan(0);
  });

  it('★ a shallow well still pays on arrival, with nothing in it', () => {
    const well = go(go(go(go(initial(), 1), 3), 5), 7);
    expect(well.purse).toBeGreaterThan(0);
    expect(facing(well).length).toBe(0);
    // ⚠️ THE WELL'S OWN LINES, NOT THE WHOLE LOG — scanning all of it caught
    // the Rat Warren announcing its guard four rooms earlier. And not the LAST
    // two either: arriving now also finds a relic and claims two milestones,
    // which pushed the payout line out of the tail.
    expect(well.log.join(' ')).toMatch(/Nothing down here but what was left/);
    const arrival = well.log.slice(well.log.lastIndexOf('Drowned Well.'));
    expect(arrival.join(' ')).not.toMatch(/Something is already here/);
  });

  it('★ and the hoard is always the worst room on the floor', () => {
    for (const d of [1, 4, 8]) {
      const total = (l: { hp: number }[]): number => l.reduce((n, q) => n + q.hp, 0);
      expect(total(hoardOf(d))).toBeGreaterThan(total(lairOf(d)));
    }
  });
});
