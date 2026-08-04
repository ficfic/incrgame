// SCAVENGING — Ironsworn's Resupply, worn local. The owner: *"so, like,
// scavenge for provisions."* Time at a stop, a stat chosen going in, dice at
// the end. The price is time not spent laying pipe, and the engine enforces
// that both ways round.
//
// ---- PROVEN RED, 2026-08-03 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, unbuildable, unforageable, FORAGE_SECS,
  type Game } from '../src/game/engine';
import { STOP, START } from '../src/game/stops';

const to = STOP.get(START)!.near[0]!;
const forage = (g: Game, stat: 'wits' | 'shadow' = 'wits'): Game =>
  apply(g, { type: 'forage', stat });
const served = (g: Game): Game => apply(forage(g), { type: 'tick', secs: FORAGE_SECS });
// Fixed dice: wits 2 makes a=6 score 8. Against 3,4 strong; 3,9 weak; 9,10 miss.
const gather = (g: Game, c1: number, c2: number): Game =>
  apply(g, { type: 'gather', roll: { a: 6, c1, c2 } });

describe('★ scavenging trades time for provisions', () => {
  it('starts with the clock full and the stat remembered', () => {
    const g = forage(initial(), 'shadow');
    expect(g.foraging).toEqual({ secs: FORAGE_SECS, left: FORAGE_SECS, stat: 'shadow' });
  });

  it('★ the clock serves down and STOPS at zero — the dice wait for the shell', () => {
    const half = apply(forage(initial()), { type: 'tick', secs: FORAGE_SECS / 2 });
    expect(half.foraging!.left).toBeCloseTo(FORAGE_SECS / 2, 6);
    const over = apply(forage(initial()), { type: 'tick', secs: FORAGE_SECS * 3 });
    expect(over.foraging!.left).toBe(0);
    expect(over.foraging!.stat).toBe('wits');
    // And the mana kept coming the whole time — scavenging is not a pause.
    expect(over.mana).toBeGreaterThan(0);
  });

  it('★★ gathering EARLY is refused — see-what-you-found ends the trade, it is not a way around it', () => {
    const eager = apply(forage(initial()), { type: 'gather', roll: { a: 6, c1: 3, c2: 4 } });
    expect(eager.provisions).toBe(6);
    expect(eager.foraging).not.toBeNull();
  });

  it('refuses a crooked roll outright', () => {
    const g = served(initial());
    expect(apply(g, { type: 'gather', roll: { a: 7, c1: 3, c2: 4 } }).foraging).not.toBeNull();
  });

  it('★ a strong hit fills the packs: +2, +3 on matched dice, capped at 10', () => {
    expect(gather(served(initial()), 3, 4).provisions).toBe(8);
    expect(gather(served(initial()), 3, 3).provisions).toBe(9);
    const rich = served({ ...initial(), provisions: 9 });
    expect(gather(rich, 3, 3).provisions).toBe(10);
  });

  it('a weak hit finds a little and costs the night: +1, momentum down', () => {
    const g = gather(served(initial()), 3, 9);
    expect(g.provisions).toBe(7);
    expect(g.momentum).toBe(initial().momentum - 1);
  });

  it('★ a miss finds nothing and rattles the crew: momentum -2, -3 on a twist', () => {
    const g = gather(served(initial()), 9, 10);
    expect(g.provisions).toBe(6);
    expect(g.momentum).toBe(initial().momentum - 2);
    expect(g.foraging).toBeNull();
    expect(gather(served(initial()), 9, 9).momentum).toBe(initial().momentum - 3);
  });
});

describe('★★ the trade is exclusive both ways round', () => {
  it('no scavenging while the crew lays pipe, and it says why', () => {
    const laying = apply({ ...initial(), mana: 999 }, { type: 'build', to, kit: 'cart' });
    expect(unforageable(laying)).toBe('the crew is laying pipe');
    expect(forage(laying).foraging).toBeNull();
  });

  it('no laying pipe while the crew scavenges, and it says why', () => {
    const out = forage({ ...initial(), mana: 999 });
    expect(unbuildable(out, to)).toBe('the crew is out scavenging');
    expect(apply(out, { type: 'build', to, kit: 'cart' }).building).toBeNull();
  });

  it('full packs refuse the trip — time for nothing is not a trade', () => {
    const full = { ...initial(), provisions: 10 };
    expect(unforageable(full)).toBe('your packs are full');
    expect(forage(full).foraging).toBeNull();
  });

  it('★ walking off abandons the scavenge — the time is simply lost', () => {
    const laid = { ...initial(), gauge: { [`${Math.min(START, to)}|${Math.max(START, to)}`]: 1 },
      seen: [START, to] };
    const out = forage(laid);
    const walked = apply(out, { type: 'go', to });
    expect(walked.at).toBe(to);
    expect(walked.foraging).toBeNull();
    expect(walked.provisions).toBe(6);
  });
});
