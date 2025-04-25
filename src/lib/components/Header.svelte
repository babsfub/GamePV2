<script lang="ts">
  import { getGameState } from '$lib/state/game.svelte.js';
  import { getUIState } from '$lib/state/ui.svelte.js';
  import { browser } from '$app/environment';
  import Connect from './wallet/Connect.svelte';
  import { GAMES } from '$lib/config/games.js';

  // Props avec la nouvelle syntaxe Runes
  const { isAdmin = false, isVerifier = false } = $props<{
    isAdmin: boolean;
    isVerifier: boolean;
  }>();

  // États globaux
  const gameState = getGameState();
  const uiState = getUIState();

  // États locaux avec Runes
  let currentPath = $state('/');
  let isMobile = $state(false);
  let isMenuOpen = $state(false);

  // États dérivés
  let isTetrisPage = $derived(currentPath == '/games/tetris');
  let activeGames = $derived(gameState.activeGames);

  let gameLinks = $derived(activeGames.map(gameId => ({
    id: gameId,
    title: GAMES[gameId].title,
    path: `/games/${gameId}`,
    isActive: currentPath === `/games/${gameId}`
  })));

  let tetrisStats = $derived({
    score: gameState.tetrisState.score ?? 0,
    level: gameState.tetrisState.level ?? 1,
    lines: gameState.tetrisState.lines ?? 0,
    isGameOver: gameState.tetrisState.is_game_over
  });

  let scoreClass = $derived(
    tetrisStats.isGameOver ? 'score-display' : 'score-display active'
  );

  // Gestionnaires d'événements
  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    uiState.toggleMenu();
  }

  function handleMenuItemClick() {
    if (isMobile) {
      isMenuOpen = false;
    }
  }

  // Effet pour gérer les événements de fenêtre
  $effect(() => {
    if (!browser) return;

    function updateState() {
      const newPath = window.location.pathname;
      
      // Réinitialiser les scores uniquement lors du changement de page
      if (currentPath === '/games/tetris' && newPath !== '/games/tetris') {
        gameState.tetrisState = {
          ...gameState.tetrisState,
          score: 0,
          level: 1,
          lines: 0,
          is_game_over: false
        };
      }

      isMobile = window.innerWidth <= 768;
      currentPath = newPath;
    }

    updateState();
    window.addEventListener('resize', updateState);
    window.addEventListener('popstate', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('popstate', updateState);
    };
  });
</script>

<header class="header">
  <nav class="nav">
    <div class="nav-brand">
      <a 
        href="/" 
        class="logo" 
        class:active={currentPath === '/'}
        onclick={handleMenuItemClick}
      >
        Retro Gaming
      </a>

      {#if isTetrisPage}
        <div class={scoreClass}>
          <div class="score-item">
            <span class="score-label">Score</span>
            <span class="score-value">{tetrisStats.score}</span>
          </div>
          <div class="score-item">
            <span class="score-label">Level</span>
            <span class="score-value">{tetrisStats.level}</span>
          </div>
          <div class="score-item">
            <span class="score-label">Lines</span>
            <span class="score-value">{tetrisStats.lines}</span>
          </div>
        </div>
      {/if}

      <button 
        class="menu-toggle" 
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen}
        onclick={toggleMenu}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M4 6h16M4 12h16m-16 6h16"
          />
        </svg>
      </button>
    </div>

    <div class="nav-content" class:active={isMenuOpen}>
      <div class="nav-links">
        {#each gameLinks as link (link.id)}
          <a 
            href={link.path}
            class:active={link.isActive}
            onclick={handleMenuItemClick}
          >
            {link.title}
          </a>
        {/each}

        <a 
          href="/profile"
          class:active={currentPath === '/profile'}
          onclick={handleMenuItemClick}
        >
          Profile
        </a>

        {#if isAdmin || isVerifier}
          <a 
            href="/admin"
            class:active={currentPath === '/admin'}
            onclick={handleMenuItemClick}
          >
            Admin
          </a>
        {/if}
      </div>

      <div class="nav-auth">
        <Connect />
      </div>
    </div>
  </nav>
</header>

<style>
  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-surface);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid var(--color-surface-alt);
  }

  .nav {
    max-width: var(--max-width-game);
    margin: 0 auto;
    padding: 0 var(--spacing-screen-safe);
    height: 4rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    text-decoration: none;
    transition: all 0.3s ease;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
  }

  .logo:hover {
    background: rgba(var(--color-primary-rgb), 0.1);
    transform: translateY(-1px);
  }

  .logo.active {
    background: var(--color-primary);
    color: white;
  }

  .score-display {
    display: flex;
    gap: 1.5rem;
    padding: 0.75rem 1rem;
    background: var(--color-surface-alt);
    border-radius: 0.75rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .score-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 4.5rem;
  }

  .score-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .score-value {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-primary);
  }

  .menu-toggle {
    display: none;
    background: none;
    border: none;
    color: var(--color-text);
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }

  .nav-content {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-links {
    display: flex;
    gap: 1rem;
  }

  .nav-links a {
    color: var(--color-text);
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: all 0.3s ease;
  }

  .nav-links a:hover {
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.1);
    transform: translateY(-1px);
  }

  .nav-links a.active {
    color: white;
    background: var(--color-primary);
  }

  @media (max-width: 768px) {
    .nav {
      height: auto;
      flex-direction: column;
      padding: 1rem var(--spacing-screen-safe);
    }

    .nav-brand {
      width: 100%;
      justify-content: space-between;
    }

    .menu-toggle {
      display: block;
    }

    .nav-content {
      display: none;
      width: 100%;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem 0;
    }

    .nav-content.active {
      display: flex;
    }

    .nav-links {
      flex-direction: column;
      width: 100%;
      gap: 0.5rem;
      padding: 0.5rem;
    }

    .nav-links a {
      text-align: center;
      padding: 0.75rem;
    }

    .nav-auth {
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 1rem;
      border-top: 1px solid var(--color-surface-alt);
    }

    .score-display {
      display: none;
    }
  }
</style>