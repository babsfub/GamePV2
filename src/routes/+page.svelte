<script lang="ts">
  import { readContract } from '$lib/contracts/actions.js';
  import { formatEther } from 'viem';
  import { getGameState } from '$lib/state/game.svelte.js';
  import type { GameId } from '$lib/types.js';
  import LeaderBoard from '$lib/components/LeaderBoard.svelte';
  import GameCard from '$lib/components/games/GameCard.svelte';
  import StatsCard from '$lib/components/games/StatsCard.svelte';
  import GameSelector from '$lib/components/games/GameSelector.svelte';
  import Ad from '$lib/components/Ad.svelte';
  import { GAMES, SUPPORTED_GAME_IDS } from '$lib/config/games.js';
  // État global
  const gameState = getGameState();
  let selectedGame = $state<GameId | 'all'>('all');

  // Configuration des gradients UI
  const GRADIENTS = {
    snake: 'from-emerald-400 to-cyan-500',
    tetris: 'from-purple-500 to-pink-500',
    minesweeper: 'from-emerald-400 to-cyan-500'
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
          const roundWithTransaction = {
            ...round,
            scores: round.scores.map(score => ({
              ...score,
              transactionHash: '0x0' as `0x${string}` 
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

  $effect(() => {
    updateGameData();
    const interval = setInterval(updateGameData, 60000);
    return () => clearInterval(interval);
  });

  const META = {
    title: "FEGA - Fun Entertainment Gaming Achievements",
    description: "Dive into a universe where gaming meets blockchain innovation. Play for free and compete for real rewards in our reimagined arcade classics!",
  };

</script>

<svelte:head>
  <title>{META.title}</title>
  <meta name="description" content={META.description} />
  <meta property="og:title" content={META.title} />
  <meta property="og:description" content={META.description} />
  <meta name="twitter:title" content={META.title} />
  <meta name="twitter:description" content={META.description} />
</svelte:head>

<main class="home-container">
  <!-- Hero Section avec effet néon authentique style arcade et couleurs alternantes -->
  <section class="hero-section arcade-bg pixel-border-neon slide-up">
    <!-- Coins d'arcade décoratifs lumineux -->
    <div class="arcade-corner top-left"></div>
    <div class="arcade-corner top-right"></div>
    <div class="arcade-corner bottom-left"></div>
    <div class="arcade-corner bottom-right"></div>
    
    <!-- Titre avec effet néon alternant les couleurs, tout en préservant la classe hero-title -->
    <h1 class="hero-title neon-text-cycle" data-text="Fega">Fega</h1>
    <p class="hero-subtitle">Your destination for innovative free Web3 arcade games!</p>
    <div class="hero-description">
      <p>Step into a world where classic gaming meets blockchain innovation. Play for free, compete for high scores, and earn real rewards in our revolutionary gaming platform!</p>
    </div>
  </section>

  <!-- How It Works Section -->
  <section class="features-section slide-up">
    <h2 class="section-title">How It Works</h2>
    <div class="features-grid">
      <div class="feature-card bg-glass">
        <h3>Free to Play</h3>
        <p>Enjoy all our games with no entry fee. Have fun and choose when to join the competitive rounds.</p>
      </div>
      <div class="feature-card bg-glass">
        <h3>Flexible Stakes</h3>
        <p>Submit your score with a variable stake to join the competition. All stakes contribute to the round's reward pool.</p>
      </div>
      <div class="feature-card bg-glass">
        <h3>Exciting Rounds</h3>
        <p>23.5-hour rounds where top players share the prize pool. First place typically earns over 50% of the pool.</p>
      </div>
      <div class="feature-card bg-glass">
        <h3>Web3 Ready</h3>
        <p>Simply connect your digital wallet to start your journey. Your transactions and rewards are secured by blockchain.</p>
      </div>
    </div>
  </section>

  <!-- Games Section -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 slide-up">
    {#each activeGameMetrics as game (game.id)}
      <GameCard {game} />
    {/each}
  </div>

  <!-- Stats Section -->
  <StatsCard stats={globalStats} />

  <!-- Why Choose Us Section -->
  <section class="benefits-section slide-up">
    <h2 class="section-title">Why Choose Fega?</h2>
    <div class="benefits-grid">
      <div class="benefit-card bg-glass">
        <h3>Attractive Rewards</h3>
        <p>Showcase your skills and win real rewards. Top players earn substantial prizes from each round.</p>
      </div>
      <div class="benefit-card bg-glass">
        <h3>Passionate Community</h3>
        <p>Join a growing community of competitive gamers. Fair play and exciting challenges await.</p>
      </div>
      <div class="benefit-card bg-glass">
        <h3>Security & Innovation</h3>
        <p>Blockchain technology ensures transparent and secure transactions for all your earnings.</p>
      </div>
    </div>
  </section>

  <!-- Call to Action avec effet néon orange -->
  <section class="cta-section bg-glass pixel-border-neon text-center p-8 my-16 slide-up">
    <div class="arcade-corner top-left"></div>
    <div class="arcade-corner top-right"></div>
    <div class="arcade-corner bottom-left"></div>
    <div class="arcade-corner bottom-right"></div>
    
    <h2 class="text-2xl font-bold mb-4 neon-text-orange" style="font-size: 2rem;">Ready to Play?</h2>
    <p class="text-gray-300 mb-6">Connect your wallet, set your high scores, and prove you're the best in this unique gaming universe!</p>
  </section>

  <!-- Leaderboard Section -->
  <div class="space-y-8 slide-up">
    <GameSelector
      selected={selectedGame}
      games={gameState.activeGames}
      onSelect={(value) => selectedGame = value}
    />
    <LeaderBoard 
      selectedGame={selectedGame === 'all' ? gameState.activeGames[0] : selectedGame} 
    />
  </div>
</main>
<Ad enableAds={true} />
<style>
  .home-container {
    max-width: var(--max-width-game);
    margin: 0 auto;
    padding: 2rem var(--spacing-screen-safe);
  }

  .hero-description {
    max-width: 800px;
    margin: 0 auto;
    color: var(--color-text-secondary);
    line-height: 1.6;
    position: relative;
    z-index: 2;
  }

  .section-title {
    font-size: 2rem;
    font-weight: 600;
    color: var(--color-text);
    text-align: center;
    margin-bottom: 2rem;
  }

  .features-grid,
  .benefits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
    margin-bottom: 4rem;
  }

  .feature-card,
  .benefit-card {
    padding: 2rem;
    border-radius: 1rem;
    transition: transform 0.3s ease;
  }

  .feature-card:hover,
  .benefit-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
  }

  .feature-card h3,
  .benefit-card h3 {
    color: var(--color-primary);
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  @media (max-width: 768px) {
    .section-title {
      font-size: 1.5rem;
    }

    .features-grid,
    .benefits-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
