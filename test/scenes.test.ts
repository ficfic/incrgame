// SCENES — the encounter as its own little incremental game. The owner,
// 2026-08-05: *"every event should be an extended branching CYOA with hidden
// HP states… make each event a little incremental game of its own… incremental
// game components combined differently in various events."*
//
// ---- PROVEN RED, 2026-08-05 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, sceneFor, sceneStart, roadKey, legGround,
  type Game } from '../src/game/engine';
import { SCENES, sceneById } from '../src/game/scenes';
import { STOPS, STOP, START, type Ground } from '../src/game/stops';

const washout = sceneById('washout')!;

/** A leg whose dearer end stands on `ground`, or null. */
function legOn(ground: Ground): string | null {
  for (const s of STOPS) {
    for (const n of s.near) {
      if (n < s.id) continue;
      const key = roadKey(s.id, n);
      if (legGround(key) === ground) return key;
    }
  }
  return null;
}

/** A game mid-leg on `key`, facing the washout fresh. */
function inWashout(key: string, extra: Partial<Game> = {}): Game {
  const [a] = key.split('|').map(Number);
  return {
    ...initial(), mana: 20,
    building: { key, from: a!, left: 7, secs: 14, to: 1, halts: [0.5], kit: 'packs' },
    facing: { key, event: 'washout', rolled: null, scene: sceneStart(washout) },
    ...extra,
  };
}

const verb = (g: Game, id: string): Game => apply(g, { type: 'scene', verb: id });
const tick = (g: Game, secs: number): Game => apply(g, { type: 'tick', secs });

describe('★ a halt can be a scene, and it starts where the data says', () => {
  it('some halt on the map arms a scene', () => {
    let found = null;
    for (const s of STOPS) {
      for (const n of s.near) {
        if (n < s.id) continue;
        for (const h of [0.25, 0.5, 0.75]) {
          found = found ?? sceneFor(roadKey(s.id, n), h);
        }
      }
    }
    expect(found).not.toBeNull();
  });

  it('★ reaching a scene halt opens it at stage one, gauges at their marks', () => {
    let key = null;
    let halt = 0.5;
    outer: for (const s of STOPS) {
      for (const n of s.near) {
        if (n < s.id) continue;
        for (const h of [0.25, 0.5, 0.75]) {
          if (sceneFor(roadKey(s.id, n), h)) { key = roadKey(s.id, n); halt = h; break outer; }
        }
      }
    }
    expect(key).not.toBeNull();
    const [a] = key!.split('|').map(Number);
    let g: Game = { ...initial(), mana: 999,
      building: { key: key!, from: a!, left: 14, secs: 14, to: 1, halts: [halt], kit: 'packs' } };
    g = tick(g, 100);
    expect(g.facing?.scene).toBeDefined();
    const sc = sceneById(g.facing!.event)!;
    expect(g.facing!.scene!.stage).toBe(sc.stages[0]!.id);
    for (const gg of sc.gauges) {
      expect(g.facing!.scene!.gauges[gg.id]).toBe(gg.start);
    }
  });
});

describe('★★ the washout, played', () => {
  const key = legOn('stone') ?? roadKey(START, STOP.get(START)!.near[0]!);

  it('★ the water DRIFTS up with the clock — waiting is a move with a cost', () => {
    const g0 = inWashout(key);
    const g1 = tick(g0, 4);
    expect(g1.facing!.scene!.gauges.water!).toBeGreaterThan(g0.facing!.scene!.gauges.water!);
  });

  it('★ the journey type is a modifier: the same rain fills a bog faster than a moor', () => {
    const bog = legOn('bog');
    const moor = legOn('moor');
    expect(bog, 'no bog leg on this map').not.toBeNull();
    expect(moor, 'no moor leg on this map').not.toBeNull();
    const inBog = tick(inWashout(bog!), 4).facing!.scene!.gauges.water!;
    const inMoor = tick(inWashout(moor!), 4).facing!.scene!.gauges.water!;
    expect(inBog).toBeGreaterThan(inMoor);
  });

  it('★ Dig moves the cut by base plus iron', () => {
    const g = verb(inWashout(key), 'dig');
    // iron 3: 0.6 + 0.15 × 3 = 1.05
    expect(g.facing!.scene!.gauges.cut!).toBeCloseTo(1.05, 6);
  });

  it('a priced verb refuses an empty purse and charges a full one', () => {
    const broke = verb(inWashout(key, { mana: 2 }), 'channel');
    expect(broke.mana).toBe(2);
    expect(broke.facing!.scene!.gauges.water).toBe(3);
    const paid = verb(inWashout(key, { mana: 5 }), 'channel');
    expect(paid.mana).toBe(2);
    expect(paid.facing!.scene!.gauges.water).toBe(0);
  });

  it('★★ deep water BRANCHES the stage, bailing branches it back', () => {
    let g = inWashout(key);
    g = { ...g, facing: { ...g.facing!, scene: { ...g.facing!.scene!,
      gauges: { ...g.facing!.scene!.gauges, water: 7.9 } } } };
    g = tick(g, 1);
    expect(g.facing!.scene!.stage).toBe('flooded');
    for (let i = 0; i < 3; i++) g = verb(g, 'bail');
    expect(g.facing!.scene!.stage).toBe('open');
  });

  it('★★ digging the cut to ten CLEARS the way: halt consumed, momentum up', () => {
    let g = inWashout(key);
    for (let i = 0; i < 12 && g.facing; i++) g = verb(g, 'dig');
    expect(g.facing).toBeNull();
    expect(g.building!.halts).toEqual([]);
    expect(g.momentum).toBe(initial().momentum + 1);
  });

  it('★★ water at the ceiling is a SETBACK: a provision, a knockback, a fresh scene', () => {
    let g = inWashout(key);
    const left0 = g.building!.left;
    g = { ...g, facing: { ...g.facing!, scene: { ...g.facing!.scene!,
      gauges: { ...g.facing!.scene!.gauges, water: 11.9 } } } };
    g = tick(g, 1);
    expect(g.provisions).toBe(initial().provisions - 1);
    expect(g.building!.left).toBeGreaterThan(left0);
    expect(g.facing!.scene!.gauges.water).toBe(washout.gauges.find((x) => x.id === 'water')!.start);
    expect(g.facing!.scene!.stage).toBe('open');
  });

  it('★★ a setback with no provisions left fails the whole leg', () => {
    let g = inWashout(key, { provisions: 0 });
    g = { ...g, facing: { ...g.facing!, scene: { ...g.facing!.scene!,
      gauges: { ...g.facing!.scene!.gauges, water: 11.9 } } } };
    g = tick(g, 1);
    expect(g.building).toBeNull();
    expect(g.facing).toBeNull();
  });
});

describe('★★ the brigands: hidden HP, revealed by playing', () => {
  const key = legOn('stone') ?? roadKey(START, STOP.get(START)!.near[0]!);
  const brigands = sceneById('brigands')!;
  const parley = (extra: Partial<Game> = {}): Game => ({
    ...initial(), mana: 20,
    building: { key, from: Number(key.split('|')[0]), left: 7, secs: 14, to: 1,
      halts: [0.5], kit: 'packs' },
    facing: { key, event: 'brigands', rolled: null, scene: sceneStart(brigands) },
    ...extra,
  });

  it('★ their patience starts HIDDEN, and Read them shows it', () => {
    const g0 = parley();
    expect(g0.facing!.scene!.shown).toEqual([]);
    const g = verb(g0, 'read');
    expect(g.facing!.scene!.shown).toContain('patience');
  });

  it('a verb from the wrong stage does nothing', () => {
    const g = verb(parley(), 'stand');
    expect(g.facing!.scene!.gauges).toEqual(parley().facing!.scene!.gauges);
  });

  it('★ wearing their patience to nothing clears the way', () => {
    let g = parley();
    for (let i = 0; i < 12 && g.facing; i++) g = verb(g, 'talk');
    expect(g.facing).toBeNull();
    expect(g.momentum).toBe(initial().momentum + 1);
  });

  it('every scene names real gauges in its verbs and rules', () => {
    for (const sc of SCENES) {
      const ids = new Set(sc.gauges.map((x) => x.id));
      for (const v of sc.verbs) {
        for (const id of Object.keys(v.effect)) expect(ids.has(id), `${sc.id}:${v.id}:${id}`).toBe(true);
      }
      for (const r of sc.rules) expect(ids.has(r.gauge), `${sc.id}:${r.gauge}`).toBe(true);
      expect(sc.stages.length).toBeGreaterThanOrEqual(2);
    }
  });
});
