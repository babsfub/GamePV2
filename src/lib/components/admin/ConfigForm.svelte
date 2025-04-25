<!-- src/lib/components/admin/ConfigForm.svelte -->
<script lang="ts">
  import { parseEther, formatEther } from 'viem'
  import { contractActions } from '$lib/contracts/actions.js'
  import type { Address } from 'viem'
  import type { GameId } from '$lib/types.js'

  // Props
  let { account } = $props<{ account: Address }>()

  type Game = GameId;

  // Configuration par défaut avec les paramètres présents dans l'ABI
  const DEFAULT_CONFIG = {
    roundDuration: BigInt(172800), // 48h en secondes
    minStake: parseEther('0.01'),
    platformFee: 30,
    verifierFee: 10,
    maxScorePerGame: BigInt(100),
    maxScoresPerPlayer: 3,
    active: true,
    // Paramètres avancés
    allowUnverifiedScores: false,
    minDistributionDelay: BigInt(3600), // 1h par défaut
    saltKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
    maxWinners: 3,
    platformFeePercent: 10,
    winnerPercentages: [50, 30, 20]
  }

  // États du formulaire - paramètres de base
  let selectedGame = $state<Game>('snake')
  let roundDuration = $state(DEFAULT_CONFIG.roundDuration.toString())
  let minStake = $state(formatEther(DEFAULT_CONFIG.minStake))
  let platformFee = $state(DEFAULT_CONFIG.platformFee.toString())
  let verifierFee = $state(DEFAULT_CONFIG.verifierFee.toString())
  let maxScorePerGame = $state(DEFAULT_CONFIG.maxScorePerGame.toString())
  let maxScoresPerPlayer = $state(DEFAULT_CONFIG.maxScoresPerPlayer.toString())
  let active = $state(DEFAULT_CONFIG.active)

  // États du formulaire - paramètres avancés
  let allowUnverifiedScores = $state(DEFAULT_CONFIG.allowUnverifiedScores)
  let minDistributionDelay = $state(DEFAULT_CONFIG.minDistributionDelay.toString())
  let saltKey = $state(DEFAULT_CONFIG.saltKey)
  let maxWinners = $state(DEFAULT_CONFIG.maxWinners.toString())
  let platformFeePercent = $state(DEFAULT_CONFIG.platformFeePercent.toString())
  let winnerPercentages = $state<string[]>(DEFAULT_CONFIG.winnerPercentages.map(String))

  // Toggle pour la configuration avancée
  let useAdvancedMode = $state(false)

  // États UI
  let loading = $state(false)
  let error = $state<string | null>(null)
  let success = $state<string | null>(null)

  // Chargement de la configuration
  async function loadGameConfig() {
    try {
      loading = true
      error = null
      const config = await contractActions.read.getGameConfig(selectedGame)
      if (!config) throw new Error('Invalid config')

      // Paramètres de base
      roundDuration = config.roundDuration.toString()
      minStake = formatEther(config.minStake)
      platformFee = config.platformFee.toString()
      verifierFee = config.verifierFee.toString()
      maxScorePerGame = config.maxScorePerGame.toString()
      maxScoresPerPlayer = config.maxScoresPerPlayer.toString()
      active = config.active

      // Paramètres avancés
      if (config.allowUnverifiedScores !== undefined) {
        allowUnverifiedScores = config.allowUnverifiedScores
      }
      if (config.minDistributionDelay !== undefined) {
        minDistributionDelay = config.minDistributionDelay.toString()
      }
      if (config.saltKey) {
        saltKey = config.saltKey
      }
      if (config.maxWinners !== undefined) {
        maxWinners = config.maxWinners.toString()
      }
      if (config.platformFeePercent !== undefined) {
        platformFeePercent = config.platformFeePercent.toString()
      }
      if (config.winnerPercentages) {
        winnerPercentages = config.winnerPercentages.map(String)
      }

    } catch (err) {
      console.error('Error loading game config:', err)
      error = 'Failed to load game configuration'
    } finally {
      loading = false 
    }
  }

  // Validation des entrées
  function validateInputs(): boolean {
    error = null

    // Vérifier que roundDuration peut être converti en uint64
    if (Number(roundDuration) < 3600 || Number(roundDuration) > 2**64 - 1) {
      error = 'Round duration must be at least 1 hour and a valid uint64 value'
      return false
    }

    // Vérifier minStake
    if (Number(minStake) < 0.001) {
      error = 'Minimum stake must be at least 0.001 ETH'
      return false  
    }

    try {
      const minStakeInWei = parseEther(minStake)
      if (minStakeInWei > 2n**64n - 1n) {
        error = 'Minimum stake exceeds maximum allowed value'
        return false
      }
    } catch (err) {
      error = 'Invalid stake format'
      return false
    }

    // Vérifier les taux de frais
    const platformFeeNum = Number(platformFee)
    const verifierFeeNum = Number(verifierFee)

    if (platformFeeNum < 0 || platformFeeNum > 255) {
      error = 'Platform fee must be between 0 and 255'
      return false
    }

    if (verifierFeeNum < 0 || verifierFeeNum > 255) {
      error = 'Verifier fee must be between 0 and 255'
      return false
    }

    if (platformFeeNum + verifierFeeNum > 100) {
      error = 'Total fees cannot exceed 100%'
      return false
    }

    // Vérifier maxScorePerGame
    if (Number(maxScorePerGame) < 1 || Number(maxScorePerGame) > 2**64 - 1) {
      error = 'Max scores per game must be at least 1 and a valid uint64 value'
      return false  
    }
    
    // Vérifier maxScoresPerPlayer
    if (Number(maxScoresPerPlayer) < 1 || Number(maxScoresPerPlayer) > 65535) {
      error = 'Max scores per player must be at least 1 and a valid uint16 value (max 65535)'
      return false  
    }

    // Validations supplémentaires en mode avancé
    if (useAdvancedMode) {
      // Vérifier minDistributionDelay
      if (Number(minDistributionDelay) < 0 || Number(minDistributionDelay) > 2**64 - 1) {
        error = 'Minimum distribution delay must be a valid uint64 value'
        return false
      }

      // Vérifier maxWinners
      if (Number(maxWinners) <= 0 || Number(maxWinners) > 255) {
        error = 'Maximum winners must be between 1 and 255'
        return false
      }

      // Vérifier platformFeePercent
      if (Number(platformFeePercent) < 0 || Number(platformFeePercent) > 255) {
        error = 'Platform fee percent must be between 0 and 255'
        return false
      }

      // Vérifier winnerPercentages
      if (winnerPercentages.length !== Number(maxWinners)) {
        error = `Number of winner percentages (${winnerPercentages.length}) must equal max winners (${maxWinners})`
        return false
      }

      if (winnerPercentages.some(p => Number(p) < 0 || Number(p) > 255)) {
        error = 'All winner percentages must be between 0 and 255'
        return false
      }

      const totalPercentage = winnerPercentages.reduce((sum, p) => sum + Number(p), 0)
      if (totalPercentage > 100) {
        error = 'Total winner percentages cannot exceed 100%'
        return false
      }

      // Vérifier saltKey si fourni
      if (saltKey && !saltKey.startsWith('0x')) {
        error = 'Salt key must be a valid hex string starting with 0x'
        return false
      }
    }

    return true
  }

  // Soumission du formulaire
  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault()
    try {
      loading = true
      error = null
      success = null

      if (!validateInputs()) return

      let hash;

      if (useAdvancedMode) {
        // Utiliser configureGame pour les paramètres avancés
        hash = await contractActions.write.configureGame({
          game: selectedGame,
          roundDuration: BigInt(roundDuration),
          minStake: parseEther(minStake),
          platformFee: Number(platformFee),
          verifierFee: Number(verifierFee),
          maxScorePerGame: BigInt(maxScorePerGame),
          maxScoresPerPlayer: Number(maxScoresPerPlayer),
          active,
          allowUnverifiedScores,
          minDistributionDelay: BigInt(minDistributionDelay),
          saltKey: saltKey as `0x${string}`,
          maxWinners: Number(maxWinners),
          platformFeePercent: Number(platformFeePercent),
          winnerPercentages: winnerPercentages.map(Number),
          account
        });
      } else {
        // Utiliser setGameConfig pour les paramètres de base
        hash = await contractActions.write.setGameConfig({
          game: selectedGame,
          roundDuration: BigInt(roundDuration),
          minStake: parseEther(minStake),
          platformFee: Number(platformFee),
          verifierFee: Number(verifierFee),
          maxScorePerGame: BigInt(maxScorePerGame),
          maxScoresPerPlayer: Number(maxScoresPerPlayer),
          active,
          account
        });
      }

      success = 'Game configuration updated successfully! Transaction: ' + hash
    } catch (err) {
      console.error('Error updating game config:', err) 
      error = 'Failed to update game configuration: ' + (err instanceof Error ? err.message : String(err))
    } finally {
      loading = false
    }
  }

  function selectGame(game: Game) {
    selectedGame = game
  }

  // Gestion des pourcentages de gagnants
  function updateMaxWinners(newValue: string) {
    const num = Number(newValue);
    maxWinners = newValue;
    
    // Ajuster la liste des pourcentages
    if (winnerPercentages.length < num) {
      // Ajouter des pourcentages
      const defaultValues = [50, 30, 20, 0, 0, 0, 0, 0, 0, 0];
      winnerPercentages = [
        ...winnerPercentages,
        ...defaultValues.slice(winnerPercentages.length, num).map(String)
      ];
    } else if (winnerPercentages.length > num) {
      // Réduire la liste
      winnerPercentages = winnerPercentages.slice(0, num);
    }
  }

  // Chargement initial et sur changement de jeu
  $effect(() => {
    loadGameConfig()
  })
</script>

<form class="config-form" onsubmit={handleSubmit}>
  <div class="header">
    <h2>Game Configuration</h2>
    <div class="game-select">
      <button
        type="button"
        class:active={selectedGame === 'snake'}
        onclick={() => selectGame('snake')}
      >
        Snake
      </button>
      <button
        type="button"
        class:active={selectedGame === 'tetris'}
        onclick={() => selectGame('tetris')}
      >
        Tetris
      </button>
    </div>
  </div>

  <div class="mode-toggle">
    <label class="toggle-container">
      <span>Advanced Configuration</span>
      <input 
        type="checkbox" 
        bind:checked={useAdvancedMode}
        disabled={loading}
      />
      <span class="slider"></span>
    </label>
  </div>

  {#if error}
    <div class="alert error" role="alert">
      {error}
    </div>
  {/if}

  {#if success}
    <div class="alert success" role="status">
      {success}
    </div>
  {/if}

  <div class="form-section">
    <h3>Basic Settings</h3>
    
    <div class="form-group">
      <label for="roundDuration">Round Duration (seconds)</label>
      <input
        type="number"
        id="roundDuration"
        bind:value={roundDuration}
        min="3600"
        required
        disabled={loading}
        aria-describedby="roundDurationHelp"
      />
      <small id="roundDurationHelp">Minimum duration: 1 hour (3600 seconds)</small>
    </div>

    <div class="form-group">
      <label for="minStake">Minimum Stake (ETH)</label>
      <input
        type="number"
        id="minStake"
        bind:value={minStake}
        min="0.001"
        step="0.001"
        required
        disabled={loading}
      />
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="platformFee">Platform Fee (%)</label>
        <input
          type="number"
          id="platformFee"
          bind:value={platformFee}
          min="0"
          max="255"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="verifierFee">Verifier Fee (%)</label>
        <input
          type="number"
          id="verifierFee"
          bind:value={verifierFee}
          min="0"
          max="255"
          required
          disabled={loading}
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="maxScorePerGame">Max Scores Per Game</label>
        <input
          type="number"
          id="maxScorePerGame"
          bind:value={maxScorePerGame}
          min="1"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="maxScoresPerPlayer">Max Scores Per Player</label>
        <input
          type="number"
          id="maxScoresPerPlayer"
          bind:value={maxScoresPerPlayer}
          min="1"
          max="65535"
          required
          disabled={loading}
        />
      </div>
    </div>

    <div class="form-group">
      <label>
        <input
          type="checkbox"
          bind:checked={active}
          disabled={loading}
        />
        Game Active
      </label>
    </div>
  </div>

  {#if useAdvancedMode}
    <div class="form-section">
      <h3>Advanced Settings</h3>
      
      <div class="form-group">
        <label>
          <input
            type="checkbox"
            bind:checked={allowUnverifiedScores}
            disabled={loading}
          />
          Allow Unverified Scores
        </label>
        <small>When enabled, unverified scores can be included in rewards distribution</small>
      </div>

      <div class="form-group">
        <label for="minDistributionDelay">Min Distribution Delay (seconds)</label>
        <input
          type="number"
          id="minDistributionDelay"
          bind:value={minDistributionDelay}
          min="0"
          required
          disabled={loading}
        />
        <small>Minimum time to wait before distributing rewards</small>
      </div>
      
      <div class="form-group">
        <label for="saltKey">Salt Key (optional)</label>
        <input
          type="text"
          id="saltKey"
          bind:value={saltKey}
          placeholder="0x..."
          disabled={loading}
        />
        <small>Leave as is to keep current salt key</small>
      </div>
    </div>

    <div class="form-section">
      <h3>Reward Distribution</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="maxWinners">Maximum Winners</label>
          <input
            type="number"
            id="maxWinners"
            bind:value={maxWinners}
            min="1"
            max="255"
            required
            disabled={loading}
            onchange={(e) => updateMaxWinners(e.currentTarget.value)}
          />
          <small>Number of winners who receive rewards</small>
        </div>

        <div class="form-group">
          <label for="platformFeePercent">Platform Fee Percent</label>
          <input
            type="number"
            id="platformFeePercent"
            bind:value={platformFeePercent}
            min="0"
            max="255"
            required
            disabled={loading}
          />
          <small>Percentage of prize pool for platform</small>
        </div>
      </div>

      <div class="winner-percentages">
        <label>Winner Percentages</label>
        <div class="percentages-grid">
          {#each winnerPercentages as percentage, i}
            <div class="percentage-item">
              <label for={`winner-${i}`}>#{i + 1} Place</label>
              <div class="percentage-input">
                <input
                  type="number"
                  id={`winner-${i}`}
                  bind:value={winnerPercentages[i]}
                  min="0"
                  max="255"
                  required
                  disabled={loading}
                />
                <span class="percentage-symbol">%</span>
              </div>
            </div>
          {/each}
        </div>
        <small class="total-percentage">
          Total: {winnerPercentages.reduce((sum, p) => sum + Number(p), 0)}%
        </small>
      </div>
    </div>
  {/if}

  <button
    type="submit"
    class="submit"
    disabled={loading}
  >
    {loading ? 'Updating...' : useAdvancedMode ? 'Update Full Configuration' : 'Update Configuration'}
  </button>
</form>

<style>
  .config-form {
    background-color: rgb(31 41 55);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .mode-toggle {
    margin-bottom: 1.5rem;
  }

  .toggle-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    color: rgb(156, 163, 175);
  }

  .toggle-container input {
    display: none;
  }

  .slider {
    position: relative;
    display: inline-block;
    width: 3rem;
    height: 1.5rem;
    background-color: rgb(55, 65, 81);
    border-radius: 9999px;
    transition: all 0.2s;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 1.125rem;
    width: 1.125rem;
    left: 0.1875rem;
    bottom: 0.1875rem;
    background-color: white;
    border-radius: 50%;
    transition: all 0.2s;
  }

  input:checked + .slider {
    background-color: rgb(79, 70, 229);
  }

  input:checked + .slider:before {
    transform: translateX(1.5rem);
  }

  h2 {
    margin: 0;
    color: white;
    font-size: 1.5rem;
  }

  h3 {
    color: white;
    font-size: 1.25rem;
    margin: 0 0 1.25rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 0.5rem;
  }

  .form-section {
    margin-bottom: 2rem;
  }

  .game-select {
    display: flex;
    gap: 0.5rem;
  }

  .game-select button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: rgb(55 65 81);
    color: white;
    cursor: pointer;
  }

  .game-select button.active {
    background: rgb(79 70 229);
  }

  .alert {
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .alert.error {
    background: rgba(220, 38, 38, 0.1);
    color: rgb(239, 68, 68);
  }

  .alert.success {
    background: rgba(5, 150, 105, 0.1);
    color: rgb(34, 197, 94);
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    color: rgb(156, 163, 175);
    margin-bottom: 0.5rem;
  }

  input[type="number"], input[type="text"] {
    width: 100%;
    padding: 0.75rem;
    background: rgb(55, 65, 81);
    border: 1px solid rgb(75, 85, 101);
    border-radius: 0.5rem;
    color: white;
  }

  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
  }

  .winner-percentages {
    margin-top: 1rem;
  }

  .percentages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
    margin-top: 0.5rem;
  }

  .percentage-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .percentage-input {
    position: relative;
  }

  .percentage-input input {
    padding-right: 2rem;
  }

  .percentage-symbol {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgb(156, 163, 175);
  }

  .total-percentage {
    margin-top: 1rem;
    text-align: right;
    font-weight: 500;
    color: white;
  }

  .submit {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 0.5rem;
    background: rgb(79, 70, 229);
    color: white;
    font-weight: 500;
    cursor: pointer;
  }

  .submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>