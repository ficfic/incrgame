// A CONNECTION ON THE BOARD, IN TWO STATES — and the verb that moves between
// them.
//
// ---- WHY THIS CAME BACK ---------------------------------------------------
//
// The owner played the deployed build: *"im missing the not dotted line
// connections and clicking on them to make them solid lines"*.
//
// They are right, and the reason is visible in `render/paint.ts`: it draws ONE
// kind of line. Every connection on the board is dashed, from the first frame
// to the last, forever. The board says "nothing here has been checked" and then
// never says anything else. It is the only surface in the game with no state in
// it, which is why it reads as a picture rather than a place.
//
// The old game had `connect`, `manualConnect` and `Edge.checked`, and they were
// deleted with the old economy for a REASON worth restating rather than
// re-litigating: `checked` named four different things at once, two of which
// moved the same displayed fraction in opposite directions
// (`docs/ECONOMY_SRR.md`). The diagnosis was explicit — *"The model is not the
// problem. The NAMES are."* So the mechanic comes back and the name does not:
//
//   Solid / Raw / Rot   the SUBSTANCE, a mass in three states. Unchanged.
//   confirmed           a CONNECTION that somebody signed off. Not a quantity,
//                       not a currency, not a fraction, and never a readout.
//
// ---- ★ WHAT A TAP COSTS AND WHAT IT PAYS ---------------------------------
//
// Confirming is CHECK, AIMED. It converts exactly the slice of Raw the Check
// button converts (`checkTake`) — same reducer arithmetic, same constants, no
// new number anywhere — and the connection stays solid afterwards.
//
// The defence, in one sentence: **a signature costs nothing you hold, because
// its price is that you only get one per unconfirmed connection on your board,
// and connections arrive one per place you walk** — so hand-checking is bounded
// by how far you have travelled, which is the only thing in this game that can
// stop a manual lever becoming a job (CLAUDE.md: "HITL review is never
// mandatory… an idle game that demands babysitting isn't one").
//
// Three consequences worth naming, since they are the argument:
//
//  · It cannot be an attention tax. The Check button is unbounded and 2% of the
//    pile a tap; this is the same payout with a hard ceiling on the number of
//    taps in existence. It is strictly less grindable than what shipped.
//  · It cannot be mandatory. A Checker still eats the pile automatically and
//    overtakes a tapping thumb in about four seconds (`engine.ts`).
//  · It is the only permanent record of the player's own attention in a game
//    where every other quantity is a mass that gets spent. Solid buys a machine
//    and is gone. A confirmed connection is still there next generation.
//
// ---- NOT A COUNT, AND THIS IS THE PART THAT KEEPS THE ECONOMY HONEST ------
//
// `state.confirmed` is a set of connections, and NOTHING reads its size. It is
// not in `readouts.ts`, no surface may print it, and it is registered as
// STRUCTURAL in `scripts/check-vocabulary.mjs` for exactly that reason. The
// defect the old model had was a countable inventory sitting beside an
// anonymous mass, both called "checked", so the player could not tell which
// half had moved. Facts are still a mass. This is a set of SIGNATURES on the
// graph, and the only place it is ever rendered is as the difference between a
// dashed line and a solid one.
import type { GameState } from './types';
import { REL_NAMES } from './types';

/** The two states a drawn connection can be in. Deliberately NOT the words
 *  `starmap.ts` uses for a lane — a lane's `solid` means "the far end is a
 *  concept you already hold", which is a different fact about a different
 *  object. One word, one meaning, even inside the engine. The player sees a
 *  dashed line and a solid line; the code says what they mean. */
export type EdgeState = 'unconfirmed' | 'confirmed';

/** Stable identity for a connection, CANONICAL so it cannot be double-signed.
 *
 *  The endpoints are sorted. `potentialEdges` builds an ancestor link as
 *  `{a: child, b: parent}` and reads typed relations straight out of the
 *  dataset, where the same pair can arrive either way round — two keys for one
 *  line means the board could show a connection dashed that the save already
 *  holds signed, which is the bug shape this whole file exists to avoid. */
export function edgeKey(a: number, b: number, rel: number): string {
  return `${Math.min(a, b)}:${Math.max(a, b)}:${rel}`;
}

/** The inverse, and the ONLY validator. Returns null for anything that is not a
 *  canonical key naming a real relation between two different concepts.
 *
 *  It has to be strict because the reducer cannot see the dataset: `src/core`
 *  is pure and the ontology chunks load in the shell, so "is this edge really
 *  in WordNet" is a question the engine is structurally unable to ask. What it
 *  CAN check is the invariant that actually matters — a connection you sign
 *  must run between two concepts you hold — and that is enforced in
 *  `canConfirm`, off `state.held`, which is in the save. */
export function parseEdgeKey(key: string): { a: number; b: number; rel: number } | null {
  const m = /^(\d+):(\d+):(\d+)$/.exec(key);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]), rel = Number(m[3]);
  // a < b, strictly: equal ends are a concept related to itself, and a > b is
  // the same connection written the other way round — a second key for one
  // line. Both are rejected rather than normalised, because a reducer that
  // repairs its input cannot tell a typo from an exploit.
  if (!(a < b)) return null;
  if (!(rel >= 0 && rel < REL_NAMES.length)) return null;
  return { a, b, rel };
}

/** The signatures on this save, as a set — the shape every caller wants.
 *  Rebuilt per call rather than cached: it is read once a frame by the painter
 *  and the list is bounded by the connections the board has ever drawn. */
export function confirmedEdges(state: GameState): ReadonlySet<string> {
  return new Set(state.confirmed);
}

/** Dashed or solid. The whole of what the board draws. */
export function edgeState(state: GameState, a: number, b: number, rel: number): EdgeState {
  return state.confirmed.includes(edgeKey(a, b, rel)) ? 'confirmed' : 'unconfirmed';
}
