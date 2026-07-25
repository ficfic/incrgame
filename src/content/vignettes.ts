// Choose-your-own-adventure beats — declarative data, read by the engine.
//
// ★ EVERY PROSE FIELD BELOW IS OWNER-WRITTEN AND SHIPS EMPTY. ★
//
// `title`, `body` and each choice's `label` are deliberately blank strings.
// The UI renders a visible "awaiting text" marker where they belong, so an
// unwritten vignette looks unmistakably unfinished rather than quietly fake.
// An agent must never fill these in: this game's whole thesis is mocking AI
// slop, and generated flavor text would make it the thing it satirises
// (CLAUDE.md, the ★ prose guardrail).
//
// What an agent MAY write here: ids, triggers, and effects. Those are numbers.
//
// The effects are multipliers on engine rates, applied once and permanently
// for the run:
//   drift      — how fast unverified knowledge rots
//   extraction — how fast machines mint new statements
//   review     — how fast Orchestrators check them
// 1 means unchanged. The UI shows these to the player as generated numbers,
// which is data, not prose — so a choice is legible even before it has words.
import type { Vignette } from '../core/types';

export const VIGNETTES: Vignette[] = [
  {
    // The first time rot is visible in the graph. The fork the whole game is
    // about: go faster and trust less, or slow down and stay true.
    id: 'first-drift',
    trigger: { minDrifted: 5 },
    title: '',
    body: '',
    choices: [
      {
        id: 'ship-it',
        label: '',
        effects: { extraction: 1.5, drift: 1.35 },
        flag: 'chose-speed',
      },
      {
        id: 'slow-down',
        label: '',
        effects: { extraction: 0.8, drift: 0.6 },
        flag: 'chose-truth',
      },
      {
        id: 'buy-review',
        label: '',
        effects: { review: 1.6, extraction: 0.9 },
        flag: 'chose-automation',
      },
    ],
  },
];

/** Human-readable effect summary, generated from the numbers — NOT prose.
 *  Used so an unwritten vignette is still a real, legible decision. */
export function describeEffects(effects: Record<string, number | undefined>): string {
  const NAMES: Record<string, string> = {
    drift: 'drift',
    extraction: 'extraction',
    review: 'auto-review',
  };
  return Object.entries(effects)
    .filter(([, v]) => v !== undefined && v !== 1)
    .map(([k, v]) => `${NAMES[k] ?? k} ×${v!.toFixed(2)}`)
    .join(' · ');
}
