<!-- src/routes/admin/+page.svelte -->
<script lang="ts">
  import { wallet } from '$lib/stores/wallet.js'
  import ConfigForm from '$lib/components/admin/ConfigForm.svelte'
  import RewardDistributionForm from '$lib/components/admin/RewardDistributionForm.svelte';
</script>

<div class="container">
  {#if !$wallet.address}
    <div class="unauthorized">
      <h1>Admin Panel</h1>
      <p>Please connect your wallet to access admin features.</p>
    </div>
  {:else if !$wallet.isAdmin}
    <div class="unauthorized">
      <h1>Unauthorized</h1>
      <p>Only the contract owner can access admin features.</p>
    </div>
  {:else}
    <div class="admin">
      <h1>Admin Panel</h1>
      <ConfigForm account={$wallet.address} />
      <RewardDistributionForm account={$wallet.address} />
    </div>
  {/if}
</div>

<style>
  .container {
    width: 100%;
    max-width: var(--max-width-game);
    margin: 0 auto;
    padding: var(--spacing-page);
  }

  .unauthorized {
    text-align: center;
    padding: 4rem 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 1rem;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .admin {
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

  p {
    color: rgb(156 163 175);
  }
</style>