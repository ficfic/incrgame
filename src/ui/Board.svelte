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

  export interface Dot {
    id: string; name: string; kind: string; wx: number; wy: number;
    place: boolean; you: boolean; open: boolean; shut: boolean;
    known: boolean; on: boolean;
  }
  export interface Line { a: string; b: string; rel: string; fill: number }

  let { dots, lines, box, label, onTap }: {
    dots: Dot[]; lines: Line[]; box: Box; label: string;
    onTap: (id: string) => void;
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

  // ---- the drawing --------------------------------------------------------
  const EDGE: Record<string, { c: string; w: number }> = {
    route: { c: '#4d6b80', w: 2 },
    stands: { c: '#2f5568', w: 2 },
    means: { c: '#2b4356', w: 2 },
    doing: { c: '#3f7d6b', w: 2 },
    has: { c: '#2b4356', w: 1.5 },
  };

  function dotStyle(d: Dot): { fill: string; ring?: string; ringW?: number; r: number } {
    let fill = d.known ? '#4d6b80' : '#2b3a49';
    if (d.kind === 'fact') fill = '#16232f';
    if (d.kind === 'doing') fill = '#070b10';
    if (d.open) fill = '#78e8c0';
    if (d.shut) fill = '#f0b45f';
    if (d.you || d.kind === 'you') fill = '#8ff0cf';
    let ring: string | undefined;
    let ringW = 2;
    if (d.kind === 'fact') ring = '#4d6b80';
    if (d.kind === 'doing') { ring = '#78e8c0'; }
    // ⚠️ Selection wins over every kind. On the old board the per-kind rules
    // outranked it in CSS and the ring was invisible on facts entirely — the
    // one thing the panel below cannot tell you is WHICH dot it describes.
    if (d.on) { ring = '#eafff7'; ringW = 2.5; }
    const r = d.you ? 7 : d.open || d.shut || (!d.place && d.known) ? 5.5 : 3.5;
    return { fill, ring, ringW, r };
  }

  function draw(): void {
    if (!cv || !cssW || !cssH) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    // ★ DEVICE PIXELS FOR THE BUFFER, CSS PIXELS FOR THE DRAWING. This is the
    // whole answer to "a few pixels here and there are wrong": without it every
    // line is drawn at 1/dpr of its intended width and lands between pixels.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.lineCap = 'round';

    for (const l of lines) {
      const a = posOf.get(l.a), b = posOf.get(l.b);
      if (!a || !b) continue;
      const ax = sx(a.x), ay = sy(a.y), bx = sx(b.x), by = sy(b.y);
      const made = l.fill >= 1;
      const style = EDGE[l.rel] ?? EDGE.route!;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      if (made) {
        ctx.strokeStyle = style.c;
        ctx.lineWidth = style.w;
        ctx.setLineDash([]);
      } else {
        // ⚠️ DASHED UNTIL IT IS FINISHED, NOT UNTIL IT IS STARTED. With the
        // strict test a route lost its dashes the instant it began filling and
        // drew solid for its whole length, so the far end looked reached before
        // any of it was.
        ctx.strokeStyle = '#22333f';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // ★ THE ONE ANIMATION THE GAME GETS: the way being made fills from your
      // end to the far end over real time. The owner asked for it back by name.
      if (l.fill > 0 && l.fill < 1) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (bx - ax) * l.fill, ay + (by - ay) * l.fill);
        ctx.strokeStyle = '#8ff0cf';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    for (const d of dots) {
      const p = posOf.get(d.id)!;
      const x = sx(p.x), y = sy(p.y);
      const s = dotStyle(d);
      if (d.you) {
        ctx.beginPath();
        ctx.arc(x, y, s.r + 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(143,240,207,.22)';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.fill;
      ctx.fill();
      if (s.ring) {
        ctx.strokeStyle = s.ring;
        ctx.lineWidth = s.ringW!;
        ctx.stroke();
      }
    }
  }

  $effect(() => {
    // Re-read everything the picture depends on so the effect tracks it.
    void dots; void lines; void k; void tx; void ty; void moved; void cssW; void cssH;
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
    if (grabbed) {
      // Drag a dot. The owner liked that Obsidian's nodes move when you touch
      // them; this is that, without anything moving when you do not.
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
  .label { position: absolute; top: 24px; white-space: nowrap;
    font: 11px/1 ui-sans-serif, system-ui, sans-serif; color: #7f97a8;
    pointer-events: none;
    /* The halo that keeps a name legible where it crosses a line. */
    text-shadow: 0 0 3px #070b10, 0 0 3px #070b10, 0 0 2px #070b10; }
  .node.known .label { color: #9fb4c4; }
  .node.open .label { color: #bff3e0; }
  .node.you .label { color: #eafff7; font-weight: 700; }
  .node[data-kind='doing'] .label { color: #9fd8c6; }
  .node:focus-visible .label { color: #eafff7; text-decoration: underline; }
</style>
