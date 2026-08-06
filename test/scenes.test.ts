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
    // Railed to 0 by the payment, then the verb's own time cost drifts it:
    // VERB_SECS 1.5 x 0.45 = 0.675 of water back in. Tapping costs time now.
    expect(paid.facing!.scene!.gauges.water).toBeCloseTo(0.675, 6);
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

describe('★★ the tuning pass, 2026-08-05 — the reviews made flesh', () => {
  const key = legOn('stone') ?? roadKey(START, STOP.get(START)!.near[0]!);

  it('★★ tapping is not free: every verb lets VERB_SECS of world in', () => {
    // Five free digs used to cost nothing; now they let ~3.4 of water rise.
    let g = inWashout(key);
    for (let i = 0; i < 5; i++) g = verb(g, 'dig');
    expect(g.facing!.scene!.gauges.water!).toBeGreaterThan(3 + 3);
  });

  it('★ a long absence is ONE gentle breath, not a drowning', () => {
    const g = tick(inWashout(key), 3600);
    // Clamped to DRIFT_CAP seconds of drift: 3 + 6 x 0.45 = 5.7, no setback.
    expect(g.facing!.scene!.gauges.water!).toBeLessThan(6);
    expect(g.provisions).toBe(initial().provisions);
  });

  it('★ a setback keeps what you LEARNED — revealed gauges stay revealed', () => {
    const brigands = sceneById('brigands')!;
    let g: Game = { ...initial(), mana: 20,
      building: { key, from: Number(key.split('|')[0]), left: 7, secs: 14, to: 1,
        halts: [0.5], kit: 'packs' },
      facing: { key, event: 'brigands', rolled: null,
        scene: { stage: 'knives', gauges: { patience: 4, temper: 8, nerve: 0.05 },
          shown: ['patience'] } } };
    void brigands;
    g = tick(g, 1);
    expect(g.facing!.scene!.stage).toBe(sceneById('brigands')!.stages[0]!.id);
    expect(g.facing!.scene!.shown).toContain('patience');
  });

  it('★★ the crew HARDENS: every third encounter cleared raises the weakest stat', () => {
    let g = inWashout(key, { cleared: 2 });
    for (let i = 0; i < 12 && g.facing; i++) g = verb(g, 'dig');
    expect(g.facing).toBeNull();
    expect(g.cleared).toBe(3);
    const before = Object.values(initial().stats).reduce((a, b) => a + b, 0);
    const after = Object.values(g.stats).reduce((a, b) => a + b, 0);
    expect(after).toBe(before + 1);
    // The weakest went up — heart or its twin at 1, never iron at 3.
    expect(Math.min(...Object.values(g.stats))).toBeGreaterThanOrEqual(
      Math.min(...Object.values(initial().stats)));
    expect(g.stats.iron).toBe(initial().stats.iron);
  });

  it('two clears do not harden — the third does', () => {
    let g = inWashout(key, { cleared: 0 });
    for (let i = 0; i < 12 && g.facing; i++) g = verb(g, 'dig');
    expect(g.cleared).toBe(1);
    expect(g.stats).toEqual(initial().stats);
  });
});

// ---- THE CONTENT PASS, 2026-08-06 — five more little games -----------------
//
// Each scene is a DIFFERENT assembly of the same components, and each test
// here pins the assembly that makes it distinct — the rot, the closeness tax,
// the deadline, the vigil, the race. Numbers are exact where floats allow and
// policy-driven where a scene needs playing rather than mashing.
describe('★★ the content pass: the troubles become little games', () => {
  const stoneKey = legOn('stone') ?? roadKey(START, STOP.get(START)!.near[0]!);

  /** A game mid-leg on `key`, facing `id` fresh. */
  function inScene(id: string, key: string, extra: Partial<Game> = {}): Game {
    const sc = sceneById(id)!;
    const [a] = key.split('|').map(Number);
    return {
      ...initial(), mana: 30,
      building: { key, from: a!, left: 7, secs: 14, to: 1, halts: [0.5], kit: 'packs' },
      facing: { key, event: id, rolled: null, scene: sceneStart(sc) },
      ...extra,
    };
  }
  /** The same game with some gauges set by hand. */
  const set = (g: Game, gauges: Record<string, number>): Game => ({
    ...g, facing: { ...g.facing!, scene: { ...g.facing!.scene!,
      gauges: { ...g.facing!.scene!.gauges, ...gauges } } } });

  describe('★ the wights: a siege where progress ROTS', () => {
    const bog = legOn('bog')!;

    it('the ward decays on its own — out-building the rot is the game', () => {
      const g = tick(set(inScene('wights', bog), { ward: 5 }), 4);
      expect(g.facing!.scene!.gauges.ward!).toBeLessThan(5);
    });

    it('★ open water eats the ward faster than the bog does', () => {
      const water = legOn('water');
      expect(water, 'no water leg on this map').not.toBeNull();
      const onWater = tick(set(inScene('wights', water!), { ward: 5 }), 4);
      const onBog = tick(set(inScene('wights', bog), { ward: 5 }), 4);
      expect(onWater.facing!.scene!.gauges.ward!).toBeLessThan(onBog.facing!.scene!.gauges.ward!);
    });

    it('★ their press branches them INTO the trench, and driving them out branches back', () => {
      let g = tick(set(inScene('wights', bog), { press: 7.9 }), 0.2);
      expect(g.facing!.scene!.stage).toBe('inTrench');
      for (let i = 0; i < 5 && g.facing!.scene!.stage === 'inTrench'; i++) g = verb(g, 'drive');
      expect(g.facing!.scene!.stage).toBe('held');
    });

    it('★★ played with a head — ring, rally when pressed, drive when they are in — it clears', () => {
      let g = inScene('wights', bog);
      for (let i = 0; i < 80 && g.facing; i++) {
        const st = g.facing.scene!;
        g = verb(g, st.stage === 'inTrench' ? 'drive'
          : (st.gauges.press ?? 0) >= 6.5 ? 'rally' : 'ring');
      }
      expect(g.facing).toBeNull();
      expect(g.momentum).toBe(initial().momentum + 1);
    });
  });

  describe('★ the watcher: watching is the win AND the cost', () => {
    it('its gait starts hidden, and the first watch shows it — at the price of it coming nearer', () => {
      const g0 = inScene('watcher', stoneKey);
      expect(g0.facing!.scene!.shown).toEqual([]);
      const g = verb(g0, 'watch');
      expect(g.facing!.scene!.shown).toContain('gait');
      expect(g.facing!.scene!.gauges.near!).toBeGreaterThan(g0.facing!.scene!.gauges.near!);
    });

    it('★★ eight patient watches learn its gait, and the line bends past it', () => {
      let g = inScene('watcher', stoneKey);
      for (let i = 0; i < 12 && g.facing; i++) g = verb(g, 'watch');
      expect(g.facing).toBeNull();
      expect(g.momentum).toBe(initial().momentum + 1);
    });

    it('★ too near BRANCHES: no watching it from under it, only staring it back', () => {
      let g = tick(set(inScene('watcher', stoneKey), { near: 9.5 }), 0.05);
      expect(g.facing!.scene!.stage).toBe('over');
      const stuck = verb(g, 'watch');
      expect(stuck.facing!.scene!.gauges).toEqual(g.facing!.scene!.gauges);
      for (let i = 0; i < 6 && g.facing!.scene!.stage === 'over'; i++) g = verb(g, 'stare');
      expect(g.facing!.scene!.stage).toBe('prowling');
    });
  });

  describe('★ the old stones: a deadline that only falls', () => {
    it('the daylight goes with the clock, and it going is the setback', () => {
      const g = tick(inScene('oldstones', stoneKey), 4);
      expect(g.facing!.scene!.gauges.daylight!).toBeCloseTo(9, 6);
      const dusk = tick(set(inScene('oldstones', stoneKey), { daylight: 0.2 }), 1);
      expect(dusk.provisions).toBe(initial().provisions - 1);
    });

    it('★ cracking is fast and feeds a HIDDEN hollow; sounding the ground shows it', () => {
      const g = verb(inScene('oldstones', stoneKey), 'crack');
      expect(g.facing!.scene!.gauges.hollow!).toBeCloseTo(1, 6);
      expect(g.facing!.scene!.shown).not.toContain('hollow');
      const heard = verb(g, 'sound');
      expect(heard.facing!.scene!.shown).toContain('hollow');
    });

    it('★★ seven cracks undermine the trench; shoring wins the stage back', () => {
      let g = inScene('oldstones', stoneKey);
      for (let i = 0; i < 7; i++) g = verb(g, 'crack');
      expect(g.facing!.scene!.stage).toBe('undermined');
      const stuck = verb(g, 'crack');
      expect(stuck.facing!.scene!.gauges).toEqual(g.facing!.scene!.gauges);
      for (let i = 0; i < 4 && g.facing!.scene!.stage === 'undermined'; i++) g = verb(g, 'shore');
      expect(g.facing!.scene!.stage).toBe('open');
    });

    it('★ the careful hand clears it inside the day, touching nothing dangerous', () => {
      let g = inScene('oldstones', stoneKey);
      for (let i = 0; i < 15 && g.facing; i++) g = verb(g, 'bare');
      expect(g.facing).toBeNull();
      expect(g.provisions).toBe(initial().provisions);
      expect(g.momentum).toBe(initial().momentum + 1);
    });
  });

  describe('★ the nightwatch: the win verb feeds the loss gauge', () => {
    it('a provision sent up the crag is the fastest word in the argument', () => {
      const g = verb(inScene('nightwatch', stoneKey), 'tea');
      expect(g.provisions).toBe(initial().provisions - 1);
      expect(g.facing!.scene!.gauges.quiet!).toBeCloseTo(2.2, 6);
    });

    it('★ the crag feeds the dread faster than open stone', () => {
      const crag = legOn('crag');
      expect(crag, 'no crag leg on this map').not.toBeNull();
      const up = tick(inScene('nightwatch', crag!), 4).facing!.scene!.gauges.dread!;
      const flat = tick(inScene('nightwatch', stoneKey), 4).facing!.scene!.gauges.dread!;
      expect(up).toBeGreaterThan(flat);
    });

    it('★★ dread branches to shifts — nobody climbs — and walking the rounds wins back the night', () => {
      let g = tick(set(inScene('nightwatch', stoneKey), { dread: 7.2 }), 0.05);
      expect(g.facing!.scene!.stage).toBe('shifts');
      const stuck = verb(g, 'climb');
      expect(stuck.facing!.scene!.gauges).toEqual(g.facing!.scene!.gauges);
      for (let i = 0; i < 8 && g.facing!.scene!.stage === 'shifts'; i++) g = verb(g, 'steady');
      expect(g.facing!.scene!.stage).toBe('watching');
    });

    it('★★ played as a vigil — climb, watch when the dread runs, steady the shifts — it clears', () => {
      let g = inScene('nightwatch', stoneKey);
      for (let i = 0; i < 60 && g.facing; i++) {
        const st = g.facing.scene!;
        g = verb(g, st.stage === 'shifts' ? 'steady'
          : (st.gauges.dread ?? 0) >= 6 ? 'watch' : 'climb');
      }
      expect(g.facing).toBeNull();
      expect(g.momentum).toBe(initial().momentum + 1);
    });
  });

  describe('★★ the last of the light: the owner\'s A-to-B race, paced', () => {
    const wood = legOn('wood')!;

    it('★ the crew moves on their OWN — the first helpful drift in the game', () => {
      const g = tick(inScene('longdark', wood), 4);
      expect(g.facing!.scene!.gauges.home!).toBeCloseTo(1.2, 6);
      expect(g.facing!.scene!.gauges.dark!).toBeGreaterThan(0);
    });

    it('★★ but their own speed LOSES to the dark — tapping is not optional', () => {
      let g = inScene('longdark', wood);
      for (let i = 0; i < 30 && g.facing?.scene; i++) g = tick(g, 1);
      // The dark reached twelve while the crew were still out: one setback.
      expect(g.provisions).toBe(initial().provisions - 1);
    });

    it('pressing them spends their breath to buy ground', () => {
      const g = verb(inScene('longdark', wood), 'press');
      expect(g.facing!.scene!.gauges.home!).toBeCloseTo(1.55, 6);
      expect(g.facing!.scene!.gauges.wind!).toBeLessThan(8);
    });

    it('★ blown branches the stage: no pressing the winded, only breathing them back', () => {
      let g = tick(set(inScene('longdark', wood), { wind: 0.3 }), 0.05);
      expect(g.facing!.scene!.stage).toBe('blown');
      const stuck = verb(g, 'press');
      expect(stuck.facing!.scene!.gauges).toEqual(g.facing!.scene!.gauges);
      for (let i = 0; i < 4 && g.facing!.scene!.stage === 'blown'; i++) g = verb(g, 'rest');
      expect(g.facing!.scene!.stage).toBe('strung');
    });

    it('★★ seven presses bring them home ahead of the dark', () => {
      let g = inScene('longdark', wood);
      for (let i = 0; i < 10 && g.facing; i++) g = verb(g, 'press');
      expect(g.facing).toBeNull();
      expect(g.momentum).toBe(initial().momentum + 1);
      expect(g.cleared).toBe(1);
    });
  });

  it('★ every scene can end both ways, every mod and stage-gate names something real', () => {
    for (const sc of SCENES) {
      expect(sc.rules.some((r) => r.end === 'cleared'), `${sc.id} cannot be cleared`).toBe(true);
      expect(sc.rules.some((r) => r.end === 'setback'), `${sc.id} cannot go wrong`).toBe(true);
      const ids = new Set(sc.gauges.map((x) => x.id));
      for (const m of Object.values(sc.mods ?? {})) {
        for (const id of Object.keys(m)) expect(ids.has(id), `${sc.id} mods ${id}`).toBe(true);
      }
      for (const v of sc.verbs) {
        for (const st of v.stages ?? []) {
          expect(sc.stages.some((x) => x.id === st), `${sc.id}:${v.id} gated on ${st}`).toBe(true);
        }
        for (const id of v.reveals ?? []) expect(ids.has(id), `${sc.id}:${v.id} reveals ${id}`).toBe(true);
      }
    }
  });

  it('★ every ground on the map now offers at least one scene', () => {
    for (const ground of ['moor', 'wood', 'crag', 'water', 'stone', 'bog'] as const) {
      expect(SCENES.some((s) => s.on.includes(ground)), `${ground} has no scene`).toBe(true);
    }
  });
});
