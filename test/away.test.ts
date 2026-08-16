// ★★★ ABSENCE MUST NOT PUNISH — `docs/BRIEF.md`, standing constraint:
// *"No mechanic may require checking in. Timers bank work; they never punish
// absence."* `the-redditor` measured the opposite: an overnight absence was
// worth about two minutes of goods and cost two buildings.
import { describe, it, expect } from 'vitest';
import { apply, catchUp, initial, flow, pathKey, RAID_SECS, RAID_HOLD,
  AWAY_LEARNS, skillOf, type City } from '../src/camp/engine';

/** A town with works to lose and three holdings ready to come for them. */
const exposed = (over: Partial<City> = {}): City => ({
  ...initial(), pop: 12, food: 9000, store: 6,
  stacks: { 0: 4, 1: 1, 2: 1, 3: 1 },
  paths: { [pathKey(0, 1)]: 1, [pathKey(0, 2)]: 1, [pathKey(0, 3)]: 1 },
  taken: 1, ...over });

describe('★★★ COMING BACK', () => {
  it('★★★ only ONE raid is waiting, however long you were gone', () => {
    // ⚠️ Raids do not resolve on away ticks but menace still FILLS and clamps
    // at 1, so every holding sat on a full fuse and the first live tick
    // resolved all of them at once. The hero can stand in front of exactly
    // one gate — that is the design — so a night away cost two buildings for
    // the crime of closing the tab.
    const away = catchUp(exposed(), RAID_SECS * 6);
    const ready = Object.values(away.menace).filter((m) => m >= 1).length;
    expect(ready).toBeLessThanOrEqual(1);
  });

  it('★★★ and the others are still coming — parked, not disarmed', () => {
    const away = catchUp(exposed(), RAID_SECS * 6);
    const held = Object.values(away.menace).filter((m) => m >= RAID_HOLD && m < 1);
    expect(held.length).toBeGreaterThan(0);
    // ★ Still drawn, still nearly ready: this is a warning, not a reprieve.
    expect(RAID_HOLD).toBeGreaterThan(0.85);
    expect(RAID_HOLD).toBeLessThan(1);
  });

  it('★★★ LIVE play is untouched — raids may still land together', () => {
    // ⚠️ THE CAP IS ON THE BACKLOG, NOT ON THE WAR. Raids arriving at once
    // while you watch is the war working, and one-hero-one-gate is the whole
    // point of it. Only `away` ticks park the extras.
    // ⚠️ THE FIRST VERSION OF THIS TEST PRIMED SITES 1-3, WHICH ARE NOT
    // HOLDINGS — `able` skipped them, the stand-down loop zeroed them, and
    // the assertion counted those zeroes and passed for the wrong reason.
    // Applying the away cap to live play left it green. The valley's real
    // holdings are 4-9.
    const primed: City = { ...exposed(), menace: { 4: 1, 5: 1, 6: 1 } };
    const live = apply(primed, { type: 'tick', secs: 1 });
    const landed = [4, 5, 6].filter((id) => (live.menace[id] ?? 1) === 0).length;
    expect(landed).toBeGreaterThan(1);
  });
});

describe('★★★ THE TOWN LEARNS WHILE YOU ARE GONE, BUT NOT FOREVER', () => {
  const digging = (over: Partial<City> = {}): City => ({
    ...initial(), stacks: { 0: 3, 1: 1 }, pop: 10, store: 8,
    paths: { [pathKey(0, 1)]: 1 }, food: 9000, ...over });

  it('★★★ an hour away teaches; twelve hours does not teach twelve times', () => {
    // ⚠️ EVERY OTHER STOCK BANKS AGAINST A CEILING AND XP DID NOT. Measured
    // by `the-graph` at ×4 output over one night, carrying BOTH works doors
    // — so an absence skipped the whole trade ladder. The game played itself
    // better than the player does.
    const hour = catchUp(digging(), 3600).xp.quarrying ?? 0;
    const night = catchUp(digging(), 3600 * 12).xp.quarrying ?? 0;
    expect(hour).toBeGreaterThan(0);
    expect(night).toBeLessThan(hour * 1.5);
  });

  it('★★★ and PLAYED time is never capped — only unattended time is', () => {
    const played = apply(digging(), { type: 'tick', secs: AWAY_LEARNS * 3 });
    const away = catchUp(digging(), AWAY_LEARNS * 3);
    expect(played.xp.quarrying ?? 0).toBeGreaterThan(away.xp.quarrying ?? 0);
    expect(skillOf(played, 'quarrying')).toBeGreaterThanOrEqual(skillOf(away, 'quarrying'));
  });

  it('★★ the GOODS still bank the whole time — this is a learning cap only', () => {
    const short = catchUp(digging(), 600);
    const long = catchUp(digging(), 3600 * 4);
    expect(long.stone).toBeGreaterThan(short.stone);
    void flow;
  });
});
