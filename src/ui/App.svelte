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
  import {
    conceptAt, conceptForNode, loadManifest, ontologyCredit, ontologyRevision,
    potentialEdges, warm,
  } from '../shell/ontology';
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
  // `nextId` is in here because the PARENT LOOKUP needs it: chunks are 1024
  // wide, so without this every discovery at 1024 / 2048 / 3072 — and every one
  // made before chunk 0 lands on a cold start — read `null` and silently
  // hash-wired instead of using the real taxonomy.
  $effect(() => {
    warm([...$game.forged.frontier, ...$game.forged.anchors, $game.forged.nextId]);
  });

  // The engine is pure and knows nothing about WordNet, so the SHELL resolves
  // which node a new concept should hang off and hands the engine a plain
  // integer.
  //
  // It must walk UP, not just read the direct parent. Anchors are a sliding
  // window of the most recent ANCHOR_CAP=240, and breadth-first-from-`entity`
  // is precisely the ordering that maximises parent distance — node 4030's
  // parent sits at index ~4. Reading only the direct parent, the true parent
  // was still on the board for 100% of the first 240 concepts, 12% of the next
  // 260, and **0% after that** — 6.6% across the dataset. Every edge past the
  // ~500th fell back to the hash this code exists to abolish, while DECISIONS
  // recorded that it "almost always" found the real parent. Walking to the
  // nearest surviving ancestor makes the claim true: max is-a depth here is 5,
  // so this is at most five map lookups.
  function nearestLivingAncestor(nodeId: number): number | undefined {
    const live = new Set($game.forged.anchors);
    let cursor = conceptForNode(nodeId)?.parent;
    for (let hops = 0; hops < 8 && cursor !== undefined && cursor >= 0; hops++) {
      if (live.has(cursor)) return cursor;
      cursor = conceptForNode(cursor)?.parent;
    }
    return undefined; // chunk not loaded, or nothing above it survives — engine falls back
  }

  function say(msg: string): void {
    toast = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 2200);
  }

  // A concept that lands should travel from the slot it was discovered in, not
  // teleport. Tracked here rather than in the engine: it is animation, and the
  // engine is not allowed to know the screen exists.
  const landings = new Map<number, { at: number; slot: number }>();
  const ripples: Array<{ x: number; y: number; at: number }> = [];
  let slotOf = new Map<number, number>();

  $effect(() => {
    const now = performance.now();
    // remember which ring slot each in-flight discovery occupies
    for (const b of $game.bookings) {
      if (b.kind === 'discover' && b.node !== undefined) slotOf.set(b.node, b.slot ?? 0);
    }
    // A concept animates in ONLY if we watched it being discovered — that is,
    // only if we saw its booking. Everything else just exists: a loaded save,
    // an imported save, the mass Reasoners fold in. This one rule replaces a
    // seen-everything set that got all three edge cases wrong — it never reset
    // on prestige (so nothing ever animated again for the rest of a save), it
    // would have stampeded 200 concepts out of slot 0 on importing a late-game
    // save, and any condition based on "an id I remember is missing" fires
    // constantly during normal play, because anchors fold out of a 240-wide
    // window by design.
    for (const id of $game.forged.anchors) {
      if (id === 0 || !slotOf.has(id) || landings.has(id)) continue;
      landings.set(id, { at: now, slot: slotOf.get(id)! });
    }
    // finished landings are dropped, or these two maps grow for the lifetime of
    // the tab. Dropping from BOTH is what makes the guard above terminal.
    for (const [id, l] of landings) if (now - l.at > 4000) { landings.delete(id); slotOf.delete(id); }
  });

  // The dotted lines. Recomputed when the board changes or a chunk lands —
  // never stored, because what is POSSIBLE belongs to the dataset and only what
  // you have actually DRAWN belongs to your save.
  const potential = $derived.by(() => {
    void $ontologyRevision;
    return potentialEdges($game.forged.anchors);
  });

  const input = $derived({
    state: $game,
    potential,
    w: vw,
    h: vh,
    sheet,
    verdicts,
    vignette: activeVignette,
    conceptFor: (i: number) => conceptAt(i),
    labelForNode: (id: number) => conceptForNode(id)?.label,
    timeMs: 0,
    landings,
    ripples,
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
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    const it = hit(items, px, py);
    if (it?.enabled) {
      ripples.push({ x: it.x, y: it.y, at: performance.now() });
      if (ripples.length > 6) ripples.shift();
    }
    if (!it) {
      if (sheet && sheet !== 'review') sheet = null; // tap-away closes, except mid-review
      return;
    }
    act(it);
  }

  function act(it: SceneItem): void {
    switch (it.kind) {
      case 'frontier':
        return; // a discovery in flight is already working; nothing to tap
      case 'survey': {
        if (!it.enabled) { say('No free attention'); return; }
        dispatch({ type: 'discover', parent: nearestLivingAncestor($game.forged.nextId) });
        return;
      }
      case 'dotted': {
        if (!it.enabled) { say('No free attention'); return; }
        const p = it.payload as { a: number; b: number; rel: number };
        // Filling a line yourself makes it CHECKED and real — you looked at it.
        dispatch({ type: 'connect', edge: { ...p, checked: true, fake: false } });
        return;
      }
      case 'setSupervision':
        if (!it.enabled) return;
        dispatch({ type: 'setSupervision', slots: it.payload as number });
        return;
      case 'machine':
        if (!it.enabled) { say('Not enough verified knowledge'); return; }
        dispatch({ type: 'buyGenerator', id: it.payload as never });
        return;
      case 'absorb':
        dispatch({ type: 'absorb' });
        return;
      case 'review':
        if (!it.enabled) { say('No free attention'); return; }
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
        if (!it.enabled) { say('No free attention'); return; }
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

  // THE VIEWPORT, and why this is the third attempt.
  //
  // iOS has ignored `user-scalable=no` since iOS 10 — it is an accessibility
  // decision and it is not coming back. So pinch-zoom ALWAYS works, and it moves
  // the VISUAL viewport while leaving the LAYOUT viewport alone. A
  // `position: fixed` canvas is laid out against the layout viewport, so under
  // zoom the player sees a magnified crop of a board that has no idea anything
  // happened — the owner's screenshot: a huge graph, no HUD, no buttons.
  //
  // `ResizeObserver` did not catch it because the element genuinely did not
  // change size. Neither did `innerWidth`. The only thing that knows is
  // `visualViewport`, so that is what drives the board now: the canvas is sized
  // to exactly the region the player can actually see and translated onto it,
  // at any zoom level. Zooming becomes a magnifier that still shows the whole
  // game instead of a crop that hides it.
  //
  // And `touch-action` is `manipulation`, NOT `none`. `none` swallowed the pinch
  // — so once you were zoomed in you could not zoom out, could not scroll the
  // browser chrome back, could not leave. Trapping the player inside the page is
  // far worse than an occasional stray gesture. `manipulation` still kills
  // double-tap-to-zoom, which is what caused most of the accidental zooms.
  function fitToVisibleViewport(): void {
    if (!canvas) return;
    const vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) {
      // AUTHORITATIVE. Do not second-guess it: a small reading here is not a bad
      // measurement, it is the player zoomed in, and "correcting" it back up to
      // innerWidth is precisely the crop bug — the board lays out for 390 while
      // only 156 of it is visible. (My first attempt at this fix had exactly
      // that guard, and the zoom test caught it.)
      canvas.style.width = `${vv.width}px`;
      canvas.style.height = `${vv.height}px`;
      canvas.style.transform = `translate(${vv.offsetLeft}px, ${vv.offsetTop}px)`;
      vw = vv.width;
      vh = vv.height;
      return;
    }
    // No visualViewport (old browsers). Here a zero or absurd reading really is
    // a bad measurement, and a bad one latches forever because nothing re-fires.
    let w = canvas.clientWidth || window.innerWidth;
    let h = canvas.clientHeight || window.innerHeight;
    if (!(w > 0)) w = Math.max(document.documentElement.clientWidth, 320);
    if (!(h > 0)) h = Math.max(document.documentElement.clientHeight, 480);
    vw = w;
    vh = h;
  }

  onMount(() => {
    void startGame();
    void loadManifest();
    if (!canvas) return;
    const ro = new ResizeObserver(fitToVisibleViewport);
    ro.observe(canvas);
    const vv = window.visualViewport;
    // `scroll` matters as much as `resize`: panning while zoomed changes which
    // region is visible without changing its size.
    vv?.addEventListener('resize', fitToVisibleViewport);
    vv?.addEventListener('scroll', fitToVisibleViewport);
    window.addEventListener('orientationchange', fitToVisibleViewport);
    document.addEventListener('visibilitychange', fitToVisibleViewport);
    fitToVisibleViewport();
    return () => {
      ro.disconnect();
      vv?.removeEventListener('resize', fitToVisibleViewport);
      vv?.removeEventListener('scroll', fitToVisibleViewport);
      window.removeEventListener('orientationchange', fitToVisibleViewport);
      document.removeEventListener('visibilitychange', fitToVisibleViewport);
    };
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

<canvas bind:this={canvas} onpointerup={onTap}></canvas>

{#if toast}<div class="toast">{toast}</div>{/if}

{#if credit}
  <!-- CC BY 4.0 §3(a)(1): a real link, because a painted circle is not one. -->
  <!-- Names BOTH parties, which is what ATTRIBUTION.md claims and what the
       footer previously did not do — `credit.text` was computed and thrown
       away. The full statement of changes runs to three lines and covered the
       machine row, so the first sentence is shown verbatim (it carries both
       creators) and the notice link supplies the rest, which CC BY 4.0
       §3(a)(2) expressly allows. Not paraphrased, not truncated mid-clause. -->
  <div class="credit">
    {credit.short}
    <a href={credit.licenseUrl} target="_blank" rel="noopener license">CC BY 4.0</a>
    ·
    <a href={credit.noticeUrl} target="_blank" rel="noopener">full notice</a>
  </div>
{/if}

<style>
  canvas {
    display: block;
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
    /* manipulation, NEVER none. `none` swallowed the pinch, so a player who
       zoomed in — by accident, or because iOS ignores user-scalable=no — could
       not zoom back out, could not scroll the browser chrome back, and could
       not leave the page. `manipulation` still suppresses double-tap-to-zoom
       (the usual cause) while leaving the escape route open. */
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
    left: 8px;
    right: 8px;
    bottom: calc(env(safe-area-inset-bottom) + 2px);
    font-size: 0.52rem;
    line-height: 1.25;
    text-align: center;
    color: #2a3646;
    z-index: 2;
    pointer-events: auto;
  }
  .credit a { color: #3d5166; }
</style>
