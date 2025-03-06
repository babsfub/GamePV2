<script lang='ts'>
    import { getWalletState } from '$lib/state/wallet.svelte.js';
    import { getUIState } from '$lib/state/ui.svelte.js';
    import { readContract, writeContract } from '$lib/contracts/actions.js';
    import { formatEther } from 'viem';
    import type { GameId, ContractScore } from '$lib/types.js';

    const { data } = $props<{
        data: {
            isAdmin: boolean;
            isVerifier: boolean;
        }
    }>();

    const walletState = getWalletState();
    const uiState = getUIState();

    // États locaux
    let playerStats = $state({
        totalGames: 0,
        totalScore: 0n,
        totalStake: 0n,
        verifiedScores: 0
    });
    let playerScores = $state<(ContractScore & { game: GameId; roundId: bigint })[]>([]);
    let pendingWithdrawals = $state<bigint>(0n);
    let isLoading = $state(false);
    let isWithdrawing = $state(false);

    // États dérivés
    let isConnected = $derived(Boolean(walletState.address));
    
    // Liste des jeux disponibles
    const gamesList: readonly GameId[] = ['snake', 'tetris'];

    // Fonction pour calculer les statistiques
    function updateStats() {
        playerStats.totalGames = playerScores.length;
        playerStats.totalScore = playerScores.reduce((acc, score) => acc + score.score, 0n);
        playerStats.totalStake = playerScores.reduce((acc, score) => acc + score.stake, 0n);
        playerStats.verifiedScores = playerScores.filter(score => score.verified).length;
    }

    async function loadPlayerData() {
        if (!isConnected || !walletState.address) return;
        
        try {
            isLoading = true;
            const allScores: (ContractScore & { game: GameId; roundId: bigint })[] = [];
            
            for (const game of gamesList) {
                try {
                    const gameConfig = await readContract.getGameConfig(game);
                    
                    if (!gameConfig.active) {
                        console.log(`Game ${game} is not active, skipping...`);
                        continue;
                    }

                    const currentRoundId = gameConfig.currentRound;
                    
                    // Parcourir les rounds
                    for (let roundId = currentRoundId; roundId > 0n; roundId--) {
                        try {
                            const roundData = await readContract.getRoundData(roundId, game);
                            
                            if (!roundData.scores || roundData.scores.length === 0) {
                                continue;
                            }
                            
                            const playerRoundScores = roundData.scores
                                .filter(score => score.player.toLowerCase() === walletState.address!.toLowerCase())
                                .map(score => ({
                                    ...score,
                                    game,
                                    roundId
                                }));
                            
                            if (playerRoundScores.length > 0) {
                                allScores.push(...playerRoundScores);
                            }
                        } catch (roundError) {
                            console.log(`Skipping round ${roundId} for ${game}`);
                            continue;
                        }
                    }
                } catch (gameError) {
                    console.log(`Error loading game ${game}`);
                    continue;
                }
            }
            
            // Mise à jour des scores et stats
            playerScores = allScores.sort((a, b) => Number(b.roundId - a.roundId));
            updateStats();
            
            if (walletState.address) {
                pendingWithdrawals = await readContract.getPendingWithdrawals(walletState.address);
            }
            
        } catch (error) {
            console.error('Error loading player data:', error);
            uiState.error('Failed to load profile data');
        } finally {
            isLoading = false;
        }
    }

    async function handleWithdraw() {
        if (!isConnected || !walletState.address || pendingWithdrawals === 0n) return;
        
        try {
            isWithdrawing = true;
            await writeContract.withdraw(walletState.address);
            
            uiState.success('Successfully withdrawn rewards');
            await loadPlayerData();
            
        } catch (error) {
            console.error('Withdrawal error:', error);
            uiState.error('Failed to withdraw rewards');
        } finally {
            isWithdrawing = false;
        }
    }

    // Effet pour charger les données
    $effect(() => {
        if (isConnected) {
            loadPlayerData();
        }
    });
</script>

<div class="profile-container">
    <div class="header">
        <h1>Player Profile</h1>
        {#if !isConnected}
            <div class="warning">Please connect your wallet to view your profile</div>
        {/if}
    </div>

    {#if isConnected}
        <!-- Stats Section -->
        <div class="stats-section">
            <h2>Your Stats</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-label">Total Games</span>
                    <span class="stat-value">{playerStats.totalGames}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Total Score</span>
                    <span class="stat-value">{playerStats.totalScore.toString()}</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Total Stake</span>
                    <span class="stat-value">{formatEther(playerStats.totalStake)} POL</span>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Verified Scores</span>
                    <span class="stat-value">{playerStats.verifiedScores}</span>
                </div>
            </div>
        </div>

        <!-- Withdrawals Section -->
        <div class="withdrawals-section">
            <h2>Pending Withdrawals</h2>
            <div class="withdrawal-info">
                <span class="amount">{formatEther(pendingWithdrawals)} POL</span>
                <button 
                    class="withdraw-button"
                    disabled={pendingWithdrawals === 0n || isWithdrawing}
                    onclick={handleWithdraw}
                >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </button>
            </div>
        </div>

        <!-- Scores Section -->
        <div class="scores-section">
            <h2>Your Scores</h2>
            {#if isLoading}
                <div class="loading">Loading scores...</div>
            {:else if playerScores.length === 0}
                <div class="empty-state">No scores found</div>
            {:else}
                <div class="scores-grid">
                    {#each playerScores as score}
                        <div class="score-card">
                            <div class="game-info">
                                <span class="game-name">{score.game}</span>
                                <span class="round">Round #{score.roundId.toString()}</span>
                            </div>
                            <div class="score-details">
                                <div class="score-value">{score.score.toString()} pts</div>
                                <div class="stake">Stake: {formatEther(score.stake)} POL</div>
                            </div>
                            <div class="status">
                                {#if score.verified}
                                    <span class="verified">✓ Verified</span>
                                {:else}
                                    <span class="pending">Pending verification</span>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .profile-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
    }

    .header {
        margin-bottom: 2rem;
    }

    .warning {
        color: #f59e0b;
        margin-top: 0.5rem;
    }

    .stats-section {
        margin-bottom: 2rem;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 0.3rem;
        margin-top: 1rem;
    }

    .stat-card {
        background: rgba(0, 0, 0, 0.2);
        padding: 1rem;
        border-radius: 0.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .stat-label {
        font-size: 0.875rem;
        color: #9ca3af;
    }

    .stat-value {
        font-size: 1.25rem;
        font-weight: 600;
    }

    .withdrawals-section {
        background: rgba(0, 0, 0, 0.2);
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 2rem;
    }

    .withdrawal-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
    }

    .amount {
        font-size: 1.5rem;
        font-weight: 600;
    }

    .withdraw-button {
        background: #10b981;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
        border: none;
        cursor: pointer;
    }

    .withdraw-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .scores-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
    }

    .score-card {
        background: rgba(0, 0, 0, 0.1);
        padding: 1rem;
        border-radius: 0.5rem;
    }

    .game-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }

    .game-name {
        font-weight: 600;
        text-transform: capitalize;
    }

    .score-details {
        margin: 1rem 0;
    }

    .score-value {
        font-size: 1.25rem;
        font-weight: 600;
    }

    .stake {
        color: #9ca3af;
        font-size: 0.875rem;
    }

    .status {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .verified {
        color: #10b981;
    }

    .pending {
        color: #f59e0b;
    }

    .loading, .empty-state {
        text-align: center;
        padding: 2rem;
        color: #9ca3af;
    }

    @media (max-width: 768px) {
        .profile-container {
            padding: 1rem;
        }

        .scores-grid {
            grid-template-columns: 1fr;
        }

        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>