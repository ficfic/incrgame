// PLAY KING'S ROADS. Not "does it typecheck" — does it PLAY, in a browser, on a
// phone-sized screen, with the pixels counted.
//
// ⚠️ WHAT THIS FILE USED TO BE. 833 lines driving settling, working, a skill,
// doors, keys and a fight. The owner reviewed that game item by item and
// scrapped all of it, so every one of those checks was guarding code that no
// longer exists. They are not commented out here, they are gone — a probe that
// checks a scrapped mechanic is worse than no probe, because it reports green.
//
// What is kept is the scaffolding that earned its place: the palette read off
// the RUNNING page rather than copied, the overlap measurement, and the habit of
// printing what was seen rather than a verdict.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const EXE = ['/opt/pw-browsers/chromium/chrome-linux/chrome',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const SHOT = process.argv[2] ?? 'play.png';
const misses = [];
const b = await chromium.launch({ executablePath: EXE });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => misses.push(`page error: ${e}`));
page.on('console', (m) => { if (m.type() === 'error') misses.push(`console: ${m.text()}`); });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForSelector('.map canvas');
await page.waitForTimeout(600);

// ★ THE BOARD IS PAINTED, SO THE PROBE READS PIXELS. Lines and dots are not
// elements with computed styles — asserting on the DOM would check only that
// buttons exist, which is exactly the vacuous guard this repo keeps producing.
const inked = (hex, tol = 26) => page.evaluate(([hex, tol]) => {
  const cv = document.querySelector('.map canvas');
  if (!cv) return -1;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const d = cv.getContext('2d', { willReadFrequently: true })
    .getImageData(0, 0, cv.width, cv.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 40 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol
      && Math.abs(d[i + 2] - b) <= tol) n++;
  }
  return n;
}, [hex, tol]);
/** Count an ink inside a css-pixel rectangle of the board. For checks that are
 *  about WHERE something is drawn, not merely whether — the fill direction and
 *  the pin cannot be told from a whole-canvas count. */
const inkedIn = (hex, tol, box) => page.evaluate(([hex, tol, bx]) => {
  const cv = document.querySelector('.map canvas');
  if (!cv) return -1;
  const off = cv.getBoundingClientRect();
  const dpr = cv.width / off.width;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  const x0 = Math.max(0, Math.round((bx.x0 - off.left) * dpr));
  const y0 = Math.max(0, Math.round((bx.y0 - off.top) * dpr));
  const x1 = Math.min(cv.width, Math.round((bx.x1 - off.left) * dpr));
  const y1 = Math.min(cv.height, Math.round((bx.y1 - off.top) * dpr));
  if (x1 <= x0 || y1 <= y0) return 0;
  const d = cv.getContext('2d', { willReadFrequently: true })
    .getImageData(x0, y0, x1 - x0, y1 - y0).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 40 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol
      && Math.abs(d[i + 2] - b) <= tol) n++;
  }
  return n;
}, [hex, tol, box]);
const inkNear = async (name, sel, rad) => {
  const bb = await page.locator(sel).first().boundingBox();
  if (!bb) return -1;
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  return inkedIn(INK[name], TOL[name] ?? 12, { x0: cx - rad, y0: cy - rad, x1: cx + rad, y1: cy + rad });
};

// ★ THE PALETTE COMES OFF THE RUNNING PAGE, NOT FROM A COPY IN HERE. This file
// used to carry its own hexes, so the app could change a colour and the probe
// would go on counting the OLD one, find none of it missing, and pass.
const INK = await page.evaluate(() => window.__INK);
const TOL = await page.evaluate(() => window.__TOL);
const ink = (name) => inked(INK[name], TOL[name] ?? 12);
if (!INK || !INK.route) {
  misses.push('the page did not hand over its palette — the probe is counting nothing');
}

const purse = () => page.$eval('.purse b', (e) => Number(e.textContent));
const panelText = () => page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim());

/** ⚠️ SELECT, DO NOT TOGGLE. Tapping a stop that is already selected CLEARS the
 *  selection — R3.4, and correct. It also means a probe that taps blind can
 *  deselect the very thing it is about to read, which has cost a run before. */
async function pick(sel) {
  const el = page.locator(sel).first();
  if (await el.count() && !(await el.getAttribute('class') ?? '').split(/\s+/).includes('on')) {
    await el.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

// ---------------------------------------------------------------- the tabs --
//
// ★ NOTHING OVERLAPS ANYTHING. Every block in the column must be strictly below
// the one before it — that is what "no pop-up over a pop-up" means, measured.
// ⚠️ THIS CHECK WAS REWRITTEN, NOT DELETED, WHEN THE OWNER RELAXED THE RULE.
// It used to fail on ANY `position: fixed|absolute` outside `.map`, which is
// what kept sheets off the board for months. The panel is now deliberately
// docked over the board, so that exact assertion had to go — and deleting a
// guard because the feature it guards changed is how the thing it prevented
// comes back. The narrower rule it protects now:
//
//   1. header, nav and the board are still a column. None overlaps another.
//   2. The panel is the ONLY overlay, and it is pinned to the BOTTOM.
//   3. Nothing overlays the panel.
const stacked = async () => page.evaluate(() => {
  const bad = [];
  const parts = ['header', 'nav', '.map']
    .map((s) => ({ s, r: document.querySelector(s)?.getBoundingClientRect() }))
    .filter((x) => x.r);
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].r.top < parts[i - 1].r.bottom - 0.5) {
      bad.push(`${parts[i].s} starts above ${parts[i - 1].s} ends`);
    }
  }
  const panel = document.querySelector('.panel');
  const pr = panel?.getBoundingClientRect();
  if (!pr) { bad.push('there is no panel at all'); return bad; }
  // ★ SNIPPED TO THE BOTTOM OF THE SCREEN — the owner's words, measured.
  if (Math.abs(pr.bottom - window.innerHeight) > 1.5) {
    bad.push(`the panel's bottom is at ${Math.round(pr.bottom)} of ${window.innerHeight}`);
  }
  // ⚠️ SCOPED OUTSIDE `.map` AND `.panel`: the canvas and the stop buttons are
  // absolute WITHIN the board, which is the board drawing itself, not a sheet
  // over the page.
  for (const el of document.querySelectorAll('main *')) {
    if (el.closest('.map') || el.closest('.panel')) continue;
    const p = getComputedStyle(el).position;
    if (p === 'fixed' || p === 'absolute') bad.push(`${el.tagName}.${el.className} is ${p}`);
  }
  // ★ AND NOTHING IS IN FRONT OF THE PANEL. Measured by asking the document
  // what is actually on top at the panel's own centre — a z-index comparison
  // would only check what this file already believes about the CSS.
  const onTop = document.elementFromPoint(pr.left + pr.width / 2, pr.top + 4);
  if (onTop && !onTop.closest('.panel')) {
    bad.push(`${onTop.tagName}.${onTop.className} is drawn over the panel`);
  }
  return bad;
});

const tabs = await page.$$eval('nav button', (bs) => bs.map((x) => x.textContent.trim()));
console.log('TABS:', tabs.join(' · '));
if (tabs.length !== 4) misses.push(`expected four tabs, found ${tabs.length}`);

let selfDots = 0;
for (const t of tabs) {
  await page.locator('nav button', { hasText: t }).click({ timeout: 3000 })
    .catch((e) => misses.push(`tab ${t} would not open: ${e}`));
  await page.waitForTimeout(400);
  const bad = await stacked();
  const dots = await page.$$eval('.map .node', (g) => g.length);
  if (t === 'Self') selfDots = dots;
  console.log(`\n${t.toUpperCase()}  ${dots} stops drawn`);
  console.log('  panel  :', `"${(await panelText()).slice(0, 60)}"`);
  console.log('  stacked:', bad.length ? `⚠️ ${bad.join(' | ')}` : 'clean — nothing over anything');
  if (bad.length) misses.push(`${t}: ${bad.join(', ')}`);
  if (!dots) misses.push(`${t} draws nothing at all`);
  // ★ NO NAME PRINTS OVER ANOTHER NAME — the owner's filed bug, measured on
  // every tab. Real maps place labels last and drop the losers; this proves
  // ours actually does.
  //
  // ⚠️ PROVEN RED IN TWO HALVES, NOT END TO END, and here is why. On the map as
  // authored, disabling the hider does NOT produce a true overlap — the route
  // bows and the ±11 stagger keep every label pair ~2px apart vertically, so an
  // end-to-end sabotage has nothing to catch. The MEASURER was proven red by
  // piling every node onto one spot with injected CSS ("Start" prints over
  // "Finish"); the HIDER demonstrably hides (Stop 16's name is dropped in the
  // green screenshot). The day the map gains two same-height neighbours, this
  // is the line that goes red.
  const clash = await page.evaluate(() => {
    const rs = [...document.querySelectorAll('.map .label')]
      .map((e) => ({ t: e.textContent, r: e.getBoundingClientRect() }));
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i].r, b = rs[j].r;
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 3 && y > 3) return `"${rs[i].t}" prints over "${rs[j].t}"`;
      }
    }
    return null;
  });
  if (clash) misses.push(`${t}: ${clash}`);
}

// ★ EACH STAT IS A NODE — the owner, on seeing five stats crammed into one:
// *"that doesn't look right, each stat should be a node."* You, the stop, mana,
// flow, five stats, momentum, next work: eleven nodes.
if (selfDots < 10) misses.push(`Self draws ${selfDots} nodes — the stats are not split out`);

// ★ NO PROSE ABOVE THE BOARD. The owner, three times in one play-test: *"the
// text above the map, i don't want to see it."* The header may carry numbers
// and nothing else, so this measures its HEIGHT — a sentence cannot hide in
// 40 pixels.
const headH = await page.$eval('header', (e) => Math.round(e.getBoundingClientRect().height));
console.log('\nHEADER  ', `${headH}px tall`);
if (headH > 96) misses.push(`the header is ${headH}px — prose has got in above the board again`);

// ★★ THE BOARD TAKES THE SCREEN. The owner: *"the canvas on mobile can take
// more space vertically."* It used to be sized by `aspect-ratio`, so its height
// followed its WIDTH and a tall phone got 655px of board and 190px of nothing.
//
// ⚠️ MEASURED AS A SHARE OF THE VIEWPORT, not in pixels, or the check passes on
// a desktop window and says nothing about the phone it was written for.
const room = await page.evaluate(() => {
  const m = document.querySelector('.map').getBoundingClientRect();
  const p = document.querySelector('.panel').getBoundingClientRect();
  return { h: window.innerHeight, map: Math.round(m.height), bottom: Math.round(m.bottom),
    panel: Math.round(p.height), idle: Math.round(p.top) };
});
console.log('SCREEN  ', `${room.h}px — board ${room.map}px (${Math.round(room.map / room.h * 100)}%),`
  + ` dock ${room.panel}px at rest`);
// ⚠️ THIS SHARE CHECK DID NOT GO RED UNDER THE SABOTAGE, and saying so is the
// point of writing it down. Putting `aspect-ratio` back gave a board of 79% —
// through this threshold without a murmur. It is a floor against a header or a
// tab row growing until the map is a strip, NOT the guard for board sizing.
// The bottom-gap check below is that guard, and it is the one that fired.
if (room.map / room.h < 0.6) {
  misses.push(`the board is only ${Math.round(room.map / room.h * 100)}% of the screen`);
}
// ★ AND THE DEAD SPACE IS GONE. The board must reach the bottom of the screen,
// because the panel is over it rather than under it. PROVEN RED at 45px by
// restoring `aspect-ratio: 1 / 0.92`, which is exactly the regression it is for.
if (room.h - room.bottom > 8) {
  misses.push(`${room.h - room.bottom}px of nothing below the board — it is not taking the height`);
}
// The dock at rest is a hint bar, not a third of the phone.
if (room.panel > room.h * 0.25) {
  misses.push(`the dock is ${room.panel}px with nothing selected — it should be a bar`);
}
// ★ AND NO STOP HIDES BEHIND THE DOCK AT REST. The owner's live screenshot
// caught it: the away-line made the dock taller, the board never re-framed,
// and the Finish sat behind the panel. The whole crossing must be VISIBLE —
// the goal being off-screen is the one decision hidden again.
const drowned = await page.evaluate(() => {
  const top = document.querySelector('.panel').getBoundingClientRect().top;
  return [...document.querySelectorAll('.map .node')]
    .map((n) => ({ id: n.dataset.id, y: n.getBoundingClientRect().top + 22 }))
    .filter((n) => n.y > top + 4).map((n) => n.id);
});
if (drowned.length) misses.push(`${drowned.join(' ')} hidden behind the dock at rest`);

// ------------------------------------------------------------- the chapter --
//
// ★★ THE WHOLE CROSSING IS VISIBLE FROM THE FIRST FRAME. That is the design:
// five or six dotted ways across, and the game is choosing one. If the board
// showed only where you have been there would be no choice to see.
console.log('\nTHE CHAPTER');
await page.locator('nav button', { hasText: 'Chapter' }).click();
await page.waitForTimeout(600);
const allStops = await page.$$eval('.map .node', (g) => g.length);
// ⚠️ `unmade`, NOT `route`. A route you have not built is dashed in `unmade`;
// `route` is the ink a BUILT road is drawn in. Counting the wrong one here
// reported a defect that was not there on the probe's first run — and had the
// board actually stopped drawing the dotted ways, it would have reported
// nothing at all.
const dottedPx = await ink('unmade');
const builtPx = await ink('route');
const groundPx = (await ink('moor')) + (await ink('crag'));
// ★ THE RELIEF, COUNTED ON THE REAL PAGE. Contour lines and region outlines are
// solved in `relief.ts` and checked as geometry in `test/relief.test.ts`, but
// geometry that never reaches the canvas is a unit test passing over a blank
// map — which this project has shipped. These are the pixels.
const reliefPx = await ink('relief');
const edgePx = (await ink('edgewood')) + (await ink('edgewater')) + (await ink('edgemoor'));
// ★★ THE PIPELINE READS AS A PIPELINE. The owner: *"can we have a mana
// pipeline visuals, especially when we start to have to connect to our initial
// dot from offscreen and do some +1 +1 there."* Three visible things: the
// king's road FEED entering from off the top of the map, the flow dashes
// CRAWLING (checked by sampling the same strip twice — a static highlight is
// exactly what this replaced), and a +1 floating off the pin when a whole mana
// lands.
const feedStrip = async () => {
  const you = await page.locator('.map .node.you').first().boundingBox();
  return page.evaluate(([hex, tol, cx]) => {
    const cv = document.querySelector('.map canvas');
    const off = cv.getBoundingClientRect();
    const dpr = cv.width / off.width;
    const x0 = Math.max(0, Math.round((cx - 30 - off.left) * dpr));
    const w = Math.round(60 * dpr);
    const h = Math.round(90 * dpr);
    const d = cv.getContext('2d', { willReadFrequently: true })
      .getImageData(x0, 0, w, h).data;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const hits = [];
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 40 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol
        && Math.abs(d[i + 2] - b) <= tol) hits.push(i / 4);
    }
    return hits;
  }, [INK.flowing, TOL.flowing ?? 12, (you?.x ?? 0) + (you?.width ?? 0) / 2]);
};
const feedA = await feedStrip();
await page.waitForTimeout(450);
const feedB = await feedStrip();
console.log('  feed    :', `${feedA.length}px of flow entering from offscreen, `
  + `${feedA.length && feedA.join() !== feedB.join() ? 'CRAWLING' : 'not moving'}`);
if (feedA.length < 20) misses.push(`only ${feedA.length}px of king's-road feed above the Start`);
else if (feedA.join() === feedB.join()) {
  misses.push('the feed dashes are frozen — the pipeline does not visibly carry');
}
// The +1: mana lands roughly every 3s at the base trickle.
let plussed = false;
for (let i = 0; i < 14 && !plussed; i++) {
  plussed = (await page.locator('.map .plus').count()) > 0;
  if (!plussed) await page.waitForTimeout(700);
}
console.log('  plus    :', plussed ? 'a +1 floated off the pin' : 'no +1 ever appeared');
if (!plussed) misses.push('no +1 floats when a whole mana lands');

// ★ THE COAST. *"the sea somewhere and beaches"* — a band of sea down the west
// edge with a beach line where it meets the land, the first mark on this map
// not centred on a stop. Counted, because decor that stops being drawn fails
// no unit test anywhere.
const seaPx = await ink('sea');
const beachPx = await ink('beach');
console.log('  coast   :', `${seaPx}px of sea, ${beachPx}px of beach`);
if (seaPx < 500) misses.push(`only ${seaPx}px of sea — the coast is not drawn`);
if (beachPx < 100) misses.push(`only ${beachPx}px of beach along it`);
// ★★ AND THE SEA CUTS. The owner: *"sea should cut any lines going through
// it."* The leftmost strip of the board is open water — no contour, no region
// ring, no dotted route may survive there. Counted in the strip, because a
// whole-canvas count cannot tell "cut" from "drawn elsewhere too".
// ⚠️ SELF-LOCATING, AND A VACUOUS FIRST VERSION IS WHY. This started as a fixed
// 18px strip at the canvas edge — which is open water so far offshore that the
// height field has gone flat and NO contour ever reached it: with the mask
// disabled outright it still read 0px and passed. So the boundary is now the
// BEACH THE PAGE ACTUALLY DREW: each sampled row is scanned for the first
// beach-coloured pixel, and land ink west of it is what the sea failed to cut.
//
// ⚠️ AND EVEN THEN, an end-to-end sabotage (mask off) read only 2px — after the
// shoreline was rebased off the stops, today's contours genuinely stop short of
// the water on their own. The measurer is proven red synthetically (a
// relief-coloured line drawn into the sea scored 108px); the mask stands as the
// rule for everything that will reach the water later — region rings, bent
// routes, whatever a coast comes to mean.
const wet = await page.evaluate(([inks, beach]) => {
  const cv = document.querySelector('.map canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, cv.width, cv.height);
  const d = img.data, W = cv.width;
  const at = (x, y) => {
    const i = (y * W + x) * 4;
    return [d[i], d[i + 1], d[i + 2], d[i + 3]];
  };
  const is = (px, hex, tol) => {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return px[3] > 40 && Math.abs(px[0] - r) <= tol && Math.abs(px[1] - g) <= tol
      && Math.abs(px[2] - b) <= tol;
  };
  let bad = 0, rows = 0;
  for (let y = 0; y < cv.height; y += 6) {
    let shore = -1;
    for (let x = 0; x < Math.min(W, 260); x++) {
      if (is(at(x, y), beach, 12)) { shore = x; break; }
    }
    if (shore < 4) continue;
    rows++;
    for (let x = 0; x < shore - 3; x++) {
      const px = at(x, y);
      for (const [hex, tol] of inks) if (is(px, hex, tol)) { bad++; break; }
    }
  }
  return { bad, rows };
}, [[[INK.relief, 12], [INK.edgemoor, 12], [INK.edgewood, 12], [INK.unmade, 6]], INK.beach]);
console.log('  cuts    :', `${wet.bad}px of land ink west of the beach, across ${wet.rows} rows`);
if (wet.rows < 30) misses.push(`the beach was only found on ${wet.rows} rows — the cut check saw no coast`);
if (wet.bad > 30) misses.push(`${wet.bad}px of land ink in open water — the sea is not cutting`);
console.log('  stops   :', allStops);
console.log('  routes  :', `${dottedPx}px dotted, ${builtPx}px built`);
console.log('  ground  :', `${groundPx}px of terrain under it`);
console.log('  relief  :', `${reliefPx}px of contour, ${edgePx}px of region outline`);
if (reliefPx < 300) misses.push(`only ${reliefPx}px of contour line — the isolines are not drawn`);
if (edgePx < 200) misses.push(`only ${edgePx}px of region outline — the regions are not drawn`);
if (allStops < 20) misses.push(`only ${allStops} stops on the chapter — the crossing is not all there`);
if (dottedPx < 200) misses.push(`only ${dottedPx}px of dotted route — the ways across are not drawn`);
if (!groundPx) misses.push('the chapter draws no ground — the terrain layer is not painting');
// ⚠️ SHOT ON PURPOSE. The chapter is the whole design in one picture and no
// number in this file can tell you whether it reads. Rule 2 is "look at the
// screenshot", and this is the one to look at.
await page.screenshot({ path: SHOT.replace(/\.png$/, '-chapter.png') });

// ------------------------------------------------------------------ mana ----
//
// ★ IT ARRIVES BECAUSE TIME PASSED, and there is nothing to press. An idle game
// whose resource does not move while you watch is not one.
console.log('\nMANA');
await page.locator('nav button', { hasText: 'Here' }).click();
await page.waitForTimeout(300);
const rate = await page.$eval('.purse .rate', (e) => e.textContent.trim());
const mana0 = await purse();
await page.waitForTimeout(16000);
const mana1 = await purse();
console.log('  rate    :', rate);
console.log('  purse   :', `${mana0} → ${mana1} across 16s`);
if (!/^\+\d+\.\d\d a second$/.test(rate)) misses.push(`the rate reads "${rate}"`);
if (!(mana1 > mana0)) misses.push(`mana went ${mana0} → ${mana1} in 16 seconds — it is not arriving`);

// --------------------------------------------------------- laying a road ----
//
// ★★ THE ONE THAT MATTERS. Wait for the mana, tap the stop beside you, lay the
// pipe, watch the line FILL, then walk it. Everything else in the game is this
// with weather on top, and if it does not happen on screen nothing does.
console.log('\nLAYING A PIPE');
await pick('.map .node.you');
await page.waitForTimeout(200);

/** The stops beside the one you stand on, as data-ids, cheapest first by what
 *  their deed says. Read from the page, never from a copy of the map. */
const neighbours = await page.$$eval('.map .node[data-id^="stop:"]', (ns) =>
  ns.filter((n) => !n.classList.contains('you')).map((n) => n.dataset.id));
console.log('  beside  :', neighbours.join(' ') || '(nothing)');
if (!neighbours.length) misses.push('there is nothing beside you to build toward');

/** Tap a stop and read back the deed it offers. */
async function deedOn(id) {
  await pick(`.map .node[data-id="${id}"]`);
  await page.waitForTimeout(120);
  return page.$eval('.deed', (e) => ({
    text: e.textContent.replace(/\s+/g, ' ').trim(), off: e.disabled,
  })).catch(() => null);
}

// ★ A ROAD YOU CANNOT AFFORD SAYS SO, IN MANA, not "you cannot do that".
// ⚠️ AND THE SHUT ONE IS CAPTURED HERE so it can be compared with the SAME
// button once it is live. The last version of this check compared two DIFFERENT
// buttons, which differ in colour anyway, and stayed green with the bug put
// back — a sabotage proved it vacuous. Same button, two states, or nothing.
const target = neighbours[0];
const first = await deedOn(target);
console.log('  offers  :', first ? `"${first.text}"${first.off ? ' [shut]' : ''}` : '(nothing)');
if (!first) misses.push('tapping the stop beside you offers no deed at all');
else if (!/^Lay the pipe to /.test(first.text)) {
  misses.push(`the deed does not offer to lay a pipe: "${first.text}"`);
}
// ★ THE ROUTE IS PLANNED, NOT GUESSED: every lay quotes what the leg climbs,
// off the height grid — the owner: *"our routes are planned and we know the
// steepness and so on."*

const shutBg = await page.evaluate(() => {
  const x = [...document.querySelectorAll('.deed')].find((e) => e.disabled);
  return x ? getComputedStyle(x).backgroundColor : null;
});
if (first?.off && !/\d+ mana — you have \d+/.test(first.text)) {
  misses.push(`a road you cannot afford does not say the price: "${first.text}"`);
}
console.log('  shut bg :', shutBg ?? '(it was already affordable)');

// Wait it out. Short timers, so this is seconds rather than a coffee break.
let live = first;
for (let i = 0; i < 30 && (!live || live.off); i++) {
  await page.waitForTimeout(3000);
  live = await deedOn(target);
}
console.log('  after   :', live ? `"${live.text}"${live.off ? ' [still shut]' : ' (OPEN)'}` : '(gone)');
if (live && !/climbs \d+/.test(live.text)) {
  misses.push(`the lay deed does not say what the leg climbs: "${live.text}"`);
}
if (!live || live.off) {
  misses.push(`never able to afford the first road: "${live?.text ?? 'no deed'}"`);
} else {
  const liveBg = await page.evaluate(() => {
    const x = [...document.querySelectorAll('.deed')].find((e) => !e.disabled
      && /^Lay the pipe/.test(e.textContent.trim()));
    return x ? getComputedStyle(x).backgroundColor : null;
  });
  console.log('  live bg :', liveBg ?? '(none)');
  if (shutBg && liveBg && shutBg === liveBg) {
    misses.push(`the same button draws ${shutBg} shut and ${liveBg} live — nothing says it was dead`);
  }

  const fill0 = await ink('fill');
  await page.locator('.deed', { hasText: 'Lay the pipe' }).first().click({ timeout: 3000 });
  await page.waitForTimeout(1600);
  const laying = await panelText();
  const fillMid = await ink('fill');
  console.log('  says    :', `"${laying.slice(0, 90)}"`);
  console.log('  filling :', `${fill0}px → ${fillMid}px of made road`);
  if (!/\d+s left/.test(laying)) misses.push(`nothing says how long the road has left: "${laying.slice(0, 60)}"`);
  // ⚠️ THE ROAD GOING IN IS DRAWN GOING IN. A build that only happens in the
  // state is a timer with a number beside it, not a road being laid.
  if (!(fillMid > fill0)) misses.push(`the road is not visibly filling: ${fill0}px then ${fillMid}px`);

  // ★★ AND IT FILLS FROM YOUR END. Reported broken twice: *"the line being
  // made solid starts from the wrong side."* Early in the build, the fill ink
  // must cluster round the pin, not round the far stop — a whole-canvas count
  // cannot see the difference, so this one counts in two windows.
  const nearMe = await inkNear('fill', '.map .node.you', 40);
  const nearFar = await inkNear('fill', `.map .node[data-id="${target}"]`, 40);
  console.log('  fills   :', `${nearMe}px by the pin, ${nearFar}px by the far stop`);
  if (nearMe >= 0 && nearFar >= 0 && nearMe <= nearFar) {
    misses.push(`the fill grows from the far side: ${nearMe}px by you, ${nearFar}px by ${target}`);
  }

  await page.screenshot({ path: SHOT.replace(/\.png$/, '-laying.png') });

  // ★★ TROUBLE ON THE LINE. The owner's design: hidden stops on a fresh lay
  // that "block progress until resolved". The work must HALT, the dock must
  // name the trouble, the dice must be shown doing arithmetic in the open, and
  // resolving must set the work moving again. Every fresh lay meets at least
  // one, so this is not an if — the build cannot finish without it.
  console.log('\nTROUBLE');
  let faced = 0;
  for (let i = 0; i < 30; i++) {
    const face = page.locator('.deed.face');
    if (!await face.count()) { await page.waitForTimeout(1200); continue; }
    const said = await panelText();
    if (/You rolled \d/.test(said)) {
      // The result phase: dice arithmetic, tier in words, then carry on.
      console.log('  dice    :', `"${said.slice(0, 110)}"`);
      if (!/against \d+ and \d+/.test(said)) {
        misses.push(`the dice line does not show the arithmetic: "${said.slice(0, 80)}"`);
      }
      if (!/(strong hit|weak hit|miss)/.test(said)) {
        misses.push(`the roll landed but no tier is named: "${said.slice(0, 80)}"`);
      }
      await page.locator('.deed.face', { hasText: 'Carry on' }).click({ timeout: 3000 });
      await page.waitForTimeout(400);
      faced++;
      if (faced > 3) break;
      continue;
    }
    // The choice phase: the trouble is named and every choice shows its stat.
    console.log('  faces   :', `"${said.slice(0, 90)}"`);
    await page.screenshot({ path: SHOT.replace(/\.png$/, '-trouble.png') });
    if (!/against two/.test(said)) {
      misses.push(`a choice does not say what it rolls: "${said.slice(0, 80)}"`);
    }
    await face.first().click({ timeout: 3000 });
    await page.waitForTimeout(400);
  }
  if (!faced) misses.push('the lay finished without ever meeting its hidden stop');

  // ★★ A FINISHED LAY CARRIES YOU OVER. The owner: *"obviously when we build a
  // road somewhere we arrive there too."* So the probe does NOT walk — it waits,
  // and the pin must cross on its own.
  let arrived = false;
  for (let i = 0; i < 25 && !arrived; i++) {
    await page.waitForTimeout(2000);
    const you = await page.$eval('.map .node.you', (n) => n.dataset.id).catch(() => null);
    arrived = you === target;
  }
  const madeAfter = await ink('route');
  // ★ A BUILT ROAD IS CASED — outline under core, the thing that makes a map
  // line read as a line. Counted, because a casing that stops being drawn is
  // invisible in the state and in every unit test.
  const casedPx = await ink('casing');
  const standing = await page.$$eval('.map .node.you .label', (t) => t.map((x) => x.textContent));
  console.log('  built   :', `${madeAfter}px of made road, ${casedPx}px of casing under it`);
  if (casedPx < 80) misses.push(`only ${casedPx}px of casing — built roads are not outlined`);
  console.log('  standing:', standing.join(' ') || '(nowhere)');
  if (!arrived) misses.push('the pipe went in and you never arrived at the far end');
  if (madeAfter < 60) misses.push(`only ${madeAfter}px of built road on the board — it did not stay drawn`);
  // ★ AND WALKING BACK IS FREE. The mana went into making it.
  const paidBefore = await purse();
  const back = await deedOn('stop:0');
  if (back && /^(Go|Back) to /.test(back.text) && !back.off) {
    await page.locator('.deed').first().click({ timeout: 3000 });
    await page.waitForTimeout(400);
    const paidAfter = await purse();
    console.log('  walked  :', `${paidBefore} → ${paidAfter} mana crossing back`);
    if (paidAfter < paidBefore) {
      misses.push(`walking a built road cost ${paidBefore - paidAfter} mana — it is meant to be free`);
    }
    // and return, so the widening section stands where it expects to.
    await deedOn(target);
    await page.locator('.deed').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  } else {
    misses.push(`no way to walk back along the pipe: "${back?.text ?? 'no deed'}"`);
  }

  // ★ THE PIN. *"i also want an icon for our character."* A pin has a HEAD that
  // stands well above the stop; the old disc never put this ink that high. So
  // the check is where the ink is, not how much of it there is — a count alone
  // could not tell a pin from a slightly bigger dot.
  const bb = await page.locator('.map .node.you').first().boundingBox();
  // ⚠️ THE WINDOW STARTS AT −15, NOT −9, AND A SABOTAGE IS WHY. The halo round
  // the pin is stroked at alpha 0.2 — and on the parts of the canvas nothing
  // else has painted, getImageData returns its UNBLENDED colour: pure `you` ink
  // at alpha 51, which cleared the 40-alpha floor. With the pin deleted, the
  // halo alone put 265px in a −9..−22 window and the check stayed green. The
  // halo reaches −14; the pin's head spans −5..−20; only above −15 do they part.
  const head = bb ? await inkedIn(INK.you, TOL.you ?? 12, {
    x0: bb.x + bb.width / 2 - 12, y0: bb.y + bb.height / 2 - 22,
    x1: bb.x + bb.width / 2 + 12, y1: bb.y + bb.height / 2 - 15 }) : -1;
  console.log('  pin     :', `${head}px of pin-head above the stop`);
  if (head < 40) misses.push(`no pin head above where you stand (${head}px) — the marker is still a dot`);
}

// ------------------------------------------------------- widening a road ----
//
// ★★ THE SECOND VERB, AND THE REASON THE PIPE ECONOMY EXISTS. The owner:
// *"maybe we are not laying roads, but laying like a mana ways like pipes… this
// way it's less boring and gives us more options."* Before this there was one
// thing to do with a road. The check is that the option is REACHABLE by tapping
// and that taking it visibly changes the rate — a widening that only happens in
// the state is the same one verb with extra arithmetic.
console.log('\nWIDENING');
const rateNow = () => page.$eval('.purse .rate', (e) => Number(e.textContent.match(/[\d.]+/)[0]));
const rate0 = await rateNow();
// Standing at the far end, the road you came along is the one to widen.
await pick('.map .node.you');
await page.waitForTimeout(200);
const backTo = (await page.$$eval('.map .node[data-id^="stop:"]', (ns) =>
  ns.filter((n) => !n.classList.contains('you')).map((n) => n.dataset.id)))[0];
let wide = backTo ? await deedOn(backTo) : null;
// The walk deed comes first on a laid road; the widen deed is the other one.
const deedTexts = await page.$$eval('.deed', (bs) =>
  bs.map((x) => ({ t: x.textContent.replace(/\s+/g, ' ').trim(), off: x.disabled })));
console.log('  offers  :', deedTexts.map((d) => `"${d.t}"${d.off ? ' [shut]' : ''}`).join('  |  ') || '(nothing)');
console.log('  rate    :', `${rate0} a second on gauge 1`);
const widen = deedTexts.find((d) => /^Widen the pipe/.test(d.t));
if (!widen) {
  misses.push('a pipe you have laid offers no way to widen it — the second verb is unreachable');
} else {
  if (!/\(1 of \d\)/.test(widen.t)) misses.push(`the widen deed does not say how wide it is: "${widen.t}"`);
  // ⚠️ THE "CARRIES" LINE IS ONLY ON THE DEED YOU CAN TAKE. A shut deed shows
  // its REASON in that slot instead — which is right (R3.3) and is why the
  // first version of this check reported a defect that was not there, reading
  // "26 mana — you have 4" and complaining it was not a bore.
  let openText = '';
  // Wait it out and take it.
  let took = false;
  for (let i = 0; i < 40; i++) {
    const btn = page.locator('.deed', { hasText: 'Widen the pipe' }).first();
    if (await btn.count() && !await btn.isDisabled()) {
      openText = (await btn.textContent()).replace(/\s+/g, ' ').trim();
      await btn.click({ timeout: 3000 });
      took = true;
      break;
    }
    await page.waitForTimeout(3000);
    await pick('.map .node.you');
    if (backTo) await deedOn(backTo);
  }
  if (!took) misses.push('never able to afford widening the first pipe');
  else {
    console.log('  open    :', `"${openText}"`);
    if (!/carries [\d.]+ a second/.test(openText)) {
      misses.push(`the widen deed does not say what it would carry: "${openText}"`);
    }
    for (let i = 0; i < 25 && (await rateNow()) <= rate0; i++) await page.waitForTimeout(2000);
    const rate1 = await rateNow();
    console.log('  widened :', `${rate0} → ${rate1} a second`);
    // ★ THE POINT. A wider pipe delivers more, and the header says so.
    if (!(rate1 > rate0)) {
      misses.push(`widening the road changed nothing: still ${rate1} a second`);
    }
    const busyPx = await ink('flowing');
    console.log('  load    :', `${busyPx}px of underlay showing what it carries`);
    if (!busyPx) {
      misses.push('nothing on the board shows what a road is carrying — the pipes are invisible');
    }
    await page.screenshot({ path: SHOT.replace(/\.png$/, '-widened.png') });
  }
}

// ------------------------------------------- you cannot build from the middle -
//
// ★★ THE RULE THE WHOLE OPENING EXISTS TO SET UP, and the one thing playing
// forward can never reach — you cannot walk into the middle without building
// your way there, which is the point. So the save is written directly: standing
// far from the king's road, purse full, and it must still refuse.
//
// ⚠️ SAID OUT LOUD: this proves the refusal REACHES THE SCREEN in the player's
// words. That it holds in the engine is `test/roads.test.ts`, which is where the
// property belongs.
console.log('\nOUT IN THE MIDDLE');
await page.evaluate(() => new Promise((done, fail) => {
  const req = indexedDB.open('semantic-drift', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('saves');
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('saves', 'readwrite');
    tx.objectStore('saves').put(JSON.stringify({
      // ⚠️ SAVED TWO HOURS AGO ON PURPOSE. The away line ("Away 2.0 hours — N
      // mana gathered") makes the dock TALL at rest — which is exactly the
      // state the owner's live screenshot caught: the board framed itself
      // before the dock reported its height, and the Finish drowned behind it.
      v: 7, savedAt: Date.now() - 2 * 3600 * 1000,
      game: { version: 7, at: 6, seen: [0, 6], gauge: {}, mana: 9999, part: 0, building: null },
    }), 'main');
    tx.oncomplete = () => { db.close(); done(); };
    tx.onerror = () => fail(tx.error);
  };
  req.onerror = () => fail(req.error);
}));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.map canvas');
await page.waitForTimeout(800);
await page.locator('nav button', { hasText: 'Here' }).click();
await page.waitForTimeout(400);
const rich = await purse();
await pick('.map .node.you');
await page.waitForTimeout(200);
const far = await page.$$eval('.map .node[data-id^="stop:"]', (ns) =>
  ns.filter((n) => !n.classList.contains('you')).map((n) => n.dataset.id));
const refused = far.length ? await deedOn(far[0]) : null;
console.log('  purse   :', `${rich} mana in hand`);
console.log('  offers  :', refused ? `"${refused.text}"${refused.off ? ' [shut]' : ' (OPEN)'}` : '(nothing)');
if (rich < 999) {
  misses.push(`the save did not load — purse reads ${rich}, so this check proved nothing`);
} else if (!refused) {
  misses.push('out in the middle there is no deed at all, so nothing explains why');
} else if (!refused.off) {
  misses.push(`a road can be built out where no mana reaches: "${refused.text}"`);
} else if (!/no mana reaches here/.test(refused.text)) {
  misses.push(`the refusal does not say why: "${refused.text}"`);
}

// ★★ WITH THE TALL DOCK, THE WHOLE CROSSING IS STILL VISIBLE. The away line
// roughly doubles the dock, and the board must re-frame for it — the owner's
// live screenshot had the Finish hidden behind exactly this dock.
//
// ⚠️ NOT PROVEN RED AT THIS VIEWPORT, and saying so rather than pretending. At
// 390x844 the fit is width-bound with ~180px of vertical slack, so even with
// the inset ignored outright (`usable = cssH`) every stop stayed clear of the
// tall dock and this check stayed green. The ordering bug it guards was real —
// the board framed itself before the dock reported its height and never
// re-framed — and shows on aspect ratios with less slack, which is where the
// owner's phone lives. This is the tripwire for the day the map grows taller.
await page.locator('nav button', { hasText: 'Chapter' }).click();
await page.waitForTimeout(600);
const dockSaid = await panelText();
console.log('\nTHE TALL DOCK');
console.log('  says    :', `"${dockSaid.slice(0, 60)}"`);
if (!/Away /.test(dockSaid)) {
  misses.push('the away line never appeared — the tall-dock check tested nothing');
}
const drowned2 = await page.evaluate(() => {
  const top = document.querySelector('.panel').getBoundingClientRect().top;
  return [...document.querySelectorAll('.map .node')]
    .map((n) => ({ id: n.dataset.id, y: n.getBoundingClientRect().top + 22 }))
    .filter((n) => n.y > top + 4).map((n) => n.id);
});
console.log('  visible :', drowned2.length ? `⚠️ ${drowned2.join(' ')} behind the dock` : 'every stop above the dock');
if (drowned2.length) misses.push(`${drowned2.join(' ')} hidden behind the TALL dock — the board did not re-frame`);

await page.screenshot({ path: SHOT });
console.log(`\nscreenshot → ${SHOT}`);
if (misses.length) { console.log('\n⚠️ PROBLEMS'); for (const m of misses) console.log('  ', m); }
await b.close();
process.exit(misses.length ? 1 : 0);
