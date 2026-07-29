// ★ THE NARRATOR. One English line, always on screen, saying what just happened
// and what is now possible.
//
// ---- WHY THERE IS ONE AT ALL ---------------------------------------------
//
// The owner played the deployed build: *"i think we won't be able to do it
// without english narrator or something, it's incredibly confusing right now, i
// don't understand what's happening at all… i don't understand what ANY of the
// buttons do, i just randomly clicked around until i got to a stop."*
//
// DECISIONS 2026-07-29 settles it: **the interface, the buttons, the readouts,
// the notifications and this narrator speak English. The foreign language is
// only ever the GRAPH's.** Concept names and the graph's own words stay foreign
// and stay earned. The player is learning the GRAPH, never the UI.
//
// ⚠️ SO NOTHING IN THIS FILE EVER GOES THROUGH `renderMasked`. The ticker does,
// the beats do, the lane labels do. These do not. A narrator you cannot read is
// the state of affairs this file was written to end.
//
// ⚠️ AND IT NEVER EXPLAINS A FOREIGN WORD. That ban did not move (CLAUDE.md):
// the narrator says what a MECHANIC does and what the graph DID, in English,
// and never what a concept name means. Inferring those is the game.
//
// ---- IT IS DATA, KEYED BY SITUATION --------------------------------------
//
// A table, not strings scattered through the screen, so the voice can be read
// end to end and reviewed as a voice — which is the whole reason
// `docs/VOICE.md` exists and the reason 89% of this game's text once shipped
// blank without anyone noticing. `src/core/narration.ts` decides WHICH key;
// this file decides what it says.
//
// ---- THE REGISTER (docs/VOICE.md) ----------------------------------------
//
// A knowledge-management company that has automated something it does not
// understand: dry, corporate, faintly ominous. It says what HAPPENED and what
// is POSSIBLE — never "tap the blue button". No exclamation marks, no
// rhetorical questions, no attributed emotion, no first person, no named
// characters. Counting and position are allowed (VOICE §4 P3, "Two ways down");
// stocks and rates are not — `readouts.ts` owns every number on the screen and
// the narrator does not quote one.
//
// `later` is the curdle. VOICE's clock is depth; the narrator's is GENERATION,
// which is the only thing about the player that gets worse. After the first
// Retrain the company stops saying "we", the process nouns go, the sentences
// shorten, and nothing has a joke left in it. Same situations, stage 3 voice.
// A line with no `later` is one that reads correctly flat and is left alone.

/** One situation's line, and what it becomes once the ancestry is synthetic. */
export interface NarratorLine {
  /** Generation 0. Stage 1–2: the company is still pleased with its tooling. */
  text: string;
  /** Generation 1 and after. Stage 3: no "we", no process nouns, no punchline. */
  later?: string;
}

/** Every situation the narrator has a line for. Declared as a union rather
 *  than left implicit so that adding a situation in `src/core/narration.ts`
 *  without writing its line is a TYPE ERROR, not a blank line on the screen.
 *  89% of this game's text once shipped empty; the compiler is cheaper than
 *  finding that out from a screenshot again. */
export type Situation =
  | 'firstWord' | 'walked'
  | 'minted' | 'machinesOpen' | 'bought'
  | 'watchOpen' | 'loose' | 'watched'
  | 'checkOpen' | 'checked' | 'rot'
  | 'capped' | 'uncapped'
  | 'lockedOpen'
  | 'retrainOpen' | 'retrained'
  | 'away';

/** ★ EVENTS — something just happened. Keyed by `Situation`, which
 *  `src/core/narration.ts` is the only thing that may choose between. */
export const NARRATOR: Record<Situation, NarratorLine> = {
  // ---- walking -----------------------------------------------------------
  //
  // THE JOIN, STATED ONCE, ON THE ONE FRAME EVERY PLAYER READS. This is where
  // "walking is what raises the ceiling" has to land, because it is the whole
  // design and nothing else on the screen says it.
  firstWord: {
    text: 'You arrived, and the word came with the place. The machines can only file facts about things you hold.',
    later: 'You arrived. The word came with the place, as it did before.',
  },
  walked: {
    text: 'Filed under your name. Everything you hold is more that the machines are allowed to work on.',
    later: 'Filed under your name. There is more for the machines to work on.',
  },
  // ---- the machines ------------------------------------------------------
  minted: {
    text: 'The first fact came in while you stood there. It was read on the way, because that is the setting you were issued.',
    later: 'The first fact came in while you stood there. It was read on the way.',
  },
  machinesOpen: {
    text: 'Procurement is open to you. More machines file faster, up to the ceiling your words set.',
    later: 'More machines file faster, up to the ceiling your words set.',
  },
  bought: {
    text: 'Signed for. It starts on the setting the others are on.',
    later: 'Signed for. It starts on the setting the others are on.',
  },

  // ---- speed against truth ----------------------------------------------
  //
  // The toggle is the only real decision in the game, so its arrival line
  // DEFINES both halves and recommends neither. "Watched" and "loose" are the
  // two words the beats will never teach, which is exactly why the narrator has
  // to be the thing that says them.
  watchOpen: {
    text: 'Two machines is a roster, and a roster has a setting. Watched output has been read by somebody. Loose output has not.',
    later: 'A roster has a setting. Watched output has been read. Loose output has not.',
  },
  loose: {
    text: 'Supervision withdrawn. What it files from here is unread, and unread work does not keep.',
    later: 'Supervision withdrawn. Unread work does not keep, and it keeps less well than it did.',
  },
  watched: {
    text: 'Supervision restored. Slower, and what it files has been read.',
  },

  // ---- the pile ----------------------------------------------------------
  checkOpen: {
    text: 'There is unread work on the pile. You can read it by hand, or buy something that reads it while you are gone.',
    later: 'There is unread work on the pile. It goes faster than you can read it.',
  },
  checked: {
    text: 'Read and signed off. The pile leaves two ways and this is the one that keeps.',
  },
  rot: {
    text: 'Something nobody read has worn out. It does not come back, and it stays on the record.',
    later: 'Something nobody read has worn out. More of it wears out now than did before.',
  },

  // ---- the ceiling -------------------------------------------------------
  //
  // The flatline, announced in both directions. A rate that stops climbing with
  // nothing said about it reads as a broken game — this is the line that turns
  // it into a plateau you can see, which is what VISION asks failure to be.
  capped: {
    text: 'Throughput has stopped climbing. Your machines have run out of things you hold, and more of them would idle.',
    later: 'Throughput has stopped climbing. The machines have run out of things you hold.',
  },
  uncapped: {
    text: 'You hold more than the roster can work through. The machines are the limit now, not the words.',
    later: 'You hold more than the roster can work through. The machines are the limit now.',
  },

  // ---- the board ---------------------------------------------------------
  lockedOpen: {
    text: 'Some lanes are held shut by words filed in other lanes. They stay on the board. The key is somewhere you have not been.',
  },

  // ---- prestige ----------------------------------------------------------
  //
  // ★ THE ANSWER TO "WHAT IS LOST ON PRESTIGE ANYWAYS? WHATS THE POINT OF IT?"
  // Three sentences, in the order the player needs them: what carries, what
  // does not, and what it buys. The numbers under each of those live in
  // `retrainExchange` (src/core/retrain.ts) and are stated beside this line;
  // the prose says which direction each one moves and nothing else.
  retrainOpen: {
    text: 'You hold enough of the graph to train the next generation on it. Your words and your machines carry over; the checked work and the record of the wear do not, and a share of everything the machines filed comes back unread. Everywhere you have already been is free to cross again.',
    later: 'There is enough held to train the next generation on it. The words and the machines carry. The checked work does not, and what the machines filed comes back unread.',
  },
  retrained: {
    text: 'The next generation opens over your vocabulary. Prices start at the bottom again, and the ancestry is a little more machine than it was.',
    later: 'It opens again over the same words. Less of what it holds came from outside it.',
  },

  // ---- the two clocks ----------------------------------------------------
  away: {
    text: 'Work continued while nobody was here. Nothing wears out in an empty building.',
    later: 'Work continued while nobody was here. Nothing wears out with nobody here.',
  },
};

/** What the player is standing in, when nothing just happened. */
export type Stance = 'open' | 'walk' | 'wait' | 'capped' | 'raw' | 'plateau' | 'retrain';

/** ★ STANDING — no event, so the line says what is possible from here. This is
 *  what is on screen the other 99% of the time, and it is the reason the
 *  narrator counts as "always present" rather than as a toast. */
export const STANDING: Record<Stance, NarratorLine> = {
  // ★ THE FIRST THING A NEW PLAYER READS, and the answer to "i don't understand
  // what ANY of the buttons do": there are no other buttons. "Two lanes" is a
  // count and a position, which VOICE §4 P3 allows and which is the only honest
  // description of the board — `offered()` returns exactly two at Words 0, and
  // a test fails if that stops being true.
  open: {
    text: 'Two lanes are open below you. Nothing else has been configured for you yet.',
  },
  walk: {
    text: 'There is enough on hand for a step down.',
  },
  wait: {
    text: 'Not enough on hand for the next step. The machines are still filing.',
    later: 'Not enough on hand for the next step. The machines are filing.',
  },
  capped: {
    text: 'The roster is idling against your vocabulary. Walking is the only thing that raises it.',
    later: 'The roster is idling against your vocabulary. Only walking raises it.',
  },
  raw: {
    text: 'There is unread work waiting. None of it is yours until somebody reads it.',
  },
  // The plateau, seen coming — nothing arriving and nothing affordable. VISION
  // forbids a loss screen; this is what is allowed instead, and it is flat
  // rather than alarmed on purpose.
  plateau: {
    text: 'Your machines are idling against your vocabulary, and there is not enough on hand to walk. This is the shape of the ceiling.',
    later: 'The machines are idling against your vocabulary. There is not enough on hand to walk.',
  },
  retrain: {
    text: 'There is enough held to train the next generation on it.',
  },
};
