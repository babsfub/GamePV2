<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import Ad from '$lib/components/Ad.svelte';
  import OfflineIndicator from '$lib/components/offlineIndicator.svelte';
  import { createUIState } from '$lib/state/ui.svelte.js';
  import { createGameState } from '$lib/state/game.svelte.js';
  import { createWalletState } from '$lib/state/wallet.svelte.js';
  import { createValidationState } from '$lib/state/validation.svelte.js';
  import { 
    initPWA, 
    pwaInstallStore,
    connectivityStore, 
    showInstallPrompt,
    preloadGame
  } from '$lib/pwa/index.js';
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
  
  // États PWA
  let pwaDeferredPrompt = $state<any>(null);
  let isInstallable = $state(false);
  let isInstalled = $state(false);
  let isOnline = $state(true);

  // Passage des propriétés réactives aux enfants
  $effect(() => {
    if (children && typeof children === 'object') {
      children.props = {
        ...children.props,
        data: {
          ...data,
          isAdmin,
          isVerifier,
          // Passer les fonctionnalités PWA aux composants enfants
          pwa: {
            isOnline,
            isInstalled,
            preloadGame: (gameId: 'snake' | 'tetris' | 'minesweeper') => {
              if (browser) {
                preloadGame(gameId).then(() => {
                  uiState.success(`Jeu ${gameId} préchargé avec succès!`);
                });
              }
            }
          }
        }
      };
    }
  });
  
  // S'abonner aux stores PWA
  $effect(() => {
    const pwaInstall = pwaInstallStore.subscribe(state => {
      isInstallable = state.isInstallable;
      isInstalled = state.isInstalled;
      pwaDeferredPrompt = state.deferredPrompt;
    });

    const connectivity = connectivityStore.subscribe(state => {
      isOnline = state.isOnline;
      
      if (state.isOnline && state.wasOffline) {
        uiState.success('Vous êtes de nouveau en ligne!');
      } else if (!state.isOnline) {
        uiState.warning('Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.');
      }
    });
    
    return () => {
      pwaInstall();
      connectivity();
    };
  });
  
  onMount(() => {
    if (!browser) return;
    
    // Initialiser les fonctionnalités PWA
    initPWA();
  });
  
  // Fonction pour installer l'application
  async function installApp() {
    if (!isInstallable) return;
    
    const choice = await showInstallPrompt();
    
    if (choice && choice.outcome === 'accepted') {
      uiState.success("Merci d'avoir installé notre application!");
    }
  }
</script>

<svelte:head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#4ade80">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png">
  
  <!-- Splash Screens pour iOS -->
  <link rel="apple-touch-startup-image" href="/splashscreens/iphone5_splash.png" 
        media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)">
  <link rel="apple-touch-startup-image" href="/splashscreens/iphone6_splash.png" 
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)">
  <link rel="apple-touch-startup-image" href="/splashscreens/iphoneplus_splash.png" 
        media="(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3)">
  <link rel="apple-touch-startup-image" href="/splashscreens/iphonex_splash.png" 
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)">
  <link rel="apple-touch-startup-image" href="/splashscreens/iphonexr_splash.png" 
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)">
  <link rel="apple-touch-startup-image" href="/splashscreens/iphonexsmax_splash.png" 
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)">
  <link rel="apple-touch-startup-image" href="/splashscreens/ipad_splash.png" 
        media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)">
</svelte:head>

<div class="app">
  <Header {isAdmin} {isVerifier} />
  
  <!-- Bannière d'installation PWA -->
  {#if browser && isInstallable && !isInstalled}
    <div class="install-banner">
      <p>Installez notre application pour une meilleure expérience !</p>
      <div class="install-buttons">
        <button class="install-button" onclick={installApp}>
          Installer
        </button>
        <button class="close-button" onclick={() => pwaInstallStore.update(s => ({...s, isInstallable: false}))}>
          ✕
        </button>
      </div>
    </div>
  {/if}
  
  <!-- Indicateur hors ligne -->
  <OfflineIndicator showWhenOnline={true} />
  
  <main class="main">
    {@render children()}
  </main>

  {#if browser && toasts.length > 0}
    <div class="toasts">
      {#each toasts as toast (toast.id)}
        <div class="toast" class:error={toast.type === 'error'} 
             class:warning={toast.type === 'warning'} 
             class:success={toast.type === 'success'}>
          {toast.message}
        </div>
      {/each}
    </div>
  {/if}


  <Footer />
<Ad />
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .main {
    flex: 1;
    /* Ajout du padding pour éviter que le contenu soit sous les barres de navigation mobiles */
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .footer {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    background: var(--color-surface);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: env(safe-area-inset-bottom, 1rem);
  }

  .toasts {
    position: fixed;
    bottom: env(safe-area-inset-bottom, 1rem);
    right: env(safe-area-inset-right, 1rem);
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
    max-width: 90vw;
  }

  .toast.error {
    background: rgb(239 68 68);
  }
  
  .toast.warning {
    background: rgb(245, 158, 11);
  }
  
  .toast.success {
    background: rgb(34, 197, 94);
  }

  /* Styles PWA */
  .install-banner {
    position: fixed;
    top: env(safe-area-inset-top, 0);
    left: 0;
    right: 0;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  }
  
  .install-buttons {
    display: flex;
    gap: 0.5rem;
  }
  
  .install-button {
    background: white;
    color: var(--color-primary);
    border: none;
    border-radius: 0.25rem;
    padding: 0.5rem 1rem;
    font-weight: 600;
    cursor: pointer;
  }
  
  .close-button {
    background: transparent;
    border: none;
    color: white;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
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
  
  /* Médias requêtes pour les appareils mobiles */
  @media (max-width: 768px) {
    .toast {
      font-size: 0.875rem;
      padding: 0.75rem;
    }
    
    .install-banner {
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem;
    }
    
    .install-buttons {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
