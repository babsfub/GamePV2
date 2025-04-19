<script lang="ts">
    import { connectivityStore } from '$lib/pwa/index.js';
    import { fade } from 'svelte/transition';
    
    let { customMessage = '', showWhenOnline = false } = $props();
    
    let isOnline = $state(true);
    let wasOffline = $state(false);
    
    // S'abonner au store
    $effect(() => {
      const unsubscribe = connectivityStore.subscribe(state => {
        isOnline = state.isOnline;
        wasOffline = state.wasOffline;
      });
      
      return unsubscribe;
    });
  </script>
  
  {#if (!isOnline || (wasOffline && showWhenOnline))}
    <div 
      class="offline-indicator" 
      class:is-offline={!isOnline}
      class:is-restored={isOnline && wasOffline}
      transition:fade={{ duration: 300 }}
    >
      {#if !isOnline}
        <span class="icon">📶</span>
        {customMessage || 'Mode hors ligne: les jeux restent disponibles, mais les scores ne peuvent pas être soumis.'}
      {:else if wasOffline && showWhenOnline}
        <span class="icon">✓</span>
        Connexion rétablie
      {/if}
    </div>
  {/if}
  
  <style>
    .offline-indicator {
      background: rgb(245, 158, 11);
      color: white;
      padding: 0.75rem;
      text-align: center;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 990;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .is-offline {
      background: rgb(245, 158, 11);
    }
    
    .is-restored {
      background: rgb(34, 197, 94);
    }
    
    .icon {
      font-size: 1.25rem;
    }
    
    @media (max-width: 768px) {
      .offline-indicator {
        font-size: 0.875rem;
        padding: 0.5rem;
      }
    }
  </style>