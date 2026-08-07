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
    for (let i = 0; i < 30 && !g.facing; i++) g = apply(g, { type: 'push' });
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

  it('★ TURN-BASED: the clock never moves the water — only your verbs do', () => {
    // The owner, 2026-08-07: "it's turn based shit." Ticks change nothing.
    const g0 = inWashout(key);
    expect(tick(g0, 4).facing!.scene!.gauges).toEqual(g0.facing!.scene!.gauges);
    // A dig is a turn, and the world answers it: +0.7 of water.
    expect(verb(g0, 'dig').facing!.scene!.gauges.water!).toBeCloseTo(4.0, 6);
  });

  it('★ the journey type is a modifier: the same turn fills a bog faster than a moor', () => {
    const bog = legOn('bog');
    const moor = legOn('moor');
    expect(bog, 'no bog leg on this map').not.toBeNull();
    expect(moor, 'no moor leg on this map').not.toBeNull();
    const inBog = verb(inWashout(bog!), 'dig').facing!.scene!.gauges.water!;
    const inMoor = verb(inWashout(moor!), 'dig').facing!.scene!.gauges.water!;
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
    // Railed to 0 by the payment, then the world takes its turn: +1.0 of
    // water back in. Every tap buys the world a move.
    expect(paid.facing!.scene!.gauges.water).toBeCloseTo(1.0, 6);
  });

  it('★★ deep water BRANCHES the stage, bailing branches it back', () => {
    let g = inWashout(key);
    g = { ...g, facing: { ...g.facing!, scene: { ...g.facing!.scene!,
      gauges: { ...g.facing!.scene!.gauges, water: 7.9 } } } };
    g = verb(g, 'dig');   // the world's answer tips 7.9 over the line
    expect(g.facing!.scene!.stage).toBe('flooded');
    for (let i = 0; i < 3; i++) g = verb(g, 'bail');
    expect(g.facing!.scene!.stage).toBe('open');
  });

  it('★★ played with a head — dig, bail when the water runs — the way CLEARS', () => {
    // Dig-mashing floods the cut and locks the spade since the spam review;
    // this is the line a player who reads actually walks.
    let g = inWashout(key);
    for (let i = 0; i < 25 && g.facing; i++) {
      const st = g.facing.scene!;
      g = verb(g, st.stage === 'flooded' || (st.gauges.water ?? 0) > 6.5 ? 'bail' : 'dig');
    }
    expect(g.facing).toBeNull();
    expect(g.building!.halts).toEqual([]);
    expect(g.momentum).toBe(initial().momentum + 1);
  });

  it('★★ water at the ceiling is a SETBACK: a provision, a knockback, a fresh scene', () => {
    let g = inWashout(key);
    const left0 = g.building!.left;
    g = { ...g, facing: { ...g.facing!, scene: { ...g.facing!.scene!,
      gauges: { ...g.facing!.scene!.gauges, water: 11.9 } } } };
    g = verb(g, 'dig');   // your move stands; the world's answer hits the rail
    expect(g.provisions).toBe(initial().provisions - 1);
    expect(g.building!.left).toBeGreaterThan(left0);
    expect(g.facing!.scene!.gauges.water).toBe(washout.gauges.find((x) => x.id === 'water')!.start);
    expect(g.facing!.scene!.stage).toBe('open');
  });

  it('★★ a setback with no provisions left fails the whole leg', () => {
    let g = inWashout(key, { provisions: 0 });
    g = { ...g, facing: { ...g.facing!, scene: { ...g.facing!.scene!,
      gauges: { ...g.facing!.scene!.gauges, water: 11.9 } } } };
    g = verb(g, 'dig');
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

  it('★ patience is worn down by TALKING AND PAYING — pure talk gets knives', () => {
    // Talk-mashing hits the knives branch since the spam review; slipping
    // mana when their temper runs is what keeps the parley a parley.
    let g = parley();
    for (let i = 0; i < 15 && g.facing; i++) {
      const st = g.facing.scene!;
      g = verb(g, (st.gauges.temper ?? 0) >= 6.5 && g.mana >= 2 ? 'coin' : 'talk');
    }
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

  it('★★ tapping is not free: the world answers every verb', () => {
    // Five digs buy the world five turns: 3 + 5 x 0.7 = 6.5 of water.
    let g = inWashout(key);
    for (let i = 0; i < 5; i++) g = verb(g, 'dig');
    expect(g.facing!.scene!.gauges.water!).toBeGreaterThan(3 + 3);
  });

  it('★ a long absence changes NOTHING — the scene waits, turn-based', () => {
    const g0 = inWashout(key);
    const g = tick(g0, 3600);
    expect(g.facing!.scene!.gauges).toEqual(g0.facing!.scene!.gauges);
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
    // Standing costs a turn; the knives grind the last of the nerve away.
    g = verb(g, 'stand');
    expect(g.facing!.scene!.stage).toBe(sceneById('brigands')!.stages[0]!.id);
    expect(g.facing!.scene!.shown).toContain('patience');
  });

  it('★★ the crew HARDENS: every third encounter cleared raises the weakest stat', () => {
    let g = inWashout(key, { cleared: 2 });
    for (let i = 0; i < 25 && g.facing; i++) {
      const st = g.facing.scene!;
      g = verb(g, st.stage === 'flooded' || (st.gauges.water ?? 0) > 6.5 ? 'bail' : 'dig');
    }
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
    for (let i = 0; i < 25 && g.facing; i++) {
      const st = g.facing.scene!;
      g = verb(g, st.stage === 'flooded' || (st.gauges.water ?? 0) > 6.5 ? 'bail' : 'dig');
    }
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

    it('the ward rots a little every turn — out-building the rot is the game', () => {
      // Rallying does not touch the ward; the world's turn still eats 0.25.
      const g = verb(set(inScene('wights', bog), { ward: 5 }), 'rally');
      expect(g.facing!.scene!.gauges.ward!).toBeLessThan(5);
    });

    it('★ open water eats the ward faster than the bog does', () => {
      const water = legOn('water');
      expect(water, 'no water leg on this map').not.toBeNull();
      const onWater = verb(set(inScene('wights', water!), { ward: 5 }), 'rally');
      const onBog = verb(set(inScene('wights', bog), { ward: 5 }), 'rally');
      expect(onWater.facing!.scene!.gauges.ward!).toBeLessThan(onBog.facing!.scene!.gauges.ward!);
    });

    it('★ their press branches them INTO the trench, and driving them out branches back', () => {
      let g = verb(set(inScene('wights', bog), { press: 7.9 }), 'ring');
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

    it('★★ watched with a head — backing off before it stands over you — it clears', () => {
      // Watch-mashing walks it right up to the trench since the spam review.
      let g = inScene('watcher', stoneKey);
      for (let i = 0; i < 20 && g.facing; i++) {
        const st = g.facing.scene!;
        g = verb(g, st.stage === 'over' ? 'stare'
          : (st.gauges.near ?? 0) >= 7 ? 'back' : 'watch');
      }
      expect(g.facing).toBeNull();
      expect(g.momentum).toBe(initial().momentum + 1);
    });

    it('★ too near BRANCHES: no watching it from under it, only staring it back', () => {
      let g = verb(set(inScene('watcher', stoneKey), { near: 9.5 }), 'watch');
      expect(g.facing!.scene!.stage).toBe('over');
      const stuck = verb(g, 'watch');
      expect(stuck.facing!.scene!.gauges).toEqual(g.facing!.scene!.gauges);
      for (let i = 0; i < 6 && g.facing!.scene!.stage === 'over'; i++) g = verb(g, 'stare');
      expect(g.facing!.scene!.stage).toBe('prowling');
    });
  });

  describe('★ the old stones: the hollow works at the wall every turn', () => {
    it('★ the clock does nothing; each turn the hollow grows a little on its own', () => {
      const g0 = inScene('oldstones', stoneKey);
      expect(tick(g0, 60).facing!.scene!.gauges).toEqual(g0.facing!.scene!.gauges);
      // One careful bare: the world still answers with 0.5 of hollow.
      expect(verb(g0, 'bare').facing!.scene!.gauges.hollow!).toBeCloseTo(0.8, 6);
    });

    it('★ cracking is fast and feeds the HIDDEN hollow; sounding the ground shows it', () => {
      const g = verb(inScene('oldstones', stoneKey), 'crack');
      // 1.0 from the crack, 0.8 from the world's turn — and still unseen.
      expect(g.facing!.scene!.gauges.hollow!).toBeCloseTo(1.8, 6);
      expect(g.facing!.scene!.shown).not.toContain('hollow');
      const heard = verb(g, 'sound');
      expect(heard.facing!.scene!.shown).toContain('hollow');
    });

    it('★★ four cracks undermine the trench; shoring wins the stage back', () => {
      let g = inScene('oldstones', stoneKey);
      for (let i = 0; i < 4; i++) g = verb(g, 'crack');
      expect(g.facing!.scene!.stage).toBe('undermined');
      const stuck = verb(g, 'crack');
      expect(stuck.facing!.scene!.gauges).toEqual(g.facing!.scene!.gauges);
      for (let i = 0; i < 4 && g.facing!.scene!.stage === 'undermined'; i++) g = verb(g, 'shore');
      expect(g.facing!.scene!.stage).toBe('open');
    });

    it('★ the careful hand shores when the ground says so, and clears', () => {
      // Bare-mashing gets undermined since the spam review — the hollow
      // works at the wall on its own now.
      let g = inScene('oldstones', stoneKey);
      for (let i = 0; i < 16 && g.facing; i++) {
        g = verb(g, g.facing.scene!.stage === 'undermined' ? 'shore' : 'bare');
      }
      expect(g.facing).toBeNull();
      expect(g.provisions).toBe(initial().provisions);
      expect(g.momentum).toBe(initial().momentum + 1);
    });
  });

  describe('★ the nightwatch: the win verb feeds the loss gauge', () => {
    it('a provision sent up the crag is the fastest word in the argument', () => {
      const g = verb(inScene('nightwatch', stoneKey), 'tea');
      expect(g.provisions).toBe(initial().provisions - 1);
      expect(g.facing!.scene!.gauges.quiet!).toBeCloseTo(1.6, 6);
    });

    it('★ the crag feeds the dread faster than open stone, turn for turn', () => {
      const crag = legOn('crag');
      expect(crag, 'no crag leg on this map').not.toBeNull();
      const up = verb(inScene('nightwatch', crag!), 'watch').facing!.scene!.gauges.dread!;
      const flat = verb(inScene('nightwatch', stoneKey), 'watch').facing!.scene!.gauges.dread!;
      expect(up).toBeGreaterThan(flat);
    });

    it('★★ dread branches to shifts — nobody climbs — and walking the rounds wins back the night', () => {
      let g = verb(set(inScene('nightwatch', stoneKey), { dread: 7.2 }), 'climb');
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

    it('★ NO idle progress toward the goal — nothing moves until you move', () => {
      // The owner, 2026-08-07: "i don't think we should have any idle
      // progress towards the goal." An hour of clock changes nothing.
      const g0 = inScene('longdark', wood);
      expect(tick(g0, 3600).facing!.scene!.gauges).toEqual(g0.facing!.scene!.gauges);
    });

    it('★★ a press buys ground, spends breath — and the dark answers the turn', () => {
      const g = verb(inScene('longdark', wood), 'press');
      expect(g.facing!.scene!.gauges.home!).toBeCloseTo(1.1, 6);
      expect(g.facing!.scene!.gauges.dark!).toBeCloseTo(1.0, 6);
      expect(g.facing!.scene!.gauges.wind!).toBeLessThan(8);
    });

    it('★ blown branches the stage: no pressing the winded, only breathing them back', () => {
      let g = verb(set(inScene('longdark', wood), { wind: 0.3 }), 'press');
      expect(g.facing!.scene!.stage).toBe('blown');
      const stuck = verb(g, 'press');
      expect(stuck.facing!.scene!.gauges).toEqual(g.facing!.scene!.gauges);
      for (let i = 0; i < 4 && g.facing!.scene!.stage === 'blown'; i++) g = verb(g, 'rest');
      expect(g.facing!.scene!.stage).toBe('strung');
    });

    it('★★ pressed home with real rests, ahead of the dark', () => {
      // Press-mashing blows the crew since the spam review; a breather at
      // the right moment is the whole skill of it.
      let g = inScene('longdark', wood);
      for (let i = 0; i < 14 && g.facing; i++) {
        const st = g.facing.scene!;
        g = verb(g, st.stage === 'blown' || (st.gauges.wind ?? 8) <= 2.5 ? 'rest' : 'press');
      }
      expect(g.facing).toBeNull();
      expect(g.momentum).toBe(initial().momentum + 1);
      expect(g.cleared).toBe(1);
    });

    it('★★ THE SPAM BOT: mashing press alone BLOWS the crew and wins nothing', () => {
      let g = inScene('longdark', wood);
      for (let i = 0; i < 60 && g.facing; i++) g = verb(g, 'press');
      expect(g.facing, 'press-mashing cleared the race').not.toBeNull();
      expect(g.facing!.scene!.stage).toBe('blown');
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

  it('★★ THE SPAM BOT LOSES EVERYWHERE: no free verb clears any scene alone, unpunished', () => {
    // The owner, twice in two days: *"i just tapped the button… and it
    // worked."* Never again: for EVERY scene, a bot that only ever taps one
    // FREE verb either never clears the way or pays setbacks for it. Priced
    // verbs are exempt — mana and provisions are their own gate.
    for (const sc of SCENES) {
      const botKey = legOn(sc.on[0]!) ?? stoneKey;
      for (const v of sc.verbs) {
        if ((v.mana ?? 0) > 0 || (v.provisions ?? 0) > 0) continue;
        let g = inScene(sc.id, botKey);
        for (let i = 0; i < 60 && g.facing; i++) g = verb(g, v.id);
        const clearedFree = g.facing === null && g.building !== null
          && g.provisions === initial().provisions;
        expect(clearedFree, `${sc.id}: spamming "${v.id}" cleared the way for free`).toBe(false);
      }
    }
  });

  it('★ every ground on the map now offers at least one scene', () => {
    for (const ground of ['moor', 'wood', 'crag', 'water', 'stone', 'bog'] as const) {
      expect(SCENES.some((s) => s.on.includes(ground)), `${ground} has no scene`).toBe(true);
    }
  });
});
