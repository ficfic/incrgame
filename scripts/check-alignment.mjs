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
import { existsSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

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

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] });
const failures = [];

// 'real' is the one that matters: an iPhone 14/15 in Edge, with the browser's
// own chrome already subtracted. The other two are the extremes either side.
for (const [tag, width, height] of [['phone', 440, 956], ['real', 390, 664], ['small', 320, 568]]) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/incrgame/`, { waitUntil: 'domcontentloaded' });
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
  const discover = page.locator('button.act.primary');
  for (let i = 0; i < 4; i++) { await discover.click({ force: true }); await page.waitForTimeout(150); }

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

  // then let the easing settle
  await page.waitForTimeout(21000);
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
  // Three properties, each true at EVERY node count — which rules out the
  // tempting-but-wrong test of "is the node cloud's bounding box centred".
  // It is not, and should not be: five points of a golden-angle spiral have
  // not reached their own extremes yet, so their box is lopsided by ~30px
  // while every one of them is exactly where the camera put it. Asserting
  // that would have failed a correct board and sent the next session tuning
  // offsets into a system that had none. What the camera actually promises is
  // below: origin at centre, rim on screen, nothing clipped.
  const dots = rows.filter((r) => r.node);
  const root = dots.find((r) => String(r.label).trim() === 'entity') ?? dots[0];
  if (dots.length < 3 || !root) {
    failures.push(`  ${tag} · only ${dots.length} nodes on the board — nothing to check`);
  } else {
    const cx = stage.w / 2, cy = stage.h / 2;
    const shorter = Math.min(stage.w, stage.h);

    // 1. the world origin is the stage centre. The root concept lives there,
    //    so this is checkable without importing the camera.
    const offX = root.wantX - cx, offY = root.wantY - cy;
    if (Math.abs(offX) > TOLERANCE || Math.abs(offY) > TOLERANCE) {
      failures.push(`  ${tag} · root sits (${offX.toFixed(1)}, ${offY.toFixed(1)}) from the stage centre`);
    }

    // 2. the world rim is on screen and worth looking at. The spiral always
    //    puts its last node at world radius 1, so the widest node distance is
    //    the camera's scale — if the board only nibbles at its box, the camera
    //    is being bypassed by something computing its own pixels again.
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

    console.log(
      `${tag.padEnd(6)} ${width}x${height}: ${rows.length} placed · root off by `
      + `(${offX.toFixed(1)}, ${offY.toFixed(1)}) · spans ${(fill * 100).toFixed(0)}% of the short side`,
    );
  }
  await page.close();
  await ctx.close();
}
await browser.close();

if (failures.length) {
  console.error('\n✗ POSITIONING RULE BROKEN — these are not centred on their model coordinate:\n');
  console.error(failures.join('\n'));
  console.error('\nAn element placed at a model coordinate must be centred on it, and its');
  console.error('box size must not depend on its text. See the CSS block in App.svelte.');
  console.error('The board itself must be centred in its stage and fill it — see THE');
  console.error('CAMERA in src/render/board.ts.\n');
  process.exit(1);
}
console.log('\n✓ every positioned element is centred on its model coordinate,');
console.log('  and the board is centred in its stage and fills it');
