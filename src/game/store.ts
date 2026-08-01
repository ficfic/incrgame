// SAVING. IndexedDB via the existing blob store, which is the one piece of the
// old shell worth carrying over: localStorage is evicted by iOS after about a
// week idle, which is exactly the gap between sittings this game is built for.
import { loadBlob, saveBlob, deleteBlob, requestPersistence } from '../shell/storage';
import { initial, type Game } from './engine';
import { PLACE } from './places';

// ⚠️ 3 RESETS EVERY SAVE, and deliberately. `part` changed meaning from banked
// SECONDS to banked fractional PACES when the rate stopped being a constant, so
// a version-2 save would pay its remainder out against the wrong clock — and it
// carries no `settled`, which is now the difference between an income and none.
// `CLAUDE.md`: saves are breakable, say so plainly when one breaks.
export const SAVE_VERSION = 3;   // settling, working, and a rate solved from the graph

interface Blob { v: number; savedAt: number; game: Game }

export async function save(g: Game): Promise<void> {
  const blob: Blob = { v: SAVE_VERSION, savedAt: Date.now(), game: g };
  await saveBlob(JSON.stringify(blob)).catch(() => {});
}

/** ⚠️ A SAVE WE CANNOT HONOUR IS REFUSED, NOT REPAIRED. A half-loaded run is
 *  worse than a fresh one because it looks like a save. Checked against the
 *  CONTENT, not just the types: a position naming a place that no longer exists
 *  would type-check and then strand the player. */
export async function load(): Promise<{ game: Game; savedAt: number } | null> {
  const raw = await loadBlob().catch(() => null);
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Blob;
    if (b?.v !== SAVE_VERSION || typeof b.savedAt !== 'number') return null;
    const g = b.game;
    if (!g || !PLACE.has(g.at)) return null;
    if (!Array.isArray(g.seen) || !g.seen.every((id) => PLACE.has(id))) return null;
    if (!g.seen.includes(g.at)) return null;
    if (!Number.isFinite(g.paces) || g.paces < 0) return null;
    if (!Number.isFinite(g.part) || g.part < 0) return null;
    if (!Array.isArray(g.solid) || !g.solid.every((k) => typeof k === 'string')) return null;
    // ⚠️ ABSENT IS FINE; PRESENT AND WRONG IS NOT. These four fields did not
    // exist before this version, and the property this whole file rests on is
    // that a save written before a feature still loads and takes the default.
    // Rejecting a MISSING field would break that for every field added from now
    // on — which is the opposite of the guarantee, and the first version of
    // these lines did exactly that. Checked only when the save actually carries
    // one.
    //
    // `settled` is checked against the CONTENT like `at` and `seen` are: a
    // settled place that no longer exists is a source the flow solve can never
    // find, so the player would be paying for an income that is silently absent.
    if (g.settled !== undefined
      && (!Array.isArray(g.settled) || !g.settled.every((id) => PLACE.has(id)))) return null;
    if (g.wayfaring !== undefined
      && (!Number.isFinite(g.wayfaring) || g.wayfaring < 0)) return null;
    if (g.workPart !== undefined
      && (!Number.isFinite(g.workPart) || g.workPart < 0)) return null;
    if (g.busy !== undefined && g.busy !== 'rest' && g.busy !== 'work') return null;
    // A half-made route pointing at nothing would draw a line to nowhere and
    // never finish. Refused, not repaired.
    if (g.forging && !(typeof g.forging.key === 'string'
      && Number.isFinite(g.forging.left) && Number.isFinite(g.forging.secs)
      && g.forging.secs > 0)) return null;
    void requestPersistence();
    return { game: { ...initial(), ...g }, savedAt: b.savedAt };
  } catch {
    return null;
  }
}

export const elapsedSince = (savedAt: number): number =>
  Math.max(0, (Date.now() - savedAt) / 1000);

export async function wipe(): Promise<void> {
  await deleteBlob().catch(() => {});
}
