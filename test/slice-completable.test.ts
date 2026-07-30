import { describe, it, expect } from 'vitest';
import { apply, initial, blocked, level, type Slice } from '../src/slice/engine';
import { PLACES, PLACE } from '../src/slice/content';

/** ⚠️ THE CHECK THAT MATTERS BEFORE A PLAYTEST, and the one three independent
 *  authors are most likely to break between them.
 *
 *  "Every place is reachable" (in slice.test.ts) walks the graph IGNORING gates.
 *  This one honours them: it plays the actual reducer, opens satchels, grinds
 *  work actions for levels, and re-walks checks that failed — which is exactly
 *  what a determined player does. If a door needs a key that only drops behind
 *  that same door, or a skill gate demands a level no work action in reach can
 *  pay for, this is the only thing in the repo that finds it. */
/** Every place reachable from where we stand, honouring gates, with the route. */
function routes(s: Slice): Map<number, number[]> {
  const out = new Map<number, number[]>([[s.at, []]]);
  const q = [s.at];
  while (q.length) {
    const at = q.shift()!;
    const path = out.get(at)!;
    for (const c of PLACE.get(at)!.choices) {
      if (out.has(c.to)) continue;
      // `blocked` only reads the pack and the skills, so it is safe to ask
      // about a choice we are not standing on.
      if (blocked(s, c)) continue;
      out.set(c.to, [...path, c.to]);
      q.push(c.to);
    }
  }
  return out;
}

const walk = (s: Slice, path: number[]): Slice => {
  for (const to of path) {
    s = apply(s, { type: 'travel', to });
    while (s.satchels.length) s = apply(s, { type: 'open' });
  }
  return s;
};

/** Plays like somebody who wants to finish: grinds the work actions that pay a
 *  skill a door is asking for, and re-walks a loot check until it pays out. */
function playUntilStuck(seed: number): { seen: Set<number>; state: Slice } {
  let s = initial(seed);
  const seen = new Set<number>(s.seen);

  for (let round = 0; round < 600; round++) {
    let moved = false;
    const reach = routes(s);
    for (const id of reach.keys()) seen.add(id);

    // 1. Anywhere new and open: go and look at it.
    for (const [id, path] of reach) {
      if (seen.has(id) && id !== s.at && path.length === 0) continue;
      if (!path.length) continue;
      const before = s.at;
      s = walk(s, path);
      if (s.at !== before) { moved = true; break; }
    }

    // 2. What is still shut anywhere we can reach, and what would open it?
    const wantItems = new Set<string>();
    const wantSkill = new Map<string, number>();
    for (const id of reach.keys()) {
      for (const c of PLACE.get(id)!.choices) {
        if (!blocked(s, c) || !c.needs) continue;
        if ('item' in c.needs) wantItems.add(c.needs.item);
        else wantSkill.set(c.needs.skill, Math.max(wantSkill.get(c.needs.skill) ?? 0, c.needs.level));
      }
    }
    if (!wantItems.size && !wantSkill.size && !moved) break;

    // 3. Grind a reachable work action that pays a skill a door wants.
    for (const [id, path] of routes(s)) {
      const w = PLACE.get(id)!.work;
      if (!w) continue;
      const need = wantSkill.get(w.skill);
      if (need === undefined || level(s, w.skill) >= need) continue;
      s = walk(s, path);
      s = apply(s, { type: 'work', id: w.id });
      s = apply(s, { type: 'tick', secs: w.secs * 60 });
      moved = true;
    }

    // 4. Re-walk a loot check that can pay out an item we need. Failing a check
    //    still moves you, so this is a round trip, not a retry in place.
    for (const [id, path] of routes(s)) {
      for (const c of PLACE.get(id)!.choices) {
        const good = c.test?.loot?.good;
        if (!good || !wantItems.has(good) || s.pack.includes(good)) continue;
        s = walk(s, [...path, c.to]);
        while (s.satchels.length) s = apply(s, { type: 'open' });
        for (const back of routes(s).get(id) ?? []) s = apply(s, { type: 'travel', to: back });
        moved = true;
      }
    }

    if (!moved) break;
  }
  for (const id of routes(s).keys()) seen.add(id);
  return { seen, state: s };
}

describe('a determined player can finish', () => {
  it('★ reaches every place, honouring every gate', () => {
    // Several seeds: the dice decide which loot a satchel yields, so a run that
    // works on one seed and not another is a real defect, not luck.
    for (const seed of [0x5eed, 1, 99, 12345, 7777]) {
      const { seen, state } = playUntilStuck(seed);
      const missed = PLACES.map((p) => p.id).filter((id) => !seen.has(id));
      expect(missed, `seed ${seed}: never reached ${missed
        .map((id) => `${id} ${PLACE.get(id)!.name}`).join(', ')}`).toEqual([]);
      expect(state.pack.length, `seed ${seed}: pack`).toBeGreaterThan(0);
    }
  });

  it('every shut door in the game opens for that player', () => {
    const { state } = playUntilStuck(0x5eed);
    const stillShut: string[] = [];
    for (const p of PLACES) {
      for (const c of p.choices) {
        const why = blocked(state, c);
        if (why) stillShut.push(`${p.name} -> ${c.label} (${why})`);
      }
    }
    expect(stillShut, `still shut at the end:\n${stillShut.join('\n')}`).toEqual([]);
  });

  it('levels actually move — the work actions are worth doing', () => {
    const { state } = playUntilStuck(0x5eed);
    const levels = (Object.keys(state.xp) as (keyof typeof state.xp)[])
      .map((id) => level(state, id));
    expect(Math.max(...levels)).toBeGreaterThanOrEqual(3);
  });
});
