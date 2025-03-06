<!-- src/lib/components/admin/RoundDistribution.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { getWalletState } from '$lib/state/wallet.svelte.js';
    import { getGameState } from '$lib/state/game.svelte.js';
    import { getUIState } from '$lib/state/ui.svelte.js';
    import { writeContract, readContract } from '$lib/contracts/actions.js';
    import { formatEther } from 'viem';
    import type { GameId, RoundView } from '$lib/types.js';
  
    // Props
    const { account } = $props<{ account: `0x${string}` }>();
  
    // États globaux
    const walletState = getWalletState();
    const gameState = getGameState();
    const uiState = getUIState();
  
    // États locaux avec Runes
    let pendingRounds = $state<{
      gameId: GameId;
      roundId: bigint;
      roundData: RoundView;
    }[]>([]);
    let loading = $state(false);
    let distributing = $state<{[key: string]: boolean}>({});
    let error = $state<string | null>(null);
  
    // États dérivés
    let hasPendingRounds = $derived(pendingRounds.length > 0);
  
    // Fonction pour charger les rounds en attente de distribution
    // Dans roundDistribution.svelte
async function loadPendingRounds() {
    if (!walletState.isAdmin) return;
    
    try {
      loading = true;
      error = null;
      const pending: typeof pendingRounds = [];

      for (const gameId of ['snake', 'tetris'] as GameId[]) {
        try {
          const config = await readContract.getGameConfig(gameId);
          
          const startRound = config.currentRound;
          const endRound = config.currentRound > 5n ? config.currentRound - 5n : 0n;
          
          for (let roundId = startRound; roundId > endRound; roundId--) {
            const contractRoundData = await readContract.getRoundData(roundId, gameId);
            
            // Transformer les scores pour inclure transactionHash
            const transformedScores = contractRoundData.scores.map(score => ({
              ...score,
              transactionHash: '0x0' as `0x${string}`, // Valeur par défaut
              level: undefined,
              lines: 0,
              moves_count: 0,
              moves_hash: ''
            }));

            // Créer une RoundView compatible
            const roundData: RoundView = {
              ...contractRoundData,
              scores: transformedScores
            };

            if (
              roundData.basic &&
              BigInt(roundData.basic.endTime) < BigInt(Date.now() / 1000) &&
              !roundData.basic.rewardsDistributed &&
              roundData.scores.length > 0
            ) {
              pending.push({
                gameId,
                roundId,
                roundData
              });
            }
          }
        } catch (err) {
          console.warn(`Error checking rounds for ${gameId}:`, err);
        }
      }

      pendingRounds = pending;

    } catch (err) {
      console.error('Error loading pending rounds:', err);
      error = err instanceof Error ? err.message : 'Failed to load pending rounds';
      uiState.error(error);
    } finally {
      loading = false;
    }
}
  
    // Fonction pour distribuer les récompenses d'un round
    async function distributeRound(gameId: GameId, roundId: bigint) {
      const key = `${gameId}-${roundId}`;
      if (distributing[key]) return;
  
      try {
        distributing[key] = true;
        error = null;
  
        const tx = await writeContract.distributeRewards({
          roundId,
          game: gameId,
          account
        });
  
        uiState.success(`Rewards distributed successfully! TX: ${tx}`);
        await loadPendingRounds();
  
      } catch (err) {
        console.error('Error distributing rewards:', err);
        error = err instanceof Error ? err.message : 'Failed to distribute rewards';
        uiState.error(error);
      } finally {
        distributing[key] = false;
      }
    }
  
    // Calculer le montant total distribué
    function calculateTotalRewards(roundData: RoundView): string {
      const total = roundData.winners.reduce((sum, winner) => sum + winner.reward, 0n);
      return formatEther(total);
    }
  
    // Chargement initial et rafraîchissement périodique
    onMount(() => {
      if (walletState.isAdmin) {
        loadPendingRounds();
        const interval = setInterval(loadPendingRounds, 60000); // Rafraîchir toutes les minutes
        return () => clearInterval(interval);
      }
    });
  
    $effect(() => {
      if (walletState.isAdmin) {
        loadPendingRounds();
      }
    });
  </script>
  
  <div class="round-distribution">
    <div class="header">
      <h2>Pending Round Distributions</h2>
      <button 
        class="refresh-button"
        onclick={loadPendingRounds}
        disabled={loading}
      >
        {loading ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  
    {#if error}
      <div class="alert error" role="alert">
        {error}
      </div>
    {/if}
  
    {#if loading && pendingRounds.length === 0}
      <div class="loading">Loading pending rounds...</div>
    {:else if !hasPendingRounds}
      <div class="empty">No pending round distributions</div>
    {:else}
      <div class="rounds-grid">
        {#each pendingRounds as { gameId, roundId, roundData }}
          <div class="round-card">
            <div class="round-header">
              <div class="game-info">
                <span class="game-badge">
                  {gameId.charAt(0).toUpperCase() + gameId.slice(1)}
                </span>
                <span class="round-id">Round #{roundId.toString()}</span>
              </div>
              <div class="prize-pool">
                Prize Pool: {formatEther(roundData.prizePool)} ETH
              </div>
            </div>
  
            <div class="round-details">
              <div class="stats-grid">
                <div class="stat-item">
                  <span class="label">Total Scores</span>
                  <span class="value">{roundData.scores.length}</span>
                </div>
                <div class="stat-item">
                  <span class="label">Verified Scores</span>
                  <span class="value">
                    {roundData.scores.filter(s => s.verified).length}
                  </span>
                </div>
                <div class="stat-item">
                  <span class="label">Verifiers</span>
                  <span class="value">{roundData.verifiers.length}</span>
                </div>
              </div>
  
              <div class="time-info">
                <div class="time-item">
                  <span class="label">Start:</span>
                  <span class="value">
                    {new Date(Number(roundData.basic.startTime) * 1000).toLocaleString()}
                  </span>
                </div>
                <div class="time-item">
                  <span class="label">End:</span>
                  <span class="value">
                    {new Date(Number(roundData.basic.endTime) * 1000).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
  
            <button
              class="distribute-button"
              disabled={distributing[`${gameId}-${roundId}`] || roundData.scores.some(s => !s.verified)}
              onclick={() => distributeRound(gameId, roundId)}
            >
              {#if roundData.scores.some(s => !s.verified)}
                Waiting for verifications
              {:else if distributing[`${gameId}-${roundId}`]}
                Distributing...
              {:else}
                Distribute Rewards
              {/if}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <style>
    .round-distribution {
      background: rgb(31 41 55);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
  
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
  
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: white;
      margin: 0;
    }
  
    .refresh-button {
      padding: 0.5rem 1rem;
      background: rgb(55 65 81);
      border: none;
      border-radius: 0.5rem;
      color: white;
      cursor: pointer;
      transition: all 0.2s;
    }
  
    .refresh-button:hover:not(:disabled) {
      background: rgb(75 85 99);
    }
  
    .refresh-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  
    .alert.error {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
      background: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
    }
  
    .loading, .empty {
      text-align: center;
      padding: 2rem;
      color: rgb(156 163 175);
    }
  
    .rounds-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }
  
    .round-card {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  
    .round-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
  
    .game-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  
    .game-badge {
      padding: 0.25rem 0.5rem;
      background: rgb(79 70 229);
      color: white;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
    }
  
    .round-id {
      color: rgb(156 163 175);
    }
  
    .prize-pool {
      font-weight: 500;
      color: rgb(34 197 94);
    }
  
    .round-details {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0.5rem;
    }
  
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }
  
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.25rem;
      padding: 0.5rem;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 0.375rem;
    }
  
    .time-info {
      display: grid;
      gap: 0.5rem;
    }
  
    .time-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }
  
    .label {
      color: rgb(156 163 175);
    }
  
    .value {
      color: white;
      font-weight: 500;
    }
  
    .distribute-button {
      background: rgb(79 70 229);
      color: white;
      padding: 0.75rem;
      border: none;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
  
    .distribute-button:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  
    .distribute-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  
    @media (max-width: 768px) {
      .round-distribution {
        padding: 1rem;
      }
  
      .rounds-grid {
        grid-template-columns: 1fr;
      }
  
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
  
      .time-info {
        font-size: 0.75rem;
      }
    }
  </style>