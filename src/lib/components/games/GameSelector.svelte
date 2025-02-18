<!-- components/GameSelector.svelte -->
<script lang="ts">
  import type { GameId } from '$lib/types.js';

  const { 
    selected,
    games,
    onSelect 
  } = $props<{ 
    selected: GameId | 'all',
    games: GameId[],
    onSelect: (value: GameId | 'all') => void
  }>();

  let select = $state(selected);

  function handleSelect(value: GameId | 'all') {
    select = value;
    onSelect(value);
  }
</script>

<div class="game-selector">
  <div class="selector-container">
    <button 
      class="btn-selector {select === 'all' ? 'active' : ''}"
      onclick={() => handleSelect('all')}
    >
      All Games
    </button>

    {#each games as gameId}
      <button
        class="btn-selector {select === gameId ? 'active' : ''}"
        onclick={() => handleSelect(gameId)}
      >
        {gameId.charAt(0).toUpperCase() + gameId.slice(1)}
      </button>
    {/each}
  </div>
</div>

<style>
  .game-selector {
    background: var(--color-surface);
    border-radius: 1rem;
    padding: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .selector-container {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn-selector {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-text);
    cursor: pointer;
  }

  .btn-selector:hover:not(.active) {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  .btn-selector.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  @media (max-width: 640px) {
    .game-selector {
      padding: 0.5rem;
    }

    .btn-selector {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }
  }
</style>