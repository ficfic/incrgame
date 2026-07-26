# Ticker lines — awaiting the owner's pen

The event ticker (`src/shell/ticker.ts`) drips one-liners as things happen: two
lines at a time in the dock, no modal, nothing interrupted. It is Universal
Paperclips' actual delivery mechanism and the best narrative vehicle in this
project — and it currently holds **zero** owner lines (`OWNER_LINES = {}`).

Per the prose guardrail (★ CLAUDE.md), **every flavour line a player reads is
human-written.** Until you write them the ticker uses mechanical fallbacks
assembled from labels and numbers — factual, never authored.

**How to fill:** write your line next to a trigger id; it goes into
`OWNER_LINES` in `src/shell/ticker.ts` as `'trigger-id': 'your line'`.

See `docs/CONTENT.md` for where this sits in the writing order. Short version:
**this table is tier 1, reach 100%, and it is the highest-value hour available.**

---

## The milestone sequence — write it as ONE voice, not eight jokes

This is the tonal arc, pre-numbered and pre-wired. The instruction that matters:
**do not write eight independent jokes.** Write one voice that curdles.

| Trigger id | Fires when | Mechanical fallback | Your line |
|---|---|---|---|
| `recovered:10` | 10 concepts on the board | "10 concepts recovered" | |
| `recovered:25` | 25 | "25 concepts recovered" | |
| `recovered:50` | 50 | "50 concepts recovered" | |
| `recovered:100` | 100 | "100 concepts recovered" | |
| `recovered:250` | 250 — **the turn.** GAME_DESIGN puts the curdle here | "250 concepts recovered" | |
| `recovered:500` | 500 | "500 concepts recovered" | |
| `recovered:1000` | 1,000 | "1000 concepts recovered" | |
| `recovered:2500` | 2,500 — should not be funny | "2500 concepts recovered" | |

## Other live triggers

| Trigger id | Fires when | Mechanical fallback | Your line |
|---|---|---|---|
| `away-return` | returning after ≥5 min away | banked-work summary | |

---

## Removed, 2026-07-26 — triggers that could never fire

Three rows here pointed at `buy:harvester:1 / :5 / :10`. **The Harvester is not
on `M1_ROSTER` and cannot be bought**, so any line written against those ids
would never have been read by a single player. The old "+N Datums" fallback for
`away-return` was also stale — Datums were deleted at v9, and the bottom rung of
the new ladder is **tokens** (see `docs/ECONOMY.md`).

Recorded rather than silently deleted, because "write prose for content that can
never fire" is a mistake this project has now made twice.

## Known defect before you write numbered triggers

`say(\`buy:${g.id}:${after}\`)` fires on **every** purchase, unbounded — so by
Extractor #30 the same line repeats forever. Generic fallbacks need wiring
(`buy:extractor` matching any count) before the first numbered batch is worth
writing.

## Not yet — the ladder's own beats

The refinement ladder (`docs/ECONOMY.md`) adds a chapter per checkpoint. Those
trigger ids are specified in `docs/CONTENT.md` tier 2 and will be added here when
the economy is built. **Do not write them yet**: the shape may still move, and
writing against a shape that moves is the same mistake as balancing numbers that
are about to be replaced.
