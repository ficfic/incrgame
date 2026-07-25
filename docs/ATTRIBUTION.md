# Attribution — third-party data used by this game

This game's concept graph is **not invented**. It is a real, published lexical
ontology, used under its licence. This file is the attribution that licence
requires; it is also the honest answer to "where did all these words come from?"

Code in this repo is MIT. Original docs/content are CC BY 4.0. The datasets
below keep their own licences, listed here in full.

---

## Open English WordNet — the concept spine

| | |
|---|---|
| **Used for** | every concept the player recovers: name, semantic domain, is-a parent, definition |
| **Edition pinned** | `2025-edition` (released 2025-12-31) |
| **Where it lives here** | `public/ontology/` (generated), `scripts/build-ontology.mjs` (generator) |
| **Homepage** | <https://en-word.net/> |
| **Source repo** | <https://github.com/globalwordnet/english-wordnet> |
| **Licence** | Creative Commons Attribution 4.0 International (**CC BY 4.0**) — <https://creativecommons.org/licenses/by/4.0/> |

> Open English WordNet is a fork of **Princeton WordNet**, developed under an
> open-source methodology by the Open English WordNet team. Attribution is owed
> to both Princeton WordNet and the Open English WordNet team.

**What we changed.** We did not alter a single definition or word form. The
pipeline selects synsets from the 45 lexicographer files, orders them
breadth-first from the root concept `entity`, and re-serialises the result as
JSON chunks. Definitions are copied **verbatim**; nothing is rewritten,
summarised, or generated. Adaptation is limited to selection, ordering and
file format.

**Where the credit is shown.** In-game, permanently, in the footer of the main
screen (`src/ui/App.svelte`), rendered from the generated
`public/ontology/index.json` so it cannot drift out of sync with the data. Also
here, and in `README.md`.

### Princeton WordNet notice

Open English WordNet derives from Princeton WordNet, distributed under the
WordNet Licence, which requires this notice to be carried:

> WordNet Release 3.0 — This software and database is being provided to you,
> the LICENSEE, by Princeton University under the following license. By
> obtaining, using and/or copying this software and database, you agree that
> you have read, understood, and will comply with these terms and conditions:
> Permission to use, copy, modify and distribute this software and database and
> its documentation for any purpose and without fee or royalty is hereby
> granted, provided that you agree to comply with the following copyright
> notice and statements, including the disclaimer, and that the same appear on
> ALL copies of the software, database and documentation, including
> modifications that you make for internal use or for distribution.
>
> WordNet 3.0 Copyright 2006 by Princeton University. All rights reserved.
>
> THIS SOFTWARE AND DATABASE IS PROVIDED "AS IS" AND PRINCETON UNIVERSITY MAKES
> NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY OF EXAMPLE, BUT
> NOT LIMITATION, PRINCETON UNIVERSITY MAKES NO REPRESENTATIONS OR WARRANTIES
> OF MERCHANTABILITY OR FITNESS FOR ANY PARTICULAR PURPOSE OR THAT THE USE OF
> THE LICENSED SOFTWARE, DATABASE OR DOCUMENTATION WILL NOT INFRINGE ANY THIRD
> PARTY PATENTS, COPYRIGHTS, TRADEMARKS OR OTHER RIGHTS.
>
> The name of Princeton University or Princeton may not be used in advertising
> or publicity pertaining to distribution of the software and/or database.
> Title to copyright in this software, database and any associated
> documentation shall at all times remain with Princeton University and
> LICENSEE agrees to preserve same.

---

## Planned later tiers — cleared for licence, not yet shipped

These are the intended domain unlocks. Each is listed with the licence check
already done, so a future session doesn't have to redo it. **None are in the
build yet**; adding one means adding its notice to this file first.

| Dataset | Scale | Licence | Verdict |
|---|---|---|---|
| **schema.org** | 823 types, 1,529 properties | CC BY-SA 3.0 | usable; ShareAlike applies to the vocabulary, keep it isolated and attributed |
| **Gene Ontology** | ~40k terms | CC BY 4.0 | clean |
| **FIBO** (finance) | large | **MIT** | clean |
| **Wikidata / Open English Namenet** | 100M+ items | CC0 | cleanest licence of all; size is the only obstacle |

### Explicitly rejected

- **SNOMED CT** — named in early design docs as the medicine domain. It is
  **not** openly licensed: use requires an IHTSDO/SNOMED International affiliate
  licence, and member-country free use does not extend to redistributing terms
  inside a public game. **Do not ship SNOMED content.** If a medicine domain is
  wanted, use an openly licensed alternative (e.g. MONDO, HPO, or the
  openly-licensed subset of the NCI Thesaurus) and record the check here.
- **ConceptNet** — CC BY-SA 4.0. Usable in principle, but ShareAlike over the
  game's central content dataset is a bigger commitment than CC BY, and the
  dumps are not reachable from the build environment.
- **SUMO extensions** — GPL. Awkward inside an MIT codebase; avoid unless the
  data is kept strictly separate and the obligation is understood.

---

## Rules for adding any future dataset

1. **Check the licence before writing any code against it.** Record the finding
   in the table above whether the answer is yes or no.
2. **Attribute in three places**: this file, the README, and in-game.
3. **Never let the pipeline generate prose.** Definitions may be quoted verbatim
   from a licensed source; sentences may not be synthesised. See `CLAUDE.md`.
4. **Pin the edition.** The recovery order is a save-visible contract
   (`docs/SPEC.md`); an unpinned upstream would silently renumber the world.
