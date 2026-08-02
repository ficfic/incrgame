// HOW MUCH MANA ACTUALLY GETS TO YOU.
//
// ★ THE OWNER'S CALL, 2026-08-02: *"maybe we are not laying roads, but laying
// like a mana ways like pipes… this way it's less boring and gives us more
// options."*
//
// So a road is a PIPE. It has a bore, it carries a limited amount, and what
// reaches the far end is limited by the narrowest thing on the way there. Your
// income is not a count of roads any more — it is the flow this network can
// actually deliver to where you are standing.
//
// ⚠️ I ARGUED AGAINST THIS AND THE OWNER CHOSE IT ANYWAY, which is recorded
// here because the argument was half right and the half that was right still
// applies. A max-flow economy was built and scrapped on 2026-08-01. What was
// wrong with it then was NOT the mathematics — it was that "your income is the
// max flow from your settled places" is a sentence no player would ever guess
// from looking at the board. Pipes fix precisely that: everybody already knows a
// narrow pipe delivers less. **The model only earns its place if the board SHOWS
// the bore and the load**, which is why `Board.svelte` draws width from gauge
// and an underlay from load. If that ever stops being drawn, this file is back
// to being a spreadsheet nobody can see.
//
// Pure. No DOM, no clock, no RNG.

/** A pipe between two stops, with what it can carry. */
export interface Pipe { a: number; b: number; cap: number }

/** ★ MAX FLOW, EDMONDS-KARP. Small graph — 26 stops, ~35 pipes — so the
 *  textbook algorithm on an adjacency map is far and away the right call: it is
 *  short enough to read, and it is the version everybody can check against a
 *  worked example.
 *
 *  Pipes are UNDIRECTED: mana will run either way along a road, so each one
 *  becomes a pair of arcs that each carry the full bore. That is the standard
 *  reduction and it is why `cap` is added in both directions below rather than
 *  split between them. */
export function maxFlow(pipes: Pipe[], from: number, to: number): number {
  if (from === to) return Infinity;

  // Residual capacities, keyed `a>b`.
  const res = new Map<string, number>();
  const near = new Map<number, Set<number>>();
  const join = (a: number, b: number, c: number): void => {
    const k = `${a}>${b}`;
    res.set(k, (res.get(k) ?? 0) + c);
    (near.get(a) ?? near.set(a, new Set()).get(a)!).add(b);
  };
  for (const p of pipes) {
    if (p.cap <= 0) continue;
    join(p.a, p.b, p.cap);
    join(p.b, p.a, p.cap);
  }
  if (!near.has(from) || !near.has(to)) return 0;

  let total = 0;
  for (;;) {
    // Widest path would be the greedy choice; Edmonds-Karp takes the SHORTEST
    // augmenting path (breadth first), which is what bounds the iteration count
    // and stops a pathological graph looping.
    const back = new Map<number, number>([[from, from]]);
    const queue = [from];
    for (let h = 0; h < queue.length && !back.has(to); h++) {
      const at = queue[h]!;
      for (const n of near.get(at) ?? []) {
        if (back.has(n) || (res.get(`${at}>${n}`) ?? 0) <= 1e-9) continue;
        back.set(n, at);
        queue.push(n);
      }
    }
    if (!back.has(to)) return total;

    // The bottleneck along it — the narrowest pipe on the path, which is the
    // whole idea the player is meant to see.
    let add = Infinity;
    for (let n = to; n !== from; n = back.get(n)!) {
      add = Math.min(add, res.get(`${back.get(n)!}>${n}`)!);
    }
    for (let n = to; n !== from; n = back.get(n)!) {
      const p = back.get(n)!;
      res.set(`${p}>${n}`, res.get(`${p}>${n}`)! - add);
      res.set(`${n}>${p}`, (res.get(`${n}>${p}`) ?? 0) + add);
    }
    total += add;
  }
}

/** ★ WHERE IT IS TIGHT. For every pipe, how much of its bore the network is
 *  actually using when it delivers `maxFlow` — 0 to 1.
 *
 *  This is what makes the mechanic visible rather than merely true: a road drawn
 *  at its limit is a road you can SEE needs widening, and that is the second
 *  verb the whole change exists to add.
 *
 *  ⚠️ COMPUTED BY RE-RUNNING THE SEARCH AND WATCHING WHAT IT SPENDS, not by
 *  reading the residuals of the call above — a residual of zero means "this arc
 *  is full IN THIS DIRECTION", which for an undirected pipe carrying nothing at
 *  all is also true of its reverse arc. Reading residuals drew every dead-end
 *  spur as though it were at capacity. */
export function loads(pipes: Pipe[], from: number, to: number): Map<string, number> {
  const out = new Map<string, number>();
  if (from === to) return out;
  const key = (a: number, b: number): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const used = new Map<string, number>();

  const res = new Map<string, number>();
  const near = new Map<number, Set<number>>();
  const join = (a: number, b: number, c: number): void => {
    const k = `${a}>${b}`;
    res.set(k, (res.get(k) ?? 0) + c);
    (near.get(a) ?? near.set(a, new Set()).get(a)!).add(b);
  };
  for (const p of pipes) {
    if (p.cap <= 0) continue;
    join(p.a, p.b, p.cap);
    join(p.b, p.a, p.cap);
  }

  for (;;) {
    const back = new Map<number, number>([[from, from]]);
    const queue = [from];
    for (let h = 0; h < queue.length && !back.has(to); h++) {
      for (const n of near.get(queue[h]!) ?? []) {
        if (back.has(n) || (res.get(`${queue[h]!}>${n}`) ?? 0) <= 1e-9) continue;
        back.set(n, queue[h]!);
        queue.push(n);
      }
    }
    if (!back.has(to)) break;
    let add = Infinity;
    for (let n = to; n !== from; n = back.get(n)!) {
      add = Math.min(add, res.get(`${back.get(n)!}>${n}`)!);
    }
    for (let n = to; n !== from; n = back.get(n)!) {
      const p = back.get(n)!;
      res.set(`${p}>${n}`, res.get(`${p}>${n}`)! - add);
      res.set(`${n}>${p}`, (res.get(`${n}>${p}`) ?? 0) + add);
      // Net of what the reverse path already carried, so a flow that is later
      // cancelled does not leave a road looking busy.
      const k = key(p, n);
      used.set(k, (used.get(k) ?? 0) + add);
    }
  }

  for (const p of pipes) {
    const k = key(p.a, p.b);
    if (p.cap > 0) out.set(k, Math.min(1, (used.get(k) ?? 0) / p.cap));
  }
  return out;
}
