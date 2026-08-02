// THE PALETTE, AND THE ONE THING THAT MAKES IT CHECKABLE.
//
// ⚠️ A COLOUR USED TO LIVE IN FOUR FILES. Board.svelte, play-tabs.mjs and
// terrain.test.ts all carried `#4d6b80`; `#8ff0cf` added Game.svelte. The cost
// was not the typing — it was that **the probe could drift from the app and
// still pass**, because it counts pixels of a named colour and would happily go
// on counting one the app had stopped drawing.
//
// Now `src/game/ink.ts` is the only definition, the probe reads it off the
// running page, and this file holds the property that makes counting pixels
// mean anything: the inks the probe counts must be far enough apart that one
// can never be mistaken for another.
//
// ---- PROVEN RED, 2026-08-01 ----------------------------------------------
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { INK, COUNTED, APART, TOL, LOOK, type InkName } from '../src/game/ink';
import { GROUND_INK, RIVER_INK } from '../src/game/terrain';
import { KINDS } from '../src/game/world';

const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const apart = (a: string, b: string): number => {
  const A = rgb(a), B = rgb(b);
  return Math.max(...A.map((v, i) => Math.abs(v - B[i]!)));
};

describe('★ the inks the probe counts can be told apart', () => {
  it('holds every counted pair further apart than the wider of their two nets', () => {
    // ⚠️ NOT A BLANKET DISTANCE. Anti-aliasing means a thin line needs a loose
    // match to be found at all, while two similar colours need a tight one to be
    // told apart — so the rule is per-pair, against the tolerances the probe
    // actually uses. Writing this down caught `known` being the same hex as
    // `route`, and `fill` sitting 23 from `open` while counted at 20.
    for (let i = 0; i < COUNTED.length; i++) {
      for (let j = i + 1; j < COUNTED.length; j++) {
        const a = COUNTED[i]!, b = COUNTED[j]!;
        const need = Math.max(TOL[a]!, TOL[b]!);
        expect(apart(INK[a], INK[b]),
          `"${a}" (${INK[a]}) and "${b}" (${INK[b]}) are ${apart(INK[a], INK[b])} apart `
          + `but are counted at ${need}`).toBeGreaterThan(need);
      }
    }
  });

  it('gives every counted ink a tolerance, and none of them a silly one', () => {
    for (const c of COUNTED) {
      expect(TOL[c], `"${c}" is counted with no tolerance`).toBeDefined();
      expect(TOL[c]!).toBeGreaterThan(2);
      expect(TOL[c]!).toBeLessThan(40);
    }
  });

  it('★ holds every ink NOT counted clear of every ink that is', () => {
    // The one that catches a NEW colour breaking an OLD check. Scenery did it
    // once already: `wood` landed 25 from `unmade`, so the ground would have
    // been counted as unmade routes.
    //
    // ⚠️ AGAINST THAT INK'S OWN TOLERANCE, not the widest in the palette. Using
    // the maximum failed `means` at 13 from `dot` — but `dot` is only ever
    // counted at 6, so 13 is plenty and the "failure" was the test being wrong
    // rather than the colour.
    const counted = new Set<string>(COUNTED);
    for (const [name, ink] of Object.entries(INK) as Array<[InkName, string]>) {
      if (counted.has(name) || name === 'back') continue;
      for (const c of COUNTED) {
        expect(apart(ink, INK[c]),
          `"${name}" (${ink}) is only ${apart(ink, INK[c])} from counted ink "${c}" `
          + `(${INK[c]}), which is counted at ${TOL[c]}`).toBeGreaterThan(TOL[c]!);
      }
    }
  });

  it('APART is the widest net, so a new colour has one number to clear', () => {
    expect(APART).toBe(Math.max(...COUNTED.map((c) => TOL[c]!)));
  });
});

describe('the palette is the only definition', () => {
  it('terrain re-exports it rather than keeping a second copy', () => {
    expect(GROUND_INK.wood).toBe(INK.wood);
    expect(GROUND_INK.moor).toBe(INK.moor);
    expect(GROUND_INK.crag).toBe(INK.crag);
    expect(GROUND_INK.under).toBe(INK.under);
    expect(GROUND_INK.stone).toBe(INK.stone);
    expect(RIVER_INK).toBe(INK.river);
  });

  it('every ink is a real six-digit hex', () => {
    for (const [name, ink] of Object.entries(INK)) {
      expect(ink, `"${name}" is not a hex colour`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('★ every kind of node has a look, and every look names a real ink', () => {
  // ⚠️ IMPORTED, NOT RESTATED. This list used to be held by hand here, on the
  // reasoning that adding a kind and forgetting to style it would fail HERE
  // with the kind's name in the message. What actually happened: every kind in
  // `world.ts` was renamed for King's Roads, and this test went on checking
  // that `place`, `item`, `concept` and `foe` had ink — all four of them gone,
  // and the two new ones unstyled. A hand-held copy cannot catch a rename.

  it('covers every kind', () => {
    for (const k of KINDS) {
      expect(LOOK[k], `no look for kind "${k}" — it would fall back to a stop`)
        .toBeDefined();
    }
    expect(Object.keys(LOOK).sort()).toEqual([...KINDS].sort());
  });

  it('names only inks that exist', () => {
    for (const [k, look] of Object.entries(LOOK)) {
      expect(INK[look.fill], `${k}.fill names "${look.fill}"`).toBeDefined();
      expect(INK[look.label], `${k}.label names "${look.label}"`).toBeDefined();
      if (look.ring) expect(INK[look.ring], `${k}.ring names "${look.ring}"`).toBeDefined();
      expect(look.r).toBeGreaterThan(0);
    }
  });
});

describe('★★ the probe cannot count an ink nobody declared', () => {
  it('finds every ink `play-tabs.mjs` counts listed in TOL', () => {
    // ⚠️ THIS IS THE HOLE THE CONTOUR-INK MISTAKE WENT THROUGH, and it is not
    // the one it looked like.
    //
    // The rule above — "every ink NOT counted stays clear of every ink that IS"
    // — was already here and already correct. It could not catch #463a24
    // sitting 9 from `moor` for a simple reason: NEITHER of them was in `TOL`,
    // so neither counted as counted, and the pair was never compared. Meanwhile
    // the probe was cheerfully counting both, at its default net of 12.
    //
    // ★ SO THE DEFECT WAS A DECLARATION GAP, not a distance one. The probe knew
    // it was counting contour, region outline and ground; `ink.ts` did not. This
    // is the only check that can see that, because it is the only one that reads
    // the probe.
    const probe = readFileSync('scripts/play-tabs.mjs', 'utf8');
    const counted = [...probe.matchAll(/\bink\('([a-z]+)'\)/g)].map((m) => m[1]!);
    expect(counted.length, 'the probe counts no inks at all — this test proves nothing')
      .toBeGreaterThan(3);
    for (const name of new Set(counted)) {
      expect(INK[name as InkName], `the probe counts "${name}", which is not an ink`)
        .toBeDefined();
      expect(TOL[name as InkName],
        `the probe counts "${name}" but it has no declared tolerance, so nothing `
        + 'holds it apart from the rest of the palette').toBeDefined();
    }
  });
});

describe('★ a kind that can be discovered must LOOK discovered', () => {
  it('gives a stop a lit fill that differs from the unlit one', () => {
    // ⚠️ THE REGRESSION THIS EXISTS FOR. Collapsing the look table to one fill
    // per kind lost this: every notion on Thoughts drew identically whether you
    // had thought it or not, which is the entire way that tab shows progress.
    // The browser probe read "0px thought" and caught it; this is the cheaper
    // guard that catches it next time.
    //
    // A stop is now the only kind you discover — you have reached it or you
    // have not. Named as a design claim rather than copied from a list, and the
    // second half below holds for every kind, so a new discoverable one cannot
    // quietly get a lit fill that looks the same.
    expect(LOOK.stop?.lit, 'a stop is discovered but has no lit fill').toBeDefined();
    for (const [k, look] of Object.entries(LOOK)) {
      if (look.lit === undefined) continue;
      expect(INK[look.lit], `${k}.lit names "${look.lit}"`).toBeDefined();
      expect(look.lit).not.toBe(look.fill);
      expect(apart(INK[look.lit], INK[look.fill]),
        `${k} lit and unlit are only ${apart(INK[look.lit], INK[look.fill])} apart`)
        .toBeGreaterThan(TOL.dot!);
    }
  });
});
