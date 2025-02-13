<!-- lib/components/games/ScoreSubmit.svelte -->
<script lang="ts">
  import { getGameState } from '$lib/state/game.svelte.js';
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { writeContract } from '$lib/contracts/actions.js';
  import { publicClient } from '$lib/config/contract.js';
  import { parseEther, formatEther, keccak256, toHex } from 'viem';
  import type { 
    GameId, 
    ContractScore,
    Score,
    GameEngine,
    ValidationMetadata 
  } from '$lib/types.js';
  import { ScoreService } from '$lib/utils/scoreServices.js';

  // Props
  const { 
    gameId,
    score,
    onSubmit,
    isGameOver,
    gameEngine,
    gameState: initialGameState
  } = $props<{
    gameId: GameId;
    score: number;
    onSubmit: () => Promise<void>;
    isGameOver: boolean;
    gameEngine: GameEngine | null;
    gameState: Record<string, any>;
  }>();

  // États globaux
  const walletState = getWalletState();
  const gameState = getGameState();
  const uiState = getUIState();

  // États locaux
  let selectedStake = $state('0.001');
  let submitting = $state(false);
  let error = $state<string | null>(null);

  // États dérivés
  let config = $derived(gameState.configs[gameId as keyof typeof gameState.configs]);
  let minStake = $derived(config?.minStake ?? 0n);
  let platformFee = $derived(config?.platformFee ?? 0);

  let canSubmit = $derived(
    walletState.isConnected && 
    !submitting &&
    isGameOver &&
    config?.active &&
    score > 0
  );

  let stakeOptions = $derived(() => {
    const min = Number(formatEther(minStake));
    return [min, min * 2, min * 5].map(v => v.toFixed(3));
  });

  async function prepareContractSubmission(): Promise<{
    contractScore: Omit<ContractScore, 'verified' | 'verifier'>,
    metadata: Partial<ValidationMetadata>,
      
  }> {
    if (!walletState.address || !config) {
      throw new Error('Wallet not connected or game config not found');
    }

    const stake = parseEther(selectedStake);
    console.log('Stake:', stake);
    const block = await publicClient.getBlock();
    console.log('Current block:', block.number);
    const scoreHash = keccak256(toHex(`${score}${config.saltKey}`));
    console.log('Score hash:', scoreHash);

    return {
      contractScore: {
        player: walletState.address,
        score: BigInt(score),
        blockNumber: block.number,
        stake,
        scoreHash,
      },
      metadata: {
        blockNumber: block.number,
        timestamp: Date.now()
      }
    };
  }

  async function submitToContract(contractScore: Omit<ContractScore, 'verified' | 'verifier'>) {
    if (!walletState.address) throw new Error('Wallet not connected');

    return await writeContract.submitScore({
      game: gameId,
      score: contractScore.score,
      hash: contractScore.scoreHash,
      account: walletState.address,
      value: contractScore.stake
    });
  }

  async function submitToDB(
    contractScore: Omit<ContractScore, 'verified' | 'verifier'>,
    transactionHash: `0x${string}`,
    receipt: any,
    gameData: any
  ) {
    await ScoreService.submitScore({
      gameState: gameData,
      playerAddress: contractScore.player,
      score: contractScore.score,
      blockNumber: contractScore.blockNumber,
      stake: contractScore.stake,
      scoreHash: contractScore.scoreHash,
      transactionHash,
      contractHash: receipt.blockHash,
      roundId: config?.currentRound ?? BigInt(0),
      transactionBlockNumber: receipt.blockNumber,
      transactionTimestamp: new Date()
    });
  }

  async function handleSubmit() {
    if (!canSubmit || !walletState.address || !config || !gameEngine) return;

    try {
      submitting = true;
      error = null;

      // Préparer les données pour le contrat
      const { contractScore, metadata } = await prepareContractSubmission();
      console.log('Submitting score:', contractScore);
      // Vérifier que le score est valide avant soumission
      const isValid = gameEngine.verify_score(
        contractScore.scoreHash,
        contractScore.player,
        contractScore.blockNumber,
        config.saltKey
      );

      if (!isValid) {
        throw new Error('Score validation failed');
      }

      // Soumettre au smart contract
      const tx = await submitToContract(contractScore);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      // Sauvegarder en DB
      await submitToDB(contractScore, tx, receipt, initialGameState);

      // Mettre à jour l'UI
      await onSubmit();
      uiState.success(`Score submitted! TX: ${tx}`);

    } catch (err) {
      console.error('Error submitting score:', err);
      error = err instanceof Error ? err.message : 'Failed to submit score';
      uiState.error(error);
    } finally {
      submitting = false;
    }
  }
</script>

<div class="stake-manager">
  {#if !isGameOver}
    <div class="game-over">
      Game in progress. Cannot submit score.
    </div>
  {:else}
    <div class="stake-selector">
      <h3>Select Stake (POL)</h3>
      
      {#if config}
        <div class="game-info">
          <span>Min Stake: {formatEther(minStake)} POL</span>
          <span>Fee: {platformFee}%</span>
        </div>
        
        <div class="stake-options">
          {#each stakeOptions() as stake}
            <button
              class="stake-button"
              class:selected={selectedStake === stake}
              onclick={() => selectedStake = stake as unknown as string}
              disabled={!canSubmit}
            >
              {stake} POL
            </button>
          {/each}
          
          <button
            class="stake-button submit"
            disabled={!canSubmit}
            onclick={handleSubmit}
          >
            {submitting ? 'Submitting...' : 'Submit Score'}
          </button>
        </div>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="error">
      {error}
    </div>
  {/if}
</div>

<style>
  .stake-manager {
    margin-top: 1rem;
    padding: var(--spacing-screen-safe);
    background: var(--color-surface);
    border-radius: 1rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .game-over {
    text-align: center;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
    border-radius: 0.5rem;
    font-size: 0.875rem;
  }

  .stake-selector {
    background: var(--color-surface-alt);
    padding: 1.5rem;
    border-radius: 0.5rem;
    box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
  }

  h3 {
    color: var(--color-text);
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 1rem;
  }

  .game-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .game-info span {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
  }

  .game-info span:hover {
    background: rgba(0, 0, 0, 0.15);
  }

  .stake-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .stake-button {
    background: var(--color-primary);
    border: none;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .stake-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .stake-button.selected {
    background: var(--color-secondary);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .stake-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .error {
    margin-top: 1rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
    border-radius: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
  }

  .submit {
    grid-column: 1 / -1;
    background: var(--color-primary);
    font-weight: 600;
    padding: 1rem;
    margin-top: 0.5rem;
  }

  .submit:hover:not(:disabled) {
    background: var(--color-secondary);
  }

  @media (max-width: 768px) {
    .stake-manager {
      margin-top: 0.5rem;
      padding: var(--spacing-screen-safe);
    }

    .stake-selector {
      padding: 1rem;
    }

    .stake-options {
      grid-template-columns: repeat(2, 1fr);
    }

    .game-info {
      flex-direction: column;
      gap: 0.5rem;
      align-items: center;
    }
  }
</style>
