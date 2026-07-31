// THE HERE TAB — the room you are standing in, not the map you are on.
//
// `docs/TABS.md` build order 4. Two things are being checked, and they are the
// two things this tab can get wrong:
//
//   IT IS A FILTER, NOT A SECOND MODEL (R1.3). Every place and every route it
//   draws must be the same node and the same edge the Journey draws. The moment
//   Here starts assembling its own version of the world, the "one systemic
//   model" the owner asked for is two models that agree today.
//
//   IT ANSWERS "WHAT AM I DOING". That is the question `engine.ts` names in its
//   own header as the one the eleven-system build could not answer, and it was
//   still unanswered on screen: `waitFor` existed and nothing called it.
//
// ---- PROVEN RED, 2026-07-31 ----------------------------------------------
// (see the block at the foot of this file)
import { describe, it, expect } from 'vitest';
import { apply, initial, forgeSecs, unforgeable, waysFrom, SECS_PER_PACE,
  type Game } from '../src/game/engine';
import { PLACE, PLACES, START } from '../src/game/places';
import { here, journey, placeId, numOf, DOING } from '../src/game/world';

const rest = (g: Game, secs: number): Game => apply(g, { type: 'tick', secs });

/** Rest until it is affordable, make it, wait for the fill, walk it. */
function reach(g: Game, to: number): Game {
  let out = g;
  for (let i = 0; i < 900 && unforgeable(out, to); i++) out = rest(out, 30);
  out = apply(out, { type: 'forge', to });
  out = rest(out, forgeSecs(g) + 1);
  return apply(out, { type: 'go', to });
}

const doingOf = (g: Game) => here(g).nodes.find((n) => n.id === DOING)!;

describe('Here is one hop, and it follows you', () => {
  it('holds where you stand, what you are doing, and every way out — nothing else', () => {
    const g = initial();
    const v = here(g);
    const ways = PLACE.get(START)!.ways;
    expect(v.nodes.map((n) => n.id).sort())
      .toEqual([DOING, placeId(START), ...ways.map(placeId)].sort());
    // One edge per way out, plus the one to what you are doing.
    expect(v.edges.filter((e) => e.rel === 'route').length).toBe(ways.length);
    expect(v.edges.filter((e) => e.rel === 'doing')).toEqual(
      [{ a: placeId(START), b: DOING, rel: 'doing' }]);
  });

  it('★ is a few dots, not the whole valley — that is the point of the tab', () => {
    // The reported defect was density on one screen. If Here ever grows to the
    // size of the Journey it has stopped being a different view of anything.
    let g = initial();
    for (let i = 0; i < 6; i++) {
      expect(here(g).nodes.length, PLACE.get(g.at)!.name).toBeLessThanOrEqual(7);
      const to = PLACE.get(g.at)!.ways[0]!;
      g = reach(g, to);
    }
    expect(journey(g).nodes.length).toBe(PLACES.length);
  });

  it('moves with you', () => {
    const to = PLACE.get(START)!.ways[0]!;
    const g = reach(initial(), to);
    const v = here(g);
    expect(v.nodes[0]!.id).toBe(placeId(to));
    expect(v.nodes.map((n) => n.id)).toContain(placeId(START));   // the way back
    expect(v.edges.some((e) => e.a === placeId(to) && e.b === DOING)).toBe(true);
  });

  it('names a place you have not reached yet with nothing at all', () => {
    // R5.3, and the same rule the Journey keeps: the shape is honest, what is
    // in it is not spoiled.
    const v = here(initial());
    for (const n of v.nodes) {
      if (n.id === DOING || numOf(n.id) === START) continue;
      expect(n.name, n.id).toBe('');
      expect(n.body, n.id).toBeUndefined();
    }
  });
});

describe('★ Here is a FILTER over the one graph (R1.3)', () => {
  it('every place and every route it draws is one the Journey draws too', () => {
    // The check that stops this becoming a second model of the world. Run from
    // several standing positions, because a filter can be right at the start
    // and wrong three places in.
    let g = initial();
    for (let hop = 0; hop < 8; hop++) {
      const world = journey(g);
      const known = new Set(world.nodes.map((n) => n.id));
      const edges = new Set(world.edges.map((e) => [e.a, e.b].sort().join('~')));
      const v = here(g);
      for (const n of v.nodes) {
        if (n.id === DOING) continue;
        expect(known.has(n.id), `${n.id} is not in the world`).toBe(true);
      }
      for (const e of v.edges) {
        if (e.rel === 'doing') continue;
        expect(edges.has([e.a, e.b].sort().join('~')),
          `${e.a}-${e.b} is not a route in the world`).toBe(true);
      }
      const to = PLACE.get(g.at)!.ways.find((t) => !g.seen.includes(t))
        ?? PLACE.get(g.at)!.ways[0]!;
      g = reach(g, to);
    }
  });
});

describe('★ what you are doing, said out loud', () => {
  it('uses the place\'s own words for resting where the content gave it any', () => {
    const worded = PLACES.find((p) => p.work)!;
    const g = { ...initial(), at: worded.id, seen: [START, worded.id] };
    expect(doingOf(g).name).toBe(worded.work!.label);
  });

  it('says plainly that you are standing still where it did not', () => {
    const bare = PLACES.find((p) => !p.work)!;
    const g = { ...initial(), at: bare.id, seen: [START, bare.id] };
    expect(doingOf(g).name).toBe('Standing still');
  });

  it('always says the rate, because that is what standing still pays', () => {
    expect(doingOf(initial()).body).toContain(`every ${SECS_PER_PACE} seconds`);
  });

  it('★ says how long until the next way you can afford', () => {
    // THE ONE NUMBER AN IDLE GAME OWES THE PLAYER, and until now `waitFor` was
    // exported and called by nothing.
    const g = initial();
    const cheapest = waysFrom(g).sort((a, b) => a.cost - b.cost)[0]!;
    expect(doingOf(g).body).toContain(`The way to ${cheapest.name} in`);
    expect(doingOf(g).body).toMatch(/in \d+s\./);
  });

  it('switches to what you can already buy once you can buy it', () => {
    const g = rest(initial(), 200);
    const body = doingOf(g).body!;
    expect(body).toContain('Enough in hand for the way to');
    expect(body).not.toContain('The way to ');
  });

  it('★ becomes the fill, and counts it down', () => {
    let g = rest(initial(), 200);
    const to = PLACE.get(START)!.ways[0]!;
    g = apply(g, { type: 'forge', to });
    const n = doingOf(g);
    expect(n.name).toBe('Making a way');
    expect(n.body).toContain(PLACE.get(to)!.name);
    expect(n.body).toContain(`${forgeSecs(rest(initial(), 200))}s left`);
    // ...and the number is the fill's, so it moves as the fill does.
    const later = doingOf(rest(g, 5));
    expect(later.body).not.toBe(n.body);
    expect(later.body).toMatch(/(\d+)s left/);
    const [, was] = /(\d+)s left/.exec(n.body!)!;
    const [, now] = /(\d+)s left/.exec(later.body!)!;
    expect(Number(now)).toBeLessThan(Number(was));
  });

  it('keeps one id while it counts, so the layout never re-solves under a thumb', () => {
    // The dots must not jump every frame. The layout cache is keyed on node ids
    // and edges, so the countdown has to live in the BODY and nowhere else.
    let g = rest(initial(), 200);
    const before = here(g).nodes.map((n) => n.id).join(',');
    g = apply(g, { type: 'forge', to: PLACE.get(START)!.ways[0]! });
    expect(here(g).nodes.map((n) => n.id).join(',')).toBe(before);
    expect(here(rest(g, 4)).nodes.map((n) => n.id).join(',')).toBe(before);
  });

  it('admits when there is nothing left to make from here', () => {
    let g = initial();
    for (const to of PLACE.get(START)!.ways) {
      g = reach(g, to);
      g = apply(g, { type: 'go', to: START });          // made ground is free
    }
    // Standing back at the start with every way out already made.
    expect(g.at).toBe(START);
    expect(doingOf(g).body).toContain('Every way from here is made.');
  });
});

// ---- PROVEN RED, 2026-07-31 ----------------------------------------------
//
// Rule 4: a check nobody has broken on purpose is assumed vacuous. Each
// sabotage was applied to `src/game/world.ts`, `npx vitest run test/here.test.ts`
// was run, the output copied from the terminal, and the source put back.
// The output block lives in the commit message for this item.
