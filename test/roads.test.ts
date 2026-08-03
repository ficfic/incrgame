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
  roadsOut, manaRate, buildSecs, waitFor, MANA_BASE, MAX_GAUGE, SPRING,
  priceOf, loadOf, type Game } from '../src/game/engine';
import { STOPS, STOP, START, FINISH, roadCost, ROUTE_COUNT, GOING, BORE,
  boreOf } from '../src/game/stops';

const tick = (g: Game, secs: number): Game => apply(g, { type: 'tick', secs });

/** Wait for the mana, lay the road, FACE whatever blocks it, walk it.
 *  ⚠️ The dice are forced to a strong hit — this helper is for reaching states,
 *  not for testing the trouble; `test/happenings.test.ts` does that. */
function lay(g: Game, to: number): Game {
  let out = g;
  for (let i = 0; i < 900 && unbuildable(out, to); i++) out = tick(out, 5);
  out = apply(out, { type: 'build', to, kit: 'cart' });
  for (let i = 0; i < 60 && out.building; i++) {
    out = tick(out, 2);
    if (out.facing) {
      out = apply(out, { type: 'face', choice: 0, roll: { a: 6, c1: 1, c2: 2 } });
      out = apply(out, { type: 'carry' });
    }
  }
  return out.at === to ? out : apply(out, { type: 'go', to });
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
    expect(apply(rich, { type: 'build', to: far.near[0]!, kit: 'cart' })).toBe(rich);
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
    expect(g.gauge[roadKey(START, to)]).toBe(1);
    expect(reached(g).has(to)).toBe(true);
    expect(g.at).toBe(to);
    // And now building onward from there is allowed.
    expect(unbuildable({ ...g, mana: 9999 }, STOP.get(to)!.near.find((n) => n !== START)!))
      .toBeNull();
  });
});

describe('★★ a road is a pipe', () => {
  it('starts at the trickle, standing on the king\'s road with nothing laid', () => {
    expect(manaRate(initial())).toBeCloseTo(MANA_BASE, 10);
  });

  it('★ delivers what the road can CARRY once you are standing on the far end', () => {
    // The whole change: income is no longer a count of what you own, it is what
    // this network gets to where you are.
    const to = STOP.get(START)!.near[0]!;
    const g = lay(initial(), to);
    expect(g.at).toBe(to);
    expect(manaRate(g)).toBeCloseTo(boreOf(START, to), 6);
  });

  it('★★ is governed by its NARROWEST link, not by how many links there are', () => {
    // ⚠️ THE FIRST VERSION OF THIS TEST WAS VACUOUS AND A SABOTAGE PROVED IT. It
    // took the first neighbour and the first one beyond that, and on this map
    // both links came out at the same bore — so `min` and `max` agreed and
    // replacing the bottleneck with the WIDEST link left the test green.
    //
    // So the chain is SEARCHED FOR rather than assumed, and it throws if the
    // map has no chain whose links differ, because on such a map this property
    // cannot be tested at all and a pass would mean nothing.
    // Walk outward from the start until a path turns up whose links are not all
    // the same width. Two hops is not enough on this map — the head of every
    // route is uniform ground — so the search goes as deep as it needs to.
    let found: { path: number[]; lo: number; hi: number } | null = null;
    const queue: number[][] = [[START]];
    for (let h = 0; h < queue.length && !found && h < 4000; h++) {
      const path = queue[h]!;
      if (path.length > 5) continue;
      for (const n of STOP.get(path[path.length - 1]!)!.near) {
        if (path.includes(n)) continue;
        const next = [...path, n];
        const bores = next.slice(1).map((_, i) => boreOf(next[i]!, next[i + 1]!));
        const lo = Math.min(...bores), hi = Math.max(...bores);
        if (hi - lo > 0.01) { found = { path: next, lo, hi }; break; }
        queue.push(next);
      }
    }
    if (!found) throw new Error('no chain on this map has links of different bores — nothing to prove');
    const path = found.path;
    const gauge: Record<string, number> = {};
    for (let i = 0; i + 1 < path.length; i++) gauge[roadKey(path[i]!, path[i + 1]!)] = 1;
    const chain = { ...initial(), at: path[path.length - 1]!, seen: [...path], gauge };
    expect(manaRate(chain),
      `chain ${path.join('→')} runs ${found.lo} at its tightest and ${found.hi} at its widest`)
      .toBeCloseTo(found.lo, 6);
    expect(manaRate(chain), 'the WIDER link is governing').not.toBeCloseTo(found.hi, 6);
  });

  it('★ and widening the tight one is what raises it', () => {
    const a = STOP.get(START)!.near[0]!;
    const one = { ...initial(), at: a, seen: [START, a], gauge: { [roadKey(START, a)]: 1 } };
    const two = { ...one, gauge: { [roadKey(START, a)]: 2 } };
    expect(manaRate(two)).toBeGreaterThan(manaRate(one));
    expect(manaRate(two)).toBeCloseTo(2 * boreOf(START, a), 6);
  });

  it('★ cheap ground is NARROW ground, or the choice is theatre', () => {
    // `GOING` prices a road and `BORE` says what it carries, and they must run
    // opposite — otherwise moor is both the cheapest and the best and every
    // route across the chapter is the same route.
    expect(GOING.moor).toBeLessThan(GOING.stone);
    expect(BORE.moor).toBeLessThan(BORE.stone);
    expect(GOING.water).toBeGreaterThan(GOING.crag);
  });

  it('★ two ways to the same place ADD, which is why there is a second option', () => {
    // Max flow, not widest path. If these did not add, laying a parallel route
    // would be worth nothing and the network would be a line.
    const near = STOP.get(START)!.near;
    const mid = near.find((n) => STOP.get(n)!.near.some((x) => near.includes(x) && x !== n));
    if (mid === undefined) return;                    // no diamond here; nothing to prove
    const other = STOP.get(mid)!.near.find((x) => near.includes(x) && x !== mid)!;
    const one = { ...initial(), at: mid, seen: [START, mid],
      gauge: { [roadKey(START, mid)]: 1 } };
    const both = { ...one, gauge: { [roadKey(START, mid)]: 1,
      [roadKey(START, other)]: 1, [roadKey(other, mid)]: 1 } };
    expect(manaRate(both)).toBeGreaterThan(manaRate(one));
  });

  it('never delivers more than the kingdom can push', () => {
    const a = STOP.get(START)!.near[0]!;
    const fat = { ...initial(), at: a, seen: [START, a],
      gauge: { [roadKey(START, a)]: 99 } };
    expect(manaRate(fat)).toBeLessThanOrEqual(SPRING);
  });

  it('★ shows which road is the tight one, or the model is invisible', () => {
    // The argument I lost, kept as a check: a pipe economy the board cannot
    // draw is the spreadsheet that got scrapped wearing a better name. `loadOf`
    // is what the board draws, so it must say something.
    const a = STOP.get(START)!.near[0]!;
    const g = { ...initial(), at: a, seen: [START, a], gauge: { [roadKey(START, a)]: 1 } };
    expect(loadOf(g).get(roadKey(START, a)), 'the only road carrying anything reads slack')
      .toBeCloseTo(1, 3);
  });

  it('widening costs more each time, and stops', () => {
    const a = STOP.get(START)!.near[0]!;
    const at1 = { ...initial(), at: START, gauge: { [roadKey(START, a)]: 1 } };
    const at2 = { ...at1, gauge: { [roadKey(START, a)]: 2 } };
    expect(priceOf(at2, a)).toBeGreaterThan(priceOf(at1, a));
    const full = { ...at1, at: START, mana: 9999,
      gauge: { [roadKey(START, a)]: MAX_GAUGE } };
    expect(unbuildable(full, a)).toBe('as wide as it goes');
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
    expect(blocked(g, to)).toBe('there is no pipe here yet');
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
    expect(crossed(g), `not crossed after ${Object.keys(g.gauge).length} roads`).toBe(true);
    // ⚠️ AND IT IS A PATH, NOT THE WHOLE MAP. If crossing needed most of the
    // chapter, "done is done" would be a lie and the other routes would be
    // chores rather than choices.
    const roads = STOPS.reduce((n, s) => n + s.near.length, 0) / 2;
    expect(Object.keys(g.gauge).length).toBeLessThan(roads / 2);
  });

  it('is crossed the moment the mana reaches the finish, and not before', () => {
    const g = initial();
    expect(crossed(g)).toBe(false);
    expect(crossed({ ...g, gauge: { [roadKey(START, STOP.get(START)!.near[0]!)]: 1 } })).toBe(false);
    // A contrived straight line from start to finish is the whole of it.
    const route = STOP.get(START)!.near.find((n) => STOP.get(n)!.near.includes(FINISH));
    if (route !== undefined) {
      expect(crossed({ ...g,
        gauge: { [roadKey(START, route)]: 1, [roadKey(route, FINISH)]: 1 } })).toBe(true);
    }
  });
});
