// The speed-versus-truth loop: provenance, drift, review, the plateau, and the
// generational ratchet. These are the claims the whole design rests on, so
// they get asserted rather than asserted-about-in-a-README.
import { describe, expect, it } from 'vitest';
import {
  apply, coverage, driftPerSecond, fidelity, initialState, lit, recovered,
  displayedFidelity, recoveryPerSecond, REFLECT_MIN_CONCEPTS, sourceAgreement,
  tick, verified, DISCOVER_MS, CONNECT_MS, attentionFree, pendingVignette,
  attentionCap, extractionPerSecond, contextWindow, contextFull, inContext,
} from '../src/core/engine';
import { applyOfflineProgress } from '../src/core/offline';
import { deserialize, serialize } from '../src/core/save';
import { CONCEPT_BUDGET } from '../src/content/ontologyMeta';
import { GENERATORS } from '../src/content/generators';
import { ANCHOR_CAP } from '../src/core/graph';
import { VIGNETTES } from '../src/content/vignettes';
import type { GameState } from '../src/core/types';
import { get } from 'svelte/store';
import { say, ticker, OWNER_LINES_FOR_TEST } from '../src/shell/ticker';

const withExtractors = (n: number, s = initialState()): GameState =>
  ({ ...s, generators: { ...s.generators, extractor: n } });

describe('provenance', () => {
  it('starts perfectly trustworthy and empty', () => {
    const s = initialState();
    expect(verified(s)).toBe('0');
    expect(fidelity(s)).toBe(1);
  });

  it('lands a discovered concept DARK — finding is not recovering', () => {
    // Discovery used to mint a free verified statement and a guaranteed node,
    // which is what made the whole world hand-completable in ~2h34m without
    // ever buying a machine. A found concept now sits on the board with its
    // connections merely dotted, and counts for nothing until one is filled.
    let s: GameState = { ...initialState(), lastTick: 1_000 };
    s = apply(s, { type: 'discover' });
    s = apply(s, { type: 'tick', dt: 20, now: 1_000 + DISCOVER_MS + 1 });
    expect(s.forged.anchors).toContain(1);   // it is on the board
    expect(s.forged.edges).toHaveLength(0);  // and connected to nothing
    expect(s.resources.triples).toBe('0');   // no free statement
    expect(recovered(s)).toBe(0);            // and it does not count yet
  });

  it('a filled line is what recovers a concept, and it arrives checked', () => {
    let s: GameState = { ...initialState(), lastTick: 1_000 };
    s = apply(s, { type: 'discover' });
    s = apply(s, { type: 'tick', dt: 20, now: 1_000 + DISCOVER_MS + 1 });
    expect(recovered(s)).toBe(0);

    const t0 = s.lastTick;
    s = apply(s, { type: 'connect', edge: { a: 0, b: 1, rel: 0, checked: true, fake: false } });
    expect(s.bookings.some((b) => b.kind === 'connect')).toBe(true);
    expect(s.forged.edges).toHaveLength(0); // not until it finishes filling
    s = apply(s, { type: 'tick', dt: 20, now: t0 + CONNECT_MS + 1 });

    expect(s.forged.edges).toHaveLength(1);
    expect(s.forged.edges[0]!.checked).toBe(true);
    expect(recovered(s)).toBe(2);           // both ends are now lit
    expect(fidelity(s)).toBe(1);
  });

  it('machine output arrives UNVERIFIED, never verified', () => {
    const s = tick(withExtractors(10), 10);
    expect(Number(s.resources.triples)).toBeGreaterThan(0);
    // some of it has already begun to rot, which is the point — but none of it
    // is verified, because no machine in this game can verify its own output
    expect(Number(s.provenance.unverified)).toBeGreaterThan(0);
    expect(Number(s.provenance.unverified) + Number(s.provenance.drifted))
      .toBeCloseTo(Number(s.resources.triples), 5);
    expect(verified(s)).toBe('0');
  });

  it('never lets the three parts disagree with the total', () => {
    let s = withExtractors(20);
    for (let i = 0; i < 200; i++) s = tick(s, 1);
    const total = Number(s.resources.triples);
    const parts = Number(s.provenance.unverified) + Number(s.provenance.drifted) + Number(verified(s));
    expect(parts).toBeCloseTo(total, 5);
  });
});

describe('drift', () => {
  it('rots the unverified pool over time', () => {
    let s = tick(withExtractors(50), 5);
    const before = Number(s.provenance.drifted);
    for (let i = 0; i < 60; i++) s = tick(s, 1);
    expect(Number(s.provenance.drifted)).toBeGreaterThan(before);
  });

  it('cannot rot what was verified by hand', () => {
    let s: GameState = { ...initialState(), lastTick: 1_000 };
    s = apply(s, { type: 'discover' });
    s = apply(s, { type: 'tick', dt: 20, now: 1_000 + DISCOVER_MS + 1 });
    for (let i = 0; i < 500; i++) s = tick(s, 1);
    expect(s.provenance.drifted).toBe('0');
    expect(fidelity(s)).toBe(1);
  });

  it('drives fidelity DOWN as machines outpace review', () => {
    let s = withExtractors(30);
    for (let i = 0; i < 30; i++) s = tick(s, 1);
    const early = fidelity(s);
    for (let i = 0; i < 300; i++) s = tick(s, 1);
    expect(fidelity(s)).toBeLessThanOrEqual(early + 1e-12);
  });
});

describe('the plateau — the reason the goal is unreachable', () => {
  it('gates concept recovery on fidelity SQUARED — half-trust is far worse than half', () => {
    const clean: GameState = { ...initialState(), generators: { ...initialState().generators, reasoner: 10 } };
    const fast = recoveryPerSecond(clean);
    const dirty: GameState = {
      ...clean,
      resources: { ...clean.resources, triples: '100' },
      provenance: { unverified: '0', drifted: '90' },
    };
    expect(fidelity(dirty)).toBeCloseTo(0.1, 5);
    // 10% fidelity buys ~1% of the rate, not 10% (f², times the remaining term)
    expect(recoveryPerSecond(dirty)).toBeLessThan(fast * 0.02);
    expect(recoveryPerSecond(dirty)).toBeGreaterThan(0);
  });

  it('makes the tail HARDER as trust falls, without ever walling off', () => {
    // This used to be a hard ceiling — `(f - coverage) / f` clamps to zero once
    // coverage passes fidelity, so Reasoners produced EXACTLY nothing however
    // many you owned. Prestige carries coverage at 100%, so a completed run
    // returned at coverage ~0.94 against an achievable f of ~0.6 and generation
    // 2 could never recover a single concept. The prestige loop was a dead end
    // that cost you your machines.
    const gens = { ...initialState().generators, reasoner: 10 };
    const at = (nodes: number, unver: string, drift: string): number => recoveryPerSecond({
      ...initialState(), generators: gens,
      forged: { ...initialState().forged, foldedNodes: String(nodes) },
      resources: { ...initialState().resources, triples: '100' },
      provenance: { unverified: unver, drifted: drift },
    });
    // low trust still recovers, just very slowly — the tail, not a wall
    expect(at(CONCEPT_BUDGET * 0.61, '0', '40')).toBeGreaterThan(0);
    // and lower trust is strictly worse at the same coverage
    expect(at(CONCEPT_BUDGET * 0.61, '0', '60')).toBeLessThan(at(CONCEPT_BUDGET * 0.61, '0', '40'));
    // the ONLY hard stop is the edge of the world
    expect(at(CONCEPT_BUDGET, '0', '0')).toBe(0);
  });

  it('leaves generation 1 numerically untouched by that change', () => {
    // `(1 - coverage) * f` is byte-identical to `(f - coverage) / f` at f = 1,
    // which is every player in generation 1. The retune must not have moved a
    // single number that was already measured.
    const gens = { ...initialState().generators, reasoner: 10 };
    const base = Number(GENERATORS.reasoner.baseRate) * 10;
    for (const share of [0, 0.25, 0.5, 0.9]) {
      const st: GameState = {
        ...initialState(), generators: gens,
        forged: { ...initialState().forged, foldedNodes: String(CONCEPT_BUDGET * share) },
      };
      // at f = 1 the old `(f - coverage) / f` and the new `(1 - coverage) * f`
      // are the same expression, so this is the old behaviour asserted exactly
      expect(recoveryPerSecond(st)).toBeCloseTo(base * (1 - coverage(st)), 9);
    }
  });

  it('stops recovery dead at zero fidelity', () => {
    const dead: GameState = {
      ...initialState(),
      generators: { ...initialState().generators, reasoner: 99 },
      resources: { ...initialState().resources, triples: '100' },
      provenance: { unverified: '0', drifted: '100' },
    };
    expect(recoveryPerSecond(dead)).toBe(0);
  });

  it('never recovers past the edge of the dataset', () => {
    const done: GameState = {
      ...initialState(),
      generators: { ...initialState().generators, reasoner: 99 },
      forged: { ...initialState().forged, foldedNodes: String(CONCEPT_BUDGET + 5000) },
    };
    expect(recovered(done)).toBe(CONCEPT_BUDGET);
    expect(coverage(done)).toBe(1);
    expect(recoveryPerSecond(done)).toBe(0);
  });
});

describe('the world can no longer be finished by hand alone', () => {
  it('tapping Discover forever recovers nothing without lines', () => {
    // The defect this replaces: 4096 discoveries completed the entire dataset
    // at fidelity 1.000 in ~2h34m, with zero machines, because discovery minted
    // a node AND a verified statement. Now a found concept is dark until a line
    // is filled, and filling lines competes for the same attention slots.
    let s: GameState = { ...initialState(), lastTick: 1_000 };
    let t = 1_000;
    // Long enough for ~20 discovery cycles at whatever the current tempo is.
    // This was a flat 400 steps, tuned to an 18-second discovery; slowing the
    // game down to 40 seconds failed the test without anything being wrong.
    const STEPS = Math.ceil((20 * DISCOVER_MS) / 1000);
    for (let step = 0; step < STEPS; step++) {
      for (let k = 0; k < 8; k++) {
        const next = apply(s, { type: 'discover' });
        if (next === s) break;
        s = next;
      }
      t += 1000;
      s = apply(s, { type: 'tick', dt: 1, now: t });
    }
    // The window does not stop discovery — it drops the oldest OUT of context
    // (an earlier version of this test asserted a hard stop, which was the
    // circular-deadlock design). Concepts keep landing; none of them count.
    expect(s.forged.anchors.length).toBeGreaterThan(50);
    expect(contextFull(s)).toBe(true);
    expect(inContext(s).length).toBe(contextWindow(s));
    // ...and none of them recovered, because nothing was ever connected
    expect(s.forged.edges).toHaveLength(0);
    expect(recovered(s)).toBe(0);
    expect(coverage(s)).toBe(0);
  });

  it('folding a DARK concept off the board credits nothing', () => {
    // The exploit this closes: `foldedNodes += 1` fired on every eviction,
    // regardless of whether the concept had ever been connected. Past the
    // 240-anchor cap that made pure Discover-spam worth 3,856 / 4,096 coverage
    // with zero lines drawn and zero lit concepts — the same 2h34m hand-only
    // completion v11 exists to close, relocated one window along.
    // The window is opened to the render ceiling on purpose: this test is about
    // what a FOLD credits, so the fold path has to be reachable at all.
    let s: GameState = {
      ...initialState(), lastTick: 1_000, lifetimeVerified: '1e6',
      contextWindow: ANCHOR_CAP,
    };
    let t = 1_000;
    for (let step = 0; step < 40_000 && s.forged.anchors.length <= ANCHOR_CAP + 30; step++) {
      for (let k = 0; k < 24; k++) {
        const next = apply(s, { type: 'discover' });
        if (next === s) break;
        s = next;
      }
      t += 1000;
      s = apply(s, { type: 'tick', dt: 1, now: t });
    }
    expect(s.forged.anchors.length).toBe(ANCHOR_CAP); // the cap was exercised
    expect(s.forged.edges).toHaveLength(0);
    expect(lit(s)).toBe(0);
    expect(Number(s.forged.foldedNodes)).toBe(0);     // nothing dark was credited
    expect(recovered(s)).toBe(0);
  });

  it('an unchecked line ROTS, and its concepts go dark again', () => {
    // This is the mechanism that lets coverage FALL — the thing three balance
    // passes could not achieve by tuning, because nothing in the model could
    // ever reduce it.
    let s: GameState = {
      ...initialState(), lastTick: 1_000,
      forged: {
        ...initialState().forged,
        anchors: [0, 1, 2],
        nextId: 3,
        edges: [{ a: 0, b: 1, rel: 0, checked: false, fake: false }],
      },
      resources: { ...initialState().resources, triples: '400' },
      provenance: { unverified: '400', drifted: '0' },
    };
    expect(recovered(s)).toBe(2);
    for (let i = 0; i < 2000 && s.forged.edges.length > 0; i++) s = tick(s, 1);
    expect(s.forged.edges).toHaveLength(0); // the line un-filled
    expect(recovered(s)).toBe(0);           // and both ends went dark
  });

  it('a line you drew yourself never rots', () => {
    let s: GameState = {
      ...initialState(), lastTick: 1_000,
      forged: {
        ...initialState().forged,
        anchors: [0, 1], nextId: 2,
        edges: [{ a: 0, b: 1, rel: 0, checked: true, fake: false }],
      },
      resources: { ...initialState().resources, triples: '400' },
      provenance: { unverified: '400', drifted: '0' },
    };
    for (let i = 0; i < 5000; i++) s = tick(s, 1);
    expect(s.forged.edges).toHaveLength(1);
    expect(recovered(s)).toBeGreaterThanOrEqual(2);
  });
});

// ── the trap, relocated ────────────────────────────────────────────────────
//
// A `describe('review (human in the loop)')` block lived here and tested the
// review desk: an acceptance-sampling queue over an abstract statement pool.
// The desk is deleted — it touched nothing the player could see, and the owner
// said so ("review does not make any sense, i got so confused").
//
// One thing in it was load-bearing and is kept, moved onto the board: certifying
// a lie. An unwatched machine invents connections the dataset does not contain,
// drawn identically to real ones. Confirming one raises `checked` and does
// nothing to your graph, and the game never says. That is the whole satire, and
// with the desk gone this is the ONLY thing feeding `falselyVerified`.
describe('certifying a lie', () => {
  const withProposal = (fake: boolean): GameState => {
    const base = initialState(1);
    return {
      ...base,
      lastTick: 1_000,
      resources: { ...base.resources, triples: '1' },
      provenance: { unverified: '1', drifted: '0' },
      forged: {
        ...base.forged,
        anchors: [0, 1],
        edges: [{ a: 1, b: 0, rel: 0, checked: false, fake }],
      },
    };
  };
  const confirm = (s: GameState): GameState => {
    const booked = apply(s, { type: 'connect', edge: s.forged.edges[0]! });
    return tick(booked, CONNECT_MS / 1000 + 0.1);
  };

  it('a REAL proposal confirms cleanly', () => {
    const after = confirm(withProposal(false));
    expect(after.forged.edges[0]!.checked).toBe(true);
    expect(Number(after.falselyVerified)).toBe(0);
    // displayed and true fidelity agree, because nothing was certified wrongly
    expect(fidelity(after)).toBeCloseTo(displayedFidelity(after), 9);
  });

  it('a FAKE proposal raises the number on screen and NOT the graph', () => {
    const after = confirm(withProposal(true));
    expect(after.forged.edges[0]!.checked).toBe(true);
    expect(Number(after.falselyVerified)).toBe(1);
    // The gap. `checked` counts it; the fidelity that gates recovery does not.
    expect(displayedFidelity(after)).toBeGreaterThan(fidelity(after));
  });

  it('confirming does NOT launder the lie — `fake` survives', () => {
    // It used to be cleared on confirm, which quietly deleted the entire
    // mechanic: every invented line became true the moment you believed it.
    const after = confirm(withProposal(true));
    expect(after.forged.edges[0]!.fake).toBe(true);
    // ...and `agreeing` is the number that keeps disagreeing with you.
    expect(sourceAgreement(after)).toBeLessThan(1);
  });
});

describe('offline — you never come back to damage', () => {
  it('banks machine output instead of putting it in the graph', () => {
    const s = { ...withExtractors(10), lastTick: 1_000 };
    const r = applyOfflineProgress(s, 1_000 + 3600_000);
    expect(Number(r.banked)).toBeGreaterThan(0);
    expect(Number(r.state.pending)).toBeCloseTo(Number(r.banked), 5);
    expect(r.state.resources.triples).toBe(s.resources.triples); // untouched
  });

  it('cannot rot anything while away', () => {
    const s: GameState = {
      ...withExtractors(10),
      lastTick: 1_000,
      resources: { ...initialState().resources, triples: '500' },
      provenance: { unverified: '500', drifted: '0' },
    };
    const r = applyOfflineProgress(s, 1_000 + 8 * 3600_000);
    expect(r.state.provenance.drifted).toBe('0');
    expect(fidelity(r.state)).toBe(fidelity(s));
  });

  it('absorbs banked work in SLICES, so returning is never a fidelity cliff', () => {
    // Fidelity is a ratio. Tipping an 8h bank into a small graph in one tap
    // multiplied the denominator ~100x and cost four orders of magnitude of
    // recovery — "you never come back to damage" held only in the letter.
    const s: GameState = { ...initialState(), pending: '10000' };
    const after = apply(s, { type: 'absorb' });
    expect(Number(after.pending)).toBeGreaterThan(0);           // some still banked
    expect(Number(after.pending)).toBeLessThan(10000);          // some absorbed
    expect(after.resources.triples).toBe(after.provenance.unverified); // arrives unchecked
    // and it does drain fully with repeated taps
    let t = after;
    for (let i = 0; i < 200 && Number(t.pending) > 0; i++) t = apply(t, { type: 'absorb' });
    expect(t.pending).toBe('0');
  });

  it('respects the supervision split you left set', () => {
    // Away time used to run every agent at FULL rate and bank all of it
    // unchecked. Closing the game was therefore +82% throughput and −100%
    // verification: the supervision dial, the game's one real decision, was
    // strictly worse than the app switcher.
    const watched: GameState = { ...withExtractors(10), supervised: 10, lastTick: 1_000 };
    const loose: GameState = { ...withExtractors(10), supervised: 0, lastTick: 1_000 };
    const hour = 3600_000;

    const w = applyOfflineProgress(watched, 1_000 + hour).state;
    const l = applyOfflineProgress(loose, 1_000 + hour).state;

    expect(Number(w.pendingClean)).toBeGreaterThan(0);
    expect(Number(w.pending)).toBe(0);        // nothing unwatched, nothing dirty
    expect(Number(l.pendingClean)).toBe(0);
    expect(Number(l.pending)).toBeGreaterThan(0);
    // and watching still COSTS throughput offline, exactly as it does online
    expect(Number(w.pendingClean)).toBeLessThan(Number(l.pending));
  });

  it('absorbs the bank in its true mix and credits the clean half', () => {
    const s: GameState = { ...initialState(), pending: '6000', pendingClean: '2000' };
    const after = apply(s, { type: 'absorb' });
    const took = Number(after.resources.triples);
    expect(took).toBeGreaterThan(0);
    // a quarter of the bank was supervised, so a quarter of every slice is
    // verified — you cannot skim the clean statements first
    expect(Number(after.provenance.unverified) / took).toBeCloseTo(0.75, 6);
    expect(Number(after.lifetimeVerified)).toBeCloseTo(took * 0.25, 6);
    expect(Number(verified(after))).toBeCloseTo(took * 0.25, 6);

    let t = after;
    for (let i = 0; i < 400 && Number(t.pending) + Number(t.pendingClean) > 0; i++) {
      t = apply(t, { type: 'absorb' });
    }
    expect(Number(t.pending)).toBeCloseTo(0, 6);
    expect(Number(t.pendingClean)).toBeCloseTo(0, 6);
    expect(Number(t.resources.triples)).toBeCloseTo(8000, 3);
  });
});

describe('prestige — retraining on yourself', () => {
  const ready = (): GameState => ({
    ...initialState(),
    forged: { ...initialState().forged, foldedNodes: String(REFLECT_MIN_CONCEPTS) },
    graph: { nodes: REFLECT_MIN_CONCEPTS, edges: 400 },
    lifetimeGenerated: '400',
    resources: { ...initialState().resources, triples: '400', data: '999' },
    provenance: { unverified: '400', drifted: '0' },
  });

  it('refuses until enough of the world is back', () => {
    const s = initialState();
    expect(apply(s, { type: 'reflect' })).toBe(s);
  });

  it('inherits MACHINE output, and inherits it unverified', () => {
    const after = apply(ready(), { type: 'reflect' });
    expect(after.resources.triples).toBe('100'); // 25% of 400
    expect(after.provenance.unverified).toBe('100');
    expect(verified(after)).toBe('0'); // nothing carried over was ever checked
  });

  it('raises synthetic ancestry every generation, and never lowers it', () => {
    let s = ready();
    const shares: number[] = [];
    for (let g = 0; g < 4; g++) {
      s = apply(s, { type: 'reflect' });
      shares.push(s.syntheticShare);
      s = { ...s, graph: { nodes: REFLECT_MIN_CONCEPTS, edges: 400 }, lifetimeGenerated: '400' };
    }
    expect(shares).toEqual([...shares].sort((a, b) => a - b));
    expect(shares[0]).toBeCloseTo(0.5, 5);
    expect(shares[3]).toBeGreaterThan(0.9);
  });

  it('makes each generation rot FASTER — the ceiling closes', () => {
    const gen1 = ready();
    const gen2 = apply(gen1, { type: 'reflect' });
    expect(driftPerSecond(gen2)).toBeGreaterThan(driftPerSecond(gen1));
  });
});

describe('vignettes', () => {
  it('fires when its trigger holds, and only once', () => {
    const s: GameState = {
      ...initialState(),
      resources: { ...initialState().resources, triples: '50' },
      provenance: { unverified: '40', drifted: '10' },
    };
    const after = apply(s, { type: 'chooseOption', eventId: 'first-drift', choiceId: 'ship-it' });
    expect(after.vignette.seen).toContain('first-drift');
    expect(after.modifiers.extraction).toBeGreaterThan(1);
    // a second attempt changes nothing
    expect(apply(after, { type: 'chooseOption', eventId: 'first-drift', choiceId: 'slow-down' }))
      .toBe(after);
  });

  it('ships with every prose field empty — an agent must never fill these', () => {
    // The guardrail that matters most in this repo, enforced instead of asked.
    // Delete this test ONLY when a human has written the words.
    for (const v of VIGNETTES) {
      expect(v.title, `${v.id}.title`).toBe('');
      expect(v.body, `${v.id}.body`).toBe('');
      for (const c of v.choices) expect(c.label, `${v.id}.${c.id}.label`).toBe('');
      // ...but the CHOICE must still be legible from its numbers alone
      for (const c of v.choices) expect(Object.keys(c.effects).length).toBeGreaterThan(0);
    }
  });
});

describe('a line reads as a sentence', () => {
  it('stores `is a` as (narrower, broader) so subject comes first', () => {
    // It was stored the other way round, which printed `canine is a dog` the
    // moment anything rendered `label(a) REL label(b)`. Invisible only because
    // the rel-0 label is suppressed — so this is the cheap moment to pin it.
    const s = apply({ ...initialState(), lastTick: 1_000 }, { type: 'discover' });
    const landed = apply(s, { type: 'tick', dt: 20, now: 1_000 + DISCOVER_MS + 1 });
    // node 1's parent is the root, so a correct `is a` runs 1 → 0
    const t = apply(landed, { type: 'connect', edge: { a: 1, b: 0, rel: 0, checked: true, fake: false } });
    const done = apply(t, { type: 'tick', dt: 20, now: t.lastTick + CONNECT_MS + 1 });
    const e = done.forged.edges[0]!;
    expect(e.a).toBe(1); // the narrower concept is the subject
    expect(e.b).toBe(0); // the broader one is the object
  });

  it('migrates v11 is-a edges into the readable orientation', () => {
    const v11 = {
      ...initialState(), saveVersion: 11,
      forged: {
        ...initialState().forged,
        anchors: [0, 1, 2], nextId: 3,
        edges: [
          { a: 0, b: 1, rel: 0, checked: true, fake: false },  // (broader, narrower)
          { a: 1, b: 2, rel: 1, checked: true, fake: false },  // has part: already correct
        ],
      },
    } as unknown as GameState;
    const back = deserialize(serialize(v11));
    expect(back.forged.edges[0]).toMatchObject({ a: 1, b: 0, rel: 0 }); // swapped
    expect(back.forged.edges[1]).toMatchObject({ a: 1, b: 2, rel: 1 }); // untouched
    expect(lit(back)).toBe(3); // and nobody lost a concept
  });
});

// ── the 240-anchor wall ────────────────────────────────────────────────────
//
// The newly discovered concept is appended to `anchors` BEFORE the eviction
// scan, and it is dark by definition (its edge cannot exist yet). Under
// "evict the dark first" it therefore always won its own scan and deleted
// itself: on a fully-lit board at the cap, an 18s Discover produced nothing,
// credited nothing, and left `recovered` unchanged — a permanent hard wall at
// 240/4096 = 5.9%, reached at ~10 minutes.
describe('discovering past the anchor cap', () => {
  const litBoard = (): GameState => {
    const s = initialState(1);
    const anchors = Array.from({ length: ANCHOR_CAP }, (_, i) => i);
    const edges = anchors.slice(1).map((id) => ({ a: id, b: 0, rel: 0, checked: true, fake: false }));
    return {
      ...s, lastTick: 1_000_000,
      // v15: the cap under test is now the CONTEXT WINDOW, not the hardcoded
      // ANCHOR_CAP. This board is deliberately at the window's ceiling so the
      // eviction path still runs — without this the window is 16 and landing
      // one concept on a 240-anchor board evicts 225 of them.
      contextWindow: ANCHOR_CAP,
      forged: { ...s.forged, anchors, edges, links: [], nextId: ANCHOR_CAP, foldedNodes: '0' },
      bookings: [{ kind: 'discover' as const, until: 1_000_000 + DISCOVER_MS, node: ANCHOR_CAP, slot: 0 }],
    };
  };
  //  takes a DELTA IN SECONDS, not an absolute time — passing `now`
  // silently advanced nothing and the booking never completed.
  const land = (s: GameState): GameState => tick(s, DISCOVER_MS / 1000 + 0.1);

  it('puts the new concept on the board instead of evicting it immediately', () => {
    const after = land(litBoard());
    expect(after.forged.anchors).toContain(ANCHOR_CAP);
    expect(after.forged.anchors.length).toBe(ANCHOR_CAP);
  });

  it('credits the LIT concept it folded away, so nothing is lost in the swap', () => {
    // Folding is count-PRESERVING, not count-increasing: a lit concept leaves
    // the board and becomes one unit of aggregate. Coverage grows when you
    // connect the new arrival, not when an old one folds. (Asserting an
    // increase here failed against correct code — the fold is a swap.)
    const before = litBoard();
    const after = land(before);
    expect(Number(after.forged.foldedNodes)).toBe(1);
    expect(recovered(after)).toBe(recovered(before));
  });

  it('lets recovery actually grow again once the new arrival is connected', () => {
    // This is the property the wall destroyed: past the cap, there was no new
    // arrival to connect, so `recovered` could never move again.
    const landed = land(litBoard());
    const connected = tick({
      ...landed,
      bookings: [{
        kind: 'connect' as const, until: landed.lastTick + CONNECT_MS,
        edge: { a: ANCHOR_CAP, b: 0, rel: 0, checked: true, fake: false },
      }],
    }, CONNECT_MS / 1000 + 0.1);
    expect(recovered(connected)).toBeGreaterThan(recovered(landed));
  });

  it('DISCOVER-SPAM still earns nothing — the v11 exploit stays closed', () => {
    // The load-bearing one. Folding now banks LIT concepts, so it must be
    // impossible to bank anything without drawing lines. A spammer produces
    // only dark anchors: there is never a lit victim, the fallback folds a dark
    // one, and dark folds are uncredited. Before v11, this exact loop reached
    // 3,856 / 4,096 with zero lines drawn.
    //
    // ⚠️ REWRITTEN AT v15. This loop used to be `while (attentionFree(s) > 0)`
    // and it HUNG FOREVER the moment the context window shipped: a full window
    // makes Discover a no-op, so attention never drains and the loop never
    // ends. That is not a test bug — it is the test discovering that the
    // exploit it guards against is now structurally impossible rather than
    // merely unprofitable. The assertion is strengthened to say so.
    let s: GameState = { ...initialState(3), lastTick: 1_000_000 };
    for (let i = 0; i < 2500; i++) {
      // bounded: a full window returns the same state, and spinning on that is
      // how this test hung
      for (let n = 0; n < 64 && attentionFree(s) > 0; n++) {
        const next = apply(s, { type: 'discover' });
        if (next === s) break;
        s = next;
      }
      s = tick(s, 1);
    }
    // Spam is bounded by the RENDER budget, and the window keeps most of it out
    // of context — but the original point is the one that matters: none of it
    // counts, because nothing was ever connected.
    expect(s.forged.anchors.length).toBeLessThanOrEqual(ANCHOR_CAP);
    expect(inContext(s).length).toBe(contextWindow(s));
    // ...and the point of the original test still holds: none of it counts.
    expect(Number(s.forged.foldedNodes)).toBe(0);
    expect(recovered(s)).toBe(0);
  });

  it('still refuses to credit a DARK fold directly', () => {
    // a board of dark anchors: Discover-spam must never buy coverage
    const s = initialState(1);
    const anchors = Array.from({ length: ANCHOR_CAP }, (_, i) => i);
    const dark: GameState = {
      ...s, lastTick: 1_000_000,
      forged: { ...s.forged, anchors, edges: [], links: [], nextId: ANCHOR_CAP, foldedNodes: '0' },
      bookings: [{ kind: 'discover' as const, until: 1_000_000 + DISCOVER_MS, node: ANCHOR_CAP, slot: 0 }],
    };
    const after = land(dark);
    expect(Number(after.forged.foldedNodes)).toBe(0);
    expect(recovered(after)).toBe(0);
  });
});

// ── machine lines must not destroy the player's graph ──────────────────────
//
// `trimEdges` returns its ARGUMENT when the list is under EDGE_CAP, so the old
// `next.length = 0; next.push(...trimmed)` emptied the array and then spread
// the array it had just emptied. Every edge on the board was destroyed the
// first time a machine drew a line — for any player with an unwatched
// Extractor and fewer than 512 edges, i.e. essentially all of them.
describe('a machine drawing a line', () => {
  const boardWithHandLines = (): GameState => {
    const s = initialState();
    return {
      ...s,
      lastTick: 1_000_000,
      forged: {
        ...s.forged, nextId: 3, anchors: [0, 1, 2],
        edges: [
          { a: 1, b: 0, rel: 0, checked: true, fake: false },
          { a: 2, b: 0, rel: 0, checked: true, fake: false },
        ],
      },
      generators: { ...s.generators, extractor: 30 },
      supervised: 0,
      lineDebt: 0.99, // the next tick pushes it over 1, so a line gets drawn
    };
  };

  it('does not wipe the lines the player drew by hand', () => {
    const before = boardWithHandLines();
    const after = tick(before, 0.1);
    for (const e of before.forged.edges) {
      expect(after.forged.edges).toContainEqual(e);
    }
  });

  it('does not silently erase the coverage those lines were holding up', () => {
    const before = boardWithHandLines();
    const after = tick(before, 0.1);
    expect(lit(after)).toBeGreaterThanOrEqual(lit(before));
    expect(recovered(after)).toBeGreaterThanOrEqual(recovered(before));
  });

  it('still adds its own lines, and they are unchecked inventions', () => {
    // Several ticks, not one: with only three anchors the machine can draw
    // a === b and skip, so a single tick is seed-dependent. What must hold is
    // that machine lines DO appear and are never checked.
    let s = boardWithHandLines();
    for (let i = 0; i < 20; i++) s = tick(s, 0.2);
    const machine = s.forged.edges.filter((e) => e.fake);
    expect(machine.length).toBeGreaterThan(0);
    for (const e of machine) expect(e.checked).toBe(false);
    // and the hand-drawn lines are STILL there after twenty ticks of it
    expect(s.forged.edges.filter((e) => e.checked && !e.fake).length).toBe(2);
  });
});

// ── the story layer actually reaches the player ────────────────────────────
describe('vignettes reach the player and their doors all do something', () => {
  it('fires for a player who never touches a machine', () => {
    // It used to trigger on `minDrifted: 5`, which needs an UNSUPERVISED
    // extractor — the one state the HUD paints red. The dominant line (never
    // buy a machine) kept `drifted` at exactly 0, so the only story in the game
    // was unreachable for a competent player.
    let s: GameState = { ...initialState(5), lastTick: 1_000_000 };
    expect(pendingVignette(s)).toBeNull();
    s = { ...s, resources: { ...s.resources, triples: '40' } };
    expect(Number(s.provenance.drifted)).toBe(0); // no machine ever ran
    expect(pendingVignette(s)).toBe('first-drift');
  });

  it('gives every door a lever that moves something', () => {
    // A choice whose upside is arithmetically incapable of existing, offered
    // beside a real cost, is a lie told to the player by arithmetic.
    const base: GameState = { ...initialState(5), lastTick: 1_000_000, resources: { ...initialState(5).resources, triples: '40' } };
    for (const choice of VIGNETTES[0]!.choices) {
      const after = apply(base, { type: 'chooseOption', eventId: 'first-drift', choiceId: choice.id });
      const moved = attentionCap(after) !== attentionCap(base)
        || extractionPerSecond({ ...after, generators: { ...after.generators, extractor: 1 } })
           !== extractionPerSecond({ ...base, generators: { ...base.generators, extractor: 1 } })
        || driftPerSecond({ ...after, resources: { ...after.resources, triples: '1000' }, provenance: { unverified: '10', drifted: '0' } })
           !== driftPerSecond({ ...base, resources: { ...base.resources, triples: '1000' }, provenance: { unverified: '10', drifted: '0' } });
      expect(moved, `choice "${choice.id}" changes nothing`).toBe(true);
    }
  });

  it('remembers which door you took through a retrain', () => {
    // Modifiers reset on purpose — the same fork on worse terms IS the story.
    // The FLAG is the memory of the choice, and it was being dropped by the
    // `...fresh` spread, so nothing could ever reference it later.
    const base: GameState = { ...initialState(5), lastTick: 1_000_000, resources: { ...initialState(5).resources, triples: '40' } };
    const chosen = apply(base, { type: 'chooseOption', eventId: 'first-drift', choiceId: 'ship-it' });
    expect(Object.keys(chosen.flags).length).toBeGreaterThan(0);
    const retrained = apply({ ...chosen, forged: { ...chosen.forged, foldedNodes: '5000' } }, { type: 'reflect' });
    expect(retrained.flags).toEqual(chosen.flags);
    expect(retrained.modifiers).toEqual({}); // the bargain resets, the memory does not
  });
});

// ── the ticker is writable ─────────────────────────────────────────────────
describe('ticker trigger fallbacks', () => {
  it('falls back from a numbered trigger to its generic form', () => {
    // Without this the owner must write a line per purchase COUNT, or watch the
    // same mechanical string repeat forever — by Extractor #30 the ticker was
    // reading "#30 online" and would have gone on indefinitely.
    OWNER_LINES_FOR_TEST['buy:extractor'] = 'GENERIC';
    say('buy:extractor:30', 'MECHANICAL');
    expect(get(ticker).at(-1)!.text).toBe('GENERIC');
    delete OWNER_LINES_FOR_TEST['buy:extractor'];
  });

  it('prefers an exact numbered line when one exists', () => {
    OWNER_LINES_FOR_TEST['buy:extractor'] = 'GENERIC';
    OWNER_LINES_FOR_TEST['buy:extractor:1'] = 'EXACT';
    say('buy:extractor:1', 'MECHANICAL');
    expect(get(ticker).at(-1)!.text).toBe('EXACT');
    delete OWNER_LINES_FOR_TEST['buy:extractor'];
    delete OWNER_LINES_FOR_TEST['buy:extractor:1'];
  });

  it('still uses the mechanical fallback when the owner has written nothing', () => {
    say('nodes:250', 'graph: 250 nodes');
    expect(get(ticker).at(-1)!.text).toBe('graph: 250 nodes');
  });
});
