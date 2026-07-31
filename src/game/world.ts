// ONE GRAPH. EVERYTHING IS IN IT.
//
// `docs/TABS.md` R1: places, skills, stats, items and concepts are all NODES,
// told apart by a `kind`; every relation is an EDGE, told apart by a `rel`; and
// **a tab is a FILTER over this one graph, never a separate structure.** If a
// tab ever needs its own model, the model is wrong.
//
// That is the owner's ask, in their words: "in the underlying data model for
// the game, I want the graph to have everything connected so that we have one
// systemic model which describes everything."
import { PLACES, PLACE, nameOf } from './places';
import { NOTIONS, NOTION, type Notion } from './notions';
import type { Game } from './engine';
import { waysFrom, costOf, unforgeable, forgeSecs, edgeKey, waitFor,
  SECS_PER_PACE } from './engine';

export type Kind = 'place' | 'item' | 'concept' | 'you' | 'doing' | 'fact';
export type Rel = 'route' | 'carries' | 'means' | 'stands' | 'doing' | 'has';

export interface Node {
  id: string;
  kind: Kind;
  /** What it is called, or '' if the player has not earned the name yet. */
  name: string;
  /** Prose, if it has any. */
  body?: string;
}

export interface Edge { a: string; b: string; rel: Rel }

/** ⚠️ ONE ID SPACE. A place and a concept could otherwise both be "3", and the
 *  first time an edge joined the wrong pair nothing would say so. */
export const placeId = (n: number): string => `place:${n}`;
export const numOf = (id: string): number => Number(id.slice(id.indexOf(':') + 1));

export interface View { nodes: Node[]; edges: Edge[] }

/** THE JOURNEY — the world, and the routes through it.
 *
 *  Every place is drawn from the first frame, because a map with holes in it is
 *  not a map. Somewhere you have not reached has no NAME on it: the shape of
 *  the valley is honest, what is in it is not spoiled. */
export function journey(g: Game): View {
  return {
    nodes: PLACES.map((p) => ({
      id: placeId(p.id),
      kind: 'place' as const,
      name: g.seen.includes(p.id) ? p.name : '',
      body: g.seen.includes(p.id) ? p.body : undefined,
    })),
    edges: PLACES.flatMap((p) => p.ways
      .filter((to) => to > p.id)
      .map((to) => ({ a: placeId(p.id), b: placeId(to), rel: 'route' as const }))),
  };
}

/** The id of the one node that is not a thing in the world but a thing you are
 *  doing. Constant, so the layout cache does not re-solve while it counts down. */
export const DOING = 'doing';

/** ⚠️ WHAT AM I DOING IN THE NEXT THIRTY SECONDS. `engine.ts` opens by naming
 *  that as the question the eleven-system build could not answer, and until now
 *  neither could this one: paces accrued silently and `waitFor` — "the one
 *  number an idle game owes the player" — was exported and used by nothing.
 *
 *  So the Here tab carries a node for it. It is not a new mechanic and there is
 *  nothing to press: resting is what standing still already does. What is new
 *  is that the game SAYS so, in the place's own words where the authored
 *  content gave it any ("Listen to the water", "Count the gates"), and puts the
 *  countdown on the graph rather than in a status bar. */
function doing(g: Game): Node {
  const at = PLACE.get(g.at)!;
  if (g.forging) {
    const [x, y] = g.forging.key.split('|').map(Number);
    const far = x === g.at ? y! : x!;
    return {
      id: DOING, kind: 'doing', name: 'Making a way',
      body: `Toward ${nameOf(far)}. ${Math.ceil(g.forging.left)}s left, and it `
        + 'carries on while this is shut.',
    };
  }
  const rate = `A pace every ${SECS_PER_PACE} seconds, watched or not.`;
  // What the rate is FOR, from here: the nearest way you can already buy, else
  // how long until the cheapest one you cannot.
  const ready = waysFrom(g)
    .filter((w) => !w.made && w.cost <= g.paces)
    .sort((a, b) => a.cost - b.cost)[0];
  const wait = waitFor(g);
  const next = ready ? `Enough in hand for the way to ${ready.name}.`
    : wait ? `The way to ${wait.name} in ${wait.secs}s.`
    : 'Every way from here is made.';
  return {
    id: DOING, kind: 'doing',
    name: at.work?.label ?? 'Standing still',
    body: `${rate} ${next}`,
  };
}

/** HERE — the room you are in, rather than the map you are on.
 *
 *  `docs/TABS.md` build order 4, and the owner's ask: "within the location, as
 *  a separate tab… to not have everything on one screen." Three or four dots
 *  instead of thirty-seven, which is what makes this — not the Journey — the
 *  surface the moment-to-moment loop is actually played on.
 *
 *  R1.3: still a FILTER over the one graph. The places and routes here are the
 *  same nodes and edges the Journey draws, cut to one hop. The only addition is
 *  the `doing` node, which is a node like any other and hangs off this place by
 *  a `doing` edge. */
export function here(g: Game): View {
  const at = PLACE.get(g.at)!;
  return {
    nodes: [
      { id: placeId(g.at), kind: 'place', name: at.name, body: at.body },
      doing(g),
      ...at.ways.map((id) => {
        const p = PLACE.get(id)!;
        return {
          id: placeId(id),
          kind: 'place' as const,
          name: g.seen.includes(id) ? p.name : '',
          body: g.seen.includes(id) ? p.body : undefined,
        };
      }),
    ],
    edges: [
      { a: placeId(g.at), b: DOING, rel: 'doing' as const },
      ...at.ways.map((to) => ({ a: placeId(g.at), b: placeId(to), rel: 'route' as const })),
    ],
  };
}

/** Every route in the valley, counted once. The denominator on Self. */
export const ROUTES_IN_ALL = PLACES.reduce(
  (n, p) => n + p.ways.filter((to) => to > p.id).length, 0);

/** How many ways out from the start each place is. Solved once — the world's
 *  shape never changes. */
const DEPTH = (() => {
  const d = new Map<number, number>([[PLACES[0]!.id, 0]]);
  const q = [PLACES[0]!.id];
  while (q.length) {
    const at = q.shift()!;
    for (const to of PLACE.get(at)!.ways) {
      if (d.has(to)) continue;
      d.set(to, d.get(at)! + 1);
      q.push(to);
    }
  }
  return d;
})();

/** SELF — you, and every true thing about you, each as a node.
 *
 *  ⚠️ NO SKILLS, AND THAT IS A FINDING RATHER THAN A DELAY. `docs/BRIEF.md`
 *  ask 2 wants RuneScape-shaped progression and it is still wanted. It cannot
 *  be built yet, for a reason the code makes plain: `costOf` and `forgeSecs`
 *  both key off `solid.length`, so a skill trained by making ways would rise in
 *  exact lockstep with the thing it is meant to offset and cancel itself out.
 *  A skill is a CHOICE about where to spend time, and there is one verb — so
 *  there is nothing to choose between. Skills come back when a second thing to
 *  do does, and not one session before.
 *
 *  What is left is honest: four numbers that are all true today, drawn as nodes
 *  hanging off you rather than as a stat block, because the graph is the UI. */
export function self(g: Game): View {
  const at = PLACE.get(g.at)!;
  const far = g.seen.reduce((best, id) =>
    (DEPTH.get(id) ?? 0) > (DEPTH.get(best) ?? 0) ? id : best, g.seen[0]!);
  const farOut = DEPTH.get(far) ?? 0;
  const next = waysFrom(g).filter((w) => !w.made).sort((a, b) => a.cost - b.cost)[0];

  const facts: Node[] = [
    { id: 'fact:paces', kind: 'fact',
      name: `${g.paces} ${g.paces === 1 ? 'pace' : 'paces'}`,
      body: `In hand, and one more every ${SECS_PER_PACE} seconds wherever you `
        + 'stand. Paces buy a route, never a step — walking a made way is free.' },
    { id: 'fact:ways', kind: 'fact',
      name: `${g.solid.length} of ${ROUTES_IN_ALL} ways`,
      body: `Routes you have made, out of every route in the valley. `
        + (next ? `The next from here costs ${next.cost}.`
                : 'Every way from where you stand is already made.') },
    { id: 'fact:places', kind: 'fact',
      name: `${g.seen.length} of ${PLACES.length} places`,
      body: 'Places you have stood in. The rest are on the Journey with no name '
        + 'on them, which is the shape of the valley without the spoiling of it.' },
    { id: 'fact:reach', kind: 'fact',
      name: farOut === 0 ? 'Still at the start' : `${farOut} ways out`,
      body: farOut === 0
        ? `You have not left ${PLACES[0]!.name} yet.`
        : `${nameOf(far)} is the furthest you have been from ${PLACES[0]!.name} `
          + `— ${farOut} ways out. Nothing you have reached is deeper.` },
  ];

  return {
    nodes: [
      { id: 'you', kind: 'you', name: 'You',
        body: `Standing in ${at.name}. Everything here is true of you right now; `
          + 'tap one to read it.' },
      { id: placeId(g.at), kind: 'place', name: at.name, body: at.body },
      ...facts,
    ],
    edges: [
      { a: 'you', b: placeId(g.at), rel: 'stands' },
      ...facts.map((f) => ({ a: 'you', b: f.id, rel: 'has' as const })),
    ],
  };
}

/** THOUGHTS — what you understand, and how it connects.
 *
 *  ⚠️ NOT PLACES ANY MORE. This tab used to redraw the places you had been and
 *  call them concepts, which was a placeholder standing in for content that did
 *  not exist — and places already have two tabs of their own. `src/game/
 *  notions.ts` is the content: seven things the game expects you to understand,
 *  each naming a rule the engine actually enforces.
 *
 *  Drawn in full from the first frame with no NAME on what you have not thought
 *  yet — exactly what the Journey does with places, for exactly the same
 *  reason. The shape of what there is to know is honest; none of it is spoiled.
 *
 *  ★ This is also where `docs/BRIEF.md` ask 8 quietly becomes true: knowledge
 *  is a graph, and it fills in as you travel one. Nothing says so. */
export function thoughts(g: Game): View {
  const seen = (n: Notion): boolean => n.known(g);
  const edges: Edge[] = [];
  const drawn = new Set<string>();
  for (const n of NOTIONS) {
    for (const to of n.near) {
      if (!NOTION.has(to)) continue;
      const key = [n.id, to].sort().join('~');
      if (drawn.has(key)) continue;
      drawn.add(key);
      edges.push({ a: `notion:${n.id}`, b: `notion:${to}`, rel: 'means' });
    }
  }
  return {
    nodes: NOTIONS.map((n) => ({
      id: `notion:${n.id}`,
      kind: 'concept' as const,
      name: seen(n) ? n.name : '',
      body: seen(n) ? n.body : undefined,
    })),
    edges,
  };
}

export type TabId = 'journey' | 'here' | 'self' | 'thoughts';

export const TABS: ReadonlyArray<{ id: TabId; label: string; view: (g: Game) => View }> = [
  { id: 'journey', label: 'Journey', view: journey },
  { id: 'here', label: 'Here', view: here },
  { id: 'self', label: 'Self', view: self },
  { id: 'thoughts', label: 'Thoughts', view: thoughts },
];

/** What tapping a place can do, decided in one place so every tab agrees.
 *  R3.3: an action that cannot be taken shows its reason, it is never hidden. */
export interface Deed {
  kind: 'go' | 'forge';
  label: string;
  note: string;
  to: number;
  why: string | null;
}

export function deedsFor(g: Game, nodeId: string): Deed[] {
  if (!nodeId.startsWith('place:')) return [];
  const id = numOf(nodeId);
  if (id === g.at) return [];
  const w = waysFrom(g).find((x) => x.to === id);
  if (!w) return [];

  // A made route: walk it, free, as often as you like.
  if (w.made) {
    return [{
      kind: 'go', to: id, why: w.why,
      label: w.seen ? `Go back to ${w.name}` : `Go to ${w.name}`,
      note: 'the way is made — free',
    }];
  }
  // Not made: the only thing on offer is making it.
  const why = unforgeable(g, id);
  return [{
    kind: 'forge', to: id, why,
    label: `Make the way to ${w.name}`,
    note: why ?? `${costOf(g, id)} paces · ${forgeSecs(g)}s to fill`,
  }];
}

/** How far along each route is, for drawing. 1 is solid, 0 is dotted, and
 *  anything between is the one being filled. */
export function fillOf(g: Game, a: number, b: number): number {
  const key = edgeKey(a, b);
  if (g.solid.includes(key)) return 1;
  if (g.forging?.key === key) {
    return 1 - g.forging.left / g.forging.secs;
  }
  return 0;
}
