<script lang="ts">
  // THE CAMP BUILDER'S ONE SCREEN. Header of numbers, the board, a dock of
  // deeds for whatever is tapped. NO PROSE by decree — nouns and numbers.
  import { onMount } from 'svelte';
  import Board, { type Dot, type Line } from './Board.svelte';
  import { INK, TOL } from '../game/ink';
  import type { Box } from '../game/layout';
  import { apply, initial, rates, level, levelOf, shown, component, pathKey,
    unlayable, unraisable, SITE, LEVEL_AT, COST, RATE, TAP_STONE,
    type Camp } from '../camp/engine';
  import { load, save, wipe, exportRaw, importRaw, elapsedSince } from '../camp/store';

  let game = $state<Camp>(initial());
  let ready = $state(false);
  let picked = $state<number | null>(0);
  let menu = $state(false);
  let wiping = $state(false);
  let ported = $state<'copied' | 'refused' | null>(null);

  const act = (a: Parameters<typeof apply>[1]): void => { game = apply(game, a); };

  const r = $derived(rates(game));
  const lv = $derived(level(game));
  const nextAt = $derived(LEVEL_AT[lv - 1] ?? null);

  const siteId = (n: number): string => `site:${n}`;
  const numOf = (id: string): number => Number(id.split(':')[1]);

  /** What stands where, as a label: a noun, and a number when it moves. */
  function nameOf(id: number): string {
    const s = SITE.get(id)!;
    const k = game.built[id];
    if (!k) return s.name;
    if (k === 'village') return `Camp · ${lv}`;
    const dead = !r.comp.has(id);
    if (k === 'quarry') return dead ? 'Quarry · 0' : `Quarry · ${RATE.quarry}/s`;
    if (k === 'lumber') return dead ? 'Lumberworks · 0' : `Lumberworks · ${RATE.lumber}/s`;
    return dead ? 'Sawmill · 0' : `Sawmill · ${Math.min(RATE.sawmill, r.planks || RATE.sawmill)}/s`;
  }

  const dots = $derived<Dot[]>(shown(game).map((s) => ({
    id: siteId(s.id),
    name: nameOf(s.id),
    kind: s.id === 0 ? 'carry' : game.built[s.id] ? 'fact' : 'stop',
    wx: s.x, wy: s.y,
    place: true, you: false,
    open: r.comp.has(s.id) && !!game.built[s.id],
    shut: false,
    known: true,
    on: picked === s.id,
    barred: false,
  })));

  const lines = $derived<Line[]>((() => {
    const out: Line[] = [];
    const seen = new Set<string>();
    const busy = r.stone + r.planks > 0;
    for (const s of shown(game)) {
      for (const n of s.near) {
        const key = pathKey(s.id, n);
        if (seen.has(key) || (SITE.get(n)?.level ?? 9) > lv) continue;
        seen.add(key);
        const laid = !!game.paths[key];
        const carrying = laid && busy && r.comp.has(s.id) && r.comp.has(n);
        out.push({
          a: siteId(s.id), b: siteId(n), rel: 'road',
          fill: laid ? 1 : 0,
          load: carrying ? 0.7 : 0,
          gauge: laid ? 1 : 0,
          // The flow runs toward the camp: from the higher id end for want
          // of a solved direction — the crawl only needs A direction.
          dir: carrying ? (s.id === 0 || n > s.id ? -1 : 1) : 0,
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
    if (s.allows && !game.built[s.id]) {
      const why = unraisable(game, s.id);
      out.push({
        label: `Raise the ${s.allows}`,
        note: why ?? `${COST[s.allows]} stone`,
        why,
        go: () => act({ type: 'raise', id: s.id }),
      });
    }
    for (const n of s.near) {
      const t = SITE.get(n);
      if (!t || t.level > lv || game.paths[pathKey(s.id, n)]) continue;
      const why = unlayable(game, s.id, n);
      out.push({
        label: `Path · ${t.name}`,
        note: why ?? `${COST.path} stone`,
        why,
        go: () => act({ type: 'lay', a: s.id, b: n }),
      });
    }
    return out;
  })());

  /** The tapped site's one status line: numbers, not sentences. */
  const status = $derived((() => {
    if (picked === null) return '';
    const k = game.built[picked];
    if (picked === 0) {
      return nextAt === null
        ? `Camp ${lv} · ${Math.floor(game.progress)} planks taken`
        : `Camp ${lv} · ${Math.floor(game.progress)} / ${nextAt} planks`;
    }
    if (!k) return SITE.get(picked)?.allows ? '' : '';
    if (!r.comp.has(picked)) return 'no path to the camp · makes 0';
    return '';
  })());

  function doTap(id: string): void {
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
      <em>+{TAP_STONE} a tap{r.stone > 0 ? ` · +${r.stone.toFixed(1)}/s` : ''}</em>
    </button>
    <span class="keep">{Math.floor(game.logs)} logs</span>
    <span class="keep">{Math.floor(game.planks)} planks{r.planks > 0 ? ` +${r.planks.toFixed(1)}/s` : ''}</span>
    <span class="keep lv">Camp {lv}{nextAt !== null ? ` · ${Math.floor(game.progress)}/${nextAt}` : ''}</span>
    <button class="reset gear" onclick={() => (menu = !menu)}>{menu ? 'Close' : '⋯'}</button>
    {#if menu}
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
    {/if}
  </header>

  {#if ready}
    <div class="map">
      <Board {dots} {lines} {box} label="camp" onTap={doTap} drag={false} />
    </div>
    <section class="panel">
      {#if picked !== null && SITE.has(picked)}
        <h2>{nameOf(picked)}</h2>
        {#if status}<p class="note">{status}</p>{/if}
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
  main { display: flex; flex-direction: column; height: 100dvh; background: #efe9dc; }
  header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px; border-bottom: 1px solid #d8d0bf; }
  .spring { display: flex; align-items: baseline; gap: 6px; border: 1px solid #d8d0bf;
    border-radius: 12px; padding: 8px 14px; background: #f7f2e7; font: inherit; }
  .spring b { font-size: 22px; color: #1f6b3a; }
  .spring em { font-style: normal; font-size: 12px; color: #8a8172; }
  .keep { font-size: 14px; color: #6b5d3f; font-weight: 600; }
  .keep.lv { color: #1f6b3a; }
  .reset { margin-left: auto; font: inherit; font-size: 13px; border: 1px solid #d8d0bf;
    border-radius: 10px; padding: 6px 10px; background: #efe9dc; color: #6b6353; }
  .reset.porter, .reset:not(.gear) { margin-left: 0; }
  .reset.gear { margin-left: auto; }
  .reset.armed { background: #b3452f; color: #fff; }
  .map { flex: 1; min-height: 0; position: relative; margin: 10px; }
  .panel { padding: 8px 14px 16px; border-top: 1px solid #d8d0bf; background: #f7f2e7;
    min-height: 132px; }
  .panel h2 { margin: 4px 0 6px; font-size: 18px; }
  .note { color: #8a8172; font-size: 14px; margin: 4px 0; }
  .deed { display: block; width: 100%; text-align: left; font: inherit; font-size: 16px;
    border: 1px solid #d8d0bf; border-radius: 12px; background: #fdfaf2;
    padding: 10px 12px; margin: 6px 0; }
  .deed:disabled { background: #e3ddd0; color: #8a8172; }
  .deed em { display: block; font-style: normal; font-size: 12.5px; color: #8a8172; }
</style>
