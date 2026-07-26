<script lang="ts">
  // The UI is DOM. The canvas draws the graph's lines and atmosphere, and
  // nothing else.
  //
  // It used to be the other way round: every counter, button, label and modal
  // was painted onto one full-screen canvas, with a hand-written layout engine,
  // hit-tester and label-collision solver behind it. That is a reimplementation
  // of the browser, and it broke exactly where a reimplementation of the
  // browser breaks — text overlapped, tap targets drifted, and pinch-zoom moved
  // the visual viewport out from under a `position: fixed` canvas so the board
  // rendered as a magnified crop with no controls and no way back.
  //
  // Now: a flex column — header, stage, dock. The canvas fills the stage. Zoom
  // is just zoom, the way it is on any web page, because there is nothing left
  // that second-guesses the layout.
  import { onMount } from 'svelte';
  import { game, awayReport, dispatch, exportSave, flushProject, importSave, startGame } from '../shell/game';
  import {
    agentCost, attentionCap, attentionFree, CONNECT_MS, displayedFidelity,
    DISCOVER_MS, hasTrust, pendingVignette, recovered, REFLECT_MIN_CONCEPTS, REVIEW_BOOK_MS,
    unsupervised, verified,
  } from '../core/engine';
  import { FRONTIER_CAP } from '../core/graph';
  import { D, format, formatWhole, gte } from '../core/numbers';
  import { GENERATORS, M1_ROSTER } from '../content/generators';
  import { CONCEPT_BUDGET } from '../content/ontologyMeta';
  import { REL_NAMES } from '../core/types';
  import { VIGNETTES, describeEffects } from '../content/vignettes';
  import {
    conceptAt, conceptForNode, loadManifest, ontologyCredit, ontologyRevision,
    potentialEdges, warm,
  } from '../shell/ontology';
  import {
    cameraFor, clampZoom, frontierPos, isRotted, relHue, stageHue, toScreen, toWorld,
  } from '../render/board';
  import { detail, dotRadius, weigh } from '../render/detail';
  import { GraphSim } from '../render/sim';
  import { paintGraph } from '../render/paint';
  import { ticker } from '../shell/ticker';

  let canvas = $state<HTMLCanvasElement>();
  let stage = $state<HTMLDivElement>();
  let sheet = $state<null | 'review' | 'vignette' | 'save'>(null);
  let verdicts = $state<boolean[]>([]);
  let toast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let w = $state(360);
  let h = $state(480);
  let now = $state(0);

  const credit = $derived.by(() => { void $ontologyRevision; return ontologyCredit(); });
  const hue = $derived(stageHue($game.graph.nodes));
  const trust = $derived(displayedFidelity($game));
  const free = $derived(attentionFree($game));

  const activeVignette = $derived.by(() => {
    const id = pendingVignette($game);
    return id ? (VIGNETTES.find((v) => v.id === id) ?? null) : null;
  });

  const potential = $derived.by(() => {
    void $ontologyRevision;
    return potentialEdges($game.forged.anchors);
  });

  // The graph does NOT spin.
  //
  // It used to rotate at 0.02 rad/s — 1.15 degrees per second, imperceptible —
  // and the cost of that was re-deriving every node position, every concept
  // lookup and every dotted-line midpoint sixty times a second, then writing
  // ~480 inline transforms per frame. At the 240-anchor cap the concept lookup
  // alone allocated 14,400 objects/second to re-read labels that had not
  // changed. The whole argument for going DOM was that the browser lays a label
  // out ONCE and then composites it; spinning threw that away.
  //
  // With spin fixed, all of this depends only on `$game` and recomputes at the
  // 10 Hz tick instead. The picture is identical apart from a rotation nobody
  // could see. The canvas still animates — the dash march, the substrate drift
  // and the filling lines all key off `timeMs` inside the painter, which is
  // where per-frame work belongs.

  // ---- THE VIEW ---------------------------------------------------------
  //
  // Zoom and pan live here and nowhere else; `render/board.ts` turns them into
  // the one camera. `follow` means the player has not taken control yet, so the
  // board frames itself; the first pinch or drag switches it off and Reset
  // switches it back on. That last part is load-bearing: pinch-zoom inside a
  // page has trapped this game twice, so there is always one tap back to a
  // known-good view.
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let follow = $state(true);

  // ---- THE GRAPH ---------------------------------------------------------
  //
  // d3-force decides where nodes are (see render/sim.ts). This module does no
  // geometry of its own — that was the disease, twice: a golden-angle spiral,
  // then a hand-rolled radial taxonomy. Both worked; both were bespoke answers
  // to a problem with a standard one.
  //
  // WEIGHT still comes from the taxonomy, because position no longer can: the
  // layout is free-floating, so how central a node looks is an outcome of the
  // physics, not a statement about the concept.
  const weights = $derived.by(() => {
    void $ontologyRevision;
    return weigh($game.forged.anchors, (id) => conceptAt(id)?.parent ?? -1);
  });

  /** The springs. Every concept is pulled toward the ancestor it was recovered
   *  through, plus every line you have actually drawn — so clusters are made of
   *  real relationships, and drawing a connection visibly tightens the graph. */
  const springs = $derived.by(() => {
    const out: Array<{ a: number; b: number }> = [];
    const seen = new Set<string>();
    for (const [id, n] of weights) {
      if (n.parent >= 0) { out.push({ a: id, b: n.parent }); seen.add(`${id}:${n.parent}`); }
    }
    for (const e of $game.forged.edges) {
      const k = `${e.a}:${e.b}`;
      if (!seen.has(k) && !seen.has(`${e.b}:${e.a}`)) { out.push({ a: e.a, b: e.b }); seen.add(k); }
    }
    return out;
  });

  const sim = new GraphSim();
  let simTick = $state(0); // bumped while the simulation is still moving

  $effect(() => {
    sim.sync({
      nodes: [...weights.values()].map((n) => ({ id: n.id, weight: n.weight })),
      links: springs,
    });
  });

  /** In follow mode the board frames itself: zoom so the furthest concept sits
   *  near the edge of the stage. A force layout has no fixed extent — eight
   *  concepts settle into a cluster a few dozen units across while two hundred
   *  spread right out — so a fixed zoom leaves a small graph as a speck in an
   *  empty box. Measured before this: 16% of the short side.
   *
   *  It re-fits continuously, which for a settling simulation reads as the
   *  board arranging itself and then holding still. That is only tolerable
   *  because the simulation converges; a camera chasing something that never
   *  settles would breathe forever. */
  const followZoom = $derived.by(() => {
    void simTick;
    let far = 0;
    for (const p of sim.positions().values()) far = Math.max(far, Math.hypot(p.x, p.y));
    return clampZoom(1.06 / Math.max(0.1, far));
  });

  const cam = $derived(follow
    ? cameraFor(w, h, followZoom, 0, 0)
    : cameraFor(w, h, zoom, panX, panY));

  /** Screen positions — the ONE map the DOM node layer, the line buttons and
   *  the canvas painter all read. */
  const screenPos = $derived.by(() => {
    void simTick;
    const out = new Map<number, { x: number; y: number }>();
    for (const [id, p] of sim.positions()) out.set(id, toScreen(cam, p));
    return out;
  });

  /** Roughly how wide a concept's name renders, in px. Labels are 0.62rem in
   *  the system UI font; ~5.4px per character is close enough to place them,
   *  and it costs nothing — measuring 240 labels a frame with
   *  `getBoundingClientRect` would force a layout every frame. */
  const labelPx = (id: number, folded: number): number => {
    const label = conceptForNode(id)?.label;
    if (!label) return 40;
    return (label.length + (folded > 0 ? String(folded).length + 2 : 0)) * 5.4 + 6;
  };

  /** What survives at this zoom, and what is folded into what. */
  const lod = $derived.by(() => {
    void $ontologyRevision; void simTick;
    return detail(weights, {
      zoom: follow ? followZoom : zoom, screen: screenPos, w, h, labelWidth: labelPx,
    });
  });
  const rolledUp = $derived(lod.rolled);

  // No hand-rolled easing any more. There used to be a `live` map eased toward
  // a computed target every frame, with its own frame-rate-independent curve
  // and its own settle threshold — a small physics engine, written here,
  // because placement was a formula and something had to animate the jump
  // between one formula's answer and the next.
  //
  // The simulation IS the animation now. d3-force integrates velocities, so
  // nodes drift, overshoot slightly and settle on their own; the graph reacts
  // to a new concept instead of teleporting to a new arrangement. `step()`
  // reports whether anything is still moving, so a settled board stops
  // repainting and a phone stops burning battery holding a picture still.

  /** Off-screen is not worth a DOM node. Zoomed in, most of the board is
   *  outside the stage, and Svelte was still writing a transform for every one
   *  of them every frame — 240 elements to show five. The margin is generous
   *  so a label whose dot is just past the edge still renders its half. */
  const inView = (p: { x: number; y: number }): boolean =>
    p.x > -80 && p.x < w + 80 && p.y > -40 && p.y < h + 40;

  const nodes = $derived.by(() => {
    void $ontologyRevision; void simTick;
    const out = [];
    for (const id of lod.shown) {
      const p = screenPos.get(id);
      if (!p || !inView(p)) continue;
      const folded = rolledUp.get(id) ?? 0;
      out.push({
        id, x: p.x, y: p.y,
        r: dotRadius(weights.get(id)?.weight ?? 0.2, id === 0),
        label: lod.labelled.has(id)
          ? (conceptForNode(id)?.label ?? '') + (folded > 0 ? ` ·${folded}` : '')
          : '',
        folded,
        root: id === 0,
        rotted: isRotted(id, trust),
      });
    }
    return out;
  });

  // Tappable midpoints for the dotted lines. Real buttons, so they hit-test
  // themselves and are finger-sized by construction rather than by a magic
  // radius constant.
  /** Potential connections not yet drawn. Computed ONCE and handed to both the
   *  painter and the button layer — they used to rebuild this Set, and the key
   *  format, and the positions map, independently in two files. The commit that
   *  went DOM claimed that beat "two consumers agreeing on a list"; for the
   *  buttons it does, because the browser hit-tests the element. For the LINES
   *  it did not — it was still two consumers agreeing, by copy-paste. */
  /** Only between nodes that are actually drawn. A line to a concept the zoom
   *  level has folded away has nowhere to land, and drawing it anyway is how
   *  you get the hairball in the screenshot — every edge crossing the middle,
   *  because both ends were plotted regardless of whether you could see them. */
  const onScreen = $derived(new Set(lod.shown));

  const dotted = $derived.by(() => {
    const drawn = new Set($game.forged.edges.map((e) => `${e.a}:${e.b}:${e.rel}`));
    return potential.filter((p) => !drawn.has(`${p.a}:${p.b}:${p.rel}`)
      && onScreen.has(p.a) && onScreen.has(p.b));
  });

  const openLines = $derived.by(() => {
    void simTick;
    const flight = new Set($game.bookings.filter((b) => b.edge)
      .map((b) => `${b.edge!.a}:${b.edge!.b}:${b.edge!.rel}`));
    const c = { x: w / 2, y: h / 2 };
    return dotted.map((p) => {
      const pa = screenPos.get(p.a) ?? c, pb = screenPos.get(p.b) ?? c;
      return {
        ...p,
        x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2,
        busy: flight.has(`${p.a}:${p.b}:${p.rel}`),
        name: REL_NAMES[p.rel] ?? '',
      };
    }).filter((l) => inView(l));
  });

  const inFlight = $derived($game.bookings
    .filter((b) => b.kind === 'discover' && b.node !== undefined)
    .map((b) => {
      const p = frontierPos(b.slot ?? 0, w, h);
      return {
        node: b.node!, x: p.x, y: p.y,
        left: Math.max(0, Math.ceil((b.until - $game.lastTick) / 1000)),
        pct: Math.max(0, Math.min(1, ($game.lastTick - (b.until - DISCOVER_MS)) / DISCOVER_MS)),
      };
    }));

  const reviewBooking = $derived($game.bookings.find((b) => b.kind === 'review'));
  const filling = $derived($game.bookings.filter((b) => b.kind === 'connect'));
  const banked = $derived(D($game.pending).add(D($game.pendingClean)));
  const worldDone = $derived($game.forged.nextId >= CONCEPT_BUDGET);
  const canDiscover = $derived(free >= 1 && $game.bookings.length < FRONTIER_CAP && $game.lastTick > 0 && !worldDone);

  // ---- PINCH AND PAN ----------------------------------------------------
  //
  // This game has trapped its player inside a zoomed page twice, so the rules
  // are written down rather than felt out:
  //
  //  1. The stage is NOT `position: fixed` and never will be. That was the
  //     actual trap — a fixed element anchors to the layout viewport, so a
  //     pinched page became a magnified crop with the controls off-screen.
  //  2. Gestures are captured on the stage ELEMENT only. The header and the
  //     dock stay ordinary page, so the browser's own scroll and zoom always
  //     have somewhere to start from.
  //  3. If the BROWSER is already zoomed, we let go completely — `touch-action`
  //     goes back to `auto` and we handle nothing. A player fighting their way
  //     out of an accidental page zoom must never also be fighting us.
  //  4. Reset is always on screen while the view is moved.
  let browserZoom = $state(1);
  const grabbing = $derived(browserZoom <= 1.05);

  $effect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const read = (): void => { browserZoom = vv.scale; };
    read();
    vv.addEventListener('resize', read);
    return () => vv.removeEventListener('resize', read);
  });

  function resetView(): void {
    follow = true;
    zoom = 1; panX = 0; panY = 0;
  }

  /** Take the current follow-mode framing as the starting point for manual
   *  control, so the first pinch continues from what you were looking at
   *  instead of snapping to zoom 1. */
  function takeControl(): void {
    if (!follow) return;
    zoom = followZoom;
    panX = 0; panY = 0;
    follow = false;
  }

  interface Touching { x: number; y: number; dist: number }
  let grip: Touching | null = null;

  const centreOf = (t: TouchList): Touching => {
    const a = t[0]!;
    const b = t.length > 1 ? t[1]! : null;
    const x = b ? (a.clientX + b.clientX) / 2 : a.clientX;
    const y = b ? (a.clientY + b.clientY) / 2 : a.clientY;
    return { x, y, dist: b ? Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY) : 0 };
  };

  /** How close a finger has to land to count as aiming at a node. A fingertip
   *  is ~44px across, but a grab radius that generous would swallow every pan
   *  on a crowded board, so this is the dot plus a little. */
  const GRAB_PX = 22;

  function onTouchStart(e: TouchEvent): void {
    if (!grabbing) return;
    takeControl();
    grip = centreOf(e.touches);
    // One finger landing ON a concept grabs it; anything else pans. Two fingers
    // are always a pinch, never a drag — you cannot aim a pinch at one node.
    if (e.touches.length === 1 && stage) {
      const box = stage.getBoundingClientRect();
      const at = toWorld(cam, { x: grip.x - box.left, y: grip.y - box.top });
      const hit = sim.pick(at.x, at.y, GRAB_PX / cam.scale);
      if (hit !== null) sim.grab(hit);
    }
  }

  function onTouchMove(e: TouchEvent): void {
    if (!grabbing || !grip || !stage) return;
    e.preventDefault(); // we own this gesture; rule 3 above decided that already
    const now = centreOf(e.touches);
    const box = stage.getBoundingClientRect();

    // Dragging a concept: move it, leave the camera alone. Its neighbours come
    // along on their springs, which is most of what makes the graph feel alive.
    if (sim.isDragging && now.dist === 0) {
      const at = toWorld(cam, { x: now.x - box.left, y: now.y - box.top });
      sim.dragTo(at.x, at.y);
      grip = now;
      return;
    }
    if (sim.isDragging) sim.release(); // a second finger arrived: it is a pinch now

    if (now.dist > 0 && grip.dist > 0) {
      // Pinch. Keep the point between the fingers pinned: convert it to world
      // BEFORE changing the scale, then move the pan so it lands back under
      // them afterwards. Without this the board slides away as you zoom.
      const at = { x: grip.x - box.left, y: grip.y - box.top };
      const anchor = toWorld(cameraFor(w, h, zoom, panX, panY), at);
      zoom = clampZoom(zoom * (now.dist / grip.dist));
      const after = toScreen(cameraFor(w, h, zoom, panX, panY), anchor);
      panX += at.x - after.x;
      panY += at.y - after.y;
    }
    panX += now.x - grip.x;
    panY += now.y - grip.y;
    grip = now;
  }

  function onTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) sim.release();
    grip = e.touches.length > 0 ? centreOf(e.touches) : null;
  }

  // Mouse equivalents, so the drag is exercisable in a browser test without
  // synthesising a touch sequence — and so it works on a desktop at all.
  let mouseDown = false;
  function onMouseDown(e: MouseEvent): void {
    if (!stage) return;
    takeControl();
    const box = stage.getBoundingClientRect();
    const at = toWorld(cam, { x: e.clientX - box.left, y: e.clientY - box.top });
    const hit = sim.pick(at.x, at.y, GRAB_PX / cam.scale);
    if (hit !== null) { sim.grab(hit); mouseDown = true; }
  }
  function onMouseMove(e: MouseEvent): void {
    if (!mouseDown || !stage || !sim.isDragging) return;
    const box = stage.getBoundingClientRect();
    const at = toWorld(cam, { x: e.clientX - box.left, y: e.clientY - box.top });
    sim.dragTo(at.x, at.y);
  }
  function onMouseUp(): void { mouseDown = false; sim.release(); }

  /** Desktop and, more importantly, a testable path that does not need a
   *  synthetic multi-touch sequence. */
  function onWheel(e: WheelEvent): void {
    if (!stage) return;
    e.preventDefault();
    takeControl();
    const box = stage.getBoundingClientRect();
    const at = { x: e.clientX - box.left, y: e.clientY - box.top };
    const anchor = toWorld(cameraFor(w, h, zoom, panX, panY), at);
    zoom = clampZoom(zoom * Math.exp(-e.deltaY / 320));
    const after = toScreen(cameraFor(w, h, zoom, panX, panY), anchor);
    panX += at.x - after.x;
    panY += at.y - after.y;
  }

  function say(msg: string): void {
    toast = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), 2200);
  }

  function discover(): void {
    if (!canDiscover) { say(worldDone ? 'The world is recovered' : 'No free attention'); return; }
    dispatch({ type: 'discover' });
  }

  function connect(p: { a: number; b: number; rel: number }): void {
    if (free < 1) { say('No free attention'); return; }
    dispatch({ type: 'connect', edge: { ...p, checked: true, fake: false } });
  }

  $effect(() => {
    warm([...$game.forged.frontier, ...$game.forged.anchors, $game.forged.nextId]);
  });

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

  // One loop: advance the clock and repaint the lines. Node pills are Svelte's
  // job — they re-render from `nodes`, which depends on `now`.
  $effect(() => {
    let raf = 0;
    let last = 0;
    const frame = (t: number): void => {
      now = t;
      // step the simulation first, so the canvas and the DOM read the same
      // positions this frame
      if (sim.step()) simTick++;
      if (canvas && w > 0 && h > 0) {
        paintGraph(canvas, { state: $game, w, h, timeMs: t, hue, dotted, pos: screenPos, cam });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // The stage measures itself. No viewport arithmetic, no visualViewport
  // plumbing, no constants tuned to one phone — CSS decides how big the graph
  // area is and this just reads it.
  onMount(() => {
    void startGame();
    void loadManifest();
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      if (!stage) return;
      w = stage.clientWidth;
      h = stage.clientHeight;
    });
    ro.observe(stage);
    w = stage.clientWidth;
    h = stage.clientHeight;
    return () => ro.disconnect();
  });

  // No `reported` latch. There was one, never reset, so the away toast fired at
  // most ONCE per page load — and on iOS the page is backgrounded constantly and
  // often survives, so the player saw it once and never again. The latch was
  // also redundant: setting the store to null re-runs this with `r === null`,
  // which is already the idempotence guard.
  $effect(() => {
    const r = $awayReport;
    if (r && r.elapsedMs > 0) {
      say(`Away ${Math.round(r.elapsedMs / 60000)} min · ${Number(r.banked) > 0 ? 'work banked' : 'nothing changed'}`);
      awayReport.set(null);
    }
  });

  async function saveAction(which: string): Promise<void> {
    if (which === 'export') {
      try { await navigator.clipboard.writeText(exportSave()); say('Save copied'); }
      catch { window.prompt('Copy your save:', exportSave()); }
      return;
    }
    if (which === 'import') {
      let blob: string | null = null;
      try { blob = await navigator.clipboard.readText(); } catch { blob = window.prompt('Paste your save:'); }
      if (!blob?.trim()) blob = window.prompt('Paste your save:');
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
</script>

<div class="app" style="--hue:{hue}">
  <header class="hud">
    <div class="headline">
      <b>{formatWhole($game.resources.triples)}</b>
      <span>statements</span>
    </div>
    <div class="stats">
      <div><b class="good">{recovered($game)}</b><span>of {CONCEPT_BUDGET} recovered</span></div>
      <!-- "—" not "100%": a new save has zero statements and the ratio returns
           1, which read as a perfect score over an empty graph. -->
      <div><b class:good={hasTrust($game) && trust > 0.66}
              class:warn={hasTrust($game) && trust <= 0.66 && trust > 0.33}
              class:bad={hasTrust($game) && trust <= 0.33}
        >{hasTrust($game) ? `${(trust * 100).toFixed(0)}%` : '—'}</b><span>checked</span></div>
      <div><b class:good={free > 0} class:warn={free === 0}>{free}</b><span>free of {attentionCap($game)}</span></div>
    </div>
  </header>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="stage" class:grabbing bind:this={stage}
    ontouchstart={onTouchStart} ontouchmove={onTouchMove}
    ontouchend={onTouchEnd} ontouchcancel={onTouchEnd}
    onmousedown={onMouseDown} onmousemove={onMouseMove}
    onmouseup={onMouseUp} onmouseleave={onMouseUp}
    onwheel={onWheel}
  >
    <canvas bind:this={canvas} style="width:{w}px;height:{h}px"></canvas>

    {#if !follow}
      <button class="reset" onclick={resetView} aria-label="reset view">
        ⤢ fit
      </button>
    {/if}

    <!-- Dotted-line targets. Real buttons: the browser hit-tests them, so what
         you tap is what you saw, by construction rather than by a shared list. -->
    {#each openLines as l (l.a + ':' + l.b + ':' + l.rel)}
      <button
        class="line" class:busy={l.busy} class:isa={l.rel === 0}
        style="--h:{relHue(l.rel, hue)};transform:translate({l.x}px,{l.y}px) translate(-50%,-50%)"
        disabled={l.busy || free < 1}
        title="{l.name}"
        aria-label="connect: {l.name}"
        onclick={() => connect(l)}
      >{#if l.rel !== 0}<i>{l.name}</i>{/if}</button>
    {/each}

    <!-- Size carries WEIGHT (taxonomic generality), set as a CSS variable so the
         box stays square and centred on its coordinate no matter what — see THE
         ONE POSITIONING RULE below. `--n` is the count of concepts folded into
         this one at the current zoom; a superclass standing in for its members
         is what a superclass means, and it keeps the board from under-reporting
         what the player actually owns. -->
    {#each nodes as n (n.id)}
      <div class="node" class:root={n.root} class:rotted={n.rotted}
       class:holding={n.folded > 0}
           style="transform:translate({n.x}px,{n.y}px) translate(-50%,-50%);--r:{n.r}px">
        {#if n.label}<span>{n.label}</span>{/if}
      </div>
    {/each}

    {#each inFlight as f (f.node)}
      <div class="finding" style="transform:translate({f.x}px,{f.y}px) translate(-50%,-50%)">
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="17" />
          <circle cx="20" cy="20" r="17" class="sweep"
            style="stroke-dasharray:{f.pct * 106.8} 106.8" />
        </svg>
        <span>{f.left}s</span>
      </div>
    {/each}
  </div>

  <footer class="dock">
    <!-- The event drip. It has been built, wired and fed since the canvas
         rewrite and rendered NOWHERE — so the game had no player-facing
         sentences at all outside UI chrome. Mechanical lines ship now; the
         owner's flavour lines slot into OWNER_LINES (docs/TICKER_LINES.md)
         without touching this. -->
    {#if $ticker.length > 0}
      <div class="ticker">
        {#each $ticker.slice(-2) as l (l.id)}<span>{l.text}</span>{/each}
      </div>
    {/if}

    <div class="actions">
      <button class="act primary" disabled={!canDiscover} onclick={discover}>
        <b>Discover</b>
        <span>{worldDone ? 'world recovered' : canDiscover ? `1 slot · ${DISCOVER_MS / 1000}s` : 'no free slot'}</span>
      </button>

      {#if filling.length > 0}
        <div class="act status"><b>{filling.length}</b><span>{filling.length === 1 ? 'line filling' : 'lines filling'}</span></div>
      {/if}

      {#if reviewBooking}
        <div class="act status"><b>Reviewing</b><span>{Math.max(0, Math.ceil((reviewBooking.until - $game.lastTick) / 1000))}s</span></div>
      {:else if $game.review.length > 0}
        <button class="act warn" disabled={free < 1} onclick={() => (free >= 1 ? (sheet = 'review') : say('No free attention'))}>
          <b>Review</b><span>{free >= 1 ? `1 slot · ${REVIEW_BOOK_MS / 1000}s` : 'no free slot'}</span>
        </button>
      {/if}

      {#if banked.gt(0)}
        <button class="act warn" onclick={() => dispatch({ type: 'absorb' })}>
          <b>Absorb</b><span>{formatWhole(banked.toString())}</span>
        </button>
      {/if}

      {#if activeVignette}
        <button class="act core" onclick={() => (sheet = 'vignette')}><b>Decide</b><span>pending</span></button>
      {/if}

      {#if recovered($game) >= REFLECT_MIN_CONCEPTS}
        <button class="act bad" onclick={() => { dispatch({ type: 'reflect' }); say('Retrained'); }}>
          <b>Retrain</b><span>gen {$game.reflection + 2}</span>
        </button>
      {/if}
    </div>

    {#if $game.generators.extractor > 0}
      <div class="dial">
        <button disabled={$game.supervised === 0}
          onclick={() => dispatch({ type: 'setSupervision', slots: $game.supervised - 1 })}>−</button>
        <span class:bad={unsupervised($game) > 0}>
          {$game.supervised} / {$game.generators.extractor}
          <i>{unsupervised($game) > 0 ? `${unsupervised($game)} unwatched` : 'all watched'}</i>
        </span>
        <button disabled={free < 1 || unsupervised($game) === 0}
          onclick={() => dispatch({ type: 'setSupervision', slots: $game.supervised + 1 })}>+</button>
      </div>
    {/if}

    <div class="machines">
      {#each M1_ROSTER as id (id)}
        {@const cost = agentCost($game, id)}
        {@const ok = gte(verified($game), cost)}
        <button class="mach" disabled={!ok}
          onclick={() => (ok ? dispatch({ type: 'buyGenerator', id }) : say('Not enough checked knowledge'))}>
          <b>×{$game.generators[id]}</b>
          <em>{GENERATORS[id].label}</em>
          <span>{format(cost)} checked</span>
        </button>
      {/each}
      <button class="more" aria-label="save menu" onclick={() => (sheet = 'save')}>⋯</button>
    </div>
  </footer>

  {#if sheet === 'review'}
    <div class="sheet">
      <h2>Review desk</h2>
      <div class="rows">
        {#each $game.review as item, i (i)}
          {@const c = conceptAt(item.conceptIndex)}
          {@const g = conceptAt(item.glossIndex)}
          <div class="row" class:cut={!verdicts[i]}>
            <div class="txt"><b>{c?.label ?? '…'}</b><em>{c?.category ?? ''}</em><p>{g?.gloss ?? ''}</p></div>
            <div class="verdict">
              <button class:on={verdicts[i]} onclick={() => (verdicts = verdicts.map((v, k) => (k === i ? true : v)))}>keep</button>
              <button class:off={!verdicts[i]} onclick={() => (verdicts = verdicts.map((v, k) => (k === i ? false : v)))}>cut</button>
            </div>
          </div>
        {/each}
      </div>
      <div class="sheet-foot">
        <button class="primary" disabled={free < 1}
          onclick={() => { dispatch({ type: 'reviewBatch', keep: [...verdicts] }); sheet = null; }}>
          Commit · 1 slot · {REVIEW_BOOK_MS / 1000}s
        </button>
        <button onclick={() => (sheet = null)}>back</button>
      </div>
    </div>
  {:else if sheet === 'vignette' && activeVignette}
    <div class="sheet">
      <h2>{activeVignette.title || '⟨title — owner⟩'}</h2>
      <p class="body">{activeVignette.body || '⟨body — owner⟩'}</p>
      <div class="sheet-foot col">
        {#each activeVignette.choices as c (c.id)}
          <button class="choice"
            onclick={() => { dispatch({ type: 'chooseOption', eventId: activeVignette.id, choiceId: c.id }); sheet = null; }}>
            <b>{c.label || '⟨choice — owner⟩'}</b><span>{describeEffects(c.effects)}</span>
          </button>
        {/each}
      </div>
    </div>
  {:else if sheet === 'save'}
    <div class="sheet">
      <h2>Save</h2>
      <div class="sheet-foot col">
        <button onclick={() => saveAction('export')}>Export save</button>
        <button onclick={() => saveAction('import')}>Import save</button>
        <button class="bad" onclick={() => saveAction('flush')}>Flush project</button>
        <button onclick={() => (sheet = null)}>back</button>
      </div>
    </div>
  {/if}

  {#if toast}<div class="toast">{toast}</div>{/if}

  {#if credit}
    <!-- CC BY 4.0 §3(a)(1)(C): a real link, naming both parties. -->
    <div class="credit">
      {credit.short}
      <a href={credit.licenseUrl} target="_blank" rel="noopener license">CC BY 4.0</a> ·
      <a href={credit.noticeUrl} target="_blank" rel="noopener">full notice</a>
    </div>
  {/if}
</div>

<style>
  :global(html, body) { margin: 0; background: #080b11; overscroll-behavior: none; }
  /* NOT `position: fixed`. A fixed element is anchored to the layout viewport,
     so pinch-zoom shows a magnified CROP of it and there is nothing to pan —
     which is precisely the trap the owner hit. An ordinary in-flow element
     pans normally when the page is zoomed, exactly like every other website.
     Everything else here is absolute WITHIN this element for the same reason. */
  .app {
    position: relative;
    display: flex; flex-direction: column;
    /* MIN-height, not height. A fixed 100dvh column is fine until the page is
       zoomed — and zoom persists per-site on iOS, so the owner arrived already
       zoomed from a previous session. A fixed-height column cannot reflow, so
       zooming turned the UI into an unreachable crop with scrollbars on both
       axes. With min-height the page simply gets taller than the window and you
       scroll it, which is what every other website does. */
    min-height: 100dvh;
    /* header at the top, controls at the bottom, graph between — so leftover
       height never opens a gap under the credit */
    justify-content: space-between;
    color: #cfe0e8;
    font: 400 14px/1.3 ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    box-sizing: border-box;
  }

  /* ---- header ---- */
  .hud { flex: 0 0 auto; text-align: center; padding: 6px 8px 2px; }
  .headline b { display: block; font-size: 2rem; font-weight: 700; color: #eaf6f2; line-height: 1.05; }
  .headline span { font-size: 0.72rem; color: #5d7385; }
  .stats { display: flex; justify-content: space-around; margin-top: 4px; }
  .stats div { display: flex; flex-direction: column; min-width: 0; }
  .stats b { font-size: 1.05rem; font-weight: 700; }
  .stats span { font-size: 0.62rem; color: #5d7385; white-space: nowrap; }
  .good { color: hsl(var(--hue) 70% 58%); }
  .warn { color: hsl(42 75% 60%); }
  .bad { color: #b0566b; }

  /* ---- stage: the graph fills whatever is left ---- */
  /* The graph needs a real size of its own rather than "whatever is left",
     because "whatever is left" is nothing once the page can scroll. Square-ish
     and bounded: big enough to read, never so tall that the dock falls off. */
  .stage {
    flex: 1 1 auto; position: relative; overflow: hidden;
    /* The graph is a CIRCLE, so its useful size is bounded by the narrower
       dimension — height past the stage's own width buys the board nothing and
       just pools as empty space AROUND the graph, which reads as the graph
       being small and lost rather than as page margin. So cap the stage near
       square and give the slack back to the column, where `space-between`
       spends it as margin between the header, the board and the dock. */
    min-height: min(52vh, 92vw);
    max-height: min(72vh, 104vw);
  }
  /* Only while WE own the gesture. When the browser is zoomed, `grabbing` goes
     false and this reverts to `auto`, handing every touch straight back — a
     player fighting out of an accidental page zoom must not also fight us. */
  .stage.grabbing { touch-action: none; }
  canvas { position: absolute; inset: 0; display: block; }

  /* Always reachable while the view is moved. This is the way back, and it is
     the reason pinch-to-zoom is allowed to exist here at all. */
  .reset {
    position: absolute; right: 8px; top: 8px; z-index: 3;
    padding: 7px 11px; border-radius: 11px; cursor: pointer;
    font: 600 0.68rem ui-sans-serif, system-ui, sans-serif;
    background: hsl(var(--hue) 40% 12% / 0.92); color: hsl(var(--hue) 60% 72%);
    border: 1px solid hsl(var(--hue) 50% 40%);
  }

  /* ══ THE ONE POSITIONING RULE ═════════════════════════════════════════
     Anything placed at a model coordinate is centred on it with
     `translate(Xpx, Ypx) translate(-50%, -50%)`, and ITS BOX SIZE NEVER
     DEPENDS ON ITS TEXT. Text hangs off the box with `position: absolute`,
     so it can never move the thing it labels.

     This is the bug that produced every "misaligned" report. `.node` was a
     flex column whose width came from its LABEL, translated with no centring
     — so the dot landed at `x + labelWidth/2`: 8px off for "thing", 32px off
     for "physical entity". The canvas draws lines to the true coordinate, so
     lines missed dots, the root sat off the ring centre, and the error grew
     with the word. `scripts/check-alignment.mjs` asserts this invariant
     against a real browser; run it after touching anything in here.
     ═══════════════════════════════════════════════════════════════════════ */
  .node, .line, .finding {
    position: absolute; left: 0; top: 0;
    will-change: transform;
  }
  /* the node element IS the dot — never the label */
  /* `--r` is the dot's radius, from the concept's WEIGHT. It is set per node
     and both dimensions read from it, so the box stays square and centred on
     its coordinate at every size — the positioning rule survives the addition
     of variable sizing, which is exactly the sort of change that broke it
     before. */
  .node {
    width: calc(var(--r, 3.5px) * 2); height: calc(var(--r, 3.5px) * 2);
    pointer-events: none;
    border-radius: 50%;
    background: hsl(var(--hue) 40% 46%);
  }
  .node.root {
    width: 13px; height: 13px;
    background: hsl(var(--hue) 90% 78%);
    box-shadow: 0 0 12px hsl(var(--hue) 90% 60% / 0.6);
  }
  /* Holding folded concepts: a ring, so a superclass standing in for its
     members looks fuller than a bare one. */
  .node.holding { box-shadow: 0 0 0 1.5px hsl(var(--hue) 55% 40%); }
  /* No separate count badge. It used to be its own element above the dot — a
     second piece of text that nothing measured, so it landed on the
     neighbouring label. The count rides inside the label instead, where the
     level-of-detail width check already covers it. */
  .node.rotted { background: #b0566b; }
  /* absolutely positioned, so it cannot influence where the dot sits */
  .node span {
    position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    margin-top: 3px; font-size: 0.62rem; white-space: nowrap;
    color: hsl(var(--hue) 40% 68%); text-shadow: 0 1px 3px #080b11, 0 0 6px #080b11;
  }
  .node.root span { font-weight: 700; font-size: 0.76rem; color: hsl(var(--hue) 80% 84%); }

  /* A dotted-line target. Looks like part of the graph; is a real button. */
  .line {
    width: 28px; height: 28px; padding: 0;
    border: 0; border-radius: 50%; background: transparent;
    display: grid; place-items: center; cursor: pointer;
  }
  .line::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: hsl(var(--h) 70% 60%); opacity: 0.55;
    transition: transform 0.12s ease, opacity 0.12s ease;
  }
  .line.isa::before { width: 5px; height: 5px; opacity: 0.3; }
  .line:active::before { transform: scale(2.2); opacity: 1; }
  .line:disabled { cursor: default; }
  .line:disabled::before { opacity: 0.15; }
  .line i {
    position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    font: 600 0.56rem ui-monospace, SFMono-Regular, Menlo, monospace;
    color: hsl(var(--h) 70% 66%); white-space: nowrap; font-style: normal;
    text-shadow: 0 1px 3px #080b11, 0 0 6px #080b11; pointer-events: none;
  }

  .finding { width: 40px; height: 40px; pointer-events: none; }
  .finding svg { width: 40px; height: 40px; transform: rotate(-90deg); }
  .finding circle { fill: none; stroke: hsl(var(--hue) 70% 58%); stroke-width: 3; opacity: 0.22; }
  .finding circle.sweep { opacity: 1; stroke-linecap: round; }
  .finding span {
    position: absolute; inset: 0; display: grid; place-items: center;
    font: 600 0.56rem ui-monospace, monospace; color: hsl(var(--hue) 70% 70%);
  }

  /* ---- dock ---- */
  .dock { flex: 0 0 auto; padding: 4px 8px 6px; }
  /* clear of the mobile browser's bottom chrome, which was cutting the credit */
  .credit { padding-bottom: calc(6px + env(safe-area-inset-bottom)); }
  .ticker {
    display: flex; flex-direction: column; align-items: center;
    gap: 1px; margin-bottom: 5px; min-height: 1.1em;
  }
  .ticker span {
    font: 0.6rem ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #5d7385; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 100%;
  }
  .ticker span:last-child { color: hsl(var(--hue) 45% 62%); }
  .actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .act {
    flex: 0 1 auto; min-width: 92px;
    display: flex; flex-direction: column; align-items: center; gap: 1px;
    padding: 9px 12px; border-radius: 14px; cursor: pointer;
    background: hsl(var(--hue) 40% 12%);
    border: 1.5px solid hsl(var(--hue) 70% 58%);
    color: hsl(var(--hue) 70% 58%);
    font: inherit;
  }
  .act b { font-size: 0.9rem; font-weight: 700; }
  .act span { font: 0.6rem ui-monospace, monospace; opacity: 0.85; }
  .act:disabled { background: #10151d; border-color: #2f3d4e; color: #2f3d4e; cursor: default; }
  .act.status { background: transparent; border-style: dashed; }
  .act.warn { border-color: hsl(42 75% 60%); color: hsl(42 75% 60%); background: hsl(42 40% 12%); }
  .act.bad { border-color: #b0566b; color: #b0566b; background: #2416197a; }
  .act.core { border-color: hsl(var(--hue) 90% 78%); color: hsl(var(--hue) 90% 78%); }

  .dial { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 6px; }
  .dial button {
    width: 40px; height: 40px; border-radius: 50%; font-size: 1.1rem; cursor: pointer;
    background: #10151d; border: 1px solid hsl(var(--hue) 40% 40%); color: #cfe0e8;
  }
  .dial button:disabled { border-color: #2f3d4e; color: #2f3d4e; }
  .dial span { display: flex; flex-direction: column; align-items: center; font-size: 0.8rem; }
  .dial i { font: 0.58rem ui-monospace, monospace; color: #5d7385; font-style: normal; }

  .machines { display: flex; gap: 8px; justify-content: center; align-items: center; margin-top: 6px; }
  .mach {
    display: flex; flex-direction: column; align-items: center; gap: 0;
    padding: 6px 10px; border-radius: 12px; cursor: pointer; font: inherit;
    background: hsl(var(--hue) 40% 10%);
    border: 1px solid hsl(var(--hue) 60% 50%); color: hsl(var(--hue) 60% 62%);
  }
  .mach b { font-size: 0.85rem; }
  .mach em { font-size: 0.62rem; font-style: normal; color: #93a8b8; }
  .mach span { font: 0.56rem ui-monospace, monospace; }
  .mach:disabled { background: #10151d; border-color: #2f3d4e; color: #2f3d4e; }
  .mach:disabled em { color: #2f3d4e; }
  .more {
    width: 34px; height: 34px; border-radius: 50%; cursor: pointer;
    background: transparent; border: 1px solid #2f3d4e; color: #5d7385; font-size: 1rem;
  }

  /* ---- sheets: ordinary modals, scrollable, never clipped ---- */
  .sheet {
    position: absolute; inset: 0; z-index: 5;
    background: #080b11f2; overflow-y: auto;
    padding: max(16px, env(safe-area-inset-top)) 14px calc(16px + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 10px;
    color: #cfe0e8; font: 400 14px/1.35 ui-sans-serif, system-ui, sans-serif;
  }
  .sheet h2 { margin: 0; font-size: 1rem; color: #eaf6f2; }
  .sheet .body { margin: 0; color: #93a8b8; }
  .rows { display: flex; flex-direction: column; gap: 10px; }
  .row { display: flex; gap: 10px; align-items: flex-start; border-top: 1px solid #1b2533; padding-top: 10px; }
  .row.cut { opacity: 0.45; }
  .txt { flex: 1 1 auto; min-width: 0; }
  .txt b { font-size: 0.95rem; }
  .txt em { font: 0.6rem ui-monospace, monospace; color: #5d7385; font-style: normal; margin-left: 6px; }
  .txt p { margin: 3px 0 0; font-size: 0.78rem; color: #93a8b8; }
  .verdict { display: flex; flex-direction: column; gap: 6px; }
  .verdict button {
    min-width: 58px; padding: 8px 10px; border-radius: 10px; cursor: pointer; font: inherit;
    background: #10151d; border: 1px solid #2f3d4e; color: #5d7385;
  }
  .verdict button.on { border-color: hsl(var(--hue, 168) 70% 58%); color: hsl(var(--hue, 168) 70% 58%); }
  .verdict button.off { border-color: #b0566b; color: #b0566b; }
  .sheet-foot { display: flex; gap: 10px; margin-top: auto; padding-top: 12px; }
  .sheet-foot.col { flex-direction: column; }
  .sheet-foot button {
    flex: 1 1 auto; padding: 13px; border-radius: 12px; cursor: pointer; font: inherit;
    background: #10151d; border: 1px solid #2f3d4e; color: #cfe0e8;
  }
  .sheet-foot button.primary { border-color: #3ec8a8; color: #3ec8a8; }
  .sheet-foot button.bad { border-color: #b0566b; color: #b0566b; }
  .sheet-foot button:disabled { color: #2f3d4e; border-color: #1b2533; cursor: default; }
  .choice { display: flex; flex-direction: column; gap: 2px; text-align: left; }
  .choice span { font: 0.62rem ui-monospace, monospace; color: #5d7385; }

  .toast {
    position: absolute; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 96px);
    transform: translateX(-50%); z-index: 6;
    background: #111826ee; border: 1px solid #22304a; color: #cfe0e8;
    padding: 8px 14px; border-radius: 10px; font-size: 0.82rem; pointer-events: none;
  }
  .credit {
    flex: 0 0 auto; padding: 3px 8px 2px;
    text-align: center; font-size: 0.5rem; line-height: 1.2; color: #263140;
  }
  .credit a { color: #37485c; }
</style>
