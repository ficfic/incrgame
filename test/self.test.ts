// THE SELF TAB — what you carry and what you are.
//
// ⚠️ REWRITTEN ON THE OWNER'S CORRECTION, 2026-08-01: *"self is a stat sheet and
// inventory, but not game statistics."*
//
// The first version of this file asserted "0 of 43 ways" and "1 of 37 places",
// and every one of those assertions passed. The numbers were true; they were
// the WORLD'S numbers on the CHARACTER'S sheet, and the owner rejected them on
// sight. A test suite cannot tell you that, which is the whole reason rule 3
// says build the smallest thing and then look at it.
//
// So what is checked here is that Self says only things that are true of YOU:
// what is in your hand, how fast you gather, and what making a way costs you
// right now — and that the progress counters do not come back.
//
// ---- PROVEN RED, 2026-08-01 ----------------------------------------------
// (sabotage log in the commit message)
import { describe, it, expect } from 'vitest';
import { apply, initial, forgeSecs, unforgeable, costOf, waysFrom,
  SECS_PER_PACE, type Game } from '../src/game/engine';
import { PLACE, PLACES } from '../src/game/places';
import { self, placeId } from '../src/game/world';

const rest = (g: Game, secs: number): Game => apply(g, { type: 'tick', secs });

function reach(g: Game, to: number): Game {
  let out = g;
  for (let i = 0; i < 900 && unforgeable(out, to); i++) out = rest(out, 30);
  out = apply(out, { type: 'forge', to });
  out = rest(out, forgeSecs(g) + 1);
  return apply(out, { type: 'go', to });
}

/** A run that has actually done something, so the numbers have something to be
 *  wrong about. */
function played(): Game {
  let g = initial();
  for (let i = 0; i < 4; i++) {
    const to = PLACE.get(g.at)!.ways.find((t) => !g.seen.includes(t));
    if (to === undefined) break;
    g = reach(g, to);
  }
  return rest(g, 40);
}

const nodeOf = (g: Game, id: string) => self(g).nodes.find((n) => n.id === id)!;
const words = (g: Game) => self(g).nodes.map((n) => `${n.name} ${n.body ?? ''}`).join(' ');

describe('Self is you, and everything hangs off you', () => {
  it('joins every node to you and to nothing else', () => {
    // A star, not a map. If Self ever grows edges between its parts it has
    // started modelling something, and nothing here is a model.
    const v = self(played());
    for (const e of v.edges) expect(e.a, `${e.a}-${e.b}`).toBe('you');
    expect(new Set(v.edges.map((e) => e.b)).size).toBe(v.edges.length);
    expect(v.edges.length).toBe(v.nodes.length - 1);
  });

  it('says where you are standing, and it is where you are standing', () => {
    const g = played();
    expect(nodeOf(g, 'you').body).toContain(PLACE.get(g.at)!.name);
    expect(nodeOf(g, placeId(g.at)).name).toBe(PLACE.get(g.at)!.name);
    expect(self(g).edges).toContainEqual({ a: 'you', b: placeId(g.at), rel: 'stands' });
  });

  it('uses the model\'s own words for carrying and having', () => {
    // R1.2: `item`/`carries` already existed in the vocabulary and nothing had
    // used them. An inventory that invents its own relation is a second model.
    const v = self(played());
    expect(v.nodes.find((n) => n.id === 'carry:paces')!.kind).toBe('item');
    expect(v.edges).toContainEqual({ a: 'you', b: 'carry:paces', rel: 'carries' });
    for (const id of ['stat:gather', 'stat:making']) {
      expect(v.edges).toContainEqual({ a: 'you', b: id, rel: 'has' });
    }
  });
});

describe('★ the inventory', () => {
  it('holds what is in your hand, in the same word the header uses', () => {
    const g = rest(initial(), 7 * SECS_PER_PACE);
    expect(g.paces).toBe(7);
    expect(nodeOf(g, 'carry:paces').name).toBe('7 paces');
    expect(nodeOf(rest(initial(), SECS_PER_PACE), 'carry:paces').name).toBe('1 pace');
  });

  it('★ holds nothing else, because nothing else can be held yet', () => {
    // `src/slice/content.ts` has nine authored keys and this engine drops none
    // of them. Empty slots would promise a system that does not exist — the
    // eleven-systems mistake in miniature. When drops arrive, so do they, and
    // this test should be the thing that fails.
    const carried = self(played()).nodes.filter((n) => n.kind === 'item');
    expect(carried.map((n) => n.id)).toEqual(['carry:paces']);
  });
});

describe('★ the stats are yours, not the valley\'s', () => {
  it('reads the rate you actually gather at', () => {
    expect(nodeOf(played(), 'stat:gather').name).toBe(`A pace every ${SECS_PER_PACE}s`);
    // And it is the rate the engine really pays.
    expect(rest(initial(), SECS_PER_PACE * 5).paces).toBe(5);
  });

  it('reads what making a way costs you right now, in time and in paces', () => {
    const g = played();
    expect(nodeOf(g, 'stat:making').name).toBe(`A way takes ${forgeSecs(g)}s`);
    const next = waysFrom(g).filter((w) => !w.made).sort((a, b) => a.cost - b.cost)[0];
    if (next) {
      expect(nodeOf(g, 'stat:making').body).toContain(`${next.cost} paces`);
      expect(next.cost).toBe(costOf(g, next.to));
    } else {
      expect(nodeOf(g, 'stat:making').body).toContain('already made');
    }
  });

  it('★ and that cost climbs as the run goes on', () => {
    // The stat is only worth a node because it MOVES. A constant would be a
    // label. This is also the reason a skill cannot offset it — see the note in
    // `world.ts` and `docs/TABS.md`.
    const early = nodeOf(initial(), 'stat:making').name;
    const late = nodeOf({ ...initial(), solid: ['100|101', '101|102', '102|103'] }, 'stat:making').name;
    expect(late).not.toBe(early);
    expect(forgeSecs({ ...initial(), solid: ['100|101', '101|102', '102|103'] }))
      .toBeGreaterThan(forgeSecs(initial()));
  });
});

describe('★ the game statistics stay off the character sheet', () => {
  it('never counts ways made, places found, or distance from the start', () => {
    // ⚠️ THE POINT OF THE WHOLE REWRITE. Every one of these shipped on this tab
    // and was rejected on sight: *"zero of the three ways, one of thirty-seven
    // places. I don't wanna see these stats on the Self."*
    const said = words(played());
    for (const gone of [' of 43', ' of 37', 'ways out', 'places found',
      'Still at the start', 'ways made']) {
      expect(said, `Self is still saying "${gone}"`).not.toContain(gone);
    }
  });

  it('says nothing that counts the world rather than you', () => {
    // A looser net for the same class of thing: "N of M" is the shape a
    // progress counter takes, whatever it is counting.
    const g = played();
    for (const n of self(g).nodes) {
      expect(`${n.name}`, `"${n.name}" reads as progress, not a stat`)
        .not.toMatch(/\d+\s+of\s+\d+/);
    }
  });

  it('has no skill, level or XP', () => {
    const said = words(played()).toLowerCase();
    for (const word of ['skill', 'level', ' xp', 'wayfaring']) {
      expect(said, `Self names "${word.trim()}"`).not.toContain(word);
    }
  });

  it('★ shows WHY skills are still absent: price and fill move together', () => {
    // If these ever stop moving in lockstep, a skill has somewhere to bite and
    // this test should be deleted along with the note in `world.ts`.
    const cheap = { ...initial(), solid: [] };
    const dear = { ...initial(), solid: ['100|101', '101|102', '102|103'] };
    const to = PLACE.get(PLACES[0]!.id)!.ways[0]!;
    expect(costOf(dear, to)).toBeGreaterThan(costOf(cheap, to));
    expect(forgeSecs(dear)).toBeGreaterThan(forgeSecs(cheap));
  });
});

describe('the sheet follows the run', () => {
  it('every number moves when the run moves', () => {
    // The cheapest way for a character sheet to be wrong is to be a constant.
    const a = self(initial()).nodes.map((n) => n.name).join('|');
    const b = self(played()).nodes.map((n) => n.name).join('|');
    expect(b).not.toBe(a);
  });
});
