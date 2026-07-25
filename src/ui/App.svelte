<script lang="ts">
  // The whole game is one canvas. There is no HTML UI: every counter, every
  // button, every label is a node laid out by `render/board.ts` and painted by
  // `render/paint.ts`. This file is only the loop and the pointer dispatch.
  //
  // The single exception is the attribution line at the bottom edge. CC BY 4.0
  // §3(a)(1)(C) wants a link to the licence, and a real anchor is a link in a
  // way a painted circle is not. It stays in the DOM deliberately.
  import { onMount } from 'svelte';
  import { game, awayReport, dispatch, exportSave, flushProject, importSave, startGame } from '../shell/game';
  import { pendingVignette } from '../core/engine';
  import { VIGNETTES } from '../content/vignettes';
  import { conceptAt, conceptForNode, loadManifest, ontologyCredit, ontologyRevision, warm } from '../shell/ontology';
  import { hit, layout, type Sheet, type SceneItem } from '../render/board';
  import { paint } from '../render/paint';

  let canvas: HTMLCanvasElement | undefined = $state();
  let sheet = $state<Sheet>(null);
  let verdicts = $state<boolean[]>([]);
  let toast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let vw = $state(360);
  let vh = $state(640);

  const credit = $derived.by(() => {
    void $ontologyRevision;
    return ontologyCredit();
  });

  const activeVignette = $derived.by(() => {
    const id = pendingVignette($game);
    return id ? (VIGNETTES.find((v) => v.id === id) ?? null) : null;
  });

  // Reset verdicts only when the BATCH ITSELF changes. Keyed on the prop object
  // this fired ten times a second and erased every tap the player made.
  let armedFor = $state('');
  $effect(() => {
    const q = $game.review;
    const id = q.map((i) => `${i.conceptIndex}:${i.glossIndex}`).join('|');
    if (id !== armedFor) {
      armedFor = id;
      verdicts = q.map(() => true);
      warm(q.flatMap((i) => [i.conceptIndex, i.glossIndex]));
    }
  });

  // Keep the chunks for everything on screen warm so labels resolve in time.
  $effect(() => {
    warm([...$game.forged.frontier, ...$game.forged.anchors]);
  });

  function say(msg: string): void {
    toast = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 2200);
  }

  const input = $derived({
    state: $game,
    w: vw,
    h: vh,
    sheet,
    verdicts,
    vignette: activeVignette,
    conceptFor: (i: number) => conceptAt(i),
    labelForNode: (id: number) => conceptForNode(id)?.label,
    timeMs: 0,
  });

  let items: SceneItem[] = [];

  // One continuous loop: layout, then paint the very same items that will be
  // hit-tested. `timeMs` is the only thing that changes per frame.
  $effect(() => {
    if (!canvas) return;
    let raf = 0;
    const frame = (t: number): void => {
      const now = { ...input, timeMs: t };
      items = layout(now);
      paint(canvas!, now, items);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  function onTap(e: PointerEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const it = hit(items, e.clientX - rect.left, e.clientY - rect.top);
    if (!it) {
      if (sheet && sheet !== 'review') sheet = null; // tap-away closes, except mid-review
      return;
    }
    act(it);
  }

  function act(it: SceneItem): void {
    switch (it.kind) {
      case 'frontier':
        if (!it.enabled) { say('Not enough Datums or attention'); return; }
        dispatch({ type: 'claimNode', id: it.payload as number });
        return;
      case 'survey':
        if (!it.enabled) { say('Not enough Datums'); return; }
        dispatch({ type: 'survey' });
        return;
      case 'machine':
        if (!it.enabled) { say('Not affordable yet'); return; }
        dispatch({ type: 'buyGenerator', id: it.payload as never });
        return;
      case 'absorb':
        dispatch({ type: 'absorb' });
        return;
      case 'review':
        if (!it.enabled) { say('Needs attention'); return; }
        sheet = 'review';
        return;
      case 'vignette':
        sheet = 'vignette';
        return;
      case 'retrain':
        dispatch({ type: 'reflect' });
        say('Retrained');
        return;
      case 'reviewVerdict': {
        const p = it.payload as { i: number; keep: boolean };
        verdicts = verdicts.map((v, i) => (i === p.i ? p.keep : v));
        return;
      }
      case 'commit':
        if (!it.enabled) { say('Needs attention'); return; }
        dispatch({ type: 'reviewBatch', keep: [...verdicts] });
        sheet = null;
        return;
      case 'choice':
        if (activeVignette) {
          dispatch({ type: 'chooseOption', eventId: activeVignette.id, choiceId: it.payload as string });
        }
        sheet = null;
        return;
      case 'sheetClose':
        sheet = null;
        return;
      case 'save':
        if (it.payload === undefined) { sheet = 'save'; return; }
        void saveAction(it.payload as string);
        return;
      default:
    }
  }

  async function saveAction(which: string): Promise<void> {
    if (which === 'export') {
      try {
        await navigator.clipboard.writeText(exportSave());
        say('Save copied');
      } catch { window.prompt('Copy your save:', exportSave()); }
      return;
    }
    if (which === 'import') {
      let blob: string | null = null;
      try { blob = await navigator.clipboard.readText(); } catch { blob = window.prompt('Paste your save:'); }
      if (!blob?.trim()) { blob = window.prompt('Paste your save:'); }
      if (!blob?.trim()) return;
      try { await importSave(blob); say('Save imported'); sheet = null; }
      catch { say('Not a valid save — nothing changed'); }
      return;
    }
    if (which === 'flush') {
      if (!confirm('Wipe this project and start over?')) return;
      await flushProject();
      sheet = null;
      say('Project flushed');
    }
  }

  function resize(): void {
    vw = window.innerWidth;
    vh = window.innerHeight;
  }

  onMount(() => {
    resize();
    window.addEventListener('resize', resize);
    void startGame();
    void loadManifest();
    return () => window.removeEventListener('resize', resize);
  });

  // Surface an away report once, as a toast, then get out of the way.
  let reported = false;
  $effect(() => {
    const r = $awayReport;
    if (r && !reported && r.elapsedMs > 0) {
      reported = true;
      const mins = Math.round(r.elapsedMs / 60000);
      say(`Away ${mins} min · ${Number(r.banked) > 0 ? 'work banked' : 'nothing changed'}`);
      awayReport.set(null);
    }
  });
</script>

<canvas
  bind:this={canvas}
  style="width:{vw}px;height:{vh}px"
  onpointerup={onTap}
></canvas>

{#if toast}<div class="toast">{toast}</div>{/if}

{#if credit}
  <!-- CC BY 4.0 §3(a)(1): a real link, because a painted circle is not one. -->
  <div class="credit">
    <a href={credit.licenseUrl} target="_blank" rel="noopener license">CC BY 4.0</a>
    ·
    <a href={credit.noticeUrl} target="_blank" rel="noopener">Open English WordNet</a>
  </div>
{/if}

<style>
  canvas {
    display: block;
    position: fixed;
    inset: 0;
    touch-action: manipulation;
    background: #080b11;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom) + 58px);
    transform: translateX(-50%);
    background: #111826ee;
    border: 1px solid #22304a;
    color: #cfe0e8;
    padding: 8px 14px;
    border-radius: 10px;
    font-size: 0.82rem;
    pointer-events: none;
    z-index: 2;
  }
  .credit {
    position: fixed;
    left: 10px;
    bottom: calc(env(safe-area-inset-bottom) + 4px);
    font-size: 0.58rem;
    color: #2f3d4e;
    z-index: 2;
  }
  .credit a { color: #3d5166; }
</style>
