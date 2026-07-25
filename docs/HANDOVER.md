# Handover — session of 2026-07-25 (the "zero → live game" day)

Read me first in a fresh session, after CLAUDE.md. I am the fast path; the full
trail is in `DECISIONS.md` (why), `BACKLOG.md` (what's next), `SPEC.md` (contracts).

## ⚠️ Read this first: the premise pivoted (2026-07-25, later same day)

**The game is now about knowledge RECOVERY, not knowledge conquest.** The world's
knowledge was lost to AI; the player rebuilds it from one surviving concept,
`entity`. Owner decision via chips; logged in DECISIONS.

The concepts are **real data now**: Open English WordNet, CC BY 4.0, pinned to
`2025-edition` — 107,519 concepts, 45 semantic domains, 88k is-a edges, ordered
breadth-first from `entity`.

- Generator: `scripts/build-ontology.mjs` (`npm run ontology`). Output committed
  to `public/ontology/` (53 chunks, 8.6 MB raw / ~2.7 MB gzip).
- Runtime: `src/shell/ontology.ts` — lazy, chunked, failure-tolerant.
- **`src/core/` still knows only integer node ids.** That boundary is why this
  cost zero engine changes and zero save migration. Keep it.
- **The pinned edition and the recovery order are a frozen contract** — node id
  N means concept index N. Bumping the edition renumbers the owner's world. See
  SPEC "Concept data".
- Licensing: `docs/ATTRIBUTION.md`. CC BY attribution renders in-game from the
  data manifest — **do not remove it**. SNOMED CT is dropped (not openly
  licensed).
- **The prose has NOT been rewritten to match.** That's owner work (prose
  guardrail) and it's the top backlog item. Don't let an agent voice it.

Everything below predates the pivot; the mechanical facts still hold.

## Where things stand

- **The game is LIVE**: <https://ficfic.github.io/incrgame/> (PWA, iOS-first).
- **Deploy flow**: push to `claude/incremental-game-github-pages-w7pvk6` (the
  default/pinned branch) → GitHub Action tests-gate → Pages. Session branches
  get CI but only the pinned branch may publish (environment protection).
  Working pattern used all day: commit on the session branch, then
  `git checkout <pinned> && git merge --ff-only <session> && git push`.
- **Save version: v4**, migration chain v1→v2→v3→v4 all tested end-to-end.
  The owner plays their real save — it has survived three core-model pivots
  today. Keep it that way.

## The current game (Frontier Mining, owner-chosen loop)

- **Edges ARE the income**: each statement (Triple) drips 0.15 Datums/s
  (`ratePerSecond` in `src/core/engine.ts`).
- **Survey** (big button, free, frontier cap 8) reveals entities on a
  stationary outer ring; **tapping one on the canvas** pays
  `ceil(5 × 1.08^edges)` Datums to wire it in → +1 Triples.
- Machines: Ingestion Pipeline™ (15 × 1.15ⁿ, +0.1 Datums/s). Extractor/Reasoner
  are content stubs awaiting M3.
- **State**: `forged` = { anchors ≤240, links ≤512 (oldest fold to aggregates),
  frontier ≤8, foldedNodes } + Dec balances. `graph` counters are a derived
  cache, never balance inputs. Explicit pairs come only from player actions;
  machines will forge into aggregates. RNG exists but is consumed by nothing
  until M3.
- UI extras: event ticker (mechanical lines only — owner writes flavor, see
  `TICKER_LINES.md`), export/import, two-tap Flush project, pan/zoom canvas,
  palette hue drifts with graph size, per-event FX (node pulse / edge flash /
  wandering touch highlight).

## File map (~1,700 LOC, 1 runtime dep)

`src/core/` pure engine (reducer, numbers, graph derive + frozen migration
fossils, save+migrations, offline, rng) · `src/content/` data · `src/shell/`
loop/storage/ticker (browser-facing) · `src/ui/` App + GraphPanel ·
`src/render/minigraph.ts` canvas skin (**designated throwaway** — PixiJS
replaces it at M3; don't gold-plate).

## Invariants (enforced or sacred)

1. Never break a save — additive migrations only; migration steps are frozen
   once shipped; `projectGraph` bands are fossils, do not retune.
2. `src/core/` never touches DOM/ui/render — CI greps and fails the deploy.
3. All player-facing flavor prose is owner-written (ticker enforces this).
4. Manual play must never be mandatory (automation buys out every verb).
5. Graph counters (JS numbers) are the picture; balances (Decimals) are the
   truth. The M3 multiplier reads `resources.triples`.

## Review agents — use them, they earn their keep

`chad-liquidity` (fun/economy numbers) · `the-redditor` (genre authenticity) ·
`the-graph` (consistency/code; demands DECISIONS entries — comply) ·
`prof-veritas` (theory accuracy) · `the-auditor` (public-repo safety).
Today they materially changed the loop design (Datums-not-Inference,
automation deadline, count-vs-topology state ruling). Owner decides via
AskUserQuestion chips; log every real decision.

## Open items, in order

1. **Owner**: verify iOS home-screen install on the physical phone (last M0
   box); write the first ticker-line batch (`TICKER_LINES.md`).
2. **M3, re-scoped** (the big one): Extractor auto-claims into aggregates
   (~min 9, no-babysitting deadline), Reasoner multiplier
   `1 + level·log10(1+triples)/10` **shown on screen**, PixiJS bloom with
   production-driven motion, M3 ticker triggers. Then **M4 fast** (sell —
   Capital, exhaustive, quality-gated).
3. Watch-list from the architecture review: split `App.svelte` when the shop
   grows; migration ladder grows by design; ESLint boundary rule still
   deferred (grep gate covers it).
4. Pacing check worth one playtest: fresh start = 15 Datums, first claim ~11s,
   but pre-machine income is drip-only — if the gap to the first Pipeline (15)
   feels slow, tune `DRIP_PER_EDGE` or `START_DATA` (knobs at top of
   `engine.ts`).

## Session log (one line each)

M0 skeleton+PWA+deploy → M1 loop → M2 saves/offline → first Pages deploy
(fixed env-protection skip) → owner feedback #1 (LOD freeze at 143, nodes==edges,
integers, pan/zoom, progress colors) → polish (ticker, floats, Datums name via
chips) → one-substance v2 → banded slowdown + typed FX v3 → flush + wandering
touch → **Frontier Mining v4** (3-agent review, owner chips) → architecture
review (lean; 1 dep; ~36 KB gzip; pivot-proof).
