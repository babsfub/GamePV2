<!-- src/lib/components/admin/RewardDistributionForm.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { contractActions } from '$lib/contracts/actions.js'
  import { CONTRACT_CONFIG, contractEvents } from '$lib/config/contract.js'
  import type { Address } from 'viem'
  import type { Game } from '$lib/types/games.js'

  // Props
  let { account } = $props<{ account: Address }>()

  // Interface pour la distribution des récompenses
  interface WinnerDistribution {
    rank: number
    percentage: string
    description: string
  }

  // États du formulaire
  let selectedGame: keyof typeof CONTRACT_CONFIG.rewardDistribution.defaultPercentages = $state<'snake' | 'tetris'>('snake')
  let maxWinners = $state(CONTRACT_CONFIG.rewardDistribution.maxWinners.toString())
  let platformFeePercent = $state(CONTRACT_CONFIG.rewardDistribution.platformFeePercent.toString())
  let winnerDistributions = $state<WinnerDistribution[]>(
    CONTRACT_CONFIG.rewardDistribution.defaultPercentages.snake.map((percentage, index) => ({
      rank: index + 1,
      percentage: percentage.toString(),
      description: getRankDescription(index + 1)
    }))
  )

  // États UI
  let loading = $state(false)
  let error = $state<string | null>(null)
  let success = $state<string | null>(null)
  let unsubscribe: (() => void) | null = null

  // Initialisation et nettoyage
  onMount(() => {
    loadDistributionConfig()
    unsubscribe = contractEvents.watchRewardDistributionUpdate((data) => {
      maxWinners = data.maxWinners.toString()
      platformFeePercent = data.platformFeePercent.toString()
      winnerDistributions = data.winnerPercentages.map((percentage, index) => ({
        rank: index + 1,
        percentage: percentage.toString(),
        description: getRankDescription(index + 1)
      }))
    })
  })

  onDestroy(() => {
    if (unsubscribe) unsubscribe()
  })

  // Chargement de la configuration
  async function loadDistributionConfig() {
    try {
      loading = true
      error = null
      const config = await contractActions.read.getGameConfig(selectedGame)
      
      maxWinners = config.rewardDistribution.maxWinners.toString()
      platformFeePercent = config.rewardDistribution.platformFeePercent.toString()
      
      winnerDistributions = config.rewardDistribution.winnerPercentages.map((percentage, index) => ({
        rank: index + 1,
        percentage: percentage.toString(),
        description: getRankDescription(index + 1)
      }))
    } catch (err) {
      console.error('Error loading reward distribution:', err)
      error = 'Failed to load reward configuration'
    } finally {
      loading = false
    }
  }

  // Descriptions des rangs
  function getRankDescription(rank: number): string {
    const descriptions = [
      '1st Place - Gold',
      '2nd Place - Silver',
      '3rd Place - Bronze',
      '4th Place',
      '5th Place'
    ]
    return descriptions[rank - 1] || `${rank}th Place`
  }

  // Validation des entrées
  function validateInputs(): boolean {
    error = null

    if (Number(maxWinners) <= 0 || Number(maxWinners) > 10) {
      error = 'Number of winners must be between 1 and 10'
      return false
    }

    if (Number(platformFeePercent) < 0 || Number(platformFeePercent) > 100) {
      error = 'Platform fee must be between 0 and 100'
      return false
    }

    const percentages = winnerDistributions.map(d => Number(d.percentage))
    
    if (percentages.some(p => p < 0 || p > 100)) {
      error = 'All percentages must be between 0 and 100'
      return false
    }

    const totalPercentage = percentages.reduce((a, b) => a + b, 0)
    if (totalPercentage > 100) {
      error = 'Total rewards distribution cannot exceed 100%'
      return false
    }

    const ranks = winnerDistributions.map(d => d.rank)
    const expectedRanks = Array.from({length: ranks.length}, (_, i) => i + 1)
    if (!ranks.every((r, i) => r === expectedRanks[i])) {
      error = 'Ranks must be consecutive starting from 1'
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

      const hash = await contractActions.write.setRewardDistribution({
        game: selectedGame as string,
        maxWinners: Number(maxWinners),
        platformFeePercent: Number(platformFeePercent),
        winnerPercentages: winnerDistributions.map(d => Number(d.percentage)),
        account
      })

      success = 'Reward distribution updated successfully! Transaction: ' + hash
    } catch (err) {
      console.error('Error updating reward distribution:', err)
      error = 'Failed to update reward distribution'
    } finally {
      loading = false
    }
  }

  // Mise à jour des gagnants
  function updateMaxWinners(newValue: string) {
    const num = Number(newValue)
    if (num > 0 && num <= 10) {
      maxWinners = newValue
      winnerDistributions = Array(num).fill(null).map((_, index) => ({
        rank: index + 1,
        percentage: CONTRACT_CONFIG.rewardDistribution.defaultPercentages[selectedGame][index]?.toString() || '0',
        description: getRankDescription(index + 1)
      }))
    }
  }

  // Changement de jeu
  function selectGame(game: Game) {
    selectedGame = game as 'snake' | 'tetris'
    loadDistributionConfig()
  }
</script>

<!-- Template -->
<form class="config-form" onsubmit={handleSubmit}>
  <h2>Reward Distribution</h2>

  {#if error}
    <div class="alert error" role="alert">{error}</div>
  {/if}

  {#if success}
    <div class="alert success" role="status">{success}</div>
  {/if}

  <div class="form-row">
    <div class="form-group">
      <label for="game">Game</label>
      <select
        id="game"
        bind:value={selectedGame}
        onchange={(e) => selectGame(e.currentTarget.value as Game)}
        disabled={loading}
      >
        <option value="snake">Snake</option>
        <option value="tetris">Tetris</option>
      </select>
    </div>

    <div class="form-group">
      <label for="maxWinners">Maximum Winners</label>
      <input
        type="number"
        id="maxWinners"
        value={maxWinners}
        onchange={(e) => updateMaxWinners(e.currentTarget.value)}
        min="1"
        max="10"
        required
        disabled={loading}
      />
      <small>Number of winners to reward (1-10)</small>
    </div>

    <div class="form-group">
      <label for="platformFee">Platform Fee (%)</label>
      <input
        type="number"
        id="platformFee"
        bind:value={platformFeePercent}
        min="0"
        max="100"
        required
        disabled={loading}
      />
      <small>Platform fee percentage</small>
    </div>
  </div>

  <div class="distributions">
    <h3>Winner Rankings</h3>
    <div class="distributions-grid">
      {#each winnerDistributions as distribution (distribution.rank)}
        <div class="distribution-card">
          <div class="rank">#{distribution.rank}</div>
          <div class="description">{distribution.description}</div>
          <div class="percentage-input">
            <input
              type="number"
              bind:value={distribution.percentage}
              min="0"
              max="100"
              required
              disabled={loading}
            />
            <span class="percentage-symbol">%</span>
          </div>
        </div>
      {/each}
    </div>
    <small class="total">
      Total Distribution: {winnerDistributions.reduce((sum, d) => sum + Number(d.percentage), 0)}%
    </small>
  </div>

  <button type="submit" class="submit" disabled={loading}>
    {loading ? 'Updating...' : 'Update Distribution'}
  </button>
</form>



<style>
  .config-form {
    background-color: rgb(31 41 55);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
    margin: 0 0 1.5rem;
  }

  h3 {
    font-size: 1.1rem;
    font-weight: 500;
    color: white;
    margin: 1.5rem 0 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .distributions-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .distribution-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .rank {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-primary);
    margin-bottom: 0.5rem;
  }

  .description {
    color: rgb(156, 163, 175);
    font-size: 0.875rem;
    margin-bottom: 1rem;
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


    .config-form {
      background-color: rgb(31 41 55);
      border-radius: 1rem;
      padding: 1.5rem;
    }
  
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      color: white;
      margin: 0 0 1.5rem;
    }
  
    .alert {
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1.5rem;
    }
  
    .alert.error {
      background: rgba(239, 68, 68, 0.1);
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
  
    input {
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