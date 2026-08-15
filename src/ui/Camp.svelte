<script lang="ts">
  // THE CITY BUILDER'S ONE SCREEN — docs/CITY.md made flesh. Header of
  // numbers, the board, a dock of deeds. NO PROSE: nouns and numbers.
  import { onMount } from 'svelte';
  import Board, { type Dot, type Line } from './Board.svelte';
  import { INK, TOL, type InkName } from '../game/ink';
  import type { Box } from '../game/layout';
  import { apply, catchUp, initial, flow, shown, popCap, pathKey, costOf, pathCostOf,
    priceLine, unlayable, unraisable, unassailable, heroHit, spearCost, hunger,
    heroMax, WILD_FED, SITE, GOBLINS, RATE, MAX_GAUGE, CREW, PATH_SECS,
    raisingLeft, buildSecs, housed, blowLeft, spearLabel, SPEAR_MADE, SWEEP_SHARE,
    guardsAt, guardsTotal, GUARD_STOP, unhireable, hireCost, levyCap, folkName,
    unforageable, nextForay, forageLeft, FORAGE_SECS, onWatch, RAID_SECS,
    unmarchable, marchSecs, onWatchAt, swellOf, spawnOf,
    holdingsLeft,
    richOf, storeCost, roomOf, STORE_ROOM, cartCost, cartHaul, CARRY, CART_GAIN,
    raiders, raidTarget,
    windup, RATION_FOOD, RATION_HP, answerBite, uneatable, MEAL_FOOD, MEAL_HP,
    BOONS, has, RUN_STEP, sawsHere, KILN_SHARE, unforgeable, toolCost, TOOL_BATCH, TOOLLESS, unpushable, pushRisk,
    MEETS,
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
      { id: 'coal', cap: 'COAL', mark: MARK.coal, have: game.coal,
        state: brim(game.coal) ? 'brim' : null,
        note: brim(game.coal) ? 'full' : rate(f.coal) },
      // ⚠️ TOOLS ARE THE ONE GOOD THAT ONLY GOES DOWN, so the rate line says
      // what wear is costing rather than borrowing the `+` every other cell
      // uses. An empty rack is not a shortage like the others either — it is
      // a 40% cut to every works, which is why it reads as hurt.
      { id: 'tools', cap: 'TOOLS', mark: MARK.tools, have: game.tools,
        state: game.tools <= 0 ? 'hurt' : brim(game.tools) ? 'brim' : null,
        // ⚠️ ONE WORD, because 130px of cell holds about twenty characters and
        // "NONE, works at 60%" came back from the screenshot as "NONE, works
        // at 6…". What an empty rack COSTS is a sentence, and it is in the
        // People sheet where there is room for a sentence.
        note: game.tools <= 0 ? 'NONE'
          : f.tools > 0.0001 ? `−${f.tools.toFixed(2)}/s` : 'holding' },
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
      const held = onWatchAt(game, t) || guardsAt(game, t) >= GUARD_STOP;
      // The cord: the whole road, always, once anything is gathering at all.
      out.push({ s: 'path', pts: [{ x: from.x, y: from.y }, { x: to.x, y: to.y }],
        ink: 'foe', w: 1.6, dash: [4, 7], alpha: 0.3 });
      // The fuse: burning from the holding towards the prize.
      const hx = from.x + (to.x - from.x) * m;
      const hy = from.y + (to.y - from.y) * m;
      // ⚠️ DIM WHEN IT IS COVERED, never hidden. A raid that something is
      // standing in front of is still gathering, and hiding the fuse would
      // make posting a guard look like it stopped the clock. It does not.
      out.push({ s: 'path', pts: [{ x: from.x, y: from.y }, { x: hx, y: hy }],
        ink: 'foe', w: 3.2, alpha: held ? 0.55 : 0.9 });
      out.push({ s: 'disc', x: hx, y: hy, r: 3.4, ink: 'foe', alpha: held ? 0.6 : 1 });
    }
    for (const [t, m] of aimed) {
      const to = SITE.get(t);
      if (!to) continue;
      const held = onWatchAt(game, t) || guardsAt(game, t) >= GUARD_STOP;
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
    // ★★★ PUSH THE CREW — 2026-08-11, Fallout Shelter's rush. The risk you
    // are shown IS the bonus you are paid, which is the whole elegance of it:
    // greed and fear are one number and it needs no explaining.
    {
      const w = unpushable(game, s.id);
      if (w === null) {
        const risk = Math.round(pushRisk(game) * 100);
        out.push({
          label: 'Push the crew',
          note: `finish it now · ${MARK.waste}${risk}% risk → +${Math.ceil(risk * 0.2)} for the risk`,
          why: null,
          go: () => act({ type: 'push', id: s.id }),
        });
      }
    }
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
        label: on ? 'Fell timber again' : 'Light the kiln',
        note: on
          ? `${MARK.logs}${(CREW * RATE.lumber).toFixed(2)}/s to the mill`
          : `${MARK.coal}${(CREW * RATE.lumber * KILN_SHARE).toFixed(2)}/s for the forge`,
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
      // ★★★ THE TOOLWRIGHT, 2026-08-11 — coal and planks in, tools out. The
      // first thing in this economy you must keep paying for: every hand at a
      // workface wears tools down, so a growing town has to keep forging just
      // to stand still.
      {
        const w = unforgeable(game);
        const tp = toolCost(game);
        out.push({
          label: `Forge tools ×${TOOL_BATCH}`,
          note: w ?? `${amount('coal', tp.coal)} ${amount('planks', tp.planks)}`
            + ` → ${MARK.tools}${TOOL_BATCH}`,
          why: w,
          go: () => act({ type: 'forge' }),
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
          // ★ WHAT WOULD ACTUALLY STOP IT (2026-08-11). This still said "home
          // turns one away", which stopped being true when the watch became
          // positional and stopped being the whole story when hands could be
          // posted. It names the gate, and who is standing on it.
          + ` · ${at !== null && guardsAt(game, at) >= GUARD_STOP
            ? `${MARK.people} ${guardsAt(game, at)} hold ${SITE.get(at)?.name ?? 'it'}`
            : at !== null && onWatchAt(game, at)
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
      <p class="note">{MARK.danger}0 goblin camps · {MARK.people}{Math.floor(game.pop)} living here
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

           Three columns and two rows, so a good's place never depends on how
           the game is going. ⚠️ NOT six across: an emoji is a decoration on a
           word and never a replacement for it (the owner, twice), so every
           cell has to carry its noun, and six nouns do not fit 390px. -->
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
          <em>{g.mark} {g.note}</em>
        </div>
      {/each}
    </div>
    <div class="hud standings">
      <span class="cell" class:lv={game.pop < cap} data-q="people"
        aria-label="people">👤 {Math.floor(game.pop)}/{cap}</span>
      <span class="cell" class:brim={game.pop >= cap} data-q="huts"
        aria-label="huts">🏠 {game.pop >= cap ? 'full' : `×${game.stacks[0] ?? 0}`}</span>
      <!-- ★★★ THE WORDS WENT BACK IN, 2026-08-11. From the playthrough:
           *"I don't understand the swords. I think it's hp of the hero"* —
           it is, and the crossed swords never said so. And of the cart
           wheel: *"the weird symbol with a zero and a pentagram… I don't
           understand the wheel sign at all"*, asked twice and never answered.
           An emoji is a decoration on a word, never a replacement for it. -->
      <span class="cell" class:hurt={game.hero.hp < heroMax(game) / 3} data-q="hero"
        aria-label="hero">hero {game.hero.hp}/{heroMax(game)}</span>
      <!-- ⚠️ NO EMOJI ON THESE THREE. With the words in, the marks pushed the
           row into a second line and left the gear stranded on its own. The
           word is the part that was missing; the picture was never the part
           that was working. -->
      <span class="cell" data-q="spears" aria-label="spears"
        >{spearLabel(game.hero.spears).toLowerCase()}</span>
      <span class="cell" data-q="carts" aria-label="carts">carts {game.carts}</span>
      <!-- ⚠️ THE GEAR LIVES IN THIS ROW, not pinned over the top corner. It
           was absolute, and it sat on the FOOD column and clipped its label
           to "FOO" — caught in the first screenshot. A trailing `auto`
           column cannot overlap anything. -->
      <button class="reset gear" onclick={() => (menu = !menu)}>{menu ? 'Close' : '⋯'}</button>
    </div>
    <!-- ★★★ THE WAR CAME OFF THIS LINE — 2026-08-14. It used to carry five
         facts: how full the worst raid was, what it was coming for, where
         the hero was standing, how many camps were left, and how much the
         goblins had swollen. The owner, reading it mid-game: *"it's a stupid
         thing to have in the same… you know, this is a stats menu. Why is it
         there?"* And, of the raids themselves: *"there is no clear visual
         indicator that they are attacking on a path."*

         Both complaints have the same answer. The clock, the target and the
         hero's whereabouts are all facts about PLACES, so they went to the
         board, where places are: the fuse burns along the road the raid will
         walk, the reticle rings what it is coming for, the figure stands
         where the hero stands. The swell is already in the number on each
         holding's own panel — `spawnOf` refills a camp to the swollen
         ceiling, so "48 strong" IS the swell, said once.

         What is left is the goal — how much of the valley is still theirs —
         and the ambush, which is the one piece of war news that is not a
         standing fact about a place but a thing that HAPPENED, and which
         clears itself after twelve seconds. -->
    <div class="warline" class:hot={game.ambush !== null} data-q="war">
      <!-- ⚠️ `shownHoldings`, NOT `holdings` (2026-08-11). An earlier version
           tested every camp on the map and then printed the count the FOG
           allows, so a valley whose camps were all still hidden announced
           "0 goblin camps" while the branch that exists to say the valley is
           yours sat unreached below it. Found by an audit, not by play. -->
      {#if game.ambush !== null}
        {MARK.waste}ambushed on the road · {MARK.hero}{game.hero.hp}/{heroMax(game)}
      {:else if shownHoldings > 0}
        {MARK.danger}{shownHoldings} goblin camps left
      {:else}
        {MARK.danger}the valley is yours
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
        decor={scene} mark={heroMark} />
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
        <div class="verbs" class:mid={blowLeft(game) !== null}>
          <button class="deed" disabled={blowLeft(game) !== null}
            onclick={() => act({ type: 'strike' })}>
            Attack
            <em>{heroHit(game)} into the {fi.sq[aimedAt]?.kind ?? 'line'}</em>
          </button>
          <!-- ★★★ A SECOND WAY TO SWING, 2026-08-11 — the owner: *"the hero
               doesn't have any skills, so the battles are boring."* Attack
               puts everything into one square, which is right against a wall
               and wrong against a line of runts. Sweep spends the same swing
               across all of them. Reading the line is now the decision. -->
          <button class="deed" disabled={blowLeft(game) !== null}
            onclick={() => act({ type: 'sweep' })}>
            Sweep
            <em>{Math.max(1, Math.floor(heroHit(game) * SWEEP_SHARE))} into
              every one of the {fi.sq.filter((q) => q.hp > 0).length} standing</em>
          </button>
          {#if has(game, 'volley')}
            <!-- ★ VOLLEY (blueprint): over the wall, into the squares behind
                 it, at full weight. The wall is the thing you cannot get
                 past; this is the card that says otherwise. -->
            <button class="deed" disabled={blowLeft(game) !== null}
              onclick={() => act({ type: 'volley' })}>
              Volley
              <em>{heroHit(game)} past the wall, into the rest</em>
            </button>
          {/if}
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
      {/if}

      {#if !game.fight && game.draft !== null}
        <!-- ★★★ THE BLUEPRINT DRAFT, 2026-08-11 — the owner: *"we also need a
             research tree or something to unlock shit."* Against the Storm's
             shape rather than a tree: a tree earns its keep when the tree IS
             the content and a run is hundreds of hours; across six fights in
             forty minutes it is a checklist ticked in a fixed order. Three
             offered, one kept, and a deck you cannot exhaust — so a run has an
             identity and the next one differs without the map changing.
             ⚠️ Like the meetings, it waits and blocks nothing. -->
        <div class="meet draft">
          <h2>What the ground taught us</h2>
          <p class="tale">Three ways to build on what you have taken. One of
            them, and the rest go back in the pack.</p>
          <div class="dock">
            {#each game.draft as id (id)}
              {@const b = BOONS.find((x) => x.id === id)}
              {#if b}
                <button class="deed" onclick={() => act({ type: 'take', id })}>
                  {b.name}<em>{b.what}</em>
                </button>
              {/if}
            {/each}
          </div>
        </div>
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
            <button class="deed row" class:cant={d.why !== null} onclick={d.go}>
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
        <!-- ⚠️ COAL AND TOOLS LEFT THIS SHEET, 2026-08-14 — they are two of
             the six goods and they are in the goods grid with the other four.
             The reason they were here was that the grid held four columns,
             which is a fact about a stylesheet and not about the game. What
             stays is the WEAR, per hour, because that is the one cost in this
             economy that grows with the size of the town rather than with
             what it buys, and a per-second figure in the HUD hides it. -->
        <p class="note">{MARK.tools}the tools wear {(f.tools * 60).toFixed(1)} an hour</p>
        {#if game.tools <= 0}
          <p class="note">{MARK.waste}the tools are gone. Every works is
            running at {Math.round(TOOLLESS * 100)}%.</p>
        {/if}
        {#if guardsTotal(game) > 0}
          <p class="note">{MARK.danger}{guardsTotal(game)} standing watch — they do not work</p>
        {/if}
        {#each shown(game).filter((s) => (game.stacks[s.id] ?? 0) > 0 || guardsAt(game, s.id) > 0) as s (s.id)}
          <p class="note">{s.name} · {(f.hands.get(s.id) ?? 0)} working{
            guardsAt(game, s.id) > 0 ? ` · ${guardsAt(game, s.id)} on watch` : ''}</p>
        {/each}
        {#if game.boons.length > 0}
          <h2>What we have learned</h2>
          {#each game.boons as id (id)}
            {@const b = BOONS.find((x) => x.id === id)}
            {#if b}<p class="note">{b.name} — {b.what}</p>{/if}
          {/each}
        {/if}
      {:else if !game.fight && sheet === 'hero'}
        <h2>The hero</h2>
        <p class="note">{MARK.hero}{game.hero.hp} of {heroMax(game)}
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
          <!-- ★ POSTED HANDS — the owner's ask. Pins win the pool; freeing
               them returns everyone to farms-first auto. -->
          <!-- ★★★ THE POSTED WATCH, 2026-08-11 — queue item 6. The owner:
               *"we need to allow to have defensive job assignments for the
               units because the hero running around everywhere cannot save
               everyone."* They come out of the same pool as the workers, so
               the row sits with the hands: it is the same people, and the
               choice between digging and standing is the mechanic. -->
          <div class="crew">
            <button onclick={() => act({ type: 'post', id: picked!, by: -1 })}
              disabled={guardsAt(game, picked) <= 0}>−</button>
            <span>watch {guardsAt(game, picked)} of {GUARD_STOP} needed{
              guardsAt(game, picked) >= GUARD_STOP ? ' · holds' : ''}</span>
            <button onclick={() => act({ type: 'post', id: picked!, by: 1 })}
              disabled={housed(game) - guardsTotal(game) <= 0}>+</button>
          </div>
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
  /* ★ THREE ACROSS, TWO DOWN — six goods, and every one of them keeps its
     noun. The row rule has to go with it: with two rows, `:last-child` only
     clears the border on the sixth cell and left a rule hanging off the
     third. `nth-child(3n)` is the right-hand edge of both rows. */
  .hud.goods { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  /* ⚠️ SIX CELLS COST A ROW, AND THE MAP PAID FOR IT. The grid went from one
     row to two and the board lost 62px of a 295px map — so the cells are
     tighter than the four-across ones were: less padding, a smaller number.
     Measured: 62px a row down to 47px, which buys 30px of the 62 back. The
     three states still read (`full` in red, `STARVING`, the rate). */
  .hud.goods .cell { padding: 4px 2px 5px; }
  .hud.goods .cell b { font-size: 18px; }
  .hud.goods .cap-of { font-size: 11px; }
  .hud.goods .cell em { font-size: 10.5px; }
  .hud.goods .cell { border-bottom: 1px solid #e6dfcf; }
  .hud.goods .cell:nth-child(3n) { border-right: 0; }
  .hud.goods .cell:nth-child(n + 4) { border-bottom: 0; }
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
    /* ★ SIX COLUMNS SINCE 2026-08-11: spears left the hero's cell so the
       hero's could say "hero 10/10" in words. Five columns left the gear
       wrapping onto a row of its own. */
    grid-template-columns: auto auto minmax(0, 1fr) auto auto auto; }
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
  /* ★★★ THE DOCK (2026-08-11). Four buttons at the bottom edge, in the
     thumb's arc. They toggle a SHEET over the place panel; tapping the lit
     one puts it away. */
  .deck { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
    background: #f2ecdd; border-top: 1px solid #e2d9c3; }
  .deckbtn { font: inherit; font-size: 13px; font-weight: 700; color: #6b5d3f;
    background: #f7f2e7; border: 1px solid #e2d9c3; border-radius: 8px;
    padding: 11px 4px; min-height: 44px; cursor: pointer; }
  .deckbtn.on { background: #1f7a3f; border-color: #1f7a3f; color: #fdfaf2; }
  .deckbtn i { font-style: normal; font-size: 11px; opacity: 0.75;
    margin-left: 4px; }
  /* ★ N5: the meeting reads as a page, not as another row of numbers. */
  .sq.levy { opacity: 0.92; }
  .sq.levy.down { opacity: 0.45; }
  /* ★ The win sits ABOVE the board and leaves it usable. */
  .wonbar { background: #eef6ee; border-bottom: 2px solid #1f7a3f;
    padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
  .wonbar h1 { font-size: 19px; letter-spacing: .04em; color: #1f7a3f; margin: 0; }
  .wonbar .note { margin: 0; }
  .wonbar .deed.row { background: #fdfaf2; }
  .meet { background: #f4eee1; border: 1px solid #e2d9c3; border-radius: 10px;
    padding: 10px 12px; margin: 0 0 10px; }
  .meet h2 { margin: 0 0 4px; }
  .meet.draft { border-color: #1f7a3f; background: #f1f6ef; }
  .tale { margin: 0 0 8px; color: #4a4030; line-height: 1.45; }
  .logline { border-left: 3px solid #e2d9c3; padding-left: 8px;
    margin: 5px 0; }
  /* ★ F3: the +1 rises out of the counter it belongs to. */
  .goods .cell { position: relative; }
  .bump { position: absolute; right: 6px; top: 2px; font-size: 12px;
    font-weight: 800; color: #1f7a3f; pointer-events: none;
    animation: bump 1s ease-out forwards; }
  @keyframes bump { from { opacity: 0.95; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-14px); } }
  @media (prefers-reduced-motion: reduce) { .bump { animation-duration: 0.01s; } }
  .swinging { color: #b3452f; font-weight: 700; text-align: center; margin: 2px 0; }
  /* ★ The wind-up is the one beat where Guard is right, so it shouts. */
  .swinging.windup { background: #fbe9e4; border-radius: 6px; padding: 2px 0;
    animation: windup 0.5s ease-in-out infinite alternate; }
  @keyframes windup { from { opacity: 0.75; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .swinging.windup { animation: none; } }

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
