// FOES — trouble that fights back. The owner, 2026-08-04: *"an enemy
// encounter might happen on that same view."* Ironsworn's progress-track
// fight, worn local: rounds, harm, and a kill that clears the way.
//
// ---- PROVEN RED, 2026-08-04 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, troubleFor, sceneFor, roadKey, FOE_ODDS, type Game } from '../src/game/engine';
import { FOES, HAPPENINGS, isFoe, troubleById } from '../src/game/events';
import { STOP, START, STOPS, NEEDS } from '../src/game/stops';

const to = STOP.get(START)!.near.find((n) => !NEEDS[roadKey(START, n)])!;
const key = roadKey(START, to);

/** A fight in progress, crafted directly so the dice stay in our hands. */
const fight = (left: number, provisions = 6): Game => ({
  ...initial(), mana: 999, provisions,
  building: { key, from: START, left: 7, secs: 14, to: 1, halts: [0.5], kit: 'packs' },
  facing: { key, event: 'brigands', rolled: null, foe: { left } },
});
const round = (g: Game, c1: number, c2: number, a = 6): Game =>
  apply(apply(g, { type: 'face', choice: 0, roll: { a, c1, c2 } }), { type: 'carry' });

describe('★ what waits at a halt is deterministic, and some of it fights', () => {
  it('troubleFor answers the same on every call', () => {
    expect(troubleFor(key, 0.5).id).toBe(troubleFor(key, 0.5).id);
  });

  it('★ across the map, halts produce BOTH kinds — foes are reachable', () => {
    let foes = 0, happenings = 0;
    for (const s of STOPS) {
      for (const n of s.near) {
        if (n < s.id) continue;
        for (const h of [0.25, 0.5, 0.75]) {
          const t = troubleFor(roadKey(s.id, n), h);
          if (isFoe(troubleById(t.id))) foes++;
          else happenings++;
        }
      }
    }
    expect(foes, 'no halt anywhere fights back').toBeGreaterThan(0);
    expect(happenings, 'every halt fights — FOE_ODDS is not odds').toBeGreaterThan(0);
    expect(FOE_ODDS).toBeLessThan(1);
  });

  it('every foe belongs to some ground, and every strength is a real track', () => {
    for (const f of FOES) {
      expect(f.on.length).toBeGreaterThan(0);
      expect(f.strength).toBeGreaterThanOrEqual(2);
      expect(f.choices.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('★★ a foe takes rounds — Ironsworn\'s progress track', () => {
  it('★ a strong hit marks two and the fight ASKS AGAIN', () => {
    const g = round(fight(3), 3, 4);
    expect(g.facing).not.toBeNull();
    expect(g.facing!.foe!.left).toBe(1);
    expect(g.facing!.rolled).toBeNull();
    // No banked momentum mid-fight — the kill pays at the end.
    expect(g.momentum).toBe(initial().momentum);
  });

  it('matched dice on a strong hit mark three', () => {
    const g = round(fight(4), 3, 3);
    expect(g.facing!.foe!.left).toBe(1);
  });

  it('a weak hit marks one and eats a provision', () => {
    // packs is the wrong tool on this leg (-1): iron 3 - 1 + a4 = 6 vs 9,5.
    const g = round(fight(3), 9, 5, 4);
    expect(g.facing!.foe!.left).toBe(2);
    expect(g.provisions).toBe(5);
  });

  it('★ a miss marks nothing, hurts as a miss always has, and the foe stands', () => {
    const g0 = fight(3);
    const g = round(g0, 9, 10, 1);
    expect(g.facing!.foe!.left).toBe(3);
    expect(g.provisions).toBe(5);
    expect(g.momentum).toBe(initial().momentum - 1);
    expect(g.building!.left).toBeGreaterThan(g0.building!.left);
  });

  it('★★ the kill clears the halt and lifts momentum by one', () => {
    const g = round(fight(2), 3, 4);
    expect(g.facing).toBeNull();
    expect(g.building!.halts).toEqual([]);
    expect(g.momentum).toBe(initial().momentum + 1);
  });

  it('★★ a miss with no provisions still fails the whole leg — foes are not safer', () => {
    const g = round(fight(3, 0), 9, 10, 1);
    expect(g.building).toBeNull();
    expect(g.facing).toBeNull();
  });
});

describe('★★ every halt is an encounter — the owner: "event has HP"', () => {
  it('★ a HAPPENING arms a strength track exactly like a foe', () => {
    // ⚠️ THE FIRST VERSION BUILT LEG 0|2 — whose halt happens to be a FOE, so
    // reverting happenings to one-roll left it green. Vacuous, proven by its
    // own sabotage. Now it hunts the map for a halt that is a HAPPENING.
    let found: { key: string; h: number } | null = null;
    outer: for (const s of STOPS) {
      for (const n of s.near) {
        if (n < s.id) continue;
        for (const h of [0.25, 0.5, 0.75]) {
          // Skip halts a SCENE claims — those arm as scenes, their own file.
          if (sceneFor(roadKey(s.id, n), h)) continue;
          const t = troubleFor(roadKey(s.id, n), h);
          if (!isFoe(troubleById(t.id))) { found = { key: roadKey(s.id, n), h }; break outer; }
        }
      }
    }
    expect(found).not.toBeNull();
    const [a] = found!.key.split('|').map(Number);
    let g: Game = { ...initial(), mana: 999,
      building: { key: found!.key, from: a!, left: 14, secs: 14, to: 1,
        halts: [found!.h], kit: 'packs' } };
    for (let i = 0; i < 200 && !g.facing; i++) g = apply(g, { type: 'push' });
    expect(g.facing).not.toBeNull();
    expect(isFoe(troubleById(g.facing!.event))).toBe(false);
    expect(g.facing!.foe).toBeDefined();
    expect(g.facing!.foe!.left).toBe(troubleById(g.facing!.event)!.strength);
  });

  it('every happening carries a real track', () => {
    for (const h of HAPPENINGS) expect(h.strength).toBeGreaterThanOrEqual(2);
  });
});
