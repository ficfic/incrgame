// The game shell: owns the ONE state store, the 10 Hz loop, autosave, and
// offline-progress-on-resume. All state changes still flow through apply().
import { writable, get, type Readable } from 'svelte/store';
import type { Action, GameState } from '../core/types';
import { apply, initialState } from '../core/engine';
import { deserialize, serialize } from '../core/save';
import { applyOfflineProgress, type OfflineResult } from '../core/offline';
import { loadBlob, saveBlob, deleteBlob, requestPersistence } from './storage';
import { observeTransition, sayAwayReturn } from './ticker';

const TICK_MS = 100; // fixed logical step: 10 Hz (SPEC "Tick model")
const MAX_CATCHUP_MS = 30_000; // beyond this, the offline calc takes over
const AUTOSAVE_MS = 10_000;
const AWAY_BANNER_MIN_MS = 5 * 60_000; // only announce absences worth announcing

const store = writable<GameState>(initialState());
export const game: Readable<GameState> = store;

export const awayReport = writable<OfflineResult | null>(null);

export function dispatch(action: Action): void {
  store.update((s) => {
    const next = apply(s, action);
    if (next !== s) observeTransition(s, next);
    return next;
  });
}

function resumeFromGap(now: number): void {
  store.update((s) => {
    const result = applyOfflineProgress(s, now);
    if (result.elapsedMs >= AWAY_BANNER_MIN_MS) {
      awayReport.set(result);
      sayAwayReturn(result.banked);
    }
    return result.state;
  });
}

async function persist(): Promise<void> {
  try {
    await saveBlob(serialize(get(store)));
  } catch (e) {
    console.error('autosave failed', e);
  }
}

export function exportSave(): string {
  return serialize(get(store));
}

/** Flush the project: wipe the save and start over. The UI gates this behind
 *  an explicit second tap — this is the ONE sanctioned way progress dies. */
export async function flushProject(): Promise<void> {
  store.set(initialState((Date.now() % 0x7fffffff) | 1));
  awayReport.set(null);
  await deleteBlob();
  await persist(); // write the fresh state so a reload can't resurrect the old run
}

/** Replaces the running state. Throws on a bad blob — current save untouched. */
export async function importSave(blob: string): Promise<void> {
  const state = deserialize(blob); // validates + migrates before anything changes
  const { state: resumed } = applyOfflineProgress(state, Date.now());
  store.set(resumed);
  await persist();
}

let loop: ReturnType<typeof setInterval> | undefined;

export async function startGame(): Promise<void> {
  void requestPersistence();
  try {
    const blob = await loadBlob();
    if (blob) store.set(deserialize(blob));
    else store.set(initialState((Date.now() % 0x7fffffff) | 1));
  } catch (e) {
    // A corrupt store must not nuke progress silently: keep it, start fresh in
    // memory, and leave the import escape hatch available.
    console.error('failed to load save; starting fresh in memory', e);
    store.set(initialState((Date.now() % 0x7fffffff) | 1));
  }
  resumeFromGap(Date.now());

  let lastAutosave = Date.now();
  loop = setInterval(() => {
    const now = Date.now();
    const s = get(store);
    const gap = now - s.lastTick;
    if (gap > MAX_CATCHUP_MS) {
      resumeFromGap(now); // e.g. iOS froze the tab without firing visibilitychange
    } else {
      // fixed-step catch-up keeps the sim deterministic regardless of timer jitter
      const steps = Math.floor(gap / TICK_MS);
      for (let i = 1; i <= steps; i++) {
        dispatch({ type: 'tick', dt: TICK_MS / 1000, now: Math.min(s.lastTick + i * TICK_MS, now) });
      }
    }
    if (now - lastAutosave >= AUTOSAVE_MS) {
      lastAutosave = now;
      void persist();
    }
  }, TICK_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void persist();
    else resumeFromGap(Date.now());
  });
}

export function stopGame(): void {
  if (loop) clearInterval(loop);
  loop = undefined;
}
