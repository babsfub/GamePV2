<script>
    /**
     * Optional footer properties for customization
     */
    /** @type {{ showAds?: boolean, copyright?: string }} */
    let { showAds = true, copyright = `© ${new Date().getFullYear()} Game-PV` } = $props();
  </script>
  
  <footer class="footer">
    <div class="footer-content">
      
      {#if showAds}
        <div class="footer-ads">
          <div id="frame" style="width:100%; height:100%; max-height: 90px;">
            <iframe 
              data-aa='2391419' 
              src='//acceptable.a-ads.com/2391419' 
              style='border:0px; padding:0; width:100%; height:100%; overflow:hidden; background-color: transparent;'>
            </iframe>
            <a 
              style="display: block; text-align: right; font-size: 12px;" 
              id="preview-link" 
              href="https://aads.com/campaigns/new/?source_id=2391419&source_type=ad_unit&partner=2391419">
              Advertise here
            </a>
          </div>
        </div>
      {/if}
  
      <div class="footer-copyright">
        {copyright}
      </div>
    </div>
  </footer>
  
  <style>
    .footer {
      padding: 1.5rem var(--spacing-screen-safe, 20px);
      background-color: var(--color-surface, #21212b);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      color: var(--color-text-secondary, #94A3B8);
      padding-bottom: env(safe-area-inset-bottom, 1rem);
    }
  
    .footer-content {
      max-width: var(--max-width-game, 1200px);
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
  
    .footer-logo {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  
    .footer-brand {
      font-family: 'Press Start 2P', cursive;
      color: var(--color-primary, #4ade80);
      font-size: 1.2rem;
      text-shadow: 0 0 5px var(--color-primary, #4ade80);
    }
  
    .footer-tagline {
      font-family: 'VT323', monospace;
      font-size: 1rem;
      margin-top: 0.3rem;
    }
  
    .footer-links {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 1.5rem;
    }
  
    .footer-links a {
      color: var(--color-text, #e5e5e5);
      text-decoration: none;
      font-family: 'VT323', monospace;
      font-size: 1rem;
      position: relative;
      transition: color 0.2s ease;
    }
  
    .footer-links a:hover {
      color: var(--color-primary, #4ade80);
    }
  
    .footer-links a:hover::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 100%;
      height: 1px;
      background-color: var(--color-primary, #4ade80);
      box-shadow: 0 0 5px var(--color-primary, #4ade80);
    }
  
    .footer-social {
      display: flex;
      justify-content: center;
      gap: 1.2rem;
    }
  
    .footer-social a {
      color: var(--color-text-secondary, #94A3B8);
      transition: color 0.2s, transform 0.2s;
    }
  
    .footer-social a:hover {
      color: var(--color-primary, #4ade80);
      transform: translateY(-2px);
    }
  
    .footer-ads {
      margin: 1rem 0;
      max-width: 728px;
      width: 100%;
      align-self: center;
      border-radius: 0.5rem;
      overflow: hidden;
      background-color: var(--color-surface-alt, #2a2a36);
    }
  
    .footer-copyright {
      text-align: center;
      font-size: 0.9rem;
      opacity: 0.8;
    }
  
    @media (min-width: 768px) {
      .footer-content {
        gap: 2rem;
      }
    }
  </style>