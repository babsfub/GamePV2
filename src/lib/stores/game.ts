// src/lib/stores/games.ts
import { writable, get } from 'svelte/store';
import { GAMES, SUPPORTED_GAME_IDS, GAME_DEFAULTS } from '$lib/config/games.js';
import { readContract } from '$lib/contracts/actions.js';
import type { GameConfig } from '$lib/contracts/types.js';

interface GameStoreState {
  configs: Record<keyof typeof GAMES, GameConfig | null>;
  lastUpdate: number;
  updating: boolean;
  error: Error | null;
}

function createGameStore() {
  const CACHE_DURATION = 30000; // 30 secondes

  const initialState: GameStoreState = {
    configs: Object.fromEntries(
      SUPPORTED_GAME_IDS.map(id => [id, null])
    ) as GameStoreState['configs'],
    lastUpdate: 0,
    updating: false,
    error: null
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,
    async fetchConfigs() {
      update(state => {
        if (state.updating) return state;
        if (Date.now() - state.lastUpdate < CACHE_DURATION) return state;
        return { ...state, updating: true };
      });

      try {
        const configs = { ...initialState.configs };
        
        await Promise.all(
          SUPPORTED_GAME_IDS.map(async (gameId) => {
            try {
              configs[gameId] = await readContract.getGameConfig(gameId);
            } catch (err) {
              console.error(`Error fetching config for ${gameId}:`, err);
              const state = get({ subscribe });
              if (state.configs[gameId]) {
                configs[gameId] = state.configs[gameId];
              }
            }
          })
        );

        update(state => ({
          ...state,
          configs,
          lastUpdate: Date.now(),
          updating: false,
          error: null
        }));

      } catch (err) {
        console.error('Error fetching game configs:', err);
        update(state => ({ 
          ...state, 
          updating: false,
          error: err instanceof Error ? err : new Error('Failed to fetch configs')
        }));
      }
    },

    getConfig(gameId: keyof typeof GAMES) {
      return get({ subscribe }).configs[gameId];
    },

    getActiveGames() {
      const { configs } = get({ subscribe });
      return SUPPORTED_GAME_IDS.filter(id => configs[id]?.active);
    },

    getGameInfo(gameId: keyof typeof GAMES) {
      return GAMES[gameId];
    },

    getDefaultConfig() {
      return GAME_DEFAULTS;
    },

    isGameActive(gameId: keyof typeof GAMES) {
      const config = this.getConfig(gameId);
      return config?.active ?? false;
    }
  };
}

export const gameStore = createGameStore();

// Initialiser le store côté client uniquement
if (typeof window !== 'undefined') {
  gameStore.fetchConfigs();
}