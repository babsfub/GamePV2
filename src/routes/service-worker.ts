/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Version du service worker - à incrémenter à chaque déploiement majeur
const SW_VERSION = '1.0.0';

// Structure des caches
const CORE_CACHE = `game-pv-core-v${SW_VERSION}`;
const GAME_CACHE = `game-pv-games-v${SW_VERSION}`;
const ASSETS_CACHE = `game-pv-assets-v${SW_VERSION}`;
const FONT_CACHE = `game-pv-fonts-v${SW_VERSION}`;
const API_CACHE = `game-pv-api-v${SW_VERSION}`;

// Définir un type pour les IDs de jeu valides
type GameId = 'snake' | 'tetris' | 'minesweeper';

// Assets essentiels
const CORE_ASSETS = [
  '/',
  '/index.html', 
  '/app.css',
  '/manifest.json',
  '/offline.html',
  '/build/bundle.js',
  '/build/bundle.css'
];

// Organisation des assets par jeu (avec type explicite)
const GAME_ASSETS: Record<GameId, string[]> = {
  'snake': [
    '/lib/games/snake/pkg/snake_engine.js',
    '/lib/games/snake/pkg/snake_engine_bg.wasm',
    '/images/games/snake/banner.png'
  ],
  'tetris': [
    '/lib/games/tetris/pkg/tetris_engine.js',
    '/lib/games/tetris/pkg/tetris_engine_bg.wasm',
    '/images/games/tetris/banner.png'
  ],
  'minesweeper': [
    '/lib/games/minesweeper/minesweeper.js',
    '/lib/games/minesweeper/minesweeper_bg.wasm',
    '/images/games/minesweeper/banner.png'
  ]
};

// Polices pour le design rétro
const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&family=Roboto+Mono:wght@400;600&display=swap'
];

// Icônes et images communes
const VISUAL_ASSETS = [
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png',
  '/images/logo.png',
  '/images/background.png',
  '/splashscreens/iphone5_splash.png',
  '/splashscreens/iphone6_splash.png',
  '/splashscreens/iphoneplus_splash.png',
  '/splashscreens/iphonex_splash.png',
  '/splashscreens/iphonexr_splash.png',
  '/splashscreens/iphonexsmax_splash.png',
  '/splashscreens/ipad_splash.png'
];

// Installation - Mise en cache initiale
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[Service Worker] Installing version', SW_VERSION);
  
  event.waitUntil(
    (async () => {
      // Cache des assets essentiels
      const coreCache = await caches.open(CORE_CACHE);
      await coreCache.addAll(CORE_ASSETS);
      
      // Cache des polices
      const fontCache = await caches.open(FONT_CACHE);
      await fontCache.addAll(FONT_ASSETS);
      
      // Cache des assets visuels
      const assetsCache = await caches.open(ASSETS_CACHE);
      await assetsCache.addAll(VISUAL_ASSETS);
      
      // Pré-cache des jeux principaux
      const gameCache = await caches.open(GAME_CACHE);
      // Mettre en cache Snake et Tetris par défaut pour un accès rapide
      await Promise.all([
        gameCache.addAll(GAME_ASSETS['snake']),
        gameCache.addAll(GAME_ASSETS['tetris'])
      ]);
    })()
  );
  
  // Activation immédiate
  self.skipWaiting();
});

// Activation - Nettoyage et prise de contrôle
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[Service Worker] Activating version', SW_VERSION);
  
  event.waitUntil(
    (async () => {
      // Supprimer les anciennes versions de cache
      const cacheNames = await caches.keys();
      const obsoleteCaches = cacheNames.filter(cacheName => 
        cacheName.startsWith('game-pv-') && 
        ![CORE_CACHE, GAME_CACHE, ASSETS_CACHE, FONT_CACHE, API_CACHE].includes(cacheName)
      );
      
      await Promise.all(obsoleteCaches.map(cacheName => caches.delete(cacheName)));
      
      // Limiter la taille du cache des jeux si nécessaire
      const gameCache = await caches.open(GAME_CACHE);
      const entries = await gameCache.keys();
      
      if (entries.length > 300) { // Valeur arbitraire, à ajuster
        console.log('[SW] Nettoyage du cache des jeux...');
        const entriesToDelete = entries.slice(0, 100);
        await Promise.all(entriesToDelete.map(entry => gameCache.delete(entry)));
      }
    })()
  );
  
  // Prendre le contrôle immédiatement
  self.clients.claim();
  
  // Informer les clients d'une mise à jour
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SW_UPDATE',
        message: 'Application mise à jour vers la version ' + SW_VERSION
      });
    });
  });
});

// Gestion des requêtes réseau
self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  // Ne pas intercepter les requêtes externes (sauf Google Fonts)
  if (!url.origin.includes(self.location.origin) && 
      !url.origin.includes('fonts.googleapis.com')) {
    return;
  }
  
  // Stratégie spéciale pour les fichiers WASM
  if (url.pathname.endsWith('.wasm')) {
    event.respondWith(handleWasmRequest(event.request));
    return;
  }
  
  // Stratégie pour les assets de jeu
  if (isGameAsset(url.pathname)) {
    event.respondWith(handleGameAsset(event.request));
    return;
  }
  
  // Stratégie pour les API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Stratégie pour les polices
  if (url.pathname.includes('/fonts/') || 
      url.origin.includes('fonts.googleapis.com')) {
    event.respondWith(handleFontRequest(event.request));
    return;
  }
  
  // Stratégie spéciale pour les fichiers SvelteKit
  if (url.pathname.includes('/_app/') || 
      url.pathname.includes('/build/') || 
      url.pathname.includes('/_svelte/')) {
    event.respondWith(handleSvelteKitAsset(event.request));
    return;
  }
  
  // Requêtes de navigation (pages HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }
  
  // Stratégie par défaut pour les autres ressources
  event.respondWith(handleDefaultRequest(event.request));
});

// Gestion des messages du client
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (!event.data) return;
  
  // Préchargement des assets d'un jeu spécifique
  if (event.data.type === 'PRELOAD_GAME') {
    // Vérifier et typer explicitement gameId
    const gameId = event.data.gameId as GameId;
    
    if (gameId && gameId in GAME_ASSETS) {
      console.log(`[SW] Préchargement de ${gameId}...`);
      
      // Répondre au client si un port de message est disponible
      const messagePort = event.ports && event.ports[0];
      
      caches.open(GAME_CACHE).then(cache => {
        return cache.addAll(GAME_ASSETS[gameId]);
      }).then(() => {
        // Informer tous les clients que le préchargement est terminé
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PRELOAD_COMPLETE',
              gameId: gameId
            });
          });
        });
        
        // Répondre au client spécifique si disponible
        if (messagePort) {
          messagePort.postMessage({
            success: true,
            gameId: gameId
          });
        }
      }).catch(error => {
        console.error(`[SW] Erreur de préchargement pour ${gameId}:`, error);
        
        if (messagePort) {
          messagePort.postMessage({
            success: false,
            error: error.message
          });
        }
      });
    }
  }
  
  // Mise à jour forcée du cache
  if (event.data.type === 'FORCE_UPDATE') {
    console.log('[SW] Mise à jour forcée des caches...');
    
    // Répondre au client si un port de message est disponible
    const messagePort = event.ports && event.ports[0];
    
    updateAllCaches().then(() => {
      if (messagePort) {
        messagePort.postMessage({
          success: true,
          message: 'Tous les caches ont été mis à jour'
        });
      }
    }).catch(error => {
      console.error('[SW] Erreur lors de la mise à jour des caches:', error);
      
      if (messagePort) {
        messagePort.postMessage({
          success: false,
          error: error.message
        });
      }
    });
  }
});

// Gestionnaires spécifiques par type de contenu

// Gestion des assets SvelteKit
async function handleSvelteKitAsset(request: Request): Promise<Response> {
  const cache = await caches.open(CORE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Échec de récupération de SvelteKit asset:', error);
    return new Response('Impossible de charger la ressource', { status: 500 });
  }
}

// Gestion optimisée des fichiers WASM
async function handleWasmRequest(request: Request): Promise<Response> {
  const cache = await caches.open(GAME_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch spécifique pour WASM avec Content-Type adapté
    const networkResponse = await fetch(request.clone(), {
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/wasm'
      }
    });
    
    if (networkResponse.ok) {
      // Créer une nouvelle réponse avec type MIME correct
      const clonedResponse = networkResponse.clone();
      const responseToCache = new Response(
        await clonedResponse.blob(), 
        {
          status: clonedResponse.status,
          statusText: clonedResponse.statusText,
          headers: new Headers(clonedResponse.headers)
        }
      );
      // S'assurer que le type MIME est correct
      responseToCache.headers.set('Content-Type', 'application/wasm');
      
      cache.put(request, responseToCache.clone());
      return responseToCache;
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Erreur lors du chargement WASM:', error);
    return new Response('Impossible de charger le module WASM', { status: 500 });
  }
}

// Gestion des assets de jeu
async function handleGameAsset(request: Request): Promise<Response> {
  const cache = await caches.open(GAME_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Stratégie cache-first avec rafraîchissement en arrière-plan
    fetch(request.clone())
      .then(networkResponse => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse);
        }
      })
      .catch(() => console.log('[SW] Réseau indisponible, utilisation du cache'));
    
    return cachedResponse;
  }
  
  try {
    // Si pas en cache, récupérer du réseau
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Échec de récupération:', error);
    return new Response('Ressource indisponible hors ligne', { status: 404 });
  }
}

// Gestion des requêtes API
async function handleApiRequest(request: Request): Promise<Response> {
  // Pour les API, privilégier le réseau
  try {
    const networkResponse = await fetch(request.clone());
    
    // Mettre en cache les réponses GET réussies
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Requête réseau échouée, vérification du cache');
    
    // Si hors ligne, essayer le cache
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Réponses de fallback pour API spécifiques
    if (request.url.includes('/api/games')) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    return new Response(JSON.stringify({ 
      error: 'Vous êtes hors ligne. Cette fonctionnalité nécessite une connexion internet.' 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 503
    });
  }
}

// Gestion des polices
async function handleFontRequest(request: Request): Promise<Response> {
  const cache = await caches.open(FONT_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Échec de récupération de police:', error);
    return new Response('/* Police non disponible hors ligne */', { 
      headers: { 'Content-Type': 'text/css' },
      status: 200 
    });
  }
}

// Gestion des navigations
async function handleNavigationRequest(request: Request): Promise<Response> {
  try {
    // Essayer de récupérer la page depuis le réseau
    const networkResponse = await fetch(request);
    
    // Si réussi, mettre en cache et retourner
    if (networkResponse.ok) {
      const cache = await caches.open(CORE_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Échec de récupération de la page');
  } catch (error) {
    console.log('[SW] Navigation hors ligne, utilisation du cache');
    
    // Si hors ligne, essayer le cache
    const cache = await caches.open(CORE_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback vers la page hors ligne
    const offlineResponse = await caches.match('/offline.html');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    // Fallback ultime si offline.html n'est pas en cache
    return new Response(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Hors ligne - Game-PV</title>
          <style>
            body { 
              font-family: sans-serif; 
              text-align: center; 
              padding: 20px;
              background: #1a1a1a;
              color: #e5e5e5;
            }
            h1 { color: #4ade80; }
            button {
              background: #4ade80;
              color: #1a1a1a;
              border: none;
              padding: 10px 20px;
              margin-top: 20px;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <h1>Vous êtes hors ligne</h1>
          <p>Impossible d'accéder à cette page actuellement.</p>
          <button onclick="window.location.reload()">Réessayer</button>
        </body>
      </html>
    `, {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Gestion par défaut
async function handleDefaultRequest(request: Request): Promise<Response> {
  // Stratégie stale-while-revalidate
  const cachePromise = caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (request.method === 'GET' && response.ok) {
      // Déterminer le cache approprié
      let cacheName = ASSETS_CACHE;
      
      if (request.url.includes('/build/')) {
        cacheName = CORE_CACHE;
      }
      
      const cache = caches.open(cacheName).then(cache => {
        cache.put(request, response.clone());
      });
    }
    
    return response;
  }).catch(error => {
    console.error('[SW] Échec de récupération:', error);
    throw error;
  });
  
  // Essayer d'abord le cache, puis le réseau
  return cachePromise.then(cachedResponse => {
    return cachedResponse || fetchPromise;
  }).catch(() => {
    // Si tout échoue, réponse générique
    return new Response('Ressource indisponible', {
      status: 408,
      headers: { 'Content-Type': 'text/plain' }
    });
  });
}

// Fonction de mise à jour complète des caches
async function updateAllCaches(): Promise<void> {
  try {
    // Mettre à jour les assets de base
    const coreCache = await caches.open(CORE_CACHE);
    await coreCache.addAll(CORE_ASSETS);
    
    // Mettre à jour les polices
    const fontCache = await caches.open(FONT_CACHE);
    await fontCache.addAll(FONT_ASSETS);
    
    // Mettre à jour les assets visuels
    const assetsCache = await caches.open(ASSETS_CACHE);
    await assetsCache.addAll(VISUAL_ASSETS);
    
    // Mettre à jour les jeux principaux
    const gameCache = await caches.open(GAME_CACHE);
    await Promise.all([
      gameCache.addAll(GAME_ASSETS['snake']),
      gameCache.addAll(GAME_ASSETS['tetris'])
    ]);
    
    console.log('[SW] Tous les caches ont été mis à jour');
  } catch (error) {
    console.error('[SW] Erreur lors de la mise à jour des caches:', error);
    throw error;
  }
}

// Vérifier si c'est un asset de jeu
function isGameAsset(pathname: string): boolean {
  // Vérifier tous les jeux
  const gameIds = Object.keys(GAME_ASSETS) as GameId[];
  
  for (const gameId of gameIds) {
    for (const asset of GAME_ASSETS[gameId]) {
      if (pathname.endsWith(asset) || 
          pathname.includes(`/games/${gameId}/`) || 
          pathname.includes(`/lib/games/${gameId}/`)) {
        return true;
      }
    }
  }
  return false;
}