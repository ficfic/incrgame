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
const misses = [];
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

// 2. Walk to the stack, read the marks (a 2d10 Lore check), open the satchel.
await tapDot('The Cut');
await tapDot('The Stack');
await page.waitForTimeout(400);
await tapDot('The Tally');
await page.waitForTimeout(400);
const afterCheck = await read();
if (afterCheck.satchels) await page.locator('.loot').click().catch(() => {});
await page.waitForTimeout(400);
const afterLoot = await read();

// 3. Go find the shut door.
await tapDot('The Stack');
await tapDot('The Cut');
await tapDot('The Weir');
await page.waitForTimeout(400);
await tapDot('The Far Bank');
await page.waitForTimeout(600);
await settle();
const atDoor = await read();

console.log('\nOVER TIME  (t, you, working, skills)');
for (const r of log) {
  console.log(`  ${String(r.t).padEnd(4)} ${r.you.padEnd(14)} ${r.working ? 'timer' : '     '}  ${r.skills.join(' | ')}`);
}

console.log('\nTHE 2d10 CHECK');
console.log('  odds shown before the tap :', opening.tags.join(' · ') || '(none shown)');
console.log('  dice after the tap        :', afterCheck.dice || '(no dice shown)');
console.log('  narrator                  :', afterCheck.said);

console.log('\nLOOT');
console.log('  satchel held :', afterCheck.satchels || '(none)');
console.log('  after opening:', afterLoot.said);
console.log('  pack         :', afterLoot.pack.join(' · ') || '(empty)');
console.log('  dice         :', afterLoot.dice || '(none)');

console.log('\nTHE SHUT DOOR');
console.log('  standing at :', atDoor.you);
console.log('  ways on     :', atDoor.ways.join(' · ') || '(none)');
for (const s of atDoor.shut) console.log(`  SHUT        : ${s.name} — ${s.why}`);
console.log('  skills      :', atDoor.skills.join(' | ') || '(none)');

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
