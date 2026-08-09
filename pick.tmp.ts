import { INK, COUNTED, TOL, type InkName } from './src/game/ink';
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const apart = (a: string, b: string) => {
  const A = rgb(a), B = rgb(b);
  return Math.max(...A.map((v, i) => Math.abs(v - B[i]!)));
};
// Candidates for a WARD boundary: it must read as a made thing, not terrain.
const cands: Record<string, string> = {
  ward_violet: '#6b4a9e', ward_plum: '#7a3f6b', ward_indigo: '#3f3f8f',
  ward_rose: '#a8496b', ward_gold: '#9a7b1f', ward_slate: '#5a6b8c',
  ward_moss: '#4f6b2f', ward_rust: '#8c4a2f',
};
for (const [name, hex] of Object.entries(cands)) {
  let worst = 999, who = '';
  for (const c of COUNTED) {
    const d = apart(hex, INK[c]);
    if (d < worst) { worst = d; who = c; }
  }
  const need = 12;  // the tolerance we'd give it
  console.log(name.padEnd(12), hex, 'nearest', who.padEnd(10), worst,
    worst > need ? '  ok' : '  ✗ TOO CLOSE');
}
void TOL; void (0 as unknown as InkName);
