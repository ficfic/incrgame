// THE CAMP'S SAVE. Its own key, its own shape — the old game's saves stay
// untouched on theirs, so flipping back loses nobody anything.
import { BOONS, CITY_VERSION, GOBLINS, LOG_KEEP, MAX_GAUGE, RATION_PACK, SITE, initial,
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
  if (g.forays !== undefined && !whole(g.forays, 0, 1e6)) return null;
  if (g.famine !== undefined && !num(g.famine, 0, 1e6)) return null;
  if (g.forage !== undefined && g.forage !== null) {
    if (!num(g.forage.left, 0, 9999) || !num(g.forage.secs, 0.001, 9999)) return null;
  }
  if (g.lost !== undefined && typeof g.lost !== 'boolean') return null;
  // ★★ THE ARMOURY MAKES SPEARS NOW, 2026-08-10 — `arms` became `spears`
  // when the abstract counter got a name (see engine.ts). The MIGRATION is
  // two lines and saves are only breakable when the fix is dear, so an older
  // save's `arms` is READ AS the spears it always was — on the hero and on
  // the veteran both. The value is validated after the move, never before,
  // so a junk `arms: 1.5` is still refused at the door.
  const reword = <T extends object>(o: T): T => {
    const { arms, ...rest } = o as T & { arms?: unknown };
    return { ...rest, spears: arms } as unknown as T;
  };
  if (g.hero !== undefined && typeof g.hero === 'object' && g.hero !== null
    && g.hero.spears === undefined) g.hero = reword(g.hero);
  if (g.legacy !== undefined && typeof g.legacy === 'object' && g.legacy !== null
    && g.legacy.spears === undefined) g.legacy = reword(g.legacy);
  if (g.legacy !== undefined) {
    if (typeof g.legacy !== 'object' || g.legacy === null) return null;
    if (!whole(g.legacy.runs, 0, 9999) || !whole(g.legacy.spears, 0, 999)) return null;
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
  // ★★ WORKS UNDER CONSTRUCTION, 2026-08-10. Same shape as `laying`, but
  // keyed by SITE ID — so unlike a path key it must name real ground, or the
  // panel's `SITE.get(id)!.allows` throws on the first paint the way a
  // `site: 99` fight once did. An old save with no jobs defaults to {}.
  if (g.raising !== undefined) {
    if (typeof g.raising !== 'object' || g.raising === null) return null;
    for (const [k, v] of Object.entries(g.raising)) {
      const job = v as { left: number; secs: number };
      if (!SITE.has(Number(k))) return null;
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
      if (!near || pathKey(a!, b!) !== k || !whole(v, 1, 9)) return null;
      // ★★ WIDENED ROADS COME HOME NARROW (2026-08-11). Widening was deleted,
      // so `MAX_GAUGE` is 1 — and every save written before today has gauge
      // 2s and 3s in it, including the owner's, who widened Rock Face on the
      // playthrough that ordered the deletion. Rejecting those saves would
      // have thrown the run away over a number that is now cosmetic, so they
      // are CLAMPED instead. The road stays; it is simply as wide as roads
      // get now.
      if (v > MAX_GAUGE) g.paths[k] = MAX_GAUGE;
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
  // ★ THE AMBUSH MARK (2026-08-10). Defaulted, not merely validated — the
  // same trap that left `hero.at` undefined and made every road unreachable.
  // ★ THE POSTED WATCH (2026-08-11), defaulted for every older save.
  // ★ THE STOREHOUSE'S HAMMER (2026-08-11), defaulted for older saves.
  // ★ HIRED CREWS (2026-08-11), defaulted for every older save.
  // ★ THE EVENT LOG (N2, 2026-08-11), defaulted for every older save.
  // ★ THE VALLEY'S CLOCK (N3, 2026-08-11). Older saves start it at zero,
  // which is generous — their camps have not swollen at all.
  // ★ WHAT THE HERO MET (N5, 2026-08-11), defaulted for older saves.
  // ★ THE LEVY AND THE HURT (2026-08-11), defaulted for every older save —
  // including one written in the middle of a fight, whose line has no levy.
  // ★ THE BLUEPRINTS (2026-08-11), defaulted for every older save. An id the
  // deck does not know is dropped rather than refused — a deck that shrinks
  // between versions must not cost anybody their run.
  if (g.boons === undefined || g.boons === null) g.boons = [];
  else if (!Array.isArray(g.boons)) return null;
  else g.boons = g.boons.filter((b: unknown) =>
    typeof b === 'string' && BOONS.some((x) => x.id === b));
  if (g.draft === undefined) g.draft = null;
  else if (g.draft !== null) {
    if (!Array.isArray(g.draft)) return null;
    g.draft = g.draft.filter((b: unknown) =>
      typeof b === 'string' && BOONS.some((x) => x.id === b));
    if (g.draft.length === 0) g.draft = null;
  }
  if (g.levy === undefined) g.levy = 0;
  else if (!whole(g.levy, 0, 999)) return null;
  if (g.hurt === undefined) g.hurt = 0;
  else if (!whole(g.hurt, 0, 9999)) return null;
  if (g.fight !== undefined && g.fight !== null && g.fight.us === undefined) {
    g.fight.us = [];
  }
  if (g.meet === undefined) g.meet = null;
  else if (g.meet !== null && !whole(g.meet, 0, 99)) return null;
  if (g.since === undefined) g.since = 0;
  else if (!num(g.since, 0, 1e9)) return null;
  if (g.log === undefined || g.log === null) g.log = [];
  else if (!Array.isArray(g.log) || g.log.some((l: unknown) => typeof l !== 'string')) return null;
  else if (g.log.length > LOG_KEEP) g.log = g.log.slice(-LOG_KEEP);
  if (g.hire === undefined || g.hire === null) g.hire = {};
  else if (typeof g.hire !== 'object') return null;
  else for (const [k, v] of Object.entries(g.hire)) {
    if (SITE.get(Number(k)) === undefined || !whole(v, 1, 99)) return null;
  }
  if (g.stowing === undefined) g.stowing = null;
  else if (g.stowing !== null
    && (!num(g.stowing.left, 0, 9999) || !num(g.stowing.secs, 0.001, 9999))) return null;
  if (g.guard === undefined || g.guard === null) g.guard = {};
  else if (typeof g.guard !== 'object') return null;
  else for (const [k, v] of Object.entries(g.guard)) {
    if (SITE.get(Number(k)) === undefined || !whole(v, 1, 999)) return null;
  }
  if (g.ambush === undefined || g.ambush === null) g.ambush = null;
  else if (typeof g.ambush !== 'object'
    || SITE.get(g.ambush.at) === undefined
    || !num(g.ambush.left, 0, 999)) return null;
  if (g.hero !== undefined) {
    if (typeof g.hero !== 'object' || g.hero === null) return null;
    if (!num(g.hero.hp, 0, 99) || !num(g.hero.spears, 0, 99) || !num(g.hero.part, 0, 2)) return null;
    // ★ WHERE THEY STAND, and the road they are on. An old save defaults to
    // the camp standing still, which is conceptually exactly where a hero
    // with no position was.
    // ⚠️ DEFAULTED, NOT MERELY VALIDATED. Every save written before the hero
    // had a place lacks `at`, and an undefined `at` means `legsBetween` can
    // find no road anywhere — so every march is refused and every fight on
    // the map becomes unreachable. Validation alone let that through; the
    // test that should have caught it read `back.hero.at ?? 0`, which passes
    // on undefined. Both fixed.
    if (g.hero.at === undefined) g.hero.at = 0;
    if (g.hero.trip === undefined) g.hero.trip = null;
    if (SITE.get(g.hero.at) === undefined) return null;
    if (g.hero.trip !== undefined && g.hero.trip !== null) {
      if (SITE.get(g.hero.trip.to) === undefined) return null;
      if (!num(g.hero.trip.left, 0, 9999) || !num(g.hero.trip.secs, 0.001, 9999)) return null;
    }
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
      && whole(f.packs, 0, RATION_PACK)
      // ★★ THE ORDER IN FLIGHT, 2026-08-10. A blow is a `{left, secs, act}`
      // job like a path's or a works' — but keyed by an ACT, so an unknown
      // verb must die at the door or `lands()` would fall through to a
      // strike the player never called. Missing (an older save, or a save
      // taken between orders) is the ordinary case: no blow in flight.
      && (f.blow === undefined || f.blow === null
        || (typeof f.blow === 'object'
          && num(f.blow.left, 0, 1e6) && num(f.blow.secs, 0, 1e6)
          && (f.blow.act === 'strike' || f.blow.act === 'guard'
            || f.blow.act === 'ration')));
    if (!sound) g.fight = null;
    else g.fight = { ...(f as NonNullable<City['fight']>), blow: f.blow ?? null };
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
