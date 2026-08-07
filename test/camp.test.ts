// THE CAMP — the owner's basecamp sketch, 2026-08-07, verbatim: *"we must
// have something to do at the stops in order to prepare for the expedition…
// we need to hunt, and we need to gather something else, prepare some mana…
// these destinations must have conflicting resource requirements."*
//
// The acceptance test the salvage review demanded is the LAST block: one
// camp's seven days provably cannot light two of the profiled roads. Not
// tuning by feel — enumeration. The last two loops died of feel.
//
// ---- PROVEN RED, 2026-08-07 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { apply, initial, campless, daysLeft, unbuildable, roadKey,
  CAMP_SLOTS, GATHER_MAKINGS, PROV_CAP, START, type Game } from '../src/game/engine';
import { NEEDS } from '../src/game/stops';
import { sceneById } from '../src/game/scenes';

const hunt = sceneById('hunt')!;
const HUNT_HAUL = hunt.haul!.provisions!;

const verb = (g: Game, id: string): Game => apply(g, { type: 'scene', verb: id });

/** One hunt, played sensibly: stalk while they are calm, wait when wary. */
function playHunt(g: Game): Game {
  g = apply(g, { type: 'hunt' });
  for (let t = 0; t < 30 && g.facing?.scene; t++) {
    const st = g.facing.scene;
    g = verb(g, st.stage === 'spooked' || (st.gauges.wary ?? 0) >= 5 ? 'wait' : 'stalk');
  }
  return g;
}

describe('★★ the camp: days of work, spent one at a time', () => {
  it('a gather is a day for a sure haul of makings', () => {
    const g = apply(initial(), { type: 'make' });
    expect(g.makings).toBe(GATHER_MAKINGS);
    expect(daysLeft(g)).toBe(CAMP_SLOTS - 1);
  });

  it('★ a hunt spends the day GOING IN — land the quarry or not', () => {
    const g = apply(initial(), { type: 'hunt' });
    expect(daysLeft(g)).toBe(CAMP_SLOTS - 1);
    expect(g.facing?.scene).toBeDefined();
    expect(g.facing!.event).toBe('hunt');
  });

  it('★★ a played hunt pays its haul and the crew hardens toward it', () => {
    const g = playHunt(initial());
    expect(g.facing).toBeNull();
    expect(g.provisions).toBe(initial().provisions + HUNT_HAUL);
    expect(g.cleared).toBe(1);
  });

  it('★ a worked-out camp refuses more work, and says so', () => {
    let g = initial();
    for (let i = 0; i < CAMP_SLOTS; i++) g = apply(g, { type: 'make' });
    expect(daysLeft(g)).toBe(0);
    expect(campless(g)).toBe('this ground is worked out');
    expect(apply(g, { type: 'make' })).toBe(g);
    expect(apply(g, { type: 'hunt' })).toBe(g);
  });

  it('walking away abandons a hunt — the day stays spent', () => {
    let g: Game = { ...initial(), gauge: { '0|17': 1 }, seen: [0, 17] };
    g = apply(g, { type: 'hunt' });
    expect(g.facing).not.toBeNull();
    const walked = apply(g, { type: 'go', to: 17 });
    expect(walked.facing).toBeNull();
    expect(walked.worked[START]).toBe(1);
  });

  it('★ the hunt bot is already policed: it lives in SCENES, under the spam guard', () => {
    // Drive-mashing spooks the herd (setback: day lost, nothing paid) —
    // asserted here at the CAMP (no building), not just on a road.
    let g = initial();
    g = apply(g, { type: 'hunt' });
    for (let i = 0; i < 20 && g.facing; i++) g = verb(g, 'drive');
    expect(g.facing).toBeNull();
    expect(g.provisions).toBe(initial().provisions);   // no haul
    expect(daysLeft(g)).toBe(CAMP_SLOTS - 1);          // day still spent
  });
});

describe('★★ the profiled roads: prepared, gated, and clean', () => {
  it('★ a short camp is refused with the shortfall said plainly', () => {
    const g = initial();   // provisions 6, makings 0
    expect(unbuildable({ ...g, mana: 99 }, 11)).toMatch(/^the camp is short — 18 provisions/);
    expect(unbuildable({ ...g, mana: 99 }, 6)).toMatch(/^the camp is short — 12 makings/);
  });

  it('★★ a met profile departs: makings spent into the line, NO hidden halts', () => {
    let g: Game = { ...initial(), mana: 99, makings: 14 };
    expect(unbuildable(g, 6)).toBeNull();
    g = apply(g, { type: 'build', to: 6, kit: 'mule' });
    expect(g.building).not.toBeNull();
    expect(g.building!.halts).toEqual([]);            // prepared = clean
    expect(g.makings).toBe(14 - NEEDS['0|6']!.makings!);
  });

  it('provisions are a threshold, not a toll — they travel with the crew', () => {
    let g: Game = { ...initial(), mana: 99, provisions: 20 };
    g = apply(g, { type: 'build', to: 11, kit: 'cart' });
    expect(g.building).not.toBeNull();
    // Only the suited kit's 1 came out; the 18 required stayed in the packs.
    expect(g.provisions).toBe(20 - 1);
  });
});

describe('★★★ THE ACCEPTANCE TEST: one camp cannot light two profiled roads', () => {
  // The salvage review's condition for shipping this at all, by enumeration:
  // every split of the camp's days between hunting (at PERFECT yield) and
  // gathering, checked against every pair of profiles. If any split lights
  // two, the conflict is fake and the loop is the old spam with a new coat.
  const meets = (hunts: number, gathers: number,
    need: { provisions?: number; makings?: number }): boolean =>
    Math.min(PROV_CAP, initial().provisions + hunts * HUNT_HAUL) >= (need.provisions ?? 0)
    && gathers * GATHER_MAKINGS >= (need.makings ?? 0);

  const keys = Object.keys(NEEDS);

  it('★ each profiled road is affordable ALONE from a fresh camp', () => {
    for (const key of keys) {
      const need = NEEDS[key]!;
      let can = false;
      for (let h = 0; h + 0 <= CAMP_SLOTS && !can; h++) {
        for (let m = 0; h + m <= CAMP_SLOTS && !can; m++) {
          if (meets(h, m, need)) can = true;
        }
      }
      expect(can, `${key} cannot be met by any split of ${CAMP_SLOTS} days`).toBe(true);
    }
  });

  it('★★★ no split of the days lights any PAIR of profiled roads', () => {
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = NEEDS[keys[i]!]!;
        const b = NEEDS[keys[j]!]!;
        const both = {
          provisions: Math.max(a.provisions ?? 0, b.provisions ?? 0),
          makings: Math.max(a.makings ?? 0, b.makings ?? 0),
        };
        for (let h = 0; h <= CAMP_SLOTS; h++) {
          for (let m = 0; h + m <= CAMP_SLOTS; m++) {
            expect(meets(h, m, both),
              `${keys[i]} AND ${keys[j]} both light with ${h} hunts + ${m} gathers`)
              .toBe(false);
          }
        }
      }
    }
  });
});
