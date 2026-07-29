// Save format. The blob is base64(JSON({version, state})) — the SAME blob goes
// to IndexedDB and to the clipboard export, which is how the owner moves a save
// between devices.
//
// ---- MIGRATIONS ARE GONE, AND THAT IS A DECISION ------------------------
//
// This file used to open with "NEVER break an existing save" and carry fifteen
// ordered forward migrations. The owner reversed that rule on 2026-07-27
// ("i'm completely ok with breaking saves at any time", DECISIONS.md), and the
// SOLID·RAW·ROT rewrite deletes twenty-three of the thirty-five fields those
// migrations existed to carry. A v15 save has no Solid, no Raw, no Rot and no
// `held`; there is nothing to lift.
//
// Two things still stand, for two different reasons:
//
//   `version` STAYS ON EVERY SAVE. Not so the code can migrate — so it can TELL
//   which format it is holding, and reset deliberately instead of crashing on a
//   field that is not there. That is exactly what happens below.
//
//   EXPORT/IMPORT KEEPS WORKING, on the new shape, because it is the only way a
//   save moves between devices.
//
// And one kindness, because it is cheap: an unreadable save's CONCEPTS are
// carried into the fresh state. You keep the board you walked; you lose the
// economy that sat on it.
import type { GameState } from './types';
import { CURRENT_SAVE_VERSION, initialState } from './engine';
import { CONCEPT_BUDGET } from '../content/ontologyMeta';
import { SEED_NODES } from '../content/seed';

interface Envelope {
  version: number; // mirrors state.version; state is authoritative
  state: GameState;
}

/** What a load produced, and whether the player needs telling.
 *
 *  A reset with no notice is still a defect (CLAUDE.md). The shell shows
 *  `notice` verbatim; it is the only thing in this file the player ever reads. */
export interface LoadResult {
  state: GameState;
  /** True when the save could not be carried forward and was rebuilt. */
  reset: boolean;
  /** Empty unless `reset`. */
  notice: string;
}

// ---- pure base64 over UTF-8 (no btoa/atob: core stays environment-free) ----
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToB64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!, b = bytes[i + 1], c = bytes[i + 2];
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!;
    out += b === undefined ? '=' : B64[(n >> 6) & 63]!;
    out += c === undefined ? '=' : B64[n & 63]!;
  }
  return out;
}

function b64ToBytes(s: string): Uint8Array {
  const clean = s.replace(/[\s=]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let acc = 0, bits = 0, j = 0;
  for (const ch of clean) {
    const v = B64.indexOf(ch);
    if (v < 0) throw new Error('invalid base64 in save blob');
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[j++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}

// ---- serialize / deserialize ----

export function serialize(state: GameState): string {
  const envelope: Envelope = { version: state.version, state };
  return bytesToB64(new TextEncoder().encode(JSON.stringify(envelope)));
}

/** Every concept id we can find in an unrecognised save, whatever shape it was.
 *
 *  v16 stores them in `held`; every version before it stored them in
 *  `forged.anchors`. Both are read, because "keep the board" is the one promise
 *  this reset makes and getting it from the wrong field would silently break
 *  it. Ids are bounds-checked against the shipped dataset: a save written
 *  against a re-cut ontology can hold ids that no longer exist. */
function rescueConcepts(raw: Record<string, unknown>): number[] {
  const forged = (raw.forged ?? {}) as { anchors?: unknown };
  const candidates = [raw.held, forged.anchors].find(Array.isArray) as unknown[] | undefined;
  const out = new Set<number>(SEED_NODES);
  for (const v of candidates ?? []) {
    if (Number.isInteger(v) && (v as number) >= 0 && (v as number) < CONCEPT_BUDGET) {
      out.add(v as number);
    }
  }
  return [...out];
}

/** Decode. Throws only on GARBAGE — a save that is merely from another format
 *  is rebuilt rather than thrown, because a player who cannot open the game is
 *  worse off than a player who lost their Solid.
 *
 *  Callers keep the old blob on a throw, so a truncated paste cannot destroy a
 *  working save. */
export function deserialize(blob: string): LoadResult {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(b64ToBytes(blob.trim())));
  if (typeof parsed !== 'object' || parsed === null || !('state' in parsed)) {
    throw new Error('not a save envelope');
  }
  const raw = (parsed as Envelope).state as unknown as Record<string, unknown>;
  if (typeof raw !== 'object' || raw === null) throw new Error('save has no state');

  const version = typeof raw.version === 'number'
    ? raw.version
    // Pre-v16 saves named it `saveVersion`. Read it so the notice can say which
    // format it was, rather than "v0".
    : typeof raw.saveVersion === 'number' ? raw.saveVersion : 0;

  if (version !== CURRENT_SAVE_VERSION) {
    const held = rescueConcepts(raw);
    const kept = held.length - SEED_NODES.length;
    return {
      state: { ...initialState(), held },
      reset: true,
      notice: `Save v${version} predates the SOLID·RAW·ROT economy and could not be `
        + `carried forward. It has been rebuilt as a new run; ${kept} concept`
        + `${kept === 1 ? '' : 's'} you had already walked were kept.`,
    };
  }

  // Same version: backfill anything a partial write left out, per record, so a
  // missing key arrives as its default rather than as `undefined`.
  //
  // PER-KEY, NOT JUST TOP-LEVEL. A one-level spread made "we backfill missing
  // fields" true only of the OUTER object: `raw.machines` replaced the whole
  // record, so a newly-added MachineId arrived undefined, `buy` computed
  // `undefined + 1 === NaN`, and `JSON.stringify(NaN)` is `null` — a bricked
  // save with no error anywhere.
  const base = initialState();
  const r = raw as unknown as Partial<GameState>;
  return {
    state: {
      ...base,
      ...r,
      machines: { ...base.machines, ...(r.machines ?? {}) },
      watched: { ...base.watched, ...(r.watched ?? {}) },
      held: Array.isArray(r.held) ? r.held : base.held,
      // Same rule as `held`, and the reason a signed board did NOT cost a
      // version bump: a v17 save written before connections could be confirmed
      // simply has no key here, so it backfills to `[]` and loads as a run
      // where nothing has been signed yet — which is true. Saves do not reset.
      confirmed: Array.isArray(r.confirmed)
        ? r.confirmed.filter((k): k is string => typeof k === 'string')
        : base.confirmed,
      version: CURRENT_SAVE_VERSION,
    },
    reset: false,
    notice: '',
  };
}
