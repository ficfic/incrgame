// GATHERING — the tests are the deliverable.
//
// ⚠️ RULE 4 (`CLAUDE.md`): every guard in this repo has been vacuous at least
// once, so each block below was watched go RED before it was trusted. The
// mutation used is recorded in the block. Verbatim log at the foot of the file.
import { describe, it, expect } from 'vitest';
import {
  NODES, NODE, MATERIALS, nodesAt, ENTRY_GAP, FINE_AT, FADE_AT,
  grade, fade, pickedOver, locked, attempt, gather, chances, xpPer,
  xpPerHour, bestFor, bank, report,
  type GatherNode, type Row,
} from '../src/slice/gather';
import { odds, modifier, roll2d10, MOD_CAP } from '../src/slice/dice';
import { xpForLevel } from '../src/slice/engine';
import { PLACE } from '../src/slice/content';

const byId = (id: string): GatherNode => {
  const n = NODE.get(id);
  if (!n) throw new Error(`no node ${id}`);
  return n;
};

const T1 = byId('weir-pool');       // demand 2,  needs 1,  10s, 3 xp
const T3 = byId('sump-lines');      // demand 14, needs 12, 16s, 18 xp
const T5 = byId('drowned-dive');    // demand 26, needs 24, 24s, 95 xp

/** Empirical row counts over N seeded attempts. */
function tally(level: number, n: GatherNode, N: number, seed = 4242): Record<Row, number> {
  const out: Record<Row, number> = { miss: 0, common: 0, fine: 0, prime: 0 };
  let s = seed;
  for (let i = 0; i < N; i++) {
    const a = attempt(s, level, n);
    s = a.seed;
    out[a.row]++;
  }
  return out;
}

// ===========================================================================
describe('the data', () => {
  // RED: one node's `prime` -> 'glass-eel' (nonexistent). 2 failed.
  it('every node names three real materials, and every material is used', () => {
    const used = new Set<string>();
    for (const n of NODES) {
      for (const id of [n.common, n.fine, n.prime]) {
        expect(MATERIALS[id], `${n.id} -> ${id}`).toBeDefined();
        used.add(id);
      }
    }
    for (const id of Object.keys(MATERIALS)) expect(used.has(id), id).toBe(true);
  });

  // RED: 'weir-pool' place 1 -> 999. 1 failed.
  it('every node sits at a real place', () => {
    for (const n of NODES) expect(PLACE.get(n.place), `${n.id} @ ${n.place}`).toBeDefined();
    expect(new Set(NODES.map((n) => n.id)).size).toBe(NODES.length);
    expect(nodesAt(T1.place).map((n) => n.id)).toContain('weir-pool');
    expect(nodesAt(-1)).toEqual([]);
  });

  it('the ladder overlaps: a tier N prime is the tier N+1 common, same line', () => {
    for (const n of NODES) {
      expect(MATERIALS[n.common]!.tier).toBe(n.tier);
      expect(MATERIALS[n.fine]!.tier).toBe(n.tier);
      expect(MATERIALS[n.prime]!.tier).toBe(n.tier + 1);
      const next = NODES.find((x) => x.line === n.line && x.tier === n.tier + 1);
      if (next) expect(next.common, `${n.id} prime feeds ${next.id}`).toBe(n.prime);
    }
  });

  // RED: needs = demand - 5. 3 failed.
  it('every node opens at exactly 55% — that is what ENTRY_GAP buys', () => {
    for (const n of NODES) {
      expect(n.needs).toBe(Math.max(1, n.demand - ENTRY_GAP));
      // `toBeCloseTo`, not `toBe`: Math.trunc(-2/3) is -0, which Object.is
      // says is not 0. Numerically it is, and `odds` proves it on the next line.
      expect(modifier(n.needs, n.demand)).toBeCloseTo(0, 10);
      expect(odds(n.needs, n.demand)).toBeCloseTo(0.55, 10);
      expect(locked(n.needs, n)).toBeNull();
      expect(locked(n.needs - 1, n)).toMatch(/needs/);
    }
  });
});

// ===========================================================================
describe('the roll — one throw, read twice', () => {
  // RED: `attempt` advances the generator twice. 1 failed — but ONLY after the
  // roll2d10 comparison below was added; the circular version caught 0. See the
  // RULE 4 LOG at the foot of the file.
  it('is deterministic: same seed, same catch, forever', () => {
    for (const [seed, level] of [[1, 1], [999, 14], [0x5eed, 26]] as const) {
      expect(attempt(seed, level, T3)).toEqual(attempt(seed, level, T3));
    }
    const a = gather(77, 20, T3, 50);
    const b = gather(77, 20, T3, 50);
    expect(a).toEqual(b);

    // ★ ONE ADVANCE PER ATTEMPT, MEASURED AGAINST dice.ts AND NOT AGAINST
    // ITSELF. `DICE.md` §1 needs rolls-consumed = rolls-resolved or a replay
    // cannot be audited. ⚠️ The first version of this block walked the seed
    // with `attempt()` and compared the answer to `attempt()` — circular, and
    // a mutant that called `check` twice passed it clean. Rule 4 found that;
    // the fix is to compare against `roll2d10`, which knows nothing about us.
    const r0 = roll2d10(77);
    const a0 = attempt(77, 20, T3);
    expect(a0.seed).toBe(r0.seed);
    expect(a0.roll.dice).toEqual(r0.dice);
    let s = 77;
    for (let i = 0; i < 50; i++) s = roll2d10(s).seed;
    expect(a.seed).toBe(s);
  });

  // RED: `chances` splits rows on the MODIFIED total. 3 failed.
  it('the advertised chances are the actual chances', () => {
    for (const level of [1, 6, 12, 14, 20, 26, 30]) {
      for (const n of [T1, T3, T5]) {
        const c = chances(level, n);
        expect(c.miss + c.common + c.fine + c.prime).toBeCloseTo(1, 10);
        // The pass side must agree with dice.odds exactly, or the button lies.
        expect(c.common + c.fine + c.prime).toBeCloseTo(odds(level, n.demand), 10);

        const N = 40000;
        const t = tally(level, n, N);
        for (const row of ['miss', 'common', 'fine', 'prime'] as Row[]) {
          expect(t[row] / N, `L${level} ${n.id} ${row}`).toBeCloseTo(c[row], 2);
        }
      }
    }
  });

  // RED: a miss returns `n.common`. 2 failed.
  it('failure costs time and nothing else', () => {
    let s = 31337;
    for (let i = 0; i < 5000; i++) {
      const a = attempt(s, 1, T5);
      s = a.seed;
      expect(a.got === null).toBe(a.row === 'miss');
    }
    // And XP does not know the roll happened at all.
    expect(xpPer(1, T5)).toBe(xpPer(1, T5));
    expect(xpPer(1, T5)).toBeGreaterThan(0);
  });
});

// ===========================================================================
describe('yields improve with level', () => {
  // RED: `xpPer` uses a constant 0.55 instead of `odds`. 5 failed.
  it('a node pays strictly better the further you get into it, up to the clamp', () => {
    const at = (l: number) => xpPerHour(l, T5);
    // T5 demand 26; grade never reaches +3 inside the cap, so no fade here.
    // The step is every THREE levels — `modifier` divides the margin by 3 —
    // so 24..26 pay alike, then 27..29 more, then 30 more again. Monotone
    // non-decreasing everywhere, strictly increasing across a step.
    for (let l = T5.needs; l < 30; l++) expect(at(l + 1)).toBeGreaterThanOrEqual(at(l));
    expect(at(28)).toBe(at(24));            // same rung of the modifier
    expect(at(29)).toBeGreaterThan(at(28)); // margin 3 -> mod +1, the one step
    expect(at(30)).toBe(at(29));            // cap reached before the next step
    expect(at(24)).toBeCloseTo(150 * 95 * 0.55, 6);   //  7,838
    expect(at(30)).toBeCloseTo(150 * 95 * 0.64, 6);   //  9,120
    expect(at(30) / at(24)).toBeCloseTo(0.64 / 0.55, 6);
  });

  // RED: `rowFor` drops the `picked` branch, so prime stays open. 2 failed.
  it('good rows get commoner, and the astonishing row gets rarer, then stops', () => {
    // Entry (55%): 1 in 55 of your catches astonishes.
    const entry = chances(T1.needs, T1);
    expect(entry.prime).toBeCloseTo(0.01, 10);
    expect(entry.prime / (1 - entry.miss)).toBeCloseTo(1 / 55, 4);

    // Fully outgrown: you catch nearly everything, and it is always junk.
    const done = chances(30, T1);
    expect(done.miss).toBeCloseTo(0.06, 10);
    expect(done.common).toBeGreaterThan(entry.common);
    expect(done.prime).toBe(0);
    expect(tally(30, T1, 20000).prime).toBe(0);
  });

  // RED: `chances` doubles the modifier, escaping the clamp. 3 failed.
  it('THE CLAMP: hopeless still lands, and mastered still misses', () => {
    // ±6 is the whole promise of dice.ts, and gathering must not launder it.
    const hopeless = chances(0, T5);            // level 0 vs demand 26 -> mod -6
    const mastered = chances(30, T1);           // level 30 vs demand 2  -> mod +6
    expect(modifier(0, T5.demand)).toBe(-MOD_CAP);
    expect(modifier(30, T1.demand)).toBe(MOD_CAP);
    expect(1 - hopeless.miss).toBeCloseTo(0.10, 10);
    expect(mastered.miss).toBeCloseTo(0.06, 10);

    // ...and empirically, both really happen.
    expect(tally(0, T5, 5000, 11).miss).toBeLessThan(5000);
    expect(tally(30, T1, 5000, 22).miss).toBeGreaterThan(0);

    // ★ The texture the brief asked for, as numbers: outmatched, you almost
    // never catch anything — and it is NEVER junk when you do.
    expect(hopeless.common).toBe(0);
    expect(hopeless.fine).toBeCloseTo(0.09, 10);
    expect(hopeless.prime).toBeCloseTo(0.01, 10);
    // Comfortable, it is almost always junk.
    expect(mastered.common).toBeCloseTo(0.79, 10);
  });
});

// ===========================================================================
describe('the reason to move on', () => {
  // RED: `fade()` returns 1 always. 2 failed.
  it('a picked-over node fades on a schedule, and says so', () => {
    expect(FADE_AT).toBe(3);
    for (const [level, want] of [[10, 1], [11, 0.9], [14, 0.8], [17, 0.7], [30, 0.6]] as const) {
      expect(grade(level, T1)).toBe(modifier(level, T1.demand));
      expect(fade(level, T1)).toBeCloseTo(want, 10);
    }
    expect(pickedOver(10, T1)).toBe(false);   // grade 2
    expect(pickedOver(11, T1)).toBe(true);    // grade 3
    const r = report(30, T1);
    expect(r.pickedOver).toBe(true);
    expect(r.fade).toBeCloseTo(0.6, 10);
    expect(r.chances.prime).toBe(0);
    expect(r.outgrown).toBe(true);
    expect(report(24, T5).outgrown).toBe(false);
  });

  // RED: RUNG tier-2 xp 7 -> 3. 4 failed.
  it('moving on is worth 15x at the cap, and the shallows visibly decline', () => {
    expect(xpPerHour(30, T1)).toBeCloseTo(360 * 3 * 0.94 * 0.6, 6);   //   609
    expect(xpPerHour(30, T5)).toBeCloseTo(150 * 95 * 0.64, 6);        // 9,120
    expect(xpPerHour(30, T5) / xpPerHour(30, T1)).toBeGreaterThan(14);

    // Declines: peak rate on a tier-1 node is at grade +2, not at level 30.
    const peak = Math.max(...Array.from({ length: 31 }, (_, l) => xpPerHour(l, T1)));
    expect(xpPerHour(30, T1)).toBeLessThan(peak);

    // bestFor climbs the ladder, never back down it.
    let last = 0;
    for (let l = 1; l <= 30; l++) {
      const b = bestFor(l);
      expect(b).not.toBeNull();
      expect(b!.tier).toBeGreaterThanOrEqual(last);
      last = b!.tier;
    }
    expect(bestFor(1)!.tier).toBe(1);
    expect(bestFor(30)!.tier).toBe(5);
    expect(bestFor(30, 'stone')!.line).toBe('stone');
    expect(bestFor(0)).toBeNull();
  });

  // The finding recorded in §OVERREACH: without the gate, the 10% floor makes
  // the deepest node the optimal opening move.
  // RED: deleted the `locked` guard from `bestFor`. 4 failed.
  it('the hard gate is load-bearing: past the clamp, overreach would pay', () => {
    const at1 = NODES.filter((n) => n.line === 'water')
      .map((n) => Math.round(xpPerHour(1, n)));
    expect(at1).toEqual([594, 756, 851, 756, 1425]);
    expect(at1[4]!).toBeGreaterThan(at1[0]! * 2);      // 2.4x the honest rate
    // The gate is what forbids it.
    expect(bestFor(1)!.tier).toBe(1);
    for (const n of NODES) if (n.tier > 1) expect(locked(1, n)).not.toBeNull();
  });
});

// ===========================================================================
describe('the clock', () => {
  // RED: dropped the `+ 1` from `bank`'s `done`. 2 failed.
  it('bank agrees with engine.tick, exactly, in closed form', () => {
    const naive = (n: GatherNode, left0: number, elapsed: number) => {
      let left = left0 - elapsed;
      let done = 0;
      while (left <= 0) { done++; left += n.secs; }
      return { done, left };
    };
    for (const n of [T1, T3, T5]) {
      for (let left = 1; left <= n.secs; left++) {
        for (const elapsed of [1, 5, 60, 3600, 8 * 3600]) {
          const want = naive(n, left, elapsed);
          const got = bank(20, n, left, elapsed);
          expect({ done: got.done, left: got.left }, `${n.id} ${left}/${elapsed}`)
            .toEqual(want);
          expect(got.left).toBeGreaterThan(0);
          expect(got.left).toBeLessThanOrEqual(n.secs);
          expect(got.xp).toBeCloseTo(xpPer(20, n) * want.done, 6);
        }
      }
    }
    expect(bank(20, T1, 10, 0)).toEqual({ done: 0, left: 10, xp: 0 });
    expect(bank(20, T1, 10, -5)).toEqual({ done: 0, left: 10, xp: 0 });
  });

  // RED: `bank` double-pays the banked XP (x2). 2 failed.
  it('banking is exact, seedless and roll-free — 8 hours away is arithmetic', () => {
    const eight = bank(24, T5, T5.secs, 8 * 3600);
    expect(eight.done).toBe(Math.floor((8 * 3600) / T5.secs));       // 1,200
    expect(eight.xp).toBeCloseTo(1200 * 95 * 0.55, 6);               // 62,700
    // Same absence, twice, is the same number. No seed is threaded at all.
    expect(bank(24, T5, T5.secs, 8 * 3600)).toEqual(eight);
    // The hauls are owed, not rolled: the dice wait for the player.
    const h = gather(5, 24, T5, eight.done);
    expect(h.rows.length).toBe(1200);
    expect(Object.values(h.got).reduce((a, b) => a + b, 0))
      .toBe(1200 - h.rows.filter((r) => r === 'miss').length);
  });
});

// ===========================================================================
describe('the rate curve matches the arithmetic in the comments', () => {
  // RED: RUNG tier-3 secs 16 -> 20. 4 failed.
  it('per-tier rates land on SKILLS.md 600 x 1.9^(tier-1), within 3%', () => {
    const house = (t: number) => 600 * 1.9 ** (t - 1);
    const seen: number[] = [];
    for (const n of NODES.filter((x) => x.line === 'water')) {
      const r = xpPerHour(n.demand, n);          // grade 0, the on-level rate
      expect(odds(n.demand, n.demand)).toBeCloseTo(0.55, 10);
      expect(Math.abs(r - house(n.tier)) / house(n.tier), `tier ${n.tier}`)
        .toBeLessThan(0.03);
      seen.push(Math.round(r));
    }
    expect(seen).toEqual([594, 1155, 2228, 4158, 7838]);
  });

  // RED: asserted headline 594 -> 600. 1 failed. (Sanity on the table.)
  it('the headline numbers in the header comment are the real ones', () => {
    const best = (l: number) => Math.round(xpPerHour(l, bestFor(l)!));
    expect(best(1)).toBe(594);
    expect(best(5)).toBe(691);
    expect(best(10)).toBe(1155);
    expect(best(15)).toBe(2228);
    expect(best(20)).toBe(4158);
    expect(best(25)).toBe(7838);
    expect(best(30)).toBe(9120);
    // It is a curve, not a constant — the thing the flat 20s/30xp job was not.
    expect(best(30) / best(1)).toBeGreaterThan(15);
  });

  // RED: halved every RUNG.xp. 7 failed.
  it('1 to 30 on one skill is 7.9 hours of one button, and we say so', () => {
    let hours = 0;
    for (let l = 1; l < 30; l++) {
      hours += (xpForLevel(l + 1) - xpForLevel(l)) / xpPerHour(l, bestFor(l)!);
    }
    expect(xpForLevel(30)).toBe(39363);
    expect(hours).toBeGreaterThan(7.5);
    expect(hours).toBeLessThan(8.3);
    expect(Number(hours.toFixed(1))).toBe(7.9);
    // SKILLS.md budgeted ~8 h per skill. We are on it, not under it.
    expect(Math.abs(hours - 8) / 8).toBeLessThan(0.06);
  });

  it('the constants the comments quote are the constants the code uses', () => {
    expect(FINE_AT).toBe(16);
    expect(ENTRY_GAP).toBe(2);
    expect(MOD_CAP).toBe(6);
    // 16-19 is 14 of 100 outcomes; 20 alone is 1.
    let fine = 0, top = 0;
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) {
      if (a + b >= FINE_AT && a + b < 20) fine++;
      if (a + b === 20) top++;
    }
    expect(fine).toBe(14);
    expect(top).toBe(1);
  });
});

// ===========================================================================
// RULE 4 LOG — measured, not asserted.
//
// 17 mutations, applied one at a time to `gather.ts` (or, where marked, to this
// file), with `npx vitest run test/slice-gather.test.ts` after each and the
// source restored from a backup between runs. Counts are tests failed:
//
//   mutation                                            failed
//   --------------------------------------------------  ------
//   node prime -> 'glass-eel' (nonexistent)                2
//   weir-pool place 1 -> 999                               1
//   needs = demand - 5                                     3
//   attempt() advances the generator twice                 0  <- SURVIVED, below
//   chances() splits rows on the MODIFIED total            3
//   a miss returns n.common                                2
//   xpPer uses a constant 0.55 instead of odds()           5
//   rowFor drops the `picked` branch                       2
//   chances() doubles the modifier, escaping the clamp     3
//   fade() returns 1 always                                2
//   RUNG tier-2 xp 7 -> 3                                  4
//   bestFor drops its `locked` guard                       4
//   bank() drops the `+ 1` from done                       2
//   bank() double-pays the banked XP                       2
//   RUNG tier-3 secs 16 -> 20                              4
//   asserted headline 594 -> 600  (this file)              1
//   every RUNG.xp halved                                   7
//
// ⚠️ **ONE SURVIVED, AND IT IS THE WHOLE REASON FOR THE EXERCISE.** Making
// `attempt` burn two generator words instead of one breaks `DICE.md` §1's
// rolls-consumed = rolls-resolved, and it **failed nothing**: the determinism
// block walked the seed with `attempt()` and then compared the answer to
// `attempt()`. Circular — exactly the vacuous-guard shape `CLAUDE.md` rule 4
// warns about, and it would have shipped. It now compares against `roll2d10`,
// which knows nothing about this module, and the same mutation fails.
//
// All 17 mutations restored; the suite is green as it stands.
