<script lang="ts">
  // THE SLICE'S SCREEN. One board, no dock.
  //
  // `docs/GAME_DESIGN.md`: the board IS the game, not a picture beside it. The
  // last build drew a graph and put the controls under it, and the owner could
  // not tell which dot a button led to — measured at ZERO overlap between the
  // button labels and the dots on screen. So here the choices ARE the dots.
  //
  // The prose lives in the place it describes: tapping a dot expands it into a
  // card at that dot. Not a footer, not a modal.
  import { onMount } from 'svelte';
  import { GraphSim } from '../render/sim';
  import { cameraFor, toScreen, clampZoom, baseScale, type Camera } from '../render/board';
  import { PLACES, PLACE, EDGES, ITEMS } from '../slice/content';
  import { encode, restore, toText, fromText } from '../slice/save';
  import { loadBlob, saveBlob, deleteBlob, requestPersistence } from '../shell/storage';
  import {
    apply, initial, level, blocked, chanceOf, SKILLS, xpForLevel,
    type Slice, type Action, type SkillId,
  } from '../slice/engine';

  let game = $state<Slice>(initial());
  /** Nothing is written until the save on disk has been READ. Without this the
   *  first autosave races the load and overwrites the run with a fresh one —
   *  which looks exactly like a save that was never written. */
  let loaded = $state(false);
  let showSave = $state(false);
  let importText = $state('');
  let saveNote = $state('');
  let w = $state(360);
  let h = $state(640);
  let canvas = $state<HTMLCanvasElement | null>(null);
  let simTick = $state(0);
  /** Which dot is expanded. Starts as where you are, so the first frame has
   *  text on it — an empty board taught nobody anything. */
  let open = $state<number | null>(0);

  const dispatch = (a: Action): void => { game = apply(game, a); };

  const here = $derived(PLACE.get(game.at)!);
  const openPlace = $derived(open === null ? null : PLACE.get(open) ?? null);

  // ---- LAYOUT -------------------------------------------------------------
  const sim = new GraphSim();
  $effect(() => {
    sim.sync({
      nodes: PLACES.map((p) => ({ id: p.id, weight: p.id === game.at ? 1 : 0.5 })),
      links: EDGES.map((e) => ({ a: e.a, b: e.b })),
    });
  });

  /** ⚠️ FRAME THE GRAPH BY ITS BOUNDING BOX, not by a guessed zoom and not by
   *  its radius from the origin.
   *
   *  Two bugs found by looking at the screenshot, in order:
   *  1. A hardcoded zoom of 0.82 drew all six dots inside 30px, because
   *     `cameraFor` assumes a world of radius ~1.18 (`WORLD_RIM`, sized for
   *     4,096 concepts) and six nodes settle at about 0.13. Every tap landed on
   *     the wrong dot — Playwright: "The Tally intercepts pointer events".
   *  2. Fitting by `max(hypot)` then fixed the size and not the position:
   *     `forceCenter` runs at strength 0.05, so the cluster drifts off the
   *     origin and the board ended up squashed into the bottom-right with the
   *     top third of the screen empty.
   *
   *  So: measure the box, scale it into a band, and translate its centre to the
   *  middle of that band. The band leaves the top clear for the narrator line
   *  and the bottom clear for the card, which is where they live.
   *
   *  `pad` reserves room for a LABEL, not just a dot. "Behind the Door" is
   *  about 130px wide and hangs centred under its dot, so a node placed 40px
   *  from the edge pushed half its own name off the screen — visible in the
   *  screenshot, invisible to every other check. */
  const BAND = { top: 84, bottom: 288, pad: 74 };

  const fit = $derived.by(() => {
    void simTick;
    // ⚠️ FIT THE NEIGHBOURHOOD, NOT THE WORLD. Fitting all thirty-seven places
    // shrank the local ones until they overlapped, and Playwright reported the
    // only open route at The Far Bank as un-tappable — the game was stuck and
    // nothing but the probe said so. The camera now frames where you STAND and
    // the places you can step to; everything else is still drawn, just further
    // out. That is also the model `docs/ROUTES.md` argued for and this is the
    // first build where it is literally true: you are at a node, and the ways
    // on are unmistakable.
    const all = sim.positions();
    const local = new Set<number>([game.at, ...here.choices.map((c) => c.to)]);
    const ps = [...local].map((id) => all.get(id)).filter((p) => p !== undefined);
    if (!ps.length) return { zoom: 1, panX: 0, panY: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of ps) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const boxW = Math.max(w - BAND.pad * 2, 80);
    const boxH = Math.max(h - BAND.top - BAND.bottom, 120);
    // A degenerate span (one node, or a column) must not divide by zero and
    // must not zoom to the ceiling either.
    const spanX = Math.max(maxX - minX, 0.05);
    const spanY = Math.max(maxY - minY, 0.05);
    const want = Math.min(boxW / spanX, boxH / spanY);
    const zoom = clampZoom(want / baseScale(w, h));
    const scale = baseScale(w, h) * zoom;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return {
      zoom,
      // `cameraFor` puts the origin at `w/2 + panX`, so this is the offset that
      // lands the graph's own centre in the middle of the band.
      panX: (w / 2) - cx * scale - w / 2,
      panY: (BAND.top + (h - BAND.bottom)) / 2 - cy * scale - h / 2,
    };
  });

  const cam = $derived<Camera>(cameraFor(w, h, fit.zoom, fit.panX, fit.panY));
  const pos = $derived.by(() => {
    void simTick;
    const out = new Map<number, { x: number; y: number }>();
    for (const [id, p] of sim.positions()) out.set(id, toScreen(cam, p));
    return out;
  });

  /** The choices out of where you STAND. These are the only taps that move you,
   *  and each one is drawn as the dot it leads to. */
  const ways = $derived.by(() => here.choices.map((c) => ({
    c,
    place: PLACE.get(c.to)!,
    why: blocked(game, c),
    chance: chanceOf(game, c),
  })));
  const wayTo = $derived(new Map(ways.map((x) => [x.c.to, x])));

  // ---- PERSISTENCE --------------------------------------------------------
  //
  // IndexedDB via `src/shell/storage.ts`, reused unchanged: it is a blob store
  // and knows nothing about what is in the blob. localStorage is not an option
  // — iOS evicts it after about seven idle days, which is precisely the gap
  // between sittings this game is built for.
  $effect(() => {
    void (async () => {
      const blob = await loadBlob().catch(() => null);
      game = restore(blob);
      // ⚠️ THE CARD FOLLOWS YOU. `open` starts at 0 so the first frame has text
      // on it, but a restored run can be anywhere — and the screenshot showed
      // "The Gate." in the narrator above a card describing The Cut, which is
      // the game telling you about somewhere you are not.
      open = game.at;
      loaded = true;
      void requestPersistence();
    })();
  });

  // Autosave on every change once loaded. `encode` drops `lastRoll`, so the
  // dice on the table do not come back with the run — the SEED does, which is
  // the part that matters.
  //
  // ⚠️ DEBOUNCED, because a running timer changes state four times a second and
  // an IndexedDB write per tick is a transaction per tick on a phone. 700ms is
  // short enough that a tap is safe the moment you look away and long enough
  // that holding a job open is one write, not two hundred.
  let saveTimer = 0;
  $effect(() => {
    if (!loaded) return;
    const blob = encode(game);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void saveBlob(blob).catch(() => {}); }, 700) as unknown as number;
    return () => clearTimeout(saveTimer);
  });

  // A tab going away on iOS gets no further frames, so the pending debounce
  // would never fire. Flush on the way out — this is the case that matters,
  // because it is how every sitting actually ends.
  $effect(() => {
    const flush = (): void => {
      if (!loaded) return;
      clearTimeout(saveTimer);
      void saveBlob(encode(game)).catch(() => {});
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  });

  async function wipe(): Promise<void> {
    await deleteBlob().catch(() => {});
    game = initial();
    saveNote = 'Started over.';
  }

  async function copyOut(): Promise<void> {
    const text = toText(game);
    try {
      await navigator.clipboard.writeText(text);
      saveNote = 'Copied. Paste it on the other device.';
    } catch {
      // Clipboard is denied often enough on iOS that failing silently would
      // look like a broken button. Show the text and let the owner select it.
      importText = text;
      saveNote = 'Could not reach the clipboard — copy it from the box.';
    }
  }

  function pasteIn(): void {
    const s = fromText(importText);
    if (!s) { saveNote = 'That is not a save this version can read.'; return; }
    game = s;
    importText = '';
    saveNote = `Loaded. You are at ${PLACE.get(s.at)?.name ?? '—'}.`;
  }

  // ---- THE CLOCK ----------------------------------------------------------
  //
  // The ONLY clock in the app, and it does one thing: turn elapsed wall time
  // into `tick` actions. The engine never reads a clock itself, which is why
  // the same reducer serves the tests and the offline catch-up.
  onMount(() => {
    let last = performance.now();
    let raf = 0;
    const frame = (t: number): void => {
      const secs = (t - last) / 1000;
      if (secs >= 0.25) { last = t; if (game.job) dispatch({ type: 'tick', secs }); }
      if (sim.step()) simTick++;
      if (canvas) paint();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // ---- PAINT --------------------------------------------------------------
  //
  // A small painter rather than `render/paint.ts`: that one takes the old
  // game's state and reads `solid`, `raw` and `rot` off it, which no longer
  // exist. Lines only — every dot and every label is DOM, because a tap target
  // with text on it should be a button, not a hit-test against a canvas.
  function paint(): void {
    const c = canvas;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== w * dpr || c.height !== h * dpr) {
      c.width = w * dpr; c.height = h * dpr;
    }
    const g = c.getContext('2d');
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    for (const e of EDGES) {
      const a = pos.get(e.a), b = pos.get(e.b);
      if (!a || !b) continue;
      const way = e.a === game.at ? wayTo.get(e.b) : e.b === game.at ? wayTo.get(e.a) : undefined;
      const shut = way?.why != null;
      // A route out of where you stand is bright. A shut one is dashed and
      // stays drawn — `engine.ts`'s `blocked` says why, on the dot itself.
      g.strokeStyle = way ? (shut ? 'rgba(255,180,90,.55)' : 'rgba(120,240,200,.75)')
        : 'rgba(120,150,170,.18)';
      g.lineWidth = way ? 2 : 1;
      g.setLineDash(shut ? [5, 5] : []);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    g.setLineDash([]);
  }

  // ---- SKILLS, as a row that only shows what has moved --------------------
  const skillRows = $derived.by(() => (Object.keys(SKILLS) as SkillId[])
    .map((id) => ({ id, name: SKILLS[id].name, lvl: level(game, id), xp: game.xp[id] }))
    .filter((r) => r.xp > 0));

  const jobPct = $derived.by(() => {
    if (!game.job) return 0;
    const secs = PLACE.get(game.job.at)?.work?.secs ?? 1;
    return Math.max(0, Math.min(1, 1 - game.job.left / secs));
  });

  const pct = (n: number): string => `${Math.round(n * 100)}%`;
</script>

<svelte:window bind:innerWidth={w} bind:innerHeight={h} />

<main>
  <!-- ONE LINE, and it is the last thing that happened. The owner asked for
       "pop ups above the graph when something happens"; this is that, minus the
       pop-up, because a line that is always in the same place is readable and a
       thing that appears over the board is not. -->
  <p class="said">{game.said}</p>

  {#if game.lastRoll}
    <!-- ★ THE DICE ARE SHOWN. The owner's wife enjoys dice throws, and a throw
         you do not see is a random number, not a throw. -->
    <div class="dice" class:crit={game.lastRoll.crit !== null}>
      <b>{game.lastRoll.dice[0]}</b><b>{game.lastRoll.dice[1]}</b>
      <span>{game.lastRoll.total}{game.lastRoll.mod !== 0
        ? (game.lastRoll.mod > 0 ? ` +${game.lastRoll.mod}` : ` ${game.lastRoll.mod}`) : ''}
        {game.lastRoll.passed ? '· pass' : '· fail'}</span>
    </div>
  {/if}

  <div class="stage">
    <canvas bind:this={canvas} style="width:{w}px;height:{h}px"></canvas>

    {#each PLACES as p (p.id)}
      {@const at = pos.get(p.id)}
      {#if at}
        {@const way = wayTo.get(p.id)}
        {@const reachable = p.id === game.at || way !== undefined}
        {#if reachable}
          <!-- ⚠️ ONLY WHERE YOU CAN GO IS A BUTTON. `docs/GAME_DESIGN.md` puts
               the ceiling at about fourteen actionable nodes, because a tap
               target is 44px and they cannot overlap. At six places every dot
               could be a control; at THIRTY-SEVEN they collided and Playwright
               reported every single tap blocked — the game was unplayable and
               nothing but the probe said so. So the world stays drawn, and only
               the places you can actually reach take taps. -->
          <button
            class="dot"
            class:you={p.id === game.at}
            class:way={way !== undefined && way.why === null}
            class:shut={way?.why != null}
            style="left:{at.x}px; top:{at.y}px"
            aria-label={p.name}
            onclick={() => {
              if (way && way.why === null) { dispatch({ type: 'travel', to: p.id }); open = p.id; }
              else open = open === p.id ? null : p.id;
            }}>
            <i></i>
            <span class="name">{p.name}</span>
            {#if way?.why}<span class="tag shut">{way.why}</span>
            {:else if way?.chance !== null && way?.chance !== undefined}
              <span class="tag">{pct(way.chance)}</span>
            {/if}
          </button>
        {:else}
          <!-- The rest of the world: drawn, never tappable, and named only once
               you have stood there. Somewhere you have not been is a light you
               can see from here, which is the reason to walk toward it. -->
          <span class="mark" class:been={game.seen.includes(p.id)}
            style="left:{at.x}px; top:{at.y}px">
            <i></i>
            {#if game.seen.includes(p.id)}<span class="name">{p.name}</span>{/if}
          </span>
        {/if}
      {/if}
    {/each}

    <!-- THE CARD, AT THE PLACE. `docs/GAME_DESIGN.md`: the node expands in
         place. 40–70 words and it never scrolls. -->
    {#if openPlace && pos.get(openPlace.id)}
      {@const at = pos.get(openPlace.id)!}
      <div class="card" style="left:{Math.min(Math.max(12, at.x - 140), Math.max(12, w - 292))}px;
                               top:{Math.min(at.y + 26, h - 220)}px">
        <h2>{openPlace.name}</h2>
        {#if game.seen.includes(openPlace.id)}
          <p>{openPlace.body}</p>
          {#if openPlace.id === game.at && openPlace.work}
            <button class="act" onclick={() => dispatch({ type: 'work', id: openPlace.work!.id })}
              disabled={game.job !== null}>
              {openPlace.work.label}
              <em>{openPlace.work.secs}s · +{openPlace.work.xp} {SKILLS[openPlace.work.skill].name}</em>
            </button>
          {/if}
        {:else}
          <p class="unknown">You can see it from here. That is all you can say about it.</p>
        {/if}
        <button class="x" aria-label="close" onclick={() => (open = null)}>×</button>
      </div>
    {/if}
  </div>

  <!-- ★ THE ONLY PERSISTENT CHROME. Three things, and each appears only once it
       means something (`reveal` by another name — a readout for a quantity the
       player has never seen is noise). -->
  <footer>
    {#if game.job}
      <div class="bar"><i style="width:{pct(jobPct)}"></i></div>
    {/if}
    {#if skillRows.length}
      <ul class="skills">
        {#each skillRows as s (s.id)}
          <li><b>{s.name}</b> {s.lvl}
            <em>{s.xp}/{xpForLevel(s.lvl + 1)}</em></li>
        {/each}
      </ul>
    {/if}
    {#if game.satchels.length > 0}
      <button class="loot" onclick={() => dispatch({ type: 'open' })}>
        Open satchel <em>×{game.satchels.length}</em>
      </button>
    {/if}
    {#if game.pack.length}
      <ul class="pack">
        {#each game.pack as it (it)}<li>{ITEMS[it]?.name ?? it}</li>{/each}
      </ul>
    {/if}
  </footer>

  <!-- ⚠️ SETTINGS ARE NOT A GRAPH. `docs/GAME_DESIGN.md` pushes graph-as-UI as
       far as it goes and then names where it stops: text you must read, exact
       numbers, and settings. Moving a save between devices is settings. So it
       is a corner button and a panel, and it does not pretend otherwise. -->
  <button class="gear" aria-label="save and restore"
    onclick={() => { showSave = !showSave; saveNote = ''; }}>⋯</button>

  {#if showSave}
    <div class="sheet">
      <h2>This run</h2>
      <p class="hint">Saved as you play. Copy it out to move it to another
        device — the dice come with it.</p>
      <div class="row">
        <button onclick={copyOut}>Copy this run</button>
        <button onclick={pasteIn} disabled={!importText.trim()}>Load pasted</button>
      </div>
      <textarea bind:value={importText} rows="3"
        placeholder="paste a run here"></textarea>
      {#if saveNote}<p class="note">{saveNote}</p>{/if}
      <button class="danger" onclick={wipe}>Start over</button>
      <button class="x" aria-label="close" onclick={() => (showSave = false)}>×</button>
    </div>
  {/if}
</main>

<style>
  :global(body) { margin: 0; background: #070b10; color: #dfe9f0;
    font: 15px/1.45 ui-sans-serif, system-ui, sans-serif; overscroll-behavior: none; }
  main { position: relative; height: 100vh; overflow: hidden; }
  /* Right inset clears the gear button, which was sitting on top of the
     narrator's last two words. */
  .said { position: absolute; inset: 10px 56px auto 12px; margin: 0; z-index: 4;
    font-size: 17px; line-height: 1.35; color: #eaf4fa; text-shadow: 0 1px 6px #070b10; }
  .dice { position: absolute; top: 62px; left: 12px; z-index: 4; display: flex;
    gap: 6px; align-items: center; }
  .dice b { display: grid; place-items: center; width: 26px; height: 26px;
    border-radius: 6px; background: #14202c; border: 1px solid #2f4557;
    font-size: 14px; font-variant-numeric: tabular-nums; }
  .dice.crit b { border-color: #ffd479; color: #ffd479; }
  .dice span { font-size: 12px; color: #8fa6b6; }
  .stage { position: absolute; inset: 0; }
  canvas { position: absolute; inset: 0; display: block; }

  /* ⚠️ DOTS SIT ABOVE THE CARD. The card is 280px wide and lands next to the
     place it describes, which put it straight over the neighbouring dots — so
     tapping a route did nothing at all, and a tap that does nothing is
     indistinguishable from a broken control. The dots are the CONTROLS; the
     card is text. Controls win. */
  .dot { position: absolute; z-index: 6; transform: translate(-50%, -50%); background: none;
    border: 0; padding: 0; display: grid; justify-items: center; gap: 3px;
    color: inherit; font: inherit;
    /* 44px is the touch floor. The dot LOOKS small and TAPS big. */
    min-width: 44px; min-height: 44px; align-content: center; }
  .dot i { width: 11px; height: 11px; border-radius: 50%; background: #4d6b80; }
  .dot .name { font-size: 12px; color: #7f97a8; white-space: nowrap; }
  .dot.far i { opacity: .45; }
  .dot.far .name { opacity: .5; }
  .dot.you i { width: 18px; height: 18px; background: #8ff0cf;
    box-shadow: 0 0 18px 5px rgba(143,240,207,.35); }
  .dot.you .name { color: #eafff7; font-weight: 700; font-size: 13px; }
  .dot.way i { width: 15px; height: 15px; background: #78e8c0; }
  .dot.way .name { color: #bff3e0; }
  .dot.shut i { width: 15px; height: 15px; background: #f0b45f; }
  .dot.shut .name { color: #f3d6a8; }
  .mark { position: absolute; z-index: 3; transform: translate(-50%, -50%);
    display: grid; justify-items: center; gap: 3px; pointer-events: none; }
  .mark i { width: 7px; height: 7px; border-radius: 50%; background: #3a5164; }
  .mark.been i { background: #587a8f; }
  .mark .name { font-size: 11px; color: #5d7484; white-space: nowrap; }

  .tag { font-size: 11px; color: #6f8798; }
  .tag.shut { color: #f0b45f; max-width: 116px; white-space: normal; text-align: center;
    line-height: 1.25; }

  /* ⚠️ BORDER-BOX. This was `width: 280px` with `padding: 12px 14px` under the
     default content-box, so the card actually measured 308px, overflowed the
     390px viewport past the clamp that was supposed to hold it, and `main`'s
     overflow:hidden sliced the last word off every line. Seen in the
     screenshot, not in a type error. */
  .card { position: absolute; box-sizing: border-box; z-index: 5;
    width: min(280px, calc(100vw - 24px)); padding: 12px 14px 14px;
    border-radius: 12px; background: #0d151dfa; border: 1px solid #24384a;
    box-shadow: 0 10px 30px #000a; }
  .card h2 { margin: 0 0 6px; font-size: 15px; letter-spacing: .02em; }
  .card p { margin: 0; font-size: 14px; color: #c3d4e0; }
  .card p.unknown { color: #7f97a8; font-style: italic; }
  .card .x { position: absolute; top: 4px; right: 6px; background: none; border: 0;
    color: #6f8798; font-size: 20px; width: 32px; height: 32px; }
  .act { display: block; width: 100%; margin: 10px 0 0; padding: 9px 10px;
    border-radius: 9px; background: #12222e; border: 1px solid #2f5568;
    color: #cdf3e6; font: inherit; text-align: left; }
  .act em { display: block; font-size: 11px; color: #7fa8b8; font-style: normal; }
  .act:disabled { opacity: .45; }

  footer { position: absolute; inset: auto 12px 12px 12px; z-index: 4;
    display: grid; gap: 8px; justify-items: start; }
  .bar { width: 100%; height: 4px; border-radius: 3px; background: #16232f; }
  .bar i { display: block; height: 100%; border-radius: 3px; background: #8ff0cf; }
  .skills, .pack { display: flex; gap: 12px; margin: 0; padding: 0; list-style: none;
    flex-wrap: wrap; font-size: 12px; color: #9db3c2; }
  .skills b { color: #dfe9f0; font-weight: 600; }
  .skills em { color: #6f8798; font-style: normal; }
  .pack li { padding: 3px 8px; border-radius: 20px; background: #14202c;
    border: 1px solid #2b4356; color: #cfe3ef; }
  .loot { padding: 9px 14px; border-radius: 10px; background: #1d1a10;
    border: 1px solid #6b5720; color: #ffd479; font: inherit; font-weight: 600; }
  .loot em { font-style: normal; color: #b99a4a; }

  .gear { position: absolute; top: 8px; right: 8px; z-index: 7; width: 40px;
    height: 40px; border-radius: 50%; background: #0d151dcc; border: 1px solid #24384a;
    color: #8fa6b6; font-size: 18px; line-height: 1; }
  .sheet { position: absolute; z-index: 8; inset: auto 12px 12px 12px;
    box-sizing: border-box; padding: 14px; border-radius: 12px;
    background: #0d151dfa; border: 1px solid #24384a; box-shadow: 0 10px 30px #000a; }
  .sheet h2 { margin: 0 0 4px; font-size: 15px; }
  .sheet .hint { margin: 0 0 10px; font-size: 12px; color: #7f97a8; }
  .sheet .row { display: flex; gap: 8px; margin-bottom: 8px; }
  .sheet button { padding: 9px 12px; border-radius: 9px; background: #12222e;
    border: 1px solid #2f5568; color: #cdf3e6; font: inherit; }
  .sheet button:disabled { opacity: .45; }
  .sheet textarea { width: 100%; box-sizing: border-box; padding: 8px;
    border-radius: 8px; background: #070d13; border: 1px solid #24384a;
    color: #cfe3ef; font: 12px/1.4 ui-monospace, monospace; resize: none; }
  .sheet .note { margin: 8px 0 0; font-size: 12px; color: #ffd479; }
  .sheet .danger { margin-top: 10px; background: #1d1013; border-color: #6b2020;
    color: #ffb3b3; }
  .sheet .x { position: absolute; top: 4px; right: 6px; background: none;
    border: 0; color: #6f8798; font-size: 20px; width: 32px; height: 32px; }
</style>
