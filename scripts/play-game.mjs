// PLAY THE NEW LOOP AND WRITE DOWN WHAT HAPPENS.
//
// The screen it drives has no canvas, no camera and no absolute positioning, so
// most of what the last probe existed to catch cannot happen. What is left is
// worth checking twice over: can you actually play, and does the page look the
// same on a short screen as a tall one — the defect that survived four rounds
// of fixes because a headless browser has no URL bar.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const EXE = ['/opt/pw-browsers/chromium/chrome-linux/chrome',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const SHOT = process.argv[2] ?? 'play.png';
const b = await chromium.launch({ executablePath: EXE });
const misses = [];
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => misses.push(`page error: ${e}`));
page.on('console', (m) => { if (m.type() === 'error') misses.push(`console: ${m.text()}`); });
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForSelector('.place h1', { timeout: 15000 });

const read = () => page.evaluate(() => ({
  said: document.querySelector('.said')?.textContent?.trim() ?? '',
  place: document.querySelector('.place h1')?.textContent?.trim() ?? '',
  body: document.querySelector('.place p')?.textContent?.trim().slice(0, 60) ?? '',
  paces: document.querySelector('.purse b')?.textContent?.trim() ?? '',
  rate: document.querySelector('.rate')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  wait: document.querySelector('.wait')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  ways: [...document.querySelectorAll('.way')].map((w) => w.textContent.replace(/\s+/g, ' ').trim()),
  tally: document.querySelector('.tally')?.textContent?.trim() ?? '',
}));

const open = await read();
console.log('OPENING SCREEN');
console.log('  it says   :', open.said);
console.log('  you are at:', open.place);
console.log('  prose     :', `"${open.body}…"`);
console.log('  paces     :', open.paces);
console.log('  the rate  :', open.rate);
console.log('  next thing:', open.wait || '(nothing pending)');
for (const w of open.ways) console.log('  way       :', w);

// Rest, and watch it pay.
// Nothing to press: standing still gathers.
console.log('\nRESTING');
for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(5000);
  const s = await read();
  console.log(`  ${(i + 1) * 5}s  ${s.paces.padStart(3)} paces   ${s.ways[0] ?? ''}`);
}

// Walk as far as the paces allow, taking the cheapest open way each time.
console.log('\nWALKING');
const path = [];
for (let step = 0; step < 8; step++) {
  const takeable = await page.evaluate(() =>
    [...document.querySelectorAll('.way')].findIndex((w) => !w.classList.contains('shut')));
  if (takeable < 0) { console.log('  nothing affordable yet'); break; }
  const label = await page.locator('.way').nth(takeable).locator('.name').textContent();
  await page.locator('.way').nth(takeable).click({ timeout: 3000 })
    .catch((e) => misses.push(`way ${label} would not take: ${e}`));
  await page.waitForTimeout(400);
  const s = await read();
  if (s.place !== label?.trim()) misses.push(`tapped ${label}, still at ${s.place}`);
  path.push(`${s.place} (${s.paces} left)`);
  await page.waitForTimeout(2500);
}
console.log('  ' + (path.join(' -> ') || '(went nowhere)'));

const end = await read();
console.log('\nWHERE IT ENDED');
console.log('  at    :', end.place);
console.log('  paces :', end.paces);
console.log('  found :', end.tally);

// Reload, and reload with the clock moved on.
const before = await read();
await page.waitForTimeout(1200);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.place h1');
await page.waitForTimeout(600);
const after = await read();
console.log('\nRELOAD');
console.log(`  ${before.place} ${before.paces} paces  ->  ${after.place} ${after.paces} paces`);
// ⚠️ NOT EQUALITY, AND NOT ONLY THE PLACE EITHER.
//
// Judging only the place gave a FALSE PASS once: the paces had been wiped to
// zero but the player was standing at the starting place, so "survived" and
// "reset to a fresh game" looked identical.
//
// Then equality on the paces made it FLAKY, because paces now accrue every
// three seconds whether or not anything is pressed — so a reload legitimately
// lands on a different number and the run had done nothing wrong.
//
// The actual claim is that the run was not WIPED: same place, and the paces did
// not fall back toward a fresh game.
const kept = before.place === after.place
  && Number(after.paces) >= Number(before.paces) - 1;
console.log('  verdict:', kept ? 'the run survived' : '⚠️ THE RUN DID NOT SURVIVE');
if (!kept) misses.push('the run did not survive a reload');

// ⚠️ LEAVE IT WORKING. The button toggles, so clicking it blindly STOPPED the
// work the walk had already started — and then "two hours away paid nothing"
// was the probe's own doing rather than the game's. Absence only banks what was
// running when you left, which is the design, so the check has to set that up.
await page.waitForTimeout(1500);
const paced = (await read()).paces;
await page.addInitScript(() => {
  const R = Date; const skip = 2 * 3600 * 1000;
  window.Date = class extends R { constructor(...a) { super(...(a.length ? a : [R.now() + skip])); }
    static now() { return R.now() + skip; } };
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.place h1');
await page.waitForTimeout(800);
const away = await read();
console.log('\nTWO HOURS AWAY');
console.log(`  ${paced} paces -> ${away.paces} paces`);
console.log('  says   :', away.said);
if (Number(away.paces) <= Number(paced)) misses.push('two hours away paid nothing');

// Does the page look the same on a short screen? No fixed positioning means it
// should be identical bar the scroll — this is the check the old screen failed.
const shape = async (height) => {
  const p2 = await b.newPage({ viewport: { width: 390, height }, deviceScaleFactor: 2 });
  await p2.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await p2.waitForSelector('.place h1');
  const out = await p2.evaluate(() => {
    const m = document.querySelector('main').getBoundingClientRect();
    return { w: Math.round(m.width), overflow: document.body.scrollWidth > window.innerWidth };
  });
  await p2.close();
  return out;
};
const tall = await shape(844); const squat = await shape(560);
console.log('\nSHAPE');
console.log(`  844px box: main ${tall.w}px wide, sideways scroll ${tall.overflow ? '⚠️ yes' : 'no'}`);
console.log(`  560px box: main ${squat.w}px wide, sideways scroll ${squat.overflow ? '⚠️ yes' : 'no'}`);
if (tall.w !== squat.w) misses.push('the column width changes with the viewport height');
if (tall.overflow || squat.overflow) misses.push('the page scrolls sideways');

await page.screenshot({ path: SHOT, fullPage: false });
console.log(`\nscreenshot → ${SHOT}`);
if (misses.length) { console.log('\n⚠️ PROBLEMS'); for (const m of misses) console.log('  ', m); }
await b.close();
process.exit(misses.length ? 1 : 0);
