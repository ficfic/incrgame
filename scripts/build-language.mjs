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
 *
 * ── RULE 4 EVIDENCE: the no-English-forms guard, confirmed RED both ways ─────
 *
 * Sabotage Q1 - drop `...DATASET` from the blocklist, keeping the hand list.
 * The assertion reads DATASET directly rather than the blocklist, so it does
 * not disarm with the thing it is guarding. Observed:
 *   English types blocked  688 (dataset labels + glosses)
 *   forms that are English  11 — kith(=the), ne(=hold), ren(=field),
 *     hen(=closed), mer(=loose), ro(=continues), non(=divides), sur(=happen),
 *     sin(=stopped), res(=faster), sos(=inferred)
 *   FAIL: a foreign word that is an English word reads as a leak, not a language.
 *   exit 1
 * Q1 is a REGRESSION TEST. Those eleven are what shipped, and `kith` is the word
 * for `the` — the single most frequent word in the game.
 *
 * Sabotage Q2 - drop the hand list, keeping the dataset. No FAIL, because the
 * assertion covers the dataset half only; the damage is in the output and that
 * is where it was read. Observed, in the twenty commonest:
 *   va the · ka is · le it · hi to · ma of · lo follow · nu as · hu go · ta here
 * `hi`, `ma`, `lo`, `nu`, `hu`, `ta`, `se` and `va` are all back. WordNet glosses
 * are written prose and contain no interjections or abbreviations, so the
 * dataset cannot catch them. Neither list is sufficient alone; both are here.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromeTexts } from './lib/chrome-corpus.mjs';

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
/* ⚠️ `m` AND `k` WERE ADDED ON 2026-07-28, TO PAY FOR THE BIGGER BLOCKLIST.
 * Blocking every word in the dataset costs 41 single-syllable forms outright,
 * and the corpus is 580 types against a 319-form space: 262 of them — 45% —
 * spilled into two syllables, which breaks the shape rule this phonology exists
 * for ("function words are short and single, concepts are long", so a player
 * can tell grammar from content before reading either). Two more codas take the
 * space to 435 free and the spill back to a genuine tail. Same phonotactics: no
 * clusters, no q/x/j/w. */
const C2 = ['', 'n', 's', 'r', 'l', 'th', 'm', 'k'];

const FRAMES = JSON.parse(readFileSync(join(ROOT, 'docs/graph/frames.json'), 'utf8'));
const PROSE = JSON.parse(readFileSync(join(ROOT, 'docs/graph/prose.json'), 'utf8'));

// Every word we actually use, outside the concept spans — those already have
// words from build-lexicon.mjs.
const beatTexts = [];
for (const [k, v] of Object.entries(FRAMES)) {
  if (k === '_') continue;
  for (const f of ['title', 'body', 'label']) if (v[f]) beatTexts.push(v[f]);
}
for (const [k, v] of Object.entries(PROSE)) {
  if (k === '_') continue;
  beatTexts.push(v.title ?? '', v.body ?? '', ...Object.values(v.choices ?? {}));
}

/* ---- THE CORPUS IS NOT ONLY THE BEATS ------------------------------------
 *
 * It was, and that was the hole. `frames.json` + `prose.json` covered the beat
 * under the dock and nothing else, so the ticker line above it — "something you
 * never checked wore out" — had no foreign form for `wore`, `checked` or
 * `never`, and `literacy.canRead` SHOWS a word it has nothing to hide behind.
 * The result was one screen in two languages, which reads as the foreign half
 * being decoration.
 *
 * scripts/lib/chrome-corpus.mjs reads the ticker and the interface themselves
 * (not a hand-kept list of their words — that drifts the moment another session
 * edits App.svelte), and check-story.mjs validates against the SAME extractor,
 * so the generator and the gate cannot disagree about what the corpus is.
 *
 * THE CHROME IS A THIRD OF THE CORPUS BY WEIGHT — 931 tokens against the beats'
 * 1,515 — and frequency is what decides word length here, so this genuinely
 * moves the language: a word's rank is now counted across both. That is the
 * right answer rather than a side effect. `Solid` is on screen in every frame a
 * player ever sees and `the` is in most beats; both are high-frequency for the
 * same reason, and both should be short. Ties break alphabetically, so the
 * concatenation order below carries no meaning. */
const chrome = chromeTexts();
const texts = [...beatTexts, ...chrome];
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
 * corpus is not enough — the form has to avoid short English generally.
 *
 * ---- THE HAND-TYPED LIST LEAKED, AND IT LEAKED THE COMMONEST WORD ---------
 *
 * This was 150-odd words somebody thought of. Measured against the shipped
 * dataset on 2026-07-28, ELEVEN forms in play were English words:
 *
 *   kith = the      hen = as        sin = thing     ne  = from    ren = machine
 *   sos  = relation ro  = class     non = definition sur = glyph
 *   res  = other    mer = run
 *
 * `kith` is the word for `the`, which is the single most frequent word in the
 * game, and `non` is `definition`, which is on every leaf's first lane. Both
 * are visible in play.png: "Follow the non to takeraethu". A conlang whose
 * commonest word is an English noun does not read as a foreign language; it
 * reads as broken English, which is exactly the thing masking was rebuilt to
 * stop.
 *
 * THE BLOCKLIST IS NOW THE DATASET AS WELL. 4,096 WordNet labels and their
 * glosses give 9,125 English word types, shipped in this repo, no new
 * dependency, and it grows with the ontology instead of drifting from it.
 *
 * ⚠️ THE HAND LIST STAYS, UNIONED, AND DELETING IT IS A REGRESSION. It was
 * tried: WordNet glosses are written prose, so they contain no `hi`, no `ma`,
 * no `lo`, no `ok` and no `ye`. Dropping the hand list handed `hi` to `to`,
 * `ma` to `of` and `lo` to `follow` — three of the twenty commonest words in
 * the game, all of them things a player reads as English. Neither list is
 * sufficient alone: the dataset catches the nouns nobody would think of, the
 * hand list catches the interjections and abbreviations prose does not use. */
const ONTOLOGY = join(ROOT, 'public/ontology');

/** Every English word in the shipped dataset. Built ONCE and kept separate from
 *  the blocklist below on purpose: the assertion at the bottom of this file
 *  reads THIS, not `ENGLISH`, so deleting the dataset from the blocklist makes
 *  the check go red instead of making it agree with itself. A guard that its own
 *  sabotage disarms is the vacuous check CLAUDE.md rule 4 is about, and this one
 *  was exactly that for one draft. */
const DATASET = new Set();
{
  const idx = JSON.parse(readFileSync(join(ONTOLOGY, 'index.json'), 'utf8'));
  for (let c = 0; c < idx.chunks; c++) {
    const j = JSON.parse(readFileSync(join(ONTOLOGY, `c${String(c).padStart(3, '0')}.json`), 'utf8'));
    for (const text of [...j.l, ...(j.g ?? [])]) {
      for (const w of text.toLowerCase().match(/[a-z']+/g) ?? []) DATASET.add(w);
    }
  }
}

const ENGLISH = new Set([
  ...types,
  ...DATASET,
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
  // The `m` and `k` codas opened a new corner of English, and the same rule
  // applies there: a form a player reads as a word they already know is not a
  // foreign word. Names are in for the same reason — `Tom` in a sentence of
  // invented words reads as a name, which is a meaning we did not intend.
  'mam', 'mem', 'mom', 'mum', 'nom', 'rem', 'rim', 'rum', 'sim', 'sum', 'tam',
  'vim', 'ham', 'hem', 'him', 'hum', 'sham', 'sam', 'tim', 'tom', 'kim', 'ken',
  'lek', 'mak', 'tik', 'tok', 'nik', 'sok',
]);

const words = {};
const taken = new Set();
/* Watched, not assumed. The single-syllable space is 360 forms and the English
 * blocklist eats most of it; the corpus grew from 338 types to ~590 when the
 * ticker and the interface joined it, so how much of the tail has spilled into
 * two syllables is the number that says whether the phonology is still big
 * enough. It is printed, and the loop throws rather than spinning if it is not. */
let twoSyllable = 0;
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
    if (!taken.has(cand) && !ENGLISH.has(cand)) {
      taken.add(cand); words[w] = cand; twoSyllable++; return;
    }
  }
  throw new Error('no free form for ' + w + ' - widen the phonology');
});

const collisions = types.length - new Set(Object.values(words)).size;

const beatOnly = new Set((beatTexts.join(' ').replace(/⟦[^⟧]+⟧/g, ' ')
  .toLowerCase().match(/[a-z']+/g) ?? []));
const fromChrome = types.filter((w) => !beatOnly.has(w));

console.log(`function-word types .. ${types.length}`);
console.log(`  from beat prose .... ${types.length - fromChrome.length}`);
console.log(`  ONLY from the ticker and the interface .. ${fromChrome.length}`);
console.log(`  (these had no foreign form at all and rendered as English)`);
console.log(`English types blocked  ${ENGLISH.size} (dataset labels + glosses)`);
console.log(`two-syllable forms ... ${twoSyllable} of ${types.length}`);
{
  // ⚠️ WATCHED, NOT ASSUMED. The whole point of the bigger blocklist is that no
  // generated form is an English word; asserting it here is cheaper than a
  // playtester finding `kith` again.
  const leaks = Object.entries(words).filter(([, form]) => DATASET.has(form));
  console.log(`forms that are English  ${leaks.length}` +
    (leaks.length ? ` — ${leaks.map(([e, f]) => `${f}(=${e})`).join(', ')}` : ''));
  if (leaks.length) {
    console.error('\nFAIL: a foreign word that is an English word reads as a leak, not a language.');
    process.exit(1);
  }
}
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
