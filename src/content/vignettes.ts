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
//   capacity   — attention slots (multiplies the earned cap)
//   review     — DEAD: it scales autoReviewPerSecond, which is a pure function
//                of the Orchestrator count, and the Orchestrator is off-roster
//                (M1_ROSTER), so it is 1.6 x 0 forever. Do not use it in a
//                choice: an option whose upside cannot exist, offered next to a
//                real cost, is a lie told to the player by arithmetic.
// 1 means unchanged. The UI shows these to the player as generated numbers,
// which is data, not prose — so a choice is legible even before it has words.
import type { Vignette } from '../core/types';

export const VIGNETTES: Vignette[] = [
  {
    // The first time rot is visible in the graph. The fork the whole game is
    // about: go faster and trust less, or slow down and stay true.
    id: 'first-drift',
    // Fires when the first Extractor first becomes affordable — a fork BEFORE
    // the decision, not a postmortem of it. It used to trigger on
    // `minDrifted: 5`, which requires an UNSUPERVISED extractor, which is the
    // one state the HUD paints red: the game steered the player away from its
    // only piece of story, and the dominant line (never buy a machine) never
    // saw it at all.
    trigger: { minTriples: 40 },
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
        effects: { capacity: 1.3, extraction: 0.9 },
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
    capacity: 'attention',
    review: 'auto-review',
  };
  return Object.entries(effects)
    .filter(([, v]) => v !== undefined && v !== 1)
    .map(([k, v]) => `${NAMES[k] ?? k} ×${v!.toFixed(2)}`)
    .join(' · ');
}
