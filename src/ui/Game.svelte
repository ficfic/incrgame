<script lang="ts">
  // FOUR TABS, EACH A GRAPH, AND NOTHING IS EVER DRAWN OVER ANYTHING ELSE.
  //
  // ⚠️ THAT LAST CLAUSE IS THE WHOLE SPEC. The owner, after playing: "as soon as
  // I opened the game, some text pop-up opened on top of the pop-up which
  // happens when you click on a graph node — this is why it was very confusing,
  // I had to close the text pop-up and then the graph actions would have
  // opened." Every previous screen put prose over the board, a card over the
  // dots, a sheet over the card. `docs/TABS.md` R2.2 forbids it outright and
  // that rule outranks any layout convenience here.
  //
  // So: one tab at a time, in normal flow, top to bottom. The graph, then the
  // panel for whatever is selected. No modal, no sheet, no absolute positioning
  // over the canvas, nothing to dismiss.
  import { onMount } from 'svelte';
  import { PLACE, PLACES } from '../game/places';
  import { TABS, deedsFor, numOf, fillOf, DOING, type TabId } from '../game/world';
  import { solve, JOURNEY } from '../game/layout';
  import Board from './Board.svelte';
  import { TERRAIN } from '../game/terrain';
  import { apply, initial, waysFrom, unforgeable, SECS_PER_PACE,
    type Game, type Action } from '../game/engine';
  import { load, save, wipe, elapsedSince } from '../game/store';

  let game = $state<Game>(initial());
  let ready = $state(false);
  let tab = $state<TabId>('journey');
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
  const laid = $derived(tab === 'journey' ? JOURNEY : solve(view));
  const spotOf = $derived(new Map(laid.spots.map((s) => [s.id, s])));

  const reach = $derived(new Map(waysFrom(game).map((w) => [w.to, w])));
  const chosen = $derived(picked === null ? null : view.nodes.find((n) => n.id === picked) ?? null);
  const deeds = $derived(picked === null ? [] : deedsFor(game, picked));

  const dots = $derived(view.nodes.map((n) => {
    const at = spotOf.get(n.id);
    const isPlace = n.id.startsWith('place:');
    const num = isPlace ? numOf(n.id) : -1;
    const w = isPlace ? reach.get(num) : undefined;
    return {
      id: n.id, name: n.name, kind: n.kind,
      wx: at?.x ?? 0, wy: at?.y ?? 0, at,
      place: isPlace,
      you: isPlace && num === game.at,
      open: w !== undefined && w.why === null,
      shut: w !== undefined && w.why !== null,
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
  const lines = $derived(view.edges.map((e) => ({
    a: e.a, b: e.b, rel: e.rel,
    fill: e.rel === 'route' && e.a.startsWith('place:')
      ? fillOf(game, numOf(e.a), numOf(e.b)) : 1,
  })));

  // ---- the clock, and the only one ----------------------------------------
  onMount(() => {
    void (async () => {
      const back = await load();
      if (back) {
        const secs = Math.min(elapsedSince(back.savedAt), 12 * 3600);
        game = secs > 1 ? apply(back.game, { type: 'tick', secs }) : back.game;
        const got = game.paces - back.game.paces;
        if (got > 0) {
          const h = secs / 3600;
          awayLine = `Away ${h >= 1 ? `${h.toFixed(1)} hours` : `${Math.round(secs / 60)} minutes`}`
            + ` — ${got} ${got === 1 ? 'pace' : 'paces'} gathered.`;
        }
      }
      ready = true;
    })();

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
      if (id.startsWith('place:') && picked.startsWith('place:')) {
        act({ type: 'forge', to: numOf(id) });
      }
      arming = false;
      return;
    }
    arming = false;
    picked = picked === id ? null : id;
  }
  function go(to: number): void {
    act({ type: 'go', to });
    picked = `place:${to}`;
    arming = false;
  }

  /** Where you stand, so Connect can offer itself from the selected node. */
  const canArm = $derived(picked !== null && picked === `place:${game.at}`
    && game.forging === null
    && PLACE.get(game.at)!.ways.some((to) => unforgeable(game, to) === null));
</script>

<main>
  <header>
    <div class="purse">
      <b>{game.paces}</b><span>{game.paces === 1 ? 'pace' : 'paces'}</span>
      <span class="rate">+1 every {SECS_PER_PACE}s, always</span>
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
      terrain={tab === 'journey' ? TERRAIN : null}
      drag={tab !== 'journey'} />
  </section>

  <!-- THE PANEL. Part of the page, below the graph, in flow. It is empty until
       you tap something, and it says so rather than appearing from nowhere. -->
  <section class="panel">
    {#if chosen}
      <h2>{chosen.name
        || (chosen.kind === 'concept' ? 'Not thought yet' : 'Somewhere you have not been')}</h2>
      {#if chosen.body}<p>{chosen.body}</p>{/if}
      <!-- An unnamed dot is a promise, not a bug — the same one the Journey
           makes about a place you have not reached. Say which promise it is. -->
      {#if !chosen.name && chosen.kind === 'concept'}
        <p class="note">Something the valley has not had occasion to teach you.
          It fills in by itself, from what you do.</p>
      {/if}
      {#each deeds as d (`${d.kind}${d.to}`)}
        <button class="deed" class:make={d.kind === 'forge'} disabled={d.why !== null}
          onclick={() => (d.kind === 'go' ? go(d.to) : act({ type: 'forge', to: d.to }))}>
          {d.label}
          <em>{d.note}</em>
        </button>
      {/each}
      {#if canArm}
        <button class="deed arm" class:armed={arming} onclick={() => (arming = !arming)}>
          {arming ? 'Now tap where it should go' : 'Connect…'}
          <em>{arming ? 'or tap here again to stop' : 'tap a neighbouring dot to make a way to it'}</em>
        </button>
      {/if}
      <!-- The Here tab carries the countdown on a dot of its own, so saying it
           again underneath would be the same number twice on one screen. -->
      {#if game.forging && chosen.id !== DOING}
        <p class="note">Making a way — {Math.ceil(game.forging.left)}s left.
          It carries on while this is shut.</p>
      {/if}
      {#if !deeds.length && chosen.id.startsWith('place:') && numOf(chosen.id) === game.at}
        <p class="note">You are standing here.</p>
      {/if}
    {:else if awayLine}
      <!-- What you missed while the phone was in a pocket. It sits where the
           panel already is, so it is not a second surface, and tapping any dot
           replaces it. -->
      <p class="away">{awayLine}</p>
      <p class="note">Tap a dot.</p>
    {:else}
      <p class="note">Tap a dot.</p>
    {/if}
  </section>
</main>

<style>
  :global(html) { --safe-t: env(safe-area-inset-top, 0px);
    --safe-b: env(safe-area-inset-bottom, 0px); }
  :global(body) { margin: 0; background: #070b10; color: #dfe9f0;
    font: 16px/1.5 ui-sans-serif, system-ui, sans-serif; -webkit-text-size-adjust: 100%; }

  /* A column of blocks in normal flow. No fixed positioning, no viewport units,
     nothing measured against the window — so there is no alignment to get
     wrong, and nothing can end up on top of anything else. */
  main { max-width: 560px; margin: 0 auto;
    padding: calc(10px + var(--safe-t)) 14px calc(28px + var(--safe-b)); }

  header { border-bottom: 1px solid #16232f; padding-bottom: 10px; }
  .panel .away { margin: 0 0 6px; color: #ffd479; font-size: 15px; }
  .purse { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
  .purse b { font-size: 22px; color: #8ff0cf; }
  .purse span { color: #8fa6b6; font-size: 14px; }
  .purse .rate { color: #5d7182; }
  .reset { margin-left: auto; padding: 8px 12px; border-radius: 8px; background: none;
    border: 1px solid #2b4356; color: #8fa6b6; font: inherit; font-size: 13px; }

  nav { display: flex; gap: 6px; margin: 12px 0 4px; }
  nav button { flex: 1; min-height: 44px; padding: 8px 4px; border-radius: 10px;
    background: #0d151d; border: 1px solid #24384a; color: #8fa6b6; font: inherit;
    font-size: 14px; }
  nav button.on { background: #12222e; border-color: #2f5568; color: #eafff7;
    font-weight: 600; }

  /* The board draws itself; all that is left here is the space it sits in. */
  .map { margin: 10px 0 4px; }

  .panel { margin-top: 6px; min-height: 132px; }
  .panel h2 { margin: 0 0 6px; font-size: 20px; }
  .panel p { margin: 0; color: #c8d8e4; font-size: 16px; }
  .note { color: #6f8798 !important; font-style: italic; }
  .deed { display: block; width: 100%; box-sizing: border-box; min-height: 56px;
    margin-top: 10px; padding: 12px 14px; border-radius: 12px; text-align: left;
    background: #12222e; border: 1px solid #2f5568; color: #cdf3e6; font: inherit;
    font-size: 17px; }
  .deed em { display: block; margin-top: 2px; font-style: normal; font-size: 14px;
    color: #8fb6c4; }
  .deed:disabled { background: #14161a; border-color: #3a3320; color: #b9a276; }
  .deed.make { background: #16362f; border-color: #3f7d6b; }
  .deed.arm { background: #0f1a24; }
  .deed.arm.armed { background: #1d1a10; border-color: #6b5720; color: #ffd479; }
</style>
