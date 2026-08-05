// THE SAVE LAW — honour() judges every blob, from the disk or from a paste.
// Export/import is the one save guarantee that survived the breakable-saves
// reversal: it is how the owner moves a run between devices.
//
// ---- PROVEN RED, 2026-08-05 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { honour, exportRaw, SAVE_VERSION } from '../src/game/store';
import { initial } from '../src/game/engine';

describe('★★ export and import speak the same law', () => {
  it('★ a fresh export is honoured, and comes back the same game', () => {
    const g = { ...initial(), mana: 42, provisions: 4 };
    const back = honour(JSON.parse(exportRaw(g)));
    expect(back).not.toBeNull();
    expect(back!.game).toEqual(g);
  });

  it('a blob from another era is refused, not repaired', () => {
    expect(honour({ v: SAVE_VERSION - 1, savedAt: Date.now(), game: initial() })).toBeNull();
  });

  it('a scene mid-save with a made-up stage is refused', () => {
    const g = { ...initial(),
      building: { key: '0|2', from: 0, left: 7, secs: 14, to: 1, halts: [0.5], kit: 'cart' as const },
      facing: { key: '0|2', event: 'washout', rolled: null,
        scene: { stage: 'nonsense', gauges: { cut: 0, water: 3 }, shown: [] } } };
    expect(honour({ v: SAVE_VERSION, savedAt: Date.now(), game: g })).toBeNull();
  });

  it('garbage is refused without a throw', () => {
    expect(honour(undefined)).toBeNull();
    expect(honour(JSON.parse('{"v":8}'))).toBeNull();
  });
});
