// Save format & migrations (SPEC "Save format"). The blob is
// base64(JSON({version, state})) — the SAME blob goes to IndexedDB and to the
// clipboard export (the escape hatch). NEVER break an existing save: loading an
// older version runs forward migrations, never a hard reset.
import type { Dec, GameState } from './types';
import { CURRENT_SAVE_VERSION, initialState } from './engine';
import { add } from './numbers';
import { deriveGraph, projectGraph } from './graph';

interface Envelope {
  version: number; // mirrors state.saveVersion; state is authoritative
  state: GameState;
}

// Ordered pure steps, each vN → vN+1. On load, run every step where
// state.saveVersion < CURRENT_SAVE_VERSION. Add steps; never edit shipped ones.
type Migration = (s: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Migration[] = [
  // v1 → v2 — the one-substance fork (DECISIONS 2026-07-25): the early game
  // ran on Triples; v1 `data` balances converted 1:1 into `triples`.
  (s) => {
    const resources = { ...(s.resources as Record<string, Dec> | undefined) };
    const data = resources.data ?? '0';
    resources.triples = add(resources.triples ?? '0', data);
    resources.data = '0';
    return { ...s, resources };
  },
  // v2 → v3 — same-day retune (owner: the mined substance is DATUMS; Triples
  // returns as the refined M3 tier): balances consolidate back into `data`,
  // graph reprojected with the slow bands. Progress preserved 1:1 both hops.
  (s) => {
    const resources = { ...(s.resources as Record<string, Dec> | undefined) };
    const triples = resources.triples ?? '0';
    resources.data = add(resources.data ?? '0', triples);
    resources.triples = '0';
    return { ...s, resources, graph: projectGraph(resources.data) };
  },
  // v3 → v4 — Frontier Mining: edges drip Datums; the web becomes forged
  // overlay + balances. The pre-fork web is CREDITED, never stripped: its
  // projected edges mint `triples` (so the drip starts at the size of the web
  // the owner grew) and its nodes become folded machine-era mass.
  (s) => {
    const resources = { ...(s.resources as Record<string, Dec> | undefined) };
    const data = resources.data ?? '0';
    const old = projectGraph(data);
    resources.triples = add(resources.triples ?? '0', old.edges);
    resources.data = data;
    const forged = {
      nextId: 1,
      anchors: [0],
      links: [] as Array<[number, number]>,
      frontier: [] as number[],
      foldedNodes: String(Math.max(0, old.nodes - 1)),
    };
    return { ...s, resources, forged, graph: deriveGraph(forged, resources.triples) };
  },
  // v4 → v5 — provenance & collapse. Everything in a v4 save was placed BY HAND
  // by the player, one tap at a time, before machines existed. So all of it
  // becomes VERIFIED: unverified and drifted both start at zero. Nothing is
  // lost, nothing is reinterpreted, and the owner's real save arrives at the
  // new model with a perfect record — which is also the truth of how they
  // built it.
  (s) => ({
    ...s,
    provenance: { unverified: '0', drifted: '0' },
    syntheticShare: 0,
    lifetimeGenerated: '0',
    pending: '0',
    modifiers: {},
    vignette: { active: null, seen: [] },
  }),
];

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
  const envelope: Envelope = { version: state.saveVersion, state };
  return bytesToB64(new TextEncoder().encode(JSON.stringify(envelope)));
}

/** Decode + migrate. Throws on garbage — callers keep the old save intact. */
export function deserialize(blob: string): GameState {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(b64ToBytes(blob.trim())));
  if (typeof parsed !== 'object' || parsed === null || !('state' in parsed)) {
    throw new Error('not a save envelope');
  }
  let raw = (parsed as Envelope).state as unknown as Record<string, unknown>;
  if (typeof raw !== 'object' || raw === null) throw new Error('save has no state');

  let version = typeof raw.saveVersion === 'number' ? raw.saveVersion : 0;
  if (version > CURRENT_SAVE_VERSION) {
    throw new Error(`save is from the future (v${version} > v${CURRENT_SAVE_VERSION})`);
  }
  for (let v = version; v < CURRENT_SAVE_VERSION; v++) {
    const step = MIGRATIONS[v - 1]; // step at index v-1 lifts vN → vN+1
    if (step) raw = step(raw);
    raw.saveVersion = v + 1;
  }
  // Backfill any fields added since this save was written (migrate additively).
  const merged: GameState = {
    ...initialState(),
    ...(raw as unknown as Partial<GameState>),
    saveVersion: CURRENT_SAVE_VERSION,
  };
  return merged;
}
