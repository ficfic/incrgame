# THE MAP RECIPE — a pan/zoom board that feels good on a phone

**Hand this file to another project.** It is the whole method behind
`src/ui/Board.svelte`, written so it can be rebuilt somewhere else without
this repo. Nothing here is specific to the game — it is a camera, a canvas
and a thumb.

The board it describes is a graph map you can drag, pinch, wheel-zoom and
tap, on iOS Safari/Edge, at 390px wide, without a library.

---

## 0. The one-line architecture

> **Canvas draws the lines. DOM draws every word and every tap target.
> Both are placed by ONE shared transform.**

```
screen = world * k + t          // k = scale, t = (tx, ty)
```

Do not pick one or the other. Canvas text is unreadable when zoomed and
untappable by assistive tech; DOM lines are thousands of elements. Split
them and each does the thing it is good at:

| thing | drawn by | why |
|---|---|---|
| edges, terrain, fills, decor | canvas 2D | hundreds of them, one paint |
| node labels, buttons, icons | DOM, absolutely positioned | real text, real tap targets, scales crisp |

The DOM twins are positioned with the same `sx()`/`sy()` the canvas uses,
so they cannot drift apart.

---

## 1. Device pixels for the buffer, CSS pixels for the drawing

This is the entire answer to *"the lines look slightly blurry / misaligned
by a pixel or two."*

```js
const dpr = Math.min(window.devicePixelRatio || 1, 3);   // cap it: 4x is free blur on nothing
const w = Math.round(cssW * dpr), h = Math.round(cssH * dpr);
if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);                  // now draw in CSS px
ctx.clearRect(0, 0, cssW, cssH);
```

with the element sized in CSS pixels:

```html
<canvas bind:this={cv} style="width:{cssW}px;height:{cssH}px"></canvas>
```

Skip this and every 2px line is drawn at 1/dpr of its width and lands
between physical pixels. Assigning `cv.width` clears the canvas, hence the
`if` — resizing every frame is also a per-frame allocation.

⚠️ **An SVG with a `viewBox` cannot be fixed this way.** That was the
previous renderer here: every coordinate landed on a fraction of a device
pixel. Zooming it magnified a finished picture instead of redrawing.

---

## 2. The gestures: Pointer Events, one handler set, on the host

Not touch events, not mouse events. **Pointer Events unify thumb, mouse and
Playwright into one code path**, which means the automated check exercises
the same lines the phone does.

```js
const down = new Map();          // pointerId -> {x, y, wx, wy}
let grabbed = null;              // node id under the first finger, or null
let slid = 0;                    // furthest this gesture has travelled
let pinch = 0;                   // last two-finger distance
```

Put `onpointerdown/move/up/cancel` on the **host element**, not on the
nodes, so a drag that starts on a node and ends on the background still
tracks. Handle `pointercancel` exactly like `pointerup` or a gesture
interrupted by the system leaves a finger stuck down forever.

```js
function onDown(e) {
  // Guarded: a synthetic pointer can be gone before we ask to capture it,
  // and the throw would kill the handler.
  try { host.setPointerCapture(e.pointerId); } catch {}
  down.set(e.pointerId, { x: e.clientX, y: e.clientY, wx: tx, wy: ty });
  if (down.size === 1) { grabbed = nodeUnder(e); slid = 0; }
  else if (down.size === 2) {
    grabbed = null;
    const [a, b] = [...down.values()];
    pinch = Math.hypot(a.x - b.x, a.y - b.y);
  }
}
```

`nodeUnder` is just `e.target.closest('.node')?.dataset.id` — let the DOM do
the hit-testing it already does, instead of writing point-in-circle maths.

---

## 3. A tap is a pointerup that did not travel

**Give the nodes no click handler at all.** One rule covers everything:

```js
function onUp(e) {
  const was = grabbed;
  down.delete(e.pointerId);
  if (down.size < 2) pinch = 0;
  if (down.size > 0) return;         // other fingers still down
  if (was && slid < 7) onTap(was);   // 7px of slop
  else if (!was && slid < 7) onGround?.();
  grabbed = null;
}
```

**7px of slop is not optional.** A thumb never lands and lifts on the same
pixel, so a strict comparison makes the map feel broken maybe one tap in
four. Track `slid` as the *maximum* distance travelled, not the final
displacement, or a drag that returns to its origin counts as a tap.

---

## 4. Zoom that stays under the fingers

The only zoom worth writing: the point under the cursor/pinch-midpoint does
not move.

```js
function zoomAt(by, px, py) {          // px,py = anchor in ELEMENT coords
  const next = Math.min(6, Math.max(0.25, k * by));
  const r = next / k;
  tx = px - (px - tx) * r;
  ty = py - (py - ty) * r;
  k = next;
}
```

Pinch feeds it the ratio of finger distances, anchored at their midpoint:

```js
const now = Math.hypot(a.x - b.x, a.y - b.y);
if (pinch > 0 && now > 0) {
  const r = host.getBoundingClientRect();
  zoomAt(now / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
}
pinch = now;                            // ratio each move, never absolute
```

Wheel feeds it an exponential, so trackpad and mouse-wheel both feel even:

```js
function onWheel(e) {
  e.preventDefault();
  const r = host.getBoundingClientRect();
  zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
}
```

Always subtract `getBoundingClientRect()` — client coords are page-relative
and the board is not at the origin.

---

## 5. The CSS that makes iOS behave

```css
.board {
  position: relative; width: 100%; height: 100%;
  min-height: 240px;             /* or it collapses in an unsized flex parent */
  touch-action: none;            /* or the browser eats the pan and the pinch */
  overscroll-behavior: contain;  /* no rubber-banding the page behind the map */
  overflow: hidden;
}
canvas { position: absolute; inset: 0; display: block; }
```

`touch-action: none` is the one people miss. Without it iOS claims the
gesture before any handler runs and the map feels dead or fights the page.

Set `user-select: none` (with `-webkit-` prefix) **globally**, not on the
board — otherwise a drag that wanders off the map starts lassoing the text
of whatever is underneath.

### The tap targets are 44px, and the drawn dot is not

The thing you *draw* is small. The thing a thumb has to *hit* is not:

```css
.node { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; }
```

A 44px box centred on the point, over a dot drawn at r=5. This is why the
DOM twins exist at all, and it is most of why the map feels accurate.

---

## 6. Measure the element, never the window

```js
const ro = new ResizeObserver(([e]) => {
  cssW = e.contentRect.width; cssH = e.contentRect.height;
});
ro.observe(host);
```

`window.innerHeight` changes on iOS when the URL bar hides. The element's own
box does not. Every layout decision reads `cssW`/`cssH` from here.

---

## 7. ★ THE TWO BUGS THAT COST THE MOST — copy these guards

Both come from the auto-fit that frames the graph on load. Both presented as
*"zoom is broken"* and neither was in the zoom code.

### 7a. The fit effect must be IDEMPOTENT

The first version called `fit()` on every run of the reactive effect, so the
camera was re-framed several times a second. **Pan survived** (the next frame
re-panned from the reset) **but zoom did not**: `k` went up and was put
straight back. The handler was firing and the state was changing the whole
time — something else was undoing it.

Re-frame only when the shape or the element size *actually changed*, and read
the guards as plain variables so the effect does not subscribe to itself:

```js
let fitted = '', fitW = 0, fitH = 0;
$effect(() => {
  const s = shape, w = cssW, h = cssH;
  if (!w || !h) return;
  if (s === fitted && w === fitW && h === fitH) return;   // <- the whole fix
  fitted = s; fitW = w; fitH = h;
  fit();
});
```

### 7b. Once a thumb has moved the camera, the camera is the player's

Owner's play-test: *"when I zoom in… sometimes it resets my zoom level
completely… it resets it even without me doing anything."* Any nudge to the
element height — the iOS URL bar, a panel changing size — re-framed and threw
their zoom away.

Set a `touched` flag in the pan and zoom handlers, and never auto-fit again
until the *content* changes:

```js
if (s === fitted && touched) { fitW = w; fitH = h; return; }   // theirs now
if (s !== fitted) touched = false;                             // new graph, reclaim
```

---

## 8. Framing: fit into what is VISIBLE, and cap the scale

```js
function fit() {
  const usable = Math.max(120, cssH - inset);   // inset = px covered by an overlay panel
  k = Math.min(Math.min(cssW / box.w, usable / box.h), 1.9);   // cap!
  tx = cssW / 2 - (box.x + box.w / 2) * k;
  ty = usable / 2 - (box.y + box.h / 2) * k;
}
```

Two things earn their keep:

- **`inset`.** If a panel overlays the bottom of the board, centring in the
  full height puts the middle of the map behind it — untappable. Making the
  board taller then makes it *worse*.
- **The scale cap.** Without it a two-node graph fills the page with two
  enormous dots and 40px labels.
- **`Math.max(120, …)`.** A panel taller than the board divides by a negative
  and flings the map off-screen.

---

## 9. Keep it still

Nothing on the map moves on its own. Dots that drift are dots a thumb cannot
hit and a test cannot click. The force-directed layout **ticks to completion
and stops**; positions are then fixed until the graph changes.

The one exception is a dash phase for flow animation, driven by `rAF` **only
while something is actually flowing**, throttled to ~30fps, and it changes
`lineDashOffset` only — never a position:

```js
if (t - last > 33) { phase = (phase + (t - last) * 0.012) % 1000; last = t; }
```

Also: **no `shadowBlur`, ever.** It is the one genuinely expensive canvas
call and it costs more than everything else on the board combined.

---

## 10. The order to build it in

1. `ResizeObserver` → `cssW/cssH`. Paint one rectangle. Confirm it is crisp
   (§1) before anything else.
2. `k`, `tx`, `ty` + `sx()`/`sy()`. Paint the graph. No interaction yet.
3. Pointer handlers: pan only. Then tap (§3). Then `zoomAt` (§4), wired to
   wheel first because it is easier to debug than a pinch.
4. Pinch.
5. `fit()` — and the moment you add it, add both guards from §7. They will
   otherwise cost you an afternoon each, and the symptom will point at the
   zoom code, which is not where the bug is.

---

## 11. What to check, and how to know the check is real

Drive it with Playwright using **`page.mouse` and real pointer sequences**,
not synthetic `click()` — the whole point of §2 is that they are the same
path. Assert on *numbers you can read back*, e.g. expose the transform on a
`data-` attribute, or measure a node's screen position before and after.

Then **break it on purpose and watch the check fail.** A zoom check that
passes with `zoomAt` gutted is testing nothing — and the §7a bug is exactly
the shape of thing that slips past a check that was never proven red.
