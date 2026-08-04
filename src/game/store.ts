// SAVING. IndexedDB via the existing blob store, which is the one piece of the
// old shell worth carrying over: localStorage is evicted by iOS after about a
// week idle, which is exactly the gap between sittings this game is built for.
import { loadBlob, saveBlob, deleteBlob, requestPersistence } from '../shell/storage';
import { initial, type Game } from './engine';
import { STATS, MOMENTUM_MIN, MOMENTUM_MAX, legal } from './dice';
import { HAPPENINGS } from './events';
import { STOP } from './stops';

export const SAVE_VERSION = 8;   // the expedition: kit, provisions, failure

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
      && g.building.secs > 0 && STOP.has(g.building.from)
      && Array.isArray(g.building.halts)
      && g.building.halts.every((h) => typeof h === 'number' && h > 0 && h < 1)
      && ['cart', 'mule', 'packs'].includes(g.building.kit))) return null;
    // Checked against the CONTENT: a scavenge whose clock outruns its own
    // length, or leaning on a stat that is not a scavenging stat, would be a
    // countdown the dock can never end.
    if (g.foraging && !(Number.isFinite(g.foraging.secs) && g.foraging.secs > 0
      && Number.isFinite(g.foraging.left) && g.foraging.left >= 0
      && g.foraging.left <= g.foraging.secs
      && ['wits', 'shadow'].includes(g.foraging.stat))) return null;
    if (g.provisions !== undefined
      && !(Number.isInteger(g.provisions) && g.provisions >= 0 && g.provisions <= 10)) return null;
    if (g.stats !== undefined) {
      if (!g.stats || typeof g.stats !== 'object') return null;
      for (const k of STATS) {
        const v = (g.stats as Record<string, unknown>)[k];
        if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > 5) return null;
      }
    }
    if (g.momentum !== undefined
      && !(Number.isInteger(g.momentum) && g.momentum >= MOMENTUM_MIN
        && g.momentum <= MOMENTUM_MAX)) return null;
    // Checked against the CONTENT: a facing that names trouble nobody wrote
    // would be a dock stuck open forever with nothing in it.
    if (g.facing) {
      if (!HAPPENINGS.some((h) => h.id === g.facing!.event)) return null;
      if (g.facing.rolled && !(Number.isInteger(g.facing.rolled.choice)
        && legal(g.facing.rolled.roll))) return null;
    }
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
