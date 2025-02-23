<!-- components/GameCard.svelte -->
<script lang="ts">
  import { getGameState } from '$lib/state/game.svelte.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { formatEther } from 'viem';
  import type { GameMetadata } from '$lib/types.js';

  // Props
  const { game } = $props<{ game: GameMetadata }>();

  // Global states
  const gameState = getGameState();
  const uiState = getUIState();

  // Derived values
  const metrics = $derived(gameState.getGameMetrics(game.id));
  const config = $derived(gameState.configs[game.id as keyof typeof gameState.configs]);
  const minStake = $derived(config?.minStake ?? 0n);
</script>

<div class="game-card bg-gradient-to-r {game.gradient}">
  <div class="game-card-content">
    <div class="image-container">
      <img src={game.imageUrl} alt={game.title} />
      {#if game.difficulty}
        <span class="difficulty-badge">{game.difficulty}</span>
      {/if}
    </div>

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
        <div class="metric">
          <span class="metric-label">Min Stake</span>
          <span class="metric-value">{formatEther(minStake)} POL</span>
        </div>
      </div>

      {#if game.features}
        <div class="features-list">
          {#each game.features as feature}
            <span class="feature-tag">{feature}</span>
          {/each}
        </div>
      {/if}

      <div class="card-footer">
        {#if config?.active}
          <a href={game.path} class="play-button">
            Play Now
          </a>
        {:else}
          <span class="inactive-notice">Game currently inactive</span>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>

  .card-footer {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  .inactive-notice {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-style: italic;
  }

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

  .image-container {
    position: relative;
    margin-bottom: 1rem;
  }

  .game-card img {
    width: 100%;
    height: 160px;
    object-fit: cover;
    border-radius: 0.75rem;
    transition: transform 0.3s ease;
  }

  .difficulty-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
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

  .features-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .feature-tag {
    background: rgba(var(--color-primary-rgb), 0.1);
    color: var(--color-primary);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
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
      height: 120px;
    }

    .game-metrics {
      flex-direction: column;
      align-items: center;
    }

    .features-list {
      justify-content: center;
    }
  }
</style>