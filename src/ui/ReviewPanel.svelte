<script lang="ts">
  // The human-in-the-loop desk. Three statements; some of them are rot.
  // Keeping a corrupt one leaves the lie in your graph. Rejecting a good one
  // throws away real knowledge. That is the entire skill of the mechanic, and
  // it is OPTIONAL — Orchestrators do this for you, worse, forever.
  import type { ReviewItem } from '../core/types';
  import { conceptAt, ontologyRevision, warm } from '../shell/ontology';

  let {
    items,
    oncommit,
  }: {
    items: ReviewItem[];
    oncommit: (keep: boolean[]) => void;
  } = $props();

  let keep = $state<boolean[]>([]);

  // A fresh queue resets the toggles. Default is KEEP: doing nothing accepts
  // everything, which is exactly what happens if you never open this panel.
  // Key the reset on the batch's IDENTITY, not on the prop object. The queue is
  // frozen into state, so this fires once per batch instead of ten times a
  // second — which is what was silently erasing every verdict the player tapped.
  let armedFor = $state('');
  $effect(() => {
    const id = items.map((i) => `${i.conceptIndex}:${i.glossIndex}`).join('|');
    if (id !== armedFor) {
      armedFor = id;
      keep = items.map(() => true);
      warm(items.flatMap((i) => [i.conceptIndex, i.glossIndex]));
    }
  });

  const resolved = $derived.by(() => {
    void $ontologyRevision;
    return items.map((item) => {
      const c = conceptAt(item.conceptIndex);
      const g = conceptAt(item.glossIndex);
      if (!c || !g) return null;
      // A drifted statement is a real concept wearing SOMEONE ELSE'S real
      // definition — which is what a hallucinated statement actually looks
      // like. Both strings are verbatim licensed text; only the pairing is
      // generated, so the no-generated-prose rule holds. You have to READ it.
      return { label: c.label, gloss: g.gloss, category: c.category };
    });
  });
</script>

<section class="desk">
  <header>
    <span class="tag">Review queue</span>
    <span class="hint">optional · Orchestrators do this automatically</span>
  </header>
  <p class="brief">Does each definition match its concept?</p>

  {#each items as item, i (i)}
    {@const c = resolved[i]}
    <div class="item" class:rejected={!keep[i]}>
      <div class="body">
        <div class="label">{c ? c.label : '…'}</div>
        <div class="gloss">{c ? c.gloss : ''}</div>
      </div>
      <div class="verdict">
        <button
          class="v keep"
          class:on={keep[i]}
          aria-pressed={keep[i]}
          onclick={() => (keep[i] = true)}
        >Accept</button>
        <button
          class="v drop"
          class:on={!keep[i]}
          aria-pressed={!keep[i]}
          onclick={() => (keep[i] = false)}
        >Reject</button>
      </div>
    </div>
  {/each}

  <button class="commit" onclick={() => oncommit([...keep])}>
    Commit review
    <small>{keep.filter(Boolean).length} accepted · {keep.filter((k) => !k).length} rejected</small>
  </button>
</section>

<style>
  .desk {
    border: 1px solid #22304a;
    border-radius: 14px;
    padding: 10px 12px 12px;
    background: #0d1420;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .tag {
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: hsl(var(--hue, 168) 60% 60%);
  }
  .hint { font-size: 0.64rem; color: #46586a; }
  .brief { margin: 0; font-size: 0.72rem; color: #6b8195; }
  .item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 7px 0;
    border-top: 1px solid #16202e;
  }
  .item.rejected .body { opacity: 0.42; text-decoration: line-through; }
  .body { flex: 1; min-width: 0; }
  .label { font-weight: 600; color: #eaf6f2; font-size: 0.95rem; }
  .gloss {
    font-size: 0.75rem;
    color: #8fa5b3;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .verdict { display: flex; flex-direction: column; gap: 4px; }
  .v {
    appearance: none;
    border: 1px solid #22304a;
    background: #111826;
    color: #7f95a3;
    border-radius: 7px;
    padding: 4px 9px;
    font-size: 0.68rem;
    cursor: pointer;
    min-width: 62px;
  }
  .v.keep.on { border-color: hsl(var(--hue, 168) 50% 40%); color: hsl(var(--hue, 168) 70% 68%); }
  .v.drop.on { border-color: #6b2b3a; color: #d98a99; }
  .commit {
    appearance: none;
    margin-top: 2px;
    border: 1px solid hsl(var(--hue, 168) 40% 30%);
    background: hsl(var(--hue, 168) 35% 12%);
    color: hsl(var(--hue, 168) 70% 72%);
    border-radius: 10px;
    padding: 9px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .commit small { font-weight: 400; font-size: 0.66rem; color: #46586a; }
</style>
