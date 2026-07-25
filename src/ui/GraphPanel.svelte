<script lang="ts">
  import type { GraphStats } from '../core/types';
  import { drawGraph, type Fx, type GraphView } from '../render/minigraph';

  let { graph, pulseKey = 0 }: { graph: GraphStats; pulseKey?: number } = $props();

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

  // A tap that crossed no threshold still gets an answer: a hub ripple.
  // (Runs after the diff effect above, so real births are never downgraded.)
  $effect(() => {
    if (prevPulseKey !== undefined && pulseKey !== prevPulseKey) {
      const now = performance.now();
      if (!fx || now - fx.startMs > 50) fx = { kind: 'ripple', startMs: now };
    }
    prevPulseKey = pulseKey;
  });

  // One continuous render loop — the graph is never a still frame. Reads
  // happen inside the rAF callback, so the effect itself runs exactly once.
  $effect(() => {
    if (!canvas) return;
    let raf = 0;
    const frame = (t: number) => {
      drawGraph(canvas!, graph, { view, timeMs: t, fx });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // ---- pan / pinch-zoom / wheel ----
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchDist = 0;

  const clampView = () => {
    view.zoom = Math.min(5, Math.max(0.6, view.zoom));
    const limit = 320 * view.zoom;
    view.x = Math.min(limit, Math.max(-limit, view.x));
    view.y = Math.min(limit, Math.max(-limit, view.y));
  };

  function onPointerDown(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
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
    height: 240px;
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
