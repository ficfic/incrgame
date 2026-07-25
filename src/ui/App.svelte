<script lang="ts">
  import { onMount } from 'svelte';
  import { game, awayReport, dispatch, exportSave, flushProject, importSave, startGame } from '../shell/game';
  import { ticker } from '../shell/ticker';
  import {
    claimCost, coverage, driftPerSecond, fidelity, generatorCost, pendingVignette,
    ratePerSecond, recovered, REFLECT_MIN_CONCEPTS, reviewQueue, verified,
  } from '../core/engine';
  import { format, formatWhole, gte } from '../core/numbers';
  import { GENERATORS, M1_ROSTER } from '../content/generators';
  import { RESOURCE_LABELS } from '../content/resources';
  import { VIGNETTES } from '../content/vignettes';
  import { CONCEPT_BUDGET } from '../content/ontologyMeta';
  import { FRONTIER_CAP } from '../core/graph';
  import { stageHue } from '../render/minigraph';
  import { conceptForNode, loadManifest, ontologyCredit, ontologyRevision } from '../shell/ontology';
  import GraphPanel from './GraphPanel.svelte';
  import ReviewPanel from './ReviewPanel.svelte';
  import VignettePanel from './VignettePanel.svelte';

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

  const frontierFull = $derived($game.forged.frontier.length >= FRONTIER_CAP);
  const nextClaimCost = $derived(claimCost($game));

  function survey() {
    if (frontierFull) {
      say('Frontier is full — connect something first');
      return;
    }
    dispatch({ type: 'survey' });
    pulseKey++;
    const id = nextFloatId++;
    floats.push({ id, x: (id * 37) % 80 - 40 }); // deterministic scatter, no RNG needed
    setTimeout(() => (floats = floats.filter((f) => f.id !== id)), 700);
  }

  // The concept most recently wired in — the card below the graph reads it back.
  // Held as an id, not a snapshot, so it fills in if its chunk lands afterwards.
  let recoveredId = $state<number | null>(null);
  const recoveredConcept = $derived.by(() => {
    void $ontologyRevision; // re-resolve when a chunk arrives
    return recoveredId === null ? null : conceptForNode(recoveredId);
  });
  const credit = $derived.by(() => {
    void $ontologyRevision;
    return ontologyCredit();
  });

  // ---- the speed-versus-truth readouts ----
  const trust = $derived(fidelity($game));
  const verifiedCount = $derived(verified($game));
  const cover = $derived(coverage($game));
  const recoveredCount = $derived(recovered($game));
  const queue = $derived(reviewQueue($game));
  const rotPerSec = $derived(driftPerSecond($game));
  const canReflect = $derived(recoveredCount >= REFLECT_MIN_CONCEPTS);

  const activeVignette = $derived.by(() => {
    const id = pendingVignette($game);
    return id ? (VIGNETTES.find((v) => v.id === id) ?? null) : null;
  });

  // Stacked provenance bar: what share of the graph is trusted, unchecked, rotted.
  const bar = $derived.by(() => {
    const total = Number($game.resources.triples) || 0;
    if (total <= 0) return { v: 0, u: 0, d: 0 };
    const u = Number($game.provenance.unverified) || 0;
    const d = Number($game.provenance.drifted) || 0;
    const v = Math.max(0, total - u - d);
    return { v: (v / total) * 100, u: (u / total) * 100, d: (d / total) * 100 };
  });

  /** One line per machine describing its actual effect on the loop, built from
   *  its own rate. Mechanical description, not flavour — the labels themselves
   *  are still owner-writable copy. */
  function machineRole(id: (typeof M1_ROSTER)[number]): string {
    const g = GENERATORS[id];
    const r = format(g.baseRate);
    switch (id) {
      case 'harvester': return `+${r} ${RESOURCE_LABELS.data}/s`;
      case 'extractor': return `+${r} statements/s · unverified`;
      case 'orchestrator': return `checks ${r} statements/s`;
      case 'reasoner': return `+${r} concepts/s × fidelity²`;
      default: return `+${r}/s`;
    }
  }

  function review(keep: boolean[]) {
    dispatch({ type: 'reviewBatch', keep });
    pulseKey++;
  }

  function choose(choiceId: string) {
    if (activeVignette) dispatch({ type: 'chooseOption', eventId: activeVignette.id, choiceId });
  }

  function absorb() {
    dispatch({ type: 'absorb' });
    pulseKey++;
  }

  let reflectArmed = $state(false);
  let reflectTimer: ReturnType<typeof setTimeout> | undefined;
  function onReflect() {
    if (!canReflect) return;
    if (!reflectArmed) {
      reflectArmed = true;
      clearTimeout(reflectTimer);
      reflectTimer = setTimeout(() => (reflectArmed = false), 4000);
      return;
    }
    clearTimeout(reflectTimer);
    reflectArmed = false;
    dispatch({ type: 'reflect' });
    recoveredId = null;
  }

  function claim(id: number) {
    const affordable = gte($game.resources.data, nextClaimCost);
    if (!affordable) {
      say(`Connecting costs ${format(nextClaimCost)} ${RESOURCE_LABELS.data}`);
      return;
    }
    dispatch({ type: 'claimNode', id });
    // succeeded iff it left the frontier (anchor count can sit at its cap)
    if (!$game.forged.frontier.includes(id)) recoveredId = id;
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
    void loadManifest(); // concept chunks load lazily behind this
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

  <!-- Banked away-work. Nothing rotted while the player was gone; it starts to
       drift only once absorbed, in front of them. -->
  {#if gte($game.pending, '1')}
    <button class="banked" onclick={absorb}>
      Absorb {formatWhole($game.pending)} banked statements
      <small>unverified on arrival · they drift from then on</small>
    </button>
  {/if}

  <section class="counter" aria-live="polite">
    <div class="amount">{formatWhole($game.resources.data)}</div>
    <div class="sub">
      {RESOURCE_LABELS.data}
      {#if mainRate !== '0'}<span class="rate">+{format(mainRate)}/s</span>{/if}
    </div>
  </section>

  <GraphPanel graph={$game.graph} forged={$game.forged} {pulseKey} onclaim={claim} />

  <!-- Provenance: the whole game in one bar. Trusted / unchecked / rotted. -->
  {#if gte($game.resources.triples, '1')}
    <section class="prov">
      <div class="prov-bar" role="img"
           aria-label="{bar.v.toFixed(0)}% verified, {bar.u.toFixed(0)}% unverified, {bar.d.toFixed(0)}% drifted">
        <span class="seg v" style="width:{bar.v}%"></span>
        <span class="seg u" style="width:{bar.u}%"></span>
        <span class="seg d" style="width:{bar.d}%"></span>
      </div>
      <div class="prov-legend">
        <span class="k v">{formatWhole(verifiedCount)} verified</span>
        <span class="k u">{formatWhole($game.provenance.unverified)} unchecked</span>
        <span class="k d">{formatWhole($game.provenance.drifted)} drifted</span>
      </div>
      <div class="prov-stats">
        <span>Fidelity <b>{(trust * 100).toFixed(1)}%</b></span>
        {#if rotPerSec > 0}
          <span>drift <b>{(rotPerSec * 100).toFixed(2)}%/s</b> of unchecked</span>
        {/if}
        {#if $game.reflection > 0}
          <span>gen <b>{$game.reflection + 1}</b> · synthetic <b>{($game.syntheticShare * 100).toFixed(0)}%</b></span>
        {/if}
      </div>
    </section>
  {/if}

  {#if activeVignette}
    <VignettePanel vignette={activeVignette} onchoose={choose} />
  {/if}

  {#if recoveredConcept}
    {#key recoveredConcept.index}
      <section class="recovered" aria-live="polite">
        <div class="recovered-head">
          <span class="tag">Recovered</span>
          <span class="domain">{recoveredConcept.category}</span>
        </div>
        <div class="term">{recoveredConcept.label}</div>
        {#if recoveredConcept.gloss}<p class="gloss">{recoveredConcept.gloss}</p>{/if}
      </section>
    {/key}
  {/if}

  <div class="coverage">
    {formatWhole(String(recoveredCount))} / {CONCEPT_BUDGET.toLocaleString('en-US')} concepts
    · {(cover * 100).toFixed(cover < 0.01 ? 3 : 2)}%
  </div>

  {#if queue.length > 0}
    <ReviewPanel items={queue} oncommit={review} />
  {/if}

  {#if $game.forged.frontier.length > 0}
    <div class="hint">
      tap a hollow entity to connect it · {format(nextClaimCost)} {RESOURCE_LABELS.data}
    </div>
  {/if}

  {#if $ticker.length > 0}
    {@const last = $ticker[$ticker.length - 1]}
    <div class="ticker" aria-live="polite">
      {#key last?.id}<span class="ticker-line">▸ {last?.text}</span>{/key}
    </div>
  {/if}

  <div class="connect-wrap">
    <button class="connect" onclick={survey} class:dim={frontierFull}>
      Survey
      <small>reveal an entity · frontier {$game.forged.frontier.length}/{FRONTIER_CAP}</small>
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
          <!-- What the machine DOES, not what field it writes: an Orchestrator
               checks statements, it does not mint them, and "+0.25 Triples/s"
               said the opposite. Generated from the numbers, so it can't drift
               from the engine. -->
          <small>{machineRole(id)}</small>
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

  <!-- Prestige = retraining on your own output. It is never forced; the run
       just stops paying, and this is how you start the next generation. -->
  {#if canReflect}
    <button class="reflect" class:armed={reflectArmed} onclick={onReflect}>
      {reflectArmed ? 'Tap again to retrain' : `Retrain — generation ${$game.reflection + 2}`}
      <small>
        inherit {formatWhole(String(Math.floor(Number($game.lifetimeGenerated) * 0.25)))} unverified
        statements · synthetic ancestry
        {(($game.syntheticShare + (1 - $game.syntheticShare) * 0.5) * 100).toFixed(0)}%
      </small>
    </button>
  {/if}

  <footer>
    <button class="ghost" onclick={onExport}>Export save</button>
    <button class="ghost" onclick={onImport}>Import save</button>
    <button class="ghost danger" class:armed={flushArmed} onclick={onFlush}>
      {flushArmed ? 'Tap again to wipe' : 'Flush project'}
    </button>
  </footer>

  {#if credit}
    <!-- CC BY 4.0 §3(a)(1): the parties, the licence, and a link to both. -->
    <div class="credit">
      {credit.text}
      <a href={credit.licenseUrl} target="_blank" rel="noopener license">CC BY 4.0</a> ·
      <a href={credit.noticeUrl} target="_blank" rel="noopener">notice</a>
    </div>
  {/if}

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
  .recovered {
    border: 1px solid hsl(var(--hue, 168) 40% 24%);
    border-radius: 12px;
    padding: 10px 14px;
    background: hsl(var(--hue, 168) 30% 8%);
    animation: recovered-in 420ms ease-out;
  }
  @keyframes recovered-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .recovered { animation: none; }
  }
  .recovered-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .tag {
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: hsl(var(--hue, 168) 60% 60%);
  }
  .domain { font-size: 0.7rem; color: #46586a; font-family: ui-monospace, monospace; }
  .term {
    font-size: 1.25rem;
    font-weight: 600;
    color: #eaf6f2;
    margin-top: 2px;
  }
  .gloss {
    margin: 4px 0 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: #8fa5b3;
  }
  .coverage {
    text-align: center;
    font-size: 0.72rem;
    color: #46586a;
    font-variant-numeric: tabular-nums;
    margin-top: -6px;
  }
  .credit {
    text-align: center;
    font-size: 0.65rem;
    color: #33445a;
    margin-top: -6px;
  }
  .credit a { color: #46586a; }
  .prov { display: flex; flex-direction: column; gap: 5px; }
  .prov-bar {
    display: flex;
    height: 9px;
    border-radius: 5px;
    overflow: hidden;
    background: #111826;
    border: 1px solid #16202e;
  }
  .seg { display: block; height: 100%; transition: width 300ms ease-out; }
  .seg.v { background: hsl(var(--hue, 168) 65% 52%); }
  .seg.u { background: hsl(45 60% 48%); }
  .seg.d { background: #7c3b4a; }
  .prov-legend, .prov-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 0.68rem;
    font-variant-numeric: tabular-nums;
    color: #46586a;
  }
  .k.v { color: hsl(var(--hue, 168) 55% 58%); }
  .k.u { color: hsl(45 50% 58%); }
  .k.d { color: #b06a7a; }
  .prov-stats b { color: #8fa5b3; font-weight: 600; }
  .banked {
    appearance: none;
    border: 1px solid hsl(45 40% 30%);
    background: hsl(45 30% 10%);
    color: hsl(45 60% 70%);
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .banked small { font-weight: 400; font-size: 0.68rem; color: #6b6350; }
  .reflect {
    appearance: none;
    border: 1px solid #4a3a6b;
    background: #16122a;
    color: #b9a6e8;
    border-radius: 12px;
    padding: 11px 14px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .reflect.armed { border-color: #7a5ab0; background: #221a3d; }
  .reflect small { font-weight: 400; font-size: 0.68rem; color: #6b5f8a; }
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
  .connect.dim { opacity: 0.6; }
  .connect small { font-size: 0.75rem; font-weight: 500; opacity: 0.75; }
  .hint {
    text-align: center;
    font-size: 0.78rem;
    color: #7f95a3;
  }
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
