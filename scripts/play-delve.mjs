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
const line = await page.locator('.sq').count();
console.log('  in here :', `${line} standing`);
if (line < 2) misses.push(`the lair fielded nothing: ${line}`);
const met = await panel();
console.log('  says    :', `"${met.slice(0, 70)}"`);
// ⚠️ THE PACE MUST BE ON SCREEN. The whole dance is comparing what a thing
// does per second against what you do per second; hiding either half turns
// footwork into a coin toss.
if (!/every [\d.]+s/.test(met)) {
  misses.push(`the line does not say its pace: "${met.slice(0, 60)}"`);
}

console.log('\nSTANDING STILL COSTS YOU');
const hp0 = Number((await head()).match(/(\d+)\s*\/12/)?.[1] ?? -1);
await page.waitForTimeout(2500);
const hp1 = Number((await head()).match(/(\d+)\s*\/12/)?.[1] ?? -1);
console.log('  life    :', `${hp0} → ${hp1} after 2.5s of standing there`);
if (!(hp1 < hp0)) misses.push(`standing in a lair cost nothing: ${hp0} → ${hp1}`);
await page.screenshot({ path: SHOT });

console.log('\nSWINGING');
// ⚠️ SWING BEFORE STEPPING OUT, because standing in a lair is lethal in
// about eight seconds and a probe that dawdles is measuring its own death
// rather than the mechanic. That lethality is the point: see the note below.
// ⚠️ THE SUM OF THE LINE, NOT THE FIRST SQUARE. A swing takes the WEAKEST
// thing standing (no aiming tax), so reading `.sq b` first measured the big
// one and reported "the swing did nothing" while the runt was losing three.
const lineHp = async () => (await page.locator('.sq b').allTextContents())
  .reduce((n, t) => n + Number(t || 0), 0);
const before = await lineHp();
await page.locator('.deed', { hasText: 'Swing' }).first().click({ timeout: 3000 })
  .catch(() => misses.push('cannot swing'));
await page.waitForTimeout(250);
const after = await lineHp();
console.log('  hurt it :', `${before} → ${after}`);
if (!(after < before)) misses.push(`the swing did nothing: ${before} → ${after}`);
// ★ AND IT HAS A COOLDOWN, which is what position is bought with.
if (!(await page.locator('.deed', { hasText: 'Swing' }).first().isDisabled())) {
  misses.push('the swing has no cooldown — position costs nothing');
}

console.log('\nA DOOR IS A DEFENCE');
// ★★★ THE GRIMROCK CLAIM, MEASURED: nothing can touch you between rooms.
await page.locator('.node', { hasText: 'Broken Hall' }).first().click({ timeout: 3000 })
  .catch(() => misses.push('cannot step back through the door'));
await page.waitForTimeout(2000);
const hp2 = Number((await head()).match(/(\d+)\s*\/12/)?.[1] ?? -1);
await page.waitForTimeout(1800);
const hp3 = Number((await head()).match(/(\d+)\s*\/12/)?.[1] ?? -1);
console.log('  mid-door:', `${hp2} → ${hp3}`);
if (hp3 < hp2) misses.push(`bitten while between rooms: ${hp2} → ${hp3}`);

console.log('\nAND IT FOLLOWS YOU THROUGH IT');
await page.waitForTimeout(7000);
const chased = await page.locator('.sq').count();
const alive = !/went down/.test(await panel());
console.log('  through :', `${chased} came after you`, alive ? '' : '(delver fell)');
if (alive && chased < 1) misses.push('nothing followed you through the door — no chase');

await b.close();
if (misses.length) {
  console.log('\n⚠️ PROBLEMS');
  for (const m of misses) console.log('  ', m);
  process.exit(1);
}
console.log('\nall good — it comes for you, a door buys time, and the swing has a price');
