// SCAVENGING — Ironsworn's Resupply, worn local. The owner: *"so, like,
// scavenge for provisions."* Time at a stop, a stat chosen going in, dice at
// the end. The price is time not spent laying pipe, and the engine enforces
// that both ways round.
//
// ---- PROVEN RED, 2026-08-03 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { roadKey, apply, initial, unbuildable, unforageable, FORAGE_SECS, PROV_CAP,
  type Game } from '../src/game/engine';
import { STOP, START, NEEDS } from '../src/game/stops';

// ★ The first UNGATED road out of the start — three roads carry camp
// profiles now (NEEDS), and these tests are about scavenging and kits,
// not about affording a departure.
const to = STOP.get(START)!.near.find((n) => !NEEDS[roadKey(START, n)])!;
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

  // ★ TWO RISK SHAPES — the owner: *"what would by shadow mean… my stats are
  // identical for both. So what's the point?"* WITS is safe, SHADOW is greedy.
  const servedAs = (stat: 'wits' | 'shadow'): Game =>
    apply(forage(initial(), stat), { type: 'tick', secs: FORAGE_SECS });

  it('★ wits, the safe walk: +2 strong (+3 twist), weak costs nothing extra, a miss only dips', () => {
    expect(gather(served(initial()), 3, 4).provisions).toBe(8);
    expect(gather(served(initial()), 3, 3).provisions).toBe(9);
    const weak = gather(served(initial()), 3, 9);
    expect(weak.provisions).toBe(7);
    expect(weak.momentum).toBe(initial().momentum);
    const miss = gather(served(initial()), 9, 10);
    expect(miss.provisions).toBe(6);
    expect(miss.momentum).toBe(initial().momentum - 1);
    expect(gather(served(initial()), 9, 9).momentum).toBe(initial().momentum - 1);
  });

  it('★ shadow, the greedy one: +3 strong (+4 twist), weak rattles, a MISS gets you caught', () => {
    expect(gather(servedAs('shadow'), 3, 4).provisions).toBe(9);
    expect(gather(servedAs('shadow'), 3, 3).provisions).toBe(10);
    const weak = gather(servedAs('shadow'), 3, 9);
    expect(weak.provisions).toBe(7);
    expect(weak.momentum).toBe(initial().momentum - 1);
    const caught = gather(servedAs('shadow'), 9, 10);
    expect(caught.provisions).toBe(5);
    expect(caught.momentum).toBe(initial().momentum - 2);
    expect(gather(servedAs('shadow'), 9, 9).momentum).toBe(initial().momentum - 3);
  });

  it('the cap still holds at the packs\' ceiling, greedy or not', () => {
    // PROV_CAP now, not Ironsworn's 10 — the camp economy banks toward
    // departures (2026-08-07).
    expect(gather(apply(forage({ ...initial(), provisions: PROV_CAP - 1 }, 'shadow'),
      { type: 'tick', secs: FORAGE_SECS }), 3, 3).provisions).toBe(PROV_CAP);
  });
});

describe('★★ the trade is exclusive both ways round', () => {
  it('no scavenging while the crew is out on a flow, and it says why', () => {
    const laying = apply({ ...initial(), mana: 999 }, { type: 'build', to, kit: 'cart' });
    expect(unforageable(laying)).toBe('the crew is out opening a flow');
    expect(forage(laying).foraging).toBeNull();
  });

  it('no opening flows while the crew scavenges, and it says why', () => {
    const out = forage({ ...initial(), mana: 999 });
    expect(unbuildable(out, to)).toBe('the crew is out scavenging');
    expect(apply(out, { type: 'build', to, kit: 'cart' }).building).toBeNull();
  });

  it('full packs refuse the trip — time for nothing is not a trade', () => {
    const full = { ...initial(), provisions: PROV_CAP };
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

describe('★★ the suited kit is stocked from the packs', () => {
  // ⚠️ The fixture leg moved to the ungated road (crag), where the MULE is
  // the suited kit — the cart tests below moved with it.
  it('★ +1 on every roll costs one provision to outfit', () => {
    const g = apply({ ...initial(), mana: 999 }, { type: 'build', to, kit: 'mule' });
    expect(g.building).not.toBeNull();
    expect(g.provisions).toBe(5);
  });

  it('the wrong tool travels light — no cost', () => {
    const g = apply({ ...initial(), mana: 999 }, { type: 'build', to, kit: 'packs' });
    expect(g.building).not.toBeNull();
    expect(g.provisions).toBe(6);
  });

  it('★★ empty packs refuse the suited kit outright', () => {
    const broke = { ...initial(), mana: 999, provisions: 0 };
    const g = apply(broke, { type: 'build', to, kit: 'mule' });
    expect(g.building).toBeNull();
    expect(g.mana).toBe(999);
    // The light kit still goes.
    expect(apply(broke, { type: 'build', to, kit: 'packs' }).building).not.toBeNull();
  });

  it('a widen is not an expedition — no outfit cost', () => {
    const laid = { ...initial(), mana: 999,
      gauge: { [`${Math.min(START, to)}|${Math.max(START, to)}`]: 1 }, seen: [START, to] };
    const g = apply(laid, { type: 'build', to, kit: 'cart' });
    expect(g.building).not.toBeNull();
    expect(g.provisions).toBe(6);
  });
});
