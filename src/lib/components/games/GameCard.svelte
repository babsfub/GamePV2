<!-- components/GameCard.svelte -->
<script lang="ts">
  import { getGameState } from '$lib/state/game.svelte.js'
  import { getUIState } from '$lib/state/ui.svelte.js'
  import { formatEther } from 'viem';
  
  const gameState = getGameState();
  const uiState = getUIState();
  
  let { game } = $props();
  
  // Derive game metrics
  const metrics = $derived(gameState.getGameMetrics(game.id));
</script>

<div class="game-card bg-gradient-to-r {game.gradient}">
  <div class="game-card-content">
    <img src={game.imagePath} alt={game.title} />
    
    <div class="game-info">
      <h2>{game.title}</h2>
      <p class="game-description">{game.description}</p>
      
      <div class="game-metrics">
        <div class="metric">
          <span class="metric-label">Prize Pool</span>
          <span class="metric-value">{formatEther(metrics.prizePool)} POL</span>
        </div>
        <div class="metric">
          <span class="metric-label">Players</span>
          <span class="metric-value">{metrics.playerCount}</span>
        </div>
      </div>

      <a href={game.path} class="play-button">
        Play Now
      </a>
    </div>
  </div>
</div>

<style>
  .game-card {
    position: relative;
    border-radius: 1rem;
    overflow: hidden;
    transition: transform 0.3s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
                0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .game-card:hover {
    transform: translateY(-4px);
  }

  .game-card-content {
    background: var(--color-surface);
    padding: 1.5rem;
  }

  .game-card img {
    
    width: 80%;
    max-height: 100px;
    object-fit: cover;
    border-radius: 0.75rem;
    margin-bottom: 1rem;
    transition: transform 0.3s ease;
  }

  .game-card:hover img {
    transform: scale(1.05);
  }

  .game-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .game-description {
    color: var(--color-text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .game-metrics {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 0;
    border-top: 1px solid var(--color-surface-alt);
    border-bottom: 1px solid var(--color-surface-alt);
  }

  .metric {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .metric-label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }

  .metric-value {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-primary);
  }

  .play-button {
    display: inline-block;
    background: var(--color-primary);
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    text-align: center;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .play-button:hover {
    background: var(--color-primary-dark);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    .game-card img {
      height: 150px;
    }

    .game-metrics {
      flex-direction: column;
      align-items: center;
    }
  }
</style>
