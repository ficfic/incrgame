// Offline progress (SPEC "Offline progress"). Pure: the shell passes `now`.
// Multipliers are frozen at logout, so production over the gap is linear and
// one big-step calc is EXACT — offline never reuses tick with a giant dt.
import type { GameState, ResourceId } from './types';
import { TIER_LADDER } from './types';
import { add, mul, gt } from './numbers';
import { ratePerSecond } from './engine';
import { projectGraph } from './graph';

export const OFFLINE_CAP_MS = 8 * 3600 * 1000; // 8h, tunable

export interface OfflineResult {
  state: GameState;
  elapsedMs: number; // capped
  gains: Partial<Record<ResourceId, string>>; // what "while you were away" shows
}

export function applyOfflineProgress(state: GameState, now: number): OfflineResult {
  const elapsedMs = Math.min(Math.max(now - state.lastTick, 0), OFFLINE_CAP_MS);
  if (state.lastTick === 0 || elapsedMs <= 0) {
    return { state: { ...state, lastTick: now }, elapsedMs: 0, gains: {} };
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
  return {
    // the graph is a projection of triples, so offline growth is exact & free —
    // you return to a visibly bigger web, not just bigger numbers
    state: { ...state, resources, lastTick: now, graph: projectGraph(resources.data) },
    elapsedMs,
    gains,
  };
}
