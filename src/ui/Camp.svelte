<script lang="ts">
  // THE CITY BUILDER'S ONE SCREEN — docs/CITY.md made flesh. Header of
  // numbers, the board, a dock of deeds. NO PROSE: nouns and numbers.
  import { onMount } from 'svelte';
  import Board, { type Dot, type Line } from './Board.svelte';
  import { INK, TOL } from '../game/ink';
  import type { Box } from '../game/layout';
  import { apply, catchUp, initial, flow, shown, popCap, pathKey, costOf, pathCostOf,
    priceLine, unlayable, unraisable, unassailable, heroHit, spearCost, hunger,
    heroMax, WILD_FED, SITE, GOBLINS, RATE, MAX_GAUGE, CREW, PATH_SECS,
    raisingLeft, buildSecs, housed, blowLeft, spearLabel, SPEAR_MADE,
    unforageable, nextForay, forageLeft, FORAGE_SECS, onWatch, RAID_SECS,
    unmarchable, marchSecs, onWatchAt, MUSTER_SHOWS,
    richOf, storeCost, roomOf, STORE_ROOM, cartCost, cartHaul, CARRY, CART_GAIN,
    raiders, raidTarget,
    windup, RATION_FOOD, RATION_HP,
    type City } from '../camp/engine';
  import { load, save, wipe, exportRaw, importRaw, elapsedSince } from '../camp/store';
  import { CAMP_SHAPES } from '../camp/scenery';
  import { ward } from '../camp/barrier';
  import { MARK, amount, outOf, price, times } from '../camp/marks';
  import type { Shape } from '../game/shapes';

  let game = $state<City>(initial());
  let ready = $state(false);
  /** One row of numbers about the pocket time, or null. Any tap clears it. */
  let awayLine = $state<string | null>(null);
  /** ★ THE WIN, said out loud — the owner: *"I think I won, but it wasn't
   *  clear."* Set when a holding falls, cleared by the next tap. */
  let won = $state<string | null>(null);
  let heldBefore = new Set<string>();
  $effect(() => {
    const now = new Set(Object.keys(game.goblins));
    for (const id of heldBefore) {
      if (!now.has(id)) {
        won = `${SITE.get(Number(id))?.name ?? 'The ground'} is TAKEN — +2 settlers`;
      }
    }
    heldBefore = now;
  });
  let picked = $state<number | null>(0);
  let menu = $state(false);
  let wiping = $state(false);
  let ported = $state<'copied' | 'refused' | null>(null);

  const act = (a: Parameters<typeof apply>[1]): void => { game = apply(game, a); };

  const f = $derived(flow(game));

  const cap = $derived(popCap(game));
  /** ★ Is this good at the storehouse ceiling? Everything arriving past it
   *  is WASTE, the same law the paths obey — so the chip says so. */
  const brim = (n: number): boolean => n >= roomOf(game) - 1e-9;
  /** How much of the valley is still theirs — the goal, as one number. */
  const holdings = $derived(Object.keys(game.goblins).length);
  /** ★ THE NEAREST RAID: whichever holding is fullest, and what it is
   *  coming for. `null` before first blood, when there is no war yet. */
  const worst = $derived((() => {
    let best: { m: number; at: string; gate: number | null } | null = null;
    for (const id of raiders(game)) {
      const m = game.menace[id] ?? 0;
      const t = raidTarget(game, id);
      if (t === null) continue;
      if (best === null || m > best.m) {
        best = { m, at: SITE.get(t)?.name ?? '', gate: t };
      }
    }
    return best;
  })());
  /** ★ WHAT THE PATHS ARE EATING, per second, over the whole town. This is
   *  the cartwright's case, and without it on screen the deed is a number
   *  with no reason attached. */
  const wasted = $derived((() => {
    let out = 0;
    for (const [id, m] of f.made) out += Math.max(0, m - (f.carried.get(id) ?? 0));
    return out;
  })());
  /** Planks the mills can actually deliver right now: capacity, starved to
   *  the log supply when the pile is dry. The header never overpromises. */
  const planksNow = $derived(
    game.logs > 0.05 ? f.planks : Math.min(f.planks, f.logs));

  // ★★ +1 POPS over the camp, NAMED — 2026-08-10 (playtest). The owner:
  // *"I also don't see plus one pop up with the appropriate icon once the
  // resource is mined."* It watched stone alone and floated a bare `+1`, so
  // a town whose planks were climbing and whose stone was not showed
  // nothing at all, and one whose stone was climbing did not say so.
  // Every good is watched now and the float carries that good's mark.
  // The board still throttles to one a second and clears them on a pan.
  let pops = $state(0);
  let popMark = $state('');
  const WATCHED = [
    ['stone', MARK.stone], ['logs', MARK.logs],
    ['planks', MARK.planks], ['food', MARK.food],
  ] as const;
  // ★★ IT COUNTS WHAT ARRIVES, NOT WHAT THE STORE DOES — 2026-08-10. The
  // owner: *"the pop ups with resources are not aligned with moving dots on
  // the graph."* They could not be: this watched the STORE, which also moves
  // when you spend, when a foray comes home, and when a raid takes something.
  // The dots on the board are DELIVERIES. Two different events wearing the
  // same badge, so they drifted apart by construction.
  //
  // Both now count the same thing. A porter is spaced so that one crossing
  // is one unit delivered (`rate` on each line), and this integrates the
  // delivered rate and pops on each whole unit — so a float over the camp
  // and a dot reaching it happen at the same frequency, per good.
  let carriedIn: Record<string, number> = { stone: 0, logs: 0, planks: 0, food: 0 };
  let lastWhole: Record<string, number> = { stone: 0, logs: 0, planks: 0, food: 0 };
  let lastAt = 0;
  $effect(() => {
    const rate: Record<string, number> =
      { stone: f.stone, logs: f.logsIn, planks: f.planks, food: f.food };
    const now = performance.now();
    if (lastAt === 0) { lastAt = now; return; }
    const dt = Math.min(2, (now - lastAt) / 1000);
    lastAt = now;
    for (const [good, mark] of WATCHED) {
      carriedIn[good] = (carriedIn[good] ?? 0) + (rate[good] ?? 0) * dt;
      const w = Math.floor(carriedIn[good]!);
      if (w > (lastWhole[good] ?? 0)) { pops++; popMark = mark; }
      lastWhole[good] = w;
    }
  });

  const siteId = (n: number): string => `site:${n}`;
  const numOf = (id: string): number => Number(id.split(':')[1]);
  const KIND_NAME = { hut: 'Hut', quarry: 'Quarry', lumber: 'Lumberworks',
    sawmill: 'Sawmill', farm: 'Farm' } as const;

  /** A site's label: the count, and the truth about what its paths carry. */
  function nameOf(id: number): string {
    const s = SITE.get(id)!;
    // ★ Held ground keeps its NAME — the owner: *"this must be some
    // location with a note that it's dangerous, not flat out goblins."*
    // The red mark carries the danger; the panel carries the number.
    if (game.goblins[id]) return s.name;
    const n = game.stacks[id] ?? 0;
    // ★ A WORKS UNDER THE HAMMER SAYS SO, 2026-08-10. Buildings take time
    // now, and a site that looks identical while it is being built is the
    // instant-build complaint wearing a clock.
    const up = raisingLeft(game, id);
    if (up !== null) {
      const kind = id === 0 ? 'Hut' : KIND_NAME[SITE.get(id)!.allows];
      return `${s.name} · ${kind} ×${n + 1} · ${MARK.time}${Math.ceil(up)}s`;
    }
    // ★★★ THE PLACE KEEPS ITS NAME, 2026-08-11. It used to lose it the moment
    // anything was built on it — the owner: *"as soon as I build something…
    // it doesn't tell me how it's called anymore. So it's just a sawmill for
    // me… But goblins attack named locations. So it's hard to understand what
    // are they attacking."* That is not a wording preference, it is the
    // attack messages and the board disagreeing about what things are called.
    // The name leads, always; the works follow it.
    if (n <= 0) return s.name;
    // ⚠️ AND IT STAYS SHORT. The rates used to live here — "Quarry ×3 · makes
    // 1.9 · carries 1.0" — and a label that long loses its collision fight
    // with its neighbours and is DROPPED by the layout solver entirely. That
    // is why Rock Face rendered with no label at all once a pit stood on it,
    // and it is the same failure as the owner's *"the label of camp is being
    // cut by the map"*. The board says WHERE and WHAT; `worksLine` below says
    // how much, in the panel, where there is room for it.
    return `${s.name} · ${id === 0 ? 'Hut' : KIND_NAME[s.allows]} ×${n}`;
  }

  /** The numbers that used to crowd the map label, for the panel. */
  function worksLine(id: number): string | null {
    const n = game.stacks[id] ?? 0;
    if (id === 0 || n <= 0 || game.goblins[id]) return null;
    const made = f.made.get(id) ?? 0;
    const carried = f.carried.get(id) ?? 0;
    if (!f.comp.has(id)) return 'no road home · 0/s';
    if (carried < made - 1e-9) {
      return `makes ${made.toFixed(1)}/s · carries ${carried.toFixed(1)}/s`;
    }
    return `${made.toFixed(1)}/s`;
  }

  /** ★★ WHERE THE HERO IS, in world coordinates — interpolated along the road
   *  while they walk. ⚠️ CANVAS-SIDE ONLY, never a DOM tap target:
   *  `docs/MAP_RECIPE.md` §9 — a thing that drifts is a thing a thumb cannot
   *  hit, and that bug took two sessions to close. */
  const heroAt = $derived((() => {
    const from = SITE.get(game.hero.at);
    if (!from) return null;
    const trip = game.hero.trip;
    if (!trip) return { x: from.x, y: from.y };
    const to = SITE.get(trip.to);
    if (!to) return { x: from.x, y: from.y };
    const done = 1 - trip.left / trip.secs;
    return { x: from.x + (to.x - from.x) * done, y: from.y + (to.y - from.y) * done };
  })());

  const dots = $derived<Dot[]>(shown(game).map((s) => ({
    id: siteId(s.id),
    name: nameOf(s.id),
    kind: game.goblins[s.id] ? 'foe'
      : s.id === 0 ? 'carry' : (game.stacks[s.id] ?? 0) > 0 ? 'fact' : 'stop',
    // ★ What stands here, said from the map (the visual pass).
    icon: !game.goblins[s.id] && (game.stacks[s.id] ?? 0) > 0
      ? s.allows : undefined,
    wx: s.x, wy: s.y,
    place: true,
    // ⚠️ NOT `you`. That flag also switches the DOT'S OWN LOOK to `you` ink
    // (the table in `ink.ts`), which turned the camp's dot red — the exact
    // enemy-red confusion this whole thread has been about. The hero comes
    // in on `mark` instead, so the stop keeps its dot, its colour and its
    // icon, and the figure stands beside it.
    you: false,
    open: f.comp.has(s.id) && (game.stacks[s.id] ?? 0) > 0,
    shut: false,
    known: true,
    on: picked === s.id,
    barred: false,
    // ★ The picked site is unmissable — the owner could not tell what
    // was selected. Half again the size is a statement, not a hint.
    r: picked === s.id ? 8 : undefined,
    // ★ A FILLING HOLDING SWELLS. The board already draws `r` for health,
    // so menace rides the same channel rather than inventing a second one.
    ...(game.goblins[s.id] && (game.menace[s.id] ?? 0) > 0 && picked !== s.id
      ? { r: 5 + (game.menace[s.id] ?? 0) * 4 } : {}),
  })));

  const lines = $derived<Line[]>((() => {
    const out: Line[] = [];
    const seen = new Set<string>();
    for (const s of shown(game)) {
      for (const n of s.near) {
        const key = pathKey(s.id, n);
        if (seen.has(key)) continue;
        seen.add(key);
        const gauge = game.paths[key] ?? 0;
        const job = game.laying[key];
        const choked = f.choked.has(key);
        // ★ The carriers tell the truth per path: an idle path in a busy
        // town shows nobody, a laden one crowds — density from the real
        // carried rate against this path's own capacity.
        const carrying = f.loads.get(key) ?? 0;
        const busy = gauge > 0 && carrying > 0.005;
        out.push({
          a: siteId(s.id), b: siteId(n), rel: 'road',
          // A path going in FILLS from nothing; a widen keeps carrying at
          // its old gauge while the spades work beside it.
          fill: gauge > 0 ? 1 : job ? 1 - job.left / job.secs : 0,
          load: choked ? 1 : busy ? Math.min(1, carrying / (gauge || 1)) : 0,
          gauge,
          choked,
          // ★ WHICH WAY THE CARRIERS WALK comes from the FLOW, not from id
          // order (review finding): the pines→mill legs ran backwards, and
          // the owner's rule is that the dots correspond to what is moving.
          // Board's `dir` is signed along a→b, and a is this site.
          dir: (f.dirs.get(key) ?? 0) * (s.id < n ? 1 : -1),
          carry: true,
          // ★★ WHAT THIS ROAD ACTUALLY DELIVERS, per second — 2026-08-10
          // (playtest). The owner: *"if it is point zero four per second,
          // then I anticipate to see a dot moving from lumberworks to the
          // camp at a rate of one per two seconds. At the moment, I see much
          // more."* The board used to space its porters by `load`, which is
          // a FRACTION OF CAPACITY — identical at 0.04/s and 40/s. It now
          // spaces them so one dot crossing IS one unit delivered, and this
          // is the number it does it with. ⚠️ Omit it and no carriers draw
          // at all, on purpose: a line that will not say what it delivers
          // may not imply a number.
          rate: carrying,
        });
      }
    }
    return out;
  })());

  /** ★ THE BARRIER — the ward around the ground you hold, under everything
   *  else on the map. A faint wash so the terrain still reads through it, and
   *  a dashed line at the edge: this is a frontier, not a wall you built.
   *  Redrawn only when the held ground changes, because `ward()` is derived
   *  from exactly that. */
  const scene = $derived<Shape[]>((() => {
    const pts = ward(game);
    if (pts.length < 3) return CAMP_SHAPES;
    // ⚠️ NO FILL, AND THAT IS NOT A STYLE CHOICE. A 7%-alpha wash over the
    // whole held country tints every pixel under it, including the carrier
    // dots the probe measures — it shifted their centroid enough that
    // "the carriers do not walk" fired on a build where they walked fine.
    // Found by running the probe, which is the only reason it was found.
    // The barrier is a LINE, which is what a barrier is.
    return [
      { s: 'path', pts, ink: 'ward', close: true, curve: true,
        w: 2, dash: [7, 6], alpha: 0.55 },
      ...musterShapes(),
      ...CAMP_SHAPES,
    ];
  })());

  /** ★★★ THE WAR, DRAWN — step 3 of `docs/RAIDS.md`, 2026-08-10. The owner:
   *  *"it's not even visible anywhere."* Two marks, both canvas-side:
   *
   *  - **the muster** — a ring round a holding's dot that FILLS 0→1 as it
   *    gathers, so "how close" is a shape rather than a number in a line of
   *    text you have to go and read;
   *  - **the threat** — a dotted line from the holding to what it is coming
   *    FOR, from `MUSTER_SHOWS` on, brightening as it fills. This is the
   *    part that was actually missing: menace said *how much* and never
   *    *at what*.
   *
   *  ⚠️ THE INK IS `foe`, NOT A FOURTH RED. `docs/RAIDS.md` warns that a new
   *  red must be measured against every counted ink AND against `foe` under
   *  colour blindness before a line of it is drawn. `foe` already means
   *  "held against you", is already measured in `test/palette.test.ts`, and
   *  the line is told apart by being DOTTED and by moving — not by hue.
   *  A fourth red buys nothing here and costs a vacuous palette check. */
  function musterShapes(): Shape[] {
    if (game.lost) return [];
    const out: Shape[] = [];
    for (const id of raiders(game)) {
      const m = game.menace[id] ?? 0;
      const from = SITE.get(id);
      if (!from || m <= 0) continue;
      // The ring: a swept arc, because `Shape` has no arc and a partial
      // circle of points is one. Starts at twelve o'clock and fills round.
      const r = 11;
      const steps = Math.max(2, Math.round(28 * Math.min(1, m)));
      const pts = Array.from({ length: steps + 1 }, (_, i) => {
        const a = -Math.PI / 2 + (i / steps) * Math.min(1, m) * Math.PI * 2;
        return { x: from.x + Math.cos(a) * r, y: from.y + Math.sin(a) * r };
      });
      out.push({ s: 'path', pts, ink: 'foe', w: 2.5, alpha: 0.35 + 0.65 * Math.min(1, m) });
      // The line: only once it is worth naming, and it STOPS AT THE HERO if
      // the hero is standing on the ground it wants — "they were stopped,
      // and by what", drawn.
      if (m < MUSTER_SHOWS) continue;
      const t = raidTarget(game, id);
      const to = t === null ? null : SITE.get(t);
      if (!to) continue;
      const held = t !== null && onWatchAt(game, t);
      const end = held && heroAt ? heroAt : to;
      out.push({ s: 'path', pts: [{ x: from.x, y: from.y }, { x: end.x, y: end.y }],
        ink: 'foe', w: 2, dash: [5, 5],
        alpha: 0.3 + 0.6 * Math.min(1, (m - MUSTER_SHOWS) / (1 - MUSTER_SHOWS)) });
    }
    return out;
  }

  /** ★ WHERE THE FIGURE GOES: beside the dot while standing, and on the road
   *  itself while marching. `atStop` is what tells the board which, because
   *  only the standing case needs to step aside for a dot and its icon. */
  const heroMark = $derived(heroAt === null ? null
    : { ...heroAt, atStop: game.hero.trip === null });

  const box = $derived<Box>((() => {
    const xs = shown(game).map((s) => s.x);
    const ys = shown(game).map((s) => s.y);
    const pad = 60;
    const x = Math.min(...xs) - pad;
    const y = Math.min(...ys) - pad;
    return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
  })());

  interface Deed { label: string; note: string; why: string | null; go: () => void }
  const deeds = $derived<Deed[]>((() => {
    if (picked === null) return [];
    const s = SITE.get(picked);
    if (!s) return [];
    const out: Deed[] = [];
    // ★ HELD GROUND: the only deed is the hero. Everything else waits.
    if (game.goblins[s.id]) {
      // ★★ MARCH, THEN FIGHT — 2026-08-10. A fight is a place now, so the
      // deed on held ground you are not standing on is the WALK, priced in
      // seconds, and the sword is drawn on arrival.
      if (game.hero.at !== s.id) {
        const why = unmarchable(game, s.id);
        const secs = marchSecs(game, s.id);
        out.push({
          label: `March on ${s.name}`,
          note: why ?? `${MARK.time}${secs}s → ${MARK.hero}${heroHit(game)}`
            + ` · ${MARK.bite}${GOBLINS[s.id]?.bite ?? 2}`,
          why,
          go: () => act({ type: 'march', to: s.id }),
        });
        return out;
      }
      const why = unassailable(game, s.id);
      out.push({
        label: 'Send the hero',
        note: why ?? `${MARK.hero}${heroHit(game)} · ${MARK.bite}${GOBLINS[s.id]?.bite ?? 2}`,
        why,
        go: () => act({ type: 'assail', id: s.id }),
      });
      return out;
    }
    // ★ AND ANYWHERE ELSE YOU HOLD: walking there is what puts the hero on
    // that gate, which is the only way to defend it now.
    if (game.hero.at !== s.id && marchSecs(game, s.id) !== null) {
      const why = unmarchable(game, s.id);
      out.push({
        label: `Stand at ${s.name}`,
        note: why ?? `${MARK.time}${marchSecs(game, s.id)}s`
          + `${(game.menace[s.id] ?? 0) > 0 ? ` · ${MARK.waste}` : ''}`,
        why,
        go: () => act({ type: 'march', to: s.id }),
      });
    }
    // ★ HAND WORK AT THE TREES — the owner: *"lumberworks is soft locked…
    // there's no way to get the lumber needed."* There was, and nobody
    // could find it (the header button quietly changed meaning). Now the
    // chop is a deed ON the pines, where a person would look for it.
    // ⚠️ THE CHOP BY HAND IS GONE WITH THE TAP, 2026-08-10. It was also the
    // one source of goods in the game that obeyed no gate — the owner:
    // *"I'm still able to chop logs in Tall Pines even though I don't have
    // a road there."* Removing the hand answers both at once: logs come
    // from a lumberworks, over a path, like everything else. The opening
    // stock (START_LOGS) is what buys the first one.
    const have = game.stacks[s.id] ?? 0;
    const why = unraisable(game, s.id);
    out.push({
      label: `${KIND_NAME[s.allows]} ×${have + 1}`,
      note: (why ?? `${price(costOf(s.allows, have))} `
        + `${MARK.time}${buildSecs(game, s.id)}s`)
        + (have > 0 ? ` · ${times(have)}` : ''),
      why,
      go: () => act({ type: 'raise', id: s.id }),
    });
    if (s.id === 0) {
      // ★★★ THE FORAY — the floor under the economy, and the only deed in
      // the game that needs nothing at all. A raid can strip a town of every
      // works while its stores sit at zero; without this there is no way
      // back from that, ever. ⚠️ It is deliberately SLOWER than one hand in
      // a pit, so it can never become the hand that was removed this
      // morning: a floor, not a strategy.
      {
        const why = unforageable(game);
        const next = nextForay(game);
        const left = forageLeft(game);
        out.push({
          label: left !== null ? 'Foraging…' : 'Send the hero out',
          note: left !== null
            ? `${MARK.time}${Math.ceil(left)}s · ${next.name}`
            : `${MARK.time}${FORAGE_SECS}s → ${price(next.loot)} · ${next.name}`,
          why,
          go: () => act({ type: 'forage' }),
        });
      }
      // ★ THE STOREHOUSE, beside the huts — room for every good, and the
      // only thing standing between the town and the top of either ladder.
      const sp = storeCost(game.store);
      const noRoom = game.stone < sp.stone || game.planks < sp.planks;
      out.push({
        label: `Storehouse ×${game.store + 1}`,
        note: `${price(sp)} → ${MARK.room}${roomOf(game) + STORE_ROOM}`
          + (game.store > 0 ? ` · ${times(game.store)}` : ''),
        why: noRoom ? price(sp) : null,
        go: () => act({ type: 'stow' }),
      });
      // ★ THE CARTWRIGHT — the one exponential that runs FOR the player,
      // and it runs on the graph because that is where the waste is.
      // ⚠️ OFFERED ONLY WHILE SOMETHING IS ACTUALLY CHOKED. A cart buys
      // exactly nothing for a town whose paths already carry everything
      // it makes, and a deed that takes 30 stone to do nothing is a trap
      // laid for the first hour, when no path is anywhere near its cap.
      if (wasted > 0.05) {
      const cp = cartCost(game.carts);
      const noCart = game.stone < cp.stone || game.planks < cp.planks;
      out.push({
        label: `Carts ×${game.carts + 1}`,
        note: `${price(cp)} → ${MARK.carts}${(CARRY * cartHaul(game) * CART_GAIN).toFixed(2)}/s`
          + ` · ${MARK.waste}${wasted.toFixed(1)}/s`,
        why: noCart ? price(cp) : null,
        go: () => act({ type: 'cart' }),
      });
      }
      const p = spearCost(game.hero.spears);
      const short = game.stone < p.stone || game.planks < p.planks;
      out.push({
        label: spearLabel(game.hero.spears + 1),
        // ★ WHAT IT IS MADE OF, said on the deed — 2026-08-10 (playtest).
        // The owner: *"why does it take planks and stones then? It's a
        // little bit unclear."* A spear is a knapped stone head on a planed
        // plank shaft, which is exactly the two goods charged.
        note: `${price(p)} → ${MARK.hero}${heroHit(game) + 1} · ${SPEAR_MADE}`
          + (game.hero.spears > 0 ? ` · ${times(game.hero.spears)}` : ''),
        why: short ? price(p) : null,
        go: () => act({ type: 'arm' }),
      });
    }
    for (const n of s.near) {
      const t = SITE.get(n);
      if (!t) continue;
      const key = pathKey(s.id, n);
      const job = game.laying[key];
      if (job) {
        out.push({
          label: `Laying · ${t.name}`,
          note: `${MARK.time}${Math.ceil(job.left)}s`,
          why: `${MARK.time}${Math.ceil(job.left)}s`,
          go: () => {},
        });
        continue;
      }
      const gauge = game.paths[key] ?? 0;
      if (gauge >= MAX_GAUGE) continue;
      const w = unlayable(game, s.id, n);
      out.push({
        // ★ WIDENING IS GONE (2026-08-11) — `gauge >= MAX_GAUGE` above now
        // means "already laid", so this deed only ever offers a NEW road and
        // the gauge count has nothing left to say.
        label: `Path · ${t.name}`,
        note: w ?? `${amount('stone', pathCostOf(gauge))} `
          + `${MARK.time}${PATH_SECS}s`
          + ` → ${(CARRY * cartHaul(game)).toFixed(1)}/s · ${MARK.hero}faster`,
        why: w,
        go: () => act({ type: 'lay', a: s.id, b: n }),
      });
    }
    return out;
  })());

  /** ★ WHAT HELD GROUND IS WORTH, in the two currencies that matter: how
   *  much richer it is than safe ground, and whether it carries its own
   *  road to the camp. Said on the panel BEFORE the fight is paid for. */
  function prizeOf(id: number): string {
    const s = SITE.get(id);
    if (!s) return '';
    const bits: string[] = [];
    const r = richOf(id);
    // ★ SAY WHAT THE MULTIPLIER MULTIPLIES, 2026-08-10 (playtest). It read
    // `quarry ×1.5` and the owner: *"Query one point five. What does it even
    // mean?"* A bare ratio against an unnamed base is not a number anybody
    // can act on. Quote the RATE this ground would actually pay per hand,
    // against the rate safe ground pays, in the units the HUD already uses.
    if (r > 1) {
      const base = s.allows === 'quarry' ? RATE.quarry
        : s.allows === 'lumber' ? RATE.lumber
        : s.allows === 'farm' ? RATE.farm : RATE.sawmill;
      bits.push(`${(base * r).toFixed(2)}/s a hand vs ${base.toFixed(2)}`);
    }
    // A direct edge to the camp that no laid path uses yet: an artery.
    if (s.near.includes(0) && !game.paths[pathKey(0, id)]) bits.push('own path to camp');
    return bits.length ? ` · ${bits.join(' · ')}` : '';
  }

  /** The tapped site's one status line — numbers, and only when they bite. */
  const status = $derived((() => {
    if (picked === null) return '';
    if (picked === 0) {
      // ★ "12/10 people strange" (owner playtest) — captives walk home even
      // when the huts are full, so pop CAN sit over the cap. The header was
      // taught to say so; this line was not, and still read "16 of 2".
      // ★ MARKS, NOT A SENTENCE (2026-08-09, the owner: *"too much prose
      // there, please icons and indicators"*). This line read "20 people ·
      // huts full · eats 0.7/s · fields bring 0.0/s · stores hold 120 ·
      // works 63% staffed" — eleven words and six numbers, sitting directly
      // under a HUD that already showed four of them.
      //
      // ⚠️ WHAT THE HUD ALREADY SAYS IS GONE FROM HERE, not restyled: the
      // population and its cap are `👤20/18` one row up. What is left is
      // what the HUD does NOT carry — the food balance, the room in the
      // stores, and how well the works are manned.
      return [
        hunger(game) > 0
          ? `${MARK.food}+${f.food.toFixed(1)}/s −${hunger(game).toFixed(1)}/s`
          : `${MARK.food}${MARK.people}${WILD_FED}`,
        f.starving ? `${MARK.waste}${MARK.food}` : '',
        `${MARK.room}${roomOf(game)}`,
        f.staff < 1 && !f.starving ? `${MARK.people}${Math.round(f.staff * 100)}%` : '',
      ].filter(Boolean).join(' · ');
    }
    if (game.goblins[picked]) {
      // ★ THE PRIZE, SAID BEFORE THE FIGHT — the owner: no reason to want
      // held ground. Now the ground says what it is worth, and whether it
      // is a second road home, while the goblins are still standing on it.
      //
      // ★ AND THE RAID CLOCK BESIDE IT. A clock you cannot see is just
      // theft, so the holding says how full it is and what it is coming
      // for. ⚠️ ADDED TO THIS LINE, NOT PUT IN FRONT OF IT: the first cut
      // returned early with only the menace and silently dropped the prize,
      // which broke the check that the gates advertise their own artery.
      const m = game.menace[picked] ?? 0;
      const at = raidTarget(game, picked);
      // ★ THE WHOLE RULE, where the danger is: how full the clock is, what
      // it comes for, how often, and the two things that stop it.
      const clock = m > 0 && at !== null
        ? ` · ${MARK.waste}${Math.round(m * 100)}% → ${SITE.get(at)?.name ?? ''}`
          + ` every ${RAID_SECS}s · takes 1 building`
          + ` · ${onWatch(game) ? `${MARK.hero} home turns one away`
            : `${MARK.hero} away — nothing turns it away`}`
        : '';
      return `${MARK.danger}${Math.ceil(game.goblins[picked] ?? 0)}`
        + prizeOf(picked) + clock;
    }
    const n = game.stacks[picked] ?? 0;
    // ★ Won ground keeps saying what it is worth — a ×3 pit that reads the
    // same as Rock Face is the complaint all over again, one fight later.
    const rich = richOf(picked) > 1
      ? `rich ground · every hand ×${richOf(picked)}` : '';
    if (n <= 0) return rich;
    if (!f.comp.has(picked)) return 'no path to the camp · carries 0';
    if (SITE.get(picked)?.allows === 'sawmill' && f.millCap > 0
      && f.logsIn + (game.logs > 0.05 ? 1 : 0) < f.millCap - 1e-9) {
      return `logs in ${f.logsIn.toFixed(1)}/s of ${f.millCap.toFixed(1)}/s — wire the pines closer`;
    }
    const made = f.made.get(picked) ?? 0;
    const carried = f.carried.get(picked) ?? 0;
    if (carried < made - 1e-9) {
      return `choked · ${(made - carried).toFixed(1)}/s wasted — build a cart`;
    }
    return '';
  })());

  /** Set hands ±1 and SAY where the person came from — the owner: the
   *  pull used to happen silently and it read as a bug. */
  function pinAt(id: number, d: 1 | -1): void {
    const before = new Map(f.hands);
    act({ type: 'pin', id, d });
    if (d > 0) {
      for (const [sid, w] of flow(game).hands) {
        if (sid !== id && w < (before.get(sid) ?? 0) - 1e-9) {
          won = `a hand left ${SITE.get(sid)?.name}`;
          break;
        }
      }
    }
  }

  function doTap(id: string): void {
    awayLine = null;
    won = null;
    const n = numOf(id);
    // ★ STICKY, 2026-08-10 (playtest). It was `picked === n ? null : n`, so
    // a second tap on the same dot cleared the selection — and the owner:
    // *"when you click the second time on the node, it shouldn't close,
    // because the state when there is no node selected is a little bit weird
    // state."* There is no reason to ever WANT the empty panel.
    picked = n;
  }

  async function copySave(): Promise<void> {
    try {
      await navigator.clipboard.writeText(exportRaw(game));
      ported = 'copied';
    } catch { ported = 'refused'; }
    setTimeout(() => (ported = null), 2500);
  }
  function pasteSave(): void {
    const t = window.prompt('Paste a save');
    if (t === null) return;
    const back = importRaw(t.trim());
    if (!back) { ported = 'refused'; setTimeout(() => (ported = null), 2500); return; }
    game = back.game;
  }

  onMount(() => {
    const back = load();
    if (back) {
      const secs = Math.min(elapsedSince(back.savedAt), 12 * 3600);
      // Chunked, not one giant step — the away run obeys the same starving,
      // growth and spade rules the live run does.
      game = secs > 1 ? catchUp(back.game, secs) : back.game;
      // ★ THE AWAY LINE — what the pocket time brought, one row of numbers.
      if (secs > 90) {
        const d = (a: number, b: number): number => Math.floor(a) - Math.floor(b);
        const parts = [
          [d(game.stone, back.game.stone), 'stone'],
          [d(game.logs, back.game.logs), 'logs'],
          [d(game.planks, back.game.planks), 'planks'],
          [d(game.food, back.game.food), 'food'],
          [game.pop - back.game.pop, 'settlers'],
        ].filter(([n]) => (n as number) > 0)
          .map(([n, w]) => `+${n} ${w}`);
        if (parts.length) {
          const h = secs / 3600;
          awayLine = `Away ${h >= 1 ? `${h.toFixed(1)} hours` : `${Math.round(secs / 60)} minutes`}`
            + ` — ${parts.join(' · ')}`;
        }
      }
    }
    ready = true;
    (window as unknown as { __INK: typeof INK }).__INK = INK;
    (window as unknown as { __TOL: typeof TOL }).__TOL = TOL;

    let last = performance.now();
    let raf = 0;
    const frame = (t: number): void => {
      const secs = (t - last) / 1000;
      if (secs >= 0.2) { last = t; act({ type: 'tick', secs }); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // (The auto-strike crank is gone — the owner's reversal, 2026-08-08:
  // the strip has real verbs now, so every round is a tap on purpose.)

  let lastSaved = '';
  $effect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const now = JSON.stringify(game);
      if (now === lastSaved) return;
      lastSaved = now;
      save(game);
    }, 2000);
    return () => clearInterval(id);
  });
  $effect(() => {
    const flush = (): void => { if (ready) { lastSaved = JSON.stringify(game); save(game); } };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  });
</script>

<main>
  {#if game.lost}
    <!-- ★★★ THE RUN IS OVER, SAID LOUDLY. The owner, on a previous win:
         *"I think I won, but it wasn't clear."* A run that ends quietly is
         a bug in the only moment the game has. Nothing else is reachable
         until they choose to walk out. -->
    <div class="gone">
      <h1>THE VALLEY IS LOST</h1>
      <p class="note">{MARK.danger} the camp is overrun · {MARK.hero}{game.hero.spears} carried</p>
      <p class="note">the works are gone · the veteran is not</p>
      <button class="deed row big" onclick={() => act({ type: 'found' })}>
        <span class="what">Found the next camp</span>
        <em>{MARK.hero}{Math.max(game.legacy.spears, Math.floor(game.hero.spears / 2) + 1)}
          · run {game.legacy.runs + 1}</em>
      </button>
    </div>
  {/if}
  <header>
    <!-- ★★ THE HUD, 2026-08-09, built to the owner's design mock. It replaces a
         wrapped run-on line ("60 stone 12 logs 45 planks 54 food 11 people ·
         huts full hero 10/10 · arms 1") that had every quantity at the same
         weight and no alignment, so nothing could be found at a glance.

         Four goods across the top, four standings under them. Each cell
         carries `data-q`, which is what the probe reads — a targeted cell
         beats a regex over the whole header, and the old checks were
         regexing a soup.

         ⚠️ THE THREE STATES THAT MUST SURVIVE ANY RESTYLE, all of them
         earned this week: a FULL store (the stock stops climbing), a
         STARVING town (every works but the farms halts), and the tap rate
         on stone. A HUD that looks better and hides those is worse. -->
    <div class="hud">
      <div class="cell" class:brim={brim(game.stone)} data-q="stone">
        <span class="cap">STONE</span>
        <b>{Math.floor(game.stone)}<span class="cap-of">/{roomOf(game)}</span></b>
        <em>🪨 {brim(game.stone) ? 'full'
          : f.stone > 0 ? `+${f.stone.toFixed(1)}/s` : '—'}</em>
      </div>
      <div class="cell" class:brim={brim(game.logs)} data-q="logs">
        <span class="cap">LOGS</span>
        <b>{Math.floor(game.logs)}<span class="cap-of">/{roomOf(game)}</span></b>
        <em>🪵 {brim(game.logs) ? 'full'
          : f.logsIn > 0 ? `+${f.logsIn.toFixed(1)}/s` : '—'}</em>
      </div>
      <div class="cell" class:brim={brim(game.planks)} data-q="planks">
        <span class="cap">PLANKS</span>
        <b>{Math.floor(game.planks)}<span class="cap-of">/{roomOf(game)}</span></b>
        <em>🟫 {brim(game.planks) ? 'full'
          : planksNow > 0 ? `+${planksNow.toFixed(1)}/s` : '—'}</em>
      </div>
      <div class="cell" class:hurt={f.starving} class:brim={brim(game.food) && !f.starving}
        data-q="food">
        <span class="cap">FOOD</span>
        <b>{Math.floor(game.food)}<span class="cap-of">/{roomOf(game)}</span></b>
        <em>🌾 {f.starving ? 'STARVING' : brim(game.food) ? 'full'
          : `${hunger(game) > 0 ? `−${hunger(game).toFixed(1)}/s` : ''}${
            f.food > 0 ? ` +${f.food.toFixed(1)}/s` : ''}`.trim() || '—'}</em>
      </div>
    </div>
    <div class="hud standings">
      <span class="cell" class:lv={game.pop < cap} data-q="people"
        aria-label="people">👤 {Math.floor(game.pop)}/{cap}</span>
      <span class="cell" class:brim={game.pop >= cap} data-q="huts"
        aria-label="huts">🏠 {game.pop >= cap ? 'full' : `×${game.stacks[0] ?? 0}`}</span>
      <span class="cell" class:hurt={game.hero.hp < heroMax(game) / 3} data-q="hero"
        aria-label="hero">⚔️ {game.hero.hp}/{heroMax(game)} · {spearLabel(game.hero.spears).toLowerCase()}</span>
      <span class="cell" data-q="carts" aria-label="carts">🛞 {game.carts}</span>
      <!-- ⚠️ THE GEAR LIVES IN THIS ROW, not pinned over the top corner. It
           was absolute, and it sat on the FOOD column and clipped its label
           to "FOO" — caught in the first screenshot. A trailing `auto`
           column cannot overlap anything. -->
      <button class="reset gear" onclick={() => (menu = !menu)}>{menu ? 'Close' : '⋯'}</button>
    </div>
    <!-- ★★ THE GOAL, AND THE WAR, ON SCREEN — 2026-08-10 (playtest). Two
         complaints, one line. *"at the moment, I do not see any goal. I don't
         understand what to do."* And: *"I'm not sure when the attack on the
         camp is gonna happen. And if it's gonna happen."* The raid clock
         existed but only on the holding's own panel, which you had to go and
         tap — a war you cannot see coming is not a clock. -->
    <!-- ★★★ HOW, WHY, AND WHAT TO DO — 2026-08-10. The owner: *"the goblin
         raids mechanics is unclear how it happens, why and what can you do
         about it."* All three go on one line, always:
           HOW  — a percentage that fills, and the site it is coming for
           WHY  — it only starts once you have taken ground (first blood)
           WHAT — the hero stops one raid by being HOME, and taking the
                  holding stops its clock for good -->
    <div class="warline" class:hot={worst !== null && worst.m > 0.6} data-q="war">
      {#if game.ambush !== null}
        <!-- ★ CAUGHT IN THE OPEN outranks every other war news for as long as
             it lasts: it is the one thing that happened TO you. -->
        {MARK.waste}ambushed on the road
        · {MARK.hero}{game.hero.hp}/{heroMax(game)}
      {:else if worst !== null}
        {MARK.waste}{Math.round(worst.m * 100)}% → {worst.at}
        · {worst.gate !== null && onWatchAt(game, worst.gate)
          ? `${MARK.hero} holding it`
          : game.hero.trip
            ? `${MARK.hero}→${SITE.get(game.hero.trip.to)?.name ?? ''}`
            : `${MARK.hero} ${SITE.get(game.hero.at)?.name ?? ''}`}
        · {MARK.danger}{holdings} left
      {:else if holdings > 0}
        {MARK.danger}{holdings} holdings · they come once you take one
      {:else}
        {MARK.danger}0 · the valley is yours
      {/if}
    </div>
    {#if menu}
    <div class="menurow">
      <button class="reset" class:armed={wiping}
        onclick={() => {
          if (!wiping) { wiping = true; setTimeout(() => (wiping = false), 3000); return; }
          wiping = false; wipe(); game = initial(); picked = 0;
        }}>
        {wiping ? 'Wipe it? Tap again' : 'Start over'}
      </button>
      <button class="reset porter" onclick={copySave}>
        {ported === 'copied' ? 'Copied' : 'Copy save'}
      </button>
      <button class="reset porter" onclick={pasteSave}>
        {ported === 'refused' ? 'That save was refused' : 'Load a save'}
      </button>
      <span class="keep build">{__BUILD_ID__}</span>
    </div>
    {/if}
  </header>

  {#if ready}
    <div class="map">
      <Board {dots} {lines} {box} label="city" onTap={doTap} drag={false}
        decor={scene} mark={heroMark} pulse={pops} pulseMark={popMark} />
    </div>
    <section class="panel">
      {#if awayLine}
        <p class="away">{awayLine}</p>
      {/if}
      {#if won}
        <p class="away">{won}</p>
      {/if}
      {#if game.fight}
        {@const fi = game.fight}
        {@const wind = windup(fi.round)}
        {@const aimedAt = (fi.sq[fi.target]?.hp ?? 0) > 0
          ? fi.target : fi.sq.findIndex((q) => q.hp > 0)}
        <!-- ★ THE BATTLE STRIP — the owner's own screen: our square left,
             their three right. Tap a square to aim; every verb is a round. -->
        <h2>{nameOf(fi.site)} · goblins</h2>
        <div class="strip">
          <div class="sq us" class:low={game.hero.hp <= 3}>
            <b>{game.hero.hp}</b>
            <span>hero</span>
            <em>hits {heroHit(game)}</em>
          </div>
          <span class="vs" class:hurt={wind}>{wind ? '⚡' : 'vs'}</span>
          {#each fi.sq as q, i (i)}
            <button class="sq them" class:down={q.hp <= 0}
              class:aimed={aimedAt === i}
              disabled={q.hp <= 0} onclick={() => act({ type: 'aim', at: i })}>
              <b>{Math.ceil(q.hp)}</b>
              <span>{q.kind}</span>
              <em>{q.hp > 0 ? `pokes ${q.poke * (wind ? 2 : 1)}` : 'down'}</em>
            </button>
          {/each}
        </div>
        <p class="note" class:windnote={wind}>{wind
          ? 'they WIND UP — this answer bites double'
          : `their answer: ${fi.sq.reduce((n, q) => n + (q.hp > 0 ? q.poke : 0), 0)}${windup(fi.round + 1) ? ' · wind-up next' : ''}`}</p>
        <!-- ★ COMPACT VERBS, 2×2 — four stacked full-width deeds pushed the
             strip off small screens (the visual pass). -->
        <!-- ★★ THE BLOW IN FLIGHT — 2026-08-10 (playtest). The owner: *"it is
             a little bit weird that these attacks are instant again."* An
             order now takes seconds, so the strip must SAY it is mid-swing
             and refuse a second order, or the delay reads as a dead button. -->
        {#if blowLeft(game) !== null}
          <p class="note swinging">{MARK.time}{(blowLeft(game) ?? 0).toFixed(1)}s
            · {game.fight?.blow?.act ?? ''}</p>
        {/if}
        <div class="verbs" class:mid={blowLeft(game) !== null}>
          <button class="deed" disabled={blowLeft(game) !== null}
            onclick={() => act({ type: 'strike' })}>
            Attack
            <em>{heroHit(game)} into the {fi.sq[aimedAt]?.kind ?? 'line'}</em>
          </button>
          <button class="deed" disabled={blowLeft(game) !== null}
            onclick={() => act({ type: 'guard' })}>
            Guard
            <em>block their whole answer</em>
          </button>
          <button class="deed"
            disabled={blowLeft(game) !== null || fi.packs <= 0 || game.food < RATION_FOOD}
            onclick={() => act({ type: 'ration' })}>
            Rations ×{fi.packs}
            <em>{RATION_FOOD} food → +{RATION_HP} hero</em>
          </button>
          <button class="deed" onclick={() => act({ type: 'flee' })}>
            Fall back
            <em>home — the ground keeps its wounds</em>
          </button>
        </div>
      {:else if picked !== null && SITE.has(picked)}
        <h2>{nameOf(picked)}</h2>
        <!-- ★ THE NUMBERS THE MAP LABEL NO LONGER CARRIES (2026-08-11). They
             lived in the label and made it long enough to lose its collision
             fight and be dropped altogether. -->
        {#if worksLine(picked)}<p class="note">{worksLine(picked)}</p>{/if}
        {#if status}<p class="note">{status}</p>{/if}
        {#if picked !== 0 && (game.stacks[picked] ?? 0) > 0 && !game.goblins[picked]}
          <!-- ★ POSTED HANDS — the owner's ask. Pins win the pool; freeing
               them returns everyone to farms-first auto. -->
          <div class="crew">
            <button onclick={() => pinAt(picked!, -1)}
              disabled={(f.hands.get(picked) ?? 0) <= 0 && game.crew[picked] !== undefined}>−</button>
            <span>hands {f.hands.get(picked) ?? 0} of {(game.stacks[picked] ?? 0) * CREW}{
              game.crew[picked] !== undefined ? ' · set by hand' : ''}</span>
            <button onclick={() => pinAt(picked!, 1)}
              disabled={(game.crew[picked] ?? Math.round(f.hands.get(picked) ?? 0)) >= (game.stacks[picked] ?? 0) * CREW}>+</button>
            {#if game.crew[picked] !== undefined}
              <button class="autoback" onclick={() => act({ type: 'free', id: picked! })}>auto</button>
            {/if}
          </div>
        {/if}
        <div class="deeds">
        {#each deeds as d (d.label)}
          <!-- ★ ONE LINE PER DEED, 2026-08-09. The owner, on the phone: *"the
               horizontal buttons at the bottom, they take too much space."*
               They did — label over note over 10px of padding is ~67px of a
               844px screen EACH, so five deeds ate a third of the phone and
               the map got what was left. Name left, price right, one row.
               ⚠️ STILL 44px TALL. The row is shorter but the TAP TARGET is
               not: that is the floor a thumb needs, and shaving it is how a
               compact list becomes a list you cannot hit. -->
          <button class="deed row" disabled={d.why !== null} onclick={d.go}>
            <span class="what">{d.label}</span>
            <em>{d.note}</em>
          </button>
        {/each}
        </div>
      {:else}
        <p class="note">Tap a site.</p>
      {/if}
    </section>
  {/if}
</main>

<style>
  /* ★ ONE COLUMN EVERYWHERE — the owner, off a desktop screenshot: "it's
     very weird on desktop." The game is a phone column; a wide window gets
     the same column, centred, not a map squeezed over furniture-sized
     buttons. */
  main { display: flex; flex-direction: column; height: 100dvh; background: #efe9dc;
    max-width: 520px; margin: 0 auto; }
  @media (min-width: 560px) {
    main { border-inline: 1px solid #d8d0bf; box-shadow: 0 0 42px #0002; }
    :global(body) { background: #e3dccb; }
  }
  header { display: flex; flex-direction: column; gap: 0;
    border-bottom: 1px solid #d8d0bf; position: relative; }

  /* ★ FOUR EQUAL COLUMNS. `minmax(0, 1fr)` and not `1fr`: a long rate line
     ("−0.9/s +1.2/s") would otherwise push its column wider than its share
     and knock the other three out of alignment, which is the exact thing
     this HUD replaced. */
  .hud { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch; }
  .hud .cell { display: flex; flex-direction: column; align-items: center;
    gap: 1px; padding: 7px 2px 8px; border: 0; border-right: 1px solid #e6dfcf;
    background: none; font: inherit; text-align: center; min-width: 0; }
  .hud .cell:last-child { border-right: 0; }
  .cap { font-size: 10px; letter-spacing: .09em; color: #9a8f79; font-weight: 700; }
  .hud .cell b { font-size: 21px; line-height: 1.05; color: #2c2822; font-weight: 700; }
  /* ★ THE CEILING IS ALWAYS ON SCREEN, 2026-08-10 (playtest). The owner:
     *"I don't seem to have any storage capacity... it doesn't say anywhere
     what is my limit for the stone"* — it only said `full of 60` once it was
     already full, which is the one moment the number is no longer useful.
     Dimmer and smaller than the amount, so `41/60` still reads as "41". */
  .cap-of { font-size: 13px; color: #9a8f79; font-weight: 600; }
  .hud .cell.brim .cap-of, .hud .cell.hurt .cap-of { color: #b3452f; }
  .hud .cell em { font-style: normal; font-size: 11px; color: #8a8172;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

  /* The tap target is the whole stone column, which is a far bigger thumb
     mark than the old chip — and it is the one thing here you can press. */
  .hud .cell.tap { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .hud .cell.tap:active { background: #efe8d9; }

  /* A stock that has stopped climbing, and a town that has stopped eating. */
  .hud .cell.brim b, .hud .cell.brim em { color: #b3452f; }
  .hud .cell.hurt b, .hud .cell.hurt em { color: #b3452f; font-weight: 700; }

  .warline { padding: 5px 10px; font-size: 12.5px; font-weight: 600;
    text-align: center; color: #6b5d3f; background: #f2ece0;
    border-top: 1px solid #e6dfcf; white-space: nowrap; overflow: hidden;
    text-overflow: ellipsis; }
  /* Past two thirds it stops being background information. */
  .warline.hot { color: #b3452f; background: #f7e9e5; }

  .standings { border-top: 1px solid #e6dfcf; background: #f7f2e7;
    /* ⚠️ NOT FOUR EQUAL COLUMNS like the row above. The standings are wildly
       uneven in length — "🛞 3" against "⚔️ 8/10 · arms 1" — and equal shares
       clipped the hero's arms count to "arms" with nothing after it. The
       short ones take what they need; the hero takes the slack. */
    grid-template-columns: auto auto minmax(0, 1fr) auto auto; }
  .standings .cell { padding-left: 8px; padding-right: 8px; }
  .standings .cell { flex-direction: row; justify-content: center; gap: 4px;
    padding: 6px 2px; font-size: 13px; color: #6b5d3f; font-weight: 600;
    white-space: nowrap; overflow: hidden; }
  .standings .cell.lv { color: #1f6b3a; }
  .standings .cell.brim { color: #b3452f; }
  .standings .cell.hurt { color: #b3452f; }

  /* ★ THE END OF A RUN COVERS THE BOARD. It is the one moment the game
     has, and it must not be a line in a corner. */
  .gone { position: fixed; inset: 0; z-index: 50; display: flex;
    flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 24px; text-align: center; background: #efe6d6; }
  .gone h1 { font-size: 26px; letter-spacing: .04em; color: #b3452f; margin: 0; }
  .gone .note { margin: 0; }
  .gone .deed.row.big { align-items: center; min-height: 56px; max-width: 320px;
    background: #fdfaf2; border-color: #b3452f; margin-top: 8px; }

  /* ⚠️ `flee` KEEPS ITS BUTTON MID-SWING ON PURPOSE — a safety valve you
     have to wait for is not a safety valve. */
  .swinging { color: #b3452f; font-weight: 700; text-align: center; margin: 2px 0; }

  .keep { font-size: 14px; color: #6b5d3f; font-weight: 600; }
  .keep.build { color: #b0a892; font-weight: 400; font-size: 12px; }
  .reset { font: inherit; font-size: 13px; border: 1px solid #d8d0bf;
    border-radius: 10px; padding: 6px 10px; background: #efe9dc; color: #6b6353; }
  /* ⚠️ ABSOLUTE NOW: the header is a COLUMN since the HUD went in, so
     `margin-left:auto` no longer pushes it anywhere — it would sit as its own
     full-width row under the standings. Pinned to the top corner instead,
     clear of the four columns. */
  .reset.gear { padding: 2px 10px; line-height: 1.3; align-self: center;
    margin: 0 6px 0 2px; }
  .reset.armed { background: #b3452f; color: #fff; }
  .map { flex: 1; min-height: 0; position: relative; margin: 10px; }
  .panel { padding: 8px 14px 16px; border-top: 1px solid #d8d0bf; background: #f7f2e7;
    min-height: 148px; max-height: 44dvh; overflow-y: auto; }
  .menurow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    padding: 8px 14px; border-top: 1px solid #e6dfcf; }
  .panel h2 { margin: 4px 0 6px; font-size: 18px; }
  .note { color: #8a8172; font-size: 14px; margin: 4px 0; }
  .deed { display: block; width: 100%; text-align: left; font: inherit; font-size: 16px;
    border: 1px solid #d8d0bf; border-radius: 12px; background: #fdfaf2;
    padding: 10px 12px; margin: 6px 0; }
  .deed:disabled { background: #e3ddd0; color: #8a8172; }
  .deed em { display: block; font-style: normal; font-size: 12.5px; color: #8a8172; }

  /* ★★ TWO COLUMNS, 2026-08-09 — the owner, on the phone: *"the horizontal
     buttons at the bottom, they take too much space."* Full-width rows were
     54px each and the list ran to 234px of an 844px screen; the map got 374.
     This is the same answer the battle strip already reached for the same
     reason (`.verbs`, "four stacked full-width deeds pushed the strip off
     small screens") — so the dock now uses the precedent instead of
     inventing a second one. */
  .deeds { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 6px 0; }
  /* ⚠️ `box-sizing` AND `width:auto` ARE LOAD-BEARING HERE. The base `.deed`
     rule sets `width:100%`, and there is no border-box reset anywhere in this
     app — so inside a grid cell each row came out 22px wider than its column
     (100% + 10px padding each side + 1px border each side) and the right-hand
     column ran off the screen edge, cutting "Widen · The Camp (1 of 3)" to
     "(1 of". Caught in the screenshot, not by any check. */
  .deed.row { display: flex; flex-direction: column; justify-content: center;
    align-items: flex-start; gap: 1px; min-height: 44px; margin: 0;
    box-sizing: border-box; width: auto; min-width: 0;
    padding: 7px 10px; font-size: 14.5px; border-radius: 10px; line-height: 1.2; }
  /* ⚠️ THE NAME MAY ELLIPSISE, THE PRICE MAY NOT. A deed you cannot afford
     has to say what it wants — that is the entire job of the second line —
     so it wraps rather than truncating, and the cell grows to fit it. */
  .deed.row .what { max-width: 100%; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
  .deed.row em { display: block; font-size: 11.5px; line-height: 1.25;
    max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
  .crew { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .crew span { font-size: 14px; color: #6b5d3f; }
  .crew button { font: inherit; font-size: 18px; line-height: 1; width: 34px; height: 34px;
    border: 1px solid #d8d0bf; border-radius: 10px; background: #fdfaf2; }
  .crew button:disabled { color: #c9c1ae; }
  .crew .autoback { width: auto; font-size: 13px; padding: 0 10px; color: #6b6353; }
  .away { margin: 4px 0 8px; font-size: 14px; font-weight: 600; color: #1f6b3a;
    border: 1px solid #cfe2cd; background: #eef5ec; border-radius: 10px; padding: 8px 10px; }
  /* ★ THE BATTLE STRIP — one square left, three right. */
  .strip { display: flex; align-items: center; gap: 8px; margin: 8px 0 4px; }
  .sq { width: 68px; aspect-ratio: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1px; font: inherit;
    border-radius: 12px; border: 1px solid #d8d0bf; background: #fdfaf2; }
  .sq b { font-size: 20px; line-height: 1.1; }
  .sq span { font-size: 11.5px; color: #6b5d3f; font-weight: 600; }
  .sq em { font-style: normal; font-size: 10.5px; color: #8a8172; }
  .sq.us { border-color: #1f6b3a; background: #eef5ec; }
  .sq.us b { color: #1f6b3a; }
  .sq.us.low { border-color: #b3452f; background: #f7e9e5; }
  .sq.us.low b { color: #b3452f; }
  .sq.them b { color: #7a4a2f; }
  .sq.them.aimed { border: 2px solid #7a4a2f; background: #f4ead9; }
  .sq.them.down { opacity: 0.35; }
  .vs { font-size: 13px; color: #8a8172; flex: 1; text-align: center; }
  .vs.hurt { color: #b3452f; font-size: 18px; }
  .windnote { color: #b3452f; font-weight: 600; }
  .verbs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
  .verbs .deed { margin: 0; padding: 8px 10px; }
  .verbs .deed em { font-size: 11px; }
</style>
