<script lang="ts">
  // THE CITY BUILDER'S ONE SCREEN — docs/CITY.md made flesh. Header of
  // numbers, the board, a dock of deeds. NO PROSE: nouns and numbers.
  import { onMount } from 'svelte';
  import Board, { type Dot, type Line, type Spoke } from './Board.svelte';
  import { INK, PAPER, TOL, type InkName } from '../game/ink';
  import type { Box } from '../game/layout';
  import { apply, catchUp, initial, flow, shown, popCap, pathKey, costOf, pathCostOf,
    priceLine, unlayable, unraisable, unassailable, heroHit, spearCost, hunger,
    heroMax, WILD_FED, SITE, GOBLINS, RATE, MAX_GAUGE, CREW, PATH_SECS,
    raisingLeft, buildSecs, housed, blowLeft, spearLabel, SPEAR_MADE, SWEEP_SHARE,
    levyCap, folkName,
    unforageable, nextForay, forageLeft, FORAGE_SECS, onWatch, RAID_SECS,
    unmarchable, marchSecs, onWatchAt, swellOf, spawnOf,
    holdingsLeft,
    richOf, storeCost, roomOf, STORE_ROOM, cartCost, cartHaul, CARRY, CART_GAIN,
    raiders, raidTarget,
    windup, RATION_FOOD, RATION_HP, answerBite, uneatable, MEAL_FOOD, MEAL_HP,
    BOONS, has, RUN_STEP, sawsHere, KILN_SHARE, MEETS, SKILLS, skillOf, nextAt,
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
  /** ★ Dismissed the victory screen to potter on in a valley already won.
   *  Deliberately NOT saved: a won valley greets you again next time you
   *  open it, which is the invitation working. */
  let stayed = $state(false);
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
  /** ★ Throw away every cached copy of the app and come back on the current
   *  one. See the button's own comment for why this exists. Deliberately not
   *  clever: it does not ask whether an update is available, because the
   *  machinery that answers that question is the machinery under suspicion. */
  const freshen = async (): Promise<void> => {
    // The save first, and synchronously as far as this can be — the reload
    // below cancels the 2-second autosave mid-interval otherwise.
    try { save(game); } catch { /* a full disk is not a reason to stay stale */ }
    try {
      const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
      await Promise.all(regs.map((r) => r.unregister()));
    } catch { /* no worker to unregister */ }
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* no cache storage */ }
    // ⚠️ A QUERY STRING, because `location.reload()` is allowed to come back
    // out of the URL cache and this whole button exists because a cache lied.
    location.replace(`${location.pathname}?fresh=${Date.now()}`);
  };

  const act = (a: Parameters<typeof apply>[1]): void => { game = apply(game, a); };

  const f = $derived(flow(game));

  const cap = $derived(popCap(game));
  /** ★ Is this good at the storehouse ceiling? Everything arriving past it
   *  is WASTE, the same law the paths obey — so the chip says so. */
  const brim = (n: number): boolean => n >= roomOf(game) - 1e-9;
  /** How much of the valley is still theirs — the goal, as one number. */
  /** ★ N6: the ink a porter wears for each good. Reuses the board's own
   *  palette rather than inventing four more — `stone` is already the grey
   *  the HUD's stone counter uses, and the rest follow the same logic. */
  const CARGO: Record<string, InkName> = {
    // ⚠️ LOGS ARE NOT GREEN. `edgewood` is the wood's own green and it read as
    // another owned-site dot rolling down the road; `shut` is the amber the
    // board already uses for raw material in motion.
    stone: 'stone', logs: 'shut', planks: 'fill', food: 'open',
  };
  const holdings = $derived(Object.keys(game.goblins).length);

  /** ★★★ TABS — N1, 2026-08-11. The owner: *"I'm missing a tab, hero, so we
   *  need to start building tabs like resources, people, hero, and so on.
   *  Otherwise, it's getting too messy."* And, of the board: *"I think it got
   *  very busy in terms of UI. It is very OCD."*
   *
   *  One scrolling panel was carrying the tapped site, every deed it offers,
   *  the hero, the crew, the watch and the war. Four rooms now. The SITE tab
   *  keeps the map's own business; the others take what was crowding it.
   *
   *  ⚠️ A FIGHT OUTRANKS THE TABS ENTIRELY (below): a battle you cannot see
   *  because you left the tab on People is a lost run. */
  // ★★★ REBUILT 2026-08-11, and the owner diagnosed it themselves: *"Why is
  // people menu and place menu… places are different, right? But people is
  // one menu, hero is one menu, log is one menu. Why is it in the same
  // selection? I don't understand."*
  //
  // They are right, and it was a category error. PLACE is a view of whatever
  // you tapped on the map. TOWN, HERO and LOG are views of the whole camp.
  // Putting them in one tab row said they were four peers, and made "no place
  // selected" impossible to express.
  //
  // Now: the place panel is ALWAYS the panel, and the three town views are
  // SHEETS that rise over it from a dock. Tap the dock button again, or the
  // map, to send a sheet away. This is Fallout Shelter's shape, which the
  // owner loves and named unprompted: tap a room, get that room's card;
  // global views are their own thing entirely.
  type Sheet = 'town' | 'people' | 'hero' | 'log';
  let sheet = $state<Sheet | null>(null);
  const SHEETS: Array<{ id: Sheet; name: string }> = [
    { id: 'town', name: 'Town' },
    { id: 'people', name: 'People' },
    { id: 'hero', name: 'Hero' },
    { id: 'log', name: 'Log' },
  ];
  /** ★★ AND HOW MANY OF THEM YOU CAN ACTUALLY SEE — F6, 2026-08-11. The
   *  owner: *"it's a bit strange that it says five camps left while I can
   *  only see two."* The count was every holding on the map; the board only
   *  draws what the fog has lifted on. A number you cannot reconcile with
   *  what is in front of you is worse than no number. */
  const shownHoldings = $derived(
    shown(game).filter((s) => game.goblins[s.id]).length);
  // (`worst` — the fullest raid and what it was coming for — is gone with the
  //  war line it fed, 2026-08-14. Both facts are drawn on the road now.)
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

  /** ★★★ THE SIX GOODS, RANKED AND DECLARED ONCE — 2026-08-14. Six cells that
   *  used to be four hand-written blocks and a note buried in a sheet. The
   *  order is the PRODUCTION CHAIN, fixed, and never sorted at runtime: a
   *  counter that moves when the game changes is a counter you cannot learn
   *  the position of, and this HUD exists because the owner could not find
   *  things. Food leads because it is the one that kills you.
   *
   *  Each cell says the same three things it always did — the noun, the stock
   *  over the ceiling, and what it is doing per second — so the three states
   *  the HUD comment below insists on (full, starving, the rate) survive the
   *  regrid. `mark` is the marks table, never a second hand-typed icon. */
  const goodCells = $derived<Array<{ id: string; cap: string; mark: string;
    have: number; note: string; state: 'brim' | 'hurt' | null }>>((() => {
    const rate = (n: number): string => n > 0.001 ? `+${n.toFixed(1)}/s` : '—';
    return [
      { id: 'food', cap: 'FOOD', mark: MARK.food, have: game.food,
        state: f.starving ? 'hurt' : brim(game.food) ? 'brim' : null,
        note: f.starving ? 'STARVING' : brim(game.food) ? 'full'
          : `${hunger(game) > 0 ? `−${hunger(game).toFixed(1)}/s` : ''}${
            f.food > 0 ? ` +${f.food.toFixed(1)}/s` : ''}`.trim() || '—' },
      { id: 'stone', cap: 'STONE', mark: MARK.stone, have: game.stone,
        state: brim(game.stone) ? 'brim' : null,
        note: brim(game.stone) ? 'full' : rate(f.stone) },
      { id: 'logs', cap: 'LOGS', mark: MARK.logs, have: game.logs,
        state: brim(game.logs) ? 'brim' : null,
        note: brim(game.logs) ? 'full' : rate(f.logsIn) },
      { id: 'planks', cap: 'PLANKS', mark: MARK.planks, have: game.planks,
        state: brim(game.planks) ? 'brim' : null,
        note: brim(game.planks) ? 'full' : rate(planksNow) },
    ];
  })());

  // ★★ +1 POPS over the camp, NAMED — 2026-08-10 (playtest). The owner:
  // *"I also don't see plus one pop up with the appropriate icon once the
  // resource is mined."* It watched stone alone and floated a bare `+1`, so
  // a town whose planks were climbing and whose stone was not showed
  // nothing at all, and one whose stone was climbing did not say so.
  // Every good is watched now and the float carries that good's mark.
  // The board still throttles to one a second and clears them on a pan.
  // ⚠️ `pops`/`popMark` DELETED 2026-08-11. They fed `<Board pulse=…>`, which
  // stopped being passed the moment the +1 moved onto the resource counters
  // (F3) — so they were still being counted every tick and handed to nobody.
  /** ★ F3: which counters just ticked up, so each can float its own +1. */
  let bumps = $state<Array<{ id: number; good: string }>>([]);
  let bumpId = 0;
  /** ⚠️ A PLAIN MIRROR, NOT THE RUNE. The effect below both reads and writes
   *  the list; reading `bumps` inside it makes the effect depend on its own
   *  output, and Svelte stops running it — the float simply never appeared,
   *  which the browser probe caught. Everything reactive is written, never
   *  read, in there. */
  let recentBumps: Array<{ id: number; good: string }> = [];
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
    for (const [good] of WATCHED) {
      carriedIn[good] = (carriedIn[good] ?? 0) + (rate[good] ?? 0) * dt;
      const w = Math.floor(carriedIn[good]!);
      if (w > (lastWhole[good] ?? 0)) {
        // ★★★ F3, 2026-08-11 — the owner: *"plus one above the camp does not
        // correspond to the dots arriving there. And also the plus one —
        // maybe it should be in the top where the resource counters are."*
        // The float and the carrier dots are two animations that will never
        // line up frame by frame, however carefully their FREQUENCY is
        // matched. Their own suggestion is the fix: put it where the number
        // it is about actually changes.
        bumpId += 1;
        recentBumps = [...recentBumps.filter((b) => b.good !== good),
          { id: bumpId, good }].slice(-4);
        bumps = recentBumps;
      }
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
          // ★★★ F7 (2026-08-11): the two directions, kept apart. `carrying`
          // is the traffic ALONG a→b; `back` is what comes the other way.
          // `f.both` is keyed on the edge, so both are read the same way and
          // flipped together when this site is the far end of the key.
          rate: s.id < n ? (f.both.get(key)?.ab ?? 0) : (f.both.get(key)?.ba ?? 0),
          back: s.id < n ? (f.both.get(key)?.ba ?? 0) : (f.both.get(key)?.ab ?? 0),
          // ★ N6: each file of porters wears the good it is carrying.
          ink: CARGO[(s.id < n ? f.goods.get(key)?.ab : f.goods.get(key)?.ba) ?? 'stone'],
          backInk: CARGO[(s.id < n ? f.goods.get(key)?.ba : f.goods.get(key)?.ab) ?? 'stone'],
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
    // ⚠️ THE WARD RING IS GONE, 2026-08-11. The owner, playing the valley
    // through: *"so barrier doesn't serve any function."* It drew a dashed
    // outline around the ground you hold — which the dots already say, in
    // colour, individually — so it was a second answer to a question nobody
    // had asked, in the one ink on the board with no other job. `pts` is
    // still computed above because the muster marks want the same hull.
    return [
      ...musterShapes(),
      ...ambushShapes(),
      ...CAMP_SHAPES,
    ];
  })());

  /** ★★★ THE WAR, DRAWN — step 3 of `docs/RAIDS.md`, 2026-08-10, rebuilt as
   *  **the fuse** 2026-08-14. The owner, playing the valley through:
   *  *"there is no clear visual indicator that they are attacking on a
   *  path"*, and of the war line in the top strip: *"this is a stats menu.
   *  Why is it there?"* So the war moved onto the board, where the war is.
   *
   *  Three marks, all canvas-side, all on the road the raid will actually
   *  walk (`raidTarget` only ever picks a NEIGHBOUR, so it is one segment):
   *
   *  - **the cord** — the whole run, faint and dotted, from the first spark.
   *    It says *this road is the one they will come down*, which is the part
   *    that was missing: the old line waited until half full to appear, so
   *    the first half of every raid was invisible.
   *  - **the fuse** — a solid burn from the holding covering `m` of the run,
   *    with a head at the tip. How close the raid is, drawn at full length
   *    on the ground it threatens instead of as a percentage in a strip.
   *  - **the reticle** — a ring on what it is coming FOR, thickening as the
   *    fuse nears and doubling in the last fifteen percent. Green, in the
   *    hero's own ink, when the ground is held: that is not a warning any
   *    more, it is a statement that something is standing there.
   *
   *  ⚠️ NO SWEPT ARC ON THE HOLDING ANY MORE. It said the same 0→1 the fuse
   *  now says, beside a dot that ALSO swells with menace (`r` in `dots`) —
   *  three drawings of one number on one dot. The fuse is the one that says
   *  *at what*, so it is the one that stayed.
   *
   *  ⚠️ THE INK IS `foe`, NOT A FOURTH RED. `docs/RAIDS.md` warns that a new
   *  red must be measured against every counted ink AND against `foe` under
   *  colour blindness before a line of it is drawn. `foe` already means
   *  "held against you", is already measured in `test/palette.test.ts`, and
   *  the fuse is told apart by WHERE IT ENDS, not by hue. */
  function musterShapes(): Shape[] {
    if (game.lost) return [];
    const out: Shape[] = [];
    /** Worst menace aimed at each of our sites, so two raiders coming for one
     *  field draw one reticle rather than two rings of different weight. */
    const aimed = new Map<number, number>();
    for (const id of raiders(game)) {
      const m = Math.min(1, game.menace[id] ?? 0);
      const from = SITE.get(id);
      if (!from || m <= 0) continue;
      const t = raidTarget(game, id);
      const to = t === null ? null : SITE.get(t);
      if (t === null || !to) continue;
      aimed.set(t, Math.max(aimed.get(t) ?? 0, m));
      const held = onWatchAt(game, t);
      // The cord: the whole road, always, once anything is gathering at all.
      out.push({ s: 'path', pts: [{ x: from.x, y: from.y }, { x: to.x, y: to.y }],
        ink: 'foe', w: 1.6, dash: [4, 7], alpha: 0.3 });
      // The fuse: burning from the holding towards the prize.
      const hx = from.x + (to.x - from.x) * m;
      const hy = from.y + (to.y - from.y) * m;
      // ⚠️ DIM WHEN THE HERO IS THERE, never hidden. A raid the hero stands
      // in front of is still gathering, and hiding the fuse would make
      // holding a gate look like it stopped the clock. It does not.
      out.push({ s: 'path', pts: [{ x: from.x, y: from.y }, { x: hx, y: hy }],
        ink: 'foe', w: 3.2, alpha: held ? 0.55 : 0.9 });
      out.push({ s: 'disc', x: hx, y: hy, r: 3.4, ink: 'foe', alpha: held ? 0.6 : 1 });
    }
    for (const [t, m] of aimed) {
      const to = SITE.get(t);
      if (!to) continue;
      const held = onWatchAt(game, t);
      // A circle of points, because `Shape` has no arc and this is one.
      const ring = (r: number, w: number, alpha: number): Shape => ({
        s: 'path', close: true, ink: held ? 'open' : 'foe', w, alpha,
        pts: Array.from({ length: 25 }, (_, i) => {
          const a = (i / 24) * Math.PI * 2;
          return { x: to.x + Math.cos(a) * r, y: to.y + Math.sin(a) * r };
        }),
      });
      out.push(ring(11, 1.4 + 2.2 * m, 0.35 + 0.6 * m));
      // The last stretch gets a second ring — a discrete change of shape, not
      // a blink. Nothing on this board animates that a thumb has to hit.
      if (m >= 0.85) out.push(ring(15, 1.6, held ? 0.5 : 0.85));
    }
    return out;
  }

  /** ★ CAUGHT IN THE OPEN, ON THE BOARD — 2026-08-14. An ambush is the one
   *  piece of war news that is not about a place, so it was the one thing
   *  the top strip could still claim. It is about a place: it is about the
   *  stretch of road the hero is standing on. Two rings round the figure,
   *  and the figure is already drawn there. */
  function ambushShapes(): Shape[] {
    if (game.ambush === null || heroAt === null) return [];
    const at = heroAt;
    const ring = (r: number, alpha: number): Shape => ({
      s: 'path', close: true, ink: 'foe', w: 2.4, alpha,
      pts: Array.from({ length: 25 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return { x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r };
      }),
    });
    return [ring(10, 0.9), ring(15, 0.5)];
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


  /** ★★ THE HERO'S OWN DEEDS (N1) — the two that are about the person rather
   *  than about a place, so they belong on the Hero tab and not in the middle
   *  of the camp's building list. Marching stays with the PLACE you are
   *  marching to, because that is the thing you are choosing. */
  function heroDeeds(): Deed[] {
    const out: Deed[] = [];
    const eat = uneatable(game);
    out.push({
      label: 'Feed the hero',
      note: eat ?? `${amount('food', MEAL_FOOD)} → ${MARK.hero}+${MEAL_HP}`,
      why: eat,
      go: () => act({ type: 'eat' }),
    });
    const fw = unforageable(game);
    const next = nextForay(game);
    const left = forageLeft(game);
    out.push({
      label: left !== null ? 'Foraging…' : 'Send the hero out',
      note: left !== null
        ? `${MARK.time}${Math.ceil(left)}s · ${next.name}`
        : (fw ?? `${MARK.time}${FORAGE_SECS}s → ${price(next.loot)} · ${next.name}`),
      why: fw,
      go: () => act({ type: 'forage' }),
    });
    return out;
  }
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
        // ★ WAS "Stand at Tall Pines" — the owner: *"it's a weird choice of
        // words."* It pairs with "March on X" for an attack now, so the two
        // deeds that move the hero read as the same kind of thing.
        label: `March to ${s.name}`,
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
    // ★ AND IT DISAPPEARS ONCE IT STANDS (2026-08-11). Leaving it on screen
    // as a permanently-refused card — "Build Quarry · one works per place" —
    // is a dead button explaining itself forever, which is worse than the
    // stacking it replaced. Hiring takes its place below.
    if (s.id === 0 || have <= 0) {
    out.push({
      // ★ ONE WORKS PER PLACE (2026-08-11), so this deed only ever raises the
      // FIRST one and the count in the label had nothing left to count.
      label: s.id === 0 ? `Hut ×${have + 1}` : `Build ${KIND_NAME[s.allows]}`,
      note: (why ?? `${price(costOf(s.allows, have))} `
        + `${MARK.time}${buildSecs(game, s.id)}s`)
        + (have > 0 ? ` · ${times(have)} built` : ''),
      why,
      go: () => act({ type: 'raise', id: s.id }),
    });
    }
    // ★★★ THE KILN (blueprint) — a wood camp may saw its own planks instead
    // of felling logs. The decision is ROUTING: planks at the source need no
    // road to a mill, but a camp that saws is a camp not feeding the mill you
    // already built. One good, two recipes; no fifth noun anywhere.
    if (has(game, 'kiln') && s.allows === 'lumber' && have > 0 && !game.goblins[s.id]) {
      const on = sawsHere(game, s.id);
      out.push({
        label: on ? 'Haul the logs out' : 'Saw them here',
        note: on
          ? `${MARK.logs}${(CREW * RATE.lumber).toFixed(2)}/s to the mill`
          : `${MARK.planks}${(CREW * RATE.lumber * KILN_SHARE).toFixed(2)}/s straight to the camp`,
        why: null,
        go: () => act({ type: 'burn', id: s.id }),
      });
    }
    // ⚠️ THE HIRE DEED IS GONE, 2026-08-11, one day after it shipped. The
    // owner, reading it in play: *"Where from? This is a valley, and there is
    // no extra people there except goblin captives. Where are we hiring hands
    // from? This shouldn't be here."* And: *"Is it gonna increase my maximum
    // there? Why? It is a weird solution."*
    //
    // Both halves were right. It read as conjuring people out of nothing, and
    // what it actually did — raise a cap — was invisible until you were
    // already standing at that cap. Worse, it was priced in FOOD, so the one
    // deed a starving town was offered took food away from it: half of the
    // dead end in F0. `hire` stays in the engine and on the save so nobody's
    // existing crews vanish; nothing sells it any more. One works, one crew.
    // ⚠️ THE TOWN'S OWN DEEDS MOVED OUT, 2026-08-11 — see `townDeeds()`.
    // They were nested inside the PLACE inspector under `if (s.id === 0)`,
    // so the storehouse, the carts, the forge and the armoury were only
    // reachable by tapping one particular dot on the map. They are about the
    // town, not about that dot. This is the same category error the owner
    // named in the tabs: *"places are different, right? But people is one
    // menu, hero is one menu... why is it in the same selection?"*
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
          + ` → ${(CARRY * cartHaul(game)).toFixed(1)}/s · ${MARK.time}shorter marches`,
        why: w,
        go: () => act({ type: 'lay', a: s.id, b: n }),
      });
    }
    return out;
  })());

  /** ★★★ THE FIGHT'S OWN DEEDS — 2026-08-16, `docs/BRIEF.md` item 7: *"your
   *  dot pokes their dot… combat is graph-native, NOT A SEPARATE SCREEN."*
   *  It had become a JRPG panel: a strip of squares and a grid of buttons at
   *  the bottom of the phone, with the board sitting inert above it during
   *  the one moment the game is most about a place. The verbs hang off the
   *  CONTESTED NODE now, on the same stalks every other deed uses, so a fight
   *  happens ON the ground it is a fight over.
   *  ⚠️ THE STRIP STAYS. It is the READOUT — who is standing, how hurt, what
   *  answer is coming — and a readout is not an interaction. What moved onto
   *  the graph is the part where you decide something. */
  const fightVerbs = $derived<Deed[]>((() => {
    const fi = game.fight;
    if (!fi) return [];
    const mid = blowLeft(game) !== null;
    const aim = fi.target ?? 0;
    const out: Deed[] = [
      { label: 'Attack', note: `${heroHit(game)} into the ${fi.sq[aim]?.kind ?? 'line'}`,
        why: mid ? 'mid-swing' : null, go: () => act({ type: 'strike' }) },
      { label: 'Sweep',
        note: `${Math.max(1, Math.floor(heroHit(game) * SWEEP_SHARE))} into each of `
          + `${fi.sq.filter((q) => q.hp > 0).length}`,
        why: mid ? 'mid-swing' : null, go: () => act({ type: 'sweep' }) },
    ];
    if (has(game, 'volley')) {
      out.push({ label: 'Volley', note: `${heroHit(game)} past the wall`,
        why: mid ? 'mid-swing' : null, go: () => act({ type: 'volley' }) });
    }
    out.push({ label: 'Guard', note: 'block their whole answer',
      why: mid ? 'mid-swing' : null, go: () => act({ type: 'guard' }) });
    out.push({ label: `Rations ×${fi.packs}`,
      note: `${RATION_FOOD} food → +${RATION_HP} hero`,
      why: mid ? 'mid-swing' : fi.packs <= 0 ? 'No packs left.'
        : game.food < RATION_FOOD ? 'No food for it.' : null,
      go: () => act({ type: 'ration' }) });
    // ⚠️ FALL BACK KEEPS ITS BUTTON MID-SWING ON PURPOSE — a safety valve you
    // have to wait for is not a safety valve.
    out.push({ label: 'Fall back', note: 'home — the ground keeps its wounds',
      why: null, go: () => act({ type: 'flee' }) });
    return out;
  })());

  const fireSpoke = (id: string): void => {
    const [what, n] = id.split(':');
    const d = (what === 'fight' ? fightVerbs : deeds)[Number(n)];
    if (d && d.why === null) d.go();
  };

  /** ★★★ THE PICKED PLACE'S DEEDS, ON THE GRAPH — 2026-08-16, brief item 5.
   *
   *  ⚠️ THE SAME `deeds` THE PANEL USED, deliberately: this is a change of
   *  WHERE the game is touched, not of what it offers, and duplicating the
   *  list into a second derivation is how two surfaces come to disagree
   *  about what you can do. One list, drawn somewhere truer.
   *
   *  ⚠️ AND ONLY WHEN NO SHEET IS OPEN. The sheets rise OVER the board; deeds
   *  blooming under a sheet you are reading would be furniture arguing with
   *  furniture. */
  const spokes = $derived<Spoke[]>(
    game.fight
      // ★ A FIGHT OWNS THE GRAPH while it lasts, and it hangs off the ground
      // being fought over — never off whatever you last tapped.
      ? fightVerbs.map((d, i) => ({
          id: `fight:${i}`, parent: siteId(game.fight!.site),
          label: d.label, note: d.note, off: d.why !== null }))
      : (sheet === null && picked !== null && SITE.has(picked))
        ? deeds.map((d, i) => ({
            id: `${picked}:${i}`, parent: siteId(picked!),
            label: d.label, note: d.note, off: d.why !== null }))
        : []);

  /** ★★★ THE TOWN'S OWN DEEDS — 2026-08-11. Everything you build for the
   *  whole camp rather than for one place on the map: the storehouse, the
   *  carts, the forge, the armoury, the foray. Lifted out of the place
   *  inspector, where they were reachable only by tapping the camp's dot. */
  const townDeeds = $derived<Deed[]>((() => {
    const s = SITE.get(0)!;
    const out: Deed[] = [];
      // ⚠️ FEED THE HERO LIVES ON THE HERO TAB ONLY, since 2026-08-11.
      // Adding the tabs DUPLICATED this deed rather than moving it, so the
      // same button sat in two places at once depending on which tab you were
      // on — part of what "the things are in random places" was describing.
      // It is about the person, not the place.
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
      // ★★★ MORE HANDS ON THE WORKS — 2026-08-11, the half of the owner's
      // ask that did not ship with the one-works cap: *"we should limit the
      // number to one per location. And then we should allow to add more
      // people there."* Priced in food and climbing 1.6^n, so deepening
      // stays worse than walking out and taking somewhere new — which is the
      // complaint that started the whole item.
      // ★ THE STOREHOUSE, beside the huts — room for every good, and the
      // only thing standing between the town and the top of either ladder.
      const sp = storeCost(game.store);
      const noRoom = game.stone < sp.stone || game.planks < sp.planks;
      out.push({
        label: `Storehouse ×${game.store + 1}`,
        note: `${price(sp)} → ${MARK.room}${roomOf(game) + STORE_ROOM}`
          + (game.store > 0 ? ` · ${times(game.store)} built` : ''),
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
      // ★ LOGS TOO SINCE 2026-08-11 — a cart eats all three goods now, and a
      // deed that checks two of them offers a purchase it cannot make.
      const noCart = game.stone < cp.stone || game.logs < cp.logs
        || game.planks < cp.planks;
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
          // ★ WHAT WOULD ACTUALLY STOP IT. This said "home turns one away",
          // which stopped being true when the watch became positional. Since
          // 2026-08-15 the hero is the ONLY thing that turns a raid back.
          + ` · ${at !== null && onWatchAt(game, at)
            ? `${MARK.hero} the hero holds it`
            : `nothing is holding ${SITE.get(at ?? -1)?.name ?? 'it'}`}`
        : '';
      // ★★★ F9, 2026-08-11 — the owner, tapping the deepest holding: *"the
      // description of Goblin Knoll is absolutely crazy. Goblins hold it,
      // forty eight strong, points, forty five second, etcetera. Completely
      // not understood."* One line was carrying five separate facts: who
      // holds it, how strong, what it is worth, how full its raid clock is,
      // and whether anything of yours would stop it. Split, one fact a line,
      // in `statusLines` below — the panel gives each its own row.
      // ★★★ THE SWELL MOVED HERE, 2026-08-14, off the top strip — where the
      // owner met it as *"a stupid thing to have"* in a stats menu. It is
      // not a stat about the valley, it is the reason THIS number is bigger
      // than it was: `spawnOf` refills a camp to a ceiling that rises with
      // the clock, so "48 strong" already IS the swell. Said beside it, the
      // number has a cause; said in the header, it was a percentage of
      // nothing in particular.
      const grown = swellOf(game) > 0.02
        ? ` · ${MARK.waste}+${Math.round(swellOf(game) * 100)}% stronger than at first light` : '';
      return `goblins hold it · ${MARK.danger}${Math.ceil(game.goblins[picked] ?? 0)} strong`
        + grown + prizeOf(picked) + clock;
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

  /** ★★ THE PANEL'S ROWS. One fact a row — see F9 above. The single `status`
   *  string is still built (the away-line and the probe both read it), and
   *  this is where it is broken up for the eye. */
  const statusLines = $derived(status.split(' · ').reduce<string[]>((rows, part) => {
    const p = part.trim();
    if (!p) return rows;
    // Keep a fact and its number together: a row that is only a number is
    // the same unreadable run in smaller pieces.
    const last = rows[rows.length - 1];
    // ⚠️ ONLY BARE NUMBERS MERGE UP. "every 300s" and "takes 1 building" were
    // folded in at first and rebuilt the same unreadable run one row down.
    if (last !== undefined && /^\d+(\.\d+)?$/.test(p.split(' ')[0] ?? '')
      && !/^(every|takes)\b/.test(p)) {
      rows[rows.length - 1] = `${last} · ${p}`;
      return rows;
    }
    rows.push(p);
    return rows;
  }, []));


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
    // ★ TAPPING THE MAP PUTS THE SHEET AWAY (2026-08-11). The owner asked for
    // the map back with one gesture; choosing a place IS that gesture, since
    // the place panel is what lives under every sheet.
    sheet = null;
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
    // ★★★ THE CHROME'S PALETTE AND TYPE SCALE, WRITTEN ONCE (2026-08-15).
    // ⚠️ FROM THE TYPESCRIPT, NEVER TYPED INTO THE CSS. This is the same
    // rule `src/game/ink.ts` was created for and the same failure it was
    // created by: a colour that lives in two files drifts, and the check
    // that watches it goes on passing while it does. The stylesheet below
    // holds no hex at all — `test/look.test.ts` fails if one returns.
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(PAPER)) root.setProperty(`--${k}`, v);
    // Eight steps, and the gaps get smaller as they get smaller — the same
    // shape every type scale has, because the eye reads a 2px difference at
    // 11px and does not at 21px.
    const STEPS = [26, 21, 18, 15, 13, 12, 11, 10];
    STEPS.forEach((px, i) => root.setProperty(`--t${i + 1}`, `${px}px`));
    // Two radii and a hairline, so nothing has to guess.
    root.setProperty('--r1', '8px');
    root.setProperty('--r2', '12px');

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
  {#if !game.lost && !stayed && holdingsLeft(game) === 0}
    <!-- ★★★ THE VICTORY SCREEN, 2026-08-11. Two research agents independently
         called its absence the single biggest defect in the game: `found`
         refused unless you had LOST, so a player who took the whole valley
         sat on a finished map with nothing left to press. The owner: *"so the
         valley is yours, and I guess that's it."* Exactly that.
         ⚠️ It does NOT block the board — you may keep pottering in a valley
         you have won. It is an invitation, not a wall, which is the
         difference between this and the lost screen below. -->
    <!-- ⚠️ A BANNER, NOT A TAKEOVER. `.gone` is `position: fixed; inset: 0`,
         which is right for a LOSS — there is nothing left to do in a valley
         you have been driven out of. A valley you have WON still works, and
         covering it was a wall pretending to be an invitation. The browser
         probe caught it: a phase that seeds a cleared valley suddenly could
         not tap the board at all. -->
    <div class="wonbar">
      <h1>THE VALLEY IS YOURS</h1>
      <p class="note">0 goblin camps · {MARK.people}{Math.floor(game.pop)} living here
        · {MARK.time}{Math.round(game.since / 60)} minutes</p>
      <p class="note">there is more country beyond the ridge, and it is
        {Math.round(RUN_STEP * 100)}% harder for every valley you have taken</p>
      {#if game.boons.length > 0}
        <p class="note">{MARK.people}you carry what you learned here:
          {game.boons.map((id) => BOONS.find((b) => b.id === id)?.name ?? id).join(' · ')}</p>
      {/if}
      <button class="deed row big" onclick={() => act({ type: 'found' })}>
        <span class="what">March on, found the next valley</span>
        <em>{MARK.hero}{Math.max(game.legacy.spears, game.hero.spears + 1)} carried
          · run {game.legacy.runs + 1}</em>
      </button>
      <button class="deed row" onclick={() => (stayed = true)}>
        <span class="what">Stay a while</span>
        <em>the valley is not going anywhere</em>
      </button>
    </div>
  {/if}
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
    <div class="hud goods">
      <!-- ★★★ ALL SIX GOODS, ONE GRID — 2026-08-14, step 3 of the restructure.
           The camp gained coal and tools and the HUD did not: four goods sat
           across the top and the other two were a `<p class="note">` inside
           the Town sheet, so the two NEWEST rungs of the chain were the two
           you could not see. Planks pinned, coal exiled.

           Two columns, so a good's place never depends on how the game is
           going. ⚠️ EVERY CELL CARRIES ITS NOUN: an emoji is a decoration on
           a word and never a replacement for it (the owner, twice).
           ★★★ AND THEREFORE NO MARK ON THE RATE, 2026-08-15. The cell is
           captioned FOOD and then said `🌾−0.1/s` underneath it — the same
           rule read the other way. A mark earns its place where there is no
           room for the word (a price line, a square in the strip) and is
           decoration anywhere the word is already on screen. Four full-colour
           emoji left the top of the board this way, which is most of why the
           header stopped looking like a different app from the map. -->
      {#each goodCells as g (g.id)}
        <div class="cell" class:brim={g.state === 'brim'} class:hurt={g.state === 'hurt'}
          data-q={g.id}>
          {#each bumps.filter((b) => b.good === g.id) as b (b.id)}
            <span class="bump"
              onanimationend={() => {
                recentBumps = recentBumps.filter((x) => x.id !== b.id);
                bumps = recentBumps;
              }}
              >+1</span>
          {/each}
          <span class="cap">{g.cap}</span>
          <b>{Math.floor(g.have)}<span class="cap-of">/{roomOf(game)}</span></b>
          <em>{g.note}</em>
        </div>
      {/each}
    </div>
    <div class="hud standings">
      <span class="cell" class:lv={game.pop < cap} data-q="people"
        aria-label="people">{MARK.people} {Math.floor(game.pop)}/{cap}</span>
      <span class="cell" class:brim={game.pop >= cap} data-q="huts"
        aria-label="huts">{MARK.huts} {game.pop >= cap ? 'full' : `×${game.stacks[0] ?? 0}`}</span>
      <!-- ★★★ THE HERO, THE SPEARS AND THE CARTS LEFT THIS ROW, 2026-08-15.
           The owner, on the rebuilt HUD: *"ten out of ten, why is it even
           there and not on the hero panel? And what spears and carts, why
           are they different from the other resources?"* Both halves are
           right. Hero hit points and a spear count are not stocks, they were
           sitting in a strip of stocks, and there is a HERO SHEET one tap
           away that is about exactly them. Carts went to the Town sheet,
           beside the deed that buys them.
           *(The words `hero` and `carts` are kept on those surfaces: they
           were added in 2026-08-11 because the crossed swords and the cart
           wheel were asked about twice and never answered, and an emoji is a
           decoration on a word, never a replacement for it.)* -->
      <!-- ★ THE GOAL COMES UP ONTO THIS ROW, so the header is two blocks
           instead of four. It is the same sentence it was on its own line. -->
      <!-- ⚠️ `shownHoldings`, NOT `holdings` (2026-08-11). An earlier version
           tested every camp on the map and then printed the count the FOG
           allows, so a valley whose camps were all still hidden announced
           "0 goblin camps" while the branch that exists to say the valley is
           yours sat unreached below it. Found by an audit, not by play.
           ★ The ambush takes this cell while it lasts: it is the one piece of
           war news that HAPPENED rather than standing, and it clears itself
           after twelve seconds. -->
      <span class="cell goal" class:hurt={game.ambush !== null} data-q="war"
        >{game.ambush !== null
          ? `${MARK.waste}ambushed on the road · ${MARK.hero}${game.hero.hp}/${heroMax(game)}`
          : shownHoldings > 0
            ? `${shownHoldings} goblin camps left`
            : 'the valley is yours'}</span>
      <!-- ⚠️ THE GEAR LIVES IN THIS ROW, not pinned over the top corner. It
           was absolute, and it sat on the FOOD column and clipped its label
           to "FOO" — caught in the first screenshot. A trailing `auto`
           column cannot overlap anything. -->
      <button class="reset gear" onclick={() => (menu = !menu)}>{menu ? 'Close' : '⋯'}</button>
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
      <!-- ★★★ THE ESCAPE HATCH, 2026-08-15. The owner, for the THIRD time:
           *"i don't see anything new live."* The deploy was green and the
           server was serving the right build both times before, and the
           comment in `src/main.ts` names the two causes already found (a dead
           CI job, then a worker that only ever looked for an update at page
           load). This is the admission that the diagnosis cannot be done from
           here: the phone is the only place the stale copy exists, and it is
           the one place there is no console.

           So: one tap that throws away every cached copy and comes back on
           the current one. It unregisters the workers, empties the caches and
           reloads past the URL cache. THE SAVE IS NOT TOUCHED — it lives in
           localStorage, and it is flushed to disk first, because a reload
           that ate an hour of play to fix a stale button would be worse than
           the stale button. -->
      <button class="reset porter" onclick={freshen}>Get the latest build</button>
      <span class="keep build" data-q="build">build {__BUILD_ID__}</span>
    </div>
    {/if}
  </header>

  {#if ready}
    <div class="map">
      <!-- ⚠️ NO `pulse` ANY MORE (F3, 2026-08-11). The +1 used to float over
           the camp and never lined up with the porters arriving there; it now
           rises out of the resource counter that actually changed, at the
           owner's own suggestion. Leaving both would be the clutter F10 is
           about. -->
      <Board {dots} {lines} {box} label="city" onTap={doTap} drag={false}
        decor={scene} mark={heroMark} {spokes} onSpoke={fireSpoke} />
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
        <h2 data-q="title">{nameOf(fi.site)} · goblins</h2>
        <div class="strip">
          <div class="sq us" class:low={game.hero.hp <= 3}>
            <b>{game.hero.hp}</b>
            <span>hero</span>
            <em>hits {heroHit(game)}</em>
          </div>
          <!-- ★ OUR LINE: the levy stands between the hero and the answer. -->
          {#each fi.us ?? [] as u, i (i)}
            <!-- ★★★ THE MUSTER ROLL, 2026-08-11 — stolen from Fallout
                 Shelter, which the owner loves. What that game actually does
                 is make you feel a LOSS: "3 came home hurt" is a decrement,
                 "Mira was carried home" is a debt. The name is the whole
                 trick, and it is free.
                 ⚠️ COSMETIC BY LAW. The levy squares must stay
                 mathematically interchangeable — the fight solver's memo key
                 is the multiset of square health, so a name may never become
                 a number. -->
            <div class="sq us levy" class:down={u.hp <= 0}>
              <b>{Math.ceil(u.hp)}</b>
              <span>{folkName(fi.site, i, game.taken)}</span>
              <em>{u.hp > 0 ? 'levy' : 'carried'}</em>
            </div>
          {/each}
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
          <!-- ★★★ THE WAIT SAYS SOMETHING NOW, 2026-08-11 — the owner: *"if
               it takes time, then something happens. Something fun should
               happen during that time, which it takes."* It was a number
               counting down beside the name of the thing you had already
               chosen. It now spends the second telling you what is coming
               back, and shouting when the line is winding up — which is the
               one moment Guard is the right answer. -->
          <p class="note swinging" class:windup={windup(fi.round)}>
            {MARK.time}{(blowLeft(game) ?? 0).toFixed(1)}s · {game.fight?.blow?.act ?? ''}
            {#if game.fight?.blow?.act === 'guard'}
              · {MARK.bite}0 blocked
            {:else}
              · {MARK.bite}{answerBite(game)} coming back
            {/if}
            {#if windup(fi.round)} · {MARK.waste}they wind up{/if}
          </p>
        {/if}
        <!-- ★★★ THE VERB GRID LEFT THIS PANEL, 2026-08-16 — it is on the
             board, hanging off the ground being fought over (brief item 7).
             What stays here is the STRIP above: who is standing, how hurt
             they are, and what answer is coming. A readout, not a screen. -->
      {/if}

      {#if !game.fight && game.meet !== null}
        <!-- ★★★ N5, 2026-08-11 — the owner: *"I feel like we would benefit
             from choose your own adventure events."* It sits above the tabs
             because it is the one thing on screen that is asking you
             something. ⚠️ AND IT NEVER NAGS: the foray already paid its own
             loot, this waits as long as you like, and ignoring it costs
             nothing but the thing you did not take (`CLAUDE.md` — HITL is
             never mandatory). -->
        {@const m = MEETS[game.meet]}
        {#if m}
          <div class="meet">
            <h2>{m.name}</h2>
            <p class="tale">{m.text}</p>
            <div class="dock">
              {#each m.ways as w, i (i)}
                <button class="deed" onclick={() => act({ type: 'answer', way: i === 1 ? 1 : 0 })}>
                  {w.take}
                  <em>{[
                    ...Object.entries(w.loot ?? {}).map(([k, v]) =>
                      `${(v as number) > 0 ? '+' : ''}${v as number} ${k}`),
                    ...(w.pop ? [`${w.pop > 0 ? '+' : ''}${w.pop} people`] : []),
                    ...(w.hp ? [`${w.hp} hero`] : []),
                  ].join(' · ')}</em>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
      {#if !game.fight && sheet === 'town'}
        <!-- ★★★ THE TOWN SHEET, 2026-08-11 — everything you build for the
             whole camp. These deeds used to live inside the PLACE inspector,
             reachable only by tapping one particular dot on the map. -->
        <h2>The town</h2>
        <!-- ★ THE CARTS CAME OFF THE TOP STRIP TOO, and they belong beside the
             deed that buys them rather than in a strip of stocks. -->
        <p class="note">carts {game.carts} · {MARK.people}{Math.floor(game.pop)} of {cap} housed</p>
        <!-- ⚠️ `.deeds`, not `.dock`. `.dock` has no grid rules in this
             component, so the buttons stacked one per row at whatever height
             they liked — the browser probe caught it as "one column of 5" and
             "the deed floor is 0px". The Hero sheet had the same bug and got
             away with it because it holds two buttons. -->
        <div class="deeds">
          {#each townDeeds as d (d.label)}
            <!-- ⚠️ `deed row`, not `deed`. The 44px thumb floor and the
                 two-column sizing both hang off `.row`; without it the
                 buttons were 0px-floored and full width. The probe reads the
                 computed `min-height`, which is why it caught this. -->
            <!-- ⚠️ `disabled`, NOT `class:cant` — 2026-08-15. This emitted a
                 `cant` class and THERE IS NO `.cant` RULE IN THIS
                 STYLESHEET, so every town deed you could not afford drew
                 exactly like one you could and then did nothing when tapped.
                 The owner: *"all of these are highlighted as if they are
                 available to me, but they are not."* Mine, from `a808387`.
                 The place panel below has always used `disabled`, which is
                 what `.deed:disabled` is styled for. -->
            <button class="deed row" disabled={d.why !== null} onclick={d.go}>
              <span class="what">{d.label}</span><em>{d.note}</em>
            </button>
          {/each}
        </div>
      {:else if !game.fight && sheet === 'people'}
        <!-- ★ PEOPLE: where everyone is, and the two jobs that are not
             "stand at a workface" — the watch, and the walk. -->
        <h2>People</h2>
        <p class="note">{MARK.people}{Math.floor(game.pop)} of {cap} housed
          · {(f.staff * 100).toFixed(0)}% of the works manned</p>
        <p class="note">{MARK.food}{f.food.toFixed(1)}/s brought in
          · {hunger(game).toFixed(1)}/s eaten</p>
        {#each shown(game).filter((s) => (game.stacks[s.id] ?? 0) > 0) as s (s.id)}
          <p class="note">{s.name} · {(f.hands.get(s.id) ?? 0)} working</p>
        {/each}
        <!-- ★★★ WHAT THE TOWN HAS LEARNED BY DOING — 2026-08-16, brief item
             2, the last of the ten load-bearing things to be built. It sits
             on PEOPLE because that is whose hands got better, and because
             this sheet held four lines and 300px of empty parchment.
             ⚠️ THE BAR IS THE POINT. A level with no visible distance to the
             next one is a number that changes while you are looking away and
             means nothing when you look back. -->
        <h2>Trades</h2>
        {#each SKILLS as k (k)}
          {@const lv = skillOf(game, k)}
          {@const have = game.xp[k] ?? 0}
          {@const from = lv < 2 ? 0 : nextAt(lv - 1)}
          {@const to = nextAt(lv)}
          <div class="skill">
            <span class="nm">{k}</span>
            <span class="lv">{lv}</span>
            <span class="bar"><i style="width:{Math.max(0, Math.min(100,
              ((have - from) / Math.max(1, to - from)) * 100)).toFixed(0)}%"></i></span>
          </div>
        {/each}
        {#if game.boons.length > 0}
          <h2>Blueprints</h2>
          {#each game.boons as id (id)}
            {@const b = BOONS.find((x) => x.id === id)}
            {#if b}<p class="note">{b.name} — {b.what}</p>{/if}
          {/each}
        {/if}
      {:else if !game.fight && sheet === 'hero'}
        <h2>The hero</h2>
        <!-- ★ THESE TWO CAME OFF THE TOP STRIP, 2026-08-15 (the owner: *"why
             is it even there and not on the hero panel?"*). They keep their
             WORDS: the crossed swords were asked about twice and never
             answered until the word went in. -->
        <p class="note" data-q="hero">hero {game.hero.hp} of {heroMax(game)}
          · {spearLabel(game.hero.spears).toLowerCase()}</p>
        <p class="note">{game.hero.trip
          ? `on the road to ${SITE.get(game.hero.trip.to)?.name ?? ''} · ${MARK.time}${Math.ceil(game.hero.trip.left)}s`
          : `standing at ${SITE.get(game.hero.at)?.name ?? ''}`}</p>
        {#if game.forage}
          <p class="note">out foraging · {MARK.time}{Math.ceil(forageLeft(game) ?? 0)}s</p>
        {/if}
        <!-- ★★★ THE LEVY, 2026-08-11 — the owner's open fork, answered as
             hero AND party. Townsfolk march in front of the hero and take the
             answer first, so bringing bodies is what keeps the hero standing
             on round nine. They are the same people the works are staffed
             from: this is the third buyer of a person, after the workface and
             the watch, and it is why population is finally worth having. -->
        <div class="crew">
          <button onclick={() => act({ type: 'levy', by: -1 })}
            disabled={game.levy <= 0}>−</button>
          <span>{game.levy} march with the hero · {levyCap(game)} spare</span>
          <button onclick={() => act({ type: 'levy', by: 1 })}
            disabled={game.levy >= levyCap(game)}>+</button>
        </div>
        {#if game.hurt >= 1}
          <p class="note">{MARK.bite}{Math.floor(game.hurt)} mending — off the
            workfaces until they are well</p>
        {/if}
        <div class="deeds">
          {#each heroDeeds() as d (d.label)}
            <button class="deed row" class:cant={d.why !== null} onclick={d.go}>
              <span class="what">{d.label}</span><em>{d.note}</em>
            </button>
          {/each}
        </div>
      {:else if !game.fight && sheet === 'log'}
        <!-- ★★★ THE EVENT LOG (N2) — *"maybe we should have an advanced log
             too"*, and the home for the messages that used to flash over the
             board: *"'Scree Slope just taken' — they should go into the
             advanced log."* Newest first, because that is what you came for. -->
        <h2>What happened</h2>
        {#if game.log.length === 0}
          <p class="note">Nothing yet. The valley is quiet.</p>
        {:else}
          {#each [...game.log].reverse() as line, i (i)}
            <p class="note logline">{line}</p>
          {/each}
        {/if}
      {:else if !game.fight && picked !== null && SITE.has(picked)}
        <!-- ⚠️ `data-q="title"` IS LOAD-BEARING for the browser probe: the
             draft card and the meetings put their own <h2> in this panel, and
             a bare `.panel h2` locator became ambiguous the moment they did. -->
        <h2 data-q="title">{nameOf(picked)}</h2>
        <!-- ★ THE NUMBERS THE MAP LABEL NO LONGER CARRIES (2026-08-11). They
             lived in the label and made it long enough to lose its collision
             fight and be dropped altogether. -->
        {#if worksLine(picked)}<p class="note">{worksLine(picked)}</p>{/if}
        {#each statusLines as row}<p class="note">{row}</p>{/each}
        {#if picked !== 0 && (game.stacks[picked] ?? 0) > 0 && !game.goblins[picked]}
          <!-- ★ PINNED HANDS — the owner's ask. Pins win the pool; freeing
               them returns everyone to farms-first auto.
               ⚠️ THE POSTED WATCH SAT ABOVE THIS ROW until 2026-08-15. Three
               people standing at a gate forever, to save one building from a
               raid every 300s, is strictly worse than rebuilding it — and it
               is babysitting, which the brief forbids. The hero is the watch
               now, and there is only one hero on purpose. -->
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
        <!-- ★★★ AND THE LIST IS GONE WHEN THE GRAPH HAS THEM — 2026-08-16.
             The deeds hang off their own node now (brief item 5); printing
             them here as well would be the same offer in two places, which is
             how the hero's Feed deed once sat on two tabs at once. The panel
             keeps what a place IS — its name, its works, its hands — and the
             graph keeps what you can DO there. -->
        <!-- ★★★ AND THE PANEL SAYS WHY — 2026-08-16. A blocked deed on the
             graph shows its NAME only: the refusals are sentences, and seven
             sentences hanging off the camp buried the board. But a door you
             cannot open still has to say what is holding it, or the dimming
             is just a shrug. The reasons land here, where there is room for a
             sentence — which is also what this panel is FOR now that the
             deeds themselves have gone onto the graph. -->
        {#if spokes.length > 0}
          {#each deeds.filter((d) => d.why !== null) as d (d.label)}
            <p class="note"><b>{d.label}</b> — {d.why}</p>
          {/each}
        {/if}
        {#if spokes.length === 0}
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
        {/if}
      {:else if !game.fight}
        <!-- ⚠️ AND NOT DURING A FIGHT, 2026-08-15. Every branch above this one
             is guarded by `!game.fight`, so a battle fell through the whole
             chain to here and printed "Tap a site." underneath the strip —
             an instruction to do the one thing that does nothing while a
             fight is on. The strip IS the panel's content then. -->
        <p class="note">Tap a site.</p>
      {/if}
    </section>
    <!-- ★★★ THE DOCK, 2026-08-11. Three views of the whole town, under the
         thumb, each one a sheet that rises OVER the place panel and goes
         away again. The place panel is always underneath, because a place is
         what the map gives you when you tap it, not a destination you
         navigate to.
         ⚠️ HIDDEN DURING A FIGHT, on purpose: a battle you cannot see
         because you left a sheet open is a lost run. -->
    {#if !game.fight}
      <nav class="deck">
        {#each SHEETS as t (t.id)}
          <button class="deckbtn" class:on={sheet === t.id}
            aria-pressed={sheet === t.id}
            onclick={() => (sheet = sheet === t.id ? null : t.id)}
          >{t.name}{#if t.id === 'log' && game.log.length > 0}<i>{game.log.length}</i>{/if}</button>
        {/each}
      </nav>
    {/if}
  {/if}
</main>

<style>
  /* ★★★ ONE PALETTE AND ONE TYPE SCALE — 2026-08-15, the owner: *"do a pass
     on the entire looks of the game for it to be cohesive."*
     ⚠️ THERE ARE NO HEX VALUES IN THIS STYLESHEET AND THERE MUST NOT BE.
     Every colour is a token from `PAPER` in `src/game/ink.ts`, written onto
     `:root` at runtime a few lines up in this file, so the chrome and the
     BOARD are finally one system — the board has had a measured palette
     since 2026-08-02 and the furniture around it had thirty-three unnamed
     hexes, four of which were duplicates a person cannot tell apart.
     `test/look.test.ts` fails the build if a hex comes back.
     ⚠️ AND NO BARE PIXEL FONT SIZES. There were SIXTEEN, including 10.5,
     11.5, 12.5 and 14.5 — which is nudging, not a scale, and it is why no
     two surfaces agreed. Eight steps, `--t1` (the one big moment) down to
     `--t8` (a micro-cap). Reach for the nearest step; do not add one. */

  /* ★ ONE COLUMN EVERYWHERE — the owner, off a desktop screenshot: "it's
     very weird on desktop." The game is a phone column; a wide window gets
     the same column, centred, not a map squeezed over furniture-sized
     buttons. */
  main { display: flex; flex-direction: column; height: 100dvh; background: var(--page);
    max-width: 520px; margin: 0 auto; }
  @media (min-width: 560px) {
    main { border-inline: 1px solid var(--edge); box-shadow: 0 0 42px var(--shadow); }
    :global(body) { background: var(--offpage); }
  }
  header { display: flex; flex-direction: column; gap: 0;
    border-bottom: 1px solid var(--edge); position: relative; }

  /* ★ FOUR EQUAL COLUMNS. `minmax(0, 1fr)` and not `1fr`: a long rate line
     ("−0.9/s +1.2/s") would otherwise push its column wider than its share
     and knock the other three out of alignment, which is the exact thing
     this HUD replaced. */
  .hud { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
    align-items: stretch; }
  /* ★ THREE ACROSS, TWO DOWN — six goods, and every one of them keeps its
     noun. The row rule has to go with it: with two rows, `:last-child` only
     clears the border on the sixth cell and left a rule hanging off the
     third. `nth-child(3n)` is the right-hand edge of both rows. */
  .hud.goods { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  /* ★★★ THE GOODS LIE DOWN — 2026-08-15. The owner: *"the top menu is too
     vertical. I don't understand why we're not using anything horizontally
     while having three rows of various height, text, numbers and icons
     vertically."* Exactly right: each cell stacked its noun over its number
     over its rate, three lines tall, inside a cell 130px wide and mostly
     empty. One line each now, and TWO columns instead of three, so the row
     is wider and the block is shorter.
     Measured: the goods block 94px → 69px, and the header 164px → 97px once
     the war line folded into the standings row. The map got 67px back. */
  .hud.goods { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hud.goods .cell { flex-direction: row; align-items: baseline; gap: 5px;
    padding: 3px 10px 3px 8px; justify-content: flex-start; }
  .hud.goods .cell b { font-size: var(--t4); }
  .hud.goods .cap-of { font-size: var(--t7); }
  /* ⚠️ `min-width: 0` OR THE RATE RUNS OFF THE SCREEN. A flex item's default
     `min-width: auto` refuses to shrink below its content, so `🪨full` in the
     right-hand column overran the cell's own padding and lost its last letter
     against the screen edge. Caught in the screenshot, not by any check. */
  .hud.goods .cell em { font-size: var(--t7); margin-left: auto; min-width: 0; }
  /* The noun is a fixed share so the numbers line up down the column — a
     ragged left edge on six numbers is the "cannot find anything" complaint
     in miniature. */
  .hud.goods .cap { min-width: 46px; text-align: left; }
  .hud.goods .cell { border-bottom: 1px solid var(--sunk); }
  .hud.goods .cell:nth-child(2n) { border-right: 0; }
  .hud.goods .cell:nth-child(n + 5) { border-bottom: 0; }
  .hud .cell { display: flex; flex-direction: column; align-items: center;
    gap: 1px; padding: 7px 2px 8px; border: 0; border-right: 1px solid var(--sunk);
    background: none; font: inherit; text-align: center; min-width: 0; }
  .hud .cell:last-child { border-right: 0; }
  .cap { font-size: var(--t8); letter-spacing: .09em; color: var(--dim); font-weight: 700; }
  .hud .cell b { font-size: var(--t2); line-height: 1.05; color: var(--ink); font-weight: 700; }
  /* ★ THE CEILING IS ALWAYS ON SCREEN, 2026-08-10 (playtest). The owner:
     *"I don't seem to have any storage capacity... it doesn't say anywhere
     what is my limit for the stone"* — it only said `full of 60` once it was
     already full, which is the one moment the number is no longer useful.
     Dimmer and smaller than the amount, so `41/60` still reads as "41". */
  .cap-of { font-size: var(--t5); color: var(--dim); font-weight: 600; }
  .hud .cell.brim .cap-of, .hud .cell.hurt .cap-of { color: var(--rust); }
  .hud .cell em { font-style: normal; font-size: var(--t7); color: var(--faint);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

  /* The tap target is the whole stone column, which is a far bigger thumb
     mark than the old chip — and it is the one thing here you can press. */
  .hud .cell.tap { cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .hud .cell.tap:active { background: var(--sunk); }

  /* A stock that has stopped climbing, and a town that has stopped eating. */
  .hud .cell.brim b, .hud .cell.brim em { color: var(--rust); }
  .hud .cell.hurt b, .hud .cell.hurt em { color: var(--rust); font-weight: 700; }


  .standings { border-top: 1px solid var(--sunk); background: var(--panel);
    /* ⚠️ NOT FOUR EQUAL COLUMNS like the row above. The standings are wildly
       uneven in length — "🛞 3" against "⚔️ 8/10 · arms 1" — and equal shares
       clipped the hero's arms count to "arms" with nothing after it. The
       short ones take what they need; the hero takes the slack. */
    /* ★ FOUR COLUMNS SINCE 2026-08-15: the hero, the spears and the carts
       went to the sheets that are about them, and the goal came up off its
       own row. The goal takes the slack, because it is the only one of the
       four that is a sentence. */
    grid-template-columns: auto auto minmax(0, 1fr) auto; }
  .standings .cell.goal { justify-content: center; font-weight: 700;
    color: var(--soft); }
  .standings .cell.goal.hurt { color: var(--rust); }
  .standings .cell { padding-left: 8px; padding-right: 8px; }
  .standings .cell { flex-direction: row; justify-content: center; gap: 4px;
    padding: 6px 2px; font-size: var(--t5); color: var(--soft); font-weight: 600;
    white-space: nowrap; overflow: hidden; }
  .standings .cell.lv { color: var(--mossInk); }
  .standings .cell.brim { color: var(--rust); }
  .standings .cell.hurt { color: var(--rust); }

  /* ★ THE END OF A RUN COVERS THE BOARD. It is the one moment the game
     has, and it must not be a line in a corner. */
  .gone { position: fixed; inset: 0; z-index: 50; display: flex;
    flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; padding: 24px; text-align: center; background: var(--page); }
  .gone h1 { font-size: var(--t1); letter-spacing: .04em; color: var(--rust); margin: 0; }
  .gone .note { margin: 0; }
  .gone .deed.row.big { align-items: center; min-height: 56px; max-width: 320px;
    background: var(--card); border-color: var(--rust); margin-top: 8px; }

  /* ⚠️ `flee` KEEPS ITS BUTTON MID-SWING ON PURPOSE — a safety valve you
     have to wait for is not a safety valve. */
  /* ★★★ THE DOCK (2026-08-11). Four buttons at the bottom edge, in the
     thumb's arc. They toggle a SHEET over the place panel; tapping the lit
     one puts it away. */
  .deck { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    background: var(--dock); border-top: 1px solid var(--rule); }
  .deckbtn { font: inherit; font-size: var(--t5); font-weight: 700; color: var(--soft);
    background: var(--panel); border: 1px solid var(--rule); border-radius: var(--r1);
    padding: 11px 4px; min-height: 44px; cursor: pointer; }
  /* ★★★ THE LIT TAB IS NOT A GREEN SLAB — 2026-08-15. It was a solid fill of
     `--moss`, which made a piece of NAVIGATION the most saturated thing on
     the screen: louder than the goblin ground, louder than the river, louder
     than the map the whole game happens on. Chrome must never outrank the
     board. It is the parchment card lifted, with the green kept for a 2px
     rule along the top edge and the word — present, findable, and quieter
     than everything it sits under. */
  .deckbtn.on { background: var(--card); border-color: var(--moss);
    color: var(--mossInk); box-shadow: inset 0 2px 0 var(--moss); }
  .deckbtn i { font-style: normal; font-size: var(--t7); opacity: 0.75;
    margin-left: 4px; }
  /* ★ N5: the meeting reads as a page, not as another row of numbers. */
  .sq.levy { opacity: 0.92; }
  .sq.levy.down { opacity: 0.45; }
  /* ★ The win sits ABOVE the board and leaves it usable. */
  .wonbar { background: var(--mossWash); border-bottom: 2px solid var(--moss);
    padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
  .wonbar h1 { font-size: var(--t3); letter-spacing: .04em; color: var(--moss); margin: 0; }
  .wonbar .note { margin: 0; }
  .wonbar .deed.row { background: var(--card); }
  .meet { background: var(--panel); border: 1px solid var(--rule); border-radius: var(--r2);
    padding: 10px 12px; margin: 0 0 10px; }
  .meet h2 { margin: 0 0 4px; }
  .tale { margin: 0 0 8px; color: var(--text); line-height: 1.45; }
  .logline { border-left: 3px solid var(--rule); padding-left: 8px;
    margin: 5px 0; }
  /* ★ F3: the +1 rises out of the counter it belongs to. */
  .goods .cell { position: relative; }
  /* ★ IT RISES INTO THE CELL, NOT OUT OF THE TOP OF THE PHONE — 2026-08-15.
     The owner: *"the +1 indicators start a bit too high up, so they are not
     visible, they go beyond the screen."* It was anchored to the TOP of a
     cell with 3px of padding above it and then travelled 14px further up, so
     on the first row of the grid it left the header and clipped against the
     status bar. Anchored to the bottom now, and the rise is shorter than the
     cell is tall, so the whole flight happens inside the counter it belongs
     to. */
  .bump { position: absolute; right: 6px; bottom: 1px; font-size: var(--t6);
    font-weight: 800; color: var(--moss); pointer-events: none;
    animation: bump 1s ease-out forwards; }
  /* ⚠️ AND THE RISE IS 6px, NOT 13. Anchoring to the bottom was not enough:
     a 14px float in a 23px cell has 8px of headroom, and 13px of travel spent
     five of them above the top of the phone. The probe measured it at −5px,
     which is the owner's complaint in one number. The cells are short and
     horizontal now, so a short lift with the fade reads perfectly well. */
  @keyframes bump { from { opacity: 0.95; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-6px); } }
  @media (prefers-reduced-motion: reduce) { .bump { animation-duration: 0.01s; } }
  .swinging { color: var(--rust); font-weight: 700; text-align: center; margin: 2px 0; }
  /* ★ The wind-up is the one beat where Guard is right, so it shouts. */
  .swinging.windup { background: var(--rustWash); border-radius: var(--r1); padding: 2px 0;
    animation: windup 0.5s ease-in-out infinite alternate; }
  @keyframes windup { from { opacity: 0.75; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .swinging.windup { animation: none; } }

  /* ★ ONE ROW PER SKILL: what it is, what level, and how far to the next. */
  .skill { display: grid; grid-template-columns: 1fr auto 88px;
    align-items: center; gap: 8px; margin: 5px 0; }
  .skill .nm { font-size: var(--t5); color: var(--soft); font-weight: 600;
    text-transform: capitalize; }
  .skill .lv { font-size: var(--t4); color: var(--ink); font-weight: 700; }
  .skill .bar { height: 6px; border-radius: var(--r1); background: var(--sunk);
    overflow: hidden; }
  .skill .bar i { display: block; height: 100%; background: var(--moss); }
  .keep { font-size: var(--t5); color: var(--soft); font-weight: 600; }
  .keep.build { color: var(--off); font-weight: 400; font-size: var(--t6); }
  .reset { font: inherit; font-size: var(--t5); border: 1px solid var(--edge);
    border-radius: var(--r2); padding: 6px 10px; background: var(--page); color: var(--soft); }
  /* ⚠️ ABSOLUTE NOW: the header is a COLUMN since the HUD went in, so
     `margin-left:auto` no longer pushes it anywhere — it would sit as its own
     full-width row under the standings. Pinned to the top corner instead,
     clear of the four columns. */
  .reset.gear { padding: 2px 10px; line-height: 1.3; align-self: center;
    margin: 0 6px 0 2px; }
  .reset.armed { background: var(--rust); color: var(--card); }
  /* ★★★ THE MAP IS THE FIXED ONE, AND THE PANEL ABSORBS — 2026-08-15.
     ⚠️ THE FIRST CUT OF THIS FIX FROZE THE PANEL INSTEAD, and the screenshot
     killed it: a 40dvh panel under a three-line place inspector is 80px of
     empty parchment, every time, for a stability the map could have had for
     free. It is the MAP that must not move — that is the whole complaint —
     so the map takes a fixed share and the panel takes what is left. The
     board never hears about a dock tap, and the emptiness lands in a panel
     that already looks like a panel and scrolls when there is more. */
  /* ★★★ 42dvh → 58dvh, 2026-08-16. The deeds moved ONTO the graph (brief
     item 5), so the panel that used to list them holds a name and a couple of
     status lines — it was 40dvh of empty parchment under a three-line
     inspector, while five deed chips fought each other over a 355px board.
     The board is the interface now and it takes the screen; the panel keeps
     what a place IS and the graph keeps what you can DO there.
     ⚠️ STILL A FIXED HEIGHT, WHICH IS THE WHOLE POINT OF THIS RULE — the
     number changed, the law did not. The map must not resize when a sheet
     opens (*"it makes the map jam every time"*), so the panel still absorbs. */
  .map { flex: 0 0 auto; height: 58dvh; min-height: 0; position: relative;
    margin: 10px; }
  /* ★★★ A FIXED HEIGHT, AND THAT IS THE WHOLE FIX — 2026-08-15. The owner:
     *"switching between town, hero and along repositions the height of the
     bottom panel a little bit, and it makes the map jam every time."* It did.
     `min-height: 148px; max-height: 44dvh` meant the panel was as tall as
     whatever sheet was open, `.map { flex: 1 }` absorbed the difference, and
     the board re-laid-out on EVERY dock tap — a graph that jumps under your
     thumb because you looked at a different menu.
     `height` instead of `min-height`, so the map is the same size no matter
     which sheet is up and the board never hears about it. The content
     scrolls inside, which is what `overflow-y` was always for. */
  .panel { padding: 8px 14px 16px; border-top: 1px solid var(--edge); background: var(--panel);
    flex: 1 1 auto; min-height: 0; overflow-y: auto; }
  .menurow { display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
    padding: 8px 14px; border-top: 1px solid var(--sunk); }
  .panel h2 { margin: 4px 0 6px; font-size: var(--t3); }
  .note { color: var(--faint); font-size: var(--t5); margin: 4px 0; }
  .note b { color: var(--soft); font-weight: 700; }
  /* ★★★ THE MARKS SIT ON THE PAPER — 2026-08-15, the look pass. The board is
     a hiking map in a measured, muted palette and the furniture was studded
     with full-saturation OS emoji: a grey lump for stone, a cardboard
     shipping box for a storehouse. They stay (a monochrome set was tried the
     same day and was unreadable at 11px — see `marks.ts`), but they stop
     shouting.
     ⚠️ `saturate` AND NOTHING ELSE, and it is chosen precisely because it
     cannot touch the words: every ink these rules carry is a near-neutral
     brown or grey with almost no saturation to lose, while an emoji is
     nothing but saturation. One filter, and only the pictures move.
     ⚠️ NOT ON `.away`, `.sq.us` OR ANY MOSS/RUST TEXT — those ARE saturated,
     on purpose, because they mean yes and no. */
  .note, .deed em, .deed .what, .hud .cell em, .keep, .crew span, .logline,
  .standings .cell { filter: saturate(0.6); }
  .deed { display: block; width: 100%; text-align: left; font: inherit; font-size: var(--t4);
    border: 1px solid var(--edge); border-radius: var(--r2); background: var(--card);
    padding: 10px 12px; margin: 6px 0; }
  .deed:disabled { background: var(--sunk); color: var(--faint); }
  .deed em { display: block; font-style: normal; font-size: var(--t6); color: var(--faint); }

  /* ★★ TWO COLUMNS, 2026-08-09 — the owner, on the phone: *"the horizontal
     buttons at the bottom, they take too much space."* Full-width rows were
     54px each and the list ran to 234px of an 844px screen; the map got 374.
     This is the same answer the battle strip already reached for the same
     reason — the fight's own verbs, when they still lived in this panel,
     for which "four stacked full-width deeds pushed the strip off small
     screens". Those are spokes on the board since 2026-08-16; this grid is
     the surviving use of the precedent. */
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
    padding: 7px 10px; font-size: var(--t4); border-radius: var(--r2); line-height: 1.2; }
  /* ⚠️ THE NAME MAY ELLIPSISE, THE PRICE MAY NOT. A deed you cannot afford
     has to say what it wants — that is the entire job of the second line —
     so it wraps rather than truncating, and the cell grows to fit it. */
  .deed.row .what { max-width: 100%; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
  .deed.row em { display: block; font-size: var(--t7); line-height: 1.25;
    max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
  .crew { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .crew span { font-size: var(--t5); color: var(--soft); }
  .crew button { font: inherit; font-size: var(--t3); line-height: 1; width: 34px; height: 34px;
    border: 1px solid var(--edge); border-radius: var(--r2); background: var(--card); }
  .crew button:disabled { color: var(--off); }
  .crew .autoback { width: auto; font-size: var(--t5); padding: 0 10px; color: var(--soft); }
  .away { margin: 4px 0 8px; font-size: var(--t5); font-weight: 600; color: var(--mossInk);
    border: 1px solid var(--moss); background: var(--mossWash); border-radius: var(--r2); padding: 8px 10px; }
  /* ★ THE BATTLE STRIP — one square left, three right. */
  .strip { display: flex; align-items: center; gap: 8px; margin: 8px 0 4px; }
  .sq { width: 68px; aspect-ratio: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1px; font: inherit;
    border-radius: var(--r2); border: 1px solid var(--edge); background: var(--card); }
  .sq b { font-size: var(--t2); line-height: 1.1; }
  .sq span { font-size: var(--t7); color: var(--soft); font-weight: 600; }
  .sq em { font-style: normal; font-size: var(--t8); color: var(--faint); }
  .sq.us { border-color: var(--mossInk); background: var(--mossWash); }
  .sq.us b { color: var(--mossInk); }
  .sq.us.low { border-color: var(--rust); background: var(--rustWash); }
  .sq.us.low b { color: var(--rust); }
  .sq.them b { color: var(--clay); }
  .sq.them.aimed { border: 2px solid var(--clay); background: var(--clayWash); }
  .sq.them.down { opacity: 0.35; }
  .vs { font-size: var(--t5); color: var(--faint); flex: 1; text-align: center; }
  .vs.hurt { color: var(--rust); font-size: var(--t3); }
  .windnote { color: var(--rust); font-weight: 600; }
</style>
