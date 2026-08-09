<script lang="ts">
  // THE CITY BUILDER'S ONE SCREEN — docs/CITY.md made flesh. Header of
  // numbers, the board, a dock of deeds. NO PROSE: nouns and numbers.
  import { onMount } from 'svelte';
  import Board, { type Dot, type Line } from './Board.svelte';
  import { INK, TOL } from '../game/ink';
  import type { Box } from '../game/layout';
  import { apply, catchUp, initial, flow, shown, popCap, pathKey, costOf, pathCostOf,
    priceLine, unlayable, unraisable, unassailable, heroHit, armsCost, hunger,
    heroMax, WILD_FED, SITE, GOBLINS, RATE, TAP_STONE, MAX_GAUGE, CREW, PATH_SECS,
    richOf, storeCost, roomOf, STORE_ROOM, cartCost, cartHaul, CARRY, CART_GAIN,
    windup, RATION_FOOD, RATION_HP,
    type City } from '../camp/engine';
  import { load, save, wipe, exportRaw, importRaw, elapsedSince } from '../camp/store';
  import { CAMP_SHAPES } from '../camp/scenery';
  import { ward } from '../camp/barrier';
  import type { Shape } from '../game/shapes';

  let game = $state<City>(initial());
  let ready = $state(false);
  /** One row of numbers about the pocket time, or null. Any tap clears it. */
  let awayLine = $state<string | null>(null);
  /** ★ THE WIN, said out loud — the owner: *"I think I won, but it wasn't
   *  clear."* Set when a holding falls, cleared by the next tap. */
  let won = $state<string | null>(null);
  let heldBefore = new Set<string>();
  $effect(() => {
    const now = new Set(Object.keys(game.goblins));
    for (const id of heldBefore) {
      if (!now.has(id)) {
        won = `${SITE.get(Number(id))?.name ?? 'The ground'} is TAKEN — +2 settlers`;
      }
    }
    heldBefore = now;
  });
  let picked = $state<number | null>(0);
  let menu = $state(false);
  let wiping = $state(false);
  let ported = $state<'copied' | 'refused' | null>(null);

  const act = (a: Parameters<typeof apply>[1]): void => { game = apply(game, a); };

  const f = $derived(flow(game));

  const cap = $derived(popCap(game));
  /** ★ Is this good at the storehouse ceiling? Everything arriving past it
   *  is WASTE, the same law the paths obey — so the chip says so. */
  const brim = (n: number): boolean => n >= roomOf(game) - 1e-9;
  /** ★ WHAT THE PATHS ARE EATING, per second, over the whole town. This is
   *  the cartwright's case, and without it on screen the deed is a number
   *  with no reason attached. */
  const wasted = $derived((() => {
    let out = 0;
    for (const [id, m] of f.made) out += Math.max(0, m - (f.carried.get(id) ?? 0));
    return out;
  })());
  /** Planks the mills can actually deliver right now: capacity, starved to
   *  the log supply when the pile is dry. The header never overpromises. */
  const planksNow = $derived(
    game.logs > 0.05 ? f.planks : Math.min(f.planks, f.logs));

  // ★ +1 POPS over the camp: one bump per whole stone landed, any source.
  // The board itself throttles to one a second and clears them on a pan.
  let pops = $state(0);
  let lastWholeStone = 0;
  $effect(() => {
    const w = Math.floor(game.stone);
    if (w > lastWholeStone) pops++;
    lastWholeStone = w;
  });

  const siteId = (n: number): string => `site:${n}`;
  const numOf = (id: string): number => Number(id.split(':')[1]);
  const KIND_NAME = { hut: 'Hut', quarry: 'Quarry', lumber: 'Lumberworks',
    sawmill: 'Sawmill', farm: 'Farm' } as const;

  /** A site's label: the count, and the truth about what its paths carry. */
  function nameOf(id: number): string {
    const s = SITE.get(id)!;
    // ★ Held ground keeps its NAME — the owner: *"this must be some
    // location with a note that it's dangerous, not flat out goblins."*
    // The red mark carries the danger; the panel carries the number.
    if (game.goblins[id]) return s.name;
    const n = game.stacks[id] ?? 0;
    if (id === 0) return n > 0 ? `Camp · Hut ×${n}` : 'The Camp';
    if (n <= 0) return s.name;
    const made = f.made.get(id) ?? 0;
    const carried = f.carried.get(id) ?? 0;
    const kind = `${KIND_NAME[s.allows]} ×${n}`;
    if (!f.comp.has(id)) return `${kind} · 0`;
    if (carried < made - 1e-9) {
      return `${kind} · makes ${made.toFixed(1)} · carries ${carried.toFixed(1)}`;
    }
    return `${kind} · ${made.toFixed(1)}/s`;
  }

  const dots = $derived<Dot[]>(shown(game).map((s) => ({
    id: siteId(s.id),
    name: nameOf(s.id),
    kind: game.goblins[s.id] ? 'foe'
      : s.id === 0 ? 'carry' : (game.stacks[s.id] ?? 0) > 0 ? 'fact' : 'stop',
    // ★ What stands here, said from the map (the visual pass).
    icon: !game.goblins[s.id] && (game.stacks[s.id] ?? 0) > 0
      ? s.allows : undefined,
    wx: s.x, wy: s.y,
    place: true, you: false,
    open: f.comp.has(s.id) && (game.stacks[s.id] ?? 0) > 0,
    shut: false,
    known: true,
    on: picked === s.id,
    barred: false,
    // ★ The picked site is unmissable — the owner could not tell what
    // was selected. Half again the size is a statement, not a hint.
    r: picked === s.id ? 8 : undefined,
  })));

  const lines = $derived<Line[]>((() => {
    const out: Line[] = [];
    const seen = new Set<string>();
    for (const s of shown(game)) {
      for (const n of s.near) {
        const key = pathKey(s.id, n);
        if (seen.has(key)) continue;
        seen.add(key);
        const gauge = game.paths[key] ?? 0;
        const job = game.laying[key];
        const choked = f.choked.has(key);
        // ★ The carriers tell the truth per path: an idle path in a busy
        // town shows nobody, a laden one crowds — density from the real
        // carried rate against this path's own capacity.
        const carrying = f.loads.get(key) ?? 0;
        const busy = gauge > 0 && carrying > 0.005;
        out.push({
          a: siteId(s.id), b: siteId(n), rel: 'road',
          // A path going in FILLS from nothing; a widen keeps carrying at
          // its old gauge while the spades work beside it.
          fill: gauge > 0 ? 1 : job ? 1 - job.left / job.secs : 0,
          load: choked ? 1 : busy ? Math.min(1, carrying / (gauge || 1)) : 0,
          gauge,
          choked,
          // ★ WHICH WAY THE CARRIERS WALK comes from the FLOW, not from id
          // order (review finding): the pines→mill legs ran backwards, and
          // the owner's rule is that the dots correspond to what is moving.
          // Board's `dir` is signed along a→b, and a is this site.
          dir: (f.dirs.get(key) ?? 0) * (s.id < n ? 1 : -1),
          carry: true,
        });
      }
    }
    return out;
  })());

  /** ★ THE BARRIER — the ward around the ground you hold, under everything
   *  else on the map. A faint wash so the terrain still reads through it, and
   *  a dashed line at the edge: this is a frontier, not a wall you built.
   *  Redrawn only when the held ground changes, because `ward()` is derived
   *  from exactly that. */
  const scene = $derived<Shape[]>((() => {
    const pts = ward(game);
    if (pts.length < 3) return CAMP_SHAPES;
    // ⚠️ NO FILL, AND THAT IS NOT A STYLE CHOICE. A 7%-alpha wash over the
    // whole held country tints every pixel under it, including the carrier
    // dots the probe measures — it shifted their centroid enough that
    // "the carriers do not walk" fired on a build where they walked fine.
    // Found by running the probe, which is the only reason it was found.
    // The barrier is a LINE, which is what a barrier is.
    return [
      { s: 'path', pts, ink: 'ward', close: true, curve: true,
        w: 2, dash: [7, 6], alpha: 0.55 },
      ...CAMP_SHAPES,
    ];
  })());

  const box = $derived<Box>((() => {
    const xs = shown(game).map((s) => s.x);
    const ys = shown(game).map((s) => s.y);
    const pad = 60;
    const x = Math.min(...xs) - pad;
    const y = Math.min(...ys) - pad;
    return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
  })());

  interface Deed { label: string; note: string; why: string | null; go: () => void }
  const deeds = $derived<Deed[]>((() => {
    if (picked === null) return [];
    const s = SITE.get(picked);
    if (!s) return [];
    const out: Deed[] = [];
    // ★ HELD GROUND: the only deed is the hero. Everything else waits.
    if (game.goblins[s.id]) {
      const why = unassailable(game, s.id);
      out.push({
        label: 'Send the hero',
        note: why ?? `hits ${heroHit(game)} · their runts bite ${GOBLINS[s.id]?.bite ?? 2}`,
        why,
        go: () => act({ type: 'assail', id: s.id }),
      });
      return out;
    }
    // ★ HAND WORK AT THE TREES — the owner: *"lumberworks is soft locked…
    // there's no way to get the lumber needed."* There was, and nobody
    // could find it (the header button quietly changed meaning). Now the
    // chop is a deed ON the pines, where a person would look for it.
    if (s.allows === 'lumber') {
      out.push({
        label: 'Chop logs by hand',
        note: brim(game.logs)
          ? `stores full at ${roomOf(game)} · a tap adds nothing`
          : `+${TAP_STONE} a tap · ${Math.floor(game.logs)} held`,
        why: null,
        go: () => act({ type: 'tap', kind: 'logs' }),
      });
    }
    const have = game.stacks[s.id] ?? 0;
    const why = unraisable(game, s.id);
    out.push({
      label: `${KIND_NAME[s.allows]} ×${have + 1}`,
      note: (why ?? priceLine(costOf(s.allows, have)))
        + (have > 0 ? ` · ${have} standing` : ''),
      why,
      go: () => act({ type: 'raise', id: s.id }),
    });
    if (s.id === 0) {
      // ★ THE STOREHOUSE, beside the huts — room for every good, and the
      // only thing standing between the town and the top of either ladder.
      const sp = storeCost(game.store);
      const noRoom = game.stone < sp.stone || game.planks < sp.planks;
      out.push({
        label: `Storehouse ×${game.store + 1}`,
        note: `${sp.stone} stone · ${sp.planks} planks → holds `
          + `${roomOf(game) + STORE_ROOM} of each`
          + (game.store > 0 ? ` · ${game.store} standing` : ''),
        why: noRoom ? `${sp.stone} stone · ${sp.planks} planks` : null,
        go: () => act({ type: 'stow' }),
      });
      // ★ THE CARTWRIGHT — the one exponential that runs FOR the player,
      // and it runs on the graph because that is where the waste is.
      // ⚠️ OFFERED ONLY WHILE SOMETHING IS ACTUALLY CHOKED. A cart buys
      // exactly nothing for a town whose paths already carry everything
      // it makes, and a deed that takes 30 stone to do nothing is a trap
      // laid for the first hour, when no path is anywhere near its cap.
      if (wasted > 0.05) {
      const cp = cartCost(game.carts);
      const noCart = game.stone < cp.stone || game.planks < cp.planks;
      out.push({
        label: `Carts ×${game.carts + 1}`,
        note: `${cp.stone} stone · ${cp.planks} planks → every gauge carries `
          + `${(CARRY * cartHaul(game) * CART_GAIN).toFixed(2)}/s`
          + ` · ${wasted.toFixed(1)}/s is being thrown away now`,
        why: noCart ? `${cp.stone} stone · ${cp.planks} planks` : null,
        go: () => act({ type: 'cart' }),
      });
      }
      const p = armsCost(game.hero.arms);
      const short = game.stone < p.stone || game.planks < p.planks;
      out.push({
        label: `Arms ×${game.hero.arms + 1}`,
        note: `${p.stone} stone · ${p.planks} planks → hits ${heroHit(game) + 1}`
          + (game.hero.arms > 0 ? ` · ${game.hero.arms} carried` : ''),
        why: short ? `${p.stone} stone · ${p.planks} planks` : null,
        go: () => act({ type: 'arm' }),
      });
    }
    for (const n of s.near) {
      const t = SITE.get(n);
      if (!t) continue;
      const key = pathKey(s.id, n);
      const job = game.laying[key];
      if (job) {
        out.push({
          label: `Laying · ${t.name}`,
          note: `${Math.ceil(job.left)}s`,
          why: `${Math.ceil(job.left)}s`,
          go: () => {},
        });
        continue;
      }
      const gauge = game.paths[key] ?? 0;
      if (gauge >= MAX_GAUGE) continue;
      const w = unlayable(game, s.id, n);
      out.push({
        label: gauge === 0 ? `Path · ${t.name}` : `Widen · ${t.name} (${gauge} of ${MAX_GAUGE})`,
        note: w ?? `${pathCostOf(gauge)} stone · ${PATH_SECS * (gauge + 1)}s · carries `
          + `${((gauge + 1) * CARRY * cartHaul(game)).toFixed(1)}/s`,
        why: w,
        go: () => act({ type: 'lay', a: s.id, b: n }),
      });
    }
    return out;
  })());

  /** ★ WHAT HELD GROUND IS WORTH, in the two currencies that matter: how
   *  much richer it is than safe ground, and whether it carries its own
   *  road to the camp. Said on the panel BEFORE the fight is paid for. */
  function prizeOf(id: number): string {
    const s = SITE.get(id);
    if (!s) return '';
    const bits: string[] = [];
    const r = richOf(id);
    if (r > 1) bits.push(`${KIND_NAME[s.allows].toLowerCase()} ×${r}`);
    // A direct edge to the camp that no laid path uses yet: an artery.
    if (s.near.includes(0) && !game.paths[pathKey(0, id)]) bits.push('own path to camp');
    return bits.length ? ` · ${bits.join(' · ')}` : '';
  }

  /** The tapped site's one status line — numbers, and only when they bite. */
  const status = $derived((() => {
    if (picked === null) return '';
    if (picked === 0) {
      // ★ "12/10 people strange" (owner playtest) — captives walk home even
      // when the huts are full, so pop CAN sit over the cap. The header was
      // taught to say so; this line was not, and still read "16 of 2".
      return (game.pop > cap
        ? `${Math.floor(game.pop)} people · huts full`
        : `${Math.floor(game.pop)} of ${cap} people`)
        + (hunger(game) > 0
          ? ` · eats ${hunger(game).toFixed(1)}/s · fields bring ${f.food.toFixed(1)}/s`
          : ` · the wild feeds ${WILD_FED}`)
        + (f.starving ? ' — raise or connect farms' : '')
        + ` · stores hold ${roomOf(game)}`
        + (f.staff < 1 && !f.starving ? ` · works ${Math.round(f.staff * 100)}% staffed` : '');
    }
    if (game.goblins[picked]) {
      // ★ THE PRIZE, SAID BEFORE THE FIGHT — the owner: no reason to want
      // held ground. Now the ground says what it is worth, and whether it
      // is a second road home, while the goblins are still standing on it.
      return `dangerous — goblins, ${Math.ceil(game.goblins[picked] ?? 0)} strong`
        + prizeOf(picked);
    }
    const n = game.stacks[picked] ?? 0;
    // ★ Won ground keeps saying what it is worth — a ×3 pit that reads the
    // same as Rock Face is the complaint all over again, one fight later.
    const rich = richOf(picked) > 1
      ? `rich ground · every hand ×${richOf(picked)}` : '';
    if (n <= 0) return rich;
    if (!f.comp.has(picked)) return 'no path to the camp · carries 0';
    if (SITE.get(picked)?.allows === 'sawmill' && f.millCap > 0
      && f.logsIn + (game.logs > 0.05 ? 1 : 0) < f.millCap - 1e-9) {
      return `logs in ${f.logsIn.toFixed(1)}/s of ${f.millCap.toFixed(1)}/s — wire the pines closer`;
    }
    const made = f.made.get(picked) ?? 0;
    const carried = f.carried.get(picked) ?? 0;
    if (carried < made - 1e-9) {
      return `choked · ${(made - carried).toFixed(1)}/s wasted — widen the path`;
    }
    return '';
  })());

  /** Set hands ±1 and SAY where the person came from — the owner: the
   *  pull used to happen silently and it read as a bug. */
  function pinAt(id: number, d: 1 | -1): void {
    const before = new Map(f.hands);
    act({ type: 'pin', id, d });
    if (d > 0) {
      for (const [sid, w] of flow(game).hands) {
        if (sid !== id && w < (before.get(sid) ?? 0) - 1e-9) {
          won = `a hand left ${SITE.get(sid)?.name}`;
          break;
        }
      }
    }
  }

  function doTap(id: string): void {
    awayLine = null;
    won = null;
    const n = numOf(id);
    picked = picked === n ? null : n;
  }

  async function copySave(): Promise<void> {
    try {
      await navigator.clipboard.writeText(exportRaw(game));
      ported = 'copied';
    } catch { ported = 'refused'; }
    setTimeout(() => (ported = null), 2500);
  }
  function pasteSave(): void {
    const t = window.prompt('Paste a save');
    if (t === null) return;
    const back = importRaw(t.trim());
    if (!back) { ported = 'refused'; setTimeout(() => (ported = null), 2500); return; }
    game = back.game;
  }

  onMount(() => {
    const back = load();
    if (back) {
      const secs = Math.min(elapsedSince(back.savedAt), 12 * 3600);
      // Chunked, not one giant step — the away run obeys the same starving,
      // growth and spade rules the live run does.
      game = secs > 1 ? catchUp(back.game, secs) : back.game;
      // ★ THE AWAY LINE — what the pocket time brought, one row of numbers.
      if (secs > 90) {
        const d = (a: number, b: number): number => Math.floor(a) - Math.floor(b);
        const parts = [
          [d(game.stone, back.game.stone), 'stone'],
          [d(game.logs, back.game.logs), 'logs'],
          [d(game.planks, back.game.planks), 'planks'],
          [d(game.food, back.game.food), 'food'],
          [game.pop - back.game.pop, 'settlers'],
        ].filter(([n]) => (n as number) > 0)
          .map(([n, w]) => `+${n} ${w}`);
        if (parts.length) {
          const h = secs / 3600;
          awayLine = `Away ${h >= 1 ? `${h.toFixed(1)} hours` : `${Math.round(secs / 60)} minutes`}`
            + ` — ${parts.join(' · ')}`;
        }
      }
    }
    ready = true;
    (window as unknown as { __INK: typeof INK }).__INK = INK;
    (window as unknown as { __TOL: typeof TOL }).__TOL = TOL;

    let last = performance.now();
    let raf = 0;
    const frame = (t: number): void => {
      const secs = (t - last) / 1000;
      if (secs >= 0.2) { last = t; act({ type: 'tick', secs }); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  });

  // (The auto-strike crank is gone — the owner's reversal, 2026-08-08:
  // the strip has real verbs now, so every round is a tap on purpose.)

  let lastSaved = '';
  $effect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const now = JSON.stringify(game);
      if (now === lastSaved) return;
      lastSaved = now;
      save(game);
    }, 2000);
    return () => clearInterval(id);
  });
  $effect(() => {
    const flush = (): void => { if (ready) { lastSaved = JSON.stringify(game); save(game); } };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
    };
  });
</script>

<main>
  <header>
    <!-- ★ A FULL STORE IS SAID ON THE CHIP ITSELF. Waste the player cannot
         see is the choke bug all over again in a different currency. -->
    <button class="spring" class:brim={brim(game.stone)}
      onclick={() => act({ type: 'tap' })}>
      <b>{Math.floor(game.stone)}</b><span>stone</span>
      <em>{brim(game.stone) ? `full of ${roomOf(game)}`
        : `+${TAP_STONE}${f.stone > 0 ? ` · +${f.stone.toFixed(1)}/s` : ''}`}</em>
    </button>
    <span class="keep" class:hurt={brim(game.logs)}>{Math.floor(game.logs)} logs{
      brim(game.logs) ? ' · full' : ''}</span>
    <span class="keep" class:hurt={brim(game.planks)}>{Math.floor(game.planks)} planks{
      brim(game.planks) ? ' · full' : planksNow > 0 ? ` +${planksNow.toFixed(1)}/s` : ''}</span>
    <span class="keep" class:hurt={f.starving || brim(game.food)}>{Math.floor(game.food)} food{
      f.starving ? ' · STARVING' : brim(game.food) ? ' · full'
      : hunger(game) > 0 ? ` −${hunger(game).toFixed(1)}/s` : ''}{
      f.food > 0 && !brim(game.food) ? ` +${f.food.toFixed(1)}/s` : ''}</span>
    <span class="keep lv">{game.pop > cap
      ? `${Math.floor(game.pop)} people · huts full`
      : `${Math.floor(game.pop)}/${cap} people`}</span>
    <span class="keep">hero {game.hero.hp}/{heroMax(game)} · arms {game.hero.arms}</span>
    <button class="reset gear" onclick={() => (menu = !menu)}>{menu ? 'Close' : '⋯'}</button>
    {#if menu}
    <div class="menurow">
      <button class="reset" class:armed={wiping}
        onclick={() => {
          if (!wiping) { wiping = true; setTimeout(() => (wiping = false), 3000); return; }
          wiping = false; wipe(); game = initial(); picked = 0;
        }}>
        {wiping ? 'Wipe it? Tap again' : 'Start over'}
      </button>
      <button class="reset porter" onclick={copySave}>
        {ported === 'copied' ? 'Copied' : 'Copy save'}
      </button>
      <button class="reset porter" onclick={pasteSave}>
        {ported === 'refused' ? 'That save was refused' : 'Load a save'}
      </button>
      <span class="keep build">{__BUILD_ID__}</span>
    </div>
    {/if}
  </header>

  {#if ready}
    <div class="map">
      <Board {dots} {lines} {box} label="city" onTap={doTap} drag={false}
        decor={scene} pulse={pops} />
    </div>
    <section class="panel">
      {#if awayLine}
        <p class="away">{awayLine}</p>
      {/if}
      {#if won}
        <p class="away">{won}</p>
      {/if}
      {#if game.fight}
        {@const fi = game.fight}
        {@const wind = windup(fi.round)}
        {@const aimedAt = (fi.sq[fi.target]?.hp ?? 0) > 0
          ? fi.target : fi.sq.findIndex((q) => q.hp > 0)}
        <!-- ★ THE BATTLE STRIP — the owner's own screen: our square left,
             their three right. Tap a square to aim; every verb is a round. -->
        <h2>{nameOf(fi.site)} · goblins</h2>
        <div class="strip">
          <div class="sq us" class:low={game.hero.hp <= 3}>
            <b>{game.hero.hp}</b>
            <span>hero</span>
            <em>hits {heroHit(game)}</em>
          </div>
          <span class="vs" class:hurt={wind}>{wind ? '⚡' : 'vs'}</span>
          {#each fi.sq as q, i (i)}
            <button class="sq them" class:down={q.hp <= 0}
              class:aimed={aimedAt === i}
              disabled={q.hp <= 0} onclick={() => act({ type: 'aim', at: i })}>
              <b>{Math.ceil(q.hp)}</b>
              <span>{q.kind}</span>
              <em>{q.hp > 0 ? `pokes ${q.poke * (wind ? 2 : 1)}` : 'down'}</em>
            </button>
          {/each}
        </div>
        <p class="note" class:windnote={wind}>{wind
          ? 'they WIND UP — this answer bites double'
          : `their answer: ${fi.sq.reduce((n, q) => n + (q.hp > 0 ? q.poke : 0), 0)}${windup(fi.round + 1) ? ' · wind-up next' : ''}`}</p>
        <!-- ★ COMPACT VERBS, 2×2 — four stacked full-width deeds pushed the
             strip off small screens (the visual pass). -->
        <div class="verbs">
          <button class="deed" onclick={() => act({ type: 'strike' })}>
            Attack
            <em>{heroHit(game)} into the {fi.sq[aimedAt]?.kind ?? 'line'}</em>
          </button>
          <button class="deed" onclick={() => act({ type: 'guard' })}>
            Guard
            <em>block their whole answer</em>
          </button>
          <button class="deed" disabled={fi.packs <= 0 || game.food < RATION_FOOD}
            onclick={() => act({ type: 'ration' })}>
            Rations ×{fi.packs}
            <em>{RATION_FOOD} food → +{RATION_HP} hero</em>
          </button>
          <button class="deed" onclick={() => act({ type: 'flee' })}>
            Fall back
            <em>home — the ground keeps its wounds</em>
          </button>
        </div>
      {:else if picked !== null && SITE.has(picked)}
        <h2>{nameOf(picked)}</h2>
        {#if status}<p class="note">{status}</p>{/if}
        {#if picked !== 0 && (game.stacks[picked] ?? 0) > 0 && !game.goblins[picked]}
          <!-- ★ POSTED HANDS — the owner's ask. Pins win the pool; freeing
               them returns everyone to farms-first auto. -->
          <div class="crew">
            <button onclick={() => pinAt(picked!, -1)}
              disabled={(f.hands.get(picked) ?? 0) <= 0 && game.crew[picked] !== undefined}>−</button>
            <span>hands {f.hands.get(picked) ?? 0} of {(game.stacks[picked] ?? 0) * CREW}{
              game.crew[picked] !== undefined ? ' · set by hand' : ''}</span>
            <button onclick={() => pinAt(picked!, 1)}
              disabled={(game.crew[picked] ?? Math.round(f.hands.get(picked) ?? 0)) >= (game.stacks[picked] ?? 0) * CREW}>+</button>
            {#if game.crew[picked] !== undefined}
              <button class="autoback" onclick={() => act({ type: 'free', id: picked! })}>auto</button>
            {/if}
          </div>
        {/if}
        {#each deeds as d (d.label)}
          <button class="deed" disabled={d.why !== null} onclick={d.go}>
            {d.label}
            <em>{d.note}</em>
          </button>
        {/each}
      {:else}
        <p class="note">Tap a site.</p>
      {/if}
    </section>
  {/if}
</main>

<style>
  /* ★ ONE COLUMN EVERYWHERE — the owner, off a desktop screenshot: "it's
     very weird on desktop." The game is a phone column; a wide window gets
     the same column, centred, not a map squeezed over furniture-sized
     buttons. */
  main { display: flex; flex-direction: column; height: 100dvh; background: #efe9dc;
    max-width: 520px; margin: 0 auto; }
  @media (min-width: 560px) {
    main { border-inline: 1px solid #d8d0bf; box-shadow: 0 0 42px #0002; }
    :global(body) { background: #e3dccb; }
  }
  header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 10px 14px; border-bottom: 1px solid #d8d0bf; }
  .spring { display: flex; align-items: baseline; gap: 6px; border: 1px solid #d8d0bf;
    border-radius: 12px; padding: 8px 14px; background: #f7f2e7; font: inherit; }
  .spring b { font-size: 22px; color: #1f6b3a; }
  .spring em { font-style: normal; font-size: 12px; color: #8a8172; }
  .keep { font-size: 14px; color: #6b5d3f; font-weight: 600; }
  .keep.lv { color: #1f6b3a; }
  .keep.hurt { color: #b3452f; }
  .spring.brim { border-color: #b3452f; background: #f7e9e5; }
  .spring.brim b { color: #b3452f; }
  .keep.build { color: #b0a892; font-weight: 400; font-size: 12px; }
  .reset { font: inherit; font-size: 13px; border: 1px solid #d8d0bf;
    border-radius: 10px; padding: 6px 10px; background: #efe9dc; color: #6b6353; }
  .reset.gear { margin-left: auto; }
  .reset.armed { background: #b3452f; color: #fff; }
  .map { flex: 1; min-height: 0; position: relative; margin: 10px; }
  .panel { padding: 8px 14px 16px; border-top: 1px solid #d8d0bf; background: #f7f2e7;
    min-height: 148px; max-height: 44dvh; overflow-y: auto; }
  .menurow { flex-basis: 100%; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .panel h2 { margin: 4px 0 6px; font-size: 18px; }
  .note { color: #8a8172; font-size: 14px; margin: 4px 0; }
  .deed { display: block; width: 100%; text-align: left; font: inherit; font-size: 16px;
    border: 1px solid #d8d0bf; border-radius: 12px; background: #fdfaf2;
    padding: 10px 12px; margin: 6px 0; }
  .deed:disabled { background: #e3ddd0; color: #8a8172; }
  .deed em { display: block; font-style: normal; font-size: 12.5px; color: #8a8172; }
  .crew { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .crew span { font-size: 14px; color: #6b5d3f; }
  .crew button { font: inherit; font-size: 18px; line-height: 1; width: 34px; height: 34px;
    border: 1px solid #d8d0bf; border-radius: 10px; background: #fdfaf2; }
  .crew button:disabled { color: #c9c1ae; }
  .crew .autoback { width: auto; font-size: 13px; padding: 0 10px; color: #6b6353; }
  .away { margin: 4px 0 8px; font-size: 14px; font-weight: 600; color: #1f6b3a;
    border: 1px solid #cfe2cd; background: #eef5ec; border-radius: 10px; padding: 8px 10px; }
  /* ★ THE BATTLE STRIP — one square left, three right. */
  .strip { display: flex; align-items: center; gap: 8px; margin: 8px 0 4px; }
  .sq { width: 68px; aspect-ratio: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1px; font: inherit;
    border-radius: 12px; border: 1px solid #d8d0bf; background: #fdfaf2; }
  .sq b { font-size: 20px; line-height: 1.1; }
  .sq span { font-size: 11.5px; color: #6b5d3f; font-weight: 600; }
  .sq em { font-style: normal; font-size: 10.5px; color: #8a8172; }
  .sq.us { border-color: #1f6b3a; background: #eef5ec; }
  .sq.us b { color: #1f6b3a; }
  .sq.us.low { border-color: #b3452f; background: #f7e9e5; }
  .sq.us.low b { color: #b3452f; }
  .sq.them b { color: #7a4a2f; }
  .sq.them.aimed { border: 2px solid #7a4a2f; background: #f4ead9; }
  .sq.them.down { opacity: 0.35; }
  .vs { font-size: 13px; color: #8a8172; flex: 1; text-align: center; }
  .vs.hurt { color: #b3452f; font-size: 18px; }
  .windnote { color: #b3452f; font-weight: 600; }
  .verbs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
  .verbs .deed { margin: 0; padding: 8px 10px; }
  .verbs .deed em { font-size: 11px; }
</style>
