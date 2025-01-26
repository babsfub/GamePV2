<!-- src/lib/components/admin/ConfigForm.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { parseEther, formatEther } from 'viem'
  import { contractActions } from '$lib/contracts/actions.js'
  import type { Address } from 'viem'
  import type { GameConfig } from '$lib/contracts/types.js'

  // Props
  let { account } = $props<{ account: Address }>()

  type Game = 'snake' | 'tetris'

  // Configuration par défaut avec des conversions appropriées
  const DEFAULT_CONFIG = {
    roundDuration: BigInt(172800), // 48h en secondes
    minStake: parseEther('0.01'),
    platformFee: 30,
    verifierFee: 10,
    maxScorePerGame: BigInt(100),
    active: true,
    rewardDistribution: {
      maxWinners: 3,
      platformFeePercent: 10,
      winnerPercentages: [50, 30, 20] as const
    }
  }

  // États du formulaire
  let selectedGame = $state<Game>('snake')
  let roundDuration = $state(DEFAULT_CONFIG.roundDuration.toString())
  let minStake = $state(formatEther(DEFAULT_CONFIG.minStake))
  let platformFee = $state(DEFAULT_CONFIG.platformFee.toString())
  let verifierFee = $state(DEFAULT_CONFIG.verifierFee.toString())
  let maxScorePerGame = $state(DEFAULT_CONFIG.maxScorePerGame.toString())
  let active = $state(DEFAULT_CONFIG.active)

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

      roundDuration = config.roundDuration.toString()
      minStake = formatEther(config.minStake)
      platformFee = config.platformFee.toString()
      verifierFee = config.verifierFee.toString()
      maxScorePerGame = config.maxScorePerGame.toString()
      active = config.active
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

    if (Number(roundDuration) < 3600) {
      error = 'Round duration must be at least 1 hour'
      return false
    }

    if (Number(minStake) < 0.001) {
      error = 'Minimum stake must be at least 0.001 ETH'
      return false  
    }

    const platformFeeNum = Number(platformFee)
    const verifierFeeNum = Number(verifierFee)

    if (platformFeeNum < 0 || platformFeeNum > 100) {
      error = 'Platform fee must be between 0 and 100'
      return false
    }

    if (verifierFeeNum < 0 || verifierFeeNum > 100) {
      error = 'Verifier fee must be between 0 and 100'
      return false
    }

    if (platformFeeNum + verifierFeeNum > 100) {
      error = 'Total fees cannot exceed 100%'
      return false
    }

    if (Number(maxScorePerGame) < 1) {
      error = 'Max scores must be at least 1'
      return false  
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

      const hash = await contractActions.write.setGameConfig({
        game: selectedGame,
        roundDuration: BigInt(roundDuration),
        minStake: BigInt(parseEther(minStake)),
        platformFee: Number(platformFee),
        verifierFee: Number(verifierFee),
        active,
        account
      })

      success = 'Game configuration updated successfully! Transaction: ' + hash
    } catch (err) {
      console.error('Error updating game config:', err) 
      error = 'Failed to update game configuration'
    } finally {
      loading = false
    }
  }

  function selectGame(game: Game) {
    selectedGame = game
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

  <div class="form-group">
    <label for="platformFee">Platform Fee (%)</label>
    <input
      type="number"
      id="platformFee"
      bind:value={platformFee}
      min="0"
      max="100"
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
      max="100"
      required
      disabled={loading}
    />
  </div>

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
    <label>
      <input
        type="checkbox"
        bind:checked={active}
        disabled={loading}
      />
      Game Active
    </label>
  </div>

  <button
    type="submit"
    class="submit"
    disabled={loading}
  >
    {loading ? 'Updating...' : 'Update Configuration'}
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
    margin-bottom: 1.5rem;
  }

  h2 {
    margin: 0;
    color: white;
    font-size: 1.5rem;
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

  .form-group {
    margin-bottom: 1.5rem;
  }

  label {
    display: block;
    color: rgb(156, 163, 175);
    margin-bottom: 0.5rem;
  }

  input[type="number"] {
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