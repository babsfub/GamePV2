<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { contractActions } from '$lib/contracts/actions.js';
  import { publicClient } from '$lib/config/contract.js';
  import { parseEther, formatEther } from 'viem';
  import ScoreSubmit from '$lib/components/games/scoreSubmit.svelte';
  import init, { TetrisEngine } from '$lib/games/tetris/pkg/tetris_engine.js';
  import LeaderBoard from '$lib/components/LeaderBoard.svelte';
  import ValidateScore from '$lib/components/admin/validateScoreLarge.svelte';
  import type { TetrisState, ContractRoundView, RoundView } from '$lib/types.js';
  import type { TetrisGame } from '$lib/server/db/schema.js';
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import { getGameState } from '$lib/state/game.svelte.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { ScoreService } from '$lib/utils/scoreServices.js';
  import { Buffer } from 'buffer';
  
  // Props et Services
  let { data } = $props<{
    data: {
      isVerifier: boolean;
      isAdmin: boolean;
    }
  }>();

  const walletState = getWalletState();
  const gameState = getGameState();
  const uiState = getUIState();
  
  // États globaux
  let mobileView = $state(false);
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let engine = $state<TetrisEngine | null>(null);
  let tetrisGameState = $state<TetrisState | null>(null);
  let currentRound = $state<RoundView | null>(null);
  let contractRound = $state<ContractRoundView | null>(null);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let score = $state(0);
  let level = $state(1);
  let lines = $state(0);
  let isPaused = $state(false);
  let isGameOver = $state(false);

  // Constantes
  const BLOCK_SIZE = 30;
  const BOARD_WIDTH = 10;
  const BOARD_HEIGHT = 20;
  const COLORS = [
      '#000000', // vide
      '#FF0000', // I
      '#00FF00', // O
      '#0000FF', // T
      '#FFFF00', // L
      '#FF00FF', // J
      '#00FFFF', // S
      '#FFA500'  // Z
  ];
  // Fonction de mise à jour des données du jeu
  async function updateGameData() {
  try {
    const config = await contractActions.read.getGameConfig('tetris');
    gameState.setConfig('tetris', config);

    if (config?.active) {
      const roundData = await contractActions.read.getRoundData(
        config.currentRound, 
        'tetris'
      ) as ContractRoundView;
      
      if (roundData.scores.length > 0) {
        const response = await fetch(`/api/games?gameId=tetris&roundId=${config.currentRound}`);
        if (!response.ok) {
          throw new Error('Failed to fetch DB data');
        }
        const dbScores = await response.json() as TetrisGame[];
        
        currentRound = {
          ...roundData,
          scores: roundData.scores.map(contractScore => {
            const dbScore = dbScores.find(
              (s) => s.score_hash === contractScore.scoreHash
            );
            
            return {
              ...contractScore,
              transactionHash: dbScore?.transaction_hash as `0x${string}` ?? '0x0',
              level: dbScore ? 
                BigInt(dbScore.score) : 
                BigInt(0),
              lines: 0, 
              moves_count: 0,
              moves_hash: dbScore?.db_hash ?? ''
            };
          })
        };
      } else {
        currentRound = {
          ...roundData,
          scores: []
        };
      }

      gameState.setRound('tetris', currentRound);
    }
  } catch (err) {
    console.error('Error updating game data:', err);
    gameState.setConfig('tetris', null);
    gameState.setRound('tetris', null);
  }
}


  
  // Fonctions utilitaires
  function checkMobileView() {
      if (browser) {
          mobileView = window.innerWidth <= 768;
      }
  }
  
  function isMobile() {
      return browser && (window.innerWidth <= 768 || 'ontouchstart' in window);
  }
  
 
  // Fonctions de mise à jour du state
  function updateGameState() {
    if (!engine) return;
    try {
      const state = engine.get_state();
      if (state) {
        tetrisGameState = state;
        score = state.score ?? 0;
        level = state.level ?? 1;
        lines = state.lines ?? 0;
        isPaused = state.is_paused;
        isGameOver = state.is_game_over;
  
        // Mise à jour du state global
        gameState.updateTetrisState({
          score: state.score ?? 0,
          level: state.level ?? 1,
          lines: state.lines ?? 0,
          is_game_over: state.is_game_over,
          is_paused: state.is_paused,
          board: state.board ?? [],
          current_piece: state.current_piece,
          ghost_piece: state.ghost_piece,
          next_piece: state.next_piece,
          hold_piece: state.hold_piece,
          is_soft_dropping: state.is_soft_dropping ?? false,
          can_hold: state.can_hold ?? true,
          moves_count: state.moves_count ?? 0,
          last_update: state.last_update ?? 0,
          drop_interval: state.drop_interval ?? 0
        });
  
        render();
      }
    } catch (err) {
      console.error('Error updating game state:', err);
    }
  }
  
  function handleStartNewGame() {
    if (!engine) return;
    gameState.resetTetrisState();
    isPaused = false;
    isGameOver = false;
    error = null;
    engine.start();
    updateGameState();
    startGameLoop();
  }
  function drawBlock(x: number, y: number, color: string) {
    if (!ctx) return;
    const xPos = x * BLOCK_SIZE;
    const yPos = y * BLOCK_SIZE;
    
    ctx.fillStyle = color;
    ctx.fillRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(xPos, yPos, BLOCK_SIZE, 2);
    ctx.fillRect(xPos, yPos, 2, BLOCK_SIZE);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(xPos + BLOCK_SIZE - 2, yPos, 2, BLOCK_SIZE);
    ctx.fillRect(xPos, yPos + BLOCK_SIZE - 2, BLOCK_SIZE, 2);
  }
  
  function drawGrid() {
    if (!ctx) return;
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= BOARD_WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * BLOCK_SIZE, 0);
        ctx.lineTo(i * BLOCK_SIZE, BOARD_HEIGHT * BLOCK_SIZE);
        ctx.stroke();
    }
    
    for (let i = 0; i <= BOARD_HEIGHT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * BLOCK_SIZE);
        ctx.lineTo(BOARD_WIDTH * BLOCK_SIZE, i * BLOCK_SIZE);
        ctx.stroke();
    }
  }
  
  function render() {
    if (!ctx || !gameState) return;
  
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawGrid();
  
    tetrisGameState?.board.forEach((row: number[], y: number) => {
        row.forEach((cell: number, x: number) => {
            if (cell !== 0) {
                drawBlock(x, y, COLORS[cell]);
            }
        });
    });
  
    if (tetrisGameState?.current_piece) {
        const piece = tetrisGameState.current_piece;
        piece.shape.forEach((row: number[], y: number) => {
            row.forEach((cell: number, x: number) => {
                if (cell !== 0) {
                    drawBlock(
                        piece.x + x,
                        piece.y + y,
                        COLORS[piece.piece_type]
                    );
                }
            });
        });
    }
  
    if (tetrisGameState?.ghost_piece) {
        const ghost = tetrisGameState.ghost_piece;
        ctx.globalAlpha = 0.3;
        ghost.shape.forEach((row: number[], y: number) => {
            row.forEach((cell: number, x: number) => {
                if (cell !== 0) {
                    drawBlock(
                        ghost.x + x,
                        ghost.y + y,
                        COLORS[ghost.piece_type]
                    );
                }
            });
        });
        ctx.globalAlpha = 1;
    }
  }
  // Gestion de la boucle de jeu
  function startGameLoop() {
    if (!browser) return () => {};
    
    let frameId: number | null = null;
  
    const gameLoop = () => {
        if (engine && !isPaused && !isGameOver) {
            engine.update(Date.now());
            updateGameState();
        }
        frameId = requestAnimationFrame(gameLoop);
    };
  
    gameLoop();
    return () => {
        if (frameId !== null && browser) {
            cancelAnimationFrame(frameId);
            frameId = null;
        }
    };
  }
  
  // Gestion des contrôles
  function handleKeydown(event: KeyboardEvent) {
    if (!engine || isGameOver) return;

    const actions: Record<string, () => void> = {
        ArrowLeft: () => engine?.move_piece(-1),
        ArrowRight: () => engine?.move_piece(1),
        ArrowDown: () => engine?.start_soft_drop(),
        ArrowUp: () => engine?.rotate(),
        Space: () => engine?.hard_drop(),
        Escape: () => {
            if (isPaused) {
                isPaused = false;
                engine?.toggle_pause();
                startGameLoop(); 
            } else {
                isPaused = true;
                engine?.toggle_pause();
            }
            updateGameState();
        },
        KeyR: () => {
            if (isGameOver || isPaused) {
                handleStartNewGame();
            }
        }
    };

    const action = actions[event.code];
    if (action) {
        event.preventDefault();
        action();
        updateGameState();
    }
}

  
  function handleKeyup(event: KeyboardEvent) {
    if (!engine) return;
  
    if (event.code === 'ArrowDown') {
        engine.end_soft_drop();
        updateGameState();
    }
  }
  
  function handleTouch(action: string) {
    if (!engine) return;
    
    switch(action) {
        case 'left':
            engine.move_piece(-1);
            break;
        case 'right': 
            engine.move_piece(1);
            break;
        case 'down':
            engine.start_soft_drop();
            break;
        case 'endDown':
            engine.end_soft_drop();
            break;
        case 'drop':
            engine.hard_drop();
            break;
        case 'rotate':
            engine.rotate();
            break;
    }
    updateGameState();
  }
  // Gestion de la soumission des scores
  const handleSubmitScore = async (stake: string) => {
    if (!engine || !walletState.address || !gameState) {
      console.error('Missing required data for score submission');
      return;
    }
    
    try {
      submitting = true;
      error = null;

      const [block, gameConfig] = await Promise.all([
        publicClient.getBlock(),
        contractActions.read.getGameConfig('tetris')
      ]);
        
      if (!gameConfig?.saltKey) {
        throw new Error('Could not get game configuration or salt key');
      }

      const stakeInWei = parseEther(stake);
      if (stakeInWei < gameConfig.minStake) {
        throw new Error(`Minimum stake required: ${formatEther(gameConfig.minStake)} POL`);
      }

      const scoreHash = engine.get_score_hash(
        walletState.address,
        gameConfig.saltKey.toString(),
        BigInt(block.number)
      );

      if (!scoreHash?.length) {
        throw new Error('Failed to generate score hash');
      }

      const scoreHashHex = `0x${Buffer.from(scoreHash).toString('hex')}` as `0x${string}`;

      // Soumission au smart contract
      const tx = await contractActions.write.submitScore({
        game: 'tetris',
        score: BigInt(tetrisGameState?.score ?? 0),
        hash: scoreHashHex,
        value: stakeInWei,
        account: walletState.address
      });

      // Attendre la confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      // Utiliser ScoreService au lieu du fetch direct
      await ScoreService.submitScore({
        gameState: tetrisGameState,
        playerAddress: walletState.address,
        score: BigInt(tetrisGameState?.score ?? 0), // Important: utiliser tetrisGameState.score
        blockNumber: BigInt(block.number),
        stake: stakeInWei,
        scoreHash: scoreHashHex,
        transactionHash: tx,
        contractHash: receipt.blockHash,
        roundId: gameConfig.currentRound,
        transactionBlockNumber: receipt.blockNumber,
        transactionTimestamp: new Date()
      });

      await updateGameData();
      uiState.success(`Score submitted! TX: ${tx}`);

    } catch (err) {
      console.error('Error submitting score:', err);
      error = err instanceof Error ? err.message : 'An unknown error occurred';
      uiState.error(error);
    } finally {
      submitting = false;
    }
  };

  // Initialisation et effets
  $effect(() => {
    if (browser) {
      updateGameData();
      const interval = setInterval(updateGameData, 60000);
      return () => clearInterval(interval);
    }
  });
  
  onMount(() => {
    if (!browser) return;
  
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
  
    const initGame = async () => {
        try {
            await init();
            
            if (!canvas) return;
            
            ctx = canvas.getContext('2d')!;
            canvas.width = BLOCK_SIZE * BOARD_WIDTH;
            canvas.height = BLOCK_SIZE * BOARD_HEIGHT;
  
            engine = new TetrisEngine(BOARD_WIDTH, BOARD_HEIGHT);
            
            window.addEventListener('keydown', handleKeydown);
            window.addEventListener('keyup', handleKeyup);
            
            engine.start();
            updateGameState();
            
            return startGameLoop();
        } catch (err) {
            console.error('Failed to initialize game:', err);
            error = 'Failed to start game';
            return () => {};
        }
    };
  
    initGame().then(cleanup => {
        return () => {
            window.removeEventListener('resize', checkMobileView);
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('keyup', handleKeyup);
            if (cleanup) cleanup();
            if (engine) {
                engine.free();
                engine = null;
            }
        };
    });
  });
  
  </script>
  
  
  <div class="page-container">
    <div class="game-container">
      <!-- Left Panel -->
      <div class="game-panel left-panel">
        <div class="stats-section">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Score</span>
              <span class="stat-value">{score}</span>
              
            
              <span class="stat-label">Level</span>
              <span class="stat-value">{level}</span>
            
              <span class="stat-label">Lines</span>
              <span class="stat-value">{lines}</span>
            </div>
            </div>
          </div>
        </div>
  
        
  
      <!-- Game Area -->
      <div class="game-area">
        <div class="canvas-container">
          <canvas 
            bind:this={canvas}
            class:game-over={isGameOver}
          ></canvas>
  
          {#if isPaused}
            <div class="overlay">
              <div class="overlay-content">
                <h2>Game Paused</h2>
                <p>Press ESC to resume</p>
                <button 
                  class="resume-button"
                  onclick={() => {
                    isPaused = false;
                    engine?.toggle_pause();
                    startGameLoop();
                    updateGameState();
                  }}
                >
                  Resume Game
                </button>
              </div>
            </div>
          {/if}
    
          {#if isGameOver}
            <div class="overlay">
              <div class="overlay-content">
                <h2>Game Over!</h2>
                <p>Score: {score}</p>
                {#if error}
                  <div class="error-message">{error}</div>
                {/if}
                
                {#if walletState.address}
                  <ScoreSubmit
                    gameId="tetris"
                    score={score}
                    isGameOver={true}
                    
                  minStake={gameState.configs?.tetris?.minStake?.toString() ?? '0'}
                    onSubmit={handleSubmitScore}
                  />
                {:else}
                  <div class="wallet-warning">
                    Connect wallet to submit scores
                  </div>
                {/if}

                <button 
                  class="retry-button"
                  onclick={handleStartNewGame}
                  disabled={submitting}
                >
                  Play Again
                </button>
              </div>
            </div>
          {/if}
  
          <!-- Touch Controls -->
          <div class="touch-controls" class:hidden={!browser || !isMobile()}>
            <div class="touch-row">
              <button class="touch-btn rotate" ontouchstart={() => handleTouch('rotate')}>
                <span>↻</span>
              </button>
            </div>
            <div class="touch-row">
              <button class="touch-btn" ontouchstart={() => handleTouch('left')}>
                <span>←</span>
              </button>
              <button class="touch-btn" 
                ontouchstart={() => handleTouch('down')} 
                ontouchend={() => handleTouch('endDown')}
              >
                <span>↓</span>
              </button>
              <button class="touch-btn" ontouchstart={() => handleTouch('right')}>
                <span>→</span>  
              </button>
            </div>
            <div class="touch-row">
              <button class="touch-btn" ontouchstart={() => handleTouch('drop')}>
                <span>⤓</span>
              </button>
            </div>
          </div>
        </div>
      </div>
  
      <!-- Right Panel -->
      <div class="game-panel right-panel" class:hidden={isMobile()}>
        <div class="controls-section">
          <h3 class="section-title">Controls</h3>
          <ul class="controls-list">
            <li class="control-item">
              <span>Move</span>
              <span class="key">← →</span>
            </li>
            <li class="control-item">
              <span>Rotate</span>
              <span class="key">↑</span>
            </li>
            <li class="control-item">
              <span>Soft Drop</span>
              <span class="key">↓</span>
            </li>
            <li class="control-item">
              <span>Hard Drop</span>
              <span class="key">Space</span>
            </li>
            <li class="control-item">
              <span>Pause</span>
              <span class="key">Esc</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  
    <!-- Leaderboard Section -->
    <div class="leaderboard-section">
      <LeaderBoard selectedGame="tetris" />
    </div>
  
    <!-- Validation Section -->
    <div class="validation-section">
      {#if walletState.isVerifier}
        <ValidateScore selectedGame="tetris" />
      {/if}
    </div>

  </div>
  
  <style>
    /* Layout Container */
    .page-container {
      width: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      padding: 2rem var(--spacing-screen-safe);
    }
  
    .game-container {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 2rem;
      width: 100%;
      min-width: 80vw;
      max-width: var(--max-width-game);
      margin: 0 auto;
    }
  
    /* Game Panels */
    .game-panel {
      background: var(--color-surface);
      border-radius: 1rem;
      overflow: hidden;
      height: fit-content;
      min-width: 180px;
    }
     /* Stats Section */
  .stats-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 10px;
    padding: 1rem;
    width: 100%;
  }

  .stats-grid {
    align-items: center;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.25rem;
    width: 100%;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
    width: 100%;
    min-height: 80px;
    box-sizing: border-box;
  }

  .stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    min-width: 4ch;
    text-align: center;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    width: 100%;
    text-align: center;
  }
    


  
    .wallet-warning {
      padding: 0.75rem;
      background: rgba(234, 179, 8, 0.1);
      color: rgb(234, 179, 8);
      border-radius: 0.5rem;
      text-align: center;
      font-size: 0.875rem;
    }
  
    /* Game Area */
    .game-area {
      position: relative;
      display: flex;
      justify-content: center;
    }
  
    .canvas-container {
      position: relative;
      background: var(--color-surface);
      padding: 1rem;
      border-radius: 1rem;
      width: 100%;
    }
  
    canvas {
      display: block;
      width: 100%;
      height: auto;
      border: 2px solid #fff;
    }
  
    canvas.game-over {
      opacity: 0.5;
    }
  
    /* Overlay */
    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 0.5rem;
    }
  
    .overlay-content {
      text-align: center;
      padding: 2rem;
      background: var(--color-surface);
      border-radius: 1rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      min-width: 280px;
    }
  
    .overlay-content {
      margin: 1rem 0;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.5rem;
    }
  
    /* Controls Section */
    .controls-section {
      padding: 1.5rem;
    }
  
    .section-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--color-text);
    }
  
    .controls-list {
      display: grid;
      gap: 0.5rem;
    }
  
    .control-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }
  
    .key {
      padding: 0.25rem 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.25rem;
      font-family: monospace;
    }
  
    /* Buttons */
    .retry-button,
    .resume-button {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
  
    .retry-button:hover:not(:disabled),
    .resume-button:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  
    .retry-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  
    /* Touch Controls */
    .touch-controls {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 10px;
      z-index: 100;
      padding: 10px;
    }
  
    .touch-controls.hidden {
      display: none;
    }
  
    .touch-row {
      display: flex;
      justify-content: center;
      gap: 10px;
    }
  
    .touch-btn {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 2px solid rgba(255, 255, 255, 0.3);
      color: white;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
      user-select: none;
    }
  
    .touch-btn:active {
      background: rgba(255, 255, 255, 0.3);
    }
  
    .touch-btn.rotate {
      background: rgba(var(--color-primary-rgb), 0.3);
    }
  
    /* Additional Sections */
    .leaderboard-section,
    .validation-section {
      width: 100%;
      max-width: var(--max-width-game);
      margin: 0 auto;
      padding: 0 var(--spacing-screen-safe);
    }
  
    .validation-section {
      margin-top: 2rem;
    }
  
    /* Responsive Design */
    @media (max-width: 1200px) {
      .game-container {
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        max-width: 60vw;
      }
  
      .game-panel {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
      }
  
      canvas {
        width: auto;
        height: auto;
        max-width: 100vw;
        max-height: 100vh;
      }
  
      .stats-section {
        flex-direction: row;
        justify-content: space-around;
      }
    }
  
    @media (max-width: 768px) {
      .page-container {
        padding: 1rem;
      }

      .left-panel {
        display: none;
      }
  
      .right-panel {
        display: none;
      }
  
      .game-panel {
        margin: 0;
      }
  
      .touch-controls {
        display: flex;
      }
    }
  
    @media (min-width: 769px) {
      .touch-controls {
        display: none;
      }
    }
  </style>