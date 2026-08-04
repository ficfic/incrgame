// ONE GRAPH. EVERYTHING IS IN IT.
//
// `docs/TABS.md` R1: stops, what you carry and what you know are all NODES of
// one model, told apart by a `kind`; every relation is an edge told apart by a
// `rel`; and **a tab is a FILTER over that one model, never a separate
// structure.** That is the owner's ask and it survived every scrapping.
//
// ⚠️ THE WORDS ARE STOPS AND ROADS. Not nodes, not edges, not dots. The owner,
// 2026-08-02: *"we are going to call the roads and stops, no edges and nodes
// anymore."* `scripts/check-words.mjs` fails the build if one slips through —
// the vocabulary has turned over three times and each time an old word survived
// in a string nobody re-read.
import { STOPS, STOP, START, FINISH, nameOf, GOING } from './stops';
import type { Game } from './engine';
import { STATS } from './dice';
import { roadsOut, roadCost, buildSecs, manaRate, waitFor, reached, crossed,
  roadKey, unbuildable, climbTo, MAX_GAUGE, ken } from './engine';

/** Mana a second, said the same way everywhere it is said. */
const perSec = (n: number): string => `${n.toFixed(2)} a second`;

/** ⚠️ A RUNTIME LIST, and the type is derived FROM it rather than beside it.
 *  `test/ink.test.ts` used to restate these kinds by hand — on purpose, so that
 *  adding one without styling it would fail there. It did the opposite: the
 *  vocabulary turned over, every kind here was renamed, and the test went on
 *  cheerfully checking that the SCRAPPED kinds had ink. Same failure message,
 *  no way to drift. */
export const KINDS = ['stop', 'you', 'doing', 'fact', 'carry'] as const;
export type Kind = typeof KINDS[number];
export type Rel = 'road' | 'stands' | 'doing' | 'has' | 'carries';

export interface Node {
  id: string;
  kind: Kind;
  /** What it is called, or '' if the player has not earned the name. */
  name: string;
  body?: string;
  /** A radius the thing insists on, where its size means something. */
  r?: number;
}

export interface Edge { a: string; b: string; rel: Rel }

/** ⚠️ ONE ID SPACE, so a stop and a fact can never collide on "3". */
export const stopId = (n: number): string => `stop:${n}`;
export const numOf = (id: string): number => Number(id.slice(id.indexOf(':') + 1));

export interface View { nodes: Node[]; edges: Edge[] }

/** THE CHAPTER — every stop, and every dotted route between them.
 *
 *  ⚠️ THE OLD RULE HERE — "the whole crossing is visible from the first frame,
 *  a map you have to uncover would hide the only decision there is" — WAS
 *  REVERSED BY THE OWNER, 2026-08-04: *"can we do fog of war maybe."* What
 *  that rule was protecting survives it: the SKELETON stays — every dot and
 *  every dotted route is drawn from frame one, so the five ways across are
 *  still a visible choice. What the fog takes is the DETAIL: names and the
 *  land itself exist only within your ken (`engine.ken`), and the terrain
 *  beyond it is parchment until you stand there. */
export function chapter(g: Game): View {
  const lit = reached(g);
  const known = ken(g);
  return {
    nodes: STOPS.map((s) => ({
      id: stopId(s.id),
      kind: 'stop' as const,
      name: !known.has(s.id) ? ''
        : s.id === START ? 'Start' : s.id === FINISH ? 'Finish' : s.name,
      body: g.seen.includes(s.id)
        ? `${ground(s.ground)}. ${lit.has(s.id) ? 'The mana reaches here.' : 'No mana here yet.'}`
        : undefined,
    })),
    edges: STOPS.flatMap((s) => s.near
      .filter((to) => to > s.id)
      .map((to) => ({ a: stopId(s.id), b: stopId(to), rel: 'road' as const }))),
  };
}

/** ⟨placeholder⟩ What a stop says about itself.
 *
 *  ⚠️ THE MAP HAS NO PROSE, AND THIS IS NOT IT. Open question 1 of
 *  `docs/KINGS_ROADS.md` is what a stop is made of, and it is the owner's to
 *  answer — the 37 machine-written places were scrapped precisely because an
 *  assistant answered it. Until then a stop reports its ground, which is a fact
 *  the engine already uses to price the road out of it. */
const ground = (g: string): string => ({
  moor: 'Open moor — easy going',
  wood: 'Wood — has to be cleared before it is cut',
  crag: 'Crag — steep',
  water: 'Water — needs a ford or a bridge',
  stone: 'Hard standing — takes a pipe well',
  bog: 'Bog — it swallows what you lay in it',
}[g] ?? g);

export const DOING = 'doing';

/** WHAT AM I DOING IN THE NEXT THIRTY SECONDS — as a node on the graph, not a
 *  status bar. There is nothing to press: mana arrives because time passed. */
function doing(g: Game): Node {
  if (g.building) {
    const [x, y] = g.building.key.split('|').map(Number);
    const far = x === g.at ? y! : x!;
    return {
      id: DOING, kind: 'doing',
      name: g.building.to > 1 ? 'Widening the pipe' : 'Laying pipe',
      body: `Toward ${nameOf(far)}, by ${g.building.kit}. ${Math.ceil(g.building.left)}s `
        + 'left. It keeps going while the game is closed.',
    };
  }
  const wait = waitFor(g);
  const ready = roadsOut(g).filter((r) => r.cannot === null)
    .sort((a, b) => a.cost - b.cost)[0];
  const next = ready ? `Enough for the work to ${ready.name}.`
    : wait ? `Enough for the work to ${wait.name} in ${wait.secs}s.`
    : 'Nothing left to do from here.';
  return {
    id: DOING, kind: 'doing', name: 'Waiting on the mana',
    body: `${perSec(manaRate(g))} reaching you. ${next}`,
  };
}

/** HERE — the stop you are standing at, and every road out of it. */
export function here(g: Game): View {
  const at = STOP.get(g.at)!;
  return {
    nodes: [
      { id: stopId(g.at), kind: 'stop', name: at.name, body: ground(at.ground) },
      doing(g),
      ...at.near.map((id) => {
        const s = STOP.get(id)!;
        return {
          id: stopId(id), kind: 'stop' as const,
          name: g.seen.includes(id) ? s.name : '',
          body: g.seen.includes(id) ? ground(s.ground) : undefined,
        };
      }),
    ],
    edges: [
      { a: stopId(g.at), b: DOING, rel: 'doing' as const },
      ...at.near.map((to) => ({ a: stopId(g.at), b: stopId(to), rel: 'road' as const })),
    ],
  };
}

/** SELF — what you carry and what you are. A stat sheet, never the world's
 *  numbers: the owner rejected those on sight once already. */
export function self(g: Game): View {
  const at = STOP.get(g.at)!;
  const next = roadsOut(g).filter((r) => r.gauge < MAX_GAUGE)
    .sort((a, b) => a.cost - b.cost)[0];
  return {
    nodes: [
      { id: 'you', kind: 'you', name: 'You',
        body: `Standing at ${at.name}. ${ground(at.ground)}.` },
      { id: stopId(g.at), kind: 'stop', name: at.name, body: ground(at.ground) },
      { id: 'carry:mana', kind: 'carry', name: `${g.mana} mana`,
        body: 'Pipe is the only thing that takes it. Walking a line you have '
          + 'already opened is free.' },
      { id: 'stat:flow', kind: 'fact', name: perSec(manaRate(g)),
        body: 'What the network actually delivers to where you stand. The narrowest '
          + 'pipe between here and the start governs the lot, so widening a tight '
          + 'one is worth more than laying a slack one.' },
      // ★ THE CREW. Five stats, EACH ITS OWN NODE — the owner, on seeing them
      // crammed into one: *"that doesn't look right, each stat should be a
      // node."* Ironsworn's five, by its CC BY 4.0 licence (attribution in
      // README.md and dice.ts).
      ...STATS.map((s) => ({
        id: `stat:${s}`, kind: 'fact' as const, name: `${s} ${g.stats[s]}`,
        body: 'What a roll leans on when this stat carries the choice. One die '
          + 'and this, against two.',
      })),
      { id: 'carry:provisions', kind: 'carry', name: `${g.provisions} provisions`,
        body: 'What the crew eats while trouble is faced. Weak hits and misses '
          + 'eat them — and a miss with none left is the end of the leg.' },
      { id: 'stat:momentum', kind: 'fact', name: `momentum ${g.momentum >= 0 ? '+' : ''}${g.momentum}`,
        body: 'Banked nerve. After a bad roll you can burn it to overrule the '
          + 'dice — it resets to +2 and the world moves on.' },
      { id: 'stat:next', kind: 'fact',
        name: next ? `Next work: ${next.cost}` : 'Nothing left here',
        body: next
          ? `${buildSecs(g, next.to)}s. Price is how far it runs times how bad the `
            + 'ground is; what it CARRIES runs the other way — cheap ground is '
            + 'narrow ground, and hard standing takes a pipe well.'
          : 'Every pipe out of this stop is as wide as it goes.' },
    ],
    edges: [
      { a: 'you', b: stopId(g.at), rel: 'stands' },
      { a: 'you', b: 'carry:mana', rel: 'carries' },
      { a: 'you', b: 'carry:provisions', rel: 'carries' },
      { a: 'you', b: 'stat:flow', rel: 'has' },
      ...STATS.map((s) => ({ a: 'you', b: `stat:${s}`, rel: 'has' as const })),
      { a: 'you', b: 'stat:momentum', rel: 'has' },
      { a: 'you', b: 'stat:next', rel: 'has' },
    ],
  };
}

/** THE CROSSING — how far the chapter has got, as a shape rather than a bar.
 *
 *  ⟨inferred⟩ The fourth tab needs SOMETHING while Thoughts' notions are
 *  scrapped, and the honest thing to put there is the chapter's own state: the
 *  two ends, and whether the mana joins them yet. */
export function crossing(g: Game): View {
  const lit = reached(g);
  const done = crossed(g);
  return {
    nodes: [
      { id: stopId(START), kind: 'stop', name: 'Start',
        body: 'Where the king\'s road ends and yours begins. The mana comes from here.' },
      { id: stopId(FINISH), kind: 'stop', name: 'Finish',
        body: done
          ? 'Joined. The chapter is crossed.'
          : 'Not joined yet. One line of pipe end to end is the whole of it.' },
      { id: 'stat:reach', kind: 'fact', name: `${lit.size} of ${STOPS.length} reached`,
        body: 'Stops the mana can get to along pipe you have laid.' },
      { id: 'stat:done', kind: 'fact', name: done ? 'Crossed' : 'Not crossed',
        body: done
          ? 'A path runs start to finish. Done is done.'
          : 'A chapter is finished when ONE path runs end to end — not when the '
            + 'map is full.' },
    ],
    edges: [
      { a: stopId(START), b: stopId(FINISH), rel: 'road' },
      { a: stopId(START), b: 'stat:reach', rel: 'has' },
      { a: stopId(FINISH), b: 'stat:done', rel: 'has' },
    ],
  };
}

export type TabId = 'chapter' | 'here' | 'self' | 'crossing';

export const TABS: ReadonlyArray<{ id: TabId; label: string; view: (g: Game) => View }> = [
  { id: 'chapter', label: 'Chapter', view: chapter },
  { id: 'here', label: 'Here', view: here },
  { id: 'self', label: 'Self', view: self },
  { id: 'crossing', label: 'Crossing', view: crossing },
];

/** What tapping a stop can do. R3.3: a thing you cannot do shows its reason. */
export interface Deed {
  kind: 'go' | 'build';
  label: string;
  note: string;
  to: number;
  why: string | null;
}

export function deedsFor(g: Game, nodeId: string): Deed[] {
  if (!nodeId.startsWith('stop:')) return [];
  const id = numOf(nodeId);
  if (id === g.at) return [];
  const r = roadsOut(g).find((x) => x.to === id);
  if (!r) return [];

  const walk: Deed[] = r.built ? [{
    kind: 'go', to: id, why: r.why,
    label: r.seen ? `Back to ${r.name}` : `Go to ${r.name}`,
    note: 'the line is open — free',
  }] : [];
  const why = unbuildable(g, id);
  return [...walk, {
    kind: 'build', to: id, why,
    label: r.gauge > 0
      ? `Widen the pipe to ${r.name} (${r.gauge} of ${MAX_GAUGE})`
      : `Lay the pipe to ${r.name}`,
    note: why ?? `${r.cost} mana · ${buildSecs(g, id)}s · carries `
      + `${((r.gauge + 1) * r.bore).toFixed(2)} a second · climbs ${climbTo(g, id)}`,
  }];
}

export { roadKey, GOING };
