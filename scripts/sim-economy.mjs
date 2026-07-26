// Headless simulator for the PROPOSED refinement-ladder economy (docs/ECONOMY.md).
//
// Nothing in the game imports this. It exists so a design can be measured before
// it is built, because this project has twice shipped an economy whose dominant
// strategy made its own thesis unreachable — and both times the discovery cost a
// day of play and a day of forensics.
//
// It answers the two questions ECONOMY.md says would kill the design:
//
//   1. Does automating ever become CORRECT?
//      If manual play stays better, this is a game that punishes idling, in the
//      idle genre.
//   2. Is the endgame board DARK?
//      If rot is monotone, every save ends strictly worse than it began, and
//      players find that in about six hours.
//
// Plus the pacing targets, which are stated as requirements rather than hopes.
//
//   node scripts/sim-economy.mjs
//
// EVERY CONSTANT BELOW IS A GUESS. The point of this file is that they stop
// being guesses.

// ── the world ──────────────────────────────────────────────────────────────
// Two buckets, not a full histogram: HEAD (common, general concepts) and TAIL
// (rare, specific ones). Two is enough to answer both questions, because "the
// rim goes dark" is exactly "the tail bucket stops being covered". The shipped
// game would carry the real distribution — see the HARD CONSTRAINT in
// ECONOMY.md — but a 2-bucket model is the right resolution for a design probe.
const HEAD = 1229;              // ~30% of 4,096: depth 0-3 in the real data
const TAIL = 4096 - HEAD;       // the other 70%: depth 4-5, where meronymy lives

// ── the ladder ─────────────────────────────────────────────────────────────
const RUNGS = ['salvage', 'extract', 'verify', 'curate', 'train'];

/** Base yield of each conversion, by hand. Capped strictly below 1: the climb is
 *  the fun, the ceiling is the tension (ECONOMY.md, "THE YIELD IS THE GAME"). */
const HAND_YIELD = { salvage: 1.00, extract: 0.72, verify: 0.86, curate: 0.80, train: 0.90 };
/** Yield when a checkpoint runs the rung instead of you. Strictly worse — that
 *  is the whole bargain — but NOT catastrophic, or automating is never correct. */
const AUTO_YIELD = { salvage: 0.97, extract: 0.55, verify: 0.62, curate: 0.58, train: 0.70 };
/** Throughput multiplier a checkpoint grants its rung. Largest at the BOTTOM, so
 *  the throughput gradient opposes the damage gradient and the "how far up do I
 *  hand over" question has an interior answer rather than a forced order. */
const AUTO_SPEED = { salvage: 14, extract: 8, verify: 4.5, curate: 3, train: 2 };
/** Rungs ABOVE this one that its rot propagates through — the damage gradient,
 *  also largest at the bottom. */
const BLAST = { salvage: 4, extract: 3, verify: 2, curate: 1, train: 0 };

// ── rates, per second, by hand ─────────────────────────────────────────────
const HAND_RATE = { salvage: 3.0, extract: 1.2, verify: 0.45, curate: 0.30, train: 0.02 };

/** Verification is capacity-limited in ABSOLUTE units, not as a share of the
 *  pool. This is the load-bearing choice: a proportional limiter makes the loss
 *  a constant, and a constant in series is a units conversion, not a mechanic. */
const VERIFY_CAP_BASE = 0.45;   // statements/sec a human can check
const ATTENTION_PER_CP = 0.55;  // capacity a checkpoint adds, worse per unit

/** Generational quality recursion — the actual Shumailov result. Each checkpoint
 *  trains on material the previous generation produced, so quality CONTRACTS
 *  geometrically toward a floor rather than falling off a cliff. */
const RECURSION = 0.82;         // contraction factor per checkpoint generation
const QUALITY_FLOOR = 0.30;     // the plateau; VISION asks for a floor, not a wall

/** Tail share of what each source yields. The bottom rung stops being a cookie
 *  because WHERE you salvage decides the SHAPE of what you get. */
const SOURCE = {
  common:  { rate: 3.0, tailShare: 0.12 },   // fast, head-heavy
  archive: { rate: 1.1, tailShare: 0.68 },   // slow, tail-heavy, the only real tail faucet
};

const BATCH_SIZE = 240;         // verified statements per batch
const CP_COST_RATIO = 2.4;      // each checkpoint costs this much more than the last

// ── the model ──────────────────────────────────────────────────────────────

function fresh() {
  return {
    t: 0,
    tokensHead: 0, tokensTail: 0,
    stmtHead: 0, stmtTail: 0,
    verHead: 0, verTail: 0,
    retainedTail: 0,        // selectively withheld RARE statements (the mitigation)
    batches: 0,
    checkpoints: [],        // rung names, in the order automated
    coveredHead: 0, coveredTail: 0,   // agreement with YOUR OWN corpus
    trueHead: 0, trueTail: 0,         // agreement with the SOURCE
  };
}

const automated = (s, rung) => s.checkpoints.includes(rung);
const yieldOf = (s, rung) => (automated(s, rung) ? AUTO_YIELD : HAND_YIELD)[rung];
const speedOf = (s, rung) => (automated(s, rung) ? AUTO_SPEED[rung] : 1);

/** Quality of the material a rung produces, after the generational recursion and
 *  after the blast radius of everything automated BELOW it. */
function quality(s, rung) {
  const gens = s.checkpoints.length;
  const contracted = Math.max(QUALITY_FLOOR, RECURSION ** gens);
  let below = 1;
  for (const cp of s.checkpoints) {
    if (RUNGS.indexOf(cp) < RUNGS.indexOf(rung)) below *= 0.92;
  }
  return contracted * below;
}

/** One second of play under a strategy. */
function step(s, strat) {
  const src = SOURCE[strat.source(s)];

  // 1. salvage
  const salv = src.rate * speedOf(s, 'salvage') * yieldOf(s, 'salvage');
  s.tokensTail += salv * src.tailShare;
  s.tokensHead += salv * (1 - src.tailShare);

  // 2. extract
  const exCap = HAND_RATE.extract * speedOf(s, 'extract');
  const exH = Math.min(s.tokensHead, exCap * 0.7), exT = Math.min(s.tokensTail, exCap * 0.3);
  s.tokensHead -= exH; s.tokensTail -= exT;
  s.stmtHead += exH * yieldOf(s, 'extract');
  s.stmtTail += exT * yieldOf(s, 'extract');

  // 3. verify — ABSOLUTE capacity, the thing you cannot out-produce
  const cap = VERIFY_CAP_BASE + ATTENTION_PER_CP * s.checkpoints.filter((c) => c === 'verify').length;
  const vCap = cap * speedOf(s, 'verify');
  const wantT = Math.min(s.stmtTail, vCap * strat.tailFocus);
  const wantH = Math.min(s.stmtHead, vCap - wantT);
  s.stmtTail -= wantT; s.stmtHead -= wantH;
  const vy = yieldOf(s, 'verify') * quality(s, 'verify');
  s.verTail += wantT * vy; s.verHead += wantH * vy;

  // 4. curate — selective retention: rare statements withheld from the batch
  const curCap = HAND_RATE.curate * speedOf(s, 'curate');
  const keep = strat.retain(s);                       // share of TAIL held back
  const cT = Math.min(s.verTail, curCap * 0.4);
  const held = cT * keep;
  s.retainedTail += held;
  const cH = Math.min(s.verHead, curCap - cT);
  s.verTail -= cT; s.verHead -= cH;
  const cy = yieldOf(s, 'curate') * quality(s, 'curate');
  s.batches += ((cT - held) + cH) * cy / BATCH_SIZE;

  // 5. train
  const cost = Math.pow(CP_COST_RATIO, s.checkpoints.length);
  const want = strat.automate(s);
  if (want && !automated(s, want) && s.batches >= cost) {
    s.batches -= cost;
    s.checkpoints.push(want);
  }

  // ── THE GATE ─────────────────────────────────────────────────────────────
  // Restoration is done by the MODEL, not by your hands. You cannot hand-restore
  // four thousand concepts; you assemble the material and the checkpoint does the
  // work. This is the stated goal taken literally ("train a checkpoint that
  // restores the world"), and it is the constraint that makes automation
  // necessary rather than optional.
  //
  // The first version of this probe omitted it — coverage grew from verified
  // volume alone — and the result was immediate and familiar: pure hand play
  // reached 100% and "never automate" was dominant for the third economy running.
  // The fix was in the design document and not in the model. That is exactly the
  // kind of gap a probe exists to find.
  const restore = s.checkpoints.length * 0.55 * quality(s, 'curate');
  const headShare = 1 - strat.tailFocus;
  s.coveredHead = Math.min(HEAD, s.coveredHead + restore * headShare * Math.min(1, s.verHead + 1));
  s.coveredTail = Math.min(TAIL, s.coveredTail + restore * strat.tailFocus * Math.min(1, s.verTail + 1));

  // Agreement with the SOURCE is the other side of the gate: it needs tail-rich,
  // human-grade material, so it rewards exactly what automation destroys.
  // Retained rare statements are the main thing that moves it.
  const trueGain = quality(s, 'verify') ** 2;
  s.trueHead = Math.min(s.coveredHead, s.trueHead + restore * headShare * trueGain);
  s.trueTail = Math.min(s.coveredTail,
    s.trueTail + (restore * strat.tailFocus + s.retainedTail * 0.004) * trueGain);
  s.retainedTail *= 0.9994;   // shelf life: hoarded tails redrift

  s.t++;
  return s;
}

const coverage = (s) => (s.coveredHead + s.coveredTail) / 4096;
const truth = (s) => (s.trueHead + s.trueTail) / 4096;
const rim = (s) => s.coveredTail / TAIL;   // "is the rim dark?"

function run(strat, seconds) {
  const s = fresh();
  const marks = [180, 1200, 2700, 3600, 21600, 43200];
  const out = [];
  for (let i = 0; i < seconds; i++) {
    step(s, strat);
    if (marks.includes(s.t)) {
      out.push({
        t: s.t, cov: coverage(s), tru: truth(s), rim: rim(s),
        cps: s.checkpoints.length, order: s.checkpoints.join('>'),
      });
    }
  }
  return out;
}

// ── strategies ─────────────────────────────────────────────────────────────
const NEVER = {
  name: 'never automate (pure hand)',
  source: () => 'common', tailFocus: 0.35,
  retain: () => 0.25, automate: () => null,
};
const GREEDY = {
  name: 'automate everything, bottom-up, ASAP',
  source: () => 'common', tailFocus: 0.2,
  retain: () => 0, automate: (s) => RUNGS.find((r) => !s.checkpoints.includes(r)) ?? null,
};
const TOPDOWN = {
  name: 'automate from the TOP down',
  source: () => 'common', tailFocus: 0.35,
  retain: () => 0.2,
  automate: (s) => [...RUNGS].reverse().find((r) => !s.checkpoints.includes(r)) ?? null,
};
const BALANCED = {
  name: 'automate low, mine archives, retain tails',
  source: (s) => (s.checkpoints.length >= 1 ? 'archive' : 'common'),
  tailFocus: 0.5,
  retain: (s) => (s.checkpoints.length >= 2 ? 0.5 : 0.25),
  automate: (s) => ['salvage', 'extract', 'curate'].find((r) => !s.checkpoints.includes(r)) ?? null,
};

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const hhmm = (t) => (t < 3600 ? `${Math.round(t / 60)}m` : `${(t / 3600).toFixed(0)}h`);

console.log('PROPOSED ECONOMY — headless probe (docs/ECONOMY.md rev 2)');
console.log('every constant is a guess; the point is that they stop being guesses\n');

for (const strat of [NEVER, GREEDY, TOPDOWN, BALANCED]) {
  console.log(`── ${strat.name}`);
  console.log('     time   checkpoints   coverage   source-agreement   rim (tail covered)');
  for (const r of run(strat, 43200)) {
    console.log(
      `   ${hhmm(r.t).padStart(6)}   ${String(r.cps).padStart(11)}   ${pct(r.cov).padStart(8)}   `
      + `${pct(r.tru).padStart(16)}   ${pct(r.rim).padStart(18)}`,
    );
  }
  console.log('');
}

// ── the two questions that kill the design ─────────────────────────────────
const at12h = (strat) => run(strat, 43200).at(-1);
const hand = at12h(NEVER), greedy = at12h(GREEDY), bal = at12h(BALANCED);

console.log('── Q1. Does automating ever become CORRECT?');
console.log(`   hand @12h coverage ${pct(hand.cov)} | greedy ${pct(greedy.cov)} | balanced ${pct(bal.cov)}`);
console.log(`   ${greedy.cov > hand.cov || bal.cov > hand.cov
  ? 'YES — automation out-produces hand play. The genre contract holds.'
  : 'NO — hand play wins. This game punishes idling, in the idle genre. FATAL.'}`);

console.log('\n── Q2. Is the endgame board DARK?');
console.log(`   rim coverage @12h: hand ${pct(hand.rim)} | greedy ${pct(greedy.rim)} | balanced ${pct(bal.rim)}`);
console.log(`   ${Math.max(hand.rim, greedy.rim, bal.rim) > 0.5
  ? 'NO — a played-well board keeps its tail. Rot is a rate, not a ratchet.'
  : 'YES — every strategy ends with a dark rim. Terminal state worse than the opening. FATAL.'}`);

console.log('\n── Q3. Do the two numbers actually diverge?');
console.log(`   greedy @12h: coverage ${pct(greedy.cov)} vs source ${pct(greedy.tru)} — gap ${pct(greedy.cov - greedy.tru)}`);
console.log(`   balanced @12h: coverage ${pct(bal.cov)} vs source ${pct(bal.tru)} — gap ${pct(bal.cov - bal.tru)}`);
console.log(`   ${(greedy.cov - greedy.tru) > (bal.cov - bal.tru) + 0.05
  ? 'YES — greed opens the gap and care closes it. The second number is a real axis.'
  : 'NO — the gap does not depend on play. The twist is decoration.'}`);
