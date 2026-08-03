# King's Roads

A solo map game about laying the kingdom's mana lines through country that
objects. Played in a phone browser; built as a PWA on GitHub Pages.

A chapter is a crossing: a start, a finish, five or six dotted routes between
them. You lay pipe, the mana follows the pipe, and what stands in the way —
washouts, old stones, somebody's cousin with a chain and a dog — gets faced
with two ten-sided dice.

Live: <https://ficfic.github.io/incrgame/>

**The design is `docs/KINGS_ROADS.md`. The queue is `docs/NEXT.md`. The rules
of work are `CLAUDE.md`.** The previous game this repo held (Semantic Drift)
was scrapped by its owner on 2026-08-02; its docs live in `docs/attic/`.

## Dice

This work is based on [Ironsworn](https://www.ironswornrpg.com), created by
Shawn Tomkin, and licensed for our use under the
[Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).
We use its action roll (one d6 plus a stat against two d10 challenge dice),
its outcome tiers, its five stats, and momentum. The economy is our own. This
is not an official Ironsworn product.

## Map

Cartographic conventions — line casing, label placement priority, water
masking land — follow
[openstreetmap-carto](https://github.com/gravitystorm/openstreetmap-carto)
(CC0). No code or artwork is copied from it.

## Running it

```
npm install
npm run dev       # local
npm run check     # svelte-check
npx vitest run    # the suite
npm run play      # plays the built app in a headless browser, counts pixels
node scripts/check-words.mjs   # the vocabulary gate
```
