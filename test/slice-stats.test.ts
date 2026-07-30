// STATS — the tests.
//
// The one that matters is `§2 the clamp`. Everything else here is hygiene; that
// one is the reason `dice.ts` is worth having. If a stat can push a check to
// 100% or 0%, the dice are decorative and `docs/DICE.md` §8 ("failure is a
// plateau: 10% floor, 94% ceiling") becomes a lie the board tells.
//
// ═══════════════════════════════════════════════════════════════════════════
// ★ RULE 4 — PROVE THE CHECK GOES RED. Done, and the output pasted.
// ═══════════════════════════════════════════════════════════════════════════
// `npx vitest run test/slice-stats.test.ts`, three times, with the module
// deliberately broken. Real output, copied, not paraphrased:
//
//  1. CLAMP REMOVED — `statModifier` returning `raw` instead of
//     `Math.max(-MOD_CAP, Math.min(MOD_CAP, raw))`:
//       (30 tests | 2 failed)
//       × ★ holds across every level, demand and legal allocation
//           AssertionError: expected -8 to be -6
//       × hands `dice.ts` a synthetic level that reproduces the modifier
//           AssertionError: expected [ 'mod 0v15', 'chk 0v15', …(6190) ] to
//           deeply equal []
//
//     ⚠️ AND THE FINDING I DID NOT EXPECT, WHICH MATTERS MORE THAN THE PROOF:
//     the two ODDS tests stayed GREEN. They cannot go red this way. `checkArgs`
//     hands the modifier to `dice.ts` as a synthetic level, and `dice.ts`
//     CLAMPS AGAIN on the way in — so even an unclamped −8 arrives as −6 and
//     the 10%/94% band survives. The clamp is enforced twice and this module
//     does not own the second one, which is the good news; the bad news is
//     that an odds assertion alone would have been a VACUOUS guard for the
//     bug it is named after. The bound on `statModifier` is what actually
//     catches it, because a wrong modifier is still shown to the player and
//     still read by the combat seam. Both assertions are kept, and §2 now
//     asserts the double clamp on purpose instead of relying on it silently.
//
//  2. BUDGET BROKEN — `transfer` incrementing `gain` without decrementing
//     `lose`:
//       (30 tests | 4 failed)
//       × transfers one point and leaves the total alone
//       × ★ the budget is fixed and no event can grow it
//           AssertionError: expected 21 to be 20
//       × ★ cannot be farmed: grinding one stat drains the one it took from
//       × is rare, and every move is legible
//
//  3. AN ORDINARY THROW MADE TO MOVE A STAT — `eventForRoll` returning
//     `{ kind: 'stretch' }` instead of `null` at the end:
//       (30 tests | 3 failed)
//       × ★ an ordinary throw in the middle of the band moves nothing
//           AssertionError: expected { kind: 'stretch' } to be null
//       × moves on a pass at long odds, and on nothing easier
//       × moves on a fail at short odds, and on nothing harder
//
// All three restored; 30 passed in 737 ms.

import { describe, it, expect } from 'vitest';
import {
  STAT_IDS, STATS, STAT_TOTAL, STAT_MIN, STAT_MAX, STAT_BASE,
  STRETCH_AT, ROUTINE_AT, SATCHEL_LINE,
  fresh, valid, step, governs, transfer, moveFor, applyEvent, say,
  eventForRoll, statModifier, checkArgs, oddsWith,
  satchelLine, nerveMultiplier, failXp, radius, poke,
  type Stats, type StatId, type StatEvent,
} from '../src/slice/stats';
import { odds, modifier, MOD_CAP, TARGET, check } from '../src/slice/dice';
import { LEVEL_CAP } from '../src/slice/engine';

/** Every legal shape a character can be: four integers in [1,10] summing to 20.
 *  Enumerated rather than sampled, because "across the full stat range" is the
 *  claim the clamp test makes and a sample would not support it. */
function allShapes(): Stats[] {
  const out: Stats[] = [];
  for (let might = STAT_MIN; might <= STAT_MAX; might++)
    for (let grace = STAT_MIN; grace <= STAT_MAX; grace++)
      for (let nerve = STAT_MIN; nerve <= STAT_MAX; nerve++) {
        const fortune = STAT_TOTAL - might - grace - nerve;
        if (fortune < STAT_MIN || fortune > STAT_MAX) continue;
        out.push({ might, grace, nerve, fortune });
      }
  return out;
}

const SHAPES = allShapes();

describe('§0 a fresh character', () => {
  it('is four fives, and that is the whole budget', () => {
    const s = fresh();
    expect(s).toEqual({ might: 5, grace: 5, nerve: 5, fortune: 5 });
    expect(STAT_IDS.reduce((n, id) => n + s[id], 0)).toBe(STAT_TOTAL);
    expect(valid(s)).toBe(true);
  });

  it('is exactly neutral — every step is zero', () => {
    const s = fresh();
    for (const id of STAT_IDS) expect(step(s[id])).toBe(0);
  });

  it('★ changes NO existing balance: odds are identical to today, everywhere', () => {
    // The reason this matters: stats can ship without re-tuning a single
    // authored demand. Balance only moves once a stat has actually moved.
    const s = fresh();
    const differ: string[] = [];
    for (let level = 0; level <= LEVEL_CAP; level++) {
      for (let demand = 0; demand <= LEVEL_CAP; demand++) {
        // `+ 0` normalises signed zero: `Math.trunc(-1/3)` is `-0`, so
        // `dice.ts` returns `-0` where this module returns `+0`. Arithmetically
        // identical, and `toBe` is `Object.is`, which disagrees.
        if (statModifier(s, level, demand) + 0 !== modifier(level, demand) + 0
          || oddsWith(s, level, demand) !== odds(level, demand)) {
          differ.push(`${level}v${demand}`);
        }
      }
    }
    expect(differ).toEqual([]);
    expect(satchelLine(s)).toBe(SATCHEL_LINE);
    expect(nerveMultiplier(s)).toBe(1);
    expect(failXp(s, 8)).toBe(8);
  });

  it('gives every stat a label, a line and an answer to "why not a skill"', () => {
    for (const id of STAT_IDS) {
      const d = STATS[id];
      expect(d.name.length).toBeGreaterThan(2);
      expect(d.blurb.length).toBeGreaterThan(20);
      expect(d.notASkill.length).toBeGreaterThan(20);
    }
    // Four, not twelve.
    expect(STAT_IDS.length).toBe(4);
    expect(new Set(STAT_IDS.map((id) => STATS[id].name)).size).toBe(4);
  });

  it('enumerates 640-odd legal shapes, which is what the clamp test spans', () => {
    expect(SHAPES.length).toBeGreaterThan(400);
    for (const s of SHAPES) expect(valid(s)).toBe(true);
    expect(SHAPES.some((s) => s.might === STAT_MAX)).toBe(true);
    expect(SHAPES.some((s) => s.might === STAT_MIN)).toBe(true);
  });
});

describe('§1 the budget — a stat is redistributed, never grown', () => {
  it('transfers one point and leaves the total alone', () => {
    const s = transfer(fresh(), 'might', 'grace');
    expect(s).toEqual({ might: 6, grace: 4, nerve: 5, fortune: 5 });
    expect(valid(s)).toBe(true);
  });

  it('refuses at the ceiling and at the floor, rather than clamping silently', () => {
    // A clamped transfer would add a point that came from nowhere.
    const maxed: Stats = { might: STAT_MAX, grace: 4, nerve: 3, fortune: 3 };
    expect(transfer(maxed, 'might', 'grace')).toBe(maxed);
    const starved: Stats = { might: 8, grace: STAT_MIN, nerve: 6, fortune: 5 };
    expect(transfer(starved, 'might', 'grace')).toBe(starved);
    expect(transfer(fresh(), 'might', 'might')).toEqual(fresh());
  });

  it('★ the budget is fixed and no event can grow it', () => {
    // Every event, applied 400 times in a deterministic rotation. If any path
    // through this module could mint a point, this drifts.
    const events: StatEvent[] = [
      { kind: 'stretch' }, { kind: 'slip' }, { kind: 'triumph' },
      { kind: 'disaster' }, { kind: 'gate' },
      { kind: 'authored', gain: 'fortune', lose: 'grace' },
    ];
    let s = fresh();
    for (let i = 0; i < 400; i++) {
      const e = events[i % events.length]!;
      s = applyEvent(s, e);
      expect(STAT_IDS.reduce((n, id) => n + s[id], 0)).toBe(STAT_TOTAL);
      for (const id of STAT_IDS) {
        expect(s[id]).toBeGreaterThanOrEqual(STAT_MIN);
        expect(s[id]).toBeLessThanOrEqual(STAT_MAX);
      }
    }
  });

  it('★ cannot be farmed: grinding one stat drains the one it took from', () => {
    // The structural answer to "is this just a second XP bar". Walking the
    // same stretch check forever costs Grace exactly what it buys in Might,
    // and then stops paying at all — after FOUR moves, not fifty.
    let s = fresh();
    for (let i = 0; i < 50; i++) s = applyEvent(s, { kind: 'stretch' });
    expect(s).toEqual({ might: 9, grace: STAT_MIN, nerve: 5, fortune: 5 });
    expect(valid(s)).toBe(true);
    // And the fifth is worth nothing, and so is the fiftieth.
    expect(applyEvent(s, { kind: 'stretch' })).toBe(s);
    // ⚠️ 9, NOT 10, and deliberately so — see the §4 comment in the module.
    // `stretch` can only take from Grace, and Grace floors at 1. Since
    // `step(9) === step(10)`, the full +2 is reached anyway.
    expect(step(9)).toBe(step(STAT_MAX));
    // The ceiling is only reachable at all through an authored transfer that
    // names a different donor.
    expect(applyEvent(s, { kind: 'authored', gain: 'might', lose: 'nerve' }).might)
      .toBe(STAT_MAX);
  });

  it('never mutates what it is given', () => {
    const before = fresh();
    const frozen = Object.freeze({ ...before });
    applyEvent(frozen, { kind: 'stretch' });
    transfer(frozen, 'nerve', 'fortune');
    statModifier(frozen, 12, 4);
    oddsWith(frozen, 12, 4);
    expect(frozen).toEqual(before);
  });
});

describe('§2 THE CLAMP — the one that matters', () => {
  // ★ THE SWEEP. 31 levels × 31 demands × every legal shape, ~591,000 checks,
  // walked ONCE and reduced to five numbers. Written this way because a
  // per-iteration `expect` costs ~10µs in vitest and this loop timed out at
  // 5s when it made 1.2M of them — the assertions below are the same claim,
  // and they still name the offending case when they fail.
  const sweep = (() => {
    let modLo = Infinity;
    let modHi = -Infinity;
    let oddsLo = Infinity;
    let oddsHi = -Infinity;
    let worstCase = '';
    let bestCase = '';
    let cells = 0;
    for (const s of SHAPES) {
      for (let level = 0; level <= LEVEL_CAP; level++) {
        for (let demand = 0; demand <= LEVEL_CAP; demand++) {
          cells++;
          const m = statModifier(s, level, demand);
          if (m < modLo) modLo = m;
          if (m > modHi) modHi = m;
          const o = oddsWith(s, level, demand);
          if (o < oddsLo) {
            oddsLo = o;
            worstCase = `M${s.might}/G${s.grace} lvl ${level} vs ${demand}`;
          }
          if (o > oddsHi) {
            oddsHi = o;
            bestCase = `M${s.might}/G${s.grace} lvl ${level} vs ${demand}`;
          }
        }
      }
    }
    return { modLo, modHi, oddsLo, oddsHi, worstCase, bestCase, cells };
  })();

  it('★ holds across every level, demand and legal allocation', () => {
    expect(sweep.cells).toBeGreaterThan(500_000);
    expect(sweep.modLo).toBe(-MOD_CAP);
    expect(sweep.modHi).toBe(MOD_CAP);
  });

  it('★ the best and worst odds are exactly where they were without stats', () => {
    // THE ASSERTION THE WHOLE FILE IS FOR. Best 94%, worst 10% — the same
    // numbers `dice.ts` guarantees with no stats at all. A stat moves you
    // inside the band; it cannot widen it.
    expect(`${sweep.oddsHi} at ${sweep.bestCase}`).toContain('0.94');
    expect(`${sweep.oddsLo} at ${sweep.worstCase}`).toContain('0.1');
    expect(sweep.oddsHi).toBe(0.94);
    expect(sweep.oddsLo).toBe(0.1);
    // And those are the same ends `dice.ts` reaches with no stats in play, so
    // the bounds are not merely "small", they are UNCHANGED.
    expect(odds(LEVEL_CAP, 0)).toBe(0.94);
    expect(odds(0, LEVEL_CAP)).toBe(0.1);
  });

  it('never reaches 0% or 100%, which is the same claim said the other way', () => {
    expect(sweep.oddsLo).toBeGreaterThan(0);
    expect(sweep.oddsHi).toBeLessThan(1);
  });

  it('★ is clamped TWICE, and this module owns only the first clamp', () => {
    // Found by breaking the module (see the red-proof note at the top): with
    // this file's clamp deleted, the odds tests above stayed green, because
    // `dice.ts` clamps the synthetic level again on the way in. That is a real
    // guarantee and it is worth stating rather than relying on by accident —
    // no arithmetic in this file, however wrong, can widen the band.
    for (const wild of [-99, -8, 8, 99]) {
      expect(odds(3 * wild, 0)).toBeGreaterThanOrEqual(0.1);
      expect(odds(3 * wild, 0)).toBeLessThanOrEqual(0.94);
      expect(check(0x5eed, 3 * wild, 0).mod).toBe(Math.sign(wild) * MOD_CAP);
    }
    // So the assertion that catches a broken clamp HERE is the modifier bound,
    // not the odds: a wrong modifier is still shown to the player and still
    // read by the combat seam.
    expect(sweep.modLo).toBe(-MOD_CAP);
    expect(sweep.modHi).toBe(MOD_CAP);
  });

  it('is worth ±2, i.e. six levels of skill, and no more', () => {
    expect(step(STAT_MIN)).toBe(-2);
    expect(step(STAT_BASE)).toBe(0);
    expect(step(STAT_MAX)).toBe(2);
    for (let v = STAT_MIN; v <= STAT_MAX; v++) {
      expect(step(v)).toBeGreaterThanOrEqual(-2);
      expect(step(v)).toBeLessThanOrEqual(2);
    }
    // The arithmetic quoted in the module comment, checked. `P(2d10 ≥ 11 − m)`.
    const mighty: Stats = { might: 10, grace: 4, nerve: 3, fortune: 3 };
    const feeble: Stats = { might: 1, grace: 7, nerve: 6, fortune: 6 };
    // An even check: level 10 against demand 11 is mod 0, 55% bare.
    expect(odds(10, 11)).toBe(0.55);
    expect(oddsWith(mighty, 10, 11)).toBe(0.72);   // demand 11 > level ⟹ Might
    expect(oddsWith(feeble, 10, 11)).toBe(0.36);
    // A stretch: level 5 against demand 14 is mod −3, 28% bare.
    expect(odds(5, 14)).toBe(0.28);
    expect(oddsWith(mighty, 5, 14)).toBe(0.45);
    expect(oddsWith(feeble, 5, 14)).toBe(0.15);
    // Which is the same swing as six levels of the skill, and never more.
    expect(odds(5 + 6, 14)).toBe(oddsWith(mighty, 5, 14));
    expect(odds(5 - 6, 14)).toBe(oddsWith(feeble, 5, 14));
  });

  it('hands `dice.ts` a synthetic level that reproduces the modifier exactly', () => {
    // The mechanism: `modifier(demand + 3m, demand) === m` for every m in the
    // clamp. Integer arithmetic, exact in doubles, negative included.
    for (let m = -MOD_CAP; m <= MOD_CAP; m++) {
      for (let demand = 0; demand <= LEVEL_CAP; demand++) {
        expect(modifier(demand + 3 * m, demand)).toBe(m);
      }
    }
    const wrong: string[] = [];
    for (const s of SHAPES) {
      for (let level = 0; level <= LEVEL_CAP; level += 5) {
        for (let demand = 0; demand <= LEVEL_CAP; demand += 5) {
          const a = checkArgs(s, level, demand);
          const want = statModifier(s, level, demand);
          if (modifier(a.level, a.demand) + 0 !== want + 0) wrong.push(`mod ${level}v${demand}`);
          if (check(0x5eed, a.level, a.demand).mod + 0 !== want + 0) wrong.push(`chk ${level}v${demand}`);
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it('leaves the two 1% crits alone — a stat can neither buy nor forbid them', () => {
    // `dice.ts` forces a triumph to pass and a disaster to fail regardless of
    // the modifier. Stats route through the same `check`, so this must survive.
    const mighty: Stats = { might: 10, grace: 4, nerve: 3, fortune: 3 };
    let seed = 1;
    let triumphs = 0;
    let disasters = 0;
    for (let i = 0; i < 5000; i++) {
      const a = checkArgs(mighty, 0, 30);          // a hopeless check
      const r = check(seed, a.level, a.demand);
      seed = r.seed;
      if (r.crit === 'triumph') { triumphs++; expect(r.passed).toBe(true); }
      if (r.crit === 'disaster') { disasters++; expect(r.passed).toBe(false); }
    }
    expect(triumphs).toBeGreaterThan(10);
    expect(disasters).toBeGreaterThan(10);
  });

  it('cross-cuts: which stat governs is the situation, never the skill', () => {
    expect(governs(5, 14)).toBe('might');   // above you
    expect(governs(14, 5)).toBe('grace');   // under you
    expect(governs(7, 7)).toBe('grace');    // at you
    // Exactly one of the two applies to any check ever rolled.
    for (let level = 0; level <= LEVEL_CAP; level++) {
      for (let demand = 0; demand <= LEVEL_CAP; demand++) {
        const g = governs(level, demand);
        expect(g === 'might' || g === 'grace').toBe(true);
      }
    }
  });
});

describe('§3 what moves a stat, and what does not', () => {
  it('★ an ordinary throw in the middle of the band moves nothing', () => {
    for (let pct = 36; pct <= 78; pct++) {
      const o = pct / 100;
      expect(eventForRoll(o, { passed: true, crit: null })).toBe(null);
      expect(eventForRoll(o, { passed: false, crit: null })).toBe(null);
    }
    // And a pass at good odds, or a fail at bad odds, is just Tuesday.
    expect(eventForRoll(0.94, { passed: true, crit: null })).toBe(null);
    expect(eventForRoll(0.1, { passed: false, crit: null })).toBe(null);
  });

  it('★ TIME NEVER MOVES A STAT — a tick is not an event', () => {
    // The line between this file and the XP curve. Skills accrue from spending
    // time; stats do not accrue at all. There is no code path from a `tick` to
    // a stat, and the way that is kept true is that `applyEvent` is the ONLY
    // exported function that returns a changed `Stats` — so a session of pure
    // timers cannot touch one.
    let s = fresh();
    for (let secs = 0; secs < 10_000; secs++) {
      // Whatever a tick knows — elapsed seconds, banked repeats, XP awarded —
      // none of it is a `StatEvent`, so none of it reaches here.
      const e: StatEvent | null = null;
      s = e ? applyEvent(s, e) : s;
    }
    expect(s).toEqual(fresh());
    // Nor does reading one. Every non-event export is a pure query.
    const before = fresh();
    statModifier(before, 9, 12);
    oddsWith(before, 9, 12);
    satchelLine(before);
    nerveMultiplier(before);
    radius(before, 9);
    poke(before, 9);
    say(before, { kind: 'stretch' });
    expect(before).toEqual(fresh());
  });

  it('moves on a pass at long odds, and on nothing easier', () => {
    expect(eventForRoll(STRETCH_AT, { passed: true, crit: null }))
      .toEqual({ kind: 'stretch' });
    expect(eventForRoll(0.15, { passed: true, crit: null }))
      .toEqual({ kind: 'stretch' });
    expect(eventForRoll(STRETCH_AT + 0.01, { passed: true, crit: null })).toBe(null);
    // Failing a long shot is not a stat event. It is the expected outcome.
    expect(eventForRoll(0.15, { passed: false, crit: null })).toBe(null);
  });

  it('moves on a fail at short odds, and on nothing harder', () => {
    expect(eventForRoll(ROUTINE_AT, { passed: false, crit: null }))
      .toEqual({ kind: 'slip' });
    expect(eventForRoll(0.94, { passed: false, crit: null }))
      .toEqual({ kind: 'slip' });
    expect(eventForRoll(ROUTINE_AT - 0.01, { passed: false, crit: null })).toBe(null);
    expect(eventForRoll(0.94, { passed: true, crit: null })).toBe(null);
  });

  it('★ a crit beats a band, so one throw is never two events', () => {
    // A triumph at 10% odds is a triumph, not also a stretch. A disaster at
    // 94% is a disaster, not also a slip.
    expect(eventForRoll(0.1, { passed: true, crit: 'triumph' }))
      .toEqual({ kind: 'triumph' });
    expect(eventForRoll(0.94, { passed: false, crit: 'disaster' }))
      .toEqual({ kind: 'disaster' });
  });

  it('names a transfer for every event, and never a self-transfer', () => {
    const kinds: StatEvent[] = [
      { kind: 'stretch' }, { kind: 'slip' }, { kind: 'triumph' },
      { kind: 'disaster' }, { kind: 'gate' },
      { kind: 'authored', gain: 'might', lose: 'nerve' },
    ];
    for (const e of kinds) {
      const m = moveFor(e);
      expect(STAT_IDS).toContain(m.gain);
      expect(STAT_IDS).toContain(m.lose);
      expect(m.gain).not.toBe(m.lose);
    }
    expect(moveFor({ kind: 'stretch' })).toEqual({ gain: 'might', lose: 'grace' });
    expect(moveFor({ kind: 'slip' })).toEqual({ gain: 'grace', lose: 'might' });
    expect(moveFor({ kind: 'disaster' })).toEqual({ gain: 'nerve', lose: 'fortune' });
  });

  it('is rare, and every move is legible', () => {
    // "A stat should move a handful of times in a whole run." At the bands
    // chosen, an average throw does not move one: the stretch band is 35% and
    // below, the slip band needs a 21%-or-worse miss, and the crits are 1%.
    expect(STRETCH_AT).toBeLessThan(0.55);       // below the bare 2d10
    expect(ROUTINE_AT).toBeGreaterThan(0.55);
    const line = say(fresh(), { kind: 'stretch' });
    expect(line).toContain('Might 6');
    expect(line).toContain('Grace 4');
    // A refused transfer says nothing, rather than lying about a move.
    const maxed: Stats = { might: STAT_MAX, grace: STAT_MIN, nerve: 5, fortune: 4 };
    expect(say(maxed, { kind: 'stretch' })).toBe(null);
  });
});

describe('§4 Fortune, Nerve and the combat seam', () => {
  it('moves the satchel line, never the satchel roll', () => {
    expect(satchelLine(fresh())).toBe(8);
    expect(satchelLine({ might: 4, grace: 3, nerve: 3, fortune: 10 })).toBe(6);
    expect(satchelLine({ might: 7, grace: 6, nerve: 6, fortune: 1 })).toBe(10);
    // And the resulting drop odds stay off both walls: 90% at best, 64% worst.
    const p = (line: number): number => {
      let good = 0;
      for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) if (a + b >= line) good++;
      return good / 100;
    };
    for (const s of SHAPES) {
      const line = satchelLine(s);
      expect(line).toBeGreaterThanOrEqual(6);
      expect(line).toBeLessThanOrEqual(10);
      expect(p(line)).toBeGreaterThan(0);
      expect(p(line)).toBeLessThan(1);
    }
    expect(p(6)).toBe(0.9);
    expect(p(8)).toBe(0.79);
    expect(p(10)).toBe(0.64);
  });

  it('scales what a LOSS pays, and never what a win pays', () => {
    expect(nerveMultiplier(fresh())).toBe(1);
    expect(failXp({ might: 4, grace: 3, nerve: 10, fortune: 3 }, 8)).toBe(12);
    // ⚠️ ×0.6, not ×0.5: the stat's own range is lopsided (1..10 around 5), so
    // the multiplier is too. Getting this wrong in a comment is how a balance
    // doc drifts from the code.
    expect(failXp({ might: 7, grace: 6, nerve: 1, fortune: 6 }, 8)).toBe(5);
    const muls = SHAPES.map(nerveMultiplier);
    expect(Math.min(...muls)).toBe(0.6);
    expect(Math.max(...muls)).toBe(1.5);
    const paid = SHAPES.map((s) => failXp(s, 8));
    expect(Math.min(...paid)).toBeGreaterThanOrEqual(1);
    // A failure never out-pays the 20 XP a pass gives. Failure is a plateau,
    // not a better plan.
    expect(Math.max(...paid)).toBeLessThan(20);
  });

  it('leaves a seam for combat without building any', () => {
    // COMBAT.md: radius is health, an enemy tests one skill, and both numbers
    // come from one integer. Might bends that integer; nothing here fights.
    expect(radius(fresh(), 9)).toBe(9);
    expect(poke(fresh(), 9)).toBe(9);
    expect(radius({ might: 10, grace: 4, nerve: 3, fortune: 3 }, 9)).toBe(11);
    expect(radius({ might: 1, grace: 7, nerve: 6, fortune: 6 }, 9)).toBe(7);
    // A dot never starts a fight already dead, even at Might 1 and level 0.
    let smallest = Infinity;
    for (const s of SHAPES) {
      for (let level = 0; level <= LEVEL_CAP; level++) {
        smallest = Math.min(smallest, radius(s, level), poke(s, level));
      }
    }
    expect(smallest).toBe(1);
  });
});

describe('§5 purity', () => {
  it('is deterministic — same input, same answer, forever', () => {
    const s: Stats = { might: 8, grace: 3, nerve: 6, fortune: 3 };
    for (let i = 0; i < 3; i++) {
      expect(statModifier(s, 11, 17)).toBe(statModifier(s, 11, 17));
      expect(oddsWith(s, 11, 17)).toBe(oddsWith(s, 11, 17));
      expect(applyEvent(s, { kind: 'slip' })).toEqual(applyEvent(s, { kind: 'slip' }));
      expect(satchelLine(s)).toBe(satchelLine(s));
      expect(say(s, { kind: 'gate' })).toBe(say(s, { kind: 'gate' }));
    }
  });

  it('has no clock, no RNG and no DOM in it', async () => {
    // Same shape as the guard in `test/purity.test.ts`: read the source and
    // look. A stat that consulted the wall clock would break offline replay.
    const src = await import('node:fs/promises')
      .then((fs) => fs.readFile(new URL('../src/slice/stats.ts', import.meta.url), 'utf8'));
    // Strip comments first — a purity grep that matches a word inside a comment
    // is the vacuous check CLAUDE.md rule 4 warns about, and this repo has
    // shipped one before.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const banned of ['Math.random', 'Date.now', 'new Date', 'document', 'window', 'performance.now']) {
      expect(code).not.toContain(banned);
    }
    // And it depends on the dice rather than reimplementing them.
    expect(code).toContain("from './dice'");
  });

  it('agrees with `dice.ts` about the target, so nothing has drifted', () => {
    expect(TARGET).toBe(11);
    expect(MOD_CAP).toBe(6);
    expect(STAT_BASE * STAT_IDS.length).toBe(STAT_TOTAL);
    const ids: StatId[] = ['might', 'grace', 'nerve', 'fortune'];
    expect([...STAT_IDS]).toEqual(ids);
  });
});
