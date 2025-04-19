import { browser } from '$app/environment';

export interface ServiceWorkerOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onMessage?: (event: MessageEvent) => void;
}

/**
 * Enregistre le service worker et gère son cycle de vie
 */
export function registerServiceWorker(options: ServiceWorkerOptions = {}) {
  if (!browser || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = '/service-worker.js';

    navigator.serviceWorker
      .register(swUrl)
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);

        // Vérifier les mises à jour
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
                
                if (options.onUpdate) {
                  options.onUpdate(registration);
                }
              } else {
                
                console.log('Content is cached for offline use.');
                
                if (options.onSuccess) {
                  options.onSuccess(registration);
                }
              }
            }
          };
        };
      })
      .catch(error => {
        console.error('Error during service worker registration:', error);
      });
      
    // Écouter les messages du service worker
    if (options.onMessage) {
      navigator.serviceWorker.addEventListener('message', options.onMessage);
    }
  });
}

/**
 * Envoie un message au service worker actif
 */
export function sendMessageToSW(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!browser || !navigator.serviceWorker || !navigator.serviceWorker.controller) {
      reject(new Error('No active service worker'));
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Demande au service worker de précharger les assets d'un jeu
 */
export function preloadGame(gameId: 'snake' | 'tetris' | 'minesweeper'): Promise<void> {
  return sendMessageToSW({
    type: 'PRELOAD_GAME',
    gameId
  }).catch(err => {
    console.error('Failed to preload game:', err);
  });
}

/**
 * Demande au service worker de mettre à jour tous ses caches
 */
export function forceUpdateCaches(): Promise<void> {
  return sendMessageToSW({
    type: 'FORCE_UPDATE'
  }).catch(err => {
    console.error('Failed to update caches:', err);
  });
}