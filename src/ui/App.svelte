<script lang="ts">
  import { onMount } from 'svelte';
  import { game, awayReport, dispatch, exportSave, flushProject, importSave, startGame } from '../shell/game';
  import { ticker } from '../shell/ticker';
  import { generatorCost, ratePerSecond } from '../core/engine';
  import { format, formatWhole, gte } from '../core/numbers';
  import { GENERATORS, M1_ROSTER } from '../content/generators';
  import { RESOURCE_LABELS } from '../content/resources';
  import { stageHue } from '../render/minigraph';
  import GraphPanel from './GraphPanel.svelte';

  let toast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let pulseKey = $state(0);

  const mainRate = $derived(ratePerSecond($game, 'data'));

  // The whole UI's accent drifts with graph size — the world ages with you.
  const hue = $derived(stageHue($game.graph.nodes));
  $effect(() => {
    document.documentElement.style.setProperty('--hue', String(Math.round(hue)));
  });

  // Horizon tease: the next machine is visible (locked) once you own the first.
  const nextLocked = $derived($game.generators.harvester >= 1 ? GENERATORS.extractor : null);

  let floats = $state<{ id: number; x: number }[]>([]);
  let nextFloatId = 0;

  function connect() {
    dispatch({ type: 'manualConnect' });
    pulseKey++;
    const id = nextFloatId++;
    floats.push({ id, x: (id * 37) % 80 - 40 }); // deterministic scatter, no RNG needed
    setTimeout(() => (floats = floats.filter((f) => f.id !== id)), 700);
  }

  function buy(id: (typeof M1_ROSTER)[number]) {
    const g = GENERATORS[id];
    const affordable = gte($game.resources[g.costResource], generatorCost($game, id));
    dispatch({ type: 'buyGenerator', id });
    if (affordable) pulseKey++; // fuel became structure — the graph answers the purchase
  }

  function say(msg: string) {
    toast = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 2500);
  }

  async function onExport() {
    try {
      await navigator.clipboard.writeText(exportSave());
      say('Save copied to clipboard');
    } catch {
      window.prompt('Copy your save:', exportSave());
    }
  }

  async function onImport() {
    let blob: string | null = null;
    try {
      blob = await navigator.clipboard.readText();
    } catch {
      blob = window.prompt('Paste your save:');
    }
    if (!blob?.trim()) return;
    try {
      await importSave(blob);
      say('Save imported');
    } catch {
      say('That is not a valid save — nothing changed');
    }
  }

  // Flush is the one sanctioned way progress dies — it takes TWO taps.
  let flushArmed = $state(false);
  let flushTimer: ReturnType<typeof setTimeout> | undefined;

  async function onFlush() {
    if (!flushArmed) {
      flushArmed = true;
      clearTimeout(flushTimer);
      flushTimer = setTimeout(() => (flushArmed = false), 4000);
      return;
    }
    clearTimeout(flushTimer);
    flushArmed = false;
    await flushProject();
    say('Project flushed');
  }

  function fmtDuration(ms: number): string {
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }

  onMount(() => {
    void startGame();
  });
</script>

<main>
  <header>
    <h1>Semantic Drift</h1>
  </header>

  {#if $awayReport && $awayReport.elapsedMs > 0}
    <div class="away">
      <div>
        <strong>While you were away ({fmtDuration($awayReport.elapsedMs)})</strong>
        <ul>
          {#each Object.entries($awayReport.gains) as [res, gain]}
            <li>+{format(gain)} {RESOURCE_LABELS[res as keyof typeof RESOURCE_LABELS]}</li>
          {:else}
            <li>nothing happened. The graph waited.</li>
          {/each}
        </ul>
      </div>
      <button class="ghost" onclick={() => awayReport.set(null)}>OK</button>
    </div>
  {/if}

  <section class="counter" aria-live="polite">
    <div class="amount">{formatWhole($game.resources.data)}</div>
    <div class="sub">
      {RESOURCE_LABELS.data}
      {#if mainRate !== '0'}<span class="rate">+{format(mainRate)}/s</span>{/if}
    </div>
  </section>

  <GraphPanel graph={$game.graph} {pulseKey} />

  {#if $ticker.length > 0}
    {@const last = $ticker[$ticker.length - 1]}
    <div class="ticker" aria-live="polite">
      {#key last?.id}<span class="ticker-line">▸ {last?.text}</span>{/key}
    </div>
  {/if}

  <div class="connect-wrap">
    <button class="connect" onclick={connect}>
      Connect
      <small>+1 Datum · grows the graph</small>
    </button>
    {#each floats as f (f.id)}
      <span class="float" style="left: calc(50% + {f.x}px)">+1</span>
    {/each}
  </div>

  <section class="shop">
    {#each M1_ROSTER as id}
      {@const g = GENERATORS[id]}
      {@const cost = generatorCost($game, id)}
      {@const affordable = gte($game.resources[g.costResource], cost)}
      <button class="gen" onclick={() => buy(id)} disabled={!affordable}>
        <span class="gen-name">
          {g.label}
          <small>+{format(g.baseRate)} {RESOURCE_LABELS[g.produces]}/s</small>
        </span>
        <span class="gen-meta">
          <span class="owned">×{$game.generators[id]}</span>
          <span class="cost" class:ok={affordable}>
            {format(cost)} {RESOURCE_LABELS[g.costResource]}
          </span>
        </span>
      </button>
    {/each}
    {#if nextLocked}
      <div class="gen locked">
        <span class="gen-name">???</span>
        <span class="gen-meta">
          <span class="cost">
            {format(nextLocked.baseCost)} {RESOURCE_LABELS[nextLocked.costResource]}
          </span>
        </span>
      </div>
    {/if}
  </section>

  <footer>
    <button class="ghost" onclick={onExport}>Export save</button>
    <button class="ghost" onclick={onImport}>Import save</button>
    <button class="ghost danger" class:armed={flushArmed} onclick={onFlush}>
      {flushArmed ? 'Tap again to wipe' : 'Flush project'}
    </button>
  </footer>

  {#if toast}<div class="toast">{toast}</div>{/if}
</main>

<style>
  main {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: calc(env(safe-area-inset-top) + 12px) 16px calc(env(safe-area-inset-bottom) + 16px);
    box-sizing: border-box;
  }
  header h1 {
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #7f95a3;
    margin: 0;
    text-align: center;
  }
  .away {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: #122020;
    border: 1px solid #1f4a42;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 0.9rem;
  }
  .away ul { margin: 4px 0 0; padding-left: 18px; }
  .counter { text-align: center; }
  .amount {
    font-size: 3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #eaf6f2;
    line-height: 1.1;
  }
  .sub { color: #7f95a3; font-size: 0.95rem; }
  .rate { color: hsl(var(--hue, 168) 70% 60%); margin-left: 6px; }
  .connect {
    appearance: none;
    border: none;
    border-radius: 16px;
    padding: 18px;
    font-size: 1.25rem;
    font-weight: 700;
    color: #06231d;
    background: linear-gradient(
      180deg,
      hsl(var(--hue, 168) 82% 66%),
      hsl(var(--hue, 168) 55% 51%)
    );
    box-shadow: 0 6px 24px hsl(var(--hue, 168) 70% 60% / 0.25);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .connect:active { transform: scale(0.98); }
  .connect small { font-size: 0.75rem; font-weight: 500; opacity: 0.75; }
  .connect-wrap { position: relative; display: flex; flex-direction: column; }
  .float {
    position: absolute;
    top: -4px;
    transform: translateX(-50%);
    font-weight: 700;
    font-size: 1rem;
    color: hsl(var(--hue, 168) 70% 65%);
    pointer-events: none;
    animation: float-up 0.7s ease-out forwards;
  }
  @keyframes float-up {
    from { opacity: 1; translate: 0 0; }
    to { opacity: 0; translate: 0 -34px; }
  }
  .ticker {
    height: 1.15rem;
    overflow: hidden;
    text-align: center;
    font-size: 0.8rem;
    color: #7f95a3;
  }
  .ticker-line {
    display: inline-block;
    animation: ticker-in 0.35s ease-out;
  }
  @keyframes ticker-in {
    from { opacity: 0; translate: 0 8px; }
    to { opacity: 1; translate: 0 0; }
  }
  .shop { display: flex; flex-direction: column; gap: 10px; }
  .gen {
    appearance: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    background: #111826;
    border: 1px solid #1d2a3d;
    border-radius: 14px;
    padding: 12px 14px;
    color: #eaf6f2;
    font-size: 1rem;
    cursor: pointer;
    text-align: left;
  }
  .gen:disabled { opacity: 0.55; cursor: default; }
  .gen-name { display: flex; flex-direction: column; gap: 2px; font-weight: 600; }
  .gen-name small { color: #7f95a3; font-weight: 400; font-size: 0.78rem; }
  .gen-meta { display: flex; flex-direction: column; align-items: end; gap: 2px; }
  .owned { color: #7f95a3; font-size: 0.85rem; }
  .cost { color: #b06a6a; font-variant-numeric: tabular-nums; font-size: 0.9rem; }
  .cost.ok { color: hsl(var(--hue, 168) 70% 60%); }
  .gen.locked { opacity: 0.4; cursor: default; filter: saturate(0.4); }
  .gen.locked .cost { color: #7f95a3; }
  footer { margin-top: auto; display: flex; gap: 10px; justify-content: center; }
  .ghost {
    appearance: none;
    background: transparent;
    border: 1px solid #22304a;
    color: #7f95a3;
    border-radius: 10px;
    padding: 8px 14px;
    font-size: 0.85rem;
    cursor: pointer;
  }
  .ghost.danger { border-color: #4a2230; color: #a37f8b; }
  .ghost.danger.armed {
    border-color: #b04a5a;
    color: #ffdfe4;
    background: #3a1620;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom) + 24px);
    transform: translateX(-50%);
    background: #1a2636;
    color: #eaf6f2;
    border: 1px solid #2a3d5c;
    border-radius: 10px;
    padding: 10px 16px;
    font-size: 0.9rem;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  }
</style>
