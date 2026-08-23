// ★★★ AWAY — the idle spine, 2026-08-20.
//
// ⚠️ THE ONE GENRE FEATURE A TURN-BASED GAME HAS NO OBVIOUS HOME FOR. An
// incremental is played in the gaps of a day: you open it, spend it, close it,
// and something has happened when you come back. A game where nothing happens
// while you are gone has no reason to be reopened.
//
// ★★★ AND THE GAME ALREADY CONTAINED THE ANSWER: an autonomous thing walking a
// graph. You send a crawler down, close the app, and come back to a report.
//
// ⚠️ AND NOTHING TOUCHES YOU WHILE YOU ARE GONE. `docs/BRIEF.md` forbids
// punishing absence, and coming back to a corpse is both the worst version of
// this mechanic and the easy one to write.
import { describe, it, expect } from 'vitest';
import { apply, initial, AWAY_CAP, type Delve } from '../src/delve/engine';

const send = (g: Delve): Delve => apply(g, { type: 'send' });
const away = (g: Delve, turns: number): Delve => apply(g, { type: 'away', turns });
const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });

describe('★★★ THE CRAWLER KEEPS WALKING WHILE YOU ARE GONE', () => {
  it('★★★ and it has covered ground when you come back', () => {
    const sent = send(initial());
    const back = away(sent, 4);
    expect(back.crawl!.turns).toBeGreaterThan(sent.crawl!.turns);
    expect(back.crawl!.walked.length).toBeGreaterThan(sent.crawl!.walked.length);
    expect(back.log.join(' ')).toMatch(/While you were away it walked \d+ more/);
  });

  it('★★★ AND NOTHING TOUCHED YOU. Not one point of it.', () => {
    // ⚠️ THE RULE THE WHOLE FEATURE RESTS ON. The brief forbids punishing
    // absence: the dungeon does NOT take its turn, so what the crawler wakes
    // stands still until you are back at the controls.
    const sent = { ...send(initial()), hp: 12 };
    const back = away(sent, AWAY_CAP);
    expect(back.hp).toBe(12);
    expect(back.fallen).toBe(false);
    expect(back.turn).toBe(sent.turn);          // no turns were taken FOR you
    expect(back.at).toBe(0);
  });

  it('★★★ what it woke is awake, and standing exactly where it woke up', () => {
    const back = away(send(initial()), 30);
    expect(back.foes.length).toBeGreaterThan(0);
    // Nothing walked up the shaft at you.
    expect(back.foes.every((f) => f.at === f.from)).toBe(true);
    expect(back.foes.some((f) => f.at === 0)).toBe(false);
  });

  it('★★★ and it can die down there while you are not looking', () => {
    const back = away(send(initial()), AWAY_CAP);
    expect(back.crawl!.done).toBe(true);
    expect(back.crawl!.walked.length).toBeGreaterThan(2);   // the report stands
  });
});

describe('★★★ AND IT IS BOUNDED, AND IT IS FUSSY ABOUT WHERE', () => {
  it('★★★ only from the Mouth', () => {
    // ⚠️ Anywhere else, "you were away" means "you were standing in a lair",
    // which cannot be made safe honestly.
    const down = go(send(initial()), 1);
    expect(away(down, 20)).toBe(down);
  });

  it('★ and only with something down there to walk', () => {
    const g = initial();
    expect(away(g, 20)).toBe(g);                 // nothing sent
    const spent = away(send(g), AWAY_CAP);
    expect(spent.crawl!.done).toBe(true);
    expect(away(spent, 50)).toBe(spent);         // and it is not coming back
  });

  it('★★★ a week away is not a week of progress', () => {
    // Coming back to unbounded progress is how an idle game stops having a
    // reason to be opened at all.
    const a = away(send(initial()), AWAY_CAP);
    const b = away(send(initial()), AWAY_CAP * 500);
    expect(b.crawl).toEqual(a.crawl);
  });

  it('★ nonsense is refused rather than trusted', () => {
    const sent = send(initial());
    expect(away(sent, 0)).toBe(sent);
    expect(away(sent, -50)).toBe(sent);
    expect(away(sent, 0.4)).toBe(sent);
  });
});
