# Handover — 2026-08-02

**Read `docs/KINGS_ROADS.md`. It is the design and it is the owner's.**
Then `CLAUDE.md` for how we work. Everything else in `docs/` is either a check
on this or history.

---

## Where the project actually is

The game is **King's Roads**. It was re-founded from nothing on 2026-08-02 after
the owner reviewed every idea on the table item by item.

**Nineteen of twenty generated ideas were scrapped**, including an entire
invented world — a road crew, a chief engineer, four families, a haulage
economy, four skills. The one survivor was a lint check.

⚠️ **Take that seriously rather than personally.** The pattern across this whole
project is that the owner's own lines survive and elaboration on them does not.
The most useful thing this session did was stop generating and start
transcribing. `KINGS_ROADS.md` marks its few inferences ⟨inferred⟩ so they can
be struck without disturbing the rest — keep that convention.

## What the game is, in five lines

1. A caravan over the pass is lost to weather and bandits. You run through the
   night and end up nowhere. You were the road crew, so you have the tools, and
   building the road is simply the job.
2. **A chapter is a crossing** — a start, a finish, and five or six dotted
   routes between them. **You build one, end to end. Done is done.**
3. **Mana flows out along built road.** It is why you cannot build from the
   middle, and why the opening walks you back to where the king's road ends.
4. Mana is **scarce until a region is finished and abundant once it is** — the
   resource itself says when to leave.
5. Words: **stops and roads.** Never node, edge or dot.

## What is live on the phone right now

`https://ficfic.github.io/incrgame/` — deploy branch
`claude/incremental-game-github-pages-w7pvk6`.

⚠️ **It is the OLD game.** Settling, working, a skill, doors, keys, fights. All
of it was scrapped in review after it deployed. Do not treat what is live as the
target; it is what is being replaced.

## The state of the tree

- **`npm run guard` is RED on purpose.** `scripts/check-words.mjs` enforces
  stops and roads; 33 player-facing strings still say node and edge, all inside
  the scrapped loop. **They go when the loop goes.** Do not fix them one by one,
  and do not weaken the check — that is how "dot" survived three requests.
- Everything is committed and pushed to `claude/whats-next-rst6c8`.

## What stands, and is worth keeping

| | |
|---|---|
| the board | canvas, d3-force, pan, zoom, drag, the fill animation the owner liked |
| the terrain bake | scenery and river into one offscreen bitmap, one `drawImage` a frame |
| the four tabs | the owner's ask; nothing overlays anything (`docs/TABS.md` R2.2) |
| the layout solver | deterministic, tested |
| `ink.ts` | one palette; the probe reads it off the running page so it cannot drift |
| the save layer | IndexedDB; refuses a save it cannot honour rather than half-loading |
| `scripts/play-tabs.mjs` | plays the real UI in a real browser. **This is the check that matters** |
| `scripts/check-words.mjs` | the vocabulary gate |

## What is scrapped

Settling · working · the skill · the doors · the keys · the fights · max-flow
income · the nameless resource · **and the 37 hand-written places**, which were
machine-written by earlier sessions and cut once the attribution was corrected.

`src/slice/` still holds that prose. It is not content any more.

## Five things this session learned the hard way

1. **The probe greps player-facing text**, so renaming a label silently
   invalidates it. Four checks broke that way in one afternoon and one had gone
   quietly vacuous. After any wording change, re-read every matcher in
   `play-tabs.mjs` against what the game now says.
2. **A guard can pass for the wrong reason.** `check-words.mjs` first read only
   string literals — and `<p>Tap a dot.</p>` is a text node, so the single worst
   offender sailed through and the sabotage left it green. It reads markup now.
3. **A sabotage can itself be vacuous.** One "proof" added `Math.floor(0.2 ×
   0.43)` per tick, which is zero, so it proved nothing. Check the sabotage
   really does the bad thing before trusting the red.
4. **Nothing was live for five sessions.** Work was pushed to a working branch
   and never fast-forwarded onto the deploy branch, so the owner played an old
   build and reasonably asked why nothing had changed. **Deploying is part of
   shipping.**
5. **`.deed:disabled` sat above `.deed.make` at equal specificity**, so every
   shut button drew as live. Found by looking at a screenshot, not by a test.

## The next item

At the top of `docs/NEXT.md`: **delete the scrapped loop**, so the word gate goes
green because the strings are gone rather than rewritten. Then the King's Roads
zero — stops, roads, travel, and mana that only reaches along what is built.

## The five open questions

At the foot of `docs/KINGS_ROADS.md`. **They are the owner's to answer.** Do not
invent a stop's contents, the stat list, or the resource list; inventing those is
precisely what got scrapped.
