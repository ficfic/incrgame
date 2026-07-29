<script lang="ts">
  // THE SCREEN. A narrator, a graph, and the controls that exist yet.
  //
  // ---- WHAT CHANGED, AND WHY IT REVERSES THE FILE THIS REPLACES ----------
  //
  // The owner played the deployed build and could not play it:
  //
  //   "the onboarding and initial stuff must be super super smooth… we must
  //    have like 2 options… maybe we shouldnt show unavailable options… i
  //    think we wont be able to do it without english narrator or something,
  //    its incredibly confusing right now, i dont understand whats happening
  //    at all… im missing some pop ups above the graph when something happens
  //    or resource is mined… i dont understand what ANY of the buttons do, i
  //    just randomly clicked around until i got to a stop… we should not say
  //    total words at the top… i cannot find prestige button… and what is
  //    lost on prestige anyways? whats the point of it?"
  //
  // DECISIONS 2026-07-28/29 settle every one of those, and this file is where
  // they reach a pixel:
  //
  //   ★ THE INTERFACE SPEAKS ENGLISH. The narrator, the buttons, the readouts,
  //     the notifications and the manual. The foreign language is only ever the
  //     GRAPH'S: concept names, the beat's own prose, the node labels, a locked
  //     lane's key. The player is learning the GRAPH, never the UI.
  //
  //     This REVERSES "there must be nothing even in GUI" (same owner,
  //     2026-07-27), on the evidence of them playing it. It is also the split
  //     No Man's Sky actually uses — your interface and your log are in your
  //     language, the alien thing is alien. So every `chrome()` /
  //     `chromeHtml()` call this file used to make is gone; `seg()` survives,
  //     for the beat, and `label()` is the new one: a BUTTON keeps its English
  //     carrier and masks only the concept inside it.
  //
  //   ★ NEVER RENDER A CONTROL THAT CANNOT BE USED. Not greyed — absent. The
  //     predicate is `shows(state, control)` in src/core/reveal.ts and it is
  //     asked, never re-derived here. A condition written into markup is a
  //     condition no test can reach.
  //
  //   ★ TWO LANES AT THE OPENING. `offered(state)` (src/core/starmap.ts), not
  //     `lanes(state)` — which returns EIGHTY-FIVE on a fresh save, which is
  //     what the owner played. `lanes()` is still the reducer's gate; this is
  //     display, so nothing hidden here is a lane the engine forgets.
  //
  //   ★ FLOATERS. Asked for by name. Every whole unit of a readout that
  //     arrives or leaves rises off the board and fades, in English, in that
  //     readout's own colour. They are the only thing on the screen that says
  //     "this is happening NOW" rather than "this is the number".
  //
  //   ★ `N / 4075` IS OFF THE TOP. It was the first and largest thing on
  //     screen, and it counted toward a horizon nobody reaches, on a game whose
  //     point is that completion is not the point.
  //
  // ---- WHAT DID NOT CHANGE ------------------------------------------------
  //
  //   ★ EVERY PLAYER-FACING QUANTITY COMES THROUGH src/core/readouts.ts.
  //     Nothing in here reads the save's `solid` / `raw` / `rot` fields or
  //     counts `held` and gives the answer a name. `scripts/check-vocabulary.mjs`
  //     fails the build on it.
  //
  //   Rates, prices and machine counts are not readouts and never were
  //   (ECONOMY_SRR §3). They come from the engine's own exports —
  //   `potentialPerSecond`, `vocabularySupport`, `stepCost`, `machineCost` —
  //   which are single definitions in exactly the same way.
  import { onMount } from 'svelte';
  import type Decimal from 'break_eternity.js';
  import {
    awayReport, dispatch, exportSave, flushProject, game, importSave,
    resetNotice, startGame,
  } from '../shell/game';
  import {
    checkTake, RETRAIN_MIN_WORDS, WATCHED_RATE, WORDS_PER_FACT,
    bottleneck, canBuy, canCheck, canRetrain, canWalk, factMachines,
    initialState, machineCost, potentialPerSecond, rawPerSecond, solidPerSecond,
    stepCost, vocabularySupport,
  } from '../core/engine';
  import { READOUTS } from '../core/readouts';
  import type { ReadoutId } from '../core/readouts';
  import { D, formatWhole } from '../core/numbers';
  import { MACHINES } from '../content/machines';
  import { FACT_MACHINES, MACHINE_IDS, REL_NAMES, WATCHED_MACHINES } from '../core/types';
  import type { GameState, MachineId, WatchedMachineId } from '../core/types';
  import type { Lane, LaneState } from '../core/starmap';
  import { closed, currentBeat, offered } from '../core/starmap';
  import { events, narrate, narrateStance, stance } from '../core/narration';
  import type { Stance } from '../core/narration';
  import { shows } from '../core/reveal';
  import { retrainExchange } from '../core/retrain';
  import { BEAT_AT } from '../content/story';
  import { beatConcepts, maskedText, renderMasked } from '../core/masking';
  import type { Segment } from '../core/masking';
  import { graphWord } from '../content/lexicon';
  import { bound, canRead, knownWords } from '../core/literacy';
  import {
    conceptAt, conceptForNode, loadManifest, ontologyCredit, ontologyRevision,
    potentialEdges, warm,
  } from '../shell/ontology';
  import { cameraFor, clampZoom, isRotted, stageHue, toScreen, toWorld } from '../render/board';
  import { detail, dotRadius, weigh } from '../render/detail';
  import { GraphSim } from '../render/sim';
  import { paintGraph } from '../render/paint';

  let canvas = $state<HTMLCanvasElement>();
  let stage = $state<HTMLDivElement>();
  let sheet = $state<null | 'save' | 'help' | 'retrain'>(null);
  let helpTab = $state<'play' | 'terms'>('play');
  let toast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let w = $state(360);
  let h = $state(480);

  const credit = $derived.by(() => { void $ontologyRevision; return ontologyCredit(); });

  // ---- THE FOUR QUANTITIES ------------------------------------------------
  //
  // Every one of these is `READOUTS[id].count($game)`. There is no second piece
  // of arithmetic anywhere in this file, which is the entire point.

  const READOUT_IDS = Object.keys(READOUTS) as ReadoutId[];

  /** SOLID · RAW · ROT — one substance in three states, so ONE OBJECT on
   *  screen: a stacked bar with the nouns and numbers under it. */
  const SUBSTANCE: ReadoutId[] = ['solid', 'raw', 'rot'];

  /** ★ THE RATE BELONGS TO THE NOUN, NOT TO A STRIP OF ITS OWN — it sits
   *  between the stock and its name, `18 / +0.17 / Solid`.
   *
   *  ⚠️ ROT GETS NO RATE, deliberately. `rotPerSecond` returns a SHARE of the
   *  pile, not an amount, so printing it beside `+0.17` — an absolute — under
   *  one heading is exactly the one-word-two-quantities defect readouts.ts
   *  exists to stop. The engine exports an absolute rate for Solid and for Raw
   *  and for nothing else. */
  const RATE: Partial<Record<ReadoutId, (g: GameState) => number>> = {
    solid: solidPerSecond,
    raw: rawPerSecond,
  };

  const cells = $derived.by(() =>
    READOUT_IDS.map((id) => {
      const readout = READOUTS[id];
      const amount = readout.count($game);
      return {
        id, noun: readout.noun, explain: readout.explain, amount,
        rate: RATE[id]?.($game) ?? null,
        n: Math.max(0, amount.toNumber()),
      };
    }));

  /** The readouts with at least ONE WHOLE FACT in them — AND EVERY ONE THAT
   *  EVER HAD.
   *
   *  ⚠️ MEASURED, TWICE. Without the whole-unit threshold the header read
   *  `Raw 0 · Rot 0` for an entire probe run: stocks display as integers with
   *  the remainder accruing underneath, so a state holding 0.4 of a fact is a
   *  readout on screen, not moving, and not actually zero. And without the
   *  LATCH the Solid readout vanished the instant a purchase emptied the purse
   *  — which is immediately after every walk and every buy, i.e. the readout
   *  the player is saving with was gone for the whole run. Zero is the number
   *  they are acting on; it is the ARRIVAL that waits, never the staying. */
  let everShown = $state<ReadoutId[]>([]);
  $effect(() => {
    const arriving = cells
      .filter((row) => row.amount.gte(1) && !everShown.includes(row.id))
      .map((row) => row.id);
    if (arriving.length > 0) everShown = [...everShown, ...arriving];
  });
  const visibleCells = $derived(
    cells.filter((row) => row.amount.gte(1) || everShown.includes(row.id)));

  /** ★ THE BAR DRAWS A SPLIT, SO IT WAITS FOR ONE. One substance state is not a
   *  composition, and a composition bar with one occupied cell can only ever be
   *  read as a full one — measured at 390px, a 100%-full teal rectangle in the
   *  place a progress bar goes, for the whole first hour of a watched run. */
  const substance = $derived.by(() => {
    const rows = cells.filter((row) => SUBSTANCE.includes(row.id));
    const total = rows.reduce((sum, row) => sum + row.n, 0);
    return rows.map((row) => ({ ...row, share: total > 0 ? row.n / total : 0 }));
  });
  const splitToShow = $derived(substance.filter((row) => row.n >= 1).length >= 2);

  /** Rot's share of everything, for the board's colour and for nothing else. It
   *  is NOT a readout: no number on screen reports it, and both of its parts
   *  are already on the bar where the player can see them separately. */
  const trust = $derived.by(() => {
    const total = substance.reduce((sum, row) => sum + row.n, 0);
    const worn = substance.find((row) => row.id === 'rot')?.n ?? 0;
    return total > 0 ? 1 - worn / total : 1;
  });

  const wordsCount = $derived(READOUTS.words.count($game));
  const wordsShown = $derived(everShown.includes('words'));

  // The palette drifts with WORDS — the one thing that only ever goes up, and
  // the thing the whole economy is capped by.
  const hue = $derived(stageHue(wordsCount.toNumber()));

  /** ★ THE GOAL LINE, and it is deliberately the NEAR target. One track filling
   *  toward the one threshold the game actually has, with the threshold printed
   *  on its end — so the Retrain the owner could not find has an on-screen
   *  existence from the first word onward rather than from hour two. */
  const goalShare = $derived(
    Math.max(0, Math.min(1, wordsCount.toNumber() / RETRAIN_MIN_WORDS)));

  // ---- WHICH CONTROLS EXIST YET ------------------------------------------
  //
  // ★ ONE PREDICATE, ASKED. src/core/reveal.ts decides; this file draws. Every
  // one of these only ever goes false → true, so nothing is ever taken away
  // from under a thumb.
  const showMachines = $derived(shows($game, 'machines'));
  const showWatch = $derived(shows($game, 'watch'));
  const showCheck = $derived(shows($game, 'check'));
  const showLocked = $derived(shows($game, 'lockedLanes'));
  const showRetrain = $derived(shows($game, 'retrain'));

  // ---- THE LANE JOIN, IN NUMBERS -----------------------------------------
  //
  //   factsPerSecond = min(1.2 × machines, 0.15 × Words)
  //
  // The narrator says this in words when the cap binds (`capped`). This says it
  // in the two rates, which the narrator structurally cannot: `readouts.ts`
  // owns every number on the screen and the narrator never quotes one. Shown
  // only while the VOCABULARY is the binding side, and never before the machine
  // cards exist — at Words 0 the cap is zero and the sentence would be
  // explaining a ceiling the player has not met.
  const joinBinds = $derived(showMachines && bottleneck($game) === 'words');

  /** "your 30 Extractors" when one kind of fact machine is running, "your 34
   *  machines" when several are. Naming a mixed roster after one of its members
   *  would be false, and this line has to be exactly true. */
  const machineSubject = $derived.by(() => {
    const kinds = FACT_MACHINES.filter((id) => $game.machines[id] > 0);
    if (kinds.length === 1) {
      const id = kinds[0]!;
      const n = $game.machines[id];
      return `${n} ${MACHINES[id].label}${n === 1 ? '' : 's'}`;
    }
    return `${factMachines($game)} machines`;
  });

  const joinSentence = $derived(
    `your ${machineSubject} could file ${potentialPerSecond($game).toFixed(1)}/s`
    + ` — your vocabulary supports ${vocabularySupport($game).toFixed(1)}/s`);

  // ---- THE BOARD ----------------------------------------------------------

  const weights = $derived.by(() => {
    void $ontologyRevision;
    return weigh($game.held, (id) => conceptAt(id)?.parent ?? -1);
  });

  /** Lines between the concepts you hold, straight from the dataset. A picture
   *  of the graph, not an inventory of it, and not a button. */
  const edges = $derived.by(() => {
    void $ontologyRevision;
    return potentialEdges($game.held);
  });

  /** The springs: every concept pulled toward the ancestor it hangs off, plus
   *  every other relation the dataset gives it. */
  const springs = $derived.by(() => {
    const out: Array<{ a: number; b: number }> = [];
    const seen = new Set<string>();
    for (const [id, n] of weights) {
      if (n.parent >= 0) { out.push({ a: id, b: n.parent }); seen.add(`${id}:${n.parent}`); }
    }
    for (const e of edges) {
      const k = `${e.a}:${e.b}`;
      if (!seen.has(k) && !seen.has(`${e.b}:${e.a}`)) { out.push({ a: e.a, b: e.b }); seen.add(k); }
    }
    return out;
  });

  const sim = new GraphSim();
  let simTick = $state(0);

  $effect(() => {
    sim.sync({
      nodes: [...weights.values()].map((n) => ({ id: n.id, weight: n.weight })),
      links: springs,
    });
  });

  // ---- THE VIEW -----------------------------------------------------------
  //
  // Zoom and pan live here and nowhere else. `follow` means the player has not
  // taken control yet, so the board frames itself; the first pinch or drag
  // switches it off and Reset switches it back on.
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  let follow = $state(true);

  const followZoom = $derived.by(() => {
    void simTick;
    let far = 0;
    for (const p of sim.positions().values()) far = Math.max(far, Math.hypot(p.x, p.y));
    return clampZoom(1.06 / Math.max(0.1, far));
  });

  const cam = $derived(follow
    ? cameraFor(w, h, followZoom, 0, 0)
    : cameraFor(w, h, zoom, panX, panY));

  const screenPos = $derived.by(() => {
    void simTick;
    const out = new Map<number, { x: number; y: number }>();
    for (const [id, p] of sim.positions()) out.set(id, toScreen(cam, p));
    return out;
  });

  /** Roughly how wide a concept's name renders, in px. Measuring 240 labels a
   *  frame with `getBoundingClientRect` would force a layout every frame. */
  const labelPx = (id: number, folded: number): number => {
    const label = conceptForNode(id)?.label;
    if (!label) return 40;
    return (label.length + (folded > 0 ? String(folded).length + 2 : 0)) * 5.4 + 6;
  };

  const lod = $derived.by(() => {
    void $ontologyRevision; void simTick;
    return detail(weights, {
      zoom: follow ? followZoom : zoom, screen: screenPos, w, h, labelWidth: labelPx,
    });
  });
  const rolledUp = $derived(lod.rolled);
  const onScreen = $derived(new Set(lod.shown));

  const inView = (p: { x: number; y: number }): boolean =>
    p.x > -80 && p.x < w + 80 && p.y > -40 && p.y < h + 40;

  /** Concepts the player can READ. Not the same as the concepts they HOLD: the
   *  five seed nodes are on the board from the first frame and their words stay
   *  foreign, which is the opening. `bound()` is the one definition of that
   *  rule, and Words is derived from the same call — so the board, the readout
   *  and the inspect card cannot disagree. */
  const knownSet = $derived(new Set(bound($game)));

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
        // ⚠️ A NODE'S LABEL IS ITS WORD, NOT ITS ENGLISH NAME, until the concept
        // is bound. The board once showed `system` / `information` / `language`
        // from the first frame — the five seed concepts, in plain English, on a
        // screen whose entire point is that you cannot read it yet.
        label: lod.labelled.has(id)
          ? (knownSet.has(id) ? (conceptForNode(id)?.label ?? '') : graphWord(id))
            + (folded > 0 ? ` ·${folded}` : '')
          : '',
        bound: knownSet.has(id),
        folded,
        root: id === 0,
        rotted: isRotted(id, trust),
      });
    }
    return out;
  });

  /** Lines worth drawing: both ends survived the level-of-detail pass. */
  const drawnEdges = $derived(edges.filter((e) => onScreen.has(e.a) && onScreen.has(e.b)));

  // ---- PINCH AND PAN ------------------------------------------------------
  //
  //  1. The stage is NOT `position: fixed` and never will be.
  //  2. Gestures are captured on the stage ELEMENT only.
  //  3. If the BROWSER is already zoomed, we let go completely.
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

  /** Did this gesture land on a CONTROL rather than on the board? */
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

  /** How close a finger has to land to count as aiming at a node. */
  const GRAB_PX = 22;
  /** A press that never travels this far (SCREEN px) was a tap, not a drag. */
  const TAP_PX = 8;

  let tapCandidate: { id: number; x: number; y: number } | null = null;

  /** Which concept's card is open. Not a `sheet` — the card is non-modal on
   *  purpose, so reading a definition never stops the game. */
  let inspecting = $state<number | null>(null);

  const inspected = $derived.by(() => {
    void $ontologyRevision;
    return inspecting === null ? null : conceptForNode(inspecting);
  });

  /** ★ ENGLISH FOR A CONCEPT YOU HAVE BOUND, THE GRAPH'S WORD FOR ONE YOU HAVE
   *  NOT. The owner tapped a node and got plain English out of a concept they
   *  had never earned — the five seed concepts are HELD from the first frame
   *  and are not BOUND, and this card read `conceptForNode().label` regardless.
   *  Same set the node labels use (`knownSet`), so the dot and the card it
   *  opens can never say two different things. */
  const inspectBound = $derived(inspecting !== null && knownSet.has(inspecting));

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
    // are always a pinch — you cannot aim a pinch at one node.
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
    const at = centreOf(e.touches);
    travelled(at.x, at.y);
    const box = stage.getBoundingClientRect();

    if (sim.isDragging && at.dist === 0) {
      const world = toWorld(cam, { x: at.x - box.left, y: at.y - box.top });
      sim.dragTo(world.x, world.y);
      grip = at;
      return;
    }
    if (sim.isDragging) sim.release(); // a second finger arrived: it is a pinch now

    if (at.dist > 0 && grip.dist > 0) {
      // Pinch. Keep the point between the fingers pinned: convert it to world
      // BEFORE changing the scale, then move the pan so it lands back under
      // them afterwards.
      const px = { x: grip.x - box.left, y: grip.y - box.top };
      const anchor = toWorld(cameraFor(w, h, zoom, panX, panY), px);
      zoom = clampZoom(zoom * (at.dist / grip.dist));
      const after = toScreen(cameraFor(w, h, zoom, panX, panY), anchor);
      panX += px.x - after.x;
      panY += px.y - after.y;
    }
    panX += at.x - grip.x;
    panY += at.y - grip.y;
    grip = at;
  }

  function onTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      sim.release();
      if (tapCandidate) inspecting = tapCandidate.id;
      tapCandidate = null;
    }
    grip = e.touches.length > 0 ? centreOf(e.touches) : null;
  }

  // Mouse equivalents, so the drag is exercisable without synthesising a touch
  // sequence — and so it works on a desktop at all.
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
    toastTimer = setTimeout(() => (toast = ''), 2600);
  }

  // ══ THE NARRATOR ════════════════════════════════════════════════════════
  //
  // ★ ONE ENGLISH LINE, ALWAYS ON SCREEN, ABOVE THE BOARD. It is the thing that
  // makes this game legible and it is treated as primary, not as chrome.
  //
  // It has two halves and src/core/narration.ts owns both: `events(prev, next)`
  // is what JUST happened, `stance(state)` is what is possible from here. The
  // screen shows the newest event for as long as it is news and falls back to
  // the stance, so the line is never empty.
  //
  // ⚠️ DRIVEN OFF A DIRECT STORE SUBSCRIPTION, NOT OFF `$effect`. Effects are
  // batched to a frame, so two dispatches landing in the same frame — a tap and
  // a tick, which is exactly what a walk is — would collapse and the walk's
  // event would never be seen. `game.subscribe` fires synchronously on every
  // update, which is the same seam `observeTransition` uses.
  //
  // ⚠️ AND NEVER THROUGH `renderMasked`. That is the whole point of the
  // reversal: a narrator you cannot read is the state of affairs it exists to
  // end. It also never explains a foreign word — that ban did not move.

  /** How long an event line holds the screen before the stance takes over. */
  const EVENT_MS = 9000;
  /** A standing line stays put this long even if the stance flips under it.
   *  `raw` and `wait` can cross their thresholds repeatedly while a Checker
   *  works the pile, and a line that rewrites itself twice a second is not a
   *  line anybody reads. */
  const MIN_STANCE_MS = 4000;

  let eventLine = $state('');
  let eventAt = $state(0);
  let standingLine = $state('');
  let standingKey: Stance | '' = '';
  let standingAt = 0;

  /** THE LINE. `lastTick` is the sim's own clock and is read here rather than
   *  `Date.now()` so the fall-back happens on the same clock everything else
   *  moves on — and so this recomputes at 10 Hz without a second timer. */
  const narratorLine = $derived.by(() => {
    const clock = $game.lastTick || Date.now();
    return eventLine && clock - eventAt < EVENT_MS ? eventLine : standingLine;
  });
  const narratorIsEvent = $derived(narratorLine !== '' && narratorLine === eventLine);

  // ══ FLOATERS ════════════════════════════════════════════════════════════
  //
  // Owner: "im missing some pop ups above the graph when something happens or
  // resource is mined". This is that, and it is built out of READOUTS like
  // every other number on the screen — a floater says `+3 Raw` in exactly the
  // word the header uses for the same quantity, because it asks the same table.
  //
  // A WHOLE UNIT, never a fraction: stocks display as integers with the
  // remainder accruing underneath, so a floater on every change would be a
  // stream of `+0`.

  /** Minimum spacing between two floaters for the SAME readout. The delta keeps
   *  accumulating while it waits, so nothing is lost — a fast run says `+7
   *  Solid` once rather than `+1` seven times. */
  const FLOAT_GAP_MS = 1300;
  /** How long one lives. Matches the CSS animation. */
  const FLOAT_LIFE_MS = 2400;

  interface Floater { key: number; text: string; id: ReadoutId; x: number; y: number }
  let floaters = $state<Floater[]>([]);
  let floatKey = 1;
  const lastWhole = new Map<ReadoutId, ReturnType<typeof D>>();
  const lastFloatAt = new Map<ReadoutId, number>();

  function pushFloater(text: string, id: ReadoutId): void {
    const key = floatKey++;
    floaters = [...floaters.slice(-5), {
      key, text, id,
      // ⚠️ SPREAD, AND NOT RANDOMLY ON BOTH AXES. A walk moves three quantities
      // in one frame — a step paid, a word learned, and whatever rotted while
      // you stood there — and three floaters at three random points landed on
      // top of each other and on a node label (screenshotted). X is random so
      // the board does not grow a column; Y walks a fixed ladder of slots, so
      // simultaneous floaters are always a readable stack.
      x: 20 + Math.random() * 58,
      y: 34 + (floatKey % 5) * 9,
    }];
    setTimeout(() => { floaters = floaters.filter((f) => f.key !== key); }, FLOAT_LIFE_MS);
  }

  /** Whole-unit changes since the last floater for each readout. */
  function floatChanges(now: number): void {
    for (const id of READOUT_IDS) {
      const whole = READOUTS[id].count($game).floor();
      const before = lastWhole.get(id);
      if (before === undefined) { lastWhole.set(id, whole); continue; }
      if (whole.eq(before)) continue;
      if (now - (lastFloatAt.get(id) ?? 0) < FLOAT_GAP_MS) continue;
      lastWhole.set(id, whole);
      lastFloatAt.set(id, now);
      const delta = whole.sub(before);
      pushFloater(
        `${delta.gt(0) ? '+' : '−'}${formatWhole(delta.abs().toString())} ${READOUTS[id].noun}`, id);
    }
  }

  /** ⚠️ A LOAD IS NOT A TRANSITION, AND IT LOOKED EXACTLY LIKE ONE. The store
   *  holds `initialState()` until `startGame()` finishes reading IndexedDB, so
   *  the first thing this subscription sees is a diff between a fresh run and a
   *  three-hour-old save. Measured on a seeded save: the screen opened on "The
   *  first fact came in while you stood there" at Words 32, and the floaters
   *  fired the entire back catalogue in one frame.
   *
   *  So everything before the game has settled PRIMES rather than reports: the
   *  standing line is computed from whatever state arrives, the floater
   *  baselines are set to it, and no event is announced. That is also what
   *  `narration.ts` says a cold load should do — "omit the previous state and
   *  the standing line carries, which is the correct opening". Offline progress
   *  lands inside this window too, which is right: the away toast already names
   *  what was banked, and a returning player does not need forty floaters. */
  const COLD_MS = 1500;
  let cold = true;
  let seen: GameState | null = null;

  function prime(cur: GameState): void {
    seen = cur;
    eventLine = '';
    standingKey = stance(cur);
    standingAt = Date.now();
    standingLine = narrateStance(standingKey, cur);
    for (const id of READOUT_IDS) lastWhole.set(id, READOUTS[id].count(cur).floor());
  }

  /** Every state change, in order, with nothing collapsed. See the narrator
   *  block above for why this is a subscription and not an effect. */
  function observe(cur: GameState): void {
    if (cold || seen === null) { prime(cur); return; }
    const was = seen;
    seen = cur;
    if (was === cur) return;
    const now = Date.now();
    const happened = events(was, cur);
    if (happened.length > 0) {
      eventLine = narrate(happened[0]!, cur);
      eventAt = now;
    } else {
      const key = stance(cur);
      if (key !== standingKey && now - standingAt >= MIN_STANCE_MS) {
        standingKey = key;
        standingAt = now;
        standingLine = narrateStance(key, cur);
      }
    }
    floatChanges(now);
  }

  // ---- THE STORY, WHICH IS THE ONLY INCOME UPGRADE ------------------------

  /** The beat the player is standing in. Position is DERIVED from the last
   *  concept in `held` — see `currentBeat` — so nothing extra is stored. */
  const beat = $derived.by(() => { void $ontologyRevision; return currentBeat($game); });

  // ⚠️ THE FRAME IS THE TEXT, AND IT IS FILLED IN src/content/story.ts. 396 of
  // 446 beats and 4,622 of 4,716 choices ship with no authored prose; the
  // carrier sentence behind each of them is filled at expand time. Do NOT add a
  // second fallback here — the same string has to reach the renderer AND
  // `literacy.exposure()`, which counts carrier words off the beat.

  /** label → node id, built from the concepts THIS BEAT declares. Never a
   *  global lemma index: "set", "thing" and "state" are concepts and ordinary
   *  English both, and a global table masks the wrong words. */
  const beatTable = $derived.by(() => {
    void $ontologyRevision;
    return beat
      ? beatConcepts(beat, (id) => conceptAt(id)?.label ?? null)
      : new Map<string, number>();
  });

  /** The carrier words the player has met often enough to read — derived from
   *  the beats they have stood in, so literacy needs no save field. */
  const literate = $derived(knownWords($game));

  const esc = (t: string): string =>
    t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] ?? c));

  /** Segments to HTML. A word the player cannot read is marked so it can be
   *  styled as the graph's tongue; everything else is escaped and verbatim. */
  const html = (parts: Segment[]): string =>
    parts.map((p) => (p.masked ? `<em class="glyph">${esc(p.text)}</em>`
      : p.concept !== undefined ? `<b class="bound">${esc(p.text)}</b>` : esc(p.text))).join('');

  /** ★ THE BEAT — the graph's own prose, and the one surface still fully in the
   *  graph's language. Carrier words are masked here on the frequency rule, so
   *  it becomes readable one word at a time. That is the game. */
  const seg = (text: string): string => html(
    renderMasked(text, beatTable, knownSet, graphWord, (word) => canRead(literate, word)));

  /** ★ A BUTTON — English carrier, foreign CONCEPT.
   *
   *  This is the reversal in one function. `Follow ⟦x⟧ down` used to render as
   *  five foreign words, so the strip was six identical unreadable rectangles
   *  and the owner "randomly clicked around". Omitting the `canRead` argument
   *  leaves every carrier word English (masking.ts) and masks only the ⟦span⟧,
   *  which is the concept name — the thing that is meant to be earned. */
  const label = (text: string, table: Map<string, number>): string =>
    html(renderMasked(text, table, knownSet, graphWord));

  const labelPlain = (text: string, table: Map<string, number>): string =>
    maskedText(renderMasked(text, table, knownSet, graphWord));

  /** ⚠️ A LAST RESORT ONLY. 4,622 of 4,716 choices have no written label and
   *  `story.ts` fills each from its FRAME at expand time, which is where the
   *  four movement verbs live. This only fires for a frame with no label at
   *  all, and shows the destination so the button is never blank. */
  function choiceLabel(c: { label: string; toLabel: string }): string {
    return c.label.trim() ? c.label : `Follow ⟦${c.toLabel}⟧ down`;
  }

  interface LaneRow {
    key: string;
    to: number;
    state: LaneState;
    missing: number[];
    label: string;
    plain: string;
    terminal: boolean;
    cost: string;
    takeable: boolean;
  }

  /** ★ THE LANES THE BOARD OFFERS — `offered()`, not `lanes()`.
   *
   *  Two at the opening, widening by one per six Words to the six that were
   *  already the level-of-detail cap. The `+N more ways on` button is GONE with
   *  it: a counted remainder was the honest answer to truncation, and it is the
   *  wrong answer to a width curve — one tap put all 370 back.
   *
   *  ⚠️ WHERE A LABEL COMES FROM, MEASURED. A lane out of the concept you are
   *  STANDING ON is always one of the current beat's own choices — 10,963 of
   *  them over a simulated run, zero misses — so it keeps its authored frame
   *  text. `offered()` also surfaces lanes out of concepts held earlier once the
   *  strip is wider than the beat is; those are in no beat (10,682 of 11,182)
   *  and take the branch frame's own verb, `Cross to …`, which is what a
   *  lateral move off the current lane is. */
  const laneRows = $derived.by((): LaneRow[] => {
    void $ontologyRevision;
    const here = beat?.at ?? -1;
    const owned = new Map((beat?.choices ?? []).map((c) => [c.to, c]));
    const draw = (lane: Lane): LaneRow => {
      const choice = lane.from === here ? owned.get(lane.to) : undefined;
      const text = choice ? choiceLabel(choice) : `Cross to ⟦${lane.toLabel}⟧`;
      const table = choice ? beatTable : new Map([[lane.toLabel, lane.to]]);
      return {
        key: lane.id,
        to: lane.to,
        state: lane.state,
        missing: lane.missing,
        label: label(text, table),
        plain: labelPlain(text, table),
        // ★ A LANE WHOSE FAR END HAS NO BEAT OF ITS OWN. Beats exist only for
        // the 446 concepts that have children, so most lanes lead to a leaf.
        // Arriving is a real place, but the two are the SAME PRICE and until
        // you have paid you cannot tell which one you are buying.
        terminal: !BEAT_AT.has(lane.to),
        cost: stepCost($game, lane.to),
        takeable: lane.state === 'dotted' && canWalk($game, lane.to),
      };
    };
    // Doors after offers, always. `closed()` is empty until Words 30 and is
    // never counted among the takeable options.
    return [...offered($game).map(draw), ...(showLocked ? closed($game).map(draw) : [])];
  });

  function walk(c: LaneRow): void {
    // ⚠️ NOT `disabled`. A disabled button swallows the tap and returns nothing
    // at all — three players tapped a dead lane repeatedly and reported no
    // visual response of any kind. `aria-disabled` keeps the semantics and lets
    // the tap answer, in English, like everything else on the screen.
    if (c.state === 'locked') {
      say(`Held shut by ${c.missing.map(graphWord).join(' · ')}`);
      return;
    }
    if (c.state === 'solid') { say('Already yours. Nothing to travel to.'); return; }
    if (!canWalk($game, c.to)) {
      say(`${formatWhole(c.cost)} ${READOUTS.solid.noun} — ${READOUTS.solid.explain}`);
      return;
    }
    dispatch({ type: 'walk', to: c.to });
  }

  // ---- THE MACHINES -------------------------------------------------------
  //
  // A card per machine, with a count on it and — once there is a roster — one
  // toggle. That toggle is the whole of speed versus truth: watched runs at
  // 0.55× and everything it makes arrives Solid; loose runs at full speed and
  // everything it makes arrives Raw.
  //
  // ⚠️ A CARD YOU DO NOT OWN APPEARS WHEN IT IS NEARLY AFFORDABLE. A price you
  // cannot pay for an hour is not information. A price you can nearly pay is
  // the genre's oldest and clearest goal line — see reveal.ts on the difference
  // between a wait and a wall.
  const REVEAL_AT = 0.6;

  /** The roster a run opens with, read from the engine rather than typed. */
  const OPENING = initialState().machines;

  const machineCards = $derived.by(() => {
    if (!showMachines) return [];
    const purse = READOUTS.solid.count($game);
    return MACHINE_IDS
      .map((id) => {
        const cost = machineCost($game, id);
        return {
          id,
          label: MACHINES[id].label,
          owned: $game.machines[id],
          cost,
          afford: canBuy($game, id),
          // The Reasoner is exempt (types.ts): sound by construction, so no
          // toggle rather than a toggle that changes nothing.
          watchable: (WATCHED_MACHINES as MachineId[]).includes(id),
          shown: $game.machines[id] > 0 || purse.gte(D(cost).mul(REVEAL_AT)),
        };
      })
      .filter((m) => m.shown);
  });

  const isWatched = (id: MachineId): boolean => $game.watched[id as WatchedMachineId] === true;

  function toggleWatch(id: MachineId): void {
    const fid = id as WatchedMachineId;
    dispatch({ type: 'setWatched', id: fid, watched: !$game.watched[fid] });
  }

  function check(): void {
    // The control exists the moment a loose machine is about to make Raw
    // (reveal.ts), which is one tick before there IS any. An honest sentence
    // beats a button that swallows the tap.
    if (!canCheck($game)) { say('Nothing unread on the pile.'); return; }
    dispatch({ type: 'check' });
  }

  // ---- RETRAIN, AND WHAT IT COSTS ----------------------------------------
  //
  // ★ THE PREVIEW RUNS THE REAL THING. `retrainExchange` calls `retrained()` —
  // the function the reducer itself calls — and reads both sides through
  // READOUTS, so the table below cannot drift from the action it describes.
  //
  // The owner asked two questions and this answers both: the button appears the
  // moment it works (reveal.ts), and it opens a sheet stating what carries,
  // what does not, and what the exchange BUYS — the step price restarting,
  // which was the one number nowhere on the screen.
  const exchange = $derived(retrainExchange($game));

  /** What happens to one quantity, in a word. `carries` on the row is
   *  after ≥ before, which is right for Words and wrong for Raw — the
   *  inheritance ARRIVES, it is not a saving, and calling that "keeps" would be
   *  the screen flattering the exchange. */
  const fate = (before: Decimal, after: Decimal): string =>
    before.eq(after) ? 'keeps' : before.gt(after) ? 'goes' : 'arrives';

  function confirmRetrain(): void {
    dispatch({ type: 'retrain' });
    sheet = null;
  }

  $effect(() => {
    warm($game.held);
  });

  // One loop: step the simulation and repaint the lines. Node pills are
  // Svelte's job — they re-render from `nodes`.
  $effect(() => {
    let raf = 0;
    const frame = (t: number): void => {
      // step the simulation first, so the canvas and the DOM read the same
      // positions this frame
      if (sim.step()) simTick++;
      if (canvas && w > 0 && h > 0) {
        paintGraph(canvas, {
          state: $game, w, h, timeMs: t, hue, dotted: drawnEdges, pos: screenPos, cam,
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // The stage measures itself. No viewport arithmetic and no constants tuned to
  // one phone — CSS decides how big the graph area is and this just reads it.
  onMount(() => {
    void startGame();
    void loadManifest();
    const unsubscribe = game.subscribe(observe);
    // The save lands asynchronously; until it has, every transition is a load
    // and not a move. See `prime`.
    const settle = setTimeout(() => { cold = false; }, COLD_MS);
    const stop = (): void => { clearTimeout(settle); unsubscribe(); };
    if (!stage) return stop;
    const ro = new ResizeObserver(() => {
      if (!stage) return;
      w = stage.clientWidth;
      h = stage.clientHeight;
    });
    ro.observe(stage);
    w = stage.clientWidth;
    h = stage.clientHeight;
    return () => { ro.disconnect(); stop(); };
  });

  // Nothing rots while you are away, so this is only ever good news — and it
  // names WHICH of the two arrived, because that is exactly the decision the
  // toggle made for you while the app was shut.
  $effect(() => {
    const r = $awayReport;
    if (r && r.elapsedMs > 0) {
      const parts: string[] = [];
      if (Number(r.solid) > 0) parts.push(`${formatWhole(r.solid)} ${READOUTS.solid.noun}`);
      if (Number(r.raw) > 0) parts.push(`${formatWhole(r.raw)} ${READOUTS.raw.noun}`);
      say(`Away ${Math.round(r.elapsedMs / 60000)} min · ${parts.join(' · ') || 'nothing banked'}`);
      awayReport.set(null);
    }
  });

  /** A SAVE THAT COULD NOT BE CARRIED FORWARD IS ANNOUNCED. Saves are breakable
   *  (DECISIONS 2026-07-27) but a reset the player is not told about is still a
   *  defect (CLAUDE.md), and this is the only place that fact reaches a screen. */
  $effect(() => {
    const notice = $resetNotice;
    if (notice) {
      say(notice);
      resetNotice.set('');
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
  <!-- ⚠️ STICKY, AND THAT IS THE WHOLE REASON ANY OF THIS IS EVER SEEN. The
       document is taller than a phone the moment the dock has a beat in it, and
       a player who scrolls to reach a tap target scrolls the header off the
       top. The narrator is inside it, because a line that explains the game and
       is above the fold explains nothing. -->
  <header class="hud">
    <!-- ★ THE NARRATOR. English, always present, and the first thing on screen.
         One line from src/core/narration.ts: what just happened for as long as
         it is news, then what is possible from here. It is the thing that makes
         this game legible, so it is not chrome and is not styled like it. -->
    <p class="narrator" class:fresh={narratorIsEvent}>{narratorLine}</p>

    {#if visibleCells.length > 0}
      <!-- ★ NUMBERS FIRST, BAR UNDER THEM, AND NO DENOMINATOR ANYWHERE. Owner:
           "we should not say total words at the top". `N / 4075` was the first
           and largest object on the screen and it counted toward a horizon
           nobody reaches. A readout joins this row at one whole unit and never
           leaves again — zero is the number the player is acting on. -->
      <div class="stats">
        {#each visibleCells as row (row.id)}
          <div class="readout" title={row.explain}>
            <b class={row.id}>{formatWhole(row.amount.toString())}</b>
            <!-- ★ WHAT IT IS DOING RIGHT NOW, UNDER THE NUMBER IT IS DOING IT
                 TO. Every decision in this game is a rate comparison, and a
                 player who watches every machine could not see one of them.
                 Never hidden, because `+0.00` IS the plateau. -->
            {#if row.rate !== null}<i class="rate {row.id}">+{row.rate.toFixed(2)}</i>{/if}
            <span>{row.noun}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- ★ THE GOAL LINE. The Retrain gate, on the screen from the first word
         instead of from hour two — "i cannot find prestige button" has two
         halves and this is the one that answers it BEFORE the button exists. A
         track and the threshold at the end of it; no verb, no caption. -->
    {#if wordsShown}
      <div class="goalline" class:reached={canRetrain($game)}
           role="img" aria-label="{wordsCount.floor().toString()} of {RETRAIN_MIN_WORDS} Words">
        <div class="track"><div class="fill" style="width:{goalShare * 100}%"></div></div>
        <b>{RETRAIN_MIN_WORDS}</b>
      </div>
    {/if}

    <!-- ONE STACKED BAR. Solid, Raw and Rot are one substance in three states,
         so they get ONE OBJECT and not three counters: everything that leaves
         one arrives in another. It waits for a second state to exist. -->
    {#if splitToShow}
      <div class="bar" role="img"
           aria-label={substance.map((row) => `${row.noun} ${formatWhole(row.amount.toString())}`).join(', ')}>
        {#each substance as row (row.id)}
          <div class="seg {row.id}" class:empty={row.n <= 0} style="flex-grow:{row.share}"></div>
        {/each}
      </div>
    {/if}

    <!-- THE JOIN, IN THE TWO RATES. The narrator says this in words when the
         cap binds; it cannot say it in numbers, because readouts.ts owns every
         number on the screen and the narrator quotes none. -->
    {#if joinBinds}
      <p class="join">{joinSentence}</p>
    {/if}
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
      <button class="reset" onclick={resetView} aria-label="reset view">⤢ fit</button>
    {/if}

    <!-- Size carries WEIGHT (taxonomic generality), set as a CSS variable so the
         box stays square and centred on its coordinate no matter what. -->
    {#each nodes as n (n.id)}
      <div class="node" class:root={n.root} class:rotted={n.rotted} class:unbound={!n.bound}
           class:holding={n.folded > 0}
           style="transform:translate({n.x}px,{n.y}px) translate(-50%,-50%);--r:{n.r}px">
        {#if n.label}<span>{n.label}</span>{/if}
      </div>
    {/each}

    <!-- ★ FLOATERS. Asked for by name: "im missing some pop ups above the graph
         when something happens or resource is mined". Every whole unit that
         arrives or leaves, named in the header's own word for it and coloured
         to match the number it came off. -->
    <div class="floaters" aria-hidden="true">
      {#each floaters as f (f.key)}
        <span class="floater {f.id}" style="left:{f.x}%;top:{f.y}%">{f.text}</span>
      {/each}
    </div>

    <!-- ★ TAP A CONCEPT. ENGLISH FOR ONE YOU HAVE BOUND, THE GRAPH'S WORD FOR
         ONE YOU HAVE NOT — the owner tapped a node and got plain English out of
         a concept they had never earned. The gloss is WordNet's own, verbatim
         (CC BY 4.0, credited below): it is DATA, not prose, and it is the
         REWARD for reaching a concept rather than a legend for one you have
         not. -->
    {#if inspecting !== null}
      <aside class="card">
        <div class="txt">
          {#if inspectBound && inspected}
            <b>{inspected.label}</b><em>{inspected.category}</em>
            <p>{inspected.gloss}</p>
          {:else}
            <b class="glyph">{graphWord(inspecting)}</b>
            <p class="unread">Not read. The definition is filed, and it is not yours.</p>
          {/if}
        </div>
        <button aria-label="close" onclick={() => (inspecting = null)}>×</button>
      </aside>
    {/if}
  </div>

  <footer class="dock">
    <!-- THE BEAT — the graph's own prose, and the last surface still written in
         the graph's language. ⟦spans⟧ resolve to the English label where the
         concept is bound and to the graph's word where it is not; the carrier
         words around them come in one at a time on frequency. The narrator
         above the board is what tells the player what is happening; this is
         what they are reading their way into. -->
    {#if beat}
      <div class="beat">
        <h3>{@html seg(beat.title)}</h3>
        <p>{@html seg(beat.body)}</p>
      </div>
      <div class="lanes">
        {#each laneRows as c (c.key)}
          <button class="lane {c.state}" class:poor={c.state === 'dotted' && !c.takeable}
            class:terminal={c.terminal}
            aria-disabled={c.state !== 'dotted'}
            aria-label={c.plain}
            onclick={() => walk(c)}>
            <b>{@html c.label}</b>
            <!-- ★ THE PRICE IS ON THE BUTTON FROM THE FIRST FRAME, in English,
                 so the opening move is not a blind spend. A locked lane shows
                 its KEY instead, in the graph's word — an absent edge teaches
                 nobody, and a door whose key is a word you can see the shape of
                 is the reason to come back. -->
            <span>{@html c.state === 'locked'
              ? `held by <em class="glyph">${esc(c.missing.map((id: number) => graphWord(id)).join(' '))}</em>`
              : c.state === 'solid' ? 'yours already'
              : `${esc(formatWhole(c.cost))} ${READOUTS.solid.noun}`}</span>
          </button>
        {/each}
      </div>
    {/if}

    <div class="actions">
      <!-- CHECK. No cooldown, no booking, no queue: there is unread work or
           there is not, and looking at it is instant. It converts a share per
           tap against production that grows with every machine and every Word,
           so it falls behind by construction — a min-max lever for a player who
           feels like tapping, never an attention tax. Absent entirely until
           there is something for it to act on (reveal.ts). -->
      {#if showCheck}
        <button class="act" onclick={check}>
          <b>Check</b>
          <span>{formatWhole(checkTake($game))} {READOUTS.raw.noun} → {READOUTS.solid.noun}</span>
        </button>
      {/if}

      <!-- ★ RETRAIN. "i cannot find prestige button… and what is lost on
           prestige anyways? whats the point of it?"
           It appears the MOMENT it can be taken (reveal.ts) and not before — a
           Retrain button at Words 3 is one more thing that refuses you — and it
           opens the exchange rather than firing, because a prestige button
           whose terms are not stated is asking the player to destroy their run
           on trust. The goal line above has been pointing at it since the first
           word.
           ⚠️ NO GENERATION NUMBER. `generation` is a real save field with NO
           readout behind it, so printing it would invent a word and
           `check:vocab` fails the build on it. Generation is a badge. -->
      {#if showRetrain}
        <button class="act prestige" onclick={() => (sheet = 'retrain')}>
          <b>Retrain</b>
          <span>keeps your {READOUTS.words.noun}</span>
        </button>
      {/if}
    </div>

    <!-- THE MACHINES. Count on the card, price on the buy button, and — once
         there is a roster rather than the appliance you were issued — one
         toggle. Both gated on reveal.ts, so neither arrives on a screen where
         it would do nothing. -->
    {#if machineCards.length > 0}
      <div class="machines">
        {#each machineCards as m (m.id)}
          <div class="mach">
            <b>{m.label}<i>×{m.owned}</i></b>
            <button class="buy" disabled={!m.afford}
              onclick={() => dispatch({ type: 'buy', id: m.id })}>
              {formatWhole(m.cost)} {READOUTS.solid.noun}
            </button>
            {#if m.watchable && showWatch}
              <!-- SPEED VERSUS TRUTH, AND IT IS ONE TAP. Watched: 55% of the
                   rate, and everything it makes arrives Solid. Loose: full
                   speed, and everything it makes arrives Raw — which rots. -->
              <button class="watch" class:on={isWatched(m.id)}
                onclick={() => toggleWatch(m.id)}>
                {#if isWatched(m.id)}
                  watched · ×{WATCHED_RATE} → {READOUTS.solid.noun}
                {:else}
                  loose · full speed → {READOUTS.raw.noun}
                {/if}
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="menu">
      <button class="more" aria-label="menu" onclick={() => (sheet = 'save')}>⋯</button>
    </div>
  </footer>

  {#if sheet === 'retrain'}
    <!-- ---- THE EXCHANGE -------------------------------------------------
         ★ EVERY ROW IS THE ACTUAL AFTER-STATE. `retrainExchange` runs
         `retrained()`, the function the reducer calls, and reads both sides
         through READOUTS — so this cannot drift from what the button does, and
         it quotes the exchange in exactly the words the header uses. -->
    <div class="sheet">
      <h2>Retrain</h2>
      <p class="body">The next generation trains on what you already hold. Your
        words and your machines carry over. The checked work and the record of
        the wear do not, and a share of everything the machines filed comes back
        unread.</p>

      <table class="ref exchange"><tbody>
        <tr><th>quantity</th><th>now</th><th>after</th><th></th></tr>
        {#each exchange.rows as row (row.id)}
          <tr>
            <td><b>{row.noun}</b><i>{row.explain}</i></td>
            <td class="num">{formatWhole(row.before.toString())}</td>
            <td class="num">{formatWhole(row.after.toString())}</td>
            <td class="fate {fate(row.before, row.after)}">{fate(row.before, row.after)}</td>
          </tr>
        {/each}
        <!-- ★ THE ANSWER TO "WHATS THE POINT OF IT?", AND IT WAS NOWHERE ON THE
             SCREEN. Words carry, so the ceiling stays where you left it, while
             the step price restarts at the bottom: everywhere you have already
             been is a fraction of the price to cross again. -->
        <tr class="step">
          <td><b>Next step</b><i>price of the next concept</i></td>
          <td class="num">{formatWhole(exchange.stepBefore.toString())}</td>
          <td class="num">{formatWhole(exchange.stepAfter.toString())}</td>
          <td class="fate goes">restarts</td>
        </tr>
      </tbody></table>

      <p class="body dim">Nothing you have walked to is deleted. The board you
        can see is the board you keep.</p>

      <div class="sheet-foot">
        <button class="bad" onclick={confirmRetrain}>Retrain</button>
        <button onclick={() => (sheet = 'save')}>Back</button>
      </div>
    </div>

  {:else if sheet === 'help'}
    <!-- ---- THE MANUAL --------------------------------------------------
         ★ EVERY NUMBER AND EVERY NOUN HERE IS READ FROM THE ENGINE AND FROM
         readouts.ts, never typed in. A help page that drifts from the code is
         worse than no help page: it teaches a wrong game with authority.

         ★ AND IT IS IN ENGLISH NOW, LIKE THE REST OF THE INTERFACE. It used to
         print the four nouns masked, to match a HUD that was also masked; both
         halves of that are reversed (DECISIONS 2026-07-29).

         ★ THE GLOSSARY IS THEORY-FAITHFUL. Definitions match docs/GLOSSARY.md,
         which cites its sources. This is an educational game; getting
         `hypernym` subtly wrong here is a worse bug than a broken button. -->
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
          there. Almost none of them have been checked by a human. That last
          part is your whole job.</p>

        <p class="body">The graph does not speak your language. The interface
          does. Every concept name you can read is one you walked to.</p>

        <h3>Four quantities</h3>
        <table class="ref"><tbody>
          <tr><th>word</th><th>what it is</th></tr>
          {#each READOUT_IDS as id (id)}
            <tr><td><b>{READOUTS[id].noun}</b></td><td>{READOUTS[id].explain}</td></tr>
          {/each}
        </tbody></table>
        <p class="body">{READOUTS.solid.noun}, {READOUTS.raw.noun} and
          {READOUTS.rot.noun} are one substance in three states, which is why
          they are one bar and not three counters. Everything that leaves one
          arrives in another.</p>

        <h3>The rule that ties the two halves together</h3>
        <p class="body">Machines can only relate concepts you actually hold, so
          what they produce is capped by your vocabulary: every
          {READOUTS.words.noun} supports {WORDS_PER_FACT} facts a second, and
          the only way to gain one is to walk the story.
          <b>Walking is what raises the ceiling.</b> Build as many machines as
          you like — past the cap they idle, and the line under the numbers says
          so in both rates.</p>

        <h3>The four things you do</h3>
        <table class="ref"><tbody>
          <tr><th>verb</th><th>costs</th><th>gives</th></tr>
          <tr><td><b>Walk</b></td>
              <td>{READOUTS.solid.noun}, rising with each new concept this run</td>
              <td>a concept, and a word you can read</td></tr>
          <tr><td><b>Check</b></td><td>a tap</td>
              <td>{formatWhole(checkTake($game))} {READOUTS.raw.noun} → {READOUTS.solid.noun}</td></tr>
          <tr><td><b>Buy</b></td><td>{READOUTS.solid.noun}</td>
              <td>a machine, from the roster below</td></tr>
          <tr><td><b>Retrain</b></td><td>the run</td>
              <td>a new generation, at {RETRAIN_MIN_WORDS} {READOUTS.words.noun}</td></tr>
        </tbody></table>

        <h3>The machines, and the only real decision</h3>
        <table class="ref"><tbody>
          <tr><th>machine</th><th>rate</th><th>from</th></tr>
          {#each MACHINE_IDS as id (id)}
            <tr><td><b>{MACHINES[id].label}</b></td>
                <!-- The Checker makes nothing: its number is the SHARE of the
                     unchecked pile it works through each second, not facts per
                     second, and printing the two in one column under one
                     heading is the one-word-two-quantities defect. -->
                <td>{MACHINES[id].rate
                      ? `${MACHINES[id].rate}/s`
                      : `${((MACHINES[id].checks ?? 0) * 100).toFixed(1)}%/s`}</td>
                <td>{formatWhole(MACHINES[id].baseCost)} {READOUTS.solid.noun}</td></tr>
          {/each}
        </tbody></table>
        <p class="body">A machine that makes facts is either <b>watched</b> —
          {WATCHED_RATE}× the rate, and everything it makes arrives
          {READOUTS.solid.noun} — or <b>loose</b>, at full speed, where
          everything it makes arrives {READOUTS.raw.noun}, and
          {READOUTS.raw.noun} wears out on its own. That trade is the whole game
          and it is one tap per machine. The {MACHINES.checker.label} buys the
          reviewing out: it makes nothing, converts {READOUTS.raw.noun} by
          itself, and keeps doing it while the app is shut. Nothing here ever
          needs babysitting.</p>

        <h3>Why anything decays</h3>
        <p class="body">{READOUTS.raw.noun} is machine output nobody looked at,
          and it wears out at a rate set by how much of this generation descends
          from machine output rather than from real data. Every Retrain raises
          that. Nothing rots while you are away — absence banks work, it never
          does damage.</p>

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
            with its most familiar word — once you hold it.</dd>

          <dt>Edge</dt>
          <dd>A link between two concepts, and the reason the board is a graph
            rather than a list. Every line you can see is a relation the source
            actually records between two concepts you hold.</dd>

          <dt>Statement <em>(triple)</em></dt>
          <dd>Subject, relation, object: <i>race — is a — group</i>. The atom of
            every knowledge graph on earth, and the thing the bar is made of.</dd>

          <dt>is a <em>(hypernym)</em></dt>
          <dd>The relation that says one concept is a kind of another. It is
            what the noun taxonomy is built from, and it is why the board
            reaches back to one concept at the top: every noun in the source is,
            eventually, a kind of it.</dd>

          <dt>Category <em>(lexicographer file)</em></dt>
          <dd>The <i>noun.group</i> or <i>noun.artifact</i> beside a concept's
            name. The source's own editorial filing system — a rough shelf, not
            a claim about what the thing fundamentally is.</dd>

          <dt>Provenance</dt>
          <dd>Where a statement came from and who verified it. Tracking it is
            the entire difference between a knowledge graph and a pile of
            confident text. {READOUTS.solid.noun} and {READOUTS.raw.noun} are
            the two readings of it.</dd>

          <dt>Subsumption reasoning</dt>
          <dd>Deriving what must be true from what you already hold: if a dog is
            a canine and a canine is a carnivore, a dog is a carnivore. The
            {MACHINES.reasoner.label} does this, which is why its output needs
            no checking and why it is expensive.</dd>

          <dt>Drift</dt>
          <dd>What happens to meaning when a system learns from its own output
            instead of from the world. Real, named, and measured — it is why
            this game exists and what the title refers to.</dd>
        </dl>

        <h3>The relations on the board</h3>
        <table class="ref"><tbody>
          {#each REL_NAMES as name, i (name)}
            <tr><td><b>{name}</b></td><td>relation {i}</td></tr>
          {/each}
        </tbody></table>

        <p class="body">Concepts, definitions and relations are real: Open
          English WordNet, unaltered.</p>
      {/if}

      <div class="sheet-foot">
        <button onclick={() => (sheet = 'save')}>back</button>
      </div>
    </div>

  {:else if sheet === 'save'}
    <div class="sheet">
      <h2>Save</h2>
      <!-- The build stamp. "Is the thing on my phone the thing I just
           deployed?" was unanswerable, and a whole session went into chasing
           bugs already fixed on the server. Save version sits beside it because
           a stale app and a rebuilt save look identical from the outside and
           are fixed completely differently. -->
      <p class="stamp">build {__BUILD_ID__} · save v{$game.version}</p>
      <!-- ⚠️ FLUSH IS NOT IN THE THUMB STACK. It shipped full-width and 8px
           above `back`, on a phone, on a panel headed "Save" — two identical
           targets, one of which wipes the run. -->
      <button class="bad flush" onclick={() => saveAction('flush')}>Flush project</button>
      <div class="sheet-foot col">
        <button onclick={() => (sheet = 'help')}>How to play</button>
        <button onclick={() => saveAction('export')}>Export save</button>
        <button onclick={() => saveAction('import')}>Import save</button>
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
     which is precisely the trap the owner hit. */
  .app {
    position: relative;
    display: flex; flex-direction: column;
    /* MIN-height, not height: zoom persists per-site on iOS, and a fixed-height
       column cannot reflow. */
    min-height: 100dvh;
    justify-content: space-between;
    color: #cfe0e8;
    font: 400 14px/1.3 ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    box-sizing: border-box;
  }

  /* ---- header: the narrator, then the numbers ---- */
  .hud {
    flex: 0 0 auto; text-align: center; padding: 6px 10px 4px;
    position: sticky; top: 0; z-index: 4;
    /* Opaque, or the board scrolls through the numbers — measured: a node label
       ghosted straight through the bar. */
    background: #080b11;
    box-shadow: 0 10px 12px -10px #080b11, 0 1px 0 #10161f;
  }

  /* ══ THE NARRATOR ══════════════════════════════════════════════════════
     PRIMARY, not chrome. It is bigger than the beat, brighter than the
     readouts, and it is the first object on the screen — because it is the one
     thing on it that is written to be understood on the first read.
     `min-height` holds three lines so the board below does not jump every time
     the line changes length. */
  .narrator {
    margin: 2px auto 8px; max-width: 32em; min-height: 3.6em;
    text-align: left; text-wrap: pretty;
    font-size: 0.92rem; line-height: 1.45; color: #dbe9f2;
    padding-left: 10px; border-left: 2px solid #1b2533;
    transition: border-color 400ms linear, color 400ms linear;
  }
  /* Something just happened. The accent is the only thing that moves — a line
     that slides or flashes is a line you read the animation of. */
  .narrator.fresh {
    color: #f2f8fb;
    border-left-color: hsl(var(--hue) 70% 55%);
  }

  .readout { display: flex; flex-direction: column; min-width: 0; }
  .readout b { font-size: 1.05rem; font-weight: 700; color: #eaf6f2; }
  .readout span { font-size: 0.62rem; color: #5d7385; white-space: nowrap; }

  /* ══ THE GOAL LINE ═════════════════════════════════════════════════════
     The Retrain gate, on screen from the first word instead of from hour two.
     A track and the threshold at the end of it — no verb, no caption. Thin on
     purpose: it is a horizon, not a readout. */
  .goalline {
    display: flex; align-items: center; gap: 7px;
    max-width: 20em; margin: 6px auto 0;
  }
  .goalline .track {
    flex: 1 1 auto; height: 3px; border-radius: 2px;
    background: #182231; overflow: hidden;
  }
  .goalline .fill {
    height: 100%; border-radius: 2px;
    background: hsl(var(--hue) 55% 45%);
    transition: width 500ms linear;
  }
  .goalline b {
    font: 400 0.58rem ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #46586a; letter-spacing: 0.03em;
  }
  /* Arrived. The track stays — a goal that deletes itself on completion is the
     defect this element exists to fix — and says so instead. */
  .goalline.reached .fill { background: hsl(var(--hue) 80% 62%); }
  .goalline.reached b { color: hsl(var(--hue) 70% 66%); }

  /* ══ THE STACKED BAR ═══════════════════════════════════════════════════
     Solid, Raw and Rot are ONE SUBSTANCE IN THREE STATES, so they are one
     object. Segments are flex-grown by share, so the bar always fills and never
     needs a maximum — the substance has no ceiling, only proportions. */
  .bar {
    display: flex; gap: 3px; height: 6px;
    max-width: 20em; margin: 6px auto 0;
    border-radius: 3px; overflow: hidden; background: #10151d;
  }
  .seg { min-width: 3px; border-radius: 5px; transition: flex-grow 300ms linear; }
  .seg.solid { background: hsl(var(--hue) 70% 55%); }
  .seg.raw { background: hsl(42 70% 52%); }
  .seg.rot { background: #b0566b; }
  /* A state with nothing in it yet is an empty track, not an absence. */
  .seg.empty { flex: 0 0 15px; background: #182231; }
  .stats { display: flex; justify-content: center; gap: 20px; }
  .stats b.words { color: #eaf6f2; }
  .stats b.solid { color: hsl(var(--hue) 70% 58%); }
  .stats b.raw { color: hsl(42 75% 60%); }
  .stats b.rot { color: #b0566b; }

  /* THE RATE, inside the readout it belongs to and above that readout's noun.
     Monospace so the digits do not jitter as they tick. */
  .rate {
    font: 400 0.64rem/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
    font-style: normal;
  }
  .rate.solid { color: hsl(var(--hue) 50% 48%); }
  .rate.raw { color: hsl(42 45% 48%); }

  /* The join, in the two rates. Quiet — it is an explanation, not an alarm. */
  .join {
    margin: 6px auto 0; max-width: 30em; padding: 4px 10px;
    border-radius: 8px; background: #10151d; border: 1px solid #1b2533;
    font: 0.62rem ui-monospace, SFMono-Regular, Menlo, monospace;
    color: hsl(42 45% 58%); line-height: 1.35;
  }

  /* ---- stage: the graph ---- */
  .stage {
    flex: 1 1 auto; position: relative; overflow: hidden;
    /* The graph is a CIRCLE, so its useful size is bounded by the narrower
       dimension; height past the stage's own width just pools as empty space. */
    min-height: min(42vh, 88vw);
    max-height: min(60vh, 100vw);
  }
  /* Only while WE own the gesture. When the browser is zoomed this reverts to
     `auto`, handing every touch straight back. */
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
     DEPENDS ON ITS TEXT. Text hangs off the box with `position: absolute`, so
     it can never move the thing it labels.
     `scripts/check-alignment.mjs` asserts this against a real browser.
     ═══════════════════════════════════════════════════════════════════════ */
  .node {
    position: absolute; left: 0; top: 0; will-change: transform;
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
  .node.rotted { background: #b0566b; }
  /* absolutely positioned, so it cannot influence where the dot sits */
  .node span {
    position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
    margin-top: 3px; font-size: 0.62rem; white-space: nowrap;
    color: hsl(var(--hue) 40% 68%); text-shadow: 0 1px 3px #080b11, 0 0 6px #080b11;
  }
  .node.root span { font-weight: 700; font-size: 0.76rem; color: hsl(var(--hue) 80% 84%); }
  /* A node whose word you cannot read yet, in the same hand as the prose. */
  .node.unbound span { font-family: ui-monospace, monospace; color: #c9a227; }

  /* ══ FLOATERS ══════════════════════════════════════════════════════════
     Above the graph, rising and fading. `pointer-events: none` on the layer,
     because the board underneath is draggable and a floater must never eat a
     gesture. Coloured to the readout the number came off, so the eye connects
     the pop-up to the counter in the header without a word of legend. */
  .floaters { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
  .floater {
    position: absolute; transform: translate(-50%, -50%);
    font: 700 0.8rem ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: nowrap;
    text-shadow: 0 1px 4px #080b11, 0 0 8px #080b11;
    animation: rise 2.4s ease-out forwards;
  }
  .floater.words { color: #eaf6f2; }
  .floater.solid { color: hsl(var(--hue) 70% 62%); }
  .floater.raw { color: hsl(42 78% 62%); }
  .floater.rot { color: #c9697e; }
  @keyframes rise {
    0% { opacity: 0; transform: translate(-50%, -30%) scale(0.9); }
    14% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    70% { opacity: 1; }
    100% { opacity: 0; transform: translate(-50%, -170%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .floater { animation: fade 2.4s linear forwards; }
    @keyframes fade { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
  }

  /* The inspect card. Bottom-anchored and NON-modal: reading a definition never
     stops the simulation and never hides the dock. */
  .card {
    position: absolute; z-index: 4;
    left: 10px; right: 10px; bottom: 10px;
    display: flex; gap: 10px; align-items: flex-start;
    padding: 10px 12px;
    background: #080b11f2; border: 1px solid #1b2533; border-radius: 10px;
    color: #cfe0e8; font: 400 14px/1.35 ui-sans-serif, system-ui, sans-serif;
  }
  .card .txt { flex: 1 1 auto; min-width: 0; }
  .card .txt b { display: block; color: #eaf6f2; font-size: 1.05rem; }
  /* A concept you have not bound: its word, in the graph's own hand. */
  .card .txt b.glyph {
    font-family: ui-monospace, monospace; color: #c9a227; letter-spacing: 0.02em;
  }
  .card .txt em {
    display: block; margin-top: 1px;
    color: #5d7385; font-size: 12px; font-style: normal; letter-spacing: 0.02em;
  }
  .card .txt p { margin: 6px 0 0; }
  .card .txt p.unread { color: #5d7385; font-size: 0.82rem; }
  .card button {
    flex: 0 0 auto; width: 28px; height: 28px; padding: 0;
    background: none; border: 1px solid #1b2533; border-radius: 6px;
    color: #5d7385; font-size: 15px; line-height: 1;
  }

  /* ---- dock ---- */
  .dock { flex: 0 0 auto; padding: 4px 8px 6px; }
  /* clear of the mobile browser's bottom chrome, which was cutting the credit */
  .credit { padding-bottom: calc(6px + env(safe-area-inset-bottom)); }

  /* The beat: the graph's prose, so it gets room to be read and a measure that
     does not run the full width of a phone. Quieter than the narrator on
     purpose — one of them is what is happening, the other is what you are
     reading your way into. */
  .beat { max-width: 34em; margin: 0 auto 6px; text-align: left; }
  .beat h3 {
    margin: 0 0 4px; font-size: 0.7rem; letter-spacing: 0.09em;
    text-transform: uppercase; color: #5d7385; font-weight: 600;
  }
  .beat p { margin: 0; color: #93a8b8; font-size: 0.82rem; line-height: 1.45; }
  /* A word you cannot read yet, in the graph's own tongue. Monospace and
     letter-spaced so the SHARED PREFIX is scannable — `ka-sa-le` and
     `ka-sa-le-then` have to look like kin at a glance, which is the whole
     mechanic and the reason these are never truncated. */
  .app :global(.glyph) {
    font-family: ui-monospace, monospace; font-style: normal;
    color: #c9a227; letter-spacing: 0.02em;
  }
  /* A word you have bound to English. */
  .beat :global(.bound), .lane :global(.bound) { color: #eaf6f2; font-weight: 600; }

  /* ---- THE LANES: never more than the board offers --------------------- */
  .lanes { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  /* ══ AFFORDANCE, THE RIGHT WAY ROUND ═══════════════════════════════════
     IT SHIPPED INVERTED: `.lane :global(.bound)` paints a word you have earned
     white and bold, so the lanes that go nowhere rendered as the largest,
     brightest objects on the screen while the one live lane sat in a dim dashed
     outline. All three players tapped the dead ones first. The thumb goes to
     the brightest thing; that has to be the thing that moves. */
  .lane {
    flex: 1 1 auto; min-width: 96px; max-width: 46%;
    padding: 6px 9px; border-radius: 10px;
    background: none; border: 1px solid #2b6c7d; color: #8fdcea;
    font: inherit; text-align: left; cursor: pointer;
  }
  .lane b { display: block; font-size: 0.79rem; font-weight: 600; line-height: 1.25; }
  .lane span { display: block; font: 0.6rem ui-monospace, monospace; color: #5d7385; }

  /* DOTTED — ungated, the far end is dark, and it MOVES you. The loudest thing
     in the strip, because it is the offer. */
  .lane.dotted {
    border-style: dashed; border-width: 2px;
    border-color: hsl(var(--hue) 70% 56%); color: hsl(var(--hue) 85% 80%);
    background: hsl(var(--hue) 52% 15%);
  }
  .lane.dotted b { font-weight: 700; }
  .lane.dotted span { color: hsl(var(--hue) 55% 66%); }
  /* ★ A LANE THAT STOPS. Its far end has no beat — beats exist only for the 446
     concepts that have children — so walking it costs full price and leaves you
     standing in the beat you were already in. Legal, and it looked exactly like
     the game breaking. NOT hidden and NOT captioned: it gives up the fill, the
     weight and the border that the offer keeps. */
  .lane.dotted.terminal {
    border-style: dotted; border-width: 1px;
    border-color: hsl(var(--hue) 22% 26%); background: none;
    color: hsl(var(--hue) 32% 54%);
  }
  .lane.dotted.terminal b { font-weight: 500; }
  .lane.dotted.terminal span { color: #46586a; }
  .lane.dotted.terminal :global(.glyph) { color: hsl(45 45% 44%); }
  /* Dimmed while you cannot pay for it, but still LIVE: tapping it quotes the
     price rather than doing nothing. */
  .lane.poor { opacity: 0.45; }
  /* SOLID — a route on your own map, and not a route at all. `offered()` no
     longer hands these out, so this is the fallback case only: a board that has
     nothing else to give. */
  .lane.solid {
    border-color: transparent; background: none; color: #5b7482;
    opacity: 0.45; cursor: default;
  }
  /* LOCKED — visible, not takeable, key shown in the graph's word. An absent
     edge teaches nobody; a door with a lock on it is the reason to come back.
     Never on the first screen — see reveal.ts. */
  .lane.locked {
    border-style: dashed; border-color: #26333f; color: #48607a;
    background: none; cursor: default;
  }
  .lane.locked b { letter-spacing: 0.06em; }
  /* ⚠️ THE WHITE MUST NOT REACH A LANE THAT IS NOT AN OFFER. Without this a
     held destination outshouts the lane you can take, because being readable is
     what `.bound` styles. */
  .lane.solid :global(.bound), .lane.locked :global(.bound) {
    color: inherit; font-weight: 500;
  }
  /* Not-takeable lanes answer a tap with a toast instead of a disabled swallow;
     the press state is the acknowledgement that the tap was seen at all. */
  .lane[aria-disabled='true']:active { transform: translateY(1px); }

  /* ---- verbs ---- */
  .actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }
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
  /* ★ FINDABLE. It arrives once, hours in, and it is the largest decision in
     the game — so it does not look like Check. */
  .act.prestige {
    border-color: #d08a3f; color: #f0c07a; background: #2a1c0d;
    box-shadow: 0 0 14px #d08a3f33;
  }

  /* ---- machine cards: count, price, and ONE toggle ---- */
  .machines {
    display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 8px;
  }
  .mach {
    display: flex; flex-direction: column; align-items: stretch; gap: 4px;
    padding: 7px 9px; border-radius: 12px;
    background: hsl(var(--hue) 40% 9%); border: 1px solid #22303d;
    min-width: 118px;
  }
  .mach > b {
    display: flex; justify-content: space-between; gap: 8px;
    font-size: 0.76rem; font-weight: 600; color: #cfe0e8;
  }
  .mach > b i { font-style: normal; color: #5d7385; }
  .mach .buy {
    padding: 6px 8px; border-radius: 8px; cursor: pointer;
    font: 600 0.66rem ui-monospace, monospace;
    background: hsl(var(--hue) 40% 12%);
    border: 1px solid hsl(var(--hue) 60% 50%); color: hsl(var(--hue) 60% 64%);
  }
  .mach .buy:disabled { background: #10151d; border-color: #2f3d4e; color: #2f3d4e; cursor: default; }
  /* THE TOGGLE. Two states, and the colour carries the whole message: the
     game's Solid colour when watched, its Raw colour when loose. */
  .mach .watch {
    padding: 5px 6px; border-radius: 8px; cursor: pointer;
    font: 0.58rem ui-monospace, monospace;
    background: none; border: 1px dashed hsl(42 55% 40%); color: hsl(42 70% 58%);
  }
  .mach .watch.on {
    border-style: solid; border-color: hsl(var(--hue) 50% 42%);
    color: hsl(var(--hue) 65% 62%);
  }

  .menu { display: flex; justify-content: center; margin-top: 8px; }
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

  /* THE EXCHANGE. Two columns of numbers and one word for the direction, so
     "what is lost" is answerable at a glance rather than by arithmetic. */
  .exchange td i {
    display: block; font-style: normal; font-size: 0.62rem; color: #5d7385;
  }
  .exchange td.num {
    font: 0.8rem ui-monospace, SFMono-Regular, Menlo, monospace;
    color: #cfe0e8; text-align: right; white-space: nowrap;
  }
  .exchange td.fate { font-size: 0.66rem; text-align: right; white-space: nowrap; }
  .exchange td.fate.keeps { color: hsl(var(--hue) 65% 60%); }
  .exchange td.fate.goes { color: #b0566b; }
  .exchange td.fate.arrives { color: hsl(42 70% 58%); }
  .exchange tr.step td { border-top: 1px solid #1b2533; padding-top: 6px; }
  .exchange tr.step td.fate { color: hsl(var(--hue) 65% 60%); }

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
  .terms dt { margin-top: 10px; color: #cfe0e8; font-weight: 600; }
  .terms dt:first-child { margin-top: 0; }
  .terms dt em { color: #5d7385; font-style: normal; font-weight: 400; }
  .terms dd { margin: 2px 0 0; color: #93a8b8; line-height: 1.4; }
  .terms dd i { color: #b9cbd8; font-style: italic; }
  .body b { color: #cfe0e8; font-weight: 600; }
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
  .sheet-foot button.bad { border-color: #b0566b; color: #f0c07a; background: #2a1c0d; }
  /* Away from the thumb stack and away from `back`. See the markup. */
  .flush {
    align-self: flex-start; margin-top: auto; padding: 8px 12px;
    border-radius: 10px; cursor: pointer; font: inherit; font-size: 0.78rem;
    background: none; border: 1px solid #b0566b; color: #b0566b;
  }

  .toast {
    position: absolute; left: 50%; bottom: calc(env(safe-area-inset-bottom) + 96px);
    transform: translateX(-50%); z-index: 6; max-width: 88%;
    background: #111826ee; border: 1px solid #22304a; color: #cfe0e8;
    padding: 8px 14px; border-radius: 10px; font-size: 0.82rem; pointer-events: none;
  }
  .credit {
    flex: 0 0 auto; padding: 3px 8px 2px;
    text-align: center; font-size: 0.5rem; line-height: 1.2; color: #263140;
  }
  .credit a { color: #37485c; }
</style>
