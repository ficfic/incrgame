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
  import { loadBlob, saveBlob, requestPersistence } from '../shell/storage';
  import { pack, unpack, toText, fromText, stamp, owed, SAVE_KEY } from '../delve/save';
  import Crypt, { type Cell, type Pass } from './Crypt.svelte';
  import { LAMP } from '../game/ink';
  import { apply, initial, doorsOf, unwalkable, unswingable, canLeave,
    facing, foesIn, actsOn, claimed, hallucinated, canSend, shut, waysOut,
    unwedgeable, affordable, swing, COST, GOODS, SAYS, BAR_TURNS, done, maxHp,
    unshovable, toll, braced, REEL, CRAWL_HP, roomAt, canDescend, unringable, barTurns,
    type Delve, type Good } from '../delve/engine';
  import { TRAITS } from '../delve/bestiary';
  import { RELICS } from '../delve/relics';
  import { MARKS, take, CUT } from '../delve/records';

  let game = $state<Delve>(initial());
  /** ⚠️ NOTHING IS WRITTEN UNTIL THE LOAD HAS FINISHED. The first draft saved
   *  on every state change including the initial one, so an app that opened
   *  and was closed again before IndexedDB answered overwrote a real save with
   *  a fresh game. The one bug a save system must not have. */
  let ready = $state(false);

  const act = (a: Parameters<typeof apply>[1]): void => { game = apply(game, a); };

  onMount(() => {
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(LAMP)) root.setProperty(`--${k}`, v);
    const STEPS = [26, 21, 18, 15, 13, 12, 11, 10];
    STEPS.forEach((px, i) => root.setProperty(`--t${i + 1}`, `${px}px`));
    root.setProperty('--r1', '8px');
    root.setProperty('--r2', '12px');
    void (async () => {
      // ★ IndexedDB, not localStorage — iOS evicts localStorage after about a
      // week idle, and the owner plays this on iOS Edge over weeks.
      const blob = await loadBlob(SAVE_KEY).catch(() => null);
      const found = unpack(blob);
      if (found) {
        // ★★★ THE ONLY WALL CLOCK IN THE GAME, and it is here at the door
        // rather than in `apply`. Time shut becomes TURNS the crawler walked;
        // the engine never learns what a second is.
        const steps = owed(blob, Date.now());
        game = steps > 0 ? apply(found, { type: 'away', turns: steps }) : found;
      }
      ready = true;
      void requestPersistence();
    })();
  });

  /** ★ SAVED AFTER EVERY TURN. There is no other moment to choose: the game is
   *  turn-based, so a turn IS the unit of progress, and a phone browser can
   *  reclaim the tab between any two of them without warning. */
  $effect(() => {
    const blob = stamp(game, Date.now());
    if (!ready) return;
    void saveBlob(blob, SAVE_KEY).catch(() => {});
  });

  let carry = $state('');
  let carried = $state<string | null>(null);
  const doExport = async (): Promise<void> => {
    carry = toText(game);
    carried = await navigator.clipboard?.writeText(carry).then(() => 'copied')
      .catch(() => 'select it and copy') ?? 'select it and copy';
  };
  const doImport = (): void => {
    const found = fromText(carry);
    // ⚠️ AND IT SAYS WHICH. A paste box that silently does nothing on a bad
    // save is indistinguishable from one that silently ate a good one.
    if (found) { game = found; carried = 'loaded'; } else carried = 'that is not a save';
  };

  /** ⚠️ ONLY WHAT THE DARK HAS GIVEN UP. A room you have never stood next to
   *  is not drawn at all — the shape of the dungeon is the thing you are
   *  learning, and drawing it all would be handing over the map. */
  const lit = $derived(game.rooms.filter((r) => game.seen.includes(r.id)));

  /** ★★★ HOW MANY DOORS AWAY EACH LIT ROOM IS. The lamp reads this and
   *  nothing else — see `Crypt.svelte`: the light falls off in DOORS, not
   *  pixels, because every other rule in this game measures distance that way
   *  and a lamp that disagreed would be lying about the rules. */
  const steps = $derived((() => {
    const out = new Map<number, number>([[game.at, 0]]);
    const queue = [game.at];
    for (let i = 0; i < queue.length; i++) {
      const here = queue[i]!;
      for (const d of doorsOf(game, here)) {
        if (out.has(d) || !game.seen.includes(d)) continue;
        out.set(d, out.get(here)! + 1);
        queue.push(d);
      }
    }
    return out;
  })());

  /** ★★★ WHAT THE CRAWLER SAYS IS THERE, minus what you have seen for
   *  yourself. These are drawn as claims — dashed, floorless, cold. */
  const told = $derived(claimed(game).filter((r) => !game.seen.includes(r)));
  const drawn = $derived(game.rooms.filter((r) => lit.includes(r) || told.includes(r.id)));

  const cells = $derived<Cell[]>(drawn.map((r) => ({
    id: r.id, name: r.name, x: r.x, y: r.y, w: r.w, h: r.h,
    step: steps.get(r.id) ?? 9,
    here: game.at === r.id,
    ghost: told.includes(r.id),
    // ★ WHERE THEY ARE, not what the room was built as. The monsters walk the
    // graph, so a lair they have left is just a room and the hall they are
    // standing in is the dangerous one.
    // ⚠️ AND A REPORTED ROOM SHOWS NO DANGER — not because there is none, but
    // because the crawler files everything it did not enter as empty. Drawing
    // the truth here would quietly make its map reliable and delete the game.
    foes: told.includes(r.id) ? 0 : foesIn(game, r.id).length,
    cleared: game.cleared.includes(r.id),
    open: doorsOf(game, game.at).includes(r.id) && unwalkable(game, r.id) === null,
    // ★★★ A WEDGED DOOR READS AS WEDGED. The passage is still drawn — you put
    // it there and you need to see what you cut — but it must never look like
    // a way you can take.
    barred: shut(game, game.at, r.id),
  })));

  /** ⚠️ ONLY PASSAGES BETWEEN TWO LIT ROOMS. A corridor into the dark is a
   *  promise the fog has not made yet. */
  const passes = $derived<Pass[]>([
    ...drawn.flatMap((r) => r.doors
      .filter((d) => d > r.id && drawn.some((x) => x.id === d))
      .map((d) => ({ a: r.id, b: d, cut: shut(game, r.id, d),
        ghost: told.includes(r.id) || told.includes(d) }))),
    // ★★★ AND THE DOORS THAT DO NOT EXIST. The crawler joins up rooms that are
    // merely near each other on its map. Tapping one is how you find out.
    // ★ THE CHALK marks them rather than removing them: the lie stays on the
    //   map, you just get to see which half of it is a lie.
    ...hallucinated(game).map(([a, b]) => ({ a, b, ghost: true,
      fake: game.relics.includes('chalk') })),
  ]);

  const invented = $derived(hallucinated(game));
  /** ★ THE FOUR THINGS THE HOARD BUYS. Order is price order, so the next thing
   *  you can afford is always the next thing down the list. */
  const stock: Good[] = ['wedges', 'edge', 'lamp', 'brace', 'vim'];
  /** Doors out of here you could still spend a wedge on. */
  const wedgeable = $derived(doorsOf(game, game.at).filter((d) => unwedgeable(game, d) === null));
  /** ★★★ THE MOMENT YOU LEARN TO DISTRUST IT. Kept OUT of the engine on
   *  purpose: a refused action must stay refused — not a turn, not a state
   *  change — and there is a test holding `apply` to exactly that. So the
   *  screen says this, and the dungeon does not move. */
  let bunk = $state<string | null>(null);

  /** ★★★ WHAT THE SCREEN NEEDS THAT THE STATE DOES NOT SAY: not what the
   *  numbers ARE, but that they just CHANGED. A turn-based game gives you one
   *  discrete jump per tap, and without something marking the jump the player
   *  cannot tell a turn happened — they have to diff two numbers by eye.
   *  ⚠️ DERIVED IN THE UI, never in the engine. `apply` has no clock in it and
   *  is not getting one; drop every frame and the game plays identically. */
  let shock = $state(0);
  let float = $state<{ room: number; text: string; key: number } | null>(null);
  let wasHp = 99;
  let wasPurse = 0;
  let key = 0;
  $effect(() => {
    const hp = game.hp, purse = game.purse, at = game.at;
    if (hp < wasHp) shock += 1;
    if (purse > wasPurse) { key += 1; float = { room: at, text: `+${purse - wasPurse}`, key }; }
    wasHp = hp; wasPurse = purse;
  });

  const onTap = (n: number): void => {
    if (!roomAt(game, n)) return;
    // ★ TAPPING A DOOR IS WALKING THROUGH IT. One tap, not a tap and a
    // confirm — the owner's whole complaint was the button pressing.
    bunk = null;
    if (unwalkable(game, n) === null) { aim = null; act({ type: 'walk', to: n }); return; }
    if (invented.some(([a, b]) => (a === game.at && b === n) || (b === game.at && a === n))) {
      bunk = `No door goes to ${roomAt(game, n)!.name}. The crawler drew one.`;
    }
  };

  const here = $derived(roomAt(game, game.at)!);
  const line = $derived(facing(game));
  /** ★★★ WHO SWINGS ON THE TURN YOU ARE ABOUT TO TAKE. Everything the player
   *  needs to plan is this list, and it is knowable, so it is shown. */
  const acting = $derived(line.filter((f) => actsOn(f, game.turn + 1)));
  /** ★★★ AND WHAT IT COSTS — standing, or with your arm up. A foe reaches you
   *  at either end of your step, so this is the toll for ANY action taken from
   *  this room. Stepping away on an off-turn is free; that is the dance. */
  const cost = $derived(toll(game));
  const held = $derived(braced(game));

  /** ★★★ WHICH ONE YOU ARE SWINGING AT. ⚠️ THE FIGHT USED TO CHOOSE THIS FOR
   *  YOU, and the owner put it plainly: *"there's just one button and no
   *  gameplay"*. Who you kill first is the decision every turn-based fight is
   *  built on — the runt chips you every turn, the big one bursts every other
   *  — and automating it left a room with two monsters and one button. */
  let aim = $state<number | null>(null);
  const mark = $derived(line.find((f) => f.id === aim) ?? null);
  /** Doors you could put the thing you are facing through. */
  const outs = $derived(mark
    ? doorsOf(game, game.at).filter((d) => unshovable(game, mark.id, d) === null) : []);
</script>

<main>
  <header>
    <div class="bar">
      <span class="cell">
        {#key shock}<b class="kick">{game.hp}</b>{/key}/{maxHp(game)} <em>life</em>
      </span>
      <span class="cell"><b>{game.purse}</b> <em>carried</em></span>
      <span class="cell"><b>{game.hoard}</b> <em>banked</em></span>
      <span class="cell"><b>{game.floor}</b> <em>floor</em></span>
      <span class="cell"><b>{game.turn}</b> <em>turn</em></span>
    </div>
  </header>

  <!-- ★★★ THE REPORT. What you sent down, where it got to, and how much of
       the map is its word rather than yours — because "6 rooms mapped, 4 of
       them nobody has stood in" is the whole tension in one line. -->
  {#if game.crawl}
    <div class="wire" class:gone={game.crawl.done}>
      <span class="tag">crawler</span>
      {#if game.crawl.done}
        <span>lost in {roomAt(game, game.crawl.at)?.name}</span>
      {:else}
        <span>{roomAt(game, game.crawl.at)?.name} · {game.crawl.hp}/{CRAWL_HP}</span>
      {/if}
      <span class="split">
        {game.crawl.walked.length} walked · <b>{told.length}</b> claimed
      </span>
    </div>
  {/if}

  <div class="map">
    <Crypt {cells} {passes} {onTap} label="dungeon" {shock} {float}
      crawlAt={game.crawl && !game.crawl.done ? game.crawl.at : null} />
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
        <!-- ★★★ TAP THE ONE YOU MEAN. ⚠️ THESE USED TO BE A READOUT, because
             an earlier pass decided that making the player aim was "an aiming
             tax". It was the tax the whole fight was made of: with the target
             chosen for you, a room with two monsters in it is one button. -->
        <div class="line">
          {#each line as q (q.id)}
            <button class="sq" class:ready={actsOn(q, game.turn + 1)}
              class:aimed={aim === q.id}
              onclick={() => { aim = aim === q.id ? null : q.id; }}>
              <b>{q.hp}</b>
              <span class="nm">{q.name}</span>
              <em>bites {q.bite}{#if q.every > 1} · every {q.every}{/if}</em>
              <!-- ★★★ WHAT IT DOES, not just what it hits for. A player has to
                   be able to READ a thing they have not met before, rather
                   than finding out by dying to it — and every trait down here
                   is a fact about the graph, so it changes what you do next. -->
              <em class="trait" class:warn={TRAITS[q.breed].heavy || TRAITS[q.breed].howls}>
                {TRAITS[q.breed].says}</em>
              <span class="tick">
                {q.reeling >= game.turn + 1 ? 'reeling'
                  : actsOn(q, game.turn + 1) ? 'swings next' : 'idle next'}
              </span>
            </button>
          {/each}
        </div>

        <button class="deed hit" disabled={unswingable(game) !== null}
          onclick={() => act({ type: 'strike', at: aim ?? undefined })}>
          Swing {#if mark}at {mark.name}{/if}
          <em>takes {swing(game)}{#if cost > 0} · costs you {cost}{:else} · costs you nothing{/if}</em>
        </button>

        <!-- ★★★ AND THE GRAPH VERB THAT LIVES INSIDE A FIGHT. Putting the big
             one through a door and killing the runt while it picks itself up
             is a better line than trading, and there is a test that proves it
             rather than a comment that hopes so. -->
        {#if mark && outs.length > 0}
          {#each outs as d (d)}
            <button class="deed push" onclick={() => { act({ type: 'shove', foe: mark.id, to: d }); aim = null; }}>
              Shove {mark.name} into {roomAt(game, d)?.name}
              <em>no damage · off its feet {REEL} turns · it has to walk back</em>
            </button>
          {/each}
        {:else if mark}
          <p class="note dim">{unshovable(game, mark.id, doorsOf(game, game.at)[0] ?? -1)
            ?? 'nowhere to shove it'}</p>
        {:else if line.length > 1}
          <p class="note dim">tap one of them to aim, or to shove it through a door</p>
        {/if}

        {#each doorsOf(game, game.at).filter((d) => unringable(game, d) === null) as d (d)}
          <button class="deed ring" onclick={() => act({ type: 'ring', at: d })}>
            Ring the bell at {roomAt(game, d)?.name}
            <em>wake it here, on ground you picked</em>
          </button>
        {/each}
        <button class="deed guard" onclick={() => act({ type: 'brace' })}>
          Brace
          <!-- ⚠️ "take 1 instead of 1" IS TRUE AND READS AS A BUG. Halving
               rounds up against you, so a lone 1-bite runt cannot be braced
               against at all — say that, rather than printing the same number
               twice and letting the player think the button is broken. -->
          <em>{cost === 0 ? 'nothing to turn'
            : held < cost ? `take ${held} instead of ${cost}`
            : `no help against this — still ${cost}`} · deal nothing</em>
        </button>

        <button class="deed" onclick={() => act({ type: 'wait' })}>
          Hold
          <em>let the turn pass{#if cost > 0} · costs you {cost}{/if}</em>
        </button>
        {#if canDescend(game)}
          <!-- ★★★ THE STAIR IS IN THE HOARD, the one fight you are not meant
               to win, so going deeper is a dash you earn rather than a button
               on the shop screen. -->
          <button class="deed down" onclick={() => act({ type: 'descend' })}>
            Take the stair down
            <em>floor {game.floor + 1} · banks {game.purse} on the way · a map you have never seen</em>
          </button>
        {/if}
        {#if game.kit.wedges > 0 && wedgeable.length > 0}
          <div class="cut">
            {#each wedgeable as d (d)}
              <button class="deed wedge" onclick={() => act({ type: 'wedge', to: d })}>
                Wedge {roomAt(game, d)?.name}
                <em>shut {barTurns(game)} turns · {game.kit.wedges} left</em>
              </button>
            {/each}
          </div>
        {/if}
        <p class="note dim">
          {#if cost > 0}
            stepping out costs {cost} too — it reaches you at either end of the step
          {:else}
            nothing swings next turn: step out free, or take a swing for nothing
          {/if}
        </p>
      {:else}
        <p class="note">
          {#if doorsOf(game, game.at).length === 1}one door{:else}{doorsOf(game, game.at).length} doors{/if}
          · tap a room to walk there
        </p>
        {#if game.kit.wedges > 0 && wedgeable.length > 0}
          {#each wedgeable as d (d)}
            <button class="deed wedge" onclick={() => act({ type: 'wedge', to: d })}>
              Wedge {roomAt(game, d)?.name}
              <em>shut {barTurns(game)} turns · {game.kit.wedges} left</em>
            </button>
          {/each}
        {/if}
        {#each doorsOf(game, game.at).filter((d) => unringable(game, d) === null) as d (d)}
          <button class="deed ring" onclick={() => act({ type: 'ring', at: d })}>
            Ring the bell at {roomAt(game, d)?.name}
            <em>wake it here, on ground you picked</em>
          </button>
        {/each}
        {#if canSend(game)}
          <button class="deed send" onclick={() => act({ type: 'send' })}>
            Send a crawler down
            <em>{game.crawl
              ? 'it keeps the map the last one filed'
              : 'it walks on its own · it files what it did not look at'}</em>
          </button>
        {/if}
        <button class="deed" onclick={() => act({ type: 'wait' })}>
          Hold
          <em>let the dungeon move</em>
        </button>
        {#if canDescend(game)}
          <button class="deed down" onclick={() => act({ type: 'descend' })}>
            Take the stair down
            <em>floor {game.floor + 1} · banks {game.purse} on the way · a map you have never seen</em>
          </button>
        {/if}
        {#if canLeave(game)}
          <button class="deed" onclick={() => act({ type: 'leave' })}>
            Climb out
            <em>bank {game.purse}</em>
          </button>
        {/if}
      {/if}
    {/if}
    <!-- ★★★ AND THE LINE THIS WHOLE MECHANIC EXISTS FOR. -->
    <!-- ★★★ THE HOARD BUYS SOMETHING. Only at the Mouth, because that is the
         only place you are not being chased, and every line says what it does
         to the GRAPH rather than which number it raises. -->
    <!-- ★★★ THE END. The whole game is a machine's map against a walked one,
         so finishing it is the moment the walked one is complete: nothing left
         on your map that you took somebody else's word for. -->
    {#if done(game)}
      <div class="won">
        <h2>Floor {game.floor} is true</h2>
        <p class="note">
          {game.rooms.length} rooms, stood in, by you. Nothing on this floor is
          anyone else's word any more — and the crawler's inventions went with
          the rest. There is a stair in the Hoard.
        </p>
        <p class="note dim">
          {game.turn} turns · {game.hoard} banked
          {#if game.crawl} · {game.crawl.walked.length} rooms it walked{/if}
        </p>
        <p class="note dim">and it goes deeper than this.</p>
      </div>
    {/if}
    {#if game.relics.length > 0}
      <div class="kept">
        <p class="note dim shead">carried</p>
        {#each game.relics as r (r)}
          <p class="note relic"><b>{RELICS[r].name}</b> — {RELICS[r].says}</p>
        {/each}
      </div>
    {/if}
    {#if game.at === 0 && !game.fallen}
      <!-- ★★★ THE RECORDS. An incremental is a game about a curve and a player
           cannot feel a curve they cannot see; and genre milestones are not
           badges, they are the second progression track — each one is a
           permanent cut of everything the dungeon pays. -->
      <details class="rec">
        <summary>
          the record · <b>{game.won.length}/{MARKS.length}</b> ·
          everything pays <b>×{take(game).toFixed(2)}</b>
        </summary>
        <div class="grid">
          <span><b>{game.tally.delves}</b> delves</span>
          <span><b>{game.tally.falls}</b> falls</span>
          <span><b>{game.tally.kills}</b> put down</span>
          <span><b>{game.tally.deepest}</b> deepest floor</span>
          <span><b>{game.tally.walked}</b> rooms stood in</span>
          <span><b>{game.tally.turns}</b> turns</span>
          <span><b>{game.tally.banked}</b> ever banked</span>
          <span><b>{game.tally.sent}</b> crawlers sent</span>
          <span><b>{game.tally.lost}</b> crawlers lost</span>
        </div>
        {#each MARKS as m (m.id)}
          <p class="note mark" class:got={game.won.includes(m.id)}>
            <b>{m.name}</b> — {m.says}
            {#if game.won.includes(m.id)}<em>+{Math.round(CUT * 100)}%</em>{/if}
          </p>
        {/each}
      </details>
      <div class="shop">
        <p class="note dim shead">
          the hoard · <b>{game.hoard}</b>
          <span class="split">{game.trod.length}/{game.rooms.length} rooms stood in</span>
        </p>
        {#each stock as w (w)}
          <button class="deed buy" disabled={!affordable(game, w)}
            onclick={() => act({ type: 'buy', what: w })}>
            <span class="price">{COST[w]}</span>
            {GOODS[w]}
            <em>{w === 'wedges' && game.kit.wedges > 0
              ? `${SAYS[w]} · ${game.kit.wedges} in the pack`
              : SAYS[w]}</em>
          </button>
        {/each}
      </div>
    {/if}
    {#if game.at === 0 && !game.fallen}
      <!-- ★ HOW THE OWNER MOVES A SAVE BETWEEN DEVICES. `CLAUDE.md` keeps this
           working on purpose; it is the one thing a phone cannot do for you. -->
      <details class="keep">
        <summary>the save</summary>
        <p class="note dim">kept on this device after every turn.</p>
        <textarea bind:value={carry} rows="3" spellcheck="false"
          placeholder="paste a save here, or export one"></textarea>
        <div class="two">
          <button class="deed" onclick={doExport}>Export</button>
          <button class="deed" onclick={doImport} disabled={carry.trim() === ''}>Import</button>
        </div>
        {#if carried}<p class="note dim">{carried}</p>{/if}
      </details>
    {/if}
    {#if bunk}<p class="note bunk">{bunk}</p>{/if}
    {#each [...game.log].reverse().slice(0, 4) as l, i (i)}
      <!-- ★ ONLY THE NEWEST LINE MOVES. Animating the whole list would make
           every turn look like the log had been rewritten. -->
      {#if i === 0}
        {#key game.log.length}<p class="note log fresh">{l}</p>{/key}
      {:else}
        <p class="note log">{l}</p>
      {/if}
    {/each}
  </section>
</main>

<style>
  main { display: flex; flex-direction: column; height: 100dvh;
    background: var(--page); max-width: 520px; margin: 0 auto; }
  header { border-bottom: 1px solid var(--edge); }
  .bar { display: grid; grid-template-columns: repeat(5, 1fr); }
  .cell { display: flex; align-items: baseline; gap: 5px; justify-content: center;
    padding: 8px 4px; border-right: 1px solid var(--rule); }
  .cell:last-child { border-right: 0; }
  .cell b { font-size: var(--t2); color: var(--ink); font-weight: 700; }
  .cell em { font-style: normal; font-size: var(--t7); color: var(--dim);
    letter-spacing: .06em; text-transform: uppercase; }
  /* ★★★ THE WIRE. Cold, thin, and it is the only cold thing on the screen —
     the same blue the map draws a claim in, so the legend teaches itself. */
  .wire { display: flex; align-items: baseline; gap: 8px; padding: 5px 12px;
    font-size: var(--t7); color: #7f9aa6; border-bottom: 1px solid var(--rule);
    background: #0e1315; }
  .wire.gone { color: var(--dim); font-style: italic; }
  .wire .tag { text-transform: uppercase; letter-spacing: .1em;
    font-size: var(--t8); color: #4d6b78; }
  .wire .split { margin-left: auto; }
  .wire b { color: #a8c4d0; }
  .won { margin: 8px 0; padding: 10px 12px; border: 1px solid var(--clay);
    border-radius: var(--r2); background: #1a1109; }
  .won h2 { margin: 0 0 4px; font-size: var(--t3); color: #f0cf87; }
  .shead .split { float: right; color: var(--faint); }
  .shop { margin: 10px 0 4px; border-top: 1px solid var(--rule); padding-top: 6px; }
  .shead { text-transform: uppercase; letter-spacing: .1em; font-size: var(--t8); }
  .shead b { color: var(--ink); font-size: var(--t6); }
  .deed.buy { padding-left: 52px; position: relative; }
  .deed.buy .price { position: absolute; left: 12px; top: 10px; font-weight: 700;
    color: var(--clay); font-size: var(--t5); }
  .deed.buy:disabled .price { color: var(--off); }
  /* ★ Iron, the same as the bar the map draws across a door you wedged. */
  .rec { margin: 10px 0 4px; border-top: 1px solid var(--rule); padding-top: 6px; }
  .rec summary { font-size: var(--t8); text-transform: uppercase;
    letter-spacing: .1em; color: var(--dim); padding: 4px 0; cursor: pointer; }
  .rec summary b { color: #f0cf87; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px;
    font-size: var(--t7); color: var(--faint); margin: 6px 0 10px; }
  .grid b { color: var(--ink); font-weight: 700; }
  .note.mark { color: var(--off); margin: 3px 0; }
  .note.mark.got { color: var(--faint); }
  .note.mark.got b { color: #f0cf87; }
  .note.mark em { font-style: normal; color: var(--moss); font-weight: 700; }
  .kept { margin: 8px 0; border-top: 1px solid var(--rule); padding-top: 6px; }
  .note.relic { color: var(--faint); }
  .note.relic b { color: #a8c4d0; font-weight: 700; }
  .deed.ring { border-color: #4d6b78; }
  .deed.ring em { color: #7f9aa6; }
  .deed.down { border-color: #c2543c; background: #1a1109; }
  .deed.down em { color: #d9755e; }
  .deed.wedge { border-color: #6d5a3a; }
  .deed.wedge em { color: #8a7a5c; }
  .cut { margin: 2px 0; }
  .keep { margin: 10px 0 4px; border-top: 1px solid var(--rule); padding-top: 6px; }
  .keep summary { font-size: var(--t8); text-transform: uppercase;
    letter-spacing: .1em; color: var(--dim); padding: 4px 0; cursor: pointer; }
  .keep textarea { width: 100%; font: inherit; font-size: var(--t7);
    background: var(--sunk); color: var(--faint); border: 1px solid var(--edge);
    border-radius: var(--r1); padding: 6px; resize: none; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  /* ★ THE HIT REGISTERS ON THE NUMBER TOO. Re-keying the node restarts these,
     which is the cheapest correct way to replay a CSS animation on demand. */
  @keyframes kick { 0% { transform: scale(1.5); color: var(--clay); } 100% { transform: none; } }
  .cell b.kick { display: inline-block; animation: kick 320ms ease-out; }
  @keyframes arrive { from { opacity: 0; transform: translateY(-5px); } }
  .note.log.fresh { animation: arrive 220ms ease-out; }
  /* ⚠️ AND ALL OF IT STOPS IF THE PHONE ASKS. Motion is decoration here — the
     game is turn-based and nothing below is load-bearing. */
  @media (prefers-reduced-motion: reduce) {
    .cell b.kick, .note.log.fresh { animation: none; }
  }
  .note.bunk { color: #7f9aa6; border-left: 3px solid #4d6b78; padding-left: 8px; }
  .deed.send { border-color: #35525d; }
  .deed.send em { color: #7f9aa6; }
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
  /* ★ They are buttons now, and must read as buttons on a phone. */
  .sq { cursor: pointer; font: inherit; }
  .sq.aimed { border-color: #f0cf87; box-shadow: inset 0 0 0 1px #f0cf87; }
  .sq.aimed .nm { color: #f0cf87; }
  .deed.push { border-color: #4d6b78; }
  .deed.push em { color: #7f9aa6; }
  .deed.guard { border-color: #5c6b4a; }
  .deed.guard em { color: #8fae74; }
  .sq b { font-size: var(--t2); color: var(--soft); font-weight: 700; }
  .sq.ready b { color: var(--clay); }
  .sq .nm { font-size: var(--t7); color: var(--soft); font-weight: 600; }
  .sq em { font-style: normal; font-size: var(--t8); color: var(--faint);
    text-align: center; }
  .sq .trait { color: var(--dim); }
  /* ★ The two traits that change what you can DO get the warning ink. */
  .sq .trait.warn { color: #c2543c; font-weight: 700; }
  .tick { font-size: var(--t8); letter-spacing: .05em; text-transform: uppercase;
    color: var(--faint); }
  .sq.ready .tick { color: var(--clay); font-weight: 700; }
  .deed.hit { border-color: var(--clay); }
  .deed.hit:disabled { border-color: var(--edge); }
</style>
