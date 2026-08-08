<script lang="ts">
  // THE CITY BUILDER'S ONE SCREEN — docs/CITY.md made flesh. Header of
  // numbers, the board, a dock of deeds. NO PROSE: nouns and numbers.
  import { onMount } from 'svelte';
  import Board, { type Dot, type Line } from './Board.svelte';
  import { INK, TOL } from '../game/ink';
  import type { Box } from '../game/layout';
  import { apply, initial, flow, shown, popCap, pathKey, costOf, pathCostOf,
    priceLine, unlayable, unraisable, unassailable, heroHit, armsCost, hunger,
    SITE, GOBLINS, RATE, TAP_STONE, MAX_GAUGE, HERO_HP, type City } from '../camp/engine';
  import { load, save, wipe, exportRaw, importRaw, elapsedSince } from '../camp/store';
  import { CAMP_SHAPES } from '../camp/scenery';

  let game = $state<City>(initial());
  let ready = $state(false);
  let picked = $state<number | null>(0);
  let menu = $state(false);
  let wiping = $state(false);
  let ported = $state<'copied' | 'refused' | null>(null);

  const act = (a: Parameters<typeof apply>[1]): void => { game = apply(game, a); };

  const f = $derived(flow(game));
  /** ★ The thumb works what you are looking at: pines chop logs by hand,
   *  everything else chips stone — the bootstrap for the logs-priced camp. */
  const tapKind = $derived<'stone' | 'logs'>(
    picked !== null && !game.goblins[picked]
      && SITE.get(picked)?.allows === 'lumber' ? 'logs' : 'stone');
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
        const choked = f.choked.has(key);
        const busy = gauge > 0 && f.comp.has(s.id) && f.comp.has(n)
          && (f.stone + planksNow + f.logs > 0.001);
        out.push({
          a: siteId(s.id), b: siteId(n), rel: 'road',
          fill: gauge > 0 ? 1 : 0,
          load: choked ? 1 : busy ? 0.55 : 0,
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
    const have = game.stacks[s.id] ?? 0;
    const why = unraisable(game, s.id);
    out.push({
      label: `${KIND_NAME[s.allows]} ×${have + 1}`,
      note: why ?? priceLine(costOf(s.allows, have)),
      why,
      go: () => act({ type: 'raise', id: s.id }),
    });
    if (s.id === 0) {
      const p = armsCost(game.hero.arms);
      const short = game.stone < p.stone || game.planks < p.planks;
      out.push({
        label: `Arms ×${game.hero.arms + 1}`,
        note: `${p.stone} stone · ${p.planks} planks — the hero strikes ${heroHit(game) + 1}`,
        why: short ? `${p.stone} stone · ${p.planks} planks` : null,
        go: () => act({ type: 'arm' }),
      });
    }
    for (const n of s.near) {
      const t = SITE.get(n);
      if (!t) continue;
      const gauge = game.paths[pathKey(s.id, n)] ?? 0;
      if (gauge >= MAX_GAUGE) continue;
      const w = unlayable(game, s.id, n);
      out.push({
        label: gauge === 0 ? `Path · ${t.name}` : `Widen · ${t.name} (${gauge} of ${MAX_GAUGE})`,
        note: w ?? `${pathCostOf(gauge)} stone · carries ${((gauge + 1)).toFixed(0)}/s`,
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
          ? ` · eats ${hunger(game).toFixed(1)}/s · fields bring ${f.food.toFixed(1)}/s` : '')
        + (f.starving ? ' — raise or connect farms' : '')
        + (f.staff < 1 && !f.starving ? ` · works ${Math.round(f.staff * 100)}% staffed` : '');
    }
    if (game.goblins[picked]) {
      return `dangerous — goblins, ${game.goblins[picked]} strong`;
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
    <button class="spring" onclick={() => act({ type: 'tap', kind: tapKind })}>
      <b>{Math.floor(game.stone)}</b><span>stone</span>
      <em>+{TAP_STONE} {tapKind} a tap{f.stone > 0 ? ` · +${f.stone.toFixed(1)}/s` : ''}</em>
    </button>
    <span class="keep">{Math.floor(game.logs)} logs</span>
    <span class="keep">{Math.floor(game.planks)} planks{planksNow > 0 ? ` +${planksNow.toFixed(1)}/s` : ''}</span>
    <span class="keep" class:hurt={f.starving}>{Math.floor(game.food)} food{
      f.starving ? ' · STARVING' : hunger(game) > 0 ? ` −${hunger(game).toFixed(1)}/s` : ''}{
      f.food > 0 ? ` +${f.food.toFixed(1)}/s` : ''}</span>
    <span class="keep lv">{Math.floor(game.pop)}/{cap} people</span>
    <span class="keep">hero {game.hero.hp}/{HERO_HP} · arms {game.hero.arms}</span>
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
      <span class="keep build">{__BUILD_ID__}</span>
    {/if}
  </header>

  {#if ready}
    <div class="map">
      <Board {dots} {lines} {box} label="city" onTap={doTap} drag={false}
        decor={CAMP_SHAPES} pulse={pops} />
    </div>
    <section class="panel">
      {#if game.fight}
        {@const at = game.fight.site}
        <h2>Goblins · {game.goblins[at] ?? 0}</h2>
        <p class="note">hero {game.hero.hp}/{HERO_HP} · strikes {heroHit(game)} · they bite {GOBLINS[at]?.bite ?? 2}</p>
        <button class="deed face" onclick={() => act({ type: 'strike' })}>
          Strike
          <em>{game.goblins[at]} − {heroHit(game)}</em>
        </button>
        <button class="deed" onclick={() => act({ type: 'flee' })}>
          Fall back
          <em>walk home and heal</em>
        </button>
      {:else if picked !== null && SITE.has(picked)}
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
  .keep.hurt { color: #b3452f; }
  .keep.build { color: #b0a892; font-weight: 400; font-size: 12px; }
  .reset { font: inherit; font-size: 13px; border: 1px solid #d8d0bf;
    border-radius: 10px; padding: 6px 10px; background: #efe9dc; color: #6b6353; }
  .reset.gear { margin-left: auto; }
  .reset.armed { background: #b3452f; color: #fff; }
  .map { flex: 1; min-height: 0; position: relative; margin: 10px; }
  .panel { padding: 8px 14px 16px; border-top: 1px solid #d8d0bf; background: #f7f2e7;
    min-height: 148px; }
  .panel h2 { margin: 4px 0 6px; font-size: 18px; }
  .note { color: #8a8172; font-size: 14px; margin: 4px 0; }
  .deed { display: block; width: 100%; text-align: left; font: inherit; font-size: 16px;
    border: 1px solid #d8d0bf; border-radius: 12px; background: #fdfaf2;
    padding: 10px 12px; margin: 6px 0; }
  .deed:disabled { background: #e3ddd0; color: #8a8172; }
  .deed em { display: block; font-style: normal; font-size: 12.5px; color: #8a8172; }
</style>
