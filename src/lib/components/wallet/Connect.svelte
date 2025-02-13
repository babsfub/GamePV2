<!-- lib/components/Connect.svelte -->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getWalletClient, publicClient, RETRO_GAMING_ADDRESS } from '$lib/config/contract.js';
  import { retroGamingABI } from '$lib/contracts/abi.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { getWalletState } from '$lib/state/wallet.svelte.js';
  import { formatEther } from 'viem';

  const uiState = getUIState();
  const walletState = getWalletState();

  async function connect() {
    if (!window.ethereum) {
      uiState.error('No wallet detected!');
      return;
    }

    try {
      walletState.isConnecting = true;

      const walletClient = await getWalletClient();
      const [newAddress] = await walletClient.requestAddresses();

      if (!newAddress) {
        throw new Error('No address returned');
      }

      const [ownerAddress, verifierStatus, withdrawals] = await Promise.all([
        publicClient.readContract({
          address: RETRO_GAMING_ADDRESS,
          abi: retroGamingABI,
          functionName: 'owner'
        }),
        publicClient.readContract({
          address: RETRO_GAMING_ADDRESS,
          abi: retroGamingABI,
          functionName: 'isVerifier',
          args: [newAddress]
        }),
        publicClient.readContract({
          address: RETRO_GAMING_ADDRESS,
          abi: retroGamingABI,
          functionName: 'getPendingWithdrawals',
          args: [newAddress]
        })
      ]);

      walletState.connect(
        newAddress,
        ownerAddress === newAddress,
        verifierStatus as boolean,
        withdrawals as bigint
      );

      // Setup ethereum events
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('disconnect', disconnect);

      uiState.success('Successfully connected wallet');

    } catch (err) {
      console.error('Connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      uiState.error(errorMessage);
    } finally {
      walletState.isConnecting = false;
    }
  }

  function handleAccountsChanged(accounts: string[]) {
    if (accounts.length === 0) {
      disconnect();
    } else if (accounts[0]?.toLowerCase() !== walletState.address?.toLowerCase()) {
      connect();
    }
  }

  function disconnect() {
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('disconnect', disconnect);
    }
    walletState.disconnect();
  }

  async function withdraw() {
    if (!walletState.address || walletState.pendingWithdrawals === 0n) return;

    try {
      const walletClient = await getWalletClient();
      
      const hash = await walletClient.writeContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'withdraw',
        account: walletState.address
      });

      await publicClient.waitForTransactionReceipt({ hash });
      
      walletState.setPendingWithdrawals(0n);
      uiState.success('Successfully withdrew funds');

    } catch (err) {
      console.error('Withdrawal error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw';
      uiState.error(errorMessage);
    }
  }

  // Cleanup on unmount
  onDestroy(() => {
    if (walletState.isConnected) {
      disconnect();
    }
  });
</script>

<div class="wallet-connect">
  {#if walletState.isConnected}
    <div class="connected">
      <span class="address">
        {walletState.formattedAddress}
      </span>
      
      {#if walletState.pendingWithdrawals > 0n}
        <button class="withdraw" on:click={withdraw}>
          Withdraw {formatEther(walletState.pendingWithdrawals)} ETH
        </button>
      {/if}

      {#if walletState.isAdmin}
        <span class="badge admin">Admin</span>
      {/if}
      
      {#if walletState.isVerifier}
        <span class="badge verifier">Verifier</span>
      {/if}

      <button class="disconnect" on:click={disconnect}>
        Disconnect
      </button>
    </div>
  {:else}
    <button 
      class="connect"
      on:click={connect}
      disabled={walletState.isConnecting}
    >
      {walletState.isConnecting ? 'Connecting...' : 'Connect Wallet'}
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

  
</style>