// HOW RARE IS A CONCEPT?
//
// The owner asked to "go through the entire dataset and rate the entities by
// rarity, so that we can determine what's cool and what's not". This is that
// rating, and this file is the whole of it — one pure function, so it can be
// tested without cloning 45 MB of YAML and so the number is reproducible from
// the pinned source rather than being a vibe someone typed in.
//
// ---- WHAT THIS NUMBER HONESTLY IS ---------------------------------------
//
// It is NOT corpus frequency. Open English WordNet ships no occurrence counts,
// and inventing one would be exactly the fabricated-data failure this project
// exists to satirise. What it measures is OBSCURITY: how specific, how
// technical and how peripheral a concept is inside the lexicon itself.
//
// That distinction is load-bearing enough to be labelled in
// docs/SIMPLIFICATIONS.md. "Rare" here means "far out on the taxonomy and
// thinly lexicalised", which correlates with rarity in speech but is not a
// measurement of it.
//
// ---- THE SEVEN SIGNALS, AND WHY EACH IS REAL -----------------------------
//
//   depth        Hops from `entity`. WordNet's noun hierarchy runs general to
//                specific by construction, so depth IS specificity. Strongest
//                single signal, and the only one that cannot be gamed by how a
//                lexicographer chose to write an entry.
//
//   descendants  How much of the shipped tree hangs beneath it. `entity` has
//                everything; a leaf has nothing. A concept with a large subtree
//                is a hub of the language, whatever its depth.
//
//   synonyms     Word forms in the synset. English lexicalises the ideas it
//                uses often, repeatedly — `car / auto / automobile / machine /
//                motorcar`. One lonely form is a mark of a technical entry.
//
//   senseRank    Where this synset sits in its label's list of noun senses.
//                WordNet orders senses by frequency in the tagged corpus, so
//                this is the ONE genuine frequency signal in the source: sense
//                1 is what the word usually means, sense 6 is not.
//
//   polysemy     How many noun senses that label has at all. Everyday words
//                accrete senses; `aardvark` has exactly one. Weak on its own —
//                it is weighted accordingly — and it disagrees with senseRank
//                often enough to be worth keeping as a separate signal.
//
//   words        Multi-word labels (`common carotid artery`) are compounds
//                coined for precision. A single word is the everyday case.
//
//   degree       Non-is-a relations touching it in the shipped table — has
//                part, has member, made of, studied in. A concept nothing else
//                refers to is peripheral.
//
// Weights are a judgement call, stated here rather than buried: taxonomy
// position carries half, lexicalisation carries a third, and the rest are
// tie-breakers. They were set by computing the whole dataset and reading the
// two ends of the list — see docs/RARITY.md, which is regenerated with the
// data and is the evidence that the ranking is sane.

/** Weights, summing to 1. Exported so the report and the tests can quote them
 *  rather than restating them and drifting. */
export const WEIGHTS = {
  depth: 0.34,
  descendants: 0.26,
  synonyms: 0.14,
  senseRank: 0.10,
  polysemy: 0.08,
  words: 0.05,
  degree: 0.03,
};

/** Saturation points. Past these, more of the signal says nothing extra —
 *  the difference between 400 and 4,000 descendants is not a difference in
 *  kind, and a clamp keeps one outlier from flattening everything else. */
export const CAPS = {
  depth: 14,         // the full noun hierarchy bottoms out at 16
  descendants: 2000, // `entity` has ~101,000; the interesting range is far below
  synonyms: 5,
  senseRank: 6,
  polysemy: 8,
  words: 3,
  degree: 8,
};

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Log-scaled 0..1. Subtree sizes and sense counts are heavy-tailed; linear
 *  scaling would put 99% of concepts in the first bucket. */
const logNorm = (x, cap) => clamp01(Math.log1p(Math.max(0, x)) / Math.log1p(cap));

/**
 * @param {{depth:number, descendants:number, synonyms:number,
 *          senseRank:number, polysemy:number, words:number, degree:number}} f
 * @returns {number} 0..100, higher = more obscure. Integer, so it costs one
 *   byte in the shipped chunk and cannot drift on a float rounding difference
 *   between two machines.
 */
export function scoreRarity(f) {
  // Each term is normalised so that 1 means RARER. Read them as "how far is
  // this concept from being an everyday, central word".
  const parts = {
    depth: logNorm(f.depth, CAPS.depth),
    descendants: 1 - logNorm(f.descendants, CAPS.descendants),
    synonyms: 1 - clamp01((Math.max(1, f.synonyms) - 1) / (CAPS.synonyms - 1)),
    senseRank: clamp01((Math.max(1, f.senseRank) - 1) / (CAPS.senseRank - 1)),
    polysemy: 1 - logNorm(Math.max(1, f.polysemy) - 1, CAPS.polysemy),
    words: clamp01((Math.max(1, f.words) - 1) / (CAPS.words - 1)),
    degree: 1 - logNorm(f.degree, CAPS.degree),
  };
  let total = 0;
  for (const [k, w] of Object.entries(WEIGHTS)) total += w * parts[k];
  return Math.round(clamp01(total) * 100);
}

/** The five bands the game reasons in.
 *
 *  Boundaries are FROZEN SCORES, not live percentiles — a percentile band would
 *  silently relabel every concept whenever the dataset moved, and the point of
 *  a tier is a stable answer to "how obscure is this". They were READ OFF the
 *  shipped distribution once (quintiles of the 4,096: p20=60, p40=66, p60=69,
 *  p80=71) and then nailed down, which is why they are not round numbers.
 *  Scores cluster hard in 60..78 because almost everything in a lexicon is
 *  specific; spacing the bands evenly across 0..100 would have put 83% of the
 *  dataset in two tiers and taught the player nothing.
 *
 *  Names are mechanical, not flavour — the owner's words go on top. */
export const TIERS = [
  { id: 0, name: 'common', upTo: 60 },
  { id: 1, name: 'ordinary', upTo: 66 },
  { id: 2, name: 'specific', upTo: 69 },
  { id: 3, name: 'technical', upTo: 72 },
  { id: 4, name: 'obscure', upTo: 100 },
];

export function tierOf(score) {
  for (const t of TIERS) if (score <= t.upTo) return t.id;
  return TIERS[TIERS.length - 1].id;
}
