// KING'S ROADS — the properties the design rests on.
//
// `docs/KINGS_ROADS.md` is the owner's. Three claims in it are the game, and
// each is checked here against the engine rather than against a restatement of
// the engine:
//
//   1. A chapter is a CROSSING, finished when one path runs end to end.
//   2. There is a CHOICE — five or six ways across, and they differ.
//   3. You cannot build from the MIDDLE, because mana only reaches along road.
//
// ---- PROVEN RED, 2026-08-02 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, unbuildable, blocked, crossed, reached, roadKey,
  roadsOut, manaRate, buildSecs, waitFor, MANA_BASE, MANA_PER_ROAD,
  type Game } from '../src/game/engine';
import { STOPS, STOP, START, FINISH, roadCost, ROUTE_COUNT, GOING } from '../src/game/stops';

const tick = (g: Game, secs: number): Game => apply(g, { type: 'tick', secs });

/** Wait for the mana, lay the road, wait for it to go in, walk it. */
function lay(g: Game, to: number): Game {
  let out = g;
  for (let i = 0; i < 900 && unbuildable(out, to); i++) out = tick(out, 5);
  out = apply(out, { type: 'build', to });
  out = tick(out, buildSecs(g, to) + 1);
  return apply(out, { type: 'go', to });
}

describe('the chapter', () => {
  it('joins every stop to something, and nothing to itself', () => {
    for (const s of STOPS) {
      expect(s.near.length, `${s.name} joins nothing`).toBeGreaterThan(0);
      expect(s.near, `${s.name} joins itself`).not.toContain(s.id);
      for (const to of s.near) {
        expect(STOP.get(to)?.near, `${s.id}→${to} is one-way`).toContain(s.id);
      }
    }
  });

  it('★ offers five or six ways across, and they are genuinely different', () => {
    // The owner: "dotted lines point to at least 5-6 options how you can do it".
    // A crossing with one sensible route is a corridor.
    expect(STOP.get(START)!.near.length).toBeGreaterThanOrEqual(5);
    expect(STOP.get(FINISH)!.near.length).toBeGreaterThanOrEqual(5);
    expect(ROUTE_COUNT).toBeGreaterThanOrEqual(5);

    // ⚠️ AND THE ROUTES MUST NOT COST THE SAME. If every way across is the same
    // price the choice is cosmetic — which is the exact defect that made the
    // last engine's map decoration.
    const first = STOP.get(START)!.near.map((to) => roadCost(START, to));
    expect(new Set(first).size, `every road out of the start costs ${first[0]}`)
      .toBeGreaterThan(1);
    expect(Math.max(...first) / Math.min(...first)).toBeGreaterThan(1.5);
  });

  it('★ the ground is the price, so a shuffled map is a different game', () => {
    // The property the previous engine failed: you could shuffle which stop
    // joined which, keep the counts, and no number would change.
    const water = STOPS.find((s) => s.ground === 'water')!;
    const moor = STOPS.find((s) => s.ground === 'moor')!;
    expect(GOING.water).toBeGreaterThan(GOING.moor);
    // Same length of road, different ground, different price.
    const cheap = roadCost(moor.id, moor.near[0]!) / Math.hypot(
      moor.x - STOP.get(moor.near[0]!)!.x, moor.y - STOP.get(moor.near[0]!)!.y);
    const dear = roadCost(water.id, water.near[0]!) / Math.hypot(
      water.x - STOP.get(water.near[0]!)!.x, water.y - STOP.get(water.near[0]!)!.y);
    expect(dear).toBeGreaterThan(cheap);
  });
});

describe('★ mana only reaches along road you have built', () => {
  it('starts reaching the start and nowhere else', () => {
    expect([...reached(initial())]).toEqual([START]);
  });

  it('★ you cannot build from the middle', () => {
    // The rule the whole opening exists to set up. Standing somewhere the mana
    // has not got to, with plenty of it in hand, you still cannot build.
    const far = STOPS.find((s) => s.id !== START && s.id !== FINISH)!;
    const rich = { ...initial(), at: far.id, seen: [START, far.id], mana: 9999 };
    expect(reached(rich).has(far.id)).toBe(false);
    expect(unbuildable(rich, far.near[0]!)).toBe('no mana reaches here');
    expect(apply(rich, { type: 'build', to: far.near[0]! })).toBe(rich);
  });

  it('and the reason is reported before the price', () => {
    // Told it costs mana you have not got, you wait. Told the mana does not
    // reach, you walk. Reporting the cheaper obstacle sends you to do the
    // wrong thing.
    const far = STOPS.find((s) => s.id !== START && s.id !== FINISH)!;
    const broke = { ...initial(), at: far.id, seen: [START, far.id], mana: 0 };
    expect(unbuildable(broke, far.near[0]!)).toMatch(/^no mana reaches/);
  });

  it('grows one stop at a time as road goes in', () => {
    const to = STOP.get(START)!.near[0]!;
    const g = lay(initial(), to);
    expect(g.built).toContain(roadKey(START, to));
    expect(reached(g).has(to)).toBe(true);
    expect(g.at).toBe(to);
    // And now building onward from there is allowed.
    expect(unbuildable({ ...g, mana: 9999 }, g.built.length ? STOP.get(to)!.near.find((n) => n !== START)! : START))
      .toBeNull();
  });
});

describe('★ mana gets easier as the chapter goes on', () => {
  it('flows faster for every road that carries it', () => {
    expect(manaRate(initial())).toBeCloseTo(MANA_BASE, 10);
    const three = { ...initial(), built: ['0|2', '2|3', '3|4'] };
    expect(manaRate(three)).toBeCloseTo(MANA_BASE + 3 * MANA_PER_ROAD, 10);
    expect(manaRate(three)).toBeGreaterThan(manaRate(initial()));
  });

  it('so the wait for the next road shrinks even as prices stay put', () => {
    // The owner's curve: "scarce until you've finished the location and once
    // you're finished it's abundant but like you don't need it anymore."
    const early = waitFor(initial())!;
    const late = waitFor({ ...initial(), built: ['0|2', '2|3', '3|4', '4|5', '5|6'] })!;
    expect(late.secs).toBeLessThan(early.secs);
  });

  it('carries the remainder, so small ticks pay what one big tick pays', () => {
    let slow = initial();
    for (let i = 0; i < 600; i++) slow = tick(slow, 0.1);
    const fast = tick(initial(), 60);
    expect(Math.abs(slow.mana - fast.mana)).toBeLessThanOrEqual(1);
  });
});

describe('★ a road must be built before it can be walked', () => {
  it('refuses the walk, and says why', () => {
    const g = initial();
    const to = STOP.get(START)!.near[0]!;
    expect(blocked(g, to)).toBe('that road is not built yet');
    expect(apply(g, { type: 'go', to })).toBe(g);
  });

  it('and walking it afterwards is free, now and always', () => {
    const to = STOP.get(START)!.near[0]!;
    const g = lay(initial(), to);
    const before = g.mana;
    const back = apply(apply(g, { type: 'go', to: START }), { type: 'go', to });
    expect(back.at).toBe(to);
    expect(back.mana).toBe(before);
  });
});

describe('★ the crossing', () => {
  it('is not crossed at the start', () => {
    expect(crossed(initial())).toBe(false);
  });

  it('★★ can be crossed by playing, and one path is enough', () => {
    // THE ONE THAT MATTERS. "one path yeah, done is done" — so this walks a
    // single route end to end and stops. If the chapter cannot be crossed, or
    // needs more than one route, this is where it shows.
    let g = initial();
    let guard = 0;
    while (!crossed(g) && guard++ < 200) {
      // Cheapest road onward that is not already built, preferring the finish.
      const out = roadsOut(g).filter((r) => !r.built);
      const home = out.find((r) => r.to === FINISH);
      const next = home ?? out.sort((a, b) => a.cost - b.cost)[0];
      if (!next) break;
      g = lay(g, next.to);
    }
    expect(crossed(g), `not crossed after ${g.built.length} roads`).toBe(true);
    // ⚠️ AND IT IS A PATH, NOT THE WHOLE MAP. If crossing needed most of the
    // chapter, "done is done" would be a lie and the other routes would be
    // chores rather than choices.
    const roads = STOPS.reduce((n, s) => n + s.near.length, 0) / 2;
    expect(g.built.length).toBeLessThan(roads / 2);
  });

  it('is crossed the moment the mana reaches the finish, and not before', () => {
    const g = initial();
    expect(crossed(g)).toBe(false);
    expect(crossed({ ...g, built: [roadKey(START, STOP.get(START)!.near[0]!)] })).toBe(false);
    // A contrived straight line from start to finish is the whole of it.
    const route = STOP.get(START)!.near.find((n) => STOP.get(n)!.near.includes(FINISH));
    if (route !== undefined) {
      expect(crossed({ ...g, built: [roadKey(START, route), roadKey(route, FINISH)] })).toBe(true);
    }
  });
});
