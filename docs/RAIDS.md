# THE WAR, DRAWN — a design, 2026-08-10

> *"it's not even visible anywhere… like it's absolutely unclear any raids are
> happening at all… and also they must attack the hero and hero must have
> travel times between his attacks and home… and all must be visible on map,
> raids with red dotted lines, etc…"*

**Asked for as a design, so this is a design and not a diff.** Nothing here is
built yet.

---

## Why it is invisible, honestly

The war line *does* render — the probe reads
`⚠70% → Rock Face · ⚔️ on watch · ☠6 left` — but it is **one thin line of text
above a map you are looking at**. That was my miss.

The deeper reason is structural, and it is one line of state:

```ts
hero: { hp: number; spears: number; part: number }
```

**The hero has no position.** They are everywhere and nowhere: "on watch" is a
boolean about the whole valley, a raid is an event with no path, and a fight
is a screen that appears. Nothing about the war is on the map *because nothing
about the war has a place*. Drawing red lines over the current model would be
painting a picture of something the engine does not believe in.

So the spine of this design is not the lines. It is giving the hero a place.

---

## 1. The hero has a place, and it takes time to change it

```ts
hero: {
  hp: number; spears: number; part: number;
  at: number;                                   // site id — where they stand
  trip: { to: number; left: number; secs: number } | null;
}
```

- `at` starts at the camp.
- Marching to a site walks the **laid paths**, and costs
  `WALK_SECS × (edges crossed)` — so a road network is a road network, and the
  far country is genuinely far.
- **Travel banks like every other timer** and never punishes absence
  (`docs/BRIEF.md`), exactly as the foray does.
- Arriving at held ground **starts the fight**. Fleeing or winning starts the
  walk home.

⚠️ **This kills the "hero is at two gates at once" problem for free.** The
current `onWatch` is a boolean over the whole map; it becomes *"are they
standing here"*.

## 2. Watch becomes positional — you choose which gate to hold

Today a hero at home turns away one raid **anywhere**. That is the last
non-spatial thing left, and it should go:

> A raid on site *X* is turned away only if the hero is standing at *X*.

This is the whole game the owner is asking for: three holdings filling, the
hero can be at one of them, and the map tells you which. It also makes roads
matter defensively — a stop you cannot reach in time is a stop you cannot
hold.

## 3. The goblins attack the hero

Two cases, and both are already half-built:

- **Interception.** A raid that arrives where the hero stands becomes a
  skirmish: the holding is bled by `heroHit`, the hero takes its `bite`. This
  is today's repel, made positional.
- **Ambush on the road.** ★ A raid whose path crosses the hero *in transit*
  hits them at a penalty (no guard, no aim). This is the cost of marching
  through a war, and it is what makes "keep him home" a real sacrifice rather
  than a default.

## 4. What gets drawn — the part that was asked for

| thing | how it draws | why |
|---|---|---|
| **the muster** | the holding's dot carries a filling ring, 0→1 | how close |
| **the threat** | ★ a **red dotted line**, holding → target, appearing at ~50% menace and brightening as it fills | *where*, and *at what* |
| **the raid landing** | the line flashes solid, the target flashes, a float names what was taken | that it happened |
| **the hero** | a marker at `at`, sliding along the path while `trip` runs | where they are |
| **the interception** | the threat line stops at the hero's dot | that they were stopped, and by what |

⚠️ **THE INK.** Red is `you` (#d63b26) and `foe` (#8f2f22) and `barred`
(#b03050) — three reds already, all counted by the probe. A fourth needs
measuring against every counted ink *and* against `foe` under colour blindness
before a line of it is drawn. See `test/palette.test.ts`; this repo has made
three checks vacuous this way before.

⚠️ **THE MOVING HERO BREAKS A STANDING RULE.** `docs/MAP_RECIPE.md` §9: nothing
on the board moves, because dots that drift are dots a thumb cannot hit. The
hero marker must therefore be **non-interactive** — drawn on the canvas, never
a DOM tap target — or it re-opens a bug that took two sessions to close.

## 5. What it costs

| | |
|---|---|
| engine | `at` + `trip` on the hero; `assail` becomes *march then fight*; `onWatch` becomes `onWatchAt(site)`; save migration for both fields |
| board | one new ink, a dotted threat line, a ring on held dots, a hero marker |
| checks | positional watch, travel banking, ambush, and the drawn line |
| risk | **the fight ladder is tuned to a hero who is always available.** Travel time is a real nerf to every rung, and `chad-liquidity` should re-run the ladder afterwards rather than trusting it |

## 6. The order I would build it

1. `at` + `trip` + march-then-fight, with the hero marker drawn. *Nothing else
   changes.* Look at it.
2. Positional watch. The war becomes a choice of gate.
3. The red threat lines and the muster rings.
4. Ambush on the road — last, because it is the one that can feel unfair, and
   it wants the other three on screen first to be legible.

---

## The one fork that changes the shape

**Does the hero defend only where they stand (§2), or still the whole valley
while home?**

- **Positional** is the game the owner described, and makes the map matter in
  both directions. It is also strictly harder: three raiders, one hero, and
  now the roads decide what you can reach.
- **Global-while-home** is what exists, and it is gentler.

Everything else in this design works under either. This one does not have a
right answer that I can derive — it is a difficulty decision, and it is the
owner's.
