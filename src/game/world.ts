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
import { pathOf, cutAt } from './paths';
import { troubleById } from './events';
import type { Pt } from './shapes';

/** Mana a second, said the same way everywhere it is said. */
const perSec = (n: number): string => `${n.toFixed(2)} a second`;

/** ⚠️ A RUNTIME LIST, and the type is derived FROM it rather than beside it.
 *  `test/ink.test.ts` used to restate these kinds by hand — on purpose, so that
 *  adding one without styling it would fail there. It did the opposite: the
 *  vocabulary turned over, every kind here was renamed, and the test went on
 *  cheerfully checking that the SCRAPPED kinds had ink. Same failure message,
 *  no way to drift. */
export const KINDS = ['stop', 'you', 'doing', 'fact', 'carry', 'way', 'halt', 'foe'] as const;
export type Kind = typeof KINDS[number];
export type Rel = 'road' | 'stands' | 'doing' | 'has' | 'carries' | 'way';

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

// ---- THE WAY -----------------------------------------------------------------
//
// ★★ THE LEG IS A PLACE, 2026-08-04 — the owner's design: *"instead of just
// waiting and being interrupted, it is the separate tab kinda where it
// happens… you're building, like, little graph through the terrain."* While a
// crew is out, the Here tab stops being a wheel of neighbours and becomes the
// LEG ITSELF: the real bent path through the real terrain, waypoint by
// waypoint, with everything still ahead of the crew drawn as a marker you can
// see coming — and everything behind them already a road.
//
// Fractal on purpose: the chapter is a graph of stops; a leg is a graph of
// waypoints. Same board, same inks, same rules.

/** A point a fraction of the way along the leg, by LENGTH. */
const along = (path: readonly Pt[], f: number): Pt => {
  const cut = cutAt(path, Math.max(0.001, Math.min(0.999, f)), true);
  return cut[cut.length - 1]!;
};

export interface WayLine {
  a: string; b: string; rel: 'road';
  fill: number; load: number; gauge: number; dir: number; pts: Pt[];
}

export interface WayPlan {
  view: View;
  spots: Array<{ id: string; x: number; y: number }>;
  box: { x: number; y: number; w: number; h: number };
  lines: WayLine[];
}

/** How far the work has got, 0..1 — one definition for the crew marker and
 *  every segment's fill, so they can never disagree. */
const wayFill = (g: Game): number =>
  g.building ? 1 - g.building.left / g.building.secs : 0;

export function theWay(g: Game): WayPlan | null {
  if (!g.building) return null;
  const [lo, hi] = g.building.key.split('|').map(Number);
  const far = lo === g.building.from ? hi! : lo!;
  const raw = pathOf(g.building.from, far);
  if (!raw) return null;
  // Oriented from YOUR end — the crew and the fill grow away from it.
  const first = raw[0]!;
  const fromAt = STOP.get(g.building.from)!;
  const path = Math.hypot(first.x - fromAt.x, first.y - fromAt.y) < 1
    ? [...raw] : [...raw].reverse();

  const f = wayFill(g);
  const farSeen = g.seen.includes(far);
  // Enough waypoints that the leg reads as a journey, few enough for thumbs.
  const N = 5;
  const marks: Array<{ id: string; kind: Kind; name: string; body?: string; at: Pt }> = [];
  marks.push({ id: stopId(g.building.from), kind: 'stop',
    name: nameOf(g.building.from), at: path[0]! });
  for (let i = 1; i < N; i++) {
    marks.push({ id: `way:${i}`, kind: 'way', name: '', at: along(path, i / N) });
  }
  marks.push({ id: stopId(far), kind: 'stop',
    name: farSeen ? nameOf(far) : '', at: path[path.length - 1]! });
  // ★ WHAT IS STILL IN THE WAY, visible AHEAD of the crew — the anticipation
  // the old hidden halts never had. Resolved ones are simply gone.
  g.building.halts.forEach((h, j) => {
    // ★ MET TROUBLE SHOWS ITS FACE. The first halt is the one the crew is
    // stopped at; while a FIGHT is on, its marker turns foe-red and carries
    // the name — an enemy encounter on this view, the owner's ask verbatim.
    const met = j === 0 && g.facing?.foe;
    marks.push(met
      ? { id: `halt:${j}`, kind: 'foe',
        name: troubleById(g.facing!.event)?.name ?? 'Something ahead',
        body: 'It stands between the crew and the far end.', at: along(path, h) }
      : { id: `halt:${j}`, kind: 'halt', name: 'Something ahead',
        body: 'The work will stop when the crew reaches it.', at: along(path, h) });
  });
  // The crew, at the head of the works. Keeps the DOING id so the panel rules
  // that know "the thing being done" need not learn a second name.
  marks.push({ id: DOING, kind: 'doing',
    // Mid-fight the FOE's name is the news — the crew mark goes quiet so the
    // two never fight over the same patch of label space.
    name: g.facing?.foe ? ''
      : g.building.to > 1 ? 'Widening the pipe' : 'Laying pipe',
    body: `Toward ${nameOf(far)}, by ${g.building.kit}. `
      + `${Math.ceil(g.building.left)}s of work left — tap the crew to hurry it.`,
    // Stopped AT trouble, the crew stands a step short of it — so the met
    // foe's mark and name stay legible where they overlap.
    at: along(path, Math.max(0.02, Math.min(0.98, g.facing ? f - 0.05 : f))) });

  const xs = path.map((p) => p.x), ys = path.map((p) => p.y);
  const pad = 70;
  const box = {
    x: Math.min(...xs) - pad, y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  };

  // The chain, one segment per waypoint gap, each with its own fill so the
  // road solidifies behind the crew and stays dotted ahead of them.
  const stopsIdx = [stopId(g.building.from),
    ...Array.from({ length: N - 1 }, (_, i) => `way:${i + 1}`), stopId(far)];
  const lines: WayLine[] = [];
  for (let i = 0; i < N; i++) {
    const f0 = i / N, f1 = (i + 1) / N;
    const pts: Pt[] = Array.from({ length: 5 },
      (_, t) => along(path, f0 + ((f1 - f0) * t) / 4));
    lines.push({
      a: stopsIdx[i]!, b: stopsIdx[i + 1]!, rel: 'road',
      fill: Math.max(0, Math.min(1, (f - f0) * N)),
      load: 0, gauge: g.building.to > 1 ? g.building.to : 1, dir: 0, pts,
    });
  }

  return {
    view: {
      nodes: marks.map(({ at: _, ...n }) => n),
      edges: lines.map((l) => ({ a: l.a, b: l.b, rel: l.rel })),
    },
    spots: marks.map((m) => ({ id: m.id, x: m.at.x, y: m.at.y })),
    box,
    lines,
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
