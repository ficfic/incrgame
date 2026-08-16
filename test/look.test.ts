// THE LOOK HOLDS TOGETHER — one palette, one type scale, one set of corners.
//
// ⚠️ THIS IS THE SAME GUARD `src/game/ink.ts` IS, one layer out, and it exists
// for the same reason: the BOARD has had a measured palette since 2026-08-02,
// and the chrome around it grew thirty-three unnamed hex values by accretion —
// four of them duplicates a person cannot tell apart, and a red belonging to no
// map ink at all. A colour or a size typed straight into a stylesheet is a
// colour or a size that will drift, and nothing will notice.
//
// So: the tokens live in `PAPER` and are written onto `:root` at runtime, and
// the stylesheet may name NOTHING directly. If this test is in your way, the
// answer is a new token with a name saying what it is FOR — never a hex.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PAPER, INK } from '../src/game/ink';

const camp = readFileSync(new URL('../src/ui/Camp.svelte', import.meta.url), 'utf8');
const style = camp.slice(camp.indexOf('<style>'));

describe('★★★ THE CHROME IS ONE SYSTEM', () => {
  it('★★★ no colour is typed into the stylesheet', () => {
    // ⚠️ COMMENTS ARE STRIPPED FIRST. This file is dense with them and a
    // future note quoting an old hex ("it was #b3452f") must not fail the
    // build — the rule is about what the browser paints, not what we wrote
    // down. A purity grep that matched a word inside a comment is a mistake
    // this repo has already made once.
    const css = style.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css.match(/#[0-9a-fA-F]{3,8}\b/g)).toBeNull();
    // rgb()/hsl() are the same offence wearing a different hat.
    expect(css.match(/\b(?:rgba?|hsla?)\(\s*\d/g)).toBeNull();
  });

  it('★★★ no bare pixel font size — eight steps, and they are the scale', () => {
    const css = style.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(css.match(/font-size:\s*[0-9.]+px/g)).toBeNull();
    // ⚠️ AND THE SCALE IS ACTUALLY EIGHT. `--t9` would mean someone needed a
    // ninth size, which is the nudging this replaced starting over.
    const used = new Set(css.match(/var\(--t\d+\)/g) ?? []);
    for (const v of used) {
      const n = Number(v.match(/\d+/)![0]);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(8);
    }
  });

  it('★★ every token the stylesheet asks for is one the palette defines', () => {
    // The other half of the drift: `var(--rustish)` fails silently in CSS —
    // the property is simply unset and the colour falls back to inherited.
    // A typo would look almost right and never throw.
    const asked = new Set((style.match(/var\(--([a-zA-Z][\w-]*)\)/g) ?? [])
      .map((v) => v.slice(6, -1)));
    const have = new Set([...Object.keys(PAPER), 'r1', 'r2',
      ...Array.from({ length: 8 }, (_, i) => `t${i + 1}`)]);
    for (const name of asked) expect(have).toContain(name);
  });

  it('★★ the chrome and the board share their greens, not merely resemble them', () => {
    // ⚠️ THE POINT OF THE WHOLE PASS. `--moss` means "yes, made, ours" in the
    // furniture and `INK.open` means "a road you can lay" on the map. They
    // are the same idea and must be the same value, or the game says one
    // thing in two greens and looks like two products.
    expect(PAPER.moss).toBe(INK.open);
  });

  it('★ a mark is never printed beside the noun it stands for', () => {
    // The owner's own rule, read the other way (2026-08-15): an emoji is a
    // decoration on a word, so a cell CAPTIONED `FOOD` must not then say
    // `🌾−0.1/s` underneath it. The HUD's rate carries no mark.
    expect(camp).toContain('<em>{g.note}</em>');
    expect(camp).not.toContain('<em>{g.mark}{g.note}</em>');
  });
});
