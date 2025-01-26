<!-- src/lib/components/LeaderBoard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { formatEther, type Address } from 'viem';
  import { readContract } from '$lib/contracts/actions.js';
  import { GAMES, SUPPORTED_GAME_IDS } from '$lib/config/games.js';
  import { gameStore } from '$lib/stores/game.js';
  import type { GameConfig } from '$lib/contracts/types.js';
  import type { ScoreRecord, RoundInfo } from '$lib/types/games.js';

  type GameId = typeof SUPPORTED_GAME_IDS[number];

  // Props
  let { selectedGame = 'all' } = $props<{ selectedGame: GameId | 'all' }>();

  // Store subscriptions

let configs = $derived($gameStore.configs);
let updating = $derived($gameStore.updating);

  // Local state
  let currentRound = $state<RoundInfo>({
    roundId: 0n,
    startTime: 0n,
    endTime: 0n,
    rewardsDistributed: false,
    active: false,
    totalPrizePool: 0n
  });

  let gameScores = $state<ScoreRecord[]>([]);
  let gameConfig = $state<GameConfig | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let potentialRewards = $state<Map<Address, bigint>>(new Map());

  // Helpers
  function getGameTitle(gameId: GameId): string {
    return GAMES[gameId].title;
  }

  function getGameMinStake(gameId: GameId): string {
    return GAMES[gameId].minStake;
  }

  function calculateTimeLeft(round: RoundInfo): string {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (!round.active || round.endTime <= now) return 'Round ended';

    const remaining = Number(round.endTime - now);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function calculatePotentialRewards(scores: ScoreRecord[], config: GameConfig): Map<Address, bigint> {
    if (!config?.rewardDistribution || scores.length === 0) return new Map();

    const { maxWinners, platformFeePercent, winnerPercentages } = config.rewardDistribution;
    const validScores = scores
      .sort((a, b) => Number(b.score - a.score))
      .slice(0, maxWinners);

    const totalPrizePool = currentRound.totalPrizePool;
    const netPrizePool = totalPrizePool * BigInt(100 - platformFeePercent) / 100n;
    
    const rewards = new Map<Address, bigint>();
    validScores.forEach((score, index) => {
      if (index < winnerPercentages.length) {
        const percentage = BigInt(winnerPercentages[index]);
        const reward = (netPrizePool * percentage) / 100n;
        rewards.set(score.player as `0x${string}`, reward);
      }
    });

    return rewards;
  }

  // Data fetching
  async function fetchGameScores() {
  if (selectedGame === 'all') {
    await fetchAllGamesScores();
    return;
  }

  try {
    loading = true;
    error = null;

    // Fetch game config
    await gameStore.fetchConfigs();
    const config = gameStore.getConfig(selectedGame);

    if (!config) {
      error = 'Game configuration not found';
      return;
    }

    gameConfig = config;

    // Fetch round data 
    const round = await readContract.getRoundData(config.currentRound, selectedGame);
    
    currentRound = {
      roundId: config.currentRound,
      startTime: config.lastRoundStartTime,
      endTime: round.basic.endTime,
      active: config.active, // Modification ici pour gérer correctement l'état actif
      totalPrizePool: round.basic.totalPrizePool,  
      rewardsDistributed: round.basic.rewardsDistributed
    };

    // Fetch scores - Modification ici pour prendre tous les scores, pas uniquement les vérifiés
    const scores = await readContract.getScoresByRound(
      config.currentRound,
      selectedGame,
      false // Changed from true to false to get all scores
    );

    // Process scores
    if (scores && scores.length > 0) {
      gameScores = scores
        .map((score: any) => ({
          id: `${score.player}-${score.blockNumber}`,
          gameId: selectedGame,
          roundId: config.currentRound, 
          player: score.player as Address,
          score: BigInt(score.score),
          stake: BigInt(score.stake),
          blockNumber: BigInt(score.blockNumber),
          timestamp: Math.floor(Date.now() / 1000),
          scoreHash: `0x${score.scoreHash.slice(2)}` as `0x${string}`,
          verified: score.verified,
          validationStatus: score.verified ? 'valid' : 'pending' as 'valid' | 'pending' | 'invalid',
          validatedBy: score.verifier ?? '0x0000000000000000000000000000000000000000',
          gameState: {
            score: Number(score.score),
            level: 1,
            lines: 0,
            movesCount: 0,
            movesHash: '0x0'
          }
        }))
        .sort((a, b) => Number(b.score - a.score));

      // Calculate potential rewards
      if (gameConfig) {
        potentialRewards = calculatePotentialRewards(gameScores, gameConfig);
      }
    } else {
      gameScores = [];
      potentialRewards = new Map();
    }

  } catch (err) {
    console.error('Error fetching game scores:', err);
    error = err instanceof Error ? err.message : 'Failed to load scores';
    gameScores = [];
    potentialRewards = new Map();
  } finally {
    loading = false;
  }
}

  async function fetchAllGamesScores() {
    try {
      loading = true;
      error = null;

      await gameStore.fetchConfigs();
      let allScores: ScoreRecord[] = [];

      for (const gameId of SUPPORTED_GAME_IDS) {
        const config = gameStore.getConfig(gameId);
        if (!config?.active) continue;

        try {
          const scores = await readContract.getScoresByRound(
            config.currentRound,
            gameId,
            false
          );

          const formattedScores = scores.map(score => ({
            id: `${score.player}-${score.blockNumber}`,
            gameId,
            roundId: config.currentRound,
            player: score.player as Address,
            score: BigInt(score.score),
            stake: BigInt(score.stake),
            blockNumber: BigInt(score.blockNumber),
            timestamp: Math.floor(Date.now() / 1000),
            scoreHash: `0x${score.scoreHash.slice(2)}` as `0x${string}`,
            verified: score.verified,
            validationStatus: score.verified ? 'valid' : 'pending' as 'valid' | 'pending' | 'invalid',
            validatedBy: score.verifier || undefined,
            gameState: {
              score: Number(score.score),
              level: 1,
              lines: 0,
              movesCount: 0,
              movesHash: '0x0'
            }
          }));

          allScores = [...allScores, ...formattedScores];
        } catch (err) {
          console.error(`Error fetching scores for ${gameId}:`, err);
        }
      }

      gameScores = allScores.sort((a, b) => Number(b.score - a.score));
    } catch (err) {
      console.error('Error fetching all games scores:', err);
      error = err instanceof Error ? err.message : 'Failed to load scores';
    } finally {
      loading = false;
    }
  }

  // Lifecycle
  $effect(() => {
    fetchGameScores();
    const timer = setInterval(fetchGameScores, 60000);
    return () => clearInterval(timer);
  });

  onMount(fetchGameScores);
</script>

<!-- Template -->
{#await gameStore.fetchConfigs()}
  <div class="loading">
    <div class="loading-spinner"></div>
    <span>Loading game configuration...</span>
  </div>
{:then}
  <div class="leaderboard-content">
    <div class="leaderboard-header">
      <h2>
        {#if selectedGame === 'all'}
          Global Leaderboard
        {:else}
          {getGameTitle(selectedGame)} Leaderboard - Round {currentRound.roundId.toString()}
        {/if}
      </h2>
    </div>

    <div class="leaderboard-info-bar">
      <div class="leaderboard-info-grid">
        <div class="leaderboard-info-item">
          <span class="leaderboard-label">Prize Pool</span>
          <span class="leaderboard-value leaderboard-value-prize">
            {formatEther(currentRound.totalPrizePool * BigInt(100 - Number(gameConfig?.platformFee ?? 0)) / 100n)} POL
          </span>
        </div>
        <div class="leaderboard-info-item">
          <span class="leaderboard-label">Min Stake</span>
          <span class="leaderboard-value">
            {selectedGame === 'all' ? 'N/A' : getGameMinStake(selectedGame)} POL
          </span>
        </div>
        <div class="leaderboard-info-item">
          <span class="leaderboard-label">Time Left</span>
          <span class="leaderboard-value">
            {calculateTimeLeft(currentRound)}
          </span>
        </div>
      </div>
    </div>

    {#if error}
      <div class="error">{error}</div>
    {/if}

    <div class="leaderboard-table-container">
      {#if loading}
        <div class="loading">
          <div class="loading-spinner"></div>
          <span>Loading scores...</span>
        </div>
      {:else if gameScores.length === 0}
        <div class="empty">No scores submitted yet</div>
      {:else}
        <table class="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              {#if selectedGame === 'all'}
                <th>Game</th>
              {/if}
              <th>Player</th>
              <th>Score</th>
              <th>Stake</th>
              <th>Status</th>
              <th>Potential Reward</th>
            </tr>
          </thead>
          <tbody>
            {#each gameScores as score, i}
              {@const potentialReward = potentialRewards.get(score.player as `0x${string}`)}
              <tr>
                <td>{i + 1}</td>
                {#if selectedGame === 'all'}
                  <td class="capitalize">{getGameTitle(score.gameId as GameId)}</td>
                {/if}
                <td class="player-address">{score.player.slice(0, 6)}...{score.player.slice(-4)}</td>
                <td>{score.score.toString()}</td>
                <td>{formatEther(score.stake)} POL</td>
                <td>
                  <span class="leaderboard-status {score.validationStatus === 'valid' ? 'verified' : ''}">
                    {score.validationStatus === 'valid' ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td>
                  {#if i < (gameConfig?.rewardDistribution?.maxWinners || 0)}
                    {potentialReward ? `${formatEther(potentialReward)} POL` : '-'}
                  {:else}
                    -
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
{/await}



<style>
  .leaderboard-content {
    padding: 1rem;
  }

  .leaderboard-header {
    margin-bottom: 1rem;
  }

  .leaderboard-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: white;
  }

  .leaderboard-info-bar {
    background: rgb(31 41 55);
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .leaderboard-info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .leaderboard-info-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .leaderboard-label {
    color: rgb(156 163 175);
    font-size: 0.875rem;
  }

  .leaderboard-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: white;
  }

  .leaderboard-value-prize {
    color: rgb(34 197 94);
  }

  .leaderboard-table-container {
    background: rgb(31 41 55);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .leaderboard-table td:last-child {
    color: rgb(34 197 94);
    font-weight: 600;
  }
  .loading, .empty {
    padding: 2rem;
    text-align: center;
    color: rgb(156 163 175);
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .loading-spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid rgb(55 65 81);
    border-top-color: rgb(79 70 229);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .leaderboard-table {
    width: 100%;
    border-collapse: collapse;
  }

  .leaderboard-table th,
  .leaderboard-table td {
    padding: 0.75rem 1rem;
    text-align: left;
  }

  .leaderboard-table th {
    background: rgb(55 65 81);
    color: rgb(209 213 219);
    font-weight: 500;
    font-size: 0.875rem;
  }

  .leaderboard-table td {
    border-bottom: 1px solid rgb(55 65 81);
    color: white;
  }

  .leaderboard-table tr:last-child td {
    border-bottom: none;
  }

  .player-address {
    font-family: monospace;
  }

  .capitalize {
    text-transform: capitalize;
  }

  .leaderboard-status {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    background: rgb(55 65 81);
    color: rgb(156 163 175);
  }

  .leaderboard-status.verified {
    background: rgb(34 197 94 / 0.1);
    color: rgb(34 197 94);
  }

  .error {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: rgb(239 68 68 / 0.1);
    color: rgb(239 68 68);
    border-radius: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
  }
</style>