// SCENES — every encounter is a little incremental game of its own.
//
// ★★ THE OWNER'S DESIGN, 2026-08-05, verbatim: *"every event should be an
// extended branching CYOA with hidden HP states and so on… maybe we can make
// each event a little incremental game of its own, so these are going to be
// our incremental layers… and then we'd be able to make incremental game
// components and combine them differently in various events."*
//
// So: a scene is assembled from COMPONENTS —
//   GAUGES   meters with a floor and a ceiling. Some DRIFT with time (the
//            incremental part: waiting is a real move with a real cost), and
//            some are HIDDEN until a verb reveals them (the hidden HP).
//   VERBS    tappable actions. Repeatable, scaled by a stat, priced in mana
//            or provisions, and each one pushes gauges around.
//   RULES    threshold triggers, checked in order: cross a line and the scene
//            BRANCHES to a new stage (new text, new verbs), or ENDS — cleared,
//            or a setback that costs you and leaves the trouble standing.
//   MODS     the journey type's word: the same washout drifts faster in a bog
//            than on a moor. Ground is a modifier, exactly as asked.
//
// The engine runs these deterministically: drifts come from the tick, effects
// from your taps, no dice anywhere in a scene. Variance between playthroughs
// is variance in TERRAIN and in what you chose to tap — which is the genre.
//
// ⚠️ EVERY LINE OF PROSE IS ⟨draft⟩, as ever: machine-drafted, owner-edited.
import type { Stat } from './dice';
import type { Ground } from './stops';

export interface Gauge {
  id: string;
  label: string;
  start: number;
  min: number;
  max: number;
  /** Per-second drift while the scene runs. The incremental heartbeat. */
  drift?: number;
  /** ★ HIDDEN HP: not shown until a verb with `reveals` names it. */
  hidden?: boolean;
}

export interface Verb {
  id: string;
  label: string;
  note: string;
  /** The stat that scales it, if one does. */
  stat?: Stat;
  /** Gauge deltas per use. */
  effect: Record<string, number>;
  /** Extra delta per point of `stat`, per gauge. */
  perStat?: Record<string, number>;
  mana?: number;
  provisions?: number;
  /** Gauges this verb uncovers. */
  reveals?: readonly string[];
  /** Only offered in these stages; absent = every stage. */
  stages?: readonly string[];
}

export interface Rule {
  gauge: string;
  op: '>=' | '<=';
  value: number;
  /** Branch to this stage… */
  goto?: string;
  /** …or end the scene. `cleared` opens the way; `setback` costs a provision,
   *  knocks the work back and leaves the trouble standing (fresh scene). */
  end?: 'cleared' | 'setback';
  /** Only fires while in one of these stages; absent = any. */
  stages?: readonly string[];
}

export interface Stage { id: string; text: string }

export interface Scene {
  id: string;
  name: string;
  on: readonly Ground[];
  stages: readonly Stage[];
  gauges: readonly Gauge[];
  verbs: readonly Verb[];
  /** Checked IN ORDER after every tick and every verb; first match wins. */
  rules: readonly Rule[];
  /** ground → gaugeId → drift multiplier. The journey type talking. */
  mods?: Partial<Record<Ground, Record<string, number>>>;
}

export const SCENES: readonly Scene[] = [
  {
    id: 'washout', name: 'The washout',
    on: ['moor', 'water', 'bog'],
    stages: [
      { id: 'open', text: 'The night\'s rain took the bank. Brown water is finding '
        + 'new ways in, and the cut you need is filling as fast as anyone digs.' },
      { id: 'flooded', text: 'The water has won the argument. The crew is digging '
        + 'waist-deep now, and everything takes twice the doing.' },
    ],
    gauges: [
      { id: 'cut', label: 'The cut', start: 0, min: 0, max: 10 },
      { id: 'water', label: 'The water', start: 3, min: 0, max: 12, drift: 0.45 },
    ],
    verbs: [
      { id: 'dig', label: 'Dig', note: 'iron speeds the spade',
        stat: 'iron', effect: { cut: 0.6 }, perStat: { cut: 0.15 } },
      { id: 'bail', label: 'Bail', note: 'push the water back a little',
        effect: { water: -1.4 } },
      { id: 'channel', label: 'Spend mana to firm the bank', note: '3 mana — the water slows where it lands',
        mana: 3, effect: { water: -3.5 } },
    ],
    rules: [
      // Deep water first: past 8 the scene BRANCHES; at 12 it throws you out.
      { gauge: 'water', op: '>=', value: 12, end: 'setback' },
      { gauge: 'water', op: '>=', value: 8, goto: 'flooded', stages: ['open'] },
      { gauge: 'water', op: '<=', value: 6, goto: 'open', stages: ['flooded'] },
      { gauge: 'cut', op: '>=', value: 10, end: 'cleared' },
    ],
    // ★ THE JOURNEY TYPE: a bog feeds the water half again as fast; open
    // moor drains a touch on its own.
    mods: { bog: { water: 1.5 }, moor: { water: 0.8 } },
  },
  {
    id: 'brigands', name: 'Toll brigands',
    on: ['moor', 'wood'],
    stages: [
      { id: 'parley', text: 'A rope across the way and four grinning reasons to '
        + 'respect it. They call it a toll. They are watching your hands.' },
      { id: 'knives', text: 'Somebody said the wrong word. The rope is down, the '
        + 'grins are gone, and everything is suddenly very simple.' },
    ],
    gauges: [
      // ★ HIDDEN HP — you cannot see their patience until you read them.
      { id: 'patience', label: 'Their patience', start: 6, min: 0, max: 10, hidden: true },
      { id: 'temper', label: 'Their temper', start: 2, min: 0, max: 10, drift: 0.25 },
      { id: 'nerve', label: 'The crew\'s nerve', start: 6, min: 0, max: 8,
        drift: -0.1, hidden: true },
    ],
    verbs: [
      { id: 'read', label: 'Read them', note: 'wits — see what they are really after',
        stat: 'wits', effect: { patience: -0.3 }, perStat: { patience: -0.15 },
        reveals: ['patience'], stages: ['parley'] },
      { id: 'talk', label: 'Talk them down', note: 'wits wears their patience',
        stat: 'wits', effect: { patience: -0.5, temper: -0.2 },
        perStat: { patience: -0.2 }, stages: ['parley'] },
      { id: 'stare', label: 'Stare them out', note: 'iron — faster, but the air sharpens',
        stat: 'iron', effect: { patience: -0.9, temper: 0.7 },
        perStat: { patience: -0.2 }, stages: ['parley'] },
      { id: 'coin', label: 'Slip them mana', note: '2 mana softens their temper',
        mana: 2, effect: { temper: -2.2 }, stages: ['parley'] },
      { id: 'stand', label: 'Stand together', note: 'iron holds the line',
        stat: 'iron', effect: { patience: -0.8, nerve: 0.4 },
        perStat: { patience: -0.25 }, reveals: ['nerve'], stages: ['knives'] },
      { id: 'feed', label: 'Feed the crew\'s courage', note: '1 provision steadies everyone',
        provisions: 1, effect: { nerve: 2.5 }, stages: ['knives'] },
    ],
    rules: [
      { gauge: 'patience', op: '<=', value: 0, end: 'cleared' },
      { gauge: 'temper', op: '>=', value: 8, goto: 'knives', stages: ['parley'] },
      { gauge: 'nerve', op: '<=', value: 0, end: 'setback', stages: ['knives'] },
    ],
    mods: { wood: { temper: 1.4 } },
  },
];

export const sceneById = (id: string): Scene | undefined =>
  SCENES.find((s) => s.id === id);

export const scenesOn = (g: Ground): Scene[] => SCENES.filter((s) => s.on.includes(g));
