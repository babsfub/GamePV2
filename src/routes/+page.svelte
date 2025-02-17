<script lang="ts">
  import { readContract } from '$lib/contracts/actions.js';
  import { formatEther } from 'viem';
  import { getGameState } from '$lib/state/game.svelte.js';
  import type { GameId } from '$lib/types.js';
  import LeaderBoard from '$lib/components/LeaderBoard.svelte';
  import GameCard from '$lib/components/games/GameCard.svelte';
  import StatsCard from '$lib/components/games/StatsCard.svelte';
  import GameSelector from '$lib/components/games/GameSelector.svelte';
  import { GAMES, SUPPORTED_GAME_IDS } from '$lib/config/games.js';

  // État global
  const gameState = getGameState();
  let selectedGame = $state<GameId | 'all'>('all');

  // Configuration des gradients UI
  const GRADIENTS = {
    snake: 'from-emerald-400 to-cyan-500',
    tetris: 'from-purple-500 to-pink-500'
  } as const;

  // États dérivés
  let activeGameMetrics = $derived(
    gameState.activeGames.map(gameId => {
      const gameConfig = GAMES[gameId];
      return {
        ...gameConfig,
        gradient: GRADIENTS[gameId],
        metrics: gameState.getGameMetrics(gameId),
        config: gameState.configs[gameId]
      };
    })
  );

  let globalStats = $derived({
    activePlayers: gameState.totalPlayers,
    totalPrizePool: formatEther(gameState.totalPrizePool),
    activeGamesCount: gameState.activeGames.length
  });

  // Mise à jour des données
  async function updateGameData() {
    for (const gameId of SUPPORTED_GAME_IDS) {
      try {
        const config = await readContract.getGameConfig(gameId);
        gameState.setConfig(gameId, config);

        if (config?.active) {
          const round = await readContract.getRoundData(config.currentRound, gameId);
          // Ajouter les propriétés manquantes pour le type Score
          const roundWithTransaction = {
            ...round,
            scores: round.scores.map(score => ({
              ...score,
              transactionHash: '0x0' as `0x${string}` // Valeur par défaut pour transactionHash
            }))
          };
          gameState.setRound(gameId, roundWithTransaction);
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

    <!-- Hero Section -->
    <section class="hero-section">
      <h1>Play. Compete. Win.</h1>
      <p>Classic arcade games reinvented for Web3. Compete for real prizes.</p>
    </section>

    <!-- Game Cards Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      {#each activeGameMetrics as game (game.id)}
        <GameCard {game} />
      {/each}
    </div>

    <!-- Stats Section -->
    <StatsCard stats={globalStats} />

    <!-- Game Selection & Leaderboard -->
    <div class="space-y-8">
      <GameSelector
        games={gameState.activeGames}
        bind:selected={selectedGame}
      />
      <LeaderBoard 
        selectedGame={selectedGame === 'all' ? gameState.activeGames[0] : selectedGame} 
      />
    </div>
