<script lang="ts">
  // THE SCREEN. Two objects: the graph, and one stacked bar.
  //
  // ---- WHY THIS FILE WAS REWRITTEN ---------------------------------------
  //
  // The 11-agent review that produced docs/ECONOMY_SRR.md found the single
  // biggest cause of the confusion the owner reported twice in two days, and it
  // was HERE, not in the model:
  //
  //   "The HUD never calls readouts.ts. The single-source rule is
  //    architecturally present and functionally bypassed — the only READOUTS.
  //    use in src/ui picks a CSS hue."
  //
  // So the rule this file now obeys, and which scripts/check-vocabulary.mjs
  // enforces as a build failure rather than as an intention:
  //
  //   ★ EVERY PLAYER-FACING QUANTITY COMES THROUGH src/core/readouts.ts.
  //     Nothing in here reads the save's `solid` / `raw` / `rot` fields or
  //     counts `held` and gives the answer a name. Four quantities, four
  //     readouts, one place that decides what each is called.
  //
  // Rates, prices and machine counts are not readouts and never were
  // (ECONOMY_SRR §3: "machine counts are inventory on a card"). They come from
  // the engine's own exported functions — `potentialPerSecond`,
  // `vocabularySupport`, `stepCost`, `machineCost` — which are single
  // definitions in exactly the same way. Nothing here computes an economy
  // number itself.
  //
  // ---- THE HUD IS UNLEARNED, NOT ABSENT ----------------------------------
  //
  // Owner: "there must be nothing even in GUI… let player eyeball the graph."
  // At minute zero the screen is the graph, one foreign sentence, and the lanes
  // out of it. No numbers, no nouns, no chrome. The interface then assembles
  // itself as the player earns the thing each piece describes.
  //
  // ⚠️ THE GATE IS NOT `canRead(literate, noun)`, AND HERE IS THE MEASUREMENT.
  // That is the gate this surface WANTS — it is what the beat prose, the lane
  // labels and the node labels all use — but against the shipped corpus it is
  // wrong in BOTH directions for the four economy nouns, so shipping it would
  // be one more gate that reads as enforced and is not, which is the exact
  // defect above:
  //
  //   noun    in docs/graph/language.json?   occurrences across 446 beats
  //   words   yes (`vervu`)                  1     → LEARN_AT is 3, so
  //                                                  canRead is FALSE FOREVER
  //   solid   no                             0     → canRead returns true by
  //   raw     no                             0        default (literacy.ts:84,
  //   rot     no                             0        "nothing to hide it
  //                                                    behind"), so all three
  //                                                    would show at t = 0
  //
  // Gating on `canRead` alone therefore hides Words permanently and shows the
  // whole substance bar on the first frame. So the gate is the honest half of
  // the same idea, and it is still derived from literacy.ts: NOTHING APPEARS
  // UNTIL THE PLAYER HAS BOUND THEIR FIRST WORD (`bound()`, via READOUTS.words),
  // and each readout then waits for its own quantity to exist. Walking is what
  // binds a word, so the HUD is earned by playing rather than granted by
  // loading.
  //
  // When the corpus teaches these four nouns, `hudReady` below becomes
  // `canRead(literate, READOUTS[id].noun)` and nothing else changes. That is a
  // content dependency, not something to paper over.
  import { onMount } from 'svelte';
  import {
    awayReport, dispatch, exportSave, flushProject, game, importSave,
    resetNotice, startGame,
  } from '../shell/game';
  import {
    CHECK_PER_TAP, RETRAIN_MIN_WORDS, WATCHED_RATE, WORDS_PER_FACT,
    bottleneck, canBuy, canCheck, canRetrain, canWalk, factMachines,
    initialState, machineCost, potentialPerSecond, rawPerSecond, solidPerSecond,
    stepCost, vocabularySupport,
  } from '../core/engine';
  import { READOUTS } from '../core/readouts';
  import type { Readout, ReadoutId } from '../core/readouts';
  import { D, formatWhole } from '../core/numbers';
  import { MACHINES } from '../content/machines';
  import { FACT_MACHINES, MACHINE_IDS, REL_NAMES } from '../core/types';
  import type { FactMachineId, MachineId } from '../core/types';
  import type { LaneState } from '../core/starmap';
  import { currentBeat } from '../core/starmap';
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
  import { ticker, TICKER_TTL_MS } from '../shell/ticker';

  let canvas = $state<HTMLCanvasElement>();
  let stage = $state<HTMLDivElement>();
  let sheet = $state<null | 'save' | 'help'>(null);
  let helpTab = $state<'play' | 'terms'>('play');
  let toast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let w = $state(360);
  let h = $state(480);

  const credit = $derived.by(() => { void $ontologyRevision; return ontologyCredit(); });

  // ---- THE FOUR QUANTITIES ------------------------------------------------
  //
  // Every one of these is `READOUTS.<id>.count($game)`. There is no second
  // piece of arithmetic anywhere in this file, which is the entire point.

  /** WORDS, and the only fraction in the game. `of` is a real denominator —
   *  concepts a player could actually reach through gated lanes, measured
   *  against the shipped story graph (content/ontologyMeta.ts), not the size of
   *  the dataset. Every percentage the last economy showed was a ratio between
   *  two quantities the player could not separately see. */
  //
  //  ⚠️ READ THROUGH THE `Readout` INTERFACE, not through the literal's inferred
  //  type. `of` is declared `(s: GameState) => Decimal` and today's denominator
  //  happens to ignore its argument, so the inferred type is zero-arity — call
  //  it that way and the first denominator that actually depends on the save
  //  breaks this file instead of the one that changed.
  const wordsReadout: Readout = READOUTS.words;
  const wordsCount = $derived(wordsReadout.count($game));
  const wordsOf = $derived(wordsReadout.of?.($game) ?? D(0));

  /** SOLID · RAW · ROT — one substance in three states, so ONE OBJECT on
   *  screen: a stacked bar with the nouns and numbers under it. Three separate
   *  counters would say "three systems", which is the lie the six-rung ladder
   *  told. Built by walking READOUTS, so adding a state to the substance is a
   *  change to readouts.ts and to nothing here. */
  const SUBSTANCE = ['solid', 'raw', 'rot'] as const;

  const substance = $derived.by(() => {
    const rows = SUBSTANCE.map((id) => {
      const readout = READOUTS[id];
      const amount = readout.count($game);
      return {
        id, noun: readout.noun, explain: readout.explain, amount,
        // Its NOUN, not its number: whether the player can read the word yet.
        // A row's number is legible from the frame it appears in; its name is
        // earned. See readouts.ts.
        reads: readout.learned($game),
        n: Math.max(0, amount.toNumber()),
      };
    });
    const total = rows.reduce((sum, row) => sum + row.n, 0);
    return rows.map((row) => ({ ...row, share: total > 0 ? row.n / total : 0 }));
  });

  /** The states with at least ONE WHOLE FACT in them.
   *
   *  ⚠️ MEASURED: without this the bar's legend read `Raw 0 · Rot 0` for the
   *  entire probe run. Stocks display as integers and the remainder keeps
   *  accruing underneath (numbers.ts), so a state holding 0.4 of a fact renders
   *  as a readout called Raw whose value is zero — a number that is on screen,
   *  is not moving, and is not actually zero. A state joins the bar when it has
   *  a whole fact in it and not before.
   *
   *  ★ AND ONCE IT HAS A NAME IT NEVER LEAVES AGAIN (`|| row.reads`). Waiting-
   *  to-afford is the modal state of this economy, and gating the ROW on the
   *  stock deleted the Solid readout the instant it hit zero — which is
   *  immediately after every purchase. A player watched the counter they were
   *  saving up vanish as the reward for spending, then reappear minutes later;
   *  the probe's Solid column read `-` for 105 of 120 seconds for this reason.
   *  Hide-while-unlearned is right. Hide-while-empty is a broken screen, and it
   *  is also the one moment the number matters most. `learned` only ever rises
   *  (readouts.ts), so this can never take a word back. */
  const visibleSubstance = $derived(
    substance.filter((row) => row.amount.gte(1) || row.reads));

  /** Rot's share of everything, for the board's colour and for nothing else. It
   *  is NOT a readout: no number on screen reports it, and both of its parts
   *  are already on the bar where the player can see them separately. */
  const trust = $derived.by(() => {
    const total = substance.reduce((sum, row) => sum + row.n, 0);
    const worn = substance.find((row) => row.id === 'rot')?.n ?? 0;
    return total > 0 ? 1 - worn / total : 1;
  });

  // The palette drifts with WORDS — the one thing that only ever goes up, and
  // the thing the whole economy is capped by. It used to drift with a cache of
  // PLACED concepts, dark ones included, so the world changed colour for work
  // the player had not finished.
  const hue = $derived(stageHue(wordsCount.toNumber()));

  /** ★ THE HUD GATE. See the header: nothing until the first word is bound. */
  const hudReady = $derived(wordsCount.gt(0));

  // ---- THE LANE JOIN, IN WORDS -------------------------------------------
  //
  //   factsPerSecond = min(0.4 × machines, 0.15 × Words)
  //
  // This sentence IS the join made visible. Without it an idle-only player
  // watches production stop climbing, has no way to learn why, and reasonably
  // concludes the game is broken — and the join is the entire reason the story
  // and the idle loop are one game rather than two sharing a screen.
  //
  // Shown only while the VOCABULARY is the binding side. When machines bind,
  // buying one obviously helps and a sentence saying so is noise; the ticker
  // already announces the crossing in both directions.
  //
  // ⚠️ AND ONLY ONCE THE PLAYER CAN READ THE NOUN IT IS ABOUT. This sentence is
  // an EXPLANATION — documentation, which the owner asked for in game
  // (DECISIONS 2026-07-27) — so it stays English rather than being masked into
  // a paragraph of the graph's tongue that teaches nobody anything. The price
  // of that is it must not arrive before the word it explains: a sentence about
  // your vocabulary, shown to a player who cannot yet read `Words`, is noise.
  const joinBinds = $derived(
    hudReady && bottleneck($game) === 'words' && READOUTS.words.learned($game));

  /** "your 30 Extractors" when one kind of fact machine is running, "your 34
   *  machines" when several are. Naming a mixed roster after one of its members
   *  would be false, and this line has to be exactly true or it teaches the
   *  wrong rule. */
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
    `your ${machineSubject} could make ${potentialPerSecond($game).toFixed(1)}/s`
    + ` — your vocabulary supports ${vocabularySupport($game).toFixed(1)}/s`);

  // ---- THE BOARD ----------------------------------------------------------
  //
  // Unchanged in kind: d3-force decides where concepts are, the canvas draws
  // the lines and the atmosphere, the DOM draws the dots and their labels. What
  // changed is where the board reads its shape from — `held` is the whole board
  // now, and the anchor ring, the frontier, the folded mass and the stored edge
  // list went with the old save.

  const weights = $derived.by(() => {
    void $ontologyRevision;
    return weigh($game.held, (id) => conceptAt(id)?.parent ?? -1);
  });

  /** Lines between the concepts you hold, straight from the dataset.
   *
   *  ⚠️ NOT STORED, AND NO LONGER TAPPABLE. `Edge` survives as a draw-only
   *  shape (core/types.ts): facts are a mass in three states, not a list of
   *  objects, and `Edge.checked` was one of the four different things the word
   *  "checked" used to mean. A line on the board is now a relation the dataset
   *  records between two concepts you hold — a picture of the graph, not an
   *  inventory of it, and not a button. */
  const edges = $derived.by(() => {
    void $ontologyRevision;
    return potentialEdges($game.held);
  });

  /** The springs: every concept pulled toward the ancestor it hangs off, plus
   *  every other relation the dataset gives it. Clusters are therefore made of
   *  real relationships rather than of drawing order. */
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
  // switches it off and Reset switches it back on. That last part is
  // load-bearing: pinch-zoom inside a page has trapped this game twice, so
  // there is always one tap back to a known-good view.
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
   *  foreign, which is the opening. `bound()` in literacy.ts is the one
   *  definition of that rule, and Words is derived from the same call — so the
   *  board and the readout cannot disagree. */
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
        // from the first frame — the five seed concepts, named in plain
        // English, on a screen whose entire point is that you cannot read it.
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

  /** Lines worth drawing: both ends survived the level-of-detail pass. Drawing
   *  a line to a concept the zoom has folded away is how you get the hairball —
   *  every edge crossing the middle, because both ends were plotted regardless
   *  of whether you could see them. */
  const drawnEdges = $derived(edges.filter((e) => onScreen.has(e.a) && onScreen.has(e.b)));

  // ---- PINCH AND PAN ------------------------------------------------------
  //
  //  1. The stage is NOT `position: fixed` and never will be. That was the
  //     actual trap — a fixed element anchors to the layout viewport, so a
  //     pinched page became a magnified crop with the controls off-screen.
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

  /** Did this gesture land on a CONTROL rather than on the board? Without this,
   *  every tap on a card silently switched auto-framing off and concepts then
   *  drifted off the edges for a reason the player could not connect to what
   *  they had just pressed. */
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

    // Dragging a concept: move it, leave the camera alone. Its neighbours come
    // along on their springs, which is most of what makes the graph feel alive.
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
      // them afterwards. Without this the board slides away as you zoom.
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

  // ---- THE STORY, WHICH IS THE ONLY INCOME UPGRADE ------------------------

  /** The beat the player is standing in. Position is DERIVED from the last
   *  concept in `held` — see `currentBeat` — so nothing extra is stored. */
  const beat = $derived.by(() => { void $ontologyRevision; return currentBeat($game); });

  // ⚠️ THE FRAME IS THE TEXT, AND IT IS FILLED IN src/content/story.ts.
  // 396 of 446 beats and 4,622 of 4,716 choices ship with no authored prose;
  // the carrier sentence behind each of them is filled at expand time, so
  // `beat.title`, `beat.body` and `choice.label` are never empty by the time
  // they reach this file. Do NOT add a second fallback here: the same string
  // has to reach the renderer AND `literacy.exposure()`, which counts carrier
  // words off the beat, and a fill that only happens at the render site teaches
  // the player nothing about the sentence they have read four hundred times.

  /** label → node id, built from the concepts THIS BEAT declares. Never a
   *  global lemma index: "set", "thing" and "state" are concepts and ordinary
   *  English both, and a global table masks the wrong words. */
  const beatTable = $derived.by(() => {
    void $ontologyRevision;
    return beat ? beatConcepts(beat, (id) => conceptAt(id)?.label ?? null) : new Map<string, number>();
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

  /** Render one field's ⟦spans⟧ to HTML. */
  const seg = (text: string): string => html(
    renderMasked(text, beatTable, knownSet, graphWord, (word) => canRead(literate, word)));

  function plain(text: string): string {
    return maskedText(
      renderMasked(text, beatTable, knownSet, graphWord, (word) => canRead(literate, word)));
  }

  // ---- THE INTERFACE SPEAKS THE LANGUAGE TOO ------------------------------
  //
  // Owner: "there must be nothing even in GUI." The beat under the dock has
  // been foreign since 2026-07-27 and the ticker above it since this morning;
  // the HUD between them still read `Words · Solid · Raw · Rot`, in English, on
  // a screen whose whole premise is that nothing is readable yet. One surface
  // in three languages tells the player the foreign parts are decoration.
  //
  // Chrome goes out through EXACTLY the path beat prose goes through —
  // `renderMasked` + `language.json` — with one extra way in. A carrier word is
  // normally learned by FREQUENCY across the beats the player has stood in, and
  // no beat ever says "Solid": frequency alone would hide the HUD forever,
  // which is a wall, not a game. So a chrome string also carries the quantity
  // it is ABOUT, and reads as English once the player has earned that.
  //
  //   readout label      its own quantity          (readouts.ts `learned`)
  //   Check              Raw — you learn the verb by having what it acts on
  //   watched            Solid — the state, and what that state makes
  //   loose · full speed Raw   — likewise
  //   a machine's name   owning one you BOUGHT, not the one you woke with
  //   the lane counter   Words — lanes are what Words are made of
  //
  // ⚠️ NUMBERS ARE NEVER TOUCHED. `translateCarrier` matches letters only, so
  // `3 / 4075`, `×0.55` and a price stay legible from the first frame. A
  // number you can read over a noun you cannot IS the intended experience: you
  // can see that something is counted, and not yet what.
  const NO_SPANS = new Map<string, number>();
  const NO_CONCEPTS = new Set<number>();

  const chromeSegs = (text: string, earned: boolean): Segment[] =>
    renderMasked(text, NO_SPANS, NO_CONCEPTS, graphWord,
      (word) => earned || canRead(literate, word));

  /** An interface string, in whichever language the player has earned. */
  const chrome = (text: string, earned: boolean): string => maskedText(chromeSegs(text, earned));
  const chromeHtml = (text: string, earned: boolean): string => html(chromeSegs(text, earned));

  /** Whether each quantity's own noun can be read. The rule and the reason it
   *  is not `canRead` live in src/core/readouts.ts. */
  /** A quantity's noun, in whichever language the player has earned it in.
   *
   *  ⚠️ FOR THE MANUAL, AND IT IS NOT OPTIONAL THERE. The help sheet printed
   *  `Words · Solid · Raw · Rot` in plain English, two taps from the opening
   *  screen, while the HUD three inches above it read `Voth · Hoth · Nos ·
   *  Nath`. That is worse than either extreme: it hands over four English nouns
   *  that match NOTHING on the screen, so it damages the inference the game is
   *  made of without teaching anything in exchange. The mechanics stay fully
   *  explained — the manual is documentation the owner asked for, not a legend
   *  — but it names the quantities the same way the screen does. */
  const quantity = (id: ReadoutId): string =>
    chromeHtml(READOUTS[id].noun, READOUTS[id].learned($game));

  const readsWords = $derived(READOUTS.words.learned($game));
  const readsSolid = $derived(READOUTS.solid.learned($game));
  const readsRaw = $derived(READOUTS.raw.learned($game));

  /** ⚠️ A LAST RESORT ONLY. 4,622 of 4,716 choices have no written label and
   *  `story.ts` fills each from its FRAME at expand time, which is where the
   *  four movement verbs live: `Follow ⟦…⟧ down` · `Cross to ⟦…⟧` · `Follow the
   *  definition to ⟦…⟧` · `Back up to ⟦…⟧`. That is what keeps the strip from
   *  being the dead button VOICE.md §4 P5 forbids — four kinds of movement,
   *  identically priced, rendered as four identical nouns. This fallback only
   *  fires for a frame with no label at all, and shows the destination so the
   *  button is never blank. */
  function choiceLabel(c: { label: string; toLabel: string }): string {
    return c.label.trim() ? c.label : `⟦${c.toLabel}⟧`;
  }

  /** This beat's choices, each with its lane state and its price.
   *
   *  A SOLID lane is drawn and NOT takeable: it goes somewhere you already
   *  hold, and `walk` on a concept already in `held` changes nothing — a button
   *  that does nothing reads as broken. A LOCKED lane is drawn too, with its
   *  key in the graph's word: an absent edge teaches nobody, and a door with a
   *  lock on it is the reason to come back. */
  const beatChoices = $derived.by(() => {
    if (!beat) return [];
    const rank: Record<LaneState, number> = { dotted: 0, locked: 1, solid: 2 };
    return beat.choices
      .map((choice) => {
        const missing = (choice.requires?.concepts ?? []).filter((id) => !$game.held.includes(id));
        const state: LaneState = missing.length > 0
          ? 'locked' : $game.held.includes(choice.to) ? 'solid' : 'dotted';
        return {
          choice, state, missing,
          // ★ A LANE WHOSE FAR END HAS NO BEAT OF ITS OWN. Beats exist only for
          // the 446 concepts that have children, so most lanes lead to a leaf.
          // `placeAt` now renders those as the leaf they are, so arriving is a
          // real place and no longer a paid-for no-op — but the two are still
          // the SAME PRICE, and until you have paid you cannot tell which one
          // you are buying. One opens a subtree, the other stops; both charge
          // `6 × 1.04^n` and both raise n for every step after.
          terminal: !BEAT_AT.has(choice.to),
          cost: stepCost($game, choice.to),
          takeable: state === 'dotted' && canWalk($game, choice.to),
        };
      })
      // Offers first, then doors, then record. A stable sort, so the strip does
      // not reshuffle under a thumb as Solid ticks past a price.
      //
      // ★ AND WITHIN THE OFFERS: the ways ON before the ways that STOP. The two
      // cost the same and only one of them opens more graph, so the branching
      // route is the first thing under the thumb. Nothing is hidden and nothing
      // is captioned — every lane keeps its place in the strip, its price and
      // its label, and `LANES_SHOWN` still says how many it is holding back.
      .sort((a, b) => rank[a.state] - rank[b.state]
        || Number(a.terminal) - Number(b.terminal));
  });

  /** ⚠️ LEVEL OF DETAIL FOR LANES, AND IT IS NOT COSMETIC.
   *
   *  MEASURED on the shipped story graph: 79 of 446 beats offer more than 12
   *  choices and the worst offers 371. The probe walked into one after 75
   *  seconds and the dock became 371 buttons — hundreds of tap targets under a
   *  phone-sized board, which is not a decision, it is a scroll.
   *
   *  So the strip shows the strongest few and SAYS HOW MANY IT IS HOLDING BACK,
   *  with one tap to see them all. That keeps `starmap.ts`'s rule intact — "an
   *  absent edge tells the player nothing" — because nothing here is absent
   *  without being counted. Hiding them silently is the thing that rule bans. */
  const LANES_SHOWN = 6;
  let lanesExpanded = $state(false);
  // Collapse again when the player moves: an expanded list is about the beat
  // they were standing in, not the one they walked to.
  $effect(() => { void beat?.id; lanesExpanded = false; });
  const shownChoices = $derived(
    lanesExpanded ? beatChoices : beatChoices.slice(0, LANES_SHOWN));

  function walk(c: { choice: { to: number }; state: LaneState; cost: string; missing: number[] }): void {
    // ⚠️ THESE TWO TOASTS WERE UNREACHABLE until the lane stopped being
    // `disabled`, and they are the only feedback a mis-tap gets. Both go out in
    // the language the player has earned, like every other string on the dock —
    // an English toast over a foreign HUD is the one-screen-two-languages
    // defect with a 2.6-second lifetime.
    if (c.state === 'locked') {
      say(`${chrome('held by', readsWords)} ${c.missing.map(graphWord).join(' · ')}`);
      return;
    }
    if (c.state === 'solid') { say(chrome('already yours', readsWords)); return; }
    if (!canWalk($game, c.choice.to)) {
      // The same noun the HUD is showing, in the same language. A toast that
      // says `Solid` beside a bar that says `tuth` is the one-screen-two-
      // languages defect with a 2.6-second lifetime.
      say(`${formatWhole(c.cost)} ${chrome(READOUTS.solid.noun, readsSolid)}`
        + ` · ${chrome(READOUTS.solid.explain, readsSolid)}`);
      return;
    }
    dispatch({ type: 'walk', to: c.choice.to });
  }

  // ---- THE MACHINES -------------------------------------------------------
  //
  // A card per machine, with a count on it and — for the two that MAKE facts —
  // one toggle. That toggle is the whole of speed versus truth: watched runs at
  // 0.55× and everything it makes arrives Solid; loose runs at full speed and
  // everything it makes arrives Raw. It replaced an attention pool, a
  // supervision dial and a booking queue.
  //
  // ⚠️ A CARD APPEARS WHEN IT IS NEARLY AFFORDABLE, never on the opening
  // screen. A shop of English nouns at minute zero is exactly the GUI the owner
  // asked to have removed, and a price you cannot pay for an hour is not
  // information — it is a locked door with no story behind it.
  const REVEAL_AT = 0.6;

  /** The roster a run opens with. A machine you were GIVEN is not one you
   *  bought, and a machine's NAME is earned by buying one — otherwise the
   *  Extractor card would be the one piece of chrome that is never masked, on
   *  the very first screen. Read from the engine rather than typed, so changing
   *  the opening roster cannot quietly hand the player a word. */
  const OPENING = initialState().machines;

  const machineCards = $derived.by(() => {
    if (!hudReady) return [];
    const purse = READOUTS.solid.count($game);
    return MACHINE_IDS
      .map((id) => {
        const cost = machineCost($game, id);
        return {
          id,
          label: MACHINES[id].label,
          owned: $game.machines[id],
          reads: $game.machines[id] > OPENING[id],
          cost,
          afford: canBuy($game, id),
          watchable: (FACT_MACHINES as MachineId[]).includes(id),
          shown: $game.machines[id] > 0 || purse.gte(D(cost).mul(REVEAL_AT)),
        };
      })
      .filter((m) => m.shown);
  });

  const isWatched = (id: MachineId): boolean => $game.watched[id as FactMachineId] === true;

  function toggleWatch(id: MachineId): void {
    const fid = id as FactMachineId;
    dispatch({ type: 'setWatched', id: fid, watched: !$game.watched[fid] });
  }

  // ---- THE TICKER ---------------------------------------------------------
  //
  // The clock is `$game.lastTick`, not `Date.now()`: the store ticks at 10 Hz,
  // so referencing it is what makes this re-evaluate at all. A wall-clock read
  // here would compute once and never update. Lines EXPIRE — a dock that never
  // clears is not a drip, it is a frozen element.
  const liveTicker = $derived.by(() => {
    const clock = $game.lastTick || Date.now();
    return $ticker.filter((l) => clock - l.at < TICKER_TTL_MS).slice(-2);
  });

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

  // Nothing rots while you are away, so this is only ever good news — and it
  // names WHICH of the two arrived, because that is exactly the decision the
  // toggle made for you while the app was shut.
  $effect(() => {
    const r = $awayReport;
    if (r && r.elapsedMs > 0) {
      const parts: string[] = [];
      if (Number(r.solid) > 0) {
        parts.push(`${formatWhole(r.solid)} ${chrome(READOUTS.solid.noun, readsSolid)}`);
      }
      if (Number(r.raw) > 0) parts.push(`${formatWhole(r.raw)} ${chrome(READOUTS.raw.noun, readsRaw)}`);
      say(`away ${Math.round(r.elapsedMs / 60000)} min · ${parts.join(' · ') || 'nothing banked'}`);
      awayReport.set(null);
    }
  });

  /** A SAVE THAT COULD NOT BE CARRIED FORWARD IS ANNOUNCED. Saves are breakable
   *  (DECISIONS 2026-07-27) but a reset the player is not told about is still a
   *  defect (CLAUDE.md), and this is the only place that fact reaches a screen.
   *  Shown once, then cleared. */
  $effect(() => {
    const notice = $resetNotice;
    if (notice) {
      say(notice);
      resetNotice.set('');
    }
  });

  async function saveAction(which: string): Promise<void> {
    if (which === 'export') {
      try { await navigator.clipboard.writeText(exportSave()); say('save copied'); }
      catch { window.prompt('Copy your save:', exportSave()); }
      return;
    }
    if (which === 'import') {
      let blob: string | null = null;
      try { blob = await navigator.clipboard.readText(); } catch { blob = window.prompt('Paste your save:'); }
      if (!blob?.trim()) blob = window.prompt('Paste your save:');
      if (!blob?.trim()) return;
      try { await importSave(blob); say('save imported'); sheet = null; }
      catch { say('not a valid save — nothing changed'); }
      return;
    }
    if (which === 'flush') {
      if (!confirm('Wipe this project and start over?')) return;
      await flushProject();
      sheet = null;
      say('project flushed');
    }
  }
</script>

<div class="app" style="--hue:{hue}">
  <header class="hud">
    <!-- ⚠️ NOTHING HERE UNTIL THE FIRST WORD IS BOUND. See the header comment:
         at minute zero the screen is the graph, one foreign sentence and the
         lanes out of it. The HUD then assembles itself as the player earns the
         thing each part of it describes — Raw's row appears the first time Raw
         exists, Rot's the first time speed costs something. That is what makes
         this a progression track rather than chrome. -->
    {#if hudReady}
      <!-- WORDS, and the only fraction in the game. The denominator is real:
           concepts a player could actually reach through gated lanes, measured
           from the shipped story graph. -->
      <!-- ⚠️ BOTH SIDES PLAIN, NOT `format`ed. This is the one place in the game
           where a number is compared against a fixed, knowable other number,
           and `4.08K` is not a denominator anybody can hold in their head —
           the graft this fraction came from asks for "a real denominator", and
           4,075 rounded to three significant figures is not one. The
           suffixing formatter is right everywhere a stock can reach the
           trillions and wrong here, where the ceiling is four thousand. -->
      <!-- THE NUMBER IS LEGIBLE AND THE NOUN IS NOT, and that is the point:
           `1 / 4075` under a word you cannot read says something is counted
           without saying what. The word arrives at three concepts. -->
      <div class="readout goal" title={chrome(READOUTS.words.explain, readsWords)}>
        <b>{wordsCount.floor().toString()} / {wordsOf.floor().toString()}</b>
        <span>{@html chromeHtml(READOUTS.words.noun, readsWords)}</span>
      </div>

      <!-- ONE STACKED BAR. Solid, Raw and Rot are one substance in three
           states, so they get ONE OBJECT and not three counters: everything
           that leaves one arrives in another. -->
      {#if visibleSubstance.length > 0}
        <div class="bar" role="img"
             aria-label={visibleSubstance
               .map((row) => `${chrome(row.noun, row.reads)} ${formatWhole(row.amount.toString())}`)
               .join(', ')}>
          <!-- ★ ALL THREE SEGMENTS, ALWAYS — the empty ones as a dim stub.
               Drawing only the states that exist meant a player who watches
               every machine (the correct opening) saw a 100%-full teal
               rectangle sitting directly under `3 / 4075`, where it reads as a
               completed progress bar for that fraction. It only became the
               stacked bar it is meant to be once you had made a mistake. Three
               tracks, two of them empty, says "three states" from the first
               frame without a single word of legend. -->
          {#each substance as row (row.id)}
            <div class="seg {row.id}" class:empty={row.n <= 0}
                 style="flex-grow:{row.share}"></div>
          {/each}
        </div>

        <div class="stats">
          {#each visibleSubstance as row (row.id)}
            <div class="readout" title={chrome(row.explain, row.reads)}>
              <b class={row.id}>{formatWhole(row.amount.toString())}</b>
              <span>{@html chromeHtml(row.noun, row.reads)}</span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- ★ WHAT IT IS DOING RIGHT NOW, AND IT WAS NOWHERE ON SCREEN.
           Every decision in this game is a rate comparison — walk for
           +0.15/s of ceiling, buy an Extractor for +0.4/s of potential, flip a
           machine loose to trade 0.55× Solid for 1.0× Raw — and the screen
           showed no rates at all, so none of it could be evaluated. The only
           `/s` in the build was the join sentence, triple-gated to a state a
           player who walks never reaches.
           NUMBERS ONLY, no nouns: they are colour-matched to the two segments
           they belong to, which is how you tell which is which without a word.
           They are also never hidden, because `+0.00 +0.00` IS the plateau —
           the failure this game promises you can see coming.
           Rates are not readouts and never were (ECONOMY_SRR §3): both come
           from the engine's own exported functions, which name them. -->
      <div class="rates">
        <b class="solid">+{solidPerSecond($game).toFixed(2)}</b>
        <b class="raw">+{rawPerSecond($game).toFixed(2)}</b>
      </div>

      <!-- THE JOIN, MADE VISIBLE. `min(0.4 × machines, 0.15 × Words)`: you
           cannot extract relations about entities you do not hold, so walking
           the story is the only income upgrade in the game. An idle-only player
           flatlines in about ten minutes, and this is where they read why. -->
      {#if joinBinds}
        <p class="join">{joinSentence}</p>
      {/if}
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
         box stays square and centred on its coordinate no matter what — see THE
         ONE POSITIONING RULE in the style block. -->
    {#each nodes as n (n.id)}
      <div class="node" class:root={n.root} class:rotted={n.rotted} class:unbound={!n.bound}
           class:holding={n.folded > 0}
           style="transform:translate({n.x}px,{n.y}px) translate(-50%,-50%);--r:{n.r}px">
        {#if n.label}<span>{n.label}</span>{/if}
      </div>
    {/each}

    <!-- Tap a concept, read its definition. The gloss is the REWARD for
         reaching a concept. The text is WordNet's own, verbatim (CC BY 4.0,
         credited in the dock). It is DATA, not prose. -->
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
    {#if liveTicker.length > 0}
      <div class="ticker">
        {#each liveTicker as l (l.id)}<span>{l.text}</span>{/each}
      </div>
    {/if}

    <!-- THE BEAT. The starmap's lanes and the story's choices were always the
         same thing; this renders them as one surface.

         ⟦spans⟧ in the title, the body and every choice label are substituted:
         the English label where the concept is bound, the graph's own word
         where it is not. Carrier words go the same way, so a beat you have not
         earned reads as a sentence in another language rather than as English
         with holes punched in it. -->
    {#if beat}
      <div class="beat">
        <h3>{@html seg(beat.title)}</h3>
        <p>{@html seg(beat.body)}</p>
      </div>
      <div class="lanes" class:expanded={lanesExpanded}>
        {#each shownChoices as c (c.choice.id)}
          <!-- ⚠️ NOT `disabled`. `walk()` has had an answer for a held lane
               ("already yours") and for a locked one (its key, in the graph's
               word) since the day it was written, and `disabled` meant NEITHER
               COULD EVER FIRE: the button swallowed the tap and returned
               nothing at all. Three players tapped a dead lane repeatedly and
               reported no visual response of any kind. `aria-disabled` keeps
               the semantics and lets the tap answer. -->
          <button class="lane {c.state}" class:poor={c.state === 'dotted' && !c.takeable}
            class:terminal={c.terminal}
            aria-disabled={c.state !== 'dotted'}
            aria-label={plain(choiceLabel(c.choice))}
            onclick={() => walk(c)}>
            <b>{@html seg(choiceLabel(c.choice))}</b>
            <!-- ★ THE PRICE IS ON THE BUTTON FROM THE FIRST FRAME. It used to
                 wait for `hudReady`, i.e. for the first walk — so the opening
                 move in the game was a blind spend, and the player learned what
                 walking costs RETROACTIVELY, from a price tag that only
                 appeared on the lanes they had not taken. The number is legible
                 and its noun is not, which is this screen's own stated rule
                 (see the header): you can see that something is counted, and
                 not yet what. -->
            <span>{@html c.state === 'locked'
              ? esc(c.missing.map((id: number) => graphWord(id)).join(' '))
              : c.state === 'solid' ? ''
              : `${esc(formatWhole(c.cost))} ${chromeHtml(READOUTS.solid.noun, readsSolid)}`}</span>
          </button>
        {/each}
      </div>
      {#if beatChoices.length > LANES_SHOWN}
        <button class="more-lanes" onclick={() => (lanesExpanded = !lanesExpanded)}>
          <!-- The lane counter rides on Words, because lanes are what Words are
               made of: the count is legible from the first frame, the phrase
               around it once you can read the thing walking a lane gives you. -->
          {@html lanesExpanded
            ? chromeHtml('fewer ways on', readsWords)
            : `+${beatChoices.length - LANES_SHOWN} ${chromeHtml('more ways on', readsWords)}`}
        </button>
      {/if}
    {/if}

    <div class="actions">
      <!-- CHECK. No cooldown, no booking, no queue: there is Raw to look at or
           there is not, and looking at it is instant. It converts a FIXED
           amount per tap against production that grows with every machine and
           every Word, so it falls behind by construction — "review is the only
           brake and review is slow", with no clock in it. It is a min-max lever
           for a player who feels like tapping, never an attention tax, and it
           is absent entirely when there is nothing to check. -->
      {#if canCheck($game)}
        <button class="act" onclick={() => dispatch({ type: 'check' })}>
          <!-- The verb rides on Raw: you learn what `Check` means by having the
               thing it acts on. Both nouns in the subtitle keep their own rule,
               so the line can read half in each language — which is honest,
               because the player has earned exactly half of it. -->
          <b>{@html chromeHtml('Check', readsRaw)}</b><span>{CHECK_PER_TAP}
            {@html chromeHtml(READOUTS.raw.noun, readsRaw)} →
            {@html chromeHtml(READOUTS.solid.noun, readsSolid)}</span>
        </button>
      {/if}

      <!-- RETRAIN. Prestige: you keep every concept, your step curve restarts,
           and you inherit a share of what your machines minted — as Raw,
           because it never was checked. Each generation starts richer and more
           wrong. It is a decision, not a reward.
           ⚠️ NO GENERATION NUMBER. `generation` is a real field of the save with
           NO readout behind it, so printing it would invent a word — exactly
           the "about twelve nouns" half of the defect this rewrite exists to
           fix, and `check:vocab` fails the build on it. ECONOMY_SRR §3 already
           settled it: generation is a badge, not a number. -->
      <!-- ★ IT ARRIVES BEFORE IT UNLOCKS, on the machine cards' own rule
           (`REVEAL_AT`): the biggest thing in the game had NO on-screen
           existence whatsoever until the moment it fired, two-and-a-half hours
           in, so nothing anywhere pointed forward. Now it shows up dimmed with
           its threshold on it, in exactly the grammar a machine card uses —
           a number and the noun it is priced in — so it reads as a price to
           save toward rather than as a caption explaining prestige.
           ⚠️ `Retrain` and its subtitle were the ONLY hardcoded English left on
           the dock. On a screen whose whole thesis is that nothing is readable
           until it is earned, one plain English sentence tells the player the
           foreign parts are decoration. Both ride on Words, which is what the
           gate is counted in and the one witness a Retrain cannot take back.
           ⚠️ NO GENERATION NUMBER. `generation` is a real field of the save with
           NO readout behind it, so printing it would invent a word — exactly
           the "about twelve nouns" half of the defect this rewrite exists to
           fix, and `check:vocab` fails the build on it. ECONOMY_SRR §3 already
           settled it: generation is a badge, not a number. -->
      {#if canRetrain($game) || wordsCount.gte(D(RETRAIN_MIN_WORDS).mul(REVEAL_AT))}
        <button class="act bad" disabled={!canRetrain($game)}
          onclick={() => { dispatch({ type: 'retrain' }); say(chrome('retrained', readsWords)); }}>
          <b>{@html chromeHtml('Retrain', readsWords)}</b>
          <span>{RETRAIN_MIN_WORDS} {@html chromeHtml(READOUTS.words.noun, readsWords)}</span>
        </button>
      {/if}
    </div>

    <!-- THE MACHINES. Count on the card, price on the buy button, and one
         toggle for the two that make facts. -->
    {#if machineCards.length > 0}
      <div class="machines">
        {#each machineCards as m (m.id)}
          <div class="mach">
            <!-- A machine's NAME is earned by buying one — the count beside it
                 is legible from the first frame, so the card reads as `▮ ×1`
                 until you have paid for a second. -->
            <b>{@html chromeHtml(m.label, m.reads)}<i>×{m.owned}</i></b>
            <button class="buy" disabled={!m.afford}
              onclick={() => dispatch({ type: 'buy', id: m.id })}>
              {formatWhole(m.cost)} {@html chromeHtml(READOUTS.solid.noun, readsSolid)}
            </button>
            {#if m.watchable}
              <!-- SPEED VERSUS TRUTH, AND IT IS ONE TAP. Watched: 55% of the
                   rate, and everything it makes arrives Solid. Loose: full
                   speed, and everything it makes arrives Raw — which rots. -->
              <button class="watch" class:on={isWatched(m.id)}
                onclick={() => toggleWatch(m.id)}>
                <!-- Each half of the toggle rides on what that half MAKES, so
                     the sentence and its consequence become readable together:
                     `watched → Solid` on Solid, `loose → Raw` on Raw. The rate
                     is a number and stays legible throughout. -->
                {@html isWatched(m.id)
                  ? `${chromeHtml('watched', readsSolid)} · ×${WATCHED_RATE} → `
                    + chromeHtml(READOUTS.solid.noun, readsSolid)
                  : `${chromeHtml('loose', readsRaw)} · ${chromeHtml('full speed', readsRaw)} → `
                    + chromeHtml(READOUTS.raw.noun, readsRaw)}
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

  {#if sheet === 'help'}
    <!-- ---- THE MANUAL --------------------------------------------------
         ★ EVERY NUMBER AND EVERY NOUN HERE IS READ FROM THE ENGINE AND FROM
         readouts.ts, never typed in. A help page that drifts from the code is
         worse than no help page: it teaches a wrong game with authority.

         ★ THE GLOSSARY IS THEORY-FAITHFUL. Definitions match docs/GLOSSARY.md,
         which cites its sources. If they disagree, the glossary wins. This is
         an educational game; getting `hypernym` subtly wrong here is a worse
         bug than a broken button. -->
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

        <h3>Four quantities</h3>
        <!-- ⚠️ THE NOUNS GO THROUGH `quantity()`, THE DEFINITIONS DO NOT. What
             each quantity IS stays in English — that is the documentation. What
             it is CALLED is earned, exactly as on the HUD, or this table is a
             legend for words the screen refuses to show. -->
        <table class="ref"><tbody>
          <tr><th>word</th><th>what it is</th></tr>
          <tr><td><b>{@html quantity('words')}</b></td><td>{READOUTS.words.explain}</td></tr>
          <tr><td><b>{@html quantity('solid')}</b></td><td>{READOUTS.solid.explain}</td></tr>
          <tr><td><b>{@html quantity('raw')}</b></td><td>{READOUTS.raw.explain}</td></tr>
          <tr><td><b>{@html quantity('rot')}</b></td><td>{READOUTS.rot.explain}</td></tr>
        </tbody></table>
        <p class="body">{@html quantity('solid')}, {@html quantity('raw')} and
          {@html quantity('rot')} are one substance in three states, which is why
          they are one bar and not three counters. Everything that leaves one
          arrives in another.</p>

        <h3>The rule that ties the two halves together</h3>
        <p class="body">Machines can only relate concepts you actually hold, so
          what they produce is capped by your vocabulary: every
          {@html quantity('words')} supports {WORDS_PER_FACT} facts a second, and
          the only way to gain one is to walk the story.
          <b>Walking is the only income upgrade in the game.</b> Build as many
          machines as you like — past the cap they idle, and the line at the top
          of the screen says so in words.</p>

        <h3>The four things you do</h3>
        <table class="ref"><tbody>
          <tr><th>verb</th><th>costs</th><th>gives</th></tr>
          <tr><td><b>{@html chromeHtml('Walk', readsWords)}</b></td>
              <td>{@html quantity('solid')}, rising with each new concept this run</td>
              <td>a concept, and a word you can read</td></tr>
          <tr><td><b>{@html chromeHtml('Check', readsRaw)}</b></td><td>a tap</td>
              <td>{CHECK_PER_TAP} {@html quantity('raw')} → {@html quantity('solid')}</td></tr>
          <tr><td><b>{@html chromeHtml('Buy', readsSolid)}</b></td><td>{@html quantity('solid')}</td>
              <td>a machine, from the roster below</td></tr>
          <tr><td><b>{@html chromeHtml('Retrain', readsWords)}</b></td><td>the run</td>
              <td>a new generation, at {RETRAIN_MIN_WORDS} {@html quantity('words')}</td></tr>
        </tbody></table>
        <p class="body">Somewhere you have already been costs nothing to walk
          again, which is what makes a {@html chromeHtml('Retrain', readsWords)}
          a sprint back to the frontier rather than a repeat of the opening.</p>

        <h3>The machines, and the only real decision</h3>
        <table class="ref"><tbody>
          <tr><th>machine</th><th>rate</th><th>from</th></tr>
          {#each MACHINE_IDS as id (id)}
            <tr><td><b>{@html chromeHtml(MACHINES[id].label,
                  $game.machines[id] > OPENING[id])}</b></td>
                <td>{MACHINES[id].rate}/s</td>
                <td>{formatWhole(MACHINES[id].baseCost)} {@html quantity('solid')}</td></tr>
          {/each}
        </tbody></table>
        <p class="body">A machine that makes facts is either
          <b>{@html chromeHtml('watched', readsSolid)}</b> — {WATCHED_RATE}× the
          rate, and everything it makes arrives {@html quantity('solid')} — or
          <b>{@html chromeHtml('loose', readsRaw)}</b>, at full speed, where
          everything it makes arrives {@html quantity('raw')}, and
          {@html quantity('raw')} wears out on its own. That trade is the whole
          game and it is one tap per machine. The {@html chromeHtml(
            MACHINES.checker.label, $game.machines.checker > OPENING.checker)} buys
          the reviewing out: it makes nothing, converts {@html quantity('raw')} by
          itself, and keeps doing it while the app is shut. Nothing here ever
          needs babysitting.</p>

        <h3>Why anything decays</h3>
        <p class="body">{@html quantity('raw')} is machine output nobody looked at,
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
            with its most familiar word.</dd>

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
            reaches back to <i>entity</i>: every noun in the source is,
            eventually, a kind of entity.</dd>

          <dt>Category <em>(lexicographer file)</em></dt>
          <dd>The <i>noun.group</i> or <i>noun.artifact</i> beside a concept's
            name. The source's own editorial filing system — a rough shelf, not
            a claim about what the thing fundamentally is.</dd>

          <dt>Provenance</dt>
          <dd>Where a statement came from and who verified it. Tracking it is
            the entire difference between a knowledge graph and a pile of
            confident text. {@html quantity('solid')} and {@html quantity('raw')}
            are the two readings of it.</dd>

          <dt>Subsumption reasoning</dt>
          <dd>Deriving what must be true from what you already hold: if a dog is
            a canine and a canine is a carnivore, a dog is a carnivore. The
            {@html chromeHtml(MACHINES.reasoner.label,
              $game.machines.reasoner > OPENING.reasoner)} does this, which is why
            its output needs no checking and why it is expensive.</dd>

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
           targets, one of which wipes the run, and the one you came here to
           press is the one underneath it. It keeps its confirm and it keeps its
           danger colour; it just no longer shares an edge with the way out. -->
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
     which is precisely the trap the owner hit. An ordinary in-flow element
     pans normally when the page is zoomed, exactly like every other website. */
  .app {
    position: relative;
    display: flex; flex-direction: column;
    /* MIN-height, not height: zoom persists per-site on iOS, and a fixed-height
       column cannot reflow, so zooming turned the UI into an unreachable crop
       with scrollbars on both axes. */
    min-height: 100dvh;
    justify-content: space-between;
    color: #cfe0e8;
    font: 400 14px/1.3 ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
    box-sizing: border-box;
  }

  /* ---- header: Words, then ONE bar ---- */
  .hud { flex: 0 0 auto; text-align: center; padding: 6px 10px 2px; }
  .readout { display: flex; flex-direction: column; min-width: 0; }
  .readout b { font-size: 1.05rem; font-weight: 700; color: #eaf6f2; }
  .readout span { font-size: 0.62rem; color: #5d7385; white-space: nowrap; }
  /* The goal line. Bigger, because it is the one number the whole economy is
     capped by and the only fraction in the game. */
  .goal { margin-bottom: 6px; }
  .goal b { font-size: 1.5rem; line-height: 1.05; }

  /* ══ THE STACKED BAR ═══════════════════════════════════════════════════
     Solid, Raw and Rot are ONE SUBSTANCE IN THREE STATES, so they are one
     object. Segments are flex-grown by share, so the bar always fills and
     never needs a maximum — the substance has no ceiling, only proportions. */
  .bar {
    display: flex; gap: 2px; height: 9px; margin-top: 3px;
    border-radius: 5px; overflow: hidden; background: #10151d;
  }
  .seg { min-width: 3px; border-radius: 5px; transition: flex-grow 300ms linear; }
  .seg.solid { background: hsl(var(--hue) 70% 55%); }
  .seg.raw { background: hsl(42 70% 52%); }
  .seg.rot { background: #b0566b; }
  /* ★ A STATE THAT HAS NOTHING IN IT YET IS AN EMPTY TRACK, not an absence.
     Drawing only the states that exist gave a watched-machines player — the
     correct opening — a 100%-full teal rectangle sitting directly under
     `3 / 4075`, where it reads as a completed progress bar for that fraction
     and carries zero information for hours. A fixed stub, gapped off from the
     substance, says "three states, two empty" from the first frame and needs no
     legend to do it. */
  .seg.empty { flex: 0 0 15px; background: #182231; }
  .stats { display: flex; justify-content: center; gap: 18px; margin-top: 4px; }
  .stats b.solid { color: hsl(var(--hue) 70% 58%); }
  .stats b.raw { color: hsl(42 75% 60%); }
  .stats b.rot { color: #b0566b; }

  /* THE RATE. Numbers only, coloured to the segments they belong to — that is
     the whole legend, and it needs no word. Monospace so the digits do not
     jitter as they tick. */
  .rates {
    display: flex; justify-content: center; gap: 18px; margin-top: 3px;
    font: 0.66rem ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .rates b.solid { color: hsl(var(--hue) 55% 46%); font-weight: 400; }
  .rates b.raw { color: hsl(42 50% 46%); font-weight: 400; }

  /* The join, in words. Quiet — it is an explanation, not an alarm — but it is
     the only place the cap ever states itself, so it is never truncated. */
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
       dimension; height past the stage's own width just pools as empty space
       around it and reads as the graph being small and lost. */
    min-height: min(46vh, 92vw);
    max-height: min(64vh, 104vw);
  }
  /* Only while WE own the gesture. When the browser is zoomed this reverts to
     `auto`, handing every touch straight back — a player fighting out of an
     accidental page zoom must not also be fighting us. */
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

     This is the bug that produced every "misaligned" report: `.node` was a
     flex column whose width came from its LABEL, so the dot landed at
     `x + labelWidth/2` — 8px off for "thing", 32px for "physical entity".
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

  /* The beat: the only prose surface in the game, so it gets room to be read
     and a measure that does not run the full width of a phone. */
  .beat { max-width: 34em; margin: 0 auto 6px; text-align: left; }
  .beat h3 {
    margin: 0 0 4px; font-size: 0.7rem; letter-spacing: 0.09em;
    text-transform: uppercase; color: #5d7385; font-weight: 600;
  }
  .beat p { margin: 0; color: #b3c6d4; font-size: 0.86rem; line-height: 1.45; }
  /* A word you cannot read yet, in the graph's own tongue. Monospace and
     letter-spaced so the SHARED PREFIX is scannable — `ka-sa-le` and
     `ka-sa-le-then` have to look like kin at a glance, which is the whole
     mechanic and the reason these are never truncated. */
  /* ONE SELECTOR FOR THE WHOLE SCREEN. It was `.beat, .lane` — the two surfaces
     that could produce a masked word at the time. The HUD, the machine cards
     and the verbs speak the language too now, and a word rendered in the
     graph's tongue must LOOK like one everywhere, or the chrome reads as broken
     English rather than as another language. */
  .app :global(.glyph) {
    font-family: ui-monospace, monospace; font-style: normal;
    color: #c9a227; letter-spacing: 0.02em;
  }
  /* A word you have bound to English. */
  .beat :global(.bound), .lane :global(.bound) { color: #eaf6f2; font-weight: 600; }

  /* ---- THE LANES: three states, and the locked one is DRAWN ------------- */
  .lanes { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  /* Expanded, the strip scrolls INSIDE ITSELF rather than pushing the board
     off the top of the page. A beat with 371 ways on is a list, and a list on a
     phone is a scroll box with a bottom to it. */
  .lanes.expanded { max-height: 42vh; overflow-y: auto; align-content: flex-start; }
  .more-lanes {
    display: block; margin: 6px auto 0; padding: 5px 12px;
    border-radius: 999px; cursor: pointer;
    font: 0.62rem ui-monospace, monospace;
    background: none; border: 1px solid #22303d; color: #5d7385;
  }
  /* ══ AFFORDANCE, THE RIGHT WAY ROUND ═══════════════════════════════════
     IT SHIPPED INVERTED, and the cause is one line further up this stylesheet:
     `.lane :global(.bound)` paints a word you have earned WHITE AND BOLD. A
     lane whose destination you already hold is, by definition, a bound word —
     so the three lanes that go nowhere rendered as the largest, brightest,
     solid-bordered objects on the screen, while the one live lane sat in a dim
     dashed outline with grey price text, styled like a disabled control. All
     three players tapped the dead ones first, repeatedly, and got nothing back.
     The thumb goes to the brightest thing. That has to be the thing that
     moves. */
  /* The label carries a verb now, so it is two or three words rather than one
     noun. Sized to keep it on ONE LINE at phone width — two-line lanes pushed
     the dock 170px past the fold and took the HUD off the top of the screen. */
  .lane {
    flex: 1 1 auto; min-width: 96px; max-width: 46%;
    padding: 6px 9px; border-radius: 10px;
    background: none; border: 1px solid #2b6c7d; color: #8fdcea;
    font: inherit; text-align: left; cursor: pointer;
  }
  .lane b { display: block; font-size: 0.79rem; font-weight: 600; line-height: 1.25; }
  .lane span { display: block; font: 0.6rem ui-monospace, monospace; color: #5d7385; }

  /* ══ DASHED CARRIES ON · SOLID STOPS ═══════════════════════════════════
     Two shapes for the two kinds of walk, and no word explaining either. The
     player learns it the way they learn everything else here: take a dashed
     lane and the beat changes, take a solid-outlined one and it does not. */

  /* DOTTED — ungated, the far end is dark, and it MOVES you. The loudest thing
     in the strip, because it is the offer. */
  .lane.dotted {
    border-style: dashed; border-width: 1.5px;
    border-color: hsl(var(--hue) 62% 48%); color: hsl(var(--hue) 72% 70%);
    background: hsl(var(--hue) 45% 12%);
  }
  .lane.dotted span { color: hsl(var(--hue) 45% 60%); }
  /* ★ A LANE THAT STOPS. Its far end has no beat — beats exist only for the 446
     concepts that have children — so walking it costs full price, raises
     1.04^n for every future step, and leaves you standing in the beat you were
     already in. Legal, and it looked exactly like the game breaking. It is NOT
     hidden and NOT captioned: it sorts after the ways on, and it trades the
     dashed edge for a closed one. A route that continues is drawn open. */
  .lane.dotted.terminal {
    border-style: solid; border-width: 1px;
    border-color: hsl(var(--hue) 28% 30%); background: none;
  }
  /* Dimmed while you cannot pay for it, but still LIVE: tapping it quotes the
     price rather than doing nothing. Opacity rather than a colour, so a word in
     the graph's tongue keeps the one colour it has everywhere else on screen. */
  .lane.poor { opacity: 0.45; }
  /* SOLID — a route on your own map, and not a route at all: it goes somewhere
     you already hold, so there is nothing to travel to. Record, drawn as
     record — no border, no fill, and its bound word gives up the white. */
  .lane.solid {
    border-color: transparent; background: none; color: #5b7482;
    opacity: 0.45; cursor: default;
  }
  /* LOCKED — visible, not takeable, key shown in the graph's word. An absent
     edge teaches nobody; a door with a lock on it is the reason to come back. */
  .lane.locked {
    border-style: dashed; border-color: #26333f; color: #48607a;
    background: none; cursor: default;
  }
  .lane.locked b { letter-spacing: 0.06em; }
  /* ⚠️ THE WHITE MUST NOT REACH A LANE THAT IS NOT AN OFFER. This is the actual
     inversion, in one selector: without it a held destination outshouts the
     lane you can take, because being readable is what `.bound` styles. */
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
  .act.bad { border-color: #b0566b; color: #b0566b; background: #2416197a; }

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
