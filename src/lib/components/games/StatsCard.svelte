<!-- lib/components/games/StatsCard.svelte -->
<script lang="ts">
  const { stats } = $props<{
    stats: {
      activePlayers: number;
      totalPrizePool: string;
      activeGamesCount: number;
    }
  }>();
</script>

<section class="bg-glass rounded-game p-8 mb-16 slide-up">
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {#each [
      { label: 'Active Players', value: stats.activePlayers, icon: '👥' },
      { label: 'Total Prize Pool', value: `${stats.totalPrizePool} POL`, icon: '🏆' },
      { label: 'Games Available', value: stats.activeGamesCount, icon: '🎮' }
    ] as stat}
      <div class="text-center">
        <span class="block text-2xl mb-2">{stat.icon}</span>
        <div class="text-xl font-bold text-white">{stat.value}</div>
        <div class="text-sm text-gray-400">{stat.label}</div>
      </div>
    {/each}
  </div>
</section>