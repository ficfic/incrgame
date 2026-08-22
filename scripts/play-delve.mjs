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
// ★★★ COUNT THE ANIMATION FRAMES THE PAGE ASKS FOR. ⚠️ PIXELS CANNOT SEE THIS:
// a `requestAnimationFrame` loop left running forever redraws the SAME picture,
// so a two-frame pixel comparison of an idle dungeon is identical whether the
// loop is off or burning the battery flat. Counting the calls is the only
// honest measurement, and it caught a sabotage that pixels waved through.
await page.addInitScript(() => {
  window.__raf = 0;
  const real = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__raf++; return real(cb); };
});
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

/** ★★★ A PRISTINE DELVE. ⚠️ RELOADING IS NO LONGER ENOUGH — the game SAVES
 *  now, so a plain reload brings back the run you just finished. That is the
 *  save working, and it broke the two sections of this probe that had been
 *  using `reload()` as a way to start over. Wiping the store first is what
 *  "start over" means from outside the page. */
const freshStart = async () => {
  await page.evaluate(() => new Promise((res) => {
    const req = indexedDB.deleteDatabase('semantic-drift');
    req.onsuccess = req.onerror = req.onblocked = () => res(null);
  }));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
};

await freshStart();
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

console.log('\n★★★ AND IT MOVES');
// ⚠️ MEASURED TWO WAYS, BECAUSE THE FIRST DRAFT MEASURED NEITHER THING IT
// CLAIMED TO. A turn-based game that cuts instantly between states gives the
// player nothing to read — motion is what says a turn HAPPENED. It is all
// decoration by design, which is exactly the excuse under which it silently
// stops working.
const shot = async () => page.evaluate(() => {
  const cv = document.querySelector('.crypt canvas');
  const { data } = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  let sum = 0;
  for (let i = 0; i < data.length; i += 64) sum += data[i];
  return sum;
});
const frames = () => page.evaluate(() => window.__raf);

// ⚠️ LET THE LAST STEP FINISH. The walk above glides for another 240ms, and
// measuring during it reported a settled dungeon as "twitching" — the check
// was catching its own previous turn.
await page.waitForTimeout(700);
const idle0 = await frames();
await page.waitForTimeout(500);
const idle1 = await frames();
console.log('  idle    :', `${idle1 - idle0} frames asked for in half a second`);
// ★★★ THE LOOP RUNS ONLY WHILE SOMETHING MOVES. A permanent rAF on a
// turn-based game is a phone battery spent redrawing a picture that has not
// changed. ⚠️ AND PIXELS CANNOT SEE THIS — a sabotage that never stopped the
// loop passed a two-frame pixel comparison, because the picture is the same.
if (idle1 - idle0 > 2) misses.push(`the animation loop never stops: ${idle1 - idle0} frames while idle`);

// ★★★ AND A STEP GLIDES. ⚠️ INTO AN EMPTY ROOM ON PURPOSE: the first draft
// stepped into the Rat Warren, where the runt bites on arrival, so what it
// actually measured was the HIT FLINCH — and a sabotage that made the lamp cut
// hard between rooms sailed through, because the flinch was still animating.
// The Weeping Stair has nothing in it, so the only thing that can move is the
// lamp being carried.
await page.locator('.node', { hasText: 'Weeping Stair' }).first().click();
await page.waitForTimeout(60);
const mid = await shot();
await page.waitForTimeout(600);
const rest = await shot();
console.log('  gliding :', `mid-step ${mid} → settled ${rest}`);
if (mid === rest) misses.push('the step was a hard cut — the lamp did not move between rooms');
const moved = (await frames()) - idle1;
console.log('  frames  :', `${moved} asked for while stepping`);
if (moved < 3) misses.push(`a step asked for ${moved} animation frames — nothing was tweened`);
await walk('Broken Hall');

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

console.log('\n★★★ AND THE FIGHT ASKS SOMETHING');
// ⚠️ THE OWNER, AFTER FOUR SLICES OF WORK AROUND THE FIGHT: *"it's cool and
// all, but so far there's just one button and no gameplay."* They were right —
// `strike` picked its own target, so a room with two monsters in it was one
// button tapped four times. This section counts the choices the room actually
// offers a thumb.
const verbs = async () => (await page.locator('.deed').allTextContents())
  .map((s) => s.replace(/\s+/g, ' ').trim().split(' ')[0]);
const offered = await verbs();
console.log('  offers  :', offered.join(' · '));
// ★★★ MORE THAN ONE THING TO DO, in the first fight, with nothing bought.
if (offered.length < 4) misses.push(`the first fight offers ${offered.length} buttons — that is not a fight`);
for (const want of ['Swing', 'Brace', 'Hold', 'Wedge']) {
  if (!offered.includes(want)) misses.push(`no ${want} in the first fight`);
}

// ★★★ AND YOU CAN SAY WHICH ONE. Tapping a monster must aim at it AND open
// the shove, because who you kill first is the decision the fight is built on.
const sqs = page.locator('.sq');
const heavy = sqs.filter({ hasText: 'big one' }).first();
const hpOf = async (which) => Number(await sqs.filter({ hasText: which }).first().locator('b').textContent());
const bigBefore = await hpOf('big one'), runtBefore = await hpOf('runt');
await heavy.click();
await page.waitForTimeout(150);
const aimed = await verbs();
console.log('  aimed   :', aimed.join(' · '));
if (!aimed.includes('Shove')) misses.push('tapping a monster offers no shove — the graph verb is missing from the fight');
const swingLabel = (await page.locator('.deed', { hasText: 'Swing' }).first().textContent()).replace(/\s+/g, ' ');
console.log('  swing   :', `"${swingLabel.trim().slice(0, 40)}"`);
if (!/big one/.test(swingLabel)) misses.push('the swing does not say what it is aimed at');
await page.locator('.deed', { hasText: 'Swing' }).first().click();
await page.waitForTimeout(200);
const bigAfter = await hpOf('big one'), runtAfter = await hpOf('runt');
console.log('  hit     :', `big ${bigBefore}→${bigAfter} · runt ${runtBefore}→${runtAfter}`);
// ⚠️ THE BUG THIS EXISTS FOR: the swing used to take the WEAKEST whatever you
// aimed at, so aiming was decoration.
if (!(bigAfter < bigBefore)) misses.push('aiming did nothing — the swing still picks its own target');
if (runtAfter !== runtBefore) misses.push('the swing hit something you did not aim at');

// ★★★ AND IT SAYS WHAT IT DOES. ⚠️ THERE WERE TWO MONSTERS AND THEY WERE THE
// SAME MONSTER — three numbers apart. A trait a player cannot READ is a trait
// they find out about by dying, which on a bestiary is the whole failure mode.
const traits = (await page.locator('.sq .trait').allTextContents()).map((s) => s.trim());
console.log('  traits  :', traits.join(' | '));
if (traits.length < 2) misses.push('the monsters do not say what they do');
if (new Set(traits).size < 2) misses.push(`both monsters say the same thing: "${traits[0]}"`);

console.log('\n★★★ AND YOU CAN PUT IT THROUGH A DOOR');
// ⚠️ NO SECOND TAP. The aim STAYS on the thing you hit — you usually want to
// keep hitting it — so tapping it again toggles the aim OFF and takes the
// shove buttons away with it. The first draft did exactly that and then waited
// thirty seconds for a button it had just dismissed.
const inRoom = await sqs.count();
await page.locator('.deed', { hasText: 'Shove' }).first().click();
await page.waitForTimeout(250);
const left = await sqs.count();
console.log('  shoved  :', `${inRoom} in the room → ${left}`);
if (!(left < inRoom)) misses.push('shoving left it standing where it was');

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

console.log('\nAND A SWING HAS NO COOLDOWN');
// ⚠️ WHAT IS LEFT OF THIS SECTION. It used to sum every `.sq b` before and
// after a swing — which stopped meaning anything once a SHOVED foe could walk
// back into the room between the two readings and push the total UP. Damage is
// now measured per-monster in "THE FIGHT ASKS SOMETHING", where the aim makes
// it unambiguous. What only belongs here is the price of a swing: the turn.
if (await page.locator('.deed', { hasText: 'Swing' }).first().isDisabled({ timeout: 2000 })
  .catch(() => { misses.push('no swing button — the delver did not survive to it'); return false; })) {
  misses.push('the swing is on a cooldown — that was the clock talking');
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

// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ ON A FRESH PAGE, AND LAST. The crawler genuinely makes the dungeon busier
// — it wakes lairs you have not reached and walks them toward you — so running
// it first quietly broke three checks above: nine rooms drawn instead of four,
// a step that appeared to cost five turns, and a swing that "did nothing"
// because a new foe had arrived between the two readings. None of those were
// bugs in the game and all three were the probe measuring a state it had
// stirred up itself. So: everything above happens on a pristine delve, and the
// crawler gets its own from here.
// ═══════════════════════════════════════════════════════════════════════════
await freshStart();

console.log('\n★★★ YOU SEND SOMETHING DOWN');
// ⚠️ THE TWO-GRAPH CHECK, DRIVEN WITH A THUMB. The engine has 19 unit tests
// for the crawler and not one of them can see whether a CLAIM is drawn
// differently from a floor — and if the two look alike on the phone, the whole
// mechanic is deleted no matter what the engine says.
await press('Send a crawler');
if (!(await page.locator('.wire').count())) misses.push('no report from the crawler at all');
const wire = () => flat('.wire');
console.log('  wire    :', `"${await wire()}"`);
for (let i = 0; i < 3; i++) await press('Hold');
const filed = await wire();
console.log('  after 4 :', `"${filed}"`);
// ★★★ IT MUST CLAIM MORE THAN IT WALKED. That gap IS the game: rooms on your
// map that nobody has stood in.
const walked = Number(filed.match(/(\d+) walked/)?.[1] ?? 0);
const said = Number(filed.match(/(\d+) claimed/)?.[1] ?? -1);
if (!(walked >= 2)) misses.push(`the crawler is not walking: ${walked} rooms`);
if (!(said > 0)) misses.push('the crawler claims nothing it has not walked — no gap, no game');

console.log('\n★★★ A CLAIM IS NOT A FLOOR');
const ghosts = await page.locator('.node.ghost').count();
const solid = await page.locator('.node:not(.ghost)').count();
console.log('  drawn   :', `${solid} verified · ${ghosts} reported`);
if (ghosts < 1) misses.push('nothing on the map is marked as merely reported');
// ⚠️ AND THEY MUST NOT LOOK ALIKE — MEASURED ON THE FLOOR, NOT THE LABEL.
// The first version of this compared the two NAME COLOURS and stayed green
// with the ghost styling deleted: without it a claim falls back to `--dim` and
// a verified room is `--faint`, which happen to sit 42 apart, just over the
// threshold. It was passing on a coincidence between two greys.
//
// ★★★ THE REAL DIFFERENCE IS THAT A CLAIM HAS NO FLOOR. Nothing has been cut
// there — it is an outline over living rock — and that is unmistakable in
// pixels, which is the whole point: a reported room must never be able to pass
// as ground you have stood on.
const inside = await page.evaluate(() => {
  const cv = document.querySelector('.crypt canvas');
  const ctx = cv.getContext('2d');
  const { data, width, height } = ctx.getImageData(0, 0, cv.width, cv.height);
  const host = document.querySelector('.crypt').getBoundingClientRect();
  const s = cv.width / host.width;
  const core = (el) => {
    if (!el) return -1;
    const r = el.getBoundingClientRect();
    const x0 = (r.left - host.left + r.width * 0.3) * s;
    const x1 = (r.left - host.left + r.width * 0.7) * s;
    const y0 = (r.top - host.top + r.height * 0.3) * s;
    const y1 = (r.top - host.top + r.height * 0.7) * s;
    let sum = 0, n = 0;
    for (let y = y0 | 0; y < Math.min(height, y1 | 0); y++) {
      for (let x = x0 | 0; x < Math.min(width, x1 | 0); x++) {
        const i = (y * width + x) * 4;
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; n++;
      }
    }
    return n ? sum / n : -1;
  };
  // Bare living rock: a strip down the far edge, where no chamber reaches.
  let rs = 0, rn = 0;
  for (let y = (height * 0.05) | 0; y < height * 0.95; y += 3) {
    for (let x = 0; x < width * 0.06; x++) {
      const i = (y * width + x) * 4;
      rs += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]; rn++;
    }
  }
  return {
    ghost: core(document.querySelector('.node.ghost')),
    cut: core(document.querySelector('.node:not(.ghost):not(.here)')),
    rock: rn ? rs / rn : -1,
  };
});
console.log('  floor   :', `rock ${inside.rock.toFixed(1)} · inside a claim ${inside.ghost.toFixed(1)}`
  + ` · inside a cut room ${inside.cut.toFixed(1)}`);
if (!(inside.cut > inside.ghost * 1.6)) {
  misses.push(`a claim is floored like a room you have stood in (${inside.ghost.toFixed(1)} vs ${inside.cut.toFixed(1)})`);
}
// ★★★ AND THE CLAIM'S INSIDE IS STILL ROCK. ⚠️ THE CHECK ABOVE IS NOT ENOUGH
// ON ITS OWN and two sabotages proved it: a reported room is always FAR from
// the lamp, so "darker than the room you are standing next to" stays true even
// when it is given a full floor. It was measuring the lamp, not the fill.
// Nothing has been cut in a claim, so its middle must read as the rock around
// it — that is the one comparison the lamp cannot fake.
if (!(inside.ghost < inside.rock * 1.45)) {
  misses.push(`a claim has been given a floor (${inside.ghost.toFixed(1)} against bare rock ${inside.rock.toFixed(1)})`);
}

console.log('\n★★★ AND SOME OF ITS DOORS DO NOT EXIST');
// ★★★ THE PAYOFF, TAPPED. Find a room the crawler joined to this one that has
// no door, tap it, and the screen must say so — the moment you learn what its
// map is worth.
const lie = await page.evaluate(() => {
  const names = [...document.querySelectorAll('.node')].map((n) => n.textContent.trim());
  return names;
});
console.log('  on map  :', lie.join(' · '));
// ⚠️ THE RAT WARREN, and it must be the Warren. From the Mouth the crawler
// joins the two up — they are 202 units apart on its map and it has never been
// in one of them — and there is NO SUCH DOOR. Tapping the Weeping Stair
// instead proved nothing: the crawler had actually walked that one, so its
// invented door to it was already deleted.
const wasTurn = await turn();
await walk('Rat Warren');
const bunked = await panel();
console.log('  says    :', `"${bunked.match(/No door goes to[^.]*\. [^.]*\./)?.[0] ?? bunked.slice(0, 60)}"`);
if (!/No door goes to/.test(bunked)) {
  misses.push('tapping an invented door said nothing — the map never gets caught lying');
}
// ★ AND IT IS NOT A TURN. Being lied to must not cost you the exchange; a
// refused action stays refused, which the engine has its own test for.
if ((await turn()) !== wasTurn) misses.push("walking into a door that does not exist cost a turn");


// ═══════════════════════════════════════════════════════════════════════════
await page.screenshot({ path: 'play-crawler.png' });

console.log('\n★★★ THE HOARD BUYS A GRAPH VERB');
// ⚠️ EARNED, SPENT AND USED WITH A THUMB. The engine has 15 tests for the kit
// and not one of them can see whether a wedged door still LOOKS like a way
// out — which is all that stands between "you cut an edge" and "a button did
// something invisible".
await freshStart();

const shopped = await page.locator('.deed.buy').count();
const freebies = await page.locator('.deed.buy:not([disabled])').count();
console.log('  on sale :', `${shopped} things · ${freebies} affordable with an empty hoard`);
if (shopped < 4) misses.push(`the hoard buys ${shopped} things — the shop is not there`);
// ★ A SHOP THAT SELLS YOU THINGS FOR NOTHING is not a ratchet.
if (freebies !== 0) misses.push(`${freebies} things are free with a hoard of 0`);
const priced = await flat('.shop');
for (const want of ['bar a door', 'two doors out', 'crawler takes']) {
  if (!priced.includes(want)) misses.push(`the shop never says what a buy does to the graph: "${want}"`);
}

console.log('\nEARNING IT');
// Clear the Rat Warren, walk back up, climb out. This is the loop.
await walk('Broken Hall'); await walk('Rat Warren');
for (let i = 0; i < 14 && (await page.locator('.sq').count()) > 0; i++) await press('Swing');
console.log('  cleared :', `carried ${(await head()).match(/(\d+) CARRIED/i)?.[1] ?? '?'}`);
await walk('Broken Hall'); await walk('The Mouth');
await press('Climb out');
const banked = Number((await head()).match(/(\d+)\s*BANKED/i)?.[1] ?? 0);
console.log('  banked  :', banked);
// ★★★ AND A RUN IS A RUN. Without this the dungeon pays 70 gold EVER, against
// a shop costing 172 — a ratchet that cannot be turned to the end.
if (!(banked > 0)) misses.push(`a full raid banked nothing: ${banked}`);
const reset = await page.locator('.node.danger').count();
console.log('  dark    :', `${reset} rooms still show something standing`);

console.log('\nSPENDING IT');
const canBuy = await page.locator('.deed.buy:not([disabled])').count();
console.log('  afford  :', `${canBuy} of ${shopped} after one raid`);
// ⚠️ THE FIRST BUY MUST LAND ON THE FIRST OR SECOND DELVE or the shop is
// furniture. This is the check that would catch prices drifting out of reach.
if (canBuy < 1) misses.push(`one full raid affords nothing — the shop is out of reach`);
await press('iron wedges');
const pack = await flat('.shop');
console.log('  pack    :', `"${pack.match(/\d+ in the pack/)?.[0] ?? 'nothing bought'}"`);
if (!/in the pack/.test(pack)) misses.push('buying wedges put nothing in the pack');

console.log('\n★★★ AND CUTTING AN EDGE');
await walk('Broken Hall');
const cutter = page.locator('.deed.wedge').first();
if (!(await cutter.count())) misses.push('nowhere to spend a wedge from a room with three doors');
else {
  const which = (await cutter.textContent()).replace(/\s+/g, ' ').trim();
  console.log('  wedging :', `"${which.slice(0, 40)}"`);
  await cutter.click();
  await page.waitForTimeout(200);
  const gone = await page.locator('.node.barred').count();
  console.log('  on map  :', `${gone} door struck through`);
  // ★★★ THE WHOLE PURCHASE, ON SCREEN. A cut edge that still reads as a way
  // out is a button that did something invisible.
  if (gone < 1) misses.push('the wedged door is not marked on the map at all');
  const said = await panel();
  if (!/wedge the door/i.test(said)) misses.push('nothing says a door was wedged');
  // And it must refuse to let you walk it.
  const name = which.replace(/^Wedge /, '').split(' shut')[0].trim();
  const was = await turn();
  await walk(name);
  if ((await turn()) !== was) misses.push(`you walked straight through your own wedge to ${name}`);
  console.log('  held    :', `tapping ${name} did not move you`);
}
await page.screenshot({ path: 'play-kit.png' });

console.log('\n★★★ AND IT IS STILL THERE TOMORROW');
// ⚠️ THE DELVE SHIPPED FOUR TIMES WITH NO PERSISTENCE AT ALL — the state lived
// in a rune and nowhere else, so closing the tab threw away the hoard, the kit
// and the crawler's whole map. No unit test can catch that; it is only visible
// from outside the page.
//
// ⚠️ WAIT OUT YOUR OWN WEDGE FIRST. The section above barred the door to the
// Mouth — a legal and quite funny thing to do to yourself — and this one then
// could not get home, so the shop it wanted to read never rendered.
for (let i = 0; i < 6; i++) await press('Hold');
await walk('The Mouth');

const packOf = async () => Number((await flat('.shop')).match(/(\d+) in the pack/)?.[1] ?? 0);
const kept = await packOf();
const mapBefore = await page.locator('.node').count();
console.log('  to keep :', `${kept} wedges · ${mapBefore} rooms known`);
// ★ A CHECK THAT COMPARES 0 TO 0 IS NOT A CHECK. Everything below rests on
// there being something worth losing, so that is asserted first.
if (!(kept > 0 && mapBefore > 2)) misses.push('nothing worth saving was set up — the checks below would be vacuous');

await page.waitForTimeout(400);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
console.log('  reload  :', `${await packOf()} wedges · ${await page.locator('.node').count()} rooms`);
if ((await packOf()) !== kept) misses.push(`the kit did not survive a reload: ${kept} → ${await packOf()}`);
if ((await page.locator('.node').count()) !== mapBefore) misses.push('the map did not survive a reload');

console.log('\nAND THE OWNER CAN CARRY IT OFF THE DEVICE');
await page.locator('.keep summary').click();
await page.locator('.deed', { hasText: 'Export' }).click();
await page.waitForTimeout(250);
const text = await page.locator('.keep textarea').inputValue();
console.log('  export  :', `"${text.slice(0, 30)}…" ${text.length} chars`);
if (!text.startsWith('DELVE1:')) misses.push('export produced nothing a phone could paste');

// ★★★ AND NOW PROVE THE PROBE CAN TELL THE DIFFERENCE. Wipe the device. If the
// wedges are still there after that, every check above was measuring nothing.
// ⚠️ A CLEAN DEVICE IS NOT ZERO. A delver is handed two wedges before they
// have earned anything, so the wipe is proved by the count DROPPING BACK to
// the starting pack, not by it reaching 0 — which is what this asserted, and
// it went red the moment the starting pack stopped being empty.
await freshStart();
const wiped = await packOf();
console.log('  wiped   :', `${wiped} wedges on a clean device, was ${kept}`);
if (wiped >= kept) misses.push(`wiping the device changed nothing — the save checks above are vacuous`);

await page.locator('.keep summary').click();
await page.locator('.keep textarea').fill(text);
await page.locator('.deed', { hasText: 'Import' }).click();
await page.waitForTimeout(300);
const restored = await packOf();
console.log('  import  :', `${wiped} → ${restored} wedges from a pasted save`);
if (restored !== kept) misses.push(`importing a save did not bring it back: ${restored}, wanted ${kept}`);
await page.screenshot({ path: 'play-save.png' });

console.log('\n★★★ AND THE GAME CAN BE FINISHED');
// ⚠️ THE ENDING IS THE ONE SCREEN THAT CANNOT BE REACHED BY PLAYING IN A PROBE
// — it takes several delves and a bought kit. So it is reached the way a
// player who had done that would reach it: through the export format, with
// every room marked as stood in. If that panel never renders, the game has no
// end no matter what `done()` returns.
const reach = await page.evaluate((mark) => {
  const el = document.querySelector('.keep textarea');
  const raw = JSON.parse(decodeURIComponent(escape(atob(el.value.slice(mark.length)))));
  raw.trod = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  return mark + btoa(unescape(encodeURIComponent(JSON.stringify(raw))));
}, 'DELVE1:');
await page.locator('.keep textarea').fill(reach);
await page.locator('.deed', { hasText: 'Import' }).click();
await page.waitForTimeout(300);
const end = await page.locator('.won').count();
const endText = end ? await flat('.won') : '';
console.log('  ending  :', end ? `"${endText.slice(0, 60)}"` : 'never rendered');
if (!end) misses.push('finishing the game shows nothing — there is no ending');
if (!/is true/i.test(endText)) misses.push('the ending does not say what was finished');
// ★ AND THE COUNTER THAT LEADS YOU THERE. A goal with no progress readout is
// a goal the player cannot aim at.
const tally = await flat('.shead');
console.log('  tally   :', `"${tally}"`);
if (!/\d+\/10 rooms stood in/.test(tally)) misses.push('nothing tells you how close the ending is');
// Scroll the panel to the top — the ending is above the shop, and a
// screenshot of the shop is not a screenshot of the ending.
await page.evaluate(() => { document.querySelector('.panel').scrollTop = 0; });
await page.waitForTimeout(150);
await page.screenshot({ path: 'play-end.png' });

console.log('\n★★★ AND THE GAME KEEPS A RECORD');
// ⚠️ AN INCREMENTAL IS A GAME ABOUT A CURVE, and a player cannot feel a curve
// they cannot see. Milestones here are not badges either — each is a permanent
// cut of everything the dungeon pays, which is the only compounding number in
// the game.
await page.locator('.rec summary').click();
await page.waitForTimeout(150);
const rec = await flat('.rec');
console.log('  record  :', `"${rec.slice(0, 100)}"`);
for (const want of ['delves', 'deepest floor', 'ever banked', 'crawlers lost']) {
  if (!rec.includes(want)) misses.push(`the record does not show "${want}"`);
}
const mult = rec.match(/×([\d.]+)/)?.[1];
console.log('  pays    :', `×${mult}`);
// ★★★ AND THE MULTIPLIER HAS MOVED. This probe has already cleared a room and
// banked, so a game still paying ×1.00 means milestones are decoration.
if (!(Number(mult) > 1)) misses.push(`nothing has been earned: still paying ×${mult}`);
const got = await page.locator('.note.mark.got').count();
console.log('  earned  :', `${got} of ${await page.locator('.note.mark').count()}`);
if (got < 1) misses.push('no milestone was claimed by a full raid');

console.log('\n★★★ AND THERE IS SOMETHING TO FIND');
// ⚠️ A CRAWLER WITH NO LOOT IS A CORRIDOR WITH A SHOP AT THE END. Everything
// this game gave you, you BOUGHT — and a price list is a plan, not a
// discovery. The relics are in the WELLS, which are dead ends off the road to
// the Hoard, so the game pays you for walking somewhere you did not have to.
await freshStart();
for (const room of ['Broken Hall', 'Rat Warren', 'Gallery', 'Drowned Well']) {
  if (/went down/.test(await panel())) break;
  await walk(room);
}
const carried = (await page.locator('.note.relic').allTextContents())
  .map((s) => s.replace(/\s+/g, ' ').trim());
console.log('  found   :', carried.join(' | ') || 'nothing');
if (carried.length < 1) misses.push('the well held nothing — there is no loot in the game');
if (!/chalk/i.test(carried.join(' '))) misses.push('the first relic is not the chalk');
// ★★★ AND IT SAYS WHAT RULE IT CHANGES. A relic that gave +2 damage would be a
// shop item you had to walk further for; these turn rules off.
if (!/invented/.test(carried.join(' '))) misses.push('the relic does not say what it does');

// ★★★ THE CHALK ANSWERS THE CENTRAL LIE. Send a crawler and the doors it makes
// up must now be MARKED — still drawn, still its claim, but legible as one.
const inked = async () => page.evaluate(() => {
  const cv = document.querySelector('.crypt canvas');
  const { data } = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  let n = 0;
  // ⚠️ CHALK, AND NOTHING ELSE DOWN HERE IS THIS COLOUR. The first version of
  // this counted a dark blue #2e4750 — which is exactly what an anti-aliased
  // dashed CLAIM line blends to against the rock, so it was counting
  // anti-aliasing and the sabotage that marked nothing sailed through.
  for (let i = 0; i < data.length; i += 4) {
    if (Math.abs(data[i] - 0xe8) < 14 && Math.abs(data[i + 1] - 0xdc) < 14
      && Math.abs(data[i + 2] - 0xc4) < 14) n++;
  }
  return n;
});
for (const room of ['Gallery', 'Rat Warren', 'Broken Hall', 'The Mouth']) await walk(room);
await press('Send a crawler');
for (let i = 0; i < 3; i++) await press('Hold');
const marks = await inked();
console.log('  chalked :', `${marks} pixels of struck-through door`);
if (marks < 20) misses.push(`the chalk marks nothing — invented doors still look real (${marks}px)`);

console.log('\n★★★ AND IT GOES DEEPER');
// ⚠️ THE GENRE PASS, DRIVEN WITH A THUMB. A roguelike with one hand-drawn
// level is a puzzle you solve once and an incremental with no content tier is
// a shop with a last item — this game was both. `test/floors.test.ts` walks 40
// generated floors, but only the browser can say whether the SECOND one is a
// dungeon you can actually see and tap.
await freshStart();
const floorNow = async () => Number((await head()).match(/(\d+)\s*FLOOR/i)?.[1] ?? -1);
console.log('  start   :', `floor ${await floorNow()}`);
if ((await floorNow()) !== 1) misses.push('a new delver does not start on floor 1');

// ⚠️ KITTED FIRST, BECAUSE THE DASH IS SUPPOSED TO KILL YOU BARE-HANDED. That
// is the ladder working (`test/ladder.test.ts`), and the first draft of this
// section walked it with twelve life, died on the way, and then reported "the
// dash is not survivable at all" — the probe failing its own difficulty curve.
await page.locator('.keep summary').click();
await page.locator('.deed', { hasText: 'Export' }).click();
await page.waitForTimeout(200);
const kitted = await page.evaluate((mark) => {
  const el = document.querySelector('.keep textarea');
  const raw = JSON.parse(decodeURIComponent(escape(atob(el.value.slice(mark.length)))));
  raw.kit = { wedges: 6, lamp: 2, brace: 1, edge: 1, vim: 1 };
  raw.hp = 20;
  return mark + btoa(unescape(encodeURIComponent(JSON.stringify(raw))));
}, 'DELVE1:');
await page.locator('.keep textarea').fill(kitted);
await page.locator('.deed', { hasText: 'Import' }).click();
await page.waitForTimeout(300);
console.log('  kitted  :', `${(await head()).match(/(\d+)\s*\/\d+ LIFE/i)?.[0] ?? '?'}`);
// Walk the dash to the Hoard: 0-1-3-5-6-8-9. It is meant to be survivable
// only with the kit, so the probe takes the hits and reads whether it lived.
for (const room of ['Broken Hall', 'Rat Warren', 'Gallery', 'The Crossing', 'Bone Kiln', 'The Hoard']) {
  if (/went down/.test(await panel())) break;
  await walk(room);
}
const madeIt = !/went down/.test(await panel());
console.log('  dash    :', madeIt ? 'reached the Hoard alive' : 'fell on the way (expected bare-handed)');
if (madeIt) {
  const stair = page.locator('.deed', { hasText: 'stair down' });
  if (!(await stair.count())) misses.push('standing in the Hoard offers no way deeper');
  else {
    const drawnBefore = await rooms();
    await stair.first().click();
    await page.waitForTimeout(400);
    const f2 = await floorNow();
    const namesNow = (await page.locator('.node').allTextContents()).map((s) => s.trim());
    console.log('  descend :', `floor ${f2} · ${await rooms()} rooms drawn · "${namesNow.join(' · ')}"`);
    if (f2 !== 2) misses.push(`the stair did not go anywhere: still floor ${f2}`);
    // ★★★ A NEW FLOOR IS DARK AGAIN. If it arrived already mapped, the descent
    // is a reskin rather than new ground.
    if ((await rooms()) > 4) misses.push(`floor 2 arrived already lit: ${await rooms()} rooms drawn`);
    if (!namesNow.some((n) => /Stair Up/.test(n))) misses.push('floor 2 has no way in named');
    const tally = await flat('.shead');
    if (!/1\/\d+ rooms stood in/.test(tally)) misses.push(`the tally did not reset for the new floor: "${tally}"`);
    console.log('  tally   :', `"${tally}"`);
    await page.screenshot({ path: 'play-floor2.png' });
  }
} else {
  misses.push('the dash to the Hoard is not survivable at all — nobody can ever descend');
}

await b.close();
if (misses.length) {
  console.log('\n⚠️ PROBLEMS');
  for (const m of misses) console.log('  ', m);
  process.exit(1);
}
console.log('\nall good — turns move when you do, the price is on screen first,\n            and the map tells you things that are not true');
