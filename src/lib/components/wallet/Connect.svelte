<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getWalletClient, publicClient, contractEvents } from '$lib/config/contract.js'
  import { wallet } from '$lib/stores/wallet.js'
  import { CONTRACT_CONFIG, RETRO_GAMING_ADDRESS } from '$lib/config/index.js'
  import { parseEther, formatEther } from 'viem'

  // État local pour les withdrawals
  let isWithdrawing = false;

  // Connexion
  async function handleConnect() {
    try {
      await wallet.connect();
    } catch (error) {
      console.error('Connection error:', error);
    }
  }

  // Retrait des gains
  async function handleWithdraw() {
    if (!$wallet.address || $wallet.pendingWithdrawals === 0n) return;
    
    try {
      isWithdrawing = true;
      await wallet.withdraw();
    } catch (error) {
      console.error('Withdrawal error:', error);
    } finally {
      isWithdrawing = false;
    }
  }


  async function handleDisconnect() {
    await wallet.disconnect();
  }

  // Cleanup à la destruction du composant
  onDestroy(() => {
    if ($wallet.address) {
      wallet.disconnect();
    }
  });
</script>

<div class="wallet-connect">
  {#if $wallet.error}
    <p class="error">{$wallet.error}</p>
  {/if}

  {#if $wallet.address}
    <div class="connected">
      <span class="address">
        {$wallet.address.slice(0, 6)}...{$wallet.address.slice(-4)}
      </span>
      
      {#if $wallet.pendingWithdrawals > 0n}
        <button 
          class="withdraw" 
          on:click={handleWithdraw}
          disabled={isWithdrawing}
        >
          {isWithdrawing ? 'Withdrawing...' : `Withdraw ${formatEther($wallet.pendingWithdrawals)} ETH`}
        </button>
      {/if}

      {#if $wallet.isAdmin}
        <span class="badge admin">Admin</span>
      {/if}
      
      {#if $wallet.isVerifier}
        <span class="badge verifier">Verifier</span>
      {/if}

      <button 
        class="disconnect" 
        on:click={handleDisconnect}
      >
        Disconnect
      </button>
    </div>
  {:else}
    <button 
      class="connect"
      on:click={handleConnect}
      disabled={$wallet.isConnecting}
    >
      {$wallet.isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  {/if}
</div>



<style>
  .wallet-connect {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .connected {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #1a1a1a;
    border-radius: 9999px;
  }

  .address {
    font-family: monospace;
    font-size: 0.9rem;
    color: #e5e7eb;
  }

  .badge {
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .badge.admin {
    background: #dc2626;
    color: white;
  }

  .badge.verifier {
    background: #2563eb;
    color: white;
  }

  button {
    cursor: pointer;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 9999px;
    font-weight: 600;
    transition: all 0.2s;
  }

  button.connect {
    background: #4f46e5;
    color: white;
  }

  button.disconnect {
    background: #374151;
    color: white;
  }

  button.withdraw {
    background: #047857;
    color: white;
  }

  button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error {
    color: #dc2626;
    font-size: 0.875rem;
  }
</style>