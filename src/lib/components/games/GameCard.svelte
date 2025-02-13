<!-- components/GameCard.svelte -->
<script lang="ts">
  import { getGameState } from '$lib/state/game.svelte.js'
  import { getUIState } from '$lib/state/ui.svelte.js'
  
  const gameState = getGameState();
  const uiState = getUIState();
  
  let { game } = $props();
  
  // Derive game metrics
  const metrics = $derived(gameState.getGameMetrics(game.id));
</script>

<div class="game-card">
  <h2>{game.title}</h2>
  <p>Prize Pool: {metrics.prizePool}</p>
  <p>Players: {metrics.playerCount}</p>
</div>