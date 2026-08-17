// PLAYS THE DELVE and reports what a player would actually see.
//
// ★ Slice one of the dungeon pivot, 2026-08-16. `scripts/play-camp.mjs` drives
// the town, which is no longer mounted — it stays on disk with the town, and
// this is the check that applies to what ships.
//
// ⚠️ IT WALKS THE DUNGEON RATHER THAN READING THE STATE. Every check here is
// a thing a thumb did and a thing the screen then said; the engine already
// has 20 unit tests and they cannot see a room that is drawn in the wrong
// place, a button that does nothing, or a fight that never opens.
//
// Exit 0 only when every check passed. `npm run delve`.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const EXE = ['/opt/pw-browsers/chromium/chrome-linux/chrome',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const URL = process.env.PLAY_URL ?? 'http://localhost:4173/';
const SHOT = 'play-delve.png';
const misses = [];

const b = await chromium.launch({ executablePath: EXE });
const page = await b.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => misses.push(`page error: ${e.message.slice(0, 90)}`));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const rooms = () => page.locator('.node').count();
const panel = async () => (await page.locator('.panel').textContent())
  .replace(/\s+/g, ' ').trim();
const head = async () => (await page.locator('header').textContent())
  .replace(/\s+/g, ' ').trim();
/** Walk a door by tapping the room, and wait out the walk. */
const walk = async (name) => {
  await page.locator('.node', { hasText: name }).first().click({ timeout: 3000 })
    .catch(() => misses.push(`no room to tap called ${name}`));
  await page.waitForTimeout(7000);
};

console.log('THE MOUTH');
const first = await rooms();
console.log('  drawn   :', `${first} rooms`);
// ⚠️ THE DARK IS THE POINT. A first frame that draws the whole dungeon has
// handed over the map, and learning the shape IS the game.
if (first !== 2) {
  misses.push(`the first frame draws ${first} rooms — wanted 2, the mouth and its one door`);
}
console.log('  says    :', `"${(await panel()).slice(0, 60)}"`);
console.log('  header  :', `"${(await head()).slice(0, 60)}"`);
if (!/12\s*\/12/.test(await head())) misses.push('the delver does not start whole');

console.log('\nWALKING A DOOR');
await walk('Broken Hall');
const second = await rooms();
console.log('  drawn   :', `${second} rooms`);
// The hall forks: standing in it must reveal both forks and nothing beyond.
if (!(second > first)) misses.push(`walking revealed nothing: ${first} → ${second}`);
if (second > 4) misses.push(`walking revealed too much at once: ${second} rooms`);
const inHall = await panel();
if (!/Broken Hall/.test(inHall)) misses.push(`the panel does not name the room: "${inHall.slice(0, 50)}"`);

console.log('\nSOMETHING IS ALREADY HERE');
await walk('Rat Warren');
const squares = await page.locator('.sq').count();
console.log('  line    :', `${squares} squares`);
if (squares < 2) misses.push(`the lair did not field a line: ${squares} squares`);
const fight = await panel();
console.log('  says    :', `"${fight.slice(0, 70)}"`);
// ⚠️ THE ANSWER MUST BE ON SCREEN BEFORE THE SWING. A turn-based fight whose
// cost you learn afterwards is a coin toss with extra steps.
if (!/they answer \d/.test(fight)) {
  misses.push(`the line does not say what it costs to swing: "${fight.slice(0, 60)}"`);
}
await page.screenshot({ path: SHOT });

console.log('\nSWINGING');
const hpBefore = Number((await head()).match(/(\d+)\s*\/12/)?.[1] ?? -1);
await page.locator('.sq').first().click({ timeout: 3000 })
  .catch(() => misses.push('the line cannot be swung at'));
await page.waitForTimeout(400);
const hpAfter = Number((await head()).match(/(\d+)\s*\/12/)?.[1] ?? -1);
console.log('  life    :', `${hpBefore} → ${hpAfter}`);
if (!(hpAfter < hpBefore)) misses.push(`swinging cost nothing: ${hpBefore} → ${hpAfter}`);

console.log('\nCLEARING IT');
for (let i = 0; i < 12; i++) {
  const live = page.locator('.sq:not([disabled])');
  if (await live.count() === 0) break;
  await live.first().click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(250);
}
const done = await panel();
console.log('  says    :', `"${done.slice(0, 70)}"`);
const carried = Number((await head()).match(/(\d+)\s*CARRIED/i)?.[1] ?? 0);
console.log('  carried :', carried);
// The room paid, and the purse is not the hoard: banking is a separate move.
if (!(carried > 0)) misses.push(`a cleared lair paid nothing: header "${await head()}"`);
if (!/BANKED/i.test(await head())) misses.push('the header does not separate carried from banked');

await b.close();
if (misses.length) {
  console.log('\n⚠️ PROBLEMS');
  for (const m of misses) console.log('  ', m);
  process.exit(1);
}
console.log('\nall good — the dark lifts a step at a time, and the lair fights back');
