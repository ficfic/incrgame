// ★ WHAT A RETRAIN COSTS AND WHAT IT BUYS, as a table the screen can print.
//
// ---- THE QUESTION THIS ANSWERS -------------------------------------------
//
// The owner, playing the deployed build: *"i cannot find prestige button… and
// what is lost on prestige anyways? whats the point of it?"*
//
// The first half is a missing button (`reveal.ts`: the Retrain control appears
// the moment it can be taken). The second half is not a UI bug at all — it is a
// fair question about the design, and nothing in the game answered it. A
// prestige button whose exchange is not stated is a button asking the player to
// destroy their run on trust.
//
// ---- WHY IT IS COMPUTED AND NOT WRITTEN DOWN -----------------------------
//
// ⚠️ THE PREVIEW RUNS THE REAL THING. `retrained()` is the function the reducer
// itself calls (engine.ts), so every row below is the actual after-state, not a
// second description of it that somebody has to keep in step. A prestige screen
// that disagrees with prestige would be the same defect as "graph: 25 nodes"
// beside "3 recovered" — two surfaces, one quantity, no bug anywhere.
//
// And every number goes through `READOUTS`, on both sides, so the exchange is
// quoted in exactly the words the HUD uses for the same quantities. One word,
// one quantity, on the one screen where the player is comparing two of them.
import type Decimal from 'break_eternity.js';
import type { GameState } from './types';
import { D } from './numbers';
import { RETRAIN_MIN_WORDS, canRetrain, nextStepCost, retrained, words } from './engine';
import { READOUTS, type ReadoutId } from './readouts';

/** One quantity, before and after. */
export interface ExchangeRow {
  id: ReadoutId;
  /** The word the player already knows for it, from READOUTS. */
  noun: string;
  /** Its five-word definition, same source. */
  explain: string;
  /** Whether the player can READ that noun yet — the screen shows the graph's
   *  word for it otherwise, exactly as the HUD does. A retrain screen that
   *  taught four English nouns in one frame would hand over the vocabulary the
   *  rest of the game makes you earn. */
  learned: boolean;
  before: Decimal;
  after: Decimal;
  /** Does this survive? `Words` does and is the whole point; the other three
   *  do not, except that Raw ARRIVES — the inheritance is not a saving, it is
   *  a pile of work nobody checked. */
  carries: boolean;
}

export interface Exchange {
  /** Can it be taken right now. */
  ready: boolean;
  /** Words still to walk before it can. Zero once ready. */
  shortBy: number;
  /** The four quantities, in READOUTS order. */
  rows: ExchangeRow[];
  /** What the next new concept costs now, and what it will cost after.
   *
   *  ★ THIS IS THE POINT OF PRESTIGE AND IT IS THE ONE NUMBER THAT WAS NOWHERE
   *  ON THE SCREEN. Words carry, so the vocabulary ceiling stays where you left
   *  it, while the step price restarts at STEP_BASE — the next run walks the
   *  same ground at a fraction of the cost. Without this pair the exchange
   *  reads as pure loss, which is exactly how it read. */
  stepBefore: Decimal;
  stepAfter: Decimal;
}

/** ★ THE EXCHANGE, for any state — ready or not.
 *
 *  Callable before the gate on purpose: the same table is what the screen shows
 *  the moment the button appears, and it is what a future session can show
 *  earlier if the owner wants the plateau visible sooner. `ready` says which
 *  one it is; it does not change the arithmetic. */
export function retrainExchange(state: GameState): Exchange {
  const after = retrained(state);
  const rows = (Object.keys(READOUTS) as ReadoutId[]).map((id): ExchangeRow => {
    const r = READOUTS[id];
    const now = r.count(state);
    const then = r.count(after);
    return {
      id,
      noun: r.noun,
      explain: r.explain,
      // Read on the CURRENT state: the retrain does not teach a word, and
      // asking the after-state would show a noun the player has not earned one
      // frame before they earn it.
      learned: r.learned(state),
      before: now,
      after: then,
      carries: then.gte(now),
    };
  });
  return {
    ready: canRetrain(state),
    shortBy: Math.max(0, RETRAIN_MIN_WORDS - words(state)),
    rows,
    stepBefore: D(nextStepCost(state)),
    stepAfter: D(nextStepCost(after)),
  };
}
