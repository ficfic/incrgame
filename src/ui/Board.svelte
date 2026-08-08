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
  import { cutAt } from '../game/paths';
  import type { Shape, Pt } from '../game/shapes';

  export interface Dot {
    id: string; name: string; kind: string; wx: number; wy: number;
    place: boolean; you: boolean; open: boolean; shut: boolean;
    known: boolean; on: boolean; barred: boolean;
    /** A radius the node insists on — health, for anything that has any. */
    r?: number;
    /** ★ A LITTLE BUILDING over the dot — what stands here, visible from
     *  the map (owner's visual pass). A key into ICONS; absent = bare dot. */
    icon?: string;
  }
  export interface Line { a: string; b: string; rel: string; fill: number;
    /** How much of its limit this road is carrying, 0 to 1. See `flow.ts`. */
    load: number;
    /** ★ HOW WIDE THE ROAD IS, 0 if it is not laid. A road is a pipe now, and
     *  the whole model is a spreadsheet unless the board draws the bore. */
    gauge?: number;
    /** ★ WHICH WAY THE MANA RUNS: +1 along a→b, -1 against it, 0 for a pipe
     *  carrying nothing. Drives the crawl of the flow dashes and nothing else. */
    dir?: number;
    /** ★ OVER ITS CAP: the load underlay turns amber — the choke the city
     *  design promises to DRAW, not just count. */
    choked?: boolean;
    /** ★ CARRIER DOTS instead of the mana dash — the owner: *"maybe we
     *  introduce the carrier dots which actually bring resources to camp."*
     *  The dash code below stays; a line opts in. */
    carry?: boolean;
    /** ★ THE BEND — the road's real course in world coordinates, first point at
     *  this line's `a` end. Absent off the chapter, where stops sit at solved
     *  rather than authored positions and a baked path would join two points
     *  that are not there. */
    pts?: Pt[] }

  /** ★ THE BUILDING GLYPHS, 14×14 silhouettes in the site's own ink. DOM
   *  (inline SVG), not canvas — they scale crisp and never eat a tap. */
  const ICONS: Record<string, string> = {
    hut: 'M7 1.2 12.8 6.4 11.4 6.4 11.4 12.5 2.6 12.5 2.6 6.4 1.2 6.4 Z',
    quarry: 'M1 12.5 5.4 3 8.4 8.6 10.4 5.6 13 12.5 Z',
    lumber: 'M7 .8 10.6 5.8 8.9 5.8 12.2 10.4 8 10.4 8 13 6 13 6 10.4 '
      + '1.8 10.4 5.1 5.8 3.4 5.8 Z',
    sawmill: 'M2.5 3.5h10v2.4h-10Z M1.5 6.9h10v2.4h-10Z M3 10.3h10v2.4H3Z',
    farm: 'M6.4 13 6.4 8.2 C4 8 2.2 6.3 2 3.6 4.8 3.8 6.6 5.5 6.9 7.9 '
      + 'C7.3 6 8.9 4.7 11.9 4.5 11.7 7 10 8.6 7.6 8.8 L7.6 13 Z',
  };

  let { dots, lines, box, label, onTap, onGround, decor = [], drag = true, inset = 0,
    feed = null, pulse = 0, fog = null }: {
    dots: Dot[]; lines: Line[]; box: Box; label: string;
    onTap: (id: string) => void;
    onGround?: () => void;
    /** ★ THE FOG OF WAR, or null for no fog. Uncharted parchment drawn OVER
     *  the terrain with soft holes cut around `spots` (stops stood at) and
     *  along `runs` (pipes, and the feed). The graph itself — dots, dotted
     *  routes, labels — draws ON TOP of the fog: the skeleton of the crossing
     *  is always visible, the LAND is what you have not earned yet. */
    fog?: { spots: Pt[]; runs: Pt[][] } | null;
    /** ★ THE KING'S ROAD, coming in from off the map. The mana has to come
     *  from SOMEWHERE, and the owner asked to see it: *"especially when we
     *  start to have to connect to our initial dot from offscreen."* World
     *  points, first one off-frame. */
    feed?: Pt[] | null;
    /** Bumps every time a whole mana lands — each bump floats a +1 off the
     *  pin. The number itself is only compared, never shown. */
    pulse?: number;
    /** ★ HOW MANY PIXELS OF THE BOARD'S BOTTOM ARE COVERED by the panel that
     *  now sits over it. The canvas still PAINTS the full height — terrain
     *  behind a translucent panel is the whole point of overlaying it — but the
     *  graph is framed into what you can actually see and touch.
     *
     *  ⚠️ WITHOUT THIS, MAKING THE BOARD TALLER MAKES IT WORSE: `fit()` centres
     *  the graph in the element, so the middle of the map would sit behind the
     *  panel and the stops there could not be tapped at all. */
    inset?: number;
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

  /** ★ THE ONE MOVING THING ON THE BOARD. A phase for the flow dashes,
   *  advanced by rAF ONLY while something is flowing — the board stays a still
   *  map the rest of the time, which is the old no-jingling rule holding.
   *  Positions never change; only lineDashOffset does, so nothing a thumb aims
   *  at ever moves. */
  let phase = $state(0);
  $effect(() => {
    const moving = feed !== null || lines.some((l) => (l.dir ?? 0) !== 0 && l.fill >= 1);
    if (!moving) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number): void => {
      // ~30fps is plenty for a crawl and half the battery of 60.
      if (t - last > 33) { phase = (phase + (t - last) * 0.012) % 1000; last = t; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  /** +1s floating off the pin. Purely cosmetic, capped, self-removing. */
  let plusses = $state<Array<{ id: number; x: number; y: number }>>([]);
  let plusId = 0;
  let lastPulse = 0;
  let lastPlusAt = 0;
  $effect(() => {
    const p = pulse;
    if (p <= lastPulse) { lastPulse = p; return; }
    lastPulse = p;
    // ⚠️ AT PIPE RATES A +1 EVERY LAND IS CONFETTI — the owner: *"the plus
    // one… it breaks things."* One a second at most, and none while a build
    // or a widen is running the income to zero anyway.
    const t = performance.now();
    if (t - lastPlusAt < 1000) return;
    // The pin if there is one; the camp (kind 'carry') where there is not.
    const you = dots.find((d) => d.you) ?? dots.find((d) => d.kind === 'carry');
    if (!you) return;
    const at = posOf.get(you.id);
    if (!at || plusses.length >= 4) return;
    lastPlusAt = t;
    plusses = [...plusses, { id: plusId++, x: sx(at.x), y: sy(at.y) - 26 }];
  });
  // Floaters hold SCREEN coordinates, so a pan or a pinch strands them over
  // the wrong ground — clear them the moment the camera moves.
  $effect(() => { void k; void tx; void ty; plusses = []; });

  const shape = $derived(dots.map((d) => d.id).join(','));
  const posOf = $derived(new Map(dots.map((d) =>
    [d.id, moved.get(d.id) ?? { x: d.wx, y: d.wy }])));

  const sx = (x: number): number => x * k + tx;
  const sy = (y: number): number => y * k + ty;

  /** ★ LABELS ARE PLACED LAST AND THE LOSERS ARE DROPPED — the other half of
   *  how real maps stay legible (openstreetmap-carto does exactly this). The
   *  owner's filed bug is the reason: Stop 15 / Stop 16 printed over each other
   *  at phone width, because every label was drawn no matter what it landed on.
   *
   *  Priority: you, then the selected stop, then top to bottom — a label that
   *  loses today wins again the moment the camera or the selection changes.
   *  ⚠️ THE DOT STAYS. Only the NAME is dropped; the stop is still there and
   *  still tappable, and selecting it always shows its name (selection wins). */
  const unlabelled = $derived.by(() => {
    const boxes: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
    const hide = new Set<string>();
    const order = [...dots].sort((a, b) =>
      Number(b.you) - Number(a.you) || Number(b.on) - Number(a.on)
      || (posOf.get(a.id)?.y ?? 0) - (posOf.get(b.id)?.y ?? 0));
    for (const d of order) {
      if (!d.name) continue;
      const p = posOf.get(d.id);
      if (!p) continue;
      const w = d.name.length * 6.4 + 8;
      const bx = { x0: sx(p.x) - w / 2, y0: sy(p.y) + 22, x1: sx(p.x) + w / 2, y1: sy(p.y) + 36 };
      const hits = boxes.some((o) =>
        bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0);
      if (hits && !d.you && !d.on) hide.add(d.id);
      else boxes.push(bx);
    }
    return hide;
  });

  /** Frame the whole graph in the VISIBLE part of the element, once per shape.
   *  Visible means everything the panel is not covering — see `inset`. */
  function fit(): void {
    if (!cssW || !cssH || !box.w || !box.h) return;
    // Never frame into nothing: a panel taller than the board would otherwise
    // divide by a negative and put the map somewhere off-screen.
    const usable = Math.max(120, cssH - inset);
    // Capped, or a two-dot tab fills the page with two enormous dots and a
    // label in 40px type — which is exactly what the previous renderer did
    // before it grew a minimum box to work around it.
    k = Math.min(Math.min(cssW / box.w, usable / box.h), 1.9);
    tx = cssW / 2 - (box.x + box.w / 2) * k;
    ty = usable / 2 - (box.y + box.h / 2) * k;
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
  let fitW = 0, fitH = 0, fitIn = -1;
  /** ★ ONCE A THUMB HAS PANNED OR PINCHED, THE CAMERA IS THE PLAYER'S. The
   *  owner's play-test: *"when I zoom in… sometimes it resets my zoom level
   *  completely… it resets it even without me doing anything."* The culprits:
   *  the panel's rest-height and the iOS URL bar both nudge `inset`/`cssH`,
   *  and this effect re-framed on every nudge. Now only a SHAPE change (a
   *  different graph) reclaims the camera. */
  let touched = false;
  $effect(() => {
    const s = shape, w = cssW, h = cssH, ins = inset;
    if (!w || !h) return;
    if (s === fitted && touched) { fitW = w; fitH = h; fitIn = ins; return; }
    if (s === fitted && w === fitW && h === fitH && ins === fitIn) return;
    if (s !== fitted) { moved = new Map(); touched = false; }
    fitted = s; fitW = w; fitH = h; fitIn = ins;
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
    const look = LOOK[d.kind] ?? LOOK.stop!;
    // ★ KNOWN OUTRANKS KIND, WHERE THE KIND HAS A `lit`. Places you have
    // reached and notions you have thought draw brighter than ones you have
    // not — on Thoughts that IS the progress. Kinds with no `lit` (a fact, the
    // doing node) have nothing to discover and keep one fill.
    let fill: InkName = d.known && look.lit ? look.lit : look.fill;
    if (d.open) fill = 'open';
    if (d.shut) fill = 'shut';
    // A door outranks a price: you can wait out a price, and you cannot wait
    // out a level. So it must not look like the thing you can wait out.
    if (d.barred) fill = 'barred';
    if (d.you) fill = 'you';
    let ring = look.ring;
    let rw = 2;
    if (d.on) { ring = 'ring'; rw = 2.5; }
    const p = posOf.get(d.id)!;
    // ★ A NODE'S OWN RADIUS OUTRANKS EVERY STATE RULE. It is only ever set by
    // something whose size MEANS something, and a fight where the dot does not
    // visibly shrink is the whole mechanic reduced to a number in a sentence.
    const r = d.r ?? (d.you ? 7
      : d.open || d.shut || d.barred || (!d.place && d.known) ? 5.5 : look.r);
    // ★ A PLACE BEYOND YOUR KEN IS A FAINT DOT. It has no name to draw, and it
    // sits on fogged parchment — full ink there would read as charted.
    const alpha = d.place && !d.name && !d.you ? 0.5 : undefined;
    return { s: 'disc', x: p.x, y: p.y, r, ink: fill, ring, rw, alpha };
  }

  // ---- the fog bake ---------------------------------------------------------
  //
  // ⚠️ BAKED, NOT PAINTED PER FRAME. The veil plus its holes is a dozen
  // gradients and strokes over a megapixel — cheap once, not thirty times a
  // second under the flow crawl. Re-baked only when what is revealed changes,
  // which is when a stop is first stood at or a pipe goes in.
  const FOG_PAD = 600;
  const FOG_RES = 0.5;
  let fogBaked: { key: string; cv: HTMLCanvasElement } | null = null;
  function fogCanvas(): HTMLCanvasElement | null {
    if (!fog) return null;
    const key = JSON.stringify([fog.spots, fog.runs, box]);
    if (fogBaked?.key === key) return fogBaked.cv;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round((box.w + FOG_PAD * 2) * FOG_RES));
    c.height = Math.max(1, Math.round((box.h + FOG_PAD * 2) * FOG_RES));
    const g = c.getContext('2d');
    if (!g) return null;
    const fx = (n: number): number => (n - box.x + FOG_PAD) * FOG_RES;
    const fy = (n: number): number => (n - box.y + FOG_PAD) * FOG_RES;
    g.fillStyle = INK.fog;
    g.fillRect(0, 0, c.width, c.height);
    // The holes: what you have stood at, and what the crews have walked.
    g.globalCompositeOperation = 'destination-out';
    for (const p of fog.spots) {
      const r = 190 * FOG_RES;
      const hole = g.createRadialGradient(fx(p.x), fy(p.y), 0, fx(p.x), fy(p.y), r);
      hole.addColorStop(0, 'rgba(0,0,0,1)');
      hole.addColorStop(0.62, 'rgba(0,0,0,1)');
      hole.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hole;
      g.beginPath();
      g.arc(fx(p.x), fy(p.y), r, 0, Math.PI * 2);
      g.fill();
    }
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const run of fog.runs) {
      if (run.length < 2) continue;
      // Three passes, narrowing and hardening — a feathered corridor.
      for (const [w, a] of [[170, 0.4], [125, 0.65], [85, 1]] as const) {
        g.globalAlpha = a;
        g.lineWidth = w * FOG_RES;
        g.beginPath();
        g.moveTo(fx(run[0]!.x), fy(run[0]!.y));
        for (const p of run.slice(1)) g.lineTo(fx(p.x), fy(p.y));
        g.stroke();
      }
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    fogBaked = { key, cv: c };
    return c;
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

    // ★ THE FOG SITS ON THE LAND AND UNDER THE GRAPH. Terrain fogged, routes
    // and dots drawn over it — the crossing stays a visible choice.
    const veil = fogCanvas();
    if (veil) {
      ctx.drawImage(veil, sx(box.x - FOG_PAD), sy(box.y - FOG_PAD),
        (box.w + FOG_PAD * 2) * k, (box.h + FOG_PAD * 2) * k);
    }

    for (const l of lines) {
      const a = posOf.get(l.a), b = posOf.get(l.b);
      if (!a || !b) continue;
      const made = l.fill >= 1;
      // ★ WHAT THE ROAD IS CARRYING, UNDER THE ROAD. Drawn first and wider, so
      // the route's own line stays on top and legible — and so the probe can
      // still count both. A saturated road is visibly fat: that is the cue to
      // build the second one, and it is the only thing on this board that could
      // not be drawn from a count of what you own.
      const run = l.pts ?? [a, b];
      if (made && l.load > 0) {
        paint(ctx, { s: 'path', pts: run, ink: l.choked ? 'shut' : 'flowing', curve: true,
          w: 3 + 6 * l.load, alpha: l.choked ? 0.8 : 0.55 }, sx, sy, 1);
      }
      // ⚠️ DASHED UNTIL IT IS FINISHED, NOT UNTIL IT IS STARTED. With the strict
      // test a route lost its dashes the instant it began filling and drew solid
      // for its whole length, so the far end looked reached before any of it was.
      // ★ WIDTH IS GAUGE. A road you have widened twice is visibly twice the
      // road, which is the only way "widening a bottleneck is worth more than
      // laying a slack road" is a decision you can make by LOOKING.
      //
      // ★ AND A BUILT ROAD IS CASED — the openstreetmap-carto convention (CC0):
      // a near-black outline first, the coloured core over it. The casing is
      // what separates a line from the ground it crosses; without it a brown
      // road over brown contours is one more contour.
      if (made && l.rel === 'road') {
        const w = 1.6 + 1.5 * Math.max(1, l.gauge ?? 1);
        paint(ctx, { s: 'path', pts: run, ink: 'casing', curve: true, w: w + 2.2 }, sx, sy, 1);
        paint(ctx, { s: 'path', pts: run, ink: 'route', curve: true, w }, sx, sy, 1);
        // ★ AND IT MOVES — ON TOP OF THE ROAD, where the feed always drew it.
        // ⚠️ THE OWNER FOUND THIS DRAWN UNDER THE CORE: *"I can see a dotted
        // line moving through it… but I don't see it after start."* The crawl
        // painted before the casing was buried by it on every real pipe, and
        // the probe's motion check only ever sampled the FEED strip — over
        // brown — so it stayed green. Order is the fix; the probe now samples
        // a pipe too.
        if (l.load > 0 && (l.dir ?? 0) !== 0) {
          if (l.carry) {
            // ★ THE CARRIERS: little porters walking the path with the
            // goods, spaced by how hard the path works. Same phase clock
            // as the dash, so they stop when nothing flows.
            const a0 = run[0]!;
            const b0 = run[run.length - 1]!;
            const n = 2 + Math.round(2 * Math.min(1, l.load));
            for (let i = 0; i < n; i++) {
              const t0 = (phase * 0.06 * (l.dir ?? 1) + i / n) % 1;
              const t = t0 < 0 ? t0 + 1 : t0;
              paint(ctx, { s: 'disc', x: a0.x + (b0.x - a0.x) * t,
                y: a0.y + (b0.y - a0.y) * t, r: 2.6, ink: 'flowing',
                ring: 'casing', rw: 0.8, alpha: 0.95 }, sx, sy, 1);
            }
          } else {
            ctx.save();
            ctx.lineDashOffset = -phase * (l.dir ?? 1);
            paint(ctx, { s: 'path', pts: run, ink: 'flowing', curve: true,
              w: 2, dash: [5, 9], alpha: 0.95 }, sx, sy, 1);
            ctx.restore();
          }
        }
      } else {
        paint(ctx, made
          ? { s: 'path', pts: run, ink: (l.rel as InkName) in INK ? l.rel as InkName : 'route', w: 2 }
          : { s: 'path', pts: run, ink: 'unmade', curve: true, w: 1.2, dash: [7, 5] }, sx, sy, 1);
      }
      // ★ THE ONE ANIMATION THE GAME GETS: the way being made fills from your
      // end to the far end over real time. Asked for back by name.
      // ⚠️ ALONG THE BEND, cut by LENGTH — a straight interpolation here would
      // grow the road outside its own bed the moment roads stopped being
      // straight.
      if (l.fill > 0 && l.fill < 1) {
        paint(ctx, { s: 'path', ink: 'fill', w: 3, curve: true,
          pts: cutAt(run, l.fill, true) }, sx, sy, 1);
      }
    }

    // ★ THE KING'S ROAD, in from off the map. Cased like any built way, with
    // the same crawling dashes — the trickle has a visible source now
    // instead of arriving from the ether.
    if (feed && feed.length > 1) {
      paint(ctx, { s: 'path', pts: feed, ink: 'casing', w: 7 }, sx, sy, 1);
      paint(ctx, { s: 'path', pts: feed, ink: 'route', w: 4.6 }, sx, sy, 1);
      ctx.save();
      ctx.lineDashOffset = -phase;
      paint(ctx, { s: 'path', pts: feed, ink: 'flowing', w: 2.2, dash: [5, 9] }, sx, sy, 1);
      ctx.restore();
    }

    for (const d of dots) {
      if (d.you) {
        // ★ THE YOU-ARE-HERE PIN, asked for by name: *"i also want an icon for
        // our character."* The teardrop every paper map uses — a circle head, a
        // point standing ON the stop, a paper ring so it reads against any
        // ground. Drawn in place of the disc, not over it: two marks in the
        // same spot was how the old boards got muddy.
        const p = posOf.get(d.id)!;
        const X = sx(p.x), Y = sy(p.y);
        ctx.beginPath();
        ctx.arc(X, Y, 11, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(214,59,38,.20)';   // the halo round where you stand
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(X, Y);                                      // the point, on the stop
        ctx.bezierCurveTo(X - 8.5, Y - 9, X - 6.5, Y - 19, X, Y - 19);
        ctx.bezierCurveTo(X + 6.5, Y - 19, X + 8.5, Y - 9, X, Y);
        ctx.closePath();
        ctx.fillStyle = INK.you;
        ctx.fill();
        ctx.strokeStyle = INK.back;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();                                       // the pin's eye
        ctx.arc(X, Y - 13, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = INK.back;
        ctx.fill();
        continue;
      }
      paint(ctx, discOf(d), sx, sy, 1);
    }
  }

  $effect(() => {
    // Re-read everything the picture depends on so the effect tracks it.
    void dots; void lines; void decor; void k; void tx; void ty; void moved; void cssW; void cssH;
    void phase; void feed; void fog;
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
      if (dx || dy) touched = true;
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
    // ★ A tap on open ground reports too — on the way it IS the work button,
    // because a crew mark can sit under the dock and a thumb needs a target
    // bigger than one dot. The view decides what it means.
    else if (!was && slid < 7) onGround?.();
    grabbed = null;
  }

  function zoomAt(by: number, px: number, py: number): void {
    touched = true;
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
    <!-- ★ LABELS STAY ON THE BOARD — a name near the edge slides inward
         instead of clipping off it (the owner's visual pass). -->
    {@const half = d.name.length * 3.2 + 4}
    {@const nudge = Math.round(Math.max(0, half + 3 - sx(p.x))
      + Math.min(0, cssW - 3 - sx(p.x) - half))}
    <button class="node" class:you={d.you} class:open={d.open} class:shut={d.shut}
      class:known={d.known} class:on={d.on} data-kind={d.kind} data-id={d.id}
      style="left:{sx(p.x)}px; top:{sy(p.y)}px"
      aria-label={d.name || 'somewhere unvisited'}
      style:--label={INK[d.you ? 'ring' : d.barred ? 'barred' : d.open ? 'open' : d.known
        ? (LOOK[d.kind]?.label ?? 'known') : 'dot']}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTap(d.id); } }}>
      {#if d.icon && ICONS[d.icon]}
        <svg class="icon" viewBox="0 0 14 14" aria-hidden="true">
          <path d={ICONS[d.icon]} />
        </svg>
      {/if}
      {#if d.name && !unlabelled.has(d.id)}
        <span class="label"
          style:transform={nudge ? `translateX(${nudge}px)` : undefined}>{d.name}</span>
      {/if}
    </button>
  {/each}
  {#each plusses as p (p.id)}
    <span class="plus" style="left:{p.x}px; top:{p.y}px"
      onanimationend={() => (plusses = plusses.filter((q) => q.id !== p.id))}>+1</span>
  {/each}
</div>

<style>
  /* Sized from its own width, never from the viewport: `100dvh` against a
     `window.innerHeight` measurement is the iOS URL-bar bug that broke the
     first two renderers. */
  /* ⚠️ HEIGHT COMES FROM THE COLUMN, NOT FROM AN ASPECT RATIO. This was
     `aspect-ratio: 1 / 0.92`, so the board's height followed its WIDTH and a
     tall phone simply got empty space under it — on a 390x844 screen the board
     took 655px and the rest of the page did nothing. The owner: *"the canvas on
     mobile can take more space vertically."* `Game.svelte` gives it the leftover
     height of a full-height flex column; if this is ever dropped into an
     unsized parent it will collapse, which is why `min-height` is here. */
  .board { position: relative; width: 100%; height: 100%; min-height: 240px;
    touch-action: none; overscroll-behavior: contain; overflow: hidden;
    border-radius: 12px; background: #f2ece0; }
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
  /* ★ The little building, sat just over its dot, in the dot's own ink. */
  .icon { position: absolute; top: 1px; width: 14px; height: 14px;
    fill: var(--label, #6a6154); opacity: 0.85; pointer-events: none;
    filter: drop-shadow(0 0 2px #f6f1e6); }
  .label { position: absolute; top: 24px; white-space: nowrap;
    font: 11px/1 ui-sans-serif, system-ui, sans-serif; color: var(--label, #6a6154);
    pointer-events: none;
    /* The halo that keeps a name legible where it crosses a line. */
    text-shadow: 0 0 3px #f6f1e6, 0 0 3px #f6f1e6, 0 0 2px #f6f1e6; }
  .node.you .label { font-weight: 700; }
  /* ★ THE +1s. Owner-requested juice: each whole mana floats off the pin and
     dies. Pointer-events none — decoration must never eat a tap. */
  .plus { position: absolute; margin-left: -8px; pointer-events: none;
    font: 700 14px/1 ui-sans-serif, system-ui, sans-serif; color: #1f6b3a;
    text-shadow: 0 0 3px #f6f1e6, 0 0 3px #f6f1e6;
    animation: rise 1.3s ease-out forwards; }
  @keyframes rise {
    from { opacity: 0; transform: translateY(6px); }
    18% { opacity: 1; }
    to { opacity: 0; transform: translateY(-30px); }
  }
  .node:focus-visible .label { text-decoration: underline; }
</style>
