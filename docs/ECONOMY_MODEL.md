# Economy model (first pass — borrowed numbers)

**Principle we're borrowing:** in idle games, **costs grow exponentially while
production grows linearly/polynomially** — that seesaw is the whole pacing
engine ([Kongregate, *Math of Idle Games*](https://blog.kongregate.com/the-math-of-idle-games-part-i/amp/)).
We steal the canonical numbers so we don't invent formulas; **every number here
is a tunable starting point, meant to be felt in a prototype and adjusted.**

## Currencies

- **Knowledge (K)** — soft currency, *produced*. Split into Triples → Entities →
  Taxonomies → Ontologies → Digital Twins (higher tiers are worth more K).
- **Capital ($)** — hard currency, earned by **selling** K (exhaustive).

## Generators — cost & output

Borrowed directly from Cookie Clicker ([Building cost = base × 1.15ⁿ](https://cookieclicker.fandom.com/wiki/Building)):

```
cost(n)  = baseCost × 1.15^n          # n = number already owned
output   = Σ_k ( count_k × baseRate_k × multipliers )
```

Starting table (base costs/rates lifted from Cookie Clicker's first buildings —
0.1/1/8/47/260 CpS at 15/100/1100/12000/130000 cost):

| Generator | Base cost | Base output (K/s) | Note |
|---|---|---|---|
| Manual connect | — | 1 / action | The opening; you outgrow it |
| Harvester | 15 | 0.1 | auto Data |
| Extractor | 100 | 1 | Data → Triples |
| **Reasoner** | 1,100 | 8 | ×inference multiplier (below) |
| **AI Agent** | 12,000 | 47 | ×(1 − error rate) (below) |
| Orchestrator | 130,000 | 260 | agents managing agents |

## The inference multiplier (the compounding twist — bounded)

Reasoners scale with graph richness, but must be **bounded** or the game
explodes. Use a logarithmic bonus (safe, tunable via the `/10` knob):

```
inferenceMult = 1 + reasonerLevel × log10(1 + edges) / 10
```

Log keeps it compounding-but-controllable. (Alt: `edges^0.2` for a gentler power
curve. α is a tuning knob.)

## Quality multiplier (gates sale price)

Ties money back to the real mechanics. Each factor in ~[0.5 … 2.0]:

```
Q = Q_consistency × Q_provenance × Q_dedup
```

- `Q_consistency` — drops toward 0.5 if inconsistency/ex-falso is present.
- `Q_provenance` — rises with PROV-O tracking; premium for high provenance.
- `Q_dedup` — rises with Curator / owl:sameAs merging.

## Selling (exhaustive) & the sell→rent arc

```
$gained = K_sold × marketPrice(domain) × Q
K      -= K_sold                              # selling consumes knowledge
```

- `marketPrice(domain)` varies; **finance decays** (freshness) → hoarding loses
  value there.
- **Late game — rent:** unlocked at scale; recurring `$ /s = platformTier × Q`,
  *non-exhaustive*. Renting is the reward for scale.

## AI-agent error model (human-in-the-loop)

Agents produce fast but wrong; error rate is **high early, decays with tech**:

```
errorRate(tech) = e0 × d^tech          # e0 ≈ 0.30 (30% early!), d ≈ 0.8
effectiveOutput = agentOutput × (1 − errorRate)
```

- Unreviewed errors reduce `Q` and can trigger inconsistency (→ lawsuit hazard).
- **HITL:** reviewing a batch converts errors→correct at a time/attention cost.
- The tension: run bots dirty-and-fast, or review and stay clean.

## Prestige — "Reflect"

Borrowed from Cookie Clicker's cubic prestige
([floor((total/threshold)^(1/3))](https://cookieclicker.fandom.com/wiki/Heavenly_Chips)):

```
reflectionLevel = floor( (totalK_ever / T) ^ (1/3) )      # T = threshold, tune
permanentBonus  = +1% production per level                # Cookie Clicker parity
```

Reflect resets K + generators, keeps the Reflection multiplier. (Named
"Reflection" = metamodeling, *not* `owl:ReflexiveProperty`.) Meta-upgrade costs use
Exponential Idle's `b × 2^(a(x−1))`
([source](https://exponential-idle.fandom.com/wiki/Instructions)).

## North-star progress (coverage)

```
worldCoverage% = Σ_domains coverage_d / domainCount     # asymptotic; never 100%
```

Master progress bar; each domain a mini-arc feeding it.

## Tuning knobs (the things to feel, not spec)

`1.15` cost ratio · base costs/rates · inference `/10` (or α) · `e0`,`d` error
decay · quality factor ranges · prestige threshold `T` · marketPrice per domain.
Change these by **playing**, not on paper.

---

*Sources: [Cookie Clicker Building](https://cookieclicker.fandom.com/wiki/Building) ·
[Heavenly Chips](https://cookieclicker.fandom.com/wiki/Heavenly_Chips) ·
[Kongregate: Math of Idle Games](https://blog.kongregate.com/the-math-of-idle-games-part-i/amp/) ·
[Exponential Idle](https://exponential-idle.fandom.com/wiki/Instructions).*
