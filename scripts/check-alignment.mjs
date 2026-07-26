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
import { chromium } from 'playwright-core';

const PORT = process.argv[2] ?? '4321';
const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const TOLERANCE = 1.5; // css px; sub-pixel rounding only

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox'] });
const failures = [];

for (const [tag, width, height] of [['phone', 440, 956], ['small', 320, 568]]) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/incrgame/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);

  // land a few concepts, including a long label, then let the easing settle
  const discover = page.locator('button.act.primary');
  for (let i = 0; i < 4; i++) { await discover.click({ force: true }); await page.waitForTimeout(150); }
  await page.waitForTimeout(21000);

  const rows = await page.evaluate(() => {
    const stage = document.querySelector('.stage').getBoundingClientRect();
    const read = (el) => {
      const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform);
      if (!m) return null;
      const box = el.getBoundingClientRect();
      return {
        label: el.querySelector('span')?.textContent || el.getAttribute('aria-label') || el.className,
        wantX: +m[1], wantY: +m[2],
        gotX: box.left + box.width / 2 - stage.left,
        gotY: box.top + box.height / 2 - stage.top,
      };
    };
    return [...document.querySelectorAll('.node, .line, .finding')].map(read).filter(Boolean);
  });

  for (const r of rows) {
    const dx = r.gotX - r.wantX, dy = r.gotY - r.wantY;
    if (Math.abs(dx) > TOLERANCE || Math.abs(dy) > TOLERANCE) {
      failures.push(`  ${tag} · ${String(r.label).slice(0, 22).padEnd(24)} off by (${dx.toFixed(1)}, ${dy.toFixed(1)})`);
    }
  }
  console.log(`${tag.padEnd(6)} ${width}x${height}: checked ${rows.length} positioned elements`);
  await page.close();
  await ctx.close();
}
await browser.close();

if (failures.length) {
  console.error('\n✗ POSITIONING RULE BROKEN — these are not centred on their model coordinate:\n');
  console.error(failures.join('\n'));
  console.error('\nAn element placed at a model coordinate must be centred on it, and its');
  console.error('box size must not depend on its text. See the CSS block in App.svelte.\n');
  process.exit(1);
}
console.log('\n✓ every positioned element is centred on its model coordinate');
