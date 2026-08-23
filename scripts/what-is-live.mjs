// ★★★ WHAT THIS GAME ACTUALLY RUNS — 2026-08-23.
//
// ⚠️ TWELVE FILES OUT OF EIGHTY. The rest is three games that were deleted at
// three different pivots and never taken off the disk: the knowledge-recovery
// ontology game, the valley, the town. Every grep crosses them, every review
// agent reads them, and several of their comments cite scripts that no longer
// exist — this repo has been telling itself about `check-vocabulary.mjs` and a
// story graph for a week after both were deleted.
//
// This is not a lint. It prints the reachable set from `src/main.ts` and the
// size of what is not, so the decision — delete, or banner — is made against a
// number instead of a feeling. `npm run live`.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const seen = new Set();
const walk = (f) => {
  if (seen.has(f) || !existsSync(f)) return;
  seen.add(f);
  for (const m of readFileSync(f, 'utf8').matchAll(/from\s+'(\.[^']+)'|import\s+'(\.[^']+)'/g)) {
    const base = resolve(dirname(f), m[1] ?? m[2]);
    for (const ext of ['', '.ts', '.svelte', '/index.ts', '.js']) {
      if (existsSync(base + ext) && statSync(base + ext).isFile()) { walk(base + ext); break; }
    }
  }
};
walk(resolve('src/main.ts'));

const all = [];
const sweep = (d) => {
  for (const e of readdirSync(d)) {
    const f = join(d, e);
    if (statSync(f).isDirectory()) sweep(f);
    else if (/\.(ts|svelte)$/.test(e)) all.push(resolve(f));
  }
};
sweep('src');

const rel = (f) => f.replace(resolve('.') + '/', '');
const live = [...seen].filter((f) => /\.(ts|svelte)$/.test(f)).map(rel).sort();
const dead = all.map(rel).filter((f) => !live.includes(f)).sort();
const lines = (f) => readFileSync(f, 'utf8').split('\n').length;
const bulk = (fs) => fs.reduce((n, f) => n + lines(f), 0);

console.log(`\n★ LIVE — reachable from src/main.ts (${live.length} files, ${bulk(live)} lines)\n`);
for (const f of live) console.log(`   ${f}`);

const byDir = new Map();
for (const f of dead) {
  const d = dirname(f);
  byDir.set(d, [...(byDir.get(d) ?? []), f]);
}
console.log(`\n⚠️ NOT REACHABLE (${dead.length} files, ${bulk(dead)} lines)\n`);
for (const [d, fs] of [...byDir].sort((a, b) => bulk(b[1]) - bulk(a[1]))) {
  console.log(`   ${d.padEnd(16)} ${String(fs.length).padStart(3)} files  ${String(bulk(fs)).padStart(6)} lines`);
}
console.log(`\n   ${Math.round(100 * bulk(dead) / (bulk(live) + bulk(dead)))}% of src/ is not reachable from the entry point.\n`);
