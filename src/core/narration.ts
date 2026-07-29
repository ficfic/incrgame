// WHICH LINE THE NARRATOR SAYS. Pure: two states in, a key out.
//
// The lines themselves are in `src/content/narrator.ts` — a table, so the voice
// can be reviewed as a voice. This file owns the OTHER half of the contract:
// what counts as something happening, and what the player is standing in when
// nothing is.
//
// ---- TWO KINDS OF LINE, AND BOTH ARE NEEDED ------------------------------
//
//   events(prev, next)   what JUST happened, most important first. Empty most
//                        ticks, because most ticks are a number going up.
//   stance(state)        what is possible from HERE. Never empty.
//
// The screen shows the newest event for as long as it is news and falls back to
// the stance, so there is always exactly one English line under the board. That
// is the whole point of it: the owner played a build with no such line and
// reported "i don't understand what's happening at all".
//
// ⚠️ EVENTS ARE DERIVED FROM A STATE DIFF, NOT FROM THE ACTION. The reducer is
// the only thing that decides what an action did, and a narrator reading the
// action would be a second opinion about that — the exact shape of the
// "25 nodes / 3 recovered" defect this repo keeps re-growing. Everything below
// is a comparison of two saves.
//
// ⚠️ THE CLOCK IS THE TELL FOR AN ACTION. `tick` is the only thing that moves
// `lastTick`, so an unchanged `lastTick` with a changed balance means the
// player tapped something. That is how Check is told apart from a Checker doing
// the same conversion a hundred times a second.
import type { GameState } from './types';
import { WATCHED_MACHINES, MACHINE_IDS } from './types';
import { D } from './numbers';
import { bottleneck, canRetrain, nextStepCost, words } from './engine';
import { shows, type Control } from './reveal';
import { NARRATOR, STANDING, type Situation, type Stance } from '../content/narrator';

export type { Situation, Stance };

/** Which control's arrival each announcement belongs to. One table rather than
 *  five hand-written comparisons, so a control added to `reveal.ts` without a
 *  line is a type error at the table instead of silence on the screen. */
const ARRIVAL: Partial<Record<Control, Situation>> = {
  machines: 'machinesOpen',
  watch: 'watchOpen',
  check: 'checkOpen',
  lockedLanes: 'lockedOpen',
  retrain: 'retrainOpen',
};

/** ★ WHAT JUST HAPPENED, in the order it matters.
 *
 *  The screen takes `[0]`. The rest are returned rather than dropped because a
 *  single tick can genuinely do several things — a walk that also lifts the
 *  vocabulary ceiling and opens the machine cards — and which of those a
 *  surface wants is a surface's business.
 *
 *  The ORDER is the editorial judgement: a control arriving outranks anything
 *  ongoing, because it is the only line that changes what the player can do
 *  next. Rates and stocks come last; they will still be true in a second. */
export function events(prev: GameState, next: GameState): Situation[] {
  const out: Situation[] = [];
  const tapped = next.lastTick === prev.lastTick;

  // Prestige first: it is the largest thing that can happen to a save.
  if (next.generation > prev.generation) out.push('retrained');

  // A control that did not exist a moment ago. `retrain` is in this table too,
  // so the button and the reason for it arrive in the same frame — the owner
  // asked "what's the point of it?" and a button on its own cannot answer.
  for (const [control, situation] of Object.entries(ARRIVAL) as [Control, Situation][]) {
    if (!shows(prev, control) && shows(next, control)) out.push(situation);
  }

  // The board.
  if (next.held.length > prev.held.length) {
    out.push(words(prev) > 0 ? 'walked' : 'firstWord');
  }

  // The roster.
  for (const id of MACHINE_IDS) {
    if (next.machines[id] > prev.machines[id]) { out.push('bought'); break; }
  }
  for (const id of WATCHED_MACHINES) {
    if (prev.watched[id] === next.watched[id]) continue;
    out.push(next.watched[id] ? 'watched' : 'loose');
  }

  // The substance. Both firsts are at ONE WHOLE FACT, the same threshold a row
  // joins the bar at (DECISIONS 2026-07-28) — a line about a quantity that
  // still displays as zero is a line about nothing.
  if (D(prev.rot).lt(1) && D(next.rot).gte(1)) out.push('rot');
  if (D(prev.minted).lt(1) && D(next.minted).gte(1)) out.push('minted');
  // A hand check: the pile fell and Solid rose without the clock moving. A
  // Checker does the same conversion, on a tick, and is not news.
  if (tapped && D(next.raw).lt(prev.raw) && D(next.solid).gt(prev.solid)) out.push('checked');

  // The ceiling, both ways. A rate that stops climbing with nothing said about
  // it reads as a broken game; this is what makes it a plateau you can see.
  const was = bottleneck(prev);
  const now = bottleneck(next);
  if (was !== now && now === 'words') out.push('capped');
  else if (was === 'words' && now === 'machines') out.push('uncapped');

  return out;
}

/** ★ WHERE THE PLAYER IS STANDING, when nothing just happened.
 *
 *  Exactly one applies, and the order is the priority. Read it as a sentence:
 *  a run that can retrain says so; a fresh one says what the board is; a capped
 *  one that cannot afford to walk is the plateau; then the ceiling, then the
 *  pile, then the price, then the ordinary case. */
export function stance(state: GameState): Stance {
  if (canRetrain(state)) return 'retrain';
  // The opening. `bottleneck` is already 'words' here — production is zero
  // because vocabulary is zero — so without this the first screen a player ever
  // sees would explain a ceiling they have not met.
  if (words(state) === 0 && state.generation === 0) return 'open';
  const canStep = D(state.solid).gte(nextStepCost(state));
  const capped = bottleneck(state) === 'words';
  if (capped && !canStep) return 'plateau';
  if (capped) return 'capped';
  if (D(state.raw).gte(1)) return 'raw';
  if (!canStep) return 'wait';
  return 'walk';
}

/** The English for a situation, in this run's register.
 *
 *  `later` is the curdle and GENERATION is its clock: after the first Retrain
 *  the company stops saying "we" and the sentences go flat (docs/VOICE.md
 *  stage 3). A line with no `later` reads correctly either way and is left
 *  alone. */
export function narrate(id: Situation, state: GameState): string {
  const line = NARRATOR[id];
  return (state.generation > 0 && line.later) || line.text;
}

/** The English for a stance, same rule. */
export function narrateStance(id: Stance, state: GameState): string {
  const line = STANDING[id];
  return (state.generation > 0 && line.later) || line.text;
}

/** ★ THE ONE LINE, for a surface that just wants the one line.
 *
 *  Pass the previous state when a transition has just been applied; omit it on
 *  a cold load and the standing line carries, which is the correct opening. */
export function narration(state: GameState, prev?: GameState): string {
  const event = prev ? events(prev, state)[0] : undefined;
  return event ? narrate(event, state) : narrateStance(stance(state), state);
}
