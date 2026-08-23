// ★★★ DEEP PLAY — does the ladder actually go anywhere? 2026-08-23.
//
// `docs/NEXT.md`, top of the queue: *"NOBODY HAS PLAYED PAST FLOOR 2."*
// Everything below floor 2 was generated, scaled, and never walked. So this
// walks it, with a bot, and it found the wall on the first run.
//
// ⚠️ THE WALL: THE DUNGEON SCALED AND THE PLAYER DID NOT. Every purchase in
// the shop was a FLAG — `edge` and `vim` could be bought once each — so by
// floor five the guards had roughly doubled while the delver still had twenty
// life and a swing of four. And there was no healing anywhere in the game, at
// all, so a run's length was pinned to your maximum life forever however well
// you played. That is not a difficulty curve, it is a ceiling with a countdown.
//
// ⚠️ AND WHAT THIS BOT IS NOT. It plays with money already in the bank, so what
// it measures is the CEILING — how deep the kit can take you — not the grind
// that gets you there. A from-scratch bot kept dying in the first lair and
// banking nothing, which says more about greedy pathing than about the game;
// `test/ladder.test.ts` and the pacing work cover the early loop properly.
import { describe, it, expect } from 'vitest';
import { apply, initial, facing, maxHp, swing, unwalkable, unshovable, price,
  canDescend, guardsOf, roomAt, stepToward, done, has, AGAIN, DEARER, SALVE,
  undrinkable, type Delve, type Good } from '../src/delve/engine';

const LASTING: Good[] = ['vim', 'edge', 'lamp', 'brace'];
/** Spend on the permanent things first, then salves and wedges with the rest. */
const shop = (g: Delve): Delve => {
  let out = g;
  for (let n = 0; n < 300; n++) {
    let did = false;
    for (const w of [...LASTING, 'salve' as Good, 'wedges' as Good]) {
      const next = apply(out, { type: 'buy', what: w });
      if (next !== out) { out = next; did = true; }
    }
    if (!did) break;
  }
  return out;
};

const fight = (g: Delve): Delve => {
  let out = g;
  for (let i = 0; i < 80 && !out.fallen && facing(out).length > 0; i++) {
    if (out.hp <= maxHp(out) / 3 && undrinkable(out) === null) {
      out = apply(out, { type: 'drink' }); continue;
    }
    const line = facing(out);
    const heavy = line.reduce((x, y) => (y.bite > x.bite ? y : x));
    const door = roomAt(out, out.at)!.doors.find((d) => unshovable(out, heavy.id, d) === null);
    out = (line.length > 1 && door !== undefined && i === 0)
      ? apply(out, { type: 'shove', foe: heavy.id, to: door })
      : apply(out, { type: 'strike' });
  }
  return out;
};

const trek = (g: Delve, to: number, dash = false): Delve => {
  let out = g;
  for (let i = 0; i < 40 && out.at !== to && !out.fallen; i++) {
    const hop = stepToward(out, out.at, to);
    if (hop === null || unwalkable(out, hop) !== null) break;
    out = apply(out, { type: 'walk', to: hop });
    if (!dash) out = fight(out);
  }
  return out;
};

/** Clear a floor and take the stair. Money in the bank; skill from the bot. */
function play(g0: Delve): { end: Delve; mapped: boolean; stair: boolean } {
  let run: Delve = { ...g0, hp: maxHp(g0) };
  const hoard = run.rooms.find((r) => r.kind === 'hoard')!;
  for (const r of [...run.rooms].sort((a, b) => a.deep - b.deep)) {
    if (run.fallen || r.kind === 'hoard') continue;
    run = trek(run, r.id);
  }
  if (!run.fallen) run = trek(run, hoard.id, true);
  return { end: run, mapped: done(run), stair: !run.fallen && canDescend(run) };
}

describe('★★★ THE LADDER GOES SOMEWHERE', () => {
  it('★★★ four floors, cleared and mapped, with the kit that money buys', () => {
    // ⚠️ THIS DIED ON FLOOR ONE before the shop's numeric goods repeated. The
    // bot has not changed since; the game has.
    let g = { ...initial(), hoard: 100_000 };
    const reached: number[] = [];
    for (let floor = 1; floor <= 4; floor++) {
      g = shop(g);
      const { end, mapped, stair } = play(g);
      expect(end.fallen, `fell on floor ${floor}`).toBe(false);
      expect(mapped, `floor ${floor} not fully mapped`).toBe(true);
      expect(stair, `no stair on floor ${floor}`).toBe(true);
      reached.push(floor);
      g = apply(end, { type: 'descend' });
    }
    expect(reached).toEqual([1, 2, 3, 4]);
    expect(g.floor).toBe(5);
    expect(g.tally.deepest).toBe(5);
  });

  it('★★★ and the player grows because the shop REPEATS', () => {
    // ⚠️ THE FIX THE BOT FORCED. A one-off purchase cannot answer a dungeon
    // that scales; the two numeric goods repeat at a rising price.
    const bare = initial();
    const rich = shop({ ...bare, hoard: 100_000 });
    expect(maxHp(rich)).toBeGreaterThan(maxHp(bare) + 8);
    expect(swing(rich)).toBeGreaterThan(swing(bare) + 1);
    expect(rich.kit.vim).toBeGreaterThan(1);
    expect(rich.kit.edge).toBeGreaterThan(1);
  });

  it('★★★ and every repeat costs more than the last', () => {
    let g: Delve = { ...initial(), hoard: 100_000 };
    // ⚠️ ONLY THE PERMANENT ONES. Pricing a CONSUMABLE off how many you hold
    // raised a two-salve purchase by the SQUARE of the growth factor, and made
    // wedges cheaper the more of them you burned. A potion costs what a potion
    // costs; an upgrade costs more each time.
    for (const w of DEARER) {
      const first = price(g, w);
      const after = apply(g, { type: 'buy', what: w });
      const ratio = price(after, w) / first;
      expect(ratio, `${w} grew ×${ratio.toFixed(2)}`).toBeGreaterThan(1.4);
      expect(ratio, `${w} grew ×${ratio.toFixed(2)}`).toBeLessThan(2.1);
    }
    for (const w of AGAIN.filter((x) => !DEARER.includes(x))) {
      const spent = apply(g, { type: 'buy', what: w });
      expect(price(spent, w), `${w} should be a flat price`).toBe(price(g, w));
      // And using them up does not make them cheaper either.
      expect(price({ ...spent, kit: { ...spent.kit, wedges: 0, salve: 0 } }, w))
        .toBe(price(g, w));
    }
    // And the one-offs stay one-offs.
    for (const w of ['lamp', 'brace'] as Good[]) {
      expect(has(apply(g, { type: 'buy', what: w }).kit, w)).toBe(true);
    }
  });

  it('★★★ AND THERE IS HEALING, which there was not', () => {
    // ⚠️ NONE. AT ALL. A run's length was pinned to your maximum life forever,
    // so a floor could not be cleared in one visit however well you played.
    const bare = initial();
    expect(undrinkable(bare)).toBe('No salves.');
    const stocked = apply({ ...bare, hoard: 900 }, { type: 'buy', what: 'salve' });
    expect(stocked.kit.salve).toBeGreaterThan(0);
    expect(undrinkable(stocked)).toBe('You are whole.');
    const hurt = { ...stocked, hp: 2 };
    const drunk = apply(hurt, { type: 'drink' });
    expect(drunk.hp).toBe(2 + SALVE);
    expect(drunk.kit.salve).toBe(stocked.kit.salve - 1);
    // ★ And it costs a turn, like everything else down here.
    expect(drunk.turn).toBe(hurt.turn + 1);
    // ★ And it never overfills.
    expect(apply({ ...stocked, hp: maxHp(stocked) - 1 }, { type: 'drink' }).hp)
      .toBe(maxHp(stocked));
  });
});
