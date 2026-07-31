import { describe, it, expect } from 'vitest';
import { apply, initial, costOf, blocked, waysFrom, waitFor,
  SECS_PER_PACE, COST_BASE, COST_GROWTH, type Game } from '../src/game/engine';
import { PLACES, PLACE, START } from '../src/game/places';

const work = (g: Game, secs: number): Game =>
  apply(apply(g, { type: 'work' }), { type: 'tick', secs });

describe('the places', () => {
  it('every way is two-way', () => {
    // A one-way edge you cannot afford to leave is a trap, and failure is a
    // plateau. The authored content is one-directional; this is where that is
    // corrected, so it is where it must be checked.
    for (const p of PLACES) {
      for (const to of p.ways) {
        expect(PLACE.get(to)?.ways, `${p.name} -> ${to}`).toContain(p.id);
      }
    }
  });

  it('has no dead end and no dangling way', () => {
    for (const p of PLACES) {
      expect(p.ways.length, p.name).toBeGreaterThan(0);
      for (const to of p.ways) expect(PLACE.has(to), `${p.name} -> ${to}`).toBe(true);
    }
  });

  it('is one connected graph from the start', () => {
    const seen = new Set([START]);
    const q = [START];
    while (q.length) for (const to of PLACE.get(q.pop()!)!.ways) {
      if (!seen.has(to)) { seen.add(to); q.push(to); }
    }
    expect(seen.size).toBe(PLACES.length);
  });

  it('keeps the authored prose intact', () => {
    for (const p of PLACES) {
      const words = p.body.trim().split(/\s+/).length;
      expect(words, `${p.name} is ${words} words`).toBeGreaterThanOrEqual(35);
      expect(words, `${p.name} is ${words} words`).toBeLessThanOrEqual(75);
    }
  });

  it('offers work somewhere you can reach on the first pace', () => {
    // The loop cannot start if the opening place has nothing to do.
    expect(PLACE.get(START)?.work, 'the start must have work').toBeDefined();
  });
});

describe('one resource, two verbs', () => {
  it('pays a pace every three seconds of work, and carries the remainder', () => {
    let g = work(initial(), 2);
    expect(g.paces).toBe(0);
    g = apply(g, { type: 'tick', secs: 1 });
    expect(g.paces).toBe(1);
    // ★ Many small ticks must pay what one big tick pays, or an hour watched
    // and an hour away disagree — the bug that ate a run last time.
    //
    // ⚠️ WITHIN ONE PACE, NOT EXACTLY, and the reason is the test's own input:
    // six hundred additions of 0.1 sum to 59.999999999999986, so the slow run
    // is genuinely fed less time than the fast one. Asserting equality here was
    // asserting that floating point is exact. The engine carries SECONDS so the
    // drift cannot accumulate beyond this.
    let slow = apply(initial(), { type: 'work' });
    for (let i = 0; i < 600; i++) slow = apply(slow, { type: 'tick', secs: 0.1 });
    const fast = work(initial(), 60);
    expect(fast.paces).toBe(60 / SECS_PER_PACE);
    expect(Math.abs(slow.paces - fast.paces)).toBeLessThanOrEqual(1);
  });

  it('does nothing while you are not working', () => {
    const g = apply(initial(), { type: 'tick', secs: 3600 });
    expect(g.paces).toBe(0);
    expect(g).toEqual(initial());
  });

  it('charges more for each new place and nothing to go back', () => {
    const g = initial();
    const first = PLACE.get(START)!.ways[0]!;
    expect(costOf(g, first)).toBe(COST_BASE);
    const moved = { ...g, seen: [START, first, 99999].slice(0, 3) } as Game;
    expect(costOf(moved, first)).toBe(0);              // been there
    expect(costOf({ ...g, seen: [START, first] }, PLACE.get(START)!.ways[1] ?? first))
      .toBe(Math.round(COST_BASE * COST_GROWTH));
  });

  it('refuses a move you cannot pay for, and says the price', () => {
    const g = initial();
    const to = PLACE.get(START)!.ways[0]!;
    expect(blocked(g, to)).toBe(`${COST_BASE} paces — you have 0`);
    expect(apply(g, { type: 'go', to })).toBe(g);
  });

  it('refuses a move to somewhere that is not next to you', () => {
    const g = { ...initial(), paces: 999 };
    const far = PLACES.find((p) => !PLACE.get(START)!.ways.includes(p.id) && p.id !== START)!;
    expect(blocked(g, far.id)).toBe('no way from here');
    expect(apply(g, { type: 'go', to: far.id })).toBe(g);
  });

  it('spends the paces, moves, and puts the work down', () => {
    let g = work(initial(), COST_BASE * SECS_PER_PACE);
    expect(g.working).toBe(true);
    const to = PLACE.get(START)!.ways[0]!;
    g = apply(g, { type: 'go', to });
    expect(g.at).toBe(to);
    expect(g.paces).toBe(0);
    expect(g.working).toBe(false);
    expect(g.seen).toContain(to);
  });

  it('never lets paces go negative', () => {
    let g = { ...initial(), paces: 1000 };
    for (let i = 0; i < 200; i++) {
      const open = waysFrom(g).filter((wy) => !wy.why);
      if (!open.length) break;
      g = apply(g, { type: 'go', to: open[i % open.length]!.to });
      expect(g.paces).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the player is never stuck', () => {
  it('★ the whole valley is walkable by resting and moving, nothing else', () => {
    // THE ONE THAT MATTERS. The previous version could strand you behind a gate
    // whose key was behind the gate. Here the only currency is time, so this
    // asserts the loop actually terminates rather than that a graph is connected.
    // ⚠️ PLAYS THE ACTUAL STRATEGY, and the first version of this did not.
    // It rested only where it happened to be standing and reached 7 of 37, then
    // reported the GAME as unwinnable. Revisits are free, so what a player
    // really does is: rest wherever the work is, then walk back across known
    // ground for nothing, then pay once at the frontier.
    const hop = (from: number, to: number, g0: Game): Game => {
      // Free path across seen ground, breadth-first.
      const prev = new Map<number, number>([[from, from]]);
      const q = [from];
      while (q.length) {
        const at = q.shift()!;
        if (at === to) break;
        for (const n of PLACE.get(at)!.ways) {
          if (prev.has(n) || !g0.seen.includes(n)) continue;
          prev.set(n, at);
          q.push(n);
        }
      }
      if (!prev.has(to)) return g0;
      const path: number[] = [];
      for (let c = to; c !== from; c = prev.get(c)!) path.unshift(c);
      let g1 = g0;
      for (const step of path) g1 = apply(g1, { type: 'go', to: step });
      return g1;
    };

    let g = initial();
    let guard = 0;
    while (g.seen.length < PLACES.length && guard++ < 3000) {
      // The cheapest unseen place adjacent to anywhere we have been.
      let best: { from: number; to: number; cost: number } | null = null;
      for (const from of g.seen) {
        for (const to of PLACE.get(from)!.ways) {
          if (g.seen.includes(to)) continue;
          const cost = costOf(g, to);
          if (!best || cost < best.cost) best = { from, to, cost };
        }
      }
      if (!best) break;

      if (g.paces < best.cost) {
        // Rest at the nearest place that has work. Getting there is free.
        const rest = g.seen.find((id) => PLACE.get(id)?.work);
        if (rest === undefined) break;
        g = hop(g.at, rest, g);
        let spins = 0;
        while (g.paces < best.cost && spins++ < 500) g = work(g, 30);
      }
      g = hop(g.at, best.from, g);
      g = apply(g, { type: 'go', to: best.to });
    }
    const missed = PLACES.filter((p) => !g.seen.includes(p.id)).map((p) => p.name);
    expect(missed, `never reached ${missed.join(', ')}`).toEqual([]);
  });

  it('★ the curve is geometric, so one absence cannot finish the game', () => {
    // The linear version totalled 2,106 paces — 1.8 hours — and a two-hour
    // absence paid 2,401. The whole map fell out of one nap.
    // ⚠️ ASKS `costOf`, DOES NOT RECOMPUTE THE FORMULA. The first version of
    // this summed `COST_BASE * COST_GROWTH ** k` itself, so it agreed with the
    // constants no matter what the function did — replacing costOf with the old
    // linear curve left it green. A test that re-implements the thing it is
    // testing is testing itself.
    let total = 0;
    const seen: number[] = [START];
    for (let k = 1; k <= PLACES.length - 1; k++) {
      const next = PLACES.find((p) => !seen.includes(p.id))!.id;
      total += costOf({ ...initial(), seen: [...seen] }, next);
      seen.push(next);
    }
    const hours = (total * SECS_PER_PACE) / 3600;
    expect(hours, `the valley costs ${hours.toFixed(1)} hours of resting`)
      .toBeGreaterThan(8);
    // And the opening is still quick — nobody waits five minutes for move one.
    expect(COST_BASE * SECS_PER_PACE).toBeLessThanOrEqual(20);
  });

  it('always tells you how long until the next thing', () => {
    const g = initial();
    const wait = waitFor(g);
    expect(wait).not.toBeNull();
    expect(wait!.secs).toBe(COST_BASE * SECS_PER_PACE);
  });
});
