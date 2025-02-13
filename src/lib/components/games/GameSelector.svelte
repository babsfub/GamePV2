<!-- lib/components/games/GameSelector.svelte -->
<script lang="ts">
  import type { GameId } from '$lib/types.js';

  import { writable } from 'svelte/store';

  export let selected: GameId | 'all';
  export let games: GameId[];

  const selectedStore = writable(selected);

  function handleSelect(value: GameId | 'all') {
    selectedStore.set(value);
  }
</script>

<div class="game-selector">
  <button 
    class="game-selector-button {selected === 'all' ? 'active' : ''}"
    onclick={() => handleSelect('all')}
  >
    All Games
  </button>

  {#each games as gameId}
    <button 
      class="game-selector-button {selected === gameId ? 'active' : ''}"
      onclick={() => handleSelect(gameId)}
    >
      {gameId.charAt(0).toUpperCase() + gameId.slice(1)}
    </button>
  {/each}
</div>