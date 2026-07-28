// The story graph, as data.
//
// ⚠️ THE PAYLOAD MOVED to public/story/ (index + chunks, 243 KB) so it can be
// FETCHED rather than bundled. This module still imports it synchronously,
// because `src/core/starmap.ts`, `masking.ts` and `literacy.ts` read it as
// plain data and making it async would push a load state through every one of
// them plus the render path. That is a real refactor and it is queued in
// BACKLOG rather than smuggled in beside a format change — the bundle cost is
// paid today, knowingly.
//
// ⚠️ ALL IDS ARE NUMERIC NODE IDS — the integers a save stores. The content
// pipeline owns the translation from WordNet synset ids; the engine never
// learns that synset ids exist.
import index from '../../public/story/index.json';
import chunk0 from '../../public/story/s000.json';
import type { StoryBeat, StoryChoice, StoryGraph } from '../core/types';

/** The wire shape. Choice fields are one letter each — the payload is mostly
 *  choices, and `id`/`frame`/`text`/`requires` spelled out cost 60% of it. */
interface WireChoice {
  i: string; f: string; to: number;
  /** Authored label. Absent means "render the frame". */
  t?: string;
  r?: number;
  /** requires: `c` concepts, `r` rels. */
  q?: { c?: number[]; r?: number[] };
}
interface WireBeat {
  id: string; at: number; atLabel: string; depth: number; frame: string;
  title?: string; body?: string; choices: WireChoice[];
}

/** Carrier sentences. A beat with no authored prose renders its frame, so these
 *  are the most-read text in the game by a wide margin — `leaf` alone covers
 *  396 of 446 places. Slots: `{here}` the concept you stand at, `{next}` /
 *  `{branch}` where a choice leads. */
export const FRAMES: Record<string, { title?: string; body?: string; label?: string }> =
  Object.fromEntries(Object.entries(index.frames as Record<string, unknown>)
    .filter(([k]) => k !== '_')) as never;

const fill = (t: string | undefined, slots: Record<string, string>): string =>
  (t ?? '').replace(/\{(\w+)\}/g, (m, k: string) => slots[k] ?? m);

/** Expand a wire beat into the shape the renderer wants: every field present,
 *  frames already substituted. Done once at load, so nothing downstream has to
 *  know a frame exists. */
function expand(w: WireBeat): StoryBeat {
  const frame = FRAMES[w.frame] ?? {};
  const here = w.atLabel;
  const choices: StoryChoice[] = w.choices.map((c) => {
    const cf = FRAMES[c.f] ?? {};
    // ⚠️ ONLY 446 OF 4,096 CONCEPTS HAVE A BEAT, and a choice can point at any
    // of them — so most destinations have no label in the story payload at all.
    // Filling the slot from `beatLabels` alone produced "Thoth  nuth": the
    // frame rendered with an empty span where the destination should be.
    //
    // So the slot is LEFT UNFILLED here and resolved at render time, where the
    // ontology is loaded and `conceptAt(id).label` exists. Content substitutes
    // what content knows; the shell substitutes what the shell knows.
    const toLabel = beatLabels.get(c.to) ?? '';
    return {
      id: c.i, frame: c.f, to: c.to, toLabel, rel: c.r ?? 0,
      label: c.t ?? fill(cf.label, toLabel ? { next: toLabel, branch: toLabel, here } : { here }),
      requires: { concepts: c.q?.c ?? [], rels: c.q?.r ?? [] },
    };
  });
  return {
    id: w.id, at: w.at, atLabel: here, depth: w.depth, frame: w.frame,
    title: w.title ?? fill(frame.title, { here }),
    body: w.body ?? fill(frame.body, { here }),
    choices,
  };
}

const wire = (chunk0 as unknown as { beats: WireBeat[] }).beats;
/** at → label, so a choice can name where it goes without a second lookup. */
const beatLabels = new Map<number, string>(wire.map((b) => [b.at, b.atLabel]));

export const STORY: StoryGraph = {
  counts: index.counts as Record<string, number>,
  frames: Object.keys(FRAMES),
  beats: wire.map(expand),
};
