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
  import { encode, restore, toText, fromText, savedAt } from '../slice/save';
  import { catchUpSince } from '../slice/offline';
  import { nextUnlocks } from '../slice/perks';
  import { STATS, STAT_IDS } from '../slice/stats';
  import { NOUN, nextTallyCost, tallyBlocked, TALLY_CAP } from '../slice/economy';
  import { nodesAt, NODE, locked as nodeLocked, chances } from '../slice/gather';
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
  /** What the catch-up said, shown until the player does something. */
  let awayLine = $state('');
  /** ⚠️ THE INTRODUCTION, and there was not one. The owner has said FOUR times
   *  across four builds that they could not tell what the game was. Every fix
   *  so far has been about making the screen honest — names on dots, odds on
   *  buttons, a reason on every shut door — and none of them ever said, in one
   *  sentence, what you are doing here.
   *
   *  It is three lines and it never comes back. It is not a tutorial: nothing
   *  is gated behind it, nothing waits for it, and one tap anywhere dismisses
   *  it. `docs/GAME_DESIGN.md`: "three dots and one sentence." */
  let intro = $state(false);
  /** ⚠️ THE BOX WE DRAW INTO, NOT THE WINDOW. These were bound to
   *  `window.innerWidth/innerHeight` while `main` is `height: 100dvh`, and on
   *  iOS those are two different numbers whenever the URL bar is showing:
   *  `innerHeight` reports the LARGE viewport (as if the bar were hidden),
   *  `dvh` reports the one actually on screen. So the camera centred the board
   *  for a taller screen than it was painting into, and everything sat low —
   *  the "still misaligned on my screen" that no headless run could reproduce,
   *  because a headless browser has no URL bar and the two numbers agree.
   *
   *  Bound to the stage's own client box instead, which is true by
   *  construction on every device and needs no guessing about chrome. */
  let w = $state(360);
  let h = $state(640);
  let canvas = $state<HTMLCanvasElement | null>(null);
  let simTick = $state(0);
  /** Which dot is expanded. Starts as where you are, so the first frame has
   *  text on it — an empty board taught nobody anything. */
  let open = $state<number | null>(0);

  const dispatch = (a: Action): void => {
    game = apply(game, a);
    // ⚠️ A TICK IS NOT THE PLAYER DOING SOMETHING. Clearing on every action
    // wiped the "while you were away" line inside one frame, because a restored
    // run has a job running and the render loop ticks it immediately — the
    // absence paid, and the sentence saying so was gone before it painted.
    // It clears when the player acts, which is what it was for.
    if (a.type !== 'tick') awayLine = '';
    // Travelling reframes on the new neighbourhood, so a pan from the old one
    // would leave the player looking at where they used to be.
    if (a.type === 'travel') nudge = { x: 0, y: 0 };
  };

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
  const BAND = { top: 92, pad: 78 };

  /** ⚠️ MEASURED, NOT ASSUMED. The bottom of the board was a constant 288px
   *  while the sheet's height depends on how long the place's prose is — a
   *  sixty-word body and two work buttons is well over 400px. So the graph was
   *  centred in a band that did not exist and sat low or high depending on
   *  which place you were standing in, which is the "miscentred again" the
   *  owner reported. This reads the sheet's real height every frame it changes. */
  let sheetEl = $state<HTMLElement | null>(null);
  let footEl = $state<HTMLElement | null>(null);
  let sheetH = $state(300);
  let footH = $state(96);

  /** ⚠️ RESERVE FOR WHATEVER IS ACTUALLY DOWN THERE. The card was measured and
   *  the footer was not, so closing the card dropped the reserved space to a
   *  96px guess while the footer was still showing four rows — obols, skills,
   *  the pack and the next unlock. The board then fitted itself underneath all
   *  of it and the graph's own edges ran behind the text. Seen on the owner's
   *  phone, not in any headless run, because the probe leaves the card open. */
  const watch = (el: HTMLElement | null, set: (n: number) => void): (() => void) | void => {
    if (!el) return;
    const ro = new ResizeObserver(() => set(el.getBoundingClientRect().height));
    ro.observe(el);
    set(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  };
  $effect(() => watch(sheetEl, (n) => (sheetH = n + 24)));
  $effect(() => watch(footEl, (n) => (footH = n + 24)));

  /** The board stops above whichever of the two is on screen. */
  const reserved = $derived(open !== null ? sheetH : footH);

  /** How far the player has dragged the board. Cleared when you travel: each
   *  neighbourhood frames itself, and a pan carried across a move would leave
   *  you looking at where you used to be. */
  let nudge = $state({ x: 0, y: 0 });
  let grab: { x: number; y: number } | null = null;

  function grabStart(e: PointerEvent): void {
    if ((e.target as HTMLElement).closest('button, .card, .sheet, footer')) return;
    grab = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function grabMove(e: PointerEvent): void {
    if (!grab) return;
    nudge = { x: nudge.x + (e.clientX - grab.x), y: nudge.y + (e.clientY - grab.y) };
    grab = { x: e.clientX, y: e.clientY };
  }
  const grabEnd = (): void => { grab = null; };
  const moved = $derived(Math.abs(nudge.x) > 4 || Math.abs(nudge.y) > 4);

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
    // ⚠️ THE NEIGHBOURHOOD ONLY, AND THAT IS A DELIBERATE TRADE.
    //
    // Fitting all 37 places was the original bug: it shrank the board until six
    // dots sat inside 30px and taps landed on the wrong one. Fitting one hop
    // FURTHER out was tried to fill the empty top of the screen — it balanced
    // the picture and immediately crowded the labels, "The Cut" touching "The
    // Stack" with 57px between their dots. Legibility wins: a name you cannot
    // read is worse than space you are not using.
    const local = new Set<number>([game.at, ...here.choices.map((c) => c.to)]);
    const ps = [...local].map((id) => all.get(id)).filter((p) => p !== undefined);
    if (!ps.length) return { zoom: 1, panX: 0, panY: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of ps) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const boxW = Math.max(w - BAND.pad * 2, 80);
    const boxH = Math.max(h - BAND.top - reserved, 120);
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
      panY: (BAND.top + (h - reserved)) / 2 - cy * scale - h / 2,
    };
  });

  const cam = $derived<Camera>(
    cameraFor(w, h, fit.zoom, fit.panX + nudge.x, fit.panY + nudge.y));
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
      let run = restore(blob);
      // ★ PAY FOR THE ABSENCE. The clock lives HERE and nowhere below: the
      // engine and `offline.ts` are both pure, and a `Date.now()` on the far
      // side of this line is what lets a test write a save "eight hours ago".
      // A save with no `savedAt` (or one this build refused) banks nothing —
      // crediting an unknown absence would be inventing time.
      const then = blob ? savedAt(blob) : null;
      if (then !== null) {
        const caught = catchUpSince(run, then, Date.now());
        run = caught.state;
        if (caught.report.done > 0) awayLine = caught.report.line;
      }
      game = run;
      // Shown only to somebody who has never played: one place seen, nothing
      // held, nothing learned. A returning player is never told how to walk.
      intro = run.seen.length <= 1 && run.pack.length === 0
        && Object.values(run.xp).every((n) => n === 0);
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
  // ⚠️ DEBOUNCED WITH A MAX WAIT, and the max wait is the whole point.
  //
  // This was a bare 700ms debounce, and the comment on it claimed "holding a
  // job open is one write, not two hundred". It was ZERO writes. A running job
  // ticks every 250ms, every tick re-ran this effect, and every re-run cleared
  // the pending timeout before it could fire — so the debounce was starved for
  // as long as the job ran, which is exactly when a player is doing something.
  //
  // Measured by a reviewer on the shipped build: start a job, reload, and
  // `Lore 1 30/40` came back as `(none)`. The opening move of the game is
  // starting a 20-second job, and iOS Edge reloads backgrounded tabs, so this
  // ate runs in the most common situation there is.
  //
  // A debounce may delay a write. It may never cancel one indefinitely.
  const SAVE_DEBOUNCE = 700;
  const SAVE_MAX_WAIT = 2000;
  let saveTimer = 0;
  let lastWrote = 0;
  $effect(() => {
    if (!loaded) return;
    // ⚠️ THE TIMESTAMP IS TAKEN WHEN THE WRITE HAPPENS, not when the effect
    // runs. The debounce delays a write by up to two seconds, so stamping here
    // would date every save slightly in the past — and the first version of
    // this called `encode(game)` with no clock at all, which wrote `savedAt: 0`
    // and made the whole offline catch-up inert. It shipped looking correct:
    // the unit tests passed, the reload tests passed, and two hours away paid
    // exactly nothing. Only driving a real browser with a shifted clock found
    // it.
    const snapshot = game;
    const write = (): void => {
      lastWrote = performance.now();
      void saveBlob(encode(snapshot, Date.now())).catch(() => {});
    };
    clearTimeout(saveTimer);
    // Starved for too long: write now rather than arming another timeout that
    // the next tick will cancel.
    if (performance.now() - lastWrote >= SAVE_MAX_WAIT) { write(); return; }
    saveTimer = setTimeout(write, SAVE_DEBOUNCE) as unknown as number;
    return () => clearTimeout(saveTimer);
  });

  // A tab going away on iOS gets no further frames, so the pending debounce
  // would never fire. Flush on the way out — this is the case that matters,
  // because it is how every sitting actually ends.
  $effect(() => {
    const flush = (): void => {
      if (!loaded) return;
      clearTimeout(saveTimer);
      void saveBlob(encode(game, Date.now())).catch(() => {});
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
  const skillRows = $derived.by(() => {
    // The skill the running job is paying goes first, so the progress bar above
    // it has something to be about. Everything else follows by level.
    const busy = game.job
      ? (NODE.get(game.job.work)?.skill ?? PLACE.get(game.job.at)?.work?.skill)
      : undefined;
    return (Object.keys(SKILLS) as SkillId[])
      .map((id) => ({ id, name: SKILLS[id].name, lvl: level(game, id), xp: game.xp[id] }))
      .filter((r) => r.xp > 0)
      .sort((a, b) => (a.id === busy ? -1 : b.id === busy ? 1 : b.lvl - a.lvl));
  });

  const jobPct = $derived.by(() => {
    if (!game.job) return 0;
    const secs = PLACE.get(game.job.at)?.work?.secs ?? 1;
    return Math.max(0, Math.min(1, 1 - game.job.left / secs));
  });

  const pct = (n: number): string => `${Math.round(n * 100)}%`;

  /** Gathering nodes standing where you are. Locked ones are SHOWN with their
   *  reason, same rule as a shut door: an absent thing teaches nobody. */
  const rods = $derived.by(() => nodesAt(game.at).map((n) => ({
    n,
    why: nodeLocked(level(game, n.skill), n),
    banked: game.banked[n.id] ?? 0,
    running: game.job?.work === n.id,
    odds: 1 - chances(level(game, n.skill), n).miss,
  })));

  /** What the next level in each skill you have started will hand you. The most
   *  motivating thing an incremental can show is what you get next. */
  const soon = $derived.by(() => {
    const all = nextUnlocks(game.xp);
    return (Object.keys(all) as SkillId[])
      .filter((id) => game.xp[id] > 0)
      .map((id) => ({ id, ...all[id]! }))
      .sort((a, b) => a.toGo - b.toGo)
      // ⚠️ ONE. The footer already carries a bar, a purse, four stats, up to
      // five skills, the pack and the heap; two more lines of "what's next"
      // turned it into a wall in the screenshot. The nearest unlock is the
      // motivating one and the rest are noise until it lands.
      .slice(0, 1);
  });

  /** The stat row stays off screen until a stat has actually moved — a readout
   *  for a quantity nobody has seen change is noise on a first screen. */
  const statsMoved = $derived(STAT_IDS.some((id) => game.stats[id] !== 5));

  const heap = $derived(Object.entries(game.materials)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]));
</script>

<main>
  <!-- ONE LINE, and it is the last thing that happened. The owner asked for
       "pop ups above the graph when something happens"; this is that, minus the
       pop-up, because a line that is always in the same place is readable and a
       thing that appears over the board is not. -->
  <!-- ONE LINE, ONE PLACE. The away sentence used to sit in its own block under
       the narrator, and the two then said the same thing twice — the screenshot
       read "+11360 Craft, 206 times over." above "Away 2 hours… +11360 Craft."
       Same slot, amber when it is the absence talking. -->
  <p class="said" class:away={awayLine}>{awayLine || game.said}</p>

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

  <!-- The board is a draggable surface, not a control: the CONTROLS are the
       dots and buttons on top of it, each of which is a real button. -->
  <div class="stage" role="application" aria-label="the board"
    bind:clientWidth={w} bind:clientHeight={h}
    onpointerdown={grabStart} onpointermove={grabMove}
    onpointerup={grabEnd} onpointercancel={grabEnd}>
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
            class:hushed={open !== null && open !== p.id && p.id !== game.at
              && way === undefined}
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
      <!-- ⚠️ A SHEET, NOT A CARD PINNED TO ITS DOT. `GAME_DESIGN.md` asked for
           the prose to expand in place, and in place is 280px wide sitting on
           top of the very dots that are the game's controls — the screenshot
           showed "The Tailrace" and its 45% printing straight through the
           sentence. Dimming them was worse: they are the ways on.
           So it lands in the band already reserved for it at the bottom, the
           status footer stands down while it is open (status is not what you
           are reading), and the dot it belongs to stays lit with its name on
           it. The title says where you are; the board says it too. -->
      <div class="card" bind:this={sheetEl} style="--from:{at.x}px">
        <h2>{openPlace.name}</h2>
        {#if game.seen.includes(openPlace.id)}
          <p>{openPlace.body}</p>
          {#if openPlace.id === game.at && openPlace.work}
            {@const mine = game.job?.work === openPlace.work.id}
            <!-- ⚠️ A DISABLED BUTTON MUST SAY WHY, and the running one must show
                 that it is running. This was greyed out with the offer still on
                 it — "35s · +40 Craft" — while that exact job was already
                 turning, and the progress bar was in the footer, which the
                 sheet stands down. So the player was reading a dead button and
                 could not see their own timer. The fill IS the bar now. -->
            <button class="act" class:busy={mine}
              onclick={() => dispatch({ type: 'work', id: openPlace.work!.id })}
              disabled={game.job !== null}>
              {#if mine}<i class="fill" style="width:{pct(jobPct)}"></i>{/if}
              <span>{mine ? `${openPlace.work.label}…` : openPlace.work.label}</span>
              <em>{mine ? `${Math.ceil(game.job!.left)}s left`
                : game.job ? 'busy elsewhere'
                : `${openPlace.work.secs}s · +${openPlace.work.xp} ${SKILLS[openPlace.work.skill].name}`}</em>
            </button>
          {/if}
          {#if openPlace.id === game.at}
            {#each rods as r (r.n.id)}
              <button class="act" class:busy={r.running}
                onclick={() => dispatch({ type: 'work', id: r.n.id })}
                disabled={game.job !== null || r.why !== null}>
                {#if r.running}<i class="fill" style="width:{pct(jobPct)}"></i>{/if}
                <span>{r.n.verb} — {r.n.name}</span>
                <em>{r.why ? r.why
                  : r.running ? `${Math.ceil(game.job!.left)}s left`
                  : game.job ? 'busy elsewhere'
                  : `${r.n.secs}s · ${pct(r.odds)} · ${SKILLS[r.n.skill].name}`}</em>
              </button>
              {#if r.banked > 0}
                <!-- The attempts banked while you were elsewhere. The DICE for
                     them have not been thrown yet — that happens here, on a tap,
                     because a throw you did not watch is a number, not a throw. -->
                <button class="loot" onclick={() => dispatch({ type: 'haul', node: r.n.id })}>
                  Pull up <em>×{r.banked}</em>
                </button>
              {/if}
            {/each}
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
  <footer bind:this={footEl} class:stood-down={open !== null}>
    {#if open === null}
      <!-- ⚠️ WITH THE CARD SHUT THE GAME HAD NO VERB. Every action — read the
           place, start a job, pull up a catch — lives inside the card, and
           nothing on screen said that tapping your own dot brings it back. The
           owner's screenshot is exactly this state: a board, some readouts, and
           nothing to do. So the way back in is always on screen and it names
           where you are. -->
      <button class="here" onclick={() => (open = game.at)}>
        {here.name}<em>read this place</em>
      </button>
    {/if}
    {#if game.econ.obols > 0 || game.econ.tally > 0}
      <div class="purse">
        <b>{Math.floor(game.econ.obols)}</b>
        <span>{game.econ.obols === 1 ? NOUN.one : NOUN.many}</span>
        {#if game.econ.tally < TALLY_CAP}
          <!-- The one sink that raises a rate. Shown only once there is a coin
               to spend, and it says the price rather than greying out mutely. -->
          <button class="buy" onclick={() => dispatch({ type: 'buyTally' })}
            disabled={tallyBlocked(game.econ) !== null}>
            Ferryman's Tally {game.econ.tally}
            <em>{nextTallyCost(game.econ)}</em>
          </button>
        {/if}
      </div>
    {/if}
    {#if game.job}
      <div class="bar"><i style="width:{pct(jobPct)}"></i></div>
    {/if}
    {#if statsMoved}
      <!-- Four numbers on one fixed budget. They only ever swap, so this reads
           as a shape rather than a score — see `stats.ts`. -->
      <ul class="stats">
        {#each STAT_IDS as id (id)}
          <li title={STATS[id].blurb}><b>{STATS[id].name}</b> {game.stats[id]}</li>
        {/each}
      </ul>
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
    {#if game.pack.length || heap.length}
      <!-- Keys and materials on ONE row. They were two, and with five of each
           the footer took a third of the screen. Materials are counted and
           truncated; keys are never hidden because a key is what opens a door
           you have already been told about. -->
      <ul class="pack">
        {#each game.pack as it (it)}<li>{ITEMS[it]?.name ?? it}</li>{/each}
        {#each heap.slice(0, 3) as [id, n] (id)}
          <li class="mat">{id.replace(/-/g, ' ')} ×{n}</li>
        {/each}
        {#if heap.length > 3}<li class="mat more">+{heap.length - 3}</li>{/if}
      </ul>
    {/if}
    {#if soon.length}
      <!-- WHAT YOU GET NEXT, AND HOW FAR OFF. `perks.ts` exists partly for this
           line: a level that unlocks nothing is a number, and a number nobody
           is waiting for is not progression. -->
      <ul class="soon">
        {#each soon as u (u.id)}
          <li><b>{SKILLS[u.id].name} {u.level}</b> {u.perk.label}
            <em>{Math.ceil(u.toGo)} to go</em></li>
        {/each}
      </ul>
    {/if}
  </footer>

  <!-- ⚠️ SETTINGS ARE NOT A GRAPH. `docs/GAME_DESIGN.md` pushes graph-as-UI as
       far as it goes and then names where it stops: text you must read, exact
       numbers, and settings. Moving a save between devices is settings. So it
       is a corner button and a panel, and it does not pretend otherwise. -->
  {#if moved}
    <!-- Only while the board has been dragged. A control that is always there
         to undo something you have not done is one more thing to read. -->
    <button class="recentre" onclick={() => (nudge = { x: 0, y: 0 })}>Recentre</button>
  {/if}

  {#if intro}
    <div class="intro" onclick={() => (intro = false)} role="presentation">
      <div class="introBox">
        <h2>You are the lit dot.</h2>
        <p>The others are places you can walk to. Tap one to go there — some ask
          for a throw of the dice, and some are shut until you are better at
          something.</p>
        <p>Standing still is not wasted: start a job and it keeps working while
          this is closed.</p>
        <button class="act">Begin</button>
      </div>
    </div>
  {/if}

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
  /* ⚠️ SAFE AREA, and it is why the owner could not reset the game. The gear
     sat at top:8 / right:8 of a 100vh box — which on iOS sits UNDER the browser
     chrome and the notch, so the only way to Start Over was behind Edge's own
     UI. The reset was never broken; it was unreachable, and a control you can
     see in a screenshot and cannot touch on a phone is the same defect this
     project keeps re-finding.
     `100dvh` also stops the board resizing every time the URL bar hides. */
  :global(html) { --safe-t: env(safe-area-inset-top, 0px);
    --safe-b: env(safe-area-inset-bottom, 0px);
    --safe-l: env(safe-area-inset-left, 0px);
    --safe-r: env(safe-area-inset-right, 0px); }
  :global(body) { margin: 0; background: #070b10; color: #dfe9f0;
    font: 16px/1.45 ui-sans-serif, system-ui, sans-serif; overscroll-behavior: none;
    -webkit-text-size-adjust: 100%; }
  main { position: relative; height: 100dvh; overflow: hidden;
    touch-action: none; }
  /* Right inset clears the gear button, which was sitting on top of the
     narrator's last two words. */
  .said { position: absolute; inset: calc(10px + var(--safe-t)) 64px auto calc(12px + var(--safe-l)); margin: 0; z-index: 4;
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
  .dot .name { font-size: 14px; color: #93aabb; white-space: nowrap; }
  .dot.you i { width: 18px; height: 18px; background: #8ff0cf;
    box-shadow: 0 0 18px 5px rgba(143,240,207,.35); }
  .dot.you .name { color: #eafff7; font-weight: 700; font-size: 15px; }
  .dot.way i { width: 15px; height: 15px; background: #78e8c0; }
  .dot.way .name { color: #bff3e0; }
  .dot.shut i { width: 15px; height: 15px; background: #f0b45f; }
  .dot.shut .name { color: #f3d6a8; }
  .mark { position: absolute; z-index: 3; transform: translate(-50%, -50%);
    display: grid; justify-items: center; gap: 3px; pointer-events: none; }
  .mark i { width: 7px; height: 7px; border-radius: 50%; background: #3a5164; }
  .mark.been i { background: #587a8f; }
  .mark .name { font-size: 11px; color: #5d7484; white-space: nowrap; }

  .tag { font-size: 13px; color: #8098a9; }
  .tag.shut { color: #f0b45f; max-width: 116px; white-space: normal; text-align: center;
    line-height: 1.25; }

  /* ⚠️ BORDER-BOX. This was `width: 280px` with `padding: 12px 14px` under the
     default content-box, so the card actually measured 308px, overflowed the
     390px viewport past the clamp that was supposed to hold it, and `main`'s
     overflow:hidden sliced the last word off every line. Seen in the
     screenshot, not in a type error. */
  /* ⚠️ CAPPED AT HALF THE SCREEN, AND IT SCROLLS PAST THAT.
     `docs/GAME_DESIGN.md` says the card never scrolls, and that was right when
     it held forty to seventy words and nothing else. It now also carries a work
     button and up to two gathering buttons, so on a shorter screen — an iPhone
     with the URL bar showing, ~660px of usable box — it ran to two thirds of
     the height and squeezed the board into a strip: the dots' centre sat at 24%
     of the stage instead of near the middle. That is the "still misaligned"
     the owner saw and no full-height headless run could show.
     Half the screen for the board, half for what you are reading. */
  .card { position: absolute; box-sizing: border-box; z-index: 5;
    left: calc(12px + var(--safe-l)); right: calc(12px + var(--safe-r));
    bottom: calc(12px + var(--safe-b)); padding: 14px 16px 16px;
    max-height: 52%; overflow-y: auto; overscroll-behavior: contain;
    border-radius: 12px; background: #0d151dfa; border: 1px solid #24384a;
    box-shadow: 0 10px 30px #000a; }
  .card h2 { margin: 0 0 8px; font-size: 18px; letter-spacing: .01em; }
  .card p { margin: 0; font-size: 16px; line-height: 1.5; color: #c8d8e4; }
  .card p.unknown { color: #7f97a8; font-style: italic; }
  .card .x { position: absolute; top: 2px; right: 4px; background: none; border: 0;
    color: #8fa6b6; font-size: 24px; width: 48px; height: 48px; }
  .act { position: relative; overflow: hidden; display: block; width: 100%;
    margin: 10px 0 0; padding: 12px 12px; border-radius: 10px; background: #12222e;
    border: 1px solid #2f5568; color: #cdf3e6; font: inherit; text-align: left; }
  .act span, .act em { position: relative; z-index: 1; }
  /* The bar and the button are one object. A timer you cannot see while you are
     reading the place it is happening at is a timer nobody trusts. */
  .act .fill { position: absolute; inset: 0 auto 0 0; background: #16362f;
    border-right: 1px solid #8ff0cf; }
  /* A running job is NOT dimmed, even though its button is disabled — it is the
     thing currently happening and it should look alive. */
  .act.busy { opacity: 1; border-color: #8ff0cf; color: #eafff7; }
  .act em { display: block; font-size: 13px; color: #8fb6c4; font-style: normal; }
  .act:disabled { opacity: .5; }
  .act.busy:disabled { opacity: 1; }

  /* ⚠️ A SCRIM, because the readouts were sitting directly on the graph's own
     lines and dots — "5 obols" with an edge running through it. The board is
     drawn on a canvas that fills the screen, so anything laid over it needs
     something behind it or the two just interleave. */
  footer { position: absolute; z-index: 4;
    inset: auto 0 0 0;
    padding: 20px calc(12px + var(--safe-r)) calc(12px + var(--safe-b)) calc(12px + var(--safe-l));
    display: grid; gap: 8px; justify-items: start;
    background: linear-gradient(to top, #070b10 60%, #070b10e0 80%, transparent); }
  /* Status stands down while you are reading. It is not gone — it is behind the
     sheet, and closing the sheet is one tap on the ×. */
  footer.stood-down { opacity: 0; pointer-events: none; }
  .bar { width: 100%; height: 4px; border-radius: 3px; background: #16232f; }
  .bar i { display: block; height: 100%; border-radius: 3px; background: #8ff0cf; }
  .skills, .pack { display: flex; gap: 12px; margin: 0; padding: 0; list-style: none;
    flex-wrap: wrap; font-size: 13px; color: #9db3c2; }
  .skills b { color: #dfe9f0; font-weight: 600; }
  .skills em { color: #6f8798; font-style: normal; }
  .pack li { padding: 3px 8px; border-radius: 20px; background: #14202c;
    border: 1px solid #2b4356; color: #cfe3ef; }
  .pack li.mat { background: #191a12; border-color: #3a3320; color: #d8cba8; }
  .pack li.more { color: #8b8168; }
  .said.away { color: #ffd479; font-size: 15px; }
  /* A dot that is neither where you are nor a way on drops back while a card is
     open, so the prose has something to sit against. It stays TAPPABLE — this
     is opacity, not pointer-events, because a control you can see and cannot
     press is the exact complaint this project keeps collecting. */
  .dot.hushed { opacity: .25; }
  .dot.hushed .name, .dot.hushed .tag { opacity: 0; }
  .here { width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 10px;
    background: #12222e; border: 1px solid #2f5568; color: #eafff7; font: inherit;
    font-size: 16px; font-weight: 600; text-align: left; }
  .here em { display: block; font-style: normal; font-size: 13px; font-weight: 400;
    color: #8fb6c4; }
  .purse { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .purse b { color: #ffd479; font-size: 15px; }
  .purse span { color: #8fa6b6; }
  .buy { margin-left: 6px; padding: 6px 10px; border-radius: 8px; background: #1d1a10;
    border: 1px solid #6b5720; color: #ffd479; font: inherit; font-size: 12px; }
  .buy em { font-style: normal; color: #b99a4a; margin-left: 4px; }
  .buy:disabled { opacity: .45; }
  .stats, .soon { display: flex; gap: 10px; margin: 0; padding: 0; list-style: none;
    flex-wrap: wrap; font-size: 13px; color: #9db3c2; }
  .soon { flex-direction: column; gap: 2px; }
  .soon b { color: #cdf3e6; }
  .soon em { font-style: normal; color: #6f8798; }
  .stats b { color: #dfe9f0; font-weight: 600; }
  .act.busy { border-color: #8ff0cf; }
  .loot { padding: 9px 14px; border-radius: 10px; background: #1d1a10;
    border: 1px solid #6b5720; color: #ffd479; font: inherit; font-weight: 600; }
  .loot em { font-style: normal; color: #b99a4a; }

  .intro { position: absolute; inset: 0; z-index: 10; display: grid;
    place-items: center; padding: 24px;
    /* ⚠️ NOT OPAQUE. The whole introduction is one sentence pointing at the
       board — "you are the lit dot" — and at 93% black you could not see the
       lit dot it was pointing at. The scrim has to leave the thing it names
       legible or it is just a wall of text about a wall of text. */
    background: #070b10c8; }
  .introBox { max-width: 320px; }
  .introBox h2 { margin: 0 0 10px; font-size: 20px; color: #eafff7; }
  .introBox p { margin: 0 0 10px; font-size: 16px; line-height: 1.5; color: #c8d8e4; }
  .introBox .act { margin-top: 14px; text-align: center; }
  /* ⚠️ TOP, NOT BOTTOM. This sat at bottom:12 — exactly where the footer's
     readouts are — and printed straight through "Lore 6 You keep notes now…"
     on the owner's phone. The bottom of this screen is spoken for twice over;
     the top is not. */
  .recentre { position: absolute; z-index: 9; left: 50%; transform: translateX(-50%);
    top: calc(var(--safe-t) + 76px); padding: 8px 16px; border-radius: 22px;
    background: #0d151df2; border: 1px solid #2f4557; color: #cfe3ef; font: inherit;
    font-size: 14px; }
  .gear { position: absolute; top: calc(8px + var(--safe-t));
    right: calc(8px + var(--safe-r)); z-index: 9; width: 48px; height: 48px;
    border-radius: 50%; background: #0d151de6; border: 1px solid #2f4557;
    color: #cfe3ef; font-size: 22px; line-height: 1; }
  .sheet { position: absolute; z-index: 8;
    inset: auto calc(12px + var(--safe-r)) calc(12px + var(--safe-b)) calc(12px + var(--safe-l));
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
