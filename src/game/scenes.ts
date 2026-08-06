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
  // ---- THE CONTENT PASS, 2026-08-06: the dice troubles become scenes -------
  //
  // Each one is a DIFFERENT assembly of the same components, which is the
  // whole point of the system. The dice versions stay in `events.ts` — a halt
  // that misses SCENE_ODDS still rolls the old way, so both faces of the same
  // trouble exist and the map decides which you get.
  {
    // ★ THE SIEGE: progress that ROTS. The ward decays on its own, so the
    // question is whether you can out-build the rot while their press climbs.
    id: 'wights', name: 'Bog wights',
    on: ['bog', 'water'],
    stages: [
      { id: 'held', text: 'Grey shapes stand up out of the pools, wearing the '
        + 'faces of drowned surveyors. The crew has a ring of iron and firelight '
        + 'around the works, and the bog is patiently unmaking it.' },
      { id: 'inTrench', text: 'They are in the diggings, standing in the black '
        + 'water like posts. Nobody is digging.' },
    ],
    gauges: [
      { id: 'ward', label: 'The iron ring', start: 0, min: 0, max: 10, drift: -0.15 },
      { id: 'press', label: 'Their press', start: 3, min: 0, max: 12, drift: 0.4 },
    ],
    verbs: [
      { id: 'ring', label: 'Drive the iron ring', note: 'iron, hammered in — the ground swallows it slowly',
        stat: 'iron', effect: { ward: 0.6 }, perStat: { ward: 0.15 }, stages: ['held'] },
      { id: 'rally', label: 'Rally the crew', note: 'heart holds the line steady',
        stat: 'heart', effect: { press: -1.4 }, perStat: { press: -0.15 } },
      { id: 'peat', label: 'Burn dry peat', note: '3 mana — they hate the light',
        mana: 3, effect: { press: -3 } },
      { id: 'drive', label: 'Drive them out', note: 'iron, swung low',
        stat: 'iron', effect: { press: -1.3 }, perStat: { press: -0.2 }, stages: ['inTrench'] },
    ],
    rules: [
      { gauge: 'press', op: '>=', value: 12, end: 'setback' },
      { gauge: 'press', op: '>=', value: 8, goto: 'inTrench', stages: ['held'] },
      { gauge: 'press', op: '<=', value: 5, goto: 'held', stages: ['inTrench'] },
      { gauge: 'ward', op: '>=', value: 10, end: 'cleared' },
    ],
    // A bog feeds their press; open water eats the ward half again as fast.
    mods: { bog: { press: 1.3 }, water: { ward: 1.4 } },
  },
  {
    // ★ WATCH-AND-WAIT: the win condition COSTS the thing you are managing.
    // Watching is the only path through, and watching means letting it near.
    id: 'watcher', name: 'The stone watcher',
    on: ['stone', 'crag'],
    stages: [
      { id: 'prowling', text: 'It was a standing stone until the picks got '
        + 'close. Now it is somewhere new each time anyone looks up, and it is '
        + 'never further away.' },
      { id: 'over', text: 'It is at the lip of the trench, tilted the way a '
        + 'listening thing tilts. The crew will not turn their backs on it.' },
    ],
    gauges: [
      { id: 'near', label: 'How near it stands', start: 2, min: 0, max: 12, drift: 0.3 },
      // ★ HIDDEN until the first watch: you cannot learn what you will not look at.
      { id: 'gait', label: 'Its gait, learned', start: 0, min: 0, max: 8, hidden: true },
    ],
    verbs: [
      { id: 'watch', label: 'Watch how it moves', note: 'wits — every move it makes is one you keep',
        stat: 'wits', effect: { gait: 0.6, near: 0.4 }, perStat: { gait: 0.2 },
        reveals: ['gait'], stages: ['prowling'] },
      { id: 'back', label: 'Back the crew off', note: 'room to breathe, and the thread goes slack',
        effect: { near: -1.5, gait: -0.2 } },
      { id: 'lanterns', label: 'Ring it with lanterns', note: '2 mana — it dislikes being seen',
        mana: 2, effect: { near: -2.4 } },
      { id: 'stare', label: 'Down tools and stare', note: 'iron — it moves for nobody watching',
        stat: 'iron', effect: { near: -1.0 }, perStat: { near: -0.25 }, stages: ['over'] },
    ],
    rules: [
      { gauge: 'near', op: '>=', value: 12, end: 'setback' },
      { gauge: 'near', op: '>=', value: 9, goto: 'over', stages: ['prowling'] },
      { gauge: 'near', op: '<=', value: 6, goto: 'prowling', stages: ['over'] },
      { gauge: 'gait', op: '>=', value: 8, end: 'cleared' },
    ],
    mods: { crag: { near: 1.25 } },
  },
  {
    // ★ THE DEADLINE: a gauge that only FALLS. Two ways in — careful and slow,
    // or fast and feeding a hidden hazard — against a day that is going.
    id: 'oldstones', name: 'Old stones',
    on: ['moor', 'stone', 'crag'],
    stages: [
      { id: 'open', text: 'The picks ring on worked stone a foot under the turf '
        + '— squared blocks, laid by nobody the kingdom remembers, running '
        + 'exactly where the flow wants to go.' },
      { id: 'undermined', text: 'Under the third block there is a hollow, and '
        + 'the trench wall knows it. Small stones keep leaving without being pushed.' },
    ],
    gauges: [
      { id: 'bared', label: 'The old line, bared', start: 0, min: 0, max: 10 },
      { id: 'hollow', label: 'The hollow under', start: 0, min: 0, max: 10, hidden: true },
      { id: 'daylight', label: 'The daylight', start: 10, min: 0, max: 10, drift: -0.25 },
    ],
    verbs: [
      { id: 'bare', label: 'Bare them with care', note: 'wits — slow, and nothing falls in',
        stat: 'wits', effect: { bared: 0.5 }, perStat: { bared: 0.15 } },
      { id: 'crack', label: 'Crack them and be quick', note: 'iron — fast, and the hollow under them grows',
        stat: 'iron', effect: { bared: 0.8, hollow: 1.0 }, perStat: { bared: 0.15 }, stages: ['open'] },
      { id: 'sound', label: 'Sound the ground', note: 'shadow hears the hollow places',
        stat: 'shadow', effect: { hollow: -0.5 }, perStat: { hollow: -0.15 },
        reveals: ['hollow'] },
      { id: 'shore', label: 'Shore the trench wall', note: 'iron, and stout timber',
        stat: 'iron', effect: { hollow: -1.2 }, perStat: { hollow: -0.2 }, stages: ['undermined'] },
    ],
    rules: [
      { gauge: 'daylight', op: '<=', value: 0, end: 'setback' },
      { gauge: 'hollow', op: '>=', value: 10, end: 'setback' },
      { gauge: 'hollow', op: '>=', value: 7, goto: 'undermined', stages: ['open'] },
      { gauge: 'hollow', op: '<=', value: 4, goto: 'open', stages: ['undermined'] },
      { gauge: 'bared', op: '>=', value: 10, end: 'cleared' },
    ],
    // The crag's shadow eats the working day faster.
    mods: { crag: { daylight: 1.3 } },
  },
  {
    // ★ THE VIGIL: the win verb feeds the loss gauge, and a provision spent
    // is the fastest word in the argument.
    id: 'nightwatch', name: 'Lights on the crag',
    on: ['crag', 'stone'],
    stages: [
      { id: 'watching', text: 'Two nights running, a lantern where nothing '
        + 'stands, holding still for an hour and then not being there. The crew '
        + 'has started sleeping in shifts without being asked.' },
      { id: 'shifts', text: 'Nobody will go up. The fires get bigger and the '
        + 'circles around them get smaller.' },
    ],
    gauges: [
      { id: 'quiet', label: 'An understanding', start: 0, min: 0, max: 8 },
      { id: 'dread', label: 'The crew\'s dread', start: 2, min: 0, max: 10, drift: 0.35 },
    ],
    verbs: [
      { id: 'climb', label: 'Climb toward it', note: 'heart — somebody has to go up',
        stat: 'heart', effect: { quiet: 0.8, dread: 0.5 }, perStat: { quiet: 0.3 },
        stages: ['watching'] },
      { id: 'watch', label: 'Post a steady watch', note: 'shadow keeps the night honest',
        stat: 'shadow', effect: { dread: -0.8 }, perStat: { dread: -0.15 } },
      { id: 'fires', label: 'Feed the fires', note: '2 mana — light is an argument',
        mana: 2, effect: { dread: -2.0 } },
      { id: 'tea', label: 'Send up tea and bread', note: '1 provision — whatever it is, it is cold up there',
        provisions: 1, effect: { quiet: 2.2 }, stages: ['watching'] },
      { id: 'steady', label: 'Walk the rounds together', note: 'heart, in twos',
        stat: 'heart', effect: { dread: -1.0 }, perStat: { dread: -0.2 }, stages: ['shifts'] },
    ],
    rules: [
      { gauge: 'dread', op: '>=', value: 10, end: 'setback' },
      { gauge: 'dread', op: '>=', value: 7, goto: 'shifts', stages: ['watching'] },
      { gauge: 'dread', op: '<=', value: 4, goto: 'watching', stages: ['shifts'] },
      { gauge: 'quiet', op: '>=', value: 8, end: 'cleared' },
    ],
    mods: { crag: { dread: 1.2 } },
  },
  {
    // ★★ THE RACE — the owner's paced A-to-B objective, verbatim: *"objectives
    // to reach like you know going from point a to b (tapping to increase
    // speed)."* The crew moves on their OWN (the first helpful drift in the
    // game); tapping is the hurry-up; the deadline only ever climbs; and
    // pressing spends their breath, which is what gates mashing.
    id: 'longdark', name: 'The last of the light',
    on: ['wood', 'moor'],
    stages: [
      { id: 'strung', text: 'The survey party is strung out across bad ground '
        + 'with the light going. Every one of them can see the camp fires. '
        + 'None of them are at them.' },
      { id: 'blown', text: 'They are bent double with their hands on their '
        + 'knees. The dark does not stop to breathe.' },
    ],
    gauges: [
      { id: 'home', label: 'The crew, home', start: 0, min: 0, max: 10, drift: 0.3 },
      { id: 'dark', label: 'The dark coming', start: 0, min: 0, max: 12, drift: 0.5 },
      { id: 'wind', label: 'Their breath', start: 8, min: 0, max: 8, drift: 0.15 },
    ],
    verbs: [
      { id: 'press', label: 'Press them on', note: 'heart drives tired legs',
        stat: 'heart', effect: { home: 0.85, wind: -1.1 }, perStat: { home: 0.25 },
        stages: ['strung'] },
      { id: 'rest', label: 'Let them breathe', note: 'the dark gains, the legs come back',
        effect: { wind: 1.8 } },
      { id: 'flare', label: 'Send up mana-light', note: '2 mana — the ground ahead shows itself',
        mana: 2, effect: { home: 1.4 } },
      { id: 'carry', label: 'Carry the spent ones', note: 'iron takes the weight',
        stat: 'iron', effect: { home: 0.4 }, perStat: { home: 0.15 }, stages: ['blown'] },
    ],
    rules: [
      { gauge: 'dark', op: '>=', value: 12, end: 'setback' },
      { gauge: 'wind', op: '<=', value: 0.5, goto: 'blown', stages: ['strung'] },
      { gauge: 'wind', op: '>=', value: 4, goto: 'strung', stages: ['blown'] },
      { gauge: 'home', op: '>=', value: 10, end: 'cleared' },
    ],
    // Under trees the dark comes early; on open moor they make better time.
    mods: { wood: { dark: 1.25 }, moor: { home: 1.15 } },
  },
];

export const sceneById = (id: string): Scene | undefined =>
  SCENES.find((s) => s.id === id);

export const scenesOn = (g: Ground): Scene[] => SCENES.filter((s) => s.on.includes(g));
