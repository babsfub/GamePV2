import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Store pour l'état d'installation
export const pwaInstallStore = writable({
  isInstallable: false,
  isInstalled: false,
  deferredPrompt: null as any
});

/**
 * Initialise la détection de l'installation
 */
export function initInstallDetection() {
  if (!browser) return;

  // Détecter si l'app est déjà installée (en mode standalone ou app)
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                            (window.navigator as any).standalone || 
                            document.referrer.includes('android-app://');

  pwaInstallStore.update(state => ({
    ...state,
    isInstalled: isInStandaloneMode
  }));

  // Capturer l'événement beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    // Empêcher Chrome 67+ d'afficher automatiquement l'invite
    e.preventDefault();
    
    pwaInstallStore.update(state => ({
      ...state,
      isInstallable: true,
      deferredPrompt: e
    }));
  });

  // Détecter quand l'app est installée
  window.addEventListener('appinstalled', () => {
    pwaInstallStore.update(state => ({
      ...state,
      isInstalled: true,
      isInstallable: false,
      deferredPrompt: null
    }));
    
    console.log('PWA was installed');
  });
}

/**
 * Affiche l'invite d'installation native
 */
export async function showInstallPrompt(): Promise<{outcome: string} | null> {
  let result = null;
  
  pwaInstallStore.update(state => {
    if (state.deferredPrompt) {
      state.deferredPrompt.prompt();
      
      // Attendre la décision de l'utilisateur
      result = state.deferredPrompt.userChoice;
    }
    
    return {
      ...state,
      deferredPrompt: null
    };
  });
  
  return result;
}