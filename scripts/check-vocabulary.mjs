// Player-facing vocabulary check.
//
// The bug this exists to prevent, stated once so it does not need re-deriving:
// the dock said "graph: 25 nodes" while the HUD said "3 recovered", at the same
// moment, both correct, because each surface reached into raw state and picked
// its own word for its own quantity. Nobody wrote a bug — there was simply no
// place where "what the player calls this" was decided.
//
// `src/core/readouts.ts` is now that place. This check keeps surfaces pointed
// at it.
//
// RULE: no player-facing surface may read `state.graph` / `$game.graph`.
// `state.graph` is a derived cache left from the deleted Datums economy:
// `.nodes` counts placed concepts INCLUDING dark ones, and `.edges` is the
// statement balance rather than lines on the board. Both are legitimate
// internals and both are traps to display.
//
// Cosmetic use is allowed and must say so with an inline `vocab-ok` marker, so
// an exemption is a visible decision rather than a silent one.
// ---- PROVEN RED, 2026-07-27 -----------------------------------------------
//
//   SABOTAGE   in src/ui/App.svelte, point the `recovered` HUD cell back at the
//              legacy cache — i.e. re-create the original 25-vs-3 bug:
//                <b class="good">{$game.graph.nodes}</b><span>recovered</span>
//   OBSERVED   exit 1
//                ✗ src/ui/App.svelte:632  $game.graph.nodes — reads the legacy
//                  `graph` cache; use READOUTS in src/core/readouts.ts
//                ✗ 1 vocabulary violation(s) across 6 surface files.
//
// The line number lands on the real offending line, which is the evidence that
// the comment/string stripper is not shifting the file out from under the
// reporter — a failure mode this script has had.
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

/** Files that render or narrate to the player. */
const SURFACES = ['src/ui/**/*.svelte', 'src/shell/**/*.ts'];

const FORBIDDEN = [
  {
    re: /(?:state|next|prev|\$game|s)\.graph\.(nodes|edges)/g,
    why: 'reads the legacy `graph` cache; use READOUTS in src/core/readouts.ts',
  },
];

/** Strip comments and string literals so a rule cannot fire on prose ABOUT the
 *  rule. This exact mistake killed the deploy for a day: a core-purity grep
 *  matched the word "window" inside a comment explaining why there was no
 *  window. */
function strip(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

let failures = 0;
let scanned = 0;

for (const pattern of SURFACES) {
  for (const file of globSync(pattern)) {
    scanned++;
    const raw = readFileSync(file, 'utf8');
    const code = strip(raw);
    const rawLines = raw.split('\n');

    for (const { re, why } of FORBIDDEN) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(code)) !== null) {
        const line = code.slice(0, m.index).split('\n').length;
        // An exemption must be declared on the offending line itself.
        if ((rawLines[line - 1] ?? '').includes('vocab-ok')) continue;
        console.error(`✗ ${file}:${line}  ${m[0]} — ${why}`);
        failures++;
      }
    }
  }
}

if (scanned === 0) {
  console.error('✗ vocabulary check matched NO files — the globs are wrong, and');
  console.error('  a check that inspects nothing passes forever. Failing loudly.');
  process.exit(1);
}

if (failures > 0) {
  console.error(`\n✗ ${failures} vocabulary violation(s) across ${scanned} surface files.`);
  process.exit(1);
}

console.log(`✓ player-facing vocabulary is single-sourced across ${scanned} surface files`);
