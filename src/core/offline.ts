// Offline progress (SPEC "Offline progress"). Pure: the shell passes `now`.
// Multipliers are frozen at logout, so production over the gap is linear and
// one big-step calc is EXACT — offline never reuses tick with a giant dt.
//
// THE RULE (owner decision): nothing rots while you are away. Not slowly, not
// a little. You never come back to damage.
//
// But offline can't be a free lunch either, or closing the game becomes the
// optimal strategy and the whole speed-versus-truth dial collapses. So away
// time BANKS work instead of completing it: your machines mint statements into
// `pending`, and those statements only enter the graph — and only start to
// drift — when you come back and absorb them, in front of you, where you can
// review them. You return to a job, never to a loss.
import type { GameState, ResourceId } from './types';
import { TIER_LADDER } from './types';
import { add, mul, gt } from './numbers';
import { ratePerSecond, supervisedPerSecond, unsupervisedPerSecond } from './engine';
import { deriveGraph } from './graph';

export const OFFLINE_CAP_MS = 8 * 3600 * 1000; // 8h, tunable

export interface OfflineResult {
  state: GameState;
  elapsedMs: number; // capped
  gains: Partial<Record<ResourceId, string>>; // what "while you were away" shows
  banked: string; // statements waiting to be absorbed
}

export function applyOfflineProgress(state: GameState, now: number): OfflineResult {
  const elapsedMs = Math.min(Math.max(now - state.lastTick, 0), OFFLINE_CAP_MS);
  if (state.lastTick === 0 || elapsedMs <= 0) {
    return { state: { ...state, lastTick: now }, elapsedMs: 0, gains: {}, banked: '0' };
  }
  const seconds = elapsedMs / 1000; // ms→s or you overshoot 1000× (SPEC)
  const resources = { ...state.resources };
  const gains: Partial<Record<ResourceId, string>> = {};
  for (const res of TIER_LADDER) {
    const rate = ratePerSecond(state, res);
    if (gt(rate, 0)) {
      const gain = mul(rate, seconds);
      resources[res] = add(resources[res], gain);
      gains[res] = gain;
    }
  }
  // Machine output goes to the bank, NOT into the graph: it cannot drift while
  // it is banked, so an absence can never cost fidelity.
  //
  // And it banks at EXACTLY the rates the online loop would have used, split by
  // exactly the supervision you left set — supervised agents at their 0.55×
  // penalty into the clean bank, unwatched ones at full speed into the dirty
  // one. Before this, away time ran the whole roster at full rate and dumped
  // all of it unverified, which made closing the game the highest-throughput
  // play in the game and the supervision dial pure downside.
  const clean = mul(supervisedPerSecond(state), seconds);
  const raw = mul(unsupervisedPerSecond(state), seconds);
  const minted = add(clean, raw);
  const pending = gt(raw, 0) ? add(state.pending, raw) : state.pending;
  const pendingClean = gt(clean, 0) ? add(state.pendingClean, clean) : state.pendingClean;

  return {
    state: {
      ...state,
      resources,
      pending,
      pendingClean,
      lastTick: now,
      graph: deriveGraph(state.forged, resources.triples),
    },
    elapsedMs,
    gains,
    banked: gt(minted, 0) ? minted : '0',
  };
}
