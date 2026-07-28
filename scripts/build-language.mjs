#!/usr/bin/env node
/* build-language.mjs — the rest of the language, and the concepts you wake up holding.
 *
 * WHY THIS EXISTS
 * ---------------
 * Owner, 2026-07-27, looking at a build: "i don't need it to show the player
 * any labels… like it's speaking foreign language… there must be nothing even
 * in GUI… let's scrap the entire UI and let player eyeball the graph."
 *
 * Until now only CONCEPT nouns were foreign (scripts/build-lexicon.mjs) and
 * every carrier word around them was English: "Take the ⟦ka-sa⟧ side". That is
 * masked English, not a language. This generates the other 245 word types —
 * the verbs, prepositions and function words used across every frame and beat —
 * so a whole sentence can be foreign and become English one word at a time.
 *
 * WHAT THIS VOIDS, on record so it is not re-derived:
 * docs/VOICE.md section 4 said stakes must live in the verb and never the noun,
 * so a sentence would survive its concepts being masked. check-story.mjs failed
 * any body more than half maskable for the same reason. Both assumed an English
 * carrier. With the carrier foreign too, neither rule means anything, and the
 * span-ratio check is removed rather than left to pass vacuously.
 *
 * FUNCTION WORDS SOUND DIFFERENT FROM CONCEPTS, deliberately. Concepts are
 * multi-syllable and hyphenated with an inherited stem (`ka-ta-ra`); function
 * words are short, single, unhyphenated (`vos`, `iren`). So a player can tell
 * grammar from content by shape long before they can read either — which is
 * what makes an unreadable sentence still look like a sentence.
 *
 * HOW A PLAYER LEARNS THEM. Not by discovering concepts — by FREQUENCY. `the`
 * and `is` appear in almost every beat, so they resolve themselves by
 * repetition and context. That is how language learning actually feels, and it
 * is why no mechanic is needed to teach them.
 *
 * THE SEED. The player does not start at `entity`. They start holding a few
 * mid-graph concepts, chosen because they have somewhere to go, sit on the
 * cross-link labyrinth, and are strange enough to be worth looking at. They are
 * VISIBLE, not BOUND: the nodes are on screen, the words are not yet readable.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs/graph/language.json');

/* Chosen from 108 candidates that are mid-graph (depth 2-3), have children, and
 * carry at least two cross-links. These five are real WordNet concepts that
 * happen to be this game's own subject matter — an opening about `system`,
 * `agent`, `language`, `information` and `power` is the satire stating itself
 * without a word of authored prose. */
const SEED = ['system', 'agent', 'language', 'information', 'power'];

// Phonology: short and unhyphenated, so function words never look like the
// multi-syllable hyphenated concept words. No clusters, no q/x/j/w.
const C1 = ['v', 'r', 'l', 'm', 'n', 's', 't', 'k', 'th', 'sh', 'f', 'h'];
const V = ['a', 'e', 'i', 'o', 'u'];
const C2 = ['', 'n', 's', 'r', 'l', 'th'];

const FRAMES = JSON.parse(readFileSync(join(ROOT, 'docs/graph/frames.json'), 'utf8'));
const PROSE = JSON.parse(readFileSync(join(ROOT, 'docs/graph/prose.json'), 'utf8'));

// Every word we actually use, outside the concept spans — those already have
// words from build-lexicon.mjs.
const texts = [];
for (const [k, v] of Object.entries(FRAMES)) {
  if (k === '_') continue;
  for (const f of ['title', 'body', 'label']) if (v[f]) texts.push(v[f]);
}
for (const [k, v] of Object.entries(PROSE)) {
  if (k === '_') continue;
  texts.push(v.title ?? '', v.body ?? '', ...Object.values(v.choices ?? {}));
}
const bare = texts.join(' ').replace(/⟦[^⟧]+⟧/g, ' ');
const types = [...new Set((bare.toLowerCase().match(/[a-z']+/g) ?? []))].sort();

/** Frequency decides length: the commonest words are shortest, which is true of
 *  every natural language and makes the high-frequency words — the ones a
 *  player learns first by repetition — the easiest to hold in mind. */
const freq = new Map();
for (const w of bare.toLowerCase().match(/[a-z']+/g) ?? []) freq.set(w, (freq.get(w) ?? 0) + 1);
const byFreq = [...types].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || (a < b ? -1 : 1));

/* A generated form must not BE an English word. The first run produced `to` for
 * "follow" and `hi`, `ma`, `se` for others: a player reading "to va ka-ta"
 * cannot tell the foreign `to` from the English "to" they already know, so the
 * sentence reads as half-translated when none of it is. Rejecting our own
 * corpus is not enough — the form has to avoid short English generally. */
const ENGLISH = new Set([
  ...types,
  'am', 'an', 'as', 'at', 'ax', 'be', 'by', 'do', 'go', 'he', 'hi', 'id', 'if', 'in', 'is', 'it',
  'la', 'lo', 'ma', 'me', 'mi', 'my', 'no', 'of', 'oh', 'ok', 'on', 'or', 'ox', 'pa', 're', 'so',
  'ti', 'to', 'up', 'us', 'we', 'ye', 'fa', 'ha', 'hu', 'nu', 'se', 'sh', 'ta', 'va',
  'and', 'are', 'but', 'can', 'far', 'few', 'for', 'had', 'has', 'her', 'him', 'his', 'how',
  'its', 'let', 'low', 'man', 'may', 'new', 'nor', 'not', 'now', 'off', 'old', 'one', 'our',
  'out', 'own', 'run', 'sat', 'see', 'she', 'sit', 'six', 'ten', 'the', 'too', 'top', 'try',
  'two', 'use', 'was', 'way', 'who', 'why', 'you', 'yes', 'yet', 'sun', 'son', 'ton', 'tin',
  'ran', 'ram', 'rat', 'red', 'rot', 'row', 'raw', 'man', 'men', 'mat', 'met', 'net', 'nut',
  'lot', 'let', 'lit', 'lie', 'sir', 'set', 'sun', 'kin', 'kit', 'fan', 'fin', 'fun', 'fit',
  'hat', 'hit', 'hot', 'her', 'his', 'van', 'vat', 'vet', 'thin', 'than', 'then', 'this',
  'that', 'them', 'thus', 'shot', 'shut', 'ship', 'shin',
]);

const words = {};
const taken = new Set();
byFreq.forEach((w, rank) => {
  /* The single-syllable space is C1 x V x C2 = 360 forms and the English
   * blocklist eats a large part of it. At 245 word types that was comfortable;
   * adding 26 beats took the corpus to 338 and the salt loop span forever
   * looking for a form that did not exist. Rare words now fall back to two
   * syllables, which is also the right shape - commonest words stay shortest
   * and only the tail grows. */
  const syl = (n, coda) =>
    C1[n % C1.length] +
    V[Math.floor(n / C1.length) % V.length] +
    (coda ? C2[Math.floor(n / (C1.length * V.length)) % C2.length] : '');

  for (let salt = 0; salt < 60; salt++) {
    const cand = syl(rank * 7 + salt * 331, !(rank < 30 && salt === 0));
    if (!taken.has(cand) && !ENGLISH.has(cand)) { taken.add(cand); words[w] = cand; return; }
  }
  for (let salt = 0; salt < 5000; salt++) {
    const cand = syl(rank * 7 + salt * 331, true) + syl(rank * 13 + salt * 97, false);
    if (!taken.has(cand) && !ENGLISH.has(cand)) { taken.add(cand); words[w] = cand; return; }
  }
  throw new Error('no free form for ' + w + ' - widen the phonology');
});

const collisions = types.length - new Set(Object.values(words)).size;

console.log(`function-word types .. ${types.length}`);
console.log(`distinct words ....... ${new Set(Object.values(words)).size}`);
console.log(`collisions ........... ${collisions}`);
console.log(`\nthe twenty commonest, which a player learns first by repetition:`);
for (const w of byFreq.slice(0, 20)) console.log(`  ${words[w].padEnd(6)} ${w}  (${freq.get(w)}x)`);
console.log(`\nseed concepts (visible, not yet readable): ${SEED.join(', ')}`);

if (collisions) {
  console.error('\nFAIL: two function words share a form — indistinguishable to the player.');
  process.exit(1);
}

writeFileSync(
  OUT,
  JSON.stringify({
    generatedBy: 'scripts/build-language.mjs',
    note: 'Function words and verbs. Concepts have their own words in lexicon.json, generated separately and shaped differently on purpose.',
    seed: SEED,
    counts: { types: types.length },
    words,
  }, null, 1) + '\n',
);
console.log(`\nwrote ${OUT}`);
