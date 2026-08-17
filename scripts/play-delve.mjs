// PLAYS THE DELVE and reports what a player would actually see.
//
// ★★★ TURN-BASED, 2026-08-16. The owner: *"why is it real time fights / let's
// do turn based"*. Every `waitForTimeout` that used to be "wait out the walk"
// or "wait out the cooldown" is gone; what is left is one deliberate three-
// second pause whose entire job is to prove that NOTHING HAPPENS during it.
//
// ⚠️ IT WALKS THE DUNGEON RATHER THAN READING THE STATE. Every check here is
// a thing a thumb did and a thing the screen then said; the engine has 22 unit
// tests and they cannot see a room drawn in the wrong place, a button that
// does nothing, or a fight that never opens.
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
await page.waitForTimeout(700);

const rooms = () => page.locator('.node').count();
const flat = async (sel) => (await page.locator(sel).textContent()).replace(/\s+/g, ' ').trim();
const panel = () => flat('.panel');
const head = () => flat('header');
const life = async () => Number((await head()).match(/(\d+)\s*\/12/)?.[1] ?? -1);
const turn = async () => Number((await head()).match(/(\d+)\s*TURN/i)?.[1] ?? -1);
/** Tap a room. It is one tap — no confirm, and no walk to wait out. */
const walk = async (name) => {
  await page.locator('.node', { hasText: name }).first().click({ timeout: 3000 })
    .catch(() => misses.push(`no room to tap called ${name}`));
  await page.waitForTimeout(160);
};
const press = async (label) => {
  await page.locator('.deed', { hasText: label }).first().click({ timeout: 3000 })
    .catch(() => misses.push(`cannot press ${label}`));
  await page.waitForTimeout(160);
};

console.log('THE MOUTH');
const first = await rooms();
console.log('  drawn   :', `${first} rooms`);
// ⚠️ THE DARK IS THE POINT. A first frame that draws the whole dungeon has
// handed over the map, and learning the shape IS the game.
if (first !== 2) {
  misses.push(`the first frame draws ${first} rooms — wanted 2, the mouth and its one door`);
}
console.log('  header  :', `"${(await head()).slice(0, 70)}"`);
if ((await life()) !== 12) misses.push('the delver does not start whole');
if ((await turn()) !== 0) misses.push(`the run does not start on turn 0: ${await turn()}`);

console.log('\nA STEP IS A TURN');
await walk('Broken Hall');
const second = await rooms();
console.log('  drawn   :', `${second} rooms`, '· turn', await turn());
if (!(second > first)) misses.push(`walking revealed nothing: ${first} → ${second}`);
if (second > 4) misses.push(`walking revealed too much at once: ${second} rooms`);
// ★★★ ONE ACTION, ONE TURN. If a step costs anything other than exactly one,
// nothing else on this screen can be counted on.
if ((await turn()) !== 1) misses.push(`a step cost ${await turn()} turns, not 1`);
if (!/Broken Hall/.test(await panel())) misses.push('the panel does not name the room');

console.log('\nSOMETHING IS ALREADY HERE');
await walk('Rat Warren');
const standing = await page.locator('.sq').count();
console.log('  in here :', `${standing} standing`);
if (standing < 2) misses.push(`the lair fielded nothing: ${standing}`);
const met = await panel();
console.log('  says    :', `"${met.slice(0, 110)}"`);
// ★★★ THE PRICE BEFORE YOU PAY IT — the whole reason turns beat the clock.
// Each thing must say whether it swings on the turn you are about to take,
// and the panel must say what that costs. Hiding either half turns footwork
// into a coin toss.
if (!/swings next/.test(met)) misses.push(`nothing says it is about to swing: "${met.slice(0, 70)}"`);
if (!/idle next/.test(met)) misses.push('nothing says it is idle — then speed is invisible');
if (!/costs (you )?\d/.test(met)) misses.push(`the screen never says what a turn costs: "${met.slice(0, 80)}"`);

console.log('\n★★★ THE LAMP, AND THE CHAMBERS');
// ⚠️ MEASURED OFF THE CANVAS, NOT ASSERTED FROM THE CODE. The whole looks pass
// is pixels; a check that read the palette constants back would pass with the
// renderer deleted. These read the pixels the phone actually got.
const look = await page.evaluate(() => {
  const cv = document.querySelector('.crypt canvas');
  if (!cv) return null;
  const ctx = cv.getContext('2d');
  const { data, width, height } = ctx.getImageData(0, 0, cv.width, cv.height);
  const luma = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  const mean = (x0, y0, x1, y1) => {
    let sum = 0, n = 0;
    for (let y = Math.max(0, y0 | 0); y < Math.min(height, y1 | 0); y += 2) {
      for (let x = Math.max(0, x0 | 0); x < Math.min(width, x1 | 0); x += 2) {
        sum += luma((y * width + x) * 4); n++;
      }
    }
    return n ? sum / n : -1;
  };
  const host = document.querySelector('.crypt').getBoundingClientRect();
  const s = cv.width / host.width;
  const here = document.querySelector('.node.here').getBoundingClientRect();
  const pad = 24 * s;
  const boxes = [...document.querySelectorAll('.node')]
    .map((n) => { const r = n.getBoundingClientRect(); return Math.round(r.width * r.height); });
  // ⚠️ THE PANEL TOO, NOT JUST THE CANVAS. The canvas draws from `STONE` and
  // the panel from the `--page` palette — a dungeon canvas bolted under a
  // cream hiking-map chrome is exactly the half-done pass this catches.
  const shell = getComputedStyle(document.querySelector('main')).backgroundColor;
  return {
    shell: (shell.match(/[\d.]+/g) ?? [255, 255, 255])
      .slice(0, 3).reduce((n, v, i) => n + [0.2126, 0.7152, 0.0722][i] * Number(v), 0),
    whole: mean(0, 0, width, height),
    lit: mean((here.left - host.left) * s - pad, (here.top - host.top) * s - pad,
              (here.right - host.left) * s + pad, (here.bottom - host.top) * s + pad),
    far: mean(0, 0, width * 0.28, height * 0.22),
    boxes,
  };
});
if (!look) misses.push('there is no dungeon canvas at all');
else {
  console.log('  ground  :', `canvas ${look.whole.toFixed(1)} · chrome ${look.shell.toFixed(1)}`);
  console.log('  lamp    :', `${look.far.toFixed(1)} in the far corner → ${look.lit.toFixed(1)} where you stand`);
  console.log('  chambers:', look.boxes.sort((a, b) => a - b).join(', '), 'px²');
  // ★ IT IS UNDERGROUND. The delve inherited the town's cream hiking-map
  // palette at the pivot and read like a trail app that had wandered down a
  // hole; a bright ground is that regression coming back.
  if (!(look.whole < 60)) misses.push(`the dungeon is not dark: mean luma ${look.whole.toFixed(1)}`);
  if (!(look.shell < 60)) misses.push(`the chrome around it is still parchment: luma ${look.shell.toFixed(1)}`);
  // ★★★ AND YOU ARE CARRYING THE LIGHT. If the room you stand in is not the
  // brightest thing on the map, there is no lamp — just a dark stylesheet.
  if (!(look.lit > look.far * 1.8)) {
    misses.push(`no lamp: where you stand (${look.lit.toFixed(1)}) is not brighter than the dark (${look.far.toFixed(1)})`);
  }
  // ★★★ A ROOM IS A ROOM, NOT A DOT. Identical circles were the hiking map's
  // idea of a place; a crawler reads size off the map before it reads a word.
  const small = Math.min(...look.boxes), big = Math.max(...look.boxes);
  if (!(big > small * 1.8)) {
    misses.push(`every chamber is the same size (${small}–${big} px²) — these are dots with names`);
  }
}

console.log('\n★★★ NOTHING HAPPENS WHILE YOU THINK');
// ⚠️ THE CLAIM THE PIVOT IS ABOUT, MEASURED. Stand in a lair for three real
// seconds and take nothing. This check went RED against the real-time build.
const hp0 = await life();
const t0 = await turn();
await page.waitForTimeout(3000);
const hp1 = await life();
console.log('  3s idle :', `life ${hp0} → ${hp1}, turn ${t0} → ${await turn()}`);
if (hp1 !== hp0) misses.push(`the clock is still running: lost ${hp0 - hp1} life doing nothing`);
if ((await turn()) !== t0) misses.push('turns pass on their own — this is not turn-based');
await page.screenshot({ path: SHOT });

console.log('\nBUT A TURN YOU TAKE COSTS YOU');
await press('Hold');
const hp2 = await life();
console.log('  held    :', `life ${hp1} → ${hp2}, turn ${await turn()}`);
if (!(hp2 < hp1)) misses.push(`holding in a lair cost nothing: ${hp1} → ${hp2}`);

console.log('\nSWINGING');
// ⚠️ THE SUM OF THE LINE, NOT THE FIRST SQUARE. A swing takes the WEAKEST
// thing standing (no aiming tax), so reading `.sq b` first measured the big
// one and reported "the swing did nothing" while the runt was losing three.
const lineHp = async () => (await page.locator('.sq b').allTextContents())
  .reduce((n, t) => n + Number(t || 0), 0);
const before = await lineHp();
await press('Swing');
const after = await lineHp();
console.log('  hurt it :', `${before} → ${after}`);
if (!(after < before)) misses.push(`the swing did nothing: ${before} → ${after}`);
// ★ AND THERE IS NO COOLDOWN ANY MORE — the cost of a swing is the turn.
// ⚠️ `.catch` BECAUSE A DEAD DELVER HAS NO SWING BUTTON. A probe that throws
// here reports a Playwright stack trace instead of the checks it already
// failed, which is exactly how a bad run got read as a good one once before.
if (await page.locator('.deed', { hasText: 'Swing' }).first().isDisabled({ timeout: 2000 })
  .catch(() => { misses.push('no swing button — the delver did not survive to it'); return false; })) {
  misses.push('the swing is still on a cooldown — that was the clock talking');
}

console.log('\n★★★ A DOOR IS NOT AN ESCAPE HATCH');
// ⚠️ THE BUG THIS EXISTS TO CATCH. When a foe was judged only by the room you
// ARRIVED in, walking back and forth was a perfect defence — retreat from any
// losing fight, forever, for free. It reaches you at either end of the step.
const hp3 = await life();
await walk('Broken Hall');
const hp4 = await life();
console.log('  stepped :', `life ${hp3} → ${hp4}`);
if (hp4 >= hp3) misses.push(`walking out of a lair full of fast things was free: ${hp3} → ${hp4}`);

console.log('\nAND IT FOLLOWS YOU THROUGH IT');
for (let i = 0; i < 4 && (await page.locator('.sq').count()) === 0; i++) await press('Hold');
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
console.log('\nall good — turns only move when you do, and the price is on screen first');
