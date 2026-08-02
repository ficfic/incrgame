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
import { PLACES, PLACE, nameOf, THING } from './places';
import { NOTIONS, NOTION, type Notion } from './notions';
import { reachedFrom } from './flow';
import type { Game } from './engine';
import { waysFrom, costOf, unforgeable, forgeSecs, edgeKey, waitFor,
  rate, loadOf, settleCost, unsettleable, jobAt, working, levelOf, xpFor,
  holder, might, bite, winnable, LEVEL_CAP } from './engine';
import { POKE } from './foes';

/** Paces a second, said the same way everywhere it is said. */
const perSec = (n: number): string => `${n.toFixed(2)} a second`;

export type Kind = 'place' | 'item' | 'concept' | 'you' | 'doing' | 'fact' | 'foe';
export type Rel = 'route' | 'carries' | 'means' | 'stands' | 'doing' | 'has' | 'holds';

export interface Node {
  id: string;
  kind: Kind;
  /** What it is called, or '' if the player has not earned the name yet. */
  name: string;
  /** Prose, if it has any. */
  body?: string;
  /** ★ RADIUS, WHERE THE THING HAS ONE THAT MEANS SOMETHING. A fight is two
   *  dots shrinking, so health has to BE the picture rather than a number
   *  printed beside it — `docs/COMBAT.md`, and the owner's own words. */
  r?: number;
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
  if (g.fight) {
    const f = holder(g);
    return {
      id: DOING, kind: 'doing', name: `Poking ${f?.name ?? 'it'}`,
      body: `${Math.ceil(g.fight.you)} of you left. No paces and no learning `
        + 'while this is going on, and walking away ends it.',
    };
  }
  // ★ WORKING IS THE OTHER THING THE CLOCK CAN DO, and while you are doing it
  // the paces stop. Saying so on the node is not a warning, it is the decision.
  const job = working(g);
  if (job) {
    const left = Math.ceil(job.secs - g.workPart);
    return {
      id: DOING, kind: 'doing', name: job.label,
      body: `${left}s to the next ${job.xp} wayfaring, and it repeats while this `
        + 'is shut. No paces while you work — that is what it costs.',
    };
  }
  const earn = `${perSec(rate(g))}, watched or not.`;
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
    name: 'Standing still',
    body: `${earn} ${next}`,
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
/** ★ THE FIGHT, AS TWO DOTS. Both are nodes on the one graph like everything
 *  else — a fight is not a screen, it is a shape the Here tab takes. */
export const FOE_ID = 'foe';
function fighters(g: Game): { nodes: Node[]; edges: Edge[] } {
  const f = holder(g);
  if (!f) return { nodes: [], edges: [] };
  const hurt = g.fight;
  return {
    nodes: [{
      id: FOE_ID, kind: 'foe', name: f.name,
      // Radius is what is left of it, floored so the last sliver is still a
      // thing you can hit with a thumb.
      r: Math.max(3, 3 + (hurt ? hurt.foe : f.size) * 0.45),
      body: hurt
        ? `${Math.ceil(hurt.foe)} of it left, and ${Math.ceil(hurt.you)} of you. `
          + `You take ${bite(g)} off it every ${POKE} seconds; it takes 1 off you.`
        : `${f.body} While it stands here you may neither settle this place nor `
          + `work it. ${winnable(g) ? 'You would win.' : 'You would not win — not yet.'}`,
    }],
    edges: [{ a: placeId(g.at), b: FOE_ID, rel: 'holds' }],
  };
}

export function here(g: Game): View {
  const at = PLACE.get(g.at)!;
  const fight = fighters(g);
  return {
    nodes: [
      { id: placeId(g.at), kind: 'place', name: at.name, body: at.body },
      doing(g),
      ...fight.nodes,
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
      ...fight.edges,
      ...at.ways.map((to) => ({ a: placeId(g.at), b: placeId(to), rel: 'route' as const })),
    ],
  };
}

// ⚠️ `ROUTES_IN_ALL` AND `DEPTH` LIVED HERE AND ARE GONE. They were the
// denominators for "0 of 43 ways" and "N ways out from the start" — the world's
// progress, put on the character sheet, and rejected on sight by the owner:
// *"self is a stat sheet and inventory, but not game statistics."* Deleted
// rather than left unused, so nothing tempts the next session to put them back.

/** SELF — what you carry and what you are. A character sheet, not a scoreboard.
 *
 *  ⚠️ REBUILT ON THE OWNER'S CORRECTION, 2026-08-01: *"self is a stat sheet and
 *  inventory, but not game statistics."* The first version put "0 of 43 ways"
 *  and "1 of 37 places" on it — those are the WORLD'S progress, not yours, and
 *  they were rejected on sight. What belongs here is what is true of YOU:
 *  what you are holding, and what you are currently capable of.
 *
 *  So every number below is a property of the character:
 *    · what you carry        — paces, and today that is the whole inventory
 *    · how fast you gather   — the rate, which never lies and never stops
 *    · what making costs you — time AND price, both of which grow as you go
 *
 *  ⚠️ AND STILL NO SKILLS. `costOf` and `forgeSecs` both key off `solid.length`,
 *  so a skill trained by making ways cancels itself out, and a skill is a choice
 *  about where to spend time of which there is exactly one. See `docs/TABS.md`.
 *
 *  ★ AND THE INVENTORY HOLDS THINGS NOW. The note here used to read "one thing,
 *  because one thing exists — they arrive when drops do." They have: crossing
 *  tested ground pays out one of the two items the author wrote for it, and
 *  which one you get is decided by the level you crossed at.
 *
 *  ⚠️ NO EMPTY SLOTS, STILL. What you are carrying is drawn; what you are not is
 *  not drawn at all. A row of blanks promises a system by its shape, which is
 *  the eleven-systems mistake in miniature. */
export function self(g: Game): View {
  const at = PLACE.get(g.at)!;
  const next = waysFrom(g).filter((w) => !w.made).sort((a, b) => a.cost - b.cost)[0];
  const secs = forgeSecs(g);
  const lv = levelOf(g.wayfaring);
  // How many settled places can actually reach you — which is not how many you
  // have settled. One cut off by an unmade way is a place you paid for and are
  // not being paid by, and the sheet should not pretend otherwise.
  const joined = reachedFrom(g.at, g.solid);
  const settledNear = g.settled.filter((id) => joined.has(id)).length;

  const mine: Node[] = [
    // Kind `item` and rel `carries`, which the model already had and nothing
    // had yet used — R1.2's vocabulary, not a new one invented for this tab.
    { id: 'carry:paces', kind: 'item',
      name: `${g.paces} ${g.paces === 1 ? 'pace' : 'paces'}`,
      body: 'In hand, and everything you own. The valley takes them for ways '
        + 'and for nothing else — a step down a way you have already made has '
        + 'never cost anybody anything.' },
    // ★ THE RATE IS NOW A PROPERTY OF THE GRAPH, so the sheet says where it
    // came from. `flow.ts` is the long version: settled places make paces,
    // routes carry them, and only what reaches you counts.
    { id: 'stat:gather', kind: 'fact',
      name: perSec(rate(g)),
      body: settledNear === 0
        ? 'The floor, and nothing on top of it. Nowhere you have settled can '
          + 'get anything to you from where you are standing.'
        : `A third of it is yours for breathing. The rest walks in from `
          + `${settledNear} settled ${settledNear === 1 ? 'place' : 'places'} `
          + 'along the ways you made — and only as fast as the narrowest way '
          + 'between there and here will take it.' },
    // What you are carrying, each its own node hanging off you by `carries` —
    // the same vocabulary the purse already uses, so an item is not a special
    // case of anything.
    ...g.pack.map((id) => {
      const t = THING.get(id);
      return {
        id: `carry:${id}`, kind: 'item' as const,
        name: t?.name ?? id,
        body: `${t?.how ?? ''} It opens ${t?.opens ?? 'nothing'}.`.trim(),
      };
    }),
    { id: 'stat:way', kind: 'fact',
      name: `Wayfaring ${lv}`,
      body: lv >= LEVEL_CAP
        ? 'As far as the valley can teach you. A way goes up in a little under '
          + 'half the time it took the first morning.'
        : `${g.wayfaring} of ${xpFor(lv + 1)} toward ${lv + 1}. Sounding, `
          + 'pacing and sighting are how it is learned, and every level takes '
          + 'a twelfth off the time a way needs to go up.' },
    { id: 'stat:making', kind: 'fact',
      name: `A way takes ${secs}s`,
      body: next
        ? `And ${next.cost} paces, for the cheapest way from where you stand. `
          + 'Both climb with every way you have already laid, so the tenth is '
          + 'slower and dearer than the first, wherever you lay it.'
        : `Every way from here is already made. The next one elsewhere will `
          + 'still take longer than the last — that price follows you, not the '
          + 'ground.' },
  ];

  return {
    nodes: [
      { id: 'you', kind: 'you', name: 'You',
        body: `Standing in ${at.name}. What you carry and what you are — the `
          + 'valley keeps its own count of itself elsewhere.' },
      { id: placeId(g.at), kind: 'place', name: at.name, body: at.body },
      ...mine,
    ],
    edges: [
      { a: 'you', b: placeId(g.at), rel: 'stands' },
      { a: 'you', b: 'carry:paces', rel: 'carries' },
      ...g.pack.map((id) => ({ a: 'you', b: `carry:${id}`, rel: 'carries' as const })),
      { a: 'you', b: 'stat:gather', rel: 'has' },
      { a: 'you', b: 'stat:way', rel: 'has' },
      { a: 'you', b: 'stat:making', rel: 'has' },
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
  kind: 'go' | 'forge' | 'settle' | 'work' | 'rest' | 'poke';
  label: string;
  note: string;
  to: number;
  why: string | null;
}

export function deedsFor(g: Game, nodeId: string): Deed[] {
  if (!nodeId.startsWith('place:')) return [];
  const id = numOf(nodeId);

  // ★ THE PLACE YOU ARE STANDING IN IS NOW THE ONE WITH THINGS TO DO IN IT.
  // It used to return nothing at all — "You are standing here." — because
  // standing was the whole of the game. Both decisions in this game are taken
  // from here: what your paces buy, and what your clock pays into.
  if (id === g.at) {
    const out: Deed[] = [];
    // ★ WHAT IS STANDING HERE COMES FIRST, because until it is out nothing else
    // on this list can be done at all.
    const f = holder(g);
    if (f) {
      out.push(g.fight
        ? { kind: 'rest', to: id, why: null, label: 'Back off',
            note: `${Math.ceil(g.fight.foe)} of it left, ${Math.ceil(g.fight.you)} of you` }
        : { kind: 'poke', to: id, why: null, label: `Poke ${f.name}`,
            note: winnable(g)
              ? `${f.size} of it, ${might(g)} of you, ${bite(g)} a poke — you win this`
              : `${f.size} of it, ${might(g)} of you, ${bite(g)} a poke — you lose this` });
    }
    const job = jobAt(g);
    if (job) {
      out.push(g.busy === 'work'
        ? { kind: 'rest', to: id, why: null,
            label: 'Stand still instead',
            note: `back to ${perSec(rate(g))} — and the job stops` }
        : { kind: 'work', to: id, why: null,
            label: job.label,
            note: `${job.secs}s a turn · +${job.xp} wayfaring · no paces while you do` });
    }
    if (!g.settled.includes(id)) {
      const why = unsettleable(g);
      out.push({ kind: 'settle', to: id, why,
        label: `Settle ${PLACE.get(id)!.name}`,
        note: why ?? `${settleCost(g)} paces · makes 0.10 a second, as much of `
          + 'it as the ways can carry to you' });
    }
    return out;
  }

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
