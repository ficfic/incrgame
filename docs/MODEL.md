# The model — progression and economy, simplified

> Owner decisions, 2026-07-26, after "it's incredibly convoluted and makes
> absolutely zero sense". **This supersedes the ladder in `ECONOMY.md`.**
>
> Kept to one page on purpose. The last economy got two revisions, three agent
> reviews and a headless simulation before any code, and none of it caught the
> real problem.

## The count that started this

Thirteen things to press: Discover, Salvage, Extract, connect a line, Review,
Grow context, Retrain, Absorb, Decide, two machines, the supervision dial, the
source toggle. **Target: three verbs and one upgrade.**

---

## The loop

```
DISCOVER   spend a slot → a concept lands on the board, DARK
EXTRACT    reads the concepts you hold → proposes DOTTED edges
CONFIRM    tap a dotted edge → it goes solid. +1 checked statement
```

That is the whole game. Everything else is automation of one of those three.

**Dotted edges exist only because Extract made them.** Today they appear from
nowhere the moment two concepts are on the board, which is why Extract felt like
it did nothing and why the board fills with lines you never asked for.

## The one currency

**Checked statements.** Earned by confirming. Spent on:

- **Context window** — the only thing that grows, the only thing you buy.
- **Machines** — later, and they automate Extract and Confirm.

No passages, no tokens, no capital, no six-tier ladder.

## Attention

Starts at 4. **Grows very slowly** — much slower than today, where it went 4→13
in two minutes. It is a slow background reward, never a currency.

**And it can DEGRADE.** Rot and unwatched machines cost you focus. This is the
one place the game gets to punish, and it is thematically exact: a graph you let
rot is a graph you have to think harder about. *(Trigger conditions not yet
decided — see open questions.)*

## Deleted

| gone | why |
|---|---|
| **Passages** | a middleman between Salvage and Extract; the owner asked what one was, twice |
| **Salvage** | its only output fed the middleman |
| **The Review desk** | it samples an abstract statement pool and touches nothing on the board. Confirming a dotted edge IS the check now |
| **`tokenTail` / "% rare"** | already dead — displayed, read by nothing |
| **The ruins/archives fork** | goes with Salvage. Head-vs-tail returns later as *what Extract proposes*, if at all |

Deletions are **additive migrations**: fields stay in the save, unread. Nobody
loses a concept, a statement or a line.

## Kept, unchanged

The board, the context window, concepts going dark, `entity` at the root, real
WordNet relations, the two numbers (`checked` and `agreeing`), prestige.

## The trap stays

Some proposed edges are **fake** — invented, not in the dataset, drawn
identically to real ones. Confirming one raises `checked` and does nothing to
your graph. `agreeing` is the number that quietly disagrees. This is the game's
entire satire and it currently hides inside the modal being deleted.

## Open questions — NOT to be answered by guessing

1. **Is "Extract" the right word?** The owner flagged it. It is the real term
   (relation extraction) and the machine is already an Extractor, so the problem
   may have been that it produced no visible output rather than the word itself.
   Ship it with visible output first, then ask again.
2. **What exactly degrades attention?** Rot, unwatched machines, or confirming
   fakes. Needs to be one thing, legible, and never a surprise.
3. **How fast is "very slowly"?** Measure with `play-probe`, do not pick a number
   here. Everything in this file that is a number is a placeholder.

## How this gets built

One item per session, top of `docs/NEXT.md`, each ending in a `play-probe`
screenshot. **Not one big rewrite** — that is what produced the thing being
replaced.
