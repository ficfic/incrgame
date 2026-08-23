// ★★★ ONE WORD, ONE QUANTITY — and this time the check has a subject.
//
// ⚠️ THE PREVIOUS ONE DID NOT. `check-vocabulary.mjs` read `src/core/readouts.ts`
// — the pre-pivot game — and reported happily on words that were referenced by
// nothing shipped; `the-process` proved it vacuous by printing two nouns for
// one quantity into the live HUD and getting exit 0. It was deleted, and this
// exists because deleting a rule's only enforcement is not the same as the rule
// going away.
//
// It reads `src/delve/words.ts` — where the delve's vocabulary now lives, in
// one place — and the screen that shows it. Three things must hold:
//
//   1. THE MAP IS A BIJECTION. No word names two quantities.
//   2. EVERY WORD IS ACTUALLY ON THE SCREEN. A vocabulary nobody renders is a
//      list, not a rule — which is exactly how the last one died.
//   3. NO SYNONYM APPEARS ANYWHERE IN THE DELVE'S UI. "gold" beside "banked"
//      is one pile with two names, and the player has to work out that it is.
//
// SABOTAGE, all three recorded in the commit that added this:
//   · point two quantities at one word          → bijection fails
//   · delete a word from the screen             → "never reaches the screen"
//   · write "gold" into the shop                → synonym fails, naming `hoard`
//
// `node scripts/check-vocab.mjs`. Exit 1 on any of them.
import { readFileSync } from 'node:fs';

const SCREEN = ['src/ui/Delve.svelte', 'src/delve/records.ts',
  'src/delve/relics.ts', 'src/delve/engine.ts'];

const src = readFileSync('src/delve/words.ts', 'utf8');
// ⚠️ `} as const;` IS ALSO A CLOSING BRACE. Looking only for `};` ran the WORDS
// map straight on into the SYNONYM map below it, so every synonym was read as a
// quantity — and the bijection then reported "hoard names both gold and coins"
// as a violation of the rule it exists to state.
const grab = (name) => {
  const body = src.slice(src.indexOf(`export const ${name}`));
  const open = body.indexOf('{');
  const ends = [body.indexOf('} as const;'), body.indexOf('};')].filter((i) => i > 0);
  return body.slice(open + 1, Math.min(...ends));
};
const pairs = (body) => [...body.matchAll(/^\s*([A-Za-z]+):\s*'([^']+)'/gm)]
  .map((m) => [m[1], m[2]]);

const words = pairs(grab('WORDS'));
const instead = pairs(grab('INSTEAD'));
const say = new Map(words);
const bad = [];

// 1 ── a bijection. ⚠️ OVER `WORDS` ONLY. The first draft ran this over the
// SYNONYM map too, which is `word -> the quantity it collides with` and is
// therefore many-to-one BY DESIGN — it reported "hoard names both gold and
// coins" as a violation of the rule it exists to state.
const byWord = new Map();
for (const [q, w] of words) {
  if (byWord.has(w)) bad.push(`"${w}" names both ${byWord.get(w)} and ${q} — one word, one quantity`);
  byWord.set(w, q);
}

/** ★★★ WHAT A PLAYER ACTUALLY READS, and nothing else.
 *
 *  ⚠️ THE RULE IS ABOUT WORDS ON A SCREEN, NOT IDENTIFIERS. The first draft
 *  searched raw source and flagged `g.hp`, `stepToward`, `Math.round` and a
 *  variable called `mapped` — eight false positives, every one of them code
 *  the player will never see. A guard that cries about field names is a guard
 *  everybody turns off. So: comments stripped, then STRING LITERALS and
 *  SVELTE TEXT NODES only. */
const readable = (text, isSvelte) => {
  const noComments = text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ');
  const out = [];
  // ⚠️ NOT ATTRIBUTE VALUES. `class="tick"` is a CSS hook, not a word anybody
  // reads, and matching it reported the panel for saying "tick" to the player.
  const noAttrs = noComments.replace(/\b(class|style|id|href|d|viewBox|aria-[a-z]+)=("[^"]*"|'[^']*')/g,
    (s) => ' '.repeat(s.length));
  for (const m of noAttrs.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) {
    // ⚠️ AND NOT WHAT IS INSIDE `${...}`. That is code in the middle of a
    // string — `${CRAWL_HP + BRACE_HP}` was reported as the shop saying "hp"
    // to the player, when what the player reads there is a number.
    out.push({ text: (m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' '), at: m.index });
  }
  if (isSvelte) {
    // And the markup's own text, outside <script> and outside tags.
    const body = noComments.replace(/<script[\s\S]*?<\/script>/g, (s) => ' '.repeat(s.length))
      .replace(/<style[\s\S]*?<\/style>/g, (s) => ' '.repeat(s.length));
    for (const m of body.matchAll(/>([^<>{}]+)</g)) out.push({ text: m[1], at: m.index });
  }
  return out.map((p) => ({ ...p, line: noComments.slice(0, p.at).split('\n').length }));
};

// 2 ── every word actually reaches the screen.
const shown = SCREEN.flatMap((f) => readable(readFileSync(f, 'utf8'), f.endsWith('.svelte')))
  .map((p) => p.text).join('\n');
for (const [q, w] of words) {
  if (!shown.includes(w)) bad.push(`${q} is called "${w}" and that word never reaches the screen`);
}

// 3 ── and no synonym does.
for (const f of SCREEN) {
  for (const piece of readable(readFileSync(f, 'utf8'), f.endsWith('.svelte'))) {
    for (const [word, collides] of instead) {
      if (new RegExp(`(^|[^A-Za-z])${word}([^A-Za-z]|$)`, 'i').test(piece.text)) {
        // ★ THE OFFENDING TEXT, not just a line. A guard that reports only a
        // number makes its own false positives impossible to see.
        bad.push(`${f}:${piece.line} says "${word}" to the player — this game `
          + `calls that "${say.get(collides)}"\n      ${piece.text.trim().slice(0, 70)}`);
      }
    }
  }
}

if (bad.length) {
  console.error('\n✗ one word, one quantity:\n');
  for (const b of bad) console.error(`  ${b}`);
  console.error('\n  The vocabulary lives in src/delve/words.ts.\n');
  process.exit(1);
}
console.log(`✓ ${words.length} quantities, ${byWord.size} words, `
  + `${instead.length} synonyms kept off ${SCREEN.length} screens`);
