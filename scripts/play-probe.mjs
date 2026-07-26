// PLAY THE GAME AND WRITE DOWN WHAT HAPPENS.
//
// Every UI change this project shipped for weeks was shipped blind: built,
// typechecked, tested, deployed, and never once looked at. The owner kept
// finding things in a screenshot that nobody here had ever seen — an empty
// board, a stuck label, a number contradicting the number beside it.
//
// This drives the REAL BUILD in a REAL BROWSER at phone size, taps the verbs a
// player would tap in the order a player would tap them, and prints what every
// HUD number did over time. It is not a pass/fail gate (see check-alignment.mjs
// for that) — it is a way to SEE the game without a phone.
//
//   npx vite build && npx vite preview --port 4173 &
//   npm run play -- shot.png 150
//
// It caught, on its first run: the ladder crediting `lifetimeVerified`, which
// inflated the attention cap — the game's designed bottleneck — from 4 to 13 in
// 150 seconds of tapping. No unit test would have found that, because every
// individual piece was behaving exactly as written.
// A realistic session: use every verb the game offers, the way a player would,
// and record what each HUD number does over time.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const EXE = ['/opt/pw-browsers/chromium/chrome-linux/chrome',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  .find((p) => existsSync(p));

const SECONDS = Number(process.argv[3] ?? 120);
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:4173/incrgame/', { waitUntil: 'load' });
await page.waitForSelector('.hud');
await page.waitForTimeout(1500);

// Read HUD cells BY LABEL, never by index. The first version indexed into
// `.stats div`, so inserting one cell silently shifted every column and the
// probe reported context under the heading "checked" — the same
// one-word-two-quantities bug src/core/readouts.ts exists to prevent, in the
// tool built to catch it.
const read = async () => {
  const cells = await page.$$eval('.stats div', (ds) => Object.fromEntries(
    ds.map((d) => [d.querySelector('span')?.textContent?.trim() ?? '?',
                   d.querySelector('b')?.textContent?.trim() ?? '?'])));
  const head = await page.$eval('.headline b', (e) => e.textContent.trim());
  const nodes = await page.$$eval('.node', (n) => n.length);
  const dotted = await page.$$eval('.line', (n) => n.length);
  // Agent affordability is the repricing done-criterion, so the probe watches
  // for it. It does NOT buy one — buying changes the run it is measuring.
  const agents = await page.$$eval('.mach', (bs) => bs
    .map((b) => (b.disabled ? '-' : '+') + (b.querySelector('em')?.textContent?.trim() ?? '')));
  return { t: 0, statements: head, passages: cells.passages, recovered: cells.recovered,
           context: cells.context, checked: cells.checked, agreeing: cells.agreeing,
           attention: cells.attention, nodes, dotted, agents: agents.join(' ') };
};

const log = [];
const t0 = Date.now();
let lastLog = -1;

while ((Date.now() - t0) / 1000 < SECONDS) {
  const secs = Math.floor((Date.now() - t0) / 1000);
  if (secs % 15 === 0 && secs !== lastLog) {
    lastLog = secs;
    log.push({ ...(await read()), t: secs });
  }
  // Priority order a player would use: connect anything offered, then discover,
  // then keep the ladder fed.
  const dot = page.locator('button.line:not([disabled])').first();
  if (await dot.count() && await dot.isEnabled().catch(() => false)) {
    // force + short timeout: the graph is a live force simulation, so Playwright's
    // default "wait for the element to stop moving" never succeeds and each click
    // burned its full 8s timeout. A 600s run spent 400 of them retrying one
    // wobbling button, and logged it as a frozen economy.
    await dot.click({ force: true, timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(150);
    continue;
  }
  const disc = page.locator('button.act', { hasText: 'Discover' });
  if (await disc.isEnabled().catch(() => false)) {
    await disc.click().catch(() => {});
    await page.waitForTimeout(150);
    continue;
  }
  // REVIEW. The desk is how unverified statements become checked, and checked
  // is the only currency that buys anything. A probe that never reviews reports
  // a deadlock that is really just a player refusing to play — this one did,
  // and the "frozen economy" it found at t=120 was partly its own fault.
  const review = page.locator('button.act', { hasText: 'Review' });
  if (await review.count() && await review.isEnabled().catch(() => false)) {
    await review.click().catch(() => {});
    await page.waitForTimeout(250);
    const commit = page.locator('.sheet-foot button.primary');
    if (await commit.count() && await commit.isEnabled().catch(() => false)) {
      await commit.click().catch(() => {});
    } else {
      await page.locator('.sheet-foot button', { hasText: 'back' }).click().catch(() => {});
    }
    await page.waitForTimeout(200);
    continue;
  }

  // Growing the context window comes before extracting: a full window blocks
  // discovery outright, so a player who could afford it and did not would be
  // measuring a stall they chose.
  const grow = page.locator('button.act', { hasText: 'Grow context' });
  if (await grow.count() && await grow.isEnabled().catch(() => false)) {
    await grow.click().catch(() => {});
    await page.waitForTimeout(150);
    continue;
  }
  const ex = page.locator('button.act', { hasText: 'Extract' });
  if (await ex.isEnabled().catch(() => false)) { await ex.click().catch(() => {}); }
  else await page.locator('button.act', { hasText: 'Salvage' }).click().catch(() => {});
  await page.waitForTimeout(200);
}
log.push({ ...(await read()), t: Math.floor((Date.now() - t0) / 1000) });

console.log('t    stmts psg  rec  context chk   agree att   nodes dot  agents');
for (const r of log) {
  console.log(
    String(r.t).padEnd(4), String(r.statements).padEnd(5), String(r.passages).padEnd(4),
    String(r.recovered).padEnd(4), String(r.context).padEnd(7), String(r.checked).padEnd(5),
    String(r.agreeing).padEnd(5), String(r.attention).padEnd(5),
    String(r.nodes).padEnd(5), String(r.dotted).padEnd(4), r.agents);
}
if (errors.length) console.log('ERRORS', errors);
await page.screenshot({ path: process.argv[2] ?? 'play.png' });
await browser.close();
