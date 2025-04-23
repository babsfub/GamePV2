<script>
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
  
    /** @type {{ enableAds?: boolean, copyright?: string }} */
    let { enableAds = true, copyright = `© ${new Date().getFullYear()} Game-PV` } = $props();
  
    let showAds = $state(false);
    onMount(() => {
      if (browser) showAds = enableAds;
    });
  </script>
  
  <footer class="footer">
    {#if showAds}
      <div class="footer-ads">
        <div id="frame" class="ad-container">
          <iframe
            data-aa="2391419"
            src="//acceptable.a-ads.com/2391419"
            style="border:0;padding:0;width:100%;height:100%;overflow:visible;background:transparent;"
          ></iframe>
          <noscript>
            <a href="https://aads.com/campaigns/new/?source_id=2391419…">
              <img src="//acceptable.a-ads.com/2391419.png" alt="Advertise here" style="width:100%;height:auto;" />
            </a>
          </noscript>
          <a class="advertise-link" href="https://aads.com/campaigns/new/?source_id=2391419…">
            Advertise here
          </a>
        </div>
      </div>
    {/if}
  
    <div class="footer-copyright">
      {copyright}
    </div>
  </footer>
  
  <style>
    .footer-ads,
    .footer-ads > div {
      overflow: visible !important;
    }
    .footer-ads {
      position: relative;
      z-index: 20;
    }
    .ad-container {
      position: relative;
      width: 728px;
      max-width: 100%;
      height: 90px;
      border-radius: 0.5rem;
      border: 1px solid rgba(255,255,255,0.1);
      /* plus besoin d’overflow ici */
    }
    .ad-container iframe {
      position: relative;
      z-index: 10;
    }
    .advertise-link {
      position: absolute;
      bottom: 0;
      right: 0;
      font-size: 11px;
      padding: 2px 5px;
      background: rgba(0,0,0,0.5);
      z-index: 30;
    }
  </style>
  