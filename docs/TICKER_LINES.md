# Ticker lines — awaiting the owner's pen

The event ticker (`src/shell/ticker.ts`) drips one-liners as things happen: two
lines at a time in the dock, no modal, nothing interrupted. It is Universal
Paperclips' actual delivery mechanism and the best narrative vehicle in this
project — and it currently holds **zero** owner lines (`OWNER_LINES = {}`).

Prose is machine-drafted and owner-edited (★ CLAUDE.md, reversed 2026-07-27).
The mechanical fallbacks below are drafts, not placeholders for a human-only
rule; iterate on them.

**How to fill:** write your line next to a trigger id; it goes into
`OWNER_LINES` in `src/shell/ticker.ts` as `'trigger-id': 'your line'`, then run
`node scripts/build-language.mjs` and `npm run check:story`.

---

## ⚠️ READ THIS BEFORE WRITING A WORD

**The dock is not a place, so standing in it teaches nothing.** A carrier word
becomes English by FREQUENCY across the beats the player has stood in
(`src/core/literacy.ts`, `LEARN_AT = 3`). The ticker has no second channel. So a
ticker line written in words no beat contains is **masked at minute zero and
masked at hour ten** — not slow, impossible.

That is not hypothetical. Every mechanical line shipped on 2026-07-28 was
written that way. Measured against the rendered beat corpus:

    online 0 · wore 0 · never 0 · out 0 · ahead 0 · vocabulary 0 · slower 0
    faster 0 · looking 0 · away 0 · first 0 · bound 0 · buy 0 · while 2

`check:story` invariant 8 now fails the build on it, by name, with the count
beside each word. It does not have to be remembered — but writing against the
list below is faster than writing against the error.

**141 word types are learnable.** The first 30 are the safe ones: every player
meets them in their first few walks, because they are the `leaf` and `continue`
frames and those cover 89% of the board.

> the · it · stops · whatever · tree · follow · to · is · and · you · not ·
> what · take · here · under · does · graph · from · means · last · said ·
> meant · divide · again · definition · down · back · up · cross · a

The other 111, in descending order of how often the board prints them:

> matching · stopped · nothing · one · on · by · file · have · go · were ·
> which · says · we · as · taught · going · graph's · serving · settle · filed ·
> thing · of · an · that · below · was · everything · in · hold · something ·
> record · someone · way · them · before · against · are · anyone · holds · for ·
> has · machines · held · two · sent · field · only · at · keep · part · people ·
> nobody · so · open · whether · filing · once · whoever · parts · shape · can ·
> or · off · arrived · why · being · read · anything · together · been · about ·
> apart · itself · say · word · name · side · be · none · checked · this ·
> another · reading · log · things · do · agreed · agreement · inside · anyway ·
> same · between · sits · asks · made · counted · outline · without · with ·
> settled · observed · allow · alive · capacity · done · its · closed · written ·
> order · set · aside

**Numbers are exempt and always legible** — `#30`, `1.5K`, `3 / 4075`. Digits
were never English.

**Interface nouns come from `${…}` holes, never typed.** `READOUTS[id].noun`,
`READOUTS[id].explain` and `MACHINES[id].label` carry their own way in (a
readout's `learned` witness). Typing `Solid` into a line instead of
interpolating it produces a word with no witness and no frequency: a permanent
blank. `watched` and `loose` are the only two bare words with an exemption, in
`EARNED_WITH`.

---

## The live triggers

Nothing else exists. `say()` falls back from `buy:extractor:30` to
`buy:extractor`, so one generic line covers every purchase count.

| Trigger id | Fires when | Mechanical draft |
|---|---|---|
| `buy:extractor` · `buy:reasoner` · `buy:checker` | any purchase (`:N` for a specific one) | `Extractor #2 is here` |
| `watch:extractor:true` | a machine set watched | `Extractor watched · it is read` |
| `watch:extractor:false` | a machine let loose | `Extractor loose · nobody read it` |
| `words:1` | the first concept bound | `Words · concepts you can read now` |
| `words:5` … `words:400` | 5 · 10 · 25 · 50 · 100 · 200 · 400 | `25 Words` |
| `rot:1` | the first whole fact worn out | `something nobody read stops here` |
| `rot:25` · `rot:250` · `rot:2500` | | `250 Rot` |
| `bottleneck:words` | production hits the vocabulary cap | `the machines have nothing to take` |
| `bottleneck:machines` | vocabulary gets ahead of the machines again | `what you hold is not filed` |
| `away-return` | returning after time away | `you were not here · 40 Solid · 9 Raw` |

**Write the milestones as ONE voice, not eight jokes.** The instruction that
matters: one voice that curdles, per `docs/VOICE.md` §1. Depth is the clock for
beats; for the ticker the clock is the milestone ladder.

---

## Removed, and why — so it is not queued a third time

- **2026-07-26.** Three rows pointed at `buy:harvester:*`. The Harvester was not
  buyable, so any line written there would never have been read.
- **2026-07-28.** The `recovered:*` ladder (10 → 2,500 concepts) is gone with the
  economy that counted them; `words:*` replaced it against a different quantity.
  The refinement-ladder chapters in `docs/CONTENT.md` tier 2 **will never fire**.
- **2026-07-28.** The "+N Datums" away-return fallback — Datums died at v9.

This is the third time prose has been queued against a mechanic that then went
away, which is the whole argument for writing lines last.
