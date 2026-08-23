// ★★★ THE LIGHT — 2026-08-23, and it is the thing the game was missing.
//
// The owner: *"the game is pretty stupid at the moment... it's full of meta and
// lacks any gameplay."* Both halves of that were one problem.
//
// ⚠️ EVERY DECISION HAD AN OBVIOUSLY CORRECT ANSWER. Clear the room? Yes,
// always — spoil is free and rooms refill on the next run. Take the detour to
// the well? Yes, always. Which verb? Swing. Nothing competed with anything, so
// there was nothing to decide, so the game became a thing you READ — reports,
// records, a map to verify — instead of a place you were.
//
// A crawler needs a clock that is not a clock. The lamp burns a turn a turn,
// and that one number puts a price on everything the game already had.
import { describe, it, expect } from 'vitest';
import { apply, initial, facing, maxOil, dark, homeward, unlightable,
  LIGHT, FLASK, WICK, DARK_BITE, DREGS, price, worth, guardsOf, stepToward, shut,
  type Delve, type Good } from '../src/delve/engine';
import { SPOIL } from '../src/delve/dungeon';

const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
const burn = (g: Delve, n: number): Delve => {
  let out = g;
  for (let i = 0; i < n; i++) out = wait({ ...out, hp: 400 });
  return out;
};

describe('★★★ EVERY TURN COSTS LIGHT', () => {
  it('★★★ one turn, one turn of lamp — walking, swinging, waiting, all of it', () => {
    const g = initial();
    expect(g.oil).toBe(LIGHT);
    expect(wait(g).oil).toBe(LIGHT - 1);
    expect(go(g, 1).oil).toBe(LIGHT - 1);
    expect(burn(g, 5).oil).toBe(LIGHT - 5);
    // ⚠️ AND A REFUSED ACTION BURNS NOTHING. Being told no is not a turn.
    expect(apply(g, { type: 'walk', to: 9 }).oil).toBe(LIGHT);
  });

  it('★★★ SO YOU CANNOT TAKE THE WHOLE FLOOR ON ONE LAMP — that is the point', () => {
    // ⚠️ THE TUNING THAT MAKES IT A DECISION. If a full lamp cleared floor one
    // there would be nothing to choose: you would simply take everything, which
    // is exactly what the game was before this.
    // ⚠️ MEASURED BY PLAYING IT, not by counting doors. The first version added
    // up the walking only — 18 doors against a lamp of 26 — and concluded the
    // lamp was generous. It forgot that FIGHTS ARE TURNS TOO: four or five
    // swings a lair is where the light actually goes.
    let g: Delve = { ...initial(), hp: 4000 };
    const paying = g.rooms.filter((r) => guardsOf(g, r).length > 0 || worth(g, r) > 0);
    for (const r of paying) {
      let hop = stepToward(g, g.at, r.id);
      while (hop !== null && !dark(g)) {
        g = go(g, hop);
        for (let i = 0; i < 40 && facing(g).length > 0; i++) g = apply(g, { type: 'strike' });
        hop = stepToward(g, g.at, r.id);
      }
      if (dark(g)) break;
    }
    expect(dark(g), `cleared the floor with ${g.oil} light to spare`).toBe(true);
    expect(g.cleared.length).toBeLessThan(paying.length + 1);
  });

  it('★★★ and the game says how far home is, because a budget you cannot see is an ambush', () => {
    const g = initial();
    expect(homeward(g)).toBe(0);
    expect(homeward(go(g, 1))).toBe(1);
    expect(homeward(go(go(g, 1), 3))).toBe(2);
    // ★ And it respects a door you wedged shut — the long way round IS the way.
    const armed = go({ ...initial(), hoard: 500 }, 1);
    const cut = apply(armed, { type: 'wedge', to: 0 });
    // ⚠️ AND WHEN THERE IS NO LONG WAY ROUND IT SAYS SO, rather than handing
    // the screen a sentinel to print. `homeward` returned 99 and the header
    // said "99 rooms to the Mouth" over a delver stood behind their own wedge.
    expect(homeward(cut)).toBeNull();
    // ★ And where there IS a long way round, it counts it. Cutting the door
    // back out of the Weeping Stair leaves the whole loop, six rooms of it.
    const looped = apply(go(go({ ...initial(), hoard: 500 }, 1), 2), { type: 'wedge', to: 1 });
    expect(homeward(looped)).toBe(6);
  });
});

describe('★★★ AND THEN YOU ARE IN THE DARK', () => {
  const spent = (): Delve => ({ ...initial(), oil: 1, hp: 400 });

  it('★★★ the lamp goes out, out loud', () => {
    const out = wait(spent());
    expect(dark(out)).toBe(true);
    expect(out.log.join(' ')).toMatch(/lamp gutters and goes out/);
  });

  it('★★★ and the dark is not death — it is somewhere you can be', () => {
    // ⚠️ A DUNGEON THAT KILLS YOU WHEN THE LAMP GOES OUT is a timer with extra
    // steps. One you can still crawl out of is a story you tell afterwards.
    const out = burn(spent(), 6);
    expect(out.fallen).toBe(false);
    expect(out.oil).toBe(0);
    expect(apply(out, { type: 'leave' }).fallen).toBe(false);
  });

  it('★★★ but you cannot see past the room you stand in', () => {
    const lit = go(initial(), 1);
    expect(lit.seen).toContain(3);                       // the fork, from the hall
    const blind = go({ ...initial(), oil: 1 }, 1);
    expect(dark(blind)).toBe(true);
    expect(blind.seen).toContain(1);                     // where you are standing
    expect(blind.seen).not.toContain(3);                 // and nothing beyond it
  });

  it('★★★ and everything hits harder for it', () => {
    const lair = go(go({ ...initial(), hp: 400 }, 1), 3);
    const bitLit = lair.hp;
    const blind = go(go({ ...initial(), hp: 400, oil: 2 }, 1), 3);
    expect(dark(blind)).toBe(true);
    const took = 400 - blind.hp;
    expect(took).toBeGreaterThan(400 - bitLit);
    expect(took - (400 - bitLit)).toBe(DARK_BITE * facing(blind).length);
  });
});

describe('★★★ AND OIL IS A THING YOU BUY AND POUR', () => {
  it('★★★ a flask is turns, poured where you stand', () => {
    const low: Delve = { ...initial(), oil: 4 };
    expect(unlightable(low)).toBeNull();
    const poured = apply(low, { type: 'pour' });
    // ⚠️ POURED BEFORE THE TURN BURNS, so a flask at 1 light does not leave you
    // in the dark anyway — which would make the button a trap.
    expect(poured.oil).toBe(4 + FLASK - 1);
    expect(poured.kit.flask).toBe(low.kit.flask - 1);
    expect(poured.turn).toBe(low.turn + 1);
  });

  it('★ and it is refused when there is nothing to pour or nowhere to put it', () => {
    expect(unlightable(initial())).toBe('The lamp is full.');
    const empty: Delve = { ...initial(), oil: 3, kit: { ...initial().kit, flask: 0 } };
    expect(unlightable(empty)).toBe('No oil.');
    expect(apply(empty, { type: 'pour' })).toBe(empty);
  });

  it('★★★ a longer wick raises the ceiling a flask can fill to', () => {
    const bare = initial();
    const long = apply({ ...bare, hoard: 9000 }, { type: 'buy', what: 'wick' });
    expect(maxOil(long)).toBe(maxOil(bare) + WICK);
    // ★ A longer wick is a bigger TANK, not free oil: what it buys is the
    // right to pour more in before the lamp spills.
    const low = { ...long, oil: 1, kit: { ...long.kit, flask: 9 } };
    let full = low;
    for (let i = 0; i < 9; i++) full = apply({ ...full, hp: 400 }, { type: 'pour' });
    // ⚠️ ONE SHORT OF THE CEILING, ALWAYS: pouring is a turn, and the turn
    // burns. You cannot hold a brimming lamp, only a lamp you just filled.
    expect(full.oil).toBe(maxOil(long) - 1);
  });

  it('★★★ and climbing out does NOT fill the lamp — light is bought, never found', () => {
    // ⚠️ REVERSED, 2026-08-23. This test used to assert the opposite, and the
    // opposite made the lamp a decoration: climb out, walk back in, full lamp,
    // free. The only cost of running dry was a round trip, so every choice the
    // lamp was supposed to create still had the old answer — do it anyway.
    const g = burn({ ...initial(), hp: 400 }, 9);
    expect(g.oil).toBeLessThan(LIGHT);
    expect(apply(g, { type: 'leave' }).oil).toBe(g.oil);
    // ★ WHAT IS FREE IS THE DREGS, and only the dregs. A delver with nothing
    // can always scrape a short run together, and never a long one.
    const dry = { ...burn({ ...initial(), hp: 400, oil: 3 }, 3), hoard: 0 };
    expect(dark(dry)).toBe(true);
    expect(apply(dry, { type: 'leave' }).oil).toBe(DREGS);
  });

  it('★★★ ONE ROOM PAYS FOR THE LIGHT TO REACH THE NEXT — the loop, in one line', () => {
    // ⚠️ THE DEAD END THIS EXISTS TO CATCH. Rooms pay once now, so a delver on
    // the dregs must be able to turn the room they just cleared into the oil
    // for the next one. When a flask cost 10 and a shallow lair paid 6, they
    // could not: run one paid 6, run two reached nothing, and the game was
    // over at the Mouth with the shop showing eight things and no way to buy
    // any of them.
    expect(price(initial(), 'flask')).toBeLessThanOrEqual(SPOIL.lair);
    expect(FLASK).toBeGreaterThan(DREGS);
  });
});

describe('★★★ AND NOW EVERYTHING ELSE IN THE GAME MEANS SOMETHING', () => {
  it('★★★ a wedge costs the pack real light-worth of walking', () => {
    // Before the lamp, "they have to go round" was a sentence. It is a bill now.
    const g = go({ ...initial(), hoard: 500, hp: 400 }, 1);
    const direct = stepToward(g, 3, 1);
    const cut = apply(g, { type: 'wedge', to: 3 });
    expect(direct).toBe(1);
    // ⚠️ THE REAL PREDICATE, not a hand-written one that only blocks one
    // direction — `stepToward(cut, 3, 1)` asks about (3,1), and a predicate
    // written as `a === 1 && b === 3` answers false to the question it is
    // actually asked.
    expect(stepToward(cut, 3, 1, (a, b) => shut(cut, a, b))).not.toBe(1);
  });

  it('★★★ and the crawler is worth sending, because a dead end costs light', () => {
    // ⚠️ THE LYING MAP FINALLY HAS A PRICE ATTACHED. Walking somewhere the
    // crawler could have told you about is turns you do not get back — and
    // walking somewhere it INVENTED is worse.
    const sent = apply(initial(), { type: 'send' });
    const after = burn(sent, 6);
    expect(after.crawl!.walked.length).toBeGreaterThan(1);
    // Its report costs you nothing but the turns you were spending anyway.
    expect(after.oil).toBe(LIGHT - 7);
  });
});
