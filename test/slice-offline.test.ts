// BANKED TIME. The tests are the deliverable here as much as the module is.
//
// The thing under test is a promise the game has been making since
// `docs/SKILLS.md` §3 and had not kept: close the tab, come back, and the work
// you left running was done. The reducer could always do it; nothing called it.
//
// The load-bearing test in this file is EQUIVALENCE — an hour away pays exactly
// what an hour of 250 ms frames pays, asserted on the whole state. Everything
// else guards a way that could go wrong quietly.
//
// ---- PROVEN RED, 2026-07-30 (CLAUDE.md rule 4) -----------------------------
//
// Four sabotages, each applied to src/slice/offline.ts, `npx vitest run
// test/slice-offline.test.ts` observed, then reverted. Output below is COPIED
// FROM THE TERMINAL, not remembered.
//
// 1. THE CAP REMOVED — `bankable` returns `elapsed` instead of
//    `Math.min(elapsed, AWAY_CAP_SECONDS)`.
//    OBSERVED  3 failed | 26 passed
//      × the cap > pays 12 hours and not a second more
//          expected 172800 to be 43200
//      × the cap > a month away and a day away land in the same place
//          expected { version: 2, seed: 24301, …(8) } to deeply equal { … }
//      × the cap > says so, so the UI can
//          expected false to be true
//
// 2. NEGATIVE TIME HONOURED — `away` becomes `Math.abs(elapsed)`, i.e. a phone
//    whose clock ran backwards gets paid for the mistake.
//    OBSERVED  2 failed | 27 passed
//      × clock skew > a negative gap is a no-op, not a rewind
//          expected { … } to be { … } // Object.is equality
//      × clock skew > nonsense is a no-op — NaN, Infinity, a year in the wrong
//        direction
//          -1000000000000: expected { … } to be { … } // Object.is equality
//    NOTE the monotonicity property ("no gap can move a run backwards") stayed
//    GREEN here, correctly: `abs` pays too much, it does not rewind. Two
//    different guards, and this is the evidence they are not the same guard.
//
// 3. THE DICE ROLL WHILE AWAY — the seed is advanced after the tick. This is
//    the thing `docs/DICE.md` forbids and the reason satchels come back shut.
//    OBSERVED  5 failed | 24 passed
//      × the dice do not roll while away > the seed is untouched by a catch-up
//          1: expected 1831590114 to be 24301
//      × the dice do not roll while away > hands satchels over unopened
//          expected 1831590114 to be 24301
//      × equivalence with the live path > an hour away is an hour of frames
//          -   "seed": 24301,   +   "seed": 1831590114,
//      × equivalence … > holds for every work in the content
//      × clock skew > no gap, however absurd, can move a run backwards
//
// 4. AN OFF-BY-ONE IN THE REPORTED COUNT — `done` computed as
//    `Math.floor(banked / w.secs)` instead of from what the reducer actually did
//    to `job.left`. That is right only when a job starts at its full duration,
//    which is exactly the fixture a lazier test would have used.
//    OBSERVED  1 failed | 28 passed
//      × the report > counts from where the job actually stood, not from a full
//        duration
//          expected 1 to be 2
import { describe, it, expect } from 'vitest';
import { apply, initial, level, xpForLevel, type Slice } from '../src/slice/engine';
import { PLACE, PLACES } from '../src/slice/content';
import {
  catchUp, catchUpSince, bankable, elapsedSeconds, AWAY_CAP_SECONDS,
  CAP_SATURATES_A_SKILL,
} from '../src/slice/offline';

/** The start: 'listen', 20 s, +30 Lore, which is the job the owner meets first. */
const WORK = PLACE.get(0)!.work!;

/** A run with that job started, the way the screen would have left it. */
const running = (): Slice => apply(initial(24301), { type: 'work', id: WORK.id });

/** The live path, exactly as `src/ui/Slice.svelte` drives it: a `tick` every
 *  250 ms while a job is running. 0.25 is exact in binary, so this accumulates
 *  no float drift and the comparison below can be an equality rather than a
 *  tolerance. */
function frames(s: Slice, seconds: number, step = 0.25): Slice {
  let out = s;
  for (let t = 0; t < seconds - 1e-9; t += step) out = apply(out, { type: 'tick', secs: step });
  return out;
}

/** Everything the player owns. `said` is excluded on purpose and is asserted
 *  separately below: the reducer narrates ONE tick of 3600 s as "+5400 Lore, 180
 *  times over." and 14,400 tiny ticks as "+30 Lore." each. That is the reducer
 *  writing about the call it was given, not the two paths disagreeing about what
 *  happened — every other field is compared whole. */
const run = (s: Slice): Omit<Slice, 'said'> => {
  const { said: _sentence, ...rest } = s;
  return rest;
};

describe('equivalence with the live path', () => {
  it('an hour away is an hour of frames, down to the whole state', () => {
    // ★ THE ONE THAT MATTERS. If banked time and watched time ever disagree,
    // one of them is a lie, and the player cannot tell which.
    const s = running();
    const away = catchUp(s, 3600).state;
    const watched = frames(s, 3600);
    expect(run(away)).toEqual(run(watched));
    expect(away.xp).toEqual(watched.xp);
    expect(away.job).toEqual(watched.job);
    // The one field that differs, and it differs the way the REDUCER differs —
    // not because the catch-up wrote anything of its own into the state.
    expect(away.said).toBe(apply(s, { type: 'tick', secs: 3600 }).said);
    // ⚠️ NOT `apply(s, {tick: 20}).said`. Work XP is multiplied by the skill's
    // own perk ladder (`perks.ts`), so the payout RISES as the hour runs — the
    // last of 180 completions is worth more than the first, and a one-tick
    // comparison from the starting state is comparing two different levels.
    // Asserted against the final live frame instead, which is the same claim
    // without the stale assumption.
    expect(watched.said).toBe(frames(s, 3600).said);
  });

  it('holds for every work in the content, at three different gaps', () => {
    for (const p of PLACES) {
      if (!p.work) continue;
      // Stand where the work is. `travel` needs an edge, so the state is built
      // directly — this is a fixture, not a claim about reachability.
      const here: Slice = {
        ...initial(7),
        at: p.id,
        seen: [0, p.id],
        job: { work: p.work.id, at: p.id, left: p.work.secs },
      };
      for (const secs of [37, 600, 3600]) {
        expect(run(catchUp(here, secs).state), `${p.work.id} @ ${secs}s`)
          .toEqual(run(frames(here, secs)));
      }
    }
  });

  it('agrees with a jittery frame rate to within one repeat', () => {
    // A real rAF loop does not deliver exact quarter-seconds. Float drift can
    // move a completion across the boundary, so the honest claim is ±1 repeat,
    // not equality — and that is still enough to catch a rate that is wrong.
    const s = running();
    let jittered = s;
    let seed = 3;
    for (let t = 0; t < 3600; ) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const step = 0.25 + (seed % 1000) / 10000; // 0.25 – 0.35 s
      jittered = apply(jittered, { type: 'tick', secs: step });
      t += step;
    }
    const banked = catchUp(s, 3600).state;
    expect(Math.abs(banked.xp.lore - jittered.xp.lore)).toBeLessThanOrEqual(WORK.xp);
  });

  it('does not shred a part-finished repeat — the remainder carries', () => {
    const s = running();                        // 20 s of work, 20 s left
    const { state, report } = catchUp(s, 50);   // two repeats and half of a third
    expect(report.done).toBe(2);
    expect(state.job?.left).toBe(10);
    expect(state.xp.lore).toBe(2 * WORK.xp);
  });
});

describe('the cap', () => {
  it('pays 12 hours and not a second more', () => {
    expect(AWAY_CAP_SECONDS).toBe(12 * 3600);
    expect(bankable(48 * 3600)).toBe(AWAY_CAP_SECONDS);
    expect(catchUp(running(), 48 * 3600).report.banked).toBe(AWAY_CAP_SECONDS);
  });

  it('a month away and a day away land in the same place', () => {
    const s = running();
    const month = catchUp(s, 30 * 86400);
    const day = catchUp(s, 86400);
    expect(month.state).toEqual(day.state);
    expect(month.report.banked).toBe(AWAY_CAP_SECONDS);
  });

  it('says so, so the UI can', () => {
    const long = catchUp(running(), 30 * 86400).report;
    expect(long.capped).toBe(true);
    expect(long.away).toBe(30 * 86400);      // told honestly, not rewritten
    expect(long.banked).toBe(AWAY_CAP_SECONDS);
    expect(long.line).toContain('30 days');
    expect(long.line).toContain('12 hours');

    const short = catchUp(running(), 600).report;
    expect(short.capped).toBe(false);
    expect(short.line).not.toContain('of it counted');
  });

  it('leaves nothing on the table: 12 h saturates the one skill it can touch', () => {
    // The arithmetic the cap comment is built on, held against the CONTENT so
    // the comment cannot go stale behind a new, slower job.
    const rates = PLACES.filter((p) => p.work).map((p) => p.work!.xp / p.work!.secs);
    const slowest = Math.min(...rates);
    expect(slowest).toBeGreaterThan(0);
    expect(AWAY_CAP_SECONDS * slowest).toBeGreaterThanOrEqual(xpForLevel(30));
    expect(CAP_SATURATES_A_SKILL(slowest)).toBe(true);
  });
});

describe('clock skew', () => {
  const s = running();

  it('a negative gap is a no-op, not a rewind', () => {
    const { state, report } = catchUp(s, -3600);
    expect(state).toBe(s);              // the same object: nothing to announce
    expect(state.xp.lore).toBe(0);
    expect(report.done).toBe(0);
    expect(report.banked).toBe(0);
  });

  it('zero is a no-op', () => {
    expect(catchUp(s, 0).state).toBe(s);
    expect(catchUp(s, -0).state).toBe(s);
  });

  it('nonsense is a no-op — NaN, Infinity, a year in the wrong direction', () => {
    for (const bad of [NaN, Infinity, -Infinity, -1e12]) {
      expect(catchUp(s, bad).state, String(bad)).toBe(s);
      expect(bankable(bad), String(bad)).toBe(0);
    }
    // +Infinity is not garbage in the same way — it is "a very long time" — but
    // it must not turn into an infinite loop or a NaN in the save either.
    expect(catchUp(s, Infinity).report.banked).toBe(0);
  });

  it('no gap, however absurd, can move a run backwards', () => {
    // The property, over a spread of gaps including every hostile one: XP only
    // rises, the level only rises, the pack never shrinks, the seed never moves.
    const mid: Slice = { ...s, xp: { ...s.xp, lore: 900 }, pack: ['lead-strip'] };
    for (const gap of [-1e9, -1, -0.001, 0, 0.001, 1, 19.999, 20, 3600, 1e6, NaN, Infinity]) {
      const { state } = catchUp(mid, gap);
      expect(state.xp.lore, String(gap)).toBeGreaterThanOrEqual(mid.xp.lore);
      expect(level(state, 'lore'), String(gap)).toBeGreaterThanOrEqual(level(mid, 'lore'));
      expect(state.pack.length, String(gap)).toBe(mid.pack.length);
      expect(state.seed, String(gap)).toBe(mid.seed);
      expect(state.at, String(gap)).toBe(mid.at);
      expect(state.satchels.length, String(gap)).toBeGreaterThanOrEqual(mid.satchels.length);
    }
  });

  it('elapsedSeconds clamps a phone whose clock ran backwards', () => {
    expect(elapsedSeconds(1_700_000_000_000, 1_700_000_060_000)).toBe(60);
    expect(elapsedSeconds(1_700_000_060_000, 1_700_000_000_000)).toBe(0);
    expect(elapsedSeconds(NaN, 1_700_000_000_000)).toBe(0);
    expect(elapsedSeconds(1_700_000_000_000, NaN)).toBe(0);
    expect(catchUpSince(s, 1_700_000_060_000, 1_700_000_000_000).state).toBe(s);
    expect(catchUpSince(s, 1_700_000_000_000, 1_700_003_600_000).state.xp.lore)
      .toBe(catchUp(s, 3600).state.xp.lore);
  });
});

describe('the dice do not roll while away', () => {
  it('the seed is untouched by a catch-up', () => {
    // `docs/DICE.md`: banked time pays XP, which is not random. A seed that
    // moved while nobody was looking means the throw the player was about to
    // make is not the throw they get.
    const s = running();
    for (const gap of [1, 21, 3600, 86400, 30 * 86400]) {
      expect(catchUp(s, gap).state.seed, String(gap)).toBe(s.seed);
    }
  });

  it('hands satchels over unopened — nothing is rolled, nothing is spent', () => {
    const s: Slice = { ...running(), satchels: [{ good: 'lead-strip', poor: 'reed-cord' }] };
    const { state, report } = catchUp(s, 12 * 3600);
    expect(state.satchels).toEqual(s.satchels);   // still shut
    expect(state.pack).toEqual(s.pack);           // nothing opened itself
    expect(state.seed).toBe(s.seed);
    expect(report.satchels).toBe(0);
    // And the satchel still opens, under the thumb, to exactly the throw it
    // would have given before the absence — same dice, same drop, same words.
    // ⚠️ COMPARED FIELD BY FIELD RATHER THAN WHOLE. An absence legitimately
    // moves xp and obols, so a whole-object compare would have to list every
    // field the absence is allowed to touch and would go red every time one is
    // added — which is how it went red here. What this test actually claims is
    // narrower: the DICE and the DROP are untouched.
    const openedAway = apply(state, { type: 'open' });
    const openedHere = apply(s, { type: 'open' });
    expect(openedAway.seed).toBe(openedHere.seed);
    expect(openedAway.lastRoll).toEqual(openedHere.lastRoll);
    expect(openedAway.pack).toEqual(openedHere.pack);
    expect(openedAway.satchels).toEqual(openedHere.satchels);
    expect(openedAway.said).toBe(openedHere.said);
  });

  it('never travels, never takes a choice, never changes where you are', () => {
    const s = running();
    const { state } = catchUp(s, 12 * 3600);
    expect(state.at).toBe(s.at);
    expect(state.seen).toEqual(s.seen);
    expect(state.job?.work).toBe(s.job?.work);
    expect(state.job?.at).toBe(s.job?.at);
  });
});

describe('nothing running', () => {
  it('banks nothing and returns the same state object', () => {
    const idle = initial(24301);
    expect(idle.job).toBeNull();
    const { state, report } = catchUp(idle, 12 * 3600);
    expect(state).toBe(idle);
    expect(report.done).toBe(0);
    expect(report.xp).toBe(0);
    expect(report.work).toBeNull();
    expect(report.line).toContain('Nothing was running');
  });

  it('pays nothing for a ghost job, and clears it exactly as a live tick would', () => {
    // A job standing at a place that has no work: it can only arrive by a place
    // losing its work between two sittings. The catch-up must not invent a
    // decision here — `tick` cancels it, so the catch-up cancels it too, or the
    // job would survive the resume and then vanish on the first frame.
    const bare = PLACES.find((p) => !p.work)!;
    const ghost: Slice = {
      ...initial(1), at: bare.id, seen: [0, bare.id],
      job: { work: 'gone', at: bare.id, left: 5 },
    };
    const { state, report } = catchUp(ghost, 3600);
    expect(state.job).toBeNull();
    expect(run(state)).toEqual(run(apply(ghost, { type: 'tick', secs: 3600 })));
    expect(report.done).toBe(0);
    expect(report.xp).toBe(0);
    expect(state.xp).toEqual(ghost.xp);
  });

  it('every work in the content is longer than zero seconds', () => {
    // The catch-up guards a zero-length job because the reducer's `while` would
    // spin forever on one. This is the other half of that guard: the content
    // must never contain one in the first place.
    for (const p of PLACES) {
      if (!p.work) continue;
      expect(p.work.secs, p.work.id).toBeGreaterThan(0);
      expect(p.work.xp, p.work.id).toBeGreaterThan(0);
    }
  });

  it('does not clobber what the screen last said', () => {
    const idle = { ...initial(1), said: 'You are here.' };
    expect(catchUp(idle, 86400).state.said).toBe('You are here.');
  });
});

describe('the report', () => {
  it('counts the repeats the reducer actually completed', () => {
    const { report } = catchUp(running(), 3600);
    expect(report.done).toBe(3600 / WORK.secs);          // 180
    // ⚠️ MEASURED, NOT MULTIPLIED. This asserted `180 * WORK.xp` and went red
    // the moment the perk ladder started multiplying work XP — a stale test
    // reporting a working feature as broken, which this repo has now done
    // twice. The report's own contract is that it describes what the reducer
    // did, so that is what is checked.
    const after = catchUp(running(), 3600).state;
    expect(report.xp).toBe(after.xp[WORK.skill] - running().xp[WORK.skill]);
    expect(report.xp).toBeGreaterThanOrEqual(180 * WORK.xp);
    expect(report.work).toEqual({
      id: WORK.id, label: WORK.label, skill: WORK.skill, skillName: 'Lore',
    });
  });

  it('counts from where the job actually stood, not from a full duration', () => {
    // Half a repeat already done. 3600 s of a 20 s job from 10 s left is 180
    // completions, the last of which lands early — floor(3600/20) is right here
    // only by luck, so the gap is chosen to make the two answers differ.
    const s: Slice = { ...running(), job: { work: WORK.id, at: 0, left: 10 } };
    const { state, report } = catchUp(s, 30);
    expect(report.done).toBe(2);                 // 10 s, then 20 s
    expect(state.job?.left).toBe(20);
    expect(report.xp).toBe(2 * WORK.xp);
    // The count and the payout must be the same event described twice.
    expect(report.xp).toBe(report.done * WORK.xp);
    expect(report.xp).toBe(state.xp.lore - s.xp.lore);
  });

  it('every number in the sentence is a number in the state', () => {
    const s = running();
    const { state, report } = catchUp(s, 12 * 3600);
    expect(report.done).toBe(2160);
    // The line's job is that every number in it is a number in the state, so
    // this reads them BACK OUT of the state rather than recomputing them. The
    // flat `done * WORK.xp` it used to assert stopped being true when the perk
    // ladder began multiplying work XP, and would have made the report look
    // broken when it was correct.
    expect(report.xp).toBe(state.xp.lore - s.xp.lore);
    expect(report.xp).toBeGreaterThanOrEqual(report.done * WORK.xp);
    expect(report.levelBefore).toBe(level(s, 'lore'));
    expect(report.levelAfter).toBe(level(state, 'lore'));
    expect(report.line).toContain(String(report.done));
    expect(report.line).toContain(`+${report.xp} Lore`);
    expect(report.line).toContain(`Lore ${report.levelBefore} → ${report.levelAfter}`);
    expect(report.line).toContain(WORK.label);
  });

  it('a job that completed many times over reports the right count', () => {
    for (const gap of [20, 21, 199, 3600, 12 * 3600]) {
      const { state, report } = catchUp(running(), gap);
      expect(report.done, String(gap)).toBe(Math.floor(gap / WORK.secs));
      // Against the report, not against a flat rate: work XP is multiplied by
      // the skill's own perk ladder, so `done * WORK.xp` is only the floor.
      expect(state.xp.lore, String(gap)).toBe(report.xp);
      expect(state.xp.lore, String(gap)).toBeGreaterThanOrEqual(report.done * WORK.xp);
    }
  });

  it('a gap too short to finish anything says so and banks the progress', () => {
    const { state, report } = catchUp(running(), 5);
    expect(report.done).toBe(0);
    expect(report.xp).toBe(0);
    expect(state.job?.left).toBe(WORK.secs - 5);
    expect(report.line).toContain('is still going');
    expect(state).not.toBe(running());  // progress was banked, just not paid out
  });

  it('reads in English at the gaps the owner actually plays', () => {
    // Short sittings on a phone, days apart. The sentence is a DRAFT for the
    // owner (CLAUDE.md); what is asserted here is that it is not nonsense.
    expect(catchUp(running(), 45).report.line).toContain('45 seconds');
    expect(catchUp(running(), 600).report.line).toContain('10 minutes');
    expect(catchUp(running(), 3600).report.line).toContain('1 hour');
    expect(catchUp(running(), 8 * 3600).report.line).toContain('8 hours');
    expect(catchUp(running(), 3 * 86400).report.line).toContain('3 days');
    for (const gap of [1, 45, 600, 3600, 8 * 3600, 3 * 86400, 400 * 86400]) {
      const line = catchUp(running(), gap).report.line;
      expect(line, String(gap)).not.toContain('NaN');
      expect(line, String(gap)).not.toContain('undefined');
      expect(line, String(gap)).not.toMatch(/\b1 \w+s\b/);   // no "1 hours"
    }
  });
});

describe('purity', () => {
  it('does not touch the state it was handed', () => {
    const s = running();
    const before = JSON.stringify(s);
    catchUp(s, 12 * 3600);
    catchUp(s, -5);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('is a function of its arguments — same gap, same run, forever', () => {
    const s = running();
    expect(catchUp(s, 12345)).toEqual(catchUp(s, 12345));
  });

  it('reads no clock: the module never calls Date.now', async () => {
    // Cheap, and the reason it is here is that the whole defect being fixed was
    // "the engine has no clock" — the fix must not smuggle one in.
    const src = await import('node:fs/promises')
      .then((fs) => fs.readFile(new URL('../src/slice/offline.ts', import.meta.url), 'utf8'));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/Date\.now|performance\.now|new Date|Math\.random/);
  });
});
