import { browser } from '$app/environment';
import { registerServiceWorker, preloadGame, forceUpdateCaches } from './registerSW.js';
import { initInstallDetection, showInstallPrompt, pwaInstallStore } from './install.js';
import { initConnectivityDetection, connectivityStore, checkServerConnectivity } from './offline.js';

/**
 * Initialise toutes les fonctionnalités PWA
 */
export function initPWA(options = {}) {
  if (!browser) return;
  
  // Enregistrer le service worker
  registerServiceWorker({
    onUpdate: (registration) => {
      console.log('New version available');
      // Vous pouvez déclencher une notification ici
    },
    onMessage: (event) => {
      console.log('Message from Service Worker:', event.data);
      // Gérer les messages du service worker ici
    }
  });
  
  // Initialiser la détection d'installation
  initInstallDetection();
  
  // Initialiser la détection de connectivité
  initConnectivityDetection();
}

export {
  // Service Worker
  registerServiceWorker,
  preloadGame,
  forceUpdateCaches,
  
  // Installation
  showInstallPrompt,
  pwaInstallStore,
  
  // Connectivité
  connectivityStore,
  checkServerConnectivity
};