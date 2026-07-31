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
await page.waitForSelector('.map svg');
await page.waitForTimeout(600);

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
  // And nothing absolutely positioned over the board.
  for (const el of document.querySelectorAll('main *')) {
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
  const dots = await page.$$eval('.map g', (g) => g.length);
  const panel = await page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 60));
  console.log(`\n${t.toUpperCase()}  ${dots} dots`);
  console.log('  panel  :', `"${panel}"`);
  console.log('  stacked:', bad.length ? `⚠️ ${bad.join(' | ')}` : 'clean — nothing over anything');
  if (bad.length) misses.push(`${t}: ${bad.join(', ')}`);
}

// ★ HERE — the room, not the map. A few dots, and one of them says what you are
// doing right now. This is build-order step 4 and the thing it must not be is a
// zoomed copy of the Journey.
await page.locator('nav button', { hasText: 'Journey' }).click();
await page.waitForTimeout(300);
const worldDots = await page.$$eval('.map g', (g) => g.length);
await page.locator('nav button', { hasText: 'Here' }).click();
await page.waitForTimeout(400);
const hereDots = await page.$$eval('.map g', (g) => g.length);
console.log('\nHERE');
console.log('  dots    :', `${hereDots} here vs ${worldDots} on the journey`);
if (hereDots >= worldDots) misses.push(`Here draws ${hereDots} dots — it is the whole map again`);
const doing = page.locator(".map g[data-kind='doing']");
if (await doing.count()) {
  const label = await doing.locator('text').textContent();
  await doing.click({ timeout: 3000 }).catch((e) => misses.push(`doing dot: ${e}`));
  await page.waitForTimeout(300);
  const said = await page.$eval('.panel', (e) => e.textContent.replace(/\s+/g, ' ').trim());
  console.log('  doing   :', `"${label}" — ${said}`);
  if (!/pace every \d+ seconds/.test(said)) misses.push('the doing node does not say the rate');
  if (!/\d+s\.|Enough in hand|Every way from here/.test(said)) {
    misses.push('the doing node does not say what is next');
  }
} else { misses.push('Here has no node for what you are doing'); }

// ★ FORGING. Select where you stand, arm Connect, tap a neighbour, watch the
// line fill, then walk it. This is the interaction the owner asked for by name.
await page.locator('nav button', { hasText: 'Journey' }).click();
await page.waitForTimeout(400);
console.log('\nFORGING');
for (let i = 0; i < 12; i++) {
  const n = await page.$$eval('.map g.you', (g) => g.length);
  if (n) break;
  await page.waitForTimeout(500);
}
await page.locator('.map g.you').first().click({ timeout: 3000 })
  .catch((e) => misses.push(`could not select where you stand: ${e}`));
await page.waitForTimeout(300);
const armLabel = await page.$eval('.deed.arm', (e) => e.textContent.replace(/\s+/g, ' ').trim())
  .catch(() => null);
console.log('  offers  :', armLabel ?? '(no Connect — cannot afford one yet)');
if (!armLabel) {
  // Rest until a route is affordable, then look again.
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(3000);
    await page.locator('.map g.you').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);
    if (await page.locator('.deed.arm').count()) break;
    await page.locator('.map g.you').first().click({ timeout: 2000 }).catch(() => {});
  }
}
if (await page.locator('.deed.arm').count()) {
  await page.locator('.deed.arm').click({ timeout: 3000 });
  await page.waitForTimeout(200);
  console.log('  armed   :', await page.$eval('.deed.arm', (e) => e.textContent.replace(/\s+/g,' ').trim()));
  // Tap a neighbour that is not us.
  const target = page.locator('.map g:not(.you)').first();
  await target.click({ timeout: 3000 }).catch((e) => misses.push(`second tap: ${e}`));
  await page.waitForTimeout(400);
  const filling = await page.$$eval('.map line.filling', (l) => l.length);
  const note = await page.$eval('.panel .note', (e) => e.textContent.replace(/\s+/g,' ').trim())
    .catch(() => '(none)');
  console.log('  filling :', filling ? `${filling} line drawing` : '⚠️ nothing is filling');
  console.log('  panel   :', note);
  if (!filling) misses.push('the route did not start filling');
  // ★ A ROUTE BEING MADE MUST NOT ALREADY LOOK MADE. It shipped drawing solid
  // for its whole length the instant it started, so the far end read as reached
  // with twelve seconds still to run.
  const early = await page.$$eval('.map line:not(.unmade):not(.filling)', (l) => l.length);
  console.log('  during  :', early ? `⚠️ ${early} route(s) already drawn made` : 'still dashed under the fill');
  if (early) misses.push(`${early} route(s) drawn as made while still filling`);
  // Watch it finish.
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    if (!await page.$$eval('.map line.filling', (l) => l.length)) break;
  }
  const made = await page.$$eval('.map line:not(.unmade):not(.filling)', (l) => l.length);
  console.log('  made    :', made ? `${made} solid route(s)` : '⚠️ nothing became solid');
  if (!made) misses.push('the route never became solid');
} else { misses.push('Connect was never offered'); }

// Tap a dot on Journey and travel from the panel.
await page.locator('nav button', { hasText: 'Journey' }).click();
await page.waitForTimeout(400);
const before = await page.$eval('.purse b', (e) => e.textContent);
console.log('\nSELECT AND GO');
console.log('  paces before:', before);
// wait until something is affordable
for (let i = 0; i < 12; i++) {
  const open = await page.$$eval('.map g.open', (g) => g.length);
  if (open) break;
  await page.waitForTimeout(3000);
}
const openDot = page.locator('.map g.open').first();
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
  const found = await page.$$eval('.map g.you text', (t) => t.map((x) => x.textContent));
  console.log('  standing:', found.join(''));
} else { misses.push('nothing ever became affordable'); }

await page.screenshot({ path: SHOT });
console.log(`\nscreenshot → ${SHOT}`);
if (misses.length) { console.log('\n⚠️ PROBLEMS'); for (const m of misses) console.log('  ', m); }
await b.close();
process.exit(misses.length ? 1 : 0);
