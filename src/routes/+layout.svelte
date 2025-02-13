<!--route/+layout.svelte-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Header from '$lib/components/Header.svelte';
  import { createUIState } from '$lib/state/ui.svelte.js';
  import { createGameState } from '$lib/state/game.svelte.js';
  import { createWalletState } from '$lib/state/wallet.svelte.js';
  import { createValidationState } from '$lib/state/validation.svelte.js';
  import type { PageData } from './$types.js';
  import '../app.css';

  let { data, children } = $props<{ 
    data: PageData,
    children: any 
  }>();

  // Initialisation des états globaux
  const uiState = createUIState();
  const gameState = createGameState();
  const walletState = createWalletState();
  const validationState = createValidationState();

  // États dérivés avec Runes
  let toasts = $derived(uiState.toasts);
  let isAdmin = $derived(walletState.isAdmin);
  let isVerifier = $derived(walletState.isVerifier);

  // Passage des propriétés réactives aux enfants
  $effect(() => {
    if (children && typeof children === 'object') {
      children.props = {
        ...children.props,
        data: {
          ...data,
          isAdmin,
          isVerifier
        }
      };
    }
  });
</script>

<div class="app">
  <Header {isAdmin} {isVerifier} />
  
  <main class="main">
    {@render children()}
  </main>

  {#if browser && toasts.length > 0}
    <div class="toasts">
      {#each toasts as toast (toast.id)}
        <div class="toast" class:error={toast.type === 'error'}>
          {toast.message}
        </div>
      {/each}
    </div>
  {/if}

  <footer class="footer">
    <p>© 2024 Retro Gaming Platform</p>
  </footer>
</div>



  <style>
    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
  
    .main {
      flex: 1;
    }
  
    .footer {
      padding: 1rem;
      text-align: center;
      color: var(--color-text-secondary);
      background: var(--color-surface);
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
  
    .toasts {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      z-index: 100;
    }
  
    .toast {
      padding: 1rem;
      background: var(--color-primary);
      color: white;
      border-radius: 0.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease-out;
    }
  
    .toast.error {
      background: rgb(239 68 68);
    }
  
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  </style>