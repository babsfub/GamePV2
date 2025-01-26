<!-- src/lib/components/admin/Validate.svelte -->
<script lang="ts">
    import { onMount } from 'svelte';
    import { writeContract, readContract } from '$lib/contracts/actions.js';
    import { formatEther } from 'viem';
    import { addToast } from '$lib/stores/toasts.js';
    import { wallet } from '$lib/stores/wallet.js';
    import { gamePool } from '$lib/stores/scores.js';
    import { validationStore } from '$lib/stores/validations.js';
  
    const { selectedGame } = $props();
  
    // État réactif via les stores
    const validation = validationStore;
    let isConnected = $derived(Boolean($wallet.address));
  
    // Vérification des accès
    $effect(() => {
      if (!isConnected) {
        validation.setError('Please connect your wallet first.');
        return;
      }
      if (!$wallet.isVerifier) {
        validation.setError('Access denied. You must be a verifier.');
        return;
      }
      validation.setError(null);
    });
  
    async function loadPendingScores() {
    if (!isConnected || !$wallet.isVerifier) return;

    try {
        validation.setLoading(true);
        
        // Obtenir la configuration du jeu pour avoir le round en cours
        const config = await readContract.getGameConfig(selectedGame);
        console.log('Game config:', config);

        // Utiliser le currentRound de la config au lieu de getCurrentRoundId
        const roundId = config.currentRound;
        console.log('Current round from config:', roundId.toString());

        const round = await readContract.getRoundData(roundId, selectedGame);
        console.log('Round data:', round);
        
        validation.setCurrentRound({
        roundId,
        startTime: round.basic.startTime,
        endTime: round.basic.endTime,
        active: !round.basic.rewardsDistributed,
        totalPrizePool: round.basic.totalPrizePool
        });
        
        gamePool.set(round.basic.totalPrizePool);

        // Filtrer les scores non validés
        const pendingScores = round.scores.filter(score => !score.verified);
        console.log('Pending scores for round', roundId.toString(), ':', pendingScores);
        
        validation.setPendingScores(pendingScores);

    } catch (err) {
        console.error('Error loading pending scores:', err);
        validation.setError(err instanceof Error ? err.message : 'Failed to load scores');
    } finally {
        validation.setLoading(false);
    }
    }

async function verifyAndValidateScores() {
  if (!$validation.currentRound || !$wallet.address || !$wallet.isVerifier || $validation.selectedScores.size === 0) return;

  try {
    validation.setVerifying(true);

    // Obtenir les indexes réels depuis les scores en attente
    const indexes = Array.from($validation.selectedScores);
    const validations = indexes.map(index => $validation.batchValidation[index] ?? false);

    // Debug logs
    console.log('Selected scores:', indexes);
    console.log('Validations:', validations);
    console.log('Round ID:', $validation.currentRound.roundId.toString());

    // Convertir les indexes en positions réelles dans le contrat
    const scoreIndexes = indexes.map(index => {
      const score = $validation.pendingScores[index];
      if (!score) throw new Error(`Invalid score index: ${index}`);
      return BigInt($validation.pendingScores.indexOf(score));
    });

    await writeContract.verifyScoresBatch({
      roundId: $validation.currentRound.roundId,
      game: selectedGame,
      scoreIndexes,
      validations,
      account: $wallet.address
    });

    addToast({
      type: 'success',
      message: `Successfully processed ${indexes.length} scores`
    });

    await loadPendingScores();
  } catch (err) {
    console.error('Error validating scores:', err);
    addToast({
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to validate scores'
    });
  } finally {
    validation.setVerifying(false);
    validation.reset();
  }
}
  
    async function generateHash() {
      // Implement the hash generation logic here
      console.log('Hash generated');
    }

    // Initialisation
    onMount(() => {
      if (isConnected && $wallet.isVerifier) {
        loadPendingScores();
      }
    });
  </script>
  
  <div class="validator-container">
    <div class="header">
        <h2>Score Validation</h2>
        {#if !$wallet.isVerifier}
            <div class="warning">
                {isConnected ? 'You must be a verifier to validate scores' : 'Please connect your wallet'}
            </div>
        {/if}
    </div>

    {#if $validation.error}
        <div class="error">{$validation.error}</div>
    {:else}
        <div class="info-panel">
            <div class="info-item">Round #{$validation.currentRound?.roundId.toString() ?? '...'}</div>
            <div class="info-item">Prize Pool: {$validation.currentRound ? formatEther($validation.currentRound.totalPrizePool) : '0'} ETH</div>
            <div class="info-item">Status: {$validation.currentRound?.active ? 'Active' : 'Ended'}</div>
        </div>

        <div class="actions-panel">
            <span class="selected-count">
                {$validation.selectedScores.size > 0 ? `${$validation.selectedScores.size} scores selected` : 'No scores selected'}
            </span>
            <div class="action-buttons">
                <button 
                    class="button verify"
                    disabled={$validation.verifying}
                >
                    Verify Selected Scores
                </button>
                <button
                    class="button validate"
                    disabled={$validation.verifying || $validation.selectedScores.size === 0 || Object.keys($validation.batchValidation).length === 0}
                    onclick={verifyAndValidateScores}
                >
                    Submit Validations
                </button>
            </div>
        </div>

        <div class="scores-section">
            {#if $validation.loading}
                <div class="status-message">Loading pending scores...</div>
            {:else if $validation.pendingScores.length === 0}
                <div class="status-message">No pending scores to validate</div>
            {:else}
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    <input 
                                        type="checkbox" 
                                        onclick={() => validation.toggleAllScores()}
                                    />
                                </th>
                                <th>Player</th>
                                <th>Score</th>
                                <th class="hide-mobile">Stake</th>
                                <th class="hide-mobile">Block</th>
                                <th>Stored Hash</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each $validation.pendingScores as score, i}
                                <tr class={$validation.selectedScores.has(i) ? 'selected' : ''}>
                                    <td>
                                        <input 
                                            type="checkbox" 
                                            checked={$validation.selectedScores.has(i)}
                                            onclick={() => validation.toggleScore(i)}
                                        />
                                    </td>
                                    <td>{score.player.slice(0, 6)}...{score.player.slice(-4)}</td>
                                    <td>{score.score.toString()}</td>
                                    <td class="hide-mobile">{formatEther(score.stake)} ETH</td>
                                    <td class="hide-mobile">{score.blockNumber.toString()}</td>
                                    <td title={score.scoreHash}>{score.scoreHash.slice(0, 10)}...</td>
                                    <td>
                                        {#if $validation.batchValidation[i] !== undefined}
                                            <span class={$validation.batchValidation[i] ? 'valid' : 'invalid'}>
                                                {$validation.batchValidation[i] ? '✅ Valid' : '❌ Invalid'}
                                            </span>
                                        {:else}
                                            <span class="pending">Pending verification</span>
                                        {/if}
                                    </td>
                                    <td class="actions">
                                        <button
                                            class="icon-button approve"
                                            disabled={!$wallet.isVerifier || $validation.verifying}
                                            onclick={() => validation.setValidation(i, true)}
                                            title="Approve Score"
                                        >
                                            ✓
                                        </button>
                                        <button
                                            class="icon-button reject"
                                            disabled={!$wallet.isVerifier || $validation.verifying}
                                            onclick={() => validation.setValidation(i, false)}
                                            title="Reject Score"
                                        >
                                            ✗
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    {/if}
</div>
<style>
  

    .valid {
        color: #16a34a;
        font-weight: 500;
    }

    .invalid {
        color: #dc2626;
        font-weight: 500;
    }

    .pending {
        color: #9ca3af;
        font-style: italic;
    }

    .validator-container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }

    .header { margin-bottom: 1.5rem; }

    .info-panel {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        padding: 1rem;
        margin-bottom: 1.5rem;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 0.5rem;
    }

    .actions-panel {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        margin-bottom: 1.5rem;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 0.5rem;
    }

    .action-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.25rem;
        font-weight: 500;
        cursor: pointer;
    }

    .button:disabled { opacity: 0.5; cursor: not-allowed; }

    
    .verify { background: #7c3aed; color: white; }
    .validate { background: #16a34a; color: white; }

    .table-container {
        width: 100%;
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .icon-button {
        padding: 0.25rem 0.5rem;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
    }

    .icon-button.approve { background: #16a34a; color: white; }
    .icon-button.reject { background: #dc2626; color: white; }

    .status-message {
        text-align: center;
        padding: 2rem;
        color: #9ca3af;
    }

    @media (max-width: 768px) {
        .hide-mobile { display: none; }
        
        .actions-panel {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
        }
        
        .action-buttons {
            flex-direction: column;
            width: 100%;
        }
        
        .button {
            width: 100%;
            margin: 0.25rem 0;
        }
    }
</style>