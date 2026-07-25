<script lang="ts">
  // A choose-your-own-adventure beat.
  //
  // ★ The prose is OWNER-WRITTEN and currently empty (src/content/vignettes.ts).
  // Where words are missing this renders a visible "awaiting text" marker, so
  // an unwritten vignette looks unfinished rather than quietly fake. The
  // mechanical effects render from the numbers, so the choice is still a real,
  // legible decision with no words at all.
  import type { Vignette } from '../core/types';
  import { describeEffects } from '../content/vignettes';

  let {
    vignette,
    onchoose,
  }: {
    vignette: Vignette;
    onchoose: (choiceId: string) => void;
  } = $props();
</script>

<section class="vignette" aria-label="Decision">
  <div class="tag">Decision</div>

  {#if vignette.title}
    <h2>{vignette.title}</h2>
  {:else}
    <h2 class="slot">⟨title — owner⟩</h2>
  {/if}

  {#if vignette.body}
    <p>{vignette.body}</p>
  {:else}
    <p class="slot">⟨body — owner⟩</p>
  {/if}

  <div class="choices">
    {#each vignette.choices as choice (choice.id)}
      <button onclick={() => onchoose(choice.id)}>
        {#if choice.label}
          <span class="label">{choice.label}</span>
        {:else}
          <span class="label slot">⟨choice — owner⟩</span>
        {/if}
        <small>{describeEffects(choice.effects)}</small>
      </button>
    {/each}
  </div>
</section>

<style>
  .vignette {
    border: 1px solid hsl(var(--hue, 168) 40% 28%);
    border-radius: 14px;
    padding: 14px;
    background: hsl(var(--hue, 168) 30% 9%);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tag {
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: hsl(var(--hue, 168) 60% 60%);
  }
  h2 { margin: 0; font-size: 1.05rem; color: #eaf6f2; }
  p { margin: 0; font-size: 0.86rem; line-height: 1.45; color: #8fa5b3; }
  /* An empty prose slot must LOOK empty. Never fill these in with generated
     text — see CLAUDE.md. */
  .slot {
    color: #3d5166;
    font-style: italic;
    font-weight: 400;
  }
  .choices { display: flex; flex-direction: column; gap: 6px; margin-top: 2px; }
  .choices button {
    appearance: none;
    text-align: left;
    border: 1px solid #22304a;
    background: #111826;
    color: #cfe0e8;
    border-radius: 10px;
    padding: 9px 11px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .choices button:active { border-color: hsl(var(--hue, 168) 50% 45%); }
  .label { font-size: 0.9rem; font-weight: 600; }
  .choices small {
    font-size: 0.68rem;
    color: hsl(var(--hue, 168) 45% 58%);
    font-variant-numeric: tabular-nums;
  }
</style>
