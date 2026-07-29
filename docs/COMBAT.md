# Combat — two dots and the edge between them

The owner's whole spec: *"battles with enemies, where our dot pokes against their
dot and one of the dots dies out."* Serves `BRIEF.md` ask 7, under asks 2/3/5.

**Everything below marked *proposal* is mine, not the owner's.** That is all of
it except the sentence above.

## 1. A fight, in graph terms

| Thing | Is | Drawn as |
|---|---|---|
| You | your dot, at your current node | the dot already there |
| Enemy | a dot authored onto a node | a dot, hostile hue, larger |
| The fight | the **edge between them** | one contested line |
| Health | **the dot's radius** | it shrinks |
| Death | radius → 0 | it goes out, then off the board |

*Proposal:* **radius is health.** No bars, no floating numbers —
`dotRadius(weight)` already sizes dots from a 0..1 number, so a dot losing is a
dot getting smaller. That is "dies out" drawn literally.

A **poke** is one exchange: both dots lose radius, simultaneously, once per
interval. A pulse runs the contested edge each poke — the `flash` marching-dash
code in `paint.ts` already draws exactly this.

## 2. Timing — a fight is a timer

*Proposal.* Ask 3 makes timers the spine, so combat is not a special mode. A
fight is an action with a duration, resolved by the same offline bank as every
other timer.

- **Tick-based.** One poke every *N* seconds.
- **No RNG** — the engine is pure and has none, so the outcome is computable the
  moment you engage.
- **So the result is shown before you commit.** "You win with 40% left" / "you
  go out on poke 12." Ask 4: a threshold you can see from here.
- **Closing the tab changes nothing.** Same arithmetic, resolved on return.

Nothing requires checking in. You cannot be attacked while away.

*The honest objection:* a known outcome is not a gamble. It is a **check** —
you do not fight the dragon at level 3. The decision is whether to spend to
change the answer, not whether you got lucky.

## 3. Where the numbers come from

`SKILLS.md` owns skills. Combat must not name any. *Proposal* — the interface:

```
enemy = { tests: SkillId, rating: number, bite: number }
```

Every enemy declares **one skill it is scored against**. Combat reads exactly
one value from the skill system:

| Combat needs | Reads | Note |
|---|---|---|
| your poke size | `level(enemy.tests)` | one integer |
| their poke size | `enemy.rating` | authored |
| your radius | `level(enemy.tests)` | same integer |
| interval | fixed constant | *proposal*: same for all fights, v1 |

One curve, both directions: this file owns the shape, `SKILLS.md` owns every
value. If skills later feed speed or max-radius separately, those are extra
named fields — additive, not a rewrite.

## 4. Losing — your dot goes out

The hardest constraint: failure is a plateau, never a loss screen. *Proposal:*

1. Your dot **goes out and relights**. It is not deleted. You are pushed back
   along the edge you arrived on.
2. **You keep the XP for damage dealt.** Losing to a thing is how you train on
   it. A loss is measurable progress toward the win — this is the whole answer.
3. **You lose nothing else.** No items, no levels, no setback. The only cost is
   the time the timer already spent.
4. The contested edge draws **scarred** — dark, solid, marked. The route stays
   visible and stays shut until you come back stronger.

No screen, no modal, no retry button. The board changes state and you are
standing one node back, looking at it.

## 5. Why an enemy is there

*Proposal:* **authored onto a place, never rolled.** Fantasy CYOA — the troll is
at the bridge because somebody put it at the bridge.

- **Visible before you reach it.** Give an occupied node high `weight` and
  level-of-detail shows it from several nodes out. You choose the detour.
- **An enemy is a gate.** While its dot is lit, the node's onward edges are
  blocked — a lock opened by a *level* rather than a key, beside `starmap.ts`'s
  key-gated routes.
- Random encounters need RNG the engine does not have, and punish absence.
  Rejected.

## 6. Cost, against the renderer I read

| Free today | Cheap | **Do not build** |
|---|---|---|
| dot radius from a number | hostile hue ramp | health bars over dots |
| edge highlight by hue | per-node radius override | projectiles, sprites, hit particles |
| marching-dash pulse (`flash`) | one contested edge | a battle screen |
| removing a node | scarred-edge line state | positional/tactical movement |
| d3-force reheat on removal | | many simultaneous fights, drawn distinctly |

Engine side: one action (`engage`), one deterministic resolver reusing offline
banking, enemy data on nodes. Combat adds **one** concept — a timer whose end
state removes a dot. Nothing here needs canvas text or an animation system.

## 7. Open questions

- Does a defeated enemy stay dead, or return? (*Proposal:* stays dead.)
- Does a **wounded** enemy heal between attempts? Full heal = a loss costs only
  time; partial = chip-damage grinding. (*Proposal:* full heal, v1.)
- Does your dot heal, and on what timer?
- Can you **retreat** mid-fight, and at what cost?
- XP for damage dealt, or only for a win? §4 needs the former.
- Does a win drop a resource (ask 10)? Currency is undecided.
- Multiple enemies on one node — a second dot, or one harder dot?
- Own graph tab, or the story graph? (*Proposal:* the story graph. A separate
  tab is a separate screen by another name.)
