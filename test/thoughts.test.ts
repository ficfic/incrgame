// THE THOUGHTS TAB — what you understand, and how it connects.
//
// `docs/TABS.md` build order 6. The tab used to redraw the places you had been
// and call them concepts, which was a placeholder; `src/game/notions.ts` is the
// content that replaces it.
//
// ⚠️ THE ASSERTION THAT MATTERS IS NOT "SEVEN NODES EXIST". It is that every
// notion's unlock is DRIVEN BY THE RUN and that its sentence is true of the
// engine — a glossary that describes a system the code does not have is the
// exact defect this project has already shipped once.
//
// ---- PROVEN RED, 2026-07-31 ----------------------------------------------
// (sabotage log in the commit message)
import { describe, it, expect } from 'vitest';
import { apply, initial, forgeSecs, unforgeable, costOf, edgeKey,
  COST_GROWTH, type Game } from '../src/game/engine';
import { PLACE, START } from '../src/game/places';
import { NOTIONS, NOTION, DANGLING } from '../src/game/notions';
import { thoughts } from '../src/game/world';

const rest = (g: Game, secs: number): Game => apply(g, { type: 'tick', secs });

function reach(g: Game, to: number): Game {
  let out = g;
  for (let i = 0; i < 900 && unforgeable(out, to); i++) out = rest(out, 30);
  out = apply(out, { type: 'forge', to });
  out = rest(out, forgeSecs(g) + 1);
  return apply(out, { type: 'go', to });
}

/** Walk outward until `stop` says enough. */
function play(g0: Game, stop: (g: Game) => boolean): Game {
  let g = g0;
  for (let i = 0; i < 12 && !stop(g); i++) {
    const to = PLACE.get(g.at)!.ways.find((t) => !g.seen.includes(t))
      ?? PLACE.get(g.at)!.ways[0]!;
    g = reach(g, to);
  }
  return g;
}

const named = (g: Game): string[] =>
  thoughts(g).nodes.filter((n) => n.name).map((n) => n.id.slice('notion:'.length));

describe('the notions themselves', () => {
  it('joins nothing that does not exist', () => {
    expect(DANGLING).toEqual([]);
  });

  it('is one connected web — no notion floats on its own', () => {
    // A dot joined to nothing is a dot the tab cannot explain.
    const near = new Map(NOTIONS.map((n) => [n.id, new Set(n.near)]));
    for (const n of NOTIONS) for (const to of n.near) near.get(to)!.add(n.id);
    const seen = new Set([NOTIONS[0]!.id]);
    const q = [NOTIONS[0]!.id];
    while (q.length) for (const to of near.get(q.pop()!)!) {
      if (!seen.has(to)) { seen.add(to); q.push(to); }
    }
    expect([...NOTION.keys()].filter((id) => !seen.has(id))).toEqual([]);
  });

  it('keeps every body short enough to read on a phone', () => {
    for (const n of NOTIONS) {
      const words = n.body.trim().split(/\s+/).length;
      expect(words, `${n.name} is ${words} words`).toBeGreaterThanOrEqual(25);
      expect(words, `${n.name} is ${words} words`).toBeLessThanOrEqual(65);
    }
  });

  it('★ is not a place in disguise', () => {
    // The whole point of the item: the tab needed something in it that is not
    // a place, and places already have two tabs.
    for (const n of thoughts(initial()).nodes) {
      expect(n.id.startsWith('notion:'), n.id).toBe(true);
      expect(n.kind).toBe('concept');
    }
  });
});

describe('★ the tab fills in from what you do', () => {
  it('draws every notion from the first frame, unnamed until thought', () => {
    // Same promise the Journey makes about a place you have not reached: the
    // shape is honest, the content is not spoiled.
    const v = thoughts(initial());
    expect(v.nodes.length).toBe(NOTIONS.length);
    const blank = v.nodes.filter((n) => !n.name);
    expect(blank.length).toBeGreaterThan(0);
    for (const n of blank) expect(n.body, n.id).toBeUndefined();
  });

  it('opens with the three you can see without doing anything', () => {
    expect(named(initial()).sort()).toEqual(['pace', 'rest', 'way']);
  });

  it('★ teaches Making the moment you make something, and not before', () => {
    let g = rest(initial(), 200);
    expect(named(g)).not.toContain('making');
    const to = PLACE.get(START)!.ways[0]!;
    g = apply(g, { type: 'forge', to });
    // Known while it is still filling — you are doing it right now.
    expect(g.forging).not.toBeNull();
    expect(named(g)).toContain('making');
  });

  it('★ every notion is reachable by playing, and none arrives early', () => {
    // The failure this guards is a predicate that is secretly constant: a
    // notion that is always known, or never.
    const start = new Set(named(initial()));
    const end = play(initial(), (g) => g.seen.length >= 6 && g.solid.length >= 4);
    const finished = new Set(named(end));
    for (const n of NOTIONS) {
      expect(finished.has(n.id), `${n.name} is never learned`).toBe(true);
    }
    expect(finished.size).toBeGreaterThan(start.size);
  });

  it('never forgets one', () => {
    // Monotonic: knowledge is a predicate over a run that only grows, so a
    // notion that blinks out would be a predicate reading the wrong thing.
    let g = initial();
    let held = new Set(named(g));
    for (let i = 0; i < 6; i++) {
      const to = PLACE.get(g.at)!.ways.find((t) => !g.seen.includes(t))
        ?? PLACE.get(g.at)!.ways[0]!;
      g = reach(g, to);
      const now = new Set(named(g));
      for (const id of held) expect(now.has(id), `${id} was forgotten`).toBe(true);
      held = now;
    }
  });

  it('draws each join once, however many notions name it', () => {
    const v = thoughts(initial());
    const keys = v.edges.map((e) => [e.a, e.b].sort().join('~'));
    expect(new Set(keys).size).toBe(keys.length);
    expect(v.edges.length).toBeGreaterThanOrEqual(NOTIONS.length - 1);
  });
});

describe('★ every notion says something the engine actually does', () => {
  // A glossary describing a system the code does not have is a lie the player
  // eventually catches. These are the three that make falsifiable claims.
  it('"Free ground" — a made way asks nothing of you again', () => {
    const to = PLACE.get(START)!.ways[0]!;
    const made = { ...initial(), solid: [edgeKey(START, to)] };
    expect(costOf(made, to)).toBe(0);
    expect(NOTION.get('free')!.body).toMatch(/asks nothing of you again/);
  });

  it('"The frontier" — each way costs more than the one before it', () => {
    const to = PLACE.get(START)!.ways[0]!;
    const cheap = costOf({ ...initial(), solid: [] }, to);
    const dear = costOf({ ...initial(), solid: ['100|101', '101|102'] }, to);
    expect(dear).toBeGreaterThan(cheap);
    expect(COST_GROWTH).toBeGreaterThan(1);
    expect(NOTION.get('frontier')!.body).toMatch(/costs more than the one before/);
  });

  it('"Standing still" — there is nothing to start', () => {
    // The engine has no work verb at all; paces arrive from a bare tick.
    expect(rest(initial(), 30).paces).toBeGreaterThan(0);
    expect(NOTION.get('rest')!.body).toMatch(/nothing here to start/);
  });
});
