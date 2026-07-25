> # ⚠️ STALE — this document describes a different game (flagged 2026-07-25)
>
> It predates the speed-versus-truth loop. Flatly contradicted by the code:
> the six-tier ladder and sell/rent are unbuilt (`sell`/`refine` are inert);
> generator costs and rates are all different; Reasoners recover concepts
> rather than minting triples; Orchestrators are the review lane, not a late
> automation tier; the `inferenceMult` "core dopamine loop" **does not exist**;
> `reflectionLevel` is unread and `lifetimeCapital` is permanently `'0'`.
>
> Kept for the M4 sell/rent design only. **The live numbers are the constants at
> the top of `src/core/engine.ts`**, and the shipped economy is documented in
> `docs/VISION.md` + BACKLOG's balance-pass item. Rewrite this around the
> drift equilibrium before trusting a single number in it.

# Economy model (first pass — borrowed numbers)

**Principle we're borrowing:** in idle games, **costs grow exponentially while
production grows linearly/polynomially** — that seesaw is the whole pacing
engine ([Kongregate, *Math of Idle Games*](https://blog.kongregate.com/the-math-of-idle-games-part-i/amp/)).
We steal the canonical numbers so we don't invent formulas; **every number here
is a tunable starting point, meant to be felt in a prototype and adjusted.**

## Currencies (distinct tiered resources — reconciled with SPEC.md)

There is **no single "K"** — the ladder tiers are **distinct, non-fungible
resources** (`ResourceId` in `SPEC.md`): `data → triples → entities → taxonomies
→ ontologies → twins`. Each generator produces **one** resource; each is sold at
**its own tier's price**. Higher tiers are worth far more but come slower.

- **Ladder resources** — *produced* and *refined* one tier up.
- **Capital ($)** — hard currency, earned by **selling** any tier (exhaustive),
  spent on generators/compute.

## Generators — cost & output

Borrowed from Cookie Clicker ([Building cost = base × 1.15ⁿ](https://cookieclicker.fandom.com/wiki/Building)):

```
cost(n)      = baseCost × costRatio^n      # of the generator's costResource; costRatio=1.15
output(res)  = Σ_{k produces res} ( count_k × baseRate_k × multipliers )   # PER resource, not a summed K
```

Starting table (base costs/rates lifted from Cookie Clicker's first buildings —
0.1/1/8/47/260 CpS at 15/100/1100/12000/130000 cost):

| Generator | Base cost | Base output (/s) | Note |
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
$gained = amount × marketPrice(resourceId, domain) × Q   # sell ANY tier at its own price
resources[resourceId] -= amount                          # selling consumes that resource
lifetimeCapital       += $gained                         # the prestige anchor (in GameState)
```

- `marketPrice(domain)` varies; **finance decays** (freshness) → hoarding loses
  value there.
- **Late game — rent:** unlocked at scale; recurring `$ /s = platformTier × Q`,
  *non-exhaustive*. Renting is the reward for scale.

### Making sell-vs-keep a real choice (not a no-brainer) — Chad gap #1

Hoarding must have a *real cost* or "keep" always wins and the core tension is
decorative. Three forces (tune so the answer to "sell?" genuinely flips with game
state):

1. **Tiered resources, sell at any tier** (see `SPEC.md`): sell cheap Triples now,
   or refine into a Twin worth orders of magnitude more but slower. Real
   opportunity cost, both directions.
2. **Quality saturation:** `Q` stops improving past a dedup/consistency ceiling —
   hoarded K above it is dead weight *unless sold*.
3. **Capital-gated compute:** reasoner/agent throughput is capped by compute you
   can **only buy with `$`** — so you must sell to keep growing. Starving for cash
   throttles the compounding engine.

**Verify in a spreadsheet that neither "always sell" nor "always hoard" wins at
any stage before building.**

## AI-agent error model (human-in-the-loop)

Agents produce fast but wrong; error rate is **high early, decays with tech**:

```
errorRate(tech) = e0 × d^tech          # e0 ≈ 0.30 (30% early!), d ≈ 0.8
effectiveOutput = agentOutput × (1 − errorRate)
```

- Unreviewed errors reduce `Q` and can trigger inconsistency (→ lawsuit hazard).
- **HITL is OPTIONAL, never a chore** (Redditor P2): Orchestrators buy you *out*
  of manual review — dirty-and-cheap auto, or clean-and-expensive auto. Manual
  batch review is an optional min-max lever for tryhards, never the required path.
  An idle game must not demand babysitting.
- The tension: cheap-noisy vs expensive-clean throughput — not attention tax.

### Hazard consequences (they had no teeth — Chad gap #4)

Concrete, tunable:

- **Inconsistency / ex-falso:** `Q_consistency → 0.5` **and** freeze Reasoner
  output until cleaned (a visible, annoying stall with a clear dig-out path).
- **Lawsuit:** one-time `$ → $ × 0.6` (−40% current capital), scaled to recent
  *unlicensed* volume, plus a temporary `marketPrice` debuff on the offending
  domain. There is no game-over — only lose-ground, which the genre needs to make
  risk real.

## Prestige — "Reflect"

Borrowed from Cookie Clicker's cubic prestige
([floor((total/threshold)^(1/3))](https://cookieclicker.fandom.com/wiki/Heavenly_Chips)):

```
reflectionLevel = floor( (lifetimeCapital / T) ^ (1/3) )  # anchor = total $ ever earned; T tunable
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
