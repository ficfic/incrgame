// PLAYS THE CITY ON THE GRAPH and reports what a player would actually see.
// Slice 2's probe, 2026-08-08: chips stone, stacks a quarry, connects it;
// then drives the design's teeth — a ×4 quarry CHOKING a gauge-1 path, the
// waste named on the label and the choke DRAWN amber, fixed by widening;
// huts growing people; people growing the map.
//
// Exit 0 only when every check passed. `npm run play`.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const EXE = ['/opt/pw-browsers/chromium/chrome-linux/chrome',
             '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => existsSync(p));
const URL = process.env.PLAY_URL ?? 'http://localhost:4173/';
const SHOT = 'play-city.png';
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

/** Pixels of a named ink on the board, palette read OFF THE PAGE. */
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

/** Inject a save BEFORE the app boots — its own flush clobbers live writes. */
const seed = async (game) => {
  await page.addInitScript((g) => {
    localStorage.setItem('camp-save', JSON.stringify({ game: g, savedAt: Date.now() }));
  }, game);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
};

// ------------------------------------------------------------ fresh start --
console.log('THE FRESH GROUND');
await page.evaluate(() => localStorage.removeItem('camp-save'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const h0 = await header();
console.log('  header  :', `"${h0.slice(0, 80)}"`);
if (!/0\s*stone/.test(h0) || !/2\/2 people/.test(h0)) {
  misses.push(`a fresh city does not open at two people and no stone: "${h0.slice(0, 60)}"`);
}
const sites0 = await page.$$eval('.map .node', (n) => n.length);
console.log('  ground  :', `${sites0} sites on the board`);
if (sites0 !== 7) misses.push(`${sites0} sites on the first frame — wanted 7, held ground included`);
const held0 = await page.$$eval('.map .node[data-kind="foe"]', (n) => n.length);
console.log('  held    :', `${held0} goblin-held grounds, drawn red`);
if (held0 !== 3) misses.push(`${held0} held grounds drawn — wanted 3`);
// ★ THE VALLEY IS PAINTED — trees at the pines, the river through the
// bend. Counted off the live palette, like every ink check.
const trees = await inked('wood');
const river = await inked('river');
console.log('  painted :', `${trees}px of trees, ${river}px of river`);
if (trees < 150) misses.push(`only ${trees}px of trees — the map background did not come back`);
if (river < 150) misses.push(`only ${river}px of river — the bend has no water`);

// -------------------------------------------------- the first stack, dead --
console.log('\nTHE FIRST QUARRY');
for (let t = 0; t < 14; t++) await page.locator('.spring').click();
await page.waitForTimeout(250);
await page.locator('.map .node[data-id="site:1"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
// ★ The path comes FIRST now — building on unreached ground is refused,
// and the refusal is on the deed.
const unreached = await panel();
console.log('  refuses :', `"${unreached.slice(0, 70)}"`);
if (!/no path reaches here/.test(unreached)) {
  misses.push(`unreached ground does not refuse the works: "${unreached.slice(0, 60)}"`);
}
await page.locator('.deed', { hasText: 'Path · The Camp' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed lays the path home'));
for (let t = 0; t < 22; t++) await page.locator('.spring').click();
await page.locator('.deed', { hasText: 'Quarry ×1' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed stacks the first quarry'));
await page.waitForTimeout(600);
const flowing = await header();
console.log('  header  :', `"${flowing.slice(0, 80)}"`);
if (!/\+0\.3\/s/.test(flowing)) {
  misses.push(`pathed quarry, no rate in the header: "${flowing.slice(0, 70)}"`);
}
// The label carries the count — RULE 1 on screen.
const label1 = await page.locator('.map .node[data-id="site:1"]').textContent();
console.log('  label   :', `"${label1.trim()}"`);
if (!/Quarry ×1/.test(label1)) {
  misses.push(`the label does not carry the count: "${label1.trim()}"`);
}
// ★ THE CARRIERS ARE DRAWN AND THEY WALK: carrier ink on the path, and a
// second look 700ms later finds its centre of mass MOVED. A buried crawl
// once stayed green for weeks because nothing checked for motion.
const snap = async () => page.evaluate(() => {
  const INK = window.__INK ?? {}; const TOL = window.__TOL ?? {};
  const hex = INK.flowing; const tol = TOL.flowing ?? 26;
  const cv = document.querySelector('.map canvas');
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16),
    bl = parseInt(hex.slice(5, 7), 16);
  const d = cv.getContext('2d', { willReadFrequently: true })
    .getImageData(0, 0, cv.width, cv.height).data;
  let sx = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 40 && Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol
      && Math.abs(d[i + 2] - bl) <= tol) { sx += (i / 4) % cv.width; n++; }
  }
  return { n, cx: n ? sx / n : -1 };
});
const c0 = await snap();
await page.waitForTimeout(700);
const c1 = await snap();
console.log('  carriers:', `${c0.n}px, centre ${c0.cx.toFixed(1)} → ${c1.cx.toFixed(1)}`);
if (c0.n < 12) misses.push(`only ${c0.n}px of carrier ink — nobody hauls the stone`);
if (c0.cx < 0 || Math.abs(c1.cx - c0.cx) < 0.4) {
  misses.push(`the carriers do not walk: centre ${c0.cx} → ${c1.cx}`);
}

// ------------------------------------------------------- THE CHOKE, drawn --
console.log('\nTHE CHOKE');
await seed({ version: 4, stacks: { 1: 4 }, paths: { '0|1': 1 },
  stone: 30, logs: 0, planks: 0, pop: 6, popPart: 0 });
// The board thins labels when the map is crowded, so the SPLIT is read
// where it always stands: the site's own panel title.
await page.locator('.map .node[data-id="site:1"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
const chokedLabel = await page.locator('.panel h2').textContent();
console.log('  title   :', `"${chokedLabel.trim()}"`);
if (!/makes 1\.2/.test(chokedLabel) || !/carries 1\.0/.test(chokedLabel)) {
  misses.push(`a choked quarry does not tell the split: "${chokedLabel.trim()}"`);
}
const amber = await inked('shut');
console.log('  drawn   :', `${amber}px of choke on the path`);
if (amber < 60) misses.push(`only ${amber}px of choke ink — the waste is invisible`);
const chokedPanel = await panel();
console.log('  panel   :', `"${chokedPanel.slice(0, 80)}"`);
if (!/wasted/.test(chokedPanel)) {
  misses.push(`the panel does not name the waste: "${chokedPanel.slice(0, 60)}"`);
}
await page.screenshot({ path: SHOT.replace(/\.png$/, '-choked.png') });

// --------------------------------------------------------- WIDEN, the fix --
console.log('\nTHE WIDENING');
await page.locator('.deed', { hasText: 'Widen · The Camp' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed widens the choked path'));
await page.waitForTimeout(500);
const fixedLabel = await page.locator('.panel h2').textContent();
const amberAfter = await inked('shut');
console.log('  title   :', `"${fixedLabel.trim()}", choke ink ${amber} → ${amberAfter}px`);
if (!/1\.2\/s/.test(fixedLabel)) {
  misses.push(`widened and the quarry still splits its label: "${fixedLabel.trim()}"`);
}
if (!(amberAfter < amber / 2)) {
  misses.push(`the choke ink did not clear on widening: ${amber} → ${amberAfter}px`);
}

// ----------------------------------------------------- PEOPLE, the ladder --
console.log('\nTHE PEOPLE');
await seed({ version: 4, stacks: { 1: 1, 2: 1, 3: 1 }, paths: { '0|1': 1, '0|2': 1, '0|3': 1 },
  stone: 10, logs: 6, planks: 20, pop: 2, popPart: 0 });
const before = await header();
console.log('  header  :', `"${before.slice(0, 90)}"`);
if (!/2\/2 people/.test(before)) misses.push(`seeded city not at 2/2 people: "${before.slice(0, 60)}"`);
// Three jobs, two people: the camp's own panel must say it is understaffed.
// The camp is PRE-SELECTED on boot (a design point) — tapping it again
// would toggle it off, so the probe just reads what is already open.
const staffed = await panel();
console.log('  camp    :', `"${staffed.slice(0, 80)}"`);
if (!/% staffed/.test(staffed)) {
  misses.push(`three jobs on two people and the camp does not say staffed-%: "${staffed.slice(0, 70)}"`);
}
await page.locator('.deed', { hasText: 'Hut ×1' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed raises the first hut'));
await page.waitForTimeout(400);
if (!/\/4 people/.test(await header())) {
  misses.push(`a hut went up and the cap did not: "${(await header()).slice(0, 60)}"`);
}
console.log('  grows   : waiting one growth beat…');
await page.waitForTimeout(13000);
const grown = await header();
console.log('  header  :', `"${grown.slice(0, 90)}"`);
if (!/3\/4 people/.test(grown)) {
  misses.push(`nobody arrived after a growth beat: "${grown.slice(0, 60)}"`);
}

// ------------------------------------------- the hero, beaten then armed --
console.log('\nTHE HERO');
await seed({ version: 4, stacks: { 1: 1 }, paths: { '0|1': 1 },
  stone: 30, logs: 0, planks: 20, pop: 4, popPart: 0 });
// Bare hands at Old Growth: five strikes, beaten home, the ground bled.
await page.locator('.map .node[data-id="site:4"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
const sendNote = await panel();
console.log('  offers  :', `"${sendNote.slice(0, 70)}"`);
if (!/strikes 2 · they bite 2/.test(sendNote)) {
  misses.push(`the held ground does not quote the fight: "${sendNote.slice(0, 60)}"`);
}
await page.locator('.deed', { hasText: 'Send the hero' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed sends the hero'));
await page.waitForTimeout(250);
await page.screenshot({ path: SHOT.replace(/\.png$/, '-fight.png') });
for (let i = 0; i < 5; i++) {
  await page.locator('.deed.face', { hasText: 'Strike' }).click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(120);
}
const beaten = await header();
console.log('  beaten  :', `"${beaten.slice(30, 110)}"`);
if (!/hero 0\/10/.test(beaten)) {
  misses.push(`five bare-handed strikes should beat the hero home: "${beaten.slice(0, 80)}"`);
}
// site:4 is STILL picked from the assail — no second tap, that toggles.
const bled = await panel();
console.log('  bled    :', `"${bled.slice(0, 60)}"`);
if (!/goblins, 2 strong/.test(bled)) {
  misses.push(`the ground did not keep its wounds: "${bled.slice(0, 60)}"`);
}
const namedStill = await page.locator('.map .node[data-id="site:4"]').textContent();
if (!/High Meadow/.test(namedStill)) {
  misses.push(`held ground lost its NAME to the goblins: "${namedStill.trim()}"`);
}
// Armed and healed, the same fight turns: liberate, then BUILD there.
await seed({ version: 4, stacks: { 1: 1 }, paths: { '0|1': 1 },
  stone: 30, logs: 0, planks: 20, pop: 4, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 30 }, hero: { hp: 10, arms: 1, part: 0 }, fight: null });
await page.locator('.map .node[data-id="site:4"]').click({ timeout: 2000 }).catch(() => {});
await page.locator('.deed', { hasText: 'Send the hero' }).click({ timeout: 2000 }).catch(() => {});
for (let i = 0; i < 4; i++) {
  await page.locator('.deed.face', { hasText: 'Strike' }).click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(120);
}
await page.waitForTimeout(300);
const heldNow = await page.$$eval('.map .node[data-kind="foe"]', (n) => n.length);
console.log('  freed   :', `${heldNow} holdings left after the rematch`);
if (heldNow !== 2) misses.push(`${heldNow} held grounds after liberation — wanted 2`);
// ★ CAPTIVES: two walked home with the hero — the header says so.
const rescued = await header();
console.log('  rescued :', `"${rescued.slice(30, 100)}"`);
if (!/6\/\d+ people/.test(rescued)) {
  misses.push(`no captives came home from the liberation: "${rescued.slice(0, 80)}"`);
}
// The freed ground takes works and paths like any other. It is STILL the
// picked site from the fight — no second tap, that would toggle it off.
await page.locator('.deed', { hasText: 'Path · The Camp' }).click({ timeout: 2000 })
  .catch(() => misses.push('liberated ground refuses the path'));
await page.locator('.deed', { hasText: 'Farm ×1' }).click({ timeout: 2000 })
  .catch(() => misses.push('liberated ground refuses the works'));
await page.waitForTimeout(600);
const freedTitle = await page.locator('.panel h2').textContent();
console.log('  works   :', `"${freedTitle.trim()}"`);
if (!/Farm ×1/.test(freedTitle)) {
  misses.push(`the freed ground does not carry its new works: "${freedTitle.trim()}"`);
}

// -------------------------------------------------------- the town's table --
console.log('\nTHE TABLE');
// Nine mouths, one farm, empty larder: STARVING says so, and only the
// farm keeps its hands. Bread on hand ends it.
await seed({ version: 4, stacks: { 0: 4, 1: 2, 4: 1 },
  paths: { '0|1': 1, '0|4': 1 }, goblins: { 5: 18, 6: 30 },
  stone: 10, logs: 0, planks: 0, food: 0, pop: 9, popPart: 0,
  hero: { hp: 10, arms: 1, part: 0 }, fight: null });
const starving = await header();
console.log('  header  :', `"${starving.slice(0, 100)}"`);
if (!/STARVING/.test(starving)) {
  misses.push(`nine mouths, no bread, and the header is calm: "${starving.slice(0, 80)}"`);
}
if (/stone.*\+0\.\d\/s/.test(starving.split('logs')[0])) {
  misses.push(`the quarry still counts while the town starves: "${starving.slice(0, 60)}"`);
}
await seed({ version: 4, stacks: { 0: 4, 1: 2, 4: 2 },
  paths: { '0|1': 1, '0|4': 1 }, goblins: { 5: 18, 6: 30 },
  stone: 10, logs: 0, planks: 0, food: 8, pop: 9, popPart: 0,
  hero: { hp: 10, arms: 1, part: 0 }, fight: null });
const fed = await header();
console.log('  fed     :', `"${fed.slice(0, 100)}"`);
if (!/food/.test(fed) || /STARVING/.test(fed)) {
  misses.push(`a stocked larder still reads hungry: "${fed.slice(0, 80)}"`);
}
if (!/−0\.3\/s/.test(fed)) {
  misses.push(`nine mouths and the hunger is not priced on the header: "${fed.slice(0, 80)}"`);
}
await page.screenshot({ path: SHOT });

await b.close();
if (misses.length) {
  console.log('\n⚠️ PROBLEMS');
  for (const m of misses) console.log('  ', m);
  process.exit(1);
}
console.log('\nall good — counts stack, chokes draw, the hero takes ground, and the town eats');
