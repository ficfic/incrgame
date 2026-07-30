// READING AND WRITING A RUN.
//
// Pure: `encode` and `decode` touch no browser API, so they are testable and
// the IndexedDB layer (`src/shell/storage.ts`) stays where it is — outside the
// engine, unchanged, and reused rather than rewritten.
//
// ⚠️ THE SEED IS PART OF THE SAVE, AND THAT IS THE WHOLE POINT. A save that
// comes back with a different seed is a different game: the next check you make
// would roll differently from the one you were about to make when you closed
// the tab. `docs/DICE.md` promises determinism across a reload and across
// devices, and this file is where that promise is either kept or quietly
// broken.
//
// Saves are breakable (CLAUDE.md, reversed 2026-07-27), so a save this code
// does not recognise is REFUSED, not repaired. A half-loaded run is worse than
// a fresh one, because it looks like a save.
import { initial, type Slice, type SkillId } from './engine';
import { PLACE, ITEMS, type ItemId } from './content';

/** Bumped whenever the shape changes. A save from any other version is
 *  refused — see the note above about not repairing what we do not recognise. */
export const SAVE_VERSION = 1;

export function encode(s: Slice): string {
  // `lastRoll` is deliberately NOT saved. It is the dice sitting on the table
  // from the action you just took, and restoring it would show a throw the
  // player did not make in this sitting. The seed is what carries.
  const { lastRoll: _drop, ...keep } = s;
  return JSON.stringify({ ...keep, version: SAVE_VERSION });
}

const SKILL_IDS: readonly SkillId[] = ['wayfaring', 'lore', 'craft'];

const isFiniteInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

/** Turn a blob back into a run, or null if it is not one we can honour.
 *
 *  Every field is checked against the CONTENT, not just against a type: a
 *  position naming a place that no longer exists, or an item that was renamed,
 *  would type-check perfectly and then strand the player somewhere the board
 *  cannot draw. Six places is exactly when that is cheap to verify. */
export function decode(blob: string): Slice | null {
  let raw: unknown;
  try {
    raw = JSON.parse(blob);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;

  if (o.version !== SAVE_VERSION) return null;
  if (!isFiniteInt(o.seed) || o.seed < 0) return null;
  if (!isFiniteInt(o.at) || !PLACE.has(o.at)) return null;
  if (!isFiniteInt(o.satchels) || o.satchels < 0) return null;
  if (typeof o.said !== 'string') return null;

  if (!Array.isArray(o.seen) || !o.seen.every((id) => isFiniteInt(id) && PLACE.has(id))) return null;
  // Standing somewhere you have never been is not a state the game can produce.
  if (!o.seen.includes(o.at)) return null;

  if (!Array.isArray(o.pack)) return null;
  const pack: ItemId[] = [];
  for (const it of o.pack) {
    if (typeof it !== 'string' || !(it in ITEMS)) return null;
    pack.push(it as ItemId);
  }

  if (typeof o.xp !== 'object' || o.xp === null) return null;
  const xpIn = o.xp as Record<string, unknown>;
  const xp = {} as Record<SkillId, number>;
  for (const id of SKILL_IDS) {
    const v = xpIn[id];
    // A skill added since the save was written starts at zero rather than
    // refusing the whole run — that is additive and cannot strand anybody.
    if (v === undefined) { xp[id] = 0; continue; }
    if (!isFiniteInt(v) || v < 0) return null;
    xp[id] = v;
  }

  let job: Slice['job'] = null;
  if (o.job !== null && o.job !== undefined) {
    if (typeof o.job !== 'object') return null;
    const j = o.job as Record<string, unknown>;
    if (typeof j.work !== 'string' || !isFiniteInt(j.at) || !isFiniteInt(j.left)) return null;
    // The job must still name real work at a real place, or the tick reducer
    // would cancel it on the first frame and the bar would vanish unexplained.
    if (PLACE.get(j.at)?.work?.id !== j.work) return null;
    job = { work: j.work, at: j.at, left: j.left };
  }

  return {
    version: SAVE_VERSION,
    seed: o.seed,
    at: o.at,
    seen: [...o.seen] as number[],
    xp,
    pack,
    satchels: o.satchels,
    job,
    said: o.said,
    lastRoll: null,
  };
}

/** What the owner copies between devices.
 *
 *  Base64 rather than raw JSON: the blob has to survive being pasted into a
 *  notes app, a chat window and a URL bar without a helpful editor turning its
 *  quotes into curly ones. `docs/SPEC.md` — export/import is how a save moves
 *  between the owner's phone and anything else, and it is the reason this
 *  exists at all now that saves are otherwise disposable. */
export function toText(s: Slice): string {
  const json = encode(s);
  return typeof btoa === 'function'
    ? btoa(json)
    : Buffer.from(json, 'utf8').toString('base64');
}

export function fromText(text: string): Slice | null {
  const t = text.trim();
  if (!t) return null;
  // Accept raw JSON too. Somebody will paste the unwrapped thing eventually and
  // refusing it would be a puzzle, not a safeguard.
  if (t.startsWith('{')) return decode(t);
  try {
    const json = typeof atob === 'function'
      ? atob(t)
      : Buffer.from(t, 'base64').toString('utf8');
    return decode(json);
  } catch {
    return null;
  }
}

/** A run to start from: the save if there is an honourable one, else a new run.
 *  Never throws — a broken save must not stop the game from opening. */
export function restore(blob: string | null, fallbackSeed?: number): Slice {
  if (blob) {
    const s = decode(blob);
    if (s) return s;
  }
  return initial(fallbackSeed);
}
