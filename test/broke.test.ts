// ★★★ THE BROKE DELVER — 2026-08-23, and this is the test the lamp needed.
//
// The lamp economy rests on one claim: *gold buys light, light buys ground,
// ground pays gold.* Three rules make it, and each one can kill the loop:
//
//   1. Climbing out no longer fills the lamp — light is bought, never found.
//   2. A room you cleared stays cleared until you take the stair.
//   3. What you can always scrape together is `DREGS`, and no more.
//
// ⚠️ TOGETHER THOSE THREE CAN DEAD-END THE GAME, and the first draft did. On
// the dregs you can reach exactly one shallow lair; it pays 6; it never pays
// again; and a flask cost 10. Run two reached nothing, so the shop showed
// eight things and no way to ever buy any of them. Nothing in the type system,
// the typecheck or 1,124 other tests noticed — the game was simply over at the
// Mouth, and the only thing that could tell you was playing it.
//
// So a bot plays it. From nothing. It is a bad player on purpose: it takes the
// nearest room it can afford to walk to and back, it never gambles on the
// dark, and it buys nothing but oil. If THAT delver can get down the stair,
// the loop resolves for everybody.
import { describe, it, expect } from 'vitest';
import { apply, initial, facing, maxOil, maxHp, swing, dark, worth, guardsOf,
  stepToward, undrinkable, held, COST, DREGS, LIGHT, FLASK, SALVE,
  type Delve, type Good } from '../src/delve/engine';

/** Hops between two rooms, ignoring what lives in them. */
const far = (g: Delve, from: number, to: number): number => {
  let n = 0;
  let at = from;
  while (at !== to && n < 60) {
    const hop = stepToward(g, at, to);
    if (hop === null) return Infinity;
    at = hop; n++;
  }
  return at === to ? n : Infinity;
};

/** Can I take this room without dying in it? Salves count — a bad guess here
 *  is how the first version of this bot suicided into the Bone Kiln nine
 *  delves running and called the ECONOMY broken. */
const winnable = (g: Delve, id: number): boolean => {
  const q = guardsOf(g, g.rooms.find((r) => r.id === id));
  if (q.length === 0) return true;
  // ⚠️ AND IT KILLS THEM ONE AT A TIME, weakest first, so the bite falls as
  // the room empties. Summing the bite over the whole fight says the Warren is
  // unwinnable at full health, which it plainly is not.
  // ⚠️ AND HALF OF THEM ARE SLOW. A heavy thing bites every other turn, so
  // counting a bite a turn says the Warren kills you and it does not.
  const rate = (x: { bite: number; breed: string }): number =>
    x.bite / (x.breed === 'stalker' ? 1 : x.bite >= 2 ? 2 : 1);
  const line = [...q].sort((a, b) => a.hp - b.hp);
  let taken = 0;
  for (let i = 0; i < line.length; i++) {
    const left = line.slice(i).reduce((s, x) => s + rate(x), 0);
    taken += Math.ceil(line[i]!.hp / swing(g)) * left;
  }
  return taken < g.hp + g.kit.salve * SALVE - 2;
};

/** Swing until the room is quiet, drinking when it gets bad. */
const clear = (g: Delve): Delve => {
  let out = g;
  for (let i = 0; i < 60 && !out.fallen && facing(out).length > 0; i++) {
    if (out.hp <= maxHp(out) / 2 && undrinkable(out) === null) {
      out = apply(out, { type: 'drink' }); continue;
    }
    out = apply(out, { type: 'strike' });
  }
  return out;
};

/** ⚠️ AND IT WALKS PAST WHAT IT IS NOT THERE FOR. A trek that stopped to clear
 *  every room it passed through spent its salves in the Rat Warren and arrived
 *  at the Bone Kiln with nothing left — which looked exactly like an economy
 *  that could not fund the Bone Kiln. It was a bot that could not walk. */
const trek = (g: Delve, to: number): Delve => {
  let out = g;
  for (let i = 0; i < 40 && out.at !== to && !out.fallen; i++) {
    const hop = stepToward(out, out.at, to);
    if (hop === null) break;
    const next = apply(out, { type: 'walk', to: hop });
    if (next === out) break;
    out = next;
  }
  return out;
};

/** ★ THE WHOLE POLICY, and it is deliberately dim: keep one flask lit, save up
 *  for the one purchase that opens new ground, take the nearest room you can
 *  both survive and still walk home from, never gamble on the dark. */
const BUY: Good[] = ['vim', 'edge', 'salve'];
const delve = (g: Delve): Delve => {
  let out = g;
  // ⚠️ SAVING IS THE WHOLE SKILL AT THIS END OF THE GAME. A bot that spent
  // every coin the moment it had one hovered between five and eleven gold for
  // fourteen delves — never stuck, never getting anywhere either. Buy the
  // leather or buy nothing.
  for (const w of BUY) {
    if (w === 'salve' && out.kit.edge < 1) continue;
    const next = apply(out, { type: 'buy', what: w });
    if (next !== out) { out = next; break; }
  }
  if (out.kit.flask === 0) {
    const next = apply(out, { type: 'buy', what: 'flask' });
    if (next !== out) out = next;
  }
  while (out.kit.flask > 0 && out.oil + FLASK <= maxOil(out) && !out.fallen) {
    out = apply(out, { type: 'pour' });
  }
  for (let hop = 0; hop < 12 && !out.fallen; hop++) {
    const mark = out.rooms
      .filter((r) => r.kind !== 'hoard' && winnable(out, r.id))
      // ⚠️ `held`, NOT `guardsOf(...).length > 0`. The second is a fact about
      // the ROOM KIND and stays true after you have emptied it, so the bot
      // stood in the Rat Warren re-targeting the Rat Warren twelve times.
      .filter((r) => held(out, r.id) || !out.cleared.includes(r.id))
      .filter((r) => worth(out, r) > 0 || held(out, r.id))
      .map((r) => ({ r, d: far(out, out.at, r.id) + far(out, r.id, 0) }))
      // ⚠️ AND IT ONLY GOES WHERE IT CAN GET BACK FROM. `+ 6` for the fight.
      .filter((x) => x.d + 6 < out.oil)
      // Fresh ground first; a re-clear is a last resort, which is the point.
      .sort((a, b) => (Number(out.cleared.includes(a.r.id)) - Number(out.cleared.includes(b.r.id)))
        || a.d - b.d)[0];
    if (mark === undefined) break;
    const there = trek(out, mark.r.id);
    if (there.at !== mark.r.id) break;
    out = clear(there);
  }
  return apply(trek(out, 0), { type: 'leave' });
};

describe('★★★ A DELVER WITH NOTHING IS NEVER STUCK', () => {
  it('★★★ the floor pays for the gear that takes the floor', () => {
    // ⚠️ WHAT BROKE WHEN ROOMS STOPPED REPAYING. A floor's income used to be
    // unbounded — walk the same three rooms forever — and the shop was priced
    // against that. Take the repeat away and floor one paid 30 gold, ever,
    // against a `vim` costing 90. The prices moved; this is the check that
    // says they moved far enough.
    let g = initial();
    expect(g.hoard).toBe(0);
    for (let d = 0; d < 5; d++) g = delve(g);
    const bought = g.kit.edge + g.kit.vim + g.kit.wick + (g.kit.lamp - 1);
    expect(bought, `five delves bought nothing: ${g.hoard} gold`).toBeGreaterThan(1);
  });

  it('★★★ and walking new ground pays MANY TIMES what walking old ground does', () => {
    // The whole shape of the economy in one comparison. If these two numbers
    // are close, "cleared stays cleared" is a label on a treadmill.
    const fresh = delve(initial()).hoard;
    // ⚠️ COMPARED AGAINST A FLOOR WITH NOTHING LEFT TO FIND — every room taken
    // and every room walked. The first draft compared delve one with delve
    // two, and delve two was still finding rooms, so it was measuring fresh
    // ground against fresh ground and calling the two equal a bug.
    const done: Delve = { ...initial(), hoard: 0,
      cleared: initial().rooms.map((r) => r.id),
      trod: initial().rooms.map((r) => r.id) };
    const again = delve(done).hoard;
    expect(fresh).toBeGreaterThan(20);
    expect(again, 'an emptied floor pays nothing at all').toBeGreaterThan(0);
    expect(again * 4).toBeLessThan(fresh);
  });

  it('★★★ AND THE GRIND ALWAYS CLIMBS, however badly you have played', () => {
    // ⚠️ THE SOFT-LOCK, AND IT IS NOT HYPOTHETICAL — a bot sat at one gold for
    // eighteen delves with three rooms taken and everything else too strong to
    // walk into. Rooms pay once, light is bought, and the dregs are nine: each
    // rule is fine and together they ended the game at the Mouth. Two things
    // stop it — the Mouth stakes a delver with nothing, and a corpse in an
    // emptied room still pays the toll.
    let g: Delve = { ...initial(), hoard: 0, oil: 0,
      cleared: [0, 3, 4, 7], trod: [0, 1, 2, 3, 4, 5, 7] };
    const marks: number[] = [];
    for (let d = 0; d < 8; d++) { g = delve(g); marks.push(g.hoard + g.kit.flask * COST.flask); }
    expect(g.fallen).toBe(false);
    expect(marks[7]!, `stalled at ${marks.join(' → ')}`).toBeGreaterThan(marks[1]!);
    expect(marks[7]! - marks[1]!).toBeGreaterThanOrEqual(6);
  });

  it('★★★ and the light it burned was BOUGHT — the dregs alone do not do it', () => {
    // ⚠️ THE CHEAP VERSION OF ALL OF THIS PASSES WITH THE LAMP DELETED. If a
    // free run were long enough to take the floor, everything above would go
    // green with oil doing nothing at all. So: prove the dregs are not enough.
    const g: Delve = { ...initial(), oil: DREGS, hoard: 0, kit: { ...initial().kit, flask: 0 } };
    const first = delve(g);
    expect(first.cleared.length).toBeLessThan(4);
    expect(DREGS).toBeLessThan(LIGHT);
    // ★ And the Mouth staked them for the next one, because they have nothing.
    expect(first.kit.flask).toBe(1);
  });
});
