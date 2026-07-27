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
    agentCost, attentionCap, attentionFree, canExtract, CONNECT_MS, displayedFidelity,
    DISCOVER_MS, extractionYield, hasTrust, pendingVignette, recovered,
    REFLECT_MIN_CONCEPTS, sourceAgreement, extractCapacity,
    ATTENTION_BASE, ATTENTION_PENALTY_FLOOR, attentionPenalty, choicesFor,
    canGrowContext, contextGate, contextFull, contextStep, contextUsed, contextWindow,
    EXTRACT_MS, inContext,
    unsupervised, verified,
  } from '../core/engine';
  import { FRONTIER_CAP } from '../core/graph';
  import { READOUTS } from '../core/readouts';
  import { D, format, formatWhole, gte } from '../core/numbers';
  import { GENERATORS, M1_ROSTER } from '../content/generators';
  import { CONCEPT_BUDGET } from '../content/ontologyMeta';
  import { REL_NAMES } from '../core/types';
  import { VIGNETTES, describeEffects } from '../content/vignettes';
  import {
    conceptAt, conceptForNode, loadManifest, ontologyCredit, ontologyRevision,
    potentialEdges, reachingOut, warm,
  } from '../shell/ontology';
  import {
    cameraFor, clampZoom, frontierPos, isRotted, relHue, stageHue, toScreen, toWorld,
  } from '../render/board';
  import { detail, dotRadius, weigh } from '../render/detail';
  import { GraphSim } from '../render/sim';
  import { paintGraph } from '../render/paint';
  import { ticker, TICKER_TTL_MS } from '../shell/ticker';
  import { proposeCandidates } from '../shell/salvage';

  let canvas = $state<HTMLCanvasElement>();
  let stage = $state<HTMLDivElement>();
  let sheet = $state<null | 'vignette' | 'save' | 'help'>(null);
  /** Which page of the manual. The glossary is half the reason the sheet
   *  exists — the owner asked for it by name — so it is a tab, not a scroll. */
  let helpTab = $state<'play' | 'terms'>('play');
  let toast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let w = $state(360);
  let h = $state(480);
  let now = $state(0);

  const credit = $derived.by(() => { void $ontologyRevision; return ontologyCredit(); });
  // The palette drifts with progress. It used to drift with `graph.nodes` —
  // concepts PLACED, dark ones included — so the world changed colour for work
  // the player had not finished. Same readout as the HUD now.
  const hue = $derived(stageHue(READOUTS.recovered.count($game).toNumber()));
  const trust = $derived(displayedFidelity($game));
  /** The second number: how much of what you have drawn matches the source. */
  const agreeing = $derived(sourceAgreement($game));
  const free = $derived(attentionFree($game));
  /** Slots lost to unconfirmed work. The only thing in the game that takes one
   *  away, so it gets its own name rather than being inlined into a class. */
  const penalty = $derived(attentionPenalty($game));

  /** Ticker lines that have not yet expired.
   *
   *  This used to be `$ticker.slice(-2)` — an append-only list rendered from
   *  the end, so the last two lines stayed under the board indefinitely. The
   *  owner's screenshot had "graph: 25 nodes" still sitting there, which reads
   *  as a frozen element rather than as news.
   *
   *  The clock is `$game.lastTick`, not `Date.now()`: the game store ticks at
   *  10 Hz, so referencing it is what makes this re-evaluate at all. A
   *  wall-clock read here would compute once and never update. */
  const liveTicker = $derived.by(() => {
    const clock = $game.lastTick || Date.now();
    return $ticker.filter((l) => clock - l.at < TICKER_TTL_MS).slice(-2);
  });

  /** Extraction reads the concepts IN CONTEXT — a connected slice of the
   *  taxonomy, newest concepts plus the paths that reach them — not everything
   *  that has ever been on the board. That is what makes the window mean
   *  something: grow it and the model can relate more of its own graph at once.
   *
   *  The parent lookup is what stops every proposal being `X is a entity`; see
   *  `inContext` in core for the measurement. */
  const held = $derived.by(() => {
    void $ontologyRevision; // parents arrive with the chunk; re-slice when they do
    return inContext($game, (id) => conceptAt(id)?.parent ?? -1);
  });

  const potential = $derived.by(() => {
    void $ontologyRevision;
    return potentialEdges(held);
  });

  /** What Extract would propose right now. Derived, so the BUTTON can be
   *  disabled when there is nothing left to find — it used to stay enabled and
   *  do nothing, which reads as a broken button and, in the probe, produced an
   *  infinite loop of clicking it. */
  const proposable = $derived(
    proposeCandidates(held, potential, $game.forged.edges, extractCapacity($game)).length);

  /** Every candidate is a REAL relation from the shipped dataset, over concepts
   *  IN CONTEXT. An extractor proposes; it does not verify, so these arrive
   *  unchecked and rot like anything nobody has looked at. */
  function extract(): void {
    if (!canExtract($game)) { say('Nothing in context to read'); return; }
    if (free < 1) { say('No free attention'); return; }
    const candidates = proposeCandidates(
      held, potential, $game.forged.edges, extractCapacity($game),
    );
    if (candidates.length === 0) { say('Nothing new to propose here'); return; }
    dispatch({ type: 'extract', candidates });
  }

  /** Diameter of the drawn window. It tracks the FRAMED extent of the graph, so
   *  the ring reads as the boundary the concepts live inside rather than as a
   *  decoration floating at a fixed size. */
  const contextRing = $derived(Math.max(120, Math.min(w, h) * 0.86));

  /** Concepts inside the window. Everything else is drawn cold: still there,
   *  still yours, just not what the model is thinking about right now. */
  const heldSet = $derived(new Set(held));

  /** What a locked choice is still waiting for, in words the player can go and
   *  look for. Concept labels come from the ontology and relation names from
   *  REL_NAMES — every one is data, none is authored copy. A concept whose
   *  chunk has not landed shows its id rather than blanking the line. */
  function needs(missing: { concepts: number[]; rels: number[] }): string {
    void $ontologyRevision;
    const words = [
      ...missing.concepts.map((id) => conceptAt(id)?.label ?? `#${id}`),
      ...missing.rels.map((r) => REL_NAMES[r] ?? `rel ${r}`),
    ];
    return words.length === 0 ? '' : `needs ${words.join(' · ')}`;
  }

  const activeVignette = $derived.by(() => {
    const id = pendingVignette($game);
    return id ? (VIGNETTES.find((v) => v.id === id) ?? null) : null;
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

  /** THE DOTTED LINES ARE PROPOSALS, AND PROPOSALS COME FROM EXTRACT.
   *
   *  This used to be `potential` — every relation the DATASET offers between two
   *  concepts on the board — minus the ones already drawn. So a dotted line
   *  appeared the instant two concepts happened to be related, the board filled
   *  with connections nobody asked for, and Extract looked like it did nothing
   *  because its output was indistinguishable from free scenery.
   *
   *  Now a dotted line is an UNCHECKED EDGE: something Extract proposed, or an
   *  unwatched machine invented. Tapping it confirms it. `potential` is still
   *  the source of truth for what Extract may propose — it is just no longer
   *  something the player can see and take for free. */
  const dotted = $derived.by(() =>
    $game.forged.edges
      .filter((e) => !e.checked && onScreen.has(e.a) && onScreen.has(e.b))
      .map((e) => ({ a: e.a, b: e.b, rel: e.rel })));

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

  const extracting = $derived($game.bookings.find((b) => b.kind === 'extract'));

  /** THE FLASH. While extraction runs the board shows it working: pairs among
   *  the concepts it is reading, cycling, plus stubs reaching OUTWARD from
   *  concepts that have relations to things you have not discovered.
   *
   *  Every pair is real. The reaching stubs are real relations too — they simply
   *  cannot be drawn, because the other end is not on the board yet. Nothing
   *  here is invented for effect, and none of it touches state: it is a picture
   *  of work, and it disappears when the work lands. */
  const reaching = $derived.by(() => {
    void $ontologyRevision;
    return extracting ? reachingOut(held, $game.forged.anchors) : [];
  });

  const flash = $derived.by(() => {
    if (!extracting) return { pairs: [], stubs: [] };
    void now; // repaint every frame: this is an animation, not a state read
    const t = Math.floor(now / 110);
    // ⚠️ THE CANDIDATES ON THE BOOKING, not `potential`.
    //
    // This used to strobe every relation the dataset offers among held
    // concepts — including ones already drawn and ones that would never be
    // proposed — so the board lit up ~15 lines and then landed 3. The owner
    // said "why does extract display everything instead of showing just 1
    // connection", which was a literal and accurate description of the bug.
    const pool = extracting.edges ?? [];
    const pairs = pool.length === 0 ? [] : Array.from({ length: Math.min(3, pool.length) },
      (_, k) => pool[(t + k * 7) % pool.length]!);
    const stubs = reaching.length === 0 ? [] : Array.from({ length: Math.min(2, reaching.length) },
      (_, k) => reaching[(t + k * 5) % reaching.length]!);
    return { pairs, stubs };
  });
  const banked = $derived(D($game.pending).add(D($game.pendingClean)));
  // TWO different endings, and they were conflated. `nextId` running out means
  // there is nothing left to FIND; it does not mean the world was recovered,
  // and the button said "world recovered" at 6% coverage because a discovery
  // consumed an id whether or not the concept survived. Now they are separate,
  // and the honest one gates the claim.
  const nothingLeftToFind = $derived($game.forged.nextId >= CONCEPT_BUDGET);
  const worldDone = $derived(recovered($game) >= CONCEPT_BUDGET);
  const canDiscover = $derived(free >= 1 && $game.bookings.length < FRONTIER_CAP
    && $game.lastTick > 0 && !nothingLeftToFind);

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
  /** Did this gesture land on a CONTROL rather than on the board?
   *
   *  The dotted-line targets, the fit button and the inspect card all live
   *  inside the stage, so their taps arrived at the stage's pointer handlers
   *  too — and every one of them silently switched auto-framing off. Tapping
   *  "connect" would stop the board framing itself, and concepts then drifted
   *  off the edges as the graph grew, for a reason the player could not
   *  possibly connect to what they had just pressed. */
  const onControl = (e: Event): boolean =>
    !!(e.target as Element | null)?.closest?.('button, .card');

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

  /** A press that never travels this far (SCREEN px) was a tap, not a drag.
   *  Fingers wobble, so zero would mean no tap ever lands on a touchscreen. */
  const TAP_PX = 8;

  /** The node a press landed on, and where the press started, held until the
   *  pointer either travels (→ it was a drag, forget it) or lifts (→ inspect).
   *  Every press on a node also `grab`s it, so this rides alongside the drag
   *  rather than competing with it: a tap is just a drag that went nowhere. */
  let tapCandidate: { id: number; x: number; y: number } | null = null;

  /** Which concept's card is open. Not a `sheet` — the card is non-modal on
   *  purpose, so reading a definition never stops the simulation or the game. */
  let inspecting = $state<number | null>(null);

  /** Null while the concept's chunk is still in flight, so the card simply does
   *  not appear rather than flashing an empty box. */
  const inspected = $derived.by(() => {
    void $ontologyRevision;
    return inspecting === null ? null : conceptForNode(inspecting);
  });

  /** Called on every pointer move with SCREEN coords: once a press has
   *  travelled, it is a drag and can no longer become a tap. */
  function travelled(x: number, y: number): void {
    if (tapCandidate && Math.hypot(x - tapCandidate.x, y - tapCandidate.y) > TAP_PX) {
      tapCandidate = null;
    }
  }

  function onTouchStart(e: TouchEvent): void {
    if (!grabbing) return;
    if (onControl(e)) return;
    takeControl();
    grip = centreOf(e.touches);
    tapCandidate = null;
    // One finger landing ON a concept grabs it; anything else pans. Two fingers
    // are always a pinch, never a drag — you cannot aim a pinch at one node.
    if (e.touches.length === 1 && stage) {
      const box = stage.getBoundingClientRect();
      const at = toWorld(cam, { x: grip.x - box.left, y: grip.y - box.top });
      const hit = sim.pick(at.x, at.y, GRAB_PX / cam.scale);
      if (hit !== null) {
        sim.grab(hit);
        tapCandidate = { id: hit, x: grip.x, y: grip.y };
      } else {
        inspecting = null; // tapping the void dismisses, like any map app
      }
    }
  }

  function onTouchMove(e: TouchEvent): void {
    if (!grabbing || !grip || !stage) return;
    e.preventDefault(); // we own this gesture; rule 3 above decided that already
    const now = centreOf(e.touches);
    travelled(now.x, now.y);
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
    if (e.touches.length === 0) {
      sim.release();
      if (tapCandidate) inspecting = tapCandidate.id;
      tapCandidate = null;
    }
    grip = e.touches.length > 0 ? centreOf(e.touches) : null;
  }

  // Mouse equivalents, so the drag is exercisable in a browser test without
  // synthesising a touch sequence — and so it works on a desktop at all.
  let mouseDown = false;
  function onMouseDown(e: MouseEvent): void {
    if (!stage) return;
    if (onControl(e)) return;
    takeControl();
    const box = stage.getBoundingClientRect();
    const at = toWorld(cam, { x: e.clientX - box.left, y: e.clientY - box.top });
    const hit = sim.pick(at.x, at.y, GRAB_PX / cam.scale);
    if (hit !== null) {
      sim.grab(hit); mouseDown = true;
      tapCandidate = { id: hit, x: e.clientX, y: e.clientY };
    } else {
      tapCandidate = null;
      inspecting = null;
    }
  }
  function onMouseMove(e: MouseEvent): void {
    if (!mouseDown || !stage || !sim.isDragging) return;
    travelled(e.clientX, e.clientY);
    const box = stage.getBoundingClientRect();
    const at = toWorld(cam, { x: e.clientX - box.left, y: e.clientY - box.top });
    sim.dragTo(at.x, at.y);
  }
  function onMouseUp(): void {
    mouseDown = false;
    sim.release();
    if (tapCandidate) inspecting = tapCandidate.id;
    tapCandidate = null;
  }

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
    if (!canDiscover) { say(nothingLeftToFind ? '⟨nothing left to find — owner⟩' : 'No free attention'); return; }
    dispatch({ type: 'discover' });
  }

  function connect(p: { a: number; b: number; rel: number }): void {
    if (free < 1) { say('No free attention'); return; }
    dispatch({ type: 'connect', edge: { ...p, checked: true, fake: false } });
  }

  $effect(() => {
    warm([...$game.forged.frontier, ...$game.forged.anchors, $game.forged.nextId]);
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
        paintGraph(canvas, { state: $game, w, h, timeMs: t, hue, dotted, flash, pos: screenPos, cam });
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
    <!-- EVERY CELL IS A NOUN. The owner could not name two of the three numbers
         that used to be here: "of 4096" was a bare denominator and "free of 2"
         never said free WHAT. So each cell now carries the value and the word
         for the value, and nothing else. The dataset size left the HUD with the
         same reasoning — 0.02% at minute one is a number with no meaning yet,
         and there is no room to caption it honestly at this size. -->
    <div class="stats">
      <div><b class="good">{recovered($game)}</b><span>recovered</span></div>
      <!-- THE CONTEXT WINDOW. Was ANCHOR_CAP = 240: invisible, unnamed, and it
           silently folded a concept away the moment you exceeded it. -->
      <div><b class:warn={contextFull($game)}>{contextUsed($game)}/{contextWindow($game)}</b><span>context</span></div>
      <!-- "—" not "100%": a new save has zero statements and the ratio returns
           1, which read as a perfect score over an empty graph. -->
      <!-- A FRACTION, NOT A PERCENTAGE. "90% checked" does not say ninety
           percent OF WHAT, and the owner said so. "36/40" answers that without
           a word of explanation. -->
      <div><b class:good={hasTrust($game) && trust > 0.66}
              class:warn={hasTrust($game) && trust <= 0.66 && trust > 0.33}
              class:bad={hasTrust($game) && trust <= 0.33}
        >{hasTrust($game)
          ? `${formatWhole(verified($game))}/${formatWhole($game.resources.triples)}`
          : '—'}</b><span>checked</span></div>
      <!-- THE SECOND NUMBER. On screen from minute one, small and unremarked,
           because a late reveal would rescore the player's own progress
           downward and they would be right to call that a lie (ECONOMY.md).
           It is never explained here. It does not need to be — it is true, it
           is small, and one day it stops matching the number beside it. -->
      <div><b class:warn={agreeing < 1 && agreeing > 0.8} class:bad={agreeing <= 0.8}
        >{$game.forged.edges.length > 0
          ? `${$game.forged.edges.filter((e) => !e.fake).length}/${$game.forged.edges.length}`
          : '—'}</b><span>agreeing</span></div>
      <!-- The DENOMINATOR moves, and that is the one degradation in the game.
           When unconfirmed work piles up the cap drops, so the cell goes amber
           on the total rather than on the free count — a shrinking capacity and
           a full one are different problems and used to look identical. -->
      <div><b class:good={free > 0 && penalty === 0} class:warn={free === 0 || penalty > 0}
        >{free}/{attentionCap($game)}</b><span>attention</span></div>
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

    <!-- THE CONTEXT WINDOW, drawn. Everything you hold lives inside it; the ring
         tightens as it fills and turns amber when it is full, so "why can I not
         discover anything" has an answer you can see before you read it. -->
    <div class="window" class:full={contextFull($game)}
         style="--d:{contextRing}px;--fill:{contextUsed($game) / Math.max(1, contextWindow($game))}"></div>

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
       class:cold={!heldSet.has(n.id)}
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

    <!-- Tap a concept, read its definition. DECISIONS records that the gloss is
         the REWARD for recovering a concept, and until now the only place a
         gloss appeared was the review desk — where it is the instrument you use
         to spot a corrupt item, i.e. a chore. This is the payoff surface.

         The text is WordNet's own definition, verbatim (CC BY 4.0, credited in
         the dock). It is DATA, not prose: no sentence here is written by anyone
         on this project, so the human-written-prose rule is not in play. -->
    {#if inspected}
      <aside class="card">
        <div class="txt">
          <b>{inspected.label}</b><em>{inspected.category}</em>
          <p>{inspected.gloss}</p>
        </div>
        <button aria-label="close" onclick={() => (inspecting = null)}>×</button>
      </aside>
    {/if}
  </div>

  <footer class="dock">
    <!-- The event drip. It has been built, wired and fed since the canvas
         rewrite and rendered NOWHERE — so the game had no player-facing
         sentences at all outside UI chrome. Mechanical lines ship now; the
         owner's flavour lines slot into OWNER_LINES (docs/TICKER_LINES.md)
         without touching this. -->
    {#if liveTicker.length > 0}
      <div class="ticker">
        {#each liveTicker as l (l.id)}<span>{l.text}</span>{/each}
      </div>
    {/if}

    <!-- THE THREE VERBS (docs/MODEL.md): Extract proposes, Discover finds, and
         tapping a dotted line confirms. Extract costs nothing and is
         self-limiting; attention is what confirming spends. -->
    <div class="actions">
      <!-- The yield is a PERCENTAGE YOU RAISE, never a subtraction. Same
           arithmetic as "lost 11 of 20", opposite feeling (ECONOMY.md). -->
      {#if extracting}
        <div class="act status"><b>Reading</b><span>{Math.max(0, Math.ceil((extracting.until - $game.lastTick) / 1000))}s</span></div>
      {:else}
        <button class="act primary" disabled={!canExtract($game) || free < 1 || proposable === 0}
          onclick={extract}>
          <b>Extract</b><span>{proposable === 0 ? 'nothing new here'
            : free < 1 ? 'no free slot' : `${proposable} · ${EXTRACT_MS / 1000}s`}</span>
        </button>
      {/if}

      <button class="act primary" disabled={!canDiscover} onclick={discover}>
        <b>Discover</b>
        <span>{worldDone ? 'world recovered' : nothingLeftToFind ? '⟨nothing left to find — owner⟩' : canDiscover ? `1 slot · ${DISCOVER_MS / 1000}s` : 'no free slot'}</span>
      </button>

      <!-- (A "N lines filling" chip lived here. The line is already visibly
           filling ON THE BOARD — the painter draws it growing from one end —
           so the chip restated something you were already looking at, in a
           word ("lines") the rest of the game had stopped using. -->

      <!-- (The Review desk lived here. It sampled an abstract statement pool
           and touched NOTHING on the board — owner: "review does not make any
           sense, i got so confused". Confirming a dotted line is the check now,
           and it is the thing you are already looking at.) -->

      {#if banked.gt(0)}
        <button class="act warn" onclick={() => dispatch({ type: 'absorb' })}>
          <b>Absorb</b><span>{formatWhole(banked.toString())}</span>
        </button>
      {/if}

      {#if activeVignette}
        <button class="act core" onclick={() => (sheet = 'vignette')}><b>Decide</b><span>pending</span></button>
      {/if}

      <!-- The one way to grow it. Priced in CHECKED statements — the sink the
           ladder never had, and the one currency you cannot mint by tapping. -->
      {#if contextFull($game) || canGrowContext($game)}
        <button class="act core" disabled={!canGrowContext($game)}
          onclick={() => (canGrowContext($game)
            ? dispatch({ type: 'growContext' })
            : say(`Confirm ${format(contextGate($game))} edges to widen it`))}>
          <b>Grow context</b><span>+{contextStep()} · at {format(contextGate($game))} confirmed</span>
        </button>
      {/if}

      {#if recovered($game) >= REFLECT_MIN_CONCEPTS}
        <button class="act bad" onclick={() => { dispatch({ type: 'reflect' }); say('Retrained'); }}>
          <b>Retrain</b><span>gen {$game.reflection + 2}</span>
        </button>
      {/if}
    </div>

    <!-- (The ruins/archives source toggle lived here. It chose where Salvage
         drew from, and Salvage is gone: it was a middleman between two verbs.) -->

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
      <button class="more" aria-label="how to play" onclick={() => (sheet = 'help')}>?</button>
      <button class="more" aria-label="save menu" onclick={() => (sheet = 'save')}>⋯</button>
    </div>
  </footer>

  {#if sheet === 'vignette' && activeVignette}
    <div class="sheet">
      <h2>{activeVignette.title || '⟨title — owner⟩'}</h2>
      <p class="body">{activeVignette.body || '⟨body — owner⟩'}</p>
      <!-- A LOCKED CHOICE IS DRAWN, NEVER HIDDEN. It is the only thing in the
           game that says what discovering more of the graph is FOR, and a door
           that is not drawn teaches nothing. It also names what it wants —
           "locked" with no reason is a dead end wearing a lock icon — and the
           names are ontology labels, i.e. DATA, not written copy. -->
      <div class="sheet-foot col">
        {#each choicesFor($game, activeVignette) as m (m.choice.id)}
          <button class="choice" class:locked={!m.takeable} disabled={!m.takeable}
            onclick={() => { dispatch({ type: 'chooseOption', eventId: activeVignette.id, choiceId: m.choice.id }); sheet = null; }}>
            <b>{m.choice.label || '⟨choice — owner⟩'}</b>
            <span>{m.takeable ? describeEffects(m.choice.effects) : needs(m.missing)}</span>
          </button>
        {/each}
      </div>
    </div>
  {:else if sheet === 'help'}
    <!-- ---- THE MANUAL --------------------------------------------------
         ★ EVERY NUMBER HERE IS READ FROM THE ENGINE, never typed in. A help
         page that drifts from the code is worse than no help page: it teaches
         a wrong game with authority. Change a cost and this changes with it.

         ★ THE PROSE RULE, AND WHERE THE LINE NOW SITS. CLAUDE.md bans
         AI-written player-facing prose because the game satirises AI slop.
         The owner asked, in as many words, for explanations in the game that
         make sense, so the rule is amended deliberately (docs/DECISIONS.md
         2026-07-27) rather than quietly broken:

           MECHANICAL EXPLANATION — what a button does, what a number counts,
           what a real term means — is written here. It is documentation.
           VOICE — jokes, flavour, Field Notes, event text, the cold open —
           stays the owner's, and stays an ⟨owner⟩ slot until they write it.

         ★ THE GLOSSARY IS THEORY-FAITHFUL. Every definition below matches
         docs/GLOSSARY.md, which cites its sources. If they ever disagree, the
         glossary wins. This is an educational game; getting `hypernym` subtly
         wrong here is a worse bug than a broken button. -->
    <div class="sheet">
      <h2>{helpTab === 'play' ? 'How to play' : 'What the words mean'}</h2>
      <nav class="tabs">
        <button class:on={helpTab === 'play'} onclick={() => (helpTab = 'play')}>How to play</button>
        <button class:on={helpTab === 'terms'} onclick={() => (helpTab = 'terms')}>Glossary</button>
      </nav>

      {#if helpTab === 'play'}
        <p class="body">You are rebuilding a <b>knowledge graph</b> — a map of
          concepts and the relations between them — from a corpus that machines
          have spent years training on their own output. The facts are still in
          there somewhere. Almost none of them have been checked by a human.
          That last part is your whole job.</p>

        <h3>What you are looking at</h3>
        <p class="body">Every dot is a <b>concept</b>: one meaning, not one
          word. Every line between two dots is an <b>edge</b>, and one edge is
          one statement — <i>race is a group</i>. An edge drawn <b>dotted</b>
          is a proposal nobody has checked yet; a solid one is confirmed. Tap
          any dot to read its real dictionary definition.</p>

        <h3>The three things you do</h3>
        <table class="ref"><tbody>
          <tr><th>verb</th><th>costs</th><th>takes</th><th>gives</th></tr>
          <tr><td><b>Discover</b></td><td>1 attention</td><td>{DISCOVER_MS / 1000}s</td>
              <td>a new concept, with nothing attached to it yet</td></tr>
          <tr><td><b>Extract</b></td><td>1 attention</td><td>{EXTRACT_MS / 1000}s</td>
              <td>proposed edges, drawn dotted</td></tr>
          <tr><td><b>tap a dotted edge</b></td><td>1 attention</td><td>{CONNECT_MS / 1000}s</td>
              <td>that edge confirmed: +1 checked</td></tr>
          <tr><td><b>Grow context</b></td><td>nothing</td><td>—</td>
              <td>+{contextStep()} context, once you have confirmed
                  {format(contextGate($game))} in total</td></tr>
        </tbody></table>
        <p class="body">Everything books a slot of <b>attention</b> and takes
          real seconds — deliberately long ones. The board keeps working while
          the app is shut, so the tempo is set by how many slots you have, not
          by how fast you can tap. It does not need babysitting, and it never
          will.</p>

        <h3>Why the window matters</h3>
        <p class="body">Extract can only relate concepts that are
          <b>in context</b> — the ones the model is holding right now. So
          discovering more makes your graph <i>wider</i>, and widening the
          context window is the only thing that makes it <i>denser</i>. The
          window holds your newest concepts plus the paths that reach them, so
          what it holds is always a connected piece of the tree rather than a
          handful of orphans.</p>

        <h3>Attention, and the one way to lose it</h3>
        <p class="body">You start with {ATTENTION_BASE} slots and gain one
          for every <b>ten times</b> more statements you have confirmed. It is
          meant to be slow — four or five more slots across a whole game, not
          four in a coffee break.</p>
        <p class="body">It goes the other way too, and this is the only thing in
          the game that takes a slot away: while you are carrying more than
          {ATTENTION_PENALTY_FLOOR} <i>unconfirmed</i> statements, you lose a
          slot for every ten times more of them. Nothing is spent and nothing
          goes negative — confirm the backlog and the slot comes straight back.
          The gap between <i>checked</i> and <i>statements</i> at the top of the
          screen is that backlog.</p>

        <h3>Why anything decays</h3>
        <p class="body">A proposal nobody looks at rots off the board, and the
          statement behind it goes with it. Machines you buy will extract far
          faster than you can, and every edge they draw arrives unchecked.
          <b>Watching</b> a machine costs a slot of attention and keeps it
          honest; leaving it unwatched is free and is how <i>agreeing</i>
          starts to fall.</p>

        <h3>What you are aiming at</h3>
        <p class="body">{CONCEPT_BUDGET} concepts exist in this slice of the
          source. Recovering them all is the long game; the near one is simply
          to keep <i>checked</i> climbing while the machines get faster. At
          {REFLECT_MIN_CONCEPTS} recovered you can <b>Retrain</b> — start a new
          generation on your own output, which is faster and drifts further
          from the truth. Doing that is a decision, not a reward.</p>

        <p class="body dim">⟨cold open — owner⟩</p>

      {:else}
        <p class="body">The game uses the real vocabulary of knowledge graphs,
          because the real vocabulary is the thing worth learning. Definitions
          here match the theory; sources are in the project glossary.</p>

        <dl class="terms">
          <dt>Concept <em>(synset)</em></dt>
          <dd>One meaning, not one word. <i>Race</i> the genetic group and
            <i>race</i> the contest are two different concepts that happen to
            share a spelling. Each dot on the board is one of them, labelled
            with its most familiar word.</dd>

          <dt>Node</dt>
          <dd>A concept as it sits on the graph — the dot. Discovering places a
            node; it stays dark until an edge supports it.</dd>

          <dt>Edge</dt>
          <dd>A link between two nodes, and the reason the board is a graph
            rather than a list. One edge is one statement. Drawn
            <b>dotted</b> while it is only proposed, solid once confirmed —
            the dots are a rendering of doubt, not a different kind of thing.</dd>

          <dt>Statement <em>(triple)</em></dt>
          <dd>Subject, relation, object: <i>race — is a — group</i>. The atom
            of every knowledge graph on earth, and the thing the big number at
            the top counts.</dd>

          <dt>is a <em>(hypernym)</em></dt>
          <dd>The relation that says one concept is a kind of another. It is
            what the noun taxonomy is built from, and it is why the board
            reaches back to <i>entity</i>: every noun in the source is, eventually,
            a kind of entity.</dd>

          <dt>Category <em>(lexicographer file)</em></dt>
          <dd>The <i>noun.group</i> or <i>noun.artifact</i> beside a concept's
            name. The source's own editorial filing system — a rough shelf, not
            a claim about what the thing fundamentally is.</dd>

          <dt>Context window</dt>
          <dd>How many concepts the model holds at once. Borrowed from language
            models on purpose: it is the same limit, and it bites the same way.
            Extract sees only what is inside it.</dd>

          <dt>Provenance</dt>
          <dd>Where a statement came from and who verified it. Tracking it is
            the entire difference between a knowledge graph and a pile of
            confident text. <i>checked</i> and <i>agreeing</i> are both readings
            of it.</dd>

          <dt>Drift</dt>
          <dd>What happens to meaning when a system learns from its own output
            instead of from the world. Real, named, and measured — it is why
            this game exists and what the title refers to.</dd>
        </dl>

        <h3>The numbers on the HUD</h3>
        <table class="ref"><tbody>
          <tr><td><b>recovered</b></td><td>concepts with at least one edge on them, of {CONCEPT_BUDGET}</td></tr>
          <tr><td><b>context</b></td><td>concepts held at once, of the window you have earned</td></tr>
          <tr><td><b>checked</b></td><td>statements confirmed, of every statement minted</td></tr>
          <tr><td><b>agreeing</b></td><td>edges that match the source, of every edge drawn</td></tr>
          <tr><td><b>attention</b></td><td>slots free, of slots you have</td></tr>
        </tbody></table>

        <p class="body">Concepts, definitions and relations are real: Open
          English WordNet, unaltered.</p>
      {/if}

      <div class="sheet-foot">
        <button onclick={() => (sheet = null)}>back</button>
      </div>
    </div>

  {:else if sheet === 'save'}
    <div class="sheet">
      <h2>Save</h2>
      <!-- The build stamp. "Is the thing on my phone the thing I just
           deployed?" was unanswerable, and a whole session went into chasing
           bugs that had already been fixed on the server. This is the short
           commit sha in CI and "dev" locally. Save version sits beside it
           because a stale app and an unmigrated save look identical from the
           outside and are fixed completely differently. -->
      <p class="stamp">build {__BUILD_ID__} · save v{$game.saveVersion}</p>
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
  /* The inspect card. Bottom-anchored and NON-modal: it sits over the board
     without covering the dock, so reading a definition never costs a turn and
     never hides the buttons. `pointer-events` stays on — it has a close button
     — but it is the only overlay in the stage that does. */
  .card {
    position: absolute; z-index: 4;
    left: 10px; right: 10px; bottom: 10px;
    display: flex; gap: 10px; align-items: flex-start;
    padding: 10px 12px;
    background: #080b11f2; border: 1px solid #1b2533; border-radius: 10px;
    color: #cfe0e8; font: 400 14px/1.35 ui-sans-serif, system-ui, sans-serif;
  }
  /* The header ran together as "racenoun.group" — `<b>` and `<em>` are both
     inline and nothing separated them. The label is the answer to "what did I
     just tap", so it gets its own line and the category sits under it. */
  .card .txt { flex: 1 1 auto; min-width: 0; }
  .card .txt b { display: block; color: #eaf6f2; font-size: 1.05rem; }
  .card .txt em {
    display: block; margin-top: 1px;
    color: #5d7385; font-size: 12px; font-style: normal; letter-spacing: 0.02em;
  }
  .card .txt p { margin: 6px 0 0; }
  .card button {
    flex: 0 0 auto; width: 28px; height: 28px; padding: 0;
    background: none; border: 1px solid #1b2533; border-radius: 6px;
    color: #5d7385; font-size: 15px; line-height: 1;
  }

  /* THE CONTEXT WINDOW. A ring, not a fill: the concepts are the content and
     this is the boundary they live inside. It brightens as it fills and goes
     amber when full, so the disabled Discover button has a visible cause. */
  .window {
    position: absolute; left: 50%; top: 50%; z-index: 0; pointer-events: none;
    width: var(--d); height: var(--d);
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 1px solid hsl(var(--hue) 45% 45% / calc(0.10 + var(--fill) * 0.30));
    box-shadow: 0 0 0 1px hsl(var(--hue) 45% 40% / 0.05) inset;
    transition: border-color 400ms linear;
  }
  /* Out of context. Dimmed, never deleted — VISION locks "nothing you chose is
     ever taken away", and this is the difference between forgetting something
     and losing it. */
  .node.cold { opacity: 0.34; }
  .node.cold span { opacity: 0.5; }

  .window.full { border-color: hsl(42 75% 60% / 0.55); border-style: dashed; }

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

  /* The rung-1 fork. Deliberately quiet chrome, not a headline act: it is a
     standing preference you flip, so it should read like a setting you own
     rather than a decision the game is nagging you about. */
  .source { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 6px; }
  .source button {
    padding: 4px 10px; border-radius: 999px; cursor: pointer;
    font: 0.66rem ui-sans-serif, system-ui, sans-serif;
    background: none; border: 1px solid #1b2533; color: #5d7385;
  }
  .source button.on {
    border-color: hsl(var(--hue) 50% 45%); color: hsl(var(--hue) 60% 62%);
    background: hsl(var(--hue) 40% 10%);
  }
  .source i { font: 0.58rem ui-monospace, monospace; color: #5d7385; font-style: normal; }

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
    background: #080b11; overflow-y: auto;
    padding: max(16px, env(safe-area-inset-top)) 14px calc(16px + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 10px;
    color: #cfe0e8; font: 400 14px/1.35 ui-sans-serif, system-ui, sans-serif;
  }
  .sheet h3 {
    margin: 6px 0 0; font-size: 0.72rem; letter-spacing: 0.08em;
    text-transform: uppercase; color: #5d7385; font-weight: 600;
  }
  .ref { width: 100%; border-collapse: collapse; font-size: 0.76rem; }
  .ref th {
    text-align: left; font-weight: 400; font-size: 0.62rem; color: #5d7385;
    padding: 0 8px 2px 0;
  }
  .ref td { padding: 3px 8px 3px 0; color: #93a8b8; vertical-align: top; }
  .ref td b { color: #cfe0e8; font-weight: 600; white-space: nowrap; }

  /* Two pages of manual, switched in place. A tab strip rather than one long
     scroll: the glossary is looked up mid-game, not read once. */
  .tabs { display: flex; gap: 6px; }
  .tabs button {
    flex: 1; padding: 7px 0;
    background: none; border: 1px solid #1b2533; border-radius: 8px;
    color: #5d7385; font: inherit; font-size: 0.78rem;
  }
  .tabs button.on { border-color: #2b6c7d; color: #8fdcea; }

  .terms { margin: 0; font-size: 0.82rem; }
  .terms dt {
    margin-top: 10px; color: #cfe0e8; font-weight: 600;
  }
  .terms dt:first-child { margin-top: 0; }
  .terms dt em { color: #5d7385; font-style: normal; font-weight: 400; }
  .terms dd { margin: 2px 0 0; color: #93a8b8; line-height: 1.4; }
  .terms dd i, .body i { color: #b9cbd8; font-style: italic; }
  .terms dd b, .body b { color: #cfe0e8; font-weight: 600; }
  .body.dim { color: #3f5163; font-size: 0.78rem; }

  .stamp { margin: 0; font: 0.62rem ui-monospace, monospace; color: #5d7385; }
  .sheet h2 { margin: 0; font-size: 1rem; color: #eaf6f2; }
  .sheet .body { margin: 0; color: #93a8b8; }
  .sheet-foot { display: flex; gap: 10px; margin-top: auto; padding-top: 12px; }
  .sheet-foot.col { flex-direction: column; }
  .sheet-foot button {
    flex: 1 1 auto; padding: 13px; border-radius: 12px; cursor: pointer; font: inherit;
    background: #10151d; border: 1px solid #2f3d4e; color: #cfe0e8;
  }
  .sheet-foot button.bad { border-color: #b0566b; color: #b0566b; }
  /* A locked choice reads as a door, not as an error: dimmed and quiet, with
     the words it wants underneath. `:disabled` alone rendered it the same grey
     as a spent button, which says "broken" rather than "not yet". */
  .sheet-foot button.locked {
    border-style: dashed; border-color: #26333f; color: #5d7385;
  }
  .sheet-foot button.locked span { color: #6f8ba0; font-style: italic; }
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
