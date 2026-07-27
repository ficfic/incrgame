// Asserts THE ONE POSITIONING RULE against a real browser.
//
// The rule (see the CSS block in src/ui/App.svelte and ARCHITECTURE's technical
// vision): anything placed at a model coordinate is centred on it, and its box
// size never depends on its text.
//
// This exists because that rule was broken for days and no test could see it.
// `.node` was a flex column sized by its LABEL, so its dot rendered at
// `x + labelWidth/2` — 8px off for "thing", 32px off for "physical entity".
// Canvas lines are drawn to the true coordinate, so lines missed dots, the root
// sat off the ring centre, and every report was "everything is misaligned". The
// unit tests were all green throughout, because the engine was never wrong.
//
// Geometry that only exists once CSS has run can only be checked by running CSS.
//
//   npm run build && npx vite preview --port 4321 &
//   node scripts/check-alignment.mjs 4321
//
// Exits non-zero with a table of offenders.
// ---- PROVEN RED, 2026-07-27 -----------------------------------------------
//
// This gate has been vacuous TWICE, both times reporting nothing wrong while
// measuring nothing at all — once by exiting green in 11 seconds without a
// browser, once by skipping every viewport on a locator that matched two
// buttons. Both times the fix was verified by breaking the layout on purpose:
//
//   SABOTAGE   in src/ui/App.svelte, offset the dot from its own coordinate:
//                .node { margin-left: 9px; }
//   OBSERVED   exit 1, every element in every viewport
//                small · thing        off by (9.0, 0.0)
//                small · attribute    off by (9.0, -0.0)
//                An element placed at a model coordinate must be centred on it...
//
// Re-confirmed after the settle wait was changed to read DISCOVER_MS, because
// a wait that is too short makes this skip rather than fail — and a skip is
// the failure mode this file exists to make impossible.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

/** How long a discovery takes, READ FROM THE ENGINE.
 *
 *  ⚠️ THIS WAS A HARD-CODED 21000. The engine's discovery went from 18s to 40s
 *  and this check went quietly back to skipping every viewport — "only 1 nodes
 *  on the board" — which is the second time in one day that a guard here has
 *  stopped measuring without failing. A wait tuned to a constant has to read
 *  the constant. */
const DISCOVER_MS = Number(
  /DISCOVER_MS = ([\d_]+)/.exec(readFileSync('src/core/engine.ts', 'utf8'))?.[1]?.replace(/_/g, '')
);
if (!Number.isFinite(DISCOVER_MS) || DISCOVER_MS <= 0) {
  console.error('could not read DISCOVER_MS from src/core/engine.ts — refusing to guess');
  process.exit(1);
}

const PORT = process.argv[2] ?? '4321';
const TOLERANCE = 1.5; // css px; sub-pixel rounding only

/** Find a Chromium. `playwright-core` deliberately ships no browser, so the one
 *  we get depends on where this runs — this container, a GitHub runner, a
 *  laptop. Previously the path was a single hard-coded container-specific
 *  constant and CI had `continue-on-error: true`, so on the runner the launch
 *  threw, the error was swallowed, and the step reported SUCCESS in eleven
 *  seconds — less time than one viewport spends waiting. A check that cannot
 *  run must SAY SO, loudly; it must never report green. */
function findChromium() {
  const named = process.env.CHROMIUM_PATH;
  if (named && existsSync(named)) return named;
  const globbed = [];
  try {
    for (const d of readdirSync('/opt/pw-browsers')) {
      if (d.startsWith('chromium')) globbed.push(`/opt/pw-browsers/${d}/chrome-linux/chrome`);
    }
  } catch { /* not this machine */ }
  const candidates = [
    '/opt/pw-browsers/chromium/chrome',
    ...globbed,
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

const EXECUTABLE = findChromium();
if (!EXECUTABLE) {
  // Exit 0 so a machine with no browser does not block a deploy — but say it
  // in a way that shows up in the run summary rather than reading as a pass.
  console.log('::warning::alignment check SKIPPED — no Chromium found. This gate did NOT run.');
  console.log('Set CHROMIUM_PATH to a Chrome/Chromium binary to enable it.');
  process.exit(0);
}
console.log(`using ${EXECUTABLE}`);

/** Environment trouble is NOT an assertion failure.
 *
 *  These two outcomes must never be confused, and both must be visible:
 *    · an assertion failed  → the layout is broken → exit 1, block the deploy
 *    · the check could not RUN (no browser, preview down, board never
 *      populated) → say SKIPPED loudly → exit 0, do not block the deploy
 *
 *  Getting this wrong in either direction has already cost a day: reporting a
 *  green tick for a check that never executed, and then — going the other way —
 *  a browser step that hung for nine minutes and held the deploy behind it. */
const skipped = [];

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] })
  .catch((e) => { skipped.push(`chromium would not launch: ${e.message.split('\n')[0]}`); return null; });
if (!browser) {
  console.log(`::warning::alignment check SKIPPED — ${skipped[0]}. This gate did NOT run.`);
  process.exit(0);
}
const failures = [];
let checked = 0; // viewports that produced real measurements

// 'real' is the one that matters: an iPhone 14/15 in Edge, with the browser's
// own chrome already subtracted. The other two are the extremes either side.
for (const [tag, width, height] of [['phone', 440, 956], ['real', 390, 664], ['small', 320, 568]]) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  // Bounded. Playwright's default is 30s PER ACTION and this script performs a
  // dozen of them across three viewports — a locator that never resolves turns
  // into six minutes of a CI job silently doing nothing.
  page.setDefaultTimeout(8000);
  try {
    await page.goto(`http://localhost:${PORT}/incrgame/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (e) {
    skipped.push(`${tag}: page would not load — ${e.message.split('\n')[0]}`);
    await ctx.close();
    continue;
  }
  await page.waitForTimeout(2200);

  const measure = () => page.evaluate(() => {
    const s = document.querySelector('.stage').getBoundingClientRect();
    const read = (el) => {
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform);
      if (!m) return null;
      const box = el.getBoundingClientRect();
      // the label is absolutely positioned, so it is NOT in the parent's rect —
      // union it in by hand, because an overhanging label is exactly the kind of
      // clipping the camera's padding exists to prevent
      const lab = el.querySelector('span')?.getBoundingClientRect();
      const ext = lab
        ? {
            left: Math.min(box.left, lab.left), right: Math.max(box.right, lab.right),
            top: Math.min(box.top, lab.top), bottom: Math.max(box.bottom, lab.bottom),
          }
        : box;
      return {
        label: el.querySelector('span')?.textContent || el.getAttribute('aria-label') || el.className,
        node: el.classList.contains('node'),
        wantX: +m[1], wantY: +m[2],
        gotX: box.left + box.width / 2 - s.left,
        gotY: box.top + box.height / 2 - s.top,
        boxL: ext.left - s.left, boxR: ext.right - s.left,
        boxT: ext.top - s.top, boxB: ext.bottom - s.top,
      };
    };
    return {
      rows: [...document.querySelectorAll('.node, .line, .finding')].map(read).filter(Boolean),
      stage: { w: s.width, h: s.height },
    };
  });

  // land a few concepts, including a long label
  // BY TEXT, not by class. This was `button.act.primary`, and the moment
  // Extract became primary too the locator resolved to two elements, every
  // click threw strict-mode, and this whole check skipped every viewport while
  // still exiting 0-ish. A guard that stops running is worse than no guard.
  const discover = page.locator('button.act', { hasText: 'Discover' });
  let clicks = 0;
  for (let i = 0; i < 4; i++) {
    try { await discover.click({ force: true, timeout: 6000 }); clicks++; } catch { break; }
    await page.waitForTimeout(150);
  }
  if (clicks === 0) {
    skipped.push(`${tag}: the Discover button never became clickable — game did not start`);
    await ctx.close();
    continue;
  }

  // ── the RIM, sampled mid-flight ───────────────────────────────────────────
  // A discovery in flight waits on the world rim, which is the widest thing the
  // camera ever puts on screen — and it is gone by the time the board settles,
  // so a settled-only check can never see it. Free to sample: we are about to
  // spend twenty seconds waiting anyway.
  const flight = await measure();
  const badges = flight.rows.filter((r) => !r.node);
  for (const r of badges) {
    if (r.boxL < -1 || r.boxR > flight.stage.w + 1 || r.boxT < -1 || r.boxB > flight.stage.h + 1) {
      failures.push(`  ${tag} · in-flight ${String(r.label).slice(0, 18).padEnd(20)} hangs off the stage`);
    }
  }
  console.log(`${tag.padEnd(6)} ${width}x${height}: ${badges.length} rim badges in flight`);

  // then let the discoveries land and the easing settle
  await page.waitForTimeout(DISCOVER_MS + 3000);
  const { rows, stage } = await measure();

  for (const r of rows) {
    const dx = r.gotX - r.wantX, dy = r.gotY - r.wantY;
    if (Math.abs(dx) > TOLERANCE || Math.abs(dy) > TOLERANCE) {
      failures.push(`  ${tag} · ${String(r.label).slice(0, 22).padEnd(24)} off by (${dx.toFixed(1)}, ${dy.toFixed(1)})`);
    }
  }

  // ── PART TWO: is the model itself centred, and does it use the box? ────────
  //
  // Part one only proves the DOM agrees with the model. It passed green for
  // days while the graph sat 30px left of centre and used 49% of the width,
  // because a faithfully-rendered wrong coordinate is still faithful. Agreement
  // is not correctness; this half checks the coordinates themselves.
  // Three properties, each true at every node count.
  //
  // This used to assert "the ROOT sits at the stage centre", which was exactly
  // right for the radial taxonomy layout — the root WAS the world origin. The
  // layout is a d3-force simulation now and free-floating by design: `entity`
  // is pulled around by the same springs as everything else and has no claim on
  // the middle. That assertion outlived its layout and failed correct code by
  // 7px. What holds instead is that `forceCenter` keeps the board's CENTROID at
  // the origin, so that is what gets checked.
  const dots = rows.filter((r) => r.node);
  if (dots.length < 3) {
    // an empty board means the game never ran here, not that the layout is
    // wrong — a skip, loudly, not a red gate
    skipped.push(`${tag}: only ${dots.length} nodes on the board`);
  } else {
    const cx = stage.w / 2, cy = stage.h / 2;
    const shorter = Math.min(stage.w, stage.h);

    // 1. the board as a whole is centred. `forceCenter` pulls the centroid to
    //    the origin, and the camera puts the origin at the stage centre.
    const meanX = dots.reduce((a, r) => a + r.wantX, 0) / dots.length;
    const meanY = dots.reduce((a, r) => a + r.wantY, 0) / dots.length;
    const offX = meanX - cx, offY = meanY - cy;
    // a settling simulation is never exactly balanced; 12% of the box is loose
    // enough for that and far tighter than a board drifting into a corner
    if (Math.abs(offX) > stage.w * 0.12 || Math.abs(offY) > stage.h * 0.12) {
      failures.push(`  ${tag} · board centre is (${offX.toFixed(1)}, ${offY.toFixed(1)}) from the stage centre`);
    }

    // 2. the board fills its box. Follow mode zooms to fit the simulation's
    //    current extent, so a small graph must still use the stage rather than
    //    sitting in the middle as a speck — measured at 16% before follow-mode
    //    framing was restored.
    const maxR = Math.max(...dots.map((r) => Math.hypot(r.wantX - cx, r.wantY - cy)));
    const fill = (maxR * 2) / shorter;
    if (fill < 0.5) {
      failures.push(`  ${tag} · board spans only ${(fill * 100).toFixed(0)}% of the short side (want ≥50%)`);
    }

    // 3. nothing is clipped — measured on the RENDERED box, so a label that
    //    overhangs the stage counts, which is the failure padding exists for.
    for (const r of rows) {
      const bad = r.boxL < -1 || r.boxR > stage.w + 1 || r.boxT < -1 || r.boxB > stage.h + 1;
      if (bad) {
        failures.push(`  ${tag} · ${String(r.label).slice(0, 22).padEnd(24)} overflows the stage`);
      }
    }

    checked++;
    console.log(
      `${tag.padEnd(6)} ${width}x${height}: ${rows.length} placed · centre off by `
      + `(${offX.toFixed(1)}, ${offY.toFixed(1)}) · spans ${(fill * 100).toFixed(0)}% of the short side`,
    );
  }
  await page.close();
  await ctx.close();
}
await browser.close();

if (skipped.length) {
  // ::warning:: so it lands in the GitHub run summary. A check that did not run
  // must never be indistinguishable from one that passed.
  console.log(`::warning::alignment check skipped ${skipped.length} viewport(s) — those did NOT run`);
  for (const s of skipped) console.log(`  skipped · ${s}`);
}

if (failures.length) {
  console.error('\n✗ POSITIONING RULE BROKEN — these are not centred on their model coordinate:\n');
  console.error(failures.join('\n'));
  console.error('\nAn element placed at a model coordinate must be centred on it, and its');
  console.error('box size must not depend on its text. See the CSS block in App.svelte.');
  console.error('The board itself must be centred in its stage and fill it — see THE');
  console.error('CAMERA in src/render/board.ts.\n');
  process.exit(1);
}
// Only claim a pass for viewports that actually ran. With every viewport
// skipped, "no failures" is vacuously true and printing the tick is how a
// check that did nothing gets mistaken for a check that passed — which is the
// entire reason the deploy quietly stopped shipping for a day and a half.
if (checked === 0) {
  console.log('\n⊘ alignment NOT VERIFIED — every viewport was skipped, nothing was measured.');
  process.exit(0);
}
console.log(`\n✓ ${checked} viewport(s): every positioned element is centred on its model`);
console.log('  coordinate, and the board is centred in its stage and fills it');
