<script lang='ts'>
    import { page } from '$app/state'; 
    import { onMount } from 'svelte';
    import { wallet } from '$lib/stores/wallet.js';
    import { readContract, writeContract } from '$lib/contracts/actions.js';
    import { formatEther } from 'viem';
    import { addToast } from '$lib/stores/toasts.js';
    import type { Score } from '$lib/contracts/types';

    // Interface pour les scores étendus avec les infos de round et jeu
    interface ExtendedScore extends Score {
        roundId: bigint;
        game: string;
        rewardsDistributed: boolean;
    }

    // États réactifs avec $state
    let playerScores = $state<ExtendedScore[]>([]);
    let pendingWithdrawals = $state<bigint>(0n);
    let isLoading = $state(false);
    let isWithdrawing = $state(false);

    // État dérivé pour le statut de connexion
    let isConnected = $derived(Boolean($wallet.address));
    
    // Liste des jeux disponibles
    const gamesList = ['snake', 'tetris'];

    async function loadPlayerData() {
    if (!isConnected || !$wallet.address) return;
    
    try {
        isLoading = true;
        const allScores: ExtendedScore[] = [];
        
        for (const game of gamesList) {
            try {
                // Vérifier d'abord la configuration du jeu
                const gameConfig = await readContract.getGameConfig(game);
                
                if (!gameConfig.active) {
                    console.log(`Game ${game} is not active, skipping...`);
                    continue;
                }

                const currentRoundId = gameConfig.currentRound; // Utiliser le round de la config
                console.log(`Loading scores for ${game}, current round: ${currentRoundId}`);
                
                // Ne chercher que les rounds qui existent
                for (let roundId = currentRoundId; roundId > 0n; roundId--) {
                    try {
                        const roundData = await readContract.getRoundData(roundId, game);
                        
                        // Vérifier que le round a des scores
                        if (!roundData.scores || roundData.scores.length === 0) {
                            continue;
                        }
                        
                        const playerRoundScores = roundData.scores.filter(
                            score => score.player.toLowerCase() === $wallet.address!.toLowerCase()
                        );
                        
                        if (playerRoundScores.length > 0) {
                            allScores.push(...playerRoundScores.map(score => ({
                                ...score,
                                roundId,
                                game,
                                rewardsDistributed: roundData.basic.rewardsDistributed
                            })));
                        }
                    } catch (roundError) {
                        console.log(`Skipping round ${roundId} for ${game}: ${roundError.message}`);
                        continue; // Passer au round suivant si celui-ci échoue
                    }
                }
            } catch (gameError) {
                console.log(`Error loading game ${game}: ${gameError.message}`);
                continue; // Passer au jeu suivant si celui-ci échoue
            }
        }
        
        // Trier les scores par date décroissante
        playerScores = allScores.sort((a, b) => {
            return Number(b.roundId - a.roundId);
        });
        
        if ($wallet.address) {
            pendingWithdrawals = await readContract.getPendingWithdrawals($wallet.address);
        }
        
    } catch (error) {
        console.error('Error loading player data:', error);
        addToast({
            type: 'error',
            message: 'Failed to load some profile data'
        });
    } finally {
        isLoading = false;
    }
}

    async function handleWithdraw() {
        if (!isConnected || !$wallet.address || pendingWithdrawals === 0n) return;
        
        try {
            isWithdrawing = true;
            await writeContract.withdraw($wallet.address);
            
            addToast({
                type: 'success',
                message: 'Successfully withdrawn rewards'
            });
            
            await loadPlayerData();
            
        } catch (error) {
            console.error('Withdrawal error:', error);
            addToast({
                type: 'error',
                message: 'Failed to withdraw rewards'
            });
        } finally {
            isWithdrawing = false;
        }
    }

    // Initialisation
    onMount(() => {
        if (isConnected) {
            loadPlayerData();
        }
    });

    // Effect pour recharger quand le wallet change
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
        <div class="withdrawals-section">
            <h2>Pending Withdrawals</h2>
            <div class="withdrawal-info">
                <span class="amount">{formatEther(pendingWithdrawals)} ETH</span>
                <button 
                    class="withdraw-button"
                    disabled={pendingWithdrawals === 0n || isWithdrawing}
                    onclick={handleWithdraw}
                >
                    {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
                </button>
            </div>
        </div>

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
                                <div class="stake">Stake: {formatEther(score.stake)} ETH</div>
                            </div>
                            <div class="status">
                                {#if score.verified}
                                    <span class="verified">✓ Verified</span>
                                {:else}
                                    <span class="pending">Pending verification</span>
                                {/if}
                                {#if score.rewardsDistributed}
                                    <span class="distributed">Rewards distributed</span>
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

    .distributed {
        color: #6366f1;
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
    }
</style>