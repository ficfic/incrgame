<script lang="ts">
  // THE CITY BUILDER'S ONE SCREEN — docs/CITY.md made flesh. Header of
  // numbers, the board, a dock of deeds. NO PROSE: nouns and numbers.
  import { onMount } from 'svelte';
  import Board, { type Dot, type Line } from './Board.svelte';
  import { INK, TOL } from '../game/ink';
  import type { Box } from '../game/layout';
  import { apply, initial, flow, shown, popCap, pathKey, costOf, pathCostOf,
    priceLine, unlayable, unraisable, unassailable, heroHit, armsCost, hunger,
    heroMax, WILD_FED, SITE, GOBLINS, RATE, TAP_STONE, MAX_GAUGE, CREW, PATH_SECS,
    type City } from '../camp/engine';
  import { load, save, wipe, exportRaw, importRaw, elapsedSince } from '../camp/store';
  import { CAMP_SHAPES } from '../camp/scenery';

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
  /** Planks the mills can actually deliver right now: capacity, starved to
   *  the log supply when the pile is dry. The header never overpromises. */
  const planksNow = $derived(
    game.logs > 0.05 ? f.planks : Math.min(f.planks, f.logs));

  // ★ +1 POPS over the camp: one bump per whole stone landed, any source.
  // The board itself throttles to one a second and clears them on a pan.
  let pops = $state(0);
  let lastWholeStone = 0;
  $effect(() => {
    const w = Math.floor(game.stone);
    if (w > lastWholeStone) pops++;
    lastWholeStone = w;
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
    if (id === 0) return n > 0 ? `Camp · Hut ×${n}` : 'The Camp';
    if (n <= 0) return s.name;
    const made = f.made.get(id) ?? 0;
    const carried = f.carried.get(id) ?? 0;
    const kind = `${KIND_NAME[s.allows]} ×${n}`;
    if (!f.comp.has(id)) return `${kind} · 0`;
    if (carried < made - 1e-9) {
      return `${kind} · makes ${made.toFixed(1)} · carries ${carried.toFixed(1)}`;
    }
    return `${kind} · ${made.toFixed(1)}/s`;
  }

  const dots = $derived<Dot[]>(shown(game).map((s) => ({
    id: siteId(s.id),
    name: nameOf(s.id),
    kind: game.goblins[s.id] ? 'foe'
      : s.id === 0 ? 'carry' : (game.stacks[s.id] ?? 0) > 0 ? 'fact' : 'stop',
    wx: s.x, wy: s.y,
    place: true, you: false,
    open: f.comp.has(s.id) && (game.stacks[s.id] ?? 0) > 0,
    shut: false,
    known: true,
    on: picked === s.id,
    barred: false,
    // ★ The picked site is unmissable — the owner could not tell what
    // was selected. Half again the size is a statement, not a hint.
    r: picked === s.id ? 8 : undefined,
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
          dir: busy || choked ? (n > s.id ? -1 : 1) : 0,
          carry: true,
        });
      }
    }
    return out;
  })());

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
      const why = unassailable(game, s.id);
      out.push({
        label: 'Send the hero',
        note: why ?? `strikes ${heroHit(game)} · they bite ${GOBLINS[s.id]?.bite ?? 2}`,
        why,
        go: () => act({ type: 'assail', id: s.id }),
      });
      return out;
    }
    // ★ HAND WORK AT THE TREES — the owner: *"lumberworks is soft locked…
    // there's no way to get the lumber needed."* There was, and nobody
    // could find it (the header button quietly changed meaning). Now the
    // chop is a deed ON the pines, where a person would look for it.
    if (s.allows === 'lumber') {
      out.push({
        label: 'Chop logs by hand',
        note: `+${TAP_STONE} a tap · ${Math.floor(game.logs)} held`,
        why: null,
        go: () => act({ type: 'tap', kind: 'logs' }),
      });
    }
    const have = game.stacks[s.id] ?? 0;
    const why = unraisable(game, s.id);
    out.push({
      label: `${KIND_NAME[s.allows]} ×${have + 1}`,
      note: (why ?? priceLine(costOf(s.allows, have)))
        + (have > 0 ? ` · ${have} standing` : ''),
      why,
      go: () => act({ type: 'raise', id: s.id }),
    });
    if (s.id === 0) {
      const p = armsCost(game.hero.arms);
      const short = game.stone < p.stone || game.planks < p.planks;
      out.push({
        label: `Arms ×${game.hero.arms + 1}`,
        note: `${p.stone} stone · ${p.planks} planks → strikes ${heroHit(game) + 1}`
          + (game.hero.arms > 0 ? ` · ${game.hero.arms} carried` : ''),
        why: short ? `${p.stone} stone · ${p.planks} planks` : null,
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
          note: `${Math.ceil(job.left)}s`,
          why: `${Math.ceil(job.left)}s`,
          go: () => {},
        });
        continue;
      }
      const gauge = game.paths[key] ?? 0;
      if (gauge >= MAX_GAUGE) continue;
      const w = unlayable(game, s.id, n);
      out.push({
        label: gauge === 0 ? `Path · ${t.name}` : `Widen · ${t.name} (${gauge} of ${MAX_GAUGE})`,
        note: w ?? `${pathCostOf(gauge)} stone · ${PATH_SECS * (gauge + 1)}s · carries ${((gauge + 1)).toFixed(0)}/s`,
        why: w,
        go: () => act({ type: 'lay', a: s.id, b: n }),
      });
    }
    return out;
  })());

  /** The tapped site's one status line — numbers, and only when they bite. */
  const status = $derived((() => {
    if (picked === null) return '';
    if (picked === 0) {
      return `${Math.floor(game.pop)} of ${cap} people`
        + (hunger(game) > 0
          ? ` · eats ${hunger(game).toFixed(1)}/s · fields bring ${f.food.toFixed(1)}/s`
          : ` · the wild feeds ${WILD_FED}`)
        + (f.starving ? ' — raise or connect farms' : '')
        + (f.staff < 1 && !f.starving ? ` · works ${Math.round(f.staff * 100)}% staffed` : '');
    }
    if (game.goblins[picked]) {
      return `dangerous — goblins, ${Math.ceil(game.goblins[picked] ?? 0)} strong`;
    }
    const n = game.stacks[picked] ?? 0;
    if (n <= 0) return '';
    if (!f.comp.has(picked)) return 'no path to the camp · carries 0';
    if (SITE.get(picked)?.allows === 'sawmill' && f.millCap > 0
      && f.logsIn + (game.logs > 0.05 ? 1 : 0) < f.millCap - 1e-9) {
      return `logs in ${f.logsIn.toFixed(1)}/s of ${f.millCap.toFixed(1)}/s — wire the pines closer`;
    }
    const made = f.made.get(picked) ?? 0;
    const carried = f.carried.get(picked) ?? 0;
    if (carried < made - 1e-9) {
      return `choked · ${(made - carried).toFixed(1)}/s wasted — widen the path`;
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
    picked = picked === n ? null : n;
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
      game = secs > 1 ? apply(back.game, { type: 'tick', secs }) : back.game;
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
  <header>
    <button class="spring" onclick={() => act({ type: 'tap' })}>
      <b>{Math.floor(game.stone)}</b><span>stone</span>
      <em>+{TAP_STONE}{f.stone > 0 ? ` · +${f.stone.toFixed(1)}/s` : ''}</em>
    </button>
    <span class="keep">{Math.floor(game.logs)} logs</span>
    <span class="keep">{Math.floor(game.planks)} planks{planksNow > 0 ? ` +${planksNow.toFixed(1)}/s` : ''}</span>
    <span class="keep" class:hurt={f.starving}>{Math.floor(game.food)} food{
      f.starving ? ' · STARVING' : hunger(game) > 0 ? ` −${hunger(game).toFixed(1)}/s` : ''}{
      f.food > 0 ? ` +${f.food.toFixed(1)}/s` : ''}</span>
    <span class="keep lv">{game.pop > cap
      ? `${Math.floor(game.pop)} people · huts full`
      : `${Math.floor(game.pop)}/${cap} people`}</span>
    <span class="keep">hero {game.hero.hp}/{heroMax(game)} · arms {game.hero.arms}</span>
    <button class="reset gear" onclick={() => (menu = !menu)}>{menu ? 'Close' : '⋯'}</button>
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
        decor={CAMP_SHAPES} pulse={pops} />
    </div>
    <section class="panel">
      {#if awayLine}
        <p class="away">{awayLine}</p>
      {/if}
      {#if won}
        <p class="away">{won}</p>
      {/if}
      {#if game.fight}
        {@const at = game.fight.site}
        <h2>Goblins · {Math.ceil(game.goblins[at] ?? 0)}</h2>
        <p class="note">hero {game.hero.hp}/{heroMax(game)} · strikes {heroHit(game)} · they bite {GOBLINS[at]?.bite ?? 2}</p>
        <button class="deed face" onclick={() => act({ type: 'strike' })}>
          Strike
          <em>{Math.ceil(game.goblins[at] ?? 0)} − {heroHit(game)}</em>
        </button>
        <button class="deed" onclick={() => act({ type: 'flee' })}>
          Fall back
          <em>walk home and heal</em>
        </button>
      {:else if picked !== null && SITE.has(picked)}
        <h2>{nameOf(picked)}</h2>
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
        {#each deeds as d (d.label)}
          <button class="deed" disabled={d.why !== null} onclick={d.go}>
            {d.label}
            <em>{d.note}</em>
          </button>
        {/each}
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
  header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px; border-bottom: 1px solid #d8d0bf; }
  .spring { display: flex; align-items: baseline; gap: 6px; border: 1px solid #d8d0bf;
    border-radius: 12px; padding: 8px 14px; background: #f7f2e7; font: inherit; }
  .spring b { font-size: 22px; color: #1f6b3a; }
  .spring em { font-style: normal; font-size: 12px; color: #8a8172; }
  .keep { font-size: 14px; color: #6b5d3f; font-weight: 600; }
  .keep.lv { color: #1f6b3a; }
  .keep.hurt { color: #b3452f; }
  .keep.build { color: #b0a892; font-weight: 400; font-size: 12px; }
  .reset { font: inherit; font-size: 13px; border: 1px solid #d8d0bf;
    border-radius: 10px; padding: 6px 10px; background: #efe9dc; color: #6b6353; }
  .reset.gear { margin-left: auto; }
  .reset.armed { background: #b3452f; color: #fff; }
  .map { flex: 1; min-height: 0; position: relative; margin: 10px; }
  .panel { padding: 8px 14px 16px; border-top: 1px solid #d8d0bf; background: #f7f2e7;
    min-height: 148px; max-height: 44dvh; overflow-y: auto; }
  .menurow { flex-basis: 100%; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .panel h2 { margin: 4px 0 6px; font-size: 18px; }
  .note { color: #8a8172; font-size: 14px; margin: 4px 0; }
  .deed { display: block; width: 100%; text-align: left; font: inherit; font-size: 16px;
    border: 1px solid #d8d0bf; border-radius: 12px; background: #fdfaf2;
    padding: 10px 12px; margin: 6px 0; }
  .deed:disabled { background: #e3ddd0; color: #8a8172; }
  .deed em { display: block; font-style: normal; font-size: 12.5px; color: #8a8172; }
  .crew { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .crew span { font-size: 14px; color: #6b5d3f; }
  .crew button { font: inherit; font-size: 18px; line-height: 1; width: 34px; height: 34px;
    border: 1px solid #d8d0bf; border-radius: 10px; background: #fdfaf2; }
  .crew button:disabled { color: #c9c1ae; }
  .crew .autoback { width: auto; font-size: 13px; padding: 0 10px; color: #6b6353; }
  .away { margin: 4px 0 8px; font-size: 14px; font-weight: 600; color: #1f6b3a;
    border: 1px solid #cfe2cd; background: #eef5ec; border-radius: 10px; padding: 8px 10px; }
</style>
