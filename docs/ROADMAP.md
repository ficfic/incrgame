# Build roadmap

The durable, phased plan — so any session knows the **next concrete step**.
Milestones are thin and shippable; each ends with something you can *open on your
phone*. The rings from the scope fence (🟢 MVP → 🟡 in-vision) are respected:
we build the green slice first and earn the rest.

**How we track work:**
- **This file + `BACKLOG.md`** = durable memory (survives sessions). Update on
  every milestone.
- **In-session task checklist** = ephemeral; used live while building a milestone.

---

## 🟢 MVP — prove the fantasy (build first)

- [ ] **M0 · Skeleton.** Vite + TS + Svelte + PWA; empty `core/` engine
  (`tick`/`apply` + `GameState` type); break_eternity wrapper; GH Pages deploy;
  Vitest set up. *Deliverable: an alive, empty, installable app on your phone.*
- [ ] **M1 · Core loop slice.** `Data` resource, manual "connect" action, one
  Harvester (cost `15 × 1.15ⁿ`), fixed-tick production. *Deliverable: numbers go up.*
- [ ] **M2 · Save & offline.** Versioned save + migration stub, export/import,
  offline-progress-on-resume with a cap. *Deliverable: close & reopen keeps progress.*
- [ ] **M3 · Reasoner + first graph.** `Triples` resource, a Reasoner producing via
  the (bounded) inference multiplier, a small PixiJS graph that visibly grows.
  *Deliverable: the graph blooms — the core fantasy, proven.*
- [ ] **M4 · Sell vs keep.** `Capital` currency, a sell action (exhaustive),
  quality gating price. *Deliverable: the first taste of the soul.*

## 🟡 In-vision — earned after the MVP feels good

- [ ] Economy depth (quality factors, sell→rent transition)
- [ ] Domains tech-tree (start: General → Biology)
- [ ] AI agents + human-in-the-loop error mechanic
- [ ] CYOA event system (data + engine flags + actions)
- [ ] Self-description / Reflection prestige (4 stages)
- [ ] Content pipeline: generate content from `docs/graph/game.ttl`
- [ ] Engine in a Web Worker (once rendering is heavy)
- [ ] ESLint boundary rule enforcing core-purity

## Done

- [x] Foundation, guardrails, review agents, full design docs, economy model,
  architecture + stack. (See `DECISIONS.md`.)
