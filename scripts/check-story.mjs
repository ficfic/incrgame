#!/usr/bin/env node
/* check-story.mjs — the gate that keeps the vocabulary-gated story playable.
 *
 * Three invariants. Each one, if broken, is a bug a player would experience as
 * "the game stopped" rather than as an error.
 *
 *   1. NO DEAD END. Every beat offers at least one choice with an empty
 *      `requires`. A beat whose every exit is gated can strand a player who
 *      lacks all the keys, and an idle game that strands you is one you close.
 *
 *   2. NO UNOBTAINABLE KEY. Every concept named in a `requires.concepts` must
 *      be the destination of some beat's ungated exit, so a player who only
 *      ever takes the guaranteed exit still learns it eventually. Keys are
 *      deliberately drawn from OTHER lanes — that is the come-back-later loop —
 *      so this is checked ACROSS runs, not within one. Within a run you are
 *      meant to be locked out; being locked out forever is the bug.
 *
 *   3. NO DANGLING REFERENCE. Every `at`, `to` and key is a numeric node id
 *      inside the shipped concept range.
 *
 * ── RULE 4 EVIDENCE: this check has been confirmed RED ───────────────────────
 * It has also caught a real bug, not just planted ones: build-story.mjs first
 * drew gate keys from the full lane spines, and 3 of them sat on beats that had
 * been dropped for being too deep — doors with no key anywhere in the world.
 * That is why the generator now runs in two passes.
 *
 * Sabotage A — delete the guaranteed exit. In build-story.mjs change
 *   `requires: { concepts: [], rels: [] }, // the guaranteed readable exit`
 * to `requires: { concepts: [0], rels: [] },`, regenerate, run. Observed:
 *   FAIL  dead end: 93 beat(s) have no ungated exit
 *     e.g. noun.animal-1 (all 1 choices gated)
 *   FAIL  unobtainable key: 1 concept(s) gate a choice that no ungated exit ever teaches
 *     0 gates noun.Tops-4-on
 *   exit 1
 *
 * Sabotage B — gate on a node id outside the dataset. Change
 *   `let key = teachable[offset % teachable.length];` to `let key = 99999;`,
 * regenerate, run. Observed:
 *   FAIL  unobtainable key: 1 concept(s) gate a choice that no ungated exit ever teaches
 *     99999 gates noun.Tops-4-alt1
 *   FAIL  dangling reference: 234
 *     choice noun.animal-1-alt0 is gated on unknown node 99999
 *   exit 1
 *
 * Sabotage C - a span naming something that is not a concept. In prose.json
 * change one bracketed word to a nonsense string, regenerate, run. Observed:
 *   FAIL  span: 1
 *     c0: <nonesuchword> is not a concept
 *   exit 1
 *
 * Sabotage D - RETIRED 2026-07-27 with the rule it tested (the half-maskable
 * limit; see section 4). Kept on record: it did go red when applied.
 *   FAIL  span: 1
 *     c0: 7/8 words are maskable - will not survive masking
 *
 * Sabotage E - a beat whose only free exit is gated on the RELATION. Change
 * the guaranteed exit's requires to `{ concepts: [], rels: [8] }`, regenerate,
 * run. Observed:
 *   FAIL  dead end: 446 beat(s) have no ungated exit
 *     e.g. c0 (all 3 choices gated)
 *   FAIL  unobtainable key: 511 concept(s) gate a choice that no ungated exit ever teaches
 *     254 gates c1-alt0
 *   exit 1
 *
 * E is the one that found a real bug in this file rather than a planted one:
 * `ungated` originally tested `requires.concepts` alone, so a sideways route -
 * empty concepts, a rels gate - counted as a guaranteed exit and a beat with
 * no real way out would have passed as safe.
 *
 * Sabotage G - remove the parent exit, so the only moves are downward.
 * Observed:
 *   FAIL  orphaned: 428 place(s) unreachable from the seed by ANY route
 *     e.g. c0 (entity)
 *   exit 1
 *
 * Sabotage H - cap children per beat again (UNGATED_CHILDREN = 3). Observed:
 *   FAIL  opening: only 81 concepts reachable from the seed without a single
 *         key - the player has nowhere to go
 *   FAIL  orphaned: 406 place(s) unreachable from the seed by ANY route
 *     e.g. c8 (measure)
 *   exit 1
 *
 * G and H both describe REAL states this repo shipped, not hypotheticals: the
 * parent exit did not exist until the seed moved off `entity`, and the child
 * cap really did orphan 397 of 446 places. Invariant 2 also caught a third
 * real bug the same day - keys were computed before gating ran, so they
 * pointed at children that gating then locked (376 unobtainable).
 *
 * Sabotage I - remove four words from language.json that beat prose uses.
 * Observed:
 *   FAIL  untranslated: 4 word(s) in beat prose are absent from
 *         language.json, so they render as English at minute zero
 *     covers, separates, feature, talking
 *     fix: node scripts/build-language.mjs
 *   exit 1
 *
 * I is another real one, not a planted one. Adding 26 beats introduced words
 * the language had never been regenerated for, and they rendered as ENGLISH
 * from the first frame - a half-translated sentence in a game whose whole
 * premise is that none of it is readable yet.
 *
 * ── 2026-07-28: invariant 6 grew a second half, and it was proven red three
 *    ways. The first half only ever read the BEATS, so the ticker and the
 *    interface were invisible to it — which is how "something you never checked
 *    wore out" shipped in plain English above a fully foreign beat. Each of
 *    these three is a different way the new half can be defeated, so each was
 *    applied, observed and reverted.
 *
 * Sabotage J - the source is right, the LANGUAGE is stale. Delete eight words
 * the ticker uses (`wore`, `never`, `checked`, `online`, `watched`, `loose`,
 * `solid`, `extractor`) from language.json. Observed:
 *   FAIL  untranslated: 1 word(s) in beat prose are absent from language.json,
 *         so they render as English at minute zero
 *     checked
 *     fix: node scripts/build-language.mjs
 *   FAIL  untranslated: 8 word(s) in the ticker and the interface
 *         (src/shell/ticker.ts, src/core/readouts.ts, src/content/machines.ts,
 *         src/ui/App.svelte) are absent from language.json, so they render as
 *         English at minute zero
 *     extractor, online, watched, checked, loose, never, wore, solid
 *     fix: node scripts/build-language.mjs
 *   exit 1
 * Note which words appear in WHICH clause. Seven of the eight are invisible to
 * the beat half — that gap is the defect this half exists to close, printed.
 *
 * Sabotage K - the owner writes a ticker line and does not regenerate. Set
 * `OWNER_LINES = { 'bottleneck:words': 'the throughput plateau is unmistakable' }`
 * in src/shell/ticker.ts. Observed:
 *   FAIL  untranslated: 3 word(s) in the ticker and the interface (…)
 *     throughput, plateau, unmistakable
 *   exit 1
 * This is the one that will actually fire in anger: OWNER_LINES is where prose
 * gets written, and nothing else would have told anybody.
 *
 * Sabotage L - an INTERFACE string changes. In src/ui/App.svelte rename the
 * Check button to `<b>Corroborate</b>` and `'fewer ways on'` to
 * `'fewer thoroughfares on'`. Observed:
 *   FAIL  untranslated: 2 word(s) in the ticker and the interface (…)
 *     thoroughfares, corroborate
 *   exit 1
 * L is the one that proves the extractor really reads App.svelte rather than a
 * copy of its words — `Corroborate` is a bare text node between tags and
 * `fewer thoroughfares on` is a string inside a `{…}` expression, which are the
 * two shapes the markup pass has to handle and the two it could silently miss.
 *
 * Sabotage M - invariant 7, and this one is a REGRESSION TEST, not a plant.
 * Put the plural back: `${MACHINES[id].label}s watched · slower, and checked`
 * in src/shell/ticker.ts. Observed:
 *   FAIL  assembled word: 2 template literal(s) glue letters onto a ${…} hole,
 *         so the word they make is invisible to both the language and this check
 *     src/shell/ticker.ts: ${…}s  in  `${MACHINES[id].label}s watched · slower…
 *     fix: put the whole word in the interpolation, or drop the suffix
 *   exit 1
 *
 * M is the state that SHIPPED, and invariants 1-6 were all green while it did.
 * play.png, 2026-07-28: the dock read "Extractors hil · nar, ni meth ka nusni"
 * — one English word between five foreign ones — because `Extractor` + `s` is a
 * word that exists only at runtime, so build-language.mjs never gave it a form
 * and invariant 6 never missed one. Found by LOOKING AT THE SCREENSHOT, which
 * is the only reason it was found at all.
 *
 * ── 2026-07-28: INVARIANT 8, and it is the one invariant 6 could never see.
 *    6 asks whether a word HAS a foreign form. 8 asks the question after it:
 *    once hidden, can the player ever get it back? The ticker's only way in is
 *    frequency across the beats, so a ticker word no beat prints is masked at
 *    minute zero and masked at hour ten. Every line the dock shipped on
 *    2026-07-28 was written that way, with 6 green the whole time.
 *
 * Sabotage N - put the shipped ticker lines back: `something you never checked
 * wore out`, `your machines are ahead of your vocabulary`, `#${after} online`.
 * Observed:
 *   FAIL  untranslated: 3 word(s) in the ticker and the interface (…)
 *     ahead, online, wore
 *   FAIL  unlearnable: 7 word(s) on the ticker occur fewer than 3 times in the
 *         beats, so frequency can never teach them and they stay masked forever
 *     ahead (0x), never (0x), online (0x), out (0x), vocabulary (0x), wore (0x), your (1x)
 *     fix: say it in words the beats print, or pair it with a readout in
 *          EARNED_WITH (src/shell/ticker.ts)
 *   exit 1
 * N is a REGRESSION TEST, not a plant: those are the exact strings three
 * playtesters read as permanently unreadable. Note `your` at 1x — one occurrence
 * is not a near miss, it is a word that needs three and can reach one.
 *
 * Sabotage O - delete `watched: 'solid'` from EARNED_WITH in ticker.ts, the
 * table that pairs an interface word with the quantity that earns it. Observed:
 *   FAIL  unlearnable: 1 word(s) on the ticker occur fewer than 3 times …
 *     watched (0x)
 *   exit 1
 * O is the one that proves the exemption is not a free pass: the table grants
 * the word AND exempts it in the same entry, so it cannot silence the gate
 * without also giving the player a way to read the word.
 *
 * Sabotage P - build the corpus the obvious way instead: compiled beats only,
 * frames left unfilled, leaves dropped (scripts/lib/beat-corpus.mjs). Observed:
 *   FAIL  unlearnable: 1 word(s) on the ticker occur fewer than 3 times …
 *     stops (2x)
 *   exit 1
 * P is the one that proves WHICH corpus this counts. `stops` goes from 8,060 to
 * 2, because "the tree stops" is the leaf frame and leaves are 89% of the board
 * while appearing in public/story/*.json exactly zero times. A gate built on the
 * compiled beats would reject the safest vocabulary in the game.
 *
 * All fifteen applied, observed and reverted; fourteen still live (D is retired).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHROME_SOURCES, chromeTexts, gluedInterpolations, tickerExemptions, tickerProse,
} from './lib/chrome-corpus.mjs';
import { beatFrequency, carrierWords, learnAt } from './lib/beat-corpus.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { concepts } = JSON.parse(readFileSync(join(ROOT, 'docs/graph/idmap.json'), 'utf8'));
const { beats } = { beats: JSON.parse(readFileSync(join(ROOT,'public/story/index.json'),'utf8')).chunks.map((f) => JSON.parse(readFileSync(join(ROOT, 'public/story/' + f), 'utf8')).beats).flat() };

// story.json speaks NUMERIC node ids, the same ones the engine uses. This check
// therefore validates the artifact standalone — it does not re-derive anything
// from lanes.json, so it would catch build-story.mjs translating wrongly.
const known = (id) => Number.isInteger(id) && id >= 0 && id < concepts;

/* UNGATED means gated on NEITHER axis. Sideways routes carry an empty
 * `concepts` list but a `rels` gate, so testing concepts alone counted them as
 * guaranteed exits — a beat whose only "free" exit was a locked sideways link
 * would have passed as safe. Caught when rel-gated routes were added. */
const ungated = (c) => !(c.q?.c ?? []).length && !(c.q?.r ?? []).length;

// What an ungated-only player learns: the destination of every guaranteed exit.
// Across runs, not within one — keys are drawn from other lanes on purpose, so
// being locked out this run is the design. Being locked out forever is the bug.
const teachable = new Set();
for (const b of beats) {
  for (const c of b.choices) {
    if (ungated(c)) teachable.add(c.to);
  }
}

const fail = [];

// 1. no dead end
const stranded = beats.filter((b) => !b.choices.some(ungated));
if (stranded.length) {
  fail.push(
    `dead end: ${stranded.length} beat(s) have no ungated exit\n` +
      `  e.g. ${stranded[0].id} (all ${stranded[0].choices.length} choices gated)`,
  );
}

// 2. no unobtainable key
const orphanKeys = new Map();
for (const b of beats) {
  for (const c of b.choices) {
    for (const k of c.q?.c ?? []) {
      if (!teachable.has(k)) orphanKeys.set(k, c.i);
    }
  }
}
if (orphanKeys.size) {
  const [k, cid] = [...orphanKeys][0];
  fail.push(
    `unobtainable key: ${orphanKeys.size} concept(s) gate a choice that no ungated exit ever teaches\n` +
      `  ${k} gates ${cid}`,
  );
}

/* 3. THE OPENING IS PLAYABLE, AND NOTHING IS ORPHANED.
 *
 * The player no longer starts at `entity` — the seed is five mid-graph
 * concepts (docs/graph/language.json). Two things that were silently false
 * when that changed:
 *
 *   - every exit went DOWN to a child, so from depth 3 in a 4-deep tree only
 *     35 of 4,096 concepts were reachable. Fixed by an ungated parent exit.
 *   - per-beat child caps orphaned 397 of 446 places: unreachable by any
 *     route, with or without keys. Content that exists and cannot be visited
 *     is worse than content that does not exist, because it looks like
 *     progress.
 *
 * Neither was visible without walking the graph, so this walks it. */
const { seed } = JSON.parse(readFileSync(join(ROOT, 'docs/graph/language.json'), 'utf8'));
{
  const at = new Map(beats.map((b) => [b.at, b]));
  const byLabel = new Map();
  const idx = JSON.parse(readFileSync(join(ROOT, 'public/ontology/index.json'), 'utf8'));
  for (let c = 0; c < idx.chunks; c++) {
    JSON.parse(readFileSync(join(ROOT, `public/ontology/c${String(c).padStart(3, '0')}.json`), 'utf8'))
      .l.forEach((l, i) => { if (!byLabel.has(l)) byLabel.set(l, i + c * idx.chunkSize); });
  }
  const missing = seed.filter((s) => !byLabel.has(s));
  if (missing.length) fail.push(`seed: not in the dataset — ${missing.join(', ')}`);

  const walk = (useGated) => {
    const start = seed.map((s) => byLabel.get(s)).filter((x) => x !== undefined);
    const seen = new Set(start);
    const q = [...start];
    while (q.length) {
      const b = at.get(q.shift());
      if (!b) continue;
      for (const c of b.choices) {
        if (!useGated && !ungated(c)) continue;
        if (!seen.has(c.to)) { seen.add(c.to); q.push(c.to); }
      }
    }
    return seen;
  };
  const free = walk(false);
  const all = walk(true);
  if (free.size < 100) {
    fail.push(`opening: only ${free.size} concepts reachable from the seed without a single key — the player has nowhere to go`);
  }
  const orphans = beats.filter((b) => !all.has(b.at));
  if (orphans.length) {
    fail.push(`orphaned: ${orphans.length} place(s) unreachable from the seed by ANY route\n  e.g. ${orphans[0].id} (${orphans[0].atLabel})`);
  }
}

// 4. no dangling reference
const dangling = [];
for (const b of beats) {
  if (!known(b.at)) dangling.push(`beat ${b.id} sits at unknown node ${b.at}`);
  for (const c of b.choices) {
    if (!known(c.to)) dangling.push(`choice ${c.i} leads to unknown node ${c.to}`);
    for (const k of c.q?.c ?? []) {
      if (!known(k)) dangling.push(`choice ${c.id} is gated on unknown node ${k}`);
    }
  }
}
if (dangling.length) {
  fail.push(`dangling reference: ${dangling.length}\n  ${dangling[0]}`);
}

/* 5. EVERY SPAN RESOLVES TO A CONCEPT.
 *
 * `⟦word⟧` marks a maskable concept. A span naming something that is not one
 * never masks, so the word stays legible forever and the beat quietly loses
 * its gate — invisible until a player walks into it.
 *
 * REMOVED 2026-07-27 — a companion rule failed any body more than half
 * maskable, reasoning that an all-spans sentence is a wall of unknown words
 * with no English holding it up. That assumed an ENGLISH CARRIER. The owner
 * scrapped that ("there must be nothing even in GUI"), so verbs and function
 * words are foreign too (scripts/build-language.mjs) and every beat is fully
 * unreadable at minute zero BY DESIGN. The rule would now fail everything or
 * pass vacuously, so it is gone rather than left to rot. Sabotage D below
 * tested it and is retired with it. */
const LABELS = new Set();
{
  const idx = JSON.parse(readFileSync(join(ROOT, 'public/ontology/index.json'), 'utf8'));
  for (let c = 0; c < idx.chunks; c++) {
    for (const l of JSON.parse(readFileSync(join(ROOT, `public/ontology/c${String(c).padStart(3, '0')}.json`), 'utf8')).l) {
      LABELS.add(l);
    }
  }
}
const spanProblems = [];
for (const b of beats) {
  if (!b.body) continue;
  for (const text of [b.title, b.body, ...b.choices.map((c) => c.t)]) {
    for (const m of (text ?? '').matchAll(/⟦([^⟧]+)⟧/g)) {
      if (!LABELS.has(m[1])) spanProblems.push(`${b.id}: ⟦${m[1]}⟧ is not a concept`);
    }
  }
}
/* 6. EVERY CARRIER WORD HAS A TRANSLATION \u2014 IN THE BEATS *AND* IN THE CHROME.
 *
 * The interface is meant to be fully foreign at minute zero. A word missing
 * from language.json renders as ENGLISH \u2014 `literacy.canRead` returns true by
 * default for a word it has nothing to hide behind \u2014 so the surface comes out
 * half-translated and the effect collapses.
 *
 * Found live in the BEATS, not hypothetically: after 26 beats were added,
 * "talking", "covers", "separates" and "feature" were readable from the first
 * frame, because language.json had been generated from the corpus as it stood
 * before. That is sabotage I.
 *
 * Found live in the CHROME on 2026-07-28, which is why this clause grew a
 * second half: the ticker read "something you never checked wore out" in plain
 * English directly above a beat that was fully foreign, because the corpus was
 * frames.json + prose.json and nothing else. Every surface that can put English
 * in front of a player is now in scripts/lib/chrome-corpus.mjs, and the
 * generator reads THE SAME extractor \u2014 so this cannot pass by agreeing with a
 * stale copy of the word list. It goes red on one condition, the only one that
 * matters: a source string changed and nobody regenerated the language. */
{
  const lang = JSON.parse(readFileSync(join(ROOT, 'docs/graph/language.json'), 'utf8')).words;
  const report = (what, where, fixHint) => {
    const missing = new Set();
    for (const text of what) {
      for (const w of text.replace(/\u27e6[^\u27e7]+\u27e7/g, ' ').toLowerCase().match(/[a-z']+/g) ?? []) {
        if (!lang[w]) missing.add(w);
      }
    }
    if (missing.size) {
      fail.push(
        `untranslated: ${missing.size} word(s) in ${where} are absent from language.json, ` +
          `so they render as English at minute zero\n  ${[...missing].slice(0, 8).join(', ')}\n` +
          `  fix: ${fixHint}`,
      );
    }
  };

  report(
    beats.flatMap((b) => [b.title, b.body].filter(Boolean)),
    'beat prose',
    'node scripts/build-language.mjs',
  );
  report(
    chromeTexts(),
    `the ticker and the interface (${CHROME_SOURCES.join(', ')})`,
    'node scripts/build-language.mjs',
  );
}

if (spanProblems.length) {
  fail.push(`span: ${spanProblems.length}\n  ${spanProblems[0]}`);
}

/* 7. NO WORD IS ASSEMBLED WHERE THE CORPUS CANNOT SEE IT.
 *
 * Invariant 6 compares the source text against language.json. A word built at
 * RUNTIME out of an interpolation plus a suffix is in neither: `${label}s` is
 * `Extractor` from machines.ts and a bare `s` from the template, and the word
 * it makes — `extractors` — exists in no file, so the generator never gives it
 * a form and the gate never misses one. It ships in English with everything
 * green. That is not a hypothetical; it is what play.png showed on 2026-07-28,
 * with the ticker reading "Extractors" between two foreign words. */
{
  const glued = gluedInterpolations();
  if (glued.length) {
    fail.push(
      `assembled word: ${glued.length} template literal(s) glue letters onto a \${…} hole, ` +
        `so the word they make is invisible to both the language and this check\n` +
        `  ${glued[0].file}: \${…}${glued[0].suffix}  in  ${glued[0].where}…\n` +
        `  fix: put the whole word in the interpolation, or drop the suffix`,
    );
  }
}

/* 8. NO PERMANENTLY UNREADABLE WORD ON THE DOCK.
 *
 * Invariant 6 asks whether a word HAS a foreign form. This asks the question
 * that comes straight after it and that nobody had asked: once it is hidden,
 * can the player ever get it back?
 *
 * The ticker has exactly one way in — FREQUENCY across the beats the player has
 * stood in (`src/core/literacy.ts`), because the dock is not a place and
 * standing in it teaches nothing. So a ticker word that the beats never print
 * is masked on the first frame and masked forever. Invariant 6 was green the
 * whole time it shipped: the words had forms, which is what made it invisible.
 *
 * Two ways to satisfy this, and they are the two the HUD already has:
 *   · the beats print it at least LEARN_AT times, or
 *   · it rides on a readout's `learned` witness — `EARNED_WITH` in ticker.ts,
 *     or a `${…}` hole filled from readouts.ts / machines.ts, which is why the
 *     extractor drops holes rather than trying to guess their contents.
 *
 * Frequency is counted over the RENDERED corpus (scripts/lib/beat-corpus.mjs):
 * frames filled, leaves included. Counting the compiled beats alone reports
 * `tree` and `stops` as zero, and those are in 89% of the places on the board. */
{
  const LEARN_AT = learnAt();
  const freq = beatFrequency();
  const exempt = tickerExemptions();
  const unlearnable = new Map();
  for (const text of tickerProse()) {
    for (const w of carrierWords(text)) {
      if (exempt.has(w)) continue;
      const n = freq.get(w) ?? 0;
      if (n < LEARN_AT) unlearnable.set(w, n);
    }
  }
  if (unlearnable.size) {
    fail.push(
      `unlearnable: ${unlearnable.size} word(s) on the ticker occur fewer than ` +
        `${LEARN_AT} times in the beats, so frequency can never teach them and they ` +
        `stay masked forever\n  ` +
        [...unlearnable].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
          .slice(0, 10).map(([w, n]) => `${w} (${n}x)`).join(', ') +
        `\n  fix: say it in words the beats print, or pair it with a readout in ` +
        `EARNED_WITH (src/shell/ticker.ts)`,
    );
  }
}

if (fail.length) {
  for (const f of fail) console.error('FAIL  ' + f);
  process.exit(1);
}

const gated = beats.reduce((n, b) => n + b.choices.filter((c) => !ungated(c)).length, 0);
console.log(`ok  ${beats.length} beats, ${gated} gated choices, every beat has an exit`);
console.log(`ok  every gate key is taught by some ungated exit (${teachable.size} teachable concepts)`);
console.log(`ok  no dangling concept references`);
{
  const lang = JSON.parse(readFileSync(join(ROOT, 'docs/graph/language.json'), 'utf8')).words;
  const chromeTypes = new Set(chromeTexts().join(' ').toLowerCase().match(/[a-z']+/g) ?? []);
  console.log(
    `ok  every carrier word has a foreign form — ${Object.keys(lang).length} of them, ` +
      `${chromeTypes.size} reachable from the ticker and the interface`,
  );
  const freq = beatFrequency();
  const exempt = tickerExemptions();
  const used = new Set(tickerProse().flatMap(carrierWords).filter((w) => !exempt.has(w)));
  const rarest = [...used].map((w) => [w, freq.get(w) ?? 0]).sort((a, b) => a[1] - b[1])[0];
  console.log(
    `ok  every ticker word can be learned — ${used.size} from the beats ` +
      `(rarest: ${rarest?.[0]} at ${rarest?.[1]}x, floor is ${learnAt()}), ` +
      `${exempt.size} earned by making the quantity happen`,
  );
}
