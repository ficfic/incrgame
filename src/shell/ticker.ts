// The event ticker (Paperclips-style drip). SHELL-side: it observes state
// transitions and emits lines; the engine knows nothing about it.
//
// ★ PROSE: machine-drafted, owner-edited (CLAUDE.md, reversed 2026-07-27 — the
// old "Claude does not write flavor prose" rule is void). Lines here are either
// (a) MECHANICAL — assembled from content labels + numbers — or (b) drafted
// flavour keyed by trigger id in OWNER_LINES, which the owner then iterates on.
// The trigger moments still awaiting a line live in docs/TICKER_LINES.md.
//
// ---- THE TICKER SPEAKS THE LANGUAGE TOO ----------------------------------
//
// Owner: "there must be nothing even in GUI… like it's speaking foreign
// language." The beat under the dock has been foreign since 2026-07-27; the
// dock ABOVE it was still reading "something you never checked wore out" in
// plain English, on the same screen, in the same frame. One surface in two
// languages is worse than either, because it tells the player the foreign half
// is decoration.
//
// So every line goes out through exactly the path beat prose goes through:
// `renderMasked` + `literacy.canRead`, the same LEARN_AT = 3 frequency rule,
// the same `language.json`. Nothing here decides what is readable — it asks.
//
// ⚠️ TRANSLATED AT RENDER, NOT AT EMIT, and the reason is the same one that
// makes masking retroactive (DECISIONS 2026-07-27): a line lives for 45
// seconds, and a word learned during those 45 seconds must resolve in the line
// already on screen rather than stay foreign until the next one. It also fixes
// a cold-start hole for free — `sayAwayReturn` fires from `resumeFromGap`
// BEFORE the first tick, when no transition has been observed and literacy is
// still empty, and a returning veteran's away line would have gone out fully
// foreign. Storing English and translating late means it corrects itself on the
// next tick instead.
import { derived, writable, type Readable } from 'svelte/store';
import type { GameState } from '../core/types';
import { MACHINE_IDS } from '../core/types';
import { bottleneck } from '../core/engine';
import { MACHINES } from '../content/machines';
import { formatWhole } from '../core/numbers';
import { READOUTS, type ReadoutId } from '../core/readouts';
import { canRead, knownWords } from '../core/literacy';
import { maskedText, renderMasked } from '../core/masking';

export interface TickerLine {
  id: number;
  text: string;
  /** Epoch ms, on the same clock as `state.lastTick`. Lines EXPIRE.
   *
   *  Without this the dock rendered `slice(-2)` of an append-only list, so the
   *  last two lines sat under the board forever — "graph: 25 nodes" was still
   *  on screen long after it stopped being news, which reads as a frozen UI
   *  rather than as a drip. A ticker that never clears is not a ticker. */
  at: number;
}

/** How long a line stays on screen. Long enough to read on a phone without
 *  looking at it immediately; short enough that a quiet dock means nothing has
 *  happened, rather than that something happened once. */
export const TICKER_TTL_MS = 45_000;

// Owner-written lines slot in here, keyed by trigger id (see docs/TICKER_LINES.md).
// Empty until the owner writes them — mechanical fallbacks carry the ticker.
//
// ⚠️ A LINE WRITTEN HERE NEEDS `node scripts/build-language.mjs` RUN AFTER IT.
// These are translated like everything else, and a word with no entry in
// language.json is shown in English by default (literacy.ts: "nothing to hide
// it behind"). So a freshly written line reads half in the graph's tongue and
// half in yours until the language is regenerated. `npm run check:story` fails
// on exactly that, by name — it does not have to be remembered.
const OWNER_LINES: Record<string, string> = {};

/** Test seam. The fallback chain is the thing that makes numbered triggers
 *  writable at all, so it needs a test, and a test needs a way to plant a line
 *  without shipping one. Exported as the same object, never written in play. */
export const OWNER_LINES_FOR_TEST = OWNER_LINES;

/** WORDS — the same quantity the HUD shows under the same word, because the
 *  line is built out of READOUTS rather than out of a second calculation. The
 *  dock once announced "25 nodes" beside a HUD reading "3 recovered": both
 *  right, different quantities, no bug anywhere.
 *
 *  Milestones stop well below the size of the world: a beat nobody can reach is
 *  a beat nobody will read (docs/CONTENT.md, reachability rule 3). */
const WORD_MILESTONES = [1, 5, 10, 25, 50, 100, 200, 400];

/** ROT. Announced because the first time it appears is the first time speed
 *  visibly costs something, and a number that grows with no line under it reads
 *  as a bug rather than as a consequence. */
const ROT_MILESTONES = [1, 25, 250, 2500];

/** A line as EMITTED: the English, before the player's literacy is applied. */
interface Utterance {
  id: number;
  english: string;
  at: number;
}

const lines = writable<Utterance[]>([]);

/** The carrier words the player can read, refreshed from state.
 *
 *  A Set, replaced wholesale rather than mutated, because the derived store
 *  below has to see the change. */
const literate = writable<Set<string>>(new Set());

/** No spans, no concepts. Ticker text is carrier vocabulary end to end — the
 *  concept nouns it might have named live in the beat under it, and a ticker
 *  line that resolved ⟦spans⟧ would be a second, differently-gated way to learn
 *  a word. */
const NO_CONCEPTS = new Map<string, number>();
const NO_BOUND = new Set<number>();
const NEVER = (): string => '';

/** One line, in the language the player currently has.
 *
 *  ⚠️ NUMBERS ARE NOT TOUCHED, and that is not an accident of the regex — it is
 *  the rule (`3 / 4075` is legible to anyone; digits were never English).
 *  `renderMasked` only ever substitutes letter-words, so `Extractor #30 online`
 *  keeps its 30 and loses the two words around it. */
export function speak(english: string, known: Set<string>): string {
  return maskedText(
    renderMasked(english, NO_CONCEPTS, NO_BOUND, NEVER, (w) => canRead(known, w)));
}

export const ticker: Readable<TickerLine[]> = derived(
  [lines, literate],
  ([$lines, $literate]) =>
    $lines.map((l) => ({ id: l.id, at: l.at, text: speak(l.english, $literate) })),
);

let nextId = 1;

/** Recompute literacy, but only when it can have changed.
 *
 *  Exposure is derived from `state.held` and nothing else (literacy.ts), so the
 *  array's identity is an exact test — `held` is rewritten only by a walk. That
 *  matters: this is on the 10 Hz path, and `knownWords` walks all 446 beats.
 *  `null` on the first call is deliberate, so a save loaded with 200 concepts
 *  already held computes once on the first tick rather than never. */
let lastHeld: readonly number[] | null = null;

function relearn(state: GameState): void {
  if (lastHeld === state.held) return;
  lastHeld = state.held;
  literate.set(knownWords(state));
}

/** Emit a line for a trigger.
 *
 *  Numbered triggers fall back to their UNNUMBERED form: `buy:extractor:30`
 *  looks for `buy:extractor:30` first, then `buy:extractor`. Without that, the
 *  owner would have to write a line per purchase count or watch the same
 *  mechanical string repeat forever — by Extractor #30 the ticker was reading
 *  "#30 online" and would have gone on doing so indefinitely. A generic line is
 *  the difference between the buy trigger being writable and being noise. */
export function say(triggerId: string, mechanical: string): void {
  const generic = triggerId.replace(/:\d+$/, '');
  const english = OWNER_LINES[triggerId] ?? OWNER_LINES[generic] ?? mechanical;
  lines.update((l) => [...l.slice(-30), { id: nextId++, english, at: Date.now() }]);
}

/** Diff two states and emit ticker lines for what just happened. */
export function observeTransition(prev: GameState, next: GameState): void {
  relearn(next);
  for (const id of MACHINE_IDS) {
    const before = prev.machines[id];
    const after = next.machines[id];
    if (after > before) say(`buy:${id}:${after}`, `${MACHINES[id].label} #${after} online`);
  }
  // ⚠️ NEVER GLUE LETTERS ONTO A `${…}`. These two lines read
  // `${MACHINES[id].label}s watched …` and shipped "Extractors" in plain
  // English inside an otherwise foreign ticker — seen in play.png, 2026-07-28.
  // The corpus extractor drops interpolation holes, so `Extractor` + `s` is a
  // word neither `build-language.mjs` nor `check:story` can see: the language
  // has a form for `extractor` and none for `extractors`, and a word with no
  // form is SHOWN. An English plural morpheme on a foreign noun was wrong on
  // its own terms anyway. check-story.mjs invariant 7 now fails the build on it.
  for (const id of ['extractor', 'reasoner'] as const) {
    if (prev.watched[id] === next.watched[id]) continue;
    say(`watch:${id}:${next.watched[id]}`,
      next.watched[id]
        ? `${MACHINES[id].label} watched · slower, and checked`
        : `${MACHINES[id].label} loose · faster, and nobody is looking`);
  }
  // Milestones read READOUTS, so the number in the line is by construction the
  // number under the same word in the HUD. That equality is asserted by a test.
  crossings(prev, next, 'words', WORD_MILESTONES, (m) =>
    m === 1 ? `first word bound` : `${m} ${READOUTS.words.noun} · ${READOUTS.words.explain}`);
  crossings(prev, next, 'rot', ROT_MILESTONES, (m) =>
    m === 1 ? `something you never checked wore out` : `${m} ${READOUTS.rot.noun}`);

  // THE FLATLINE, ANNOUNCED. When the vocabulary becomes the binding
  // constraint, every machine you own is idling and no purchase will change
  // that — and a player watching a rate stop climbing with no explanation will
  // reasonably conclude the game is broken. Both directions fire: walking your
  // way back out of the cap is the reward, and a limit you only ever hear about
  // once teaches half a rule.
  const was = bottleneck(prev);
  const now = bottleneck(next);
  if (was !== now && now === 'words') say('bottleneck:words', 'your machines are ahead of your vocabulary');
  else if (was === 'words' && now === 'machines') say('bottleneck:machines', 'vocabulary is ahead · buy machines');
}

/** Fire once per threshold the given readout has just crossed upward. */
function crossings(
  prev: GameState,
  next: GameState,
  id: ReadoutId,
  thresholds: number[],
  mechanical: (m: number) => string,
): void {
  const before = READOUTS[id].count(prev);
  const after = READOUTS[id].count(next);
  for (const m of thresholds) {
    if (before.lt(m) && after.gte(m)) say(`${id}:${m}`, mechanical(m));
  }
}

/** What accumulates while you are gone, in the words that name it. Nothing rots
 *  while away, so this is only ever good news, and it says WHICH of the two
 *  arrived because that is exactly the decision the toggle made for you. */
export function sayAwayReturn(solid: string, raw: string): void {
  const parts: string[] = [];
  if (Number(solid) > 0) parts.push(`${formatWhole(solid)} ${READOUTS.solid.noun}`);
  if (Number(raw) > 0) parts.push(`${formatWhole(raw)} ${READOUTS.raw.noun}`);
  if (parts.length > 0) say('away-return', `while away: ${parts.join(' · ')}`);
}
