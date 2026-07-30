import { describe, it, expect } from 'vitest';
import { apply, initial, levelFor, xpForLevel, blocked, level } from '../src/slice/engine';
import { check, odds, modifier, roll2d10, TARGET } from '../src/slice/dice';
import { PLACES, PLACE, EDGES, ITEMS } from '../src/slice/content';

describe('2d10', () => {
  it('spans 2..20 and nothing else', () => {
    let seed = 1;
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i++) {
      const r = roll2d10(seed);
      seed = r.seed;
      expect(r.total).toBeGreaterThanOrEqual(2);
      expect(r.total).toBeLessThanOrEqual(20);
      expect(r.dice[0] + r.dice[1]).toBe(r.total);
      seen.add(r.total);
    }
    // All 19 sums must be reachable, or the generator is biased somewhere the
    // probability table does not know about.
    expect(seen.size).toBe(19);
  });

  it('is triangular: 11 is the mode, and 2 and 20 are the 1% tails', () => {
    let seed = 12345;
    const count = new Map<number, number>();
    const N = 200000;
    for (let i = 0; i < N; i++) {
      const r = roll2d10(seed);
      seed = r.seed;
      count.set(r.total, (count.get(r.total) ?? 0) + 1);
    }
    const share = (n: number): number => (count.get(n) ?? 0) / N;
    expect(share(11)).toBeGreaterThan(0.085);
    expect(share(11)).toBeLessThan(0.115);
    for (const tail of [2, 20]) {
      expect(share(tail)).toBeGreaterThan(0.005);
      expect(share(tail)).toBeLessThan(0.016);
    }
  });

  it('is deterministic — the same seed is the same roll, forever', () => {
    expect(roll2d10(99)).toEqual(roll2d10(99));
    expect(check(7, 5, 5)).toEqual(check(7, 5, 5));
  });

  it('never lets a level swamp the dice', () => {
    // ★ THE POINT OF THE WHOLE SYSTEM. If 30 levels could push a check to 100%
    // or 0%, the dice would be decorative and the owner asked for dice.
    for (let lvl = 0; lvl <= 30; lvl++) {
      for (let demand = 0; demand <= 30; demand++) {
        const o = odds(lvl, demand);
        expect(o).toBeGreaterThan(0);
        expect(o).toBeLessThan(1);
      }
    }
    expect(modifier(30, 30)).toBe(0);
    expect(modifier(30, 0)).toBe(6);   // clamped, not +10
    expect(modifier(0, 30)).toBe(-6);  // clamped, not -10
  });

  it('matches the published odds table exactly', () => {
    // These four numbers are quoted in docs/DICE.md and in the commit message.
    expect(odds(0, 30)).toBeCloseTo(0.10, 5);
    expect(odds(15, 15)).toBeCloseTo(0.55, 5);
    expect(odds(30, 0)).toBeCloseTo(0.94, 5);
    expect(TARGET).toBe(11);
  });

  it('honours the 1% crits over the modifier', () => {
    // A triumph passes a check it could not otherwise reach, and a disaster
    // fails one it could not otherwise miss.
    let seed = 0;
    let sawTriumph = false, sawDisaster = false;
    for (let i = 0; i < 50000 && !(sawTriumph && sawDisaster); i++) {
      const hopeless = check(seed, 0, 30);
      if (hopeless.crit === 'triumph') { expect(hopeless.passed).toBe(true); sawTriumph = true; }
      const certain = check(seed, 30, 0);
      if (certain.crit === 'disaster') { expect(certain.passed).toBe(false); sawDisaster = true; }
      seed = hopeless.seed;
    }
    expect(sawTriumph).toBe(true);
    expect(sawDisaster).toBe(true);
  });
});

describe('levels', () => {
  it('follows step(L) = 40 x 1.2^(L-1), summed', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(40);
    expect(xpForLevel(3)).toBe(88);
    expect(levelFor(0)).toBe(1);
    expect(levelFor(39)).toBe(1);
    expect(levelFor(40)).toBe(2);
    expect(levelFor(87)).toBe(2);
    expect(levelFor(88)).toBe(3);
  });

  it('caps at 30 and never goes backwards', () => {
    expect(levelFor(1e9)).toBe(30);
    let last = 0;
    for (let xp = 0; xp < 60000; xp += 137) {
      const l = levelFor(xp);
      expect(l).toBeGreaterThanOrEqual(last);
      last = l;
    }
  });
});

describe('the authored graph', () => {
  it('has no dead end — every place has a way out', () => {
    for (const p of PLACES) expect(p.choices.length).toBeGreaterThan(0);
  });

  it('has no dangling reference', () => {
    for (const p of PLACES) {
      for (const c of p.choices) expect(PLACE.has(c.to)).toBe(true);
    }
  });

  it('is fully reachable from the start, ignoring gates', () => {
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) {
      for (const c of PLACE.get(queue.pop()!)!.choices) {
        if (!seen.has(c.to)) { seen.add(c.to); queue.push(c.to); }
      }
    }
    expect(seen.size).toBe(PLACES.length);
  });

  it('draws each edge once', () => {
    const keys = EDGES.map((e) => (e.a < e.b ? `${e.a}:${e.b}` : `${e.b}:${e.a}`));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('★ every gated item can actually be obtained', () => {
    // THE DEFECT THIS EXISTS FOR. `test.loot` used to be a boolean and the
    // engine held a hardcoded table of two VALLEY items, so a check in any
    // other region minted a strip of lead. Every key the other regions gate
    // their doors on was unobtainable and all of that content was dead. Nothing
    // caught it: the types were fine, the graph was connected, and the places
    // were reachable — you just could never open the door.
    const droppable = new Set<string>();
    for (const p of PLACES) {
      for (const c of p.choices) {
        if (!c.test?.loot) continue;
        droppable.add(c.test.loot.good);
        if (c.test.loot.poor) droppable.add(c.test.loot.poor);
      }
    }
    for (const p of PLACES) {
      for (const c of p.choices) {
        if (!c.needs || !('item' in c.needs)) continue;
        expect(droppable, `${p.name} -> ${c.label} wants ${c.needs.item}`)
          .toContain(c.needs.item);
      }
    }
  });

  it('every item named by a drop or a gate is declared', () => {
    for (const p of PLACES) {
      for (const c of p.choices) {
        if (c.needs && 'item' in c.needs) expect(ITEMS, p.name).toHaveProperty(c.needs.item);
        if (c.test?.loot) {
          expect(ITEMS, p.name).toHaveProperty(c.test.loot.good);
          if (c.test.loot.poor) expect(ITEMS, p.name).toHaveProperty(c.test.loot.poor);
        }
      }
    }
  });

  it('every authored body is a card, not an essay', () => {
    // docs/GAME_DESIGN.md: 40-70 words, never scrolls. A body that outgrows the
    // card is the "wall of text" the owner rejected, arriving by drift.
    for (const p of PLACES) {
      const words = p.body.trim().split(/\s+/).length;
      expect(words, `${p.name} is ${words} words`).toBeGreaterThanOrEqual(35);
      expect(words, `${p.name} is ${words} words`).toBeLessThanOrEqual(75);
    }
  });
});

describe('the reducer is pure and total', () => {
  it('ignores a move that is not on offer', () => {
    const s = initial();
    expect(apply(s, { type: 'travel', to: 5 })).toBe(s);
    expect(apply(s, { type: 'work', id: 'nope' })).toBe(s);
    expect(apply(s, { type: 'open' })).toBe(s);
  });

  it('does not mutate what it is given', () => {
    const s = initial();
    const before = JSON.stringify(s);
    apply(s, { type: 'travel', to: 1 });
    apply(s, { type: 'work', id: 'listen' });
    expect(JSON.stringify(s)).toBe(before);
  });

  it('pays XP for a timed action, and banks whole repeats while away', () => {
    let s = apply(initial(), { type: 'work', id: 'listen' });
    expect(s.job).not.toBeNull();
    s = apply(s, { type: 'tick', secs: 19 });
    expect(s.xp.lore).toBe(0);           // not finished
    s = apply(s, { type: 'tick', secs: 2 });
    expect(s.xp.lore).toBe(30);          // one completion
    // An hour away completes 60s/20s = 180 repeats, and rolls no dice.
    const seedBefore = s.seed;
    s = apply(s, { type: 'tick', secs: 3600 });
    expect(s.xp.lore).toBe(30 + 30 * 180);
    expect(s.seed).toBe(seedBefore);
  });

  it('a shut door says what it wants and refuses the tap', () => {
    // The low door at The Far Bank needs the lead strip.
    let s = initial();
    s = apply(s, { type: 'travel', to: 1 });
    s = apply(s, { type: 'travel', to: 3 });
    expect(s.at).toBe(3);
    const door = PLACE.get(3)!.choices.find((c) => c.to === 5)!;
    expect(blocked(s, door)).toMatch(/strip of lead/);
    expect(apply(s, { type: 'travel', to: 5 }).at).toBe(3);
  });

  it('opens the door once the key is carried', () => {
    let s = initial();
    s.pack = ['lead-strip'];
    s = apply(s, { type: 'travel', to: 1 });
    s = apply(s, { type: 'travel', to: 3 });
    const door = PLACE.get(3)!.choices.find((c) => c.to === 5)!;
    expect(blocked(s, door)).toBeNull();
    expect(apply(s, { type: 'travel', to: 5 }).at).toBe(5);
  });

  it('a skill gate reports the level you are, not just the level you need', () => {
    let s = initial();
    s = apply(s, { type: 'travel', to: 2 });
    s = apply(s, { type: 'travel', to: 4 });
    const gate = PLACE.get(4)!.choices.find((c) => c.to === 3)!;
    expect(blocked(s, gate)).toBe('needs Wayfaring 3 — you are 1');
    s.xp = { ...s.xp, wayfaring: xpForLevel(3) };
    expect(level(s, 'wayfaring')).toBe(3);
    expect(blocked(s, gate)).toBeNull();
  });

  it('a failed check still pays XP and still moves you', () => {
    // Failure is a plateau, never a wall: the test changes what you find.
    let s = initial();
    s = apply(s, { type: 'travel', to: 2 });
    const before = s.xp.lore;
    s = apply(s, { type: 'travel', to: 4 });
    expect(s.at).toBe(4);
    expect(s.xp.lore).toBeGreaterThan(before);
    expect(s.lastRoll).not.toBeNull();
  });

  it('loot arrives unopened, and opening it is what rolls the dice', () => {
    // Walk the Lore check until it passes, so we hold a satchel.
    let s = initial();
    let guard = 0;
    while (s.satchels.length === 0 && guard++ < 200) {
      s = apply(s, { type: 'travel', to: 2 });
      s = apply(s, { type: 'travel', to: 4 });
    }
    expect(s.satchels.length).toBeGreaterThan(0);
    const seedBefore = s.seed;
    const opened = apply(s, { type: 'open' });
    expect(opened.satchels.length).toBe(s.satchels.length - 1);
    expect(opened.seed).not.toBe(seedBefore);   // the roll happened on the tap
    expect(opened.pack.length).toBe(1);
  });

  it('the whole slice is completable', () => {
    // The end-to-end promise: reach Behind the Door from a fresh save using
    // only actions a player can take.
    let s = initial();
    let guard = 0;
    while (!s.pack.includes('lead-strip') && guard++ < 300) {
      s = apply(s, { type: 'travel', to: 2 });
      s = apply(s, { type: 'travel', to: 4 });
      while (s.satchels.length > 0) s = apply(s, { type: 'open' });
      if (s.at === 4) s = apply(s, { type: 'travel', to: 2 });
      s = apply(s, { type: 'travel', to: 0 });
    }
    expect(s.pack).toContain('lead-strip');
    s = apply(s, { type: 'travel', to: 1 });
    s = apply(s, { type: 'travel', to: 3 });
    s = apply(s, { type: 'travel', to: 5 });
    expect(s.at).toBe(5);
  });
});
