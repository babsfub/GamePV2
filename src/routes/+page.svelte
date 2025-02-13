<script lang="ts">
  import { readContract } from '$lib/contracts/actions.js';
  import { formatEther } from 'viem';
  import { getGameState } from '$lib/state/game.svelte.js';
  import type { GameId } from '$lib/types.js';
  import LeaderBoard from '$lib/components/LeaderBoard.svelte';
  import GameCard from '$lib/components/games/GameCard.svelte';
  import StatsCard from '$lib/components/games/StatsCard.svelte';
  import GameSelector from '$lib/components/games/GameSelector.svelte';

  // État global
  const gameState = getGameState();
  let selectedGame = $state<GameId | 'all'>('all');

  // Configuration des jeux
  const GAMES_CONFIG = {
    snake: {
      title: 'Snake',
      description: 'Race against time and collect power-ups in this modern twist on the classic.',
      path: '/games/snake',
      gradient: 'from-emerald-400 to-cyan-500',
      imagePath: '/images/games/snake.webp'
    },
    tetris: {
      title: 'Tetris', 
      description: 'Stack blocks strategically in this enhanced version with special pieces.',
      path: '/games/tetris',
      gradient: 'from-purple-500 to-pink-500',
      imagePath: '/images/games/tetris.webp'
    }
  } as const;

  // États dérivés avec la nouvelle syntaxe $derived
  let activeGameMetrics = $derived(
    gameState.activeGames.map(gameId => ({
      id: gameId,
      ...GAMES_CONFIG[gameId],
      metrics: gameState.getGameMetrics(gameId),
      config: gameState.configs[gameId]
    }))
  );

  let globalStats = $derived({
    activePlayers: gameState.totalPlayers,
    totalPrizePool: formatEther(gameState.totalPrizePool),
    activeGamesCount: gameState.activeGames.length
  });

  // Mise à jour des données
  async function updateGameData() {
    for (const gameId of Object.keys(GAMES_CONFIG) as GameId[]) {
      try {
        const config = await readContract.getGameConfig(gameId);
        gameState.setConfig(gameId, config);

        if (config?.active) {
          const round = await readContract.getRoundData(config.currentRound, gameId);
          gameState.setRound(gameId, round);
        }
      } catch (err) {
        console.error(`Error updating ${gameId} data:`, err);
        gameState.setConfig(gameId, null);
        gameState.setRound(gameId, null);
      }
    }
  }

  // Effet pour la mise à jour périodique
  $effect(() => {
    updateGameData();
    const interval = setInterval(updateGameData, 60000);
    return () => clearInterval(interval);
  });
</script>

<div class="game-container">
  <!-- Hero Section -->
  <section class="hero-section mb-16 text-center">
    <h1 class="text-4xl md:text-6xl font-display font-bold mb-4">
      Play. Compete. Win.
    </h1>
    <p class="text-lg text-gray-400 max-w-2xl mx-auto">
      Classic arcade games reinvented for Web3. Compete for real prizes.
    </p>
  </section>

  <!-- Game Cards -->
  <section class="game-cards grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
    {#each activeGameMetrics as game (game.id)}
      <GameCard {game} />
    {/each}
  </section>

  <!-- Stats Section -->
  <StatsCard stats={globalStats} />

  <!-- Game Selection & Leaderboard -->
  <section class="game-selection mb-16">
    <GameSelector
      games={gameState.activeGames}
      bind:selected={selectedGame}
    />
    <LeaderBoard selectedGame={selectedGame === 'all' ? gameState.activeGames[0] : selectedGame} />
  </section>
</div>
