// TROUBLE ON THE LINE, AND THE DICE THAT SETTLE IT.
//
// The dice are Ironsworn's (CC BY 4.0, attribution in dice.ts and README) and
// the point of adopting a played system is that the rules have ANSWERS: ties
// lose, the score caps at ten, burning replaces the score and resets. Those are
// checked as a truth table here so a refactor cannot quietly house-rule them.
//
// ---- PROVEN RED, 2026-08-03 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { judge, judgeBurned, burnHelps, legal, clampMomentum, STATS,
  START_STATS, MOMENTUM_MAX, MOMENTUM_MIN, MOMENTUM_RESET } from '../src/game/dice';
import { HAPPENINGS, happeningsOn } from '../src/game/events';
import { apply, initial, haltsFor, eventFor, buildSecs, roadKey, kitAdd, KITS,
  type Game, type Kit } from '../src/game/engine';
import { STOP, START, GOING, type Ground } from '../src/game/stops';

const tick = (g: Game, secs: number): Game => apply(g, { type: 'tick', secs });

/** A game standing at the start with the mana to lay the first pipe. */
const flush = (): Game => ({ ...initial(), mana: 999 });

/** Start the first lay and run it into its first hidden stop. */
function intoTrouble(): Game {
  const to = STOP.get(START)!.near[0]!;
  let g = apply(flush(), { type: 'build', to, kit: 'cart' });
  for (let i = 0; i < 40 && !g.facing; i++) g = tick(g, 0.5);
  return g;
}

describe('★ the action roll, by Ironsworn\'s book', () => {
  it('beats each challenge die STRICTLY — ties lose', () => {
    // score 7 vs 7 and 3: the tie is not beaten. Weak hit, not strong.
    expect(judge({ a: 4, c1: 7, c2: 3 }, 3).tier).toBe('weak');
    expect(judge({ a: 4, c1: 7, c2: 7 }, 3).tier).toBe('miss');
    expect(judge({ a: 4, c1: 6, c2: 3 }, 3).tier).toBe('strong');
    expect(judge({ a: 1, c1: 9, c2: 9 }, 1).tier).toBe('miss');
  });

  it('caps the action score at ten', () => {
    expect(judge({ a: 6, c1: 10, c2: 1 }, 5).score).toBe(10);
    // And a capped 10 still cannot beat a 10 — ties lose.
    expect(judge({ a: 6, c1: 10, c2: 1 }, 5).tier).toBe('weak');
  });

  it('★ matched challenge dice are a twist, whatever the tier', () => {
    expect(judge({ a: 6, c1: 2, c2: 2 }, 3).twist).toBe(true);
    expect(judge({ a: 1, c1: 9, c2: 9 }, 1).twist).toBe(true);
    expect(judge({ a: 3, c1: 2, c2: 9 }, 1).twist).toBe(false);
  });

  it('★ burning replaces the score with momentum, against the SAME dice', () => {
    const r = { a: 1, c1: 5, c2: 7 };
    expect(judge(r, 1).tier).toBe('miss');
    expect(judgeBurned(r, 8).tier).toBe('strong');
    expect(judgeBurned(r, 6).tier).toBe('weak');
    expect(burnHelps(r, 1, 8)).toBe(true);
    expect(burnHelps(r, 1, 2)).toBe(false);
    // Burning cannot help a roll that already won everything.
    expect(burnHelps({ a: 6, c1: 1, c2: 2 }, 3, 10)).toBe(false);
  });

  it('refuses dice that no die could roll', () => {
    expect(legal({ a: 0, c1: 5, c2: 5 })).toBe(false);
    expect(legal({ a: 3, c1: 11, c2: 5 })).toBe(false);
    expect(legal({ a: 3.5, c1: 5, c2: 5 })).toBe(false);
    expect(legal({ a: 6, c1: 10, c2: 1 })).toBe(true);
  });

  it('clamps momentum to Ironsworn\'s rails', () => {
    expect(clampMomentum(99)).toBe(MOMENTUM_MAX);
    expect(clampMomentum(-99)).toBe(MOMENTUM_MIN);
  });
});

describe('★ every ground has trouble waiting on it', () => {
  it('covers all six grounds', () => {
    for (const ground of Object.keys(GOING) as Ground[]) {
      expect(happeningsOn(ground).length, `no happening can occur on ${ground}`)
        .toBeGreaterThan(0);
    }
  });

  it('every choice names a real stat and speaks at every tier', () => {
    for (const h of HAPPENINGS) {
      expect(h.choices.length).toBeGreaterThanOrEqual(2);
      for (const c of h.choices) {
        expect(STATS).toContain(c.stat);
        for (const tier of ['strong', 'weak', 'miss'] as const) {
          expect(c[tier].length, `${h.id}/${c.label} says nothing on a ${tier}`)
            .toBeGreaterThan(20);
        }
      }
    }
  });

  it('the trouble on a road is the same on every device', () => {
    const halts = haltsFor('0|2', 13);
    expect(halts).toEqual(haltsFor('0|2', 13));
    expect(eventFor('0|2', halts[0]!).id).toBe(eventFor('0|2', halts[0]!).id);
    for (const h of halts) expect(h).toBeGreaterThan(0.3);
    for (const h of halts) expect(h).toBeLessThan(0.9);
  });

  it('★ trouble scales with length AND climb, one to three stops', () => {
    expect(haltsFor('x', 10, 0).length).toBe(1);
    expect(haltsFor('x', 30, 0).length).toBe(2);
    expect(haltsFor('x', 30, 60).length).toBe(3);
    expect(haltsFor('x', 10, 60).length).toBe(2);
  });
});

describe('★★ a hidden stop blocks the work until it is faced', () => {
  it('halts the build partway, and the fill sits exactly there', () => {
    const g = intoTrouble();
    expect(g.facing, 'the build never met its trouble').not.toBeNull();
    expect(g.building).not.toBeNull();
    const done = 1 - g.building!.left / g.building!.secs;
    expect(done).toBeGreaterThan(0.3);
    expect(done).toBeLessThan(0.9);
    // ⚠️ AND TIME NO LONGER MOVES THE WORK. Mana still arrives — the world does
    // not stop — but the pipe does not grow while trouble stands.
    const later = tick(g, 30);
    expect(later.building!.left).toBe(g.building!.left);
    expect(later.mana).toBeGreaterThan(g.mana);
    expect(later.facing).toEqual(g.facing);
  });

  it('names a happening that suits the ground it stands on', () => {
    const g = intoTrouble();
    expect(HAPPENINGS.some((h) => h.id === g.facing!.event)).toBe(true);
  });

  it('★ a strong hit resumes the work and lifts momentum', () => {
    let g = intoTrouble();
    const leftAtHalt = g.building!.left;
    g = apply(g, { type: 'face', choice: 0, roll: { a: 6, c1: 1, c2: 2 } });
    expect(g.facing!.rolled).not.toBeNull();
    g = apply(g, { type: 'carry' });
    expect(g.facing).toBeNull();
    expect(g.momentum).toBe(initial().momentum + 1);
    g = tick(g, 1);
    expect(g.building!.left).toBeLessThan(leftAtHalt);
  });

  it('★ a miss knocks the work back and momentum down — but the stop is faced', () => {
    let g = intoTrouble();
    const leftAtHalt = g.building!.left;
    g = apply(g, { type: 'face', choice: 0, roll: { a: 1, c1: 9, c2: 8 } });
    g = apply(g, { type: 'carry' });
    expect(g.facing).toBeNull();
    expect(g.momentum).toBe(initial().momentum - 1);
    expect(g.building!.left).toBeGreaterThan(leftAtHalt);
    // Faced is faced: the same stop does not rise twice.
    expect(g.building!.halts.length).toBeLessThan(2);
  });

  it('★ a weak hit eats provisions and moves on — mana is untouched', () => {
    let g = intoTrouble();
    const keep = g.provisions;
    const purse = g.mana;
    g = apply(g, { type: 'face', choice: 0, roll: { a: 4, c1: 2, c2: 9 } });
    g = apply(g, { type: 'carry' });
    expect(g.facing).toBeNull();
    expect(g.provisions).toBe(keep - 1);
    expect(g.mana).toBe(purse);
  });

  it('★★ a miss with no provisions left FAILS the leg outright', () => {
    let g = intoTrouble();
    g = { ...g, provisions: 0 };
    const gauge = { ...g.gauge };
    g = apply(g, { type: 'face', choice: 0, roll: { a: 1, c1: 9, c2: 8 } });
    g = apply(g, { type: 'carry' });
    // The expedition is over: no building, no facing, nothing laid, the mana
    // already sunk stays sunk, momentum takes the full hit.
    expect(g.building).toBeNull();
    expect(g.facing).toBeNull();
    expect(g.gauge).toEqual(gauge);
    expect(g.momentum).toBe(initial().momentum - 2);
    expect(g.at).toBe(START);
  });

  it('★ finishing a fresh lay restocks one provision', () => {
    const to = STOP.get(START)!.near[0]!;
    let g = apply(flush(), { type: 'build', to, kit: 'cart' });
    for (let i = 0; i < 80 && g.building; i++) {
      g = tick(g, 2);
      if (g.facing) {
        g = apply(g, { type: 'face', choice: 0, roll: { a: 6, c1: 1, c2: 2 } });
        g = apply(g, { type: 'carry' });
      }
    }
    expect(g.gauge[roadKey(START, to)]).toBe(1);
    expect(g.provisions).toBe(initial().provisions + 1);
  });

  it('★ the kit rides every roll: suited +1 can turn a weak hit strong', () => {
    // Stat iron 3. Dice a:3 vs 6 and 5 → score 6: beats 5, ties 6 → weak.
    // With a suited kit's +1 the score is 7 → beats both → strong. Same dice.
    const key = roadKey(START, STOP.get(START)!.near[0]!);
    const suited = KITS.find((k) => kitAdd(k, key) === 1);
    const flat = KITS.find((k) => kitAdd(k, key) === 0);
    expect(suited, 'no kit suits the first leg — pick a different fixture').toBeDefined();
    const run = (kit: Kit): Game => {
      const to = STOP.get(START)!.near[0]!;
      let g = apply(flush(), { type: 'build', to, kit });
      for (let i = 0; i < 40 && !g.facing; i++) g = tick(g, 0.5);
      const ev = HAPPENINGS.find((h) => h.id === g.facing!.event)!;
      const iron = ev.choices.findIndex((c) => c.stat === 'iron');
      const choice = iron >= 0 ? iron : 0;
      g = apply(g, { type: 'face', choice, roll: { a: 3, c1: 6, c2: 5 } });
      return apply(g, { type: 'carry' });
    };
    // Only meaningful when an iron-3 choice exists on the first leg's event.
    const probeEv = intoTrouble();
    const ev = HAPPENINGS.find((h) => h.id === probeEv.facing!.event)!;
    if (!ev.choices.some((c) => c.stat === 'iron')) return;
    const withSuit = run(suited!);
    if (flat) {
      const without = run(flat);
      // strong lifts momentum; weak eats provisions — the same dice must land
      // differently across the two kits.
      expect(withSuit.momentum).toBeGreaterThan(without.momentum);
    } else {
      expect(withSuit.momentum).toBe(initial().momentum + 1);
    }
  });

  it('★ burning momentum overrules the dice and resets to +2', () => {
    let g = intoTrouble();
    g = { ...g, momentum: 8 };
    g = apply(g, { type: 'face', choice: 0, roll: { a: 1, c1: 5, c2: 6 } });
    const burned = apply(g, { type: 'burn' });
    expect(burned.facing).toBeNull();
    // Strong via the burn: momentum reset to +2, then +1 for the strong hit.
    expect(burned.momentum).toBe(MOMENTUM_RESET + 1);
  });

  it('refuses a burn that would not help', () => {
    let g = intoTrouble();
    g = { ...g, momentum: 1 };
    g = apply(g, { type: 'face', choice: 0, roll: { a: 1, c1: 9, c2: 9 } });
    const same = apply(g, { type: 'burn' });
    expect(same.facing!.rolled).not.toBeNull();   // still standing there
  });

  it('refuses illegal dice and out-of-range choices', () => {
    const g = intoTrouble();
    expect(apply(g, { type: 'face', choice: 0, roll: { a: 7, c1: 1, c2: 1 } })).toBe(g);
    expect(apply(g, { type: 'face', choice: 99, roll: { a: 3, c1: 1, c2: 1 } })).toBe(g);
  });

  it('widening meets no trouble — it was faced when the line went in', () => {
    const to = STOP.get(START)!.near[0]!;
    let g: Game = { ...flush(), gauge: { [roadKey(START, to)]: 1 } };
    g = apply(g, { type: 'build', to, kit: 'cart' });
    expect(g.building!.halts).toEqual([]);
    // 90 wall-seconds is 36 of work at WORK_PACE — enough for any widen.
    for (let i = 0; i < 90 && g.building; i++) g = tick(g, 1);
    expect(g.facing).toBeNull();
    expect(g.gauge[roadKey(START, to)]).toBe(2);
  });

  it('★ START_STATS spends Ironsworn\'s exact array', () => {
    expect(Object.values(START_STATS).sort().join()).toBe('1,1,2,2,3');
  });
});
