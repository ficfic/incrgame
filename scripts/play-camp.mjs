// PLAYS THE CAMP BUILDER and reports what a player would actually see.
// The pivot's probe, 2026-08-07 (night): boots the built app, chips stone by
// thumb, raises a dead quarry, connects it, watches the rate appear; then
// loads a rich save and drives the full chain — logs to planks to camp
// level 2 — asserting the FLOW is drawn, not merely stated.
//
// Exit 0 only when every check passed. `npm run play`.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const EXE = ['/opt/pw-browsers/chromium/chrome-linux/chrome',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const URL = process.env.PLAY_URL ?? 'http://localhost:4173/';
const SHOT = 'play-camp-builder.png';
const misses = [];

const b = await chromium.launch({ executablePath: EXE });
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => misses.push(`page error: ${e.message.slice(0, 90)}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const header = async () => (await page.locator('header').textContent())
  .replace(/\s+/g, ' ').trim();
const panel = async () => (await page.locator('.panel').textContent())
  .replace(/\s+/g, ' ').trim();
const stoneNow = async () => Number((await header()).match(/(\d+)\s*stone/)?.[1] ?? NaN);

/** Count pixels of a named ink on the board — the palette read OFF THE PAGE,
 *  so the probe can only check what is really drawn. */
const inked = async (name) => page.evaluate(([name]) => {
  const INK = window.__INK ?? {};
  const TOL = window.__TOL ?? {};
  const hex = INK[name];
  if (!hex) return -1;
  const tol = TOL[name] ?? 26;
  const cv = document.querySelector('.map canvas');
  if (!cv) return -1;
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16),
    bl = parseInt(hex.slice(5, 7), 16);
  const d = cv.getContext('2d', { willReadFrequently: true })
    .getImageData(0, 0, cv.width, cv.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 40 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol
      && Math.abs(d[i + 2] - bl) <= tol) n++;
  }
  return n;
}, [name]);

// ------------------------------------------------------------ fresh start --
console.log('THE FRESH CAMP');
await page.evaluate(() => localStorage.removeItem('camp-save'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const h0 = await header();
console.log('  header  :', `"${h0.slice(0, 80)}"`);
if (!/0\s*stone/.test(h0) || !/Camp 1/.test(h0)) {
  misses.push(`a fresh camp does not open at zero: "${h0.slice(0, 60)}"`);
}
const sites0 = await page.$$eval('.map .node', (n) => n.length);
console.log('  ground  :', `${sites0} sites on the board`);
if (sites0 !== 4) misses.push(`${sites0} sites at camp level 1 — wanted 4`);

// ------------------------------------------------------------- the thumb ---
console.log('\nTHE THUMB');
for (let t = 0; t < 22; t++) await page.locator('.spring').click();
await page.waitForTimeout(250);
const chipped = await stoneNow();
console.log('  chipped :', `${chipped} stone off 22 taps`);
if (!(chipped >= 5)) misses.push(`22 taps chipped only ${chipped} stone`);

// --------------------------------------------------- a dead quarry teaches --
console.log('\nTHE DEAD QUARRY');
await page.locator('.map .node[data-id="site:1"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
await page.locator('.deed', { hasText: 'Raise the quarry' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed raises the quarry'));
await page.waitForTimeout(250);
const dead = await panel();
console.log('  says    :', `"${dead.slice(0, 70)}"`);
if (!/makes 0/.test(dead)) {
  misses.push(`an unconnected works does not say it makes nothing: "${dead.slice(0, 60)}"`);
}
if (/\+0\.3/.test(await header())) {
  misses.push('the header counts a quarry no path reaches');
}

// ------------------------------------------------- the connection IS the game
console.log('\nTHE CONNECTION');
for (let t = 0; t < 16; t++) await page.locator('.spring').click();
await page.waitForTimeout(200);
await page.locator('.deed', { hasText: 'Path · The Camp' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed lays the path to the camp'));
await page.waitForTimeout(600);
const flowing = await header();
console.log('  header  :', `"${flowing.slice(0, 80)}"`);
if (!/\+0\.3\/s/.test(flowing)) {
  misses.push(`the path went in and the header shows no stone rate: "${flowing.slice(0, 70)}"`);
}
const label1 = await page.locator('.map .node[data-id="site:1"]').textContent();
console.log('  label   :', `"${label1.trim()}"`);
if (!/0\.3\/s/.test(label1)) {
  misses.push(`the quarry's own label does not carry its rate: "${label1.trim()}"`);
}
const stoneA = await stoneNow();
await page.waitForTimeout(3200);
const stoneB = await stoneNow();
console.log('  idles   :', `${stoneA} → ${stoneB} stone across ~3 idle seconds`);
if (!(stoneB > stoneA)) misses.push('connected stone does not accrue on the clock');
await page.screenshot({ path: SHOT.replace(/\.png$/, '-first.png') });

// -------------------------------------------- the full chain, from a save ---
console.log('\nTHE CHAIN');
// Injected BEFORE the app boots — the app's own pagehide flush would
// clobber anything written into localStorage while it is still running.
await page.addInitScript(() => {
  const game = {
    version: 1,
    built: { 0: 'village', 1: 'quarry' },
    paths: { '0|1': 1 },
    stone: 40, logs: 0, planks: 0, progress: 0,
  };
  localStorage.setItem('camp-save', JSON.stringify({ game, savedAt: Date.now() }));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
// Lumberworks at the pines, mill at the river, both pathed home.
await page.locator('.map .node[data-id="site:2"]').click({ timeout: 2000 }).catch(() => {});
await page.locator('.deed', { hasText: 'Raise the lumber' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed raises the lumberworks'));
await page.locator('.deed', { hasText: 'Path · The Camp' }).click({ timeout: 2000 })
  .catch(() => misses.push('no path deed at the pines'));
await page.locator('.map .node[data-id="site:3"]').click({ timeout: 2000 }).catch(() => {});
await page.locator('.deed', { hasText: 'Raise the sawmill' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed raises the sawmill'));
await page.locator('.deed', { hasText: 'Path · The Camp' }).click({ timeout: 2000 })
  .catch(() => misses.push('no path deed at the river'));
await page.waitForTimeout(1200);
const chain = await header();
console.log('  header  :', `"${chain.slice(0, 90)}"`);
if (!/planks \+0\.4\/s/.test(chain)) {
  misses.push(`the chain is up but planks do not flow: "${chain.slice(0, 70)}"`);
}
// ★ THE FLOW IS DRAWN: the crawl ink must be on the pipes, and vanish for a
// probe that only reads the header. Counted off the live palette.
const crawlPx = await inked('flowing');
console.log('  drawn   :', `${crawlPx}px of flow on the paths`);
if (crawlPx < 40) misses.push(`only ${crawlPx}px of flow ink — the connections do not SHOW their carry`);
// The camp eats toward level 2 on screen.
const prog = async () => Number((await header()).match(/Camp \d · (\d+)\/\d+/)?.[1] ?? NaN);
const p0 = await prog();
await page.waitForTimeout(4200);
const p1 = await prog();
console.log('  eats    :', `${p0} → ${p1} planks toward the next level`);
if (!(p1 > p0)) misses.push(`the camp is not eating: ${p0} → ${p1}`);

// ---------------------------------------------------- the level, unlocked ---
console.log('\nTHE LEVEL');
await page.addInitScript(() => {
  const game = {
    version: 1,
    built: { 0: 'village', 1: 'quarry', 2: 'lumber', 3: 'sawmill' },
    paths: { '0|1': 1, '0|2': 1, '0|3': 1 },
    stone: 20, logs: 0, planks: 2, progress: 14.5,
  };
  localStorage.setItem('camp-save', JSON.stringify({ game, savedAt: Date.now() }));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2600);
const lvHeader = await header();
const sites2 = await page.$$eval('.map .node', (n) => n.length);
console.log('  header  :', `"${lvHeader.slice(0, 80)}"`);
console.log('  ground  :', `${sites2} sites after the level turned`);
if (!/Camp 2/.test(lvHeader)) misses.push(`fifteen planks eaten and the camp is still: "${lvHeader.slice(0, 60)}"`);
if (sites2 !== 6) misses.push(`camp level 2 shows ${sites2} sites — wanted 6, the ground did not grow`);
await page.screenshot({ path: SHOT });

await b.close();
if (misses.length) {
  console.log('\n⚠️ PROBLEMS');
  for (const m of misses) console.log('  ', m);
  process.exit(1);
}
console.log('\nall good — the camp builds, connects, flows and levels on screen');
