<script lang="ts">
  // THE BOARD. Canvas for the lines and the dots, DOM for every word and every
  // tap target, one shared transform over both.
  //
  // ⚠️ WRITTEN TO THE OWNER'S PLAY-TEST, 2026-08-01: *"the graph… is now just
  // statically rendered, and I don't like that… the connections seem slightly
  // misaligned… I can zoom in, but it looks ugly… I wanna see a canvas there."*
  //
  // The three complaints have three different causes and three different fixes:
  //
  //   MISALIGNED BY A FEW PIXELS — the old board was an SVG scaled by a
  //   `viewBox`, so every coordinate landed on a fraction of a device pixel and
  //   every 2px line was smeared across three. The canvas is sized in DEVICE
  //   pixels and drawn in CSS pixels, so a line lands where it is put.
  //
  //   UGLY WHEN ZOOMED — that was the browser magnifying a finished picture.
  //   Zoom here is a property of the drawing, so it redraws at the new scale
  //   and the text is DOM text that was never rasterised in the first place.
  //
  //   STATIC — it settles, which the owner asked for (*"maybe if we can stop
  //   them from jingling it would be best"*), but it is no longer FIXED: drag a
  //   dot and it moves, pinch and it zooms. `docs/BRIEF.md` — if the graph is
  //   hard to draw, change how it is drawn, never what the game is.
  //
  // ⚠️ AND IT IS STILL NOT A LIVE SIMULATION. Dots that drift on their own are
  // dots a thumb cannot hit and Playwright cannot click. That shipped once and
  // it is why `layout.ts` ticks to completion and stops.
  import type { Box } from '../game/layout';
  import { INK, LOOK, type InkName } from '../game/ink';
  import type { Shape, Pt } from '../game/shapes';

  export interface Dot {
    id: string; name: string; kind: string; wx: number; wy: number;
    place: boolean; you: boolean; open: boolean; shut: boolean;
    known: boolean; on: boolean;
  }
  export interface Line { a: string; b: string; rel: string; fill: number }

  let { dots, lines, box, label, onTap, decor = [], drag = true }: {
    dots: Dot[]; lines: Line[]; box: Box; label: string;
    onTap: (id: string) => void;
    /** ★ ANYTHING ON THE MAP THAT IS NOT THE GRAPH — scenery, and later
     *  bridges, fords, glyphs, region tints. A list, so adding one is data.
     *  The graph itself stays separate because its nodes need DOM twins to be
     *  tappable and readable; decor is never tapped, so it is pure canvas. */
    decor?: Shape[];
    /** ⚠️ OFF ON THE JOURNEY. The owner: "I am able to reposition the graph
     *  nodes on the Journey tab. I don't think it makes sense because this is
     *  kind of a map, right?" Tapping still works — see `onUp`. */
    drag?: boolean;
  } = $props();

  let host = $state<HTMLDivElement>();
  let cv = $state<HTMLCanvasElement>();
  let cssW = $state(0);
  let cssH = $state(0);

  // The camera. Screen = world * k + t. Nothing here measures a window — the
  // element's own size arrives through a ResizeObserver, which is the same
  // number on iOS whether or not the URL bar is showing.
  let k = $state(1);
  let tx = $state(0);
  let ty = $state(0);

  /** Dots the player has dragged. Cleared whenever the tab's shape changes, so
   *  a nudge is a gesture rather than a thing to save and migrate. */
  let moved = $state<Map<string, { x: number; y: number }>>(new Map());

  const shape = $derived(dots.map((d) => d.id).join(','));
  const posOf = $derived(new Map(dots.map((d) =>
    [d.id, moved.get(d.id) ?? { x: d.wx, y: d.wy }])));

  const sx = (x: number): number => x * k + tx;
  const sy = (y: number): number => y * k + ty;

  /** Frame the whole graph in the element, once per shape. */
  function fit(): void {
    if (!cssW || !cssH || !box.w || !box.h) return;
    // Capped, or a two-dot tab fills the page with two enormous dots and a
    // label in 40px type — which is exactly what the previous renderer did
    // before it grew a minimum box to work around it.
    k = Math.min(Math.min(cssW / box.w, cssH / box.h), 1.9);
    tx = cssW / 2 - (box.x + box.w / 2) * k;
    ty = cssH / 2 - (box.y + box.h / 2) * k;
  }

  // ⚠️ THIS EFFECT MUST BE IDEMPOTENT, AND THE FIRST VERSION WAS NOT — it called
  // `fit()` on every run, so the camera was re-framed a few times a second. Pan
  // survived (the next frame re-panned from the reset), but ZOOM DID NOT: k went
  // up and was put straight back, and the board simply refused to zoom. The
  // handler was firing and the state was changing the whole time; something else
  // was undoing it. Caught by the probe check written for the owner's complaint,
  // on its first run.
  //
  // So: re-frame only when the SHAPE or the ELEMENT SIZE actually changed. The
  // guards are plain variables on purpose — reading them must not subscribe this
  // effect to itself.
  let fitted = '';
  let fitW = 0, fitH = 0;
  $effect(() => {
    const s = shape, w = cssW, h = cssH;
    if (!w || !h) return;
    if (s === fitted && w === fitW && h === fitH) return;
    if (s !== fitted) moved = new Map();
    fitted = s; fitW = w; fitH = h;
    fit();
  });

  $effect(() => {
    if (!host) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e!.contentRect;
      cssW = r.width; cssH = r.height;
    });
    ro.observe(host);
    return () => ro.disconnect();
  });

  // ---- painting ------------------------------------------------------------
  //
  // ★ ONE FUNCTION DRAWS EVERY SHAPE, so a new thing on the map is an entry in
  // a list rather than a branch in here. `Board.svelte` used to walk two
  // hardcoded arrays and nothing else could be drawn without editing the loop.
  //
  // ⚠️ NO `shadowBlur` ANYWHERE. It is the one genuinely expensive canvas call
  // and it is how "just a bit of atmosphere" starts dropping frames on a phone.

  /** Offscreen bitmaps for `baked` shapes, kept by key across every frame. */
  const bakery = new Map<string, HTMLCanvasElement>();
  const BAKE = 2;   // bitmap pixels per world unit

  /** Catmull-Rom through the points, as beziers.
   *  ⚠️ RIVERS ARE NOT STRAIGHT — the owner's words. Roads are, which is what
   *  keeps the two readable apart at a glance. */
  function trace(c: CanvasRenderingContext2D, pts: Pt[],
    X: (n: number) => number, Y: (n: number) => number, curve: boolean): void {
    if (!pts.length) return;
    c.moveTo(X(pts[0]!.x), Y(pts[0]!.y));
    if (!curve || pts.length < 3) {
      for (let i = 1; i < pts.length; i++) c.lineTo(X(pts[i]!.x), Y(pts[i]!.y));
      return;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] ?? pts[i]!, p1 = pts[i]!;
      const p2 = pts[i + 1]!, p3 = pts[i + 2] ?? p2;
      c.bezierCurveTo(
        X(p1.x + (p2.x - p0.x) / 6), Y(p1.y + (p2.y - p0.y) / 6),
        X(p2.x - (p3.x - p1.x) / 6), Y(p2.y - (p3.y - p1.y) / 6),
        X(p2.x), Y(p2.y));
    }
  }

  /** Draw one shape. `X`/`Y` map world to wherever we are drawing — the live
   *  canvas through the camera, or a bitmap through its own fixed scale. */
  function paint(c: CanvasRenderingContext2D, sh: Shape,
    X: (n: number) => number, Y: (n: number) => number, scale: number): void {
    c.globalAlpha = sh.alpha ?? 1;
    if (sh.s === 'baked') {
      let bmp = bakery.get(sh.key);
      if (!bmp) {
        bmp = document.createElement('canvas');
        bmp.width = Math.max(1, Math.round(sh.box.w * BAKE));
        bmp.height = Math.max(1, Math.round(sh.box.h * BAKE));
        const b2 = bmp.getContext('2d');
        if (b2) {
          b2.lineCap = 'round';
          const bx = (n: number): number => (n - sh.box.x) * BAKE;
          const by = (n: number): number => (n - sh.box.y) * BAKE;
          for (const inner of sh.shapes) paint(b2, inner, bx, by, BAKE);
        }
        bakery.set(sh.key, bmp);
      }
      c.drawImage(bmp, X(sh.box.x), Y(sh.box.y), sh.box.w * scale, sh.box.h * scale);
      c.globalAlpha = 1;
      return;
    }
    if (sh.s === 'disc') {
      c.beginPath();
      c.arc(X(sh.x), Y(sh.y), sh.r, 0, Math.PI * 2);
      c.fillStyle = INK[sh.ink];
      c.fill();
      if (sh.ring) { c.strokeStyle = INK[sh.ring]; c.lineWidth = sh.rw ?? 2; c.stroke(); }
      c.globalAlpha = 1;
      return;
    }
    c.beginPath();
    trace(c, sh.pts, X, Y, sh.curve ?? false);
    if (sh.close) c.closePath();
    if (sh.fill) {
      c.fillStyle = INK[sh.ink];
      c.fill();
    } else {
      c.strokeStyle = INK[sh.ink];
      c.lineWidth = Math.max(0.6, (sh.w ?? 2) * (scale === BAKE ? 1 : Math.min(1.6, scale)));
      if (sh.dash) c.setLineDash(sh.dash); 
      c.stroke();
      c.setLineDash([]);
    }
    c.globalAlpha = 1;
  }

  /** ★ HOW A NODE LOOKS, FROM THE TABLE IN `ink.ts`. State outranks kind: where
   *  you stand, what you can afford and what is selected all say more than what
   *  sort of thing it is. */
  function discOf(d: Dot): Extract<Shape, { s: 'disc' }> {
    const look = LOOK[d.kind] ?? LOOK.place!;
    // ★ KNOWN OUTRANKS KIND, WHERE THE KIND HAS A `lit`. Places you have
    // reached and notions you have thought draw brighter than ones you have
    // not — on Thoughts that IS the progress. Kinds with no `lit` (a fact, the
    // doing node) have nothing to discover and keep one fill.
    let fill: InkName = d.known && look.lit ? look.lit : look.fill;
    if (d.open) fill = 'open';
    if (d.shut) fill = 'shut';
    if (d.you) fill = 'you';
    let ring = look.ring;
    let rw = 2;
    if (d.on) { ring = 'ring'; rw = 2.5; }
    const p = posOf.get(d.id)!;
    const r = d.you ? 7 : d.open || d.shut || (!d.place && d.known) ? 5.5 : look.r;
    return { s: 'disc', x: p.x, y: p.y, r, ink: fill, ring, rw };
  }

  function draw(): void {
    if (!cv || !cssW || !cssH) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    // ★ DEVICE PIXELS FOR THE BUFFER, CSS PIXELS FOR THE DRAWING. The whole
    // answer to "a few pixels here and there are wrong": without it every line
    // is drawn at 1/dpr of its width and lands between pixels.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.lineCap = 'round';

    for (const sh of decor) paint(ctx, sh, sx, sy, k);

    for (const l of lines) {
      const a = posOf.get(l.a), b = posOf.get(l.b);
      if (!a || !b) continue;
      const made = l.fill >= 1;
      // ⚠️ DASHED UNTIL IT IS FINISHED, NOT UNTIL IT IS STARTED. With the strict
      // test a route lost its dashes the instant it began filling and drew solid
      // for its whole length, so the far end looked reached before any of it was.
      paint(ctx, made
        ? { s: 'path', pts: [a, b], ink: (l.rel as InkName) in INK ? l.rel as InkName : 'route', w: 2 }
        : { s: 'path', pts: [a, b], ink: 'unmade', w: 1, dash: [3, 5] }, sx, sy, 1);
      // ★ THE ONE ANIMATION THE GAME GETS: the way being made fills from your
      // end to the far end over real time. Asked for back by name.
      if (l.fill > 0 && l.fill < 1) {
        paint(ctx, { s: 'path', ink: 'fill', w: 3, pts: [a,
          { x: a.x + (b.x - a.x) * l.fill, y: a.y + (b.y - a.y) * l.fill }] }, sx, sy, 1);
      }
    }

    for (const d of dots) {
      if (d.you) {
        const p = posOf.get(d.id)!;
        ctx.beginPath();
        ctx.arc(sx(p.x), sy(p.y), 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(143,240,207,.22)';   // the halo round where you stand
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      paint(ctx, discOf(d), sx, sy, 1);
    }
  }

  $effect(() => {
    // Re-read everything the picture depends on so the effect tracks it.
    void dots; void lines; void decor; void k; void tx; void ty; void moved; void cssW; void cssH;
    draw();
  });

  // ---- the hands ----------------------------------------------------------
  // One handler for the lot, on the host, so a drag that starts on a dot and
  // ends on the background still tracks. Buttons carry no click of their own —
  // a tap IS a pointerup that did not move, which keeps one code path for a
  // thumb, a mouse and Playwright alike.
  interface Down { x: number; y: number; wx: number; wy: number }
  const down = new Map<number, Down>();
  let grabbed: string | null = null;
  let slid = 0;
  let pinch = 0;

  const nodeUnder = (e: PointerEvent): string | null =>
    (e.target as HTMLElement | null)?.closest<HTMLElement>('.node')?.dataset.id ?? null;

  function onDown(e: PointerEvent): void {
    // Guarded: a synthetic pointer (Playwright, some assistive tech) can be gone
    // by the time we ask to capture it, and the throw would kill the handler.
    try { host?.setPointerCapture(e.pointerId); } catch { /* not capturable */ }
    down.set(e.pointerId, { x: e.clientX, y: e.clientY, wx: tx, wy: ty });
    if (down.size === 1) {
      grabbed = nodeUnder(e);
      slid = 0;
    } else if (down.size === 2) {
      grabbed = null;
      const [a, b] = [...down.values()];
      pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  }

  function onMove(e: PointerEvent): void {
    const d = down.get(e.pointerId);
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    down.set(e.pointerId, { ...d, x: e.clientX, y: e.clientY });
    slid = Math.max(slid, Math.hypot(dx, dy));

    if (down.size >= 2) {
      const [a, b] = [...down.values()];
      const now = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch > 0 && now > 0) {
        const r = host!.getBoundingClientRect();
        const mx = (a!.x + b!.x) / 2 - r.left, my = (a!.y + b!.y) / 2 - r.top;
        zoomAt(now / pinch, mx, my);
      }
      pinch = now;
      return;
    }
    if (grabbed && drag) {
      // Drag a dot. The owner liked that Obsidian's nodes move when you touch
      // them; this is that, without anything moving when you do not.
      // ⚠️ `grabbed` IS NOT CLEARED WHEN `drag` IS OFF. `onUp` reads it to tell
      // a tap from a pan, so clearing it here would silently kill tapping on
      // the Journey — the one tab the owner asked to make undraggable.
      const p = posOf.get(grabbed);
      if (p) {
        const next = new Map(moved);
        next.set(grabbed, { x: p.x + dx / k, y: p.y + dy / k });
        moved = next;
      }
    } else {
      tx += dx; ty += dy;
    }
  }

  function onUp(e: PointerEvent): void {
    const was = grabbed;
    down.delete(e.pointerId);
    if (down.size < 2) pinch = 0;
    if (down.size > 0) return;
    // A tap is a press that did not travel. 7px of slop, because a thumb on a
    // phone never lands and lifts on the same pixel.
    if (was && slid < 7) onTap(was);
    grabbed = null;
  }

  function zoomAt(by: number, px: number, py: number): void {
    const next = Math.min(6, Math.max(0.25, k * by));
    const r = next / k;
    tx = px - (px - tx) * r;
    ty = py - (py - ty) * r;
    k = next;
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const r = host!.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }
</script>

<div class="board" bind:this={host} role="application" aria-label={label}
  onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp}
  onpointercancel={onUp} onwheel={onWheel}>
  <canvas bind:this={cv} style="width:{cssW}px;height:{cssH}px"></canvas>

  <!-- ⚠️ EVERY WORD AND EVERY TAP TARGET IS DOM, NOT CANVAS. `CLAUDE.md`: DOM +
       CSS for anything with text or a tap target, canvas for the graph's lines.
       Text drawn into a canvas cannot be selected, read by a screen reader,
       found by the probe, or scaled by the reader's own font setting — and it
       is the first thing to go blurry the moment anybody zooms. -->
  {#each dots as d (d.id)}
    {@const p = posOf.get(d.id)!}
    <button class="node" class:you={d.you} class:open={d.open} class:shut={d.shut}
      class:known={d.known} class:on={d.on} data-kind={d.kind} data-id={d.id}
      style="left:{sx(p.x)}px; top:{sy(p.y)}px"
      aria-label={d.name || 'somewhere unvisited'}
      style:--label={INK[d.you ? 'ring' : d.open ? 'open' : d.known
        ? (LOOK[d.kind]?.label ?? 'known') : 'dot']}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(d.id); } }}>
      {#if d.name}<span class="label">{d.name}</span>{/if}
    </button>
  {/each}
</div>

<style>
  /* Sized from its own width, never from the viewport: `100dvh` against a
     `window.innerHeight` measurement is the iOS URL-bar bug that broke the
     first two renderers. */
  .board { position: relative; width: 100%; aspect-ratio: 1 / 0.92;
    touch-action: none; overscroll-behavior: contain; overflow: hidden;
    border-radius: 12px; background: #080d13; }
  canvas { position: absolute; inset: 0; display: block; }

  /* A 44px target centred on the dot — the drawn dot is small and the thing
     you have to hit is not. */
  .node { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px;
    padding: 0; border: 0; background: none; cursor: pointer; outline: none;
    display: flex; justify-content: center; align-items: flex-start; }
  /* ⚠️ THE COLOUR COMES FROM `ink.ts`, through a custom property. It used to be
     five `.node[data-kind='…']` rules here plus five branches in the script —
     the same decision written twice, in two languages, with nothing checking
     they agreed. */
  .label { position: absolute; top: 24px; white-space: nowrap;
    font: 11px/1 ui-sans-serif, system-ui, sans-serif; color: var(--label, #7f97a8);
    pointer-events: none;
    /* The halo that keeps a name legible where it crosses a line. */
    text-shadow: 0 0 3px #070b10, 0 0 3px #070b10, 0 0 2px #070b10; }
  .node.you .label { font-weight: 700; }
  .node:focus-visible .label { text-decoration: underline; }
</style>
