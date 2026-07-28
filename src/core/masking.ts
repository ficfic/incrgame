// THE MASKING RENDERER.
//
// Beat text carries ⟦spans⟧. Everything outside the brackets is ALWAYS visible;
// only bracketed spans are substituted. A span whose concept you have
// discovered shows the English label. One you have not shows the graph's own
// word for it — `ka-sa-le`, not blocks.
//
// ---- WHY THIS IS NOT LEMMA MATCHING -------------------------------------
//
// Scanning prose for concept words is the obvious implementation and it is
// forbidden, for a good reason: "set", "thing" and "state" are concepts AND
// ordinary English, so a global label index masks the wrong words and breaks
// sentences. This never looks at unbracketed text at all.
//
// Resolving a span to a node id still needs a table, and the story data ships
// no span→id map — spans carry the English label. So the table is built PER
// BEAT from the concepts that beat itself declares: its own `at`, each choice's
// `to`, and every id in `requires.concepts`. That is a closed set of at most a
// dozen entries, not a 4,096-entry lemma index, and a span that does not
// resolve inside it is LEFT VISIBLE rather than guessed at. Failing open is
// deliberate: showing an English word we could not identify costs nothing;
// masking one we misidentified corrupts the sentence.
import type { StoryBeat } from './types';
import { LANGUAGE } from '../content/language';

/** One piece of rendered text. `concept` is set only on substituted spans, so
 *  the UI can style a masked word without re-parsing anything. */
export interface Segment {
  text: string;
  /** Node id, when this segment came from a ⟦span⟧ that resolved. */
  concept?: number;
  /** True when the player cannot yet read this word. */
  masked?: boolean;
}

const SPAN = /⟦([^⟧]*)⟧/g;

/** The concepts a beat can legitimately talk about.
 *
 *  `labelOf` resolves the ids in `requires.concepts`, which arrive as numbers
 *  and whose English labels live in the ontology. It may return null while a
 *  chunk is still loading; such an id simply does not enter the table, and its
 *  span stays visible until the chunk lands. */
export function beatConcepts(
  beat: StoryBeat, labelOf: (id: number) => string | null,
): Map<string, number> {
  const table = new Map<string, number>();
  const add = (label: string | null | undefined, id: number) => {
    if (label && !table.has(label)) table.set(label, id);
  };
  add(beat.atLabel, beat.at);
  for (const c of beat.choices) {
    // `toLabel` is only present for the 446 destinations that HAVE a beat.
    // Every other destination is named from the ontology — without this the
    // frame rendered "Thoth Moloch nuth": the destination's English name,
    // unmasked, because the span had nothing to resolve against.
    add(c.toLabel || labelOf(c.to), c.to);
    for (const id of c.requires?.concepts ?? []) add(labelOf(id), id);
  }
  return table;
}

/** Every word outside the spans, translated unless the player can read it.
 *
 *  ⚠️ THIS VOIDS docs/VOICE.md §4 AS WRITTEN. That section said stakes must
 *  live in the verb so a sentence survives its nouns being masked — which
 *  assumed an ENGLISH CARRIER around foreign nouns. Owner: "there must be
 *  nothing even in GUI… like it's speaking foreign language." With the carrier
 *  foreign too, "Take the ka-sa side" stops being masked English and becomes a
 *  sentence in another language, which is the thing that was being asked for.
 *
 *  Case and punctuation survive: only the letters are replaced, and a word that
 *  began a sentence still does. A word the corpus has no form for is left
 *  alone — inventing one at render time would put a word in the language that
 *  is in no one's lexicon. */
function translateCarrier(text: string, canRead: (w: string) => boolean): Segment[] {
  const out: Segment[] = [];
  const WORD = /[A-Za-z][A-Za-z'-]*/g;
  let last = 0;
  for (let m = WORD.exec(text); m !== null; m = WORD.exec(text)) {
    const english = m[0];
    const foreign = LANGUAGE.words[english.toLowerCase()];
    if (!foreign || canRead(english)) continue;
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    // Preserve the capital: a foreign sentence still starts with one.
    const shown = /^[A-Z]/.test(english)
      ? foreign.charAt(0).toUpperCase() + foreign.slice(1)
      : foreign;
    out.push({ text: shown, masked: true });
    last = m.index + english.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/**
 * Split text into segments, substituting every ⟦span⟧ and then every carrier
 * word the player cannot yet read.
 *
 * @param text     the raw beat field
 * @param concepts label → node id, from {@link beatConcepts}
 * @param known    the concepts the player has discovered
 * @param wordFor  the graph's word for a node id
 */
export function renderMasked(
  text: string,
  concepts: Map<string, number>,
  known: Set<number>,
  wordFor: (id: number) => string,
  /** Whether the player can read an ordinary English word. Omitted, every
   *  carrier word stays English — which is what the tests for the SPAN rule
   *  want, and what a surface with no story context gets. */
  canRead?: (english: string) => boolean,
): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  SPAN.lastIndex = 0;
  for (let m = SPAN.exec(text); m !== null; m = SPAN.exec(text)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const label = m[1] ?? '';
    const id = concepts.get(label);
    if (id === undefined) {
      // Unresolvable span: show the English word. See the header — failing open
      // costs nothing, failing closed corrupts the sentence.
      out.push({ text: label });
    } else if (known.has(id)) {
      out.push({ text: label, concept: id });
    } else {
      out.push({ text: wordFor(id), concept: id, masked: true });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  if (!canRead) return out;
  // Second pass, over the UNSPANNED segments only: a concept's word must never
  // be re-translated as if it were grammar.
  return out.flatMap((seg) =>
    seg.concept === undefined && seg.masked === undefined
      ? translateCarrier(seg.text, canRead)
      : [seg]);
}

/** Plain string, for aria-labels and titles where markup cannot go. */
export function maskedText(segments: Segment[]): string {
  return segments.map((s) => s.text).join('');
}
