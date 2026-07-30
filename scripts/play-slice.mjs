// PLAY THE SLICE AND WRITE DOWN WHAT HAPPENS.
//
// The old `play-probe.mjs` drives an economy that no longer exists — it reads
// four readouts by their noun (Words, Solid, Raw, Rot) and taps Check and Buy.
// None of those exist on this screen, so it would fail on its first selector.
// That is the correct failure, but it would not play anything.
//
// This one taps what a player taps: a dot to move, a work button to start a
// timer, a satchel to roll for loot. It prints the board's state over time and
// screenshots the end.
//
//   npx vite build && npx vite preview --port 4173 &
//   node scripts/play-slice.mjs [shot.png] [seconds]
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

// Same two paths as `play-probe.mjs`: the image ships Chromium, and
// PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD means playwright-core has no bundled copy
// to fall back on. Never run `playwright install` here.
const EXE = ['/opt/pw-browsers/chromium/chrome-linux/chrome',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  .find((p) => existsSync(p));

const misses = [];
const SHOT = process.argv[2] ?? 'play.png';
const RUN = Number(process.argv[3] ?? 90);
const URL = 'http://localhost:4173/';

const b = await chromium.launch({ executablePath: EXE });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(URL, { waitUntil: 'networkidle' });

// ⚠️ PROVE THE PAGE IS ALIVE BEFORE BELIEVING ANYTHING ELSE. A gate that
// "passes" against a blank page has happened in this repo more than once.
await page.waitForSelector('.dot.you', { timeout: 15000 });

// The introduction stands in front of a first-time board, which is the point of
// it — so dismiss it the way a player does, and SAY whether it was there. A run
// that silently skipped a modal would report a game nobody can actually reach.
const sawIntro = await page.locator('.intro').count() > 0;
if (sawIntro) {
  await page.locator('.introBox .act').click({ timeout: 4000 })
    .catch(() => misses.push('the introduction would not dismiss'));
  await page.waitForTimeout(300);
}
console.log('introduction:', sawIntro ? 'shown, then dismissed' : 'not shown (returning player)');

// ⚠️ WAIT FOR THE LAYOUT TO STOP MOVING BEFORE TOUCHING ANYTHING. d3-force
// settles over a few seconds and the camera re-fits as it does, so every
// control is a moving target until it lands. The first run of this probe
// clicked the work button while it was still drifting, the click timed out into
// an empty catch, and the report showed a timer that simply never ran.
const settle = async () => {
  let last = '';
  for (let i = 0; i < 40; i++) {
    const now = await page.evaluate(() => [...document.querySelectorAll('.dot')]
      .map((d) => { const r = d.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)}`; })
      .join('|'));
    if (now === last) return true;
    last = now;
    await page.waitForTimeout(250);
  }
  return false;
};
if (!await settle()) console.log('⚠️ the board never stopped moving');

const read = async () => page.evaluate(() => ({
  said: document.querySelector('.said')?.textContent?.trim() ?? '',
  you: document.querySelector('.dot.you .name')?.textContent?.trim() ?? '',
  ways: [...document.querySelectorAll('.dot.way .name')].map((n) => n.textContent.trim()),
  shut: [...document.querySelectorAll('.dot.shut')].map((n) => ({
    name: n.querySelector('.name')?.textContent?.trim(),
    why: n.querySelector('.tag.shut')?.textContent?.trim(),
  })),
  tags: [...document.querySelectorAll('.dot .tag:not(.shut)')].map((n) => n.textContent.trim()),
  dice: document.querySelector('.dice')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  skills: [...document.querySelectorAll('.skills li')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()),
  pack: [...document.querySelectorAll('.pack li')].map((n) => n.textContent.trim()),
  satchels: document.querySelector('.loot')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
  card: document.querySelector('.card p')?.textContent?.trim().slice(0, 70) ?? '',
  working: document.querySelector('.bar') !== null,
}));

const log = [];
// ⚠️ A SWALLOWED TAP IS THE BUG THIS PROBE EXISTS TO CATCH. The first run
// reported the player standing still and said nothing about why: the card was
// covering the dot and every click threw, into an empty catch. So a tap that
// fails is now LOUD, and a tap that lands but does not move is reported too.
const tapDot = async (name) => {
  const dot = page.locator('.dot', { has: page.locator(`.name:text-is("${name}")`) }).first();
  if (await dot.count() === 0) { misses.push(`no dot named ${name}`); return false; }
  const before = await page.locator('.dot.you .name').textContent().catch(() => '');
  try {
    await dot.click({ timeout: 3000 });
  } catch (e) {
    misses.push(`tap on ${name} was blocked: ${String(e).split('\n')[0]}`);
    return false;
  }
  await page.waitForTimeout(250);
  const after = await page.locator('.dot.you .name').textContent().catch(() => '');
  if (before === after && name !== before) misses.push(`tapped ${name}, still at ${after}`);
  return true;
};

const opening = await read();
console.log('OPENING SCREEN');
console.log('  narrator :', opening.said);
console.log('  you are  :', opening.you);
console.log('  ways on  :', opening.ways.join(' · ') || '(none)');
console.log('  card     :', opening.card ? `"${opening.card}…"` : '(no text on screen)');
console.log('  chrome   :', [
  opening.skills.length ? `skills(${opening.skills.length})` : null,
  opening.pack.length ? `pack(${opening.pack.length})` : null,
  opening.satchels ? 'satchel' : null,
  opening.working ? 'timer' : null,
].filter(Boolean).join(' ') || '(nothing — one line and a board)');

// 1. Start the timer where we stand, and let it pay at least twice.
try {
  await page.locator('.act').first().click({ timeout: 4000 });
} catch (e) {
  misses.push(`could not start the timed action: ${String(e).split('\n')[0]}`);
}
const t0 = Date.now();
while ((Date.now() - t0) / 1000 < Math.min(RUN, 50)) {
  await page.waitForTimeout(5000);
  const s = await read();
  log.push({ t: Math.round((Date.now() - t0) / 1000), ...s });
}

// 2. WALK. The route used to be hardcoded for a six-place valley; at
//    thirty-seven places that script asked for dots that were not adjacent and
//    reported them as failures. A player taps whatever way is open, so this
//    does that — and it exercises whichever region the walk wanders into.
const path = [];
const rolls = [];
let satchelsSeen = 0;
for (let step = 0; step < 14; step++) {
  const openWays = await page.evaluate(() => [...document.querySelectorAll('.dot.way .name')]
    .map((n) => n.textContent.trim()));
  if (!openWays.length) break;
  // Prefer somewhere new, so the walk pushes outward instead of pacing.
  const fresh = openWays.filter((n) => !path.includes(n));
  const pick = (fresh.length ? fresh : openWays)[step % (fresh.length || openWays.length)];
  if (!await tapDot(pick)) break;
  path.push(pick);
  const s = await read();
  if (s.dice) rolls.push(`${pick}: ${s.dice}`);
  if (s.satchels) {
    satchelsSeen++;
    await page.locator('.loot').click({ timeout: 3000 }).catch(() => misses.push('satchel would not open'));
    await page.waitForTimeout(250);
    const after = await read();
    rolls.push(`  satchel -> ${after.said}`);
  }
  await page.waitForTimeout(200);
}
const atDoor = await read();

console.log('\nOVER TIME  (t, you, working, skills)');
for (const r of log) {
  console.log(`  ${String(r.t).padEnd(4)} ${r.you.padEnd(14)} ${r.working ? 'timer' : '     '}  ${r.skills.join(' | ')}`);
}

console.log('\nTHE WALK');
console.log('  path  :', path.join(' -> ') || '(went nowhere)');
console.log('  rolls :');
for (const r of rolls) console.log('   ', r);
console.log('  satchels found :', satchelsSeen);

console.log('\nWHERE IT ENDED');
console.log('  standing at :', atDoor.you);
console.log('  pack        :', atDoor.pack.join(' · ') || '(empty)');
console.log('  ways on     :', atDoor.ways.join(' · ') || '(none)');
for (const s of atDoor.shut) console.log(`  SHUT        : ${s.name} — ${s.why}`);
console.log('  skills      :', atDoor.skills.join(' | ') || '(none)');

// 3b. ★ RELOAD WHILE A JOB IS RUNNING. This is the case that ate runs: the
//     autosave was a 700ms debounce re-armed by a 4Hz tick, so it was starved
//     for exactly as long as a job ran — and starting a job is the opening move
//     of the game. Reloading with the job STOPPED survived fine, which is why
//     the earlier reload check missed it entirely.
const midJob = async () => {
  // Use the job already running if there is one; otherwise walk back to a place
  // that has work and start one. Reporting "nowhere to test" would be a guard
  // that quietly checks nothing, which is the failure mode this repo keeps
  // rediscovering.
  if (!(await read()).working) {
    let found = false;
    for (let hop = 0; hop < 12 && !found; hop++) {
      const act = page.locator('.act').first();
      if (await act.count() > 0 && await act.isEnabled()) {
        await act.click({ timeout: 4000 }).catch(() => {});
        found = (await read()).working;
        if (found) break;
      }
      const ways = await page.evaluate(() => [...document.querySelectorAll('.dot.way .name')]
        .map((n) => n.textContent.trim()));
      if (!ways.length) break;
      await tapDot(ways[hop % ways.length]);
      await page.waitForTimeout(250);
    }
    if (!found) { misses.push('could not start a job to test a mid-job reload'); return; }
  }
  await page.waitForTimeout(3500);              // let it pay at least once
  const before = await read();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.dot.you', { timeout: 15000 });
  await settle();
  const after = await read();
  const kept = JSON.stringify(before.skills) === JSON.stringify(after.skills);
  console.log('\nRELOAD MID-JOB');
  console.log('  before :', before.skills.join(' | ') || '(none)');
  console.log('  after  :', after.skills.join(' | ') || '(none)');
  console.log('  verdict:', kept ? 'the run survived' : '⚠️ RELOADING MID-JOB ATE THE RUN');
  if (!kept) misses.push('reloading mid-job ate the run');
};
await midJob();

// 4. ★ RELOAD. A save that does not survive this is not a save. The seed has
//    to come back too, or the next roll differs from the one you were about to
//    make — see docs/DICE.md.
const before = await read();
await page.waitForTimeout(1200);            // let the debounced write land
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.dot.you', { timeout: 15000 });
await settle();
const after = await read();

console.log('\nRELOAD');
console.log('  before :', before.you, '|', before.skills.join(' | '), '|', before.pack.join(' · ') || 'empty pack');
console.log('  after  :', after.you, '|', after.skills.join(' | '), '|', after.pack.join(' · ') || 'empty pack');
const kept = before.you === after.you
  && JSON.stringify(before.skills) === JSON.stringify(after.skills)
  && JSON.stringify(before.pack) === JSON.stringify(after.pack);
console.log('  verdict:', kept ? 'the run survived' : '⚠️ THE RUN DID NOT SURVIVE');
if (!kept) misses.push('the run did not survive a reload');

// 4b. ★ OFFLINE. The headline feature and the one that cannot be checked by
//     waiting: start a job, save, then come back with the CLOCK TWO HOURS
//     LATER. Date.now is overridden before any script runs, so the page's own
//     restore path does the arithmetic for real.
const offline = async () => {
  if (!(await read()).working) {
    const act = page.locator('.act').first();
    if (await act.count() === 0) { misses.push('no work action for the offline check'); return; }
    await act.click({ timeout: 4000 }).catch(() => {});
  }
  await page.waitForTimeout(1500);
  const before = await read();
  await page.addInitScript(() => {
    const skip = 2 * 60 * 60 * 1000;
    const RealDate = Date;
    const patched = class extends RealDate {
      constructor(...a) { super(...(a.length ? a : [RealDate.now() + skip])); }
      static now() { return RealDate.now() + skip; }
    };
    window.Date = patched;
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.dot.you', { timeout: 15000 });
  await settle();
  const after = await read();
  const away = await page.locator('.away').textContent().catch(() => '');
  console.log('\nTWO HOURS AWAY');
  console.log('  before :', before.skills.join(' | ') || '(none)');
  console.log('  after  :', after.skills.join(' | ') || '(none)');
  console.log('  says   :', away?.trim() || '(nothing)');
  const paid = before.skills.join('|') !== after.skills.join('|');
  console.log('  verdict:', paid ? 'the absence paid' : '⚠️ ABSENCE PAID NOTHING');
  if (!paid) misses.push('two hours away paid nothing');
};
await offline();

// 5. ★ THE LAYOUT AUDIT. Every UI defect this project has shipped was found by
//    looking at a picture — dots stacked inside 30px, a card slicing the last
//    word off every line, labels walking off the edge. These two checks are
//    those bugs turned into assertions, so the next one fails a run instead of
//    a playtest.
const layout = await page.evaluate(() => {
  // ⚠️ THIS CHECK WAS VACUOUS ONCE ALREADY. The first version asked whether a
  // DOT's label was covered — and dots sit at z-index 6 against the card's 5,
  // so a dot can never lose that contest and the check could not fail. Proven:
  // the card was moved to cover the entire board and it still reported "none",
  // while the run broke because the work button was unreachable.
  //
  // The defect it was written for is the OTHER direction: dots drawing through
  // the prose. So it samples the card's own text and asks what is on top.
  const covered = [];
  const prose = document.querySelector('.card p');
  if (prose) {
    const r = prose.getBoundingClientRect();
    for (let i = 1; i <= 8; i++) {
      const x = r.left + (r.width * i) / 9;
      for (const y of [r.top + 6, r.top + r.height / 2, r.bottom - 6]) {
        const top = document.elementFromPoint(x, y);
        if (top && !prose.contains(top) && top !== prose) {
          const what = `${top.tagName}.${String(top.className).split(' ')[0]}`;
          if (!covered.includes(what)) covered.push(what);
        }
      }
    }
  }
  const offscreen = [...document.querySelectorAll('.dot .name')]
    .map((n) => ({ t: n.textContent.trim(), r: n.getBoundingClientRect() }))
    .filter((x) => x.r.width > 0 && (x.r.left < 0 || x.r.right > window.innerWidth))
    .map((x) => x.t);
  const body = document.body;
  return { covered, offscreen, hScroll: body.scrollWidth > window.innerWidth };
});
console.log('\nLAYOUT');
console.log('  prose covered by :', layout.covered.length ? layout.covered.join(' | ') : 'nothing');
console.log('  labels off-screen:', layout.offscreen.length ? layout.offscreen.join(' | ') : 'none');
console.log('  page scrolls sideways:', layout.hScroll ? '⚠️ yes' : 'no');
if (layout.covered.length) misses.push(`the card's prose is covered by ${layout.covered.join(', ')}`);
if (layout.offscreen.length) misses.push(`labels off-screen: ${layout.offscreen.join(', ')}`);
if (layout.hScroll) misses.push('the page scrolls sideways');

await page.screenshot({ path: SHOT });
console.log(`\nscreenshot → ${SHOT}`);

// 5. The save sheet, so "you can move a run between devices" is a thing that
//    was SEEN and not merely asserted.
await page.locator('.gear').click({ timeout: 3000 }).catch(() => misses.push('gear did not open'));
await page.waitForTimeout(300);
const sheetShot = SHOT.replace(/\.png$/, '-save.png');
const sheetUp = await page.locator('.sheet').count() > 0;
console.log('  save sheet  :', sheetUp ? 'open' : '⚠️ did not open');
if (!sheetUp) misses.push('the save sheet did not open');
await page.screenshot({ path: sheetShot });
console.log(`screenshot → ${sheetShot}`);

if (misses.length) {
  console.log('\n⚠️ TAPS THAT DID NOT DO WHAT A PLAYER WOULD EXPECT');
  for (const m of misses) console.log('  ', m);
}

if (errors.length) {
  console.log('\n⚠️ CONSOLE ERRORS');
  for (const e of errors.slice(0, 8)) console.log('  ', e);
}
await b.close();
process.exit(errors.length ? 1 : 0);
