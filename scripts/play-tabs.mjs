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
const stacked = async () => page.evaluate(() => {
  const parts = ['header', 'nav', '.map', '.panel']
    .map((s) => ({ s, r: document.querySelector(s)?.getBoundingClientRect() }))
    .filter((x) => x.r);
  const bad = [];
  for (let i = 1; i < parts.length; i++) {
    if (parts[i].r.top < parts[i - 1].r.bottom - 0.5) {
      bad.push(`${parts[i].s} starts above ${parts[i - 1].s} ends`);
    }
  }
  // ⚠️ SCOPED OUTSIDE `.map` ON PURPOSE: the canvas and the stop buttons are
  // absolute WITHIN the board, which is the board drawing itself, not a sheet
  // over the page.
  for (const el of document.querySelectorAll('main *')) {
    if (el.closest('.map')) continue;
    const p = getComputedStyle(el).position;
    if (p === 'fixed' || p === 'absolute') bad.push(`${el.tagName}.${el.className} is ${p}`);
  }
  return bad;
});

const tabs = await page.$$eval('nav button', (bs) => bs.map((x) => x.textContent.trim()));
console.log('TABS:', tabs.join(' · '));
if (tabs.length !== 4) misses.push(`expected four tabs, found ${tabs.length}`);

for (const t of tabs) {
  await page.locator('nav button', { hasText: t }).click({ timeout: 3000 })
    .catch((e) => misses.push(`tab ${t} would not open: ${e}`));
  await page.waitForTimeout(400);
  const bad = await stacked();
  const dots = await page.$$eval('.map .node', (g) => g.length);
  console.log(`\n${t.toUpperCase()}  ${dots} stops drawn`);
  console.log('  panel  :', `"${(await panelText()).slice(0, 60)}"`);
  console.log('  stacked:', bad.length ? `⚠️ ${bad.join(' | ')}` : 'clean — nothing over anything');
  if (bad.length) misses.push(`${t}: ${bad.join(', ')}`);
  if (!dots) misses.push(`${t} draws nothing at all`);
}

// ★ NO PROSE ABOVE THE BOARD. The owner, three times in one play-test: *"the
// text above the map, i don't want to see it."* The header may carry numbers
// and nothing else, so this measures its HEIGHT — a sentence cannot hide in
// 40 pixels.
const headH = await page.$eval('header', (e) => Math.round(e.getBoundingClientRect().height));
console.log('\nHEADER  ', `${headH}px tall`);
if (headH > 96) misses.push(`the header is ${headH}px — prose has got in above the board again`);

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
console.log('  stops   :', allStops);
console.log('  routes  :', `${dottedPx}px dotted, ${builtPx}px built`);
console.log('  ground  :', `${groundPx}px of terrain under it`);
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
// road, watch the line FILL, then walk it. Everything else in the game is this
// with weather on top, and if it does not happen on screen nothing does.
console.log('\nLAYING A ROAD');
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
else if (!/^Lay the road to /.test(first.text)) {
  misses.push(`the deed does not offer to lay a road: "${first.text}"`);
}
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
if (!live || live.off) {
  misses.push(`never able to afford the first road: "${live?.text ?? 'no deed'}"`);
} else {
  const liveBg = await page.evaluate(() => {
    const x = [...document.querySelectorAll('.deed')].find((e) => !e.disabled
      && /^Lay the road/.test(e.textContent.trim()));
    return x ? getComputedStyle(x).backgroundColor : null;
  });
  console.log('  live bg :', liveBg ?? '(none)');
  if (shutBg && liveBg && shutBg === liveBg) {
    misses.push(`the same button draws ${shutBg} shut and ${liveBg} live — nothing says it was dead`);
  }

  const fill0 = await ink('fill');
  await page.locator('.deed', { hasText: 'Lay the road' }).first().click({ timeout: 3000 });
  await page.waitForTimeout(2500);
  const laying = await panelText();
  const fillMid = await ink('fill');
  console.log('  says    :', `"${laying.slice(0, 90)}"`);
  console.log('  filling :', `${fill0}px → ${fillMid}px of made road`);
  if (!/\d+s left/.test(laying)) misses.push(`nothing says how long the road has left: "${laying.slice(0, 60)}"`);
  // ⚠️ THE ROAD GOING IN IS DRAWN GOING IN. A build that only happens in the
  // state is a timer with a number beside it, not a road being laid.
  if (!(fillMid > fill0)) misses.push(`the road is not visibly filling: ${fill0}px then ${fillMid}px`);

  await page.screenshot({ path: SHOT.replace(/\.png$/, '-laying.png') });

  // Let it finish, then walk it.
  // ⚠️ THE BUILT ROAD IS A DIFFERENT INK FROM THE FILLING ONE. `fill` is the
  // animation and it is SUPPOSED to vanish when the road is done; the finished
  // road is drawn in `route`. Checking `fill` after the build reported the road
  // "drawn fainter" when what had actually happened was that it finished.
  const madeBefore = await ink('route');
  let walked = false;
  let paidBefore = null;
  for (let i = 0; i < 25; i++) {
    const d = await deedOn(target);
    if (d && /^(Go|Back) to /.test(d.text) && !d.off) {
      paidBefore = await purse();
      await page.locator('.deed').first().click({ timeout: 3000 });
      await page.waitForTimeout(600);
      walked = true;
      break;
    }
    await page.waitForTimeout(2000);
  }
  const madeAfter = await ink('route');
  const standing = await page.$$eval('.map .node.you .label', (t) => t.map((x) => x.textContent));
  console.log('  built   :', `${madeBefore}px → ${madeAfter}px of made road`);
  console.log('  standing:', standing.join(' ') || '(nowhere)');
  if (!walked) misses.push('the road went in but there was never a way to walk it');
  if (madeAfter < 60) misses.push(`only ${madeAfter}px of built road on the board — it did not stay drawn`);
  // ★ AND WALKING IT IS FREE. The mana went into making it, and a toll on a road
  // you have already paid for would be the same cost charged twice.
  const paidAfter = await purse();
  console.log('  walked  :', paidBefore === null ? '(never got there)'
    : `${paidBefore} → ${paidAfter} mana crossing it`);
  if (paidBefore !== null && paidAfter < paidBefore) {
    misses.push(`walking a built road cost ${paidBefore - paidAfter} mana — it is meant to be free`);
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
      v: 4, savedAt: Date.now(),
      game: { version: 3, at: 6, seen: [0, 6], built: [], mana: 9999, part: 0, building: null },
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

await page.screenshot({ path: SHOT });
console.log(`\nscreenshot → ${SHOT}`);
if (misses.length) { console.log('\n⚠️ PROBLEMS'); for (const m of misses) console.log('  ', m); }
await b.close();
process.exit(misses.length ? 1 : 0);
