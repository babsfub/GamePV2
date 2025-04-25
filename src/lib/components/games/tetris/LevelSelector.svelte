<!-- lib/components/games/tetris/LevelSelector.svelte -->
<script lang="ts">
    import { getGameState } from '$lib/state/game.svelte.js';
    import { getWalletState } from '$lib/state/wallet.svelte.js';
    import { getUIState } from '$lib/state/ui.svelte.js';
    import { parseEther, formatEther } from 'viem';
    import type { GameConfig } from '$lib/contracts/types.js';
  
    // Types pour les niveaux Tetris
    interface TetrisLevel {
      id: string;
      name: string;
      description: string;
      startLevel: number;
      color: string;
      minStake: bigint;
      maxStake: bigint;
      scoreMultiplier: number;
      features: string[];
    }
    
    interface TetrisGameOptions {
      startLevel: number;
      showGhostPiece: boolean;
      showNextPiece: boolean;
      allowHold: boolean;
    }
  
    // Props
    const { 
      onGameStart,
      disabled = false
    } = $props<{
      onGameStart: (options: TetrisGameOptions, stake: bigint) => void;
      disabled?: boolean;
    }>();
  
    // États globaux
    const walletState = getWalletState();
    const gameState = getGameState();
    const uiState = getUIState();
  
    // États locaux
    let selectedLevelId = $state<string | null>(null);
    let customStake = $state<string | null>(null);
    let stakeInput = $state('');
    let showCustomStake = $state(false);
    let selectedStake = $state<bigint | null>(null);
    
    // Options de jeu Tetris
    let showGhostPiece = $state(true);
    let showNextPiece = $state(true);
    let allowHold = $state(true);
  
    // Service Tetris (simplifié ici, à développer selon les besoins)
    const TetrisLevelService = {
      getAvailableLevels(config: GameConfig | null): TetrisLevel[] {
        const minStake = config?.minStake || parseEther('0.001');
        return [
          {
            id: 'beginner',
            name: 'Beginner',
            description: 'Start slow with all helpers enabled. Perfect for new players.',
            startLevel: 1,
            color: '#4ade80',
            minStake: minStake,
            maxStake: minStake * 2n,
            scoreMultiplier: 1,
            features: ['Ghost Piece', 'Next Piece Preview', 'Hold Piece']
          },
          {
            id: 'intermediate',
            name: 'Intermediate',
            description: 'Start at level 5 with some helpers. Balanced challenge.',
            startLevel: 5,
            color: '#f59e0b',
            minStake: minStake * 3n / 4n,
            maxStake: minStake * 3n / 2n,
            scoreMultiplier: 1.5,
            features: ['Ghost Piece', 'Next Piece Preview']
          },
          {
            id: 'advanced',
            name: 'Advanced',
            description: 'Start at level 10 with minimal helpers. For experienced players.',
            startLevel: 10,
            color: '#ef4444',
            minStake: minStake / 2n,
            maxStake: minStake,
            scoreMultiplier: 2,
            features: ['Next Piece Preview']
          },
          {
            id: 'expert',
            name: 'Expert',
            description: 'Start at level 15 with no helpers. True test of skill.',
            startLevel: 15,
            color: '#8b5cf6',
            minStake: minStake / 4n,
            maxStake: minStake / 2n,
            scoreMultiplier: 3,
            features: []
          }
        ];
      },
      
      getLevelById(id: string): TetrisLevel | null {
        const config = gameState.configs?.tetris || null;
        return this.getAvailableLevels(config).find(level => level.id === id) || null;
      },
      
      isStakeValidForLevel(level: TetrisLevel, stake: bigint): boolean {
        return stake >= level.minStake && stake <= level.maxStake;
      },
      
      // Calculer la mise ajustée en fonction des options sélectionnées
      calculateAdjustedStake(baseLevel: TetrisLevel, options: TetrisGameOptions): bigint {
        let multiplier = 1.0;
        
        // Plus d'aides = mise plus élevée
        if (options.showGhostPiece) multiplier += 0.2;
        if (options.showNextPiece) multiplier += 0.2;
        if (options.allowHold) multiplier += 0.3;
        
        // Convertir en bigint (arrondi au plus proche)
        return BigInt(Math.round(Number(baseLevel.minStake) * multiplier));
      }
    };
  
    // État dérivé
    let gameConfig = $derived<GameConfig | null>(gameState.configs?.tetris || null);
    let availableLevels = $derived(TetrisLevelService.getAvailableLevels(gameConfig));
    let selectedLevel = $derived<TetrisLevel | null>(
      selectedLevelId ? TetrisLevelService.getLevelById(selectedLevelId) || null : null
    );
    
    let calculatedStake = $derived(() => {
      if (!selectedLevel) return null;
      
      const options = {
        startLevel: selectedLevel.startLevel,
        showGhostPiece,
        showNextPiece,
        allowHold
      };
      
      return TetrisLevelService.calculateAdjustedStake(selectedLevel, options);
    });
    
    let canProceed = $derived(
      !disabled && 
      selectedLevel !== null && 
      (selectedStake !== null || calculatedStake !== null) && 
      walletState.isConnected &&
      isStakeValid()
    );
  
    // Initialisation
    $effect(() => {
      if (availableLevels.length > 0 && !selectedLevelId) {
        selectedLevelId = availableLevels[0].id;
        updateFeaturesFromLevel(availableLevels[0]);
        
        // Calcul initial de la mise
        if (calculatedStake) {
          selectedStake = calculatedStake;
          stakeInput = formatEther(calculatedStake);
        }
      }
    });
  
    // Mise à jour des fonctionnalités basées sur le niveau sélectionné
    function updateFeaturesFromLevel(level: TetrisLevel) {
      showGhostPiece = level.features.includes('Ghost Piece');
      showNextPiece = level.features.includes('Next Piece Preview');
      allowHold = level.features.includes('Hold Piece');
    }
  
    function selectLevel(levelId: string) {
      selectedLevelId = levelId;
      const level = TetrisLevelService.getLevelById(levelId);
      
      if (level) {
        updateFeaturesFromLevel(level);
        
        // Réinitialiser à la mise calculée basée sur les options
        showCustomStake = false;
        if (calculatedStake) {
          selectedStake = calculatedStake;
          stakeInput = formatEther(calculatedStake);
        }
      }
    }
  
    function toggleCustomStake() {
      showCustomStake = !showCustomStake;
      if (showCustomStake && selectedLevel && calculatedStake) {
        stakeInput = formatEther(selectedStake || calculatedStake);
      }
    }
  
    function updateStake() {
      if (!stakeInput || !selectedLevel) return;
      
      try {
        const newStake = parseEther(stakeInput);
        selectedStake = newStake;
      } catch (err) {
        uiState.error("Invalid stake amount");
        if (calculatedStake) {
          selectedStake = calculatedStake;
          stakeInput = formatEther(calculatedStake);
        }
      }
    }
  
    function toggleOption(option: 'ghostPiece' | 'nextPiece' | 'hold') {
      if (option === 'ghostPiece') showGhostPiece = !showGhostPiece;
      if (option === 'nextPiece') showNextPiece = !showNextPiece;
      if (option === 'hold') allowHold = !allowHold;
      
      // Mettre à jour la mise calculée
      if (calculatedStake && !showCustomStake) {
        selectedStake = calculatedStake;
        stakeInput = formatEther(calculatedStake);
      }
    }
  
    function isStakeValid(): boolean {
      if (!selectedStake || !selectedLevel || !gameConfig) return false;
      
      // Vérifier que la mise est supérieure à la mise minimale du jeu
      if (selectedStake < gameConfig.minStake) return false;
      
      // Si nous utilisons la mise personnalisée, elle doit être au moins égale à la mise minimale
      if (showCustomStake) {
        return selectedStake >= selectedLevel.minStake;
      }
      
      // Pour la mise automatique, on fait confiance au calcul
      return true;
    }
  
    function handleStart() {
      if (!canProceed || !selectedLevel || !selectedStake) return;
      
      const options: TetrisGameOptions = {
        startLevel: selectedLevel.startLevel,
        showGhostPiece,
        showNextPiece,
        allowHold
      };
      
      // Appeler la fonction de callback avec les options sélectionnées
      onGameStart(options, selectedStake);
    }
  </script>
  
  <div class="level-selector">
    <h2>Tetris Game Setup</h2>
    
    {#if gameConfig}
      <div class="level-grid">
        {#each availableLevels as level (level.id)}
          <button 
            class="level-button"
            class:selected={selectedLevelId === level.id}
            style="--level-color: {level.color}"
            onclick={() => selectLevel(level.id)}
            disabled={disabled}
          >
            <div class="level-header">
              <span class="level-name">{level.name}</span>
              <span class="level-stake">{formatEther(level.minStake)} POL</span>
            </div>
            <div class="level-description">{level.description}</div>
            <div class="level-details">
              <span>Start at Level {level.startLevel}</span>
              <span>Multiplier: {level.scoreMultiplier}x</span>
            </div>
            <div class="level-features">
              {#each level.features as feature}
                <span class="feature">{feature}</span>
              {/each}
            </div>
          </button>
        {/each}
      </div>
      
      {#if selectedLevel}
        <div class="options-section">
          <h3>Game Options</h3>
          <p class="options-hint">Customize your gameplay experience. More helpers will increase your stake amount.</p>
          
          <div class="options-grid">
            <div class="option-item">
              <label class="option-label">
                <input 
                  type="checkbox" 
                  bind:checked={showGhostPiece}
                  on:change={() => toggleOption('ghostPiece')}
                  disabled={disabled}
                />
                <span>Ghost Piece</span>
              </label>
              <p class="option-description">Shows where the piece will land</p>
            </div>
            
            <div class="option-item">
              <label class="option-label">
                <input 
                  type="checkbox" 
                  bind:checked={showNextPiece}
                  on:change={() => toggleOption('nextPiece')}
                  disabled={disabled}
                />
                <span>Next Piece Preview</span>
              </label>
              <p class="option-description">Shows the next piece coming up</p>
            </div>
            
            <div class="option-item">
              <label class="option-label">
                <input 
                  type="checkbox" 
                  bind:checked={allowHold}
                  on:change={() => toggleOption('hold')}
                  disabled={disabled}
                />
                <span>Hold Piece</span>
              </label>
              <p class="option-description">Allows storing a piece for later use</p>
            </div>
          </div>
        </div>
        
        <div class="stake-section">
          <h3>Stake Amount</h3>
          
          <div class="stake-info">
            <div class="stake-explanation">
              <p>Your stake determines your potential rewards.</p>
              <p>The more helpers you use, the higher your stake must be.</p>
            </div>
            
            <div class="calculated-stake">
              <span class="stake-label">Current Stake:</span>
              <span class="stake-value">{calculatedStake ? formatEther(calculatedStake) : '0'} POL</span>
            </div>
          </div>
          
          <div class="stake-controls">
            <div class="custom-stake-toggle">
              <button
                class="toggle-button"
                class:active={showCustomStake}
                onclick={toggleCustomStake}
                disabled={disabled}
              >
                {showCustomStake ? 'Use Calculated Stake' : 'Set Custom Stake'}
              </button>
            </div>
            
            {#if showCustomStake}
              <div class="custom-stake-input">
                <input
                  type="text"
                  bind:value={stakeInput}
                  on:input={updateStake}
                  placeholder={`Min: ${formatEther(selectedLevel.minStake)} POL`}
                  disabled={disabled}
                />
                <span class="currency">POL</span>
              </div>
              
              <div class="stake-range">
                <span>Minimum: {formatEther(selectedLevel.minStake)} POL</span>
              </div>
            {/if}
          </div>
          
          <div class="proceed-section">
            <button
              class="proceed-button"
              disabled={!canProceed}
              onclick={handleStart}
            >
              Start Game
            </button>
            
            {#if !isStakeValid() && selectedStake}
              <div class="validation-warning">
                Stake amount must be at least {formatEther(selectedLevel.minStake)} POL for this level
              </div>
            {/if}
            
            {#if !walletState.isConnected}
              <div class="wallet-warning">
                Please connect your wallet to play
              </div>
            {/if}
          </div>
        </div>
      {/if}
    {:else}
      <div class="loading">Loading game configuration...</div>
    {/if}
  </div>
  
  <style>
    .level-selector {
      background: var(--color-surface);
      border-radius: 1rem;
      padding: 1.5rem;
      max-width: 800px;
      margin: 0 auto;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
  
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 1.5rem;
      text-align: center;
    }
  
    h3 {
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--color-text);
      margin: 1.5rem 0 1rem;
    }
  
    .level-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
  
    .level-button {
      position: relative;
      background: var(--color-surface-alt);
      border: 2px solid transparent;
      border-radius: 0.75rem;
      padding: 1.25rem;
      text-align: left;
      transition: all 0.2s ease;
      cursor: pointer;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  
    .level-button::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 0.25rem;
      background: var(--level-color);
    }
  
    .level-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
  
    .level-button.selected {
      border-color: var(--level-color);
      background: rgba(var(--level-color-rgb, 0, 0, 0), 0.1);
    }
  
    .level-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
  
    .level-name {
      font-weight: 600;
      font-size: 1.125rem;
      color: var(--level-color);
    }
  
    .level-stake {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      background: rgba(0, 0, 0, 0.2);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
  
    .level-description {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 1rem;
      flex-grow: 1;
    }
  
    .level-details {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      font-size: 0.75rem;
      margin-bottom: 0.75rem;
    }
  
    .level-details span {
      background: rgba(0, 0, 0, 0.2);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      color: var(--color-text-secondary);
    }
  
    .level-features {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  
    .feature {
      font-size: 0.75rem;
      background: rgba(var(--level-color-rgb, 79, 70, 229), 0.2);
      color: var(--level-color);
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }
  
    .options-section, .stake-section {
      background: var(--color-surface-alt);
      border-radius: 0.75rem;
      padding: 1.25rem;
      margin-top: 1.5rem;
    }
  
    .options-hint {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      margin-bottom: 1rem;
    }
  
    .options-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
  
    .option-item {
      background: rgba(0, 0, 0, 0.1);
      padding: 1rem;
      border-radius: 0.5rem;
    }
  
    .option-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      cursor: pointer;
    }
  
    .option-description {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
    }
  
    .stake-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
  
    .stake-explanation {
      flex: 1;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
    }
  
    .calculated-stake {
      background: rgba(var(--color-primary-rgb, 79, 70, 229), 0.1);
      padding: 1rem;
      border-radius: 0.5rem;
      text-align: center;
    }
  
    .stake-label {
      display: block;
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      margin-bottom: 0.25rem;
    }
  
    .stake-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-primary);
    }
  
    .stake-controls {
      margin-top: 1.5rem;
    }
  
    .custom-stake-toggle {
      margin-bottom: 1rem;
    }
  
    .toggle-button {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: none;
      color: var(--color-text);
      padding: 0.75rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
  
    .toggle-button:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.3);
    }
  
    .toggle-button.active {
      background: var(--color-primary);
      color: white;
    }
  
    .custom-stake-input {
      position: relative;
      margin-bottom: 0.75rem;
    }
  
    .custom-stake-input input {
      width: 100%;
      padding: 0.75rem 3rem 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(0, 0, 0, 0.2);
      color: white;
      font-size: 1rem;
    }
  
    .custom-stake-input input:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  
    .currency {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-secondary);
    }
  
    .stake-range {
      font-size: 0.75rem;
      color: var(--color-text-secondary);
      text-align: right;
    }
  
    .proceed-section {
      margin-top: 1.5rem;
      text-align: center;
    }
  
    .proceed-button {
      background: var(--color-secondary);
      color: white;
      border: none;
      border-radius: 0.5rem;
      padding: 1rem 2rem;
      font-size: 1.125rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
    }
  
    .proceed-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
  
    .proceed-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  
    .validation-warning, .wallet-warning {
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      text-align: center;
    }
  
    .validation-warning {
      background: rgba(239, 68, 68, 0.1);
      color: rgb(239, 68, 68);
    }
  
    .wallet-warning {
      background: rgba(234, 179, 8, 0.1);
      color: rgb(234, 179, 8);
    }
  
    .loading {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-secondary);
    }
  
    @media (max-width: 768px) {
      .level-grid {
        grid-template-columns: 1fr;
      }
  
      .options-grid {
        grid-template-columns: 1fr;
      }
  
      .stake-info {
        flex-direction: column;
        gap: 1rem;
      }
  
      .calculated-stake {
        width: 100%;
      }
    }
  </style>