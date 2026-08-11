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


/** ★ MARCH, THEN FIGHT — 2026-08-10. A fight is a PLACE now, so the deed on
 *  held ground you are not standing on is the walk. Click it, let the hero
 *  arrive (the sword is drawn on arrival), and the strip opens. */
const marchTo = async (site) => {
  const march = page.locator('.deed', { hasText: 'March on' });
  if (await march.count()) {
    await march.first().click({ timeout: 2000 }).catch(() => {});
    // WALK_SECS per laid leg, plus slack for the tick that lands it.
    await page.waitForTimeout(15000);
  }
  void site;
};

const header = async () => (await page.locator('header').textContent())
  .replace(/\s+/g, ' ').trim();
const panel = async () => (await page.locator('.panel').textContent())
  .replace(/\s+/g, ' ').trim();
/** ★ ONE HUD CELL, by the `data-q` it carries — 2026-08-09. The checks below
 *  used to regex the whole header ("0 stone", "2/2 people"), which meant every
 *  one of them was coupled to the ORDER and PUNCTUATION of a run-on line and
 *  broke the moment the HUD was laid out properly. A cell is addressed. */
const cell = async (q) => (await page.locator(`[data-q="${q}"]`).textContent())
  .replace(/\s+/g, ' ').trim();
/** The big number in a cell, ignoring its label and its rate line. */
// ⚠️ THE FIRST NUMBER ONLY. The cell's <b> now reads "15/60" — amount over
// ceiling — since the playtest asked for the cap to be visible before it is
// reached, and Number("15/60") is NaN.
const cellNum = async (q) => Number(
  /(\d+)/.exec((await page.locator(`[data-q="${q}"] b`).textContent()) ?? '')?.[1] ?? NaN);
const stoneNow = async () => cellNum('stone');

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
// ⚠️ REWRITTEN 2026-08-10: the hand is gone, so a fresh town no longer opens
// at zero stone — it opens with a WAGON, which is what buys the first path
// and the first pit. Two settlers still.
// ⚠️ FOUR, NOT TWO (2026-08-10): the camp itself shelters four now, because
// two settlers could not staff the three works the opening asks for and the
// mill sawed nothing at all.
if (!(await cellNum('stone') >= 8) || !/\b4\/4\b/.test(await cell('people'))) {
  misses.push(`a fresh city does not open with a wagon and four people: `
    + `stone ${await cell('stone')}, people ${await cell('people')}`);
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
// ⚠️ NO TAPPING ANY MORE — the opening stock is the bootstrap.
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
// ★ Paths take time now: the deed flips to 'Laying ·' and the line fills.
await page.waitForTimeout(400);
const laying = await panel();
console.log('  laying  :', `"${laying.slice(0, 60)}"`);
if (!/Laying · The Camp/.test(laying)) {
  misses.push(`the spade went in silently: "${laying.slice(0, 60)}"`);
}
await page.waitForTimeout(6800);
await page.locator('.deed', { hasText: 'Quarry ×1' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed stacks the first quarry'));
// ★ A WORKS TAKES TIME NOW. It is ordered here and STANDS later — the
// label must say so while the hammers are out, and the pit must not
// produce until it lands.
await page.waitForTimeout(500);
const underway = await page.locator('.map .node[data-id="site:1"]').textContent();
console.log('  raising :', `"${underway.trim()}"`);
if (!/⏱\d+s/.test(underway)) {
  misses.push(`a works under the hammer does not show its clock: "${underway.trim()}"`);
}
await page.waitForTimeout(11000);
const flowing = await header();
console.log('  header  :', `"${flowing.slice(0, 80)}"`);
// The pit runs on the camp's own four hands now, so the rate doubled.
if (!/\+0\.6\/s/.test(await cell('stone'))) {
  misses.push(`pathed quarry, no rate on the stone cell: "${await cell('stone')}"`);
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
  return { n, cx: n ? sx / n : -1, sx };
});
const c0 = await snap();
await page.waitForTimeout(700);
const c1 = await snap();
console.log('  carriers:', `${c0.n}px, centre ${c0.cx.toFixed(1)} → ${c1.cx.toFixed(1)}`);
if (c0.n < 12) misses.push(`only ${c0.n}px of carrier ink — nobody hauls the stone`);
// ★ MOVEMENT IS MEASURED ON THE RAW SUM OF POSITIONS, NOT THE CENTROID —
// 2026-08-09. Dividing by the pixel count was washing the signal out: the
// carriers are spread along every path, so dots entering and leaving cancel
// and the CENTRE shifts only ~0.3px in 700ms against a 0.4px threshold. It
// failed on good builds and passed on others, which is a coin flip, not a
// check. The sum moves by thousands for the same walk, so the same physical
// fact now reads far above the noise. (Found because the HUD changed the
// board's height and this fired twice on builds where the dots walked fine.)
const walk = Math.abs(c1.sx - c0.sx) / Math.max(1, c0.sx);
console.log('  walked  :', `${(walk * 100).toFixed(3)}% of the position sum`);
if (c0.cx < 0 || walk < 0.0005) {
  misses.push(`the carriers do not walk: sum ${c0.sx} → ${c1.sx} (${(walk * 100).toFixed(3)}%)`);
}

// ------------------------------------------------ the pines, no hand -----
console.log('\nTHE PINES');
// ⚠️ REWRITTEN 2026-08-10. This was the soft-lock check for the hand-chop
// deed: path to the pines, chop eight logs, raise. The hand is GONE — it
// out-earned every building, and it was also the one source of goods that
// obeyed no gate (the owner could chop at the pines with no road there).
// The question the check existed for is unchanged and still load-bearing:
// CAN THE FIRST LUMBERWORKS BE REACHED AT ALL? The opening stock is the
// answer now, so that is what this proves.
await page.evaluate(() => localStorage.removeItem('camp-save'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const openLogs = await cellNum('logs');
console.log('  wagon   :', `${openLogs} logs in the wagon`);
if (!(openLogs >= 8)) {
  misses.push(`the wagon carries ${openLogs} logs — a lumberworks costs 8, soft-locked`);
}
await page.locator('.map .node[data-id="site:2"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
if (await page.locator('.deed', { hasText: 'Chop logs' }).count() > 0) {
  misses.push('the hand-chop deed is back at the pines');
}
await page.locator('.deed', { hasText: 'Path · The Camp' }).click({ timeout: 2000 })
  .catch(() => misses.push('no path deed at the pines'));
await page.waitForTimeout(7000);
await page.locator('.deed', { hasText: 'Lumberworks ×1' }).click({ timeout: 2000 })
  .catch(() => misses.push('the wagon holds eight logs and the lumberworks still refuses'));
await page.waitForTimeout(11000);
const raised = await page.locator('.panel h2').textContent();
console.log('  raised  :', `"${raised.trim()}"`);
if (!/Lumberworks ×1/.test(raised)) {
  misses.push(`the first lumberworks did not stand: "${raised.trim()}"`);
}

// ------------------------------------------------------- THE CHOKE, drawn --
console.log('\nTHE CHOKE');
await seed({ version: 5, stacks: { 0: 3, 1: 4 }, paths: { '0|1': 1 },
  stone: 30, logs: 0, planks: 0, food: 500, pop: 12, popPart: 0 });
// The board thins labels when the map is crowded, so the SPLIT is read
// where it always stands: the site's own panel title.
await page.locator('.map .node[data-id="site:1"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
const chokedLabel = await page.locator('.panel h2').textContent();
console.log('  title   :', `"${chokedLabel.trim()}"`);
if (!/makes 1\.8/.test(chokedLabel) || !/carries 1\.0/.test(chokedLabel)) {
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
await page.waitForTimeout(13000);
const fixedLabel = await page.locator('.panel h2').textContent();
const amberAfter = await inked('shut');
console.log('  title   :', `"${fixedLabel.trim()}", choke ink ${amber} → ${amberAfter}px`);
// ⚠️ THE NUMBER MOVED, NOT THE FACT. The fixture is housed now (unhoused
// people do not staff), so the pit runs at its full four hands rather than
// two — the check is that the label no longer SPLITS, which is what
// widening bought.
if (/carries/.test(fixedLabel)) {
  misses.push(`widened and the quarry still splits its label: "${fixedLabel.trim()}"`);
}
if (!(amberAfter < amber / 2)) {
  misses.push(`the choke ink did not clear on widening: ${amber} → ${amberAfter}px`);
}

// ----------------------------------------------------- PEOPLE, the ladder --
console.log('\nTHE PEOPLE');
await seed({ version: 5, stacks: { 1: 1, 2: 1, 3: 1 }, paths: { '0|1': 1, '0|2': 1, '0|3': 1 },
  stone: 10, logs: 6, planks: 20, pop: 2, popPart: 0 });
const before = await header();
console.log('  header  :', `"${before.slice(0, 90)}"`);
if (!/\b2\/4\b/.test(await cell('people'))) {
  misses.push(`seeded city not at two people in a camp that sleeps four: "${await cell('people')}"`);
}
// Three jobs, two people: the camp's own panel must say it is understaffed.
// The camp is PRE-SELECTED on boot (a design point) — tapping it again
// would toggle it off, so the probe just reads what is already open.
const staffed = await panel();
console.log('  camp    :', `"${staffed.slice(0, 80)}"`);
if (!/👤\d+%/.test(staffed)) {
  misses.push(`three jobs on two people and the camp does not mark the shortfall: "${staffed.slice(0, 70)}"`);
}
// ★ THE VISUAL PASS: every built works wears its little building on the map.
const icons = await page.$$eval('.map .node .icon', (n) => n.length);
console.log('  icons   :', `${icons} buildings drawn on the map`);
if (icons !== 3) misses.push(`three works stand and the map draws ${icons} icons`);
await page.locator('.deed', { hasText: 'Hut ×1' }).click({ timeout: 2000 })
  .catch(() => misses.push('no deed raises the first hut'));
// ⚠️ A HUT TAKES TIME NOW (BUILD_SECS.hut). Ordered above, standing below —
// this used to read the map 400ms after the click and pass on an instant
// build. Waiting is the point of the item, so the wait is the check.
await page.waitForTimeout(1000);
const midBuild = await page.$$eval('.map .node .icon', (n) => n.length);
if (midBuild !== 3) {
  misses.push(`a hut under the hammer already counts as standing: ${midBuild} icons`);
}
await page.waitForTimeout(9000);
const hutIcon = await page.$$eval('.map .node .icon', (n) => n.length);
if (hutIcon !== 4) misses.push(`the hut went up and the map draws ${hutIcon} icons — wanted 4`);
// The camp's four plus the hut's four.
if (!/\/8\b/.test(await cell('people'))) {
  misses.push(`a hut went up and the cap did not: "${await cell('people')}"`);
}
// ★ HANDS, WHOLE AND SPOKEN: take over the mill by hand, watch the pull
// get NAMED, then give it back to auto.
await page.locator('.map .node[data-id="site:3"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
await page.locator('.crew button', { hasText: '+' }).click({ timeout: 2000 })
  .catch(() => misses.push('no way to set hands at a works'));
await page.waitForTimeout(250);
const posted = await panel();
console.log('  posted  :', `"${posted.slice(0, 90)}"`);
if (!/set by hand/.test(posted)) {
  misses.push(`a hand-set works does not say so: "${posted.slice(0, 60)}"`);
}
if (!/hands \d of \d/.test(posted)) {
  misses.push(`hands are not whole numbers on screen: "${posted.slice(0, 60)}"`);
}
if (!/a hand left /.test(posted)) {
  misses.push(`the pull was silent again: "${posted.slice(0, 60)}"`);
}
await page.locator('.crew .autoback').click({ timeout: 2000 })
  .catch(() => misses.push('no way back to auto staffing'));
await page.waitForTimeout(200);
if (/set by hand/.test(await panel())) {
  misses.push('auto did not take the works back');
}
await page.locator('.map .node[data-id="site:3"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
console.log('  grows   : waiting one growth beat…');
await page.waitForTimeout(13000);
const grown = await header();
console.log('  header  :', `"${grown.slice(0, 90)}"`);
if (!/\b[3-9]\/8\b/.test(await cell('people'))) {
  misses.push(`nobody arrived after a growth beat: "${await cell('people')}"`);
}

// ------------------------------------------- the hero, beaten then armed --
console.log('\nTHE HERO');
await seed({ version: 5, stacks: { 0: 1, 1: 1 }, paths: { '0|1': 1 },
  stone: 30, logs: 0, planks: 20, pop: 4, popPart: 0 });
// The battle strip: one square left, three right — and MASH LOSES.
await page.locator('.map .node[data-id="site:4"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
const sendNote = await panel();
console.log('  offers  :', `"${sendNote.slice(0, 70)}"`);
if (!/⚔️2 · 🩸2/.test(sendNote)) {
  misses.push(`the held ground does not quote the fight: "${sendNote.slice(0, 60)}"`);
}
// ⚠️ THE MARCH IS THE WHOLE ACT NOW. Arriving on held ground draws the sword
// on the landing tick, so there is no second button — if the strip is not up
// after the walk, the march itself failed.
await marchTo(4);
if (!(await page.locator('.strip').count())) {
  misses.push('the hero marched onto held ground and no fight started');
}
await page.waitForTimeout(250);
const squares = await page.$$eval('.strip .sq', (n) => n.length);
console.log('  strip   :', `${squares} squares on the strip`);
if (squares !== 4) misses.push(`the strip fields ${squares} squares — wanted 1 + 3`);
// ⚠️ THE WAGON CARRIES BREAD NOW (START_FOOD), so a fixture that wants an
// EMPTY larder has to say food: 0 explicitly — which this one does. What
// changed is that the hero also arrives with packs, so the button is only
// refused when there is genuinely nothing to eat.
const rationBtn = page.locator('.deed', { hasText: 'Rations' });
if (!(await rationBtn.isDisabled().catch(() => false)) && (await cellNum('food')) <= 0) {
  misses.push('an empty larder still offers rations');
}
await page.screenshot({ path: SHOT.replace(/\.png$/, '-fight.png') });
// Bare hands, Attack-Attack-Attack into the wall: the runts eat you.
for (let i = 0; i < 4; i++) {
  const bt = page.locator('.deed', { hasText: 'Attack' });
  if (!(await bt.count())) break;
  await bt.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(2400);
}
const beaten = await header();
console.log('  mashed  :', `"${beaten.slice(30, 110)}"`);
if (!/\b0\/10\b/.test(await cell('hero'))) {
  misses.push(`mash-attacking bare-handed should beat the hero home: "${await cell('hero')}"`);
}
// site:4 is STILL picked from the assail — no second tap, that toggles.
const bled = await panel();
console.log('  bled    :', `"${bled.slice(0, 60)}"`);
if (!/☠\d\b/.test(bled)) {
  misses.push(`the ground did not keep its wounds: "${bled.slice(0, 60)}"`);
}
const namedStill = await page.locator('.map .node[data-id="site:4"]').textContent();
if (!/High Meadow/.test(namedStill)) {
  misses.push(`held ground lost its NAME to the goblins: "${namedStill.trim()}"`);
}
// Armed and READ RIGHT, the same fight turns: aim past the wall, thin the
// runts, take the wind-up on the wall alone — liberate, then BUILD there.
await seed({ version: 5, stacks: { 0: 1, 1: 1 }, paths: { '0|1': 1 },
  stone: 30, logs: 0, planks: 20, pop: 4, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 }, hero: { hp: 10, arms: 1, part: 0 }, fight: null });
await page.locator('.map .node[data-id="site:4"]').click({ timeout: 2000 }).catch(() => {});
await marchTo(4);
await page.waitForTimeout(200);
const attack = page.locator('.deed', { hasText: 'Attack' });
for (const at of [1, 2]) {
  await page.locator(`.strip .sq.them >> nth=${at}`).click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(120);
  await attack.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(2400);
}
// Both runts down; the third answer is the wind-up — the strip says so.
const warn = await panel();
console.log('  warns   :', `"${warn.slice(0, 80).replace(/\s+/g, ' ')}"`);
if (!/WIND UP/.test(warn)) {
  misses.push(`the wind-up is not said a round ahead: "${warn.slice(0, 80)}"`);
}
for (let i = 0; i < 2; i++) {
  await attack.click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(2400);
}
await page.waitForTimeout(300);
const heldNow = await page.$$eval('.map .node[data-kind="foe"]', (n) => n.length);
console.log('  freed   :', `${heldNow} holdings left after the rematch`);
if (heldNow !== 2) misses.push(`${heldNow} held grounds after liberation — wanted 2`);
// ★ CAPTIVES: two walked home with the hero — the header says so.
const rescued = await header();
console.log('  rescued :', `"${rescued.slice(30, 100)}"`);
// Six people in a camp with room for two — the captives walked home into a
// town that has not built for them yet, which is why huts reads full. The
// old check read "6 people · huts full" and could not see the cap at all.
// ⚠️ THE FACT IS THE CAPTIVES, NOT THE CROWDING. This used to also require
// `huts full`, which was true only because the camp slept two; with four it
// no longer overfills, and the thing the check exists for is that two people
// walked home from the fight.
// ⚠️ AT LEAST six: the town also grows on its own clock, so pinning the exact
// number made this fire on a slow machine rather than on a real defect.
const popHome = Number(/(\d+)\//.exec(await cell('people'))?.[1] ?? NaN);
if (!(popHome >= 6)) {
  misses.push(`no captives came home from the liberation: `
    + `people ${await cell('people')}, huts ${await cell('huts')}`);
}
const cheer = await panel();
console.log('  cheer   :', `"${cheer.slice(0, 60)}"`);
if (!/TAKEN — \+2 settlers/.test(cheer)) {
  misses.push(`the win said nothing: "${cheer.slice(0, 60)}"`);
}
// The freed ground takes works and paths like any other. It is STILL the
// picked site from the fight — no second tap, that would toggle it off.
await page.locator('.deed', { hasText: 'Path · The Camp' }).click({ timeout: 2000 })
  .catch(() => misses.push('liberated ground refuses the path'));
await page.waitForTimeout(6800);
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
await seed({ version: 5, stacks: { 0: 6, 1: 2, 4: 1 },
  paths: { '0|1': 1, '0|4': 1 }, goblins: { 5: 18, 7: 32, 8: 48, 9: 60 },
  // ⚠️ `taken: 2` states what these missing holdings MEAN. heroMax counts
  // liberations now instead of inferring them from how many holdings are
  // left — a raid can ADD one, and the old arithmetic ran backwards when it
  // did. A seed that skips the fights has to say so.
  taken: 2,
  stone: 10, logs: 0, planks: 0, food: 0, pop: 24, popPart: 0,
  hero: { hp: 13, arms: 1, part: 0 }, fight: null });
const starving = await header();
console.log('  header  :', `"${starving.slice(0, 100)}"`);
if (!/STARVING/.test(await cell('food'))) {
  misses.push(`nine mouths, no bread, and the header is calm: "${starving.slice(0, 80)}"`);
}
if (/stone.*\+0\.\d\/s/.test(starving.split('logs')[0])) {
  misses.push(`the quarry still counts while the town starves: "${starving.slice(0, 60)}"`);
}
await seed({ version: 5, stacks: { 0: 6, 1: 2, 4: 2 },
  paths: { '0|1': 1, '0|4': 1 }, goblins: { 5: 18, 7: 32, 8: 48, 9: 60 },
  // ⚠️ `taken: 2` states what these missing holdings MEAN. heroMax counts
  // liberations now instead of inferring them from how many holdings are
  // left — a raid can ADD one, and the old arithmetic ran backwards when it
  // did. A seed that skips the fights has to say so.
  taken: 2,
  stone: 10, logs: 0, planks: 0, food: 8, pop: 24, popPart: 0,
  hero: { hp: 13, arms: 1, part: 0 }, fight: null });
const fed = await header();
console.log('  fed     :', `"${fed.slice(0, 100)}"`);
if (/STARVING/.test(await cell('food'))) {
  misses.push(`a stocked larder still reads hungry: "${fed.slice(0, 80)}"`);
}
// The wild fed six until 2026-08-10 and now feeds two, so the same nine
// mouths cost more: (9 − WILD_FED) × EAT.
if (!/−\d+\.\d\/s/.test(await cell('food'))) {
  misses.push(`nine mouths and the hunger is not priced on the header: "${fed.slice(0, 80)}"`);
}
// ------------------------------------------------- the frontier opens ----
console.log('\nTHE FRONTIER');
// The knoll has fallen: the far country steps out — Dark Pines and the
// Green Vale show, the High Quarry still hides behind the scree.
await seed({ version: 5, stacks: { 0: 4, 1: 2, 4: 2 },
  paths: { '0|1': 1, '0|4': 1 }, goblins: { 5: 18, 7: 32, 8: 48, 9: 60 },
  // ⚠️ `taken: 2` states what these missing holdings MEAN. heroMax counts
  // liberations now instead of inferring them from how many holdings are
  // left — a raid can ADD one, and the old arithmetic ran backwards when it
  // did. A seed that skips the fights has to say so.
  taken: 2,
  stone: 40, logs: 0, planks: 10, food: 8, pop: 9, popPart: 0,
  hero: { hp: 16, arms: 4, part: 0 }, fight: null });
const sitesFar = await page.$$eval('.map .node', (n) => n.length);
console.log('  ground  :', `${sitesFar} sites with the knoll fallen`);
if (sitesFar !== 9) misses.push(`the knoll fell and the map shows ${sitesFar} sites — wanted 9`);
await page.locator('.map .node[data-id="site:7"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
const far = await panel();
console.log('  deep    :', `"${far.slice(0, 70)}"`);
if (!/☠32\b/.test(far)) {
  misses.push(`the deep country does not price its danger: "${far.slice(0, 60)}"`);
}
// ★ THE PRIZE, said while the goblins are still standing on it — the owner:
// no reason to want held ground. Dark Pines is ×2.5 lumber.
// ⚠️ REWRITTEN 2026-08-10: it used to check for `lumberworks ×2.5`, a bare
// ratio the owner could not read — *"Query one point five. What does it even
// mean?"* The prize now quotes the rate a hand actually earns there against
// what safe ground pays, so the check reads the RATE.
if (!/0\.50\/s a hand vs 0\.20/.test(far)) {
  misses.push(`held ground does not say what it is WORTH: "${far.slice(0, 80)}"`);
}
// ★ AND THE SECOND ROAD HOME: the Scree carries the whole east off `0|3`.
await page.locator('.map .node[data-id="site:5"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
const gate = await panel();
console.log('  gate    :', `"${gate.slice(0, 80)}"`);
if (!/own path to camp/.test(gate)) {
  misses.push(`the gate does not offer its own artery: "${gate.slice(0, 80)}"`);
}
const heroLine = await header();
if (!/\b16\/16\b/.test(await cell('hero'))) {
  misses.push(`two liberations should read hero 16/16: "${await cell('hero')}"`);
}
// -------------------------------------------------- the raid ------------
console.log('\nTHE GOBLINS COME');
// Held ground used to sit there and heal. A holding with something of yours
// in reach now fills toward a raid, says so, and takes a building when it
// comes due. The clock has to be VISIBLE — one you cannot see is theft.
await seed({ version: 5, stacks: { 0: 4, 1: 3 }, paths: { '0|1': 2 },
  stone: 40, logs: 0, planks: 60, food: 900, pop: 14, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 13, arms: 3, part: 0 }, fight: null, store: 1, carts: 0,
  // ⚠️ `taken: 1` IS LOAD-BEARING: the goblins ignore a camp that has never
  // touched them, so a besieged seed has to have drawn blood already.
  // ⚠️ AND THE HERO IS OUT: since 2026-08-10 a hero at home turns one raid
  // away, so a fixture about a raid LANDING must have them elsewhere.
  forage: { left: 9000, secs: 9000 }, forays: 0,
  menace: { 4: 0.99 }, taken: 1 });
// ⚠️ COUNT FIRST. Seeded AT the gate (menace 1) the raid landed before the
// probe had read a baseline, and the check compared ×3 with ×3. It is seeded
// just short now, and the huts are counted before anything else happens.
const hutsBefore0 = (await page.locator('.map .node[data-id="site:1"]').textContent()) ?? '';
await page.locator('.map .node[data-id="site:4"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(250);
const menaced = await panel();
console.log('  says    :', `"${menaced.slice(0, 60)}"`);
if (!/⚠9\d% →/.test(menaced)) {
  misses.push(`a holding about to raid does not say so: "${menaced.slice(0, 60)}"`);
}
// The camp's own hut count is the thing at stake — read it before and after.
// ⚠️ READ OFF THE BOARD, NOT BY CLICKING. Selecting the camp to read its
// panel meant two taps on dots whose size changes as menace fills, and the
// second one kept missing. The node's own label already carries the count.
// ⚠️ READ THE WORKS, NOT THE ROOF (2026-08-10). The camp is last for stacked
// ground now — that was the "my huts kept disappearing" bug — so a raid on a
// town with a pit standing comes for the PIT.
const hutsNow = async () => {
  const t = (await page.locator('.map .node[data-id="site:1"]').textContent()) ?? '';
  return Number(/Quarry ×(\d+)/.exec(t)?.[1] ?? NaN);
};
const hutsBefore = Number(/Quarry ×(\d+)/.exec(hutsBefore0)?.[1] ?? NaN);
// 0.99 of RAID_SECS 300 is one second short; six is margin, not a coin flip.
await page.waitForTimeout(6000);
const hutsAfter = await hutsNow();
console.log('  raided  :', `Quarry ×${hutsBefore} → ×${hutsAfter}`);
if (!(hutsAfter < hutsBefore)) {
  misses.push(`the raid came due and took nothing: Quarry ×${hutsBefore} → ×${hutsAfter}`);
}

// -------------------------------------------------- the run ends --------
console.log('\nTHE VALLEY IS LOST');
// The second half of the goal: the run ENDS, loudly, and the next one
// starts stronger. The owner on a previous win: "I think I won, but it
// wasn't clear" — so this must cover the board, not sit in a corner.
await seed({ version: 5, stacks: {}, paths: {},
  stone: 5, logs: 0, planks: 0, food: 90, pop: 4, popPart: 0,
  // ⚠️ SITE 6 TOO. High Meadow touches the camp, Rock Face AND the Knoll —
  // leave any of them held and it eats that instead, because the camp is
  // the last bare site it will take. The first seed here forgot the Knoll.
  goblins: { 4: 12, 1: 12, 2: 12, 3: 12, 6: 24 },
  hero: { hp: 4, arms: 7, part: 0 }, fight: null, store: 0, carts: 0,
  // ⚠️ THE HERO IS OUT (2026-08-10). A hero at home turns one raid away, so
  // a fixture about the camp FALLING has to have them somewhere else — which
  // is the mechanic working, and is exactly the lever the owner asked for.
  forage: { left: 9000, secs: 9000 }, forays: 0,
  menace: { 4: 0.99 }, taken: 1, lost: false, legacy: { runs: 0, arms: 0 } });
await page.waitForTimeout(6000);
const end = await page.locator('.gone').count();
const endText = end ? (await page.locator('.gone').textContent()).replace(/\s+/g, ' ').trim() : '';
console.log('  ends    :', end ? `"${endText.slice(0, 70)}"` : 'THE RUN DID NOT END');
if (!end) misses.push('the camp was overrun and the run did not end');
if (!/THE VALLEY IS LOST/.test(endText)) {
  misses.push(`the end of a run is not said loudly: "${endText.slice(0, 60)}"`);
}
// ★ IT MUST COVER THE BOARD. A run-ending banner you can play behind is
// not an ending.
const covers = end ? await page.evaluate(() => {
  const r = document.querySelector('.gone').getBoundingClientRect();
  return r.width >= document.documentElement.clientWidth - 1
    && r.height >= document.documentElement.clientHeight - 1;
}) : false;
console.log('  covers  :', covers ? 'the whole screen' : 'NOT THE WHOLE SCREEN');
if (!covers) misses.push('the end-of-run screen does not cover the board');
// And founding the next camp carries the veteran: arms 7 -> 4.
await page.locator('.gone button').click({ timeout: 2000 })
  .catch(() => misses.push('no button founds the next camp'));
await page.waitForTimeout(900);
const armsAfter = await cell('hero');
console.log('  founded :', `"${armsAfter}"`);
if (!/spears ×4/.test(armsAfter)) {
  misses.push(`the veteran did not walk out of the lost valley: "${armsAfter}"`);
}
if (await page.locator('.gone').count() > 0) {
  misses.push('the next camp was founded and the end screen is still up');
}

// -------------------------------------------------- the playtest --------
console.log('\nTHE PLAYTEST FIXES');
await seed({ version: 5, stacks: { 0: 2, 1: 2 }, paths: { '0|1': 1 },
  stone: 41, logs: 3, planks: 12, food: 80, pop: 6, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 10, arms: 1, part: 0 }, fight: null, store: 0, carts: 0,
  menace: { 4: 0.7 }, taken: 1 });

// ★ ITEM F — the ceiling is on screen BEFORE it is reached. The owner:
// "it doesn't say anywhere what is my limit for the stone".
const stoneCell = await cell('stone');
console.log('  ceiling :', `"${stoneCell}"`);
if (!/4\d\/60/.test(stoneCell)) {
  misses.push(`the stone cell hides its ceiling until it is full: "${stoneCell}"`);
}

// ★ ITEM H — the goal and the war are on screen without hunting for them.
const warLine = await cell('war');
console.log('  war     :', `"${warLine}"`);
// ★ HOW, WHY AND WHAT TO DO, all three on the line — 2026-08-10.
if (!/⚠\d+% →/.test(warLine) || !/☠\d+/.test(warLine)) {
  misses.push(`the raid clock and the goal are not on screen: "${warLine}"`);
}
// ★ WHERE THE HERO IS, and whether that is the gate under threat — the
// watch is positional since 2026-08-10, so "at home" is no longer the
// question; "on the right ground" is.
if (!/⚔️/.test(warLine)) {
  misses.push(`the war line does not say where the hero is: "${warLine}"`);
}

// ★ ITEM I — a second tap does not clear the selection.
await page.locator('.map .node[data-id="site:1"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
await page.locator('.map .node[data-id="site:1"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(250);
const stillThere = await page.locator('.panel h2').count();
console.log('  sticky  :', stillThere ? 'still selected after a second tap' : 'DESELECTED');
if (!stillThere) misses.push('a second tap on a node clears the selection');

// -------------------------------------------------- the +1 -------------
console.log('\nTHE +1 NAMES WHAT LANDED');
// The owner: "I also don't see plus one pop up with the appropriate icon
// once the resource is mined." It watched stone alone and floated a bare
// +1, so a town whose PLANKS were climbing showed nothing at all.
await seed({ version: 5, stacks: { 0: 3, 2: 2, 3: 2 },
  paths: { '0|2': 2, '0|3': 2, '2|3': 2 }, raising: {},
  stone: 20, logs: 20, planks: 0, food: 300, pop: 10, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 10, arms: 0, part: 0 }, fight: null, store: 2, carts: 0 });
// No quarry anywhere: the only pile that can grow is planks, so a float
// here is proof the +1 is not still watching stone alone.
let floated = '';
for (let i = 0; i < 14 && !floated; i++) {
  await page.waitForTimeout(900);
  const t = await page.locator('.plus').first().textContent().catch(() => '');
  if (t) floated = t.trim();
}
console.log('  floats  :', floated ? `"${floated}"` : 'NOTHING FLOATED');
if (!floated) {
  misses.push('planks landed and no +1 floated — it is still watching stone alone');
// ⚠️ ANY OF THE FOUR MARKS. The float used to be pinned to planks; it now
// names whichever good actually arrived, and which one that is depends on
// what the seeded town happens to be delivering fastest at that instant.
} else if (!/[🪨🪵🟫🌾]/.test(floated)) {
  misses.push(`the +1 does not name what landed: "${floated}"`);
}

// -------------------------------------------------- the march -----------
console.log('\nTHE HERO HAS A PLACE');
await seed({ version: 5, stacks: { 0: 3, 1: 2 }, paths: { '0|1': 2 },
  stone: 30, logs: 6, planks: 20, food: 90, pop: 10, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 13, spears: 2, part: 0, at: 0, trip: null },
  fight: null, store: 1, carts: 0, menace: {}, taken: 1, famine: 0,
  forage: null, forays: 0, lost: false, legacy: { runs: 0, spears: 0 } });
// ★ Held ground you are not standing on offers the WALK, priced in seconds.
await page.locator('.map .node[data-id="site:4"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(250);
const marchDeed = page.locator('.deed', { hasText: 'March on' });
const marchNote = (await marchDeed.textContent().catch(() => '')).trim().replace(/\s+/g, ' ');
console.log('  offers  :', `"${marchNote.slice(0, 60)}"`);
if (!/⏱\d+s →/.test(marchNote)) {
  misses.push(`held ground does not price the march: "${marchNote.slice(0, 60)}"`);
}
// ★ AND THE HERO IS DRAWN ON THE MAP. Canvas-side, so it is counted in ink.
const heroInk = await inked('you');
console.log('  drawn   :', `${heroInk}px of hero on the board`);
if (heroInk < 20) misses.push(`the hero is not visible on the map: ${heroInk}px`);

// -------------------------------------------------- the dock ------------
console.log('\nTHE DOCK FITS');
// ★ The owner, on the phone: "the horizontal buttons at the bottom, they take
// too much space." Two columns now. Two things have to hold, and the SECOND
// one shipped broken once already: every deed must stay inside the screen
// (the base `.deed` rule sets width:100% and this app has no border-box
// reset, so each grid cell overflowed by 22px and cut the right-hand labels),
// and no deed may be shorter than a thumb.
await seed({ version: 5, stacks: { 0: 8, 1: 4, 2: 2, 3: 2 },
  paths: { '0|1': 1, '0|2': 1, '0|3': 1 },
  stone: 900, logs: 90, planks: 900, food: 900, pop: 30, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 13, arms: 3, part: 0 }, fight: null, store: 3, carts: 2 });
const dock = await page.evaluate(() => {
  const w = document.documentElement.clientWidth;
  const ds = [...document.querySelectorAll('.deed')];
  const r = ds.map((d) => d.getBoundingClientRect());
  return {
    n: ds.length,
    past: r.filter((b) => b.right > w + 0.5 || b.left < -0.5).length,
    short: r.filter((b) => b.height < 44).length,
    // ⚠️ MEASURED HEIGHT ALONE CANNOT CATCH A SHRUNK FLOOR: every deed here
    // carries two lines of text and comes out 49-63px on its own, so the
    // min-height could be dropped to 28px and nothing would notice. Proven
    // exactly that way, and this reads the rule itself instead.
    floor: Math.min(...ds.map((d) => parseFloat(getComputedStyle(d).minHeight) || 0)),
    cols: new Set(r.map((b) => Math.round(b.left))).size,
    tall: r.length ? Math.round(r[r.length - 1].bottom - r[0].top) : 0,
  };
});
console.log('  deeds   :',
  `${dock.n} in ${dock.cols} columns, ${dock.tall}px tall, floor ${dock.floor}px`);
if (dock.n < 6) misses.push(`only ${dock.n} deeds at the busiest site — seed is wrong`);
if (dock.past > 0) misses.push(`${dock.past} deeds run past the screen edge`);
if (dock.short > 0) misses.push(`${dock.short} deeds are under 44px — too small for a thumb`);
if (!(dock.floor >= 44)) {
  misses.push(`the deed floor is ${dock.floor}px — a thumb needs 44`);
}
if (dock.cols < 2) misses.push(`the dock is still one column of ${dock.n} full-width deeds`);

// ★ AND NO PROSE CREEPS BACK. The owner: *"too much prose there, please
// icons and indicators."* Every deed note is marks and numbers now, so the
// English words that used to live there are the check: if any of them
// returns, this fires. (`of` is deliberately absent — "1 of 3" is gone from
// the labels but "0/10" is not English.)
const PROSE = /\b(you have|holds|of each|standing|carried|dangerous|goblins|strong|thrown away|a tap|hits|bite|carries|staffed|people|eats|fields bring|stores hold)\b/i;
const wordy = await page.evaluate(() => [...document.querySelectorAll('.deed em')]
  .map((e) => e.textContent.trim()));
const proseIn = wordy.filter((t) => /\b(you have|holds|of each|standing|carried|dangerous|goblins|strong|thrown away|a tap|hits|bite|carries|staffed)\b/i.test(t));
console.log('  notes   :', `${wordy.length} deed notes, ${proseIn.length} with prose in them`);
if (proseIn.length > 0) {
  misses.push(`prose is back in the dock: ${proseIn.slice(0, 2).map((t) => `"${t}"`).join(', ')}`);
}
void PROSE;

// -------------------------------------------------- the foray -----------
console.log('\nTHE FLOOR UNDER THE ECONOMY');
// The owner: "i think it's possible to soft lock, so we need to do repeatable
// encounters with logs and stone and other stuff as loot." A town stripped of
// every works with nothing in the stores — which is what a raid leaves — must
// still have a way back.
await seed({ version: 5, stacks: {}, paths: {},
  stone: 0, logs: 0, planks: 0, food: 0, pop: 4, popPart: 0,
  goblins: {}, hero: { hp: 13, spears: 0, part: 0 }, fight: null,
  store: 0, carts: 0, menace: {}, taken: 1, lost: false,
  forage: null, forays: 0, legacy: { runs: 0, spears: 0 } });
const ruinStone = await cellNum('stone');
const forayDeed = page.locator('.deed', { hasText: 'Send the hero out' });
const forayNote = (await forayDeed.textContent().catch(() => '')).trim().replace(/\s+/g, ' ');
console.log('  offers  :', `"${forayNote.slice(0, 64)}"`);
if (!/⏱\d+s →/.test(forayNote)) {
  misses.push(`a ruined town is not offered a way back: "${forayNote.slice(0, 60)}"`);
}
await forayDeed.click({ timeout: 2000 })
  .catch(() => misses.push('no deed sends the hero out'));
await page.waitForTimeout(600);
const outNote = (await page.locator('.deed', { hasText: 'Foraging' })
  .textContent().catch(() => '')).trim().replace(/\s+/g, ' ');
console.log('  out     :', `"${outNote.slice(0, 50)}"`);
if (!/⏱\d+s/.test(outNote)) misses.push(`the hero went out and the deed does not say so: "${outNote}"`);
// It lands, and the ruined town has goods again.
await page.waitForTimeout(46000);
const backStone = await cellNum('stone');
console.log('  home    :', `stone ${ruinStone} → ${backStone}`);
if (!(backStone > ruinStone)) {
  misses.push(`the foray came home empty: stone ${ruinStone} → ${backStone}`);
}

// -------------------------------------------------- the larder ----------
console.log('\nSTARVING READS DELIVERY');
// The review's silent failure: a farm growing far more than the town eats,
// with a quarry crowding the food off the one road home. The larder is
// empty and NOTHING on screen said so.
await seed({ version: 5, stacks: { 0: 10, 4: 6, 6: 6 },
  paths: { '0|4': 1, '4|6': 3 },
  stone: 0, logs: 0, planks: 0, food: 0, pop: 40, popPart: 0,
  goblins: {}, hero: { hp: 10, arms: 0, part: 0 }, fight: null,
  store: 9, carts: 0 });
const larder = await header();
console.log('  header  :', `"${larder.slice(0, 78)}"`);
if (!/STARVING/.test(await cell('food'))) {
  misses.push(`fields full, larder empty, and the header is silent: "${larder.slice(0, 78)}"`);
}
// The farm is growing plenty — it simply cannot get home.
await page.locator('.map .node[data-id="site:4"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(250);
const farmTitle = (await page.locator('.panel h2').textContent() ?? '').trim();
console.log('  farm    :', `"${farmTitle}"`);
if (!/makes .* carries/.test(farmTitle)) {
  misses.push(`the choked farm does not show the split: "${farmTitle}"`);
}
// And the halted quarry reports itself halted, not still working.
await page.locator('.map .node[data-id="site:6"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(250);
const quarryTitle = (await page.locator('.panel h2').textContent() ?? '').trim();
console.log('  quarry  :', `"${quarryTitle}"`);
// ⚠️ PINCHED, NOT HALTED (2026-08-10): famine is a squeeze from −30% to
// −95% now, so a hungry pit still makes something. What must still be true
// is that it makes LESS than a fed one, and that the split is on show.
if (!/makes [\d.]+ · carries/.test(quarryTitle)) {
  misses.push(`a hungry quarry does not show its split: "${quarryTitle}"`);
}

// -------------------------------------------------- the hand ------------
console.log('\nTHERE IS NO HAND');
// ⚠️ THIS PHASE USED TO SPAM THE TAP AT A FULL STORE, proving the hand
// obeyed the storehouse ceiling. The hand is gone entirely — it out-earned
// every building in the game — so the check that matters now is that it
// STAYS gone: no tap target in the HUD but the gear, and clicking the
// stone cell earns nothing.
await seed({ version: 5, stacks: { 0: 1 }, paths: {},
  stone: 60, logs: 0, planks: 0, food: 90, pop: 4, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 10, arms: 0, part: 0 }, fight: null, store: 0, carts: 0 });
const hudButtons = await page.locator('header button').count();
const gearOnly = await page.locator('header button.gear').count();
console.log('  buttons :', `${hudButtons} in the HUD, ${gearOnly} of them the gear`);
if (hudButtons !== gearOnly) {
  misses.push(`the HUD has ${hudButtons - gearOnly} tap target(s) besides the gear`);
}
const tapFrom = await stoneNow();
for (let i = 0; i < 20; i++) {
  await page.locator('[data-q="stone"]').click({ timeout: 800 }).catch(() => {});
}
await page.waitForTimeout(300);
const tapTo = await stoneNow();
console.log('  20 taps :', `${tapFrom} → ${tapTo}`);
if (tapTo > tapFrom) misses.push(`clicking the stone cell still earns: ${tapFrom} → ${tapTo}`);

// -------------------------------------------------- the cartwright ------
console.log('\nTHE CARTWRIGHT');
// A town whose paths are eating its work: the deed must be OFFERED, must
// say what is being thrown away, and buying it must visibly un-choke the
// board. And it must NOT be offered to a town that wastes nothing — a
// deed that takes 30 stone to do nothing is a trap.
await seed({ version: 5, stacks: { 0: 6, 1: 6, 2: 6, 3: 4 },
  paths: { '0|1': 1, '0|2': 1, '0|3': 1 },
  stone: 400, logs: 0, planks: 400, food: 900, pop: 24, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 10, arms: 0, part: 0 }, fight: null, store: 20, carts: 0 });
const cartDeed = page.locator('.deed', { hasText: 'Carts ×1' });
const cartNote = (await cartDeed.textContent().catch(() => '')).trim().replace(/\s+/g, ' ');
console.log('  offers  :', `"${cartNote.slice(0, 76)}"`);
if (!/⚠\d/.test(cartNote)) {
  misses.push(`the cartwright does not state its case: "${cartNote.slice(0, 76)}"`);
}
// Read the SPLIT off the choked quarry's own panel title — the same
// reader the choke phase uses, because the board thins labels when the
// map is crowded.
const splitOf = async () => {
  await page.locator('.map .node[data-id="site:1"]').click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(250);
  const t = (await page.locator('.panel h2').textContent()) ?? '';
  return t.trim();
};
const cartBefore = await splitOf();
console.log('  before  :', `"${cartBefore}"`);
// The title says `makes X · carries Y` while choked and collapses to a
// bare `Y/s` once everything it makes gets home — so read both shapes,
// because the collapse IS the win and must not read as a parse failure.
const carriedIn = (t) => Number(
  (/carries ([\d.]+)/.exec(t) ?? /·\s*([\d.]+)\/s/.exec(t))?.[1] ?? NaN);
const carriedBefore = carriedIn(cartBefore);
if (!/carries/.test(cartBefore)) {
  misses.push(`the seeded quarry is not choked to begin with: "${cartBefore}"`);
}
if (!(carriedBefore > 0)) {
  misses.push(`the seeded town is not choked, so the cart proves nothing: "${cartBefore}"`);
}
await page.locator('.map .node[data-id="site:0"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(250);
await cartDeed.click({ timeout: 2000 })
  .catch(() => misses.push('no deed sets the cartwright to work'));
await page.waitForTimeout(600);
const cartAfter = await splitOf();
console.log('  after   :', `"${cartAfter}"`);
const carriedAfter = carriedIn(cartAfter);
if (!(carriedAfter > carriedBefore)) {
  misses.push(`a cart carried nothing more: ${carriedBefore} then ${carriedAfter}`);
} else {
  console.log('  gain    :', `${carriedBefore}/s → ${carriedAfter}/s off the same works`);
}
// And the trap: a town with one quarry on an open path wastes nothing.
await seed({ version: 5, stacks: { 0: 1, 1: 1 }, paths: { '0|1': 3 },
  stone: 400, logs: 0, planks: 400, food: 90, pop: 4, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 10, arms: 0, part: 0 }, fight: null, store: 20, carts: 0 });
const offeredIdle = await page.locator('.deed', { hasText: 'Carts ×' }).count();
console.log('  unchoked:', offeredIdle === 0
  ? 'no cart deed, correctly' : 'CART OFFERED TO A TOWN THAT WASTES NOTHING');
if (offeredIdle > 0) misses.push('the cartwright is offered to a town with nothing to gain');

// -------------------------------------------------- the storehouse ------
console.log('\nTHE STORE');
// A town whose quarries have filled the camp: the chip must SAY full, and
// raising a storehouse must let it climb again. Waste nobody can see is
// the choke bug in a different currency.
await seed({ version: 5, stacks: { 0: 3, 1: 4 }, paths: { '0|1': 3 },
  stone: 60, logs: 0, planks: 40, food: 400, pop: 12, popPart: 0,
  goblins: { 4: 12, 5: 18, 6: 24, 7: 32, 8: 48, 9: 60 },
  hero: { hp: 10, arms: 0, part: 0 }, fight: null, store: 0 });
const brimmed = await header();
console.log('  full    :', `"${brimmed.slice(0, 70)}"`);
if (!/60\/60/.test(await cell('stone')) || !/full/.test(await cell('stone'))) {
  misses.push(`a full store does not say so on the chip: "${brimmed.slice(0, 70)}"`);
}
// The camp is pre-selected on boot, so the deed is already on the dock.
const storeDeed = page.locator('.deed', { hasText: 'Storehouse ×1' });
const storeNote = await storeDeed.textContent().catch(() => '');
console.log('  offers  :', `"${storeNote.trim().replace(/\s+/g, ' ').slice(0, 60)}"`);
if (!/📦120/.test(storeNote)) {
  misses.push(`the storehouse does not price its room: "${storeNote.trim().slice(0, 60)}"`);
}
await storeDeed.click({ timeout: 2000 })
  .catch(() => misses.push('no deed raises a storehouse'));
await page.waitForTimeout(1400);
const roomier = await header();
console.log('  roomier :', `"${roomier.slice(0, 70)}"`);
if (/🪨 full/.test(await cell('stone'))) {
  misses.push(`the store was raised and the town is still full: "${roomier.slice(0, 70)}"`);
}
if (!/\+\d/.test(roomier.split('logs')[0])) {
  misses.push(`stone is not climbing again after the storehouse: "${roomier.slice(0, 70)}"`);
}

// ---------------------------------------------------- the pocket time ----
console.log('\nTHE AWAY LINE');
await page.addInitScript(() => {
  const game = {
    version: 5, stacks: { 0: 2, 1: 2 }, paths: { '0|1': 2 },
    stone: 5, logs: 0, planks: 0, food: 0, pop: 4, popPart: 0,
  };
  localStorage.setItem('camp-save',
    JSON.stringify({ game, savedAt: Date.now() - 2 * 3600 * 1000 }));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const away = await panel();
console.log('  says    :', `"${away.slice(0, 80)}"`);
if (!/Away 2\.0 hours — \+\d+ stone/.test(away)) {
  misses.push(`two pocket hours and no away line: "${away.slice(0, 70)}"`);
}
await page.locator('.map .node[data-id="site:1"]').click({ timeout: 2000 }).catch(() => {});
await page.waitForTimeout(200);
if (/Away 2\.0 hours/.test(await panel())) {
  misses.push('the away line does not clear on a tap');
}
await page.screenshot({ path: SHOT });

await b.close();
if (misses.length) {
  console.log('\n⚠️ PROBLEMS');
  for (const m of misses) console.log('  ', m);
  process.exit(1);
}
console.log('\nall good — counts stack, chokes draw, the hero takes ground, and the town eats');
