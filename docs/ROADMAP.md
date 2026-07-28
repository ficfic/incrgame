# Build roadmap

The durable, phased plan — so any session knows the **next concrete step**.
Milestones are thin and shippable; each ends with something you can *open on your
phone*. The rings from the scope fence (🟢 MVP → 🟡 in-vision) are respected:
we build the green slice first and earn the rest.

**How we track work:**
- **This file + `BACKLOG.md`** = durable memory (survives sessions). Update on
  every milestone.
- **In-session task checklist** = ephemeral; used live while building a milestone.

> ## ⚠️ THE MILESTONE PLAN WAS OVERTAKEN. `docs/NEXT.md` IS THE QUEUE.
>
> M0–M2 shipped and are true as written. **M3, M4 and most of the in-vision
> list describe mechanics that were deleted, not deferred** — `Triples`, the
> inference multiplier, `Capital`, selling, the domain tech-tree, the four-stage
> Reflection prestige. See `docs/ECONOMY_SRR.md` (BUILT 2026-07-28) and the
> "⛔ CUT" section of `docs/GAME_DESIGN.md`.
>
> This file is kept for the M0–M2 record and for the two open infrastructure
> items at the bottom, which are still real. Do not pick work from it.

---

## 🟢 MVP — prove the fantasy (build first)

- [x] **M0 · Skeleton.** *Deliverable: an alive, empty, installable app on your
  phone.* Sub-checklist (all per `docs/SPEC.md`):
  - [x] Vite + TS + Svelte project; `base: '/incrgame/'`.
  - [x] `src/core/` engine stub: `apply(state, action)` sole reducer, `GameState`
    + all types from SPEC (`ResourceId`/`GeneratorId`/`DomainId` enumerated);
    break_eternity wrapper in `numbers.ts`.
  - [x] PWA: manifest (`start_url`/`scope` = `/incrgame/`), `apple-touch-icon` +
    apple meta tags, `vite-plugin-pwa` SW scoped `/incrgame/`, icons, `.nojekyll`.
  - [x] `.github/workflows/deploy.yml`: `npm ci` → typecheck → **`vitest run`
    (gates deploy)** → **core-purity check** (grep `src/core/**` for
    `window`/`document`/`ui`/`render` imports) → `vite build` → deploy-pages;
    least-privilege `permissions`.
  - [x] Vitest wired; 21 engine/save tests green.
  - **⚠️ Owner-side (see SPEC "Owner-side prerequisites"):** Pages Source =
    GitHub Actions ✅ *done*. Workflow `on:` covers the pinned branch **and** the
    build-session branch. Push protection: enable anytime. **iOS install: verify
    on the physical device — still open** (Safari if Edge won't).
- [x] **M1 · Core loop slice.** `Data` resource, manual "connect" action (→ Data),
  one Harvester (cost `15 × 1.15ⁿ`), fixed-tick production (10 Hz) — **plus a
  trivial 5-node graph that grows per connect** so the hook is on screen in the
  first 30s (per Chad/Redditor). *Deliverable: numbers go up + a graph reacts.* ✅
  *Verified headless in Chromium: connect, buy, 0.1/s production, graph growth.*
- [x] **M2 · Save & offline.** Versioned save (envelope + Decimal-as-string +
  migration ladder, see `SPEC.md`), export/import, offline-progress-on-resume with
  an 8h cap (freeze multipliers). *Deliverable: close & reopen keeps progress.* ✅
  *Verified: reload keeps progress (IndexedDB); away-summary banner; clipboard
  export/import with reject-on-garbage.*
- ⛔ **M3 · Reasoner + graph bloom.** VOID. `Triples`, `Data` and the inference
  multiplier are deleted. What shipped instead: a Reasoner at a flat 2.2
  facts/s, capped by vocabulary like everything else.
- ⛔ **M4 · Sell vs keep.** VOID. There is no `Capital`, no selling and no second
  currency; every price is in Solid.

## 🟡 In-vision — mostly void, checked 2026-07-28

- ⛔ Economy depth (quality factors, sell→rent transition) — no money layer.
- 🕓 Domains tech-tree — data exists (26 WordNet categories), mechanic does not.
- ✅ AI agents + human-in-the-loop — shipped as the watched/loose toggle, the
  Check verb and the Checker machine.
- ✅ CYOA — shipped as the lane graph (`src/core/starmap.ts`), not as modal
  events; `chooseOption`, `modifiers` and `flags` are deleted.
- ⛔ Self-description / Reflection prestige (4 stages) — prestige is `Retrain`,
  one action, no stages.
- 🕓 Content pipeline from `docs/graph/game.ttl` — still a design artifact.
- 🕓 Engine in a Web Worker (once rendering is heavy) — **still real.**
- 🕓 ESLint boundary rule enforcing core-purity — **still real**; today the guard
  is `npm run check:core`, a grep, and it passes.

## Done

- [x] Foundation, guardrails, review agents, full design docs, economy model,
  architecture + stack. (See `DECISIONS.md`.)
