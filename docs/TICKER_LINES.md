# Ticker lines — awaiting the owner's pen

The event ticker (`src/shell/ticker.ts`) drips one-liners as things happen.
Per the prose guardrail (★ CLAUDE.md), **every flavor line a player reads is
human-written**. Until you write them, the ticker uses mechanical fallbacks
assembled from labels + numbers ("Ingestion Pipeline™ #3 online") — factual,
never authored.

**How to fill:** write your line next to a trigger id, then it goes into
`OWNER_LINES` in `src/shell/ticker.ts` (`'trigger-id': 'your line'`). Numbered
triggers accept a generic id too (`buy:harvester` fires for any count if the
exact `buy:harvester:N` id has no line — ask Claude to wire generic fallbacks
when you deliver the first batch).

Register to aim for (from GAME_DESIGN): satirical startup surface, ominous awe
spine. Early lines = startup theater; later milestones can start whispering.

| Trigger id | Fires when | Mechanical fallback | Your line |
|---|---|---|---|
| `buy:harvester:1` | first Ingestion Pipeline™ | "Ingestion Pipeline™ #1 online" | |
| `buy:harvester:5` | fifth | "Ingestion Pipeline™ #5 online" | |
| `buy:harvester:10` | tenth | "Ingestion Pipeline™ #10 online" | |
| `nodes:10` | graph reaches 10 nodes | "graph: 10 nodes" | |
| `nodes:25` | 25 nodes | "graph: 25 nodes" | |
| `nodes:50` | 50 nodes | "graph: 50 nodes" | |
| `nodes:100` | 100 nodes | "graph: 100 nodes" | |
| `nodes:250` | 250 nodes (past the drawn cap — the halo appears) | "graph: 250 nodes" | |
| `nodes:500` | 500 nodes | "graph: 500 nodes" | |
| `nodes:1000` | 1,000 nodes | "graph: 1000 nodes" | |
| `away-return` | returning after ≥5 min away | "while away: +N Datums" | |

**Wanted for M3 (write whenever):** first Extractor, first Triple, first
Reasoner, first inference-multiplier tick, graph "bloom" moment. Trigger ids
will be added when M3 lands.
