<script lang="ts">
  // ★★★ THE DELVE SCREEN — the dungeon pivot, and then the TURN, 2026-08-16.
  //
  // The dungeon is the screen. No fight screen, no clock, no strip you go to:
  // what is in the room is standing in the room, and there are three verbs —
  // WALK (tap a room), SWING, HOLD.
  //
  // ★★★ AND THE PRICE OF EVERY VERB IS ON SCREEN BEFORE YOU PAY IT. This is
  // the one thing the real-time version could not do, and the reason the
  // owner was right to kill it: with turns, the game can tell you EXACTLY what
  // the next exchange costs — *"stepping out costs 2"*, *"it is idle next
  // turn"* — so the dance is a decision you make rather than a reflex you
  // miss. Hiding that half turns footwork into a coin toss.
  //
  // ⚠️ THE BOARD IS REUSED UNTOUCHED. `Board.svelte` draws edges on canvas and
  // puts DOM over them for anything with a word or a tap target; it went from
  // a valley to a dungeon with no changes at all.
  import { onMount } from 'svelte';
  import Board, { type Dot, type Line } from './Board.svelte';
  import { PAPER } from '../game/ink';
  import { ROOM, ROOMS } from '../delve/dungeon';
  import { apply, initial, doorsOf, unwalkable, unswingable, canLeave,
    facing, foesIn, actsOn, START_HP, BITE, type Delve } from '../delve/engine';

  let game = $state<Delve>(initial());
  let picked = $state<number | null>(null);

  const act = (a: Parameters<typeof apply>[1]): void => { game = apply(game, a); };

  onMount(() => {
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(PAPER)) root.setProperty(`--${k}`, v);
    const STEPS = [26, 21, 18, 15, 13, 12, 11, 10];
    STEPS.forEach((px, i) => root.setProperty(`--t${i + 1}`, `${px}px`));
    root.setProperty('--r1', '8px');
    root.setProperty('--r2', '12px');
  });

  /** ⚠️ ONLY WHAT THE DARK HAS GIVEN UP. A room you have never stood next to
   *  is not drawn at all — the shape of the dungeon is the thing you are
   *  learning, and drawing it all would be handing over the map. */
  const lit = $derived(ROOMS.filter((r) => game.seen.includes(r.id)));

  const dots = $derived<Dot[]>(lit.map((r) => ({
    id: `room:${r.id}`,
    name: r.name,
    // ★★★ A ROOM WITH SOMETHING STANDING IN IT READS AS DANGEROUS, wherever
    // that thing started. The monsters walk the graph, so this is about where
    // they ARE and not about what the room was built as.
    kind: game.at === r.id ? 'you' : foesIn(game, r.id).length > 0 ? 'foe'
      : game.cleared.includes(r.id) ? 'fact' : 'stop',
    wx: r.x, wy: r.y,
    place: true,
    you: game.at === r.id,
    open: doorsOf(game.at).includes(r.id) && unwalkable(game, r.id) === null,
    shut: false,
    known: true,
    on: picked === r.id,
    barred: foesIn(game, r.id).length > 0,
  })));

  /** ⚠️ ONLY DOORS BETWEEN TWO LIT ROOMS. A corridor into the dark is a
   *  promise the fog has not made yet. */
  const lines = $derived<Line[]>(lit.flatMap((r) =>
    r.doors
      .filter((d) => d > r.id && game.seen.includes(d))
      .map((d) => ({
        a: `room:${r.id}`, b: `room:${d}`,
        rel: 'route', fill: 1, load: 0, gauge: 1,
      }))));

  /** ⚠️ THE BOX GROWS WITH THE DARK. It frames only the LIT rooms, so the
   *  first descent is close-up and the view pulls back as the dungeon is
   *  learned — the map earning its own scale instead of announcing how much
   *  you have not seen. */
  const box = $derived((() => {
    const pad = 70;
    const xs = lit.map((r) => r.x);
    const ys = lit.map((r) => r.y);
    const x = Math.min(...xs) - pad;
    const y = Math.min(...ys) - pad;
    return { x, y,
      w: Math.max(...xs) + pad - x,
      h: Math.max(...ys) + pad - y };
  })());

  const onTap = (id: string): void => {
    const n = Number(id.split(':')[1]);
    if (!ROOM.has(n)) return;
    picked = n;
    // ★ TAPPING A DOOR IS WALKING THROUGH IT. One tap, not a tap and a
    // confirm — the owner's whole complaint was the button pressing.
    if (unwalkable(game, n) === null) act({ type: 'walk', to: n });
  };

  const here = $derived(ROOM.get(game.at)!);
  const line = $derived(facing(game));
  /** ★★★ WHO SWINGS ON THE TURN YOU ARE ABOUT TO TAKE. Everything the player
   *  needs to plan is this list, and it is knowable, so it is shown. */
  const acting = $derived(line.filter((f) => actsOn(f, game.turn + 1)));
  /** ★★★ AND WHAT IT COSTS. A foe reaches you at either end of your step, so
   *  this is the toll for ANY action taken from this room — swing, hold or
   *  walk out. Stepping away on an off-turn is free; that is the dance. */
  const toll = $derived(acting.reduce((n, f) => n + f.bite, 0));
</script>

<main>
  <header>
    <div class="bar">
      <span class="cell"><b>{game.hp}</b>/{START_HP} <em>life</em></span>
      <span class="cell"><b>{game.purse}</b> <em>carried</em></span>
      <span class="cell"><b>{game.hoard}</b> <em>banked</em></span>
      <span class="cell"><b>{game.turn}</b> <em>turn</em></span>
    </div>
  </header>

  <div class="map">
    <Board {dots} {lines} {box} label="dungeon" {onTap} drag={false} />
  </div>

  <section class="panel">
    {#if game.fallen}
      <h2>You went down in the dark</h2>
      <p class="note">What you carried stays there. The hoard is safe.</p>
      <button class="deed" onclick={() => act({ type: 'leave' })}>
        Take up the lamp again
      </button>
    {:else}
      <h2>{here.name}</h2>
      {#if line.length > 0}
        <!-- ★★★ THE READOUT THE CLOCK COULD NOT GIVE. Each thing says whether
             it swings on the turn you are about to take — so you can count
             before you commit instead of feeling for a rhythm. -->
        <div class="line">
          {#each line as q (q.id)}
            <span class="sq" class:ready={actsOn(q, game.turn + 1)}>
              <b>{q.hp}</b>
              <span class="nm">{q.name}</span>
              <em>bites {q.bite}{#if q.every > 1} · every {q.every}{/if}</em>
              <span class="tick">
                {actsOn(q, game.turn + 1) ? 'swings next' : 'idle next'}
              </span>
            </span>
          {/each}
        </div>
        <button class="deed hit" disabled={unswingable(game) !== null}
          onclick={() => act({ type: 'strike' })}>
          Swing
          <em>takes {BITE}{#if toll > 0} · costs you {toll}{:else} · costs you nothing{/if}</em>
        </button>
        <button class="deed" onclick={() => act({ type: 'wait' })}>
          Hold
          <em>let the turn pass{#if toll > 0} · costs you {toll}{/if}</em>
        </button>
        <p class="note dim">
          {#if toll > 0}
            stepping out costs {toll} too — it reaches you at either end of the step
          {:else}
            nothing swings next turn: step out free, or take a swing for nothing
          {/if}
        </p>
      {:else}
        <p class="note">
          {#if doorsOf(game.at).length === 1}one door{:else}{doorsOf(game.at).length} doors{/if}
          · tap a room to walk there
        </p>
        <button class="deed" onclick={() => act({ type: 'wait' })}>
          Hold
          <em>let the dungeon move</em>
        </button>
        {#if canLeave(game)}
          <button class="deed" onclick={() => act({ type: 'leave' })}>
            Climb out
            <em>bank {game.purse}</em>
          </button>
        {/if}
      {/if}
    {/if}
    {#each [...game.log].reverse().slice(0, 4) as l, i (i)}
      <p class="note log">{l}</p>
    {/each}
  </section>
</main>

<style>
  main { display: flex; flex-direction: column; height: 100dvh;
    background: var(--page); max-width: 520px; margin: 0 auto; }
  header { border-bottom: 1px solid var(--edge); }
  .bar { display: grid; grid-template-columns: repeat(4, 1fr); }
  .cell { display: flex; align-items: baseline; gap: 5px; justify-content: center;
    padding: 8px 4px; border-right: 1px solid var(--rule); }
  .cell:last-child { border-right: 0; }
  .cell b { font-size: var(--t2); color: var(--ink); font-weight: 700; }
  .cell em { font-style: normal; font-size: var(--t7); color: var(--dim);
    letter-spacing: .06em; text-transform: uppercase; }
  /* ★ The dungeon takes the screen. It is the game, not an illustration. */
  .map { flex: 0 0 auto; height: 48dvh; margin: 10px; position: relative; }
  .panel { flex: 1 1 auto; min-height: 0; overflow-y: auto;
    padding: 8px 14px 16px; border-top: 1px solid var(--edge);
    background: var(--panel); }
  .panel h2 { margin: 4px 0 6px; font-size: var(--t3); }
  .note { color: var(--faint); font-size: var(--t5); margin: 4px 0; }
  .note.dim { color: var(--dim); }
  .note.log { border-left: 3px solid var(--rule); padding-left: 8px; margin: 5px 0; }
  .deed { display: block; width: 100%; text-align: left; font: inherit;
    font-size: var(--t4); border: 1px solid var(--edge); border-radius: var(--r2);
    background: var(--card); padding: 10px 12px; margin: 6px 0; min-height: 44px; }
  .deed:disabled { background: var(--sunk); color: var(--faint); }
  .deed em { display: block; font-style: normal; font-size: var(--t6);
    color: var(--faint); }
  .line { display: flex; gap: 8px; margin: 8px 0 4px; }
  /* ★ A READOUT, NOT BUTTONS. There is nothing to press on a monster — you
     swing at the room, you hold, or you leave it. */
  .sq { flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 1px; min-height: 74px; padding: 6px 4px;
    border: 1px solid var(--edge); border-radius: var(--r2);
    background: var(--sunk); }
  /* ★★★ THE ONE THING WORTH A COLOUR: it is about to swing. */
  .sq.ready { background: var(--clayWash); border-color: var(--clay); }
  .sq b { font-size: var(--t2); color: var(--soft); font-weight: 700; }
  .sq.ready b { color: var(--clay); }
  .sq .nm { font-size: var(--t7); color: var(--soft); font-weight: 600; }
  .sq em { font-style: normal; font-size: var(--t8); color: var(--faint);
    text-align: center; }
  .tick { font-size: var(--t8); letter-spacing: .05em; text-transform: uppercase;
    color: var(--faint); }
  .sq.ready .tick { color: var(--clay); font-weight: 700; }
  .deed.hit { border-color: var(--clay); }
  .deed.hit:disabled { border-color: var(--edge); }
</style>
