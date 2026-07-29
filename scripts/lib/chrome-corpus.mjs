/* chrome-corpus.mjs — the English the INTERFACE and the TICKER can put on screen.
 *
 * WHY THIS EXISTS
 * ---------------
 * `docs/graph/language.json` used to be generated from `frames.json` and
 * `prose.json` alone — the beats. Every other surface was invisible to it, so
 * any word the ticker or the chrome used and no beat happened to use had NO
 * foreign form, and `literacy.canRead` returns TRUE by default for a word with
 * nothing to hide it behind. The result is a screen whose premise is that
 * nothing is readable yet, showing "something you never checked wore out" in
 * plain English.
 *
 * That exact failure has already happened once inside the beats: 26 new beats
 * introduced `talking`, `covers`, `separates` and `feature`, and all four were
 * readable from the first frame. check-story.mjs sabotage I is the gate that
 * caught it. This module is what lets the same gate see the other surfaces.
 *
 * ONE EXTRACTOR, TWO CALLERS. build-language.mjs generates FROM this and
 * check-story.mjs validates AGAINST it, so the generator and the gate cannot
 * disagree about what the corpus is. The gate then goes red on exactly the
 * condition that matters: a source string changed and nobody regenerated.
 *
 * ---- WHY IT OVER-EXTRACTS, ON PURPOSE ------------------------------------
 *
 * The rule below is deliberately crude: strip comments and imports, then take
 * every string literal, plus (for .svelte) the markup's text nodes. It picks up
 * things no player will ever read — `flex-grow`, `noopener`, an id like
 * `away-return`.
 *
 * That is the safe direction and the choice is made knowingly. A word too many
 * costs ONE unused entry in a JSON file. A word too few renders as English on a
 * surface built to be unreadable, and — worse — does it silently, because the
 * default for an unknown word is "show it". Precision here would mean a curated
 * list of which strings count, and a curated list drifts from the code the
 * moment another session edits `App.svelte`; this cannot, because it reads the
 * file itself and its own author does not own that file.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

/** Files that can put English in front of the player.
 *
 *  The ticker is here for its OWNER_LINES too: that is where the owner writes
 *  flavour, and a line written without regenerating the language would be a
 *  fresh English leak the day after this shipped. */
export const CHROME_SOURCES = [
  'src/shell/ticker.ts',     // every ticker line, mechanical and owner-written
  'src/core/readouts.ts',    // Words · Solid · Raw · Rot, and each one's explain
  'src/content/machines.ts', // Extractor · Reasoner · Checker
  // ⚠️ `src/ui/App.svelte` WAS HERE AND CAME OUT ON 2026-07-29, WITH ITS REASON.
  // It was added the day the HUD spoke the graph's language, and the owner
  // reversed exactly that after playing the build: "i think we wont be able to
  // do it without english narrator or something… i dont understand what ANY of
  // the buttons do." DECISIONS 2026-07-29 settles it — the interface, the
  // buttons, the readouts, the narrator and the notifications are ENGLISH; the
  // foreign language is only ever the GRAPH's. So the screen no longer calls
  // `renderMasked` on a single interface string, and demanding a foreign form
  // for `quantity` or `unread` would be this gate policing a rule the game no
  // longer has.
  //
  // The three files above STAY, and the distinction is not arbitrary:
  // `readouts.ts` and `machines.ts` are read by surfaces that DO still mask
  // (the ticker), and the ticker is still emitting. The moment anything renders
  // one of them through the masker again, its words must already have forms.
];

/** Block and line comments, and import specifiers.
 *
 *  Comments are prose ABOUT the game and this repo writes a great deal of it;
 *  none of it reaches a player. Import paths are the other systematic false
 *  positive — `svelte/store` would otherwise put `svelte` in the language. */
function stripNoise(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^\s*import[\s\S]*?from\s*['"][^'"]*['"];?/gm, ' ')
    .replace(/^\s*import\s*['"][^'"]*['"];?/gm, ' ');
}

/** Every string literal: single-quoted, double-quoted, and the static text of a
 *  template literal. `${...}` holes are dropped — what is in them is a number or
 *  a noun that comes from `readouts.ts`, and both are extracted from their own
 *  source rather than guessed at here. */
function literals(src) {
  const out = [];
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) out.push(m[1]);
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) out.push(m[1]);
  for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) out.push(m[1].replace(/\$\{[^}]*\}/g, ' '));
  return out;
}

/** Remove `{…}` expressions, counting braces, so a nested one goes with it.
 *  Their string contents are harvested first — this only clears the code. */
function stripExpressions(markup) {
  let out = '';
  let depth = 0;
  for (const ch of markup) {
    if (ch === '{') depth++;
    else if (ch === '}') { if (depth > 0) depth--; out += ' '; }
    else if (depth === 0) out += ch;
  }
  return out;
}

/** Svelte markup.
 *
 *  Three things a player reads, and one they do not:
 *   · TEXT BETWEEN TAGS — `<b>Check</b>` puts no quotes around the most visible
 *     verb in the game, so a literals-only pass would miss it entirely.
 *   · STRINGS INSIDE `{…}` — the price line, the lane lock, `+N more ways on`.
 *   · aria-label / title — read aloud, and shown on hover. Player-facing.
 *   · every OTHER double-quoted attribute is `class="lane dotted"` or
 *     `style="flex-grow:…"`. Those are the one category of noise big enough to
 *     be worth excluding by name: they would have put `flex`, `px` and `glyph`
 *     in the language, and unlike a stray id they arrive in bulk. */
function svelteMarkup(src) {
  const body = src.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const out = [];
  for (const m of body.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) out.push(m[1]);
  for (const m of body.matchAll(/`((?:[^`\\]|\\.)*)`/g)) out.push(m[1].replace(/\$\{[^}]*\}/g, ' '));
  // ⚠️ AN ATTRIBUTE INTERPOLATES TOO. `aria-label="{wordsCount.floor().toString()}
  // of {RETRAIN_MIN_WORDS}"` put `wordscount`, `floor` and `tostring` into the
  // corpus as if they were English, and invariant 6 then demanded foreign forms
  // for three method names. Expressions go here for the same reason they go in
  // the markup: their CONTENTS come from another file.
  for (const m of body.matchAll(/(?:aria-label|title|placeholder)="([^"]*)"/g)) {
    out.push(stripExpressions(m[1]));
  }
  out.push(stripExpressions(body).replace(/<[^>]*>/g, ' '));
  return out;
}

/** The chrome corpus as raw text fragments, in file order. */
export function chromeTexts() {
  const out = [];
  for (const rel of CHROME_SOURCES) {
    const raw = stripNoise(readFileSync(join(ROOT, rel), 'utf8'));
    if (rel.endsWith('.svelte')) {
      const script = raw.match(/<script[\s\S]*?<\/script>/)?.[0] ?? '';
      out.push(...literals(script), ...svelteMarkup(raw));
    } else {
      out.push(...literals(raw));
    }
  }
  return out;
}

/** Template literals that glue letters straight onto a `${…}` hole.
 *
 * THIS IS A REAL LEAK, CAUGHT IN play.png ON 2026-07-28, not a hypothetical.
 * The ticker read `${MACHINES[id].label}s watched · slower, and checked`, so
 * the dock showed "Extractors" in plain English between two foreign words. The
 * corpus never sees it: a hole's contents come from another file (`Extractor`,
 * via machines.ts) and the suffix is a bare `s`, so `extractors` is a word that
 * exists only at runtime. It has no form, and a word with no form is SHOWN.
 *
 * Everything else about this module fails safe — over-extract, ship a spare
 * entry. This is the one construction that fails the other way, silently, with
 * the gate green, which is exactly the shape of defect the gate exists for.
 *
 * `${…}` and not `{…}`: Svelte's own `style="width:{w}px"` is the same shape and
 * is not player-facing text, and keying on the dollar excludes it exactly.
 */
export function gluedInterpolations() {
  const out = [];
  for (const rel of CHROME_SOURCES) {
    const src = stripNoise(readFileSync(join(ROOT, rel), 'utf8'));
    for (const lit of src.matchAll(/`(?:[^`\\]|\\.)*`/g)) {
      for (const m of lit[0].matchAll(/\$\{[^}]*\}([A-Za-z][A-Za-z'-]*)/g)) {
        out.push({ file: rel, suffix: m[1], where: lit[0].slice(0, 72) });
      }
    }
  }
  return out;
}

/* ---- THE TICKER, ON ITS OWN, BECAUSE ITS ONLY WAY IN IS FREQUENCY ---------
 *
 * The HUD has two ways to make a word readable: frequency, and a readout's
 * `learned` witness (`chrome(text, earned)` in App.svelte). The dock had one.
 * It is not a beat, so standing in it teaches nothing, and a ticker word that
 * no beat contains can never reach LEARN_AT however far a player walks.
 *
 * PROSE HAS SPACES; TRIGGER IDS DO NOT. `'away-return'`, `'bottleneck:words'`
 * and `'words'` are keys, never shown, and every one of them is a single token.
 * Every line a player reads is a sentence. That is the whole rule, and it needs
 * no list to maintain — which matters, because a list is what drifts.
 *
 * `${…}` holes are dropped for the reason they are dropped everywhere else:
 * what is in them comes from `readouts.ts` or `machines.ts`, which have their
 * own way in and their own source. */
export function tickerProse() {
  const src = stripNoise(readFileSync(join(ROOT, 'src/shell/ticker.ts'), 'utf8'));
  const out = [];
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) out.push(m[1]);
  for (const m of src.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) out.push(m[1]);
  // ⚠️ HOLES CLOSE UP HERE, they do not become a space. `chromeTexts` drops
  // them to ' ' so two statics never fuse into a word; that is right there and
  // wrong here, because it turns the trigger id `buy:${id}:${after}` into
  // "buy: : " — a string with a space in it, which this function would then
  // read as a sentence and demand the beats teach the word `buy`.
  for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/g)) out.push(m[1].replace(/\$\{[^}]*\}/g, ''));
  return out.filter((s) => /\S\s+\S/.test(s));
}

/** The words the ticker shows that ride on a readout's `learned` witness.
 *
 *  Parsed from `EARNED_WITH` in src/shell/ticker.ts — the SAME table that grants
 *  them, so an entry cannot exempt a word from the gate without also giving the
 *  player a way to read it. */
export function tickerExemptions() {
  const src = stripNoise(readFileSync(join(ROOT, 'src/shell/ticker.ts'), 'utf8'));
  const block = /const EARNED_WITH[^=]*=\s*\{([\s\S]*?)\}/.exec(src);
  if (!block) throw new Error('EARNED_WITH not found in src/shell/ticker.ts');
  return new Set([...block[1].matchAll(/([A-Za-z][A-Za-z'-]*)\s*:/g)].map((m) => m[1].toLowerCase()));
}

/** Lowercased word types the chrome can show. */
export function chromeWords() {
  return (chromeTexts().join(' ').toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => w !== "'");
}
