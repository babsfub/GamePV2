<!-- src/lib/components/admin/BatchOperations.svelte -->
<script lang="ts">
    import { getWalletState } from '$lib/state/wallet.svelte.js';
    import { getGameState } from '$lib/state/game.svelte.js';
    import { getUIState } from '$lib/state/ui.svelte.js';
    import { writeContract, readContract } from '$lib/contracts/actions.js';
    import type { GameId, GameConfig } from '$lib/types.js';
  
    // Props
    const { account } = $props<{ account: `0x${string}` }>();
  
    // États globaux
    const walletState = getWalletState();
    const gameState = getGameState();
    const uiState = getUIState();
  
    // États locaux avec Runes
    let selectedGame = $state<GameId>('snake');
    let configUpdates = $state<{
      [key: string]: {
        roundDuration: string;
        minStake: string;
        platformFee: string;
        verifierFee: string;
        active: boolean;
      }
    }>({});
    let loading = $state(false);
    let error = $state<string | null>(null);
  
    // États pour la validation des scores
    let currentRoundScores = $state<{
      index: number;
      player: string;
      score: bigint;
      verified: boolean;
      selected: boolean;
    }[]>([]);
    let selectedScores = $state(new Set<number>());
  
    // Chargement des scores non vérifiés
    async function loadUnverifiedScores() {
      try {
        const gameConfig = await readContract.getGameConfig(selectedGame);
        const roundData = await readContract.getRoundData(
          gameConfig.currentRound,
          selectedGame
        );
  
        currentRoundScores = roundData.scores
          .map((score, index) => ({
            index,
            player: score.player,
            score: score.score,
            verified: score.verified,
            selected: false
          }))
          .filter(score => !score.verified);
  
      } catch (err) {
        console.error('Error loading scores:', err);
        error = 'Failed to load unverified scores';
      }
    }
  
    // Validation batch des scores
    async function verifySelectedScores() {
      if (selectedScores.size === 0) return;
  
      try {
        loading = true;
        error = null;
  
        const gameConfig = await readContract.getGameConfig(selectedGame);
        const indexes = Array.from(selectedScores);
        const validations = indexes.map(() => true); // Tous validés pour cet exemple
  
        const tx = await writeContract.verifyScoresBatch({
          roundId: gameConfig.currentRound,
          game: selectedGame,
          scoreIndexes: indexes.map(BigInt),
          validations,
          account
        });
  
        uiState.success(`Batch verification successful: ${tx}`);
        await loadUnverifiedScores();
  
      } catch (err) {
        console.error('Error in batch verification:', err);
        error = err instanceof Error ? err.message : 'Failed to verify scores';
        uiState.error(error);
      } finally {
        loading = false;
      }
    }
  
    // Effet pour charger les données initiales
    $effect(() => {
      if (walletState.isAdmin) {
        loadUnverifiedScores();
      }
    });
  
    $effect(() => {
      if (selectedGame) {
        loadUnverifiedScores();
      }
    });
  </script>
  
  <div class="batch-operations">
    <h2>Batch Operations</h2>
  
    <div class="game-selector">
      <label for="game-select">Select Game:</label>
      <select
        id="game-select"
        bind:value={selectedGame}
        disabled={loading}
      >
        <option value="snake">Snake</option>
        <option value="tetris">Tetris</option>
      </select>
    </div>
  
    {#if error}
      <div class="alert error" role="alert">
        {error}
      </div>
    {/if}
  
    <!-- Section de validation des scores -->
    <div class="scores-section">
      <h3>Unverified Scores</h3>
      
      {#if currentRoundScores.length === 0}
        <p class="empty">No unverified scores</p>
      {:else}
        <div class="scores-table">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Player</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {#each currentRoundScores as score}
                <tr>
                  <td>
                    <input 
                      type="checkbox"
                      checked={selectedScores.has(score.index)}
                      onchange={(e) => {
                        if (e.currentTarget.checked) {
                          selectedScores.add(score.index);
                        } else {
                          selectedScores.delete(score.index);
                        }
                      }}
                      disabled={loading}
                    />
                  </td>
                  <td>{score.player}</td>
                  <td>{score.score.toString()}</td>
                  <td>
                    <span class="status">
                      {score.verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
  
          <div class="actions">
            <button
              class="verify-button"
              disabled={loading || selectedScores.size === 0}
              onclick={verifySelectedScores}
            >
              {loading ? 'Verifying...' : 'Verify Selected Scores'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <style>
    .batch-operations {
      background: rgb(31 41 55);
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
  
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: white;
      margin-bottom: 1.5rem;
    }
  
    h3 {
      font-size: 1.25rem;
      color: white;
      margin: 1.5rem 0 1rem;
    }
  
    .game-selector {
      margin-bottom: 1.5rem;
    }
  
    .game-selector label {
      display: block;
      margin-bottom: 0.5rem;
      color: rgb(156 163 175);
    }
  
    select {
      width: 100%;
      padding: 0.75rem;
      background: rgb(55 65 81);
      border: 1px solid rgb(75 85 99);
      border-radius: 0.5rem;
      color: white;
    }
  
    .alert {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
    }
  
    .alert.error {
      background: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
    }
  
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }
  
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
  
    th {
      color: rgb(156 163 175);
      font-weight: 500;
    }
  
    .empty {
      text-align: center;
      padding: 2rem;
      color: rgb(156 163 175);
    }
  
    .actions {
      margin-top: 1.5rem;
      display: flex;
      justify-content: flex-end;
    }
  
    .verify-button {
      background: rgb(79 70 229);
      color: white;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
  
    .verify-button:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  
    .verify-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  
    .status {
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      background: rgba(0, 0, 0, 0.2);
    }
  
    @media (max-width: 768px) {
      .batch-operations {
        padding: 1rem;
      }
  
      table {
        display: block;
        overflow-x: auto;
      }
    }
  </style>