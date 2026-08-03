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
  import { TABS, deedsFor, numOf, DOING, type TabId } from '../game/world';
  import { solve, JOURNEY } from '../game/layout';
  import Board from './Board.svelte';
  import { TERRAIN_SHAPES } from '../game/terrain';
  import { INK, TOL } from '../game/ink';
  import { apply, initial, roadsOut, unbuildable, manaRate, fillOf, crossed,
    loadOf, roadKey, type Game, type Action } from '../game/engine';
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

  const view = $derived(TABS.find((t) => t.id === tab)!.view(game));
  // The journey's shape never changes, so its layout is the constant solved at
  // load. Every other tab is a filter whose shape follows the run.
  const laid = $derived(tab === 'chapter' ? JOURNEY : solve(view));
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

  const lines = $derived(view.edges.map((e) => {
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
    };
  }));

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
    if (arming && picked !== null && id !== picked) {
      // The second tap of a connection. Only places can be joined.
      if (id.startsWith('stop:') && picked.startsWith('stop:')) {
        act({ type: 'build', to: numOf(id) });
      }
      arming = false;
      return;
    }
    arming = false;
    picked = picked === id ? null : id;
  }
  /** One place that turns a deed into an action, so the markup carries no
   *  knowledge of the engine and a new deed is a case rather than a ternary. */
  function doDeed(d: { kind: string; to: number }): void {
    if (d.kind === 'go') { go(d.to); return; }
    if (d.kind === 'build') act({ type: 'build', to: d.to });
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
      <b>{game.mana}</b><span>mana</span>
      <!-- ★ THE RATE IS SOLVED FROM THE GRAPH and it moves, so the header has
           to say what it is now rather than quote a constant. When you are
           working it is zero, and that is the point of working. -->
      <span class="rate">+{manaRate(game).toFixed(2)} a second</span>
      {#if crossed(game)}<span class="crossed">crossed</span>{/if}
      <button class="reset" onclick={async () => { await wipe(); game = initial(); picked = null; }}>
        Start over
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
      decor={tab === 'chapter' ? TERRAIN_SHAPES : []}
      drag={tab !== 'chapter'} {inset} />
  </section>

  <!-- THE PANEL. Part of the page, below the graph, in flow. It is empty until
       you tap something, and it says so rather than appearing from nowhere. -->
  <section class="panel" bind:this={panelEl}>
    {#if chosen}
      <h2>{chosen.name || 'A stop you have not stood at'}</h2>
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
      {#if canArm}
        <button class="deed arm" class:armed={arming} onclick={() => (arming = !arming)}>
          {arming ? 'Now tap the far stop' : 'Lay a pipe…'}
          <em>{arming ? 'or tap here again to cancel' : 'tap a stop beside this one'}</em>
        </button>
      {/if}
      <!-- The Here tab carries the countdown on a dot of its own, so saying it
           again underneath would be the same number twice on one screen. -->
      {#if game.building && chosen.id !== DOING}
        <p class="note">Laying pipe — {Math.ceil(game.building.left)}s left.
          It keeps going while the game is closed.</p>
      {/if}
      {#if !deeds.length && chosen.id.startsWith('stop:') && numOf(chosen.id) === game.at}
        <p class="note">You are here. Tap a stop beside it to lay pipe toward it.</p>
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
  .purse b { font-size: 22px; color: #1f6b3a; }
  .purse span { color: #6a6154; font-size: 14px; }
  .purse .rate { color: #8c8272; }
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
