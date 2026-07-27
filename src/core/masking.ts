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
    add(c.toLabel, c.to);
    for (const id of c.requires?.concepts ?? []) add(labelOf(id), id);
  }
  return table;
}

/**
 * Split text into segments, substituting every ⟦span⟧.
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
  return out;
}

/** Plain string, for aria-labels and titles where markup cannot go. */
export function maskedText(segments: Segment[]): string {
  return segments.map((s) => s.text).join('');
}
