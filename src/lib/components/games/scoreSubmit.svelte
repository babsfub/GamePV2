<script lang="ts">
  import { onMount } from 'svelte'
  import { wallet } from '$lib/stores/wallet.js'
  import { contractActions } from '$lib/contracts/actions.js'
  import { formatEther } from 'viem'
  import { TetrisEngine } from '$lib/games/tetris/pkg/tetris_engine.js'
  import type { GameConfig } from '$lib/contracts/types.js'


  const { gameId, score, onSubmit, isGameOver = false, disabled = false } = $props<{
    gameId: string,
    score: number,
    onSubmit: (stake: string) => Promise<void>,
    isGameOver?: boolean,
    disabled?: boolean
  }>()

  let selectedStake = $state('0.001')
  let submitting = $state(false)
  let error = $state<string | null>(null)
  let stakeOptions = $state<string[]>([ '0.05', '0.1'])
  let gameConfig = $state<GameConfig | null>(null)
  let scoreHash = $state<string | null>(null)

  function safeFormatEther(value: bigint | undefined): string {
    if (!value) return '0'
    try {
      return formatEther(value)
    } catch {
      return '0'
    }
  }

  function safeGetPlatformFee(): string {
    if (!gameConfig?.platformFee) return '0'
    try {
      return gameConfig.platformFee.toString()
    } catch {
      return '0'
    }
  }

  async function loadGameConfig() {
    console.log(`Loading game config for gameId: ${gameId}`)
    try {
      const config = await contractActions.read.getGameConfig(gameId)
      console.log('Config loaded:', config)  
      if (!config) throw new Error('No config returned')
      
      gameConfig = {
        ...config,
        platformFee: Number(config.platformFee)
      }

      let minStakeEth = '0.001'
      try {
        minStakeEth = formatEther(config.minStake)
      } catch (err) {
        console.warn('Error formatting minStake:', err)
      }

      const newStakeOptions = stakeOptions.filter(stake => 
        parseFloat(stake) >= parseFloat(minStakeEth)
      )

      stakeOptions = newStakeOptions.length > 0 ? newStakeOptions : [minStakeEth]
      selectedStake = stakeOptions[0]

    } catch (err) {
      console.error(`Error loading game config for ${gameId}:`, err)
      error = 'Failed to load game configuration'
    }
  }

  // Soumission du score
  async function handleSubmit() {
    if (!$wallet.address || score === 0) return
    if (gameConfig && !gameConfig.active && isGameOver) {
      error = 'Game is currently inactive'
      return
    }

    try {
      submitting = true
      error = null
      await onSubmit(selectedStake)
    } catch (err) {
      console.error(`Error submitting ${gameId} score:`, err)
      error = 'Failed to submit score'
    } finally {
      submitting = false
    }
  }

  onMount(() => {
    loadGameConfig()
  })

  
</script>


<div class="stake-manager">
  <div class="stake-selector">
    <h3>Select Stake (POL)</h3>
    {#if gameConfig}
      <div class="game-info">
        <span>Min Stake: {safeFormatEther(gameConfig?.minStake)} POL</span>
        <span>Fee: {safeGetPlatformFee()}%</span>
      </div>
    {/if}
    <div class="stake-options">
      {#each stakeOptions as stake}
        <button
          class="stake-button"
          class:selected={selectedStake === stake}
          onclick={() => selectedStake = stake}
          disabled={disabled || submitting}
        >
          {stake} POL
        </button>
      {/each}
      <button
        class="stake-button"
        disabled={disabled || submitting}
        onclick={handleSubmit}>submit your score</button>  
    </div>
  </div>

  {#if !$wallet.address}
    <div class="warning">
      Connect wallet to submit scores
    </div>
  {/if}

  {#if error}
    <div class="error">
      {error}
    </div>
  {/if}

  {#if submitting}
    <div class="submitting">
      Submitting score...
    </div>
  {/if}
</div>

<style>
  .stake-manager {
    margin-top: 1rem;
  }

  .stake-selector {
    background: rgb(31 41 55);
    padding: 1rem;
    border-radius: 0.5rem;
  }

  h3 {
    color: rgb(156 163 175);
    font-size: 0.875rem;
    margin: 0 0 0.75rem;
  }

  .stake-options {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .stake-button {
    background: rgb(55 65 81);
    border: none;
    color: white;
    padding: 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .stake-button:hover:not(:disabled) {
    background: rgb(75 85 99);
  }

  .stake-button.selected {
    background: rgb(79 70 229);
  }

  .stake-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .warning {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgb(234 179 8 / 0.1);
    color: rgb(234 179 8);
    border-radius: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
  }

  .error {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgb(239 68 68 / 0.1);
    color: rgb(239 68 68);
    border-radius: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
  }

  .game-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
    font-size: 0.75rem;
    color: rgb(156 163 175);
  }

  .game-info span {
    background: rgba(0, 0, 0, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .submitting {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgb(34 197 94 / 0.1);
    color: rgb(34 197 94);
    border-radius: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
  }
</style>