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
          <!-- Ad container with fixed dimensions to prevent layout shifts -->
          <div id="frame" class="ad-container">
            <iframe 
              data-aa='2391419' 
              src='//acceptable.a-ads.com/2391419' 
              style='border:0px; padding:0; width:100%; height:100%; overflow:hidden; background-color: transparent;'>
            </iframe>
            <!-- Ensuring the "Advertise here" link is always visible and not overlapped -->
            <a 
              class="advertise-link"
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
      position: relative;
      z-index: 10; /* Ensure footer is above other elements */
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
      margin: 1.5rem 0;
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  
    /* Fixed dimensions for ad container to prevent layout shifts */
    .ad-container {
      position: relative;
      width: 728px; /* Standard banner ad width */
      max-width: 100%;
      height: 90px; /* Standard banner ad height */
      background-color: var(--color-surface-alt, #2a2a36);
      border-radius: 0.5rem;
      overflow: hidden;
      /* Add a small border to make the ad more visible */
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  
    /* Style for the "Advertise here" link to ensure visibility */
    .advertise-link {
      position: absolute;
      right: 0;
      bottom: 0;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      background-color: rgba(0, 0, 0, 0.5);
      padding: 2px 5px;
      text-decoration: none;
      border-top-left-radius: 4px;
      z-index: 2; /* Ensure link is above the iframe */
    }
  
    .advertise-link:hover {
      color: white;
      background-color: rgba(0, 0, 0, 0.7);
    }
  
    .footer-copyright {
      text-align: center;
      font-size: 0.9rem;
      opacity: 0.8;
      padding-top: 0.5rem;
    }
  
    /* Media queries for responsive design */
    @media (max-width: 768px) {
      .footer-content {
        gap: 1.5rem;
      }
  
      .ad-container {
        height: 60px; /* Smaller height on mobile */
      }
  
      .footer-links {
        gap: 1rem;
      }
    }
  </style>