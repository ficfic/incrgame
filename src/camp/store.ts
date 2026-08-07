// THE CAMP'S SAVE. Its own key, its own shape — the old game's saves stay
// untouched on theirs, so flipping back loses nobody anything.
import { CITY_VERSION, initial, type City } from './engine';

const KEY = 'camp-save';

interface Blob { game: unknown; savedAt: number }

const num = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** Refuse anything that is not a camp save. Additive fields default. */
export function honour(b: Blob | null | undefined): { game: City; savedAt: number } | null {
  if (!b || typeof b !== 'object') return null;
  const g = b.game as Partial<City> | null;
  if (!g || typeof g !== 'object') return null;
  if (g.version !== CITY_VERSION) return null;
  if (!num(b.savedAt, 0, 8.64e15)) return null;
  for (const k of ['stone', 'logs', 'planks', 'pop', 'popPart'] as const) {
    if (g[k] !== undefined && !num(g[k], 0, 1e9)) return null;
  }
  if (g.stacks !== undefined && (typeof g.stacks !== 'object' || g.stacks === null)) return null;
  if (g.paths !== undefined && (typeof g.paths !== 'object' || g.paths === null)) return null;
  if (g.goblins !== undefined) {
    if (typeof g.goblins !== 'object' || g.goblins === null) return null;
    for (const v of Object.values(g.goblins)) if (!num(v, 0, 9999)) return null;
  }
  if (g.hero !== undefined) {
    if (typeof g.hero !== 'object' || g.hero === null) return null;
    if (!num(g.hero.hp, 0, 99) || !num(g.hero.arms, 0, 99) || !num(g.hero.part, 0, 2)) return null;
  }
  if (g.fight !== undefined && g.fight !== null
    && !(typeof g.fight === 'object' && Number.isInteger((g.fight as { site: number }).site))) return null;
  return { game: { ...initial(), ...g }, savedAt: b.savedAt };
}

export function load(): { game: City; savedAt: number } | null {
  try {
    return honour(JSON.parse(localStorage.getItem(KEY) ?? 'null') as Blob | null);
  } catch {
    return null;
  }
}

export function save(g: City): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ game: g, savedAt: Date.now() }));
  } catch { /* a full disk loses the interval save, never the game */ }
}

export function wipe(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to lose */ }
}

export const exportRaw = (g: City): string =>
  JSON.stringify({ game: g, savedAt: Date.now() });

export function importRaw(raw: string): { game: City; savedAt: number } | null {
  try {
    return honour(JSON.parse(raw) as Blob);
  } catch {
    return null;
  }
}

export const elapsedSince = (savedAt: number): number =>
  Math.max(0, (Date.now() - savedAt) / 1000);
