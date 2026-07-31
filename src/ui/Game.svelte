<script lang="ts">
  // THE SCREEN. Plain DOM, top to bottom, and nothing that can be misaligned.
  //
  // ⚠️ WHAT THIS REPLACES AND WHY. The last screen drew the board on a canvas
  // with a force layout and a fitted camera. Every visual defect of the last
  // day came out of that one subsystem — dots stacked inside 30px, labels
  // colliding, a card covering the controls, the camera sized by the window
  // while the box was `100dvh`. A headless browser has no URL bar, no notch and
  // no chrome, so the harness agreed with itself every time and the owner's
  // phone did not.
  //
  // So there is no canvas here, no camera, no layout solver, and nothing is
  // absolutely positioned. It is a column: where you are, what you can do, and
  // where you can go. The graph comes back when it has earned its way back, as
  // a thing you open — not as the floor everything else is balanced on.
  import { onMount } from 'svelte';
  import { PLACE, PLACES } from '../game/places';
  import { SPOT, VIEW } from '../game/layout';
  import { apply, initial, waysFrom, waitFor, SECS_PER_PACE,
    type Game, type Action } from '../game/engine';
  import { load, save, wipe, elapsedSince } from '../game/store';

  let game = $state<Game>(initial());
  let ready = $state(false);
  let awayLine = $state('');

  const here = $derived(PLACE.get(game.at)!);
  const ways = $derived(waysFrom(game));
  const wait = $derived(waitFor(game));

  const act = (a: Action): void => {
    game = apply(game, a);
    if (a.type !== 'tick') awayLine = '';
  };

  // ---- the clock, and the only one ----------------------------------------
  onMount(() => {
    void (async () => {
      const back = await load();
      if (back) {
        game = back.game;
        // Absence pays: the same reducer, one big tick. Capped at twelve hours.
        const secs = Math.min(elapsedSince(back.savedAt), 12 * 3600);
        if (secs > 1 && back.game.working) {
          const before = back.game.paces;
          game = apply(back.game, { type: 'tick', secs });
          const got = game.paces - before;
          if (got > 0) {
            const hrs = secs / 3600;
            awayLine = `Away ${hrs >= 1 ? `${hrs.toFixed(1)} hours` : `${Math.round(secs / 60)} minutes`}`
              + ` — you gathered ${got} ${got === 1 ? 'pace' : 'paces'}.`;
          }
        }
      }
      ready = true;
    })();

    let last = performance.now();
    let raf = 0;
    const frame = (t: number): void => {
      const secs = (t - last) / 1000;
      if (secs >= 0.2) { last = t; if (game.working) act({ type: 'tick', secs }); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // ⚠️ A TIMER, NOT A DEBOUNCE, AND I GOT THIS WRONG TWICE.
  //
  // The obvious shape is "save 800ms after the last change". While a job runs
  // the state changes five times a second, so every tick cancels the pending
  // write and it NEVER FIRES — the save is starved for exactly as long as the
  // player is doing something. The last version shipped that, ate a run on
  // reload, and I wrote it again here from muscle memory. The probe caught it
  // in one run: nine paces became zero.
  //
  // A fixed interval cannot be starved. It writes at most every two seconds and
  // only when something actually changed.
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
    // An iOS tab going away gets no further frames, so the interval would never
    // fire again. This is how every sitting actually ends.
    const flush = (): void => { if (ready) { lastSaved = JSON.stringify(game); void save(game); } };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  });

  /** Everything the map draws, decided here so the markup stays a shape.
   *  A place you have not reached has no name on it — the valley is drawn, but
   *  what is out there is not spoiled. */
  const map = $derived.by(() => {
    const reachable = new Map(ways.map((w) => [w.to, w]));
    return {
      edges: PLACES.flatMap((p) => p.ways
        .filter((to) => to > p.id)
        .map((to) => ({
          key: `${p.id}-${to}`,
          a: SPOT.get(p.id)!, b: SPOT.get(to)!,
          // An edge you could take right now is the one that matters.
          live: (p.id === game.at && reachable.get(to)?.why === null)
            || (to === game.at && reachable.get(p.id)?.why === null),
          known: game.seen.includes(p.id) && game.seen.includes(to),
        }))),
      dots: PLACES.map((p) => {
        const w = reachable.get(p.id);
        return {
          id: p.id,
          at: SPOT.get(p.id)!,
          name: game.seen.includes(p.id) ? p.name : '',
          you: p.id === game.at,
          open: w !== undefined && w.why === null,
          shut: w !== undefined && w.why !== null,
          known: game.seen.includes(p.id),
        };
      }),
    };
  });

  const mmss = (s: number): string =>
    s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
</script>

<main>
  <header>
    <p class="said" class:away={awayLine}>{awayLine || game.said}</p>
    <div class="purse">
      <b>{game.paces}</b><span>{game.paces === 1 ? 'pace' : 'paces'}</span>
      <button class="reset" onclick={async () => { await wipe(); game = initial(); }}>
        Start over
      </button>
    </div>
  </header>

  <!-- ★ THE GRAPH IS THE GAME (`docs/BRIEF.md`, the north star). It is drawn
       first, it is the biggest thing on the screen, and it is not a view you
       open — you are looking at the valley and standing in it.

       SVG with a `viewBox` and no width/height of its own: the browser scales
       the whole box to the column, so there is no camera, nothing measured
       against the window, and no alignment left to get wrong. The layout came
       out of `layout.ts` already solved, so nothing here moves after the first
       paint. -->
  <section class="map">
    <svg viewBox="{VIEW.x} {VIEW.y} {VIEW.w} {VIEW.h}" role="img"
      aria-label="the valley, {game.seen.length} of {PLACE.size} places found">
      {#each map.edges as e (e.key)}
        <line x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
          class:live={e.live} class:known={e.known} />
      {/each}
      {#each map.dots as d (d.id)}
        <g class:you={d.you} class:open={d.open} class:shut={d.shut}
          class:known={d.known}>
          <circle cx={d.at.x} cy={d.at.y} r={d.you ? 7 : d.open || d.shut ? 5.5 : 3.5} />
          {#if d.name}<text x={d.at.x} y={d.at.y + 16}>{d.name}</text>{/if}
        </g>
      {/each}
    </svg>
  </section>

  <section class="place">
    <h1>{here.name}</h1>
    <p>{here.body}</p>

    {#if here.work}
      <button class="do" class:on={game.working}
        onclick={() => act(game.working ? { type: 'stop' } : { type: 'work' })}>
        {game.working ? `${here.work.label}…` : here.work.label}
        <em>{game.working
          ? `1 pace every ${SECS_PER_PACE}s — keeps going while this is shut`
          : `rest here · 1 pace every ${SECS_PER_PACE}s`}</em>
      </button>
    {:else}
      <p class="nowork">Nothing to do here. Somewhere you have been will have work.</p>
    {/if}

    {#if wait}
      <!-- The one number an idle game owes you: how long until the next thing. -->
      <p class="wait">{mmss(wait.secs)} of resting opens <b>{wait.name}</b>.</p>
    {/if}
  </section>

  <section class="ways">
    <h2>Ways on</h2>
    <ul>
      {#each ways as w (w.to)}
        <li>
          <button class="way" class:shut={w.why !== null} class:known={w.seen}
            onclick={() => act({ type: 'go', to: w.to })}>
            <span class="name">{w.name}</span>
            <em>{w.why
              ? w.why
              : w.cost === 0 ? 'back the way you came — free'
              : `${w.cost} paces`}</em>
          </button>
        </li>
      {/each}
    </ul>
    <p class="tally">{game.seen.length} of {PLACE.size} places found.</p>
  </section>
</main>

<style>
  :global(html) { --safe-t: env(safe-area-inset-top, 0px);
    --safe-b: env(safe-area-inset-bottom, 0px); }
  :global(body) { margin: 0; background: #070b10; color: #dfe9f0;
    font: 17px/1.5 ui-sans-serif, system-ui, sans-serif;
    -webkit-text-size-adjust: 100%; }

  /* ⚠️ THE PAGE SCROLLS. It is a column of blocks in normal flow — no fixed
     positioning, no viewport units, nothing measured against the window. That
     is the entire reason this cannot be "misaligned": there is no alignment to
     get wrong. */
  main { max-width: 560px; margin: 0 auto;
    padding: calc(12px + var(--safe-t)) 16px calc(32px + var(--safe-b)); }

  header { position: sticky; top: 0; z-index: 2; background: #070b10;
    padding: 8px 0 10px; border-bottom: 1px solid #16232f; }
  .said { margin: 0 0 8px; font-size: 16px; color: #eaf4fa; }
  .said.away { color: #ffd479; }
  .purse { display: flex; align-items: baseline; gap: 6px; }
  .purse b { font-size: 22px; color: #8ff0cf; }
  .purse span { color: #8fa6b6; font-size: 14px; }
  .reset { margin-left: auto; padding: 8px 12px; border-radius: 8px;
    background: none; border: 1px solid #2b4356; color: #8fa6b6; font: inherit;
    font-size: 13px; }

  .map { margin: 14px 0 4px; }
  /* No `overflow: visible` — the viewBox already carries padding for the
     labels, and letting the drawing escape its own box is how it ended up
     under the sticky header. */
  .map svg { display: block; width: 100%; height: auto; }
  .map line { stroke: #1d2c3a; stroke-width: 1; }
  .map line.known { stroke: #2b4356; }
  .map line.live { stroke: #8ff0cf; stroke-width: 2; }
  .map circle { fill: #2b3a49; }
  .map .known circle { fill: #4d6b80; }
  .map .open circle { fill: #78e8c0; }
  .map .shut circle { fill: #f0b45f; }
  .map .you circle { fill: #8ff0cf; stroke: #8ff0cf; stroke-width: 6;
    stroke-opacity: .25; }
  .map text { fill: #7f97a8; font-size: 11px; text-anchor: middle;
    paint-order: stroke; stroke: #070b10; stroke-width: 3px; }
  .map .you text { fill: #eafff7; font-weight: 700; }
  .map .open text { fill: #bff3e0; }
  .map .shut text { fill: #f3d6a8; }

  h1 { margin: 20px 0 8px; font-size: 24px; }
  h2 { margin: 26px 0 8px; font-size: 14px; letter-spacing: .08em;
    text-transform: uppercase; color: #7f97a8; font-weight: 600; }
  .place p { margin: 0; color: #c8d8e4; }
  .nowork { color: #7f97a8; font-style: italic; font-size: 15px; }
  .wait { margin-top: 10px !important; font-size: 15px; color: #8fa6b6; }
  .wait b { color: #cdf3e6; font-weight: 600; }

  /* Every control is a real button, at least 56px tall, full width. Nothing
     overlaps anything because nothing is positioned. */
  .do, .way { display: block; width: 100%; box-sizing: border-box; min-height: 56px;
    margin-top: 10px; padding: 12px 14px; border-radius: 12px; text-align: left;
    background: #12222e; border: 1px solid #2f5568; color: #cdf3e6; font: inherit;
    font-size: 17px; }
  .do em, .way em { display: block; margin-top: 2px; font-style: normal;
    font-size: 14px; color: #8fb6c4; }
  .do.on { border-color: #8ff0cf; color: #eafff7; background: #16362f; }

  ul { list-style: none; margin: 0; padding: 0; }
  .way .name { font-weight: 600; }
  .way.known { background: #101a24; border-color: #24384a; color: #b9cddb; }
  .way.shut { background: #14161a; border-color: #3a3320; color: #b9a276; }
  .tally { margin: 18px 0 0; font-size: 14px; color: #6f8798; }
</style>
