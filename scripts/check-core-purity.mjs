// `src/core/` must stay a headless, deterministic reducer (ARCHITECTURE item 1):
// no DOM, no network, no imports from ui/render/shell.
//
// This used to be one `grep -rnE '\bwindow\b|...'` inline in the deploy
// workflow, and it did its job right up until someone wrote the WORD "window"
// in a comment:
//
//     // exploit v11 exists to close, relocated one window along.
//
// The step went red, the build and deploy steps were skipped, and the site
// silently stopped updating for a day and a half while every push reported
// "pushed". A gate that fails on prose is not a gate on the engine — it is a
// gate on vocabulary, and the failure mode is invisible because a skipped
// deploy looks exactly like a deploy from the outside.
//
// So: strip comments and string literals, THEN look. Same rule, applied to
// code. Run `node scripts/check-core-purity.mjs`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/core';

/** Blank out comments and — when `strings` is true — string/template literals,
 *  preserving newlines so reported line numbers stay true. A tiny scanner
 *  rather than a regex, because a regex cannot tell `'//'` from a comment.
 *
 *  Both modes are needed, and finding that out is the reason this file has a
 *  red-path test. The identifier rules must NOT see strings, or the word
 *  "window" in a message trips them. The import rule must ONLY see strings,
 *  because the module path IS a string — with strings blanked, an actual
 *  `import { paint } from '../render/paint'` sailed through green. */
function stripNonCode(src, strings = true) {
  let out = '';
  let i = 0;
  const keep = (s) => { out += s.replace(/[^\n]/g, ' '); };
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') {
      const end = src.indexOf('\n', i); const stop = end < 0 ? src.length : end;
      keep(src.slice(i, stop)); i = stop;
    } else if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2); const stop = end < 0 ? src.length : end + 2;
      keep(src.slice(i, stop)); i = stop;
    } else if (strings && (c === '"' || c === "'" || c === '`')) {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      keep(src.slice(i, Math.min(j + 1, src.length))); i = j + 1;
    } else { out += c; i++; }
  }
  return out;
}

/** Rules read against code with strings blanked out. */
const CODE_RULES = [
  [/\bwindow\b/, 'touches `window`'],
  [/\bdocument\b/, 'touches `document`'],
  [/\bfetch\b/, 'touches `fetch`'],
  [/\blocalStorage\b|\bindexedDB\b/, 'touches browser storage'],
  [/\bMath\s*\.\s*random\b/, 'uses Math.random (the RNG seed is threaded — see rng.ts)'],
  [/\bDate\s*\.\s*now\b/, 'reads the clock (`now` is a parameter)'],
];

// Imports are checked by pulling the module SPECIFIER out and testing the path
// itself, rather than by one regex over the whole line. The one-regex version
// anchored on `../ui/` and so waved `../../src/ui/App` straight through — the
// forbidden layer is the layer whatever the number of dots in front of it.
const SPECIFIER = /(?:\bfrom|\bimport|\brequire)\s*\(?\s*['"]([^'"]+)['"]/g;
const FORBIDDEN_LAYER = /(?:^|\/)(ui|render|shell)\//;

const failures = [];
let scanned = 0;
for (const f of readdirSync(DIR).filter((n) => n.endsWith('.ts'))) {
  const src = readFileSync(join(DIR, f), 'utf8');
  const code = stripNonCode(src, true).split('\n');
  const paths = stripNonCode(src, false).split('\n');
  scanned++;
  const flag = (n, why, line) => failures.push(
    `  ${DIR}/${f}:${n + 1} ${why}\n      ${line.trim().slice(0, 90)}`,
  );
  code.forEach((line, n) => {
    for (const [re, why] of CODE_RULES) if (re.test(line)) flag(n, why, line);
  });
  paths.forEach((line, n) => {
    for (const m of line.matchAll(SPECIFIER)) {
      const spec = m[1];
      if (FORBIDDEN_LAYER.test(spec)) flag(n, `imports \`${spec}\` — ui/render/shell are off limits`, line);
    }
  });
}

if (failures.length) {
  console.error(`\n✗ src/core is not pure — the engine must stay headless and deterministic:\n`);
  console.error(failures.join('\n'));
  console.error('\nSee ARCHITECTURE item 1. The shell looks facts up and passes them in.\n');
  process.exit(1);
}
console.log(`✓ src/core is pure across ${scanned} files (comments and strings excluded)`);
