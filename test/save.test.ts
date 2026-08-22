// ★★★ THE SAVE — 2026-08-19, and four slices later than it should have been.
//
// ⚠️ THE DELVE SHIPPED FOUR TIMES WITH NO PERSISTENCE. The state lived in a
// rune and nowhere else, so closing the tab threw away the hoard, the kit and
// the crawler's whole map. On a phone — where the browser reclaims a
// background tab whenever it feels like it — that is not "saves are
// breakable", it is a game that cannot survive a bus ride.
//
// The parsing is pure on purpose, so the half that actually matters — a
// truncated blob, a save from a format that no longer exists, somebody else's
// JSON — is tested rather than hoped about.
import { describe, it, expect } from 'vitest';
import { pack, unpack, toText, fromText } from '../src/delve/save';
import { apply, initial, DELVE_VERSION, type Delve } from '../src/delve/engine';

/** A save worth losing: money banked, kit bought, a crawler's map filed. */
const played = (): Delve => {
  let g: Delve = { ...initial(), hoard: 400 };
  g = apply(g, { type: 'buy', what: 'lamp' });
  g = apply(g, { type: 'buy', what: 'wedges' });
  g = apply(g, { type: 'send' });
  for (let i = 0; i < 5; i++) g = { ...apply(g, { type: 'wait' }), hp: 12 };
  return g;
};

describe('★★★ IT COMES BACK EXACTLY', () => {
  it('★★★ a played save round-trips with everything on it', () => {
    const g = played();
    const back = unpack(pack(g))!;
    expect(back).not.toBeNull();
    expect(back).toEqual(g);
    // Named individually, because "toEqual" passing while the hoard is gone is
    // the kind of thing that happens when a field is renamed.
    expect(back.hoard).toBe(g.hoard);
    expect(back.kit).toEqual(g.kit);
    expect(back.crawl).toEqual(g.crawl);
    expect(back.seen).toEqual(g.seen);
    expect(back.log).toEqual(g.log);
  });

  it('★★★ and the loaded save keeps PLAYING the same', () => {
    // ⚠️ THE CHECK THAT MATTERS. Equal fields are not the same thing as a
    // working game: a save that deserialises into a state the engine then
    // treats differently is a save that quietly cheats you.
    const g = played();
    const back = unpack(pack(g))!;
    const a = apply(apply(g, { type: 'walk', to: 1 }), { type: 'wait' });
    const b = apply(apply(back, { type: 'walk', to: 1 }), { type: 'wait' });
    expect(b).toEqual(a);
  });
});

describe('★★★ AND A BAD SAVE NEVER BREAKS THE GAME', () => {
  it('★★★ it returns null instead of throwing — on anything at all', () => {
    // ⚠️ A SAVE THAT BLOWS UP ON LOAD IS WORSE THAN NO SAVE: it is a game that
    // will not open, on a device with no console to tell you why.
    for (const bad of [null, '', 'not json', '{', '[]', 'null', '17', '"x"',
      '{"version":' + DELVE_VERSION + '}', JSON.stringify({ hello: 'world' })]) {
      expect(() => unpack(bad)).not.toThrow();
      expect(unpack(bad)).toBeNull();
    }
  });

  it('★★★ a save from a format that no longer exists is refused, not guessed', () => {
    // `CLAUDE.md`, the owner on 2026-07-27: *"i'm completely ok with breaking
    // saves at any time"*. Migrations are optional; a SILENT reset is not.
    // `version` is on every save precisely so the code can TELL.
    const old = JSON.parse(pack(played()));
    old.version = DELVE_VERSION - 1;
    expect(unpack(JSON.stringify(old))).toBeNull();
  });

  it('★★★ and a save missing a field the game grew later still loads', () => {
    const half = JSON.parse(pack(played()));
    delete half.bred;
    delete half.turn;
    const back = unpack(JSON.stringify(half));
    expect(back).not.toBeNull();
    expect(typeof back!.bred).toBe('number');   // filled from `initial()`
    expect(typeof back!.turn).toBe('number');
  });

  it('★ but a save missing something LOAD-BEARING is refused', () => {
    for (const gone of ['at', 'hp', 'seen', 'foes', 'cleared', 'bars', 'kit']) {
      const holed = JSON.parse(pack(played()));
      delete holed[gone];
      expect(unpack(JSON.stringify(holed)), `without ${gone}`).toBeNull();
    }
  });
});

describe('★★★ AND THE OWNER CAN CARRY IT BETWEEN DEVICES', () => {
  it('★★★ export then import is the same game', () => {
    // `CLAUDE.md`: export/import keeps working, because that is how the owner
    // moves a save from one phone to another.
    const g = played();
    const text = toText(g);
    expect(text.startsWith('DELVE1:')).toBe(true);
    expect(text).not.toContain('\n');            // survives a paste box
    expect(fromText(text)).toEqual(g);
    expect(fromText(`  ${text}  `)).toEqual(g);  // and stray whitespace
  });

  it('★ a wrong paste is recognisably wrong, not merely broken', () => {
    expect(fromText('hello')).toBeNull();
    expect(fromText(pack(played()))).toBeNull();   // raw JSON is not an export
    expect(fromText('DELVE1:@@@@')).toBeNull();
    expect(() => fromText('DELVE1:')).not.toThrow();
  });
});
