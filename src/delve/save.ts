// THE SAVE — pure, testable, and the reason the game exists between sessions.
//
// ⚠️ THE DELVE SHIPPED FOUR TIMES WITH NO PERSISTENCE AT ALL. `Delve.svelte`
// held the state in a rune and nothing else, so closing the tab threw away the
// hoard, the kit and everything the crawler had ever filed. On a phone, where
// the browser reclaims a background tab whenever it likes, that is not "saves
// are breakable" — it is a game that cannot be played across a bus ride.
//
// ★ IndexedDB, NOT localStorage, via `src/shell/storage.ts` — iOS evicts
// localStorage after about seven idle days and the owner plays on iOS Edge.
//
// ★ AND THE PARSING IS PURE. Everything below is `string -> Delve | null`
// with no browser in it, so the interesting half — a truncated blob, a save
// from a format that no longer exists, somebody else's JSON — is unit-tested
// rather than hoped about.
import { DELVE_VERSION, initial, type Delve, type Kit } from './engine';

export const SAVE_KEY = 'delve';

/** ★★★ HOW LONG ONE OFFLINE STEP TAKES. The engine has no clock and is not
 *  getting one — this is the ONLY place in the game where a wall clock is read,
 *  and it converts to TURNS at the door. Ninety seconds a room: a lunch break
 *  is a few rooms, a night is a finished report.
 *  ⚠️ IN THE SAVE LAYER, not the engine, because a pure `apply` that read the
 *  clock would make every test a race. */
export const AWAY_SECS = 90;

/** What the save records so the game can tell how long it was shut.
 *
 *  ⚠️ THE FIELD IS `shut`, AND IT USED TO BE `at`. Which is ALSO the room the
 *  delver is standing in — so an old unstamped save, whose `at` is the number
 *  0, read as "saved at the epoch" and handed out EIGHTEEN MILLION offline
 *  steps. A wrapper field named the same as a field of the thing it wraps is a
 *  bug waiting for a birthday. */
export interface Stamped { shut: number; game: Delve }

export const stamp = (g: Delve, now: number): string =>
  JSON.stringify({ shut: now, game: g });

/** ★ How many crawler steps were owed by being away. 0 if the save is not
 *  stamped, or the clock went backwards — a device whose time changed must not
 *  hand out progress. */
export function owed(text: string | null, now: number): number {
  if (!text) return 0;
  try {
    const raw: unknown = JSON.parse(text);
    const box = raw as Partial<Stamped>;
    // ⚠️ BOTH FIELDS, OR IT IS NOT A STAMP. Recognising a wrapper by one loose
    // number is exactly how the raw game got mistaken for one.
    if (!box || typeof box !== 'object' || !box.game) return 0;
    if (typeof box.shut !== 'number' || !Number.isFinite(box.shut)) return 0;
    const secs = (now - box.shut) / 1000;
    return secs <= 0 ? 0 : Math.floor(secs / AWAY_SECS);
  } catch {
    return 0;
  }
}

export const pack = (g: Delve): string => JSON.stringify(g);

/** ★★★ WHAT CAME BACK, or null if it is not a save of this game at this
 *  version.
 *
 *  ⚠️ NULL IS A FINE ANSWER. `CLAUDE.md`, reversed by the owner on 2026-07-27:
 *  *"i'm completely ok with breaking saves at any time"* — migrations are
 *  optional, and a reset is allowed as long as it is not SILENT. So `version`
 *  is still written on every save, because that is what lets the code TELL
 *  which format it is holding instead of crashing halfway through trusting it.
 *
 *  ⚠️ AND IT NEVER THROWS. A save that blows up on load is worse than no save:
 *  it is a game that will not open, on a device with no console. */
export function unpack(text: string | null): Delve | null {
  if (!text) return null;
  try {
    const outer: unknown = JSON.parse(text);
    if (!outer || typeof outer !== 'object') return null;
    // ★ Saves are stamped with the wall clock now, so the game can tell how
    // long it was shut. An older, unstamped save is still a save.
    const box = outer as Partial<Stamped>;
    const raw = box.game && typeof box.shut === 'number' ? box.game : outer;
    if (!raw || typeof raw !== 'object') return null;
    const g = raw as Partial<Delve>;
    if (g.version !== DELVE_VERSION) return null;
    // A shape check, not a schema: enough that the screen cannot be handed
    // `undefined` where it expects a list and die on the first frame.
    if (typeof g.at !== 'number' || typeof g.hp !== 'number') return null;
    if (!Array.isArray(g.seen) || !Array.isArray(g.foes)) return null;
    if (!Array.isArray(g.cleared) || !Array.isArray(g.bars)) return null;
    if (!g.kit || typeof g.kit.lamp !== 'number') return null;
    // ★ FILLED FROM `initial()` FIRST, so a save written before a field
    // existed still loads with a sane value for it rather than `undefined`.
    //
    // ⚠️ AND THE KIT IS FILLED FIELD BY FIELD, because a spread replaces the
    // whole object. A save carrying a kit written before `flask` existed loaded
    // with `flask: undefined`, and the shop chip then offered "+NaN light" —
    // which the browser probe printed on a real screen while every unit test
    // and the typechecker were happy, because `Partial<Delve>` says the kit is
    // a `Kit` and the JSON says otherwise.
    const filled = { ...initial(), ...(g as Delve) };
    return { ...filled, kit: { ...initial().kit, ...(g.kit as Kit) } };
  } catch {
    return null;
  }
}

/** ★ WHAT THE OWNER MOVES BETWEEN DEVICES. Base64 so it survives being pasted
 *  into a message box, and prefixed so a wrong paste is recognisably wrong
 *  rather than merely broken. `CLAUDE.md`: export/import keeps working. */
const MARK = 'DELVE1:';

export const toText = (g: Delve): string =>
  MARK + btoa(unescape(encodeURIComponent(pack(g))));

export function fromText(text: string): Delve | null {
  const body = text.trim();
  if (!body.startsWith(MARK)) return null;
  try {
    return unpack(decodeURIComponent(escape(atob(body.slice(MARK.length)))));
  } catch {
    return null;
  }
}
