<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { parseEther, formatEther } from 'viem';
  import { contractActions } from '$lib/contracts/actions.js';
  import { publicClient } from '$lib/config/contract.js';
  import ScoreSubmit from '$lib/components/games/scoreSubmit.svelte';
  import LeaderBoard from '$lib/components/LeaderBoard.svelte';
  import ValidateScore from '$lib/components/admin/validateScore.svelte';
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import { getGameState } from '$lib/state/game.svelte.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { DIFFICULTY_LEVELS } from '$lib/components/games/MineSweeper/constants.js';
  import initWasm, { MinesweeperEngine } from '$lib/games/MineSweeper/pkg/minesweeper.js';
  import type { MinesweeperState } from '$lib/types.js';
  import { ScoreService } from '$lib/utils/scoreServices.js';
  import { Buffer } from 'buffer';

  // Props
  let { data } = $props<{
    data: {
      isVerifier: boolean;
      isAdmin: boolean;
    }
  }>();

  // États globaux
  const walletState = getWalletState();
  const gameState = getGameState();
  const uiState = getUIState();

  // États locaux
  let containerRef: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let engine = $state<MinesweeperEngine | null>(null);
  let minesweeperState = $state<MinesweeperState | null>(null);
  let selectedLevel = $state<keyof typeof DIFFICULTY_LEVELS | null>(null);
  let showLevelSelect = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let isFullscreen = $state(false);
  let isMobileView = $state(false);

  // Constantes de rendu
  const CELL_SIZE = 32;
  const CELL_MARGIN = 2;
  const COLORS = {
    UNREVEALED: '#c0c0c0',
    REVEALED: '#e0e0e0',
    FLAGGED: '#ff6b6b',
    MINE: '#222222',
    NUMBERS: [
      'transparent', // 0 - pas de nombre
      '#0000ff',     // 1 - bleu
      '#008000',     // 2 - vert
      '#ff0000',     // 3 - rouge
      '#000080',     // 4 - bleu foncé
      '#800000',     // 5 - bordeaux
      '#008080',     // 6 - cyan
      '#000000',     // 7 - noir
      '#808080'      // 8 - gris
    ]
  };

  // Vérifier si le navigateur est mobile
  function checkMobileView() {
    if (browser) {
      isMobileView = window.innerWidth <= 768 || 'ontouchstart' in window;
    }
  }

  // Initialisation du jeu
  async function startGame(level: keyof typeof DIFFICULTY_LEVELS) {
    if (!browser || !canvas) return;

    try {
      const stake = parseEther(DIFFICULTY_LEVELS[level].minStake);
      
      // Libérer l'ancien moteur si existant
      if (engine) {
        engine.free();
      }

      // Créer un nouveau moteur de jeu
      engine = new MinesweeperEngine(stake);
      
      // Mettre à jour l'état initial
      updateGameState();
      
      // Configuration du canvas
      setupCanvas(level);
      
      selectedLevel = level;
      showLevelSelect = false;
      error = null;

    } catch (err) {
      console.error('Failed to start game:', err);
      error = 'Failed to start game';
      uiState.error(error);
    }
  }

  // Configuration du canvas
  function setupCanvas(level: keyof typeof DIFFICULTY_LEVELS) {
    if (!canvas || !minesweeperState) return;
    
    const { grid } = minesweeperState;
    const width = grid[0].length;
    const height = grid.length;
    
    // Définir les dimensions du canvas
    canvas.width = (CELL_SIZE + CELL_MARGIN) * width;
    canvas.height = (CELL_SIZE + CELL_MARGIN) * height;
    
    // Obtenir le contexte de rendu
    ctx = canvas.getContext('2d');
    
    // Premier rendu
    render();
  }

  // Mise à jour de l'état du jeu
  function updateGameState() {
    if (!engine) return;
    
    try {
      const state = engine.get_state();
      minesweeperState = state;
      
      // Mise à jour de l'état global
      gameState.updateMinesweeperState(state);
      
      // Rendu du plateau
      render();
      
      // Vérifier si le jeu est terminé
      if (state.is_game_over && state.is_victory) {
        uiState.success('Congratulations!');
      }
    } catch (err) {
      console.error('Error updating game state:', err);
    }
  }

  // Rendu du plateau de jeu
  function render() {
    if (!ctx || !minesweeperState) return;
    
    const { grid } = minesweeperState;
    
    // Effacer le canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dessiner chaque cellule
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const cell = grid[y][x];
        const cellX = x * (CELL_SIZE + CELL_MARGIN);
        const cellY = y * (CELL_SIZE + CELL_MARGIN);
        
        // Couleur de fond de la cellule
        if (cell.is_revealed) {
          ctx.fillStyle = COLORS.REVEALED;
        } else if (cell.is_flagged) {
          ctx.fillStyle = COLORS.FLAGGED;
        } else {
          ctx.fillStyle = COLORS.UNREVEALED;
        }
        
        // Dessiner la cellule
        ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
        
        // Ajouter des effets 3D aux cellules non révélées
        if (!cell.is_revealed) {
          // Bord supérieur et gauche (clair)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(cellX, cellY, CELL_SIZE, 2);
          ctx.fillRect(cellX, cellY, 2, CELL_SIZE);
          
          // Bord inférieur et droit (foncé)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(cellX, cellY + CELL_SIZE - 2, CELL_SIZE, 2);
          ctx.fillRect(cellX + CELL_SIZE - 2, cellY, 2, CELL_SIZE);
        }
        
        // Dessiner le contenu de la cellule
        if (cell.is_revealed) {
          if (cell.has_mine) {
            // Dessiner une mine
            ctx.fillStyle = COLORS.MINE;
            ctx.beginPath();
            ctx.arc(
              cellX + CELL_SIZE / 2,
              cellY + CELL_SIZE / 2,
              CELL_SIZE / 4,
              0,
              Math.PI * 2
            );
            ctx.fill();
          } else if (cell.adjacent_mines > 0) {
            // Dessiner le nombre de mines adjacentes
            ctx.fillStyle = COLORS.NUMBERS[cell.adjacent_mines];
            ctx.font = `bold ${CELL_SIZE / 2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              cell.adjacent_mines.toString(),
              cellX + CELL_SIZE / 2,
              cellY + CELL_SIZE / 2
            );
          }
        } else if (cell.is_flagged) {
          // Dessiner un drapeau
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.moveTo(cellX + CELL_SIZE * 0.3, cellY + CELL_SIZE * 0.2);
          ctx.lineTo(cellX + CELL_SIZE * 0.3, cellY + CELL_SIZE * 0.8);
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(cellX + CELL_SIZE * 0.3, cellY + CELL_SIZE * 0.2);
          ctx.lineTo(cellX + CELL_SIZE * 0.7, cellY + CELL_SIZE * 0.35);
          ctx.lineTo(cellX + CELL_SIZE * 0.3, cellY + CELL_SIZE * 0.5);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  // Récupérer les coordonnées de la cellule à partir des coordonnées du clic
  function getCellCoordinates(event: MouseEvent | Touch): { x: number | null, y: number | null } {
    if (!canvas) return { x: null, y: null };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor(((event.clientX - rect.left) * scaleX) / (CELL_SIZE + CELL_MARGIN));
    const y = Math.floor(((event.clientY - rect.top) * scaleY) / (CELL_SIZE + CELL_MARGIN));
    
    // Vérifier si les coordonnées sont valides
    if (x >= 0 && y >= 0 && minesweeperState && x < minesweeperState.grid[0].length && y < minesweeperState.grid.length) {
      return { x, y };
    }
    
    return { x: null, y: null };
  }

  // Gestion des clics
  function handleClick(event: MouseEvent) {
    if (!engine || !minesweeperState || minesweeperState.is_game_over) return;
    
    const { x, y } = getCellCoordinates(event);
    
    if (x !== null && y !== null) {
      revealCell(x, y);
    }
  }

  // Gestion des clics droits
  function handleRightClick(event: MouseEvent) {
    event.preventDefault();
    
    if (!engine || !minesweeperState || minesweeperState.is_game_over) return;
    
    const { x, y } = getCellCoordinates(event);
    
    if (x !== null && y !== null) {
      toggleFlag(x, y);
    }
  }

  // Variables pour gérer les touches tactiles
  let touchStartPos: { x: number, y: number, cellX: number | null, cellY: number | null } | null = null;
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let isLongPress = false;

  // Gestion du début d'un toucher
  function handleTouchStart(event: TouchEvent) {
    if (!engine || !minesweeperState || minesweeperState.is_game_over) return;
    
    event.preventDefault();
    
    const touch = event.touches[0];
    touchStartPos = {
      x: touch.clientX,
      y: touch.clientY,
      cellX: null,
      cellY: null
    };
    
    const coords = getCellCoordinates(touch);
    touchStartPos.cellX = coords.x;
    touchStartPos.cellY = coords.y;
    
    // Configurer un timer pour détecter un appui long (pour poser un drapeau)
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      
      if (coords.x !== null && coords.y !== null) {
        toggleFlag(coords.x, coords.y);
      }
    }, 500); // 500ms pour un appui long
  }

  // Gestion du déplacement pendant un toucher
  function handleTouchMove(event: TouchEvent) {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  // Gestion de la fin d'un toucher
  function handleTouchEnd(event: TouchEvent) {
    if (!engine || !minesweeperState || !touchStartPos) return;
    
    event.preventDefault();
    
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    
    // Si ce n'était pas un appui long, révéler la cellule
    if (!isLongPress && touchStartPos.cellX !== null && touchStartPos.cellY !== null) {
      revealCell(touchStartPos.cellX, touchStartPos.cellY);
    }
    
    touchStartPos = null;
    isLongPress = false;
  }

  // Révéler une cellule
  function revealCell(x: number, y: number) {
    if (!engine) return;
    
    const result = engine.reveal_cell(x, y);
    
    // Mettre à jour l'état
    updateGameState();
  }

  // Poser/enlever un drapeau
  function toggleFlag(x: number, y: number) {
    if (!engine) return;
    
    const result = engine.toggle_flag(x, y);
    
    // Mettre à jour l'état
    updateGameState();
  }

  // Gestion du redimensionnement
  function handleResize() {
    checkMobileView();
    
    if (selectedLevel) {
      setupCanvas(selectedLevel);
      render();
    }
  }

  // Basculer le mode plein écran
  async function toggleFullscreen() {
    if (!containerRef) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.requestFullscreen();
        isFullscreen = true;
      } else {
        await document.exitFullscreen();
        isFullscreen = false;
      }
      
      // Redimensionner le canvas après un court délai
      setTimeout(() => {
        if (selectedLevel) {
          setupCanvas(selectedLevel);
          render();
        }
      }, 100);
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  }

  // Réinitialiser le jeu
  function resetGame() {
    if (!selectedLevel) {
      showLevelSelect = true;
      return;
    }

    startGame(selectedLevel);
  }

  // Soumission du score
  async function handleSubmitScore(stake: string) {
    if (!engine || !walletState.address || !minesweeperState?.is_game_over) return;

    try {
      submitting = true;
      error = null;

      const [block, gameConfig] = await Promise.all([
        publicClient.getBlock(),
        contractActions.read.getGameConfig('minesweeper')
      ]);

      if (!gameConfig?.saltKey) {
        throw new Error('Could not get game configuration or salt key');
      }

      const stakeInWei = parseEther(stake);
      if (stakeInWei < gameConfig.minStake) {
        throw new Error(`Minimum stake required: ${formatEther(gameConfig.minStake)} ETH`);
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
        game: 'minesweeper',
        score: BigInt(minesweeperState.score),
        hash: scoreHashHex,
        value: stakeInWei,
        account: walletState.address
      });

      // Attendre la confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

      // Utiliser ScoreService pour la soumission
      await ScoreService.submitScore({
        gameState: minesweeperState,
        playerAddress: walletState.address,
        score: BigInt(minesweeperState.score),
        blockNumber: BigInt(block.number),
        stake: stakeInWei,
        scoreHash: scoreHashHex,
        transactionHash: tx,
        contractHash: receipt.blockHash,
        roundId: gameConfig.currentRound,
        transactionBlockNumber: receipt.blockNumber,
        transactionTimestamp: new Date()
      });

      uiState.success('Score submitted successfully!');

    } catch (err) {
      console.error('Error submitting score:', err);
      error = err instanceof Error ? err.message : 'Failed to submit score';
      uiState.error(error);
    } finally {
      submitting = false;
    }
  }

  // Initialisation au montage du composant
  onMount(async () => {
    if (!browser) return;

    checkMobileView();
    window.addEventListener('resize', handleResize);

    try {
      // Initialiser le module WASM
      await initWasm();
      
      // Configurer les écouteurs d'événements
      if (canvas) {
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('contextmenu', handleRightClick);
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchend', handleTouchEnd);
        canvas.addEventListener('touchmove', handleTouchMove);
      }
    } catch (err) {
      console.error('Failed to initialize WASM:', err);
      error = 'Failed to initialize game engine';
      uiState.error(error);
    }

    // Nettoyage au démontage
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
        canvas.removeEventListener('contextmenu', handleRightClick);
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchmove', handleTouchMove);
      }
      
      if (engine) {
        engine.free();
        engine = null;
      }
    };
  });
</script>

<div class="page-container">
  <!-- Level Select Modal -->
  {#if showLevelSelect}
    <div class="level-select-overlay">
      <div class="level-select-content">
        <h2>Select Difficulty</h2>
        
        <div class="level-grid">
          {#each Object.entries(DIFFICULTY_LEVELS) as [key, level]}
            <button
              class="level-card bg-gradient-to-r {level.color}"
              on:click={() => startGame(key as keyof typeof DIFFICULTY_LEVELS)}
            >
              <h3>{level.name}</h3>
              <p>{level.description}</p>
              <div class="stake-info">
                Minimum Stake: {level.minStake} ETH
              </div>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Game Container -->
  <div class="game-container" bind:this={containerRef}>
    <div class="game-stats">
      <div class="stat-item">
        <span class="label">Score</span>
        <span class="value">{minesweeperState?.score ?? 0}</span>
      </div>
      <div class="stat-item">
        <span class="label">Mines</span>
        <span class="value">{minesweeperState?.mines_remaining ?? 0}</span>
      </div>
      <div class="stat-item">
        <span class="label">Level</span>
        <span class="value">{selectedLevel ? DIFFICULTY_LEVELS[selectedLevel].name : ''}</span>
      </div>
    </div>

    <div class="game-controls">
      <button class="control-button" on:click={resetGame}>
        New Game
      </button>
      <button class="control-button" on:click={toggleFullscreen}>
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
    </div>

    <div class="game-board" class:game-over={minesweeperState?.is_game_over}>
      <canvas bind:this={canvas}></canvas>

      {#if isMobileView}
        <div class="mobile-help">
          <p>Tap to reveal a cell, hold to place flag</p>
        </div>
      {/if}
    </div>

    {#if minesweeperState?.is_game_over}
      <div class="overlay">
        <div class="overlay-content">
          <h2>{minesweeperState.is_victory ? 'Victory!' : 'Game Over'}</h2>
          <p>Score: {minesweeperState.score}</p>
          
          {#if walletState.address}
            <ScoreSubmit
              gameId="minesweeper"
              score={Number(minesweeperState.score)}
              isGameOver={true}
              onSubmit={handleSubmitScore}
              minStake={selectedLevel ? String(DIFFICULTY_LEVELS[selectedLevel].minStake) : '0'}
            />
          {:else}
            <div class="wallet-warning">
              Connect wallet to submit scores
            </div>
          {/if}

          <div class="action-buttons">
            <button 
              class="retry-button"
              on:click={() => {
                showLevelSelect = true;
                resetGame();
              }}
              disabled={submitting}
            >
              Change Level
            </button>
            <button 
              class="retry-button"
              on:click={resetGame}
              disabled={submitting}
            >
              Retry Same Level
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="leaderboard-section">
    <LeaderBoard selectedGame="minesweeper" />
  </div>

  {#if data.isVerifier}
    <div class="validation-section">
      <ValidateScore selectedGame="minesweeper" />
    </div>
  {/if}
</div>

<style>
  .page-container {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding: 2rem var(--spacing-screen-safe);
  }

  .level-select-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
  }

  .level-select-content {
    background: var(--color-surface);
    padding: 2rem;
    border-radius: 1rem;
    width: 90%;
    max-width: 800px;
  }

  .level-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .level-card {
    padding: 1.5rem;
    border-radius: 0.75rem;
    color: white;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
  }

  .level-card:hover {
    transform: translateY(-2px);
    border-color: white;
  }

  .game-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
    max-width: var(--max-width-game);
    margin: 0 auto;
  }

  .game-stats {
    display: flex;
    gap: 2rem;
    padding: 1rem;
    background: var(--color-surface);
    border-radius: 1rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-item .label {
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }

  .stat-item .value {
    color: var(--color-text);
    font-size: 1.25rem;
    font-weight: 600;
  }

  .game-controls {
    display: flex;
    gap: 1rem;
  }

  .control-button {
    padding: 0.75rem 1.5rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .game-board {
    background: var(--color-surface);
    padding: 1rem;
    border-radius: 1rem;
    position: relative;
    overflow: hidden;
  }

  .game-board.game-over canvas {
    opacity: 0.7;
  }

  canvas {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .mobile-help {
    margin-top: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
  }

  .overlay-content {
    background: var(--color-surface);
    padding: 2rem;
    border-radius: 1rem;
    text-align: center;
  }

  .wallet-warning {
    padding: 0.75rem;
    background: rgba(234, 179, 8, 0.1);
    color: rgb(234, 179, 8);
    border-radius: 0.5rem;
    margin: 1rem 0;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    justify-content: center;
  }

  .retry-button {
    padding: 0.75rem 1.5rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .retry-button:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .retry-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .leaderboard-section,
  .validation-section {
    width: 100%;
    max-width: var(--max-width-game);
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .page-container {
      padding: 1rem;
    }

    .game-container {
      padding: 0;
    }

    .game-stats {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .game-controls {
      flex-direction: column;
      width: 100%;
    }

    .action-buttons {
      flex-direction: column;
    }
  }
</style>