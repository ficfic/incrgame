// PLAY THE TABS. The one rule this build exists to keep is R2.2 — nothing is
// ever drawn over anything else — so that is what this checks hardest.
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

// ★ THE BOARD IS PAINTED, SO THE PROBE READS PIXELS. Lines and dots are no
// longer elements with computed styles — asserting on the DOM would now check
// only that buttons exist, which is exactly the vacuous guard this repo keeps
// producing. `inked` counts pixels of a colour actually on the canvas.
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
// ★ THE PALETTE COMES OFF THE RUNNING PAGE, NOT FROM A COPY IN HERE.
//
// ⚠️ THIS FILE USED TO CARRY ITS OWN HEXES. That meant the app could change a
// colour and the probe would go on counting the OLD one, find none of it
// missing, and pass — a guard that silently stops guarding, which is this
// repo's most reliable failure. `src/game/ink.ts` is the one definition,
// `Game.svelte` hands it over, and `test/ink.test.ts` holds the distances that
// make counting pixels meaningful at all.
const INK = await page.evaluate(() => window.__INK);
const TOL = await page.evaluate(() => window.__TOL);
/** Count an ink at the tolerance the palette says it may be counted at. */
const ink = (name) => inked(INK[name], TOL[name] ?? 12);
if (!INK || !INK.route) {
  misses.push('the page did not hand over its palette — the probe is counting nothing');
}

const tabs = await page.$$eval('nav button', (bs) => bs.map((x) => x.textContent.trim()));
console.log('TABS:', tabs.join(' · '));

// ★ NOTHING OVERLAPS ANYTHING. Every block in the column must be strictly below
// the one before it — that is what "no pop-up over a pop-up" means, measured.
const stacked = async (name) => page.evaluate(() => {
  const parts = ['header', 'nav', '.map', '.panel']
    .map((s) => ({ s, r: document.querySelector(s)?.getBoundingClientRect() }))
    .filter((x) => x.r);
  const bad = [];
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].r.top < parts[i - 1].r.bottom - 0.5) {
      bad.push(`${parts[i].s} starts above ${parts[i - 1].s} ends`);
    }
  }
  // And nothing absolutely positioned over the board. ⚠️ SCOPED OUTSIDE `.map`
  // ON PURPOSE: the canvas and the node buttons are absolute WITHIN the board,
  // which is the board drawing itself, not a sheet over the page. R2.2 is about
  // one part of the page covering another.
  for (const el of document.querySelectorAll('main *')) {
    if (el.closest('.map')) continue;
    const p = getComputedStyle(el).position;
    if (p === 'fixed' || p === 'absolute') bad.push(`${el.tagName}.${el.className} is ${p}`);
  }
  return bad;
});

for (const t of tabs) {
  await page.locator('nav button', { hasText: t }).click({ timeout: 3000 })
    .catch((e) => misses.push(`tab ${t} would not open: ${e}`));
  await page.waitForTimeout(400);
  const bad = await stacked(t);
  const dots = await page.$$eval('.map .node', (g) => g.length);
  const panel = await page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 60));
  console.log(`\n${t.toUpperCase()}  ${dots} dots`);
  console.log('  panel  :', `"${panel}"`);
  console.log('  stacked:', bad.length ? `⚠️ ${bad.join(' | ')}` : 'clean — nothing over anything');
  if (bad.length) misses.push(`${t}: ${bad.join(', ')}`);
}

// ★ NO PROSE ABOVE THE BOARD. The owner, three times in one play-test: *"the
// text at the top of the screen is not good… there is a text at the top again
// when I clicked again on the same button, and I'm not sure how to get rid of
// that text… the text at the top is a problem for sure."*
//
// It was a header line that held the WHOLE place body on arrival — seven lines
// of prose above the purse, pushing the board down the page, undismissable.
// The header now carries numbers and a button and nothing else, so this is
// measured two ways: by how tall it is, and by whether the board still starts
// near the top of the page on a phone.
const head = await page.evaluate(() => {
  const h = document.querySelector('header').getBoundingClientRect();
  const m = document.querySelector('.map').getBoundingClientRect();
  const words = document.querySelector('header').textContent.trim().split(/\s+/).length;
  return { tall: Math.round(h.height), boardTop: Math.round(m.top), words };
});
console.log('\nHEADER');
console.log('  size    :', `${head.tall}px tall, ${head.words} words, board starts at y=${head.boardTop}`);
if (head.tall > 110) misses.push(`the header is ${head.tall}px tall — prose is back above the board`);
if (head.words > 14) misses.push(`the header holds ${head.words} words — that is prose, not a readout`);

// ★ THE BOARD ITSELF — the three things the owner asked for by name, 2026-08-01.
await page.locator('nav button', { hasText: 'Journey' }).click();
await page.waitForTimeout(500);
console.log('\nBOARD');

// 1. CRISP. *"The connections seem slightly misaligned — a few pixels here and
//    there are wrong."* That was an SVG scaled by a viewBox onto fractional
//    device pixels. The canvas buffer must be sized in DEVICE pixels or every
//    line is drawn at 1/dpr of its width and lands between them.
const crisp = await page.evaluate(() => {
  const cv = document.querySelector('.map canvas');
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return { buf: cv.width, want: Math.round(r.width * dpr), dpr };
});
console.log('  crisp   :', `buffer ${crisp.buf}px for ${crisp.want}px wanted at dpr ${crisp.dpr}`);
if (Math.abs(crisp.buf - crisp.want) > 1) {
  misses.push(`canvas buffer is ${crisp.buf}px where ${crisp.want}px is needed — lines land between pixels`);
}

// 2. ★ IT SETTLES AND STAYS PUT. *"I like nodes that jingle like in Obsidian,
//    but maybe if we can stop them from jingling it would be best."* A board
//    that never stops moving is also one a thumb cannot hit — that shipped once.
//    Measured by watching, because "it has settled" is not a thing a unit test
//    can see.
const where = () => page.$$eval('.map .node', (ns) => ns.map((n) => `${n.dataset.id}@${n.style.left},${n.style.top}`).join('|'));
const at1 = await where();
await page.waitForTimeout(1800);
const at2 = await where();
console.log('  still   :', at1 === at2 ? 'settled — nothing moved on its own' : '⚠️ the dots are still drifting');
if (at1 !== at2) misses.push('the board is still simulating — dots move with no input');

// 3. ★ THE JOURNEY DOES NOT DRAG. The owner: *"I am able to reposition the graph
//    nodes on the Journey tab. I don't think it makes sense because this is
//    kind of a map, right?"*
//
// ⚠️ TWO ASSERTIONS, NOT ONE. Relative motion alone would pass on a board that
// was frozen solid — the mirror of the vacuity already caught in this file. So:
// the dot must NOT move relative to its neighbour (dragging is off) AND the
// board must still have moved (the gesture panned, rather than doing nothing).
const dragTest = async (shouldDrag) => {
  const one = page.locator('.map .node').first();
  const two = page.locator('.map .node').nth(1);
  const b0 = await one.boundingBox();
  const o0 = await two.boundingBox();
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2);
  await page.mouse.down();
  await page.mouse.move(b0.x + b0.width / 2 + 44, b0.y + b0.height / 2 + 28, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const b1 = await one.boundingBox();
  const o1 = await two.boundingBox();
  return {
    rel: Math.hypot((b1.x - b0.x) - (o1.x - o0.x), (b1.y - b0.y) - (o1.y - o0.y)),
    abs: Math.hypot(b1.x - b0.x, b1.y - b0.y),
  };
};
const jd = await dragTest(false);
console.log('  no drag :', `dot moved ${jd.rel.toFixed(0)}px relative, ${jd.abs.toFixed(0)}px absolute`);
if (jd.rel > 5) misses.push(`a Journey node was dragged ${jd.rel.toFixed(0)}px out of place — the map is not fixed`);
if (jd.abs < 20) misses.push('the gesture did nothing at all on the Journey — the board is frozen, not panning');
// And the tap must survive, which is what nulling `grabbed` would have broken.
await page.locator('.map .node.you').first().click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(300);
const stillTaps = await page.$eval('.panel', (e) => e.textContent.trim());
console.log('  tap     :', `"${stillTaps.slice(0, 40)}"`);
if (stillTaps.startsWith('Tap a dot')) misses.push('turning off dragging also killed tapping on the Journey');

// ★ A FRAME BUDGET, so a heavy feature cannot land silently.
//
// Measured during a sustained pan, which is the worst case because it redraws
// every frame. The vsync floor is ~16.7ms, so what is being watched is the WORK
// on top of it. Generous on purpose — this is a regression alarm, not a
// benchmark, and a shared CI box is noisy.
const frames = await page.evaluate(async () => {
  const out = { n: 0, total: 0, worst: 0 };
  const host = document.querySelector('.map .board');
  const r = host.getBoundingClientRect();
  const send = (t, x, y) => host.dispatchEvent(new PointerEvent(t, {
    pointerId: 1, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  send('pointerdown', r.left + 40, r.top + 40);
  for (let i = 0; i < 60; i++) {
    const a = performance.now();
    send('pointermove', r.left + 40 + (i % 30), r.top + 40 + (i % 20));
    await new Promise((res) => requestAnimationFrame(res));
    const d = performance.now() - a;
    out.n++; out.total += d; out.worst = Math.max(out.worst, d);
  }
  send('pointerup', r.left + 70, r.top + 60);
  return out;
});
const mean = frames.total / frames.n;
console.log('  frames  :', `${mean.toFixed(1)}ms mean, ${frames.worst.toFixed(1)}ms worst, panning`);
if (mean > 34) misses.push(`panning costs ${mean.toFixed(1)}ms a frame — something got heavy`);

// ★ SCENERY. The owner asked for a map that is alive and for it to be cheap.
// Cheap means the scatter is baked into a bitmap once and blitted — so what is
// checked is that it is THERE, and that it is only where it belongs.
const ground = {};
for (const g of ['river', 'wood', 'moor', 'under']) ground[g] = await inked(INK[g], 12);
console.log('  scenery :', Object.entries(ground).map(([g, n]) => `${g} ${n}px`).join(' · '));
for (const [g, n] of Object.entries(ground)) {
  if (!n) misses.push(`no ${g} is drawn on the Journey`);
}

// 4. ZOOM redraws rather than magnifying a finished picture.
const spread = () => page.$$eval('.map .node', (ns) => {
  const xs = ns.map((n) => parseFloat(n.style.left));
  return Math.max(...xs) - Math.min(...xs);
});
const z0 = await spread();
await page.mouse.move(200, 400);
await page.mouse.wheel(0, -400);
await page.waitForTimeout(300);
const z1 = await spread();
console.log('  zoom    :', `dots spread ${z0.toFixed(0)}px → ${z1.toFixed(0)}px`);
if (z1 <= z0 + 5) misses.push('the wheel did not zoom the board');
await page.mouse.wheel(0, 400);
await page.waitForTimeout(300);

// ★ HERE — the room, not the map. A few dots, and one of them says what you are
// doing right now. This is build-order step 4 and the thing it must not be is a
// zoomed copy of the Journey.
await page.locator('nav button', { hasText: 'Journey' }).click();
await page.waitForTimeout(300);
const worldDots = await page.$$eval('.map .node', (g) => g.length);
await page.locator('nav button', { hasText: 'Here' }).click();
await page.waitForTimeout(400);
const hereDots = await page.$$eval('.map .node', (g) => g.length);
console.log('\nHERE');
console.log('  dots    :', `${hereDots} here vs ${worldDots} on the journey`);
if (hereDots >= worldDots) misses.push(`Here draws ${hereDots} dots — it is the whole map again`);
const doing = page.locator(".map .node[data-kind='doing']");
if (await doing.count()) {
  const label = await doing.locator('.label').textContent();
  await doing.click({ timeout: 3000 }).catch((e) => misses.push(`doing dot: ${e}`));
  await page.waitForTimeout(300);
  const said = await page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  console.log('  doing   :', `"${label}" — ${said}`);
  if (!/pace every \d+ seconds/.test(said)) misses.push('the doing node does not say the rate');
  if (!/\d+s\.|Enough in hand|Every way from here/.test(said)) {
    misses.push('the doing node does not say what is next');
  }
} else { misses.push('Here has no node for what you are doing'); }

// ★ AND THE SCENERY IS THE WORLD'S, NOT EVERY TAB'S. Self is a character sheet;
// ground under it would be claiming the valley is in you.
await page.locator('nav button', { hasText: 'Self' }).click();
await page.waitForTimeout(500);
const strayRiver = await ink('river');
const strayWood = await ink('wood');
console.log('\nSELF  scenery:', `river ${strayRiver}px, wood ${strayWood}px (both must be 0)`);
if (strayRiver || strayWood) misses.push('scenery is drawn on Self, which is not a place');
// ★ AND DRAGGING IS STILL ON HERE — the owner said the map must be fixed, not
// every tab. Same two-sided check, the other way round.
const sd = await dragTest(true);
console.log('  drag    :', `${sd.rel.toFixed(0)}px relative, ${sd.abs.toFixed(0)}px absolute`);
if (sd.rel < 20) misses.push(`Self nodes will not drag (${sd.rel.toFixed(0)}px relative) — the fix went too wide`);

// ★ SELF — what you carry and what you are. A CHARACTER SHEET, NOT A SCOREBOARD.
//
// The owner, after playing the first version: *"zero of the three ways, one of
// thirty-seven places. I don't wanna see these stats on the Self."* and then
// plainly: *"self is a stat sheet and inventory, but not game statistics."*
// Every one of those rejected numbers was TRUE and every unit test passed. So
// the probe reads what is actually on the tab and holds the line there.
await page.locator('nav button', { hasText: 'Self' }).click();
await page.waitForTimeout(400);
console.log('\nSELF');
const sheet = await page.$$eval('.map .node .label', (t) => t.map((x) => x.textContent));
console.log('  sheet   :', sheet.length ? sheet.join(' · ') : '(none)');
if (sheet.length < 4) misses.push(`Self shows only ${sheet.length} things`);
// ★ NO PROGRESS COUNTERS. "N of M" is the shape one takes, whatever it counts.
for (const line of sheet) {
  if (/\d+\s+of\s+\d+/.test(line)) misses.push(`Self is counting the world again: "${line}"`);
}
for (const bad of ['skill', 'level', 'xp', 'ways out', 'places found']) {
  if (sheet.join(' ').toLowerCase().includes(bad)) misses.push(`Self says "${bad}"`);
}
// The inventory, in the model's own vocabulary.
const carried = await page.$$eval(".map .node[data-kind='item'] .label", (t) => t.map((x) => x.textContent));
console.log('  carried :', carried.length ? carried.join(' · ') : '(nothing)');
if (!carried.length) misses.push('Self has no inventory at all');
if (!carried.some((c) => /paces?$/.test(c ?? ''))) misses.push('the inventory does not hold your paces');
const factOne = page.locator(".map .node[data-kind='fact']").first();
await factOne.click({ timeout: 3000 }).catch((e) => misses.push(`stat dot: ${e}`));
await page.waitForTimeout(300);
const factSaid = await page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim());
console.log('  reads   :', `"${factSaid.slice(0, 110)}"`);
if (factSaid.startsWith('Tap a dot')) misses.push('tapping a stat read nothing');

// ★ THOUGHTS — what you understand, and how it connects. Build-order step 6.
// The item it answers said the tab needed something in it that is NOT a place.
await page.locator('nav button', { hasText: 'Thoughts' }).click();
await page.waitForTimeout(400);
console.log('\nTHOUGHTS');
const thought = await page.$$eval('.map .node .label', (t) => t.map((x) => x.textContent));
const allDots = await page.$$eval('.map .node', (g) => g.length);
console.log('  known   :', thought.length ? thought.join(' · ') : '(none)');
console.log('  dots    :', `${allDots} in all, ${allDots - thought.length} not thought yet`);
if (!thought.length) misses.push('Thoughts names nothing at all');
if (allDots <= thought.length) misses.push('Thoughts draws nothing left to learn');
// Tapping a known one must read; tapping an unknown one must say why it is blank.
const lit = page.locator('.map .node').filter({ has: page.locator('.label') }).first();
await lit.click({ timeout: 3000 }).catch((e) => misses.push(`thought dot: ${e}`));
await page.waitForTimeout(300);
const read = await page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim());
console.log('  reads   :', `"${read.slice(0, 110)}"`);
if (read.startsWith('Tap a dot')) misses.push('tapping a thought read nothing');
if (/Somewhere you have not been/.test(read)) misses.push('a notion is described as a place');
// ★ A NOTION YOU HAVE NOT THOUGHT MUST LOOK UNTHOUGHT. This is how the tab
// shows progress at all, and it once drew every dot at full brightness and full
// size regardless. Both inks must actually be on the canvas: if the dim one is
// missing, every notion is being drawn as known.
// ⚠️ `known`, NOT `route`. This counted the ROUTE ink and passed for weeks —
// only because the reached-dot colour and the road colour were literally the
// same hex. The moment `ink.ts` separated them (they are different things and
// the probe could not tell a made road from a reached place) this check dropped
// to 2 pixels and would have gone vacuous. The tolerances come from the palette
// too: `dot` is counted at 6 because it sits 13 from the `means` edge ink, and
// a wider net would count the lines.
const litPx = await ink('known');
const dimPx = await ink('dot');
console.log('  dim     :', `${litPx}px thought vs ${dimPx}px unthought`);
if (dimPx <= 0) misses.push('no unthought notion is drawn dim — they all look known');
if (litPx <= 0) misses.push('no thought notion is drawn lit');

// ★ FORGING. Select where you stand, arm Connect, tap a neighbour, watch the
// line fill, then walk it. This is the interaction the owner asked for by name.
await page.locator('nav button', { hasText: 'Journey' }).click();
await page.waitForTimeout(400);
console.log('\nFORGING');
for (let i = 0; i < 12; i++) {
  const n = await page.$$eval('.map .node.you', (g) => g.length);
  if (n) break;
  await page.waitForTimeout(500);
}
await page.locator('.map .node.you').first().click({ timeout: 3000 })
  .catch((e) => misses.push(`could not select where you stand: ${e}`));
await page.waitForTimeout(300);
const armLabel = await page.$eval('.deed.arm', (e) => e.textContent.replace(/\s+/g, ' ').trim())
  .catch(() => null);
console.log('  offers  :', armLabel ?? '(no Connect — cannot afford one yet)');
if (!armLabel) {
  // Rest until a route is affordable, then look again.
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(3000);
    await page.locator('.map .node.you').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
    if (await page.locator('.deed.arm').count()) break;
    await page.locator('.map .node.you').first().click({ timeout: 2000 }).catch(() => {});
  }
}
if (await page.locator('.deed.arm').count()) {
  await page.locator('.deed.arm').click({ timeout: 3000 });
  await page.waitForTimeout(200);
  console.log('  armed   :', await page.$eval('.deed.arm', (e) => e.textContent.replace(/\s+/g,' ').trim()));
  // Tap a neighbour that is not us.
  const target = page.locator('.map .node:not(.you)').first();
  await target.click({ timeout: 3000 }).catch((e) => misses.push(`second tap: ${e}`));
  await page.waitForTimeout(400);
  // ⚠️ MEASURED AFTER A MOMENT, NOT THE INSTANT IT STARTS. At fill ≈ 0 the line
  // has no length and all that is on the canvas is its round cap — this read 25
  // pixels and one slow frame from reading zero. Give it a few seconds of
  // growth so the check is looking at a line rather than at a dot.
  //
  // (Before `ink.ts` split `fill` from `you` this read 1485px and looked
  // healthy. It was counting the dot the player is standing on, which is always
  // there, so it would have passed with nothing filling at all.)
  await page.waitForTimeout(3500);
  const filling = await ink('fill');
  const note = await page.$eval('.panel .note', (e) => e.textContent.replace(/\s+/g,' ').trim())
    .catch(() => '(none)');
  console.log('  filling :', filling ? `${filling}px of fill drawn` : '⚠️ nothing is filling');
  console.log('  panel   :', note);
  if (!filling) misses.push('the route did not start filling');
  // ★ A ROUTE BEING MADE MUST NOT ALREADY LOOK MADE. It shipped drawing solid
  // for its whole length the instant it started, so the far end read as reached
  // with twelve seconds still to run.
  // ★ A ROUTE BEING MADE MUST NOT ALREADY LOOK MADE. It shipped drawing solid
  // for its whole length the instant it started, so the far end read as reached
  // with twelve seconds still to run. The dashed ink must still be under it.
  const dashedDuring = await ink('unmade');
  console.log('  during  :', dashedDuring ? 'still dashed under the fill'
    : '⚠️ the dashes are gone — it is already drawn made');
  if (!dashedDuring) misses.push('the route lost its dashes while still filling');
  const routeBefore = await ink('route');
  // Watch it finish.
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    if (!await ink('fill')) break;
  }
  const routeAfter = await ink('route');
  console.log('  made    :', `route ink ${routeBefore}px → ${routeAfter}px`);
  if (routeAfter <= routeBefore) misses.push('no new solid route was drawn when the fill finished');
} else { misses.push('Connect was never offered'); }

// Tap a dot on Journey and travel from the panel.
await page.locator('nav button', { hasText: 'Journey' }).click();
await page.waitForTimeout(400);
const before = await page.$eval('.purse b', (e) => e.textContent);
console.log('\nSELECT AND GO');
console.log('  paces before:', before);
// wait until something is affordable
for (let i = 0; i < 12; i++) {
  const open = await page.$$eval('.map .node.open', (g) => g.length);
  if (open) break;
  await page.waitForTimeout(3000);
}
const openDot = page.locator('.map .node.open').first();
if (await openDot.count()) {
  await openDot.click({ timeout: 3000 }).catch((e) => misses.push(`open dot: ${e}`));
  await page.waitForTimeout(300);
  const head = await page.$eval('.panel h2', (e) => e.textContent.trim()).catch(() => '(none)');
  const deed = await page.$eval('.deed', (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '(none)');
  console.log('  tapped  :', head);
  console.log('  offers  :', deed);
  await page.locator('.deed').first().click({ timeout: 3000 }).catch((e) => misses.push(`deed: ${e}`));
  await page.waitForTimeout(500);
  const now = await page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40));
  console.log('  after   :', `"${now}"`);
  // ★ ARRIVING PUTS THE PLACE'S PROSE IN THE PANEL, which is where the header
  // line used to put it and where the player is already reading. If this is
  // empty the prose was simply deleted rather than moved.
  const arrived = await page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  const headNow = await page.$eval('header', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  console.log('  panel   :', `"${arrived.slice(0, 80)}"`);
  if (arrived.startsWith('Tap a dot')) misses.push('arriving somewhere selected nothing — the prose went nowhere');
  if (arrived.length < 60) misses.push('the panel has no prose for the place just reached');
  if (headNow.length > 60) misses.push(`prose reappeared in the header on arrival: "${headNow.slice(0, 60)}"`);
  const found = await page.$$eval('.map .node.you .label', (t) => t.map((x) => x.textContent));
  console.log('  standing:', found.join(''));
} else { misses.push('nothing ever became affordable'); }

await page.screenshot({ path: SHOT });
console.log(`\nscreenshot → ${SHOT}`);
if (misses.length) { console.log('\n⚠️ PROBLEMS'); for (const m of misses) console.log('  ', m); }
await b.close();
process.exit(misses.length ? 1 : 0);
