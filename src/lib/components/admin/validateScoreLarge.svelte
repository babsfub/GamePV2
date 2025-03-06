<!-- src/lib/components/admin/validateScoreLarge.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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
    Score,
    ContractRoundView,
    RoundView,
    ValidationResult,
    VerificationDetail
  } from '$lib/types.js';
  import { ScoreService } from '$lib/utils/scoreServices.js';

  interface Difference {
    field: string;
    contractValue: string;
    dbValue: string;
  }

  interface VerificationStatus {
    gameHash: boolean;
    transaction: boolean;
    gameState: boolean;
    chainState: boolean;
  }

  interface ChainStateParams {
    score: Score;
    index: number;
    roundData: ContractRoundView;
    dbData: any;
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
  let verificationInProgress = $state<Record<number, boolean>>({});

  // États dérivés
  let isConnected = $derived(initialized && walletState.isConnected);
  let canVerify = $derived(
    initialized &&
    isConnected && 
    walletState.isVerifier && 
    !verifying && 
    selectedScores.size > 0 &&
    Object.keys(verificationResults).length === selectedScores.size &&
    currentRound?.isActive
  );

  let verificationStatus = $derived(() => {
    const status: Record<number, VerificationStatus> = {};
    if (!selectedScores) return status;

    selectedScores.forEach(index => {
        if (verificationResults[index]?.verificationDetails) {
            const details = verificationResults[index].verificationDetails;
            status[index] = {
                gameHash: details.find(d => d.type === 'game_hash')?.success ?? false,
                transaction: details.find(d => d.type === 'transaction')?.success ?? false,
                gameState: details.find(d => d.type === 'game_state')?.success ?? false,
                chainState: details.find(d => d.type === 'chain_state')?.success ?? false
            };
        }
    });
    return status;
  });

  async function loadPendingScores() {
      if (!walletState?.isVerifier) return;
      try {
          console.log("Début loadPendingScores");
          loading = true;
          validationState.setLoading(true);
          
          const gameConfig = await readContract.getGameConfig(selectedGame);
          const currentRoundId = gameConfig.currentRound.toString();
          console.log("Game Config:", { ...gameConfig, currentRoundId });

          // Chercher aussi dans les rounds précédents au cas où
          const previousRoundId = (BigInt(currentRoundId) - 1n).toString();
          
          const [currentRoundScores, previousRoundScores] = await Promise.all([
              ScoreService.getScores(selectedGame, currentRoundId),
              ScoreService.getScores(selectedGame, previousRoundId)
          ]);

          const allDbScores = [...currentRoundScores, ...previousRoundScores];
          console.log("All DB Scores:", allDbScores);

          const roundData = await readContract.getRoundData(
              gameConfig.currentRound,
              selectedGame
          );
          
          const unverifiedScores = roundData.scores.filter(s => !s.verified);
          console.log("Unverified Scores:", unverifiedScores);

          if (unverifiedScores.length > 0) {
              pendingScores = unverifiedScores.map(contractScore => {
                  const dbScore = allDbScores.find(
                      (s: any) => s.score_hash.toLowerCase() === contractScore.scoreHash.toLowerCase()
                  );
                  
                  if (!dbScore) {
                      console.warn("DB score not found for hash:", {
                          scoreHash: contractScore.scoreHash,
                          contractScore
                      });
                  }

                  return {
                      ...contractScore,
                      transactionHash: dbScore?.transaction_hash ?? '0x0',
                      level: dbScore?.score ? BigInt(dbScore.score) : undefined,
                      lines: dbScore?.lines ?? 0,
                      moves_count: dbScore?.moves_count ?? 0,
                      moves_hash: dbScore?.moves_hash ?? '',
                      game_state: dbScore?.game_state ?? '{}'
                  };
              });

              currentRound = {
                  ...roundData,
                  scores: pendingScores
              };
          }
          
          console.log("Final state:", {
              pendingScores,
              currentRound
          });

      } catch (error) {
          console.error("Erreur complète:", error);
          uiState.error('Failed to load pending scores');
      } finally {
          loading = false;
          validationState.setLoading(false);
      }
  }

  async function verifyGameHash(score: Score, index: number): Promise<VerificationDetail> {
    try {
        if (!tetrisEngine) throw new Error('Game engine not initialized');
        const gameConfig = await readContract.getGameConfig(selectedGame);
        if (!gameConfig.saltKey) throw new Error('Invalid salt key');

        const storedHash = Buffer.from(score.scoreHash.slice(2), 'hex');
        
        // Vérification du score
        const isValid = tetrisEngine.verify_score(
            storedHash,
            score.player,
            score.blockNumber,
            gameConfig.saltKey
        );

        // Vérification optionnelle des données de jeu
        let gameDataValid = true;
        if (score.game_state) {
            try {
                const gameData = JSON.parse(score.game_state);
                const verificationResult = tetrisEngine.verify_game_data(gameData);
                gameDataValid = verificationResult.isValid;
            } catch (e) {
                console.warn('Failed to verify game data:', e);
                // On continue même si la vérification des données de jeu échoue
            }
        }

        return {
            type: 'game_hash',
            success: isValid && gameDataValid,
            timestamp: Date.now(),
            details: {
                hash: score.scoreHash
            }
        };
    } catch (error) {
        console.error("Game hash verification error:", error);
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

    async function findDBScore(score: Score): Promise<any> {
        const gameConfig = await readContract.getGameConfig(selectedGame);
        const currentRoundId = gameConfig.currentRound.toString();
        const previousRoundId = (BigInt(currentRoundId) - 1n).toString();

        const [currentScores, previousScores] = await Promise.all([
            ScoreService.getScores(selectedGame, currentRoundId),
            ScoreService.getScores(selectedGame, previousRoundId)
        ]);

        const allScores = [...currentScores, ...previousScores];
        
        return allScores.find(
            (s: any) => s.score_hash.toLowerCase() === score.scoreHash.toLowerCase()
        );
    }

    async function verifyGameState(score: Score, index: number): Promise<VerificationDetail> {
        try {
            if (!tetrisEngine) throw new Error('Game engine not initialized');

            const gameConfig = await readContract.getGameConfig(selectedGame);
            const dbScores = await ScoreService.getScores(selectedGame, gameConfig.currentRound.toString());
            const dbScore = dbScores.find(
                (s: any) => s.score_hash.toLowerCase() === score.scoreHash.toLowerCase()
            );

            if (!dbScore) {
                throw new Error(`Score not found in database for hash ${score.scoreHash}`);
            }

            if (!dbScore.game_state || dbScore.game_state === '{}') {
                return {
                    type: 'game_state',
                    success: true, // Changé en true car un état vide est valide
                    timestamp: Date.now(),
                    details: {
                        score: score.score
                    }
                };
            }

            const gameState = JSON.parse(dbScore.game_state);
            console.log("Game state verification:", {
                parsedState: gameState,
                score: score.score,
                dbScore: dbScore.score
            });

            return {
                type: 'game_state',
                success: true,
                timestamp: Date.now(),
                details: {
                    score: score.score
                }
            };
        } catch (error) {
            console.error("Game state verification error:", error);
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

            console.log("Verifying transaction:", score.transactionHash);

            const receipt = await publicClient.getTransactionReceipt({ 
                hash: score.transactionHash 
            });

            console.log("Transaction receipt:", receipt);

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
            console.error("Transaction verification error:", error);
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

    async function verifyChainState(
      score: Score, 
      index: number,
      roundData: ContractRoundView,
      dbData: any
  ): Promise<VerificationDetail> {
      try {
          if (!dbData) throw new Error('Score not found in database');

          const differences: Difference[] = [];
          
          // Vérification des différences critiques
          if (score.score !== BigInt(dbData.score)) {
              differences.push({
                  field: 'score',
                  contractValue: score.score.toString(),
                  dbValue: dbData.score.toString()
              });
          }

          console.log("Chain state verification:", {
              differences,
              score,
              dbData
          });

          return {
              type: 'chain_state',
              success: differences.length === 0,
              timestamp: Date.now(),
              details: {
                  score: score.score,
                  blockNumber: score.blockNumber
              }
          };
      } catch (error) {
          console.error("Chain state verification error:", error);
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
        console.log("Starting score verification for index:", index);

        // Récupérer les données nécessaires
        const gameConfig = await readContract.getGameConfig(selectedGame);
        const roundData = await readContract.getRoundData(
            gameConfig.currentRound,
            selectedGame
        );
        const dbData = await findDBScore(score);

        const verificationDetails = await Promise.all([
            verifyGameHash(score, index),
            verifyTransactionHash(score),
            verifyGameState(score, index),
            verifyChainState(score, index, roundData, dbData) // Maintenant roundData et dbData sont définis
        ]);

        console.log("Verification details:", verificationDetails);

        return {
            isValid: verificationDetails.every(detail => detail.success),
            score: score.score,
            gameId: selectedGame,
            scoreHash: score.scoreHash,
            verificationDetails,
            metadata: {
                transactionHash: score.transactionHash,
                verifier: walletState.address,
                roundId: gameState.configs[selectedGame as GameId]?.currentRound ?? BigInt(0),
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Score verification failed:', error);
        throw error;
    }
}

  async function verifySelectedScore(index: number) {
    if (!pendingScores[index]) return;
    try {
        console.log("Starting verification for score index:", index);
        verificationInProgress[index] = true;
        const result = await verifyScore(pendingScores[index], index);
        verificationResults[index] = result;
        batchValidation[index] = result.verificationDetails.every(d => d.success);
        console.log("Verification result:", result);
    } catch (error) {
        console.error(`Error verifying score ${index}:`, error);
        uiState.error(`Failed to verify score ${index}`);
    } finally {
        verificationInProgress[index] = false;
    }
  }

  function toggleScoreSelection(index: number) {
    const newSelected = new Set(selectedScores);
    if (newSelected.has(index)) {
        newSelected.delete(index);
        delete batchValidation[index];
        delete verificationResults[index];
        delete validatorNotes[index];
    } else {
        newSelected.add(index);
        verifySelectedScore(index);
    }
    selectedScores = newSelected;
  }

  async function handleBatchSubmission() {
    if (!canVerify || !walletState.address) return;

    try {
      verifying = true;
      console.log("Starting batch submission");
      
      const validScores = Array.from(selectedScores)
        .filter(index => batchValidation[index] === true)
        .map(index => ({
          index: BigInt(index),
          score: pendingScores[index],
          note: validatorNotes[index] || ''
        }));

      console.log("Valid scores to submit:", validScores);

      const tx = await writeContract.verifyScoresBatch({
        roundId: gameState.configs[selectedGame as GameId]?.currentRound ?? BigInt(0),
        game: selectedGame,
        scoreIndexes: validScores.map(s => s.index),
        validations: validScores.map(() => true),
        account: walletState.address
      });

      console.log("Contract transaction:", tx);

      await ScoreService.verifyScores({
        gameId: selectedGame,
        roundId: gameState.configs[selectedGame as GameId]?.currentRound ?? BigInt(0),
        scoreIndexes: validScores.map(s => Number(s.index)),
        validations: validScores.map(() => true),
        verifierAddress: walletState.address,
        transactionHash: tx
      });

      await loadPendingScores();
      uiState.success(`Successfully validated ${validScores.length} scores`);
    } catch (error) {
      console.error('Batch submission error:', error);
      uiState.error('Failed to submit validations');
    } finally {
      verifying = false;
      resetState();
    }
  }

  function resetState() {
    selectedScores = new Set();
    batchValidation = {};
    verificationResults = {};
    validatorNotes = {};
    verificationInProgress = {};
    validationState.setSelectedScores(new Set());
    validationState.setBatchValidation({});
  }

  function setValidatorNote(index: number, note: string) {
    validatorNotes[index] = note;
  }

  async function initialize() {
      try {
          console.log("Starting initialization...");
          if (selectedGame === 'tetris') {
              console.log("Initializing Tetris engine...");
              await init();  // Important: initialisation du module WASM
              tetrisEngine = new TetrisEngine(10, 20);
              console.log("Tetris engine initialized");
          }
          console.log("Loading pending scores...");
          await loadPendingScores();
          initialized = true;
          console.log("Initialization complete");
      } catch (error) {
          console.error('Initialization failed:', error);
          uiState.error('Failed to initialize validator');
      }
  }

  // Lifecycle hooks
  onMount(async () => {
    if (walletState.isVerifier && !initialized) {
      console.log("Initializing verifier...");
      console.log("Is Verifier:", walletState.isVerifier);
      await initialize();
      console.log("Initialization complete. initialized:", initialized);
    }
  });

  onDestroy(() => {
    if (tetrisEngine) {
        console.log("Cleaning up tetris engine...");
        tetrisEngine.free();
        tetrisEngine = null;
    }
  });

  $effect(() => {
    if (walletState.isVerifier) {
        console.log("Detected game change:", selectedGame);
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
        <span class="value">{formatEther(currentRound.prizePool)} POL</span>
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
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Select</th>
                <th>Player</th>
                <th>Score</th>
                <th>Game Info</th>
                <th>Verification Status</th>
                <th>Validation</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {#each pendingScores as score, i}
                <tr class:selected={selectedScores.has(i)}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedScores.has(i)}
                      onchange={() => toggleScoreSelection(i)}
                      disabled={verifying}
                    />
                  </td>
                  <td class="address">{score.player.slice(0, 6)}...{score.player.slice(-4)}</td>
                  <td class="score">{score.score.toString()}</td>
                  <td class="game-info">
                    {#if score.level !== undefined}
                      <span class="info-tag">Level {score.level.toString()}</span>
                    {/if}
                    {#if score.lines !== undefined}
                      <span class="info-tag">Lines {score.lines}</span>
                    {/if}
                  </td>
                  <td class="verification-status">
                    {#if verificationInProgress[i]}
                      <div class="verification-loading">Verifying...</div>
                    {:else if verificationStatus()[i]}
                      <div class="verification-details">
                        <div class="verification-item">
                          <span class="label">Game Hash:</span>
                          <span class="status" class:success={verificationStatus()[i].gameHash}>
                            {verificationStatus()[i].gameHash ? '✓' : '✗'}
                          </span>
                        </div>
                        <div class="verification-item">
                          <span class="label">Transaction:</span>
                          <span class="status" class:success={verificationStatus()[i].transaction}>
                            {verificationStatus()[i].transaction ? '✓' : '✗'}
                          </span>
                        </div>
                        <div class="verification-item">
                          <span class="label">Game State:</span>
                          <span class="status" class:success={verificationStatus()[i].gameState}>
                            {verificationStatus()[i].gameState ? '✓' : '✗'}
                          </span>
                        </div>
                        <div class="verification-item">
                          <span class="label">Chain State:</span>
                          <span class="status" class:success={verificationStatus()[i].chainState}>
                            {verificationStatus()[i].chainState ? '✓' : '✗'}
                          </span>
                        </div>
                      </div>
                    {/if}
                  </td>
                  <td>
                    <select
                      bind:value={batchValidation[i]}
                      disabled={verifying || !verificationResults[i]}
                    >
                      <option value={undefined}>Select...</option>
                      <option value={true}>Valid</option>
                      <option value={false}>Invalid</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      bind:value={validatorNotes[i]}
                      placeholder="Add notes..."
                      disabled={verifying}
                    />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
  
        <div class="actions-panel">
          <button
            class="submit-button"
            disabled={!canVerify}
            onclick={handleBatchSubmission}
          >
            {verifying ? 'Submitting...' : 'Submit Validations'}
          </button>
        </div>
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

  .verification-status {
    min-width: 200px;
  }

  .verification-loading {
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .verification-details {
    display: grid;
    gap: 0.5rem;
  }

  .verification-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
  }

  .verification-item .label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .verification-item .status {
    font-weight: 600;
    color: rgb(239, 68, 68);
  }

  .verification-item .status.success {
    color: rgb(34, 197, 94);
  }

  .submit-button {
    width: 100%;
    padding: 0.75rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 1rem;
  }

  .submit-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading, .empty {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
  }

  .address {
    font-family: monospace;
    font-size: 0.875rem;
  }

  .score {
    font-weight: 500;
  }

  /* Responsive styles */
  @media (max-width: 1024px) {
    .validator-container {
      padding: 1rem;
    }

    .info-panel {
      grid-template-columns: 1fr;
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

     .address {
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
  }
</style>