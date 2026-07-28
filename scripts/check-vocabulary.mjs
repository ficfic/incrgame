// ONE WORD, ONE QUANTITY — the build gate.
//
// ---- The bug this exists to prevent, stated once ---------------------------
//
// The dock said "graph: 25 nodes" while the HUD said "3 recovered", at the same
// moment, both correct, because each surface reached into raw state and picked
// its own word for its own quantity. Nobody wrote a bug — there was simply no
// place where "what the player calls this" was decided.
//
// `src/core/readouts.ts` is now that place. This check keeps surfaces on it.
//
// ---- What this policed until today, and why it was VACUOUS ----------------
//
// Until 2026-07-28 the whole rule was one regex forbidding `state.graph.*`. The
// SOLID·RAW·ROT rewrite DELETED `state.graph` outright, so the rule matched
// nothing that could ever exist again and the check passed by having no
// subject. A green tick, policing a field that had been removed.
//
// Meanwhile the 11-agent review (`docs/ECONOMY_SRR.md`) found the defect it was
// nominally there to catch, still sitting in the tree: **the HUD never calls
// `readouts.ts` at all.** The only `READOUTS.` reference in `src/ui` picks a CSS
// hue. So "one word, one quantity" READ as enforced and was not — and about a
// dozen player-facing nouns were declared nowhere.
//
// ---- THE RULE NOW ---------------------------------------------------------
//
// A surface may not reach into the save for a NUMBER and name it itself.
//
//   1. QUANTITY FIELDS ARE OFF LIMITS TO SURFACES. The field list is read out of
//      `interface GameState` in src/core/types.ts at run time — it is NOT copied
//      here. That is the fix for the vacuity above: when a field is deleted, the
//      rule re-points instead of quietly emptying, and a NEW save field is
//      forbidden by default until someone either declares a readout for it or
//      writes down here why it is structural.
//   2. NOT COUNTING IT BY HAND EITHER. `held.length` is Words; so is a direct
//      call to `words()`. Both are the 25-vs-3 bug with an extra step.
//   3. THE HUD MUST ACTUALLY CALL THE MODULE. Every readout declared in
//      readouts.ts has to be referenced from `src/ui`. Rule 1 alone only stops a
//      surface naming a number wrongly; it cannot notice a HUD that bypasses the
//      module by not being written yet, which is precisely the state the review
//      found the game in.
//
// A RATE IS NOT ONE OF THE FOUR QUANTITIES and is deliberately not policed
// here. `factsPerSecond`, `potentialPerSecond`, `vocabularySupport`, `stepCost`,
// `machineCost` all take the WHOLE state and return a number that the engine
// named. That is the sanctioned path: pass the state to something that knows
// what the number means. The ban is on reaching in for a FIELD.
//
// Cosmetic use is allowed and must say so with an inline `vocab-ok` marker, so
// an exemption is a visible decision rather than a silent one.
//
// `src/render/*` is NOT a surface here: it draws no word and no numeral. The
// stacked Solid/Raw/Rot ring in paint.ts reads the three fields to get three
// ANGLES; a proportion with no word on it cannot disagree with the HUD about
// what a word means. The moment anything in src/render prints text, it belongs
// in SURFACES.
//
// ---- PROVEN RED, 2026-07-28 (rule 4) ---------------------------------------
//
// Eleven sabotages. Every one applied, run, the output below COPIED FROM THE
// TERMINAL, then reverted. Sabotages 1-6 inject one line into
// src/shell/ticker.ts after the `bottleneck:machines` line, which lands at
// LINE 107 — so 107 in the output below is the injected line, every time. That
// equality is the evidence that the stripper is not shifting the file out from
// under the reporter, which is a failure mode this script has had.
//
// 1. THE NAMED DEFECT — a surface reading a quantity off the save, inside a
//    template interpolation (the construction every ticker line uses, and the
//    one an older stripper here was blind to).
//    SABOTAGE  say('away-return', `while away: ${next.solid}`);
//    OBSERVED  exit 1
//      ✗ src/shell/ticker.ts:107  next.solid — reads `solid` off the save. It is
//        a declared quantity: ask READOUTS.solid in src/core/readouts.ts, which
//        owns its word
//
// 2. A QUANTITY THAT IS DECLARED NOWHERE — the "dozen nouns" half. `generation`
//    is a real field of the save with no readout, so showing it invents a word.
//    SABOTAGE  say('gen', `generation ${next.generation}`);
//    OBSERVED  exit 1
//      ✗ src/shell/ticker.ts:107  next.generation — reads `generation` off the
//        save. NO readout declares it, so a surface showing it is inventing a
//        word: declare it in src/core/readouts.ts first
//
// 3. WORDS COUNTED BY HAND off the board.
//    SABOTAGE  say('w', `${next.held.length} words`);
//    OBSERVED  exit 1
//      ✗ src/shell/ticker.ts:107  next.held.length — counts Words by hand;
//        READOUTS.words in src/core/readouts.ts owns that number
//
// 4. THE ALIAS BYPASS — destructuring past the receiver-anchored rule.
//    SABOTAGE  const { solid, rot } = next; say('x', `${solid} ${rot}`);
//    OBSERVED  exit 1
//      ✗ src/shell/ticker.ts:107  solid — destructured off the save. Same rule:
//        READOUTS in src/core/readouts.ts owns the word for a quantity
//      ✗ src/shell/ticker.ts:107  rot — destructured off the save. Same rule: ...
//
// 5. THE ENGINE HELPER CALLED DIRECT instead of the readout that wraps it —
//    same number, second name, which is the 25-vs-3 bug's whole shape.
//    SABOTAGE  say('w', `${words(next)} words`);
//    OBSERVED  exit 1
//      ✗ src/shell/ticker.ts:107  words( — computes Words by hand; a surface
//        asks READOUTS.words in src/core/readouts.ts
//
// 6. FALSE-POSITIVE GUARD (the one that must stay SILENT). `s` is a receiver, so
//    without the lookbehind in RECEIVERS an OfflineResult on its way into the
//    ticker reads as a violation — and a gate that cries wolf gets a blanket
//    exemption within a week.
//    SABOTAGE  const results = next; say('x', `${results.solid} ${results.raw}`);
//    OBSERVED  no violation reported for ticker.ts. Correct.
//
// 7. THE HUD READING THE SAVE, BEHIND AN APOSTROPHE IN MARKUP PROSE. This is the
//    Svelte stripper's reason to exist, and it is load-bearing: the same
//    sabotage run with the old JS-only stripper was NOT SEEN AT ALL, because
//    the apostrophe in "WordNet's" opened a string that swallowed the rest of
//    the line — including the read.
//    SABOTAGE  src/ui/App.svelte, a HUD cell inserted at line 836:
//              <div><span>WordNet's</span><b>{$game.solid}</b><span>checked</span></div>
//    OBSERVED  exit 1
//      ✗ src/ui/App.svelte:836  $game.solid — reads `solid` off the save. It is
//        a declared quantity: ask READOUTS.solid in src/core/readouts.ts, which
//        owns its word
//
// 8. RULE 3, BOTH DIRECTIONS — and this is also the proof that the gate's
//    current red is SATISFIABLE rather than a wall (see BASELINE below).
//    GREEN     one line added to src/ui/App.svelte:
//              const cells = $derived([READOUTS.words, READOUTS.solid,
//                READOUTS.raw, READOUTS.rot].map((r) => r.count($game)));
//    OBSERVED  exit 0
//      ✓ player-facing vocabulary is single-sourced across 5 surface files
//        7 quantity fields off limits: solid, raw, rot, stepsThisRun,
//          generation, syntheticShare, minted
//        4 readouts declared and shown: words, solid, raw, rot
//    RED       the same line with READOUTS.solid removed
//    OBSERVED  exit 1
//      ✗ readout `solid` is declared in src/core/readouts.ts and referenced by
//        NO file in src/ui/.
//        A quantity the player cannot see is not single-sourced, it is unshipped.
//
// 9. THE ANTI-VACUITY SELF-CHECK — the exact way this check died last time.
//    SABOTAGE  renamed a STRUCTURAL key, `held` → `heldNodes`, i.e. simulated
//              what the rewrite did to `state.graph`.
//    OBSERVED  exit 1
//      ✗ STRUCTURAL lists `heldNodes`, which is not a field of GameState any
//        more.
//      ✗ This is how the last version of this check went vacuous: the field it
//      ✗ policed was deleted and the rule stayed green. Re-read
//      ✗ src/core/types.ts and fix this list.
//
// 10. THE GLOBS — a check that inspects nothing passes forever.
//    SABOTAGE  SURFACES = ['src/ui/**/*.jsx']
//    OBSERVED  exit 1
//      ✗ vocabulary check matched NO files — the globs are wrong, and
//      ✗ a check that inspects nothing passes forever. Failing loudly.
//
// 11. THE TWO PARSERS RETURNING NOTHING, which would empty both rules.
//    SABOTAGE  looked for `export interface GameStateXX`
//    OBSERVED  ✗ could not find `export interface GameState` in
//                src/core/types.ts.
//              ✗ This check derives its rule from that type; it will not guess.
//    SABOTAGE  made the READOUTS key parser return []
//    OBSERVED  ✗ parsed ZERO readouts out of src/core/readouts.ts.
//              ✗ Rule 3 would then be satisfied by an empty set. Failing loudly
//                instead.
//
// ---- WHAT THIS STILL CANNOT SEE, said plainly -----------------------------
//
// Sabotage 6 is also a hole: `const g = next; g.solid` aliases past a
// receiver-anchored rule and this check will not catch it. Destructuring — the
// form somebody actually writes — is covered; whole-object aliasing is not,
// because widening the receiver set to "anything" is what produced the false
// positive that sabotage 6 exists to prevent. Rule 3 is a smoke test for the
// same reason: it can see that the module is referenced, never that the number
// reached a pixel.
//
// ---- BASELINE, 2026-07-28: THIS CHECK IS RED, AND HONESTLY SO --------------
//
// Today it reports FOUR violations, all of them rule 3, all of them the defect
// `docs/ECONOMY_SRR.md` named: the HUD does not call readouts.ts.
//
// `src/ui/App.svelte` is the pre-rewrite HUD, scheduled for replacement in the
// UI phase of NEXT.md item 1, and it does not currently build (`vite build`
// fails on four of its imports) — so this gate blocks nothing that is not
// already blocked, and sabotage 8 shows one honest line of HUD code turns it
// green. Do not exempt the file. That is how the last three gates in this repo
// became decorative.
//
// Note that App.svelte reports NO rule-1 violations, and that is correct rather
// than a miss: it reads `$game.forged.edges`, `$game.resources.triples`,
// `$game.supervised` — fields the rewrite deleted. They are typecheck errors,
// not vocabulary errors. The rule is derived from the save that exists.
import { readFileSync, globSync } from 'node:fs';

/** Files that render or narrate to the player. */
const SURFACES = ['src/ui/**/*.svelte', 'src/shell/**/*.ts'];

/** Where a player-facing number is allowed to come from. */
const READOUTS_FILE = 'src/core/readouts.ts';
const TYPES_FILE = 'src/core/types.ts';

/** Save fields that are NOT quantities, each with the reason it is not.
 *
 *  Everything else in GameState is a quantity and is banned in a surface. The
 *  burden is deliberately this way round: adding a field to the save without
 *  thinking about its word breaks this check, rather than shipping a thirteenth
 *  noun nobody decided on. */
const STRUCTURAL = {
  version:  'the save FORMAT number. `save v16` in the build stamp is a fact about the file, not a quantity in the economy.',
  lastTick: 'the clock. A surface reads it instead of Date.now() so the render agrees with the sim.',
  held:     'the board itself — the renderer needs the concept ids. Its LENGTH is Words and is banned separately.',
  machines: 'owned counts. A machine card is content: its label and its price live in src/content/machines.ts.',
  watched:  "a toggle's position. Not a number.",
};

/** The receivers a surface holds the save under. `$game` is the Svelte store,
 *  `state`/`next`/`prev`/`s` are the shell's parameter names. Anchoring on the
 *  receiver is what keeps `result.solid` in game.ts — an OfflineResult on its
 *  way INTO the ticker, where READOUTS names it — from reading as a violation.
 *  The obvious way around a receiver rule is to destructure, so that is checked
 *  separately below. */
// ⚠️ The leading lookbehind is load-bearing. `s` is a receiver, so without it
// `results.solid` — an OfflineResult, correctly named by the ticker — reads as
// a violation, and a gate that cries wolf gets a blanket exemption within a
// week. `\$game` comes first so it wins over the bare `game` alternative.
const RECEIVERS = String.raw`(?<![\w$])(?:\$game|game|state|next|prev|snapshot|save|s)`;

// ---------------------------------------------------------------------------

const blank = (s) => s.replace(/[^\n]/g, ' ');

/** Blank out comments and string TEXT so a rule cannot fire on prose ABOUT the
 *  rule. That exact mistake killed the deploy for a day and a half: a
 *  core-purity grep matched the word "window" inside a comment explaining why
 *  there was no window.
 *
 *  ⚠️ `${...}` INSIDE A TEMPLATE LITERAL IS CODE, NOT TEXT, and an earlier
 *  version blanked it. Not a nitpick: every line the ticker emits is built as
 *  `` `while away: ${x}` ``, so the one file the check most needed to see into
 *  was the one file it could not.
 *
 *  LENGTH-PRESERVING. Removed characters become spaces and newlines are kept,
 *  so a reported line number is the offending line — another failure mode this
 *  script has had. */
function stripJs(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const two = src.slice(i, i + 2);
    if (two === '/*') {
      const j = src.indexOf('*/', i + 2);
      const end = j < 0 ? n : j + 2;
      out += blank(src.slice(i, end)); i = end; continue;
    }
    // not `https://` — a bare `//` after a colon is a URL, not a comment
    if (two === '//' && src[i - 1] !== ':') {
      const j = src.indexOf('\n', i);
      const end = j < 0 ? n : j;
      out += blank(src.slice(i, end)); i = end; continue;
    }
    const c = src[i];
    if (c === "'" || c === '"') {
      out += ' '; i++;
      while (i < n && src[i] !== c && src[i] !== '\n') {
        if (src[i] === '\\') { out += '  '; i += 2; continue; }
        out += ' '; i++;
      }
      if (i < n && src[i] === c) { out += ' '; i++; }
      continue;
    }
    if (c === '`') {
      out += ' '; i++;
      while (i < n) {
        if (src[i] === '\\') { out += '  '; i += 2; continue; }
        if (src[i] === '`') { out += ' '; i++; break; }
        if (src.slice(i, i + 2) === '${') {
          out += '  '; i += 2;
          let depth = 1;
          while (i < n && depth > 0) {
            const ch = src[i];
            if (ch === '{') depth++;
            else if (ch === '}') { depth--; if (depth === 0) { out += ' '; i++; break; } }
            out += ch; i++;              // interpolations are CODE: keep them
          }
          continue;
        }
        out += src[i] === '\n' ? '\n' : ' '; i++;
      }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** End index of the `}` that closes the Svelte expression opening at `open`,
 *  stepping over strings and template literals so a brace inside one does not
 *  end it early. Returns src.length if it never closes. */
function expressionEnd(src, open) {
  let i = open + 1;
  let depth = 1;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "'" || c === '"') {
      i++;
      while (i < n && src[i] !== c) { i += src[i] === '\\' ? 2 : 1; }
      i++; continue;
    }
    if (c === '`') {
      i++;
      while (i < n && src[i] !== '`') { i += src[i] === '\\' ? 2 : 1; }
      i++; continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
    i++;
  }
  return n;
}

/** Svelte needs its own pass. Run the JS stripper over a whole `.svelte` file
 *  and one apostrophe in ordinary markup prose — "WordNet's own definition" —
 *  opens a string that swallows the rest of the line, INCLUDING any `{$game.x}`
 *  after it. The HUD is the file this check exists for; it must not be the file
 *  the check is blind to.
 *
 *  So: `<script>` runs through the JS stripper, `<style>` and markup text are
 *  blanked as text, and `{...}` expressions — the only executable thing in
 *  markup, and where every violation will be — are kept and stripped as code. */
function stripSvelte(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  const lower = src.toLowerCase();
  while (i < n) {
    if (src.slice(i, i + 4) === '<!--') {
      const j = src.indexOf('-->', i);
      const end = j < 0 ? n : j + 3;
      out += blank(src.slice(i, end)); i = end; continue;
    }
    const tag = /^<(script|style)\b/i.exec(src.slice(i, i + 8));
    if (tag) {
      const name = tag[1].toLowerCase();
      const openEnd = src.indexOf('>', i);
      if (openEnd < 0) { out += blank(src.slice(i)); break; }
      const close = lower.indexOf(`</${name}`, openEnd);
      const bodyEnd = close < 0 ? n : close;
      out += blank(src.slice(i, openEnd + 1));
      const body = src.slice(openEnd + 1, bodyEnd);
      out += name === 'script' ? stripJs(body) : blank(body);
      i = bodyEnd; continue;
    }
    if (src[i] === '{') {
      const end = expressionEnd(src, i);
      out += ' ' + stripJs(src.slice(i + 1, end));
      if (end < n) out += ' ';
      i = end + 1; continue;
    }
    out += src[i] === '\n' ? '\n' : ' '; i++;
  }
  return out;
}

const strip = (file, src) => (file.endsWith('.svelte') ? stripSvelte(src) : stripJs(src));

/** The field names of `interface GameState`, read from the type rather than
 *  copied from it. This is the anti-vacuity mechanism: see the header. */
function gameStateFields() {
  const src = stripJs(readFileSync(TYPES_FILE, 'utf8'));
  const at = src.indexOf('export interface GameState');
  if (at < 0) die(`could not find \`export interface GameState\` in ${TYPES_FILE}.`,
    'This check derives its rule from that type; it will not guess.');
  const open = src.indexOf('{', at);
  const close = src.indexOf('\n}', open);
  const body = src.slice(open, close < 0 ? src.length : close);
  return [...body.matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:/gm)].map((m) => m[1]);
}

/** The ids declared in READOUTS, read from the module for the same reason. */
function declaredReadouts() {
  const src = stripJs(readFileSync(READOUTS_FILE, 'utf8'));
  const at = src.indexOf('export const READOUTS');
  if (at < 0) die(`could not find \`export const READOUTS\` in ${READOUTS_FILE}.`);
  const open = src.indexOf('{', at);
  const close = src.indexOf('\n}', open);
  const body = src.slice(open, close < 0 ? src.length : close);
  // top-level keys only: `words: {` / `solid: {`
  return [...body.matchAll(/^ {2}([A-Za-z_$][\w$]*)\s*:\s*\{/gm)].map((m) => m[1]);
}

function die(...lines) {
  for (const l of lines) console.error(`✗ ${l}`);
  process.exit(1);
}

// ---- build the rule out of the code it polices ----------------------------

const SAVE_FIELDS = gameStateFields();
const READOUT_IDS = declaredReadouts();

// SELF-CHECKS. Each of these is a way this check has gone, or could go, quiet.
if (SAVE_FIELDS.length === 0) {
  die(`parsed ZERO fields out of \`GameState\` in ${TYPES_FILE}.`,
    'The parser is broken, so the forbidden list is empty and this check would',
    'pass everything. Failing loudly instead.');
}
for (const name of Object.keys(STRUCTURAL)) {
  if (!SAVE_FIELDS.includes(name)) {
    die(`STRUCTURAL lists \`${name}\`, which is not a field of GameState any more.`,
      'This is how the last version of this check went vacuous: the field it',
      `policed was deleted and the rule stayed green. Re-read ${TYPES_FILE} and`,
      'fix this list.');
  }
}
if (READOUT_IDS.length === 0) {
  die(`parsed ZERO readouts out of ${READOUTS_FILE}.`,
    'Rule 3 would then be satisfied by an empty set. Failing loudly instead.');
}

const QUANTITY_FIELDS = SAVE_FIELDS.filter((f) => !(f in STRUCTURAL));

/** Which fields a readout owns the word for, so the message can say WHICH
 *  readout to ask. `count: (s) => D(s.solid)` — one hop, deliberately: a
 *  readout doing something cleverer than reading a field is a readout that
 *  needs its own name in the message anyway. */
const readoutForField = (() => {
  const src = stripJs(readFileSync(READOUTS_FILE, 'utf8'));
  const map = {};
  for (const id of READOUT_IDS) {
    const at = src.indexOf(`\n  ${id}:`);
    const body = src.slice(at, at + 400);
    for (const f of QUANTITY_FIELDS) if (new RegExp(String.raw`\.${f}\b`).test(body)) map[f] = id;
  }
  return map;
})();

const FORBIDDEN = [
  ...QUANTITY_FIELDS.map((f) => ({
    re: new RegExp(String.raw`${RECEIVERS}\.(${f})\b`, 'g'),
    why: readoutForField[f]
      ? `reads \`${f}\` off the save. It is a declared quantity: ask READOUTS.${readoutForField[f]} in ${READOUTS_FILE}, which owns its word`
      : `reads \`${f}\` off the save. NO readout declares it, so a surface showing it is inventing a word: declare it in ${READOUTS_FILE} first`,
  })),
  {
    // `held` is the board and is allowed. Its LENGTH is Words — and counting it
    // here is exactly how "25 nodes" once appeared beside "3 recovered".
    re: new RegExp(String.raw`${RECEIVERS}\.held\.length`, 'g'),
    why: `counts Words by hand; READOUTS.words in ${READOUTS_FILE} owns that number`,
  },
  {
    // The other way to compute Words yourself: call the engine helper the
    // readout calls. Same number, second name.
    re: /\bwords\s*\(/g,
    why: `computes Words by hand; a surface asks READOUTS.words in ${READOUTS_FILE}`,
  },
];

/** Destructuring is the obvious way around a receiver-anchored rule, so it is
 *  its own pass: `const { solid, rot } = $game` reads exactly as `$game.solid`
 *  does and must fail the same way. */
const DESTRUCTURE = new RegExp(
  String.raw`(?:const|let|var)\s*\{([^}]*)\}\s*=\s*${RECEIVERS}\b`, 'g');

// ---- scan ------------------------------------------------------------------

let failures = 0;
let scanned = 0;
const uiText = [];

for (const pattern of SURFACES) {
  for (const file of globSync(pattern)) {
    scanned++;
    const raw = readFileSync(file, 'utf8');
    const code = strip(file, raw);
    if (file.replaceAll('\\', '/').startsWith('src/ui/')) uiText.push(code);
    const rawLines = raw.split('\n');

    const report = (index, token, why) => {
      const line = code.slice(0, index).split('\n').length;
      // An exemption must be declared on the offending line itself.
      if ((rawLines[line - 1] ?? '').includes('vocab-ok')) return;
      console.error(`✗ ${file}:${line}  ${token} — ${why}`);
      failures++;
    };

    for (const { re, why } of FORBIDDEN) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(code)) !== null) report(m.index, m[0], why);
    }

    DESTRUCTURE.lastIndex = 0;
    let d;
    while ((d = DESTRUCTURE.exec(code)) !== null) {
      for (const part of d[1].split(',')) {
        const name = part.split(':')[0].replace(/[^\w$]/g, '');
        if (!QUANTITY_FIELDS.includes(name)) continue;
        report(d.index, name,
          `destructured off the save. Same rule: READOUTS in ${READOUTS_FILE} owns the word for a quantity`);
      }
    }
  }
}

if (scanned === 0) {
  die('vocabulary check matched NO files — the globs are wrong, and',
    'a check that inspects nothing passes forever. Failing loudly.');
}

// ---- rule 3: the HUD has to actually call the module -----------------------
//
// The review's finding was not that the HUD named a number wrongly. It was that
// the HUD did not call readouts.ts AT ALL, while showing numbers — which no
// forbidden-pattern rule can see, because the bypass leaves no pattern behind.
//
// ⚠️ STATED HONESTLY: this is a smoke test, not a proof. It can tell that the
// module is referenced for a given quantity; it CANNOT tell display from
// computation — the old HUD's one `READOUTS.` call picked a CSS hue and would
// have satisfied a rule shaped like this one. Rule 1 is the rule with teeth.
// This one exists because rule 1 is silent about a HUD that shows a number by
// never having been written against the module at all.
//
// Iterating the whole table — `READOUTS[id]`, `Object.values(READOUTS)`,
// `...READOUTS` — satisfies every id, because a surface that walks the table
// shows what the table holds by construction.
const ITERATES_TABLE = /READOUTS\s*\[|Object\.(?:values|entries|keys)\s*\(\s*READOUTS|\.\.\.READOUTS/;
if (uiText.length === 0) {
  die('no files under src/ui/ were scanned, so nothing can be said about the HUD.',
    'The globs are wrong. Failing loudly.');
}
for (const id of READOUT_IDS) {
  const used = uiText.some((t) => ITERATES_TABLE.test(t) || new RegExp(String.raw`READOUTS\.${id}\b`).test(t));
  if (used) continue;
  console.error(`✗ readout \`${id}\` is declared in ${READOUTS_FILE} and referenced by NO file in src/ui/.`);
  console.error(`  A quantity the player cannot see is not single-sourced, it is unshipped.`);
  failures++;
}

if (failures > 0) {
  console.error(`\n✗ ${failures} vocabulary violation(s) across ${scanned} surface files.`);
  console.error(`  ${QUANTITY_FIELDS.length} quantity field(s) policed: ${QUANTITY_FIELDS.join(', ')}`);
  process.exit(1);
}

console.log(`✓ player-facing vocabulary is single-sourced across ${scanned} surface files`);
console.log(`  ${QUANTITY_FIELDS.length} quantity fields off limits: ${QUANTITY_FIELDS.join(', ')}`);
console.log(`  ${READOUT_IDS.length} readouts declared and shown: ${READOUT_IDS.join(', ')}`);
