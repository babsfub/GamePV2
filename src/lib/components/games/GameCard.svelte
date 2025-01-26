<!-- src/lib/components/games/GameCard.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { wallet } from '$lib/stores/wallet.js'
  import { contractActions } from '$lib/contracts/actions.js'
  import type { GameConfig } from '$lib/contracts/types.js'

  let { game } = $props<{ game: GameConfig }>()
  
  let submitting = $state(false)
  let error = $state<string | null>(null)

  async function handlePlay() {
    if (!$wallet.address) {
      error = 'Please connect your wallet first'
      return
    }

    try {
      submitting = true
      error = null
      
      const tx = await contractActions.write.submitScore({
        account: $wallet.address,
        game: game.id,
        value: game.minStake,
        score: BigInt(0), 
        hash: '0x0' 
      })

      goto(game.path)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to submit stake'
      console.error('Error submitting stake:', err)
    } finally {
      submitting = false
    }
  }
</script>

<div class="card">
  <div class="image">
    {#if game.imageUrl}
      <img src={game.imageUrl} alt={game.title} />
    {:else}
      <div class="placeholder">
        {game.title[0]}
      </div>
    {/if}
  </div>

  <div class="content">
    <h3>{game.title}</h3>
    <p>{game.description}</p>

    <div class="details">
      <div class="detail">
        <span class="label">Entry</span>
        <span class="value">{game.minStake} ETH</span>
      </div>
      <div class="detail">
        <span class="label">High Score</span>
        <span class="value">{game.maxScore}</span>
      </div>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button 
      class="play-button"
      onclick={handlePlay}
      disabled={submitting || !$wallet.address}
    >
      {#if submitting}
        Submitting...
      {:else if !$wallet.address}
        Connect Wallet to Play
      {:else}
        Play Now
      {/if}
    </button>
  </div>
</div>

<style>
  .card {
    background: rgb(31 41 55);
    border-radius: 1rem;
    overflow: hidden;
    transition: transform 0.2s;
  }

  .card:hover {
    transform: translateY(-4px);
  }

  .image {
    aspect-ratio: 16/9;
    background: rgb(17 24 39);
    width: 100%;
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    font-size: 3rem;
    font-weight: bold;
    color: rgb(75 85 99);
  }

  .content {
    padding: 1.5rem;
  }

  h3 {
    margin: 0;
    color: white;
    font-size: 1.25rem;
  }

  p {
    margin: 0.5rem 0 1rem;
    color: rgb(156 163 175);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .details {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 0.5rem;
  }

  .detail {
    flex: 1;
  }

  .label {
    display: block;
    font-size: 0.75rem;
    color: rgb(156 163 175);
    margin-bottom: 0.25rem;
  }

  .value {
    font-weight: 600;
    color: white;
  }

  .error {
    color: rgb(239 68 68);
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 0.5rem;
    margin: 0 0 1rem;
  }

  .play-button {
    width: 100%;
    padding: 0.75rem;
    border: none;
    border-radius: 0.5rem;
    background: rgb(79 70 229);
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .play-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .play-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>