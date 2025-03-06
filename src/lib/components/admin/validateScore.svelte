<!--/lib/components/admin/ValidateScore.svelte-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import { getGameState } from '$lib/state/game.svelte.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { getValidationState } from '$lib/state/validation.svelte.js';
  import { writeContract, readContract } from '$lib/contracts/actions.js';
  import { publicClient } from '$lib/config/contract.js';
  import { formatEther } from 'viem';
  import type { 
    GameId, 
    ContractScore,
    Score,
    ContractRoundView,
    RoundView,
    ValidationResult,
    VerificationDetail,
    ValidationMetadata,
    GameEngine 
  } from '$lib/types.js';
  import { ScoreService } from '$lib/utils/scoreServices.js';

  // Props
  const { selectedGame } = $props<{ selectedGame: GameId }>();

  // États globaux
  const walletState = getWalletState();
  const gameState = getGameState();
  const uiState = getUIState();
  const validationState = getValidationState();

  // États locaux
  let contractRound: ContractRoundView | null = $state(null);
  let currentRound: RoundView | null = $state<RoundView | null>(null);
  let pendingScores: Score[] = $state([]);
  let selectedScores = $state(new Set<number>());
  let batchValidation: { [key: number]: boolean } = $state({});
  let loading = $state(false);
  let verifying = $state(false);
  let initialized = $state(false);
  let gameEngine: GameEngine | null = $state(null);

  // États dérivés
  let isConnected = $derived(initialized && walletState.isConnected);
  let canVerify = $derived(
    initialized &&
    isConnected && 
    walletState.isVerifier && 
    !verifying && 
    selectedScores.size > 0 &&
    Object.keys(batchValidation).length > 0 &&
    currentRound?.isActive
  );

  async function loadPendingScores() {
    if (!walletState?.isVerifier) return;
    try {
      loading = true;
      validationState.setLoading(true);

      // 1. Obtenir d'abord la configuration et les données du smart contract
      const gameConfig = await readContract.getGameConfig(selectedGame);
      if (!gameConfig) throw new Error('Game config not found');

      const roundData = await readContract.getRoundData(
        gameConfig.currentRound,
        selectedGame
      ) as ContractRoundView;

      // 2. Filtrer les scores non vérifiés
      const unverifiedScores = roundData.scores.filter(s => !s.verified);

      if (unverifiedScores.length > 0) {
        // 3. Faire un seul appel à la DB pour enrichir les données
        const dbScores = await ScoreService.getScores(
          selectedGame, 
          gameConfig.currentRound.toString()
        );

        const enrichedScores = unverifiedScores.map(contractScore => {
          const dbScore = dbScores.find((s: Score) => s.scoreHash === contractScore.scoreHash);
          return {
            ...contractScore,
            transactionHash: dbScore?.transactionHash ?? '0x0',
            level: dbScore?.level,
            lines: dbScore?.lines,
            moves_count: dbScore?.moves_count,
            moves_hash: dbScore?.moves_hash
          };
        });

        currentRound = {
          ...roundData,
          scores: enrichedScores
        };
        pendingScores = enrichedScores;
      } else {
        currentRound = {
          ...roundData,
          scores: roundData.scores.map(score => ({
            ...score,
            transactionHash: '0x0' 
          }))
        };
        pendingScores = [];
      }

      validationState.setCurrentRound({...currentRound});
      validationState.setPendingScores([...pendingScores]);

    } catch (error) {
      console.error('Failed to load pending scores:', error);
      uiState.error('Failed to load pending scores');
    } finally {
      loading = false;
      validationState.setLoading(false);
    }
  }

  async function enrichScoresWithDBData(contractScores: ContractScore[]): Promise<Score[]> {
    const dbScores = await ScoreService.getScores(selectedGame);
    
    return contractScores.map(contractScore => {
      const dbScore = dbScores.find((s: Score) => s.scoreHash === contractScore.scoreHash);
      if (!dbScore?.transactionHash) {
        throw new Error(`DB data not found for score ${contractScore.scoreHash}`);
      }
      return {
        ...contractScore,
        transactionHash: dbScore.transactionHash,
        level: dbScore.level,
        lines: dbScore.lines,
        moves_count: dbScore.moves_count,
        moves_hash: dbScore.moves_hash
      };
    });
  }

  async function verifyGameHash(score: Score): Promise<VerificationDetail> {
    try {
      if (!gameEngine) throw new Error('Game engine not initialized');
      const gameConfig = await readContract.getGameConfig(selectedGame);
      const isValid = gameEngine.verify_score(
        score.scoreHash,
        score.player,
        score.blockNumber,
        gameConfig.saltKey ?? '0x0'
      );

      return {
        type: 'game_hash',
        success: isValid,
        timestamp: Date.now(),
        details: {
          hash: score.scoreHash,
          blockNumber: score.blockNumber
        }
      };
    } catch (error) {
      return {
        type: 'game_hash',
        success: false,
        timestamp: Date.now(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async function verifyTransactionHash(score: Score): Promise<VerificationDetail> {
    try {
      const receipt = await publicClient.getTransactionReceipt({ 
        hash: score.transactionHash 
      });

      return {
        type: 'transaction',
        success: Boolean(receipt?.status),
        timestamp: Date.now(),
        details: {
          hash: score.transactionHash,
          blockNumber: receipt?.blockNumber ?? score.blockNumber
        }
      };
    } catch (error) {
      return {
        type: 'transaction',
        success: false,
        timestamp: Date.now(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async function verifyGameState(score: Score): Promise<VerificationDetail> {
    try {
      if (!gameEngine) throw new Error('Game engine not initialized');
      const gameData = await ScoreService.getScores(selectedGame, score.scoreHash);
      const verificationResult = gameEngine.verify_game_data(gameData.game_state);

      return {
        type: 'game_state',
        success: verificationResult.isValid,
        timestamp: Date.now(),
        details: {
          score: verificationResult.score
        }
      };
    } catch (error) {
      return {
        type: 'game_state',
        success: false,
        timestamp: Date.now(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async function verifyChainState(score: Score): Promise<VerificationDetail> {
    try {
      const gameConfig = await readContract.getGameConfig(selectedGame);
      const roundData = await readContract.getRoundData(gameConfig.currentRound, selectedGame);
      
      const scoreOnChain = roundData.scores.find(s => s.scoreHash === score.scoreHash);
      if (!scoreOnChain) throw new Error('Score not found on chain');

      return {
        type: 'chain_state',
        success: scoreOnChain.score === score.score,
        timestamp: Date.now(),
        details: {
          score: scoreOnChain.score,
          blockNumber: scoreOnChain.blockNumber
        }
      };
    } catch (error) {
      return {
        type: 'chain_state',
        success: false,
        timestamp: Date.now(),
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async function verifyScore(score: Score): Promise<ValidationResult> {
    try {
      if (!walletState.address) throw new Error('Wallet not connected');

      const verificationDetails = await Promise.all([
        verifyGameHash(score),
        verifyTransactionHash(score),
        verifyGameState(score),
        verifyChainState(score)
      ]);

      const metadata: ValidationMetadata = {
        transactionHash: score.transactionHash,
        verifier: walletState.address,
        roundId: gameState.configs[selectedGame as GameId]?.currentRound ?? BigInt(0),
        timestamp: Date.now()
      };

      return {
        isValid: verificationDetails.every(detail => detail.success),
        score: score.score,
        gameId: selectedGame,
        scoreHash: score.scoreHash,
        verificationDetails,
        metadata,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Score verification failed:', error);
      throw error;
    }
  }

  async function verifySelectedScores() {
    if (!canVerify || !walletState.address) return;

    try {
      verifying = true;
      validationState.setVerifying(true);

      const scoreIndexes: number[] = Array.from(selectedScores);
      const validationResults = await Promise.all(
        scoreIndexes.map(index => verifyScore(pendingScores[index]))
      );

      const validScores: number[] = scoreIndexes.filter((_, i) => validationResults[i].isValid);

      if (validScores.length > 0) {
        const tx = await writeContract.verifyScoresBatch({
          roundId: BigInt(validationResults[0].metadata.roundId),
          game: selectedGame,
          scoreIndexes: validScores.map(i => BigInt(i)),
          validations: validScores.map(() => true),
          account: walletState.address
        });

        await ScoreService.verifyScores({
          gameId: selectedGame,
          roundId: validationResults[0].metadata.roundId,
          scoreIndexes: validScores,
          validations: validScores.map(() => true),
          verifierAddress: walletState.address,
          transactionHash: tx
        });
      }

      await loadPendingScores();
      uiState.success('Scores verified successfully');
      validationState.setSelectedScores(new Set());
      validationState.setBatchValidation({});

    } catch (error) {
      console.error('Batch verification failed:', error);
      uiState.error('Failed to verify scores');
    } finally {
      verifying = false;
      validationState.setVerifying(false);
    }
  }

  function toggleScore(index: number) {
    if (selectedScores.has(index)) {
      selectedScores.delete(index);
      delete batchValidation[index];
    } else {
      selectedScores.add(index);
    }
    validationState.setSelectedScores(selectedScores);
    validationState.setBatchValidation(batchValidation);
  }

  function setValidation(index: number, isValid: boolean) {
    batchValidation[index] = isValid;
    if (!selectedScores.has(index)) {
      selectedScores.add(index);
    }
    validationState.setSelectedScores(selectedScores);
    validationState.setBatchValidation(batchValidation);
  }

  async function initialize() {
    try {
      const { TetrisEngine } = await import('$lib/games/tetris/pkg/tetris_engine.js');
      if (selectedGame === 'tetris') {
        const engine = new TetrisEngine(10, 20);
        gameEngine = engine;
      }
      await loadPendingScores();
      initialized = true;
    } catch (error) {
      console.error('Initialization failed:', error);
      uiState.error('Failed to initialize validator');
    }
  }

  $effect(() => {
    if (walletState.isVerifier && !initialized) {
      initialize();
    }
  });
</script>

<div class="validator-container">
  <div class="header">
    <h2>Score Validation</h2>
    {#if walletState && !walletState.isVerifier}
      <div class="warning">
        {isConnected ? 'You must be a verifier to validate scores' : 'Please connect your wallet'}
      </div>
    {/if}
  </div>

  {#if currentRound}
    <div class="info-panel">
      <div class="info-item">
        <span class="label">Round</span>
        <span class="value">Current Round #{currentRound?.basic.startTime.toString()}</span>
      </div>
      <div class="info-item">
        <span class="label">Prize Pool</span>
        <span class="value">{formatEther(currentRound.prizePool)} ETH</span>
      </div>
      <div class="info-item">
        <span class="label">Status</span>
        <span class="value status-badge" class:active={currentRound.isActive}>
          {currentRound.isActive ? 'Active' : 'Ended'}
        </span>
      </div>
    </div>

    <div class="scores-section">
      {#if loading}
        <div class="loading">Loading scores...</div>
      {:else if pendingScores.length === 0}
        <div class="empty">No pending scores to validate</div>
      {:else}
        <div class="actions-panel">
          <span class="selected-count">
            {selectedScores.size} scores selected
          </span>
          <div class="action-buttons">
            <button
              class="action-button approve"
              onclick={() => {
                for (const index of selectedScores) {
                  setValidation(index, true);
                }
              }}
              disabled={verifying}
            >
              Approve Selected
            </button>
            <button
              class="action-button reject"
              onclick={() => {
                for (const index of selectedScores) {
                  setValidation(index, false);
                }
              }}
              disabled={verifying}
            >
              Reject Selected
            </button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Player</th>
              <th>Score</th>
              <th>Block Number</th>
              <th>Transaction Hash</th>
              <th>Game Info</th>
              <th>Validation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {#each pendingScores as score, i}
              <tr class:selected={selectedScores.has(i)}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedScores.has(i)}
                    onchange={() => toggleScore(i)}
                    disabled={verifying}
                  />
                </td>
                <td>{score.player.slice(0, 6)}...{score.player.slice(-4)}</td>
                <td>{score.score.toString()}</td>
                <td>{score.blockNumber.toString()}</td>
                <td>{score.transactionHash.slice(0, 10)}...</td>
                <td>
                  {#if score.level !== undefined}
                    <span class="game-info">Level {score.level.toString()}</span>
                  {/if}
                  {#if score.lines !== undefined}
                    <span class="game-info">Lines {score.lines}</span>
                  {/if}
                </td>
                <td>
                  {#if batchValidation[i] !== undefined}
                    <span class="validation-badge {batchValidation[i] ? 'valid' : 'invalid'}">
                      {batchValidation[i] ? '✓ Valid' : '✗ Invalid'}
                    </span>
                  {/if}
                </td>
                <td>
                  <span class="status-badge pending">
                    Pending
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

        <button
          class="verify-button"
          disabled={!canVerify}
          onclick={verifySelectedScores}
        >
          {verifying ? 'Verifying...' : 'Verify Selected Scores'}
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .validator-container {
    background: var(--color-surface);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header {
    margin-bottom: 1.5rem;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin: 0;
  }

  .warning {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: rgba(234, 179, 8, 0.1);
    color: rgb(234, 179, 8);
    border-radius: 0.5rem;
  }

  .info-panel {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .value {
    font-size: 1.125rem;
    font-weight: 500;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
  }

  .status-badge.active {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
  }

  .status-badge.pending {
    background: rgba(234, 179, 8, 0.1);
    color: rgb(234, 179, 8);
  }

  .game-info {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }

  .actions-panel {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .action-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
  }

  .action-button.approve {
    background: rgb(34, 197, 94);
    color: white;
  }

  .action-button.reject {
    background: rgb(239, 68, 68);
    color: white;
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  tr.selected {
    background: rgba(79, 70, 229, 0.1);
  }

  .validation-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .validation-badge.valid {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
  }

  .validation-badge.invalid {
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
  }

  .verify-button {
    width: 100%;
    background: rgb(79, 70, 229);
    color: white;
    padding: 0.75rem;
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

  .loading, .empty {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
  }

  @media (max-width: 768px) {
    .info-panel {
      grid-template-columns: 1fr;
    }

    .actions-panel {
      flex-direction: column;
      gap: 1rem;
    }

    .action-buttons {
      width: 100%;
    }

    .action-button {
      flex: 1;
    }
  }
</style>