// lib/state/wallet.ts
import { setContext, getContext } from 'svelte';
import type { Address } from 'viem';

const WALLET_STATE_KEY = Symbol('wallet-state');

export class WalletState {
  // États principaux
  address = $state<Address | null>(null);
  isConnecting = $state(false);
  isAdmin = $state(false);
  isVerifier = $state(false);
  pendingWithdrawals = $state<bigint>(0n);

  // États dérivés
  isConnected = $derived(!!this.address);
  formattedAddress = $derived(
    this.address ? `${this.address.slice(0, 6)}...${this.address.slice(-4)}` : ''
  );

  // Méthodes de mise à jour
  setAddress(newAddress: Address | null) {
    this.address = newAddress;
  }

  setRoles(admin: boolean, verifier: boolean) {
    this.isAdmin = admin;
    this.isVerifier = verifier;
  }

  setPendingWithdrawals(amount: bigint) {
    this.pendingWithdrawals = amount;
  }

  connect(address: Address, admin: boolean, verifier: boolean, withdrawals: bigint) {
    this.address = address;
    this.isAdmin = admin;
    this.isVerifier = verifier;
    this.pendingWithdrawals = withdrawals;
    this.isConnecting = false;
  }

  disconnect() {
    this.address = null;
    this.isAdmin = false;
    this.isVerifier = false;
    this.pendingWithdrawals = 0n;
    this.isConnecting = false;
  }
}

// Fonctions helper pour le contexte
export function createWalletState() {
  const state = new WalletState();
  setContext(WALLET_STATE_KEY, state);
  return state;
}

export function getWalletState(): WalletState {
  const state = getContext<WalletState>(WALLET_STATE_KEY);
  if (!state) throw new Error('WalletState not found in context');
  return state;
}