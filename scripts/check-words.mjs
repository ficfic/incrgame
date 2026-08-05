// ONE WORD PER THING, IN THE PLAYER'S LANGUAGE — the build gate.
//
// ⚠️ WHY THIS EXISTS, in the owner's words and more than once:
//
//   *"It says tap a dot. Prefer them to be called a node."*
//   *"I would prefer it to be called an edge."*
//   *"pace is absolutely stupid resource, why are we still using it? i asked to
//    remove it multiple times"*
//
// They had asked repeatedly and the words were still there, because nothing but
// somebody's memory was stopping them. `scripts/check-vocabulary.mjs` polices
// the RETIRED slice and has no opinion about the game that ships. This does.
//
// It reads only what a PLAYER can read out of the files that put words on the
// screen — not comments, not identifiers — so `edgeKey`, `waysFrom` and a
// comment explaining why a dot is drawn small are all fine.
//
// ⚠️ AND IT READS SVELTE MARKUP, WHICH THE FIRST VERSION DID NOT. That version
// pulled string literals only. `<p class="note">Tap a dot.</p>` is not a string
// literal — it is a text node — so the single worst offender in the whole game,
// the line the owner quoted at us, sailed straight through. The sabotage that
// put "Tap a dot." back left the check GREEN. Rule 4 caught it before it
// shipped; without it this file would have been a green tick over the exact
// word it was written to ban.
import { readFileSync } from 'node:fs';

/** The files that put words in front of a player. */
const SURFACES = [
  'src/game/world.ts',      // node names and bodies, deed labels and notes
  'src/game/engine.ts',     // every refusal reason
  'src/game/notions.ts',    // the Thoughts tab
  'src/game/foes.ts',       // what holds a place
  'src/ui/Game.svelte',     // header, panel, buttons
  'src/game/events.ts',     // every happening a player reads
];

/** banned word → what to say instead.
 *
 *  ⚠️ THIS LIST HAS TURNED OVER TWICE IN ONE DAY, which is the reason the file
 *  exists rather than a reason to doubt it. dot → node → stop, and
 *  connection → edge → road. The owner, 2026-08-02:
 *
 *    "we are going to call the roads and stops, no edges and nodes anymore"
 *
 *  So the words this check banned YESTERDAY are banned again today, and the
 *  words it enforced yesterday are now the thing being banned. Anything that
 *  once reached the player has to stay on the list — the whole failure mode is
 *  an old word surviving in a string nobody re-read. */
const INSTEAD = {
  dot: 'stop', dots: 'stops',
  node: 'stop', nodes: 'stops',
  edge: 'road', edges: 'roads',
  pace: 'a real resource', paces: 'a real resource',
  // ★ THE THIRD TURN OF THE WHEEL, 2026-08-04. The owner: "i don't like the
  // pipe wording… we are building mana flows." Yesterday's enforced word is
  // today's banned one, exactly as this file's header predicts.
  pipe: 'flow', pipes: 'flows',
};

/** ⚠️ "way" IS NOT BANNED OUTRIGHT: it is ordinary English and the game will
 *  want it. What is banned is `way`/`ways` standing in for the thing between two
 *  stops — that is a PIPE. */
/** ★ AND NEITHER IS "road", FOR THE SAME REASON AND A SHARPER ONE: the game is
 *  called King's Roads, the king's road is a real thing in the fiction, and the
 *  crew lays roads and paths when the ground needs them. What is banned is
 *  `road` standing in for THE THING YOU LAY. The owner, 2026-08-02:
 *
 *    "well like we also do roads or paths when needed, but we lay pipes"
 *
 *  So: "the king's road" passes, "Lay the road to Stop 4" does not. */
const LOOSE_ROAD = /(?<!king's\s)(?<!kings\s)\broads?\b/i;

const LOOSE_WAY =
  /\b(?:a|the|every|each|this|that|no|two)\s+ways?\b(?=\s*(?:to|from|is|are|was|out|here|you|,|\.|$))/i;

/** Pull every string literal — '…', "…" and `…` — out of a source file, with
 *  its line number. Comments are skipped, so a note explaining the rule does
 *  not trip the rule.
 *
 *  ⚠️ NOT A PARSER, and it does not need to be: it walks the file once tracking
 *  whether it is inside a comment, a string, or neither. A regex over the raw
 *  text would match the word `dot` inside `// the dot you are standing on`,
 *  which is exactly the false positive that made an older check in this repo
 *  useless.
 *
 *  ⚠️ AND `${…}` IS STRIPPED, because it is code. The first run of this flagged
 *  `` `${cost} stone — you have ${g.paces}` `` for saying "paces" — that is the
 *  FIELD's name and the player sees a number. A check that fails on the thing
 *  it is trying to protect gets switched off, so it reads what is rendered.
 *
 *  Likewise "way" only counts when it is the noun for the thing between two
 *  places. "the way a bolt stands in a hole" is English and stays. */
function strings(src) {
  const out = [];
  let i = 0, line = 1, mode = null, start = 0, buf = '';
  while (i < src.length) {
    const c = src[i], next = src[i + 1];
    if (c === '\n') line++;
    if (mode === null) {
      // ⚠️ HTML COMMENTS ARE SKIPPED, and an apostrophe is why. `the owner's
      // design` inside a Svelte markup comment flipped this scanner's quote
      // parity, and every real string after it was read shifted by one — the
      // gate then reported "dot" inside developer comments three lines that
      // said no such thing to a player.
      if (c === '<' && src.slice(i, i + 4) === '<!--') {
        const end = src.indexOf('-->', i + 4);
        const skipped = src.slice(i, end === -1 ? src.length : end + 3);
        line += (skipped.match(/\n/g) ?? []).length;
        i = end === -1 ? src.length : end + 3;
        continue;
      }
      if (c === '/' && next === '/') { mode = 'line'; i += 2; continue; }
      if (c === '/' && next === '*') { mode = 'block'; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') { mode = c; start = line; buf = ''; i++; continue; }
      i++; continue;
    }
    if (mode === 'line') { if (c === '\n') mode = null; i++; continue; }
    if (mode === 'block') { if (c === '*' && next === '/') { mode = null; i += 2; continue; } i++; continue; }
    // inside a string
    if (c === '\\') { buf += src[i + 1] ?? ''; i += 2; continue; }
    if (c === mode) { out.push({ line: start, text: buf }); mode = null; i++; continue; }
    buf += c; i++;
  }
  return out;
}

/** The text a player reads out of Svelte MARKUP: text nodes, with tags,
 *  comments, `<script>`, `<style>` and `{…}` expressions removed. The literals
 *  inside those expressions are picked up separately by `strings()`. */
function markup(src) {
  const out = [];
  const body = src
    .replace(/<script[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<style[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/<[^>]*>/g, ' ');
  body.split('\n').forEach((t, i) => {
    if (t.trim()) out.push({ line: i + 1, text: t.trim() });
  });
  return out;
}

const bad = [];
for (const file of SURFACES) {
  let src;
  try { src = readFileSync(file, 'utf8'); } catch { continue; }
  const read = file.endsWith('.svelte')
    ? [...strings(src), ...markup(src)]
    : strings(src);
  for (const { line, text } of read) {
    // Ignore anything that is plainly not prose: ids, keys, css, classes.
    // `${…}` is code, not a word the player reads.
    const said = text.replace(/\$\{[^}]*\}/g, ' ');
    if (!/[a-z]\s+[a-z]/i.test(said)) continue;
    for (const [word, use] of Object.entries(INSTEAD)) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(said)) {
        bad.push(`${file}:${line}  says "${word}" — the player's word is "${use}"\n      ${text.trim().slice(0, 90)}`);
      }
    }
    if (LOOSE_WAY.test(said)) {
      bad.push(`${file}:${line}  says "way" for the thing between two stops — that is a pipe\n      ${text.trim().slice(0, 90)}`);
    }
    if (LOOSE_ROAD.test(said)) {
      bad.push(`${file}:${line}  says "road" for the thing you lay — that is a pipe\n      ${text.trim().slice(0, 90)}`);
    }
  }
}

if (bad.length) {
  console.error(`✗ ${bad.length} player-facing string(s) use a word the owner has asked us to drop:\n`);
  for (const b of bad) console.error('  ' + b + '\n');
  process.exit(1);
}
console.log(`✓ no banned word reaches the player across ${SURFACES.length} surfaces`);
