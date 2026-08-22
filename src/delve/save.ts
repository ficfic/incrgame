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
import { DELVE_VERSION, initial, type Delve } from './engine';

export const SAVE_KEY = 'delve';

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
    const raw: unknown = JSON.parse(text);
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
    return { ...initial(), ...(g as Delve) };
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
