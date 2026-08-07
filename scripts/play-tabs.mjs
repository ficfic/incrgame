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

/** ⚠️ INJECT A SAVE AND PROVE IT TOOK. `page.reload` fires the app's own
 *  pagehide flush, whose async IndexedDB write can land AFTER the probe's and
 *  put the live game straight back — a race this probe has genuinely lost on
 *  green-looking runs. So: write, reload, VERIFY against the page, and go
 *  again when the flush wins. `blob` is a factory so time-relative saves
 *  (savedAt two hours ago) are minted fresh per attempt. */
async function loadSave(blob, verify) {
  for (let tries = 0; tries < 4; tries++) {
    await page.evaluate((json) => new Promise((done, fail) => {
      const req = indexedDB.open('semantic-drift', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('saves');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('saves', 'readwrite');
        tx.objectStore('saves').put(json, 'main');
        tx.oncomplete = () => { db.close(); done(); };
        tx.onerror = () => fail(tx.error);
      };
      req.onerror = () => fail(req.error);
    }), JSON.stringify(blob()));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.map canvas');
    await page.waitForTimeout(600);
    if (await verify()) return true;
  }
  return false;
}
const labelsNow = () => page.$$eval('.map .label', (ls) => ls.map((l) => l.textContent.trim()));

/** ⚠️ SELECT, DO NOT TOGGLE. Tapping a stop that is already selected CLEARS the
 *  selection — R3.4, and correct. It also means a probe that taps blind can
 *  deselect the very thing it is about to read, which has cost a run before. */
async function pick(sel) {
  const el = page.locator(sel).first();
  if (!(await el.count())) return;
  if (((await el.getAttribute('class')) ?? '').split(/\s+/).includes('on')) return;
  try {
    await el.click({ timeout: 1500 });
    await page.waitForTimeout(250);
    return;
  } catch { /* under the dock */ }
  // ★ THE KEYBOARD PATH, when the dock covers a low stop: every node takes
  // Enter (Board.svelte's own accessibility handler), which is a real way a
  // player can reach it — no force-clicks, no faked coordinates.
  await el.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
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

// ----------------------------------------------------------------- the fog --
//
// ★★ THE FOG OF WAR, on a FRESH game. The owner reversed the old visible-from-
// frame-one rule: *"can we do fog of war maybe."* The rule's point survives as
// the skeleton — every dot and dotted route drawn — while the LAND and the
// NAMES exist only within your ken. Three pixels-and-DOM facts, each of which
// dies to a different sabotage: the veil is painted in bulk, the veil has a
// HOLE where you stand, and the far names are not printed.
console.log('\nTHE FOG');
await page.locator('nav button', { hasText: 'Chapter' }).click();
await page.waitForTimeout(600);
const fogPx = await ink('fog');
const fogAtPin = await inkNear('fog', '.map .node.you', 55);
const fogLabels = await page.$$eval('.map .label', (ls) => ls.map((l) => l.textContent.trim()));
const fogDots = await page.$$eval('.map .node', (g) => g.length);
console.log('  veil    :', `${fogPx}px of uncharted parchment`);
console.log('  hole    :', `${fogAtPin}px of fog within 55px of the pin`);
console.log('  named   :', fogLabels.join(' · ') || '(nothing)');
console.log('  dots    :', `${fogDots} stops still drawn under it`);
if (fogPx < 50000) misses.push(`only ${fogPx}px of fog on a fresh game — the veil is not drawn`);
if (fogAtPin > 60) misses.push(`${fogAtPin}px of fog on top of the pin — no hole where you stand`);
if (!fogLabels.includes('Start')) misses.push('the Start is not named inside your ken');
if (fogLabels.includes('Finish')) misses.push('the Finish is named through the fog');
if (fogLabels.length > 8) misses.push(`${fogLabels.length} names printed on a fresh chart — the fog hides nothing`);
if (fogDots < 20) misses.push(`only ${fogDots} dots under the fog — the skeleton went missing with the names`);
await page.screenshot({ path: SHOT.replace(/\.png$/, '-fog.png') });

// ------------------------------------------------------------- the chapter --
//
// ★★ THE WHOLE CROSSING'S SKELETON IS VISIBLE FROM THE FIRST FRAME; the full
// chart is what a FINISHED chapter looks like, so everything map-wide below is
// counted on a fully charted save — every stop stood at, fog gone for good.
console.log('\nTHE CHAPTER (charted)');
const stopIds = await page.$$eval('.map .node[data-id^="stop:"]',
  (ns) => ns.map((n) => Number(n.dataset.id.split(':')[1])));
const tookCharted = await loadSave(
  () => ({ v: 8, savedAt: Date.now(),
    game: { version: 8, at: 0, seen: stopIds, gauge: {}, mana: 0, part: 0, building: null } }),
  async () => (await labelsNow()).includes('Finish'));
if (!tookCharted) misses.push('the fully charted save never loaded — the chapter counts below prove nothing');
await page.locator('nav button', { hasText: 'Chapter' }).click();
await page.waitForTimeout(600);
// ★ AND THE FOG IS GONE FOR GOOD: a finished chapter earns its finished chart.
const fogCharted = await ink('fog');
const chartedLabels = await page.$$eval('.map .label', (ls) => ls.map((l) => l.textContent.trim()));
console.log('  lifted  :', `${fogCharted}px of fog with every stop stood at; `
  + `${chartedLabels.length} names, Finish ${chartedLabels.includes('Finish') ? 'named' : 'MISSING'}`);
if (fogCharted > 400) misses.push(`${fogCharted}px of fog on a fully charted game — it never lifts`);
if (!chartedLabels.includes('Finish')) misses.push('the Finish is nameless on a charted map');
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

// ---- back to a fresh run: the play-through below starts from nothing -------
const tookFresh = await loadSave(
  () => ({ v: 8, savedAt: Date.now(),
    game: { version: 8, at: 0, seen: [0], gauge: {}, mana: 0, part: 0, building: null } }),
  async () => !(await labelsNow()).includes('Finish'));
if (!tookFresh) misses.push('the fresh save never loaded — the play-through below starts mid-chart');

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

// ★★ AND IT ANSWERS THE THUMB. The owner: *"you have to tap, tap, tap in order
// to get it, and this is your idle element."* Ten presses of the spring are
// worth 10 × TAP = 4 whole mana — measured against the purse, with a ±1
// allowance for the trickle crossing a whole on its own during the burst.
console.log('\nTHE SPRING');
const preTap = await purse();
for (let i = 0; i < 10; i++) await page.locator('.spring').click();
const postTap = await purse();
console.log('  tapped  :', `${preTap} → ${postTap} across 10 presses`);
if (postTap - preTap < 4 || postTap - preTap > 5) {
  misses.push(`ten presses of the spring paid ${postTap - preTap} mana — wanted 4`);
}
// ★ AND THE BUTTON SAYS WHAT A PRESS IS WORTH — the affordance the owner
// found missing twice, once as "too small" and once as "unclear you can tap".
const springSays = await page.$eval('.spring', (e) => e.textContent.replace(/\s+/g, ' ').trim());
console.log('  says    :', `"${springSays}"`);
if (!/\+0\.4 a tap/.test(springSays)) {
  misses.push(`the spring does not say what a tap is worth: "${springSays}"`);
}

// ★★ START OVER ASKS FIRST. The owner: *"doesn't have any confirmation, so
// it's very easy to accidentally lose progress."* One tap arms, says so on the
// button, and disarms itself — the purse must survive the whole exchange.
console.log('\nSTART OVER');
// ★ The housekeeping lives behind the gear now — the owner: *"I don't need
// buttons to copy save, load save, and start over in the main GUI."*
if (!(await page.locator('.reset:not(.gear):not(.porter)').count())) {
  await page.locator('.reset.gear').click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(200);
}
const beforeArm = await purse();
await page.locator('.reset:not(.porter):not(.gear)').click({ timeout: 3000 });
const armed = await page.$eval('.reset:not(.porter):not(.gear)', (e) => e.textContent.trim());
console.log('  armed   :', `"${armed}"`);
if (!/Tap again/.test(armed)) misses.push(`one tap of Start over does not ask: "${armed}"`);
await page.waitForTimeout(3400);
const disarmed = await page.$eval('.reset:not(.porter):not(.gear)', (e) => e.textContent.trim());
const afterArm = await purse();
console.log('  disarms :', `"${disarmed}", purse ${beforeArm} → ${afterArm}`);
if (!/Start over/.test(disarmed)) misses.push(`the armed wipe never disarms: "${disarmed}"`);
if (afterArm < beforeArm) {
  misses.push(`one tap and a wait wiped the run — purse fell ${beforeArm} → ${afterArm}`);
}
// ★ EXPORT/IMPORT — the one save guarantee, flagged missing twice by the
// genre review. The buttons must exist; the law behind them is vitest's.
const porters = await page.$$eval('.reset.porter', (bs) => bs.map((b) => b.textContent.trim()));
console.log('  ports   :', porters.join(' · ') || '(none)');
if (!porters.includes('Copy save') || !porters.includes('Load a save')) {
  misses.push('export/import buttons are missing from the header');
}

// -------------------------------------------------------------- the camp ----
//
// ★★ THE BASECAMP LOOP, 2026-08-07 — the owner's sketch: *"we must have
// something to do at the stops in order to prepare for the expedition."*
// On the fresh save: the camp offers its jobs, a gated road says plainly
// what the camp is short of, gathering pays makings, a played hunt pays
// provisions, and twelve makings later the same road stops calling the
// camp short. Then the days run out, visibly.
console.log('\nTHE CAMP');
await page.locator('nav button', { hasText: 'Here' }).click();
await page.waitForTimeout(300);
await pick('.map .node.you');
await page.waitForTimeout(200);
const campDeeds = await page.$$eval('.deed', (es) => es
  .map((e) => e.textContent.replace(/\s+/g, ' ').trim())
  .filter((t) => /^(Hunt for the larder|Gather makings)/.test(t)));
console.log('  offers  :', campDeeds.map((t) => `"${t.slice(0, 62)}"`).join('\n            ') || '(no camp work)');
if (campDeeds.length !== 2) misses.push(`the camp offers ${campDeeds.length} jobs, wanted Hunt and Gather`);
if (!campDeeds.some((t) => /\d+ left/.test(t))) misses.push('no camp deed says how many days are left');
const gatedBefore = await deedOn('stop:6');
console.log('  gated   :', gatedBefore ? `"${gatedBefore.text.slice(0, 70)}"${gatedBefore.off ? ' [shut]' : ''}` : '(no deed)');
if (!gatedBefore || !/the camp is short — 12 makings/.test(gatedBefore.text)) {
  misses.push(`the makings road does not say what the camp is short of: "${gatedBefore?.text.slice(0, 70)}"`);
}
const stores = async (i) => parseInt(
  (await page.$$eval('.keep', (ks) => ks.map((k) => k.textContent)))[i] ?? 'x', 10);
// Two gathered days: four makings, no dice, no scene.
for (let i = 0; i < 2; i++) {
  await pick('.map .node.you');
  await page.locator('.deed', { hasText: 'Gather makings' }).click({ timeout: 2000 });
  await page.waitForTimeout(150);
}
const mak2 = await stores(1);
console.log('  gathered:', `${mak2} makings across two days`);
if (mak2 !== 4) misses.push(`two gathers paid ${mak2} makings, wanted 4`);
// One hunted day, PLAYED: the scene dock, stalked with a head.
const prov0 = await stores(0);
await pick('.map .node.you');
await page.locator('.deed', { hasText: 'Hunt for the larder' }).click({ timeout: 2000 });
await page.waitForTimeout(250);
if (!/The hunt/.test(await panelText())) misses.push('the hunt did not open as a scene in the dock');
await page.screenshot({ path: SHOT.replace(/\.png$/, '-camp.png') });
for (let i = 0; i < 24 && /The hunt/.test(await panelText()); i++) {
  const wary = parseInt(await page.$eval('[data-bar="wary"]', (e) => e.style.width)
    .catch(() => '0'), 10);
  const stalk = page.locator('.deed.face', { hasText: 'Stalk closer' });
  if (wary > 45 || !(await stalk.count())) {
    await page.locator('.deed.face', { hasText: 'Hold and wait' }).click({ timeout: 1200 }).catch(() => {});
  } else {
    await stalk.click({ timeout: 1200 }).catch(() => {});
  }
  await page.waitForTimeout(120);
}
const prov1 = await stores(0);
console.log('  hunted  :', `provisions ${prov0} → ${prov1}`);
if (!(prov1 > prov0)) misses.push(`a played hunt paid nothing: provisions ${prov0} → ${prov1}`);
// Four more gathered days light the makings road's profile.
for (let i = 0; i < 4; i++) {
  await pick('.map .node.you');
  await page.locator('.deed', { hasText: 'Gather makings' }).click({ timeout: 2000 });
  await page.waitForTimeout(120);
}
const gatedAfter = await deedOn('stop:6');
console.log('  earned  :', gatedAfter ? `"${gatedAfter.text.slice(0, 70)}"` : '(no deed)');
if (gatedAfter && /the camp is short/.test(gatedAfter.text)) {
  misses.push(`twelve makings in hand and the road still calls the camp short: "${gatedAfter.text.slice(0, 60)}"`);
}
// And the seventh day was the last: the ground is worked out, and says so.
await pick('.map .node.you');
await page.waitForTimeout(150);
const workedOut = await page.$$eval('.deed', (es) => es
  .map((e) => e.textContent.replace(/\s+/g, ' ').trim())
  .filter((t) => /this ground is worked out/.test(t)));
console.log('  spent   :', `${workedOut.length} jobs now refuse — the days are gone`);
if (workedOut.length !== 2) misses.push('seven days spent and the camp does not say it is worked out');

// ------------------------------------------------------------- scavenging ----
//
// ★★ THE TRADE: time at a stop for provisions, stat chosen going in, dice at
// the end — the owner: *"so, like, scavenge for provisions."* The whole loop
// must happen ON SCREEN: the deed says its stat and its price, the countdown
// is visible, the reveal shows the arithmetic, and the header's provisions
// count moves by exactly what the named tier pays.
console.log('\nSCAVENGING');
const keepCount = () => page.$eval('.purse .keep', (e) => Number(e.textContent.match(/\d+/)[0]));
await pick('.map .node.you');
await page.waitForTimeout(200);
const packsBefore = await keepCount();
const scav = page.locator('.deed', { hasText: 'Scavenge the open ground' });
if (!await scav.count()) {
  misses.push('standing idle at a stop offers no way to scavenge');
} else {
  const scavNote = (await scav.textContent()).replace(/\s+/g, ' ').trim();
  console.log('  offers  :', `"${scavNote}"`);
  if (!/wits \d+ · \d+s/.test(scavNote)) {
    misses.push(`the scavenge deed does not say its stat and its price: "${scavNote}"`);
  }
  await scav.click({ timeout: 3000 });
  await page.waitForTimeout(400);
  const counting = await panelText();
  console.log('  serving :', `"${counting.slice(0, 70)}"`);
  if (!/Scavenging — \d+s left/.test(counting)) {
    misses.push(`no countdown while the crew is out: "${counting.slice(0, 60)}"`);
  }
  // ⚠️ AND THE TIME IS A WALL, NOT A SUGGESTION: the reveal must not exist yet.
  if (await page.locator('.deed.face', { hasText: 'See what the crew found' }).count()) {
    misses.push('the reveal is offered before the time is served');
  }
  await page.screenshot({ path: SHOT.replace(/\.png$/, '-scavenge.png') });
  let seen = false;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(1000);
    if (await page.locator('.deed.face', { hasText: 'See what the crew found' }).count()) { seen = true; break; }
  }
  if (!seen) misses.push('the scavenge never came home — no reveal after the time was served');
  else {
    await page.locator('.deed.face', { hasText: 'See what the crew found' }).click({ timeout: 3000 });
    await page.waitForTimeout(400);
    const told = await panelText();
    console.log('  found   :', `"${told.slice(0, 130)}"`);
    // ⚠️ ANCHORED TO THE DICE SENTENCE. The shadow deed's own note says "a
    // miss gets you caught", and an unanchored match read THAT as the tier.
    const tier = (told.match(/against \d+ and \d+ — a (strong hit|weak hit|miss)/) ?? [])[1];
    if (!/You rolled \d+ \+ wits \d+ = \d+, against \d+ and \d+/.test(told) || !tier) {
      misses.push(`the reveal does not show its arithmetic: "${told.slice(0, 90)}"`);
    } else {
      const packsAfter = await keepCount();
      const matched = /a strong hit\. \+3/.test(told);
      // PROV_CAP is 24 since the camp economy — the old 10 was Ironsworn's.
      const want = tier === 'strong hit' ? Math.min(24, packsBefore + (matched ? 3 : 2))
        : tier === 'weak hit' ? Math.min(24, packsBefore + 1) : packsBefore;
      console.log('  packs   :', `${packsBefore} → ${packsAfter} on ${tier}`);
      if (packsAfter !== want) {
        misses.push(`a ${tier} paid ${packsAfter - packsBefore} provisions — the header disagrees with the dice`);
      }
    }
  }
}

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
// ★ THE FIRST OPEN ROAD, not the first road: three roads out of the start
// carry camp profiles now, and their deeds say "the camp is short" until
// the camp is worked. The probe's main journey takes an ungated one; the
// camp loop has its own section above.
let target = neighbours[0];
for (const n of neighbours) {
  const d = await deedOn(n);
  // A profiled road quotes provisions/makings in its deed (short OR met) —
  // and profiled roads are CLEAN by design. The journey section needs its
  // halts, so it takes the first road with no profile at all.
  if (d && !/provisions|makings|camp is short/.test(d.text)) { target = n; break; }
}
const first = await deedOn(target);
console.log('  offers  :', first ? `"${first.text}"${first.off ? ' [shut]' : ''}` : '(nothing)');
if (!first) misses.push('tapping the stop beside you offers no deed at all');
else if (!/^Open a flow to /.test(first.text)) {
  misses.push(`the deed does not offer to open a flow: "${first.text}"`);
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

// Tap it out — the trickle alone would take minutes now, and that is the
// design: the early game is played with the thumb.
let live = first;
for (let i = 0; i < 30 && (!live || live.off); i++) {
  for (let t = 0; t < 8; t++) await page.locator('.spring').click();
  await page.waitForTimeout(700);
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
      && /^Open a flow/.test(e.textContent.trim()));
    return x ? getComputedStyle(x).backgroundColor : null;
  });
  console.log('  live bg :', liveBg ?? '(none)');
  if (shutBg && liveBg && shutBg === liveBg) {
    misses.push(`the same button draws ${shutBg} shut and ${liveBg} live — nothing says it was dead`);
  }

  const fill0 = await ink('fill');
  // ★ INITIATED FROM THE CHART, deliberately: setting off must then flip the
  // player to the way by itself — the owner: *"we should automatically switch
  // to the second tab when we start journey."*
  await page.locator('nav button', { hasText: 'Chapter' }).click();
  await page.waitForTimeout(400);
  await pick(`.map .node[data-id="${target}"]`);
  await page.locator('.deed', { hasText: 'Open a flow' }).first().click({ timeout: 3000 });
  await page.waitForTimeout(300);

  // ★★ PREPARE FIRST. The owner: *"in order to start building a leg, you need
  // to prepare first."* Tapping the lay deed must NOT start the work — it must
  // open the kit choice, three ways to set off, each saying up front what it
  // does to every roll on the leg. Only choosing one sets the crew moving.
  console.log('\nPREPARE');
  const kits = await page.$$eval('.deed', (es) => es
    .map((e) => e.textContent.replace(/\s+/g, ' ').trim())
    .filter((t) => /^Set off with the /.test(t)));
  console.log('  offers  :', kits.length ? kits.map((k) => `"${k.slice(0, 60)}"`).join('\n            ') : '(no kit choice — the build just started)');
  if (kits.length !== 3) {
    misses.push(`the lay does not ask how the crew sets off: ${kits.length} kit deeds, wanted 3`);
  }
  if (!kits.some((k) => /\+1 every roll/.test(k))
    || !kits.some((k) => /-1 every roll/.test(k))) {
    misses.push('no kit says what it does to the rolls — the choice is blind');
  }
  // ★ AND THE +1 HAS A PRICE ON IT — the choice the owner found missing.
  if (!kits.some((k) => /costs 1 provision/.test(k))) {
    misses.push('the suited kit does not say its price — the choice is free again');
  }
  const keep = await page.$eval('.purse .keep', (e) => e.textContent.trim()).catch(() => null);
  console.log('  keeps   :', keep ?? '(no provisions in the header)');
  if (!keep || !/^\d+ provisions$/.test(keep)) {
    misses.push(`the header does not count provisions: "${keep}"`);
  }
  await page.screenshot({ path: SHOT.replace(/\.png$/, '-prepare.png') });
  await page.locator('.deed', { hasText: 'Set off with the mule' }).click({ timeout: 3000 });
  await page.waitForTimeout(1600);
  const onTab = await page.$eval('nav button.on', (e) => e.textContent.trim());
  console.log('  lands on:', onTab);
  if (onTab !== 'Here') {
    misses.push(`setting off left the player on ${onTab} — no auto-switch to the way`);
  }
  // ★ PUSHED, NOT WAITED: since 2026-08-07 the clock does not move the crew,
  // so the fill only grows because the probe works the crew. ONE push first —
  // the from-your-end check below needs the fill still short enough to sit
  // by the pin.
  await page.locator('.map .node[data-id="doing"]').click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(250);

  // ★★ AND IT FILLS FROM YOUR END. Reported broken twice: *"the line being
  // made solid starts from the wrong side."* Early in the build, the fill ink
  // must cluster round the pin, not round the far stop — a whole-canvas count
  // cannot see the difference, so this one counts in two windows.
  const nearMe = await inkNear('fill', '.map .node.you', 40);
  const nearFar = await inkNear('fill', `.map .node[data-id="${target}"]`, 40);

  for (let t = 0; t < 3; t++) {
    await page.locator('.map .node[data-id="doing"]').click({ timeout: 1500 }).catch(() => {});
  }
  await page.waitForTimeout(300);
  const laying = await panelText();
  const fillMid = await ink('fill');
  console.log('  says    :', `"${laying.slice(0, 90)}"`);
  console.log('  filling :', `${fill0}px → ${fillMid}px of made road`);
  if (!/\d+s of work left|\d+s left/.test(laying)) misses.push(`nothing says how long the road has left: "${laying.slice(0, 60)}"`);
  // ⚠️ THE ROAD GOING IN IS DRAWN GOING IN. A build that only happens in the
  // state is a timer with a number beside it, not a road being laid.
  if (!(fillMid > fill0)) misses.push(`the road is not visibly filling: ${fill0}px then ${fillMid}px`);
  console.log('  fills   :', `${nearMe}px by the pin, ${nearFar}px by the far stop`);
  if (nearMe >= 0 && nearFar >= 0 && nearMe <= nearFar) {
    misses.push(`the fill grows from the far side: ${nearMe}px by you, ${nearFar}px by ${target}`);
  }

  await page.screenshot({ path: SHOT.replace(/\.png$/, '-laying.png') });

  // ★★ THE WAY. The owner's redesign: *"instead of just waiting and being
  // interrupted, it is the separate tab kinda where it happens."* While the
  // crew is out, Here IS the leg: waypoints along the real path, the trouble
  // still ahead drawn as a marker you can SEE COMING, and the crew mark on
  // the works. All of it must be on screen DURING the build.
  console.log('\nTHE WAY');
  const wayDots = await page.$$eval('.map .node[data-id^="way:"]', (g) => g.length);
  const haltDots = await page.$$eval('.map .node[data-id^="halt:"]', (g) => g.length);
  const crewDot = await page.$$eval('.map .node[data-id="doing"]', (g) => g.length);
  console.log('  shows   :', `${wayDots} waypoints, ${haltDots} trouble ahead, ${crewDot} crew mark`);
  if (wayDots < 3) misses.push(`the leg shows only ${wayDots} waypoints — Here did not become the way`);
  if (!haltDots) misses.push('nothing marks the trouble ahead — the halt is invisible again');
  if (!crewDot) misses.push('no crew mark on the works');
  // ★ FOGGED HERE TOO — the owner: *"there's no fog of war in here tab."*
  // The surveyed corridor is clear; the land beyond it is still parchment.
  const wayFogPx = await ink('fog');
  const fogAtCrew = await inkNear('fog', '.map .node[data-id="doing"]', 40);
  console.log('  fogged  :', `${wayFogPx}px of parchment beyond the corridor, ${fogAtCrew}px on the crew`);
  if (wayFogPx < 50000) misses.push(`only ${wayFogPx}px of fog on the way — the land beyond the corridor is charted for free`);
  if (fogAtCrew > 60) misses.push(`${fogAtCrew}px of fog on the crew — the surveyed corridor is not clear`);
  await page.screenshot({ path: SHOT.replace(/\.png$/, '-way.png') });

  // ★★ THE PUSH. Five taps of the crew mark are six seconds of work — the
  // countdown must fall by far more than the second of wall clock this takes.
  console.log('\nTHE PUSH');
  const leftOf = async () => Number(((await panelText()).match(/(\d+)s of work left|(\d+)s left/) ?? [])
    .slice(1).find(Boolean) ?? NaN);
  const left0 = await leftOf();
  for (let t = 0; t < 5; t++) {
    await page.locator('.map .node[data-id="doing"]').click({ timeout: 1500 }).catch(() => {});
  }
  await page.waitForTimeout(300);
  const left1 = await leftOf();
  // Pushing INTO the halt is also proof — the work moved until trouble took it.
  const pushedIntoHalt = (await page.locator('.deed.face').count()) > 0;
  console.log('  pushed  :', `${left0}s → ${Number.isNaN(left1) ? '(halted)' : `${left1}s`} across five taps`);
  if (!(left0 > 0) || (!(left1 <= left0 - 4) && !pushedIntoHalt)) {
    misses.push(`five pushes only moved the work ${left0}s → ${left1}s — the crew mark does not take taps`);
  }

  // ★★ TROUBLE ON THE LINE. The owner's design: hidden stops on a fresh lay
  // that "block progress until resolved". The work must HALT, the dock must
  // name the trouble, the dice must be shown doing arithmetic in the open, and
  // resolving must set the work moving again. Every fresh lay meets at least
  // one, so this is not an if — the build cannot finish without it.
  console.log('\nTROUBLE');
  // ★ HOW THE PROBE PLAYS EACH SCENE — the win verb, the verb that cools the
  // threat meter when it runs past its mark (or below it, for breath), and
  // the verb a branched stage falls back to when the win verb is locked.
  // One row per scene. A scene this table does not know is a probe defect
  // and is REPORTED, not skipped — the old version mashed a button that was
  // not there and called the silence progress.
  const PLAYS = [
    { name: /washout/i, win: 'Dig', bar: 'water', coolAt: 55, cool: 'Bail', alt: 'Bail' },
    { name: /brigands/i, win: 'Talk them down', alt: 'Stand together' },
    { name: /wights/i, win: 'Drive the iron ring', bar: 'press', coolAt: 55,
      cool: 'Rally the crew', alt: 'Drive them out' },
    { name: /watcher/i, win: 'Watch how it moves', bar: 'near', coolAt: 65,
      cool: 'Back the crew off', alt: 'Down tools and stare' },
    { name: /Old stones/i, win: 'Bare them with care', alt: 'Shore the trench wall' },
    { name: /Lights on the crag/i, win: 'Climb toward it', bar: 'dread', coolAt: 55,
      cool: 'Post a steady watch', alt: 'Walk the rounds together' },
    { name: /last of the light/i, win: 'Press them on', bar: 'wind', coolBelow: 25,
      cool: 'Let them breathe', alt: 'Let them breathe' },
  ];
  let faced = 0;
  for (let i = 0; i < 70; i++) {
    // ★ A SCENE INSTEAD OF DICE: play it by its row above. Which scene is on
    // this leg is the map's call, not the probe's.
    if (await page.locator('.dial').count()) {
      const which = await panelText();
      const play = PLAYS.find((p) => p.name.test(which));
      if (!play) {
        misses.push(`a scene the probe cannot play: "${which.slice(0, 60)}"`);
        break;
      }
      for (let t = 0; t < 4; t++) {
        const pct = play.bar
          ? parseInt(await page.$eval(`[data-bar="${play.bar}"]`, (e) => e.style.width)
            .catch(() => '-1'), 10)
          : -1;
        const coolNow = (play.coolAt != null && pct > play.coolAt)
          || (play.coolBelow != null && pct >= 0 && pct < play.coolBelow);
        for (const btn of [coolNow ? play.cool : play.win, play.alt]) {
          const b = page.locator('.deed.face', { hasText: btn });
          if (await b.count()) { await b.first().click({ timeout: 800 }).catch(() => {}); break; }
        }
      }
      await page.waitForTimeout(300);
      faced++;
      // ⚠️ A SCENE TAKES TAPS — the wights run ~30, so the budget is wider
      // than the dice cap ever needed to be.
      if (faced > 27) break;
      continue;
    }
    const face = page.locator('.deed.face');
    if (!await face.count()) {
      // ★ TAP-TO-WORK: the crew dawdle at WORK_PACE without this. Pushing is
      // both the hurry-up and the proof the crew mark takes taps.
      for (let t = 0; t < 3; t++) {
        await page.locator('.map .node[data-id="doing"]').click({ timeout: 1000 }).catch(() => {});
      }
      await page.waitForTimeout(600);
      continue;
    }
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
      // ⚠️ A FIGHT TAKES ROUNDS — this used to break after four carries and
      // left a foe mid-fight, stranding everything downstream. The cap is
      // shared with the scene path, so it matches the wider scene budget.
      if (faced > 27) break;
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
  // ★ AND THE WAY FOLDS UP WHEN THE CREW COMES HOME: after arrival Here is a
  // stop again, not a stale leg.
  await page.waitForTimeout(400);
  const wayGone = await page.$$eval('.map .node[data-id^="way:"]', (g) => g.length);
  if (wayGone) misses.push(`${wayGone} waypoints still on Here after the leg finished`);

  // ★★ A FINISHED LAY CARRIES YOU OVER. The owner: *"obviously when we build a
  // road somewhere we arrive there too."* So the probe does NOT walk — it waits,
  // and the pin must cross on its own.
  let arrived = false;
  for (let i = 0; i < 25 && !arrived; i++) {
    for (let t = 0; t < 3; t++) {
      await page.locator('.map .node[data-id="doing"]').click({ timeout: 1000 }).catch(() => {});
    }
    await page.waitForTimeout(1000);
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
    const ret = page.locator('.deed').first();
    try { await ret.click({ timeout: 2000 }); }
    catch { await ret.focus(); await page.keyboard.press('Enter'); }
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
const widen = deedTexts.find((d) => /^Widen the flow/.test(d.t));
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
    const btn = page.locator('.deed', { hasText: 'Widen the flow' }).first();
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
    // ★ TAP THE GROUND, NOT THE DOT: on a widen leg the crew mark can sit
    // under the dock — which is exactly why open ground pushes now. The
    // probe drums two corners the leg never reaches.
    for (let i = 0; i < 25 && (await rateNow()) <= rate0; i++) {
      for (let t = 0; t < 5; t++) {
        await page.locator('.map canvas').click({
          position: { x: t % 2 ? 34 : 352, y: 46 }, timeout: 1000 }).catch(() => {});
      }
      await page.waitForTimeout(400);
    }
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

    // ★★ AND THE PIPE ITSELF CRAWLS. The owner: *"I can see a dotted line
    // moving through it… but I don't see it after start."* The crawl was
    // painted UNDER the road core and buried by it on every real pipe — this
    // check samples the strip between you and the far stop, twice, the same
    // way the feed check always did. Same-colour pixels in the same places
    // twice is a frozen pipe.
    const pipeStrip = async () => {
      const you = await page.locator('.map .node.you').first().boundingBox();
      const far = await page.locator(`.map .node[data-id="${backTo}"]`).first().boundingBox();
      if (!you || !far) return null;
      const cx = (you.x + you.width / 2 + far.x + far.width / 2) / 2;
      const cy = (you.y + you.height / 2 + far.y + far.height / 2) / 2;
      return page.evaluate(([hex, tol, x0, y0]) => {
        const cv = document.querySelector('.map canvas');
        const off = cv.getBoundingClientRect();
        const dpr = cv.width / off.width;
        const d = cv.getContext('2d', { willReadFrequently: true })
          .getImageData(Math.max(0, Math.round((x0 - 40 - off.left) * dpr)),
            Math.max(0, Math.round((y0 - 40 - off.top) * dpr)),
            Math.round(80 * dpr), Math.round(80 * dpr)).data;
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        const hits = [];
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 40 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol
            && Math.abs(d[i + 2] - b) <= tol) hits.push(i / 4);
        }
        return hits;
      }, [INK.flowing, TOL.flowing ?? 12, cx, cy]);
    };
    const pipeA = await pipeStrip();
    await page.waitForTimeout(450);
    const pipeB = await pipeStrip();
    console.log('  crawls  :', pipeA === null ? '(strip not found)'
      : `${pipeA.length}px of flow on the pipe, ${pipeA.length && pipeA.join() !== pipeB.join() ? 'CRAWLING' : 'not moving'}`);
    if (!pipeA || pipeA.length < 10) misses.push(`only ${pipeA?.length ?? 0}px of flow ink on a carrying pipe`);
    else if (pipeA.join() === pipeB.join()) {
      misses.push('the pipe\'s dashes are frozen — the crawl is buried under the road again');
    }
    await page.screenshot({ path: SHOT.replace(/\.png$/, '-widened.png') });
  }
}


// ------------------------------------------------------------- the fight ----
//
// ★★ SOME TROUBLE FIGHTS BACK — the owner: *"an enemy encounter might happen
// on that same view."* Injected mid-fight so the dice cannot dodge it: the
// dock must name the foe and its STRENGTH, the way must mark it foe-red at
// the halt, rounds must repeat until it falls (or the leg honestly fails),
// and the whole exchange happens on screen.
console.log('\nTHE FIGHT');
const foeTarget = Number(target.split(':')[1]);
const tookFight = await loadSave(
  () => ({ v: 8, savedAt: Date.now(),
    game: { version: 8, at: 0, seen: [0], gauge: {}, mana: 50, part: 0,
      building: { key: `0|${foeTarget}`, from: 0, left: 7, secs: 14, to: 1,
        halts: [0.5], kit: 'cart' },
      facing: { key: `0|${foeTarget}`, event: 'wights', rolled: null, foe: { left: 3 } } } }),
  async () => /Its strength/.test(await panelText()));
if (!tookFight) misses.push('the mid-fight save never loaded — the fight was never tested');
else {
  const opening = await panelText();
  console.log('  faces   :', `"${opening.slice(0, 90)}"`);
  if (!/Bog wights/.test(opening)) misses.push(`the dock does not name the foe: "${opening.slice(0, 60)}"`);
  if (!/Its strength: 3/.test(opening)) misses.push(`no strength on the dock: "${opening.slice(0, 60)}"`);
  // The way marks the met foe in its own red, with its name.
  await page.locator('nav button', { hasText: 'Here' }).click();
  await page.waitForTimeout(500);
  const foePx = await inkNear('foe', '.map .node[data-id="halt:0"]', 20);
  const foeName = (await labelsNow()).includes('Bog wights') ? 'Bog wights' : '(unnamed)';
  console.log('  marked  :', `${foePx}px of foe ink at the halt, named "${foeName}"`);
  if (foePx < 12) misses.push(`only ${foePx}px of foe ink at the met halt — the fight is invisible on the way`);
  if (foeName !== 'Bog wights') misses.push(`the met foe is not named on the way: "${foeName}"`);
  await page.screenshot({ path: SHOT.replace(/\.png$/, '-fight.png') });
  // Rounds, until it falls — or the leg honestly fails.
  let rounds = 0;
  let sawStrength = false;
  for (let i = 0; i < 16; i++) {
    const said = await panelText();
    if (!/Bog wights/.test(said)) break;
    sawStrength = sawStrength || /Its strength: \d/.test(said);
    if (/You rolled \d/.test(said)) {
      await page.locator('.deed.face', { hasText: 'Carry on' }).click({ timeout: 3000 });
      rounds++;
    } else {
      await page.locator('.deed.face').first().click({ timeout: 3000 });
    }
    await page.waitForTimeout(350);
  }
  const after = await panelText();
  const fell = !/Bog wights/.test(after);
  const failed = !(await page.$$eval('.map .node[data-id="doing"]', (g) => g.length));
  console.log('  rounds  :', `${rounds}, then ${fell ? failed ? 'the LEG FELL instead' : 'the foe fell' : 'STUCK'}`);
  if (!sawStrength) misses.push('no round ever showed the strength falling');
  if (!fell) misses.push(`sixteen rounds and the fight never ended: "${after.slice(0, 60)}"`);
}

// ------------------------------------------------------------- the scene ----
//
// ★★ THE ENCOUNTER AS ITS OWN INCREMENTAL GAME — the owner's design: gauges
// that drift, verbs you tap, hidden meters, stages that branch. Injected
// mid-washout so the map's odds cannot dodge it: the dock must show the
// meters, the water must MOVE ON ITS OWN, digging must clear the way.
console.log('\nTHE SCENE');
const tookScene = await loadSave(
  () => ({ v: 8, savedAt: Date.now(),
    game: { version: 8, at: 0, seen: [0], gauge: {}, mana: 20, part: 0,
      building: { key: `0|${foeTarget}`, from: 0, left: 7, secs: 14, to: 1,
        halts: [0.5], kit: 'packs' },
      facing: { key: `0|${foeTarget}`, event: 'washout', rolled: null,
        scene: { stage: 'open', gauges: { cut: 0, water: 3 }, shown: [] } } } }),
  async () => /washout/i.test(await panelText()));
if (!tookScene) misses.push('the mid-scene save never loaded — the scene was never tested');
else {
  const opening = await panelText();
  const dials = await page.$$eval('.dial', (g) => g.length);
  console.log('  faces   :', `"${opening.slice(0, 80)}"`);
  console.log('  dials   :', `${dials} meters on the dock`);
  if (!/The washout/.test(opening)) misses.push(`the dock does not name the scene: "${opening.slice(0, 60)}"`);
  if (dials < 2) misses.push(`only ${dials} meters — the gauges are not drawn`);
  // ★ TURN-BASED, BY DECREE: the water holds STILL while you read — and
  // answers the moment you dig. Both halves checked, because each is the
  // other's vacuity: a frozen bar passes the first for free.
  const w0 = await page.$eval('[data-bar="water"]', (e) => e.style.width);
  await page.waitForTimeout(2600);
  const w1 = await page.$eval('[data-bar="water"]', (e) => e.style.width);
  console.log('  waits   :', `the water ${w0} → ${w1} across 2.6 idle seconds`);
  if (w0 !== w1) misses.push('the water moved on the clock — scenes are turn-based now');
  await page.locator('.deed.face', { hasText: 'Dig' }).click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(250);
  const w2 = await page.$eval('[data-bar="water"]', (e) => e.style.width);
  console.log('  answers :', `one dig, the water ${w1} → ${w2}`);
  if (w2 === w1) misses.push('a dig bought no answer from the water — the world skipped its turn');
  await page.screenshot({ path: SHOT.replace(/\.png$/, '-scene.png') });
  // Dig it out — and bail when the water runs, because dig-mashing FLOODS
  // the cut now (the spam review): the Dig button leaving the dock means
  // flooded, not finished. Finished is the washout leaving the panel.
  let cleared = false;
  for (let i = 0; i < 30 && !cleared; i++) {
    if (!/The washout/.test(await panelText())) { cleared = true; break; }
    const water = parseInt(await page.$eval('[data-bar="water"]', (e) => e.style.width)
      .catch(() => '0'), 10);
    const dig = page.locator('.deed.face', { hasText: 'Dig' });
    if (water > 55 || !(await dig.count())) {
      await page.locator('.deed.face', { hasText: 'Bail' }).click({ timeout: 1500 }).catch(() => {});
    } else {
      await dig.click({ timeout: 1500 }).catch(() => {});
    }
    await page.waitForTimeout(120);
  }
  const after = await panelText();
  console.log('  dug     :', cleared || !/The washout/.test(after) ? 'the way is CLEAR' : `still in it: "${after.slice(0, 60)}"`);
  if (!cleared && /The washout/.test(after)) {
    misses.push('twenty-four digs never cleared the washout');
  }
}

// -------------------------------------------------------------- the race ----
//
// ★★ THE OWNER'S A-TO-B OBJECTIVE — *"going from point a to b (tapping to
// increase speed)"* — TURN-BASED on their second verdict: no idle progress,
// no clock. Injected mid-leg: nothing may move while the probe stares, one
// press must buy ground AND draw the dark's answer, and pressing must bring
// them home.
console.log('\nTHE RACE');
const tookRace = await loadSave(
  () => ({ v: 8, savedAt: Date.now(),
    game: { version: 8, at: 0, seen: [0], gauge: {}, mana: 20, part: 0,
      building: { key: `0|${foeTarget}`, from: 0, left: 7, secs: 14, to: 1,
        halts: [0.5], kit: 'packs' },
      facing: { key: `0|${foeTarget}`, event: 'longdark', rolled: null,
        scene: { stage: 'strung', gauges: { home: 0, dark: 0, wind: 8 }, shown: [] } } } }),
  async () => /last of the light/i.test(await panelText()));
if (!tookRace) misses.push('the mid-race save never loaded — the A-to-B objective was never tested');
else {
  const pct = async (bar) => parseInt(
    await page.$eval(`[data-bar="${bar}"]`, (e) => e.style.width).catch(() => '-1'), 10);
  const h0 = await pct('home');
  const d0 = await pct('dark');
  await page.waitForTimeout(2600);
  const h1 = await pct('home');
  const d1 = await pct('dark');
  console.log('  waits   :', `home ${h0}% → ${h1}%, dark ${d0}% → ${d1}% across 2.6 idle seconds`);
  if (h1 !== h0 || d1 !== d0) misses.push('the race moved on the clock — no idle progress, by decree');
  await page.locator('.deed.face', { hasText: 'Press them on' }).click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(250);
  const h2 = await pct('home');
  const d2 = await pct('dark');
  console.log('  answers :', `one press, home → ${h2}%, dark → ${d2}%`);
  if (!(h2 > h1)) misses.push('a press bought no ground — tapping is the only engine and it did nothing');
  if (!(d2 > d1)) misses.push('the dark did not answer the turn — the race has no opponent');
  await page.screenshot({ path: SHOT.replace(/\.png$/, '-race.png') });
  // Press them home: ten clean presses on paper, fourteen forgive a branch.
  let home = false;
  for (let i = 0; i < 14 && !home; i++) {
    for (const btn of ['Press them on', 'Let them breathe']) {
      const b = page.locator('.deed.face', { hasText: btn });
      if (await b.count()) { await b.first().click({ timeout: 1500 }).catch(() => {}); break; }
    }
    await page.waitForTimeout(120);
    if (!/last of the light/i.test(await panelText())) home = true;
  }
  console.log('  pressed :', home ? 'the crew came HOME ahead of the dark' : 'STUCK out there');
  if (!home) misses.push('fourteen presses never brought the crew home — the race cannot be won');
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
// ⚠️ SAVED TWO HOURS AGO ON PURPOSE. The away line ("Away 2.0 hours — N mana
// gathered") makes the dock TALL at rest — which is exactly the state the
// owner's live screenshot caught: the board framed itself before the dock
// reported its height, and the Finish drowned behind it.
const tookMiddle = await loadSave(
  () => ({ v: 8, savedAt: Date.now() - 2 * 3600 * 1000,
    game: { version: 8, at: 6, seen: [0, 6], gauge: {}, mana: 9999, part: 0, building: null } }),
  async () => {
    await page.locator('nav button', { hasText: 'Here' }).click();
    await page.waitForTimeout(400);
    return (await purse()) >= 999;
  });
if (!tookMiddle) misses.push('the out-in-the-middle save never loaded — the refusal check proves nothing');
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

// ★★ THE CAMERA BELONGS TO THE PLAYER. The owner: *"when I zoom in… it resets
// my zoom level completely… even without me doing anything."* The culprits
// were the panel's rest-height and the browser chrome nudging the board's
// size, each re-framing the map. Zoom by wheel, then shrink the viewport the
// way iOS's URL bar does — the zoomed node must not move.
console.log('\nTHE CAMERA');
await page.locator('nav button', { hasText: 'Chapter' }).click();
await page.waitForTimeout(500);
const mapBox = await page.locator('.map').boundingBox();
await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
await page.mouse.wheel(0, -500);
await page.waitForTimeout(400);
const youBefore = await page.locator('.map .node.you').first().boundingBox();
await page.setViewportSize({ width: 390, height: 780 });
await page.waitForTimeout(500);
const youAfter = await page.locator('.map .node.you').first().boundingBox();
const drift = youBefore && youAfter
  ? Math.hypot(youBefore.x - youAfter.x, youBefore.y - youAfter.y) : -1;
console.log('  held    :', drift < 0 ? '(pin not found)' : `${drift.toFixed(1)}px of drift after the chrome nudged the board`);
if (drift < 0 || drift > 4) {
  misses.push(`zoom did not survive a viewport nudge — the pin drifted ${drift.toFixed(1)}px`);
}
await page.setViewportSize({ width: 390, height: 844 });

await page.screenshot({ path: SHOT });
console.log(`\nscreenshot → ${SHOT}`);
if (misses.length) { console.log('\n⚠️ PROBLEMS'); for (const m of misses) console.log('  ', m); }
await b.close();
process.exit(misses.length ? 1 : 0);
