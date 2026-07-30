// WHILE YOU WERE AWAY. Pure: the caller passes the elapsed time in.
//
// ---- The defect this fixes -------------------------------------------------
//
// `docs/SKILLS.md` §3 sells banked time as "the idle spine", and until this file
// existed the slice had no wall clock anywhere: the only thing that dispatched
// `tick` was a `requestAnimationFrame` loop in `src/ui/Slice.svelte`. Close the
// tab for an hour and a running job advanced by exactly nothing, because no
// frames were drawn. The reducer was always able to do this —
// `apply(state, { type: 'tick', secs: 3600 })` completes 180 repeats of a 20 s
// job correctly — nobody ever called it with the gap.
//
// So this module is deliberately thin. It does NOT re-implement the economy in
// closed form (the old game's `src/core/offline.ts` had to, because its rates
// were continuous). Here the reducer's `tick` case is already exact for any
// `secs`, and a second implementation of "how much work fits in an hour" is a
// second thing to keep in agreement with the first. Instead: clamp the gap, hand
// it to the same reducer the live screen uses, and describe what came back.
// `test/slice-offline.test.ts` pins that equivalence to the live path.
//
// ---- The standing rules it has to keep -------------------------------------
//
// • NOTHING ROTS (`docs/BRIEF.md`, standing constraints — inherited verbatim
//   from the old `offline.ts`). Absence banks work; it never punishes. There is
//   no branch in here that can lower a number.
// • NO CLOCK, NO RNG. `Date.now()` is the shell's business. Timestamps arrive as
//   arguments so a catch-up is reproducible in a test and identical on two
//   devices.
// • THE DICE DO NOT ROLL WHILE AWAY (`docs/DICE.md`, and the ⚠️ on `tick`).
//   Banked time pays XP, which is not random. Loot is handed over unopened and
//   rolled under the player's thumb. The seed is therefore UNTOUCHED by a
//   catch-up, and the test asserts it.
import { PLACE } from './content';
import { apply, level, SKILLS, xpForLevel, type Slice, type SkillId } from './engine';

/** How much absence is paid for. **12 hours.**
 *
 *  ---- Why not unlimited ----
 *  Leave for a month and come back to a finished game, and the game is the
 *  waiting, not the playing.
 *
 *  ---- Why not 8 h, the old game's number ----
 *  The owner plays in short sittings on a phone, DAYS apart. An 8 h cap prices
 *  a night's sleep at seven hours and change, so the optimal play is to set an
 *  alarm — which is the exact behaviour "no mechanic may require checking in"
 *  forbids. 12 h covers a night plus the morning, which is the shape of the
 *  real gap between two sittings.
 *
 *  ---- Why not 24 h, or 48 ----
 *  Arithmetic, not feel. There is ONE job slot and travel cancels the job, so an
 *  absence advances exactly one skill. The slowest-paying work in the content is
 *  `read-sheets`, 55 XP per 50 s = 1.1 XP/s. Twelve hours of it is
 *
 *      12 × 3600 × 1.1 = 47,520 XP
 *
 *  and reaching the level cap in a skill from zero costs `xpForLevel(30)` =
 *  39,363 XP. So 12 h ALREADY SATURATES the one skill an absence can touch, and
 *  every hour of cap beyond that buys the player literally nothing — it only
 *  erodes the reason to come back. A test guards this arithmetic against the
 *  content changing under the comment. */
export const AWAY_CAP_SECONDS = 12 * 3600;

/** What the UI can say out loud. Every field is measured off the before/after
 *  states, never asserted by hand, so the sentence cannot drift from the run. */
export interface AwayReport {
  /** Seconds the player was actually gone, after clamping nonsense to 0. This is
   *  the honest "you were away three days", even when only 12 h were paid. */
  away: number;
  /** Seconds that were paid: `min(away, AWAY_CAP_SECONDS)`. */
  banked: number;
  /** True when `banked < away` — the UI owes the player that sentence. */
  capped: boolean;
  /** The work that ran, or null if nothing was running. */
  work: { id: string; label: string; skill: SkillId; skillName: string } | null;
  /** How many whole repeats completed. A part-finished repeat is never shredded;
   *  its remainder carries in `job.left`. */
  done: number;
  /** XP paid. Not random, which is why it is safe to pay it while away. */
  xp: number;
  /** The worked skill's level either side of the gap. Both 0 when `work` is
   *  null — there is no skill to have a level in. */
  levelBefore: number;
  levelAfter: number;
  /** Satchels handed over UNOPENED — measured as a delta, so if work ever starts
   *  dropping loot this number is right without this file being edited. Rolling
   *  them is the player's, always. */
  satchels: number;
  /** A draft sentence. Player-facing prose here is machine-drafted and
   *  owner-edited (CLAUDE.md); the constraint this file owns is that every
   *  number in it is measured, not narrated. */
  line: string;
}

export interface CatchUp { state: Slice; report: AwayReport }

/** Seconds between two wall-clock milliseconds, made safe to trust.
 *
 *  ⚠️ CLAMPED, NOT HONOURED. A phone with the wrong date, a save carried across
 *  timezones, a device that resumed before its clock resynced — all of these
 *  produce a negative or absurd gap, and a run must never move backwards
 *  because of one. Garbage becomes 0, which costs the player nothing they
 *  earned: the job is still standing exactly where they left it. */
export function elapsedSeconds(thenMs: number, nowMs: number): number {
  if (!Number.isFinite(thenMs) || !Number.isFinite(nowMs)) return 0;
  const secs = (nowMs - thenMs) / 1000;
  return secs > 0 ? secs : 0;
}

/** The gap that will actually be paid. Exported so the shell can show "12 of
 *  your 40 hours" without re-deriving the cap. */
export function bankable(elapsed: number): number {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  return Math.min(elapsed, AWAY_CAP_SECONDS);
}

/** "3 days", "12 hours", "45 seconds". Each unit hands over to the next only
 *  once ROUNDING would otherwise print "60 minutes" or "24 hours" — a sentence
 *  that is true and still reads like a bug. */
const phrase = (secs: number): string => {
  const n = (v: number, one: string): string => `${v} ${v === 1 ? one : `${one}s`}`;
  const s = Math.round(secs);
  if (s < 90) return n(s, 'second');
  const mins = Math.round(secs / 60);
  if (mins < 60) return n(mins, 'minute');
  const hours = Math.round(secs / 3600);
  if (hours < 36) return n(hours, 'hour');
  return n(Math.round(secs / 86400), 'day');
};

const nothing = (away: number, banked: number, line: string): AwayReport => ({
  away,
  banked,
  capped: banked < away,
  work: null,
  done: 0,
  xp: 0,
  levelBefore: 0,
  levelAfter: 0,
  satchels: 0,
  line,
});

/** Pay for an absence.
 *
 *  Returns the SAME state object when nothing was banked, so a caller can use
 *  identity to decide whether there is anything worth interrupting the player
 *  with.
 *
 *  ⚠️ `said` IS LEFT EXACTLY AS THE REDUCER WROTE IT, and the away sentence
 *  lives on the report instead. So the banked run and the watched run are the
 *  same state in every field the player owns — XP, job, seed, pack, satchels,
 *  position — and differ only in `said`, which the reducer writes for itself:
 *  180 frames each say "+30 Lore.", one 3600 s tick says "+5400 Lore, 180 times
 *  over.". That is the reducer's narration of one call versus many, not a
 *  disagreement about what happened, and the test asserts the whole state
 *  either side of that one field. */
export function catchUp(state: Slice, elapsed: number): CatchUp {
  const away = Number.isFinite(elapsed) && elapsed > 0 ? elapsed : 0;
  const banked = bankable(away);

  if (banked <= 0) {
    return { state, report: nothing(away, banked, 'No time to bank.') };
  }

  const idle = `Away ${phrase(away)}. Nothing was running, so nothing was banked.`;
  if (!state.job) return { state, report: nothing(away, banked, idle) };

  const w = PLACE.get(state.job.at)?.work;

  // A job standing where there is no work any more is a ghost — a place that
  // lost its work between two sittings. THE CATCH-UP DOES NOT DECIDE WHAT
  // HAPPENS TO IT: `tick` already cancels it, and diverging here would mean the
  // job survived a catch-up and then vanished on the first frame anyway. So the
  // same reducer call is made and it pays nothing.
  if (!w) {
    return {
      state: apply(state, { type: 'tick', secs: banked }),
      report: nothing(away, banked, idle),
    };
  }

  // Zero-length work cannot exist in the content and a test proves it, but the
  // reducer's `while (left <= 0) left += w.secs` would spin forever on one, and
  // an infinite loop on resume is a game that never opens again. Guarded rather
  // than trusted.
  if (w.secs <= 0) return { state, report: nothing(away, banked, idle) };

  const before = level(state, w.skill);
  const next = apply(state, { type: 'tick', secs: banked });
  const after = level(next, w.skill);
  const xp = next.xp[w.skill] - state.xp[w.skill];
  // MEASURED OFF THE STATES, NOT SIMULATED AGAIN. The reducer decided how many
  // repeats fit; reading the count back out of what it did to `job.left` means
  // the report cannot disagree with the run it is describing. Re-running the
  // loop here to "check" would just be a second thing to keep in agreement.
  //   left_after = left_before − banked + done × secs
  const done = next.job
    ? Math.round((next.job.left - state.job.left + banked) / w.secs)
    : 0;

  const name = SKILLS[w.skill].name;
  const gone = `Away ${phrase(away)}`;
  const head = banked < away ? `${gone} — ${phrase(banked)} of it counted.` : `${gone}.`;
  const line = done === 0
    ? `${head} ${w.label} is still going.`
    : `${head} ${w.label}, ${done} ${done === 1 ? 'time' : 'times'} over: `
      + `+${xp} ${name}.${after > before ? ` ${name} ${before} → ${after}.` : ''}`;

  return {
    state: next,
    report: {
      away,
      banked,
      capped: banked < away,
      work: { id: w.id, label: w.label, skill: w.skill, skillName: name },
      done,
      xp,
      levelBefore: before,
      levelAfter: after,
      satchels: next.satchels.length - state.satchels.length,
      line,
    },
  };
}

/** The shape the shell will actually call: two timestamps in, a run out.
 *  Keeping `Date.now()` on the far side of this boundary is what makes every
 *  catch-up reproducible in a test. */
export function catchUpSince(state: Slice, savedAtMs: number, nowMs: number): CatchUp {
  return catchUp(state, elapsedSeconds(savedAtMs, nowMs));
}

/** The claim the cap comment is built on, exported so the test can hold the
 *  content to it rather than the comment quietly going stale. */
export const CAP_SATURATES_A_SKILL = (slowestXpPerSecond: number): boolean =>
  AWAY_CAP_SECONDS * slowestXpPerSecond >= xpForLevel(30);
