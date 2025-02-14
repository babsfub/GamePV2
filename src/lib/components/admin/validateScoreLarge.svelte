<!-- src/lib/components/admin/validateScoreLarge.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import { getGameState } from '$lib/state/game.svelte.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { getValidationState } from '$lib/state/validation.svelte.js';
  import { writeContract, readContract } from '$lib/contracts/actions.js';
  import { publicClient } from '$lib/config/contract.js';
  import { formatEther } from 'viem';
  import { Buffer } from 'buffer';
  import init, { TetrisEngine } from '$lib/games/tetris/pkg/tetris_engine.js';
  import type { 
    GameId, 
    ContractScore,
    Score,
    ContractRoundView,
    RoundView,
    ValidationResult,
    VerificationDetail,
    ValidationMetadata
  } from '$lib/types.js';
  import { ScoreService } from '$lib/utils/scoreServices.js';

  interface Difference {
    field: string;
    contractValue: string;
    dbValue: string;
  }

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
  let tetrisEngine: TetrisEngine | null = $state(null);
  let scoreDifferences = $state<Record<number, Difference[]>>({});
  let verificationResults = $state<Record<number, ValidationResult>>({});
  let validatorNotes = $state<Record<number, string>>({});

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

        // 1. Obtenir la configuration du jeu
        const gameConfig = await readContract.getGameConfig(selectedGame);
        if (!gameConfig) {
            throw new Error('Game config not found');
        }

        // 2. Obtenir les données du round
        const roundData = await readContract.getRoundData(
            gameConfig.currentRound,
            selectedGame
        ) as ContractRoundView;

        // 3. Filtrer d'abord les scores non vérifiés
        const unverifiedScores = roundData.scores.filter(s => !s.verified);

        if (unverifiedScores.length > 0) {
            try {
                // 4. Récupérer les données de la DB
                const dbScores = await ScoreService.getScores(
                    selectedGame,
                    gameConfig.currentRound.toString()
                );

                const enrichedScores = unverifiedScores.map(contractScore => {
                    const dbScore = dbScores.find(
                        (s: any) => s.score_hash === contractScore.scoreHash
                    );
                    
                    return {
                        ...contractScore,
                        transactionHash: dbScore?.transaction_hash ?? '0x0',
                        level: dbScore?.level ? BigInt(dbScore.level) : undefined,
                        lines: dbScore?.lines,
                        moves_count: dbScore?.moves_count,
                        moves_hash: dbScore?.moves_hash
                    } as Score;
                });

                currentRound = {
                    ...roundData,
                    scores: enrichedScores
                };
                pendingScores = enrichedScores;

            } catch (dbError) {
                console.error('DB Error:', dbError);
                // En cas d'erreur DB, on utilise les données du contrat
                currentRound = {
                    ...roundData,
                    scores: unverifiedScores.map(score => ({
                        ...score,
                        transactionHash: '0x0'
                    })) as Score[]
                };
                pendingScores = currentRound.scores;
            }
        } else {
            currentRound = {
                ...roundData,
                scores: []
            };
            pendingScores = [];
        }

        validationState.setCurrentRound({...currentRound});
        validationState.setPendingScores([...pendingScores]);

    } catch (error) {
        console.error('Failed to load pending scores:', error);
        uiState.error(error instanceof Error ? error.message : 'Failed to load pending scores');
    } finally {
        loading = false;
        validationState.setLoading(false);
    }
  }

  async function verifyGameHash(score: Score, index: number): Promise<VerificationDetail> {
    try {
        if (!tetrisEngine) throw new Error('Game engine not initialized');
        const gameConfig = await readContract.getGameConfig(selectedGame);
        if (!gameConfig.saltKey) throw new Error('Salt key not found');

        const hash = tetrisEngine.get_score_hash(
            score.player,
            gameConfig.saltKey,
            score.blockNumber
        );

        const computedHash = `0x${Buffer.from(hash).toString('hex')}` as `0x${string}`;
        const isValid = score.scoreHash === computedHash;

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

  async function verifyGameState(score: Score, index: number): Promise<VerificationDetail> {
    try {
        if (!tetrisEngine) throw new Error('Game engine not initialized');

        const gameConfig = await readContract.getGameConfig(selectedGame);
        const dbScores = await ScoreService.getScores(selectedGame, gameConfig.currentRound.toString());
        const dbScore = dbScores.find((s: any) => s.score_hash === score.scoreHash);
        
        if (!dbScore || !dbScore.game_state) {
            throw new Error('Game state not found in database');
        }

        const gameState = JSON.parse(dbScore.game_state);
        const result = tetrisEngine.verify_game_data(gameState);

        return {
            type: 'game_state',
            success: result.isValid && result.score === score.score,
            timestamp: Date.now(),
            details: {
                score: result.score
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

  async function verifyTransactionHash(score: Score): Promise<VerificationDetail> {
    try {
        if (!score.transactionHash || score.transactionHash === '0x0') {
            throw new Error('Invalid transaction hash');
        }

        const receipt = await publicClient.getTransactionReceipt({ 
            hash: score.transactionHash 
        });

        return {
            type: 'transaction',
            success: receipt !== null && receipt.status === 'success',
            timestamp: Date.now(),
            details: {
                hash: score.transactionHash,
                blockNumber: receipt?.blockNumber
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

  async function verifyChainState(score: Score, index: number): Promise<VerificationDetail> {
    try {
        const gameConfig = await readContract.getGameConfig(selectedGame);
        const roundData = await readContract.getRoundData(gameConfig.currentRound, selectedGame);
        
        const dbScores = await ScoreService.getScores(selectedGame, gameConfig.currentRound.toString());
        const dbScore = dbScores.find((s: any) => s.score_hash === score.scoreHash);
        
        if (!dbScore) {
            throw new Error('Score not found in database');
        }

        const scoreOnChain = roundData.scores.find(s => s.scoreHash === score.scoreHash);
        if (!scoreOnChain) throw new Error('Score not found on chain');

        const differences: Difference[] = [];

        if (scoreOnChain.score !== BigInt(dbScore.score)) {
            differences.push({
                field: 'score',
                contractValue: scoreOnChain.score.toString(),
                dbValue: dbScore.score.toString()
            });
        }

        if (scoreOnChain.blockNumber !== BigInt(dbScore.block_number)) {
            differences.push({
                field: 'blockNumber',
                contractValue: scoreOnChain.blockNumber.toString(),
                dbValue: dbScore.block_number.toString()
            });
        }

        if (scoreOnChain.stake !== BigInt(dbScore.stake)) {
            differences.push({
                field: 'stake',
                contractValue: formatEther(scoreOnChain.stake),
                dbValue: formatEther(BigInt(dbScore.stake))
            });
        }

        scoreDifferences[index] = differences;

        return {
            type: 'chain_state',
            success: differences.length === 0,
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

  async function verifyScore(score: Score, index: number): Promise<ValidationResult> {
    try {
        if (!walletState.address) throw new Error('Wallet not connected');

        const verificationDetails = await Promise.all([
            verifyGameHash(score, index),
            verifyTransactionHash(score),
            verifyGameState(score, index),
            verifyChainState(score, index)
        ]);

        const metadata: ValidationMetadata = {
            transactionHash: score.transactionHash,
            verifier: walletState.address,
            roundId: gameState.configs[selectedGame as keyof typeof gameState.configs]?.currentRound ?? BigInt(0),
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

        // Récupérer les scores validés manuellement
        const validScores = Array.from(selectedScores)
            .filter(index => batchValidation[index] === true)
            .map(index => ({
                index: BigInt(index),
                score: pendingScores[index],
                note: validatorNotes[index] || ''
            }));

        if (validScores.length === 0) {
            uiState.error('No scores selected for validation');
            return;
        }

        // Effectuer les vérifications automatiques pour référence
        const verificationPromises = validScores.map(async ({ score, index }) => {
            const result = await verifyScore(score, Number(index));
            verificationResults[Number(index)] = result;
            
            // Logger les différences et résultats pour traçabilité
            if (scoreDifferences[Number(index)]?.length > 0) {
                console.info(`Differences found for score ${score.scoreHash}:`,
                    scoreDifferences[Number(index)]);
            }
            if (!result.isValid) {
                console.info(`Some automatic checks failed for score ${score.scoreHash}`,
                    result.verificationDetails);
            }
            
            return result;
        });

        await Promise.all(verificationPromises);

        // Soumettre les validations au contrat
        const tx = await writeContract.verifyScoresBatch({
            roundId: gameState.configs[selectedGame as GameId]?.currentRound ?? BigInt(0),
            game: selectedGame,
            scoreIndexes: validScores.map(s => s.index),
            validations: validScores.map(() => true),
            account: walletState.address
        });

        // Enregistrer en DB avec les notes du validateur
        await ScoreService.verifyScores({
            gameId: selectedGame,
            roundId: gameState.configs[selectedGame as GameId]?.currentRound ?? BigInt(0),
            scoreIndexes: validScores.map(s => Number(s.index)),
            validations: validScores.map(() => true),
            verifierAddress: walletState.address,
            transactionHash: tx,
            
        });

        await loadPendingScores();
        uiState.success(`Successfully validated ${validScores.length} scores`);

    } catch (error) {
        console.error('Validation error:', error);
        uiState.error('Failed to submit validations');
    } finally {
        verifying = false;
        validationState.setVerifying(false);
        // Reset des sélections et validations
        selectedScores = new Set();
        batchValidation = {};
        validatorNotes = {};
        validationState.setSelectedScores(new Set());
        validationState.setBatchValidation({});
    }
  }

  function toggleScore(index: number) {
    const newSelected = new Set(selectedScores);
    if (newSelected.has(index)) {
      newSelected.delete(index);
      delete batchValidation[index];
      delete validatorNotes[index];
    } else {
      newSelected.add(index);
    }
    selectedScores = newSelected;
    validationState.setSelectedScores(selectedScores);
    validationState.setBatchValidation(batchValidation);
  }

  function setValidation(index: number, isValid: boolean) {
    batchValidation = { ...batchValidation, [index]: isValid };
    selectedScores.add(index);
    validationState.setSelectedScores(selectedScores);
    validationState.setBatchValidation(batchValidation);
  }

  function setValidatorNote(index: number, note: string) {
    validatorNotes[index] = note;
  }

  async function initialize() {
    try {
      if (selectedGame === 'tetris') {
        await init();
        tetrisEngine = new TetrisEngine(10, 20);
      }
      await loadPendingScores();
      initialized = true;
    } catch (error) {
      console.error('Initialization failed:', error);
      uiState.error('Failed to initialize validator');
    }
  }

  onMount(() => {
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
        <span class="value">Current Round #{currentRound.basic.startTime.toString()}</span>
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
          <div class="selected-info">
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
        </div>

        <div class="table-container">
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
                <th>Differences</th>
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
                  <td class="address">{score.player.slice(0, 6)}...{score.player.slice(-4)}</td>
                  <td class="score">{score.score.toString()}</td>
                  <td class="block">{score.blockNumber.toString()}</td>
                  <td class="hash" title={score.transactionHash}>
                    {score.transactionHash.slice(0, 10)}...
                  </td>
                  <td class="game-info">
                    {#if score.level !== undefined}
                      <span class="info-tag">Level {score.level.toString()}</span>
                    {/if}
                    {#if score.lines !== undefined}
                      <span class="info-tag">Lines {score.lines}</span>
                    {/if}
                    {#if score.moves_count !== undefined}
                      <span class="info-tag">Moves {score.moves_count}</span>
                    {/if}
                  </td>
                  <td>
                    {#if batchValidation[i] !== undefined}
                      <span class="validation-badge {batchValidation[i] ? 'valid' : 'invalid'}">
                        {batchValidation[i] ? '✓ Valid' : '✗ Invalid'}
                      </span>
                    {/if}
                  </td>
                  
                  <td class="differences">
                    {#if scoreDifferences[i]?.length}
                      <div class="differences-list">
                        {#each scoreDifferences[i] as diff}
                          <div class="difference-item">
                            <span class="field">{diff.field}:</span>
                            <div class="values">
                              <span class="contract">Contract: {diff.contractValue}</span>
                              <span class="db">DB: {diff.dbValue}</span>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}
                    {#if verificationResults[i]?.verificationDetails}
                      {#each verificationResults[i].verificationDetails as detail}
                        {#if detail.details.error}
                          <div class="error-message">
                            {detail.type}: {detail.details.error}
                          </div>
                        {/if}
                      {/each}
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
        </div>

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
    margin-bottom: 2rem;
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

  .table-container {
    overflow-x: auto;
    margin: 1rem 0;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    padding: 0.5rem;
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

  th {
    font-weight: 500;
    color: var(--color-text-secondary);
    position: sticky;
    top: 0;
    background: var(--color-surface);
    z-index: 1;
  }

  tr {
    transition: background-color 0.2s;
  }

  tr:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  tr.selected {
    background: rgba(79, 70, 229, 0.1);
  }

  

  

  .game-info {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .info-tag {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.25rem;
    white-space: nowrap;
  }

  .differences-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .difference-item {
    font-size: 0.75rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 0.25rem;
  }

  .field {
    font-weight: 500;
    color: white;
  }

  .values {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.25rem;
  }

  .contract {
    color: rgb(34, 197, 94);
  }

  .db {
    color: rgb(239, 68, 68);
  }

  .error-message {
    font-size: 0.75rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 0.25rem;
    color: rgb(239, 68, 68);
    margin-top: 0.5rem;
  }

  .selected-info {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .selected-count {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
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
    transition: all 0.2s;
  }

  .action-button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-button.approve {
    background: rgb(34, 197, 94);
    color: white;
  }

  .action-button.reject {
    background: rgb(239, 68, 68);
    color: white;
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
    margin-top: 1rem;
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

  .hash {
    font-family: monospace;
    font-size: 0.875rem;
  }

  .address {
    font-family: monospace;
    font-size: 0.875rem;
  }

  .score {
    font-weight: 500;
  }

  @media (max-width: 1024px) {
    .validator-container {
      padding: 1rem;
    }

    .info-panel {
      grid-template-columns: 1fr;
    }

    .selected-info {
      flex-direction: column;
      gap: 1rem;
    }

    .action-buttons {
      width: 100%;
    }

    .action-button {
      flex: 1;
    }

    .table-container {
      margin: 0.5rem -1rem;
      border-radius: 0;
    }

   

    th {
      white-space: nowrap;
    }

    td {
      min-width: 120px;
    }

    .hash, .address {
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  @media (max-width: 768px) {
    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    table {
      min-width: 1000px;
    }

    .info-panel {
      padding: 0.75rem;
    }

    .action-buttons {
      flex-direction: column;
    }

    
  }
</style>