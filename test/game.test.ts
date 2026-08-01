import { describe, it, expect } from 'vitest';
import { apply, initial, costOf, blocked, unforgeable, waitFor, edgeKey,
  forgeSecs, rate, unsettleable, SECS_PER_PACE, COST_BASE, COST_GROWTH,
  type Game } from '../src/game/engine';
import { YIELD } from '../src/game/flow';
import { PLACES, PLACE, START } from '../src/game/places';

/** Standing still IS resting — there is no verb for it any more. */
const work = (g: Game, secs: number): Game => apply(g, { type: 'tick', secs });

/** ★ THE RATE AT THE FIRST FRAME, and it is no longer a constant. You start
 *  standing on the one place you have settled, so the flow solve delivers its
 *  whole yield with no route to squeeze it through: 1/3 + 0.100. */
const OPENING = 1 / SECS_PER_PACE + YIELD / 1000;

/** Rest until you can afford it, make the way, wait for it, then walk it. */
function reach(g: Game, to: number): Game {
  let out = g;
  for (let i = 0; i < 500 && unforgeable(out, to); i++) out = work(out, 30);
  out = apply(out, { type: 'forge', to });
  out = work(out, forgeSecs(g) + 1);
  return apply(out, { type: 'go', to });
}

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


});

describe('one resource, two verbs', () => {
  it('pays at the rate the graph delivers, and carries the remainder', () => {
    // ⚠️ NOT `every three seconds` ANY MORE. Income is the floor plus max-flow
    // from your settled places (`flow.ts`), and you begin standing on one.
    expect(rate(initial())).toBeCloseTo(OPENING, 10);
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
    let slow = initial();
    for (let i = 0; i < 600; i++) slow = apply(slow, { type: 'tick', secs: 0.1 });
    const fast = work(initial(), 60);
    expect(fast.paces).toBe(26);     // 60 × (1/3 + 0.100), exactly
    expect(Math.abs(slow.paces - fast.paces)).toBeLessThanOrEqual(1);
  });

  it('★ gathers just by existing — there is nothing to switch on', () => {
    // The whole reason the rest of the UI is gone. An idle game you can forget
    // to start is not one, and a verb that exists only to be pressed once needs
    // a control, a label and a state to explain it.
    const g = apply(initial(), { type: 'tick', secs: 30 });
    expect(g.paces).toBe(13);        // 30 × (1/3 + 0.100), exactly
  });

  it('★★ a road fills up, and a second road round it is worth more than a settlement', () => {
    // ⚠️ THIS IS THE ONE THE WHOLE ITEM RESTS ON. Everything else in this file
    // would still pass against `rate = base + 0.1 × settled.length`. This will
    // not, and the difference is the entire reason `flow.ts` exists.
    //
    // Five settled places in a line, standing at the far end:
    //
    //     0 — 1 — 2 — 3 — 4(you)
    //
    // Four of them have to send everything they make down the last road, which
    // carries 0.250 and no more. So 0.400 is made upstream and 0.250 arrives.
    // A count model says 0.500 + the floor, and is wrong by a fifth.
    const chain = ['0|1', '1|2', '2|3', '3|4'];
    const line = { ...initial(), at: 4, settled: [0, 1, 2, 3, 4], solid: chain };
    const counted = 1 / SECS_PER_PACE + 5 * (YIELD / 1000);
    expect(rate(line)).toBeCloseTo(1 / SECS_PER_PACE + 0.100 + 0.250, 10);
    expect(rate(line)).toBeLessThan(counted);

    // ★ AND NOW THE PART THAT MAKES A LOOP-CLOSER THE BEST BUY IN THE GAME.
    // `docs/NEXT.md` measured the seven redundant routes at 72% of the valley's
    // whole price for 16% of its edges — dead weight, because a second way to
    // somewhere you can already reach bought nothing. It buys throughput now.
    const looped = { ...line, solid: [...chain, '0|4'] };
    expect(rate(looped)).toBeGreaterThan(rate(line));
    // It recovers the WHOLE loss, not a share of it — with a way round, the
    // upstream places can send half their output back through 0 and in at the
    // other end, and nothing is left in the road. One route bought as much as
    // three settlements would have, which is the point.
    expect(rate(looped)).toBeCloseTo(counted, 10);

    // And settling a SIXTH place behind the same full road buys nothing at all,
    // which is the decision the player is now actually making.
    const more = { ...line, settled: [...line.settled, 5], solid: [...chain, '0|5'] };
    expect(rate(more)).toBeCloseTo(rate(line), 10);
  });

  it('★ a settled place pays nothing it cannot get to you', () => {
    // ⚠️ THE ONE THAT WOULD STAY GREEN UNDER A COUNT MODEL IF IT ONLY COUNTED.
    // Two settled places, and the ONLY difference between the two states is
    // whether a made route joins the second one to where you stand. A rate of
    // `base + per × settled.length` gives the same answer to both.
    const at = START;
    const to = PLACE.get(START)!.ways[0]!;
    const cut = { ...initial(), settled: [at, to] };
    const joined = { ...cut, solid: [edgeKey(at, to)] };
    expect(rate(cut)).toBeCloseTo(OPENING, 10);
    expect(rate(joined)).toBeCloseTo(OPENING + YIELD / 1000, 10);
    expect(rate(joined)).toBeGreaterThan(rate(cut));
  });

  it('charges more for each new place and nothing to go back', () => {
    const g = initial();
    const first = PLACE.get(START)!.ways[0]!;
    expect(costOf(g, first)).toBe(COST_BASE);
    expect(costOf({ ...g, solid: [edgeKey(START, first)] }, first)).toBe(0);  // made
    expect(costOf({ ...g, solid: ['9|9'] }, first)).toBe(Math.round(COST_BASE * COST_GROWTH));
  });

  it('★ a route must be made before it can be walked', () => {
    // docs/TABS.md R4.4. The shape of the valley is visible from the first
    // frame; none of it is walkable until you have made it so.
    const g = initial();
    const to = PLACE.get(START)!.ways[0]!;
    expect(blocked(g, to)).toBe('the way is not made yet');
    expect(apply(g, { type: 'go', to })).toBe(g);
    expect(unforgeable(g, to)).toBe(`${COST_BASE} paces — you have 0`);
  });

  it('forging costs paces, takes time, and then the way is free forever', () => {
    let g = work(initial(), COST_BASE * SECS_PER_PACE);
    const to = PLACE.get(START)!.ways[0]!;
    expect(unforgeable(g, to)).toBeNull();
    const secs = forgeSecs(g);
    const purse = g.paces;
    g = apply(g, { type: 'forge', to });
    expect(g.paces).toBe(purse - COST_BASE);
    expect(g.forging?.key).toBe(edgeKey(START, to));
    // Half way is still not walkable.
    g = work(g, secs / 2);
    expect(blocked(g, to)).toBe('the way is not made yet');
    g = work(g, secs);
    expect(g.forging).toBeNull();
    expect(g.solid).toContain(edgeKey(START, to));
    // ...and walking it costs nothing, now or ever.
    const before = g.paces;
    g = apply(g, { type: 'go', to });
    expect(g.at).toBe(to);
    expect(g.paces).toBe(before);
    expect(costOf(g, START)).toBe(0);
  });

  it('will not make two ways at once, or one that is already made', () => {
    let g = work(initial(), 900);
    const [a, b] = PLACE.get(START)!.ways;
    g = apply(g, { type: 'forge', to: a! });
    expect(unforgeable(g, b!)).toBe('you are already making one');
    g = work(g, forgeSecs(initial()) + 900);
    expect(unforgeable(g, a!)).toBe('already made');
  });

  it('★ an absence finishes the route it was left making', () => {
    let g = work(initial(), COST_BASE * SECS_PER_PACE);
    const to = PLACE.get(START)!.ways[0]!;
    g = apply(g, { type: 'forge', to });
    // One big tick, exactly as the offline catch-up delivers it.
    g = apply(g, { type: 'tick', secs: 3600 });
    expect(g.forging).toBeNull();
    expect(g.solid).toContain(edgeKey(START, to));
  });

  it('refuses a move to somewhere that is not next to you', () => {
    const g = { ...initial(), paces: 999 };
    const far = PLACES.find((p) => !PLACE.get(START)!.ways.includes(p.id) && p.id !== START)!;
    expect(blocked(g, far.id)).toBe('no way from here');
    expect(apply(g, { type: 'go', to: far.id })).toBe(g);
  });

  it('arriving records that you have been there', () => {
    // ⚠️ THIS USED TO ASSERT `g.said === dest.body` — arriving stuffed the whole
    // place body into a header line above the purse. The owner asked to be rid
    // of that text three times in one play-test, so `said` is gone from the
    // state entirely and the prose is shown where it was always also shown: the
    // panel, when the place is selected. The shell selects the place you arrive
    // at, which is a UI concern and is checked in the browser, not here.
    const to = PLACE.get(START)!.ways[0]!;
    const g = reach(initial(), to);
    expect(g.at).toBe(to);
    expect(g.seen).toContain(to);
    expect(PLACE.get(to)!.body.length).toBeGreaterThan(0);
  });

  it('never lets paces go negative', () => {
    let g = { ...initial(), paces: 40 };
    for (let i = 0; i < 60; i++) {
      const to = PLACE.get(g.at)!.ways.find((t) => unforgeable(g, t) === null);
      if (to === undefined) { g = work(g, 60); continue; }
      g = apply(g, { type: 'forge', to });
      expect(g.paces).toBeGreaterThanOrEqual(0);
      g = work(g, forgeSecs(g) + 2);
      g = apply(g, { type: 'go', to });
    }
    expect(g.paces).toBeGreaterThanOrEqual(0);
  });
});

describe('the player is never stuck', () => {
  it('★ the whole valley is walkable by resting, settling and moving', () => {
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
          // Only routes already made are free to walk.
          if (prev.has(n) || !g0.solid.includes(edgeKey(at, n))) continue;
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

      // Stand at the near end of the frontier route — made ground is free.
      g = hop(g.at, best.from, g);
      if (g.at !== best.from) break;
      // ★ AND SETTLE IT FIRST, because you may only build out of a place that
      // produces. This is the step the gate added, and the reason the test is
      // worth running at all: the gate could have made the far end of the
      // valley unreachable and nothing else would have said so.
      let waits = 0;
      while (!g.settled.includes(g.at) && waits++ < 900) {
        g = unsettleable(g) ? work(g, 60) : apply(g, { type: 'settle' });
      }
      if (!g.settled.includes(g.at)) break;
      // Rest until it can be made, make it, wait for the fill, walk it.
      let spins = 0;
      while (unforgeable(g, best.to) && spins++ < 900) g = work(g, 60);
      if (unforgeable(g, best.to)) break;
      g = apply(g, { type: 'forge', to: best.to });
      g = work(g, forgeSecs(g) + 2);
      g = apply(g, { type: 'go', to: best.to });
      if (g.at !== best.to) break;
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
    // Asks `costOf` rather than recomputing the formula, and grows the thing
    // the price is actually keyed off — the routes MADE, not the places seen.
    // Getting that wrong is how this reported 0.2 hours for a 17-hour valley.
    let total = 0;
    const made: string[] = [];
    const at = START;
    for (let k = 1; k <= PLACES.length - 1; k++) {
      const to = PLACES[k]!.id;
      total += costOf({ ...initial(), at, solid: [...made] }, to);
      made.push(edgeKey(at, to));
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
    // ⚠️ AGAINST THE RATE, NOT THE CONSTANT. Six paces at 0.4333 a second is 14
    // seconds, not 18 — quoting the floor would promise a longer wait than the
    // player is actually going to have, and it would get worse with every place
    // they settle.
    expect(wait!.secs).toBe(14);
    expect(wait!.secs).toBeLessThan(COST_BASE * SECS_PER_PACE);
  });

  it('★ you may only build out of a place that produces', () => {
    // The rule that makes "where you park decides what you can reach" true
    // rather than a comment claiming to be. Paces are not the obstacle here —
    // the state below has plenty.
    const to = PLACE.get(START)!.ways[0]!;
    const rich = { ...initial(), paces: 9999, settled: [] };
    expect(unforgeable(rich, to)).toBe('settle here first');
    expect(apply(rich, { type: 'forge', to })).toBe(rich);
    const settled = apply(rich, { type: 'settle' });
    expect(settled.settled).toContain(START);
    expect(unforgeable(settled, to)).toBeNull();
  });
});

// ⚠️ THE "OLD SAVE STILL LOADS" TESTS MOVED TO `test/store.test.ts`. The first
// version of them lived here and asserted `{ ...initial(), ...old }` inline —
// which is the PATTERN, not the CODE. Deleting the merge from `load()` left all
// 562 tests green. A guard that restates the implementation instead of calling
// it is not a guard.
