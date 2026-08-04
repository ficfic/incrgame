// THE FOG OF WAR — the owner, 2026-08-04: *"can we do fog of war maybe."*
//
// ⚠️ THIS REVERSED A RECORDED RULE ("the whole crossing is visible from the
// first frame"). What that rule protected survives: every dot and every dotted
// route is still in the view from frame one — the SKELETON. What the fog takes
// is names and land beyond your ken.
//
// ---- PROVEN RED, 2026-08-04 (sabotage log in the commit message) -----------
import { describe, it, expect } from 'vitest';
import { initial, ken, charted, apply, type Game } from '../src/game/engine';
import { chapter } from '../src/game/world';
import { STOPS, STOP, START, FINISH } from '../src/game/stops';

describe('★ your ken is where you have stood, plus one route out', () => {
  it('opens as the start and its neighbours, nothing more', () => {
    const k = ken(initial());
    expect(k.has(START)).toBe(true);
    for (const n of STOP.get(START)!.near) expect(k.has(n)).toBe(true);
    expect(k.size).toBe(1 + STOP.get(START)!.near.length);
  });

  it('grows one ring when you stand somewhere new', () => {
    const to = STOP.get(START)!.near[0]!;
    const g: Game = { ...initial(), at: to, seen: [START, to] };
    const k = ken(g);
    for (const n of STOP.get(to)!.near) expect(k.has(n)).toBe(true);
  });

  it('the chart completes only when every stop has been stood at', () => {
    expect(charted(initial())).toBe(false);
    expect(charted({ ...initial(), seen: STOPS.map((s) => s.id) })).toBe(true);
  });
});

describe('★★ the chapter fogs its names, never its skeleton', () => {
  it('every dot and every route is in the view from frame one', () => {
    const v = chapter(initial());
    expect(v.nodes.length).toBe(STOPS.length);
    const routes = STOPS.reduce((n, s) => n + s.near.filter((t) => t > s.id).length, 0);
    expect(v.edges.length).toBe(routes);
  });

  it('★ only stops within your ken carry a name — the Finish starts nameless', () => {
    const v = chapter(initial());
    const k = ken(initial());
    for (const n of v.nodes) {
      const id = Number(n.id.split(':')[1]);
      if (k.has(id)) expect(n.name, n.id).not.toBe('');
      else expect(n.name, n.id).toBe('');
    }
    expect(v.nodes.find((n) => n.name === 'Finish')).toBeUndefined();
    expect(ken(initial()).has(FINISH)).toBe(false);
  });

  it('walking somewhere names what it brings into ken', () => {
    const to = STOP.get(START)!.near[0]!;
    const there: Game = { ...initial(), at: to, seen: [START, to] };
    const named = new Set(chapter(there).nodes.filter((n) => n.name !== '')
      .map((n) => Number(n.id.split(':')[1])));
    expect(named).toEqual(ken(there));
    expect(named.size).toBeGreaterThan(ken(initial()).size);
  });

  it('a fully charted game names everything', () => {
    const all: Game = { ...initial(), seen: STOPS.map((s) => s.id) };
    for (const n of chapter(all).nodes) expect(n.name).not.toBe('');
  });
});
