<script lang='ts'>
    import { getWalletState } from '$lib/state/wallet.svelte.js';
    import { getUIState } from '$lib/state/ui.svelte.js';
    import { readContract, writeContract } from '$lib/contracts/actions.js';
    import { formatEther } from 'viem';
    import type { GameId, ContractScore, Score } from '$lib/types.js';

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
        verifiedScores: 0,
        highestScore: 0n,
        lastPlayedDate: null as Date | null
    });
    
    let playerScores = $state<(Score & { game: GameId; roundId: bigint })[]>([]);
    let pendingWithdrawals = $state<bigint>(0n);
    let isLoading = $state(false);
    let isWithdrawing = $state(false);
    let error = $state<string | null>(null);
    
    // Pagination
    let currentPage = $state(1);
    const pageSize = 5;
    let totalPages = $derived(Math.ceil(playerScores.length / pageSize));
    
    // Filtres
    let selectedGameFilter = $state<GameId | 'all'>('all');
    let sortBy = $state<'date' | 'score' | 'stake'>('date');
    let sortDirection = $state<'asc' | 'desc'>('desc');
    
    // Liste des jeux disponibles
    const gamesList: readonly GameId[] = ['snake', 'tetris'];

    // États dérivés
    let isConnected = $derived(Boolean(walletState.address));
    let filteredScores = $derived(() => {
        // Filtrer par jeu
        let scores = playerScores.filter(score => 
            selectedGameFilter === 'all' || score.game === selectedGameFilter
        );
        
        // Trier les scores
        scores = [...scores].sort((a, b) => {
            if (sortBy === 'date') {
                return sortDirection === 'desc' 
                    ? Number(b.blockNumber - a.blockNumber)
                    : Number(a.blockNumber - b.blockNumber);
            } else if (sortBy === 'score') {
                return sortDirection === 'desc' 
                    ? Number(b.score - a.score)
                    : Number(a.score - b.score);
            } else { // stake
                return sortDirection === 'desc' 
                    ? Number(b.stake - a.stake)
                    : Number(a.stake - b.stake);
            }
        });
        
        return scores;
    });
    
    let paginatedScores = $derived(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return filteredScores.slice(startIndex, startIndex + pageSize);
    });

    // Fonction pour calculer les statistiques
    function updateStats() {
        // Mise à jour des statistiques de base
        playerStats.totalGames = playerScores.length;
        playerStats.totalScore = playerScores.reduce((acc, score) => acc + score.score, 0n);
        playerStats.totalStake = playerScores.reduce((acc, score) => acc + score.stake, 0n);
        playerStats.verifiedScores = playerScores.filter(score => score.verified).length;
        
        // Statistiques avancées
        playerStats.highestScore = playerScores.reduce(
            (max, score) => score.score > max ? score.score : max, 
            0n
        );
        
        // Dernière partie jouée
        if (playerScores.length > 0) {
            const latestScore = [...playerScores].sort((a, b) => 
                Number(b.blockNumber - a.blockNumber)
            )[0];
            playerStats.lastPlayedDate = new Date();
        }
        
        // Réinitialiser la pagination à la première page
        currentPage = 1;
    }

    async function loadPlayerData() {
        if (!isConnected || !walletState.address) return;
        
        try {
            isLoading = true;
            error = null;
            const allScores: (Score & { game: GameId; roundId: bigint })[] = [];
            
            // Approche simplifiée pour charger les scores (comme le leaderboard)
            console.log("Loading player scores with address:", walletState.address);
            
            for (const game of gamesList) {
                try {
                    console.log(`Loading scores for game: ${game}`);
                    const gameConfig = await readContract.getGameConfig(game);
                    
                    if (!gameConfig.active) {
                        console.log(`Game ${game} is not active, skipping...`);
                        continue;
                    }
                    
                    const currentRoundId = gameConfig.currentRound;
                    console.log(`Game ${game} current round ID: ${currentRoundId.toString()}`);
                    
                    const roundData = await readContract.getRoundData(currentRoundId, game);
                    console.log(`Round data loaded for ${game}:`, {
                        scoreCount: roundData.scores.length,
                        prizePool: roundData.prizePool.toString(),
                        isActive: roundData.isActive
                    });
                    
                    // Filtrer les scores du joueur
                    const normalizedUserAddress = walletState.address.toLowerCase();
                    const playerRoundScores = roundData.scores
                        .filter(score => {
                            const scorePlayerAddress = score.player.toLowerCase();
                            const isMatch = scorePlayerAddress === normalizedUserAddress;
                            console.log(`Score check - Player: ${scorePlayerAddress.substring(0, 8)}... vs User: ${normalizedUserAddress.substring(0, 8)}... - Match: ${isMatch}`);
                            return isMatch;
                        })
                        .map(score => ({
                            ...score,
                            game,
                            roundId: currentRoundId
                        }));
                    
                    console.log(`Found ${playerRoundScores.length} scores for player in game ${game}`);
                    allScores.push(...playerRoundScores);
                    
                    // Si nécessaire, regarder aussi dans le round précédent
                    if (currentRoundId > 1n) {
                        try {
                            const previousRoundId = currentRoundId - 1n;
                            const previousRoundData = await readContract.getRoundData(previousRoundId, game);
                            
                            const previousRoundScores = previousRoundData.scores
                                .filter(score => score.player.toLowerCase() === normalizedUserAddress)
                                .map(score => ({
                                    ...score,
                                    game,
                                    roundId: previousRoundId
                                }));
                            
                            console.log(`Found ${previousRoundScores.length} additional scores in previous round`);
                            allScores.push(...previousRoundScores);
                        } catch (err) {
                            console.log(`Error loading previous round for ${game}:`, err);
                        }
                    }
                } catch (err) {
                    console.error(`Error loading ${game} data:`, err);
                }
            }
            
            // Mise à jour des scores et stats
            console.log("All player scores loaded:", allScores);
            playerScores = allScores;
            updateStats();
            
            // Récupérer les retraits en attente
            if (walletState.address) {
                pendingWithdrawals = await readContract.getPendingWithdrawals(walletState.address);
                console.log(`Pending withdrawals: ${formatEther(pendingWithdrawals)} ETH`);
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
    
    function changePage(page: number) {
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
        }
    }
    
    function setGameFilter(game: GameId | 'all') {
        selectedGameFilter = game;
        currentPage = 1; // Réinitialiser à la première page
    }
    
    function toggleSort(field: 'date' | 'score' | 'stake') {
        if (sortBy === field) {
            // Inverser la direction si on clique sur le même champ
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Nouveau champ de tri, réinitialiser la direction
            sortBy = field;
            sortDirection = 'desc';
        }
        currentPage = 1; // Réinitialiser à la première page
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
                    <span class="stat-value">{formatEther(playerStats.totalStake)} ETH</span>
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

        <!-- Scores Section -->
        <div class="scores-section">
            <div class="scores-header">
                <h2>Your Scores</h2>
                
                <!-- Filtres -->
                <div class="filters">
                    <div class="game-filter">
                        <label for="game-filter">Game:</label>
                        <select 
                            id="game-filter" 
                            bind:value={selectedGameFilter}
                        >
                            <option value="all">All Games</option>
                            {#each gamesList as game}
                                <option value={game}>{game.charAt(0).toUpperCase() + game.slice(1)}</option>
                            {/each}
                        </select>
                    </div>
                    
                    <div class="sort-controls">
                        <button 
                            class="sort-button" 
                            class:active={sortBy === 'date'}
                            class:asc={sortBy === 'date' && sortDirection === 'asc'}
                            onclick={() => toggleSort('date')}
                        >
                            Date {sortBy === 'date' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                        
                        <button 
                            class="sort-button" 
                            class:active={sortBy === 'score'}
                            class:asc={sortBy === 'score' && sortDirection === 'asc'}
                            onclick={() => toggleSort('score')}
                        >
                            Score {sortBy === 'score' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                        
                        <button 
                            class="sort-button" 
                            class:active={sortBy === 'stake'}
                            class:asc={sortBy === 'stake' && sortDirection === 'asc'}
                            onclick={() => toggleSort('stake')}
                        >
                            Stake {sortBy === 'stake' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                        </button>
                    </div>
                </div>
            </div>
            
            {#if isLoading}
                <div class="loading">Loading scores...</div>
            {:else if playerScores.length === 0}
                <div class="empty-state">No scores found</div>
            {:else}
                <!-- Affichage de débogage -->
                <div class="debug-info">
                    <p>Scores trouvés: {playerScores.length}</p>
                    <p>Scores filtrés: {filteredScores.length}</p>
                    <p>Scores paginés: {paginatedScores.length}</p>
                    <p>Page actuelle: {currentPage}/{totalPages}</p>
                </div>
                
                <!-- Affichage de tous les scores sans filtrage pour débogage -->
                <div class="scores-grid">
                    {#each playerScores as score, index}
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
                            </div>
                        </div>
                    {/each}
                </div>
                
                <!-- Pagination -->
                {#if totalPages > 1}
                    <div class="pagination">
                        <button 
                            class="page-btn" 
                            disabled={currentPage === 1}
                            onclick={() => changePage(currentPage - 1)}
                        >
                            Previous
                        </button>
                        
                        {#each Array(totalPages) as _, i}
                            <button 
                                class="page-num" 
                                class:active={currentPage === i+1}
                                onclick={() => changePage(i+1)}
                            >
                                {i+1}
                            </button>
                        {/each}
                        
                        <button 
                            class="page-btn" 
                            disabled={currentPage === totalPages}
                            onclick={() => changePage(currentPage + 1)}
                        >
                            Next
                        </button>
                    </div>
                {/if}
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

    .scores-section {
        margin-top: 2rem;
    }
    
    .scores-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    
    .filters {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
    }
    
    .game-filter {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .game-filter select {
        background: rgba(0, 0, 0, 0.2);
        color: white;
        padding: 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .sort-controls {
        display: flex;
        gap: 0.5rem;
    }
    
    .sort-button {
        background: rgba(0, 0, 0, 0.2);
        color: #9ca3af;
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 0.5rem 0.75rem;
        border-radius: 0.25rem;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .sort-button.active {
        color: white;
        background: rgba(79, 70, 229, 0.2);
        border-color: rgba(79, 70, 229, 0.5);
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
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .score-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
    
    .pagination {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
        margin-top: 2rem;
    }
    
    .page-btn, .page-num {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 0.25rem;
        cursor: pointer;
    }
    
    .page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .page-num.active {
        background: rgba(79, 70, 229, 0.5);
        border-color: rgba(79, 70, 229, 0.8);
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
        
        .scores-header {
            flex-direction: column;
            align-items: flex-start;
        }
        
        .filters {
            width: 100%;
            flex-direction: column;
            align-items: flex-start;
        }
        
        .game-filter {
            width: 100%;
        }
        
        .game-filter select {
            width: 100%;
        }
        
        .sort-controls {
            width: 100%;
            justify-content: space-between;
        }
    }
</style>
