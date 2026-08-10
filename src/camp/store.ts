// THE CAMP'S SAVE. Its own key, its own shape — the old game's saves stay
// untouched on theirs, so flipping back loses nobody anything.
import { CITY_VERSION, GOBLINS, MAX_GAUGE, RATION_PACK, SITE, initial,
  pathKey, type City } from './engine';

const KEY = 'camp-save';

interface Blob { game: unknown; savedAt: number }

const num = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
/** People and buildings are WHOLE — the owner's staffing ruling, enforced
 *  at the door as well as in the engine. */
const whole = (v: unknown, lo: number, hi: number): v is number =>
  num(v, lo, hi) && Number.isInteger(v);

/** Refuse anything that is not a camp save. Additive fields default. */
export function honour(b: Blob | null | undefined): { game: City; savedAt: number } | null {
  if (!b || typeof b !== 'object') return null;
  const g = b.game as Partial<City> | null;
  if (!g || typeof g !== 'object') return null;
  if (g.version !== CITY_VERSION) return null;
  if (!num(b.savedAt, 0, 8.64e15)) return null;
  for (const k of ['stone', 'logs', 'planks', 'food', 'pop', 'popPart'] as const) {
    if (g[k] !== undefined && !num(g[k], 0, 1e9)) return null;
  }
  // Storehouses are whole buildings, like every other count.
  if (g.store !== undefined && !whole(g.store, 0, 9999)) return null;
  if (g.carts !== undefined && !whole(g.carts, 0, 9999)) return null;
  // Menace is a fraction per holding, 0..1 — never a count.
  if (g.taken !== undefined && !whole(g.taken, 0, 999)) return null;
  if (g.lost !== undefined && typeof g.lost !== 'boolean') return null;
  if (g.legacy !== undefined) {
    if (typeof g.legacy !== 'object' || g.legacy === null) return null;
    if (!whole(g.legacy.runs, 0, 9999) || !whole(g.legacy.arms, 0, 999)) return null;
  }
  if (g.menace !== undefined) {
    if (typeof g.menace !== 'object' || g.menace === null) return null;
    for (const v of Object.values(g.menace)) if (!num(v, 0, 1)) return null;
  }
  // ⚠️ VALUES, NOT JUST SHAPES (review finding, 2026-08-08): `stacks:{1:"x"}`
  // used to load clean, NaN-poison every rate through `flow()`, and then the
  // NEXT save — now carrying `NaN` stone — was refused outright. A junk import
  // silently ate the town one session later. Every map is checked to the leaf.
  if (g.stacks !== undefined) {
    if (typeof g.stacks !== 'object' || g.stacks === null) return null;
    for (const [k, v] of Object.entries(g.stacks)) {
      if (!SITE.has(Number(k)) || !whole(v, 0, 9999)) return null;
    }
  }
  if (g.laying !== undefined) {
    if (typeof g.laying !== 'object' || g.laying === null) return null;
    for (const v of Object.values(g.laying)) {
      const job = v as { left: number; secs: number };
      if (!num(job?.left, 0, 1e6) || !num(job?.secs, 0, 1e6)) return null;
    }
  }
  if (g.crew !== undefined) {
    if (typeof g.crew !== 'object' || g.crew === null) return null;
    // Whole hands only — `2.5` used to load and print "hands 2.5 of 8".
    for (const [k, v] of Object.entries(g.crew)) {
      if (!SITE.has(Number(k)) || !whole(v, 0, 999)) return null;
    }
  }
  if (g.paths !== undefined) {
    if (typeof g.paths !== 'object' || g.paths === null) return null;
    for (const [k, v] of Object.entries(g.paths)) {
      // A key must name a REAL pair of neighbours in its sorted form, or the
      // gauge is unreachable ink the component walk will never see.
      const [a, b] = k.split('|').map(Number);
      const near = SITE.get(a!)?.near.includes(b!);
      if (!near || pathKey(a!, b!) !== k || !whole(v, 1, MAX_GAUGE)) return null;
    }
  }
  if (g.goblins !== undefined) {
    if (typeof g.goblins !== 'object' || g.goblins === null) return null;
    for (const [k, v] of Object.entries(g.goblins)) {
      // ⚠️ ANY SITE, NOT JUST THE SIX ORIGINAL HOLDINGS (2026-08-09). A raid
      // can now TAKE ground, which puts goblins on Rock Face or the camp —
      // states the game reaches in ordinary play. Checking against `GOBLINS`
      // refused those saves on reload, silently wiping a run the moment the
      // goblins took their first site.
      if (SITE.get(Number(k)) === undefined || !num(v, 0, 9999)) return null;
    }
  }
  if (g.hero !== undefined) {
    if (typeof g.hero !== 'object' || g.hero === null) return null;
    if (!num(g.hero.hp, 0, 99) || !num(g.hero.arms, 0, 99) || !num(g.hero.part, 0, 2)) return null;
  }
  if (g.fight !== undefined && g.fight !== null) {
    // The battle strip's whole shape, or no fight at all: an old-shape or
    // mangled fight drops to null (fights are transient), the town stays.
    const f = g.fight as Partial<NonNullable<City['fight']>>;
    const sound = typeof f === 'object'
      // ⚠️ A REAL HELD GROUND, not merely an integer: `site: 99` used to be
      // accepted, and the panel's `SITE.get(99)!.name` then threw on the
      // first render — a crafted save killed the whole screen.
      && GOBLINS[f.site as number] !== undefined
      && Array.isArray(f.sq) && f.sq.length === 3
      && f.sq.every(q => q && num(q.hp, 0, 9999) && num(q.poke, 0, 99)
        && (q.kind === 'brute' || q.kind === 'runt'))
      && whole(f.target, 0, 2)
      && whole(f.round, 0, 1e6)
      // ⚠️ THE PACK IS THE RATION RULING. Missing, it read `undefined <= 0`
      // → false, spent to `NaN`, and `NaN <= 0` is false forever: unlimited
      // rations from any packless save.
      && whole(f.packs, 0, RATION_PACK);
    if (!sound) g.fight = null;
  }
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
