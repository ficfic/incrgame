// Offline progress. Pure: the shell passes `now`.
//
// THE RULE (VISION, owner decision): NOTHING ROTS WHILE YOU ARE AWAY. Not
// slowly, not a little. You never come back to damage.
//
// But away time cannot be a free lunch either, or closing the game becomes the
// optimal strategy. So absence BANKS WORK: your machines run at exactly the
// rates and exactly the watched/loose split you left them on, and what they
// made is waiting when you get back. Raw does not decay over the gap — it
// starts decaying from the moment you are looking at it, where you can act.
//
// ⚠️ AWAY TIME RESPECTS THE SPLIT YOU LEFT SET, and that is deliberate against
// docs/ECONOMY_SRR.md §3, which lists the away pile only under Raw. Banking a
// watched player's output as Raw makes closing the app a straight downgrade for
// the one play style the game is trying to reward — a regression a logged
// decision already fixed once (v9→v10, "away time now respects exactly the
// split you left set"). Loose machines still bank Raw, which is what that table
// row is really about, because loose is what a machine is unless you say so.
//
// Multipliers are frozen at logout, so production over the gap is linear and
// one closed-form calculation is EXACT. Offline never reuses tick with a giant
// dt.
import type { GameState } from './types';
import { add, D } from './numbers';
import { checkSharePerSecond, rawPerSecond, solidPerSecond } from './engine';

export const OFFLINE_CAP_MS = 8 * 3600 * 1000; // 8h, tunable

export interface OfflineResult {
  state: GameState;
  elapsedMs: number; // capped
  /** Solid gained while away, Checker conversions included. */
  solid: string;
  /** Raw made while away, before the Checkers had their pass at it. */
  raw: string;
}

export function applyOfflineProgress(state: GameState, now: number): OfflineResult {
  const elapsedMs = Math.min(Math.max(now - state.lastTick, 0), OFFLINE_CAP_MS);
  if (state.lastTick === 0 || elapsedMs <= 0) {
    return { state: { ...state, lastTick: now }, elapsedMs: 0, solid: '0', raw: '0' };
  }
  const seconds = elapsedMs / 1000; // ms→s or you overshoot 1000× (SPEC)

  const madeSolid = D(solidPerSecond(state) * seconds);
  const madeRaw = D(rawPerSecond(state) * seconds);

  // Checkers ran too. They convert Raw into Solid, and there is no reason for
  // them to stop because nobody is watching the screen — an idle game whose
  // automation needs you present is not one. Bounded by the Raw actually
  // available over the gap: what was banked plus what the loose machines made.
  //
  // ⚠️ A SHARE PER SECOND, AND THE DECAY TERM IS DELIBERATELY ABSENT. Online
  // the pile leaves two ways at once and the split is c/(c+r); away, NOTHING
  // ROTS (VISION, owner decision), so the same exponential runs on c alone and
  // whatever the Checkers did not reach is still Raw when you get back. That
  // is the rule's whole point: you come back to a job, never to damage.
  const pool = D(state.raw).add(madeRaw);
  const converted = pool.mul(1 - Math.exp(-checkSharePerSecond(state) * seconds));
  const gainedSolid = madeSolid.add(converted);

  return {
    state: {
      ...state,
      solid: add(state.solid, gainedSolid.toString()),
      raw: pool.sub(converted).toString(),
      minted: add(state.minted, madeSolid.add(madeRaw).toString()),
      lastTick: now,
    },
    elapsedMs,
    solid: gainedSolid.toString(),
    raw: madeRaw.toString(),
  };
}
