<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import ConfigForm from '$lib/components/admin/ConfigForm.svelte'
  import RewardDistributionForm from '$lib/components/admin/RewardDistributionForm.svelte';
  import ValidateScoreLarge from '$lib/components/admin/validateScoreLarge.svelte';
  import type { GameId } from '$lib/types.js';

  const walletState = getWalletState();

  // États locaux
  let selectedGame = $state<GameId>('tetris');
  
  // Liste des jeux disponibles
  const games: GameId[] = ['snake', 'tetris'];

  // États dérivés
  let isVerifier = $derived(walletState.isVerifier);
  let isAdmin = $derived(walletState.isAdmin);
  let isConnected = $derived(!!walletState.address);
</script>

<div class="container">
  {#if !isConnected}
    <div class="unauthorized">
      <h1>Admin Panel</h1>
      <p>Please connect your wallet to access admin features.</p>
    </div>
  {:else if !isAdmin && !isVerifier}
    <div class="unauthorized">
      <h1>Unauthorized</h1>
      <p>You need admin or verifier privileges to access these features.</p>
    </div>
  {:else}
    <div class="sections-container">
      <!-- Section Admin -->
      {#if isAdmin}
        <div class="section admin-section">
          <h1>Admin Panel</h1>
          {#if walletState.address}
            <ConfigForm account={walletState.address} />
          
            <RewardDistributionForm account={walletState.address} />
          {/if}
        </div>
      {/if}

      <!-- Section Vérificateur -->
      {#if isVerifier}
        <div class="section verifier-section">
          <h2>Game Verification Panel</h2>
          
          <div class="game-selector">
            <h3>Select Game to Verify</h3>
            <div class="game-buttons">
              {#each games as game}
                <button
                  class="game-button"
                  class:active={selectedGame === game}
                  onclick={() => selectedGame = game}
                >
                  {game.charAt(0).toUpperCase() + game.slice(1)}
                </button>
              {/each}
            </div>
          </div>

          <div class="validation-panel">
            <ValidateScoreLarge {selectedGame} />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>


<style>
  .container {
    width: 100%;
    max-width: var(--max-width-game);
    margin: 0 auto;
    padding: 2rem;
  }

  .sections-container {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .section {
    width: 100%;
  }

  .unauthorized {
    text-align: center;
    padding: 4rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 1rem;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .admin-section, .verifier-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  h1 {
    font-size: 2.25rem;
    font-weight: 600;
    color: white;
    margin-bottom: 2rem;
  }

  h2 {
    font-size: 1.875rem;
    font-weight: 600;
    color: white;
    margin-bottom: 1.5rem;
  }

  h3 {
    font-size: 1.25rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 1rem;
  }

  p {
    color: rgb(156 163 175);
  }

  .game-selector {
    background: var(--color-surface);
    padding: 1.5rem;
    border-radius: 1rem;
    margin-bottom: 2rem;
  }

  .game-buttons {
    display: flex;
    gap: 1rem;
  }

  .game-button {
    padding: 0.75rem 1.5rem;
    background: var(--color-surface-alt);
    border: none;
    border-radius: 0.5rem;
    color: var(--color-text);
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .game-button:hover {
    background: rgba(var(--color-primary-rgb), 0.1);
  }

  .game-button.active {
    background: var(--color-primary);
    color: white;
  }

  .validation-panel {
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .container {
      padding: 1rem;
    }

    .game-buttons {
      flex-direction: column;
    }

    .game-button {
      width: 100%;
    }
  }
</style>