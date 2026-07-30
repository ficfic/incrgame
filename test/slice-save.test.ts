import { describe, it, expect } from 'vitest';
import { apply, initial, SKILLS, type Slice } from '../src/slice/engine';
import { encode, decode, toText, fromText, restore, SAVE_VERSION } from '../src/slice/save';
import { NODES } from '../src/slice/gather';

/** A run that has actually done things, so the round-trip has something to lose. */
function played(): Slice {
  let s = initial(0x1234);
  s = apply(s, { type: 'work', id: 'listen' });
  s = apply(s, { type: 'tick', secs: 45 });
  s = apply(s, { type: 'travel', to: 2 });
  s = apply(s, { type: 'travel', to: 4 });
  return s;
}

describe('save round-trip', () => {
  it('comes back identical, minus the dice on the table', () => {
    const s = played();
    const back = decode(encode(s));
    expect(back).not.toBeNull();
    expect(back).toEqual({ ...s, lastRoll: null });
  });

  it('★ brings the seed back, so the next roll is the one you were about to make', () => {
    // THE POINT OF THE WHOLE FILE. A save that restores everything except the
    // seed looks perfect and is a different game.
    const s = played();
    const back = decode(encode(s))!;
    expect(back.seed).toBe(s.seed);
    // Same action on both must produce the same dice, forever.
    const a = apply(s, { type: 'travel', to: 2 });
    const b = apply(back, { type: 'travel', to: 2 });
    expect(b.lastRoll?.dice).toEqual(a.lastRoll?.dice);
    expect(b.seed).toBe(a.seed);
  });

  it('survives the text form the owner pastes between devices', () => {
    const s = played();
    const text = toText(s);
    expect(text).not.toContain('{');          // base64, safe to paste
    expect(fromText(text)).toEqual({ ...s, lastRoll: null });
  });

  it('also accepts raw JSON, because somebody will paste that', () => {
    const s = played();
    expect(fromText(encode(s))).toEqual({ ...s, lastRoll: null });
    expect(fromText(`  ${encode(s)}  `)).toEqual({ ...s, lastRoll: null });
  });

  it('keeps a running job, including how far through it is', () => {
    let s = apply(initial(), { type: 'work', id: 'listen' });
    s = apply(s, { type: 'tick', secs: 7 });
    const back = decode(encode(s))!;
    expect(back.job).toEqual(s.job);
    expect(back.job?.left).toBeCloseTo(s.job!.left, 6);
  });
});

describe('a save we cannot honour is REFUSED, not repaired', () => {
  const bad = (mutate: (o: Record<string, unknown>) => void): string => {
    const o = JSON.parse(encode(played())) as Record<string, unknown>;
    mutate(o);
    return JSON.stringify(o);
  };

  it('rejects a different version', () => {
    expect(decode(bad((o) => { o.version = SAVE_VERSION + 1; }))).toBeNull();
    expect(decode(bad((o) => { delete o.version; }))).toBeNull();
  });

  it('rejects nonsense', () => {
    for (const blob of ['', 'null', '[]', '{', 'not json', '"a string"', '42']) {
      expect(decode(blob), blob).toBeNull();
    }
    expect(fromText('!!!! not base64 !!!!')).toBeNull();
    expect(fromText('')).toBeNull();
  });

  it('rejects a position that is not a place', () => {
    expect(decode(bad((o) => { o.at = 999; }))).toBeNull();
    expect(decode(bad((o) => { o.at = 'The Cut'; }))).toBeNull();
  });

  it('rejects standing somewhere you have never been', () => {
    // Not a state the game can produce, so honouring it would be inventing one.
    expect(decode(bad((o) => { o.seen = [0]; o.at = 4; }))).toBeNull();
  });

  it('rejects an item that no longer exists', () => {
    expect(decode(bad((o) => { o.pack = ['sword-of-doom']; }))).toBeNull();
  });

  it('rejects a job whose work is not at that place any more', () => {
    expect(decode(bad((o) => { o.job = { work: 'listen', at: 3, left: 5 }; }))).toBeNull();
    expect(decode(bad((o) => { o.job = { work: 'gone', at: 0, left: 5 }; }))).toBeNull();
  });

  it('rejects a broken seed, and a negative anything', () => {
    expect(decode(bad((o) => { o.seed = -1; }))).toBeNull();
    expect(decode(bad((o) => { o.seed = 'abc'; }))).toBeNull();
    expect(decode(bad((o) => { o.seed = Number.NaN; }))).toBeNull();
    expect(decode(bad((o) => { o.satchels = -2; }))).toBeNull();
    expect(decode(bad((o) => { o.satchels = [{ good: 'no-such-item' }]; }))).toBeNull();
    expect(decode(bad((o) => { o.xp = { wayfaring: -5, lore: 0, craft: 0 }; }))).toBeNull();
  });

  it('but a skill missing from an older save starts at zero rather than refusing', () => {
    // Written against SKILLS rather than a hardcoded list: this test asserted
    // exactly three skills and went red the moment two more were added, which
    // is a stale test reporting a working feature as broken.
    const back = decode(bad((o) => { o.xp = { lore: 90 }; }));
    expect(back).not.toBeNull();
    expect(back!.xp.lore).toBe(90);
    for (const id of Object.keys(SKILLS) as (keyof typeof SKILLS)[]) {
      if (id !== 'lore') expect(back!.xp[id], id).toBe(0);
    }
    expect(Object.keys(back!.xp).sort()).toEqual(Object.keys(SKILLS).sort());
  });
});

describe('restore never stops the game opening', () => {
  it('falls back to a fresh run for a missing or broken save', () => {
    expect(restore(null).at).toBe(0);
    expect(restore('garbage').at).toBe(0);
    expect(restore('garbage').seen).toEqual([0]);
    expect(restore(null, 77).seed).toBe(77);
  });

  it('uses the save when there is an honourable one', () => {
    const s = played();
    expect(restore(encode(s)).at).toBe(s.at);
    expect(restore(encode(s)).seed).toBe(s.seed);
  });
});

describe('a gathering job survives a reload', () => {
  // ⚠️ THE ONE THE FIRST VERSION GOT WRONG. `decode` validated a job by looking
  // it up as a PLACE's work, and a gathering node is not that — so every save
  // written while fishing was refused, and the run came back with the rod put
  // away and no explanation. Same shape as the debounce bug that ate runs on
  // reload: correct in the common case, silent in the one that matters.
  it('accepts a job that names a gathering node, not a place action', () => {
    const node = NODES[0]!;
    let s = initial();
    s = { ...s, at: node.place, seen: [...new Set([...s.seen, node.place])] };
    s = apply(s, { type: 'work', id: node.id });
    expect(s.job, 'the fixture must actually be fishing').not.toBeNull();
    expect(s.job!.work).toBe(node.id);

    const back = decode(encode(s));
    expect(back, 'a save made while gathering must load').not.toBeNull();
    expect(back!.job).toEqual(s.job);
  });

  it('still refuses a job whose node is not at that place', () => {
    const node = NODES[0]!;
    const o = JSON.parse(encode(initial())) as Record<string, unknown>;
    o.job = { work: node.id, at: 0, left: 5 };
    if (node.place === 0) return;          // fixture would be legitimate
    expect(decode(JSON.stringify(o))).toBeNull();
  });

  it('refuses banked attempts at a node that no longer exists', () => {
    const o = JSON.parse(encode(initial())) as Record<string, unknown>;
    o.banked = { 'no-such-pool': 3 };
    expect(decode(JSON.stringify(o))).toBeNull();
  });
});
