<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { contractActions } from '$lib/contracts/actions.js';
  import { publicClient } from '$lib/config/contract.js';
  import { parseEther, formatEther } from 'viem';
  import ScoreSubmit from '$lib/components/games/scoreSubmit.svelte';
  import LeaderBoard from '$lib/components/LeaderBoard.svelte';
  import ValidateScore from '$lib/components/admin/validateScoreLarge.svelte';
  import type { ContractRoundView, RoundView } from '$lib/types.js';
  import type { SnakeGame } from '$lib/server/db/schema.js';
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import { getGameState } from '$lib/state/game.svelte.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { ScoreService } from '$lib/utils/scoreServices.js';
  import init, { SnakeEngine } from '$lib/games/snake/pkg/snake_engine.js';
  
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
  let engine = $state<SnakeEngine | null>(null);
  let snakeGameState = $state<any | null>(null);
  let currentRound = $state<RoundView | null>(null);
  let contractRound = $state<ContractRoundView | null>(null);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let score = $state(0);
  let apples = $state(0);
  let level = $state(1);
  let isPaused = $state(false);
  let isGameOver = $state(false);
  let debugMode = $state(false); 

  // Constantes
  const CELL_SIZE = 20;
  const BOARD_WIDTH = 20;
  const BOARD_HEIGHT = 20;
  const COLORS = {
    EMPTY: '#1a1a1a',
    SNAKE_HEAD: '#4ade80',
    SNAKE_BODY: '#22c55e',
    FOOD_NORMAL: '#ef4444', // Rouge pour nourriture normale
    FOOD_BONUS: '#f97316',  // Orange pour nourriture bonus
    BORDER: '#333333'
  };

  // Fonction de mise à jour des données du jeu
  async function updateGameData() {
    try {
      const config = await contractActions.read.getGameConfig('snake');
      gameState.setConfig('snake', config);

      if (config?.active) {
        const roundData = await contractActions.read.getRoundData(
          config.currentRound, 
          'snake'
        ) as ContractRoundView;
        
        if (roundData.scores.length > 0) {
          const response = await fetch(`/api/games?gameId=snake&roundId=${config.currentRound}`);
          if (!response.ok) {
            throw new Error('Failed to fetch DB data');
          }
          const dbScores = await response.json() as SnakeGame[];
          
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

        gameState.setRound('snake', currentRound);
      }
    } catch (err) {
      console.error('Error updating game data:', err);
      gameState.setConfig('snake', null);
      gameState.setRound('snake', null);
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
  
  function handleStartNewGame() {
    if (!engine) return;
    gameState.resetSnakeState();
    isPaused = false;
    isGameOver = false;
    error = null;
    engine.start();
    updateGameState();
    render(); 
    startGameLoop();
  }

  function drawCell(x: number, y: number, color: string) {
    if (!ctx) return;
    
    // Ajouter des vérifications pour les coordonnées
    if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || y < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
      if (debugMode) {
        console.warn(`Tentative de dessin hors des limites: x=${x}, y=${y}`);
      }
      return;
    }
    
    const xPos = x * CELL_SIZE;
    const yPos = y * CELL_SIZE;
    
    if (debugMode) {
      console.log(`Dessin d'une cellule à x=${x}(${xPos}px), y=${y}(${yPos}px) avec couleur ${color}`);
    }
    
    ctx.fillStyle = color;
    ctx.fillRect(xPos, yPos, CELL_SIZE, CELL_SIZE);
    
    // Ajouter un effet de bordure
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(xPos, yPos, CELL_SIZE, 2);
    ctx.fillRect(xPos, yPos, 2, CELL_SIZE);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(xPos + CELL_SIZE - 2, yPos, 2, CELL_SIZE);
    ctx.fillRect(xPos, yPos + CELL_SIZE - 2, CELL_SIZE, 2);
  }
  
  function drawGrid() {
    if (!ctx) return;
    ctx.strokeStyle = COLORS.BORDER;
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= BOARD_WIDTH; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, BOARD_HEIGHT * CELL_SIZE);
      ctx.stroke();
    }
    
    for (let i = 0; i <= BOARD_HEIGHT; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(BOARD_WIDTH * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
  }
  
  function render() {
    if (!ctx) return;
    
    // Logs de débogage pour comprendre la structure des données
    if (debugMode && snakeGameState) {
      console.log("Structure complète de l'état:", snakeGameState);
      console.log("Structure de la nourriture:", snakeGameState.food);
      if (snakeGameState.food && snakeGameState.food.length > 0) {
        console.log("Première pomme:", snakeGameState.food[0]);
        console.log("Position de la première pomme:", snakeGameState.food[0].position);
        console.log("Type de position:", typeof snakeGameState.food[0].position);
      }
    }
    
    // Toujours effacer le canvas
    ctx.fillStyle = COLORS.EMPTY;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner la grille
    drawGrid();
    
    // Vérifier si snakeGameState existe
    if (!snakeGameState) return;
    
    if (debugMode) {
      console.log("Rendu, état du serpent:", 
        snakeGameState.snake?.length, 
        "pommes:", snakeGameState.food?.length);
    }
    
    // Dessiner le serpent s'il existe
    if (snakeGameState.snake && Array.isArray(snakeGameState.snake) && snakeGameState.snake.length > 0) {
      // Dessiner le corps
      for (let i = 1; i < snakeGameState.snake.length; i++) {
        const segment = snakeGameState.snake[i];
        if (segment) {
          // Gérer à la fois les tuples (x, y) et les objets {x, y}
          if (Array.isArray(segment)) {
            drawCell(segment[0], segment[1], COLORS.SNAKE_BODY);
          } else if (typeof segment.x === 'number' && typeof segment.y === 'number') {
            drawCell(segment.x, segment.y, COLORS.SNAKE_BODY);
          }
        }
      }
      
      // Dessiner la tête
      const head = snakeGameState.snake[0];
      if (head) {
        // Gérer à la fois les tuples (x, y) et les objets {x, y}
        if (Array.isArray(head)) {
          drawCell(head[0], head[1], COLORS.SNAKE_HEAD);
        } else if (typeof head.x === 'number' && typeof head.y === 'number') {
          drawCell(head.x, head.y, COLORS.SNAKE_HEAD);
        }
      }
    }
    
    // Dessiner les pommes si elles existent
    if (snakeGameState.food && Array.isArray(snakeGameState.food) && snakeGameState.food.length > 0) {
      snakeGameState.food.forEach((food: { position: [number, number] | { x: number, y: number }, food_type: string }) => {
        if (food && food.position) {
          let x, y;
          // Gérer les différentes structures possibles pour la position
          if (Array.isArray(food.position)) {
            [x, y] = food.position;
          } else if (typeof food.position === 'object') {
            x = food.position.x;
            y = food.position.y;
          }
          
          if (typeof x === 'number' && typeof y === 'number') {
            // Choisir la couleur en fonction du type de nourriture
            const foodColor = food.food_type === 'Bonus' ? COLORS.FOOD_BONUS : COLORS.FOOD_NORMAL;
            drawCell(x, y, foodColor);
          }
        }
      });
    } else if (snakeGameState.apple_position) {
      // Fallback pour la compatibilité avec l'ancienne structure
      const position = snakeGameState.apple_position;
      if (typeof position.x === 'number' && typeof position.y === 'number') {
        drawCell(position.x, position.y, COLORS.FOOD_NORMAL);
      }
    } else if (debugMode) {
      console.log("Impossible de dessiner les pommes, données invalides:", 
        snakeGameState.food || snakeGameState.apple_position);
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
      
      // Toujours appeler render() à chaque frame
      render();
      
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

    // Touche de débogage (Ctrl+G)
    if (event.code === 'KeyG' && event.ctrlKey) {
      debugMode = !debugMode;
      console.log(`Mode debug ${debugMode ? 'activé' : 'désactivé'}`);
      return;
    }

    const directions: Record<string, string> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      KeyW: 'up',
      KeyS: 'down',
      KeyA: 'left',
      KeyD: 'right'
    };

    const actions: Record<string, () => void> = {
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

    // Gérer les directions
    if (directions[event.code]) {
      event.preventDefault();
      const success = engine.change_direction(directions[event.code]);
      if (debugMode) {
        console.log(`Changement de direction vers ${directions[event.code]}: ${success ? 'réussi' : 'échoué'}`);
      }
      updateGameState();
      render(); // Forcer un rendu après le changement de direction
      return;
    }

    // Gérer les autres actions
    const action = actions[event.code];
    if (action) {
      event.preventDefault();
      action();
    }
  }
  
  function handleTouch(direction: string) {
    if (!engine) return;
    const success = engine.change_direction(direction);
    if (debugMode) {
      console.log(`Touch: Changement de direction vers ${direction}: ${success ? 'réussi' : 'échoué'}`);
    }
    updateGameState();
    render(); // Forcer un rendu après le changement de direction
  }

  // Fonction d'aide pour logger les états contenant des BigInt
  function logStateWithBigInt(state: any) {
    if (!debugMode) return;
    
    // Fonction de remplacement personnalisée pour convertir les BigInt en chaînes
    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString() + 'n'; // Ajouter 'n' pour indiquer que c'est un BigInt
      }
      return value;
    };
    
    try {
      // Utiliser une structure simplifiée pour le log
      const simplifiedState = {
        score: state.score,
        level: state.level,
        food_counter: state.food_counter,
        is_game_over: state.is_game_over,
        is_paused: state.is_paused,
        snake_length: state.snake?.length,
        direction: state.direction,
        food: state.food?.length > 0 ? state.food[0].position : null
      };
      
      console.log("État simplifié:", JSON.stringify(simplifiedState, replacer, 2));
    } catch (err) {
      console.error("Impossible de convertir l'état en JSON:", err);
      console.log("État brut:", state);
    }
  }

  // Fonction updateGameState adaptée
  function updateGameState() {
    if (!engine) return;
    try {
      const state = engine.get_state();
      if (state) {
        // Utiliser notre fonction de log sécurisée
        if (debugMode) {
          logStateWithBigInt(state);
        }
        
        // Créer une version adaptée de l'état pour compatibilité
        const adaptedState = {
          ...state,
          // Ajouter apple_position pour compatibilité avec le code existant
          apple_position: state.food && state.food.length > 0 
            ? (Array.isArray(state.food[0].position) 
              ? { x: state.food[0].position[0], y: state.food[0].position[1] }
              : state.food[0].position)
            : null
        };
        
        snakeGameState = adaptedState;
        score = state.score ?? 0;
        apples = state.food_counter ?? 0;
        level = state.level ?? 1;
        isPaused = state.is_paused;
        isGameOver = state.is_game_over;

        // Mise à jour du state global
        gameState.updateSnakeState({
          score: state.score ?? 0,
          level: state.level ?? 1,
          apples_eaten: state.food_counter ?? 0,
          is_game_over: state.is_game_over,
          is_paused: state.is_paused,
          board: state.board_size ?? [BOARD_WIDTH, BOARD_HEIGHT],
          snake: state.snake ?? [],
          direction: state.direction ?? 'right',
          apple_position: adaptedState.apple_position,
          moves_count: state.moves_history?.length ?? 0,
          last_update: state.last_update ?? 0
        });
      }
    } catch (err) {
      console.error('Error updating game state:', err);
    }
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
        contractActions.read.getGameConfig('snake')
      ]);
        
      if (!gameConfig?.saltKey) {
        throw new Error('Could not get game configuration or salt key');
      }

      const stakeInWei = parseEther(stake);
      if (stakeInWei < gameConfig.minStake) {
        throw new Error(`Minimum stake required: ${formatEther(gameConfig.minStake)} POL`);
      }

      // Obtenir le hash du score (en format hex directement)
      const scoreHashHex = engine.get_score_hash_hex(
        walletState.address,
        gameConfig.saltKey.toString(),
        BigInt(block.number)
      ) as `0x${string}`;

      if (!scoreHashHex || scoreHashHex === '0'.repeat(64)) {
        throw new Error('Failed to generate score hash');
      }

      // S'assurer que le hash hexadécimal commence par 0x
      const formattedHash = scoreHashHex.startsWith('0x') 
        ? scoreHashHex
        : `0x${scoreHashHex}` as `0x${string}`;

      // Soumission au smart contract
      const tx = await contractActions.write.submitScore({
        game: 'snake',
        score: BigInt(snakeGameState?.score ?? 0),
        hash: formattedHash,
        value: stakeInWei,
        account: walletState.address
      });

      // Attendre la confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      // Exporter les données du jeu
const gameDataStr = engine.export_game_data_str(
      walletState.address,
      gameConfig.saltKey.toString(),
      BigInt(block.number)
  );

  // Parsez la chaîne JSON en objet avant de la passer au service
  let gameDataObj;
  try {
      gameDataObj = JSON.parse(gameDataStr);
  } catch (e) {
      // En cas d'échec du parsing, utilisez la chaîne brute
      gameDataObj = gameDataStr;
  }

  // Utiliser ScoreService avec l'objet parsé
  await ScoreService.submitScore({
      gameId: 'snake',
      gameState: gameDataObj, // Utiliser l'objet parsé au lieu de la chaîne
      playerAddress: walletState.address,
      score: BigInt(snakeGameState?.score ?? 0),
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
  
  // Fonction simple d'initialisation WASM
  async function initWasm() {
    try {
      console.log("Initialisation du module WASM");
      await init();
      console.log("Module WASM initialisé avec succès");
      return true;
    } catch (error) {
      console.error("Erreur d'initialisation WASM:", error);
      return false;
    }
  }
  
  onMount(() => {
    if (!browser) return;
  
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
  
    const initGame = async () => {
      try {
        // Initialiser le module WASM
        const initSuccess = await initWasm();
        if (!initSuccess) {
          throw new Error('Failed to initialize WASM module');
        }
        
        if (!canvas) return;
        
        ctx = canvas.getContext('2d')!;
        canvas.width = CELL_SIZE * BOARD_WIDTH;
        canvas.height = CELL_SIZE * BOARD_HEIGHT;

        // Test simple de dessin initial
        ctx.fillStyle = COLORS.EMPTY;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        // Créer l'instance du moteur
        engine = new SnakeEngine(BOARD_WIDTH, BOARD_HEIGHT);
        console.log("Moteur Snake créé");
        
        window.addEventListener('keydown', handleKeydown);
        
        // Démarrer le jeu
        engine.start();
        updateGameState();
        render(); // Forcer un premier rendu
        
        console.log("Démarrage de la boucle de jeu");
        return startGameLoop();
      } catch (err) {
        console.error('Failed to initialize game:', err);
        error = err instanceof Error ? err.message : 'Failed to start game';
        
        // Afficher une grille même en cas d'erreur
        if (canvas && ctx) {
          ctx.fillStyle = COLORS.EMPTY;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          drawGrid();
        }
        
        return () => {};
      }
    };
  
    initGame().then(cleanup => {
      return () => {
        window.removeEventListener('resize', checkMobileView);
        window.removeEventListener('keydown', handleKeydown);
        if (cleanup) cleanup();
        if (engine) {
          engine.free();
          engine = null;
        }
      };
    });
  });

  // Initialisation et effets
  $effect(() => {
    if (browser) {
      updateGameData();
      const interval = setInterval(updateGameData, 60000);
      return () => clearInterval(interval);
    }
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
          </div>
          <div class="stat-item">
            <span class="stat-label">Level</span>
            <span class="stat-value">{level}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Apples</span>
            <span class="stat-value">{apples}</span>
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
                  gameId="snake"
                  score={score}
                  isGameOver={true}
                  minStake={gameState.configs?.snake?.minStake?.toString() ?? '0'}
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
            <button class="touch-btn" ontouchstart={() => handleTouch('up')}>
              <span>↑</span>
            </button>
          </div>
          <div class="touch-row">
            <button class="touch-btn" ontouchstart={() => handleTouch('left')}>
              <span>←</span>
            </button>
            <button class="touch-btn" ontouchstart={() => handleTouch('down')}>
              <span>↓</span>
            </button>
            <button class="touch-btn" ontouchstart={() => handleTouch('right')}>
              <span>→</span>  
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
            <span>Move Up</span>
            <span class="key">↑ / W</span>
          </li>
          <li class="control-item">
            <span>Move Left</span>
            <span class="key">← / A</span>
          </li>
          <li class="control-item">
            <span>Move Down</span>
            <span class="key">↓ / S</span>
          </li>
          <li class="control-item">
            <span>Move Right</span>
            <span class="key">→ / D</span>
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
    <LeaderBoard selectedGame="snake" />
  </div>

  <!-- Validation Section -->
  <div class="validation-section">
    {#if walletState.isVerifier}
      <ValidateScore selectedGame="snake" />
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

  .error-message {
    margin: 1rem 0;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    color: rgb(239, 68, 68);
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