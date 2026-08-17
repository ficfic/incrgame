<script lang="ts">
  // ★★★ THE CRYPT — the delve's own renderer, 2026-08-17.
  //
  // The owner: *"go full on the dungeon crawler, can we make something
  // interesting in terms of looks?"*, then chose LAMPLIGHT AND CHAMBERS.
  //
  // ⚠️ WHY THIS IS NOT `Board.svelte`. The board is 994 lines and almost all of
  // them are the TOWN: road gauges, carrier dots, mana flow, choke amber, ink
  // per direction, bent courses. The delve used it because it was there, and
  // inherited a hiking map — cream ground, moss dots, a little walking figure —
  // which is why the dungeon looked like a trail app that had wandered
  // underground. Teaching that file a second visual language would put the
  // valley and the crypt in one 1,200-line if-statement, and this project has
  // been burned by exactly that shape before. Two renderers, one pattern:
  // CANVAS FOR THE STONE, DOM FOR EVERY WORD AND EVERY TAP TARGET. `Board`
  // stays on disk with the town, untouched.
  //
  // ★★★ THE LIGHT FALLS OFF IN DOORS, NOT PIXELS. A chamber is lit if you are
  // STANDING in it, dim if it is one door away, and chalk-on-slate if you only
  // remember it. Every other rule in this game measures distance in doors — the
  // fog, the chase, the parting blow — and a lamp that disagreed would be
  // lying about the rules while looking pretty.
  import { STONE } from '../game/ink';

  /** One chamber, ready to draw. `step` is doors from the delver. */
  export interface Cell {
    id: number; name: string;
    x: number; y: number; w: number; h: number;
    step: number; here: boolean; foes: number; cleared: boolean; open: boolean;
  }
  export interface Pass { a: number; b: number }

  let { cells, passes, onTap, label = 'dungeon' }:
    { cells: Cell[]; passes: Pass[]; onTap: (id: number) => void; label?: string }
    = $props();

  let host = $state<HTMLDivElement | null>(null);
  let cv = $state<HTMLCanvasElement | null>(null);
  let cssW = $state(1);
  let cssH = $state(1);

  $effect(() => {
    if (!host) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e!.contentRect;
      cssW = r.width; cssH = r.height;
    });
    ro.observe(host);
    return () => ro.disconnect();
  });

  const at = (id: number): Cell | undefined => cells.find((c) => c.id === id);

  /** ⚠️ THE BOX FRAMES THE CHAMBERS, NOT THEIR CENTRES. Padding a list of
   *  points worked while rooms were dots; a 140-wide hall would have hung off
   *  the edge of the screen by half its width. */
  const box = $derived((() => {
    const pad = 34;
    const x0 = Math.min(...cells.map((c) => c.x - c.w / 2)) - pad;
    const y0 = Math.min(...cells.map((c) => c.y - c.h / 2)) - pad;
    const x1 = Math.max(...cells.map((c) => c.x + c.w / 2)) + pad;
    const y1 = Math.max(...cells.map((c) => c.y + c.h / 2)) + pad;
    return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
  })());

  const k = $derived(Math.min(cssW / box.w, cssH / box.h));
  const ox = $derived((cssW - box.w * k) / 2);
  const oy = $derived((cssH - box.h * k) / 2);
  const sx = (wx: number): number => (wx - box.x) * k + ox;
  const sy = (wy: number): number => (wy - box.y) * k + oy;

  /** ★ A DETERMINISTIC WOBBLE. Chambers must not read as CAD rectangles, and
   *  they must also be the SAME chamber every frame and every screenshot —
   *  `Math.random()` here would make the map twitch and the probe unreadable. */
  const wob = (seed: number): number => {
    const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };

  /** The carved outline of a chamber, in world units. Three points a side.
   *
   *  ⚠️ THE JITTER IS PERPENDICULAR TO THE WALL, never along it. The first
   *  draft added the same offset to x AND y, which SHEARS each side along the
   *  diagonal — every chamber came out a lopsided trapezoid that read as a
   *  drawing mistake rather than as cut rock. Pushing a point out of its own
   *  wall roughens the wall; pushing it along the wall bends the room. */
  const wallOf = (c: Cell): [number, number][] => {
    const hw = c.w / 2, hh = c.h / 2;
    const out: [number, number][] = [];
    const side = ([ax, ay]: number[], [bx, by]: number[], s: number): void => {
      const dx = bx! - ax!, dy = by! - ay!;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for (let i = 0; i < 3; i++) {
        const t = i / 3;
        const j = 2.4 * wob(c.id * 31 + s * 7 + i);
        out.push([ax! + dx * t + nx * j, ay! + dy * t + ny * j]);
      }
    };
    side([-hw, -hh], [hw, -hh], 0);
    side([hw, -hh], [hw, hh], 1);
    side([hw, hh], [-hw, hh], 2);
    side([-hw, hh], [-hw, -hh], 3);
    return out.map(([x, y]) => [c.x + x, c.y + y]);
  };

  /** Where the line from this chamber's centre toward a point leaves its wall
   *  — the doorway, and the only place a passage may punch through. */
  const doorway = (c: Cell, tx: number, ty: number): [number, number] => {
    const dx = tx - c.x, dy = ty - c.y;
    const t = Math.min(c.w / 2 / (Math.abs(dx) || 1e-6),
                       c.h / 2 / (Math.abs(dy) || 1e-6));
    return [c.x + dx * t, c.y + dy * t];
  };

  /** ★ AND A ROOM YOU HAVE ALREADY EMPTIED KEEPS A LITTLE LIGHT. `cleared`
   *  ground is the ground you can retreat THROUGH, so a run out to the mouth
   *  reads on the map as a lit path back rather than as more dark. */
  const floorOf = (step: number, here: boolean, done = false): string =>
    here ? STONE.litFloor
      : step <= 1 || done ? STONE.nearFloor : STONE.farFloor;
  const wallInk = (step: number, here: boolean): string =>
    here ? STONE.litWall : step <= 1 ? STONE.nearWall : STONE.farWall;

  $effect(() => {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    // ★ DEVICE PIXELS FOR THE BUFFER, CSS PIXELS FOR THE DRAWING — the same
    // rule the board learned the hard way, and for the same reason.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1 ── LIVING ROCK. ⚠️ SCRATCHED, NOT FLAT. A plain black rectangle reads
    // as "nothing drawn yet"; a hatch reads as stone you have not cut through.
    ctx.fillStyle = STONE.rock;
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.strokeStyle = STONE.scratch;
    ctx.lineWidth = 1;
    for (let i = 0; i < 220; i++) {
      const px = (wob(i * 3 + 1) * 0.5 + 0.5) * cssW;
      const py = (wob(i * 3 + 2) * 0.5 + 0.5) * cssH;
      const a = wob(i * 3 + 3) * Math.PI;
      const len = 5 + 9 * (wob(i * 5) * 0.5 + 0.5);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len);
      ctx.stroke();
    }

    const road = passes
      .map((p) => ({ a: at(p.a), b: at(p.b) }))
      .filter((p): p is { a: Cell; b: Cell } => !!p.a && !!p.b);

    // 2 ── PASSAGE CASING, then floor. The casing is what makes a corridor a
    // cut through rock rather than a line on a chart.
    for (const { a, b } of road) {
      const step = Math.max(a.step, b.step);
      const lit = a.here || b.here;
      // ⚠️ WIDE ENOUGH TO SEE THE CUT. At 15 against a floor of 11 the casing
      // was ~1px a side on a phone and every passage read as a plain black
      // bar — a wall you cannot see is a wall you did not draw.
      ctx.strokeStyle = wallInk(step, lit);
      ctx.lineWidth = Math.max(2, 19 * k);
      ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke();
      ctx.strokeStyle = floorOf(step, lit);
      ctx.lineWidth = Math.max(1, 11 * k);
      ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke();
    }

    // 3 ── CHAMBER FLOORS, then 4 ── the walls around them.
    for (const c of cells) {
      const poly = wallOf(c);
      ctx.beginPath();
      poly.forEach(([x, y], i) => (i ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
      ctx.closePath();
      ctx.fillStyle = floorOf(c.step, c.here, c.cleared);
      ctx.fill();
      ctx.strokeStyle = wallInk(c.step, c.here);
      ctx.lineWidth = Math.max(1, (c.here ? 2.4 : 1.6) * k * 1.1);
      ctx.stroke();
    }

    // 5 ── AND THE DOORWAYS PUNCHED BACK THROUGH. A wall drawn all the way
    // round would seal every room it just connected; this reopens the gap
    // exactly where the passage crosses, which is what a door IS on a map.
    for (const { a, b } of road) {
      const step = Math.max(a.step, b.step);
      const lit = a.here || b.here;
      ctx.strokeStyle = floorOf(step, lit);
      ctx.lineWidth = Math.max(1, 11 * k);
      for (const [c, o] of [[a, b], [b, a]] as [Cell, Cell][]) {
        const [gx, gy] = doorway(c, o.x, o.y);
        const dx = o.x - c.x, dy = o.y - c.y;
        const d = Math.hypot(dx, dy) || 1;
        ctx.beginPath();
        ctx.moveTo(sx(gx - (dx / d) * 7), sy(gy - (dy / d) * 7));
        ctx.lineTo(sx(gx + (dx / d) * 7), sy(gy + (dy / d) * 7));
        ctx.stroke();
      }
    }

    // 6 ── THE LAMP. ⚠️ NO `shadowBlur` — the one genuinely expensive canvas
    // call, and this is a phone. A radial gradient in `lighter` costs nothing.
    const you = cells.find((c) => c.here);
    if (you) {
      const cx = sx(you.x), cy = sy(you.y);
      const rad = Math.max(60, 150 * k);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, STONE.glow);
      g.addColorStop(1, 'rgb(214 160 74 / 0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.globalCompositeOperation = 'source-over';

      // The flame itself, so the delver is a point of light and not an icon.
      ctx.fillStyle = STONE.flame;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2.5, 4 * k), 0, Math.PI * 2);
      ctx.fill();
    }

    // 7 ── WHAT STANDS IN A ROOM. One mark each, in the only red down here.
    for (const c of cells) {
      if (c.foes <= 0) continue;
      const n = Math.min(c.foes, 4);
      for (let i = 0; i < n; i++) {
        // ⚠️ CLEAR OF THE NAME, and inside the wall. The pips sat dead centre
        // and the room's own label was printed on top of them.
        const px = sx(c.x) + (i - (n - 1) / 2) * Math.max(7, 10 * k);
        const py = sy(c.y + c.h / 2) - Math.max(7, 9 * k);
        ctx.fillStyle = '#c2543c';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(2, 3 * k), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 8 ── THE DARK CLOSES IN AT THE EDGES. The vignette is what sells a lamp
    // you are CARRYING rather than a room that happens to be lit.
    const v = ctx.createRadialGradient(
      cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.3,
      cssW / 2, cssH / 2, Math.max(cssW, cssH) * 0.72);
    v.addColorStop(0, 'rgb(11 10 9 / 0)');
    v.addColorStop(1, 'rgb(11 10 9 / 0.9)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, cssW, cssH);
  });
</script>

<div class="crypt" bind:this={host} role="application" aria-label={label}>
  <canvas bind:this={cv} style="width:{cssW}px;height:{cssH}px"></canvas>
  <!-- ★ DOM FOR EVERY WORD AND EVERY TAP TARGET. The name is text a phone can
       render at any zoom, and the button is the whole chamber — a 54px-tall
       room is a far better thumb target than a 7px dot ever was. -->
  {#each cells as c (c.id)}
    <button class="node" class:here={c.here} class:near={c.step <= 1}
      class:open={c.open} class:danger={c.foes > 0}
      style="left:{sx(c.x - c.w / 2)}px; top:{sy(c.y - c.h / 2)}px;
             width:{c.w * k}px; height:{c.h * k}px"
      onclick={() => onTap(c.id)}>
      <span class="nm" class:up={c.foes > 0}>{c.name}</span>
    </button>
  {/each}
</div>

<style>
  .crypt { position: absolute; inset: 0; overflow: hidden; }
  canvas { position: absolute; left: 0; top: 0; display: block; }
  .node { position: absolute; margin: 0; padding: 0; border: 0; background: none;
    display: flex; align-items: center; justify-content: center;
    font: inherit; color: var(--dim); cursor: pointer; }
  .nm { font-size: var(--t7); letter-spacing: .02em; line-height: 1.1;
    text-align: center; padding: 0 2px;
    /* ⚠️ THE NAME MUST SURVIVE THE FLOOR IT SITS ON. */
    text-shadow: 0 1px 3px rgb(0 0 0 / .95), 0 0 8px rgb(0 0 0 / .8); }
  /* ★ Out of the way of the pips drawn along the chamber's bottom wall. */
  .nm.up { transform: translateY(-22%); }
  .node.near .nm { color: var(--faint); }
  /* ★ THE ROOM YOU ARE IN is the brightest word on the map, and the only one
     in the lamp's own colour. */
  .node.here .nm { color: #f0cf87; font-weight: 700; font-size: var(--t6); }
  .node.danger .nm { color: #d9755e; }
  .node.open .nm { text-decoration: underline; text-underline-offset: 3px;
    text-decoration-thickness: 1px; text-decoration-color: rgb(202 164 104 / .55); }
</style>
