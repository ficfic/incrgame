// WHICH CONTROLS EXIST YET. One predicate, read by the screen; no conditions
// scattered through it.
//
// ---- WHY THIS FILE EXISTS ------------------------------------------------
//
// The owner played the deployed build: *"i don't understand what ANY of the
// buttons do, i just randomly clicked around until i got to a stop… we need to
// introduce mechanics gradually… we must have like 2 options… maybe we
// shouldn't show unavailable options."*
//
// Every mechanic in this game was on screen in the first frame, in a language
// the player could not read, at a moment when most of them did nothing:
// buying a machine with no Words raises a ceiling that is already zero, the
// watched/loose toggle changes what a machine makes before there is a second
// machine or anywhere to put Raw, and Check converts an empty pile.
//
// ★ THE RULE, AND IT IS ONE RULE: A CONTROL APPEARS WHEN TAKING IT WOULD FIRST
//   CHANGE SOMETHING, AND NEVER DISAPPEARS AFTER THAT.
//
// The second half matters as much as the first. Every witness below only ever
// rises — the same discipline `readouts.ts` applies to the words — because a
// control that vanishes when a stock falls is a game removing an option under
// the player's thumb, and that is worse than a control that arrived too early.
//
// ⚠️ AN OPTION WITH A PRICE IS NOT AN UNAVAILABLE OPTION. A machine card you
// cannot afford yet is the genre's oldest and clearest goal line: the number is
// climbing toward it, and it will be affordable in a minute without you doing
// anything. A LOCKED lane is different in kind — no amount of waiting opens it
// — and that is the one this hides. The line is drawn between a wait and a
// wall, not between affordable and not.
import type { GameState } from './types';
import { D } from './numbers';
import { WATCHED_MACHINES, MACHINE_IDS } from './types';
import { canRetrain, initialState, words } from './engine';
import { LOCKED_LANES_AT } from './starmap';
import { bound } from './literacy';

/** The controls the screen can put on a phone. `lanes` is the game with
 *  everything else stripped out, and it is what minute zero is. */
export type Control =
  /** The lane strip. Always. */
  | 'lanes'
  /** The machine cards, with their prices. */
  | 'machines'
  /** The watched/loose toggle on a machine card. */
  | 'watch'
  /** The Check button. */
  | 'check'
  /** Locked lanes, drawn as doors with a masked key. */
  | 'lockedLanes'
  /** The Retrain button, and the exchange it states (src/core/retrain.ts). */
  | 'retrain';

export const CONTROLS: Control[] = [
  'lanes', 'machines', 'watch', 'check', 'lockedLanes', 'retrain',
];

/** Words before the machine cards arrive.
 *
 *  ONE, and not zero, because at zero Words `factsPerSecond` is zero: a machine
 *  bought before the first walk produces nothing, so the card would be a price
 *  tag on a no-op. TWO, and not one, because the first walk already teaches
 *  something — the word arrives with the place — and two mechanics landing in
 *  the same frame is the thing this file exists to stop. The second walk is the
 *  first moment the player has seen the rate move twice, which is what makes a
 *  machine an answer to a question they have. */
export const MACHINES_AT = 2;

/** Machines a run is issued. A machine you were GIVEN is not a roster, which is
 *  why the toggle waits for one you BOUGHT — the same distinction
 *  `readouts.ts` draws before it teaches the word Solid. */
const ISSUED = MACHINE_IDS.reduce((n, id) => n + initialState().machines[id], 0);
const owned = (s: GameState): number => MACHINE_IDS.reduce((n, id) => n + s.machines[id], 0);

/** ★ DOES THIS CONTROL EXIST FOR THIS SAVE?
 *
 *  The screen asks; it does not decide. A condition written into markup is a
 *  condition no test can reach and no second surface can agree with. */
export function shows(state: GameState, control: Control): boolean {
  switch (control) {
    // The whole game at minute zero, and the only thing that never has to be
    // earned. `offered()` decides how MANY (starmap.ts): two, to begin with.
    case 'lanes':
      return true;

    // Production exists and has visibly moved twice — see MACHINES_AT.
    case 'machines':
      return words(state) >= MACHINES_AT;

    // ⚠️ THE TOGGLE IS THE ONLY REAL DECISION IN THE GAME AND IT STILL WAITS.
    // With the one issued Extractor it is a coin flip with nothing on either
    // side: Raw buys nothing until there is a way to check it, and Solid is
    // the only thing there is to spend. Buying a second machine is the moment
    // the player has a roster rather than an appliance, and it is the first
    // thing they chose to pay for — so it is where speed-versus-truth becomes
    // a question they asked. Sticky: machines carry across a Retrain.
    case 'watch':
      return owned(state) > ISSUED;

    // Exactly when it would convert something. A loose machine is included
    // because it is about to make Raw and the button is the reason the toggle
    // was worth flipping; Rot is included because it never falls, so the
    // control cannot vanish the moment a tap empties the pile.
    case 'check':
      return D(state.raw).gte(1)
        || D(state.rot).gt(0)
        || WATCHED_MACHINES.some((id) => !state.watched[id] && state.machines[id] > 0);

    // The board's last lesson, after the strip has reached full width.
    case 'lockedLanes':
      return bound(state).length >= LOCKED_LANES_AT;

    // ★ NEVER SHOWN BEFORE IT CAN BE TAKEN. The owner could not find it, and
    // the fix is not to show it earlier — a Retrain button at Words 3 is one
    // more thing that refuses you. It appears the moment it works, and it
    // arrives with the exchange stated (src/core/retrain.ts), because the
    // question was "what's the point of it?" and a button cannot answer that.
    case 'retrain':
      return canRetrain(state);
  }
}

/** Every control on screen right now, in the order they were introduced. Useful
 *  to a screen laying itself out, and to a test asserting the ladder. */
export function visible(state: GameState): Control[] {
  return CONTROLS.filter((c) => shows(state, c));
}
