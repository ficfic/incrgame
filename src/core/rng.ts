// mulberry32 — PURE. The next seed lives in GameState.rngState (SPEC "RNG").
// Never use Math.random in core/: seeded RNG = deterministic CYOA/agent errors,
// reproducible tests, and no save-scumming.

/** Returns [value in [0,1), next seed]. Store the next seed in GameState. */
export function nextRand(seed: number): [number, number] {
  const a = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}
