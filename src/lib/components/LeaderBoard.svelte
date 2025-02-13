<!-- src/lib/components/LeaderBoard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import { getGameState } from '$lib/state/game.svelte.js';
  import { formatEther } from 'viem';
  import type { GameId, Score } from '$lib/types.js';

  // Props
  const { selectedGame }: { selectedGame: GameId } = $props();

  // États globaux
  const walletState = getWalletState();
  const gameState = getGameState();

  // États locaux
  let scores = $state<Score[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // États dérivés
  let currentRound = $derived(gameState.currentRounds[selectedGame]);
  let config = $derived(gameState.configs[selectedGame]);

  // Formatters
  const formatAddress = (address: string) => 
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const formatTime = (timestamp: bigint) => 
    new Date(Number(timestamp) * 1000).toLocaleString();

  const isCurrentPlayer = (address: string) =>
    walletState.address?.toLowerCase() === address.toLowerCase();

  // Fonction pour charger les scores
  async function loadScores() {
    if (!currentRound) return;
    
    try {
      loading = true;
      error = null;
      
      // Trier les scores par ordre décroissant
      scores = [...(currentRound.scores || [])]
        .sort((a, b) => Number(b.score) - Number(a.score));
        
    } catch (err) {
      console.error('Error loading scores:', err);
      error = 'Failed to load leaderboard scores';
    } finally {
      loading = false;
    }
  }

  // Charger les scores initiaux et mettre en place un observateur pour les mises à jour
  $effect(() => {
    if (currentRound) {
      loadScores();
    }
  });
</script>

<div class="leaderboard-content">
  <div class="leaderboard-header">
    <h2 class="section-title">Leaderboard</h2>
    {#if currentRound}
      <div class="prize-pool">
        <span class="prize-value">Prize Pool: {formatEther(currentRound.prizePool)} POL</span>
        {#if config?.active}
          <span class="status-badge active">Active</span>
        {/if}
      </div>
      {#if currentRound.basic}
        <div class="time-info">
          <span class="time-item">Start: {formatTime(currentRound.basic.startTime)}</span>
          <span class="time-item">End: {formatTime(currentRound.basic.endTime)}</span>
        </div>
      {/if}
    {/if}
  </div>

  {#if loading}
    <div class="loading-state">
      <p>Loading scores...</p>
    </div>
  {:else if error}
    <div class="error-state">
      <p>{error}</p>
    </div>
  {:else if scores.length > 0}
    <div class="scores-table">
      {#each scores as { player, score, stake, verified }, i}
        <div 
          class="score-row" 
          class:current-player={isCurrentPlayer(player)}
          class:top-three={i < 3}
        >
          <div class="rank">#{i + 1}</div>
          <div class="player-info">
            <span class="address">{formatAddress(player)}</span>
            {#if isCurrentPlayer(player)}
              <span class="player-badge">You</span>
            {/if}
          </div>
          <div class="score-details">
            <span class="score-value">{score.toString()}</span>
            <span class="stake-value">Stake: {formatEther(stake)} POL</span>
          </div>
          <div class="status">
            {#if verified}
              <span class="status-badge verified">✓ Verified</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p>No scores recorded for this round yet.</p>
      {#if config?.active}
        <p class="sub-text">Be the first to submit your score!</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Styles existants... */

  .loading-state,
  .error-state {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
  }

  .error-state {
    color: rgb(239, 68, 68);
  }

  .top-three {
    background: linear-gradient(to bottom, rgba(var(--color-primary-rgb), 0.2), var(--color-surface));
    border: 1px solid var(--color-primary);
  }

 
  .leaderboard-content {
    background: var(--color-surface);
    border-radius: 1rem;
    padding: 1.5rem;
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }

  .leaderboard-header {
    margin-bottom: 1.5rem;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 1rem;
  }

  .prize-pool {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .prize-value {
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .time-info {
    display: flex;
    gap: 1rem;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  .scores-table {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .score-row {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(to bottom, #ffffff, var(--color-surface-alt));
    border-radius: 0.5rem;
    transition: transform 0.2s ease;
  }

  .score-row:hover {
    transform: translateY(-2px);
  }

  .score-row.current-player {
    background: linear-gradient(to bottom, rgba(var(--color-primary-rgb), 0.1), var(--color-surface));
    border: 1px solid var(--color-primary);
  }

  .rank {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    min-width: 2.5rem;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .address {
    font-family: monospace;
    color: var(--color-text);
  }

  .player-badge {
    padding: 0.25rem 0.5rem;
    background: var(--color-primary);
    color: white;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .score-details {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .score-value {
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .stake-value {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.active {
    background: var(--color-primary);
    color: white;
  }

  .status-badge.verified {
    background: #10B981;
    color: white;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
  }

  .sub-text {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  @media (max-width: 768px) {
    .score-row {
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
      gap: 0.5rem;
    }

    .score-details {
      grid-column: 1 / -1;
    }

    .status {
      grid-column: 1 / -1;
      justify-self: end;
    }
  }
</style>
