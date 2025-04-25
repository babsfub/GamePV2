<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  /** Prop pour activer/désactiver la pub */
  export let enableAds: boolean = true;

  let activeSrc: string | null = null;

  function updateBanner() {
    const id = '2391419';
    activeSrc = `//acceptable.a-ads.com/${id}`;
  }

  onMount(() => {
    if (!browser || !enableAds) return;
    updateBanner();                     
    window.addEventListener('resize', updateBanner);
    return () => window.removeEventListener('resize', updateBanner);
  });
</script>

{#if activeSrc}
  <div class="ad-container">
    <iframe
      src={activeSrc}
      data-aa="2391419"
      title="Advertisement"
      class="ad-iframe"
      width="100%" height="100%"
      
    ></iframe>
    <noscript>
     
    </noscript>
   
  </div>
{/if}

<style>
  .ad-container,
  .ad-container * {
    overflow: visible !important;
  }
  .ad-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}
  .ad-iframe {
    width: 100%;
    height: 100%;
    border: none;
    position: relative;
    z-index: 10;
  }
  
</style>