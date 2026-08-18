// ★★★ THE CRAWLER — two graphs, 2026-08-18.
//
// The owner: *"so how are we going full on graph? how we'll achieve that —
// maybe let's come back to ai exploring stuff idea"*.
//
// The answer is TWO GRAPHS. There is the dungeon, and there is the crawler's
// MODEL of the dungeon, and the gap between them is the game. Almost every
// test below is about that gap: what it claims, what is actually there, and
// what happens when you walk into the difference.
//
// ⚠️ AND THE LIE IS A RULE, NOT A DIE ROLL. There is no RNG in this engine.
// The crawler is wrong because of HOW IT THINKS, so every wrong thing it says
// is a pure function of the state — which is the only reason any of this is
// testable at all.
import { describe, it, expect } from 'vitest';
import { apply, initial, doorsOf, claimed, inferred, guessedSafe, hallucinated,
  frontier, canSend, canLeave, CRAWL_HP, GUESS, type Delve } from '../src/delve/engine';
import { ROOM, ROOMS } from '../src/delve/dungeon';

const send = (g: Delve): Delve => apply(g, { type: 'send' });
const wait = (g: Delve): Delve => apply(g, { type: 'wait' });
const go = (g: Delve, to: number): Delve => apply(g, { type: 'walk', to });
/** Let the crawler run n turns while you stand at the Mouth. */
const run = (g: Delve, n: number): Delve => {
  let out = g;
  for (let i = 0; i < n; i++) out = wait(out);
  return out;
};

describe('★★★ YOU SEND SOMETHING DOWN', () => {
  it('★ only from the Mouth, and only one at a time', () => {
    const g = initial();
    expect(canSend(g)).toBe(true);
    const out = send(g);
    expect(out.crawl).not.toBeNull();
    expect(out.crawl!.hp).toBe(CRAWL_HP);
    expect(canSend(out)).toBe(false);
    expect(send(out)).toBe(out);                       // refused, unchanged
    expect(canSend(go(g, 1))).toBe(false);             // not from down there
  });

  it('★★★ and then it walks the graph on its own, one door a turn', () => {
    const g = run(send(initial()), 4);
    expect(g.crawl!.turns).toBeGreaterThanOrEqual(4);
    expect(g.crawl!.walked.length).toBeGreaterThan(2);
    // ⚠️ IT WALKS THE REAL GRAPH. Every room it says it stood in must be one
    // door from the one before — an explorer that teleports is a random number
    // generator wearing a hat.
    for (const r of g.crawl!.walked) expect(ROOM.has(r)).toBe(true);
    expect(g.crawl!.walked).toContain(0);
    expect(g.crawl!.walked).toContain(1);
  });

  it('★★★ every step it takes is through a REAL door', () => {
    // ⚠️ THE PROPERTY THAT MAKES THE WHOLE THING HONEST. The crawler must walk
    // the same graph you do — an explorer that teleports to the next unvisited
    // room is a random number generator wearing a hat, and its map would be
    // describing a dungeon nobody can walk. Checking only that its rooms EXIST
    // let a teleporting draft of this pass.
    let g = { ...send(initial()), hp: 400 };
    let prev = g.crawl!.at;
    for (let i = 0; i < 14; i++) {
      g = { ...wait(g), hp: 400 };
      const now = g.crawl!.at;
      if (now !== prev) expect(doorsOf(prev), `${prev} → ${now}`).toContain(now);
      prev = now;
    }
  });

  it('★★★ and when the frontier is NOT next door, it walks back round to it', () => {
    // ⚠️ THE CASE A LIVE RUN CANNOT REACH, so it is built by hand. A crawler
    // has 4 hp and dies in the first lair it wakes — long before it ever has
    // to backtrack — which meant a sabotage that made it TELEPORT straight to
    // the frontier stayed green through fourteen turns of real play. Standing
    // it on the far side of the map is the only way to see the difference.
    const g: Delve = { ...initial(), hp: 400,
      crawl: { at: 3, hp: 40, walked: [0, 1, 2, 3, 4, 5, 6], turns: 9, done: false } };
    expect(frontier(g)).toBe(7);              // the Drowned Well, two doors off
    expect(doorsOf(3)).not.toContain(7);      // and no door goes straight there
    expect(wait(g).crawl!.at).toBe(5);        // so: through the Gallery, not rock
  });

  it('★★★ it goes to the NEAREST thing it has not seen', () => {
    // ⚠️ SENDING IS ITSELF A TURN, so it has already taken its first door by
    // the time the action returns. Everything in this dungeon costs one turn
    // and the crawler is not exempt.
    const g = send(initial());
    expect(g.crawl!.at).toBe(1);                       // the only door out
    expect([2, 3]).toContain(frontier(g));             // and the hall forks
    expect(run(g, 1).crawl!.at).toBe(2);               // nearest first, always
  });
});

describe('★★★ AND WHAT IT SAYS IS NOT WHAT IS THERE', () => {
  it('★★★ it files every room it did not enter as empty and safe', () => {
    const g = run(send(initial()), 1);                 // stands in Broken Hall
    expect(g.crawl!.walked).toContain(1);
    // It saw the doors to the Weeping Stair and the Rat Warren from there.
    expect(claimed(g)).toContain(3);
    expect(inferred(g)).toContain(3);
    // ★★★ THE LIE. The Rat Warren is a LAIR. The crawler has not been in it,
    // so it says it is safe — not because it rolled badly, but because it is
    // completing a pattern rather than looking.
    expect(guessedSafe(g, 3)).toBe(true);
    expect(ROOM.get(3)!.kind).toBe('lair');
  });

  it('★★★ and standing in the room is what corrects it — out loud', () => {
    // ⚠️ THE ONE LINE THIS WHOLE MECHANIC EXISTS TO PRINT.
    const g = run(send(initial()), 1);
    expect(guessedSafe(g, 3)).toBe(true);
    const there = go(go(g, 1), 3);
    expect(there.log.join(' ')).toMatch(/filed Rat Warren as empty\. It is not\./);
    expect(there.foes.length).toBeGreaterThan(0);
  });

  it('★★★ walking a room MOVES IT out of the guesses and into the report', () => {
    const g = run(send(initial()), 3);
    for (const r of g.crawl!.walked) expect(guessedSafe(g, r)).toBe(false);
    expect(inferred(g).every((r) => !g.crawl!.walked.includes(r))).toBe(true);
  });
});

describe('★★★ DOORS THAT DO NOT EXIST', () => {
  it('★★★ it joins up rooms that are merely NEAR each other', () => {
    // ★★★ A HALLUCINATED EDGE, on a game whose whole subject is a graph. This
    // is the sharpest thing the mechanic does and it costs no RNG at all.
    const g = run(send(initial()), 1);
    const drawn = hallucinated(g);
    expect(drawn.length).toBeGreaterThan(0);
    for (const [a, b] of drawn) {
      // ⚠️ EVERY ONE OF THEM IS A LIE. If a real door ever showed up in this
      // list the map would be telling the truth by accident, and the player
      // could never learn to distrust it.
      expect(doorsOf(a), `${a}-${b} is invented`).not.toContain(b);
      expect(Math.hypot(ROOM.get(a)!.x - ROOM.get(b)!.x,
                        ROOM.get(a)!.y - ROOM.get(b)!.y)).toBeLessThanOrEqual(GUESS);
    }
  });

  it('★★★ and verifying BOTH ends deletes the invention', () => {
    // The arc that makes walking the frontier feel like progress: its map
    // becomes true one room at a time, and you are the one making it true.
    //
    // ⚠️ NOT A COUNT THAT ONLY FALLS. The total goes UP as often as down,
    // because every new room it claims brings its own new near-neighbours to
    // invent doors between — the first draft of this test asserted a monotone
    // decrease and was simply wrong about the mechanic. What holds is the
    // thing that matters: a specific invention dies when you verify its ends.
    const joins = (g: Delve, a: number, b: number): boolean =>
      hallucinated(g).some(([x, y]) => x === a && y === b);
    const g = send(initial());
    expect(g.crawl!.walked).not.toContain(2);
    expect(joins(g, 0, 2)).toBe(true);        // "the Mouth opens on the Stair"
    const on = run(g, 1);
    expect(on.crawl!.walked).toContain(2);    // it goes and stands in it
    expect(joins(on, 0, 2)).toBe(false);      // and the invented door is gone
  });

  it('★ it says nothing at all before you send one', () => {
    expect(claimed(initial())).toEqual([]);
    expect(hallucinated(initial())).toEqual([]);
    expect(frontier(initial())).toBeNull();
  });
});

describe('★★★ THE PRICE OF SENDING ONE', () => {
  it('★★★ it wakes what it walks into, and those things come for YOU', () => {
    // ⚠️ THE GOOD KIND OF PRICE: not a fee, but a dungeon that is more awake
    // than it was, in rooms you have not reached yet.
    const g = run(send(initial()), 6);
    expect(g.foes.length).toBeGreaterThan(0);
    expect(g.log.join(' ')).toMatch(/crawler wakes something/);
  });

  it('★★★ and it dies down there — the ordinary outcome, not the failure', () => {
    const g = run(send(initial()), 20);
    expect(g.crawl!.done).toBe(true);
    // ★ ITS REPORT STANDS. That is what you sent it for.
    expect(g.crawl!.walked.length).toBeGreaterThan(2);
    expect(claimed(g).length).toBeGreaterThan(g.crawl!.walked.length);
  });

  it('★★★ the next one you send picks up the map, not a blank sheet', () => {
    // ⚠️ hp, BECAUSE WAITING AT THE MOUTH FOR 20 TURNS KILLS YOU. What the
    // crawler wakes walks up the shaft after you, and the first draft of this
    // test failed on a fallen delver — which is the mechanic working, not a
    // bug, but it is not what this test is about.
    const dead = run({ ...send(initial()), hp: 400 }, 20);
    expect(canSend(dead)).toBe(true);
    const next = send(dead);
    expect(next.crawl!.walked).toEqual(dead.crawl!.walked);
    expect(next.crawl!.hp).toBe(CRAWL_HP);
    expect(next.crawl!.done).toBe(false);
  });

  it('★★★ a crawler in a room is BAIT — the thing deals with it, not you', () => {
    // Not designed, fell out of "a foe deals with what is in its room before
    // it goes looking for you". Parking one on a pack buys you clean turns.
    let g = run(send(initial()), 20);              // wake the dungeon, lose one
    g = { ...g, hp: 200 };
    const packed = g.foes.filter((f) => f.hp > 0);
    expect(packed.length).toBeGreaterThan(0);
    const withBait = send(g);                       // a fresh crawler walks in
    const chewed = run(withBait, 12);
    expect(chewed.log.join(' ')).toMatch(/tears at the crawler/);
  });
});

describe('★★★ THE MOUTH IS ALWAYS A WAY OUT', () => {
  it('★★★ even empty-handed, because the crawler sends things up the shaft', () => {
    // ⚠️ CHANGED WITH THE CRAWLER. Leaving used to need a purse, on the
    // tidiness argument that leaving with nothing is not a move. Then the
    // crawler started waking things that walk up to the Mouth after you, and
    // a delver standing there with an empty purse had no move at all.
    const g = initial();
    expect(g.purse).toBe(0);
    expect(canLeave(g)).toBe(true);
    const out = apply(run(send(g), 8), { type: 'leave' });
    expect(out.fallen).toBe(false);
    expect(out.at).toBe(0);
  });

  it('★ but not from down there', () => {
    expect(canLeave(go(initial(), 1))).toBe(false);
  });
});

describe('★★★ IT IS THE SAME REPORT EVERY TIME', () => {
  it('★★★ no RNG: two identical runs claim exactly the same things', () => {
    // ⚠️ THE PROPERTY THE WHOLE DESIGN RESTS ON. A crawler that lied at random
    // would be noise the player cannot learn; one that lies BY RULE is a
    // system they can come to read. It is also the only reason any of the
    // tests above mean anything.
    const a = run(send(initial()), 12);
    const b = run(send(initial()), 12);
    expect(a.crawl).toEqual(b.crawl);
    expect(claimed(a)).toEqual(claimed(b));
    expect(hallucinated(a)).toEqual(hallucinated(b));
    expect(a.log).toEqual(b.log);
  });

  it('★ and every room it will ever talk about is a real room', () => {
    const g = run(send(initial()), 20);
    for (const r of claimed(g)) expect(ROOMS.some((x) => x.id === r)).toBe(true);
  });
});
