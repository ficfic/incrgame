// PLAY THE GAME AND WRITE DOWN WHAT HAPPENS.
//
// Every UI change this project shipped for weeks was shipped blind: built,
// typechecked, tested, deployed, and never once looked at. The owner kept
// finding things in a screenshot that nobody here had ever seen — an empty
// board, a stuck label, a number contradicting the number beside it.
//
// This drives the REAL BUILD in a REAL BROWSER at phone size, taps the verbs a
// player would tap in the order a player would tap them, and prints what every
// readout did over time. It is not a pass/fail gate (see check-alignment.mjs
// for that) — it is a way to SEE the game without a phone.
//
//   npx vite build && npx vite preview --port 4173 &
//   npm run play -- shot.png 150
//
// ---- REWRITTEN FOR SOLID · RAW · ROT (2026-07-28) --------------------------
//
// The old probe drove an economy that no longer exists: it clicked Extract,
// Discover, Grow context and dotted-line targets, and read a five-cell HUD of
// `statements / recovered / context / checked / agreeing / attention`. All six
// of those nouns and all four of those verbs are deleted. Left alone it would
// have thrown on `.headline b` before the first row — i.e. the probe would
// have failed loudly, which is the correct failure, but it would not have
// played anything.
//
// It now reads the four readouts BY THEIR NOUN, which is the same rule as
// before and the reason it survives a renaming at all: never by index. The
// first version of the old probe indexed into `.stats div`, so inserting one
// cell silently shifted every column and it reported context under the heading
// "checked" — the one-word-two-quantities bug src/core/readouts.ts exists to
// prevent, reproduced inside the tool built to catch it.
//
// ---- PROVEN RED, 2026-07-28 -----------------------------------------------
//
// This is not a pass/fail gate — it prints what happened. "Red" for a probe
// means a real break has to be VISIBLE IN THE TABLE, so that is what was
// tested, with the exact failure it was built after: the engine working
// perfectly while the board draws nothing.
//
//   SABOTAGE   in src/ui/App.svelte, render the concepts under a class the
//              probe does not read:  <div class="nodeX" ...>
//   OBSERVED   the `nodes` column pinned at 0 for the whole run while Words and
//              Solid climbed — the signature of a blank board:
//                t    Words      Solid Raw   Rot   nodes lanes mach bind
//                0    -          -     -     -     0     4     0    -
//                60   3 / 4075   9     -     -     0     4     1    words
//                150  6 / 4075   4     -     -     0     4     1    words
//
// A unit test cannot see this: every readout was right the whole time.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const EXE = ['/opt/pw-browsers/chromium/chrome-linux/chrome',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  .find((p) => existsSync(p));

const SECONDS = Number(process.argv[3] ?? 120);

/** WHICH PLAYER TO BE. `walk` is the intended one; `idle` is the one the whole
 *  economy is shaped around and the ONLY one that can observe the HUD's join
 *  sentence.
 *
 *  ⚠️ WHY A SECOND STRATEGY EXISTS. `factsPerSecond = min(1.2 × machines,
 *  0.15 × Words)`, and a run opens with one Extractor, so one machine covers
 *  eight Words. A walking probe crosses back and forth over that line all run —
 *  which is the design working, and which is why it can never sit in the
 *  flatline for long: it keeps curing it. The idle player takes ONE step (the
 *  HUD is unlearned until a word is bound, so zero steps means zero screen) and
 *  then stops, which is precisely VISION's "an idle-only player flatlines in
 *  about ten minutes and can read exactly why".
 *
 *  ⚠️ AND THIS COMMENT SAID "Words ≤ 2" UNTIL 2026-07-28, because the rate was
 *  0.4 when it was written and stayed 0.4 in six documents after the code moved
 *  to 1.2. Three playtesters read those documents and reported the join as
 *  permanently broken. The share of a run each side binds is now MEASURED, in
 *  `test/balance.test.ts`, not described here. */
const MODE = (process.argv[4] ?? 'walk').toLowerCase();
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.setDefaultTimeout(8000);
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:4173/incrgame/', { waitUntil: 'load' });
await page.waitForSelector('.hud');
await page.waitForTimeout(1500);

/** Read every readout BY ITS NOUN. A missing readout reports `-` rather than
 *  throwing: the HUD is UNLEARNED, so at t=0 there is nothing to read and that
 *  is the designed state, not a fault.
 *
 *  ⚠️ SO `-` MEANS TWO THINGS, and the second one will mislead you. A readout
 *  whose NOUN is still foreign cannot be found by its English name, so the
 *  column reads `-` while the number underneath is real and climbing. Measured
 *  2026-07-28: Rot showed `-` from 1 to 3, because `Rot` turns English at three
 *  of it while the row joins the bar at one. The dock told the truth in the same
 *  run (`loose` was already English, which only happens past one whole Rot).
 *  Reading by position instead would fix the column and reintroduce the
 *  one-word-two-quantities bug this probe was rewritten to avoid. */
const read = async () => {
  const cells = await page.$$eval('.readout', (ds) => Object.fromEntries(
    ds.map((d) => [d.querySelector('span')?.textContent?.trim() ?? '?',
                   d.querySelector('b')?.textContent?.trim() ?? '?'])));
  const nodes = await page.$$eval('.node', (n) => n.length);
  const lanes = await page.$$eval('.lane', (n) => n.length);
  const mach = await page.$$eval('.mach', (n) => n.length);
  // THE LANE JOIN, IN WORDS. Its presence is the whole item: when the
  // vocabulary binds, the HUD has to say so. Recorded as a column so a run
  // where it never appears is visible at a glance.
  const join = await page.$$eval('.join', (n) => n[0]?.textContent?.trim() ?? '');
  // How many ways on the level-of-detail cap is holding back. 79 of 446 beats
  // offer more than 12 choices and one offers 371, so "the strip shows six" is
  // only honest if the number it is not showing is on screen too.
  const more = await page.$$eval('.more-lanes', (n) => n[0]?.textContent?.trim() ?? '');
  // THE DOCK, IN WHATEVER LANGUAGE THE PLAYER HAS. Added 2026-07-28: every
  // ticker line shipped that morning was written in words no beat contains, so
  // they were masked at minute zero and masked at hour ten — and no column in
  // this table would ever have shown it, because the probe never read the dock.
  // A surface the probe cannot see is a surface that ships blind.
  const dock = await page.$$eval('.ticker span', (n) => n.map((s) => s.textContent?.trim() ?? ''));
  return {
    t: 0,
    words: cells.Words ?? '-', solid: cells.Solid ?? '-',
    raw: cells.Raw ?? '-', rot: cells.Rot ?? '-',
    nodes, lanes, mach, join, dock,
    hidden: /\+(\d+)/.exec(more)?.[1] ?? '0',
  };
};

const log = [];
const t0 = Date.now();
let lastLog = -1;
let wentLoose = false;
let lastCheck = -1e9;

/** TWO PHASES, ON PURPOSE.
 *
 *  Half the run walks first — the intended play, since walking is the only
 *  income upgrade in the game. The other half BUILDS first, which is the
 *  mistake the whole economy is shaped around: machines outrunning the
 *  vocabulary that feeds them. That second half is the only way a probe can
 *  ever see the HUD's join sentence, because a player who walks keeps their
 *  vocabulary ahead of one Extractor almost from the first step. A probe that
 *  only ever plays well cannot observe the failure mode the game is about. */
const BUILD_FROM = SECONDS / 2;

/** How often the probe taps Check. NOT every loop.
 *
 *  ⚠️ MEASURED: hammering it every 120 ms drains Raw faster than a loose
 *  Extractor can make it (5 per tap against 0.4/s), so the bar never held a
 *  whole unit of Raw and the run reported `Raw 0 · Rot 0` for its full length.
 *  Check has no cooldown by design; a probe with no restraint measures its own
 *  tap rate rather than the game's. */
const CHECK_EVERY_MS = 20_000;

while ((Date.now() - t0) / 1000 < SECONDS) {
  const secs = Math.floor((Date.now() - t0) / 1000);
  if (secs % 15 === 0 && secs !== lastLog) {
    lastLog = secs;
    log.push({ ...(await read()), t: secs });
  }
  // THE IDLE PLAYER: one step to make the interface exist, then never again.
  const walkedEnough = MODE === 'idle'
    && (await page.$$eval('.readout.goal b', (n) => n.length > 0));
  const building = MODE === 'idle' ? false : secs >= BUILD_FROM;

  // BUY, first once the build phase starts. A machine you cannot feed with
  // vocabulary is a machine that idles — that is the point of the phase.
  if (building) {
    const buy = page.locator('.mach .buy:not([disabled])').first();
    if (await buy.count()) {
      await buy.click({ force: true, timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(150);
      continue;
    }
  }

  // WALK, whenever a lane is affordable.
  //
  // `.lane.dotted:not(.poor)` is the affordable set: `poor` is the class the UI
  // puts on a lane it can see and cannot pay for. Those stay clickable on
  // purpose (they quote their price), so filtering on `:not([disabled])` alone
  // would have the probe spending its run tapping a price tag.
  if (!building && !walkedEnough) {
    const lane = page.locator('button.lane.dotted:not(.poor)').first();
    if (await lane.count()) {
      await lane.click({ force: true, timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(150);
      continue;
    }
  }

  // Let one machine off the leash, ONCE, about a third of the way in.
  // Deliberate: Raw and Rot do not exist for a player who watches everything,
  // so a probe that never flips the toggle can never show whether the stacked
  // bar renders three segments — which is the thing this item shipped.
  if (!wentLoose && secs >= SECONDS / 3) {
    const loose = page.locator('button.watch.on').first();
    if (await loose.count()) {
      await loose.click({ force: true, timeout: 1500 }).catch(() => {});
      wentLoose = true;
      await page.waitForTimeout(150);
      continue;
    }
  }

  // CHECK, occasionally. See CHECK_EVERY_MS.
  if (Date.now() - lastCheck > CHECK_EVERY_MS) {
    const check = page.locator('button.act', { hasText: 'Check' });
    if (await check.count() && await check.isEnabled().catch(() => false)) {
      lastCheck = Date.now();
      await check.click({ force: true, timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(120);
      continue;
    }
  }

  await page.waitForTimeout(250);
}
log.push({ ...(await read()), t: Math.floor((Date.now() - t0) / 1000) });

console.log(`strategy: ${MODE}`);
console.log('t    Words      Solid Raw   Rot   nodes lanes +more mach bind');
for (const r of log) {
  console.log(
    String(r.t).padEnd(4), String(r.words).padEnd(10), String(r.solid).padEnd(5),
    String(r.raw).padEnd(5), String(r.rot).padEnd(5),
    String(r.nodes).padEnd(5), String(r.lanes).padEnd(5), String(r.hidden).padEnd(5),
    String(r.mach).padEnd(4), r.join ? 'words' : '-');
}
// THE DOCK, LINE BY LINE. Printed rather than columned: a ticker line is a
// sentence, and the point of reading it back is seeing WHICH words are English.
const said = new Map();
for (const r of log) for (const line of r.dock) if (line && !said.has(line)) said.set(line, r.t);
console.log('\nTHE DOCK');
for (const [line, t] of said) console.log(String(t).padEnd(5), line);

const bind = log.map((r) => r.join).filter(Boolean).pop();
if (bind) console.log('\nJOIN SENTENCE  ' + bind);
if (errors.length) console.log('ERRORS', errors);
await page.screenshot({ path: process.argv[2] ?? 'play.png' });
await browser.close();
