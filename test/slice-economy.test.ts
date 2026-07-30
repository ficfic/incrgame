// THE ECONOMY, CHECKED AS ARITHMETIC RATHER THAN AS A CLAIM.
//
// `src/slice/economy.ts` makes four numeric promises, and a comment that says
// "1.35 outruns 1.15 by 17% a step" is worth exactly nothing until something
// divides the two. So this file asserts the CURVES — the price table term by
// term, the income ratio per purchase, the income ratio per LEVEL against the
// real `xpForLevel` from the engine, and the four no-strand invariants — and
// where a promise is about growth it asserts the ratio, not merely that the
// number went up. "It went up" passes for a rate that grows 0.1% and that is
// the treadmill this module exists to remove.
//
// Every failure recorded in §6 of `economy.ts` was produced by breaking the
// source on purpose and running this file.
import { describe, it, expect } from 'vitest';
import { xpForLevel, LEVEL_CAP } from '../src/slice/engine';
import {
  BASE_OBOLS_PER_SEC, TIER_YIELD, TIER_CAP,
  TALLY_CAP, TALLY_BASE, TALLY_GROWTH, TALLY_STEP, TALLY_XP_STEP,
  PASSAGES, PASSAGE,
  emptyEconomy, credit,
  tallyCost, nextTallyCost, tallyBlocked, buyTally,
  passageBlocked, buyPassage, payWith, hasPassage,
  reachedTier, yieldMultiplier, xpMultiplier,
  obolsForAction, xpForAction, obolsPerHour, hoursToNextTally, tallyPayback,
  type Economy, type Material,
} from '../src/slice/economy';

/** A player with money and nothing bought. */
const rich = (obols = 1_000_000): Economy => ({ ...emptyEconomy(), obols });

/** Buy the Tally `n` times from an unlimited purse. */
const tallied = (n: number): Economy => ({ ...rich(), tally: n });

const mats = (...tiers: number[]): Material[] =>
  tiers.map((t, i) => ({ id: `m${i}-t${t}`, tier: t }));

describe('the cost curve', () => {
  it('is exactly round(200 × 1.35^(n−1)), term by term', () => {
    // The table pasted in the module header. If either constant moves, this
    // list is what says so out loud instead of the balance drifting quietly.
    const want: Array<[number, number]> = [
      [1, 200], [2, 270], [3, 365], [4, 492], [5, 664],
      [10, 2979], [15, 13357], [19, 44365], [20, 59892],
    ];
    for (const [n, cost] of want) expect(tallyCost(n), `level ${n}`).toBe(cost);
    expect(TALLY_BASE).toBe(200);
    expect(TALLY_GROWTH).toBe(1.35);
  });

  it('rises with every level and stops dead at the cap', () => {
    for (let n = 2; n <= TALLY_CAP; n++) {
      expect(tallyCost(n)).toBeGreaterThan(tallyCost(n - 1));
    }
    expect(tallyCost(TALLY_CAP + 1)).toBe(Infinity);
    expect(tallyCost(0)).toBe(Infinity);
    expect(nextTallyCost(tallied(TALLY_CAP))).toBe(Infinity);
  });

  it('is a function of state and of nothing else', () => {
    // Determinism: the shop is the same price at 3 a.m. as at noon. There is
    // no clock in this module and this is the assertion that says so.
    for (let n = 1; n <= TALLY_CAP; n++) expect(tallyCost(n)).toBe(tallyCost(n));
    const e = tallied(7);
    expect(nextTallyCost(e)).toBe(nextTallyCost({ ...e }));
    expect(obolsPerHour(e)).toBe(obolsPerHour({ ...e }));
  });

  it('puts the first level inside ten minutes of work', () => {
    // A shop whose cheapest item is an hour away is a locked shop.
    const mins = hoursToNextTally(emptyEconomy()) * 60;
    expect(mins).toBeGreaterThan(1);
    expect(mins).toBeLessThan(10);
  });
});

describe('the rate actually grows — which is the whole job', () => {
  it('rises by exactly TALLY_STEP with every Tally level', () => {
    // ★ NOT "it went up". The ratio. A rate that grows 0.1% per purchase also
    // goes up, and that is the treadmill this module was written to delete.
    for (let n = 0; n < TALLY_CAP; n++) {
      const before = obolsPerHour(tallied(n));
      const after = obolsPerHour(tallied(n + 1));
      expect(after / before, `level ${n + 1}`).toBeCloseTo(TALLY_STEP, 10);
      // ⚠️ AND AGAINST A LITERAL, NOT ONLY AGAINST THE CONSTANT. Setting
      // TALLY_STEP to 1.0 — the exact defect this module exists to fix — left
      // the line above GREEN, because it compares the module to itself. Found
      // by sabotage on 2026-07-30 (rule 4), which is the entire argument for
      // breaking your own code before you trust the check.
      expect(after / before, `level ${n + 1}`).toBeGreaterThan(1.1);
      expect(after / before, `level ${n + 1}`).toBeLessThan(1.25);
    }
  });

  it('is 16.4× at a full Tally, and that is the ceiling', () => {
    expect(yieldMultiplier(tallied(TALLY_CAP))).toBeCloseTo(16.37, 2);
    // Capped, so it cannot run away: buying past 20 is refused, not priced.
    const full = tallied(TALLY_CAP);
    expect(buyTally(full)).toBe(full);
  });

  it('steps 1.9× per passage, so a DEEPER region pays MORE per hour', () => {
    // The reviewer's second finding, in one assertion: "later regions pay LESS
    // per hour". They now pay 1.9^(tier−1) more.
    let e: Economy = rich();
    let last = obolsPerHour(e);
    expect(reachedTier(e)).toBe(1);
    for (const p of PASSAGES) {
      e = buyPassage(e, p, mats(9, 9, 9)).economy;
      const now = obolsPerHour(e);
      expect(now / last, p.id).toBeCloseTo(TIER_YIELD, 10);
      last = now;
    }
    expect(reachedTier(e)).toBe(4);
  });

  it('grows 112× end to end against a 299× price — 1.053 per purchase', () => {
    const start = obolsPerHour(emptyEconomy());
    const end = obolsPerHour({ obols: 0, tally: TALLY_CAP, passages: PASSAGES.map((p) => p.id) });
    expect(end / start).toBeCloseTo(16.37 * TIER_YIELD ** 3, 0);   // 112×

    // ★ THE SHAPE OF THE WHOLE ECONOMY, IN TWO ASSERTIONS.
    // Price must outrun income, or the shop empties itself in an afternoon...
    const priceSpan = tallyCost(TALLY_CAP) / tallyCost(1);
    expect(priceSpan).toBeGreaterThan(end / start);
    // ...but only just, or it is the treadmill again. The last upgrade costs
    // 2.7× the wall-clock of the first, over nineteen steps: 1.053 each.
    const ramp = priceSpan / (end / start);
    expect(ramp).toBeLessThan(3);
    expect(ramp ** (1 / (TALLY_CAP - 1))).toBeCloseTo(1.053, 2);
  });

  it('pays back slower and slower, so no upgrade is ever free', () => {
    // The anti-explosion check. If payback FELL, each upgrade would buy the
    // next one sooner than the last and the whole shop would empty in an
    // afternoon — as broken as a shop that never opens.
    for (let n = 1; n < TALLY_CAP; n++) {
      expect(tallyPayback(tallied(n)), `level ${n + 1}`)
        .toBeGreaterThan(tallyPayback(tallied(n - 1)));
    }
    expect(tallyPayback(tallied(0))).toBeLessThan(1);       // first: under an hour
    expect(tallyPayback(tallied(TALLY_CAP - 1))).toBeLessThan(20); // last: still finite
    expect(tallyPayback(tallied(TALLY_CAP))).toBe(Infinity);
  });

  it('pays an action more obols the more Tally you own', () => {
    const work = { secs: 20, tier: 1 };
    expect(obolsForAction(emptyEconomy(), work)).toBe(10);
    expect(obolsForAction(tallied(1), work)).toBe(11);
    expect(obolsForAction(tallied(TALLY_CAP), work)).toBe(163);
    // Never zero, however short the action.
    expect(obolsForAction(emptyEconomy(), { secs: 1, tier: 1 })).toBeGreaterThanOrEqual(1);
  });
});

describe('the XP rate against the level curve — the geometric slowdown', () => {
  it('confirms the curve it is fighting: 1.2× more XP per level, forever', () => {
    // Read off the REAL `xpForLevel`, not off SKILLS.md, because the module is
    // balanced against what ships. (`xpForLevel` rounds, so the per-step ratio
    // wobbles ±1% down at the cheap end; the span across the whole cap does
    // not, and the span is what the balance depends on.)
    const step = (L: number): number => xpForLevel(L + 1) - xpForLevel(L);
    for (let L = 5; L < LEVEL_CAP - 1; L++) {
      expect(step(L + 1) / step(L), `level ${L}`).toBeGreaterThan(1.185);
      expect(step(L + 1) / step(L), `level ${L}`).toBeLessThan(1.215);
    }
    const span = step(LEVEL_CAP - 1) / step(1);
    expect(span).toBeCloseTo(1.2 ** (LEVEL_CAP - 2), 0);   // 165×
    expect(span).toBeGreaterThan(160);
  });

  it('turns a 165× wall into a 1.06-per-level ramp', () => {
    // ★ THE ITEM, IN ONE ASSERTION.
    //   cost span   1.2^28                = 165×
    //   income span 1.08^20 × 1.9^3       = 4.66 × 6.86 = 32×
    //   per level   (165/32)^(1/28)       = 1.060
    const step = (L: number): number => xpForLevel(L + 1) - xpForLevel(L);
    const costSpan = step(LEVEL_CAP - 1) / step(1);
    const incomeSpan = TALLY_XP_STEP ** TALLY_CAP * TIER_YIELD ** PASSAGES.length;
    expect(incomeSpan).toBeCloseTo(31.96, 1);

    const perLevel = (costSpan / incomeSpan) ** (1 / (LEVEL_CAP - 2));
    expect(perLevel).toBeCloseTo(1.06, 2);
    // Slower than 1.2 — levels still get longer, which is what a level is for.
    expect(perLevel).toBeLessThan(1.2);
    // And strictly above 1 — income must NOT outrun cost, or the cap is
    // reached in an afternoon and the game empties from the other end.
    expect(perLevel).toBeGreaterThan(1);
  });

  it('leaves a plateau, never a wall, for a player who stops buying', () => {
    // Stop spending and income simply stops rising: 1.2 per level against a
    // flat rate is the original defect, and it is what the player CHOOSES if
    // they ignore the shop. Nothing is taken away — the rate they bought is
    // the rate they keep.
    const parked: Economy = { obols: 0, tally: 6, passages: ['toll-works'] };
    const worked = credit(parked, 10_000);
    expect(obolsPerHour(worked)).toBe(obolsPerHour(parked));
    expect(xpMultiplier(worked)).toBe(xpMultiplier(parked));
    expect(obolsPerHour(parked)).toBeGreaterThan(obolsPerHour(emptyEconomy()));
  });

  it('scales XP without ever handing out a level', () => {
    // `docs/SKILLS.md` §5: obols must not buy XP. They buy a RATE.
    expect(xpMultiplier(emptyEconomy())).toBe(1);
    expect(xpForAction(emptyEconomy(), { xp: 30 })).toBe(30);
    expect(xpForAction(tallied(1), { xp: 30 })).toBe(32);
    expect(xpMultiplier(tallied(TALLY_CAP))).toBeCloseTo(4.66, 2);
    // Nothing in this module returns XP or a level directly.
    expect(Object.keys(buyTally(rich()))).toEqual(['obols', 'tally', 'passages']);
  });

  it('counts the 1.9 tier step ONCE — depth, never level', () => {
    // If tier came from the skill level as well as from the region, every
    // player would get the multiplier they were supposed to be paying a toll
    // for, and the second sink would be decoration.
    expect(reachedTier(emptyEconomy())).toBe(1);
    expect(reachedTier({ ...emptyEconomy(), tally: TALLY_CAP })).toBe(1);
    const deep = buyPassage(rich(), PASSAGE.get('toll-stones')!, mats(3, 3, 3)).economy;
    expect(reachedTier(deep)).toBe(4);
    expect(obolsPerHour(deep) / obolsPerHour(rich())).toBeCloseTo(TIER_YIELD ** 3, 6);
  });
});

describe('you cannot buy what you cannot afford', () => {
  it('refuses the Tally and says the price', () => {
    const poor = { ...emptyEconomy(), obols: 199 };
    expect(tallyBlocked(poor)).toBe('needs 200 obols — you have 199');
    expect(buyTally(poor)).toBe(poor);          // same object: nothing happened
    const just = { ...emptyEconomy(), obols: 200 };
    expect(tallyBlocked(just)).toBeNull();
    expect(buyTally(just)).toEqual({ obols: 0, tally: 1, passages: [] });
  });

  it('refuses a passage for want of coin, and for want of material', () => {
    const under = PASSAGE.get('toll-under')!;
    const broke = { ...emptyEconomy(), obols: 5999 };
    expect(passageBlocked(broke, under, mats(2, 2))).toMatch(/needs 6000 obols/);
    expect(buyPassage(broke, under, mats(2, 2)).economy).toBe(broke);

    const noMats = { ...emptyEconomy(), obols: 6000 };
    expect(passageBlocked(noMats, under, mats(1, 1, 1)))
      .toBe('needs 2 of tier 2 or better — you have 0');
    // ⚠️ AND NOTHING IS TAKEN FOR A PURCHASE THAT DID NOT HAPPEN.
    const refused = buyPassage(noMats, under, mats(1, 1, 1));
    expect(refused.economy).toBe(noMats);
    expect(refused.consumed).toEqual([]);
  });

  it('never lets obols go negative, on any sequence of buys', () => {
    let e = credit(emptyEconomy(), 50_000);
    for (let i = 0; i < 200; i++) {
      e = buyTally(e);
      for (const p of PASSAGES) e = buyPassage(e, p, mats(3, 3, 3)).economy;
      expect(e.obols).toBeGreaterThanOrEqual(0);
    }
  });

  it('only credits real income', () => {
    const e = emptyEconomy();
    expect(credit(e, 0)).toBe(e);
    expect(credit(e, -5)).toBe(e);
    expect(credit(e, NaN)).toBe(e);
    expect(credit(e, 10.9).obols).toBe(10);
  });
});

describe('buying is idempotent where it must be', () => {
  it('charges a toll once, however many times it is tapped', () => {
    const works = PASSAGE.get('toll-works')!;
    const one = buyPassage(rich(5000), works).economy;
    expect(one.obols).toBe(4100);
    expect(hasPassage(one, works.id)).toBe(true);

    const two = buyPassage(one, works);
    expect(two.economy).toBe(one);            // not merely equal — untouched
    expect(two.consumed).toEqual([]);
    expect(one.passages).toEqual([works.id]); // and never doubled in the list
  });

  it('takes nothing more at a full Tally', () => {
    const full = tallied(TALLY_CAP);
    expect(tallyBlocked(full)).toMatch(/full/);
    expect(buyTally(full)).toBe(full);
    expect(buyTally(buyTally(full))).toBe(full);
  });

  it('never mutates the economy it was handed', () => {
    const before = rich(10_000);
    const snap = JSON.stringify(before);
    buyTally(before);
    buyPassage(before, PASSAGES[0]!, mats(5, 5, 5));
    credit(before, 99);
    expect(JSON.stringify(before)).toBe(snap);
    // And a buy that succeeds returns a NEW object, sharing no array.
    const after = buyPassage(before, PASSAGES[0]!, mats(5, 5, 5)).economy;
    expect(after).not.toBe(before);
    expect(after.passages).not.toBe(before.passages);
  });
});

describe('materials — priced abstractly, so a sibling module composes', () => {
  it('spends the cheapest qualifying material, never the best one', () => {
    // A shop that quietly eats your rarest material is a shop you learn not to
    // open. Lowest tier that clears the bar, then by id, so it is also the
    // same choice on every device.
    const held = mats(5, 2, 3, 2);
    const paid = payWith(held, { tier: 2, count: 2 })!;
    expect(paid.map((m) => m.tier)).toEqual([2, 2]);
    expect(paid.map((m) => m.id)).toEqual(['m1-t2', 'm3-t2']);
    expect(payWith(held, { tier: 2, count: 2 })).toEqual(paid); // deterministic
  });

  it('refuses when the tier is too low or the count too short', () => {
    expect(payWith(mats(1, 1, 1), { tier: 2, count: 1 })).toBeNull();
    expect(payWith(mats(4), { tier: 2, count: 2 })).toBeNull();
    expect(payWith(mats(4, 4), { tier: 2, count: 2 })!.length).toBe(2);
  });

  it('consumes exactly what the toll asked for, and reports it', () => {
    const stones = PASSAGE.get('toll-stones')!;
    const held = mats(3, 4, 3, 3, 9);
    const { economy, consumed } = buyPassage(rich(), stones, held);
    expect(consumed.length).toBe(stones.needs!.count);
    for (const m of consumed) expect(m.tier).toBeGreaterThanOrEqual(stones.needs!.tier);
    expect(consumed.map((m) => m.tier)).toEqual([3, 3, 3]);   // the 4 and 9 survive
    expect(held.length).toBe(5);                              // the pack is not mine to edit
    expect(hasPassage(economy, stones.id)).toBe(true);
  });

  it('lets the first toll be paid by a player who has never seen a material', () => {
    // Otherwise this module's opening purchase depends on another agent's file.
    expect(PASSAGES[0]!.needs).toBeUndefined();
    expect(passageBlocked(rich(), PASSAGES[0]!, [])).toBeNull();
  });
});

describe('no purchase can strand a player — failure is a plateau', () => {
  it('never lowers income, whatever is bought in whatever order', () => {
    // Walked forwards and backwards through the tolls, buying Tally levels in
    // between, asserting the rate is monotonic at every single step.
    for (const order of [PASSAGES, [...PASSAGES].reverse()]) {
      let e = credit(emptyEconomy(), 500_000);
      let rate = obolsPerHour(e);
      for (const p of order) {
        for (let i = 0; i < 4; i++) {
          e = buyTally(e);
          expect(obolsPerHour(e)).toBeGreaterThanOrEqual(rate);
          rate = obolsPerHour(e);
        }
        e = buyPassage(e, p, mats(4, 4, 4)).economy;
        expect(obolsPerHour(e)).toBeGreaterThanOrEqual(rate);
        rate = obolsPerHour(e);
      }
    }
  });

  it('leaves every unbought thing finitely far away, from any state', () => {
    // The formal version of "never unwinnable": prices are finite and fixed,
    // income is strictly positive and only rises, so time-to-afford is finite
    // from EVERY reachable state — including a state that just spent its last
    // obol on the wrong thing.
    const broke: Economy[] = [
      emptyEconomy(),
      { obols: 0, tally: TALLY_CAP, passages: [] },
      { obols: 0, tally: 0, passages: PASSAGES.map((p) => p.id) },
      { obols: 0, tally: 3, passages: ['toll-works'] },
    ];
    for (const e of broke) {
      expect(obolsPerHour(e)).toBeGreaterThan(0);
      for (const p of PASSAGES) {
        if (hasPassage(e, p.id)) continue;
        expect(p.obols / obolsPerHour(e), p.id).toBeLessThan(24);   // hours, finite
      }
      if (e.tally < TALLY_CAP) expect(hoursToNextTally(e)).toBeLessThan(24);
    }
  });

  it('never charges a price that another purchase moved', () => {
    // Invariant 3: a Tally level costs the same whatever passages are open,
    // and a toll costs the same whatever the Tally is. So spending everything
    // on one sink cannot push the other one further away.
    const bare = tallyCost(4);
    expect(tallyCost(4)).toBe(bare);
    const spent: Economy = { obols: 0, tally: 3, passages: PASSAGES.map((p) => p.id) };
    expect(nextTallyCost(spent)).toBe(bare);
    for (const p of PASSAGES) expect(PASSAGE.get(p.id)!.obols).toBe(p.obols);
  });

  it('takes nothing that cannot be earned again', () => {
    // Obols come from work, which repeats; materials from gathering nodes,
    // which repeat. Those are the only two things any sink here consumes —
    // asserted by shape, so a third field on `Economy` cannot slip a
    // non-renewable cost past this file.
    expect(Object.keys(emptyEconomy()).sort()).toEqual(['obols', 'passages', 'tally']);
    const e = rich(100_000);
    const after = buyPassage(buyTally(e), PASSAGES[1]!, mats(2, 2)).economy;
    expect(after.tally).toBeGreaterThanOrEqual(e.tally);      // never taken back
    expect(after.passages.length).toBeGreaterThanOrEqual(e.passages.length);
  });

  it('is bounded above, so nothing can run away with the game', () => {
    const maxed: Economy = { obols: 0, tally: TALLY_CAP, passages: PASSAGES.map((p) => p.id) };
    expect(reachedTier(maxed)).toBeLessThanOrEqual(TIER_CAP);
    expect(obolsPerHour(maxed, TIER_CAP)).toBeLessThan(1e6);
    expect(obolsForAction(maxed, { secs: 60, tier: 99 }))
      .toBe(obolsForAction(maxed, { secs: 60, tier: TIER_CAP }));   // tier is clamped
  });
});

describe('the shop as content', () => {
  it('has unique ids, rising prices and rising tiers', () => {
    expect(new Set(PASSAGES.map((p) => p.id)).size).toBe(PASSAGES.length);
    expect(new Set(PASSAGES.map((p) => p.opens)).size).toBe(PASSAGES.length);
    for (let i = 1; i < PASSAGES.length; i++) {
      expect(PASSAGES[i]!.obols).toBeGreaterThan(PASSAGES[i - 1]!.obols);
      expect(PASSAGES[i]!.tier).toBeGreaterThan(PASSAGES[i - 1]!.tier);
    }
  });

  it('makes the first spend a real fork rather than a sequence', () => {
    // Three Tally levels (835 obols, ×1.52) against the first toll (900, ×1.9).
    // Near-equal price, near-equal value: that is a decision. Ten times apart
    // in price would just be an order to buy them in.
    const threeLevels = tallyCost(1) + tallyCost(2) + tallyCost(3);
    const toll = PASSAGES[0]!.obols;
    expect(Math.max(threeLevels, toll) / Math.min(threeLevels, toll)).toBeLessThan(1.5);
    expect(TALLY_STEP ** 3).toBeLessThan(TIER_YIELD);
  });

  it('opens a region tag, never a place id', () => {
    // The economy knows no place numbers, so a region can be renumbered
    // without touching a price.
    for (const p of PASSAGES) {
      expect(typeof p.opens).toBe('string');
      expect(Number.isNaN(Number(p.opens))).toBe(true);
      expect(p.blurb.length).toBeGreaterThan(20);
    }
  });

  it('states its own constants where the balance depends on them', () => {
    expect(BASE_OBOLS_PER_SEC * 3600).toBe(1800);
    expect(TIER_YIELD).toBe(1.9);
    expect(TALLY_STEP).toBe(1.15);
    expect(TALLY_XP_STEP).toBe(1.08);
    expect(TALLY_CAP).toBe(20);
  });
});
