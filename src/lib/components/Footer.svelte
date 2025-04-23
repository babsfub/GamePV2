<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  /** Prop pour activer/désactiver la pub */
  export let enableAds: boolean = true;

  let activeSrc: string | null = null;

  function updateBanner() {
    // Adaptez pageId et sizes comme dans votre ancien code…
    const id = '2391419';
    activeSrc = `//acceptable.a-ads.com/${id}`;
  }

  onMount(() => {
    if (!browser || !enableAds) return;
    updateBanner();                     // insertion immédiate
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
      width="728" height="90"
      allowtransparency="true"
    ></iframe>
    <noscript>
      <a href="https://aads.com/campaigns/new/?source_id=2391419">
        <img src="//acceptable.a-ads.com/2391419.png" alt="Advertise here" style="width:100%;height:auto;" />
      </a>
    </noscript>
    <a class="advertise-link" href="https://aads.com/campaigns/new/?source_id=2391419">
      Advertise here
    </a>
  </div>
{/if}

<style>
  .ad-container,
  .ad-container * {
    overflow: visible !important;
  }
  .ad-container {
    position: relative;
    z-index: 20;
    width: 728px;
    max-width: 100%;
    height: 90px;
  }
  .ad-iframe {
    width: 100%;
    height: 100%;
    border: none;
    position: relative;
    z-index: 10;
  }
  .advertise-link {
    position: absolute;
    bottom: 0;
    right: 0;
    font-size: 11px;
    background: rgba(0,0,0,0.5);
    padding: 2px 5px;
    z-index: 30;
  }
</style>
