// ★★★ SAWPITS DELIVER — and for one day they did not.
//
// ⚠️ THIS FILE EXISTS BECAUSE OF A SILENT 100% LOSS. `deliver()` has always
// accumulated a sawing wood camp's planks and returned them; the field was
// called `coal`, and `flow()` returned `coal: run.coal`. The 2026-08-15 cut
// renamed it `sawnHere` and did not re-wire it — `flow()` destructured every
// field EXCEPT that one. So Sawpits, one of the three surviving blueprints
// and the reward for the third holding, quietly deleted a site's entire
// output: the board drew porters walking, the deed promised a rate, and the
// town received nothing. No test exercised `burn`'s DELIVERY, only its
// toggle, which is why a rename could do this in silence.
import { describe, it, expect } from 'vitest';
import { apply, initial, flow, pathKey, sawsHere, KILN_SHARE, CREW, RATE,
  type City } from '../src/camp/engine';

/** A wood camp at Tall Pines (site 2), roaded home, staffed, sawpits known. */
const woods = (over: Partial<City> = {}): City => ({
  ...initial(), boons: ['kiln'], stacks: { 0: 3, 2: 1 }, pop: 12,
  paths: { [pathKey(0, 2)]: 1 }, food: 900, store: 4, ...over });

describe('★★★ A WOOD CAMP WITH SAWPITS', () => {
  it('★★★ delivers PLANKS to the town, which is the whole blueprint', () => {
    const on = apply(woods(), { type: 'burn', id: 2 });
    expect(sawsHere(on, 2)).toBe(true);
    expect(flow(on).planks).toBeGreaterThan(0);
  });

  it('★★★ and the town\'s plank stock actually rises over a tick', () => {
    // The half the type-level check cannot see: `flow` could be right and the
    // tick still bank it nowhere.
    const on = apply(woods(), { type: 'burn', id: 2 });
    const after = apply(on, { type: 'tick', secs: 30 });
    expect(after.planks).toBeGreaterThan(on.planks);
  });

  it('★★★ sawing pays PLANKS instead of logs, never both and never neither', () => {
    const off = woods();
    const on = apply(off, { type: 'burn', id: 2 });
    const a = flow(off);
    const b = flow(on);
    // Hauling: logs arrive, and with no mill they make no planks.
    expect(a.logs).toBeGreaterThan(0);
    // Sawing: the logs stop arriving and planks take their place.
    expect(b.logs).toBeLessThan(a.logs);
    expect(b.planks).toBeGreaterThan(a.planks);
  });

  it('★★ at KILN_SHARE of the felling rate — the price of the saved road', () => {
    const on = apply(woods(), { type: 'burn', id: 2 });
    const hands = flow(on).hands.get(2) ?? 0;
    expect(hands).toBeGreaterThan(0);
    expect(flow(on).planks).toBeCloseTo(hands * RATE.lumber * KILN_SHARE, 4);
    expect(KILN_SHARE).toBeLessThan(1);        // sawing in the open costs
    void CREW;
  });

  it('★ and toggling it back returns the camp to logs', () => {
    let g = apply(woods(), { type: 'burn', id: 2 });
    g = apply(g, { type: 'burn', id: 2 });
    expect(sawsHere(g, 2)).toBe(false);
    expect(flow(g).logs).toBeGreaterThan(0);
  });
});
