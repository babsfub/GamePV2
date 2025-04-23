<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  
  /** Prop pour activer/désactiver la pub */
  export let enableAds: boolean = true;
  
  /** ID de la pub a-ads */
  export let adId: string = '2391419';
  
  /** Style additionnel pour le conteneur */
  export let containerClass: string = '';
  
  /** Hauteur du conteneur de pub */
  export let height: string = '90px';
  
  /** Style additionnel personnalisé */
  export let style: string = '';
  
  let activeSrc: string | null = null;
  let containerRef: HTMLDivElement;
  let isVisible = false;
  let adLoaded = false;
  
  // Fonction pour mettre à jour la source de la bannière
  function updateBanner() {
    activeSrc = `//acceptable.a-ads.com/${adId}`;
  }
  
  // Vérifier si l'élément est visible dans la fenêtre
  function checkVisibility() {
    if (!containerRef) return;
    
    const rect = containerRef.getBoundingClientRect();
    isVisible = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
    
    // Si visible et pas encore chargé, mettre à jour la bannière
    if (isVisible && !adLoaded) {
      updateBanner();
      adLoaded = true;
    }
  }
  
  onMount(() => {
    if (!browser || !enableAds) return;
    
    // Initialiser après un court délai pour s'assurer que la page est complètement chargée
    setTimeout(() => {
      checkVisibility();
      window.addEventListener('scroll', checkVisibility, { passive: true });
      window.addEventListener('resize', checkVisibility, { passive: true });
    }, 200);
    
    return () => {
      window.removeEventListener('scroll', checkVisibility);
      window.removeEventListener('resize', checkVisibility);
    };
  });
</script>

<div 
  class="ad-wrapper {containerClass}" 
  style="height: {height}; {style}"
  bind:this={containerRef}
>
  {#if activeSrc}
    <div class="ad-container">
      <iframe
        src={activeSrc}
        data-aa={adId}
        title="Advertisement"
        class="ad-iframe"
        style="border:0px; padding:0; width:100%; height:100%; overflow:visible; background-color: transparent;"
      ></iframe>
      <a 
        class="ad-link"
        href={`https://aads.com/campaigns/new/?source_id=${adId}&source_type=ad_unit&partner=${adId}`}
      >
        Advertise here
      </a>
    </div>
  {/if}
  <noscript>
    <div class="ad-container">
      <a href={`https://aads.com/campaigns/new/?source_id=${adId}`}>
        <img src={`//acceptable.a-ads.com/${adId}.png`} alt="Advertise here" style="width:100%;height:auto;" />
      </a>
    </div>
  </noscript>
</div>

<style>
  .ad-wrapper {
    width: 100%;
    margin: 1rem auto;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 90px;
    z-index: 10;
    overflow: visible !important;
  }
  
  .ad-container {
    width: 100%;
    max-width: 728px;
    height: 100%;
    position: relative;
    border-radius: 4px;
    background-color: rgba(33, 33, 43, 0.6);
    overflow: visible !important;
  }
  
  .ad-iframe {
    width: 100%;
    height: 100%;
    border: none;
    position: relative;
    z-index: 10;
    overflow: visible !important;
  }
  
  .ad-link {
    position: absolute;
    right: 2px;
    bottom: 2px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 1px 4px;
    border-radius: 2px;
    z-index: 20;
  }
  
  .ad-link:hover {
    color: white;
    background-color: rgba(0, 0, 0, 0.7);
  }
</style>
