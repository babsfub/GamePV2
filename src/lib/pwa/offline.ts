import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Store pour l'état de la connexion
export const connectivityStore = writable({
  isOnline: true,
  wasOffline: false, 
  lastOnlineTime: Date.now()
});

/**
 * Initialise la détection de l'état en ligne/hors ligne
 */
export function initConnectivityDetection() {
  if (!browser) return;
  
  // Définir l'état initial
  connectivityStore.update(state => ({
    ...state,
    isOnline: navigator.onLine
  }));
  
  // Écouter les changements d'état
  window.addEventListener('online', () => {
    connectivityStore.update(state => ({
      isOnline: true,
      wasOffline: !state.isOnline, 
      lastOnlineTime: Date.now()
    }));
  });
  
  window.addEventListener('offline', () => {
    connectivityStore.update(state => ({
      ...state,
      isOnline: false
    }));
  });
}

/**
 * Vérifie si la connexion au serveur est réellement active
 * (parfois navigator.onLine renvoie true même si le serveur n'est pas accessible)
 */
export async function checkServerConnectivity(endpoint = '/api/health'): Promise<boolean> {
  if (!browser) return true;
  
  try {
    const response = await fetch(endpoint, {
      method: 'HEAD',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}