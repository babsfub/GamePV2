<script lang="ts">
  import { page } from '$app/stores';
  import Connect from '$lib/components/wallet/Connect.svelte';
  import { onMount } from 'svelte';
  import { getWalletClient } from '$lib/config/contract.js';

  let { isAdmin = false } = $props<{ isAdmin?: boolean }>();

  let navContent: HTMLElement | null = null;
  let isMenuOpen = $state(false);
  let mounted = $state(false);

  let navContentClass = $derived(isMenuOpen ? 'nav-content active' : 'nav-content');


  function isActive(path: string): boolean {
    return $page.url.pathname === path;
  }

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    if (navContent) {
      navContent.classList.toggle('active');
    }
  }

  function handleNavClick() {
    if (window.innerWidth <= 768) {
      isMenuOpen = false;
      if (navContent) {
        navContent.classList.remove('active');
      }
    }
  }

  onMount(async () => {
    try {
      const client = await getWalletClient();
      const addresses = await client.getAddresses();
      mounted = true;
      if (addresses[0]) {
        mounted = true;
      }
    } catch (error) {
      console.error('Failed to get addresses:', error);
    }
  });
</script>

<header class="header">
  <nav class="nav">
    <div class="nav-brand">
      <a href="/" class="logo" class:active={isActive('/')}>Retro Gaming</a>
      
      <button 
        class="menu-toggle" 
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen}
        onclick={toggleMenu}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-16 6h16"/>
        </svg>
      </button>
    </div>

    <div class={navContentClass} bind:this={navContent}>
      <div class="nav-links">
        <a 
          href="/games/snake" 
          class:active={isActive('/games/snake')}
          onclick={handleNavClick}
        >
          Snake
        </a>
        <a 
          href="/games/tetris" 
          class:active={isActive('/games/tetris')}
          onclick={handleNavClick}
        >
          Tetris
        </a>
        <a href="/profile" class:active={isActive('/profile')} onclick={handleNavClick}>
          Profile </a>
          
        {#if isAdmin}
          <a 
            href="/admin" 
            class:active={isActive('/admin')}
            onclick={handleNavClick}
          >
            Admin
          </a>
        {/if}
      </div>

      {#if mounted}
        <div class="nav-auth">
          <Connect />
        </div>
      {/if}
    </div>
  </nav>
</header>



<style>
  /* Les styles restent les mêmes que dans le layout */
  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--color-surface);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .nav {
    max-width: var(--max-width-game);
    margin: 0 auto;
    padding: 0 var(--spacing-screen-safe);
    height: 3.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-brand {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .logo {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .logo.active {
    color: var(--color-primary);
  }

  .menu-toggle {
    display: none;
    background: none;
    border: none;
    color: var(--color-text);
    padding: 0.5rem;
    cursor: pointer;
  }

  .nav-content {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }

  .nav-links a {
    color: var(--color-text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: all 0.2s ease;
  }

  .nav-links a:hover {
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.1);
  }

  .nav-links a.active {
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.1);
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

    .nav-content.active {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      padding-top: 1rem;
    }

    .nav-content {
      display: none;
      width: 100%;
      flex-direction: column;
      gap: 1rem;
      padding-top: 1rem;
    }


    .nav-links {
      flex-direction: column;
      width: 100%;
      gap: 0.5rem;
    }

    .nav-links a {
      display: block;
      padding: 0.75rem;
      text-align: center;
    }

    .nav-auth {
      width: 100%;
      display: flex;
      justify-content: center;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
  }

</style>