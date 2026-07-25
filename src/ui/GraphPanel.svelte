<script lang="ts">
  import type { ForgedGraph, GraphStats } from '../core/types';
  import {
    drawGraph, frontierPos, toWorld,
    FRONTIER_HIT_RADIUS,
    type Fx, type GraphView,
  } from '../render/minigraph';

  let {
    graph,
    forged,
    pulseKey = 0,
    onclaim,
  }: {
    graph: GraphStats;
    forged: ForgedGraph;
    pulseKey?: number;
    onclaim?: (id: number) => void;
  } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let view = $state<GraphView>({ x: 0, y: 0, zoom: 1 });
  let fx: Fx | null = null;
  let prevGraph: GraphStats | undefined;
  let prevPulseKey: number | undefined;

  // What did this state change actually DO? Node births beat edge births beat
  // plain taps — each gets its own distinct celebration in the renderer.
  $effect(() => {
    const { nodes, edges } = graph;
    if (prevGraph) {
      if (nodes > prevGraph.nodes) fx = { kind: 'node', startMs: performance.now() };
      else if (edges > prevGraph.edges) fx = { kind: 'edge', startMs: performance.now() };
    }
    prevGraph = { nodes, edges };
  });

  // A button tap that changed nothing structural still answers: it touches the
  // web, illuminating a different link each time.
  let touchSeq = 0;
  $effect(() => {
    if (prevPulseKey !== undefined && pulseKey !== prevPulseKey) {
      const now = performance.now();
      if (!fx || now - fx.startMs > 50) fx = { kind: 'touch', startMs: now, seq: touchSeq++ };
    }
    prevPulseKey = pulseKey;
  });

  // One continuous render loop — the graph is never a still frame.
  $effect(() => {
    if (!canvas) return;
    let raf = 0;
    const frame = (t: number) => {
      drawGraph(canvas!, { graph, forged }, { view, timeMs: t, fx });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // ---- pan / pinch-zoom / wheel / tap-to-claim ----
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;
  let downAt: { x: number; y: number; t: number } | null = null;

  const clampView = () => {
    view.zoom = Math.min(5, Math.max(0.6, view.zoom));
    const limit = 320 * view.zoom;
    view.x = Math.min(limit, Math.max(-limit, view.x));
    view.y = Math.min(limit, Math.max(-limit, view.y));
  };

  function localXY(e: PointerEvent): { x: number; y: number } {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const p = localXY(e);
      downAt = { ...p, t: performance.now() };
    } else {
      downAt = null;
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
  }

  function onPointerMove(e: PointerEvent) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (pointers.size === 1) {
      view.x += cur.x - prev.x;
      view.y += cur.y - prev.y;
    }
    pointers.set(e.pointerId, cur);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinchDist > 0) view.zoom *= d / pinchDist;
      pinchDist = d;
    }
    clampView();
  }

  function onPointerUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    pinchDist = 0;
    // a short, still press = a tap → try to claim a frontier entity under it
    if (downAt && canvas && pointers.size === 0) {
      const p = localXY(e);
      const moved = Math.hypot(p.x - downAt.x, p.y - downAt.y);
      const quick = performance.now() - downAt.t < 600;
      if (moved < 8 && quick && onclaim) {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        const world = toWorld(p.x, p.y, view, w, h);
        const hitR = FRONTIER_HIT_RADIUS / view.zoom;
        let best: { id: number; d: number } | null = null;
        for (const id of forged.frontier) {
          const fp = frontierPos(id, w, h);
          const d = Math.hypot(fp.x - world.x, fp.y - world.y);
          if (d < hitR && (!best || d < best.d)) best = { id, d };
        }
        if (best) onclaim(best.id);
      }
    }
    downAt = null;
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    view.zoom *= Math.exp(-e.deltaY * 0.0012);
    clampView();
  }

  function resetView() {
    view.x = 0;
    view.y = 0;
    view.zoom = 1;
  }
</script>

<div class="panel">
  <canvas
    bind:this={canvas}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    onwheel={onWheel}
    ondblclick={resetView}
  ></canvas>
  <div class="stats">{graph.nodes} nodes · {graph.edges} edges</div>
  {#if view.zoom !== 1 || view.x !== 0 || view.y !== 0}
    <button class="reset" onclick={resetView} aria-label="Reset view">⌂</button>
  {/if}
</div>

<style>
  .panel {
    position: relative;
    border: 1px solid #16202e;
    border-radius: 16px;
    overflow: hidden;
    background: #0b0e14;
  }
  canvas {
    display: block;
    width: 100%;
    height: 260px;
    touch-action: none;
    cursor: grab;
  }
  canvas:active { cursor: grabbing; }
  .stats {
    position: absolute;
    right: 10px;
    bottom: 8px;
    font-size: 0.72rem;
    color: #46586a;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .reset {
    position: absolute;
    top: 8px;
    right: 8px;
    appearance: none;
    background: #111826cc;
    border: 1px solid #22304a;
    color: #7f95a3;
    border-radius: 8px;
    width: 32px;
    height: 32px;
    font-size: 1rem;
    cursor: pointer;
  }
</style>
