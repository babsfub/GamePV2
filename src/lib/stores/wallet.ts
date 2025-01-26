// src/lib/stores/wallet.ts
import { writable, get } from 'svelte/store';
import { publicClient, contractEvents, getWalletClient } from '$lib/config/contract.js';
import { RETRO_GAMING_ADDRESS } from '$lib/config/index.js';
import { retroGamingABI } from '$lib/contracts/abi.js';
import type { Address, WatchContractEventReturnType } from 'viem';

interface WalletState {
  address: Address | null;
  isConnecting: boolean;
  isAdmin: boolean;
  isVerifier: boolean;
  pendingWithdrawals: bigint;
  error: string | null;
}

const initialState: WalletState = {
  address: null,
  isConnecting: false,
  isAdmin: false,
  isVerifier: false,
  pendingWithdrawals: 0n,
  error: null
};

function createWalletStore() {
  const { subscribe, set, update } = writable<WalletState>(initialState);
  
  let unwatchFunctions: (() => void)[] = [];

  function setupEventListeners(address: Address) {
    cleanupEventListeners();

    const verifierUnwatch = contractEvents.watchVerifierStatus(
      address,
      (status) => {
        update(state => ({ ...state, isVerifier: status }));
      }
    );

    const ownerUnwatch = contractEvents.watchOwnershipChange(
      address,
      (isOwner) => {
        update(state => ({ ...state, isAdmin: isOwner }));
      }
    );
    const rewardUnwatch = contractEvents.watchRewardDistributionUpdate(
      async () => {
        await updatePendingWithdrawals();
      }
    );

    unwatchFunctions = [verifierUnwatch, ownerUnwatch, rewardUnwatch];
  }

  function cleanupEventListeners() {
    unwatchFunctions.forEach(unwatch => unwatch());
    unwatchFunctions = [];
  }

  async function updatePendingWithdrawals() {
    const state = get({ subscribe });
    if (!state.address) return;

    try {
      const pendingWithdrawals = await publicClient.readContract({
        address: RETRO_GAMING_ADDRESS,
        abi: retroGamingABI,
        functionName: 'getPendingWithdrawals',
        args: [state.address]
      });

      update(s => ({ ...s, pendingWithdrawals: pendingWithdrawals as bigint }));
    } catch (error) {
      console.error('Error updating pending withdrawals:', error);
    }
  }

  return {
    subscribe,

    async connect() {
      if (!window.ethereum) {
        update(state => ({ ...state, error: 'No wallet detected!' }));
        return;
      }

      update(state => ({ ...state, isConnecting: true, error: null }));

      try {
        const walletClient = await getWalletClient();
        const [address] = await walletClient.requestAddresses();

        const [isAdmin, isVerifier, pendingWithdrawals] = await Promise.all([
          publicClient.readContract({
            address: RETRO_GAMING_ADDRESS,
            abi: retroGamingABI,
            functionName: 'owner'
          }).then(owner => owner === address),
          
          publicClient.readContract({
            address: RETRO_GAMING_ADDRESS,
            abi: retroGamingABI,
            functionName: 'isVerifier',
            args: [address]
          }),

          publicClient.readContract({
            address: RETRO_GAMING_ADDRESS,
            abi: retroGamingABI,
            functionName: 'getPendingWithdrawals',
            args: [address]
          })
        ]);

        update(state => ({
          ...state,
          address,
          isAdmin,
          isVerifier,
          pendingWithdrawals: pendingWithdrawals as bigint,
          isConnecting: false,
          error: null
        }));

        setupEventListeners(address);

        window.ethereum.on('accountsChanged', this.handleAccountsChanged);

      } catch (error) {
        console.error('Connection error:', error);
        update(state => ({
          ...state,
          isConnecting: false,
          error: error instanceof Error ? error.message : 'Failed to connect wallet'
        }));
      }
    },

    handleAccountsChanged(accounts: string[]) {
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.connect();
      }
    },

    async disconnect() {
      cleanupEventListeners();

      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
      }

      set(initialState);
    },

    async withdraw() {
      const state = get({ subscribe });
      if (!state.address || state.pendingWithdrawals === 0n) return;

      try {
        const walletClient = await getWalletClient();
        
        const hash = await walletClient.writeContract({
          address: RETRO_GAMING_ADDRESS,
          abi: retroGamingABI,
          functionName: 'withdraw',
          account: state.address
        });

        await publicClient.waitForTransactionReceipt({ hash });
        await updatePendingWithdrawals();

      } catch (error) {
        console.error('Withdrawal error:', error);
        update(s => ({
          ...s,
          error: error instanceof Error ? error.message : 'Failed to withdraw'
        }));
      }
    },

    updatePendingWithdrawals,
  };
}

export const wallet = createWalletStore();