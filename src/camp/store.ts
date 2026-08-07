// THE CAMP'S SAVE. Its own key, its own shape — the old game's saves stay
// untouched on theirs, so flipping back loses nobody anything.
import { CAMP_VERSION, initial, type Camp } from './engine';

const KEY = 'camp-save';

interface Blob { game: unknown; savedAt: number }

const num = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Refuse anything that is not a camp save. Additive fields default. */
export function honour(b: Blob | null | undefined): { game: Camp; savedAt: number } | null {
  if (!b || typeof b !== 'object') return null;
  const g = b.game as Partial<Camp> | null;
  if (!g || typeof g !== 'object') return null;
  if (g.version !== CAMP_VERSION) return null;
  if (!num(b.savedAt, 0, 8.64e15)) return null;
  for (const k of ['stone', 'logs', 'planks', 'progress'] as const) {
    if (g[k] !== undefined && !num(g[k], 0, 1e9)) return null;
  }
  if (g.built !== undefined && (typeof g.built !== 'object' || g.built === null)) return null;
  if (g.paths !== undefined && (typeof g.paths !== 'object' || g.paths === null)) return null;
  return { game: { ...initial(), ...g }, savedAt: b.savedAt };
}

export function load(): { game: Camp; savedAt: number } | null {
  try {
    return honour(JSON.parse(localStorage.getItem(KEY) ?? 'null') as Blob | null);
  } catch {
    return null;
  }
}

export function save(g: Camp): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ game: g, savedAt: Date.now() }));
  } catch { /* a full disk loses the interval save, never the game */ }
}

export function wipe(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to lose */ }
}

export const exportRaw = (g: Camp): string =>
  JSON.stringify({ game: g, savedAt: Date.now() });

export function importRaw(raw: string): { game: Camp; savedAt: number } | null {
  try {
    return honour(JSON.parse(raw) as Blob);
  } catch {
    return null;
  }
}

export const elapsedSince = (savedAt: number): number =>
  Math.max(0, (Date.now() - savedAt) / 1000);
