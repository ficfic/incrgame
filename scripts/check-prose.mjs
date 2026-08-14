#!/usr/bin/env node
// ★★★ THE PROSE GATE — 2026-08-11. The owner: *"can we do something about our
// AI writing, please review wikipedia article and also my complaints about not
// understanding and then do something."*
//
// Checked against the real thing: en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing,
// the field guide Wikipedia editors use to spot undisclosed machine text. The
// rules below are ITS taxonomy, not my guess at it.
//
// Measured against this repo, the top tell was unmissable: TWELVE EM DASHES
// PER THOUSAND WORDS in engine.ts, in the player's face — "goblins hold this
// place — 12 strong", "the hero heals — 8 of 16".
//
// ⚠️ AND THE ARTICLE NAMES THIS MODEL SPECIFICALLY: "A July 2026 study found
// that of contemporary models only Claude used em dashes more than
// professional writers, and ChatGPT used them less." So this is not a general
// hygiene rule. It is a gate on a habit that is measurably mine, in a repo
// whose entire premise mocks machine slop.
//
// It is also a legibility problem, which is the half the owner actually
// feels: an em dash hides where one fact ends and the next begins.
//
// This gate covers PLAYER-FACING TEXT ONLY. Code comments are for the next
// session and may ramble; a refusal has one job and four seconds to do it.
//
// ⚠️ VERIFY IT GOES RED. Put an em dash back in any refusal and run this.
import { readFileSync } from 'node:fs';

const src = readFileSync('src/camp/engine.ts', 'utf8');
const ui = readFileSync('src/ui/Camp.svelte', 'utf8');

/** Strings a player actually reads: refusals, boons, meetings, log lines. */
const strings = [];
const push = (re, text, what) => {
  for (const m of text.matchAll(re)) strings.push({ s: m[1], what });
};
push(/return\s+'([A-Za-z][^']{4,})'/g, src, 'refusal');
push(/return\s+`([^`]{4,})`/g, src, 'refusal');
push(/(?:what|text|take|said|tell):\s*'([^']{6,})'/g, src, 'content');
push(/(?:what|text|take|said|tell):\s*`([^`]{6,})`/g, src, 'content');
push(/said\.push\(`([^`]{6,})`\)/g, src, 'log line');
push(/logged\([^,]+,\s*`([^`]{6,})`/g, src, 'log line');

const bad = [];
for (const { s, what } of strings) {
  // Skip pure interpolation and the code-shaped leftovers.
  if (/^\$\{/.test(s) || s.includes('=>') || s.includes('??')) continue;

  // 1. THE EM DASH. The single most-cited sign of machine writing, and a
  //    genuine legibility problem: it blurs where one fact ends.
  if (s.includes('—')) bad.push([what, s, 'em dash — use a full stop']);

  // 2. NEGATIVE PARALLELISM. The article gives three subtypes and we ban all
  //    three: "not just X, but also Y", "not X, but Y", and "X rather than Y".
  //    They read as a correction to a misconception the player never had.
  if (/\bnot (just|only)\b[^.!?]{0,50}\b(but|but also)\b/i.test(s)
    || /\b(not|never)\b[^.!?]{0,40},\s*(but|just|rather|it'?s)\b/i.test(s)
    || /\brather than\b/i.test(s)) {
    bad.push([what, s, 'negative parallelism (Wikipedia: "not X, but Y")']);
  }

  // 3. AI VOCABULARY, from the article's own watch-list. Kept to the words a
  //    game could plausibly reach for; the medical-abstract ones are noise
  //    here. One is a coincidence, which is why this fires on any single use
  //    in PLAYER text only — four seconds of reading has no room for them.
  if (/\b(delve|showcase|showcasing|underscore|underscores|pivotal|crucial|vibrant|testament|tapestry|intricate|meticulous|seamless|robust|foster|fostering|enhance|leverage|myriad|boasts|garner|landscape of)\b/i.test(s)) {
    bad.push([what, s, 'AI vocabulary (Wikipedia watch-list)']);
  }

  // 4. COPULA AVOIDANCE. The article: LLMs replace "is" with "serves as",
  //    "stands as", "marks", "features". A refusal should just say what IS.
  if (/\b(serves as|stands as|marks the|represents a|features a)\b/i.test(s)) {
    bad.push([what, s, 'copula avoidance (say "is")']);
  }

  // 5. A REFUSAL IS A SENTENCE. Lower-case fragments were the old house
  //    style and the owner could not tell a refusal from a price.
  if (what === 'refusal' && /^[a-z]/.test(s) && !s.startsWith('${')) {
    bad.push([what, s, 'starts lower-case — a refusal is a sentence']);
  }

  // 6. LENGTH. Anything a player reads mid-decision has four seconds.
  const words = s.replace(/\$\{[^}]*\}/g, 'N').split(/\s+/).length;
  if (what === 'refusal' && words > 14) {
    bad.push([what, s, `${words} words — a refusal gets 14`]);
  }
}

console.log(`prose gate: ${strings.length} player-facing strings checked`);
if (bad.length > 0) {
  console.log('\n⚠️ PROBLEMS');
  for (const [what, s, why] of bad) {
    console.log(`  [${what}] ${why}\n      "${s.slice(0, 76)}"`);
  }
  process.exit(1);
}
console.log('all plain — no em dashes, no sales parallelism, refusals are sentences');
