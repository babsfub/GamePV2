<script lang="ts">
    import { browser } from '$app/environment';
    import { onMount, onDestroy } from 'svelte';
    import { wallet } from '$lib/stores/wallet.js';
    import { contractActions } from '$lib/contracts/actions.js';
    import { publicClient } from '$lib/config/contract.js';
    import { parseEther, formatEther } from 'viem';
    import ScoreSubmit from '$lib/components/games/scoreSubmit.svelte';
    import init, { TetrisEngine } from '$lib/games/tetris/pkg/tetris_engine.js';
    import LeaderBoard from '$lib/components/LeaderBoard.svelte'
    import Validate from '$lib/components/admin/validate.svelte';
    import type { TetrisState } from '$lib/types/tetris.js';
    import { Buffer } from 'buffer';
    


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

    // États
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let engine: TetrisEngine | null = $state(null);
    let gameState = $state<TetrisState | null>(null);
    let submitting = $state(false);
    let error = $state<string | null>(null);
    let score = $state(0);
    let level = $state(1);
    let lines = $state(0);
    let isPaused = $state(false);
    let isGameOver = $state(false);
    let isMenuOpen = $state(false);
    // Fonctions de rendu
    function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }
    function drawBlock(x: number, y: number, color: string) {
        if (!ctx) return;
        
        const xPos = x * BLOCK_SIZE;
        const yPos = y * BLOCK_SIZE;
        
        ctx.fillStyle = color;
        ctx.fillRect(xPos, yPos, BLOCK_SIZE, BLOCK_SIZE);
        
        // Effet 3D
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

    
        gameState.board.forEach((row: number[], y: number) => {
            row.forEach((cell: number, x: number) => {
                if (cell !== 0) {
                    drawBlock(x, y, COLORS[cell]);
                }
            });
        });

        if (gameState.current_piece) {
            const piece = gameState.current_piece;
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

        if (gameState.ghost_piece) {
            const ghost = gameState.ghost_piece;
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
    
    function updateGameState() {
        if (!engine) return;
        try {
            const state = engine.get_state();
            if (state) {
                gameState = state;
                if (state.is_game_over) {
                    isGameOver = true;
                    score = state.score;
                    level = state.level;
                    lines = state.lines;
                    // Arrêt du jeu
                    if (engine) {
                        engine.update(Date.now());
                    }
                } else {
                    score = state.score;
                    level = state.level;
                    lines = state.lines;
                    isPaused = state.is_paused;
                    isGameOver = state.is_game_over;
                }
                render();
            }
        } catch (err) {
            console.error('Error updating game state:', err);
        }
    }

    // Boucle de jeu
    function startGameLoop() {
        if (!browser) return () => {};
        
        let frameId: number | null = null;
        let lastTime = Date.now(); 
        const updateInterval = 1000; 

        const gameLoop = () => {
            const currentTime = Date.now();
            const delta = currentTime - lastTime;

            if (engine && !isPaused && !isGameOver) {
                if (delta >= updateInterval) {
                    engine.update(currentTime);
                    lastTime = currentTime;
                    updateGameState();
                }
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
    // Contrôles du jeu
    function handleKeydown(event: KeyboardEvent) {
    if (!engine) return;

    const actions: Record<string, () => void> = {
        ArrowLeft: () => {
            if (!isPaused && !isGameOver) {
                if (engine) {
                    engine.move_piece(-1);
                }
                updateGameState();
            }
        },
        ArrowRight: () => {
            if (!isPaused && !isGameOver) {
                if (engine) {
                    engine.move_piece(1);
                }
                updateGameState();
            }
        },
        ArrowDown: () => {
            if (!isPaused && !isGameOver) {
                if (engine) {
                    engine.start_soft_drop();
                }
                updateGameState();
            }
        },
        ArrowUp: () => {
            if (!isPaused && !isGameOver) {
                if (engine) {
                    engine.rotate();
                }
                updateGameState();
            }
        },
        Space: () => {
            if (!isPaused && !isGameOver) {
                if (engine) {
                    engine.hard_drop();
                }
                updateGameState();
            }
        },
        Escape: () => {
            if (engine) {
                engine.toggle_pause();
            }
            updateGameState();
        },
        KeyR: () => {
            if (isGameOver || isPaused) {
                if (engine) {
                    engine.start();
                }
                updateGameState();
            }
        }
    };

    const action = actions[event.code];
    if (action) {
        event.preventDefault();
        action();
    }
}

function handleKeyup(event: KeyboardEvent) {
    if (!engine) return;

    if (event.code === 'ArrowDown') {
        engine.end_soft_drop();
        updateGameState();
    }
}

// Ajouter en haut du script
function isMobile() {
  return browser && (window.innerWidth <= 768 || 'ontouchstart' in window);
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

    
    
    async function handleSubmitScore(stake: string) {
      if (!engine || !$wallet.address || !gameState) {
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
          
          if (!gameConfig || !gameConfig.saltKey) {
          throw new Error('Could not get game configuration or salt key');
          }

          const stakeInWei = parseEther(stake);
          if (stakeInWei < gameConfig.minStake) {
          throw new Error(`Minimum stake required: ${formatEther(gameConfig.minStake)} POL`);
          }

          const scoreHash = engine.get_score_hash(
          $wallet.address,                    
          gameConfig.saltKey.toString(),      
          BigInt(block.number)    
          );
          console.log(Object.keys(engine));
          if (!scoreHash || !scoreHash.length) {
          throw new Error('Failed to generate score hash');
          }

          console.log('Raw score hash:', scoreHash);

          const scoreHashHex = `0x${Buffer.from(scoreHash).toString('hex')}` as `0x${string}`;

          console.log('Score submission params:', {
          game: 'tetris',
          score: gameState.score.toString(),
          scoreHashHex,
          stake,
          blockNumber: block.number.toString()
          });

          try {
          const tx = await contractActions.write.submitScore({
              game: 'tetris',
              score: BigInt(gameState.score),
              hash: scoreHashHex,
              value: BigInt(stakeInWei),
              account: $wallet.address as `0x${string}`
          });

          await publicClient.waitForTransactionReceipt({ hash: tx });
          console.log('Score submitted successfully:', tx);

          } catch (submitError) {
          console.error('Transaction failed:', submitError);
          error = submitError instanceof Error ? submitError.message : 'Transaction failed';
          throw submitError;
          }

      } catch (err) {
          console.error('Error submitting score:', err);
          error = err instanceof Error ? err.message : 'An unknown error occurred';
      } finally {
          submitting = false;
      }
    }

    onMount(() => {
      if (!browser) return;

      const initGame = async () => {
          try {
              // @ts-ignore
              await init();
              
              if (!canvas) return;
            
              ctx = canvas.getContext('2d')!;
              canvas.width = BLOCK_SIZE * BOARD_WIDTH;
              canvas.height = BLOCK_SIZE * BOARD_HEIGHT;

              engine = new TetrisEngine(BOARD_WIDTH, BOARD_HEIGHT);
              
              if (browser) {
                  window.addEventListener('keydown', handleKeydown);
              }
              
              engine.start();
              updateGameState();
             
              const gameLoopCleanup = startGameLoop();

              return () => {
                  if (browser) {
                      window.removeEventListener('keydown', handleKeydown);
                      window.removeEventListener('keyup', handleKeyup);
                  }
                  gameLoopCleanup();
                  if (engine) {
                      engine.free();
                      engine = null;
                  }
              };
          } catch (err) {
              console.error('Failed to initialize game:', err);
              error = 'Failed to start game';
              return () => {};
          }
      };

      initGame();
      return () => {
          if (engine) {
              engine.free();
              engine = null;
          }
          if (browser) {
              window.removeEventListener('keydown', handleKeydown);
              window.addEventListener('keyup', handleKeyup);
          }
      };
  });
    onDestroy(() => {
        if (engine) {
            engine.free();
            engine = null;
        }
        if (browser) {
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('keyup', handleKeyup);
        }
    });
</script>

  
  <div class="min-h-screen">
    <div class="game-container">
      <!-- Left Panel -->
      <div class="game-panel">
        <div class="stats-section">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Score</span>
              <span class="stat-value">{score}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Level</span>
              <span class="stat-value">{level}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Lines</span>
              <span class="stat-value">{lines}</span>
            </div>
          </div>
        </div>
  
        <div class="wallet-section">
          {#if !$wallet.address}
            <div class="wallet-warning">
              Connect wallet to submit scores
            </div>
          {:else}
            <ScoreSubmit
              gameId="tetris"
              {score}
              onSubmit={handleSubmitScore}
              disabled={submitting}
            />
          {/if}
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
                <button 
                  class="retry-button"
                  onclick={() => {
                    if (engine) {
                      engine.start();
                      updateGameState();
                    }
                  }}
                  disabled={submitting}
                >
                  Play Again
                </button>
              </div>
            </div>
          {/if}
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
              <button class="touch-btn" ontouchstart={() => handleTouch('down')} 
                      ontouchend={() => handleTouch('endDown')}>
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
      <div class="game-panel">
        <button class="menu-toggle" onclick={toggleMenu}>reduire</button>
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
    <div class="leaderboard-section">
      <LeaderBoard selectedGame="tetris" />
    </div>
  
    {#if $wallet.isVerifier}
      <div class="validation-section">
        <Validate selectedGame="tetris" />
      </div>
    {/if}
  </div>
  
  <style>
    .game-container {
      display: grid;
      grid-template-columns: 300px minmax(auto, 600px) 300px;
      gap: 2rem;
      max-width: var(--max-width-game);
      margin: 0 auto;
      padding: 2rem var(--spacing-screen-safe);
      align-items: start;
    }
  
    .game-panel {
      background: var(--color-surface);
      border-radius: 1rem;
      overflow: hidden;
      height: fit-content;
    }
  
    .stats-section {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
  
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
  
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.75rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 0.5rem;
    }
  
    .stat-label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
  
    .stat-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text);
    }
  
    .wallet-section {
      padding: 1.5rem;
    }
  
    .wallet-warning {
      padding: 0.75rem;
      background: rgba(234, 179, 8, 0.1);
      color: rgb(234, 179, 8);
      border-radius: 0.5rem;
      text-align: center;
      font-size: 0.875rem;
    }
  
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
    }
  
    canvas {
      display: block;
      border-radius: 0.5rem;
    }
  
    canvas.game-over {
      opacity: 0.5;
    }
  
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
    }
  
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
  
    .retry-button {
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
  
    .retry-button:hover:not(:disabled) {
      opacity: 0.9;
    }
  
    .retry-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  
    .error-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
      border-radius: 0.5rem;
    }
  
    .leaderboard-section {
      margin-top: 3rem;
      padding: 0 var(--spacing-screen-safe);
      max-width: var(--max-width-game);
      margin-inline: auto;
    }
  
    .validation-section {
      margin-top: 2rem;
      padding: 0 var(--spacing-screen-safe);
      max-width: var(--max-width-game);
      margin-inline: auto;
    }
  
    @media (max-width: 1200px) {
      .game-container {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
  
      .game-panel {
        max-width: 600px;
        margin: 0 auto;
      }
    }
  
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

  @media (min-width: 769px) {
    .touch-controls {
      display: none;
    }
  }

  </style>