// SAVING. IndexedDB via the existing blob store, which is the one piece of the
// old shell worth carrying over: localStorage is evicted by iOS after about a
// week idle, which is exactly the gap between sittings this game is built for.
import { loadBlob, saveBlob, deleteBlob, requestPersistence } from '../shell/storage';
import { initial, type Game } from './engine';
import { STOP } from './stops';

export const SAVE_VERSION = 5;   // King's Roads: roads are pipes with a gauge

interface Blob { v: number; savedAt: number; game: Game }

export async function save(g: Game): Promise<void> {
  const blob: Blob = { v: SAVE_VERSION, savedAt: Date.now(), game: g };
  await saveBlob(JSON.stringify(blob)).catch(() => {});
}

/** ⚠️ A SAVE WE CANNOT HONOUR IS REFUSED, NOT REPAIRED. A half-loaded run is
 *  worse than a fresh one because it looks like a save. Checked against the
 *  CONTENT, not just the types.
 *
 *  ⚠️ AND ABSENT IS FINE; PRESENT AND WRONG IS NOT. `load()` merges over
 *  `initial()`, so a field added tomorrow arrives at its default instead of
 *  `undefined` — and `undefined` in the first sum that touches it turns a run
 *  to NaN in silence. Rejecting a MISSING field would break that for every
 *  field added from here on. */
export async function load(): Promise<{ game: Game; savedAt: number } | null> {
  const raw = await loadBlob().catch(() => null);
  if (!raw) return null;
  try {
    const b = JSON.parse(raw) as Blob;
    if (b?.v !== SAVE_VERSION || typeof b.savedAt !== 'number') return null;
    const g = b.game;
    if (!g || !STOP.has(g.at)) return null;
    if (!Array.isArray(g.seen) || !g.seen.every((id) => STOP.has(id))) return null;
    if (!g.seen.includes(g.at)) return null;
    if (!Number.isFinite(g.mana) || g.mana < 0) return null;
    if (!Number.isFinite(g.part) || g.part < 0) return null;
    // Checked against the CONTENT: a road key naming stops that are not joined
    // would be a line the board draws to nowhere and the engine never walks.
    // ⚠️ A GAUGE MAP NOW, NOT A LIST. Still checked against the CONTENT: a key
    // naming stops that are not joined would be a pipe the board draws to
    // nowhere and the engine never walks, and a gauge that is not a positive
    // whole number would put a fraction into the flow solver.
    if (!g.gauge || typeof g.gauge !== 'object' || Array.isArray(g.gauge)) return null;
    for (const [k, n] of Object.entries(g.gauge)) {
      const [a, c] = String(k).split('|').map(Number);
      if (a === undefined || c === undefined) return null;
      if (!(STOP.get(a)?.near.includes(c) ?? false)) return null;
      if (!Number.isInteger(n) || (n as number) < 1) return null;
    }
    if (g.building && !(typeof g.building.key === 'string'
      && Number.isFinite(g.building.left) && Number.isFinite(g.building.secs)
      && g.building.secs > 0)) return null;
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
