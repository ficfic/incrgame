<script lang="ts">
  import type { GraphStats } from '../core/types';
  import { drawGraph } from '../render/minigraph';

  let { graph, pulseKey = 0 }: { graph: GraphStats; pulseKey?: number } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let raf = 0;

  // redraw whenever the graph changes; a connect (pulseKey bump) plays a brief pulse
  $effect(() => {
    void graph.nodes;
    void graph.edges;
    void pulseKey;
    if (!canvas) return;
    cancelAnimationFrame(raf);
    const started = performance.now();
    const PULSE_MS = 450;
    const frame = (t: number) => {
      if (!canvas) return;
      const k = Math.min((t - started) / PULSE_MS, 1);
      drawGraph(canvas, graph, Math.sin((1 - k) * Math.PI));
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });
</script>

<div class="panel">
  <canvas bind:this={canvas}></canvas>
  <div class="stats">{graph.nodes} nodes · {graph.edges} edges</div>
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
    height: 220px;
  }
  .stats {
    position: absolute;
    right: 10px;
    bottom: 8px;
    font-size: 0.72rem;
    color: #46586a;
    font-variant-numeric: tabular-nums;
  }
</style>
