<script lang="ts">
  // FOUR TABS, EACH A GRAPH. THE BOARD TAKES THE SCREEN; ONE PANEL IS DOCKED TO
  // THE BOTTOM OF IT, AND NOTHING IS EVER DRAWN OVER THAT.
  //
  // ⚠️ THE ORIGINAL RULE WAS STRICTER AND IT WAS WRITTEN IN BLOOD. The owner,
  // after playing: "as soon as I opened the game, some text pop-up opened on top
  // of the pop-up which happens when you click on a graph node — this is why it
  // was very confusing, I had to close the text pop-up and then the graph
  // actions would have opened." Every previous screen put prose over the board,
  // a card over the dots, a sheet over the card. So NOTHING was allowed to
  // overlay anything, and the panel sat in normal flow below the board.
  //
  // ★ THE OWNER RELAXED IT, 2026-08-02: *"the canvas on mobile can take more
  // space vertically while the text could be at the very bottom overlaying it in
  // case needed but like always snipped to bottom of the screen."*
  //
  // What the original rule was actually protecting against was a STACK of
  // things to dismiss, and that part is untouched. There is exactly ONE overlay,
  // it is always in the same place, it is never in front of anything but the
  // map, and there is still nothing to close — tapping elsewhere replaces what
  // it says. `scripts/play-tabs.mjs` enforces all three.
  import { onMount } from 'svelte';
  import { STOP } from '../game/stops';
  import { TABS, deedsFor, numOf, stopId, DOING, theWay, type TabId } from '../game/world';
  import { solve, JOURNEY } from '../game/layout';
  import Board from './Board.svelte';
  import { TERRAIN_SHAPES } from '../game/terrain';
  import { INK, TOL } from '../game/ink';
  import { apply, initial, roadsOut, unbuildable, manaRate, fillOf, crossed,
    loadOf, roadKey, hopsFrom, kitAdd, legGround, KITS, START,
    unforageable, FORAGE_SECS, charted,
    type Game, type Action, type Kit } from '../game/engine';
  import { judge, judgeBurned, burnHelps, type Roll } from '../game/dice';
  import { troubleById, isFoe } from '../game/events';
  import { sceneById } from '../game/scenes';
  import { pathOf } from '../game/paths';
  import { load, save, wipe, elapsedSince } from '../game/store';

  let game = $state<Game>(initial());
  let ready = $state(false);
  let tab = $state<TabId>('chapter');
  /** What the player last tapped, per tab. Selection is a STATE OF THE TAB, not
   *  a window over it (R3.1) — which is why there is nothing to close. */
  let picked = $state<string | null>(null);
  let awayLine = $state('');
  /** ⚠️ TWO TAPS AND A VERB, ON THE CANVAS. The owner asked for exactly this:
   *  "you should be able to click on one node and then on a second node and
   *  establish a connection there." So Connect ARMS, and the next dot you touch
   *  is the far end. Armed state lives in the panel where you pressed it — it
   *  does not follow your finger around and it does not float over the graph. */
  let arming = $state(false);
  /** ★ PREPARE BEFORE YOU SET OFF — the owner: *"in order to start building a
   *  leg, you need to prepare first."* Tapping "Lay the pipe" opens the kit
   *  choice; tapping a kit is what actually sets off. Cleared by any other
   *  tap, like everything else in the dock. */
  let prep = $state<number | null>(null);
  /** ★ WHAT THE SCAVENGE TURNED UP, arithmetic in the open like the trouble
   *  dock — shell-side only, because the engine keeps no memory of dice. */
  let found = $state<string | null>(null);
  /** ★ START OVER ARMS FIRST. One stray tap wiped a run in the owner's
   *  play-test; now the first tap asks and disarms itself in 3s. */
  let wiping = $state(false);

  /** ★ THE ONLY DICE IN THE HOUSE. Rolled here in the shell and handed to the
   *  engine as plain numbers — `apply` takes no randomness, ever. Real random,
   *  not seeded: these are dice, and dice that could be predicted from the
   *  save would be a different and worse game. */
  const d = (n: number): number => 1 + Math.floor(Math.random() * n);

  /** Everything the dock needs to tell the trouble honestly. */
  /** ★★ A SCENE IN PLAY — the encounter as its own incremental game. When
   *  this is non-null the dice dock stays shut: gauges and verbs instead. */
  const scenePlay = $derived.by(() => {
    if (!game.facing?.scene) return null;
    const sc = sceneById(game.facing.event);
    if (!sc) return null;
    const st = game.facing.scene;
    return {
      sc, st,
      stage: sc.stages.find((x) => x.id === st.stage) ?? sc.stages[0]!,
      gauges: sc.gauges.filter((g) => !g.hidden || st.shown.includes(g.id)),
      verbs: sc.verbs.filter((v) => !v.stages || v.stages.includes(st.stage)),
    };
  });

  const trouble = $derived.by(() => {
    if (!game.facing) return null;
    if (game.facing.scene) return null;
    const ev = troubleById(game.facing.event);
    if (!ev) return null;
    const rolled = game.facing.rolled;
    const fights = isFoe(ev);
    if (!rolled) return { ev, fights, rolled: null, out: null, canBurn: false, burned: null };
    const choice = ev.choices[rolled.choice]!;
    const stat = (game.stats[choice.stat] ?? 1)
      + (game.building ? kitAdd(game.building.kit, game.building.key) : 0);
    return {
      ev, rolled, fights,
      out: judge(rolled.roll, stat),
      canBurn: burnHelps(rolled.roll, stat, game.momentum),
      burned: judgeBurned(rolled.roll, game.momentum),
    };
  });

  const act = (a: Action): void => {
    game = apply(game, a);
    if (a.type !== 'tick') awayLine = '';
  };

  // ★ ARRIVING SELECTS WHERE YOU ARRIVED, so the place's prose lands in the
  // panel you are already reading instead of above the board.
  //
  // ⚠️ THIS REPLACES A HEADER LINE THE OWNER ASKED THREE TIMES TO BE RID OF,
  // 2026-08-01: *"the text at the top of the screen is not good… there is a text
  // at the top again when I clicked again on the same button, and I'm not sure
  // how to get rid of that text… the text at the top is a problem for sure."*
  //
  // It was `said`, and on arrival it held the WHOLE place body — seven lines of
  // prose above the purse, shoving the board down the page, with nothing to
  // dismiss it and no way to ask for it back. The panel already shows exactly
  // this text when you tap a place. So the header keeps numbers and a button;
  // prose lives in one place, below, and tapping anything else clears it.

  // ★ THE WAY — while a crew is out, Here IS the leg (the owner's design:
  // "it is the separate tab kinda where it happens"). Authored positions
  // along the real path, so no force layout; the fog covers everything but
  // the surveyed corridor.
  const way = $derived(tab === 'here' ? theWay(game) : null);
  const view = $derived(way ? way.view : TABS.find((t) => t.id === tab)!.view(game));
  // The journey's shape never changes, so its layout is the constant solved at
  // load. Every other tab is a filter whose shape follows the run.
  const laid = $derived(tab === 'chapter' ? JOURNEY
    : way ? { spots: way.spots, box: way.box } : solve(view));
  const spotOf = $derived(new Map(laid.spots.map((s) => [s.id, s])));

  // ---- how much of the board the dock is sitting on -------------------------
  //
  // ★ MEASURED AT REST, NOT CONTINUOUSLY, AND THAT IS THE WHOLE TRICK. The
  // panel is short when nothing is selected and tall when something is; if the
  // board re-framed itself to match, the map would jump under your thumb every
  // single tap. The owner asked for the opposite of that once already —
  // *"maybe if we can stop them from jingling it would be best"*.
  //
  // So the map is framed above the panel AT REST. Selecting something grows the
  // dock over the map, which is exactly what "overlaying it in case needed"
  // means, and deselecting settles back to the same picture it started from.
  let panelEl = $state<HTMLElement>();
  let inset = $state(0);
  $effect(() => {
    if (!panelEl) return;
    const el = panelEl;
    const ro = new ResizeObserver(() => {
      if (picked === null) inset = el.offsetHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  const reach = $derived(new Map(roadsOut(game).map((r) => [r.to, r])));
  const chosen = $derived(picked === null ? null : view.nodes.find((n) => n.id === picked) ?? null);
  const deeds = $derived(picked === null ? [] : deedsFor(game, picked));

  const dots = $derived(view.nodes.map((n) => {
    const at = spotOf.get(n.id);
    const isPlace = n.id.startsWith('stop:');
    const num = isPlace ? numOf(n.id) : -1;
    const w = isPlace ? reach.get(num) : undefined;
    return {
      id: n.id, name: n.name, kind: n.kind, r: n.r,
      wx: at?.x ?? 0, wy: at?.y ?? 0, at,
      place: isPlace,
      you: isPlace && num === game.at,
      // OPEN is a road you can lay right now; SHUT is one you cannot yet.
      open: w !== undefined && !w.built && w.cannot === null,
      shut: w !== undefined && !w.built && w.cannot !== null,
      barred: false,
      // ⚠️ "KNOWN" IS HAVING A NAME, for anything that is not a place. This
      // read `!isPlace || …`, so every notion on Thoughts drew at full
      // brightness and full size whether you had thought it or not — the dim
      // dot is the whole way that tab shows progress, and it showed none.
      known: isPlace ? game.seen.includes(num) : n.name !== '',
      on: n.id === picked,
    };
  }).filter((d) => d.at !== undefined));

  /** Edges with the fill the board needs, so the board knows nothing about the
   *  game and the game knows nothing about drawing. */
  /** ★ HOW HARD EACH ROAD IS WORKING. Solved once per frame from the network,
   *  not per line — max flow is a whole-graph answer and asking it edge by edge
   *  would be both wrong and 35 times the work. */
  const busy = $derived(loadOf(game));
  const hops = $derived(hopsFrom(game));

  /** ★ THE KING'S ROAD FEED, chapter only: a cased line entering from off the
   *  top of the map and ending on the Start — the source of the trickle,
   *  visible instead of implied. The first point sits above the camera's box
   *  on purpose: it comes in FROM OFFSCREEN, which is the owner's ask verbatim. */
  const feed = $derived.by(() => {
    if (tab !== 'chapter') return null;
    const s = spotOf.get(stopId(START));
    if (!s) return null;
    return [
      { x: s.x + 26, y: laid.box.y - 60 },
      { x: s.x + 10, y: laid.box.y + 18 },
      { x: s.x, y: s.y },
    ];
  });

  const lines = $derived(way ? way.lines : view.edges.map((e) => {
    const road = e.rel === 'road' && e.a.startsWith('stop:') && e.b.startsWith('stop:');
    const key = road ? roadKey(numOf(e.a), numOf(e.b)) : '';
    // ⚠️ THE FILL GROWS FROM THE END YOU LAID IT FROM. The view emits every
    // road low-id-first, so without this swap the fill drew from whichever end
    // happened to have the smaller number — the bug the owner reported twice.
    // The engine knows the right end: `building.from`.
    const backwards = road && game.building?.key === key
      && game.building.from !== numOf(e.a);
    // ★ THE BEND, chapter only: paths are baked in AUTHORED coordinates, and
    // only the chapter draws stops where they are authored. Oriented so the
    // path's first point is always this line's `a` — the end the fill grows
    // from.
    const bent = road && tab === 'chapter' ? pathOf(numOf(e.a), numOf(e.b)) : null;
    const lowFirst = road && numOf(e.a) < numOf(e.b);
    const aFirst = backwards ? !lowFirst : lowFirst;
    return {
      a: backwards ? e.b : e.a, b: backwards ? e.a : e.b, rel: e.rel,
      pts: bent ? (aFirst ? [...bent] : [...bent].reverse()) : undefined,
      fill: road ? fillOf(game, numOf(e.a), numOf(e.b)) : 1,
      gauge: road ? (game.gauge[key] ?? 0) : 0,
      load: road ? (busy.get(key) ?? 0) : 0,
      // The crawl direction: mana runs from fewer hops to more. Along the
      // line's own a→b after any fill-orientation swap.
      dir: road ? (() => {
        const ha = hops.get(backwards ? numOf(e.b) : numOf(e.a));
        const hb = hops.get(backwards ? numOf(e.a) : numOf(e.b));
        if (ha === undefined || hb === undefined || ha === hb) return 0;
        return ha < hb ? 1 : -1;
      })() : 0,
    };
  }));

  // ★ THE FOG OF WAR, chapter only, and gone for good once every stop has been
  // stood at — a finished chapter deserves its finished chart. Holes around
  // every stop you have SEEN (your ken names more, but names are not charts),
  // and along every pipe with any work in it, plus the king's-road feed.
  const fog = $derived.by(() => {
    if (charted(game)) return null;
    // ★ ON THE WAY TOO — the owner: *"there's no fog of war in here tab."*
    // The corridor the crew surveys is clear; the land beyond it is still
    // parchment, and the far stop's surroundings stay unknown until you have
    // stood there.
    if (way) {
      const spots = way.spots
        .filter((p) => p.id.startsWith('stop:') && game.seen.includes(numOf(p.id)))
        .map((p) => ({ x: p.x, y: p.y }));
      return { spots, runs: [way.lines.flatMap((l) => l.pts)] };
    }
    if (tab !== 'chapter') return null;
    const spots: { x: number; y: number }[] = [];
    for (const id of game.seen) {
      const p = spotOf.get(stopId(id));
      if (p) spots.push({ x: p.x, y: p.y });
    }
    const runs = lines.filter((l) => l.fill > 0 && l.pts).map((l) => l.pts!);
    if (feed) runs.push(feed);
    return { spots, runs };
  });

  // ---- the clock, and the only one ----------------------------------------
  onMount(() => {
    void (async () => {
      const back = await load();
      if (back) {
        const secs = Math.min(elapsedSince(back.savedAt), 12 * 3600);
        game = secs > 1 ? apply(back.game, { type: 'tick', secs }) : back.game;
        const got = game.mana - back.game.mana;
        if (got > 0) {
          const h = secs / 3600;
          awayLine = `Away ${h >= 1 ? `${h.toFixed(1)} hours` : `${Math.round(secs / 60)} minutes`}`
            + ` — ${got} mana gathered.`;
        }
      }
      ready = true;
    })();

    // ★ THE PALETTE, HANDED TO THE PROBE. `scripts/play-tabs.mjs` checks the
    // board by counting pixels of a known colour, and it used to carry its own
    // copy of every hex — so the app could change a colour and the probe would
    // go on counting the old one, find none missing, and pass. Reading it off
    // the running page means the probe can only ever check what is really drawn.
    (window as unknown as { __INK: typeof INK; __TOL: typeof TOL }).__INK = INK;
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

  // A fixed interval, never a debounce: the state changes five times a second,
  // so a debounce is starved for exactly as long as the player is playing. That
  // shipped twice and ate a run both times.
  let lastSaved = '';
  $effect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const now = JSON.stringify(game);
      if (now === lastSaved) return;
      lastSaved = now;
      void save(game);
    }, 2000);
    return () => clearInterval(id);
  });
  $effect(() => {
    const flush = (): void => { if (ready) { lastSaved = JSON.stringify(game); void save(game); } };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  });

  function tap(id: string): void {
    // ★ TAP THE CREW, PUSH THE WORK — the owner: *"you need to tap something
    // to do it."* On the way, the crew mark is the work button: each tap is
    // PUSH_SECS of work, and it never toggles the selection out from under a
    // thumb that is drumming on it.
    if (way && id === DOING) {
      act({ type: 'push' });
      return;
    }
    if (arming && picked !== null && id !== picked) {
      // The second tap of a connection: opens PREPARE for that leg — unless
      // the pipe is already laid, in which case it is a widen and starts flat.
      if (id.startsWith('stop:') && picked.startsWith('stop:')) {
        const to = numOf(id);
        if (game.gauge[roadKey(game.at, to)]) {
          act({ type: 'build', to, kit: 'cart' });
          if (game.building) tab = 'here';
        } else prep = to;
        picked = id;
      }
      arming = false;
      return;
    }
    arming = false;
    prep = null;
    found = null;
    picked = picked === id ? null : id;
  }
  /** One place that turns a deed into an action, so the markup carries no
   *  knowledge of the engine and a new deed is a case rather than a ternary. */
  function doDeed(d: { kind: string; to: number }): void {
    if (d.kind === 'go') { go(d.to); return; }
    if (d.kind !== 'build') return;
    // ★ PREPARE IS FOR FRESH GROUND ONLY. A widen meets no hidden stops —
    // no rolls, so a kit choice there would be a question with no answer
    // riding on it. The crew just gets to work.
    if (game.gauge[roadKey(game.at, d.to)]) {
      act({ type: 'build', to: d.to, kit: 'cart' });
      if (game.building) { tab = 'here'; picked = stopId(d.to); }
    } else prep = d.to;
  }
  function setOff(kit: Kit): void {
    if (prep === null) return;
    const to = prep;
    act({ type: 'build', to, kit });
    prep = null;
    // ★ SETTING OFF TAKES YOU TO THE WAY — the owner: *"we should
    // automatically switch to the second tab when we start journey."*
    if (game.building) { tab = 'here'; picked = stopId(to); }
  }
  /** The end of a scavenge: roll here, judge in the engine, say the arithmetic
   *  out loud — the same honesty as the trouble dock, in one line. */
  function gather(): void {
    if (!game.foraging || game.foraging.left > 0) return;
    const stat = game.foraging.stat;
    const s = game.stats[stat] ?? 1;
    const roll = { a: d(6), c1: d(10), c2: d(10) };
    const out = judge(roll, s);
    act({ type: 'gather', roll });
    const swing = out.twist ? 2 : 1;
    const greedy = stat === 'shadow';
    found = `You rolled ${roll.a} + ${stat} ${s} = ${out.score}, against `
      + `${roll.c1} and ${roll.c2} — `
      + (out.tier === 'strong' ? `a strong hit. +${1 + swing + (greedy ? 1 : 0)} provisions.`
        : out.tier === 'weak' ? `a weak hit. +1 provision${greedy ? ', momentum falls' : ''}.`
        : greedy ? 'a miss. Caught — a provision gone, momentum falls hard.'
        : 'a miss. Nothing — momentum dips.');
  }
  function go(to: number): void {
    act({ type: 'go', to });
    picked = `stop:${to}`;
    arming = false;
  }

  /** Where you stand, so Connect can offer itself from the selected node. */
  const canArm = $derived(picked !== null && picked === `stop:${game.at}`
    && game.building === null
    && STOP.get(game.at)!.near.some((to) => unbuildable(game, to) === null));
</script>

<main>
  <header>
    <div class="purse">
      <!-- ★ THE SPRING IS UNDER YOUR THUMB. The owner: *"for mana, we should
           make it a tapable resource so that you have to tap, tap, tap in
           order to get it, and this is your idle element."* Each press is the
           `tap` action — the engine does the arithmetic, the shell only asks. -->
      <button class="spring" onclick={() => act({ type: 'tap' })}>
        <b>{game.mana}</b><span>mana</span>
        <em>+0.4 a tap</em>
      </button>
      <!-- ★ THE RATE IS SOLVED FROM THE GRAPH and it moves, so the header has
           to say what it is now rather than quote a constant. When you are
           working it is zero, and that is the point of working. -->
      <span class="rate">+{manaRate(game).toFixed(2)} a second</span>
      <span class="keep">{game.provisions} provisions</span>
      {#if crossed(game)}<span class="crossed">crossed</span>{/if}
      <button class="reset" class:armed={wiping}
        onclick={async () => {
          if (!wiping) {
            wiping = true;
            setTimeout(() => (wiping = false), 3000);
            return;
          }
          wiping = false;
          await wipe(); game = initial(); picked = null;
        }}>
        {wiping ? 'Wipe it? Tap again' : 'Start over'}
      </button>
    </div>
  </header>

  <nav>
    {#each TABS as t (t.id)}
      <button class:on={t.id === tab}
        onclick={() => { tab = t.id; picked = null; }}>{t.label}</button>
    {/each}
  </nav>

  <!-- THE GRAPH. Canvas for the lines and the dots, DOM for every word and
       every tap target, laid out by d3-force and settled. See Board.svelte. -->
  <section class="map">
    <!-- ⚠️ SCENERY AND DRAGGING ARE BOTH JOURNEY-ONLY DECISIONS, and they are
         opposite ways round. The world has ground; a filter over it does not.
         And the Journey is a MAP, so its nodes do not move — the owner asked
         for exactly that. Everywhere else a dot is a diagram and nudging one
         is harmless. -->
    <Board {dots} {lines} box={laid.box} label={tab} onTap={tap}
      decor={tab === 'chapter' || way ? TERRAIN_SHAPES : []}
      drag={tab !== 'chapter' && !way} {inset} feed={way ? null : feed}
      pulse={game.mana} {fog} />
  </section>

  <!-- THE PANEL. Part of the page, below the graph, in flow. It is empty until
       you tap something, and it says so rather than appearing from nowhere. -->
  <section class="panel" bind:this={panelEl}>
    {#if scenePlay}
      <!-- ★★ THE SCENE. Gauges drift, verbs are taps, stages branch — the
           owner's design: "each event a little incremental game of its own". -->
      <h2>{scenePlay.sc.name}</h2>
      <p>{scenePlay.stage.text}</p>
      {#each scenePlay.gauges as gg (gg.id)}
        {@const v = scenePlay.st.gauges[gg.id] ?? gg.start}
        <div class="dial" data-gauge={gg.id}>
          <span>{gg.label}</span>
          <div class="meter"><div class="bar" data-bar={gg.id}
            style="width:{Math.round(((v - gg.min) / (gg.max - gg.min)) * 100)}%"></div></div>
        </div>
      {/each}
      {#each scenePlay.verbs as v (v.id)}
        <button class="deed face"
          disabled={(v.mana ?? 0) > game.mana || (v.provisions ?? 0) > game.provisions}
          onclick={() => act({ type: 'scene', verb: v.id })}>
          {v.label}
          <em>{v.note}</em>
        </button>
      {/each}
    {:else if trouble}
      <!-- ★ SOMETHING STANDS IN THE WAY. The work is stopped and this outranks
           whatever was selected — it is the owner's design: "block progress
           until resolved". Still the one dock, still nothing to dismiss. -->
      <h2>{trouble.ev.name}</h2>
      {#if game.facing?.foe}
        <p class="note">{trouble.fights ? 'Its strength' : 'Work in it'}:
          {game.facing.foe.left}. A strong hit clears two, a weak hit one —
          the way opens when none is left.</p>
      {/if}
      {#if !trouble.rolled}
        <p>{trouble.ev.body}</p>
        {#each trouble.ev.choices as c, i (c.label)}
          <button class="deed face" onclick={() => act({ type: 'face', choice: i,
            roll: { a: d(6), c1: d(10), c2: d(10) } })}>
            {c.label}
            <em>{c.stat} {game.stats[c.stat]}, against two</em>
          </button>
        {/each}
      {:else}
        {@const c = trouble.ev.choices[trouble.rolled.choice]!}
        <p class="dice">You rolled {trouble.rolled.roll.a} + {c.stat}
          {game.stats[c.stat]}{#if game.building && kitAdd(game.building.kit, game.building.key) !== 0}
            {' '}{kitAdd(game.building.kit, game.building.key) > 0 ? '+' : ''}{kitAdd(game.building.kit, game.building.key)} {game.building.kit}{/if}
          = {trouble.out.score}, against
          {trouble.rolled.roll.c1} and {trouble.rolled.roll.c2} —
          <b>{trouble.out.tier === 'strong' ? 'a strong hit'
            : trouble.out.tier === 'weak' ? 'a weak hit' : 'a miss'}</b>{trouble.out.twist
            ? ', and the dice matched' : ''}.</p>
        <p>{c[trouble.out.tier]}</p>
        <button class="deed face" onclick={() => act({ type: 'carry' })}>
          Carry on
          <em>{trouble.out.tier === 'strong' ? 'momentum rises'
            : trouble.out.tier === 'weak' ? 'it eats a provision'
            : 'the work slides back'}</em>
        </button>
        {#if trouble.canBurn}
          <button class="deed arm" onclick={() => act({ type: 'burn' })}>
            Burn momentum ({game.momentum >= 0 ? '+' : ''}{game.momentum})
            <em>overrule the dice — it resets to +2</em>
          </button>
        {/if}
      {/if}
    {:else if chosen}
      <h2>{chosen.name || (chosen.kind === 'way' ? 'The way ahead'
        : 'A stop you have not stood at')}</h2>
      {#if chosen.body}<p>{chosen.body}</p>{/if}
      <!-- An unnamed dot is a promise, not a bug — the same one the Journey
           makes about a place you have not reached. Say which promise it is. -->
            {#each deeds as d (`${d.kind}${d.to}`)}
        <button class="deed" class:make={d.kind === 'build'}
          disabled={d.why !== null} onclick={() => doDeed(d)}>
          {d.label}
          <em>{d.note}</em>
        </button>
      {/each}
      {#if prep !== null && picked === `stop:${prep}` && unbuildable(game, prep) === null}
        <!-- ★ PREPARE. The kit is the choice that outlives the tap: it rides
             every roll on the leg, +1 suited and -1 wrong. Said up front, so
             setting off badly is a decision rather than a surprise. -->
        <p class="note">Set off how? The ground is
          {legGround(roadKey(game.at, prep))}.</p>
        {#each KITS as k (k)}
          {@const add = kitAdd(k, roadKey(game.at, prep))}
          <button class="deed" class:make={add > 0}
            disabled={add > 0 && game.provisions < 1} onclick={() => setOff(k)}>
            Set off with the {k}
            <em>{add > 0 ? (game.provisions < 1
                ? 'nothing left to stock it with'
                : '+1 every roll — costs 1 provision to stock')
              : add < 0 ? '-1 every roll — wrong tool, travels light'
              : 'no help, no harm'}</em>
          </button>
        {/each}
      {/if}
      {#if canArm}
        <button class="deed arm" class:armed={arming} onclick={() => (arming = !arming)}>
          {arming ? 'Now tap the far stop' : 'Open a flow…'}
          <em>{arming ? 'or tap here again to cancel' : 'tap a stop beside this one'}</em>
        </button>
      {/if}
      {#if picked === `stop:${game.at}`}
        <!-- ★ SCAVENGE — Ironsworn's Resupply, the owner's ask: *"so, like,
             scavenge for provisions."* Stat chosen going in, dice at the end,
             and the price is the time the crew is not laying pipe. -->
        {#if game.foraging === null}
          {@const cant = unforageable(game)}
          <button class="deed" disabled={cant !== null}
            onclick={() => { found = null; act({ type: 'forage', stat: 'wits' }); }}>
            Scavenge the open ground
            <em>{cant ?? `wits ${game.stats.wits} · ${FORAGE_SECS}s · safe — small finds, gentle misses`}</em>
          </button>
          <button class="deed" disabled={cant !== null}
            onclick={() => { found = null; act({ type: 'forage', stat: 'shadow' }); }}>
            Scavenge by shadow
            <em>{cant ?? `shadow ${game.stats.shadow} · ${FORAGE_SECS}s · greedy — bigger finds, a miss gets you caught`}</em>
          </button>
        {:else if game.foraging.left > 0}
          <p class="note">Scavenging — {Math.ceil(game.foraging.left)}s left.</p>
        {:else}
          <button class="deed face" onclick={gather}>
            See what the crew found
            <em>{game.foraging.stat} {game.stats[game.foraging.stat]}, against two</em>
          </button>
        {/if}
        {#if found}<p class="dice">{found}</p>{/if}
      {/if}
      <!-- The Here tab carries the countdown on a dot of its own, so saying it
           again underneath would be the same number twice on one screen. -->
      {#if game.building && chosen.id !== DOING}
        <p class="note">Opening the flow — {Math.ceil(game.building.left)}s left.
          It keeps going while the game is closed.</p>
      {/if}
      {#if !deeds.length && chosen.id.startsWith('stop:') && numOf(chosen.id) === game.at}
        <p class="note">You are here. Tap a stop beside you to open a flow.</p>
      {/if}
    {:else if awayLine}
      <!-- What you missed while the phone was in a pocket. It sits where the
           panel already is, so it is not a second surface, and tapping any dot
           replaces it. -->
      <p class="away">{awayLine}</p>
      <p class="note">Tap a stop.</p>
    {:else}
      <p class="note">Tap a stop.</p>
    {/if}
  </section>
</main>

<style>
  :global(html) { --safe-t: env(safe-area-inset-top, 0px);
    --safe-b: env(safe-area-inset-bottom, 0px); }
  :global(body) { margin: 0; background: #e8e0d0; color: #33302a;
    font: 16px/1.5 ui-sans-serif, system-ui, sans-serif; -webkit-text-size-adjust: 100%; }

  /* ⚠️ THIS REVERSES A RULE THAT HELD FOR MONTHS, AND IT IS THE OWNER'S CALL.
     It used to read: "A column of blocks in normal flow. No fixed positioning,
     no viewport units, nothing measured against the window — so there is no
     alignment to get wrong, and nothing can end up on top of anything else."
     That was written against sheets that appeared over the game with no way to
     dismiss them, and it is why the panel sat in flow.

     The owner, 2026-08-02: *"the canvas on mobile can take more space
     vertically while the text could be at the very bottom overlaying it in case
     needed but like always snipped to bottom of the screen."*

     So the column is now exactly one screen tall and the board takes whatever
     header and tabs do not. THE OLD RULE SURVIVES IN A NARROWER FORM, and
     `scripts/play-tabs.mjs` enforces it: the panel may overlay the BOARD,
     pinned to the bottom; nothing may overlay the PANEL; and the header and
     tabs are still in flow above a board that never slides under them.

     `dvh`, not `vh`: on iOS the URL bar shows and hides, and `vh` is the tall
     one always — a `100vh` column is taller than the screen the whole time the
     bar is showing, which puts the "pinned to the bottom" panel below the fold. */
  main { max-width: 560px; margin: 0 auto; height: 100dvh; box-sizing: border-box;
    display: flex; flex-direction: column;
    padding: calc(10px + var(--safe-t)) 14px 0; }

  header { border-bottom: 1px solid #c3b8a2; padding-bottom: 10px; }
  .panel .away { margin: 0 0 6px; color: #8a5a12; font-size: 15px; }
  .purse { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
  /* The spring: the number IS the button. Generous padding for a thumb that
     will hit it a hundred times, and the press is shown by the button, not by
     the page — nothing else may move under a tap-tap-tap. */
  .spring {
    display: inline-flex; align-items: baseline; gap: 7px;
    border: 1px solid #d8cdb8; border-radius: 12px; background: #f6f0e2;
    /* ★ A THUMB-SIZED TARGET — the owner: "tap button is too small". 48px
       tall, wide from its padding, and the header stays under the probe's
       96px prose ceiling. */
    min-height: 48px; min-width: 128px; align-items: center;
    padding: 4px 18px; margin: -4px 0; cursor: pointer;
    transition: transform 60ms;
    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    user-select: none; -webkit-user-select: none;
  }
  .spring:active { transform: scale(0.95); background: #efe6d2; }
  .spring em { color: #a89a80; font-size: 12px; font-style: normal; }
  .reset.armed { border-color: #b03050; color: #b03050; font-weight: 600; }
  .purse b { font-size: 22px; color: #1f6b3a; }
  /* Scene gauges: a label and a thin bar, nothing that needs reading twice. */
  .dial { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .dial span { font-size: 13px; color: #6a6154; min-width: 108px; }
  .meter { flex: 1; height: 10px; border-radius: 5px; background: #e3ddd0;
    border: 1px solid #d2c9b6; overflow: hidden; }
  .meter .bar { height: 100%; background: #1d7f86; transition: width 300ms; }
  .spring b { font-size: 28px; }
  .purse span { color: #6a6154; font-size: 14px; }
  .purse .rate { color: #8c8272; }
  .purse .keep { color: #7a5a2a; }
  .reset { margin-left: auto; padding: 8px 12px; border-radius: 8px; background: none;
    border: 1px solid #b6ab94; color: #6a6154; font: inherit; font-size: 13px; }

  nav { display: flex; gap: 6px; margin: 12px 0 4px; }
  nav button { flex: 1; min-height: 44px; padding: 8px 4px; border-radius: 10px;
    background: #f2ece0; border: 1px solid #c3b8a2; color: #6a6154; font: inherit;
    font-size: 14px; }
  nav button.on { background: #fdfaf2; border-color: #7a4a22; color: #3f3a33;
    font-weight: 600; }

  /* The board draws itself; all that is left here is the space it sits in —
     which is now ALL of it. `min-height: 0` because a flex child will not
     shrink below its content without it, and the canvas counts as content. */
  .map { flex: 1; min-height: 0; margin: 10px 0 0; }

  /* ★ PINNED TO THE BOTTOM OF THE SCREEN, OVER THE BOARD. Translucent rather
     than solid so the map keeps going underneath it — the board paints its full
     height and only the FRAMING stops short (see `inset` in Board.svelte), so
     what is behind the panel is real map rather than a gap.

     ⚠️ `max-height` AND `overflow-y`: a long body plus two deeds must scroll
     inside the dock instead of growing up the screen until it is the whole
     phone. That is the failure mode that made the old sheet unbearable. */
  .panel { position: fixed; left: 0; right: 0; bottom: 0; z-index: 2;
    max-width: 560px; margin: 0 auto; box-sizing: border-box;
    padding: 10px 14px calc(10px + var(--safe-b));
    max-height: 62dvh; overflow-y: auto;
    background: rgba(248, 244, 234, .94); border-top: 1px solid #c3b8a2;
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  .panel h2 { margin: 0 0 6px; font-size: 20px; }
  .panel p { margin: 0; color: #4a453c; font-size: 16px; }
  .note { color: #8c8272 !important; font-style: italic; }
  .deed { display: block; width: 100%; box-sizing: border-box; min-height: 56px;
    margin-top: 10px; padding: 12px 14px; border-radius: 12px; text-align: left;
    background: #fdfaf2; border: 1px solid #a8907a; color: #3f3a33; font: inherit;
    font-size: 17px; }
  .deed em { display: block; margin-top: 2px; font-style: normal; font-size: 14px;
    color: #6a6154; }
  .deed.make { background: #dff0dc; border-color: #1f7a3f; }
  /* Working is the other thing the clock can do, so it does not look like the
     thing that spends paces. */

  .purse .crossed { color: #1f6b3a; font-weight: 600; }
  /* ⚠️ LAST, SO IT WINS. This rule sat ABOVE `.deed.make` at the same
     specificity, so every disabled forge and every disabled settle drew in the
     live green and only the cursor said otherwise. The oldest complaint this
     game has is "I just randomly clicked around until I got to a stop"; a
     button that looks alive and is not is exactly that, and it took a
     screenshot of a shut Settle to see it. */
  .deed:disabled { background: #e3ddd0; border-color: #c3b8a2; color: #93897a; }
  .deed.arm { background: #f0ece2; }
  .deed.arm.armed { background: #fbeccd; border-color: #c8781a; color: #7a4a10; }
</style>
