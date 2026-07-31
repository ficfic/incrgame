// THE SELF TAB — you, and every true thing about you.
//
// `docs/TABS.md` build order 5. The entry says "skills and stats as a graph",
// and skills are NOT here. That is a finding, not a postponement, and it is the
// first thing this file asserts: `costOf` and `forgeSecs` both key off
// `solid.length`, so a skill trained by making ways would rise in exact lockstep
// with the thing it is meant to offset. A skill is a choice about where to spend
// time; there is one verb, so there is nothing to choose between.
//
// What IS here is four numbers, and the only way they can be wrong is by
// disagreeing with the run — so that is what is checked, from a played state
// rather than a fresh one.
//
// ---- PROVEN RED, 2026-07-31 ----------------------------------------------
// (sabotage log in the commit message)
import { describe, it, expect } from 'vitest';
import { apply, initial, forgeSecs, unforgeable, costOf, waysFrom,
  SECS_PER_PACE, type Game } from '../src/game/engine';
import { PLACE, PLACES, START } from '../src/game/places';
import { self, placeId, ROUTES_IN_ALL } from '../src/game/world';

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

describe('Self is you, and everything hangs off you', () => {
  it('joins every node to you and to nothing else', () => {
    // A star, not a map. If Self ever grows edges between its facts it has
    // started modelling something, and nothing here is a model.
    const v = self(played());
    for (const e of v.edges) expect(e.a, `${e.a}-${e.b}`).toBe('you');
    expect(new Set(v.edges.map((e) => e.b)).size).toBe(v.edges.length);
    expect(v.nodes.map((n) => n.id)).toContain('you');
    // Every node bar you is joined to you exactly once.
    expect(v.edges.length).toBe(v.nodes.length - 1);
  });

  it('says where you are standing, and it is where you are standing', () => {
    const g = played();
    expect(nodeOf(g, 'you').body).toContain(PLACE.get(g.at)!.name);
    expect(nodeOf(g, placeId(g.at)).name).toBe(PLACE.get(g.at)!.name);
    expect(self(g).edges).toContainEqual({ a: 'you', b: placeId(g.at), rel: 'stands' });
  });
});

describe('★ four numbers, and every one of them true of the run', () => {
  it('paces reads the purse, and reads it in the same word the header does', () => {
    const g = rest(initial(), 7 * SECS_PER_PACE);
    expect(g.paces).toBe(7);
    expect(nodeOf(g, 'fact:paces').name).toBe('7 paces');
    expect(nodeOf(rest(initial(), SECS_PER_PACE), 'fact:paces').name).toBe('1 pace');
  });

  it('ways made counts routes proved, against every route in the valley', () => {
    const g = played();
    expect(g.solid.length).toBeGreaterThan(0);
    expect(nodeOf(g, 'fact:ways').name).toBe(`${g.solid.length} of ${ROUTES_IN_ALL} ways`);
    // The denominator is the world's, counted once per pair.
    const counted = PLACES.reduce((n, p) => n + p.ways.filter((t) => t > p.id).length, 0);
    expect(ROUTES_IN_ALL).toBe(counted);
    expect(ROUTES_IN_ALL).toBeGreaterThanOrEqual(PLACES.length - 1);
  });

  it('quotes the price of the next way from where you actually stand', () => {
    const g = played();
    const next = waysFrom(g).filter((w) => !w.made).sort((a, b) => a.cost - b.cost)[0];
    if (next) {
      expect(nodeOf(g, 'fact:ways').body).toContain(`costs ${next.cost}`);
      expect(next.cost).toBe(costOf(g, next.to));
    } else {
      expect(nodeOf(g, 'fact:ways').body).toContain('already made');
    }
  });

  it('places found counts where you have stood, against the whole valley', () => {
    const g = played();
    expect(nodeOf(g, 'fact:places').name)
      .toBe(`${g.seen.length} of ${PLACES.length} places`);
    expect(g.seen.length).toBeGreaterThan(1);
  });

  it('★ reach is the deepest place you have actually reached', () => {
    // The number most easily faked by counting something else: this is graph
    // distance from the start, not places seen and not routes made.
    let g = initial();
    expect(nodeOf(g, 'fact:reach').name).toBe('Still at the start');
    expect(nodeOf(g, 'fact:reach').body).toContain(PLACES[0]!.name);

    // One hop out is one way out, however many routes were made getting there.
    const first = PLACE.get(START)!.ways[0]!;
    g = reach(initial(), first);
    expect(nodeOf(g, 'fact:reach').name).toBe('1 ways out');
    expect(nodeOf(g, 'fact:reach').body).toContain(PLACE.get(first)!.name);

    // Walking back does not shrink it — reach is the furthest you have BEEN.
    g = apply(g, { type: 'go', to: START });
    expect(g.at).toBe(START);
    expect(nodeOf(g, 'fact:reach').name).toBe('1 ways out');

    // ⚠️ THE ONE THAT MAKES THIS TEST WORTH ANYTHING. Place ids and distances
    // agree for the first few hops, so ranking `seen` by ID passed everything
    // above — proven by sabotage. Place 5 is three ways out and place 100 is
    // two, so the deeper place has the SMALLER id and only a real distance can
    // tell them apart.
    const deep = { ...initial(), at: 100, seen: [START, 100, 5] };
    expect(nodeOf(deep, 'fact:reach').name).toBe('3 ways out');
    expect(nodeOf(deep, 'fact:reach').body).toContain(PLACE.get(5)!.name);
  });

  it('every number moves when the run moves', () => {
    // The cheapest way for a stat sheet to be wrong is to be a constant.
    const a = self(initial()).nodes.map((n) => n.name).join('|');
    const b = self(played()).nodes.map((n) => n.name).join('|');
    expect(b).not.toBe(a);
  });
});

describe('★ skills are absent on purpose, and the reason is checkable', () => {
  it('has no skill, level or XP node', () => {
    const names = self(played()).nodes.map((n) => `${n.id} ${n.name}`).join(' ').toLowerCase();
    for (const word of ['skill', 'level', ' xp', 'wayfaring', 'lore']) {
      expect(names, `Self names "${word.trim()}"`).not.toContain(word);
    }
  });

  it('★ shows WHY: price and fill both key off the same number', () => {
    // If these ever stop moving together, a skill has somewhere to bite and
    // this test should be deleted along with the note in `world.ts`.
    const cheap = { ...initial(), solid: [] };
    // Routes elsewhere in the valley, so the one being priced is still unmade.
    const dear = { ...initial(), solid: ['100|101', '101|102', '102|103'] };
    const to = PLACE.get(START)!.ways[0]!;
    expect(costOf(dear, to)).toBeGreaterThan(costOf(cheap, to));
    expect(forgeSecs(dear)).toBeGreaterThan(forgeSecs(cheap));
  });
});
