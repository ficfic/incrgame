/* beat-corpus.mjs — the English a player can actually READ THEIR WAY INTO.
 *
 * WHY THIS IS NOT `frames.json` + `prose.json`
 * --------------------------------------------
 * Those are the SOURCE. This is what ends up in front of a player, and the two
 * are different in the way that matters here: a carrier word is learned by
 * FREQUENCY across the beats the player has stood in (`src/core/literacy.ts`),
 * so the question "can this word ever be learned" is a question about counts in
 * the rendered corpus, not about presence in the source.
 *
 * Three things the source-only view misses, all of them large:
 *
 *   · A beat with no authored prose renders its FRAME (`src/content/story.ts`
 *     fills them once on load). 420 of 446 beats have no body of their own, so
 *     `descent` and `arrival` are read far more often than any authored line.
 *   · A concept with no children has no beat at all and renders the `leaf`
 *     frame — 4,029 places, which is 89% of the board. "the tree stops" is by a
 *     wide margin the most-read sentence in the game and it appears in
 *     `public/story/*.json` exactly zero times.
 *   · A choice label is the frame's, repeated once per lane. One beat offers
 *     371 of them.
 *
 * Counting the compiled beats alone therefore reports `tree`, `stops`, `again`,
 * `divide`, `back` and `up` as ZERO — words every player reads in their first
 * minute — and would fail a learnability gate on exactly the vocabulary that is
 * safest to use.
 *
 * ONE EXTRACTOR, SO THE GATE AND THE PROSE CANNOT DISAGREE about what the
 * player has been shown.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const WORD = /[A-Za-z][A-Za-z'-]*/g;

/** The same tokeniser `src/core/literacy.ts` uses, spans excluded.
 *
 *  ⚠️ IT INCLUDES THE HYPHEN and the corpus generator's `[a-z']+` does not, so
 *  the two disagree about `sign-off`. Matching literacy here is the correct
 *  side to be on: this module decides whether a word can be LEARNED, and
 *  literacy is what does the learning. */
export function carrierWords(text) {
  return ((text ?? '').replace(/⟦[^⟧]*⟧/g, ' ').match(WORD) ?? []).map((w) => w.toLowerCase());
}

const fill = (text, here, there) =>
  (text ?? '').replace(/\{(here|next|branch)\}/g, (_m, slot) => (slot === 'here' ? here : there));

/** Every string a beat, a leaf or a lane label can put in front of a player. */
export function beatTexts() {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'public/story/index.json'), 'utf8'));
  const frames = manifest.frames;
  const beats = manifest.chunks
    .map((f) => JSON.parse(readFileSync(join(ROOT, 'public/story/' + f), 'utf8')).beats)
    .flat();

  const out = [];
  const hasBeat = new Set(beats.map((b) => b.at));
  const leaves = new Map();

  for (const b of beats) {
    out.push(b.title ?? fill(frames[b.frame]?.title, b.atLabel, b.atLabel));
    out.push(b.body ?? fill(frames[b.frame]?.body, b.atLabel, b.atLabel));
    for (const c of b.choices) {
      out.push(c.t ?? fill(frames[c.f]?.label, b.atLabel, c.l));
      if (!hasBeat.has(c.to) && !leaves.has(c.to)) leaves.set(c.to, c.l);
    }
  }
  // A leaf renders the `leaf` frame and offers `sideways` lanes out of its own
  // gloss. Its inherited siblings are the offering beat's labels, already above.
  for (const label of leaves.values()) {
    out.push(fill(frames.leaf?.title, label, label));
    out.push(fill(frames.leaf?.body, label, label));
    out.push(fill(frames.sideways?.label, label, label));
  }
  return out;
}

/** word → how many times a player can meet it across the whole board. */
export function beatFrequency() {
  const freq = new Map();
  for (const t of beatTexts()) {
    for (const w of carrierWords(t)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return freq;
}

/** `LEARN_AT`, read from the module that owns it rather than copied.
 *
 *  A copy would make this gate pass on a threshold the game no longer uses,
 *  which is the exact shape of the vacuous check CLAUDE.md rule 4 is about. */
export function learnAt() {
  const src = readFileSync(join(ROOT, 'src/core/literacy.ts'), 'utf8');
  const m = /export const LEARN_AT\s*=\s*(\d+)/.exec(src);
  if (!m) throw new Error('LEARN_AT not found in src/core/literacy.ts');
  return Number(m[1]);
}
