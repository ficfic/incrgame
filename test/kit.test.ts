// ★★★ THE KIT — what the hoard is for, 2026-08-19.
//
// The owner: *"we need shit to do"*. The hoard was a number that only went up.
//
// ⚠️ AND THE RULE THIS SHOP IS BUILT ON: every buy is a GRAPH VERB, not a
// bigger number. So the tests below are mostly about the graph changing shape
// — an edge that is genuinely not there, a fog that reaches one door further —
// rather than about arithmetic going up, which is what a shop of +1s would be.
import { describe, it, expect } from 'vitest';
import { apply, initial, doorsOf, shut, waysOut, within, stepToward, swing,
  unwalkable, unwedgeable, affordable, facing, BITE, KEEN, BAR_TURNS,
  WEDGES_PER, CRAWL_HP, BRACE_HP, COST, START_HP, type Delve, type Good }
  from '../src/delve/engine';
import { SPOIL } from '../src/delve/dungeon';

const buy = (g: Delve, what: Good): Delve => apply(g, { type: 'buy', what });
const wedge = (g: Delve, to: number): Delve => apply(g, { type: 'wedge', to });
const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
/** Rich, at the Mouth, ready to spend. */
const flush = (n = 500): Delve => ({ ...initial(), hoard: n });

describe('★★★ THE HOARD BUYS SOMETHING', () => {
  it('★ only at the Mouth, only what you can afford, and only once', () => {
    const g = flush(COST.lamp);
    expect(affordable(g, 'lamp')).toBe(true);
    expect(affordable(g, 'brace')).toBe(false);          // costs more
    const lit = buy(g, 'lamp');
    expect(lit.hoard).toBe(0);
    expect(lit.kit.lamp).toBe(2);
    // ⚠️ WITH MONEY STILL IN THE HOARD. Checking "not twice" on a delver who
    // had just spent their last coin proved nothing — AFFORDABILITY was doing
    // the refusing, and a sabotage that deleted the once-only guard entirely
    // stayed green. The guard only shows up when you can still pay.
    const rich = buy(flush(1000), 'lamp');
    expect(affordable(rich, 'lamp')).toBe(false);
    expect(buy(rich, 'lamp')).toBe(rich);
    expect(buy(rich, 'lamp').hoard).toBe(rich.hoard);
    const keen = buy(flush(1000), 'edge');
    expect(buy(keen, 'edge')).toBe(keen);
    expect(affordable(go(flush(), 1), 'lamp')).toBe(false);   // not down there
  });

  it('★★★ buying is NOT a turn — the dungeon gets no swing at your pack', () => {
    const g = flush();
    const bought = buy(g, 'edge');
    expect(bought.turn).toBe(g.turn);
    expect(bought.hp).toBe(g.hp);
  });

  it('★★★ and the kit survives dying — that is the whole ratchet', () => {
    // A delve you lose still moved you forward, or the loop has no direction.
    const kitted = buy(buy(flush(), 'edge'), 'lamp');
    const down = wait({ ...go(go(kitted, 1), 3), hp: 1 });
    expect(down.fallen).toBe(true);
    const again = apply(down, { type: 'leave' });
    expect(again.kit.edge).toBe(1);
    expect(again.kit.lamp).toBe(2);
  });
});

describe('★★★ A RUN IS A RUN — the dark closes behind you', () => {
  /** Clear the Rat Warren and climb back out with the spoil. */
  const raid = (g: Delve): Delve => {
    let out: Delve = { ...go(go(g, 1), 3), hp: 400 };
    for (let i = 0; i < 40 && facing(out).length > 0; i++) out = apply(out, { type: 'strike' });
    return apply(go(go(out, 1), 0), { type: 'leave' });
  };

  it('★★★ the SAME room pays again on the next delve', () => {
    // ⚠️ THE ARITHMETIC THAT FORCED THIS. A cleared room paid once and stayed
    // cleared, so the dungeon's total income was 70 gold EVER — against a shop
    // costing 172. The ratchet could not physically be turned to the end. It
    // only showed up when the prices were written down beside the spoils.
    const first = raid(initial());
    expect(first.hoard).toBe(SPOIL.lair);
    expect(first.cleared).toEqual([0]);          // the dark closed behind you
    expect(first.foes).toEqual([]);
    expect(first.at).toBe(0);
    expect(first.hp).toBe(START_HP);
    const second = raid(first);
    expect(second.hoard).toBe(SPOIL.lair * 2);   // and it pays again
  });

  it('★★★ what you OWN and KNOW crosses the threshold; the purse does not', () => {
    const rich = buy(buy({ ...raid(initial()), hoard: 500 }, 'lamp'), 'wedges');
    const mapped = apply(rich, { type: 'send' });
    const out = apply(go(go({ ...go(mapped, 1), purse: 99 }, 1), 0), { type: 'leave' });
    expect(out.hoard).toBe(rich.hoard + 99);
    expect(out.purse).toBe(0);
    expect(out.kit.lamp).toBe(2);
    expect(out.kit.wedges).toBe(WEDGES_PER);
    expect(out.crawl).not.toBeNull();            // the report survives
    expect(out.seen).toEqual(expect.arrayContaining([0, 1, 2, 3]));
  });

  it('★★★ and dying costs the run, never a delve you already won', () => {
    const won = raid(initial());
    const down = wait({ ...go(go(won, 1), 3), hp: 1, purse: 44 });
    expect(down.fallen).toBe(true);
    const next = apply(down, { type: 'leave' });
    expect(next.hoard).toBe(won.hoard);          // banked stays banked
    expect(next.purse).toBe(0);                  // carried does not
    expect(next.fallen).toBe(false);
    expect(next.hp).toBe(START_HP);
  });

  it('★ the wedges you drove are pushed out with you', () => {
    const armed = buy({ ...raid(initial()), hoard: 500 }, 'wedges');
    const cut = wedge(go(armed, 1), 3);
    expect(cut.bars.length).toBe(1);
    expect(apply(go(cut, 0), { type: 'leave' }).bars).toEqual([]);
  });
});

describe('★★★ A WEDGE CUTS THE EDGE', () => {
  const armed = (): Delve => go(buy(flush(), 'wedges'), 1);

  it('★ three to a purchase, and one is spent per door', () => {
    expect(buy(flush(), 'wedges').kit.wedges).toBe(WEDGES_PER);
    const g = armed();
    expect(wedge(g, 3).kit.wedges).toBe(WEDGES_PER - 1);
    expect(unwedgeable(g, 9)).toBe('No door leads there from here.');
    expect(unwedgeable(initial(), 1)).toBe('No wedges.');
  });

  it('★★★ the door is GONE from the graph, not merely flagged', () => {
    const g = wedge(armed(), 3);
    expect(shut(g, 1, 3)).toBe(true);
    expect(shut(g, 3, 1)).toBe(true);                    // both ways, always
    expect(waysOut(g, 1)).not.toContain(3);
    expect(doorsOf(1)).toContain(3);                     // the room still has it
    // ⚠️ AND IT SHUTS FOR YOU TOO. A wedge you can step through yourself is a
    // free win rather than a decision.
    expect(unwalkable(g, 3)).toBe('You wedged that door shut.');
  });

  it('★★★ SO THE CHASE HAS TO GO ROUND — this is the whole purchase', () => {
    // The Warren (3) reaches the Broken Hall (1) through one door. Wedge it and
    // the only way is 3-5-6-4-2-1: five doors instead of one.
    const g = wedge(armed(), 3);
    expect(stepToward(3, 1)).toBe(1);                                  // normally
    expect(stepToward(3, 1, (a, b) => shut(g, a, b))).toBe(5);         // wedged
  });

  it('★★★ and a pack on the wrong side of it does not reach you', () => {
    let g: Delve = { ...go(go(buy(flush(), 'wedges'), 1), 3), hp: 300 };
    expect(facing(g).length).toBeGreaterThan(0);         // roused, in the room
    g = go(g, 1);                                        // step out to the hall
    g = wedge(g, 3);                                     // and wedge it behind
    const held = wait(wait(g));
    // ⚠️ THEY ARE STILL COMING — they just cannot arrive. If they teleported
    // through the wedge, or if wedging made them forget you, this would pass
    // for the wrong reason; so: none of them is in the hall with you.
    expect(held.foes.some((f) => f.at === 1)).toBe(false);
    expect(held.foes.every((f) => f.hp > 0)).toBe(true);
  });

  it('★★★ but it gives out, and then they come through', () => {
    let g: Delve = { ...go(go(buy(flush(), 'wedges'), 1), 3), hp: 300 };
    g = wedge(go(g, 1), 3);
    let out = g;
    for (let i = 0; i < BAR_TURNS + 4; i++) out = wait(out);
    expect(shut(out, 1, 3)).toBe(false);
    expect(out.bars.length).toBe(0);                     // and it is cleaned up
    expect(out.foes.some((f) => f.at === 1)).toBe(true);
  });
});

describe('★★★ A WIDER LAMP IS A CHANGE TO THE FOG', () => {
  it('★★★ two doors of reveal instead of one', () => {
    expect(within(1, 1).sort()).toEqual([0, 1, 2, 3]);
    expect(within(1, 2).sort()).toEqual([0, 1, 2, 3, 4, 5]);
    const dim = go(initial(), 1);
    expect(dim.seen).not.toContain(4);
    const wide = go(buy(flush(), 'lamp'), 1);
    expect(wide.seen).toContain(4);                      // past the fork
    expect(wide.seen).toContain(5);
    expect(wide.seen).not.toContain(6);                  // and no further
  });
});

describe('★★★ THE OTHER TWO', () => {
  it('★★★ a keen edge takes more off, and the shop says the real number', () => {
    expect(swing(initial())).toBe(BITE);
    const keen = buy(flush(), 'edge');
    expect(swing(keen)).toBe(BITE + KEEN);
    const g = go(go(keen, 1), 3);
    const weakest = Math.min(...g.foes.map((f) => f.hp));
    const hit = apply(g, { type: 'strike' });
    expect(Math.min(...hit.foes.map((f) => f.hp)))
      .toBe(Math.max(0, weakest - (BITE + KEEN)));
  });

  it('★★★ a braced crawler reaches further into the graph before it dies', () => {
    const run = (g: Delve, n: number): Delve => {
      let out = { ...g, hp: 400 };
      for (let i = 0; i < n; i++) out = { ...wait(out), hp: 400 };
      return out;
    };
    expect(apply(buy(flush(), 'brace'), { type: 'send' }).crawl!.hp)
      .toBe(CRAWL_HP + BRACE_HP);
    // ⚠️ THE POINT IS REACH, NOT HP. More life that maps no more of the
    // dungeon is a number going up, which is the one thing this shop is not —
    // so the assertion is about how much of the GRAPH it got to, and the hp
    // line above is only there to show where the reach comes from.
    const bare = run(apply(initial(), { type: 'send' }), 14);
    const braced = run(apply(buy(flush(), 'brace'), { type: 'send' }), 14);
    expect(braced.crawl!.walked.length).toBeGreaterThan(bare.crawl!.walked.length);
  });
});
