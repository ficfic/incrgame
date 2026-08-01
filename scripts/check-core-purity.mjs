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
// ---- PROVEN RED, 2026-07-27 -----------------------------------------------
//
// Rule 4: a check nobody has broken on purpose is assumed vacuous, and this one
// HAS been vacuous — it once matched the word "window" inside a comment
// explaining why there was no window.
//
//   SABOTAGE   add to `attentionPenalty` in src/core/engine.ts:
//                if (typeof window !== 'undefined') return 0;
//   OBSERVED   exit 1
//                ✗ src/core is not pure — the engine must stay headless...
//                  src/core/engine.ts:267 touches `window`
//
// Note what the output proves beyond the failure: the offending line is printed
// with its string literal blanked, which is the comment/string stripping doing
// its job on real code rather than on a fixture.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// ⚠️ `src/game` IS THE LIVE ENGINE AND WAS NOT GUARDED AT ALL. This script has
// been protecting `src/core` — the RETIRED slice — while the engine the game
// actually runs on had nothing stopping it from reaching for the DOM or
// importing the UI. Everything that makes the engine testable in a terminal
// (543 headless tests, a deterministic layout, a reducer with no clock) rests
// on a property nothing was checking.
//
// ★ ONE FILE IS EXEMPT, NARROWLY, AND THE EXEMPTION IS WRITTEN DOWN.
// `src/game/store.ts` IS the save boundary: talking to `src/shell/storage` and
// stamping `Date.now()` on a save are its entire job, and there is nowhere else
// for either to live. It is exempt from those two rules and NOTHING else — it
// still may not touch `window`, `document`, `fetch` or `Math.random`.
//
// Written as a list of reasons rather than a blanket skip, so the day someone
// reaches for `window` in there it still goes red. A blanket exemption is how a
// guard quietly stops guarding.
const DIRS = ['src/core', 'src/game'];
const EXEMPT = {
  'src/game/store.ts': ['reads the clock', 'imports'],
};

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
for (const DIR of DIRS) {
  for (const f of readdirSync(DIR).filter((n) => n.endsWith('.ts'))) {
    const rel = `${DIR}/${f}`;
    const src = readFileSync(join(DIR, f), 'utf8');
    const code = stripNonCode(src, true).split('\n');
    const paths = stripNonCode(src, false).split('\n');
    scanned++;
    const flag = (n, why, line) => failures.push(
      `  ${rel}:${n + 1} ${why}\n      ${line.trim().slice(0, 90)}`,
    );
    const allowed = EXEMPT[rel] ?? [];
    const ok = (why) => allowed.some((a) => why.startsWith(a));
    code.forEach((line, n) => {
      for (const [re, why] of CODE_RULES) if (re.test(line) && !ok(why)) flag(n, why, line);
    });
    paths.forEach((line, n) => {
      for (const m of line.matchAll(SPECIFIER)) {
        const spec = m[1];
        const why = `imports \`${spec}\` — ui/render/shell are off limits`;
        if (FORBIDDEN_LAYER.test(spec) && !ok(why)) flag(n, why, line);
      }
    });
  }
}

if (failures.length) {
  console.error(`\n✗ the engine is not pure — it must stay headless and deterministic:\n`);
  console.error(failures.join('\n'));
  console.error('\nThe shell looks facts up and passes them in.\n');
  process.exit(1);
}
console.log(`✓ ${DIRS.join(' and ')} are pure across ${scanned} files (comments and strings excluded)`);
