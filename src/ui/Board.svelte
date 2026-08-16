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
  import { cutAt, lengthOf } from '../game/paths';
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
  /** ★★★ A DEED, HANGING OFF THE PLACE IT ACTS ON — 2026-08-16.
   *
   *  `docs/BRIEF.md` item 5, the one the brief itself calls the single
   *  non-negotiable: *"everything is a graph… including the UI itself where
   *  that is possible."* What you can DO at a place now hangs off that place
   *  on an edge, because the edge is a TRUE STATEMENT — this deed belongs to
   *  this node — where a list at the bottom of the screen was a fact about
   *  panels and not about the game.
   *
   *  ⚠️ `off` DEEDS STAY ON THE GRAPH. A deed you cannot take yet is drawn
   *  dimmed and unpressable rather than hidden: a door you can see and cannot
   *  open is item 4 of the same brief, and a menu that hides what you cannot
   *  afford teaches a player nothing about what to aim at. */
  export interface Spoke {
    /** ⚠️ THE PARENT IS THE DOT'S OWN ID STRING (`site:3`), not a site number.
     *  `posOf` is keyed by `Dot.id`, and handing it a bare number silently
     *  found nothing — the deeds simply did not draw, with no error. */
    id: string; parent: string; label: string; note: string; off: boolean;
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
    /** ★ F7: what this road carries the OTHER way, per second. */
    back?: number;
    /** ★ N6: which ink the porters wear each way — the GOOD they carry. */
    ink?: InkName;
    backInk?: InkName;
    /** ★★★ WHAT THIS LINE ACTUALLY DELIVERS, IN UNITS A SECOND — and the only
     *  number the carrier dots are drawn from. 2026-08-10, the owner: *"if it
     *  is point zero four per second, then I anticipate to see a dot moving
     *  from lumberworks to the camp at a rate of one per two seconds. At the
     *  moment, I see much more."*
     *
     *  ⚠️ NOT `load`. `load` is the fraction of the line's CAPACITY in use, so
     *  it is 1 on a full trickle and 1 on a full torrent — the old dots were
     *  spaced off it and looked identical at 0.04/s and 40/s, which is what
     *  the owner caught. This is the raw rate, and one dot crossing the far
     *  end IS one unit landing. See the maths in `draw()`.
     *
     *  0 (the default) draws NO carriers: a line that says nothing about what
     *  it delivers is not allowed to imply a number. */
    rate?: number;
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

  let { dots, lines, box, label, onTap, onGround, decor = [], mark = null, drag = true, inset = 0,
    feed = null, pulse = 0, pulseMark = '', fog = null, spokes = [], onSpoke }: {
    dots: Dot[]; lines: Line[]; box: Box; label: string;
    onTap: (id: string) => void;
    /** What can be done at the picked node, drawn hanging off it. */
    spokes?: Spoke[];
    onSpoke?: (id: string) => void;
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
    /** ★ WHAT LANDED, as a mark — 2026-08-10 (playtest). The owner: *"I also
     *  don't see plus one pop up with the appropriate icon once the resource
     *  is mined."* The float said a bare `+1` for every good alike, so it
     *  could not tell you WHICH pile grew. Empty falls back to a bare +1. */
    pulseMark?: string;
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
    /** ★★★ A MARK BETWEEN THE STOPS — a world point drawn with the same
     *  you-are-here teardrop as a `you` dot, at the same FIXED SCREEN SIZE.
     *  For the hero mid-march, who is at no stop at all.
     *
     *  ⚠️ IT IS NOT DECOR, AND THAT IS THE WHOLE POINT. Decor paints at the
     *  zoom factor `k` — right for scenery and the barrier, which belong to
     *  the country and should grow with it; wrong for a marker. The hero was
     *  decor for two commits: first drawn under the dot where the graph
     *  painted over it, then beside it as a shape that ballooned into a red
     *  lozenge larger than the camp the moment the owner zoomed in, adrift
     *  from the dot it was meant to sit on. A pin points AT the map.
     *  ⚠️ Canvas-side only, never a tap target — `docs/MAP_RECIPE.md` §9. */
    mark?: { x: number; y: number; atStop?: boolean } | null;
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

  /** ★ THE ONE MOVING THING ON THE BOARD. A clock for the flow dashes and the
   *  carriers, advanced by rAF ONLY while something is flowing — the board
   *  stays a still map the rest of the time, which is the old no-jingling rule
   *  holding. Positions never change; only the dash offset and the carriers'
   *  own place along a line do, so nothing a thumb aims at ever moves.
   *
   *  ⚠️ IN SECONDS SINCE THE FLOW STARTED, and it used to be in nothing at all
   *  — an arbitrary 0.012-per-millisecond count wrapped at 1000. The carriers
   *  have to be placed from a real rate in units A SECOND, so the clock has to
   *  be in seconds or the maths cannot be written down. The dash crawl keeps
   *  its old speed exactly: it was 12 of those units a second, and it is
   *  `DASH_CRAWL` = 12 drawing units a second now. */
  let phase = $state(0);
  $effect(() => {
    // ⚠️ A CARRY LINE NEEDS A RATE TO ANIMATE, not just a direction: with no
    // rate it draws no carriers, and an rAF spinning over a board where
    // nothing is drawn moving is the exact thing this gate exists to stop.
    const moving = feed !== null || lines.some((l) => l.fill >= 1
      && ((l.dir ?? 0) !== 0 || Math.abs(l.back ?? 0) > 0)
      && (!l.carry || Math.abs(l.rate ?? 0) > 0 || Math.abs(l.back ?? 0) > 0));
    if (!moving) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number): void => {
      // ~30fps is plenty for a crawl and half the battery of 60.
      // The wrap is an hour, so the one frame it jumps on happens once an
      // hour instead of the old once every eighty-three seconds.
      if (t - last > 33) { phase = (phase + (t - last) / 1000) % 3600; last = t; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  /** ★ HOW FAST A PORTER WALKS, in WORLD units a second. Constant, so a long
   *  haul visibly takes longer than a short one — and it is NOT what sets the
   *  arrival rate (see `draw()`), so it can be tuned for legibility alone. */
  const WALK = 28;
  /** ★ AND HOW CLOSE TWO PORTERS MAY GET, in world units. A busy road would
   *  otherwise draw a solid bar of touching dots. Past this they walk FASTER
   *  rather than closer, which leaves the arrival rate untouched. */
  const MIN_GAP = 16;
  /** The dash crawl, in drawing units a second. Was baked into `phase`. */
  const DASH_CRAWL = 12;

  /** +1s floating off the pin. Purely cosmetic, capped, self-removing. */
  let plusses = $state<Array<{ id: number; x: number; y: number; mark: string }>>([]);
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
    plusses = [...plusses,
      { id: plusId++, x: sx(at.x), y: sy(at.y) - 26, mark: pulseMark }];
  });
  // Floaters hold SCREEN coordinates, so a pan or a pinch strands them over
  // the wrong ground — clear them the moment the camera moves.
  $effect(() => { void k; void tx; void ty; plusses = []; });

  const shape = $derived(dots.map((d) => d.id).join(','));
  /** ★★★ WHERE A DEED SITS — 2026-08-16. Screen space, not world: a spoke is
   *  a piece of UI hanging off a node, so it must keep the same size and the
   *  same gap from its parent at every zoom. World-space spokes flew apart
   *  when you pinched in and stacked on top of each other when you pinched
   *  out, which is the one thing a menu may never do.
   *
   *  ⚠️ THEY FAN DOWNWARD, and that is not a taste call. The parent is always
   *  the node you just tapped, the tap came from a thumb, and the thumb is at
   *  the BOTTOM of the phone — so a fan that opens upward puts every deed
   *  under the hand that is reaching for it. Down and slightly out, in the
   *  order given, with the run capped so a long list stays on the board.
   *  ⚠️ AND IT FLIPS when the parent is low: below `cssH - 150` there is no
   *  room underneath, so the fan opens upward instead of running off the
   *  bottom edge. Measured against the real element, never assumed. */
  /** ★★★ WHERE A DEED SITS — 2026-08-16, and this is the third layout.
   *
   *  ⚠️ A FAN AROUND THE PARENT DOES NOT FIT A PHONE, and both earlier cuts
   *  proved it the same way: seven deeds hang off the camp, each chip is a
   *  word plus a price, and a fan of them from a node in the middle of a
   *  390px board lays parchment over the entire graph — including OTHER
   *  NODES, which then cannot be tapped at all. The browser probe caught it
   *  as a node click that simply failed.
   *
   *  So the deeds take a BAND along the bottom of the board and the graph is
   *  framed into what is left (`inset`, which exists for exactly this and
   *  already handles the panel). The stalk still runs from the node to each
   *  deed, because that edge is the true statement and it is the whole point:
   *  you can see, at a glance, that these actions belong to THAT place.
   *  Two columns, because a chip is ~132px and a phone is 390. */
  const SPOKE_COLS = 2;
  const SPOKE_W = 168;
  /** ⚠️ 48px OF PITCH FOR A 44px BUTTON. 44 is the thumb floor and it is the
   *  BUTTON that has to meet it — the first cut set the pitch to 44 and the
   *  chip to 40, which is not the same thing and was measured at 40. */
  const SPOKE_H = 48;
  /** ★★★ THE BAND IS ALWAYS THE SAME HEIGHT, AND THAT IS THE WHOLE POINT —
   *  2026-08-16, fixed the day after it broke.
   *
   *  ⚠️ IT WAS SIZED TO THE DEEDS ON OFFER, and it feeds `fit()`, so the
   *  camera re-framed the whole graph every time you tapped a place with a
   *  different number of things to do. Measured: SEVEN OF SEVEN NODES MOVED
   *  from a single tap, the worst by 23px. That is *"switching… repositions
   *  the height of the bottom panel a little bit, and it makes the map jam
   *  every time"* — the owner's most-repeated UI complaint, reintroduced one
   *  day after it was fixed for the panel, by the same mistake in a new
   *  place.
   *
   *  So the board reserves the same strip forever: four rows, whether there
   *  are seven deeds or none. The graph is framed once and never moves.
   *  Empty band is cheap; a map that jumps under your thumb is not. */
  const SPOKE_ROWS = 4;
  const spokeBand = SPOKE_ROWS * SPOKE_H + 10;
  const spokeAt = $derived((i: number) => {
    // ⚠️ ROW-MAJOR — left to right, then down. It was column-major, which
    // reads down-then-across: the one order a list of words is never in.
    const col = i % SPOKE_COLS;
    const row = Math.floor(i / SPOKE_COLS);
    return {
      x: 8 + col * (SPOKE_W + 6),
      y: cssH - spokeBand + 6 + row * SPOKE_H,
    };
  });

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
    const usable = Math.max(120, cssH - inset - spokeBand);
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
    const s = shape, w = cssW, h = cssH, ins = inset + spokeBand;
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

  /** The point `d` world units along a run, measured from its first point.
   *  ⚠️ ALONG THE POLYLINE, not along the drawn bezier: on the one view whose
   *  runs actually bend (the chapter) nothing sets `carry`, so every carrier
   *  drawn today walks a straight two-point run and this is exact. If a bent
   *  road ever carries, its dots will cut its corners by a pixel or two. */
  function atLen(pts: Pt[], d: number): Pt {
    let left = Math.max(0, d);
    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i]!, q = pts[i + 1]!;
      const seg = Math.hypot(q.x - p.x, q.y - p.y);
      if (left <= seg || i + 2 === pts.length) {
        const t = seg > 0 ? Math.min(1, left / seg) : 0;
        return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
      }
      left -= seg;
    }
    return pts[pts.length - 1]!;
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
        if (l.carry) {
          // ★★★ ONE DOT IS ONE UNIT DELIVERED — 2026-08-10. The owner: *"if it
          // is point zero four per second, then I anticipate to see a dot
          // moving from lumberworks to the camp at a rate of one per two
          // seconds. At the moment, I see much more."*
          //
          // ⚠️ WHAT WAS HERE WAS DECORATION WEARING A READOUT'S CLOTHES: two to
          // four dots, spaced by `load` — the fraction of CAPACITY in use — and
          // slid by a fixed 0.06 of the line per phase tick. `load` is 1 on a
          // full trickle and 1 on a full torrent, so the picture was IDENTICAL
          // at 0.04/s and at 40/s. Nothing on screen was a function of the rate.
          //
          // ★ THE MATHS, and it is the whole item. Porters stand `gap` world
          // units apart and all walk at `v` world units a second, so one
          // crosses the far end every `gap / v` seconds. Choose the gap from
          // the rate:
          //
          //     gap = v / rate     ⇒     arrivals a second = v / gap = rate
          //
          // `v` therefore never touches what the dots CLAIM, only how spread
          // out they are — which is why the crowding clamp below is free. When
          // `gap` would fall under MIN_GAP the porters walk FASTER instead of
          // closer (`v = gap * rate`), and exactly `rate` of them still leave
          // the road every second. Count them at 0.15/s and you count 0.15/s.
          // ★★★ F7, 2026-08-11 — BOTH WAYS AT ONCE. The owner: *"I could see
          // something was going from the camp to River Bend and not the other
          // way around. In actuality lumber was going one way and planks the
          // other. It was only showing one way."* A road was drawn from ONE
          // signed rate, so two opposite streams cancelled and the busier of
          // them was all you saw. `rate` and `back` are the two directions,
          // kept apart by `flow`, and each gets its own line of porters —
          // offset half a gap sideways so they pass rather than overlap.
          const len = lengthOf(run);
          for (const way of [
            // ⚠️ THE WALKING DIRECTION IS THE SPLIT ITSELF, NOT `dir`.
            // 2026-08-11, and this was wrong for a day: `rate` already means
            // "traffic from a to b" and `back` means "b to a" — that is what
            // splitting them WAS — so keying each file's direction to `dir`,
            // the old NET, reversed both of them on every road whose net ran
            // b→a. The owner, immediately: *"the resource indicators moving
            // opposite direction now."* `dir` is the cancelled number this
            // change exists to stop trusting.
            { rate: Math.abs(l.rate ?? 0), fwd: true, off: -2.4,
              ink: l.ink ?? 'flowing' },
            { rate: Math.abs(l.back ?? 0), fwd: false, off: 2.4,
              ink: l.backInk ?? 'flowing' },
          ]) {
            if (!(way.rate > 0) || len <= 1) continue;
            const gap = Math.max(MIN_GAP, WALK / way.rate);
            const v = gap * way.rate;          // === WALK unless clamped
            // Where the leading porter has got to, modulo the spacing. The
            // rest follow at `gap`, and the road holds `len / gap` of them —
            // under one when the rate is low, which is the point: the player
            // sees ONE dot cross, then an empty road, then the next.
            for (let d = (phase * v) % gap; d <= len; d += gap) {
              const at = way.fwd ? d : len - d;
              const p = atLen(run, at);
              // Shift each stream off the centre line so a two-way road reads
              // as two files of people rather than one blinking one.
              const q = atLen(run, Math.min(len, at + 1));
              const dx = q.x - p.x, dy = q.y - p.y;
              const m = Math.hypot(dx, dy) || 1;
              // ★★★ N6, 2026-08-11 — THE PORTER WEARS ITS LOAD. The owner:
              // *"the icons for the dots… could be representing what's being
              // actually transferred… at the moment it looks like conveyor
              // belts, while it's not."* A colourless dot is a conveyor; a
              // dot the colour of stone is somebody carrying stone.
              paint(ctx, { s: 'disc', x: p.x + (-dy / m) * way.off,
                y: p.y + (dx / m) * way.off, r: 3.4, ink: way.ink,
                ring: 'casing', rw: 1, alpha: 0.95 }, sx, sy, 1);
            }
          }
        } else if (l.load > 0 && (l.dir ?? 0) !== 0) {
          ctx.save();
          ctx.lineDashOffset = -phase * DASH_CRAWL * (l.dir ?? 1);
          paint(ctx, { s: 'path', pts: run, ink: 'flowing', curve: true,
            w: 2, dash: [5, 9], alpha: 0.95 }, sx, sy, 1);
          ctx.restore();
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
      //
      // ★★ AND IT IS A TRENCH, NOT A ROAD — 2026-08-10. The owner: *"the path
      // color when it is building, it is blue. I don't understand why it is
      // blue. And when it's finished, it's dark blue."* Both complaints are the
      // same defect: this was a SOLID line in a bright cyan one family away
      // from `route` (the finished road) and `flowing` (what runs through it),
      // so a way half dug looked like a way already made in a different mood.
      //
      // Two things separate them now. `fill` is turned earth (see `ink.ts`),
      // which is the one hue on this board that is neither the teal of a made
      // road nor the amber of a choke. And it is drawn HATCHED and uncased —
      // spoil and sleepers, no surface, no outline — over the dotted `unmade`
      // plan that still runs on ahead of it. Unfinished reads as unfinished.
      // ⚠️ AND IT CARRIES NOTHING: the load underlay, the crawl and the
      // carriers above are all inside `if (made …)`, which is the truth — a
      // road you are still digging delivers zero.
      if (l.fill > 0 && l.fill < 1) {
        // Width and dash chosen to lay down the same ink per unit of length as
        // the old solid 3px line (5 × 8-long stadium every 13 ≈ 2.7px), so the
        // probe's "is the road visibly filling?" pixel count keeps its meaning.
        paint(ctx, { s: 'path', ink: 'fill', w: 5, curve: true, dash: [3, 10],
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
      ctx.lineDashOffset = -phase * DASH_CRAWL;
      paint(ctx, { s: 'path', pts: feed, ink: 'flowing', w: 2.2, dash: [5, 9] }, sx, sy, 1);
      ctx.restore();
    }

    /** ★★★ THE HERO, AS A PERSON — 2026-08-11, the owner's call after three
     *  wrong marks in a row. They asked three questions in a row: *"why is it
     *  red… why is it a diamond… why is it a shape…"* and none of the three
     *  had a good answer.
     *
     *  RED was `you` (#d63b26) — "the red pin every map has" — on a board
     *  where red IS the enemy (`foe` #8f2f22). A DIAMOND was an attempt to
     *  fix that collision with geometry instead of fixing the colour. And a
     *  SHAPE at all was reaching for map-marker convention when what was
     *  asked for, by name, was *"an icon for our character"* — on a board
     *  that already draws a hut, a quarry, a sawmill and a farm as little
     *  pictograms.
     *
     *  So: a small standing figure, in the green this board uses for what is
     *  yours. Screen space and screen sizes, feet planted on the point, drawn
     *  paper-first so it reads against terrain, ground and fog alike. */
    function figure(c: CanvasRenderingContext2D, X: number, Y: number): void {
      c.beginPath();                                   // the ground they hold
      c.arc(X, Y - 7, 12, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(31,122,63,.18)';
      c.lineWidth = 6;
      c.stroke();
      // Paper underneath, then the ink on top: the same two-pass trick the
      // roads use, and the only reason this reads on dark terrain.
      for (const pass of [{ ink: INK.back, w: 5 }, { ink: INK.open, w: 2.4 }]) {
        c.strokeStyle = pass.ink;
        c.lineWidth = pass.w;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(X, Y - 11); c.lineTo(X, Y - 5);       // body
        c.moveTo(X - 4.5, Y - 8.5); c.lineTo(X + 4.5, Y - 8.5);   // arms
        c.moveTo(X, Y - 5); c.lineTo(X - 3.5, Y);      // legs, standing on it
        c.moveTo(X, Y - 5); c.lineTo(X + 3.5, Y);
        c.stroke();
        c.beginPath();
        c.arc(X, Y - 14, 3.1, 0, Math.PI * 2);         // head
        c.fillStyle = pass.ink;
        c.fill();
      }
    }

    for (const d of dots) {
      if (d.you) {
        // The older screens still put the walker ON the stop in place of its
        // disc; only the camp keeps both, via `mark`.
        const p = posOf.get(d.id)!;
        figure(ctx, sx(p.x), sy(p.y));
        continue;
      }
      paint(ctx, discOf(d), sx, sy, 1);
    }

    // ★★ THE HERO BESIDE THE STOP — offset in SCREEN pixels, which is the one
    // thing world-space decor could never do (a world offset grows with the
    // zoom, which is how the last marker ended up adrift). Two reasons for
    // the offset, both found only by looking at it: a site's icon is DOM,
    // drawn OVER the canvas, so a figure on the dot is a figure behind a hut;
    // and standing them on the dot means the dot cannot also be there.
    // Mid-march there is no stop to stand beside, so no offset — they are
    // exactly where they are on the road.
    if (mark) figure(ctx, sx(mark.x) + (mark.atStop ? 13 : 0),
      sy(mark.y) + (mark.atStop ? 6 : 0));
  }

  $effect(() => {
    // Re-read everything the picture depends on so the effect tracks it.
    void dots; void lines; void decor; void mark; void k; void tx; void ty; void moved; void cssW; void cssH;
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
    <!-- ★★★ F4, 2026-08-11 — the owner, zoomed in on the camp: *"this Scree
         Slope label follows… these labels, they follow too long. They should
         stop following as soon as I stop seeing the related edge."*
         A name near the edge slides inward so it does not clip off (the
         owner's own earlier visual pass) — but with nothing bounding the
         slide, a dot far off screen kept its name pinned to the edge and it
         read as a label chasing the camera. Two bounds now: the name is only
         drawn if its DOT is on screen, and the slide is capped so a name can
         never travel further than its own width from the thing it names. -->
    {@const seen = sx(p.x) > -24 && sx(p.x) < cssW + 24
      && sy(p.y) > -24 && sy(p.y) < cssH + 24}
    {@const slide = Math.round(Math.max(0, half + 3 - sx(p.x))
      + Math.min(0, cssW - 3 - sx(p.x) - half))}
    {@const nudge = Math.max(-half, Math.min(half, slide))}
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
      {#if d.name && seen && !unlabelled.has(d.id)}
        <span class="label"
          style:transform={nudge ? `translateX(${nudge}px)` : undefined}>{d.name}</span>
      {/if}
    </button>
  {/each}
  <!-- ★★★ THE DEEDS, HANGING OFF THE NODE THEY ACT ON — 2026-08-16, brief
       item 5. The STALK is an SVG line (a graph edge is a line, and this one
       has to sit above the canvas so it is never buried by terrain); the chip
       is DOM, because it is a word and a tap target. -->
  {#if spokes.length > 0}
    {@const par = posOf.get(spokes[0]?.parent ?? '')}
    {#if par}
      {@const px = sx(par.x)}
      {@const py = sy(par.y)}
      <svg class="stalks" aria-hidden="true">
        {#each spokes as sp, i (sp.id)}
          {@const at = spokeAt(i)}
          <line x1={px} y1={py} x2={at.x + 10} y2={at.y + SPOKE_H / 2}
            class:off={sp.off} />
        {/each}
      </svg>
      {#each spokes as sp, i (sp.id)}
        {@const at = spokeAt(i)}
        <button class="spoke" class:off={sp.off} disabled={sp.off}
          style="left:{at.x}px; top:{at.y}px; width:{SPOKE_W}px"
          data-spoke={sp.id}
          onpointerdown={(e) => e.stopPropagation()}
          onpointerup={(e) => e.stopPropagation()}
          onclick={(e) => { e.stopPropagation(); onSpoke?.(sp.id); }}>
          <span class="what">{sp.label}</span>
          <!-- ⚠️ ONLY A DEED YOU CAN TAKE CARRIES ITS PRICE. The refusals are
               sentences — "No road reaches here. Lay one from a place you
               hold." — and seven of those hanging off the camp laid a wall of
               parchment across the whole board, hiding the graph they are
               supposed to be part of and burying other nodes under it. A
               blocked deed shows its NAME (so you know the door is there) and
               the panel says why. -->
          <!-- ⚠️ THE FIRST CLAUSE ONLY. A note is "🪨3 ⏱6s → 1.0/s · ⏱shorter
               marches" — the price, then what it buys you. A 168px chip shows
               the price and clips the rest mid-word, which reads as a bug; the
               panel has room for the whole sentence. -->
          {#if sp.note && !sp.off}<em>{sp.note.split(' · ')[0]}</em>{/if}
        </button>
      {/each}
    {/if}
  {/if}
  {#each plusses as p (p.id)}
    <span class="plus" style="left:{p.x}px; top:{p.y}px"
      onanimationend={() => (plusses = plusses.filter((q) => q.id !== p.id))}
      >+1{p.mark ? ` ${p.mark}` : ''}</span>
  {/each}
</div>

<style>
  /* ★★★ THE DEED SPOKES — 2026-08-16. A chip on the board, joined to its
     node by a drawn edge. It has to read as PART OF THE GRAPH rather than as
     a popover sitting on top of one, so: the same card face and the same
     hairline the rest of the chrome uses, and the stalk in the same ink as a
     road you can take. */
  .stalks { position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; overflow: visible; }
  .stalks line { stroke: var(--moss); stroke-width: 1.5; opacity: 0.65; }
  .stalks line.off { stroke: var(--faint); opacity: 0.4; stroke-dasharray: 3 3; }
  /* ⚠️ CAPPED AND WRAPPING. The first cut let a chip size to its own text and
     a deed whose note is a sentence — "No road reaches here. Lay one from a
     place you hold." — came out 250px wide and laid a wall of parchment over
     the board. The graph has to stay visible; that is the entire reason the
     deeds moved onto it. */
  /* ⚠️ EVERY CHIP IS THE SAME HEIGHT, AND THAT IS A TAP-TARGET RULE, not a
     tidiness one. The first cut let each chip wrap to its own text, so a
     two-line chip overlapped the one below it — and an overlapped chip is a
     chip whose top half belongs to its neighbour. The browser probe found it
     as "the spade went in silently": the click landed, on the wrong element.
     Both lines clip to one line each; the graph is where you read the shape
     of things, and the panel is where a sentence goes. */
  /* ⚠️ THE CHIP MUST CLAIM ITS OWN POINTER. `.board` takes `pointerdown` for
     panning and resolves a NODE tap itself on `pointerup` — which is why
     `.node` carries no `onclick` at all. A button dropped into that container
     therefore never sees a click: the board captures the pointer first and
     the press is read as a drag on the map. The chips stop the pointer at the
     source, and only then does `onclick` reach them. Cost a debugging session
     that went looking in the handler while the event never arrived. */
  .spoke { position: absolute;
    display: flex; flex-direction: column; align-items: flex-start; gap: 0;
    font: inherit; text-align: left;
    box-sizing: border-box; height: 44px;
    background: var(--card); border: 1px solid var(--moss);
    border-radius: var(--r1); padding: 5px 9px; min-height: 30px;
    justify-content: center; cursor: pointer; z-index: 3;
    box-shadow: 0 1px 3px var(--shadow); }
  .spoke .what, .spoke em { max-width: 100%; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; display: block; }
  .spoke .what { font-size: var(--t6); font-weight: 700; color: var(--ink);
    line-height: 1.15; }
  .spoke em { font-style: normal; font-size: var(--t8); color: var(--faint);
    line-height: 1.2; }
  /* ⚠️ SHOWN, NOT HIDDEN. A deed you cannot take yet is a door you can see —
     brief item 4 — so it dims and stops being pressable rather than
     vanishing and teaching nothing. */
  /* ⚠️ AND IT DOES NOT STEAL TAPS. A dimmed chip is INFORMATION — a door you
     can see and cannot open — so it must not sit between your thumb and the
     node behind it. `disabled` alone still occludes; `pointer-events: none`
     is what lets the tap through to the map. The probe found this as "no path
     deed at the pines": the pines node was under a chip belonging to the
     place picked before it. */
  .spoke.off { border-color: var(--rule); background: var(--sunk);
    box-shadow: none; pointer-events: none; }
  .spoke.off .what { color: var(--faint); font-weight: 600; }

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
  /* ⚠️ NO `z-index` HERE, AND IT WAS TRIED: raising nodes above the deed
     chips so a chip could never cover a node made things worse, not better.
     A node's tap target is a 44px square centred on the dot, and the first
     chip hangs 30px below its own parent — so lifting nodes made the parent
     node eat the first deed on every place. The chips win where they overlap;
     an unavailable one drops out of the way instead (`pointer-events`). */
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
