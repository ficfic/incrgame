import { describe, it, expect } from 'vitest';
import { INK, type InkName } from '../src/game/ink';

// ---------------------------------------------------------------------------
// ★★★ THE PALETTE, MEASURED — 2026-08-10. The owner's playtest said only *"the
// colors are also a little bit strange"*, which is not something a person can
// act on directly. So the vague complaint was turned into two things a NUMBER
// can settle, and those numbers are now guarded:
//
//   1. anything carrying meaning must clear the WCAG floor for a graphic on
//      the parchment it is drawn on;
//   2. two inks that mean OPPOSITE things must survive colour blindness —
//      about one man in twelve cannot separate red from green, and this board
//      leans on green for "yours" and red for "theirs".
//
// ⚠️ These are the objective half of the complaint. Whatever the owner meant
// beyond it is still open, and taste is not testable — but this half will not
// regress silently again.
// ---------------------------------------------------------------------------
const rgb = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (h: string): number => {
  const [r, g, b] = rgb(h).map(lin) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m) as [number, number];
  return (x + 0.05) / (y + 0.05);
};
/** Linear deuteranope / protanope approximations — enough to catch a collapse. */
const sim = (h: string, k: 'deut' | 'prot'): number[] => {
  const [r, g, b] = rgb(h) as [number, number, number];
  return k === 'deut'
    ? [0.625 * r + 0.375 * g, 0.7 * r + 0.3 * g, 0.3 * g + 0.7 * b]
    : [0.567 * r + 0.433 * g, 0.558 * r + 0.442 * g, 0.242 * g + 0.758 * b];
};
const apart = (a: number[], b: number[]): number =>
  Math.max(...a.map((v, i) => Math.abs(v - b[i]!)));
/** The worse of the two kinds — a colour must survive both. */
const blind = (a: InkName, b: InkName): number => Math.min(
  apart(sim(INK[a], 'deut'), sim(INK[b], 'deut')),
  apart(sim(INK[a], 'prot'), sim(INK[b], 'prot')));

describe('★★★ THE PALETTE IS MEASURED, not felt', () => {
  it('★★ every ink that carries a WARNING clears the graphic contrast floor', () => {
    // 3.0 is WCAG's floor for a graphical object. `shut` — the choke — sat at
    // 2.90 until this was written: a warning you had to hunt for.
    for (const k of ['shut', 'foe', 'you', 'barred'] as const) {
      expect(contrast(INK[k], INK.back), `${k} on the parchment`).toBeGreaterThan(3);
    }
  });

  it('★★ the states a player must tell apart clear it too', () => {
    for (const k of ['open', 'known', 'route', 'casing', 'fill', 'ward'] as const) {
      expect(contrast(INK[k], INK.back), `${k} on the parchment`).toBeGreaterThan(3);
    }
  });

  it('★★★ INKS THAT MEAN OPPOSITE THINGS SURVIVE COLOUR BLINDNESS', () => {
    // The board leans on green for "yours" and red for "theirs", which is the
    // one pairing about one man in twelve cannot make. Each pair below is two
    // things a player has to tell apart to play at all.
    const pairs: Array<[InkName, InkName, string]> = [
      ['open', 'foe', 'a site you can work vs one held against you'],
      ['open', 'shut', 'a road you can lay vs one you cannot'],
      ['foe', 'shut', 'danger vs a choke'],
      ['route', 'fill', 'a finished road vs one being dug'],
      // ⚠️ WARD/ROUTE RETIRED FROM THIS LIST, 2026-08-11. The barrier ring was
      // deleted from the board the day before — the owner: *"so barrier
      // doesn't serve any function"* — so these two inks can no longer appear
      // on the same screen, and holding a road hostage to a shape nobody
      // draws is how a guard turns into a nuisance. `ward` is still an ink
      // (the scenes use it); if anything ever draws it on the board again,
      // put this line back.
      ['foe', 'you', 'their ground vs where you stand'],
    ];
    for (const [a, b, why] of pairs) {
      expect(blind(a, b), `${a}/${b} — ${why}`).toBeGreaterThan(30);
    }
  });

  it('★ the parchment itself is not a meaning-bearing ink', () => {
    // `flowing` is drawn OVER the road, never on bare ground, so its 1.06
    // against the parchment is not a defect. Recorded so a future audit does
    // not "fix" a colour that is correct.
    expect(contrast(INK.flowing, INK.route)).toBeGreaterThan(2);
  });
});
